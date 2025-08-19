import React, { useState, useEffect, useCallback } from 'react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Icons
import { 
  FaBox, 
  FaBoxes, 
  FaChartLine, 
  FaClock, 
  FaDollarSign, 
  FaExclamationCircle, 
  FaExclamationTriangle, 
  FaShoppingCart, 
  FaStore, 
  FaSync, 
  FaSyncAlt,
  FaUserPlus, 
  FaUsers, 
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

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const defaultMonthlySales = Array(6).fill(0).map((_, i) => ({
  name: new Date(0, i).toLocaleString('ar-SA', { month: 'long' }),
  sales: 0,
  orders: 0
}));

const defaultOrderStatus = [
  { name: 'مكتمل', value: 0, color: '#10B981' },
  { name: 'قيد التجهيز', value: 0, color: '#3B82F6' },
  { name: 'قيد الشحن', value: 0, color: '#F59E0B' },
  { name: 'ملغي', value: 0, color: '#EF4444' },
  { name: 'مسترد', value: 0, color: '#9CA3AF' },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    retailOrders: 0,
    wholesaleOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    pendingOrders: 0,
    outOfStock: 0,
    monthlySales: [...defaultMonthlySales],
    topProducts: [],
    orderStatus: [...defaultOrderStatus],
    recentActivities: []
  });

  const { recentActivities = [] } = stats;

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get icon based on activity type
  const getActivityIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'order': 
        return <FaShoppingCart className="text-blue-500" />;
      case 'product': 
        return <FaBox className="text-green-500" />;
      case 'user': 
        return <FaUserPlus className="text-purple-500" />;
      case 'payment': 
        return <FaDollarSign className="text-yellow-500" />;
      default: return <FaClipboardList className="text-gray-500" />;
    }
  };

  // Format last updated time
  const formatLastUpdated = (date) => {
    if (!date) return 'لم يتم التحديث بعد';
    return `آخر تحديث: ${new Date(date).toLocaleTimeString('ar-SA')}`;
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboardData();
      toast.success('تم تحديث البيانات بنجاح');
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      toast.error('فشل في تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch dashboard data from API
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [statsResponse, activitiesResponse] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getRecentActivities()
      ]);

      if (!statsResponse?.success || !activitiesResponse?.success) {
        throw new Error('فشل في تحميل بيانات لوحة التحكم');
      }

      const statsData = statsResponse.data || statsResponse;
      const activitiesData = activitiesResponse.data || [];

      // Log the raw data for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Raw dashboard data:', { statsData, activitiesData });
      }

      // Transform data to match component state
      const transformedStats = {
        totalSales: statsData.total_sales || 0,
        totalOrders: statsData.total_orders || 0,
        retailOrders: statsData.retail_orders || statsData.retailOrders || 0,
        wholesaleOrders: statsData.wholesale_orders || statsData.wholesaleOrders || 0,
        totalCustomers: statsData.total_customers || 0,
        totalProducts: statsData.total_products || 0,
        pendingOrders: statsData.pending_orders || 0,
        outOfStock: statsData.out_of_stock || 0,
        monthlySales: Array.isArray(statsData.monthly_sales) && statsData.monthly_sales.length
          ? statsData.monthly_sales.map(item => {
              // item.month comes as 'YYYY-MM'
              const label = (() => {
                try {
                  const [y, m] = String(item.month).split('-').map(Number);
                  return new Date(y, (m || 1) - 1, 1).toLocaleString('ar-SA', { month: 'short' });
                } catch {
                  return String(item.month);
                }
              })();
              return {
                name: label,
                sales: item.total_sales ?? item.total ?? 0,
                orders: item.order_count ?? item.orders ?? 0
              };
            })
          : [...defaultMonthlySales],
        topProducts: Array.isArray(statsData.top_products) ? statsData.top_products.map(product => ({
          id: product.product_id || product.id,
          name: product.name,
          quantity_sold: product.sold_count ?? product.quantity_sold ?? 0,
          revenue: product.total_amount ?? product.revenue ?? 0
        })) : [],
        orderStatus: Array.isArray(statsData.order_status) && statsData.order_status.length
          ? statsData.order_status.map(status => ({
              name: status.status,
              value: status.count || 0,
              color: status.color || '#3B82F6'
            }))
          : [...defaultOrderStatus],
        recentActivities: Array.isArray(activitiesData)
          ? activitiesData.slice(0, 5).map(a => {
              const desc = a.description || a.message || '';
              const type = /طلب|order/i.test(desc) ? 'order' : /مستخدم|user/i.test(desc) ? 'user' : /منتج|product/i.test(desc) ? 'product' : 'activity';
              return {
                id: a.id,
                type,
                title: 'نشاط',
                description: desc,
                timestamp: a.timestamp || a.created_at,
              };
            })
          : []
      };

      setStats(transformedStats);
      setLastUpdated(new Date());
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Transformed stats:', transformedStats);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      toast.error('حدث خطأ أثناء تحميل بيانات لوحة التحكم');
      
      // Set default values on error
      setStats(prev => ({
        ...prev,
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: 0,
        pendingOrders: 0,
        outOfStock: 0,
        monthlySales: [...defaultMonthlySales],
        topProducts: [],
        orderStatus: [...defaultOrderStatus],
        recentActivities: []
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const fetchData = async () => {
      if (isMounted) {
        await fetchDashboardData();
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for auto-refresh (every 5 minutes)
    intervalId = setInterval(fetchData, REFRESH_INTERVAL);
    
    // Cleanup interval and set isMounted to false on unmount
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchDashboardData]);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // handleRefresh is already defined above with proper loading state and error handling

  // Format time for activity logs
  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminNavbar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 transition-all duration-300 ease-in-out">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
              {lastUpdated && (
                <p className="text-xs text-gray-500 mt-1">
                  آخر تحديث: {new Date(lastUpdated).toLocaleTimeString('ar-SA')}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full ml-2"></span>
                <span>مرحباً بك في لوحة تحكم متجر المتميزة</span>
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={handleRefresh}
                className={`flex items-center px-4 py-2 ${isRefreshing ? 'bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
                disabled={isRefreshing}
              >
                <FaSyncAlt className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث البيانات
              </button>
            </div>
          </div>
          
          {/* Dashboard Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Orders Card */}
              <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 hover:border-green-100 overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-green-500"></div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-gray-500 flex gap-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-100">
                          تجزئة: {stats.retailOrders}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          جملة: {stats.wholesaleOrders}
                        </span>
                      </div>
                      <span className="text-sm text-amber-600">{stats.pendingOrders} طلب قيد الانتظار</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                    <FaShoppingCart className="text-xl" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link 
                    to="/admin/orders" 
                    className="text-sm font-medium text-green-600 hover:text-green-800 inline-flex items-center"
                  >
                    عرض الطلبات <FaShoppingCart className="mr-1" />
                  </Link>
                </div>
              </div>

              {/* Total Customers */}
                <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 hover:border-purple-100 overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-purple-500"></div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">إجمالي العملاء</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.totalCustomers}</p>
                      <div className="mt-2 flex items-center text-sm text-blue-600">
                        <FaUserPlus className="ml-1" />
                        <span>عملاء جدد هذا الشهر</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                      <FaUsers className="text-xl" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link 
                      to="/admin/customers" 
                      className="text-sm font-medium text-purple-600 hover:text-purple-800 inline-flex items-center"
                    >
                      إدارة العملاء <FaUsers className="mr-1" />
                    </Link>
                  </div>
                </div>

                {/* Total Products */}
                <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 hover:border-amber-100 overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-amber-500"></div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">إجمالي المنتجات</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.totalProducts}</p>
                      <div className="mt-2 flex items-center text-sm text-red-600">
                        <FaExclamationTriangle className="ml-1" />
                        <span>{stats.outOfStock} منتج غير متوفر</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                      <FaBoxes className="text-xl" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link 
                      to="/admin/inventory" 
                      className="text-sm font-medium text-amber-600 hover:text-amber-800 inline-flex items-center"
                    >
                      إدارة المخزون <FaBoxes className="mr-1" />
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Recent Activities */}
              <div className="mt-6">
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
                    {Array.isArray(stats.recentActivities) && stats.recentActivities.length > 0 ? (
                      stats.recentActivities.map((activity) => (
                        <div key={activity.id || activity.timestamp || Math.random()} className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors group">
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
                            <h4 className="font-medium text-gray-800">{activity.title || 'نشاط جديد'}</h4>
                            <p className="text-sm text-gray-600">{activity.description || 'لا يوجد وصف متاح'}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {activity.timestamp ? new Date(activity.timestamp).toLocaleString('ar-SA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'الآن'}
                            </p>
                          </div>
                          <button className="text-gray-300 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        لا توجد أنشطة حديثة لعرضها
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Sales Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">المبيعات الشهرية</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.monthlySales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                            data={stats.orderStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {stats.orderStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => [
                              value,
                              props.payload.name,
                              `نسبة: ${(props.payload.percent * 100).toFixed(1)}%`
                            ]} 
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
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
                  {stats.topProducts && stats.topProducts.length > 0 ? (
                    stats.topProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.quantity_sold || 0} مبيعاً</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(product.revenue || 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">لا توجد بيانات متاحة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
