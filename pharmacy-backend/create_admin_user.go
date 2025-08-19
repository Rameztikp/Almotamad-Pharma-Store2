//go:build admin_script

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

func main() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️ Failed to load .env file")
	}

	// Connect to the database
	config.ConnectDatabase()

	// Get the database connection
	db := config.DB

	// Admin user details
	adminEmail := "admin@example.com"
	adminPassword := "admin123"
	adminName := "Admin User"

	// Check if admin user already exists
	var adminUser models.User
	if err := db.Where("email = ?", adminEmail).First(&adminUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Hash the admin password
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
			if err != nil {
				log.Fatal("❌ Failed to hash password:", err)
			}

			// Create admin user
			adminUser = models.User{
				ID:           uuid.New(),
				FullName:     adminName,
				Email:        adminEmail,
				PasswordHash: string(hashedPassword),
				Role:         models.RoleAdmin, // استخدام النموذج
				IsActive:     true,
				AccountType:  models.RetailAccount,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}

			if err := db.Create(&adminUser).Error; err != nil {
				log.Fatal("❌ Failed to create admin user:", err)
			}

			log.Println("✅ Admin user created successfully!")
			log.Println("📧 Email:", adminEmail)
			log.Println("🔑 Password:", adminPassword)
			log.Println("👤 Role:", adminUser.Role)
		} else {
			log.Fatal("❌ Error searching for admin user:", err)
		}
	} else {
		// Update existing admin user to ensure correct role
		log.Println("ℹ️  Admin user already exists, updating role...")
		
		// Update role to admin if not already
		if adminUser.Role != models.RoleAdmin && adminUser.Role != models.RoleSuperAdmin {
			adminUser.Role = models.RoleAdmin
			adminUser.IsActive = true
			adminUser.UpdatedAt = time.Now()
			
			if err := db.Save(&adminUser).Error; err != nil {
				log.Fatal("❌ Failed to update admin user:", err)
			}
			
			log.Println("✅ Admin user role updated successfully!")
		}
		
		log.Println("📧 Email:", adminUser.Email)
		log.Println("👤 Role:", adminUser.Role)
		log.Println("✅ Status:", adminUser.IsActive)
	}
} 