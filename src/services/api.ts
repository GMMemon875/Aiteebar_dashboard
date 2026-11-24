import type {
  ActivityEvent,
  AIApplication,
  AppReviewStatus,
  AuditLogEntry,
  AuthTokens,
  DashboardSummary,
  Device,
  DeviceDetailResponse,
  EnrollmentTokenResponse,
  FindingReviewStatus,
  MCPServer,
  RecentScanActivity,
  RegistryApplication,
  RiskFinding,
  RiskTrendPoint,
  ScanDetail,
  ScanSummary,
  SecurityStatusStats,
  SystemHealth,
  User,
  UserRole,
} from '../types/api';
import {
  buildDemoDeviceDetail,
  buildDemoRecentActivity,
  buildDemoScanDetail,
  buildDemoSecurityStatus,
  buildDemoSummary,
  createDemoEnrollmentToken,
  DEMO_ACTIVITY,
  DEMO_AI_APPS,
  DEMO_AUDIT_LOGS,
  DEMO_DEVICES,
  DEMO_HEALTH,
  DEMO_MCP_SERVERS,
  DEMO_REGISTRY,
  DEMO_RISKS,
  DEMO_SCANS,
  DEMO_TRENDS,
  DEMO_USER,
  DEMO_USERS,
} from './demoData';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class BackendUnavailableError extends Error {
  constructor(message = 'Unable to reach the Aiteebar FastAPI backend.') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

export class ApiHttpError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiHttpError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * In-memory token store only (never localStorage or sessionStorage).
 */
let accessToken: string | null = null;
let refreshToken: string | null = null;
let demoModeEnabled = false;

// Isolated mutable demo state when demoModeEnabled === true
let demoState = createInitialDemoState();

function createInitialDemoState() {
  return {
    devices: structuredClone(DEMO_DEVICES),
    apps: structuredClone(DEMO_AI_APPS),
    mcps: structuredClone(DEMO_MCP_SERVERS),
    risks: structuredClone(DEMO_RISKS),
    scans: structuredClone(DEMO_SCANS),
    activity: structuredClone(DEMO_ACTIVITY),
    registry: structuredClone(DEMO_REGISTRY),
    users: structuredClone(DEMO_USERS),
    auditLogs: structuredClone(DEMO_AUDIT_LOGS),
  };
}

export function isDemoMode(): boolean {
  return demoModeEnabled;
}

export function setDemoMode(enabled: boolean): void {
  demoModeEnabled = enabled;
  if (enabled) {
    demoState = createInitialDemoState();
  }
}

export function setInMemoryTokens(access: string | null, refresh: string | null): void {
  accessToken = access;
  refreshToken = refresh;
}

export function clearInMemoryTokens(): void {
  accessToken = null;
  refreshToken = null;
}

export function hasInMemoryToken(): boolean {
  return Boolean(accessToken);
}

async function rawFetch(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new BackendUnavailableError(
      `Cannot connect to backend at ${API_BASE_URL}. Verify FastAPI and PostgreSQL are running.`
    );
  }

  if (res.status === 401 && retryOnUnauthorized && refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshed = (await refreshRes.json()) as AuthTokens;
        setInMemoryTokens(refreshed.access_token, refreshed.refresh_token);
        return rawFetch(path, options, false);
      }
    } catch {
      // fall through
    }
    clearInMemoryTokens();
  }

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const errBody = await res.json();
      if (typeof errBody?.detail === 'string') {
        detail = errBody.detail;
      } else if (Array.isArray(errBody?.detail)) {
        detail = errBody.detail.map((d: { msg?: string }) => d.msg || 'Validation error').join('; ');
      }
    } catch {
      // ignore parse failure
    }
    throw new ApiHttpError(res.status, detail);
  }

  return res;
}

