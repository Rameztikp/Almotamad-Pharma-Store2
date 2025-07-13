// src/services/cartService.js
import ApiService from './api';

export const cartService = {
  // الحصول على سلة التسوق
  async getCart() {
    return await ApiService.get('/cart');
  },

  // إضافة منتج للسلة
  async addToCart(productId, quantity = 1) {
    return await ApiService.post('/cart/items', {
      product_id: productId,
      quantity
    });
  },

  // تحديث كمية منتج في السلة
  async updateCartItem(itemId, quantity) {
    return await ApiService.put(`/cart/items/${itemId}`, {
      quantity
    });
  },

  // حذف منتج من السلة
  async removeFromCart(itemId) {
    return await ApiService.delete(`/cart/items/${itemId}`);
  },

  // إفراغ السلة
  async clearCart() {
    return await ApiService.delete('/cart');
  }
};