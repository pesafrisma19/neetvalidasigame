import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Key, Plus, Search, Copy, Check, Edit3, Trash2, RotateCcw, ShieldCheck, AlertTriangle, X, RefreshCw } from 'lucide-react';

export const ApiKeyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    rateLimit: 100,
    isActive: true,
  });

  // Critical One-Time Key Display Modal State
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchApiKeys = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const endpoint = activeTab === 'trash' ? '/admin/trash/api-keys' : '/admin/api-keys';
      const res = await apiClient.get(endpoint);
      if (res.data && res.data.data) {
        setData(res.data.data);
      } else {
        setData([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/login');
      } else {
        showToast('error', err.response?.data?.message || 'Gagal mengambil data API Key');
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [activeTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedId(null);
    setFormData({
      clientName: '',
      rateLimit: 100,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setModalMode('edit');
    setSelectedId(item.id);
    setFormData({
      clientName: item.clientName,
      rateLimit: item.rateLimit,
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      showToast('error', 'Nama Client wajib diisi');
      return;
    }

    try {
      if (modalMode === 'create') {
        const res = await apiClient.post('/admin/api-keys', {
          clientName: formData.clientName,
          rateLimit: Number(formData.rateLimit),
        });

        setIsModalOpen(false);
        fetchApiKeys();

        // Trigger One-Time Raw Key Display Modal
        if (res.data?.data?.rawKey) {
          setCreatedRawKey(res.data.data.rawKey);
        } else {
          showToast('success', 'API Key berhasil dibuat');
        }
      } else if (modalMode === 'edit' && selectedId) {
        await apiClient.put(`/admin/api-keys/${selectedId}`, {
          clientName: formData.clientName,
          rateLimit: Number(formData.rateLimit),
          isActive: formData.isActive,
        });

        setIsModalOpen(false);
        showToast('success', 'API Key berhasil diperbarui');
        fetchApiKeys();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan API Key');
    }
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin mencabut (revoke) API Key untuk client "${name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/api-keys/${id}`);
      showToast('success', 'API Key berhasil dicabut');
      fetchApiKeys();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal mencabut API Key');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiClient.post(`/admin/restore/api-keys/${id}`);
      showToast('success', 'API Key berhasil dipulihkan');
      fetchApiKeys();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal memulihkan API Key');
    }
  };

  const handleCopyRawKey = () => {
    if (createdRawKey) {
      navigator.clipboard.writeText(createdRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const filteredData = data.filter(
    (item) =>
      item.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      item.keyPrefix?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : 'bg-red-950/90 text-red-300 border-red-500/40'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">API Key Management</h1>
              <p className="text-xs text-slate-400">Kelola kredensial autentikasi & rate limit partner Web Topup</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchApiKeys}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Rilis API Key Baru
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Active vs Trash Tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Aktif ({activeTab === 'active' ? data.length : '...'})
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'trash'
                  ? 'bg-red-600/30 text-red-300 border border-red-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tempat Sampah / Revoked ({activeTab === 'trash' ? data.length : '...'})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari client name atau key prefix..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Memuat data API Keys...</div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              {search ? 'Tidak ada API Key yang sesuai pencarian' : 'Belum ada API Key terdaftar'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Client Name</th>
                    <th className="px-6 py-4">Key Prefix</th>
                    <th className="px-6 py-4">Rate Limit</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Dibuat Pada</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{item.clientName}</td>
                      <td className="px-6 py-4">
                        <code className="px-2.5 py-1 bg-slate-950 text-blue-400 rounded-lg border border-slate-800 font-mono text-[11px]">
                          {item.keyPrefix}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg border border-slate-700">
                          {item.rateLimit} req/menit
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.isActive ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold">
                            REVOKED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {activeTab === 'active' ? (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors border border-slate-700"
                              title="Edit API Key"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSoftDelete(item.id, item.clientName)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                              title="Revoke API Key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(item.id)}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20 flex items-center gap-1 ml-auto text-xs px-2.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Pulihkan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal (Create / Edit API Key) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                {modalMode === 'create' ? 'Rilis API Key Baru' : 'Edit API Key'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Client / Partner</label>
                <input
                  type="text"
                  placeholder="e.g. Web Topup Lapakgaming / Partner A"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Quota Rate Limit (Req / Menit)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="100"
                  value={formData.rateLimit}
                  onChange={(e) => setFormData({ ...formData, rateLimit: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Set 0 untuk memblokir key total, atau default 100 req/menit.</p>
              </div>

              {modalMode === 'edit' && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs text-slate-300 font-medium">
                    Status Aktif (Centang untuk mengaktifkan)
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-blue-600/20"
                >
                  {modalMode === 'create' ? 'Generate API Key' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Critical One-Time Raw Key Display Modal */}
      {createdRawKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-300 text-xs leading-relaxed">
              <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-200">SIMPAN API KEY INI SEKARANG!</p>
                <p className="text-[11px] text-amber-300/90 mt-0.5">
                  Kunci rahasia di bawah ini <strong>HANYA DITAMPILKAN 1 KALI INI SAJA</strong> dan tidak dapat dilihat lagi di kemudian hari demi keamanan!
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Raw API Key (Copy & Simpan)</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <code className="text-xs text-emerald-400 font-mono font-bold break-all flex-1 select-all">
                  {createdRawKey}
                </code>
                <button
                  onClick={handleCopyRawKey}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shrink-0 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Salin
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCreatedRawKey(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors border border-slate-700"
              >
                Saya Sudah Menyimpan API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyPage;
