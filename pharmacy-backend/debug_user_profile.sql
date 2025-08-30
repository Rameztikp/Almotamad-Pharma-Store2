-- Debug script to check user data in database
-- Run this to verify user data is properly stored

-- 1. Check if address column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'address';

-- 2. Check sample user data (replace with actual user ID)
SELECT id, email, full_name, phone, address, date_of_birth, account_type, role, is_active
FROM users 
WHERE is_active = true 
LIMIT 5;

-- 3. Check specific user by email (replace with actual email)
-- SELECT id, email, full_name, phone, address, date_of_birth, account_type, role, is_active
-- FROM users 
-- WHERE email = 'user@example.com';

-- 4. Update sample user with test data (uncomment and modify as needed)
-- UPDATE users 
-- SET full_name = 'اسم تجريبي', phone = '0501234567', address = 'الرياض، حي النخيل، شارع الملك فهد'
-- WHERE email = 'user@example.com';
