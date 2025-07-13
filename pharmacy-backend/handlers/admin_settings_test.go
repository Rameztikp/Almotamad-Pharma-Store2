package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	
	// Setup routes
	admin := r.Group("/admin")
	{
		settings := admin.Group("/settings")
		{
			settings.GET("", GetSettings)
			settings.PUT("", UpdateSettings)
			settings.GET("/payment-gateways", GetPaymentGateways)
			settings.PUT("/payment-gateways/:id", UpdatePaymentGateway)
		}
	}

	return r
}

func TestGetSettings(t *testing.T) {
	r := setupRouter()
	
	req, _ := http.NewRequest("GET", "/admin/settings", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.NotNil(t, response["data"])
}

func TestUpdateSettings(t *testing.T) {
	r := setupRouter()
	
	updateData := map[string]interface{}{
		"store_name":      "صيدلية المعتمد للاختبار",
		"store_email":     "test@example.com",
		"items_per_page":  15,
		"maintenance_mode": false,
	}

	jsonData, _ := json.Marshal(updateData)
	
	req, _ := http.NewRequest("PUT", "/admin/settings", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.NotNil(t, response["data"])
}

func TestGetPaymentGateways(t *testing.T) {
	r := setupRouter()
	
	req, _ := http.NewRequest("GET", "/admin/settings/payment-gateways", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.NotNil(t, response["data"])
}

func TestUpdatePaymentGateway(t *testing.T) {
	r := setupRouter()
	
	updateData := map[string]interface{}{
		"enabled":   true,
		"test_mode": true,
	}

	jsonData, _ := json.Marshal(updateData)
	
	req, _ := http.NewRequest("PUT", "/admin/settings/payment-gateways/credit_card", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.NotNil(t, response["data"])
}
