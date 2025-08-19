import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaSpinner, FaExclamationTriangle, FaUpload } from 'react-icons/fa';
import { Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import ProductForm from './ProductForm';
import * as productService from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import { Dialog, DialogContent } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../../components/ui/alert-dialog';
import { 
  handleProductPublish, 
  handleProductUnpublish,
  isProductPublished, 
  isWholesaleProductPublished,
  PRODUCT_TYPES
} from '../../../utils/productUtils';
import SearchableSelect from '../../../components/SearchableSelect';

const WholesaleProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingPublishStatus, setIsCheckingPublishStatus] = useState(false);
  const [publishedWholesaleProducts, setPublishedWholesaleProducts] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [activatingProducts, setActivatingProducts] = useState({});
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [productToPublish, setProductToPublish] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [productToUnpublish, setProductToUnpublish] = useState(null);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const navigate = useNavigate();
  
  // Handle delete button click - opens the confirmation modal
  const handleDeleteClick = (product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();
    }
    setDeletingProduct(product);
    setIsDeleteModalOpen(true);
  };

  // Handle publish product
  const handlePublishClick = (product) => {
    setProductToPublish(product);
    setShowPublishDialog(true);
  };

  // Handle unpublish product
  const handleUnpublishClick = (product) => {
    // Check if product is actually published before showing the dialog
    if (isProductPublishedInWholesale(product)) {
      setProductToUnpublish(product);
      setShowUnpublishDialog(true);
    } else {
      // If not published, show a warning message
      toast('المنتج غير منشور بالفعل', { 
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: '#f8fafc',
          color: '#0f172a',
        },
      });
    }
  };

  const handlePublish = async (publishType) => {
    if (!productToPublish) return;
    
    try {
      setIsPublishing(true);
      const success = await handleProductPublish(
        productToPublish.id, 
        publishType,
        (updater) => {
          setProducts(updater);
          setFilteredProducts(updater);
        }
      );
      
      if (success) {
        // Refresh products to get the latest data
        await fetchProducts();
        // Refresh published products list
        await fetchPublishedWholesaleProducts();
      }
    } catch (error) {
      console.error('Error publishing product:', error);
    } finally {
      setIsPublishing(false);
      setShowPublishDialog(false);
      setProductToPublish(null);
    }
  };

  // Handle unpublish product
  const handleUnpublish = async () => {
    if (!productToUnpublish) return;
    
    try {
      setIsUnpublishing(true);
      
      // 1. Get current product index for optimistic update
      const productIndex = products.findIndex(p => p.id === productToUnpublish.id);
      if (productIndex === -1) return;
      
      // 2. Create updated product with published status set to false
      const updatedProduct = {
        ...productToUnpublish,
        is_published: false,
        published_at: null,
        status: 'inactive',
        is_active: false,
        published_wholesale: false,
        is_published_wholesale: false
      };
      
      // 3. Optimistically update the UI
      const updatedProducts = [...products];
      updatedProducts[productIndex] = updatedProduct;
      
      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);
      
      // 4. Call the unpublish utility function
      const success = await handleProductUnpublish(
        productToUnpublish.id, 
        'wholesale',
        // Local state update callback
        (updater) => {
          setProducts(updater);
          setFilteredProducts(updater);
        }
      );
      
      // 5. If successful, refresh data from server
      if (success) {
        console.log('Unpublish successful, refreshing data...');
        try {
          // Refresh both products and published products in sequence to avoid race conditions
          await fetchProducts();
          await fetchPublishedWholesaleProducts();
          
          // Show success message
          toast.success('تم إلغاء نشر المنتج بنجاح', {
            position: 'top-center',
            duration: 3000,
          });
          
        } catch (refreshError) {
          console.error('Error refreshing data after unpublish:', refreshError);
          // Even if refresh fails, the optimistic update keeps the UI consistent
        }
      } else {
        // If API call failed, revert the optimistic update
        setProducts(prev => [...prev]);
        setFilteredProducts(prev => [...prev]);
        
        toast.error('فشل إلغاء نشر المنتج. يرجى المحاولة مرة أخرى', {
          position: 'top-center',
          duration: 3000,
        });
      }
      
    } catch (error) {
      console.error('Error unpublishing product:', error);
      toast.error('حدث خطأ أثناء محاولة إلغاء نشر المنتج', {
        position: 'top-center',
        duration: 3000,
      });
      console.error('Error in handleUnpublish:', error);
      
      // Revert optimistic update on error
      setProducts(prev => [...prev]);
      setFilteredProducts(prev => [...prev]);
      
      // Show error message
      toast.error(error.message || 'حدث خطأ أثناء محاولة إلغاء نشر المنتج', {
        position: 'top-center',
        duration: 3000,
      });
    } finally {
      // Clean up UI state
      setIsUnpublishing(false);
      setShowUnpublishDialog(false);
      setProductToUnpublish(null);
    }
  };

  // Handle actual product deletion after confirmation
  const confirmDelete = async () => {
    if (!deletingProduct) return;
    
    setIsDeleting(true);
    try {
      console.log('Attempting to delete product:', deletingProduct.id);
      const response = await productService.deleteProduct(deletingProduct.id);
      
      console.log('Delete response:', response);
      
      if (response && response.success) {
        // Remove the deleted product from the list
        const updatedProducts = products.filter(p => p.id !== deletingProduct.id);
        setProducts(updatedProducts);
        setFilteredProducts(updatedProducts);
        
        toast.success(response.message || 'تم حذف المنتج بنجاح', {
          position: 'top-center',
          duration: 3000,
        });
      } else {
        throw new Error(response?.error || 'فشل حذف المنتج');
      }
    } catch (error) {
      console.error('Error in confirmDelete:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف المنتج', {
        position: 'top-center',
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeletingProduct(null);
    }
  };

  // Test toast notification
  const testToast = () => {
    toast.success('This is a test notification', {
      position: 'top-center',
      duration: 5000,
    });
  };
  
  // Handle product activation for wholesale - Modified to prevent automatic publishing
  const handleActivateProduct = async (productId) => {
    console.log('Product activation requested for ID:', productId);
    
    // Only proceed if explicitly called by user action, not on page load
    const product = products.find(p => p.id === productId);
    if (!product) {
      console.log('Product not found, cannot activate');
      return false;
    }

    // Check if already published
    if (isProductPublishedInWholesale(product)) {
      console.log('Product already published, no action needed');
      return true;
    }

    // Set loading state
    setActivatingProducts(prev => ({ ...prev, [productId]: true }));
    
    try {
      console.log('Activating product:', productId);
      const success = await handleProductPublish(
        productId,
        'wholesale',
        (updater) => {
          // This callback receives the state updater function
          setProducts(updater);
          setFilteredProducts(updater);
        }
      );
      
      return success;
    } catch (error) {
      console.error('Error in handleActivateProduct:', error);
      toast.error('حدث خطأ أثناء محاولة نشر المنتج');
      return false;
    } finally {
      // Clear loading state
      setActivatingProducts(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Fetch categories from API with better error handling
  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await categoryService.getWholesaleCategories();
      console.log('Raw categories response:', response);
      
      let categoriesData = [];
      
      if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response && Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response && response.data && typeof response.data === 'object') {
        categoriesData = Object.values(response.data);
      }
      
      console.log('Processed categories:', categoriesData);
      setCategories(categoriesData || []);
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('حدث خطأ أثناء جلب الأقسام');
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Helper function to get the full image URL with detailed logging
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      console.log('❌ No image path provided');
      return null;
    }

    // Base URL for the backend
    const baseUrl = 'http://localhost:8080';
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) {
      console.log('✅ Using full URL:', imagePath);
      return imagePath;
    }

    // Try different path formats
    const possiblePaths = [
      // Try as absolute path first
      `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`,
      // Try with /uploads/ prefix
      `${baseUrl}/uploads/${imagePath.replace(/^\/+/, '')}`,
      // Try with /api/v1/uploads/ prefix (common API endpoint)
      `${baseUrl}/api/v1/uploads/${imagePath.replace(/^\/+/, '')}`,
      // Try with /public/uploads/ (common public directory)
      `${baseUrl}/public/uploads/${imagePath.replace(/^\/+/, '')}`
    ];

    // Log all possible paths for debugging
    console.log('🔄 Trying possible image paths for', imagePath, ':', possiblePaths);
    
    // Return the first path - we'll handle 404s in the onError handler
    const finalUrl = possiblePaths[0];
    console.log('📤 Using image URL:', finalUrl);
    return finalUrl;
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching wholesale products...');
      
      const response = await productService.getAdminProducts({ limit: 1000 });
      const productsList = response.data || [];

      // Filter for wholesale products on the client-side
      const wholesaleProducts = productsList.filter(
        product => product && (product.type === 'wholesale' || product.product_type === 'wholesale' || product.is_wholesale === true)
      );

      setProducts(wholesaleProducts);
      setFilteredProducts(wholesaleProducts);
      return wholesaleProducts;
      

    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch published wholesale products
  const fetchPublishedWholesaleProducts = async () => {
    try {
      setIsCheckingPublishStatus(true);
      const response = await productService.getWholesaleProducts(1, 1000); // Get all published products
      if (response && response.data) {
        setPublishedWholesaleProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching published wholesale products:', error);
    } finally {
      setIsCheckingPublishStatus(false);
    }
  };

  // Check if product is published in wholesale store by checking product properties
  const isProductPublishedInWholesale = (product) => {
    if (!product) return false;
    // Check both possible properties that might indicate the product is published
    return product.published_wholesale === true || 
           product.is_published_wholesale === true ||
           product.status === 'published' ||
           product.is_published === true;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchCategories()
        ]);
        // After loading products, fetch published wholesale products
        await fetchPublishedWholesaleProducts();
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('حدث خطأ أثناء تحميل البيانات');
      }
    };
    
    loadData();
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    filterProducts(term, selectedCategory);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        product => product.category_id === categoryId
      );
      setFilteredProducts(filtered);
    }
  };

  const filterProducts = (term, categoryId) => {
    let result = [...products];
    
    if (term) {
      const searchTerm = term.toLowerCase();
      result = result.filter(product => 
        (product.name_ar || product.name || '').toLowerCase().includes(searchTerm) ||
        (product.description_ar || product.description || '').toLowerCase().includes(searchTerm) ||
        (product.barcode || '').includes(term)
      );
    }
    
    if (categoryId && categoryId !== 'all') {
      result = result.filter(product => product.category_id == categoryId);
    }
    
    setFilteredProducts(result);
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setIsFormOpen(true);
  };


  const handleFormSubmit = async (formData) => {
    try {
      // Ensure product type is set to wholesale and has required fields
      const productData = {
        ...formData,
        type: 'wholesale',
        // Ensure we're sending the category_id
        category_id: formData.category_id || currentProduct?.category_id,
        // Ensure these fields are properly set
        stock_quantity: parseInt(formData.stock_quantity || formData.stock || 0, 10),
        min_stock_level: parseInt(formData.min_stock_level || 5, 10)
      };

      console.log('Submitting product data:', productData);

      let response;
      if (currentProduct) {
        response = await productService.updateProduct(currentProduct.id, productData);
        toast.success('تم تحديث المنتج بنجاح');
      } else {
        response = await productService.createProduct(productData);
        console.log('Product created:', response);
        toast.success('تمت إضافة المنتج بنجاح');
      }
      
      // Close the form and reset current product
      setIsFormOpen(false);
      setCurrentProduct(null);
      
      // Update the products list with the new/updated product
      if (response) {
        // First update the state optimistically
        setProducts(prevProducts => {
          if (currentProduct) {
            // Update existing product
            return prevProducts.map(p => 
              p.id === response.id ? { ...p, ...response } : p
            );
          } else {
            // Add new product at the beginning of the list
            return [response, ...prevProducts];
          }
        });
        
        // Then refresh the list from the server to ensure consistency
        await fetchProducts();
      } else {
        // If no response, force a refresh from the server
        await fetchProducts();
      }
      
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ المنتج');
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">منتجات الجملة</h1>
        <div className="flex space-x-2">
          <button
            onClick={testToast}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <FaPlus className="ml-2" />
            اختبار الإشعار
          </button>
          <button
            onClick={() => {
              setCurrentProduct(null);
              setIsFormOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <FaPlus className="ml-2" />
            إضافة منتج جديد
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                filterProducts(e.target.value, selectedCategory);
              }}
            />
          </div>
          
          <div className="w-full md:w-64">
            <SearchableSelect
              options={[
                { value: 'all', label: 'جميع الفئات' },
                ...categories.map(cat => ({
                  value: cat.id,
                  label: cat.name_ar || cat.name
                }))
              ]}
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                filterProducts(searchTerm, value);
              }}
              placeholder="اختر فئة"
              loading={isLoadingCategories}
              noOptionsMessage="لا توجد فئات متاحة"
            />
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {!imageErrors[product.id] && (product.image_url || (product.images && product.images[0])) ? (
                          <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                            <img 
                              src={getImageUrl(product.image_url || (product.images && product.images[0]))} 
                              alt={product.name} 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const imgSrc = product.image_url || (product.images && product.images[0]);
                                setImageErrors(prev => ({...prev, [product.id]: true}));
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-xs text-center px-1">
                              {imageErrors[product.id] ? 'خطأ' : 'لا توجد'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.description?.substring(0, 30)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                         {categories.find(c => c.id === product.category_id)?.name || 'غير مصنف'}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.price} ر.س</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock_quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(product.published_wholesale === true || product.is_published_wholesale === true) ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">منشور</span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">غير منشور</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        {isProductPublishedInWholesale(product) ? (
                          <button
                            type="button"
                            onClick={() => handleUnpublishClick(product)}
                            className="text-yellow-600 hover:text-yellow-900 transition duration-150 ease-in-out p-1"
                            title="إلغاء نشر المنتج"
                            disabled={isUnpublishing && productToUnpublish?.id === product.id}
                          >
                            {isUnpublishing && productToUnpublish?.id === product.id ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <div className="flex items-center">
                                <FaExclamationTriangle className="ml-1" />
                                <span>إلغاء النشر</span>
                              </div>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePublishClick(product)}
                            className="text-green-600 hover:text-green-900 transition duration-150 ease-in-out p-1"
                            title="نشر المنتج"
                            disabled={isPublishing && productToPublish?.id === product.id}
                          >
                            {isPublishing && productToPublish?.id === product.id ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <div className="flex items-center">
                                <FaUpload className="ml-1" />
                                <span>نشر</span>
                              </div>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="text-indigo-600 hover:text-indigo-900 transition duration-150 ease-in-out"
                          title="تعديل المنتج"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(product, e)}
                          className="text-red-600 hover:text-red-900 transition duration-150 ease-in-out"
                          title="حذف المنتج"
                          disabled={isDeleting && deletingProduct?.id === product.id}
                        >
                          {isDeleting && deletingProduct?.id === product.id ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                        </button>
                      </div>
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
          type="wholesale"
        />
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={isDeleteModalOpen}
        onOpenChange={!isDeleting ? setIsDeleteModalOpen : undefined}
      >
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-lg p-6">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <FaExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-gray-600 dark:text-gray-300">
              هل أنت متأكد من رغبتك في حذف المنتج{' '}
              <span className="font-semibold text-gray-800 dark:text-white">
                {deletingProduct?.name_ar || deletingProduct?.name}
              </span>
              ؟
              <br />
              <span className="text-red-600 dark:text-red-400 font-medium mt-2 inline-block">
                هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse gap-3 justify-center sm:justify-end">
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {isDeleting ? (
                <>
                  <FaSpinner className="animate-spin ml-2" />
                  جاري الحذف...
                </>
              ) : (
                "تأكيد الحذف"
              )}
            </Button>
            <AlertDialogCancel 
              className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={isDeleting}
            >
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-lg p-6">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <FaUpload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              نشر المنتج للجملة
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-gray-600 dark:text-gray-300">
              هل أنت متأكد من رغبتك في نشر هذا المنتج في قسم الجملة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse gap-3 justify-center sm:justify-end">
            <Button 
              onClick={() => handlePublish('wholesale')}
              disabled={isPublishing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isPublishing ? (
                <>
                  <FaSpinner className="animate-spin ml-2" />
                  جاري النشر...
                </>
              ) : (
                "نشر للجملة"
              )}
            </Button>
            <AlertDialogCancel 
              className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={isPublishing}
            >
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog open={showUnpublishDialog} onOpenChange={!isUnpublishing ? setShowUnpublishDialog : undefined}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-lg p-6">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <FaExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              تأكيد إلغاء النشر
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-gray-600 dark:text-gray-300">
              هل أنت متأكد من رغبتك في إلغاء نشر المنتج{' '}
              <span className="font-semibold text-gray-800 dark:text-white">
                {productToUnpublish?.name_ar || productToUnpublish?.name}
              </span>{' '}
              من واجهة الجملة؟
              <br />
              <span className="text-red-600 dark:text-red-400 font-medium mt-2 inline-block">
                لن يظهر المنتج للعملاء بعد الآن.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse gap-3 justify-center sm:justify-end">
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={isUnpublishing}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {isUnpublishing ? (
                <>
                  <FaSpinner className="animate-spin ml-2" />
                  جاري الإلغاء...
                </>
              ) : (
                "تأكيد الإلغاء"
              )}
            </Button>
            <AlertDialogCancel 
              className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={isUnpublishing}
            >
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WholesaleProducts;
