// adminApi.js
import axios from "axios";

// Determine the base URL based on environment
const isDevelopment = import.meta.env.MODE === "development";
const API_BASE_URL = isDevelopment
  ? "/api/v1"
  : import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

// Create a new axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": "ar",
  },
  withCredentials: true,
  maxRedirects: 5,
  validateStatus: function (status) {
    return status >= 200 && status < 400; // Accept all 2xx and 3xx status codes
  },
});

// Add a response interceptor to handle 301 redirects
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If it's a 301/302 redirect and we haven't retried yet
    if (
      (error.response?.status === 301 || error.response?.status === 302) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Get the new location from the response headers
      const redirectUrl = error.response.headers.location;

      if (redirectUrl) {
        // Make a new request to the redirect URL
        return api({
          ...originalRequest,
          url: redirectUrl,
          method: originalRequest.method,
        });
      }
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    // لا نضيف Authorization؛ المصادقة عبر كوكيز HttpOnly
    if (process.env.NODE_ENV === 'development') {
      console.log("🌐 AdminAPI Request:", config.baseURL + (config.url || ""));
    }
    
    return config;
  },
  (error) => {
    console.error("❌ خطأ في معالجة طلب API:", error);
    return Promise.reject(error);
  }
);

// Admin login endpoint
export const adminLogin = async (email, password) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔑 محاولة تسجيل دخول مسؤول:", email);
    }
    
    // Updated endpoint to match backend route
    const response = await api.post('/auth/admin/login', { email, password });
    
    // Handle both response formats: {success, user, token} or {data: {user, token}}
    const user = response.data?.user || response.data?.data?.user;
    const token = response.data?.token || response.data?.data?.token;
    const success = response.data?.success !== false; // Default to true unless explicitly false

    // Save admin token to localStorage for product creation
    if (token) {
      localStorage.setItem('admin_token', token);
      localStorage.setItem('adminToken', token); // backup key
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Admin token saved to localStorage');
      }
    }

    return {
      success,
      user,
      token,
    };
  } catch (error) {
    console.error("Login error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return {
      success: false,
      message:
        error.response?.data?.message || "Login failed. Please try again.",
    };
  }
};

