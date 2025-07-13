package utils

import (
	"errors"
	"os"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/google/uuid"
)

// JWTClaims هيكل البيانات المشفرة في التوكن
type JWTClaims struct {
	UserID   uuid.UUID   `json:"user_id"`
	Email    string      `json:"email"`
	Role     string      `json:"role"`
	jwt.StandardClaims
}

// GenerateJWT إنشاء توكن JWT جديد
func GenerateJWT(userID uuid.UUID, email string, role string) (string, error) {
	// الحصول على مفتاح التوقيع من متغيرات البيئة
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // يجب تغييره في الإنتاج
	}

	// تعريف صلاحية التوكن (24 ساعة)
	expirationTime := time.Now().Add(24 * time.Hour)

	// إنشاء الـ claims
	claims := &JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
			Issuer:    "pharmacy-backend",
		},
	}

	// إنشاء التوكن
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// توقيع التوكن
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// VerifyJWT التحقق من صحة التوكن
func VerifyJWT(tokenString string) (jwt.MapClaims, error) {
	// الحصول على مفتاح التوقيع من متغيرات البيئة
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // يجب أن يكون نفس المفتاح المستخدم في التوقيع
	}

	// التحقق من صيغة التوكن
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// التأكد من خوارزمية التوقيع
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("خوارزمية توقيع غير صالحة")
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	// التحقق من صحة التوكن
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("توكن غير صالح")
}

// GetUserIDFromToken استخراج معرف المستخدم من التوكن
func GetUserIDFromToken(tokenString string) (uuid.UUID, error) {
	claims, err := VerifyJWT(tokenString)
	if err != nil {
		return uuid.Nil, err
	}

	userID, err := uuid.Parse(claims["user_id"].(string))
	if err != nil {
		return uuid.Nil, err
	}

	return userID, nil
}

// GetUserRoleFromToken استخراج دور المستخدم من التوكن
func GetUserRoleFromToken(tokenString string) (string, error) {
	claims, err := VerifyJWT(tokenString)
	if err != nil {
		return "", err
	}

	role, ok := claims["role"].(string)
	if !ok {
		return "", errors.New("دور المستخدم غير موجود في التوكن")
	}

	return role, nil
}
