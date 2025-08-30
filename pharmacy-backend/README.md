# Pharmacy Backend API

واجهة خلفية متكاملة لنظام إدارة الصيدلية مبنية بلغة Go مع Gin framework وقاعدة بيانات PostgreSQL.

## المميزات

### 🔐 نظام المصادقة والتفويض
- تسجيل المستخدمين وتسجيل الدخول
- JWT Authentication
- أدوار مختلفة (عميل، مدير، مدير عام)
- تشفير كلمات المرور

### 💊 إدارة المنتجات والأدوية
- معلومات شاملة للأدوية (تاريخ الانتهاء، المادة الفعالة، إلخ)
- إدارة المخزون
- تتبع المنتجات منخفضة المخزون
- تتبع المنتجات قاربة الانتهاء
- البحث والتصفية

### 🛒 نظام التسوق
- سلة التسوق
- قائمة المفضلة
- إدارة الطلبات
- تتبع الطلبات
- نظام الكوبونات

### 👥 إدارة المستخدمين
- ملفات المستخدمين
- إدارة العناوين
- صلاحيات متدرجة

### 📊 لوحة التحكم الإدارية
- إحصائيات شاملة
- إدارة المنتجات والفئات
- إدارة الطلبات والمستخدمين
- إدارة الكوبونات

## متطلبات التشغيل

- Go 1.18 أو أحدث
- PostgreSQL 12 أو أحدث
- Git

## التثبيت والتشغيل

### 1. تحضير البيئة

```bash
# استنساخ المشروع
git clone <repository-url>
cd pharmacy-backend
cd Almotamad-Pharma-Store-1

# تثبيت المكتبات
go mod download
```

### 2. إعداد قاعدة البيانات

```bash
# تثبيت PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# إنشاء قاعدة البيانات
sudo -u postgres createdb pharmacy_db
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
```

### 3. إعداد متغيرات البيئة

```bash
# نسخ ملف الإعدادات
cp .env.example .env

# تعديل الإعدادات حسب بيئتك
nano .env
```

### 4. تشغيل التطبيق

```bash
# تجميع التطبيق
go build -o pharmacy-backend .

# تشغيل التطبيق
./pharmacy-backend
```

التطبيق سيعمل على `http://localhost:8080`

## التشغيل باستخدام Docker

```bash
# تشغيل باستخدام Docker Compose
docker-compose up -d

# أو تشغيل قاعدة البيانات فقط
docker-compose up -d postgres

# ثم تشغيل التطبيق محلياً
go run main.go
```

## API Endpoints

### المصادقة
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول

### المنتجات
- `GET /api/products/` - الحصول على جميع المنتجات
- `GET /api/products/:id` - الحصول على منتج محدد
- `GET /api/products/search` - البحث في المنتجات
- `GET /api/products/featured` - المنتجات المميزة

### الفئات
- `GET /api/categories/` - الحصول على جميع الفئات
- `GET /api/categories/:id` - الحصول على فئة محددة

### سلة التسوق (تتطلب مصادقة)
- `GET /api/cart/` - الحصول على سلة التسوق
- `POST /api/cart/items` - إضافة منتج للسلة
- `PUT /api/cart/items/:id` - تحديث كمية منتج
- `DELETE /api/cart/items/:id` - حذف منتج من السلة

### الطلبات (تتطلب مصادقة)
- `POST /api/orders/` - إنشاء طلب جديد
- `GET /api/orders/` - الحصول على طلبات المستخدم
- `GET /api/orders/:id` - الحصول على طلب محدد
- `GET /api/orders/:id/tracking` - تتبع الطلب

### الإدارة (تتطلب صلاحيات إدارية)
- `POST /api/admin/products` - إنشاء منتج جديد
- `PUT /api/admin/products/:id` - تحديث منتج
- `DELETE /api/admin/products/:id` - حذف منتج
- `GET /api/admin/orders` - الحصول على جميع الطلبات
- `PUT /api/admin/orders/:id/status` - تحديث حالة الطلب

## بنية المشروع

```
pharmacy-backend/
├── config/          # إعدادات قاعدة البيانات
├── handlers/        # معالجات API
├── middleware/      # Middleware للمصادقة والتفويض
├── models/          # نماذج قاعدة البيانات
├── utils/           # أدوات مساعدة
├── main.go          # الملف الرئيسي
├── go.mod           # إعدادات Go modules
├── Dockerfile       # إعدادات Docker
├── docker-compose.yml # إعدادات Docker Compose
└── .env.example     # مثال لمتغيرات البيئة
```

## متغيرات البيئة

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=pharmacy_db
DB_SSLMODE=disable

# JWT Secret
JWT_SECRET=your-secret-key-change-this-in-production

# Server Configuration
PORT=8080
GIN_MODE=debug

# CORS Configuration
CORS_ALLOW_ORIGINS=*
CORS_ALLOW_CREDENTIALS=true
```

## الأمان

- جميع كلمات المرور مشفرة باستخدام bcrypt
- JWT tokens للمصادقة
- CORS مُعد بشكل صحيح
- صلاحيات متدرجة للمستخدمين
- حماية من SQL injection باستخدام GORM

## المساهمة

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add some amazing feature'`)
4. Push إلى Branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## الدعم

إذا واجهت أي مشاكل أو لديك أسئلة، يرجى فتح issue في المستودع.

