// SetCookie sets a cookie with the given options and applies security flags.
func SetCookie(c *gin.Context, name, value string, maxAge int, path string, httpOnly bool) {
	sec := CookieSecurity()
	c.SetCookie(name, value, maxAge, "", path, sec.Secure, httpOnly)
}

// SetAuthCookies sets access & refresh cookies for client or admin.
func SetAuthCookies(c *gin.Context, accessName, accessVal, refreshName, refreshVal string, path string, isClient bool) {
	sec := CookieSecurity()
	accessMaxAge := 900
	refreshMaxAge := 30 * 24 * 3600
	c.SetCookie(accessName, accessVal, accessMaxAge, "", path, sec.Secure, true)
	c.SetCookie(refreshName, refreshVal, refreshMaxAge, "", path, sec.Secure, true)
}

// ClearAuthCookies clears access & refresh cookies.
func ClearAuthCookies(c *gin.Context, isClient bool) {
	path := "/"
	if !isClient {
		path = "/api/v1"
	}
	c.SetCookie("client_access_token", "", -1, "", "/", CookieSecurity().Secure, true)
	c.SetCookie("client_refresh_token", "", -1, "", "/", CookieSecurity().Secure, true)
	c.SetCookie("admin_access_token", "", -1, "", path, CookieSecurity().Secure, true)
	c.SetCookie("admin_refresh_token", "", -1, "", path, CookieSecurity().Secure, true)
}

func CookieSecurity() (sec struct{ SameSite http.SameSite; Secure bool }) {
	origin := os.Getenv("FRONTEND_ORIGIN")
	if origin != "" {
		sec.SameSite = http.SameSiteNoneMode
		sec.Secure = true
	} else {
		sec.SameSite = http.SameSiteLaxMode
		sec.Secure = false
	}
	return
}