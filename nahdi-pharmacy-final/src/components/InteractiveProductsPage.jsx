import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useShop } from "../context/useShop";
import Toast from './Toast';
import ProductCard from './ProductCard';

const InteractiveProductsPage = () => {
  const { addToCart, toggleFavorite, favoriteItems } = useShop();
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  
  const [filters, setFilters] = useState({
    priceRange: '',
    brand: '',
    size: '',
    age: '',
    quantity: '',
    expiryDate: ''
  });

  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');

  // Sample products data
  const [products] = useState([
    {
      id: 1,
      name: 'دواء خافض للحرارة للأطفال',
      image: 'https://via.placeholder.com/200x200?text=Medicine1',
      price: 25.00,
      originalPrice: 30.00,
      discount: 17,
      rating: 4.5,
      reviews: 128,
      brand: 'فايزر',
      category: 'أدوية',
      inStock: true,
      expiryDate: '2025-12-31'
    },
    {
      id: 2,
      name: 'عطر نسائي فاخر - شانيل',
      image: 'https://via.placeholder.com/200x200?text=Perfume1',
      price: 150.00,
      originalPrice: 180.00,
      discount: 17,
      rating: 4.8,
      reviews: 89,
      brand: 'شانيل',
      category: 'عطور',
      inStock: true,
      expiryDate: '2026-06-30'
    },
    {
      id: 3,
      name: 'كريم مرطب للبشرة الجافة',
      image: 'https://via.placeholder.com/200x200?text=Cream1',
      price: 75.00,
      originalPrice: 85.00,
      discount: 12,
      rating: 4.3,
      reviews: 256,
      brand: 'نيفيا',
      category: 'تجميل',
      inStock: true,
      expiryDate: '2025-09-15'
    },
    {
      id: 4,
      name: 'فيتامينات متعددة للكبار',
      image: 'https://via.placeholder.com/200x200?text=Vitamins1',
      price: 45.00,
      originalPrice: 50.00,
      discount: 10,
      rating: 4.6,
      reviews: 342,
      brand: 'سنتروم',
      category: 'مكملات',
      inStock: true,
      expiryDate: '2025-11-20'
    },
    {
      id: 5,
      name: 'شامبو للشعر الدهني',
      image: 'https://via.placeholder.com/200x200?text=Shampoo1',
      price: 35.00,
      originalPrice: 40.00,
      discount: 13,
      rating: 4.2,
      reviews: 167,
      brand: 'لوريال',
      category: 'تجميل',
      inStock: false,
      expiryDate: '2025-08-10'
    },
    {
      id: 6,
      name: 'مسكن للألم - بانادول',
      image: 'https://via.placeholder.com/200x200?text=Panadol1',
      price: 15.00,
      originalPrice: 18.00,
      discount: 17,
      rating: 4.7,
      reviews: 523,
      brand: 'بانادول',
      category: 'أدوية',
      inStock: true,
      expiryDate: '2026-01-15'
    },
    {
      id: 7,
      name: 'كريم واقي الشمس SPF 50',
      image: 'https://via.placeholder.com/200x200?text=Sunscreen1',
      price: 65.00,
      originalPrice: 75.00,
      discount: 13,
      rating: 4.4,
      reviews: 198,
      brand: 'لاروش بوزيه',
      category: 'تجميل',
      inStock: true,
      expiryDate: '2025-07-30'
    },
    {
      id: 8,
      name: 'عطر رجالي - ديور',
      image: 'https://via.placeholder.com/200x200?text=Perfume2',
      price: 200.00,
      originalPrice: 230.00,
      discount: 13,
      rating: 4.9,
      reviews: 76,
      brand: 'ديور',
      category: 'عطور',
      inStock: true,
      expiryDate: '2026-12-31'
    }
  ] );

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
      // هذا هو الجزء الجديد الذي يضيف الإشعار للمنتجات غير المتوفرة
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

  const filteredProducts = products.filter(product => {
    return product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           product.brand.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
      default:
        return b.id - a.id;
    }
  });

  return (
    <div className="container mx-auto p-4 rtl:text-right">
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 mb-4">
        <span>الرئيسية</span> &gt; <span className="text-blue-600">المنتجات</span>
      </nav>

      {/* Results count and sorting */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">عرض {sortedProducts.length} من {products.length} منتج</p>
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <span className="text-sm text-gray-600">ترتيب حسب:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="newest">وصل حديثاً</option>
            <option value="price-low">السعر: من الأقل للأعلى</option>
            <option value="price-high">السعر: من الأعلى للأقل</option>
            <option value="rating">الأعلى تقييماً</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Filter className="h-5 w-5 ml-2 rtl:mr-2" />
              تصفية النتائج
            </h3>
            
            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">البحث</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="ابحث عن منتج..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 rtl:right-3 rtl:left-auto" />
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">نطاق السعر</label>
              <select 
                value={filters.priceRange}
                onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">جميع الأسعار</option>
                <option value="0-25">0 - 25 ريال</option>
                <option value="25-50">25 - 50 ريال</option>
                <option value="50-100">50 - 100 ريال</option>
                <option value="100+">100+ ريال</option>
              </select>
            </div>

            {/* Brand */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">العلامة التجارية</label>
              <select 
                value={filters.brand}
                onChange={(e) => setFilters({...filters, brand: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">جميع العلامات</option>
                <option value="فايزر">فايزر</option>
                <option value="شانيل">شانيل</option>
                <option value="نيفيا">نيفيا</option>
                <option value="سنتروم">سنتروم</option>
                <option value="لوريال">لوريال</option>
                <option value="بانادول">بانادول</option>
              </select>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">الفئة</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">جميع الفئات</option>
                <option value="أدوية">أدوية</option>
                <option value="عطور">عطور</option>
                <option value="تجميل">تجميل</option>
                <option value="مكملات">مكملات غذائية</option>
              </select>
            </div>

            {/* Availability */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">التوفر</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="ml-2 rtl:mr-2" />
                  <span className="text-sm">متوفر</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="ml-2 rtl:mr-2" />
                  <span className="text-sm">غير متوفر</span>
                </label>
              </div>
            </div>
          </Card>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map(product => (
              <ProductCard 
                key={product.id}
                product={{
                  ...product,
                  rating: product.rating || 4.5,
                  inStock: product.inStock,
                  originalPrice: product.originalPrice,
                  price: product.price,
                  discount: product.discount || 0,
                  image_url: product.image,
                  stock_quantity: product.inStock ? 10 : 0,
                  name: product.name,
                  brand: product.brand
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveProductsPage;
