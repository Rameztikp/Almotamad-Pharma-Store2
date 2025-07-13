package main

import (
	"log"
	"os"
	"pharmacy-backend/config"
	"pharmacy-backend/models"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

func seedDatabase() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️ Failed to load .env file")
	}

	// Print database password for debugging
	log.Println("📌 Database password:", os.Getenv("DB_PASSWORD"))

	// Execute the seeding process
	seed()
}

func seed() {
	// Connect to the database
	config.ConnectDatabase()

	// Get the database connection
	db := config.DB

	// Check if the category exists
	var existingCategory models.Category
	categoryName := "مستحضرات تجميل"
	
	if err := db.Where("name = ?", categoryName).First(&existingCategory).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create a new category
			category := models.Category{
				ID:        uuid.New(),
				Name:      categoryName,
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			if err := db.Create(&category).Error; err != nil {
				log.Fatal("❌ Failed to create category:", err)
			}
			existingCategory = category
			log.Println("✅ Created new category:", categoryName)
		} else {
			log.Fatal("❌ Error searching for category:", err)
		}
	} else {
		log.Println("ℹ️  Found existing category:", existingCategory.Name)
	}

	// Check if the product exists
	sku := "CR1001"
	var existingProduct models.Product
	if err := db.Where("sku = ?", sku).First(&existingProduct).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create a new product
			discountPrice := 39.99
			product := models.Product{
				ID:              uuid.New(),
				Name:           "كريم تفتيح البشرة",
				Description:    "كريم طبيعي لتفتيح البشرة وتوحيد اللون",
				SKU:            sku,
				Price:          49.99,
				DiscountPrice:  &discountPrice,
				StockQuantity:  100,
				ImageURL:       "https://via.placeholder.com/300",
				IsActive:       true,
				IsFeatured:     true, // Mark as featured product
				CategoryID:     existingCategory.ID,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}
			if err := db.Create(&product).Error; err != nil {
				log.Fatal("❌ Failed to create product:", err)
			}
			log.Println("✅ Created new product:", product.Name)
		} else {
			log.Fatal("❌ Error searching for product:", err)
		}
	} else {
		// Update existing product to be featured
		if !existingProduct.IsFeatured {
			existingProduct.IsFeatured = true
			existingProduct.UpdatedAt = time.Now()
			if err := db.Save(&existingProduct).Error; err != nil {
				log.Fatal("❌ Failed to update product:", err)
			}
			log.Println("✅ Updated product to be featured:", existingProduct.Name)
		} else {
			log.Println("ℹ️  Product is already featured:", existingProduct.Name)
		}
	}

	log.Println("✅ Seeding completed successfully!")
}
