package handlers

import (
	"strconv"
	"time"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateCouponRequest بنية طلب إنشاء كوبون جديد
type CreateCouponRequest struct {
	Code              string             `json:"code" binding:"required"`
	Type              models.CouponType  `json:"type" binding:"required,oneof=percentage fixed_amount"`
	Value             float64            `json:"value" binding:"required,gt=0"`
	MinOrderAmount    float64            `json:"min_order_amount"`
	MaxDiscountAmount *float64           `json:"max_discount_amount,omitempty"`
	UsageLimit        *int               `json:"usage_limit,omitempty"`
	IsActive          bool               `json:"is_active"`
	ValidFrom         time.Time          `json:"valid_from" binding:"required"`
	ValidUntil        time.Time          `json:"valid_until" binding:"required"`
}

// UpdateCouponRequest بنية طلب تحديث كوبون
type UpdateCouponRequest struct {
	Code              *string            `json:"code,omitempty"`
	Type              *models.CouponType `json:"type,omitempty" binding:"omitempty,oneof=percentage fixed_amount"`
	Value             *float64           `json:"value,omitempty" binding:"omitempty,gt=0"`
	MinOrderAmount    *float64           `json:"min_order_amount,omitempty"`
	MaxDiscountAmount *float64           `json:"max_discount_amount,omitempty"`
	UsageLimit        *int               `json:"usage_limit,omitempty"`
	IsActive          *bool              `json:"is_active,omitempty"`
	ValidFrom         *time.Time         `json:"valid_from,omitempty"`
	ValidUntil        *time.Time         `json:"valid_until,omitempty"`
}

// CreateCoupon إنشاء كوبون جديد (Admin)
func CreateCoupon(c *gin.Context) {
	var req CreateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	// التحقق من عدم وجود كوبون بنفس الكود
	var existingCoupon models.Coupon
	if err := config.DB.Where("code = ?", req.Code).First(&existingCoupon).Error; err == nil {
		utils.BadRequestResponse(c, "Coupon with this code already exists", "")
		return
	}
	
	coupon := models.Coupon{
		Code:              req.Code,
		Type:              req.Type,
		Value:             req.Value,
		MinOrderAmount:    req.MinOrderAmount,
		MaxDiscountAmount: req.MaxDiscountAmount,
		UsageLimit:        req.UsageLimit,
		IsActive:          req.IsActive,
		ValidFrom:         req.ValidFrom,
		ValidUntil:        req.ValidUntil,
	}
	
	if err := config.DB.Create(&coupon).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to create coupon", err.Error())
		return
	}
	
	utils.CreatedResponse(c, "Coupon created successfully", coupon)
}

// UpdateCoupon تحديث كوبون موجود (Admin)
func UpdateCoupon(c *gin.Context) {
	id := c.Param("id")
	couponUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid coupon ID", err.Error())
		return
	}
	
	var req UpdateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	var coupon models.Coupon
	if err := config.DB.Where("id = ?", couponUUID).First(&coupon).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Coupon not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch coupon", err.Error())
		}
		return
	}
	
	// تحديث الحقول
	if req.Code != nil {
		// التحقق من عدم وجود كوبون بنفس الكود إذا تم تغييره
		if *req.Code != coupon.Code {
			var existingCoupon models.Coupon
			if err := config.DB.Where("code = ? AND id <> ?", *req.Code, coupon.ID).First(&existingCoupon).Error; err == nil {
				utils.BadRequestResponse(c, "Coupon with this code already exists", "")
				return
			}
		}
		coupon.Code = *req.Code
	}
	if req.Type != nil {
		coupon.Type = *req.Type
	}
	if req.Value != nil {
		coupon.Value = *req.Value
	}
	if req.MinOrderAmount != nil {
		coupon.MinOrderAmount = *req.MinOrderAmount
	}
	if req.MaxDiscountAmount != nil {
		coupon.MaxDiscountAmount = req.MaxDiscountAmount
	}
	if req.UsageLimit != nil {
		coupon.UsageLimit = req.UsageLimit
	}
	if req.IsActive != nil {
		coupon.IsActive = *req.IsActive
	}
	if req.ValidFrom != nil {
		coupon.ValidFrom = *req.ValidFrom
	}
	if req.ValidUntil != nil {
		coupon.ValidUntil = *req.ValidUntil
	}
	
	if err := config.DB.Save(&coupon).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update coupon", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Coupon updated successfully", coupon)
}

// DeleteCoupon حذف كوبون (Admin)
func DeleteCoupon(c *gin.Context) {
	id := c.Param("id")
	couponUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid coupon ID", err.Error())
		return
	}
	
	result := config.DB.Delete(&models.Coupon{}, couponUUID)
	if result.Error != nil {
		utils.InternalServerErrorResponse(c, "Failed to delete coupon", result.Error.Error())
		return
	}
	
	if result.RowsAffected == 0 {
		utils.NotFoundResponse(c, "Coupon not found")
		return
	}
	
	utils.SuccessResponse(c, "Coupon deleted successfully", nil)
}

// GetCoupons الحصول على جميع الكوبونات (Admin)
func GetCoupons(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	var coupons []models.Coupon
	var total int64
	
	config.DB.Model(&models.Coupon{}).Count(&total)
	
	err := config.DB.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&coupons).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch coupons", err.Error())
		return
	}
	
	pagination := utils.CalculatePagination(page, limit, total)
	utils.PaginatedSuccessResponse(c, "Coupons retrieved successfully", coupons, pagination)
}

// GetCouponByID الحصول على كوبون بواسطة ID (Admin)
func GetCouponByID(c *gin.Context) {
	id := c.Param("id")
	couponUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid coupon ID", err.Error())
		return
	}
	
	var coupon models.Coupon
	if err := config.DB.Where("id = ?", couponUUID).First(&coupon).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Coupon not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch coupon", err.Error())
		}
		return
	}
	
	utils.SuccessResponse(c, "Coupon retrieved successfully", coupon)
}

// ValidateCoupon التحقق من صحة الكوبون (للمستخدمين)
func ValidateCoupon(c *gin.Context) {
	code := c.Query("code")
	amountStr := c.Query("amount")
	
	if code == "" || amountStr == "" {
		utils.BadRequestResponse(c, "Coupon code and amount are required", "")
		return
	}
	
	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid amount format", err.Error())
		return
	}
	
	var coupon models.Coupon
	if err := config.DB.Where("code = ?", code).First(&coupon).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Coupon not found or invalid")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch coupon", err.Error())
		}
		return
	}
	
	if !coupon.IsValid() {
		utils.BadRequestResponse(c, "Coupon is not valid", "")
		return
	}
	
	if !coupon.CanBeUsedForOrder(amount) {
		utils.BadRequestResponse(c, "Coupon cannot be applied to this order amount", "")
		return
	}
	
	discount := coupon.CalculateDiscount(amount)
	
	response := gin.H{
		"coupon":   coupon,
		"discount": discount,
	}
	
	utils.SuccessResponse(c, "Coupon is valid and applied", response)
}

