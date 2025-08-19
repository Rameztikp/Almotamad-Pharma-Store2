import { toast } from 'react-hot-toast';
import { updateProductStatus } from '../services/productService';

// Constants for product types and actions
export const PRODUCT_TYPES = {
  RETAIL: 'retail',
  WHOLESALE: 'wholesale'
};

export const PRODUCT_ACTIONS = {
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish'
};

/**
 * Checks if a product is published in the wholesale section
 * @param {Object} product - The product to check
 * @returns {boolean} - True if the product is published in wholesale, false otherwise
 */
export const isWholesaleProductPublished = (product) => {
  if (!product) return false;
  
  // Check if it's a wholesale product
  const isWholesale = product.type === 'wholesale' || 
                     product.product_type === 'wholesale' || 
                     product.is_wholesale === true ||
                     product.attributes?.is_wholesale === true;
  
  if (!isWholesale) return false;
  
  // Check direct published flags
  if (product.published_wholesale === true || 
      product.is_published_wholesale === true ||
      product.published === true) {
    return true;
  }
  
  // Check status field
  if (product.status === 'published') {
    return true;
  }
  
  // Check published_at date if it exists
  if (product.published_at) {
    try {
      const publishedDate = new Date(product.published_at);
      if (!isNaN(publishedDate.getTime()) && publishedDate <= new Date()) {
        return true;
      }
    } catch (e) {
      console.warn('Invalid published_at date:', product.published_at);
    }
  }
  
  // Check if it has a valid stock quantity
  const stock = product.stock_quantity ?? product.stock ?? 0;
  if (stock <= 0 && !product.allow_out_of_stock) {
    return false;
  }
  
  // Default to not published if no other indicators found
  return false;
};

/**
 * Checks if a product is published in retail
 * @param {Object} product - The product to check
 * @returns {boolean} - True if the product is published in retail
 */
export const isRetailProductPublished = (product) => {
  if (!product) return false;
  
  // Check if it's explicitly marked as published in retail
  if (product.published_retail === true) return true;
  if (product.is_published_retail === true) return true;
  
  // Check if it's a retail product with explicit published status
  if (product.type === 'retail' && product.status === 'published') return true;
  
  // Check if it has a published_at date in the past
  if (product.published_at) {
    try {
      const publishedDate = new Date(product.published_at);
      if (!isNaN(publishedDate.getTime()) && publishedDate <= new Date()) {
        return true;
      }
    } catch (e) {
      console.warn('Invalid published_at date:', product.published_at);
    }
  }
  
  // Check if the product exists in the published retail store
  if (product.published_in_retail === true) return true;
  
  // Default to not published
  return false;
};

/**
 * Checks if a product is published (supports both retail and wholesale)
 * @param {Object} product - The product to check
 * @param {string} [type] - Optional: 'retail' or 'wholesale' to check specific type
 * @returns {boolean} - True if the product is published in the specified type (or any if not specified)
 */
export const isProductPublished = (product, type) => {
  if (!product) return false;
  
  if (type === 'retail') {
    return isRetailProductPublished(product);
  } else if (type === 'wholesale') {
    return isWholesaleProductPublished(product);
  }
  
  // If no type specified, check if published in either
  return isRetailProductPublished(product) || isWholesaleProductPublished(product);
};

