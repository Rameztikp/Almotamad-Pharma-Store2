package migrations

import (
	"gorm.io/gorm"
)

// AddWholesaleAccessToUsers adds wholesale_access field to users table
func AddWholesaleAccessToUsers(db *gorm.DB) error {
	// Add wholesale_access column to users table
	if err := db.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS wholesale_access BOOLEAN DEFAULT false").Error; err != nil {
		return err
	}

	return nil
}

// RollbackWholesaleAccessToUsers removes wholesale_access field from users table
func RollbackWholesaleAccessToUsers(db *gorm.DB) error {
	// Remove wholesale_access column from users table
	if err := db.Exec("ALTER TABLE users DROP COLUMN IF EXISTS wholesale_access").Error; err != nil {
		return err
	}

	return nil
}
