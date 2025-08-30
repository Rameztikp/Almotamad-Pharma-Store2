package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter هيكل للتحكم في معدل الطلبات
type RateLimiter struct {
	visitors map[string]*Visitor
	mu       sync.RWMutex
	rate     time.Duration
	capacity int
}

// Visitor معلومات الزائر
type Visitor struct {
	limiter  chan struct{}
	lastSeen time.Time
}

// NewRateLimiter إنشاء rate limiter جديد
func NewRateLimiter(rate time.Duration, capacity int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*Visitor),
		rate:     rate,
		capacity: capacity,
	}

	// تنظيف الزوار القدامى كل دقيقة
	go rl.cleanupVisitors()

	return rl
}

// cleanupVisitors تنظيف الزوار الذين لم يقوموا بطلبات لأكثر من 3 دقائق
func (rl *RateLimiter) cleanupVisitors() {
	for {
		time.Sleep(time.Minute)
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// getVisitor الحصول على معلومات الزائر أو إنشاء جديد
func (rl *RateLimiter) getVisitor(ip string) *Visitor {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		limiter := make(chan struct{}, rl.capacity)
		// ملء القناة بالسعة الكاملة
		for i := 0; i < rl.capacity; i++ {
			limiter <- struct{}{}
		}
		v = &Visitor{limiter: limiter, lastSeen: time.Now()}
		rl.visitors[ip] = v

		// إعادة ملء التوكنات بمعدل محدد
		go func() {
			ticker := time.NewTicker(rl.rate)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					select {
					case v.limiter <- struct{}{}:
					default:
					}
				}
			}
		}()
	}

	v.lastSeen = time.Now()
	return v
}

// LoginRateLimit middleware للحد من محاولات تسجيل الدخول
func LoginRateLimit() gin.HandlerFunc {
	// 5 محاولات كل دقيقة لكل IP
	limiter := NewRateLimiter(12*time.Second, 5)

	return func(c *gin.Context) {
		// الحصول على IP الحقيقي
		ip := c.ClientIP()
		if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
			ip = forwarded
		}
		if realIP := c.GetHeader("X-Real-IP"); realIP != "" {
			ip = realIP
		}

		visitor := limiter.getVisitor(ip)

		select {
		case <-visitor.limiter:
			// السماح بالطلب
			c.Next()
		default:
			// رفض الطلب - تم تجاوز الحد المسموح
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "تم تجاوز الحد المسموح من محاولات تسجيل الدخول. يرجى المحاولة مرة أخرى بعد دقيقة",
				"error":   "rate_limit_exceeded",
			})
			c.Abort()
		}
	}
}

// GeneralRateLimit middleware عام للحد من الطلبات
func GeneralRateLimit(requestsPerMinute int) gin.HandlerFunc {
	rate := time.Minute / time.Duration(requestsPerMinute)
	limiter := NewRateLimiter(rate, requestsPerMinute)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
			ip = forwarded
		}

		visitor := limiter.getVisitor(ip)

		select {
		case <-visitor.limiter:
			c.Next()
		default:
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة مرة أخرى لاحقاً",
				"error":   "rate_limit_exceeded",
			})
			c.Abort()
		}
	}
}
