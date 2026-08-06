"""Traction Labs Value Engine — sales-prep + ROI calculator + AI-generated pitch + branded PDF proposal.

Used by the agency owner BEFORE a sales call with a prospect. Uses industry templates to prefill
typical margins, then computes lead / profit / ROI / break-even math, generates a personalized
sales script via Claude (grounded in the shared Intelligence brain for that industry), and can
render a branded PDF proposal built from the prospect's own numbers.
"""
from typing import Optional
import ai_service


# ---------- Industry templates ----------
INDUSTRY_TEMPLATES = {
    "hvac": {
        "label": "HVAC / A-C service",
        "avg_ticket": 6500,
        "gross_margin_pct": 45,
        "close_rate_pct": 30,
        "target_cpl": 55,
        "monthly_leads_typical": 30,
        "capacity_monthly": 60,
        "objections": [
            "We already have a marketing person",
            "Referrals bring us most of our work",
            "We tried Google Ads and it didn't work",
            "That fee is expensive"
        ],
        "closing_angles": [
            "The revenue math on installs vs. tune-ups",
            "Every un-serviced AC in summer is a lost $7k install",
            "Fill the calendar even when the phone stops ringing"
        ],
    },
    "roofing": {
        "label": "Roofing",
        "avg_ticket": 12000,
        "gross_margin_pct": 30,
        "close_rate_pct": 22,
        "target_cpl": 85,
        "monthly_leads_typical": 20,
        "capacity_monthly": 25,
        "objections": [
            "Storm chasers already saturate this market",
            "Insurance work is unpredictable",
            "I don't want cheap leads that waste my crew's time"
        ],
        "closing_angles": [
            "One extra full roof pays for a full year of Traction Labs",
            "Own the neighborhood post-storm before the chasers arrive",
            "Pre-qualify leads so your estimator only sees decision-makers"
        ],
    },
    "landscaping": {
        "label": "Landscaping / lawn care",
        "avg_ticket": 3200,
        "gross_margin_pct": 40,
        "close_rate_pct": 35,
        "target_cpl": 45,
        "monthly_leads_typical": 40,
        "capacity_monthly": 80,
        "objections": [
            "Season is short — not sure ads are worth it",
            "My guys already knock doors",
            "Every landscaper looks the same online"
        ],
        "closing_angles": [
            "Own the pre-season before the phone starts ringing",
            "Recurring maintenance contracts vs. one-off jobs",
            "Neighbor-effect targeting — one lawn = five referrals"
        ],
    },
    "dentists": {
        "label": "Dental practice",
        "avg_ticket": 2800,
        "gross_margin_pct": 55,
        "close_rate_pct": 45,
        "target_cpl": 60,
        "monthly_leads_typical": 35,
        "capacity_monthly": 100,
        "objections": [
            "Insurance patients are our bread and butter",
            "We tried Groupon and got the wrong crowd",
            "Ads bring us kids and cheap cleanings, not implants"
        ],
        "closing_angles": [
            "Target high-LTV cases (implants, Invisalign, veneers) — not $99 cleanings",
            "Fill the empty chair hours = pure margin",
            "Cash-pay patients dodge the insurance grind"
        ],
    },
    "gyms": {
        "label": "Gym / fitness studio",
        "avg_ticket": 1400,
        "gross_margin_pct": 70,
        "close_rate_pct": 40,
        "target_cpl": 25,
        "monthly_leads_typical": 60,
        "capacity_monthly": 120,
        "objections": [
            "New Year is the only real window",
            "Our members come from referrals",
            "Ads bring in tire-kickers"
        ],
        "closing_angles": [
            "6-week challenge funnels that convert to 12-month memberships",
            "Every member = ~$1,400 LTV, so CPL up to $50 is a steal",
            "Own the market between January and summer, not just January"
        ],
    },
    "other": {
        "label": "Other local service",
        "avg_ticket": 3000,
        "gross_margin_pct": 40,
        "close_rate_pct": 30,
        "target_cpl": 50,
        "monthly_leads_typical": 30,
        "capacity_monthly": 60,
        "objections": [], "closing_angles": [],
    },
}


