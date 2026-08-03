import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { ValidationResponse } from '../types';
import {
  Play,
  Copy,
  Check,
  Zap,
  Server,
  RefreshCw,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  UserCheck,
} from 'lucide-react';

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
              fields: [{ key: 'userId', label: 'User ID / Player ID', type: 'text', required: true, sampleValue: '6526829829' }],
            },
          },
          {
            id: '2',
            code: 'genshin-impact',
            name: 'Genshin Impact',
            inputFields: {
              fields: [
                { key: 'userId', label: 'User ID / UID', type: 'text', required: true, sampleValue: '864789196' },
                {
                  key: 'zoneId',
                  label: 'Pilih Server',
                  type: 'select',
                  required: true,
                  sampleValue: 'os_asia',
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
                { key: 'userId', label: 'User ID', type: 'text', required: true, sampleValue: '1615278168' },
                { key: 'zoneId', label: 'Zone ID', type: 'text', required: true, sampleValue: '16806' },
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

  const selectedGame = gamesList.find((g) => g.code === gameCode);
  const activeFields: any[] = selectedGame?.inputFields?.fields || [
    { key: 'userId', label: 'User ID / Player ID', type: 'text', required: true },
  ];

  const handleFillSample = () => {
    const userField = activeFields.find((f: any) => f.key === 'userId');
    const zoneField = activeFields.find((f: any) => f.key === 'zoneId');

    const currentUserId = formValues.userId || '';

    // If form is already filled by user, ask confirmation before overwriting
    if (currentUserId.trim() !== '') {
      const confirmMsg = `Timpa input ID yang sudah Anda ketik (${currentUserId}) dengan data sampel valid?`;
      if (!window.confirm(confirmMsg)) return;
    }

    const updated = { ...formValues };
    if (userField?.sampleValue) updated.userId = userField.sampleValue;
    if (zoneField?.sampleValue) updated.zoneId = zoneField.sampleValue;

    setFormValues(updated);
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

  // First Topup Counts
  const availableCount = Array.isArray(result?.capabilities.firstTopupTiers)
    ? result.capabilities.firstTopupTiers.filter((t: any) => t.available).length
    : 0;
  const totalCount = Array.isArray(result?.capabilities.firstTopupTiers)
    ? result.capabilities.firstTopupTiers.length
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400 fill-blue-400" />
            Validation Engine Playground
          </h2>
          <p className="text-sm text-slate-400">
            Uji coba langsung respons HTTP mentah dan hasil transformasi Gateway secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Gateway Status: READY</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Request */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-3">
              <span>Input Parameter Request</span>
              <span className="text-xs font-mono font-normal text-slate-400">POST /validate-account</span>
            </h3>

            <form onSubmit={handleValidate} className="space-y-4">
              {/* Game Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Pilih Game Catalog</label>
                <select
                  value={gameCode}
                  onChange={(e) => handleGameChange(e.target.value)}
                  disabled={fetchingGames}
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
              {activeFields.map((field: any) => {
                const sampleUser = activeFields.find((f: any) => f.key === 'userId')?.sampleValue;
                const isUserField = field.key === 'userId';

                return (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-400">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      {isUserField && sampleUser && (
                        <button
                          type="button"
                          onClick={handleFillSample}
                          className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-800/80 font-mono font-medium flex items-center gap-1 transition-colors shadow-sm"
                          title="Klik untuk auto-fill data sampel ID valid"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Sample: {sampleUser}</span>
                        </button>
                      )}
                    </div>

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
                );
              })}

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

        {/* Right Column: Output & Capabilities Result */}
        <div className="lg:col-span-7 space-y-6">
          {errorMsg && (
            <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-4 text-xs text-red-300 font-mono flex items-start gap-3 shadow-lg">
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-200 block mb-1">Validasi Gagal (HTTP Error):</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {result ? (
            <div className="space-y-6">
              {/* Capabilities Summary Cards */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    Hasil Ekstraksi Gateway (Capabilities)
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">Response:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {result.meta.responseTimeMs} ms
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">Nickname Player</span>
                    <span className="font-bold text-slate-100 text-sm font-sans flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{result.capabilities.nickname || '-'}</span>
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">Region / Country</span>
                    <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>{result.capabilities.region ? String(result.capabilities.region) : 'N/A'}</span>
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">First Topup Bonus</span>
                    <span className="font-bold text-sm font-sans flex items-center gap-1">
                      {totalCount > 0 ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] border ${availableCount > 0 ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                          First Topup: {availableCount}/{totalCount} Tier Tersedia
                        </span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* First Topup Bonus Grid (If Available) */}
                {Array.isArray(result.capabilities.firstTopupTiers) && result.capabilities.firstTopupTiers.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                      Double Diamond Tier Status (MobaPay / GoPay Live Data):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      {result.capabilities.firstTopupTiers.map((tier: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-1 ${
                            tier.available
                              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          <span className="font-bold text-slate-200">{tier.name || tier.id}</span>
                          <span className="text-[10px] font-sans">
                            {tier.available ? 'AVAILABLE ✅' : 'USED / EXHAUSTED ❌'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Raw JSON Envelope Viewer */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Response Payload (Standardized JSON Envelope)
                  </h3>
                  <button
                    onClick={handleCopyJson}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 font-mono"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[350px]">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-xl">
              <Server className="w-12 h-12 mx-auto text-slate-700 stroke-1" />
              <div className="text-sm font-medium text-slate-400 font-sans">Belum ada request validasi yang dijalankan</div>
              <p className="text-xs max-w-sm mx-auto text-slate-600 font-sans">
                Pilih catalog game, klik <b>Sample ID</b>, lalu klik <b>Jalankan Validasi</b> untuk melihat hasil ekstraksi real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
