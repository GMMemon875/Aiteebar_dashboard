from sqlalchemy.orm import Session

from app.models.user import AuditLog


def record_audit_log(
    db: Session,
    *,
    actor_user_id: str | None,
    actor_email: str,
    action: str,
    target_type: str,
    target_id: str | None,
    details: str,
) -> AuditLog:
    entry = AuditLog(
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)
    return entry
