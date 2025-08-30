package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"pharmacy-backend/models"

)

// BannerHandler holds the database connection
type BannerHandler struct {
	DB *gorm.DB
}

// NewBannerHandler creates a new BannerHandler
func NewBannerHandler(db *gorm.DB) *BannerHandler {
	return &BannerHandler{DB: db}
}

// GetBanners retrieves all active and scheduled banners, optionally filtered by audience.
// It's a public endpoint.
func (h *BannerHandler) GetBanners(c *gin.Context) {
	var banners []models.Banner
	query := h.DB.Where("is_active = ?", true)

	now := time.Now()
	query = query.Where("starts_at IS NULL OR starts_at <= ?", now)
	query = query.Where("ends_at IS NULL OR ends_at >= ?", now)

	audience := c.Query("audience")
	if audience != "" {
		if audience != string(models.AudienceRetail) && audience != string(models.AudienceWholesale) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid audience specified"})
			return
		}
		// A specific audience should also see banners targeted for 'all'
		query = query.Where("audience = ? OR audience = ?", audience, models.AudienceAll)
	}

	if err := query.Order(`"sort_order" asc, "updated_at" desc`).Find(&banners).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve banners"})
		return
	}

	c.JSON(http.StatusOK, banners)
}

// GetAdminBanners retrieves all banners for the admin panel.
func (h *BannerHandler) GetAdminBanners(c *gin.Context) {
	var banners []models.Banner

	if err := h.DB.Order(`"sort_order" asc, "created_at" desc`).Find(&banners).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve banners"})
		return
	}

	c.JSON(http.StatusOK, banners)
}

// CreateBannerInput represents the input for creating a banner
type CreateBannerInput struct {
	Audience    models.AudienceType `json:"audience" binding:"required,oneof=wholesale retail all"`
	Title       string              `json:"title" binding:"required,max=150"`
	Subtitle    string              `json:"subtitle,omitempty" binding:"max=255"`
	ImageURL    string              `json:"image_url" binding:"required,url,max=600"`
	LinkURL     string              `json:"link_url,omitempty" binding:"omitempty,url,max=600"`
	AltText     string              `json:"alt_text" binding:"required,max=200"`
	DisplayMode string              `json:"display_mode,omitempty" binding:"omitempty,oneof=contain cover"`
	IsActive    *bool               `json:"is_active,omitempty"`
	SortOrder   *int                `json:"sort_order,omitempty"`
	StartsAt    *string             `json:"starts_at,omitempty"`
	EndsAt      *string             `json:"ends_at,omitempty"`
}

// CreateBanner creates a new banner. Admin only.
func (h *BannerHandler) CreateBanner(c *gin.Context) {
	var input CreateBannerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	banner := models.Banner{
		Audience:    input.Audience,
		Title:       input.Title,
		ImageURL:    input.ImageURL,
		AltText:     input.AltText,
		DisplayMode: models.DisplayModeType(input.DisplayMode),
		IsActive:    true, // Default
		SortOrder:   0,    // Default
	}

	if input.Subtitle != "" {
		banner.Subtitle = sql.NullString{String: input.Subtitle, Valid: true}
	}
	if input.LinkURL != "" {
		banner.LinkURL = sql.NullString{String: input.LinkURL, Valid: true}
	}
	if input.IsActive != nil {
		banner.IsActive = *input.IsActive
	}
	if input.SortOrder != nil {
		banner.SortOrder = *input.SortOrder
	}
	if input.DisplayMode == "" {
		banner.DisplayMode = models.DisplayContain // Default
	}

	// Handle time parsing
	if input.StartsAt != nil && *input.StartsAt != "" {
		if startsAt, err := time.Parse(time.RFC3339, *input.StartsAt); err == nil {
			banner.StartsAt = &startsAt
		}
	}
	if input.EndsAt != nil && *input.EndsAt != "" {
		if endsAt, err := time.Parse(time.RFC3339, *input.EndsAt); err == nil {
			banner.EndsAt = &endsAt
		}
	}

	if err := h.DB.Create(&banner).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create banner", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, banner)
}

