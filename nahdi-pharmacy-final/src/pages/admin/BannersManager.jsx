import React, { useState, useEffect, useCallback } from 'react';
import bannerService from '../../services/bannerService';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrag, useDrop } from 'react-dnd';
import toast from 'react-hot-toast';
import update from 'immutability-helper';
import { Plus, GripVertical, Edit, Trash2 } from 'lucide-react';

const ItemType = 'BANNER';

const BannerItem = ({ banner, index, moveBanner, onEdit, onDelete }) => {
  const ref = React.useRef(null);
  const [, drop] = useDrop({
    accept: ItemType,
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveBanner(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: banner.id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div ref={ref} className={`flex items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}>
      <div className="cursor-move text-gray-400 hover:text-gray-600 mr-4">
        <GripVertical size={20} />
      </div>
      <div className="w-32 h-16 bg-gray-200 rounded-md mr-4 flex-shrink-0">
        <img src={banner.image_url} alt={banner.alt_text?.String || banner.alt_text} className="w-full h-full object-contain rounded-md" />
      </div>
      <div className="flex-grow">
        <strong className="text-lg font-semibold text-gray-800">{banner.title?.String || 'بدون عنوان'}</strong>
        <p className="text-sm text-gray-500">الجمهور: <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{banner.audience}</span></p>
        <p className="text-sm text-gray-500">الرابط: {banner.link_url?.String || 'لا يوجد'}</p>
        <p className="text-sm text-gray-500">حالة النشر: <span className={`px-2 py-1 rounded-md text-xs ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{banner.is_active ? 'نشط' : 'غير نشط'}</span></p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onEdit(banner)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
          <Edit size={18} />
        </button>
        <button onClick={() => onDelete(banner.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

const BannersManager = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(null);
  const [formData, setFormData] = useState({ audience: 'general', title: '', subtitle: '', alt_text: '', link_url: '', image_url: '', is_active: true, sort_order: 100 });

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching banners...');
      const response = await bannerService.getBanners();
      console.log('📥 Banner response received:', response);
      
      // Handle both response formats: direct array [] or wrapped {data: []}
      const bannerList = Array.isArray(response) ? response 
                        : Array.isArray(response?.data) ? response.data 
                        : [];
      
      console.log('📋 Processed banner list:', bannerList);
      setBanners(bannerList.sort((a, b) => a.sort_order - b.sort_order));
      
      if (bannerList.length === 0) {
        console.log('ℹ️ No banners found - showing empty state');
      }
    } catch (error) {
      console.error('❌ Error fetching banners:', error);
      toast.error('فشل في تحميل البنرات: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const moveBanner = (dragIndex, hoverIndex) => {
    setBanners(update(banners, { $splice: [[dragIndex, 1], [hoverIndex, 0, banners[dragIndex]]] }));
  };

  const handleDrop = async () => {
    const orderData = { banners: banners.map((b, i) => ({ id: b.id, sort_order: i })) };
    try {
      await bannerService.reorderBanners(orderData);
      toast.success('تم تحديث ترتيب البنرات بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث ترتيب البنرات');
      fetchBanners();
    }
  };

  const openModal = (banner = null) => {
    setCurrentBanner(banner);
    setFormData(banner ? {
      audience: banner.audience || 'retail',
      title: banner.title?.String || '',
      subtitle: banner.subtitle?.String || '',
      alt_text: banner.alt_text || '',
      link_url: banner.link_url?.String || '',
      image_url: banner.image_url || '',
      is_active: banner.is_active !== undefined ? banner.is_active : true,
      sort_order: banner.sort_order || 100
    } : {
      audience: 'retail',
      title: '',
      subtitle: '',
      alt_text: '',
      link_url: '',
      image_url: '',
      is_active: true,
      sort_order: 100
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    console.log('🔒 Closing modal - setting isModalOpen to false');
    setIsModalOpen(false);
    setCurrentBanner(null);
    setFormData({ 
      audience: 'retail', 
      title: '', 
      subtitle: '', 
      alt_text: '', 
      link_url: '', 
      image_url: '', 
      is_active: true, 
      sort_order: 100 
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Convert sort_order to number
    const processedValue = name === 'sort_order' ? parseInt(value, 10) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('جاري رفع الصورة...');
    try {
      const response = await productService.uploadImages([file]);
      const imageUrl = response[0]; // Assuming single file upload
      if (imageUrl) {
        setFormData({ ...formData, image_url: imageUrl });
        toast.success('تم رفع الصورة بنجاح!', { id: toastId });
      } else {
        throw new Error('لم يتم إرجاع رابط الصورة.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('فشل رفع الصورة. يرجى المحاولة مرة أخرى.', { id: toastId });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('جاري إنشاء البانر...');

    try {
      if (!formData.image_url) {
        toast.error('الرجاء رفع صورة للبانر.', { id: toastId });
        return;
      }

      const submissionData = {
        ...formData,
        // Convert nullable fields back to simple strings for submission if needed
        title: formData.title?.String || formData.title,
        subtitle: formData.subtitle?.String || formData.subtitle,
        alt_text: formData.alt_text?.String || formData.alt_text,
        link_url: formData.link_url?.String || formData.link_url,
        sort_order: parseInt(formData.sort_order, 10) || 0,
      };

      if (currentBanner) {
        await bannerService.updateBanner(currentBanner.id, submissionData);
      } else {
        await bannerService.createBanner(submissionData);
      }

      toast.success('تم إنشاء البانر بنجاح!', { id: toastId });
      closeModal();
      await fetchBanners(); // Refresh list
    } catch (error) {
      console.error('Failed to save banner:', error);
      toast.error('فشل حفظ البانر. ' + (error.response?.data?.details || error.message), { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا البنر؟')) {
      try {
        await bannerService.deleteBanner(id);
        toast.success('تم حذف البنر بنجاح');
        fetchBanners();
      } catch (error) { toast.error('فشل في حذف البنر'); }
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-8 bg-gray-50 min-h-screen font-sans" dir="rtl">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">إدارة البنرات</h1>
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            <span>إضافة بنر جديد</span>
          </button>
        </header>

        {loading ? (
          <p className="text-center text-gray-500">جاري التحميل...</p>
        ) : banners.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-lg p-8 max-w-md mx-auto">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بنرات بعد</h3>
              <p className="text-gray-500 mb-4">ابدأ بإضافة بنر جديد لعرضه في الموقع</p>
              <button 
                onClick={() => openModal()} 
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                <span>إضافة بنر جديد</span>
              </button>
            </div>
          </div>
        ) : (
          <div onDrop={handleDrop}>
            {banners.map((banner, index) => (
              <BannerItem key={banner.id} index={index} banner={banner} moveBanner={moveBanner} onEdit={openModal} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg m-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{currentBanner ? 'تعديل البنر' : 'إضافة بنر جديد'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <select name="audience" value={formData.audience} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required>
                  <option value="all">الكل</option>
                  <option value="retail">تجزئة</option>
                  <option value="wholesale">جملة</option>
                </select>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="العنوان" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required />
                <input type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="العنوان الفرعي (اختياري)" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                <input type="text" name="alt_text" value={formData.alt_text} onChange={handleInputChange} placeholder="النص البديل للصورة" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                <input type="text" name="link_url" value={formData.link_url} onChange={handleInputChange} placeholder="رابط التوجيه (اختياري)" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))} className="rounded" />
                    <span className="text-sm font-medium text-gray-700">نشط</span>
                  </label>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ترتيب العرض</label>
                    <input type="number" name="sort_order" value={formData.sort_order} onChange={handleInputChange} min="0" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">صورة البنر</label>
                  <input type="file" onChange={handleFileChange} accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  {formData.image_url && (
                    <div className="mt-4 p-2 border rounded-lg bg-gray-50">
                      <img src={formData.image_url} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-md" />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={closeModal} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow">حفظ</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default BannersManager;
