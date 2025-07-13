import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { FaBox, FaHistory } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const TransactionHistory = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Format date to YYYY-MM-DD
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('ar-SA', options);
  };

  // Fetch product and transaction history
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        // Fetch product details
        const productResponse = await fetch(`http://localhost:8080/api/v1/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!productResponse.ok) {
          throw new Error('فشل في تحميل بيانات المنتج');
        }
        
        const productData = await productResponse.json();
        setProduct(productData);
        
        // Fetch transaction history
        const transactionsResponse = await fetch(
          `http://localhost:8080/api/v1/inventory/transactions?productId=${productId}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!transactionsResponse.ok) {
          throw new Error('فشل في تحميل سجل المعاملات');
        }
        
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, getToken]);

  // Apply filters
  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = !filters.type || transaction.transactionType === filters.type;
    const matchesSearch = !filters.search || 
      transaction.referenceNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(filters.search.toLowerCase());
    
    const transactionDate = new Date(transaction.createdAt);
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
    
    const matchesDate = (!fromDate || transactionDate >= fromDate) && 
                       (!toDate || transactionDate <= new Date(toDate.getTime() + 86400000)); // Add 1 day to include the end date
    
    return matchesType && matchesSearch && matchesDate;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Clear filters
  const clearFilters = () => {
    setFilters({
      type: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setCurrentPage(1);
  };

  // Format transaction type
  const formatTransactionType = (type) => {
    const types = {
      'purchase': 'شراء',
      'sale': 'بيع',
      'return': 'مرتجع',
      'adjustment': 'تعديل',
      'damaged': 'تالف',
      'expired': 'منتهي الصلاحية'
    };
    return types[type] || type;
  };

  // Get transaction type class
  const getTransactionTypeClass = (type) => {
    const classes = {
      'purchase': 'bg-blue-100 text-blue-800',
      'sale': 'bg-green-100 text-green-800',
      'return': 'bg-yellow-100 text-yellow-800',
      'adjustment': 'bg-purple-100 text-purple-800',
      'damaged': 'bg-red-100 text-red-800',
      'expired': 'bg-orange-100 text-orange-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <FiArrowRight className="ml-1" />
          <span>العودة</span>
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <FaHistory className="text-blue-600 text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">سجل حركات المخزون</h1>
              <p className="text-gray-600">{product?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">الكمية المتوفرة:</span>
            <span className="text-lg font-semibold">{product?.stockQuantity} قطعة</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع المعاملة</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="">الكل</option>
              <option value="purchase">شراء</option>
              <option value="sale">بيع</option>
              <option value="return">مرتجع</option>
              <option value="adjustment">تعديل</option>
              <option value="damaged">تالف</option>
              <option value="expired">منتهي الصلاحية</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              min={filters.dateFrom}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">بحث</label>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث برقم المرجع أو الملاحظات"
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              {(filters.type || filters.dateFrom || filters.dateTo || filters.search) && (
                <button
                  onClick={clearFilters}
                  className="absolute left-8 top-2 text-gray-400 hover:text-gray-600"
                  title="مسح الفلاتر"
                >
                  <FiX className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نوع المعاملة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الكمية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  السعر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المورد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المرجع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ملاحظات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDisplayDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTransactionTypeClass(transaction.transactionType)}`}>
                        {formatTransactionType(transaction.transactionType)}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.unitPrice ? `${transaction.unitPrice.toFixed(2)} ر.س` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.supplier?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.referenceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={transaction.notes}>
                      {transaction.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                    لا توجد معاملات متطابقة مع معايير البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض <span className="font-medium">{indexOfFirstItem + 1}</span> إلى{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredTransactions.length)}
                  </span>{' '}
                  من <span className="font-medium">{filteredTransactions.length}</span> نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">السابق</span>
                    <FiArrowRight className="h-5 w-5" aria-hidden="true" />
                  </button>
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
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">التالي</span>
                    <FiArrowLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
