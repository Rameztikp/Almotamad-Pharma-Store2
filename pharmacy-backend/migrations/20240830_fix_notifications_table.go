package migrations

import (
	"database/sql"
	"fmt"
)

func init() {
	migrationsList = append(migrationsList, &Migration{
		Version:     "20240830_fix_notifications_table",
		Description: "Fix notifications table schema to match Go model",
		Up:          up20240830FixNotificationsTable,
		Down:        down20240830FixNotificationsTable,
	})
}

func up20240830FixNotificationsTable(tx *sql.Tx) error {
	queries := []string{
		// Add order_id column if it doesn't exist
		`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS order_id UUID;`,
		
		// Add is_read column if it doesn't exist (replacing read_at logic)
		`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;`,
		
		// Add data column for additional JSON data if it doesn't exist
		`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data TEXT;`,
		
		// Create indexes for better performance
		`CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);`,
		`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`,
		
		// Update existing records to set is_read based on read_at
		`UPDATE notifications SET is_read = (read_at IS NOT NULL) WHERE is_read IS NULL;`,
		
		// Rename metadata column to match Go model expectations (if needed)
		// Note: We keep both for compatibility
		`UPDATE notifications SET data = COALESCE(metadata::text, '{}') WHERE data IS NULL;`,
	}

	for _, query := range queries {
		if _, err := tx.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query '%s': %v", query, err)
		}
	}

	return nil
}

func down20240830FixNotificationsTable(tx *sql.Tx) error {
	queries := []string{
		`DROP INDEX IF EXISTS idx_notifications_order_id;`,
		`DROP INDEX IF EXISTS idx_notifications_is_read;`,
		`ALTER TABLE notifications DROP COLUMN IF EXISTS order_id;`,
		`ALTER TABLE notifications DROP COLUMN IF EXISTS is_read;`,
		`ALTER TABLE notifications DROP COLUMN IF EXISTS data;`,
	}

	for _, query := range queries {
		if _, err := tx.Exec(query); err != nil {
			return fmt.Errorf("failed to execute rollback query '%s': %v", query, err)
		}
	}

	return nil
}
