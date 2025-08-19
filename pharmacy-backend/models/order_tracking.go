package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderTracking struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	OrderID     uuid.UUID `json:"order_id" gorm:"type:uuid;not null"`
	Status      string    `json:"status" gorm:"not null"`
	Description string    `json:"description" gorm:"type:text"`
	Location    *string   `json:"location,omitempty"`
	Timestamp   time.Time `json:"timestamp" gorm:"not null"`
	CreatedAt   time.Time `json:"created_at"`
	
	// العلاقات
	Order Order `json:"order,omitempty" gorm:"foreignKey:OrderID"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (ot *OrderTracking) BeforeCreate(tx *gorm.DB) error {
	if ot.ID == uuid.Nil {
		ot.ID = uuid.New()
	}
	if ot.Timestamp.IsZero() {
		ot.Timestamp = time.Now()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (OrderTracking) TableName() string {
	return "order_tracking"
}

