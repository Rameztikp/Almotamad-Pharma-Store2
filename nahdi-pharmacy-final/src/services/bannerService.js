import api from './api';

const bannerService = {
  // Fetch all banners (public)
  getPublicBanners: (audience) => {
    let url = '/banners';
    if (audience) {
      url += `?audience=${audience}`;
    }
    return api.get(url);
  },

  // Fetch all banners for admin
  getBanners: async () => {
    try {
      console.log('🔄 bannerService.getBanners() called');
      const response = await api.get('/admin/banners');
      console.log('✅ bannerService.getBanners() response:', response);
      return response;
    } catch (error) {
      console.error('❌ bannerService.getBanners() error:', error);
      throw error;
    }
  },

  // Increment banner click count (public)
  incrementClick: (id) => {
    return api.post(`/banners/${id}/click`);
  },

  // Create a new banner (admin)
  createBanner: (bannerData) => {
    return api.post('/admin/banners', bannerData);
  },

  // Update a banner (admin)
  updateBanner: (id, bannerData) => {
    return api.put(`/admin/banners/${id}`, bannerData);
  },

  // Delete a banner (admin)
  deleteBanner: (id) => {
    return api.delete(`/admin/banners/${id}`);
  },

  // Reorder banners (admin)
  reorderBanners: (orderData) => {
    return api.post('/admin/banners/reorder', orderData);
  },

  // Upload banner image (admin)
  uploadImage: (formData) => {
    return api.post('/admin/banners/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default bannerService;
