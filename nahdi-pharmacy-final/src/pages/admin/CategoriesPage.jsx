import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSync } from 'react-icons/fa';
import { categoryService } from '../../services/categoryService';
import productService from '../../services/productService';
import { adminApi } from '../../services/adminApi';
import toast from 'react-hot-toast';

const initialForm = {
  name: '',
  description: '',
  image_url: '',
  is_active: true,
  sort_order: 0,
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);

  // Products modal state
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  // Retail selections (local to modal)
  const [retailSelections, setRetailSelections] = useState([]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Public endpoint lists active categories only per backend `GetCategories`
      const res = await categoryService.getCategories();
      const data = res?.data || res; // ApiService may wrap; support both
      setCategories(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      console.error('Failed to fetch categories', e);
      toast.error('فشل في جلب الفئات');
    } finally {
      setLoading(false);
    }
  };

  // Add product to retail selections (avoid duplicates)
  const addRetailProduct = (product) => {
    setRetailSelections((prev) => {
      const pid = product.id || product._id;
      if (!pid) return prev;
      if (prev.some((p) => (p.id || p._id) === pid)) return prev;
      return [...prev, { ...product, quantity: 1 }];
    });
    try { toast.success('تمت إضافة المنتج'); } catch (_) {}
  };

  const removeRetailProduct = (pid) => {
    setRetailSelections((prev) => prev.filter((p) => (p.id || p._id) !== pid));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Normalize URL (force /uploads to use backend files base, never Vite dev origin)
  const normalizeUrl = (u) => {
    if (!u || typeof u !== 'string') return '';

    // Helper to get the correct files base (env or fallback to :8080 in dev)
    const resolveFilesBase = () => {
      const filesBaseEnv = (import.meta?.env?.VITE_FILES_BASE_URL || '').toString().trim();
      if (filesBaseEnv) return filesBaseEnv.replace(/\/$/, '');
      const apiBaseEnv = (import.meta?.env?.VITE_API_BASE_URL || '').toString().trim();
      if (apiBaseEnv) {
        try { return new URL(apiBaseEnv).origin.replace(/\/$/, ''); } catch { return apiBaseEnv.replace(/\/$/, ''); }
      }
      if (typeof window !== 'undefined' && window.location) {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:8080`;
      }
      return 'http://localhost:8080';
    };

    const FILES_BASE = resolveFilesBase();

    // Sanitize: trim, convert backslashes to forward slashes
    let s = u.trim().replace(/\\/g, '/');
    // Normalize common bare paths like 'uploads/...'
    if (s.startsWith('uploads/')) s = `/${s}`;

    // Absolute URL: if path is /uploads, ALWAYS rewrite to files base
    if (/^https?:\/\//i.test(s)) {
      try {
        const urlObj = new URL(s);
        if (urlObj.pathname.startsWith('/uploads')) {
          const rewritten = `${FILES_BASE}${urlObj.pathname}${urlObj.search || ''}`;
          if (import.meta?.env?.DEV) {
            try { console.debug('[normalizeUrl:absolute-rewrite]', { input: s, filesBase: FILES_BASE, rewritten }); } catch {}
          }
          return rewritten;
        }
      } catch {}
      return s; // non-uploads absolute URL: leave as-is
    }

    // Relative URL: prefix with files base
    const resolved = `${FILES_BASE}${s.startsWith('/') ? '' : '/'}${s}`;
    if (import.meta?.env?.DEV) {
      try { console.debug('[normalizeUrl]', { input: u, sanitized: s, filesBase: FILES_BASE, resolved }); } catch {}
    }
    return resolved;
  };

  // Resolve image URL from various possible fields
  const getProductImage = (p) => {
    if (!p) return '';
    const vals = [];
    const pushVal = (v) => {
      if (!v) return;
      if (typeof v === 'string') {
        // normalize common bare paths like 'uploads/..'
        const s = v.startsWith('uploads/') ? `/${v}` : v;
        vals.push(s);
        return;
      }
      if (typeof v === 'object') {
        const candidates = [
          v.url,
          v.path,
          v.src,
          v.href,
          v.download_url,
          v.fileUrl,
          v.file_url,
          v.full_url,
          v.secure_url,
          v.image_url,
          v.original,
          v.original_url,
        ];
        const found = candidates.find((x) => typeof x === 'string' && x.trim().length > 0);
        if (found) {
          vals.push(found);
          return;
        }
      }
    };
    pushVal(p.image_url);
    pushVal(p.imageUrl);
    pushVal(p.image);
    pushVal(p.thumbnail);
    pushVal(p.main_image);
    pushVal(p.photo);
    // Additional possible fields
    pushVal(p.cover_url);
    pushVal(p.imagePath);
    pushVal(p.featured_image);
    // common nested holders
    if (p.cover) pushVal(p.cover);
    if (p.media) {
      const m = Array.isArray(p.media) ? p.media[0] : p.media;
      pushVal(m);
    }
    if (Array.isArray(p.images) && p.images.length) {
      // support arrays of strings or objects
      pushVal(p.images.find((x) => typeof x === 'string' && x.trim()) || p.images[0]);
    }
    if (Array.isArray(p.photos) && p.photos.length) {
      pushVal(p.photos.find((x) => typeof x === 'string' && x.trim()) || p.photos[0]);
    }
    const found = vals.find((v) => typeof v === 'string' && v.trim().length > 0) || '';
    const resolved = normalizeUrl(found);
    if (import.meta?.env?.DEV) {
      // Dev-only trace for product image resolution
      try { console.debug('[getProductImage]', { productId: p.id || p._id, candidates: vals, chosen: found, resolved }); } catch (_) {}
    }
    return resolved;
  };

  // Resolve stock/quantity from various possible fields
  const getProductStock = (p) => {
    if (!p) return undefined;
    const candidates = [
      p.stock,
      p.quantity,
      p.stock_qty,
      p.stock_quantity,
      p.available_quantity,
      p.available_stock,
      p.quantity_available,
      p.qty_available,
      p.inventory,
      p.inventory_quantity,
      p.stockCount,
      p.qty,
    ];
    // number first
    let val = candidates.find((x) => typeof x === 'number');
    if (typeof val === 'number') return val;
    // numeric string
    const sVal = candidates.find((x) => typeof x === 'string' && /^\d+$/.test(x.trim()));
    if (sVal) return parseInt(sVal.trim(), 10);
    if (typeof p.in_stock === 'boolean') return p.in_stock ? 'متوفر' : 'غير متوفر';
    return undefined;
  };

  const filtered = useMemo(() => {
    if (!search) return categories;
    const s = search.toLowerCase();
    return categories.filter(
      (c) => c.name?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s)
    );
  }, [categories, search]);

  const openAdd = () => {
    setEditId(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditId(cat.id);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      image_url: cat.image_url || cat.imageUrl || '',
      is_active: typeof cat.is_active === 'boolean' ? cat.is_active : (cat.isActive ?? true),
      sort_order: cat.sort_order ?? cat.sortOrder ?? 0,
    });
    setShowModal(true);
  };

  const openProducts = async (cat) => {
    setSelectedCategory(cat);
    setShowProductsModal(true);
    setProductsLoading(true);
    setCategoryProducts([]);
    setProductSearch('');
    setRetailSelections([]);
    try {
      // Build robust filters: match by category id OR slug
      const filterParams = {
        // Ensure only active products
        is_active: 'true',
        // Place OR condition inside $and to not override defaults inside fetchProductsByType
        'filters[$and][2][$or][0][categories][id][$eq]': cat.id,
      };
      if (cat.slug) {
        filterParams['filters[$and][2][$or][1][categories][slug][$eq]'] = cat.slug;
      }

      // Explicitly fetch RETAIL products for this category using unified service
      const result = await productService.fetchProductsByType({
        type: 'retail',
        page: 1,
        limit: 200,
        filters: filterParams,
        clientCategoryId: cat.id,
        clientCategorySlug: cat.slug,
      });
      const list = Array.isArray(result?.data) ? result.data : [];
      setCategoryProducts(list);
    } catch (e) {
      console.error('Failed to fetch category products', e);
      toast.error('فشل في جلب منتجات الفئة');
    } finally {
      setProductsLoading(false);
    }
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name?.trim(),
        description: form.description?.trim() || '',
        image_url: form.image_url?.trim() || '',
        is_active: !!form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };

      let result;
      if (editId) {
        result = await adminApi.updateCategory(editId, payload);
      } else {
        result = await adminApi.createCategory(payload);
      }

      if (result?.success) {
        toast.success(editId ? 'تم تحديث الفئة' : 'تم إضافة فئة');
        setShowModal(false);
        setForm(initialForm);
        setEditId(null);
        await loadCategories();
      } else {
        toast.error(result?.message || 'حدث خطأ');
      }
    } catch (e) {
      console.error('Save category error', e);
      toast.error('فشل حفظ الفئة');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    try {
      const res = await adminApi.deleteCategory(id);
      if (res?.success) {
        toast.success('تم حذف الفئة');
        await loadCategories();
      } else {
        toast.error(res?.message || 'تعذر حذف الفئة');
      }
    } catch (e) {
      console.error('Delete category error', e);
      toast.error('فشل حذف الفئة');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-3 md:mb-0">
          <h2 className="text-xl font-semibold">إدارة الفئات</h2>
          <p className="text-sm text-gray-500">إضافة وتعديل وحذف الفئات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadCategories} className="btn btn-secondary flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50">
            <FaSync /> تحديث
          </button>
          <button onClick={openAdd} className="btn btn-primary flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <FaPlus /> إضافة فئة
          </button>
        </div>
      </div>

      <div className="p-4">
        <input
          type="text"
          placeholder="ابحث بالاسم أو الوصف..."
          className="w-full md:w-1/2 border rounded px-3 py-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filtered.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الوصف</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصورة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ترتيب</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نشط</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    <button onClick={() => openProducts(c)} className="text-blue-600 hover:underline">
                      {c.name}
                    </button>
                  </td>
                  <td className="px-4 py-3">{c.description || '-'}</td>
                  <td className="px-4 py-3">
                    {c.image_url || c.imageUrl ? (
                      <img src={normalizeUrl(c.image_url || c.imageUrl)} alt={c.name} className="h-10 w-10 object-cover rounded" />
                    ) : (
                      <span className="text-gray-400">لا توجد</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.sort_order ?? c.sortOrder ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      (c.is_active ?? c.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {(c.is_active ?? c.isActive) ? 'نعم' : 'لا'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left whitespace-nowrap">
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 mx-2 inline-flex items-center gap-1">
                      <FaEdit /> تعديل
                    </button>
                    <button onClick={() => onDelete(c.id)} className="text-red-600 hover:text-red-800 mx-2 inline-flex items-center gap-1">
                      <FaTrash /> حذف
                    </button>
                    <button onClick={() => openProducts(c)} className="text-gray-700 hover:text-gray-900 mx-2 inline-flex items-center gap-1">
                      عرض المنتجات
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">لا توجد فئات مطابقة</div>
      )}

      {/* Products Modal */}
      {showProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                منتجات الفئة: {selectedCategory?.name || ''}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">مختارة:</span>
                <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                  {retailSelections.length}
                </span>
                <button
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => { setShowProductsModal(false); setSelectedCategory(null); }}
                >
                  إغلاق
                </button>
              </div>
            </div>
            <div className="p-4 border-b">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ابحث عن منتج بالاسم أو الوصف أو SKU"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="flex-1 overflow-auto p-4">
              {productsLoading ? (
                <div className="text-center py-16 text-gray-500">جارٍ تحميل المنتجات...</div>
              ) : categoryProducts.length === 0 ? (
                <div className="text-center py-16 text-gray-500">لا توجد منتجات في هذه الفئة</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصورة</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزون</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نشط</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryProducts
                      .filter((p) => {
                        if (!productSearch) return true;
                        const s = productSearch.toLowerCase();
                        return (
                          p.name?.toLowerCase().includes(s) ||
                          p.description?.toLowerCase().includes(s) ||
                          p.sku?.toLowerCase().includes(s)
                        );
                      })
                      .map((p) => (
                        <tr key={p.id || p._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {(() => {
                              const src = getProductImage(p);
                              const altSrc = (() => {
                                try {
                                  const url = new URL(src);
                                  if (url.hostname === 'localhost') return src.replace('://localhost', '://127.0.0.1');
                                  if (url.hostname === '127.0.0.1') return src.replace('://127.0.0.1', '://localhost');
                                } catch (_) {}
                                return src;
                              })();
                              return src ? (
                                <img
                                  src={src}
                                  alt={p.name}
                                  className="h-10 w-10 object-cover rounded"
                                  onError={(e) => {
                                    if (altSrc && altSrc !== src) {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = altSrc;
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-gray-400">—</span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{p.name}</div>
                            <div className="text-xs text-gray-500 line-clamp-2">{p.description}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{p.sku || p.SKU || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{p.price ?? p.unit_price ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{(() => { const s = getProductStock(p); return (s ?? '—'); })()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              (p.is_active ?? p.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {(p.is_active ?? p.isActive) ? 'نعم' : 'لا'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-left">
                            {(() => {
                              const pid = p.id || p._id;
                              const already = retailSelections.some((it) => (it.id || it._id) === pid);
                              return already ? (
                                <div className="inline-flex items-center gap-2">
                                  <span className="text-green-700 text-sm">مضاف</span>
                                  <button
                                    className="text-red-600 hover:text-red-800 text-sm"
                                    onClick={() => removeRetailProduct(pid)}
                                  >
                                    إزالة
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                                  onClick={() => addRetailProduct(p)}
                                >
                                  إضافة
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
            {retailSelections.length > 0 && (
              <div className="border-t p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">عناصر مختارة ({retailSelections.length})</h4>
                  <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setRetailSelections([])}>تفريغ</button>
                </div>
                <div className="max-h-40 overflow-auto divide-y">
                  {retailSelections.map((it) => (
                    <div key={it.id || it._id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => { const src = getProductImage(it); return src ? (
                          <img src={src} alt={it.name} className="h-8 w-8 object-cover rounded" />
                        ) : null; })()}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{it.name}</div>
                          <div className="text-xs text-gray-500">{it.sku || '—'}</div>
                        </div>
                      </div>
                      <button className="text-xs text-red-600 hover:text-red-800" onClick={() => removeRetailProduct(it.id || it._id)}>إزالة</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="px-5 py-4 border-b">
              <h3 className="text-lg font-semibold">{editId ? 'تعديل فئة' : 'إضافة فئة'}</h3>
            </div>
            <form onSubmit={onSubmit} className="p-5 space-y-4">
              <div>
                <label className="block mb-1 text-sm">الاسم</label>
                <input name="name" value={form.name} onChange={onChange} required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block mb-1 text-sm">الوصف</label>
                <textarea name="description" value={form.description} onChange={onChange} rows={3} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block mb-1 text-sm">رابط الصورة</label>
                <input name="image_url" value={form.image_url} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm">ترتيب العرض</label>
                  <input name="sort_order" type="number" value={form.sort_order} onChange={onChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input id="is_active" name="is_active" type="checkbox" checked={!!form.is_active} onChange={onChange} />
                  <label htmlFor="is_active">نشط</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => { setShowModal(false); setEditId(null); }}>
                  إلغاء
                </button>
                <button disabled={saving} type="submit" className={`px-4 py-2 rounded text-white ${saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {saving ? 'جارٍ الحفظ...' : (editId ? 'تحديث' : 'إضافة')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
