import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Calendar,
  Search,
  AlertCircle
} from 'lucide-react';
import Toast from './Toast';
import { orderService } from '../services/orderService';

const OrderTrackingPage = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  const [userOrders, setUserOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ isVisible: true, message, type });
  };

  // جلب طلبات المستخدم لعرضها مع حالتها
  useEffect(() => {
    const token =
      localStorage.getItem('client_auth_token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('token');
    if (!token) return; // المستخدم غير مسجل دخول

    const fetchOrders = async () => {
      try {
        setIsLoadingOrders(true);
        const res = await orderService.getUserOrders();
        const list = res?.data?.data || res?.data || [];
        const orders = Array.isArray(list) ? list : (Array.isArray(list?.orders) ? list.orders : []);
        setUserOrders(orders);
      } catch (err) {
        console.error('Failed to load user orders:', err);
      } finally {
        setIsLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

  const hideToast = () => {
    setToast({ isVisible: false, message: '', type: 'success' });
  };

  // سيتم جلب بيانات الطلب من API بدلاً من البيانات التجريبية

  const handleTrackOrder = async () => {
    if (!orderNumber.trim()) {
      showToast('يرجى إدخال رقم الطلب', 'error');
      return;
    }

    try {
      setIsLoading(true);
      setOrderData(null);

      // استدعاء خدمة التتبع - يفترض أن orderNumber هو معرف الطلب
      const res = await orderService.trackOrder(orderNumber.trim());
      const raw = res?.data?.data || res?.data || res;

      if (!raw) {
        showToast('لم يتم العثور على بيانات الطلب', 'error');
        setIsLoading(false);
        return;
      }

      // تطبيع البيانات القادمة من السيرفر إلى الشكل المطلوب في الواجهة
      const normalized = {
        orderNumber: raw.order_number || raw.orderNumber || raw.id || orderNumber.trim(),
        status: raw.status || 'pending',
        orderDate: raw.order_date || raw.created_at || raw.createdAt || '',
        estimatedDelivery: raw.estimated_delivery || raw.estimatedDelivery || '',
        actualDelivery: raw.delivered_at || raw.deliveredAt || '',
        total: Number(raw.total || raw.total_amount || raw.totalAmount || 0),
        items: Array.isArray(raw.items)
          ? raw.items.map((it) => ({
              name: it.name || it.product_name || it.product?.name || 'منتج',
              quantity: it.quantity || it.qty || 1,
              price: Number(it.price || it.unit_price || it.product?.price || 0),
            }))
          : [],
        shippingAddress: {
          name:
            raw.shipping_name ||
            raw.shipping?.name ||
            raw.customer_name ||
            raw.customer?.name ||
            'العميل',
          phone:
            raw.shipping_phone ||
            raw.shipping?.phone ||
            raw.customer_phone ||
            raw.customer?.phone ||
            '',
          address:
            raw.shipping_address ||
            raw.shipping?.address ||
            raw.address ||
            '',
        },
        trackingSteps: Array.isArray(raw.tracking)
          ? raw.tracking.map((t) => ({
              status: t.status || t.code || 'pending',
              title: t.title || 'حالة الطلب',
              description: t.description || '',
              date: t.date || t.at || '',
              completed: Boolean(t.completed ?? ['confirmed','processing','shipped','out_for_delivery','delivered'].includes(t.status)),
            }))
          : [],
      };

      // إذا لم يرسل السيرفر تتبع تفصيلي، أنشئ خط زمني بسيط اعتماداً على الحالة
      if (!normalized.trackingSteps.length && normalized.status) {
        const orderTs = normalized.orderDate || '';
        const steps = [
          { status: 'confirmed', title: 'تأكيد الطلب', description: 'تم تأكيد طلبك', date: orderTs },
          { status: 'processing', title: 'تحضير الطلب', description: 'جاري التحضير', date: '' },
          { status: 'shipped', title: 'شحن الطلب', description: 'تم الشحن', date: '' },
          { status: 'out_for_delivery', title: 'خرج للتوصيل', description: 'مع المندوب', date: '' },
          { status: 'delivered', title: 'تم التسليم', description: 'اكتمل التسليم', date: normalized.actualDelivery || '' },
        ];
        const indexMap = {
          pending: 0,
          confirmed: 1,
          processing: 2,
          shipped: 3,
          out_for_delivery: 4,
          delivered: 5,
          canceled: -1,
          cancelled: -1,
        };
        const idx = indexMap[normalized.status] ?? 0;
        normalized.trackingSteps = steps.map((s, i) => ({ ...s, completed: idx >= i }));
      }

      setOrderData(normalized);
      showToast('تم العثور على الطلب بنجاح', 'success');
    } catch (error) {
      console.error('Track order failed:', error);
      const msg = error?.response?.data?.message || 'لم يتم العثور على الطلب. يرجى التحقق من رقم الطلب';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-400';
      case 'confirmed':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'shipped':
        return 'bg-purple-500';
      case 'out_for_delivery':
        return 'bg-orange-500';
      case 'delivered':
        return 'bg-green-500';
      case 'canceled':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'confirmed':
        return 'مؤكد';
      case 'processing':
        return 'قيد التحضير';
      case 'shipped':
        return 'تم الشحن';
      case 'out_for_delivery':
        return 'خرج للتوصيل';
      case 'delivered':
        return 'تم التسليم';
      case 'canceled':
      case 'cancelled':
        return 'ملغي';
      default:
        return 'قيد الانتظار';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5" />;
      case 'processing':
        return <Package className="w-5 h-5" />;
      case 'shipped':
        return <Truck className="w-5 h-5" />;
      case 'out_for_delivery':
        return <MapPin className="w-5 h-5" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">تتبع الطلب</h1>
          <p className="text-lg text-gray-600">أدخل رقم طلبك لمتابعة حالة التوصيل</p>
        </div>

        {/* قائمة طلباتي (إن وُجدت) */}
        {userOrders.length > 0 && (
          <Card className="max-w-4xl mx-auto mb-8">
            <CardHeader>
              <CardTitle>طلباتي</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingOrders ? (
                <div className="text-gray-500">جاري تحميل الطلبات...</div>
              ) : (
                <div className="divide-y">
                  {userOrders.map((o, idx) => {
                    const id = o.order_number || o.orderNumber || o.id || '';
                    const status = o.status || 'pending';
                    const total = Number(o.total || o.total_amount || o.totalAmount || 0);
                    const created = o.order_date || o.created_at || o.createdAt || '';
                    return (
                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">رقم الطلب: {id}</span>
                            <Badge className={`${getStatusColor(status)} text-white`}>{getStatusText(status)}</Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span>التاريخ: {created}</span>
                            {total ? <span className="ml-3">الإجمالي: {total.toFixed(2)} ريال</span> : null}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              setOrderNumber(String(id));
                              // تتبع سريع
                              setTimeout(() => handleTrackOrder(), 0);
                            }}
                          >
                            تتبع
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Search Section */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="text-center">البحث عن الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="أدخل رقم الطلب (مثال: ORD-2024-001)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="flex-1 text-right"
                onKeyPress={(e) => e.key === 'Enter' && handleTrackOrder()}
              />
              <Button 
                onClick={handleTrackOrder}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Clock className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Search className="w-4 h-4 ml-2" />
                )}
                {isLoading ? 'جاري البحث...' : 'تتبع'}
              </Button>
            </div>
            
            {/* تلميح: أدخل رقم طلبك كما استلمته بعد الشراء */}
          </CardContent>
        </Card>

        {/* Order Details */}
        {orderData && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>تفاصيل الطلب</CardTitle>
                  <Badge className={`${getStatusColor(orderData.status)} text-white`}>
                    {getStatusText(orderData.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">رقم الطلب</p>
                    <p className="font-semibold">{orderData.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">تاريخ الطلب</p>
                    <p className="font-semibold">{orderData.orderDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">التوصيل المتوقع</p>
                    <p className="font-semibold">{orderData.estimatedDelivery}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">إجمالي المبلغ</p>
                    <p className="font-semibold text-green-600">{orderData.total.toFixed(2)} ريال</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>مراحل التتبع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderData.trackingSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        step.completed ? getStatusColor(step.status) : 'bg-gray-300'
                      } text-white`}>
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className={`font-semibold ${step.completed ? 'text-gray-800' : 'text-gray-500'}`}>
                              {step.title}
                            </h3>
                            <p className={`text-sm ${step.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                              {step.description}
                            </p>
                          </div>
                          {step.date && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {step.date}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>عنوان التوصيل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <p className="font-semibold">{orderData.shippingAddress.name}</p>
                    <p className="text-gray-600">{orderData.shippingAddress.address}</p>
                    <div className="flex items-center gap-1 mt-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{orderData.shippingAddress.phone}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>المنتجات المطلوبة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orderData.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">الكمية: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-green-600">{item.price.toFixed(2)} ريال</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2">هل تحتاج مساعدة؟</h3>
                    <p className="text-blue-700 text-sm mb-3">
                      إذا كان لديك أي استفسار حول طلبك، يمكنك التواصل معنا:
                    </p>
                    <div className="space-y-1 text-sm text-blue-700">
                      <p>📞 خدمة العملاء: 920000000</p>
                      <p>📧 البريد الإلكتروني: support@almutamad-pharma.com</p>
                      <p>⏰ ساعات العمل: من 8 صباحاً إلى 10 مساءً</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default OrderTrackingPage;

