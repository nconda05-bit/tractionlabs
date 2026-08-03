"""Traction Labs Intelligence — the shared knowledge base that gets smarter with every campaign.

Every agent (Ad Creator, Batch Spy, Ad Intel, Sales Coach, Campaign Engine, Client Brain) reads from
here so learnings compound across clients within the same industry. Every campaign / analysis writes
back the winning hooks, emotions, offers, angles, customer language, and objections it discovered.

Storage: Mongo collection `intelligence`. One document per (industry, kind, value) — unique-ish.
Aggregation via `get_intelligence(industry)` returns deduped top items ordered by weight.
"""
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


KINDS = ("winning_hooks", "winning_emotions", "winning_offers",
         "customer_language", "winning_angles", "objections")


def _now():
    return datetime.now(timezone.utc).isoformat()


def _norm_industry(ind: str) -> str:
    return (ind or "").strip().lower() or "general"


async def record_learning(db, industry: str, learning: dict, source: str = "campaign",
                          client_id: str = "", weight: int = 1):
    """Upsert learning tags into the industry knowledge base. Duplicates increment `weight`."""
    if not learning:
        return 0
    ind = _norm_industry(industry)
    written = 0
    for kind in KINDS:
        for value in (learning.get(kind) or []):
            v = (str(value) or "").strip()
            if not v or len(v) > 400:
                continue
            key = v.lower()[:400]
            existing = await db.intelligence.find_one({"industry": ind, "kind": kind, "key": key})
            if existing:
                await db.intelligence.update_one(
                    {"_id": existing["_id"]},
                    {"$inc": {"weight": weight}, "$set": {"updated_at": _now(), "last_source": source}},
                )
            else:
                await db.intelligence.insert_one({
                    "id": str(uuid.uuid4()),
                    "industry": ind,
                    "kind": kind,
                    "value": v,
                    "key": key,
                    "weight": weight,
                    "source": source,
                    "client_id": client_id,
                    "created_at": _now(),
                    "updated_at": _now(),
                })
            written += 1
    return written


async def get_intelligence(db, industry: str = "", client_id: str = "", limit: int = 6) -> dict:
    """Return top-weighted items per kind for the given industry (and cross-industry fallback)."""
    ind = _norm_industry(industry)
    out = {k: [] for k in KINDS}
    q_industry = {"industry": ind}
    q_any = {}
    for kind in KINDS:
        docs = await db.intelligence.find({**q_industry, "kind": kind}).sort("weight", -1).to_list(limit)
        if len(docs) < limit:
            more = await db.intelligence.find({**q_any, "kind": kind, "industry": {"$ne": ind}}
                                              ).sort("weight", -1).to_list(limit - len(docs))
            docs = docs + more
        out[kind] = [d.get("value") for d in docs if d.get("value")]
    return out


async def list_intelligence(db, industry: str = "", kind: str = "", limit: int = 500):
    q = {}
    if industry:
        q["industry"] = _norm_industry(industry)
    if kind in KINDS:
        q["kind"] = kind
    return await db.intelligence.find(q, {"_id": 0}).sort([("weight", -1), ("updated_at", -1)]).to_list(limit)


async def delete_intelligence(db, entry_id: str):
    await db.intelligence.delete_one({"id": entry_id})


def intel_prompt_block(intel: dict) -> str:
    """Compact text block to inject into ANY existing AI prompt so all agents share the brain."""
    if not intel:
        return ""
    lines = []
    label_map = {
        "winning_hooks": "Hooks proven in this niche",
        "winning_emotions": "Emotions that convert",
        "winning_offers": "Offers that convert",
        "customer_language": "Real customer language (reuse these words)",
        "winning_angles": "Angles marked WON",
        "objections": "Objections we've handled before",
    }
    for k, label in label_map.items():
        vals = intel.get(k) or []
        if vals:
            lines.append(f"- {label}: " + " | ".join(str(v)[:140] for v in vals[:5]))
    if not lines:
        return ""
    return ("\n\nTRACTION LABS INTELLIGENCE (learned from prior campaigns in this niche — lean into these):\n"
            + "\n".join(lines))
