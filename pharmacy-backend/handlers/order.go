package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
)

// OrderItemRequest عنصر الطلب - يدعم الحقول الحديثة والقديمة
type OrderItemRequest struct {
	ProductID     string          `json:"product_id"`
	Product       json.RawMessage `json:"product"` // للتوافق مع الواجهة القديمة: قد يكون نص UUID أو كائن يحتوي id/product_id
	Name          string          `json:"name"`
	Quantity      int             `json:"quantity"`
	Price         float64         `json:"price"`
}

// OrderRequest هيكل الطلب الوارد من الواجهة الأمامية
type OrderRequest struct {
	Items           []OrderItemRequest `json:"items"`
	Subtotal        float64            `json:"subtotal"`
	Shipping        float64            `json:"shipping"`
	Total           float64            `json:"total"`
	Notes           string             `json:"notes"`
	CouponCode      string             `json:"coupon_code"`
	PaymentMethod   string             `json:"payment_method"`
	ShippingAddress models.Address     `json:"shipping_address"`
	BillingAddress  *models.Address    `json:"billing_address"`
}

// CreateOrder إنشاء طلب جديد
func CreateOrder(c *gin.Context) {
	// التحقق من المصادقة
	userIDVal, exists := c.Get("user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	userIDStr := fmt.Sprintf("%v", userIDVal)
	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid user ID", err.Error())
		return
	}

	// ربط جسم الطلب
	var req OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request payload", err.Error())
		return
	}

	// تطبيع معرفات المنتجات ودعم الحقول القديمة
	for i := range req.Items {
		// تنظيف product_id إذا موجود
		req.Items[i].ProductID = strings.TrimSpace(req.Items[i].ProductID)

		// إذا غير موجود، نحاول استخراجه من الحقل القديم product
		if req.Items[i].ProductID == "" && len(req.Items[i].Product) > 0 {
			// قد يكون نص UUID
			var asString string
			if err := json.Unmarshal(req.Items[i].Product, &asString); err == nil && asString != "" {
				req.Items[i].ProductID = strings.TrimSpace(asString)
				log.Printf("ℹ️ Using legacy 'product' string for item %d\n", i)
			} else {
				// أو كائن JSON يحتوي id أو product_id
				var legacyObj map[string]interface{}
				if err := json.Unmarshal(req.Items[i].Product, &legacyObj); err == nil {
					if v, ok := legacyObj["id"]; ok {
						if s, ok2 := v.(string); ok2 {
							req.Items[i].ProductID = strings.TrimSpace(s)
							log.Printf("ℹ️ Using legacy 'product.id' for item %d\n", i)
						}
					}
					if req.Items[i].ProductID == "" {
						if v, ok := legacyObj["product_id"]; ok {
							if s, ok2 := v.(string); ok2 {
								req.Items[i].ProductID = strings.TrimSpace(s)
								log.Printf("ℹ️ Using legacy 'product.product_id' for item %d\n", i)
							}
						}
					}
				}
			}
		}
		// Log normalized input for this item
		log.Printf("📝 Item %d normalized - product_id: '%s', price: %v, qty: %d, name: '%s'\n", i, req.Items[i].ProductID, req.Items[i].Price, req.Items[i].Quantity, req.Items[i].Name)
		if req.Items[i].ProductID == "" {
			errMsg := fmt.Sprintf("Missing product_id for item index %d", i)
			log.Println("❌", errMsg)
			utils.BadRequestResponse(c, "Invalid request data", errMsg)
			return
		}
	}

	log.Printf("Order request received: Payment Method: %s, Notes: %s, Coupon: %s\n", req.PaymentMethod, req.Notes, req.CouponCode)

	// إنشاء الطلب مع البيانات الواردة من الطلب
	order := models.Order{
		UserID:          userUUID,
		Status:          models.OrderStatusPending,
		Subtotal:        req.Subtotal,
		ShippingCost:    req.Shipping,
		TaxAmount:       (req.Subtotal * 0.15), // 15% ضريبة
		TotalAmount:     req.Total,
		PaymentMethod:   req.PaymentMethod,
		PaymentStatus:   models.PaymentStatusPending,
		ShippingAddress: req.ShippingAddress,
		Notes:           req.Notes,
	}

	// إضافة عنوان الفاتورة إذا تم توفيره
	if req.BillingAddress != nil {
		order.BillingAddress = req.BillingAddress
	}

	// بدء معاملة قاعدة البيانات
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// حفظ الطلب في قاعدة البيانات
	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		log.Printf("❌ Order creation failed for user %s. Error: %v\n", userUUID, err)
		utils.InternalServerErrorResponse(c, "Failed to create order", err.Error())
		return
	}

	// إضافة عناصر الطلب
	for idx, item := range req.Items {
		// التحقق من صحة معرف المنتج
		pid := strings.TrimSpace(item.ProductID)
		// Fallback: إذا كان pid سلسلة JSON لكائن، نحاول استخراج id/product_id
		if strings.HasPrefix(pid, "{") && strings.HasSuffix(pid, "}") {
			var obj map[string]interface{}
			if err := json.Unmarshal([]byte(pid), &obj); err == nil {
				if v, ok := obj["id"].(string); ok && v != "" {
					pid = strings.TrimSpace(v)
					log.Printf("ℹ️ Extracted product_id from JSON string at item %d\n", idx)
				} else if v, ok := obj["product_id"].(string); ok && v != "" {
					pid = strings.TrimSpace(v)
					log.Printf("ℹ️ Extracted product_id from JSON string (product_id) at item %d\n", idx)
				}
			}
		}
		productID, err := uuid.Parse(pid)
		if err != nil {
			tx.Rollback()
			log.Printf("❌ Invalid product ID format at item index %d: '%s'\n", idx, pid)
			utils.BadRequestResponse(c, "Invalid product ID format", err.Error())
			return
		}

		// التحقق من وجود المنتج
		var product models.Product
		if err := tx.First(&product, "id = ?", productID).Error; err != nil {
			tx.Rollback()
			log.Printf("❌ Product not found: %s\n", item.ProductID)
			utils.BadRequestResponse(c, "Product not found", err.Error())
			return
		}

		// التحقق من الكمية المتاحة
		if product.StockQuantity < item.Quantity {
			tx.Rollback()
			log.Printf("❌ Insufficient quantity for product: %s (Requested: %d, Available: %d)\n", product.Name, item.Quantity, product.StockQuantity)
			utils.BadRequestResponse(c, "Insufficient quantity for product", fmt.Sprintf("Requested: %d, Available: %d", item.Quantity, product.StockQuantity))
			return
		}

		// إنشاء عنصر الطلب
		orderItem := models.OrderItem{
			OrderID:    order.ID,
			ProductID:  productID,
			Name:       item.Name,
			Quantity:   item.Quantity,
			UnitPrice:  item.Price,
			TotalPrice: item.Price * float64(item.Quantity),
		}

		if err := tx.Create(&orderItem).Error; err != nil {
			tx.Rollback()
			log.Printf("❌ Failed to create order item: %v\n", err)
			utils.InternalServerErrorResponse(c, "Failed to create order items", err.Error())
			return
		}

		// تحديث كمية المنتج المتاحة
		if err := tx.Model(&product).Update("stock_quantity", gorm.Expr("stock_quantity - ?", item.Quantity)).Error; err != nil {
			tx.Rollback()
			log.Printf("❌ Failed to update product quantity: %v\n", err)
			utils.InternalServerErrorResponse(c, "Failed to update product quantity", err.Error())
			return
		}
	}

	// مسح سلة التسوق (إذا كانت هناك عناصر في السلة)
	var cartItemCount int64
	if err := tx.Model(&models.CartItem{}).Where("user_id = ?", userUUID).Count(&cartItemCount).Error; err == nil && cartItemCount > 0 {
		if err := tx.Where("user_id = ?", userUUID).Delete(&models.CartItem{}).Error; err != nil {
			tx.Rollback()
			log.Printf("❌ Failed to clear cart: %v\n", err)
			// لا نوقف العملية إذا فشل حذف السلة، فقط نسجل الخطأ
			log.Printf("⚠️ Warning: Failed to clear cart, but continuing with order creation")
		}
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

	// بث إشعار إنشاء الطلب للمستخدم عبر SSE
	Notifier.BroadcastToUser(userUUID, "order_created", gin.H{
		"order_id":     order.ID.String(),
		"status":       order.Status,
		"total_amount": order.TotalAmount,
		"created_at":   order.CreatedAt,
	})

	// إرجاع استجابة ناجحة
	utils.SuccessResponse(c, "تم إنشاء الطلب بنجاح", gin.H{
		"id":           order.ID,
		"order_number": order.ID.String(),
		"status":       order.Status,
		"total_amount": order.TotalAmount,
		"created_at":   order.CreatedAt,
		"items_count":  len(req.Items),
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

