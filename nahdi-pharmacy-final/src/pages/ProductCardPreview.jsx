import React from 'react';
import ProductCard from '../components/ProductCard';

const ProductCardPreview = () => {
  // Sample products data
  const products = [
    {
      id: 1,
      name: 'بانادول اكسترا اقراص',
      price: 25.99,
      originalPrice: 32.50,
      discount: 20,
      rating: 4.5,
      image: 'https://via.placeholder.com/300x300?text=Panadol+Extra',
      inStock: true
    },
    {
      id: 2,
      name: 'بروفينال اقراص مسكنة',
      price: 18.75,
      originalPrice: 22.00,
      discount: 15,
      rating: 4.2,
      image: 'https://via.placeholder.com/300x300?text=Profenal',
      inStock: true
    },
    {
      id: 3,
      name: 'فيتامين سي 1000 مجم',
      price: 45.00,
      originalPrice: 50.00,
      discount: 10,
      rating: 4.8,
      image: 'https://via.placeholder.com/300x300?text=Vitamin+C',
      inStock: true
    },
    {
      id: 4,
      name: 'كريم فيتامين اي للبشرة',
      price: 35.50,
      originalPrice: 42.00,
      discount: 15,
      rating: 4.6,
      image: 'https://via.placeholder.com/300x300?text=Vitamin+E+Cream',
      inStock: false
    },
    {
      id: 5,
      name: 'شامبو طبي للقشرة',
      price: 28.00,
      originalPrice: 32.00,
      discount: 12,
      rating: 4.3,
      image: 'https://via.placeholder.com/300x300?text=Dandruff+Shampoo',
      inStock: true
    },
    {
      id: 6,
      name: 'معقم لليدين 100 مل',
      price: 15.00,
      originalPrice: 18.00,
      discount: 17,
      rating: 4.7,
      image: 'https://via.placeholder.com/300x300?text=Hand+Sanitizer',
      inStock: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 text-right">
          معاينة بطاقات المنتجات
        </h1>
        
        {/* Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductCardPreview;
