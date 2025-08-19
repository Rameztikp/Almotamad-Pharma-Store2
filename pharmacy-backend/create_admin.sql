-- Connect to the database and run these commands

-- First, make sure the uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or update admin user
INSERT INTO users (
    id,
    email,
    password_hash,
    full_name,
    phone,
    account_type,
    role,
    is_active,
    email_verified,
    phone_verified,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'admin@example.com',
    -- Password is 'admin123' (bcrypt hashed)
    '$2a$10$qONAXP.YQ3e1xdLT4PunBevyXtKjjztAQ5JreGq6h8T/gtVZcQqt.',
    'Admin User',
    '+1234567890',
    'retail',
    'admin',
    true,
    true,
    true,
    NOW(),
    NOW()
) 
ON CONFLICT (email) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    is_active = true,
    role = 'admin',
    updated_at = NOW()
RETURNING id, email, full_name, role;
