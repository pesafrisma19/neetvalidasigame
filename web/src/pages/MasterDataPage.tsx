import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Database, Search, Plus, Radio, Gamepad2, Layers, RefreshCw, X, Trash2, Edit3, RotateCcw, Archive } from 'lucide-react';

export const MasterDataPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'games' | 'providers' | 'capabilities' | 'mappings'>('games');
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  const [data, setData] = useState<any[]>([]);
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [capabilitiesList, setCapabilitiesList] = useState<any[]>([]);
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
    // Mapping specific fields
    gameId: '',
    capabilityId: '',
    providerId: '',
    endpointId: '',
    slug: '',
    adapterKey: 'GOPAY_ADAPTER',
    priority: 1,
  });

  const fetchMasterData = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const endpoint = viewMode === 'trash' ? `/admin/trash/${activeTab}` : `/admin/${activeTab}`;
      const res = await apiClient.get(endpoint);
      if (res.data && res.data.data) {
        setData(res.data.data);
      } else {
        setData([]);
      }

      // Pre-fetch related dropdown lists for mapping modal
      const [gRes, pRes, cRes] = await Promise.all([
        apiClient.get('/admin/games').catch(() => null),
        apiClient.get('/admin/providers').catch(() => null),
        apiClient.get('/admin/capabilities').catch(() => null),
      ]);

      if (gRes?.data?.data) setGamesList(gRes.data.data);
      if (pRes?.data?.data) setProvidersList(pRes.data.data);
      if (cRes?.data?.data) setCapabilitiesList(cRes.data.data);
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
  }, [activeTab, viewMode]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedId(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      userIdRegex: '',
      zoneIdRegex: '',
      gameId: gamesList[0]?.id || '',
      capabilityId: capabilitiesList[0]?.id || '',
      providerId: providersList[0]?.id || '',
      endpointId: providersList[0]?.endpoints?.[0]?.id || '',
      slug: '',
      adapterKey: 'GOPAY_ADAPTER',
      priority: 1,
    });
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
      gameId: item.gameId || item.game?.id || '',
      capabilityId: item.capabilityId || item.capability?.id || '',
      providerId: item.providerId || item.provider?.id || '',
      endpointId: item.endpointId || item.endpoint?.id || '',
      slug: item.slug || '',
      adapterKey: item.adapterKey || 'GOPAY_ADAPTER',
      priority: item.priority || 1,
    });
    setIsModalOpen(true);
  };

  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let payload: any = { ...formData };
      if (activeTab === 'mappings') {
        payload = {
          gameId: formData.gameId,
          capabilityId: formData.capabilityId,
          providerId: formData.providerId,
          endpointId: formData.endpointId || (providersList.find((p) => p.id === formData.providerId)?.endpoints?.[0]?.id),
          slug: formData.slug,
          adapterKey: formData.adapterKey,
          priority: Number(formData.priority) || 1,
          requestParamMapping: { userId: 'userId', zoneId: 'zoneId' },
          responseFieldMapping: { nickname: 'data.username', region: 'data.countryOrigin' },
        };
      }

      if (modalMode === 'create') {
        await apiClient.post(`/admin/${activeTab}`, payload);
        showToast('success', `Berhasil menambah ${activeTab} baru!`);
      } else if (modalMode === 'edit' && selectedId) {
        await apiClient.put(`/admin/${activeTab}/${selectedId}`, payload);
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
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${name}" ke tempat sampah (Soft Delete)?`)) return;

    setLoading(true);
    try {
      await apiClient.delete(`/admin/${activeTab}/${id}`);
      showToast('success', `Berhasil memindahkan "${name}" ke Recycle Bin`);
      fetchMasterData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menghapus data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreData = async (id: string, name: string) => {
    setLoading(true);
    try {
      await apiClient.post(`/admin/restore/${activeTab}/${id}`);
      showToast('success', `Berhasil memulihkan "${name}" dari Recycle Bin!`);
      fetchMasterData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal memulihkan data');
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
          <p className="text-sm text-slate-400">Kelola Katalog Games, Provider, Capabilities, dan Routing Mappings.</p>
        </div>

        {/* View Mode Switcher: Active Data vs Recycle Bin */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'active' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Active Data</span>
            </button>
            <button
              onClick={() => setViewMode('trash')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'trash' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Recycle Bin 🗑️</span>
            </button>
          </div>

          {viewMode === 'active' && (
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 ${
            activeTab === 'games'
              ? 'bg-slate-800 border-blue-500/50 text-blue-400'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Games Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 ${
            activeTab === 'providers'
              ? 'bg-slate-800 border-blue-500/50 text-blue-400'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Providers</span>
        </button>

        <button
          onClick={() => setActiveTab('capabilities')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 ${
            activeTab === 'capabilities'
              ? 'bg-slate-800 border-blue-500/50 text-blue-400'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Capabilities</span>
        </button>

        <button
          onClick={() => setActiveTab('mappings')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 ${
            activeTab === 'mappings'
              ? 'bg-slate-800 border-blue-500/50 text-blue-400'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Validation Mappings</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari di ${viewMode === 'trash' ? 'Recycle Bin' : 'Daftar Aktif'} ${activeTab}...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={fetchMasterData}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Data Table View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 uppercase tracking-wider text-[11px] text-slate-400">
              <tr>
                {activeTab === 'games' && (
                  <>
                    <th className="p-4">Game Code</th>
                    <th className="p-4">Nama Game</th>
                    <th className="p-4">User ID Regex</th>
                    <th className="p-4">Zone ID Regex</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </>
                )}
                {activeTab === 'providers' && (
                  <>
                    <th className="p-4">Provider Code</th>
                    <th className="p-4">Nama Provider</th>
                    <th className="p-4">Deskripsi</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </>
                )}
                {activeTab === 'capabilities' && (
                  <>
                    <th className="p-4">Code</th>
                    <th className="p-4">Nama Kapabilitas</th>
                    <th className="p-4">Version</th>
                    <th className="p-4 text-right">Aksi</th>
                  </>
                )}
                {activeTab === 'mappings' && (
                  <>
                    <th className="p-4">Game</th>
                    <th className="p-4">Capability</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Adapter Key</th>
                    <th className="p-4">Slug</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4 text-right">Aksi</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    <span>Memuat data master...</span>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    {viewMode === 'trash' ? '🗑️ Tidak ada data di Recycle Bin' : 'Tidak ada data ditemukan.'}
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    {activeTab === 'games' && (
                      <>
                        <td className="p-4 font-mono font-semibold text-blue-400">{item.code}</td>
                        <td className="p-4 font-medium text-white">{item.name}</td>
                        <td className="p-4 font-mono text-slate-400">{item.userIdRegex || '-'}</td>
                        <td className="p-4 font-mono text-slate-400">{item.zoneIdRegex || '-'}</td>
                        <td className="p-4">
                          {viewMode === 'trash' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/30">
                              Soft Deleted
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] ${item.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {activeTab === 'providers' && (
                      <>
                        <td className="p-4 font-mono font-semibold text-purple-400">{item.code}</td>
                        <td className="p-4 font-medium text-white">{item.name}</td>
                        <td className="p-4 text-slate-400">{item.description || '-'}</td>
                        <td className="p-4">
                          {viewMode === 'trash' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/30">
                              Soft Deleted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400">
                              {item.status}
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {activeTab === 'capabilities' && (
                      <>
                        <td className="p-4 font-mono font-semibold text-amber-400">{item.code}</td>
                        <td className="p-4 font-medium text-white">{item.name}</td>
                        <td className="p-4 font-mono text-slate-400">{item.version}</td>
                      </>
                    )}

                    {activeTab === 'mappings' && (
                      <>
                        <td className="p-4 font-medium text-white">{item.game?.name || item.gameId}</td>
                        <td className="p-4 font-mono text-amber-400">{item.capability?.code || item.capabilityId}</td>
                        <td className="p-4 text-slate-300">{item.provider?.name || item.providerId}</td>
                        <td className="p-4 font-mono text-purple-400">{item.adapterKey}</td>
                        <td className="p-4 font-mono text-blue-400">{item.slug}</td>
                        <td className="p-4 font-mono">{item.priority}</td>
                      </>
                    )}

                    <td className="p-4 text-right">
                      {viewMode === 'trash' ? (
                        <button
                          onClick={() => handleRestoreData(item.id, item.name || item.code || 'Record')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 shadow-md shadow-emerald-600/20"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore ↩️</span>
                        </button>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteData(item.id, item.name || item.code || 'Record')}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Soft Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                {modalMode === 'create' ? `Tambah ${activeTab} Baru` : `Edit ${activeTab}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveData} className="space-y-4">
              {activeTab === 'mappings' ? (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Pilih Game</label>
                    <select
                      value={formData.gameId}
                      onChange={(e) => setFormData({ ...formData, gameId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {gamesList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Pilih Capability</label>
                    <select
                      value={formData.capabilityId}
                      onChange={(e) => setFormData({ ...formData, capabilityId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {capabilitiesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} ({c.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Pilih Provider Pihak Ketiga</label>
                    <select
                      value={formData.providerId}
                      onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {providersList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Adapter Strategy Key</label>
                    <select
                      value={formData.adapterKey}
                      onChange={(e) => setFormData({ ...formData, adapterKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="GOPAY_ADAPTER">GOPAY_ADAPTER (GoPay Games)</option>
                      <option value="MOBAPAY_ADAPTER">MOBAPAY_ADAPTER (MobaPay App Shop)</option>
                      <option value="MELPA_ADAPTER">MELPA_ADAPTER (Melpa Digital)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Provider Game Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      placeholder="e.g. mobile-legends atau 100000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Priority Fallback (1 = Utama)</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                      required
                      min={1}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Code / Unique Identifier</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                      placeholder="e.g. free-fire"
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
                      placeholder="e.g. Free Fire"
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
                </>
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
