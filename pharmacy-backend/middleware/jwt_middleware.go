package middleware

import (
	"net/http"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// JWTAuth middleware للتحقق من صحة التوكن
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
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

		// إضافة معلومات المستخدم إلى السياق
		userID, _ := uuid.Parse(claims["sub"].(string))
		c.Set("userID", userID)
		c.Set("userRole", claims["role"])

		c.Next()
	}
}

// AdminOnly middleware للتحقق من صلاحيات المشرف
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "غير مصرح بالوصول"})
			c.Abort()
			return
		}

		// التحقق من أن المستخدم مشرف
		if role != string(models.RoleAdmin) && role != string(models.RoleSuperAdmin) {
			c.JSON(http.StatusForbidden, gin.H{"error": "غير مصرح بالوصول"})
			c.Abort()
			return
		}

		c.Next()
	}
}
