"""
migrations.py
=============
Lightweight "run-once" column-addition migrations.
Called from main.py startup. Safe to run multiple times — uses IF NOT EXISTS.

This avoids requiring Alembic for the simple column additions needed by v2.
"""
import logging
from sqlalchemy import text
from .database import engine

log = logging.getLogger(__name__)

# Each entry: (table, column, SQL type definition)
# All columns are nullable so existing rows are not broken.
SAFE_ADD_COLUMNS = [
    ("complaints", "citizen_name",  "VARCHAR(200)"),
    ("complaints", "image_url",     "VARCHAR(500)"),
    ("complaints", "department",    "VARCHAR(100)"),
    ("complaints", "resolved_at",   "TIMESTAMP"),
    ("complaints", "user_id",       "INTEGER"),
]


def run_safe_migrations() -> None:
    """
    Add missing columns to existing tables without dropping any data.
    Each ALTER TABLE … ADD COLUMN IF NOT EXISTS is idempotent.
    """
    with engine.begin() as conn:
        for table, column, coltype in SAFE_ADD_COLUMNS:
            try:
                conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {coltype}"
                ))
                log.info(f"[migration] ensured column {table}.{column}")
            except Exception as exc:
                # Non-fatal: log and continue (e.g. if column already exists on
                # older PG versions that don't support IF NOT EXISTS)
                log.warning(f"[migration] could not add {table}.{column}: {exc}")
