import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { api } from '../lib/api';
import type { ServiceMeshResponse, ServiceMeshNode, ServiceMeshEdge } from '../lib/api';

/* ── ArgoCD-style colours ── */
const KIND_COLORS: Record<string, string> = {
  Node: '#f59e0b', Namespace: '#8b5cf6', Ingress: '#a855f7', Service: '#06b6d4',
  Endpoints: '#0891b2', Deployment: '#3b82f6', ReplicaSet: '#6366f1',
  StatefulSet: '#7c3aed', DaemonSet: '#9333ea', Pod: '#22c55e', Job: '#14b8a6',
  CronJob: '#0d9488', ConfigMap: '#f97316', Secret: '#ef4444',
  ServiceAccount: '#ec4899', PVC: '#84cc16', PV: '#65a30d', StorageClass: '#16a34a',
  HPA: '#0ea5e9', PDB: '#d946ef', NetworkPolicy: '#f43f5e', Role: '#78716c',
  ClusterRole: '#57534e', RoleBinding: '#a1887f', ClusterRoleBinding: '#8d6e63',
  ResourceQuota: '#e11d48', LimitRange: '#be185d', ReplicationController: '#4f46e5',
  Event: '#eab308', CRD: '#7e22ce',
};

const STATUS_COLORS: Record<string, string> = {
  healthy: '#22c55e', degraded: '#eab308', unhealthy: '#ef4444',
};

const APP_KINDS = new Set(['Deployment', 'StatefulSet', 'DaemonSet', 'CronJob', 'Job']);

const KIND_ICONS: Record<string, string> = {
  Node: '\u2699', Namespace: '\u25A3', Ingress: '\u21C4', Service: '\u25C9',
  Endpoints: '\u25CE', Deployment: '\u25B6', ReplicaSet: '\u25B7',
  StatefulSet: '\u2593', DaemonSet: '\u2592', Pod: '\u2B22', Job: '\u25B8',
  CronJob: '\u23F0', ConfigMap: '\u2699', Secret: '\u26BF',
  ServiceAccount: '\u263A', PVC: '\u25A8', PV: '\u25A7', StorageClass: '\u2395',
  HPA: '\u2194', PDB: '\u26A0', NetworkPolicy: '\u26D4', Role: '\u229A',
  ClusterRole: '\u229B', RoleBinding: '\u21CB', ClusterRoleBinding: '\u21CC',
  Event: '\u26A1', CRD: '\u2756',
};

/* ── ArgoCD layout constants ── */
const NODE_W = 240;
const NODE_H = 48;
const H_GAP = 20;
const V_GAP = 2;

interface TreeNode {
  node: ServiceMeshNode;
  children: TreeNode[];
}

interface LayoutNode {
  id: string;
  meshNode: ServiceMeshNode;
  x: number;
  y: number;
  children: LayoutNode[];
}

/* ── Build tree ── */
function buildTreeForApp(
  app: ServiceMeshNode, allNodes: ServiceMeshNode[], edges: ServiceMeshEdge[]
): TreeNode {
  const nodeMap = new Map<string, ServiceMeshNode>();
  for (const n of allNodes) nodeMap.set(n.id, n);

  const childrenOf = new Map<string, Set<string>>();
  const parentsOf = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, new Set());
    childrenOf.get(e.source)!.add(e.target);
    if (!parentsOf.has(e.target)) parentsOf.set(e.target, new Set());
    parentsOf.get(e.target)!.add(e.source);
  }

  const forwardSet = new Set<string>();
  const q = [app.id];
  forwardSet.add(app.id);
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const k of childrenOf.get(cur) ?? []) {
      if (!forwardSet.has(k)) { forwardSet.add(k); q.push(k); }
    }
  }

  const reverseMap = new Map<string, Set<string>>();
  for (const fid of forwardSet) {
    for (const pid of parentsOf.get(fid) ?? []) {
      if (forwardSet.has(pid) || pid === app.id) continue;
      if (!reverseMap.has(fid)) reverseMap.set(fid, new Set());
      reverseMap.get(fid)!.add(pid);
      for (const gpid of parentsOf.get(pid) ?? []) {
        if (forwardSet.has(gpid) || reverseMap.get(fid)?.has(gpid)) continue;
        if (!reverseMap.has(pid)) reverseMap.set(pid, new Set());
        reverseMap.get(pid)!.add(gpid);
      }
    }
  }

  const visited = new Set<string>();

  function buildSubtree(id: string): TreeNode | null {
    if (visited.has(id)) return null;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node) return null;
    const children: TreeNode[] = [];
    for (const cid of childrenOf.get(id) ?? []) {
      if (forwardSet.has(cid)) {
        const child = buildSubtree(cid);
        if (child) children.push(child);
      }
    }
    for (const rid of reverseMap.get(id) ?? []) {
      if (visited.has(rid)) continue;
      const rNode = nodeMap.get(rid);
      if (!rNode) continue;
      visited.add(rid);
      const rChildren: TreeNode[] = [];
      for (const rrid of reverseMap.get(rid) ?? []) {
        if (visited.has(rrid)) continue;
        const rrNode = nodeMap.get(rrid);
        if (rrNode) { visited.add(rrid); rChildren.push({ node: rrNode, children: [] }); }
      }
      children.push({ node: rNode, children: rChildren });
    }
    children.sort((a, b) => a.node.kind.localeCompare(b.node.kind) || a.node.name.localeCompare(b.node.name));
    return { node, children };
  }

  return buildSubtree(app.id) || { node: app, children: [] };
}

