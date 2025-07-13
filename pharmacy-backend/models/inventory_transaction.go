package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type TransactionType string

const (
    TransactionTypePurchase  TransactionType = "purchase"
    TransactionTypeReturn    TransactionType = "return"
    TransactionTypeAdjustment TransactionType = "adjustment"
)

type InventoryTransaction struct {
    ID              uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    ProductID       uuid.UUID       `gorm:"type:uuid;not null" json:"product_id"`
    SupplierID      *uuid.UUID      `gorm:"type:uuid" json:"supplier_id,omitempty"`
    Quantity        int             `gorm:"not null" json:"quantity"`
    UnitPrice       float64         `gorm:"type:decimal(15,2);not null" json:"unit_price"`
    TransactionType TransactionType `gorm:"type:varchar(50);not null" json:"transaction_type"`
    ReferenceNumber string          `gorm:"size:100" json:"reference_number,omitempty"`
    Notes           string          `gorm:"type:text" json:"notes,omitempty"`
    CreatedBy       *uuid.UUID      `gorm:"type:uuid" json:"created_by,omitempty"`
    CreatedAt       time.Time       `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`

    // Relations
    Product         Product         `gorm:"foreignKey:ProductID" json:"product,omitempty"`
    Supplier        *Supplier       `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
}

func (it *InventoryTransaction) BeforeCreate(tx *gorm.DB) error {
    it.ID = uuid.New()
    return nil
}

func (it *InventoryTransaction) TableName() string {
    return "inventory_transactions"
}
