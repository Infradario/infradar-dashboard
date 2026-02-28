import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Shield, Server, ArrowLeft, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
              to={`/security/${cluster.id}`}
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

// ─── Security Detail Page ───────────────────────────────────────

export function SecurityDetail() {
  const { id } = useParams<{ id: string }>();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [security, setSecurity] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getCluster(id).catch(() => null),
      api.getSecurityReport(id).catch(() => null),
    ]).then(([c, sec]) => {
      setCluster(c);
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

  if (!security) {
    return (
      <div>
        <Link to="/security" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Security
        </Link>
        <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No security scan yet</h3>
          <p className="text-gray-400 text-sm">Security scans run automatically when the agent sends data</p>
        </div>
      </div>
    );
  }

  const r = security.report;
  const severityData = Object.entries(r.by_severity || {}).map(([name, value]) => ({ name, value }));
  const categoryData = Object.entries(r.by_category || {}).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  return (
    <div>
      <Link to="/security" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Security
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">{cluster.name}</h1>
        <span className="text-sm text-gray-500">{cluster.provider.toUpperCase()}</span>
      </div>

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
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
