package handlers

import (
	"fmt"
	"net/http"
	"os"
	"pharmacy-backend/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// Helper functions for environment variables
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	value := getEnv(key, "")
	if value == "" {
		return defaultValue
	}
	boolValue, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}
	return boolValue
}

func getEnvInt(key string, defaultValue int) int {
	value := getEnv(key, "")
	if value == "" {
		return defaultValue
	}
	intValue, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return intValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	value := getEnv(key, "")
	if value == "" {
		return defaultValue
	}
	floatValue, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return defaultValue
	}
	return floatValue
}

func setEnv(key string, value interface{}) {
	// In a real application, you would save this to a database
	// For now, we'll just set it in the current process environment
	os.Setenv(key, toString(value))
}

func toString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v)
	case float32, float64:
		return fmt.Sprintf("%f", v)
	case bool:
		return strconv.FormatBool(v)
	default:
		return fmt.Sprintf("%v", v)
	}
}

// Settings represents application settings
type Settings struct {
	// Store Information
	StoreName          string   `json:"store_name"`
	StoreEmail         string   `json:"store_email"`
	StorePhone         string   `json:"store_phone"`
	StoreAddress       string   `json:"store_address"`
	StoreLogoURL       string   `json:"store_logo_url"`
	StoreDescription   string   `json:"store_description"`
	
	// Currency and Pricing
	Currency           string   `json:"currency"`
	CurrencySymbol     string   `json:"currency_symbol"`
	TaxRate            float64  `json:"tax_rate"`
	TaxInclusive       bool     `json:"tax_inclusive"`
	
	// Shipping
	ShippingMethods    []string `json:"shipping_methods"`
	FreeShippingMin    float64  `json:"free_shipping_min"`
	ShippingCost       float64  `json:"shipping_cost"`
	
	// Payment
	PaymentGateways    []string `json:"payment_gateways"`
	DefaultPayment     string   `json:"default_payment"`
	
	// Store Settings
	MaintenanceMode    bool     `json:"maintenance_mode"`
	RegistrationOpen   bool     `json:"registration_open"`
	DefaultUserRole    string   `json:"default_user_role"`
	ItemsPerPage       int      `json:"items_per_page"`
	
	// Notifications
	EmailNotifications bool     `json:"email_notifications"`
	SMSNotifications   bool     `json:"sms_notifications"`
	
	// SEO
	MetaTitle          string   `json:"meta_title"`
	MetaDescription    string   `json:"meta_description"`
	MetaKeywords       []string `json:"meta_keywords"`
	
	// Social Media
	FacebookURL        string   `json:"facebook_url"`
	TwitterURL         string   `json:"twitter_url"`
	InstagramURL       string   `json:"instagram_url"`
	WhatsappNumber     string   `json:"whatsapp_number"`
}

// GetSettings returns current application settings
// @Summary Get application settings
// @Description Retrieve all application settings
// @Tags Admin - Settings
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{} "Success response with settings"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/settings [get]
func GetSettings(c *gin.Context) {
	settings := Settings{
		// Store Information
		StoreName:          getEnv("STORE_NAME", "صيدلية المعتمد"),
		StoreEmail:         getEnv("STORE_EMAIL", "info@almoatamad-pharmacy.com"),
		StorePhone:         getEnv("STORE_PHONE", "+966123456789"),
		StoreAddress:       getEnv("STORE_ADDRESS", "الرياض، المملكة العربية السعودية"),
		StoreLogoURL:       getEnv("STORE_LOGO_URL", "/images/logo.png"),
		StoreDescription:   getEnv("STORE_DESCRIPTION", "متجر صيدلية المعتمد - كل ما تحتاجه من أدوية ومستحضرات طبية"),
		
		// Currency and Pricing
		Currency:           getEnv("CURRENCY", "SAR"),
		CurrencySymbol:     getEnv("CURRENCY_SYMBOL", "ر.س"),
		TaxRate:            getEnvFloat("TAX_RATE", 0.15),
		TaxInclusive:       getEnvBool("TAX_INCLUSIVE", true),
		
		// Shipping
		ShippingMethods:    []string{"التوصيل السريع", "التوصيل العادي", "الاستلام من المتجر"},
		FreeShippingMin:    getEnvFloat("FREE_SHIPPING_MIN", 200.0),
		ShippingCost:       getEnvFloat("SHIPPING_COST", 15.0),
		
		// Payment
		PaymentGateways:    []string{"الدفع عند الاستلام", "حوالة بنكية", "بطاقة ائتمانية"},
		DefaultPayment:     getEnv("DEFAULT_PAYMENT", "الدفع عند الاستلام"),
		
		// Store Settings
		MaintenanceMode:    getEnvBool("MAINTENANCE_MODE", false),
		RegistrationOpen:   getEnvBool("REGISTRATION_OPEN", true),
		DefaultUserRole:    getEnv("DEFAULT_USER_ROLE", "customer"),
		ItemsPerPage:       getEnvInt("ITEMS_PER_PAGE", 10),
		
		// Notifications
		EmailNotifications: getEnvBool("EMAIL_NOTIFICATIONS", true),
		SMSNotifications:   getEnvBool("SMS_NOTIFICATIONS", true),
		
		// SEO
		MetaTitle:          getEnv("META_TITLE", "صيدلية المعتمد - متجر الأدوية الإلكتروني"),
		MetaDescription:    getEnv("META_DESCRIPTION", "تسوق من صيدلية المعتمد - تشكيلة واسعة من الأدوية والمستحضرات الطبية"),
		MetaKeywords:       []string{"صيدلية", "أدوية", "مستحضرات طبية", "المعتمد"},
		
		// Social Media
		FacebookURL:        getEnv("FACEBOOK_URL", "https://facebook.com/almoatamadpharmacy"),
		TwitterURL:         getEnv("TWITTER_URL", "https://twitter.com/almoatamadpharma"),
		InstagramURL:       getEnv("INSTAGRAM_URL", "https://instagram.com/almoatamadpharmacy"),
		WhatsappNumber:     getEnv("WHATSAPP_NUMBER", "+966501234567"),
	}

	utils.SuccessResponse(c, "Settings retrieved successfully", settings)
}

