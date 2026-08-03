"""Tests for Batch Spy (multi-competitor beat-them-all) feature."""
import os
import pytest
import requests

BASE_URL = ""
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
except Exception:
    pass
assert BASE_URL, "REACT_APP_BACKEND_URL not found"

ADMIN_EMAIL = "nasir@tractionlabs.com"
ADMIN_PASSWORD = "TractionLabs2026!"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def client_id(headers):
    r = requests.get(f"{BASE_URL}/api/clients", headers=headers, timeout=15)
    assert r.status_code == 200
    clients = r.json()
    for c in clients:
        if "ABC" in (c.get("business_name") or ""):
            return c["id"]
    assert clients, "No clients"
    return clients[0]["id"]


def test_batch_spy_requires_auth():
    r = requests.post(f"{BASE_URL}/api/ads/batch-spy",
                      json={"client_id": "x", "competitors": []}, timeout=10)
    assert r.status_code in (401, 403)


def test_batch_spy_bad_client(headers):
    r = requests.post(f"{BASE_URL}/api/ads/batch-spy", headers=headers,
                      json={"client_id": "nonexistent-id", "competitors": [
                          {"name": "A", "text": "a"}, {"name": "B", "text": "b"}]}, timeout=15)
    assert r.status_code == 404


def test_batch_spy_min_competitors(headers, client_id):
    r = requests.post(f"{BASE_URL}/api/ads/batch-spy", headers=headers,
                      json={"client_id": client_id, "competitors": [{"name": "A", "text": "only one"}]},
                      timeout=15)
    assert r.status_code == 400


def test_batch_spy_full_flow(headers, client_id):
    payload = {
        "client_id": client_id,
        "notes": "TEST_BATCH_SPY win on trust not price",
        "competitors": [
            {"name": "CoolCo", "text": "$59 AC tune-up. Same-day service. Call now for cool comfort this summer!"},
            {"name": "HVAC Pros", "text": "24/7 emergency repair. Financing available. Licensed and insured technicians."},
            {"name": "Air Masters", "text": "Free estimate on new AC install. 10-year warranty. Google 5-star rated."},
        ],
    }
    r = requests.post(f"{BASE_URL}/api/ads/batch-spy", headers=headers, json=payload, timeout=120)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["client_id"] == client_id
    assert doc["competitor_count"] == 3
    assert "id" in doc and "_id" not in doc
    d = doc["data"]
    assert isinstance(d.get("ranking"), list) and len(d["ranking"]) >= 2
    assert isinstance(d.get("market_gaps"), list)
    assert isinstance(d.get("beat_them_all"), list)
    assert isinstance(d.get("winning_strategy"), dict)
    brief = d.get("campaign_brief") or {}
    assert isinstance(brief.get("ads"), list) and len(brief["ads"]) == 3
    for ad in brief["ads"]:
        for k in ["hook", "headline", "primary_text", "cta", "image_prompt"]:
            assert k in ad, f"missing {k}"
    spy_id = doc["id"]

    # GET list
    r2 = requests.get(f"{BASE_URL}/api/ads/batch-spy?client_id={client_id}", headers=headers, timeout=15)
    assert r2.status_code == 200
    ids = [x["id"] for x in r2.json()]
    assert spy_id in ids
    for item in r2.json():
        assert "_id" not in item

    # DELETE
    r3 = requests.delete(f"{BASE_URL}/api/ads/batch-spy/{spy_id}", headers=headers, timeout=15)
    assert r3.status_code == 200

    r4 = requests.get(f"{BASE_URL}/api/ads/batch-spy?client_id={client_id}", headers=headers, timeout=15)
    assert spy_id not in [x["id"] for x in r4.json()]
