import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Server } from 'lucide-react';
import { api } from '../lib/api';
import type { Cluster, SecurityReport } from '../lib/api';

interface ClusterSecurity {
  cluster: Cluster;
  report: SecurityReport | null;
}

export default function Security() {
  const [data, setData] = useState<ClusterSecurity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClusters().then(async (clusters) => {
      const results = await Promise.all(
        clusters.map(async (cluster) => {
          const report = await api.getSecurityReport(cluster.id).catch(() => null);
          return { cluster, report };
        })
      );
      setData(results);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Security Overview</h1>
        <p className="text-gray-400 mt-1">Security posture across all clusters</p>
      </div>

      {data.length === 0 ? (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clusters</h3>
          <p className="text-gray-400 text-sm">Add a cluster to start security scanning</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(({ cluster, report }) => (
            <Link
              key={cluster.id}
              to={`/clusters/${cluster.id}`}
              className="bg-surface-800 border border-white/5 rounded-xl p-6 hover:border-cyan-500/30 transition-colors block"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold">{cluster.name}</h3>
                </div>
                <span className="text-xs text-gray-500">{cluster.provider.toUpperCase()}</span>
              </div>

              {report ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className={`text-3xl font-bold ${
                        report.score >= 70 ? 'text-emerald-400' : report.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {report.score}<span className="text-sm text-gray-500">/100</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Security Score</div>
                    </div>
                    <ScoreRing score={report.score} />
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(report.report.by_severity || {}).map(([sev, count]) => (
                      <SeverityChip key={sev} severity={sev} count={count as number} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">No scan data</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#ef4444';

  return (
    <svg width="60" height="60" className="-rotate-90">
      <circle cx="30" cy="30" r={radius} fill="none" stroke="#1e2235" strokeWidth="4" />
      <circle
        cx="30" cy="30" r={radius} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function SeverityChip({ severity, count }: { severity: string; count: number }) {
  const colors: Record<string, string> = {
    critical: 'text-red-400 bg-red-400/10',
    high: 'text-orange-400 bg-orange-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    low: 'text-blue-400 bg-blue-400/10',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors[severity] || ''}`}>
      {count} {severity}
    </span>
  );
}
