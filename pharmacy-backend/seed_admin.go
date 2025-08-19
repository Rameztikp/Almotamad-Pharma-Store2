package main

import (
	"log"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func seedAdmin() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️ Failed to load .env file")
	}

	// Connect to the database
	config.ConnectDatabase()

	// Get the database connection
	db := config.DB

	// Check if admin user already exists
	var adminUser models.User
	adminEmail := "admin@example.com"

	if err := db.Where("email = ?", adminEmail).First(&adminUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Hash the admin password
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
			if err != nil {
				log.Fatal("❌ Failed to hash password:", err)
			}

			// Create admin user
			adminUser = models.User{
				ID:        uuid.New(),
				FullName:  "Admin User",
				Email:     adminEmail,
				PasswordHash:  string(hashedPassword),
				Role:      "admin",
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			if err := db.Create(&adminUser).Error; err != nil {
				log.Fatal("❌ Failed to create admin user:", err)
			}

			log.Println("✅ Admin user created successfully!")
			log.Println("📧 Email:", adminEmail)
			log.Println("🔑 Password: admin123")
		} else {
			log.Fatal("❌ Error searching for admin user:", err)
		}
	} else {
		log.Println("ℹ️  Admin user already exists:", adminUser.Email)
	}
}

// Add this function to seed.go
// func main() {
// 	seedAdmin()
// }
