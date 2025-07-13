import React, { useState } from 'react';
import { FaSearch, FaBoxOpen, FaUserPlus, FaCheck, FaTimes, FaEye } from 'react-icons/fa';

const WholesaleOrdersPage = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data for wholesale orders
  const [orders] = useState([
    { 
      id: 'WH-1001', 
      customer: 'شركة الدوائية المتحدة', 
      date: '2023-06-15', 
      amount: '5,250 ر.س', 
      status: 'قيد التنفيذ',
      items: 12,
      payment: 'تم الدفع'
    },
    { 
      id: 'WH-1002', 
      customer: 'مستودع الشفاء', 
      date: '2023-06-14', 
      amount: '8,750 ر.س', 
      status: 'مكتمل',
      items: 18,
      payment: 'تم الدفع'
    },
  ]);

  // Mock data for account requests
  const [accountRequests] = useState([
    {
      id: 'REQ-1001',
      companyName: 'صيدليات النهدي',
      contactPerson: 'أحمد محمد',
      email: 'ahmed@nahdi.com',
      phone: '0501234567',
      status: 'قيد المراجعة',
      requestDate: '2023-06-10'
    },
    {
      id: 'REQ-1002',
      companyName: 'مستشفى الملك فهد',
      contactPerson: 'سارة أحمد',
      email: 'sara@kfsh.com',
      phone: '0507654321',
      status: 'قيد المراجعة',
      requestDate: '2023-06-12'
    },
  ]);

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequests = accountRequests.filter(request =>
    request.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApproveRequest = (requestId) => {
    // Handle approval logic here
    console.log('Approving request:', requestId);
  };

  const handleRejectRequest = (requestId) => {
    // Handle rejection logic here
    console.log('Rejecting request:', requestId);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">إدارة طلبات الجملة</h1>
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8 space-x-reverse">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaBoxOpen className="inline-block ml-2" />
            الطلبات
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaUserPlus className="inline-block ml-2" />
            طلبات الحسابات
            <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {accountRequests.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المجموع</th>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'مكتمل' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 ml-4">
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اسم الشركة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">جهة الاتصال</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الطلب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.companyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.contactPerson}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.requestDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleApproveRequest(request.id)}
                        className="text-green-600 hover:text-green-900 ml-2"
                        title="قبول"
                      >
                        <FaCheck />
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(request.id)}
                        className="text-red-600 hover:text-red-900"
                        title="رفض"
                      >
                        <FaTimes />
                      </button>
                      <button 
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        title="عرض التفاصيل"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesaleOrdersPage;
