package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"

	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateProductRequest بنية طلب إنشاء منتج جديد
type CreateProductRequest struct {
	Name                string      `json:"name" binding:"required"`
	Type                string      `json:"type" binding:"required,oneof=retail wholesale"`
	Description         string    `json:"description"`
	Price               float64   `json:"price" binding:"required,gt=0"`
	DiscountPrice       *float64  `json:"discount_price,omitempty"`
	SKU                 string    `json:"sku" binding:"required"`
	CategoryID          string    `json:"category_id" binding:"required"`
	Brand               string    `json:"brand"`
	StockQuantity       int       `json:"stock_quantity" binding:"required,min=0"`
	MinStockLevel       int       `json:"min_stock_level" binding:"min=0"`
	ImageURL            string    `json:"image_url"`
	Images              []string  `json:"images"`
	IsActive            *bool     `json:"is_active,omitempty"`
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
		log.Printf("[ERROR] Failed to bind JSON in CreateProduct: %v", err)
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	log.Printf("[DEBUG] CreateProduct request: %+v", req)
	
	// Parse CategoryID string to UUID
	categoryUUID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid category ID format", err.Error())
		return
	}
	
	// التحقق من وجود الفئة
	var category models.Category
	if err := config.DB.Where("id = ?", categoryUUID).First(&category).Error; err != nil {
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
	
	// Convert string type to ProductType
	productType := models.ProductType(req.Type)
	
	product := models.Product{
		Name:                req.Name,
		Type:                productType,
		Description:         req.Description,
		Price:               req.Price,
		DiscountPrice:       req.DiscountPrice,
		SKU:                 req.SKU,
		CategoryID:          categoryUUID,
		Brand:               req.Brand,
		StockQuantity:       req.StockQuantity,
		MinStockLevel:       req.MinStockLevel,
		ImageURL:            req.ImageURL,
		Images:              req.Images,
		IsActive:            true,
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
	
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}
	
	log.Printf("[DEBUG] About to create product: %+v", product)
	if err := config.DB.Create(&product).Error; err != nil {
		log.Printf("[ERROR] Failed to create product in database: %v", err)
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
        utils.BadRequestResponse(c, "معرّف المنتج غير صالح", err.Error())
        return
    }

    // قراءة وتحقق من حقول الطلب
    body, err := io.ReadAll(c.Request.Body)
    if err != nil {
        utils.BadRequestResponse(c, "فشل في قراءة بيانات الطلب", err.Error())
        return
    }
    
    // التحقق من وجود حقول النشر في الطلب
    var rawRequest map[string]interface{}
    if err := json.Unmarshal(body, &rawRequest); err != nil {
        utils.BadRequestResponse(c, "تنسيق JSON غير صالح", err.Error())
        return
    }
    
    // التحقق من وجود حقول النشر في الطلب (حتى لو كانت null)
    if _, exists := rawRequest["published_retail"]; exists {
        utils.BadRequestResponse(c, 
            "لا يمكن تعديل حالة النشر من هنا", 
            "استخدم endpoint خاص للنشر أو الإلغاء")
        return
    }
    if _, exists := rawRequest["published_wholesale"]; exists {
        utils.BadRequestResponse(c, 
            "لا يمكن تعديل حالة النشر من هنا", 
            "استخدم endpoint خاص للنشر أو الإلغاء")
        return
    }
    
    // إعادة تعيين body للطلب للسماح بالقراءة مرة أخرى
    c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
    
    var req UpdateProductRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.BadRequestResponse(c, "بيانات الطلب غير صالحة", err.Error())
        return
    }
    
    // التحقق من وجود المنتج
    var product models.Product
    if err := config.DB.Where("id = ?", productUUID).First(&product).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            utils.NotFoundResponse(c, "المنتج غير موجود")
        } else {
            utils.InternalServerErrorResponse(c, "فشل في جلب بيانات المنتج", err.Error())
        }
        return
    }
    
    // تحديث الحقول المسموح بها فقط
    updates := make(map[string]interface{})
    
    // الحقول المسموح بتحديثها
    allowedFields := map[string]bool{
        "name":                  true,
        "description":           true,
        "price":                 true,
        "discount_price":        true,
        "sku":                   true,
        "category_id":           true,
        "brand":                 true,
        "stock_quantity":        true,
        "expiry_date":           true,
        "image_url":             true,
        "images":                true, // السماح بتحديث الصور المتعددة
        "manufacturer":          true,
        "active_ingredient":     true,
        "dosage_form":           true,
        "strength":              true,
        "storage_conditions":    true,
        "side_effects":          true,
        "contraindications":     true,
        "is_active":             true,
        "batch_number":          true,
    }
    
    // تحديث الحقول المسموح بها فقط
    if req.Name != nil && allowedFields["name"] {
        updates["name"] = *req.Name
    }
    if req.Description != nil && allowedFields["description"] {
        updates["description"] = *req.Description
    }
    if req.Price != nil && allowedFields["price"] {
        updates["price"] = *req.Price
    }
    if req.DiscountPrice != nil && allowedFields["discount_price"] {
        updates["discount_price"] = req.DiscountPrice
    }
    if req.SKU != nil && *req.SKU != product.SKU && allowedFields["sku"] {
        // التحقق من عدم وجود SKU مكرر
        var count int64
        if err := config.DB.Model(&models.Product{}).Where("sku = ? AND id != ?", *req.SKU, product.ID).Count(&count).Error; err != nil {
            utils.InternalServerErrorResponse(c, "فشل في التحقق من رقم SKU", err.Error())
            return
        }
        if count > 0 {
            utils.BadRequestResponse(c, "رقم SKU مستخدم مسبقاً", "")
            return
        }
        updates["sku"] = *req.SKU
    }
    if req.CategoryID != nil && allowedFields["category_id"] {
        // التحقق من وجود الفئة
        var category models.Category
        if err := config.DB.First(&category, *req.CategoryID).Error; err != nil {
            if err == gorm.ErrRecordNotFound {
                utils.NotFoundResponse(c, "الفئة غير موجودة")
            } else {
                utils.InternalServerErrorResponse(c, "فشل في التحقق من الفئة", err.Error())
            }
            return
        }
        updates["category_id"] = *req.CategoryID
    }
    if req.Brand != nil && allowedFields["brand"] {
        updates["brand"] = *req.Brand
    }
    if req.StockQuantity != nil && allowedFields["stock_quantity"] {
        updates["stock_quantity"] = *req.StockQuantity
    }
    if req.IsActive != nil && allowedFields["is_active"] {
        updates["is_active"] = *req.IsActive
    }
    if req.ExpiryDate != nil && allowedFields["expiry_date"] {
        updates["expiry_date"] = req.ExpiryDate
    }
    if req.BatchNumber != nil && allowedFields["batch_number"] {
        updates["batch_number"] = req.BatchNumber
    }
    if req.Manufacturer != nil && allowedFields["manufacturer"] {
        updates["manufacturer"] = req.Manufacturer
    }
    if req.ActiveIngredient != nil && allowedFields["active_ingredient"] {
        updates["active_ingredient"] = req.ActiveIngredient
    }
    if req.DosageForm != nil && allowedFields["dosage_form"] {
        updates["dosage_form"] = req.DosageForm
    }
    if req.Strength != nil && allowedFields["strength"] {
        updates["strength"] = req.Strength
    }
    if req.StorageConditions != nil && allowedFields["storage_conditions"] {
        updates["storage_conditions"] = req.StorageConditions
    }
    if req.SideEffects != nil && allowedFields["side_effects"] {
        updates["side_effects"] = req.SideEffects
    }
    if req.Contraindications != nil && allowedFields["contraindications"] {
        updates["contraindications"] = req.Contraindications
    }
    if req.ImageURL != nil && allowedFields["image_url"] {
        updates["image_url"] = *req.ImageURL
    }
    if req.Images != nil && allowedFields["images"] {
        updates["images"] = req.Images
    }
    
    // تحديث الحقول المعدلة فقط
    if len(updates) > 0 {
        updates["updated_at"] = time.Now()
        if err := config.DB.Model(&product).Updates(updates).Error; err != nil {
            utils.InternalServerErrorResponse(c, "فشل في تحديث المنتج", err.Error())
            return
        }
    }
    
    // جلب بيانات المنتج المحدثة
    var updatedProduct models.Product
    if err := config.DB.Preload("Category").First(&updatedProduct, product.ID).Error; err != nil {
        utils.InternalServerErrorResponse(c, "فشل في جلب بيانات المنتج المحدثة", err.Error())
        return
    }
    
    utils.SuccessResponse(c, "تم تحديث المنتج بنجاح", updatedProduct)
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

