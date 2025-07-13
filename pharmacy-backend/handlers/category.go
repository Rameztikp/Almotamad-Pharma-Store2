package handlers

import (
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetCategories الحصول على جميع الفئات
func GetCategories(c *gin.Context) {
	var categories []models.Category
	err := config.DB.
		Where("is_active = ?", true).
		Order("sort_order ASC, name ASC").
		Find(&categories).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch categories", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Categories retrieved successfully", categories)
}

// GetCategory الحصول على فئة محددة
func GetCategory(c *gin.Context) {
	id := c.Param("id")
	categoryUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid category ID", err.Error())
		return
	}
	
	var category models.Category
	err = config.DB.
		Where("id = ? AND is_active = ?", categoryUUID, true).
		First(&category).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Category not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch category", err.Error())
		}
		return
	}
	
	utils.SuccessResponse(c, "Category retrieved successfully", category)
}

// GetCategoryWithProducts الحصول على فئة مع منتجاتها
func GetCategoryWithProducts(c *gin.Context) {
	id := c.Param("id")
	categoryUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid category ID", err.Error())
		return
	}
	
	var category models.Category
	err = config.DB.
		Preload("Products", "is_active = ?", true).
		Where("id = ? AND is_active = ?", categoryUUID, true).
		First(&category).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Category not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch category", err.Error())
		}
		return
	}
	
	utils.SuccessResponse(c, "Category with products retrieved successfully", category)
}

