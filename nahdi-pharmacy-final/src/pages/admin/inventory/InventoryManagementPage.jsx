import React, { useState, useEffect } from 'react';
import { 
  FiSearch, 
  FiFilter, 
  FiPlus, 
  FiEdit2, 
  FiList, 
  FiChevronRight, 
  FiChevronLeft, 
  FiDollarSign, 
  FiPackage,
  FiUsers,
  FiBarChart2
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import AddStockModal from '../../../components/admin/inventory/AddStockModal';
import AdjustStockModal from '../../../components/admin/inventory/AdjustStockModal';

const InventoryManagementPage = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    supplier: '',
    branch: '',
    lowStock: false,
    expiryDateFrom: '',
    expiryDateTo: '',
    nearExpiry: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal states
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        // Fetch inventory data
        const [inventoryRes, suppliersRes, branchesRes] = await Promise.all([
          fetch('http://localhost:8080/api/v1/inventory', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:8080/api/v1/suppliers', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:8080/api/v1/branches', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);
        
        if (!inventoryRes.ok) throw new Error('فشل في تحميل بيانات المخزون');
        if (!suppliersRes.ok) throw new Error('فشل في تحميل بيانات الموردين');
        if (!branchesRes.ok) throw new Error('فشل في تحميل بيانات الفروع');
        
        const [inventoryData, suppliersData, branchesData] = await Promise.all([
          inventoryRes.json(),
          suppliersRes.json(),
          branchesRes.json()
        ]);
        
        setInventory(inventoryData);
        setSuppliers(suppliersData);
        setBranches(branchesData);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken]);

  // Calculate inventory summary
  const totalProducts = inventory.length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.stockQuantity * (item.price || 0)), 0);
  const lowStockItems = inventory.filter(item => item.stockQuantity <= (item.lowStockThreshold || 10)).length;

  // Filter inventory based on search and filters
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.productCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = !filters.supplier || item.supplierId === filters.supplier;
    const matchesBranch = !filters.branch || item.branchId === filters.branch;
    const matchesLowStock = !filters.lowStock || item.stockQuantity <= (item.lowStockThreshold || 10);
    
    // Check expiration date filters
    let matchesExpiryDate = true;
    if (filters.expiryDateFrom || filters.expiryDateTo) {
      const expiryDate = new Date(item.expiryDate);
      const fromDate = filters.expiryDateFrom ? new Date(filters.expiryDateFrom) : null;
      const toDate = filters.expiryDateTo ? new Date(filters.expiryDateTo) : null;
      
      if (fromDate && expiryDate < fromDate) matchesExpiryDate = false;
      if (toDate && expiryDate > toDate) matchesExpiryDate = false;
    }
    
    // Check for near expiry (within 30 days)
    const matchesNearExpiry = !filters.nearExpiry || 
      (item.expiryDate && 
       new Date(item.expiryDate) >= new Date() && 
       new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesSupplier && matchesBranch && 
           matchesLowStock && matchesExpiryDate && matchesNearExpiry;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle actions
  const handleAddStock = (productId) => {
    // Navigate to add stock page or open modal
    navigate(`/admin/inventory/${productId}/add-stock`);
  };

  const handleAdjustStock = (productId) => {
    // Navigate to adjust stock page or open modal
    navigate(`/admin/inventory/${productId}/adjust`);
  };

  const handleViewHistory = (productId) => {
    // Navigate to view history page
    navigate(`/admin/inventory/${productId}/history`);
  };

  // Handle stock addition success
  const handleStockAdded = (updatedProduct) => {
    setInventory(inventory.map(item => 
      item.id === updatedProduct.id ? { ...item, ...updatedProduct } : item
    ));
    setSelectedProduct(null);
  };

  // Handle stock adjustment success
  const handleStockAdjusted = (updatedProduct) => {
    setInventory(inventory.map(item => 
      item.id === updatedProduct.id ? { ...item, ...updatedProduct } : item
    ));
    setSelectedProduct(null);
  };

  // Open add stock modal
  const openAddStockModal = (product) => {
    setSelectedProduct(product);
    setShowAddStockModal(true);
  };

  // Open adjust stock modal
  const openAdjustStockModal = (product) => {
    setSelectedProduct(product);
    setShowAdjustStockModal(true);
  };

  // View transaction history
  const viewTransactionHistory = (productId) => {
    navigate(`/admin/inventory/transactions/${productId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">إدارة المخزون</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/admin/inventory/suppliers')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
          >
            <FiUsers className="ml-2" />
            <span>أرصدة الموردين</span>
          </button>
          <button
            onClick={() => navigate('/admin/inventory/reports')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
          >
            <FiBarChart2 className="ml-2" />
            <span>التقارير</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FiPackage className="h-6 w-6" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">إجمالي المنتجات</p>
              <p className="text-2xl font-semibold text-gray-900">{totalProducts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <FiDollarSign className="h-6 w-6" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">إجمالي القيمة</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Intl.NumberFormat('ar-SA', {
                  style: 'currency',
                  currency: 'SAR',
                  minimumFractionDigits: 2
                }).format(totalValue)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <FiPackage className="h-6 w-6" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">منتجات منخفضة المخزون</p>
              <p className="text-2xl font-semibold text-gray-900">
                {lowStockItems}
                <span className="text-sm font-normal text-gray-500 mr-2">من {totalProducts} منتج</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
          
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={filters.supplier}
              onChange={(e) => setFilters({...filters, supplier: e.target.value})}
            >
              <option value="">جميع الموردين</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="lowStock"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={filters.lowStock}
                onChange={(e) => setFilters({...filters, lowStock: e.target.checked})}
              />
              <label htmlFor="lowStock" className="text-sm text-gray-700 whitespace-nowrap">
                المخزون المنخفض فقط
              </label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="nearExpiry"
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                checked={filters.nearExpiry}
                onChange={(e) => setFilters({...filters, nearExpiry: e.target.checked})}
              />
              <label htmlFor="nearExpiry" className="text-sm text-gray-700 whitespace-nowrap">
                قرب انتهاء الصلاحية (30 يوم)
              </label>
            </div>
          </div>
        </div>
        
        {/* Advanced Filters (initially hidden) */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <FiFilter className="ml-1" />
              {showAdvancedFilters ? 'إخفاء الفلاتر المتقدمة' : 'عرض الفلاتر المتقدمة'}
            </button>
            
            {(filters.expiryDateFrom || filters.expiryDateTo || filters.nearExpiry) && (
              <button
                type="button"
                onClick={() => setFilters({
                  ...filters, 
                  expiryDateFrom: '', 
                  expiryDateTo: '',
                  nearExpiry: false
                })}
                className="text-xs text-red-600 hover:text-red-800"
              >
                مسح فلتر التاريخ
              </button>
            )}
          </div>
          
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={filters.branch}
                  onChange={(e) => setFilters({...filters, branch: e.target.value})}
                >
                  <option value="">جميع الفروع</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                <div className="flex space-x-2 space-x-reverse">
                  <input
                    type="number"
                    placeholder="من"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={filters.minQuantity || ''}
                    onChange={(e) => setFilters({...filters, minQuantity: e.target.value ? parseInt(e.target.value) : null})}
                  />
                  <input
                    type="number"
                    placeholder="إلى"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={filters.maxQuantity || ''}
                    onChange={(e) => setFilters({...filters, maxQuantity: e.target.value ? parseInt(e.target.value) : null})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ انتهاء الصلاحية</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">من</span>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={filters.expiryDateFrom || ''}
                      onChange={(e) => setFilters({...filters, expiryDateFrom: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">إلى</span>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={filters.expiryDateTo || ''}
                      min={filters.expiryDateFrom || ''}
                      onChange={(e) => setFilters({...filters, expiryDateTo: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإضافة</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={filters.addedDate || ''}
                  onChange={(e) => setFilters({...filters, addedDate: e.target.value})}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم المنتج
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الكمية المتوفرة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المورد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  السعر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاريخ الانتهاء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center">
                          <FiPackage className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-sm text-gray-500">{item.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.quantity < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.quantity} {item.unit || 'قطعة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.supplierName || 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.price?.toFixed(2)} ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.expiryDate ? (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          new Date(item.expiryDate) < new Date() ? 'bg-red-100 text-red-800' :
                          new Date(item.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 
                          'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {new Date(item.expiryDate).toLocaleDateString('ar-SA')}
                          {new Date(item.expiryDate) < new Date() && ' (منتهي)'}
                          {new Date(item.expiryDate) >= new Date() && 
                           new Date(item.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && 
                           ' (قريب)'}
                        </span>
                      ) : 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2 space-x-reverse">
                        <button
                          onClick={() => openAddStockModal(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-full"
                          title="إضافة كمية"
                        >
                          <FiPlus className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openAdjustStockModal(item)}
                          className="p-1 text-yellow-600 hover:bg-yellow-50 rounded-full"
                          title="تعديل الكمية"
                        >
                          <FiEdit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => viewTransactionHistory(item.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded-full"
                          title="سجل الحركات"
                        >
                          <FiList className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    لا توجد منتجات في المخزون
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض <span className="font-medium">{indexOfFirstItem + 1}</span> إلى{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredInventory.length)}
                  </span>{' '}
                  من <span className="font-medium">{filteredInventory.length}</span> نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">السابق</span>
                    <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">التالي</span>
                    <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {selectedProduct && (
        <>
          <AddStockModal
            isOpen={showAddStockModal}
            onClose={() => {
              setShowAddStockModal(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            onSuccess={handleStockAdded}
          />
          
          <AdjustStockModal
            isOpen={showAdjustStockModal}
            onClose={() => {
              setShowAdjustStockModal(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            onSuccess={handleStockAdjusted}
          />
        </>
      )}
    </div>
  );
};

export default InventoryManagementPage;