/**
 * Handles product publishing with proper validation and feedback
 * @param {string} productId - The ID of the product to publish
 * @param {string} type - The type of publication ('retail' or 'wholesale')
 * @param {Function} updateState - Function to update the component's state
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const handleProductPublish = async (productId, type, updateState) => {
  // Validate input
  if (!productId || !['retail', 'wholesale'].includes(type)) {
    const errorMsg = 'معلمات غير صالحة لنشر المنتج';
    console.error('Invalid parameters for handleProductPublish:', { productId, type });
    showToast(`❌ ${errorMsg}`, 'error');
    return false;
  }

  const operationId = `publish-${productId}-${Date.now()}`;
  console.log(`[${operationId}] Starting publish for ${type} product ${productId}`);

  try {
    // Prepare optimistic update data
    const optimisticUpdate = {
      id: productId,
      is_published: true,
      status: 'active',
      is_active: true,
      published_at: new Date().toISOString(),
      _optimistic: true,
      _operationId: operationId,
      ...(type === 'wholesale' 
        ? { 
            is_published_wholesale: true,
            published_wholesale: true
          } 
        : {
            is_published_retail: true,
            published_retail: true
          })
    };

    // Update UI optimistically
    if (updateState) {
      console.log(`[${operationId}] Updating UI optimistically for publish...`);
      updateProductState(productId, type, 'publish', updateState, optimisticUpdate);
    }
    
    // 1. If publishing wholesale, also ensure retail version is published
    if (type === 'wholesale') {
      try {
        console.log(`[${operationId}] Checking retail version status...`);
        const freshProduct = await productService.getProduct(productId);
        const isRetailPublished = isProductPublished(freshProduct, 'retail');
        
        if (!isRetailPublished) {
          console.log(`[${operationId}] Publishing retail version of wholesale product...`);
          const retailResult = await updateProductStatus(productId, 'retail', 'publish');
          
          if (retailResult?.success) {
            console.log(`[${operationId}] Retail version published successfully`);
            // Update local state for retail
            if (updateState) {
              updateProductState(
                productId, 
                'retail', 
                'publish', 
                updateState, 
                {
                  ...retailResult.data,
                  _operationId: operationId,
                  _fromWholesalePublish: true
                }
              );
            }
          } else {
            console.warn(`[${operationId}] Failed to publish retail version:`, retailResult);
            // Continue with wholesale publish anyway
          }
        } else {
          console.log(`[${operationId}] Retail version already published`);
        }
      } catch (error) {
        console.error(`[${operationId}] Error publishing retail version:`, error);
        // Continue with wholesale publish anyway
      }
    }
    
    // 2. Publish the requested type using the new updateProductStatus function
    console.log(`[${operationId}] Publishing ${type} version of product ${productId}...`);
    const result = await updateProductStatus(productId, type, 'publish');
    
    if (result?.success || result?.status === 200) {
      const message = type === 'wholesale'
        ? '✅ تم نشر المنتج في واجهة الجملة بنجاح'
        : '✅ تم نشر المنتج في الواجهة القطاعية بنجاح';
      
      console.log(`[${operationId}] Publish successful:`, message);
      showToast(message, 'success');
      
      // Update local state with the actual response
      if (updateState) {
        updateProductState(
          productId, 
          type, 
          'publish', 
          updateState, 
          {
            ...(result.data || result),
            // Ensure these fields are set correctly
            is_published: true,
            status: 'active',
            is_active: true,
            _optimistic: false,
            _operationId: operationId
          }
        );
      }
      
      return true;
    }
    
    // If we get here, the request failed but didn't throw an error
    const errorMsg = result?.message || 'فشل في نشر المنتج';
    console.error(`[${operationId}] Publish failed:`, errorMsg, result);
    
    // Revert the optimistic update
    if (updateState) {
      console.log(`[${operationId}] Reverting optimistic update due to failure...`);
      updateProductState(productId, type, 'unpublish', updateState);
    }
    
    throw new Error(errorMsg);
    
  } catch (error) {
    console.error(`[${operationId}] Error in handleProductPublish:`, {
      error: error.toString(),
      stack: error.stack,
      response: error.response?.data
    });
    
    // Revert the optimistic update
    if (updateState) {
      console.log(`[${operationId}] Reverting optimistic update due to error...`);
      updateProductState(productId, type, 'unpublish', updateState);
    }
    
    // Show error message
    let errorMessage = 'حدث خطأ أثناء محاولة نشر المنتج';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Handle specific error statuses
    if (error.response) {
      switch (error.response.status) {
        case 401:
          errorMessage = 'غير مصرح لك بهذا الإجراء. يرجى تسجيل الدخول';
          break;
        case 403:
          errorMessage = 'ليس لديك صلاحية لنشر المنتج';
          break;
        case 404:
          errorMessage = 'المنتج غير موجود';
          break;
        case 409:
          errorMessage = 'تعارض في حالة المنتج. يرجى تحديث الصفحة والمحاولة مرة أخرى';
          break;
        default:
          errorMessage = error.response.data?.message || 'حدث خطأ في الخادم';
      }
    } else {
      errorMessage = error.message || 'حدث خطأ أثناء محاولة نشر المنتج';
    }
    
    showToast(`❌ ${errorMessage}`, 'error');
    return false;
  }
};

/**
 * Updates the local state after a publish/unpublish action
 * @param {string} productId - The ID of the product
 * @param {string} type - The product type ('retail' or 'wholesale')
 * @param {string} action - The action performed ('publish' or 'unpublish')
 * @param {Function} updateState - Function to update the component's state
 * @param {Object} [productData] - Optional product data from the server response
 */
