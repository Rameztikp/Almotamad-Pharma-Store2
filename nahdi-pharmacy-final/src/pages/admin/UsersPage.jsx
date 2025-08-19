import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaUserPlus, FaUserEdit, FaTrash, FaUserCheck, FaUserTimes } from 'react-icons/fa';
import { adminApi } from '../../services/adminApi';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('admin'); // افتراضي: عرض مستخدمي لوحة التحكم (مسؤول)
  const [statusFilter, setStatusFilter] = useState('all'); // values: all | active | suspended
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // أدوار لوحة التحكم فقط
  const roleOptions = useMemo(() => ([
    { value: 'admin', label: 'مسؤول' },
    { value: 'super_admin', label: 'مشرف عام' },
  ]), []);

  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null, onCancel: null });
  const [pendingRoleChange, setPendingRoleChange] = useState(null); // { id, newRole }

  // Fetch users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
        };
        const res = await adminApi.getUsers(params);
        const data = res?.data?.customers || [];
        const totalCount = res?.data?.total || data.length;

        // Normalize user items to UI shape
        const normalized = data.map((u) => ({
          id: u.id,
          name: u.full_name || u.fullName || '-',
          email: u.email || '-',
          phone: u.phone || '-',
          role: u.role || 'customer',
          account_type: u.account_type || (u.role === 'wholesale' ? 'wholesale' : 'retail'),
          is_active: !!u.is_active,
          created_at: u.created_at,
        }));

        setUsers(normalized);
        setTotal(totalCount);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentPage, itemsPerPage, searchTerm, roleFilter]);

  const handleStatusToggle = (user) => {
    const isActive = !!user.is_active;
    const newActive = !isActive;
    setConfirm({
      open: true,
      title: newActive ? 'تأكيد تفعيل المستخدم' : 'تأكيد تعليق المستخدم',
      message: `هل أنت متأكد من ${newActive ? 'تفعيل' : 'تعليق'} المستخدم "${user.name}"؟`,
      onConfirm: async () => {
        try {
          await adminApi.updateUserStatus(user.id, { isActive: newActive });
          setUsers((prev) => prev.map(u => u.id === user.id ? { ...u, is_active: newActive } : u));
        } catch (error) {
          console.error('Error updating user status:', error);
        } finally {
          setConfirm((c) => ({ ...c, open: false }));
        }
      },
      onCancel: () => setConfirm((c) => ({ ...c, open: false })),
    });
  };

  const handleDeleteUser = (user) => {
    setConfirm({
      open: true,
      title: 'تأكيد حذف المستخدم',
      message: 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        try {
          await adminApi.deleteUser(user.id);
          setUsers((prev) => prev.filter(u => u.id !== user.id));
          setTotal((t) => Math.max(0, t - 1));
        } catch (error) {
          console.error('Error deleting user:', error);
        } finally {
          setConfirm((c) => ({ ...c, open: false }));
        }
      },
      onCancel: () => setConfirm((c) => ({ ...c, open: false })),
    });
  };

  const handleRoleChange = (user, newRole) => {
    if (user.role === newRole) return;
    setPendingRoleChange({ id: user.id, newRole });
    setConfirm({
      open: true,
      title: 'تأكيد تغيير الدور',
      message: `هل تريد تغيير دور المستخدم "${user.name}" إلى "${roleOptions.find(r => r.value === newRole)?.label || newRole}"؟`,
      onConfirm: async () => {
        try {
          await adminApi.updateUser(user.id, { role: newRole });
          setUsers((prev) => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        } catch (error) {
          console.error('Error updating user role:', error);
        } finally {
          setPendingRoleChange(null);
          setConfirm((c) => ({ ...c, open: false }));
        }
      },
      onCancel: () => {
        setPendingRoleChange(null);
        setConfirm((c) => ({ ...c, open: false }));
      },
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone || '').includes(searchTerm);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.is_active : !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil((total || filteredUsers.length) / itemsPerPage));

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">إدارة مستخدمي لوحة التحكم</h2>
            <p className="mt-1 text-sm text-gray-500">عرض وإدارة حسابات المسؤولين والمشرفين</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link
              to="/admin/users/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaUserPlus className="ml-2 -mr-1" />
              إضافة مستخدم جديد
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              بحث
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md p-2 border text-right"
                placeholder="ابحث بالاسم أو البريد الإلكتروني أو الهاتف"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              الدور الإداري
            </label>
            <select
              id="role"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {roleOptions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              الحالة
            </label>
            <select
              id="status"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="suspended">موقوف</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {currentItems.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الاسم
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  البريد الإلكتروني
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الهاتف
                </th>
                {false && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نوع الحساب
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الدور
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاريخ الانضمام
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600">{(user.name || '-').charAt(0)}</span>
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.phone}
                  </td>
                  {false && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.account_type === 'wholesale'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.account_type === 'wholesale' ? 'جملة' : 'تجزئة'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      className="block w-full text-sm border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {roleOptions.filter(r => r.value !== 'all').map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('ar-EG') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2 space-x-reverse">
                      <Link
                        to={`/admin/users/edit/${user.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FaUserEdit className="inline ml-1" />
                        تعديل
                      </Link>
                      <button
                        onClick={() => handleStatusToggle(user)}
                        className={`${user.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                      >
                        {user.is_active ? (
                          <>
                            <FaUserTimes className="inline ml-1" />
                            تعطيل
                          </>
                        ) : (
                          <>
                            <FaUserCheck className="inline ml-1" />
                            تفعيل
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash className="inline ml-1" />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد مستخدمون</h3>
            <p className="mt-1 text-sm text-gray-500">لم يتم العثور على مستخدمين يتطابقون مع معايير البحث.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:justify-end">
            <button
              onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              السابق
            </button>
            <div className="hidden md:flex">
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
                    key={i}
                    onClick={() => paginate(pageNum)}
                    className={`${
                      currentPage === pageNum
                        ? 'bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    } border-t-2 border-transparent px-4 pt-4 pb-3 text-sm font-medium`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 text-right">{confirm.title}</h3>
            </div>
            <div className="px-6 py-4 text-right text-gray-700">
              {confirm.message}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => confirm.onCancel && confirm.onCancel()}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                إلغاء
              </button>
              <button
                onClick={() => confirm.onConfirm && confirm.onConfirm()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