// UpdateSettingsRequest represents the request body for updating settings
type UpdateSettingsRequest struct {
	// Store Information
	StoreName        *string   `json:"store_name,omitempty"`
	StoreEmail       *string   `json:"store_email,omitempty"`
	StorePhone       *string   `json:"store_phone,omitempty"`
	StoreAddress     *string   `json:"store_address,omitempty"`
	StoreLogoURL     *string   `json:"store_logo_url,omitempty"`
	StoreDescription *string   `json:"store_description,omitempty"`

	// Currency and Pricing
	Currency         *string   `json:"currency,omitempty"`
	CurrencySymbol   *string   `json:"currency_symbol,omitempty"`
	TaxRate          *float64  `json:"tax_rate,omitempty"`
	TaxInclusive     *bool     `json:"tax_inclusive,omitempty"`

	// Shipping
	ShippingMethods  *[]string `json:"shipping_methods,omitempty"`
	FreeShippingMin  *float64  `json:"free_shipping_min,omitempty"`
	ShippingCost     *float64  `json:"shipping_cost,omitempty"`

	// Payment
	PaymentGateways  *[]string `json:"payment_gateways,omitempty"`
	DefaultPayment   *string   `json:"default_payment,omitempty"`

	// Store Settings
	MaintenanceMode  *bool     `json:"maintenance_mode,omitempty"`
	RegistrationOpen *bool     `json:"registration_open,omitempty"`
	DefaultUserRole  *string   `json:"default_user_role,omitempty"`
	ItemsPerPage     *int      `json:"items_per_page,omitempty"`

	// Notifications
	EmailNotifications *bool   `json:"email_notifications,omitempty"`
	SMSNotifications   *bool   `json:"sms_notifications,omitempty"`

	// SEO
	MetaTitle       *string   `json:"meta_title,omitempty"`
	MetaDescription *string   `json:"meta_description,omitempty"`
	MetaKeywords    *[]string `json:"meta_keywords,omitempty"`

	// Social Media
	FacebookURL    *string `json:"facebook_url,omitempty"`
	TwitterURL     *string `json:"twitter_url,omitempty"`
	InstagramURL   *string `json:"instagram_url,omitempty"`
	WhatsappNumber *string `json:"whatsapp_number,omitempty"`
}

