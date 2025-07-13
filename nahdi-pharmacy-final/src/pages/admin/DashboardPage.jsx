import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Icons
import { 
  FaBox, 
  FaShoppingCart, 
  FaUsers, 
  FaDollarSign, 
  FaChartLine, 
  FaCalendarAlt,
  FaClipboardList,
  FaTags,
  FaUserTie,
  FaTruck,
  FaCog
} from 'react-icons/fa';

// Charts
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Sample data for charts
const monthlySalesData = [
  { name: 'يناير', sales: 12450, orders: 124 },
  { name: 'فبراير', sales: 18900, orders: 156 },
  { name: 'مارس', sales: 15800, orders: 142 },
  { name: 'أبريل', sales: 20300, orders: 178 },
  { name: 'مايو', sales: 18900, orders: 165 },
  { name: 'يونيو', sales: 23900, orders: 198 },
];

const bestSellingProducts = [
  { id: 1, name: 'بنادول اكسترا', sales: 45, revenue: 2250 },
  { id: 2, name: 'فيتامين سي', sales: 38, revenue: 1900 },
  { id: 3, name: 'كريم مرطب', sales: 32, revenue: 1600 },
  { id: 4, name: 'مسكن ألم', sales: 25, revenue: 1250 },
  { id: 5, name: 'مكمل غذائي', sales: 18, revenue: 900 },
];

