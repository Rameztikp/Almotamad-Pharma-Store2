package handlers

import (
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	"time"

	"github.com/gin-gonic/gin"
)

// SalesReportResponse represents the sales report response
type SalesReportResponse struct {
	Period         string  `json:"period"`
	TotalSales     float64 `json:"total_sales"`
	TotalOrders    int64   `json:"total_orders"`
	TotalProducts  int64   `json:"total_products"`
	TotalCustomers int64   `json:"total_customers"`
}

// GetSalesReport generates sales report for a specific period
func GetSalesReport(c *gin.Context) {
	// Get query parameters
	startDateStr := c.DefaultQuery("start_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	endDateStr := c.DefaultQuery("end_date", time.Now().Format("2006-01-02"))

	// Parse dates
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid start date format. Use YYYY-MM-DD", err.Error())
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid end date format. Use YYYY-MM-DD", err.Error())
		return
	}

	// Calculate total sales
	var totalSales float64
	if err := config.DB.Model(&models.Order{}).
		Where("status = ? AND created_at BETWEEN ? AND ?", "completed", startDate, endDate).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&totalSales).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to calculate total sales", err.Error())
		return
	}

	// Count total orders
	var totalOrders int64
	if err := config.DB.Model(&models.Order{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&totalOrders).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count total orders", err.Error())
		return
	}

	// Count total products sold
	var totalProducts int64
	err = config.DB.Model(&models.OrderItem{}).
		Joins("JOIN orders ON order_items.order_id = orders.id").
		Where("orders.created_at BETWEEN ? AND ?", startDate, endDate).
		Select("COALESCE(SUM(quantity), 0)").
		Scan(&totalProducts).Error

	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count total products sold", err.Error())
		return
	}

	// Count unique customers
	var totalCustomers int64
	if err := config.DB.Model(&models.Order{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Distinct("user_id").
		Count(&totalCustomers).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count total customers", err.Error())
		return
	}

	// Prepare response
	response := SalesReportResponse{
		Period:         startDate.Format("2006-01-02") + " to " + endDate.Format("2006-01-02"),
		TotalSales:     totalSales,
		TotalOrders:    totalOrders,
		TotalProducts:  totalProducts,
		TotalCustomers: totalCustomers,
	}

	utils.SuccessResponse(c, "Sales report generated successfully", response)
}

// ProductPerformance represents product performance metrics
type ProductPerformance struct {
	ProductID   string  `json:"product_id"`
	Name        string  `json:"name"`
	SoldCount   int64   `json:"sold_count"`
	TotalAmount float64 `json:"total_amount"`
}

// GetProductPerformanceReport generates product performance report
func GetProductPerformanceReport(c *gin.Context) {
	// Get query parameters
	startDateStr := c.DefaultQuery("start_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	endDateStr := c.DefaultQuery("end_date", time.Now().Format("2006-01-02"))

	// Parse dates
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid start date format. Use YYYY-MM-DD", err.Error())
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid end date format. Use YYYY-MM-DD", err.Error())
		return
	}

	// Get top performing products
	var products []ProductPerformance
	err = config.DB.Table("order_items").
		Select(
			"products.id as product_id,\n			products.name as name,\n			COALESCE(SUM(order_items.quantity), 0) as sold_count,\n			COALESCE(SUM(order_items.price * order_items.quantity), 0) as total_amount",
		).
		Joins("JOIN products ON order_items.product_id = products.id").
		Joins("JOIN orders ON order_items.order_id = orders.id").
		Where("orders.created_at BETWEEN ? AND ?", startDate, endDate).
		Group("products.id, products.name").
		Order("sold_count DESC").
		Limit(50).
		Find(&products).Error

	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to generate product performance report", err.Error())
		return
	}

	utils.SuccessResponse(c, "Product performance report generated successfully", products)
}

// InventoryReport represents inventory status report
type InventoryReport struct {
	ProductID     string  `json:"product_id"`
	Name          string  `json:"name"`
	CurrentStock  int     `json:"current_stock"`
	MinStockLevel int     `json:"min_stock_level"`
	Status        string  `json:"status"`
	LastRestocked string  `json:"last_restocked,omitempty"`
}

// GetInventoryReport generates inventory status report
func GetInventoryReport(c *gin.Context) {
	// Get all products with low stock
	var lowStockProducts []models.Product
	if err := config.DB.Where("stock_quantity <= min_stock_level").Find(&lowStockProducts).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch low stock products", err.Error())
		return
	}

	// Prepare response
	var report []InventoryReport
	for _, p := range lowStockProducts {
		status := "In Stock"
		if p.StockQuantity == 0 {
			status = "Out of Stock"
		} else if p.StockQuantity <= p.MinStockLevel {
			status = "Low Stock"
		}

		report = append(report, InventoryReport{
			ProductID:     p.ID.String(),
			Name:          p.Name,
			CurrentStock:  p.StockQuantity,
			MinStockLevel: p.MinStockLevel,
			Status:        status,
		})
	}

	utils.SuccessResponse(c, "Inventory report generated successfully", report)
}
