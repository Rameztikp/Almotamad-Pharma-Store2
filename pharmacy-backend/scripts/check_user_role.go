package main

import (
	"fmt"
	"os"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("الرجاء إدخال معرف المستخدم")
		os.Exit(1)
	}

	userID := os.Args[1]
	config.ConnectDatabase()

	var user models.User
	result := config.DB.Where("id = ?", userID).First(&user)
	if result.Error != nil {
		fmt.Printf("خطأ في العثور على المستخدم: %v\n", result.Error)
		os.Exit(1)
	}

	fmt.Println("=== معلومات المستخدم ===")
	fmt.Printf("الاسم: %s\n", user.FullName)
	fmt.Printf("البريد الإلكتروني: %s\n", user.Email)
	fmt.Printf("الدور: %s\n", user.Role)
	fmt.Printf("مفعل: %v\n", user.IsActive)
}
