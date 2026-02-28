import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Server, Cpu, HardDrive, Activity,
  AlertTriangle,
  Play, DollarSign, Clock,
  Network, Flame, Radio, Bell, Gauge,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';
import type { Cluster, Snapshot } from '../lib/api';

export default function ClusterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<'overview' | 'nodes' | 'pods'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getCluster(id).catch(() => null),
      api.getLatestSnapshot(id).catch(() => null),
    ]).then(([c, s]) => {
      setCluster(c);
      setSnapshot(s);
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
    { key: 'nodes', label: `Nodes (${snapshot?.summary?.node_count || 0})` },
    { key: 'pods', label: `Pods (${snapshot?.summary?.pod_count || 0})` },
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

      {/* Innovative Features */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { to: `/clusters/${id}/simulator`, icon: Play, label: 'What-If Simulator', color: 'text-purple-400', bg: 'hover:bg-purple-500/10' },
            { to: `/clusters/${id}/costs`, icon: DollarSign, label: 'Cost Analysis', color: 'text-emerald-400', bg: 'hover:bg-emerald-500/10' },
            { to: `/clusters/${id}/timeline`, icon: Clock, label: 'Timeline', color: 'text-cyan-400', bg: 'hover:bg-cyan-500/10' },
            { to: `/clusters/${id}/topology`, icon: Network, label: 'Cluster Map', color: 'text-sky-400', bg: 'hover:bg-sky-500/10' },
            { to: `/clusters/${id}/heatmap`, icon: Flame, label: 'Heatmap', color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
            { to: `/clusters/${id}/events`, icon: Radio, label: 'Events', color: 'text-indigo-400', bg: 'hover:bg-indigo-500/10' },
            { to: `/clusters/${id}/alerts`, icon: Bell, label: 'Alerts', color: 'text-rose-400', bg: 'hover:bg-rose-500/10' },
            { to: `/clusters/${id}/golden-signals`, icon: Gauge, label: 'Golden Signals', color: 'text-teal-400', bg: 'hover:bg-teal-500/10' },
          ].map(({ to, icon: Icon, label, color, bg }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 p-3 rounded-xl bg-surface-800 border border-white/5 ${bg} transition-colors`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      )}

      {!snapshot ? (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No data yet</h3>
          <p className="text-gray-400 text-sm">Install the agent on your cluster to start receiving data</p>
        </div>
      ) : (
        <>
          {tab === 'overview' && snapshot && <OverviewTab snapshot={snapshot} />}
          {tab === 'nodes' && snapshot && <NodesTab snapshot={snapshot} />}
          {tab === 'pods' && snapshot && <PodsTab snapshot={snapshot} />}
        </>
      )}
    </div>
  );
}

function OverviewTab({ snapshot }: { snapshot: Snapshot }) {
  const s = snapshot.summary;

  const cpuUtil = Math.round((s.cpu_utilization_percent ?? 0) * 100) / 100;
  const memUtil = Math.round((s.mem_utilization_percent ?? 0) * 100) / 100;

  const cpuData = [
    { name: 'Used', value: cpuUtil },
    { name: 'Free', value: 100 - cpuUtil },
  ];
  const memData = [
    { name: 'Used', value: memUtil },
    { name: 'Free', value: 100 - memUtil },
  ];

  const formatCpu = (millis: number) => millis >= 1000 ? `${(millis / 1000).toFixed(1)} cores` : `${millis}m`;
  const formatMem = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} Gi`;
    return `${Math.round(bytes / 1048576)} Mi`;
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Server className="w-5 h-5 text-cyan-400" />} label="Nodes" value={s.node_count} sub="total" />
        <StatCard icon={<Activity className="w-5 h-5 text-emerald-400" />} label="Pods" value={s.pod_count} sub="total" />
        <StatCard icon={<Cpu className="w-5 h-5 text-purple-400" />} label="CPU Usage" value={`${cpuUtil.toFixed(2)}%`} sub={`${formatCpu(s.total_cpu_usage_millis)} / ${formatCpu(s.total_cpu_request_millis)}`} />
        <StatCard icon={<HardDrive className="w-5 h-5 text-orange-400" />} label="Memory Usage" value={`${memUtil.toFixed(2)}%`} sub={`${formatMem(s.total_mem_usage_bytes)} / ${formatMem(s.total_mem_request_bytes)}`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">CPU Utilization</h3>
          <UtilizationChart data={cpuData} value={cpuUtil} color="#a855f7" />
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Memory Utilization</h3>
          <UtilizationChart data={memData} value={memUtil} color="#f97316" />
        </div>
      </div>

      {/* Security warnings */}
      {(s.run_as_root_pods > 0 || s.latest_tag_pods > 0) && (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Warnings
          </h3>
          <div className="space-y-2">
            {s.run_as_root_pods > 0 && (
              <div className="flex items-start gap-3 text-sm text-yellow-300 bg-yellow-400/5 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {s.run_as_root_pods} pod(s) running as root
              </div>
            )}
            {s.latest_tag_pods > 0 && (
              <div className="flex items-start gap-3 text-sm text-yellow-300 bg-yellow-400/5 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {s.latest_tag_pods} pod(s) using :latest tag
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NodesTab({ snapshot }: { snapshot: Snapshot }) {
  const fmtCpu = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} cores` : `${m}m`;
  const fmtMem = (b: number) => b >= 1073741824 ? `${(b / 1073741824).toFixed(1)}Gi` : `${Math.round(b / 1048576)}Mi`;

  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left text-xs text-gray-400 font-medium p-4">Name</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">Status</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">Version</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">CPU Capacity</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">Memory</th>
            <th className="text-left text-xs text-gray-400 font-medium p-4">Pods</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.nodes.map((node) => (
            <tr key={node.name} className="border-b border-white/5 last:border-0">
              <td className="p-4 font-medium text-sm">{node.name}</td>
              <td className="p-4">
                {node.ready ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full text-emerald-400 bg-emerald-400/10">Ready</span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full text-red-400 bg-red-400/10">NotReady</span>
                )}
              </td>
              <td className="p-4 text-sm text-gray-400">{node.kubelet_version || '-'}</td>
              <td className="p-4 text-sm text-gray-300">{fmtCpu(node.cpu_capacity_millis)}</td>
              <td className="p-4 text-sm text-gray-300">{fmtMem(node.memory_capacity_bytes)}</td>
              <td className="p-4 text-sm text-gray-300">{node.pod_count}</td>
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
                <td className="p-4 text-sm text-gray-300 font-mono">{pod.image || '-'}:{pod.image_tag || '-'}</td>
                <td className="p-4 text-sm text-gray-400">{pod.cpu_request_millis || 0}m / {pod.cpu_limit_millis || 0}m</td>
                <td className="p-4 text-sm text-gray-400">{Math.round((pod.mem_request_bytes || 0) / 1048576)}Mi / {Math.round((pod.mem_limit_bytes || 0) / 1048576)}Mi</td>
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

function UtilizationChart({ data, value, color }: { data: { name: string; value: number }[]; value: number; color: string }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={65}
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
        <span className="text-lg font-bold">{Number.isInteger(value) ? value : value.toFixed(2)}%</span>
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
