from datetime import datetime, timezone
import uuid

from sqlalchemy import JSON, Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


JsonType = JSON().with_variant(JSONB(), "postgresql")


class ApplicationRegistry(Base):
    __tablename__ = "application_registry"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    publisher: Mapped[str | None] = mapped_column(String(160), nullable=True)
    process_names: Mapped[list] = mapped_column(JsonType, nullable=False, default=list)
    installation_paths: Mapped[list] = mapped_column(JsonType, nullable=False, default=list)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
