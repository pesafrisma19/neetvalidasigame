import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { UserCheck, Mail, Lock, ArrowRight, ShieldAlert } from 'lucide-react';

export const UserLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.post('/user/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.data && res.data.success && res.data.data?.token) {
        localStorage.setItem('user_token', res.data.data.token);
        localStorage.setItem('user_info', JSON.stringify(res.data.data.user));
        navigate('/user/dashboard');
      } else {
        setErrorMsg(res.data?.message || 'Email atau password salah');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setErrorMsg('Email atau password salah. Silakan periksa kembali.');
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Login gagal');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-2xl border border-emerald-500/30 flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Partner Portal Login</h2>
          <p className="text-xs text-slate-400">Masuk untuk mengelola saldo, API Key, dan pantau log validasi</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email Partner</label>
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
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Masuk ke Partner Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="space-y-3 text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
          <p>
            Belum punya akun partner?{' '}
            <Link to="/register" className="text-emerald-400 hover:underline font-medium">
              Daftar Self-Service di sini
            </Link>
          </p>
          <div className="pt-1">
            <Link to="/login" className="text-slate-500 hover:text-slate-300 transition-colors text-[11px] inline-flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Login sebagai Admin Platform</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
