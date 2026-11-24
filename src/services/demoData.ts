import type {
  ActivityEvent,
  AIApplication,
  AuditLogEntry,
  DashboardSummary,
  Device,
  DeviceDetailResponse,
  EnrollmentTokenResponse,
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
} from '../types/api';

/**
 * Isolated Development Demo Mode Dataset.
 * Only used when the user explicitly activates Development Demo Mode
 * because the FastAPI/PostgreSQL backend is not running locally.
 * Never mixed with production API responses.
 */
export const DEMO_USER: User = {
  id: 'usr-demo-admin',
  name: 'SecOps Administrator (Demo)',
  email: 'admin@aiteebar.local',
  role: 'admin',
  is_active: true,
  created_at: '2026-10-01T08:00:00Z',
};

export const DEMO_USERS: User[] = [
  DEMO_USER,
  {
    id: 'usr-demo-analyst',
    name: 'Amina Farooq',
    email: 'amina.farooq@corp.local',
    role: 'analyst',
    is_active: true,
    created_at: '2026-10-12T10:15:00Z',
  },
  {
    id: 'usr-demo-viewer',
    name: 'Compliance Auditor',
    email: 'audit@corp.local',
    role: 'viewer',
    is_active: true,
    created_at: '2026-11-02T14:30:00Z',
  },
];

export const DEMO_DEVICES: Device[] = [
  {
    id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    operating_system: 'Windows 11 Enterprise 24H2',
    scanner_version: '1.4.2',
    device_status: 'online',
    enrollment_status: 'enrolled',
    enrolled_at: '2026-10-14T09:00:00Z',
    last_seen_at: '2026-11-24T10:42:00Z',
    last_scan_status: 'warning',
    ai_apps_count: 4,
    mcp_servers_count: 3,
    open_risks_count: 2,
  },
  {
    id: 'DEV-WIN-1089',
    device_name: 'FIN-WS-089',
    operating_system: 'Windows 11 Pro 23H2',
    scanner_version: '1.4.2',
    device_status: 'online',
    enrollment_status: 'enrolled',
    enrolled_at: '2026-10-18T11:20:00Z',
    last_seen_at: '2026-11-24T10:30:00Z',
    last_scan_status: 'success',
    ai_apps_count: 2,
    mcp_servers_count: 1,
    open_risks_count: 0,
  },
  {
    id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    operating_system: 'Windows 11 Enterprise 24H2',
    scanner_version: '1.4.2',
    device_status: 'online',
    enrollment_status: 'enrolled',
    enrolled_at: '2026-11-01T08:15:00Z',
    last_seen_at: '2026-11-24T09:55:00Z',
    last_scan_status: 'warning',
    ai_apps_count: 5,
    mcp_servers_count: 4,
    open_risks_count: 3,
  },
  {
    id: 'DEV-WIN-1127',
    device_name: 'OPS-ADMIN-127',
    operating_system: 'Windows 11 Pro 24H2',
    scanner_version: '1.4.1',
    device_status: 'stale',
    enrollment_status: 'enrolled',
    enrolled_at: '2026-11-05T13:45:00Z',
    last_seen_at: '2026-11-22T17:10:00Z',
    last_scan_status: 'warning',
    ai_apps_count: 2,
    mcp_servers_count: 1,
    open_risks_count: 1,
  },
  {
    id: 'DEV-WIN-1151',
    device_name: 'HR-LAPTOP-151',
    operating_system: 'Windows 11 Enterprise 23H2',
    scanner_version: '1.4.2',
    device_status: 'online',
    enrollment_status: 'enrolled',
    enrolled_at: '2026-11-10T09:30:00Z',
    last_seen_at: '2026-11-24T10:15:00Z',
    last_scan_status: 'success',
    ai_apps_count: 1,
    mcp_servers_count: 0,
    open_risks_count: 0,
  },
];

