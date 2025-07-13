package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Category struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	ImageURL    string    `json:"image_url"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	SortOrder   int       `json:"sort_order" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	// العلاقات
	Products []Product `json:"products,omitempty" gorm:"foreignKey:CategoryID"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (Category) TableName() string {
	return "categories"
}

