import React, { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaExclamationTriangle,
  FaUpload,
  FaChevronDown
} from "react-icons/fa";
import { Transition } from "@headlessui/react";
import toast from "react-hot-toast";
import ProductForm from "./ProductForm";
import * as productService from "../../../services/productService";
import { categoryService } from "../../../services/categoryService";
import { Dialog } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import {
  handleProductPublish,
  handleProductUnpublish,
  isProductPublished,
  isRetailProductPublished,
  PRODUCT_TYPES,
} from "../../../utils/productUtils";
import SearchableSelect from '../../../components/SearchableSelect';

const RetailProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingPublishStatus, setIsCheckingPublishStatus] = useState(false);
  const [publishedRetailProducts, setPublishedRetailProducts] = useState([]);
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

  // Handle product deletion
  const handleDeleteClick = (product) => {
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
    if (isProductPublishedInRetail(product)) {
      setProductToUnpublish(product);
      setShowUnpublishDialog(true);
    } else {
      toast("المنتج غير منشور بالفعل", {
        icon: "⚠️",
        style: {
          borderRadius: "10px",
          background: "#f8fafc",
          color: "#0f172a",
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
        await fetchProducts();
      }
    } catch (error) {
      console.error("Error publishing product:", error);
    } finally {
      setIsPublishing(false);
      setShowPublishDialog(false);
      setProductToPublish(null);
    }
  };

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
        is_published_retail: false,  // Specific for retail
        published_at_retail: null,   // Specific for retail
        published_retail: false      // Additional retail-specific flag
      };
      
      // 3. Optimistically update the UI
      const updatedProducts = [...products];
      updatedProducts[productIndex] = updatedProduct;
      
      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);
      
      // 4. Call the unpublish utility function
      const success = await handleProductUnpublish(
        productToUnpublish.id, 
        'retail',
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
          await fetchPublishedRetailProducts();
          
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
      console.error('Error in handleUnpublish:', error);
      
      // Revert optimistic update on error
      setProducts(prev => [...prev]);
      setFilteredProducts(prev => [...prev]);
      
      toast.error(error.message || 'حدث خطأ أثناء محاولة إلغاء نشر المنتج', {
        position: 'top-center',
        duration: 3000,
      });
    } finally {
      setIsUnpublishing(false);
      setShowUnpublishDialog(false);
      setProductToUnpublish(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;

    setIsDeleting(true);
    try {
      console.log("Deleting product:", deletingProduct.id);
      const response = await productService.deleteProduct(deletingProduct.id);

      if (response.success) {
        const updatedProducts = products.filter(
          (p) => p.id !== deletingProduct.id
        );
        setProducts(updatedProducts);
        setFilteredProducts(updatedProducts);

        toast.success(response.message || "تم حذف المنتج بنجاح", {
          position: "top-center",
          duration: 3000,
        });
      } else {
        throw new Error(response.error || "فشل حذف المنتج");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(error.message || "حدث خطأ أثناء حذف المنتج", {
        position: "top-center",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeletingProduct(null);
    }
  };

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await categoryService.getCategories();
      let categoriesData = [];
      if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response && Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response && response.data && typeof response.data === 'object') {
        categoriesData = Object.values(response.data);
      }
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("حدث خطأ أثناء جلب الأقسام");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Helper function to get the full image URL with detailed logging (مثل قسم الجملة)
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      console.log("❌ No image path provided");
      return null;
    }
    // Base URL for the backend
    const baseUrl = "http://localhost:8080";
    // If it's already a full URL, return as is
    if (imagePath.startsWith("http") || imagePath.startsWith("blob:")) {
      console.log("✅ Using full URL:", imagePath);
      return imagePath;
    }
    // Try different path formats
    const possiblePaths = [
      // Try as absolute path first
      `${baseUrl}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`,
      // Try with /uploads/ prefix
      `${baseUrl}/uploads/${imagePath.replace(/^\/+/, "")}`,
      // Try with /api/v1/uploads/ prefix
      `${baseUrl}/api/v1/uploads/${imagePath.replace(/^\/+/, "")}`,
      // Try with /public/uploads/ (common public directory)
      `${baseUrl}/public/uploads/${imagePath.replace(/^\/+/, "")}`,
    ];
    // Log all possible paths for debugging
    console.log(
      "🔄 Trying possible image paths for",
      imagePath,
      ":",
      possiblePaths
    );
    // Return the first path - we'll handle 404s in the onError handler
    const finalUrl = possiblePaths[0];
    console.log("📤 Using image URL:", finalUrl);
    return finalUrl;
  };

  // جلب منتجات التجزئة من API (منشورة فقط)
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching retail products...");
      // استخدم getAdminProducts مع فلتر التجزئة والمنشورة فقط
      const response = await productService.getAdminProducts({
        limit: 1000,
        type: "retail",
      });
      const productsList = response.data || [];
      // تصفية منتجات التجزئة فقط
      const retailProducts = productsList.filter(
        (product) =>
          product &&
          (product.type === "retail" ||
            product.product_type === "retail" ||
            product.is_retail === true)
      );
      setProducts(retailProducts);
      setFilteredProducts(retailProducts);
      return retailProducts;
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("حدث خطأ أثناء جلب المنتجات");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // جلب المنتجات المنشورة للتجزئة (للتأكد من حالة النشر)
  const fetchPublishedRetailProducts = async () => {
    try {
      setIsCheckingPublishStatus(true);
      // استخدم نفس الفلتر لجلب المنتجات المنشورة فقط
      const response = await productService.getAdminProducts({
        type: "retail",
        published_retail: true,
        limit: 1000,
      });
      if (response && response.data) {
        setPublishedRetailProducts(response.data);
      }
    } catch (error) {
      console.error("Error fetching published retail products:", error);
    } finally {
      setIsCheckingPublishStatus(false);
    }
  };

  const isProductPublishedInRetail = (product) => {
    if (!product) return false;
    // Check both possible properties that might indicate the product is published
    return product.published_retail === true || 
           product.is_published_retail === true ||
           product.status === 'published' ||
           product.is_published === true;
  };

  const handleAddProduct = async (productData) => {
    try {
      // تأكيد أن نوع المنتج هو retail
      const productToCreate = {
        ...productData,
        type: 'retail' // تأكيد نوع المنتج
      };
      
      console.log('Creating retail product:', JSON.stringify(productToCreate, null, 2));
      
      await productService.createProduct(productToCreate);
      toast.success('تمت إضافة المنتج بنجاح');
      fetchProducts();
    } catch (error) {
      console.error('Error adding retail product:', error);
      const errorMessage = error.response?.data?.message || 'حدث خطأ أثناء إضافة المنتج';
      toast.error(errorMessage);
      throw error; // إعادة رمي الخطأ للتعامل معه في ProductForm
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCategories(), fetchProducts()]);
      await fetchPublishedRetailProducts();
    };
    loadData();
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterProducts(term, selectedCategory);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    filterProducts(searchTerm, categoryId);
  };

  const filterProducts = (term, categoryId) => {
    console.log('بدء تصفية المنتجات:', { term, categoryId });
    
    let tempProducts = [...products];
    
    // تصفية حسب نص البحث
    if (term) {
      const searchTerm = term.toLowerCase();
      tempProducts = tempProducts.filter(
        (p) =>
          (p.name_ar?.toLowerCase().includes(searchTerm) ||
           p.name?.toLowerCase().includes(searchTerm) ||
           p.description_ar?.toLowerCase().includes(searchTerm) ||
           p.description?.toLowerCase().includes(searchTerm))
      );
      console.log('بعد التصفية حسب البحث:', tempProducts.length);
    }

    // تصفية حسب الفئة
    if (categoryId && categoryId !== "all") {
      tempProducts = tempProducts.filter((p) => {
        const match = p.category_id == categoryId; // استخدام == للمقارنة المرنة
        console.log(`المنتج: ${p.name_ar || p.name} - معرف الفئة: ${p.category_id} - تطابق: ${match}`);
        return match;
      });
      console.log('بعد التصفية حسب الفئة:', tempProducts.length);
    }

    setFilteredProducts(tempProducts);
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async () => {
    await fetchProducts();
    setIsFormOpen(false);
    setCurrentProduct(null);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">منتجات التجزئة</h1>
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
          <div className="w-full md:w-64">
            <SearchableSelect
              options={[
                { value: 'all', label: 'جميع الفئات' },
                ...(Array.isArray(categories) ? categories.map(cat => ({
                  value: cat.id,
                  label: cat.name_ar || cat.name
                })) : [])
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المنتج
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الفئة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  السعر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المخزون
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <FaSpinner className="animate-spin mx-auto text-2xl" />
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={getImageUrl(
                              product.image_url ||
                                (product.images && product.images[0])
                            )}
                            alt={product.name}
                            onError={(e) =>
                              (e.target.src = "https://via.placeholder.com/150")
                            }
                          />
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        const list = Array.isArray(categories) ? categories : [];
                        const cat = list.find(c => c.id === product.category_id);
                        return cat?.name || cat?.name_ar || 'غير مصنف';
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.price} ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.stock_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.published_retail === true ||
                      product.is_published_retail === true ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          منشور
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          غير منشور
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        {isProductPublishedInRetail(product) ? (
                          <button
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
                          onClick={() => handleEdit(product)}
                          className="text-indigo-600 hover:text-indigo-900 transition duration-150 ease-in-out"
                          title="تعديل المنتج"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(product)}
                          className="text-red-600 hover:text-red-900 transition duration-150 ease-in-out"
                          title="حذف المنتج"
                          disabled={
                            isDeleting && deletingProduct?.id === product.id
                          }
                        >
                          {isDeleting && deletingProduct?.id === product.id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaTrash />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    لا توجد منتجات.
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
          onSubmit={handleAddProduct}
          categories={categories}
          type="retail" // تحديد نوع المنتج كتجزئة
        />
      )}

      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-lg p-6">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <FaUpload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              نشر المنتج
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-gray-600 dark:text-gray-300">
              هل أنت متأكد أنك تريد نشر هذا المنتج في واجهة التجزئة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse gap-3 justify-center sm:justify-end">
            <Button
              onClick={() => handlePublish("retail")}
              disabled={isPublishing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isPublishing ? (
                <>
                  <FaSpinner className="animate-spin ml-2" />
                  جاري النشر...
                </>
              ) : (
                "نشر للتجزئة"
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

      <AlertDialog
        open={showUnpublishDialog}
        onOpenChange={!isUnpublishing ? setShowUnpublishDialog : undefined}
      >
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
              من واجهة التجزئة؟
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
    </div>
  );
};

export default RetailProducts;

