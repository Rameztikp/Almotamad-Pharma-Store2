package handlers

import (
	"net/http"
	"os"
	"path"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func UploadFiles(c *gin.Context) {
	// Get the files from the request
	files, err := c.FormFile("images")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No files were uploaded",
		})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.Mkdir(uploadDir, 0755)
	}

	// Generate a unique filename
	fileExtension := filepath.Ext(files.Filename)
	filename := uuid.New().String() + fileExtension
	
	// Save the file
	filePath := path.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(files, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save uploaded file",
		})
		return
	}

	// Return the uploaded file information
	c.JSON(http.StatusOK, gin.H{
		"filename": filename,
		"path":     "/uploads/" + filename,
		"size":     files.Size,
	})
}
