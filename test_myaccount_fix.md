# اختبار إصلاح صفحة MyAccount

## خطوات الاختبار

### 1. تطبيق Migration لإضافة حقل العنوان
```bash
cd pharmacy-backend
# تشغيل migration لإضافة حقل address
# يجب تشغيل هذا الأمر حسب نظام migration المستخدم في المشروع
```

### 2. إعادة تشغيل Backend
```bash
cd pharmacy-backend
go run main.go
```

### 3. اختبار API مباشرة
```bash
# اختبار جلب بيانات المستخدم
curl -X GET "http://localhost:8080/api/v1/auth/me" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt

# اختبار تحديث البيانات
curl -X PUT "http://localhost:8080/api/v1/auth/profile" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt \
  -d '{
    "full_name": "اسم تجريبي",
    "phone": "0501234567",
    "address": "الرياض، حي النخيل، شارع الملك فهد"
  }'
```

### 4. اختبار Frontend
1. افتح المتصفح وانتقل إلى صفحة تسجيل الدخول
2. سجل دخول بحساب موجود
3. انتقل إلى صفحة "حسابي" (MyAccount)
4. تحقق من ظهور:
   - الاسم الكامل
   - رقم الهاتف
   - العنوان (إن وُجد)

### 5. اختبار تحديث البيانات
1. اضغط على "تعديل الملف"
2. قم بتحديث الاسم والهاتف والعنوان
3. احفظ التغييرات
4. تحقق من حفظ البيانات بنجاح

## المشاكل المحتملة والحلول

### إذا لم تظهر البيانات:
1. تحقق من console المتصفح للأخطاء
2. تحقق من logs الـ backend
3. تحقق من قاعدة البيانات باستخدام `debug_user_profile.sql`

### إذا فشل تحديث البيانات:
1. تحقق من صحة التوكن
2. تحقق من صحة البيانات المرسلة
3. تحقق من logs الـ backend للأخطاء

## النتائج المتوقعة
- ✅ ظهور الاسم الكامل في صفحة MyAccount
- ✅ ظهور رقم الهاتف في صفحة MyAccount  
- ✅ إمكانية تحديث البيانات وحفظها
- ✅ ظهور العنوان (بعد تطبيق Migration)
