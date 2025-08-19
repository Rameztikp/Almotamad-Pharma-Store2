package migrations

import (
	"log"

	"gorm.io/gorm"
)

// AddOrderFields migration adds new fields to orders and order_items tables

// AddOrderFields runs the migration
func AddOrderFields(db *gorm.DB) error {
	// Add subtotal column to orders table
	if err := db.Exec(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0`).Error; err != nil {
		return err
	}

	// Add name and image_url columns to order_items table
	if err := db.Exec(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`).Error; err != nil {
		return err
	}

	if err := db.Exec(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS image_url TEXT`).Error; err != nil {
		return err
	}

	// Update existing orders with calculated subtotals
	if err := db.Exec(`
		UPDATE orders 
		SET subtotal = total_amount - shipping_cost - tax_amount + discount_amount
	`).Error; err != nil {
		log.Printf("Warning: Could not update order subtotals: %v", err)
	}

	// Update existing order items with product names and images
	if err := db.Exec(`
		UPDATE order_items oi
		SET name = p.name, image_url = p.image_url
		FROM products p
		WHERE oi.product_id = p.id
	`).Error; err != nil {
		log.Printf("Warning: Could not update order item details: %v", err)
	}

	return nil
}

// RollbackAddOrderFields rolls back the migration
func RollbackAddOrderFields(db *gorm.DB) error {
	// Note: In production, you might want to back up data before dropping columns
	if err := db.Exec(`ALTER TABLE orders DROP COLUMN IF EXISTS subtotal`).Error; err != nil {
		return err
	}

	if err := db.Exec(`ALTER TABLE order_items DROP COLUMN IF EXISTS name`).Error; err != nil {
		return err
	}

	return db.Exec(`ALTER TABLE order_items DROP COLUMN IF EXISTS image_url`).Error
}
