// src/services/api.js
// Base URL for the API - using Vite proxy in development
const isDevelopment = import.meta.env.MODE === 'development';
const API_BASE_URL = isDevelopment ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api');
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 15000;

console.log("📦 API Configuration:", { 
  mode: import.meta.env.MODE,
  baseURL: API_BASE_URL,
  usingProxy: isDevelopment
});

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
    this.token = this.getToken();
  }

  // Get token from localStorage and validate it
  getToken() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.log('Token has expired');
          this.clearAuth();
          return null;
        }
      } catch (e) {
        console.error('Error parsing token:', e);
        this.clearAuth();
        return null;
      }
    }
    return token;
  }

  // Update token in memory and storage
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
      // For backward compatibility
      localStorage.setItem('token', token);
    } else {
      this.clearAuth();
    }
  }

  // Clear all authentication data
  clearAuth() {
    this.token = null;
    // Remove all auth-related items from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear any other auth-related data if needed
    if (window.location.pathname !== '/login') {
      // Optionally redirect to login page if not already there
      // window.location.href = '/login';
    }
  }

  // Create headers for requests
  getHeaders(isFormData = false) {
    const headers = new Headers();
    
    // Set Content-Type if not FormData
    if (!isFormData) {
      headers.set('Content-Type', 'application/json');
    }
    
    // Add authorization if token exists
    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  // Handle API responses
  async handleResponse(response, url) {
    // Log response info
    console.group('📥 API Response');
    console.log('URL:', url);
    console.log('Status:', response.status, response.statusText);
    
    // Handle no content
    if (response.status === 204) {
      console.log('No content in response');
      console.groupEnd();
      return { success: true };
    }
    
    // Parse response data
    let responseData;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = { message: text };
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      responseData = { 
        success: false,
        message: 'Error parsing server response',
        error: error.message 
      };
    }

    // Handle error responses
    if (!response.ok) {
      const error = new Error(responseData.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.response = responseData;
      
      // Handle authentication errors
      if (response.status === 401) {
        this.clearAuth();
        if (!window.location.pathname.includes('/login')) {
          // Store current location for redirect after login
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please log in again.');
      }
      
      // Handle forbidden errors
      if (response.status === 403) {
        throw new Error('You do not have permission to perform this action.');
      }
      
      // Handle validation errors
      if (response.status === 422 && responseData.errors) {
        const validationErrors = Object.entries(responseData.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        throw new Error(`Validation failed:\n${validationErrors}`);
      }
      
      throw error;
    }

    console.log('✅ Request successful:', { url, data: responseData });
    console.groupEnd();
    return responseData;
  }

  // Generic request method with timeout and retry logic
  async request(method, endpoint, data = null, isFormData = false, retries = 2) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const headers = this.getHeaders(isFormData);
    
    const config = {
      method,
      headers,
      credentials: 'include', // Important for cookies/sessions
      mode: 'cors', // Ensure CORS mode is set
    };
    
    // Add body for non-GET/HEAD requests
    if (method !== 'GET' && method !== 'HEAD' && data) {
      config.body = isFormData ? data : JSON.stringify(data);
    }
    
    // Log request details (safely)
    const safeHeaders = {};
    headers.forEach((value, key) => {
      safeHeaders[key] = key.toLowerCase().includes('auth') ? '***' : value;
    });
    
    console.group(`🌐 API Request`);
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Headers:', safeHeaders);
    if (method !== 'GET' && data) {
      console.log('Body:', isFormData ? '[FormData]' : data);
    }
    
    let lastError;
    
    for (let i = 0; i < Math.max(1, retries); i++) {
      try {
        const response = await Promise.race([
          fetch(url, config),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Request timed out after ${this.timeout}ms`)),
              this.timeout
            )
          )
        ]);
        
        const result = await this.handleResponse(response, url);
        console.groupEnd();
        return result;
        
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed:`, error.message);
        
        // Don't retry for these status codes
        if (error.message.includes('401') || 
            error.message.includes('403') || 
            error.message.includes('404') ||
            error.message.includes('422')) {
          break;
        }
        
        // Add delay between retries
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    console.error(`❌ All ${retries} attempts failed. Last error:`, lastError);
    throw lastError || new Error('Request failed after all retries');
  }

  // HTTP Methods
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request('GET', url);
  }

  async post(endpoint, data, isFormData = false) {
    return this.request('POST', endpoint, data, isFormData);
  }

  async put(endpoint, data, isFormData = false) {
    return this.request('PUT', endpoint, data, isFormData);
  }

  async patch(endpoint, data, isFormData = false) {
    return this.request('PATCH', endpoint, data, isFormData);
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
}

export default new ApiService();
