import os
from dotenv import load_dotenv

from app.database import SessionLocal
from app.models.registry import ApplicationRegistry
from app.models.user import User
from app.security.password import hash_password

load_dotenv()


DEFAULT_APPS = [
    {
        "name": "Cursor",
        "publisher": "Anysphere Inc.",
        "process_names": ["Cursor.exe"],
        "installation_paths": ["%LOCALAPPDATA%\\Programs\\cursor\\Cursor.exe"],
    },
    {
        "name": "Claude Desktop",
        "publisher": "Anthropic PBC",
        "process_names": ["Claude.exe"],
        "installation_paths": ["%LOCALAPPDATA%\\AnthropicClaude\\Claude.exe"],
    },
    {
        "name": "Visual Studio Code",
        "publisher": "Microsoft Corporation",
        "process_names": ["Code.exe"],
        "installation_paths": ["%PROGRAMFILES%\\Microsoft VS Code\\Code.exe"],
    },
    {
        "name": "Ollama",
        "publisher": "Ollama Inc.",
        "process_names": ["ollama.exe", "ollama app.exe"],
        "installation_paths": ["%LOCALAPPDATA%\\Programs\\Ollama\\ollama.exe"],
    },
]


def seed_initial_data() -> None:
    admin_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "").strip()
    admin_name = os.getenv("BOOTSTRAP_ADMIN_NAME", "Security Administrator").strip()

    db = SessionLocal()
    try:
        if admin_email and admin_password:
            existing_user = db.query(User).filter(User.email == admin_email).first()
            if not existing_user:
                db.add(
                    User(
                        name=admin_name,
                        email=admin_email,
                        password_hash=hash_password(admin_password),
                        role="admin",
                        is_active=True,
                    )
                )

        for app_def in DEFAULT_APPS:
            exists = (
                db.query(ApplicationRegistry)
                .filter(ApplicationRegistry.name == app_def["name"])
                .first()
            )
            if not exists:
                db.add(ApplicationRegistry(**app_def, is_enabled=True))

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_initial_data()
