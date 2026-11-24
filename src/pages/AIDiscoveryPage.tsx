import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Info, Search } from 'lucide-react';
import { apiService } from '../services/api';
import type {
  AIApplication,
  AppClassification,
  AppReviewStatus,
  Device,
} from '../types/api';
import {
  EmptyState,
  ErrorBanner,
  formatUtcDate,
  LoadingTableSkeleton,
  StatusLabel,
} from '../components/StateViews';
import { useAuth } from '../context/AuthContext';

export function AIDiscoveryPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<AIApplication[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState('');
  const [deviceId, setDeviceId] = useState('all');
  const [classification, setClassification] = useState('all');
  const [runningStatus, setRunningStatus] = useState('all');
  const [reviewStatus, setReviewStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingApp, setReviewingApp] = useState<AIApplication | null>(null);
  const [newClassification, setNewClassification] =
    useState<AppClassification>('authorized_dev_tool');
  const [newReviewStatus, setNewReviewStatus] =
    useState<AppReviewStatus>('approved');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appList, devList] = await Promise.all([
        apiService.getApplications({
          search: search.trim() || undefined,
          device_id: deviceId,
          classification,
          running_status: runningStatus,
          review_status: reviewStatus,
        }),
        apiService.getDevices(),
      ]);
      setApps(appList);
      setDevices(devList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI applications.');
    } finally {
      setLoading(false);
    }
  }, [search, deviceId, classification, runningStatus, reviewStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingApp) return;
    try {
      await apiService.updateApplicationReview(
        reviewingApp.id,
        newReviewStatus,
        newClassification
      );
      setReviewingApp(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
          AI Application Discovery
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Discovered known AI tools, unknown AI candidates, and running/installation states across endpoints
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-blue-900/50 bg-blue-950/20 px-4 py-3 text-xs text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <span>
          Unknown AI candidates are queued for administrator review and are not automatically classified as malicious. Approved known software definitions are managed separately in Settings &rarr; Application Registry.
        </span>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-[#0D1526] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Application name..."
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
          value={classification}
          onChange={(e) => setClassification(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Classifications</option>
          <option value="known_ai">Known AI Application</option>
          <option value="unknown_ai_candidate">Unknown AI Candidate</option>
          <option value="authorized_dev_tool">Authorized Dev Tool</option>
          <option value="normal_application">Normal Application</option>
        </select>
        <select
          value={runningStatus}
          onChange={(e) => setRunningStatus(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Running States</option>
          <option value="running">Running</option>
          <option value="background">Background</option>
          <option value="not_running">Not Running</option>
        </select>
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value)}
          className="rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Review States</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="flagged">Flagged</option>
          <option value="non_ai_verified">Non-AI Verified</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
        {loading ? (
          <LoadingTableSkeleton rows={6} />
        ) : apps.length === 0 ? (
          <EmptyState
            title="No AI applications match current filters"
            description="Adjust filter criteria or await the next endpoint scan report."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Application</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Classification</th>
                  <th className="pb-3 font-medium">Running State</th>
                  <th className="pb-3 font-medium">Installation</th>
                  <th className="pb-3 font-medium">Review Status</th>
                  <th className="pb-3 font-medium">Detected</th>
                  <th className="pb-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30">
                    <td className="py-3">
                      <div className="font-semibold text-slate-100">{app.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {app.publisher || 'Publisher unknown'}
                      </div>
                    </td>
                    <td className="py-3 text-slate-200">{app.device_name}</td>
                    <td className="py-3 capitalize text-slate-300">
                      {app.classification.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3">
                      <StatusLabel status={app.running_status} />
                    </td>
                    <td className="py-3 text-slate-300">
                      {app.installation_found ? 'Installed' : 'Not installed'}
                    </td>
                    <td className="py-3">
                      <StatusLabel status={app.review_status} />
                    </td>
                    <td className="py-3 text-slate-400 tabular-nums">
                      {formatUtcDate(app.detected_at)}
                    </td>
                    <td className="py-3 text-right">
                      {user?.role !== 'viewer' && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingApp(app);
                            setNewClassification(app.classification);
                            setNewReviewStatus(app.review_status);
                          }}
                          className="rounded-lg border border-slate-700 bg-[#101829] px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-slate-800"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleSaveReview}
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-[#0D1526] p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              <h2 className="font-display text-base font-semibold text-slate-100">
                Review Application: {reviewingApp.name}
              </h2>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#080E1C] p-3 text-[11px] text-slate-300">
              <div>Device: {reviewingApp.device_name}</div>
              <div className="mt-1 break-all font-mono text-slate-400">
                {reviewingApp.executable_path || 'Path unavailable'}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Classification
              </label>
              <select
                value={newClassification}
                onChange={(e) => setNewClassification(e.target.value as AppClassification)}
                className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-100"
              >
                <option value="known_ai">Known AI Application</option>
                <option value="unknown_ai_candidate">Unknown AI Candidate</option>
                <option value="authorized_dev_tool">Authorized Dev Tool</option>
                <option value="normal_application">Normal Application</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Review Decision
              </label>
              <select
                value={newReviewStatus}
                onChange={(e) => setNewReviewStatus(e.target.value as AppReviewStatus)}
                className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-xs text-slate-100"
              >
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="non_ai_verified">Non-AI Verified</option>
                <option value="flagged">Flagged for Investigation</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewingApp(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Save Review
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
