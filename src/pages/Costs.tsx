import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DollarSign, TrendingDown, AlertTriangle, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../lib/api';
import type { CostReport } from '../lib/api';

const PIE_COLORS = ['#22d3ee', '#a855f7', '#f97316', '#ef4444', '#34d399', '#fbbf24', '#60a5fa', '#f472b6'];

export default function Costs() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CostReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'pods' | 'namespaces'>('overview');

  useEffect(() => {
    if (!id) return;
    api.getCosts(id).then(setData).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Cost Data</h3>
        <p className="text-gray-400 text-sm">Cost analysis requires snapshot data from the agent</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400">Monthly Cost</span>
          </div>
          <div className="text-3xl font-bold">${data.total_monthly_cost.toFixed(0)}</div>
          <div className="text-xs text-gray-500 mt-1">{data.pricing_model.description}</div>
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">Wasted Cost</span>
          </div>
          <div className="text-3xl font-bold text-red-400">${data.total_wasted_cost.toFixed(0)}</div>
          <div className="text-xs text-gray-500 mt-1">Could be saved with right-sizing</div>
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-gray-400">Potential Savings</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">${data.savings_if_rightsized.toFixed(0)}</div>
          <div className="text-xs text-gray-500 mt-1">Monthly if right-sized</div>
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Efficiency</span>
          </div>
          <div className={`text-3xl font-bold ${data.overall_efficiency >= 70 ? 'text-emerald-400' : data.overall_efficiency >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {data.overall_efficiency}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Resource utilization</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-900 rounded-lg p-1 w-fit">
        {(['overview', 'pods', 'namespaces'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-surface-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'pods' && <PodsTab data={data} />}
      {tab === 'namespaces' && <NamespacesTab data={data} />}
    </div>
  );
}

function OverviewTab({ data }: { data: CostReport }) {
  const nodeData = data.nodes.map(n => ({ name: n.name, cost: n.monthly_cost }));
  const nsData = data.by_namespace.map(ns => ({ name: ns.namespace, cost: ns.monthly_cost, wasted: ns.wasted_cost }));

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h4 className="text-sm font-medium text-gray-400 mb-4">Node Costs (Monthly)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={nodeData}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: '#151829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, 'Monthly']} />
              <Bar dataKey="cost" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h4 className="text-sm font-medium text-gray-400 mb-4">Cost by Namespace</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={nsData.filter(n => n.cost > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="cost" nameKey="name" label={({ name, value }) => `${name}: $${value.toFixed(0)}`}>
                {nsData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#151829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, 'Monthly']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Right-Sizing Recommendations
          </h4>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-900 rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{rec.resource}</div>
                  <div className="text-xs text-gray-400 mt-1">{rec.message}</div>
                </div>
                <span className="text-sm font-medium text-emerald-400 whitespace-nowrap ml-4">
                  Save ${rec.savings_monthly.toFixed(2)}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PodsTab({ data }: { data: CostReport }) {
  return (
    <div className="space-y-6">
      {/* Top Expensive */}
      <div className="bg-surface-800 border border-white/5 rounded-xl">
        <div className="p-5 border-b border-white/5">
          <h4 className="font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            Most Expensive Pods
          </h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs text-gray-400 font-medium p-4">Pod</th>
              <th className="text-left text-xs text-gray-400 font-medium p-4">Namespace</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">CPU Req</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Mem Req</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Monthly</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Wasted</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {data.top_expensive_pods.map((pod) => (
              <tr key={`${pod.namespace}/${pod.name}`} className="border-b border-white/5 last:border-0">
                <td className="p-4 text-sm font-medium">{pod.name}</td>
                <td className="p-4 text-sm text-gray-400">{pod.namespace}</td>
                <td className="p-4 text-sm text-gray-300 text-right">{pod.cpu_request_millis}m</td>
                <td className="p-4 text-sm text-gray-300 text-right">{(pod.mem_request_bytes / 1024 / 1024).toFixed(0)}Mi</td>
                <td className="p-4 text-sm text-right font-medium">${pod.monthly_cost.toFixed(2)}</td>
                <td className="p-4 text-sm text-red-400 text-right">${pod.wasted_cost_monthly.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    pod.efficiency_percent >= 70 ? 'text-emerald-400 bg-emerald-400/10' :
                    pod.efficiency_percent >= 30 ? 'text-yellow-400 bg-yellow-400/10' :
                    'text-red-400 bg-red-400/10'
                  }`}>
                    {pod.efficiency_percent}%
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

function NamespacesTab({ data }: { data: CostReport }) {
  const nsData = data.by_namespace.map(ns => ({
    ...ns,
    effective: ns.monthly_cost - ns.wasted_cost,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Cost vs Waste by Namespace</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={nsData}>
            <XAxis dataKey="namespace" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={{ background: '#151829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number | undefined) => `$${(v ?? 0).toFixed(2)}`} />
            <Bar dataKey="monthly_cost" name="Total Cost" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            <Bar dataKey="wasted_cost" name="Wasted" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface-800 border border-white/5 rounded-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs text-gray-400 font-medium p-4">Namespace</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Pods</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Monthly Cost</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">Wasted</th>
              <th className="text-right text-xs text-gray-400 font-medium p-4">% Wasted</th>
            </tr>
          </thead>
          <tbody>
            {nsData.map((ns) => (
              <tr key={ns.namespace} className="border-b border-white/5 last:border-0">
                <td className="p-4 text-sm font-medium">{ns.namespace}</td>
                <td className="p-4 text-sm text-gray-400 text-right">{ns.pod_count}</td>
                <td className="p-4 text-sm text-right">${ns.monthly_cost.toFixed(2)}</td>
                <td className="p-4 text-sm text-red-400 text-right">${ns.wasted_cost.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    ns.monthly_cost > 0 && (ns.wasted_cost / ns.monthly_cost) > 0.5
                      ? 'text-red-400 bg-red-400/10' : 'text-emerald-400 bg-emerald-400/10'
                  }`}>
                    {ns.monthly_cost > 0 ? ((ns.wasted_cost / ns.monthly_cost) * 100).toFixed(0) : 0}%
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
