package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// DashboardStats represents the statistics shown on the admin dashboard
type DashboardStats struct {
	TotalOrders    int64   `json:"total_orders"`
	TotalCustomers int64   `json:"total_customers"`
	TotalProducts  int64   `json:"total_products"`
	TotalSales     float64 `json:"total_sales"`
}

// GetDashboardStats returns statistics for the admin dashboard
// @Summary Get dashboard statistics
// @Description Get statistics for the admin dashboard
// @Tags Admin - Dashboard
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /admin/dashboard/stats [get]
func GetDashboardStats(c *gin.Context) {
	// In a real application, these would be fetched from the database
	// For now, we'll return mock data
	stats := DashboardStats{
		TotalOrders:    1254,
		TotalCustomers: 842,
		TotalProducts:  356,
		TotalSales:     152487.65,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// Activity represents a recent activity in the system
type Activity struct {
	ID          string    `json:"id"`
	Description string    `json:"description"`
	Timestamp   time.Time `json:"timestamp"`
	IsNew       bool      `json:"is_new"`
}

// GetRecentActivities returns recent activities for the admin dashboard
// @Summary Get recent activities
// @Description Get recent activities for the admin dashboard
// @Tags Admin - Dashboard
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /admin/activities/recent [get]
func GetRecentActivities(c *gin.Context) {
	// In a real application, these would be fetched from the database
	recentActivities := []Activity{
		{
			ID:          "1",
			Description: "تم إنشاء طلب جديد #1005",
			Timestamp:   time.Now().Add(-5 * time.Minute),
			IsNew:       true,
		},
		{
			ID:          "2",
			Description: "تم تسجيل مستخدم جديد",
			Timestamp:   time.Now().Add(-2 * time.Hour),
			IsNew:       true,
		},
		{
			ID:          "3",
			Description: "تم تحديث المنتج: بانادول اكسترا",
			Timestamp:   time.Now().Add(-1 * time.Hour),
			IsNew:       false,
		},
		{
			ID:          "4",
			Description: "تم تعطيل حساب مستخدم",
			Timestamp:   time.Now().Add(-3 * time.Hour),
			IsNew:       false,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    recentActivities,
	})
}
