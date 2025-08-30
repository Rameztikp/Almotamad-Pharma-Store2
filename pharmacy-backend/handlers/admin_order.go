package handlers

import (
	"fmt"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/services"
	"pharmacy-backend/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetAllOrders الحصول على جميع الطلبات (Admin)
func GetAllOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	orderType := c.Query("order_type") // retail | wholesale (اختياري)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Build a base query for IDs to avoid DISTINCT with joined preloads
	baseIDsQuery := config.DB.Model(&models.Order{})
	if status != "" {
		baseIDsQuery = baseIDsQuery.Where("status = ?", status)
	}
	if orderType == string(models.ProductTypeRetail) || orderType == string(models.ProductTypeWholesale) {
		baseIDsQuery = baseIDsQuery.
			Joins("JOIN order_items oi ON oi.order_id = orders.id").
			Joins("JOIN products p ON p.id = oi.product_id").
			Where("p.\"type\" = ?", orderType)
	}

	// Count distinct order IDs (total)
	var total int64
	countDB := config.DB.Model(&models.Order{})
	if status != "" {
		countDB = countDB.Where("status = ?", status)
	}
	if orderType == string(models.ProductTypeRetail) || orderType == string(models.ProductTypeWholesale) {
		countDB = countDB.
			Joins("JOIN order_items oi ON oi.order_id = orders.id").
			Joins("JOIN products p ON p.id = oi.product_id").
			Where("p.\"type\" = ?", orderType)
	}
	if err := countDB.Select("orders.id").Distinct("orders.id").Count(&total).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count orders", err.Error())
		return
	}

	// Page through IDs using GROUP BY to avoid DISTINCT+ORDER BY issue in Postgres
	var orderIDs []uuid.UUID
	if err := baseIDsQuery.
		Select("orders.id").
		Group("orders.id").
		Order("MAX(orders.created_at) DESC").
		Limit(limit).
		Offset(offset).
		Pluck("orders.id", &orderIDs).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch orders", err.Error())
		return
	}

	// Short-circuit if no results for this page
	if len(orderIDs) == 0 {
		pagination := utils.CalculatePagination(page, limit, total)
		utils.PaginatedSuccessResponse(c, "Orders retrieved successfully", []models.Order{}, pagination)
		return
	}

	// Now load full orders with preloads for the selected IDs
	var orders []models.Order
	if err := config.DB.Model(&models.Order{}).
		Preload("User").
		Preload("OrderItems.Product").
		Preload("OrderTracking").
		Where("orders.id IN ?", orderIDs).
		Order("orders.created_at DESC").
		Find(&orders).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch orders", err.Error())
		return
	}

	pagination := utils.CalculatePagination(page, limit, total)
	utils.PaginatedSuccessResponse(c, "Orders retrieved successfully", orders, pagination)
}

// UpdateOrderStatusRequest بنية طلب تحديث حالة الطلب
type UpdateOrderStatusRequest struct {
	Status models.OrderStatus `json:"status" binding:"required,oneof=pending confirmed processing shipped delivered cancelled"`
}

// UpdateOrderStatus تحديث حالة الطلب (Admin)
func UpdateOrderStatus(c *gin.Context) {
	orderID := c.Param("id")
	orderUUID, err := uuid.Parse(orderID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid order ID", err.Error())
		return
	}
	
	var req UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	var order models.Order
	if err := config.DB.Where("id = ?", orderUUID).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Order not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch order", err.Error())
		}
		return
	}
	
	// تحديث الحالة
	order.Status = req.Status
	if err := config.DB.Save(&order).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update order status", err.Error())
		return
	}
	
	// إضافة سجل تتبع جديد
	tracking := models.OrderTracking{
		OrderID:     order.ID,
		Status:      string(req.Status),
		Description: fmt.Sprintf("تم تحديث حالة الطلب إلى: %s", req.Status),
		Timestamp:   time.Now(),
	}
	if err := config.DB.Create(&tracking).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to add order tracking", err.Error())
		return
	}

	// تحديد نوع الطلب (تجزئة أم جملة) بناءً على المنتجات
	var orderItems []models.OrderItem
	if err := config.DB.Preload("Product").Where("order_id = ?", order.ID).Find(&orderItems).Error; err == nil {
		isWholesaleOrder := false
		for _, item := range orderItems {
			if item.Product.Type == models.ProductTypeWholesale {
				isWholesaleOrder = true
				break
			}
		}
		
		// إنشاء إشعار للإدارة عن تحديث الطلب
		notificationService := services.NewNotificationService()
		var notificationType models.NotificationType
		var title, message string
		
		if isWholesaleOrder {
			notificationType = models.NotificationTypeAdminWholesaleOrder
			title = "تحديث طلب جملة"
			message = fmt.Sprintf("تم تحديث طلب الجملة رقم %s إلى حالة: %s", order.ID.String()[:8], req.Status)
		} else {
			notificationType = models.NotificationTypeAdminOrderUpdated
			title = "تحديث طلب تجزئة"
			message = fmt.Sprintf("تم تحديث طلب التجزئة رقم %s إلى حالة: %s", order.ID.String()[:8], req.Status)
		}
		
		adminMetadata := map[string]interface{}{
			"order_id":     order.ID.String(),
			"user_id":      order.UserID.String(),
			"old_status":   order.Status, // الحالة السابقة
			"new_status":   req.Status,
			"order_type":   map[bool]string{true: "wholesale", false: "retail"}[isWholesaleOrder],
			"updated_at":   time.Now(),
		}
		
		err = notificationService.CreateAdminNotification(
			notificationType,
			title,
			message,
			adminMetadata,
			&order.ID,
		)
		if err != nil {
			// لا نوقف العملية إذا فشل إنشاء الإشعار
			fmt.Printf("⚠️ فشل في إنشاء إشعار الإدارة لتحديث الطلب: %v", err)
		}
	}

	// بث إشعار تغيير حالة الطلب للمستخدم عبر SSE
	Notifier.BroadcastToUser(order.UserID, "order_status_updated", gin.H{
		"order_id":   order.ID.String(),
		"new_status": order.Status,
		"updated_at": time.Now(),
	})
	
	utils.SuccessResponse(c, "Order status updated successfully", order)
}

// AddOrderTrackingRequest بنية طلب إضافة سجل تتبع
type AddOrderTrackingRequest struct {
	Status      string  `json:"status" binding:"required"`
	Description string  `json:"description" binding:"required"`
	Location    *string `json:"location,omitempty"`
}

// AddOrderTracking إضافة سجل تتبع جديد للطلب (Admin)
func AddOrderTracking(c *gin.Context) {
	orderID := c.Param("id")
	orderUUID, err := uuid.Parse(orderID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid order ID", err.Error())
		return
	}
	
	var req AddOrderTrackingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	
	var order models.Order
	if err := config.DB.Where("id = ?", orderUUID).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Order not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch order", err.Error())
		}
		return
	}
	
	tracking := models.OrderTracking{
		OrderID:     order.ID,
		Status:      req.Status,
		Description: req.Description,
		Location:    req.Location,
		Timestamp:   time.Now(),
	}
	
	if err := config.DB.Create(&tracking).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to add order tracking", err.Error())
		return
	}
	
	utils.CreatedResponse(c, "Order tracking added successfully", tracking)
}

