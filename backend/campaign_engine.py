"""Traction Labs Campaign Engine — a chained, human-first campaign builder.

Three layered agents. Each agent consumes the previous agent's JSON output.
Agent 1 (REALITY) → Agent 2 (CREATIVE) → Agent 3 (CONVERSION)

Layer 1 covers: Human Reality Intelligence, Pain Discovery, Belief Change, Market Battlefield.
Layer 2 covers: Attention & Behavior, Creative Director, Content Intelligence.
Layer 3 covers: Offer Psychology, Funnel Intelligence, Trust Building, Performance Science, Learning Loop tags.
"""
import json
import logging
import ai_service

logger = logging.getLogger(__name__)


PHILOSOPHY = (
    "CORE PHILOSOPHY YOU MUST HONOR IN EVERY OUTPUT:\n"
    "- Traction Labs does not compete for ad space. Traction Labs competes for HUMAN ATTENTION.\n"
    "- Understand humans so deeply that advertisements become the natural bridge between a person's problem and the solution.\n"
    "- People over platforms. Algorithms distribute content — humans decide what matters.\n"
    "- We do not create ads. We create valuable experiences that move people toward action.\n"
    "- Always follow the chain: Understand the human. Discover the problem. Change the belief. Deliver the solution."
)


def _client_block(c: dict, goal: str = "", notes: str = "") -> str:
    m = c.get("metrics") or {}
    return (
        f"CLIENT: {c.get('business_name')} | industry={c.get('industry')} | "
        f"services={c.get('services')} | cities={c.get('target_cities')} | "
        f"budget=${c.get('budget','?')}/mo | monthly_fee=${c.get('monthly_fee',0)}\n"
        f"IDEAL_CUSTOMER: {c.get('ideal_customer','')}\n"
        f"CURRENT_METRICS: spend=${m.get('spend',0)} leads={m.get('leads',0)} "
        f"cpl=${m.get('cpl',0)} appointments={m.get('appointments',0)} revenue=${m.get('revenue',0)}\n"
        f"NOTES/GOALS: {c.get('notes','')}\n"
        f"CAMPAIGN GOAL: {goal or 'more qualified leads at lower cost per lead'}\n"
        f"EXTRA DIRECTION: {notes or 'none'}"
    )


def _intel_block(intel: dict) -> str:
    if not intel:
        return ""
    parts = []
    for k, label in [
        ("winning_hooks", "Winning hooks proven in this niche"),
        ("winning_emotions", "Emotions that convert in this niche"),
        ("winning_offers", "Offers that convert in this niche"),
        ("customer_language", "Real customer language (use their words)"),
        ("winning_angles", "Angles marked WON across our clients"),
        ("objections", "Objections we've seen customers raise"),
    ]:
        vals = intel.get(k) or []
        if vals:
            parts.append(f"{label}: " + "; ".join(str(v)[:180] for v in vals[:6]))
    return ("\n\nTRACTION LABS INTELLIGENCE (learned from prior campaigns — LEAN INTO these):\n" + "\n".join(parts)) if parts else ""


