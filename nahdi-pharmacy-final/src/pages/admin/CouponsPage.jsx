import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTag, FaCalendarAlt, FaPercentage, FaMoneyBillWave } from 'react-icons/fa';

const CouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Simulate fetching coupons from API
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await api.get('/api/admin/coupons');
        // setCoupons(response.data);
        
        // Mock data for now
        const statuses = ['نشط', 'منتهي', 'غير نشط'];
        const types = ['نسبة مئوية', 'مبلغ ثابت'];
        const mockCoupons = Array(15).fill(0).map((_, i) => {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30) + 1);
          
          return {
            id: i + 1,
            code: `DISCOUNT${Math.floor(1000 + Math.random() * 9000)}`,
            description: `خصم على جميع المنتجات`,
            discountType: types[Math.floor(Math.random() * types.length)],
            discountValue: Math.floor(Math.random() * 30) + 5,
            minPurchase: Math.floor(Math.random() * 100) + 50,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            usageLimit: Math.floor(Math.random() * 100) + 10,
            usageCount: Math.floor(Math.random() * 20),
            status: statuses[Math.floor(Math.random() * statuses.length)],
          };
        });
        
        setCoupons(mockCoupons);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching coupons:', error);
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  const handleDeleteCoupon = async (couponId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الكوبون؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        // TODO: Replace with actual API call
        // await api.delete(`/api/admin/coupons/${couponId}`);
        
        // Update local state
        setCoupons(coupons.filter(coupon => coupon.id !== couponId));
      } catch (error) {
        console.error('Error deleting coupon:', error);
      }
    }
  };

  const toggleCouponStatus = async (couponId, currentStatus) => {
    const newStatus = currentStatus === 'نشط' ? 'غير نشط' : 'نشط';
    
    try {
      // TODO: Replace with actual API call
      // await api.put(`/api/admin/coupons/${couponId}/status`, { status: newStatus });
      
      // Update local state
      setCoupons(coupons.map(coupon => 
        coupon.id === couponId ? { ...coupon, status: newStatus } : coupon
      ));
    } catch (error) {
      console.error('Error updating coupon status:', error);
    }
  };

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = 
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || coupon.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Check coupon status based on dates
  const getCouponStatus = (coupon) => {
    const today = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);
    
    if (coupon.status === 'منتهي') return 'منتهي';
    if (today < startDate) return 'قادم';
    if (today > endDate) return 'منتهي';
    return coupon.status;
  };

  // Apply status check to all coupons
  const couponsWithStatus = filteredCoupons.map(coupon => ({
    ...coupon,
    displayStatus: getCouponStatus(coupon)
  }));

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = couponsWithStatus.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(couponsWithStatus.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">إدارة الكوبونات</h2>
            <p className="mt-1 text-sm text-gray-500">عرض وإدارة أكواد الخصم والعروض الترويجية</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link
              to="/admin/coupons/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaPlus className="ml-2 -mr-1" />
              إضافة كوبون جديد
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              بحث
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md p-2 border text-right"
                placeholder="ابحث برمز الكوبون أو الوصف"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              الحالة
            </label>
            <select
              id="status"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="نشط">نشط</option>
              <option value="غير نشط">غير نشط</option>
              <option value="منتهي">منتهي</option>
              <option value="قادم">قادم</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {currentItems.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الكود
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الوصف
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الخصم
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحد الأدنى للشراء
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الصلاحية
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الاستخدام
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FaTag className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900">{coupon.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coupon.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {coupon.discountType === 'نسبة مئوية' ? (
                        <span className="flex items-center">
                          <FaPercentage className="ml-1 text-green-600" />
                          {coupon.discountValue}%
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <FaMoneyBillWave className="ml-1 text-green-600" />
                          {coupon.discountValue} ر.س
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{coupon.discountType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coupon.minPurchase} ر.س
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <FaCalendarAlt className="ml-1 text-gray-400" />
                        {new Date(coupon.startDate).toLocaleDateString('ar-EG')}
                      </div>
                      <div className="flex items-center mt-1">
                        <FaCalendarAlt className="ml-1 text-gray-400" />
                        {new Date(coupon.endDate).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coupon.usageCount} / {coupon.usageLimit || '∞'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      coupon.displayStatus === 'نشط' 
                        ? 'bg-green-100 text-green-800' 
                        : coupon.displayStatus === 'منتهي' 
                          ? 'bg-red-100 text-red-800' 
                          : coupon.displayStatus === 'قادم'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                      {coupon.displayStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2 space-x-reverse">
                      <Link
                        to={`/admin/coupons/edit/${coupon.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FaEdit className="inline ml-1" />
                        تعديل
                      </Link>
                      <button
                        onClick={() => toggleCouponStatus(coupon.id, coupon.status)}
                        className={`${coupon.status === 'نشط' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                      >
                        {coupon.status === 'نشط' ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash className="inline ml-1" />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <FaTag className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد كوبونات</h3>
            <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة كوبونات خصم جديدة لعملائك.</p>
            <div className="mt-6">
              <Link
                to="/admin/coupons/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaPlus className="ml-2 -mr-1" />
                إضافة كوبون جديد
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:justify-end">
            <button
              onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              السابق
            </button>
            <div className="hidden md:flex">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => paginate(pageNum)}
                    className={`${
                      currentPage === pageNum
                        ? 'bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    } border-t-2 border-transparent px-4 pt-4 pb-3 text-sm font-medium`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsPage;
