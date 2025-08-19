package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Supplier struct {
    ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    Name          string    `gorm:"not null" json:"name"`
    ContactPerson string    `gorm:"size:255" json:"contact_person,omitempty"`
    Phone         string    `gorm:"size:50" json:"phone,omitempty"`
    Email         string    `gorm:"size:255" json:"email,omitempty"`
    Address       string    `gorm:"type:text" json:"address,omitempty"`
    TaxNumber     string    `gorm:"size:100" json:"tax_number,omitempty"`
    Balance       float64   `gorm:"type:decimal(15,2);default:0" json:"balance"`
    CreatedAt     time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
    UpdatedAt     time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`

    // Relations
    Products      []Product `gorm:"foreignKey:SupplierID" json:"products,omitempty"`
}

func (s *Supplier) BeforeCreate(tx *gorm.DB) error {
    s.ID = uuid.New()
    return nil
}

func (s *Supplier) TableName() string {
    return "suppliers"
}
