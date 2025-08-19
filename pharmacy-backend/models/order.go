package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderStatus string
type PaymentStatus string

const (
	OrderStatusPending    OrderStatus = "pending"
	OrderStatusConfirmed  OrderStatus = "confirmed"
	OrderStatusProcessing OrderStatus = "processing"
	OrderStatusShipped    OrderStatus = "shipped"
	OrderStatusDelivered  OrderStatus = "delivered"
	OrderStatusCancelled  OrderStatus = "cancelled"
)

const (
	PaymentStatusPending  PaymentStatus = "pending"
	PaymentStatusPaid     PaymentStatus = "paid"
	PaymentStatusFailed   PaymentStatus = "failed"
	PaymentStatusRefunded PaymentStatus = "refunded"
)

type Order struct {
	ID                uuid.UUID     `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID            uuid.UUID     `json:"user_id" gorm:"type:uuid;not null"`
	OrderNumber       string        `json:"order_number" gorm:"uniqueIndex;not null"`
	Status            OrderStatus   `json:"status" gorm:"type:varchar(20);default:'pending'"`
	Subtotal          float64       `json:"subtotal" gorm:"not null"` // إجمالي سعر المنتجات قبل الخصم والضريبة والشحن
	TotalAmount       float64       `json:"total_amount" gorm:"not null"` // الإجمالي النهائي بعد الخصم والضريبة والشحن
	ShippingCost      float64       `json:"shipping_cost" gorm:"default:0"`
	TaxAmount         float64       `json:"tax_amount" gorm:"default:0"`
	DiscountAmount    float64       `json:"discount_amount" gorm:"default:0"`
	PaymentMethod     string        `json:"payment_method"`
	PaymentStatus     PaymentStatus `json:"payment_status" gorm:"type:varchar(20);default:'pending'"`
	ShippingAddress   Address       `json:"shipping_address" gorm:"type:jsonb;serializer:json"`
	BillingAddress    *Address      `json:"billing_address,omitempty" gorm:"type:jsonb;serializer:json"` // يمكن أن يكون فارغاً
	Notes             string        `json:"notes,omitempty" gorm:"type:text"`
	EstimatedDelivery *time.Time    `json:"estimated_delivery,omitempty"`
	ActualDelivery    *time.Time    `json:"actual_delivery,omitempty"`
	CreatedAt         time.Time     `json:"created_at"`
	UpdatedAt         time.Time     `json:"updated_at"`
	
	// العلاقات
	User         User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	OrderItems   []OrderItem    `json:"order_items,omitempty" gorm:"foreignKey:OrderID"`
	OrderTracking []OrderTracking `json:"order_tracking,omitempty" gorm:"foreignKey:OrderID"`
}

// BeforeCreate hook لإنشاء UUID ورقم الطلب قبل الحفظ
func (o *Order) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	if o.OrderNumber == "" {
		o.OrderNumber = generateOrderNumber()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (Order) TableName() string {
	return "orders"
}

// generateOrderNumber إنشاء رقم طلب فريد
func generateOrderNumber() string {
	return "ORD-" + time.Now().Format("2006") + "-" + uuid.New().String()[:8]
}

// GetSubtotal حساب المجموع الفرعي (بدون شحن وضرائب)
func (o *Order) GetSubtotal() float64 {
	return o.TotalAmount - o.ShippingCost - o.TaxAmount + o.DiscountAmount
}

// CanBeCancelled التحقق من إمكانية إلغاء الطلب
func (o *Order) CanBeCancelled() bool {
	return o.Status == OrderStatusPending || o.Status == OrderStatusConfirmed
}

// IsDelivered التحقق من تسليم الطلب
func (o *Order) IsDelivered() bool {
	return o.Status == OrderStatusDelivered
}

