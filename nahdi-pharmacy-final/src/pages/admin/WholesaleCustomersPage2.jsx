import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Clock, User, Building2, Check, X, Search, CheckCircle, Mail, Phone, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { useState as useToastState } from 'react';
import Toast from '@/components/Toast';
import wholesaleService from '@/services/wholesaleService';
import ApprovalConfirmationModal from '@/components/admin/ApprovalConfirmationModal';

const WholesaleCustomersPage2 = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Approval modal states
  const [approvalModal, setApprovalModal] = useState({
    isOpen: false,
    selectedApplication: null,
    isLoading: false
  });

  // Delete modal states
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    requestId: null,
    isLoading: false
  });
  const refreshInterval = useRef(null);
  const lastFetchTime = useRef(0);
  const isMounted = useRef(true);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ isVisible: true, message, type });
    const timer = setTimeout(() => {
      setToast(prev => ({ ...prev, isVisible: false }));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handleAuthError = useCallback((error) => {
    console.error('Authentication error:', error);
    showToast('انتهت جلسة المسؤول. يرجى تسجيل الدخول مرة أخرى', 'error');
    // Redirect to admin login after a short delay
    setTimeout(() => {
      navigate('/admin/login', { replace: true });
    }, 2000);
  }, [navigate, showToast]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate requests within 1 second
    const now = Date.now();
    if (isRefreshing && !forceRefresh && (now - lastFetchTime.current < 1000)) {
      console.log('⏭️ Skipping duplicate refresh request');
      return;
    }
    
    lastFetchTime.current = now;
    
    // Reset loading and error states
    setError(null);
    setLoading(true);
    setIsRefreshing(true);
    
    try {
      // Add cache-busting parameters
      const params = {
        _t: Date.now(), // Timestamp to prevent caching
        _cache: 'no-cache',
      };
      
      console.log(`🔄 Fetching ${activeTab} data with params:`, params);
      
      if (activeTab === 'pending') {
        try {
          console.log('📥 Fetching pending wholesale applications...');
          const data = await wholesaleService.getWholesaleApplications(params);
          console.log('✅ Fetched applications:', data);
          
          const processApplications = (apps) => {
            if (!Array.isArray(apps)) {
              console.warn('⚠️ Expected array of applications but got:', apps);
              return [];
            }
            
            const uniqueApps = new Map();
            
            apps.forEach(app => {
              if (app && app.id) {
                const processedApp = {
                  ...app,
                  id: app.id.toString(),
                  createdAt: app.createdAt || new Date().toISOString(),
                  status: app.status || 'pending',
                };
                uniqueApps.set(app.id, processedApp);
              }
            });
            
            const result = Array.from(uniqueApps.values());
            console.log(`🔄 Processed ${result.length} applications`);
            return result;
          };
          
          const processedApplications = processApplications(data);
          setApplications(processedApplications);
          
        } catch (error) {
          console.error('❌ Error fetching applications:', error);
          if (error.response?.status === 401) {
            handleAuthError(error);
            return;
          }
          throw error;
        }
      } else if (activeTab === 'customers') {
        try {
          console.log('📥 Fetching wholesale customers...');
          const data = await wholesaleService.getWholesaleCustomers(params);
          console.log('✅ Raw customers data from API:', data);
          
          const processCustomers = (customers) => {
            if (!Array.isArray(customers)) {
              console.warn('⚠️ Expected array of customers but got:', customers);
              return [];
            }
            
            const uniqueCustomers = new Map();
            
            customers.forEach(customer => {
              if (customer && customer.id) {
                console.log('📝 Processing customer:', {
                  id: customer.id,
                  name: customer.full_name || customer.userName,
                  email: customer.email || customer.userEmail,
                  hasDocs: !!(customer.documents?.id_document_url || customer.id_document_url)
                });
                
                const processedCustomer = {
                  ...customer,
                  id: customer.id.toString(),
                  full_name: customer.full_name || customer.userName || 'غير معروف',
                  userEmail: customer.email || customer.userEmail || '',
                  phone: customer.phone || '',
                  company_name: customer.company_name || 'غير محدد',
                  createdAt: customer.createdAt || customer.created_at || new Date().toISOString(),
                  // Ensure documents object exists with fallback to empty strings
                  documents: {
                    id_document_url: customer.documents?.id_document_url || customer.id_document_url || '',
                    commercial_document_url: customer.documents?.commercial_document_url || customer.commercial_document_url || ''
                  }
                };
                
                uniqueCustomers.set(processedCustomer.id, processedCustomer);
              }
            });
            
            const result = Array.from(uniqueCustomers.values());
            console.log(`🔄 Processed ${result.length} customers`);
            return result;
          };
          
          const processedCustomers = processCustomers(data);
          console.log('✅ Setting customers state with:', processedCustomers);
          setCustomers(processedCustomers);
          
        } catch (error) {
          console.error('❌ Error fetching customers:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            stack: error.stack
          });
          
          if (error.response?.status === 401) {
            handleAuthError(error);
            return;
          }
          
          // Show user-friendly error message
          setError('فشل تحميل بيانات العملاء. يرجى المحاولة مرة أخرى.');
          throw error;
        }
      }
      
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError('حدث خطأ في تحميل البيانات');
      
      if (error.response?.status === 401) {
        handleAuthError(error);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, isRefreshing, handleAuthError]);

  // Handle approval confirmation
  const handleApprovalConfirm = useCallback(async () => {
    if (!approvalModal.selectedApplication) {
      console.error('❌ [WholesaleCustomersPage2] No application selected for approval');
      showToast('لم يتم تحديد طلب للموافقة', 'error');
      return;
    }
    
    // Get the application details
    const { id, request_id, user_id, userName, companyName } = approvalModal.selectedApplication;
    
    // Use request_id if available, otherwise fall back to id
    const requestId = request_id || id;
    
    if (!requestId) {
      const errorMsg = '❌ [WholesaleCustomersPage2] Missing request ID in selected application';
      console.error(errorMsg, {
        selectedApplication: approvalModal.selectedApplication,
        availableKeys: Object.keys(approvalModal.selectedApplication)
      });
      showToast('معرف الطلب غير صالح - يرجى تحديث الصفحة والمحاولة مرة أخرى', 'error');
      return;
    }
    
    // Log the approval attempt with all relevant details
    console.log('✅ [WholesaleCustomersPage2] Processing approval confirmation for:', {
      request_id: requestId,
      application_id: id,
      user_id: user_id,
      user_name: userName || 'غير محدد',
      company_name: companyName || 'غير محدد',
      timestamp: new Date().toISOString()
    });
    
    // Set loading state to prevent multiple submissions
    setApprovalModal(prev => ({
      ...prev,
      isLoading: true
    }));
    
    try {
      // Log the API call
      console.log(`🔄 [WholesaleCustomersPage2] Calling approveWholesaleUpgrade with requestId: ${requestId}`);
      
      // Call the API to approve the request with the request ID
      const result = await wholesaleService.approveWholesaleUpgrade(requestId);
      
      // Log successful response
      console.log('✅ [WholesaleCustomersPage2] Approval successful:', {
        request_id: requestId,
        result: result,
        timestamp: new Date().toISOString()
      });
      
      // Show success message
      showToast('تمت الموافقة على طلب الترقية بنجاح', 'success');
      
      // Close the modal and reset state
      setApprovalModal({
        isOpen: false,
        selectedApplication: null,
        isLoading: false
      });
      
      // Refresh data to update the lists
      await fetchData(true);

      // Additionally fetch active customers to update that list as well
      try {
        console.log('🔄 [WholesaleCustomersPage2] Fetching updated wholesale customers list...');
        const customersData = await wholesaleService.getWholesaleCustomers();
        console.log(`✅ [WholesaleCustomersPage2] Successfully fetched ${customersData?.length || 0} wholesale customers`);
        setCustomers(customersData);
      } catch (err) {
        console.error('❌ [WholesaleCustomersPage2] Failed to fetch wholesale customers after approval:', {
          error: err.message,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      // Enhanced error logging
      const errorDetails = {
        request_id: requestId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      };
      
      console.error('❌ [WholesaleCustomersPage2] Failed to approve application:', errorDetails);
      
      // Handle specific error cases
      let errorMessage = 'حدث خطأ غير متوقع';
      let shouldCloseModal = false;
      let shouldRefreshData = false;
      
      if (error.response) {
        // Handle specific HTTP status codes
        if (error.response.status === 401) {
          errorMessage = 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى';
          shouldCloseModal = true;
          shouldRefreshData = true;
        } else if (error.response.status === 403) {
          errorMessage = 'ليس لديك صلاحيات الموافقة على طلبات الترقية';
        } else if (error.response.status === 404) {
          errorMessage = 'الطلب غير موجود أو تم حذفه';
          shouldCloseModal = true;
          shouldRefreshData = true;
          // Remove the invalid request from the applications list
          setApplications(prevApps => prevApps.filter(app => 
            (app.request_id || app.id) !== requestId
          ));
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت';
      } else if (error.message) {
        // Handle specific error messages
        if (error.message.includes('الطلب غير موجود') || error.message.includes('غير موجود')) {
          errorMessage = 'الطلب غير موجود أو تم حذفه';
          shouldCloseModal = true;
          shouldRefreshData = true;
          // Remove the invalid request from the applications list
          setApplications(prevApps => prevApps.filter(app => 
            (app.request_id || app.id) !== requestId
          ));
        } else if (error.message.includes('تم معالجة هذا الطلب مسبقاً') || error.message.includes('معالجة')) {
          errorMessage = 'تم معالجة هذا الطلب مسبقاً';
          shouldCloseModal = true;
          shouldRefreshData = true;
        } else if (error.message.includes('بيانات الطلب غير صالحة')) {
          errorMessage = 'بيانات الطلب غير صالحة - يرجى تحديث الصفحة والمحاولة مرة أخرى';
          shouldRefreshData = true;
        }
      } else {
        errorMessage = error.message || 'حدث خطأ غير متوقع';
      }
      
      showToast(`فشل في الموافقة على الطلب: ${errorMessage}`, 'error');
      
      // Close modal if needed
      if (shouldCloseModal) {
        setApprovalModal({
          isOpen: false,
          selectedApplication: null,
          isLoading: false
        });
      }
      
      // Refresh data if needed
      if (shouldRefreshData) {
        try {
          await fetchData(true);
          const customersData = await wholesaleService.getWholesaleCustomers();
          setCustomers(customersData);
        } catch (refreshErr) {
          console.error('❌ Failed to refresh data after error:', refreshErr);
        }
      }
    }
  }, [approvalModal, showToast, fetchData]);

  // Handle approval modal close
  const handleApprovalModalClose = useCallback(() => {
    if (approvalModal.isLoading) {
      console.log('⚠️ Cannot close modal while processing');
      return; // Prevent closing while loading
    }
    
    console.log('🔄 Closing approval modal');
    setApprovalModal({
      isOpen: false,
      selectedApplication: null,
      isLoading: false
    });
  }, [approvalModal.isLoading]);

  // Handle approve button click - opens confirmation modal
  const handleApprove = useCallback((application) => {
    if (!application) {
      console.error('❌ [WholesaleCustomersPage2] No application data provided');
      showToast('بيانات الطلب غير صحيحة', 'error');
      return;
    }

    // Log the full application object for debugging (without sensitive data)
    const { commercial_license, tax_certificate, ...safeApplication } = application;
    console.log('🔍 [WholesaleCustomersPage2] Application data received:', {
      ...safeApplication,
      has_commercial_license: !!commercial_license,
      has_tax_certificate: !!tax_certificate
    });

    // First try to get the request_id, then fall back to id
    const requestId = application.request_id || application.id;
    const userId = application.user_id || application.userId;
    
    if (!requestId) {
      const errorMsg = '❌ [WholesaleCustomersPage2] No valid request ID found in application';
      console.error(errorMsg, {
        applicationId: application.id,
        userId: userId,
        availableKeys: Object.keys(application)
      });
      showToast('معرف الطلب غير صالح - يرجى تحديث الصفحة والمحاولة مرة أخرى', 'error');
      return;
    }

    // Validate the request ID format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
      const errorMsg = `❌ [WholesaleCustomersPage2] Invalid request ID format: ${requestId}`;
      console.error(errorMsg, {
        requestId,
        applicationId: application.id,
        userId: userId
      });
      showToast('معرف الطلب غير صالح - يرجى تحديث الصفحة', 'error');
      return;
    }

    // Log all relevant IDs for debugging
    console.log('🔍 [WholesaleCustomersPage2] Processing approval for:', {
      request_id: requestId,
      application_id: application.id,
      user_id: userId,
      company_name: application.companyName || 'غير محدد',
      user_name: application.userName || 'غير محدد' 
    });

    // Set the modal state with the selected application
    setApprovalModal({
      isOpen: true,
      selectedApplication: {
        ...application,
        // Ensure we're using consistent IDs
        id: requestId,
        request_id: requestId,
        // Make sure user_id is set correctly
        user_id: userId,
        userId: userId
      },
      isLoading: false
    });
  }, [showToast]);

  // إضافة التحديث التلقائي كل 30 ثانية
  useEffect(() => {
    isMounted.current = true;
    
    // جلب البيانات الأولي
    fetchData(true);
    
    // تحديد موعد للتحديث التلقائي كل 30 ثانية
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 30000);
    
    // تنظيف المؤقت عند إغلاق المكون
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [activeTab]);

  // تحديث البيانات عند تغيير التبويب
  useEffect(() => {
    if (isMounted.current) {
      fetchData(true);
    }
  }, [activeTab]);

  const handleManualRefresh = useCallback(async () => {
    try {
      await fetchData(true);
      showToast('تم تحديث البيانات بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تحديث البيانات', 'error');
    }
  }, [fetchData, showToast]);

  // Handle delete request
  const handleDeleteRequest = useCallback(async (requestId) => {
    if (!requestId) {
      showToast('معرف الطلب غير صالح', 'error');
      return;
    }

    console.log(`🗑️ Deleting request: ${requestId}`);
    
    try {
      setDeleteModal(prev => ({ ...prev, isLoading: true }));
      
      // Call the API to delete the request
      const result = await wholesaleService.deleteWholesaleRequest(requestId);
      console.log('✅ Deletion successful:', result);
      
      showToast('تم حذف الطلب بنجاح', 'success');
      
      // Close the delete modal
      setDeleteModal({ isOpen: false, requestId: null, isLoading: false });
      
      // Refresh data to update the lists
      await fetchData(true);
      
    } catch (error) {
      console.error('❌ Error deleting application:', error);
      
      // Handle specific error cases
      let errorMessage = 'حدث خطأ أثناء حذف الطلب';
      
      if (error.message.includes('الطلب غير موجود') || error.message.includes('غير موجود')) {
        errorMessage = 'الطلب غير موجود أو تم حذفه مسبقاً';
        // Remove the invalid request from the applications list
        setApplications(prevApps => prevApps.filter(app => app.id !== requestId));
      } else if (error.message.includes('غير مصرح')) {
        errorMessage = 'غير مصرح لك بحذف هذا الطلب';
      } else {
        errorMessage = error.message || 'حدث خطأ أثناء حذف الطلب';
      }
      
      showToast(errorMessage, 'error');
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchData, showToast]);

  // Open delete confirmation modal
  const openDeleteModal = useCallback((requestId) => {
    setDeleteModal({
      isOpen: true,
      requestId,
      isLoading: false
    });
  }, []);

  // Close delete modal
  const closeDeleteModal = useCallback(() => {
    if (!deleteModal.isLoading) {
      setDeleteModal({
        isOpen: false,
        requestId: null,
        isLoading: false
      });
    }
  }, [deleteModal.isLoading]);

  const handleReject = useCallback(async (requestId, rejectionReason = 'تم رفض الطلب من قبل المسؤول') => {
    if (!requestId) {
      showToast('معرف الطلب غير صالح', 'error');
      return;
    }

    console.log(`🔄 Rejecting request: ${requestId}`);
    
    try {
      const result = await wholesaleService.updateRequestStatus(requestId, 'rejected', rejectionReason);
      console.log('✅ Rejection successful:', result);
      
      showToast('تم رفض الطلب بنجاح', 'success');
      
      // Refresh data to update the lists
      await fetchData(true);
      
    } catch (error) {
      console.error('❌ Error rejecting application:', error);
      
      // Handle specific error cases
      let errorMessage = 'حدث خطأ أثناء معالجة الطلب';
      
      if (error.message.includes('الطلب غير موجود') || error.message.includes('غير موجود')) {
        errorMessage = 'الطلب غير موجود أو تم حذفه';
        // Remove the invalid request from the applications list
        setApplications(prevApps => prevApps.filter(app => app.id !== requestId));
        await fetchData(true);
      } else if (error.message.includes('تم معالجة هذا الطلب مسبقاً') || error.message.includes('معالجة')) {
        errorMessage = 'تم معالجة هذا الطلب مسبقاً';
        await fetchData(true);
      } else if (error.message.includes('بيانات الطلب غير صالحة')) {
        errorMessage = 'بيانات الطلب غير صالحة - يرجى تحديث الصفحة والمحاولة مرة أخرى';
        await fetchData(true);
      } else {
        errorMessage = error.message || 'حدث خطأ أثناء معالجة الطلب';
      }
      
      showToast(errorMessage, 'error');
    }
  }, [fetchData, showToast]);

  const filteredApplications = (applications || []).filter(app => {
    if (!app) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      (app.userName || '').toLowerCase().includes(searchLower) ||
      (app.userEmail || '').toLowerCase().includes(searchLower) ||
      (app.companyName || '').toLowerCase().includes(searchLower) ||
      (app.taxNumber || '').toLowerCase().includes(searchLower) ||
      (app.status || '').toLowerCase().includes(searchLower)
    );
  });

  const filteredCustomers = customers.filter(customer => {
    const search = searchTerm.toLowerCase();
    return (
      (customer.userName?.toLowerCase().includes(search) ||
      customer.userEmail?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.companyName?.toLowerCase().includes(search) ||
      customer.full_name?.toLowerCase().includes(search))
    );
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoading(true);
    setError(null);
  };

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Log customers state changes
  useEffect(() => {
    console.log('🔄 Customers state updated:', {
      count: customers.length,
      customers: customers.map(c => ({
        id: c.id,
        name: c.full_name || c.userName,
        email: c.userEmail,
        hasDocs: !!(c.documents?.id_document_url || c.documents?.commercial_document_url)
      }))
    });
  }, [customers]);

  // Fetch data when component mounts and when activeTab changes
  useEffect(() => {
    console.log('🏁 Component mounted or activeTab changed:', { activeTab });
    
    // Set isMounted to true when component mounts
    isMounted.current = true;
    
    // Initial data fetch
    fetchData(true);
    
    // Set up visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted.current) {
        console.log('👀 Page became visible, refreshing data...');
        fetchData(true);
      }
    };
    
    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up...');
      isMounted.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, activeTab]);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">إدارة عملاء الجملة</h1>
          <Button 
            variant="outline"
            size="icon" 
            onClick={async (e) => {
              // إضافة تأثير النقر مع انعكاس الألوان
              const button = e.currentTarget;
              button.classList.add('scale-90');
              
              try {
                await handleManualRefresh();
              } catch (error) {
                console.error('Error during refresh:', error);
              } finally {
                setTimeout(() => {
                  button.classList.remove('scale-90');
                }, 200);
              }
            }}
            disabled={isRefreshing}
            className={`h-10 w-10 transition-all duration-200 ease-in-out 
                      bg-white hover:bg-green-50 
                      dark:bg-white/90 dark:hover:bg-green-50/80
                      border-gray-200 dark:border-gray-300
                      active:bg-green-100 dark:active:bg-green-100
                      active:scale-95 shadow-sm
                      ${isRefreshing ? 'text-green-600' : 'text-gray-800'}`} 
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-5 w-5 transition-transform ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          </Button>
        </div>
        <div className="w-full md:w-1/3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ابحث عن عميل..."
              className="pr-10 text-right w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs 
        defaultValue="pending" 
        value={activeTab}
        onValueChange={handleTabChange} 
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto rtl:mx-0 rtl:mr-auto">
          <TabsTrigger value="pending" className="flex items-center justify-center rtl:flex-row-reverse gap-2 relative">
            <Clock className="h-4 w-4" />
            <span>طلبات الانتظار</span>
            {applications.length > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-red-500 text-white"
              >
                {applications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center justify-center rtl:flex-row-reverse">
            <User className="ml-2 h-4 w-4" />
            العملاء النشطين
            <Badge variant="secondary" className="mr-2">
              {customers.length.toLocaleString('ar-SA')}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="border rounded-lg overflow-hidden">
            <CardHeader className="bg-gray-50 flex flex-row justify-end flex flex-row justify-end">
              <CardTitle className="text-lg font-semibold text-gray-800">طلبات الانتظار</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full text-right rtl">
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="text-right font-bold px-4 py-3">الإجراءات</TableHead>
                      <TableHead className="text-right font-bold px-4 py-3">تاريخ الطلب</TableHead>
                      <TableHead className="text-right font-bold px-4 py-3">المستندات</TableHead>
                      <TableHead className="text-right font-bold px-4 py-3">معلومات الشركة</TableHead>
                      <TableHead className="text-right font-bold px-4 py-3">معلومات العميل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2 text-gray-500">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            جاري التحميل...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredApplications.length > 0 ? (
                      filteredApplications.map((app) => (
                        <TableRow key={app.id} className="hover:bg-gray-50">
                          <TableCell className="px-4 py-3 align-top border-t">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="gap-1 bg-green-600 hover:bg-green-700 rtl:flex-row-reverse"
                                onClick={() => handleApprove(app)}
                              >
                                <Check className="h-4 w-4" />
                                <span>قبول</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1 bg-amber-600 hover:bg-amber-700 text-white rtl:flex-row-reverse border-amber-700 hover:border-amber-800 focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
                                onClick={() => handleReject(app.id)}
                              >
                                <X className="h-4 w-4" />
                                <span>رفض الطلب</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-red-600 hover:text-white hover:bg-red-600 rtl:flex-row-reverse"
                                onClick={() => openDeleteModal(app.id)}
                                title="حذف الطلب"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">حذف</span>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top border-t">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium">
                                {new Date(app.createdAt).toLocaleDateString('ar-SA')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(app.createdAt).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top border-t">
                            <div className="space-y-2">
                              {app.id_document_url && (
                                <a 
                                  href={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${app.id_document_url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 hover:underline rtl:flex-row-reverse"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.open(
                                      `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${app.id_document_url}`,
                                      '_blank',
                                      'noopener,noreferrer'
                                    );
                                  }}
                                >
                                  <FileText className="ml-2 h-4 w-4 flex-shrink-0" />
                                  <span>الهوية/الإقامة</span>
                                </a>
                              )}
                              
                              {app.commercial_document_url && (
                                <a 
                                  href={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${app.commercial_document_url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 hover:underline rtl:flex-row-reverse"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.open(
                                      `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${app.commercial_document_url}`,
                                      '_blank',
                                      'noopener,noreferrer'
                                    );
                                  }}
                                >
                                  <FileText className="ml-2 h-4 w-4 flex-shrink-0" />
                                  <span>السجل التجاري</span>
                                </a>
                              )}
                              
                              {!app.id_document_url && !app.commercial_document_url && (
                                <span className="text-sm text-gray-500">لا توجد مستندات</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top border-t">
                            <div className="space-y-2">
                              <div className="flex items-center rtl:flex-row-reverse">
                                <Building2 className="ml-2 h-4 w-4 text-primary flex-shrink-0" />
                                <span className="font-medium">{app.companyName || 'غير محدد'}</span>
                              </div>
                              
                              <div className="space-y-1 pr-6">
                                {app.tax_number && (
                                  <div className="text-sm text-gray-600 rtl:text-right">
                                    <span className="text-gray-500">الرقم الضريبي: </span>
                                    <span className="font-medium">{app.tax_number}</span>
                                  </div>
                                )}
                                
                                {app.commercial_register && (
                                  <div className="text-sm text-gray-600 rtl:text-right">
                                    <span className="text-gray-500">السجل التجاري: </span>
                                    <span className="font-medium">{app.commercial_register}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top border-t">
                            <div className="space-y-2">
                              <div className="flex items-center text-gray-900 rtl:flex-row-reverse">
                                <User className="ml-2 h-4 w-4 text-primary flex-shrink-0" />
                                <span className="font-medium">{app.userName || 'غير معروف'}</span>
                              </div>
                              
                              <div className="space-y-1 pr-6">
                                {app.userEmail && (
                                  <div className="flex items-center text-sm text-gray-600 rtl:flex-row-reverse">
                                    <Mail className="ml-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate" title={app.userEmail}>
                                      {app.userEmail}
                                    </span>
                                  </div>
                                )}
                                
                                {app.phone && app.phone !== app.userEmail && (
                                  <div className="flex items-center text-sm text-gray-600 rtl:flex-row-reverse">
                                    <Phone className="ml-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="ltr">{app.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          لا توجد طلبات في الوقت الحالي
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card className="border rounded-lg overflow-hidden">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg font-semibold text-gray-800">العملاء النشطين</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="rtl">
                <Table className="w-full">
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="font-bold px-4 py-3 text-right">العميل</TableHead>
                      <TableHead className="font-bold px-4 py-3 text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="font-bold px-4 py-3 text-right">رقم الجوال</TableHead>
                      <TableHead className="font-bold px-4 py-3 text-right">الملفات</TableHead>
                      <TableHead className="font-bold px-4 py-3 text-right">تاريخ التسجيل</TableHead>
                      <TableHead className="font-bold px-4 py-3 text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2 text-gray-500">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            جاري التحميل...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-gray-50">
                          <TableCell className="px-4 py-3 border-t">
                            <div className="flex items-center">
                              <User className="ml-2 h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium">{customer.full_name || customer.userName || 'غير معروف'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 border-t">
                            <div className="flex items-center">
                              <Mail className="ml-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate" dir="ltr">{customer.userEmail || 'غير متوفر'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 border-t">
                            <div className="flex items-center">
                              <Phone className="ml-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="whitespace-nowrap">{customer.phone || 'غير متوفر'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 border-t">
                            <div className="space-y-1">
                              {customer.documents?.id_document_url && (
                                <a 
                                  href={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${customer.documents.id_document_url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  <FileText className="ml-2 h-4 w-4 flex-shrink-0" />
                                  <span>الهوية/الإقامة</span>
                                </a>
                              )}
                              
                              {customer.documents?.commercial_document_url && (
                                <a 
                                  href={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${customer.documents.commercial_document_url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  <FileText className="ml-2 h-4 w-4 flex-shrink-0" />
                                  <span>السجل التجاري</span>
                                </a>
                              )}
                              
                              {!customer.documents?.id_document_url && !customer.documents?.commercial_document_url && (
                                <span className="text-sm text-gray-500">لا توجد مستندات</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 border-t">
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {new Date(customer.createdAt).toLocaleDateString('ar-SA')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(customer.createdAt).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 border-t">
                            <Badge className={`${customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} w-fit`}>
                              {customer.is_active ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          لا يوجد عملاء مسجلين
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
      
      <ApprovalConfirmationModal
        isOpen={approvalModal.isOpen}
        onClose={handleApprovalModalClose}
        onConfirm={handleApprovalConfirm}
        customerName={approvalModal.selectedApplication?.full_name || approvalModal.selectedApplication?.userName || 'غير معروف'}
        companyName={approvalModal.selectedApplication?.company_name}
        isLoading={approvalModal.isLoading}
      />

      {/* Delete Confirmation Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity ${deleteModal.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={closeDeleteModal}></div>
        <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl transition-all transform ${deleteModal.isOpen ? 'scale-100' : 'scale-95'}">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">تأكيد حذف الطلب</h3>
            <p className="text-sm text-gray-600 mb-6">
              <span className="block mb-2 font-medium">هل أنت متأكد من رغبتك في حذف هذا الطلب؟</span>
              <span className="text-red-600">هذا الإجراء لا يمكن التراجع عنه.</span>
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={closeDeleteModal}
                disabled={deleteModal.isLoading}
                className="px-4"
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteRequest(deleteModal.requestId)}
                disabled={deleteModal.isLoading}
                className="px-6 gap-2 bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {deleteModal.isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>نعم، احذف الطلب</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WholesaleCustomersPage2;
