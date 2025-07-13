import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CreditCard, MapPin, User, Phone, Mail, Lock, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useShop } from '../context/useShop';
import { orderService } from '../services/orderService';
import { toast } from 'react-hot-toast';
import { handleImageError, getPlaceholderImage } from '../utils/imageUtils';

const InteractiveCheckoutPage = () => {
  // All state declarations at the top
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
    city: 'تعز',
    district: '',
    postalCode: ''
  });
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  
  // Hooks with side effects
  const { 
    cartItems, 
    clearCart, 
    user, 
    loadUser, 
    isAuthenticated: isShopAuthenticated 
  } = useShop();
  
  const navigate = useNavigate();
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('authToken');
        
        // If no token, redirect to login
        if (!token) {
          navigate('/login', { 
            state: { 
              from: '/checkout', 
              message: 'يجب تسجيل الدخول للمتابعة إلى الدفع' 
            }, 
            replace: true 
          });
          return;
        }
        
        // Check token expiration
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('authToken');
            navigate('/login', { 
              state: { 
                from: '/checkout', 
                message: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.' 
              }, 
              replace: true 
            });
            return;
          }
        } catch (e) {
          console.error('Error parsing token:', e);
          localStorage.removeItem('authToken');
          navigate('/login', { 
            state: { 
              from: '/checkout', 
              message: 'خطأ في مصادقة المستخدم. يرجى تسجيل الدخول مرة أخرى.' 
            }, 
            replace: true 
          });
          return;
        }
        
        // Load user if not already loaded
        if (!user || !user.id) {
          try {
            const userData = await loadUser();
            
            // If user is a guest (couldn't load profile) but we have a token, continue
            if (!userData || userData.isGuest) {
              console.log('Proceeding with guest user for checkout');
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error('Failed to load user data:', error);
            // If loading user fails but we have a token, continue as guest
            if (localStorage.getItem('authToken')) {
              console.log('Failed to load user data but token exists, continuing as guest');
              setIsLoading(false);
              return;
            }
            // If no token, redirect to login
            localStorage.removeItem('authToken');
            navigate('/login', { 
              state: { 
                from: '/checkout',
                message: 'فشل تحميل بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.'
              },
              replace: true 
            });
            return;
          }
        } else {
          console.log('User already loaded:', user);
        }
        
        // If we get here, authentication is successful
        setIsLoading(false);
        
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Only redirect to login if there's an actual error
        if (error.response?.status === 401 || error.message?.includes('401')) {
          localStorage.removeItem('authToken');
          navigate('/login', { 
            state: { 
              from: '/checkout',
              message: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.'
            },
            replace: true 
          });
        } else {
          // For other errors, just show an error message but don't redirect
          toast.error('حدث خطأ في تحميل بيانات المستخدم. الرجاء المحاولة مرة أخرى.');
          setIsLoading(false);
        }
      }
    };
    
    checkAuth();
  }, [navigate, user, loadUser]);
  
  // Show loading state while checking authentication
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
  
  // Calculate totals from actual cart data
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 100 ? 0 : 15;
  const tax = subtotal * 0.15;
  const total = subtotal + shipping + tax;

  // If cart is empty, redirect to products
  if (cartItems.length === 0 && !orderComplete) {
    return (
      <div className="container mx-auto p-4 rtl:text-right min-h-screen">
        <div className="text-center py-16">
          <ShoppingBag className="mx-auto h-24 w-24 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">سلة التسوق فارغة</h2>
          <p className="text-gray-500 mb-8">لا يمكن إتمام عملية الدفع بدون منتجات في السلة</p>
          <Link to="/products">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
              تصفح المنتجات
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setCurrentStep(3);
  };



  const isValidShippingInfo = () => {
    return shippingInfo.fullName && shippingInfo.phone && shippingInfo.email && shippingInfo.address && shippingInfo.city && shippingInfo.district && shippingInfo.postalCode;
  };

  const isValidPaymentInfo = () => {
    return paymentInfo.cardNumber && paymentInfo.expiryDate && paymentInfo.cvv && paymentInfo.cardholderName;
  };

  const handleOrderConfirm = async () => {
    if (!isValidShippingInfo() || !isValidPaymentInfo()) {
      toast.error('الرجاء التأكد من صحة جميع البيانات المدخلة');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Prepare order data in the format expected by the backend
      const orderData = {
        payment_method: 'cash_on_delivery',
        notes: 'تم إنشاء الطلب من الموقع الإلكتروني',
        shipping_address: {
          full_name: shippingInfo.fullName,
          phone: shippingInfo.phone,
          email: shippingInfo.email,
          address: shippingInfo.address,
          city: shippingInfo.city,
          district: shippingInfo.district,
          postal_code: shippingInfo.postalCode
        },
        // The backend will set billing same as shipping if not provided
        billing_address: null,
        // Items will be fetched from the user's cart on the backend
        // No need to send items, subtotal, shipping, tax, or total as they're calculated server-side
      };
      
      console.log('Sending order data to backend:', JSON.stringify(orderData, null, 2));

      console.log('Sending order data to backend:', JSON.stringify(orderData, null, 2));
      
      // Send order to backend
      const response = await orderService.createOrder(orderData);
      
      console.log('Order creation response:', response);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      // Extract order data from response based on backend structure
      const orderResponse = response.data.data || response.data;
      const orderId = orderResponse.id;
      
      if (!orderId) {
        console.error('Order ID not found in response:', response);
        throw new Error('Order ID not found in server response');
      }
      
      // Update state with the actual order ID from backend
      setOrderId(orderId);
      setOrderComplete(true);
      setCurrentStep(4);
      
      // Clear cart only after successful order creation
      clearCart();
      
      toast.success(`تم إنشاء الطلب #${orderId} بنجاح!`);
      
      // Log success
      console.log('Order created successfully with ID:', orderId);
    } catch (error) {
      console.error('Error creating order:', error);
      
      let errorMessage = 'حدث خطأ أثناء إنشاء الطلب. يرجى المحاولة مرة أخرى.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
        
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401) {
          errorMessage = 'يجب تسجيل الدخول لإكمال عملية الشراء';
        } else if (error.response.status === 400) {
          errorMessage = 'بيانات الطلب غير صحيحة. يرجى مراجعة المعلومات المدخلة.';
        } else if (error.response.status === 500) {
          errorMessage = 'خطأ في الخادم الداخلي. يرجى المحاولة لاحقاً.';
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'لم يتم استلام رد من الخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        errorMessage = `خطأ في إعداد الطلب: ${error.message}`;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'معلومات الشحن', icon: MapPin },
    { id: 2, title: 'الدفع', icon: CreditCard },
    { id: 3, title: 'مراجعة الطلب', icon: Check },
    { id: 4, title: 'تأكيد الطلب', icon: Check }
  ];

  if (orderComplete) {
    const orderNumber = orderId || `NH${Date.now().toString().slice(-6)}`;
    
    return (
      <div className="container mx-auto p-4 rtl:text-right min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Check className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-3">تم تأكيد طلبك بنجاح!</h1>
            <p className="text-gray-600 text-lg mb-1">رقم الطلب: <span className="font-semibold">#{orderNumber}</span></p>
            <p className="text-gray-500 mb-6">سيصلك إشعار بتحديثات حالة الطلب على بريدك الإلكتروني</p>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8 text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                    <MapPin className="h-5 w-5 ml-2 text-blue-600" />
                    عنوان التوصيل
                  </h3>
                  <div className="text-gray-600 space-y-1">
                    <p>{shippingInfo.fullName}</p>
                    <p>{shippingInfo.phone}</p>
                    <p>
                      {shippingInfo.address}، {shippingInfo.district}
                      <br />
                      {shippingInfo.city}، {shippingInfo.postalCode}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                    <CreditCard className="h-5 w-5 ml-2 text-blue-600" />
                    طريقة الدفع
                  </h3>
                  <div className="text-gray-600">
                    <p>الدفع عند الاستلام</p>
                    <p className="text-sm text-gray-500 mt-1">سيتم الدفع عند استلام الطلب</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-semibold text-gray-700 mb-4">تفاصيل الطلب</h3>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-16 h-16 object-cover rounded-md border border-gray-100"
                        />
                        <div className="mr-3">
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">{(item.price * item.quantity).toFixed(2)} ريال</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 space-y-2 text-sm border-t border-gray-100 pt-4">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{subtotal.toFixed(2)} ريال</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رسوم الشحن:</span>
                    <span>{shipping === 0 ? 'مجاني' : `${shipping.toFixed(2)} ريال`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span>{tax.toFixed(2)} ريال</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t border-gray-100 pt-3 mt-3">
                    <span>المجموع الكلي:</span>
                    <span className="text-green-600">{total.toFixed(2)} ريال</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="mr-3">
                  <h4 className="text-sm font-medium text-blue-800">معلومات إضافية</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    يمكنك تتبع حالة طلبك من خلال صفحة <Link to="/track-order" className="font-medium underline">تتبع الطلب</Link> أو من خلال البريد الإلكتروني المسجل
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link to={`/orders/${orderNumber}`} className="w-full sm:w-auto">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                عرض تفاصيل الطلب
              </Button>
            </Link>
            <Link to="/track-order" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                <svg className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                تتبع الطلب
              </Button>
            </Link>
            <Link to="/products" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                <svg className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                مواصلة التسوق
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>لأي استفسار، يرجى التواصل مع خدمة العملاء على <a href="tel:+966123456789" className="text-blue-600 hover:underline">+966 12 345 6789</a></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 rtl:text-right">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 mb-6">
        <Link to="/" className="hover:text-blue-600">الرئيسية</Link> &gt; 
        <Link to="/cart" className="hover:text-blue-600 mr-1">السلة</Link> &gt; 
        <span className="text-blue-600 mr-1">الدفع</span>
      </nav>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <step.icon className="h-5 w-5" />
              </div>
              <span className={`mr-2 rtl:ml-2 text-sm ${
                currentStep >= step.id ? 'text-blue-600 font-semibold' : 'text-gray-600'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Shipping Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-6 w-6 ml-2 rtl:mr-2" />
                  معلومات الشحن
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">الاسم الكامل *</label>
                      <Input
                        type="text"
                        required
                        value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                        placeholder="أدخل اسمك الكامل"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">رقم الجوال *</label>
                      <Input
                        type="tel"
                        required
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                    <Input
                      type="email"
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                      placeholder="example@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">العنوان *</label>
                    <Input
                      type="text"
                      required
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      placeholder="الشارع، رقم المبنى"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">المدينة *</label>
                      <select 
                        required
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="صنعاء">صنعاء</option>
                        <option value="عدن">عدن</option>
                        <option value="تعز">تعز</option>
                        <option value="الحديدة">الحديدة</option>
                        <option value="إب">إب</option>
                        <option value="ذمار">ذمار</option>
                        <option value="المكلا">المكلا</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">الحي *</label>
                      <Input
                        type="text"
                        required
                        value={shippingInfo.district}
                        onChange={(e) => setShippingInfo({...shippingInfo, district: e.target.value})}
                        placeholder="اسم الحي"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">الرمز البريدي</label>
                      <Input
                        type="text"
                        value={shippingInfo.postalCode}
                        onChange={(e) => setShippingInfo({...shippingInfo, postalCode: e.target.value})}
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    متابعة للدفع
                    <ArrowRight className="h-4 w-4 mr-2 rtl:ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payment Information */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-6 w-6 ml-2 rtl:mr-2" />
                  معلومات الدفع - البنك الكريمي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <img src="https://via.placeholder.com/60x30?text=Al+Karim" alt="البنك الكريمي" />
                    <div>
                      <p className="font-semibold text-green-700">دفع آمن عبر البنك الكريمي</p>
                      <p className="text-sm text-green-600">جميع المعاملات محمية بتشفير SSL</p>
                    </div>
                    <Lock className="h-5 w-5 text-green-600" />
                  </div>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">رقم البطاقة *</label>
                    <Input
                      type="text"
                      required
                      value={paymentInfo.cardNumber}
                      onChange={(e ) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">اسم حامل البطاقة *</label>
                    <Input
                      type="text"
                      required
                      value={paymentInfo.cardholderName}
                      onChange={(e) => setPaymentInfo({...paymentInfo, cardholderName: e.target.value})}
                      placeholder="الاسم كما هو مكتوب على البطاقة"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">تاريخ الانتهاء *</label>
                      <Input
                        type="text"
                        required
                        value={paymentInfo.expiryDate}
                        onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: e.target.value})}
                        placeholder="MM/YY"
                        maxLength="5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">رمز الأمان (CVV) *</label>
                      <Input
                        type="text"
                        required
                        value={paymentInfo.cvv}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                        placeholder="123"
                        maxLength="4"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4 rtl:space-x-reverse">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                      className="flex-1"
                    >
                      <ArrowLeft className="h-4 w-4 ml-2 rtl:mr-2" />
                      السابق
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                      مراجعة الطلب
                      <ArrowRight className="h-4 w-4 mr-2 rtl:ml-2" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Order Review */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Check className="h-6 w-6 ml-2 rtl:mr-2" />
                  مراجعة الطلب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Shipping Info Review */}
                  <div>
                    <h3 className="font-semibold mb-3">معلومات الشحن</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p><strong>الاسم:</strong> {shippingInfo.fullName}</p>
                      <p><strong>الجوال:</strong> {shippingInfo.phone}</p>
                      <p><strong>العنوان:</strong> {shippingInfo.address}، {shippingInfo.district}، {shippingInfo.city}</p>
                    </div>
                  </div>

                  {/* Payment Info Review */}
                  <div>
                    <h3 className="font-semibold mb-3">معلومات الدفع</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p><strong>البطاقة:</strong> **** **** **** {paymentInfo.cardNumber.slice(-4)}</p>
                      <p><strong>حامل البطاقة:</strong> {paymentInfo.cardholderName}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold mb-3">المنتجات المطلوبة</h3>
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-4 rtl:space-x-reverse p-3 bg-gray-50 rounded-lg">
                          <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                            <img
                              src={item.image || getPlaceholderImage(100, 100, item.name)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageError(e, item.name)}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">الكمية: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">{(item.price * item.quantity).toFixed(2)} ريال</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-4 rtl:space-x-reverse">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCurrentStep(2)}
                      className="flex-1"
                    >
                      <ArrowLeft className="h-4 w-4 ml-2 rtl:mr-2" />
                      السابق
                    </Button>
                    <Button 
                      onClick={handleOrderConfirm}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 animate-spin" />
                          جاري معالجة الطلب...
                        </>
                      ) : (
                        <>
                          تأكيد الطلب والدفع
                          <Check className="h-4 w-4 mr-2 rtl:ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Cart Items Summary */}
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{(item.price * item.quantity).toFixed(2)} ريال</span>
                    </div>
                  ))}
                </div>

                <hr />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{subtotal.toFixed(2)} ريال</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>الشحن:</span>
                    <span className={shipping === 0 ? 'text-green-600' : ''}>
                      {shipping === 0 ? 'مجاني' : `${shipping.toFixed(2)} ريال`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span>{tax.toFixed(2)} ريال</span>
                  </div>
                </div>
                
                <hr />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>المجموع الكلي:</span>
                  <span className="text-green-600">{total.toFixed(2)} ريال</span>
                </div>

                {shipping > 0 && (
                  <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    💡 احصل على شحن مجاني عند الشراء بقيمة 100 ريال أو أكثر
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InteractiveCheckoutPage;
