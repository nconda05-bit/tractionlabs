"""Backend tests for Value Engine endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "nasir@tractionlabs.com"
ADMIN_PASSWORD = "TractionLabs2026!"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


HVAC_INPUTS = {
    "business_name": "TEST_ACME HVAC",
    "contact_name": "John",
    "city": "Austin, TX",
    "industry": "hvac",
    "avg_ticket": 6500,
    "gross_margin_pct": 45,
    "close_rate_pct": 30,
    "current_leads": 25,
    "ad_spend": 3000,
    "proposed_fee": 1500,
    "target_cpl": 55,
    "capacity_monthly": 60,
    "notes": "Wants more AC install leads"
}


# ---------- Templates ----------
class TestTemplates:
    def test_templates_shape(self, auth):
        r = requests.get(f"{API}/value-engine/templates", headers=auth, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("hvac", "roofing", "landscaping", "dentists", "gyms", "other"):
            assert k in d
            for f in ("avg_ticket", "gross_margin_pct", "close_rate_pct", "target_cpl",
                      "monthly_leads_typical", "capacity_monthly", "objections", "closing_angles"):
                assert f in d[k], f"{k}.{f} missing"

    def test_templates_auth_required(self):
        r = requests.get(f"{API}/value-engine/templates", timeout=15)
        assert r.status_code == 401


# ---------- Calculate ----------
class TestCalculate:
    def test_calculate_hvac(self, auth):
        r = requests.post(f"{API}/value-engine/calculate", headers=auth, json=HVAC_INPUTS, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["profit_per_customer"] == 2925.0  # 6500 * 0.45
        assert d["scenarios"]["target"]["new_customers"] > 0
        assert d["scenarios"]["target"]["roi_pct"] > 0
        assert d["breakeven"]["customers"] > 0
        assert d["twelve_month_target_profit"] > 0
        assert "conservative" in d["scenarios"] and "stretch" in d["scenarios"]


# ---------- Build (real Claude) ----------
class TestBuild:
    @pytest.fixture(scope="class")
    def built_run(self, auth):
        payload = {"inputs": HVAC_INPUTS, "include_script": True}
        r = requests.post(f"{API}/value-engine/build", headers=auth, json=payload, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        yield d
        # cleanup
        try:
            requests.delete(f"{API}/value-engine/runs/{d['id']}", headers=auth, timeout=15)
        except Exception:
            pass

    def test_build_has_script(self, built_run):
        d = built_run
        assert d.get("id")
        assert d.get("calc")
        s = d.get("script")
        assert s, "script missing"
        for k in ("opening_hook", "pain_diagnosis", "value_pitch", "differentiators",
                  "objection_playbook", "close", "fallback_offers", "one_page_summary"):
            assert k in s, f"missing script.{k}"
        assert isinstance(s["differentiators"], list)
        assert isinstance(s["objection_playbook"], list) and len(s["objection_playbook"]) > 0
        first = s["objection_playbook"][0]
        for k in ("objection", "reframe", "one_liner"):
            assert k in first
        assert isinstance(s["fallback_offers"], list)

    def test_runs_list_and_get(self, auth, built_run):
        rid = built_run["id"]
        r = requests.get(f"{API}/value-engine/runs", headers=auth, timeout=15)
        assert r.status_code == 200
        runs = r.json()
        assert isinstance(runs, list)
        assert any(x["id"] == rid for x in runs)
        # ordered desc
        if len(runs) >= 2:
            assert runs[0]["created_at"] >= runs[-1]["created_at"]
        # get by id
        r = requests.get(f"{API}/value-engine/runs/{rid}", headers=auth, timeout=15)
        assert r.status_code == 200 and r.json()["id"] == rid

    def test_pdf_download(self, token, built_run):
        rid = built_run["id"]
        r = requests.get(f"{API}/value-engine/runs/{rid}/pdf", params={"token": token}, timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 10000
        assert r.content[:4] == b"%PDF"


class TestDelete:
    def test_delete_run(self, auth):
        # Build a lightweight run (no script) to speed up
        payload = {"inputs": HVAC_INPUTS, "include_script": False}
        r = requests.post(f"{API}/value-engine/build", headers=auth, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        # delete
        r = requests.delete(f"{API}/value-engine/runs/{rid}", headers=auth, timeout=15)
        assert r.status_code == 200
        # confirm gone
        r = requests.get(f"{API}/value-engine/runs/{rid}", headers=auth, timeout=15)
        assert r.status_code == 404


# ---------- Regression: happy path 200s on prior features ----------
class TestRegression:
    def test_dashboard(self, auth):
        assert requests.get(f"{API}/dashboard", headers=auth, timeout=15).status_code == 200

    def test_clients_list(self, auth):
        assert requests.get(f"{API}/clients", headers=auth, timeout=15).status_code == 200

    def test_campaigns_list(self, auth):
        r = requests.get(f"{API}/campaigns", headers=auth, timeout=15)
        assert r.status_code == 200

    def test_intelligence_list(self, auth):
        r = requests.get(f"{API}/intelligence", headers=auth, timeout=15)
        assert r.status_code in (200,)

    def test_batch_spy_list(self, auth):
        r = requests.get(f"{API}/batch-spy/runs", headers=auth, timeout=15)
        assert r.status_code in (200,)
