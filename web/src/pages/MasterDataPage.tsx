import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Database, Search, Plus, Radio, Gamepad2, Layers, RefreshCw, X, Trash2, Edit3, RotateCcw, Archive, ListPlus, Sparkles } from 'lucide-react';

export interface BuilderFieldOption {
  label: string;
  value: string;
}

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

  // Fixed 2-Slot Input Fields State for Games
  // Slot 1: User ID (Always Active)
  const [slot1Label, setSlot1Label] = useState('User ID');
  const [slot1Placeholder, setSlot1Placeholder] = useState('Masukkan User ID...');
  const [slot1SampleValue, setSlot1SampleValue] = useState('');

  // Slot 2: Server / Zone ID (Optional: 'none' | 'text' | 'select')
  const [slot2Mode, setSlot2Mode] = useState<'none' | 'text' | 'select'>('none');
  const [slot2Label, setSlot2Label] = useState('Zone ID');
  const [slot2Placeholder, setSlot2Placeholder] = useState('Masukkan Zone ID...');
  const [slot2SampleValue, setSlot2SampleValue] = useState('');
  const [slot2Options, setSlot2Options] = useState<BuilderFieldOption[]>([
    { label: 'Asia (SEA)', value: 'sea' },
    { label: 'America (LATAM)', value: 'latam' },
  ]);

  // Mapping Config State for GameValidationMapping
  const [userIdParamKey, setUserIdParamKey] = useState('userId');
  const [zoneIdParamKey, setZoneIdParamKey] = useState('zoneId');
  const [nicknameResponsePath, setNicknameResponsePath] = useState('data.username');
  const [regionResponsePath, setRegionResponsePath] = useState('data.countryOrigin');

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
    setSlot1Label('User ID');
    setSlot1Placeholder('Masukkan User ID...');
    setSlot1SampleValue('');
    setSlot2Mode('none');
    setSlot2Label('Zone ID');
    setSlot2Placeholder('Masukkan Zone ID...');
    setSlot2SampleValue('');
    setSlot2Options([
      { label: 'Asia (SEA)', value: 'sea' },
      { label: 'America (LATAM)', value: 'latam' },
    ]);

    setUserIdParamKey('userId');
    setZoneIdParamKey('zoneId');
    setNicknameResponsePath('data.username');
    setRegionResponsePath('data.countryOrigin');

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

    // Populate Mapping Config State if editing a GameValidationMapping
    if (activeTab === 'mappings' || item.adapterKey || item.requestParamMapping) {
      const reqMap = item.requestParamMapping || {};
      const resMap = item.responseFieldMapping || {};

      setUserIdParamKey(reqMap.userId || '');
      setZoneIdParamKey(reqMap.zoneId || '');
      setNicknameResponsePath(resMap.nickname || '');
      setRegionResponsePath(resMap.region || '');
    }

    // Populate Slot 1 & Slot 2 state from existing inputFields
    const fields = item.inputFields?.fields;
    if (Array.isArray(fields) && fields.length > 0) {
      const userField = fields.find((f: any) => f.key === 'userId');
      if (userField) {
        setSlot1Label(userField.label || 'User ID');
        setSlot1Placeholder(userField.placeholder || 'Masukkan User ID...');
        setSlot1SampleValue(userField.sampleValue || '');
      } else {
        setSlot1Label('User ID');
        setSlot1Placeholder('Masukkan User ID...');
        setSlot1SampleValue('');
      }

      const zoneField = fields.find((f: any) => f.key === 'zoneId');
      if (zoneField) {
        setSlot2SampleValue(zoneField.sampleValue || '');
        if (zoneField.type === 'select') {
          setSlot2Mode('select');
          setSlot2Label(zoneField.label || 'Pilih Server');
          setSlot2Placeholder(zoneField.placeholder || 'Pilih Server...');
          setSlot2Options(zoneField.options && zoneField.options.length > 0 ? zoneField.options : [{ label: 'Asia', value: 'sea' }]);
        } else {
          setSlot2Mode('text');
          setSlot2Label(zoneField.label || 'Zone ID');
          setSlot2Placeholder(zoneField.placeholder || 'Masukkan Zone ID...');
        }
      } else {
        setSlot2Mode('none');
        setSlot2Label('Zone ID');
        setSlot2Placeholder('Masukkan Zone ID...');
        setSlot2SampleValue('');
      }
    } else {
      setSlot1Label('User ID');
      setSlot1Placeholder('Masukkan User ID...');
      setSlot1SampleValue('');
      setSlot2Mode('none');
      setSlot2SampleValue('');
    }
    setIsModalOpen(true);
  };

  // Helper functions for Slot 2 Options
  const addSlot2Option = () => {
    setSlot2Options([
      ...slot2Options,
      { label: `Opsi ${slot2Options.length + 1}`, value: `opt_${slot2Options.length + 1}` },
    ]);
  };

  const removeSlot2Option = (index: number) => {
    setSlot2Options(slot2Options.filter((_, i) => i !== index));
  };

  const updateSlot2Option = (index: number, key: 'label' | 'value', val: string) => {
    const updated = [...slot2Options];
    if (updated[index]) {
      updated[index][key] = val;
    }
    setSlot2Options(updated);
  };

  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let payload: any = { ...formData };

      if (activeTab === 'games') {
        const fields: any[] = [
          {
            key: 'userId',
            label: slot1Label || 'User ID',
            type: 'text',
            required: true,
            placeholder: slot1Placeholder || 'Masukkan User ID...',
            sampleValue: slot1SampleValue.trim() || undefined,
          },
        ];

        if (slot2Mode === 'text') {
          fields.push({
            key: 'zoneId',
            label: slot2Label || 'Zone ID',
            type: 'text',
            required: true,
            placeholder: slot2Placeholder || 'Masukkan Zone ID...',
            sampleValue: slot2SampleValue.trim() || undefined,
          });
        } else if (slot2Mode === 'select') {
          fields.push({
            key: 'zoneId',
            label: slot2Label || 'Pilih Server',
            type: 'select',
            required: true,
            placeholder: slot2Placeholder || 'Pilih Server...',
            options: slot2Options,
            sampleValue: slot2SampleValue.trim() || (slot2Options[0]?.value || undefined),
          });
        }

        payload = {
          code: formData.code,
          name: formData.name,
          userIdRegex: formData.userIdRegex || undefined,
          zoneIdRegex: slot2Mode === 'text' ? (formData.zoneIdRegex || undefined) : undefined,
          inputFields: { fields },
        };
      } else if (activeTab === 'mappings') {
        payload = {
          gameId: formData.gameId,
          capabilityId: formData.capabilityId,
          providerId: formData.providerId,
          endpointId: formData.endpointId || (providersList.find((p) => p.id === formData.providerId)?.endpoints?.[0]?.id),
          slug: formData.slug,
          adapterKey: formData.adapterKey,
          priority: Number(formData.priority) || 1,
          requestParamMapping: {
            userId: userIdParamKey.trim() || 'userId',
            zoneId: zoneIdParamKey.trim() || 'zoneId',
          },
          responseFieldMapping: {
            nickname: nicknameResponsePath.trim() || 'data.username',
            region: regionResponsePath.trim() || undefined,
          },
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
          <span>Game Validation Mappings</span>
        </button>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari data ${activeTab}...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Total Data: <span className="text-white font-bold">{filteredData.length}</span> items
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Details / Name</th>
                <th className="px-4 py-3">Code / Slug</th>
                <th className="px-4 py-3">Additional Info</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    Memuat data master...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada data ditemukan untuk {activeTab} ({viewMode})
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const sampleUser = item.inputFields?.fields?.find((f: any) => f.key === 'userId')?.sampleValue;
                  const sampleZone = item.inputFields?.fields?.find((f: any) => f.key === 'zoneId')?.sampleValue;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-100 font-sans">
                          {item.name || item.game?.name || 'Unnamed Record'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex flex-wrap items-center gap-2">
                          <span>{item.id}</span>
                          {activeTab === 'games' && sampleUser && (
                            <span className="text-[10px] text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Sample: {sampleUser}{sampleZone ? ` (${sampleZone})` : ''}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-400">
                        {item.code || item.slug || item.adapterKey || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {activeTab === 'games' && (
                          <div>
                            <span>Fields: {item.inputFields?.fields?.length || 0} fields</span>
                            {item.userIdRegex && <span className="ml-2 text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono">Regex: Yes</span>}
                          </div>
                        )}
                        {activeTab === 'mappings' && (
                          <div className="text-[11px] space-y-1 font-mono">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-slate-200 font-sans font-semibold">{item.game?.name || item.gameId}</span>
                              {item.capability?.code && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono flex items-center gap-1 shadow-sm">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>{item.capability.code}</span>
                                </span>
                              )}
                            </div>
                            <div>Adapter: <span className="text-purple-400 font-bold">{item.adapterKey}</span></div>
                            {item.requestParamMapping && (
                              <div className="text-[10px] text-slate-500">
                                Params: <span className="text-blue-300">
                                  {Object.entries(item.requestParamMapping).map(([k, v]) => `${k}=${v}`).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {activeTab === 'providers' && item.description}
                        {activeTab === 'capabilities' && item.description}
                      </td>
                      <td className="px-4 py-3 text-right">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                      onChange={(e) => {
                        const newAdapter = e.target.value;
                        setFormData({ ...formData, adapterKey: newAdapter });
                        if (newAdapter === 'MELPA_ADAPTER') {
                          setUserIdParamKey('id');
                          setZoneIdParamKey('zone');
                          setNicknameResponsePath('data.username');
                          setRegionResponsePath('data.region');
                        } else if (newAdapter === 'SUPERSUS_ADAPTER') {
                          setUserIdParamKey('userId');
                          setZoneIdParamKey('zoneId');
                          setNicknameResponsePath('data.name');
                          setRegionResponsePath('');
                        } else {
                          setUserIdParamKey('userId');
                          setZoneIdParamKey('zoneId');
                          setNicknameResponsePath('data.username');
                          setRegionResponsePath('data.countryOrigin');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="GOPAY_ADAPTER">GOPAY_ADAPTER (GoPay Games)</option>
                      <option value="MOBAPAY_ADAPTER">MOBAPAY_ADAPTER (MobaPay App Shop)</option>
                      <option value="MELPA_ADAPTER">MELPA_ADAPTER (Melpa Digital)</option>
                      <option value="SUPERSUS_ADAPTER">SUPERSUS_ADAPTER (Super Sus WebPay API)</option>
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

                  {/* DYNAMIC SECTION 1: REQUEST PARAMETER MAPPING */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                      Request Parameter Mapping (Key Outgoing Query/Body)
                    </label>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">User ID Param Key *</label>
                        <input
                          type="text"
                          value={userIdParamKey}
                          onChange={(e) => setUserIdParamKey(e.target.value)}
                          required
                          placeholder="e.g. id (Melpa) / userId (GoPay)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Zone ID Param Key *</label>
                        <input
                          type="text"
                          value={zoneIdParamKey}
                          onChange={(e) => setZoneIdParamKey(e.target.value)}
                          required
                          placeholder="e.g. zone (Melpa) / zoneId (GoPay)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DYNAMIC SECTION 2: RESPONSE FIELD MAPPING */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                      Response Field Mapping (JSON Path Extraction)
                    </label>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Nickname Path *</label>
                        <input
                          type="text"
                          value={nicknameResponsePath}
                          onChange={(e) => setNicknameResponsePath(e.target.value)}
                          required
                          placeholder="e.g. data.username / data.name"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Region Path (Opsional)</label>
                        <input
                          type="text"
                          value={regionResponsePath}
                          onChange={(e) => setRegionResponsePath(e.target.value)}
                          placeholder="e.g. data.countryOrigin / data.region"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Code / Unique Identifier *</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                        placeholder="e.g. blood-strike"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nama Game / Record *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. Blood Strike"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  {activeTab === 'games' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
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
                        {slot2Mode === 'text' && (
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
                        )}
                      </div>

                      {/* FIXED 2-SLOT FIELD BUILDER UI FOR GAMES */}
                      <div className="pt-4 border-t border-slate-800/80 space-y-4">
                        <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <ListPlus className="w-4 h-4 text-blue-400" />
                          <span>Input Fields Schema Config (Fix 2 Slots)</span>
                        </label>

                        {/* SLOT 1: USER ID (FIXED, ALWAYS ACTIVE) */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                              <span>Slot 1: User ID</span>
                              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-mono">key: "userId"</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                              Selalu Aktif (Wajib)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Label Tampilan *</label>
                              <input
                                type="text"
                                value={slot1Label}
                                onChange={(e) => setSlot1Label(e.target.value)}
                                required
                                placeholder="e.g. User ID"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Placeholder Text *</label>
                              <input
                                type="text"
                                value={slot1Placeholder}
                                onChange={(e) => setSlot1Placeholder(e.target.value)}
                                required
                                placeholder="e.g. Masukkan User ID..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-amber-400 font-semibold mb-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>Sample User ID (Opsional)</span>
                              </label>
                              <input
                                type="text"
                                value={slot1SampleValue}
                                onChange={(e) => setSlot1SampleValue(e.target.value)}
                                placeholder="e.g. 864789196"
                                className="w-full bg-slate-900 border border-amber-800/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* SLOT 2: SERVER / ZONE ID (OPTIONAL TOGGLE) */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-2 gap-2">
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                              <span>Slot 2: Server / Zone ID</span>
                              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono">key: "zoneId"</span>
                            </span>

                            {/* Mode Radio Toggle */}
                            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setSlot2Mode('none')}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                  slot2Mode === 'none' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Tidak Perlu
                              </button>
                              <button
                                type="button"
                                onClick={() => setSlot2Mode('text')}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                  slot2Mode === 'text' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Text Bebas
                              </button>
                              <button
                                type="button"
                                onClick={() => setSlot2Mode('select')}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                  slot2Mode === 'select' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Dropdown Pilihan
                              </button>
                            </div>
                          </div>

                          {slot2Mode === 'none' && (
                            <p className="text-[11px] text-slate-500 italic">
                              Game ini hanya membutuhkan User ID saja (e.g. Free Fire). Field Zone ID tidak akan ditampilkan di form.
                            </p>
                          )}

                          {(slot2Mode === 'text' || slot2Mode === 'select') && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Label Tampilan *</label>
                                  <input
                                    type="text"
                                    value={slot2Label}
                                    onChange={(e) => setSlot2Label(e.target.value)}
                                    required
                                    placeholder={slot2Mode === 'select' ? 'e.g. Pilih Server' : 'e.g. Zone ID'}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Placeholder Text *</label>
                                  <input
                                    type="text"
                                    value={slot2Placeholder}
                                    onChange={(e) => setSlot2Placeholder(e.target.value)}
                                    required
                                    placeholder={slot2Mode === 'select' ? 'e.g. Pilih Server...' : 'e.g. Masukkan Zone ID...'}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500"
                                  />
                                </div>

                                {/* SAMPLE ZONE ID FIELD: TEXT VS SELECT PICKER */}
                                <div>
                                  <label className="block text-[10px] text-amber-400 font-semibold mb-1 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span>Sample Server (Opsional)</span>
                                  </label>

                                  {slot2Mode === 'select' ? (
                                    <select
                                      value={slot2SampleValue}
                                      onChange={(e) => setSlot2SampleValue(e.target.value)}
                                      className="w-full bg-slate-900 border border-amber-800/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500 font-medium"
                                    >
                                      <option value="">-- Pilih Sampel Server --</option>
                                      {slot2Options.map((opt, idx) => (
                                        <option key={idx} value={opt.value}>
                                          {opt.label} ({opt.value})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={slot2SampleValue}
                                      onChange={(e) => setSlot2SampleValue(e.target.value)}
                                      placeholder="e.g. 16806"
                                      className="w-full bg-slate-900 border border-amber-800/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500"
                                    />
                                  )}
                                </div>
                              </div>

                              {/* DROPDOWN OPTIONS LIST IF SLOT 2 MODE === SELECT */}
                              {slot2Mode === 'select' && (
                                <div className="pt-2 border-t border-slate-900 space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                      Daftar Opsi Dropdown Server:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={addSlot2Option}
                                      className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-950/60 px-2 py-1 rounded border border-amber-800 font-medium flex items-center gap-1 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Tambah Opsi</span>
                                    </button>
                                  </div>

                                  <div className="space-y-1.5">
                                    {slot2Options.map((opt, optIdx) => (
                                      <div key={optIdx} className="flex items-center gap-2 text-xs">
                                        <input
                                          type="text"
                                          value={opt.label}
                                          onChange={(e) => updateSlot2Option(optIdx, 'label', e.target.value)}
                                          placeholder="Label Tampilan (e.g. Asia)"
                                          required
                                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                                        />
                                        <input
                                          type="text"
                                          value={opt.value}
                                          onChange={(e) => updateSlot2Option(optIdx, 'value', e.target.value)}
                                          placeholder="Value Code (e.g. os_asia)"
                                          required
                                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                                        />
                                        {slot2Options.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => removeSlot2Option(optIdx)}
                                            className="text-slate-500 hover:text-red-400 p-1"
                                            title="Hapus Opsi"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Simpan Baru' : 'Update Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
