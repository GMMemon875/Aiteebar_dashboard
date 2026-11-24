import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { RiskSeverity } from '../types/api';

export function formatUtcDate(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SeverityLabel({ severity }: { severity: RiskSeverity }) {
  if (severity === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 tabular-nums">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        HIGH
      </span>
    );
  }
  if (severity === 'MEDIUM') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 tabular-nums">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        MEDIUM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 tabular-nums">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
      LOW
    </span>
  );
}

export function StatusLabel({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();
  if (
    normalized === 'online' ||
    normalized === 'success' ||
    normalized === 'healthy' ||
    normalized === 'approved' ||
    normalized === 'resolved' ||
    normalized === 'enrolled' ||
    normalized === 'running' ||
    normalized === 'normal'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="capitalize">{status.replace(/_/g, ' ')}</span>
      </span>
    );
  }
  if (
    normalized === 'warning' ||
    normalized === 'stale' ||
    normalized === 'in_review' ||
    normalized === 'pending_review' ||
    normalized === 'background' ||
    normalized === 'attention' ||
    normalized === 'logged_redacted'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="capitalize">{status.replace(/_/g, ' ')}</span>
      </span>
    );
  }
  if (
    normalized === 'offline' ||
    normalized === 'failed' ||
    normalized === 'critical' ||
    normalized === 'revoked' ||
    normalized === 'flagged' ||
    normalized === 'open' ||
    normalized === 'alert_triggered'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        <span className="capitalize">{status.replace(/_/g, ' ')}</span>
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-slate-400 capitalize">
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function LoadingTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-4" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-full animate-pulse rounded-lg bg-slate-800/60"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#0B1221] px-6 py-12 text-center">
      <DatabaseZap className="mb-3 h-8 w-8 text-slate-500" />
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-xs text-red-200"
    >
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-100 transition-colors hover:bg-red-900/70"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
