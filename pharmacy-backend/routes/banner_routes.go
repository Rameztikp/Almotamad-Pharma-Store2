package routes

import (
	"pharmacy-backend/handlers"
	"pharmacy-backend/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterBannerRoutes registers all routes related to banners
func RegisterBannerRoutes(api *gin.RouterGroup, h *handlers.BannerHandler) {
	// Public routes for banners
	bannersPublic := api.Group("/banners")
	{
		bannersPublic.GET("", h.GetBanners)
		// bannersPublic.POST("/:id/click", h.IncrementBannerClick) // TODO: Re-implement or remove click tracking
	}

	// Admin routes for banners
	bannersAdmin := api.Group("/admin")
	bannersAdmin.Use(middleware.AuthMiddleware(), middleware.AdminMiddleware())
	{
		bannersAdmin.GET("/banners", h.GetBanners) // Add a dedicated route for admin to get banners
		bannersAdmin.POST("/banners", h.CreateBanner)
		bannersAdmin.PUT("/banners/:id", h.UpdateBanner)
		bannersAdmin.DELETE("/banners/:id", h.DeleteBanner)
		bannersAdmin.POST("/banners/reorder", h.ReorderBanners)
		// bannersAdmin.POST("/banners/upload", h.UploadImage) // Deprecated: Use generic /admin/uploads endpoint
	}
}
