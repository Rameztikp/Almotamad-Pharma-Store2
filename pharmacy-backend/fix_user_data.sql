-- إصلاح بيانات المستخدم الفارغة
-- تشغيل هذا الـ script لإصلاح البيانات

-- 1. أولاً، دعنا نرى البيانات الحالية
SELECT id, email, full_name, phone, created_at 
FROM users 
WHERE email = 'ram555e5zyiy6@gmail.com';

-- 2. إضافة حقل address إذا لم يكن موجوداً
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. تحديث بيانات المستخدم المحدد (استبدل البيانات حسب الحاجة)
UPDATE users 
SET 
    full_name = 'رامي أحمد',  -- ضع الاسم الحقيقي هنا
    phone = '0501234567'      -- ضع رقم الهاتف الحقيقي هنا
WHERE email = 'ram555e5zyiy6@gmail.com';

-- 4. التحقق من التحديث
SELECT id, email, full_name, phone, address, created_at 
FROM users 
WHERE email = 'ram555e5zyiy6@gmail.com';

-- 5. إصلاح جميع المستخدمين الذين لديهم full_name = 'مستخدم'
-- (احذف التعليق إذا كنت تريد تطبيق هذا على جميع المستخدمين)
/*
UPDATE users 
SET 
    full_name = CASE 
        WHEN full_name = 'مستخدم' THEN 'مستخدم جديد'
        ELSE full_name 
    END,
    phone = CASE 
        WHEN phone = '' OR phone IS NULL THEN '0500000000'
        ELSE phone 
    END
WHERE full_name = 'مستخدم' OR phone = '' OR phone IS NULL;
*/
