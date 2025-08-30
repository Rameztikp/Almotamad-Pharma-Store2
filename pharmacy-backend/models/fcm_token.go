package models

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var db *gorm.DB

// SetDB sets the database connection for the models package
func SetDB(database *gorm.DB) {
	db = database
}

type FCMToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index"`
	Token     string    `gorm:"type:text;not null"`
	DeviceID  string    `gorm:"type:varchar(255);index"`
	CreatedAt time.Time `gorm:"not null;default:now()"`
	UpdatedAt time.Time `gorm:"not null;default:now()"`

	// Relations
	User User `gorm:"foreignKey:UserID"`
}

// SaveFCMToken saves or updates an FCM token for a user
func SaveFCMToken(ctx context.Context, userID, token string) error {
	if userID == "" || token == "" {
		return gorm.ErrInvalidData
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	// Check if token already exists for this user
	var existingToken FCMToken
	err = db.WithContext(ctx).
		Where("user_id = ? AND token = ?", userUUID, token).
		First(&existingToken).Error

	if err == nil {
		// Token exists, update updated_at
		return db.WithContext(ctx).
			Model(&existingToken).
			Update("updated_at", time.Now()).
			Error
	}

	if err != gorm.ErrRecordNotFound {
		return err
	}

	// Create new token
	newToken := FCMToken{
		UserID: userUUID,
		Token:  token,
	}

	return db.WithContext(ctx).Create(&newToken).Error
}

// GetFCMToken retrieves the most recent FCM token for a user
func GetFCMToken(userID string) (string, error) {
	if userID == "" {
		return "", gorm.ErrInvalidData
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return "", err
	}

	var token FCMToken
	err = db.
		Where("user_id = ?", userUUID).
		Order("updated_at DESC").
		First(&token).Error

	if err != nil {
		return "", err
	}

	return token.Token, nil
}

// DeleteFCMToken removes an FCM token
func DeleteFCMToken(ctx context.Context, userID, token string) error {
	if userID == "" || token == "" {
		return gorm.ErrInvalidData
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	return db.WithContext(ctx).
		Where("user_id = ? AND token = ?", userUUID, token).
		Delete(&FCMToken{}).Error
}
