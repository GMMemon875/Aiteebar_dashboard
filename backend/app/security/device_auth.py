import hashlib
import secrets


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_enrollment_token() -> str:
    return f"AITE-ENR-{secrets.token_urlsafe(24)}"


def generate_device_token() -> str:
    return f"aite_dev_{secrets.token_urlsafe(40)}"