/* ── Layout (LR like ArgoCD) ── */
function layoutTree(tree: TreeNode): { root: LayoutNode; width: number; height: number } {
  // Compute compact height of each subtree - no extra gap, just nodes touching
  function subtreeHeight(t: TreeNode): number {
    if (t.children.length === 0) return NODE_H;
    let h = 0;
    for (const c of t.children) {
      if (h > 0) h += V_GAP;
      h += subtreeHeight(c);
    }
    return h;
  }

  function position(t: TreeNode, depth: number, topY: number): LayoutNode {
    const x = depth * (NODE_W + H_GAP);
    if (t.children.length === 0) {
      return { id: t.node.id, meshNode: t.node, x, y: topY, children: [] };
    }

    let curY = topY;
    const lc: LayoutNode[] = [];
    for (const c of t.children) {
      const ch = subtreeHeight(c);
      lc.push(position(c, depth + 1, curY));
      curY += ch + V_GAP;
    }

    // Center parent among children
    const firstY = lc[0].y;
    const lastY = lc[lc.length - 1].y;
    const y = (firstY + lastY) / 2;

    return { id: t.node.id, meshNode: t.node, x, y, children: lc };
  }

  const root = position(tree, 0, 0);

  // Normalize: shift everything so minimum y = 0
  let minY = Infinity, maxX = 0, maxY = 0;
  (function findBounds(n: LayoutNode) {
    if (n.y < minY) minY = n.y;
    if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
    if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
    n.children.forEach(findBounds);
  })(root);

  if (minY < 0) {
    (function shift(n: LayoutNode) { n.y -= minY; n.children.forEach(shift); })(root);
    maxY -= minY;
  }

  return { root, width: maxX + 40, height: maxY + 20 };
}

/* ── YAML manifest builder ── */
function toYaml(node: ServiceMeshNode, data: ServiceMeshResponse | null): string {
  const lines: string[] = [];
  lines.push(`apiVersion: v1`);
  lines.push(`kind: ${node.kind}`);
  lines.push(`metadata:`);
  lines.push(`  name: ${node.name}`);
  if (node.namespace) lines.push(`  namespace: ${node.namespace}`);
  lines.push(`  status: ${node.status}`);
  if (node.details && Object.keys(node.details).length > 0) {
    lines.push(`spec:`);
    for (const [key, value] of Object.entries(node.details)) {
      if (value === null || value === undefined || value === '') continue;
      renderYamlValue(lines, key, value, 2);
    }
  }
  if (data) {
    const conns = data.edges.filter(e => e.source === node.id || e.target === node.id);
    if (conns.length > 0) {
      lines.push(`relations:`);
      for (const e of conns.slice(0, 20)) {
        const otherId = e.source === node.id ? e.target : e.source;
        const other = data.nodes.find(n => n.id === otherId);
        const dir = e.source === node.id ? '\u2192' : '\u2190';
        if (other) lines.push(`  - ${dir} ${other.kind}/${other.name}${e.type ? ` (${e.type})` : ''}`);
      }
    }
  }
  return lines.join('\n');
}

