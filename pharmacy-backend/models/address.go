package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AddressType string

const (
	AddressTypeShipping AddressType = "shipping"
	AddressTypeBilling  AddressType = "billing"
)

type Address struct {
	ID           uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID       uuid.UUID   `json:"user_id" gorm:"type:uuid;not null"`
	Type         AddressType `json:"type" gorm:"type:varchar(20);not null"`
	FirstName    string      `json:"first_name" gorm:"not null"`
	LastName     string      `json:"last_name" gorm:"not null"`
	Phone        string      `json:"phone"`
	AddressLine1 string      `json:"address_line1" gorm:"not null"`
	AddressLine2 *string     `json:"address_line2,omitempty"`
	City         string      `json:"city" gorm:"not null"`
	State        string      `json:"state" gorm:"not null"`
	PostalCode   string      `json:"postal_code" gorm:"not null"`
	Country      string      `json:"country" gorm:"not null;default:'Saudi Arabia'"`
	IsDefault    bool        `json:"is_default" gorm:"default:false"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	
	// العلاقات
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (a *Address) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (Address) TableName() string {
	return "addresses"
}

// GetFullName إرجاع الاسم الكامل
func (a *Address) GetFullName() string {
	return a.FirstName + " " + a.LastName
}

// GetFullAddress إرجاع العنوان الكامل
func (a *Address) GetFullAddress() string {
	address := a.AddressLine1
	if a.AddressLine2 != nil && *a.AddressLine2 != "" {
		address += ", " + *a.AddressLine2
	}
	address += ", " + a.City + ", " + a.State + " " + a.PostalCode
	if a.Country != "" {
		address += ", " + a.Country
	}
	return address
}

