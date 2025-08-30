package migrations

import (
	"database/sql"
	"log"
)

type CreateFCMTokensTable struct{}

func (m *CreateFCMTokensTable) Name() string {
	return "20240830000000_create_fcm_tokens_table"
}

func (m *CreateFCMTokensTable) Up(tx *sql.Tx) error {
	log.Println("Creating fcm_tokens table...")
	_, err := tx.Exec(`
		CREATE TABLE IF NOT EXISTS fcm_tokens (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			token TEXT NOT NULL,
			device_id VARCHAR(255),
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			CONSTRAINT fk_user
				FOREIGN KEY (user_id) 
				REFERENCES users(id)
				ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
		CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
		CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_id ON fcm_tokens(device_id);
	`)

	return err
}

func (m *CreateFCMTokensTable) Down(tx *sql.Tx) error {
	log.Println("Dropping fcm_tokens table...")
	_, err := tx.Exec(`
		DROP INDEX IF EXISTS idx_fcm_tokens_device_id;
		DROP INDEX IF EXISTS idx_fcm_tokens_token;
		DROP INDEX IF EXISTS idx_fcm_tokens_user_id;
		DROP TABLE IF EXISTS fcm_tokens;
	`)
	return err
}
