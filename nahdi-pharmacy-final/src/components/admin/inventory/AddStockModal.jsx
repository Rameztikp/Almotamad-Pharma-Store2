import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { adminApi } from '../../../services/adminApi';

const AddStockModal = ({ isOpen, onClose, product, onSuccess }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    quantity: '',
    unitPrice: '',
    supplierId: '',
    referenceNumber: '',
    notes: ''
  });
  const [suppliers, setSuppliers] = useState([]);

  // Fetch suppliers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  const fetchSuppliers = async () => {
    try {
      const response = await adminApi.getSuppliers();
      
      if (response.success) {
        const suppliersData = response.data || [];
        setSuppliers(suppliersData);
        
        // Set first supplier as default if exists
        if (suppliersData.length > 0) {
          setFormData(prev => ({
            ...prev,
            supplierId: suppliersData[0].id
          }));
        }
      } else {
        throw new Error(response.message || 'فشل في تحميل بيانات الموردين');
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحميل بيانات الموردين');
    }
  };

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
        type: 'add',
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        supplierId: formData.supplierId,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes
      });
      
      if (response.success) {
        toast.success('تمت إضافة المخزون بنجاح');
        // Pass the updated product data to parent
        onSuccess(response.data);
        onClose();
      } else {
        throw new Error(response.message || 'فشل في إضافة المخزون');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error(error.message || 'حدث خطأ أثناء إضافة المخزون');
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
                  إضافة كمية للمنتج: {product?.name}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      سعر الوحدة (ر.س)
                    </label>
                    <input
                      type="number"
                      name="unitPrice"
                      id="unitPrice"
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formData.unitPrice}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">
                      المورد
                    </label>
                    <select
                      name="supplierId"
                      id="supplierId"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formData.supplierId}
                      onChange={handleChange}
                    >
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      رقم المرجع (اختياري)
                    </label>
                    <input
                      type="text"
                      name="referenceNumber"
                      id="referenceNumber"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formData.referenceNumber}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      ملاحظات (اختياري)
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows="3"
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
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                      disabled={loading}
                    >
                      {loading ? 'جاري الحفظ...' : 'حفظ'}
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

export default AddStockModal;
