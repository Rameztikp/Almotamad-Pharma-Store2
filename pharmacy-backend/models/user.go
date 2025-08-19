package models

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

type AccountType string

const (
	RoleCustomer   UserRole = "customer"
	RoleAdmin      UserRole = "admin"
	RoleSuperAdmin UserRole = "super_admin"
	RoleWholesale  UserRole = "wholesale"
)

const (
	RetailAccount   AccountType = "retail"
	WholesaleAccount AccountType = "wholesale"
)

type User struct {
	ID              uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email           string      `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash    string      `json:"-" gorm:"not null"`
	FullName        string      `json:"full_name" gorm:"not null"`
	Phone           string      `json:"phone" gorm:"not null"`
	DateOfBirth     *time.Time  `json:"date_of_birth,omitempty" gorm:"type:date"`
	AccountType     AccountType `json:"account_type" gorm:"type:varchar(20);default:'retail'"`
	Role            UserRole    `json:"role" gorm:"type:varchar(20);default:'customer'"`
	IsActive        bool        `json:"is_active" gorm:"default:false"`
	EmailVerified   bool        `json:"email_verified" gorm:"default:false"`
	PhoneVerified   bool        `json:"phone_verified" gorm:"default:false"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	LastLoginAt     *time.Time  `json:"last_login_at"`
	
	// Wholesale specific fields
	WholesaleAccess     bool   `json:"wholesale_access" gorm:"default:false"` // صلاحية الوصول للجملة
	CompanyName         string `json:"company_name,omitempty"`
	CommercialRegister  string `json:"commercial_register,omitempty"`
	IDDocumentURL       string `json:"id_document_url,omitempty"`
	CommercialDocumentURL string `json:"commercial_document_url,omitempty"`
	
	// العلاقات
	Addresses   []Address   `json:"addresses,omitempty" gorm:"foreignKey:UserID"`
	Orders      []Order     `json:"orders,omitempty" gorm:"foreignKey:UserID"`
	CartItems   []CartItem  `json:"cart_items,omitempty" gorm:"foreignKey:UserID"`
	Favorites   []Favorite  `json:"favorites,omitempty" gorm:"foreignKey:UserID"`
}

// BeforeCreate hook لإنشاء UUID قبل الحفظ
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// TableName تحديد اسم الجدول
func (User) TableName() string {
	return "users"
}

// SplitFullName تقسيم الاسم الكامل إلى اسم أول واسم عائلة
func (u *User) SplitFullName() (string, string) {
	names := strings.Fields(u.FullName)
	if len(names) == 0 {
		return "", ""
	}
	if len(names) == 1 {
		return names[0], ""
	}
	return names[0], strings.Join(names[1:], " ")
}

// IsAdmin التحقق من كون المستخدم إداري
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin || u.Role == RoleSuperAdmin
}

// IsSuperAdmin التحقق من كون المستخدم إداري عام
func (u *User) IsSuperAdmin() bool {
	return u.Role == RoleSuperAdmin
}

