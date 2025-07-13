import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
  Percent,
  ShieldCheck,
  Truck,
  ArrowRight,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { useShop } from '../context/useShop';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import ProductCard from '../components/ProductCard';
import { cn } from '../lib/utils';

const WholesaleHomePage = () => {
  const { addToCart, toggleFavorite, favoriteItems } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState([]);
  const [wholesaleProducts, setWholesaleProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Get category from URL or use empty string for all categories
  const selectedCategory = searchParams.get('category') || '';
  const productsPerPage = 12;

  // Sample wholesale banners
  const wholesaleBanners = [
    {
      id: 1,
      title: 'تسوق بالجملة',
      description: 'احصل على أفضل الأسعار لطلبات الجملة',
      image: 'https://via.placeholder.com/1200x400?text=Wholesale+1',
      link: '/wholesale/products'
    },
    {
      id: 2,
      title: 'خصومات حصرية للجملة',
      description: 'خصومات تصل إلى 40% على طلبات الجملة',
      image: 'https://via.placeholder.com/1200x400?text=Wholesale+2',
      link: '/wholesale/offers'
    }
  ];

  // Fetch wholesale categories and products
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      console.log('🚀 تحميل بيانات صفحة الجملة...');
      
      try {
        // Fetch wholesale categories
        const categoriesResponse = await categoryService.getCategories();
        const categoriesData = Array.isArray(categoriesResponse) ? categoriesResponse : [];
        setCategories(categoriesData);
        
        // Fetch wholesale products with pagination and category filter
        const response = await productService.getWholesaleProducts(
          currentPage,
          productsPerPage,
          selectedCategory
        );
        
        // Handle API response format
        const productsData = response?.data?.products || response?.data || [];
        const totalItems = response?.data?.total || productsData.length;
        
        setWholesaleProducts(productsData);
        setTotalPages(Math.ceil(totalItems / productsPerPage));
        
      } catch (error) {
        console.error('❌ خطأ في جلب بيانات الجملة:', error);
        toast.error('حدث خطأ في تحميل المنتجات. يرجى المحاولة مرة أخرى.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentPage, selectedCategory]);
  
  // Reset to first page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);
  
  const handleCategoryChange = (categoryId) => {
    const params = new URLSearchParams(searchParams);
    if (categoryId) {
      params.set('category', categoryId);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };
  
  const resetFilters = () => {
    setSearchParams({});
    setCurrentPage(1);
  };

  // Carousel controls
  const nextSlide = () => {
    setCurrentSlide(prev => (prev === wholesaleBanners.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? wholesaleBanners.length - 1 : prev - 1));
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [currentSlide]);

  const currentBanner = wholesaleBanners[currentSlide];
  const isFavorite = (productId) => favoriteItems.some(item => item.id === productId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">جاري تحميل منتجات الجملة...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <section className="relative w-full h-[60vh] max-h-[700px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/50 to-transparent z-10" />
        <img
          src={currentBanner.image}
          alt={currentBanner.title}
          className="w-full h-full object-cover transition-all duration-1000 ease-in-out transform"
          style={{
            transform: `scale(${1 + (Math.random() * 0.05)})`,
            transition: 'transform 10s ease-in-out',
          }}
        />
        
        <div className="absolute inset-0 z-20 flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl text-right">
              <Badge className="bg-white text-blue-600 hover:bg-white/90 text-sm font-medium mb-4 px-3 py-1 rounded-full shadow-sm">
                جملة
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
                    className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform flex items-center gap-2"
                  >
                    تصفح منتجات الجملة
                    <ArrowLeft className="w-5 h-5 group-hover:animate-bounce-horizontal" />
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
          {wholesaleBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white w-8 scale-110' 
                  : 'bg-white/50 hover:bg-white/70 w-3'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Wholesale Categories */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">تصفح حسب التصنيفات</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-300 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                to={`/wholesale/products?category=${category.id}`}
                className="group flex flex-col items-center text-center p-4 rounded-xl hover:bg-gray-50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 mb-4 rounded-full overflow-hidden shadow-md group-hover:shadow-lg transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <img
                    src={category.image_url || 'https://via.placeholder.com/100x100?text=Category'}
                    alt={category.name}
                    className="relative z-10 w-full h-full object-contain p-3"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/100x100?text=Category';
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

      {/* Wholesale Products */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {selectedCategory 
                  ? `${categories.find(c => c.id === selectedCategory)?.name || 'المنتجات'}`
                  : 'جميع منتجات الجملة'}
              </h2>
              <p className="text-gray-600 mt-1">
                {selectedCategory 
                  ? `منتجات ${categories.find(c => c.id === selectedCategory)?.name || 'متنوعة'}`
                  : 'تصفح تشكيلتنا الواسعة من منتجات الجملة'}
              </p>
            </div>
            
            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="md:hidden flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              <span>تصفية</span>
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Desktop Categories Sidebar */}
            <div className="hidden md:block w-64 flex-shrink-0">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 sticky top-24">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-900">التصنيفات</h3>
                  {selectedCategory && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={resetFilters}
                      className="text-blue-600 hover:bg-blue-50 px-2"
                    >
                      إزالة الفلتر
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryChange('')}
                    className={cn(
                      'w-full text-right px-4 py-2 rounded-lg transition-colors',
                      !selectedCategory 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    الكل
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={cn(
                        'w-full text-right px-4 py-2 rounded-lg transition-colors flex items-center justify-between',
                        selectedCategory === category.id.toString()
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <span>{category.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                        {category.productCount || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Mobile Filter Panel */}
            {isMobileFilterOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div 
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setIsMobileFilterOpen(false)}
                />
                <div className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-white shadow-xl overflow-y-auto">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-medium text-lg">تصفية المنتجات</h3>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setIsMobileFilterOpen(false)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">التصنيفات</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            handleCategoryChange('');
                            setIsMobileFilterOpen(false);
                          }}
                          className={cn(
                            'w-full text-right px-4 py-2 rounded-lg transition-colors',
                            !selectedCategory 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          الكل
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => {
                              handleCategoryChange(category.id);
                              setIsMobileFilterOpen(false);
                            }}
                            className={cn(
                              'w-full text-right px-4 py-2 rounded-lg transition-colors flex items-center justify-between',
                              selectedCategory === category.id.toString()
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            <span>{category.name}</span>
                            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                              {category.productCount || 0}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100">
                    <Button 
                      className="w-full"
                      onClick={() => {
                        resetFilters();
                        setIsMobileFilterOpen(false);
                      }}
                    >
                      تطبيق الفلتر
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Products Grid */}
            <div className="flex-1">
              {isLoading ? (
                <div className="grid place-items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="mt-2 text-gray-600">جاري تحميل المنتجات...</p>
                </div>
              ) : wholesaleProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {wholesaleProducts.map((product) => (
                      <ProductCard 
                        key={product.id}
                        product={product}
                        onAddToCart={() => addToCart(product)}
                        onToggleFavorite={() => toggleFavorite(product)}
                        isFavorite={isFavorite(product.id)}
                        showWholesalePrice={true}
                      />
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-10 flex justify-center">
                      <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'ghost'}
                              size="sm"
                              className={`h-8 w-8 p-0 ${currentPage === pageNum ? 'bg-blue-600' : ''}`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center border border-gray-100">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد منتجات متاحة</h3>
                  <p className="text-gray-500 mb-4">لم يتم العثور على منتجات في هذا القسم حالياً</p>
                  <Button 
                    variant="outline"
                    onClick={resetFilters}
                  >
                    إعادة تعيين الفلاتر
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>



      {/* Wholesale CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">ابدأ مشروعك معنا اليوم</h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
            انضم إلى شبكة موزعينا واحصل على أفضل العروض والخصومات على طلبات الجملة
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/wholesale/register" className="group">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform"
              >
                سجل كموزع
              </Button>
            </Link>
            <Link to="/contact" className="group">
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white/10 hover:text-white px-8 py-6 rounded-full font-medium text-lg transition-all duration-300 hover:scale-105 transform"
              >
                اتصل بنا
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Wholesale Features - Moved to bottom */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">لماذا تتعامل معنا بالجملة؟</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-300 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Package className="w-10 h-10 text-blue-600 mb-4" />,
                title: "منتجات أصلية",
                description: "نضمن لك منتجات أصلية 100% بجودة عالية"
              },
              {
                icon: <Percent className="w-10 h-10 text-blue-600 mb-4" />,
                title: "أسعار تنافسية",
                description: "أفضل الأسعار لكميات الجملة مع خصومات خاصة"
              },
              {
                icon: <Truck className="w-10 h-10 text-blue-600 mb-4" />,
                title: "شحن سريع",
                description: "توصيل سريع وآمن لجميع أنحاء المملكة"
              },
              {
                icon: <ShieldCheck className="w-10 h-10 text-blue-600 mb-4" />,
                title: "ضمان الجودة",
                description: "نضمن لك جودة المنتجات وسهولة الاستبدال"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl text-center hover:shadow-lg transition-shadow duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default WholesaleHomePage;
