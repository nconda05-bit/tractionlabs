from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Email (Emergent managed Resend)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Traction Labs")
LEAD_NOTIFICATION_EMAIL = os.environ.get("LEAD_NOTIFICATION_EMAIL", "delivered@resend.dev")

app = FastAPI(title="Traction Labs API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---- Booking availability config ----
TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"]


# ---- Models ----
class BookingCreate(BaseModel):
    name: str
    business_name: str
    email: EmailStr
    phone: str
    industry: str
    budget: str
    goal: str
    date: str          # YYYY-MM-DD
    time_slot: str      # e.g. "10:00"


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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    message: str
    business_name: Optional[str] = ""


# ---- Email helper ----
async def send_lead_email(subject: str, html: str, reply_to: Optional[str] = None) -> bool:
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY missing; skipping email send")
        return False
    payload = {
        "to": [LEAD_NOTIFICATION_EMAIL],
        "subject": subject,
        "html": html,
        "from_name": EMAIL_FROM_NAME,
    }
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
    rows = [
        ("Name", b.name), ("Business", b.business_name), ("Email", b.email),
        ("Phone", b.phone), ("Industry", b.industry), ("Monthly budget", b.budget),
        ("Preferred date", b.date), ("Preferred time", b.time_slot), ("Main goal", b.goal),
    ]
    trs = "".join(
        f'<tr><td style="padding:8px 14px;font-weight:600;color:#0B1020;border-bottom:1px solid #eef;">{k}</td>'
        f'<td style="padding:8px 14px;color:#334;border-bottom:1px solid #eef;">{v}</td></tr>'
        for k, v in rows
    )
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#0B1020;padding:24px;color:#fff;font-size:20px;font-weight:700;">
            New Growth Audit Request &mdash; Traction Labs</td></tr>
          <tr><td style="padding:8px 0;"><table width="100%" cellpadding="0" cellspacing="0">{trs}</table></td></tr>
          <tr><td style="padding:16px 14px;color:#64748B;font-size:12px;">Submitted {b.created_at}</td></tr>
        </table>
      </td></tr>
    </table>"""


# ---- Routes ----
@api_router.get("/")
async def root():
    return {"message": "Traction Labs API", "status": "ok"}


@api_router.get("/availability")
async def availability(date: str = Query(...)):
    booked = await db.bookings.find({"date": date}, {"_id": 0, "time_slot": 1}).to_list(100)
    booked_slots = {b["time_slot"] for b in booked}
    slots = [{"time": t, "available": t not in booked_slots} for t in TIME_SLOTS]
    return {"date": date, "slots": slots}


@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate):
    # prevent double booking of the same slot
    existing = await db.bookings.find_one({"date": payload.date, "time_slot": payload.time_slot})
    if existing:
        raise HTTPException(status_code=409, detail="That time slot was just booked. Please choose another.")
    booking = Booking(**payload.model_dump())
    await db.bookings.insert_one(booking.model_dump())
    await send_lead_email(
        subject=f"New Growth Audit: {booking.business_name} ({booking.industry})",
        html=booking_email_html(booking),
        reply_to=booking.email,
    )
    return booking


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings():
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Booking(**d) for d in docs]


@api_router.post("/contact")
async def create_contact(payload: ContactCreate):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.contacts.insert_one({**doc})
    await send_lead_email(
        subject=f"New contact message from {payload.name}",
        html=f"<p><b>{payload.name}</b> ({payload.email})<br/>{payload.business_name}</p><p>{payload.message}</p>",
        reply_to=payload.email,
    )
    return {"status": "success", "id": doc["id"]}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
