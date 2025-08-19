import React, { useState, useEffect } from 'react';
import { FaSearch, FaShoppingBag, FaEye, FaTruck, FaCheck, FaTimes, FaSync } from 'react-icons/fa';
import { adminOrderService } from '../../services/admin/orderService';
import { toast } from 'react-toastify';
import { statusText, statusColor, normalizeStatus } from '../../utils/orderStatus';

const RetailOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    order_type: 'retail'
  });

  // Modal state for viewing customer details
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  // Modal state for invoice
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchRetailOrders = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await adminOrderService.getAllOrders({
        page,
        limit: 10,
        status: filters.status,
        order_type: 'retail',
        search
      });
      
      setOrders(response.orders || []);
      setTotalPages(response.totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching retail orders:', error);
      toast.error('فشل في تحميل طلبات التجزئة');
    } finally {
      setLoading(false);
    }
  };

  // Extract common street value
  const extractStreet = (addr = {}) =>
    addr.address_line1 ||
    addr.addressLine1 ||
    addr.AddressLine1 ||
    addr.address1 ||
    addr.line1 ||
    addr.address ||
    addr.Address ||
    addr.street ||
    addr.street_name ||
    addr.streetName ||
    addr.street_address ||
    addr.streetAddress ||
    addr.street_ar ||
    addr.street_name_ar ||
    addr.address_line2 ||
    '';

  // Extract common district value
  const extractDistrict = (addr = {}) =>
    addr.district ||
    addr.neighborhood ||
    addr.neighbourhood ||
    addr.neighborhood_ar ||
    addr.district_ar ||
    addr.area ||
    addr.area_name ||
    '';

  // Extract city value only from city-like keys
  const extractCity = (addr = {}) =>
    addr.city ||
    addr.City ||
    addr.city_ar ||
    addr.municipality ||
    '';

  // Helpers for customer info
  const getCustomerName = (order) => {
    return (
      order.shippingAddress?.full_name ||
      order.shippingAddress?.name ||
      order.shipping_address?.full_name ||
      order.shipping_address?.name ||
      order.customerName ||
      order.user?.full_name ||
      order.user?.name ||
      order.user?.email ||
      'عميل'
    );
  };

  const openUserModal = (user) => {
    setSelectedUser(user || null);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  const openInvoiceModal = (order) => {
    setSelectedOrder(order || null);
    setShowInvoiceModal(true);
    try {
      // Debug logs to verify real address shape
      const sa = order?.shippingAddress || order?.shipping_address;
      const ba = order?.billingAddress || order?.billing_address;
      console.log('[Invoice] shippingAddress JSON:', sa ? JSON.stringify(sa, null, 2) : null);
      console.log('[Invoice] billingAddress JSON:', ba ? JSON.stringify(ba, null, 2) : null);
    } catch (e) {}
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedOrder(null);
  };

  // Accept order: move from pending -> processing, open invoice and print, notify customer
  const handleAccept = async (order) => {
    const oid = order?._id || order?.id;
    if (!oid) {
      console.error('handleAccept: missing order id');
      toast.error('تعذر تحديد رقم الطلب');
      return;
    }
    try {
      await adminOrderService.updateOrderStatus(oid, 'processing', 'retail');
      toast.success('تم قبول الطلب وتحويله إلى قيد التجهيز');

      // Re-fetch latest order details to reflect any recent edits (e.g., shipping name/phone)
      let latest = null;
      try {
        latest = await adminOrderService.getOrderDetails(oid, 'retail');
      } catch (e) {
        console.warn('Failed to fetch latest order details, falling back to local order:', e?.message || e);
      }

      // Open invoice modal with freshest data available
      const updated = latest ? { ...latest } : { ...order, status: 'processing', _id: order._id || undefined, id: order.id || undefined };
      setSelectedOrder(updated);
      setShowInvoiceModal(true);

      // Try to notify the customer (non-blocking)
      try {
        await adminOrderService.notifyCustomer(oid, { event: 'order_processing', message: 'طلبك قيد التجهيز' });
      } catch (e) {
        console.warn('Notify customer failed (non-blocking):', e?.message || e);
      }

      // Trigger print after the modal opens
      setTimeout(() => {
        try { window.print(); } catch (_) {}
      }, 300);

      // Refresh list
      fetchRetailOrders(currentPage, searchTerm);
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('فشل قبول الطلب');
    }
  };

  useEffect(() => {
    fetchRetailOrders(1, searchTerm);
  }, [filters.status]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await adminOrderService.updateOrderStatus(orderId, newStatus, 'retail');
      toast.success('تم تحديث حالة الطلب بنجاح');
      fetchRetailOrders(currentPage, searchTerm);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('فشل في تحديث حالة الطلب');
    }
  };

  // Format date to English (Gregorian)
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    // Use en-GB for DD/MM/YYYY or en-US for MM/DD/YYYY. We'll use en-GB (common for admin readability)
    return d.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Calculate order total (robust against missing/typed fields)
  const toNumber = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
    return isNaN(n) ? 0 : n;
  };

  const getItemPrice = (item) => {
    // prefer explicit item price, then unit fields, then product price
    const price =
      item.price ??
      item.unit_price ??
      item.unitPrice ??
      item.sale_price ??
      item.salePrice ??
      item.product?.sale_price ??
      item.product?.price ??
      0;
    return toNumber(price);
  };

  const getItemQty = (item) => {
    const qty = item.quantity ?? item.qty ?? 0;
    return toNumber(qty);
  };

  const calculateTotal = (items = [], order = null) => {
    // If API already provides order total, use it
    if (order) {
      const provided = order.total_amount ?? order.totalAmount ?? order.total ?? null;
      if (provided != null && !isNaN(toNumber(provided))) {
        return toNumber(provided);
      }
    }

    const total = (Array.isArray(items) ? items : []).reduce((sum, item) => {
      return sum + getItemPrice(item) * getItemQty(item);
    }, 0);
    return toNumber(total);
  };

  // Format full address from various possible shapes
  const formatAddress = (order) => {
    const addr =
      order?.shippingAddress ||
      order?.shipping_address ||
      order?.ShippingAddress ||
      order?.shipping ||
      order?.address ||
      order?.billingAddress ||
      order?.billing_address ||
      {};
    // If there's a pre-composed address string
    const direct = addr.address || addr.full_address || addr.fullAddress;
    if (direct && typeof direct === 'string') return direct;

    // Common aliases
    const line1 =
      addr.address_line1 ||
      addr.addressLine1 ||
      addr.AddressLine1 ||
      addr.address1 ||
      addr.line1 ||
      addr.street ||
      addr.street_name ||
      addr.streetName ||
      addr.street_ar ||
      addr.street_name_ar ||
      '';
    const line2 =
      addr.address_line2 ||
      addr.addressLine2 ||
      addr.AddressLine2 ||
      addr.address2 ||
      addr.line2 ||
      addr.apartment ||
      addr.unit ||
      addr.flat ||
      '';
    const district =
      addr.district ||
      addr.neighborhood ||
      addr.neighbourhood ||
      addr.neighborhood_ar ||
      addr.district_ar ||
      addr.area ||
      addr.area_name ||
      '';
    const building = addr.building_no || addr.building || '';
    const additional = addr.additional_no || addr.additionalNumber || '';
    const landmark = addr.landmark || '';
    const city = addr.city || '';
    const state = addr.state || addr.region || addr.province || '';
    const postal = addr.postal_code || addr.postalCode || addr.zip || addr.zipCode || '';
    const country = addr.country || '';

    // Build and deduplicate parts
    const rawParts = [line1, line2, district, building, additional, landmark, city, state, postal, country]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);
    const seen = new Set();
    const parts = rawParts.filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });

    return parts.length ? parts.join('، ') : '—';
  };

  // Fetch orders on component mount and when filters change
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await adminOrderService.getAllOrders({
          page: currentPage,
          limit: 10,
          status: filters.status,
          order_type: 'retail',  // Ensure we only get retail orders
          search: searchTerm
        });
        
        setOrders(response.orders || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('حدث خطأ في جلب الطلبات');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [currentPage, filters.status, searchTerm]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to first page when searching
    setCurrentPage(1);
  };

  // Handle status filter change
  const handleStatusFilter = (e) => {
    const status = e.target.value;
    setFilters({ ...filters, status });
    // Reset to first page when changing filters
    setCurrentPage(1);
  };

  // Render status badge (unified)
  const renderStatusBadge = (status) => {
    const cls = statusColor(status);
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}`}>
        {statusText(status)}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">إدارة طلبات القطاعي</h1>
        <div className="flex flex-col md:flex-row gap-4 mt-4 md:mt-0">
          <div className="relative">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filters.status}
              onChange={handleStatusFilter}
            >
              <option value="">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="processing">قيد التجهيز</option>
              <option value="shipped">تم الشحن</option>
              <option value="delivered">تم التسليم</option>
              <option value="cancelled">تم الإلغاء</option>
            </select>
          </div>
          <form onSubmit={handleSearch} className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ابحث برقم الطلب أو اسم العميل"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <FaSync className="animate-spin text-blue-500 text-2xl mr-3" />
              <span className="text-gray-600">جاري تحميل الطلبات...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center p-12">
              <FaShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">لا توجد طلبات</h3>
              <p className="mt-1 text-gray-500">لم يتم العثور على أي طلبات متطابقة مع معايير البحث</p>
            </div>
          ) : (
            <div className="align-middle min-w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      <div className="flex items-center justify-end">
                        <span>رقم الطلب</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      <div className="flex items-center justify-end">
                        <span>العميل</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      <div className="flex items-center justify-end">
                        <span>التاريخ</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      <div className="flex items-center justify-end">
                        <span>المجموع</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      <div className="flex items-center justify-end">
                        <span>المنتجات</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      <div className="flex items-center justify-end">
                        <span>طريقة الدفع</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                      <div className="flex items-center justify-end">
                        <span>الحالة</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      <span className="sr-only">الإجراءات</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id || order._id || order.orderNumber} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={() => openInvoiceModal(order)}
                            title="عرض الفاتورة"
                          >
                            #{order.orderNumber || order._id?.substring(0, 8).toUpperCase()}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={() => openUserModal(order.user)}
                            title="عرض تفاصيل العميل"
                          >
                            {getCustomerName(order)}
                          </button>
                        </div>
                        {(order.user?.phone || order.shippingAddress?.phone) && (
                          <div className="text-sm text-gray-500 mt-1 text-left">
                            {order.user?.phone || order.shippingAddress?.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 text-right">
                          {formatDate(order.createdAt)}
                        </div>
                        <div className="text-sm text-gray-500 text-right">
                          {new Date(order.createdAt).toLocaleTimeString('ar-SA')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {calculateTotal(order.items, order).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className="text-sm text-gray-900">{(order.items || []).length} منتج</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {(order.items || []).reduce((sum, item) => sum + getItemQty(item), 0)} قطعة
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            order.paymentMethod === 'cod' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'بطاقة ائتمان'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          {renderStatusBadge(order.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3 space-x-reverse">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAccept(order)}
                                className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-1"
                                title="قبول الطلب"
                              >
                                <FaCheck className="w-4 h-4" />
                                <span className="text-sm">قبول</span>
                              </button>
                              <button 
                                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1"
                                onClick={() => handleStatusUpdate(order._id || order.id, 'cancelled')}
                                title="إلغاء الطلب"
                              >
                                <FaTimes className="w-4 h-4" />
                                <span className="text-sm">إلغاء</span>
                              </button>
                            </>
                          )}
                          
                          {order.status === 'processing' && (
                            <button 
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                              onClick={() => handleStatusUpdate(order._id || order.id, 'shipped')}
                              title="تم شحن الطلب"
                            >
                              <FaTruck className="w-4 h-4" />
                            </button>
                          )}
                          
                          {order.status === 'shipped' && (
                            <button 
                              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                              onClick={() => handleStatusUpdate(order._id || order.id, 'delivered')}
                              title="تأكيد الاستلام"
                            >
                              <FaCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button 
                onClick={() => currentPage > 1 && fetchRetailOrders(currentPage - 1, searchTerm)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                السابق
              </button>
              <button 
                onClick={() => currentPage < totalPages && fetchRetailOrders(currentPage + 1, searchTerm)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  صفحة <span className="font-medium">{currentPage}</span> من <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" dir="ltr">
                  <button 
                    onClick={() => fetchRetailOrders(currentPage - 1, searchTerm)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">السابق</span>
                    &larr;
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {currentPage}
                  </span>
                  <button 
                    onClick={() => fetchRetailOrders(currentPage + 1, searchTerm)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">التالي</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Customer Details Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={closeUserModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">تفاصيل العميل</h3>
              <button onClick={closeUserModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">الاسم:</span>
                <span className="font-medium text-gray-900">{selectedUser?.full_name || selectedUser?.name || selectedUser?.email || 'غير متوفر'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">البريد الإلكتروني:</span>
                <span className="font-medium text-gray-900">{selectedUser?.email || 'غير متوفر'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">رقم الجوال:</span>
                <span className="font-medium text-gray-900">{selectedUser?.phone || 'غير متوفر'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">نوع الحساب:</span>
                <span className="font-medium text-gray-900">
                  {selectedUser?.account_type === 'wholesale' ? 'جملة' : 'تجزئة'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ترقية حساب جملة:</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${selectedUser?.wholesale_access ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                  {selectedUser?.wholesale_access ? 'مفعل' : 'غير مفعل'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">تاريخ الميلاد:</span>
                <span className="font-medium text-gray-900">{selectedUser?.date_of_birth ? new Date(selectedUser.date_of_birth).toLocaleDateString('ar-SA') : 'غير متوفر'}</span>
              </div>
            </div>
            <div className="mt-6 text-left">
              <button onClick={closeUserModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">إغلاق</button>
            </div>
          </div>
        </div>
      )}
      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={closeInvoiceModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                فاتورة الطلب #{selectedOrder?.orderNumber || selectedOrder?._id?.substring(0,8)?.toUpperCase()}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">طباعة</button>
                <button onClick={closeInvoiceModal} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">إغلاق</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800 mb-2">بيانات الشحن</h4>
                <div className="flex justify-between">
                  <span className="text-gray-600">اسم الشحن:</span>
                  <span className="font-medium text-gray-900 text-left">
                    {(
                      selectedOrder?.shippingAddress?.full_name ||
                      selectedOrder?.shippingAddress?.name ||
                      selectedOrder?.shipping_address?.full_name ||
                      selectedOrder?.shipping_address?.name ||
                      [
                        selectedOrder?.shippingAddress?.first_name,
                        selectedOrder?.shippingAddress?.last_name
                      ].filter(Boolean).join(' ') ||
                      [
                        selectedOrder?.shipping_address?.first_name,
                        selectedOrder?.shipping_address?.last_name
                      ].filter(Boolean).join(' ')
                    ) || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">البريد الإلكتروني:</span>
                  <span className="font-medium text-gray-900">{selectedOrder?.shippingAddress?.email || selectedOrder?.shipping_address?.email || selectedOrder?.user?.email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">جوال الشحن:</span>
                  <span className="font-medium text-gray-900 text-left">
                    {selectedOrder?.shippingAddress?.phone ||
                      selectedOrder?.shipping_address?.phone || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">العنوان:</span>
                  <span className="font-medium text-gray-900 text-left">{formatAddress(selectedOrder)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الشارع:</span>
                  <span className="font-medium text-gray-900 text-left">
                    {extractStreet(
                      selectedOrder?.shippingAddress ||
                      selectedOrder?.shipping_address ||
                      selectedOrder?.billingAddress ||
                      selectedOrder?.billing_address ||
                      {}
                    ) || 'غير متوفر'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المدينة:</span>
                  <span className="font-medium text-gray-900 text-left">
                    {extractCity(
                      selectedOrder?.shippingAddress ||
                      selectedOrder?.shipping_address ||
                      selectedOrder?.billingAddress ||
                      selectedOrder?.billing_address ||
                      {}
                    ) || 'غير متوفر'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الحي:</span>
                  <span className="font-medium text-gray-900 text-left">
                    {extractDistrict(
                      selectedOrder?.shippingAddress ||
                      selectedOrder?.shipping_address ||
                      selectedOrder?.billingAddress ||
                      selectedOrder?.billing_address ||
                      {}
                    ) || '—'}
                  </span>
                </div>
                {/* Debug block: raw address JSON to discover exact keys */}
                <details className="mt-2 select-text">
                  <summary className="cursor-pointer text-xs text-gray-500">تفاصيل العنوان (Debug)</summary>
                  <div className="mt-1 grid grid-cols-1 gap-2">
                    <div>
                      <div className="text-[11px] text-gray-500">Shipping Address</div>
                      <pre className="text-[11px] bg-gray-50 p-2 rounded border overflow-auto max-h-40">
                        {JSON.stringify(selectedOrder?.shippingAddress || selectedOrder?.shipping_address || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500">Billing Address</div>
                      <pre className="text-[11px] bg-gray-50 p-2 rounded border overflow-auto max-h-40">
                        {JSON.stringify(selectedOrder?.billingAddress || selectedOrder?.billing_address || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800 mb-2">بيانات الطلب</h4>
                <div className="flex justify-between">
                  <span className="text-gray-600">التاريخ:</span>
                  <span className="font-medium text-gray-900">{selectedOrder?.createdAt ? formatDate(selectedOrder.createdAt) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الحالة:</span>
                  <span className="font-medium text-gray-900">{statusText(selectedOrder?.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">طريقة الدفع:</span>
                  <span className="font-medium text-gray-900">{selectedOrder?.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'بطاقة ائتمان'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم الطلب:</span>
                  <span className="font-medium text-gray-900">{selectedOrder?.orderNumber || selectedOrder?._id?.substring(0,8)?.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">السعر للوحدة</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(selectedOrder?.items || []).map((item, idx) => {
                    const name = item.product?.name || item.name || `منتج ${idx + 1}`;
                    const unit = getItemPrice(item);
                    const qty = getItemQty(item);
                    const line = unit * qty;
                    return (
                      <tr key={item.id || item._id || idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{unit.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{qty}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{line.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-600">إجمالي الفاتورة</div>
                <div className="text-xl font-bold text-gray-900">
                  {calculateTotal(selectedOrder?.items, selectedOrder).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailOrdersPage;
