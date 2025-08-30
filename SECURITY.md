# 🛡️ دليل الأمان - نظام إدارة الصيدلية

## 📋 ملخص الإصلاحات الأمنية المطبقة

تم تطبيق الإصلاحات التالية لتعزيز أمان النظام:

### ✅ الإصلاحات المكتملة

#### 1. **إصلاح مفاتيح JWT الافتراضية** (أولوية عالية)
- **المشكلة**: استخدام مفاتيح افتراضية ضعيفة (`"your-secret-key"`)
- **الحل**: إجبار استخدام متغيرات البيئة `JWT_SECRET` و `JWT_REFRESH_SECRET`
- **الملفات المعدلة**: `utils/jwt.go`
- **التأثير**: منع استخدام مفاتيح ضعيفة في الإنتاج

#### 2. **حماية من هجمات Brute Force** (أولوية عالية)
- **المشكلة**: عدم وجود حد لمحاولات تسجيل الدخول
- **الحل**: إضافة Rate Limiting (5 محاولات كل دقيقة لكل IP)
- **الملفات الجديدة**: `middleware/rate_limit.go`
- **الملفات المعدلة**: `main.go`
- **التأثير**: منع هجمات القوة الغاشمة على نقاط تسجيل الدخول

#### 3. **حماية CSRF** (أولوية متوسطة)
- **المشكلة**: عدم وجود حماية من هجمات CSRF
- **الحل**: إضافة CSRF middleware مع Double Submit Cookie Pattern
- **الملفات الجديدة**: `middleware/csrf.go`
- **التأثير**: حماية من هجمات Cross-Site Request Forgery

#### 4. **تسجيل الأحداث الأمنية** (أولوية متوسطة)
- **المشكلة**: عدم وجود تتبع للأنشطة الأمنية
- **الحل**: إضافة نظام تسجيل شامل للأحداث الأمنية
- **الملفات الجديدة**: `utils/security_logger.go`
- **الملفات المعدلة**: `handlers/auth.go`, `main.go`
- **التأثير**: تتبع وتسجيل جميع الأنشطة الأمنية

## 🔧 متطلبات النشر

### 1. **متغيرات البيئة المطلوبة**

قم بإنشاء ملف `.env` بناءً على `.env.example`:

```bash
# إنشاء مفاتيح JWT قوية (32 حرف على الأقل)
openssl rand -base64 32  # للـ JWT_SECRET
openssl rand -base64 32  # للـ JWT_REFRESH_SECRET
```

```env
# JWT Secrets (REQUIRED - Generate strong random keys for production)
JWT_SECRET=your-generated-strong-secret-here
JWT_REFRESH_SECRET=your-generated-strong-refresh-secret-here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=pharmacy_db
DB_SSLMODE=require  # في الإنتاج

# Server Configuration
PORT=8080
GIN_MODE=release  # في الإنتاج

# CORS Configuration
CORS_ALLOW_ORIGINS=https://yourdomain.com  # في الإنتاج
CORS_ALLOW_CREDENTIALS=true
```

### 2. **إعدادات الخادم**

#### أ. **إعدادات Nginx (موصى به)**

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'";
    
    # Rate Limiting (إضافي للحماية)
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    location /api/v1/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### ب. **إعدادات قاعدة البيانات**

```sql
-- إنشاء مستخدم مخصص لقاعدة البيانات
CREATE USER pharmacy_app WITH PASSWORD 'strong-password-here';
GRANT CONNECT ON DATABASE pharmacy_db TO pharmacy_app;
GRANT USAGE ON SCHEMA public TO pharmacy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pharmacy_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pharmacy_app;

-- تفعيل SSL في PostgreSQL
-- في postgresql.conf:
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

### 3. **مراقبة الأمان**

#### أ. **مراقبة ملفات السجل**

```bash
# مراقبة محاولات تسجيل الدخول الفاشلة
tail -f logs/security.log | grep "FAILED_LOGIN"

# مراقبة الأنشطة المشبوهة
tail -f logs/security.log | grep "SUSPICIOUS_ACTIVITY"

