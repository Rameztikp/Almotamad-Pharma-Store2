/**
 * Error handler utility for API responses
 * Provides consistent error messages in Arabic
 */

/**
 * Get a user-friendly error message based on the error object
 * @param {Error|Object} error - The error object from axios or fetch
 * @param {string} defaultMessage - Default message to return if no specific message can be determined
 * @returns {string} - User-friendly error message in Arabic
 */
export const getErrorMessage = (error, defaultMessage = 'حدث خطأ غير متوقع') => {
  // Handle network errors (no response from server)
  if (!error.response) {
    if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى';
    }
    
    // Something happened in setting up the request
    console.error('Request setup error:', error.message);
    return 'حدث خطأ أثناء إعداد الطلب. يرجى المحاولة مرة أخرى';
  }

  // Handle HTTP error status codes
  const { status, data } = error.response;
  
  // Log the error details for debugging
  console.error(`API Error ${status}:`, {
    status,
    message: error.message,
    responseData: data,
    url: error.config?.url
  });

  // Handle specific status codes with custom messages
  switch (status) {
    case 400:
      // Bad Request - Validation errors
      if (data?.errors) {
        // Handle validation errors
        const errorMessages = Object.values(data.errors).flat();
        return errorMessages.join('\n') || 'بيانات غير صالحة';
      }
      return data?.message || 'بيانات الطلب غير صحيحة';
      
    case 401:
      // Unauthorized
      return 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى';
      
    case 403:
      // Forbidden
      return 'غير مصرح لك بالوصول إلى هذا المورد';
      
    case 404:
      // Not Found
      return 'لم يتم العثور على المورد المطلوب';
      
    case 409:
      // Conflict - Duplicate entry, resource conflict, etc.
      return data?.message || 'تعارض في البيانات. قد يكون السجل موجوداً مسبقاً';
      
    case 422:
      // Unprocessable Entity - Validation errors
      if (data?.errors) {
        const errorMessages = Object.values(data.errors).flat();
        return errorMessages.join('\n') || 'بيانات غير صالحة';
      }
      return 'بيانات الطلب غير صالحة';
      
    case 429:
      // Too Many Requests
      return 'لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة لاحقاً';
      
    case 500:
      // Internal Server Error
      return 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً';
      
    case 502:
    case 503:
    case 504:
      // Bad Gateway, Service Unavailable, Gateway Timeout
      return 'الخدمة غير متوفرة حالياً. يرجى المحاولة مرة أخرى لاحقاً';
      
    default:
      // For any other status codes, return the default message
      return data?.message || defaultMessage;
  }
};

/**
 * Handle API errors and show appropriate toast notifications
 * @param {Error} error - The error object
 * @param {string} defaultMessage - Default message to show if no specific message can be determined
 * @param {Object} options - Additional options
 * @param {boolean} options.showToast - Whether to show a toast notification (default: true)
 * @param {boolean} options.redirectToLogin - Whether to redirect to login on 401 (default: true)
 * @returns {string} - The error message
 */
export const handleApiError = (error, defaultMessage = 'حدث خطأ', options = {}) => {
  const {
    showToast = true,
    redirectToLogin = true,
    toastId = 'api-error'
  } = options;
  
  const message = getErrorMessage(error, defaultMessage);
  
  // Show toast notification if enabled
  if (showToast) {
    import('react-hot-toast').then(({ default: toast }) => {
      toast.error(message, { id: toastId, duration: 5000 });
    }).catch(err => {
      console.error('Failed to load toast:', err);
    });
  }
  
  // Handle authentication errors
  if (error.response?.status === 401 && redirectToLogin) {
    // Clear any existing auth data
    import('../services/authService').then(({authService}) => {
      if (authService.clearAuthData) {
        authService.clearAuthData();
      }
      
      // إعادة توجيه ذكية بعد تأخير قصير
      setTimeout(() => {
        const isAdminPanel = window.location.pathname.startsWith('/admin');
        const loginPath = isAdminPanel ? '/admin/login' : '/login';
        console.log(`🔄 إعادة توجيه إلى ${loginPath}`);
        window.location.href = loginPath;
      }, 2000);
    }).catch(err => {
      console.error('Failed to load auth service:', err);
      // إعادة توجيه ذكية حتى لو فشل تحميل خدمة المصادقة
      setTimeout(() => {
        const isAdminPanel = window.location.pathname.startsWith('/admin');
        const loginPath = isAdminPanel ? '/admin/login' : '/login';
        console.log(`🔄 إعادة توجيه إلى ${loginPath} بعد فشل تحميل خدمة المصادقة`);
        window.location.href = loginPath;
      }, 2000);
    });
  }
  
  return message;
};

/**
 * Handle form validation errors
 * @param {Object} errors - The errors object from form validation
 * @returns {Object} - Formatted errors object
 */
export const formatValidationErrors = (errors) => {
  if (!errors) return {};
  
  const formattedErrors = {};
  
  // Handle different error formats
  if (Array.isArray(errors)) {
    // Handle array of errors
    errors.forEach(error => {
      if (error.field) {
        formattedErrors[error.field] = error.message;
      }
    });
  } else if (typeof errors === 'object') {
    // Handle object with field names as keys
    Object.entries(errors).forEach(([field, messages]) => {
      if (Array.isArray(messages)) {
        formattedErrors[field] = messages.join('\n');
      } else if (typeof messages === 'string') {
        formattedErrors[field] = messages;
      }
    });
  }
  
  return formattedErrors;
};

/**
 * Check if the error is a network error
 * @param {Error} error - The error object
 * @returns {boolean} - True if it's a network error
 */
export const isNetworkError = (error) => {
  return !error.response && error.request;
};

/**
 * Check if the error is a timeout error
 * @param {Error} error - The error object
 * @returns {boolean} - True if it's a timeout error
 */
export const isTimeoutError = (error) => {
  return error.code === 'ECONNABORTED' || error.message?.includes('timeout');
};
