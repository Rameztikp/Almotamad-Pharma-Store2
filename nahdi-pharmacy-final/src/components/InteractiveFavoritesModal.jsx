import React from 'react';
import { X, Heart, ShoppingCart, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useShop } from '../context/useShop'; // تم تغيير مسار الاستيراد هنا

const InteractiveFavoritesModal = ({ isOpen, onClose }) => {
  const { favoriteItems, toggleFavorite, addToCart } = useShop(); // Changed removeFromFavorites to toggleFavorite

  const handleAddToCart = (product) => {
    addToCart(product);
    // Optional: Show a toast notification here
  };

  const handleRemoveFromFavorites = (productId) => {
    removeFromFavorites(productId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold flex items-center">
            <Heart className="h-6 w-6 text-red-500 ml-2 rtl:mr-2" />
            المفضلة ({favoriteItems.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {favoriteItems.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="mx-auto h-24 w-24 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                لا توجد منتجات في المفضلة
              </h3>
              <p className="text-gray-500 mb-6">
                ابدأ بإضافة المنتجات التي تعجبك إلى المفضلة
              </p>
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                تصفح المنتجات
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteItems.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <button
                        onClick={() => handleRemoveFromFavorites(product.id)}
                        className="absolute top-2 left-2 rtl:right-2 rtl:left-auto p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                      {product.discount > 0 && (
                        <div className="absolute top-2 right-2 rtl:left-2 rtl:right-auto bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                          خصم {product.discount}%
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
                      
                      {product.rating && (
                        <div className="flex items-center mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${
                                  i < Math.floor(product.rating) 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`} 
                              />
                            ))}
                          </div>
                          {product.reviews && (
                            <span className="text-sm text-gray-600 mr-2 rtl:ml-2">({product.reviews})</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <span className="text-lg font-bold text-green-600">
                            {product.price.toFixed(2)} ريال
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-sm text-gray-500 line-through">
                              {product.originalPrice.toFixed(2)} ريال
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <Button 
                          onClick={() => handleAddToCart(product)}
                          disabled={!product.inStock}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="h-4 w-4 ml-2 rtl:mr-2" />
                          {product.inStock ? 'أضف للسلة' : 'غير متوفر'}
                        </Button>
                        
                        <Button 
                          onClick={() => handleRemoveFromFavorites(product.id)}
                          variant="outline"
                          className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300"
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
          <div className="border-t p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">
                إجمالي المنتجات المفضلة: {favoriteItems.length}
              </p>
              <div className="flex space-x-3 rtl:space-x-reverse">
                <Button variant="outline" onClick={onClose}>
                  إغلاق
                </Button>
                <Button 
                  onClick={() => {
                    favoriteItems.forEach(product => {
                      if (product.inStock) {
                        addToCart(product);
                      }
                    });
                    onClose();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  أضف الكل للسلة
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveFavoritesModal;
