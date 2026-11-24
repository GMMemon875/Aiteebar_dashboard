import React, { useState } from 'react';
import { Lock, Mail, RefreshCw, Shield, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, ApiHttpError, BackendUnavailableError } from '../services/api';

export function LoginPage() {
  const {
    login,
    backendOnline,
    connectionError,
    refreshHealth,
    enableDemoMode,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof BackendUnavailableError) {
        setError(err.message);
      } else if (err instanceof ApiHttpError) {
        setError(err.detail);
      } else {
        setError('Authentication failed. Check your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070B14] px-4 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0D1426] p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/40 bg-blue-600/15">
            <Shield className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-100">
              Aiteebar AI Security Scanner
            </h1>
            <p className="text-xs text-slate-400">
              Enterprise Endpoint &amp; MCP Security Console
            </p>
          </div>
        </div>

        {/* Backend API Connection Status */}
        <div
          className={`mb-6 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs ${
            backendOnline
              ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300'
              : 'border-red-900/60 bg-red-950/30 text-red-200'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {backendOnline ? (
              <Wifi className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <div className="min-w-0">
              <div className="font-medium">
                {backendOnline ? 'FastAPI Backend Connected' : 'Backend Unavailable'}
              </div>
              <div className="truncate font-mono text-[11px] opacity-80">
                {API_BASE_URL}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refreshHealth()}
            className="shrink-0 rounded-lg border border-slate-700/70 bg-slate-900/60 p-1.5 text-slate-300 hover:bg-slate-800"
            title="Re-check API connection"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {connectionError && !backendOnline && (
          <div className="mb-5 rounded-xl border border-slate-800 bg-[#090F1E] p-3.5 text-xs text-slate-300">
            <p className="font-medium text-slate-200">
              Local FastAPI + PostgreSQL server is not reachable.
            </p>
            <p className="mt-1 leading-relaxed text-slate-400">
              Start the backend via{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-blue-300">
                uvicorn app.main:app --reload
              </code>{' '}
              or explore the full interface using isolated Development Demo Mode below.
            </p>
            <button
              type="button"
              onClick={() => enableDemoMode()}
              className="mt-3 w-full rounded-lg border border-amber-700/60 bg-amber-950/40 px-4 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-900/50"
            >
              Launch Development Demo Mode (Isolated Sample Data)
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Work Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full rounded-lg border border-slate-800 bg-[#080E1C] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-slate-800 bg-[#080E1C] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign In to Console'}
          </button>
        </form>
      </div>
    </div>
  );
}
