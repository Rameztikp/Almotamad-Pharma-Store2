package main

import (
	"log"
	"time"

	"pharmacy-backend/config"
	"pharmacy-backend/models"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func RunCreateAdmin() error {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️ Warning: Could not load .env file")
	}

	// Connect to database
	config.ConnectDatabase()
	db := config.DB

	// Check if admin exists
	var admin models.User
	adminEmail := "admin@example.com"

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("❌ Failed to hash password:", err)
	}

	admin = models.User{
		ID:           uuid.New(),
		FullName:     "Admin User",
		Email:        adminEmail,
		PasswordHash: string(hashedPassword),
		Role:         "admin",
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Check if admin exists
	var existingUser models.User
	result := db.Where("email = ?", adminEmail).First(&existingUser)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Create new admin if not exists
			if err := db.Create(&admin).Error; err != nil {
				log.Fatal("❌ Failed to create admin user:", err)
			}
		} else {
			log.Fatal("❌ Error checking for existing admin:", result.Error)
		}
	} else {
		// Update existing admin
		existingUser.PasswordHash = admin.PasswordHash
		existingUser.IsActive = true
		existingUser.Role = "admin"
		if err := db.Save(&existingUser).Error; err != nil {
			log.Fatal("❌ Failed to update admin user:", err)
		}
		log.Println("ℹ️  Existing admin user updated")
	}

	log.Println("✅ Admin user created/updated successfully!")
	log.Println("📧 Email:", adminEmail)
	log.Println("🔑 Password: admin123")
	return nil
}
