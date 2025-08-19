package main

// RunCheckAdmin تقوم بالتحقق من وجود المشرف في قاعدة البيانات

import (
	"fmt"

	"pharmacy-backend/config"
	"pharmacy-backend/models"

	"golang.org/x/crypto/bcrypt"
)

func RunCheckAdmin() error {
	// Connect to database
	config.ConnectDatabase()
	db := config.DB

	// Check admin user
	var admin models.User
	adminEmail := "admin@example.com"

	if err := db.Where("email = ?", adminEmail).First(&admin).Error; err != nil {
		fmt.Printf("❌ Admin user not found: %v\n", err)
		return err
	}

	fmt.Println("✅ Admin user found:")
	fmt.Printf("ID: %s\n", admin.ID)
	fmt.Printf("Email: %s\n", admin.Email)
	fmt.Printf("Full Name: %s\n", admin.FullName)
	fmt.Printf("Role: %s\n", admin.Role)
	fmt.Printf("Is Active: %v\n", admin.IsActive)

	// Test password
	err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte("admin123"))
	if err != nil {
		fmt.Println("❌ Password does not match")
	} else {
		fmt.Println("✅ Password matches")
	}
	return nil
}
