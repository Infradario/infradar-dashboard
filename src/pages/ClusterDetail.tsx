import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Server, Cpu, HardDrive, Activity, Shield,
  AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import { api } from '../lib/api';
import type { Cluster, Snapshot, SecurityReport } from '../lib/api';

export default function ClusterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [security, setSecurity] = useState<SecurityReport | null>(null);
  const [tab, setTab] = useState<'overview' | 'nodes' | 'pods' | 'security'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getCluster(id).catch(() => null),
      api.getLatestSnapshot(id).catch(() => null),
      api.getSecurityReport(id).catch(() => null),
    ]).then(([c, s, sec]) => {
      setCluster(c);
      setSnapshot(s);
      setSecurity(sec);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cluster) {
    return <div className="text-center text-gray-400 py-20">Cluster not found</div>;
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'nodes', label: `Nodes (${snapshot?.summary?.total_nodes || 0})` },
    { key: 'pods', label: `Pods (${snapshot?.summary?.total_pods || 0})` },
    { key: 'security', label: 'Security' },
  ] as const;

  return (
    <div>
      <button
        onClick={() => navigate('/clusters')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clusters
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{cluster.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-400">{cluster.provider.toUpperCase()}</span>
            <StatusBadge status={cluster.status} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-900 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-surface-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!snapshot && tab !== 'security' ? (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No data yet</h3>
          <p className="text-gray-400 text-sm">Install the agent on your cluster to start receiving data</p>
        </div>
      ) : (
        <>
          {tab === 'overview' && snapshot && <OverviewTab snapshot={snapshot} security={security} />}
          {tab === 'nodes' && snapshot && <NodesTab snapshot={snapshot} />}
          {tab === 'pods' && snapshot && <PodsTab snapshot={snapshot} />}
          {tab === 'security' && <SecurityTab security={security} />}
        </>
      )}
    </div>
  );
}

