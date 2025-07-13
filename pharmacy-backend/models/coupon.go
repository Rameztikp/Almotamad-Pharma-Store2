package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CouponType string

const (
	CouponTypePercentage  CouponType = "percentage"
	CouponTypeFixedAmount CouponType = "fixed_amount"
)

type Coupon struct {
	ID                uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Code              string     `json:"code" gorm:"uniqueIndex;not null"`
	Type              CouponType `json:"type" gorm:"type:varchar(20);not null"`
	Value             float64    `json:"value" gorm:"not null"`
	MinOrderAmount    float64    `json:"min_order_amount" gorm:"default:0"`
	MaxDiscountAmount *float64   `json:"max_discount_amount,omitempty"`
	UsageLimit        *int       `json:"usage_limit,omitempty"`
	UsedCount         int        `json:"used_count" gorm:"default:0"`
	IsActive          bool       `json:"is_active" gorm:"default:true"`
	ValidFrom         time.Time  `json:"valid_from" gorm:"not null"`
	ValidUntil        time.Time  `json:"valid_until" gorm:"not null"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (c *Coupon) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (Coupon) TableName() string {
	return "coupons"
}

// IsValid التحقق من صحة الكوبون
func (c *Coupon) IsValid() bool {
	now := time.Now()
	return c.IsActive && 
		   now.After(c.ValidFrom) && 
		   now.Before(c.ValidUntil) &&
		   (c.UsageLimit == nil || c.UsedCount < *c.UsageLimit)
}

// CanBeUsedForOrder التحقق من إمكانية استخدام الكوبون للطلب
func (c *Coupon) CanBeUsedForOrder(orderAmount float64) bool {
	return c.IsValid() && orderAmount >= c.MinOrderAmount
}

// CalculateDiscount حساب قيمة الخصم
func (c *Coupon) CalculateDiscount(orderAmount float64) float64 {
	if !c.CanBeUsedForOrder(orderAmount) {
		return 0
	}
	
	var discount float64
	
	if c.Type == CouponTypePercentage {
		discount = orderAmount * (c.Value / 100)
	} else {
		discount = c.Value
	}
	
	// تطبيق الحد الأقصى للخصم إذا كان محدداً
	if c.MaxDiscountAmount != nil && discount > *c.MaxDiscountAmount {
		discount = *c.MaxDiscountAmount
	}
	
	// التأكد من أن الخصم لا يتجاوز قيمة الطلب
	if discount > orderAmount {
		discount = orderAmount
	}
	
	return discount
}

