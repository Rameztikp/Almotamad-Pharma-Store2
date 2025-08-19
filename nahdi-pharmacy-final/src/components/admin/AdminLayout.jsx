import React, { useState, useEffect, useRef } from 'react';
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
  FaChevronUp,
  FaChevronDown,
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
    name: 'التصنيفات', 
    path: '/admin/categories', 
    icon: <FaBox /> 
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
  const [isHovering, setIsHovering] = useState(false);
  const profileDropdownRef = useRef(null);
  const sidebarRef = useRef(null);

  // Handle sidebar toggle with smooth animation
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('sidebarCollapsed', !newState);
    
    // Add animation class
    if (sidebarRef.current) {
      sidebarRef.current.classList.add('transition-all', 'duration-300');
    }
  };
  
  // Close sidebar for mobile
  const closeSidebar = () => {
    if (window.innerWidth < 1024) { // Only close on mobile
      setSidebarOpen(false);
      localStorage.setItem('sidebarCollapsed', true);
    }
  };
  
  // Handle hover effect for desktop
  const handleMouseEnter = () => {
    if (window.innerWidth >= 1024) {
      setIsHovering(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (window.innerWidth >= 1024) {
      setIsHovering(false);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    
    // Load sidebar state from localStorage
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    setSidebarOpen(!isCollapsed);
  }, []);

  const handleLogout = () => {
    if (logout()) {
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/admin/login');
    }
  };

  return (
    <div className="relative flex h-screen bg-gray-100 overflow-hidden rtl">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Collapsed Sidebar Icons - Always visible on desktop */}
      <div className={`fixed right-0 top-0 h-full z-20 hidden lg:flex flex-col items-center py-4 space-y-4 bg-white border-l border-gray-100 transition-all duration-300 ${
        !sidebarOpen ? 'w-14' : 'w-0 opacity-0 overflow-hidden'
      }`}>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors duration-200"
          title="إظهار القائمة"
        >
          <FaChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 flex items-center">
          <button
            onClick={handleLogout}
            className="p-2 rounded-full text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors duration-200"
            title="تسجيل الخروج"
          >
            <FaSignOutAlt className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Sidebar */}
      <div 
        ref={sidebarRef}
        className={`fixed inset-y-0 right-0 z-30 w-72 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        dir="rtl"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="h-full flex flex-col bg-white border-l border-gray-100">
          {/* Sidebar header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">لوحة التحكم</h2>
            <div className="flex items-center">
              {/* Desktop Toggle Button */}
              <button
                onClick={toggleSidebar}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`hidden lg:flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-300 ${
                  !sidebarOpen ? 'rotate-180' : ''
                }`}
                title={sidebarOpen ? 'إخفاء الشريط الجانبي' : 'إظهار الشريط الجانبي'}
                aria-expanded={sidebarOpen}
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <FaChevronRight className={`absolute h-4 w-4 transition-all duration-300 ${!sidebarOpen ? 'opacity-100' : 'opacity-0'}`} />
                  <FaChevronLeft className={`absolute h-4 w-4 transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} />
                </div>
                {isHovering && (
                  <span className="absolute right-full mr-3 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap">
                    {sidebarOpen ? 'إخفاء القائمة' : 'إظهار القائمة'}
                  </span>
                )}
              </button>
              
              {/* Mobile Toggle Button */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors duration-200"
                aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? (
                  <FaTimes className="h-5 w-5" />
                ) : (
                  <FaBars className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          
          {/* User profile */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <FaUser className="h-5 w-5" />
              </div>
              <div className="mr-3 text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || 'المسؤول'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2">
            {menuItems.map((item) => (
              <div key={item.name} className="px-2">
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md ${
                        expandedMenus[item.name]
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="ml-2 text-gray-500">{item.icon}</span>
                        <span className="mr-2">{item.name}</span>
                      </div>
                      {expandedMenus[item.name] ? (
                        <FaChevronDown className="w-4 h-4 text-gray-500 transform rotate-180" />
                      ) : (
                        <FaChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    {expandedMenus[item.name] && (
                      <div className="mr-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) => 
                              `block px-3 py-2 text-sm font-medium rounded-md ${
                                isActive 
                                  ? 'bg-gray-100 text-gray-900' 
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`
                            }
                            onClick={closeSidebar}
                          >
                            {child.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) => 
                      `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                    onClick={closeSidebar}
                  >
                    <span className="ml-2 text-gray-500">{item.icon}</span>
                    <span className="mr-2">{item.name}</span>
                  </NavLink>
                )}
              </div>
            ))}
            
            {/* Create Wholesale Account Button */}
            <div className="px-2 mt-4">
              <button
                onClick={() => {
                  setIsCreateWholesaleModalOpen(true);
                  closeSidebar();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-green-600 rounded-md hover:bg-green-50"
              >
                <div className="flex items-center">
                  <FaUserPlus className="ml-2 text-green-500" />
                  <span className="mr-2">إنشاء حساب جملة جديد</span>
                </div>
              </button>
            </div>
          </nav>
          
          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
            >
              <FaSignOutAlt className="ml-2" />
              <span className="mr-2">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'lg:mr-72' : 'lg:mr-14'
      }`}>
        {/* Mobile Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-white rounded-full shadow-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors duration-200"
          aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        >
          {sidebarOpen ? (
            <FaTimes className="h-6 w-6" />
          ) : (
            <FaBars className="h-6 w-6" />
          )}
        </button>
        {/* Top navigation */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <FaBars className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 rtl:space-x-reverse focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <FaUser className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name || 'المستخدم'}
                  </span>
                  <FaChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${
                    isProfileDropdownOpen ? 'transform rotate-180' : ''
                  }`} />
                </button>
                
                {isProfileDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <div className="flex items-center">
                        <FaSignOutAlt className="ml-2" />
                        <span>تسجيل الخروج</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>
      
      {/* Create Wholesale Account Modal */}
      <CreateWholesaleAccountModal
        isOpen={isCreateWholesaleModalOpen}
        onClose={() => setIsCreateWholesaleModalOpen(false)}
        onSubmit={(data) => {
          console.log('New wholesale account:', data);
          setIsCreateWholesaleModalOpen(false);
          toast.success('تم إنشاء حساب الجملة بنجاح');
        }}
      />
    </div>
  );
};

export default AdminLayout;
