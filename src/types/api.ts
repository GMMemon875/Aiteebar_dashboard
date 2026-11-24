export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type DeviceConnectionStatus = 'online' | 'offline' | 'stale';
export type DeviceEnrollmentStatus = 'enrolled' | 'pending' | 'revoked';

export interface Device {
  id: string;
  device_name: string;
  operating_system: string;
  scanner_version: string;
  device_status: DeviceConnectionStatus;
  enrollment_status: DeviceEnrollmentStatus;
  enrolled_at: string;
  last_seen_at: string | null;
  last_scan_status?: string | null;
  ai_apps_count?: number;
  mcp_servers_count?: number;
  open_risks_count?: number;
}

export interface EnrollmentTokenResponse {
  token_id: string;
  enrollment_token: string;
  expires_at: string;
  note: string;
}

export interface ScanSummary {
  id: string;
  scan_id: string;
  device_id: string;
  device_name: string;
  scanner_version: string;
  scan_start_utc: string;
  received_at: string;
  scan_status: 'success' | 'warning' | 'failed';
  ai_applications_count: number;
  mcp_servers_count: number;
  risk_findings_count: number;
}

export interface ScanDetail extends ScanSummary {
  report_json: Record<string, unknown>;
  ai_applications: AIApplication[];
  mcp_servers: MCPServer[];
  risk_findings: RiskFinding[];
}

export type AppClassification =
  | 'known_ai'
  | 'unknown_ai_candidate'
  | 'authorized_dev_tool'
  | 'normal_application';

export type RunningStatus = 'running' | 'background' | 'not_running';

export type AppReviewStatus =
  | 'pending_review'
  | 'approved'
  | 'flagged'
  | 'non_ai_verified';

export interface AIApplication {
  id: string;
  scan_id: string;
  device_id: string;
  device_name: string;
  name: string;
  publisher: string | null;
  classification: AppClassification;
  review_status: AppReviewStatus;
  running_status: RunningStatus;
  installation_found: boolean;
  executable_path?: string | null;
  registry_matched?: boolean;
  detected_at: string;
}

export type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MCPServer {
  id: string;
  scan_id: string;
  device_id: string;
  device_name: string;
  server_name: string;
  package_name: string;
  package_version: string | null;
  version_pinned: boolean;
  command: string | null;
  redacted_arguments: string[];
  configuration_source: string;
  risk_level: RiskSeverity;
  inspection_only: boolean;
  detected_at: string;
}

export type FindingReviewStatus =
  | 'open'
  | 'in_review'
  | 'resolved'
  | 'accepted_risk';

export interface RiskFinding {
  id: string;
  finding_code: string;
  scan_id: string;
  device_id: string;
  device_name: string;
  severity: RiskSeverity;
  title: string;
  description: string;
  related_asset: string | null;
  remediation: string;
  review_status: FindingReviewStatus;
  reviewer_notes?: string | null;
  detected_at: string;
}

export interface ActivityEvent {
  id: string;
  device_id: string;
  device_name: string;
  event_type: string;
  resource_path: string | null;
  responsible_process: string | null;
  event_status: string;
  redacted_summary: string;
  event_timestamp: string;
}

export interface RegistryApplication {
  id: string;
  name: string;
  publisher: string | null;
  process_names: string[];
  installation_paths: string[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  connected_devices: number;
  total_devices: number;
  ai_applications: number;
  mcp_servers: number;
  risk_findings: number;
  high_risk_findings: number;
}

export interface SecurityStatusStats {
  healthy_count: number;
  attention_count: number;
  critical_count: number;
  healthy_pct: number;
  attention_pct: number;
  critical_pct: number;
  total_evaluated: number;
  calculation_rule: string;
}

export interface RecentScanActivity {
  scan_id: string;
  device_id: string;
  device_name: string;
  scan_time: string;
  scan_status: 'success' | 'warning' | 'failed';
  risk_findings_count: number;
}

export interface RiskTrendPoint {
  date: string;
  high: number;
  medium: number;
  low: number;
}

export interface DeviceDetailResponse {
  device: Device;
  ai_applications: AIApplication[];
  mcp_servers: MCPServer[];
  risk_findings: RiskFinding[];
  activity_events: ActivityEvent[];
  scans: ScanSummary[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'offline';
  database: 'connected' | 'disconnected';
  api_version: string;
  recommended_scanner_version: string;
  timestamp_utc: string;
}

export interface AuditLogEntry {
  id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
