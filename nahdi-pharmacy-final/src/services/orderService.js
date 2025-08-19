// src/services/orderService.js
import ApiService from './api';
import productService from './productService';
import { getOrderTypeLabel } from '../utils/orderUtils';

// Helper to classify order items
const classifyOrderItems = (items, products) => {
  return items.reduce((acc, item) => {
    const product = products.find(p => p.id === item.product_id);
    if (product?.is_wholesale) {
      acc.wholesaleItems.push(item);
    } else {
      acc.retailItems.push(item);
    }
    return acc;
  }, { retailItems: [], wholesaleItems: [] });
};

// Helper to create order payload
const createOrderPayload = async (orderData, items, isWholesale) => {
  console.log('📦 Processing order items:', { itemsCount: items.length, isWholesale });
  
  // Format items for the API - ensure structure matches backend's OrderItemRequest
  const formattedItems = [];
  const validationErrors = [];
  
  console.log('🛒 العناصر المراد معالجتها:', JSON.stringify(items, null, 2));
  
  for (const [index, item] of items.entries()) {
    console.log(`🔍 معالجة العنصر ${index + 1}:`, { 
      itemId: item.id,
      productId: item.product_id,
      productData: item.product,
      quantity: item.quantity
    });
    try {
      // 1. Extract and validate product ID
      let productId = (() => {
        // Try different possible ID fields in order of preference
        const possibleIdFields = [
          { value: item.product_uuid, source: 'product_uuid' },
          { value: item.product?.uuid, source: 'product.uuid' },
          { value: item.uuid, source: 'uuid' },
          { value: item.product_id, source: 'product_id' },
          { value: item.id, source: 'id' },
          { value: item.product?.id, source: 'product.id' },
          { value: item.attributes?.uuid, source: 'attributes.uuid' },
          { value: item.attributes?.id, source: 'attributes.id' },
          { value: item.attributes?.data?.uuid, source: 'attributes.data.uuid' },
          { value: item.attributes?.data?.id, source: 'attributes.data.id' }
        ];
        
        // Log available fields for debugging
        console.log('Available ID fields for item:', {
          itemId: item.id,
          productId: item.product_id,
          productUuid: item.product?.uuid,
          uuid: item.uuid,
          attrsUuid: item.attributes?.uuid,
          attrsId: item.attributes?.id,
          attrsDataUuid: item.attributes?.data?.uuid,
          attrsDataId: item.attributes?.data?.id
        });
        
        // Find first valid ID and ensure it's a string
        for (const { value, source } of possibleIdFields) {
          if (!value) continue;
          
          const strId = String(value).trim();
          if (strId) {
            console.log(`Using ID from ${source}:`, strId);
            return strId;
          }
        }
        
        console.error('No valid product ID found in item:', {
          itemId: item.id,
          availableFields: Object.keys(item).filter(k => k !== 'product'),
          productFields: item.product ? Object.keys(item.product) : 'No product data'
        });
        
        return null;
      })();
      
      // Ensure product ID is valid
      if (!productId) {
        const errorMsg = `Item at position ${index + 1} is missing a valid product ID`;
        console.error('❌ ' + errorMsg, {
          itemId: item.id,
          availableFields: Object.keys(item),
          productFields: item.product ? Object.keys(item.product) : 'No product data'
        });
        validationErrors.push(errorMsg);
        continue; // Skip this item but continue with others
      }
      
      // Ensure product ID is a string
      productId = String(productId);

      // 2. Extract price from multiple possible paths
      let price = 0;
      const priceSources = [
        item.price,
        item.unit_price,
        item.attributes?.price,
        item.attributes?.data?.price,
        item.attributes?.data?.attributes?.price,
        item.product?.price,
        item.product?.unit_price,
        item.product?.attributes?.price,
        item.product?.attributes?.data?.price,
        item.product?.attributes?.data?.attributes?.price
      ];
      
      // Find first valid price
      for (const source of priceSources) {
        const numPrice = parseFloat(source);
        if (!isNaN(numPrice) && numPrice > 0) {
          price = numPrice;
          console.log(`✅ Found price: ${price}`, { source: source });
          break;
        }
      }
      
      // If no valid price found, use default with warning
      if (price <= 0) {
        price = 1; // Default price
        console.warn(`⚠️ Using default price (1) for product: ${item.name || 'Unknown'} (ID: ${productId})`);
      }
      
      // 3. Extract product name
      const productName = item.name || item.product?.name || 'Unknown Product';
      
      // 4. Extract product image
      const productImage = item.image || 
                         item.attributes?.image_url || 
                         item.attributes?.data?.image_url ||
                         item.product?.image_url ||
                         item.product?.attributes?.image_url ||
                         '/images/placeholder-product.png';
      
      // 5. Create formatted order item
      const formattedItem = {
        product_id: productId,
        quantity: item.quantity || 1,
        price: price,
        name: productName,
        image: productImage,
        _debug: {
          hasProductData: !!item.product,
          priceSources: [`${price} (${price === 1 ? 'default' : 'extracted'})`],
          processedAt: new Date().toISOString()
        }
      };
      
      console.log('🛒 Formatted item:', formattedItem);
      formattedItems.push(formattedItem);
      
    } catch (error) {
      console.error('❌ Error processing order item:', error);
      throw new Error(`Error processing order item: ${error.message}`);
    }
  }
  
  // Validate we have items to process
  if (formattedItems.length === 0) {
    const errorMsg = 'يجب إضافة عناصر صالحة للطلب';
    console.error('❌ ' + errorMsg, { items, formattedItems, validationErrors });
    throw new Error(errorMsg);
  }
  
  console.log('✅ العناصر المعالجة بنجاح:', JSON.stringify(formattedItems, null, 2));

  // Calculate order totals
  const subtotal = formattedItems.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    if (isNaN(itemTotal) || itemTotal < 0) {
      throw new Error(`Invalid price for product ${item.name}: ${item.price} × ${item.quantity}`);
    }
    return sum + itemTotal;
  }, 0);
  
  const shipping = Math.max(0, parseFloat(orderData.shipping) || 15);
  const total = Math.max(0, subtotal + shipping);
  
  console.log('💰 Order totals:', { subtotal, shipping, total, itemsCount: formattedItems.length });

  // Validate shipping address
  if (!orderData.shipping_address) {
    console.error('❌ Shipping address is missing');
    throw new Error('Shipping address is required');
  }
  
  // Create final order payload
  const orderPayload = {
    ...orderData,
    items: formattedItems.map(item => {
      // تأكد من أن معرف المنتج موجود وصالح
      if (!item.product_id) {
        console.error('❌ خطأ: معرف المنتج مفقود في العنصر:', item);
        throw new Error('معرف المنتج مطلوب لجميع العناصر');
      }
      
      // تحقق من صيغة معرف المنتج
      const productId = String(item.product_id).trim();
      if (!/^[0-9a-fA-F-]+$/.test(productId)) {
        console.error('❌ خطأ: تنسيق معرف المنتج غير صالح:', productId);
        throw new Error('تنسيق معرف المنتج غير صالح: ' + productId);
      }
      
      return {
        ...item,
        product_id: productId, // تأكد من أن المعرف نصي
        quantity: Number(item.quantity) || 1, // تأكد من أن الكمية رقمية
        price: Number(item.price) || 0 // تأكد من أن السعر رقمي
      };
    }),
    subtotal: parseFloat(subtotal.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    payment_method: orderData.payment_method || 'cash_on_delivery',
    notes: orderData.notes || 'تم إنشاء الطلب من الموقع الإلكتروني',
    status: 'pending',
    created_at: new Date().toISOString(),
    // Shipping address with required fields
    shipping_address: {
      full_name: orderData.shipping_address.full_name?.trim() || 'Not specified',
      phone: orderData.shipping_address.phone?.trim() || '',
      email: (orderData.shipping_address.email || '').toLowerCase().trim(),
      address: orderData.shipping_address.address?.trim() || 'Not specified',
      city: orderData.shipping_address.city?.trim() || 'Riyadh',
      district: orderData.shipping_address.district?.trim() || '',
      postal_code: orderData.shipping_address.postal_code?.trim() || ''
    },
    // Billing address (copy from shipping if not provided)
    billing_address: orderData.billing_address ? {
      full_name: orderData.billing_address.full_name || orderData.shipping_address?.full_name || '',
      phone: orderData.billing_address.phone || orderData.shipping_address?.phone || '',
      email: orderData.billing_address.email || orderData.shipping_address?.email || '',
      address: orderData.billing_address.address || orderData.shipping_address?.address || '',
      city: orderData.billing_address.city || orderData.shipping_address?.city || '',
      district: orderData.billing_address.district || orderData.shipping_address?.district || '',
      postal_code: orderData.billing_address.postal_code || orderData.shipping_address?.postal_code || ''
    } : null
  };
  
  console.log('✅ تم إنشاء حمولة الطلب بنجاح:', JSON.stringify(orderPayload, null, 2));
  
  // تحقق نهائي من البيانات قبل الإرسال
  if (!orderPayload.items || !Array.isArray(orderPayload.items) || orderPayload.items.length === 0) {
    const error = new Error('لا توجد عناصر صالحة في الطلب');
    console.error('❌ خطأ في التحقق النهائي:', error);
    throw error;
  }
  
  return orderPayload;
};

