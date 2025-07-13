package handlers

import (
	"time"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateProductRequest بنية طلب إنشاء منتج جديد
type CreateProductRequest struct {
	Name                string    `json:"name" binding:"required"`
	Description         string    `json:"description"`
	Price               float64   `json:"price" binding:"required,gt=0"`
	DiscountPrice       *float64  `json:"discount_price,omitempty"`
	SKU                 string    `json:"sku" binding:"required"`
	CategoryID          uuid.UUID `json:"category_id" binding:"required"`
	Brand               string    `json:"brand"`
	StockQuantity       int       `json:"stock_quantity" binding:"required,min=0"`
	MinStockLevel       int       `json:"min_stock_level" binding:"min=0"`
	ImageURL            string    `json:"image_url"`
	Images              []string  `json:"images"`
	IsActive            bool      `json:"is_active"`
	IsFeatured          bool      `json:"is_featured"`
	Weight              *float64  `json:"weight,omitempty"`
	Dimensions          *models.Dimensions `json:"dimensions,omitempty"`
	Tags                []string  `json:"tags"`
	
	// حقول خاصة بالأدوية
	ExpiryDate          *time.Time `json:"expiry_date,omitempty"`
	BatchNumber         *string    `json:"batch_number,omitempty"`
	Manufacturer        *string    `json:"manufacturer,omitempty"`
	RequiresPrescription bool      `json:"requires_prescription"`
	ActiveIngredient    *string    `json:"active_ingredient,omitempty"`
	DosageForm          *string    `json:"dosage_form,omitempty"`
	Strength            *string    `json:"strength,omitempty"`
	StorageConditions   *string    `json:"storage_conditions,omitempty"`
	SideEffects         *string    `json:"side_effects,omitempty"`
	Contraindications   *string    `json:"contraindications,omitempty"`
}

// UpdateProductRequest بنية طلب تحديث منتج
type UpdateProductRequest struct {
	Name                *string    `json:"name,omitempty"`
	Description         *string    `json:"description,omitempty"`
	Price               *float64   `json:"price,omitempty" binding:"omitempty,gt=0"`
	DiscountPrice       *float64   `json:"discount_price,omitempty"`
	SKU                 *string    `json:"sku,omitempty"`
	CategoryID          *uuid.UUID `json:"category_id,omitempty"`
	Brand               *string    `json:"brand,omitempty"`
	StockQuantity       *int       `json:"stock_quantity,omitempty" binding:"omitempty,min=0"`
	MinStockLevel       *int       `json:"min_stock_level,omitempty" binding:"omitempty,min=0"`
	ImageURL            *string    `json:"image_url,omitempty"`
	Images              []string   `json:"images,omitempty"`
	IsActive            *bool      `json:"is_active,omitempty"`
	IsFeatured          *bool      `json:"is_featured,omitempty"`
	Weight              *float64   `json:"weight,omitempty"`
	Dimensions          *models.Dimensions `json:"dimensions,omitempty"`
	Tags                []string   `json:"tags,omitempty"`
	
	// حقول خاصة بالأدوية
	ExpiryDate          *time.Time `json:"expiry_date,omitempty"`
	BatchNumber         *string    `json:"batch_number,omitempty"`
	Manufacturer        *string    `json:"manufacturer,omitempty"`
	RequiresPrescription *bool     `json:"requires_prescription,omitempty"`
	ActiveIngredient    *string    `json:"active_ingredient,omitempty"`
	DosageForm          *string    `json:"dosage_form,omitempty"`
	Strength            *string    `json:"strength,omitempty"`
	StorageConditions   *string    `json:"storage_conditions,omitempty"`
	SideEffects         *string    `json:"side_effects,omitempty"`
	Contraindications   *string    `json:"contraindications,omitempty"`
}

// CreateProduct إنشاء منتج جديد (Admin)
func CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	// التحقق من وجود الفئة
	var category models.Category
	if err := config.DB.Where("id = ?", req.CategoryID).First(&category).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Category not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch category", err.Error())
		}
		return
	}
	
	// التحقق من عدم وجود SKU مكرر
	var existingProduct models.Product
	if err := config.DB.Where("sku = ?", req.SKU).First(&existingProduct).Error; err == nil {
		utils.BadRequestResponse(c, "Product with this SKU already exists", "")
		return
	}
	
	product := models.Product{
		Name:                req.Name,
		Description:         req.Description,
		Price:               req.Price,
		DiscountPrice:       req.DiscountPrice,
		SKU:                 req.SKU,
		CategoryID:          req.CategoryID,
		Brand:               req.Brand,
		StockQuantity:       req.StockQuantity,
		MinStockLevel:       req.MinStockLevel,
		ImageURL:            req.ImageURL,
		Images:              req.Images,
		IsActive:            req.IsActive,
		IsFeatured:          req.IsFeatured,
		Weight:              req.Weight,
		Dimensions:          req.Dimensions,
		Tags:                req.Tags,
		ExpiryDate:          req.ExpiryDate,
		BatchNumber:         req.BatchNumber,
		Manufacturer:        req.Manufacturer,
		RequiresPrescription: req.RequiresPrescription,
		ActiveIngredient:    req.ActiveIngredient,
		DosageForm:          req.DosageForm,
		Strength:            req.Strength,
		StorageConditions:   req.StorageConditions,
		SideEffects:         req.SideEffects,
		Contraindications:   req.Contraindications,
	}
	
	if err := config.DB.Create(&product).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to create product", err.Error())
		return
	}
	
	utils.CreatedResponse(c, "Product created successfully", product)
}

