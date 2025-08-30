package services

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
)

type NotificationService struct {
	db *gorm.DB
}

func NewNotificationService() *NotificationService {
	return &NotificationService{
		db: config.DB,
	}
}

// CreateNotification creates a new notification in the database
func (ns *NotificationService) CreateNotification(userID uuid.UUID, notificationType models.NotificationType, title, message string, data interface{}, orderID *uuid.UUID) (*models.Notification, error) {
	var dataJSON string
	if data != nil {
		dataBytes, err := json.Marshal(data)
		if err != nil {
			log.Printf("❌ خطأ في تحويل البيانات إلى JSON: %v", err)
		} else {
			dataJSON = string(dataBytes)
		}
	}

	notification := &models.Notification{
		UserID:  userID,
		OrderID: orderID,
		Type:    notificationType,
		Title:   title,
		Message: message,
		Data:    dataJSON,
		IsRead:  false,
	}

	if err := ns.db.Create(notification).Error; err != nil {
		log.Printf("❌ خطأ في إنشاء الإشعار: %v", err)
		return nil, err
	}

	log.Printf("✅ تم إنشاء إشعار مخزن للمستخدم %s: %s", userID.String(), title)
	return notification, nil
}

// GetUserNotifications retrieves notifications for a user (excludes admin notifications)
func (ns *NotificationService) GetUserNotifications(userID uuid.UUID, limit int, onlyUnread bool) ([]models.Notification, error) {
	var notifications []models.Notification
	query := ns.db.Where("user_id = ? AND type NOT IN (?)", userID, []string{
		string(models.NotificationTypeAdminOrderCreated),
		string(models.NotificationTypeAdminOrderUpdated),
		string(models.NotificationTypeAdminWholesaleOrder),
		string(models.NotificationTypeAdminWholesaleSubmitted),
	})
	
	if onlyUnread {
		query = query.Where("is_read = ?", false)
	}
	
	if err := query.Order("created_at DESC").Limit(limit).Find(&notifications).Error; err != nil {
		return nil, err
	}
	
	return notifications, nil
}

// MarkAsRead marks a notification as read
func (ns *NotificationService) MarkAsRead(notificationID uuid.UUID, userID uuid.UUID) error {
	return ns.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Update("is_read", true).Error
}

// MarkAllAsRead marks all notifications as read for a user
func (ns *NotificationService) MarkAllAsRead(userID uuid.UUID) error {
	return ns.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error
}

// GetUnreadCount returns the count of unread notifications for a user (excludes admin notifications)
func (ns *NotificationService) GetUnreadCount(userID uuid.UUID) (int64, error) {
	var count int64
	err := ns.db.Model(&models.Notification{}).Where("user_id = ? AND is_read = ? AND type NOT IN (?)", userID, false, []string{
		string(models.NotificationTypeAdminOrderCreated),
		string(models.NotificationTypeAdminOrderUpdated),
		string(models.NotificationTypeAdminWholesaleOrder),
		string(models.NotificationTypeAdminWholesaleSubmitted),
	}).Count(&count).Error
	return count, err
}

// GetAllAdminUserIDs returns all admin user IDs
func (ns *NotificationService) GetAllAdminUserIDs() ([]uuid.UUID, error) {
	var adminIDs []uuid.UUID
	err := ns.db.Model(&models.User{}).
		Where("role = ?", "admin").
		Pluck("id", &adminIDs).Error
	return adminIDs, err
}

// AdminNotifierInterface defines the interface for broadcasting admin notifications
type AdminNotifierInterface interface {
	BroadcastToAdmin(userID uuid.UUID, event string, payload interface{})
}

// Global admin notifier instance (will be set by handlers package)
var AdminNotifierInstance AdminNotifierInterface

// SetAdminNotifier sets the global admin notifier instance
func SetAdminNotifier(notifier AdminNotifierInterface) {
	AdminNotifierInstance = notifier
}

