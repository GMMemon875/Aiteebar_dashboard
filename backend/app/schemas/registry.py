from datetime import datetime
from pydantic import BaseModel, Field


class RegistryApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    publisher: str | None = Field(default=None, max_length=160)
    process_names: list[str] = Field(min_length=1)
    installation_paths: list[str] = Field(default_factory=list)
    is_enabled: bool = True


class RegistryApplicationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    publisher: str | None = Field(default=None, max_length=160)
    process_names: list[str] | None = None
    installation_paths: list[str] | None = None
    is_enabled: bool | None = None


class RegistryApplicationOut(BaseModel):
    id: str
    name: str
    publisher: str | None
    process_names: list[str]
    installation_paths: list[str]
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
