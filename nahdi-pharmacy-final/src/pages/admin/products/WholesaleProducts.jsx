import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaEdit, FaTrash } from 'react-icons/fa';
import ProductForm from './ProductForm';

const wholesaleCategories = [
  'أدوية قلب',
  'أدوية أعصاب',
  'أدوية عامة',
  'مستلزمات طبية'
];

const WholesaleProducts = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const navigate = useNavigate();

  // Mock data - replace with API calls
  useEffect(() => {
    // Fetch products from API
    const mockProducts = [];
    setProducts(mockProducts);
    setFilteredProducts(mockProducts);
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    filterProducts(term, selectedCategory);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    filterProducts(searchTerm, category);
  };

  const filterProducts = (term, category) => {
    let result = [...products];
    
    if (term) {
      result = result.filter(product => 
        product.name.toLowerCase().includes(term.toLowerCase()) ||
        product.description?.toLowerCase().includes(term.toLowerCase())
      );
    }
    
    if (category && category !== 'الكل') {
      result = result.filter(product => product.category === category);
    }
    
    setFilteredProducts(result);
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    // Call API to delete product
    console.log('Delete product:', id);
  };

  const handleFormSubmit = async (productData) => {
    // Call API to save product
    console.log('Save product:', productData);
    setIsFormOpen(false);
    setCurrentProduct(null);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">منتجات الجملة</h2>
        <button
          onClick={() => {
            setCurrentProduct(null);
            setIsFormOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <FaPlus className="ml-2" />
          إضافة منتج جديد
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="بحث عن منتج..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => handleCategoryChange('الكل')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                selectedCategory === 'الكل' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل
            </button>
            {wholesaleCategories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                  selectedCategory === category 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصورة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اسم المنتج</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفئة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية المتوفرة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">صورة</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.description?.substring(0, 30)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.price} ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-900 mx-2"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900 mx-2"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    لا توجد منتجات متاحة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <ProductForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setCurrentProduct(null);
          }}
          onSubmit={handleFormSubmit}
          product={currentProduct}
          categories={wholesaleCategories}
          type="wholesale"
        />
      )}
    </div>
  );
};

export default WholesaleProducts;
