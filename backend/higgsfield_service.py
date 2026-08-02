"""Higgsfield AI media generation (image / image-to-video) for ad creative.

Base: https://platform.higgsfield.ai  Auth: `Authorization: Key KEY_ID:KEY_SECRET`
Async: POST /{model_slug} -> {request_id, status_url}; poll status_url until 'completed'.
This account exposes text2image (Soul/Popcorn) and image2video (DoP) models.
Video is generated as image -> image2video.
"""
import os
import asyncio
import logging
import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://platform.higgsfield.ai"
KEY_ID = os.environ.get("HIGGSFIELD_KEY_ID")
KEY_SECRET = os.environ.get("HIGGSFIELD_KEY_SECRET")

IMAGE_MODEL = os.environ.get("HIGGSFIELD_IMAGE_MODEL", "higgsfield-ai/soul/v2/standard")
VIDEO_MODEL = os.environ.get("HIGGSFIELD_VIDEO_MODEL", "higgsfield-ai/dop/turbo")

ALLOWED_AR = {"9:16", "16:9", "4:3", "3:4", "1:1", "2:3", "3:2"}
_AR_MAP = {"4:5": "3:4", "5:4": "4:3", "portrait": "3:4", "landscape": "16:9", "square": "1:1"}


class HiggsfieldError(RuntimeError):
    pass


def _headers():
    return {
        "Authorization": f"Key {KEY_ID}:{KEY_SECRET}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _norm_ar(ar: str, default: str = "3:4") -> str:
    if not ar:
        return default
    ar = _AR_MAP.get(ar, ar)
    return ar if ar in ALLOWED_AR else default


def _extract_media_url(data: dict):
    if not isinstance(data, dict):
        return None
    images = data.get("images") or data.get("results") or []
    if images and isinstance(images[0], dict):
        return images[0].get("url")
    for key in ("video", "output", "result"):
        node = data.get(key)
        if isinstance(node, dict):
            url = node.get("url") or _extract_media_url(node)
            if url:
                return url
    if isinstance(data.get("url"), str):
        return data["url"]
    return None


async def _submit_and_poll(client: httpx.AsyncClient, model: str, body: dict) -> str:
    resp = await client.post(f"/{model}", json=body)
    if resp.status_code == 403 and "credit" in resp.text.lower():
        raise HiggsfieldError("Your Higgsfield account is out of credits. Add credits at cloud.higgsfield.ai and try again.")
    if resp.status_code >= 400:
        raise HiggsfieldError(f"Higgsfield error ({resp.status_code}): {resp.text[:250]}")
    submitted = resp.json()
    immediate = _extract_media_url(submitted)
    request_id = submitted.get("request_id") or submitted.get("id")
    status_url = submitted.get("status_url")
    if immediate and not request_id:
        return immediate
    if not request_id and not status_url:
        raise HiggsfieldError(f"Unexpected Higgsfield response: {str(submitted)[:200]}")

    poll_target = status_url or f"{BASE_URL}/requests/{request_id}/status"
    for _ in range(150):  # up to ~5 min
        s = await client.get(poll_target)
        if s.status_code >= 400:
            raise HiggsfieldError(f"Higgsfield polling failed ({s.status_code}): {s.text[:200]}")
        result = s.json()
        status = (result.get("status") or "").lower()
        if status == "completed":
            url = _extract_media_url(result)
            if url:
                return url
            raise HiggsfieldError("Generation completed but no media URL was returned.")
        if status in {"failed", "nsfw", "canceled", "cancelled", "error"}:
            raise HiggsfieldError(f"Generation ended with status: {status}")
        await asyncio.sleep(2)
    raise HiggsfieldError("Generation timed out.")


async def generate_media(kind: str, prompt: str, aspect_ratio: str = "3:4") -> str:
    if not KEY_ID or not KEY_SECRET:
        raise HiggsfieldError("Higgsfield credentials are not configured.")
    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(base_url=BASE_URL, headers=_headers(), timeout=timeout) as client:
        if kind == "video":
            # image -> image2video
            img_url = await _submit_and_poll(client, IMAGE_MODEL,
                                              {"prompt": prompt, "aspect_ratio": _norm_ar(aspect_ratio, "9:16")})
            return await _submit_and_poll(client, VIDEO_MODEL, {"prompt": prompt, "image_url": img_url})
        return await _submit_and_poll(client, IMAGE_MODEL,
                                      {"prompt": prompt, "aspect_ratio": _norm_ar(aspect_ratio, "3:4")})
