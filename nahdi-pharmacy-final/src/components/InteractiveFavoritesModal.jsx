import React from 'react';
import { X, Heart, ShoppingCart, Star, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useShop } from '../context/useShop'; // تم تغيير مسار الاستيراد هنا

const InteractiveFavoritesModal = ({ isOpen, onClose }) => {
  const { favoriteItems, toggleFavorite, addToCart } = useShop(); // Changed removeFromFavorites to toggleFavorite

  const handleAddToCart = (product) => {
    addToCart(product);
    // Optional: Show a toast notification here
  };

  const handleRemoveFromFavorites = (product) => {
    toggleFavorite(product);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl transform transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold flex items-center text-gray-800">
            <Heart className="h-7 w-7 text-red-500 ml-3 rtl:mr-3 rtl:ml-0 fill-current" />
            <span className="ml-2 rtl:mr-2">قائمة المفضلة</span>
            <span className="bg-red-100 text-red-600 text-sm font-medium px-3 py-1 rounded-full mr-3 rtl:ml-3 rtl:mr-0">
              {favoriteItems.length}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
          {favoriteItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-50 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-16 w-16 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                قائمة المفضلة فارغة
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                لم تقم بإضافة أي منتجات إلى المفضلة بعد. ابدأ بتصفح المتجر وإضافة المنتجات المفضلة لديك.
              </p>
              <Button 
                onClick={onClose} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors duration-200"
              >
                تصفح المنتجات
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favoriteItems.map((product) => (
                <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border border-gray-100 rounded-xl overflow-hidden">
                  <CardContent className="p-0 h-full flex flex-col">
                    <div className="relative flex-1 flex flex-col">
                      {/* Product Image */}
                      <div className="relative pt-[100%] bg-gray-50">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="absolute inset-0 w-full h-full object-contain p-4"
                          loading="lazy"
                        />
                        {/* Remove from favorites button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromFavorites(product);
                          }}
                          className="absolute top-3 left-3 rtl:right-3 rtl:left-auto z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors duration-200"
                          aria-label="إزالة من المفضلة"
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </button>
                        {/* Discount badge */}
                        {product.discount > 0 && (
                          <div className="absolute top-3 right-3 rtl:left-3 rtl:right-auto bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
                            خصم {product.discount}%
                          </div> 
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="mb-3">
                          <h3 className="font-medium text-gray-800 mb-1 line-clamp-2 h-12 leading-tight">
                            {product.name}
                          </h3>
                          {product.brand && (
                            <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
                          )}
                        </div>
                        
                        {/* Rating */}
                        {product.rating && (
                          <div className="flex items-center mb-3">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${
                                    i < Math.floor(product.rating) 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-gray-200 fill-current'
                                  }`} 
                                />
                              ))}
                            </div>
                            {product.reviews && (
                              <span className="text-xs text-gray-500 mr-2 rtl:ml-2">
                                ({product.reviews})
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Price */}
                        <div className="mt-auto">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                              <span className="text-lg font-bold text-green-600">
                                {product.price.toFixed(2)} ر.س
                              </span>
                              {product.originalPrice && product.originalPrice > product.price && (
                                <span className="text-sm text-gray-400 line-through">
                                  {product.originalPrice.toFixed(2)} ر.س
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex space-x-2 rtl:space-x-reverse">
                            <Button 
                              onClick={() => handleAddToCart(product)}
                              disabled={!product.inStock}
                              className={`flex-1 h-10 rounded-lg font-medium transition-colors duration-200 ${
                                product.inStock 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <ShoppingCart className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                              {product.inStock ? 'أضف للسلة' : 'غير متوفر'}
                            </Button>
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromFavorites(product);
                              }}
                              variant="outline"
                              className="h-10 w-10 p-0 flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200 hover:border-red-300 transition-colors duration-200"
                              aria-label="حذف من المفضلة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {favoriteItems.length > 0 && (
          <div className="border-t border-gray-100 p-4 bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-gray-600 text-sm sm:text-base">
                <span className="font-medium">إجمالي العناصر:</span> {favoriteItems.length} منتج
              </p>
              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  متابعة التسوق
                </Button>
                <Button 
                  onClick={() => {
                    const inStockItems = favoriteItems.filter(product => product.inStock);
                    inStockItems.forEach(product => addToCart(product));
                    onClose();
                  }}
                  className="w-full sm:w-auto px-6 h-11 bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
                >
                  <ShoppingCart className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                  أضف الكل للسلة
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Global styles for scrollbar */}
      <style jsx global>{`n        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default InteractiveFavoritesModal;
