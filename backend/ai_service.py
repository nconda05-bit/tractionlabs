"""Claude (Anthropic) helper using the user's own Anthropic key via emergentintegrations."""
import os
import json
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)

ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")

BRAND = (
    "You are the AI operating system for 'Traction Labs', an AI-powered digital marketing agency run by "
    "Nasir. Traction Labs builds customer acquisition systems (paid ads, landing pages, tracking, follow-up) "
    "for local service businesses (HVAC, roofing, landscaping, contracting, plumbing, painting). "
    "Be sharp, concise, practical and results-focused. Never invent fake metrics."
)


async def ask_claude(system_message: str, prompt: str, session_id: str = "traction", image_b64: str = None, max_tokens: int = 4000) -> str:
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    chat = LlmChat(
        api_key=ANTHROPIC_KEY,
        session_id=session_id,
        system_message=f"{BRAND}\n\n{system_message}",
    ).with_model("anthropic", CLAUDE_MODEL).with_params(max_tokens=max_tokens)
    try:
        if image_b64:
            msg = UserMessage(text=prompt, file_contents=[ImageContent(image_b64)])
        else:
            msg = UserMessage(text=prompt)
        resp = await chat.send_message(msg)
        if isinstance(resp, str):
            return resp
        return getattr(resp, "text", str(resp))
    except Exception as e:
        logger.error(f"Claude call failed: {e}")
        raise


def _extract_json(text: str):
    """Best-effort extraction of a JSON object/array from an LLM response."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    # find first { or [ and last } or ]
    for open_c, close_c in (("{", "}"), ("[", "]")):
        s = text.find(open_c)
        e = text.rfind(close_c)
        if s != -1 and e != -1 and e > s:
            try:
                return json.loads(text[s : e + 1])
            except Exception:
                continue
    return None


async def ask_claude_json(system_message: str, prompt: str, session_id: str = "traction", image_b64: str = None, max_tokens: int = 8000):
    full = (
        f"{system_message}\n\nRespond with ONLY valid JSON. No markdown, no commentary, no code fences."
    )
    raw = await ask_claude(full, prompt, session_id=session_id, image_b64=image_b64, max_tokens=max_tokens)
    data = _extract_json(raw)
    if data is None:
        raise ValueError(f"Could not parse JSON from Claude response: {raw[:200]}")
    return data
