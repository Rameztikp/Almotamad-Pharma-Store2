-- Add new columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'retail',
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS commercial_register TEXT,
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS commercial_document_url TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Migrate data from old columns to new ones
UPDATE users SET full_name = COALESCE(first_name, '') || ' ' || COALESCE(last_name, '');

-- Make new columns NOT NULL after migration
ALTER TABLE users 
ALTER COLUMN full_name SET NOT NULL,
ALTER COLUMN account_type SET NOT NULL;

-- Drop old columns if they exist
ALTER TABLE users 
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name;