export const DEMO_AI_APPS: AIApplication[] = [
  {
    id: 'app-01',
    scan_id: 'SCN-20261124-1042',
    device_id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    name: 'Cursor',
    publisher: 'Anysphere Inc.',
    classification: 'known_ai',
    review_status: 'approved',
    running_status: 'running',
    installation_found: true,
    executable_path: 'C:\\Users\\dev\\AppData\\Local\\Programs\\cursor\\Cursor.exe',
    registry_matched: true,
    detected_at: '2026-11-24T10:42:00Z',
  },
  {
    id: 'app-02',
    scan_id: 'SCN-20261124-1042',
    device_id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    name: 'Claude Desktop',
    publisher: 'Anthropic PBC',
    classification: 'known_ai',
    review_status: 'approved',
    running_status: 'background',
    installation_found: true,
    executable_path: 'C:\\Users\\dev\\AppData\\Local\\AnthropicClaude\\Claude.exe',
    registry_matched: true,
    detected_at: '2026-11-24T10:42:00Z',
  },
  {
    id: 'app-03',
    scan_id: 'SCN-20261124-1042',
    device_id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    name: 'Visual Studio Code',
    publisher: 'Microsoft Corporation',
    classification: 'authorized_dev_tool',
    review_status: 'approved',
    running_status: 'running',
    installation_found: true,
    executable_path: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
    registry_matched: true,
    detected_at: '2026-11-24T10:42:00Z',
  },
  {
    id: 'app-04',
    scan_id: 'SCN-20261124-1104',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    name: 'Ollama',
    publisher: 'Ollama Inc.',
    classification: 'known_ai',
    review_status: 'approved',
    running_status: 'running',
    installation_found: true,
    executable_path: 'C:\\Users\\ds\\AppData\\Local\\Programs\\Ollama\\ollama.exe',
    registry_matched: true,
    detected_at: '2026-11-24T09:55:00Z',
  },
  {
    id: 'app-05',
    scan_id: 'SCN-20261124-1104',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    name: 'LocalPromptStudio.exe',
    publisher: 'Unverified Publisher',
    classification: 'unknown_ai_candidate',
    review_status: 'pending_review',
    running_status: 'background',
    installation_found: true,
    executable_path: 'C:\\Users\\ds\\Downloads\\LocalPromptStudio\\LocalPromptStudio.exe',
    registry_matched: false,
    detected_at: '2026-11-24T09:55:00Z',
  },
  {
    id: 'app-06',
    scan_id: 'SCN-20261124-1089',
    device_id: 'DEV-WIN-1089',
    device_name: 'FIN-WS-089',
    name: 'Claude Desktop',
    publisher: 'Anthropic PBC',
    classification: 'known_ai',
    review_status: 'approved',
    running_status: 'not_running',
    installation_found: true,
    executable_path: 'C:\\Users\\fin\\AppData\\Local\\AnthropicClaude\\Claude.exe',
    registry_matched: true,
    detected_at: '2026-11-24T10:30:00Z',
  },
  {
    id: 'app-07',
    scan_id: 'SCN-20261122-1127',
    device_id: 'DEV-WIN-1127',
    device_name: 'OPS-ADMIN-127',
    name: 'AnythingLLM',
    publisher: 'Mintplex Labs',
    classification: 'unknown_ai_candidate',
    review_status: 'pending_review',
    running_status: 'not_running',
    installation_found: true,
    executable_path: 'C:\\Program Files\\AnythingLLM\\AnythingLLM.exe',
    registry_matched: false,
    detected_at: '2026-11-22T17:10:00Z',
  },
];

