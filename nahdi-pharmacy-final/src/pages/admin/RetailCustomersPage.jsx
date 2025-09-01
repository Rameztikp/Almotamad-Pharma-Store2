import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaSearch, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaUser, 
  FaSpinner, 
  FaCheck, 
  FaTimes, 
  FaFileExport, 
  FaUserSlash, 
  FaArrowRight, 
  FaArrowLeft,
  FaTimesCircle,
  FaSave
} from 'react-icons/fa';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { customerService } from '../../services/customerService';
import { useUserAuth } from '../../context/UserAuthProvider';

const RetailCustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(10);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useUserAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    isActive: true
  });

  const fetchCustomers = useCallback(async () => {
    console.log('بدء جلب العملاء...', {
      page: currentPage,
      limit: customersPerPage,
      search: searchTerm,
      user: user?.id
    });
    
    setIsLoading(true);
    // Show loading message
    const loadingToast = toast.loading('جاري تحميل بيانات العملاء...');
    
    try {
      const response = await customerService.getCustomers({
        page: currentPage,
        limit: customersPerPage,
        search: searchTerm,
        role: 'customer'  // Ensure only customers are fetched
      });
      
      console.log('تفاصيل استجابة العملاء:', {
        response: response,
        data: response?.data,
        customers: response?.data?.customers,
        firstCustomer: response?.data?.customers?.[0]
      });
      
      if (response.data && Array.isArray(response.data.customers)) {
        console.log('بيانات العميل الأول:', response.data.customers[0]);
        console.log('جميع الحقول المتاحة:', Object.keys(response.data.customers[0] || {}));
        
        // تسجيل كامل بيانات الاستجابة
        console.log('استجابة API كاملة:', JSON.stringify(response.data, null, 2));
        
        // تسجيل مفصل للعميل الأول مع جميع حقوله
        const firstCustomer = response.data.customers[0];
        if (firstCustomer) {
          console.log('تحليل بيانات العميل الأول:', {
            // الحقول الأساسية
            id: firstCustomer.id,
            full_name: firstCustomer.full_name,
            email: firstCustomer.email,
            phone: firstCustomer.phone,
            
            // حقول التاريخ المحتملة
            date_of_birth: firstCustomer.date_of_birth,
            birth_date: firstCustomer.birth_date,
            birthdate: firstCustomer.birthdate,
            dob: firstCustomer.dob,
            
            // قائمة بجميع الحقول المتاحة
            allFields: Object.keys(firstCustomer)
          });
          
          // تسجيل جميع حقول العميل مع قيمها
          console.log('جميع حقول العميل مع القيم:', firstCustomer);
        }
        
        setCustomers(response.data.customers || []);
        setFilteredCustomers(response.data.customers || []);
        setTotalCustomers(response.data.total || 0);
        setTotalPages(Math.ceil((response.data.total || 0) / customersPerPage));
        
        // Close loading message with success
        toast.update(loadingToast, {
          render: 'تم تحميل بيانات العملاء بنجاح',
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
      } else {
        console.warn('تنسيق البيانات غير متوقع:', response.data);
        setCustomers([]);
        setFilteredCustomers([]);
        setTotalCustomers(0);
        setTotalPages(1);
        
        // Close loading message with warning
        toast.update(loadingToast, {
          render: 'تنسيق البيانات غير متوقع',
          type: 'warning',
          isLoading: false,
          autoClose: 3000
        });
      }
    } catch (error) {
      console.error('خطأ في جلب العملاء:', error);
      
      // Close loading message with error
      toast.update(loadingToast, {
        render: error.code === 'AUTH_REQUIRED' ? 
          'يجب تسجيل الدخول أولاً' : 
          'حدث خطأ أثناء جلب بيانات العملاء',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
      
      console.error('تفاصيل الخطأ:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, customersPerPage, searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    // Reset to first page when search term changes
    setCurrentPage(1);
  }, [searchTerm]);

  const handleDeleteCustomer = (customerId) => {
    confirmAlert({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من رغبتك في حذف هذا العميل؟',
      buttons: [
        {
          label: 'نعم',
          onClick: async () => {
            try {
              setIsDeleting(true);
              await customerService.deleteCustomer(customerId);
              await fetchCustomers();
              toast.success('تم حذف العميل بنجاح');
            } catch (error) {
              console.error('Error deleting customer:', error);
              toast.error('حدث خطأ أثناء حذف العميل');
            } finally {
              setIsDeleting(false);
            }
          }
        },
        {
          label: 'لا',
          className: 'cancel-btn',
          onClick: () => {}
        }
      ],
      closeOnEscape: true,
      closeOnClickOutside: true
    });
  };

  const toggleCustomerStatus = async (id, currentStatus) => {
    try {
      await customerService.toggleCustomerStatus(id, !currentStatus);
      const updatedCustomers = customers.map(customer => 
        customer.id === id ? { ...customer, isActive: !currentStatus } : customer
      );
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);
      toast.success(`تم ${currentStatus ? 'تعطيل' : 'تفعيل'} الحساب بنجاح`);
    } catch (error) {
      console.error('Error toggling customer status:', error);
      toast.error('حدث خطأ أثناء تغيير حالة الحساب');
    }
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      fullName: customer.fullName || customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      isActive: customer.isActive !== undefined ? customer.isActive : true
    });
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;
    
    try {
      setIsSaving(true);
      // استدعاء خدمة تحديث بيانات العميل
      await customerService.updateCustomer(selectedCustomer.id, formData);
      
      // تحديث حالة التطبيق بالبيانات الجديدة
      const updatedCustomers = customers.map(customer => 
        customer.id === selectedCustomer.id 
          ? { ...customer, ...formData } 
          : customer
      );
      
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);
      setIsEditModalOpen(false);
      toast.success('تم تحديث بيانات العميل بنجاح');
    } catch (error) {
      console.error('خطأ في تحديث بيانات العميل:', error);
      toast.error('حدث خطأ أثناء محاولة تحديث البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const data = await customerService.exportCustomers({ format });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('تم تصدير بيانات العملاء بنجاح');
    } catch (error) {
      console.error('Error exporting customers:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة العملاء</h1>
          <p className="text-sm text-gray-500 mt-1">عرض وإدارة حسابات عملاء المتجر</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ابحث عن عميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleExport('csv')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <FaFileExport className="ml-2" />
              تصدير
            </button>
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <FaPlus className="ml-2" />
              إضافة عميل
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <FaSpinner className="animate-spin h-8 w-8 text-blue-500" />
            <span className="mr-3">جاري تحميل البيانات...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <FaUserSlash className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد عملاء</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'لم يتم العثور على عملاء يطابقون بحثك.' : 'لم يتم العثور على عملاء مسجلين بعد.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      العميل
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      البريد الإلكتروني
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الهاتف
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ الميلاد
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ التسجيل
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">إجراءات</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className={`${!customer.isActive ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full ${customer.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                              <FaUser size={16} />
                            </div>
                            <div className="mr-4">
                              <div className="text-sm font-medium text-gray-900">
                                {customer.full_name || customer.fullName || customer.name || 'لا يوجد اسم'}
                              </div>
                              <div className="text-xs text-gray-500">ID: {customer.id || 'غير معروف'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.email || 'لا يوجد بريد إلكتروني'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.phone || 'لا يوجد رقم هاتف'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.date_of_birth ? format(new Date(customer.date_of_birth), 'dd/MM/yyyy', { locale: ar }) : 'غير محدد'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.created_at ? format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: ar }) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            onClick={() => toggleCustomerStatus(customer.id, customer.isActive)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                              customer.isActive 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {customer.isActive ? (
                              <>
                                <FaCheck className="ml-1 h-3 w-3" />
                                نشط
                              </>
                            ) : (
                              <>
                                <FaTimes className="ml-1 h-3 w-3" />
                                معطل
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="text-blue-600 hover:text-blue-900 ml-4"
                            onClick={() => handleEditCustomer(customer)}
                            title="تعديل بيانات العميل"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteCustomer(customer.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        لا يوجد بيانات لعرضها
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isLoading}
                  className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    عرض <span className="font-medium">{(currentPage - 1) * customersPerPage + 1}</span> إلى{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * customersPerPage, totalCustomers)}
                    </span>{' '}
                    من <span className="font-medium">{totalCustomers}</span> عميل
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" dir="ltr">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || isLoading}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">السابق</span>
                      <FaArrowRight className="h-4 w-4" />
                    </button>
                    <div className="flex items-center px-4">
                      <span className="text-sm text-gray-700">
                        الصفحة {currentPage} من {totalPages}
                      </span>
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || isLoading}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">التالي</span>
                      <FaArrowLeft className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* نافذة تعديل العميل */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">تعديل بيانات العميل</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isSaving}
              >
                <FaTimesCircle size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isSaving}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSaving}
                />
                <label htmlFor="isActive" className="mr-2 block text-sm text-gray-700">
                  الحساب مفعل
                </label>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <FaSave className="-ml-1 mr-2 h-4 w-4" />
                    حفظ التغييرات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailCustomersPage;
