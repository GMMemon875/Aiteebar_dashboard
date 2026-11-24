import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileBarChart2,
  LayoutDashboard,
  Laptop,
  LogOut,
  Menu,
  Server,
  Settings,
  ShieldAlert,
  User as UserIcon,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import type { RiskFinding } from '../types/api';

export type NavSection =
  | 'overview'
  | 'devices'
  | 'ai-discovery'
  | 'mcp-inspection'
  | 'risk-assessment'
  | 'activity-monitoring'
  | 'scan-reports'
  | 'settings';

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', icon: Laptop },
  { id: 'ai-discovery', label: 'AI Discovery', icon: Cpu },
  { id: 'mcp-inspection', label: 'MCP Inspection', icon: Server },
  { id: 'risk-assessment', label: 'Risk Assessment', icon: ShieldAlert },
  { id: 'activity-monitoring', label: 'Activity Monitoring', icon: Activity },
  { id: 'scan-reports', label: 'Scan Reports', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function AiteebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="#1D4ED8" fillOpacity="0.18" />
        <rect
          x="0.5"
          y="0.5"
          width="31"
          height="31"
          rx="7.5"
          stroke="#3B82F6"
          strokeOpacity="0.45"
        />
        <path
          d="M16 5.5L24.5 9.2V15.4C24.5 20.6 20.9 25.1 16 26.5C11.1 25.1 7.5 20.6 7.5 15.4V9.2L16 5.5Z"
          stroke="#60A5FA"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="15.5" r="3.2" fill="#3B82F6" />
        <path
          d="M16 10.2V12.3M16 18.7V20.8M10.7 15.5H12.8M19.2 15.5H21.3"
          stroke="#93C5FD"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-bold tracking-tight text-slate-100">
            Aiteebar
          </div>
          <div className="truncate text-[11px] font-medium text-slate-400">
            AI Security Scanner
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({
  activeSection,
  onNavigate,
  children,
}: {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  children: React.ReactNode;
}) {
  const { user, demoActive, backendOnline, logout, disableDemoMode, refreshHealth } =
    useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState<RiskFinding[]>([]);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    apiService
      .getRisks({ severity: 'HIGH', review_status: 'open' })
      .then((res) => {
        if (mounted) setAlerts(res.slice(0, 5));
      })
      .catch(() => {
        if (mounted) setAlerts([]);
      });
    return () => {
      mounted = false;
    };
  }, [activeSection, demoActive]);

  const currentNavLabel =
    NAV_ITEMS.find((item) => item.id === activeSection)?.label || 'Overview';

  return (
    <div className="flex min-h-screen bg-[#070B14] text-slate-100">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800/90 bg-[#0B1120] transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-[72px]' : 'w-[252px]'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800/90 px-4">
          <AiteebarLogo collapsed={collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-slate-800/90 p-4 text-xs text-slate-400">
            <div className="font-medium text-slate-300">Endpoint Posture</div>
            <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Redacted evidence transport. Static MCP inspection only.
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-800/90 bg-[#0B1120]/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="font-display font-semibold text-slate-100 truncate">
                {currentNavLabel}
              </span>
              <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden text-xs text-slate-400 tabular-nums sm:inline">
                {clock.toLocaleDateString(undefined, {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                })}{' '}
                ·{' '}
                {clock.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* System Online/Offline Indicator */}
            <button
              type="button"
              onClick={() => refreshHealth()}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                demoActive
                  ? 'border-amber-700/60 bg-amber-950/40 text-amber-300'
                  : backendOnline
                    ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300'
                    : 'border-red-800/60 bg-red-950/30 text-red-300'
              }`}
              title="Click to re-check backend health"
            >
              {backendOnline && !demoActive ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              <span>
                {demoActive
                  ? 'Demo Mode'
                  : backendOnline
                    ? 'System Online'
                    : 'Backend Offline'}
              </span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className="relative rounded-lg border border-slate-800 bg-[#101829] p-2 text-slate-300 transition-colors hover:bg-slate-800"
                aria-label="Open security notifications"
              >
                <Bell className="h-4 w-4" />
                {alerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white tabular-nums">
                    {alerts.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-[#0F172A] p-3 shadow-2xl">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Open High-Severity Alerts
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        onNavigate('risk-assessment');
                      }}
                      className="text-xs font-medium text-blue-400 hover:text-blue-300"
                    >
                      View all
                    </button>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      No open high-severity findings.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            onNavigate('risk-assessment');
                          }}
                          className="block w-full rounded-lg border border-slate-800/70 bg-[#111C33] p-2.5 text-left transition-colors hover:border-slate-700"
                        >
                          <div className="flex items-center justify-between text-[11px] text-red-400 font-semibold">
                            <span>{a.finding_code}</span>
                            <span>{a.device_name}</span>
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-200">
                            {a.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101829] px-2.5 py-1.5 text-left transition-colors hover:bg-slate-800"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600/25 text-xs font-semibold text-blue-300">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="hidden sm:block">
                  <div className="max-w-[130px] truncate text-xs font-medium text-slate-200">
                    {user?.name || 'Administrator'}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-[#0F172A] p-3 shadow-2xl">
                  <div className="border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-blue-400" />
                      <span className="truncate text-xs font-semibold text-slate-100">
                        {user?.name}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-slate-400">
                      {user?.email} · Role: <span className="uppercase">{user?.role}</span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigate('settings');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Administration & Settings
                    </button>
                    {demoActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          disableDemoMode();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-amber-300 hover:bg-slate-800"
                      >
                        <Wifi className="h-3.5 w-3.5" />
                        Exit Demo Mode (Use Live API)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-red-400 hover:bg-slate-800"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Explicit Demo Mode Banner */}
        {demoActive && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-700/40 bg-amber-950/30 px-6 py-2 text-xs text-amber-200">
            <div>
              <span className="font-semibold">Development Demo Mode Active:</span>{' '}
              Displaying isolated offline sample records. Production PostgreSQL records are not mixed with demo data.
            </div>
            <button
              type="button"
              onClick={() => disableDemoMode()}
              className="rounded-md border border-amber-600/60 bg-amber-900/40 px-2.5 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-900/70"
            >
              Disable Demo Mode
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
