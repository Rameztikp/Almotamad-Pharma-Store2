package middleware

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

// getJWTSecret returns the JWT secret key
func getJWTSecret() []byte {
	// This should match the secret in auth.go
	return []byte("your-secret-key-change-this-in-production")
}

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

		// 2. استخراج التوكن من رأس الطلب
		tokenString := authHeader
		if tokenString == "" {
			errMsg := "مطلوب مصادقة: لم يتم توفير رمز المصادقة"
			log.Println("[AUTH ERROR]", errMsg)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 3. التحقق من صيغة التوكن (إزالة البادئة 'Bearer ' إذا وجدت)
		if len(tokenString) > 7 && strings.ToUpper(tokenString[0:7]) == "BEARER " {
			tokenString = tokenString[7:]
		}

		// 4. تحقق من صحة التوكن
		type tokenClaims struct {
			UserID uuid.UUID `json:"user_id"`
			Role   string   `json:"role"`
			jwt.RegisteredClaims
		}

		claims := &tokenClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// التحقق من خوارزمية التوقيع
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return getJWTSecret(), nil
		})

		// 4. معالجة أخطاء التوكن
		if err != nil {
			errMsg := fmt.Sprintf("خطأ في تحليل رمز المصادقة: %v", err)
			log.Printf("[AUTH ERROR] %s", errMsg)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 5. التحقق من صحة التوكن
		if !token.Valid {
			errMsg := "انتهت صلاحية الجلسة"
			log.Println("[AUTH ERROR]", errMsg)
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 6. استخراج البيانات من التوكن
		claims, ok := token.Claims.(*tokenClaims)
		if !ok {
			errMsg := "خطأ في معالجة بيانات التوكن"
			log.Println("[AUTH ERROR]", errMsg)
			c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// 7. التحقق من الصلاحيات (يجب أن يكون المستخدم مسؤولاً أو ناشراً)
		if claims.Role != "admin" && claims.Role != "publisher" {
			errMsg := fmt.Sprintf("User %s with role %s tried to access publish endpoint", claims.UserID, claims.Role)
			log.Printf("[AUTH ERROR] %s", errMsg)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "ليس لديك صلاحية للوصول إلى هذه الوظيفة",
			})
			c.Abort()
			return
		}

		// 8. تسجيل محاولة الوصول
		log.Printf("[AUTH] User %s (%s) is accessing publish endpoint", claims.UserID, claims.Role)
		
		// 9. إضافة بيانات المستخدم إلى السياق للاستخدام اللاحق
		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)
		
		// Proceed to the next handler
		c.Next()
	}
}
