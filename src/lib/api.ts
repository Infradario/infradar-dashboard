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
  role: string;
  os: string;
  arch: string;
  kubelet_version: string;
  cpu_capacity: string;
  mem_capacity: string;
  cpu_allocatable: string;
  mem_allocatable: string;
  cpu_usage: string;
  mem_usage: string;
  ready: boolean;
}

export interface PodInfo {
  name: string;
  namespace: string;
  node: string;
  status: string;
  image: string;
  image_tag: string;
  cpu_request: string;
  cpu_limit: string;
  mem_request: string;
  mem_limit: string;
  restart_count: number;
  ready: boolean;
  run_as_root: boolean;
  privileged: boolean;
}

export interface SnapshotSummary {
  total_nodes: number;
  ready_nodes: number;
  total_pods: number;
  running_pods: number;
  total_cpu_capacity: string;
  total_mem_capacity: string;
  total_cpu_usage: string;
  total_mem_usage: string;
  cpu_utilization: number;
  mem_utilization: number;
  warnings: string[];
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
