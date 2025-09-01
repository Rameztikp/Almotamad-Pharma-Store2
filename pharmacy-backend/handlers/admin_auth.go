package handlers

import (
	"net/http"
	"os"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// AdminLoginRequest بنية طلب تسجيل دخول المشرف
type AdminLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AdminLogin handles admin authentication
func AdminLogin(c *gin.Context) {
	var req AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}

	// Find user by email
	var user models.User
	if err := config.DB.Where("email = ?", strings.ToLower(strings.TrimSpace(req.Email))).First(&user).Error; err != nil {
		utils.UnauthorizedResponse(c, "Invalid email or password")
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		utils.UnauthorizedResponse(c, "Invalid email or password")
		return
	}

	// Check admin role
	if user.Role != models.RoleAdmin && user.Role != models.RoleSuperAdmin {
		utils.ForbiddenResponse(c, "Access denied")
		return
	}

	// Generate tokens
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to generate tokens", err.Error())
		return
	}

	// Update last login time
	now := time.Now()
	user.LastLoginAt = &now
	if err := config.DB.Save(&user).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update user data", err.Error())
		return
	}

	// Clear sensitive data
	user.PasswordHash = ""

	// Set secure HTTP-only cookies for admin
	utils.SetAuthCookies(c, accessToken, refreshToken, true)

	// Return the tokens in the response (useful for API clients)
	utils.SuccessResponse(c, "Login successful", gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user":         user,
	})
}

// AdminAuthRequired middleware للتحقق من صلاحيات المشرف
func AdminAuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// حاول القراءة من Cookie أولاً ثم تراجع إلى ترويسة Authorization
		tokenString, errCookie := c.Cookie("admin_access_token")
		if tokenString == "" || errCookie != nil {
			tokenString = c.GetHeader("Authorization")
			if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
				tokenString = tokenString[7:]
			}
		}
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "مطلوب تسجيل الدخول"})
			c.Abort()
			return
		}

		// التحقق من صحة التوكن
		claims, err := utils.VerifyJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "جلسة غير صالحة"})
			c.Abort()
			return
		}

		// التحقق من صلاحيات المشرف
		role, ok := claims["role"].(string)
		if !ok || (role != string(models.RoleAdmin) && role != string(models.RoleSuperAdmin)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "غير مصرح بالوصول"})
			c.Abort()
			return
		}

		// إضافة معلومات المستخدم إلى السياق
		userID, err := uuid.Parse(claims["user_id"].(string))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "معرف مستخدم غير صالح"})
			c.Abort()
			return
		}

		// التحقق من وجود المستخدم في قاعدة البيانات
		var user models.User
		if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "المستخدم غير موجود"})
			c.Abort()
			return
		}

		// التحقق من أن حساب المستخدم نشط
		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "الحساب غير مفعل"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Set("userRole", role)
		c.Set("user", &user) // إضافة بيانات المستخدم الكاملة إلى السياق

		c.Next()
	}
}

// GetAdminProfile الحصول على ملف المشرف
func GetAdminProfile(c *gin.Context) {
	// الحصول على بيانات المستخدم من السياق
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "غير مصرح بالوصول"})
		return
	}

	// تحويل البيانات إلى نموذج المستخدم
	admin, ok := user.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خطأ في تحميل بيانات المستخدم"})
		return
	}

	// إخفاء الحقول الحساسة
	admin.PasswordHash = ""

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    admin,
	})
}

// AdminLogout handles admin logout
func AdminLogout(c *gin.Context) {
	// Clear all auth cookies
	utils.ClearAuthCookies(c)

	// Additional cleanup for admin-specific paths
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	_, secure := utils.CookieSecurity()
	
	// Clear admin cookies from all possible paths
	paths := []string{"/api/v1", "/api/v1/admin"}
	for _, path := range paths {
		c.SetCookie("admin_access_token", "", -1, path, cookieDomain, secure, true)
		c.SetCookie("admin_refresh_token", "", -1, path, cookieDomain, secure, true)
	}

	utils.SuccessResponse(c, "تم تسجيل الخروج بنجاح", nil)
}

// AdminRefreshToken handles admin token refresh
func AdminRefreshToken(c *gin.Context) {
	// Get refresh token from cookie or request body
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

	// Check if token is a refresh token
	tokenType, _ := claims["type"].(string)
	if tokenType != "refresh" {
		utils.UnauthorizedResponse(c, "Invalid token type")
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
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to generate tokens", err.Error())
		return
	}

	// Clear sensitive data
	user.PasswordHash = ""

	// Set secure HTTP-only cookies for admin
	utils.SetAuthCookies(c, accessToken, refreshToken, true)

	// Return the tokens in the response (useful for API clients)
	utils.SuccessResponse(c, "Token refreshed successfully", gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user":         user,
	})
}
