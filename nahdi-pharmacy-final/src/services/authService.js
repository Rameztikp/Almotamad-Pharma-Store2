// src/services/authService.js
import ApiService from "./api";

// Helper: derive a human-friendly display name from registered fields only (no email prefix)
const getDisplayName = (obj = {}) => {
  const firstLast = (f, l) => (f && l ? `${f} ${l}` : null);
  return (
    obj.full_name ||
    obj.fullName ||
    obj.name ||
    firstLast(obj.firstName, obj.lastName) ||
    firstLast(obj.first_name, obj.last_name) ||
    obj.displayName ||
    obj.display_name ||
    "مستخدم"
  );
};

// دالة مساعدة للحصول على مفتاح بيانات المستخدم (لمنع تداخل بيانات المسؤول مع المستخدم العادي)
const getUserDataKey = (isAdmin = false) => isAdmin ? 'admin_user_data' : 'client_user_data';

const authService = {
  // دالة مساعدة للتعامل مع استجابة تسجيل الدخول الناجحة (كوكيز فقط)
  handleLoginResponse: async function (responseData) {
    try {
      // معالجة بيانات الاستجابة
      console.log("🔍 استجابة الخادم:", {
        hasData: !!responseData,
        data: responseData ? "..." : "لا توجد بيانات",
      });
      // في الوضع الجديد، الباك-إند يضع التوكنات في كوكيز HttpOnly
      // نستخرج بيانات المستخدم فقط من الاستجابة (إن وُجدت)
      const userData = responseData.user || responseData.data?.user || {};

      // تخزين بيانات المستخدم الأساسية في localStorage
      if (userData) {
        const userDataToStore = {
          id: userData.id,
          email: userData.email || "",
          name: getDisplayName(userData),
          role: userData.role || "user",
          ...userData,
        };

        console.log(
          "💾 حفظ بيانات المستخدم في التخزين المحلي:",
          userDataToStore
        );
        // تخزين بشكل مُقسم حسب النوع لمنع التسريب بين الجلسات
        const isAdmin = userData.role === 'admin' || userData.role === 'super_admin';
        const dataKey = getUserDataKey(isAdmin);
        localStorage.setItem(dataKey, JSON.stringify(userDataToStore));
        // تنظيف المفتاح العام القديم إن وُجد لتفادي التسريب بين الأدوار
        localStorage.removeItem("userData");
      }

      // إرسال حدث لتحديث حالة المصادقة
      window.dispatchEvent(
        new CustomEvent("authStateChanged", {
          detail: { isAuthenticated: true, user: userData },
        })
      );

      console.log("✅ تم تسجيل الدخول بنجاح");

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      console.error("❌ خطأ في معالجة استجابة تسجيل الدخول:", error);
      throw error;
    }
  },

  // تسجيل الدخول
  login: async function (identifier, password) {
    try {
      // تنظيف بيانات المستخدم العادي فقط (لا يوجد تخزين للتوكنات بعد الآن)
      localStorage.removeItem('client_user_data');

      // التحقق من صحة المدخلات
      if (!identifier || !password) {
        throw new Error("يجب إدخال البريد الإلكتروني/الهاتف وكلمة المرور");
      }

      // تنظيف المدخلات
      identifier = identifier.toString().trim();
      password = password.toString().trim();

      // تحديد نوع المعرف (بريد إلكتروني أو هاتف)
      const isEmail = identifier.includes("@");
      const loginData = isEmail
        ? { email: identifier, password: password }
        : { phone: identifier, password: password };

      console.log("🔑 محاولة تسجيل الدخول بالبيانات:", {
        identifier: identifier,
        isEmail,
        hasPassword: !!password,
      });

      // إرسال طلب تسجيل الدخول
      console.log("🌐 إرسال طلب تسجيل الدخول إلى /auth/login...");

      try {
        const response = await fetch(`${ApiService.baseURL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(loginData),
          credentials: 'include',
        });

        const responseData = await response.json();

        if (!response.ok) {
          // في حالة وجود خطأ من الخادم
          console.error("❌ خطأ من الخادم:", {
            status: response.status,
            statusText: response.statusText,
            data: responseData,
          });

          let errorMessage = "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى";

          if (response.status === 401) {
            errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
          } else if (responseData && responseData.message) {
            errorMessage = responseData.message;
          }

          throw new Error(errorMessage);
        }

        // إذا وصلنا إلى هنا، يعني أن الطلب نجح
        return this.handleLoginResponse(responseData);
      } catch (error) {
        console.error("❌ خطأ في طلب تسجيل الدخول:", error);
        throw error;
      }
    } catch (error) {
      console.error("❌ خطأ في تسجيل الدخول:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى";

      if (error.response) {
        // معالجة أخطاء الخادم
        if (error.response.status === 401) {
          errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        } else if (error.response.status === 403) {
          errorMessage = "غير مصرح لك بالدخول";
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }

      throw new Error(errorMessage);
    }
  },

  // تسجيل مستخدم جديد
  register: async function (userData) {
    try {
      const response = await ApiService.post("/auth/register", userData);
      // الخادم سيضع الكوكيز مباشرة. خزّن بيانات المستخدم إن وُجدت فقط.
      if (response && response.user) {
        const dataKey = getUserDataKey(false); // client_user_data
        localStorage.setItem(dataKey, JSON.stringify(response.user));
        localStorage.removeItem("userData");
        window.dispatchEvent(
          new CustomEvent("authStateChanged", {
            detail: { isAuthenticated: true, user: response.user },
          })
        );
      }
      return response;
    } catch (error) {
      console.error("Registration error in authService:", error);
      if (error.response) {
        // إذا كان هناك استجابة، نستخدم رسالتها أو الرسالة الافتراضية
        const errorMessage =
          error.response.data?.message ||
          "البريد الإلكتروني مستخدم من قبل، جرب بريدًا آخر أو سجل دخول";
        const newError = new Error(errorMessage);
        newError.response = error.response;
        throw newError;
      }
      throw error;
    }
  },

  // تسجيل الخروج
  logout: async function () {
    try {
      // إرسال طلب تسجيل الخروج إلى الخادم دائماً؛ الكوكيز ستُحذف من الخادم
      try {
        await ApiService.post("/auth/logout", {});
        console.log("تم تسجيل الخروج بنجاح من الخادم");
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error("خطأ في طلب تسجيل الخروج:", error);
        }
      }

      // مسح بيانات المصادقة المحلية
      this.clearAuthData();

      console.log("تم مسح بيانات المصادقة المحلية");
      return true;
    } catch (error) {
      console.error("حدث خطأ أثناء تسجيل الخروج:", error);
      // التأكد من مسح بيانات المصادقة حتى في حالة الخطأ
      this.clearAuthData();
      return false;
    }
  },

  // مسح بيانات المصادقة المحلية (فقط المستخدم العادي)
  clearAuthData: function () {
    try {
      // مسح بيانات المستخدم العادي والتوكنات
      const clientKeys = [
        'client_user_data',
        'client_auth_token',
        'client_refresh_token',
        'userData',
        'authToken',
        'token'
      ];
      
      clientKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`✅ تم مسح: ${key}`);
        }
      });

      // التأكد من عدم مسح بيانات الأدمن
      const adminToken = localStorage.getItem('admin_auth_token') || localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('adminData');
      if (adminToken || adminData) {
        console.log('✅ توكنات المسؤول محفوظة - لم يتم مسحها');
      }

      // إرسال حدث لتحديث حالة المصادقة
      window.dispatchEvent(
        new CustomEvent("authStateChanged", {
          detail: { isAuthenticated: false, user: null },
        })
      );
      
      console.log("✅ تم مسح جميع بيانات المصادقة بنجاح");
    } catch (error) {
      console.error("❌ خطأ أثناء مسح بيانات المصادقة:", error);
    }
  },

  // الحصول على ملف المستخدم
  getProfile: async function () {
    try {
      console.log("🔍 محاولة جلب بيانات المستخدم...");

      console.log("🌐 إرسال طلب للحصول على ملف المستخدم...");

      try {
        // استخدام ApiService بدلاً من fetch مباشرة
        const response = await ApiService.get("/auth/me");

        console.log("👤 بيانات المستخدم المستلمة:", response);

        // استخراج بيانات المستخدم من الاستجابة
        let userData = null;
        if (response && response.data) {
          userData = response.data.user || response.data;
        } else if (response && response.user) {
          userData = response.user;
        } else if (response) {
          userData = response;
        } else {
          throw new Error("استجابة فارغة من الخادم");
        }

        if (userData) {
          // تحديد السياق الحالي (لوحة الإدارة أم الواجهة العامة)
          const isAdmin = window.location.pathname.startsWith('/admin');
          
          // فحص ما إذا كان المستخدم قد سجل خروجه - مع دعم HttpOnly cookies
          // إذا حصلنا على استجابة ناجحة من /auth/me فهذا يعني أن المصادقة صالحة (سواء كانت HttpOnly cookies أو localStorage tokens)
          let hasValidAuth = true;
            
          if (!hasValidAuth) {
            console.log('⚠️ لا توجد مصادقة صالحة - لن يتم حفظ بيانات المستخدم');
            return null;
          }
          
          // التحقق من تطابق دور المستخدم مع السياق الحالي
          const userRole = userData.role || 'user';
          const isUserAdmin = userRole === 'admin' || userRole === 'super_admin';
          
          if (isAdmin && !isUserAdmin) {
            console.log('⚠️ مستخدم عادي يحاول الوصول لمنطقة الإدارة - سيتم تسجيل الخروج');
            this.clearAuthData();
            window.location.href = '/login';
            return null;
          }
          
          // تم إزالة إعادة التوجيه التلقائي للمسؤولين - يمكن للمسؤول الوصول للمتجر العادي
          // if (!isAdmin && isUserAdmin) {
          //   console.log('⚠️ مسؤول يحاول الوصول للمنطقة العامة - سيتم إعادة التوجيه');
          //   window.location.href = '/admin/dashboard';
          //   return null;
          // }
          
          // دمج البيانات الجديدة مع المخزنة للحفاظ على الحقول التي لا يعيدها الخادم (مثل phone)
          let storedUser = {};
          try {
            const dataKey = getUserDataKey(isAdmin);
            const scopedRaw = localStorage.getItem(dataKey);
            if (scopedRaw) {
              storedUser = JSON.parse(scopedRaw);
            } else {
              // هجرة من المفتاح القديم إن وُجد ثم احذفه
              const legacyRaw = localStorage.getItem("userData");
              if (legacyRaw) {
                storedUser = JSON.parse(legacyRaw);
                localStorage.setItem(dataKey, legacyRaw);
                localStorage.removeItem("userData");
              }
            }
          } catch (_) { storedUser = {}; }

          const merged = {
            ...storedUser,
            ...userData,
          };

          // اشتقاق اسم العرض بشكل موحد
          merged.name = getDisplayName(merged);
          merged.full_name = merged.full_name || merged.name;

          // حافظ على رقم الهاتف إن لم يُرسل من الخادم
          merged.phone = (userData.phone || userData.phone_number || userData.mobile || storedUser.phone || "");

          // حقول أساسية مضمونة
          merged.id = userData.id || storedUser.id;
          merged.email = userData.email || storedUser.email || "";
          merged.role = userData.role || storedUser.role || "user";

          const dataKey = getUserDataKey(isAdmin);
          localStorage.setItem(dataKey, JSON.stringify(merged));
          console.log("✅ تم حفظ بيانات المستخدم (scoped) في localStorage (مع دمج آمن):", { key: dataKey, merged });

          return merged;
        }

        throw new Error("لم يتم العثور على بيانات المستخدم في الاستجابة");
      } catch (error) {
        console.error("❌ فشل جلب بيانات الملف الشخصي:", error.message);

        // في حالة انتهاء صلاحية الجلسة نرجع null
        if (error.response?.status === 401) return null;

        // إذا فشل جلب البيانات من الخادم، استخدم البيانات المحلية (scoped) كحل بديل
        const isAdmin = window.location.pathname.startsWith('/admin');
        const dataKey = getUserDataKey(isAdmin);
        let fallback = localStorage.getItem(dataKey);
        if (!fallback) {
          // هجرة من المفتاح القديم إن وُجد
          fallback = localStorage.getItem("userData");
          if (fallback) {
            localStorage.setItem(dataKey, fallback);
            localStorage.removeItem("userData");
          }
        }
        if (fallback) {
          try {
            console.log("⚠️ استخدام البيانات المحلية (scoped) كحل بديل");
            return JSON.parse(fallback);
          } catch (e) {
            console.error("❌ فشل تحليل بيانات المستخدم المحفوظة (scoped):", e);
          }
        }

        return null;
      }
    } catch (error) {
      console.error("❌ خطأ غير متوقع في getProfile:", error);
      return null;
    }
  },

  // تحديث ملف المستخدم
  updateProfile: async function (userData) {
    try {
      // طباعة بيانات الإرسال في وضع التطوير فقط
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 تحديث الملف الشخصي - البيانات المرسلة (قبل التطبيع):', userData);
      }

      // تطبيع الحقول لتتوافق مع API المحتمل
      const payload = { ...userData };
      // توحيد اسم الحقل للاسم الكامل إن وُجد
      if (payload.full_name == null && typeof payload.name === 'string' && payload.name.trim()) {
        payload.full_name = payload.name.trim();
      }
      // توحيد حقل الهاتف: الباك-إند يتوقع phone
      if (typeof payload.phone === 'string' && payload.phone.trim()) {
        payload.phone = payload.phone.trim();
      }
      if (payload.phone == null && typeof payload.phone_number === 'string' && payload.phone_number.trim()) {
        payload.phone = payload.phone_number.trim();
      }
      // توحيد حقول العنوان: أرسل كلاهما لزيادة التوافق
      if (typeof payload.address === 'string') {
        payload.address = payload.address.trim();
      }
      if (payload.shipping_address == null && typeof payload.address === 'string' && payload.address) {
        payload.shipping_address = payload.address;
      }
      if (payload.address == null && typeof payload.shipping_address === 'string' && payload.shipping_address.trim()) {
        payload.address = payload.shipping_address.trim();
      }
      // توحيد تاريخ الميلاد: الباك-إند يقبل date_of_birth كوقت (RFC3339)
      // إذا وُجد birthDate بصيغة YYYY-MM-DD، حوّله إلى RFC3339 عند منتصف الليل UTC
      const toRfc3339 = (d) => `${d}T00:00:00Z`;
      if (typeof payload.birthDate === 'string' && payload.birthDate) {
        payload.date_of_birth = toRfc3339(payload.birthDate);
      }
      if (typeof payload.date_of_birth === 'string' && /\d{4}-\d{2}-\d{2}$/.test(payload.date_of_birth)) {
        // إن كان تاريخ فقط بدون وقت، أضف وقت UTC
        payload.date_of_birth = toRfc3339(payload.date_of_birth);
      }
      // للحفاظ على التوافق الخلفي، اترك birth_date إن وُجد لكنه غير مستخدم من الباك-إند الحالي

      if (process.env.NODE_ENV === 'development') {
        console.log('🛠️ تحديث الملف الشخصي - البيانات المرسلة (بعد التطبيع):', payload);
      }

      // استخدم المسار الصحيح في الباك-إند أولاً: PUT /auth/profile
      const attempts = [
        { method: 'put', url: '/auth/profile' },    // مطابق لتعريف الراوتر في الباك-إند
        { method: 'put', url: '/auth/me' },         // بدائل محتملة
        { method: 'patch', url: '/auth/me' },
        { method: 'put', url: '/users/me' },
        { method: 'put', url: '/users/profile' },
      ];

      let response = null;
      let lastError = null;
      for (const att of attempts) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔁 محاولة تحديث الملف عبر ${att.method.toUpperCase()} ${att.url}`);
          }
          if (att.method === 'put') {
            response = await ApiService.put(att.url, payload);
          } else if (att.method === 'patch') {
            response = await ApiService.patch(att.url, payload);
          } else {
            continue;
          }
          // إذا نجحت الاستجابة نخرج مباشرة
          if (response) break;
        } catch (err) {
          lastError = err;
          // استخراج كود الحالة من أخطاء ApiService حتى لو كانت مُعربة
          let status = err?.status || err?.response?.status || err?.code;
          const msg = (err && (err.message || err.msg)) ? String(err.message || err.msg) : '';
          if (!status) {
            const lower = msg.toLowerCase();
            if (lower.includes('not found') || msg.includes('غير موجود')) status = 404;
            else if (lower.includes('method not allowed')) status = 405;
            else if (lower.includes('bad request') || msg.includes('طلب غير صالح')) status = 400;
          }
          if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ فشلت المحاولة على ${att.url} بحالة ${status || 'unknown'}`);
          }
          // جرّب التالي فقط في حالات 404/405، وإلا أوقف المحاولات
          if (status !== 404 && status !== 405 && status !== 400) {
            throw err;
          }
        }
      }
      if (!response && lastError) throw lastError;
      
      // إذا تم تحديث الملف الشخصي بنجاح، قم بتحديث بيانات المستخدم المحلية مع دمج آمن
      if (response && response.data) {
        const respUser = response.data.user || response.data;

        let storedUser = {};
        try {
          // تحديد نوع البيانات بناءً على الدور أو السياق الحالي
          const isAdminContext = (respUser.role === 'admin' || respUser.role === 'super_admin') || window.location.pathname.startsWith('/admin');
          const dataKey = getUserDataKey(isAdminContext);
          const scopedRaw = localStorage.getItem(dataKey);
          if (scopedRaw) {
            storedUser = JSON.parse(scopedRaw);
          } else {
            const legacyRaw = localStorage.getItem("userData");
            if (legacyRaw) {
              storedUser = JSON.parse(legacyRaw);
              localStorage.setItem(dataKey, legacyRaw);
              localStorage.removeItem("userData");
            }
          }
        } catch (_) { storedUser = {}; }

        const merged = {
          ...storedUser,
          ...respUser,
        };

        // اشتقاق اسم العرض بشكل موحد
        merged.name = getDisplayName(merged);
        merged.full_name = merged.full_name || merged.name;
        merged.phone = (respUser.phone || respUser.phone_number || respUser.mobile || storedUser.phone || "");

        // حقول أساسية مضمونة
        merged.id = respUser.id || storedUser.id;
        merged.email = respUser.email || storedUser.email || "";
        merged.role = respUser.role || storedUser.role || "user";

        // تحديث بيانات المستخدم المحلية (scoped)
        const isAdminContext = (respUser.role === 'admin' || respUser.role === 'super_admin') || window.location.pathname.startsWith('/admin');
        const dataKey = getUserDataKey(isAdminContext);
        localStorage.setItem(dataKey, JSON.stringify(merged));

        // إرسال حدث لتحديث حالة المصادقة
        window.dispatchEvent(
          new CustomEvent("authStateChanged", {
            detail: { isAuthenticated: true, user: merged },
          })
        );
      }
      
      return response;
    } catch (error) {
      console.error("❌ خطأ في تحديث الملف الشخصي:", error);
      throw error;
    }
  },
};

export { authService };
