package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"
	"pharmacy-backend/models"
	"pharmacy-backend/config"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

// getJWTSecret الحصول على مفتاح JWT من متغيرات البيئة
func getJWTSecret() []byte {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		// fallback للتطوير فقط
		return []byte("your-secret-key-change-this-in-production")
	}
	return []byte(jwtSecret)
}

// Claims بنية JWT claims
type Claims struct {
	UserID uuid.UUID       `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken إنشاء JWT token
func GenerateToken(user *models.User) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "pharmacy-backend",
		},
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// ValidateToken التحقق من صحة JWT token
func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})
	
	if err != nil {
		return nil, err
	}
	
	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	
	return claims, nil
}

// getTokenFromRequest استخراج التوكن من الطلب (Authorization header أو HttpOnly cookie)
func getTokenFromRequest(c *gin.Context) string {
	// أولاً: التحقق من Authorization header (للإدارة)
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) == 2 && tokenParts[0] == "Bearer" {
			return tokenParts[1]
		}
	}
	
	// ثانياً: التحقق من HttpOnly cookie (للعملاء)
	if cookie, err := c.Cookie("access_token"); err == nil && cookie != "" {
		return cookie
	}
	
	return ""
}

// AuthMiddleware middleware للمصادقة (يدعم HttpOnly cookies و Authorization headers)
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := getTokenFromRequest(c)
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"message": "No valid token found in Authorization header or cookies",
			})
			c.Abort()
			return
		}
		
		// التحقق من صحة التوكن باستخدام utils.VerifyJWT
		claims, err := utils.VerifyJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token",
				"message": err.Error(),
			})
			c.Abort()
			return
		}
		
		// استخراج معرف المستخدم من الـ claims
		userIDStr, ok := claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token claims",
			})
			c.Abort()
			return
		}
		
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid user ID in token",
			})
			c.Abort()
			return
		}
		
		// التحقق من وجود المستخدم في قاعدة البيانات
		var user models.User
		if err := config.DB.Where("id = ? AND is_active = ?", userID, true).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not found or inactive",
			})
			c.Abort()
			return
		}
		
		// إضافة معلومات المستخدم إلى السياق
		c.Set("user", &user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		c.Set("token_string", tokenString)
		
		c.Next()
	}
}

// AdminMiddleware middleware للتحقق من الصلاحيات الإدارية
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
			})
			c.Abort()
			return
		}
		
		userObj := user.(*models.User)
		if !userObj.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin access required",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// SuperAdminMiddleware middleware للتحقق من صلاحيات الإداري العام
func SuperAdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
			})
			c.Abort()
			return
		}
		
		userObj := user.(*models.User)
		if !userObj.IsSuperAdmin() {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Super admin access required",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// OptionalAuthMiddleware middleware اختياري للمصادقة (يدعم HttpOnly cookies و Authorization headers)
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := getTokenFromRequest(c)
		if tokenString == "" {
			c.Next()
			return
		}
		
		// التحقق من صحة التوكن باستخدام utils.VerifyJWT
		claims, err := utils.VerifyJWT(tokenString)
		if err != nil {
			c.Next()
			return
		}
		
		// استخراج معرف المستخدم من الـ claims
		userIDStr, ok := claims["user_id"].(string)
		if !ok {
			c.Next()
			return
		}
		
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			c.Next()
			return
		}
		
		var user models.User
		if err := config.DB.Where("id = ? AND is_active = ?", userID, true).First(&user).Error; err != nil {
			c.Next()
			return
		}
		
		c.Set("user", &user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		c.Set("token_string", tokenString)
		
		c.Next()
	}
}

