-- This migration adds the date_of_birth column to the users table
-- The column has already been added manually, so this is just for version control

-- Add comment to the column
COMMENT ON COLUMN users.date_of_birth IS 'User''s date of birth';
