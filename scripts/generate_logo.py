import asyncio
import os
import base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv("/app/backend/.env")

PROMPT = (
    "Evolve this existing brand logo into a refined premium Version 2 while keeping it "
    "immediately recognizable. Preserve the core train icon and its proportions. Add a sleek, "
    "elegant circular orbital track / motion line in electric blue (#3B82F6) that wraps around and "
    "flows through the train to represent traction, momentum and continuous growth — like a racing "
    "line or orbital path, integrated (not placed on top). Flat vector, minimalist, clean geometric "
    "construction. NO gradients, NO 3D, NO shadows. Keep the navy (#0B1020) train body and coral "
    "(#FF5A3C) growth-chart accent. Produce a clean version on a fully transparent OR pure white "
    "background, icon only (no text), perfectly centered, scalable from favicon to billboard."
)


async def main():
    with open("/app/frontend/public/logo-original.png", "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id="logo-v2-gen", system_message="You are an expert vector logo designer.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    msg = UserMessage(text=PROMPT, file_contents=[ImageContent(img_b64)])
    text, images = await chat.send_message_multimodal_response(msg)
    print("text:", (text or "")[:80])
    if images:
        image_bytes = base64.b64decode(images[0]["data"])
        out = "/app/frontend/public/logo-v2.png"
        with open(out, "wb") as f:
            f.write(image_bytes)
        print("SAVED", out, len(image_bytes))
    else:
        print("NO IMAGE RETURNED")


if __name__ == "__main__":
    asyncio.run(main())
