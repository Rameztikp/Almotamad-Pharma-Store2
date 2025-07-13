import React, { useState } from 'react';
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

const OrderTrackingPage = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ isVisible: true, message, type });
  };

  const hideToast = () => {
    setToast({ isVisible: false, message: '', type: 'success' });
  };

  // بيانات وهمية للطلبات
  const mockOrders = {
    'ORD-2024-001': {
      orderNumber: 'ORD-2024-001',
      status: 'delivered',
      orderDate: '2024-01-15',
      estimatedDelivery: '2024-01-18',
      actualDelivery: '2024-01-17',
      total: 245.50,
      items: [
        { name: 'فيتامين د 5000 وحدة', quantity: 2, price: 45.50 },
        { name: 'كريم مرطب للوجه', quantity: 1, price: 89.99 },
        { name: 'شامبو للأطفال', quantity: 1, price: 32.75 }
      ],
      shippingAddress: {
        name: 'أحمد محمد',
        phone: '+966501234567',
        address: 'شارع الملك فهد، الرياض 12345'
      },
      trackingSteps: [
        { status: 'confirmed', title: 'تأكيد الطلب', description: 'تم تأكيد طلبك بنجاح', date: '2024-01-15 10:30', completed: true },
        { status: 'processing', title: 'تحضير الطلب', description: 'جاري تحضير طلبك في المستودع', date: '2024-01-15 14:20', completed: true },
        { status: 'shipped', title: 'شحن الطلب', description: 'تم شحن طلبك وهو في الطريق إليك', date: '2024-01-16 09:15', completed: true },
        { status: 'out_for_delivery', title: 'خرج للتوصيل', description: 'طلبك مع مندوب التوصيل', date: '2024-01-17 08:00', completed: true },
        { status: 'delivered', title: 'تم التسليم', description: 'تم تسليم طلبك بنجاح', date: '2024-01-17 15:30', completed: true }
      ]
    },
    'ORD-2024-002': {
      orderNumber: 'ORD-2024-002',
      status: 'shipped',
      orderDate: '2024-01-20',
      estimatedDelivery: '2024-01-23',
      total: 156.75,
      items: [
        { name: 'عطر رجالي فاخر', quantity: 1, price: 299.00 },
        { name: 'مسكن للألم', quantity: 2, price: 15.50 }
      ],
      shippingAddress: {
        name: 'فاطمة علي',
        phone: '+966507654321',
        address: 'حي النخيل، جدة 21589'
      },
      trackingSteps: [
        { status: 'confirmed', title: 'تأكيد الطلب', description: 'تم تأكيد طلبك بنجاح', date: '2024-01-20 11:45', completed: true },
        { status: 'processing', title: 'تحضير الطلب', description: 'جاري تحضير طلبك في المستودع', date: '2024-01-20 16:30', completed: true },
        { status: 'shipped', title: 'شحن الطلب', description: 'تم شحن طلبك وهو في الطريق إليك', date: '2024-01-21 10:20', completed: true },
        { status: 'out_for_delivery', title: 'خرج للتوصيل', description: 'طلبك مع مندوب التوصيل', date: '', completed: false },
        { status: 'delivered', title: 'تم التسليم', description: 'سيتم تسليم طلبك قريباً', date: '', completed: false }
      ]
    },
    'ORD-2024-003': {
      orderNumber: 'ORD-2024-003',
      status: 'processing',
      orderDate: '2024-01-22',
      estimatedDelivery: '2024-01-25',
      total: 89.25,
      items: [
        { name: 'كريم واقي الشمس', quantity: 1, price: 65.00 },
        { name: 'فيتامين سي', quantity: 1, price: 24.25 }
      ],
      shippingAddress: {
        name: 'محمد السعيد',
        phone: '+966509876543',
        address: 'شارع التحلية، الخبر 31952'
      },
      trackingSteps: [
        { status: 'confirmed', title: 'تأكيد الطلب', description: 'تم تأكيد طلبك بنجاح', date: '2024-01-22 09:15', completed: true },
        { status: 'processing', title: 'تحضير الطلب', description: 'جاري تحضير طلبك في المستودع', date: '2024-01-22 13:45', completed: true },
        { status: 'shipped', title: 'شحن الطلب', description: 'سيتم شحن طلبك قريباً', date: '', completed: false },
        { status: 'out_for_delivery', title: 'خرج للتوصيل', description: 'سيخرج طلبك للتوصيل قريباً', date: '', completed: false },
        { status: 'delivered', title: 'تم التسليم', description: 'سيتم تسليم طلبك قريباً', date: '', completed: false }
      ]
    }
  };

  const handleTrackOrder = () => {
    if (!orderNumber.trim()) {
      showToast('يرجى إدخال رقم الطلب', 'error');
      return;
    }

    setIsLoading(true);
    
    // محاكاة استدعاء API
    setTimeout(() => {
      const order = mockOrders[orderNumber.trim()];
      if (order) {
        setOrderData(order);
        showToast('تم العثور على الطلب بنجاح', 'success');
      } else {
        setOrderData(null);
        showToast('لم يتم العثور على الطلب. يرجى التحقق من رقم الطلب', 'error');
      }
      setIsLoading(false);
    }, 1500);
  };

  const getStatusColor = (status) => {
    switch (status) {
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
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
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
      default:
        return 'غير معروف';
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
            
            {/* Sample Order Numbers */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">أرقام طلبات للتجربة:</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(mockOrders).map((orderNum) => (
                  <button
                    key={orderNum}
                    onClick={() => setOrderNumber(orderNum)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    {orderNum}
                  </button>
                ))}
              </div>
            </div>
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