// UpdateBannerInput represents the input for updating a banner
type UpdateBannerInput struct {
	Audience    *models.AudienceType `json:"audience,omitempty" binding:"omitempty,oneof=wholesale retail all"`
	Title       *string              `json:"title,omitempty" binding:"omitempty,max=150"`
	Subtitle    *string              `json:"subtitle,omitempty" binding:"omitempty,max=255"`
	ImageURL    *string              `json:"image_url,omitempty" binding:"omitempty,url,max=600"`
	LinkURL     *string              `json:"link_url,omitempty" binding:"omitempty,url,max=600"`
	AltText     *string              `json:"alt_text,omitempty" binding:"omitempty,max=200"`
	DisplayMode *string              `json:"display_mode,omitempty" binding:"omitempty,oneof=contain cover"`
	IsActive    *bool                `json:"is_active,omitempty"`
	SortOrder   *int                 `json:"sort_order,omitempty"`
	StartsAt    *string              `json:"starts_at,omitempty"`
	EndsAt      *string              `json:"ends_at,omitempty"`
}

// UpdateBanner updates an existing banner. Admin only.
func (h *BannerHandler) UpdateBanner(c *gin.Context) {
	var banner models.Banner
	id := c.Param("id")

	if err := h.DB.First(&banner, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Banner not found"})
		return
	}

	var input UpdateBannerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Audience != nil {
		banner.Audience = *input.Audience
	}
	if input.Title != nil {
		banner.Title = *input.Title
	}
	if input.Subtitle != nil {
		if *input.Subtitle == "" {
			banner.Subtitle = sql.NullString{Valid: false}
		} else {
			banner.Subtitle = sql.NullString{String: *input.Subtitle, Valid: true}
		}
	}
	if input.ImageURL != nil {
		banner.ImageURL = *input.ImageURL
	}
	if input.LinkURL != nil {
		if *input.LinkURL == "" {
			banner.LinkURL = sql.NullString{Valid: false}
		} else {
			banner.LinkURL = sql.NullString{String: *input.LinkURL, Valid: true}
		}
	}
	if input.AltText != nil {
		banner.AltText = *input.AltText
	}
	if input.DisplayMode != nil {
		banner.DisplayMode = models.DisplayModeType(*input.DisplayMode)
	}
	if input.IsActive != nil {
		banner.IsActive = *input.IsActive
	}
	if input.SortOrder != nil {
		banner.SortOrder = *input.SortOrder
	}

	// Handle time parsing
	if input.StartsAt != nil {
		if *input.StartsAt == "" {
			banner.StartsAt = nil
		} else if startsAt, err := time.Parse(time.RFC3339, *input.StartsAt); err == nil {
			banner.StartsAt = &startsAt
		}
	}
	if input.EndsAt != nil {
		if *input.EndsAt == "" {
			banner.EndsAt = nil
		} else if endsAt, err := time.Parse(time.RFC3339, *input.EndsAt); err == nil {
			banner.EndsAt = &endsAt
		}
	}

	if err := h.DB.Save(&banner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update banner"})
		return
	}

	c.JSON(http.StatusOK, banner)
}

// DeleteBanner deletes a banner. Admin only.
func (h *BannerHandler) DeleteBanner(c *gin.Context) {
	id := c.Param("id")

	if err := h.DB.Delete(&models.Banner{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete banner"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Banner deleted successfully"})
}

// ReorderBannersInput defines the input for reordering banners
type ReorderBannersInput struct {
	Banners []struct {
		ID    uint `json:"id"`
		Order int  `json:"sort_order"`
	} `json:"banners"`
}

// ReorderBanners updates the order of multiple banners. Admin only.
func (h *BannerHandler) ReorderBanners(c *gin.Context) {
	var input ReorderBannersInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := h.DB.Begin()
	for _, b := range input.Banners {
		if err := tx.Model(&models.Banner{}).Where("id = ?", b.ID).Update("sort_order", b.Order).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update order for banner %d", b.ID)})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Banners reordered successfully"})
}
