import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, LogIn, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'react-hot-toast';
import { useUserAuth } from '../context/UserAuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleLoginMethod = () => {
    setLoginMethod(prev => prev === 'email' ? 'phone' : 'email');
    setError('');
    // Clear the other field when toggling
    setFormData(prev => ({
      ...prev,
      email: '',
      phone: ''
    }));
  };

  const { login } = useUserAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Prepare login data based on the selected method
      const identifier = loginMethod === 'email' ? formData.email : formData.phone;
      
      if (!identifier || !formData.password) {
        throw new Error('الرجاء إدخال جميع الحقول المطلوبة');
      }
      
      // Call the login function from UserAuthContext
      const result = await login(identifier, formData.password);
      
      if (result.success) {
        // Store remember me preference
        if (formData.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }
        
        // Show success message
        toast.success('تم تسجيل الدخول بنجاح');
        
        // Call the success handler if provided
        if (onAuthSuccess) {
          onAuthSuccess();
        }
        
        // Close the modal
        onClose();
        
        // Get the redirect path with priority:
        // 1. From location state (for protected routes)
        // 2. From URL search params (for direct login with ?redirect=)
        // 3. Default to home page
        const searchParams = new URLSearchParams(location.search);
        const redirectPath = 
          location.state?.from?.pathname || 
          searchParams.get('redirect') || 
          '/';
          
        // Use replace: true to prevent going back to login page
        navigate(redirectPath, { replace: true });
      } else {
        throw new Error(result.message || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      console.error('Auth error details:', {
        name: err.name,
        message: err.message,
        response: err.response,
        stack: err.stack
      });
      
      const errorMessage = err.message || 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 transition-all duration-300 transform ${isOpen ? 'scale-100' : 'scale-95'} rtl">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="إغلاق النافذة"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isLogin 
              ? 'أدخل بيانات الدخول للوصول إلى حسابك' 
              : 'أنشئ حسابك الجديد'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Login Method Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden mb-4">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                loginMethod === 'email'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Mail className="w-4 h-4 inline ml-2" />
              البريد الإلكتروني
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                loginMethod === 'phone'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Phone className="w-4 h-4 inline ml-2" />
              رقم الجوال
            </button>
          </div>

          {/* Email/Phone Input */}
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
              {loginMethod === 'email' ? (
                <Mail className="h-5 w-5" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
            </div>
            <input
              type={loginMethod === 'email' ? 'email' : 'tel'}
              name={loginMethod === 'email' ? 'email' : 'phone'}
              value={loginMethod === 'email' ? formData.email : formData.phone}
              onChange={handleChange}
              placeholder={loginMethod === 'email' ? 'البريد الإلكتروني' : 'رقم الجوال'}
              className="w-full pr-11 pl-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 focus:bg-white focus:border-transparent hover:border-gray-300"
              required
              autoComplete={loginMethod === 'email' ? 'username' : 'tel'}
              dir="rtl"
            />
          </div>
          
          {/* Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="كلمة المرور"
              className="w-full pr-11 pl-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 focus:bg-white focus:border-transparent hover:border-gray-300"
              required
              minLength={6}
              autoComplete="current-password"
              dir="rtl"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="rememberMe" className="mr-2 block text-sm text-gray-700">
                تذكرني
              </label>
            </div>
            <Link 
              to="/forgot-password" 
              className="text-sm text-blue-600 hover:text-blue-500"
              onClick={onClose}
            >
              نسيت كلمة المرور؟
            </Link>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isLogin ? 'جاري تسجيل الدخول...' : 'جاري إنشاء الحساب...'}
              </>
            ) : (
              <>
                <LogIn className="ml-2 h-4 w-4" />
                {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </>
            )}
          </button>

          <div className="text-center text-sm text-gray-500 mt-4">
            {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
            <Link
              to={isLogin ? '/register' : '/login'}
              onClick={onClose}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </Link>
          </div>
        </form>

        {/* Wholesale Account Link */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2 text-center">
              هل أنت عميل جملة؟
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              احصل على أسعار خاصة وخدمات مخصصة لعملاء الجملة
            </p>
                            <Link 
                              to="/register?type=wholesale" 
                              className="flex items-center justify-center w-full max-w-[200px] mx-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-md shadow-sm transition-colors duration-200 border border-blue-100 hover:border-blue-200"
                              onClick={onClose}
                            >
                              تسجيل حساب جملة
                </Link>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
