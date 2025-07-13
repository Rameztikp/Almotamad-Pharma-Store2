package handlers

import (
	"fmt"
	"log"
	"strconv"
	"time"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateOrderRequest بنية طلب إنشاء الطلب
type CreateOrderRequest struct {
	PaymentMethod   string          `json:"payment_method" binding:"required"`
	ShippingAddress models.Address  `json:"shipping_address" binding:"required"`
	BillingAddress  *models.Address `json:"billing_address,omitempty"`
	Notes           string          `json:"notes,omitempty"`
	CouponCode      string          `json:"coupon_code,omitempty"`
}

// CreateOrder إنشاء طلب جديد
func CreateOrder(c *gin.Context) {
	log.Println("Starting order creation process...")
	
	userID, exists := c.Get("user_id")
	if !exists {
		errMsg := "User not authenticated"
		log.Println("❌", errMsg)
		utils.UnauthorizedResponse(c, errMsg)
		return
	}
	
	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		errMsg := "Invalid user ID format"
		log.Println("❌", errMsg, "error:", err)
		utils.BadRequestResponse(c, errMsg, err.Error())
		return
	}
	
	log.Printf("Creating order for user ID: %v\n", userID)
	
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errMsg := fmt.Sprintf("Invalid request data: %v", err.Error())
		log.Println("❌", errMsg)
		utils.BadRequestResponse(c, "Invalid request data", err.Error())
		return
	}
	log.Printf("Order request received: Payment Method: %s, Notes: %s, Coupon: %s\n", 
		req.PaymentMethod, req.Notes, req.CouponCode)
	
	// الحصول على عناصر السلة
	var cartItems []models.CartItem
	if err := config.DB.
		Preload("Product").
		Where("user_id = ?", userID).Find(&cartItems).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch cart items", err.Error())
		return
	}
	
	if len(cartItems) == 0 {
		utils.BadRequestResponse(c, "Cart is empty", "")
		return
	}
	
	// حساب المجموع الفرعي
	var subtotal float64
	for _, item := range cartItems {
		subtotal += item.GetTotalPrice()
	}
	
	// حساب الشحن والضرائب
	shippingCost := 10.0 // تكلفة شحن افتراضية
	if subtotal >= 100 {
		shippingCost = 0.0 // شحن مجاني للطلبات فوق 100
	}
	taxRate := 0.15     // 15% ضريبة
	taxAmount := subtotal * taxRate

	// تطبيق خصم الكوبون إذا كان متوفراً
	discountAmount := 0.0
	if req.CouponCode != "" {
		var coupon models.Coupon
		if err := config.DB.Where("code = ?", req.CouponCode).First(&coupon).Error; err == nil {
			if coupon.IsValid() {
				discountAmount = coupon.CalculateDiscount(subtotal)
				
				// تحديث عدد مرات استخدام الكوبون
				coupon.UsedCount++
				config.DB.Save(&coupon)
			}
		}
	}
	
	// حساب المبلغ الإجمالي
	totalAmount := subtotal + shippingCost + taxAmount - discountAmount
	
	// إنشاء الطلب مع نسخ عنوان الشحن
	shippingAddr := req.ShippingAddress // إنشاء نسخة من عنوان الشحن
	order := models.Order{
		UserID:          userUUID,
		Status:          models.OrderStatusPending,
		Subtotal:        subtotal,
		ShippingCost:    shippingCost,
		TaxAmount:       taxAmount,
		DiscountAmount:  discountAmount,
		TotalAmount:     totalAmount,
		PaymentMethod:   req.PaymentMethod,
		PaymentStatus:   models.PaymentStatusPending,
		ShippingAddress: shippingAddr,
		Notes:           req.Notes,
	}
	
	// تعيين عنوان الفواتير إذا تم توفيره
	if req.BillingAddress != nil {
		billingAddr := *req.BillingAddress // إنشاء نسخة من عنوان الفواتير
		order.BillingAddress = &billingAddr
	}
	
	// بدء معاملة قاعدة البيانات
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// حفظ الطلب
	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		log.Printf("❌ Failed to create order: %v\n", err)
		utils.InternalServerErrorResponse(c, "Failed to create order", err.Error())
		return
	}

	// حفظ عناصر الطلب
	for _, item := range cartItems {
			orderItem := models.OrderItem{
			OrderID:    order.ID,
			ProductID:  item.ProductID,
			Name:       item.Product.Name,    // حفظ اسم المنتج
			ImageURL:   item.Product.ImageURL, // حفظ صورة المنتج
			Quantity:   item.Quantity,
			UnitPrice:  item.Product.Price,
			TotalPrice: item.Product.Price * float64(item.Quantity), // حساب السعر الإجمالي للعنصر
		}
		
		if err := tx.Create(&orderItem).Error; err != nil {
			tx.Rollback()
			log.Printf("❌ Failed to create order item: %v\n", err)
			utils.InternalServerErrorResponse(c, "Failed to create order items", err.Error())
			return
		}
		
		// تقليل الكمية المتوفرة من المنتج
		if err := tx.Model(&item.Product).
			Update("quantity", gorm.Expr("quantity - ?", item.Quantity)).
			Error; err != nil {
			log.Printf("⚠️ Failed to update product quantity: %v\n", err)
			// لا نوقف العملية إذا فشل تحديث الكمية
		}
	}

	// تفريغ سلة التسوق بعد إنشاء الطلب
	if err := tx.Where("user_id = ?", userID).Delete(&models.CartItem{}).Error; err != nil {
		tx.Rollback()
		log.Printf("❌ Failed to clear cart: %v\n", err)
		utils.InternalServerErrorResponse(c, "Failed to clear cart", err.Error())
		return
	}

	// تأكيد المعاملة
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		log.Printf("❌ Failed to commit transaction: %v\n", err)
		utils.InternalServerErrorResponse(c, "Failed to complete order", err.Error())
		return
	}

	// تسجيل نجاح إنشاء الطلب
	log.Printf("✅ Order created successfully. ID: %s, Total: %.2f\n", order.ID, order.TotalAmount)
	
	// إرجاع استجابة ناجحة
	utils.SuccessResponse(c, "تم إنشاء الطلب بنجاح", gin.H{
		"id":            order.ID,
		"order_number":  order.ID.String(),
		"status":        order.Status,
		"total_amount":  order.TotalAmount,
		"created_at":    order.CreatedAt,
		"items_count":   len(cartItems),
	})
}

