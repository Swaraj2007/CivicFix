import os
from sqlalchemy import create_engine, text

engine = create_engine("postgresql+psycopg://civicfix:civicfix@localhost:5432/civicfix")
with engine.connect() as conn:
    total = conn.execute(text("SELECT COUNT(*) FROM complaints")).scalar()
    valid_coords = conn.execute(text("SELECT COUNT(*) FROM complaints WHERE latitude IS NOT NULL AND longitude IS NOT NULL")).scalar()
    print(f"Total complaints in DB: {total}")
    print(f"Complaints with valid coordinates: {valid_coords}")
