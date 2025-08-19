// Unified order status helpers

export const normalizeStatus = (s) =>
  String(s ?? 'pending').toLowerCase().trim().replace(/\s+/g, '_');

export const statusText = (status) => {
  const s = normalizeStatus(status);
  const map = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    processing: 'قيد التجهيز',
    shipped: 'تم الشحن',
    out_for_delivery: 'قيد التوصيل',
    delivered: 'تم التسليم',
    canceled: 'تم الإلغاء',
    cancelled: 'تم الإلغاء',
    returned: 'مُرجع',
    failed: 'فشل',
    on_hold: 'معلق',
    refunded: 'مُسترد',
  };
  return map[s] || 'قيد الانتظار';
};

export const statusColor = (status) => {
  const s = normalizeStatus(status);
  switch (s) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
    case 'out_for_delivery':
      return 'bg-indigo-100 text-indigo-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'canceled':
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'returned':
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
