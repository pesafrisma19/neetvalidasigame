import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  Wallet,
  Zap,
  Key,
  History,
  CreditCard,
  Building,
  Copy,
  Check,
  RefreshCw,
  Info,
  ShieldCheck,
  X,
  AlertCircle,
} from 'lucide-react';

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    balance: number;
    validationsRemaining: number;
  };
  apiKey: {
    id: string;
    clientName: string;
    keyPrefix: string;
    rateLimit: number;
    createdAt: string;
  } | null;
  recentTransactions: Array<{
    id: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    type: string;
    description: string | null;
    createdAt: string;
  }>;
  recentLogs: Array<{
    id: string;
    inputUserId: string;
    inputZoneId: string | null;
    status: string;
    responseTimeMs: number;
    createdAt: string;
    game: { name: string; code: string } | null;
  }>;
}

export const UserDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'logs'>('transactions');

  // Top-Up Instruction Modal state
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get('/user/dashboard');
      if (res.data && res.data.success) {
        setData(res.data.data);
      } else {
        setErrorMsg(res.data?.message || 'Gagal mengambil data dashboard');
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('user_token');
        navigate('/user/login');
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Error koneksi ke server');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    if (!token) {
      navigate('/user/login');
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const handleCopyMaskedKey = (keyPrefix: string) => {
    navigator.clipboard.writeText(`${keyPrefix}...****`);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400">Memuat Dashboard Partner Portal...</p>
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-slate-900 border border-red-500/30 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Gagal Memuat Dashboard</h3>
        <p className="text-xs text-red-400">{errorMsg}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const { user, apiKey, recentTransactions, recentLogs } = data!;
  const isLowBalance = user.balance < 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">{user.name}</h2>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold rounded-full uppercase">
              Partner User
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <span>{user.email}</span>
            {user.companyName && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Building className="w-3 h-3" />
                  {user.companyName}
                </span>
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => setTopUpModalOpen(true)}
          className="w-full md:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>Top Up Saldo Manual</span>
        </button>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Saldo Credit Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saldo Kredit Aktif</span>
            <div className={`p-2 rounded-xl border ${isLowBalance ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Rp {user.balance.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {isLowBalance ? (
                <span className="text-red-400 font-medium">⚠️ Saldo Kurang (Minimal Rp 100 per hit)</span>
              ) : (
                <span>Saldo mencukupi untuk validasi</span>
              )}
            </p>
          </div>
        </div>

        {/* Card 2: Quota Hits Estimation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Perkiraan Kuota Validasi</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              {user.validationsRemaining.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-400">Hit</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Tarif flat Rp 100 per validasi sukses
            </p>
          </div>
        </div>

        {/* Card 3: Account Info & Bonus */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-lg sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Status Saldo Awal</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Bonus Signup Rp 5.000</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Diterima saat pendaftaran self-service (50 validasi gratis)
            </p>
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">API Key Partner Anda</h3>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg">
            Status: ACTIVE
          </span>
        </div>

        {apiKey ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-950 border border-slate-800 p-4 rounded-xl">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Label Key</span>
              <p className="text-sm font-semibold text-white">{apiKey.clientName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Masked API Key</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  {apiKey.keyPrefix}...****
                </code>
                <button
                  onClick={() => handleCopyMaskedKey(apiKey.keyPrefix)}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
                  title="Salin Key Masked"
                >
                  {keyCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1 md:text-right">
              <span className="text-[11px] text-slate-400 font-medium">Rate Limit</span>
              <p className="text-xs text-slate-300 font-mono">{apiKey.rateLimit} req/min</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Belum ada API Key aktif.</p>
        )}
      </div>

      {/* History & Mutation Tables Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Riwayat Transaksi & Log</h3>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'transactions'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mutasi Saldo ({recentTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'logs'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Log Validasi ({recentLogs.length})
            </button>
          </div>
        </div>

        {/* TAB 1: Balance Transactions Table */}
        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Tipe Transaksi</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Saldo Sebelum</th>
                  <th className="py-3 px-4">Saldo Sesudah</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      Belum ada transaksi mutasi saldo.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => {
                    const isPositive = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(tx.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              tx.type === 'SIGNUP_BONUS'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : tx.type === 'MANUAL_TOPUP_ADMIN'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isPositive ? '+' : ''}Rp {tx.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          Rp {tx.balanceBefore.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-mono font-semibold">
                          Rp {tx.balanceAfter.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {tx.description || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Personal Validation Logs Table */}
        {activeTab === 'logs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4">User ID Input</th>
                  <th className="py-3 px-4">Status Validasi</th>
                  <th className="py-3 px-4">Response Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                      Belum ada riwayat validasi akun.
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {log.game?.name || log.game?.code || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {log.inputUserId} {log.inputZoneId ? `(${log.inputZoneId})` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {log.responseTimeMs} ms
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TOP UP MANUAL INSTRUCTION MODAL */}
      {topUpModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Instruksi Top-Up Saldo Manual</h3>
              </div>
              <button
                onClick={() => setTopUpModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1 text-blue-300">
                <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                  <Info className="w-4 h-4" />
                  <span>Transfer Manual ke Admin</span>
                </div>
                <p className="text-[11px] text-blue-300/90 leading-relaxed">
                  Lakukan transfer sesuai nominal top-up yang diinginkan ke salah satu rekening resmi Admin berikut:
                </p>
              </div>

              {/* Bank Transfer Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Bank BCA</span>
                  <span className="font-mono text-emerald-400 font-bold">123-456-7890</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Atas Nama</span>
                  <span className="font-medium text-slate-200">Admin Validation Platform</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Minimal Top Up</span>
                  <span className="font-mono text-slate-200">Rp 10.000</span>
                </div>
              </div>

              {/* Confirmation Instructions */}
              <div className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
                <p className="font-semibold text-white">Langkah Setelah Transfer:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Sebutkan Email Partner Anda: <strong className="text-emerald-400">{user.email}</strong></li>
                  <li>Kirimkan bukti resi transfer ke Admin via WhatsApp / Telegram.</li>
                  <li>Admin akan memproses verifikasi dan saldo otomatis bertambah di dashboard Anda.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setTopUpModalOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition-colors text-xs"
            >
              Tutup Instruksi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
