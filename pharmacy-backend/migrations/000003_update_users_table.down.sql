-- This migration cannot be cleanly reversed as we've dropped columns
-- But we can add them back with default values

-- Add back the old columns
ALTER TABLE users 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Copy data back (this is an approximation as we can't perfectly split full_name)
UPDATE users SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = substring(full_name from position(' ' in full_name) + 1);

-- Make the columns NOT NULL
ALTER TABLE users 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Drop the new columns
ALTER TABLE users 
DROP COLUMN IF EXISTS full_name,
DROP COLUMN IF EXISTS account_type,
DROP COLUMN IF EXISTS company_name,
DROP COLUMN IF EXISTS commercial_register,
DROP COLUMN IF EXISTS id_document_url,
DROP COLUMN IF EXISTS commercial_document_url,
DROP COLUMN IF EXISTS email_verified,
DROP COLUMN IF EXISTS phone_verified,
DROP COLUMN IF EXISTS verification_token,
DROP COLUMN IF EXISTS verification_token_expires_at;
