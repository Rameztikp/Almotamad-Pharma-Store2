// src/services/productService.js
import ApiService from './api';

// Category service
const categoryService = {
  /**
   * Fetch all categories from the API
   * @returns {Promise<Array>} - Array of category objects with id and name
   */
  async getCategories() {
    try {
      const response = await ApiService.get('/categories');
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      throw error;
    }
  }
};

// Helper function to safely get token
const getAuthToken = () => {
  console.log('🔍 getAuthToken: Checking for authentication token...');
  
  // First check localStorage for admin token
  const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
  console.log('🔍 localStorage admin tokens:', {
    admin_token: localStorage.getItem('admin_token'),
    adminToken: localStorage.getItem('adminToken')
  });
  
  if (adminToken) {
    console.log('✅ Found admin token in localStorage:', adminToken.substring(0, 20) + '...');
    return adminToken;
  }
  
  // Then check regular tokens
  const localToken = localStorage.getItem('token') || localStorage.getItem('authToken');
  console.log('🔍 localStorage regular tokens:', {
    token: localStorage.getItem('token'),
    authToken: localStorage.getItem('authToken')
  });
  
  if (localToken) {
    console.log('✅ Found token in localStorage:', localToken.substring(0, 20) + '...');
    return localToken;
  }
  
  // Then check cookies (for admin authentication)
  console.log('🔍 Checking cookies:', document.cookie);
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    console.log('🔍 Cookie:', { name, value: value ? value.substring(0, 20) + '...' : 'empty' });
    if (name === 'token' || name === 'authToken' || name === 'admin_token') {
      console.log('✅ Found token in cookies:', value.substring(0, 20) + '...');
      return value;
    }
  }
  
  console.log('❌ No authentication token found anywhere');
  return null;
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