export const DEMO_MCP_SERVERS: MCPServer[] = [
  {
    id: 'mcp-01',
    scan_id: 'SCN-20261124-1042',
    device_id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    server_name: 'filesystem-repo',
    package_name: '@modelcontextprotocol/server-filesystem',
    package_version: '0.6.2',
    version_pinned: true,
    command: 'npx',
    redacted_arguments: ['-y', '@modelcontextprotocol/server-filesystem', 'C:\\Users\\<REDACTED>\\Projects'],
    configuration_source: '%APPDATA%\\Claude\\claude_desktop_config.json',
    risk_level: 'LOW',
    inspection_only: true,
    detected_at: '2026-11-24T10:42:00Z',
  },
  {
    id: 'mcp-02',
    scan_id: 'SCN-20261124-1042',
    device_id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    server_name: 'github-internal',
    package_name: '@modelcontextprotocol/server-github',
    package_version: 'latest',
    version_pinned: false,
    command: 'npx',
    redacted_arguments: ['-y', '@modelcontextprotocol/server-github', '--token=[REDACTED_ENV]'],
    configuration_source: '%USERPROFILE%\\.cursor\\mcp.json',
    risk_level: 'HIGH',
    inspection_only: true,
    detected_at: '2026-11-24T10:42:00Z',
  },
  {
    id: 'mcp-03',
    scan_id: 'SCN-20261124-1104',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    server_name: 'postgres-analytics',
    package_name: '@modelcontextprotocol/server-postgres',
    package_version: 'latest',
    version_pinned: false,
    command: 'npx',
    redacted_arguments: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://[REDACTED_CREDENTIALS]@db.internal:5432/analytics'],
    configuration_source: '%APPDATA%\\Claude\\claude_desktop_config.json',
    risk_level: 'HIGH',
    inspection_only: true,
    detected_at: '2026-11-24T09:55:00Z',
  },
  {
    id: 'mcp-04',
    scan_id: 'SCN-20261124-1104',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    server_name: 'fetch-web',
    package_name: 'mcp-server-fetch',
    package_version: '1.2.0',
    version_pinned: true,
    command: 'uvx',
    redacted_arguments: ['mcp-server-fetch==1.2.0'],
    configuration_source: '%USERPROFILE%\\.cursor\\mcp.json',
    risk_level: 'MEDIUM',
    inspection_only: true,
    detected_at: '2026-11-24T09:55:00Z',
  },
  {
    id: 'mcp-05',
    scan_id: 'SCN-20261124-1089',
    device_id: 'DEV-WIN-1089',
    device_name: 'FIN-WS-089',
    server_name: 'excel-readonly',
    package_name: '@corp/mcp-excel-reader',
    package_version: '2.1.4',
    version_pinned: true,
    command: 'node',
    redacted_arguments: ['C:\\Program Files\\CorpTools\\mcp-excel-reader\\index.js'],
    configuration_source: '%APPDATA%\\Claude\\claude_desktop_config.json',
    risk_level: 'LOW',
    inspection_only: true,
    detected_at: '2026-11-24T10:30:00Z',
  },
];

export const DEMO_RISKS: RiskFinding[] = [
  {
    id: 'fnd-101',
    finding_code: 'MCP-UNPINNED-PRIV-001',
    scan_id: 'SCN-20261124-1104',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    severity: 'HIGH',
    title: 'Unpinned MCP Package Connected to Database',
    description:
      'MCP server "postgres-analytics" runs @modelcontextprotocol/server-postgres without a pinned semantic version while referencing database credentials in environment config.',
    related_asset: 'MCP: postgres-analytics',
    remediation:
      'Pin @modelcontextprotocol/server-postgres to an approved immutable version and move database access behind a read-only service proxy.',
    review_status: 'open',
    reviewer_notes: null,
    detected_at: '2026-11-24T09:55:00Z',
  },
  {
    id: 'fnd-102',
    finding_code: 'MCP-UNPINNED-002',
    scan_id: 'SCN-20261124-1042',
    device_id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    severity: 'HIGH',
    title: 'Unpinned GitHub MCP Server Version ("latest")',
    description:
      'Cursor MCP configuration invokes @modelcontextprotocol/server-github using unpinned resolution, exposing endpoint to supply-chain drift on auto-update.',
    related_asset: 'MCP: github-internal',
    remediation:
      'Pin exact package version (e.g. 0.6.2) in .cursor/mcp.json and verify registry integrity.',
    review_status: 'in_review',
    reviewer_notes: 'Engineering notified to pin version in template.',
    detected_at: '2026-11-24T10:42:00Z',
  },
  {
    id: 'fnd-103',
    finding_code: 'AI-UNKNOWN-CANDIDATE-003',
    scan_id: 'SCN-20261124-1104',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    severity: 'MEDIUM',
    title: 'Unregistered AI Candidate Executing in User Downloads',
    description:
      'Unknown AI candidate binary LocalPromptStudio.exe was detected running outside approved Program Files directories and is absent from the enterprise Application Registry.',
    related_asset: 'App: LocalPromptStudio.exe',
    remediation:
      'Review binary origin with endpoint owner. Add to Application Registry if authorized or remove unapproved local AI runtime.',
    review_status: 'open',
    reviewer_notes: null,
    detected_at: '2026-11-24T09:55:00Z',
  },
  {
    id: 'fnd-104',
    finding_code: 'MCP-EGRESS-004',
    scan_id: 'SCN-20261124-1104',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    severity: 'MEDIUM',
    title: 'External HTTP Fetch Capability Enabled in MCP',
    description:
      'mcp-server-fetch allows outbound web requests from local Cursor workspace. Ensure internal URLs are blocked by host firewall policies.',
    related_asset: 'MCP: fetch-web',
    remediation:
      'Verify outbound domain allowlist or disable fetch-web on workstations accessing sensitive datasets.',
    review_status: 'open',
    reviewer_notes: null,
    detected_at: '2026-11-24T09:55:00Z',
  },
  {
    id: 'fnd-105',
    finding_code: 'SCANNER-STALE-005',
    scan_id: 'SCN-20261122-1127',
    device_id: 'DEV-WIN-1127',
    device_name: 'OPS-ADMIN-127',
    severity: 'LOW',
    title: 'Scanner Client Version Behind Baseline (1.4.1 < 1.4.2)',
    description:
      'Endpoint OPS-ADMIN-127 reported with scanner v1.4.1 and has not checked in for over 24 hours.',
    related_asset: 'Scanner Client v1.4.1',
    remediation: 'Trigger scheduled Windows MDM update to Aiteebar Scanner v1.4.2.',
    review_status: 'open',
    reviewer_notes: null,
    detected_at: '2026-11-22T17:10:00Z',
  },
];

