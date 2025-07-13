# خطة بناء الواجهة الخلفية لصيدلية النهدي باستخدام Go

## نظرة عامة على المشروع

سنقوم ببناء واجهة خلفية متكاملة لمتجر صيدلية النهدي باستخدام لغة Go، والتي ستشمل:

1. **واجهة برمجة التطبيقات (REST API)** لإدارة المنتجات والطلبات والمستخدمين
2. **قاعدة بيانات** لتخزين جميع البيانات
3. **لوحة تحكم إدارية** لإدارة المتجر
4. **نظام مصادقة وتفويض** للمستخدمين والإداريين

## التقنيات المستخدمة

### الواجهة الخلفية (Backend)
- **لغة البرمجة**: Go (Golang)
- **إطار العمل**: Gin (سريع وخفيف)
- **قاعدة البيانات**: PostgreSQL
- **ORM**: GORM (Go Object Relational Mapping)
- **المصادقة**: JWT (JSON Web Tokens)
- **التوثيق**: Swagger/OpenAPI

### لوحة التحكم (Admin Dashboard)
- **الواجهة الأمامية**: React.js
- **مكتبة UI**: Material-UI أو Ant Design
- **إدارة الحالة**: Context API أو Redux
- **الرسوم البيانية**: Chart.js أو Recharts

## بنية قاعدة البيانات

### الجداول الرئيسية

