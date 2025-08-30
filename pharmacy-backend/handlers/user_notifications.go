package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"pharmacy-backend/services"
	"pharmacy-backend/utils"
)

// GetUserNotifications retrieves notifications for the authenticated user
func GetUserNotifications(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "المستخدم غير مصرح له")
		return
	}

	userUUID := userID.(uuid.UUID)
	
	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100 // Maximum limit
	}

	onlyUnread := c.Query("unread") == "true"

	notificationService := services.NewNotificationService()
	notifications, err := notificationService.GetUserNotifications(userUUID, limit, onlyUnread)
	if err != nil {
		utils.InternalServerErrorResponse(c, "خطأ في جلب الإشعارات", err.Error())
		return
	}

	// Get unread count
	unreadCount, err := notificationService.GetUnreadCount(userUUID)
	if err != nil {
		unreadCount = 0 // Don't fail the request for this
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"notifications": notifications,
		"unread_count":  unreadCount,
		"total":         len(notifications),
	})
}

// MarkNotificationAsRead marks a specific notification as read
func MarkNotificationAsRead(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "المستخدم غير مصرح له")
		return
	}

	userUUID := userID.(uuid.UUID)
	notificationIDStr := c.Param("id")
	
	notificationID, err := uuid.Parse(notificationIDStr)
	if err != nil {
		utils.BadRequestResponse(c, "معرف الإشعار غير صالح", "يجب أن يكون معرف الإشعار UUID صالح")
		return
	}

	notificationService := services.NewNotificationService()
	err = notificationService.MarkAsRead(notificationID, userUUID)
	if err != nil {
		utils.InternalServerErrorResponse(c, "خطأ في تحديث الإشعار", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "تم تحديث الإشعار بنجاح",
	})
}

// MarkAllNotificationsAsRead marks all notifications as read for the user
func MarkAllNotificationsAsRead(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "المستخدم غير مصرح له")
		return
	}

	userUUID := userID.(uuid.UUID)

	notificationService := services.NewNotificationService()
	err := notificationService.MarkAllAsRead(userUUID)
	if err != nil {
		utils.InternalServerErrorResponse(c, "خطأ في تحديث الإشعارات", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "تم تحديث جميع الإشعارات بنجاح",
	})
}

// GetUnreadNotificationsCount returns the count of unread notifications
func GetUnreadNotificationsCount(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "المستخدم غير مصرح له")
		return
	}

	userUUID := userID.(uuid.UUID)

	notificationService := services.NewNotificationService()
	count, err := notificationService.GetUnreadCount(userUUID)
	if err != nil {
		utils.InternalServerErrorResponse(c, "خطأ في جلب عدد الإشعارات", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"unread_count": count,
	})
}