// GetUserOrders الحصول على طلبات المستخدم
func GetUserOrders(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	
	offset := (page - 1) * limit
	
	var orders []models.Order
	var total int64
	
	query := config.DB.Model(&models.Order{}).Where("user_id = ?", userID)
	query.Count(&total)
	
	err := query.
		Preload("OrderItems.Product").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&orders).Error
	
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch user orders", err.Error())
		return
	}
	
	pagination := utils.CalculatePagination(page, limit, total)
	utils.PaginatedSuccessResponse(c, "User orders retrieved successfully", orders, pagination)
}

// GetOrder الحصول على طلب محدد
func GetOrder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	orderID := c.Param("id")
	orderUUID, err := uuid.Parse(orderID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid order ID", err.Error())
		return
	}
	
	var order models.Order
	err = config.DB.
		Preload("OrderItems.Product").
		Preload("OrderTracking").
		Where("id = ? AND user_id = ?", orderUUID, userID).First(&order).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Order not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch order", err.Error())
		}
		return
	}
	
	utils.SuccessResponse(c, "Order retrieved successfully", order)
}

// TrackOrder تتبع الطلب
func TrackOrder(c *gin.Context) {
	orderID := c.Param("id")
	orderUUID, err := uuid.Parse(orderID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid order ID", err.Error())
		return
	}
	
	var order models.Order
	err = config.DB.
		Preload("OrderTracking").
		Where("id = ?", orderUUID).First(&order).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Order not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch order tracking", err.Error())
		}
		return
	}
	
	utils.SuccessResponse(c, "Order tracking retrieved successfully", order.OrderTracking)
}

// CancelOrder إلغاء الطلب
func CancelOrder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}
	
	orderID := c.Param("id")
	orderUUID, err := uuid.Parse(orderID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid order ID", err.Error())
		return
	}
	
	var order models.Order
	err = config.DB.Where("id = ? AND user_id = ?", orderUUID, userID).First(&order).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Order not found")
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch order", err.Error())
		}
		return
	}
	
	if !order.CanBeCancelled() {
		utils.BadRequestResponse(c, "Order cannot be cancelled", "Order is already being processed or delivered")
		return
	}
	
	// تحديث حالة الطلب إلى ملغى
	order.Status = models.OrderStatusCancelled
	if err := config.DB.Save(&order).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to cancel order", err.Error())
		return
	}
	
	// إضافة سجل تتبع للإلغاء
	tracking := models.OrderTracking{
		OrderID:     order.ID,
		Status:      string(models.OrderStatusCancelled),
		Description: "تم إلغاء الطلب بواسطة المستخدم",
		Timestamp:   time.Now(),
	}
	if err := config.DB.Create(&tracking).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to add cancellation tracking", err.Error())
		return
	}
	
	utils.SuccessResponse(c, "Order cancelled successfully", order)
}

