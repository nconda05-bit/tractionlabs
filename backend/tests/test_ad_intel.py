"""Tests for Competitor Ad Intel feature."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"
# Fallback: use frontend env
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
    assert clients, "No clients found (need ABC HVAC demo)"
    # prefer ABC HVAC
    for c in clients:
        if "abc" in (c.get("business_name", "").lower()):
            return c["id"]
    return clients[0]["id"]


def test_requires_auth():
    r = requests.post(f"{BASE_URL}/api/ads/analyze-competitor",
                      json={"client_id": "x", "competitor_text": "hi"}, timeout=15)
    assert r.status_code in (401, 403)


def test_validation_no_text_no_image(headers, client_id):
    r = requests.post(f"{BASE_URL}/api/ads/analyze-competitor",
                      headers=headers,
                      json={"client_id": client_id, "competitor_text": "", "competitor_name": "X"},
                      timeout=15)
    assert r.status_code == 400


def test_analyze_competitor_success(headers, client_id):
    payload = {
        "client_id": client_id,
        "competitor_name": "TEST_CompetitorAC",
        "competitor_text": ("Beat the summer heat! 24/7 AC repair from $69. Same-day service, "
                            "licensed & insured. Call now for a free quote."),
    }
    r = requests.post(f"{BASE_URL}/api/ads/analyze-competitor",
                      headers=headers, json=payload, timeout=90)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("id")
    data = body.get("data") or {}
    # structural assertions
    breakdown = data.get("breakdown") or {}
    for k in ("hook", "offer", "angle", "cta"):
        assert k in breakdown, f"missing breakdown.{k}"
    assert isinstance(breakdown.get("emotional_triggers"), list)
    assert isinstance(data.get("strengths"), list) and data["strengths"]
    assert isinstance(data.get("weaknesses"), list)
    assert isinstance(data.get("how_to_win"), list) and data["how_to_win"]
    rec = data.get("recommended_copy") or {}
    for k in ("headline", "primary_text", "cta"):
        assert k in rec, f"missing recommended_copy.{k}"
    assert isinstance(data.get("higgsfield_prompt"), str) and len(data["higgsfield_prompt"]) > 20
    # stash id for downstream tests
    pytest.analysis_id = body["id"]


def test_list_competitor_analyses(headers, client_id):
    r = requests.get(f"{BASE_URL}/api/ads/competitor-analyses",
                     headers=headers, params={"client_id": client_id}, timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    aid = getattr(pytest, "analysis_id", None)
    if aid:
        assert any(it["id"] == aid for it in items), "created analysis not returned in list"


def test_delete_competitor_analysis(headers, client_id):
    aid = getattr(pytest, "analysis_id", None)
    if not aid:
        pytest.skip("no id from earlier test")
    r = requests.delete(f"{BASE_URL}/api/ads/competitor-analyses/{aid}",
                        headers=headers, timeout=15)
    assert r.status_code == 200
    # verify removed
    r2 = requests.get(f"{BASE_URL}/api/ads/competitor-analyses",
                      headers=headers, params={"client_id": client_id}, timeout=15)
    assert all(it["id"] != aid for it in r2.json())