function renderYamlValue(lines: string[], key: string, value: unknown, indent: number) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) { lines.push(`${pad}${key}: []`); return; }
    if (typeof value[0] === 'object') {
      lines.push(`${pad}${key}:`);
      for (const item of value) {
        const entries = Object.entries(item as Record<string, unknown>);
        if (entries.length > 0) {
          lines.push(`${pad}  - ${entries[0][0]}: ${String(entries[0][1])}`);
          for (const [k, v] of entries.slice(1)) lines.push(`${pad}    ${k}: ${String(v)}`);
        }
      }
    } else {
      lines.push(`${pad}${key}:`);
      for (const item of value) lines.push(`${pad}  - ${String(item)}`);
    }
  } else if (typeof value === 'object' && value !== null) {
    lines.push(`${pad}${key}:`);
    for (const [k, v] of Object.entries(value)) renderYamlValue(lines, k, v, indent + 2);
  } else {
    lines.push(`${pad}${key}: ${String(value)}`);
  }
}

/* ── Main component ── */
export default function AppMesh() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ServiceMeshResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [selectedApp, setSelectedApp] = useState<ServiceMeshNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ServiceMeshNode | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!id) return;
    api.getServiceMesh(id).then((d) => {
      setData(d);
      const allNs = new Set<string>();
      for (const n of d.nodes) { if (n.namespace) allNs.add(n.namespace); }
      const sorted = Array.from(allNs).sort();
      if (sorted.length > 0) setSelectedNamespace(sorted[0]);
    }).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  const namespaces = useMemo(() => {
    if (!data) return [];
    const ns = new Set<string>();
    for (const n of data.nodes) { if (n.namespace) ns.add(n.namespace); }
    return Array.from(ns).sort();
  }, [data]);

  const apps = useMemo(() => {
    if (!data || !selectedNamespace) return [];
    return data.nodes
      .filter(n => APP_KINDS.has(n.kind) && n.namespace === selectedNamespace)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  }, [data, selectedNamespace]);

  const tree = useMemo(() => {
    if (!data || !selectedApp) return null;
    return buildTreeForApp(selectedApp, data.nodes, data.edges);
  }, [data, selectedApp]);

  const layout = useMemo(() => tree ? layoutTree(tree) : null, [tree]);

  useEffect(() => { setPan({ x: 40, y: 40 }); setZoom(1); }, [selectedApp]);

  const nsSummary = useMemo(() => {
    if (!data || !selectedNamespace) return {};
    const c: Record<string, number> = {};
    for (const n of data.nodes) { if (n.namespace === selectedNamespace) c[n.kind] = (c[n.kind] || 0) + 1; }
    return c;
  }, [data, selectedNamespace]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan(p => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseUp = useCallback(() => { isPanning.current = false; }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        setZoom(z => Math.max(0.2, Math.min(3, z * (e.deltaY > 0 ? 0.95 : 1.05))));
      } else {
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [data, selectedApp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="bg-surface-800 border border-white/5 rounded-xl p-12 text-center">
        <Share2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No App Mesh Data</h3>
        <p className="text-gray-400 text-sm">Waiting for cluster data</p>
      </div>
    );
  }

  // Collect layout nodes
  const allLayoutNodes: LayoutNode[] = [];
  function collectNodes(n: LayoutNode) { allLayoutNodes.push(n); n.children.forEach(collectNodes); }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/details/${id}`} className="p-2 rounded-lg bg-surface-800 border border-white/5 hover:bg-surface-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">App Mesh</h1>
          <p className="text-sm text-gray-400">{data.nodes.length} resources &middot; {data.edges.length} connections</p>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Left: Namespace + Apps */}
        <div className="w-64 flex flex-col bg-surface-800 border border-white/5 rounded-xl overflow-hidden flex-shrink-0">
          <div className="p-3 border-b border-white/5">
            <label className="text-[10px] uppercase text-gray-500 font-semibold mb-1.5 block">Namespace</label>
            <select
              value={selectedNamespace}
              onChange={e => { setSelectedNamespace(e.target.value); setSelectedApp(null); setSelectedNode(null); }}
              className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Select namespace...</option>
              {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
            </select>
          </div>

          {selectedNamespace && (
            <div className="px-3 py-2 border-b border-white/5 flex flex-wrap gap-1.5">
              {Object.entries(nsSummary).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([kind, count]) => (
                <span key={kind} className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${KIND_COLORS[kind] || '#6b7280'}15`, color: KIND_COLORS[kind] || '#6b7280' }}>
                  {count} {kind}
                </span>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {selectedNamespace && apps.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No apps in this namespace</div>
            )}
            {apps.map(app => {
              const color = KIND_COLORS[app.kind] || '#6b7280';
              const sc = STATUS_COLORS[app.status] || STATUS_COLORS.healthy;
              const isSel = selectedApp?.id === app.id;
              return (
                <button key={app.id}
                  onClick={() => { setSelectedApp(app); setSelectedNode(null); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors border-l-2 ${isSel ? 'bg-white/10 border-cyan-400' : 'border-transparent hover:bg-white/5'}`}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sc }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 truncate">{app.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color }}>{app.kind}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle: ArgoCD-style resource tree */}
        <div ref={containerRef}
          className="flex-1 bg-navy-950 border border-white/5 rounded-xl overflow-hidden relative"
          style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>

          {!selectedApp ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Share2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select an app to view its resource tree</p>
              </div>
            </div>
          ) : layout ? (
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Dashed edges like ArgoCD */}
                {(() => {
                  const lines: React.ReactElement[] = [];
                  function walkEdges(node: LayoutNode) {
                    for (const child of node.children) {
                      const x1 = node.x + NODE_W;
                      const y1 = node.y + NODE_H / 2;
                      const x2 = child.x;
                      const y2 = child.y + NODE_H / 2;
                      // ArgoCD uses straight lines with a midpoint step
                      const midX = x1 + (x2 - x1) / 2;
                      lines.push(
                        <path key={`${node.id}-${child.id}`}
                          d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                          className="mesh-edge"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          fill="none" />
                      );
                      walkEdges(child);
                    }
                  }
                  walkEdges(layout.root);
                  return lines;
                })()}

                {/* ArgoCD-style node cards */}
                {(() => {
                  collectNodes(layout.root);
                  return allLayoutNodes.map(ln => {
                    const n = ln.meshNode;
                    const color = KIND_COLORS[n.kind] || '#6b7280';
                    const sc = STATUS_COLORS[n.status] || '#22c55e';
                    const icon = KIND_ICONS[n.kind] || '\u25A1';
                    const isSel = selectedNode?.id === ln.id;

                    return (
                      <foreignObject key={ln.id} x={ln.x} y={ln.y} width={NODE_W} height={NODE_H}>
                        <div
                          onClick={() => setSelectedNode(n)}
                          className={`mesh-card h-full flex items-stretch cursor-pointer ${isSel ? 'mesh-card--active' : ''}`}
                        >
                          {/* Kind icon area */}
                          <div className="mesh-card__icon flex items-center justify-center flex-shrink-0"
                            style={{ width: '44px' }}>
                            <span style={{ color, fontSize: '18px' }}>{icon}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 flex flex-col justify-center px-2.5 min-w-0 overflow-hidden">
                            <div className="text-[12px] mesh-card__name truncate leading-tight font-medium">{n.name}</div>
                            <div className="text-[10px] leading-tight mt-1 mesh-card__kind">{n.kind}</div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-1.5 pr-2.5 flex-shrink-0">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sc, display: 'block' }} />
                          </div>
                        </div>
                      </foreignObject>
                    );
                  });
                })()}
              </g>
            </svg>
          ) : null}

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex gap-1">
            <button onClick={() => setZoom(z => Math.min(3, z * 1.2))}
              className="w-7 h-7 bg-surface-800/80 border border-white/10 rounded text-gray-400 hover:text-white flex items-center justify-center text-xs">+</button>
            <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))}
              className="w-7 h-7 bg-surface-800/80 border border-white/10 rounded text-gray-400 hover:text-white flex items-center justify-center text-xs">&minus;</button>
            <button onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); }}
              className="w-7 h-7 bg-surface-800/80 border border-white/10 rounded text-gray-400 hover:text-white flex items-center justify-center text-[9px]">1:1</button>
          </div>
        </div>

        {/* Right: YAML Manifest */}
        {selectedNode && (
          <div className="w-80 bg-surface-800 border border-white/5 rounded-xl overflow-hidden flex-shrink-0 flex flex-col">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: `${KIND_COLORS[selectedNode.kind] || '#6b7280'}20`, color: KIND_COLORS[selectedNode.kind] || '#6b7280' }}>
                {selectedNode.kind}
              </span>
              <span className="text-sm text-gray-300 truncate flex-1">{selectedNode.name}</span>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[selectedNode.status] || '#22c55e' }} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <pre className="px-4 py-3 text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-gray-300">
{toYaml(selectedNode, data)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
