import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GitCompare, Shield, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import type { NSCompareResponse, NamespaceProfile } from '../lib/api';

export default function NSCompare() {
  const { id } = useParams<{ id: string }>();
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [ns1, setNs1] = useState('');
  const [ns2, setNs2] = useState('');
  const [data, setData] = useState<NSCompareResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getNSCompare(id).then((res) => {
      if ('namespaces' in res) {
        setNamespaces(res.namespaces as string[]);
        if (res.namespaces.length >= 2) {
          setNs1((res.namespaces as string[])[0]);
          setNs2((res.namespaces as string[])[1]);
        }
      }
    }).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !ns1 || !ns2) return;
    api.getNSCompare(id, ns1, ns2).then((res) => {
      if ('ns1' in res) setData(res as NSCompareResponse);
    }).catch(() => null);
  }, [id, ns1, ns2]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (namespaces.length < 2) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <GitCompare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Not Enough Namespaces</h3>
        <p className="text-gray-400 text-sm">Need at least 2 namespaces to compare</p>
      </div>
    );
  }

  const comparisonData = data ? [
    { name: 'Pods', ns1: data.ns1.pod_count, ns2: data.ns2.pod_count },
    { name: 'CPU (m)', ns1: data.ns1.total_cpu_request, ns2: data.ns2.total_cpu_request },
    { name: 'Mem (Mi)', ns1: Math.round(data.ns1.total_mem_request / 1024 / 1024), ns2: Math.round(data.ns2.total_mem_request / 1024 / 1024) },
    { name: 'Restarts', ns1: data.ns1.total_restarts, ns2: data.ns2.total_restarts },
    { name: 'Root Pods', ns1: data.ns1.root_pods, ns2: data.ns2.root_pods },
    { name: 'No Probes', ns1: data.ns1.no_probes_pods, ns2: data.ns2.no_probes_pods },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Namespace 1</label>
            <select
              value={ns1}
              onChange={e => setNs1(e.target.value)}
              className="bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            >
              {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
            </select>
          </div>
          <GitCompare className="w-5 h-5 text-gray-500 mt-4" />
          <div>
            <label className="text-xs text-gray-400 block mb-1">Namespace 2</label>
            <select
              value={ns2}
              onChange={e => setNs2(e.target.value)}
              className="bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            >
              {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
            </select>
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Chart */}
          <div className="bg-surface-800 border border-white/5 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Comparison Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#151829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="ns1" name={ns1} fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ns2" name={ns2} fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NSCard profile={data.ns1} color="cyan" />
            <NSCard profile={data.ns2} color="purple" />
          </div>
        </>
      )}
    </div>
  );
}

function NSCard({ profile, color }: { profile: NamespaceProfile; color: string }) {
  const borderColor = color === 'cyan' ? 'border-t-cyan-500' : 'border-t-purple-500';
  const textColor = color === 'cyan' ? 'text-cyan-400' : 'text-purple-400';

  return (
    <div className={`bg-surface-800 border border-white/5 border-t-2 ${borderColor} rounded-xl p-5`}>
      <h3 className={`font-semibold text-lg mb-4 ${textColor}`}>{profile.namespace}</h3>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Pods" value={`${profile.running_pods}/${profile.pod_count}`} />
        <Metric label="CPU Request" value={`${profile.total_cpu_request}m`} />
        <Metric label="Mem Request" value={`${Math.round(profile.total_mem_request / 1024 / 1024)}Mi`} />
        <Metric label="CPU Usage" value={`${profile.total_cpu_usage}m`} />
        <Metric label="Mem Usage" value={`${Math.round(profile.total_mem_usage / 1024 / 1024)}Mi`} />
        <Metric label="Restarts" value={profile.total_restarts} warn={profile.total_restarts > 5} />
        <Metric label="Root Pods" value={profile.root_pods} warn={profile.root_pods > 0} />
        <Metric label="Privileged" value={profile.privileged_pods} warn={profile.privileged_pods > 0} />
        <Metric label="No Probes" value={profile.no_probes_pods} warn={profile.no_probes_pods > 0} />
        <Metric label="Latest Tag" value={profile.latest_tag_pods} warn={profile.latest_tag_pods > 0} />
      </div>

      {/* Security badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        {profile.root_pods === 0 && profile.privileged_pods === 0 && (
          <span className="text-[10px] font-medium px-2 py-1 rounded-full text-emerald-400 bg-emerald-400/10 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Secure
          </span>
        )}
        {profile.root_pods > 0 && (
          <span className="text-[10px] font-medium px-2 py-1 rounded-full text-red-400 bg-red-400/10 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Root Access
          </span>
        )}
        {profile.no_probes_pods > 0 && (
          <span className="text-[10px] font-medium px-2 py-1 rounded-full text-yellow-400 bg-yellow-400/10 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Missing Probes
          </span>
        )}
      </div>

      {/* Images */}
      {profile.images && profile.images.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-1">Images ({profile.images.length})</div>
          <div className="flex flex-wrap gap-1">
            {profile.images.map(img => (
              <span key={img} className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-900 text-gray-400 break-all">
                {img}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={`text-sm font-semibold ${warn ? 'text-red-400' : ''}`}>{value}</div>
    </div>
  );
}
