import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Crosshair, AlertTriangle, Server, Boxes } from 'lucide-react';
import { api } from '../lib/api';
import type { BlastRadiusResult, Snapshot } from '../lib/api';

export default function BlastRadius() {
  const { id } = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [targetType, setTargetType] = useState<'node' | 'pod'>('node');
  const [targetName, setTargetName] = useState('');
  const [targetNs, setTargetNs] = useState('');
  const [result, setResult] = useState<BlastRadiusResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getLatestSnapshot(id).then((s) => {
      setSnapshot(s);
      if (s.nodes.length > 0) setTargetName(s.nodes[0].name);
    }).catch(() => null);
  }, [id]);

  const analyze = async () => {
    if (!id || !targetName) return;
    setLoading(true);
    try {
      const res = await api.getBlastRadius(id, targetType, targetName, targetType === 'pod' ? targetNs : undefined);
      setResult(res);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const namespaces = snapshot ? [...new Set(snapshot.pods.map(p => p.namespace))].sort() : [];
  const pods = snapshot?.pods.filter(p => !targetNs || p.namespace === targetNs) || [];

  // Auto-select first namespace when switching to pod mode
  useEffect(() => {
    if (targetType === 'pod' && !targetNs && namespaces.length > 0) {
      setTargetNs(namespaces[0]);
    }
  }, [targetType, targetNs, namespaces]);

  const riskColors: Record<string, string> = {
    full: 'text-red-400 bg-red-500/10 border-red-500/20',
    partial: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    none: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  const zoneColors = [
    { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Target Selection */}
      <div className="bg-surface-800 border border-white/5 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-cyan-400" />
          Blast Radius Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Target Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setTargetType('node'); setTargetName(snapshot?.nodes[0]?.name || ''); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  targetType === 'node' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-white/10 text-gray-400'
                }`}
              >
                <Server className="w-4 h-4" /> Node
              </button>
              <button
                onClick={() => { setTargetType('pod'); setTargetName(''); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  targetType === 'pod' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-white/10 text-gray-400'
                }`}
              >
                <Boxes className="w-4 h-4" /> Pod
              </button>
            </div>
          </div>

          {targetType === 'pod' && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Namespace</label>
              <select
                value={targetNs}
                onChange={(e) => { setTargetNs(e.target.value); setTargetName(''); }}
                className="w-full bg-surface-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">All</option>
                {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Target</label>
            <select
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              className="w-full bg-surface-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="">Select...</option>
              {targetType === 'node'
                ? snapshot?.nodes.map(n => <option key={n.name} value={n.name}>{n.name}</option>)
                : pods.map(p => <option key={`${p.namespace}/${p.name}`} value={p.name}>{p.name}</option>)
              }
            </select>
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={loading || !targetName}
          className="mt-4 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Crosshair className="w-4 h-4" />
          )}
          Analyze
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Impact */}
          <div className={`border rounded-xl p-5 ${riskColors[result.impact.downtime_risk] || riskColors.none}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <div className="font-semibold uppercase text-sm tracking-wider">{result.impact.downtime_risk} Downtime Risk</div>
                <div className="text-sm opacity-80 mt-1">{result.impact.description}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>Affected Pods: <span className="font-bold">{result.impact.affected_pods}</span></div>
              <div>Affected Services: <span className="font-bold">{result.impact.affected_services}</span></div>
            </div>
          </div>

          {/* Cascade Chain */}
          {result.impact.cascade_chain && result.impact.cascade_chain.length > 0 && (
            <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Cascade Chain</h4>
              <div className="space-y-2">
                {result.impact.cascade_chain.map((c, i) => (
                  <div key={i} className="text-sm text-orange-400 bg-orange-400/5 rounded-lg px-4 py-3">
                    {i + 1}. {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blast Zones */}
          <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
            <h4 className="text-sm font-medium text-gray-400 mb-4">Impact Zones</h4>
            <div className="space-y-4">
              {result.zones.map((zone) => {
                const colors = zoneColors[zone.level] || zoneColors[2];
                return (
                  <div key={zone.level} className={`border rounded-xl p-4 ${colors.border} ${colors.bg}`}>
                    <div className={`text-sm font-semibold mb-3 ${colors.text}`}>
                      Zone {zone.level}: {zone.label} ({zone.services.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {zone.services.map((svc) => (
                        <div key={svc.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/50 text-sm ${
                          svc.critical ? 'ring-1 ring-red-500/50' : ''
                        }`}>
                          {svc.type === 'node' ? <Server className="w-3.5 h-3.5 text-gray-400" /> : <Boxes className="w-3.5 h-3.5 text-gray-400" />}
                          <span className="font-medium">{svc.name}</span>
                          {svc.namespace && <span className="text-xs text-gray-500">{svc.namespace}</span>}
                          {svc.critical && <span className="text-xs text-red-400 font-medium">CRITICAL</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dependency Graph */}
          {result.dependencies.length > 0 && (
            <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Dependencies ({result.dependencies.length})</h4>
              <div className="space-y-1">
                {result.dependencies.slice(0, 20).map((dep, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-mono text-gray-400 py-1">
                    <span className="text-cyan-400">{dep.from}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-900 text-gray-300">{dep.label}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-purple-400">{dep.to}</span>
                  </div>
                ))}
                {result.dependencies.length > 20 && (
                  <div className="text-xs text-gray-500 pt-2">...and {result.dependencies.length - 20} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