// ProductStatusRequest بنية طلب تغيير حالة المنتج
type ProductStatusRequest struct {
	Type     string `json:"type" binding:"required"`
	Action   string `json:"action" binding:"required"`
}

// UpdateProductStatus handles both activation and deactivation of products
// @Summary تفعيل/تعطيل منتج
// @Description تغيير حالة المنتج (نشط/غير نشط) في واجهة البيع بالجملة أو التجزئة
// @Tags المنتجات - إدارة
// @Accept json
// @Produce json
// @Param id path string true "معرف المنتج"
// @Param input body ProductStatusRequest true "بيانات الطلب"
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /admin/products/{id}/status [patch]
func UpdateProductStatus(c *gin.Context) {
	// Get user ID and role from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "معلومات المستخدم غير متوفرة")
		return
	}

	// Log the action attempt
	log.Printf("[DEBUG] User %s is attempting to change product status", userID)

	// Parse product ID
	id := c.Param("id")
	productUUID, err := uuid.Parse(id)
	if err != nil {
		log.Printf("[ERROR] Invalid product ID '%s': %v", id, err)
		utils.BadRequestResponse(c, "معرّف المنتج غير صالح", err.Error())
		return
	}

	// Debug: Log headers
	headers := c.Request.Header
	log.Printf("[DEBUG] Request Headers: %+v", headers)

	// Read the raw request body for debugging
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("[ERROR] Failed to read request body: %v", err)
		utils.InternalServerErrorResponse(c, "فشل في قراءة بيانات الطلب", err.Error())
		return
	}

	// Log the raw request body
	log.Printf("[DEBUG] Raw request body: %s", string(bodyBytes))

	// Restore the request body for binding
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Parse request body
	var req ProductStatusRequest
	
	// First, try to bind JSON normally
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] Failed to bind JSON: %v", err)
		log.Printf("[DEBUG] Request Content-Type: %s", c.GetHeader("Content-Type"))
		log.Printf("[DEBUG] Request body that failed to bind: %s", string(bodyBytes))
		
		// If binding fails, try to manually parse JSON
		if jsonErr := json.Unmarshal(bodyBytes, &req); jsonErr != nil {
			log.Printf("[ERROR] Failed to manually parse JSON: %v", jsonErr)
			
			// Try to get more detailed error information
			var syntaxErr *json.SyntaxError
			if errors.As(jsonErr, &syntaxErr) {
				errMsg := fmt.Sprintf("خطأ في تنسيق JSON: %v", syntaxErr.Error())
				utils.BadRequestResponse(c, "تنسيق JSON غير صالح", errMsg)
				return
			}
			
			utils.BadRequestResponse(c, "بيانات الطلب غير صالحة", jsonErr.Error())
			return
		}
	}

	log.Printf("[DEBUG] Successfully parsed request: %+v", req)

	// Normalize and validate type and action
	req.Type = strings.TrimSpace(strings.ToLower(req.Type))
	req.Action = strings.TrimSpace(strings.ToLower(req.Action))

	log.Printf("[DEBUG] After normalization - Type: '%s', Action: '%s'", req.Type, req.Action)

	// Validate type
	if req.Type != "retail" && req.Type != "wholesale" {
		errMsg := fmt.Sprintf("نوع المنتج غير صالح: '%s'، يجب أن يكون إما retail أو wholesale", req.Type)
		log.Printf("[VALIDATION ERROR] %s", errMsg)
		utils.BadRequestResponse(c, "نوع المنتج غير صالح", errMsg)
		return
	}

	// Validate action
	if req.Action != "activate" && req.Action != "deactivate" {
		errMsg := fmt.Sprintf("الإجراء غير صالح: '%s'، يجب أن يكون الإجراء إما activate أو deactivate", req.Action)
		log.Printf("[VALIDATION ERROR] %s", errMsg)
		utils.BadRequestResponse(c, "الإجراء غير صالح", errMsg)
		return
	}

	// Start database transaction
	tx := config.DB.Begin()
	if tx.Error != nil {
		utils.InternalServerErrorResponse(c, "فشل في بدء المعاملة", tx.Error.Error())
		return
	}

	// Get the product with row lock to prevent concurrent updates
	var product models.Product
	if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&product, productUUID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "المنتج غير موجود")
			return
		}
		utils.InternalServerErrorResponse(c, "فشل في جلب بيانات المنتج", err.Error())
		return
	}

	// Check current status and requested action
	isActivating := req.Action == "activate"
	isWholesale := req.Type == "wholesale"
	
	// Check if the product is already in the requested state
	var currentStatus bool
	var statusField string
	if isWholesale {
		currentStatus = product.PublishedWholesale
		statusField = "published_wholesale"
	} else {
		currentStatus = product.PublishedRetail
		statusField = "published_retail"
	}

	if currentStatus == isActivating {
		tx.Rollback()
		statusMsg := "منشور"
		if !isActivating {
			statusMsg = "غير منشور"
		}
		
		utils.SuccessResponse(c, "حالة المنتج لم تتغير", gin.H{
			"success": true,
			"already_" + req.Action + "d": true,
			"message":  "المنتج " + statusMsg + " مسبقاً في واجهة " + map[bool]string{true: "الجملة", false: "التجزئة"}[isWholesale],
		})
		return
	}

	// Update the appropriate published status
	updateData := map[string]interface{}{
		statusField:      isActivating,
		"updated_at":     time.Now(),
	}

	// Save the changes
	if err := tx.Model(&product).Updates(updateData).Error; err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في تحديث حالة المنتج", err.Error())
		return
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerErrorResponse(c, "فشل في حفظ التغييرات", err.Error())
		return
	}

	// Log the successful status change
	action := "نشر"
	if !isActivating {
		action = "إيقاف نشر"
	}
	
	log.Printf("User %s has %s product %s in %s", 
		userID, 
		action,
		product.Name,
		map[bool]string{true: "wholesale", false: "retail"}[isWholesale],
	)

	// Refresh product data
	if err := config.DB.First(&product, productUUID).Error; err != nil {
		log.Printf("Warning: Failed to refresh product data: %v", err)
	}

	// Return success response
	statusMsg := "تم النشر بنجاح"
	if !isActivating {
		statusMsg = "تم إيقاف النشر بنجاح"
	}

	utils.SuccessResponse(c, statusMsg, gin.H{
		"success": true,
		"message": statusMsg + " في واجهة " + map[bool]string{true: "الجملة", false: "التجزئة"}[isWholesale],
		"product": gin.H{
			"id":                  product.ID,
			"name":                product.Name,
			"published_retail":    product.PublishedRetail,
			"published_wholesale": product.PublishedWholesale,
			"updated_at":          product.UpdatedAt,
		},
	})
}

