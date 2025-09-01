package handlers

import (
	"net/http"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
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

// AdminLogin تسجيل دخول المشرف
func AdminLogin(c *gin.Context) {
	var req AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "بيانات غير صالحة")
		return
	}

	// البحث عن المستخدم بالبريد الإلكتروني
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "البريد الإلكتروني أو كلمة المرور غير صحيحة"})
		return
	}

	// التحقق من كلمة المرور
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "البريد الإلكتروني أو كلمة المرور غير صحيحة"})
		return
	}

	// التحقق من صلاحيات المشرف
	if user.Role != models.RoleAdmin && user.Role != models.RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "غير مصرح بالوصول"})
		return
	}

	// إنشاء access token و refresh token
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خطأ في إنشاء جلسة المستخدم"})
		return
	}

	// تحديث وقت آخر تسجيل دخول
	now := time.Now()
	user.LastLoginAt = &now
	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خطأ في تحديث بيانات المستخدم"})
		return
	}

	// إخفاء الحقول الحساسة
	user.PasswordHash = ""

	// ضبط التوكنات في ملفات تعريف الارتباط HttpOnly للمشرف
	// نستخدم نفس إعدادات CORS للتحقق من النطاقات المسموح بها
	sameSiteMode, isSecure := utils.CookieSecurity()

	// أولاً: احذف أي كوكيز قديمة واسعة النطاق (Path="/") كي لا تُرسل للمتجر
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_access_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: sameSiteMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_refresh_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: sameSiteMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})

	// ثانياً: ضع كوكيز المسؤول بنطاق مسار api/v1 لتغطية جميع المسارات
	sameSiteMode, secureFlag := utils.CookieSecurity()

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_access_token",
		Value:    accessToken,
		Path:     "/api/v1",
		HttpOnly: true,
		Secure:   secureFlag,
		SameSite: sameSiteMode,
	})
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_refresh_token",
		Value:    refreshToken,
		Path:     "/api/v1",
		HttpOnly: true,
		Secure:   secureFlag,
		SameSite: sameSiteMode,
		MaxAge:   30 * 24 * 60 * 60,  // 30 يوم
		Expires:  time.Now().Add(30 * 24 * time.Hour),
	})

	// إرجاع الاستجابة مع التوكن للاستخدام في localStorage
	response := gin.H{
		"success": true,
		"user":    user,
		"token":   accessToken,
	}

	// Add cookie settings for debugging in development
	if gin.Mode() != gin.ReleaseMode {
		response["cookieSettings"] = gin.H{
			"sameSite": sameSiteMode,
			"secure":   isSecure,
		}
	}

	c.JSON(http.StatusOK, response)
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
	sameSiteMode, secureFlag := cookieSecurity()

	// Delete admin cookies from /api/v1 path
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_access_token",
		Path:     "/api/v1",
		Value:    "",
		HttpOnly: true,
		Secure:   secureFlag,
		SameSite: sameSiteMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_refresh_token",
		Path:     "/api/v1",
		Value:    "",
		HttpOnly: true,
		Secure:   secureFlag,
		SameSite: sameSiteMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})

	// Also delete any old cookies that might exist on root path
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_access_token",
		Path:     "/",
		Value:    "",
		HttpOnly: true,
		Secure:   secureFlag,
		SameSite: sameSiteMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "تم تسجيل الخروج بنجاح",
	})
}

// AdminRefreshToken handles admin token refresh
func AdminRefreshToken(c *gin.Context) {
	// Get refresh token from cookie
	refreshToken, err := c.Cookie("admin_refresh_token")
	if err != nil || refreshToken == "" {
		utils.UnauthorizedResponse(c, "جلسة منتهية الصلاحية")
		return
	}

	// Verify refresh token
	claims, err := utils.VerifyJWT(refreshToken)
	if err != nil {
		utils.UnauthorizedResponse(c, "جلسة غير صالحة")
		return
	}

	// Check if token is a refresh token
	tokenType, _ := claims["type"].(string)
	if tokenType != "refresh" {
		utils.UnauthorizedResponse(c, "نوع التوكن غير صالح")
		return
	}

	// Generate new tokens
	userID, _ := uuid.Parse(claims["user_id"].(string))
	email, _ := claims["email"].(string)
	role, _ := claims["role"].(string)

	accessToken, newRefreshToken, err := utils.GenerateTokens(userID, email, role)
	if err != nil {
		utils.InternalServerErrorResponse(c, "فشل في إنشاء التوكنات", err.Error())
		return
	}

	// Get security settings for cookies
	sameSiteMode, secureFlag := utils.CookieSecurity()

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_access_token",
		Value:    accessToken,
		Path:     "/api/v1",
		HttpOnly: true,
		Secure:   secureFlag,
		SameSite: sameSiteMode,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_refresh_token",
		Value:    newRefreshToken,
		Path:     "/api/v1",
		HttpOnly: true,
		Secure:   secureFlag,
		SameSite: sameSiteMode,
		MaxAge:   30 * 24 * 60 * 60,  // 30 يوم
		Expires:  time.Now().Add(30 * 24 * time.Hour),
	})

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"access_token": accessToken,
	})
}
