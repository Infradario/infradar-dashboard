import { useState, useMemo } from 'react';
import {
  ShieldAlert, Server, ChevronDown, ChevronUp, Search, ArrowUpDown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../lib/api';
import type { FalcoSummary } from '../lib/api';
import { useCluster } from '../hooks/useCluster';
import { usePolling } from '../hooks/usePolling';
import { LiveIndicator } from '../components/LiveIndicator';

const priorityColors: Record<string, string> = {
  Emergency: '#dc2626',
  Alert: '#ef4444',
  Critical: '#f43f5e',
  Error: '#f97316',
  Warning: '#fbbf24',
  Notice: '#60a5fa',
  Informational: '#34d399',
  Debug: '#9ca3af',
};

const priorityBadge: Record<string, string> = {
  Emergency: 'text-red-300 bg-red-500/20',
  Alert: 'text-red-400 bg-red-400/10',
  Critical: 'text-rose-400 bg-rose-400/10',
  Error: 'text-orange-400 bg-orange-400/10',
  Warning: 'text-yellow-400 bg-yellow-400/10',
  Notice: 'text-blue-400 bg-blue-400/10',
  Informational: 'text-emerald-400 bg-emerald-400/10',
  Debug: 'text-gray-400 bg-gray-400/10',
};

const priorityOrder = ['Emergency', 'Alert', 'Critical', 'Error', 'Warning', 'Notice', 'Informational', 'Debug'];

export default function FalcoAlerts() {
  const { selected } = useCluster();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('time');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: summary, loading, lastUpdated } = usePolling<FalcoSummary | null>(
    () => selected ? api.getFalcoSummary(selected.id).catch(() => null) : Promise.resolve(null),
    30000,
    [selected?.id],
  );

  if (!selected) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No cluster selected</h3>
        <p className="text-gray-400 text-sm">Select a cluster from the sidebar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold">{selected.name} — Runtime Alerts</h1>
          <LiveIndicator lastUpdated={lastUpdated} />
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No runtime alerts</h3>
          <p className="text-gray-400 text-sm">
            Deploy Falco with Falcosidekick to start receiving runtime security alerts
          </p>
        </div>
      </div>
    );
  }

  const priorityData = priorityOrder
    .filter(p => summary.by_priority[p])
    .map(p => ({ name: p, count: summary.by_priority[p] }));

  const ruleData = Object.entries(summary.by_rule)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name: name.length > 30 ? name.slice(0, 27) + '...' : name, fullName: name, count }));

  const criticalCount = (summary.by_priority['Emergency'] || 0) + (summary.by_priority['Alert'] || 0) + (summary.by_priority['Critical'] || 0);
  const errorCount = summary.by_priority['Error'] || 0;
  const warningCount = summary.by_priority['Warning'] || 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">{selected.name} — Runtime Alerts</h1>
        <span className="text-sm text-gray-500">{selected.provider.toUpperCase()}</span>
        <LiveIndicator lastUpdated={lastUpdated} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Alerts" value={summary.total} color="text-cyan-400" />
        <StatCard label="Critical+" value={criticalCount} color="text-red-400" />
        <StatCard label="Errors" value={errorCount} color="text-orange-400" />
        <StatCard label="Warnings" value={warningCount} color="text-yellow-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {priorityData.length > 0 && (
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">By Priority</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityData}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={priorityColors[entry.name] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {ruleData.length > 0 && (
          <div className="bg-surface-800 border border-white/5 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Top Rules</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ruleData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(value: number, _name: string, props: { payload?: { fullName?: string } }) => [value, props.payload?.fullName || '']}
                />
                <Bar dataKey="count" fill="#22d3ee" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Alert List */}
      <AlertList
        alerts={summary.alerts}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function AlertList({
  alerts, expandedId, setExpandedId, sortBy, setSortBy,
  filterPriority, setFilterPriority, searchQuery, setSearchQuery,
}: {
  alerts: FalcoSummary['alerts'];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  filterPriority: string;
  setFilterPriority: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
}) {
  const filtered = useMemo(() => {
    let list = [...alerts];

    if (filterPriority !== 'all') {
      list = list.filter(a => a.alert.priority === filterPriority);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.alert.output.toLowerCase().includes(q) ||
        a.alert.rule.toLowerCase().includes(q) ||
        (a.alert.output_fields['k8s.ns.name'] as string || '').toLowerCase().includes(q) ||
        (a.alert.output_fields['k8s.pod.name'] as string || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return priorityOrder.indexOf(a.alert.priority) - priorityOrder.indexOf(b.alert.priority);
        case 'rule':
          return a.alert.rule.localeCompare(b.alert.rule);
        case 'namespace':
          return ((a.alert.output_fields['k8s.ns.name'] as string) || '').localeCompare((b.alert.output_fields['k8s.ns.name'] as string) || '');
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return list;
  }, [alerts, filterPriority, searchQuery, sortBy]);

  const priorities = [...new Set(alerts.map(a => a.alert.priority))];

  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-gray-400">Recent Alerts ({filtered.length})</h3>
        <div className="flex-1" />

        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-surface-700 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500 w-48"
          />
        </div>

        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="bg-surface-700 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="all">All Priorities</option>
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <button
          onClick={() => setSortBy(sortBy === 'time' ? 'priority' : sortBy === 'priority' ? 'rule' : 'time')}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-surface-700 border border-white/10 rounded-lg px-3 py-1.5"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortBy === 'time' ? 'Time' : sortBy === 'priority' ? 'Priority' : 'Rule'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">No alerts match filters</div>
      ) : (
        <div className="divide-y divide-white/5">
          {filtered.map(a => (
            <div key={a.id}>
              <button
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                className="w-full text-left px-4 py-3 hover:bg-white/[0.02] transition-colors flex items-center gap-3"
              >
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityBadge[a.alert.priority] || 'text-gray-400 bg-gray-400/10'}`}>
                  {a.alert.priority}
                </span>
                <span className="text-sm font-medium flex-1 truncate">{a.alert.rule}</span>
                <span className="text-xs text-gray-500 shrink-0">
                  {(a.alert.output_fields['k8s.ns.name'] as string) || ''}
                  {(a.alert.output_fields['k8s.pod.name'] as string) ? ` / ${a.alert.output_fields['k8s.pod.name']}` : ''}
                </span>
                <span className="text-xs text-gray-600 shrink-0">
                  {new Date(a.created_at).toLocaleString()}
                </span>
                {expandedId === a.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>

              {expandedId === a.id && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="bg-surface-900 rounded-lg p-3 text-sm">
                    <div className="text-gray-400 text-xs mb-1">Output</div>
                    <div className="text-gray-200 font-mono text-xs break-all">{a.alert.output}</div>
                  </div>

                  {a.alert.tags && a.alert.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {a.alert.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs">{tag}</span>
                      ))}
                    </div>
                  )}

                  {a.alert.output_fields && Object.keys(a.alert.output_fields).length > 0 && (
                    <div className="bg-surface-900 rounded-lg p-3">
                      <div className="text-gray-400 text-xs mb-2">Fields</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(a.alert.output_fields).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-gray-500">{k}:</span>
                            <span className="text-gray-300 font-mono">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 text-xs text-gray-500">
                    {a.alert.source && <span>Source: {a.alert.source}</span>}
                    {a.alert.hostname && <span>Host: {a.alert.hostname}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
