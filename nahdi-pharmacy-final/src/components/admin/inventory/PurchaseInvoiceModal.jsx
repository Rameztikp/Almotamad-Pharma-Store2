import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiX, FiPlus, FiTrash2, FiSearch } from 'react-icons/fi';

const PurchaseInvoiceModal = ({ isOpen, onClose, onSave, suppliers = [], products = [] }) => {
  const [formData, setFormData] = useState({
    supplierId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [
      { productId: '', quantity: 1, unitPrice: 0, expiryDate: '', batchNumber: '', total: 0 }
    ]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm))
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate total if unitPrice or quantity changes
    if (field === 'unitPrice' || field === 'quantity') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(newItems[index].quantity) || 0;
      const unitPrice = field === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(newItems[index].unitPrice) || 0;
      newItems[index].total = (quantity * unitPrice).toFixed(2);
    }
    
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: '', quantity: 1, unitPrice: 0, expiryDate: '', batchNumber: '', total: 0 }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        items: newItems
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Calculate totals
      const invoiceTotal = formData.items.reduce((sum, item) => {
        return sum + (parseFloat(item.total) || 0);
      }, 0);
      
      const invoiceData = {
        ...formData,
        totalAmount: invoiceTotal,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          total: parseFloat(item.total)
        }))
      };
      
      await onSave(invoiceData);
      toast.success('تم حفظ الفاتورة بنجاح');
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">فاتورة مشتريات جديدة</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المورد <span className="text-red-500">*</span>
              </label>
              <select
                name="supplierId"
                value={formData.supplierId}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">اختر المورد</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الفاتورة
              </label>
              <input
                type="text"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="رقم الفاتورة"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاريخ الفاتورة
              </label>
              <input
                type="date"
                name="invoiceDate"
                value={formData.invoiceDate}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ملاحظات
              </label>
              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ملاحظات إضافية"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">تفاصيل المنتجات</h4>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <FiPlus className="ml-1" /> إضافة منتج
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">سعر الوحدة</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الانتهاء</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الرقم التسلسلي</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">المجموع</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="ابحث عن منتج..."
                          />
                          {searchTerm && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {filteredProducts.map(product => (
                                <div
                                  key={product.id}
                                  className="p-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => {
                                    const productData = products.find(p => p.id === product.id);
                                    handleItemChange(index, 'productId', product.id);
                                    handleItemChange(index, 'unitPrice', product.purchasePrice || 0);
                                    setSearchTerm('');
                                  }}
                                >
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {product.barcode && `باركود: ${product.barcode}`}
                                  </div>
                                </div>
                              ))}
                              {filteredProducts.length === 0 && (
                                <div className="p-2 text-gray-500">لا توجد نتائج</div>
                              )}
                            </div>
                          )}
                        </div>
                        {item.productId && (
                          <div className="mt-1 text-sm text-gray-600">
                            {products.find(p => p.id === item.productId)?.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-20 p-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-24 p-1 border rounded text-left"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                          className="w-32 p-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                          className="w-24 p-1 border rounded"
                          placeholder="رقم الدفعة"
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {parseFloat(item.total || 0).toFixed(2)} ر.س
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                          disabled={formData.items.length <= 1}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" className="text-left font-medium px-4 py-2">
                      الإجمالي
                    </td>
                    <td className="px-4 py-2 font-bold text-lg">
                      {formData.items
                        .reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)
                        .toFixed(2)} ر.س
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              disabled={submitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={submitting || !formData.supplierId || formData.items.length === 0}
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseInvoiceModal;
