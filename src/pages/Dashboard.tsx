import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Server, Shield, Activity, AlertTriangle, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Cluster } from '../lib/api';

export default function Dashboard() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClusters()
      .then(setClusters)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeClusters = clusters.filter(c => c.status === 'connected');
  const pendingClusters = clusters.filter(c => c.status === 'pending');

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
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1">Overview of your Kubernetes infrastructure</p>
        </div>
        <Link
          to="/clusters/new"
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Cluster
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Server className="w-5 h-5 text-cyan-400" />}
          label="Total Clusters"
          value={clusters.length}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
          label="Connected"
          value={activeClusters.length}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-yellow-400" />}
          label="Pending"
          value={pendingClusters.length}
        />
        <StatCard
          icon={<Shield className="w-5 h-5 text-purple-400" />}
          label="Security Scans"
          value={activeClusters.length}
        />
      </div>

      {/* Clusters */}
      {clusters.length === 0 ? (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
          <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clusters yet</h3>
          <p className="text-gray-400 text-sm mb-6">Add your first Kubernetes cluster to start monitoring</p>
          <Link
            to="/clusters/new"
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Cluster
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map((cluster) => (
            <ClusterCard key={cluster.id} cluster={cluster} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  const providerColors: Record<string, string> = {
    eks: 'text-orange-400 bg-orange-400/10',
    gke: 'text-blue-400 bg-blue-400/10',
    aks: 'text-sky-400 bg-sky-400/10',
    k3s: 'text-green-400 bg-green-400/10',
    openshift: 'text-red-400 bg-red-400/10',
    other: 'text-gray-400 bg-gray-400/10',
  };

  const statusColors: Record<string, string> = {
    connected: 'text-emerald-400 bg-emerald-400/10',
    pending: 'text-yellow-400 bg-yellow-400/10',
    disconnected: 'text-red-400 bg-red-400/10',
  };

  const pc = providerColors[cluster.provider] || providerColors.other;
  const sc = statusColors[cluster.status] || statusColors.pending;

  return (
    <Link
      to={`/clusters/${cluster.id}`}
      className="bg-surface-800 border border-white/5 rounded-xl p-5 hover:border-cyan-500/30 transition-colors block"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold truncate">{cluster.name}</h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc}`}>
          {cluster.status}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pc}`}>
          {cluster.provider.toUpperCase()}
        </span>
        {cluster.last_seen_at && (
          <span className="text-xs text-gray-500">
            Last seen: {new Date(cluster.last_seen_at).toLocaleString()}
          </span>
        )}
      </div>
    </Link>
  );
}
