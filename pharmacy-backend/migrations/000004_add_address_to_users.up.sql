-- Add address field to users table
ALTER TABLE users ADD COLUMN address TEXT;

-- Add comment for the new column
COMMENT ON COLUMN users.address IS 'User primary address for shipping and billing';
