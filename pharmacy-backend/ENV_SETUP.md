# 🔧 إعداد متغيرات البيئة

## 📋 المتغيرات المطلوبة

### 1. **إنشاء ملف `.env`**

قم بإنشاء ملف `.env` في مجلد `pharmacy-backend` وأضف المتغيرات التالية:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_NAME=pharmacy_db
DB_PASSWORD=your-database-password

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production

# Server Configuration
PORT=8080
GIN_MODE=debug

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 2. **متغيرات JWT المهمة**

#### `JWT_SECRET`

- مفتاح التوقيع للـ access token
- يجب أن يكون طويلاً وعشوائياً
- مثال: `JWT_SECRET=my-super-secret-jwt-key-2024-pharmacy-app`

#### `JWT_REFRESH_SECRET`

- مفتاح التوقيع للـ refresh token
- يجب أن يكون مختلفاً عن `JWT_SECRET`
- مثال: `JWT_REFRESH_SECRET=my-super-secret-refresh-key-2024-pharmacy-app`

## 🔒 نصائح الأمان

### 1. **مفاتيح قوية**

```env
# ❌ ضعيف
JWT_SECRET=secret
JWT_REFRESH_SECRET=refresh

# ✅ قوي
JWT_SECRET=pharmacy-app-jwt-secret-key-2024-very-long-and-random
JWT_REFRESH_SECRET=pharmacy-app-refresh-secret-key-2024-very-long-and-random
```

### 2. **عدم مشاركة المفاتيح**

- لا تضع المفاتيح في Git
- لا تشارك ملف `.env` مع أي شخص
- استخدم `.env.example` للمشاركة

### 3. **مفاتيح مختلفة لكل بيئة**

```env
# Development
JWT_SECRET=dev-jwt-secret-key
JWT_REFRESH_SECRET=dev-refresh-secret-key

# Production
JWT_SECRET=prod-jwt-secret-key-very-long-and-secure
JWT_REFRESH_SECRET=prod-refresh-secret-key-very-long-and-secure
```

## 🚀 كيفية التطبيق

### 1. **في التطوير المحلي**

```bash
# في مجلد pharmacy-backend
cd pharmacy-backend

# إنشاء ملف .env
touch .env

# إضافة المتغيرات
echo "JWT_SECRET=your-secret-key" >> .env
echo "JWT_REFRESH_SECRET=your-refresh-secret-key" >> .env
```

### 2. **في Docker**

تم تحديث `docker-compose.yml` بالفعل ليشمل المتغيرات المطلوبة.

### 3. **في Production**

```bash
# تعيين المتغيرات في النظام
export JWT_SECRET=your-production-secret-key
export JWT_REFRESH_SECRET=your-production-refresh-secret-key

# أو في ملف .env
JWT_SECRET=your-production-secret-key
JWT_REFRESH_SECRET=your-production-refresh-secret-key
```

## ✅ التحقق من التطبيق

### 1. **اختبار تسجيل الدخول**

```bash
# تسجيل دخول المشرف
curl -X POST http://localhost:8080/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### 2. **اختبار تحديث التوكن**

```bash
# تحديث التوكن
curl -X POST http://localhost:8080/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"your-refresh-token"}'
```

## 🔍 استكشاف الأخطاء

### 1. **خطأ "JWT_SECRET not set"**

```bash
# تأكد من وجود المتغير
echo $JWT_SECRET

# أو في Go
fmt.Println(os.Getenv("JWT_SECRET"))
```

### 2. **خطأ "JWT_REFRESH_SECRET not set"**

```bash
# تأكد من وجود المتغير
echo $JWT_REFRESH_SECRET

# أو في Go
fmt.Println(os.Getenv("JWT_REFRESH_SECRET"))
```

### 3. **خطأ في تحميل ملف .env**

```go
// في main.go
err := godotenv.Load()
if err != nil {
    log.Println("تحذير: لم يتم العثور على ملف .env")
}
```

## 📝 ملاحظات مهمة

1. **أعد تشغيل الخادم** بعد إضافة المتغيرات
2. **تأكد من صحة المفاتيح** قبل التشغيل
3. **اختبر النظام** بعد التطبيق
4. **احتفظ بنسخة احتياطية** من المفاتيح
5. **لا تشارك المفاتيح** في الكود العام
