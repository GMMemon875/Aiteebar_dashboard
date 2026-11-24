import re
from typing import Any

SENSITIVE_KEY_PATTERN = re.compile(
    r"(token|secret|password|passwd|api[_-]?key|credential|auth|bearer|clipboard|content|private[_-]?key)",
    re.IGNORECASE,
)

SECRET_VALUE_PATTERNS = [
    re.compile(r"(sk-[A-Za-z0-9_-]{12,})"),
    re.compile(r"(ghp_[A-Za-z0-9]{12,})"),
    re.compile(r"(AIza[0-9A-Za-z_-]{20,})"),
    re.compile(r"(postgres(?:ql)?://[^:\s]+:)([^@\s]+)(@)", re.IGNORECASE),
    re.compile(r"(--?(?:token|api-key|password|secret)\s*[= ]\s*)(\S+)", re.IGNORECASE),
]


def redact_string(value: str) -> str:
    result = value
    for pattern in SECRET_VALUE_PATTERNS:
        if pattern.groups == 3:
            result = pattern.sub(r"\1[REDACTED]\3", result)
        elif pattern.groups == 2:
            result = pattern.sub(r"\1[REDACTED]", result)
        else:
            result = pattern.sub("[REDACTED]", result)
    return result


def redact_arguments(args: list[str]) -> list[str]:
    return [redact_string(str(a)) for a in args]


def sanitize_report_payload(obj: Any) -> Any:
    """Defense-in-depth sanitizer ensuring sensitive keys/values are masked in preserved JSON."""
    if isinstance(obj, dict):
        sanitized: dict[str, Any] = {}
        for k, v in obj.items():
            key_str = str(k)
            if SENSITIVE_KEY_PATTERN.search(key_str) and not key_str.endswith("_count"):
                sanitized[key_str] = "[REDACTED]"
            else:
                sanitized[key_str] = sanitize_report_payload(v)
        return sanitized
    if isinstance(obj, list):
        return [sanitize_report_payload(item) for item in obj]
    if isinstance(obj, str):
        return redact_string(obj)
    return obj
