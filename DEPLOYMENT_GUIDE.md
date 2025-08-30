# دليل النشر الكامل - متجر المعتد فارما

## 🚀 الخطوات المطلوبة للنشر

### المرحلة الأولى: تجهيز ملفات البيئة

#### 1. للواجهة الأمامية (Frontend)
انسخ ملف `.env.development` وأعد تسميته إلى `.env.production` ثم عدّل القيم التالية:

```env
# API Configuration - Production
VITE_API_BASE_URL=https://your-backend-domain.com/api/v1
VITE_FILES_BASE_URL=https://your-backend-domain.com
VITE_API_TIMEOUT=30000

# CORS Configuration
VITE_CORS_ORIGIN=https://your-frontend-domain.com
VITE_CORS_CREDENTIALS=true

# Production Mode
VITE_APP_ENV=production
VITE_DEBUG=false

# Firebase Configuration (نفس القيم الموجودة)
VITE_FIREBASE_API_KEY=AIzaSyAf4FUHcErictwyMdOMFt_HWxs5hlWpAKw
VITE_FIREBASE_AUTH_DOMAIN=almatamed-11a07.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=almatamed-11a07
VITE_FIREBASE_STORAGE_BUCKET=almatamed-11a07.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=418460842186
VITE_FIREBASE_APP_ID=1:418460842186:web:66c0100d2465c851719c33
VITE_FIREBASE_MEASUREMENT_ID=G-X20RGVZ8W2
VITE_FIREBASE_VAPID_KEY=BIlyGPDzBdS2MpzXL3uR2cT7D4OJCsG_EKdyCgm_BYT5Us0cuqUWQkgfkDtlELWE3TWyFvozUETgCCfx7R7a5QU

# Google Maps API (نفس القيمة)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyD7Mmh9ImGHNutKE4GarS6TDuUy_eSwEZo
```

#### 2. للباك إند (Backend)
انسخ ملف `.env` الحالي وأعد تسميته إلى `.env.production` ثم عدّل القيم التالية:

```env
# Database Configuration - Production
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USER=your-production-db-user
DB_PASSWORD=your-secure-production-password
DB_NAME=pharmacy_db
DB_SSLMODE=require

# Server Configuration
PORT=8080
GIN_MODE=release

# CORS Configuration - عدّل هذه القيم للنطاقات الجديدة
CORS_ALLOW_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
CORS_ALLOW_HEADERS=Content-Type,Authorization

# JWT Secrets - استخدم نفس القيم الموجودة (آمنة بالفعل)
JWT_SECRET=K8mN2pQ5rT9wX3zA6bC1dF4gH7jL0oP3sV8yB5eI2nR6uY9xA2cF5hK8mP1qT4w7
JWT_REFRESH_SECRET=M9nQ2rT5wX8zA1bC4dF7gH0jL3oP6sV9yB2eI5nR8uY1xA4cF7hK0mP3qT6w9zB2
JWT_ADMIN_SECRET=P3qT6w9zB2eI5nR8uY1xA4cF7hK0mP3sV6yC9dG2fJ5lO8rU1vZ4xA7bE0hK3nQ6
JWT_ADMIN_REFRESH_SECRET=S6vZ9yC2fJ5lO8rU1xA4bE7hK0nQ3tW6zA9cF2gI5mP8sV1yB4eH7jL0oR3uX6w9

# Cloudinary (نفس القيمة)
CLOUDINARY_URL=cloudinary://388867643273738:YafuRvQ0f3GYWP3u2FqyBJYa63w@drl9ew4rw

# FCM Server Key (أضف هذا إذا كان لديك)
FCM_SERVER_KEY=your-fcm-server-key
```

### المرحلة الثانية: إنشاء ملفات التكوين

#### 1. ملف _redirects للواجهة الأمامية (Netlify)
أنشئ ملف `_redirects` في مجلد `dist/`:

```
/*    /index.html   200
```

#### 2. ملف vercel.json (إذا كنت تستخدم Vercel)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### 3. ملف Procfile للباك إند (Heroku)
```
web: ./main
```

### المرحلة الثالثة: تحديث الكود

#### 1. تحديث CORS في main.go
في ملف `pharmacy-backend/main.go` السطر 74، عدّل:

```go
corsConfig := cors.Config{
    AllowOrigins: []string{
        "https://your-frontend-domain.com",
        "https://www.your-frontend-domain.com",
    },
    // باقي الإعدادات تبقى كما هي
}
```

### المرحلة الرابعة: بناء المشروع

#### 1. بناء الواجهة الأمامية
```bash
cd nahdi-pharmacy-final
npm run build
```

#### 2. بناء الباك إند
```bash
cd pharmacy-backend
go build -o main .
```

### المرحلة الخامسة: النشر

#### خيار 1: Netlify + Railway (مُوصى به)

**للواجهة الأمامية (Netlify):**
1. اذهب إلى netlify.com
2. اسحب مجلد `dist/` إلى الموقع
3. أضف متغيرات البيئة من لوحة التحكم
4. أضف ملف `_redirects`

**للباك إند (Railway):**
1. اذهب إلى railway.app
2. اربط مستودع GitHub
3. أضف خدمة PostgreSQL
4. أضف متغيرات البيئة
5. انشر تلقائياً

#### خيار 2: Vercel + DigitalOcean

**للواجهة الأمامية (Vercel):**
1. اذهب إلى vercel.com
2. اربط مستودع GitHub
3. أضف متغيرات البيئة
4. انشر تلقائياً

**للباك إند (DigitalOcean App Platform):**
1. إنشاء تطبيق جديد
2. ربط مستودع GitHub
3. إضافة قاعدة بيانات PostgreSQL
4. تعيين متغيرات البيئة

## ⚠️ نصائح مهمة

1. **لا تنس تحديث الروابط**: استبدل `your-frontend-domain.com` و `your-backend-domain.com` بالروابط الحقيقية
2. **اختبر محلياً أولاً**: تأكد من عمل كل شيء قبل النشر
3. **احتفظ بنسخة احتياطية**: من ملفات `.env` الأصلية
4. **راقب السجلات**: بعد النشر للتأكد من عدم وجود أخطاء

## 📞 في حالة المشاكل

- تحقق من السجلات (logs) في منصة الاستضافة
- تأكد من صحة متغيرات البيئة
- تأكد من عمل قاعدة البيانات
- تحقق من إعدادات CORS
