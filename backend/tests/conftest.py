import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.supabase import get_repository
from app.db.memory_repo import InMemoryBatteryRepository
from app.core.security import create_access_token

@pytest.fixture(scope="session")
def client():
    # Ensure fresh in-memory repository for test suite
    repo = InMemoryBatteryRepository()
    app.dependency_overrides[get_repository] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def _make_headers(role: str, org_name: str, org_id: str):
    token = create_access_token({
        "sub": f"usr-{role}",
        "role": role,
        "organization": org_name,
        "organization_id": org_id,
        "email": f"{role}@batterypass360.eu"
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def mfg_headers():
    return _make_headers("manufacturer", "QuantumVolt Gigafactory", "11111111-1111-1111-1111-111111111111")

@pytest.fixture
def oem_headers():
    return _make_headers("oem", "Apex Motors AG", "22222222-2222-2222-2222-222222222222")

@pytest.fixture
def fleet_headers():
    return _make_headers("fleet_operator", "Apex EV Mobility Fleet", "33333333-3333-3333-3333-333333333333")

@pytest.fixture
def service_headers():
    return _make_headers("service_center", "Berlin Battery Care", "44444444-4444-4444-4444-444444444444")

@pytest.fixture
def reman_headers():
    return _make_headers("remanufacturer", "Nordic Remanufacturing Hub", "55555555-5555-5555-5555-555555555555")

@pytest.fixture
def recycler_headers():
    return _make_headers("recycler", "EcoRecycle Metals Recovery", "66666666-6666-6666-6666-666666666666")

@pytest.fixture
def auditor_headers():
    return _make_headers("auditor", "EU Metrology Authority", "77777777-7777-7777-7777-777777777777")

@pytest.fixture
def admin_headers():
    return _make_headers("administrator", "BatteryPass 360 Governance", "00000000-0000-0000-0000-000000000000")

@pytest.fixture
def public_headers():
    return _make_headers("public", "Anonymous Citizen", "public-org")