// UpdateProduct تحديث منتج موجود (Admin)
func UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	productUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid product ID", err.Error())
		return
	}
	
	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	var product models.Product
	if err := config.DB.Where("id = ?", productUUID).First(&product).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Product not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch product", err.Error())
		}
		return
	}
	
	// تحديث الحقول
	if req.Name != nil {
		product.Name = *req.Name
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.Price != nil {
		product.Price = *req.Price
	}
	if req.DiscountPrice != nil {
		product.DiscountPrice = req.DiscountPrice
	}
	if req.SKU != nil {
		// التحقق من عدم وجود SKU مكرر إذا تم تغييره
		if *req.SKU != product.SKU {
			var existingProduct models.Product
			if err := config.DB.Where("sku = ? AND id <> ?", *req.SKU, product.ID).First(&existingProduct).Error; err == nil {
				utils.BadRequestResponse(c, "Product with this SKU already exists", "")
				return
			}
		}
		product.SKU = *req.SKU
	}
	if req.CategoryID != nil {
		// التحقق من وجود الفئة الجديدة
		var category models.Category
		if err := config.DB.Where("id = ?", *req.CategoryID).First(&category).Error; err != nil {
			utils.NotFoundResponse(c, "Category not found")
			return
		}
		product.CategoryID = *req.CategoryID
	}
	if req.Brand != nil {
		product.Brand = *req.Brand
	}
	if req.StockQuantity != nil {
		product.StockQuantity = *req.StockQuantity
	}
	if req.MinStockLevel != nil {
		product.MinStockLevel = *req.MinStockLevel
	}
	if req.ImageURL != nil {
		product.ImageURL = *req.ImageURL
	}
	if req.Images != nil {
		product.Images = req.Images
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}
	if req.IsFeatured != nil {
		product.IsFeatured = *req.IsFeatured
	}
	if req.Weight != nil {
		product.Weight = req.Weight
	}
	if req.Dimensions != nil {
		product.Dimensions = req.Dimensions
	}
	if req.Tags != nil {
		product.Tags = req.Tags
	}
	
	// حقول خاصة بالأدوية
	if req.ExpiryDate != nil {
		product.ExpiryDate = req.ExpiryDate
	}
	if req.BatchNumber != nil {
		product.BatchNumber = req.BatchNumber
	}
	if req.Manufacturer != nil {
		product.Manufacturer = req.Manufacturer
	}
	if req.RequiresPrescription != nil {
		product.RequiresPrescription = *req.RequiresPrescription
	}
	if req.ActiveIngredient != nil {
		product.ActiveIngredient = req.ActiveIngredient
	}
	if req.DosageForm != nil {
		product.DosageForm = req.DosageForm
	}
	if req.Strength != nil {
		product.Strength = req.Strength
	}
	if req.StorageConditions != nil {
		product.StorageConditions = req.StorageConditions
	}
	if req.SideEffects != nil {
		product.SideEffects = req.SideEffects
	}
	if req.Contraindications != nil {
		product.Contraindications = req.Contraindications
	}
	
	if err := config.DB.Save(&product).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update product", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Product updated successfully", product)
}

// DeleteProduct حذف منتج (Admin)
func DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	productUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid product ID", err.Error())
		return
	}
	
	result := config.DB.Delete(&models.Product{}, productUUID)
	if result.Error != nil {
		utils.InternalServerErrorResponse(c, "Failed to delete product", result.Error.Error())
		return
	}
	
	if result.RowsAffected == 0 {
		utils.NotFoundResponse(c, "Product not found")
		return
	}
	
	utils.SuccessResponse(c, "Product deleted successfully", nil)
}

