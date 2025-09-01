package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"pharmacy-backend/config"
	"pharmacy-backend/handlers"
	"pharmacy-backend/middleware"
	"pharmacy-backend/models"
	"pharmacy-backend/routes"
	"pharmacy-backend/services"
	"pharmacy-backend/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// تحميل متغيرات البيئة (فقط في التطوير المحلي)
	if os.Getenv("GIN_MODE") != "release" {
		err := godotenv.Load()
		if err != nil {
			log.Println("تحذير: لم يتم العثور على ملف .env أو حدث خطأ في تحميله")
		}
	}

	// 🛡️ تهيئة مسجل الأحداث الأمنية
	if err := utils.InitSecurityLogger(); err != nil {
		log.Printf("تحذير: فشل في تهيئة مسجل الأحداث الأمنية: %v", err)
	}

	// طباعة متغيرات قاعدة البيانات للتأكد
	log.Println("PGPASSWORD =", os.Getenv("PGPASSWORD"))
	log.Println("PGHOST =", os.Getenv("PGHOST"))
	log.Println("DATABASE_URL exists =", os.Getenv("DATABASE_URL") != "")

	// تهيئة قاعدة البيانات
	config.ConnectDatabase()

	// Initialize FCM Notifier
	fcmServerKey := os.Getenv("FCM_SERVER_KEY")
	notifier := services.NewNotifier(fcmServerKey)
	go notifier.Run()

	// Initialize FCM handler with notifier
	fcmHandler := handlers.NewFCMHandler(notifier)

	// Set database connection for models
	models.SetDB(config.DB)

	// Initialize notifier with FCM handler
	handlers.Notifier = handlers.NewNotifier(fcmHandler)

	// Set up admin notifier
	services.SetAdminNotifier(handlers.AdminNotifier)
	log.Println("✅ تم ربط AdminNotifier مع notification service")

	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll("uploads", 0755); err != nil {
		log.Fatalf("❌ Failed to create uploads directory: %v", err)
	}


	// تحديد وضع التشغيل (debug أو release)
	ginMode := getEnv("GIN_MODE", "debug")
	gin.SetMode(ginMode)

	// إنشاء الراوتر
	r := gin.Default()

	// CORS configuration for all routes
	corsOrigins := os.Getenv("CORS_ALLOW_ORIGINS")
	if corsOrigins == "" {
		// Default origins for development and production
		corsOrigins = "http://localhost:5173,https://astounding-taiyaki-94eb0e.netlify.app"
	}
	origins := strings.Split(corsOrigins, ",")

	// Function to check if origin is allowed
	isAllowedOrigin := func(origin string) bool {
		origin = strings.TrimSpace(origin)
		// Allow all subdomains of railway.app for cookie domain
		if strings.HasSuffix(origin, ".railway.app") {
			return true
		}
		for _, allowed := range origins {
			if origin == strings.TrimSpace(allowed) {
				return true
			}
		}
		return false
	}

	// CORS configuration
	corsConfig := cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// Skip CORS for non-browser requests
			if origin == "" {
				return true
			}
			return isAllowedOrigin(origin)
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "Content-Length", "X-Requested-With", "X-CSRF-Token"},
		ExposeHeaders:    []string{"Content-Length", "Set-Cookie"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	// Apply CORS middleware
	r.Use(cors.New(corsConfig))

	// Handle preflight requests
	r.OPTIONS("/*any", func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Status(204)
			return
		}

		// Set CORS headers
		if isAllowedOrigin(origin) {
			c.Header("Access-Control-Allow-Origin", origin)
		} else {
			c.Header("Access-Control-Allow-Origin", "")
		}
		
		c.Header("Vary", "Origin") // Important for caching
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, Content-Length, X-Requested-With, X-CSRF-Token")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Set-Cookie")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "43200") // 12 hours
		
		// For preflight requests, respond with 204 No Content
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
		}
	})

	// Serve static files from uploads directory
	r.Static("/uploads", "./uploads")

	// Health check endpoint
	r.GET("/health", handlers.HealthCheck)

	// Initialize handlers
	bannerHandler := handlers.NewBannerHandler(config.DB)

	// Group routes with version and API prefix
	api := r.Group("/api/v1")
	
	// FCM routes - moved to /api/v1/fcm to match frontend expectations
	fcmRoutes := api.Group("/fcm")
	fcmRoutes.Use(middleware.AuthMiddleware())
	{
		// Register FCM token
		fcmRoutes.POST("/subscribe", fcmHandler.SubscribeUserToFCM)

		// Test push notification
		fcmRoutes.POST("/test", fcmHandler.TestPushNotification)

		// Test endpoint
		fcmRoutes.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "FCM test endpoint works!"})
		})
	}
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			// User authentication endpoints
			auth.POST("/register", middleware.LoginRateLimit(), handlers.Register)
			auth.POST("/login", middleware.LoginRateLimit(), handlers.Login)
			auth.POST("/refresh-token", handlers.RefreshToken)
			auth.GET("/profile", middleware.AuthMiddleware(), handlers.GetProfile)
			auth.GET("/me", middleware.AuthMiddleware(), handlers.GetProfile) // إضافة مسار /me
			auth.PUT("/profile", middleware.AuthMiddleware(), handlers.UpdateProfile)
			auth.PUT("/change-password", middleware.AuthMiddleware(), handlers.ChangePassword)
			auth.POST("/logout", middleware.AuthMiddleware(), handlers.Logout)

			// Admin authentication endpoints
			// POST /api/v1/auth/admin/login
			auth.POST("/admin/login", middleware.LoginRateLimit(), handlers.AdminLogin)
			auth.GET("/admin/profile", middleware.AuthMiddleware(), middleware.AdminMiddleware(), handlers.GetAdminProfile)
		}



		// Wholesale routes
		wholesale := api.Group("/wholesale")
		{
			// POST /api/v1/wholesale/requests - Submit a new wholesale upgrade request
			wholesale.POST("/requests", middleware.AuthMiddleware(), handlers.UpgradeToWholesale)
			// GET /api/v1/wholesale/requests - Get current user's wholesale request
			wholesale.GET("/requests", middleware.AuthMiddleware(), handlers.GetUserWholesaleRequest)
		}

		// Public products routes
		products := api.Group("/products")
		{
			products.GET("", handlers.GetProducts)  // موجود في ملف آخر
			products.GET("/featured", handlers.GetFeaturedProducts) // الحصول على المنتجات المميزة
			products.GET("/:id", handlers.GetProduct)  // موجود في ملف آخر
			products.GET("/category/:category_id", handlers.GetProductsByCategory)  // موجود في ملف آخر
			products.GET("/search", handlers.SearchProducts)  // موجود في ملف آخر
		}

		// فئات
		categories := api.Group("/categories")
		{
			categories.GET("/", handlers.GetCategories)
			categories.GET("", handlers.GetCategories)
			categories.GET("/:id", handlers.GetCategory)  // موجود في ملف آخر
			categories.GET("/:id/products", handlers.GetCategoryWithProducts)
		}

		// سلة التسوق
		cart := api.Group("/cart")
		cart.Use(middleware.AuthMiddleware())
		{
			cart.GET("/", handlers.GetCart)
			cart.GET("", handlers.GetCart)
			cart.POST("/items", handlers.AddToCart)
			cart.PUT("/items/:id", handlers.UpdateCartItem)
			cart.DELETE("/items/:id", handlers.RemoveFromCart)
			cart.DELETE("/", handlers.ClearCart)
			cart.DELETE("", handlers.ClearCart)
		}

		// المفضلة
		favorites := api.Group("/favorites")
		favorites.Use(middleware.AuthMiddleware())
		{
			favorites.GET("/", handlers.GetFavorites)
			favorites.GET("", handlers.GetFavorites)
			favorites.POST("/", handlers.AddToFavorites)
			favorites.POST("", handlers.AddToFavorites)
			favorites.DELETE("/:product_id", handlers.RemoveFromFavorites)
		}

		// الطلبات
		orders := api.Group("/orders")
		orders.Use(middleware.AuthMiddleware())
		{
			orders.POST("/", handlers.CreateOrder)
			orders.POST("", handlers.CreateOrder)
			orders.GET("/", handlers.GetUserOrders)
			orders.GET("", handlers.GetUserOrders)
			orders.GET("/:id", handlers.GetOrder)
			orders.POST("/:id/cancel", handlers.CancelOrder)
		}

		// تتبع الطلب
		api.GET("/orders/:id/tracking", handlers.TrackOrder)

		// Notifications endpoints
		notifications := api.Group("/notifications")
		{
			// SSE stream endpoint (protected with JWT)
			notifications.GET("/stream", middleware.AuthMiddleware(), handlers.NotificationsStream)
			
			// REST API endpoints for stored notifications
			notifications.Use(middleware.AuthMiddleware())
			notifications.GET("", handlers.GetUserNotifications)
			notifications.PUT("/:id/read", handlers.MarkNotificationAsRead)
			notifications.PUT("/read-all", handlers.MarkAllNotificationsAsRead)
			notifications.GET("/unread-count", handlers.GetUnreadNotificationsCount)
		}

		// لوحة تحكم الإدارة
		adminGroup := api.Group("/admin")
		{
			// Admin notifications endpoints
			adminNotifications := adminGroup.Group("/notifications")
			{
				// SSE stream endpoint for admin notifications (handles auth internally)
				adminNotifications.GET("/stream", handlers.AdminNotificationsStream)
				
				// Protected admin notification endpoints
				adminNotifications.Use(middleware.AuthMiddleware(), middleware.AdminMiddleware())
				adminNotifications.GET("", handlers.GetAdminNotifications)
				adminNotifications.GET("/unread-count", handlers.GetAdminUnreadCount)
				adminNotifications.PUT("/:id/read", handlers.MarkNotificationAsRead)
				adminNotifications.PUT("/read-all", handlers.MarkAllNotificationsAsRead)
				adminNotifications.POST("/test", handlers.CreateTestAdminNotifications)
			}
			
			// Apply middleware to other admin routes
			adminGroup.Use(middleware.AuthMiddleware(), middleware.AdminMiddleware())
			// Product management routes
			adminProducts := adminGroup.Group("/products")
			{
				adminProducts.GET("", handlers.GetAdminProducts)
				adminProducts.POST("", handlers.CreateProduct)
				adminProducts.PUT("/:id", handlers.UpdateProduct)
				adminProducts.DELETE("/:id", handlers.DeleteProduct)
				
				// Publish/Unpublish product with permission check
				publishGroup := adminProducts.Group("")
				publishGroup.Use(middleware.CheckProductPublishPermission())
				{
					// Unified endpoint for both publish and unpublish actions
					publishGroup.PATCH("/:id/status", handlers.UpdateProductStatus)
				}
				
				// Other product-related endpoints
				adminProducts.GET("/low-stock", handlers.GetLowStockProducts)
				adminProducts.GET("/expiring", handlers.GetExpiringProducts)
			}

			adminGroup.POST("/categories", handlers.CreateCategory)
			adminGroup.PUT("/categories/:id", handlers.UpdateCategory)
			adminGroup.DELETE("/categories/:id", handlers.DeleteCategory)

			adminGroup.GET("/orders", handlers.GetAllOrders)
			adminGroup.PUT("/orders/:id/status", handlers.UpdateOrderStatus)
			adminGroup.POST("/orders/:id/tracking", handlers.AddOrderTracking)

			// Dashboard and Activities routes (already defined below in the file)
			// Users routes
			adminUsers := adminGroup.Group("/users")
			// تم تطبيق AdminOnly بالفعل على المستوى الأعلى
			// adminUsers.Use(middleware.AdminOnly())
			{
				adminUsers.GET("/", handlers.GetAllUsers)
				adminUsers.GET("/:id", handlers.GetUserByID)
				adminUsers.PUT("/:id", handlers.UpdateUser)
				adminUsers.DELETE("/:id", handlers.DeleteUser)
			}

			// Reports
			reports := adminGroup.Group("/reports")
			{
				reports.GET("/sales", handlers.GetSalesReport)
				reports.GET("/products", handlers.GetProductPerformanceReport)
				reports.GET("/inventory", handlers.GetInventoryReport)
			}

			// Dashboard
			dashboard := adminGroup.Group("/dashboard")
			{
				dashboard.GET("/stats", handlers.GetDashboardStats)
				dashboard.GET("/activities/recent", handlers.GetRecentActivities)
			}

			// Settings
			settings := adminGroup.Group("/settings")
			{
				settings.GET("", handlers.GetSettings)
				settings.PUT("", handlers.UpdateSettings)
				settings.GET("/payment-gateways", handlers.GetPaymentGateways)
				settings.PUT("/payment-gateways/:id", handlers.UpdatePaymentGateway)
			}

			// Uploads
			adminGroup.POST("/uploads", handlers.UploadFiles)

			// Coupons
			adminGroup.POST("/coupons", handlers.CreateCoupon)
			adminGroup.PUT("/coupons/:id", handlers.UpdateCoupon)
			adminGroup.DELETE("/coupons/:id", handlers.DeleteCoupon)
			adminGroup.GET("/coupons", handlers.GetCoupons)
			adminGroup.GET("/coupons/:id", handlers.GetCouponByID)

			// Wholesale Admin Routes - تأكد من تطبيق middleware بشكل صحيح
			wholesaleAdmin := adminGroup.Group("/wholesale-requests")
			{
				wholesaleAdmin.GET("", handlers.GetWholesaleRequests)
				wholesaleAdmin.PUT("/:id/status", handlers.UpdateRequestStatus)
			}
			
			// Wholesale Customers Routes
			adminGroup.GET("/wholesale-customers", handlers.GetWholesaleCustomers)
		}

		// Banner Routes
		routes.RegisterBannerRoutes(api, bannerHandler)

		// Temporary setup endpoint - remove after use
		api.GET("/setup-admin", func(c *gin.Context) {
			db := config.GetDB()
			
			// Check if admin already exists
			var existingUser models.User
			if err := db.Where("email = ?", "admin@almotamad.com").First(&existingUser).Error; err == nil {
				c.JSON(200, gin.H{"message": "Admin user already exists", "email": existingUser.Email})
				return
			}
			
			// Create admin user
			hashedPassword, _ := utils.HashPassword("admin123")
			adminUser := models.User{
				Email:         "admin@almotamad.com",
				PasswordHash:  hashedPassword,
				FullName:      "مدير النظام",
				Phone:         "+966501234567",
				AccountType:   "retail",
				Role:          "admin",
				IsActive:      true,
				EmailVerified: true,
				PhoneVerified: true,
			}
			
			if err := db.Create(&adminUser).Error; err != nil {
				c.JSON(500, gin.H{"error": "Failed to create admin user", "details": err.Error()})
				return
			}
			
			c.JSON(201, gin.H{
				"message": "Admin user created successfully",
				"email": "admin@almotamad.com",
				"password": "admin123",
			})
		})

		// Alternative endpoint
		api.POST("/setup-admin", func(c *gin.Context) {
			db := config.GetDB()
			
			// Check if admin already exists
			var existingUser models.User
			if err := db.Where("email = ?", "admin@almotamad.com").First(&existingUser).Error; err == nil {
				c.JSON(200, gin.H{"message": "Admin user already exists", "email": existingUser.Email})
				return
			}
			
			// Create admin user
			hashedPassword, _ := utils.HashPassword("admin123")
			adminUser := models.User{
				Email:         "admin@almotamad.com",
				PasswordHash:  hashedPassword,
				FullName:      "مدير النظام",
				Phone:         "+966501234567",
				AccountType:   "retail",
				Role:          "admin",
				IsActive:      true,
				EmailVerified: true,
				PhoneVerified: true,
			}
			
			if err := db.Create(&adminUser).Error; err != nil {
				c.JSON(500, gin.H{"error": "Failed to create admin user", "details": err.Error()})
				return
			}
			
			c.JSON(201, gin.H{
				"message": "Admin user created successfully",
				"email": "admin@almotamad.com",
				"password": "admin123",
			})
		})
	}

	// تشغيل الخادم
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default for development only
	}
	log.Printf("✅ Server running on port %s", port)
	log.Fatal(r.Run(":" + port))
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value != "" {
		return value
	}
	return defaultValue
}
