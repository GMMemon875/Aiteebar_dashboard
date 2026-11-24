# Aiteebar AI Security Scanner

Enterprise cybersecurity platform monitoring AI application usage, static MCP server configurations, security risk findings, and privacy-preserving redacted endpoint activity across company Windows laptops.

## Project Structure

- `src/` — React + TypeScript + Tailwind CSS + Recharts + Lucide dashboard (`VITE_API_BASE_URL` API integration, in-memory JWT auth, isolated Development Demo Mode).
- `backend/` — FastAPI + SQLAlchemy 2.0 + PostgreSQL + Alembic migrations + Pytest suite.
- `scanner_integration/` — Non-intrusive integration layer (`uploader.py`, `report_adapter.py`) connecting the existing Windows Python scanner (`aiteebar_mini_scanner.py`) to `POST /api/v1/scans`.

## Windows Development Setup

### 1. Backend & PostgreSQL
See `backend/README.md` for full PostgreSQL setup, Alembic migrations (`alembic upgrade head`), initial admin seeding (`python -m app.seed`), and FastAPI server startup on port `8000`.

### 2. Frontend Dashboard
```powershell
npm install
copy .env.example .env
# Ensure VITE_API_BASE_URL="http://localhost:8000/api/v1"
npm run dev
```
The dashboard runs on `http://localhost:3000`.

> Note: If you preview the frontend without running the local FastAPI + PostgreSQL backend, the login screen clearly reports the backend connection error and offers an isolated **Development Demo Mode** toggle so demo records are never mixed with production data.

### 3. Existing Windows Scanner Integration
Keep your existing scanner (`aiteebar_mini_scanner.py`, `discovery.py`, `mcp_inspector.py`, `risk_engine.py`, `activity_monitor.py`, `ai_app_registry.json`) intact. After generating `scan_report.json`:

1. **Issue a one-time enrollment token** in the Dashboard (`Devices -> Enroll New Device`).
2. **Enroll the laptop once** (stores hashed device token on backend, local restricted credentials file on laptop):
   ```powershell
   python -m scanner_integration.uploader --api-url https://security.company.com/api/v1 --enroll AITE-ENR-XXXX
   ```
   *(For local HTTP development only, add `--allow-http-localhost --api-url http://localhost:8000/api/v1`)*
3. **Upload `scan_report.json`** (uses `scan_id` idempotency, retries safely, and queues offline in `pending_queue/` if network is down):
   ```powershell
   python -m scanner_integration.uploader --api-url https://security.company.com/api/v1 --report scan_report.json
   ```

## Security & Privacy Architecture

- **Dashboard Auth**: Short-lived JWT access tokens held strictly in React memory (never `localStorage`), bcrypt password hashing, RBAC (`admin`, `analyst`, `viewer`), and administrative audit logs.
- **Device Auth**: One-time 15-minute enrollment tokens exchanged for per-device tokens stored as SHA-256 hashes; revocable from the dashboard.
- **Redacted Evidence**: Sensitive MCP CLI arguments, environment tokens, and raw clipboard/document contents are never collected or displayed.
- **CORS & Rate Limiting**: Explicit `CORS_ALLOWED_ORIGINS` allowlist and sliding-window rate limits on `/auth/login`, `/devices/enroll`, and `/scans`.

## Production Deployment & Backup Guidance

- **HTTPS Termination**: Serve both the built frontend (`npm run build` -> `dist/`) and FastAPI (`uvicorn app.main:app --host 127.0.0.1 --port 8000`) behind Caddy or Nginx with TLS 1.2+/1.3 certificates. Set `APP_ENV=production` in `backend/.env` (disables `/docs`) and `VITE_API_BASE_URL=https://security.company.com/api/v1`.
- **PostgreSQL Backups**: Schedule daily encrypted `pg_dump -Fc aiteebar_db > aiteebar_backup_$(date +%F).dump` snapshots to off-host storage and periodically verify `pg_restore` into a staging database.
