package dto

import (
	"time"
	"github.com/google/uuid"
)

// OrderResponseDTO يمثل استجابة إنشاء/جلب الطلب للواجهة الأمامية
// نحافظ على الحقول الضرورية فقط لضمان استقرار التوافق مع الواجهة.
type OrderResponseDTO struct {
	ID           uuid.UUID `json:"id"`
	OrderNumber  string    `json:"order_number"`
	Status       string    `json:"status"`
	TotalAmount  float64   `json:"total_amount"`
	CreatedAt    time.Time `json:"created_at"`
	ItemsCount   int       `json:"items_count"`
}
