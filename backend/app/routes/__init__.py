from fastapi import APIRouter

from app.routes import (
    activity,
    applications,
    auth,
    dashboard,
    devices,
    mcp,
    registry,
    risks,
    scans,
    system,
)

api_router = APIRouter()
api_router.include_router(auth.router, tags=["Authentication & Users"])
api_router.include_router(devices.router, tags=["Devices"])
api_router.include_router(scans.router, tags=["Scans"])
api_router.include_router(dashboard.router, tags=["Dashboard"])
api_router.include_router(applications.router, tags=["AI Applications"])
api_router.include_router(mcp.router, tags=["MCP Inspection"])
api_router.include_router(risks.router, tags=["Risk Findings"])
api_router.include_router(activity.router, tags=["Activity Monitoring"])
api_router.include_router(registry.router, tags=["Application Registry"])
api_router.include_router(system.router, tags=["System"])
