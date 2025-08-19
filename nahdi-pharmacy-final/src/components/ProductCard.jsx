import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Package } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { toast } from 'react-hot-toast';

// صورة افتراضية محلية
const defaultImage = '/images/ass.jpg';

const ProductCard = ({ product, onToggleFavorite, isFavorite: isFavoriteProp }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { addToCart, cartItems, favoriteItems, toggleFavorite: toggleFavoriteContext } = useShop();
  const navigate = useNavigate();

  const productData = useMemo(() => {
    if (!product) {
      return {
        id: 1,
        name: 'منتج تجريبي',
        price: 0,
        originalPrice: 0,
        discount: 0,
        rating: 0,
        image: 'https://via.placeholder.com/300x300?text=No+Image',
        inStock: false,
        stock_quantity: 0,
        type: 'retail',
        min_quantity: 1
      };
    }

    const category = typeof product.category === 'object' 
      ? product.category?.name || product.category?.id || ''
      : product.category || '';

    const discount = product.discount_percentage || product.discount || 0;
    const price = parseFloat(product.price) || 0;
    const originalPrice = product.original_price 
      ? parseFloat(product.original_price)
      : discount > 0 
        ? (price / (1 - (discount / 100))).toFixed(2)
        : price;

    return {
      ...product,
      id: product.id || Date.now(),
      name: product.name || 'منتج بدون اسم',
      description: product.description || '',
      price: price,
      originalPrice: parseFloat(originalPrice),
      discount: discount,
      rating: parseFloat(product.rating) || 0,
      image: product.image_url || product.image || defaultImage,
      inStock: (product.stock_quantity || 0) > 0,
      stock_quantity: product.stock_quantity || 0,
      category: category,
      type: product.type || 'retail',
      brand: product.brand || 'غير معروف',
      min_quantity: product.min_quantity || 1
    };
  }, [product]);

  const isFavorite = typeof isFavoriteProp === 'boolean' 
    ? isFavoriteProp 
    : favoriteItems?.some(item => item.id === productData.id) || false;

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const result = await toggleFavoriteContext(productData);
      
      if (result.success) {
        const newFavoriteState = !isFavorite;
        toast.success(
          newFavoriteState 
            ? `تمت إضافة "${productData.name}" إلى المفضلة`
            : `تمت إزالة "${productData.name}" من المفضلة`,
          {
            position: 'bottom-center',
            duration: 2000,
            icon: newFavoriteState ? '❤️' : '💔',
            style: {
              borderRadius: '10px',
              background: newFavoriteState ? '#f0fdf4' : '#fef2f2',
              color: newFavoriteState ? '#166534' : '#991b1b',
              padding: '12px 16px',
              fontSize: '14px',
              border: `1px solid ${newFavoriteState ? '#bbf7d0' : '#fecaca'}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('حدث خطأ أثناء تحديث المفضلة');
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productData.inStock) {
      toast.error('هذا المنتج غير متوفر حالياً', {
        position: 'bottom-center',
        duration: 2000,
        icon: '⚠️',
      });
      return;
    }

    setIsAddingToCart(true);

    try {
      const cartItem = {
        ...productData,
        quantity: 1, // Always add 1 at a time
        price: parseFloat(productData.price),
        originalPrice: parseFloat(productData.originalPrice || productData.price),
      };

      await addToCart(cartItem);

      const productTypeLabel = productData.type === 'wholesale' ? 'الجملة' : 'التجزئة';

      toast.success(
        <div className="flex items-center">
          <span>تمت إضافة {productData.name} إلى سلة {productTypeLabel}</span>
        </div>,
        {
          duration: 3000,
          position: 'bottom-center',
          className: 'bg-green-50 text-green-700 font-medium',
        }
      );
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج إلى السلة', {
        position: 'bottom-center',
        duration: 2000,
        icon: '❌',
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const savingsPercentage = productData.discount > 0 
    ? Math.round((productData.discount / productData.originalPrice) * 100) 
    : 0;

  return (
    <div 
      className="relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 transform hover:shadow-xl hover:-translate-y-1 border border-gray-100 flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/product/${productData.id}`)}
    >
      {/* Product Type Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          productData.type === 'wholesale' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {productData.type === 'wholesale' ? 'جملة' : 'تجزئة'}
        </div>
      </div>

      {/* Favorite Button */}
      <button
        onClick={toggleFavorite}
        className="absolute top-3 right-3 z-10 p-2 bg-white/80 rounded-full shadow-sm hover:bg-gray-100 transition-colors"
        aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      >
        <Heart 
          className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
        />
      </button>

      {/* Product Image */}
      <div className="relative pt-[100%] overflow-hidden">
        <img 
          src={imgError ? defaultImage : (productData.image || defaultImage)}
          alt={productData.name}
          className="absolute top-0 right-0 w-full h-full object-cover transition-transform duration-500"
          style={{
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
          }}
          loading="lazy"
          onError={(e) => {
            console.error('فشل في تحميل صورة المنتج:', {
              productId: productData.id,
              imageUrl: productData.image,
              error: 'فشل في تحميل الصورة'
            });
            setImgError(true);
            e.target.src = defaultImage;
          }}
          onLoad={() => {
            // إعادة تعيين حالة الخطأ عند تحميل الصورة بنجاح
            if (imgError) setImgError(false);
          }}
        />

        {/* Discount Badge */}
        {productData.discount > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-r-full">
            خصم {savingsPercentage}%
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!productData.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="bg-white/90 text-red-600 font-medium px-3 py-1 rounded-full text-sm">
              غير متوفر
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 flex-grow flex flex-col">
        {/* Category */}
        {productData.category && (
          <div className="text-xs text-gray-500 mb-1 truncate">
            {productData.category}
          </div>
        )}

        {/* Product Name */}
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 h-10 flex items-center">
          {productData.name}
        </h3>

        {/* Brand */}
        {productData.brand && (
          <div className="text-xs text-gray-500 mb-2">
            {productData.brand}
          </div>
        )}

        {/* Price Section */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              {/* Current Price */}
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(productData.price)}
              </span>

              {/* Original Price with Strikethrough */}
              {productData.discount > 0 && (
                <span className="text-sm text-gray-400 line-through mr-2">
                  {formatPrice(productData.originalPrice)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className={`text-xs px-2 py-1 rounded-full ${
              productData.inStock 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {productData.inStock ? 'متوفر' : 'غير متوفر'}
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!productData.inStock || isAddingToCart}
            className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center ${
              productData.inStock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isAddingToCart ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                جاري الإضافة...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 ml-2" />
                {productData.inStock ? 'أضف إلى السلة' : 'غير متوفر'}
              </>
            )}
          </button>

          {/* Quick Actions */}
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                // Handle quick view
              }}
              className="hover:text-blue-600 transition-colors">
              عرض سريع
            </button>
            
            {productData.type === 'wholesale' && (
              <div className="flex items-center">
                <Package className="h-3 w-3 ml-1" />
                <span>الحد الأدنى: {productData.min_quantity} قطع</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
