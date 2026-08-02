"""Backend API tests for Traction Labs Agency OS dashboard."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ai-acquisition-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "nasir@tractionlabs.com"
ADMIN_PASSWORD = "TractionLabs2026!"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and "user" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- AUTH ----------------
class TestAuth:
    def test_login_bad_creds(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, auth):
        r = requests.get(f"{API}/auth/me", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL

    def test_protected_requires_auth(self):
        assert requests.get(f"{API}/dashboard", timeout=15).status_code == 401
        assert requests.get(f"{API}/clients", timeout=15).status_code == 401


# ---------------- DASHBOARD ----------------
class TestDashboard:
    def test_dashboard(self, auth):
        r = requests.get(f"{API}/dashboard", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "stats" in d and "tasks_today" in d
        for k in ("active_clients", "onboarding_clients", "mrr", "open_tasks", "tasks_today", "new_leads"):
            assert k in d["stats"], f"missing stats.{k}"
        assert isinstance(d["tasks_today"], list)


# ---------------- CLIENTS CRUD ----------------
class TestClients:
    def test_client_crud(self, auth):
        payload = {"business_name": "TEST_ClientCo", "industry": "hvac", "monthly_fee": 1500, "status": "active"}
        r = requests.post(f"{API}/clients", headers=auth, json=payload, timeout=15)
        assert r.status_code == 200
        c = r.json()
        cid = c["id"]
        assert c["business_name"] == "TEST_ClientCo"

        # list
        r = requests.get(f"{API}/clients", headers=auth, timeout=15)
        assert r.status_code == 200
        assert any(x["id"] == cid for x in r.json())

        # get
        r = requests.get(f"{API}/clients/{cid}", headers=auth, timeout=15)
        assert r.status_code == 200 and r.json()["id"] == cid

        # update
        r = requests.put(f"{API}/clients/{cid}", headers=auth, json={"notes": "updated notes"}, timeout=15)
        assert r.status_code == 200 and r.json()["notes"] == "updated notes"

        # delete
        r = requests.delete(f"{API}/clients/{cid}", headers=auth, timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/clients/{cid}", headers=auth, timeout=15)
        assert r.status_code == 404


# ---------------- AI BRIEFING (real Claude) ----------------
class TestAIBriefing:
    def test_briefing(self, auth):
        r = requests.get(f"{API}/ai/briefing", headers=auth, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "greeting" in d
        assert "highlights" in d and isinstance(d["highlights"], list)
        assert "next_best_action" in d
        nba = d["next_best_action"]
        assert "title" in nba and "reason" in nba


# ---------------- ONBOARDING (real Claude) ----------------
class TestOnboarding:
    def test_onboarding_creates_client_and_tasks(self, auth):
        payload = {
            "business_name": "TEST_OnboardCo",
            "website": "https://example.com",
            "industry": "hvac",
            "offer": "AC tune-up $79",
            "service_area": "Austin, TX",
            "monthly_budget": "$2000",
            "ideal_customer": "Homeowners 35-65",
            "goals": "20 leads/mo",
            "monthly_fee": 1500,
        }
        r = requests.post(f"{API}/onboarding", headers=auth, json=payload, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "client" in d and "strategy" in d and "tasks_created" in d
        assert d["tasks_created"] > 0
        cid = d["client"]["id"]
        assert d["client"]["status"] == "onboarding"

        # tasks retrievable
        r = requests.get(f"{API}/tasks", headers=auth, params={"client_id": cid}, timeout=15)
        assert r.status_code == 200 and len(r.json()) > 0

        # cleanup
        requests.delete(f"{API}/clients/{cid}", headers=auth, timeout=15)


# ---------------- AI CLIENT BRAIN + DOCUMENTS (real Claude) ----------------
class TestClientBrainAndDocs:
    @pytest.fixture(scope="class")
    def client_id(self, auth):
        r = requests.post(f"{API}/clients", headers=auth, json={
            "business_name": "TEST_BrainCo", "industry": "hvac", "monthly_fee": 2000,
            "website": "https://example.com", "notes": "Meta ads, low conversions",
            "target_cities": ["Austin"], "services": ["Meta Ads"], "budget": "$2000",
        }, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        yield cid
        requests.delete(f"{API}/clients/{cid}", headers=auth, timeout=15)

    def test_analyze(self, auth, client_id):
        r = requests.post(f"{API}/clients/{client_id}/analyze", headers=auth,
                          json={"question": "Why are ads not converting?"}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "summary" in d
        assert isinstance(d.get("findings"), list)
        assert isinstance(d.get("priority_actions"), list)

    def test_document_generate_and_pdf(self, auth, token, client_id):
        r = requests.post(f"{API}/documents/generate", headers=auth,
                          json={"client_id": client_id, "type": "proposal"}, timeout=90)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["title"] and isinstance(doc["sections"], list)
        assert "meta" in doc
        doc_id = doc["id"]

        r = requests.get(f"{API}/documents", headers=auth, params={"client_id": client_id}, timeout=15)
        assert r.status_code == 200 and any(x["id"] == doc_id for x in r.json())

        # PDF with token
        r = requests.get(f"{API}/documents/{doc_id}/pdf", params={"token": token}, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 1000

        # cleanup doc
        requests.delete(f"{API}/documents/{doc_id}", headers=auth, timeout=15)


# ---------------- AI COO (real Claude) ----------------
class TestAICoo:
    def test_coo_chat(self, auth):
        r = requests.post(f"{API}/ai/coo", headers=auth,
                          json={"question": "What should I focus on today?"}, timeout=90)
        assert r.status_code == 200, r.text
        assert "answer" in r.json() and len(r.json()["answer"]) > 0

    def test_coo_history(self, auth):
        r = requests.get(f"{API}/ai/coo/history", headers=auth, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json().get("messages"), list)



# ==================== PHASE 2 ====================
@pytest.fixture(scope="module")
def phase2_client(auth):
    r = requests.post(f"{API}/clients", headers=auth, json={
        "business_name": "TEST_Phase2Co", "industry": "hvac", "monthly_fee": 1500,
        "website": "https://example.com", "notes": "Meta ads",
        "target_cities": ["Austin"], "services": ["Meta Ads"], "budget": "$2000",
    }, timeout=15)
    assert r.status_code == 200
    cid = r.json()["id"]
    yield cid
    requests.delete(f"{API}/clients/{cid}", headers=auth, timeout=15)


class TestMetrics:
    def test_metrics_requires_auth(self, phase2_client):
        r = requests.put(f"{API}/clients/{phase2_client}/metrics",
                         json={"spend": 100, "leads": 5}, timeout=15)
        assert r.status_code == 401

    def test_update_metrics_cpl_and_dashboard(self, auth, phase2_client):
        payload = {"spend": 1000, "leads": 25, "appointments": 10, "revenue": 5000, "period": "2026-01"}
        r = requests.put(f"{API}/clients/{phase2_client}/metrics", headers=auth, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["metrics"]["cpl"] == 40.0  # 1000/25
        assert c["metrics"]["spend"] == 1000
        assert c["metrics"]["leads"] == 25

        # zero-leads guard
        r = requests.put(f"{API}/clients/{phase2_client}/metrics", headers=auth,
                         json={"spend": 500, "leads": 0}, timeout=15)
        assert r.status_code == 200
        assert r.json()["metrics"]["cpl"] == 0

        # restore + verify dashboard aggregates
        requests.put(f"{API}/clients/{phase2_client}/metrics", headers=auth, json=payload, timeout=15)
        r = requests.get(f"{API}/dashboard", headers=auth, timeout=15)
        d = r.json()
        assert "ad_spend" in d["stats"] and "leads_generated" in d["stats"]
        assert d["stats"]["ad_spend"] >= 1000
        assert d["stats"]["leads_generated"] >= 25


class TestSalesCoach:
    def test_prep_requires_auth(self):
        r = requests.post(f"{API}/sales/prep", json={"business_name": "X"}, timeout=15)
        assert r.status_code == 401

    def test_sales_prep(self, auth):
        r = requests.post(f"{API}/sales/prep", headers=auth, json={
            "business_name": "TEST_ACME HVAC", "industry": "hvac",
            "context": "Owner wants more AC install leads; $3k/mo budget."
        }, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("mindset", "talking_points", "objections", "avoid", "close"):
            assert k in d, f"missing {k}"
        assert isinstance(d["talking_points"], list) and len(d["talking_points"]) > 0
        assert isinstance(d["objections"], list) and len(d["objections"]) > 0
        first = d["objections"][0]
        assert "objection" in first and "response" in first

    def test_sales_score(self, auth):
        transcript = (
            "Rep: Hi John, thanks for hopping on. Tell me about your business.\n"
            "John: We do HVAC install and repair in Austin. Leads are down.\n"
            "Rep: Got it. What's your current cost per lead?\n"
            "John: Around $120, too high.\n"
            "Rep: We can typically cut that in half in 60 days. Are you open to a 3-month trial?\n"
            "John: How much?\n"
            "Rep: $1500/mo plus ad spend.\n"
            "John: Let me think about it.\n"
        )
        r = requests.post(f"{API}/sales/score", headers=auth, json={
            "business_name": "TEST_ACME HVAC", "transcript": transcript
        }, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("score"), int)
        assert isinstance(d.get("closing_probability"), int)
        for k in ("strengths", "objections", "mistakes", "better_responses", "summary"):
            assert k in d


class TestAdCreator:
    def test_ads_requires_auth(self, phase2_client):
        r = requests.post(f"{API}/ads/create", json={"client_id": phase2_client}, timeout=15)
        assert r.status_code == 401

    def test_ad_create_list_delete(self, auth, phase2_client):
        r = requests.post(f"{API}/ads/create", headers=auth,
                         json={"client_id": phase2_client}, timeout=120)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["client_id"] == phase2_client
        data = doc["data"]
        assert "campaign_name" in data and "audiences" in data and "ads" in data
        assert isinstance(data["ads"], list) and len(data["ads"]) >= 1
        ad = data["ads"][0]
        for k in ("hook", "headline", "primary_text", "cta"):
            assert k in ad
        ad_id = doc["id"]

        r = requests.get(f"{API}/ads", headers=auth, params={"client_id": phase2_client}, timeout=15)
        assert r.status_code == 200 and any(x["id"] == ad_id for x in r.json())

        r = requests.delete(f"{API}/ads/{ad_id}", headers=auth, timeout=15)
        assert r.status_code == 200


class TestReportsAndPortal:
    def test_report_requires_auth(self, phase2_client):
        r = requests.post(f"{API}/reports/generate", json={"client_id": phase2_client}, timeout=15)
        assert r.status_code == 401

    def test_generate_report_and_public_portal(self, auth, phase2_client):
        # ensure metrics exist
        requests.put(f"{API}/clients/{phase2_client}/metrics", headers=auth, json={
            "spend": 1000, "leads": 25, "appointments": 10, "revenue": 5000, "period": "2026-01"
        }, timeout=15)

        r = requests.post(f"{API}/reports/generate", headers=auth,
                         json={"client_id": phase2_client, "period": "January 2026"}, timeout=120)
        assert r.status_code == 200, r.text
        report = r.json()
        assert report["share_token"] and len(report["share_token"]) > 10
        assert report["metrics"]["spend"] == 1000
        assert report["metrics"]["leads"] == 25
        content = report["content"]
        for k in ("headline", "summary", "wins", "metrics_narrative", "next_month"):
            assert k in content

        token = report["share_token"]

        # list
        r = requests.get(f"{API}/reports", headers=auth, timeout=15)
        assert r.status_code == 200 and any(x["id"] == report["id"] for x in r.json())

        # PUBLIC portal - NO auth header
        r = requests.get(f"{API}/portal/{token}", timeout=15)
        assert r.status_code == 200, r.text
        pub = r.json()
        assert pub["share_token"] == token
        assert pub["content"]["headline"]

        # invalid token
        r = requests.get(f"{API}/portal/nonexistent_token_xyz", timeout=15)
        assert r.status_code == 404

        # cleanup
        requests.delete(f"{API}/reports/{report['id']}", headers=auth, timeout=15)



# ---------------- AD VISUALS (Higgsfield) ----------------
class TestAdVisual:
    def test_visual_requires_auth(self):
        r = requests.post(f"{API}/ads/visual", json={"prompt": "Test", "kind": "image"}, timeout=15)
        assert r.status_code in (401, 403), f"Expected 401/403 without auth, got {r.status_code}"

    def test_visual_get_requires_auth(self):
        r = requests.get(f"{API}/ads/visual/nonexistent-id", timeout=15)
        assert r.status_code in (401, 403)

    def test_visual_create_and_graceful_out_of_credits(self, auth):
        import time
        # Create a visual job (image)
        r = requests.post(f"{API}/ads/visual",
                          json={"prompt": "A modern HVAC technician fixing a unit, cinematic lighting", "kind": "image"},
                          headers=auth, timeout=30)
        assert r.status_code in (200, 202), f"Expected 200/202, got {r.status_code}: {r.text}"
        job = r.json()
        assert "id" in job
        assert job["status"] == "queued"
        assert job["kind"] == "image"
        job_id = job["id"]

        # Poll for up to ~25s waiting for background task to finish
        final = None
        for _ in range(25):
            time.sleep(1)
            g = requests.get(f"{API}/ads/visual/{job_id}", headers=auth, timeout=15)
            assert g.status_code == 200, f"GET failed: {g.status_code} {g.text}"
            j = g.json()
            if j["status"] in ("completed", "failed"):
                final = j
                break

        assert final is not None, "Job did not finish within 25s"
        # Must NOT crash (500) — this endpoint always returns 200.
        # Success = graceful 'failed' with out-of-credits (account has zero credits)
        # OR 'completed' if credits ever get added (unlikely but not a failure)
        assert final["status"] in ("failed", "completed")
        if final["status"] == "failed":
            err = (final.get("error") or "").lower()
            # Must be the graceful credit error, NOT a model_not_found
            assert "model_not_found" not in err, f"model_not_found bug regressed: {err}"
            assert "404" not in err, f"Unexpected 404: {err}"
            assert "credit" in err, f"Expected out-of-credits message, got: {err}"

    def test_visual_video_kind_accepted(self, auth):
        # Just verify that kind=video is accepted and returns a queued job (background task will fail gracefully)
        r = requests.post(f"{API}/ads/visual",
                          json={"prompt": "HVAC before/after transformation reel", "kind": "video"},
                          headers=auth, timeout=30)
        assert r.status_code in (200, 202), f"Expected 200/202, got {r.status_code}: {r.text}"
        job = r.json()
        assert job["kind"] == "video"
        assert job["status"] == "queued"
