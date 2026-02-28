import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Plus, Minus, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { api } from '../lib/api';
import type { EventStream } from '../lib/api';

export default function Events() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<EventStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!id) return;
    api.getEvents(id).then(setData).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.events || data.events.length === 0) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
        <p className="text-gray-400 text-sm">Events appear as your cluster changes between snapshots</p>
      </div>
    );
  }

  const events = data.events || [];
  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

  const eventIcon = (type: string) => {
    switch (type) {
      case 'pod_added': return <Plus className="w-4 h-4 text-emerald-400" />;
      case 'pod_removed': return <Minus className="w-4 h-4 text-red-400" />;
      case 'pod_restarted': return <RefreshCw className="w-4 h-4 text-yellow-400" />;
      case 'status_changed': return <ArrowRightLeft className="w-4 h-4 text-blue-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const sevColor = (sev: string) => {
    if (sev === 'critical') return 'border-l-red-500 bg-red-500/5';
    if (sev === 'warning') return 'border-l-yellow-500 bg-yellow-500/5';
    return 'border-l-blue-500 bg-blue-500/5';
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Total Events" value={data.summary.total_events} color="text-cyan-400" />
        <SummaryCard label="Additions" value={data.summary.additions} color="text-emerald-400" />
        <SummaryCard label="Removals" value={data.summary.removals} color="text-red-400" />
        <SummaryCard label="Restarts" value={data.summary.restarts} color="text-yellow-400" />
        <SummaryCard label="Warnings" value={data.summary.warnings} color="text-orange-400" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pod_added', 'pod_removed', 'pod_restarted', 'status_changed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-cyan-500/20 text-cyan-400' : 'bg-surface-800 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Event Stream */}
      <div className="bg-surface-800 border border-white/5 rounded-xl">
        <div className="p-4 border-b border-white/5">
          <h3 className="font-semibold text-sm">Event Stream ({filtered.length})</h3>
        </div>
        <div className="divide-y divide-white/5">
          {filtered.map((event, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 border-l-2 ${sevColor(event.severity)}`}>
              <div className="mt-0.5">{eventIcon(event.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{event.message}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-mono text-gray-500">{event.namespace}/{event.pod}</span>
                  <span className="text-[10px] text-gray-600">{new Date(event.time).toLocaleString()}</span>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                event.severity === 'critical' ? 'text-red-400 bg-red-400/10' :
                event.severity === 'warning' ? 'text-yellow-400 bg-yellow-400/10' :
                'text-blue-400 bg-blue-400/10'
              }`}>
                {event.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
