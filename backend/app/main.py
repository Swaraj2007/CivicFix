import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .database import engine, Base
from . import models          # noqa: F401  — registers models with Base
from .api import complaints, duplicates, dashboard, auth
from .migrations import run_safe_migrations
from .models.user import User
from .api.auth import get_password_hash
from sqlalchemy.orm import Session

app = FastAPI(title="CivicFix API", version="2.0.0")

# ---------------------------------------------------------------------------
# CORS — allow Vite dev server and any configured origins
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Production origin can be added via CORS_ORIGIN env var
    *([o] if (o := os.environ.get("CORS_ORIGIN", "")) else []),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup — create tables & ensure upload dir exists
# ---------------------------------------------------------------------------
def _init_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@civicfix.local")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    from .database import engine
    from sqlalchemy import select
    with Session(engine) as session:
        existing = session.scalar(select(User).where(User.email == admin_email))
        if not existing:
            user = User(
                full_name="System Admin",
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                role="ADMIN"
            )
            session.add(user)
            session.commit()

@app.on_event("startup")
def on_startup():
    """Create tables and safely add new columns on startup."""
    Base.metadata.create_all(bind=engine)
    run_safe_migrations()
    _init_admin()

    upload_dir = Path(os.environ.get("UPLOAD_DIR", "/data/uploads"))
    upload_dir.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {"ok": True, "database": db_status, "version": "2.0.0"}


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(duplicates.router)
app.include_router(dashboard.router)