function OverviewTab({ snapshot, security }: { snapshot: Snapshot; security: SecurityReport | null }) {
  const s = snapshot.summary;

  const cpuData = [
    { name: 'Used', value: s.cpu_utilization },
    { name: 'Free', value: 100 - s.cpu_utilization },
  ];
  const memData = [
    { name: 'Used', value: s.mem_utilization },
    { name: 'Free', value: 100 - s.mem_utilization },
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Server className="w-5 h-5 text-cyan-400" />} label="Nodes" value={`${s.ready_nodes}/${s.total_nodes}`} sub="ready" />
        <StatCard icon={<Activity className="w-5 h-5 text-emerald-400" />} label="Pods" value={`${s.running_pods}/${s.total_pods}`} sub="running" />
        <StatCard icon={<Cpu className="w-5 h-5 text-purple-400" />} label="CPU Usage" value={`${s.cpu_utilization}%`} sub={`${s.total_cpu_usage} / ${s.total_cpu_capacity}`} />
        <StatCard icon={<HardDrive className="w-5 h-5 text-orange-400" />} label="Memory Usage" value={`${s.mem_utilization}%`} sub={`${s.total_mem_usage} / ${s.total_mem_capacity}`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">CPU Utilization</h3>
          <UtilizationChart data={cpuData} value={s.cpu_utilization} color="#a855f7" />
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Memory Utilization</h3>
          <UtilizationChart data={memData} value={s.mem_utilization} color="#f97316" />
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Security Score</h3>
          {security ? (
            <UtilizationChart
              data={[
                { name: 'Score', value: security.score },
                { name: 'Lost', value: 100 - security.score },
              ]}
              value={security.score}
              color={security.score >= 70 ? '#34d399' : security.score >= 40 ? '#fbbf24' : '#ef4444'}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">No scan data</div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {s.warnings && s.warnings.length > 0 && (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Warnings ({s.warnings.length})
          </h3>
          <div className="space-y-2">
            {s.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-yellow-300 bg-yellow-400/5 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {w}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NodesTab({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left text-xs text-gray-400 font-medium p-4">Name</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">Role</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">Status</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">Version</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">CPU</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">Memory</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">OS/Arch</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.nodes.map((node) => (
            <tr key={node.name} className="border-b border-white/5 last:border-0">
              <td className="p-4 font-medium text-sm">{node.name}</td>
              <td className="p-4 text-sm text-gray-300">{node.role}</td>
              <td className="p-4">
                {node.ready ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full text-emerald-400 bg-emerald-400/10">Ready</span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full text-red-400 bg-red-400/10">NotReady</span>
                )}
              </td>
              <td className="p-4 text-sm text-gray-400">{node.kubelet_version}</td>
              <td className="p-4 text-sm text-gray-300">{node.cpu_usage} / {node.cpu_capacity}</td>
              <td className="p-4 text-sm text-gray-300">{node.mem_usage} / {node.mem_capacity}</td>
              <td className="p-4 text-sm text-gray-400">{node.os}/{node.arch}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PodsTab({ snapshot }: { snapshot: Snapshot }) {
  const [filter, setFilter] = useState('');
  const filtered = snapshot.pods.filter(
    (p) => p.name.includes(filter) || p.namespace.includes(filter)
  );

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search pods..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-surface-800 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors w-full max-w-sm"
        />
      </div>
      <div className="bg-surface-800 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs text-gray-400 font-medium p-4">Name</th>
              <th className="text-left text-xs text-gray-400 font-medium p-4">Namespace</th>
              <th className="text-left text-xs text-gray-400 font-medium p-4">Status</th>
              <th className="text-left text-xs text-gray-400 font-medium p-4">Image</th>
              <th className="text-left text-xs text-gray-400 font-medium p-4">CPU</th>
              <th className="text-left text-xs text-gray-400 font-medium p-4">Memory</th>
              <th className="text-left text-xs text-gray-400 font-medium p-4">Restarts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pod) => (
              <tr key={`${pod.namespace}/${pod.name}`} className="border-b border-white/5 last:border-0">
                <td className="p-4 font-medium text-sm">{pod.name}</td>
                <td className="p-4 text-sm text-gray-400">{pod.namespace}</td>
                <td className="p-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    pod.status === 'Running' ? 'text-emerald-400 bg-emerald-400/10' :
                    pod.status === 'Pending' ? 'text-yellow-400 bg-yellow-400/10' :
                    'text-red-400 bg-red-400/10'
                  }`}>
                    {pod.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-300 font-mono">{pod.image}:{pod.image_tag}</td>
                <td className="p-4 text-sm text-gray-400">{pod.cpu_request || '-'} / {pod.cpu_limit || '-'}</td>
                <td className="p-4 text-sm text-gray-400">{pod.mem_request || '-'} / {pod.mem_limit || '-'}</td>
                <td className="p-4">
                  <span className={`text-sm ${pod.restart_count > 3 ? 'text-red-400' : 'text-gray-400'}`}>
                    {pod.restart_count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecurityTab({ security }: { security: SecurityReport | null }) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  if (!security) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No security scan yet</h3>
        <p className="text-gray-400 text-sm">Security scans run automatically when the agent sends data</p>
      </div>
    );
  }

  const r = security.report;
  const severityData = Object.entries(r.by_severity || {}).map(([name, value]) => ({ name, value }));
  const categoryData = Object.entries(r.by_category || {}).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const severityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#fbbf24',
    low: '#60a5fa',
  };

  const severityBadge: Record<string, string> = {
    critical: 'text-red-400 bg-red-400/10',
    high: 'text-orange-400 bg-orange-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    low: 'text-blue-400 bg-blue-400/10',
  };

  return (
    <div className="space-y-6">
      {/* Score + stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-2">Security Score</div>
          <div className={`text-4xl font-bold ${
            r.score >= 70 ? 'text-emerald-400' : r.score >= 40 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {r.score}<span className="text-lg text-gray-500">/100</span>
          </div>
        </div>
        <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} label="Findings" value={r.total_findings} />
        <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} label="Passed Rules" value={`${r.passed_rules}/${r.total_rules}`} />
        <StatCard icon={<XCircle className="w-5 h-5 text-red-400" />} label="Failed Rules" value={`${r.failed_rules}/${r.total_rules}`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">By Severity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityData}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#151829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {severityData.map((entry) => (
                  <Cell key={entry.name} fill={severityColors[entry.name] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">By Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ background: '#151829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="value" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Findings list */}
      <div className="bg-surface-800 border border-white/5 rounded-xl">
        <div className="p-5 border-b border-white/5">
          <h3 className="font-semibold">Findings ({r.findings?.length || 0})</h3>
        </div>
        <div className="divide-y divide-white/5">
          {(r.findings || []).map((f, i) => {
            const key = `${f.rule_id}-${i}`;
            const expanded = expandedRule === key;
            return (
              <div key={key}>
                <button
                  onClick={() => setExpandedRule(expanded ? null : key)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${severityBadge[f.severity] || ''}`}>
                    {f.severity}
                  </span>
                  <span className="text-xs text-gray-500 font-mono whitespace-nowrap">{f.rule_id}</span>
                  <span className="text-sm flex-1 truncate">{f.rule_name}</span>
                  <span className="text-xs text-gray-500 font-mono">{f.namespace}/{f.resource}</span>
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
                {expanded && (
                  <div className="px-4 pb-4 space-y-3 ml-4 border-l-2 border-white/5">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Message</div>
                      <div className="text-sm text-gray-300">{f.message}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Remediation</div>
                      <div className="text-sm text-emerald-400">{f.remediation}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UtilizationChart({ data, value, color }: { data: { name: string; value: number }[]; value: number; color: string }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={60}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
          >
            <Cell fill={color} />
            <Cell fill="#1e2235" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{value}%</span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected: 'text-emerald-400 bg-emerald-400/10',
    pending: 'text-yellow-400 bg-yellow-400/10',
    disconnected: 'text-red-400 bg-red-400/10',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}
