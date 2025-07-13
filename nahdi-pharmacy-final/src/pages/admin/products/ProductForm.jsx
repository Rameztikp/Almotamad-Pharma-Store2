import React, { useState, useEffect } from 'react';
import { FaTimes, FaUpload, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ProductForm = ({ isOpen, onClose, onSubmit, product, categories, type }) => {
  const [formData, setFormData] = useState({
    // General product fields
    name: '',
    description: '',
    price: '',
    category: categories[0] || '',
    stock: '',
    images: [],
    brand: '',
    sku: '',
    barcode: '',
    
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
  
  const [showMedicineFields, setShowMedicineFields] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        category: product.category || categories[0] || '',
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
        category: categories[0] || '',
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
    if (!formData.name || !formData.price || !formData.category || formData.stock === '') {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the product data
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        stock: parseInt(formData.stock, 10),
        brand: formData.brand,
        sku: formData.sku,
        barcode: formData.barcode,
        isMedicine: formData.isMedicine,
        images: formData.images,
        type: type // 'retail' or 'wholesale'
      };
      
      // Add medicine-specific fields if this is a medicine
      if (formData.isMedicine) {
        productData.expiryDate = formData.expiryDate;
        productData.batchNumber = formData.batchNumber;
        productData.manufacturer = formData.manufacturer;
        productData.requiresPrescription = formData.requiresPrescription;
        productData.activeIngredient = formData.activeIngredient;
        productData.dosageForm = formData.dosageForm;
        productData.strength = formData.strength;
        productData.storageConditions = formData.storageConditions;
        productData.sideEffects = formData.sideEffects;
        productData.contraindications = formData.contraindications;
      }
      
      // If editing, include the product ID
      if (product?.id) {
        productData.id = product.id;
      }
      
      // Call the parent component's onSubmit handler with the prepared data
      await onSubmit(productData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ المنتج');
    } finally {
      setIsSubmitting(false);
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المنتج <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الفئة <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isSubmitting}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
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
                  صور المنتج
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <FaUpload className="text-gray-400 text-2xl mb-2" />
                    <span className="text-sm text-gray-500">رفع صورة</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={isSubmitting}
                    />
                  </label>
                  
                  {previewImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={typeof img === 'string' ? img : img.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSubmitting}
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
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
