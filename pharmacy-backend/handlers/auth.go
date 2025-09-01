package handlers

import (
	"os"
	"regexp"
	"strings"
	"time"

	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// isValidEmail checks if the email has a valid format
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// RegisterRequest بنية طلب التسجيل
type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	FullName    string `json:"full_name" binding:"required"`
	Phone       string `json:"phone" binding:"required"`
	DateOfBirth string `json:"date_of_birth" binding:"required"`
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
	// Transaction
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

	// Normalize & validate email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if !isValidEmail(req.Email) {
		tx.Rollback()
		utils.BadRequestResponse(c, "خطأ", "البريد الإلكتروني غير صالح")
		return
	}
	if len(req.Password) < 6 {
		tx.Rollback()
		utils.BadRequestResponse(c, "خطأ", "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل")
		return
	}

	// Dup check (case-insensitive)
	var existingUser models.User
	if err := tx.Where("LOWER(email) = ?", req.Email).First(&existingUser).Error; err == nil {
		tx.Rollback()
		utils.BadRequestResponse(c, "Email already exists", "البريد الإلكتروني مسجل مسبقاً")
		return
	}

	// Parse DOB
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		tx.Rollback()
		utils.BadRequestResponse(c, "خطأ", "تنسيق تاريخ الميلاد غير صالح. استخدم الصيغة YYYY-MM-DD")
		return
	}

	// Hash password
	hashed, err := utils.HashPassword(req.Password)
	if err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في إنشاء الحساب", err.Error())
		return
	}

	user := models.User{
		ID:            uuid.New(),
		Email:         req.Email,
		PasswordHash:  hashed,
		FullName:      req.FullName,
		Phone:         req.Phone,
		DateOfBirth:   &dob,
		AccountType:   "retail",
		Role:          "customer",
		IsActive:      true,
		EmailVerified: false,
		PhoneVerified: false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في إنشاء الحساب", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.InternalServerErrorResponse(c, "فشل في تأكيد عملية التسجيل", err.Error())
		return
	}

	// Generate tokens
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to generate tokens", err.Error())
		return
	}

	// Clear sensitive data
	user.PasswordHash = ""

	// Set secure HTTP-only cookies for the new user
	utils.SetAuthCookies(c, accessToken, refreshToken, false)

	utils.SuccessResponse(c, "تم إنشاء الحساب بنجاح", gin.H{"user": user})
}

// Login تسجيل الدخول (العميل)
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}

	// Normalize email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Find user (case-insensitive) & active
	var user models.User
	if err := config.DB.Where("LOWER(email) = ? AND is_active = ?", req.Email, true).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.LogFailedLogin(c, req.Email, "مستخدم غير موجود أو غير نشط")
			utils.UnauthorizedResponse(c, "البريد الإلكتروني أو كلمة المرور غير صحيحة")
		} else {
			utils.InternalServerErrorResponse(c, "خطأ في قاعدة البيانات", err.Error())
		}
		return
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		utils.LogFailedLogin(c, req.Email, "كلمة مرور خاطئة")
		utils.UnauthorizedResponse(c, "البريد الإلكتروني أو كلمة المرور غير صحيحة")
		return
	}

	// Generate tokens
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to generate tokens", err.Error())
		return
	}

	// Clear sensitive data
	user.PasswordHash = ""

	// Set secure HTTP-only cookies
	utils.SetAuthCookies(c, accessToken, refreshToken, false)

	utils.SuccessResponse(c, "Login successful", gin.H{"user": user})
}

// GetProfile الحصول على ملف المستخدم
func GetProfile(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var userObj *models.User
	switch v := user.(type) {
	case *models.User:
		userObj = v
	case models.User:
		userObj = &v
	default:
		utils.InternalServerErrorResponse(c, "خطأ في نوع بيانات المستخدم", "Unexpected user data type in context")
		return
	}

	var freshUser models.User
	if err := config.DB.Where("id = ? AND is_active = ?", userObj.ID, true).First(&freshUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.UnauthorizedResponse(c, "المستخدم غير موجود أو غير نشط")
		} else {
			utils.InternalServerErrorResponse(c, "خطأ في قاعدة البيانات", err.Error())
		}
		return
	}

	freshUser.PasswordHash = ""
	utils.SuccessResponse(c, "Profile retrieved successfully", freshUser)
}

// UpdateProfileRequest بنية طلب تحديث الملف الشخصي
type UpdateProfileRequest struct {
	FullName    string     `json:"full_name"`
	Phone       string     `json:"phone"`
	DateOfBirth *time.Time `json:"date_of_birth,omitempty"`
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

	userObj.FullName = req.FullName
	userObj.Phone = req.Phone
	userObj.DateOfBirth = req.DateOfBirth
	userObj.UpdatedAt = time.Now()

	if err := config.DB.Save(userObj).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update profile", err.Error())
		return
	}

	userObj.PasswordHash = ""
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

	if !utils.CheckPassword(req.CurrentPassword, userObj.PasswordHash) {
		utils.UnauthorizedResponse(c, "كلمة المرور الحالية غير صحيحة")
		return
	}

	hashed, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to hash password", err.Error())
		return
	}

	userObj.PasswordHash = hashed
	if err := config.DB.Save(userObj).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update password", err.Error())
		return
	}

	utils.SuccessResponse(c, "تم تحديث كلمة المرور بنجاح", nil)
}

// Logout تسجيل الخروج
func Logout(c *gin.Context) {
	_, secure := utils.CookieSecurity()
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	
	// Clear all auth cookies from all possible paths
	paths := []string{"/", "/api/v1"}
	for _, path := range paths {
		c.SetCookie("access_token", "", -1, path, cookieDomain, secure, true)
		c.SetCookie("refresh_token", "", -1, path, cookieDomain, secure, true)
	}

	utils.SuccessResponse(c, "تم تسجيل الخروج بنجاح", nil)
}

// RefreshTokenRequest
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type RefreshTokenResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         models.User `json:"user"`
}

// RefreshToken
func RefreshToken(c *gin.Context) {
	// Try to get refresh token from cookies or request body
	token, found := utils.GetRefreshTokenFromRequest(c)
	if !found {
		utils.UnauthorizedResponse(c, "Refresh token is required")
		return
	}

	// Verify the refresh token
	claims, err := utils.VerifyJWT(token)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid refresh token")
		return
	}

	// Get user ID from claims
	userID, err := uuid.Parse(claims["user_id"].(string))
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid user in token")
		return
	}

	// Check if user exists and is active
	var user models.User
	if err := config.DB.Where("id = ? AND is_active = ?", userID, true).First(&user).Error; err != nil {
		utils.UnauthorizedResponse(c, "User not found or inactive")
		return
	}

	// Generate new tokens
	userRole := string(user.Role)
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID, user.Email, userRole)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to generate tokens", err.Error())
		return
	}

	// Clear sensitive data
	user.PasswordHash = ""

	// Determine if this is an admin or client token refresh
	isAdmin := userRole == "admin"

	// Set the appropriate cookies
	utils.SetAuthCookies(c, accessToken, refreshToken, isAdmin)

	// Return the new tokens in the response for clients that need them
	utils.SuccessResponse(c, "Token refreshed successfully", gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user":         user,
	})
}
