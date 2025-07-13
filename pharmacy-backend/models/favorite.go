package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Favorite struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	ProductID uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	CreatedAt time.Time `json:"created_at"`
	
	// العلاقات
	User    User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Product Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (f *Favorite) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (Favorite) TableName() string {
	return "favorites"
}

