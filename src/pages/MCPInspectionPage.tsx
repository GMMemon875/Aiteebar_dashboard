import React, { useCallback, useEffect, useState } from 'react';
import { Lock, Search, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/api';
import type { Device, MCPServer } from '../types/api';
import {
  EmptyState,
  ErrorBanner,
  LoadingTableSkeleton,
  SeverityLabel,
} from '../components/StateViews';

export function MCPInspectionPage() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('all');
  const [riskLevel, setRiskLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srvList, devList] = await Promise.all([
        apiService.getMcpServers({
          device_id: deviceId,
          risk_level: riskLevel,
          search: search.trim() || undefined,
        }),
        apiService.getDevices(),
      ]);
      setServers(srvList);
      setDevices(devList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP inspection data.');
    } finally {
      setLoading(false);
    }
  }, [deviceId, riskLevel, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
          MCP Server Inspection
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Static security inspection of Model Context Protocol (MCP) configuration files
        </p>
      </div>

      {/* Mandatory Static Inspection & Redaction Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-800/60 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div>
          <span className="font-semibold">Configuration Inspection Only:</span>{' '}
          The Aiteebar scanner inspects local MCP configuration files statically and never launches or executes MCP servers. Environment variable secrets and sensitive CLI arguments are redacted before upload.
        </div>
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
            placeholder="Filter by server or package name..."
            className="w-full rounded-lg border border-slate-800 bg-[#080E1C] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Devices</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.device_name}
            </option>
          ))}
        </select>
        <select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Risk Levels</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="LOW">Low Risk</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
        {loading ? (
          <LoadingTableSkeleton rows={5} />
        ) : servers.length === 0 ? (
          <EmptyState
            title="No MCP servers found"
            description="Detected MCP configuration entries across enrolled devices will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Server Name</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Package &amp; Version</th>
                  <th className="pb-3 font-medium">Command &amp; Redacted Args</th>
                  <th className="pb-3 font-medium">Configuration Source</th>
                  <th className="pb-3 font-medium">Version Pinned</th>
                  <th className="pb-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {servers.map((m) => (
                  <tr key={m.id} className="align-top hover:bg-slate-800/30">
                    <td className="py-3 font-semibold text-slate-100">
                      {m.server_name}
                    </td>
                    <td className="py-3 text-slate-300">{m.device_name}</td>
                    <td className="py-3">
                      <div className="font-mono text-[11px] text-slate-200">
                        {m.package_name}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                        v: {m.package_version || 'unbounded'}
                      </div>
                    </td>
                    <td className="py-3 max-w-xs">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                        <Lock className="h-3 w-3 shrink-0 text-slate-500" />
                        <span className="truncate">
                          {m.command || '—'} {m.redacted_arguments.join(' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-400">
                      {m.configuration_source}
                    </td>
                    <td className="py-3">
                      <span
                        className={`font-medium ${
                          m.version_pinned ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {m.version_pinned ? 'Pinned' : 'Unpinned'}
                      </span>
                    </td>
                    <td className="py-3">
                      <SeverityLabel severity={m.risk_level} />
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