# مراقبة تجاوز حدود الطلبات
tail -f logs/security.log | grep "RATE_LIMIT_EXCEEDED"
```

#### ب. **تنبيهات أمنية**

قم بإعداد تنبيهات للأحداث التالية:
- محاولات تسجيل دخول فاشلة متكررة من نفس IP
- تجاوز حدود Rate Limiting
- محاولات الوصول لنقاط محمية بدون تصريح

## 🔍 اختبار الأمان

### 1. **اختبار Rate Limiting**

```bash
# اختبار حد محاولات تسجيل الدخول
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\n%{http_code}\n"
done
# يجب أن ترى 429 (Too Many Requests) بعد 5 محاولات
```

### 2. **اختبار JWT Security**

```bash
# محاولة استخدام توكن مزيف
curl -X GET http://localhost:8080/api/v1/auth/profile \
  -H "Authorization: Bearer fake.jwt.token" \
  -w "\n%{http_code}\n"
# يجب أن ترى 401 (Unauthorized)
```

### 3. **اختبار CSRF Protection**

```bash
# محاولة طلب بدون CSRF token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' \
  -w "\n%{http_code}\n"
# يجب أن يعمل (CSRF مطبق حسب الحاجة)
```

## 📊 مراقبة الأداء

### 1. **مقاييس الأمان**

- **معدل محاولات تسجيل الدخول الفاشلة**: يجب أن يكون < 5%
- **معدل تجاوز Rate Limiting**: يجب أن يكون < 1%
- **وقت استجابة نقاط المصادقة**: يجب أن يكون < 200ms

### 2. **تنظيف السجلات**

```bash
# تنظيف السجلات الأمنية القديمة (أكثر من 30 يوم)
find logs/ -name "security.log*" -mtime +30 -delete

# أرشفة السجلات الشهرية
gzip logs/security.log.$(date +%Y-%m)
```

## 🚨 استجابة للحوادث

### 1. **في حالة اكتشاف هجوم**

1. **فحص السجلات الأمنية**:
   ```bash
   grep "SUSPICIOUS_ACTIVITY\|RATE_LIMIT_EXCEEDED" logs/security.log
   ```

2. **حظر IP المشبوه**:
   ```bash
   # في iptables
   iptables -A INPUT -s SUSPICIOUS_IP -j DROP
   
   # في Nginx
   deny SUSPICIOUS_IP;
   ```

3. **إعادة تعيين مفاتيح JWT** (في الحالات الحرجة):
   ```bash
   # إنشاء مفاتيح جديدة
   openssl rand -base64 32 > new_jwt_secret
   openssl rand -base64 32 > new_refresh_secret
   
   # تحديث متغيرات البيئة وإعادة تشغيل الخدمة
   systemctl restart pharmacy-backend
   ```

### 2. **تقرير الحوادث**

احتفظ بسجل للحوادث الأمنية يتضمن:
- تاريخ ووقت الحادث
- نوع الهجوم
- IP المصدر
- الإجراءات المتخذة
- الدروس المستفادة

## 🔄 صيانة دورية

### أسبوعياً
- [ ] مراجعة سجلات الأمان
- [ ] فحص محاولات تسجيل الدخول الفاشلة
- [ ] تحديث قوائم IP المحظورة

### شهرياً
- [ ] تدوير مفاتيح JWT
- [ ] مراجعة صلاحيات المستخدمين
- [ ] تحديث التبعيات الأمنية
- [ ] أرشفة السجلات القديمة

### سنوياً
- [ ] مراجعة شاملة للأمان
- [ ] اختبار اختراق
- [ ] تحديث سياسات الأمان
- [ ] تدريب الفريق على الأمان

---

## 📞 جهات الاتصال

للإبلاغ عن مشاكل أمنية:
- **البريد الإلكتروني**: security@yourcompany.com
- **الهاتف**: +966-XX-XXX-XXXX (طوارئ فقط)

---

**آخر تحديث**: 25 أغسطس 2025  
**الإصدار**: 1.0  
**المراجع**: فريق الأمان
