"""Tests for Creative Library feature and guarded save-on-success in /api/ads/visual."""
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
# fallback to frontend .env
if not BASE_URL:
    from pathlib import Path
    env = Path("/app/frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

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


def test_creatives_requires_auth():
    r = requests.get(f"{BASE_URL}/api/creatives", timeout=10)
    assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}"


def test_list_creatives_returns_list(headers):
    r = requests.get(f"{BASE_URL}/api/creatives", headers=headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 2, f"Expected at least 2 seeded creatives, got {len(data)}"
    for c in data:
        assert "id" in c and "kind" in c and "prompt" in c
        assert "_id" not in c


def test_filter_by_prompt_q(headers):
    r = requests.get(f"{BASE_URL}/api/creatives", headers=headers, params={"q": "roof"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    for c in data:
        assert "roof" in c["prompt"].lower()


def test_filter_by_kind_image(headers):
    r = requests.get(f"{BASE_URL}/api/creatives", headers=headers, params={"kind": "image"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    for c in data:
        assert c["kind"] == "image"


def test_filter_by_kind_video(headers):
    r = requests.get(f"{BASE_URL}/api/creatives", headers=headers, params={"kind": "video"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    for c in data:
        assert c["kind"] == "video"


def test_filter_by_client_id(headers):
    all_r = requests.get(f"{BASE_URL}/api/creatives", headers=headers, timeout=15).json()
    cid = None
    for c in all_r:
        if c.get("client_id"):
            cid = c["client_id"]
            break
    if not cid:
        pytest.skip("No client-tagged creatives")
    r = requests.get(f"{BASE_URL}/api/creatives", headers=headers, params={"client_id": cid}, timeout=15)
    assert r.status_code == 200
    for c in r.json():
        assert c["client_id"] == cid


def test_visual_failed_does_not_create_creative(headers):
    """Higgsfield has zero credits -> job fails -> creatives count unchanged."""
    before = requests.get(f"{BASE_URL}/api/creatives", headers=headers, timeout=15).json()
    before_count = len(before)

    payload = {"prompt": "TEST_guard_no_save_on_fail unique xyzzy", "kind": "image",
               "client_id": None}
    r = requests.post(f"{BASE_URL}/api/ads/visual", headers=headers, json=payload, timeout=20)
    assert r.status_code == 200, r.text
    job_id = r.json()["id"]

    # Poll until job completes/fails (max ~30s)
    status = "queued"
    for _ in range(30):
        time.sleep(1)
        jr = requests.get(f"{BASE_URL}/api/ads/visual/{job_id}", headers=headers, timeout=10)
        assert jr.status_code == 200
        status = jr.json()["status"]
        if status in ("failed", "completed"):
            break
    assert status == "failed", f"Expected failed (no Higgsfield credits), got {status}"

    after = requests.get(f"{BASE_URL}/api/creatives", headers=headers, timeout=15).json()
    assert len(after) == before_count, f"Failed job created a creative: before={before_count}, after={len(after)}"
    # Also confirm no creative matches our unique prompt
    assert not any("xyzzy" in c["prompt"] for c in after)


def test_delete_creative_flow(headers):
    """Create a synthetic creative via DB path is not exposed; instead we delete one and re-check.
    To avoid destroying seed data, we skip if only 2 seed items exist."""
    data = requests.get(f"{BASE_URL}/api/creatives", headers=headers, timeout=15).json()
    if len(data) <= 2:
        # Test DELETE endpoint with a fake id (should still 200 idempotent)
        r = requests.delete(f"{BASE_URL}/api/creatives/nonexistent-id-xyz", headers=headers, timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "deleted"
        return
    target = data[0]["id"]
    r = requests.delete(f"{BASE_URL}/api/creatives/{target}", headers=headers, timeout=10)
    assert r.status_code == 200
    after = requests.get(f"{BASE_URL}/api/creatives", headers=headers, timeout=15).json()
    assert not any(c["id"] == target for c in after)
