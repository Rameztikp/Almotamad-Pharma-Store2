package middleware

import (
	"net/http"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// JWTAuth middleware للتحقق من صحة التوكن
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try cookies first, then fallback to Authorization header
		var tokenString string
		// Prefer admin token first to avoid picking a client token on admin routes
		if v, err := c.Cookie("admin_access_token"); err == nil && v != "" {
			tokenString = v
		} else if v, err := c.Cookie("client_access_token"); err == nil && v != "" {
			tokenString = v
		} else {
			tokenString = c.GetHeader("Authorization")
			// إزالة كلمة Bearer من بداية التوكن إذا وجدت
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
			c.JSON(http.StatusUnauthorized, gin.H{"error": "جلسة غير صالحة: " + err.Error()})
			c.Abort()
			return
		}

		// الحصول على معرف المستخدم
		userIDStr, ok := claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "معرف المستخدم غير صالح في التوكن"})
			c.Abort()
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "معرف المستخدم غير صالح"})
			c.Abort()
			return
		}

		// الحصول على دور المستخدم
		role, ok := claims["role"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "دور المستخدم غير محدد في التوكن"})
			c.Abort()
			return
		}

		// الحصول على بيانات المستخدم من قاعدة البيانات
		var user models.User
		if err := config.DB.Where("id = ? AND is_active = ?", userID, true).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "المستخدم غير موجود أو غير نشط"})
			c.Abort()
			return
		}

		// إضافة معلومات المستخدم إلى السياق
		// دعم كلا التسميتين لضمان التوافق مع جميع الـ handlers
		c.Set("userID", userID)
		c.Set("userRole", role)
		c.Set("user_id", userID)
		c.Set("user_role", role)
		c.Set("user", &user) // إضافة بيانات المستخدم الكاملة

		c.Next()
	}
}

// AdminOnly middleware للتحقق من صلاحيات المشرف
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "لم يتم العثور على صلاحيات المستخدم",
			})
			c.Abort()
			return
		}

		// التحقق من أن المستخدم مشرف أو مدير نظام
		roleStr, ok := role.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "نوع الصلاحية غير صالح",
			})
			c.Abort()
			return
		}

		if roleStr != string(models.RoleAdmin) && roleStr != string(models.RoleSuperAdmin) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "غير مصرح بالوصول - تحتاج إلى صلاحيات مدير",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
