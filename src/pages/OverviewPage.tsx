import React, { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Cpu,
  Laptop,
  RefreshCw,
  Server,
  ShieldAlert,
} from 'lucide-react';
import { apiService } from '../services/api';
import type {
  AIApplication,
  DashboardSummary,
  MCPServer,
  RecentScanActivity,
  RiskTrendPoint,
  SecurityStatusStats,
} from '../types/api';
import {
  EmptyState,
  ErrorBanner,
  formatUtcDate,
  LoadingTableSkeleton,
  SeverityLabel,
  StatusLabel,
} from '../components/StateViews';
import type { NavSection } from '../components/Layout';

export function OverviewPage({
  onNavigate,
  onOpenScan,
}: {
  onNavigate: (section: NavSection) => void;
  onOpenScan: (scanId: string) => void;
}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatusStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentScanActivity[]>([]);
  const [trends, setTrends] = useState<RiskTrendPoint[]>([]);
  const [apps, setApps] = useState<AIApplication[]>([]);
  const [mcps, setMcps] = useState<MCPServer[]>([]);
  const [trendDays, setTrendDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, sec, act, tr, ap, mc] = await Promise.all([
        apiService.getDashboardSummary(),
        apiService.getSecurityStatus(),
        apiService.getRecentActivity(),
        apiService.getRiskTrends(trendDays),
        apiService.getApplications(),
        apiService.getMcpServers(),
      ]);
      setSummary(sum);
      setSecurityStatus(sec);
      setRecentActivity(act);
      setTrends(tr);
      setApps(ap.slice(0, 6));
      setMcps(mc.slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard overview.');
    } finally {
      setLoading(false);
    }
  }, [trendDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pieData = securityStatus
    ? [
        { name: 'Healthy', value: securityStatus.healthy_count, color: '#10B981' },
        { name: 'Attention', value: securityStatus.attention_count, color: '#F59E0B' },
        { name: 'Critical', value: securityStatus.critical_count, color: '#EF4444' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
            Security Posture Overview
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Centralized AI discovery, MCP configuration inspection, and endpoint risk telemetry
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101829] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('devices')}
          className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5 text-left transition-colors hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Connected Devices</span>
            <Laptop className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-100 tabular-nums">
              {summary ? summary.connected_devices : '—'}
            </span>
            {summary && (
              <span className="text-xs text-slate-400 tabular-nums">
                of {summary.total_devices} enrolled
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ai-discovery')}
          className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5 text-left transition-colors hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">AI Applications</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-100 tabular-nums">
              {summary ? summary.ai_applications : '—'}
            </span>
            <span className="text-xs text-slate-400">detected instances</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('mcp-inspection')}
          className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5 text-left transition-colors hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">MCP Servers</span>
            <Server className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-100 tabular-nums">
              {summary ? summary.mcp_servers : '—'}
            </span>
            <span className="text-xs text-slate-400">static configs inspected</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('risk-assessment')}
          className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5 text-left transition-colors hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Open Risk Findings</span>
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-100 tabular-nums">
              {summary ? summary.risk_findings : '—'}
            </span>
            {summary && (
              <span className="text-xs text-red-400 tabular-nums">
                {summary.high_risk_findings} high severity
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Charts Row: Security Status + Risk Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Security Status Donut */}
        <section className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Endpoint Security Status
            </h2>
            <span className="text-xs text-slate-400 tabular-nums">
              {securityStatus?.total_evaluated ?? 0} devices evaluated
            </span>
          </div>

          {loading ? (
            <LoadingTableSkeleton rows={4} />
          ) : !securityStatus || securityStatus.total_evaluated === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No devices evaluated yet"
                description="Enroll a Windows laptop and upload an initial scan report to compute fleet posture."
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#E2E8F0',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs">
                  <span className="font-medium text-emerald-400">Healthy</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {securityStatus.healthy_count} ({securityStatus.healthy_pct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs">
                  <span className="font-medium text-amber-400">Attention</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {securityStatus.attention_count} ({securityStatus.attention_pct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1 text-xs">
                  <span className="font-medium text-red-400">Critical</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {securityStatus.critical_count} ({securityStatus.critical_pct}%)
                  </span>
                </div>
                <p className="pt-1 text-[11px] leading-relaxed text-slate-500">
                  {securityStatus.calculation_rule}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Historical Risk Overview */}
        <section className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                Risk Overview &amp; Historical Trend
              </h2>
              <p className="text-xs text-slate-400">
                High, medium, and low risk findings across scan windows
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#080E1C] p-1">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTrendDays(d)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    trendDays === d
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 h-56 w-full">
            {trends.length === 0 ? (
              <EmptyState
                title="No historical trend data"
                description="Risk trends appear once scans are recorded across time."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#E2E8F0',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    name="High"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    name="Medium"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    name="Low"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* Recent Scan Activity + AI Apps Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Recent Scan Activity
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('scan-reports')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              All scans <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <LoadingTableSkeleton rows={4} />
          ) : recentActivity.length === 0 ? (
            <EmptyState
              title="No scans uploaded"
              description="Submitted Windows scanner reports will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentActivity.map((act) => (
                <div
                  key={act.scan_id}
                  className="flex items-center justify-between gap-3 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-200 truncate">
                      {act.device_name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
                      {formatUtcDate(act.scan_time)} · {act.risk_findings_count} findings
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusLabel status={act.scan_status} />
                    <button
                      type="button"
                      onClick={() => onOpenScan(act.scan_id)}
                      className="rounded-md border border-slate-800 bg-[#101829] px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:bg-slate-800"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-100">
              AI Applications Overview
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('ai-discovery')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              View discovery <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <LoadingTableSkeleton rows={5} />
          ) : apps.length === 0 ? (
            <EmptyState
              title="No AI applications reported"
              description="Discovered apps like Cursor, Claude Desktop, VS Code, Ollama, and unknown candidates appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-medium">Application</th>
                    <th className="pb-2.5 font-medium">Device</th>
                    <th className="pb-2.5 font-medium">Running</th>
                    <th className="pb-2.5 font-medium">Installed</th>
                    <th className="pb-2.5 font-medium">Classification</th>
                    <th className="pb-2.5 font-medium">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {apps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-medium text-slate-200">{app.name}</td>
                      <td className="py-2.5 text-slate-300">{app.device_name}</td>
                      <td className="py-2.5">
                        <StatusLabel status={app.running_status} />
                      </td>
                      <td className="py-2.5 text-slate-300">
                        {app.installation_found ? 'Installed' : 'Not found'}
                      </td>
                      <td className="py-2.5 text-slate-300 capitalize">
                        {app.classification.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5">
                        <StatusLabel status={app.review_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* MCP Servers Overview */}
      <section className="rounded-xl border border-slate-800/90 bg-[#0D1526] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              MCP Servers Overview
            </h2>
            <p className="text-xs text-slate-400">
              Static inspection of endpoint MCP configurations (servers are never executed)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('mcp-inspection')}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            Inspect all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <LoadingTableSkeleton rows={4} />
        ) : mcps.length === 0 ? (
          <EmptyState
            title="No MCP servers detected"
            description="Configured MCP servers from Claude Desktop or Cursor configs will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2.5 font-medium">Server Name</th>
                  <th className="pb-2.5 font-medium">Associated Device</th>
                  <th className="pb-2.5 font-medium">Package</th>
                  <th className="pb-2.5 font-medium">Version</th>
                  <th className="pb-2.5 font-medium">Version Pinned</th>
                  <th className="pb-2.5 font-medium">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {mcps.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-medium text-slate-200">{m.server_name}</td>
                    <td className="py-2.5 text-slate-300">{m.device_name}</td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-300">
                      {m.package_name}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-300 tabular-nums">
                      {m.package_version || 'unbounded'}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-xs font-medium ${
                          m.version_pinned ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {m.version_pinned ? 'Pinned' : 'Unpinned'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <SeverityLabel severity={m.risk_level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
