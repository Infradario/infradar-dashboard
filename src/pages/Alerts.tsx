import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bell, AlertTriangle, AlertCircle, Info, Lightbulb } from 'lucide-react';
import { api } from '../lib/api';
import type { AlertsResponse } from '../lib/api';

export default function Alerts() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!id) return;
    api.getAlerts(id).then(setData).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.alerts.length === 0) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <Bell className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
        <p className="text-gray-400 text-sm">Your cluster looks healthy</p>
      </div>
    );
  }

  const filtered = filter === 'all' ? data.alerts : data.alerts.filter(a => a.severity === filter);

  const sevIcon = (sev: string) => {
    if (sev === 'critical') return <AlertCircle className="w-5 h-5 text-red-400" />;
    if (sev === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <Info className="w-5 h-5 text-blue-400" />;
  };

  const sevBg = (sev: string) => {
    if (sev === 'critical') return 'border-l-red-500 bg-red-500/5';
    if (sev === 'warning') return 'border-l-yellow-500 bg-yellow-500/5';
    return 'border-l-blue-500 bg-blue-500/5';
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-red-400">{data.critical}</div>
          <div className="text-xs text-gray-400 mt-1">Critical</div>
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-yellow-400">{data.warning}</div>
          <div className="text-xs text-gray-400 mt-1">Warning</div>
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-blue-400">{data.info}</div>
          <div className="text-xs text-gray-400 mt-1">Info</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'critical', 'warning', 'info'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-cyan-500/20 text-cyan-400' : 'bg-surface-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {filtered.map(alert => (
          <div key={alert.id} className={`bg-surface-800 border border-white/5 rounded-xl border-l-4 ${sevBg(alert.severity)} p-5`}>
            <div className="flex items-start gap-3">
              {sevIcon(alert.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{alert.title}</span>
                  {alert.metric && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-900 text-gray-400">
                      {alert.metric}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-3">{alert.description}</p>
                <div className="flex items-start gap-2 bg-surface-900 rounded-lg px-4 py-3">
                  <Lightbulb className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-cyan-400">{alert.suggestion}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-gray-500 font-mono">{alert.resource}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-900 text-gray-500">{alert.type.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
