import ApiService from '../api';
import { getOrderTypeLabel } from '../../utils/orderUtils';

export const adminOrderService = {
  // Get retail orders (kept for backward compatibility)
  async getRetailOrders(page = 1, limit = 10, status = '', filters = {}) {
    return this.getAllOrders({
      page,
      limit,
      status,
      order_type: 'retail',
      ...filters
    });
  },

  // Get wholesale orders (kept for backward compatibility)
  async getWholesaleOrders(page = 1, limit = 10, status = '', filters = {}) {
    return this.getAllOrders({
      page,
      limit,
      status,
      order_type: 'wholesale',
      ...filters
    });
  },
  
  // Get all orders with filtering and pagination
  async getAllOrders({ page = 1, limit = 10, status = '', order_type = '', search = '', ...filters } = {}) {
    try {
      // Cookie-based auth: no token checks; ApiService sends credentials automatically
      
      // Build query parameters
      const params = new URLSearchParams({
        page,
        limit,
        ...(status && { status }),
        ...(search && { search: encodeURIComponent(search) }),
        ...(order_type && { order_type }),
        ...filters
      });
      
      // Make the API request
      const response = await ApiService.get(`/admin/orders?${params.toString()}`);
      
      if (!response.data) {
        throw new Error('No data received from the server');
      }
      
      // Backend returns { success, message, data, pagination }
      const payload = response.data;
      
      // Normalize orders array from multiple possible shapes
      const rawOrders = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.orders)
          ? payload.orders
          : Array.isArray(payload)
            ? payload
            : [];
      
      // Enhance orders with type information and ensure required fields
      const enhancedOrders = rawOrders.map(order => {
        const orderItems = Array.isArray(order.items)
          ? order.items
          : Array.isArray(order.order_items)
            ? order.order_items
            : [];
        
        const shippingAddr = order.shippingAddress || order.shipping_address || {};
        const billingAddr = order.billingAddress || order.billing_address || {};
        const createdAt = order.createdAt || order.created_at;
        const orderNumber = order.orderNumber || order.order_number || `ORDER-${(order.id || order._id || '').toString().substring(0, 8).toUpperCase() || 'UNKNOWN'}`;
        const user = order.user || {};
        const customerName = order.customerName || user.full_name || user.name || user.fullName || user.email || shippingAddr.full_name || shippingAddr.name || 'غير محدد';
        const customerEmail = user.email || order.customerEmail || '';
        
        return {
          ...order,
          order_type: order.order_type || 'retail',
          order_type_label: getOrderTypeLabel(order.order_type || 'retail'),
          items: orderItems,
          // Preserve full addresses from backend and add a few aliases without losing data
          shippingAddress: {
            ...shippingAddr,
            // helpful aliases (non-destructive)
            full_name: shippingAddr.full_name || shippingAddr.name || [shippingAddr.first_name, shippingAddr.last_name].filter(Boolean).join(' ').trim() || customerName,
            name: shippingAddr.name || shippingAddr.full_name || [shippingAddr.first_name, shippingAddr.last_name].filter(Boolean).join(' ').trim() || customerName,
            address: shippingAddr.address || shippingAddr.address_line1 || shippingAddr.AddressLine1 || '',
            address_line1: shippingAddr.address_line1 || shippingAddr.addressLine1 || shippingAddr.AddressLine1 || shippingAddr.address || '',
            address_line2: shippingAddr.address_line2 || shippingAddr.addressLine2 || shippingAddr.AddressLine2 || shippingAddr.apartment || shippingAddr.unit || shippingAddr.flat || '',
            city: shippingAddr.city || shippingAddr.City || '',
            state: shippingAddr.state || shippingAddr.region || shippingAddr.province || '',
            postal_code: shippingAddr.postal_code || shippingAddr.postalCode || shippingAddr.zip || shippingAddr.zipCode || '',
            country: shippingAddr.country || '',
            phone: shippingAddr.phone || ''
          },
          billingAddress: {
            ...billingAddr,
            full_name: billingAddr.full_name || billingAddr.name || [billingAddr.first_name, billingAddr.last_name].filter(Boolean).join(' ').trim() || customerName,
            name: billingAddr.name || billingAddr.full_name || [billingAddr.first_name, billingAddr.last_name].filter(Boolean).join(' ').trim() || customerName,
            address: billingAddr.address || billingAddr.address_line1 || billingAddr.AddressLine1 || '',
            address_line1: billingAddr.address_line1 || billingAddr.addressLine1 || billingAddr.AddressLine1 || billingAddr.address || '',
            address_line2: billingAddr.address_line2 || billingAddr.addressLine2 || billingAddr.AddressLine2 || billingAddr.apartment || billingAddr.unit || billingAddr.flat || '',
            city: billingAddr.city || billingAddr.City || '',
            state: billingAddr.state || billingAddr.region || billingAddr.province || '',
            postal_code: billingAddr.postal_code || billingAddr.postalCode || billingAddr.zip || billingAddr.zipCode || '',
            country: billingAddr.country || '',
            phone: billingAddr.phone || ''
          },
          paymentMethod: order.paymentMethod || order.payment_method || 'cod',
          status: order.status || 'pending',
          createdAt: createdAt || new Date().toISOString(),
          orderNumber,
          // normalized customer fields for UI consumption
          customerName,
          customerEmail,
          user
        };
      });
      
      // Return the paginated response (normalize pagination keys)
      const pg = payload.pagination || {};
      return {
        orders: enhancedOrders,
        totalPages: pg.total_pages || payload.totalPages || 1,
        currentPage: pg.page || payload.currentPage || page,
        totalOrders: pg.total || payload.totalOrders || enhancedOrders.length
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Get order details with comprehensive error handling and data formatting
  async getOrderDetails(orderId, orderType = '') {
    try {
      // Validate input
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      // Cookie-based auth: handled by browser
      
      // Build the request URL with order type if provided
      let url = `/admin/orders/${orderId}`;
      const params = new URLSearchParams();
      
      if (orderType) {
        params.append('order_type', orderType);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      // Make the API request
      const response = await ApiService.get(url);
      
      if (!response.data) {
        throw new Error('No order data received from server');
      }
      
      const order = response.data;
      
      // Format and enhance the order data
      const formattedOrder = {
        ...order,
        // Ensure required fields exist
        _id: order._id || orderId,
        order_number: order.order_number || order.orderNumber || `ORDER-${(order._id || '').substring(0, 8).toUpperCase() || 'UNKNOWN'}`,
        order_type: order.order_type || 'retail',
        order_type_label: this.getOrderTypeLabel(order.order_type || 'retail'),
        status: order.status || 'pending',
        status_label: this.getStatusLabel(order.status || 'pending'),
        
        // Format order items
        items: Array.isArray(order.items) ? order.items.map(item => ({
          ...item,
          product: item.product || {},
          name: item.name || item.product?.name || 'منتج غير معروف',
          price: parseFloat(item.price || 0).toFixed(2),
          quantity: parseInt(item.quantity || 1, 10),
          total: parseFloat((item.price || 0) * (item.quantity || 1)).toFixed(2)
        })) : [],
        
        // Format customer information
        customer: order.customer || {
          _id: order.user_id,
          name: order.customerName || 'عميل غير معروف',
          email: order.customerEmail || 'لا يوجد بريد إلكتروني',
          phone: order.customerPhone || 'لا يوجد هاتف'
        },
        
        // Format shipping address
        shippingAddress: order.shippingAddress || {
          name: order.customerName || 'غير محدد',
          address: order.shippingAddress?.address || 'غير محدد',
          phone: order.shippingAddress?.phone || order.customerPhone || 'غير محدد',
          city: order.shippingAddress?.city || 'غير محدد',
          country: order.shippingAddress?.country || 'المملكة العربية السعودية',
          postal_code: order.shippingAddress?.postal_code || '00000'
        },
        
        // Format payment information
        payment: order.payment || {
          method: order.paymentMethod || 'cod',
          status: order.paymentStatus || (order.paymentMethod === 'cod' ? 'pending' : 'unpaid'),
          transaction_id: order.transactionId || null,
          amount: order.total || 0
        },
        
        // Format financial information
        subtotal: parseFloat(order.subtotal || order.items?.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0) || 0).toFixed(2),
        shipping_cost: parseFloat(order.shipping_cost || order.shippingCost || 0).toFixed(2),
        tax: parseFloat(order.tax || 0).toFixed(2),
        discount: parseFloat(order.discount || 0).toFixed(2),
        total: parseFloat(order.total || 0).toFixed(2),
        
        // Format dates
        created_at: order.created_at || order.createdAt || new Date().toISOString(),
        updated_at: order.updated_at || order.updatedAt || new Date().toISOString()
      };
      
      return formattedOrder;
      
    } catch (error) {
      console.error(`Error fetching order ${orderId} details:`, error);
      
      // Handle specific error cases
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        } else if (status === 403) {
          throw new Error('You do not have permission to view this order.');
        } else if (status === 404) {
          throw new Error('Order not found. It may have been deleted.');
        } else if (status === 400 && data.error) {
          throw new Error(data.error);
        } else {
          throw new Error(`Server error: ${status} - ${data.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  },
  
  // تحديث حالة الطلب
  async updateOrderStatus(orderId, status, orderType = '') {
    try {
      // Validate input
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      
      // Cookie-based auth: handled by browser
      
      // Build the request URL with order type if provided
      let url = `/admin/orders/${orderId}/status`;
      if (orderType) {
        const params = new URLSearchParams();
        params.append('order_type', orderType);
        url += `?${params.toString()}`;
      }
      
      // Make the API request
      const response = await ApiService.put(url, { 
        status,
        updatedAt: new Date().toISOString()
      });
      
      if (!response.data) {
        throw new Error('No response data received from server');
      }
      
      // Return enhanced order data
      return {
        ...response.data,
        status,
        status_label: this.getStatusLabel(status),
        updatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error updating order ${orderId} status to ${status}:`, error);
      
      // Handle specific error cases
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const { status, data } = error.response;
        
        if (status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        } else if (status === 403) {
          throw new Error('You do not have permission to update this order.');
        } else if (status === 404) {
          throw new Error('Order not found. It may have been deleted.');
        } else if (status === 400 && data.error) {
          throw new Error(data.error);
        } else {
          throw new Error(`Server error: ${status} - ${data.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response from server. Please check your internet connection.');
      } else {
        // Something happened in setting up the request
        throw new Error(`Request error: ${error.message}`);
      }
    }
  },
  
  // Helper function to get status label in Arabic
  getStatusLabel(status) {
    const statusLabels = {
      pending: 'قيد الانتظار',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي'
    };
    return statusLabels[status] || status;
  },

  // Notify customer about an order event (non-blocking usage recommended)
  async notifyCustomer(orderId, payload = {}) {
    try {
      if (!orderId) throw new Error('Order ID is required');
      // Cookie-based auth
      // Proposed backend endpoint
      const res = await ApiService.post(`/admin/orders/${orderId}/notify`, payload);
      return res?.data ?? { ok: true };
    } catch (err) {
      // Surface minimal info; callers may ignore failures
      console.warn('[adminOrderService.notifyCustomer] failed:', err?.message || err);
      throw err;
    }
  },
  
  // Helper function to get order type label in Arabic and English
  getOrderTypeLabel(orderType) {
    const typeLabels = {
      retail: {
        ar: 'تجزئة',
        en: 'Retail'
      },
      wholesale: {
        ar: 'جملة',
        en: 'Wholesale'
      },
      mixed: {
        ar: 'مختلط',
        en: 'Mixed'
      }
    };
    
    // Return both Arabic and English labels by default
    return typeLabels[orderType] || { ar: orderType, en: orderType };
  },

  // Search orders with optional order type filter
  async searchOrders(query, orderType = '') {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(orderType && { order_type: orderType })
      });
      
      const response = await ApiService.get(`/admin/orders/search?${params.toString()}`);
      
      // Enhance search results with type information
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.map(order => ({
          ...order,
          order_type_label: getOrderTypeLabel(order.order_type || 'retail')
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error('Error searching orders:', error);
      throw error;
    }
  },
  
  // Convert a retail order to wholesale
  async convertToWholesale(orderId) {
    try {
      const response = await ApiService.post(`/admin/orders/${orderId}/convert-to-wholesale`);
      
      if (response.data) {
        response.data.order_type_label = getOrderTypeLabel('wholesale');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error converting order to wholesale:', error);
      throw error;
    }
  }
};
