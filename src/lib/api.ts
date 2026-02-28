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
