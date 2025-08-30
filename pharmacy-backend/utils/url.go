package utils

import (
	"os"
	"strings"
)

// ToAbsoluteURL converts a relative path to an absolute URL based on the APP_URL environment variable.
func ToAbsoluteURL(path string) string {
	// If the path is already an absolute URL, return it as is.
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}

	// If the path is empty or doesn't start with a slash (e.g., not a server-managed file), return it.
	if path == "" || !strings.HasPrefix(path, "/") {
		return path
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		// Fallback if APP_URL is not set, though it's not ideal.
		appURL = "http://localhost:8080"
	}

	// Trim any trailing slash from appURL to prevent double slashes.
	appURL = strings.TrimSuffix(appURL, "/")

	return appURL + path
}
