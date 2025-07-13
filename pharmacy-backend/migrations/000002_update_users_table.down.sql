-- Restore old columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate data back from full_name (simple split on space, not perfect)
UPDATE users 
SET 
  first_name = SPLIT_PART(full_name, ' ', 1),
  last_name = COALESCE(NULLIF(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1), ''), '');

-- Drop new columns
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
