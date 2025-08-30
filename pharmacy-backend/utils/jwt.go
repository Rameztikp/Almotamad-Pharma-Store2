package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

// مدة صلاحية توكن الوصول (24 ساعة)
const AccessTokenExpiry = 24 * time.Hour

// مدة صلاحية توكن التحديث (7 أيام)
const RefreshTokenExpiry = 168 * time.Hour

// JWTClaims هيكل البيانات المشفرة في التوكن
type JWTClaims struct {
	UserID   uuid.UUID   `json:"user_id"`
	Email    string      `json:"email"`
	Role     string      `json:"role"`
	jwt.RegisteredClaims
}

// GenerateJWT إنشاء توكن JWT جديد
func GenerateJWT(userID uuid.UUID, email string, role string) (string, error) {
	// الحصول على مفتاح التوقيع من متغيرات البيئة
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		// 🛡️ إصلاح أمني: منع استخدام مفتاح افتراضي ضعيف
		return "", errors.New("JWT_SECRET environment variable is required for security")
	}

	// تعريف صلاحية التوكن (24 ساعة)
	expirationTime := time.Now().Add(24 * time.Hour)

	// إنشاء الـ claims
	claims := &JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
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
		// 🛡️ إصلاح أمني: منع استخدام مفتاح افتراضي ضعيف
		return nil, errors.New("JWT_SECRET environment variable is required for security")
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

// GenerateTokens إنشاء توكن وصول وتوكن تحديث جديدين
func GenerateTokens(userID uuid.UUID, email string, role string) (string, string, error) {
	// إنشاء توكن الوصول
	accessToken, err := GenerateJWT(userID, email, role)
	if err != nil {
		return "", "", err
	}

	// إنشاء توكن التحديث (يستمر لمدة أطول)
	jwtSecret := os.Getenv("JWT_REFRESH_SECRET")
	if jwtSecret == "" {
		// 🛡️ إصلاح أمني: منع استخدام مفتاح افتراضي ضعيف
		return "", "", errors.New("JWT_REFRESH_SECRET environment variable is required for security")
	}

	expirationTime := time.Now().Add(RefreshTokenExpiry)
	claims := &JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			Issuer:    "pharmacy-backend-refresh",
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	refreshTokenString, err := refreshToken.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshTokenString, nil
}

// RefreshAccessToken تحديث توكن الوصول باستخدام توكن التحديث
func RefreshAccessToken(refreshTokenString string) (string, error) {
	// التحقق من صحة توكن التحديث
	jwtSecret := os.Getenv("JWT_REFRESH_SECRET")
	if jwtSecret == "" {
		// 🛡️ إصلاح أمني: منع استخدام مفتاح افتراضي ضعيف
		return "", errors.New("JWT_REFRESH_SECRET environment variable is required for security")
	}

	token, err := jwt.ParseWithClaims(refreshTokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("طريقة التوقيع غير صالحة")
		}
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return "", errors.New("توكن التحديث غير صالح")
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return "", errors.New("لا يمكن تحويل البيانات")
	}

	// إنشاء توكن وصول جديد
	return GenerateJWT(claims.UserID, claims.Email, claims.Role)
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

// GenerateRefreshToken إنشاء refresh token جديد
func GenerateRefreshToken(userID uuid.UUID, email string, role string) (string, error) {
	// الحصول على مفتاح التوقيع من متغيرات البيئة
	jwtSecret := os.Getenv("JWT_REFRESH_SECRET")
	if jwtSecret == "" {
		// 🛡️ إصلاح أمني: منع استخدام مفتاح افتراضي ضعيف
		return "", errors.New("JWT_REFRESH_SECRET environment variable is required for security")
	}

	// تعريف صلاحية التوكن (7 أيام)
	expirationTime := time.Now().Add(RefreshTokenExpiry)

	// إنشاء الـ claims
	claims := &JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			Issuer:    "pharmacy-backend-refresh",
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

// VerifyRefreshToken التحقق من صحة refresh token
func VerifyRefreshToken(tokenString string) (jwt.MapClaims, error) {
	// الحصول على مفتاح التوقيع من متغيرات البيئة
	jwtSecret := os.Getenv("JWT_REFRESH_SECRET")
	if jwtSecret == "" {
		// 🛡️ إصلاح أمني: منع استخدام مفتاح افتراضي ضعيف
		return nil, errors.New("JWT_REFRESH_SECRET environment variable is required for security")
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

	return nil, errors.New("refresh token غير صالح")
}
