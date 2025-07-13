// src/services/productService.js
import ApiService from './api';

// Helper function to safely get token
const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('authToken');
};

// Helper function to build query parameters
const buildQueryParams = (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, value);
    }
  });
  return queryParams.toString();
};

export const productService = {
  /**
   * Fetch all products with pagination and filters
   * @param {Object} params - Query parameters (page, limit, category, search, etc.)
   * @returns {Promise<Object>} - Paginated products response
   */
  async getAllProducts(params = {}) {
    try {
      const queryString = buildQueryParams({
        page: 1,
        limit: 20,
        ...params
      });
      
      return await ApiService.get(`/products?${queryString}`);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw error;
    }
  },

  /**
   * Get a single product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} - Product details
   */
  async getProduct(id) {
    try {
      if (!id) throw new Error('Product ID is required');
      return await ApiService.get(`/products/${id}`);
    } catch (error) {
      console.error(`❌ Error fetching product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get featured products
   * @returns {Promise<Array>} - Array of featured products
   */
  async getFeaturedProducts() {
    try {
      const response = await ApiService.get('/products/featured');
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching featured products:', error);
      return [];
    }
  },

  /**
   * Search products by query
   * @param {string} query - Search term
   * @param {Object} params - Additional search parameters
   * @returns {Promise<Array>} - Matching products
   */
  async searchProducts(query, params = {}) {
    try {
      const queryString = buildQueryParams({
        q: query,
        ...params
      });
      const response = await ApiService.get(`/products/search?${queryString}`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error searching products:', error);
      throw error;
    }
  },

  /**
   * Get products by category
   * @param {string} categoryId - Category ID
   * @param {Object} params - Additional query parameters
   * @returns {Promise<Array>} - Products in the category
   */
  async getProductsByCategory(categoryId, params = {}) {
    try {
      if (!categoryId) throw new Error('Category ID is required');
      const queryString = buildQueryParams(params);
      const response = await ApiService.get(`/products/category/${categoryId}?${queryString}`);
      return response.data || [];
    } catch (error) {
      console.error(`❌ Error fetching products for category ${categoryId}:`, error);
      throw error;
    }
  },

  /**
   * Get wholesale products
   * @param {Object} params - Query parameters (page, limit, category, etc.)
   * @returns {Promise<Object>} - Paginated wholesale products
   */
  async getWholesaleProducts(params = {}) {
    try {
      const queryString = buildQueryParams({
        page: 1,
        limit: 12,
        wholesale: 'true',
        ...params
      });
      
      return await ApiService.get(`/products?${queryString}`);
    } catch (error) {
      console.error('❌ Error fetching wholesale products:', error);
      throw error;
    }
  },

  /**
   * Create a new product with support for file uploads
   * @param {Object} productData - Product data including images
   * @returns {Promise<Object>} - Created product data
   */
  async createProduct(productData) {
    try {
      // Check authentication
      if (!getAuthToken()) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // Create FormData for file uploads
      const formData = new FormData();
      
      console.group('📦 Preparing product data');
      console.log('Product data:', productData);
      
      // Process each field in productData
      Object.entries(productData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        
        switch (key) {
          case 'images':
            // Handle image files and URLs
            if (Array.isArray(value)) {
              value.forEach((item, index) => {
                if (item instanceof File) {
                  formData.append('images', item, item.name || `image-${index}.jpg`);
                } else if (typeof item === 'string' && !item.startsWith('blob:')) {
                  formData.append('imageUrls', item);
                }
              });
            }
            break;
            
          case 'category':
            // Handle category reference
            if (value && value._id) {
              formData.append('category_id', value._id);
            } else if (value) {
              formData.append('category_id', value);
            }
            break;
            
          case 'variants':
            // Handle product variants if needed
            if (Array.isArray(value)) {
              formData.append('variants', JSON.stringify(value));
            }
            break;
            
          default:
            // Handle other fields
            if (typeof value === 'boolean') {
              formData.append(key, value.toString());
            } else if (typeof value === 'object' && value !== null) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value);
            }
        }
      });
      
      // Log form data for debugging
      console.log('Form data entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      console.groupEnd();
      
      // Make the API request
      const response = await ApiService.post('/admin/products', formData);
      console.log('✅ Product created successfully:', response);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error creating product:', error);
      
      // Handle specific error cases
      if (error.response) {
        // Server responded with an error status code
        const { status, data } = error.response;
        
        if (status === 401 || status === 403) {
          console.error('Authentication error - redirecting to login');
          // The API service will handle the redirect
        } else if (status === 400 && data && data.errors) {
          // Handle validation errors
          const errorMessages = Object.entries(data.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n');
          throw new Error(`Validation failed:\n${errorMessages}`);
        } else if (data && data.message) {
          throw new Error(data.message);
        }
      }
      
      throw error;
    }
  },

  /**
   * Update an existing product
   * @param {string} id - Product ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated product data
   */
  async updateProduct(id, updates) {
    try {
      if (!id) throw new Error('Product ID is required');
      if (!getAuthToken()) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }
      
      // Check if we need to use FormData (for file uploads)
      const hasFiles = updates.images && updates.images.some(img => img instanceof File);
      
      let response;
      if (hasFiles) {
        const formData = new FormData();
        
        // Add all updates to FormData
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (key === 'images') {
              // Handle image updates
              value.forEach((img, index) => {
                if (img instanceof File) {
                  formData.append('images', img, img.name || `image-${index}.jpg`);
                } else if (typeof img === 'string' && !img.startsWith('blob:')) {
                  formData.append('imageUrls', img);
                }
              });
            } else if (typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value);
            }
          }
        });
        
        response = await ApiService.put(`/admin/products/${id}`, formData);
      } else {
        // Regular JSON update
        response = await ApiService.put(`/admin/products/${id}`, updates);
      }
      
      console.log(`✅ Product ${id} updated successfully`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Error updating product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a product
   * @param {string} id - Product ID
   * @returns {Promise<Object>} - Deletion confirmation
   */
  async deleteProduct(id) {
    try {
      if (!id) throw new Error('Product ID is required');
      if (!getAuthToken()) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }
      
      const response = await ApiService.delete(`/admin/products/${id}`);
      console.log(`✅ Product ${id} deleted successfully`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error deleting product ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Upload product images
   * @param {Array<File>} files - Array of image files
   * @returns {Promise<Array>} - Array of uploaded image URLs
   */
  async uploadImages(files) {
    if (!files || !files.length) return [];
    
    try {
      if (!getAuthToken()) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }
      
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('images', file, file.name || `image-${index}.jpg`);
      });
      
      const response = await ApiService.post('/admin/upload/images', formData);
      return response.data?.urls || [];
      
    } catch (error) {
      console.error('❌ Error uploading images:', error);
      throw error;
    }
  }
};