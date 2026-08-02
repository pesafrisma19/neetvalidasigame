import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Database, Search, Plus, Radio, Gamepad2, Layers, RefreshCw, X, Trash2, Edit3 } from 'lucide-react';

export const MasterDataPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'games' | 'providers' | 'capabilities' | 'mappings'>('games');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    userIdRegex: '',
    zoneIdRegex: '',
  });

  const fetchMasterData = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const endpoint = `/admin/${activeTab}`;
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
        showToast('error', err.response?.data?.message || 'Gagal mengambil data master');
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [activeTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedId(null);
    setFormData({ code: '', name: '', description: '', userIdRegex: '', zoneIdRegex: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setModalMode('edit');
    setSelectedId(item.id);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      userIdRegex: item.userIdRegex || '',
      zoneIdRegex: item.zoneIdRegex || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalMode === 'create') {
        await apiClient.post(`/admin/${activeTab}`, formData);
        showToast('success', `Berhasil menambah ${activeTab} baru!`);
      } else if (modalMode === 'edit' && selectedId) {
        await apiClient.put(`/admin/${activeTab}/${selectedId}`, formData);
        showToast('success', `Berhasil memperbarui data ${activeTab}!`);
      }
      setIsModalOpen(false);
      fetchMasterData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Operasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${name}"?`)) return;

    setLoading(true);
    try {
      await apiClient.delete(`/admin/${activeTab}/${id}`);
      showToast('success', `Berhasil menghapus "${name}"`);
      fetchMasterData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menghapus data');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
              : 'bg-red-950 border-red-800 text-red-300'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Master Data Management
          </h2>
          <p className="text-sm text-slate-400">Pengelolaan Katalog Game, Provider, Capability, dan Endpoint Mapping.</p>
        </div>
        <button
          onClick={fetchMasterData}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {[
          { key: 'games', label: 'Games Catalog', icon: Gamepad2 },
          { key: 'providers', label: 'Providers', icon: Radio },
          { key: 'capabilities', label: 'Capabilities', icon: Layers },
          { key: 'mappings', label: 'Validation Mappings', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 bg-slate-900 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari data ${activeTab}...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        {(activeTab === 'games' || activeTab === 'providers') && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah {activeTab}
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            Memuat data {activeTab}...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Tidak ada data {activeTab} ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">ID / Code</th>
                  <th className="px-4 py-3">Nama / Key</th>
                  <th className="px-4 py-3">Details / Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-850">
                    <td className="px-4 py-3 font-mono text-slate-400">{item.code || item.id || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-white">{item.name || item.slug || item.adapterKey || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                        {item.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteData(item.id, item.name || item.code || 'Item')}
                        className="text-red-400 hover:text-red-300 inline-flex items-center gap-1 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Form (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {modalMode === 'create' ? `Tambah ${activeTab} Baru` : `Edit Data ${activeTab}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveData} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Code / Unique Identifier</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  placeholder="e.g. mobile-legends"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nama</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. Mobile Legends: Bang Bang"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {activeTab === 'games' && (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">User ID Regex Check (Opsional)</label>
                    <input
                      type="text"
                      value={formData.userIdRegex}
                      onChange={(e) => setFormData({ ...formData, userIdRegex: e.target.value })}
                      placeholder="e.g. ^[0-9]+$"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Zone ID Regex Check (Opsional)</label>
                    <input
                      type="text"
                      value={formData.zoneIdRegex}
                      onChange={(e) => setFormData({ ...formData, zoneIdRegex: e.target.value })}
                      placeholder="e.g. ^[0-9]+$"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </>
              )}

              {activeTab === 'providers' && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. GoPay Games API Provider"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
