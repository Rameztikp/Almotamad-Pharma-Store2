package handlers

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/services"
	"pharmacy-backend/utils"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Using the Notification model from models package

// getStatusArabicText returns the Arabic text for the request status
func getStatusArabicText(status models.WholesaleRequestStatus) string {
	switch status {
	case models.RequestStatusApproved:
		return "الموافقة على"
	case models.RequestStatusRejected:
		return "رفض"
	case models.RequestStatusPending:
		return "قيد الانتظار"
	default:
		return string(status)
	}
}

const uploadPath = "./uploads/wholesale"

// UpgradeToWholesaleRequest request to upgrade to wholesale
type UpgradeToWholesaleRequest struct {
	CompanyName        string                `form:"company_name" binding:"required"`
	CommercialRegister string                `form:"commercial_register" binding:"required"`
	TaxNumber         string                `form:"tax_number"`
	IDDocument        *multipart.FileHeader `form:"id_document" binding:"required"`
	CommercialDocument *multipart.FileHeader `form:"commercial_document" binding:"required"`
}

// saveUploadedFile saves an uploaded file and returns its path
func saveUploadedFile(fileHeader *multipart.FileHeader) (string, error) {
	// Validate file size (max 5MB)
	if fileHeader.Size > 5<<20 {
		return "", fmt.Errorf("حجم الملف يجب أن لا يتجاوز 5 ميجابايت")
	}

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".pdf" {
		return "", fmt.Errorf("نوع الملف غير مدعوم. يرجى تحميل ملف بصيغة JPG أو PNG أو PDF")
	}

	// Create a unique filename
	fileName := fmt.Sprintf("%d_%s", time.Now().UnixNano(), fileHeader.Filename)
	filePath := filepath.Join(uploadPath, fileName)

	// Create the uploads directory if it doesn't exist
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		return "", fmt.Errorf("فشل في إنشاء مجلد التحميلات: %v", err)
	}

	// Save the file
	if err := saveFile(fileHeader, filePath); err != nil {
		return "", fmt.Errorf("فشل في حفظ الملف: %v", err)
	}

	// Return the relative path
	return "/uploads/wholesale/" + fileName, nil
}

// saveFile saves the uploaded file to the specified path
func saveFile(fileHeader *multipart.FileHeader, dst string) error {
	src, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, src)
	return err
}

