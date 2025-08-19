package migrations

import "gorm.io/gorm"

// runOnChange holds gorm-based migrations to run when the app starts
var runOnChange []func(*gorm.DB) error

// GetRunOnChange exposes the registered gorm migrations
func GetRunOnChange() []func(*gorm.DB) error { return runOnChange }

// RegisterMigration is a placeholder for SQL Tx-based migrations registration.
// Some migration files call this function; we define a no-op to allow compilation
// unless a full migration runner is implemented elsewhere.
func RegisterMigration(m *Migration) {
	// no-op: implement actual registry/runner if needed
}
