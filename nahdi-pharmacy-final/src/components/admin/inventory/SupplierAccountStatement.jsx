import React, { useState, useEffect } from 'react';
import { 
  FiDollarSign, 
  FiPrinter, 
  FiDownload, 
  FiCalendar, 
  FiChevronRight, 
  FiChevronLeft,
  FiPackage,
  FiCreditCard,
  FiFilter
} from 'react-icons/fi';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

const SupplierAccountStatement = ({ supplier, onClose }) => {
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'purchase', 'payment'
  });

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    return format(new Date(date), 'yyyy-MM-dd');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!supplier) return;
      
      try {
        setLoading(true);
        const token = getToken();
        let url = `http://localhost:8080/api/v1/admin/suppliers/${supplier.id}/transactions?`;
        
        // Add date range to URL
        url += `start_date=${formatDate(dateRange.startDate)}`;
        url += `&end_date=${formatDate(dateRange.endDate)}`;
        
        // Add type filter if not 'all'
        if (filters.type !== 'all') {
          url += `&type=${filters.type}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error('فشل في تحميل كشف الحساب');
        
        const data = await response.json();
        setTransactions(data.data || []);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [supplier, dateRange, filters, getToken]);

  // Calculate running balance
  const calculateBalance = () => {
    let balance = 0;
    return transactions.map(transaction => {
      if (transaction.type === 'purchase') {
        balance += transaction.amount;
      } else if (transaction.type === 'payment') {
        balance -= transaction.amount;
      }
      return {
        ...transaction,
        balance: balance
      };
    }).reverse(); // Show latest first
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  if (!supplier) return null;

  const statementData = calculateBalance();
  const openingBalance = statementData[0]?.balance || 0;
  const closingBalance = statementData[statementData.length - 1]?.balance || 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 print:p-0 print:shadow-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 print:flex-col print:items-center print:mb-4">
        <div className="text-right print:text-center">
          <h2 className="text-2xl font-bold text-gray-800">كشف حساب المورد</h2>
          <h3 className="text-xl text-gray-600">{supplier.name}</h3>
          <p className="text-gray-500">{supplier.phone}</p>
          {supplier.email && <p className="text-gray-500">{supplier.email}</p>}
        </div>
        
        <div className="flex space-x-3 space-x-reverse print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FiPrinter className="ml-2" />
            طباعة
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={formatDate(dateRange.startDate)}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                className="w-full p-2 border rounded-md"
              />
              <FiCalendar className="absolute right-3 top-3 text-gray-400" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={formatDate(dateRange.endDate)}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                className="w-full p-2 border rounded-md"
              />
              <FiCalendar className="absolute right-3 top-3 text-gray-400" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الحركة</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">الكل</option>
              <option value="purchase">مشتريات</option>
              <option value="payment">مدفوعات</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3 print:gap-2">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">الرصيد الافتتاحي</p>
              <p className="text-xl font-semibold">{formatCurrency(openingBalance)}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <FiDollarSign size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">إجمالي المشتريات</p>
              <p className="text-xl font-semibold">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'purchase')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-full text-green-600">
              <FiPackage size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">إجمالي المدفوعات</p>
              <p className="text-xl font-semibold">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'payment')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
              <FiCreditCard size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                التاريخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                نوع الحركة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الرقم المرجعي
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الوصف
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                المدين
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الدائن
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الرصيد
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center">
                  جاري التحميل...
                </td>
              </tr>
            ) : statementData.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  لا توجد حركات في الفترة المحددة
                </td>
              </tr>
            ) : (
              statementData.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(transaction.date), 'yyyy/MM/dd', { locale: arSA })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.type === 'purchase' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {transaction.type === 'purchase' ? 'فاتورة مشتريات' : 'سند صرف'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.reference_number || '--'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {transaction.description || '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.type === 'purchase' ? formatCurrency(transaction.amount) : '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.type === 'payment' ? formatCurrency(transaction.amount) : '--'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    transaction.balance < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(transaction.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan="4" className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                الرصيد الختامي
              </td>
              <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                {closingBalance > 0 ? formatCurrency(closingBalance) : '--'}
              </td>
              <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                {closingBalance < 0 ? formatCurrency(Math.abs(closingBalance)) : '--'}
              </td>
              <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                <span className={closingBalance < 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(closingBalance)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
        <div className="flex justify-between">
          <div className="text-sm text-gray-500">
            <p>تاريخ الطباعة: {format(new Date(), 'yyyy/MM/dd', { locale: arSA })}</p>
            <p>اسم المستخدم: [اسم المستخدم]</p>
          </div>
          <div className="text-sm text-gray-500 text-left">
            <p>برنامج إدارة الصيدلية</p>
            <p>هاتف: [رقم الهاتف]</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierAccountStatement;
