import ApiService from "./api";
import { toast } from "react-hot-toast";
import { getErrorMessage } from "../utils/errorHandler";

// Log API configuration for debugging
console.log("🔧 Wholesale Service Configuration:", {
  baseURL: ApiService.baseURL,
  mode: import.meta.env.MODE,
  nodeEnv: import.meta.env.NODE_ENV,
});

// Helper function to handle API errors
const handleApiError = async (error, requestFn) => {
  console.error("API Error:", {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
  });

  // Handle authentication errors
  if (error.response?.status === 401) {
    try {
      // محاولة تحديث التوكن
      const newToken = await ApiService.refreshToken();
      if (newToken && requestFn) {
        // إعادة المحاولة بالتوكن الجديد
        return await requestFn();
      }
    } catch (refreshError) {
      console.error("Failed to refresh token:", refreshError);
      // في حالة فشل تحديث التوكن - مسح توكنات المسؤول فقط
      // wholesaleService يستخدم في لوحة التحكم فقط
      localStorage.removeItem('admin_auth_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('adminData');
      localStorage.removeItem('adminToken');
      
      console.log('✅ تم مسح توكنات المسؤول فقط - توكنات المستخدم العادي محفوظة');
      
      // تحديد صفحة تسجيل الدخول المناسبة
      const isAdminPanel = window.location.pathname.startsWith('/admin');
      const loginPath = isAdminPanel ? '/admin/login' : '/login';
      
      console.log(`🔄 إعادة توجيه إلى ${loginPath} بعد فشل تحديث التوكن`);
      window.location.href = loginPath;
    }
  }

  // Handle other error statuses
  const errorMessage = getErrorMessage(error, "حدث خطأ غير متوقع");
  toast.error(errorMessage, { id: "api-error" });
  throw new Error(errorMessage);
};

// Base URL is already set in ApiService, so we don't need to repeat /api/v1
const WHOLESALE_API_URL = "/wholesale";

const wholesaleService = {
  /**
   * Get all pending wholesale applications (admin only)
   * @returns {Promise<Array>} - List of pending wholesale applications
   */
  getWholesaleApplications: async (params = {}) => {
    console.log("🔍 جاري جلب طلبات الجملة المعلقة...", { params });

    try {
      // إعداد معلمات الطلب مع تجاوز التخزين المؤقت
      const requestParams = {
        status: "pending",
        limit: 1000,
        ...params, // السماح بتجاوز المعلمات الافتراضية
        _: params._t || Date.now(), // إضافة علامة زمنية فريدة
      };

      // طباعة معلومات التصحيح
      console.log("🔧 معلمات الطلب النهائية:", {
        url: "/admin/wholesale-requests",
        params: requestParams,
        hasAuthToken: !!localStorage.getItem("authToken"),
      });

      // إرسال الطلب مباشرة
      const response = await ApiService.get(
        "/admin/wholesale-requests",
        requestParams
      );

      // طباعة استجابة الخادم
      console.log("📦 استجابة الخادم:", {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
      });

      // استخراج البيانات من الاستجابة
      let requests = [];
      if (Array.isArray(response.data)) {
        requests = response.data;
      } else if (response.data?.data) {
        requests = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (response.data?.requests) {
        requests = Array.isArray(response.data.requests)
          ? response.data.requests
          : [];
      }

      // تنسيق البيانات
      const formattedRequests = requests.map((request) => ({
        id: request.id || "",
        userId: request.user_id || request.user?.id || "",
        userName: request.user?.full_name || request.full_name || "غير معروف",
        userEmail: request.user?.email || request.email || "",
        userPhone: request.user?.phone || request.phone || "",
        companyName: request.company_name || "غير محدد",
        status: request.status || "pending",
        createdAt: request.created_at || new Date().toISOString(),
        ...request,
        ...(request.user || {}),
      }));

      console.log(`✅ تم جلب ${formattedRequests.length} طلب جملة معلق`);
      return formattedRequests;
    } catch (error) {
      console.error("❌ فشل في جلب طلبات الجملة المعلقة:", error);
      return handleApiError(error, () =>
        wholesaleService.getWholesaleApplications(params)
      );
    }
  },

  /**
   * Get all wholesale customers (admin only)
   * @returns {Promise<Array>} - List of wholesale customers
   */
  getWholesaleCustomers: async (params = {}) => {
    console.log("🔍 Fetching wholesale customers...");

    try {
      // إعداد معلمات الطلب مع تجاوز التخزين المؤقت
      const requestParams = {
        limit: 1000,
        ...params, // السماح بتجاوز المعلمات الافتراضية
        _: params._t || Date.now(), // إضافة علامة زمنية فريدة
      };

      console.log("🔧 Request params:", {
        url: "/admin/wholesale-customers",
        params: requestParams,
      });

      const response = await ApiService.get("/admin/wholesale-customers", requestParams);

      console.log("📦 Server response:", {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
      });

      // Extract data from response
      let customers = [];
      if (response.data?.customers && Array.isArray(response.data.customers)) {
        customers = response.data.customers;
      } else if (Array.isArray(response.data)) {
        customers = response.data;
      } else if (response.data?.data) {
        customers = Array.isArray(response.data.data) ? response.data.data : [];
      }

      console.log('📄 Raw customer data:', JSON.stringify(customers, null, 2));

      // تنسيق البيانات
      const formattedCustomers = customers.map((customer) => ({
        id: customer.id || "",
        userId: customer.id || "", // للتوافق مع الكود الموجود
        full_name: customer.full_name || customer.FullName || "",
        userName: customer.full_name || customer.FullName || "", // للتوافق
        userEmail: customer.email || customer.Email || "",
        phone: customer.phone || customer.Phone || "",
        company_name: customer.company_name || customer.CompanyName || "",
        commercial_register: customer.commercial_register || customer.CommercialRegister || "",
        wholesale_access: customer.wholesale_access || customer.WholesaleAccess || false,
        account_type: customer.account_type || customer.AccountType || "retail",
        is_active: customer.is_active !== undefined ? customer.is_active : customer.IsActive !== undefined ? customer.IsActive : true,
        createdAt: customer.created_at || customer.CreatedAt || new Date().toISOString(),
        updatedAt: customer.updated_at || customer.UpdatedAt || new Date().toISOString(),
        // إضافة المستندات إذا كانت متوفرة
        documents: customer.documents || {
          id_document_url: customer.id_document_url || customer.id_document || "",
          commercial_document_url: customer.commercial_document_url || customer.commercial_document || ""
        }
      }));

      console.log(
        `✅ Fetched ${formattedCustomers.length} wholesale customers`
      );
      return formattedCustomers;
    } catch (error) {
      console.error("❌ Failed to fetch wholesale customers:", error);
      return handleApiError(error, () =>
        wholesaleService.getWholesaleCustomers(params)
      );
    }
  },

  /**
   * Upgrade user account to wholesale
   * @param {FormData} formData - Form data including company details and files
   * @returns {Promise<Object>} - Response data
   */
  /**
   * تحقق من حجم الملف قبل الرفع
   */
  validateFileSize(file, maxSizeMB = 2) {
    if (!file) return true;
    const maxSize = maxSizeMB * 1024 * 1024; // تحويل إلى بايت
    if (file.size > maxSize) {
      throw new Error(
        `حجم الملف ${file.name} كبير جداً. الحد الأقصى ${maxSizeMB} ميجابايت`
      );
    }
    return true;
  },

  /**
   * ضغط الصورة قبل الرفع
   */
  async compressImage(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve) => {
      if (!file.type.match("image.*")) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // تغيير الحجم إذا كان أكبر من الحد الأقصى
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // تحويل إلى ملف مع الحفاظ على نفس النوع
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * إرسال طلب الترقية بحساب الجملة
   */
  async submitUpgradeRequest(formData) {
    console.log("📝 بدء تقديم طلب الترقية...", formData);

    try {
      // Log the incoming form data for debugging
      console.log("📋 FormData received:", formData);

      // Check if formData is actually a FormData instance
      if (!(formData instanceof FormData)) {
        const error = new Error("نوع البيانات غير صالح. يرجى إعادة المحاولة.");
        error.validationError = true;
        throw error;
      }

      // Log FormData entries
      console.log("📝 FormData entries:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      // Check for required fields
      const companyName = formData.get("company_name");
      const commercialRegisterNum = formData.get("commercial_register");
      const idDocument = formData.get("id_document");
      const commercialDoc = formData.get("commercial_document");

      if (!companyName || !commercialRegisterNum) {
        const error = new Error("الرجاء إدخال جميع الحقول المطلوبة");
        error.validationError = true;
        throw error;
      }

      if (!idDocument || (idDocument instanceof File && !idDocument.name)) {
        const error = new Error("الرجاء إرفاق صورة الهوية");
        error.validationError = true;
        throw error;
      }

      if (
        !commercialDoc ||
        (commercialDoc instanceof File && !commercialDoc.name)
      ) {
        const error = new Error("الرجاء إرفاق صورة السجل التجاري");
        error.validationError = true;
        throw error;
      }

      // Validate file sizes (if they exist as Files)
      if (idDocument instanceof File) {
        this.validateFileSize(idDocument);
      }

      if (commercialDoc instanceof File) {
        this.validateFileSize(commercialDoc);
      }

      // Log the request payload
      console.log("📤 إرسال طلب الترقية إلى الخادم...", {
        company_name: companyName,
        commercial_register: commercialRegisterNum,
        has_id_document: !!(idDocument && idDocument.name),
        has_commercial_document: !!(commercialDoc && commercialDoc.name),
      });

      // Send the request with proper headers
      const response = await ApiService.post(
        "/wholesale/requests",
        formData,
        true
      );

      console.log("✅ تم إرسال طلب الترقية بنجاح:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ فشل إرسال طلب الترجية:", error);

      let errorMessage = "حدث خطأ أثناء محاولة إرسال طلب الترقية";
      let validationErrors = {};

      if (error.response) {
        console.error("❌ استجابة خطأ من الخادم:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });

        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMessage = "بيانات غير صالحة. يرجى التحقق من الحقول المطلوبة";
          if (error.response.data?.errors) {
            validationErrors = error.response.data.errors.reduce((acc, err) => {
              const field = err.field || "form";
              acc[field] = acc[field] || [];
              acc[field].push(err.message);
              return acc;
            }, {});
          }
        } else if (error.response.status === 401) {
          errorMessage = "يجب تسجيل الدخول أولاً";
        } else if (error.response.status === 404) {
          errorMessage = "مسار API غير موجود. يرجى الاتصال بالدعم الفني";
        } else if (error.response.status === 409) {
          console.warn("⚠️ تم العثور على طلب سابق، ولكن سيتم المتابعة...");
          // تجاهل الخطأ والمتابعة
          return error.response.data || { status: "pending" };
        } else if (error.response.status >= 500) {
          errorMessage = "حدث خطأ في الخادم. يرجى المحاولة لاحقاً";
        }
      } else if (error.request) {
        errorMessage = "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت";
      } else {
        errorMessage = error.message || errorMessage;
      }

      const errorToThrow = new Error(errorMessage);
      errorToThrow.validationErrors = validationErrors;
      throw errorToThrow;
    }
  },

  /**
   * Get current user's wholesale request status
   * @returns {Promise<Object>} - Wholesale request status and details
   */
  getMyWholesaleRequest: async () => {
    console.log("🔍 جاري التحقق من حالة الطلب...");

    // If we're in development mode, return a mock response
    if (import.meta.env.MODE === "development") {
      console.log("🛠️ Development mode: Returning mock wholesale request data");
      return { status: "not_found" }; // or 'pending', 'approved', 'rejected' for testing
    }

    try {
      // Try the endpoint without /my first
      const response = await ApiService.get(`/wholesale/requests`);

      console.log("✅ تم جلب حالة الطلب بنجاح:", response.data);

      // If we got an array, return the first request or not_found
      if (Array.isArray(response.data)) {
        return response.data[0] || { status: "not_found" };
      }

      // If we got a single object with status
      if (response.data && response.data.status) {
        return response.data;
      }

      // If no valid status, treat as no request found
      return { status: "not_found" };
    } catch (error) {
      // Handle 404 specifically
      if (error.response?.status === 404) {
        console.log("ℹ️ لا توجد طلبات جملة سابقة");
        return { status: "not_found" };
      }

      console.error("❌ فشل جلب حالة الطلب:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      // For any other error, still return not_found to prevent showing "under review" state
      return { status: "not_found" };
    }
  },

  /**
   * Get all wholesale requests (admin only)
   * @param {Object} params - Query parameters (page, limit, status, etc.)
   * @returns {Promise<Object>} - Paginated list of wholesale requests
   */
  getWholesaleRequests: async (params = {}) => {
    console.log("🔍 Fetching wholesale requests with params:", params);

    try {
      // Show loading indicator
      const loadingToast = toast.loading("جاري تحميل طلبات الجملة...");

      // إضافة علامة زمنية فريدة لتجنب التخزين المؤقت
      const requestParams = {
        ...params,
        _t: Date.now(), // Always include timestamp to prevent caching
        _cache: "no-cache", // Explicitly disable cache
      };

      const response = await ApiService.get(
        "/admin/wholesale-requests",
        requestParams
      );

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      const requests = response.data || [];
      console.log(`✅ Fetched ${requests.length} wholesale requests`);

      return response;
    } catch (error) {
      console.error("❌ Failed to fetch wholesale requests:", error);
      toast.dismiss(); // Dismiss any active toasts
      return handleApiError(error, () =>
        wholesaleService.getWholesaleRequests(params)
      );
    }
  },

  /**
   * Get wholesale request details by ID (admin only)
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} - Wholesale request details
   */
  getWholesaleRequestById: async (requestId) => {
    if (!requestId) {
      throw new Error("معرف الطلب مطلوب");
    }

    console.log(`🔍 Fetching wholesale request ${requestId}...`);

    try {
      const response = await ApiService.get(
        `/admin/wholesale-requests/${requestId}`
      );

      console.log(`✅ Fetched wholesale request ${requestId}:`, response);
      return response;
    } catch (error) {
      console.error(
        `❌ Failed to fetch wholesale request ${requestId}:`,
        error
      );
      return handleApiError(error, () =>
        wholesaleService.getWholesaleRequestById(requestId)
      );
    }
  },

  /**
   * Update wholesale request status (admin only)
   * @param {string} requestId - Request ID
   * @param {string} status - New status ('approved' or 'rejected')
   * @param {string} [rejectionReason] - Reason for rejection (required if status is 'rejected')
   * @returns {Promise<Object>} - Updated request
   */
  updateRequestStatus: async (requestId, status, rejectionReason = "") => {
    console.log('🔍 Starting updateRequestStatus with params:', { requestId, status, rejectionReason });
    
    if (!requestId) {
      const error = new Error("معرف الطلب مطلوب");
      console.error('❌ Validation error:', error.message);
      throw error;
    }

    if (!status) {
      const error = new Error("حالة الطلب مطلوبة");
      console.error('❌ Validation error:', error.message);
      throw error;
    }

    console.log(`🔄 Updating request ${requestId} status to ${status}...`);

    try {
      // Use the correct endpoint path - remove the duplicate /api/v1 prefix
      const endpoint = `/admin/wholesale-requests/${requestId}/status`;
      console.log('📤 Sending request to endpoint:', endpoint);
      console.log('📝 Request payload:', { status, rejection_reason: rejectionReason });

      const response = await ApiService.put(endpoint, { 
        status, 
        rejection_reason: rejectionReason 
      });
      
      console.log(`✅ Successfully updated request ${requestId} status to ${status}`);
      console.log('📥 Server response:', response);

      if (!response) {
        console.warn('⚠️ Response data is empty or malformed:', response);
        throw new Error('استجابة غير صالحة من الخادم');
      }

      // Show success message
      const message = status === 'approved' 
        ? 'تم قبول الطلب بنجاح' 
        : 'تم رفض الطلب بنجاح';
      
      toast.success(message, { 
        duration: 5000,
        id: `wholesale-request-${requestId}-${status}`
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to update request ${requestId} status to ${status}:`, error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      let errorMessage = 'فشل في تحديث حالة الطلب';
      
      if (error.response?.status === 404) {
        errorMessage = 'الطلب غير موجود أو تم حذفه';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'بيانات الطلب غير صالحة';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        id: `error-wholesale-request-${requestId}-${status}`,
        duration: 5000
      });
      
      throw error;
    }
  },

  /**
   * Download a document related to a wholesale request
   * @param {string} documentUrl - URL or path to the document
   * @returns {Promise<Blob>} - The document file as a Blob
   */
  downloadDocument: async (documentUrl) => {
    if (!documentUrl) {
      throw new Error("رابط المستند مطلوب");
    }

    console.log(`📥 Downloading document: ${documentUrl}`);

    try {
      const response = await ApiService.get(documentUrl);

      return response.data;
    } catch (error) {
      console.error(`❌ Failed to download document ${documentUrl}:`, error);
      return handleApiError(error, () =>
        wholesaleService.downloadDocument(documentUrl)
      );
    }
  },

  /**
   * Approve wholesale upgrade request (admin only)
   * @param {string} requestId - Request ID (should be the request_id, not user_id)
   * @returns {Promise<Object>} - Updated request
   */
  approveWholesaleUpgrade: async (requestId) => {
    console.log(`🔍 [wholesaleService] Starting approveWholesaleUpgrade for request ID: ${requestId}`);
    
    if (!requestId) {
      const error = new Error("معرف الطلب مطلوب");
      console.error('❌ [wholesaleService] Validation error: Request ID is required');
      throw error;
    }

    // Validate the request ID format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
      const error = new Error(`معرف الطلب غير صالح: ${requestId}. يجب أن يكون معرف الطلب بتنسيق UUID صالح.`);
      console.error('❌ [wholesaleService] Invalid request ID format:', requestId);
      throw error;
    }

    console.log(`🔄 [wholesaleService] Approving wholesale upgrade request ID: ${requestId}`);

    try {
      // Show loading toast
      const loadingToast = toast.loading("جاري الموافقة على طلب الترقية...");

      console.log(`🌐 [wholesaleService] Sending PUT request to: /admin/wholesale-requests/${requestId}/status`);
      const response = await ApiService.put(`/admin/wholesale-requests/${requestId}/status`, {
        status: 'approved',
        rejection_reason: ''
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      console.log(`✅ [wholesaleService] Successfully approved wholesale upgrade request ID: ${requestId}`);
      console.log('📥 [wholesaleService] Server response:', {
        status: response?.status,
        data: response?.data
      });

      if (!response || !response.data) {
        console.warn('⚠️ [wholesaleService] Response data is empty or malformed:', response);
        throw new Error('استجابة غير صالحة من الخادم');
      }

      // Show success message
      toast.success("تمت الموافقة على طلب الترجية بنجاح", { 
        duration: 5000,
        id: `wholesale-approve-${requestId}`
      });

      // Emit an event to notify about the upgrade
      window.dispatchEvent(
        new CustomEvent('wholesaleUpgradeApproved', {
          detail: { 
            userId: response.data?.user_id || response.data?.userId,
            requestId: requestId 
          }
        })
      );

      console.log('✅ [wholesaleService] Dispatched wholesaleUpgradeApproved event');
      return response.data;
    } catch (error) {
      console.error(`❌ [wholesaleService] Failed to approve wholesale upgrade request ID: ${requestId}`, error);
      
      // Log detailed error information
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
        requestConfig: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      };
      
      console.error('🔍 [wholesaleService] Error details:', JSON.stringify(errorDetails, null, 2));
      
      // Dismiss any active toasts
      toast.dismiss();
      
      // Handle specific error cases with more detailed messages
      let errorMessage = 'حدث خطأ غير متوقع';
      let shouldRetry = false;
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 401) {
          errorMessage = 'انتهت جلسة المسؤول. يرجى تسجيل الدخول مرة أخرى';
        } else if (error.response.status === 403) {
          errorMessage = 'ليس لديك صلاحيات الموافقة على طلبات الترقية';
        } else if (error.response.status === 404) {
          errorMessage = 'الطلب غير موجود أو تم حذفه';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'بيانات الطلب غير صالحة';
          
          // Check for specific validation errors
          if (error.response.data?.errors) {
            const validationErrors = Object.values(error.response.data.errors).flat();
            errorMessage = `خطأ في التحقق من صحة البيانات: ${validationErrors.join(', ')}`;
          }
        } else if (error.response.status === 409) {
          errorMessage = 'تمت معالجة هذا الطلب مسبقاً';
        } else if (error.response.status >= 500) {
          errorMessage = 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً';
          shouldRetry = true;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'لم يتم استلام رد من الخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى';
        shouldRetry = true;
      } else if (error.message) {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `خطأ في إرسال الطلب: ${error.message}`;
      }
      
      // Show error toast
      toast.error(`فشل في الموافقة على طلب الترقية: ${errorMessage}`, {
        id: `error-wholesale-approve-${requestId}`,
        duration: 5000
      });
      
      // Enhance the error with more context before re-throwing
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      enhancedError.requestId = requestId;
      enhancedError.shouldRetry = shouldRetry;
      
      throw enhancedError;
    }
  },
  /**
   * Delete a wholesale request (admin only)
   * @param {string} requestId - The ID of the request to delete
   * @returns {Promise<Object>} - The deleted request
   */
  async deleteWholesaleRequest(requestId) {
    console.log(`🗑️ Deleting wholesale request with ID: ${requestId}`);
    
    if (!requestId) {
      throw new Error('معرف الطلب غير صالح');
    }

    try {
      const response = await ApiService.delete(`/admin/wholesale-requests/${requestId}`);
      console.log('✅ Successfully deleted wholesale request:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting wholesale request:', error);
      throw error;
    }
  }
};

export default wholesaleService;
