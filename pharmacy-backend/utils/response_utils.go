package utils

import (
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// RespondWithError sends a JSON error response with the given status code and message
func RespondWithError(c *gin.Context, code int, message string) {
	c.JSON(code, gin.H{
		"success": false,
		"error":   message,
	})
}

// RespondWithJSON sends a JSON response with the given status code and data
func RespondWithJSON(c *gin.Context, code int, data interface{}) {
	response := gin.H{"success": true}

	switch v := data.(type) {
	case gin.H:
		for key, value := range v {
			response[key] = value
		}
	default:
		response["data"] = data
	}

	c.JSON(code, response)
}

// CheckPasswordHash compares a plaintext password with a hashed password
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
