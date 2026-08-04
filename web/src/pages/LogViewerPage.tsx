import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ScrollText, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, Eye, X, AlertTriangle, CheckCircle, Clock, ShieldCheck } from 'lucide-react';

export const LogViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dropdown options
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [apiKeysList, setApiKeysList] = useState<any[]>([]);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [gameFilter, setGameFilter] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [apiKeyFilter, setApiKeyFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [meta, setMeta] = useState({ page: 1, limit: 20, totalRecords: 0, totalPages: 1 });

  // Inspector Modal State
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchDropdowns = async () => {
    try {
      const [gRes, pRes, kRes] = await Promise.all([
        apiClient.get('/admin/games').catch(() => null),
        apiClient.get('/admin/providers').catch(() => null),
        apiClient.get('/admin/api-keys').catch(() => null),
      ]);
      if (gRes?.data?.data) setGamesList(gRes.data.data);
      if (pRes?.data?.data) setProvidersList(pRes.data.data);
      if (kRes?.data?.data) setApiKeysList(kRes.data.data);
    } catch (err) {
      // Ignore background dropdown fetch error
    }
  };

  const fetchLogs = async (targetPage = page) => {
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
      };

      if (statusFilter) params.status = statusFilter;
      if (gameFilter) params.gameId = gameFilter;
      if (providerFilter) params.providerId = providerFilter;
      if (apiKeyFilter) params.apiKeyId = apiKeyFilter;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate + 'T23:59:59').toISOString();
      if (search.trim()) params.search = search.trim();

      const res = await apiClient.get('/admin/logs', { params });
      if (res.data && res.data.data) {
        setLogs(res.data.data);
        if (res.data.meta) {
          setMeta(res.data.meta);
        }
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/login');
      } else {
        showToast('error', err.response?.data?.message || 'Gagal mengambil data log validasi');
      }
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, statusFilter, gameFilter, providerFilter, apiKeyFilter]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApplyDateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setGameFilter('');
    setProviderFilter('');
    setApiKeyFilter('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

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
        {/* Header & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <ScrollText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Validation Log Viewer</h1>
              <p className="text-xs text-slate-400">Inspeksi visual riwayat transaksi validasi & performa provider</p>
            </div>
          </div>

          <button
            onClick={() => fetchLogs(page)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>

        {/* Filter Bar */}
        <form onSubmit={handleApplyDateSearch} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status Validasi</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="SUCCESS">SUCCESS (Berhasil)</option>
                <option value="FAILED">FAILED (Gagal Total)</option>
                <option value="FALLBACK">FALLBACK (Percobaan Provider)</option>
              </select>
            </div>

            {/* Partner API Key Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Partner / Client API Key</label>
              <select
                value={apiKeyFilter}
                onChange={(e) => { setApiKeyFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Semua Partner</option>
                <option value="legacy">Legacy / Playground Log (Unknown Partner)</option>
                {apiKeysList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.clientName} ({k.keyPrefix}...)
                  </option>
                ))}
              </select>
            </div>

            {/* Game Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Katalog Game</label>
              <select
                value={gameFilter}
                onChange={(e) => { setGameFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Semua Game</option>
                {gamesList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Vendor Provider</label>
              <select
                value={providerFilter}
                onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Semua Provider Vendor</option>
                {providersList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cari User ID / Zone ID</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari ID akun..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Reset Filter
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Terapkan Filter
            </button>
          </div>
        </form>

        {/* Log Table */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Memuat data log validasi...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Tidak ada log validasi yang sesuai kriteria filter
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Waktu (Lokal)</th>
                    <th className="px-5 py-3.5">Partner / Client</th>
                    <th className="px-5 py-3.5">Game & Target ID</th>
                    <th className="px-5 py-3.5">Provider Vendor</th>
                    <th className="px-5 py-3.5">Status & Latency</th>
                    <th className="px-5 py-3.5">Hasil / Error Detail</th>
                    <th className="px-5 py-3.5 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {logs.map((log) => {
                    const isSuccess = log.status === 'SUCCESS';
                    const nickname = log.normalizedResponse?.capabilities?.nickname || log.normalizedResponse?.nickname;

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-slate-200">
                          {log.apiKey ? (
                            <div className="flex items-center gap-1.5">
                              <span>{log.apiKey.clientName}</span>
                              <code className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">
                                {log.apiKey.keyPrefix}...
                              </code>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Playground / Legacy</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-white">{log.game?.name || log.requestJson?.gameCode}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {log.inputUserId} {log.inputZoneId ? `(${log.inputZoneId})` : ''}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-300">
                          {log.provider?.name || log.endpoint?.name || '-'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isSuccess ? (
                              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                SUCCESS
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {log.status}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {log.responseTimeMs}ms
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-[240px] truncate">
                          {isSuccess ? (
                            <span className="text-emerald-300 font-bold">{nickname || 'Nickname verified'}</span>
                          ) : (
                            <span className="text-red-400 font-mono text-[11px] truncate block" title={log.errorMessage || 'Validation Error'}>
                              {log.errorMessage || 'Provider failed'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors border border-slate-700"
                            title="Inspeksi Detail JSON"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Menampilkan halaman <strong>{meta.page}</strong> dari <strong>{meta.totalPages}</strong> ({meta.totalRecords} total log)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspector Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-blue-400" />
                  Detail Log Validasi #{selectedLog.id.substring(0, 8)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(selectedLog.createdAt).toLocaleString('id-ID')} | Latency: {selectedLog.responseTimeMs}ms
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner if Failed */}
            {selectedLog.errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Error Trace Detail:
                </div>
                <div className="font-mono text-[11px] leading-relaxed break-all">
                  {selectedLog.errorMessage}
                </div>
              </div>
            )}

            {/* JSON Viewer Blocks */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Request Input JSON</label>
                <pre className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-blue-300 font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.requestJson, null, 2)}
                </pre>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Normalized Response Output</label>
                <pre className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-emerald-300 font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.normalizedResponse, null, 2)}
                </pre>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Raw Vendor Provider Response</label>
                <pre className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-400 font-mono text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.rawResponse, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewerPage;
