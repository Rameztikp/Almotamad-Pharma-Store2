-- Create fcm_tokens table
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- Create unique index on token to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
