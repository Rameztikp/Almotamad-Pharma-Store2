package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationType string

const (
	NotificationTypeWholesaleApproved   NotificationType = "wholesale_approved"
	NotificationTypeWholesaleRejected   NotificationType = "wholesale_rejected"
	NotificationTypeWholesaleSubmitted  NotificationType = "wholesale_submitted"
	NotificationTypeOrderCreated        NotificationType = "order_created"
	NotificationTypeOrderUpdated        NotificationType = "order_status_updated"
	NotificationTypeAdminOrderCreated   NotificationType = "admin_order_created"
	NotificationTypeAdminOrderUpdated   NotificationType = "admin_order_updated"
	NotificationTypeAdminWholesaleOrder NotificationType = "admin_wholesale_order"
	NotificationTypeAdminWholesaleSubmitted NotificationType = "admin_wholesale_submitted"
	NotificationTypeGeneral             NotificationType = "general"
)

type Notification struct {
	ID        uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	UserID    uuid.UUID        `json:"user_id" gorm:"type:uuid;not null;index"`
	OrderID   *uuid.UUID       `json:"order_id,omitempty" gorm:"type:uuid;index"`
	Type      NotificationType `json:"type" gorm:"type:varchar(50);not null"`
	Title     string           `json:"title" gorm:"type:varchar(255);not null"`
	Message   string           `json:"message" gorm:"type:text;not null"`
	Data      string           `json:"data,omitempty" gorm:"type:text"` // Additional data as JSON
	IsRead    bool             `json:"is_read" gorm:"default:false"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	ReadAt    *time.Time       `json:"read_at,omitempty"`

	// Relations
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}