// UpdateSettings updates application settings
// @Summary Update application settings
// @Description Update one or more application settings
// @Tags Admin - Settings
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param request body UpdateSettingsRequest true "Settings to update"
// @Success 200 {object} map[string]interface{} "Success response with updated settings"
// @Failure 400 {object} map[string]interface{} "Invalid request data"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/settings [put]
func UpdateSettings(c *gin.Context) {
	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	// Validate request
	if req.TaxRate != nil && (*req.TaxRate < 0 || *req.TaxRate > 1) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid tax rate", "Tax rate must be between 0 and 1")
		return
	}

	if req.ItemsPerPage != nil && *req.ItemsPerPage <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid items per page", "Items per page must be greater than 0")
		return
	}

	// Update settings in environment variables
	updateEnvIfSet := func(key string, value interface{}) {
		if value != nil {
			switch v := value.(type) {
			case *string:
				if v != nil {
					setEnv(key, *v)
				}
			case *bool, *int, *float64:
				setEnv(key, v)
			case *[]string:
				if v != nil {
					setEnv(key, *v)
				}
			}
		}
	}

	// Store Information
	updateEnvIfSet("STORE_NAME", req.StoreName)
	updateEnvIfSet("STORE_EMAIL", req.StoreEmail)
	updateEnvIfSet("STORE_PHONE", req.StorePhone)
	updateEnvIfSet("STORE_ADDRESS", req.StoreAddress)
	updateEnvIfSet("STORE_LOGO_URL", req.StoreLogoURL)
	updateEnvIfSet("STORE_DESCRIPTION", req.StoreDescription)

	// Currency and Pricing
	updateEnvIfSet("CURRENCY", req.Currency)
	updateEnvIfSet("CURRENCY_SYMBOL", req.CurrencySymbol)
	updateEnvIfSet("TAX_RATE", req.TaxRate)
	updateEnvIfSet("TAX_INCLUSIVE", req.TaxInclusive)

	// Shipping
	updateEnvIfSet("SHIPPING_METHODS", req.ShippingMethods)
	updateEnvIfSet("FREE_SHIPPING_MIN", req.FreeShippingMin)
	updateEnvIfSet("SHIPPING_COST", req.ShippingCost)

	// Payment
	updateEnvIfSet("PAYMENT_GATEWAYS", req.PaymentGateways)
	updateEnvIfSet("DEFAULT_PAYMENT", req.DefaultPayment)

	// Store Settings
	updateEnvIfSet("MAINTENANCE_MODE", req.MaintenanceMode)
	updateEnvIfSet("REGISTRATION_OPEN", req.RegistrationOpen)
	updateEnvIfSet("DEFAULT_USER_ROLE", req.DefaultUserRole)
	updateEnvIfSet("ITEMS_PER_PAGE", req.ItemsPerPage)

	// Notifications
	updateEnvIfSet("EMAIL_NOTIFICATIONS", req.EmailNotifications)
	updateEnvIfSet("SMS_NOTIFICATIONS", req.SMSNotifications)

	// SEO
	updateEnvIfSet("META_TITLE", req.MetaTitle)
	updateEnvIfSet("META_DESCRIPTION", req.MetaDescription)
	updateEnvIfSet("META_KEYWORDS", req.MetaKeywords)

	// Social Media
	updateEnvIfSet("FACEBOOK_URL", req.FacebookURL)
	updateEnvIfSet("TWITTER_URL", req.TwitterURL)
	updateEnvIfSet("INSTAGRAM_URL", req.InstagramURL)
	updateEnvIfSet("WHATSAPP_NUMBER", req.WhatsappNumber)

	// Return updated settings
	GetSettings(c)
}

// PaymentGateway represents a payment gateway configuration
type PaymentGateway struct {
	ID                  string   `json:"id"`
	Name                string   `json:"name"`
	Description         string   `json:"description"`
	Enabled            bool     `json:"enabled"`
	TestMode           bool     `json:"test_mode"`
	SupportedCurrencies []string `json:"supported_currencies"`
	IconURL            string   `json:"icon_url,omitempty"`
	Instructions       string   `json:"instructions,omitempty"`
	AdditionalData     string   `json:"additional_data,omitempty"`
}

