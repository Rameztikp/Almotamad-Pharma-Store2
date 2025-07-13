package migrations

import (
	"database/sql"
	"fmt"
)

type Migration struct {
    Name string
    Up   func(*sql.Tx) error
    Down func(*sql.Tx) error
}

func init() {
    RegisterMigration(&Migration{
        Name: "20240713_add_suppliers_and_inventory_tables",
        Up: func(tx *sql.Tx) error {
            // إنشاء جدول الموردين
            _, err := tx.Exec(`
                CREATE TABLE IF NOT EXISTS suppliers (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    contact_person VARCHAR(255),
                    phone VARCHAR(50),
                    email VARCHAR(255),
                    address TEXT,
                    tax_number VARCHAR(100),
                    balance DECIMAL(15, 2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `)
            if err != nil {
                return fmt.Errorf("failed to create suppliers table: %v", err)
            }

            // إضافة حقل المورد إلى جدول المنتجات
            _, err = tx.Exec(`
                ALTER TABLE products 
                ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
            `)
            if err != nil {
                return fmt.Errorf("failed to add supplier_id to products table: %v", err)
            }

            // إنشاء جدول حركات المخزون
            _, err = tx.Exec(`
                CREATE TABLE IF NOT EXISTS inventory_transactions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    product_id UUID REFERENCES products(id),
                    supplier_id UUID REFERENCES suppliers(id),
                    quantity INTEGER NOT NULL,
                    unit_price DECIMAL(15, 2) NOT NULL,
                    transaction_type VARCHAR(50) NOT NULL,
                    reference_number VARCHAR(100),
                    notes TEXT,
                    created_by UUID,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `)
            if err != nil {
                return fmt.Errorf("failed to create inventory_transactions table: %v", err)
            }

            return nil
        },
        Down: func(tx *sql.Tx) error {
            // التراجع عن التغييرات في حالة حدوث خطأ
            _, err := tx.Exec(`DROP TABLE IF EXISTS inventory_transactions;`)
            if err != nil {
                return fmt.Errorf("failed to drop inventory_transactions table: %v", err)
            }

            // إزالة العمود المضاف من جدول المنتجات
            _, err = tx.Exec(`
                ALTER TABLE products 
                DROP COLUMN IF EXISTS supplier_id;
            `)
            if err != nil {
                return fmt.Errorf("failed to drop supplier_id column: %v", err)
            }

            _, err = tx.Exec(`DROP TABLE IF EXISTS suppliers;`)
            if err != nil {
                return fmt.Errorf("failed to drop suppliers table: %v", err)
            }

            return nil
        },
    })
}