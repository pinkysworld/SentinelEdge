// Shared type definitions for the Wardex admin console

export interface AuthSession {
  role: string;
  username?: string;
  tenant_id?: string;
}

export interface AlertRecord {
  id: number;
  level: string;
  score: number;
  device_id: string;
  reasons: string[];
  timestamp: string;
  acknowledged?: boolean;
  assignee?: string;
}

export interface AgentIdentity {
  id: string;
  hostname: string;
  platform: string;
  version: string;
  enrolled_at: string;
  last_seen: string;
  status: 'online' | 'stale' | 'offline' | 'deregistered';
  labels: Record<string, string>;
}

export interface Case {
  id: number;
  title: string;
  status: string;
  severity: string;
  assignee?: string;
  created_at: string;
  updated_at: string;
  description: string;
  alert_ids: number[];
  tags: string[];
}

export interface Incident {
  id: number;
  title: string;
  status: string;
  severity: string;
  created_at: string;
  alert_ids: number[];
  agent_ids: string[];
  summary: string;
  assignee?: string;
}

export interface FeatureFlag {
  enabled: boolean;
  rollout_pct?: number;
}

export interface FleetHealth {
  total_agents: number;
  online: number;
  status: 'healthy' | 'degraded' | 'critical';
}

export interface ApiError {
  error: string;
  code: string;
}

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'error';
}

export interface DraftState<T> {
  value: T;
  savedAt: number;
}
