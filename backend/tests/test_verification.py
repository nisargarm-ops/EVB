import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_public_verification_no_auth(client: AsyncClient):
    res = await client.get("/api/v1/verify/BAT-NMC-8A2F91C0")
    assert res.status_code == 200
    data = res.json()
    assert data["is_authentic"] is True
    assert data["is_audit_chain_valid"] is True
    assert data["chemistry"] == "NMC 811"
    assert data["manufacturer_name"] == "QuantumVolt Gigafactory"

@pytest.mark.asyncio
async def test_generate_qr_code_image(client: AsyncClient):
    res = await client.get("/api/v1/verify/BAT-NMC-8A2F91C0/qr")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    # PNG signature check: PNG
    assert res.content[:4] == b"\x89PNG"
