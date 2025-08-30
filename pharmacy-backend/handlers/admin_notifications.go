package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"pharmacy-backend/models"
	"pharmacy-backend/services"
	"pharmacy-backend/utils"
)


// GetAdminNotifications retrieves admin notifications for the authenticated admin user
func GetAdminNotifications(c *gin.Context) {
	// Get authenticated admin user ID
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "المستخدم غير مصرح له")
		return
	}
	adminUserID := userID.(uuid.UUID)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	unreadOnly := c.Query("unread") == "true"
	notificationType := c.Query("type")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	notificationService := services.NewNotificationService()
	notifications, total, err := notificationService.GetAdminNotificationsWithFilterForUser(adminUserID, page, limit, unreadOnly, notificationType)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch admin notifications", err.Error())
		return
	}

	pagination := utils.CalculatePagination(page, limit, total)
	utils.PaginatedSuccessResponse(c, "Admin notifications retrieved successfully", gin.H{
		"notifications": notifications,
		"unread_count":  total,
	}, pagination)
}

// adminNotifierHub manages admin connections and broadcasts
type adminNotifierHub struct {
	mu          sync.RWMutex
	connections map[uuid.UUID]map[*connection]struct{}
}

var AdminNotifier = &adminNotifierHub{
	connections: make(map[uuid.UUID]map[*connection]struct{}),
}

// addConnection registers a connection for an admin user
func (h *adminNotifierHub) addConnection(userID uuid.UUID, conn *connection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.connections[userID] == nil {
		h.connections[userID] = make(map[*connection]struct{})
	}
	h.connections[userID][conn] = struct{}{}
}

// removeConnection removes a connection for an admin user
func (h *adminNotifierHub) removeConnection(userID uuid.UUID, conn *connection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if conns, ok := h.connections[userID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.connections, userID)
		}
	}
}

// BroadcastToAdmin sends an event payload to all active connections of the admin
func (h *adminNotifierHub) BroadcastToAdmin(userID uuid.UUID, event string, payload interface{}) {
	log.Printf("📢 BroadcastToAdmin: إرسال إشعار للإدارة %s - الحدث: %s", userID.String(), event)
	
	h.mu.RLock()
	conns := h.connections[userID]
	h.mu.RUnlock()
	
	log.Printf("📊 عدد الاتصالات النشطة للإدارة %s: %d", userID.String(), len(conns))
	
	if len(conns) == 0 {
		log.Printf("⚠️ لا توجد اتصالات SSE نشطة للإدارة %s", userID.String())
		return
	}
	
	msg := sseEvent{Event: event, Payload: payload}
	b, err := json.Marshal(msg)
	if err != nil {
		log.Printf("❌ Admin SSE marshal error: %v", err)
		return
	}
	
	sentCount := 0
	for conn := range conns {
		select {
		case conn.ch <- string(b):
			sentCount++
		default:
			log.Printf("⚠️ تم تجاهل إشعار للإدارة %s بسبب بطء الاستهلاك", userID.String())
		}
	}
	log.Printf("✅ تم إرسال الإشعار بنجاح إلى %d/%d اتصال للإدارة %s", sentCount, len(conns), userID.String())
}

// AdminNotificationsStream is the SSE endpoint for admin notifications: GET /api/v1/admin/notifications/stream
func AdminNotificationsStream(c *gin.Context) {
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
	
	// Verify admin role
	role, ok := claims["role"].(string)
	if !ok || role != "admin" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
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
	AdminNotifier.addConnection(userUUID, conn)
	defer func() {
		AdminNotifier.removeConnection(userUUID, conn)
		close(conn.ch)
	}()

	// Initial hello event
	hello := sseEvent{Event: "connected", Payload: gin.H{"admin_id": userUUID.String(), "ts": time.Now().Unix()}}
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

// GetAdminUnreadCount returns the count of unread admin notifications
func GetAdminUnreadCount(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "المستخدم غير مصرح له")
		return
	}

	userUUID := userID.(uuid.UUID)
	notificationService := services.NewNotificationService()
	
	count, err := notificationService.GetAdminUnreadCount(userUUID)
	if err != nil {
		utils.InternalServerErrorResponse(c, "خطأ في جلب عدد الإشعارات غير المقروءة", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"unread_count": count,
	})
}

// CreateTestAdminNotifications creates test notifications for admin users (for testing purposes)
func CreateTestAdminNotifications(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "المستخدم غير مصرح له")
		return
	}

	userUUID := userID.(uuid.UUID)
	notificationService := services.NewNotificationService()

	// Create test admin notifications
	testNotifications := []struct {
		notificationType models.NotificationType
		title           string
		message         string
		payload         interface{}
	}{
		{
			notificationType: models.NotificationTypeAdminOrderCreated,
			title:           "طلب جديد تم إنشاؤه",
			message:         "تم إنشاء طلب جديد رقم #12345 بقيمة 250 ريال",
			payload:         gin.H{"order_id": "12345", "amount": 250, "customer": "أحمد محمد"},
		},
		{
			notificationType: models.NotificationTypeAdminWholesaleSubmitted,
			title:           "طلب ترقية حساب جملة جديد",
			message:         "تم تقديم طلب ترقية حساب جملة من شركة الأدوية المتقدمة",
			payload:         gin.H{"company_name": "الأدوية المتقدمة", "commercial_register": "123456789"},
		},
		{
			notificationType: models.NotificationTypeAdminOrderCreated,
			title:           "طلب عاجل تم إنشاؤه",
			message:         "تم إنشاء طلب عاجل رقم #12346 بقيمة 500 ريال",
			payload:         gin.H{"order_id": "12346", "amount": 500, "customer": "فاطمة أحمد", "priority": "عاجل"},
		},
	}

	createdCount := 0
	for _, testNotif := range testNotifications {
		_, err := notificationService.CreateNotification(
			userUUID,
			testNotif.notificationType,
			testNotif.title,
			testNotif.message,
			testNotif.payload,
			nil,
		)
		if err != nil {
			log.Printf("❌ خطأ في إنشاء إشعار تجريبي: %v", err)
			continue
		}
		createdCount++
		
		// Also broadcast to any connected admin SSE clients
		AdminNotifier.BroadcastToAdmin(userUUID, "notification_created", gin.H{
			"type":    testNotif.notificationType,
			"title":   testNotif.title,
			"message": testNotif.message,
			"payload": testNotif.payload,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "تم إنشاء الإشعارات التجريبية بنجاح",
		"created_count": createdCount,
	})
}
