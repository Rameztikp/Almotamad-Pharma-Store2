import React, { useState } from 'react';
import { FaTimes, FaUserTie, FaBuilding, FaEnvelope, FaPhone, FaIdCard, FaMapMarkerAlt, FaInfoCircle } from 'react-icons/fa';

const CreateWholesaleAccountModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    taxNumber: '',
    commercialRegistration: '',
    address: '',
    city: '',
    notes: ''
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep < 2) {
      setCurrentStep(2);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error creating account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">إنشاء حساب جملة جديد</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 pt-4">
          <div className="flex items-center">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                1
              </div>
              <div className="text-sm mr-2">معلومات الحساب</div>
            </div>
            <div className={`flex-1 h-1 mx-2 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                2
              </div>
              <div className="text-sm mr-2">المعلومات المالية</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 mb-4 flex items-center">
                <FaInfoCircle className="ml-2" />
                المعلومات الأساسية
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaBuilding className="ml-1" />
                    اسم الشركة <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    required
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.companyName}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaUserTie className="ml-1" />
                    اسم المسؤول <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    required
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.contactPerson}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaEnvelope className="ml-1" />
                    البريد الإلكتروني <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaPhone className="ml-1" />
                    رقم الجوال <span className="text-red-500 mr-1">*</span>
                  </label>
                  <div className="flex">
                    <select 
                      className="bg-gray-100 border border-r-0 rounded-r-none rounded-l-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>+966</option>
                      <option>+20</option>
                      <option>+971</option>
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      required
                      className="flex-1 p-2 border rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="5xxxxxxxx"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <h4 className="font-medium text-gray-700 mb-4 flex items-center">
                  <FaMapMarkerAlt className="ml-2" />
                  العنوان
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المدينة <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="city"
                      required
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.city}
                      onChange={handleChange}
                    >
                      <option value="">اختر المدينة</option>
                      <option value="الرياض">الرياض</option>
                      <option value="جدة">جدة</option>
                      <option value="الدمام">الدمام</option>
                      <option value="مكة المكرمة">مكة المكرمة</option>
                      <option value="المدينة المنورة">المدينة المنورة</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      العنوان التفصيلي
                    </label>
                    <textarea
                      name="address"
                      rows="2"
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.address}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-700 mb-4 flex items-center">
                <FaIdCard className="ml-2" />
                المستندات والمعلومات المالية
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    السجل التجاري <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="commercialRegistration"
                    required
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.commercialRegistration}
                    onChange={handleChange}
                    placeholder="رقم السجل التجاري"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    يرجى إرفاق صورة من السجل التجاري
                  </p>
                  <div className="mt-2">
                    <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      رفع الملف
                      <input type="file" className="hidden" accept="image/*,.pdf" />
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الرقم الضريبي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="taxNumber"
                    required
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.taxNumber}
                    onChange={handleChange}
                    placeholder="الرقم الضريبي"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    الرقم الضريبي المكون من 15 رقم
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    شهادة السجل الضريبي
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="tax-certificate"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>ارفع ملف</span>
                          <input id="tax-certificate" name="tax-certificate" type="file" className="sr-only" accept="image/*,.pdf" />
                        </label>
                        <p className="pr-1">أو اسحب وأفلت</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, PDF حتى 10 ميجابايت
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات إضافية
                </label>
                <textarea
                  name="notes"
                  rows="3"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="أي ملاحظات إضافية حول الحساب..."
                ></textarea>
              </div>
              
              <div className="flex items-center p-4 bg-blue-50 rounded-md">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="mr-2 block text-sm text-gray-700">
                  أوافق على الشروط والأحكام وسياسة الخصوصية
                </label>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex justify-between pt-4 border-t">
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                إلغاء
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                السابق
              </button>
            )}
            
            <div className="flex space-x-3 space-x-reverse">
              {currentStep < 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  التالي
                </button>
              )}
              
              {currentStep === 2 && (
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري الحفظ...
                    </>
                  ) : 'إنشاء الحساب'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWholesaleAccountModal;
