import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ShieldCheck, UserPlus, Mail, Lock, Building, Copy, Check, AlertTriangle, ArrowRight } from 'lucide-react';

interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  companyName: string | null;
  balance: number;
  role: string;
}

export const UserRegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State for One-Time Raw Key Display
  const [registeredRawKey, setRegisteredRawKey] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<RegisteredUser | null>(null);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.post('/user/register', {
        name,
        email,
        password,
        companyName: companyName.trim() !== '' ? companyName : undefined,
      });

      if (res.data && res.data.success && res.data.data) {
        const { token, user, apiKey } = res.data.data;

        if (apiKey && apiKey.rawKey) {
          setRegisteredRawKey(apiKey.rawKey);
          setPendingToken(token);
          setPendingUser(user);
        } else {
          // Fallback if no rawKey returned
          localStorage.setItem('user_token', token);
          localStorage.setItem('user_info', JSON.stringify(user));
          navigate('/user/dashboard');
        }
      } else {
        setErrorMsg(res.data?.message || 'Pendaftaran gagal');
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMsg('Email sudah terdaftar. Silakan gunakan email lain atau login.');
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Registrasi gagal. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (registeredRawKey) {
      navigator.clipboard.writeText(registeredRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleProceedToDashboard = () => {
    if (pendingToken) {
      localStorage.setItem('user_token', pendingToken);
    }
    if (pendingUser) {
      localStorage.setItem('user_info', JSON.stringify(pendingUser));
    }
    navigate('/user/dashboard');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-2xl border border-emerald-500/30 flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Registrasi Partner Self-Service</h2>
          <p className="text-xs text-slate-400">
            Dapatkan akun partner, API Key instant, dan bonus awal saldo Rp 5.000 (50 hit validasi gratis)
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nama Lengkap *</label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth. Pesa Frisma"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email Partner *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@partner.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nama Perusahaan / Store (Opsional)</label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="cth. NeetGames Store"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password (Min. 6 Karakter) *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Mendaftarkan Akun...' : 'Daftar Akun Partner'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Sudah punya akun partner?{' '}
            <Link to="/user/login" className="text-emerald-400 hover:underline font-medium">
              Login di sini
            </Link>
          </p>
        </div>
      </div>

      {/* ONE-TIME RAW KEY DISPLAY MODAL */}
      {registeredRawKey && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Pendaftaran Partner Berhasil!</h3>
              <p className="text-xs text-slate-400">
                Akun Anda telah diaktifkan dan dikreditkan **Bonus Saldo Awal Rp 5.000**.
              </p>
            </div>

            {/* Amber Critical Alert Box */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>PENTING: PERINGATAN KEAMANAN ONE-TIME DISPLAY</span>
              </div>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                Salin dan simpan API Key di bawah ini di tempat aman. Demi alasan keamanan, **kunci mentah ini hanya ditampilkan SEKALI ini saja** dan tidak akan diperlihatkan kembali di dashboard!
              </p>
            </div>

            {/* Key Container & Copy Button */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">Live API Key Anda (Satu-satunya Tampilan)</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                <code className="flex-1 font-mono text-xs text-emerald-400 break-all select-all">
                  {registeredRawKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Key'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleProceedToDashboard}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <span>Saya Sudah Menyimpan Key & Lanjut ke Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
