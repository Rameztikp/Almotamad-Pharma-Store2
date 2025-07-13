package config

import (
	"fmt"
	"log"
	"os"
	"time"
	"pharmacy-backend/models"
	
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
	
	// تفعيل تسجيل الاستعلامات
	DB = DB.Debug()
	
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
	}
	
	for _, model := range modelsToMigrate {
		modelName := fmt.Sprintf("%T", model)
		log.Printf("Migrating model: %s\n", modelName)
		
		err := DB.AutoMigrate(model)
		if err != nil {
			log.Printf("❌ Failed to migrate model %s: %v\n", modelName, err)
			return fmt.Errorf("failed to migrate model %s: %w", modelName, err)
		}
		log.Printf("✅ Successfully migrated model: %s\n", modelName)
	}
	
	// التحقق من وجود الجداول
	var tables []string
	err := DB.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tables).Error
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

