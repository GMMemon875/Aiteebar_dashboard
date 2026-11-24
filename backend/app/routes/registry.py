from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.registry import ApplicationRegistry
from app.models.user import User
from app.schemas.registry import (
    RegistryApplicationCreate,
    RegistryApplicationOut,
    RegistryApplicationUpdate,
)
from app.security.dependencies import get_current_user, require_admin
from app.services.audit_service import record_audit_log

router = APIRouter()


@router.get("/registry/applications", response_model=list[RegistryApplicationOut])
def list_registry_applications(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RegistryApplicationOut]:
    rows = db.query(ApplicationRegistry).order_by(ApplicationRegistry.name.asc()).all()
    return [RegistryApplicationOut.model_validate(r) for r in rows]


@router.post(
    "/registry/applications",
    response_model=RegistryApplicationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_registry_application(
    payload: RegistryApplicationCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> RegistryApplicationOut:
    existing = (
        db.query(ApplicationRegistry)
        .filter(ApplicationRegistry.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An application with this name is already in the registry.",
        )

    item = ApplicationRegistry(
        name=payload.name,
        publisher=payload.publisher,
        process_names=payload.process_names,
        installation_paths=payload.installation_paths,
        is_enabled=payload.is_enabled,
    )
    db.add(item)
    db.flush()
    record_audit_log(
        db,
        actor_user_id=admin.id,
        actor_email=admin.email,
        action="REGISTRY_APP_CREATED",
        target_type="application_registry",
        target_id=item.id,
        details=f"Added {item.name} to known application registry",
    )
    db.commit()
    db.refresh(item)
    return RegistryApplicationOut.model_validate(item)


@router.put("/registry/applications/{application_id}", response_model=RegistryApplicationOut)
def update_registry_application(
    application_id: str,
    payload: RegistryApplicationUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> RegistryApplicationOut:
    item = (
        db.query(ApplicationRegistry)
        .filter(ApplicationRegistry.id == application_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Registry entry not found."
        )
    if payload.name is not None:
        item.name = payload.name
    if payload.publisher is not None:
        item.publisher = payload.publisher
    if payload.process_names is not None:
        item.process_names = payload.process_names
    if payload.installation_paths is not None:
        item.installation_paths = payload.installation_paths
    if payload.is_enabled is not None:
        item.is_enabled = payload.is_enabled

    record_audit_log(
        db,
        actor_user_id=admin.id,
        actor_email=admin.email,
        action="REGISTRY_APP_UPDATED",
        target_type="application_registry",
        target_id=item.id,
        details=f"Updated registry entry {item.name} (enabled={item.is_enabled})",
    )
    db.commit()
    db.refresh(item)
    return RegistryApplicationOut.model_validate(item)


@router.delete(
    "/registry/applications/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_registry_application(
    application_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = (
        db.query(ApplicationRegistry)
        .filter(ApplicationRegistry.id == application_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Registry entry not found."
        )
    name = item.name
    db.delete(item)
    record_audit_log(
        db,
        actor_user_id=admin.id,
        actor_email=admin.email,
        action="REGISTRY_APP_DELETED",
        target_type="application_registry",
        target_id=application_id,
        details=f"Removed {name} from application registry",
    )
    db.commit()