const updateProductState = (productId, type, action, updateState, productData = null) => {
  if (!updateState) return;
  
  console.log(`[updateProductState] Updating product ${productId} (${type}), action: ${action}`, { productData });
  
  updateState(prevProducts => {
    const updatedProducts = prevProducts.map(p => {
      if (p.id === productId) {
        // If we have product data from the server, use that
        if (productData) {
          console.log(`[updateProductState] Using server data for product ${productId}`, productData);
          return { 
            ...p, 
            ...productData,
            // Ensure critical fields are set correctly
            is_active: productData.is_active !== undefined ? productData.is_active : p.is_active,
            is_published: productData.is_published !== undefined ? productData.is_published : p.is_published,
            status: productData.status || p.status,
            updated_at: new Date().toISOString()
          };
        }
        
        // Otherwise, update the state optimistically
        const isPublish = action === 'publish' || action === PRODUCT_ACTIONS.PUBLISH;
        const isWholesale = type === PRODUCT_TYPES.WHOLESALE;
        
        console.log(`[updateProductState] Optimistic update for ${productId}:`, { isPublish, isWholesale });
        
        // Create the updates object
        const updates = {
          updated_at: new Date().toISOString(),
          // Only update is_active if we're publishing
          is_active: isPublish ? true : p.is_active,
          // Set the main published flag
          is_published: isPublish,
          // Set the status based on the action
          status: isPublish ? 'active' : 'inactive',
          // Clear the published_at timestamp if unpublishing
          ...(!isPublish && { published_at: null })
        };
        
        // Add type-specific fields
        if (isWholesale) {
          updates.is_published_wholesale = isPublish;
          updates.published_wholesale = isPublish;
          // Preserve retail status
          if (p.is_published_retail !== undefined) {
            updates.is_published_retail = p.is_published_retail;
            updates.published_retail = p.published_retail;
          }
        } else {
          updates.is_published_retail = isPublish;
          updates.published_retail = isPublish;
          // Preserve wholesale status
          if (p.is_published_wholesale !== undefined) {
            updates.is_published_wholesale = p.is_published_wholesale;
            updates.published_wholesale = p.published_wholesale;
          }
        }
        
        console.log(`[updateProductState] Applying updates to product ${productId}:`, updates);
        return { ...p, ...updates };
      }
      return p;
    });
    
    console.log(`[updateProductState] Updated products list:`, updatedProducts);
    return updatedProducts;
  });
};