export const DEMO_SCANS: ScanSummary[] = [
  {
    id: 'scn-row-1',
    scan_id: 'SCN-20261124-1042',
    device_id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    scanner_version: '1.4.2',
    scan_start_utc: '2026-11-24T10:40:12Z',
    received_at: '2026-11-24T10:42:00Z',
    scan_status: 'warning',
    ai_applications_count: 3,
    mcp_servers_count: 2,
    risk_findings_count: 1,
  },
  {
    id: 'scn-row-2',
    scan_id: 'SCN-20261124-1089',
    device_id: 'DEV-WIN-1089',
    device_name: 'FIN-WS-089',
    scanner_version: '1.4.2',
    scan_start_utc: '2026-11-24T10:28:40Z',
    received_at: '2026-11-24T10:30:00Z',
    scan_status: 'success',
    ai_applications_count: 1,
    mcp_servers_count: 1,
    risk_findings_count: 0,
  },
  {
    id: 'scn-row-3',
    scan_id: 'SCN-20261124-1104',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    scanner_version: '1.4.2',
    scan_start_utc: '2026-11-24T09:53:10Z',
    received_at: '2026-11-24T09:55:00Z',
    scan_status: 'warning',
    ai_applications_count: 2,
    mcp_servers_count: 2,
    risk_findings_count: 3,
  },
  {
    id: 'scn-row-4',
    scan_id: 'SCN-20261124-1151',
    device_id: 'DEV-WIN-1151',
    device_name: 'HR-LAPTOP-151',
    scanner_version: '1.4.2',
    scan_start_utc: '2026-11-24T10:14:02Z',
    received_at: '2026-11-24T10:15:00Z',
    scan_status: 'success',
    ai_applications_count: 0,
    mcp_servers_count: 0,
    risk_findings_count: 0,
  },
  {
    id: 'scn-row-5',
    scan_id: 'SCN-20261122-1127',
    device_id: 'DEV-WIN-1127',
    device_name: 'OPS-ADMIN-127',
    scanner_version: '1.4.1',
    scan_start_utc: '2026-11-22T17:08:50Z',
    received_at: '2026-11-22T17:10:00Z',
    scan_status: 'warning',
    ai_applications_count: 1,
    mcp_servers_count: 0,
    risk_findings_count: 1,
  },
];

