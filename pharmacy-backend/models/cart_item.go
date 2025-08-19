package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CartItem struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	ProductID uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Quantity  int       `json:"quantity" gorm:"not null;default:1"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	
	// العلاقات
	User    User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Product Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (ci *CartItem) BeforeCreate(tx *gorm.DB) error {
	if ci.ID == uuid.Nil {
		ci.ID = uuid.New()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (CartItem) TableName() string {
	return "cart_items"
}

// GetTotalPrice حساب السعر الإجمالي للعنصر
func (ci *CartItem) GetTotalPrice() float64 {
	if ci.Product.ID != uuid.Nil {
		return ci.Product.GetDiscountedPrice() * float64(ci.Quantity)
	}
	return 0
}

