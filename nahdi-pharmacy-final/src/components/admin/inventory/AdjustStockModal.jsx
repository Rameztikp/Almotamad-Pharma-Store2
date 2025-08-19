import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminApi } from '../../../services/adminApi';

const AdjustStockModal = ({ isOpen, onClose, product, onSuccess }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [formData, setFormData] = useState({
    quantity: '',
    reason: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!product) return;
    
    try {
      setLoading(true);
      
      const response = await adminApi.adjustInventory({
        productId: product.id,
        type: adjustmentType,
        quantity: Number(formData.quantity),
        reason: formData.reason,
        notes: formData.notes || ''
      });
      
      if (response.success) {
        toast.success('تم تعديل المخزون بنجاح');
        // Pass the updated product data to parent
        onSuccess(response.data);
        onClose();
      } else {
        throw new Error(response.message || 'فشل في تعديل المخزون');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error(error.message || 'حدث خطأ أثناء تعديل المخزون');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-right w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  تعديل كمية المنتج: {product?.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  الكمية الحالية: <span className="font-medium">{product?.stockQuantity} قطعة</span>
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-blue-600"
                        checked={adjustmentType === 'add'}
                        onChange={() => setAdjustmentType('add')}
                      />
                      <span className="mr-2 text-gray-700">إضافة</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-blue-600"
                        checked={adjustmentType === 'remove'}
                        onChange={() => setAdjustmentType('remove')}
                      />
                      <span className="mr-2 text-gray-700">خصم</span>
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                      الكمية
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      id="quantity"
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formData.quantity}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                      سبب التعديل
                    </label>
                    <select
                      name="reason"
                      id="reason"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formData.reason}
                      onChange={handleChange}
                    >
                      <option value="">اختر السبب</option>
                      <option value="damaged">تالف</option>
                      <option value="expired">منتهي الصلاحية</option>
                      <option value="return">مرتجع</option>
                      <option value="adjustment">تسوية مخزون</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      ملاحظات (اختياري)
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formData.notes}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                  
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dashed">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={onClose}
                      disabled={loading}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:col-start-2 sm:text-sm ${
                        adjustmentType === 'add' 
                          ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      }`}
                      disabled={loading}
                    >
                      {loading ? 'جاري التعديل...' : adjustmentType === 'add' ? 'إضافة' : 'خصم'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustStockModal;
