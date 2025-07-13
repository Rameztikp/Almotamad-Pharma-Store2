// src/services/categoryService.js
import ApiService from './api';

export const categoryService = {
  // جلب جميع الفئات
  async getAllCategories() {
    return await ApiService.get('/categories');
  },

  // اسم بديل مطلوب فى HomePage
  async getCategories() {
    return await this.getAllCategories();
  },

  // جلب فئة محددة
  async getCategory(id) {
    return await ApiService.get(`/categories/${id}`);
  },
};