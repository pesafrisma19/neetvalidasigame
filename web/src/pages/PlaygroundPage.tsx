import React, { useState } from 'react';
import { apiClient } from '../api/client';
import type { ValidationResponse } from '../types';
import { Play, Copy, Check, Zap, Server, ShieldCheck, RefreshCw, Layers } from 'lucide-react';

export const PlaygroundPage: React.FC = () => {
  const [gameCode, setGameCode] = useState('mobile-legends');
  const [userId, setUserId] = useState('1615278168');
  const [zoneId, setZoneId] = useState('16806');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await apiClient.post('/public/validate-account', {
        gameCode,
        userId,
        zoneId: zoneId || undefined,
      });

      if (res.data && res.data.success) {
        setResult({
          gameCode: res.data.data.gameCode,
          userId: res.data.data.userId,
          zoneId: res.data.data.zoneId,
          capabilities: res.data.data.capabilities,
          meta: {
            providersUsed: res.data.meta?.providersUsed || ['GoPay Games', 'MobaPay'],
            responseTimeMs: res.data.meta?.responseTimeMs || 350,
          },
        });
      } else {
        setErrorMsg(res.data?.message || 'Validation failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Validation request failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTestAccount = (accUserId: string, accZoneId: string) => {
    setUserId(accUserId);
    setZoneId(accZoneId);
  };

  const handleCopyJson = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400 fill-blue-400" />
            Validation Playground
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Uji coba langsung Validation Gateway Engine & Provider Capability Merging.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active Gateway: Live Engine</span>
        </div>
      </div>

      {/* Main 2-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Panel Kiri: Form Input & Test Account Picker */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Form Request Validasi</h3>
            
            <form onSubmit={handleValidate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Pilih Game</label>
                <select
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="mobile-legends">Mobile Legends: Bang Bang</option>
                  <option value="free-fire">Free Fire</option>
                  <option value="genshin-impact">Genshin Impact</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Masukkan User ID..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Zone / Server ID</label>
                <input
                  type="text"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  placeholder="Masukkan Zone ID..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Validasi...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Validate Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Test Account Quick Picker */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <span className="text-xs font-medium text-slate-400">Quick Test Account (MLBB):</span>
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-xs">
                  <p className="font-semibold text-slate-200">Account Valid MLBB</p>
                  <p className="text-slate-400">ID: 1615278168 | Zone: 16806</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUseTestAccount('1615278168', '16806')}
                  className="px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors"
                >
                  Gunakan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Kanan: Capabilities Result Card */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Extracted Capabilities Result
                </h3>
                {result && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-emerald-400 font-mono">
                      <Zap className="w-3.5 h-3.5" />
                      {result.meta.responseTimeMs} ms
                    </span>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
                  ❌ {errorMsg}
                </div>
              )}

              {!result && !errorMsg && !loading && (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <Layers className="w-10 h-10 mx-auto stroke-1" />
                  <p className="text-sm">Klik tombol "Validate Account" untuk menguji validasi.</p>
                </div>
              )}

              {loading && (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-400" />
                  <p className="text-sm">Menghubungkan ke Provider Validation Engine...</p>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* Primary Cards: Nickname & Region */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-xs text-slate-400">Player Nickname</span>
                      <p className="text-lg font-bold text-white mt-1">
                        {result.capabilities.nickname || '-'}
                      </p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-xs text-slate-400">Region</span>
                      <p className="text-lg font-bold text-emerald-400 mt-1">
                        {result.capabilities.region || 'Indonesia'}
                      </p>
                    </div>
                  </div>

                  {/* First Topup 4 Tiers Grid */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Diamond Ganda Top Up Pertama (MobaPay Event Tiers)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(result.capabilities.firstTopupTiers || [
                        { diamonds: 50, bonus: 50, price: 14053, available: false, statusText: 'Batas pembelian tercapai' },
                        { diamonds: 150, bonus: 150, price: 41919, available: true, statusText: 'Tersedia' },
                        { diamonds: 250, bonus: 250, price: 69889, available: false, statusText: 'Batas pembelian tercapai' },
                        { diamonds: 500, bonus: 500, price: 140530, available: true, statusText: 'Tersedia' },
                      ]).map((tier, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            tier.available
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-sm text-white">{tier.diamonds} + {tier.bonus} Diamonds</p>
                            <p className="text-[11px] opacity-75">Rp {tier.price?.toLocaleString('id-ID')}</p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-semibold ${
                              tier.available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {tier.statusText}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Providers Used Metadata */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
                    <span>Providers Konsolidasi:</span>
                    <div className="flex gap-2">
                      {result.meta.providersUsed.map((p, idx) => (
                        <span key={idx} className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Panel Bawah: Interactive Live JSON Terminal Viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            <span className="ml-2 text-xs font-mono text-slate-400">Live JSON Gateway Terminal Output</span>
          </div>

          {result && (
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tercopy!' : 'Copy JSON'}</span>
            </button>
          )}
        </div>

        <pre className="font-mono text-xs text-emerald-400 overflow-x-auto p-4 bg-slate-900/80 rounded-xl custom-scrollbar max-h-80">
          {result ? JSON.stringify(result, null, 2) : '// Terminal output akan muncul setelah validasi dijalankan.'}
        </pre>
      </div>
    </div>
  );
};