// Helper to create order with specific items
const createOrderWithItems = async (orderData, items, isWholesale = false) => {
  try {
    if (!items || items.length === 0) {
      throw new Error('يجب إضافة عناصر للطلب');
    }

    // Create the order payload
    const payload = await createOrderPayload(orderData, items, isWholesale);
    
    // Ensure product IDs are properly formatted as strings
    if (payload.items && Array.isArray(payload.items)) {
      payload.items = payload.items.map(item => ({
        ...item,
        product_id: item.product_id ? String(item.product_id) : null
      }));
    }
    
    console.log('📦 Order payload:', JSON.stringify(payload, null, 2));
    
    // Determine the endpoint based on order type
    const endpoint = isWholesale ? 'wholesale-orders' : 'orders';
    
    try {
      console.log(`🔄 Sending order to /${endpoint}...`);
      const response = await ApiService.post(`/${endpoint}`, payload);
      console.log('✅ Order created successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creating order:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data ? JSON.parse(error.config.data) : null
        }
      });
      
      // Provide more user-friendly error messages
      if (error.response?.data?.error?.includes('product ID')) {
        throw new Error('حدث خطأ في معرّفات المنتجات. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      
      throw new Error(`فشل في إنشاء الطلب: ${error.message || 'حدث خطأ غير معروف'}`);
    }
  } catch (error) {
    console.error('❌ Error in createOrderWithItems:', error);
    
    // Enhanced error handling
    let errorMessage = 'حدث خطأ أثناء إعداد الطلب';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response data:', error.response.data);
      console.error('Error status:', error.response.status);
      
      // Create a new error with the enhanced message
      const enhancedError = new Error(error.response.data?.message || 'فشل في معالجة الطلب');
      enhancedError.status = error.response.status;
      enhancedError.data = error.response.data;
      throw enhancedError;
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      const networkError = new Error('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت');
      networkError.isNetworkError = true;
      throw networkError;
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up the request:', error.message);
      throw new Error('حدث خطأ أثناء إعداد الطلب: ' + error.message);
    }
  }
};

