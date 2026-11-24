import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityEvent, Device } from '../types/api';
import {
  EmptyState,
  ErrorBanner,
  formatUtcDate,
  LoadingTableSkeleton,
  StatusLabel,
} from '../components/StateViews';

export function ActivityMonitoringPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evList, devList] = await Promise.all([
        apiService.getActivityEvents({
          device_id: deviceId,
          event_type: eventType,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
        apiService.getDevices(),
      ]);
      setEvents(evList);
      setDevices(devList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity events.');
    } finally {
      setLoading(false);
    }
  }, [deviceId, eventType, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const distinctTypes = Array.from(new Set(events.map((e) => e.event_type)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
          Activity Monitoring
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Endpoint file and AI runtime metadata events captured under redacted-evidence privacy rules
        </p>
      </div>

      {/* Privacy Guarantee Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-800/60 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div>
          <span className="font-semibold">Privacy-Preserving Redacted Evidence:</span>{' '}
          Aiteebar never collects or displays raw clipboard contents, document text, passwords, or personal credentials. Sensitive paths and tokens are masked locally on the laptop prior to transmission.
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-[#0D1526] p-4 sm:grid-cols-2 lg:grid-cols-4">
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
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200"
        >
          <option value="all">All Event Types</option>
          {distinctTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="Filter from date"
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="Filter to date"
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
        {loading ? (
          <LoadingTableSkeleton rows={5} />
        ) : events.length === 0 ? (
          <EmptyState
            title="No activity events recorded"
            description="Redacted endpoint activity metadata will appear here after scanner uploads."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Event ID</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Event Type</th>
                  <th className="pb-3 font-medium">Masked Resource Path</th>
                  <th className="pb-3 font-medium">Process</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-mono text-[11px] text-slate-400">
                      {ev.id}
                    </td>
                    <td className="py-3 font-medium text-slate-200">
                      {ev.device_name}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-blue-400">
                      {ev.event_type}
                    </td>
                    <td className="py-3 max-w-sm">
                      <div className="truncate font-mono text-[11px] text-slate-200">
                        {ev.resource_path || '—'}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-400">
                        {ev.redacted_summary}
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-300">
                      {ev.responsible_process || '—'}
                    </td>
                    <td className="py-3">
                      <StatusLabel status={ev.event_status} />
                    </td>
                    <td className="py-3 text-slate-400 tabular-nums">
                      {formatUtcDate(ev.event_timestamp)}
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
