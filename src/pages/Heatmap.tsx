import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Flame, Server } from 'lucide-react';
import { api } from '../lib/api';
import type { HeatmapData } from '../lib/api';

export default function Heatmap() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getHeatmap(id).then(setData).catch(() => null).finally(() => setLoading(false));
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
        <Flame className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Heatmap Data</h3>
      </div>
    );
  }

  const heatColor = (intensity: number) => {
    if (intensity > 0.8) return 'bg-red-500/80 text-white';
    if (intensity > 0.6) return 'bg-orange-500/60 text-white';
    if (intensity > 0.4) return 'bg-yellow-500/50 text-white';
    if (intensity > 0.2) return 'bg-emerald-500/40 text-white';
    return 'bg-emerald-500/20 text-gray-300';
  };

  const barColor = (pct: number) => {
    if (pct > 80) return 'bg-red-500';
    if (pct > 60) return 'bg-orange-500';
    if (pct > 40) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const metricLabel: Record<string, string> = {
    cpu_request: 'CPU Request',
    mem_request: 'Memory Request',
    pod_count: 'Pod Count',
  };

  return (
    <div className="space-y-6">
      {/* Namespace Heatmap */}
      <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Namespace Resource Heatmap
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-gray-500 font-medium p-2">Namespace</th>
                {data.metrics.map(m => (
                  <th key={m} className="text-center text-xs text-gray-500 font-medium p-2">
                    {metricLabel[m] || m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.namespaces.map(ns => (
                <tr key={ns}>
                  <td className="text-sm font-mono p-2">{ns}</td>
                  {data.metrics.map(metric => {
                    const cell = data.cells.find(c => c.namespace === ns && c.metric === metric);
                    return (
                      <td key={metric} className="p-2">
                        <div className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${heatColor(cell?.intensity ?? 0)}`}>
                          {metric === 'pod_count'
                            ? cell?.value ?? 0
                            : metric === 'mem_request'
                              ? `${Math.round((cell?.value ?? 0) / 1024 / 1024)}Mi`
                              : `${cell?.value ?? 0}m`}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Node Resource Map */}
      <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Node Resource Utilization
        </h3>
        <div className="space-y-4">
          {data.node_map.map(node => (
            <div key={node.node_name} className="bg-surface-900 rounded-lg p-4">
              <div className="font-medium text-sm mb-3">{node.node_name}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ResourceBar label="CPU" percent={node.cpu_percent} detail={`${node.cpu_requested}m / ${node.cpu_capacity}m`} color={barColor(node.cpu_percent)} />
                <ResourceBar label="Memory" percent={node.mem_percent} detail={`${Math.round(node.mem_requested / 1024 / 1024)}Mi / ${Math.round(node.mem_capacity / 1024 / 1024)}Mi`} color={barColor(node.mem_percent)} />
                <ResourceBar label="Pods" percent={node.pod_percent} detail={`${node.pod_count} / ${node.max_pods}`} color={barColor(node.pod_percent)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourceBar({ label, percent, detail, color }: { label: string; percent: number; detail: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-mono">{percent}%</span>
      </div>
      <div className="h-3 bg-surface-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="text-[10px] text-gray-500 mt-1">{detail}</div>
    </div>
  );
}
