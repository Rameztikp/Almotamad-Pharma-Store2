import { adminApi } from './adminApi';

export const customerService = {
  // جلب قائمة العملاء مع إمكانية التصفية والترتيب
  async getCustomers(params = {}) {
    try {
      console.log('جاري جلب العملاء بالمعلمات:', params);
      
      // استخدام adminApi مع كوكيز HttpOnly (withCredentials)
      console.log('جاري طلب البيانات من API...');
      const response = await adminApi.getUsers({
        ...params,
        role: 'customer' // تأكيد جلب العملاء فقط
      });
      
      console.log('استجابة API كاملة:', response);
      
      // إرجاع البيانات بالشكل المتوقع من قبل المكونات
      // نرجع كائن يحتوي على خاصية data تحتوي على customers و total
      if (response && response.data) {
        let customers = Array.isArray(response.data) ? response.data : (response.data.customers || []);
        const total = response.data.total || (Array.isArray(response.data) ? response.data.length : 0);
        
        // Ensure each customer has an isActive property, defaulting to true if not provided
        customers = customers.map(customer => ({
          ...customer,
          isActive: customer.isActive !== undefined ? customer.isActive : true
        }));
        
        const result = {
          data: {
            customers,
            total
          },
          success: true
        };
        
        console.log('البيانات المعالجة:', result);
        return result;
      }
      
      console.warn('لم يتم العثور على بيانات في الاستجابة');
      return { 
        data: { 
          customers: [], 
          total: 0 
        },
        success: true
      };
      
    } catch (error) {
      console.error('خطأ في جلب العملاء:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
          headers: error.config?.headers
        }
      });
      
      // إعادة رمي الخطأ مع معلومات إضافية
      const enhancedError = new Error(
        error.response?.data?.message || 
        error.message || 
        'حدث خطأ أثناء محاولة جلب بيانات العملاء'
      );
      enhancedError.code = error.code || error.response?.status || 'UNKNOWN_ERROR';
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },

  // جلب بيانات عميل محدد
  async getCustomerById(id) {
    try {
      console.log(`جاري جلب بيانات العميل بالمعرف: ${id}`);
      const response = await adminApi.getUser(id);
      console.log('تم استلام بيانات العميل:', response);
      return response;
    } catch (error) {
      console.error('خطأ في جلب بيانات العميل:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // تحديث بيانات العميل
  async updateCustomer(id, customerData) {
    try {
      console.log('جاري تحديث بيانات العميل:', { id, customerData });
      const response = await adminApi.updateUser(id, customerData);
      console.log('تم تحديث بيانات العميل بنجاح:', response);
      return response;
    } catch (error) {
      console.error('خطأ في تحديث بيانات العميل:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // حذف عميل
  async deleteCustomer(id) {
    try {
      console.log(`جاري حذف العميل بالمعرف: ${id}`);
      const response = await adminApi.deleteUser(id);
      console.log('تم حذف العميل بنجاح:', response);
      return response;
    } catch (error) {
      console.error('خطأ في حذف العميل:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // تفعيل/تعطيل حساب العميل
  async toggleCustomerStatus(id, isActive) {
    try {
      console.log(`جاري تغيير حالة العميل: ${id} إلى ${isActive ? 'نشط' : 'غير نشط'}`);
      const response = await adminApi.updateUserStatus(id, { isActive });
      console.log('تم تغيير حالة العميل بنجاح:', response);
      return response;
    } catch (error) {
      console.error('خطأ في تغيير حالة العميل:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // تصدير بيانات العملاء
  async exportCustomers(format = 'csv') {
    try {
      console.log(`جاري تصدير بيانات العملاء بصيغة: ${format}`);
      const response = await adminApi.exportUsers({ format });
      console.log('تم تصدير بيانات العملاء بنجاح');
      return response.data;
    } catch (error) {
      console.error('خطأ في تصدير بيانات العملاء:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }
};
