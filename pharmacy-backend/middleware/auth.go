package middleware

import (
	"net/http"
	"strings"
	"time"
	"pharmacy-backend/models"
	"pharmacy-backend/config"
	
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

var jwtSecret = []byte("your-secret-key-change-this-in-production")

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
	return token.SignedString(jwtSecret)
}

// ValidateToken التحقق من صحة JWT token
func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	
	if err != nil {
		return nil, err
	}
	
	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	
	return claims, nil
}

// AuthMiddleware middleware للمصادقة
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header is required",
			})
			c.Abort()
			return
		}
		
		// التحقق من تنسيق Bearer token
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			c.Abort()
			return
		}
		
		tokenString := tokenParts[1]
		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token",
			})
			c.Abort()
			return
		}
		
		// التحقق من وجود المستخدم في قاعدة البيانات
		var user models.User
		if err := config.DB.Where("id = ? AND is_active = ?", claims.UserID, true).First(&user).Error; err != nil {
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

// OptionalAuthMiddleware middleware اختياري للمصادقة
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}
		
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.Next()
			return
		}
		
		tokenString := tokenParts[1]
		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.Next()
			return
		}
		
		var user models.User
		if err := config.DB.Where("id = ? AND is_active = ?", claims.UserID, true).First(&user).Error; err != nil {
			c.Next()
			return
		}
		
		c.Set("user", &user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		
		c.Next()
	}
}