export const DEMO_ACTIVITY: ActivityEvent[] = [
  {
    id: 'evt-901',
    device_id: 'DEV-WIN-1042',
    device_name: 'ENG-LAPTOP-042',
    event_type: 'MCP_CONFIG_MODIFIED',
    resource_path: 'C:\\Users\\<REDACTED>\\.cursor\\mcp.json',
    responsible_process: 'Cursor.exe',
    event_status: 'logged_redacted',
    redacted_summary: 'MCP config updated; 1 env secret token masked locally',
    event_timestamp: '2026-11-24T10:38:15Z',
  },
  {
    id: 'evt-902',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    event_type: 'SENSITIVE_FILE_ACCESS_FLAG',
    resource_path: 'C:\\Users\\<REDACTED>\\Documents\\Q4_Forecast_[MASKED].xlsx',
    responsible_process: 'LocalPromptStudio.exe',
    event_status: 'alert_triggered',
    redacted_summary: 'File access metadata captured; document contents not collected',
    event_timestamp: '2026-11-24T09:51:40Z',
  },
  {
    id: 'evt-903',
    device_id: 'DEV-WIN-1104',
    device_name: 'DATA-SCI-104',
    event_type: 'LOCAL_LLM_PORT_OPEN',
    resource_path: '127.0.0.1:11434',
    responsible_process: 'ollama.exe',
    event_status: 'normal',
    redacted_summary: 'Approved local Ollama inference endpoint bound to loopback',
    event_timestamp: '2026-11-24T09:12:04Z',
  },
  {
    id: 'evt-904',
    device_id: 'DEV-WIN-1089',
    device_name: 'FIN-WS-089',
    event_type: 'AI_APP_LAUNCHED',
    resource_path: 'C:\\Users\\<REDACTED>\\AppData\\Local\\AnthropicClaude\\Claude.exe',
    responsible_process: 'Claude.exe',
    event_status: 'normal',
    redacted_summary: 'Approved application session observed',
    event_timestamp: '2026-11-24T08:44:29Z',
  },
];

export const DEMO_REGISTRY: RegistryApplication[] = [
  {
    id: 'reg-01',
    name: 'Cursor',
    publisher: 'Anysphere Inc.',
    process_names: ['Cursor.exe'],
    installation_paths: ['%LOCALAPPDATA%\\Programs\\cursor\\Cursor.exe'],
    is_enabled: true,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-11-15T12:00:00Z',
  },
  {
    id: 'reg-02',
    name: 'Claude Desktop',
    publisher: 'Anthropic PBC',
    process_names: ['Claude.exe'],
    installation_paths: ['%LOCALAPPDATA%\\AnthropicClaude\\Claude.exe'],
    is_enabled: true,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-11-15T12:00:00Z',
  },
  {
    id: 'reg-03',
    name: 'Visual Studio Code',
    publisher: 'Microsoft Corporation',
    process_names: ['Code.exe'],
    installation_paths: ['%PROGRAMFILES%\\Microsoft VS Code\\Code.exe'],
    is_enabled: true,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-11-15T12:00:00Z',
  },
  {
    id: 'reg-04',
    name: 'Ollama',
    publisher: 'Ollama Inc.',
    process_names: ['ollama.exe', 'ollama app.exe'],
    installation_paths: ['%LOCALAPPDATA%\\Programs\\Ollama\\ollama.exe'],
    is_enabled: true,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-11-15T12:00:00Z',
  },
];

export const DEMO_TRENDS: RiskTrendPoint[] = [
  { date: '2026-11-18', high: 3, medium: 4, low: 2 },
  { date: '2026-11-19', high: 3, medium: 3, low: 2 },
  { date: '2026-11-20', high: 2, medium: 3, low: 2 },
  { date: '2026-11-21', high: 2, medium: 2, low: 1 },
  { date: '2026-11-22', high: 2, medium: 2, low: 2 },
  { date: '2026-11-23', high: 2, medium: 2, low: 1 },
  { date: '2026-11-24', high: 2, medium: 2, low: 1 },
];

export const DEMO_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-1',
    actor_email: 'admin@aiteebar.local',
    action: 'RISK_STATUS_UPDATED',
    target_type: 'risk_finding',
    target_id: 'fnd-102',
    details: 'Changed review_status from open to in_review',
    created_at: '2026-11-24T10:45:00Z',
  },
  {
    id: 'aud-2',
    actor_email: 'admin@aiteebar.local',
    action: 'ENROLLMENT_TOKEN_ISSUED',
    target_type: 'enrollment_token',
    target_id: 'tok-98f2',
    details: 'Issued 15-minute one-time enrollment token for Engineering rollout',
    created_at: '2026-11-24T09:10:00Z',
  },
];

export const DEMO_HEALTH: SystemHealth = {
  status: 'healthy',
  database: 'connected',
  api_version: 'v1 (Demo Sandbox)',
  recommended_scanner_version: '1.4.2',
  timestamp_utc: new Date().toISOString(),
};

