import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Target, Crosshair, GitCompare, Server, ArrowUpDown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../lib/api';
import type { SecurityReport } from '../lib/api';
import { useCluster } from '../hooks/useCluster';
import { usePolling } from '../hooks/usePolling';
import { LiveIndicator } from '../components/LiveIndicator';

export default function Security() {
  const { selected } = useCluster();
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('severity-desc');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: security, loading, lastUpdated } = usePolling<SecurityReport | null>(
    () => selected ? api.getSecurityReport(selected.id).catch(() => null) : Promise.resolve(null),
    60000,
    [selected?.id],
  );

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
        <LiveIndicator lastUpdated={lastUpdated} />
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
          <FindingsList
            findings={security.report.findings || []}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterSeverity={filterSeverity}
            setFilterSeverity={setFilterSeverity}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            expandedRule={expandedRule}
            setExpandedRule={setExpandedRule}
            severityBadge={severityBadge}
          />
        </div>
      )}
    </div>
  );
}

const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

interface FindingsListProps {
  findings: SecurityReport['report']['findings'];
  sortBy: string;
  setSortBy: (v: string) => void;
  filterSeverity: string;
  setFilterSeverity: (v: string) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  expandedRule: string | null;
  setExpandedRule: (v: string | null) => void;
  severityBadge: Record<string, string>;
}

function FindingsList({
  findings, sortBy, setSortBy, filterSeverity, setFilterSeverity,
  filterCategory, setFilterCategory, searchQuery, setSearchQuery,
  expandedRule, setExpandedRule, severityBadge,
}: FindingsListProps) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    findings.forEach(f => f.category && set.add(f.category));
    return [...set].sort();
  }, [findings]);

  const processed = useMemo(() => {
    let result = [...findings];

    // Filter
    if (filterSeverity !== 'all') {
      result = result.filter(f => f.severity === filterSeverity);
    }
    if (filterCategory !== 'all') {
      result = result.filter(f => f.category === filterCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.rule_name.toLowerCase().includes(q) ||
        f.rule_id.toLowerCase().includes(q) ||
        f.resource?.toLowerCase().includes(q) ||
        f.namespace?.toLowerCase().includes(q) ||
        f.detail?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'severity-desc':
          return (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
        case 'severity-asc':
          return (severityOrder[b.severity] ?? 9) - (severityOrder[a.severity] ?? 9);
        case 'rule-id':
          return a.rule_id.localeCompare(b.rule_id);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'namespace':
          return (a.namespace || '').localeCompare(b.namespace || '');
        case 'resource':
          return (a.resource || '').localeCompare(b.resource || '');
        default:
          return 0;
      }
    });

    return result;
  }, [findings, sortBy, filterSeverity, filterCategory, searchQuery]);

  const selectClass = "bg-surface-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50";

  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl">
      <div className="p-5 border-b border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Findings ({processed.length}{processed.length !== findings.length ? ` / ${findings.length}` : ''})</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={selectClass}>
              <option value="severity-desc">Severity (High → Low)</option>
              <option value="severity-asc">Severity (Low → High)</option>
              <option value="rule-id">Rule ID</option>
              <option value="category">Category</option>
              <option value="namespace">Namespace</option>
              <option value="resource">Resource</option>
            </select>
          </div>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className={selectClass}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectClass}>
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search findings..."
            className="bg-surface-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-48"
          />
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {processed.map((f, i) => {
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
                    <div className="text-xs text-gray-500 mb-1">Description</div>
                    <div className="text-sm text-gray-300">{f.description}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Detail</div>
                    <div className="text-sm text-gray-300">{f.detail}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Remediation</div>
                    <div className="text-sm text-emerald-400">{f.remediation}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Benchmark</div>
                    <div className="text-sm text-cyan-400">{f.benchmark}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {processed.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No findings match your filters</div>
        )}
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
