package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CSRFConfig إعدادات CSRF
type CSRFConfig struct {
	TokenLength    int
	CookieName     string
	HeaderName     string
	CookiePath     string
	CookieSecure   bool
	CookieSameSite http.SameSite
}

// DefaultCSRFConfig الإعدادات الافتراضية
var DefaultCSRFConfig = CSRFConfig{
	TokenLength:    32,
	CookieName:     "csrf_token",
	HeaderName:     "X-CSRF-Token",
	CookiePath:     "/",
	CookieSecure:   gin.Mode() == gin.ReleaseMode,
	CookieSameSite: http.SameSiteStrictMode,
}

// generateCSRFToken إنشاء CSRF token عشوائي
func generateCSRFToken(length int) (string, error) {
	bytes := make([]byte, length)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// CSRFProtection middleware للحماية من CSRF
func CSRFProtection() gin.HandlerFunc {
	return CSRFProtectionWithConfig(DefaultCSRFConfig)
}

// CSRFProtectionWithConfig CSRF protection مع إعدادات مخصصة
func CSRFProtectionWithConfig(config CSRFConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// تجاهل طلبات GET, HEAD, OPTIONS
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// الحصول على التوكن من الكوكيز
		cookieToken, err := c.Cookie(config.CookieName)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "CSRF token مفقود",
				"error":   "csrf_token_missing",
			})
			c.Abort()
			return
		}

		// الحصول على التوكن من الهيدر
		headerToken := c.GetHeader(config.HeaderName)
		if headerToken == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "CSRF token مفقود في الهيدر",
				"error":   "csrf_header_missing",
			})
			c.Abort()
			return
		}

		// مقارنة التوكنات
		if cookieToken != headerToken {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "CSRF token غير صحيح",
				"error":   "csrf_token_invalid",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SetCSRFToken إعداد CSRF token في الكوكيز
func SetCSRFToken() gin.HandlerFunc {
	return SetCSRFTokenWithConfig(DefaultCSRFConfig)
}

// SetCSRFTokenWithConfig إعداد CSRF token مع إعدادات مخصصة
func SetCSRFTokenWithConfig(config CSRFConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// التحقق من وجود توكن موجود
		existingToken, err := c.Cookie(config.CookieName)
		if err == nil && existingToken != "" {
			// إضافة التوكن إلى الاستجابة للعميل
			c.Header("X-CSRF-Token", existingToken)
			c.Next()
			return
		}

		// إنشاء توكن جديد
		token, err := generateCSRFToken(config.TokenLength)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "خطأ في إنشاء CSRF token",
				"error":   "csrf_generation_failed",
			})
			c.Abort()
			return
		}

		// إعداد الكوكيز
		c.SetCookie(
			config.CookieName,
			token,
			3600, // ساعة واحدة
			config.CookiePath,
			"",
			config.CookieSecure,
			false, // يجب أن يكون accessible للجافاسكريبت
		)

		// إضافة التوكن إلى الهيدر
		c.Header("X-CSRF-Token", token)

		c.Next()
	}
}

// CSRFTokenEndpoint endpoint للحصول على CSRF token
func CSRFTokenEndpoint(c *gin.Context) {
	token, err := c.Cookie(DefaultCSRFConfig.CookieName)
	if err != nil {
		// إنشاء توكن جديد
		newToken, genErr := generateCSRFToken(DefaultCSRFConfig.TokenLength)
		if genErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "خطأ في إنشاء CSRF token",
				"error":   "csrf_generation_failed",
			})
			return
		}

		// إعداد الكوكيز
		c.SetCookie(
			DefaultCSRFConfig.CookieName,
			newToken,
			3600,
			DefaultCSRFConfig.CookiePath,
			"",
			DefaultCSRFConfig.CookieSecure,
			false,
		)

		token = newToken
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   token,
	})
}

// SkipCSRFForAPI تجاهل CSRF للمسارات المحددة
func SkipCSRFForAPI(skipPaths ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		for _, skipPath := range skipPaths {
			if strings.HasPrefix(path, skipPath) {
				c.Next()
				return
			}
		}

		// تطبيق CSRF protection
		CSRFProtection()(c)
	}
}
