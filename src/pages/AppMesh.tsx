import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, X, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import type { ServiceMeshResponse, ServiceMeshNode, ServiceMeshEdge } from '../lib/api';

interface SimNode extends ServiceMeshNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const KIND_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  Node:                  { fill: '#f59e0b', stroke: '#fbbf24', label: 'Node' },
  Namespace:             { fill: '#8b5cf6', stroke: '#a78bfa', label: 'Namespace' },
  Ingress:               { fill: '#a855f7', stroke: '#c084fc', label: 'Ingress' },
  Service:               { fill: '#06b6d4', stroke: '#22d3ee', label: 'Service' },
  Endpoints:             { fill: '#0891b2', stroke: '#22d3ee', label: 'Endpoints' },
  Deployment:            { fill: '#3b82f6', stroke: '#60a5fa', label: 'Deployment' },
  ReplicaSet:            { fill: '#6366f1', stroke: '#818cf8', label: 'ReplicaSet' },
  StatefulSet:           { fill: '#7c3aed', stroke: '#a78bfa', label: 'StatefulSet' },
  DaemonSet:             { fill: '#9333ea', stroke: '#c084fc', label: 'DaemonSet' },
  Pod:                   { fill: '#22c55e', stroke: '#4ade80', label: 'Pod' },
  Job:                   { fill: '#14b8a6', stroke: '#2dd4bf', label: 'Job' },
  CronJob:               { fill: '#0d9488', stroke: '#14b8a6', label: 'CronJob' },
  ConfigMap:             { fill: '#f97316', stroke: '#fb923c', label: 'ConfigMap' },
  Secret:                { fill: '#ef4444', stroke: '#f87171', label: 'Secret' },
  ServiceAccount:        { fill: '#ec4899', stroke: '#f472b6', label: 'ServiceAccount' },
  PVC:                   { fill: '#84cc16', stroke: '#a3e635', label: 'PVC' },
  PV:                    { fill: '#65a30d', stroke: '#84cc16', label: 'PV' },
  StorageClass:          { fill: '#16a34a', stroke: '#4ade80', label: 'StorageClass' },
  HPA:                   { fill: '#0ea5e9', stroke: '#38bdf8', label: 'HPA' },
  PDB:                   { fill: '#d946ef', stroke: '#e879f9', label: 'PDB' },
  NetworkPolicy:         { fill: '#f43f5e', stroke: '#fb7185', label: 'NetworkPolicy' },
  Role:                  { fill: '#78716c', stroke: '#a8a29e', label: 'Role' },
  ClusterRole:           { fill: '#57534e', stroke: '#78716c', label: 'ClusterRole' },
  RoleBinding:           { fill: '#a1887f', stroke: '#bcaaa4', label: 'RoleBinding' },
  ClusterRoleBinding:    { fill: '#8d6e63', stroke: '#a1887f', label: 'ClusterRoleBinding' },
  ResourceQuota:         { fill: '#e11d48', stroke: '#f43f5e', label: 'ResourceQuota' },
  LimitRange:            { fill: '#be185d', stroke: '#e11d48', label: 'LimitRange' },
  ReplicationController: { fill: '#4f46e5', stroke: '#6366f1', label: 'ReplicationController' },
  Event:                 { fill: '#eab308', stroke: '#facc15', label: 'Event' },
  CRD:                   { fill: '#7e22ce', stroke: '#9333ea', label: 'CRD' },
};

const DEFAULT_COLOR = { fill: '#6b7280', stroke: '#9ca3af', label: 'Resource' };

const STATUS_COLORS: Record<string, string> = {
  healthy:  '#22c55e',
  degraded: '#eab308',
  unhealthy: '#ef4444',
};

function getNodeRadius(node: ServiceMeshNode): number {
  switch (node.kind) {
    case 'Node': return 18;
    case 'Namespace': return 16;
    case 'Ingress': return 16;
    case 'Service': return 14;
    case 'Deployment':
    case 'StatefulSet':
    case 'DaemonSet': {
      const replicas = (node.details?.replicas as number) || 1;
      return 12 + Math.min(replicas * 2, 10);
    }
    case 'ReplicaSet': return 11;
    case 'Pod': return 8;
    case 'CronJob':
    case 'Job': return 12;
    case 'HPA':
    case 'PDB': return 11;
    case 'StorageClass':
    case 'ClusterRole':
    case 'ClusterRoleBinding': return 14;
    case 'CRD': return 14;
    case 'Event': return 7;
    default: return 10;
  }
}

