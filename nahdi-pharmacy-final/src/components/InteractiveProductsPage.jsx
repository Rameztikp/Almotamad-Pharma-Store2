import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronDown, Loader2, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useShop } from "../context/useShop";
import productService from '../services/productService';
import { toast } from 'react-hot-toast';
import ProductCard from './ProductCard';
import { debounce } from 'lodash';

const InteractiveProductsPage = ({ productType = 'retail' }) => {
  const { addToCart, toggleFavorite, favoriteItems, cartItems } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    priceRange: '',
    brand: '',
    category: '',
    inStock: false
  });

  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);

  // Memoize the debounce function
  const debouncedSearch = useMemo(
    () =>
      debounce((searchValue) => {
        setSearchTerm(searchValue);
        setIsFiltering(false);
      }, 500),
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Sync category from URL search params on mount and when it changes
  useEffect(() => {
    const urlCategory = searchParams.get('category') || '';
    setFilters((prev) => {
      if (prev.category === urlCategory) return prev;
      return { ...prev, category: urlCategory };
    });
  }, [searchParams]);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setIsFiltering(true);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    const searchInput = document.getElementById('search');
    if (searchInput) searchInput.value = '';
  }, []);

  // Fetch products when component mounts or when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`[${productType}] Fetching products...`);
        
        // Build filters object based on search term and other filters
        const apiFilters = {};
        
        // Add search term filter if exists
        if (searchTerm) {
          apiFilters['filters[title][$containsi]'] = searchTerm;
        }
        
        // Add other filters from the filters state
        if (filters.brand) {
          apiFilters['filters[brand][$eq]'] = filters.brand;
        }
        
        if (filters.category) {
          apiFilters['filters[categories][slug][$eq]'] = filters.category;
        }
        
        if (filters.priceRange) {
          const [min, max] = filters.priceRange.split('-').map(Number);
          if (!isNaN(min)) apiFilters['filters[price][$gte]'] = min;
          if (!isNaN(max)) apiFilters['filters[price][$lte]'] = max;
        }
        
        if (filters.inStock) {
          apiFilters['filters[stock][$gt]'] = 0;
        }
        
        // Use the unified function to fetch products by type
        const response = await productService.fetchProductsByType({
          type: productType,
          page: 1, // You can implement pagination later if needed
          limit: 50, // Adjust based on your requirements
          filters: apiFilters,
          sort: sortBy === 'price_asc' ? 'price:asc' : 
                sortBy === 'price_desc' ? 'price:desc' :
                'created_at:desc'
        });
        
        console.log(`[${productType}] Fetched ${response.data.length} products`);
        setProducts(response.data);
        
      } catch (error) {
        console.error(`Error fetching ${productType} products:`, error);
        setError(error.message || `حدث خطأ في تحميل منتجات ${productType === 'wholesale' ? 'الجملة' : 'التجزئة'}`);
        toast.error(`حدث خطأ في تحميل المنتجات`);
      } finally {
        setIsLoading(false);
        setIsFiltering(false);
      }
    };
    
    fetchProducts();
    
    // Cleanup debounce on unmount
    return () => {
      debouncedSearch.cancel();
    };
  }, [productType, searchTerm, sortBy, filters]);

  // Filter products based on search term and filters
  const filteredProducts = useMemo(() => {
    if (isLoading || !Array.isArray(products)) return [];
    
    // Create a safe copy of products
    let result = [...products];
    
    // Helper function to get category name
    const getCategoryName = (category) => {
      if (!category) return '';
      if (typeof category === 'string') return category.toLowerCase();
      if (typeof category === 'object' && category !== null) {
        return (category.name || category.id || '').toLowerCase();
      }
      return '';
    };
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(product => {
        const productCategory = getCategoryName(product.category);
        return (
          product.name?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower) ||
          productCategory.includes(searchLower)
        );
      });
    }
    
    // Apply price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      result = result.filter(product => {
        const price = product.price || 0;
        if (max) {
          return price >= min && price <= max;
        } else {
          return price >= min;
        }
      });
    }
    
    // Apply brand filter if set
    if (filters.brand) {
      result = result.filter(product => product?.brand === filters.brand);
    }
    
    return result;
  }, [products, searchTerm, filters, isLoading]);

  // Function to handle adding to cart with toast 
  const handleAddToCart = useCallback((product) => {
    if (!product) return;
    
    // Prepare product data for cart
    const productData = {
      ...product,
      // Ensure price is a number
      price: parseFloat(product.price) || 0,
      // Handle both string and object categories
      category: typeof product.category === 'object' 
        ? product.category.name || product.category.id || ''
        : product.category || '',
      // Handle stock status
      inStock: product.stock_quantity > 0,
      // Handle images
      image: product.image_url || product.image || 'https://via.placeholder.com/300x300?text=No+Image',
      // Handle discount if available
      discount: product.discount_percentage || product.discount || 0,
      // Calculate original price if there's a discount
      originalPrice: product.original_price || (product.discount_percentage 
        ? (parseFloat(product.price) / (1 - (product.discount_percentage / 100))).toFixed(2)
        : parseFloat(product.price) || 0)
    };
    
    // Check if product is already in cart
    const existingItem = cartItems.find(item => item.id === productData.id);
    const quantity = existingItem ? (existingItem.quantity || 1) + 1 : 1;
    
    // Add to cart
    addToCart({
      ...productData,
      quantity,
      price: parseFloat(productData.price) || 0,
      originalPrice: parseFloat(productData.originalPrice || productData.price) || 0
    });
    
    // Show success message
    toast.success(`تمت إضافة ${product.name} إلى السلة`, {
      position: 'bottom-left',
      duration: 3000,
      className: 'bg-green-50 text-green-700 font-medium',
      icon: '🛒',
    });
  }, [addToCart, cartItems]);
  
  // Toggle favorite handler
  const handleToggleFavorite = useCallback((product) => {
    if (!product) return;
    
    // Check if product is in favorites
    const isCurrentlyFavorite = favoriteItems.some(item => item.id === product.id);
    
    // Prepare product data for favorites
    const productData = {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price) || 0,
      image: product.image_url || product.image || 'https://via.placeholder.com/300x300?text=No+Image',
      inStock: product.stock_quantity > 0,
      // Include type information for wholesale vs retail
      type: product.type || product.productType || 'retail'
    };
    
    // Toggle favorite status
    toggleFavorite(productData);
    
    // Show success message
    const message = isCurrentlyFavorite 
      ? `تمت إزالة "${product.name}" من المفضلة`
      : `تمت إضافة "${product.name}" ${product.stock_quantity <= 0 ? 'سيتم إشعارك عند توفر المنتج.' : 'إلى المفضلة'}`;
    
    toast.success(
      <div className="flex items-center">
        <span>{message}</span>
        <button 
          onClick={() => toast.dismiss()}
          className="mr-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>,
      {
        duration: 3000,
        position: 'bottom-left',
        className: 'bg-blue-50 text-blue-700 font-medium'
      }
    );
  }, [favoriteItems, toggleFavorite]);

  // Memoized check if product is in favorites
  const isFavorite = useCallback((productId) => {
    return favoriteItems.some(item => item.id === productId);
  }, [favoriteItems]);

  // Memoized unique brands and categories for filter
  const { brands, categories } = useMemo(() => {
    const brandSet = new Set();
    const categorySet = new Set();
    
    products.forEach(product => {
      // Handle brand (should be a string)
      if (product.brand) {
        brandSet.add(product.brand);
      }
      
      // Handle category (could be string or object)
      if (product.category) {
        if (typeof product.category === 'object' && product.category !== null) {
          // If category is an object, use its name or id
          const categoryName = product.category.name || product.category.id || '';
          if (categoryName) categorySet.add(categoryName);
        } else if (typeof product.category === 'string') {
          // If category is a string, use it directly
          categorySet.add(product.category);
        }
      }
    });
    
    // Convert to arrays and sort
    const uniqueBrands = Array.from(brandSet).filter(Boolean).sort();
    const uniqueCategories = Array.from(categorySet).filter(Boolean).sort();
    
    return {
      brands: uniqueBrands,
      categories: uniqueCategories
    };
  }, [products]);

  // Memoize sorted products based on current sort option and filtered products
  const sortedProducts = useMemo(() => {
    if (isLoading || error) return [];
    
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price-low-high':
          return (a.price || 0) - (b.price || 0);
        case 'price-high-low':
          return (b.price || 0) - (a.price || 0);
        case 'popular':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });
  }, [filteredProducts, sortBy, isLoading, error]);

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-gray-600">جاري تحميل المنتجات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 rtl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 mb-4 flex items-center">
        <a href="/" className="hover:text-blue-600 transition-colors">الرئيسية</a>
        <ChevronDown className="h-3 w-3 mx-1 transform rotate-270" />
        <span className="text-blue-600 font-medium">المنتجات</span>
      </nav>

      {/* Results count and sorting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl font-bold text-gray-800">منتجات التجزئة</h1>
          <p className="text-gray-600 mt-1">
            {isFiltering ? (
              <span>جاري البحث...</span>
            ) : (
              <span>عرض {filteredProducts.length} من {products.length} منتج</span>
            )}
          </p>
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-gray-600 whitespace-nowrap">
            ترتيب حسب:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full md:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="newest">الأحدث</option>
            <option value="price-low-high">السعر: من الأقل للأعلى</option>
            <option value="price-high-low">السعر: من الأعلى للأقل</option>
            <option value="popular">الأكثر شعبية</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
              <Filter className="h-5 w-5 ml-2 rtl:mr-2" />
              تصفية النتائج
            </h3>
            
            {/* Search */}
            <div className="mb-4">
              <label htmlFor="search" className="block text-sm font-medium mb-2 text-gray-700">
                البحث
              </label>
              <div className="relative">
                <Input
                  id="search"
                  type="text"
                  placeholder="ابحث عن منتج..."
                  defaultValue={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-8 w-full"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {searchTerm ? (
                    <button 
                      onClick={clearSearch}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="مسح البحث"
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <Search className="text-gray-400 h-4 w-4" />
                  )}
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-4">
              <label htmlFor="priceRange" className="block text-sm font-medium mb-2 text-gray-700">
                نطاق السعر
              </label>
              <select 
                id="priceRange"
                value={filters.priceRange}
                onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">جميع الأسعار</option>
                <option value="0-25">0 - 25 ريال</option>
                <option value="25-50">25 - 50 ريال</option>
                <option value="50-100">50 - 100 ريال</option>
                <option value="100-200">100 - 200 ريال</option>
                <option value="200+">200+ ريال</option>
              </select>
            </div>

            {/* Brand Filter */}
            <div className="mb-4">
              <label htmlFor="brand" className="block text-sm font-medium mb-2 text-gray-700">
                العلامة التجارية
              </label>
              <select 
                id="brand"
                value={filters.brand || ''}
                onChange={(e) => setFilters({...filters, brand: e.target.value || null})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">جميع العلامات</option>
                {brands.map((brand) => {
                  const brandName = typeof brand === 'object' ? (brand.name || brand.id || '') : brand;
                  const brandValue = typeof brand === 'object' ? (brand.id || '') : brand;
                  
                  return (
                    <option key={brandValue} value={brandValue}>
                      {brandName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <label htmlFor="category" className="block text-sm font-medium mb-2 text-gray-700">
                الفئة
              </label>
              <select 
                id="category"
                value={filters.category || ''}
                onChange={(e) => setFilters({...filters, category: e.target.value || null})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">جميع الفئات</option>
                {categories.map((category) => {
                  const categoryName = typeof category === 'object' ? (category.name || category.id || '') : category;
                  const categoryValue = typeof category === 'object' ? (category.id || '') : category;
                  
                  return (
                    <option key={categoryValue} value={categoryValue}>
                      {categoryName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Availability */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                الحالة
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) => {
                      setFilters(prev => ({
                        ...prev,
                        inStock: e.target.checked
                      }));
                    }}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="mr-2 text-sm text-gray-700">
                    {filters.inStock ? 'عرض المتوفر فقط' : 'عرض الكل'}
                  </span>
                </label>
              </div>
            </div>

            {/* Clear Filters Button */}
            <Button
              onClick={() => {
                setFilters({
                  priceRange: '',
                  brand: '',
                  category: '',
                  inStock: false
                });
                setSearchTerm('');
              }}
              variant="outline"
              className="w-full mt-4 text-sm"
            >
              مسح الفلاتر
            </Button>
          </Card>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <img 
                src="/images/no-products.svg" 
                alt="لا توجد منتجات" 
                className="h-40 mx-auto mb-6"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctext%20x%3D%22100%22%20y%3D%22100%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
                }}
              />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || Object.values(filters).some(Boolean) 
                  ? 'لم نتمكن من العثور على منتجات تطابق معايير البحث' 
                  : 'لا توجد منتجات متاحة حاليًا'}
              </p>
              <Button
                onClick={() => {
                  setFilters({
                    priceRange: '',
                    brand: '',
                    category: '',
                    inStock: false
                  });
                  setSearchTerm('');
                  const searchInput = document.getElementById('search');
                  if (searchInput) searchInput.value = '';
                }}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <X className="ml-2 h-4 w-4" />
                مسح كل الفلاتر
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  // Ensure product has required fields
                  const productData = {
                    ...product,
                    // Handle both string and object categories
                    category: typeof product.category === 'object' 
                      ? product.category.name || product.category.id || ''
                      : product.category || '',
                    // Ensure price is a number
                    price: parseFloat(product.price) || 0,
                    // Handle stock quantity
                    inStock: product.stock_quantity > 0,
                    // Handle images
                    image: product.image_url || product.image || 'https://via.placeholder.com/300x300?text=No+Image',
                    // Handle discount if available
                    discount: product.discount_percentage || product.discount || 0,
                    // Calculate original price if there's a discount
                    originalPrice: product.original_price || (product.discount_percentage 
                      ? (parseFloat(product.price) / (1 - (product.discount_percentage / 100))).toFixed(2)
                      : parseFloat(product.price) || 0)
                  };
                  
                  return (
                    <ProductCard
                      key={product.id}
                      product={productData}
                      onAddToCart={() => handleAddToCart(productData)}
                      onToggleFavorite={() => handleToggleFavorite(productData)}
                      isFavorite={isFavorite(product.id)}
                    />
                  );
                })}
              </div>
              
              {filteredProducts.length > 0 && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500">
                    عرض {Math.min(filteredProducts.length, 12)} من أصل {filteredProducts.length} منتج
                  </p>
                  {filteredProducts.length > 12 && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        toast('سيتم تحميل المزيد من النتائج قريبًا', {
                          icon: 'ℹ️',
                          position: 'bottom-center'
                        });
                      }}
                    >
                      تحميل المزيد
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveProductsPage;