def get_templates() -> dict:
    return INDUSTRY_TEMPLATES


# ---------- Math ----------
def calculate(inputs: dict) -> dict:
    """Pure math. All inputs are numbers (or coerced)."""
    def n(v, default=0.0):
        try:
            return float(v)
        except (TypeError, ValueError):
            return float(default)

    avg_ticket = n(inputs.get("avg_ticket"))
    gross_margin_pct = n(inputs.get("gross_margin_pct"))
    close_rate_pct = n(inputs.get("close_rate_pct"))
    ad_spend = n(inputs.get("ad_spend"))
    fee = n(inputs.get("proposed_fee"))
    target_cpl = n(inputs.get("target_cpl"), 50)
    current_leads = n(inputs.get("current_leads"))
    capacity_monthly = n(inputs.get("capacity_monthly"), 999999)

    profit_per_customer = avg_ticket * (gross_margin_pct / 100.0)

    def scenario(cpl: float) -> dict:
        cpl = max(cpl, 1.0)
        projected_leads = ad_spend / cpl if ad_spend > 0 else current_leads
        new_customers = projected_leads * (close_rate_pct / 100.0)
        booked_customers = min(new_customers, capacity_monthly)
        new_revenue = booked_customers * avg_ticket
        new_profit = booked_customers * profit_per_customer
        net_profit_after_fee = new_profit - fee - ad_spend
        roi_pct = ((net_profit_after_fee) / fee * 100.0) if fee > 0 else 0.0
        return {
            "cpl": round(cpl, 2),
            "projected_leads": round(projected_leads, 1),
            "new_customers": round(booked_customers, 1),
            "new_revenue": round(new_revenue, 2),
            "new_profit": round(new_profit, 2),
            "net_profit_after_fee": round(net_profit_after_fee, 2),
            "roi_pct": round(roi_pct, 1),
        }

    conservative = scenario(target_cpl * 1.5)
    target = scenario(target_cpl)
    stretch = scenario(target_cpl * 0.75)

    # Break-even
    breakeven_customers = ((fee + ad_spend) / profit_per_customer) if profit_per_customer > 0 else 0
    breakeven_leads = (breakeven_customers / (close_rate_pct / 100.0)) if close_rate_pct > 0 else 0

    # Current baseline (before Traction Labs)
    baseline_customers = current_leads * (close_rate_pct / 100.0)
    baseline_profit = baseline_customers * profit_per_customer

    return {
        "profit_per_customer": round(profit_per_customer, 2),
        "baseline": {
            "leads": round(current_leads, 1),
            "customers": round(baseline_customers, 1),
            "profit": round(baseline_profit, 2),
        },
        "scenarios": {
            "conservative": conservative,
            "target": target,
            "stretch": stretch,
        },
        "breakeven": {
            "customers": round(breakeven_customers, 1),
            "leads": round(breakeven_leads, 1),
        },
        "twelve_month_target_profit": round(target["new_profit"] * 12, 2),
        "twelve_month_target_roi_pct": target["roi_pct"],  # roi is monthly ratio; annual ratio same on ratios
    }


