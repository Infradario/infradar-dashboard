import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Server, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Cluster } from '../lib/api';

export default function Clusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClusters()
      .then(setClusters)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteCluster(id);
      setClusters(prev => prev.filter(c => c.id !== id));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Clusters</h1>
          <p className="text-gray-400 mt-1">Manage your Kubernetes clusters</p>
        </div>
        <Link
          to="/clusters/new"
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Cluster
        </Link>
      </div>

      {clusters.length === 0 ? (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
          <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clusters yet</h3>
          <p className="text-gray-400 text-sm mb-6">Add your first cluster to get started</p>
          <Link
            to="/clusters/new"
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Cluster
          </Link>
        </div>
      ) : (
        <div className="bg-surface-800 border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-gray-400 font-medium p-4">Name</th>
                <th className="text-left text-xs text-gray-400 font-medium p-4">Provider</th>
                <th className="text-left text-xs text-gray-400 font-medium p-4">Status</th>
                <th className="text-left text-xs text-gray-400 font-medium p-4">Last Seen</th>
                <th className="text-left text-xs text-gray-400 font-medium p-4">Created</th>
                <th className="text-right text-xs text-gray-400 font-medium p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((cluster) => (
                <tr key={cluster.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <Link to={`/clusters/${cluster.id}`} className="font-medium hover:text-cyan-400 transition-colors">
                      {cluster.name}
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-300">{cluster.provider.toUpperCase()}</span>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={cluster.status} />
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {cluster.last_seen_at ? new Date(cluster.last_seen_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {new Date(cluster.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(cluster.id, cluster.name)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
