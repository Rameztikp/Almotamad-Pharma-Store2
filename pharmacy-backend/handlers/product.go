package handlers

import (
	"net/http"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetProducts الحصول على قائمة المنتجات مع التصفح والتصفية
func GetProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	category := c.Query("category")
	search := c.Query("search")
	isWholesale := c.Query("is_wholesale")
	sortBy := c.DefaultQuery("sort", "created_at")
	sortOrder := c.DefaultQuery("order", "desc")
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	// بناء الاستعلام
	query := config.DB.Model(&models.Product{}).Where("is_active = ?", true)
	
	// Apply category filter
	if category != "" {
		if categoryUUID, err := uuid.Parse(category); err == nil {
			query = query.Where("category_id = ?", categoryUUID)
		}
	}

	// Apply wholesale filter
	if isWholesale == "true" {
		userRole, exists := c.Get("userRole")
		if exists && userRole == models.RoleAdmin {
			// Admin gets all wholesale products
			query = query.Where("type = ?", models.ProductTypeWholesale)
		} else {
			// Regular user gets only published wholesale products
			query = query.Where("type = ? AND published_wholesale = ?", models.ProductTypeWholesale, true)
		}
	}
	
	// تطبيق البحث
	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(brand) LIKE ?",
			searchTerm, searchTerm, searchTerm,
		)
	}
	
	// حساب العدد الإجمالي
	var total int64
	query.Count(&total)
	
	// تطبيق الترتيب والتصفح
	var products []models.Product
	err := query.
		Preload("Category").
		Order(sortBy + " " + sortOrder).
		Limit(limit).
		Offset(offset).
		Find(&products).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch products", err.Error())
		return
	}
	
	pagination := utils.CalculatePagination(page, limit, total)
	utils.PaginatedSuccessResponse(c, "Products retrieved successfully", products, pagination)
}

// GetProduct الحصول على منتج محدد
// GetAdminProducts retrieves a paginated list of products for the admin panel
func GetAdminProducts(c *gin.Context) {
	var products []models.Product
	var total int64

	// Pagination parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	sort := c.DefaultQuery("sort", "created_at")
	order := c.DefaultQuery("order", "desc")
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	// Build the base query: Admin should see all products regardless of is_active
	db := config.DB.Model(&models.Product{}).Select("*, published_wholesale")

	// Filter by category
	if categoryID := c.Query("category_id"); categoryID != "" {
		db = db.Where("category_id = ?", categoryID)
	}

	// Filter by brand
	if brand := c.Query("brand"); brand != "" {
		db = db.Where("brand = ?", brand)
	}

	// Filter by type (retail/wholesale)
	if productType := c.Query("type"); productType != "" {
		db = db.Where("type = ?", productType)
	}

	// Count total records
	if err := db.Count(&total).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count products", err.Error())
		return
	}

	// Apply sorting and pagination
	db = db.Order(sort + " " + order).Offset((page - 1) * limit).Limit(limit)

	// Fetch products
	if err := db.Preload("Category").Find(&products).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to retrieve products", err.Error())
		return
	}

	// Return response
	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func GetProduct(c *gin.Context) {
	id := c.Param("id")
	productUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid product ID", err.Error())
		return
	}
	
	var product models.Product
	err = config.DB.
		Preload("Category").
		Where("id = ? AND is_active = ?", productUUID, true).
		First(&product).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Product not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch product", err.Error())
		}
		return
	}
	
	utils.SuccessResponse(c, "Product retrieved successfully", product)
}

// GetFeaturedProducts الحصول على المنتجات المميزة
func GetFeaturedProducts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 || limit > 50 {
		limit = 10
	}
	
	var products []models.Product
	err := config.DB.
		Preload("Category").
		Where("is_active = ? AND is_featured = ?", true, true).
		Order("created_at DESC").
		Limit(limit).
		Find(&products).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch featured products", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Featured products retrieved successfully", products)
}

// SearchProducts البحث في المنتجات
func SearchProducts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		utils.BadRequestResponse(c, "Search query is required", "")
		return
	}
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	searchTerm := "%" + strings.ToLower(query) + "%"
	
	// حساب العدد الإجمالي
	var total int64
	config.DB.Model(&models.Product{}).
		Where("is_active = ? AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(brand) LIKE ?)",
			true, searchTerm, searchTerm, searchTerm).
		Count(&total)
	
	// البحث في المنتجات
	var products []models.Product
	err := config.DB.
		Preload("Category").
		Where("is_active = ? AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(brand) LIKE ?)",
			true, searchTerm, searchTerm, searchTerm).
		Order("name ASC").
		Limit(limit).
		Offset(offset).
		Find(&products).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to search products", err.Error())
		return
	}
	
	pagination := utils.CalculatePagination(page, limit, total)
	utils.PaginatedSuccessResponse(c, "Search results retrieved successfully", products, pagination)
}

// GetProductsByCategory الحصول على منتجات فئة معينة
func GetProductsByCategory(c *gin.Context) {
	categoryID := c.Param("id")
	categoryUUID, err := uuid.Parse(categoryID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid category ID", err.Error())
		return
	}
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	// التحقق من وجود الفئة
	var category models.Category
	if err := config.DB.Where("id = ? AND is_active = ?", categoryUUID, true).First(&category).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Category not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch category", err.Error())
		}
		return
	}
	
	// حساب العدد الإجمالي
	var total int64
	config.DB.Model(&models.Product{}).
		Where("category_id = ? AND is_active = ?", categoryUUID, true).
		Count(&total)
	
	// الحصول على المنتجات
	var products []models.Product
	err = config.DB.
		Preload("Category").
		Where("category_id = ? AND is_active = ?", categoryUUID, true).
		Order("name ASC").
		Limit(limit).
		Offset(offset).
		Find(&products).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch products", err.Error())
		return
	}
	
	pagination := utils.CalculatePagination(page, limit, total)
	
	response := gin.H{
		"category": category,
		"products": products,
	}
	
	utils.PaginatedSuccessResponse(c, "Category products retrieved successfully", response, pagination)
}

// GetLowStockProducts الحصول على المنتجات منخفضة المخزون (للإداريين)
func GetLowStockProducts(c *gin.Context) {
	var products []models.Product
	err := config.DB.
		Preload("Category").
		Where("is_active = ? AND stock_quantity <= min_stock_level", true).
		Order("stock_quantity ASC").
		Find(&products).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch low stock products", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Low stock products retrieved successfully", products)
}

// GetExpiringProducts الحصول على المنتجات قاربة الانتهاء (للإداريين)
func GetExpiringProducts(c *gin.Context) {
	var products []models.Product
	err := config.DB.
		Preload("Category").
		Where("is_active = ? AND expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL '30 days'", true).
		Order("expiry_date ASC").
		Find(&products).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch expiring products", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Expiring products retrieved successfully", products)
}