# ---------- AI script ----------
async def generate_script(inputs: dict, calc: dict, intel_block: str, session_id: str) -> dict:
    industry = (inputs.get("industry") or "other").lower()
    tpl = INDUSTRY_TEMPLATES.get(industry, INDUSTRY_TEMPLATES["other"])
    tpl_objections = tpl.get("objections") or []
    tpl_angles = tpl.get("closing_angles") or []

    system = (
        "You are the head of sales at Traction Labs — an AI-powered customer acquisition agency. "
        "You are preparing the agency owner for a live sales call with a real prospect. Follow the "
        "Traction Labs philosophy: understand the human first, then bridge their problem to the "
        "solution. The pitch MUST be built on the prospect's ACTUAL numbers so it feels custom, not "
        "generic. Never fabricate stats — only use the numbers provided. Keep language plain, "
        "conversational, and human. No corporate fluff. Return JSON EXACTLY as:\n"
        "{\n"
        "  \"opening_hook\": string (2 sentences to earn the first 30 seconds),\n"
        "  \"pain_diagnosis\": string (3-5 sentences naming what's really costing them money right now),\n"
        "  \"value_pitch\": string (4-6 sentences that walks them through THEIR own numbers — leads, close rate, ticket, profit — and shows the extra profit they'd unlock with us),\n"
        "  \"differentiators\": [string, ...] (3-5 short bullets on why Traction Labs is different, not another agency),\n"
        "  \"objection_playbook\": [\n"
        "    {\"objection\": string, \"reframe\": string, \"one_liner\": string} // 4-6 objections, use the ones provided and add any obvious ones\n"
        "  ],\n"
        "  \"close\": string (a soft, decision-forcing close — offer a small yes),\n"
        "  \"fallback_offers\": [string, ...] (2 smaller-commitment offers if they hesitate — e.g. audit call, 30-day pilot),\n"
        "  \"one_page_summary\": string (a 4-5 sentence summary the agency owner can read verbatim if they only have 60 seconds)\n"
        "}"
    )
    prompt = (
        f"PROSPECT: {inputs.get('business_name') or 'this prospect'}"
        f" | industry={tpl.get('label')} | city={inputs.get('city') or 'their market'}"
        f" | contact={inputs.get('contact_name') or 'the owner'}\n"
        f"THEIR NUMBERS: avg_ticket=${inputs.get('avg_ticket')} | gross_margin={inputs.get('gross_margin_pct')}%"
        f" | close_rate={inputs.get('close_rate_pct')}% | current_monthly_leads={inputs.get('current_leads')}"
        f" | current_ad_spend=${inputs.get('ad_spend')} | monthly_capacity={inputs.get('capacity_monthly')}\n"
        f"MY OFFER: fee=${inputs.get('proposed_fee')}/month | target CPL=${inputs.get('target_cpl')}\n"
        f"CALCULATED PROJECTIONS (target scenario):\n"
        f"  - profit per customer: ${calc.get('profit_per_customer')}\n"
        f"  - new customers/month: {calc['scenarios']['target']['new_customers']}\n"
        f"  - new profit/month: ${calc['scenarios']['target']['new_profit']}\n"
        f"  - net profit AFTER our fee + ad spend: ${calc['scenarios']['target']['net_profit_after_fee']}\n"
        f"  - ROI on our fee: {calc['scenarios']['target']['roi_pct']}%\n"
        f"  - break-even: only {calc['breakeven']['customers']} new customers needed\n"
        f"CONSERVATIVE case: {calc['scenarios']['conservative']['new_customers']} customers, "
        f"${calc['scenarios']['conservative']['net_profit_after_fee']} net profit.\n"
        f"STRETCH case: {calc['scenarios']['stretch']['new_customers']} customers, "
        f"${calc['scenarios']['stretch']['net_profit_after_fee']} net profit.\n"
        f"COMMON OBJECTIONS in this vertical: {tpl_objections}\n"
        f"PROVEN CLOSING ANGLES in this vertical: {tpl_angles}\n"
        f"NOTES ABOUT THE PROSPECT: {inputs.get('notes') or 'none'}"
        f"{intel_block}"
    )
    return await ai_service.ask_claude_json(
        system_message=system, prompt=prompt, session_id=session_id, max_tokens=4000,
    )


