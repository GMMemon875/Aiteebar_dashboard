import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { apiService } from '../services/api';
import type {
  Device,
  FindingReviewStatus,
  RiskFinding,
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

export function RiskAssessmentPage() {
  const { user } = useAuth();
  const [findings, setFindings] = useState<RiskFinding[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [severity, setSeverity] = useState('all');
  const [deviceId, setDeviceId] = useState('all');
  const [reviewStatus, setReviewStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<RiskFinding | null>(null);
  const [editStatus, setEditStatus] = useState<FindingReviewStatus>('open');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [riskList, devList] = await Promise.all([
        apiService.getRisks({
          severity,
          device_id: deviceId,
          review_status: reviewStatus,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          search: search.trim() || undefined,
        }),
        apiService.getDevices(),
      ]);
      setFindings(riskList);
      setDevices(devList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load risk findings.');
    } finally {
      setLoading(false);
    }
  }, [severity, deviceId, reviewStatus, dateFrom, dateTo, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openFinding = async (findingId: string) => {
    try {
      const detail = await apiService.getRiskDetail(findingId);
      setSelected(detail);
      setEditStatus(detail.review_status);
      setEditNotes(detail.reviewer_notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finding details.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await apiService.updateRiskReview(
        selected.id,
        editStatus,
        editNotes
      );
      setSelected(updated);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update finding.');
    } finally {
      setSaving(false);
    }
  };

  if (selected) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101829] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Risk Findings
        </button>

        <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="font-mono text-slate-300">{selected.finding_code}</span>
                <span aria-hidden="true">·</span>
                <span>{selected.device_name}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formatUtcDate(selected.detected_at)}</span>
              </div>
              <h1 className="mt-2 font-display text-xl font-bold text-slate-100">
                {selected.title}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <SeverityLabel severity={selected.severity} />
              <StatusLabel status={selected.review_status} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div>
                <h2 className="text-xs font-semibold text-slate-300">Finding Description</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  {selected.description}
                </p>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-300">
                  Recommended Remediation
                </h2>
                <p className="mt-1.5 rounded-lg border border-slate-800 bg-[#080E1C] p-3.5 text-xs leading-relaxed text-slate-200">
                  {selected.remediation}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-[#080E1C] p-3">
                  <span className="text-slate-400">Related Application / MCP Server</span>
                  <div className="mt-1 font-mono text-slate-200">
                    {selected.related_asset || 'Endpoint-level rule'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#080E1C] p-3">
                  <span className="text-slate-400">Source Scan ID</span>
                  <div className="mt-1 font-mono text-slate-200">{selected.scan_id}</div>
                </div>
              </div>
            </div>

            {/* Review Form */}
            <form
              onSubmit={handleUpdate}
              className="space-y-4 rounded-xl border border-slate-800 bg-[#080E1C] p-4"
            >
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Analyst Review
              </h2>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">
                  Review Status
                </label>
                <select
                  value={editStatus}
                  disabled={user?.role === 'viewer'}
                  onChange={(e) => setEditStatus(e.target.value as FindingReviewStatus)}
                  className="w-full rounded-lg border border-slate-800 bg-[#0D1526] px-3 py-2 text-xs text-slate-100 disabled:opacity-60"
                >
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="accepted_risk">Accepted Risk</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">
                  Reviewer Notes
                </label>
                <textarea
                  rows={4}
                  disabled={user?.role === 'viewer'}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Document remediation verification or justification..."
                  className="w-full rounded-lg border border-slate-800 bg-[#0D1526] p-2.5 text-xs text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
                />
              </div>
              {user?.role !== 'viewer' && (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Review Status'}
                </button>
              )}
            </form>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
          Risk Assessment
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Security findings generated by endpoint scanner rules and verified backend policy checks
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-[#0D1526] p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search finding ID, title, or device..."
            className="w-full rounded-lg border border-slate-800 bg-[#080E1C] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200"
        >
          <option value="all">All Severities</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200"
        >
          <option value="all">All Devices</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.device_name}
            </option>
          ))}
        </select>
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200"
        >
          <option value="all">All Review Statuses</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="accepted_risk">Accepted Risk</option>
        </select>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-2 py-2 text-xs text-slate-200"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-2 py-2 text-xs text-slate-200"
          />
        </div>
      </div>

      {/* Findings Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
        {loading ? (
          <LoadingTableSkeleton rows={5} />
        ) : findings.length === 0 ? (
          <EmptyState
            title="No security findings match filters"
            description="No findings reported from endpoint scans for the selected criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Finding ID</th>
                  <th className="pb-3 font-medium">Severity</th>
                  <th className="pb-3 font-medium">Risk Title</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Related Asset</th>
                  <th className="pb-3 font-medium">Detected</th>
                  <th className="pb-3 font-medium">Review</th>
                  <th className="pb-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {findings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-mono text-[11px] text-slate-300">
                      {f.finding_code}
                    </td>
                    <td className="py-3">
                      <SeverityLabel severity={f.severity} />
                    </td>
                    <td className="py-3 max-w-xs">
                      <div className="font-semibold text-slate-100 truncate">
                        {f.title}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-400">
                        {f.remediation}
                      </div>
                    </td>
                    <td className="py-3 text-slate-200">{f.device_name}</td>
                    <td className="py-3 font-mono text-[11px] text-slate-300">
                      {f.related_asset || '—'}
                    </td>
                    <td className="py-3 text-slate-400 tabular-nums">
                      {formatUtcDate(f.detected_at)}
                    </td>
                    <td className="py-3">
                      <StatusLabel status={f.review_status} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openFinding(f.id)}
                        className="rounded-lg border border-slate-700 bg-[#101829] px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-slate-800"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
