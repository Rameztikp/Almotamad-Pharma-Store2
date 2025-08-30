# خطوات النشر السريع - متجر المعتد فارما

## 🚀 الطريقة الأسهل: Netlify + Railway

### الخطوة 1: تجهيز الملفات
1. **انسخ محتوى** `FRONTEND_PRODUCTION_ENV.txt` إلى ملف جديد اسمه `.env.production` في مجلد `nahdi-pharmacy-final`
2. **انسخ محتوى** `BACKEND_PRODUCTION_ENV.txt` إلى ملف جديد اسمه `.env.production` في مجلد `pharmacy-backend`

### الخطوة 2: بناء الواجهة الأمامية
```bash
cd nahdi-pharmacy-final
npm install
npm run build
```

### الخطوة 3: نشر الواجهة الأمامية على Netlify
1. اذهب إلى [netlify.com](https://netlify.com)
2. سجل دخول أو أنشئ حساب جديد
3. اسحب مجلد `dist/` من `nahdi-pharmacy-final` إلى الموقع
4. **مهم**: أضف متغيرات البيئة في إعدادات الموقع:
   - اذهب إلى Site settings > Environment variables
   - أضف كل متغير من ملف `.env.production`

### الخطوة 4: نشر الباك إند على Railway
1. اذهب إلى [railway.app](https://railway.app)
2. سجل دخول باستخدام GitHub
3. اضغط "New Project" > "Deploy from GitHub repo"
4. اختر مستودع المشروع
5. اختر مجلد `pharmacy-backend`
6. أضف خدمة PostgreSQL:
   - اضغط "+ New" > "Database" > "PostgreSQL"
7. أضف متغيرات البيئة:
   - اذهب إلى Variables tab
   - أضف كل متغير من ملف `.env.production`
   - **مهم**: استخدم بيانات قاعدة البيانات من Railway:
     ```
     DB_HOST=postgres-hostname-from-railway
     DB_PORT=5432
     DB_USER=postgres-username-from-railway
     DB_PASSWORD=postgres-password-from-railway
     DB_NAME=railway
     ```

### الخطوة 5: تحديث الروابط
بعد النشر، ستحصل على روابط:
- Frontend: `https://your-app-name.netlify.app`
- Backend: `https://your-app-name.railway.app`

**عدّل ملفات البيئة:**
1. في Netlify (Frontend):
   - `VITE_API_BASE_URL=https://your-app-name.railway.app/api/v1`
   - `VITE_FILES_BASE_URL=https://your-app-name.railway.app`

2. في Railway (Backend):
   - `CORS_ALLOW_ORIGINS=https://your-app-name.netlify.app`

### الخطوة 6: إعادة النشر
1. **Netlify**: أعد رفع مجلد `dist/` بعد إعادة البناء
2. **Railway**: سيعيد النشر تلقائياً عند تحديث متغيرات البيئة

## ✅ اختبار المشروع
1. افتح رابط الواجهة الأمامية
2. جرب تسجيل الدخول
3. جرب إضافة منتج
4. تأكد من عمل الصور والخرائط

## 🔧 في حالة المشاكل
- تحقق من logs في Railway
- تأكد من صحة متغيرات البيئة
- تأكد من اتصال قاعدة البيانات

## 📱 بدائل أخرى
- **Frontend**: Vercel بدلاً من Netlify
- **Backend**: Heroku أو DigitalOcean بدلاً من Railway
