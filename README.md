# Traction Labs — AI-Powered Customer Acquisition OS

A full-stack agency operating system that combines a public marketing site with a private
Agency OS dashboard. The dashboard is powered by an interconnected 12-agent AI intelligence
system that plans campaigns, spies on competitors, tracks winning angles, and generates
sales assets grounded in a shared knowledge base that gets smarter with every client.

Public preview: this repo is a snapshot of the app deployed at `https://tractionlabs.online`.

## Feature map

| Area | What it does |
| --- | --- |
| Marketing site | Home / Services / Process / About / Contact — Framer Motion + Lenis smooth scrolling |
| Auth | JWT admin auth; seeded admin from env vars |
| Client CRM | Client workspaces, metrics, tasks, notes, AI Brain (Claude) |
| **Campaign Engine** | 12-agent chained AI system: Reality → Creative → Conversion. Runs async, streams layers into the UI, supports per-layer Refine with cascade |
| **Traction Labs Intelligence** | Shared knowledge base keyed by industry. Every WON campaign pushes winning hooks / emotions / offers / angles / customer language back into it, and every AI agent reads from it |
| **Value Engine** | Sales-prep tool for prospects: industry templates, live ROI / profit / break-even calculators, Deal Health score 0-100, AI sales script grounded in the Intelligence brain, branded PDF proposal |
| Ad Creator | Claude-generated Meta/Google ad packages with visual prompts |
| Ad Intel | Analyze a single competitor ad and produce a plan to beat it |
| **Batch Spy** | Drop 2-10 competitor ads at once — ranked scores, market gaps, "beat-them-all" campaign brief |
| Winning Angle Tracker | Persist competitor tactics per client, promote Won angles into the brain |
| Creative Library | Higgsfield AI image/video generation for ad creatives |
| Document Generators | Proposal / Contract / Invoice → branded PDF via xhtml2pdf |
| Onboarding | Guided AI wizard that builds a client's initial workspace |

## Tech stack

- **Backend**: FastAPI + Motor (async MongoDB), Python 3.11+
- **Frontend**: React 19 + React Router + Tailwind + shadcn/ui + Framer Motion + Lenis
- **DB**: MongoDB
- **AI**: Claude (Anthropic) via `emergentintegrations`, Higgsfield AI (image/video), Resend (email)
- **PDF**: xhtml2pdf (in-memory)

## Repository layout

```
/backend
  server.py              # FastAPI app + all /api routes
  ai_service.py          # Claude wrapper (with_params max_tokens, image support)
  campaign_engine.py     # 3-layer chained agent system (Reality/Creative/Conversion)
  intelligence_service.py# Shared knowledge base read/write
  value_engine_service.py# Industry templates, ROI math, deal health score, sales script
  higgsfield_service.py  # Higgsfield image/video
  auth_service.py        # JWT
  pdf_utils.py           # xhtml2pdf branded document renderer
  requirements.txt

/frontend
  src/
    pages/               # Public marketing pages
    dashboard/           # Private Agency OS components
      CampaignEngine.jsx
      Intelligence.jsx
      ValueEngine.jsx
      ClientDetail.jsx
      ClientTools.jsx    # AdCreator, AdIntel, BatchSpy, SalesCoach, etc.
      ...
    components/ui/       # shadcn/ui primitives
    lib/api.js           # axios instance + auth header
  package.json
```

## Running locally

### Prerequisites

- Node 18+ (yarn), Python 3.11+, a running MongoDB instance
- API keys: Anthropic (Claude), Higgsfield (optional — image gen)

### 1. Backend

```bash
cd backend
cp .env.example .env           # then fill in real values
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The admin account defined by `ADMIN_EMAIL` / `ADMIN_PASSWORD` is seeded on first startup.

### 2. Frontend

```bash
cd frontend
cp .env.example .env           # set REACT_APP_BACKEND_URL to http://localhost:8001
yarn install
yarn start                     # opens on http://localhost:3000
```

Log in at `/login` with the admin credentials you set in the backend `.env`.

## Environment variables (never commit real values)

See `backend/.env.example` and `frontend/.env.example` for the full list with placeholder
values. Real `.env` files are gitignored.

Key backend vars:

- `MONGO_URL`, `DB_NAME` — MongoDB connection
- `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — auth seed
- `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` — AI
- `HIGGSFIELD_KEY_ID`, `HIGGSFIELD_KEY_SECRET` — image/video gen
- `EMERGENT_LLM_KEY`, `EMERGENT_EMAIL_KEY` — only used when running on the Emergent platform
- `CORS_ORIGINS` — comma-separated list, or `*`

Key frontend var:

- `REACT_APP_BACKEND_URL` — the FastAPI base URL (all client calls prefix `/api`)

## API surface (high level)

All routes are prefixed with `/api`.

- `POST /auth/login` — JWT
- `GET/POST/PATCH/DELETE /clients` — CRM
- `POST /onboard` — AI-guided onboarding
- `POST /ai/ask_coo`, `POST /ads/create`, `POST /ads/analyze-competitor`, `POST /ads/batch-spy`
- `POST /campaigns/build` (async), `GET /campaigns/{id}`, `POST /campaigns/{id}/refine`, `POST /campaigns/{id}/result`
- `GET /intelligence`, `GET /intelligence/summary`, `GET /intelligence/industries`
- `GET /value-engine/templates`, `POST /value-engine/build`, `POST /value-engine/score`, `GET /value-engine/runs/{id}/pdf`
- `POST /documents/generate`, `GET /documents/{id}/pdf`
- `POST /higgsfield/generate` — image/video

## License

Private / all rights reserved. This is proprietary agency software.
