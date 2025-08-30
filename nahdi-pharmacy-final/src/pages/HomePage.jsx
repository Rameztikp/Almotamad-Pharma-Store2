import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
// import { useShop } from '../context/useShop'; // مؤقتاً لتجنب التعليق
import Toast from '../components/Toast';
import productService from '../services/productService';
import { categoryService } from '../services/categoryService';
import bannerService from '../services/bannerService';
import ProductCard from '../components/ProductCard';
import { isRetailProductPublished } from '../utils/productUtils';
import { SERVER_ROOT_URL } from '../services/api';

const HomePage = () => {
  // const { addToCart, toggleFavorite, favoriteItems } = useShop(); // مؤقتاً معطل
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState([]); // سيتم جلبها من الـ API
  const [featuredProducts, setFeaturedProducts] = useState([]); // سيتم جلبها من الـ API
  // State for retail products that will be shown in the featured section
  const [retailProducts, setRetailProducts] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]); // البنرات من الـ API
  const [isLoading, setIsLoading] = useState(true); // حالة التحميل

  const showToast = (message, type = 'success') => {
    setToast({ isVisible: true, message, type });
  };

  const hideToast = () => {
    setToast({ isVisible: false, message: '', type: 'success' });
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast(`تم إضافة "${product.name}" إلى السلة`, 'cart');
  };

  const handleToggleFavorite = (product) => {
    const isCurrentlyFavorite = favoriteItems.some(item => item.id === product.id);
    toggleFavorite(product);
    if (isCurrentlyFavorite) {
      showToast(`تم إزالة "${product.name}" من المفضلة`, 'favorite');
    } else {
      if (!product.inStock) {
        showToast(`تم إضافة "${product.name}" إلى المفضلة. سيتم تذكيرك عند توفره.`, 'info');
      } else {
        showToast(`تم إضافة "${product.name}" إلى المفضلة`, 'favorite');
      }
    }
  };

  const isFavorite = (productId) => {
    return favoriteItems.some(item => item.id === productId);
  };

  // جلب الفئات والمنتجات المميزة من الـ API
  useEffect(() => {
    const fetchData = async () => {
      console.log('🚀 بدء تحميل بيانات الصفحة الرئيسية');
      
      try {
        // تعيين البنرات الافتراضية أولاً
        setHeroBanners([
          {
            id: 1,
            title: 'صيدلية المعتمد فارما',
            description: 'شريكك الموثوق في الصحة والجمال',
            image: '/images/placeholder-banner.jpg',
            link: '/products'
          },
          {
            id: 2,
            title: 'عروض الصيف الكبرى',
            description: 'خصومات تصل إلى 50% على منتجات مختارة!',
            image: '/images/placeholder-banner.jpg',
            link: '/products?category=offers'
          }
        ]);

        // جلب الفئات
        console.log('📂 جار جلب الفئات...');
        const categoriesResponse = await categoryService.getCategories();
        const categoriesData = Array.isArray(categoriesResponse) 
          ? categoriesResponse 
          : categoriesResponse?.data || [];
        setCategories(categoriesData);
        
        // جلب منتجات القطاعي
        console.log('🛒 جار جلب منتجات القطاعي...');
        try {
          const response = await productService.getFeaturedProducts();
          let productsData = [];
          
          if (Array.isArray(response)) {
            productsData = response;
          } else if (response && response.data) {
            productsData = Array.isArray(response.data) ? response.data : [];
          } else if (response && response.products) {
            productsData = Array.isArray(response.products) ? response.products : [];
          }
          
          setFeaturedProducts(productsData);
        } catch (error) {
          console.error('❌ خطأ في جلب المنتجات:', error);
          setFeaturedProducts([]);
        }
        
        console.log('🏁 تم تحميل البيانات بنجاح');
        
      } catch (error) {
        console.error('❌ خطأ في جلب البيانات:', error);
        // تعيين قيم افتراضية في حالة الخطأ
        setCategories([]);
        setFeaturedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);


  const nextSlide = ( ) => {
    if (heroBanners.length > 0) {
      setCurrentSlide((prev) => (prev === heroBanners.length - 1 ? 0 : prev + 1));
    }
  };

  const prevSlide = () => {
    if (heroBanners.length > 0) {
      setCurrentSlide((prev) => (prev === 0 ? heroBanners.length - 1 : prev - 1));
    }
  };

  useEffect(() => {
    if (heroBanners.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev >= heroBanners.length - 1 ? 0 : prev + 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroBanners]);

  // التأكد من أن currentSlide ضمن النطاق المسموح
  const safeCurrentSlide = heroBanners.length > 0 ? Math.min(currentSlide, heroBanners.length - 1) : 0;
  const currentBanner = heroBanners.length > 0 ? heroBanners[safeCurrentSlide] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">جاري تحميل المنتجات والفئات...</p>
      </div>
    );
  }

  const publishedFeaturedProducts = featuredProducts.filter(isRetailProductPublished);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner Carousel */}
      {currentBanner && (
        <section className="relative w-full h-[70vh] max-h-[800px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent z-10" />
          <img
            src={currentBanner.image}
            alt={currentBanner.title}
            className="w-full h-full object-cover transition-all duration-1000 ease-in-out transform"
            style={{
              transform: `scale(${1 + (Math.random() * 0.05)})`,
              transition: 'transform 10s ease-in-out',
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/placeholder-banner.jpg';
            }}
          />
          
          <div className="absolute inset-0 z-20 flex items-center">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl text-right rtl:text-right">
                <Badge className="bg-white text-blue-600 hover:bg-white/90 text-sm font-medium mb-4 px-3 py-1 rounded-full shadow-sm">
                  عروض حصرية
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 drop-shadow-lg">
                  {currentBanner.title}
                </h1>
              <p className="text-lg md:text-xl text-gray-100 mb-8 max-w-lg leading-relaxed">
                {currentBanner.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={currentBanner.link} className="group">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 py-6 rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform flex items-center gap-2"
                  >
                    تسوق الآن
                    <ArrowLeft className="w-5 h-5 group-hover:animate-bounce-horizontal" />
                  </Button>
                </Link>
                <Link to="/products" className="group">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white px-8 py-6 rounded-full font-medium text-lg transition-all duration-300 hover:scale-105 transform flex items-center gap-2"
                  >
                    تصفح المنتجات
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute top-1/2 right-4 transform -translate-y-1/2 z-30 bg-white/20 backdrop-blur-sm p-3 rounded-full text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Previous slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute top-1/2 left-4 transform -translate-y-1/2 z-30 bg-white/20 backdrop-blur-sm p-3 rounded-full text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Next slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Dots Indicator */}
        <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center space-x-2 rtl:space-x-reverse">
          {heroBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === safeCurrentSlide 
                  ? 'bg-white w-8 scale-110' 
                  : 'bg-white/50 hover:bg-white/70 w-3'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">تصفح حسب التصنيفات</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-300 mx-auto rounded-full"></div>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">اكتشف مجموعتنا الواسعة من المنتجات الصحية والعناية الشخصية</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.id}`}
                className="group flex flex-col items-center text-center p-4 rounded-xl hover:bg-gray-50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 mb-4 rounded-full overflow-hidden shadow-md group-hover:shadow-lg transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <img
                    src={category.image_url ? `${SERVER_ROOT_URL}/${category.image_url}`.replace(/\\/g, '/') : '/images/placeholder-category.png'}
                    alt={category.name}
                    className="relative z-10 w-full h-full object-contain p-3"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/placeholder-category.png';
                    }}
                  />
                </div>
                <h3 className="text-sm md:text-base font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h3>
                <span className="mt-1 text-xs text-gray-500 group-hover:text-blue-400 transition-colors">
                  {Math.floor(Math.random() * 50) + 10} منتج
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Medicine Subcategories - Removed as categories are now dynamic */}

      {/* New Arrivals Banner */}
      <section className="relative py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-700/30 to-transparent -skew-x-12 transform origin-top-right"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 px-4 py-1.5 text-sm font-medium mb-6 hover:bg-white/30 transition-all">
              🆕 وصل حديثاً
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              اكتشف أحدث منتجاتنا الصحية
            </h2>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
              استكشف تشكيلتنا المميزة من المنتجات الطبية والعناية الشخصية المبتكرة
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/products?sort=new-arrivals" className="group">
                <Button 
                  size="lg" 
                  className="bg-white text-blue-700 hover:bg-gray-100 hover:text-blue-800 px-8 py-6 rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform flex items-center gap-2"
                >
                  تسوق الجديد
                  <ArrowLeft className="w-5 h-5 group-hover:animate-bounce-horizontal" />
                </Button>
              </Link>
              <Link to="/products" className="group">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="bg-transparent border-2 border-white/30 hover:bg-white/10 text-white hover:text-white px-8 py-6 rounded-full font-medium text-lg transition-all duration-300 hover:scale-105 transform flex items-center gap-2"
                >
                  تصفح الكل
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">المنتجات المميزة</h2>
            <Link to="/products">
              <Button variant="outline" className="flex items-center gap-1">
                عرض الكل
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {publishedFeaturedProducts.map((product) => (
              <ProductCard 
                key={product.id}
                product={{
                  ...product,
                  rating: 4.5, // Default rating if not provided
                  inStock: product.stock_quantity > 0,
                  originalPrice: product.price,
                  price: product.discount_price && product.discount_price < product.price 
                    ? product.discount_price 
                    : product.price,
                  discount: product.discount_price && product.discount_price < product.price
                    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
                    : 0
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Retail Products Section */}

      {/* Newsletter Signup */}
      <section className="relative py-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-700/30 to-transparent -skew-x-12 transform origin-top-right"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">انضم إلى قائمتنا البريدية</h2>
              <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
                اشترك الآن واحصل على آخر العروض الحصرية وتحديثات المنتجات مباشرة إلى بريدك الإلكتروني
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-sm rounded-2xl p-1 shadow-xl">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-indigo-200" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="بريدك الإلكتروني"
                    className="w-full px-5 py-4 pr-12 text-gray-900 rounded-xl focus:ring-2 focus:ring-white/50 focus:outline-none transition-all duration-300"
                    dir="rtl"
                  />
                </div>
                <button 
                  className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-gray-900 font-semibold px-8 py-4 rounded-xl whitespace-nowrap transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-indigo-600 shadow-lg"
                  type="button"
                >
                  <span className="flex items-center justify-center gap-2">
                    اشتراك الآن
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
            
            <p className="mt-4 text-sm text-indigo-200 text-center">
              نحن نحترم خصوصيتك. لن نشارك بريدك الإلكتروني مع أي طرف ثالث.
            </p>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-10 left-10 w-16 h-16 bg-yellow-400/20 rounded-full"></div>
      </section>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default HomePage;
