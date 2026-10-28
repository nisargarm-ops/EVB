import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.supabase import get_repository
from app.db.memory_repo import InMemoryBatteryRepository

@pytest.fixture(scope="session")
def client():
    # Ensure fresh in-memory repository for test suite
    repo = InMemoryBatteryRepository()
    app.dependency_overrides[get_repository] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def mfg_headers():
    return {"Authorization": "Bearer jwt-manufacturer-test"}

@pytest.fixture
def oem_headers():
    return {"Authorization": "Bearer jwt-oem-test"}

@pytest.fixture
def fleet_headers():
    return {"Authorization": "Bearer jwt-fleet_operator-test"}

@pytest.fixture
def service_headers():
    return {"Authorization": "Bearer jwt-service_center-test"}

@pytest.fixture
def reman_headers():
    return {"Authorization": "Bearer jwt-remanufacturer-test"}

@pytest.fixture
def recycler_headers():
    return {"Authorization": "Bearer jwt-recycler-test"}

@pytest.fixture
def auditor_headers():
    return {"Authorization": "Bearer jwt-auditor-test"}

@pytest.fixture
def admin_headers():
    return {"Authorization": "Bearer jwt-administrator-test"}

@pytest.fixture
def public_headers():
    return {"Authorization": "Bearer jwt-public-test"}
