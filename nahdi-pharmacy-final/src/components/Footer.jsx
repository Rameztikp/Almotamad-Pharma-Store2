import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Phone, Mail, MapPin, ArrowLeft } from 'lucide-react';
import kuraimiLogo from '../assets/logo-krime.png';
import mutamedLogo from '../assets/logo-almutamed.png';
const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-t-3xl shadow-inner mt-20">
      {/* Decorative elements */}
      <div className="absolute w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
      
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center">
              <img 
                src={mutamedLogo} 
                alt="شعار المعتمد" 
                className="h-12 object-contain"
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              شريكك الموثوق في الصحة والجمال. نقدم أفضل المنتجات الطبية والتجميلية بأعلى معايير الجودة.
            </p>
            <div className="flex flex-row-reverse justify-start gap-4 items-center">
              {[
                { icon: <Facebook className="w-5 h-5" />, label: 'فيسبوك' },
                { icon: <Twitter className="w-5 h-5" />, label: 'تويتر' },
                { icon: <Instagram className="w-5 h-5" />, label: 'انستجرام' },
                { icon: <Youtube className="w-5 h-5" />, label: 'يوتيوب' }
              ].map((social, index) => (
                <a 
                  key={index} 
                  href="#" 
                  className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-300"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white/90 border-b border-white/10 pb-2 inline-block">
              روابط سريعة
            </h3>
            <ul className="space-y-3">
              {[
                { to: "/about", text: "من نحن" },
                { to: "/contact", text: "اتصل بنا" },
                { to: "/careers", text: "الوظائف" },
                { to: "/privacy", text: "سياسة الخصوصية" },
                { to: "/terms", text: "الشروط والأحكام" }
              ].map((link, index) => (
                <li key={index} className="group">
                  <Link 
                    to={link.to} 
                    className="flex items-center text-gray-300 hover:text-white transition-all duration-300 group-hover:pr-2"
                  >
                    <ArrowLeft className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <span>{link.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white/90 border-b border-white/10 pb-2 inline-block">
              الأقسام
            </h3>
            <ul className="space-y-3">
              {[
                { to: "/products?category=medicines", text: "الأدوية" },
                { to: "/products?category=cosmetics", text: "التجميل" },
                { to: "/products?category=perfumes", text: "العطور" },
                { to: "/products?category=baby", text: "منتجات الأطفال" },
                { to: "/products?category=medical", text: "المستلزمات الطبية" }
              ].map((category, index) => (
                <li key={index} className="group">
                  <Link 
                    to={category.to} 
                    className="flex items-center text-gray-300 hover:text-white transition-all duration-300 group-hover:pr-2"
                  >
                    <ArrowLeft className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <span>{category.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white/90 border-b border-white/10 pb-2 inline-block">
              تواصل معنا
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start rtl:space-x-reverse space-x-2">
                <div className="bg-blue-500/10 p-2 rounded-full">
                  <Phone className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">اتصل بنا</p>
                  <a href="tel:920000000" className="text-white hover:text-blue-300 transition-colors">
                    920000000
                  </a>
                </div>
              </li>
              
              <li className="flex items-start rtl:space-x-reverse space-x-2">
                <div className="bg-blue-500/10 p-2 rounded-full">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">البريد الإلكتروني</p>
                  <a href="mailto:info@almautamd.sa" className="text-white hover:text-blue-300 transition-colors break-all">
                    info@almautamd.sa
                  </a>
                </div>
              </li>
              
              <li className="flex items-start rtl:space-x-reverse space-x-2">
                <div className="bg-blue-500/10 p-2 rounded-full mt-1">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">العنوان</p>
                  <p className="text-white leading-relaxed">
                    الجمهورية اليمنية - تعز المدية<br />
                    شارع اللجينات
                  </p>
                </div>
              </li>
            </ul>

            {/* App Download */}
            <div className="pt-4">
              <h4 className="text-sm font-semibold mb-3 text-white/90">حمل التطبيق</h4>
              <div className="grid grid-cols-1 gap-2">
                <a href="#" className="bg-black/30 hover:bg-black/40 backdrop-blur-sm rounded-xl p-3 flex items-center transition-all duration-300 group">
                  <div className="bg-white/10 p-2 rounded-lg mr-3 group-hover:bg-white/20 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3 .08 1.18-.84 1.85-2.06 1.81-3.75-2.13.13-3.31 1.45-4.1-1.13-4.15.18-6.07-1.2-6.7-3.26-1.46-4.66 2.15-7.32 4.29-7.22 1.67.01 2.65.75 3.27.68.58-.08 2.35-.93 3.67-.39.64.27 1.5 1.11 1.83 1.79-1.71 1.04-2.5 2.81-2.38 4.56 1.4.1 2.66-.51 3.3-1.66 1.45 1.01 2.23 2.23 2.21 4.2-.03 2.15-1.13 3.84-3.2 5.1z"/>
                      <path d="M4.53 9.14c.16-1.99 1.09-3.19 2.75-3.7l.07 1.2c-1.17.46-1.67 1.21-1.8 2.5-.1 1.09.29 1.64.27 1.65-.04.01-.17-.48-.18-1.25z"/>
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-300">نزّل على</div>
                    <div className="font-semibold text-sm">App Store</div>
                  </div>
                </a>
                
                <a href="#" className="bg-black/30 hover:bg-black/40 backdrop-blur-sm rounded-xl p-3 flex items-center transition-all duration-300 group">
                  <div className="bg-white/10 p-2 rounded-lg mr-3 group-hover:bg-white/20 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a1.75 1.75 0 0 1-.603-2.28l8.22-14.3a1.75 1.75 0 0 1 2.993 0l8.22 14.3a1.75 1.75 0 0 1-.603 2.28L14.208 12l10.182-10.186a1.75 1.75 0 0 0-.603-2.28l-8.22-14.3a1.75 1.75 0 0 0-2.993 0l-8.22 14.3a1.75 1.75 0 0 0 .603 2.28z"/>
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-300">احصل عليه في</div>
                    <div className="font-semibold text-sm">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-300">
          
          {/* الشعار والنص معًا على اليسار */}
          <div className="flex items-center gap-x-4">
            <img 
              src={mutamedLogo} 
              alt="شعار المعتمد" 
              className="h-10 object-contain"
            />
            <div className="text-center md:text-right">
              <span>© {new Date().getFullYear()} المعتمد فارما. جميع الحقوق محفوظة</span>
            </div>
            <div className="flex items-center flex-wrap justify-center gap-4 md:gap-6">
              <Link to="/privacy" className="hover:text-white transition-colors text-sm">
                سياسة الخصوصية
              </Link>
              <span className="w-1 h-1 bg-white/30 rounded-full"></span>
              <Link to="/terms" className="hover:text-white transition-colors text-sm">
                الشروط والأحكام
              </Link>
              <span className="w-1 h-1 bg-white/30 rounded-full hidden md:inline"></span>
              <Link to="/sitemap" className="hover:text-white transition-colors text-sm">
                خريطة الموقع
              </Link>
            </div>
          </div>

          {/* الروابط وطرق الدفع على اليمين */}
          <div className="flex items-center gap-x-6">
            <Link to="/wholesale" className="hover:text-gray-700 transition-colors whitespace-nowrap">
              عملاء الجملة
            </Link>
            <Link to="/pharmacy-services" className="hover:text-gray-700 transition-colors whitespace-nowrap">
              خدمات الصيدلية
            </Link>
            <Link to="/delivery" className="hover:text-gray-700 transition-colors whitespace-nowrap">
              خدمة التوصيل
            </Link>

            <div className="flex items-center gap-x-2 whitespace-nowrap">
              <span className="font-bold">طرق الدفع</span>
              <div className="bg-purple-700 p-1 rounded">
                <img 
                  src={kuraimiLogo} 
                  alt="شعار بنك الكريمي" 
                  className="h-6 object-contain"
                />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>

         
          
    </footer>
  )
}

export default Footer