export const orderService = {
    // إنشاء طلب جديد مع دعم الجملة والتجزئة
  async createOrder(orderData) {
    try {
      // Cookie-based auth: no need to fetch/set token; ApiService sends credentials automatically
      // Keep reading any stored user data if needed later (legacy-safe)
      const userData = JSON.parse(
        localStorage.getItem('client_user_data') ||
        localStorage.getItem('userData') ||
        '{}'
      );
      
      // Validate order data
      if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('يجب أن يحتوي الطلب على عناصر صالحة');
      }
      
      // Get unique product IDs from order items
      const productIds = [...new Set(orderData.items
        .map(item => item.product_id || (item.product?.id ? String(item.product.id) : null))
        .filter(Boolean)
      )];
      
      console.log('Fetching products with IDs:', productIds);
      
      // Only fetch products if we have IDs and they're not already in the items
      let products = [];
      if (productIds.length > 0) {
        try {
          const response = await ApiService.get('/products', {
            'filters[id][$in]': productIds.join(','),
            'pagination[pageSize]': 100,
            'populate': '*' // Include all relations
          });
          products = response.data || [];
        } catch (error) {
          console.error('Error fetching products:', error);
          // Continue with empty products array and try to use existing item data
        }
      }
      
      console.log('Fetched products:', products.length, 'products found');
      
      // Enhance items with product data and validate prices
      const enhancedItems = [];
      const validationErrors = [];
      
      for (const item of orderData.items) {
        try {
          let product = item.product;
          let productId = item.product_id || item.id;
          
          // If item doesn't have product data, try to find it in the fetched products
          if (!product && productId) {
            product = products.find(p => 
              p.id === productId || 
              p.id === String(productId) ||
              p.attributes?.sku === productId
            );
            
            if (product) {
              // Enhance the product data
              product = {
                ...product,
                id: product.id,
                name: product.attributes?.name || product.name || 'منتج غير معروف',
                price: product.attributes?.price !== undefined ? 
                  parseFloat(product.attributes.price) : 
                  (product.price !== undefined ? parseFloat(product.price) : 0),
                ...product.attributes
              };
            }
          }
          
          // Get price from item or product
          let price = 0;
          if (item.price !== undefined && item.price !== null) {
            price = parseFloat(item.price);
          } else if (product?.price !== undefined && product.price !== null) {
            price = parseFloat(product.price);
          }
          
          // Validate price
          if (isNaN(price) || price <= 0) {
            const errorMsg = `سعر غير صالح للمنتج: ${product?.name || productId || 'غير معروف'}`;
            console.error('Invalid price:', { item, product, price });
            validationErrors.push(errorMsg);
            continue; // Skip this item
          }
          
          // Ensure required fields
          const name = item.name || product?.name || 'منتج غير معروف';
          
          // Create enhanced item
          enhancedItems.push({
            ...item,
            product_id: productId || null,
            name: name,
            price: price,
            quantity: parseInt(item.quantity) || 1,
            product: product ? {
              id: product.id,
              name: product.name,
              price: product.price,
              ...product
            } : undefined
          });
          
        } catch (error) {
          console.error('Error processing item:', { item, error });
          validationErrors.push(`خطأ في معالجة المنتج: ${error.message}`);
        }
      }
      
      // If no valid items after validation, throw an error
      if (enhancedItems.length === 0) {
        const errorMsg = validationErrors.length > 0 
          ? validationErrors.join('\n')
          : 'لا توجد عناصر صالحة في الطلب';
        throw new Error(errorMsg);
      }
      
      // Update order data with enhanced items
      orderData = {
        ...orderData,
        items: enhancedItems
      };
      
      // Log validation warnings if any
      if (validationErrors.length > 0) {
        console.warn('Validation warnings:', validationErrors);
      }
      
      // Create a map of product ID to product details
      const productMap = products.reduce((map, product) => {
        map[product.id] = product;
        return map;
      }, {});
      
      // Classify items into retail and wholesale
      const retailItems = [];
      const wholesaleItems = [];
      let hasWholesaleItems = false;
      
      orderData.items.forEach(item => {
        let product = productMap[item.product_id];
        if (!product) {
          console.warn(`Product with ID ${item.product_id} not found in the fetched products. Falling back to item data.`);
        }

        // Get product attributes with fallbacks and allow fallback to item data when product is missing
        const attributes = (product && product.attributes) ? product.attributes : {};
        const fallbackName = item.name || item.product?.name || 'Unknown Product';
        const fallbackIsWholesale = Boolean(item.is_wholesale || item.product?.is_wholesale);
        const isWholesale = (attributes.is_wholesale !== undefined ? attributes.is_wholesale : fallbackIsWholesale) || false;

        // Resolve price with safe fallbacks
        const resolvedPrice = (() => {
          const primary = isWholesale ? (attributes.wholesale_price ?? attributes.price) : attributes.price;
          const fromItem = Number(item.price);
          if (primary !== undefined && primary !== null && !isNaN(Number(primary)) && Number(primary) > 0) return Number(primary);
          if (!isNaN(fromItem) && fromItem > 0) return fromItem;
          return 0;
        })();

        // Add product details to the item
        const itemWithDetails = {
          product_id: item.product_id,
          quantity: item.quantity,
          name: attributes.name || fallbackName,
          price: resolvedPrice,
          is_wholesale: isWholesale,
          attributes: product ? product.attributes : null // Include attributes if available
        };

        if (isWholesale) {
          wholesaleItems.push(itemWithDetails);
          hasWholesaleItems = true;
        } else {
          retailItems.push(itemWithDetails);
        }
      });
      
      console.log(`Classified items: ${retailItems.length} retail, ${wholesaleItems.length} wholesale`);
      
      // Create orders based on item types
      const orders = [];
      
      // Create retail order if there are retail items or no wholesale items
      if (retailItems.length > 0 || !hasWholesaleItems) {
        console.log('Creating retail order...');
        try {
          const retailRes = await createOrderWithItems(orderData, retailItems, false);
          // Normalize to order object (DTO) regardless of Axios response shape
          const retailOrder = retailRes?.data?.data || retailRes?.data || retailRes;
          orders.push(retailOrder);
        } catch (error) {
          console.error('Failed to create retail order:', error);
          throw new Error(`Failed to create retail order: ${error.message}`);
        }
      }
      
      // Create wholesale order if there are wholesale items
      if (wholesaleItems.length > 0) {
        console.log('Creating wholesale order...');
        try {
          const wholesaleRes = await createOrderWithItems(orderData, wholesaleItems, true);
          // Normalize to order object (DTO)
          const wholesaleOrder = wholesaleRes?.data?.data || wholesaleRes?.data || wholesaleRes;
          orders.push(wholesaleOrder);
        } catch (error) {
          console.error('Failed to create wholesale order:', error);
          throw new Error(`Failed to create wholesale order: ${error.message}`);
        }
      }
      
      if (orders.length === 0) {
        throw new Error('Failed to create any orders. No valid items found.');
      }
      
      console.log('Successfully created', orders.length, 'order(s)');
      // Dispatch orderPlaced event for notifications
      try {
        const payload = orders.length === 1 ? { order: orders[0] } : { orders };
        window.dispatchEvent(new CustomEvent('orderPlaced', { detail: payload }));
      } catch (e) {
        // ignore event errors
      }

      // Return a single object if only one order was created (checkout expects an object)
      return orders.length === 1 ? orders[0] : orders;
      
    } catch (error) {
      console.error('Error in createOrder:', error);
      
      throw error;
    }
  },

  // الحصول على طلبات المستخدم
  async getUserOrders() {
    try {
      return await ApiService.get('/orders');
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      throw error;
    }
  },

  // الحصول على طلب محدد
  async getOrder(orderId) {
    try {
      return await ApiService.get(`/orders/${orderId}`);
    } catch (error) {
      console.error('Error in getOrder:', error);
      throw error;
    }
  },

  // تتبع الطلب
  async trackOrder(orderId) {
    try {
      return await ApiService.get(`/orders/${orderId}/tracking`);
    } catch (error) {
      console.error('Error in trackOrder:', error);
      throw error;
    }
  },

  // إلغاء الطلب
  async cancelOrder(orderId) {
    try {
      return await ApiService.post(`/orders/${orderId}/cancel`);
    } catch (error) {
      console.error('Error in cancelOrder:', error);
      throw error;
    }
  }
};