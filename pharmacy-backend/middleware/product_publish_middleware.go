package middleware

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CheckProductPublishPermission يتحقق من صلاحيات النشر/إلغاء النشر للمنتجات
func CheckProductPublishPermission() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. تسجيل محاولة الوصول
		log.Println("[MIDDLEWARE] Checking product publish permissions...")
		log.Printf("[DEBUG] Request Method: %s, Path: %s", c.Request.Method, c.Request.URL.Path)

		// Log request headers for debugging
		authHeader := c.GetHeader("Authorization")
		contentType := c.GetHeader("Content-Type")
		log.Printf("[DEBUG] Headers - Auth: %s, Content-Type: %s", 
			authHeader, contentType)

		// Log request body if present
		if c.Request.Body != nil && c.Request.ContentLength > 0 {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes)) // Restore the request body
			log.Printf("[DEBUG] Request body: %s", string(bodyBytes))
		} else {
			log.Println("[DEBUG] No request body present")
		}

		// 2. استخراج التوكن من رأس الطلب أو الكوكيز
		var tokenString string
		
		// Try cookies first (admin_access_token), then fallback to Authorization header
		if v, err := c.Cookie("admin_access_token"); err == nil && v != "" {
			tokenString = v
		} else if v, err := c.Cookie("client_access_token"); err == nil && v != "" {
			tokenString = v
		} else {
			tokenString = authHeader
			// إزالة البادئة 'Bearer ' إذا وجدت
			if len(tokenString) > 7 && strings.ToUpper(tokenString[0:7]) == "BEARER " {
				tokenString = tokenString[7:]
			}
		}

		if tokenString == "" {
			errMsg := "مطلوب مصادقة: لم يتم توفير رمز المصادقة"
			log.Println("[AUTH ERROR]", errMsg)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 3. التحقق من صحة التوكن باستخدام نفس الأدوات المستخدمة في باقي التطبيق
		claims, err := utils.VerifyJWT(tokenString)
		if err != nil {
			errMsg := fmt.Sprintf("جلسة غير صالحة: %v", err)
			log.Printf("[AUTH ERROR] %s", errMsg)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 4. الحصول على معرف المستخدم
		userIDStr, ok := claims["user_id"].(string)
		if !ok {
			errMsg := "معرف المستخدم غير صالح في التوكن"
			log.Println("[AUTH ERROR]", errMsg)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			errMsg := "معرف المستخدم غير صالح"
			log.Printf("[AUTH ERROR] %s: %v", errMsg, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 5. الحصول على دور المستخدم
		role, ok := claims["role"].(string)
		if !ok {
			errMsg := "دور المستخدم غير محدد في التوكن"
			log.Println("[AUTH ERROR]", errMsg)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 6. الحصول على بيانات المستخدم من قاعدة البيانات للتأكد من أنه نشط
		var user models.User
		if err := config.DB.Where("id = ? AND is_active = ?", userID, true).First(&user).Error; err != nil {
			errMsg := "المستخدم غير موجود أو غير نشط"
			log.Printf("[AUTH ERROR] %s: %v", errMsg, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 7. التحقق من الصلاحيات (يجب أن يكون المستخدم مسؤولاً أو ناشراً)
		if role != string(models.RoleAdmin) && role != string(models.RoleSuperAdmin) && role != "publisher" {
			errMsg := fmt.Sprintf("User %s with role %s tried to access publish endpoint", userID, role)
			log.Printf("[AUTH ERROR] %s", errMsg)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "ليس لديك صلاحية للوصول إلى هذه الوظيفة",
			})
			c.Abort()
			return
		}

		// 8. تسجيل محاولة الوصول الناجحة
		log.Printf("[AUTH] User %s (%s) is accessing publish endpoint", userID, role)
		
		// 9. إضافة بيانات المستخدم إلى السياق للاستخدام اللاحق
		c.Set("userID", userID)
		c.Set("userRole", role)
		c.Set("user_id", userID)
		c.Set("user_role", role)
		c.Set("user", &user)
		
		// Proceed to the next handler
		c.Next()
	}
}
