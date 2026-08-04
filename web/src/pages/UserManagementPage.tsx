import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Wallet,
  X,
  CheckCircle,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  balance: number;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search, Sorting & Pagination State
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'email' | 'balance'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [meta, setMeta] = useState({ page: 1, limit: 20, totalRecords: 0, totalPages: 1 });

  // Detail Modal State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Top Up Modal State
  const [topUpTargetUser, setTopUpTargetUser] = useState<UserItem | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(10000);
  const [topUpDescription, setTopUpDescription] = useState('');
  const [topUpRefNo, setTopUpRefNo] = useState('');
  const [submittingTopUp, setSubmittingTopUp] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = async (targetPage = page) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        page: targetPage,
        limit,
        sortBy,
        sortOrder,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await apiClient.get('/admin/users', { params });
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
        if (res.data.meta) {
          setMeta(res.data.meta);
        }
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/login');
      } else {
        showToast('error', err.response?.data?.message || 'Gagal mengambil data user');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1);
  };

  const fetchUserDetail = async (userId: string) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/admin/users/${userId}`);
      if (res.data && res.data.success && res.data.data) {
        setSelectedUser(res.data.data);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal mengambil detail user');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenDetailModal = (user: UserItem) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
    fetchUserDetail(user.id);
  };

  const handleOpenTopUpModal = (user: UserItem) => {
    setTopUpTargetUser(user);
    setTopUpAmount(10000);
    setTopUpDescription(`Top-up manual Admin untuk ${user.name}`);
    setTopUpRefNo(`ADM-${Date.now().toString().slice(-6)}`);
    setIsTopUpOpen(true);
  };

  const handleExecuteTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpTargetUser) return;
    if (topUpAmount <= 0) {
      showToast('error', 'Jumlah top up harus lebih besar dari 0');
      return;
    }

    setSubmittingTopUp(true);
    try {
      const res = await apiClient.post(`/admin/users/${topUpTargetUser.id}/topup`, {
        amount: Number(topUpAmount),
        description: topUpDescription.trim() || undefined,
        referenceNo: topUpRefNo.trim() || undefined,
      });

      if (res.data && res.data.success) {
        // 1. Close TopUp Modal
        setIsTopUpOpen(false);

        // 2. Show Success Toast Notification
        showToast('success', res.data.message || `Saldo ${topUpTargetUser.name} berhasil ditambah Rp ${topUpAmount.toLocaleString('id-ID')}`);

        // 3. Refresh Detail User (if detail modal is open for this target user)
        if (isDetailOpen && selectedUser?.id === topUpTargetUser.id) {
          fetchUserDetail(topUpTargetUser.id);
        }

        // 4. Refresh List User Table
        fetchUsers(page);
      } else {
        showToast('error', res.data?.message || 'Gagal memproses top up');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Error koneksi saat memproses top up');
    } finally {
      setSubmittingTopUp(false);
    }
  };

  const toggleSort = (field: 'createdAt' | 'name' | 'email' | 'balance') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            User Management Admin
          </h2>
          <p className="text-xs text-slate-400">Kelola akun partner, pantau saldo, dan lakukan top-up manual.</p>
        </div>

        <button
          onClick={() => fetchUsers(page)}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Nama, Email, Perusahaan..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-20 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium rounded-lg transition-colors"
          >
            Cari
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-400">Urutkan:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('-');
              setSortBy(f as any);
              setSortOrder(o as any);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="createdAt-desc">Pendaftar Terbaru (Terbaru ke Lama)</option>
            <option value="createdAt-asc">Pendaftar Terlama (Lama ke Terbaru)</option>
            <option value="name-asc">Nama (A ke Z)</option>
            <option value="name-desc">Nama (Z ke A)</option>
            <option value="balance-desc">Saldo Tertinggi</option>
            <option value="balance-asc">Saldo Terendah</option>
          </select>
        </div>
      </div>


      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Perusahaan</th>
                <th className="px-4 py-3.5 cursor-pointer hover:text-white" onClick={() => toggleSort('balance')}>
                  <div className="flex items-center gap-1">
                    <span>Saldo (IDR)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 cursor-pointer hover:text-white" onClick={() => toggleSort('createdAt')}>
                  <div className="flex items-center gap-1">
                    <span>Tanggal Daftar</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat data user...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada akun user yang ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {user.companyName || <span className="text-slate-600 italic">-</span>}
                    </td>
                    <td className="px-4 py-3.5 font-bold font-mono text-emerald-400">
                      Rp {user.balance.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3.5">
                      {user.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetailModal(user)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors text-[11px]"
                          title="Lihat Detail Profil User"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>Detail</span>
                        </button>
                        <button
                          onClick={() => handleOpenTopUpModal(user)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors text-[11px] font-medium"
                          title="Top-Up Saldo Manual"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Top Up</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-950/70 border-t border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Menampilkan <span className="text-white font-medium">{users.length}</span> dari{' '}
            <span className="text-white font-medium">{meta.totalRecords}</span> total user
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 rounded-lg border border-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-300 font-medium px-2">
              Halaman {meta.page} dari {meta.totalPages || 1}
            </span>
            <button
              disabled={page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 rounded-lg border border-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detail User */}
      {isDetailOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Detail Profil User</span>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-8 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                Memuat detail profil...
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Nama Lengkap</span>
                    <span className="font-semibold text-white text-sm">{selectedUser.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Email</span>
                    <span className="font-mono text-slate-200">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Perusahaan</span>
                    <span className="text-slate-200">{selectedUser.companyName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Saldo Wallet Saat Ini</span>
                    <span className="font-mono text-base font-bold text-emerald-400">
                      Rp {selectedUser.balance.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                    <span className="text-slate-500 text-[10px]">Status Akun</span>
                    <div className="font-medium text-slate-200">
                      {selectedUser.isActive ? (
                        <span className="text-emerald-400 font-semibold">Aktif</span>
                      ) : (
                        <span className="text-red-400 font-semibold">Nonaktif</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                    <span className="text-slate-500 text-[10px]">Role System</span>
                    <div className="font-medium text-slate-200">{selectedUser.role}</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-slate-500 text-[10px]">User ID (UUID)</span>
                  <div className="font-mono text-[11px] text-slate-300 break-all select-all">{selectedUser.id}</div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-slate-500 text-[10px]">Tanggal Terdaftar</span>
                  <div className="text-slate-300">
                    {new Date(selectedUser.createdAt).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleOpenTopUpModal(selectedUser)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors text-xs"
              >
                <Wallet className="w-4 h-4" />
                <span>Top Up Saldo User Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Top Up Saldo */}
      {isTopUpOpen && topUpTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>Top-Up Saldo Manual</span>
              </div>
              <button
                onClick={() => setIsTopUpOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="text-slate-400">Penerima Top Up:</div>
              <div className="font-bold text-white text-sm">{topUpTargetUser.name}</div>
              <div className="text-[11px] text-slate-400 font-mono">{topUpTargetUser.email}</div>
              <div className="text-[11px] text-emerald-400 pt-1">
                Saldo Saat Ini: <strong>Rp {topUpTargetUser.balance.toLocaleString('id-ID')}</strong>
              </div>
            </div>

            <form onSubmit={handleExecuteTopUp} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nominal Top Up (IDR) *</label>
                <input
                  type="number"
                  min={1}
                  step={1000}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-2 mt-2">
                  {[10000, 50000, 100000, 500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopUpAmount(preset)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-[11px] transition-colors"
                    >
                      +Rp {preset.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  value={topUpDescription}
                  onChange={(e) => setTopUpDescription(e.target.value)}
                  placeholder="Keterangan transaksi topup..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nomor Referensi (Opsional)</label>
                <input
                  type="text"
                  value={topUpRefNo}
                  onChange={(e) => setTopUpRefNo(e.target.value)}
                  placeholder="TF-BCA-XXXXX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingTopUp}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  {submittingTopUp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>Kirim Top Up</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
