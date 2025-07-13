import React, { useState } from 'react';
import { FaSearch, FaShoppingBag, FaEye, FaTruck, FaCheck, FaTimes } from 'react-icons/fa';

const RetailOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data for retail orders
  const [orders] = useState([
    { 
      id: 'RT-1001', 
      customer: 'أحمد محمد', 
      date: '2023-06-15', 
      amount: '450 ر.س', 
      status: 'قيد التجهيز',
      items: 3,
      payment: 'تم الدفع',
      shipping: 'توصيل سريع'
    },
    { 
      id: 'RT-1002', 
      customer: 'سارة أحمد', 
      date: '2023-06-14', 
      amount: '320 ر.س', 
      status: 'تم الشحن',
      items: 2,
      payment: 'تم الدفع',
      shipping: 'توصيل عادي'
    },
    { 
      id: 'RT-1003', 
      customer: 'محمد علي', 
      date: '2023-06-13', 
      amount: '210 ر.س', 
      status: 'مكتمل',
      items: 1,
      payment: 'الدفع عند الاستلام',
      shipping: 'توصيل عادي'
    },
  ]);

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const statusClasses = {
      'قيد التجهيز': 'bg-yellow-100 text-yellow-800',
      'تم الشحن': 'bg-blue-100 text-blue-800',
      'مكتمل': 'bg-green-100 text-green-800',
      'ملغي': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">إدارة طلبات القطاعي</h1>
        <div className="relative mt-4 md:mt-0">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ابحث عن طلب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المجموع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتجات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طريقة الدفع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.items} منتج
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.payment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 ml-2">
                      <FaEye />
                    </button>
                    {order.status === 'قيد التجهيز' && (
                      <>
                        <button className="text-green-600 hover:text-green-900 ml-2" title="تم التجهيز">
                          <FaCheck />
                        </button>
                        <button className="text-red-600 hover:text-red-900" title="إلغاء">
                          <FaTimes />
                        </button>
                      </>
                    )}
                    {order.status === 'تم الشحن' && (
                      <button className="text-green-600 hover:text-green-900 ml-2" title="تم التسليم">
                        <FaCheck />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              السابق
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              التالي
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                عرض <span className="font-medium">1</span> إلى <span className="font-medium">{orders.length}</span> من <span className="font-medium">{orders.length}</span> نتائج
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" dir="ltr">
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">السابق</span>
                  &larr;
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  1
                </span>
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">التالي</span>
                  &rarr;
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailOrdersPage;