// UpgradeToWholesale creates a new wholesale upgrade request
func UpgradeToWholesale(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	// Parse form data
	var req UpgradeToWholesaleRequest
	if err := c.ShouldBind(&req); err != nil {
		utils.BadRequestResponse(c, "بيانات الطلب غير صحيحة", err.Error())
		return
	}

	// Check if user already has a pending request
	var existingRequest models.WholesaleUpgradeRequest
	result := config.DB.Where("user_id = ? AND status = ?", userID, models.RequestStatusPending).First(&existingRequest)
	
	if result.Error != nil {
		// If error is not "record not found", then there's a real error
		if result.Error != gorm.ErrRecordNotFound {
			utils.InternalServerErrorResponse(c, "خطأ في التحقق من الطلبات السابقة", result.Error.Error())
			return
		}
		// If err is gorm.ErrRecordNotFound, it means no pending request exists, so we can proceed
	} else {
		// If err is nil, it means a pending request was found
		utils.BadRequestResponse(c, "لديك طلب ترقية قيد المراجعة بالفعل", "")
		return
	}

	// Handle file uploads
	idDocPath, err := saveUploadedFile(req.IDDocument)
	if err != nil {
		utils.BadRequestResponse(c, "خطأ في ملف الهوية", err.Error())
		return
	}

	commercialDocPath, err := saveUploadedFile(req.CommercialDocument)
	if err != nil {
		// Delete the first file if second upload fails
		os.Remove("." + idDocPath)
		utils.BadRequestResponse(c, "خطأ في ملف السجل التجاري", err.Error())
		return
	}

	// Create new request
	request := models.WholesaleUpgradeRequest{
		UserID:                userID.(uuid.UUID),
		CompanyName:           req.CompanyName,
		TaxNumber:             req.TaxNumber,
		CommercialRegister:    req.CommercialRegister,
		IDDocumentURL:         idDocPath,
		CommercialDocumentURL: commercialDocPath,
		Status:                models.RequestStatusPending,
		CreatedAt:             time.Now(),
		UpdatedAt:             time.Now(),
	}

	// Save to database in a transaction
	tx := config.DB.Begin()
	if err := tx.Create(&request).Error; err != nil {
		tx.Rollback()
		// Clean up uploaded files if database operation fails
		os.Remove("." + idDocPath)
		os.Remove("." + commercialDocPath)
		utils.InternalServerErrorResponse(c, "فشل في حفظ طلب الترقية", err.Error())
		return
	}
	tx.Commit()

	// إنشاء إشعار للإدارة عن طلب الترقية الجديد
	notificationService := services.NewNotificationService()
	adminMetadata := map[string]interface{}{
		"request_id":   request.ID.String(),
		"user_id":      userID.(uuid.UUID).String(),
		"company_name": request.CompanyName,
		"status":       request.Status,
		"created_at":   request.CreatedAt,
	}
	
	err = notificationService.CreateAdminNotification(
		models.NotificationTypeAdminWholesaleSubmitted,
		"طلب ترقية حساب جملة جديد",
		fmt.Sprintf("تم تقديم طلب ترقية حساب جملة جديد من شركة %s", request.CompanyName),
		adminMetadata,
		nil,
	)
	if err != nil {
		log.Printf("⚠️ فشل في إنشاء إشعار الإدارة لطلب الترقية: %v", err)
	}

	// Send notification to user about request submission
	Notifier.BroadcastToUser(userID.(uuid.UUID), "wholesale_request_submitted", gin.H{
		"request_id": request.ID.String(),
		"status":     request.Status,
		"message":    "تم تقديم طلب ترقية حساب الجملة بنجاح وهو الآن قيد المراجعة",
		"created_at": request.CreatedAt,
	})

	// Return success response
	utils.SuccessResponse(c, "تم تقديم طلب الترقية بنجاح", gin.H{
		"request": request,
	})
}

// GetWholesaleRequests gets all wholesale upgrade requests (admin only)
func GetWholesaleRequests(c *gin.Context) {
	// Get status query parameter
	status := c.Query("status")
	
	// Build query
	query := config.DB.Preload("User").Order("created_at DESC")
	
	// Add status filter if provided
	if status != "" {
		query = query.Where("status = ?", status)
	}
	
	// Execute query
	var requests []models.WholesaleUpgradeRequest
	if err := query.Find(&requests).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch requests", err.Error())
		return
	}

	// Return success response with data
	utils.SuccessResponse(c, "", gin.H{
		"requests": requests,
	})
}

// GetUserWholesaleRequest gets the current user's wholesale request
func GetUserWholesaleRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var request models.WholesaleUpgradeRequest
	if err := config.DB.Where("user_id = ?", userID).Order("created_at DESC").First(&request).Error; err != nil {
		utils.NotFoundResponse(c, "No upgrade request found")
		return
	}

	utils.SuccessResponse(c, "", request)
}

// UpdateWholesaleRequestStatus updates the status of a wholesale request (admin only)
type UpdateWholesaleRequestStatus struct {
	Status          models.WholesaleRequestStatus `json:"status" binding:"required,oneof=approved rejected"`
	RejectionReason string                        `json:"rejection_reason,omitempty"`
}

