package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetAllUsers الحصول على جميع المستخدمين (Super Admin)
func GetAllUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	role := strings.Trim(c.Query("role"), "/")
	search := c.Query("search")
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	query := config.DB.Model(&models.User{})
	
	// معالجة معلمة الدور
	if role == "customer" {
		query = query.Where("role IN (?)", []string{"customer", "retail", "wholesale"})
	} else if role != "" {
		query = query.Where("role = ?", role)
	}
	
	// إضافة البحث إذا وجد
	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("full_name ILIKE ? OR email ILIKE ? OR phone ILIKE ?", 
			searchTerm, searchTerm, searchTerm)
	}
	
	// حساب العدد الإجمالي للسجلات
	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count users", err.Error())
		return
	}
	
	// جلب البيانات مع التقسيم للصفحات
	var users []models.User
	err := query.
		Select("id", "full_name", "email", "phone", "role", "is_active", "account_type", "wholesale_access", "created_at", "updated_at", "date_of_birth").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&users).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch users", err.Error())
		return
	}
	
	// إخفاء كلمات المرور
	for i := range users {
		users[i].PasswordHash = ""
	}
	
	// إرجاع البيانات بالتنسيق المتوقع من الواجهة الأمامية
	response := gin.H{
		"data": gin.H{
			"customers": users,
			"total":    total,
		},
		"success": true,
	}
	
	c.JSON(http.StatusOK, response)
}

// GetUserByID الحصول على مستخدم بواسطة ID (Super Admin)
func GetUserByID(c *gin.Context) {
	id := c.Param("id")
	userUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid user ID", err.Error())
		return
	}
	
	var user models.User
	if err := config.DB.Where("id = ?", userUUID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch user", err.Error())
		}
		return
	}
	
	user.PasswordHash = "" // إخفاء كلمة المرور
	utils.SuccessResponse(c, "User retrieved successfully", user)
}

// UpdateUserRequest بنية طلب تحديث المستخدم
type UpdateUserRequest struct {
	FullName  *string           `json:"full_name,omitempty"`
	Phone     *string           `json:"phone,omitempty"`
	Email     *string           `json:"email,omitempty" binding:"omitempty,email"`
	Role      *models.UserRole  `json:"role,omitempty" binding:"omitempty,oneof=customer admin super_admin wholesale"`
	IsActive  *bool             `json:"is_active,omitempty"`
	// Wholesale specific fields
	CompanyName        *string `json:"company_name,omitempty"`
	CommercialRegister *string `json:"commercial_register,omitempty"`
}

// UpdateUser تحديث مستخدم (Super Admin)
func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	userUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid user ID", err.Error())
		return
	}
	
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	var user models.User
	if err := config.DB.Where("id = ?", userUUID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch user", err.Error())
		}
		return
	}
	
	// تحديث الحقول
	if req.FullName != nil {
		user.FullName = *req.FullName
	}
	if req.Phone != nil {
		user.Phone = *req.Phone
	}
	if req.Email != nil {
		// التحقق من عدم وجود بريد إلكتروني مكرر
		var existingUser models.User
		if err := config.DB.Where("email = ? AND id <> ?", *req.Email, user.ID).First(&existingUser).Error; err == nil {
			utils.BadRequestResponse(c, "Email already exists", "")
			return
		}
		user.Email = *req.Email
	}
	if req.Role != nil {
		user.Role = *req.Role
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	
	// تحديث حقول الجملة إذا كانت متوفرة
	if req.CompanyName != nil {
		user.CompanyName = *req.CompanyName
	}
	if req.CommercialRegister != nil {
		user.CommercialRegister = *req.CommercialRegister
	}
	
	// تحديث طابع التحديث
	user.UpdatedAt = time.Now()
	
	if err := config.DB.Save(&user).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update user", err.Error())
		return
	}
	
	user.PasswordHash = "" // إخفاء كلمة المرور
	utils.SuccessResponse(c, "User updated successfully", user)
}

// DeleteUser حذف مستخدم (Super Admin)
func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	userUUID, err := uuid.Parse(id)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid user ID", err.Error())
		return
	}
	
	result := config.DB.Delete(&models.User{}, userUUID)
	if result.Error != nil {
		utils.InternalServerErrorResponse(c, "Failed to delete user", result.Error.Error())
		return
	}
	
	if result.RowsAffected == 0 {
		utils.NotFoundResponse(c, "User not found")
		return
	}
	
	utils.SuccessResponse(c, "User deleted successfully", nil)
}

