package config

import (
	"fmt"
	"log"
	"os"
	"pharmacy-backend/models"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// DatabaseConfig إعدادات قاعدة البيانات
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// GetDatabaseConfig الحصول على إعدادات قاعدة البيانات من متغيرات البيئة
func GetDatabaseConfig() *DatabaseConfig {
	return &DatabaseConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "postgres"),
		Password: getEnv("DB_PASSWORD", "password"),
		DBName:   getEnv("DB_NAME", "pharmacy_db"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
}

// getEnv الحصول على متغير البيئة مع قيمة افتراضية
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// ConnectDatabase الاتصال بقاعدة البيانات
func ConnectDatabase() {
	config := GetDatabaseConfig()
	
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Riyadh",
		config.Host, config.User, config.Password, config.DBName, config.Port, config.SSLMode,
	)
	
	// Enable SQL query logging
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
		logger.Config{
			SlowThreshold:             time.Second, // Slow SQL threshold
			LogLevel:                  logger.Info, // Log level
			IgnoreRecordNotFoundError: true,        // Ignore ErrRecordNotFound error for logger
			Colorful:                  true,        // Enable color
		},
	)
	
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: newLogger,
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	
	// Enable debug mode for detailed SQL logging
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
		log.Println("✅ تم تهيئة إعدادات اتصال قاعدة البيانات بنجاح")
	}
	
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	
	log.Println("Database connected successfully")
	
	// تشغيل الهجرة التلقائية
	if err := AutoMigrate(); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}

