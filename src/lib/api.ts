const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request<{ token: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ id: string; email: string }>('/api/v1/me'),

  // Clusters
  getClusters: () => request<Cluster[]>('/api/v1/clusters'),

  getCluster: (id: string) => request<Cluster>(`/api/v1/clusters/${id}`),

  createCluster: (name: string, provider: string) =>
    request<Cluster>('/api/v1/clusters', {
      method: 'POST',
      body: JSON.stringify({ name, provider }),
    }),

  deleteCluster: (id: string) =>
    request(`/api/v1/clusters/${id}`, { method: 'DELETE' }),

  // Snapshots
  getLatestSnapshot: (clusterId: string) =>
    request<Snapshot>(`/api/v1/clusters/${clusterId}/snapshots/latest`),

  getSnapshots: (clusterId: string) =>
    request<Snapshot[]>(`/api/v1/clusters/${clusterId}/snapshots`),

  // Security
  getSecurityReport: (clusterId: string) =>
    request<SecurityReport>(`/api/v1/clusters/${clusterId}/security`),

  getSecurityRules: () => request<SecurityRule[]>('/api/v1/security/rules'),

  // Innovative features
  getAttackPaths: (clusterId: string) =>
    request<AttackPathAnalysis>(`/api/v1/clusters/${clusterId}/attack-paths`),

  simulate: (clusterId: string, type: string, params: Record<string, unknown>) =>
    request<SimulationResult>(`/api/v1/clusters/${clusterId}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ type, params }),
    }),

  getCosts: (clusterId: string) =>
    request<CostReport>(`/api/v1/clusters/${clusterId}/costs`),

  getBlastRadius: (clusterId: string, targetType: string, target: string, namespace?: string) => {
    const params = new URLSearchParams({ type: targetType, target });
    if (namespace) params.set('namespace', namespace);
    return request<BlastRadiusResult>(`/api/v1/clusters/${clusterId}/blast-radius?${params}`);
  },

  getTimeline: (clusterId: string) =>
    request<TimelinePoint[]>(`/api/v1/clusters/${clusterId}/timeline`),

  // Dashboard features
  getTopology: (clusterId: string) =>
    request<ClusterTopology>(`/api/v1/clusters/${clusterId}/topology`),

  getHeatmap: (clusterId: string) =>
    request<HeatmapData>(`/api/v1/clusters/${clusterId}/heatmap`),

  getEvents: (clusterId: string) =>
    request<EventStream>(`/api/v1/clusters/${clusterId}/events`),

  getAlerts: (clusterId: string) =>
    request<AlertsResponse>(`/api/v1/clusters/${clusterId}/alerts`),

  getNSCompare: (clusterId: string, ns1?: string, ns2?: string) => {
    const params = ns1 && ns2 ? `?ns1=${ns1}&ns2=${ns2}` : '';
    return request<NSCompareResponse | { namespaces: string[] }>(`/api/v1/clusters/${clusterId}/ns-compare${params}`);
  },

  getGoldenSignals: (clusterId: string) =>
    request<GoldenSignals>(`/api/v1/clusters/${clusterId}/golden-signals`),

  getServiceMesh: (clusterId: string) =>
    request<ServiceMeshResponse>(`/api/v1/clusters/${clusterId}/service-mesh`),
};

// Types
export interface Cluster {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface Snapshot {
  id: string;
  cluster_id: string;
  nodes: NodeInfo[];
  pods: PodInfo[];
  summary: SnapshotSummary;
  created_at: string;
}

export interface NodeInfo {
  name: string;
  instance_type?: string;
  region?: string;
  kubelet_version?: string;
  cpu_capacity_millis: number;
  memory_capacity_bytes: number;
  cpu_allocatable_millis: number;
  mem_allocatable_bytes: number;
  pod_count: number;
  ready: boolean;
  cost_per_hour?: number;
}

export interface PodInfo {
  name: string;
  namespace: string;
  node_name: string;
  status: string;
  image?: string;
  image_tag: string;
  cpu_request_millis: number;
  cpu_limit_millis: number;
  mem_request_bytes: number;
  mem_limit_bytes: number;
  cpu_usage_millis: number;
  mem_usage_bytes: number;
  restart_count: number;
  run_as_root: boolean;
  privileged: boolean;
  host_network: boolean;
  host_pid: boolean;
  has_liveness_probe: boolean;
  has_readiness_probe: boolean;
  has_security_context: boolean;
  read_only_root_fs: boolean;
}

export interface SnapshotSummary {
  node_count: number;
  pod_count: number;
  total_cpu_request_millis: number;
  total_cpu_usage_millis: number;
  total_mem_request_bytes: number;
  total_mem_usage_bytes: number;
  cpu_utilization_percent: number;
  mem_utilization_percent: number;
  over_provisioned_pods: number;
  run_as_root_pods: number;
  latest_tag_pods: number;
}

export interface SecurityReport {
  id: string;
  cluster_id: string;
  score: number;
  total_findings: number;
  report: {
    total_findings: number;
    by_severity: Record<string, number>;
    by_category: Record<string, number>;
    passed_rules: number;
    failed_rules: number;
    total_rules: number;
    score: number;
    findings: SecurityFinding[];
  };
  created_at: string;
}

export interface SecurityFinding {
  rule_id: string;
  rule_name: string;
  severity: string;
  category: string;
  resource: string;
  namespace: string;
  message: string;
  remediation: string;
}

export interface SecurityRule {
  id: string;
  name: string;
  severity: string;
  category: string;
  description: string;
}

// Attack Path types
export interface AttackPathAnalysis {
  total_paths: number;
  critical_paths: number;
  high_paths: number;
  medium_paths: number;
  risk_score: number;
  attack_paths: AttackPath[];
  recommendations: string[];
}

export interface AttackPath {
  id: string;
  name: string;
  description: string;
  risk: string;
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
  remediations: AttackPathRemediation[];
}

export interface AttackPathRemediation {
  step: number;
  action: string;
  command?: string;
  description: string;
  priority: string;
}

export interface AttackPathNode {
  id: string;
  label: string;
  type: string;
  severity: string;
  detail: string;
}

export interface AttackPathEdge {
  from: string;
  to: string;
  label: string;
  technique: string;
  description: string;
}

// Simulation types
export interface SimulationResult {
  scenario: string;
  impact: string;
  summary: string;
  evicted_pods: EvictedPod[];
  affected_services: string[] | null;
  resource_delta: ResourceDelta;
  warnings: string[];
  cost_savings_monthly: number;
}

export interface EvictedPod {
  name: string;
  namespace: string;
  reason: string;
  can_reschedule: boolean;
}

export interface ResourceDelta {
  cpu_before_millis: number;
  cpu_after_millis: number;
  mem_before_bytes: number;
  mem_after_bytes: number;
  cpu_util_before: number;
  cpu_util_after: number;
  mem_util_before: number;
  mem_util_after: number;
}

// Cost types
export interface CostReport {
  provider: string;
  pricing_model: { cpu_per_hour: number; mem_per_gb_hour: number; description: string };
  total_monthly_cost: number;
  total_wasted_cost: number;
  savings_if_rightsized: number;
  overall_efficiency: number;
  nodes: NodeCost[];
  top_expensive_pods: PodCost[];
  top_wasteful_pods: PodCost[];
  by_namespace: NamespaceCost[];
  recommendations: CostRec[] | null;
}

export interface NodeCost {
  name: string;
  cpu_capacity_millis: number;
  mem_capacity_bytes: number;
  hourly_cost: number;
  daily_cost: number;
  monthly_cost: number;
}

export interface PodCost {
  name: string;
  namespace: string;
  cpu_request_millis: number;
  mem_request_bytes: number;
  cpu_usage_millis: number;
  mem_usage_bytes: number;
  hourly_cost: number;
  monthly_cost: number;
  wasted_cost_monthly: number;
  efficiency_percent: number;
  rightsize_cpu_millis: number;
  rightsize_mem_bytes: number;
  savings_if_rightsized: number;
}

export interface NamespaceCost {
  namespace: string;
  pod_count: number;
  monthly_cost: number;
  wasted_cost: number;
}

export interface CostRec {
  type: string;
  resource: string;
  message: string;
  savings_monthly: number;
}

// Blast Radius types
export interface BlastRadiusResult {
  target: string;
  target_type: string;
  nodes: ServiceNode[];
  dependencies: Dependency[];
  impact: ImpactAssessment;
  zones: BlastZone[];
}

export interface ServiceNode {
  id: string;
  name: string;
  namespace: string;
  type: string;
  replicas: number;
  critical: boolean;
}

export interface Dependency {
  from: string;
  to: string;
  type: string;
  label: string;
}

export interface ImpactAssessment {
  affected_pods: number;
  affected_services: number;
  downtime_risk: string;
  description: string;
  cascade_chain: string[] | null;
}

export interface BlastZone {
  level: number;
  label: string;
  services: ServiceNode[];
}

// Timeline types
export interface TimelinePoint {
  id: string;
  created_at: string;
  node_count: number;
  pod_count: number;
  cpu_utilization: number;
  mem_utilization: number;
  run_as_root_pods: number;
  latest_tag_pods: number;
}

// Topology types
export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  namespace?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface TopologyEdge {
  source: string;
  target: string;
  type: string;
}

export interface ClusterTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  stats: {
    total_nodes: number;
    total_pods: number;
    total_namespaces: number;
    healthy_pods: number;
    warning_pods: number;
    critical_pods: number;
  };
}

// Heatmap types
export interface HeatmapCell {
  namespace: string;
  metric: string;
  value: number;
  max: number;
  intensity: number;
}

export interface NodeHeatmapRow {
  node_name: string;
  cpu_percent: number;
  mem_percent: number;
  pod_percent: number;
  pod_count: number;
  max_pods: number;
  cpu_requested: number;
  cpu_capacity: number;
  mem_requested: number;
  mem_capacity: number;
}

export interface HeatmapData {
  namespaces: string[];
  metrics: string[];
  cells: HeatmapCell[];
  node_map: NodeHeatmapRow[];
}

// Event types
export interface PodEvent {
  type: string;
  pod: string;
  namespace: string;
  message: string;
  severity: string;
  time: string;
}

export interface EventStream {
  events: PodEvent[];
  summary: {
    total_events: number;
    additions: number;
    removals: number;
    restarts: number;
    warnings: number;
  };
}

// Alert types
export interface SmartAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  resource: string;
  metric?: string;
  suggestion: string;
}

export interface AlertsResponse {
  alerts: SmartAlert[];
  critical: number;
  warning: number;
  info: number;
}

// Namespace Compare types
export interface NamespaceProfile {
  namespace: string;
  pod_count: number;
  running_pods: number;
  total_cpu_request: number;
  total_mem_request: number;
  total_cpu_usage: number;
  total_mem_usage: number;
  root_pods: number;
  privileged_pods: number;
  no_probes_pods: number;
  total_restarts: number;
  latest_tag_pods: number;
  images: string[];
}

export interface NSCompareResponse {
  ns1: NamespaceProfile;
  ns2: NamespaceProfile;
}

// Golden Signals types
export interface GoldenSignals {
  saturation: {
    cpu_request_percent: number;
    mem_request_percent: number;
    pod_capacity_used: number;
    status: string;
    message: string;
  };
  errors: {
    crashing_pods: number;
    restarting_pods: number;
    not_ready_pods: number;
    total_restarts: number;
    status: string;
    top_restarters: string[];
  };
  traffic: {
    total_pods: number;
    running_pods: number;
    pending_pods: number;
    availability_percent: number;
    status: string;
  };
  utilization: {
    cpu_usage_percent: number;
    mem_usage_percent: number;
    cpu_efficiency: number;
    mem_efficiency: number;
    status: string;
  };
  by_namespace: {
    namespace: string;
    pods: number;
    restarts: number;
    cpu_request: number;
    mem_request: number;
    health: string;
  }[];
}

// Service Mesh types
export interface ServiceMeshNode {
  id: string;
  name: string;
  namespace: string;
  kind: string;
  status: string;
  details?: Record<string, unknown>;
}

export interface ServiceMeshEdge {
  source: string;
  target: string;
  type: string;
}

export interface ServiceMeshResponse {
  nodes: ServiceMeshNode[];
  edges: ServiceMeshEdge[];
}
