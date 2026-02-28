import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Server, Boxes, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import type { TimelinePoint } from '../lib/api';

export default function Timeline() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getTimeline(id).then(setData).catch(() => []).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Timeline Data</h3>
        <p className="text-gray-400 text-sm">Timeline builds up as the agent sends periodic snapshots</p>
      </div>
    );
  }

  // Reverse so oldest first for chart
  const chartData = [...data].reverse().map((p) => ({
    ...p,
    time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  const latest = data[0];
  const oldest = data[data.length - 1];

  // Compute deltas
  const nodeDelta = latest.node_count - oldest.node_count;
  const podDelta = latest.pod_count - oldest.pod_count;
  const rootDelta = latest.run_as_root_pods - oldest.run_as_root_pods;

  const tooltipStyle = {
    contentStyle: { background: '#151829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' },
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="w-5 h-5 text-cyan-400" />} label="Data Points" value={data.length} sub={`Since ${new Date(oldest.created_at).toLocaleTimeString()}`} />
        <StatCard icon={<Server className="w-5 h-5 text-purple-400" />} label="Nodes" value={latest.node_count} delta={nodeDelta} />
        <StatCard icon={<Boxes className="w-5 h-5 text-emerald-400" />} label="Pods" value={latest.pod_count} delta={podDelta} />
        <StatCard icon={<ShieldAlert className="w-5 h-5 text-red-400" />} label="Root Pods" value={latest.run_as_root_pods} delta={rootDelta} />
      </div>

      {/* Pod & Node Count */}
      <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Pods & Nodes Over Time</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="pod_count" name="Pods" stroke="#22d3ee" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="node_count" name="Nodes" stroke="#a855f7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resource Utilization */}
      <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Resource Utilization Over Time</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...tooltipStyle} formatter={(v: number | undefined) => `${(v ?? 0).toFixed(1)}%`} />
            <Line type="monotone" dataKey="cpu_utilization" name="CPU %" stroke="#a855f7" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="mem_utilization" name="Memory %" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Security Trends */}
      <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Security Metrics Over Time</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="run_as_root_pods" name="Root Pods" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="latest_tag_pods" name=":latest Tag" stroke="#fbbf24" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Raw Data Table */}
      <div className="bg-surface-800 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h4 className="font-semibold">Snapshot History</h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs text-gray-400 font-medium p-4">Time</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Nodes</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Pods</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">CPU %</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Mem %</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Root Pods</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">:latest</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((p) => (
              <tr key={p.id} className="border-b border-white/5 last:border-0">
                <td className="p-4 text-sm text-gray-300">{new Date(p.created_at).toLocaleString()}</td>
                <td className="p-4 text-sm text-right">{p.node_count}</td>
                <td className="p-4 text-sm text-right">{p.pod_count}</td>
                <td className="p-4 text-sm text-right">{p.cpu_utilization.toFixed(1)}%</td>
                <td className="p-4 text-sm text-right">{p.mem_utilization.toFixed(1)}%</td>
                <td className="p-4 text-sm text-right text-red-400">{p.run_as_root_pods}</td>
                <td className="p-4 text-sm text-right text-yellow-400">{p.latest_tag_pods}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, delta }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; delta?: number }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-bold">{value}</div>
        {delta !== undefined && delta !== 0 && (
          <span className={`text-xs font-medium ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