# ============ LAYER 1 — REALITY ============
async def run_reality(client: dict, goal: str, notes: str, intel: dict, session_id: str) -> dict:
    system = (
        f"{PHILOSOPHY}\n\n"
        "You are the REALITY INTELLIGENCE LAYER — 4 agents working together:\n"
        "  Agent 1 HUMAN REALITY INTELLIGENCE — the person behind the customer (identity, daily life, fears, desires, decision process).\n"
        "  Agent 2 PAIN DISCOVERY — surface pain (what they say), emotional pain (what they feel), identity pain (what it represents), plus hidden pain, future pain, avoided consequences, and the desired transformation.\n"
        "  Agent 3 BELIEF CHANGE — the customer's CURRENT beliefs and the NEW beliefs they must adopt to buy (I understand the problem → I trust this solution → I need to act now).\n"
        "  Agent 4 MARKET BATTLEFIELD — what every competitor is saying, what customers hate about the category, the gap nobody exploits.\n\n"
        "You return ONE json object. Demographics DESCRIBE people — psychology EXPLAINS them. Prioritize psychology.\n\n"
        "Schema (return EXACTLY these keys):\n"
        "{\n"
        "  \"customer_reality\": {\n"
        "    \"who\": string (1-2 sentence identity portrait),\n"
        "    \"daily_life\": string,\n"
        "    \"frustrations\": [string, ...],\n"
        "    \"goals\": [string, ...],\n"
        "    \"fears\": [string, ...],\n"
        "    \"desires\": [string, ...],\n"
        "    \"identity\": string (how they see themselves),\n"
        "    \"decision_process\": string (how they decide to buy this category),\n"
        "    \"objections\": [string, ...],\n"
        "    \"trust_barriers\": [string, ...]\n"
        "  },\n"
        "  \"pain_hierarchy\": {\n"
        "    \"surface\": string (what they say out loud),\n"
        "    \"emotional\": string (what they actually feel),\n"
        "    \"identity\": string (what the problem represents about them),\n"
        "    \"hidden\": string (a pain they wouldn't admit but drives behavior),\n"
        "    \"future_pain\": string (what happens if they don't act),\n"
        "    \"avoided_consequences\": [string, ...],\n"
        "    \"desired_transformation\": string\n"
        "  },\n"
        "  \"belief_ladder\": {\n"
        "    \"current_beliefs\": [string, ...] (limiting beliefs, e.g. 'I don't need this yet'),\n"
        "    \"bridge_beliefs\": [string, ...] (intermediate realizations we must land),\n"
        "    \"target_beliefs\": [string, ...] (beliefs they must hold to buy)\n"
        "  },\n"
        "  \"battlefield\": {\n"
        "    \"competitor_patterns\": [string, ...] (what everyone in this market keeps saying),\n"
        "    \"customer_complaints\": [string, ...] (what customers hate about competitors),\n"
        "    \"category_fatigue\": string (why buyers tune out this market),\n"
        "    \"gaps\": [string, ...] (angles NO competitor is using),\n"
        "    \"positioning_opportunities\": [string, ...]\n"
        "  }\n"
        "}"
    )
    prompt = _client_block(client, goal, notes) + _intel_block(intel)
    return await ai_service.ask_claude_json(system_message=system, prompt=prompt, session_id=session_id)


# ============ LAYER 2 — CREATIVE ============
async def run_creative(client: dict, reality: dict, intel: dict, session_id: str) -> dict:
    system = (
        f"{PHILOSOPHY}\n\n"
        "You are the CREATIVE LAYER — 3 agents working together, consuming the Reality Layer's output:\n"
        "  Agent 5 ATTENTION & HUMAN BEHAVIOR — design the curiosity hook, the pattern interrupt, the emotional trigger, and the dopamine loop (Attention → Curiosity → Value → Reward → Action).\n"
        "  Agent 6 CREATIVE DIRECTOR — write hooks, scripts, storyboards, headlines and CTAs that answer: Why would someone stop? Why care? Why believe? Why act?\n"
        "  Agent 7 CONTENT INTELLIGENCE — borrow proven media structures (storytelling, discovery, transformation, conflict, education, entertainment) so ads feel like content people CHOOSE to consume.\n\n"
        "Ads must NEVER feel like ads. They must feel like content that provides value, insight, entertainment or a meaningful realization.\n\n"
        "Return EXACTLY this JSON schema:\n"
        "{\n"
        "  \"attention_plan\": {\n"
        "    \"curiosity_gap\": string (the information gap that makes them stop),\n"
        "    \"pattern_interrupt\": string (the unexpected element),\n"
        "    \"emotional_trigger\": string (which emotion + why it fits),\n"
        "    \"dopamine_loop\": string (a 1-line description of the reward chain)\n"
        "  },\n"
        "  \"creative_concepts\": [\n"
        "    {\n"
        "      \"name\": string (short creative name, e.g. 'The 3AM Regret'),\n"
        "      \"content_structure\": string (storytelling|discovery|transformation|conflict|education|entertainment),\n"
        "      \"hook\": string (the first 3 seconds — a scroll-stopper),\n"
        "      \"script\": [string, ...] (5-8 lines/beats — spoken or on-screen text),\n"
        "      \"storyboard\": [string, ...] (5-8 visual shots the video/carousel plays through),\n"
        "      \"headline\": string,\n"
        "      \"primary_text\": string (150-300 chars, ready for Meta/Google),\n"
        "      \"cta\": string,\n"
        "      \"image_prompt\": string (a rich Higgsfield / Nano Banana visual prompt describing subject, style, mood, lighting, composition — no brand names),\n"
        "      \"why_it_works\": string (1 sentence tying it back to a pain / belief / gap from the reality layer)\n"
        "    }\n"
        "    // return EXACTLY 3 concepts, each borrowing a DIFFERENT content_structure\n"
        "  ]\n"
        "}"
    )
    prompt = (
        _client_block(client)
        + _intel_block(intel)
        + "\n\nREALITY LAYER OUTPUT (build ON this — do not restate it):\n"
        + json.dumps(reality, ensure_ascii=False)[:9000]
    )
    return await ai_service.ask_claude_json(system_message=system, prompt=prompt, session_id=session_id)


