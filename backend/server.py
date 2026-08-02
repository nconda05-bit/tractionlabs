from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Depends, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import httpx
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone

from auth_service import (
    hash_password, verify_password, create_access_token, decode_token,
)
import ai_service
import higgsfield_service
from pdf_utils import render_document_pdf

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Email (managed Resend)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Traction Labs")
LEAD_NOTIFICATION_EMAIL = os.environ.get("LEAD_NOTIFICATION_EMAIL", "delivered@resend.dev")

app = FastAPI(title="Traction Labs API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ==================== MODELS ====================
class BookingCreate(BaseModel):
    name: str
    business_name: str
    email: EmailStr
    phone: str
    industry: str
    budget: str
    goal: str
    date: str
    time_slot: str


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    business_name: str
    email: str
    phone: str
    industry: str
    budget: str
    goal: str
    date: str
    time_slot: str
    status: str = "new"
    created_at: str = Field(default_factory=now_iso)


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    message: str
    business_name: Optional[str] = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ClientCreate(BaseModel):
    business_name: str
    contact_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    website: Optional[str] = ""
    facebook: Optional[str] = ""
    industry: Optional[str] = ""
    services: Optional[List[str]] = []
    target_cities: Optional[List[str]] = []
    budget: Optional[str] = ""
    monthly_fee: Optional[float] = 0
    contract_status: Optional[str] = "none"
    status: Optional[str] = "active"
    notes: Optional[str] = ""


class ClientUpdate(BaseModel):
    business_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    facebook: Optional[str] = None
    industry: Optional[str] = None
    services: Optional[List[str]] = None
    target_cities: Optional[List[str]] = None
    budget: Optional[str] = None
    monthly_fee: Optional[float] = None
    contract_status: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    client_id: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "todo"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class OnboardingRequest(BaseModel):
    business_name: str
    website: Optional[str] = ""
    facebook: Optional[str] = ""
    industry: Optional[str] = ""
    offer: Optional[str] = ""
    service_area: Optional[str] = ""
    monthly_budget: Optional[str] = ""
    ideal_customer: Optional[str] = ""
    goals: Optional[str] = ""
    contact_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    monthly_fee: Optional[float] = 0


class AIQuestion(BaseModel):
    question: str


class DocGenerateRequest(BaseModel):
    client_id: str
    type: str  # proposal | contract | invoice
    monthly_fee: Optional[float] = None
    notes: Optional[str] = ""


# ==================== AUTH ====================
async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@api_router.post("/auth/login")
async def login(payload: LoginRequest):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return {
        "access_token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "")},
    }


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ==================== MARKETING (public) ====================
async def send_lead_email(subject: str, html: str, reply_to: Optional[str] = None) -> bool:
    if not EMAIL_KEY:
        return False
    payload = {"to": [LEAD_NOTIFICATION_EMAIL], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to:
        payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            resp = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Lead email failed: {e}")
        return False


def booking_email_html(b: Booking) -> str:
    rows = [("Name", b.name), ("Business", b.business_name), ("Email", b.email), ("Phone", b.phone),
            ("Industry", b.industry), ("Monthly budget", b.budget), ("Preferred date", b.date),
            ("Preferred time", b.time_slot), ("Main goal", b.goal)]
    trs = "".join(
        f'<tr><td style="padding:8px 14px;font-weight:600;color:#0B1020;border-bottom:1px solid #eef;">{k}</td>'
        f'<td style="padding:8px 14px;color:#334;border-bottom:1px solid #eef;">{v}</td></tr>' for k, v in rows)
    return f'<table width="100%" style="font-family:Arial;background:#f5f7fb;padding:24px;"><tr><td align="center">' \
           f'<table width="600" style="background:#fff;border-radius:12px;overflow:hidden;">' \
           f'<tr><td style="background:#0B1020;padding:24px;color:#fff;font-size:20px;font-weight:700;">New Growth Audit Request</td></tr>' \
           f'<tr><td><table width="100%">{trs}</table></td></tr></table></td></tr></table>'


@api_router.get("/")
async def root():
    return {"message": "Traction Labs API", "status": "ok"}


@api_router.get("/availability")
async def availability(date: str = Query(...)):
    booked = await db.bookings.find({"date": date}, {"_id": 0, "time_slot": 1}).to_list(100)
    booked_slots = {b["time_slot"] for b in booked}
    return {"date": date, "slots": [{"time": t, "available": t not in booked_slots} for t in TIME_SLOTS]}


@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate):
    if await db.bookings.find_one({"date": payload.date, "time_slot": payload.time_slot}):
        raise HTTPException(status_code=409, detail="That time slot was just booked. Please choose another.")
    booking = Booking(**payload.model_dump())
    await db.bookings.insert_one(booking.model_dump())
    await send_lead_email(f"New Growth Audit: {booking.business_name} ({booking.industry})",
                          booking_email_html(booking), reply_to=booking.email)
    return booking


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(user: dict = Depends(get_current_user)):
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Booking(**d) for d in docs]


