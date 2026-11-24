from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthTokensResponse,
    LoginRequest,
    RefreshRequest,
    UserCreateRequest,
    UserOut,
    UserPatchRequest,
)
from app.security.dependencies import get_current_user, require_admin
from app.security.jwt import create_access_token, create_refresh_token, decode_token
from app.security.password import hash_password, verify_password
from app.security.rate_limit import limit_by_ip
from app.services.audit_service import record_audit_log

router = APIRouter()
settings = get_settings()


@router.post(
    "/auth/login",
    response_model=AuthTokensResponse,
    dependencies=[Depends(limit_by_ip("login", settings.rate_limit_login_per_minute))],
)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthTokensResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled.",
        )
    return AuthTokensResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/auth/refresh", response_model=AuthTokensResponse)
def refresh_auth(payload: RefreshRequest, db: Session = Depends(get_db)) -> AuthTokensResponse:
    try:
        decoded = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    user = db.query(User).filter(User.id == decoded["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive or not found.",
        )
    return AuthTokensResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.get("/users", response_model=list[UserOut])
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [UserOut.model_validate(u) for u in users]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    email_norm = payload.email.lower()
    if db.query(User).filter(User.email == email_norm).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )
    user = User(
        name=payload.name,
        email=email_norm,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    record_audit_log(
        db,
        actor_user_id=admin.id,
        actor_email=admin.email,
        action="USER_CREATED",
        target_type="user",
        target_id=user.id,
        details=f"Provisioned {user.email} with role={user.role}",
    )
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserPatchRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role
    record_audit_log(
        db,
        actor_user_id=admin.id,
        actor_email=admin.email,
        action="USER_UPDATED",
        target_type="user",
        target_id=user.id,
        details=f"Updated user is_active={user.is_active} role={user.role}",
    )
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
