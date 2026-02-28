import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { api } from '../lib/api';
import type { ServiceMeshResponse, ServiceMeshNode, ServiceMeshEdge } from '../lib/api';

const KIND_COLORS: Record<string, string> = {
  Node:                  '#f59e0b',
  Namespace:             '#8b5cf6',
  Ingress:               '#a855f7',
  Service:               '#06b6d4',
  Endpoints:             '#0891b2',
  Deployment:            '#3b82f6',
  ReplicaSet:            '#6366f1',
  StatefulSet:           '#7c3aed',
  DaemonSet:             '#9333ea',
  Pod:                   '#22c55e',
  Job:                   '#14b8a6',
  CronJob:               '#0d9488',
  ConfigMap:             '#f97316',
  Secret:                '#ef4444',
  ServiceAccount:        '#ec4899',
  PVC:                   '#84cc16',
  PV:                    '#65a30d',
  StorageClass:          '#16a34a',
  HPA:                   '#0ea5e9',
  PDB:                   '#d946ef',
  NetworkPolicy:         '#f43f5e',
  Role:                  '#78716c',
  ClusterRole:           '#57534e',
  RoleBinding:           '#a1887f',
  ClusterRoleBinding:    '#8d6e63',
  ResourceQuota:         '#e11d48',
  LimitRange:            '#be185d',
  ReplicationController: '#4f46e5',
  Event:                 '#eab308',
  CRD:                   '#7e22ce',
};

const STATUS_COLORS: Record<string, string> = {
  healthy:   '#22c55e',
  degraded:  '#eab308',
  unhealthy: '#ef4444',
};

const APP_KINDS = new Set(['Deployment', 'StatefulSet', 'DaemonSet', 'CronJob', 'Job']);

interface TreeNode {
  node: ServiceMeshNode;
  children: TreeNode[];
}

function buildTreeForApp(
  app: ServiceMeshNode,
  allNodes: ServiceMeshNode[],
  edges: ServiceMeshEdge[]
): TreeNode {
  const nodeMap = new Map<string, ServiceMeshNode>();
  for (const n of allNodes) nodeMap.set(n.id, n);

  // Build adjacency: source -> targets
  const childrenOf = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, new Set());
    childrenOf.get(e.source)!.add(e.target);
  }

  const visited = new Set<string>();

  function buildSubtree(id: string): TreeNode | null {
    if (visited.has(id)) return null;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node) return null;

    const children: TreeNode[] = [];
    const childIds = childrenOf.get(id);
    if (childIds) {
      for (const cid of childIds) {
        const child = buildSubtree(cid);
        if (child) children.push(child);
      }
    }

    // Sort children: workload kinds first, then alphabetically
    children.sort((a, b) => {
      const aWork = APP_KINDS.has(a.node.kind) ? 0 : 1;
      const bWork = APP_KINDS.has(b.node.kind) ? 0 : 1;
      if (aWork !== bWork) return aWork - bWork;
      return a.node.kind.localeCompare(b.node.kind) || a.node.name.localeCompare(b.node.name);
    });

    return { node, children };
  }

  // Also find nodes that point TO this app (e.g., HPA → Deployment, PDB → Pod)
  const reverseChildren: TreeNode[] = [];
  for (const e of edges) {
    if (e.target === app.id && !visited.has(e.source)) {
      const n = nodeMap.get(e.source);
      if (n && (n.kind === 'HPA' || n.kind === 'PDB' || n.kind === 'NetworkPolicy' || n.kind === 'Ingress')) {
        visited.add(e.source);
        reverseChildren.push({ node: n, children: [] });
      }
    }
  }

  const tree = buildSubtree(app.id);
  if (!tree) return { node: app, children: [] };

  // Prepend reverse children (things that target this app)
  tree.children = [...reverseChildren, ...tree.children];

  return tree;
}