#### 1. جدول المستخدمين (users)
```sql
- id (UUID, Primary Key)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- first_name (VARCHAR)
- last_name (VARCHAR)
- phone (VARCHAR)
- role (ENUM: customer, admin, super_admin)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 2. جدول الفئات (categories)
```sql
- id (UUID, Primary Key)
- name (VARCHAR)
- description (TEXT)
- image_url (VARCHAR)
- is_active (BOOLEAN)
- sort_order (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 3. جدول المنتجات (products)
```sql
- id (UUID, Primary Key)
- name (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- discount_price (DECIMAL, NULLABLE)
- sku (VARCHAR, UNIQUE)
- category_id (UUID, Foreign Key)
- brand (VARCHAR)
- stock_quantity (INTEGER)
- min_stock_level (INTEGER)
- image_url (VARCHAR)
- images (JSON) -- مصفوفة من الصور
- is_active (BOOLEAN)
- is_featured (BOOLEAN)
- weight (DECIMAL)
- dimensions (JSON)
- tags (JSON) -- مصفوفة من العلامات
- expiry_date (DATE, NULLABLE) -- تاريخ انتهاء الصلاحية للأدوية
- batch_number (VARCHAR, NULLABLE) -- رقم الدفعة للأدوية
- manufacturer (VARCHAR, NULLABLE) -- الشركة المصنعة
- requires_prescription (BOOLEAN, DEFAULT FALSE) -- يتطلب وصفة طبية
- active_ingredient (VARCHAR, NULLABLE) -- المادة الفعالة
- dosage_form (VARCHAR, NULLABLE) -- شكل الجرعة (أقراص، شراب، كريم، إلخ)
- strength (VARCHAR, NULLABLE) -- قوة الدواء (مثل 500mg)
- storage_conditions (TEXT, NULLABLE) -- شروط التخزين
- side_effects (TEXT, NULLABLE) -- الآثار الجانبية
- contraindications (TEXT, NULLABLE) -- موانع الاستعمال
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 4. جدول الطلبات (orders)
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- order_number (VARCHAR, UNIQUE)
- status (ENUM: pending, confirmed, processing, shipped, delivered, cancelled)
- total_amount (DECIMAL)
- shipping_cost (DECIMAL)
- tax_amount (DECIMAL)
- discount_amount (DECIMAL)
- payment_method (VARCHAR)
- payment_status (ENUM: pending, paid, failed, refunded)
- shipping_address (JSON)
- billing_address (JSON)
- notes (TEXT)
- estimated_delivery (DATE)
- actual_delivery (TIMESTAMP, NULLABLE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 5. جدول عناصر الطلب (order_items)
```sql
- id (UUID, Primary Key)
- order_id (UUID, Foreign Key)
- product_id (UUID, Foreign Key)
- quantity (INTEGER)
- unit_price (DECIMAL)
- total_price (DECIMAL)
- created_at (TIMESTAMP)
```

#### 6. جدول سلة التسوق (cart_items)
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- product_id (UUID, Foreign Key)
- quantity (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 7. جدول المفضلة (favorites)
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- product_id (UUID, Foreign Key)
- created_at (TIMESTAMP)
```

#### 8. جدول تتبع الطلبات (order_tracking)
```sql
- id (UUID, Primary Key)
- order_id (UUID, Foreign Key)
- status (VARCHAR)
- description (TEXT)
- location (VARCHAR, NULLABLE)
- timestamp (TIMESTAMP)
- created_at (TIMESTAMP)
```

#### 9. جدول العناوين (addresses)
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- type (ENUM: shipping, billing)
- first_name (VARCHAR)
- last_name (VARCHAR)
- phone (VARCHAR)
- address_line1 (VARCHAR)
- address_line2 (VARCHAR, NULLABLE)
- city (VARCHAR)
- state (VARCHAR)
- postal_code (VARCHAR)
- country (VARCHAR)
- is_default (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 10. جدول الكوبونات (coupons)
```sql
- id (UUID, Primary Key)
- code (VARCHAR, UNIQUE)
- type (ENUM: percentage, fixed_amount)
- value (DECIMAL)
- min_order_amount (DECIMAL)
- max_discount_amount (DECIMAL, NULLABLE)
- usage_limit (INTEGER, NULLABLE)
- used_count (INTEGER, DEFAULT 0)
- is_active (BOOLEAN)
- valid_from (TIMESTAMP)
- valid_until (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## بنية API

### نقاط النهاية (Endpoints)

#### المصادقة والتفويض
```
POST   /api/auth/register          - تسجيل مستخدم جديد
POST   /api/auth/login             - تسجيل الدخول
POST   /api/auth/logout            - تسجيل الخروج
POST   /api/auth/refresh           - تجديد الرمز المميز
POST   /api/auth/forgot-password   - نسيان كلمة المرور
POST   /api/auth/reset-password    - إعادة تعيين كلمة المرور
```

#### إدارة المستخدمين
```
GET    /api/users/profile          - الحصول على ملف المستخدم
PUT    /api/users/profile          - تحديث ملف المستخدم
GET    /api/users/addresses        - الحصول على عناوين المستخدم
POST   /api/users/addresses        - إضافة عنوان جديد
PUT    /api/users/addresses/:id    - تحديث عنوان
DELETE /api/users/addresses/:id    - حذف عنوان
```

#### إدارة المنتجات
```
GET    /api/products               - الحصول على قائمة المنتجات
GET    /api/products/:id           - الحصول على منتج محدد
GET    /api/products/search        - البحث في المنتجات
GET    /api/products/featured      - المنتجات المميزة
GET    /api/products/category/:id  - منتجات فئة معينة
```

#### إدارة الفئات
```
GET    /api/categories             - الحصول على قائمة الفئات
GET    /api/categories/:id         - الحصول على فئة محددة
```

#### إدارة سلة التسوق
```
GET    /api/cart                   - الحصول على سلة التسوق
POST   /api/cart/items             - إضافة منتج للسلة
PUT    /api/cart/items/:id         - تحديث كمية منتج في السلة
DELETE /api/cart/items/:id         - حذف منتج من السلة
DELETE /api/cart                   - إفراغ السلة
```

#### إدارة المفضلة
```
GET    /api/favorites              - الحصول على قائمة المفضلة
POST   /api/favorites              - إضافة منتج للمفضلة
DELETE /api/favorites/:product_id  - حذف منتج من المفضلة
```

#### إدارة الطلبات
```
GET    /api/orders                 - الحصول على طلبات المستخدم
POST   /api/orders                 - إنشاء طلب جديد
GET    /api/orders/:id             - الحصول على طلب محدد
GET    /api/orders/:id/tracking    - تتبع الطلب
POST   /api/orders/:id/cancel      - إلغاء الطلب
```

#### إدارة الكوبونات
```
POST   /api/coupons/validate       - التحقق من صحة الكوبون
```

### API الإدارية (Admin API)

#### إدارة المنتجات (Admin)
```
POST   /api/admin/products         - إضافة منتج جديد
PUT    /api/admin/products/:id     - تحديث منتج
DELETE /api/admin/products/:id     - حذف منتج
GET    /api/admin/products/stats   - إحصائيات المنتجات
```

#### إدارة الفئات (Admin)
```
POST   /api/admin/categories       - إضافة فئة جديدة
PUT    /api/admin/categories/:id   - تحديث فئة
DELETE /api/admin/categories/:id   - حذف فئة
```

#### إدارة الطلبات (Admin)
```
GET    /api/admin/orders           - الحصول على جميع الطلبات
PUT    /api/admin/orders/:id       - تحديث حالة الطلب
GET    /api/admin/orders/stats     - إحصائيات الطلبات
```

#### إدارة المستخدمين (Admin)
```
GET    /api/admin/users            - الحصول على قائمة المستخدمين
GET    /api/admin/users/:id        - الحصول على مستخدم محدد
PUT    /api/admin/users/:id        - تحديث مستخدم
DELETE /api/admin/users/:id        - حذف مستخدم
```

#### إحصائيات عامة (Admin)
```
GET    /api/admin/dashboard        - إحصائيات لوحة التحكم
GET    /api/admin/reports/sales    - تقارير المبيعات
GET    /api/admin/reports/products - تقارير المنتجات
GET    /api/admin/reports/users    - تقارير المستخدمين
```

## ميزات إضافية

### 1. نظام الإشعارات
- إشعارات تحديث حالة الطلب
- إشعارات العروض والخصومات
- إشعارات انخفاض المخزون (للإداريين)

### 2. نظام التقييمات والمراجعات
- تقييم المنتجات من قبل المستخدمين
- كتابة مراجعات للمنتجات
- عرض متوسط التقييمات

### 3. نظام البحث المتقدم
- البحث بالاسم والوصف
- التصفية حسب الفئة والسعر
- الترتيب حسب السعر والتقييم والشعبية

### 4. نظام إدارة المخزون
- تتبع كميات المنتجات
- تنبيهات انخفاض المخزون
- تقارير حركة المخزون

### 5. نظام التحليلات
- تحليل سلوك المستخدمين
- تقارير المبيعات
- إحصائيات الأداء

## الأمان والحماية

### 1. المصادقة والتفويض
- استخدام JWT للمصادقة
- تشفير كلمات المرور باستخدام bcrypt
- نظام أدوار المستخدمين (customer, admin, super_admin)

### 2. حماية API
- Rate Limiting لمنع الهجمات
- CORS للتحكم في الوصول
- تشفير البيانات الحساسة

### 3. التحقق من صحة البيانات
- التحقق من صحة جميع المدخلات
- تنظيف البيانات لمنع SQL Injection
- التحقق من صحة الملفات المرفوعة

## خطة التنفيذ

### المرحلة 1: إعداد البيئة والأساسيات
1. إعداد مشروع Go
2. تثبيت المكتبات المطلوبة
3. إعداد قاعدة البيانات
4. إنشاء النماذج الأساسية

### المرحلة 2: تطوير API الأساسية
1. نظام المصادقة والتفويض
2. إدارة المستخدمين
3. إدارة المنتجات والفئات
4. سلة التسوق والمفضلة

### المرحلة 3: تطوير ميزات متقدمة
1. نظام الطلبات وتتبعها
2. نظام الكوبونات
3. نظام التقييمات
4. البحث المتقدم

### المرحلة 4: لوحة التحكم الإدارية
1. واجهة تسجيل الدخول للإداريين
2. إدارة المنتجات والفئات
3. إدارة الطلبات والمستخدمين
4. التقارير والإحصائيات

### المرحلة 5: الاختبار والنشر
1. اختبار جميع الوظائف
2. اختبار الأداء والأمان
3. إعداد بيئة الإنتاج
4. نشر التطبيق

## الخلاصة

هذه الخطة توفر أساساً قوياً لبناء واجهة خلفية متكاملة لمتجر صيدلية النهدي باستخدام Go. ستكون الواجهة الخلفية سريعة وآمنة وقابلة للتوسع، مع لوحة تحكم إدارية شاملة لإدارة جميع جوانب المتجر.

