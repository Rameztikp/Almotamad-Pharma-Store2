import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, Save, Edit, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useUserAuth } from '../context/UserAuthContext';
import { authService } from '../services/authService';
import { customerService } from '../services/customerService';
import { toast } from 'react-hot-toast';

const MyAccount = () => {
  const { user, setUser } = useUserAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const didTryAutosaveAddress = useRef(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    street: '',
    birthDate: ''
  });

  // Helpers
  const toDateInput = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  const extractBirthDate = (obj = {}) => {
    const cand = obj.birth_date || obj.date_of_birth || obj.birthDate || obj.dob;
    return toDateInput(cand);
  };

  // Address helpers
  const parseAddressParts = (addr = '') => {
    if (!addr || typeof addr !== 'string') return { city: '', district: '', street: '' };
    // Split by multiple common separators: Arabic comma، comma, hyphen, pipe, slash, newline
    const parts = addr
      .split(/\s*[،,\-|/\n]+\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    const [city = '', district = '', street = ''] = parts;
    return { city, district, street };
  };

  const composeAddress = (data) => {
    const segs = [data.city, data.district, data.street]
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);
    return segs.join('، ');
  };

  const findShippingAddressFromLocalStorage = () => {
    // Read user from scoped client key; keep legacy fallback for compatibility
    const currentUserRaw = localStorage.getItem('client_user_data') || localStorage.getItem('userData');
    let currentUserId = undefined;
    try { currentUserId = currentUserRaw ? JSON.parse(currentUserRaw)?.id : undefined; } catch (_) {}
    // Only look into scoped keys, avoid generic 'address' to prevent cross-account leakage
    const keys = [
      `last_shipping_address_${currentUserId || ''}`,
      `shipping_address_${currentUserId || ''}`,
      `checkout_shipping_address_${currentUserId || ''}`,
      `customer_shipping_address_${currentUserId || ''}`,
      'last_shipping_address',
      'shipping_address',
      'checkout_shipping_address',
      'customer_shipping_address',
    ];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        // could be a string or JSON
        if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
          const obj = JSON.parse(raw);
          // try common fields
          const composed = obj.full_address || obj.fullAddress || obj.address;
          if (typeof composed === 'string' && composed.trim()) return composed.trim();
          const parts = [
            obj.address_line1 || obj.addressLine1 || obj.line1 || obj.street || obj.street_ar,
            obj.address_line2 || obj.addressLine2 || obj.line2 || obj.apartment || obj.unit,
            obj.district || obj.neighborhood || obj.area,
            obj.city,
            obj.state || obj.region,
            obj.postal_code || obj.postalCode,
            obj.country,
          ]
            .map((p) => (typeof p === 'string' ? p.trim() : ''))
            .filter(Boolean);
          if (parts.length) return parts.join('، ');
        } else if (raw && raw.trim()) {
          return raw.trim();
        }
      } catch (_) {}
    }
    return '';
  };

  // Function to refresh user data
  const refreshUserData = async () => {
    try {
      console.log('🔄 جاري تحديث بيانات المستخدم...');
      const userProfile = await authService.getProfile();
      
      if (userProfile) {
        // Extract full name with proper priority
        const fullName = userProfile.full_name || 
                       userProfile.name ||
                       (userProfile.firstName && userProfile.lastName ? `${userProfile.firstName} ${userProfile.lastName}` : null) ||
                       (userProfile.first_name && userProfile.last_name ? `${userProfile.first_name} ${userProfile.last_name}` : null) ||
                       'مستخدم';
        
        // Check if wholesale status has changed
        const wasWholesale = user?.wholesale_access || user?.accountType === 'wholesale';
        const isNowWholesale = userProfile.wholesale_access || userProfile.account_type === 'wholesale';
        const statusChanged = wasWholesale !== isNowWholesale;
        
        // Update user context 
        if (setUser) {
          const updatedUser = {
            ...userProfile,
            email: userProfile.email || (user?.email || ''),
            name: fullName,
            full_name: fullName,
            isGuest: false,
            // Ensure we have the latest wholesale status
            wholesale_access: userProfile.wholesale_access || user?.wholesale_access || false,
            accountType: userProfile.account_type || userProfile.accountType || 'retail',
            isActive: userProfile.is_active !== undefined ? userProfile.is_active : (user?.isActive !== false)
          };
          
          setUser(prev => ({
            ...prev,
            ...updatedUser
          }));
          
          // Show success message if wholesale access was just granted
          if (isNowWholesale && statusChanged) {
            toast.success('تم ترقية حسابك إلى حساب جملة بنجاح!', { 
              duration: 5000,
              position: 'top-center',
              className: 'rtl text-right',
              style: {
                background: '#D1FAE5',
                color: '#065F46',
                border: '1px solid #6EE7B7',
                borderRadius: '0.5rem',
                padding: '1rem',
              },
            });
          }
        }
        
        // Update form data (prefer explicit fields when available)
        const addressVal = userProfile.address || userProfile.shipping_address || userProfile.location || '';
        const parsed = parseAddressParts(addressVal);
        const cityPref = userProfile.city || userProfile.city_name || parsed.city || '';
        const districtPref = userProfile.district || userProfile.neighborhood || userProfile.area || parsed.district || '';
        const streetPref = userProfile.street || userProfile.address_line1 || parsed.street || '';
        const formDataUpdate = {
          name: fullName,
          email: userProfile.email || '',
          phone: userProfile.phone || userProfile.phone_number || userProfile.mobile || '',
          address: addressVal,
          city: cityPref,
          district: districtPref,
          street: streetPref,
          birthDate: extractBirthDate(userProfile)
        };
        
        setFormData(formDataUpdate);
      }
    } catch (error) {
      console.error('❌ فشل تحديث بيانات المستخدم:', error);
    }
  };

  // Set up event listener for wholesale upgrade approval
  useEffect(() => {
    const handleWholesaleUpgrade = async (event) => {
      const { userId } = event.detail || {};
      console.log('🎯 تم استلام حدث ترقية حساب الجملة للمستخدم:', userId);
      
      // Refresh user data to get the latest status
      await refreshUserData();
    };
    
    // Add event listener
    window.addEventListener('wholesaleUpgradeApproved', handleWholesaleUpgrade);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('wholesaleUpgradeApproved', handleWholesaleUpgrade);
    };
  }, [setUser]);

  // Fetch user data on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 جاري تحميل بيانات المستخدم...');
        
        // Try to get user data from auth service first
        try {
          console.log('🔄 جاري جلب بيانات المستخدم من خدمة المصادقة...');
          const userProfile = await authService.getProfile();
          
          if (userProfile) {
            console.log('✅ تم جلب بيانات المستخدم بنجاح:', JSON.stringify(userProfile, null, 2));
            
            // Log all available fields for debugging
            console.log('🔍 الحقول المتوفرة في بيانات المستخدم:', Object.keys(userProfile).join(', '));
            
            // Log all name-related fields for debugging
            const nameFields = ['name', 'full_name', 'firstName', 'first_name', 'lastName', 'last_name', 'username'];
            const availableNameFields = nameFields.filter(field => userProfile[field] !== undefined && userProfile[field] !== null);
            console.log('🏷️ حقول الاسم المتاحة:', availableNameFields.map(f => `${f}: "${userProfile[f]}"`).join(', '));
            
            // Extract full name with proper priority
            const fullName = userProfile.full_name || 
                           userProfile.name ||
                           (userProfile.firstName && userProfile.lastName ? `${userProfile.firstName} ${userProfile.lastName}` : null) ||
                           (userProfile.first_name && userProfile.last_name ? `${userProfile.first_name} ${userProfile.last_name}` : null) ||
                           'مستخدم';
            
            console.log('✨ الاسم الكامل المستخدم:', fullName);
            
            // Update user context with the profile data
            if (setUser) {
              const updatedUser = {
                ...userProfile,
                // Ensure these fields are always set
                email: userProfile.email || (user?.email || ''),
                name: fullName,
                full_name: fullName, // Store full name in a separate field
                isGuest: false // Force isGuest to false since we have a valid profile
              };
              
              console.log('🔄 تحديث سياق المستخدم بالبيانات:', JSON.stringify(updatedUser, null, 2));
              
              setUser(prev => ({
                ...prev,
                ...updatedUser
              }));
            }
            
            // Set form data from the profile
            if (isMounted) {
              const addressVal = userProfile.address || userProfile.shipping_address || userProfile.location || '';
              const parsed = parseAddressParts(addressVal);
              const cityPref = userProfile.city || userProfile.city_name || parsed.city || '';
              const districtPref = userProfile.district || userProfile.neighborhood || userProfile.area || parsed.district || '';
              const streetPref = userProfile.street || userProfile.address_line1 || parsed.street || '';
              const formDataUpdate = {
                name: fullName, // Use the extracted full name
                email: userProfile.email || '',
                phone: userProfile.phone || userProfile.phone_number || userProfile.mobile || '',
                address: addressVal,
                city: cityPref,
                district: districtPref,
                street: streetPref,
                birthDate: extractBirthDate(userProfile)
              };
              
              console.log('📝 تحديث نموذج البيانات:', formDataUpdate);
              setFormData(formDataUpdate);
            }
            return;
          }
        } catch (authError) {
          console.error('❌ فشل جلب بيانات المستخدم من خدمة المصادقة:', authError);
        }
        
        // Fallback to customer service if auth service fails
        try {
          console.log('🔄 جاري محاولة جلب البيانات من خدمة العملاء...');
          // Use client-scoped auth token with legacy fallback
          const token = localStorage.getItem('client_auth_token') || localStorage.getItem('authToken');
          
          if (token) {
            // Try to get user ID from token
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const userId = payload.sub || payload.userId || payload.id;
              
              if (userId) {
                console.log('🔑 تم العثور على معرف المستخدم في التوكن:', userId);
                const response = await customerService.getCustomerById(userId);
                
                if (response?.data) {
                  const customerData = response.data;
                  console.log('📊 بيانات العميل المستلمة:', customerData);
                  
                  // Update user context with customer data
                  if (setUser) {
                    setUser(prev => ({
                      ...prev,
                      ...customerData,
                      isGuest: false // Mark as not guest
                    }));
                  }
                  
                  // Update form data
                  if (isMounted) {
                    const addressVal = customerData.address || customerData.shipping_address || '';
                    const parsed = parseAddressParts(addressVal);
                    const cityPref = customerData.city || customerData.city_name || parsed.city || '';
                    const districtPref = customerData.district || customerData.neighborhood || customerData.area || parsed.district || '';
                    const streetPref = customerData.street || customerData.address_line1 || parsed.street || '';
                    setFormData({
                      name: customerData.name || customerData.full_name || '',
                      email: customerData.email || '',
                      phone: customerData.phone || customerData.phone_number || '',
                      address: addressVal,
                      city: cityPref,
                      district: districtPref,
                      street: streetPref,
                      birthDate: customerData.birth_date || customerData.date_of_birth || ''
                    });
                  }
                  return;
                }
              }
            } catch (tokenError) {
              console.error('❌ خطأ في معالجة توكن المصادقة:', tokenError);
            }
          }
        } catch (customerError) {
          console.error('❌ فشل جلب بيانات العميل:', customerError);
        }
        
        // If we reach here, we couldn't get user data
        console.warn('⚠️ تعذر تحميل بيانات المستخدم الكاملة');
        
        // If we have a token but no user data, still don't treat as guest
        if (localStorage.getItem('authToken')) {
          console.log('🔑 يوجد توكن مصادقة، يتم التعامل مع المستخدم كمسجل');
          if (setUser) {
            setUser(prev => ({
              ...prev,
              isGuest: false
            }));
          }
        }
        
        // Build a safe local fallback user object from context or localStorage
        let userData = (user && typeof user === 'object' && Object.keys(user).length) ? user : null;
        if (!userData) {
          try {
            const raw = localStorage.getItem('client_user_data') || localStorage.getItem('userData');
            userData = raw ? JSON.parse(raw) : {};
          } catch (_) {
            userData = {};
          }
        }
        userData = userData || {};
        console.log('🔍 بيانات المستخدم الخام (fallback):', userData);
        console.log('📋 الحقول المتوفرة:', Object.keys(userData || {}));
        
        if (!isMounted) {
          console.log('⚠️ تم إلغاء تحميل المكون...');
          return;
        }
        
        // Format birth date if exists
        let formattedBirthDate = extractBirthDate(userData);
        
        // Debug name fields
        console.log('All available user data (fallback path):', userData);
        
        // Extract name from the most appropriate field with priority
        let userName = userData.full_name || 
                      userData.name ||
                      (userData.first_name && userData.last_name ? `${userData.first_name} ${userData.last_name}` : '') ||
                      (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : '') ||
                      userData.displayName ||
                      'مستخدم';
        
        // Log all potential name fields for debugging
        console.log('🔤 حقول الاسم المحتملة:', {
          full_name: userData.full_name,
          name: userData.name,
          first_name: userData.first_name,
          last_name: userData.last_name,
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName,
          username: userData.username,
          email: userData.email,
          selectedName: userName
        });
        
        console.log('✅ Selected user name:', userName);
        
        // Update form data with fallback values
        const addressVal = userData.address || userData.location || userData.shipping_address || '';
        const parsed = parseAddressParts(addressVal);
        const cityPref = userData.city || userData.city_name || parsed.city || '';
        const districtPref = userData.district || userData.neighborhood || userData.area || parsed.district || '';
        const streetPref = userData.street || userData.address_line1 || parsed.street || '';
        const formDataUpdate = {
          name: userName,
          email: userData.email || '',
          phone: userData.phone || userData.phone_number || userData.mobile || '',
          address: addressVal,
          city: cityPref,
          district: districtPref,
          street: streetPref,
          birthDate: formattedBirthDate
        };
        
        console.log('Form data to be set:', formDataUpdate);
        setFormData(formDataUpdate);
        
        // Also update the user context if needed
        if (setUser && !userData.isGuest) {
          setUser(prev => ({
            ...prev,
            ...userData,
            name: userName,
            full_name: userName
          }));
        }
        
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('حدث خطأ في تحميل بيانات المستخدم');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Removed user from dependencies to prevent infinite loops

  // One-time cleanup: remove generic address keys that could leak across accounts
  useEffect(() => {
    const genericKeys = [
      'address',
      'shipping_address',
      'last_shipping_address',
      'checkout_shipping_address',
      'customer_shipping_address',
    ];
    try {
      genericKeys.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  }, []);

  // Prefill shipping address from localStorage if profile address is empty (first time)
  // Important: Do NOT auto-save to server to avoid cross-account pollution
  useEffect(() => {
    if (isLoading) return;
    if (didTryAutosaveAddress.current) return;
    if (formData.address && formData.address.trim()) return;
    const addr = findShippingAddressFromLocalStorage();
    didTryAutosaveAddress.current = true;
    if (!addr) return;
    const parts = parseAddressParts(addr);
    setFormData((prev) => ({ ...prev, address: addr, city: parts.city, district: parts.district, street: parts.street }));
  }, [isLoading, formData.address]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // Trim whitespace from all fields except password
      const newValue = name === 'birthDate' ? value : value.trimStart();
      
      // Only update if the value has actually changed
      if (prev[name] === newValue) return prev;
      
      return {
        ...prev,
        [name]: newValue
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare the data to be sent to the server
      const composedAddr = composeAddress(formData) || formData.address.trim();
      const updateData = {
        full_name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: composedAddr,
      };
      
      // Only include birthDate if it has a value (authService will map -> birth_date)
      if (formData.birthDate) {
        updateData.birthDate = formData.birthDate; // e.g., 2004-02-03 (no timezone)
      }
      
      // Update the profile
      const updatedUser = await authService.updateProfile(updateData);
      
      // Update the user context
      setUser(prev => ({
        ...prev,
        ...updateData,
        name: updateData.full_name, // Keep the name field for backward compatibility
        date_of_birth: formData.birthDate // Keep the formatted date for the UI
      }));
      
      toast.success('تم تحديث الملف الشخصي بنجاح');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check if user has wholesale access
  const hasWholesaleAccess = user?.wholesale_access || user?.wholesale_approved;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <h2 className="text-2xl font-bold text-white">الملف الشخصي</h2>
                {hasWholesaleAccess && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <svg className="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 116 0z" clipRule="evenodd" />
                    </svg>
                    حساب جملة
                  </span>
                )}
              </div>
              <div className="flex space-x-2 rtl:space-x-reverse">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-gray-700 bg-white hover:bg-gray-50 border-gray-300 rounded-lg"
                      onClick={() => {
                        // Reset form with current user data without refetching
                        const userData = user;
                        let formattedBirthDate = '';
                        
                        if (userData?.date_of_birth) {
                          const dateObj = new Date(userData.date_of_birth);
                          if (!isNaN(dateObj.getTime())) {
                            const year = dateObj.getFullYear();
                            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            formattedBirthDate = `${year}-${month}-${day}`;
                          }
                        }
                        
                        const parts = parseAddressParts(userData?.address || '');
                        setFormData({
                          name: userData?.full_name || userData?.name || '',
                          email: userData?.email || '',
                          phone: userData?.phone || '',
                          address: userData?.address || '',
                          city: parts.city,
                          district: parts.district,
                          street: parts.street,
                          birthDate: formattedBirthDate
                        });
                        
                        setIsEditing(false);
                      }}
                    >
                      <X className="ml-1 h-4 w-4" />
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      form="profile-form"
                      variant="default"
                      size="sm"
                      className="bg-white text-blue-600 hover:bg-blue-50 rounded-lg"
                      disabled={isLoading}
                    >
                      <Save className="ml-1 h-4 w-4" />
                      {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-white border-white hover:bg-white/10 rounded-lg"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="ml-1 h-4 w-4" />
                    تعديل الملف
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <form id="profile-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  الاسم الكامل
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`pr-10 ${!isEditing ? 'bg-gray-100' : ''} rounded-lg`}
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  البريد الإلكتروني
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`pr-10 ${!isEditing ? 'bg-gray-100' : ''} rounded-lg`}
                    required
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  رقم الجوال
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`pr-10 ${!isEditing ? 'bg-gray-100' : ''} rounded-lg`}
                    required
                  />
                </div>
              </div>

              {/* Address Fields: City, District, Street */}
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  العنوان
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      name="city"
                      id="city"
                      placeholder="المدينة"
                      value={formData.city}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`pr-10 ${!isEditing ? 'bg-gray-100' : ''} rounded-lg`}
                    />
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <Input
                      type="text"
                      name="district"
                      id="district"
                      placeholder="الحي"
                      value={formData.district}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`${!isEditing ? 'bg-gray-100' : ''} rounded-lg text-right`}
                    />
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <Input
                      type="text"
                      name="street"
                      id="street"
                      placeholder="الشارع"
                      value={formData.street}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`${!isEditing ? 'bg-gray-100' : ''} rounded-lg text-right`}
                    />
                  </div>
                </div>
                {/* Show combined address preview */}
                <div className="text-xs text-gray-500 mt-1">
                  العنوان الكامل: {composeAddress(formData) || formData.address || '—'}
                </div>
              </div>

              {/* Birth Date Field */}
              <div className="space-y-2">
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                  تاريخ الميلاد
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="date"
                    name="birthDate"
                    id="birthDate"
                    value={formData.birthDate || ''}
                    onChange={(e) => {
                      console.log('Date input changed:', e.target.value);
                      handleInputChange(e);
                    }}
                    disabled={!isEditing}
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                    className={`pr-10 ${!isEditing ? 'bg-gray-100' : ''} ${!formData.birthDate ? 'text-gray-400' : ''} rounded-lg`}
                  />
                  {!formData.birthDate && (
                    <div className="absolute inset-y-0 right-10 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">اختر التاريخ</span>
                    </div>
                  )}
                </div>
                {isEditing && formData.birthDate && (
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Clearing birth date');
                      setFormData(prev => ({
                        ...prev,
                        birthDate: ''
                      }));
                    }}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    مسح التاريخ
                  </button>
                )}
              </div>
            </div>

            {/* Hidden submit button for form submission on enter */}
            <button type="submit" className="hidden">Submit</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;
