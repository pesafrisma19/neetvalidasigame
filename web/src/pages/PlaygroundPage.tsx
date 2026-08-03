import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { ValidationResponse } from '../types';
import { Play, Copy, Check, Zap, Server, ShieldCheck, RefreshCw, Layers } from 'lucide-react';

export const PlaygroundPage: React.FC = () => {
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [gameCode, setGameCode] = useState('mobile-legends');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingGames, setFetchingGames] = useState(true);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch games list dynamically from public endpoint (No Auth required)
  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await apiClient.get('/public/games');
        if (res.data && res.data.data && res.data.data.length > 0) {
          setGamesList(res.data.data);
          const firstGame = res.data.data[0];
          setGameCode(firstGame.code);
          initFormFields(firstGame);
        }
      } catch (err) {
        // Fallback array if network error
        const fallback = [
          {
            id: '1',
            code: 'free-fire',
            name: 'Free Fire',
            inputFields: {
              fields: [{ key: 'userId', label: 'User ID / Player ID', type: 'text', required: true }],
            },
          },
          {
            id: '2',
            code: 'genshin-impact',
            name: 'Genshin Impact',
            inputFields: {
              fields: [
                { key: 'userId', label: 'User ID / UID', type: 'text', required: true },
                {
                  key: 'zoneId',
                  label: 'Pilih Server',
                  type: 'select',
                  required: true,
                  options: [
                    { value: 'os_asia', label: 'Asia' },
                    { value: 'os_usa', label: 'America' },
                    { value: 'os_euro', label: 'Europe' },
                    { value: 'os_cht', label: 'TW/HK/MO' },
                  ],
                },
              ],
            },
          },
          {
            id: '3',
            code: 'mobile-legends',
            name: 'Mobile Legends: Bang Bang',
            inputFields: {
              fields: [
                { key: 'userId', label: 'User ID', type: 'text', required: true },
                { key: 'zoneId', label: 'Zone ID', type: 'text', required: true },
              ],
            },
          },
        ];
        setGamesList(fallback);
        setGameCode(fallback[0].code);
        initFormFields(fallback[0]);
      } finally {
        setFetchingGames(false);
      }
    }
    fetchGames();
  }, []);

  const initFormFields = (game: any) => {
    if (!game) return;
    const initial: Record<string, string> = {};
    const fields = game.inputFields?.fields || [];
    fields.forEach((f: any) => {
      // Preset default select option if type === 'select', else leave empty for clean user input
      initial[f.key] = f.type === 'select' ? f.options?.[0]?.value || '' : '';
    });
    setFormValues(initial);
  };

  const handleGameChange = (code: string) => {
    setGameCode(code);
    const selected = gamesList.find((g) => g.code === code);
    if (selected) {
      initFormFields(selected);
    }
  };

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await apiClient.post('/public/validate-account', {
        gameCode,
        userId: formValues.userId,
        zoneId: formValues.zoneId || undefined,
      });

      if (res.data && res.data.success) {
        setResult({
          gameCode: res.data.data.gameCode,
          userId: res.data.data.userId,
          zoneId: res.data.data.zoneId,
          capabilities: res.data.data.capabilities,
          meta: {
            providersUsed: res.data.meta?.providersUsed || [],
            responseTimeMs: res.data.meta?.responseTimeMs || 0,
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

  const handleCopyJson = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedGame = gamesList.find((g) => g.code === gameCode);
  const activeFields: any[] = selectedGame?.inputFields?.fields || [
    { key: 'userId', label: 'User ID / Player ID', type: 'text', required: true },
  ];

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
        {/* Panel Kiri: Form Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Form Request Validasi</h3>
            
            <form onSubmit={handleValidate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>Pilih Game</span>
                  {fetchingGames && <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />}
                </label>
                <select
                  value={gameCode}
                  onChange={(e) => handleGameChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                >
                  {gamesList.map((g) => (
                    <option key={g.id || g.code} value={g.code}>
                      {g.name} ({g.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Input Fields Rendered Per Game */}
              {activeFields.map((field: any) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      value={formValues[field.key] || ''}
                      onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      {field.options?.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} ({opt.value})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formValues[field.key] || ''}
                      onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                      placeholder={field.placeholder || `Masukkan ${field.label}...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  )}
                </div>
              ))}

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
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Jalankan Validasi</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Panel Kanan: Hasil Response JSON & Card Display */}
        <div className="lg:col-span-7 space-y-6">
          {errorMsg && (
            <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-4 text-xs text-red-300 font-mono shadow-xl">
              ❌ Error: {errorMsg}
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Stat Card Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Hasil Validasi Gateway</span>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-800">
                    ⏱️ {result.meta.responseTimeMs} ms
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Game</span>
                    <span className="font-semibold text-slate-200 font-mono">{result.gameCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">User ID</span>
                    <span className="font-semibold text-slate-200 font-mono">{result.userId}</span>
                  </div>
                  {result.zoneId && (
                    <div>
                      <span className="text-slate-500 block">Zone / Server</span>
                      <span className="font-semibold text-slate-200 font-mono">{result.zoneId}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block">Providers Used</span>
                    <span className="font-semibold text-purple-400 font-mono">
                      {result.meta.providersUsed.join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Capabilities Badges */}
                <div className="pt-2 border-t border-slate-800/60 space-y-2">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    Extracted Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.capabilities.nickname && (
                      <div className="bg-blue-950/60 border border-blue-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
                        <span className="text-slate-400">Nickname:</span>
                        <span className="font-bold text-blue-300 font-mono">{String(result.capabilities.nickname)}</span>
                      </div>
                    )}

                    {result.capabilities.region && (
                      <div className="bg-amber-950/60 border border-amber-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
                        <span className="text-slate-400">Region:</span>
                        <span className="font-bold text-amber-300 font-mono">{String(result.capabilities.region)}</span>
                      </div>
                    )}

                    {result.capabilities.firstTopupAvailable !== undefined && (
                      <div className="bg-purple-950/60 border border-purple-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
                        <span className="text-slate-400">First Topup Bonus:</span>
                        <span className={`font-bold font-mono ${result.capabilities.firstTopupAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
                          {result.capabilities.firstTopupAvailable ? 'AVAILABLE ✅' : 'USED ❌'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* First Topup Tiers Table */}
                  {Array.isArray(result.capabilities.firstTopupTiers) && result.capabilities.firstTopupTiers.length > 0 && (
                    <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                        Double Diamond Tier Status:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {result.capabilities.firstTopupTiers.map((t: any) => (
                          <div
                            key={t.id || t.name}
                            className={`p-2 rounded-lg border text-[11px] font-mono text-center ${
                              t.available
                                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                          >
                            <div className="font-bold">{t.name}</div>
                            <div className="text-[9px] mt-0.5">{t.statusText}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* JSON Response View Drawer */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Raw Response JSON Envelope</span>
                  </div>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-blue-300 overflow-x-auto border border-slate-800/80 max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
