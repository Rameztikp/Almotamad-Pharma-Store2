import React, { useState, useEffect } from 'react';
import { FaTimes, FaUpload, FaTrash, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import productService from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import SearchableSelect from '../../../components/SearchableSelect';

const ProductForm = ({ isOpen, onClose, onSubmit, product, type }) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    // General product fields
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
    images: [],
    brand: '',
    sku: '',
    barcode: '',
    isActive: true,
    
    // Medicine specific fields
    isMedicine: false,
    expiryDate: '',
    batchNumber: '',
    manufacturer: '',
    requiresPrescription: false,
    activeIngredient: '',
    dosageForm: '',
    strength: '',
    storageConditions: '',
    sideEffects: '',
    contraindications: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [showMedicineFields, setShowMedicineFields] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getCategories();
        // التأكد من أن الاستجابة تحتوي على مصفوفة الفئات
        const fetchedCategories = response.data || response;
        
        if (Array.isArray(fetchedCategories)) {
          setCategories(fetchedCategories);
          
          // تعيين الفئة الافتراضية إذا لم يكن هناك منتج قيد التعديل
          if (!product && fetchedCategories.length > 0) {
            setFormData(prev => ({
              ...prev,
              category_id: fetchedCategories[0].id
            }));
          }
        } else {
          console.error('تنسيق بيانات الفئات غير متوقع:', fetchedCategories);
          toast.error('حدث خطأ في تحميل الفئات');
          setCategories([]);
        }
      } catch (error) {
        console.error('خطأ في جلب الفئات:', error);
        toast.error('فشل تحميل الفئات. يرجى المحاولة مرة أخرى');
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        category_id: product.category_id || '',
        stock: product.stock || '',
        images: product.images || [],
        brand: product.brand || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        isMedicine: product.isMedicine || false,
        expiryDate: product.expiryDate || '',
        batchNumber: product.batchNumber || '',
        manufacturer: product.manufacturer || '',
        requiresPrescription: product.requiresPrescription || false,
        activeIngredient: product.activeIngredient || '',
        dosageForm: product.dosageForm || '',
        strength: product.strength || '',
        storageConditions: product.storageConditions || '',
        sideEffects: product.sideEffects || '',
        contraindications: product.contraindications || ''
      });
      setPreviewImages(product.images || []);
      setShowMedicineFields(!!product.isMedicine);
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: categories[0] || '',
        stock: '',
        images: [],
        brand: '',
        sku: '',
        barcode: '',
        isMedicine: false,
        expiryDate: '',
        batchNumber: '',
        manufacturer: '',
        requiresPrescription: false,
        activeIngredient: '',
        dosageForm: '',
        strength: '',
        storageConditions: '',
        sideEffects: '',
        contraindications: ''
      });
      setPreviewImages([]);
      setShowMedicineFields(false);
    }
  }, [product, categories]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const toggleMedicineFields = () => {
    setShowMedicineFields(!showMedicineFields);
    if (!showMedicineFields) {
      setFormData(prev => ({
        ...prev,
        isMedicine: true
      }));
    } else {
      setFormData(prev => {
        const { isMedicine, ...rest } = prev;
        return {
          ...rest,
          isMedicine: false,
          expiryDate: '',
          batchNumber: '',
          manufacturer: '',
          requiresPrescription: false,
          activeIngredient: '',
          dosageForm: '',
          strength: '',
          storageConditions: '',
          sideEffects: '',
          contraindications: ''
        };
      });
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Create preview URLs
    const newPreviewImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setPreviewImages(prev => [...prev, ...newPreviewImages]);
    
    // Add to form data
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index) => {
    const newPreviewImages = [...previewImages];
    const newImages = [...formData.images];
    
    // Revoke the object URL to avoid memory leaks
    if (typeof newPreviewImages[index] !== 'string') {
      URL.revokeObjectURL(newPreviewImages[index].preview);
    }
    
    newPreviewImages.splice(index, 1);
    newImages.splice(index, 1);
    
    setPreviewImages(newPreviewImages);
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!formData.name) newErrors.name = 'اسم المنتج مطلوب';
    if (!formData.price) newErrors.price = 'السعر مطلوب';
    if (!formData.category_id) newErrors.category = 'الفئة مطلوبة';
    if (!formData.stock) newErrors.stock = 'الكمية المتوفرة مطلوبة';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    
    if (previewImages.length === 0) {
      toast.error('الرجاء إضافة صورة واحدة على الأقل للمنتج');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Upload images first if there are new ones
      let imageUrls = [...previewImages];
      
      const filesToUpload = previewImages
        .filter(img => typeof img !== 'string')
        .map(img => img.file || img);
      
      if (filesToUpload.length > 0) {
        setIsUploading(true);
        setUploadProgress(0);
        
        try {
          const uploadedUrls = await productService.uploadImages(filesToUpload);
          imageUrls = [
            ...previewImages
              .filter(img => typeof img === 'string')
              .map(img => ({
                url: img,
                isPrimary: false
              })),
            ...uploadedUrls.map(url => ({
              url,
              isPrimary: false
            }))
          ];
          
          // Set the first image as primary
          if (imageUrls.length > 0) {
            imageUrls[0].isPrimary = true;
          }
          
          setUploadProgress(100);
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error('Error uploading images:', error);
          toast.error('حدث خطأ أثناء رفع الصور');
          throw error;
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
      
      // 2. Prepare product data with type
      const { stock, ...formDataWithoutStock } = formData; // Remove stock field
      // Convert images to array of URL strings only
      const imageUrlStrings = imageUrls.map(img => typeof img === 'string' ? img : img.url);
      const productData = {
        ...formDataWithoutStock,
        images: imageUrlStrings,
        type: type || 'retail', // تأكيد نوع المنتج
        // تحويل القيم الرقمية
        price: parseFloat(formData.price) || 0,
        stock_quantity: parseInt(formData.stock, 10) || 0, // Backend expects stock_quantity
        // تعيين القيم الافتراضية للحقول الاختيارية
        brand: formData.brand || '',
        sku: formData.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        barcode: formData.barcode || `BC-${Date.now()}`
      };
      
      // 3. Add medicine-specific fields if this is a medicine
      if (formData.isMedicine) {
        productData.medicine_fields = {
          active_ingredient: formData.activeIngredient || '',
          dosage: formData.dosageForm || '',
          expiration_date: formData.expiryDate,
          batch_number: formData.batchNumber || '',
          manufacturer: formData.manufacturer || '',
          requires_prescription: formData.requiresPrescription || false,
          strength: formData.strength || '',
          storage_conditions: formData.storageConditions || '',
          side_effects: formData.sideEffects || '',
          contraindications: formData.contraindications || ''
        };
      }
      
      console.log('Submitting product data:', JSON.stringify(productData, null, 2));
      console.log('Submitting product data:', productData);
      
      // 4. Submit the product data
      try {
        console.log('About to call onSubmit...');
        await onSubmit(productData);
        console.log('onSubmit completed successfully');
      } catch (submitError) {
        console.error('Error in onSubmit:', submitError);
        throw submitError;
      }
      
      // 5. Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: categories[0]?.id || '',
        stock: '',
        images: [],
        brand: '',
        sku: '',
        barcode: '',
        isMedicine: false,
        expiryDate: '',
        batchNumber: '',
        manufacturer: '',
        requiresPrescription: false,
        activeIngredient: '',
        dosageForm: '',
        strength: '',
        storageConditions: '',
        sideEffects: '',
        contraindications: ''
      });
      setPreviewImages([]);
      setErrors({});
      
      // 6. Close the form
      onClose();
      
    } catch (error) {
      console.error('Error submitting product:', error);
      toast.error(error.message || error.response?.data?.message || 'حدث خطأ أثناء حفظ المنتج');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              {product ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
            >
              <FaTimes size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">المعلومات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم المنتج <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category_id">
                    الفئة <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={categories.map(cat => ({
                      value: cat.id,
                      label: cat.name_ar || cat.name
                    }))}
                    value={formData.category_id}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      category_id: value
                    }))}
                    placeholder="اختر فئة المنتج"
                    loading={isLoading}
                    noOptionsMessage="لا توجد فئات متاحة"
                  />
                  {errors.category_id && (
                    <p className="text-red-500 text-xs italic mt-1">{errors.category_id}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    السعر (ر.س) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الكمية المتوفرة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  صور المنتج <span className="text-red-500">*</span>
                </label>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <FaSpinner className="animate-spin text-blue-500 text-2xl mb-2" />
                          <span className="text-xs text-gray-500">جاري الرفع...</span>
                        </div>
                      ) : (
                        <>
                          <FaUpload className="text-gray-400 text-2xl mb-2" />
                          <span className="text-sm text-gray-500">رفع صورة</span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={isSubmitting || isUploading}
                      />
                    </label>
                    
                    {previewImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={typeof img === 'string' ? img : (img.preview || URL.createObjectURL(img))}
                          alt={`Preview ${index + 1}`}
                          className="w-32 h-32 object-cover rounded-lg"
                          onLoad={() => {
                            if (typeof img !== 'string' && img.preview) {
                              URL.revokeObjectURL(img.preview);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isSubmitting || isUploading}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    يمكنك رفع حتى 5 صور كحد أقصى. الصيغ المدعومة: JPG, PNG, WebP
                  </p>
                </div>
              </div>
            </div>
            
            {/* Additional Product Info */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">معلومات إضافية</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الماركة
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الكود
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الباركود
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
            
            {/* Medicine Fields Toggle */}
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isMedicine"
                  name="isMedicine"
                  checked={showMedicineFields}
                  onChange={toggleMedicineFields}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="isMedicine" className="mr-2 block text-sm font-medium text-gray-700">
                  هذا المنتج دواء
                </label>
              </div>
            </div>
            
            {/* Medicine Specific Fields */}
            {showMedicineFields && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mb-6">
                <h3 className="text-lg font-medium text-blue-800 mb-4">معلومات الدواء</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      تاريخ الانتهاء
                    </label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الدفعة
                    </label>
                    <input
                      type="text"
                      name="batchNumber"
                      value={formData.batchNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الشركة المصنعة
                    </label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requiresPrescription"
                      name="requiresPrescription"
                      checked={formData.requiresPrescription}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="requiresPrescription" className="mr-2 block text-sm font-medium text-gray-700">
                      يتطلب وصفة طبية
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المادة الفعالة
                    </label>
                    <input
                      type="text"
                      name="activeIngredient"
                      value={formData.activeIngredient}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الشكل الصيدلاني
                    </label>
                    <select
                      name="dosageForm"
                      value={formData.dosageForm}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    >
                      <option value="">اختر الشكل الصيدلاني</option>
                      <option value="أقراص">أقراص</option>
                      <option value="كبسولات">كبسولات</option>
                      <option value="شراب">شراب</option>
                      <option value="حقن">حقن</option>
                      <option value="كريم">كريم</option>
                      <option value="مرهم">مرهم</option>
                      <option value="لبوس">لبوس</option>
                      <option value="قطرة">قطرة</option>
                      <option value="بخاخ">بخاخ</option>
                      <option value="محلول">محلول</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      التركيز
                    </label>
                    <input
                      type="text"
                      name="strength"
                      value={formData.strength}
                      onChange={handleChange}
                      placeholder="مثال: 500mg, 10ml"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ظروف التخزين
                    </label>
                    <textarea
                      name="storageConditions"
                      value={formData.storageConditions}
                      onChange={handleChange}
                      rows="2"
                      placeholder="مثال: يحفظ في درجة حرارة أقل من 25°م"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الآثار الجانبية
                    </label>
                    <textarea
                      name="sideEffects"
                      value={formData.sideEffects}
                      onChange={handleChange}
                      rows="2"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      موانع الاستعمال
                    </label>
                    <textarea
                      name="contraindications"
                      value={formData.contraindications}
                      onChange={handleChange}
                      rows="2"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري الحفظ...
                  </>
                ) : product ? (
                  'حفظ التغييرات'
                ) : (
                  'إضافة المنتج'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
