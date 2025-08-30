package utils

import (
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// SecurityEvent نوع الحدث الأمني
type SecurityEvent struct {
	Timestamp   time.Time `json:"timestamp"`
	EventType   string    `json:"event_type"`
	IP          string    `json:"ip"`
	UserAgent   string    `json:"user_agent"`
	Email       string    `json:"email,omitempty"`
	Endpoint    string    `json:"endpoint"`
	Method      string    `json:"method"`
	StatusCode  int       `json:"status_code,omitempty"`
	Message     string    `json:"message"`
	Severity    string    `json:"severity"`
	Headers     map[string]string `json:"headers,omitempty"`
}

// SecurityLogger مسجل الأحداث الأمنية
type SecurityLogger struct {
	logFile *os.File
}

var securityLogger *SecurityLogger

// InitSecurityLogger تهيئة مسجل الأحداث الأمنية
func InitSecurityLogger() error {
	// إنشاء مجلد logs إذا لم يكن موجوداً
	if err := os.MkdirAll("logs", 0755); err != nil {
		return err
	}

	// فتح ملف السجل
	file, err := os.OpenFile("logs/security.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return err
	}

	securityLogger = &SecurityLogger{
		logFile: file,
	}

	return nil
}

// LogSecurityEvent تسجيل حدث أمني
func LogSecurityEvent(event SecurityEvent) {
	if securityLogger == nil {
		// إذا لم يتم تهيئة المسجل، استخدم log العادي
		log.Printf("[SECURITY] %s - %s: %s", event.Severity, event.EventType, event.Message)
		return
	}

	// إضافة الوقت الحالي
	event.Timestamp = time.Now()

	// تحويل إلى JSON
	jsonData, err := json.Marshal(event)
	if err != nil {
		log.Printf("خطأ في تحويل الحدث الأمني إلى JSON: %v", err)
		return
	}

	// كتابة إلى الملف
	securityLogger.logFile.WriteString(string(jsonData) + "\n")

	// طباعة في الكونسول أيضاً للأحداث الحرجة
	if event.Severity == "HIGH" || event.Severity == "CRITICAL" {
		log.Printf("[SECURITY-%s] %s: %s (IP: %s)", event.Severity, event.EventType, event.Message, event.IP)
	}
}

// LogFailedLogin تسجيل محاولة تسجيل دخول فاشلة
func LogFailedLogin(c *gin.Context, email, reason string) {
	ip := getClientIP(c)
	
	event := SecurityEvent{
		EventType:  "FAILED_LOGIN",
		IP:         ip,
		UserAgent:  c.GetHeader("User-Agent"),
		Email:      email,
		Endpoint:   c.Request.URL.Path,
		Method:     c.Request.Method,
		Message:    reason,
		Severity:   "MEDIUM",
		Headers: map[string]string{
			"X-Forwarded-For": c.GetHeader("X-Forwarded-For"),
			"X-Real-IP":       c.GetHeader("X-Real-IP"),
		},
	}

	LogSecurityEvent(event)
}

// LogSuspiciousActivity تسجيل نشاط مشبوه
func LogSuspiciousActivity(c *gin.Context, activity, details string) {
	ip := getClientIP(c)
	
	event := SecurityEvent{
		EventType: "SUSPICIOUS_ACTIVITY",
		IP:        ip,
		UserAgent: c.GetHeader("User-Agent"),
		Endpoint:  c.Request.URL.Path,
		Method:    c.Request.Method,
		Message:   details,
		Severity:  "HIGH",
		Headers: map[string]string{
			"X-Forwarded-For": c.GetHeader("X-Forwarded-For"),
			"X-Real-IP":       c.GetHeader("X-Real-IP"),
		},
	}

	LogSecurityEvent(event)
}

// LogRateLimitExceeded تسجيل تجاوز حد الطلبات
func LogRateLimitExceeded(c *gin.Context) {
	ip := getClientIP(c)
	
	event := SecurityEvent{
		EventType: "RATE_LIMIT_EXCEEDED",
		IP:        ip,
		UserAgent: c.GetHeader("User-Agent"),
		Endpoint:  c.Request.URL.Path,
		Method:    c.Request.Method,
		Message:   "تم تجاوز الحد المسموح من الطلبات",
		Severity:  "MEDIUM",
	}

	LogSecurityEvent(event)
}

// LogSuccessfulLogin تسجيل تسجيل دخول ناجح
func LogSuccessfulLogin(c *gin.Context, email, role string) {
	ip := getClientIP(c)
	
	event := SecurityEvent{
		EventType: "SUCCESSFUL_LOGIN",
		IP:        ip,
		UserAgent: c.GetHeader("User-Agent"),
		Email:     email,
		Endpoint:  c.Request.URL.Path,
		Method:    c.Request.Method,
		Message:   "تسجيل دخول ناجح - الدور: " + role,
		Severity:  "INFO",
	}

	LogSecurityEvent(event)
}

// LogTokenRefresh تسجيل تحديث التوكن
func LogTokenRefresh(c *gin.Context, email string) {
	ip := getClientIP(c)
	
	event := SecurityEvent{
		EventType: "TOKEN_REFRESH",
		IP:        ip,
		UserAgent: c.GetHeader("User-Agent"),
		Email:     email,
		Endpoint:  c.Request.URL.Path,
		Method:    c.Request.Method,
		Message:   "تم تحديث التوكن بنجاح",
		Severity:  "INFO",
	}

	LogSecurityEvent(event)
}

// LogLogout تسجيل تسجيل الخروج
func LogLogout(c *gin.Context, email string) {
	ip := getClientIP(c)
	
	event := SecurityEvent{
		EventType: "LOGOUT",
		IP:        ip,
		UserAgent: c.GetHeader("User-Agent"),
		Email:     email,
		Endpoint:  c.Request.URL.Path,
		Method:    c.Request.Method,
		Message:   "تسجيل خروج ناجح",
		Severity:  "INFO",
	}

	LogSecurityEvent(event)
}

// getClientIP الحصول على IP الحقيقي للعميل
func getClientIP(c *gin.Context) string {
	// محاولة الحصول على IP من الهيدرات المختلفة
	if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
		return forwarded
	}
	if realIP := c.GetHeader("X-Real-IP"); realIP != "" {
		return realIP
	}
	return c.ClientIP()
}

// CloseSecurityLogger إغلاق مسجل الأحداث الأمنية
func CloseSecurityLogger() {
	if securityLogger != nil && securityLogger.logFile != nil {
		securityLogger.logFile.Close()
	}
}
