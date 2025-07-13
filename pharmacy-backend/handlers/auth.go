package handlers

import (
	"net/http"
	"pharmacy-backend/config"
	"pharmacy-backend/middleware"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	"regexp"
	"time"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// isValidEmail checks if the email has a valid format
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// ConflictResponse sends a conflict response
func ConflictResponse(c *gin.Context, message string, details interface{}) {
	c.JSON(http.StatusConflict, gin.H{
		"success": false,
		"message": message,
		"data":    details,
	})
}

// RegisterRequest بنية طلب التسجيل
type RegisterRequest struct {
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=6"`
	FullName        string `json:"full_name" binding:"required"`
	Phone           string `json:"phone" binding:"required"`
	AccountType     string `json:"account_type" binding:"required,oneof=retail wholesale"`
	
	// Wholesale specific fields
	CompanyName        string `json:"company_name,omitempty"`
	CommercialRegister string `json:"commercial_register,omitempty"`
}

// LoginRequest بنية طلب تسجيل الدخول
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse بنية استجابة المصادقة
type AuthResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

// Register تسجيل مستخدم جديد
func Register(c *gin.Context) {
	// Enable transaction
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		tx.Rollback()
		utils.BadRequestResponse(c, "بيانات الطلب غير صالحة", err.Error())
		return
	}
	
	// التحقق من صحة البريد الإلكتروني
	if !isValidEmail(req.Email) {
		tx.Rollback()
		utils.BadRequestResponse(c, "خطأ", "البريد الإلكتروني غير صالح")
		return
	}
	
	// التحقق من قوة كلمة المرور
	if len(req.Password) < 6 {
		tx.Rollback()
		utils.BadRequestResponse(c, "خطأ", "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل")
		return
	}

	// التحقق من عدم وجود المستخدم مسبقاً
	var existingUser models.User
	if err := tx.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		tx.Rollback()
		ConflictResponse(c, "البريد الإلكتروني مسجل مسبقاً", "الرجاء استخدام بريد إلكتروني آخر")
		return
	}
	
	// تشفير كلمة المرور
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "خطأ في تشفير كلمة المرور", err.Error())
		return
	}
	
	// Validate wholesale account requirements
	if req.AccountType == "wholesale" {
		if req.CompanyName == "" || req.CommercialRegister == "" {
			tx.Rollback()
			utils.BadRequestResponse(c, "خطأ", "يجب إدخال اسم الشركة ورقم السجل التجاري لحساب الجملة")
			return
		}
	}

	// Create new user
	isActive := true
	if req.AccountType == "wholesale" {
		isActive = false // Wholesale accounts need admin approval
	}

	user := models.User{
		ID:              uuid.New(),
		Email:           req.Email,
		PasswordHash:    hashedPassword,
		FullName:        req.FullName,
		Phone:           req.Phone,
		AccountType:     models.AccountType(req.AccountType),
		Role:            models.RoleCustomer,
		IsActive:        isActive,
		EmailVerified:   false,
		PhoneVerified:   false,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Set wholesale specific fields
	if req.AccountType == "wholesale" {
		user.CompanyName = req.CompanyName
		user.CommercialRegister = req.CommercialRegister
		// Note: File uploads (IDDocumentURL, CommercialDocumentURL) should be handled separately
	}
	
	// حفظ المستخدم في قاعدة البيانات
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في إنشاء الحساب", err.Error())
		return
	}
	
	// إنشاء JWT token
	token, err := middleware.GenerateToken(&user)
	if err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في إنشاء رمز الدخول", err.Error())
		return
	}
	
	// إخفاء كلمة المرور في الاستجابة
	user.PasswordHash = ""
	
	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في حفظ البيانات", err.Error())
		return
	}
	
	// إرجاع الاستجابة الناجحة
	utils.CreatedResponse(c, "تم إنشاء الحساب بنجاح", AuthResponse{
		Token: token,
		User:  user,
	})
}

// Login تسجيل الدخول
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	// البحث عن المستخدم
	var user models.User
	if err := config.DB.Where("email = ? AND is_active = ?", req.Email, true).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.UnauthorizedResponse(c, "Invalid email or password")
		} else {
			utils.InternalServerErrorResponse(c, "Database error", err.Error())
		}
		return
	}
	
	// التحقق من كلمة المرور
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		utils.UnauthorizedResponse(c, "Invalid email or password")
		return
	}
	
	// إنشاء JWT token
	token, err := middleware.GenerateToken(&user)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to generate token", err.Error())
		return
	}
	
	// إخفاء كلمة المرور في الاستجابة
	user.PasswordHash = ""
	
	utils.SuccessResponse(c, "Login successful", AuthResponse{
		Token: token,
		User:  user,
	})
}

// GetProfile الحصول على ملف المستخدم
func GetProfile(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	userObj := user.(*models.User)
	userObj.PasswordHash = "" // إخفاء كلمة المرور
	
	utils.SuccessResponse(c, "Profile retrieved successfully", userObj)
}

// UpdateProfileRequest بنية طلب تحديث الملف الشخصي
type UpdateProfileRequest struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
}

// UpdateProfile تحديث ملف المستخدم
func UpdateProfile(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	userObj := user.(*models.User)
	
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	// تحديث البيانات
	userObj.FullName = req.FullName
	userObj.Phone = req.Phone
	userObj.UpdatedAt = time.Now()
	
	if err := config.DB.Save(userObj).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update profile", err.Error())
		return
	}
	
	userObj.PasswordHash = "" // إخفاء كلمة المرور
	utils.SuccessResponse(c, "Profile updated successfully", userObj)
}

// ChangePasswordRequest بنية طلب تغيير كلمة المرور
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

// ChangePassword تغيير كلمة المرور
func ChangePassword(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	userObj := user.(*models.User)
	
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	// التحقق من كلمة المرور الحالية
	if !utils.CheckPassword(req.CurrentPassword, userObj.PasswordHash) {
		utils.BadRequestResponse(c, "Current password is incorrect", "")
		return
	}
	
	// تشفير كلمة المرور الجديدة
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to hash password", err.Error())
		return
	}
	
	// تحديث كلمة المرور
	userObj.PasswordHash = hashedPassword
	if err := config.DB.Save(userObj).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update password", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Password changed successfully", nil)
}

// Logout تسجيل الخروج (في الواقع، يتم التعامل مع هذا في الواجهة الأمامية)
func Logout(c *gin.Context) {
	utils.SuccessResponse(c, "Logout successful", nil)
}