export function buildDemoSummary(
  devices: Device[],
  apps: AIApplication[],
  mcps: MCPServer[],
  risks: RiskFinding[]
): DashboardSummary {
  return {
    connected_devices: devices.filter((d) => d.device_status === 'online').length,
    total_devices: devices.length,
    ai_applications: apps.length,
    mcp_servers: mcps.length,
    risk_findings: risks.filter((r) => r.review_status !== 'resolved').length,
    high_risk_findings: risks.filter(
      (r) => r.severity === 'HIGH' && r.review_status !== 'resolved'
    ).length,
  };
}

export function buildDemoSecurityStatus(
  devices: Device[],
  risks: RiskFinding[]
): SecurityStatusStats {
  let healthy = 0;
  let attention = 0;
  let critical = 0;
  for (const dev of devices) {
    const devRisks = risks.filter(
      (r) => r.device_id === dev.id && r.review_status !== 'resolved'
    );
    if (devRisks.some((r) => r.severity === 'HIGH')) {
      critical += 1;
    } else if (devRisks.length > 0 || dev.device_status !== 'online') {
      attention += 1;
    } else {
      healthy += 1;
    }
  }
  const total = devices.length || 1;
  return {
    healthy_count: healthy,
    attention_count: attention,
    critical_count: critical,
    healthy_pct: Math.round((healthy / total) * 100),
    attention_pct: Math.round((attention / total) * 100),
    critical_pct: Math.round((critical / total) * 100),
    total_evaluated: devices.length,
    calculation_rule:
      'Critical: >=1 unresolved HIGH risk; Attention: unresolved MEDIUM/LOW risk or stale/offline; Healthy: online with 0 unresolved risks.',
  };
}

export function buildDemoRecentActivity(scans: ScanSummary[]): RecentScanActivity[] {
  return scans.slice(0, 5).map((s) => ({
    scan_id: s.scan_id,
    device_id: s.device_id,
    device_name: s.device_name,
    scan_time: s.received_at,
    scan_status: s.scan_status,
    risk_findings_count: s.risk_findings_count,
  }));
}

export function buildDemoDeviceDetail(
  deviceId: string,
  devices: Device[],
  apps: AIApplication[],
  mcps: MCPServer[],
  risks: RiskFinding[],
  events: ActivityEvent[],
  scans: ScanSummary[]
): DeviceDetailResponse | null {
  const device = devices.find((d) => d.id === deviceId);
  if (!device) return null;
  return {
    device,
    ai_applications: apps.filter((a) => a.device_id === deviceId),
    mcp_servers: mcps.filter((m) => m.device_id === deviceId),
    risk_findings: risks.filter((r) => r.device_id === deviceId),
    activity_events: events.filter((e) => e.device_id === deviceId),
    scans: scans.filter((s) => s.device_id === deviceId),
  };
}

export function buildDemoScanDetail(
  scanId: string,
  scans: ScanSummary[],
  apps: AIApplication[],
  mcps: MCPServer[],
  risks: RiskFinding[]
): ScanDetail | null {
  const scan = scans.find((s) => s.scan_id === scanId);
  if (!scan) return null;
  const scanApps = apps.filter((a) => a.scan_id === scanId);
  const scanMcps = mcps.filter((m) => m.scan_id === scanId);
  const scanRisks = risks.filter((r) => r.scan_id === scanId);
  return {
    ...scan,
    ai_applications: scanApps,
    mcp_servers: scanMcps,
    risk_findings: scanRisks,
    report_json: {
      schema_version: '1.4',
      scan_id: scan.scan_id,
      device_id: scan.device_id,
      device_name: scan.device_name,
      scanner_version: scan.scanner_version,
      scan_start_utc: scan.scan_start_utc,
      privacy_mode: 'redacted_evidence_only',
      ai_applications: scanApps,
      mcp_servers: scanMcps,
      risk_findings: scanRisks,
    },
  };
}

export function createDemoEnrollmentToken(): EnrollmentTokenResponse {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return {
    token_id: `tok-${Date.now()}`,
    enrollment_token: `AITE-ENR-${rand}-DEMO`,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    note: 'Single-use enrollment token (Demo Mode). Copy now; it is not stored in plaintext.',
  };
}
