import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.core.rbac import UserRole

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def manufacturer_token():
    return create_access_token({"sub": "USR-MFG-01", "role": UserRole.MANUFACTURER.value, "org": "QuantumVolt Gigafactory"})

@pytest.fixture
def oem_token():
    return create_access_token({"sub": "USR-OEM-01", "role": UserRole.OEM.value, "org": "Apex Motors AG"})

@pytest.fixture
def fleet_token():
    return create_access_token({"sub": "USR-FLEET-01", "role": UserRole.FLEET_OPERATOR.value, "org": "Apex EV Mobility Fleet"})

@pytest.fixture
def recycler_token():
    return create_access_token({"sub": "USR-REC-01", "role": UserRole.RECYCLER.value, "org": "EcoRecycle Metals Recovery"})

@pytest.fixture
def auditor_token():
    return create_access_token({"sub": "USR-AUD-01", "role": UserRole.REGULATOR_AUDITOR.value, "org": "EU Metrology Authority"})
