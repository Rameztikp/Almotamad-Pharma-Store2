import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import CreateWholesaleAccountModal from './CreateWholesaleAccountModal';
import { 
  FaBox, 
  FaUsers, 
  FaShoppingCart, 
  FaTags, 
  FaUserCog, 
  FaSignOutAlt, 
  FaBars, 
  FaTimes, 
  FaUser, 
  FaHome,
  FaTachometerAlt,
  FaUserPlus,
  FaCog as FaGear,
  FaChevronRight,
  FaChevronLeft,
  FaWarehouse,
  FaClipboardList
} from 'react-icons/fa';

// Menu items configuration
const menuItems = [
  { 
    name: 'لوحة التحكم', 
    path: '/admin/dashboard', 
    icon: <FaTachometerAlt />,
    exact: true
  },
  { 
    name: 'المنتجات', 
    path: '/admin/products', 
    icon: <FaBox />,
    children: [
      { name: 'المنتجات بالجملة', path: '/admin/products/wholesale' },
      { name: 'المنتجات بالتجزئة', path: '/admin/products/retail' }
    ]
  },
  { 
    name: 'الطلبات', 
    path: '/admin/orders',
    icon: <FaShoppingCart />,
    children: [
      { name: 'طلبات الجملة', path: '/admin/orders/wholesale' },
      { name: 'طلبات التجزئة', path: '/admin/orders/retail' }
    ]
  },
  { 
    name: 'العملاء', 
    path: '/admin/customers',
    icon: <FaUsers />,
    children: [
      { name: 'عملاء الجملة', path: '/admin/customers/wholesale' },
      { name: 'عملاء التجزئة', path: '/admin/customers/retail' }
    ]
  },
  { 
    name: 'الكوبونات', 
    path: '/admin/coupons', 
    icon: <FaTags /> 
  },
  { 
    name: 'المستخدمين', 
    path: '/admin/users', 
    icon: <FaUserCog /> 
  },
  { 
    name: 'إدارة المخزون', 
    path: '/admin/inventory',
    icon: <FaWarehouse />,
    children: [
      { name: 'المنتجات', path: '/admin/inventory' },
      { name: 'أرصدة الموردين', path: '/admin/inventory/suppliers' }
    ]
  },
  { 
    name: 'التقارير', 
    path: '/admin/reports', 
    icon: <FaClipboardList /> 
  },
];

