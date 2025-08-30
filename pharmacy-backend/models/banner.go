package models

import (
	"database/sql"
	"time"
)

// AudienceType represents the target audience for the banner
type AudienceType string

const (
	AudienceRetail    AudienceType = "retail"
	AudienceWholesale AudienceType = "wholesale"
	AudienceAll       AudienceType = "all"
)

// DisplayModeType represents the image display mode for the banner
type DisplayModeType string

const (
	DisplayContain DisplayModeType = "contain"
	DisplayCover   DisplayModeType = "cover"
)

// Banner represents a promotional banner - matches actual database schema
type Banner struct {
	ID          uint            `json:"id" gorm:"primaryKey"`
	Audience    AudienceType    `json:"audience" gorm:"type:audience_type;default:'all';not null"`
	Title       string          `json:"title" gorm:"size:150;not null"`
	Subtitle    sql.NullString  `json:"subtitle" gorm:"size:255"`
	ImageURL    string          `json:"image_url" gorm:"size:600;not null"`
	LinkURL     sql.NullString  `json:"link_url" gorm:"size:600"`
	AltText     string          `json:"alt_text" gorm:"size:200;not null"`
	DisplayMode DisplayModeType `json:"display_mode" gorm:"type:enum('contain','cover');default:'contain'"`
	IsActive    bool            `json:"is_active" gorm:"default:true"`
	SortOrder   int             `json:"sort_order" gorm:"default:0"`
	StartsAt    *time.Time      `json:"starts_at"`
	EndsAt      *time.Time      `json:"ends_at"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// TableName specifies the table name for the Banner model
func (Banner) TableName() string {
	return "banners"
}
