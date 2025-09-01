package utils

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// CookieSecurity يحدد إعدادات SameSite و Secure المناسبة للكوكيز
// بناءً على بيئة التطبيق والإعدادات
// القيم المعادة:
//   - sameSite: قيمة خاصية SameSite للكوكيز
//   - secure: ما إذا كان يجب تعيين خاصية Secure للكوكيز
//
// في بيئة الإنتاج أو عند تعيين FRONTEND_ORIGIN، يستخدم SameSite=None و Secure=true
// في بيئة التطوير، يستخدم SameSite=Lax و Secure=false
func CookieSecurity() (sameSite http.SameSite, secure bool) {
    // في بيئة الإنتاج أو عند وجود FRONTEND_ORIGIN، استخدم SameSite=None و Secure=true
    if os.Getenv("GIN_MODE") == gin.ReleaseMode || os.Getenv("FRONTEND_ORIGIN") != "" {
        return http.SameSiteNoneMode, true
    }
    // إعدادات التطوير
    return http.SameSiteLaxMode, false
}

// SetAuthCookies sets access and refresh tokens as HTTP-only cookies
func SetAuthCookies(c *gin.Context, accessToken, refreshToken string, isAdmin bool) {
	sameSite, secure := CookieSecurity()
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	
	prefix := "client_"
	if isAdmin {
		prefix = "admin_"
	}

	// Set access token cookie (short-lived)
	c.SetSameSite(sameSite)
	c.SetCookie(
		prefix+"access_token",
		accessToken,
		int((24 * time.Hour).Seconds()), // 24 hours
		"/",
		cookieDomain,
		secure,
		true, // httpOnly
	)

	// Set refresh token cookie (long-lived)
	c.SetCookie(
		prefix+"refresh_token",
		refreshToken,
		int((30 * 24 * time.Hour).Seconds()), // 30 days
		"/",
		cookieDomain,
		secure,
		true, // httpOnly
	)
}

// ClearAuthCookies removes all auth cookies
func ClearAuthCookies(c *gin.Context) {
	sameSite, secure := CookieSecurity()
	cookieDomain := os.Getenv("COOKIE_DOMAIN")

	// Clear all possible auth cookies
	cookies := []string{
		"client_access_token",
		"client_refresh_token",
		"admin_access_token",
		"admin_refresh_token",
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
			true, // httpOnly
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