# ---------- Proposal doc (fed to pdf_utils.render_document_pdf) ----------
def build_proposal_doc(inputs: dict, calc: dict, script: Optional[dict] = None) -> dict:
    tpl = INDUSTRY_TEMPLATES.get((inputs.get("industry") or "other").lower(), INDUSTRY_TEMPLATES["other"])
    scen = calc["scenarios"]["target"]
    cons = calc["scenarios"]["conservative"]
    stretch = calc["scenarios"]["stretch"]

    def money(v):
        try:
            return "${:,.0f}".format(float(v))
        except Exception:
            return "$0"

    def pct(v):
        try:
            return f"{float(v):.0f}%"
        except Exception:
            return "0%"

    reality = (
        f"Average ticket: {money(inputs.get('avg_ticket'))}\n"
        f"Gross margin: {pct(inputs.get('gross_margin_pct'))}  →  profit per customer: {money(calc['profit_per_customer'])}\n"
        f"Close rate: {pct(inputs.get('close_rate_pct'))}\n"
        f"Monthly leads today: {inputs.get('current_leads')}  →  ~{calc['baseline']['customers']} customers  →  {money(calc['baseline']['profit'])} profit / month\n"
        f"Current ad spend: {money(inputs.get('ad_spend'))}"
    )

    target = (
        f"Target CPL: {money(inputs.get('target_cpl'))}\n"
        f"Projected leads / month: {scen['projected_leads']}\n"
        f"Projected new customers / month: {scen['new_customers']}\n"
        f"New revenue / month: {money(scen['new_revenue'])}\n"
        f"New profit / month: {money(scen['new_profit'])}\n"
        f"NET profit after fee + ad spend: {money(scen['net_profit_after_fee'])}\n"
        f"ROI on Traction Labs fee: {pct(scen['roi_pct'])}\n"
        f"Break-even: only {calc['breakeven']['customers']} new customers / month"
    )

    range_body = (
        f"Conservative — {cons['new_customers']} customers · {money(cons['net_profit_after_fee'])} net profit / month\n"
        f"Target — {scen['new_customers']} customers · {money(scen['net_profit_after_fee'])} net profit / month\n"
        f"Stretch — {stretch['new_customers']} customers · {money(stretch['net_profit_after_fee'])} net profit / month\n"
        f"12-month target profit: {money(calc['twelve_month_target_profit'])}"
    )

    diffs = (script or {}).get("differentiators") or []
    why_body = (
        "\n".join(f"• {d}" for d in diffs)
        if diffs else
        "Human-first campaigns built on a shared intelligence brain that gets sharper with every client in your niche."
    )

    obj_lines = []
    for o in ((script or {}).get("objection_playbook") or []):
        if o.get("objection"):
            obj_lines.append(f"• {o.get('objection')}\n   → {o.get('reframe','')}")
    objections_body = "\n".join(obj_lines)

    close_body = (script or {}).get("close") or (
        "A 30-minute kickoff to lock in targeting, offer, and creative direction. First campaign live within 7 business days."
    )

    sections = [
        {"heading": f"Prepared for {inputs.get('business_name') or 'Your Business'} — {tpl.get('label')}",
         "body": (script or {}).get("value_pitch")
                 or "A performance-driven customer acquisition engine built for your exact market."},
        {"heading": "Your reality today", "body": reality},
        {"heading": "The target scenario", "body": target},
        {"heading": "Range of outcomes", "body": range_body},
        {"heading": "Why Traction Labs", "body": why_body},
        {"heading": "Investment",
         "body": f"Traction Labs management fee: {money(inputs.get('proposed_fee'))} / month\nRecommended ad spend: {money(inputs.get('ad_spend'))} / month"},
    ]
    if objections_body:
        sections.append({"heading": "Common concerns, addressed", "body": objections_body})
    sections.append({"heading": "Next step", "body": close_body})

    return {
        "title": f"Customer Acquisition Proposal — {inputs.get('business_name') or 'Prospect'}",
        "type": "proposal",
        "client_snapshot": {
            "business_name": inputs.get("business_name") or "",
            "contact_name": inputs.get("contact_name") or "",
            "email": inputs.get("email") or "",
        },
        "sections": sections,
        "meta": {
            "line_items": [
                {"description": "Traction Labs management fee", "amount": inputs.get("proposed_fee") or 0},
                {"description": "Recommended monthly ad spend", "amount": inputs.get("ad_spend") or 0},
            ],
            "total": (float(inputs.get("proposed_fee") or 0) + float(inputs.get("ad_spend") or 0)),
        },
    }
