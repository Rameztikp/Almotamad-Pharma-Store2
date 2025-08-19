import React, { useEffect, useMemo, useState } from 'react';
import { statusText, statusColor, normalizeStatus } from '../utils/orderStatus';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Download, Eye, Printer } from 'lucide-react';
import { orderService } from '../services/orderService';

// Safely parse numbers from strings like "1,234.50 ريال"
const parseAmount = (val, def = 0) => {
  if (val === null || typeof val === 'undefined') return def;
  const num = Number(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : def;
};

// Order type helpers (retail vs wholesale)
const normalizeOrderType = (t) => String(t ?? 'retail').toLowerCase().trim();
const orderTypeText = (t) => {
  const s = normalizeOrderType(t);
  // Arabic labels
  return s === 'wholesale' ? 'جملة' : 'تجزئة';
};
const orderTypeColor = (t) => {
  const s = normalizeOrderType(t);
  return s === 'wholesale' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
};

// Try to infer order type from many possible fields and nested shapes
const inferOrderType = (raw) => {
  try {
    // 1) Direct string fields commonly used
    const strCandidates = [
      raw?.order_type,
      raw?.type,
      raw?.orderType,
      raw?.order_type_label,
      raw?.order_kind,
      raw?.order_category,
      raw?.category_name,
      raw?.category,
      raw?.segment,
      raw?.channel,
      raw?.channel_type,
      raw?.source,
      raw?.order?.type,
      raw?.metadata?.order_type,
      raw?.meta?.order_type,
    ];
    const directStr = strCandidates.find((v) => typeof v === 'string' && v.trim());
    if (directStr) {
      const s = String(directStr).toLowerCase();
      const normalizeArabic = (txt) => String(txt)
        .toLowerCase()
        .replace(/[\u064B-\u065F]/g, '') // remove diacritics
        .replace(/[\s_\-]/g, '');
      const ns = normalizeArabic(s);
      // Handle Arabic labels too
      if (
        ns.includes('wholesale') || ns.includes('wholesaleorder') ||
        ns.includes('jumla') || ns.includes('jomla') ||
        ns.includes('جملة') || ns.includes('جمله')
      ) return 'wholesale';
      if (ns.includes('retail') || ns.includes('تجزئة') || ns.includes('تجزيه') || ns.includes('tajzea')) return 'retail';
      return normalizeOrderType(directStr);
    }

    // 2) Boolean flags
    const boolWholesale = [
      raw?.is_wholesale,
      raw?.wholesale,
      raw?.wholesale_order,
      raw?.isWholesale,
      raw?.order?.is_wholesale,
      raw?.order?.isWholesale,
    ].some((v) => v === true || v === 'true' || v === 1 || v === '1');
    if (boolWholesale) return 'wholesale';

    // 3) Inspect items to infer
    const itemArrays = [
      raw?.items,
      raw?.order_items,
      raw?.orderItems,
      raw?.details,
      raw?.order?.items,
      raw?.order?.order_items,
      raw?.order?.details,
    ];
    for (const arr of itemArrays) {
      if (Array.isArray(arr)) {
        const hasWholesaleItem = arr.some((it) => {
          const itType = (it?.type || it?.category || it?.label || '').toString().toLowerCase();
          const itBool = it?.is_wholesale === true || it?.isWholesale === true || it?.wholesale === true || it?.wholesale_order === true;
          const itBool2 = it?.is_wholesale === 'true' || it?.isWholesale === 'true' || it?.wholesale === 'true' || it?.wholesale_order === 'true' || it?.is_wholesale === 1 || it?.isWholesale === 1;
          const prodBool = it?.product?.is_wholesale === true || it?.product?.isWholesale === true || it?.product?.wholesale === true;
          const prodPublished = it?.product?.published_wholesale === true || it?.product?.publishedWholesale === true || it?.product?.published_wholesale === 'true' || it?.product?.publishedWholesale === 'true' || it?.product?.published_wholesale === 1 || it?.product?.publishedWholesale === 1;
          const prodTypeStr = (it?.product?.type || '').toString().toLowerCase();
          const prodCatStr = (it?.product?.category?.name || it?.product?.category || '').toString().toLowerCase();
          const hasWholesalePrice = typeof it?.wholesale_price !== 'undefined' || typeof it?.product?.wholesale_price !== 'undefined';
          const hasMinQty = Number(it?.min_qty || it?.minQty || it?.product?.min_qty || it?.product?.minQty) > 1;
          const strSignal =
            itType.includes('wholesale') || itType.includes('jumla') || itType.includes('جملة') || itType.includes('جمله') ||
            prodTypeStr.includes('wholesale') || prodTypeStr.includes('jumla') || prodTypeStr.includes('جملة') || prodTypeStr.includes('جمله') ||
            prodCatStr.includes('wholesale') || prodCatStr.includes('jumla') || prodCatStr.includes('جملة') || prodCatStr.includes('جمله');
          return (
            strSignal || itBool || itBool2 || prodBool || prodPublished || hasWholesalePrice || hasMinQty
          );
        });
        if (hasWholesaleItem) return 'wholesale';
      }
    }

    // 4) Numeric/enumeration mapping (fallback)
    const enumCandidates = [raw?.order_type, raw?.type, raw?.order?.type];
    for (const v of enumCandidates) {
      if (v === 2 || v === '2') return 'wholesale';
      if (v === 1 || v === '1') return 'retail';
    }

    // Default
    return 'retail';
  } catch (e) {
    return 'retail';
  }
};

// Helper to safely stringify various address shapes
const formatAddress = (addr, fallback = '') => {
  try {
    if (!addr) return fallback;
    if (typeof addr === 'string') return addr;
    // Some backends send nested address object
    const parts = [
      addr.address_line1 || addr.addressLine1 || addr.line1 || addr.street || addr.address,
      addr.district,
      addr.city,
      addr.state,
      addr.postal_code || addr.postalCode,
      addr.country,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim());
    if (parts.length) return parts.join('، ');
    // If still object without known fields
    return fallback;
  } catch {
    return fallback;
  }
};

// Extract items from various possible shapes returned by backend
const extractItems = (raw) => {
  const candidates = [
    raw.items,
    raw.order_items,
    raw.orderItems,
    raw.products,
    raw.details,
    raw.order?.items,
    raw.order?.order_items,
    raw.order?.details,
  ];
  const arr = candidates.find((a) => Array.isArray(a)) || [];
  return arr.map((it) => ({
    name:
      it.name ||
      it.name_ar ||
      it.product_name ||
      it.title ||
      it.product?.name_ar ||
      it.product?.name ||
      'منتج',
    quantity: parseAmount(it.quantity || it.qty || it.count || it.pivot?.quantity || 1, 1),
    price: parseAmount(
      it.price ||
        it.unit_price ||
        it.unitPrice ||
        it.product_price ||
        it.product?.price ||
        it.pivot?.price ||
        0
    ),
  }));
};

const normalizeOrder = (raw) => {
  const shippingObj = raw.shipping || raw.shipping_address || raw.address || {};
  const firstName = shippingObj.first_name || shippingObj.firstName || '';
  const lastName = shippingObj.last_name || shippingObj.lastName || '';
  const nameFromParts = `${firstName} ${lastName}`.trim();
  const name =
    raw.shipping_name ||
    shippingObj.name ||
    (nameFromParts || undefined) ||
    raw.customer_name ||
    raw.customer?.name ||
    'العميل';

  const phone =
    raw.shipping_phone ||
    shippingObj.phone ||
    shippingObj.mobile ||
    raw.customer_phone ||
    raw.customer?.phone ||
    '';

  const dateRaw = raw.order_date || raw.created_at || raw.createdAt || '';
  const dateStr = dateRaw ? new Date(dateRaw).toLocaleString('ar-EG') : '';

  const shippingFee = parseAmount(
    raw.shipping_fee || raw.delivery_fee || raw.deliveryFee || raw.shipping_cost || raw.shipping?.fee || 0
  );

  const totalVal = parseAmount(
    raw.grand_total || raw.total_amount || raw.totalAmount || raw.total || raw.order?.total || 0
  );

  // Determine order type robustly
  const orderType = inferOrderType(raw);

  return {
    id: raw.order_number || raw.orderNumber || raw.id,
    status: normalizeStatus(raw.status || raw.order_status || raw.state || 'pending'),
    date: dateStr,
    total: totalVal,
    order_type: orderType,
    order_type_label: orderTypeText(orderType),
    shipping: {
      name,
      phone,
      address: formatAddress(
        raw.shipping_address || shippingObj.address || raw.address,
        ''
      ),
    },
    shippingFee,
    items: extractItems(raw),
  };
};

const OrderInvoice = ({ order }) => {
  let subtotal = useMemo(() => order.items.reduce((s, i) => s + parseAmount(i.price) * parseAmount(i.quantity, 1), 0), [order.items]);
  const shippingFee = parseAmount(order.shippingFee || 0);
  // If subtotal is zero but order.total exists, back-calc subtotal
  if (!subtotal && Number(order.total || 0) >= 0) {
    const candidate = Number(order.total) - shippingFee;
    if (candidate >= 0) subtotal = candidate;
  }
  const total = useMemo(() => (parseAmount(subtotal) || 0) + shippingFee, [subtotal, shippingFee]);

  const printInvoice = () => {
    const win = window.open('', 'PRINT', 'height=600,width=800');
    if (!win) return;
    win.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <title>فاتورة - ${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 8px; }
          .muted { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #eee; padding: 8px; text-align: right; }
          th { background: #f8fafc; }
          .totals { margin-top: 16px; }
          .totals div { margin: 4px 0; }
        </style>
      </head>
      <body>
        <h1>فاتورة الطلب</h1>
        <div class="muted">رقم الطلب: ${order.id}</div>
        <div class="muted">التاريخ: ${order.date || ''}</div>
        <hr />
        <h3>معلومات الشحن</h3>
        <div>الاسم: ${order.shipping?.name || ''}</div>
        <div>الجوال: ${order.shipping?.phone || ''}</div>
        <div>العنوان: ${order.shipping?.address || ''}</div>
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(i => `
              <tr>
                <td>${i.name}</td>
                <td>${i.quantity}</td>
                <td>${i.price.toFixed(2)} ريال</td>
                <td>${(i.price * i.quantity).toFixed(2)} ريال</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div>المجموع: ${subtotal.toFixed(2)} ريال</div>
          <div>الشحن: ${shippingFee.toFixed(2)} ريال</div>
          <div><strong>الإجمالي: ${total.toFixed(2)} ريال</strong></div>
        </div>
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Card className="border-blue-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>فاتورة الطلب</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={printInvoice}><Printer className="w-4 h-4 ml-2"/> طباعة</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">رقم الطلب</div>
            <div className="font-semibold">{order.id}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">التاريخ</div>
            <div className="font-semibold">{order.date}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">الحالة</div>
            <Badge className={statusColor(order.status)}>{statusText(order.status)}</Badge>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="mb-4">
          <div className="font-semibold">معلومات الشحن</div>
          <div className="text-sm text-gray-700">الاسم: {order.shipping?.name}</div>
          <div className="text-sm text-gray-700">الجوال: {order.shipping?.phone}</div>
          <div className="text-sm text-gray-700">العنوان: {order.shipping?.address || ''}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-gray-600 border-b">
                <th className="py-2">المنتج</th>
                <th className="py-2">الكمية</th>
                <th className="py-2">السعر</th>
                <th className="py-2">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2">{i.name}</td>
                  <td className="py-2">{i.quantity}</td>
                  <td className="py-2">{parseAmount(i.price).toFixed(2)} ريال</td>
                  <td className="py-2">{(parseAmount(i.price) * parseAmount(i.quantity, 1)).toFixed(2)} ريال</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-left mt-4">
          <div className="text-gray-700">المجموع: {parseAmount(subtotal).toFixed(2)} ريال</div>
          <div className="text-gray-700">الشحن: {parseAmount(shippingFee).toFixed(2)} ريال</div>
          <div className="font-bold">الإجمالي: {parseAmount(total).toFixed(2)} ريال</div>
        </div>
      </CardContent>
    </Card>
  );
};

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const res = await orderService.getUserOrders();
        const list = res?.data?.data || res?.data || [];
        const arr = Array.isArray(list) ? list : (Array.isArray(list?.orders) ? list.orders : []);
        // Diagnostics: log raw fields and inferred type
        try {
          console.group('📦 MyOrdersPage: fetched orders');
          if (typeof window !== 'undefined') {
            try { window.__MyOrdersRaw = arr; } catch (_) {}
          }
          arr.slice(0, 20).forEach((o, idx) => {
            const inferred = inferOrderType(o);
            const firstItem = Array.isArray(o?.items) ? o.items[0] : Array.isArray(o?.order_items) ? o.order_items[0] : undefined;
            console.log(`Order[${idx}]`, {
              id: o?.id || o?._id || o?.order_id || o?.orderId,
              order_number: o?.orderNumber || o?.order_number,
              keys: Object.keys(o || {}),
              order_type: o?.order_type,
              type: o?.type,
              orderType: o?.orderType,
              order_type_label: o?.order_type_label,
              order_kind: o?.order_kind,
              order_category: o?.order_category,
              category_name: o?.category_name,
              channel_type: o?.channel_type,
              source: o?.source,
              is_wholesale: o?.is_wholesale,
              isWholesale: o?.isWholesale,
              wholesale: o?.wholesale,
              wholesale_order: o?.wholesale_order,
              meta_order_type: o?.metadata?.order_type || o?.meta?.order_type,
              order_type_nested: o?.order?.type,
              first_item: firstItem ? {
                type: firstItem?.type,
                is_wholesale: firstItem?.is_wholesale,
                isWholesale: firstItem?.isWholesale,
                wholesale: firstItem?.wholesale,
                wholesale_order: firstItem?.wholesale_order,
                wholesale_price: firstItem?.wholesale_price,
                min_qty: firstItem?.min_qty || firstItem?.minQty,
                product_is_wholesale: firstItem?.product?.is_wholesale,
                product_isWholesale: firstItem?.product?.isWholesale,
                product_wholesale_price: firstItem?.product?.wholesale_price,
              } : undefined,
              inferredType: inferred,
            });
          });
          console.groupEnd();
        } catch (diagErr) {
          console.warn('MyOrdersPage diagnostics failed:', diagErr);
        }

        // If API returned a flat list of order items with nested { order, product },
    // group them by order and build proper order objects first.
    let finalOrders = arr;
    try {
      const looksLikeFlatItems = Array.isArray(arr) && arr.length > 0 && arr.every(r => !Array.isArray(r?.items) && r?.order);
      if (looksLikeFlatItems) {
        const groups = new Map();
        arr.forEach((row) => {
          const ord = row.order || {};
          const orderId = ord.id || ord.order_id || row.order_id || row.id || ord.orderId || ord._id;
          if (!orderId) return; // skip if no identifier
          if (!groups.has(orderId)) {
            groups.set(orderId, {
              // carry over common order-level fields; keep raw for inferOrderType()
              ...ord,
              id: ord.order_number || ord.orderNumber || ord.id || orderId,
              order_number: ord.order_number || ord.orderNumber,
              created_at: ord.created_at || ord.createdAt,
              status: ord.status || ord.order_status || ord.state,
              shipping: ord.shipping || ord.shipping_address || ord.address,
              shipping_address: ord.shipping_address || ord.address,
              total: ord.grand_total || ord.total_amount || ord.total,
              shipping_fee: ord.shipping_fee || ord.delivery_fee || ord.shipping_cost,
              items: [],
              // will set wholesale flag if any item indicates wholesale
              wholesale_order: false,
            });
          }
          const g = groups.get(orderId);
          const p = row.product || {};
          // Build an item compatible with our UI + inference
          g.items.push({
            name: row.name || p.name_ar || p.name || 'منتج',
            quantity: row.quantity || row.qty || 1,
            price: row.unit_price || row.price || p.price || 0,
            // keep raw product flags if present for inferOrderType()
            product: {
              ...p,
            },
            // carry original row booleans if any
            is_wholesale: row.is_wholesale,
            isWholesale: row.isWholesale,
            wholesale: row.wholesale,
            wholesale_price: row.wholesale_price || p.wholesale_price,
            min_qty: row.min_qty || row.minQty || p.min_qty || p.minQty,
          });
          // If product indicates wholesale publication, set order-level flag
          const publishedWholesale = p?.published_wholesale === true || p?.publishedWholesale === true || p?.published_wholesale === 'true' || p?.publishedWholesale === 'true' || p?.published_wholesale === 1 || p?.publishedWholesale === 1;
          if (publishedWholesale) {
            g.wholesale_order = true;
          }
        });
        finalOrders = Array.from(groups.values());
      }
    } catch (groupErr) {
      console.warn('MyOrdersPage grouping failed, falling back to raw list:', groupErr);
      finalOrders = arr;
    }

    // Update diagnostics to reflect finalOrders and expose to window for inspection
    try {
      console.group('📦 MyOrdersPage: normalized orders');
      if (typeof window !== 'undefined') {
        try { window.__MyOrdersRaw = finalOrders; } catch (_) {}
      }
      finalOrders.slice(0, 20).forEach((o, idx) => {
        const inferred = inferOrderType(o);
        const firstItem = Array.isArray(o?.items) ? o.items[0] : Array.isArray(o?.order_items) ? o.order_items[0] : undefined;
        console.log(`FinalOrder[${idx}]`, {
          id: o?.id || o?._id || o?.order_id || o?.orderId,
          order_number: o?.orderNumber || o?.order_number,
          keys: Object.keys(o || {}),
          order_type: o?.order_type,
          type: o?.type,
          orderType: o?.orderType,
          order_type_label: o?.order_type_label,
          wholesale_order: o?.wholesale_order,
          first_item: firstItem ? {
            product_keys: Object.keys(firstItem?.product || {}),
            product_published_wholesale: firstItem?.product?.published_wholesale,
          } : undefined,
          inferredType: inferred,
        });
      });
      console.groupEnd();
    } catch (_) {}

    setOrders(finalOrders.map(normalizeOrder));
      } catch (e) {
        console.error('Failed to load orders:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">طلباتي</h1>
      {isLoading ? (
        <div className="text-gray-500">جاري تحميل الطلبات...</div>
      ) : orders.length === 0 ? (
        <div className="text-gray-500">لا توجد طلبات بعد.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o, idx) => (
            <Card key={idx} className="border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">الطلب #{o.id}</CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Order type badge */}
                    <Badge className={orderTypeColor(o.order_type)}>
                      {orderTypeText(o.order_type)}
                    </Badge>
                    <Badge className={statusColor(o.status)}>
                      {statusText(o.status)}
                    </Badge>
                    <Button variant="outline" onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}>
                      {expandedIndex === idx ? 'إخفاء الفاتورة' : 'عرض الفاتورة'}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-1">التاريخ: {o.date}</div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">الاسم</div>
                    <div className="font-semibold">{o.shipping?.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">الجوال</div>
                    <div className="font-semibold">{o.shipping?.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">الإجمالي</div>
                    <div className="font-semibold">{parseAmount(o.total || 0).toFixed(2)} ريال</div>
                  </div>
                </div>
                {expandedIndex === idx && (
                  <OrderInvoice order={o} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
