# Aiteebar AI Security Scanner — FastAPI Backend

Modular FastAPI + SQLAlchemy 2.0 + PostgreSQL backend for endpoint device enrollment, idempotent scan report ingestion, AI application discovery, static MCP configuration inspection, risk findings review, and redacted activity monitoring.

## Prerequisites (Windows / Linux)
- Python 3.11+
- PostgreSQL 15+

## 1. PostgreSQL Setup
```sql
CREATE USER aiteebar_user WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
CREATE DATABASE aiteebar_db OWNER aiteebar_user;
```

## 2. Environment Configuration
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```
Edit `.env` with your PostgreSQL credentials, a strong `JWT_SECRET_KEY`, and your `BOOTSTRAP_ADMIN_*` credentials.

## 3. Run Database Migrations & Seed Initial Data
```powershell
alembic upgrade head
python -m app.seed
```

## 4. Start the API Server
Development:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Swagger UI (development only): `http://localhost:8000/docs`

Production (behind HTTPS reverse proxy such as Caddy/Nginx):
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
```

## 5. Run Backend Tests
```powershell
pytest -v
```
