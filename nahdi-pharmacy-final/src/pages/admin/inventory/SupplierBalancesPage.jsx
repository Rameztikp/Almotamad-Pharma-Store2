import React, { useState, useEffect } from 'react';
import { 
  FiSearch, 
  FiDollarSign, 
  FiPhone, 
  FiMail, 
  FiMapPin, 
  FiPlus, 
  FiFileText, 
  FiShoppingBag, 
  FiEye,
  FiTrash2,
  FiArrowLeft
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../services/adminApi';
import PurchaseInvoiceModal from '../../../components/admin/inventory/PurchaseInvoiceModal';
import SupplierAccountStatement from '../../../components/admin/inventory/SupplierAccountStatement';

const SupplierBalancesPage = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAccountStatement, setShowAccountStatement] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [view, setView] = useState('suppliers'); // 'suppliers' or 'invoices'

  // Fetch data based on current view
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (view === 'suppliers' || !selectedSupplier) {
          // Fetch suppliers and products using adminApi
          const [suppliersResult, productsResult] = await Promise.all([
            adminApi.getSuppliers(),
            adminApi.getInventory()
          ]);
          
          // Handle suppliers response
          if (suppliersResult.success) {
            setSuppliers(suppliersResult.data || []);
          } else {
            throw new Error(suppliersResult.message || 'فشل في تحميل بيانات الموردين');
          }
          
          // Handle products response
          if (productsResult.success) {
            setProducts(productsResult.data || []);
          } else {
            throw new Error(productsResult.message || 'فشل في تحميل المنتجات');
          }
        } else if (selectedSupplier) {
          // Fetch supplier invoices using adminApi
          const invoicesResult = await adminApi.getPurchaseInvoices({ 
            supplier_id: selectedSupplier.id 
          });
          
          if (invoicesResult.success) {
            setInvoices(invoicesResult.data || []);
          } else {
            throw new Error(invoicesResult.message || 'فشل في تحميل فواتير المشتريات');
          }
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [view, selectedSupplier]);
  
  // Handle saving purchase invoice
  const handleSaveInvoice = async (invoiceData) => {
    try {
      const token = getToken();
      const response = await adminApi.createPurchaseInvoice(invoiceData);
      
      if (response.success) {
        // Refresh data
        const [suppliersRes, productsRes] = await Promise.all([
          adminApi.getSuppliers(),
          adminApi.getInventory()
        ]);
        
        if (suppliersRes.success) {
          setSuppliers(suppliersRes.data || []);
        } else {
          throw new Error(suppliersRes.message || 'فشل في تحميل بيانات الموردين');
        }
        
        if (productsRes.success) {
          setProducts(productsRes.data || []);
        } else {
          throw new Error(productsRes.message || 'فشل في تحميل المنتجات');
        }
        
        // If viewing a specific supplier, refresh their invoices
        if (selectedSupplier) {
          const invoicesRes = await adminApi.getPurchaseInvoices({ supplier_id: selectedSupplier.id });
          if (invoicesRes.success) {
            setInvoices(invoicesRes.data || []);
          } else {
            throw new Error(invoicesRes.message || 'فشل في تحميل فواتير المشتريات');
          }
        }
        
        toast.success('تم حفظ الفاتورة بنجاح');
        return true;
      } else {
        throw new Error(response.message || 'فشل في حفظ الفاتورة');
      }
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };
  
  // Handle viewing supplier invoices
  const handleViewInvoices = (supplier) => {
    setSelectedSupplier(supplier);
    setView('invoices');
  };
  
  // Handle deleting an invoice
  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم خصم المبلغ من رصيد المورد.')) {
      return;
    }
    
    try {
      const response = await adminApi.deletePurchaseInvoice(invoiceId);
      
      if (response.success) {
        // Refresh data
        const [suppliersRes, invoicesRes] = await Promise.all([
          adminApi.getSuppliers(),
          adminApi.getPurchaseInvoices({ supplier_id: selectedSupplier.id })
        ]);
        
        if (suppliersRes.success) {
          setSuppliers(suppliersRes.data || []);
        } else {
          throw new Error(suppliersRes.message || 'فشل في تحميل بيانات الموردين');
        }
        
        if (invoicesRes.success) {
          setInvoices(invoicesRes.data || []);
        } else {
          throw new Error(invoicesRes.message || 'فشل في تحميل فواتير المشتريات');
        }
        
        toast.success('تم حذف الفاتورة بنجاح');
      } else {
        throw new Error(response.message || 'فشل في حذف الفاتورة');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف الفاتورة');
    }
  };
  
  // Format date to Arabic locale
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-SA');
  };
  
  // Calculate total amount for invoices
  const calculateTotal = (items) => {
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0).toFixed(2);
  };

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.includes(searchTerm) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format balance
  const formatBalance = (balance) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(balance || 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render supplier invoices view
  const renderInvoicesView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView('suppliers')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <FiArrowLeft className="ml-1" />
          العودة إلى قائمة الموردين
        </button>
        <h2 className="text-xl font-semibold">
          فواتير المشتريات - {selectedSupplier?.name}
        </h2>
        <div className="w-32"></div> {/* For alignment */}
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عدد الأصناف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجمالي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ملاحظات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.invoice_number || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.items?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {parseFloat(invoice.total_amount).toFixed(2)} ر.س
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {invoice.notes || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="عرض التفاصيل"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="text-red-600 hover:text-red-900"
                        title="حذف الفاتورة"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    لا توجد فواتير مسجلة لهذا المورد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render suppliers list view
  const renderSuppliersView = () => (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">أرصدة الموردين</h1>
        <div className="flex space-x-3 space-x-reverse w-full md:w-auto">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiPlus className="ml-1" />
            فاتورة مشتريات جديدة
          </button>
          <button
            onClick={() => {}}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiFileText className="ml-1" />
            كشف حساب المورد
          </button>
        </div>
      </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="ابحث عن مورد..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>

        {/* Suppliers List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المورد
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الفواتير
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    معلومات الاتصال
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الرصيد الحالي
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    آخر معاملة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FiDollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">
                              {supplier.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {supplier.contactPerson || 'لا يوجد'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleViewInvoices(supplier)}
                            className="text-blue-600 hover:text-blue-900 px-3 py-1 text-sm border border-blue-200 rounded-md hover:bg-blue-50"
                          >
                            <FiEye className="inline ml-1" />
                            الفواتير
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowAccountStatement(true);
                            }}
                            className="text-green-600 hover:text-green-900 px-3 py-1 text-sm border border-green-200 rounded-md hover:bg-green-50"
                          >
                            <FiFileText className="inline ml-1" />
                            كشف حساب
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <FiPhone className="ml-1 text-gray-500" />
                            <span>{supplier.phone || 'غير متوفر'}</span>
                          </div>
                          <div className="flex items-center">
                            <FiMail className="ml-1 text-gray-500" />
                            <span>{supplier.email || 'غير متوفر'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                          (supplier.balance || 0) < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {formatBalance(supplier.balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {supplier.lastTransactionDate ? (
                          new Date(supplier.lastTransactionDate).toLocaleDateString('ar-SA')
                        ) : (
                          'لا توجد معاملات سابقة'
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      لا توجد نتائج مطابقة للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FiDollarSign className="h-6 w-6" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">إجمالي المديونيات</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatBalance(
                    suppliers.reduce((sum, supplier) => sum + (supplier.balance < 0 ? Math.abs(supplier.balance) : 0), 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FiDollarSign className="h-6 w-6" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">إجمالي الأرصدة</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatBalance(
                    suppliers.reduce((sum, supplier) => sum + (supplier.balance > 0 ? supplier.balance : 0), 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <FiDollarSign className="h-6 w-6" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">إجمالي الموردين</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {suppliers.length} مورد
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  // Main component render
  return (
    <div className="p-6">
      {view === 'suppliers' ? (
        <>
          {renderSuppliersView()}
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <FiDollarSign className="h-6 w-6" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-500">إجمالي المديونيات</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatBalance(
                      suppliers.reduce((sum, supplier) => sum + (supplier.balance < 0 ? Math.abs(supplier.balance) : 0), 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <FiDollarSign className="h-6 w-6" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-500">إجمالي الأرصدة</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatBalance(
                      suppliers.reduce((sum, supplier) => sum + (supplier.balance > 0 ? supplier.balance : 0), 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <FiDollarSign className="h-6 w-6" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-500">إجمالي الموردين</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {suppliers.length} مورد
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        renderInvoicesView()
      )}
      
      <PurchaseInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onSave={async (invoiceData) => {
          const success = await handleSaveInvoice(invoiceData);
          if (success) {
            setShowInvoiceModal(false);
          }
          return success;
        }}
        suppliers={suppliers}
        products={products}
        defaultSupplierId={selectedSupplier?.id}
      />

      {/* Account Statement Modal */}
      {showAccountStatement && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
            <SupplierAccountStatement 
              supplier={selectedSupplier} 
              onClose={() => setShowAccountStatement(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierBalancesPage;
