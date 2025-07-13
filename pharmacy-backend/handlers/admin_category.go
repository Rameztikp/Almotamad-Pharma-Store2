package handlers

import (
	"net/http"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateCategoryRequest بنية طلب إنشاء فئة جديدة
type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
	IsActive    bool   `json:"is_active"`
	SortOrder   int    `json:"sort_order"`
}

// UpdateCategoryRequest بنية طلب تحديث فئة
type UpdateCategoryRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	ImageURL    *string `json:"image_url,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
	SortOrder   *int    `json:"sort_order,omitempty"`
}

// CreateCategory إنشاء فئة جديدة (Admin)
func CreateCategory(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات الطلب غير صالحة", "details": err.Error()})
		return
	}
	
	// التحقق من عدم وجود فئة بنفس الاسم
	var existingCategory models.Category
	if err := config.DB.Where("name = ?", req.Name).First(&existingCategory).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يوجد فئة بهذا الاسم مسبقاً"})
		return
	}
	
	category := models.Category{
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		IsActive:    req.IsActive,
		SortOrder:   req.SortOrder,
	}

	if err := config.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل في إنشاء الفئة", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "تم إنشاء الفئة بنجاح",
		"data":    category,
	})
}

// UpdateCategory تحديث فئة موجودة (Admin)
func UpdateCategory(c *gin.Context) {
	categoryID := c.Param("id")
	if _, err := uuid.Parse(categoryID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "معرف الفئة غير صالح"})
		return
	}

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات الطلب غير صالحة", "details": err.Error()})
		return
	}

	// البحث عن الفئة الحالية
	var category models.Category
	if err := config.DB.First(&category, "id = ?", categoryID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "الفئة غير موجودة"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل في جلب بيانات الفئة", "details": err.Error()})
		}
		return
	}

	// تحديث الحقول المطلوبة
	updates := make(map[string]interface{})
	if req.Name != nil {
		// التحقق من عدم وجود فئة بنفس الاسم إذا تم تغييره
		if *req.Name != category.Name {
			var existingCategory models.Category
			if err := config.DB.Where("name = ? AND id <> ?", *req.Name, category.ID).First(&existingCategory).Error; err == nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "يوجد فئة بهذا الاسم مسبقاً"})
				return
			}
		}
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	if err := config.DB.Model(&category).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل في تحديث الفئة", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "تم تحديث الفئة بنجاح",
		"data":    category,
	})
}

// DeleteCategory حذف فئة (Admin)
func DeleteCategory(c *gin.Context) {
	categoryID := c.Param("id")
	if _, err := uuid.Parse(categoryID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "معرف الفئة غير صالح"})
		return
	}

	// التحقق من وجود الفئة
	var category models.Category
	if err := config.DB.First(&category, "id = ?", categoryID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "الفئة غير موجودة"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "فشل في جلب بيانات الفئة",
				"details": err.Error(),
			})
		}
		return
	}

	// التحقق من وجود منتجات مرتبطة بهذه الفئة
	var productCount int64
	if err := config.DB.Model(&models.Product{}).Where("category_id = ?", categoryID).Count(&productCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل في التحقق من المنتجات المرتبطة",
			"details": err.Error(),
		})
		return
	}

	if productCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "لا يمكن حذف الفئة لأنها تحتوي على منتجات",
			"product_count": productCount,
		})
		return
	}

	// حذف الفئة
	if err := config.DB.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل في حذف الفئة",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "تم حذف الفئة بنجاح",
	})
}