@api_router.post("/contact")
async def create_contact(payload: ContactCreate):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.contacts.insert_one({**doc})
    await send_lead_email(f"New contact message from {payload.name}",
                          f"<p><b>{payload.name}</b> ({payload.email})<br/>{payload.business_name}</p><p>{payload.message}</p>",
                          reply_to=payload.email)
    return {"status": "success", "id": doc["id"]}


# ==================== CLIENTS ====================
@api_router.get("/clients")
async def list_clients(user: dict = Depends(get_current_user)):
    return await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.post("/clients")
async def create_client(payload: ClientCreate, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["ai_history"] = []
    doc["files"] = []
    await db.clients.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, payload: ClientUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.clients.update_one({"id": client_id}, {"$set": updates})
    c = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(get_current_user)):
    await db.clients.delete_one({"id": client_id})
    await db.tasks.delete_many({"client_id": client_id})
    await db.documents.delete_many({"client_id": client_id})
    return {"status": "deleted"}


# ==================== TASKS ====================
@api_router.get("/tasks")
async def list_tasks(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"client_id": client_id} if client_id else {}
    return await db.tasks.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.post("/tasks")
async def create_task(payload: TaskCreate, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.tasks.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.tasks.update_one({"id": task_id}, {"$set": updates})
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"id": task_id})
    return {"status": "deleted"}


# ==================== DASHBOARD ====================
@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    tasks = await db.tasks.find({"status": {"$ne": "done"}}, {"_id": 0}).to_list(1000)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    active = [c for c in clients if c.get("status") == "active"]
    onboarding = [c for c in clients if c.get("status") == "onboarding"]
    mrr = sum(float(c.get("monthly_fee") or 0) for c in active)
    tasks_today = [t for t in tasks if (t.get("due_date") or "")[:10] <= today]
    new_leads = await db.bookings.count_documents({"status": "new"})
    ad_spend = sum(float((c.get("metrics") or {}).get("spend") or 0) for c in clients)
    leads_generated = sum(int((c.get("metrics") or {}).get("leads") or 0) for c in clients)
    return {
        "stats": {
            "active_clients": len(active),
            "onboarding_clients": len(onboarding),
            "total_clients": len(clients),
            "mrr": round(mrr, 2),
            "ad_spend": round(ad_spend, 2),
            "leads_generated": leads_generated,
            "open_tasks": len(tasks),
            "tasks_today": len(tasks_today),
            "new_leads": new_leads,
        },
        "tasks_today": sorted(tasks_today, key=lambda t: (t.get("priority") != "high", t.get("due_date") or "")),
    }


def _clients_context(clients, tasks):
    lines = []
    for c in clients:
        ctasks = [t for t in tasks if t.get("client_id") == c["id"] and t.get("status") != "done"]
        lines.append(
            f"- {c.get('business_name')} [{c.get('industry','')}] status={c.get('status')} "
            f"fee=${c.get('monthly_fee',0)}/mo budget={c.get('budget','?')} "
            f"open_tasks={len(ctasks)} notes={(c.get('notes') or '')[:120]}"
        )
    return "\n".join(lines) if lines else "No clients yet."


