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
