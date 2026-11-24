import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Download, Search } from 'lucide-react';
import { apiService } from '../services/api';
import type { Device, ScanDetail, ScanSummary } from '../types/api';
import {
  EmptyState,
  ErrorBanner,
  formatUtcDate,
  LoadingTableSkeleton,
  SeverityLabel,
  StatusLabel,
} from '../components/StateViews';

export function ScanReportsPage({
  initialScanId,
  onClearInitialScan,
}: {
  initialScanId: string | null;
  onClearInitialScan: () => void;
}) {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('all');
  const [scanStatus, setScanStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scList, devList] = await Promise.all([
        apiService.getScans({
          device_id: deviceId,
          scan_status: scanStatus,
          search: search.trim() || undefined,
        }),
        apiService.getDevices(),
      ]);
      setScans(scList);
      setDevices(devList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan reports.');
    } finally {
      setLoading(false);
    }
  }, [deviceId, scanStatus, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openScan = useCallback(async (scanId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await apiService.getScanDetail(scanId);
      setSelectedScan(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan report details.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialScanId) {
      openScan(initialScanId);
    }
  }, [initialScanId, openScan]);

  const downloadJson = async (scanId: string) => {
    try {
      const jsonObj = await apiService.getScanReportJson(scanId);
      const blob = new Blob([JSON.stringify(jsonObj, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aiteebar-scan-${scanId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download JSON report.');
    }
  };

  if (selectedScan || detailLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedScan(null);
              onClearInitialScan();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101829] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Scan History
          </button>
          {selectedScan && (
            <button
              type="button"
              onClick={() => downloadJson(selectedScan.scan_id)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              <Download className="h-3.5 w-3.5" />
              Download Raw JSON Report
            </button>
          )}
        </div>

        {detailLoading ? (
          <LoadingTableSkeleton rows={6} />
        ) : selectedScan ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-slate-100">
                    Scan Report: {selectedScan.scan_id}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{selectedScan.device_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>Scanner v{selectedScan.scanner_version}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      Received {formatUtcDate(selectedScan.received_at)}
                    </span>
                  </div>
                </div>
                <StatusLabel status={selectedScan.scan_status} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-slate-400">AI Applications</span>
                  <div className="mt-0.5 text-lg font-bold text-slate-100 tabular-nums">
                    {selectedScan.ai_applications.length}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">MCP Servers</span>
                  <div className="mt-0.5 text-lg font-bold text-slate-100 tabular-nums">
                    {selectedScan.mcp_servers.length}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Risk Findings</span>
                  <div className="mt-0.5 text-lg font-bold text-slate-100 tabular-nums">
                    {selectedScan.risk_findings.length}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-slate-100">
                Findings in Scan
              </h2>
              {selectedScan.risk_findings.length === 0 ? (
                <p className="text-xs text-slate-400">No risk findings in this scan.</p>
              ) : (
                <div className="divide-y divide-slate-800/70 text-xs">
                  {selectedScan.risk_findings.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="font-medium text-slate-200">{r.title}</div>
                        <div className="text-[11px] text-slate-400">{r.remediation}</div>
                      </div>
                      <SeverityLabel severity={r.severity} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-slate-100">
                Preserved JSON Report Payload
              </h2>
              <pre className="max-h-96 overflow-auto rounded-lg border border-slate-800 bg-[#070B14] p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                {JSON.stringify(selectedScan.report_json, null, 2)}
              </pre>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
          Historical Scan Reports
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Immutable chronological archive of all uploaded scanner reports with JSON export
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-[#0D1526] p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Scan ID or Device..."
            className="w-full rounded-lg border border-slate-800 bg-[#080E1C] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
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
          value={scanStatus}
          onChange={(e) => setScanStatus(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200"
        >
          <option value="all">All Scan Statuses</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
        {loading ? (
          <LoadingTableSkeleton rows={5} />
        ) : scans.length === 0 ? (
          <EmptyState
            title="No historical scans found"
            description="Every uploaded scan_report.json is preserved here without overwriting prior records."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Scan ID</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Scan Date &amp; Time</th>
                  <th className="pb-3 font-medium">Scanner</th>
                  <th className="pb-3 font-medium text-right">AI Apps</th>
                  <th className="pb-3 font-medium text-right">MCP</th>
                  <th className="pb-3 font-medium text-right">Risks</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {scans.map((s) => (
                  <tr key={s.scan_id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-mono text-[11px] text-slate-200">
                      {s.scan_id}
                    </td>
                    <td className="py-3 font-medium text-slate-200">
                      {s.device_name}
                    </td>
                    <td className="py-3 text-slate-300 tabular-nums">
                      {formatUtcDate(s.received_at)}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-400">
                      v{s.scanner_version}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-200 tabular-nums">
                      {s.ai_applications_count}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-200 tabular-nums">
                      {s.mcp_servers_count}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-200 tabular-nums">
                      {s.risk_findings_count}
                    </td>
                    <td className="py-3">
                      <StatusLabel status={s.scan_status} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openScan(s.scan_id)}
                          className="rounded-lg border border-slate-700 bg-[#101829] px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-slate-800"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadJson(s.scan_id)}
                          className="rounded-lg border border-slate-700 bg-[#101829] p-1.5 text-slate-300 hover:bg-slate-800"
                          title="Download JSON report"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
