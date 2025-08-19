package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"pharmacy-backend/utils"
)

// SSE event payload
type sseEvent struct {
	Event   string      `json:"event"`
	Payload interface{} `json:"payload"`
}

// connection represents a single user's SSE connection
type connection struct {
	ch       chan string
	lastPing time.Time
}

// notifierHub manages user connections and broadcasts
type notifierHub struct {
	mu          sync.RWMutex
	connections map[uuid.UUID]map[*connection]struct{}
}

var Notifier = &notifierHub{
	connections: make(map[uuid.UUID]map[*connection]struct{}),
}

// addConnection registers a connection for a user
func (h *notifierHub) addConnection(userID uuid.UUID, conn *connection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.connections[userID] == nil {
		h.connections[userID] = make(map[*connection]struct{})
	}
	h.connections[userID][conn] = struct{}{}
}

// removeConnection removes a connection for a user
func (h *notifierHub) removeConnection(userID uuid.UUID, conn *connection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if conns, ok := h.connections[userID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.connections, userID)
		}
	}
}

// BroadcastToUser sends an event payload to all active connections of the user
func (h *notifierHub) BroadcastToUser(userID uuid.UUID, event string, payload interface{}) {
	h.mu.RLock()
	conns := h.connections[userID]
	h.mu.RUnlock()
	if len(conns) == 0 {
		return
	}
	msg := sseEvent{Event: event, Payload: payload}
	b, err := json.Marshal(msg)
	if err != nil {
		log.Printf("❌ SSE marshal error: %v", err)
		return
	}
	for conn := range conns {
		select {
		case conn.ch <- string(b):
		default:
			// slow consumer; drop
		}
	}
}

// NotificationsStream is the SSE endpoint: GET /api/v1/notifications/stream
func NotificationsStream(c *gin.Context) {
	// Authenticate using Authorization header or token query param
	token := c.GetHeader("Authorization")
	if token != "" && len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}
	if token == "" {
		token = c.Query("token")
	}
	if token == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims, err := utils.VerifyJWT(token)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}
	userIDStr, _ := claims["user_id"].(string)
	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user"})
		return
	}

	// Prepare SSE headers
	w := c.Writer
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("Connection", "keep-alive")
	h.Set("Access-Control-Allow-Origin", "http://localhost:5173")
	h.Set("Access-Control-Allow-Credentials", "true")

	flusher, ok := w.(http.Flusher)
	if !ok {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Streaming unsupported"})
		return
	}

	conn := &connection{ch: make(chan string, 16), lastPing: time.Now()}
	Notifier.addConnection(userUUID, conn)
	defer func() {
		Notifier.removeConnection(userUUID, conn)
		close(conn.ch)
	}()

	// Initial hello event
	hello := sseEvent{Event: "connected", Payload: gin.H{"user_id": userUUID.String(), "ts": time.Now().Unix()}}
	if b, err := json.Marshal(hello); err == nil {
		w.Write([]byte("event: message\n"))
		w.Write([]byte("data: "))
		w.Write(b)
		w.Write([]byte("\n\n"))
		flusher.Flush()
	}

	// Heartbeat ticker
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()

	c.Request.Context().Done()

	for {
		select {
		case msg, ok := <-conn.ch:
			if !ok {
				return
			}
			w.Write([]byte("event: message\n"))
			w.Write([]byte("data: "))
			w.Write([]byte(msg))
			w.Write([]byte("\n\n"))
			flusher.Flush()
		case <-ticker.C:
			// send heartbeat comment to keep connection alive
			w.Write([]byte(": ping\n\n"))
			flusher.Flush()
		case <-c.Request.Context().Done():
			return
		}
	}
}