// All admin API endpoints should be relative to baseURL (do NOT include /api or /api/v1)
export const adminApi = {
  // Get users with optional filtering
  // User Management
  async getUsers(params = {}) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log("👥 جلب المستخدمين:", params);
      }
      const response = await api.get("/admin/users", { params });

      // التأكد من أن البيانات بالشكل المطلوب
      if (response && response.data) {
        // إذا كانت البيانات مصفوفة مباشرة
        if (Array.isArray(response.data)) {
          return {
            data: {
              customers: response.data,
              total: response.data.length,
            },
            success: true,
          };
        }
        // إذا كانت البيانات تحتوي على حقل data
        if (response.data.data) {
          return response.data;
        }
        // إذا كانت البيانات تحتوي على customers مباشرة
        if (response.data.customers) {
          return {
            data: {
              customers: response.data.customers,
              total: response.data.total || response.data.customers.length,
            },
            success: true,
          };
        }
      }

      // إذا لم تكن هناك بيانات، نرجع مصفوفة فارغة
      return {
        data: {
          customers: [],
          total: 0,
        },
        success: true,
      };
    } catch (error) {
      console.error("Error fetching users:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  async getUser(id) {
    try {
      const response = await api.get(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  },

  async updateUser(id, userData) {
    try {
      const response = await api.put(`/admin/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  },

  async deleteUser(id) {
    try {
      const response = await api.delete(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  },

  async updateUserStatus(id, { isActive }) {
    try {
      // Backend supports updating user via PUT /admin/users/:id with payload { is_active: boolean }
      const response = await api.put(
        `/admin/users/${id}`,
        { is_active: !!isActive }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating status for user ${id}:`, error);
      throw error;
    }
  },

  async exportUsers({ format = "csv" }) {
    try {
      const response = await api.get(`/admin/users/export`, {
        params: { format },
        responseType: "blob",
      });
      return response;
    } catch (error) {
      console.error("Error exporting users:", error);
      throw error;
    }
  },
  async getDashboardStats() {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/admin/dashboard/stats?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = response.data?.data || response.data; // Handle both response formats
      
      // Log the response for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Dashboard stats response:', data);
      }
      
      return {
        success: true,
        data: data,
        total_orders: data?.totalOrders || data?.total_orders || 0,
        retail_orders: data?.retailOrders || data?.retail_orders || 0,
        wholesale_orders: data?.wholesaleOrders || data?.wholesale_orders || 0,
        total_customers: data?.totalCustomers || data?.total_customers || 0,
        total_products: data?.totalProducts || data?.total_products || 0,
        total_sales: data?.totalSales || data?.total_sales || 0,
        pending_orders: data?.pending_orders || 0,
        out_of_stock: data?.out_of_stock || 0,
        monthly_sales: data?.monthly_sales || [],
        top_products: data?.top_products || [],
        order_status: data?.order_status || []
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // Return mock data that matches the expected structure
      return {
        success: true,
        data: {
          totalOrders: 0,
          retailOrders: 0,
          wholesaleOrders: 0,
          totalCustomers: 0,
          totalProducts: 0,
          totalSales: 0,
          pending_orders: 0,
          out_of_stock: 0,
          monthly_sales: [],
          top_products: [],
          order_status: []
        },
        total_orders: 0,
        retail_orders: 0,
        wholesale_orders: 0,
        total_customers: 0,
        total_products: 0,
        total_sales: 0,
        pending_orders: 0,
        out_of_stock: 0,
        monthly_sales: [],
        top_products: [],
        order_status: []
      };
    }
  },

  async getRecentActivities() {
    try {
      const response = await api.get("/admin/dashboard/activities/recent");
      return { 
        success: true, 
        data: response.data?.data || response.data || [] // Handle both response formats
      };
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      // Return empty array to prevent UI errors
      return { 
        success: true, 
        data: [] 
      };
    }
  },

  async getSettings() {
    try {
      const response = await api.get("/admin/settings");
      return response.data;
    } catch (error) {
      console.error("Error fetching settings:", error);
      throw error;
    }
  },

  async updateSettings(settings) {
    try {
      const response = await api.put("/admin/settings", settings);
      return response.data;
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  },

  async getPaymentGateways() {
    try {
      const response = await api.get("/admin/payment-gateways");
      return response.data;
    } catch (error) {
      console.error("Error fetching payment gateways:", error);
      throw error;
    }
  },

  async updatePaymentGateway(gatewayId, data) {
    try {
      const response = await api.put(
        `/admin/payment-gateways/${gatewayId}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error("Error updating payment gateway:", error);
      throw error;
    }
  },

  async getSuppliers() {
    try {
      const response = await api.get("/admin/suppliers");
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch suppliers",
      };
    }
  },

  async getSupplier(id) {
    try {
      const response = await api.get(`/admin/suppliers/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error fetching supplier ${id}:`, error);
      return {
        success: false,
        message:
          error.response?.data?.message || `Failed to fetch supplier ${id}`,
      };
    }
  },

  async createSupplier(data) {
    try {
      const response = await api.post("/admin/suppliers", data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error creating supplier:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create supplier",
      };
    }
  },

  async updateSupplier(id, data) {
    try {
      const response = await api.put(`/admin/suppliers/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error updating supplier ${id}:`, error);
      return {
        success: false,
        message:
          error.response?.data?.message || `Failed to update supplier ${id}`,
      };
    }
  },

  async getSupplierTransactions(supplierId, params = {}) {
    try {
      const response = await api.get(
        `/admin/suppliers/${supplierId}/transactions`,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        `Error fetching transactions for supplier ${supplierId}:`,
        error
      );
      return {
        success: false,
        message:
          error.response?.data?.message ||
          `Failed to fetch transactions for supplier ${supplierId}`,
      };
    }
  },

  async getInventory(params = {}) {
    try {
      const response = await api.get("/admin/inventory", { params });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error fetching inventory:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch inventory",
      };
    }
  },

  async adjustInventory(data) {
    try {
      const response = await api.post("/admin/inventory/adjust", data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to adjust inventory",
      };
    }
  },

  async getInventoryHistory(params = {}) {
    try {
      const response = await api.get("/admin/inventory/history", { params });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error fetching inventory history:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch inventory history",
      };
    }
  },

  // -----------------------------
  // Categories Management (Admin)
  // -----------------------------
  async createCategory(data) {
    try {
      const response = await api.post("/admin/categories", data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error creating category:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create category",
      };
    }
  },

  async updateCategory(id, data) {
    try {
      const response = await api.put(`/admin/categories/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      return {
        success: false,
        message:
          error.response?.data?.message || `Failed to update category ${id}`,
      };
    }
  },

  async deleteCategory(id) {
    try {
      const response = await api.delete(`/admin/categories/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      return {
        success: false,
        message:
          error.response?.data?.message || `Failed to delete category ${id}`,
      };
    }
  },
};
