"""Backend tests for the Campaign Engine + Traction Labs Intelligence brain.

The build endpoint runs 3 chained Claude calls asynchronously (~2.5-3.5 min total),
so we poll GET /api/campaigns/{id} up to 6 min waiting for build_status='ready'.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "nasir@tractionlabs.com"
ADMIN_PASSWORD = "TractionLabs2026!"

POLL_INTERVAL = 5
POLL_MAX_ITERS = 72  # 6 minutes


@pytest.fixture(scope="module")
def auth():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def hvac_client_id(auth):
    r = requests.get(f"{API}/clients", headers=auth, timeout=15)
    assert r.status_code == 200
    for c in r.json():
        if (c.get("industry") or "").lower() == "hvac":
            return c["id"]
    pytest.skip("No hvac client seeded")


def _poll_ready(campaign_id, auth, max_iters=POLL_MAX_ITERS):
    for i in range(max_iters):
        r = requests.get(f"{API}/campaigns/{campaign_id}", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        status = d.get("build_status")
        if status == "ready":
            return d
        if status == "failed":
            pytest.fail(f"campaign build failed: {d.get('build_error')}")
        time.sleep(POLL_INTERVAL)
    pytest.fail(f"campaign did not become ready within {max_iters * POLL_INTERVAL}s (last progress={d.get('progress')})")


# ============ INTELLIGENCE (fast — hvac pre-seeded) ============
class TestIntelligence:
    def test_industries_includes_hvac(self, auth):
        r = requests.get(f"{API}/intelligence/industries", headers=auth, timeout=15)
        assert r.status_code == 200
        assert "hvac" in r.json()

    def test_summary_shape(self, auth):
        r = requests.get(f"{API}/intelligence/summary?industry=hvac", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("winning_hooks", "winning_emotions", "winning_offers",
                  "customer_language", "winning_angles", "objections"):
            assert k in d, f"missing key {k}"
            assert isinstance(d[k], list)
        # hvac was pre-seeded from a WON campaign
        total = sum(len(v) for v in d.values())
        assert total > 0, "hvac intel should have entries"

    def test_list_and_delete(self, auth):
        r = requests.get(f"{API}/intelligence?industry=hvac", headers=auth, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        entry = items[0]
        for k in ("id", "kind", "value", "weight", "industry"):
            assert k in entry, f"missing entry field {k}"
        # Delete one and confirm it's gone
        entry_id = entry["id"]
        d = requests.delete(f"{API}/intelligence/{entry_id}", headers=auth, timeout=15)
        assert d.status_code == 200
        r2 = requests.get(f"{API}/intelligence?industry=hvac", headers=auth, timeout=15)
        assert all(x["id"] != entry_id for x in r2.json())
        # Re-add for next tests: we'll rely on remaining seed entries; skip re-insert.


# ============ CAMPAIGN BUILD (SLOW — one full pipeline) ============
@pytest.fixture(scope="module")
def built_campaign(auth, hvac_client_id):
    payload = {"client_id": hvac_client_id, "goal": "TEST more qualified leads",
               "notes": "TEST_CAMPAIGN_ENGINE — automated test"}
    r = requests.post(f"{API}/campaigns/build", headers=auth, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["build_status"] == "building"
    assert d["progress"] == "reality"
    campaign_id = d["id"]
    ready = _poll_ready(campaign_id, auth)
    yield ready
    # cleanup
    try:
        requests.delete(f"{API}/campaigns/{campaign_id}", headers=auth, timeout=15)
    except Exception:
        pass


class TestCampaignBuild:
    def test_reality_schema(self, built_campaign):
        r = built_campaign["reality"]
        assert r is not None
        cr = r["customer_reality"]
        for k in ("who", "daily_life", "frustrations", "goals", "fears", "desires",
                  "identity", "decision_process", "objections", "trust_barriers"):
            assert k in cr, f"customer_reality missing {k}"
        ph = r["pain_hierarchy"]
        for k in ("surface", "emotional", "identity", "hidden", "future_pain",
                  "avoided_consequences", "desired_transformation"):
            assert k in ph, f"pain_hierarchy missing {k}"
        bl = r["belief_ladder"]
        for k in ("current_beliefs", "bridge_beliefs", "target_beliefs"):
            assert k in bl, f"belief_ladder missing {k}"
        bf = r["battlefield"]
        for k in ("competitor_patterns", "customer_complaints", "category_fatigue",
                  "gaps", "positioning_opportunities"):
            assert k in bf, f"battlefield missing {k}"

    def test_creative_schema(self, built_campaign):
        cr = built_campaign["creative"]
        assert cr is not None
        ap = cr["attention_plan"]
        for k in ("curiosity_gap", "pattern_interrupt", "emotional_trigger", "dopamine_loop"):
            assert k in ap
        concepts = cr["creative_concepts"]
        assert isinstance(concepts, list) and len(concepts) == 3
        for c in concepts:
            for k in ("name", "content_structure", "hook", "script", "storyboard",
                      "headline", "primary_text", "cta", "image_prompt", "why_it_works"):
                assert k in c, f"concept missing {k}"

    def test_conversion_schema(self, built_campaign):
        cv = built_campaign["conversion"]
        assert cv is not None
        assert "offer" in cv
        fn = cv["funnel"]
        for k in ("cold", "interested", "warm", "ready", "landing_page",
                  "retargeting", "email_sequence", "sms_sequence"):
            assert k in fn, f"funnel missing {k}"
        assert "trust_plan" in cv
        assert "testing_and_optimization" in cv
        assert "learning_tags" in cv


# ============ RESULT = WON → feeds intelligence ============
class TestResultAndLearnings:
    def test_mark_won_records_learnings(self, auth, built_campaign):
        cid = built_campaign["id"]
        r = requests.post(f"{API}/campaigns/{cid}/result", headers=auth,
                          json={"status": "won", "notes": "TEST win"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "ok"
        assert d["learnings_recorded"] > 0


# ============ REFINE conversion only (cascade=false → 1 layer, ~1 min) ============
class TestRefineConversion:
    def test_refine_conversion_no_cascade(self, auth, built_campaign):
        cid = built_campaign["id"]
        # Snapshot reality & creative to ensure they remain untouched
        before_reality = built_campaign["reality"]
        before_creative = built_campaign["creative"]

        r = requests.post(f"{API}/campaigns/{cid}/refine", headers=auth,
                          json={"layer": "conversion", "cascade": False,
                                "instructions": "Emphasize risk reversal"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "refining"

        ready = _poll_ready(cid, auth, max_iters=48)  # 4 min max
        # Reality + creative should be unchanged (deep equality on keys)
        assert ready["reality"]["customer_reality"]["who"] == before_reality["customer_reality"]["who"]
        assert ready["creative"]["creative_concepts"][0]["name"] == before_creative["creative_concepts"][0]["name"]
        # Conversion should still be well-formed
        assert "offer" in ready["conversion"]
        assert "funnel" in ready["conversion"]


# ============ CLEANUP: delete campaign happens in fixture teardown ============
class TestDelete:
    def test_delete_endpoint(self, auth, hvac_client_id):
        # Create a fresh stub campaign row (via build) and delete during 'building'
        r = requests.post(f"{API}/campaigns/build", headers=auth,
                          json={"client_id": hvac_client_id, "goal": "TEST_DELETE"}, timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]
        d = requests.delete(f"{API}/campaigns/{cid}", headers=auth, timeout=15)
        assert d.status_code == 200
        # GET should now 404
        g = requests.get(f"{API}/campaigns/{cid}", headers=auth, timeout=15)
        assert g.status_code == 404
