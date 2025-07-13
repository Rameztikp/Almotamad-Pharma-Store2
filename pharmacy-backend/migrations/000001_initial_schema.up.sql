-- Create users table with all required columns
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    account_type VARCHAR(20) NOT NULL DEFAULT 'retail',
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    phone_verified BOOLEAN NOT NULL DEFAULT false,
    company_name TEXT,
    commercial_register TEXT,
    id_document_url TEXT,
    commercial_document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    verification_token TEXT,
    verification_token_expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Add comments
COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON COLUMN users.email IS 'User email address, must be unique';
COMMENT ON COLUMN users.account_type IS 'Type of user account: retail or wholesale';
COMMENT ON COLUMN users.role IS 'User role: customer, admin, super_admin, or wholesale';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email';
COMMENT ON COLUMN users.phone_verified IS 'Whether the user has verified their phone number';
