// src/services/authService.js
import ApiService from './api';

export const authService = {
  // تسجيل الدخول
  async login(identifier, password) {
    try {
      // Determine if identifier is email or phone
      const isEmail = identifier.includes('@');
      const loginData = isEmail 
        ? { email: identifier, password }
        : { phone: identifier, password };
      
      console.log('🔑 Sending login request with data:', loginData);
      
      // Make the API call and log the raw response
      const response = await fetch(`${ApiService.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(loginData)
      });
      
      // Log raw response details
      console.log('🔍 Raw response status:', response.status, response.statusText);
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);
      
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('❌ Failed to parse JSON response:', e);
        throw new Error('استجابة غير صالحة من الخادم');
      }
      
      console.log('📊 Parsed response data:', responseData);
      
      if (!response.ok) {
        const errorMessage = responseData.message || `Request failed with status ${response.status}`;
        console.error('❌ Login error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Handle different response formats
      const token = responseData.token || responseData.access_token || 
                  (responseData.data && (responseData.data.token || responseData.data.access_token));
      
      if (!token) {
        console.error('❌ No token found in response. Full response:', responseData);
        throw new Error('لم يتم العثور على رمز الدخول في استجابة الخادم');
      }
      
      console.log('✅ Login successful, token received');
      
      // Store the token in localStorage for persistence
      localStorage.setItem('authToken', token);
      
      // Set the token in the API service for current session
      ApiService.setToken(token);
      
      // Return user data if available, otherwise just the token
      const userData = responseData.user || responseData.data?.user || { email: identifier };
      console.log('👤 User data:', userData);
      
      return {
        token,
        user: userData
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw to be handled by the component
    }
  },

  // تسجيل مستخدم جديد
  async register(userData) {
    const response = await ApiService.post('/auth/register', userData);
    
    if (response.token) {
      ApiService.setToken(response.token);
    }
    
    return response;
  },

  // تسجيل الخروج
  async logout() {
    await ApiService.post('/auth/logout', {});
    ApiService.removeToken();
  },

  // الحصول على ملف المستخدم
  async getProfile() {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
      // Try to get user info from the token first
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.user) {
          return payload.user;
        }
        
        // If no user in payload, try to create a minimal user from available token data
        if (payload.email || payload.sub) {
          return {
            id: payload.sub || 'guest',
            email: payload.email || 'user@example.com',
            name: payload.name || 'مستخدم',
            isGuest: true
          };
        }
      } catch (e) {
        console.error('Error parsing token payload:', e);
      }

      // If token parsing fails, try the API endpoints as fallback
      const endpoints = ['/auth/me', '/users/me'];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await ApiService.get(endpoint);
          if (response && (response.data || response.user)) {
            return response.data || response.user || response;
          }
        } catch (error) {
          console.log(`Endpoint ${endpoint} failed:`, error.message);
          // Continue to next endpoint
        }
      }
      
      // If all endpoints fail, return a guest user
      console.log('All profile endpoints failed, using guest user');
      return {
        id: 'guest',
        name: 'مستخدم',
        email: 'user@example.com',
        isGuest: true
      };
      
    } catch (error) {
      console.error('Error in getProfile:', error);
      // Return a guest user instead of throwing an error
      return {
        id: 'guest',
        name: 'مستخدم',
        email: 'user@example.com',
        isGuest: true
      };
    }
  },

  // تحديث ملف المستخدم
  async updateProfile(userData) {
    return await ApiService.put('/users/profile', userData);
  }
};