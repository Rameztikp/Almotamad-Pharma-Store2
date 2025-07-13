package handlers

import (
	"fmt"
	"strconv"
	"time"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetAllOrders الحصول على جميع الطلبات (Admin)
func GetAllOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	query := config.DB.Model(&models.Order{}).
		Preload("User").
		Preload("OrderItems.Product").
		Preload("OrderTracking")
	
	if status != "" {
		query = query.Where("status = ?", status)
	}
	
	var total int64
	query.Count(&total)
	
	var orders []models.Order
	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&orders).Error
	
	if err != nil {
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