/**
 * Handles product unpublishing with proper validation and feedback
 * @param {string} productId - The ID of the product to unpublish
 * @param {string} type - The type of product ('retail' or 'wholesale')
 * @param {Function} updateState - Function to update the component's state
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
/**
 * Handles product unpublishing with proper validation and feedback
 * @param {string} productId - The ID of the product to unpublish
 * @param {string} type - The type of product ('retail' or 'wholesale')
 * @param {Function} updateState - Function to update the component's state
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const handleProductUnpublish = async (productId, type, updateState) => {
  // Validate input
  if (!productId) {
    console.error('Product ID is required for unpublishing');
    showToast('❌ معرف المنتج مطلوب', 'error');
    return false;
  }
  
  if (!['retail', 'wholesale'].includes(type)) {
    const errorMsg = `نوع المنتج غير صالح: ${type}. يجب أن يكون إما retail أو wholesale`;
    console.error(errorMsg);
    showToast(`❌ ${errorMsg}`, 'error');
    return false;
  }

  try {
    console.log(`[${new Date().toISOString()}] Initiating unpublish for ${type} product ${productId}...`);
    
    // Create a timestamp for this operation
    const operationId = `unpublish-${productId}-${Date.now()}`;
    console.log(`Starting operation ${operationId}`);
    
    // Prepare the product data for optimistic update
    const optimisticUpdate = {
      id: productId,
      is_published: false,
      published_at: null,
      status: 'inactive',
      is_active: false,
      last_updated: new Date().toISOString(),
      _optimistic: true,
      _operationId: operationId
    };
    
    // Update UI optimistically
    if (updateState) {
      console.log('Updating UI optimistically for unpublish...');
      updateProductState(productId, type, 'unpublish', updateState, optimisticUpdate);
    }
    
    console.log(`Calling updateProductStatus with:`, { 
      productId, 
      type, 
      action: 'unpublish',
      operationId
    });
    
    try {
      // 1. Try to unpublish the product using the new updateProductStatus function
      const result = await updateProductStatus(productId, type, 'unpublish');
      console.log('updateProductStatus response:', { 
        operationId,
        result 
      });
      
      // 2. Handle response
      if (result && (result.success || result.status === 200)) {
        let message;
        let isAlreadyUnpublished = false;
        
        // Check if product was already unpublished
        if (result.alreadyUnpublished || result.already_unpublished) {
          isAlreadyUnpublished = true;
          message = type === 'wholesale' 
            ? '⚠️ المنتج غير منشور مسبقاً في واجهة الجملة'
            : '⚠️ المنتج غير منشور مسبقاً في الواجهة القطاعية';
          
          console.log(`[${operationId}] Product was already unpublished`);
          showToast(message, 'info');
        } else {
          message = type === 'wholesale'
            ? '✅ تم إلغاء نشر المنتج من واجهة الجملة بنجاح'
            : '✅ تم إلغاء نشر المنتج من الواجهة القطاعية بنجاح';
          
          console.log(`[${operationId}] Product unpublished successfully`);
          showToast(message, 'success');
        }
        
        // 3. Update local state with the actual response
        if (updateState) {
          console.log(`[${operationId}] Updating local state with server response...`);
          updateProductState(
            productId, 
            type, 
            'unpublish', 
            updateState, 
            {
              ...(result.data || result),
              // Ensure these fields are set correctly
              is_published: false,
              status: 'inactive',
              is_active: false,
              _optimistic: false,
              _operationId: operationId
            }
          );
        }
        
        return true;
      }
      
      // If we get here, the request failed but didn't throw an error
      const errorMsg = result?.message || 'فشل في إلغاء نشر المنتج';
      console.error(`[${operationId}] Unpublish failed:`, errorMsg, result);
      
      throw new Error(errorMsg);
      
    } catch (apiError) {
      console.error(`[${operationId}] Error in updateProductStatus:`, {
        error: apiError.toString(),
        stack: apiError.stack,
        response: apiError.response?.data
      });
      
      // Re-throw the error to be caught by the outer catch
      throw apiError;
    }
    
  } catch (error) {
    console.error(`Error in handleProductUnpublish for product ${productId}:`, {
      error: error.toString(),
      stack: error.stack,
      response: error.response?.data 
    });
    
    // Revert the optimistic update
    if (updateState) {
      console.log('Reverting optimistic update due to error...');
      updateProductState(productId, type, 'publish', updateState);
    }
    
    // Improved error handling with specific messages
    let errorMessage = 'حدث خطأ أثناء محاولة إلغاء نشر المنتج';
    
    if (error.response) {
      console.error('Error response details:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      switch (error.response.status) {
        case 400:
          errorMessage = 'بيانات غير صالحة. يرجى التحقق من المدخلات';
          if (error.response.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          }
          break;
        case 401:
          errorMessage = 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى';
          // Optionally redirect to login
          // window.location.href = '/login';
          break;
        case 403:
          errorMessage = 'ليس لديك صلاحية لإلغاء نشر المنتج';
          break;
        case 404:
          errorMessage = 'المنتج غير موجود';
          break;
        case 409:
          errorMessage = 'تعارض في حالة المنتج. يرجى تحديث الصفحة والمحاولة مرة أخرى';
          break;
        case 500:
          errorMessage = 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً';
          break;
        default:
          if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data?.error) {
            errorMessage = error.response.data.error;
          }
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      errorMessage = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('Showing error to user:', errorMessage);
    showToast(`❌ ${errorMessage}`, 'error');
    return false;
  }
};

/**
 * Shows a toast notification with consistent styling
 * @param {string} message - The message to display
 * @param {'success'|'error'|'warning'} type - The type of toast
 */
const showToast = (message, type = 'success') => {
  const baseStyle = {
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    direction: 'rtl',
    textAlign: 'center',
  };

  const typeStyles = {
    success: {
      background: '#f0fdf4',
      color: '#166534',
      border: '1px solid #86efac',
    },
    error: {
      background: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fca5a5',
    },
    warning: {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fcd34d',
    },
  };

  toast(message, {
    position: 'top-center',
    duration: 5000,
    style: {
      ...baseStyle,
      ...typeStyles[type],
    },
  });
};