# ============ LAYER 3 — CONVERSION ============
async def run_conversion(client: dict, reality: dict, creative: dict, intel: dict, session_id: str) -> dict:
    system = (
        f"{PHILOSOPHY}\n\n"
        "You are the CONVERSION LAYER — 5 agents working together, consuming the Reality + Creative layers:\n"
        "  Agent 8 OFFER PSYCHOLOGY — perceived value, risk reduction, urgency, guarantees, bonuses. People don't buy products, they buy transformations.\n"
        "  Agent 9 FUNNEL INTELLIGENCE — the complete journey Cold → Interested → Warm → Ready (landing page, retargeting, email/SMS, education, follow-up).\n"
        "  Agent 10 TRUST BUILDING — the proof plan (testimonials, case studies, authority, behind-the-scenes) that converts skeptics.\n"
        "  Agent 11 PERFORMANCE SCIENCE — track not just CPM/CPC/CTR but WHY people stopped, watched, clicked, converted. Design hypotheses.\n"
        "  Agent 12 LEARNING LOOP — extract the reusable intelligence this campaign will contribute back to the Traction Labs brain if it wins.\n\n"
        "Return EXACTLY this JSON schema:\n"
        "{\n"
        "  \"offer\": {\n"
        "    \"headline\": string,\n"
        "    \"transformation\": string (the outcome — not the deliverable),\n"
        "    \"risk_reversal\": string (guarantee / no-risk element),\n"
        "    \"urgency\": string,\n"
        "    \"bonuses\": [string, ...],\n"
        "    \"price_positioning\": string\n"
        "  },\n"
        "  \"funnel\": {\n"
        "    \"cold\": {\"objective\": string, \"asset\": string, \"message\": string},\n"
        "    \"interested\": {\"objective\": string, \"asset\": string, \"message\": string},\n"
        "    \"warm\": {\"objective\": string, \"asset\": string, \"message\": string},\n"
        "    \"ready\": {\"objective\": string, \"asset\": string, \"message\": string},\n"
        "    \"landing_page\": {\"hero_headline\": string, \"subheadline\": string, \"hero_copy\": string, \"cta\": string, \"sections\": [string, ...]},\n"
        "    \"retargeting\": [string, ...],\n"
        "    \"email_sequence\": [{\"day\": int, \"subject\": string, \"angle\": string}, ...],\n"
        "    \"sms_sequence\": [{\"day\": int, \"message\": string}, ...]\n"
        "  },\n"
        "  \"trust_plan\": {\n"
        "    \"proof_assets\": [string, ...],\n"
        "    \"testimonial_targets\": [string, ...] (what kind of testimonials to capture),\n"
        "    \"authority_content\": [string, ...],\n"
        "    \"transparency_moves\": [string, ...]\n"
        "  },\n"
        "  \"testing_and_optimization\": {\n"
        "    \"primary_hypothesis\": string,\n"
        "    \"human_metrics\": [string, ...] (metrics that explain WHY, not just what — e.g. '% of hooks that hold to 3s', 'emotion-tagged CTR'),\n"
        "    \"platform_metrics\": [string, ...],\n"
        "    \"tests\": [{\"variable\": string, \"variants\": [string, ...], \"kill_criteria\": string}, ...],\n"
        "    \"stop_loss\": string (when to kill),\n"
        "    \"scale_signal\": string (when to double down)\n"
        "  },\n"
        "  \"learning_tags\": {\n"
        "    \"predicted_winning_hooks\": [string, ...],\n"
        "    \"predicted_winning_emotions\": [string, ...],\n"
        "    \"predicted_winning_offers\": [string, ...],\n"
        "    \"customer_language_captured\": [string, ...] (exact phrases we should keep reusing),\n"
        "    \"objections_addressed\": [string, ...]\n"
        "  }\n"
        "}"
    )
    prompt = (
        _client_block(client)
        + _intel_block(intel)
        + "\n\nREALITY LAYER OUTPUT:\n" + json.dumps(reality, ensure_ascii=False)[:6000]
        + "\n\nCREATIVE LAYER OUTPUT:\n" + json.dumps(creative, ensure_ascii=False)[:6000]
    )
    return await ai_service.ask_claude_json(system_message=system, prompt=prompt, session_id=session_id)


