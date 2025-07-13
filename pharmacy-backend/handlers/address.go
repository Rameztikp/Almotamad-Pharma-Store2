package handlers

import (
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateAddressRequest بنية طلب إنشاء عنوان
type CreateAddressRequest struct {
	Type         models.AddressType `json:"type" binding:"required,oneof=shipping billing"`
	FirstName    string             `json:"first_name" binding:"required"`
	LastName     string             `json:"last_name" binding:"required"`
	Phone        string             `json:"phone" binding:"required"`
	AddressLine1 string             `json:"address_line1" binding:"required"`	
	AddressLine2 *string            `json:"address_line2,omitempty"`
	City         string             `json:"city" binding:"required"`
	State        string             `json:"state" binding:"required"`
	PostalCode   string             `json:"postal_code" binding:"required"`
	Country      string             `json:"country" binding:"required"`
	IsDefault    bool               `json:"is_default"`
}

// UpdateAddressRequest بنية طلب تحديث عنوان
type UpdateAddressRequest struct {
	Type         models.AddressType `json:"type,omitempty" binding:"oneof=shipping billing"`
	FirstName    string             `json:"first_name,omitempty"`
	LastName     string             `json:"last_name,omitempty"`
	Phone        string             `json:"phone,omitempty"`
	AddressLine1 string             `json:"address_line1,omitempty"`
	AddressLine2 *string            `json:"address_line2,omitempty"`
	City         string             `json:"city,omitempty"`
	State        string             `json:"state,omitempty"`
	PostalCode   string             `json:"postal_code,omitempty"`
	Country      string             `json:"country,omitempty"`
	IsDefault    *bool              `json:"is_default,omitempty"`
}

// GetUserAddresses الحصول على جميع عناوين المستخدم
func GetUserAddresses(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	var addresses []models.Address
	if err := config.DB.Where("user_id = ?", userID).Find(&addresses).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch addresses", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Addresses retrieved successfully", addresses)
}

// CreateAddress إنشاء عنوان جديد للمستخدم
func CreateAddress(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	var req CreateAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	address := models.Address{
		UserID:       userID.(uuid.UUID),
		Type:         req.Type,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        req.Phone,
		AddressLine1: req.AddressLine1,
		AddressLine2: req.AddressLine2,
		City:         req.City,
		State:        req.State,
		PostalCode:   req.PostalCode,
		Country:      req.Country,
		IsDefault:    req.IsDefault,
	}
	
	// إذا كان العنوان الجديد هو الافتراضي، قم بإلغاء تعيين العناوين الافتراضية الأخرى من نفس النوع
	if address.IsDefault {
		if err := config.DB.Model(&models.Address{}).Where("user_id = ? AND type = ?", userID, address.Type).Update("is_default", false).Error; err != nil {
			utils.InternalServerErrorResponse(c, "Failed to update default addresses", err.Error())
			return
		}
	}
	
	if err := config.DB.Create(&address).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to create address", err.Error())
		return
	}
	
	utils.CreatedResponse(c, "Address created successfully", address)
}

// UpdateAddress تحديث عنوان موجود للمستخدم
func UpdateAddress(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	addressID := c.Param("id")
	addressUUID, err := uuid.Parse(addressID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid address ID", err.Error())
		return
	}
	
	var req UpdateAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	var address models.Address
	if err := config.DB.Where("id = ? AND user_id = ?", addressUUID, userID).First(&address).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Address not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch address", err.Error())
		}
		return
	}
	
	// تحديث الحقول
	if req.Type != "" {
		address.Type = req.Type
	}
	if req.FirstName != "" {
		address.FirstName = req.FirstName
	}
	if req.LastName != "" {
		address.LastName = req.LastName
	}
	if req.Phone != "" {
		address.Phone = req.Phone
	}
	if req.AddressLine1 != "" {
		address.AddressLine1 = req.AddressLine1
	}
	if req.AddressLine2 != nil {
		address.AddressLine2 = req.AddressLine2
	}
	if req.City != "" {
		address.City = req.City
	}
	if req.State != "" {
		address.State = req.State
	}
	if req.PostalCode != "" {
		address.PostalCode = req.PostalCode
	}
	if req.Country != "" {
		address.Country = req.Country
	}
	
	// إذا تم تعيين هذا العنوان كافتراضي، قم بإلغاء تعيين العناوين الافتراضية الأخرى من نفس النوع
	if req.IsDefault != nil && *req.IsDefault && !address.IsDefault {
		if err := config.DB.Model(&models.Address{}).Where("user_id = ? AND type = ?", userID, address.Type).Update("is_default", false).Error; err != nil {
			utils.InternalServerErrorResponse(c, "Failed to update default addresses", err.Error())
			return
		}
		address.IsDefault = true
	} else if req.IsDefault != nil && !*req.IsDefault && address.IsDefault {
		address.IsDefault = false
	}
	
	if err := config.DB.Save(&address).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update address", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Address updated successfully", address)
}

// DeleteAddress حذف عنوان للمستخدم
func DeleteAddress(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	addressID := c.Param("id")
	addressUUID, err := uuid.Parse(addressID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid address ID", err.Error())
		return
	}
	
	result := config.DB.Where("id = ? AND user_id = ?", addressUUID, userID).Delete(&models.Address{})
	if result.Error != nil {
		utils.InternalServerErrorResponse(c, "Failed to delete address", result.Error.Error())
		return
	}
	
	if result.RowsAffected == 0 {
		utils.NotFoundResponse(c, "Address not found")
		return
	}
	
	utils.SuccessResponse(c, "Address deleted successfully", nil)
}