// CreateAdminNotification creates a notification for all admin users and broadcasts via SSE
func (ns *NotificationService) CreateAdminNotification(notificationType models.NotificationType, title, message string, data interface{}, orderID *uuid.UUID) error {
	// Get all admin user IDs
	adminIDs, err := ns.GetAllAdminUserIDs()
	if err != nil {
		return fmt.Errorf("failed to get admin user IDs: %v", err)
	}

	// Create notification for each admin
	for _, adminID := range adminIDs {
				notification, err := ns.CreateNotification(adminID, notificationType, title, message, data, orderID)
		if err != nil {
			log.Printf("❌ فشل في إنشاء إشعار للإدارة %s: %v", adminID.String(), err)
			continue
		}

		log.Printf("✅ Admin notification created: ID=%s, Type=%s, Title=%s", 
			notification.ID.String(), notificationType, title)

		// Broadcast to admin SSE connections if notifier is available
		if AdminNotifierInstance != nil {
			log.Printf("📢 Broadcasting admin notification to %s: %s", adminID.String(), title)
			AdminNotifierInstance.BroadcastToAdmin(adminID, "notification_created", gin.H{
				"id":      notification.ID.String(),
				"type":    string(notificationType),
				"title":   title,
				"message": message,
				"data":    data,
				"created_at": notification.CreatedAt,
				"is_read": notification.IsRead,
				"order_id": orderID,
			})
		} else {
			log.Printf("⚠️ AdminNotifier not available - notification saved to database only")
		}
	}

	log.Printf("✅ تم إنشاء إشعارات الإدارة لـ %d مدير - النوع: %s", len(adminIDs), notificationType)
	return nil
}

// GetAdminNotifications retrieves notifications for admin users with pagination
func (ns *NotificationService) GetAdminNotifications(page, limit int, unreadOnly bool) ([]models.Notification, int64, error) {
	offset := (page - 1) * limit
	var notifications []models.Notification
	var total int64

	// Build query for admin notifications
	query := ns.db.Model(&models.Notification{}).Where("type IN ?", []models.NotificationType{
		models.NotificationTypeAdminWholesaleSubmitted,
		models.NotificationTypeAdminOrderCreated,
		models.NotificationTypeAdminOrderUpdated,
		models.NotificationTypeAdminWholesaleOrder,
	})

	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get notifications with pagination
	if err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error; err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

// GetAdminNotificationsWithFilter retrieves notifications for admin users with pagination and type filtering
func (ns *NotificationService) GetAdminNotificationsWithFilter(page, limit int, unreadOnly bool, notificationType string) ([]models.Notification, int64, error) {
	offset := (page - 1) * limit
	var notifications []models.Notification
	var total int64

	// Build query for admin notifications
	query := ns.db.Model(&models.Notification{}).Where("type IN ?", []models.NotificationType{
		models.NotificationTypeAdminWholesaleSubmitted,
		models.NotificationTypeAdminOrderCreated,
		models.NotificationTypeAdminOrderUpdated,
		models.NotificationTypeAdminWholesaleOrder,
	})

	// Add type filter if specified
	if notificationType != "" && notificationType != "all" {
		query = query.Where("type = ?", notificationType)
	}

	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get notifications with pagination
	if err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error; err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

// GetAdminNotificationsWithFilterForUser retrieves notifications for a specific admin user with pagination and type filtering
func (ns *NotificationService) GetAdminNotificationsWithFilterForUser(userID uuid.UUID, page, limit int, unreadOnly bool, notificationType string) ([]models.Notification, int64, error) {
	offset := (page - 1) * limit
	var notifications []models.Notification
	var total int64

	// Build query for admin notifications for specific user
	fmt.Printf("🔍 [DEBUG] Searching notifications for user_id: %s\n", userID)
	query := ns.db.Model(&models.Notification{}).Where("user_id = ? AND type IN ?", userID, []models.NotificationType{
		models.NotificationTypeAdminWholesaleSubmitted,
		models.NotificationTypeAdminOrderCreated,
		models.NotificationTypeAdminOrderUpdated,
		models.NotificationTypeAdminWholesaleOrder,
	})
	
	// Debug: Check total notifications for this user
	var debugCount int64
	ns.db.Model(&models.Notification{}).Where("user_id = ?", userID).Count(&debugCount)
	fmt.Printf("🔍 [DEBUG] Total notifications for user: %d\n", debugCount)

	// Add type filter if specified
	if notificationType != "" && notificationType != "all" {
		query = query.Where("type = ?", notificationType)
	}

	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get notifications with pagination
	if err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error; err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

// GetAdminUnreadCount returns the count of unread admin notifications for a user
func (ns *NotificationService) GetAdminUnreadCount(userID uuid.UUID) (int64, error) {
	var count int64
	err := ns.db.Model(&models.Notification{}).Where("user_id = ? AND is_read = ? AND type IN (?)", userID, false, []string{
		string(models.NotificationTypeAdminOrderCreated),
		string(models.NotificationTypeAdminOrderUpdated),
		string(models.NotificationTypeAdminWholesaleOrder),
		string(models.NotificationTypeAdminWholesaleSubmitted),
	}).Count(&count).Error
	return count, err
}

// DeleteOldNotifications deletes notifications older than specified days
func (ns *NotificationService) DeleteOldNotifications(days int) error {
	return ns.db.Where("created_at < NOW() - INTERVAL ? DAY", days).
		Delete(&models.Notification{}).Error
}