function TreeRow({ treeNode, depth, selectedId, onSelect }: {
  treeNode: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (node: ServiceMeshNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 3);
  const { node, children } = treeNode;
  const color = KIND_COLORS[node.kind] || '#6b7280';
  const statusColor = STATUS_COLORS[node.status] || STATUS_COLORS.healthy;
  const isSelected = selectedId === node.id;
  const hasChildren = children.length > 0;

  return (
    <>
      <div
        className={`flex items-center gap-2 py-1.5 px-3 cursor-pointer transition-colors rounded-lg mx-1 ${
          isSelected ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => onSelect(node)}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {/* Kind badge */}
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 min-w-[70px] text-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {node.kind}
        </span>

        {/* Name */}
        <span className="text-sm text-gray-300 truncate flex-1">{node.name}</span>

        {/* Status dot */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusColor }}
          title={node.status}
        />
      </div>

      {/* Children with slide animation */}
      {hasChildren && (
        <CollapsibleChildren expanded={expanded}>
          {children.map((child) => (
            <TreeRow
              key={child.node.id}
              treeNode={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </CollapsibleChildren>
      )}
    </>
  );
}

function CollapsibleChildren({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>(expanded ? 'auto' : 0);
  const [overflow, setOverflow] = useState(expanded ? 'visible' : 'hidden');
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const el = contentRef.current;
    if (!el) return;

    if (expanded) {
      const scrollH = el.scrollHeight;
      setHeight(0);
      setOverflow('hidden');
      requestAnimationFrame(() => {
        setHeight(scrollH);
        setTimeout(() => {
          setHeight('auto');
          setOverflow('visible');
        }, 200);
      });
    } else {
      const scrollH = el.scrollHeight;
      setHeight(scrollH);
      setOverflow('hidden');
      // Double rAF: first lets browser paint the explicit height, second triggers transition to 0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0);
        });
      });
    }
  }, [expanded]);

  return (
    <div
      ref={contentRef}
      style={{
        height: height === 'auto' ? 'auto' : `${height}px`,
        overflow,
        transition: 'height 200ms ease-in-out',
      }}
    >
      {children}
    </div>
  );
}

export default function AppMesh() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ServiceMeshResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<ServiceMeshNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ServiceMeshNode | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getServiceMesh(id).then((d) => {
      setData(d);
      // Auto-select first namespace that has apps
      const nsWithApps = new Set<string>();
      for (const n of d.nodes) {
        if (APP_KINDS.has(n.kind) && n.namespace) {
          nsWithApps.add(n.namespace);
        }
      }
      const sorted = Array.from(nsWithApps).sort();
      if (sorted.length > 0) setSelectedNamespace(sorted[0]);
    }).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  // Namespaces that have apps
  const namespaces = useMemo(() => {
    if (!data) return [];
    const ns = new Set<string>();
    for (const n of data.nodes) {
      if (APP_KINDS.has(n.kind) && n.namespace) {
        ns.add(n.namespace);
      }
    }
    // Also add namespaces that have any resource, for "all" view
    return Array.from(ns).sort();
  }, [data]);

  // Apps in selected namespace
  const apps = useMemo(() => {
    if (!data || !selectedNamespace) return [];
    return data.nodes
      .filter(n => APP_KINDS.has(n.kind) && n.namespace === selectedNamespace)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  }, [data, selectedNamespace]);

  // Build tree for selected app
  const tree = useMemo(() => {
    if (!data || !selectedApp) return null;
    return buildTreeForApp(selectedApp, data.nodes, data.edges);
  }, [data, selectedApp]);

  // Summary counts for selected namespace
  const nsSummary = useMemo(() => {
    if (!data || !selectedNamespace) return {};
    const counts: Record<string, number> = {};
    for (const n of data.nodes) {
      if (n.namespace === selectedNamespace) {
        counts[n.kind] = (counts[n.kind] || 0) + 1;
      }
    }
    return counts;
  }, [data, selectedNamespace]);

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
        <p className="text-gray-400 text-sm">Waiting for cluster data with services and deployments</p>
      </div>
    );
  }

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
        {/* Left panel: Namespace + App list */}
        <div className="w-72 flex flex-col bg-surface-800 border border-white/5 rounded-xl overflow-hidden flex-shrink-0">
          {/* Namespace selector */}
          <div className="p-3 border-b border-white/5">
            <label className="text-[10px] uppercase text-gray-500 font-semibold mb-1.5 block">Namespace</label>
            <select
              value={selectedNamespace}
              onChange={(e) => { setSelectedNamespace(e.target.value); setSelectedApp(null); setSelectedNode(null); }}
              className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Select namespace...</option>
              {namespaces.map(ns => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
          </div>

          {/* Namespace summary */}
          {selectedNamespace && (
            <div className="px-3 py-2 border-b border-white/5 flex flex-wrap gap-2">
              {Object.entries(nsSummary)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([kind, count]) => (
                  <span
                    key={kind}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${KIND_COLORS[kind] || '#6b7280'}15`, color: KIND_COLORS[kind] || '#6b7280' }}
                  >
                    {count} {kind}
                  </span>
                ))}
            </div>
          )}

          {/* App list */}
          <div className="flex-1 overflow-y-auto">
            {selectedNamespace && apps.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No apps in this namespace</div>
            )}
            {apps.map(app => {
              const color = KIND_COLORS[app.kind] || '#6b7280';
              const statusColor = STATUS_COLORS[app.status] || STATUS_COLORS.healthy;
              const isSelected = selectedApp?.id === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => { setSelectedApp(app); setSelectedNode(null); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors border-l-2 ${
                    isSelected
                      ? 'bg-white/10 border-cyan-400'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 truncate">{app.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color }}>{app.kind}</div>
                  </div>
                  {/* Replica info */}
                  {app.details?.replicas !== undefined && (
                    <span className="text-[10px] text-gray-500">
                      {String(app.details.ready_replicas ?? app.details.ready ?? 0)}/{String(app.details.replicas ?? app.details.desired ?? 0)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle panel: Resource Tree */}
        <div className="flex-1 flex flex-col bg-surface-800 border border-white/5 rounded-xl overflow-hidden">
          {!selectedApp ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select an app to view its resource tree</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tree header */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[selectedApp.status] || '#22c55e' }}
                />
                <div>
                  <h3 className="text-sm font-semibold text-gray-300">{selectedApp.name}</h3>
                  <span className="text-[10px] text-gray-500">{selectedApp.kind} &middot; {selectedApp.namespace}</span>
                </div>
                {tree && (
                  <span className="ml-auto text-xs text-gray-500">{countTreeNodes(tree)} resources</span>
                )}
              </div>

              {/* Tree body */}
              <div className="flex-1 overflow-y-auto py-2">
                {tree && (
                  <TreeRow
                    treeNode={tree}
                    depth={0}
                    selectedId={selectedNode?.id ?? null}
                    onSelect={setSelectedNode}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Right panel: Detail */}
        {selectedNode && (
          <div className="w-80 bg-surface-800 border border-white/5 rounded-xl overflow-hidden flex-shrink-0 flex flex-col">
            {/* Detail header */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${KIND_COLORS[selectedNode.kind] || '#6b7280'}20`,
                    color: KIND_COLORS[selectedNode.kind] || '#6b7280',
                  }}
                >
                  {selectedNode.kind}
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: STATUS_COLORS[selectedNode.status] || '#9ca3af',
                    backgroundColor: `${STATUS_COLORS[selectedNode.status] || '#9ca3af'}20`,
                  }}
                >
                  {selectedNode.status}
                </span>
              </div>
              <h3 className="font-semibold text-gray-300 break-all">{selectedNode.name}</h3>
              {selectedNode.namespace && (
                <p className="text-xs text-gray-500 mt-0.5">{selectedNode.namespace}</p>
              )}
            </div>

            {/* Detail body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {selectedNode.details && Object.entries(selectedNode.details).map(([key, value]) => {
                if (value === null || value === undefined || value === '') return null;
                return (
                  <div key={key} className="flex justify-between gap-2 text-sm">
                    <span className="text-gray-500 flex-shrink-0">{key.replace(/_/g, ' ')}</span>
                    <span className="text-gray-300 font-mono text-xs text-right break-all">
                      {Array.isArray(value)
                        ? value.length > 0 ? value.join(', ') : '—'
                        : typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Connections */}
            {data && (
              <div className="border-t border-white/5 px-4 py-3">
                <h4 className="text-[10px] text-gray-500 mb-2 uppercase font-semibold">Connections</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {data.edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .slice(0, 15)
                    .map((e, i) => {
                      const otherId = e.source === selectedNode.id ? e.target : e.source;
                      const other = data.nodes.find(n => n.id === otherId);
                      const direction = e.source === selectedNode.id ? '\u2192' : '\u2190';
                      return (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="text-gray-600">{direction}</span>
                          {other && (
                            <span
                              className="text-[9px] px-1 rounded"
                              style={{
                                backgroundColor: `${KIND_COLORS[other.kind] || '#6b7280'}15`,
                                color: KIND_COLORS[other.kind] || '#6b7280',
                              }}
                            >
                              {other.kind}
                            </span>
                          )}
                          <span className="text-gray-300 truncate">{other?.name || otherId}</span>
                          <span className="ml-auto text-gray-600 flex-shrink-0 text-[10px]">{e.type}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function countTreeNodes(tree: TreeNode): number {
  let count = 1;
  for (const child of tree.children) {
    count += countTreeNodes(child);
  }
  return count;
}
