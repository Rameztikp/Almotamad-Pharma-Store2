// src/services/orderService.js
import ApiService from './api';

export const orderService = {
  // إنشاء طلب جديد
  async createOrder(orderData) {
    try {
      // Get the auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      // Make sure the token is set in the API service
      ApiService.setToken(token);
      
      // Make the request
      const response = await ApiService.post('/orders', orderData);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      return response;
    } catch (error) {
      console.error('Error in createOrder:', error);
      
      // Handle 401 Unauthorized - token expired or invalid
      if (error.response && error.response.status === 401) {
        // Clear any invalid token
        localStorage.removeItem('authToken');
        // Redirect to login page
        window.location.href = '/login?redirect=/checkout';
      }
      
      throw error;
    }
  },

  // الحصول على طلبات المستخدم
  async getUserOrders() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      ApiService.setToken(token);
      return await ApiService.get('/orders');
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      throw error;
    }
  },

  // الحصول على طلب محدد
  async getOrder(orderId) {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      ApiService.setToken(token);
      return await ApiService.get(`/orders/${orderId}`);
    } catch (error) {
      console.error('Error in getOrder:', error);
      throw error;
    }
  },

  // تتبع الطلب
  async trackOrder(orderId) {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        ApiService.setToken(token);
      }
      return await ApiService.get(`/orders/${orderId}/tracking`);
    } catch (error) {
      console.error('Error in trackOrder:', error);
      throw error;
    }
  },

  // إلغاء الطلب
  async cancelOrder(orderId) {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      ApiService.setToken(token);
      return await ApiService.post(`/orders/${orderId}/cancel`);
    } catch (error) {
      console.error('Error in cancelOrder:', error);
      throw error;
    }
  }
};