// GetPaymentGateways returns available payment gateways
// @Summary Get payment gateways
// @Description Retrieve all available payment gateways and their status
// @Tags Admin - Payment Gateways
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {array} PaymentGateway "Success response with payment gateways"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/settings/payment-gateways [get]
func GetPaymentGateways(c *gin.Context) {
	// In a real application, this would come from a database
	gateways := []PaymentGateway{
		{
			ID:                  "cod",
			Name:               "الدفع عند الاستلام",
			Description:        "ادفع نقداً عند استلام طلبك",
			Enabled:            getEnvBool("GATEWAY_COD_ENABLED", true),
			TestMode:           false,
			SupportedCurrencies: []string{"SAR", "USD", "EUR"},
			IconURL:            "/images/payment/cod.png",
			Instructions:       "سيتم دفع المبلغ نقداً عند استلام الطلب",
		},
		{
			ID:                  "bank_transfer",
			Name:               "حوالة بنكية",
			Description:        "قم بتحويل المبلغ إلى حسابنا البنكي",
			Enabled:            getEnvBool("GATEWAY_BANK_TRANSFER_ENABLED", true),
			TestMode:           false,
			SupportedCurrencies: []string{"SAR"},
			IconURL:            "/images/payment/bank-transfer.png",
			Instructions:       "الرجاء إرسال إشعار الدفع بعد التحويل إلى البريد الإلكتروني info@example.com",
			AdditionalData:     "البنك الأهلي - SA0380000001234567890 - صيدلية المعتمد",
		},
		{
			ID:                  "credit_card",
			Name:               "بطاقة ائتمانية",
			Description:        "ادفع باستخدام بطاقة الائتمان أو البطاقة البنكية",
			Enabled:            getEnvBool("GATEWAY_CREDIT_CARD_ENABLED", true),
			TestMode:           getEnvBool("GATEWAY_CREDIT_CARD_TEST_MODE", true),
			SupportedCurrencies: []string{"SAR", "USD", "EUR", "GBP"},
			IconURL:            "/images/payment/credit-card.png",
			Instructions:       "سيتم توجيهك إلى صفحة آمنة لإدخال بيانات البطاقة",
		},
	}

	utils.SuccessResponse(c, "Payment gateways retrieved successfully", gateways)
}

// UpdatePaymentGatewayRequest represents the request body for updating a payment gateway
type UpdatePaymentGatewayRequest struct {
	Enabled           *bool     `json:"enabled,omitempty"`
	TestMode         *bool     `json:"test_mode,omitempty"`
	Credentials      *string   `json:"credentials,omitempty"`
	AdditionalData   *string   `json:"additional_data,omitempty"`
}

// UpdatePaymentGateway updates a payment gateway status and settings
// @Summary Update payment gateway settings
// @Description Update configuration for a specific payment gateway
// @Tags Admin - Payment Gateways
// @Accept json
// @Produce json
// @Param id path string true "Payment Gateway ID"
// @Param request body UpdatePaymentGatewayRequest true "Gateway settings"
// @Success 200 {object} map[string]interface{} "Success response"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 404 {object} map[string]interface{} "Gateway not found"
// @Router /admin/settings/payment-gateways/{id} [put]
func UpdatePaymentGateway(c *gin.Context) {
	gatewayID := c.Param("id")

	// Validate gateway ID
	validGateways := map[string]bool{
		"cod":            true,
		"bank_transfer":  true,
		"credit_card":    true,
	}

	if !validGateways[gatewayID] {
		utils.ErrorResponse(c, http.StatusNotFound, "Gateway not found", "The specified payment gateway does not exist")
		return
	}

	var req UpdatePaymentGatewayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request data", err.Error())
		return
	}

	// Update gateway settings in environment variables or database
	if req.Enabled != nil {
		setEnv(fmt.Sprintf("GATEWAY_%s_ENABLED", strings.ToUpper(gatewayID)), *req.Enabled)
	}

	if req.TestMode != nil {
		setEnv(fmt.Sprintf("GATEWAY_%s_TEST_MODE", strings.ToUpper(gatewayID)), *req.TestMode)
	}

	if req.Credentials != nil {
		// In a real application, you would encrypt these credentials before storing
		setEnv(fmt.Sprintf("GATEWAY_%s_CREDENTIALS", strings.ToUpper(gatewayID)), *req.Credentials)
	}

	if req.AdditionalData != nil {
		setEnv(fmt.Sprintf("GATEWAY_%s_ADDITIONAL_DATA", strings.ToUpper(gatewayID)), *req.AdditionalData)
	}

	// In a real application, you would want to:
	// 1. Validate the credentials format
	// 2. Test the connection to the payment gateway
	// 3. Handle any errors that might occur

	utils.SuccessResponse(c, "Payment gateway updated successfully", map[string]interface{}{
		"gateway_id":     gatewayID,
		"enabled":        req.Enabled != nil && *req.Enabled,
		"test_mode":      req.TestMode != nil && *req.TestMode,
		"updated_fields": getUpdatedFields(req),
	})
}

// getUpdatedFields returns a list of fields that were updated
func getUpdatedFields(req UpdatePaymentGatewayRequest) []string {
	var fields []string
	if req.Enabled != nil {
		fields = append(fields, "enabled")
	}
	if req.TestMode != nil {
		fields = append(fields, "test_mode")
	}
	if req.Credentials != nil {
		fields = append(fields, "credentials")
	}
	if req.AdditionalData != nil {
		fields = append(fields, "additional_data")
	}
	return fields
}
