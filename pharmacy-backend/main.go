package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"pharmacy-backend/config"
	"pharmacy-backend/handlers"
	"pharmacy-backend/middleware"
)

func main() {
	// تحميل متغيرات البيئة
	err := godotenv.Load()
	if err != nil {
		log.Println("تحذير: لم يتم العثور على ملف .env أو حدث خطأ في تحميله")
	}

	// طباعة كلمة السر للتأكد
	log.Println("DB_PASSWORD من ملف .env =", os.Getenv("DB_PASSWORD"))

	// الاتصال بقاعدة البيانات
	config.ConnectDatabase()

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
	corsConfig := cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "Content-Length", "X-Requested-With", "X-CSRF-Token"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	// Apply CORS middleware
	r.Use(cors.New(corsConfig))

	// Handle preflight requests
	r.OPTIONS("/*any", func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, Content-Length, X-Requested-With, X-CSRF-Token")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "43200") // 12 hours
		c.Status(204)
	})

	// Serve static files from uploads directory
	r.Static("/uploads", "./uploads")

	// Health check endpoint
	r.GET("/health", handlers.HealthCheck)

	// Group routes with version and API prefix
	api := r.Group("/api/v1")
	{
		// Notifications (SSE stream)
		api.GET("/notifications/stream", handlers.NotificationsStream)

		// Authentication routes
		auth := api.Group("/auth")
		{
			// User authentication endpoints
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.POST("/refresh-token", handlers.RefreshToken)
			auth.GET("/profile", middleware.JWTAuth(), handlers.GetProfile)
			auth.GET("/me", middleware.JWTAuth(), handlers.GetProfile) // إضافة مسار /me
			auth.PUT("/profile", middleware.JWTAuth(), handlers.UpdateProfile)
			auth.PUT("/change-password", middleware.JWTAuth(), handlers.ChangePassword)
			auth.POST("/logout", middleware.JWTAuth(), handlers.Logout)

			// Admin authentication endpoints
			// POST /api/v1/auth/admin/login
			auth.POST("/admin/login", handlers.AdminLogin)
			auth.GET("/admin/profile", middleware.JWTAuth(), middleware.AdminOnly(), handlers.GetAdminProfile)
		}



		// Wholesale routes
		wholesale := api.Group("/wholesale")
		{
			// POST /api/v1/wholesale/requests - Submit a new wholesale upgrade request
			wholesale.POST("/requests", middleware.JWTAuth(), handlers.UpgradeToWholesale)
			// GET /api/v1/wholesale/requests - Get current user's wholesale request
			wholesale.GET("/requests", middleware.JWTAuth(), handlers.GetUserWholesaleRequest)
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
		cart.Use(middleware.JWTAuth())
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
		favorites.Use(middleware.JWTAuth())
		{
			favorites.GET("/", handlers.GetFavorites)
			favorites.GET("", handlers.GetFavorites)
			favorites.POST("/", handlers.AddToFavorites)
			favorites.POST("", handlers.AddToFavorites)
			favorites.DELETE("/:product_id", handlers.RemoveFromFavorites)
		}

		// الطلبات
		orders := api.Group("/orders")
		orders.Use(middleware.JWTAuth())
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



		// لوحة تحكم الإدارة
		adminGroup := api.Group("/admin")
		adminGroup.Use(middleware.JWTAuth(), middleware.AdminOnly())
		{
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
			adminGroup.POST("/uploads", handlers.UploadImages)

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

		// Coupons
		api.POST("/coupons/validate", handlers.ValidateCoupon)
	}

	// تشغيل الخادم
	port := getEnv("PORT", "8080")
	log.Printf("✅ Server running on http://localhost:%s", port)
	log.Fatal(r.Run(":" + port))
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value != "" {
		return value
	}
	return defaultValue
}
