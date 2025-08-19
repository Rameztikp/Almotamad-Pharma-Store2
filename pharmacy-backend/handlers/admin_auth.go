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
	// ملاحظة: نحتاج لإرسال الكوكيز عبر نطاقات مختلفة خلال التطوير (localhost:5173 -> localhost:8080)
	// في وضع الإنتاج (Release) يجب أن تكون Secure=true مع HTTPS
	// في وضع التطوير، بعض المتصفحات قد تسمح بـ Secure=false على localhost
	// ملاحظة مهمة: SameSite=None يتطلب Secure=true وإلا سترفضه المتصفحات
	// لذلك في التطوير (بدون HTTPS) نستخدم SameSite=Lax و Secure=false
	isRelease := gin.Mode() == gin.ReleaseMode
	var sameSiteMode http.SameSite
	var isSecure bool
	if isRelease {
		// Production: cross-site cookies بحاجة None + Secure=true
		sameSiteMode = http.SameSiteNoneMode
		isSecure = true
	} else {
		// Development: browsers on localhost ترفض None بدون Secure
		sameSiteMode = http.SameSiteLaxMode
		isSecure = false
	}

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

	// ثانياً: ضع كوكيز المسؤول بنطاق مسار الإدمن فقط حتى لا تُرسل لواجهات المتجر
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_access_token",
		Value:    accessToken,
		Path:     "/api/v1/admin",
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: sameSiteMode,
	})
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_refresh_token",
		Value:    refreshToken,
		Path:     "/api/v1/admin",
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: sameSiteMode,
	})

	// إرجاع الاستجابة بدون التوكنات
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    user,
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
