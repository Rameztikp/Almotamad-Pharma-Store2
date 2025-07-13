import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { toast } from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart, cartItems } = useShop();
  const navigate = useNavigate();
  
  // Use the product prop directly
  const productData = product || {
    id: 1,
    name: 'دواء بانادول اكسترا',
    price: 25.99,
    originalPrice: 32.50,
    discount: 20,
    rating: 4.5,
    image: 'https://via.placeholder.com/300x300?text=Panadol+Extra',
    inStock: true
  };

  const toggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    toast.success(!isFavorite ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة');
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!productData.inStock) return;
    
    setIsAddingToCart(true);
    
    try {
      // Check if product is already in cart
      const existingItem = cartItems.find(item => item.id === productData.id);
      const quantity = existingItem ? (existingItem.quantity || 1) + 1 : 1;
      
      // Add to cart using the shop context
      await addToCart({
        ...productData,
        quantity: 1, // Add one item at a time
        price: parseFloat(productData.price),
        originalPrice: parseFloat(productData.originalPrice || productData.price)
      });
      
      // Show success message
      toast.success(`تمت إضافة ${productData.name} إلى السلة`, {
        position: 'bottom-center',
        duration: 2000,
        icon: '🛒',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
          padding: '16px',
          fontSize: '14px',
        },
      });
      
      // Optionally, navigate to cart after a short delay
      // setTimeout(() => {
      //   navigate('/cart');
      // }, 1000);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج إلى السلة');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div 
      className={`relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 transform hover:shadow-xl hover:-translate-y-1 border border-gray-100 flex flex-col h-full`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image */}
      <div className="relative pt-[100%] overflow-hidden">
        <img 
          src={productData.image} 
          alt={productData.name}
          className="absolute top-0 right-0 w-full h-full object-cover transition-transform duration-500"
          style={{
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
          }}
          loading="lazy"
        />
        
        {/* Discount Badge */}
        {productData.discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
            خصم {productData.discount}%
          </div>
        )}
        
        {/* Favorite Button */}
        <button 
          onClick={toggleFavorite}
          className={`absolute top-3 right-3 p-2 rounded-full transition-colors duration-200 ${
            isFavorite 
              ? 'text-red-500 bg-white/90 shadow-md' 
              : 'text-gray-400 bg-white/80 hover:bg-white/90 hover:text-red-400'
          }`}
          aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        >
          <Heart 
            className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} 
          />
        </button>
      </div>
      
      {/* Product Info */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Product Name */}
        <h3 className="text-gray-800 font-medium text-base mb-2 leading-tight line-clamp-2 h-12">
          {productData.name}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center mb-3">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(productData.rating) 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500 mr-1">({productData.rating})</span>
        </div>
        
        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900">
                {productData.price.toFixed(2)} ر.س
              </span>
              {productData.originalPrice > productData.price && (
                <span className="text-xs text-gray-500 line-through">
                  {productData.originalPrice.toFixed(2)} ر.س
                </span>
              )}
            </div>
            
            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!productData.inStock || isAddingToCart}
              className={`flex items-center justify-center px-3 py-2 rounded-lg font-medium text-sm transition-colors min-w-[100px] ${
                !productData.inStock
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : isAddingToCart
                  ? 'bg-blue-700 text-white cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isAddingToCart ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري الإضافة
                </>
              ) : (
                <>
                  <ShoppingCart className="ml-1 w-4 h-4" />
                  {productData.inStock ? 'أضف للسلة' : 'غير متوفر'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
