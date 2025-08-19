package migrations

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateWholesaleUpgradeRequestsTable migration
func CreateWholesaleUpgradeRequestsTable(db *gorm.DB) error {
	type WholesaleUpgradeRequest struct {
		ID                    uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
		UserID                uuid.UUID `gorm:"type:uuid;not null;index"`
		CompanyName           string    `gorm:"not null"`
		TaxNumber             string
		CommercialRegister    string    `gorm:"not null"`
		IDDocumentURL         string    `gorm:"not null"`
		CommercialDocumentURL string    `gorm:"not null"`
		Status                string    `gorm:"type:varchar(20);default:'pending'"`
		RejectionReason       string
		ProcessedBy           *uuid.UUID `gorm:"type:uuid"`
		ProcessedAt           *time.Time
		CreatedAt             time.Time
		UpdatedAt             time.Time
	}

	return db.AutoMigrate(&WholesaleUpgradeRequest{})
}

// DropWholesaleUpgradeRequestsTable drops the wholesale upgrade requests table
func DropWholesaleUpgradeRequestsTable(db *gorm.DB) error {
	return db.Migrator().DropTable("wholesale_upgrade_requests")
}
