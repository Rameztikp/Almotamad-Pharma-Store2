package handlers

import (
	"net/http"
	"time"

	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// FCMHandler handles FCM related operations
type FCMHandler struct {
	notifier *services.Notifier
}

// NewFCMHandler creates a new FCM handler
func NewFCMHandler(notifier *services.Notifier) *FCMHandler {
	return &FCMHandler{
		notifier: notifier,
	}
}

// SubscribeUserToFCM handles FCM token registration
// @Summary Register FCM token
// @Description Register a user's FCM token for push notifications
// @Tags notifications
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param input body struct{Token string `json:"token"`} true "FCM token"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /fcm/subscribe [post]
func (h *FCMHandler) SubscribeUserToFCM(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Save token to database
	err := models.SaveFCMToken(c.Request.Context(), userID.(string), req.Token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save FCM token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "FCM token registered successfully"})
}

// SendPushNotification sends a push notification to a user
func (h *FCMHandler) SendPushNotification(userID string, notification *models.Notification) error {
	// Get FCM token from database
	token, err := models.GetFCMToken(userID)
	if err != nil || token == "" {
		return err
	}

	// Construct FCM message
	message := &services.FCMMessage{
		To: token,
		Notification: services.FCMPayload{
			Title: notification.Title,
			Body:  notification.Message,
		},
		Data: map[string]string{
			"type":    string(notification.Type),
			"orderId": notification.OrderID.String(),
		},
	}

	// Send the message
	return h.notifier.SendFCM(message)
}

// TestPushNotification sends a test push notification to the current user
// @Summary Send test push notification
// @Description Sends a test push notification to the current user's device
// @Tags notifications
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param input body struct{Title string `json:"title"`; Body string `json:"body"`} true "Test notification details"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /fcm/test [post]
func (h *FCMHandler) TestPushNotification(c *gin.Context) {
	var req struct {
		Title string `json:"title" binding:"required"`
		Body  string `json:"body" binding:"required"`
		Data  map[string]string `json:"data,omitempty"`
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Get FCM token from database
	token, err := models.GetFCMToken(userID.(string))
	if err != nil || token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No FCM token found for user"})
		return
	}

	// Create a test notification
	testNotification := &models.Notification{
		ID:        uuid.New(),
		UserID:    uuid.MustParse(userID.(string)),
		Title:     req.Title,
		Message:   req.Body,
		Type:      "test",
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	// Save test notification to database
	db := config.GetDB()
	tx := db.Begin()
	if err := tx.Create(testNotification).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save test notification"})
		return
	}
	
	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save test notification"})
		return
	}

	// Construct FCM message
	message := &services.FCMMessage{
		To: token,
		Notification: services.FCMPayload{
			Title: req.Title,
			Body:  req.Body,
		},
		Data: req.Data,
	}

	// Add default data if none provided
	if message.Data == nil {
		message.Data = make(map[string]string)
	}
	message.Data["type"] = "test"
	message.Data["notificationId"] = testNotification.ID.String()

	// Send the message
	if err := h.notifier.SendFCM(message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send test notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test notification sent successfully",
		"notificationId": testNotification.ID,
	})
}
