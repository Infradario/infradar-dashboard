import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Target, Crosshair, GitCompare, Server,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../lib/api';
import type { SecurityReport } from '../lib/api';
import { useCluster } from '../hooks/useCluster';

export default function Security() {
  const { selected } = useCluster();
  const [security, setSecurity] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) { setLoading(false); return; }
    setLoading(true);
    api.getSecurityReport(selected.id).catch(() => null).then((sec) => {
      setSecurity(sec);
      setLoading(false);
    });
  }, [selected?.id]);

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

  const id = selected.id;

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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">{selected.name} — Security</h1>
        <span className="text-sm text-gray-500">{selected.provider.toUpperCase()}</span>
      </div>

      {/* Security Tools */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { to: `/security/${id}/attack-paths`, icon: Target, label: 'Attack Paths', color: 'text-red-400', bg: 'hover:bg-red-500/10' },
          { to: `/security/${id}/blast-radius`, icon: Crosshair, label: 'Blast Radius', color: 'text-orange-400', bg: 'hover:bg-orange-500/10' },
          { to: `/security/${id}/ns-compare`, icon: GitCompare, label: 'NS Compare', color: 'text-violet-400', bg: 'hover:bg-violet-500/10' },
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

      {!security ? (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No security scan yet</h3>
          <p className="text-gray-400 text-sm">Security scans run automatically when the agent sends data</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Score + stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
              <div className="text-sm text-gray-400 mb-2">Security Score</div>
              <div className={`text-4xl font-bold ${
                security.score >= 70 ? 'text-emerald-400' : security.score >= 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {security.score}<span className="text-lg text-gray-500">/100</span>
              </div>
            </div>
            <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} label="Findings" value={security.report.total_findings} />
            <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} label="Passed Rules" value={`${security.report.passed_rules}/${security.report.total_rules}`} />
            <StatCard icon={<XCircle className="w-5 h-5 text-red-400" />} label="Failed Rules" value={`${security.report.failed_rules}/${security.report.total_rules}`} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-400 mb-4">By Severity</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(security.report.by_severity || {}).map(([name, value]) => ({ name, value }))}>
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#151829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {Object.entries(security.report.by_severity || {}).map(([name]) => (
                      <Cell key={name} fill={severityColors[name] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-400 mb-4">By Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(security.report.by_category || {}).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))} layout="vertical">
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
              <h3 className="font-semibold">Findings ({security.report.findings?.length || 0})</h3>
            </div>
            <div className="divide-y divide-white/5">
              {(security.report.findings || []).map((f, i) => {
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
      )}
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
