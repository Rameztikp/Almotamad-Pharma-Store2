-- This migration removes the date_of_birth column from the users table
ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth;
