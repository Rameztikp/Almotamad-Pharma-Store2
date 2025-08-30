-- إضافة حقل address إلى جدول users
ALTER TABLE users ADD COLUMN address TEXT;

-- التحقق من إضافة الحقل
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'address';
