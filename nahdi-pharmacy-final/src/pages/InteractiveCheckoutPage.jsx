import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, MapPin, ShoppingBag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useShop } from '../context/useShop';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import { handleImageError } from '../utils/imageUtils';
 // Default center (Sana'a, Yemen). Google Maps usage is optional; component works without it.
const DEFAULT_CENTER = { lat: 15.3694, lng: 44.1910 };

// Yemen governorates / major cities list (Arabic)
const YEMEN_CITIES = [
  'صنعاء',
  'عدن',
  'تعز',
  'إب',
  'الحديدة',
  'حضرموت',
  'ذمار',
  'البيضاء',
  'حجة',
  'المحويت',
  'ريمة',
  'صعدة',
  'عمران',
  'الجوف',
  'مأرب',
  'شبوة',
  'لحج',
  'أبين',
  'الضالع',
  'سقطرى',
  'المهرة',
  'بني مطر',
  'سنحان',
  'خولان',
];

export default function InteractiveCheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [orderComplete, setOrderComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: 'صنعاء',
    district: '',
    street: '',
    location: { ...DEFAULT_CENTER },
  });

  const { cartItems, clearCart, user, loadUser } = useShop();
  const navigate = useNavigate();

  // Scoped persist of last shipping address
  const saveLastShipping = (info) => {
    try {
      const payload = {
        address: info?.address || '',
        city: info?.city || '',
        district: info?.district || '',
        street: info?.street || '',
      };
      const rawUser = localStorage.getItem('client_user_data') || localStorage.getItem('userData');
      let uid = '';
      try { uid = rawUser ? (JSON.parse(rawUser)?.id || '') : ''; } catch (_) {}
      const scopedKey = `last_shipping_address_${uid}`;
      localStorage.setItem(scopedKey, JSON.stringify(payload));
      // legacy fallback
      localStorage.setItem('last_shipping_address', JSON.stringify(payload));
    } catch (_) {}
  };

  const loadLastShipping = () => {
    try {
      const rawUser = localStorage.getItem('client_user_data') || localStorage.getItem('userData');
      let uid = '';
      try { uid = rawUser ? (JSON.parse(rawUser)?.id || '') : ''; } catch (_) {}
      const scopedKey = `last_shipping_address_${uid}`;
      const candidates = [scopedKey, 'last_shipping_address'];
      for (const k of candidates) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (_) {}
      }
      return null;
    } catch (_) {
      return null;
    }
  };

  // Prefill from user account without overriding user typing
  useEffect(() => {
    if (!user) return;
    setShippingInfo(prev => {
      const next = { ...prev };
      const accName = user.full_name || user.name;
      if (accName && !prev.fullName) next.fullName = accName;
      if (!prev.phone && user.phone) {
        const raw = String(user.phone).trim();
        const digits = raw.replace(/[^\d+]/g, '');
        let local = digits;
        if (local.startsWith('+967')) local = local.slice(4);
        else if (local.startsWith('00967')) local = local.slice(5);
        else if (local.startsWith('967')) local = local.slice(3);
        const onlyNums = local.replace(/\D/g, '');
        if (/^7\d{8}$/.test(onlyNums)) next.phone = onlyNums;
      }
      if (user.email && !prev.email) next.email = user.email;
      return next;
    });
  }, [user]);

  // Auth check on mount (gracefully)
  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        // حاول تحميل المستخدم بالاعتماد على جلسة الكوكيز
        if (!user || !user.id) {
          try { await loadUser(); } catch (_) {}
        }
        // إذا لم يكن المستخدم مصادقًا بعد محاولة التحميل، وجّه لصفحة تسجيل الدخول
        if (!user || !user.id) {
          navigate('/login', { state: { from: '/checkout', message: 'يجب تسجيل الدخول للمتابعة إلى الدفع' }, replace: true });
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [navigate, user, loadUser]);

  // Prefill from last saved shipping
  useEffect(() => {
    const saved = loadLastShipping();
    if (!saved) return;
    setShippingInfo(prev => ({
      ...prev,
      address: prev.address || saved.address || '',
      city: prev.city || saved.city || 'صنعاء',
      district: prev.district || saved.district || '',
      street: prev.street || saved.street || '',
    }));
  }, []);

  // Debounced persist of shipping to profile (non-blocking)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const rawAddr = (shippingInfo?.address || '').trim();
        const composed = rawAddr || [shippingInfo?.city, shippingInfo?.district, shippingInfo?.street]
          .map(s => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean)
          .join('، ');
        if (!composed) return;
        if (!user || !user.id) return;
        await authService.updateProfile({ address: composed });
      } catch (_) {}
    }, 1200);
    return () => clearTimeout(t);
  }, [shippingInfo.address, shippingInfo.city, shippingInfo.district, shippingInfo.street, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const product = item?.product || item || {};
    const price = Number(product.price) || Number(product.attributes?.price) || Number(item?.price) || 0;
    const quantity = Number(item?.quantity) || 1;
    return sum + price * quantity;
  }, 0);
  const shipping = subtotal >= 100 || subtotal === 0 ? 0 : 15;
  const total = subtotal + shipping;

  if (cartItems.length === 0 && !orderComplete) {
    return (
      <div className="container mx-auto p-4 rtl:text-right min-h-screen">
        <div className="text-center py-16">
          <ShoppingBag className="mx-auto h-24 w-24 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">سلة التسوق فارغة</h2>
          <p className="text-gray-500 mb-8">لا يمكن إتمام عملية الدفع بدون منتجات في السلة</p>
          <Link to="/products">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">تصفح المنتجات</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isValidYemeniPhone = (phone) => /^7\d{8}$/.test(String(phone || ''));

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    if (!shippingInfo.fullName || !isValidYemeniPhone(shippingInfo.phone) || !shippingInfo.email || !shippingInfo.city || !shippingInfo.district || !shippingInfo.address) {
      toast.error('الرجاء التأكد من صحة جميع البيانات');
      return;
    }
    saveLastShipping(shippingInfo);
    setCurrentStep(2);
  };

  const handleOrderConfirm = async () => {
    if (!shippingInfo.fullName || !isValidYemeniPhone(shippingInfo.phone) || !shippingInfo.email || !shippingInfo.address || !shippingInfo.city || !shippingInfo.district) {
      toast.error('الرجاء التأكد من صحة جميع البيانات المدخلة');
      return;
    }
    try {
      setIsSubmitting(true);
      saveLastShipping(shippingInfo);
      try {
        const rawAddr = (shippingInfo?.address || '').trim();
        const composed = rawAddr || [shippingInfo?.city, shippingInfo?.district, shippingInfo?.street]
          .map(s => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean)
          .join('، ');
        if (composed) await authService.updateProfile({ address: composed });
      } catch (_) {}

      const orderItems = [];
      for (const item of cartItems) {
        const product = item?.product || item || {};
        const productId = product.id || product._id;
        const productName = product.name || 'منتج بدون اسم';
        let price = Number(product.price);
        if (!price) price = Number(product.attributes?.price);
        if (!price) price = Number(item?.price);
        if (!price || isNaN(price) || price <= 0) {
          toast.error(`سعر غير صالح للمنتج: ${productName}`);
          return;
        }
        orderItems.push({
          product_id: productId,
          product: { id: productId, name: productName, price, ...(product.attributes || {}) },
          quantity: Math.max(1, parseInt(item?.quantity) || 1),
          price,
          name: productName,
          image: product.images?.[0] || product.image || product.attributes?.images?.[0] || '',
        });
      }
      if (orderItems.length === 0) throw new Error('لا توجد عناصر في سلة التسوق');

      const fullNameSafe = (shippingInfo.fullName || '').trim();
      const [__first, ...__rest] = fullNameSafe.split(/\s+/).filter(Boolean);
      const __last = __rest.join(' ');
      const composedAddr = (shippingInfo.address || '').trim() || [shippingInfo.city || 'صنعاء', shippingInfo.district || '', shippingInfo.street || '']
        .map(s => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .join('، ');

      const shippingAddress = {
        full_name: fullNameSafe,
        name: fullNameSafe,
        first_name: __first || fullNameSafe,
        last_name: __last || '',
        phone: (shippingInfo.phone || '').trim(),
        email: (shippingInfo.email || '').trim(),
        address: composedAddr,
        address_line1: composedAddr,
        city: shippingInfo.city || 'صنعاء',
        district: shippingInfo.district || '',
        street: shippingInfo.street || '',
        postal_code: shippingInfo.postalCode || '',
        location: shippingInfo.location || null,
      };

      const orderData = {
        payment_method: 'cash_on_delivery',
        notes: 'تم إنشاء الطلب من الموقع الإلكتروني',
        shipping_address: shippingAddress,
        billing_address: null,
        items: orderItems,
        subtotal: Number(subtotal.toFixed(2)),
        shipping: Number(shipping.toFixed(2)),
        total: Number(total.toFixed(2)),
      };

      const response = await orderService.createOrder(orderData);
      let orderResponse;
      if (Array.isArray(response)) orderResponse = response[0];
      else if (response && typeof response === 'object') orderResponse = response.data?.data || response.data || response;
      if (!orderResponse || typeof orderResponse !== 'object') throw new Error('استجابة غير صالحة من الخادم');
      const oid = orderResponse.id || orderResponse._id || orderResponse.order_id || orderResponse.order_number || orderResponse.orderNumber;
      if (!oid) throw new Error('لم يتم العثور على معرف الطلب في استجابة الخادم');
      setOrderId(oid);
      setOrderComplete(true);
      setCurrentStep(4);
      clearCart();
      toast.success(`تم إنشاء الطلب #${oid} بنجاح!`);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'حدث خطأ أثناء إنشاء الطلب. يرجى المحاولة مرة أخرى.';
      toast.error(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'معلومات الشحن', icon: MapPin },
    { id: 2, title: 'مراجعة الطلب', icon: Check },
    { id: 3, title: 'تأكيد الطلب', icon: Check },
  ];

  if (orderComplete) {
    const orderNumber = orderId || `NH${Date.now().toString().slice(-6)}`;
    return (
      <div className="container mx-auto p-4 rtl:text-right min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-16">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح!</h2>
            <p className="text-gray-600 mb-8">سيتم التواصل معك قريباً لتأكيد الطلب وتحديد ميعاد التوصيل</p>
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6 text-right">
              <h3 className="font-medium text-gray-900 mb-4">معلومات الطلب</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between"><span>رقم الطلب</span><span className="font-medium text-gray-900">#{orderNumber}</span></div>
                <div className="flex justify-between"><span>تاريخ الطلب</span><span className="font-medium text-gray-900">{new Date().toLocaleDateString('ar-SA')}</span></div>
                <div className="flex justify-between items-center"><span>طريقة الدفع</span><span className="font-medium text-gray-900">الدفع عند الاستلام</span></div>
                <div className="flex justify-between"><span>المبلغ المتوقع</span><span className="font-medium text-gray-900">{total} ر.س</span></div>
              </div>
              <div className="mt-6 p-3 bg-blue-50 rounded-md border border-blue-100">
                <p className="text-sm text-blue-700 text-right">سيتم الاتصال بك قريباً لتأكيد الطلب وتحديد المبلغ النهائي وتفاصيل التوصيل</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/shop" className="w-full sm:w-auto"><Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">العودة إلى المتجر</Button></Link>
              <Link to="/my-orders" className="w-full sm:w-auto"><Button variant="outline" className="w-full"><ShoppingBag className="ml-1.5 h-4 w-4" />عرض طلباتي</Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 rtl:text-right">
      <nav className="text-sm text-gray-600 mb-6">
        <Link to="/" className="hover:text-blue-600">الرئيسية</Link> &gt; <Link to="/cart" className="hover:text-blue-600 mr-1">السلة</Link> &gt; <span className="text-blue-600 mr-1">الدفع</span>
      </nav>

      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <step.icon className="h-5 w-5" />
              </div>
              <span className={`mr-2 rtl:ml-2 text-sm ${currentStep >= step.id ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>{step.title}</span>
              {index < steps.length - 1 && (<div className={`w-8 h-0.5 mx-4 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}`} />)}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><MapPin className="h-6 w-6 ml-2 rtl:mr-2" />معلومات الشحن</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">الاسم الكامل *</label>
                      <Input type="text" required value={shippingInfo.fullName} onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })} placeholder="أدخل اسمك الكامل" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">رقم الجوال *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-gray-500">+967</span></div>
                        <Input type="tel" required value={shippingInfo.phone} onChange={(e) => { const phoneNumber = e.target.value.replace(/\D/g, ''); if (phoneNumber === '' || phoneNumber.startsWith('7')) setShippingInfo({ ...shippingInfo, phone: phoneNumber }); }} onBlur={(e) => { if (e.target.value && !isValidYemeniPhone(e.target.value)) { toast.error('رقم الجوال يجب أن يبدأ بـ 7 ويتكون من 9 أرقام'); } }} placeholder="7xxxxxxxx" className={`pr-12 ${shippingInfo.phone && !isValidYemeniPhone(shippingInfo.phone) ? 'border-red-500' : ''}`} maxLength={9} />
                      </div>
                      {shippingInfo.phone && !isValidYemeniPhone(shippingInfo.phone) && (<p className="mt-1 text-sm text-red-600">رقم الجوال يجب أن يبدأ بـ 7 ويتكون من 9 أرقام</p>)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">البريد الإلكتروني {user?.email ? '(تم تعبئته تلقائياً)' : ''}</label>
                    <Input type="email" required value={shippingInfo.email} onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })} placeholder="example@email.com" disabled={!!user?.email} className={user?.email ? 'bg-gray-100' : ''} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">العنوان</label>
                    <Input type="text" required value={shippingInfo.address} onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })} placeholder="اسم المدينة، الحي، الشارع" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">المدينة</label>
                      <select
                        className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                      >
                        {YEMEN_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">الحي</label>
                      <Input type="text" value={shippingInfo.district} onChange={(e) => setShippingInfo({ ...shippingInfo, district: e.target.value })} placeholder="الحي" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">الشارع</label>
                      <Input type="text" value={shippingInfo.street} onChange={(e) => setShippingInfo({ ...shippingInfo, street: e.target.value })} placeholder="الشارع" />
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Link to="/cart"><Button variant="outline">الرجوع إلى السلة</Button></Link>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">متابعة</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader><CardTitle>مراجعة الطلب</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item, idx) => {
                    const product = item?.product || item || {};
                    const price = Number(product.price) || Number(product.attributes?.price) || Number(item?.price) || 0;
                    const quantity = Number(item?.quantity) || 1;
                    return (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <img src={product.images?.[0] || product.image || ''} alt={product.name} className="w-16 h-16 object-cover rounded-md border border-gray-100" onError={handleImageError} />
                          <div className="mr-3">
                            <p className="font-medium text-gray-800">{product.name}</p>
                            <p className="text-sm text-gray-500">الكمية: {quantity}</p>
                          </div>
                        </div>
                        <p className="font-medium">{(price * quantity).toFixed(2)} ريال</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-2 text-sm border-t border-gray-100 pt-4">
                  <div className="flex justify-between"><span>المجموع الفرعي:</span><span>{subtotal.toFixed(2)} ريال</span></div>
                  <div className="flex justify-between"><span>رسوم الشحن:</span><span>{shipping === 0 ? 'مجاني' : `${(shipping || 0).toFixed(2)} ريال`}</span></div>
                  <div className="flex justify-between font-semibold text-base border-t border-gray-100 pt-3 mt-3"><span>المجموع الكلي:</span><span className="text-green-600">{(total || 0).toFixed(2)} ريال</span></div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>تعديل العنوان</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setCurrentStep(3)}>تأكيد</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader><CardTitle>تأكيد الطلب</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-700">
                  <div><span className="font-medium">اسم الشحن: </span>{shippingInfo.fullName}</div>
                  <div><span className="font-medium">جوال الشحن: </span>{shippingInfo.phone}</div>
                  <div><span className="font-medium">العنوان: </span>{shippingInfo.address}</div>
                </div>
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>رجوع</Button>
                  <Button disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white" onClick={handleOrderConfirm}>{isSubmitting ? 'جارٍ الإرسال...' : 'إنهاء الطلب'}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Summary */}
        <div>
          <Card>
            <CardHeader><CardTitle>ملخص الطلب</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{subtotal.toFixed(2)} ريال</span></div>
                <div className="flex justify-between"><span>الشحن</span><span>{shipping === 0 ? 'مجاني' : `${(shipping || 0).toFixed(2)} ريال`}</span></div>
                <div className="flex justify-between font-semibold text-base border-t border-gray-100 pt-3 mt-3"><span>الإجمالي</span><span className="text-green-600">{(total || 0).toFixed(2)} ريال</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
