import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Network, Server, Box, Layers, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { ClusterTopology, TopologyNode } from '../lib/api';

export default function ClusterMap() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ClusterTopology | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'node' | 'pod' | 'namespace'>('all');

  useEffect(() => {
    if (!id) return;
    api.getTopology(id).then(setData).catch(() => null).finally(() => setLoading(false));
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
        <Network className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Topology Data</h3>
        <p className="text-gray-400 text-sm">Waiting for cluster data</p>
      </div>
    );
  }

  const filtered = data.nodes.filter(n => filter === 'all' || n.type === filter);

  const grouped: Record<string, TopologyNode[]> = {};
  for (const node of filtered) {
    const key = node.type === 'pod' ? (node.namespace || 'unknown') : node.type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(node);
  }

  const statusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    if (status === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
    return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  };

  const typeIcon = (type: string) => {
    if (type === 'node') return <Server className="w-4 h-4 text-cyan-400" />;
    if (type === 'pod') return <Box className="w-4 h-4 text-purple-400" />;
    return <Layers className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard label="Nodes" value={data.stats.total_nodes} color="text-cyan-400" />
        <StatCard label="Pods" value={data.stats.total_pods} color="text-purple-400" />
        <StatCard label="Namespaces" value={data.stats.total_namespaces} color="text-blue-400" />
        <StatCard label="Healthy" value={data.stats.healthy_pods} color="text-emerald-400" />
        <StatCard label="Warning" value={data.stats.warning_pods} color="text-yellow-400" />
        <StatCard label="Critical" value={data.stats.critical_pods} color="text-red-400" />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'node', 'pod', 'namespace'] as const).map(f => (
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

      {/* Topology Map */}
      {Object.entries(grouped).sort().map(([group, nodes]) => (
        <div key={group} className="bg-surface-800 border border-white/5 rounded-xl">
          <div className="p-4 border-b border-white/5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-sm">{group}</span>
            <span className="text-xs text-gray-500 ml-auto">{nodes.length} items</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {nodes.map(node => (
              <div
                key={node.id}
                className={`border rounded-lg p-3 transition-colors overflow-hidden ${
                  node.status === 'healthy' ? 'border-emerald-500/30 bg-emerald-500/5' :
                  node.status === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-red-500/30 bg-red-500/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {typeIcon(node.type)}
                  <span className="text-sm font-medium truncate flex-1">{node.label}</span>
                  {statusIcon(node.status)}
                </div>
                {node.metadata && (
                  <div className="space-y-1">
                    {Object.entries(node.metadata).slice(0, 4).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[11px] min-w-0">
                        <span className="text-gray-500 flex-shrink-0">{k.replace(/_/g, ' ')}</span>
                        <span className="text-gray-300 font-mono ml-auto overflow-hidden max-w-[65%]">
                          <span className="meta-scroll block truncate hover:animate-none">{String(v)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
