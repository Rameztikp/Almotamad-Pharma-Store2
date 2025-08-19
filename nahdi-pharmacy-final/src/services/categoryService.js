// src/services/categoryService.js
import ApiService from './api';

export const categoryService = {
  // جلب الفئات مع إمكانية التصفية
  async getCategories(params = {}) {
    // ApiService.get expects a flat params object, not nested under { params }
    return await ApiService.get('/categories', params);
  },

  // جلب فئة محددة
  async getCategory(id) {
    return await ApiService.get(`/categories/${id}`);
  },

  // جلب منتجات فئة محددة
  async getCategoryProducts(id, params = {}) {
    // Pass params directly so ApiService can serialize them correctly
    return await ApiService.get(`/categories/${id}/products`, params);
  },

  // للحفاظ على التوافق مع الكود القديم
  async getAllCategories() {
    return await this.getCategories();
  },

  // جلب فئات الجملة
  async getWholesaleCategories() {
    return await this.getCategories({ type: 'wholesale' });
  },

  // جلب فئات التجزئة
  async getRetailCategories() {
    return await this.getCategories({ type: 'retail' });
  },

  // جلب منتجات فئة محددة
  async fetchProductsForCategory(id) {
    return await ApiService.get(`/categories/${id}/products`);
  }
};