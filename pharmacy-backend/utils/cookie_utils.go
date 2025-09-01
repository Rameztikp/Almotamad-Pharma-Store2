package utils

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// CookieSecurity determines the appropriate SameSite and Secure settings for cookies
// based on the application's environment and configuration.
// It returns:
//   - sameSite: The SameSite attribute value for the cookie
//   - secure: Whether the Secure flag should be set for the cookie
//
// In production or when FRONTEND_ORIGIN is set, it uses SameSite=None and Secure=true
// In development, it uses SameSite=Strict and Secure=false
func CookieSecurity() (sameSite http.SameSite, secure bool) {
    useCrossSite := os.Getenv("FRONTEND_ORIGIN") != ""
    sameSite = http.SameSiteStrictMode
    secure = gin.Mode() == gin.ReleaseMode
    if useCrossSite {
        sameSite = http.SameSiteNoneMode // للسماح cross-site
        secure = true                    // Required with SameSite=None
    }
    return sameSite, secure
}
