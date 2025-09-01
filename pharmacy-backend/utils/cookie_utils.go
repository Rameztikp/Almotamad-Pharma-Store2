package utils

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// CookieSecurity يحدد إعدادات SameSite و Secure المناسبة للكوكيز
// بناءً على بيئة التطبيق والإعدادات
// القيم المعادة:
//   - sameSite: قيمة خاصية SameSite للكوكيز
//   - secure: ما إذا كان يجب تعيين خاصية Secure للكوكيز
//
// في بيئة الإنتاج أو عند تعيين CORS_ALLOW_ORIGINS مع HTTPS، يستخدم SameSite=None و Secure=true
// في بيئة التطوير، يستخدم SameSite=Lax و Secure=false
func CookieSecurity() (http.SameSite, bool) {
    // في الإنتاج، استخدم SameSite=None مع Secure=true للـ cross-origin cookies
    if os.Getenv("GIN_MODE") == gin.ReleaseMode {
        // في الإنتاج، استخدم دائماً SameSite=None مع Secure=true للـ cross-origin
        return http.SameSiteNoneMode, true
    }
    
    // إعدادات التطوير
    return http.SameSiteLaxMode, false
}

// SetAuthCookies sets access and refresh tokens as HTTP-only cookies
func SetAuthCookies(c *gin.Context, accessToken, refreshToken string, isAdmin bool) {
	sameSite, secure := CookieSecurity()
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	
	// للكوكيز عبر النطاقات المختلفة، نحتاج إعداد domain فارغ
	// هذا يجعل المتصفح يقبل الكوكيز من النطاق الحالي
	// ولا يحاول تطبيقها على نطاقات أخرى
	if os.Getenv("GIN_MODE") == gin.ReleaseMode {
		// في الإنتاج، استخدم domain فارغ للسماح للمتصفح بقبول الكوكيز
		cookieDomain = ""
	}
	
	prefix := "client_"
	if isAdmin {
		prefix = "admin_"
	}

	// Set access token cookie (HttpOnly)
	c.SetSameSite(sameSite)
	c.SetCookie(
		prefix+"access_token",
		accessToken,
		int((24 * time.Hour).Seconds()),
		"/",
		cookieDomain,
		secure,
		true, // HttpOnly
	)

	// Set refresh token cookie (HttpOnly)
	c.SetSameSite(sameSite)
	c.SetCookie(
		prefix+"refresh_token",
		refreshToken,
		int((7 * 24 * time.Hour).Seconds()), // 7 days
		"/",
		cookieDomain,
		secure,
		true, // HttpOnly
	)

	// إضافة كوكيز إضافية للتوافق مع الواجهة الأمامية
	// هذه الكوكيز ليست HttpOnly لتمكين الواجهة الأمامية من قراءتها
	c.SetCookie(
		prefix+"auth_status",
		"authenticated",
		int((24 * time.Hour).Seconds()),
		"/",
		cookieDomain,
		secure,
		false, // ليس HttpOnly - يمكن للواجهة الأمامية قراءتها
	)
	
	// إضافة logging للتأكد من إعداد الكوكيز
	log.Printf("🍪 Setting auth cookies: domain=%s, secure=%v, sameSite=%v, prefix=%s, host=%s", 
		cookieDomain, secure, sameSite, prefix, c.Request.Host)
	
	// Log individual cookie settings
	log.Printf("🍪 Access token cookie: %saccess_token", prefix)
	log.Printf("🍪 Refresh token cookie: %srefresh_token", prefix)
	log.Printf("🍪 Auth status cookie: %sauth_status", prefix)
}

// ClearAuthCookies removes all auth cookies
func ClearAuthCookies(c *gin.Context) {
	sameSite, secure := CookieSecurity()
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	
	// في الإنتاج، استخدم domain فارغ للسماح للمتصفح بقبول الكوكيز
	if os.Getenv("GIN_MODE") == gin.ReleaseMode {
		cookieDomain = ""
	}

	// Clear all possible auth cookies
	cookies := []string{
		"client_access_token",
		"client_refresh_token",
		"admin_access_token",
		"admin_refresh_token",
		"client_auth_status",
		"admin_auth_status",
	}

	for _, name := range cookies {
		c.SetSameSite(sameSite)
		c.SetCookie(
			name,
			"",
			-1, // Expire immediately
			"/",
			cookieDomain,
			secure,
			strings.Contains(name, "auth_status") == false, // auth_status cookies are not httpOnly
		)
	}
}

// GetRefreshTokenFromRequest tries to get refresh token from cookies first, then from JSON body
func GetRefreshTokenFromRequest(c *gin.Context) (string, bool) {
	// Try to get from cookies first (client then admin)
	if refreshToken, err := c.Cookie("client_refresh_token"); err == nil && refreshToken != "" {
		return refreshToken, true
	}
	if refreshToken, err := c.Cookie("admin_refresh_token"); err == nil && refreshToken != "" {
		return refreshToken, true
	}

	// Fall back to JSON body
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err == nil && req.RefreshToken != "" {
		return req.RefreshToken, true
	}

	return "", false
}
