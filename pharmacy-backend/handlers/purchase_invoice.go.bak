package handlers

import (
	"encoding/json"
	"net/http"
	"pharmacy-backend/models"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

type PurchaseInvoiceRequest struct {
	SupplierID    uint                     `json:"supplier_id"`
	InvoiceNumber string                   `json:"invoice_number"`
	InvoiceDate   string                   `json:"invoice_date"`
	Notes         string                   `json:"notes"`
	Items         []PurchaseInvoiceItemRequest `json:"items"`
}

type PurchaseInvoiceItemRequest struct {
	ProductID   uint    `json:"product_id"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	ExpiryDate  string  `json:"expiry_date"`
	BatchNumber string  `json:"batch_number"`
}

// CreatePurchaseInvoice handles the creation of a new purchase invoice
func CreatePurchaseInvoice(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse request body
		var req PurchaseInvoiceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}
		defer r.Body.Close()

		// Start a database transaction
		tx := db.Begin()
		if tx.Error != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to start transaction")
			return
		}

		// Create the purchase invoice
		invoice := models.PurchaseInvoice{
			SupplierID:    req.SupplierID,
			InvoiceNumber: req.InvoiceNumber,
			InvoiceDate:   req.InvoiceDate,
			Notes:         req.Notes,
		}

		// Calculate total amount
		var totalAmount float64
		var invoiceItems []models.InvoiceItem

		for _, item := range req.Items {
			total := float64(item.Quantity) * item.UnitPrice
			totalAmount += total

			invoiceItems = append(invoiceItems, models.InvoiceItem{
				ProductID:   item.ProductID,
				Quantity:    item.Quantity,
				UnitPrice:   item.UnitPrice,
				TotalPrice:  total,
				ExpiryDate:  item.ExpiryDate,
				BatchNumber: item.BatchNumber,
			})

			// Update product stock
			var product models.Product
			if err := tx.First(&product, item.ProductID).Error; err != nil {
				tx.Rollback()
				respondWithError(w, http.StatusNotFound, "Product not found")
				return
			}

			// Update stock quantity
			product.StockQuantity += item.Quantity
			if err := tx.Save(&product).Error; err != nil {
				tx.Rollback()
				respondWithError(w, http.StatusInternalServerError, "Failed to update product stock")
				return
			}

			// Create inventory transaction
			transaction := models.InventoryTransaction{
				ProductID:     item.ProductID,
				Quantity:      item.Quantity,
				UnitPrice:     item.UnitPrice,
				TransactionType: "purchase",
				ReferenceID:   &invoice.ID,
				ReferenceType: "purchase_invoice",
				Notes:         "فاتورة مشتريات: " + req.InvoiceNumber,
				ExpiryDate:    item.ExpiryDate,
				BatchNumber:   item.BatchNumber,
			}

			if err := tx.Create(&transaction).Error; err != nil {
				tx.Rollback()
				respondWithError(w, http.StatusInternalServerError, "Failed to create inventory transaction")
				return
			}
		}

		// Set the total amount and save the invoice
		invoice.TotalAmount = totalAmount
		if err := tx.Create(&invoice).Error; err != nil {
			tx.Rollback()
			respondWithError(w, http.StatusInternalServerError, "Failed to create purchase invoice")
			return
		}

		// Create invoice items
		for i := range invoiceItems {
			invoiceItems[i].InvoiceID = invoice.ID
			if err := tx.Create(&invoiceItems[i]).Error; err != nil {
				tx.Rollback()
				respondWithError(w, http.StatusInternalServerError, "Failed to create invoice items")
				return
			}
		}

		// Update supplier balance
		var supplier models.Supplier
		if err := tx.First(&supplier, req.SupplierID).Error; err != nil {
			tx.Rollback()
			respondWithError(w, http.StatusNotFound, "Supplier not found")
			return
		}

		// Create supplier transaction
	supplierTransaction := models.SupplierTransaction{
			SupplierID:    req.SupplierID,
			Amount:        totalAmount,
			TransactionType: "purchase",
			ReferenceID:   invoice.ID,
			ReferenceType: "purchase_invoice",
			Notes:         "فاتورة مشتريات: " + req.InvoiceNumber,
			Balance:       supplier.Balance + totalAmount,
		}

		if err := tx.Create(&supplierTransaction).Error; err != nil {
			tx.Rollback()
			respondWithError(w, http.StatusInternalServerError, "Failed to create supplier transaction")
			return
		}

		// Update supplier balance
		supplier.Balance += totalAmount
		if err := tx.Save(&supplier).Error; err != nil {
			tx.Rollback()
			respondWithError(w, http.StatusInternalServerError, "Failed to update supplier balance")
			return
		}

		// Commit the transaction
		if err := tx.Commit().Error; err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to commit transaction")
			return
		}

		// Return the created invoice
		respondWithJSON(w, http.StatusCreated, map[string]interface{}{
			"message": "Purchase invoice created successfully",
			"invoice_id": invoice.ID,
		})
	}
}

// GetPurchaseInvoices returns a list of purchase invoices with pagination
func GetPurchaseInvoices(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get pagination parameters
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}

		pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
		switch {
		case pageSize > 100:
			pageSize = 100
		case pageSize <= 0:
			pageSize = 10
		}

		offset := (page - 1) * pageSize

		// Build query
		query := db.Model(&models.PurchaseInvoice{}).
			Preload("Items").
			Preload("Supplier").
			Order("created_at DESC")

		// Apply filters
		if supplierID := r.URL.Query().Get("supplier_id"); supplierID != "" {
			query = query.Where("supplier_id = ?", supplierID)
		}

		if dateFrom := r.URL.Query().Get("date_from"); dateFrom != "" {
			query = query.Where("invoice_date >= ?", dateFrom)
		}

		if dateTo := r.URL.Query().Get("date_to"); dateTo != "" {
			query = query.Where("invoice_date <= ?", dateTo)
		}

		// Get total count
		var total int64
		if err := query.Count(&total).Error; err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to count purchase invoices")
			return
		}

		// Get paginated results
		var invoices []models.PurchaseInvoice
		if err := query.Offset(offset).Limit(pageSize).Find(&invoices).Error; err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to fetch purchase invoices")
			return
		}

		// Prepare response
		response := map[string]interface{}{
			"data": invoices,
			"pagination": map[string]interface{}{
				"total":     total,
				"page":      page,
				"page_size": pageSize,
				"pages":     (int(total) + pageSize - 1) / pageSize,
			},
		}

		respondWithJSON(w, http.StatusOK, response)
	}
}

// GetPurchaseInvoice returns a single purchase invoice by ID
func GetPurchaseInvoice(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get invoice ID from URL
		vars := mux.Vars(r)
		invoiceID, err := strconv.Atoi(vars["id"])
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid invoice ID")
			return
		}

		// Find the invoice with items and supplier
		var invoice models.PurchaseInvoice
		if err := db.Preload("Items").
			Preload("Supplier").
			Preload("Transactions").
			First(&invoice, invoiceID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				respondWithError(w, http.StatusNotFound, "Invoice not found")
				return
			}
			respondWithError(w, http.StatusInternalServerError, "Failed to fetch invoice")
			return
		}

		respondWithJSON(w, http.StatusOK, invoice)
	}
}

// DeletePurchaseInvoice deletes a purchase invoice and reverses its effects
func DeletePurchaseInvoice(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get invoice ID from URL
		vars := mux.Vars(r)
		invoiceID, err := strconv.Atoi(vars["id"])
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid invoice ID")
			return
		}

		// Start a database transaction
		tx := db.Begin()
		if tx.Error != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to start transaction")
			return
		}

		// Find the invoice with items
		var invoice models.PurchaseInvoice
		if err := tx.Preload("Items").First(&invoice, invoiceID).Error; err != nil {
			tx.Rollback()
			if err == gorm.ErrRecordNotFound {
				respondWithError(w, http.StatusNotFound, "Invoice not found")
				return
			}
			respondWithError(w, http.StatusInternalServerError, "Failed to fetch invoice")
			return
		}

		// Reverse inventory transactions
		for _, item := range invoice.Items {
			// Update product stock
			var product models.Product
			if err := tx.First(&product, item.ProductID).Error; err != nil {
				tx.Rollback()
				respondWithError(w, http.StatusInternalServerError, "Failed to find product")
				return
			}

			// Check if we have enough stock
			if product.StockQuantity < item.Quantity {
				tx.Rollback()
				respondWithError(w, http.StatusBadRequest, "Not enough stock to reverse this transaction")
				return
			}

			// Update stock quantity
			product.StockQuantity -= item.Quantity
			if err := tx.Save(&product).Error; err != nil {
				tx.Rollback()
				respondWithError(w, http.StatusInternalServerError, "Failed to update product stock")
				return
			}

			// Create reverse inventory transaction
			reverseTransaction := models.InventoryTransaction{
				ProductID:       item.ProductID,
				Quantity:        -item.Quantity,
				UnitPrice:       item.UnitPrice,
				TransactionType: "purchase_return",
				ReferenceID:     &invoice.ID,
				ReferenceType:   "purchase_invoice",
				Notes:           "إلغاء فاتورة مشتريات: " + invoice.InvoiceNumber,
				ExpiryDate:      item.ExpiryDate,
				BatchNumber:     item.BatchNumber,
			}

			if err := tx.Create(&reverseTransaction).Error; err != nil {
				tx.Rollback()
				respondWithError(w, http.StatusInternalServerError, "Failed to create reverse transaction")
				return
			}
		}

		// Update supplier balance
		var supplier models.Supplier
		if err := tx.First(&supplier, invoice.SupplierID).Error; err != nil {
			tx.Rollback()
			respondWithError(w, http.StatusInternalServerError, "Failed to find supplier")
			return
		}

		// Create reverse supplier transaction
	reverseSupplierTransaction := models.SupplierTransaction{
			SupplierID:      invoice.SupplierID,
			Amount:          -invoice.TotalAmount,
			TransactionType: "purchase_return",
			ReferenceID:     invoice.ID,
			ReferenceType:   "purchase_invoice",
			Notes:           "إلغاء فاتورة مشتريات: " + invoice.InvoiceNumber,
			Balance:         supplier.Balance - invoice.TotalAmount,
		}

		if err := tx.Create(&reverseSupplierTransaction).Error; err != nil {
			tx.Rollback()
			respondWithError(w, http.StatusInternalServerError, "Failed to create reverse supplier transaction")
			return
		}

		// Update supplier balance
		supplier.Balance -= invoice.TotalAmount
		if err := tx.Save(&supplier).Error; err != nil {
			tx.Rollback()
			respondWithError(w, http.StatusInternalServerError, "Failed to update supplier balance")
			return
		}

		// Soft delete the invoice (sets deleted_at)
		if err := tx.Delete(&invoice).Error; err != nil {
			tx.Rollback()
			respondWithError(w, http.StatusInternalServerError, "Failed to delete invoice")
			return
		}

		// Commit the transaction
		if err := tx.Commit().Error; err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to commit transaction")
			return
		}

		respondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Purchase invoice deleted successfully",
		})
	}
}
