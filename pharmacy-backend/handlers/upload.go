package handlers

import (
	"context"
	"net/http"
	"pharmacy-backend/config"

	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func UploadFiles(c *gin.Context) {
	// Check if Cloudinary is configured
	if config.Cld == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cloudinary is not configured"})
		return
	}

	file, err := c.FormFile("images")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file was uploaded"})
		return
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open uploaded file"})
		return
	}
	defer src.Close()

	// Generate a unique public ID for the image
	publicID := uuid.New().String()

	// Upload the file to Cloudinary
	uploadParams := uploader.UploadParams{
		PublicID: publicID,
		Folder:   "pharmacy-backend/products", // Optional: organize uploads in a folder
	}

	uploadResult, err := config.Cld.Upload.Upload(context.Background(), src, uploadParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file to Cloudinary", "details": err.Error()})
		return
	}

	// Return the uploaded file information from Cloudinary
	c.JSON(http.StatusOK, gin.H{
		"public_id": uploadResult.PublicID,
		"url":       uploadResult.SecureURL,
		"path":      uploadResult.SecureURL, // For backward compatibility if 'path' is used
		"filename":  file.Filename,
		"size":      file.Size,
	})
}
