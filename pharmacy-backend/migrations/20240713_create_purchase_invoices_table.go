package migrations

import (
	"gorm.io/gorm"
)

type PurchaseInvoice struct {
	gorm.Model
	SupplierID    uint            `gorm:"not null" json:"supplier_id"`
	InvoiceNumber string          `gorm:"size:100;uniqueIndex" json:"invoice_number"`
	InvoiceDate   string          `gorm:"type:date" json:"invoice_date"`
	TotalAmount   float64         `gorm:"type:decimal(12,2);not null" json:"total_amount"`
	Notes         string          `gorm:"type:text" json:"notes"`
	Items         []InvoiceItem   `gorm:"foreignKey:InvoiceID" json:"items"`
	Transactions  []SupplierTransaction `gorm:"foreignKey:ReferenceID;references:ID" json:"transactions"`
}

type InvoiceItem struct {
	gorm.Model
	InvoiceID    uint    `gorm:"not null" json:"invoice_id"`
	ProductID    uint    `gorm:"not null" json:"product_id"`
	Quantity     int     `gorm:"not null" json:"quantity"`
	UnitPrice    float64 `gorm:"type:decimal(10,2);not null" json:"unit_price"`
	TotalPrice   float64 `gorm:"type:decimal(12,2);not null" json:"total_price"`
	ExpiryDate   string  `gorm:"type:date" json:"expiry_date"`
	BatchNumber  string  `gorm:"size:100" json:"batch_number"`
}

func init() {
	runOnChange = append(runOnChange, func(db *gorm.DB) error {
		return db.AutoMigrate(
			&PurchaseInvoice{},
			&InvoiceItem{},
		)
	})
}
