import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, AlertTriangle, ChevronDown, ChevronUp, Target, Zap } from 'lucide-react';
import { api } from '../lib/api';
import type { AttackPathAnalysis, AttackPath } from '../lib/api';

export default function AttackPaths() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AttackPathAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getAttackPaths(id).then(setData).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.total_paths === 0) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Attack Paths Found</h3>
        <p className="text-gray-400 text-sm">Your cluster appears secure from known attack vectors</p>
      </div>
    );
  }

  const riskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-400 bg-red-400/10';
      case 'high': return 'text-orange-400 bg-orange-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-blue-400 bg-blue-400/10';
    }
  };

  const nodeTypeColor = (type: string) => {
    switch (type) {
      case 'entry': return 'border-blue-500 bg-blue-500/10';
      case 'escalation': return 'border-orange-500 bg-orange-500/10';
      case 'lateral': return 'border-purple-500 bg-purple-500/10';
      case 'target': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-2">Risk Score</div>
          <div className={`text-4xl font-bold ${data.risk_score >= 70 ? 'text-red-400' : data.risk_score >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {data.risk_score}<span className="text-lg text-gray-500">/100</span>
          </div>
        </div>
        <StatCard icon={<Target className="w-5 h-5 text-red-400" />} label="Total Paths" value={data.total_paths} />
        <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} label="Critical" value={data.critical_paths} />
        <StatCard icon={<Zap className="w-5 h-5 text-orange-400" />} label="High" value={data.high_paths} />
      </div>

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Recommendations</h3>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-emerald-400 bg-emerald-400/5 rounded-lg px-4 py-3">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attack Paths */}
      <div className="bg-surface-800 border border-white/5 rounded-xl">
        <div className="p-5 border-b border-white/5">
          <h3 className="font-semibold">Attack Paths ({data.total_paths})</h3>
        </div>
        <div className="divide-y divide-white/5">
          {data.attack_paths.map((path) => {
            const expanded = expandedPath === path.id;
            return (
              <div key={path.id}>
                <button
                  onClick={() => setExpandedPath(expanded ? null : path.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${riskColor(path.risk)}`}>
                    {path.risk}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{path.name}</div>
                    <div className="text-xs text-gray-500 truncate">{path.description}</div>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{path.nodes.length} steps</span>
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
                {expanded && <AttackPathDetail path={path} nodeTypeColor={nodeTypeColor} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AttackPathDetail({ path, nodeTypeColor }: { path: AttackPath; nodeTypeColor: (t: string) => string }) {
  return (
    <div className="px-6 pb-6">
      {/* Kill Chain Visualization */}
      <div className="flex items-start gap-0 overflow-x-auto pb-4">
        {path.nodes.map((node, i) => (
          <div key={node.id} className="flex items-start flex-shrink-0">
            <div className={`border-2 rounded-xl p-4 w-48 ${nodeTypeColor(node.type)}`}>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{node.type}</div>
              <div className="text-sm font-semibold mb-1">{node.label}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{node.detail}</div>
            </div>
            {i < path.nodes.length - 1 && (
              <div className="flex flex-col items-center justify-center mx-2 mt-6 flex-shrink-0">
                <div className="text-xs text-gray-500 mb-1">{path.edges[i]?.technique}</div>
                <div className="w-12 h-0.5 bg-gray-600 relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-6 border-l-gray-600" />
                </div>
                <div className="text-xs text-gray-600 mt-1 max-w-[80px] text-center">{path.edges[i]?.label}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MITRE ATT&CK Techniques */}
      <div className="mt-4 bg-surface-900 rounded-lg p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">MITRE ATT&CK Techniques</div>
        <div className="flex flex-wrap gap-2">
          {path.edges.map((edge, i) => (
            <span key={i} className="text-xs font-mono px-2 py-1 rounded bg-purple-500/10 text-purple-400">
              {edge.technique} - {edge.description}
            </span>
          ))}
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