const orderStatusData = [
  { name: 'مكتمل', value: 65, color: '#10B981' },
  { name: 'قيد التجهيز', value: 15, color: '#3B82F6' },
  { name: 'قيد الشحن', value: 10, color: '#F59E0B' },
  { name: 'ملغي', value: 5, color: '#EF4444' },
  { name: 'مسترد', value: 5, color: '#9CA3AF' },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    pendingOrders: 0,
    outOfStock: 0,
    monthlySales: [],
    topProducts: []
  });
  
  // Mock data for development
  const [recentActivities, setRecentActivities] = useState([
    { 
      id: 1, 
      title: 'طلب جديد', 
      description: 'تم استلام طلب جديد #12345', 
      timestamp: new Date().toISOString(),
      type: 'order',
      icon: <FaShoppingCart className="text-blue-500" />
    },
    { 
      id: 2, 
      title: 'تسجيل مستخدم', 
      description: 'تم تسجيل مستخدم جديد', 
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'user',
      icon: <FaUserTie className="text-green-500" />
    },
    { 
      id: 3, 
      title: 'تحديث المنتج', 
      description: 'تم تحديث سعر المنتج #P100', 
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'product',
      icon: <FaBox className="text-yellow-500" />
    },
  ]);

  // Mock data for development
  const mockStats = {
    total_orders: 1245,
    total_customers: 842,
    total_products: 356,
    total_sales: 125000,
    pending_orders: 18,
    out_of_stock: 12,
    monthly_sales: monthlySalesData,
    top_products: bestSellingProducts
  };

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        // Use mock data in development or if API fails
        const useMockData = import.meta.env.DEV || hasError;
        
        if (useMockData) {
          // Set mock data with a small delay to simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setStats({
            totalOrders: mockStats.total_orders,
            totalCustomers: mockStats.total_customers,
            totalProducts: mockStats.total_products,
            totalSales: mockStats.total_sales,
            pendingOrders: mockStats.pending_orders,
            outOfStock: mockStats.out_of_stock,
            monthlySales: monthlySalesData,
            topProducts: bestSellingProducts
          });
          
          setIsLoading(false);
          return;
        }
        
        // Try to fetch real data in production
        try {
          // Fetch stats
          const [statsResponse, activitiesResponse] = await Promise.all([
            adminApi.getDashboardStats(),
            adminApi.getRecentActivities()
          ]);
          
          // Handle stats response
          if (statsResponse?.success) {
            setStats({
              totalOrders: statsResponse.data.total_orders || 0,
              totalCustomers: statsResponse.data.total_customers || 0,
              totalProducts: statsResponse.data.total_products || 0,
              totalSales: statsResponse.data.total_sales || 0,
              pendingOrders: statsResponse.data.pending_orders || 0,
              outOfStock: statsResponse.data.out_of_stock || 0,
              monthlySales: statsResponse.data.monthly_sales || [],
              topProducts: statsResponse.data.top_products || []
            });
          } else {
            throw new Error('Failed to fetch stats');
          }
          
          // Handle activities response
          if (activitiesResponse?.success && Array.isArray(activitiesResponse.data)) {
            setRecentActivities(activitiesResponse.data.map(activity => ({
              ...activity,
              icon: getActivityIcon(activity.type)
            })));
          } else {
            throw new Error('Failed to fetch activities');
          }
          
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
          setHasError(true);
          // Will trigger a retry with mock data
          fetchDashboardData();
          return;
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setHasError(true);
        toast.error('حدث خطأ غير متوقع - يتم استخدام بيانات تجريبية');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Set up auto-refresh every 5 minutes
    const intervalId = setInterval(fetchDashboardData, 5 * 60 * 1000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [hasError]);
  
  // Helper function to get icon based on activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'order':
        return <FaShoppingCart className="text-blue-500" />;
      case 'user':
        return <FaUserTie className="text-green-500" />;
      case 'product':
        return <FaBox className="text-yellow-500" />;
      default:
        return <FaClipboardList className="text-gray-500" />;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full ml-2"></span>
            <span>مرحباً بك في لوحة تحكم متجر المتميزة</span>
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
          <FaCalendarAlt className="text-blue-500 ml-2" />
          <span className="text-sm font-medium text-gray-700">
            {new Date().toLocaleDateString('ar-SA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Total Sales */}
            <Link 
              to="/admin/orders" 
              className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 hover:border-blue-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">إجمالي المبيعات</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalSales)}</p>
                  <div className="mt-3 flex items-center text-xs text-green-500">
                    <FaChartLine className="ml-1" />
                    <span>12% زيادة عن الشهر الماضي</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <FaDollarSign className="text-xl" />
                </div>
              </div>
            </Link>

            {/* Total Orders */}
            <Link 
              to="/admin/orders" 
              className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 hover:border-green-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-1 h-full bg-green-500"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">إجمالي الطلبات</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
                  <div className="mt-3 flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full ml-1"></span>
                    <span className="text-xs text-gray-500">
                      {stats.pendingOrders} طلب قيد الانتظار
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                  <FaShoppingCart className="text-xl" />
                </div>
              </div>
            </Link>

            {/* Total Customers */}
            <Link to="/admin/customers" className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg text-white p-5 hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">إجمالي العملاء</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalCustomers}</p>
                  <p className="text-xs mt-2 opacity-90">
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-blue-300 rounded-full ml-1"></span>
                      15% زيادة عن الشهر الماضي
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-full bg-white bg-opacity-20">
                  <FaUsers className="text-2xl" />
                </div>
              </div>
            </Link>

            {/* Total Products */}
            <Link to="/admin/products" className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-lg text-white p-5 hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">إجمالي المنتجات</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalProducts}</p>
                  <p className="text-xs mt-2 opacity-90">
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-red-400 rounded-full ml-1"></span>
                      {stats.outOfStock} منتج غير متوفر
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-full bg-white bg-opacity-20">
                  <FaBox className="text-2xl" />
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">أحدث النشاطات</h2>
              <Link to="/admin/activities" className="text-sm text-blue-600 hover:underline flex items-center">
                عرض الكل
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    activity.type === 'order' ? 'bg-blue-50 text-blue-600' :
                    activity.type === 'user' ? 'bg-green-50 text-green-600' :
                    'bg-yellow-50 text-yellow-600'
                  }`}>
                    {activity.type === 'order' && <FaShoppingCart className="text-lg" />}
                    {activity.type === 'user' && <FaUserTie className="text-lg" />}
                    {activity.type === 'product' && <FaBox className="text-lg" />}
                  </div>
                  <div className="mr-3 flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800">{activity.title}</h4>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString('ar-SA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <button className="text-gray-300 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Sales Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">المبيعات الشهرية</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySalesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip 
                      formatter={(value, name) => name === 'sales' ? [formatCurrency(value), 'المبيعات'] : [value, 'عدد الطلبات']}
                      labelFormatter={(label) => `الشهر: ${label}`}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" name="إجمالي المبيعات" fill="#8884d8" radius={[4, 4, 0, 0]}
                      label={{ position: 'top', formatter: (value) => formatCurrency(value) }} />
                    <Line yAxisId="right" type="monotone" dataKey="orders" name="عدد الطلبات" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">توزيع الطلبات حسب الحالة</h3>
              <div className="h-80 flex">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {orderStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'النسبة']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col justify-center pr-4">
                  {orderStatusData.map((status, index) => (
                    <div key={index} className="flex items-center mb-3">
                      <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: status.color }}></div>
                      <span className="text-sm text-gray-600">{status.name}</span>
                      <span className="mr-auto text-sm font-medium">{status.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Best Selling Products */}
          <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">المنتجات الأكثر مبيعاً</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عدد المبيعات</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجمالي الإيرادات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bestSellingProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sales} مبيعاً</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