export default function AppMesh() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ServiceMeshResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<ServiceMeshNode | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const [, forceRender] = useState(0);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ node: SimNode; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getServiceMesh(id).then(setData).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  // Compute which kinds are present in the data
  const presentKinds = useMemo(() => {
    if (!data) return [];
    const kinds = new Set<string>();
    for (const n of data.nodes) kinds.add(n.kind);
    return Array.from(kinds).sort();
  }, [data]);

  // Counts per kind
  const counts = useMemo(() => {
    if (!data) return {};
    const c: Record<string, number> = {};
    for (const n of data.nodes) {
      c[n.kind] = (c[n.kind] || 0) + 1;
    }
    return c;
  }, [data]);

  // Initialize simulation nodes
  useEffect(() => {
    if (!data) return;

    const width = 900;
    const height = 600;
    const nodes: SimNode[] = data.nodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 400,
      y: height / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }));
    nodesRef.current = nodes;

    let tick = 0;
    const maxTicks = 300;

    const simulate = () => {
      const simNodes = nodesRef.current;
      const edges = data.edges;

      for (const n of simNodes) {
        n.vx = 0;
        n.vy = 0;
      }

      const nodeMap = new Map<string, SimNode>();
      for (const n of simNodes) nodeMap.set(n.id, n);

      // Repulsion
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity
      const cx = width / 2;
      const cy = height / 2;
      for (const n of simNodes) {
        n.vx += (cx - n.x) * 0.005;
        n.vy += (cy - n.y) * 0.005;
      }

      // Apply velocities with damping
      const damping = 0.85;
      for (const n of simNodes) {
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(40, Math.min(width - 40, n.x));
        n.y = Math.max(40, Math.min(height - 40, n.y));
      }

      tick++;
      forceRender(tick);

      if (tick < maxTicks) {
        animRef.current = requestAnimationFrame(simulate);
      }
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [data]);

  const handleMouseDown = useCallback((e: React.MouseEvent, node: SimNode) => {
    e.preventDefault();
    dragRef.current = { node, offsetX: e.clientX - node.x, offsetY: e.clientY - node.y };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      dragRef.current.node.x = e.clientX - rect.left;
      dragRef.current.node.y = e.clientY - rect.top;
      forceRender((v) => v + 1);
    };
    const handleMouseUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
        <Share2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Service Mesh Data</h3>
        <p className="text-gray-400 text-sm">Waiting for cluster data with services and deployments</p>
      </div>
    );
  }

  const simNodes = nodesRef.current;
  const nodeMap = new Map<string, SimNode>();
  for (const n of simNodes) nodeMap.set(n.id, n);

  const filteredNodeIds = new Set(
    simNodes.filter(n => filter === 'all' || n.kind === filter).map(n => n.id)
  );
  const visibleEdges = data.edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

  // Top stats — only kinds with items, limited display
  const topKinds = presentKinds.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/details" className="p-2 rounded-lg bg-surface-800 border border-white/5 hover:bg-surface-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">App Mesh</h1>
          <p className="text-sm text-gray-400">Service dependency graph &middot; {data.nodes.length} resources &middot; {data.edges.length} connections</p>
        </div>
      </div>

      {/* Dynamic Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {topKinds.map(kind => {
          const color = KIND_COLORS[kind] || DEFAULT_COLOR;
          return (
            <button
              key={kind}
              onClick={() => setFilter(filter === kind ? 'all' : kind)}
              className={`bg-surface-800 border rounded-xl p-3 text-center transition-colors cursor-pointer ${
                filter === kind ? 'border-cyan-500/50' : 'border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-xl font-bold" style={{ color: color.fill }}>
                {counts[kind] || 0}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 truncate">{color.label}s</div>
            </button>
          );
        })}
      </div>

      {/* Filter dropdown */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-surface-800 text-gray-400 hover:text-white'
          }`}
        >
          All ({data.nodes.length})
        </button>

        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filter !== 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-surface-800 text-gray-400 hover:text-white'
            }`}
          >
            {filter !== 'all' ? filter : 'Filter by kind'}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {filterOpen && (
            <div className="absolute z-50 mt-1 w-56 bg-surface-800 border border-white/10 rounded-xl shadow-xl py-1 max-h-80 overflow-y-auto">
              {presentKinds.map(kind => {
                const color = KIND_COLORS[kind] || DEFAULT_COLOR;
                return (
                  <button
                    key={kind}
                    onClick={() => { setFilter(kind); setFilterOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 ${
                      filter === kind ? 'text-cyan-400' : 'text-gray-300'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.fill }} />
                    <span className="flex-1">{kind}</span>
                    <span className="text-gray-500 text-xs">{counts[kind]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Graph + Detail Panel */}
      <div className="flex gap-4">
        <div className="flex-1 bg-surface-800 border border-white/5 rounded-xl overflow-hidden">
          {/* Legend — scrollable */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 overflow-x-auto">
            {presentKinds.map(kind => {
              const color = KIND_COLORS[kind] || DEFAULT_COLOR;
              return (
                <div key={kind} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.fill }} />
                  <span className="text-[10px] text-gray-400">{kind}</span>
                </div>
              );
            })}
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Degraded</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Unhealthy</span>
            </div>
          </div>

          <svg ref={svgRef} viewBox="0 0 900 600" className="w-full" style={{ minHeight: 500 }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
              </marker>
            </defs>

            {/* Edges */}
            {visibleEdges.map((edge, i) => {
              const a = nodeMap.get(edge.source);
              const b = nodeMap.get(edge.target);
              if (!a || !b) return null;
              const r = getNodeRadius(b);
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const ex = b.x - (dx / dist) * r;
              const ey = b.y - (dy / dist) * r;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={ex}
                  y2={ey}
                  stroke="#4b5563"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                  opacity={0.6}
                />
              );
            })}

            {/* Nodes */}
            {simNodes.filter(n => filteredNodeIds.has(n.id)).map(node => {
              const r = getNodeRadius(node);
              const kindColor = KIND_COLORS[node.kind] || DEFAULT_COLOR;
              const statusColor = STATUS_COLORS[node.status] || STATUS_COLORS.healthy;
              const isSelected = selectedNode?.id === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleMouseDown(e, node)}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer"
                >
                  <circle
                    r={r + 3}
                    fill="none"
                    stroke={statusColor}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={isSelected ? 1 : 0.6}
                  />
                  <circle
                    r={r}
                    fill={kindColor.fill}
                    opacity={0.85}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={r > 10 ? 10 : 7}
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.kind.length <= 3 ? node.kind : node.kind[0]}
                  </text>
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize={9}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.name.length > 20 ? node.name.slice(0, 18) + '..' : node.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        {selectedNode && (
          <div className="w-80 bg-surface-800 border border-white/5 rounded-xl p-5 space-y-4 self-start">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: (KIND_COLORS[selectedNode.kind] || DEFAULT_COLOR).fill }}
                />
                <span className="text-sm font-semibold">{selectedNode.kind}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-white/5 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-lg break-all">{selectedNode.name}</h3>
              {selectedNode.namespace && (
                <p className="text-sm text-gray-400">{selectedNode.namespace}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  color: STATUS_COLORS[selectedNode.status] || '#9ca3af',
                  backgroundColor: `${STATUS_COLORS[selectedNode.status] || '#9ca3af'}20`,
                }}
              >
                {selectedNode.status}
              </span>
            </div>

            {selectedNode.details && Object.keys(selectedNode.details).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                {Object.entries(selectedNode.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm gap-2">
                    <span className="text-gray-500 flex-shrink-0">{key.replace(/_/g, ' ')}</span>
                    <span className="text-gray-300 font-mono text-xs text-right break-all">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Connected edges */}
            <div className="pt-2 border-t border-white/5">
              <h4 className="text-xs text-gray-500 mb-2 uppercase">Connections</h4>
              {data.edges
                .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                .slice(0, 20)
                .map((e, i) => {
                  const otherId = e.source === selectedNode.id ? e.target : e.source;
                  const other = data.nodes.find(n => n.id === otherId);
                  const direction = e.source === selectedNode.id ? '\u2192' : '\u2190';
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400 py-1">
                      <span>{direction}</span>
                      <span className="text-gray-300 truncate">{other?.name || otherId}</span>
                      <span className="ml-auto text-gray-600 flex-shrink-0">{e.type}</span>
                    </div>
                  );
                })}
              {data.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length > 20 && (
                <p className="text-xs text-gray-600 mt-1">
                  +{data.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length - 20} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