# ============ REFINEMENT (per-section) ============
async def refine_layer(layer: str, client: dict, campaign: dict, instructions: str, intel: dict, session_id: str) -> dict:
    """Re-run a single layer with new instructions, using surrounding layers as context.

    layer ∈ {"reality","creative","conversion"}. Downstream layers should then be re-run to keep
    the campaign internally consistent (handled at the router level).
    """
    goal = campaign.get("goal", "")
    notes = (campaign.get("notes") or "") + ("\nRefine instructions: " + instructions if instructions else "")
    if layer == "reality":
        return await run_reality(client, goal, notes, intel, session_id)
    if layer == "creative":
        reality = campaign.get("reality") or {}
        return await run_creative(client, reality, intel, session_id + "-refine")
    if layer == "conversion":
        reality = campaign.get("reality") or {}
        creative = campaign.get("creative") or {}
        return await run_conversion(client, reality, creative, intel, session_id + "-refine")
    raise ValueError(f"Unknown layer: {layer}")


# ============ LEARNING LOOP EXTRACTOR ============
def extract_learning(campaign: dict) -> dict:
    """Pull the reusable intelligence out of a campaign to persist to the industry knowledge base."""
    tags = ((campaign.get("conversion") or {}).get("learning_tags") or {})
    reality = campaign.get("reality") or {}
    creative = campaign.get("creative") or {}
    hooks = [c.get("hook") for c in (creative.get("creative_concepts") or []) if c.get("hook")]
    return {
        "winning_hooks": (tags.get("predicted_winning_hooks") or []) + hooks,
        "winning_emotions": tags.get("predicted_winning_emotions") or [],
        "winning_offers": tags.get("predicted_winning_offers") or [],
        "customer_language": (tags.get("customer_language_captured") or [])
                             + ((reality.get("customer_reality") or {}).get("frustrations") or [])[:3],
        "objections": (tags.get("objections_addressed") or [])
                      + ((reality.get("customer_reality") or {}).get("objections") or []),
        "winning_angles": [c.get("name") for c in (creative.get("creative_concepts") or []) if c.get("name")],
    }
