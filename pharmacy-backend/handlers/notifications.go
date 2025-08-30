package handlers

import (
	"log"
	"net/http"
	"sync"
	"time"

	"pharmacy-backend/models"
	"pharmacy-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
	clients     map[uuid.UUID]chan sseEvent
	fcmHandler  *FCMHandler
}

// NewNotifier creates a new notifier instance with FCM support
func NewNotifier(fcmHandler *FCMHandler) *notifierHub {
	return &notifierHub{
		connections: make(map[uuid.UUID]map[*connection]struct{}),
		clients:     make(map[uuid.UUID]chan sseEvent),
		fcmHandler:  fcmHandler,
	}
}

var Notifier = NewNotifier(nil)

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

// RegisterClient adds a new client to the notifier
func (h *notifierHub) RegisterClient(userID uuid.UUID, clientChan chan sseEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[userID] = clientChan
	log.Printf("Client registered for user: %s", userID.String())
}

// UnregisterClient removes a client from the notifier
func (h *notifierHub) UnregisterClient(userID uuid.UUID) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[userID]; ok {
		delete(h.clients, userID)
		log.Printf("Client unregistered for user: %s", userID.String())
	}
}

// BroadcastToUser sends an event payload to all active connections of the user
func (h *notifierHub) BroadcastToUser(userID uuid.UUID, event string, payload interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	// Store notification in database for offline users
	notification, err := h.storeNotificationInDB(userID, event, payload)
	if err != nil {
		log.Printf("❌ Failed to store notification in DB: %v", err)
	}

	// Send to SSE clients
	if clients, ok := h.clients[userID]; ok {
		select {
		case clients <- sseEvent{
			Event:   event,
			Payload: payload,
		}:
		default:
			log.Printf("❌ Could not send notification to client %s: channel full", userID)
		}
	}

	// Send to FCM if available
	if notification != nil && h.fcmHandler != nil {
		if err := h.fcmHandler.SendPushNotification(userID.String(), notification); err != nil {
			log.Printf("❌ Failed to send FCM notification: %v", err)
		}
	}
}

// storeNotificationInDB stores notification in database for offline users and returns the created notification
func (h *notifierHub) storeNotificationInDB(userID uuid.UUID, event string, payload interface{}) (*models.Notification, error) {
	notificationService := services.NewNotificationService()

	var title, message string
	var notificationType models.NotificationType
	var orderIDPtr *uuid.UUID

	// Extract order ID from payload if it exists
	if payloadMap, ok := payload.(map[string]interface{}); ok {
		if orderIDStr, exists := payloadMap["order_id"]; exists {
			if parsedID, err := uuid.Parse(orderIDStr.(string)); err == nil {
				orderIDPtr = &parsedID
			}
		}
	}

	// Map event types to notification types and messages
	switch event {
	case "wholesale_approved":
		notificationType = models.NotificationTypeWholesaleApproved
		title = "تمت الموافقة على ترقية حساب الجملة"
		message = "تهانينا! تمت الموافقة على طلب ترقية حساب الجملة الخاص بك"
	case "wholesale_rejected":
		notificationType = models.NotificationTypeWholesaleRejected
		title = "تم رفض طلب ترقية حساب الجملة"
		message = "تم رفض طلب ترقية حساب الجملة الخاص بك"
		if payloadMap, ok := payload.(map[string]interface{}); ok {
			if reason, exists := payloadMap["rejection_reason"]; exists && reason != nil {
				message = "السبب: " + reason.(string)
			}
		}
	case "order_created":
		notificationType = models.NotificationTypeOrderCreated
		title = "تم إنشاء الطلب بنجاح"
		message = "تم إنشاء طلبك بنجاح"
		if payloadMap, ok := payload.(map[string]interface{}); ok {
			if orderID, exists := payloadMap["order_id"]; exists && orderID != nil {
				message = "رقم الطلب: " + orderID.(string)
			}
		}
	case "order_status_updated":
		notificationType = models.NotificationTypeOrderUpdated
		title = "تحديث حالة الطلب"
		message = "تم تحديث حالة طلبك"
		if payloadMap, ok := payload.(map[string]interface{}); ok {
			if status, exists := payloadMap["new_status"]; exists && status != nil {
				message = "تم تغيير الحالة إلى: " + status.(string)
			}
		}
	default:
		notificationType = models.NotificationTypeGeneral
		title = "إشعار جديد"
		message = "لديك إشعار جديد"
	}

	createdNotification, err := notificationService.CreateNotification(userID, notificationType, title, message, payload, orderIDPtr)
	if err != nil {
		log.Printf("❌ خطأ في حفظ الإشعار في قاعدة البيانات: %v", err)
		return nil, err
	}
	return createdNotification, nil
}

// NotificationsStream is the SSE endpoint: GET /api/v1/notifications/stream
func NotificationsStream(c *gin.Context) {
	// Get user ID from context (set by JWTAuth middleware)
	userIDValue, exists := c.Get("userID")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userUUID, ok := userIDValue.(uuid.UUID)
	if !ok {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type in context"})
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

	_, ok = w.(http.Flusher)
	if !ok {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Streaming unsupported"})
		return
	}

	// Register the client
	clientChan := make(chan sseEvent)
	Notifier.RegisterClient(userUUID, clientChan)

	// Unregister the client on disconnect
	defer func() {
		Notifier.UnregisterClient(userUUID)
		close(clientChan)
		log.Printf("SSE client disconnected for user %s", userUUID.String())
	}()

	log.Printf("SSE client connected for user %s", userUUID.String())

	// Send a welcome message
	c.SSEvent("welcome", gin.H{
		"message": "مرحباً بك في نظام الإشعارات الفوري",
	})

	// Keep the connection alive
	for {
		select {
		case event := <-clientChan:
			c.SSEvent(event.Event, event.Payload)
			// Flush the writer to ensure the message is sent immediately
			if f, ok := c.Writer.(http.Flusher); ok {
				f.Flush()
			}
		case <-c.Request.Context().Done():
			log.Printf("SSE connection closed for user %s", userUUID.String())
			return
		}
	}
}
