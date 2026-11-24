import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Copy,
  KeyRound,
  Plus,
  Search,
  ShieldOff,
  X,
} from 'lucide-react';
import { apiService } from '../services/api';
import type {
  Device,
  DeviceDetailResponse,
  EnrollmentTokenResponse,
} from '../types/api';
import {
  EmptyState,
  ErrorBanner,
  formatUtcDate,
  LoadingTableSkeleton,
  SeverityLabel,
  StatusLabel,
} from '../components/StateViews';
import { useAuth } from '../context/AuthContext';

export function DevicesPage({
  onOpenScan,
}: {
  onOpenScan: (scanId: string) => void;
}) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeviceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollNote, setEnrollNote] = useState('');
  const [issuedToken, setIssuedToken] = useState<EnrollmentTokenResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiService.getDevices({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setDevices(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const openDeviceDetail = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setDetailLoading(true);
    setError(null);
    try {
      const res = await apiService.getDeviceDetail(deviceId);
      setDetail(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tok = await apiService.createEnrollmentToken(enrollNote.trim());
      setIssuedToken(tok);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue enrollment token.');
    }
  };

  const handleRevoke = async (deviceId: string) => {
    try {
      await apiService.revokeDeviceToken(deviceId);
      await loadDevices();
      if (selectedDeviceId === deviceId) {
        await openDeviceDetail(deviceId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke device token.');
    }
  };

  const sortedDevices = useMemo(() => {
    const copy = [...devices];
    copy.sort((a, b) =>
      sortAsc
        ? a.device_name.localeCompare(b.device_name)
        : b.device_name.localeCompare(a.device_name)
    );
    return copy;
  }, [devices, sortAsc]);

  if (selectedDeviceId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedDeviceId(null);
              setDetail(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101829] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Devices
          </button>
          {user?.role === 'admin' && detail?.device.enrollment_status !== 'revoked' && (
            <button
              type="button"
              onClick={() => handleRevoke(selectedDeviceId)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-800/70 bg-red-950/40 px-3.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Revoke Device Token
            </button>
          )}
        </div>

        {detailLoading ? (
          <LoadingTableSkeleton rows={6} />
        ) : detail ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-slate-100">
                    {detail.device.device_name}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono">{detail.device.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{detail.device.operating_system}</span>
                    <span aria-hidden="true">·</span>
                    <span>Scanner v{detail.device.scanner_version}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <StatusLabel status={detail.device.device_status} />
                  <StatusLabel status={detail.device.enrollment_status} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-slate-400">Enrolled At</span>
                  <div className="mt-0.5 font-medium text-slate-200 tabular-nums">
                    {formatUtcDate(detail.device.enrolled_at)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Last Scan Time</span>
                  <div className="mt-0.5 font-medium text-slate-200 tabular-nums">
                    {formatUtcDate(detail.device.last_seen_at)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Token Policy</span>
                  <div className="mt-0.5 font-medium text-slate-200">
                    Hashed server-side (permanent tokens never exposed)
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
                <h2 className="mb-3 font-display text-sm font-semibold text-slate-100">
                  AI Applications Discovered ({detail.ai_applications.length})
                </h2>
                {detail.ai_applications.length === 0 ? (
                  <p className="text-xs text-slate-400">No AI applications discovered.</p>
                ) : (
                  <div className="divide-y divide-slate-800/70 text-xs">
                    {detail.ai_applications.map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <div className="font-medium text-slate-200">{a.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {a.classification.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <StatusLabel status={a.running_status} />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
                <h2 className="mb-3 font-display text-sm font-semibold text-slate-100">
                  MCP Servers Detected ({detail.mcp_servers.length})
                </h2>
                {detail.mcp_servers.length === 0 ? (
                  <p className="text-xs text-slate-400">No MCP servers configured.</p>
                ) : (
                  <div className="divide-y divide-slate-800/70 text-xs">
                    {detail.mcp_servers.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <div className="font-medium text-slate-200">{m.server_name}</div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {m.package_name} ({m.version_pinned ? m.package_version : 'unpinned'})
                          </div>
                        </div>
                        <SeverityLabel severity={m.risk_level} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-slate-100">
                Security Findings ({detail.risk_findings.length})
              </h2>
              {detail.risk_findings.length === 0 ? (
                <p className="text-xs text-slate-400">No security findings on this device.</p>
              ) : (
                <div className="divide-y divide-slate-800/70 text-xs">
                  {detail.risk_findings.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <div className="font-medium text-slate-200">{r.title}</div>
                        <div className="text-[11px] text-slate-400">{r.remediation}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <SeverityLabel severity={r.severity} />
                        <StatusLabel status={r.review_status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
                <h2 className="mb-3 font-display text-sm font-semibold text-slate-100">
                  Activity Events ({detail.activity_events.length})
                </h2>
                {detail.activity_events.length === 0 ? (
                  <p className="text-xs text-slate-400">No activity events recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-800/70 text-xs">
                    {detail.activity_events.map((ev) => (
                      <div key={ev.id} className="py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-blue-400">
                            {ev.event_type}
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {formatUtcDate(ev.event_timestamp)}
                          </span>
                        </div>
                        <div className="mt-1 truncate font-mono text-[11px] text-slate-300">
                          {ev.resource_path || ev.redacted_summary}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
                <h2 className="mb-3 font-display text-sm font-semibold text-slate-100">
                  Scan History ({detail.scans.length})
                </h2>
                {detail.scans.length === 0 ? (
                  <p className="text-xs text-slate-400">No scans recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-800/70 text-xs">
                    {detail.scans.map((s) => (
                      <div key={s.scan_id} className="flex items-center justify-between py-2.5">
                        <div>
                          <div className="font-mono text-[11px] text-slate-200">
                            {s.scan_id}
                          </div>
                          <div className="text-[11px] text-slate-400 tabular-nums">
                            {formatUtcDate(s.received_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusLabel status={s.scan_status} />
                          <button
                            type="button"
                            onClick={() => onOpenScan(s.scan_id)}
                            className="rounded border border-slate-700 px-2 py-1 text-[11px] text-blue-400 hover:bg-slate-800"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
            Managed Windows Devices
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Enrolled company laptops, scanner health, and secure one-time token enrollment
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => {
              setIssuedToken(null);
              setEnrollNote('');
              setEnrollModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Enroll New Device
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={loadDevices} />}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-[#0D1526] p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by device ID, hostname, or OS..."
            className="w-full rounded-lg border border-slate-800 bg-[#080E1C] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          aria-label="Filter by device status"
        >
          <option value="all">All Statuses</option>
          <option value="online">Online</option>
          <option value="stale">Stale</option>
          <option value="offline">Offline</option>
        </select>

        <button
          type="button"
          onClick={() => setSortAsc((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          Name ({sortAsc ? 'A-Z' : 'Z-A'})
        </button>
      </div>

      {/* Devices Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
        {loading ? (
          <LoadingTableSkeleton rows={5} />
        ) : sortedDevices.length === 0 ? (
          <EmptyState
            title="No registered devices found"
            description="Issue a one-time enrollment token and run the Windows scanner enrollment command to register a company laptop."
            actionLabel={user?.role === 'admin' ? 'Issue Enrollment Token' : undefined}
            onAction={
              user?.role === 'admin' ? () => setEnrollModalOpen(true) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Device ID</th>
                  <th className="pb-3 font-medium">Device Name</th>
                  <th className="pb-3 font-medium">Operating System</th>
                  <th className="pb-3 font-medium">Scanner Version</th>
                  <th className="pb-3 font-medium">Last Scan Time</th>
                  <th className="pb-3 font-medium">Connection</th>
                  <th className="pb-3 font-medium">Enrollment</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {sortedDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-mono text-[11px] text-slate-300">
                      {d.id}
                    </td>
                    <td className="py-3 font-semibold text-slate-100">
                      {d.device_name}
                    </td>
                    <td className="py-3 text-slate-300">{d.operating_system}</td>
                    <td className="py-3 font-mono text-[11px] text-slate-300 tabular-nums">
                      v{d.scanner_version}
                    </td>
                    <td className="py-3 text-slate-300 tabular-nums">
                      {formatUtcDate(d.last_seen_at)}
                    </td>
                    <td className="py-3">
                      <StatusLabel status={d.device_status} />
                    </td>
                    <td className="py-3">
                      <StatusLabel status={d.enrollment_status} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDeviceDetail(d.id)}
                        className="rounded-lg border border-slate-700 bg-[#101829] px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-slate-800"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Secure Device Enrollment Modal */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0D1526] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-400" />
                <h2 className="font-display text-base font-semibold text-slate-100">
                  Secure Device Enrollment
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!issuedToken ? (
              <form onSubmit={handleGenerateToken} className="mt-4 space-y-4">
                <p className="text-xs leading-relaxed text-slate-300">
                  Generate a short-lived, single-use enrollment token. When the Windows scanner runs{' '}
                  <code className="rounded bg-slate-800 px-1 py-0.5 text-blue-300">
                    uploader.py --enroll
                  </code>
                  , the backend exchanges this token for a hashed device credential that is never displayed in the UI.
                </p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Rollout / Device Note
                  </label>
                  <input
                    type="text"
                    value={enrollNote}
                    onChange={(e) => setEnrollNote(e.target.value)}
                    placeholder="e.g., Engineering Windows 11 batch"
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEnrollModalOpen(false)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    Generate One-Time Token
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4">
                  <div className="text-xs font-semibold text-emerald-300">
                    One-Time Enrollment Token Issued
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2">
                    <code className="font-mono text-xs text-slate-100">
                      {issuedToken.enrollment_token}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(issuedToken.enrollment_token);
                        setCopied(true);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Expires: {formatUtcDate(issuedToken.expires_at)} · {issuedToken.note}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#080E1C] p-3 font-mono text-[11px] text-slate-300">
                  python uploader.py --enroll {issuedToken.enrollment_token}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEnrollModalOpen(false)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
