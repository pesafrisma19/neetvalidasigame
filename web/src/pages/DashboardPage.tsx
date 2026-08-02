import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Gamepad2, Radio, Activity, CheckCircle, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    gamesCount: 0,
    providersCount: 0,
    mappingsCount: 0,
    healthStatus: 'CHECKING',
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [gamesRes, providersRes, mappingsRes, healthRes] = await Promise.all([
        apiClient.get('/admin/games').catch(() => null),
        apiClient.get('/admin/providers').catch(() => null),
        apiClient.get('/admin/mappings').catch(() => null),
        apiClient.get('/public/health').catch(() => null),
      ]);

      setStats({
        gamesCount: gamesRes?.data?.data?.length || 0,
        providersCount: providersRes?.data?.data?.length || 0,
        mappingsCount: mappingsRes?.data?.data?.length || 0,
        healthStatus: healthRes?.data?.status === 'ok' ? 'HEALTHY' : 'Degraded',
      });
    } catch (err) {
      setStats({
        gamesCount: 0,
        providersCount: 0,
        mappingsCount: 0,
        healthStatus: 'Offline',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">System Dashboard</h2>
          <p className="text-sm text-slate-400">Ringkasan status platform & gateway validasi.</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Games Catalog</span>
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
              <Gamepad2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{loading ? '...' : stats.gamesCount}</p>
          <span className="text-[11px] text-emerald-400">Live Supabase Catalog</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Active Providers</span>
            <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl">
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{loading ? '...' : stats.providersCount}</p>
          <span className="text-[11px] text-slate-400">Registered Provider Plugins</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Validation Mappings</span>
            <div className="p-2 bg-amber-600/20 text-amber-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{loading ? '...' : stats.mappingsCount}</p>
          <span className="text-[11px] text-emerald-400">Active Routing Rules</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Gateway Status</span>
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-400">{loading ? '...' : stats.healthStatus}</p>
          <span className="text-[11px] text-slate-400">Live API VPS Status</span>
        </div>
      </div>
    </div>
  );
};