@api_router.get("/ai/briefing")
async def ai_briefing(user: dict = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    name = user.get("name", "Nasir")
    hour = datetime.now(timezone.utc).hour
    part = "morning" if hour < 12 else ("afternoon" if hour < 18 else "evening")
    ctx = _clients_context(clients, tasks)
    open_tasks = [t for t in tasks if t.get("status") != "done"]
    try:
        data = await ai_service.ask_claude_json(
            system_message=(
                "Produce a short daily briefing for the agency owner. Return JSON with keys: "
                "'greeting' (1 sentence, start with 'Good {part}, {name}.'), "
                "'highlights' (array of 2-4 short strings about clients/tasks needing attention), "
                "'next_best_action' (object with 'title' 3-6 words and 'reason' 1 sentence)."
            ),
            prompt=(
                f"Owner name: {name}. Time of day: {part}. Open tasks: {len(open_tasks)}.\n"
                f"Clients:\n{ctx}\n\nTasks (open):\n" +
                "\n".join(f"- {t.get('title')} (due {t.get('due_date','n/a')}, {t.get('priority')})" for t in open_tasks[:15])
            ),
            session_id="briefing",
        )
        return data
    except Exception as e:
        logger.error(f"Briefing failed: {e}")
        return {
            "greeting": f"Good {part}, {name}.",
            "highlights": [f"You have {len(open_tasks)} open tasks and {len(clients)} clients."],
            "next_best_action": {"title": "Review your client list", "reason": "Add clients or the onboarding wizard to unlock AI insights."},
            "degraded": True,
        }


# ==================== ONBOARDING ====================
@api_router.post("/onboarding")
async def onboarding(payload: OnboardingRequest, user: dict = Depends(get_current_user)):
    p = payload.model_dump()
    strategy = None
    try:
        strategy = await ai_service.ask_claude_json(
            system_message=(
                "You are onboarding a new client. Return JSON with keys: "
                "'positioning' (1-2 sentences), 'target_audience' (1 sentence), "
                "'recommended_offer' (1-2 sentences), 'channel_plan' (array of 2-4 strings), "
                "'first_30_days' (array of 4-6 short action strings), "
                "'onboarding_checklist' (array of 5-8 short task strings for the agency to set the client up on Meta ads)."
            ),
            prompt=(
                f"New client onboarding answers:\n"
                f"Business: {p['business_name']}\nWebsite: {p['website']}\nFacebook: {p['facebook']}\n"
                f"Industry: {p['industry']}\nCurrent offer: {p['offer']}\nService area: {p['service_area']}\n"
                f"Monthly ad budget: {p['monthly_budget']}\nIdeal customer: {p['ideal_customer']}\nGoals: {p['goals']}"
            ),
            session_id="onboarding",
        )
    except Exception as e:
        logger.error(f"Onboarding AI failed: {e}")

    # Create client
    cid = str(uuid.uuid4())
    client_doc = {
        "id": cid, "business_name": p["business_name"], "contact_name": p.get("contact_name", ""),
        "email": p.get("email", ""), "phone": p.get("phone", ""), "website": p.get("website", ""),
        "facebook": p.get("facebook", ""), "industry": p.get("industry", ""), "services": [],
        "target_cities": [s.strip() for s in (p.get("service_area") or "").split(",") if s.strip()],
        "budget": p.get("monthly_budget", ""), "monthly_fee": p.get("monthly_fee") or 0,
        "contract_status": "pending", "status": "onboarding", "notes": p.get("goals", ""),
        "created_at": now_iso(), "ai_history": [], "files": [],
    }
    if strategy:
        client_doc["ai_history"].append({"type": "strategy", "created_at": now_iso(), "data": strategy})
    await db.clients.insert_one({**client_doc})

    # Create tasks from checklist + first_30_days
    created_tasks = []
    if strategy:
        for item in (strategy.get("onboarding_checklist") or []) + (strategy.get("first_30_days") or []):
            t = {"id": str(uuid.uuid4()), "client_id": cid, "title": item, "status": "todo",
                 "priority": "high", "due_date": None, "created_at": now_iso(), "source": "onboarding"}
            await db.tasks.insert_one({**t})
            created_tasks.append(t.get("title"))

    client_doc.pop("_id", None)
    return {"client": client_doc, "strategy": strategy, "tasks_created": len(created_tasks)}


# ==================== AI CLIENT BRAIN ====================
@api_router.post("/clients/{client_id}/analyze")
async def analyze_client(client_id: str, payload: AIQuestion, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    default_q = "Why might this client's ads not be converting? What should we improve?"
    question = payload.question or default_q
    try:
        data = await ai_service.ask_claude_json(
            system_message=(
                "Analyze this client's marketing and answer the owner's question. Consider landing page, "
                "ads, offer, tracking/pixel, and audience. Return JSON with keys: "
                "'summary' (2-3 sentences), 'findings' (array of objects {area, issue, recommendation}), "
                "'priority_actions' (array of 3-5 short action strings)."
            ),
            prompt=(
                f"Client data: {c.get('business_name')} | industry={c.get('industry')} | "
                f"website={c.get('website')} | facebook={c.get('facebook')} | offer/notes={c.get('notes')} | "
                f"cities={c.get('target_cities')} | budget={c.get('budget')} | services={c.get('services')}\n\n"
                f"Owner's question: {question}"
            ),
            session_id=f"brain-{client_id}",
        )
    except Exception as e:
        logger.error(f"Client Brain failed: {e}")
        raise HTTPException(status_code=502, detail="AI analysis failed. Please check the Claude API key and try again.")

    entry = {"type": "analysis", "created_at": now_iso(), "question": payload.question, "data": data}
    await db.clients.update_one({"id": client_id}, {"$push": {"ai_history": entry}})
    return data


# ==================== AI COO CHAT ====================
@api_router.post("/ai/coo")
async def ai_coo(payload: AIQuestion, user: dict = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    ctx = _clients_context(clients, tasks)
    try:
        answer = await ai_service.ask_claude(
            system_message=(
                "You are the AI COO of the agency. Answer the owner's question using the client and task "
                "context. Be direct and prioritized. Use short paragraphs or bullet points. If asked what to "
                "work on, give a ranked list with reasons."
            ),
            prompt=f"CLIENT & TASK CONTEXT:\n{ctx}\n\nOWNER'S QUESTION: {payload.question}",
            session_id="coo",
        )
    except Exception as e:
        logger.error(f"COO failed: {e}")
        raise HTTPException(status_code=502, detail="AI assistant failed. Please check the Claude API key and try again.")
    msg = {"role": "user", "content": payload.question, "at": now_iso()}
    reply = {"role": "assistant", "content": answer, "at": now_iso()}
    await db.ai_conversations.update_one(
        {"scope": "coo"},
        {"$push": {"messages": {"$each": [msg, reply]}}, "$setOnInsert": {"scope": "coo"}},
        upsert=True,
    )
    return {"answer": answer}


@api_router.get("/ai/coo/history")
async def coo_history(user: dict = Depends(get_current_user)):
    conv = await db.ai_conversations.find_one({"scope": "coo"}, {"_id": 0})
    return {"messages": (conv or {}).get("messages", [])[-40:]}


# ==================== DOCUMENTS ====================
@api_router.post("/documents/generate")
async def generate_document(payload: DocGenerateRequest, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": payload.client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    fee = payload.monthly_fee if payload.monthly_fee is not None else float(c.get("monthly_fee") or 0)
    dtype = payload.type.lower()
    if dtype not in ("proposal", "contract", "invoice"):
        raise HTTPException(status_code=400, detail="Invalid document type")

    type_instructions = {
        "proposal": ("Create a persuasive marketing proposal. Sections should include Overview, "
                     "What We'll Do (services), Growth System / Timeline, Investment. Include line_items "
                     "for pricing (e.g. monthly management fee) and a total."),
        "contract": ("Create a professional service agreement. Sections: Scope of Services, Term & Fees, "
                     "Client Responsibilities, Cancellation, Confidentiality. Include line_items for fees and total."),
        "invoice": ("Create an invoice. Keep sections minimal (Notes / Payment terms). Provide line_items with "
                    "descriptions and amounts and a total. Include an invoice-style short body."),
    }[dtype]

    try:
        data = await ai_service.ask_claude_json(
            system_message=(
                f"{type_instructions} Return JSON with keys: 'title' (string), "
                "'sections' (array of {heading, body}), 'line_items' (array of {description, amount as number}), "
                "'total' (number). Amounts are USD. Keep body text professional and concise."
            ),
            prompt=(
                f"Client: {c.get('business_name')} | contact={c.get('contact_name')} | industry={c.get('industry')} | "
                f"cities={c.get('target_cities')} | services={c.get('services')} | goals/notes={c.get('notes')}\n"
                f"Monthly fee: ${fee}. Extra notes: {payload.notes}"
            ),
            session_id=f"doc-{payload.client_id}",
        )
    except Exception as e:
        logger.error(f"Doc generation failed: {e}")
        raise HTTPException(status_code=502, detail="Document generation failed. Please check the Claude API key and try again.")

    doc = {
        "id": str(uuid.uuid4()),
        "client_id": payload.client_id,
        "type": dtype,
        "title": data.get("title") or f"{dtype.title()} for {c.get('business_name')}",
        "sections": data.get("sections", []),
        "meta": {"line_items": data.get("line_items", []), "total": data.get("total"), "monthly_fee": fee},
        "client_snapshot": {
            "business_name": c.get("business_name"), "contact_name": c.get("contact_name"),
            "email": c.get("email"),
        },
        "created_at": now_iso(),
    }
    await db.documents.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api_router.get("/documents")
async def list_documents(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"client_id": client_id} if client_id else {}
    return await db.documents.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/documents/{doc_id}")
async def get_document(doc_id: str, user: dict = Depends(get_current_user)):
    d = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    return d


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    await db.documents.delete_one({"id": doc_id})
    return {"status": "deleted"}


@api_router.get("/documents/{doc_id}/pdf")
async def document_pdf(doc_id: str, token: Optional[str] = None, request: Request = None):
    # allow token via query for direct download links
    if token:
        decode_token(token)
    else:
        await get_current_user(request)
    d = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    pdf_bytes = render_document_pdf(d)
    filename = f"{d.get('type','document')}-{(d.get('client_snapshot') or {}).get('business_name','client')}.pdf".replace(" ", "_")
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf",
                             headers={"Content-Disposition": f'inline; filename="{filename}"'})


# ==================== METRICS (manual now, Meta sync later) ====================
class MetricsUpdate(BaseModel):
    spend: Optional[float] = 0
    leads: Optional[int] = 0
    appointments: Optional[int] = 0
    revenue: Optional[float] = 0
    period: Optional[str] = ""  # e.g. "2026-08"


@api_router.put("/clients/{client_id}/metrics")
async def update_metrics(client_id: str, payload: MetricsUpdate, user: dict = Depends(get_current_user)):
    m = payload.model_dump()
    m["cpl"] = round((m.get("spend") or 0) / m["leads"], 2) if m.get("leads") else 0
    m["updated_at"] = now_iso()
    await db.clients.update_one({"id": client_id}, {"$set": {"metrics": m}})
    c = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


# ==================== AI SALES COACH ====================
class SalesPrepRequest(BaseModel):
    prospect_name: Optional[str] = ""
    business_name: str
    industry: Optional[str] = ""
    context: Optional[str] = ""  # notes about the prospect / prior spend etc.


class SalesScoreRequest(BaseModel):
    business_name: Optional[str] = ""
    transcript: str


@api_router.post("/sales/prep")
async def sales_prep(payload: SalesPrepRequest, user: dict = Depends(get_current_user)):
    try:
        data = await ai_service.ask_claude_json(
            system_message=(
                "You are a sales coach preparing the owner for a discovery/sales call with a local service "
                "business owner. Return JSON with keys: 'mindset' (1 sentence on the prospect's likely "
                "mindset/concerns), 'talking_points' (array of 3-5 short strings), 'objections' (array of "
                "{objection, response}), 'avoid' (array of 2-3 short things NOT to say), "
                "'close' (1-2 sentence recommended closing approach)."
            ),
            prompt=(
                f"Prospect: {payload.prospect_name} at {payload.business_name} "
                f"({payload.industry}). Context: {payload.context or 'No extra context.'}"
            ),
            session_id="sales-prep",
        )
    except Exception as e:
        logger.error(f"Sales prep failed: {e}")
        raise HTTPException(status_code=502, detail="Sales prep failed. Please check the Claude API key and try again.")
    doc = {"id": str(uuid.uuid4()), "type": "prep", "business_name": payload.business_name,
           "data": data, "created_at": now_iso()}
    await db.sales_sessions.insert_one({**doc})
    return data


@api_router.post("/sales/score")
async def sales_score(payload: SalesScoreRequest, user: dict = Depends(get_current_user)):
    try:
        data = await ai_service.ask_claude_json(
            system_message=(
                "You are a sales manager reviewing a sales call transcript. Return JSON with keys: "
                "'score' (0-100 integer overall), 'closing_probability' (0-100 integer), "
                "'strengths' (array of short strings), 'objections' (array of strings the prospect raised), "
                "'mistakes' (array of short strings), 'better_responses' (array of {situation, better_response}), "
                "'summary' (2-3 sentences)."
            ),
            prompt=f"Transcript:\n{payload.transcript[:12000]}",
            session_id="sales-score",
        )
    except Exception as e:
        logger.error(f"Sales score failed: {e}")
        raise HTTPException(status_code=502, detail="Call scoring failed. Please check the Claude API key and try again.")
    doc = {"id": str(uuid.uuid4()), "type": "score", "business_name": payload.business_name,
           "data": data, "created_at": now_iso()}
    await db.sales_sessions.insert_one({**doc})
    return data


@api_router.get("/sales/sessions")
async def sales_sessions(user: dict = Depends(get_current_user)):
    return await db.sales_sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ==================== AD CREATOR ====================
class AdCreateRequest(BaseModel):
    client_id: str
    prompt: Optional[str] = ""  # optional extra direction


@api_router.post("/ads/create")
async def create_ad_campaign(payload: AdCreateRequest, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": payload.client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    proven = await get_proven_angles(c.get("industry", ""), payload.client_id)
    angles_line = ("\nPROVEN ANGLES that have worked for this niche (lean into these): " + "; ".join(proven)) if proven else ""
    try:
        data = await ai_service.ask_claude_json(
            system_message=(
                "You are a performance marketer building a Facebook/Instagram lead-gen campaign for a local "
                "service business. Return JSON with keys: 'campaign_name', 'objective' (e.g. Lead Generation), "
                "'daily_budget' (string with $), 'audiences' (array of {name, targeting}), "
                "'ad_sets' (array of short strings describing ad set structure), "
                "'ads' (array of 3-4 objects {hook, headline, primary_text, cta, image_prompt}), "
                "'notes' (1-2 sentences on tracking/optimization)."
            ),
            prompt=(
                f"Client: {c.get('business_name')} | industry={c.get('industry')} | "
                f"cities={c.get('target_cities')} | services={c.get('services')} | budget={c.get('budget')} | "
                f"offer/notes={c.get('notes')}\nExtra direction: {payload.prompt or 'none'}{angles_line}"
            ),
            session_id=f"ads-{payload.client_id}",
        )
    except Exception as e:
        logger.error(f"Ad create failed: {e}")
        raise HTTPException(status_code=502, detail="Ad generation failed. Please check the Claude API key and try again.")
    doc = {"id": str(uuid.uuid4()), "client_id": payload.client_id,
           "client_name": c.get("business_name"), "data": data, "created_at": now_iso()}
    await db.ad_campaigns.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api_router.get("/ads")
async def list_ad_campaigns(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"client_id": client_id} if client_id else {}
    return await db.ad_campaigns.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.delete("/ads/{ad_id}")
async def delete_ad_campaign(ad_id: str, user: dict = Depends(get_current_user)):
    await db.ad_campaigns.delete_one({"id": ad_id})
    return {"status": "deleted"}


# ==================== AD VISUALS (Higgsfield) ====================
class VisualRequest(BaseModel):
    prompt: str
    kind: str = "image"  # image | video
    aspect_ratio: Optional[str] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None


async def run_visual_job(job_id: str, kind: str, prompt: str, aspect_ratio: str,
                         client_id: Optional[str] = None, client_name: Optional[str] = None):
    try:
        url = await higgsfield_service.generate_media(kind, prompt, aspect_ratio)
        await db.media_jobs.update_one({"id": job_id}, {"$set": {"status": "completed", "media_url": url}})
        # Save to the searchable creative library
        await db.creatives.insert_one({
            "id": str(uuid.uuid4()), "client_id": client_id, "client_name": client_name,
            "kind": kind, "prompt": prompt, "media_url": url, "created_at": now_iso(),
        })
    except Exception as e:
        await db.media_jobs.update_one({"id": job_id}, {"$set": {"status": "failed", "error": str(e)[:300]}})


@api_router.post("/ads/visual")
async def create_visual(payload: VisualRequest, background_tasks: BackgroundTasks,
                        user: dict = Depends(get_current_user)):
    kind = "video" if payload.kind == "video" else "image"
    ar = payload.aspect_ratio or ("9:16" if kind == "video" else "3:4")
    client_name = payload.client_name
    if payload.client_id and not client_name:
        c = await db.clients.find_one({"id": payload.client_id}, {"_id": 0, "business_name": 1})
        client_name = (c or {}).get("business_name")
    job = {"id": str(uuid.uuid4()), "status": "queued", "kind": kind, "prompt": payload.prompt,
           "media_url": None, "error": None, "created_at": now_iso()}
    await db.media_jobs.insert_one({**job})
    background_tasks.add_task(run_visual_job, job["id"], kind, payload.prompt, ar,
                              payload.client_id, client_name)
    job.pop("_id", None)
    return job


@api_router.get("/ads/visual/{job_id}")
async def get_visual(job_id: str, user: dict = Depends(get_current_user)):
    j = await db.media_jobs.find_one({"id": job_id}, {"_id": 0})
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return j


# ==================== COMPETITOR AD INTEL ====================
class CompetitorAnalyzeRequest(BaseModel):
    client_id: str
    competitor_text: Optional[str] = ""
    image_base64: Optional[str] = None
    competitor_name: Optional[str] = ""


@api_router.post("/ads/analyze-competitor")
async def analyze_competitor(payload: CompetitorAnalyzeRequest, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": payload.client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    if not payload.competitor_text and not payload.image_base64:
        raise HTTPException(status_code=400, detail="Provide competitor ad text and/or an image to analyze.")
    proven = await get_proven_angles(c.get("industry", ""), payload.client_id)
    angles_line = ("\nPROVEN ANGLES for this niche (favor building on these when recommending copy): " + "; ".join(proven)) if proven else ""
    try:
        data = await ai_service.ask_claude_json(
            system_message=(
                "You are a paid-ads strategist. Analyze the competitor ad provided (text and/or the attached "
                "image), then produce a plan to create a BETTER, more marketable ad for OUR client's niche. "
                "Return JSON with keys: 'breakdown' {hook, offer, angle, cta, emotional_triggers (array)}, "
                "'strengths' (array), 'weaknesses' (array), 'how_to_win' (array of specific tactics to beat it), "
                "'recommended_copy' {headline, primary_text, cta}, "
                "'higgsfield_prompt' (a single detailed, production-ready image-generation prompt describing the "
                "visual for our client's better ad — subject, setting, style, colors, mood; NO text overlay)."
            ),
            prompt=(
                f"OUR CLIENT: {c.get('business_name')} | industry={c.get('industry')} | "
                f"services={c.get('services')} | cities={c.get('target_cities')} | offer/notes={c.get('notes')}\n\n"
                f"COMPETITOR: {payload.competitor_name or 'Unknown'}\n"
                f"COMPETITOR AD TEXT: {payload.competitor_text or '(see attached image)'}{angles_line}"
            ),
            session_id=f"competitor-{payload.client_id}",
            image_b64=payload.image_base64,
        )
    except Exception as e:
        logger.error(f"Competitor analysis failed: {e}")
        raise HTTPException(status_code=502, detail="Competitor analysis failed. Please check the Claude API key and try again.")

    doc = {
        "id": str(uuid.uuid4()), "client_id": payload.client_id, "client_name": c.get("business_name"),
        "competitor_name": payload.competitor_name or "", "competitor_text": payload.competitor_text or "",
        "has_image": bool(payload.image_base64), "data": data, "created_at": now_iso(),
    }
    await db.competitor_analyses.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api_router.get("/ads/competitor-analyses")
async def list_competitor_analyses(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"client_id": client_id} if client_id else {}
    return await db.competitor_analyses.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)


@api_router.delete("/ads/competitor-analyses/{analysis_id}")
async def delete_competitor_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    await db.competitor_analyses.delete_one({"id": analysis_id})
    return {"status": "deleted"}


# ==================== WINNING ANGLE TRACKER ====================
class AngleCreate(BaseModel):
    client_id: str
    tactic: str
    source_analysis_id: Optional[str] = None
    status: Optional[str] = "reused"  # testing | reused | won


class AngleUpdate(BaseModel):
    status: Optional[str] = None
    outcome: Optional[str] = None


async def get_proven_angles(industry: str = "", client_id: str = "", limit: int = 8):
    """Return proven angle tactics for a niche (won first, then reused), for AI context."""
    q = {"$or": []}
    if industry:
        q["$or"].append({"industry": {"$regex": f"^{industry}$", "$options": "i"}})
    if client_id:
        q["$or"].append({"client_id": client_id})
    if not q["$or"]:
        return []
    docs = await db.angles.find(q, {"_id": 0}).to_list(200)
    docs.sort(key=lambda a: {"won": 0, "reused": 1, "testing": 2}.get(a.get("status"), 3))
    seen, out = set(), []
    for d in docs:
        t = (d.get("tactic") or "").strip()
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(f"[{d.get('status')}] {t}")
        if len(out) >= limit:
            break
    return out


@api_router.post("/angles")
async def create_angle(payload: AngleCreate, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": payload.client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    doc = {"id": str(uuid.uuid4()), "client_id": payload.client_id,
           "client_name": c.get("business_name"), "industry": c.get("industry", ""),
           "tactic": payload.tactic, "source_analysis_id": payload.source_analysis_id,
           "status": payload.status if payload.status in ("testing", "reused", "won") else "reused",
           "outcome": "", "created_at": now_iso()}
    await db.angles.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api_router.get("/angles")
async def list_angles(client_id: Optional[str] = None, industry: Optional[str] = None,
                      status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if client_id:
        q["client_id"] = client_id
    if industry:
        q["industry"] = {"$regex": f"^{industry}$", "$options": "i"}
    if status:
        q["status"] = status
    return await db.angles.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.put("/angles/{angle_id}")
async def update_angle(angle_id: str, payload: AngleUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "status" in updates and updates["status"] not in ("testing", "reused", "won"):
        updates.pop("status")
    if updates:
        await db.angles.update_one({"id": angle_id}, {"$set": updates})
    a = await db.angles.find_one({"id": angle_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Angle not found")
    return a


@api_router.delete("/angles/{angle_id}")
async def delete_angle(angle_id: str, user: dict = Depends(get_current_user)):
    await db.angles.delete_one({"id": angle_id})
    return {"status": "deleted"}


# ==================== CREATIVE LIBRARY ====================
@api_router.get("/creatives")
async def list_creatives(client_id: Optional[str] = None, q: Optional[str] = None,
                         kind: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if client_id:
        query["client_id"] = client_id
    if kind in ("image", "video"):
        query["kind"] = kind
    if q:
        query["prompt"] = {"$regex": q, "$options": "i"}
    return await db.creatives.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.delete("/creatives/{creative_id}")
async def delete_creative(creative_id: str, user: dict = Depends(get_current_user)):
    await db.creatives.delete_one({"id": creative_id})
    return {"status": "deleted"}


# ==================== CLIENT PORTAL & REPORTS ====================
class ReportRequest(BaseModel):
    client_id: str
    period: Optional[str] = ""  # e.g. "August 2026"


@api_router.post("/reports/generate")
async def generate_report(payload: ReportRequest, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": payload.client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    metrics = c.get("metrics") or {}
    period = payload.period or datetime.now(timezone.utc).strftime("%B %Y")
    try:
        data = await ai_service.ask_claude_json(
            system_message=(
                "You are writing a client-facing monthly performance report for a local service business. "
                "Be professional, positive but honest, and never invent numbers beyond those provided. "
                "Return JSON with keys: 'headline' (1 short line), 'summary' (2-3 sentences), "
                "'wins' (array of 3-4 short strings), 'metrics_narrative' (1-2 sentences interpreting the "
                "numbers provided), 'next_month' (array of 3-4 short focus strings)."
            ),
            prompt=(
                f"Client: {c.get('business_name')} ({c.get('industry')}). Period: {period}.\n"
                f"Metrics provided: spend=${metrics.get('spend',0)}, leads={metrics.get('leads',0)}, "
                f"cost_per_lead=${metrics.get('cpl',0)}, appointments={metrics.get('appointments',0)}, "
                f"revenue=${metrics.get('revenue',0)}. Goals/notes: {c.get('notes')}"
            ),
            session_id=f"report-{payload.client_id}",
        )
    except Exception as e:
        logger.error(f"Report failed: {e}")
        raise HTTPException(status_code=502, detail="Report generation failed. Please check the Claude API key and try again.")
    report = {
        "id": str(uuid.uuid4()),
        "client_id": payload.client_id,
        "client_name": c.get("business_name"),
        "industry": c.get("industry"),
        "period": period,
        "metrics": {"spend": metrics.get("spend", 0), "leads": metrics.get("leads", 0),
                    "cpl": metrics.get("cpl", 0), "appointments": metrics.get("appointments", 0),
                    "revenue": metrics.get("revenue", 0)},
        "content": data,
        "share_token": uuid.uuid4().hex,
        "created_at": now_iso(),
    }
    await db.reports.insert_one({**report})
    report.pop("_id", None)
    return report


@api_router.get("/reports")
async def list_reports(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"client_id": client_id} if client_id else {}
    return await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.delete("/reports/{report_id}")
async def delete_report(report_id: str, user: dict = Depends(get_current_user)):
    await db.reports.delete_one({"id": report_id})
    return {"status": "deleted"}


@api_router.get("/portal/{share_token}")
async def portal_report(share_token: str):
    """PUBLIC endpoint — clients view their branded report via share link (no auth)."""
    r = await db.reports.find_one({"share_token": share_token}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return r


# ==================== APP WIRING ====================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.clients.create_index("id")
    await db.tasks.create_index("id")
    await db.documents.create_index("id")
    # seed admin
    email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    name = os.environ.get("ADMIN_NAME", "Admin")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": email, "name": name,
            "password_hash": hash_password(password), "role": "admin", "created_at": now_iso(),
        })
        logger.info(f"Seeded admin {email}")
    elif not verify_password(password, existing.get("password_hash", "")):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "name": name}})
        logger.info("Updated admin password")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
