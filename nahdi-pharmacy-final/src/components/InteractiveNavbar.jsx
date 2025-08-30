import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  User,
  Heart,
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  LogIn,
  UserPlus,
  Settings,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useShop } from "../context/useShop";
import { useUserAuth } from "../context/UserAuthContext";
import InteractiveFavoritesModal from "./InteractiveFavoritesModal";
import AuthModal from "./auth/AuthModal";
import mutamedLogo from "../assets/logo-almutamed.png";
import { toast } from "react-hot-toast";
import NotificationCenter from "./Notifications/NotificationCenter";
import notificationService from "../services/notificationService";

const InteractiveNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useUserAuth();
  const user = authUser || {}; // Ensure user is always an object
  const isAuthenticated = !!authUser; // اشتقاق حالة المصادقة من السياق (كوكي)

  // Safely get shop context with fallbacks
  let cartItems = [];
  let favoriteItems = [];

  try {
    const shopContext = useShop();
    cartItems = shopContext?.cartItems || [];
    favoriteItems = shopContext?.favoriteItems || [];
  } catch (error) {
    console.warn("Shop context not available:", error);
    // Use empty arrays as fallbacks
    cartItems = [];
    favoriteItems = [];
  }
  // لم نعد نحتاج حالة محلية للمصادقة؛ نعتمد على السياق مباشرة

  // حساب عدد العناصر في المفضلة والسلة
  const favoritesCount = favoriteItems?.length || 0;
  const cartItemsCount =
    cartItems?.reduce((total, item) => total + (item.quantity || 1), 0) || 0;

  // لم نعد نراقب تغيّر التوكنات في localStorage لأن المصادقة تعتمد على كوكي HttpOnly
  // أي تغيّر في `authUser` من السياق سيؤدي لإعادة تصيير هذا المكون تلقائياً

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("تعز");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Handle successful login
  const handleLoginSuccess = () => {
    setIsAuthModalOpen(false);
    setIsUserMenuOpen(false);

    // Force a re-render without page reload
    window.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { isAuthenticated: true },
      })
    );
  };

  // Handle navigation state for auth modal
  useEffect(() => {
    if (location.state?.showAuthModal) {
      setIsAuthModalOpen(true);
      setIsLoginView(location.state.isLoginView !== false);

      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Initialize notifications (client-only)
  useEffect(() => {
    try {
      notificationService.init();
    } catch (e) {
      // ignore
    }
  }, []);

  const cities = ["صنعاء", "عدن", "تعز", "الحديدة", "إب", "ذمار", "المكلا"];

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        {/* Top Bar */}
        <div className="bg-blue-600 text-white py-2">
          <div className="container mx-auto px-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>اختر طريقة الشحن</span>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span>خدمة العملاء: 920000000</span>
              <span>|</span>
              <span>تطبيق المعتمد فارما</span>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src={mutamedLogo}
                alt="المعتمد فارما"
                className="h-12 w-auto object-contain mx-1"
                style={{
                  maxHeight: "48px",
                  width: "auto",
                  imageRendering: "-webkit-optimize-contrast",
                  transform: "translateZ(0)",
                  backfaceVisibility: "hidden",
                  transformStyle: "preserve-3d",
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = mutamedLogo;
                }}
              />
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xl mx-6">
              <div className="relative w-full group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  placeholder="ابحث عن المنتجات، العلامات التجارية..."
                  className="w-full pr-12 pl-4 py-2.5 text-right text-gray-700 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-300 focus:border-blue-400 focus:bg-white transition-all duration-200 shadow-sm focus:shadow-md outline-none"
                />
                <button
                  type="button"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                >
                  بحث
                </button>
              </div>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center gap-4 relative">
              {/* Location Dropdown */}
              <div className="relative hidden md:block">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                  className="gap-2 px-4 py-2 text-gray-700 bg-white border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
                >
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">التوصيل إلى</span>
                  <span className="font-bold text-blue-700">
                    {selectedCity}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                      isCityDropdownOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>

                {isCityDropdownOpen && (
                  <ul className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded shadow-md w-40 z-50 text-right">
                    {cities.map((city) => (
                      <li
                        key={city}
                        onClick={() => {
                          setSelectedCity(city);
                          setIsCityDropdownOpen(false);
                        }}
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                          selectedCity === city ? "bg-gray-100 font-bold" : ""
                        }`}
                      >
                        {city}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* User Account */}
              {isAuthenticated ? (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="gap-2 px-4 py-2 text-gray-700 bg-white border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
                  >
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="hidden md:inline text-sm font-medium">
                      {user?.full_name || user?.name || "حسابي"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                        isUserMenuOpen ? "transform rotate-180" : ""
                      }`}
                    />
                  </Button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100 text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {user.full_name || user.name || user.email}
                        </p>
                        {user.phone && (
                          <p className="text-xs text-gray-500">{user.phone}</p>
                        )}
                      </div>

                      {/* Menu Items */}
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full flex items-center justify-end px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 gap-2"
                      >
                        <span>حسابي</span>
                        <User className="w-4 h-4" />
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full flex items-center justify-end px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 gap-2"
                      >
                        <span>الإشعارات والإعدادات</span>
                        <Settings className="w-4 h-4" />
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <Link
                        to="/my-orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full flex items-center justify-end px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 gap-2"
                      >
                        <span>طلباتي</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                      </Link>
                      <Link
                        to="/orders/tracking"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full flex items-center justify-end px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 gap-2"
                      >
                        <span>تتبع الطلب</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </Link>
                      <button
                        onClick={async () => {
                          try {
                            setIsUserMenuOpen(false);

                            // Show loading state
                            const loadingToast = toast.loading(
                              "جاري تسجيل الخروج..."
                            );

                            // Call the logout function
                            await logout();

                            // Show success message
                            toast.success("تم تسجيل الخروج بنجاح", {
                              id: loadingToast,
                            });

                            // Navigate to home page
                            navigate("/");
                          } catch (error) {
                            console.error("Logout error:", error);

                            // Show appropriate error message
                            toast.error(
                              error.response?.data?.message ||
                                "تم تسجيل الخروج محلياً، ولكن حدث خطأ في السيرفر"
                            );
                          }
                        }}
                        className="w-full flex items-center justify-end px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 mt-1 border-t border-gray-100 gap-2"
                      >
                        <span>تسجيل خروج</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsLoginView(true);
                  }}
                  className="gap-2 px-4 py-2 text-white bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700 rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden md:inline text-sm font-medium">
                    تسجيل دخول
                  </span>
                </Button>
              )}

              {/* Notifications */}
              {isAuthenticated && <NotificationCenter />}

              {/* Wishlist */}
              <Button
                variant="ghost"
                onClick={() => setIsFavoritesModalOpen(true)}
                className="relative p-2.5 rounded-full hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors duration-300"
              >
                <Heart className="w-5 h-5" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                    {favoritesCount}
                  </span>
                )}
              </Button>

              {/* Cart */}
              <Button
                variant="ghost"
                className="relative p-2.5 rounded-full hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors duration-300"
                asChild
              >
                <Link to="/cart" className="flex items-center">
                  <ShoppingCart className="w-5 h-5" />
                  <span
                    className={`absolute -top-1 -right-1 bg-green-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center shadow-sm transition-all ${
                      cartItemsCount > 0 ? "scale-100" : "scale-0"
                    }`}
                  >
                    {cartItemsCount > 0 ? cartItemsCount : ""}
                  </span>
                </Link>
              </Button>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                className="md:hidden p-2.5 rounded-full hover:bg-gray-100 transition-colors duration-300"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5 text-gray-700" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-700" />
                )}
              </Button>
            </div>
          </div>

          {/* Search Bar - Mobile */}
          <div className="md:hidden px-4 py-3 bg-white">
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
                className="w-full pr-12 pl-4 py-2.5 text-right text-gray-700 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-300 focus:border-blue-400 focus:bg-white transition-all duration-200 shadow-sm focus:shadow-md outline-none"
              />
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
              >
                بحث
              </button>
            </div>
          </div>

          {/* Categories Navigation - Added back */}
          <div className="hidden md:flex items-center justify-center py-3 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-6 text-sm font-medium">
              {/* Wholesale Link */}
              <Link
                to="/wholesale"
                className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors duration-300 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                الجملة
              </Link>

              <Link
                to="/products?category=new"
                className="px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-300 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                وصل حديثاً
              </Link>
              {[
                "trending",
                "perfumes",
                "medicines",
                "cosmetics",
                "baby",
                "medical",
              ].map((category) => {
                const categoryNames = {
                  trending: "الأكثر مبيعاً",
                  perfumes: "العطور",
                  medicines: "الأدوية",
                  cosmetics: "التجميل",
                  baby: "الأطفال",
                  medical: "مستلزمات طبية",
                };

                return (
                  <Link
                    key={category}
                    to={`/products?category=${category}`}
                    className="px-4 py-2 rounded-full text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    {categoryNames[category]}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {/* Wholesale Mobile Link */}
              <Link
                to="/wholesale"
                className="flex items-center px-4 py-3 rounded-lg bg-amber-50 text-amber-700 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="w-2 h-2 bg-amber-500 rounded-full ml-2"></span>
                الجملة
              </Link>

              <Link
                to="/products?category=new"
                className="flex items-center px-4 py-3 rounded-lg bg-red-50 text-red-600 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="w-2 h-2 bg-red-500 rounded-full ml-2"></span>
                وصل حديثاً
              </Link>
              {[
                "trending",
                "perfumes",
                "medicines",
                "cosmetics",
                "baby",
                "medical",
              ].map((category) => {
                const categoryNames = {
                  trending: "الأكثر مبيعاً",
                  perfumes: "العطور",
                  medicines: "الأدوية",
                  cosmetics: "التجميل",
                  baby: "الأطفال",
                  medical: "مستلزمات طبية",
                };

                return (
                  <Link
                    key={category}
                    to={`/products?category=${category}`}
                    className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {categoryNames[category]}
                  </Link>
                );
              })}
              <button
                className="w-full flex items-center px-4 py-3 rounded-lg text-blue-600 hover:bg-blue-50 text-right"
                onClick={() => {
                  setIsAuthModalOpen(true);
                  setIsLoginView(true);
                  setIsMenuOpen(false);
                }}
              >
                <LogIn className="w-4 h-4 ml-2" />
                تسجيل الدخول
              </button>
              <Link
                to="/register"
                className="w-full flex items-center px-4 py-3 rounded-lg text-blue-600 hover:bg-blue-50 text-right"
                onClick={() => setIsMenuOpen(false)}
              >
                <UserPlus className="w-4 h-4 ml-2" />
                إنشاء حساب جديد
              </Link>
              <div className="flex items-center gap-2 py-2 text-gray-700">
                <MapPin className="w-4 h-4" />
                <span>التوصيل إلى {selectedCity}</span>
              </div>
              <div className="py-2 text-gray-700">
                <span>خدمة العملاء: 920000000</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Favorites Modal */}
      <InteractiveFavoritesModal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isLoginView={isLoginView}
        onSwitchView={() => setIsLoginView(!isLoginView)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default InteractiveNavbar;