func UpdateRequestStatus(c *gin.Context) {
	// Get request ID from URL
	requestID := c.Param("id")
	
	// التحقق من صحة معرف الطلب
	if requestID == "" {
		log.Println("❌ معرف الطلب فارغ")
		utils.BadRequestResponse(c, "معرف الطلب مطلوب", "")
		return
	}
	
	log.Printf("🔄 معالجة تحديث حالة طلب الترقية: %s", requestID)
	log.Printf("📍 Request URL: %s", c.Request.URL.Path)
	log.Printf("📍 Request Method: %s", c.Request.Method)

	// Parse request body
	var req UpdateWholesaleRequestStatus
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ خطأ في تحليل بيانات الطلب: %v", err)
		log.Printf("📝 Raw request body: %s", c.Request.Body)
		utils.BadRequestResponse(c, "بيانات الطلب غير صالحة", err.Error())
		return
	}

	log.Printf("📝 Request payload received: status=%s, rejection_reason=%s", req.Status, req.RejectionReason)

	// Validate status
	if req.Status != models.RequestStatusApproved && req.Status != models.RequestStatusRejected {
		log.Printf("❌ حالة الطلب غير صالحة: %s", req.Status)
		utils.BadRequestResponse(c, "حالة الطلب غير صالحة", "يجب أن تكون الحالة إما approved أو rejected")
		return
	}

	// Get admin ID
	adminID, exists := c.Get("userID")
	if !exists {
		log.Println("❌ لم يتم العثور على معرف المسؤول")
		utils.UnauthorizedResponse(c, "يجب تسجيل الدخول كمسؤول")
		return
	}

	log.Printf("🔍 جاري تحديث حالة الطلب %s بواسطة المسؤول %v", requestID, adminID)

	// Start transaction
	tx := config.DB.Begin()
	if tx.Error != nil {
		log.Printf("❌ فشل في بدء المعاملة: %v", tx.Error)
		utils.InternalServerErrorResponse(c, "فشل في بدء معالجة الطلب", tx.Error.Error())
		return
	}

	// Get the request by ID first
	var request models.WholesaleUpgradeRequest
	err := tx.First(&request, "id = ?", requestID).Error
	
	// If not found by ID, try to find by user_id
	if err == gorm.ErrRecordNotFound {
		log.Printf("⚠️ لم يتم العثور على الطلب باستخدام ID: %s، جاري البحث باستخدام user_id", requestID)
		err = tx.First(&request, "user_id = ?", requestID).Error
		
		if err != nil {
			tx.Rollback()
			if err == gorm.ErrRecordNotFound {
				log.Printf("❌ طلب الترقية غير موجود: %s (تم البحث باستخدام ID و user_id)", requestID)
				utils.NotFoundResponse(c, "طلب الترقية غير موجود")
			} else {
				log.Printf("❌ خطأ في قاعدة البيانات: %v", err)
				utils.InternalServerErrorResponse(c, "خطأ في قاعدة البيانات", err.Error())
			}
			return
		}
		log.Printf("✅ تم العثور على الطلب باستخدام user_id: %s", requestID)
	} else if err != nil {
		tx.Rollback()
		log.Printf("❌ خطأ في قاعدة البيانات: %v", err)
		utils.InternalServerErrorResponse(c, "خطأ في قاعدة البيانات", err.Error())
		return
	}

	log.Printf("✅ تم العثور على الطلب: ID=%s, Status=%s, UserID=%s", request.ID, request.Status, request.UserID)

	// Check if request is already processed
	if request.Status != models.RequestStatusPending {
		tx.Rollback()
		log.Printf("⚠️ تم معالجة الطلب مسبقاً: الحالة الحالية %s", request.Status)
		utils.BadRequestResponse(c, "تم معالجة هذا الطلب مسبقاً", fmt.Sprintf("حالة الطلب الحالية: %s", request.Status))
		return
	}

	// Load user separately
	var user models.User
	if err := tx.First(&user, "id = ?", request.UserID).Error; err != nil {
		tx.Rollback()
		log.Printf("❌ المستخدم غير موجود: %v", err)
		utils.NotFoundResponse(c, "المستخدم المرتبط بطلب الترقية غير موجود")
		return
	}
	request.User = user

	log.Printf("✅ تم العثور على المستخدم: Email=%s, ID=%s", user.Email, user.ID)
	log.Printf("🔄 تحديث حالة الطلب إلى: %s", req.Status)

	// Update request status
	now := time.Now()
	updates := map[string]interface{}{
		"status":          req.Status,
		"processed_by":    adminID,
		"processed_at":    now,
		"updated_at":      now,
	}

	// Add rejection reason if provided
	if req.Status == models.RequestStatusRejected {
		updates["rejection_reason"] = req.RejectionReason
		log.Printf("📝 تمت إضافة سبب الرفض: %s", req.RejectionReason)
	}

	// Update the request in database
	if err := tx.Model(&request).Updates(updates).Error; err != nil {
		tx.Rollback()
		log.Printf("❌ فشل في تحديث حالة الطلب: %v", err)
		utils.InternalServerErrorResponse(c, "فشل في تحديث حالة الطلب", err.Error())
		return
	}

	log.Printf("✅ تم تحديث حالة الطلب بنجاح إلى: %s", req.Status)

	// If approved, grant wholesale access
	if req.Status == models.RequestStatusApproved {
		log.Printf("🔄 منح صلاحيات الجملة للمستخدم: %s (%s)", user.Email, user.ID)
		
		// Keep original account type (retail) but grant wholesale access
		user.WholesaleAccess = true
		user.CompanyName = request.CompanyName
		user.CommercialRegister = request.CommercialRegister
		user.IsActive = true

		if err := tx.Save(&user).Error; err != nil {
			tx.Rollback()
			log.Printf("❌ فشل في تحديث حساب المستخدم: %v", err)
			utils.InternalServerErrorResponse(c, "فشل في تحديث صلاحيات المستخدم", err.Error())
			return
		}

		// Log the approval
		log.Printf("✅ تمت الموافقة على طلب الترقية للمستخدم: %s (%s)", user.Email, user.ID.String())
		log.Printf("✅ تم منح صلاحيات الجملة بنجاح للمستخدم: %s", user.Email)
	} else if req.Status == models.RequestStatusRejected {
		log.Printf("🔄 رفض طلب الترقية للمستخدم: %s", user.Email)
		
		// Log the rejection
		reason := req.RejectionReason
		if reason == "" {
			reason = "لم يتم تحديد السبب"
		}
		log.Printf("❌ تم رفض طلب الترقية للمستخدم: %s (%s). السبب: %s", user.Email, user.ID.String(), reason)
		log.Printf("✅ تم رفض طلب الترقية للمستخدم: %s", user.Email)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		log.Printf("❌ فشل في حفظ التغييرات: %v", err)
		utils.InternalServerErrorResponse(c, "فشل في معالجة الطلب", err.Error())
		return
	}

	log.Printf("✅ تمت معالجة الطلب بنجاح. الحالة: %s", req.Status)

	// Create notification service
	notificationService := services.NewNotificationService()

	// Create and save notification to database
	var notificationTitle, notificationMessage string
	var notificationType models.NotificationType

	if req.Status == models.RequestStatusApproved {
		notificationTitle = "تمت الموافقة على طلب ترقية حساب الجملة"
		notificationMessage = "تهانينا! تمت الموافقة على طلب ترقية حساب الجملة الخاص بك"
		notificationType = "success"
	} else if req.Status == models.RequestStatusRejected {
		notificationTitle = "تم رفض طلب ترقية حساب الجملة"
		notificationMessage = "تم رفض طلب ترقية حساب الجملة الخاص بك"
		if req.RejectionReason != "" {
			notificationMessage += fmt.Sprintf(". السبب: %s", req.RejectionReason)
		}
		notificationType = "error"
	}

	// Save notification to database
	if notificationTitle != "" {
		metadata := map[string]interface{}{
			"request_id":       request.ID.String(),
			"status":           string(request.Status),
			"rejection_reason": req.RejectionReason,
			"processed_at":     now,
		}

		_, err := notificationService.CreateNotification(
			request.UserID,
			notificationType,
			notificationTitle,
			notificationMessage,
			metadata,
			nil,
		)
		
		if err != nil {
			log.Printf("⚠️ فشل في حفظ الإشعار: %v", err)
		} else {
			log.Printf("✅ تم حفظ الإشعار في قاعدة البيانات للمستخدم: %s", user.ID.String())
		}
	}

	// بث إشعار حالة طلب الجملة للمستخدم عبر SSE
	approved := req.Status == models.RequestStatusApproved
	if approved {
		log.Printf("📢 إرسال إشعار الموافقة للمستخدم: %s", user.ID.String())
		Notifier.BroadcastToUser(user.ID, "wholesale_approved", gin.H{
			"request_id":   request.ID.String(),
			"status":       request.Status,
			"message":      "تهانينا! تمت الموافقة على طلب ترقية حساب الجملة الخاص بك",
			"processed_at": now,
		})
	} else if req.Status == models.RequestStatusRejected {
		log.Printf("📢 إرسال إشعار الرفض للمستخدم: %s", user.ID.String())
		Notifier.BroadcastToUser(user.ID, "wholesale_rejected", gin.H{
			"request_id":       request.ID.String(),
			"status":           request.Status,
			"rejection_reason": req.RejectionReason,
			"message":          "تم رفض طلب ترقية حساب الجملة الخاص بك",
			"processed_at":     now,
		})
	}
	// Always send a generic update event as well
	log.Printf("📢 إرسال إشعار تحديث عام للمستخدم: %s", user.ID.String())
	Notifier.BroadcastToUser(user.ID, "wholesale_request_updated", gin.H{
		"request_id":       request.ID.String(),
		"status":           request.Status,
		"rejection_reason": req.RejectionReason,
		"processed_at":     now,
	})

	// Return success response with appropriate message
	message := fmt.Sprintf("تم %s الطلب بنجاح", getStatusArabicText(req.Status))
	
	// Return the updated request data
	responseData := gin.H{
		"message": message,
		"request": gin.H{
			"id":     request.ID,
			"status": request.Status,
			"user_id": request.UserID,
			"processed_at": now,
			"processed_by": adminID,
		},
	}
	
	utils.SuccessResponse(c, message, responseData)
}

