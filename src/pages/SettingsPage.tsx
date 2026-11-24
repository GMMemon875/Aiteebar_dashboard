import React, { useCallback, useEffect, useState } from 'react';
import {
  Database,
  Plus,
  Server,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { apiService, API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type {
  AuditLogEntry,
  RegistryApplication,
  SystemHealth,
  User,
  UserRole,
} from '../types/api';
import {
  EmptyState,
  ErrorBanner,
  formatUtcDate,
  LoadingTableSkeleton,
  StatusLabel,
} from '../components/StateViews';

type SettingsTab = 'registry' | 'users' | 'system';

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<SettingsTab>('registry');
  const [registry, setRegistry] = useState<RegistryApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Registry Form
  const [newAppName, setNewAppName] = useState('');
  const [newAppPublisher, setNewAppPublisher] = useState('');
  const [newAppProcs, setNewAppProcs] = useState('');
  const [newAppPaths, setNewAppPaths] = useState('');

  // Add User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('analyst');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reg, h] = await Promise.all([
        apiService.getRegistryApplications(),
        apiService.checkHealth(),
      ]);
      setRegistry(reg);
      setHealth(h);

      if (isAdmin) {
        const [uList, logs] = await Promise.all([
          apiService.getUsers(),
          apiService.getAuditLogs(),
        ]);
        setUsers(uList);
        setAuditLogs(logs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load administration settings.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddRegistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await apiService.createRegistryApplication({
        name: newAppName.trim(),
        publisher: newAppPublisher.trim(),
        process_names: newAppProcs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        installation_paths: newAppPaths
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        is_enabled: true,
      });
      setNewAppName('');
      setNewAppPublisher('');
      setNewAppProcs('');
      setNewAppPaths('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create registry entry.');
    }
  };

  const handleToggleRegistry = async (entry: RegistryApplication) => {
    if (!isAdmin) return;
    try {
      await apiService.updateRegistryApplication(entry.id, {
        is_enabled: !entry.is_enabled,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update registry entry.');
    }
  };

  const handleDeleteRegistry = async (id: string) => {
    if (!isAdmin) return;
    try {
      await apiService.deleteRegistryApplication(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove registry entry.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await apiService.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    }
  };

  const handleToggleUser = async (u: User) => {
    if (!isAdmin) return;
    try {
      await apiService.toggleUserActive(u.id, !u.is_active);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
          Settings &amp; Administration
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage the known AI application registry, dashboard users, and backend infrastructure status
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-[#0D1526] p-1.5">
        <button
          type="button"
          onClick={() => setTab('registry')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
            tab === 'registry'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Application Registry
        </button>
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
            tab === 'users'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          User Management
        </button>
        <button
          type="button"
          onClick={() => setTab('system')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
            tab === 'system'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="h-3.5 w-3.5" />
          System Settings &amp; Audit Log
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {tab === 'registry' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5 lg:col-span-8">
            <h2 className="mb-4 font-display text-base font-semibold text-slate-100">
              Known AI Application Registry
            </h2>
            {loading ? (
              <LoadingTableSkeleton rows={4} />
            ) : registry.length === 0 ? (
              <EmptyState
                title="Registry is empty"
                description="Add known AI tools such as Cursor, Claude Desktop, or Ollama."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2.5 font-medium">Application</th>
                      <th className="pb-2.5 font-medium">Process Names</th>
                      <th className="pb-2.5 font-medium">Installation Paths</th>
                      <th className="pb-2.5 font-medium">State</th>
                      {isAdmin && <th className="pb-2.5 text-right font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {registry.map((r) => (
                      <tr key={r.id} className="align-top hover:bg-slate-800/30">
                        <td className="py-3">
                          <div className="font-semibold text-slate-100">{r.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {r.publisher || '—'}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-300">
                          {r.process_names.join(', ')}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-400">
                          {r.installation_paths.join(', ')}
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleToggleRegistry(r)}
                            className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                              r.is_enabled
                                ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300'
                                : 'border-slate-700 bg-slate-800/60 text-slate-400'
                            }`}
                          >
                            {r.is_enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                        {isAdmin && (
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRegistry(r.id)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-950/40 hover:text-red-400"
                              title="Remove registry entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5 lg:col-span-4">
            <h2 className="mb-4 font-display text-base font-semibold text-slate-100">
              Add Registry Entry
            </h2>
            {!isAdmin ? (
              <p className="text-xs text-slate-400">
                Only administrators can add or modify registry entries.
              </p>
            ) : (
              <form onSubmit={handleAddRegistry} className="space-y-3 text-xs">
                <div>
                  <label className="mb-1 block text-slate-300">Application Name</label>
                  <input
                    required
                    type="text"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    placeholder="e.g., Windsurf"
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-300">Publisher</label>
                  <input
                    type="text"
                    value={newAppPublisher}
                    onChange={(e) => setNewAppPublisher(e.target.value)}
                    placeholder="e.g., Codeium"
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-300">
                    Process Names (comma-separated)
                  </label>
                  <input
                    required
                    type="text"
                    value={newAppProcs}
                    onChange={(e) => setNewAppProcs(e.target.value)}
                    placeholder="Windsurf.exe"
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-300">
                    Installation Paths (comma-separated)
                  </label>
                  <input
                    required
                    type="text"
                    value={newAppPaths}
                    onChange={(e) => setNewAppPaths(e.target.value)}
                    placeholder="%LOCALAPPDATA%\\Programs\\Windsurf\\Windsurf.exe"
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 font-mono text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Add to Registry
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5 lg:col-span-8">
            <h2 className="mb-4 font-display text-base font-semibold text-slate-100">
              Authorized Dashboard Users
            </h2>
            {!isAdmin ? (
              <p className="text-xs text-slate-400">
                Administrator role required to view and manage dashboard accounts.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2.5 font-medium">Name</th>
                      <th className="pb-2.5 font-medium">Email</th>
                      <th className="pb-2.5 font-medium">Role</th>
                      <th className="pb-2.5 font-medium">Status</th>
                      <th className="pb-2.5 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 font-medium text-slate-100">{u.name}</td>
                        <td className="py-3 font-mono text-[11px] text-slate-300">
                          {u.email}
                        </td>
                        <td className="py-3 uppercase text-slate-300">{u.role}</td>
                        <td className="py-3">
                          <StatusLabel status={u.is_active ? 'online' : 'offline'} />
                        </td>
                        <td className="py-3 text-right">
                          {u.id !== user?.id && (
                            <button
                              type="button"
                              onClick={() => handleToggleUser(u)}
                              className="rounded border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                            >
                              {u.is_active ? 'Disable' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {isAdmin && (
            <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5 lg:col-span-4">
              <h2 className="mb-4 font-display text-base font-semibold text-slate-100">
                Provision User Account
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                <div>
                  <label className="mb-1 block text-slate-300">Full Name</label>
                  <input
                    required
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-300">Work Email</label>
                  <input
                    required
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-300">Initial Password</label>
                  <input
                    required
                    minLength={10}
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 10 characters"
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-300">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-slate-800 bg-[#080E1C] px-3 py-2 text-slate-100"
                  >
                    <option value="analyst">Security Analyst</option>
                    <option value="viewer">Read-Only Auditor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
                >
                  <UserPlus className="h-4 w-4" />
                  Create Dashboard User
                </button>
              </form>
            </section>
          )}
        </div>
      )}

      {tab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>FastAPI Endpoint</span>
                <Server className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-2 font-mono text-[11px] text-slate-200 break-all">
                {API_BASE_URL}
              </div>
              <div className="mt-2">
                <StatusLabel status={health?.status || 'offline'} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>PostgreSQL Database</span>
                <Database className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {health?.database === 'connected' ? 'Connected' : 'Disconnected'}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                SQLAlchemy ORM + Alembic migrations
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0D1526] p-5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Scanner Baseline</span>
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 font-mono text-sm font-semibold text-slate-100">
                v{health?.recommended_scanner_version || '1.4.2'}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 tabular-nums">
                Checked {formatUtcDate(health?.timestamp_utc)}
              </div>
            </div>
          </div>

          {isAdmin && (
            <section className="rounded-xl border border-slate-800 bg-[#0D1526] p-5">
              <h2 className="mb-4 font-display text-base font-semibold text-slate-100">
                Administrative Audit Log
              </h2>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400">No administrative actions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2.5 font-medium">Timestamp</th>
                        <th className="pb-2.5 font-medium">Actor</th>
                        <th className="pb-2.5 font-medium">Action</th>
                        <th className="pb-2.5 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-2.5 text-slate-400 tabular-nums">
                            {formatUtcDate(log.created_at)}
                          </td>
                          <td className="py-2.5 font-mono text-[11px] text-slate-200">
                            {log.actor_email}
                          </td>
                          <td className="py-2.5 font-mono text-[11px] text-blue-400">
                            {log.action}
                          </td>
                          <td className="py-2.5 text-slate-300">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
