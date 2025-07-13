import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { authService } from '@/services/authService'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Phone, 
  User, 
  Upload,
  FileText,
  Building2,
  Users
} from 'lucide-react'

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [accountType, setAccountType] = useState(searchParams.get('type') || 'retail')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    // Wholesale specific fields
    companyName: '',
    commercialRegister: '',
    idDocument: null,
    commercialDocument: null
  })

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: files[0]
    }))
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error('كلمات المرور غير متطابقة')
      return false
    }
    
    if (!formData.agreeToTerms) {
      toast.error('يجب الموافقة على الشروط والأحكام')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      // Show loading state
      const loadingToast = toast.loading('جاري إنشاء الحساب...')
      
      // Prepare user data for registration
      const userData = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        account_type: accountType,
        // Add wholesale specific fields if needed
        ...(accountType === 'wholesale' && {
          company_name: formData.companyName,
          commercial_register: formData.commercialRegister,
          tax_number: formData.taxNumber,
          company_phone: formData.companyPhone,
          company_address: formData.companyAddress,
          // Note: File uploads need to be handled separately
          // as they require FormData and proper content-type headers
        })
      }
      
      // Call the auth service with user data
      const response = await authService.register(userData)
      
      // On success
      toast.dismiss(loadingToast)
      toast.success('تم إنشاء الحساب بنجاح!', {
        duration: 1500,
        position: 'top-center',
        onClose: () => {
          // Navigate to home page with state to open auth modal
          navigate('/', { 
            state: { 
              showAuthModal: true,
              isLoginView: true
            },
            replace: true
          });
        },
        style: {
          backgroundColor: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          padding: '16px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '16px',
          maxWidth: '100%'
        },
        icon: '✅'
      })
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login')
      }, 2000)
      
    } catch (error) {
      console.error('Registration error:', error)
      toast.dismiss()
      
      // Extract error message from different possible error response formats
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.'
      
      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-center',
        style: {
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          padding: '16px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '16px',
          maxWidth: '100%'
        },
        icon: '❌'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-2xl mb-6 inline-block">
            المعتمد فارما
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            إنشاء حساب جديد
          </h2>
          <p className="text-gray-600">
            انضم إلى عائلة المعتمد فارما واستمتع بتجربة تسوق مميزة
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">التسجيل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Type Toggle */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">نوع الحساب</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setAccountType('retail')}
                  className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                    accountType === 'retail'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      accountType === 'retail'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {accountType === 'retail' && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <User className="w-5 h-5 ml-2 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">عميل قطاعي</h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        للأفراد والعائلات - منتجات التجميل والعطور والأدوية العامة
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setAccountType('wholesale')}
                  className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                    accountType === 'wholesale'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      accountType === 'wholesale'
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {accountType === 'wholesale' && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 ml-2 text-green-600" />
                        <h4 className="font-semibold text-gray-900">عميل جملة</h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        للصيدليات والشركات - أسعار خاصة وكميات كبيرة
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">المعلومات الأساسية</h4>
                
                {/* Full Name */}
                <div>
                  <div className="mb-4">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل
                </label>
                <div className="relative">
                  <Input
                    id="fullName"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="أدخل الاسم الكامل"
                    className="pr-10"
                    required
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
                </div>

                {/* Email */}
                <div>
                  <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="أدخل البريد الإلكتروني"
                    className="pr-10"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
                </div>

                {/* Phone */}
                <div>
                  <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الجوال
                </label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="أدخل رقم الجوال"
                    className="pr-10"
                    required
                  />
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="أدخل كلمة المرور"
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="أعد إدخال كلمة المرور"
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                    aria-label={showConfirmPassword ? 'إخفاء تأكيد كلمة المرور' : 'إظهار تأكيد كلمة المرور'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
                </div>
              </div>

              {/* Wholesale Specific Fields */}
              {accountType === 'wholesale' && (
                <div className="space-y-4 border-t pt-6">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Building2 className="w-5 h-5 ml-2 text-green-600" />
                    معلومات الشركة
                  </h4>
                  
                  {/* Company Name */}
                  <div>
                    <div className="mb-4">
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الشركة / الصيدلية
                  </label>
                  <div className="relative">
                    <Input
                      id="companyName"
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="أدخل اسم الشركة أو الصيدلية"
                      className="pr-10"
                      required={accountType === 'wholesale'}
                    />
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                  </div>

                  {/* Commercial Register */}
                  <div>
                    <div className="mb-4">
                  <label htmlFor="commercialRegister" className="block text-sm font-medium text-gray-700 mb-1">
                    رقم السجل التجاري
                  </label>
                  <div className="relative">
                    <Input
                      id="commercialRegister"
                      type="text"
                      name="commercialRegister"
                      value={formData.commercialRegister}
                      onChange={handleInputChange}
                      placeholder="أدخل رقم السجل التجاري"
                      className="pr-10"
                      required={accountType === 'wholesale'}
                    />
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                  </div>

                  {/* Document Uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ID Document */}
                    <div>
                      <div className="mb-4">
                    <label htmlFor="idDocument" className="block text-sm font-medium text-gray-700 mb-1">
                      صورة الهوية
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        name="idDocument"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="hidden"
                        id="idDocument"
                        required={accountType === 'wholesale'}
                      />
                      <label htmlFor="idDocument" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {formData.idDocument ? formData.idDocument.name : 'اختر ملف الهوية'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, PDF حتى 5MB
                        </p>
                      </label>
                    </div>
                  </div>
                    </div>

                    {/* Commercial Document */}
                    <div>
                      <div className="mb-4">
                    <label htmlFor="commercialDocument" className="block text-sm font-medium text-gray-700 mb-1">
                      صورة السجل التجاري
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        name="commercialDocument"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="hidden"
                        id="commercialDocument"
                        required={accountType === 'wholesale'}
                      />
                      <label htmlFor="commercialDocument" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {formData.commercialDocument ? formData.commercialDocument.name : 'اختر ملف السجل التجاري'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, PDF حتى 5MB
                        </p>
                      </label>
                    </div>
                  </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>ملاحظة:</strong> سيتم مراجعة طلبك خلال 24-48 ساعة عمل. 
                      ستتلقى إشعاراً عبر البريد الإلكتروني عند الموافقة على حسابك.
                    </p>
                  </div>
                </div>
              )}

              {/* Terms Agreement */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="agreeToTerms"
                    name="agreeToTerms"
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    required
                  />
                </div>
                <label htmlFor="agreeToTerms" className="mr-2 block text-sm text-gray-700">
                  أوافق على <a href="/terms" className="text-blue-600 hover:text-blue-500">الشروط والأحكام</a> و <a href="/privacy" className="text-blue-600 hover:text-blue-500">سياسة الخصوصية</a>
                </label>
              </div>

              {/* Register Button */}
              <Button
                type="submit"
                className={`w-full py-3 ${
                  accountType === 'wholesale'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {accountType === 'wholesale' ? 'إرسال طلب التسجيل' : 'إنشاء الحساب'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">أو</span>
              </div>
            </div>

            {/* Google Register */}
            <Button
              type="button"
              variant="outline"
              className="w-full py-3 border-gray-300 hover:bg-gray-50"
            >
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 ml-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                التسجيل باستخدام Google
              </div>
            </Button>

            {/* Login Link */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                لديك حساب بالفعل؟{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  تسجيل الدخول
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default RegisterPage;


