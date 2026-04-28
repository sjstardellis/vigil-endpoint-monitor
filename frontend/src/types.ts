export type MonitorStatus = 'UP' | 'DOWN' | 'PENDING';
export type CheckStatus = 'UP' | 'DOWN';

export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  url: string;
  method: 'GET' | 'HEAD' | 'POST';
  expectedStatus: number;
  intervalSeconds: number;
  timeoutMs: number;
  status: MonitorStatus;
  enabled: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
  checks?: Check[];
  incidents?: Incident[];
  _count?: { checks: number; incidents: number };
}

export interface Check {
  id: string;
  monitorId: string;
  status: CheckStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  startedAt: string;
  resolvedAt: string | null;
  reason: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
