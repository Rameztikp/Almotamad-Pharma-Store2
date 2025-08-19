import React, { useEffect, useMemo, useState } from 'react';
import { FaSearch, FaBoxOpen, FaEye, FaTruck, FaCheck, FaTimes } from 'react-icons/fa';
import { adminOrderService } from '../../services/admin/orderService';
import { toast } from 'react-toastify';
import { statusText, statusColor, normalizeStatus } from '../../utils/orderStatus';

const WholesaleOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & selections (align with Retail)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Wholesale orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  // Fetch wholesale orders (align with RetailOrdersPage using adminOrderService.getAllOrders)
  const fetchWholesaleOrders = async (search = '') => {
    try {
      setLoadingOrders(true);
      setOrdersError('');
      const res = await adminOrderService.getAllOrders({
        page: 1,
        limit: 10,
        order_type: 'wholesale',
        status: '',
        search,
      });
      const raw = res?.orders || res?.data || res || [];
      const list = Array.isArray(raw) ? raw : (raw.orders || []);
      // Map to current UI shape without changing table layout
      const mapped = list.map((o) => {
        const id = o.orderNumber || o.order_number || o.id || o._id || '';
        const customer = (
          o.shippingAddress?.full_name || o.shippingAddress?.name ||
          o.shipping_address?.full_name || o.shipping_address?.name ||
          o.customerName || o.user?.full_name || o.user?.name || o.user?.email || '—'
        );
        const date = (o.createdAt || o.created_at || '').toString().slice(0, 10);
        const items = Array.isArray(o.items) ? o.items.length : Array.isArray(o.order_items) ? o.order_items.length : 0;
        const total = (() => {
          if (typeof o.total === 'number') return o.total;
          const arr = Array.isArray(o.items) ? o.items : Array.isArray(o.order_items) ? o.order_items : [];
          return arr.reduce((sum, it) => {
            const price = Number(it.price || it.unit_price || it.unitPrice || 0);
            const qty = Number(it.quantity || it.qty || 1);
            return sum + price * qty;
          }, 0);
        })();
        const amount = `${Number(total || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
        const statusRaw = normalizeStatus(o.status || o.order_status || 'pending');
        const payment = o.paymentStatus === 'paid' || o.payment_status === 'paid' ? 'تم الدفع' : '—';
        return { id, customer, date, amount, statusRaw, items, payment, _raw: o };
      });
      setOrders(mapped);
    } catch (err) {
      console.error('Error fetching wholesale orders:', err);
      setOrdersError('فشل في تحميل طلبات الجملة');
      toast.error('فشل في تحميل طلبات الجملة');
    } finally {
      setLoadingOrders(false);
    }
  };


  // Debounced search effect (orders only)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchWholesaleOrders(searchTerm.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Initial load (orders only)
  useEffect(() => {
    fetchWholesaleOrders('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After server-side search, still keep client filter as fallback
  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return orders.filter(order =>
      order.id.toString().toLowerCase().includes(term) ||
      (order.customer || '').toString().toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  // ===== Helpers (aligned with Retail) =====
  const extractStreet = (addr = {}) =>
    addr.address_line1 || addr.addressLine1 || addr.AddressLine1 || addr.address1 || addr.line1 || addr.address || addr.Address || addr.street || addr.street_name || addr.streetName || addr.street_address || addr.streetAddress || addr.street_ar || addr.street_name_ar || addr.address_line2 || '';

  const extractDistrict = (addr = {}) =>
    addr.district || addr.neighborhood || addr.neighbourhood || addr.neighborhood_ar || addr.district_ar || addr.area || addr.area_name || '';

  const extractCity = (addr = {}) =>
    addr.city || addr.City || addr.city_ar || addr.municipality || '';

  const getCustomerName = (order) => (
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

  const toNumber = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
    return isNaN(n) ? 0 : n;
  };

  const getItemPrice = (item) => {
    const price = item.price ?? item.unit_price ?? item.unitPrice ?? item.sale_price ?? item.salePrice ?? item.product?.sale_price ?? item.product?.price ?? 0;
    return toNumber(price);
  };

  const getItemQty = (item) => toNumber(item.quantity ?? item.qty ?? 0);

  const calculateTotal = (items = [], order = null) => {
    if (order) {
      const provided = order.total_amount ?? order.totalAmount ?? order.total ?? null;
      if (provided != null && !isNaN(toNumber(provided))) return toNumber(provided);
    }
    const total = (Array.isArray(items) ? items : []).reduce((sum, it) => sum + getItemPrice(it) * getItemQty(it), 0);
    return toNumber(total);
  };

  const formatAddress = (order) => {
    const addr = order?.shippingAddress || order?.shipping_address || order?.ShippingAddress || order?.shipping || order?.address || order?.billingAddress || order?.billing_address || {};
    const direct = addr.address || addr.full_address || addr.fullAddress;
    if (direct && typeof direct === 'string') return direct;
    const line1 = addr.address_line1 || addr.addressLine1 || addr.AddressLine1 || addr.address1 || addr.line1 || addr.street || addr.street_name || addr.streetName || addr.street_ar || addr.street_name_ar || '';
    const line2 = addr.address_line2 || addr.addressLine2 || addr.AddressLine2 || addr.address2 || addr.line2 || addr.apartment || addr.unit || addr.flat || '';
    const district = addr.district || addr.neighborhood || addr.neighbourhood || addr.neighborhood_ar || addr.district_ar || addr.area || addr.area_name || '';
    const building = addr.building_no || addr.building || '';
    const additional = addr.additional_no || addr.additionalNumber || '';
    const landmark = addr.landmark || '';
    const city = addr.city || '';
    const state = addr.state || addr.region || addr.province || '';
    const postal = addr.postal_code || addr.postalCode || addr.zip || addr.zipCode || '';
    const country = addr.country || '';
    const rawParts = [line1, line2, district, building, additional, landmark, city, state, postal, country]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);
    const seen = new Set();
    const parts = rawParts.filter((p) => { if (seen.has(p)) return false; seen.add(p); return true; });
    return parts.length ? parts.join('، ') : '—';
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const renderStatusBadge = (status) => {
    const cls = statusColor(status);
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}`}>
        {statusText(status)}
      </span>
    );
  };

  // ===== Invoice modal control =====
  const openInvoiceModal = (order) => {
    setSelectedOrder(order || null);
    setShowInvoiceModal(true);
    try {
      const sa = order?.shippingAddress || order?.shipping_address;
      const ba = order?.billingAddress || order?.billing_address;
      console.log('[Wholesale Invoice] shippingAddress JSON:', sa ? JSON.stringify(sa, null, 2) : null);
      console.log('[Wholesale Invoice] billingAddress JSON:', ba ? JSON.stringify(ba, null, 2) : null);
    } catch (_) {}
  };
  const closeInvoiceModal = () => { setShowInvoiceModal(false); setSelectedOrder(null); };

  // ===== Actions (accept / update status) =====
  const handleAccept = async (order) => {
    const oid = order?._id || order?.id;
    if (!oid) { toast.error('تعذر تحديد رقم الطلب'); return; }
    try {
      await adminOrderService.updateOrderStatus(oid, 'processing', 'wholesale');
      toast.success('تم قبول الطلب وتحويله إلى قيد التجهيز');

      let latest = null;
      try { latest = await adminOrderService.getOrderDetails(oid, 'wholesale'); } catch (_) {}

      const updated = latest ? { ...latest } : { ...order, status: 'processing', _id: order._id || undefined, id: order.id || undefined };
      setSelectedOrder(updated);
      setShowInvoiceModal(true);

      setTimeout(() => { try { window.print(); } catch (_) {} }, 300);

      fetchWholesaleOrders(searchTerm);
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('فشل قبول الطلب');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await adminOrderService.updateOrderStatus(orderId, newStatus, 'wholesale');
      toast.success('تم تحديث حالة الطلب بنجاح');
      fetchWholesaleOrders(searchTerm);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('فشل في تحديث حالة الطلب');
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">إدارة طلبات الجملة</h1>
        <div className="relative mt-4 md:mt-0">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ابحث عن طلب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Header */}
      <div className="border-b border-gray-200 mb-6">
        <div className="py-4 px-1 font-medium text-sm text-blue-600 flex items-center">
          <FaBoxOpen className="inline-block ml-2" />
          الطلبات
        </div>
      </div>

      {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المجموع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingOrders && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-gray-500">جاري التحميل...</td>
                  </tr>
                )}
                {ordersError && !loadingOrders && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-red-600">{ordersError}</td>
                  </tr>
                )}
                {!loadingOrders && !ordersError && filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={() => openInvoiceModal(order._raw)}
                        title="عرض الفاتورة"
                      >
                        #{order.id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        {renderStatusBadge(order.statusRaw)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3 space-x-reverse">
                        {order.statusRaw === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAccept(order._raw)}
                              className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-1"
                              title="قبول الطلب"
                            >
                              <FaCheck className="w-4 h-4" />
                              <span className="text-sm">قبول</span>
                            </button>
                            <button
                              className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1"
                              onClick={() => handleStatusUpdate(order._raw._id || order._raw.id, 'cancelled')}
                              title="إلغاء الطلب"
                            >
                              <FaTimes className="w-4 h-4" />
                              <span className="text-sm">إلغاء</span>
                            </button>
                          </>
                        )}
                        {order.statusRaw === 'processing' && (
                          <button
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                            onClick={() => handleStatusUpdate(order._raw._id || order._raw.id, 'shipped')}
                            title="تم شحن الطلب"
                          >
                            <FaTruck className="w-4 h-4" />
                          </button>
                        )}
                        {order.statusRaw === 'shipped' && (
                          <button
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                            onClick={() => handleStatusUpdate(order._raw._id || order._raw.id, 'delivered')}
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
        </div>
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
                    {(selectedOrder?.shippingAddress?.full_name || selectedOrder?.shippingAddress?.name || selectedOrder?.shipping_address?.full_name || selectedOrder?.shipping_address?.name || [selectedOrder?.shippingAddress?.first_name, selectedOrder?.shippingAddress?.last_name].filter(Boolean).join(' ') || [selectedOrder?.shipping_address?.first_name, selectedOrder?.shipping_address?.last_name].filter(Boolean).join(' ')) || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">البريد الإلكتروني:</span>
                  <span className="font-medium text-gray-900">{selectedOrder?.shippingAddress?.email || selectedOrder?.shipping_address?.email || selectedOrder?.user?.email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">جوال الشحن:</span>
                  <span className="font-medium text-gray-900 text-left">{selectedOrder?.shippingAddress?.phone || selectedOrder?.shipping_address?.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">العنوان:</span>
                  <span className="font-medium text-gray-900 text-left">{formatAddress(selectedOrder)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الشارع:</span>
                  <span className="font-medium text-gray-900 text-left">{extractStreet(selectedOrder?.shippingAddress || selectedOrder?.shipping_address || selectedOrder?.billingAddress || selectedOrder?.billing_address || {}) || 'غير متوفر'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المدينة:</span>
                  <span className="font-medium text-gray-900 text-left">{extractCity(selectedOrder?.shippingAddress || selectedOrder?.shipping_address || selectedOrder?.billingAddress || selectedOrder?.billing_address || {}) || 'غير متوفر'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الحي:</span>
                  <span className="font-medium text-gray-900 text-left">{extractDistrict(selectedOrder?.shippingAddress || selectedOrder?.shipping_address || selectedOrder?.billingAddress || selectedOrder?.billing_address || {}) || '—'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800 mb-2">بيانات الطلب</h4>
                <div className="flex justify-between">
                  <span className="text-gray-600">التاريخ:</span>
                  <span className="font-medium text-gray-900">{selectedOrder?.createdAt ? formatDate(selectedOrder.createdAt) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الحالة:</span>
                  <span className="font-medium text-gray-900">{statusText(normalizeStatus(selectedOrder?.status))}</span>
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
                  {(selectedOrder?.items || selectedOrder?.order_items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-700">{item.product?.name || item.name || item.title || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{getItemPrice(item).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{getItemQty(item)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{(getItemPrice(item) * getItemQty(item)).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-4 py-2 text-sm font-semibold" colSpan={3}>المجموع الكلي</td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">{calculateTotal(selectedOrder?.items, selectedOrder).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesaleOrdersPage;
