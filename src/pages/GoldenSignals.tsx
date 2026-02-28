import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Gauge, AlertCircle, Radio, Zap, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { GoldenSignals as GoldenSignalsType } from '../lib/api';

export default function GoldenSignals() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<GoldenSignalsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getGoldenSignals(id).then(setData).catch(() => null).finally(() => setLoading(false));
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
        <Gauge className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Signal Data</h3>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (status === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const statusColor = (status: string) => {
    if (status === 'healthy') return 'border-emerald-500/30';
    if (status === 'warning') return 'border-yellow-500/30';
    return 'border-red-500/30';
  };

  const healthColor = (h: string) => {
    if (h === 'healthy') return 'text-emerald-400 bg-emerald-400/10';
    if (h === 'degraded') return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  return (
    <div className="space-y-6">
      {/* 4 Signal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Saturation */}
        <div className={`bg-surface-800 border-2 ${statusColor(data.saturation.status)} rounded-xl p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <Gauge className="w-5 h-5 text-orange-400" />
            <span className="font-semibold">Saturation</span>
            {statusIcon(data.saturation.status)}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <GaugeMetric label="CPU Requests" value={data.saturation.cpu_request_percent} />
            <GaugeMetric label="Memory Requests" value={data.saturation.mem_request_percent} />
            <GaugeMetric label="Pod Capacity" value={data.saturation.pod_capacity_used} />
          </div>
          <p className="text-xs text-gray-400">{data.saturation.message}</p>
        </div>

        {/* Errors */}
        <div className={`bg-surface-800 border-2 ${statusColor(data.errors.status)} rounded-xl p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="font-semibold">Errors</span>
            {statusIcon(data.errors.status)}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[10px] text-gray-500">Crashing</div>
              <div className={`text-xl font-bold ${data.errors.crashing_pods > 0 ? 'text-red-400' : ''}`}>{data.errors.crashing_pods}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Not Ready</div>
              <div className={`text-xl font-bold ${data.errors.not_ready_pods > 0 ? 'text-yellow-400' : ''}`}>{data.errors.not_ready_pods}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Restarting</div>
              <div className="text-xl font-bold">{data.errors.restarting_pods}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Total Restarts</div>
              <div className="text-xl font-bold">{data.errors.total_restarts}</div>
            </div>
          </div>
          {data.errors.top_restarters && data.errors.top_restarters.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] text-gray-500 mb-1">Top Restarters</div>
              <div className="flex flex-wrap gap-1">
                {data.errors.top_restarters.map((r, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Traffic / Availability */}
        <div className={`bg-surface-800 border-2 ${statusColor(data.traffic.status)} rounded-xl p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <Radio className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">Traffic / Availability</span>
            {statusIcon(data.traffic.status)}
          </div>
          <div className="flex items-center gap-6 mb-3">
            <div>
              <div className="text-4xl font-bold">{data.traffic.availability_percent}%</div>
              <div className="text-[10px] text-gray-500 mt-1">Availability</div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {data.traffic.running_pods} running
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                {data.traffic.pending_pods} pending
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {data.traffic.total_pods} total
              </div>
            </div>
          </div>
        </div>

        {/* Utilization */}
        <div className={`bg-surface-800 border-2 ${statusColor(data.utilization.status)} rounded-xl p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="font-semibold">Utilization</span>
            {statusIcon(data.utilization.status)}
          </div>
          <div className="space-y-3">
            <UtilBar label="CPU Usage" value={data.utilization.cpu_usage_percent} />
            <UtilBar label="Memory Usage" value={data.utilization.mem_usage_percent} />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <div className="text-[10px] text-gray-500">CPU Efficiency</div>
                <div className="text-lg font-bold">{data.utilization.cpu_efficiency}%</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Mem Efficiency</div>
                <div className="text-lg font-bold">{data.utilization.mem_efficiency}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Namespace Health */}
      {data.by_namespace && data.by_namespace.length > 0 && (
        <div className="bg-surface-800 border border-white/5 rounded-xl">
          <div className="p-5 border-b border-white/5">
            <h3 className="font-semibold text-sm">Namespace Health</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-gray-400 font-medium p-4">Namespace</th>
                  <th className="text-center text-xs text-gray-400 font-medium p-4">Health</th>
                  <th className="text-center text-xs text-gray-400 font-medium p-4">Pods</th>
                  <th className="text-center text-xs text-gray-400 font-medium p-4">Restarts</th>
                  <th className="text-center text-xs text-gray-400 font-medium p-4">CPU Req</th>
                  <th className="text-center text-xs text-gray-400 font-medium p-4">Mem Req</th>
                </tr>
              </thead>
              <tbody>
                {data.by_namespace.map(ns => (
                  <tr key={ns.namespace} className="border-b border-white/5 last:border-0">
                    <td className="p-4 text-sm font-medium font-mono">{ns.namespace}</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${healthColor(ns.health)}`}>
                        {ns.health}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-center">{ns.pods}</td>
                    <td className={`p-4 text-sm text-center ${ns.restarts > 5 ? 'text-red-400' : ''}`}>{ns.restarts}</td>
                    <td className="p-4 text-sm text-center text-gray-400">{ns.cpu_request}m</td>
                    <td className="p-4 text-sm text-center text-gray-400">{Math.round(ns.mem_request / 1024 / 1024)}Mi</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function GaugeMetric({ label, value }: { label: string; value: number }) {
  const color = value > 80 ? 'text-red-400' : value > 60 ? 'text-yellow-400' : 'text-emerald-400';
  const barColor = value > 80 ? 'bg-red-500' : value > 60 ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}%</div>
      <div className="h-1.5 bg-surface-900 rounded-full mt-1 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function UtilBar({ label, value }: { label: string; value: number }) {
  const color = value > 80 ? 'bg-red-500' : value > 50 ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-2.5 bg-surface-900 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}
