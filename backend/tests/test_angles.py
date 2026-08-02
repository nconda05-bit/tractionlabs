"""Tests for Winning Angle Tracker feature."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
except Exception:
    pass

ADMIN_EMAIL = "nasir@tractionlabs.com"
ADMIN_PASSWORD = "TractionLabs2026!"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def client_id(headers):
    r = requests.get(f"{BASE_URL}/api/clients", headers=headers, timeout=15)
    assert r.status_code == 200
    clients = r.json()
    # Prefer ABC HVAC
    for c in clients:
        if "ABC" in (c.get("business_name") or ""):
            return c["id"]
    return clients[0]["id"]


def test_angles_requires_auth():
    r = requests.post(f"{BASE_URL}/api/angles",
                      json={"client_id": "x", "tactic": "y"}, timeout=10)
    assert r.status_code in (401, 403), r.text


def test_angles_bad_client(headers):
    r = requests.post(f"{BASE_URL}/api/angles", headers=headers,
                      json={"client_id": "not-a-real-id", "tactic": "TEST_tactic"}, timeout=10)
    assert r.status_code == 404


def test_angle_full_crud_and_cycle(headers, client_id):
    # Create
    r = requests.post(f"{BASE_URL}/api/angles", headers=headers,
                      json={"client_id": client_id, "tactic": "TEST_ANGLE_pytest hook"}, timeout=15)
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["status"] == "reused"
    assert a["client_id"] == client_id
    assert a.get("client_name")
    assert "industry" in a
    assert a["tactic"] == "TEST_ANGLE_pytest hook"
    angle_id = a["id"]

    # List
    r = requests.get(f"{BASE_URL}/api/angles?client_id={client_id}",
                     headers=headers, timeout=15)
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert angle_id in ids

    # Update to won
    r = requests.put(f"{BASE_URL}/api/angles/{angle_id}", headers=headers,
                     json={"status": "won"}, timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "won"

    # Invalid status is ignored
    r = requests.put(f"{BASE_URL}/api/angles/{angle_id}", headers=headers,
                    json={"status": "bogus"}, timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "won"  # unchanged

    # Cycle to testing
    r = requests.put(f"{BASE_URL}/api/angles/{angle_id}", headers=headers,
                     json={"status": "testing"}, timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "testing"

    # Delete
    r = requests.delete(f"{BASE_URL}/api/angles/{angle_id}", headers=headers, timeout=10)
    assert r.status_code == 200

    # Verify gone
    r = requests.get(f"{BASE_URL}/api/angles?client_id={client_id}",
                     headers=headers, timeout=15)
    ids = [x["id"] for x in r.json()]
    assert angle_id not in ids


def test_ads_create_with_tracked_angle(headers, client_id):
    """After tracking an angle, /api/ads/create should still return valid campaign JSON."""
    # Track one angle
    r = requests.post(f"{BASE_URL}/api/angles", headers=headers,
                      json={"client_id": client_id, "tactic": "TEST_ANGLE_urgency scarcity"}, timeout=15)
    assert r.status_code == 200
    angle_id = r.json()["id"]

    try:
        r = requests.post(f"{BASE_URL}/api/ads/create", headers=headers,
                          json={"client_id": client_id, "prompt": "TEST run - short campaign"}, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        # Response shape: campaign JSON with variants or similar keys
        assert isinstance(data, dict)
        # Ensure not an error payload
        assert not data.get("error"), data
        # Look for typical campaign keys
        text = str(data).lower()
        assert any(k in text for k in ["hook", "headline", "variant", "angle", "cta", "copy"])
    finally:
        requests.delete(f"{BASE_URL}/api/angles/{angle_id}", headers=headers, timeout=10)
