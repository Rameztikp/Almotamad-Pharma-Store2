package middleware

import (
	"fmt"
	"log"
	"net/http"

	"pharmacy-backend/models"

	"github.com/gin-gonic/gin"
)

// CheckProductPublishPermission يتحقق من صلاحيات النشر/إلغاء النشر للمنتجات
// يستخدم AuthMiddleware الموحد مع تحقق إضافي من صلاحيات النشر
func CheckProductPublishPermission() gin.HandlerFunc {
	return func(c *gin.Context) {
		// تسجيل محاولة الوصول
		log.Printf("[MIDDLEWARE] Checking product publish permissions for %s %s", c.Request.Method, c.Request.URL.Path)

		// الحصول على بيانات المستخدم من AuthMiddleware
		user, exists := c.Get("user")
		if !exists {
			errMsg := "مطلوب مصادقة: لم يتم العثور على بيانات المستخدم"
			log.Println("[AUTH ERROR]", errMsg)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		userObj := user.(*models.User)
		role := string(userObj.Role)

		// التحقق من صلاحيات النشر (يجب أن يكون المستخدم مسؤولاً أو ناشراً)
		if role != string(models.RoleAdmin) && role != string(models.RoleSuperAdmin) && role != "publisher" {
			errMsg := fmt.Sprintf("User %s with role %s tried to access publish endpoint", userObj.ID, role)
			log.Printf("[AUTH ERROR] %s", errMsg)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "ليس لديك صلاحية للوصول إلى هذه الوظيفة",
			})
			c.Abort()
			return
		}

		// تسجيل محاولة الوصول الناجحة
		log.Printf("[AUTH] User %s (%s) is accessing publish endpoint", userObj.ID, role)
		
		// المتابعة إلى الـ handler التالي
		c.Next()
	}
}

// PublishPermissionMiddleware مجموعة middleware للتحقق من المصادقة وصلاحيات النشر
// يجب استخدامه بدلاً من CheckProductPublishPermission مباشرة
func PublishPermissionMiddleware() []gin.HandlerFunc {
	return []gin.HandlerFunc{
		AuthMiddleware(),                    // المصادقة العامة
		CheckProductPublishPermission(),     // تحقق صلاحيات النشر
	}
}
