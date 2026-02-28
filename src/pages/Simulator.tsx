import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Play, AlertTriangle, CheckCircle, Server, Cpu, HardDrive } from 'lucide-react';
import { api } from '../lib/api';
import type { SimulationResult, Snapshot } from '../lib/api';

export default function Simulator() {
  const { id } = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [simType, setSimType] = useState('remove_node');
  const [nodeName, setNodeName] = useState('');
  const [removeNodes, setRemoveNodes] = useState(1);
  const [namespace, setNamespace] = useState('');
  const [cpuMultiplier, setCpuMultiplier] = useState(0.5);
  const [memMultiplier, setMemMultiplier] = useState(0.5);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getLatestSnapshot(id).then((s) => {
      setSnapshot(s);
      if (s.nodes.length > 0) setNodeName(s.nodes[0].name);
    }).catch(() => null);
  }, [id]);

  const runSimulation = async () => {
    if (!id) return;
    setRunning(true);
    setResult(null);
    try {
      let params: Record<string, unknown> = {};
      switch (simType) {
        case 'remove_node': params = { node_name: nodeName }; break;
        case 'scale_down': params = { remove_nodes: removeNodes }; break;
        case 'change_limits': params = { namespace, cpu_multiplier: cpuMultiplier, mem_multiplier: memMultiplier }; break;
      }
      const res = await api.simulate(id, simType, params);
      setResult(res);
    } catch {
      // ignore
    }
    setRunning(false);
  };

  const impactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const namespaces = snapshot ? [...new Set(snapshot.pods.map(p => p.namespace))] : [];

  return (
    <div className="space-y-6">
      {/* Scenario Configuration */}
      <div className="bg-surface-800 border border-white/5 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-cyan-400" />
          What-If Scenario
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scenario Type */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Scenario Type</label>
            <div className="space-y-2">
              {[
                { value: 'remove_node', label: 'Remove Node', desc: 'Simulate a node failure or removal' },
                { value: 'scale_down', label: 'Scale Down', desc: 'Remove N nodes to save costs' },
                { value: 'change_limits', label: 'Change Limits', desc: 'Adjust CPU/memory limits' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                  simType === opt.value ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/5 hover:bg-white/[0.02]'
                }`}>
                  <input
                    type="radio"
                    name="simType"
                    value={opt.value}
                    checked={simType === opt.value}
                    onChange={(e) => setSimType(e.target.value)}
                    className="mt-1 accent-cyan-400"
                  />
                  <div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Parameters</label>
            <div className="space-y-3">
              {simType === 'remove_node' && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Node Name</label>
                  <select
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    className="w-full bg-surface-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    {snapshot?.nodes.map((n) => (
                      <option key={n.name} value={n.name}>{n.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {simType === 'scale_down' && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nodes to remove</label>
                  <input
                    type="number"
                    min={1}
                    max={snapshot?.nodes.length || 1}
                    value={removeNodes}
                    onChange={(e) => setRemoveNodes(parseInt(e.target.value) || 1)}
                    className="w-full bg-surface-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {simType === 'change_limits' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Namespace (optional)</label>
                    <select
                      value={namespace}
                      onChange={(e) => setNamespace(e.target.value)}
                      className="w-full bg-surface-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">All namespaces</option>
                      {namespaces.map((ns) => (
                        <option key={ns} value={ns}>{ns}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">CPU Multiplier ({(cpuMultiplier * 100).toFixed(0)}%)</label>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={cpuMultiplier}
                        onChange={(e) => setCpuMultiplier(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Memory Multiplier ({(memMultiplier * 100).toFixed(0)}%)</label>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={memMultiplier}
                        onChange={(e) => setMemMultiplier(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={runSimulation}
              disabled={running}
              className="mt-4 w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {running ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Impact Banner */}
          <div className={`border rounded-xl p-5 ${impactColor(result.impact)}`}>
            <div className="flex items-center gap-3">
              {result.impact === 'safe' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
              <div>
                <div className="font-semibold uppercase text-sm tracking-wider">{result.impact} Impact</div>
                <div className="text-sm opacity-80 mt-1">{result.summary}</div>
              </div>
            </div>
          </div>

          {/* Resource Delta */}
          {result.resource_delta && result.resource_delta.cpu_before_millis > 0 && (
            <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
              <h4 className="text-sm font-medium text-gray-400 mb-4">Resource Impact</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DeltaCard icon={<Cpu className="w-4 h-4 text-purple-400" />} label="CPU Capacity" before={`${result.resource_delta.cpu_before_millis}m`} after={`${result.resource_delta.cpu_after_millis}m`} />
                <DeltaCard icon={<HardDrive className="w-4 h-4 text-orange-400" />} label="Memory" before={formatBytes(result.resource_delta.mem_before_bytes)} after={formatBytes(result.resource_delta.mem_after_bytes)} />
                <DeltaCard icon={<Cpu className="w-4 h-4 text-cyan-400" />} label="CPU Utilization" before={`${result.resource_delta.cpu_util_before.toFixed(1)}%`} after={`${result.resource_delta.cpu_util_after.toFixed(1)}%`} />
                <DeltaCard icon={<HardDrive className="w-4 h-4 text-cyan-400" />} label="Memory Utilization" before={`${result.resource_delta.mem_util_before.toFixed(1)}%`} after={`${result.resource_delta.mem_util_after.toFixed(1)}%`} />
              </div>
            </div>
          )}

          {/* Cost Savings */}
          {result.cost_savings_monthly > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
              <div className="text-sm text-emerald-400">Estimated Monthly Savings</div>
              <div className="text-3xl font-bold text-emerald-400">${result.cost_savings_monthly.toFixed(0)}/mo</div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
              <h4 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Warnings
              </h4>
              <div className="space-y-2">
                {result.warnings.map((w, i) => (
                  <div key={i} className="text-sm text-yellow-300 bg-yellow-400/5 rounded-lg px-4 py-3">{w}</div>
                ))}
              </div>
            </div>
          )}

          {/* Evicted Pods */}
          {result.evicted_pods && result.evicted_pods.length > 0 && (
            <div className="bg-surface-800 border border-white/5 rounded-xl">
              <div className="p-5 border-b border-white/5">
                <h4 className="font-semibold flex items-center gap-2">
                  <Server className="w-4 h-4 text-red-400" />
                  Affected Pods ({result.evicted_pods.length})
                </h4>
              </div>
              <div className="divide-y divide-white/5">
                {result.evicted_pods.map((pod, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{pod.namespace}/{pod.name}</div>
                      <div className="text-xs text-gray-500">{pod.reason}</div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      pod.can_reschedule ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
                    }`}>
                      {pod.can_reschedule ? 'Can Reschedule' : 'No Capacity'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaCard({ icon, label, before, after }: { icon: React.ReactNode; label: string; before: string; after: string }) {
  return (
    <div className="bg-surface-900 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">{before}</span>
        <span className="text-gray-600">→</span>
        <span className="text-white font-medium">{after}</span>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0';
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(1)} GiB`;
  return `${(bytes / 1024 / 1024).toFixed(0)} MiB`;
}
