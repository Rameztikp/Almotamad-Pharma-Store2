import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/authService';
import { useUserAuth } from '@/context/UserAuthContext';
import { Eye, EyeOff, Mail, Lock, Phone, User, AlertCircle, LogIn, Calendar } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { refreshUser } = useUserAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    agreeToTerms: false,
  });

  // Validate form whenever form data changes
  useEffect(() => {
    const newErrors = {};
    
    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'الاسم الكامل مطلوب';
    }
    
    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }
    
    // Validate phone (Yemeni format)
    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الجوال مطلوب';
    } else if (!/^[7]\d{8}$/.test(formData.phone.trim())) {
      newErrors.phone = 'يجب إدخال رقم يمني صحيح (9 أرقام تبدأ بـ 7)';
    }
    
    // Validate password
    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = 'كلمة المرور يجب أن تحتوي على:';
      }
    }
    
    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }
    
    // Validate birth date
    if (!formData.birthDate) {
      newErrors.birthDate = 'تاريخ الميلاد مطلوب';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const minAgeDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
      
      if (birthDate > minAgeDate) {
        newErrors.birthDate = 'يجب أن يكون عمرك 13 عاماً على الأقل';
      }
    }
    
    // Validate terms agreement
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'يجب الموافقة على الشروط والأحكام';
    }
    
    setErrors(newErrors);
    
    // Check if form is valid (all fields filled and no errors)
    const isFormFilled = 
      formData.fullName.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.password !== '' &&
      formData.confirmPassword !== '' &&
      formData.agreeToTerms;
      
    setIsFormValid(isFormFilled && Object.keys(newErrors).length === 0);
  }, [formData]);

  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumbers: false,
    hasSpecialChar: false,
  });

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?\":{}|<>]/.test(password);
    
    const isValid = minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    
    setPasswordRequirements({
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
    });
    
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid,
    };
  };

  // Validate password on change
  useEffect(() => {
    if (formData.password) {
      validatePassword(formData.password);
    }
  }, [formData.password]);

  const validateForm = () => {
    // The form is already validated in the useEffect
    // Just check if there are no errors and all required fields are filled
    const isFormFilled = 
      formData.fullName.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.password !== '' &&
      formData.confirmPassword !== '' &&
      formData.agreeToTerms;
      
    return isFormValid && isFormFilled;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    if (!validateForm()) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة', {
        position: 'top-center',
        duration: 3000,
      });
      return;
    }
    
    setIsLoading(true);
    const loadingToast = toast.loading('جاري إنشاء الحساب...', {
      position: 'top-center',
    });
    
    try {
      const userData = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim().replace(/[^0-9]/g, ''),
        password: formData.password,
        date_of_birth: formData.birthDate,
      };
      
      console.log('Submitting registration with:', userData);
      // تسجيل المستخدم
      const response = await authService.register(userData);
      
      // تحديث حالة المستخدم في السياق
      if (response.user) {
        await refreshUser();
      }
      
      toast.dismiss(loadingToast);
      toast.success('تم إنشاء الحساب بنجاح! جاري التوجيه...', {
        position: 'top-center',
        duration: 2000,
      });
      
      // إعادة تعيين النموذج
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        birthDate: '',
        agreeToTerms: false,
      });
      
      // Redirect after delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.dismiss(loadingToast);
      
      let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
      let fieldToFocus = null;
      
      if (error?.response) {
        const errorData = error.response.data || {};
        console.log('Error response data:', errorData); // Debug log
        
        // Use the error message from the error object first (which comes from authService)
        if (error.message) {
          errorMessage = error.message;
        }
        
        if (error.response.status === 409) {
          const errorMessageText = errorData.message || error.message || '';
          console.log('Error message text:', errorMessageText); // Debug log
          
          if (errorMessageText.includes('البريد الإلكتروني') || 
              errorMessageText.includes('email') || 
              errorMessageText.includes('مستخدم من قبل')) {
            errorMessage = 'البريد الإلكتروني مسجل مسبقاً. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول.';
            fieldToFocus = 'email';
          } else if (errorMessageText.includes('رقم الجوال') || 
                    errorMessageText.includes('الهاتف') || 
                    errorMessageText.includes('phone')) {
            errorMessage = 'رقم الجوال مسجل مسبقاً. يرجى استخدام رقم آخر أو تسجيل الدخول.';
            fieldToFocus = 'phone';
          } else if (!errorMessage) {
            errorMessage = 'هذا الحساب مسجل مسبقاً. يرجى تسجيل الدخول أو استعادة كلمة المرور إذا نسيتها.';
            fieldToFocus = 'email';
          }
          
          // Clear the problematic field
          if (fieldToFocus) {
            setFormData(prev => ({
              ...prev,
              [fieldToFocus]: ''
            }));
          }
          
        } else if (error.response.status === 400) {
          // Handle validation errors
          if (errorData.errors) {
            const firstError = errorData.errors[0];
            if (firstError) {
              errorMessage = firstError.msg || firstError.message || 'بيانات غير صالحة';
              fieldToFocus = firstError.param;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Log the error for debugging
      console.log('Showing error message:', errorMessage);
      
      // Show error message with more visible styling
      toast.error(errorMessage, {
        position: 'top-center',
        duration: 10000, // Show for 10 seconds
        style: {
          background: '#FEE2E2',
          color: '#B91C1C',
          border: '2px solid #FCA5A5',
          padding: '16px 24px',
          borderRadius: '8px',
          textAlign: 'right',
          direction: 'rtl',
          maxWidth: '90%',
          margin: '0 auto',
          fontSize: '1.1rem',
          fontWeight: '500',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: 9999
        },
        icon: '❌',
        iconTheme: {
          primary: '#B91C1C',
          secondary: '#fff',
        },
      });
      
      // Focus on the problematic field
      if (fieldToFocus) {
        const input = document.getElementById(fieldToFocus);
        if (input) {
          setTimeout(() => {
            input.focus();
          }, 100);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      // TODO: Implement Google OAuth integration
      // This is a placeholder for the actual Google OAuth implementation
      toast.loading('جاري التوجيه إلى صفحة تسجيل الدخل بحساب Google...');
      // window.location.href = '/api/auth/google';
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('حدث خطأ أثناء محاولة تسجيل الدخول بحساب Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">إنشاء حساب جديد</h1>
          <p className="mt-2 text-gray-600">
            انضم إلى صيدلية المعتمد واستمتع بتجربة تسوق مميزة
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl">تسجيل حساب جديد</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="أدخل الاسم الكامل"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className={`pr-10 ${errors.fullName ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="أدخل البريد الإلكتروني"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`pr-10 ${errors.email ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الجوال</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="7xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setFormData({...formData, phone: value});
                    }}
                    className={`pr-10 ${errors.phone ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <Label htmlFor="birthDate">تاريخ الميلاد</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                    className={`pr-10 ${errors.birthDate ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {errors.birthDate && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1" />
                    {errors.birthDate}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.password && (
                  <div className="text-sm text-red-500 space-y-1 mt-1">
                    <p className="flex items-center">
                      <AlertCircle className="h-4 w-4 ml-1 flex-shrink-0" />
                      {errors.password}
                    </p>
                    <ul className="list-disc pr-5 space-y-1">
                      <li className={passwordRequirements.minLength ? 'text-green-500' : ''}>
                        {passwordRequirements.minLength ? '✓ ' : '• '}8 أحرف على الأقل
                      </li>
                      <li className={passwordRequirements.hasUpperCase ? 'text-green-500' : ''}>
                        {passwordRequirements.hasUpperCase ? '✓ ' : '• '}حرف كبير واحد على الأقل
                      </li>
                      <li className={passwordRequirements.hasLowerCase ? 'text-green-500' : ''}>
                        {passwordRequirements.hasLowerCase ? '✓ ' : '• '}حرف صغير واحد على الأقل
                      </li>
                      <li className={passwordRequirements.hasNumbers ? 'text-green-500' : ''}>
                        {passwordRequirements.hasNumbers ? '✓ ' : '• '}رقم واحد على الأقل
                      </li>
                      <li className={passwordRequirements.hasSpecialChar ? 'text-green-500' : ''}>
                        {passwordRequirements.hasSpecialChar ? '✓ ' : '• '}رمز خاص واحد على الأقل
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="أعد إدخال كلمة المرور"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 ml-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2 rtl:space-x-reverse">
                <div className="flex items-center h-5">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => setFormData({...formData, agreeToTerms: !!checked})}
                    className={errors.agreeToTerms ? 'border-red-500' : ''}
                    disabled={isLoading}
                  />
                </div>
                <div className="text-sm">
                  <label
                    htmlFor="terms"
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    أوافق على{' '}
                    <a href="/terms" className="text-blue-600 hover:underline">
                      الشروط والأحكام
                    </a>{' '}
                    و{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline">
                      سياسة الخصوصية
                    </a>
                  </label>
                  {errors.agreeToTerms && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 ml-1" />
                      {errors.agreeToTerms}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-base"
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري إنشاء الحساب...
                  </span>
                ) : (
                  'إنشاء الحساب'
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">أو</span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-gray-300 hover:bg-gray-50"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري التحميل...
                  </span>
                ) : (
                  <>
                    <FcGoogle className="h-5 w-5" />
                    <span>التسجيل بحساب Google</span>
                  </>
                )}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex justify-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                تسجيل الدخول
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
