-- Remove address field from users table
ALTER TABLE users DROP COLUMN IF EXISTS address;
