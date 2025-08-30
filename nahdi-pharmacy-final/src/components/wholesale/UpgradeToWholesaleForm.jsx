import React, { useState, useEffect, useRef } from 'react';
import { useUserAuth } from '../../context/UserAuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Info, 
  Upload, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  FileDigit,
  Building2,
  AlertCircle,
  X
} from 'lucide-react';
import wholesaleService from '../../services/wholesaleService';

// Constants
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default function UpgradeToWholesaleForm({ onSuccess, onCancel }) {
  const { user, refreshUser } = useUserAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [filePreviews, setFilePreviews] = useState({
    idDocument: null,
    commercialRegister: null
  });
  const [formData, setFormData] = useState({
    companyName: '',
    commercialRegisterNumber: '',
    taxNumber: '',
    idDocument: null,
    commercialRegister: null
  });
  const [error, setError] = useState('');

  // Status messages for different states
  const statusMessages = {
    pending: {
      icon: <Clock className="w-12 h-12 text-amber-500" />,
      title: 'طلبك قيد المراجعة',
      description: 'جاري مراجعة طلب الترقية الخاص بك. سيتم إشعارك فور الانتهاء من المراجعة.',
      buttonText: 'العودة للصفحة الرئيسية'
    },
    approved: {
      icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
      title: 'تمت الموافقة على طلبك',
      description: 'تهانينا! تمت الموافقة على طلب الترقية الخاص بك. يمكنك الآن الاستفادة من ميزات حساب الجملة.',
      buttonText: 'استعراض المنتجات'
    },
    rejected: {
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      title: 'تم رفض طلبك',
      description: 'نعتذر، لم يتم قبول طلب الترقية الخاص بك. يرجى التحقق من المستندات المقدمة والمحاولة مرة أخرى.',
      buttonText: 'إعادة المحاولة'
    }
  };

  // Check current request status
  useEffect(() => {
    const loadRequestStatus = async () => {
      try {
        console.log('🔍 جاري تحميل حالة طلب الجملة...');
        
        const request = await wholesaleService.getMyWholesaleRequest();
        
        if (request && request.status) {
          console.log('✅ حالة الطلب الحالية:', request.status);
          setVerificationStatus(request.status);
          
          if (request.status === 'rejected') {
            const rejectionReason = request.rejectionReason || 'لم يتم تحديد سبب الرفض';
            setError(`تم رفض طلبك للترقية للأسباب التالية: ${rejectionReason}`);
          }
          
          if (request.status === 'pending') {
            setCurrentStep(3);
          }
        } else {
          console.log('ℹ️ لا يوجد طلب جملة سابق');
          setVerificationStatus('not_found');
        }
      } catch (err) {
        console.error('❌ خطأ في تحميل حالة الطلب:', err);
        setVerificationStatus('not_found');
      }
    };
    
    loadRequestStatus();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      console.log('❌ فشل التحقق من صحة النموذج');
      return;
    }
    
    if (currentStep < 3) {
      nextStep();
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const loadingToast = toast.loading('جاري إرسال طلب الترقية...');
      
      // Log form data before submission
      console.log('📋 بيانات النموذج قبل الإرسال:', formData);
      
      // Create FormData object
      const formDataToSend = new FormData();
      
      // Append text fields
      formDataToSend.append('company_name', formData.companyName || '');
      formDataToSend.append('commercial_register', formData.commercialRegisterNumber || '');
      formDataToSend.append('tax_number', formData.taxNumber || '');
      
      // Append files if they exist
      if (formData.idDocument) {
        console.log('📄 إرفاق ملف الهوية:', formData.idDocument);
        formDataToSend.append('id_document', formData.idDocument);
      } else {
        console.error('❌ ملف الهوية غير موجود');
        throw new Error('الرجاء إرفاق صورة الهوية');
      }
      
      if (formData.commercialRegister) {
        console.log('📄 إرفاق ملف السجل التجاري:', formData.commercialRegister);
        formDataToSend.append('commercial_document', formData.commercialRegister);
      } else {
        console.error('❌ ملف السجل التجاري غير موجود');
        throw new Error('الرجاء إرفاق صورة السجل التجاري');
      }
      
      // Log FormData contents
      console.log('📤 محتويات FormData:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value);
      }
      
      // Send the request
      console.log('🚀 إرسال طلب الترقية...');
      const response = await wholesaleService.submitUpgradeRequest(formDataToSend);
      
      toast.dismiss(loadingToast);
      toast.success('تم إرسال طلب الترقية بنجاح! سيتم مراجعته من قبل الإدارة.');
      
      // Add notification to notification service
      try {
        const notificationService = (await import('../../services/notificationService')).default;
        notificationService.addNotification({
          type: 'wholesale_submitted',
          title: 'تم تقديم طلب ترقية حساب الجملة',
          message: 'تم تقديم طلبك بنجاح وهو الآن قيد المراجعة من قبل الإدارة',
          meta: { 
            requestId: response?.data?.id || response?.id,
            status: 'pending',
            timestamp: new Date().toISOString()
          }
        });
        console.log('✅ تم إضافة الإشعار إلى قائمة الإشعارات');
      } catch (error) {
        console.error('❌ خطأ في إضافة الإشعار:', error);
      }
      
      // Update verification status to pending to show the correct UI
      setVerificationStatus('pending');
      setCurrentStep(3);
      
      onSuccess?.();
      
    } catch (error) {
      console.error('❌ خطأ في إرسال الطلب:', error);
      
      let errorMessage = 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.';
      
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = 'بيانات غير صالحة. يرجى التحقق من المدخلات.';
          
          if (error.response.data?.errors) {
            const validationErrors = error.response.data.errors;
            const firstError = Object.values(validationErrors)[0];
            if (firstError) {
              errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
            }
          }
        } else if (error.response.status === 401) {
          errorMessage = 'يجب تسجيل الدخول أولاً';
          navigate('/login', { state: { from: '/wholesale/upgrade' } });
        } else if (error.response.status === 409) {
          errorMessage = 'لديك طلب قيد المراجعة بالفعل';
          setVerificationStatus('pending');
        } else if (error.response.status >= 500) {
          errorMessage = 'عذراً، حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.';
        }
      } else if (error.request) {
        errorMessage = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage, { duration: 5000 });
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation between steps
  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Validate current step
  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!formData.companyName.trim()) {
        toast.error('يرجى إدخال اسم الشركة');
        return false;
      }
      if (!formData.commercialRegisterNumber.trim()) {
        toast.error('يرجى إدخال رقم السجل التجاري');
        return false;
      }
      return true;
    } 
    
    if (currentStep === 2) {
      if (!formData.idDocument || (formData.idDocument instanceof File && !formData.idDocument.name)) {
        toast.error('يرجى اختيار ملف صورة الهوية');
        return false;
      }
      
      if (!formData.commercialRegister || (formData.commercialRegister instanceof File && !formData.commercialRegister.name)) {
        toast.error('يرجى اختيار ملف السجل التجاري');
        return false;
      }
      
      // Validate file types
      const validFileTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      
      if (formData.idDocument && !validFileTypes.includes(formData.idDocument.type)) {
        toast.error('نوع ملف الهوية غير مدعوم. يرجى رفع ملف بصيغة JPG أو PNG أو PDF');
        return false;
      }
      
      if (formData.commercialRegister && !validFileTypes.includes(formData.commercialRegister.type)) {
        toast.error('نوع ملف السجل التجاري غير مدعوم. يرجى رفع ملف بصيغة JPG أو PNG أو PDF');
        return false;
      }
      
      // Validate file size (2MB max)
      const maxSize = 2 * 1024 * 1024; // 2MB
      
      if (formData.idDocument && formData.idDocument.size > maxSize) {
        toast.error('حجم ملف الهوية يتجاوز الحد المسموح به (2 ميجابايت)');
        return false;
      }
      
      if (formData.commercialRegister && formData.commercialRegister.size > maxSize) {
        toast.error('حجم ملف السجل التجاري يتجاوز الحد المسموح به (2 ميجابايت)');
        return false;
      }
      
      return true;
    }
    
    return true;
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (!files?.length) {
      console.log('❌ لم يتم تحديد أي ملف');
      return;
    }

    const file = files[0];
    console.log(`📄 ملف ${name} محمل:`, file);
    
    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. يرجى رفع ملف بصيغة JPG أو PNG أو PDF');
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('حجم الملف يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('🖼️ تم تحميل معاينة الصورة');
        setFilePreviews(prev => ({
          ...prev,
          [name]: e.target.result
        }));
      };
      reader.onerror = (error) => {
        console.error('❌ خطأ في قراءة الملف:', error);
        toast.error('حدث خطأ أثناء معالجة الملف');
      };
      reader.readAsDataURL(file);
    } else {
      // For PDFs, show a document icon
      console.log('📄 ملف PDF محمل');
      setFilePreviews(prev => ({
        ...prev,
        [name]: 'document'
      }));
    }
    
    // Update form data immediately
    console.log(`🔄 تحديث حالة النموذج لحقل ${name}`);
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: file
      };
      console.log('📋 حالة النموذج المحدثة:', newData);
      return newData;
    });
    
    // Reset the file input to allow re-uploading the same file
    e.target.value = '';
    
    toast.success('تم رفع الملف بنجاح');
  };

  // Remove uploaded file
  const removeFile = (fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
    
    setFilePreviews(prev => ({
      ...prev,
      [fieldName]: null
    }));
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show status message if there's a verification status (except not_found)
  if (verificationStatus && verificationStatus !== 'not_found') {
    const status = statusMessages[verificationStatus] || statusMessages.pending;
    
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-50 mb-4">
          {status.icon}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{status.title}</h3>
        <p className="text-gray-600 mb-6">{status.description}</p>
        <Button 
          onClick={() => {
            if (verificationStatus === 'approved') {
              navigate('/wholesale');
            } else if (verificationStatus === 'rejected') {
              setVerificationStatus('not_found');
              setCurrentStep(1);
            } else {
              onCancel?.();
            }
          }}
        >
          {status.buttonText}
        </Button>
      </div>
    );
  }

  // Render the form steps
  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm">
      {/* Form steps indicator */}
      <div className="relative mb-10">
        <div className="absolute top-1/2 right-0 left-0 h-1 bg-gray-100 -translate-y-1/2"></div>
        <div className="relative z-10 flex justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex flex-col items-center bg-white px-2">
              <div 
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  currentStep >= step 
                    ? 'border-primary bg-primary text-white' 
                    : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {currentStep > step ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <span className="text-lg font-medium">{step}</span>
                )}
              </div>
              <span className={`mt-3 text-sm font-medium ${
                currentStep >= step ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {step === 1 ? 'معلومات الشركة' : step === 2 ? 'المستندات' : 'المراجعة'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Company Information */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <Building2 className="ml-2 h-5 w-5 text-primary" />
              معلومات الشركة
            </h3>
            
            <div className="space-y-5">
              <div>
                <Label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  اسم الشركة <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="أدخل اسم الشركة"
                    className="h-12 text-base pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="commercialRegisterNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
                  رقم السجل التجاري <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="commercialRegisterNumber"
                    name="commercialRegisterNumber"
                    value={formData.commercialRegisterNumber}
                    onChange={(e) => setFormData({...formData, commercialRegisterNumber: e.target.value})}
                    placeholder="أدخل رقم السجل التجاري"
                    className="h-12 text-base pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <FileDigit className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="taxNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
                  الرقم الضريبي (اختياري)
                </Label>
                <div className="relative">
                  <Input
                    id="taxNumber"
                    name="taxNumber"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                    placeholder="أدخل الرقم الضريبي"
                    className="h-12 text-base pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 ml-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">معلومات إضافية</h4>
                <p className="mt-1 text-sm text-blue-700">
                  يرجى التأكد من صحة المعلومات المدخلة حيث سيتم استخدامها للتحقق من هويتك.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Documents */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <FileText className="ml-2 h-5 w-5 text-primary" />
              المستندات المطلوبة
            </h3>
            
            <div className="space-y-6">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  صورة الهوية <span className="text-red-500">*</span>
                </Label>
                <div className="mt-1">
                  <label
                    htmlFor="idDocument"
                    className={`cursor-pointer group relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-all duration-200 ${
                      filePreviews.idDocument 
                        ? 'border-green-100 bg-green-50' 
                        : 'border-gray-300 bg-white hover:border-primary hover:bg-gray-50'
                    }`}
                  >
                    {filePreviews.idDocument ? (
                      filePreviews.idDocument === 'document' ? (
                        <div className="flex flex-col items-center">
                          <FileText className="h-14 w-14 text-green-500 mb-3" />
                          <span className="text-sm font-medium text-green-700">تم رفع الملف بنجاح</span>
                        </div>
                      ) : (
                        <div className="relative group">
                          <img 
                            src={filePreviews.idDocument} 
                            alt="معاينة الهوية" 
                            className="h-40 w-auto object-contain rounded border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-700 shadow-sm">تغيير الملف</span>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-50 text-blue-500 mb-3">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-blue-600">انقر للرفع</span> أو اسحب الملف هنا
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          JPG, PNG أو PDF (الحد الأقصى 2 ميجابايت)
                        </p>
                      </div>
                    )}
                    <input
                      id="idDocument"
                      name="idDocument"
                      type="file"
                      className="sr-only"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                  </label>
                </div>
                {formData.idDocument && (
                  <div className="mt-3 flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 ml-2" />
                      <span className="text-sm text-gray-600 truncate max-w-xs">
                        {formData.idDocument.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('idDocument')}
                      className="text-red-500 hover:text-red-700 p-1 -mr-2"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  صورة السجل التجاري <span className="text-red-500">*</span>
                </Label>
                <div className="mt-1">
                  <label
                    htmlFor="commercialRegister"
                    className={`cursor-pointer group relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-all duration-200 ${
                      filePreviews.commercialRegister 
                        ? 'border-green-100 bg-green-50' 
                        : 'border-gray-300 bg-white hover:border-primary hover:bg-gray-50'
                    }`}
                  >
                    {filePreviews.commercialRegister ? (
                      filePreviews.commercialRegister === 'document' ? (
                        <div className="flex flex-col items-center">
                          <FileText className="h-14 w-14 text-green-500 mb-3" />
                          <span className="text-sm font-medium text-green-700">تم رفع الملف بنجاح</span>
                        </div>
                      ) : (
                        <div className="relative group">
                          <img 
                            src={filePreviews.commercialRegister} 
                            alt="معاينة السجل التجاري" 
                            className="h-40 w-auto object-contain rounded border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-700 shadow-sm">تغيير الملف</span>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-50 text-blue-500 mb-3">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-blue-600">انقر للرفع</span> أو اسحب الملف هنا
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          JPG, PNG أو PDF (الحد الأقصى 2 ميجابايت)
                        </p>
                      </div>
                    )}
                    <input
                      id="commercialRegister"
                      name="commercialRegister"
                      type="file"
                      className="sr-only"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                {formData.commercialRegister && (
                  <div className="mt-3 flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 ml-2" />
                      <span className="text-sm text-gray-600 truncate max-w-xs">
                        {formData.commercialRegister.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('commercialRegister')}
                      className="text-red-500 hover:text-red-700 p-1 -mr-2"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 ml-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">ملاحظات هامة</h4>
                <ul className="space-y-1.5 text-sm text-blue-700">
                  <li className="flex items-start">
                    <span className="ml-2">•</span>
                    <span>يجب أن تكون المستندات المرفوعة واضحة ومقروءة</span>
                  </li>
                  <li className="flex items-start">
                    <span className="ml-2">•</span>
                    <span>يجب أن تكون الصور بصيغة JPG أو PNG أو PDF</span>
                  </li>
                  <li className="flex items-start">
                    <span className="ml-2">•</span>
                    <span>الحد الأقصى لحجم الملف 2 ميجابايت</span>
                  </li>
                  <li className="flex items-start">
                    <span className="ml-2">•</span>
                    <span>سيتم مراجعة طلبك خلال 24-48 ساعة</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <CheckCircle2 className="ml-2 h-5 w-5 text-green-500" />
              تأكيد المعلومات
            </h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">معلومات الشركة</h4>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">اسم الشركة</span>
                    <span className="text-sm font-medium text-gray-900 text-left">{formData.companyName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">رقم السجل التجاري</span>
                    <span className="text-sm font-medium text-gray-900">{formData.commercialRegisterNumber}</span>
                  </div>
                  {formData.taxNumber && (
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">الرقم الضريبي</span>
                      <span className="text-sm font-medium text-gray-900">{formData.taxNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">المستندات المرفقة</h4>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">صورة الهوية</h5>
                    {filePreviews.idDocument ? (
                      <div className="flex items-center justify-center bg-white p-4 rounded border border-gray-200">
                        {filePreviews.idDocument === 'document' ? (
                          <div className="flex flex-col items-center">
                            <FileText className="h-12 w-12 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">تم رفع الملف</span>
                          </div>
                        ) : (
                          <img 
                            src={filePreviews.idDocument} 
                            alt="معاينة الهوية" 
                            className="max-h-40 w-auto object-contain rounded"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-red-50 rounded border border-red-100">
                        <XCircle className="h-6 w-6 text-red-400 mx-auto mb-1" />
                        <p className="text-sm text-red-600">لم يتم رفع صورة الهوية</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">صورة السجل التجاري</h5>
                    {filePreviews.commercialRegister ? (
                      <div className="flex items-center justify-center bg-white p-4 rounded border border-gray-200">
                        {filePreviews.commercialRegister === 'document' ? (
                          <div className="flex flex-col items-center">
                            <FileText className="h-12 w-12 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">تم رفع الملف</span>
                          </div>
                        ) : (
                          <img 
                            src={filePreviews.commercialRegister} 
                            alt="معاينة السجل التجاري" 
                            className="max-h-40 w-auto object-contain rounded"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-red-50 rounded border border-red-100">
                        <XCircle className="h-6 w-6 text-red-400 mx-auto mb-1" />
                        <p className="text-sm text-red-600">لم يتم رفع صورة السجل التجاري</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 ml-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">ماذا يحدث بعد إرسال الطلب؟</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium ml-2 flex-shrink-0">1</span>
                    <span>سيتم مراجعة طلبك من قبل إدارة الموقع</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium ml-2 flex-shrink-0">2</span>
                    <span>سيتم إخطارك عبر البريد الإلكتروني بقرار الموافقة أو الرفض</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium ml-2 flex-shrink-0">3</span>
                    <span>في حالة الموافقة، سيتم تفعيل حساب الجملة الخاص بك تلقائياً</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
            <input
              id="terms"
              type="checkbox"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              required
            />
            <label htmlFor="terms" className="mr-2 block text-sm text-gray-700">
              أوافق على <a href="/terms" className="text-primary hover:underline">الشروط والأحكام</a> وسياسة الخصوصية
            </label>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-8 mt-6 border-t border-gray-200">
        <div className="flex-1">
          {currentStep === 1 ? (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="w-full sm:w-auto px-6 h-11 text-gray-700 hover:bg-gray-50 border-gray-300"
            >
              إلغاء الطلب
            </Button>
          ) : (
            <Button 
              type="button" 
              variant="outline" 
              onClick={prevStep}
              className="w-full sm:w-auto px-6 h-11 text-gray-700 hover:bg-gray-50 border-gray-300"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              <span>العودة للخلف</span>
            </Button>
          )}
        </div>
        
        <div className="flex-1 text-left sm:text-right">
          {currentStep < 3 ? (
            <Button 
              type="button" 
              onClick={nextStep}
              className="w-full sm:w-auto px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
            >
              <span>التالي</span>
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 h-11 bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري إرسال الطلب...
                </span>
              ) : (
                <span className="flex items-center">
                  <span>تأكيد وإرسال الطلب</span>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