// Create the main product service object
const productService = {
  /**
   * Fetch all products with pagination and filters
   * @param {Object} params - Query parameters (page, limit, category, search, etc.)
   * @returns {Promise<Object>} - Paginated products response
   */
  async getAdminProducts(params = {}) {
    try {
      console.log(`[API] Fetching admin products with params:`, params);
      const response = await ApiService.get('/admin/products', params);
      
      let products = [];
      let total = 0;

      if (response && response.products) {
        products = response.products;
        total = response.total || response.products.length;
      } else if (response && Array.isArray(response.data)) {
        products = response.data;
        total = response.pagination?.total || response.data.length;
      } else if (Array.isArray(response)) {
        products = response;
        total = response.length;
      }

      console.log(`[API] Successfully fetched ${products.length} admin products`);

      return {
        success: true,
        data: products,
        pagination: response.pagination || {
          page: parseInt(params.page, 10) || 1,
          limit: parseInt(params.limit, 10) || 20,
          total,
          totalPages: Math.ceil(total / (params.limit || 20))
        }
      };
    } catch (error) {
      console.error('[API] Error fetching admin products:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        params
      });
      // Re-throw the error to be handled by the component
      throw error;
    }
  },

  /**
   * Fetch all products with pagination and filters
   * @param {Object} params - Query parameters (page, limit, category, search, etc.)
   * @returns {Promise<Object>} - Paginated products response
   */
  async getAllProducts(params = {}) {
    try {
      // Set default parameters
      const defaultParams = {
        page: 1,
        limit: 20,
        sort: 'created_at',
        order: 'desc',
        // Removed is_active: true to fetch all products regardless of status
        // Add explicit type filtering if not specified
        ...(!params.type && !params.product_type && !params.is_wholesale ? {
          'filters[type][$ne]': 'wholesale', // Exclude wholesale by default if not specified
          'filters[is_wholesale][$ne]': 'true'
        } : {}),
        ...params
      };
      
      // If is_active is explicitly set in params, keep it, otherwise don't include it
      if (typeof params.is_active === 'undefined') {
        delete defaultParams.is_active;
      }
      
      // Filter out null/undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(defaultParams)
          .filter(([_, value]) => value !== null && value !== undefined)
      );
      
      console.log(`[API] Fetching products with params:`, cleanParams);
      
      // Make the API request with clean parameters
      const response = await ApiService.get('/products', cleanParams);
      
      // Process the response
      let products = [];
      let total = 0;
      
      if (Array.isArray(response)) {
        products = response;
        total = response.length;
      } else if (response && Array.isArray(response.data)) {
        products = response.data;
        total = response.pagination?.total || response.data.length;
      } else if (response && response.products) {
        products = response.products;
        total = response.total || response.products.length;
      } else if (response && response.data && response.data.products) {
        products = response.data.products;
        total = response.data.pagination?.total || response.data.products.length;
      } else if (response && response.data) {
        products = Array.isArray(response.data) ? response.data : [];
        total = response.pagination?.total || products.length;
      }
      
          // Additional client-side filtering as a safeguard
      // Only apply retail filtering if we're not explicitly asking for wholesale products
      if (!params.type && params.is_wholesale !== true) {
        const initialCount = products.length;
        products = products.filter(product => {
          const isRetail = !product.type || 
                          product.type === 'retail' || 
                          product.product_type === 'retail' || 
                          product.is_retail === true;
          
          if (!isRetail && process.env.NODE_ENV === 'development') {
            console.debug('[Retail] Filtered out non-retail product:', {
              id: product.id,
              name: product.name,
              type: product.type,
              product_type: product.product_type,
              is_wholesale: product.is_wholesale
            });
          }
          
          return isRetail;
        });
        
        if (initialCount > products.length && process.env.NODE_ENV === 'development') {
          console.debug(`[Retail] Filtered out ${initialCount - products.length} non-retail products`);
        }
      }
      
      console.log(`[API] Successfully fetched ${products.length} products`);
      
      return {
        success: true,
        data: products,
        pagination: response.pagination || {
          page: parseInt(defaultParams.page, 10) || 1,
          limit: parseInt(defaultParams.limit, 10) || 20,
          total,
          totalPages: Math.ceil(total / (defaultParams.limit || 20))
        }
      };
      
    } catch (error) {
      console.error('[API] Error fetching products:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        params
      });
      
      let errorMessage = 'فشل تحميل المنتجات. يرجى المحاولة مرة أخرى لاحقاً';
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = 'بيانات طلب غير صالحة';
            break;
          case 401:
            errorMessage = 'غير مصرح. يرجى تسجيل الدخول';
            break;
          case 404:
            errorMessage = 'لم يتم العثور على منتجات';
            break;
          case 500:
            errorMessage = 'خطأ في الخادم الداخلي';
            break;
          default:
            errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'انتهت مهلة الاتصال. يرجى التحقق من اتصال الإنترنت';
      } else if (!navigator.onLine) {
        errorMessage = 'لا يوجد اتصال بالإنترنت';
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.status = error.response?.status || 500;
      enhancedError.isNetworkError = !error.response;
      enhancedError.originalError = error;
      
      throw enhancedError;
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
   * Get featured retail products for the home page
   * @returns {Promise<Array>} - Array of featured retail products
   */
  async getFeaturedProducts() {
    try {
      console.log('[Featured] Fetching featured retail products...');
      
      const response = await ApiService.get('/products', {
        params: {
          is_featured: true,
          type: 'retail',
          product_type: 'retail',
          is_retail: true,
          is_active: true,
          limit: 10,
          // Explicitly exclude wholesale products
          'filters[type][$eq]': 'retail',
          'filters[is_wholesale][$ne]': 'true'
        },
        paramsSerializer: params => {
          const parts = [];
          Object.entries(params).forEach(([key, value]) => {
            if (value === null || typeof value === 'undefined') return;
            if (Array.isArray(value)) {
              value.forEach(val => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`));
            } else {
              parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
          });
          return parts.join('&');
        }
      });
      
      // Handle different response formats
      let products = [];
      if (Array.isArray(response)) {
        products = response;
      } else if (response && response.data) {
        products = Array.isArray(response.data) ? response.data : [];
      } else if (response && response.products) {
        products = Array.isArray(response.products) ? response.products : [];
      }
      
      // Additional client-side filtering as a safeguard
      const retailProducts = products.filter(product => {
        const isRetail = product.type === 'retail' || 
                        product.product_type === 'retail' || 
                        product.is_retail === true;
        
        if (!isRetail) {
          console.warn('[Featured] Filtered out non-retail product:', {
            id: product.id,
            name: product.name,
            type: product.type,
            product_type: product.product_type,
            is_wholesale: product.is_wholesale
          });
        }
        
        return isRetail;
      });
      
      console.log(`[Featured] Found ${retailProducts.length} featured retail products`);
      return retailProducts;
      
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
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} category - Category filter (ID or slug)
   * @returns {Promise<Object>} - Paginated response with products and metadata
   */
  async getWholesaleProducts(page = 1, limit = 20, category = '') {
    try {
      // Build query parameters for Strapi v4
      const params = {
        'pagination[page]': page,
        'pagination[pageSize]': limit,
        'sort': 'createdAt:desc',
        'filters[$and][0][is_wholesale][$eq]': true,
        // Removed is_active filter to include all products regardless of status
        'populate': '*'
      };
      
      // Add category filter if provided
      if (category && category !== 'all') {
        // Check if category is an ID (UUID) or slug
        const isUuid = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i.test(category);
        
        if (isUuid) {
          params['filters[$and][2][categories][id][$eq]'] = category;
        } else {
          params['filters[$and][2][categories][slug][$eq]'] = category;
        }
      }
      
      console.log('[Wholesale] Fetching products with params:', params);
      
      // Make the API request
      const response = await ApiService.get('/products', { params });
      
      console.log('[API] Raw wholesale products response:', response);
      
      // Process the response
      let products = [];
      let total = 0;
      
      if (response?.data?.data) {
        // Strapi v4 format
        products = response.data.data.map(item => ({
          id: item.id,
          ...item.attributes,
          // Flatten relationships
          categories: item.attributes.categories?.data?.map(cat => ({
            id: cat.id,
            ...cat.attributes
          })) || []
        }));
        
        total = response.data.meta?.pagination?.total || products.length;
      } else if (Array.isArray(response?.data)) {
        // Fallback for array response
        products = response.data;
        total = products.length;
      } else if (response?.data?.products) {
        // Fallback for custom format
        products = response.data.products;
        total = response.data.pagination?.total || products.length;
      } else if (response?.products) {
        // Another fallback format
        products = response.products;
        total = response.total || products.length;
      }
      
      // Additional client-side filtering as a safeguard
      const wholesaleProducts = products.filter(product => {
        return product.is_wholesale === true || 
               product.type === 'wholesale' || 
               product.product_type === 'wholesale';
      });
      
      console.log(`[Wholesale] Found ${wholesaleProducts.length} wholesale products`);
      
      // Return the results
      return {
        success: true,
        data: wholesaleProducts,
        pagination: {
          page: parseInt(page, 10) || 1,
          pageSize: parseInt(limit, 10) || 20,
          total: total,
          totalPages: Math.ceil(total / (limit || 20)),
          // Include raw response for debugging
          _raw: response.data
        }
      };
      
    } catch (error) {
      console.error('❌ Error fetching wholesale products:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        config: error.config,
        page,
        limit,
        category
      });
      
      // Return empty result with error information
      return {
        success: false,
        error: error.message || 'Failed to fetch wholesale products',
        data: [],
        pagination: {
          page: parseInt(page, 10) || 1,
          pageSize: parseInt(limit, 10) || 20,
          total: 0,
          totalPages: 0
        },
        _error: error.response?.data || error.message
      };
    }
  },

  /**
   * Create a new product with support for file uploads
   * @param {Object} productData - Product data including images
   * @returns {Promise<Object>} - Created product data
   */
  /**
   * Create a new product
   * @param {Object} productData - Product data including category_id (UUID)
   * @returns {Promise<Object>} - Created product data
   */
  async createProduct(productData) {
    console.log('🚀🚀🚀 createProduct ENTRY POINT:', productData);
    try {
      console.log('🚀 createProduct called with:', productData);
      
      // Check authentication
      if (!getAuthToken()) {
        console.error('❌ No auth token found');
        throw new Error('يجب تسجيل الدخول أولاً');
      }
      console.log('✅ Auth token found');

      console.group('📦 Preparing product data');
      console.log('Product data:', productData);
      
      // Extract category ID if category is an object
      let categoryId = productData.category_id;
      
      // Handle case where category is an object
      if (categoryId && typeof categoryId === 'object') {
        categoryId = categoryId.id || categoryId._id || null;
      }
      
      // If still no categoryId, try to get it from the category property
      if (!categoryId && productData.category) {
        categoryId = typeof productData.category === 'object' ? 
          (productData.category.id || productData.category._id) : 
          productData.category;
      }
      
      // Ensure categoryId is a string and not empty
      categoryId = String(categoryId || '').trim();
      if (!categoryId) {
        throw new Error('Category ID is required');
      }

      // Prepare the request payload matching server expectations
      const payload = {
        name: productData.name,
        description: productData.description || '',
        price: parseFloat(productData.price) || 0,
        category_id: categoryId,
        type: productData.type || 'retail',
        sku: productData.sku || `SKU-${Date.now()}`,
        brand: productData.brand || '',
        stock_quantity: parseInt(productData.stock_quantity || productData.stock || 0, 10),
        min_stock_level: parseInt(productData.min_stock_level || 5, 10),
        image_url: productData.image_url || (productData.images && productData.images.length > 0 ? productData.images[0] : ''),
        images: Array.isArray(productData.images) ? 
          productData.images.map(img => {
            if (typeof img === 'string') return img;
            if (img && typeof img === 'object') {
              return img.url || img.path || (img instanceof File ? URL.createObjectURL(img) : '');
            }
            return '';
          }).filter(Boolean) : [],
        is_active: true, // Set to true by default
        is_featured: productData.is_featured || false,
        requires_prescription: productData.requiresPrescription || false,
        // Medicine-specific fields
        expiry_date: productData.expiryDate || null,
        batch_number: productData.batchNumber || null,
        manufacturer: productData.manufacturer || null,
        active_ingredient: productData.activeIngredient || null,
        dosage_form: productData.dosageForm || null,
        strength: productData.strength || null,
        storage_conditions: productData.storageConditions || null,
        side_effects: productData.sideEffects || null,
        contraindications: productData.contraindications || null
      };
      
      console.log('Request payload:', JSON.stringify(payload, null, 2));
      
      // Make the API request with error handling
      try {
        console.log('🚀 Making API request to /admin/products...');
        console.log('🔍 Final payload being sent:', payload);
        const response = await ApiService.post('/admin/products', payload);
        console.log('✅ Product created successfully:', response);
        return response.data;
      } catch (apiError) {
        console.error('❌ API Error:', {
          status: apiError.response?.status,
          data: apiError.response?.data,
          message: apiError.message,
          name: apiError.name,
          config: {
            url: apiError.config?.url,
            method: apiError.config?.method,
            data: apiError.config?.data
          }
        });
        console.error('❌ Full API Error object:', apiError);
        throw apiError;
      }
      
    } catch (error) {
      console.error('❌ Error in createProduct:', {
        name: error.name,
        message: error.message,
        response: {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        },
        stack: error.stack
      });
      
      // Handle specific error cases with more detailed messages
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 401 || status === 403) {
          console.error('Authentication error - redirecting to login');
        } 
        
        if (data) {
          if (data.errors) {
            // Handle validation errors
            const errorMessages = Object.entries(data.errors)
              .map(([field, message]) => `${field}: ${message}`)
              .join('\n');
            throw new Error(`Validation failed:\n${errorMessages}`);
          } else if (data.message) {
            throw new Error(data.message);
          }
        }
      }
      
      // For network errors or other unhandled cases
      throw new Error(error.message || 'حدث خطأ أثناء إنشاء المنتج. يرجى المحاولة مرة أخرى.');
    } finally {
      console.groupEnd();
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
      
      // Process category_id if it exists in updates
      if ('category_id' in updates) {
        let categoryId = updates.category_id;
        
        // Handle case where category is an object
        if (categoryId && typeof categoryId === 'object') {
          categoryId = categoryId.id || categoryId._id || null;
        }
        
        // Ensure categoryId is a string and not empty
        updates.category_id = String(categoryId || '').trim();
        if (!updates.category_id) {
          throw new Error('Category ID is required');
        }
      }
      
      // Check if we need to use FormData (for file uploads)
      const hasFiles = updates.images && updates.images.some(img => img instanceof File);
      
      let response;
      if (hasFiles) {
        const formData = new FormData();
        
        // Handle image updates
        if (updates.images) {
          updates.images.forEach((img, index) => {
            if (img instanceof File) {
              formData.append('images', img, img.name || `image-${index}.jpg`);
            } else if (typeof img === 'string' && !img.startsWith('blob:')) {
              formData.append('imageUrls', img);
            }
          });
        }
        
        // Add other fields to FormData
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'images' && value !== null && value !== undefined) {
            if (typeof value === 'object' && !(value instanceof File)) {
              formData.append(key, JSON.stringify(value));
            } else if (typeof value !== 'undefined') {
              formData.append(key, value);
            }
          }
        });
        
        response = await ApiService.put(`/admin/products/${id}`, formData);
      } else {
        // Regular JSON update - ensure we're not sending the category object
        const cleanUpdates = { ...updates };
        if (cleanUpdates.category) {
          delete cleanUpdates.category;
        }
        response = await ApiService.put(`/admin/products/${id}`, cleanUpdates);
      }
      
      console.log(`✅ Product ${id} updated successfully`, response);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Error updating product ${id}:`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      if (error.response?.data?.errors) {
        const errorMessages = Object.entries(error.response.data.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join('\n');
        throw new Error(`Validation failed:\n${errorMessages}`);
      }
      
      throw error;
    }
  },

  /**
   * Upload images
   * @param {Array<File>} files - Image files to upload
   * @returns {Promise<Array>} - Array of uploaded image URLs
   */
  async uploadImages(files) {
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });

      const response = await ApiService.post('/admin/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      // The backend now returns an object with a 'url' property for Cloudinary URL
      // It may also return an array if multiple files are uploaded in the future
      if (response && response.url) {
        return [response.url];
      } else if (response && Array.isArray(response)) {
        return response.map(res => res.url);
      }
      // Fallback for old structure just in case
      return [response.path];
    } catch (error) {
      console.error('Error uploading images:', error);
    }
  },

  /**
   * Update product status (publish/unpublish)
   * @param {string} productId - The ID of the product
   * @param {string} productType - The type of product ('retail' or 'wholesale')
   * @param {string} action - The action to perform ('publish' or 'unpublish')
   * @returns {Promise<Object>} - Response data
   */
  async updateProductStatus(productId, productType, action = 'publish') {
    try {
      // Validate input
      if (!productId) {
        throw new Error('معرف المنتج مطلوب');
      }

      if (!['retail', 'wholesale'].includes(productType)) {
        throw new Error('نوع المنتج غير صالح. يجب أن يكون إما retail أو wholesale');
      }

      if (!['publish', 'unpublish'].includes(action)) {
        throw new Error('الإجراء غير صالح. يجب أن يكون إما publish أو unpublish');
      }

      // Get the token from localStorage
      const token = getAuthToken();
      if (!token) {
        throw new Error('لم يتم العثور على رمز المصادقة. يرجى تسجيل الدخول مرة أخرى.');
      }

      console.log(`${action === 'publish' ? 'Publishing' : 'Unpublishing'} product ${productId} for ${productType}...`);
      
      // Prepare the request data
      const requestData = { 
        type: productType,
        action: action === 'publish' ? 'activate' : 'deactivate'
      };

      console.log('Sending request with data:', requestData);
      
      // Make the API request to update product status
      const response = await ApiService.patch(
        `/admin/products/${productId}/status`,
        requestData // ApiService will handle JSON stringification
      );

      console.log('Status update response:', response);
      
      // Return the response data
      return {
        success: true,
        message: response.message || `تم ${action === 'publish' ? 'نشر' : 'إيقاف نشر'} المنتج بنجاح`,
        data: response.data || response
      };
      
    } catch (error) {
      console.error(`Error ${action === 'publish' ? 'publishing' : 'unpublishing'} product:`, error);
      
      // Handle different error scenarios
      let errorMessage = `حدث خطأ أثناء محاولة ${action === 'publish' ? 'نشر' : 'إيقاف نشر'} المنتج`;
      let statusCode = null;
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
        
        statusCode = error.response.status;
        
        if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401) {
          errorMessage = 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.';
        } else if (error.response.status === 403) {
          errorMessage = `ليس لديك صلاحية ${action === 'publish' ? 'لنشر' : 'لإيقاف نشر'} المنتجات`;
        } else if (error.response.status === 404) {
          errorMessage = 'المنتج غير موجود';
        } else if (error.response.status === 409) {
          const alreadyActioned = action === 'publish' ? 'alreadyPublished' : 'alreadyUnpublished';
          return {
            success: true,
            [alreadyActioned]: true,
            message: `المنتج ${action === 'publish' ? 'منشور' : 'غير منشور'} مسبقاً`,
            status: error.response.status
          };
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        errorMessage = error.message || 'حدث خطأ غير متوقع';
      }
      
      // Return the error details
      return {
        success: false,
        message: errorMessage,
        status: statusCode,
        error: error
      };
    }
  },

  /**
   * Activate a product for a specific type (retail/wholesale)
   * @param {string} productId - The ID of the product to activate
   * @param {string} productType - The type of product ('retail' or 'wholesale')
   * @returns {Promise<Object>} - Response data
   */
  async activateProduct(productId, productType) {
    // Use the new updateProductStatus function for backward compatibility
    return this.updateProductStatus(productId, productType, 'publish');
  },

  /**
   * Deactivate a product for a specific type (retail/wholesale)
   * @param {string} productId - The ID of the product to deactivate
   * @param {string} productType - The type of product ('retail' or 'wholesale')
   * @returns {Promise<Object>} - Response data
   */
  async deactivateProduct(productId, productType) {
    // Use the new updateProductStatus function for backward compatibility
    return this.updateProductStatus(productId, productType, 'unpublish');
  },

  /**
   * Delete a product by ID
   * @param {string} id - Product ID to delete
   * @returns {Promise<Object>} - Response data
   */
  /**
   * Get published products
   * @param {Object} params - Query parameters (type, limit, etc.)
   * @returns {Promise<Array>} - Published products
   */
  getPublishedProducts: async function(params = {}) {
    try {
      // Convert params object to URLSearchParams for proper serialization
      const queryParams = new URLSearchParams();
      
      // Add each parameter to the query string
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
      
      // Build the URL with query parameters
      const url = `/products/published?${queryParams.toString()}`;
      
      // Make the API request
      const response = await ApiService.get(url);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching published products:', error);
      throw error;
    }
  },

  /**
   * Delete a product by ID
   * @param {string} id - Product ID to delete
   * @returns {Promise<Object>} - Response data
   */
  async deleteProduct(id) {
    try {
      console.log(`[Product Service] Deleting product ${id}`);
      const response = await ApiService.delete(`/admin/products/${id}`);
      
      console.log(`[Product Service] Successfully deleted product ${id}`);
      return {
        success: true,
        data: response.data,
        message: 'تم حذف المنتج بنجاح'
      };
    } catch (error) {
      console.error(`❌ Error deleting product ${id}:`, error);
      
      let errorMessage = 'فشل حذف المنتج. يرجى المحاولة مرة أخرى لاحقاً';
      if (error.response) {
        switch (error.response.status) {
          case 404:
            errorMessage = 'المنتج غير موجود';
            break;
          case 401:
            errorMessage = 'غير مصرح. يرجى تسجيل الدخول';
            break;
          case 403:
            errorMessage = 'غير مصرح لك بحذف هذا المنتج';
            break;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        status: error.response?.status
      };
    }
  },

  /**
   * Unified function to fetch products by type
   * @param {Object} options - Fetching options
   * @param {string} [options.type='retail'] - Product type ('retail' or 'wholesale')
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {Object} [options.filters={}] - Additional filters
   * @returns {Promise<Object>} - Paginated products response
   */
  async fetchProductsByType({
    type = 'retail',
    page = 1,
    limit = 20,
    filters = {},
    // Optional client-side category filtering for compatibility
    clientCategoryId,
    clientCategorySlug,
  } = {}) {
    try {
      const isWholesale = type === 'wholesale';
      
      // Build the query parameters directly without nesting them under 'params'
      const queryParams = {
        page,
        limit,
        sort: 'created_at',
        order: 'desc',
        is_active: 'true', // Ensure this is a string
        ...(isWholesale 
          ? { 
              'filters[$or][0][is_wholesale][$eq]': 'true',
              'filters[$or][1][type][$eq]': 'wholesale'
            }
          : {
              'filters[$and][0][type][$ne]': 'wholesale',
              'filters[$and][1][is_wholesale][$ne]': 'true'
            }),
        ...filters
      };

      console.log(`[${type.toUpperCase()}] Fetching products with params:`, queryParams);
      
      // Pass the query parameters directly, not wrapped in a params object
      const response = await ApiService.get('/products', queryParams);

      // Normalize products array from various possible response shapes
      let products = [];
      const rd = response?.data;
      if (Array.isArray(rd?.data)) {
        products = rd.data; // Strapi-like { data: [] }
      } else if (Array.isArray(rd)) {
        products = rd; // Plain array in data
      } else if (Array.isArray(response?.products)) {
        products = response.products; // { products: [] }
      } else if (Array.isArray(response?.items)) {
        products = response.items; // { items: [] }
      } else if (Array.isArray(response)) {
        products = response; // Plain array
      } else if (Array.isArray(response?.data)) {
        products = response.data; // { data: [] } at top-level
      } else {
        products = [];
      }
      
      // Additional client-side filtering as a safeguard
      let filteredProducts = products.filter(product => {
        if (isWholesale) {
          return product.type === 'wholesale' || 
                 product.is_wholesale === true ||
                 product.product_type === 'wholesale';
        } else {
          return product.type !== 'wholesale' && 
                 product.is_wholesale !== true &&
                 (product.type === 'retail' || 
                  product.is_retail === true ||
                  product.product_type === 'retail');
        }
      });

      // Optional client-side category filter if provided
      if (clientCategoryId || clientCategorySlug) {
        const cid = String(clientCategoryId || '').toLowerCase();
        const cslug = String(clientCategorySlug || '').toLowerCase();
        filteredProducts = filteredProducts.filter((p) => {
          const cats = p.categories || p.category || [];
          const arr = Array.isArray(cats) ? cats : [cats];
          return arr.some((c) => {
            const idMatch = cid && String(c?.id || c?._id || '').toLowerCase() === cid;
            const slugMatch = cslug && String(c?.slug || '').toLowerCase() === cslug;
            return idMatch || slugMatch;
          });
        });
      }

      return {
        success: true,
        data: filteredProducts,
        pagination: {
          page: rd?.meta?.pagination?.page || page,
          pageSize: rd?.meta?.pagination?.pageSize || limit,
          pageCount: rd?.meta?.pagination?.pageCount || 1,
          total: rd?.meta?.pagination?.total || filteredProducts.length
        }
      };
    } catch (error) {
      console.error(`[${type.toUpperCase()}] Error fetching products:`, error);
      throw error;
    }
  },

  getProductsByType: async function(options) {
    return this.fetchProductsByType(options);
  }
};

// Export all methods as named exports
export const {
  getAdminProducts,
  getAllProducts,
  getProduct,
  getFeaturedProducts,
  searchProducts,
  getProductsByCategory,
  getWholesaleProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  uploadImages,
  activateProduct,
  deactivateProduct,
  deleteProduct,
  fetchProductsByType,
  getProductsByType,
  getPublishedProducts
} = productService;

// تصدير خدمة المنتجات فقط
export default productService;