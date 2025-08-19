import React, { useState, useRef, useEffect } from 'react';
import { FiMenu, FiBell, FiUser, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const AdminNavbar = ({ toggleSidebar }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Right side - Logo and Dashboard Title */}
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium md:hidden"
            >
              <FiMenu className="h-6 w-6" />
            </button>
            <div className="flex-shrink-0 flex items-center">
              <Link to="/admin" className="flex items-center">
                <img
                  className="h-10 w-auto"
                  src="/src/assets/logo-almutamed.png"
                  alt="Almotamad Logo"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/logo.png';
                  }}
                />
                <span className="mr-3 text-lg font-bold text-white">لوحة التحكم الإدارية</span>
              </Link>
            </div>
          </div>

          {/* Left side - Navigation items */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Notifications */}
            <button className="text-gray-300 hover:bg-gray-700 hover:text-white p-2 rounded-full">
              <span className="sr-only">عرض الإشعارات</span>
              <div className="relative">
                <FiBell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  3
                </span>
              </div>
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <div>
                <button
                  type="button"
                  className="flex items-center text-sm rounded-full focus:outline-none"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <span className="sr-only">فتح قائمة المستخدم</span>
                  <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                    <FiUser className="h-5 w-5" />
                  </div>
                  <FiChevronDown className="mr-1 h-4 w-4 text-gray-300" />
                </button>
              </div>

              {/* Dropdown menu */}
              {isProfileOpen && (
                <div className="origin-top-right absolute left-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <Link
                    to="/admin/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-right"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    الملف الشخصي
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-right"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <div className="flex items-center justify-end">
                      <span className="ml-2">الإعدادات</span>
                      <FiSettings className="h-4 w-4" />
                    </div>
                  </Link>
                  <button
                    className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      // Handle logout
                      console.log('Logout clicked');
                      setIsProfileOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-end">
                      <span className="ml-2">تسجيل الخروج</span>
                      <FiLogOut className="h-4 w-4" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
