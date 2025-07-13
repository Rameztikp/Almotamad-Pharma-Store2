package utils

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

// APIResponse بنية الاستجابة المعيارية
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// PaginationMeta معلومات التصفح
type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// PaginatedResponse استجابة مع تصفح
type PaginatedResponse struct {
	Success    bool           `json:"success"`
	Message    string         `json:"message"`
	Data       interface{}    `json:"data"`
	Pagination PaginationMeta `json:"pagination"`
}

// SuccessResponse إرسال استجابة نجاح
func SuccessResponse(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// CreatedResponse إرسال استجابة إنشاء
func CreatedResponse(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusCreated, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// ErrorResponse إرسال استجابة خطأ
func ErrorResponse(c *gin.Context, statusCode int, message string, err string) {
	c.JSON(statusCode, APIResponse{
		Success: false,
		Message: message,
		Error:   err,
	})
}

// BadRequestResponse إرسال استجابة طلب خاطئ
func BadRequestResponse(c *gin.Context, message string, err string) {
	ErrorResponse(c, http.StatusBadRequest, message, err)
}

// UnauthorizedResponse إرسال استجابة غير مصرح
func UnauthorizedResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusUnauthorized, message, "Unauthorized")
}

// ForbiddenResponse إرسال استجابة محظور
func ForbiddenResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusForbidden, message, "Forbidden")
}

// NotFoundResponse إرسال استجابة غير موجود
func NotFoundResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusNotFound, message, "Not Found")
}

// InternalServerErrorResponse إرسال استجابة خطأ خادم
func InternalServerErrorResponse(c *gin.Context, message string, err string) {
	ErrorResponse(c, http.StatusInternalServerError, message, err)
}

// PaginatedSuccessResponse إرسال استجابة نجاح مع تصفح
func PaginatedSuccessResponse(c *gin.Context, message string, data interface{}, pagination PaginationMeta) {
	c.JSON(http.StatusOK, PaginatedResponse{
		Success:    true,
		Message:    message,
		Data:       data,
		Pagination: pagination,
	})
}

// CalculatePagination حساب معلومات التصفح
func CalculatePagination(page, limit int, total int64) PaginationMeta {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	
	return PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

