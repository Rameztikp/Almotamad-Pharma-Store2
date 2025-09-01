// src/services/api.js
// Base URL for the API - using Vite proxy in development
const isDevelopment = import.meta.env.MODE === "development";
const API_BASE_URL = isDevelopment
  ? "/api/v1"
  : import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 30000; // Increased timeout for development

// URL for static assets like images
export const SERVER_ROOT_URL = isDevelopment
  ? "http://localhost:8080"
  : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1").replace('/api/v1', '');

console.log("📦 API Configuration:", {
  serverRoot: SERVER_ROOT_URL,
  mode: import.meta.env.MODE,
  baseURL: API_BASE_URL,
  usingProxy: isDevelopment,
});

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
    // Tokens are managed by HttpOnly cookies now
    this.token = null;
  }

  // Check if token is about to expire (less than 5 minutes remaining)
  isTokenExpiring(token) {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiresIn = payload.exp * 1000 - Date.now();
      return expiresIn < 5 * 60 * 1000; // Less than 5 minutes remaining
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true;
    }
  }

  // getToken deprecated: JWT is now sent via HttpOnly cookies
  getToken() { return null; }

  // Update token in memory and storage - محسّن
  setToken(_) { this.token = null; }

  // Refresh token method - إصلاح شامل
  async refreshToken() {
    // Ask backend to refresh cookies using HttpOnly refresh token
    const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
      method: "POST",
      credentials: 'include'
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    // We ignore body since tokens are in cookies now
    try { await response.json(); } catch (_) {}
    return true;
  }

  // Clear admin authentication data only - مسح بيانات المسؤول فقط
  clearAdminAuth() {
    if (process.env.NODE_ENV === 'development') {
      console.log("🧹 مسح بيانات مصادقة المسؤول...");
    }
    
    const adminKeys = [
      'admin_auth_token',
      'admin_refresh_token',
      'adminToken',
      'adminData'
    ];
    
    adminKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ حذف توكن مسؤول: ${key}`);
        }
        localStorage.removeItem(key);
      }
    });
  }

  // Clear client authentication data only - مسح بيانات المستخدم العادي فقط
  clearClientAuth() {
    if (process.env.NODE_ENV === 'development') {
      console.log("🧹 مسح بيانات مصادقة المستخدم العادي...");
    }
    
    const clientKeys = [
      'client_auth_token',
      'client_refresh_token',
      'authToken',
      'token',
      'refreshToken',
      'userData'
    ];
    
    clientKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ حذف توكن عادي: ${key}`);
        }
        localStorage.removeItem(key);
      }
    });
  }

  // Clear all authentication data - محسّن (للاستخدام في حالات خاصة)
  clearAuth() {
    if (process.env.NODE_ENV === 'development') {
      console.log("🧹 بدء عملية مسح جميع بيانات المصادقة...");
    }
    
    this.token = null;
    
    // حذف جميع التوكنات المحتملة
    const authKeys = [
      'admin_auth_token',
      'client_auth_token', 
      'admin_refresh_token',
      'client_refresh_token',
      'authToken',
      'token',
      'refreshToken',
      'adminToken',
      'userData',
      'adminData'
    ];
    
    authKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ حذف ${key}`);
        }
        localStorage.removeItem(key);
      }
    });
    
    // إرسال حدث لتحديث حالة المصادقة
    // Clear any cookies that might be used for auth
    document.cookie =
      "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";

    // Notify the application that auth state has changed
    window.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { isAuthenticated: false, user: null },
      })
    );

    console.log("✅ تم مسح جميع بيانات المصادقة");
  }

  // Build headers
  buildHeaders(isFormData = false, additionalHeaders = {}) {
    const headers = new Headers();

    // Add additional headers first
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    // Set content type for JSON requests
    if (!isFormData) {
      headers.set("Content-Type", "application/json");
    }

    // Check for authentication status using non-HttpOnly cookies
    const isAdminPanel = window.location.pathname.startsWith('/admin');
    const authStatusCookie = isAdminPanel ? 
      this.getCookie('admin_auth_status') : 
      this.getCookie('client_auth_status');
    
    // Debug logging for authentication status
    console.log('🔍 Auth Status Debug:', {
      isAdminPanel,
      authStatusCookie,
      usingHttpOnlyCookies: 'Authentication tokens are in HttpOnly cookies'
    });

    // For HttpOnly cookie authentication, we don't add Authorization header
    // The browser automatically includes the cookies
    console.log('ℹ️ Using HttpOnly cookies for authentication - no Authorization header needed');

    // Log all headers being sent
    const headersObj = {};
    headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.log('📤 Request headers:', headersObj);

    return headers;
  }

  // Helper method to read cookies
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Check if user is authenticated by checking auth status cookie
  isAuthenticated() {
    const isAdminPanel = window.location.pathname.startsWith('/admin');
    const authStatusCookie = isAdminPanel ? 
      this.getCookie('admin_auth_status') : 
      this.getCookie('client_auth_status');
    
    return authStatusCookie === 'authenticated';
  }

  // Handle API responses - إصلاح شامل
  async handleResponse(response, url, options = {}) {
    // Log response info
    console.group("📥 API Response");
    console.log("URL:", url);
    console.log("Status:", response.status, response.statusText);
    
    // Log response headers for debugging
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = key.toLowerCase().includes('token') ? '***REDACTED***' : value;
    });
    console.log('Response Headers:', responseHeaders);
    
    // Handle unauthorized (401) - معالجة محسنة لتجنب التحديث المستمر
    if (response.status === 401) {
      console.error("❌ 401 Unauthorized - Invalid or expired token");
      console.groupEnd();
      
      // تجنب إعادة التوجيه المتكرر إذا كنا بالفعل في صفحة تسجيل الدخول
      const isLoginPage = window.location.pathname.includes('/login') || 
                         window.location.pathname.includes('/admin/login');
      
      // إذا كان الطلب لـ /auth/me وليس في صفحة تسجيل الدخول، لا تعيد التوجيه
      // فقط ارجع خطأ صامت للسماح للتطبيق بالعمل كمستخدم غير مسجل
      if (url.includes('/auth/me') && !isLoginPage) {
        console.log('ℹ️ User not authenticated - continuing as guest');
        throw new Error("غير مصادق - متابعة كضيف");
      }
      
      if (!isLoginPage) {
        // Check if this is a token refresh request to prevent infinite loops
        if (url.includes('/auth/refresh')) {
          console.error('⚠️ Token refresh failed - forcing logout');
          // Clear all auth data and redirect to login
          this.clearAuth();
          window.location.href = '/login?session=expired';
        } else if (!url.includes('/auth/me')) {
          // فقط أعد التوجيه للطلبات التي تتطلب مصادقة (ليس /auth/me)
          const isAdminPanel = window.location.pathname.startsWith('/admin');
          
          if (isAdminPanel) {
            this.clearAdminAuth();
            window.location.href = '/admin/login?session=expired';
          } else {
            this.clearClientAuth();
            window.location.href = '/login?session=expired';
          }
        }
      }
      
      throw new Error("انتهت جلستك. يرجى تسجيل الدخول مرة أخرى");
    }

    // Handle no content
    if (response.status === 204) {
      console.log("No content in response");
      console.groupEnd();
      return { success: true };
    }

    // معالجة خطأ 403 (Forbidden) - عدم وجود صلاحيات
    if (response.status === 403) {
      const isAdminPanel = window.location.pathname.startsWith('/admin');
      
      if (isAdminPanel) {
        console.error("❌ عدم وجود صلاحيات مسؤول - يجب تسجيل الدخول كمسؤول");
        console.groupEnd();
        
        // مسح توكن المسؤول فقط
        this.clearAdminAuth();
        
        throw new Error("لا تملك صلاحيات المسؤول. يجب تسجيل الدخول كمسؤول أولاً");
      } else {
        console.error("❌ عدم وجود صلاحيات لهذا الإجراء");
        console.groupEnd();
        throw new Error("لا تملك صلاحية لتنفيذ هذا الإجراء");
      }
    }

    // خطأ 401 يتم معالجته في الأعلى - لا حاجة لمعالجة إضافية

    // Handle not found (404)
    if (response.status === 404) {
      console.error("Endpoint not found:", url);
      console.groupEnd();
      
      // For FCM endpoints, don't retry to prevent infinite loops
      if (url.includes('/fcm/')) {
        throw new Error("خدمة الإشعارات غير متوفرة حالياً");
      }
      
      throw new Error("الرابط المطلوب غير موجود");
    }

    // Handle server errors (500+)
    if (response.status >= 500) {
      console.error("Server error:", response.statusText);
      console.groupEnd();
      
      // Check for CORS errors
      if (response.status === 0) {
        throw new Error("تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت وتأكد من أن الخادم يعمل");
      }
      
      throw new Error("حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً");
    }

    // Parse response data
    let responseData;
    const contentType = response.headers.get("content-type");

    try {
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = { message: text };
      }
    } catch (error) {
      console.error("Error parsing response:", error);
      responseData = {
        success: false,
        message: "Error parsing server response",
        error: error.message,
      };
    }

    // Handle error responses
    if (!response.ok) {
      const error = new Error(
        responseData.message || `Request failed with status ${response.status}`
      );
      error.status = response.status;
      error.response = responseData;

      // Handle authentication errors - إعادة توجيه ذكية
      if (response.status === 401) {
        const isAdminPanel = window.location.pathname.startsWith('/admin');
        
        // مسح انتقائي بناءً على نوع الصفحة
        if (isAdminPanel) {
          this.clearAdminAuth();
        } else {
          this.clearClientAuth();
        }
        const currentPath = window.location.pathname;
        
        // تحديد صفحة تسجيل الدخول المناسبة
        const loginPath = isAdminPanel ? '/admin/login' : '/login';
        
        if (!currentPath.includes("/login")) {
          console.log(`🔄 إعادة توجيه إلى ${loginPath} بعد انتهاء الجلسة`);
          
          // حفظ الموقع الحالي للعودة إليه بعد تسجيل الدخول
          sessionStorage.setItem("redirectAfterLogin", currentPath);
          
          // إعادة توجيه ذكية
          window.location.href = loginPath;
        }
        
        const errorMessage = isAdminPanel ? 
          "انتهت جلسة المسؤول. يرجى تسجيل الدخول مرة أخرى" : 
          "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى";
        
        throw new Error(errorMessage);
      }

      // Handle forbidden errors
      if (response.status === 403) {
        throw new Error("You do not have permission to perform this action.");
      }

      // Handle validation errors
      if (response.status === 422 && responseData.errors) {
        const validationErrors = Object.entries(responseData.errors)
          .map(
            ([field, messages]) =>
              `${field}: ${
                Array.isArray(messages) ? messages.join(", ") : messages
              }`
          )
          .join("\n");
        throw {
          message: `Validation failed:\n${validationErrors}`,
          errors: responseData.errors,
          type: "validation",
        };
      }

      throw error;
    }

    console.log("✅ Request successful:", { url, data: responseData });
    console.groupEnd();
    return responseData;
  }

  // Generic request method with timeout and retry logic
  async request(method, endpoint, data = null, isFormData = false, retries = 3) {
    // Build URL with query params
    let url = `${this.baseURL}${endpoint}`;
    
    // For GET requests, add data as query parameters
    if (method === 'GET' && data) {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        }
      });
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    // Build request options
    const options = {
      method,
      headers: this.buildHeaders(isFormData),
      credentials: 'include', // Always include credentials (cookies)
      mode: 'cors', // Ensure CORS mode is enabled
      cache: 'no-cache', // Disable cache for authenticated requests
      redirect: 'follow',
      referrerPolicy: 'no-referrer-when-downgrade',
    };

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      options.body = isFormData ? data : JSON.stringify(data);
    }

    // Add timestamp only if there are no existing query parameters
    if (method === "GET" && !url.includes("?")) {
      url += `?_t=${Date.now()}`;
    } else if (method === "GET") {
      url += `&_t=${Date.now()}`;
    }

    console.group(`🌐 API Request: ${method} ${url}`);
    if (data && !isFormData) console.log("Request Data:", data);
    console.log("Request Options:", {
      ...options,
      headers: Object.fromEntries(options.headers.entries())
    });

    try {
      const response = await fetch(url, options);
      const result = await this.handleResponse(response, url);
      console.groupEnd();
      return result;
    } catch (error) {
      console.error(`❌ API Request Error (${method} ${url}):`, error);
      console.groupEnd();

      // Retry logic for failed requests
      if (retries > 0 && !error.status) {
        // Don't retry 4xx errors or FCM endpoints to prevent infinite loops
        if (url.includes('/fcm/')) {
          console.log('❌ FCM endpoint failed - not retrying to prevent infinite loop');
          throw error;
        }
        
        console.log(`🔄 Retrying request (${retries} attempts left)...`);
        return this.request(method, endpoint, data, isFormData, retries - 1);
      }

      // Handle network errors
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        throw {
          message: "فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت",
          originalError: error,
          isNetworkError: true,
          type: "network",
        };
      }

      // Re-throw other errors
      throw error;
    }
  }

  // HTTP Methods
  async get(endpoint, params = {}) {
    try {
      // Create URL with base URL and endpoint
      let url;
      if (endpoint.startsWith("http")) {
        // If endpoint is a full URL, use it directly
        url = new URL(endpoint);
      } else {
        // For relative URLs, construct the full URL
        const base = this.baseURL.endsWith("/")
          ? this.baseURL.slice(0, -1)
          : this.baseURL;
        const path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

        // If baseURL is a relative URL (starts with /), use window.location.origin as the base
        if (base.startsWith("/")) {
          url = new URL(`${window.location.origin}${base}/${path}`);
        } else {
          url = new URL(`${base}/${path}`);
        }
      }

      // Add timestamp to prevent caching
      params._t = Date.now();

      // Process parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          return;
        }

        // Handle arrays
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item !== null && item !== undefined && item !== "") {
              url.searchParams.append(key, item.toString());
            }
          });
        }
        // Handle objects (convert to JSON string)
        else if (typeof value === "object") {
          try {
            url.searchParams.append(key, JSON.stringify(value));
          } catch {
            console.warn(`Could not stringify parameter ${key}:`, value);
          }
        }
        // Handle primitive values
        else {
          url.searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.buildHeaders(),
        credentials: "include", // Important for sending cookies with cross-origin requests
      });

      return this.handleResponse(response, url.toString());
    } catch (error) {
      console.error("API GET Error:", error);
      throw error;
    }
  }

  async post(endpoint, data, isFormData = false) {
    return this.request("POST", endpoint, data, isFormData);
  }

  async put(endpoint, data, isFormData = false) {
    return this.request("PUT", endpoint, data, isFormData);
  }

  async patch(endpoint, data, isFormData = false) {
    return this.request("PATCH", endpoint, data, isFormData);
  }

  async delete(endpoint) {
    return this.request("DELETE", endpoint);
  }
}

// API Request helper function
const apiRequest = async (url, options = {}) => {
  const api = new ApiService();
  const method = (options.method || 'GET').toUpperCase();
  const endpoint = url.startsWith('/') ? url.replace(/^\/api\/v1\//, '') : url;
  
  // Convert fetch-style options to apiService format
  const data = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined;
  const isFormData = data instanceof FormData;
  
  try {
    switch (method) {
      case 'GET':
        return await api.get(endpoint, data);
      case 'POST':
        return await api.post(endpoint, data, isFormData);
      case 'PUT':
        return await api.put(endpoint, data, isFormData);
      case 'PATCH':
        return await api.patch(endpoint, data, isFormData);
      case 'DELETE':
        return await api.delete(endpoint);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Export both the class, instance, and helper function
export { ApiService, apiRequest };
export default new ApiService();
