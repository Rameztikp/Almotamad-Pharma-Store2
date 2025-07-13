package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// StringArray نوع مخصص لتخزين مصفوفة من النصوص في JSON
type StringArray []string

func (sa StringArray) Value() (driver.Value, error) {
	return json.Marshal(sa)
}

func (sa *StringArray) Scan(value interface{}) error {
	if value == nil {
		*sa = nil
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	
	return json.Unmarshal(bytes, sa)
}

// Dimensions نوع مخصص لتخزين أبعاد المنتج
type Dimensions struct {
	Length float64 `json:"length"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Unit   string  `json:"unit"` // cm, mm, inch
}

func (d Dimensions) Value() (driver.Value, error) {
	return json.Marshal(d)
}

func (d *Dimensions) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	
	return json.Unmarshal(bytes, d)
}

type Product struct {
	ID                  uuid.UUID    `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name                string       `json:"name" gorm:"not null"`
	Description         string       `json:"description" gorm:"type:text"`
	Price               float64      `json:"price" gorm:"not null"`
	DiscountPrice       *float64     `json:"discount_price,omitempty"`
	SKU                 string       `json:"sku" gorm:"uniqueIndex;not null"`
	CategoryID          uuid.UUID    `json:"category_id" gorm:"type:uuid;not null"`
	Brand               string       `json:"brand"`
	StockQuantity       int          `json:"stock_quantity" gorm:"default:0"`
	MinStockLevel       int          `json:"min_stock_level" gorm:"default:5"`
	ImageURL            string       `json:"image_url"`
	Images              StringArray  `json:"images" gorm:"type:jsonb"`
	IsActive            bool         `json:"is_active" gorm:"default:true"`
	IsFeatured          bool         `json:"is_featured" gorm:"default:false"`
	Weight              *float64     `json:"weight,omitempty"`
	Dimensions          *Dimensions  `json:"dimensions,omitempty" gorm:"type:jsonb"`
	Tags                StringArray  `json:"tags" gorm:"type:jsonb"`
	
	// حقول خاصة بالأدوية
	ExpiryDate          *time.Time   `json:"expiry_date,omitempty"`
	BatchNumber         *string      `json:"batch_number,omitempty"`
	Manufacturer        *string      `json:"manufacturer,omitempty"`
	RequiresPrescription bool        `json:"requires_prescription" gorm:"default:false"`
	ActiveIngredient    *string      `json:"active_ingredient,omitempty"`
	DosageForm          *string      `json:"dosage_form,omitempty"` // أقراص، شراب، كريم، إلخ
	Strength            *string      `json:"strength,omitempty"`    // 500mg, 10ml
	StorageConditions   *string      `json:"storage_conditions,omitempty" gorm:"type:text"`
	SideEffects         *string      `json:"side_effects,omitempty" gorm:"type:text"`
	Contraindications   *string      `json:"contraindications,omitempty" gorm:"type:text"`
	
	CreatedAt           time.Time    `json:"created_at"`
	UpdatedAt           time.Time    `json:"updated_at"`
	
	// العلاقات
	Category     Category             `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	OrderItems   []OrderItem          `json:"order_items,omitempty" gorm:"foreignKey:ProductID"`
	CartItems    []CartItem           `json:"cart_items,omitempty" gorm:"foreignKey:ProductID"`
	Favorites    []Favorite           `json:"favorites,omitempty" gorm:"foreignKey:ProductID"`
	SupplierID   *uuid.UUID           `gorm:"type:uuid" json:"supplier_id,omitempty"`
	Supplier     *Supplier            `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Transactions []InventoryTransaction `gorm:"foreignKey:ProductID" json:"transactions,omitempty"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (Product) TableName() string {
	return "products"
}

// IsInStock التحقق من توفر المنتج في المخزون
func (p *Product) IsInStock() bool {
	return p.StockQuantity > 0
}

// IsLowStock التحقق من انخفاض المخزون
func (p *Product) IsLowStock() bool {
	return p.StockQuantity <= p.MinStockLevel
}

// GetDiscountedPrice الحصول على السعر بعد الخصم
func (p *Product) GetDiscountedPrice() float64 {
	if p.DiscountPrice != nil && *p.DiscountPrice > 0 {
		return *p.DiscountPrice
	}
	return p.Price
}

// GetDiscountPercentage حساب نسبة الخصم
func (p *Product) GetDiscountPercentage() float64 {
	if p.DiscountPrice != nil && *p.DiscountPrice > 0 && p.Price > 0 {
		return ((p.Price - *p.DiscountPrice) / p.Price) * 100
	}
	return 0
}

// IsExpired التحقق من انتهاء صلاحية الدواء
func (p *Product) IsExpired() bool {
	if p.ExpiryDate == nil {
		return false
	}
	return time.Now().After(*p.ExpiryDate)
}

// IsExpiringSoon التحقق من قرب انتهاء الصلاحية (خلال 30 يوم)
func (p *Product) IsExpiringSoon() bool {
	if p.ExpiryDate == nil {
		return false
	}
	thirtyDaysFromNow := time.Now().AddDate(0, 0, 30)
	return p.ExpiryDate.Before(thirtyDaysFromNow)
}

// IsMedicine التحقق من كون المنتج دواء
func (p *Product) IsMedicine() bool {
	return p.ActiveIngredient != nil || p.DosageForm != nil || p.ExpiryDate != nil
}