const AdminLayout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCreateWholesaleModalOpen, setIsCreateWholesaleModalOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  
  // Toggle menu expansion
  const toggleMenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('adminUser');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    if (logout()) {
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/admin/login');
    }
  };

  return (
    <div className="relative flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 right-0 z-30 w-72 transform ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:fixed lg:right-0 lg:translate-x-0 transition-transform duration-300 ease-in-out ${
          !sidebarOpen ? 'lg:translate-x-[18rem]' : ''
        }`}
        style={{
          willChange: 'transform',
          backgroundColor: 'white',
          boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
          height: '100vh',
          overflowY: 'auto'
        }}
      >
      
      {/* Admin Top Navbar */}
      <header className="fixed top-0 right-0 left-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              type="button"
              className="p-2 text-gray-500 rounded-md lg:hidden focus:outline-none"
              onClick={toggleSidebar}
              aria-label="تبديل القائمة الجانبية"
            >
              {sidebarOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
            </button>
            <NavLink 
              to="/" 
              className="flex items-center ml-4 text-blue-600 hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaHome className="w-5 h-5 ml-1" />
              <span className="text-sm font-medium">الرئيسية</span>
            </NavLink>
          </div>
          
          <div className="flex items-center">
            {/* Profile dropdown */}
            <div className="relative ml-3">
              <div>
                <button
                  type="button"
                  className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  id="user-menu"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="true"
                >
                  <span className="sr-only">فتح القائمة</span>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FaUser className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="mr-2 text-sm font-medium text-gray-700">
                    {user?.name || 'المشرف'}
                  </span>
                </button>
              </div>
              
              {isProfileDropdownOpen && (
                <div 
                  className="absolute right-0 w-48 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-right text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <FaSignOutAlt className="ml-2 text-gray-500" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 right-4 z-40 p-2 rounded-md bg-white shadow-md lg:hidden"
        aria-label="تبديل القائمة الجانبية"
      >
        {sidebarOpen ? (
          <FaTimes className="w-5 h-5 text-gray-600" />
        ) : (
          <FaBars className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <aside
        className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white border-l border-gray-200 shadow-lg"
        style={{ paddingTop: '4rem' }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                لوحة التحكم
              </span>
            </h1>
            <button
              onClick={closeSidebar}
              className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors lg:hidden"
              aria-label="إغلاق القائمة الجانبية"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          {user && (
            <div className="mt-2 flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FaUser className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mr-2 text-right">
                <p className="text-sm font-medium text-gray-700">{user.name || 'المشرف'}</p>
                <p className="text-xs text-gray-500">مدير النظام</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.children && item.children.some(child => 
                  location.pathname.startsWith(child.path)
                ));
              const isExpanded = expandedMenus[item.path] ?? isActive;
              
              return (
                <li key={item.path} className="space-y-1">
                  <NavLink
                    to={item.path}
                    className={({ isActive: isLinkActive }) =>
                      `flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isLinkActive || (item.children && isExpanded)
                          ? 'bg-blue-50 text-blue-700 shadow-sm border-r-4 border-blue-500'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                    end={!item.children}
                    onClick={(e) => {
                      if (!item.children) {
                        closeSidebar();
                      } else {
                        e.preventDefault();
                        setExpandedMenus(prev => ({
                          ...prev,
                          [item.path]: !isExpanded
                        }));
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <span className="ml-3">{item.icon}</span>
                      <span className="mr-2">{item.name}</span>
                    </div>
                    {item.children && (
                      <svg 
                        className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </NavLink>
                  
                  {item.children && isExpanded && (
                    <ul className="mr-6 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const isChildActive = location.pathname === child.path || 
                          location.pathname.startsWith(`${child.path}/`);
                        
                        return (
                          <li key={child.path}>
                            <NavLink
                              to={child.path}
                              className={({ isActive: isChildLinkActive }) =>
                                `flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                                  isChildLinkActive || isChildActive
                                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-400'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`
                              }
                              onClick={closeSidebar}
                            >
                              <span className="mr-2">{child.name}</span>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
            
            {/* Create Wholesale Account Button */}
            <li className="mt-auto pt-2 border-t border-gray-200">
              <div className="space-y-2 px-2">
                <button
                  onClick={() => {
                    setIsCreateWholesaleModalOpen(true);
                    closeSidebar();
                  }}
                  className="flex items-center w-full p-3 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
                >
                  <FaUserPlus className="ml-3 text-green-600" />
                  <span className="mr-2 font-medium">إنشاء حساب جملة جديد</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full p-3 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  <FaSignOutAlt className="ml-3 text-red-600" />
                  <span className="mr-2 font-medium">تسجيل الخروج</span>
                </button>
              </div>
            </li>
          </ul>
        </nav>
      </aside>
      </div>

      {/* Main content */}
      <main 
        className="flex-1 pt-16 overflow-x-hidden overflow-y-auto focus:outline-none bg-gray-50 transition-all duration-300"
        style={{
          minWidth: 0,
          padding: '1rem',
          marginRight: sidebarOpen ? '18rem' : '0',
          transition: 'margin 0.3s ease-in-out',
          width: sidebarOpen ? 'calc(100% - 18rem)' : '100%'
        }}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children || <Outlet />}
        </div>
      </main>
      
      {/* Sidebar Toggle for Desktop */}
      <button
        onClick={toggleSidebar}
        className={`hidden lg:flex fixed bottom-8 z-40 p-2 bg-white shadow-md border border-gray-200 items-center justify-center transition-all duration-300 ${
          sidebarOpen ? 'right-[18rem] rounded-l-lg border-r-0' : 'right-0 rounded-r-lg border-l-0'
        }`}
        aria-label="تبديل القائمة الجانبية"
      >
        {sidebarOpen ? (
          <FaChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <FaChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Create Wholesale Account Modal */}
      <CreateWholesaleAccountModal
        isOpen={isCreateWholesaleModalOpen}
        onClose={() => setIsCreateWholesaleModalOpen(false)}
        onSubmit={(formData) => {
          console.log('New wholesale account created:', formData);
          // Here you would typically make an API call to create the account
          setIsCreateWholesaleModalOpen(false);
        }}
      />
    </div>
  );
};

export default AdminLayout;
