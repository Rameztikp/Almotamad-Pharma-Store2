// src/utils/orderUtils.js

/**
 * Classify order items into retail and wholesale categories
 * @param {Array} items - Array of order items
 * @param {Array} products - Array of product details
 * @returns {Object} Object with classified items
 */
export const classifyOrderItems = (items, products) => {
  return items.reduce((acc, item) => {
    const product = products.find(p => p.id === item.product_id);
    if (product && product.is_wholesale) {
      acc.wholesaleItems.push(item);
    } else {
      acc.retailItems.push(item);
    }
    return acc;
  }, { retailItems: [], wholesaleItems: [] });
};

/**
 * Check if user has wholesale access
 * @param {Object} userData - User data object
 * @returns {boolean} True if user has wholesale access
 */
export const hasWholesaleAccess = (userData) => {
  return !!userData?.wholesale_access;
};

/**
 * Create order payload with proper classification
 * @param {Object} orderData - Original order data
 * @param {Array} items - Items for this order
 * @param {boolean} isWholesale - Whether this is a wholesale order
 * @returns {Object} Processed order payload
 */
export const createOrderPayload = (orderData, items, isWholesale = false) => {
  return {
    ...orderData,
    items,
    order_type: isWholesale ? 'wholesale' : 'retail',
    is_wholesale: isWholesale,
    // Add any additional fields needed for the backend
  };
};

/**
 * Process order items and split into retail/wholesale orders if needed
 * @param {Object} orderData - Original order data
 * @param {Array} items - Order items
 * @param {Array} products - Product details
 * @param {Object} userData - Current user data
 * @returns {Promise<Array>} Array of order payloads
 */
export const processOrderItems = async (orderData, items, products, userData) => {
  const { retailItems, wholesaleItems } = classifyOrderItems(items, products);
  const orders = [];

  // Process retail items
  if (retailItems.length > 0) {
    orders.push(createOrderPayload(orderData, retailItems, false));
  }

  // Process wholesale items if user has access
  if (wholesaleItems.length > 0) {
    if (hasWholesaleAccess(userData)) {
      orders.push(createOrderPayload(orderData, wholesaleItems, true));
    } else {
      throw new Error('You need wholesale access to order wholesale products');
    }
  }

  if (orders.length === 0) {
    throw new Error('No valid items in the order');
  }

  return orders;
};

/**
 * Get order type label for display
 * @param {string} orderType - Order type (retail/wholesale)
 * @returns {string} Formatted order type label
 */
export const getOrderTypeLabel = (orderType) => {
  const types = {
    retail: 'تجزئة',
    wholesale: 'جملة'
  };
  return types[orderType] || orderType;
};

/**
 * Get order status label for display
 * @param {string} status - Order status
 * @returns {Object} Status label and color
 */
export const getOrderStatusInfo = (status) => {
  const statuses = {
    pending: { label: 'قيد الانتظار', color: 'warning' },
    processing: { label: 'قيد المعالجة', color: 'info' },
    shipped: { label: 'تم الشحن', color: 'primary' },
    delivered: { label: 'تم التسليم', color: 'success' },
    cancelled: { label: 'ملغي', color: 'danger' },
    refunded: { label: 'تم الاسترجاع', color: 'secondary' }
  };
  
  return statuses[status] || { label: status, color: 'secondary' };
};
