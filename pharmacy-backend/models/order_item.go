package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderItem struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	OrderID    uuid.UUID `json:"order_id" gorm:"type:uuid;not null"`
	ProductID  uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Name       string    `json:"name" gorm:"not null"`              // اسم المنتج وقت الشراء
	ImageURL   string    `json:"image_url" gorm:"type:text"`       // رابط صورة المنتج وقت الشراء
	Quantity   int       `json:"quantity" gorm:"not null"`
	UnitPrice  float64   `json:"unit_price" gorm:"not null"`
	TotalPrice float64   `json:"total_price" gorm:"not null"`
	CreatedAt  time.Time `json:"created_at"`
	
	// العلاقات
	Order   Order   `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	Product Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (oi *OrderItem) BeforeCreate(tx *gorm.DB) error {
	if oi.ID == uuid.Nil {
		oi.ID = uuid.New()
	}
	// حساب السعر الإجمالي
	oi.TotalPrice = oi.UnitPrice * float64(oi.Quantity)
	return nil
}

// TableName تحديد اسم الجدول
func (OrderItem) TableName() string {
	return "order_items"
}

