package handlers

import (
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AddToFavoritesRequest بنية طلب إضافة للمفضلة
type AddToFavoritesRequest struct {
	ProductID uuid.UUID `json:"product_id" binding:"required"`
}

// GetFavorites الحصول على قائمة المفضلة للمستخدم
func GetFavorites(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	var favorites []models.Favorite
	err := config.DB.
		Preload("Product").
		Preload("Product.Category").
		Where("user_id = ?", userID).Find(&favorites).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch favorites", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Favorites retrieved successfully", favorites)
}

// AddToFavorites إضافة منتج للمفضلة
func AddToFavorites(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	var req AddToFavoritesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	// التحقق من وجود المنتج
	var product models.Product
	if err := config.DB.Where("id = ? AND is_active = ?", req.ProductID, true).First(&product).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Product not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch product", err.Error())
		}
		return
	}
	
	// التحقق مما إذا كان المنتج موجودًا بالفعل في المفضلة
	var existingFavorite models.Favorite
	err := config.DB.Where("user_id = ? AND product_id = ?", userID, req.ProductID).First(&existingFavorite).Error
	if err == nil {
		utils.BadRequestResponse(c, "Product already in favorites", "")
		return
	}
	
	if err != gorm.ErrRecordNotFound {
		utils.InternalServerErrorResponse(c, "Failed to check existing favorite", err.Error())
		return
	}
	
	// إضافة المنتج للمفضلة
	favorite := models.Favorite{
		UserID:    userID.(uuid.UUID),
		ProductID: req.ProductID,
	}
	
	if err := config.DB.Create(&favorite).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to add product to favorites", err.Error())
		return
	}
	
	utils.CreatedResponse(c, "Product added to favorites successfully", favorite)
}

// RemoveFromFavorites حذف منتج من المفضلة
func RemoveFromFavorites(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	productID := c.Param("product_id")
	productUUID, err := uuid.Parse(productID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid product ID", err.Error())
		return
	}
	
	result := config.DB.Where("user_id = ? AND product_id = ?", userID, productUUID).Delete(&models.Favorite{})
	if result.Error != nil {
		utils.InternalServerErrorResponse(c, "Failed to remove product from favorites", result.Error.Error())
		return
	}
	
	if result.RowsAffected == 0 {
		utils.NotFoundResponse(c, "Product not found in favorites")
		return
	}
	
	utils.SuccessResponse(c, "Product removed from favorites successfully", nil)
}

