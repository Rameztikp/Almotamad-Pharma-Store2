package handlers

import (
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AddToCartRequest بنية طلب إضافة للسلة
type AddToCartRequest struct {
	ProductID uuid.UUID `json:"product_id" binding:"required"`
	Quantity  int       `json:"quantity" binding:"required,min=1"`
}

// UpdateCartItemRequest بنية طلب تحديث عنصر السلة
type UpdateCartItemRequest struct {
	Quantity int `json:"quantity" binding:"required,min=1"`
}

// GetCart الحصول على سلة التسوق
func GetCart(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	var cartItems []models.CartItem
	err := config.DB.
		Preload("Product").
		Preload("Product.Category").
		Where("user_id = ?", userID).
		Find(&cartItems).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch cart", err.Error())
		return
	}
	
	// حساب الإجماليات
	var subtotal float64
	for _, item := range cartItems {
		subtotal += item.GetTotalPrice()
	}
	
	response := gin.H{
		"items":    cartItems,
		"subtotal": subtotal,
		"count":    len(cartItems),
	}
	
	utils.SuccessResponse(c, "Cart retrieved successfully", response)
}

// AddToCart إضافة منتج للسلة
func AddToCart(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	var req AddToCartRequest
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
	
	// التحقق من توفر المنتج في المخزون
	if product.StockQuantity < req.Quantity {
		utils.BadRequestResponse(c, "Insufficient stock", "Not enough quantity available")
		return
	}
	
	// التحقق من وجود المنتج في السلة مسبقاً
	var existingItem models.CartItem
	err := config.DB.Where("user_id = ? AND product_id = ?", userID, req.ProductID).First(&existingItem).Error
	
	if err == nil {
		// تحديث الكمية إذا كان المنتج موجود
		newQuantity := existingItem.Quantity + req.Quantity
		if product.StockQuantity < newQuantity {
			utils.BadRequestResponse(c, "Insufficient stock", "Not enough quantity available")
			return
		}
		
		existingItem.Quantity = newQuantity
		if err := config.DB.Save(&existingItem).Error; err != nil {
			utils.InternalServerErrorResponse(c, "Failed to update cart item", err.Error())
			return
		}
		
		// تحميل بيانات المنتج
		config.DB.Preload("Product").Preload("Product.Category").First(&existingItem, existingItem.ID)
		
		utils.SuccessResponse(c, "Cart item updated successfully", existingItem)
		return
	}
	
	// إضافة منتج جديد للسلة
	cartItem := models.CartItem{
		UserID:    userID.(uuid.UUID),
		ProductID: req.ProductID,
		Quantity:  req.Quantity,
	}
	
	if err := config.DB.Create(&cartItem).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to add item to cart", err.Error())
		return
	}
	
	// تحميل بيانات المنتج
	config.DB.Preload("Product").Preload("Product.Category").First(&cartItem, cartItem.ID)
	
	utils.CreatedResponse(c, "Item added to cart successfully", cartItem)
}

// UpdateCartItem تحديث عنصر في السلة
func UpdateCartItem(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	itemID := c.Param("id")
	itemUUID, err := uuid.Parse(itemID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid item ID", err.Error())
		return
	}
	
	var req UpdateCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	// البحث عن العنصر
	var cartItem models.CartItem
	err = config.DB.
		Preload("Product").
		Where("id = ? AND user_id = ?", itemUUID, userID).
		First(&cartItem).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Cart item not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch cart item", err.Error())
		}
		return
	}
	
	// التحقق من توفر المنتج في المخزون
	if cartItem.Product.StockQuantity < req.Quantity {
		utils.BadRequestResponse(c, "Insufficient stock", "Not enough quantity available")
		return
	}
	
	// تحديث الكمية
	cartItem.Quantity = req.Quantity
	if err := config.DB.Save(&cartItem).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update cart item", err.Error())
		return
	}
	
	// تحميل بيانات المنتج المحدثة
	config.DB.Preload("Product").Preload("Product.Category").First(&cartItem, cartItem.ID)
	
	utils.SuccessResponse(c, "Cart item updated successfully", cartItem)
}

// RemoveFromCart حذف عنصر من السلة
func RemoveFromCart(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	itemID := c.Param("id")
	itemUUID, err := uuid.Parse(itemID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid item ID", err.Error())
		return
	}
	
	// حذف العنصر
	result := config.DB.Where("id = ? AND user_id = ?", itemUUID, userID).Delete(&models.CartItem{})
	if result.Error != nil {
		utils.InternalServerErrorResponse(c, "Failed to remove item from cart", result.Error.Error())
		return
	}
	
	if result.RowsAffected == 0 {
		utils.NotFoundResponse(c, "Cart item not found")
		return
	}
	
	utils.SuccessResponse(c, "Item removed from cart successfully", nil)
}

// ClearCart إفراغ السلة
func ClearCart(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	if err := config.DB.Where("user_id = ?", userID).Delete(&models.CartItem{}).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to clear cart", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Cart cleared successfully", nil)
}

