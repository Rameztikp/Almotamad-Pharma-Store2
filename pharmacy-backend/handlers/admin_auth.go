package handlers

import (
	"net/http"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"pharmacy-backend/utils"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// AdminLoginRequest بنية طلب تسجيل دخول المشرف
type AdminLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AdminLogin تسجيل دخول المشرف
func AdminLogin(c *gin.Context) {
	var req AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "بيانات غير صالحة")
		return
	}

	// البحث عن المستخدم بالبريد الإلكتروني
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "البريد الإلكتروني أو كلمة المرور غير صحيحة"})
		return
	}

	// التحقق من كلمة المرور
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "البريد الإلكتروني أو كلمة المرور غير صحيحة"})
		return
	}

	// التحقق من صلاحيات المشرف
	if user.Role != models.RoleAdmin && user.Role != models.RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "غير مصرح بالوصول"})
		return
	}

	// إنشاء توكن JWT
	token, err := utils.GenerateJWT(user.ID, user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خطأ في إنشاء جلسة المستخدم"})
		return
	}

	// تحديث وقت آخر تسجيل دخول
	now := time.Now()
	user.LastLoginAt = &now
	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خطأ في تحديث بيانات المستخدم"})
		return
	}

	// إخفاء الحقول الحساسة
	user.PasswordHash = ""

	// إرجاع الاستجابة
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   token,
		"user":    user,
	})
}

// AdminAuthRequired middleware للتحقق من صلاحيات المشرف
func AdminAuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "مطلوب تسجيل الدخول"})
			c.Abort()
			return
		}

		// التحقق من صحة التوكن
		claims, err := utils.VerifyJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "جلسة غير صالحة"})
			c.Abort()
			return
		}

		// التحقق من صلاحيات المشرف
		role, ok := claims["role"].(string)
		if !ok || (role != string(models.RoleAdmin) && role != string(models.RoleSuperAdmin)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "غير مصرح بالوصول"})
			c.Abort()
			return
		}

		// إضافة معلومات المستخدم إلى السياق
		userID, err := uuid.Parse(claims["user_id"].(string))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "معرف مستخدم غير صالح"})
			c.Abort()
			return
		}

		// التحقق من وجود المستخدم في قاعدة البيانات
		var user models.User
		if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "المستخدم غير موجود"})
			c.Abort()
			return
		}

		// التحقق من أن حساب المستخدم نشط
		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "الحساب غير مفعل"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Set("userRole", role)
		c.Set("user", &user) // إضافة بيانات المستخدم الكاملة إلى السياق

		c.Next()
	}
}

// GetAdminProfile الحصول على ملف المشرف
func GetAdminProfile(c *gin.Context) {
	// الحصول على بيانات المستخدم من السياق
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "غير مصرح بالوصول"})
		return
	}

	// تحويل البيانات إلى نموذج المستخدم
	admin, ok := user.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خطأ في تحميل بيانات المستخدم"})
		return
	}

	// إخفاء الحقول الحساسة
	admin.PasswordHash = ""

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    admin,
	})
}