// UploadProductImage handles image uploads for products to Cloudinary. Admin only.
func UploadProductImage(c *gin.Context) {
	log.Print("[INFO] Product image upload request received")

	// Check if Cloudinary is configured
	if config.Cld == nil {
		log.Print("[ERROR] Cloudinary is not configured")
		utils.InternalServerErrorResponse(c, "Cloudinary is not configured", "")
		return
	}

	file, err := c.FormFile("image")
	if err != nil {
		log.Printf("[ERROR] Image not provided in form: %v", err)
		utils.BadRequestResponse(c, "Image not provided", err.Error())
		return
	}
	log.Printf("[INFO] Image file received: %s (size: %d bytes)", file.Filename, file.Size)

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		log.Printf("[ERROR] Failed to open uploaded file: %v", err)
		utils.InternalServerErrorResponse(c, "Failed to open uploaded file", err.Error())
		return
	}
	defer src.Close()

	// Upload the file to Cloudinary
	uploadParams := uploader.UploadParams{
		Folder: "pharmacy-backend/products", // Organize product uploads
	}
	log.Print("[INFO] Uploading product image to Cloudinary...")

	uploadResult, err := config.Cld.Upload.Upload(context.Background(), src, uploadParams)
	if err != nil {
		log.Printf("[ERROR] Failed to upload image to Cloudinary: %v", err)
		utils.InternalServerErrorResponse(c, "Failed to upload image to Cloudinary", err.Error())
		return
	}
	log.Printf("[INFO] Image uploaded successfully: %s", uploadResult.SecureURL)

	// Return the secure URL of the uploaded image
	c.JSON(http.StatusOK, gin.H{"image_url": uploadResult.SecureURL})
}