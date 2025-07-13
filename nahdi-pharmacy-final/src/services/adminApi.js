import axios from 'axios';

// Using Vite environment variables
const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with base URL and default headers
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'ar',
  },
  withCredentials: true, // Important for sending cookies with requests
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Admin Auth API
export const adminLogin = async (email, password) => {
  try {
    const response = await api.post('/v1/admin/login', { 
      email, 
      password 
    });
    
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('adminData', JSON.stringify(response.data.user));
      return { success: true, user: response.data.user, token: response.data.token };
    }
    
    return { success: false, message: response.data?.message || 'Login failed' };
  } catch (error) {
    console.error('Login error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return { 
      success: false, 
      message: error.response?.data?.message || 'Login failed. Please try again.' 
    };
  }
};

// Admin API methods
export const adminApi = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/v1/admin/dashboard');
      return { 
        success: true, 
        data: response.data,
        total_orders: response.data.totalOrders || 0,
        total_customers: response.data.totalCustomers || 0,
        total_products: response.data.totalProducts || 0,
        total_sales: response.data.totalSales || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      // Return mock data for development
      return { 
        success: true, 
        data: {
          totalOrders: 0,
          totalCustomers: 0,
          totalProducts: 0,
          totalSales: 0
        },
        total_orders: 0,
        total_customers: 0,
        total_products: 0,
        total_sales: 0
      };
    }
  },

  // Get recent activities
  getRecentActivities: async () => {
    try {
      const response = await api.get('/v1/admin/activities');
      return { 
        success: true, 
        data: response.data.activities || [] 
      };
    } catch (error) {
      console.error('Error fetching recent activities:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      // Return empty array if there's an error
      return { 
        success: true, 
        data: [] 
      };
    }
  },

  // Get application settings
  getSettings: async () => {
    try {
      const response = await api.get('/v1/admin/settings');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to fetch settings' 
      };
    }
  },

  // Update application settings
  updateSettings: async (settings) => {
    try {
      const response = await api.put('/v1/admin/settings', settings);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update settings' 
      };
    }
  },

  // Get payment gateways
  getPaymentGateways: async () => {
    try {
      const response = await api.get('/v1/admin/payment-gateways');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching payment gateways:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to fetch payment gateways',
        data: []
      };
    }
  },

  // Update payment gateway
  updatePaymentGateway: async (gatewayId, data) => {
    try {
      const response = await api.put(`/v1/admin/payment-gateways/${gatewayId}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating payment gateway:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update payment gateway' 
      };
    }
  }
};

export default adminApi;