async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await rawFetch(path, options);
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== 'all') {
      qs.set(k, String(v));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const apiService = {
  async checkHealth(): Promise<SystemHealth> {
    if (demoModeEnabled) {
      return { ...DEMO_HEALTH, timestamp_utc: new Date().toISOString() };
    }
    return apiJson<SystemHealth>('/health');
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    if (demoModeEnabled) {
      return {
        access_token: 'demo-in-memory-token',
        refresh_token: 'demo-in-memory-refresh',
        token_type: 'bearer',
        user: DEMO_USER,
      };
    }
    const tokens = await apiJson<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setInMemoryTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  },

  async getMe(): Promise<User> {
    if (demoModeEnabled) {
      return DEMO_USER;
    }
    return apiJson<User>('/auth/me');
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    if (demoModeEnabled) {
      return buildDemoSummary(
        demoState.devices,
        demoState.apps,
        demoState.mcps,
        demoState.risks
      );
    }
    return apiJson<DashboardSummary>('/dashboard/summary');
  },

  async getSecurityStatus(): Promise<SecurityStatusStats> {
    if (demoModeEnabled) {
      return buildDemoSecurityStatus(demoState.devices, demoState.risks);
    }
    return apiJson<SecurityStatusStats>('/dashboard/security-status');
  },

  async getRecentActivity(): Promise<RecentScanActivity[]> {
    if (demoModeEnabled) {
      return buildDemoRecentActivity(demoState.scans);
    }
    return apiJson<RecentScanActivity[]>('/dashboard/recent-activity');
  },

  async getRiskTrends(days = 7): Promise<RiskTrendPoint[]> {
    if (demoModeEnabled) {
      return DEMO_TRENDS.slice(-days);
    }
    return apiJson<RiskTrendPoint[]>(`/dashboard/risk-trends${buildQuery({ days })}`);
  },

  async getDevices(filters?: {
    search?: string;
    status?: string;
  }): Promise<Device[]> {
    if (demoModeEnabled) {
      return demoState.devices.filter((d) => {
        if (filters?.status && filters.status !== 'all' && d.device_status !== filters.status) {
          return false;
        }
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          return (
            d.device_name.toLowerCase().includes(q) ||
            d.id.toLowerCase().includes(q) ||
            d.operating_system.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
    return apiJson<Device[]>(`/devices${buildQuery(filters || {})}`);
  },

  async getDeviceDetail(deviceId: string): Promise<DeviceDetailResponse> {
    if (demoModeEnabled) {
      const detail = buildDemoDeviceDetail(
        deviceId,
        demoState.devices,
        demoState.apps,
        demoState.mcps,
        demoState.risks,
        demoState.activity,
        demoState.scans
      );
      if (!detail) throw new ApiHttpError(404, 'Device not found');
      return detail;
    }
    return apiJson<DeviceDetailResponse>(`/devices/${encodeURIComponent(deviceId)}`);
  },

  async createEnrollmentToken(note: string): Promise<EnrollmentTokenResponse> {
    if (demoModeEnabled) {
      const tok = createDemoEnrollmentToken();
      demoState.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actor_email: DEMO_USER.email,
        action: 'ENROLLMENT_TOKEN_ISSUED',
        target_type: 'enrollment_token',
        target_id: tok.token_id,
        details: note || 'Generated one-time enrollment token',
        created_at: new Date().toISOString(),
      });
      return tok;
    }
    return apiJson<EnrollmentTokenResponse>('/devices/enrollment-tokens', {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async revokeDeviceToken(deviceId: string): Promise<void> {
    if (demoModeEnabled) {
      const dev = demoState.devices.find((d) => d.id === deviceId);
      if (dev) {
        dev.enrollment_status = 'revoked';
        dev.device_status = 'offline';
      }
      return;
    }
    await apiJson<void>(`/devices/${encodeURIComponent(deviceId)}/revoke`, {
      method: 'POST',
    });
  },

  async getApplications(filters?: {
    search?: string;
    device_id?: string;
    classification?: string;
    running_status?: string;
    review_status?: string;
  }): Promise<AIApplication[]> {
    if (demoModeEnabled) {
      return demoState.apps.filter((app) => {
        if (filters?.device_id && filters.device_id !== 'all' && app.device_id !== filters.device_id)
          return false;
        if (
          filters?.classification &&
          filters.classification !== 'all' &&
          app.classification !== filters.classification
        )
          return false;
        if (
          filters?.running_status &&
          filters.running_status !== 'all' &&
          app.running_status !== filters.running_status
        )
          return false;
        if (
          filters?.review_status &&
          filters.review_status !== 'all' &&
          app.review_status !== filters.review_status
        )
          return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          return (
            app.name.toLowerCase().includes(q) ||
            app.device_name.toLowerCase().includes(q) ||
            (app.publisher || '').toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
    return apiJson<AIApplication[]>(`/applications${buildQuery(filters || {})}`);
  },

  async updateApplicationReview(
    applicationId: string,
    review_status: AppReviewStatus,
    classification?: AIApplication['classification']
  ): Promise<AIApplication> {
    if (demoModeEnabled) {
      const app = demoState.apps.find((a) => a.id === applicationId);
      if (!app) throw new ApiHttpError(404, 'Application not found');
      app.review_status = review_status;
      if (classification) app.classification = classification;
      demoState.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actor_email: DEMO_USER.email,
        action: 'APPLICATION_REVIEWED',
        target_type: 'ai_application',
        target_id: applicationId,
        details: `Set review_status=${review_status}`,
        created_at: new Date().toISOString(),
      });
      return { ...app };
    }
    return apiJson<AIApplication>(
      `/applications/${encodeURIComponent(applicationId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ review_status, classification }),
      }
    );
  },

  async getMcpServers(filters?: {
    device_id?: string;
    risk_level?: string;
    search?: string;
  }): Promise<MCPServer[]> {
    if (demoModeEnabled) {
      return demoState.mcps.filter((m) => {
        if (filters?.device_id && filters.device_id !== 'all' && m.device_id !== filters.device_id)
          return false;
        if (filters?.risk_level && filters.risk_level !== 'all' && m.risk_level !== filters.risk_level)
          return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          return (
            m.server_name.toLowerCase().includes(q) ||
            m.package_name.toLowerCase().includes(q) ||
            m.device_name.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
    return apiJson<MCPServer[]>(`/mcp-servers${buildQuery(filters || {})}`);
  },

  async getRisks(filters?: {
    severity?: string;
    device_id?: string;
    review_status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }): Promise<RiskFinding[]> {
    if (demoModeEnabled) {
      return demoState.risks.filter((r) => {
        if (filters?.severity && filters.severity !== 'all' && r.severity !== filters.severity)
          return false;
        if (filters?.device_id && filters.device_id !== 'all' && r.device_id !== filters.device_id)
          return false;
        if (
          filters?.review_status &&
          filters.review_status !== 'all' &&
          r.review_status !== filters.review_status
        )
          return false;
        if (filters?.date_from && r.detected_at.slice(0, 10) < filters.date_from)
          return false;
        if (filters?.date_to && r.detected_at.slice(0, 10) > filters.date_to)
          return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          return (
            r.title.toLowerCase().includes(q) ||
            r.finding_code.toLowerCase().includes(q) ||
            r.device_name.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
    return apiJson<RiskFinding[]>(`/risks${buildQuery(filters || {})}`);
  },

  async getRiskDetail(findingId: string): Promise<RiskFinding> {
    if (demoModeEnabled) {
      const f = demoState.risks.find((r) => r.id === findingId);
      if (!f) throw new ApiHttpError(404, 'Finding not found');
      return f;
    }
    return apiJson<RiskFinding>(`/risks/${encodeURIComponent(findingId)}`);
  },

  async updateRiskReview(
    findingId: string,
    review_status: FindingReviewStatus,
    reviewer_notes?: string
  ): Promise<RiskFinding> {
    if (demoModeEnabled) {
      const f = demoState.risks.find((r) => r.id === findingId);
      if (!f) throw new ApiHttpError(404, 'Finding not found');
      f.review_status = review_status;
      if (reviewer_notes !== undefined) f.reviewer_notes = reviewer_notes;
      demoState.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actor_email: DEMO_USER.email,
        action: 'RISK_STATUS_UPDATED',
        target_type: 'risk_finding',
        target_id: findingId,
        details: `Updated status to ${review_status}`,
        created_at: new Date().toISOString(),
      });
      return { ...f };
    }
    return apiJson<RiskFinding>(`/risks/${encodeURIComponent(findingId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ review_status, reviewer_notes }),
    });
  },

  async getActivityEvents(filters?: {
    device_id?: string;
    event_type?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ActivityEvent[]> {
    if (demoModeEnabled) {
      return demoState.activity.filter((ev) => {
        if (filters?.device_id && filters.device_id !== 'all' && ev.device_id !== filters.device_id)
          return false;
        if (filters?.event_type && filters.event_type !== 'all' && ev.event_type !== filters.event_type)
          return false;
        if (filters?.date_from && ev.event_timestamp.slice(0, 10) < filters.date_from)
          return false;
        if (filters?.date_to && ev.event_timestamp.slice(0, 10) > filters.date_to)
          return false;
        return true;
      });
    }
    return apiJson<ActivityEvent[]>(`/activity-events${buildQuery(filters || {})}`);
  },

  async getScans(filters?: {
    device_id?: string;
    scan_status?: string;
    search?: string;
  }): Promise<ScanSummary[]> {
    if (demoModeEnabled) {
      return demoState.scans.filter((s) => {
        if (filters?.device_id && filters.device_id !== 'all' && s.device_id !== filters.device_id)
          return false;
        if (filters?.scan_status && filters.scan_status !== 'all' && s.scan_status !== filters.scan_status)
          return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          return (
            s.scan_id.toLowerCase().includes(q) ||
            s.device_name.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
    return apiJson<ScanSummary[]>(`/scans${buildQuery(filters || {})}`);
  },

  async getScanDetail(scanId: string): Promise<ScanDetail> {
    if (demoModeEnabled) {
      const d = buildDemoScanDetail(
        scanId,
        demoState.scans,
        demoState.apps,
        demoState.mcps,
        demoState.risks
      );
      if (!d) throw new ApiHttpError(404, 'Scan not found');
      return d;
    }
    return apiJson<ScanDetail>(`/scans/${encodeURIComponent(scanId)}`);
  },

  async getScanReportJson(scanId: string): Promise<Record<string, unknown>> {
    if (demoModeEnabled) {
      const d = buildDemoScanDetail(
        scanId,
        demoState.scans,
        demoState.apps,
        demoState.mcps,
        demoState.risks
      );
      if (!d) throw new ApiHttpError(404, 'Scan report not found');
      return d.report_json;
    }
    return apiJson<Record<string, unknown>>(
      `/scans/${encodeURIComponent(scanId)}/report`
    );
  },

  async getRegistryApplications(): Promise<RegistryApplication[]> {
    if (demoModeEnabled) {
      return [...demoState.registry];
    }
    return apiJson<RegistryApplication[]>('/registry/applications');
  },

  async createRegistryApplication(payload: {
    name: string;
    publisher: string;
    process_names: string[];
    installation_paths: string[];
    is_enabled: boolean;
  }): Promise<RegistryApplication> {
    if (demoModeEnabled) {
      const created: RegistryApplication = {
        id: `reg-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      demoState.registry.unshift(created);
      demoState.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actor_email: DEMO_USER.email,
        action: 'REGISTRY_APP_CREATED',
        target_type: 'application_registry',
        target_id: created.id,
        details: `Added ${payload.name} to Application Registry`,
        created_at: new Date().toISOString(),
      });
      return created;
    }
    return apiJson<RegistryApplication>('/registry/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateRegistryApplication(
    id: string,
    payload: Partial<{
      name: string;
      publisher: string;
      process_names: string[];
      installation_paths: string[];
      is_enabled: boolean;
    }>
  ): Promise<RegistryApplication> {
    if (demoModeEnabled) {
      const item = demoState.registry.find((r) => r.id === id);
      if (!item) throw new ApiHttpError(404, 'Registry entry not found');
      Object.assign(item, payload, { updated_at: new Date().toISOString() });
      return { ...item };
    }
    return apiJson<RegistryApplication>(
      `/registry/applications/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  },

  async deleteRegistryApplication(id: string): Promise<void> {
    if (demoModeEnabled) {
      demoState.registry = demoState.registry.filter((r) => r.id !== id);
      return;
    }
    await apiJson<void>(`/registry/applications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async getUsers(): Promise<User[]> {
    if (demoModeEnabled) {
      return [...demoState.users];
    }
    return apiJson<User[]>('/users');
  },

  async createUser(payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> {
    if (demoModeEnabled) {
      const user: User = {
        id: `usr-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      demoState.users.push(user);
      return user;
    }
    return apiJson<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async toggleUserActive(userId: string, is_active: boolean): Promise<User> {
    if (demoModeEnabled) {
      const u = demoState.users.find((x) => x.id === userId);
      if (!u) throw new ApiHttpError(404, 'User not found');
      u.is_active = is_active;
      return { ...u };
    }
    return apiJson<User>(`/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    if (demoModeEnabled) {
      return [...demoState.auditLogs];
    }
    return apiJson<AuditLogEntry[]>('/audit-logs');
  },
};