// AutoMigrate تشغيل الهجرة التلقائية لإنشاء الجداول
func AutoMigrate() error {
	log.Println("Running database migrations...")
    
    // استخدم جلسة خاصة بالهجرة مع إسكات السجلات لتفادي أي مشاكل تنسيق أثناء الطباعة
    migDB := DB.Session(&gorm.Session{Logger: DB.Logger.LogMode(logger.Silent)})

    // تأكد من توافر امتداد pgcrypto مرة واحدة قبل أي إنشاء جداول يستخدم gen_random_uuid
    if err := migDB.Exec("CREATE EXTENSION IF NOT EXISTS pgcrypto;").Error; err != nil {
        log.Printf("⚠️ Failed to ensure pgcrypto extension globally: %v\n", err)
    }

    // التحقق من وجود الجداول مسبقاً
    usersTableExists := migDB.Migrator().HasTable(&models.User{})
    categoriesTableExists := migDB.Migrator().HasTable(&models.Category{})
    productsTableExists := migDB.Migrator().HasTable(&models.Product{})
    ordersTableExists := migDB.Migrator().HasTable(&models.Order{})
    orderItemsTableExists := migDB.Migrator().HasTable(&models.OrderItem{})
    cartItemsTableExists := migDB.Migrator().HasTable(&models.CartItem{})
    favoritesTableExists := migDB.Migrator().HasTable(&models.Favorite{})
    orderTrackingTableExists := migDB.Migrator().HasTable(&models.OrderTracking{})
    addressesTableExists := migDB.Migrator().HasTable(&models.Address{})
    couponsTableExists := migDB.Migrator().HasTable(&models.Coupon{})
    suppliersTableExists := migDB.Migrator().HasTable(&models.Supplier{})
    inventoryTransactionsTableExists := migDB.Migrator().HasTable(&models.InventoryTransaction{})
    wholesaleUpgradeRequestsTableExists := migDB.Migrator().HasTable(&models.WholesaleUpgradeRequest{})
    if !categoriesTableExists {
        log.Println("📦 Creating categories table via raw SQL (bypassing AutoMigrate)")
        // Ensure pgcrypto for gen_random_uuid
        if err := migDB.Exec("CREATE EXTENSION IF NOT EXISTS pgcrypto;").Error; err != nil {
            log.Printf("⚠️ Failed to ensure pgcrypto extension: %v\n", err)
        }
        createSQL := `
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`
        if err := migDB.Exec(createSQL).Error; err != nil {
            log.Printf("❌ Failed to create categories table: %v\n", err)
            return fmt.Errorf("failed to create categories table: %w", err)
        }
        categoriesTableExists = true
        log.Println("✅ categories table created successfully")
    }

    // إنشاء جدول الطلبات يدويًا لتجنب أخطاء AutoMigrate
    if !ordersTableExists {
        log.Println("📦 Creating orders table via raw SQL (bypassing AutoMigrate)")
        if err := migDB.Exec("CREATE EXTENSION IF NOT EXISTS pgcrypto;").Error; err != nil {
            log.Printf("⚠️ Failed to ensure pgcrypto extension: %v\n", err)
        }
        createOrdersSQL := `
        CREATE TABLE IF NOT EXISTS orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            order_number TEXT NOT NULL UNIQUE,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            subtotal DOUBLE PRECISION NOT NULL,
            total_amount DOUBLE PRECISION NOT NULL,
            shipping_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
            tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            payment_method TEXT,
            payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            shipping_address JSONB,
            billing_address JSONB,
            notes TEXT,
            estimated_delivery TIMESTAMPTZ,
            actual_delivery TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
        `
        if err := migDB.Exec(createOrdersSQL).Error; err != nil {
            log.Printf("❌ Failed to create orders table: %v\n", err)
            return fmt.Errorf("failed to create orders table: %w", err)
        }
        ordersTableExists = true
        log.Println("✅ orders table created successfully")
    }

    // إنشاء جدول المنتجات يدويًا لتجنب أخطاء AutoMigrate
    if !productsTableExists {
        log.Println("📦 Creating products table via raw SQL (bypassing AutoMigrate)")
        if err := migDB.Exec("CREATE EXTENSION IF NOT EXISTS pgcrypto;").Error; err != nil {
            log.Printf("⚠️ Failed to ensure pgcrypto extension: %v\n", err)
        }
        createProductsSQL := `
        CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR(10) NOT NULL DEFAULT 'retail',
            name TEXT NOT NULL,
            description TEXT,
            price DOUBLE PRECISION NOT NULL,
            discount_price DOUBLE PRECISION,
            sku TEXT NOT NULL UNIQUE,
            category_id UUID NOT NULL,
            brand TEXT,
            stock_quantity INTEGER NOT NULL DEFAULT 0,
            min_stock_level INTEGER NOT NULL DEFAULT 5,
            image_url TEXT,
            images JSONB,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_featured BOOLEAN NOT NULL DEFAULT FALSE,
            published_retail BOOLEAN NOT NULL DEFAULT FALSE,
            published_wholesale BOOLEAN NOT NULL DEFAULT FALSE,
            weight DOUBLE PRECISION,
            dimensions JSONB,
            tags JSONB,
            expiry_date TIMESTAMPTZ,
            batch_number TEXT,
            manufacturer TEXT,
            requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
            active_ingredient TEXT,
            dosage_form TEXT,
            strength TEXT,
            storage_conditions TEXT,
            side_effects TEXT,
            contraindications TEXT,
            supplier_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
        CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
        `
        if err := migDB.Exec(createProductsSQL).Error; err != nil {
            log.Printf("❌ Failed to create products table: %v\n", err)
            return fmt.Errorf("failed to create products table: %w", err)
        }
        productsTableExists = true
        log.Println("✅ products table created successfully")
    }

    // إنشاء جدول عناصر الطلبات يدويًا
    if !orderItemsTableExists {
        log.Println("📦 Creating order_items table via raw SQL (bypassing AutoMigrate)")
        createOrderItemsSQL := `
        CREATE TABLE IF NOT EXISTS order_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL,
            product_id UUID NOT NULL,
            name TEXT NOT NULL,
            image_url TEXT,
            quantity INTEGER NOT NULL,
            unit_price DOUBLE PRECISION NOT NULL,
            total_price DOUBLE PRECISION NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
        `
        if err := migDB.Exec(createOrderItemsSQL).Error; err != nil {
            log.Printf("❌ Failed to create order_items table: %v\n", err)
            return fmt.Errorf("failed to create order_items table: %w", err)
        }
        orderItemsTableExists = true
        log.Println("✅ order_items table created successfully")
    }

    // إنشاء جدول عناصر السلة يدويًا
    if !cartItemsTableExists {
        log.Println("📦 Creating cart_items table via raw SQL (bypassing AutoMigrate)")
        createCartItemsSQL := `
        CREATE TABLE IF NOT EXISTS cart_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            product_id UUID NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
        CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
        `
        if err := migDB.Exec(createCartItemsSQL).Error; err != nil {
            log.Printf("❌ Failed to create cart_items table: %v\n", err)
            return fmt.Errorf("failed to create cart_items table: %w", err)
        }
        cartItemsTableExists = true
        log.Println("✅ cart_items table created successfully")
    }

    // إنشاء جدول المفضلة يدويًا
    if !favoritesTableExists {
        log.Println("📦 Creating favorites table via raw SQL (bypassing AutoMigrate)")
        createFavoritesSQL := `
        CREATE TABLE IF NOT EXISTS favorites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            product_id UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
        CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
        `
        if err := migDB.Exec(createFavoritesSQL).Error; err != nil {
            log.Printf("❌ Failed to create favorites table: %v\n", err)
            return fmt.Errorf("failed to create favorites table: %w", err)
        }
        favoritesTableExists = true
        log.Println("✅ favorites table created successfully")
    }

    // إنشاء جدول تتبع الطلبات يدويًا
    if !orderTrackingTableExists {
        log.Println("📦 Creating order_tracking table via raw SQL (bypassing AutoMigrate)")
        createOrderTrackingSQL := `
        CREATE TABLE IF NOT EXISTS order_tracking (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL,
            status TEXT NOT NULL,
            description TEXT,
            location TEXT,
            timestamp TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
        `
        if err := migDB.Exec(createOrderTrackingSQL).Error; err != nil {
            log.Printf("❌ Failed to create order_tracking table: %v\n", err)
            return fmt.Errorf("failed to create order_tracking table: %w", err)
        }
        orderTrackingTableExists = true
        log.Println("✅ order_tracking table created successfully")
    }

    // إنشاء جدول العناوين يدويًا
    if !addressesTableExists {
        log.Println("📦 Creating addresses table via raw SQL (bypassing AutoMigrate)")
        createAddressesSQL := `
        CREATE TABLE IF NOT EXISTS addresses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            type VARCHAR(20) NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT,
            address_line1 TEXT NOT NULL,
            address_line2 TEXT,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            country TEXT NOT NULL DEFAULT 'Saudi Arabia',
            is_default BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
        `
        if err := migDB.Exec(createAddressesSQL).Error; err != nil {
            log.Printf("❌ Failed to create addresses table: %v\n", err)
            return fmt.Errorf("failed to create addresses table: %w", err)
        }
        addressesTableExists = true
        log.Println("✅ addresses table created successfully")
    }

    // إنشاء جدول الكوبونات يدويًا
    if !couponsTableExists {
        log.Println("📦 Creating coupons table via raw SQL (bypassing AutoMigrate)")
        createCouponsSQL := `
        CREATE TABLE IF NOT EXISTS coupons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT NOT NULL UNIQUE,
            type VARCHAR(20) NOT NULL,
            value DOUBLE PRECISION NOT NULL,
            min_order_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            max_discount_amount DOUBLE PRECISION,
            usage_limit INTEGER,
            used_count INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            valid_from TIMESTAMPTZ NOT NULL,
            valid_until TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
        `
        if err := migDB.Exec(createCouponsSQL).Error; err != nil {
            log.Printf("❌ Failed to create coupons table: %v\n", err)
            return fmt.Errorf("failed to create coupons table: %w", err)
        }
        couponsTableExists = true
        log.Println("✅ coupons table created successfully")
    }

    // إنشاء جدول الموردين يدويًا
    if !suppliersTableExists {
        log.Println("📦 Creating suppliers table via raw SQL (bypassing AutoMigrate)")
        createSuppliersSQL := `
        CREATE TABLE IF NOT EXISTS suppliers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            tax_number TEXT,
            balance DECIMAL(15,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        `
        if err := migDB.Exec(createSuppliersSQL).Error; err != nil {
            log.Printf("❌ Failed to create suppliers table: %v\n", err)
            return fmt.Errorf("failed to create suppliers table: %w", err)
        }
        suppliersTableExists = true
        log.Println("✅ suppliers table created successfully")
    }

    // إنشاء جدول حركات المخزون يدويًا
    if !inventoryTransactionsTableExists {
        log.Println("📦 Creating inventory_transactions table via raw SQL (bypassing AutoMigrate)")
        createInvTxSQL := `
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL,
            supplier_id UUID,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(15,2) NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            reference_number TEXT,
            notes TEXT,
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_transactions_supplier_id ON inventory_transactions(supplier_id);
        `
        if err := migDB.Exec(createInvTxSQL).Error; err != nil {
            log.Printf("❌ Failed to create inventory_transactions table: %v\n", err)
            return fmt.Errorf("failed to create inventory_transactions table: %w", err)
        }
        inventoryTransactionsTableExists = true
        log.Println("✅ inventory_transactions table created successfully")
    }

    // إنشاء جدول طلبات ترقية الجملة يدويًا
    if !wholesaleUpgradeRequestsTableExists {
        log.Println("📦 Creating wholesale_upgrade_requests table via raw SQL (bypassing AutoMigrate)")
        createWholesaleReqSQL := `
        CREATE TABLE IF NOT EXISTS wholesale_upgrade_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            company_name TEXT NOT NULL,
            tax_number TEXT,
            commercial_register TEXT NOT NULL,
            id_document_url TEXT NOT NULL,
            commercial_document_url TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            rejection_reason TEXT,
            processed_by UUID,
            processed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_wholesale_upgrade_requests_user_id ON wholesale_upgrade_requests(user_id);
        `
        if err := migDB.Exec(createWholesaleReqSQL).Error; err != nil {
            log.Printf("❌ Failed to create wholesale_upgrade_requests table: %v\n", err)
            return fmt.Errorf("failed to create wholesale_upgrade_requests table: %w", err)
        }
        wholesaleUpgradeRequestsTableExists = true
        log.Println("✅ wholesale_upgrade_requests table created successfully")
    }
	if usersTableExists {
		// حذف الـ default من عمود id لتجنب مشاكل التوليد التلقائي مع GORM
        if err := migDB.Exec("ALTER TABLE users ALTER COLUMN id DROP DEFAULT;").Error; err != nil {
			log.Printf("⚠️ Failed to drop default on users.id: %v\n", err)
		} else {
			log.Println("🔧 Dropped default on users.id if it existed")
		}
	}

	// إنشاء الجداول واحدًا تلو الآخر لتسهيل تتبع الأخطاء
	modelsToMigrate := []interface{}{
		&models.User{},
		&models.Category{},
		&models.Product{},
		&models.Order{},
		&models.OrderItem{},
		&models.CartItem{},
		&models.Favorite{},
		&models.OrderTracking{},
		&models.Address{},
		&models.Coupon{},
		// Add new models
		&models.Supplier{},
		&models.InventoryTransaction{},
		&models.WholesaleUpgradeRequest{},
	}
	
	for _, model := range modelsToMigrate {
		modelName := fmt.Sprintf("%T", model)
		log.Printf("Migrating model: %s\n", modelName)
		
        // تخطي AutoMigrate للجداول الموجودة بالفعل
        if modelName == "*models.User" && usersTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.User because table already exists")
            continue
        }
        if modelName == "*models.Category" && categoriesTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.Category because table already exists")
            continue
        }
        if modelName == "*models.Product" && productsTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.Product because table already exists")
            continue
        }
        if modelName == "*models.Order" && ordersTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.Order because table already exists")
            continue
        }
        if modelName == "*models.OrderItem" && orderItemsTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.OrderItem because table already exists")
            continue
        }
        if modelName == "*models.CartItem" && cartItemsTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.CartItem because table already exists")
            continue
        }
        if modelName == "*models.Favorite" && favoritesTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.Favorite because table already exists")
            continue
        }
        if modelName == "*models.OrderTracking" && orderTrackingTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.OrderTracking because table already exists")
            continue
        }
        if modelName == "*models.Address" && addressesTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.Address because table already exists")
            continue
        }
        if modelName == "*models.Coupon" && couponsTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.Coupon because table already exists")
            continue
        }
        if modelName == "*models.Supplier" && suppliersTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.Supplier because table already exists")
            continue
        }
        if modelName == "*models.InventoryTransaction" && inventoryTransactionsTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.InventoryTransaction because table already exists")
            continue
        }
        if modelName == "*models.WholesaleUpgradeRequest" && wholesaleUpgradeRequestsTableExists {
            log.Println("⏩ Skipping AutoMigrate for *models.WholesaleUpgradeRequest because table already exists")
            continue
        }

		err := migDB.AutoMigrate(model)
		if err != nil {
			log.Printf("❌ Failed to migrate model %s: %v\n", modelName, err)
			return fmt.Errorf("failed to migrate model %s: %w", modelName, err)
		}
		log.Printf("✅ Successfully migrated model: %s\n", modelName)
	}
	
	// التحقق من وجود الجداول
	var tables []string
	err := migDB.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tables).Error
	if err != nil {
		log.Printf("❌ Failed to list tables: %v\n", err)
	} else {
		log.Println("\n📋 Existing tables in the database:")
		for _, table := range tables {
			log.Printf("- %s\n", table)
		}
	}
	
	log.Println("\n✅ Database migrations completed successfully")
	return nil
}

// GetDB الحصول على اتصال قاعدة البيانات
func GetDB() *gorm.DB {
	return DB
}

// CloseDatabase إغلاق اتصال قاعدة البيانات
func CloseDatabase() {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			log.Println("Error getting underlying sql.DB:", err)
			return
		}
		
		if err := sqlDB.Close(); err != nil {
			log.Println("Error closing database connection:", err)
			return
		}
		
		log.Println("Database connection closed successfully")
	}
}

