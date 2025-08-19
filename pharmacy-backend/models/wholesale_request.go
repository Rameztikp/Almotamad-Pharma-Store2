package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WholesaleRequestStatus string

const (
	RequestStatusPending  WholesaleRequestStatus = "pending"
	RequestStatusApproved WholesaleRequestStatus = "approved"
	RequestStatusRejected WholesaleRequestStatus = "rejected"
)

type WholesaleUpgradeRequest struct {
	ID                    uuid.UUID             `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID                uuid.UUID             `json:"user_id" gorm:"type:uuid;not null;index"`
	User                  User                  `json:"user" gorm:"foreignKey:UserID"`
	CompanyName           string                `json:"company_name" gorm:"not null"`
	TaxNumber             string                `json:"tax_number"`
	CommercialRegister    string                `json:"commercial_register" gorm:"not null"`
	IDDocumentURL         string                `json:"id_document_url" gorm:"not null"`
	CommercialDocumentURL string                `json:"commercial_document_url" gorm:"not null"`
	Status                WholesaleRequestStatus `json:"status" gorm:"type:varchar(20);default:'pending'"`
	RejectionReason       string                `json:"rejection_reason,omitempty"`
	ProcessedBy           *uuid.UUID            `json:"processed_by,omitempty" gorm:"type:uuid"`
	ProcessedAt           *time.Time            `json:"processed_at,omitempty"`
	CreatedAt             time.Time             `json:"created_at"`
	UpdatedAt             time.Time             `json:"updated_at"`
}

// TableName specifies the table name for the model
func (WholesaleUpgradeRequest) TableName() string {
	return "wholesale_upgrade_requests"
}

// BeforeCreate sets the CreatedAt field
func (w *WholesaleUpgradeRequest) BeforeCreate(tx *gorm.DB) error {
	now := time.Now()
	w.CreatedAt = now
	w.UpdatedAt = now
	return nil
}

// BeforeUpdate updates the UpdatedAt field
func (w *WholesaleUpgradeRequest) BeforeUpdate(tx *gorm.DB) error {
	w.UpdatedAt = time.Now()
	return nil
}
