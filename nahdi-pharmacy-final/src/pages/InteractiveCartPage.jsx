import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useShop } from '../context/useShop';
import AuthModal from '../components/auth/AuthModal';
import { toast } from 'react-hot-toast';

const InteractiveCartPage = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateCartItem, user, loadUser } = useShop();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleQuantityChange = async (itemId, newQuantity) => {
    try {
      if (newQuantity <= 0) {
        await removeFromCart(itemId);
      } else {
        await updateCartItem(itemId, newQuantity);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  // حساب إجمالي السلة
  const subtotal = cartItems.reduce((sum, item) => {
    // تأكد من الوصول الصحيح لسعر المنتج سواء كان كائن item يحتوي على product أو لا
    const product = item.product || item;
    const price = parseFloat(product?.price || 0);
    const quantity = parseInt(item.quantity || 1);
    return sum + (price * quantity);
  }, 0);
  
  // الشحن المجاني للطلبات فوق 100 ريال
  const shipping = subtotal >= 100 ? 0 : 15;
  // إجمالي المبلغ النهائي
  const total = subtotal + shipping;

  const handleCheckout = useCallback(async () => {
    try {
      setIsCheckingOut(true);
      // الاعتماد على جلسة الكوكيز: إذا لم يكن المستخدم محملًا حاول التحميل، وإلا اطلب تسجيل الدخول
      if (!user || !user.id) {
        try {
          await loadUser();
        } catch (error) {
          console.error('فشل تحميل بيانات المستخدم:', error);
        }
      }

      // بعد محاولة التحميل، إذا لا يزال المستخدم غير مصادق أظهر مودال المصادقة
      if (!user || !user.id) {
        setShowAuthModal(true);
        return;
      }

      // الانتقال لصفحة الدفع إذا كان المستخدم مصادقًا
      navigate('/checkout');
    } catch (error) {
      console.error('حدث خطأ أثناء الدفع:', error);
      toast.error('حدث خطأ أثناء محاولة الدفع. الرجاء المحاولة مرة أخرى.');
    } finally {
      setIsCheckingOut(false);
    }
  }, [navigate, user, loadUser]);
  

  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
    toast.success('مرحباً بك! يمكنك الآن إكمال عملية الشراء');
    // Add a small delay to ensure the auth state is updated
    setTimeout(() => {
      navigate('/checkout', { replace: true });
    }, 500);
  }, [navigate]);

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto p-4 rtl:text-right min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-12 w-12 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">سلة التسوق فارغة</h2>
          <p className="text-gray-500 mb-6">لم تقم بإضافة أي منتجات إلى سلة التسوق بعد</p>
          <Link to="/products">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-all hover:shadow-md">
              تصفح المنتجات
              <ArrowRight className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 rtl:text-right max-w-7xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 mb-8 flex items-center">
        <Link to="/" className="hover:text-blue-600 transition-colors">الرئيسية</Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-blue-600 font-medium">سلة التسوق</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
              <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
                <ShoppingBag className="h-5 w-5 ml-2 rtl:mr-2 text-blue-600" />
                سلة التسوق ({cartItems.length} منتج)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-100">
                {cartItems.map((item) => {
                  // تحسين الوصول إلى بيانات المنتج
                  const product = item.product || item;
                  const itemId = item.id || item._id;
                  const quantity = parseInt(item.quantity) || 1;
                  const price = parseFloat(product.price) || 0;
                  const imageUrl = product.image_url || product.image || 'https://via.placeholder.com/100';
                  
                  return (
                    <div key={itemId} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-gray-50 transition-colors duration-200">
                      <div className="w-full sm:w-24 flex-shrink-0">
                        <img 
                          src={imageUrl}
                          alt={product.name || 'صورة المنتج'}
                          className="w-full h-24 object-contain bg-white p-2 rounded-lg border border-gray-100"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/100';
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-800 line-clamp-2">{product.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{product.brand || 'متجر المعتمد'}</p>
                          </div>
                          <div className="text-right sm:text-left">
                            <p className="text-lg font-bold text-green-600">
                              {price.toFixed(2)} ر.س
                            </p>
                            {product.original_price && product.original_price > price && (
                              <p className="text-sm text-gray-400 line-through">
                                {product.original_price.toFixed(2)} ر.س
                              </p>
                            )}
                          </div>
                        </div>
                      
                        <div className="mt-3 flex items-center justify-between w-full sm:w-auto">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuantityChange(itemId, quantity - 1)}
                              className="h-9 w-9 p-0 rounded-none hover:bg-gray-100"
                            >
                              <Minus className="h-4 w-4 text-gray-600" />
                            </Button>
                            
                            <span className="w-12 text-center font-medium text-gray-800">
                              {quantity}
                            </span>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuantityChange(itemId, quantity + 1)}
                              className="h-9 w-9 p-0 rounded-none hover:bg-gray-100"
                              disabled={product.stock_quantity <= quantity}
                            >
                              <Plus className="h-4 w-4 text-gray-600" />
                            </Button>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(itemId)}
                            className="text-red-500 hover:bg-red-50 hover:text-red-600 p-2 h-9 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="mr-1 text-sm">حذف</span>
                          </Button>
                        </div>
                        
                        <div className="mt-2 sm:hidden">
                          <p className="text-base font-semibold text-gray-800">
                            الإجمالي: {(price * quantity).toFixed(2)} ر.س
                          </p>
                        </div>
                      </div>
                      
                      <div className="hidden sm:flex flex-col items-end justify-between h-full">
                        <p className="text-lg font-bold text-gray-800">
                          {(price * quantity).toFixed(2)} ر.س
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border border-gray-100 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
              <CardTitle className="text-lg font-semibold text-gray-800">ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* تفاصيل المنتجات */}
                <div className="border-b border-gray-100 pb-4 mb-4">
                  <h4 className="font-medium text-gray-700 mb-3">المنتجات المختارة</h4>
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {cartItems.map((item) => {
                      const product = item.product || item;
                      const imageUrl = product.image?.url || product.image || 'https://via.placeholder.com/100';
                      const price = parseFloat(product.price) || 0;
                      const quantity = parseInt(item.quantity) || 1;
                      
                      return (
                        <div key={item.id || item._id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                          <div className="w-16 h-16 flex-shrink-0 bg-white border border-gray-100 rounded-md p-1">
                            <img 
                              src={imageUrl}
                              alt={product.name || 'صورة المنتج'}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/100';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm text-gray-800 truncate">{product.name}</h5>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-gray-500">الكمية: {quantity}</span>
                              <span className="text-sm font-medium text-green-600">{(price * quantity).toFixed(2)} ر.س</span>
                            </div>
                            {product.original_price && product.original_price > price && (
                              <p className="text-xs text-gray-400 line-through mt-0.5">
                                بدلاً من {product.original_price.toFixed(2)} ر.س
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span className="font-medium">{subtotal.toFixed(2)} ر.س</span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">الشحن:</span>
                  <span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                    {shipping === 0 ? 'شحن مجاني' : `${shipping.toFixed(2)} ر.س`}
                  </span>
                </div>
                
                <hr className="my-4 border-gray-200" />
                
                <div className="flex justify-between py-2">
                  <span className="text-lg font-bold text-gray-800">المجموع الكلي:</span>
                  <span className="text-xl font-bold text-green-600">{total.toFixed(2)} ر.س</span>
                </div>
                
                {shipping > 0 ? (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
                    <p className="text-sm text-blue-700 flex items-start">
                      <span className="ml-1">💡</span>
                      <span>أضف {Math.max(0, 100 - subtotal).toFixed(2)} ر.س أخرى للحصول على شحن مجاني</span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 mt-4">
                    <p className="text-sm text-green-700 flex items-center">
                      <span className="ml-1">✓</span>
                      <span>مؤهل للشحن المجاني</span>
                    </p>
                  </div>
                )}
                
                <div className="space-y-3 pt-2">
                  <Button 
                    onClick={handleCheckout}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -mr-1 ml-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        جاري التحميل...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        متابعة للدفع
                        <ArrowRight className="h-5 w-5 mr-2 rtl:ml-2 rtl:rotate-180" />
                      </span>
                    )}
                  </Button>
                  
                  <Link to="/products" className="block">
                    <Button 
                      variant="outline" 
                      className="w-full py-3 text-base font-medium rounded-lg border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      متابعة التسوق
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default InteractiveCartPage;
