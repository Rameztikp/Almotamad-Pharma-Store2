package handlers

import (
    "net/http"
    "sort"
    "time"

    "pharmacy-backend/config"
    "pharmacy-backend/models"

    "github.com/gin-gonic/gin"
)

// DashboardStats represents the statistics shown on the admin dashboard
type DashboardStats struct {
    TotalOrders    int64   `json:"total_orders"`
    RetailOrders   int64   `json:"retail_orders"`
    WholesaleOrders int64  `json:"wholesale_orders"`
    TotalCustomers int64   `json:"total_customers"`
    TotalProducts  int64   `json:"total_products"`
    TotalSales     float64 `json:"total_sales"`
    PendingOrders  int64   `json:"pending_orders"`
    OutOfStock     int64   `json:"out_of_stock"`
    MonthlySales   []MonthlySalesEntry `json:"monthly_sales"`
    TopProducts    []TopProduct        `json:"top_products"`
    OrderStatus    []StatusCount       `json:"order_status"`
}

// MonthlySalesEntry represents aggregated sales per month
type MonthlySalesEntry struct {
    Month       string  `json:"month"`
    TotalSales  float64 `json:"total_sales"`
    OrderCount  int64   `json:"order_count"`
}

// TopProduct represents top-selling products
type TopProduct struct {
    ProductID   string  `json:"product_id"`
    Name        string  `json:"name"`
    SoldCount   int64   `json:"sold_count"`
    TotalAmount float64 `json:"total_amount"`
}

// StatusCount represents order count per status
type StatusCount struct {
    Status string `json:"status"`
    Count  int64  `json:"count"`
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
    // Aggregations
    var totalOrders int64
    var retailOrders int64
    var wholesaleOrders int64
    var totalCustomers int64
    var totalProducts int64
    var totalSales float64
    var pendingOrders int64
    var outOfStock int64

    // Total orders
    config.DB.Model(&models.Order{}).Count(&totalOrders)

    // Retail orders: count distinct orders that include at least one retail product
    config.DB.Model(&models.Order{}).
        Joins("JOIN order_items oi ON oi.order_id = orders.id").
        Joins("JOIN products p ON p.id = oi.product_id").
        Where("p.\"type\" = ?", string(models.ProductTypeRetail)).
        Select("orders.id").Distinct("orders.id").Count(&retailOrders)

    // Wholesale orders: count distinct orders that include at least one wholesale product
    config.DB.Model(&models.Order{}).
        Joins("JOIN order_items oi ON oi.order_id = orders.id").
        Joins("JOIN products p ON p.id = oi.product_id").
        Where("p.\"type\" = ?", string(models.ProductTypeWholesale)).
        Select("orders.id").Distinct("orders.id").Count(&wholesaleOrders)

    // Total customers (role = customer)
    config.DB.Model(&models.User{}).Where("role = ?", models.RoleCustomer).Count(&totalCustomers)

    // Total products
    config.DB.Model(&models.Product{}).Count(&totalProducts)

    // Total sales: sum of orders with payment_status = 'paid'
    config.DB.Model(&models.Order{}).
        Where("payment_status = ?", models.PaymentStatusPaid).
        Select("COALESCE(SUM(total_amount), 0)").
        Scan(&totalSales)

    // Pending orders
    config.DB.Model(&models.Order{}).Where("status = ?", models.OrderStatusPending).Count(&pendingOrders)

    // Out of stock products
    config.DB.Model(&models.Product{}).Where("stock_quantity <= 0").Count(&outOfStock)

    // Monthly sales for last 12 months
    type monthlyRow struct {
        Month time.Time
        Total float64
        Cnt   int64
    }
    var monthly []monthlyRow
    twelveMonthsAgo := time.Now().AddDate(0, -11, 0)
    config.DB.Table("orders").
        Where("payment_status = ? AND created_at >= ?", models.PaymentStatusPaid, twelveMonthsAgo).
        Select("date_trunc('month', created_at) AS month, COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS cnt").
        Group("month").
        Order("month").
        Scan(&monthly)

    monthlySales := make([]MonthlySalesEntry, 0, len(monthly))
    for _, r := range monthly {
        monthlySales = append(monthlySales, MonthlySalesEntry{
            Month:      r.Month.Format("2006-01"),
            TotalSales: r.Total,
            OrderCount: r.Cnt,
        })
    }

    // Top products (by quantity) limited to 10
    var topProducts []TopProduct
    config.DB.Table("order_items").
        Select("order_items.product_id as product_id, products.name as name, COALESCE(SUM(order_items.quantity),0) as sold_count, COALESCE(SUM(order_items.total_price),0) as total_amount").
        Joins("JOIN orders ON orders.id = order_items.order_id").
        Joins("JOIN products ON products.id = order_items.product_id").
        Where("orders.payment_status = ?", models.PaymentStatusPaid).
        Group("order_items.product_id, products.name").
        Order("sold_count DESC").
        Limit(10).
        Scan(&topProducts)

    // Order status distribution
    type statusRow struct {
        Status string
        Cnt    int64
    }
    var statusRows []statusRow
    config.DB.Table("orders").
        Select("status, COUNT(*) as cnt").
        Group("status").
        Scan(&statusRows)

    orderStatus := make([]StatusCount, 0, len(statusRows))
    for _, r := range statusRows {
        orderStatus = append(orderStatus, StatusCount{Status: r.Status, Count: r.Cnt})
    }

    stats := DashboardStats{
        TotalOrders:    totalOrders,
        RetailOrders:   retailOrders,
        WholesaleOrders: wholesaleOrders,
        TotalCustomers: totalCustomers,
        TotalProducts:  totalProducts,
        TotalSales:     totalSales,
        PendingOrders:  pendingOrders,
        OutOfStock:     outOfStock,
        MonthlySales:   monthlySales,
        TopProducts:    topProducts,
        OrderStatus:    orderStatus,
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
    // Build activities from latest orders, users, and products
    var activities []Activity

    // Recent orders
    var recentOrders []models.Order
    config.DB.Order("created_at DESC").Limit(10).Find(&recentOrders)
    for _, o := range recentOrders {
        desc := "تم إنشاء طلب جديد"
        if o.OrderNumber != "" {
            desc = "تم إنشاء طلب جديد #" + o.OrderNumber
        }
        activities = append(activities, Activity{
            ID:          o.ID.String(),
            Description: desc,
            Timestamp:   o.CreatedAt,
            IsNew:       time.Since(o.CreatedAt) <= 24*time.Hour,
        })
    }

    // Recent users
    var recentUsers []models.User
    config.DB.Order("created_at DESC").Limit(5).Find(&recentUsers)
    for _, u := range recentUsers {
        activities = append(activities, Activity{
            ID:          u.ID.String(),
            Description: "تم تسجيل مستخدم جديد: " + u.FullName,
            Timestamp:   u.CreatedAt,
            IsNew:       time.Since(u.CreatedAt) <= 24*time.Hour,
        })
    }

    // Recent product updates
    var recentProducts []models.Product
    config.DB.Order("updated_at DESC").Limit(5).Find(&recentProducts)
    for _, p := range recentProducts {
        activities = append(activities, Activity{
            ID:          p.ID.String(),
            Description: "تم تحديث المنتج: " + p.Name,
            Timestamp:   p.UpdatedAt,
            IsNew:       time.Since(p.UpdatedAt) <= 24*time.Hour,
        })
    }

    // Sort by timestamp desc and limit to 20
    sort.Slice(activities, func(i, j int) bool { return activities[i].Timestamp.After(activities[j].Timestamp) })
    if len(activities) > 20 {
        activities = activities[:20]
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    activities,
    })
}
