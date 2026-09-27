import os
import sys

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import get_db

engine = create_engine("postgresql+psycopg://civicfix:civicfix@localhost:5432/civicfix")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# We need an admin user or bypass auth. Let's just bypass the auth dependency.
from app.api.auth import require_role

def override_require_role(role: str):
    def dependency():
        class MockUser:
            id = 1
            role = "ADMIN"
        return MockUser()
    return dependency

app.dependency_overrides[require_role] = override_require_role

client = TestClient(app)

response = client.get("/api/complaints/map/all")
print(response.status_code)
if response.status_code == 200:
    data = response.json()
    print(f"Count: {len(data)}")
    for d in data[:3]:
        print(d)
else:
    print(response.text)
