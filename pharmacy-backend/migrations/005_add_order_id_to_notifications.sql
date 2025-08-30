-- Migration: Add order_id column to notifications table
-- Description: Adds the missing order_id column and is_read column to match the Go model

-- Add order_id column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS order_id UUID;

-- Add is_read column (replacing read_at logic)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Add data column for additional JSON data
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data TEXT;

-- Create index for order_id
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);

-- Create index for is_read
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Update existing records to set is_read based on read_at
UPDATE notifications SET is_read = (read_at IS NOT NULL) WHERE is_read IS NULL;

-- Add foreign key constraint for order_id (optional, since orders might be deleted)
-- ALTER TABLE notifications ADD CONSTRAINT fk_notifications_order_id 
-- FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
