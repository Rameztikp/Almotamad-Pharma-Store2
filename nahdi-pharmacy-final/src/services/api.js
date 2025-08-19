// src/services/api.js
// Base URL for the API - using Vite proxy in development
const isDevelopment = import.meta.env.MODE === "development";
const API_BASE_URL = isDevelopment
  ? "/api/v1"
  : import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 30000; // Increased timeout for development

console.log("📦 API Configuration:", {
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

  // Create headers for requests
  getHeaders(isFormData = false) {
    const headers = new Headers();

    // Set Content-Type if not FormData
    if (!isFormData) {
      headers.set("Content-Type", "application/json");
    }

    // Do not attach Authorization header; auth is cookie-based

    return headers;
  }

  // Handle API responses - إصلاح شامل
  async handleResponse(response, url, options = {}) {
    // Log response info
    console.group("📥 API Response");
    console.log("URL:", url);
    console.log("Status:", response.status, response.statusText);
    
    // معالجة خطأ 401 (غير مصرح) - محاولة واحدة فقط لتجديد الجلسة عبر الكوكيز
    if (response.status === 401 && !options._retry) {
      console.log("🔄 محاولة تحديث التوكن بعد خطأ 401...");
      
      try {
        // محاولة تحديث الجلسة
        const refreshed = await this.refreshToken();
        if (refreshed) {
          console.log("🔄 إعادة المحاولة بعد التحديث...");
          console.groupEnd(); // إنهاء مجموعة السجلات
          
          // إعادة المحاولة مع التوكن الجديد
          const retryOptions = {
            ...options,
            _retry: true, // منع التكرار اللانهائي
            headers: { ...options.headers },
          };
          
          // إعادة إرسال الطلب الأصلي
          if (options.method && options.method.toLowerCase() === 'get') {
            return this.get(url.replace(this.baseURL, ''), options.params);
          } else {
            const method = options.method || 'GET';
            return this.request(method, url, options.data, options.isFormData, 0, retryOptions);
          }
        }
      } catch (refreshError) {
        console.error("❌ فشل تحديث التوكن:", refreshError);
        
        console.groupEnd();
        
        const error = new Error("انتهت جلستك، يرجى تسجيل الدخول مرة أخرى");
        error.response = response;
        throw error;
      }
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
      throw new Error("الرابط المطلوب غير موجود");
    }

    // Handle server errors (500+)
    if (response.status >= 500) {
      console.error("Server error:", response.statusText);
      console.groupEnd();
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
  async request(
    method,
    endpoint,
    data = null,
    isFormData = false,
    retries = 2
  ) {
    // No preflight token refresh; cookies are handled by the browser

    // Set default config
    const config = {
      method,
      headers: this.getHeaders(isFormData),
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
      credentials: "include", // Important for cookies/sessions
    };

    // Build URL with query params if GET request
    let url = `${this.baseURL}${endpoint}`;

    // Add timestamp only if there are no existing query parameters
    if (method === "GET" && !url.includes("?")) {
      url += `?_t=${Date.now()}`;
    } else if (method === "GET") {
      url += `&_t=${Date.now()}`;
    }

    console.group(`🌐 API Request: ${method} ${url}`);
    if (data && !isFormData) console.log("Request Data:", data);
    console.log("Request Headers:", config.headers);

    try {
      const response = await fetch(url, config);
      const result = await this.handleResponse(response, url);
      console.groupEnd();
      return result;
    } catch (error) {
      console.error(`❌ API Request Error (${method} ${url}):`, error);
      console.groupEnd();

      // Retry logic for failed requests
      if (retries > 0 && !error.status) {
        // Don't retry 4xx errors
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
        headers: this.getHeaders(),
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

// Export both the class and an instance
export { ApiService };
export default new ApiService();
