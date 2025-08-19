package handlers

import (
	"net/http"
	"pharmacy-backend/config"
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

// RegisterRequest بنية ططلب التسجيل
type RegisterRequest struct {
	Email       string  `json:"email" binding:"required,email"`
	Password    string  `json:"password" binding:"required,min=6"`
	FullName    string  `json:"full_name" binding:"required"`
	Phone       string  `json:"phone" binding:"required"`
	DateOfBirth string  `json:"date_of_birth" binding:"required"`
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
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "البريد الإلكتروني مستخدم من قبل",
		})
		return
	}
	
	// تشفير كلمة المرور
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "خطأ في تشفير كلمة المرور", err.Error())
		return
	}

	// Parse date of birth
	dateOfBirth, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		tx.Rollback()
		utils.BadRequestResponse(c, "خطأ", "تنسيق تاريخ الميلاد غير صالح. استخدم الصيغة YYYY-MM-DD")
		return
	}

	// Create new user (default to retail account)
	user := models.User{
		ID:              uuid.New(),
		Email:           req.Email,
		PasswordHash:    hashedPassword,
		FullName:        req.FullName,
		Phone:           req.Phone,
		DateOfBirth:     &dateOfBirth,
		AccountType:     "retail", // Default to retail account
		Role:            "customer",
		IsActive:        true,     // Retail accounts are active by default
		EmailVerified:   false,
		PhoneVerified:   false,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	
	// Save user to database
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في إنشاء الحساب", err.Error())
		return
	}
	
	// Generate access token و refresh token
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في إنشاء رمز الدخول", err.Error())
		return
	}
	
	// Hide password in response
	user.PasswordHash = ""
	
	// Set tokens in HttpOnly cookies (client scope)
	accessCookie := &http.Cookie{
		Name:     "client_access_token",
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   gin.Mode() == gin.ReleaseMode,
		SameSite: http.SameSiteStrictMode,
		// Access token typically short-lived (e.g., 15m). Let it be session cookie by default.
	}
	http.SetCookie(c.Writer, accessCookie)

	refreshCookie := &http.Cookie{
		Name:     "client_refresh_token",
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   gin.Mode() == gin.ReleaseMode,
		SameSite: http.SameSiteStrictMode,
		// Set a longer max-age for refresh tokens if desired (e.g., 30 days). Optional here.
	}
	http.SetCookie(c.Writer, refreshCookie)

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		utils.InternalServerErrorResponse(c, "فشل في حفظ البيانات", err.Error())
		return
	}
	
	// Return success response without exposing tokens in JSON
	utils.CreatedResponse(c, "تم إنشاء الحساب بنجاح", gin.H{
		"user": user,
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
	
	// إنشاء access token و refresh token
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to generate tokens", err.Error())
		return
	}
	
	// إخفاء كلمة المرور في الاستجابة
	user.PasswordHash = ""
	
	// Set tokens in HttpOnly cookies (client scope)
	accessCookie := &http.Cookie{
		Name:     "client_access_token",
		Value:    accessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   gin.Mode() == gin.ReleaseMode,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(c.Writer, accessCookie)

	refreshCookie := &http.Cookie{
		Name:     "client_refresh_token",
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   gin.Mode() == gin.ReleaseMode,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(c.Writer, refreshCookie)

	utils.SuccessResponse(c, "Login successful", gin.H{
		"user": user,
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
	
	// تحديث البيانات
	userObj.FullName = req.FullName
	userObj.Phone = req.Phone
	userObj.DateOfBirth = req.DateOfBirth
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

// Logout تسجيل الخروج (يمسح ملفات تعريف الارتباط الخاصة بالجلسة)
func Logout(c *gin.Context) {
    // Expire both client and admin cookies
    // 1) Clear client cookies on '/'
    clientNames := []string{
        "client_access_token",
        "client_refresh_token",
    }
    for _, name := range clientNames {
        http.SetCookie(c.Writer, &http.Cookie{
            Name:     name,
            Value:    "",
            Path:     "/",
            HttpOnly: true,
            Secure:   gin.Mode() == gin.ReleaseMode,
            SameSite: http.SameSiteStrictMode,
            MaxAge:   -1,
        })
    }

    // 2) Clear legacy admin cookies that might have been set on '/'
    legacyAdminNames := []string{
        "admin_access_token",
        "admin_refresh_token",
    }
    for _, name := range legacyAdminNames {
        http.SetCookie(c.Writer, &http.Cookie{
            Name:     name,
            Value:    "",
            Path:     "/",
            HttpOnly: true,
            Secure:   gin.Mode() == gin.ReleaseMode,
            // legacy cookies might have been Strict; MaxAge -1 will expire regardless
            SameSite: http.SameSiteStrictMode,
            MaxAge:   -1,
        })
    }

    // 3) Clear current scoped admin cookies on '/api/v1/admin' with SameSite=None
    for _, name := range legacyAdminNames {
        http.SetCookie(c.Writer, &http.Cookie{
            Name:     name,
            Value:    "",
            Path:     "/api/v1/admin",
            HttpOnly: true,
            Secure:   gin.Mode() == gin.ReleaseMode,
            SameSite: http.SameSiteNoneMode,
            MaxAge:   -1,
        })
    }

    utils.SuccessResponse(c, "Logout successful", nil)
}

// RefreshTokenRequest بنية طلب تحديث التوكن
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshTokenResponse بنية استجابة تحديث التوكن
type RefreshTokenResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         models.User `json:"user"`
}

// RefreshToken تحديث التوكن باستخدام refresh token
func RefreshToken(c *gin.Context) {
    // Try to read refresh token from cookies first (client or admin), fallback to JSON body
    var tokenFromCookie string
    if v, err := c.Cookie("client_refresh_token"); err == nil && v != "" {
        tokenFromCookie = v
    }
    if tokenFromCookie == "" {
        if v, err := c.Cookie("admin_refresh_token"); err == nil && v != "" {
            tokenFromCookie = v
        }
    }

    var provided string
    if tokenFromCookie != "" {
        provided = tokenFromCookie
    } else {
        var req RefreshTokenRequest
        if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
            utils.BadRequestResponse(c, "بيانات الطلب غير صالحة", "refresh token مفقود")
            return
        }
        provided = req.RefreshToken
    }

    // التحقق من صحة refresh token
    claims, err := utils.VerifyRefreshToken(provided)
    if err != nil {
        utils.UnauthorizedResponse(c, "Refresh token غير صالح")
        return
    }

	// الحصول على معرف المستخدم من التوكن
	userIDStr, ok := claims["user_id"].(string)
	if !ok {
		utils.UnauthorizedResponse(c, "معرف المستخدم غير صالح في التوكن")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.UnauthorizedResponse(c, "معرف المستخدم غير صالح")
		return
	}

	// التحقق من وجود المستخدم في قاعدة البيانات
	var user models.User
	if err := config.DB.Where("id = ? AND is_active = ?", userID, true).First(&user).Error; err != nil {
		utils.UnauthorizedResponse(c, "المستخدم غير موجود أو غير نشط")
		return
	}

	    // إنشاء توكن وصول جديد
    accessToken, err := utils.GenerateJWT(user.ID, user.Email, string(user.Role))
    if err != nil {
        utils.InternalServerErrorResponse(c, "فشل في إنشاء توكن الوصول", err.Error())
        return
    }

	    // إنشاء refresh token جديد
    refreshToken, err := utils.GenerateRefreshToken(user.ID, user.Email, string(user.Role))
    if err != nil {
        utils.InternalServerErrorResponse(c, "فشل في إنشاء refresh token", err.Error())
        return
    }

	// إخفاء كلمة المرور في الاستجابة
	user.PasswordHash = ""

    // Update cookies depending on which cookie space provided token
    // default to client cookies on '/'
    isAdmin := false
    if tokenFromCookie != "" {
        if _, err := c.Cookie("admin_refresh_token"); err == nil {
            isAdmin = true
        }
    }

    if isAdmin {
        // Admin cookies: scoped to /api/v1/admin and SameSite=None
        http.SetCookie(c.Writer, &http.Cookie{
            Name:     "admin_access_token",
            Value:    accessToken,
            Path:     "/api/v1/admin",
            HttpOnly: true,
            Secure:   gin.Mode() == gin.ReleaseMode,
            SameSite: http.SameSiteNoneMode,
        })
        http.SetCookie(c.Writer, &http.Cookie{
            Name:     "admin_refresh_token",
            Value:    refreshToken,
            Path:     "/api/v1/admin",
            HttpOnly: true,
            Secure:   gin.Mode() == gin.ReleaseMode,
            SameSite: http.SameSiteNoneMode,
        })
    } else {
        // Client cookies: keep on '/' with Strict
        http.SetCookie(c.Writer, &http.Cookie{
            Name:     "client_access_token",
            Value:    accessToken,
            Path:     "/",
            HttpOnly: true,
            Secure:   gin.Mode() == gin.ReleaseMode,
            SameSite: http.SameSiteStrictMode,
        })
        http.SetCookie(c.Writer, &http.Cookie{
            Name:     "client_refresh_token",
            Value:    refreshToken,
            Path:     "/",
            HttpOnly: true,
            Secure:   gin.Mode() == gin.ReleaseMode,
            SameSite: http.SameSiteStrictMode,
        })
    }

    utils.SuccessResponse(c, "تم تحديث التوكن بنجاح", RefreshTokenResponse{
        User: user,
    })
}