// GetWholesaleCustomers gets all active wholesale customers (admin only)
func GetWholesaleCustomers(c *gin.Context) {
	// Build query to get users with wholesale access and join with wholesale upgrade requests
	var customers []struct {
		models.User
		IDDocumentURL         string    `json:"id_document_url"`
		CommercialDocumentURL string    `json:"commercial_document_url"`
		RequestCreatedAt     time.Time `json:"request_created_at"`
	}

	err := config.DB.Table("users").
		Select("users.*, wur.id_document_url, wur.commercial_document_url, wur.created_at as request_created_at").
		Joins("JOIN wholesale_upgrade_requests wur ON users.id = wur.user_id").
		Where("users.wholesale_access = ? AND users.is_active = ?", true, true).
		Order("wur.created_at DESC").
		Find(&customers).Error

	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch wholesale customers", err.Error())
		return
	}

	// Format the response to include documents
	type CustomerResponse struct {
		models.User
		Documents struct {
			IDDocumentURL         string `json:"id_document_url"`
			CommercialDocumentURL string `json:"commercial_document_url"`
		} `json:"documents"`
	}

	var response []CustomerResponse
	for _, customer := range customers {
		resp := CustomerResponse{
			User: customer.User,
		}
		resp.Documents.IDDocumentURL = customer.IDDocumentURL
		resp.Documents.CommercialDocumentURL = customer.CommercialDocumentURL
		response = append(response, resp)
	}

	// Return success response with data
	utils.SuccessResponse(c, "", gin.H{
		"customers": response,
	})
}
