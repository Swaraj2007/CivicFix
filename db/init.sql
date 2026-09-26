-- init.sql  — runs on first-boot only (docker-entrypoint-initdb.d/)
-- Enables required Postgres extensions.
-- SQLAlchemy handles all table creation via Base.metadata.create_all().

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
