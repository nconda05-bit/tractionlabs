# Traction Labs — PRD

## Problem Statement
Premium, modern website for "Traction Labs", an AI-powered digital marketing agency that helps local
service businesses (HVAC, roofers, landscapers, contractors, painters, home services) generate qualified
leads. Positioning: "We build customer acquisition systems." Goal: convert business owners into booked
consultations. Primary CTA: "Book Your Free Growth Audit".

## User Choices
- Dark premium theme: deep navy #0B1020 / near-black #050816, white text, electric blue #3B82F6 primary + coral #FF5A3C secondary.
- Real scheduling calendar (date + time slot).
- Lead submissions stored in DB + email notification via Emergent-managed Resend.
- Evolved V2 logo (train + electric-blue orbital track) generated via Gemini Nano Banana.
- Motion: framer-motion + lenis, kinetic hero, marquee, scroll reveals.

## Architecture
- Frontend: React (CRA/craco), Tailwind, shadcn/ui, framer-motion, lenis. Routes: /, /services, /process, /about, /contact.
- Backend: FastAPI + MongoDB (motor). Routes under /api.
- Integrations: Resend (managed) for lead emails; Nano Banana (one-time logo gen script at /app/scripts/generate_logo.py).

## Implemented (2026-08-02)
- Homepage: kinetic hero + parallax dashboard visual, marquee, Problem manifesto, 5-step Growth System, Who We Help bento cards (with imagery), What Makes Us Different, Pricing Philosophy (coral CTA), Testimonials (placeholders), FAQ accordion, final CTA.
- Services, Process, About pages.
- Contact: scheduling calendar (weekdays, 7 time slots) + lead form (name, business, email, phone, industry, budget, goal); double-booking prevention (409); success screen.
- Backend: /api/availability, POST+GET /api/bookings, POST /api/contact; lead emails via Resend.
- SEO meta/OG tags, favicon = V2 logo, evolved V2 logo badge in nav/footer.
- Fully tested (backend 100%, frontend E2E booking 100%).

## Backlog / Next
- P1: Live Meta Ads API integration + metrics dashboard (needs Nasir's Meta Business app credentials).
- P2: Replace testimonial placeholders with real case studies.
- P2: Confirmation email to the lead + calendar (.ics) invite.

## Agency OS Dashboard — Phase 1 (2026-08-02)
Private dashboard at /dashboard (login /login). Auth: JWT Bearer (single admin Nasir), seeded from env.
AI = Claude (claude-sonnet-4-6) via Nasir's own Anthropic key (ANTHROPIC_API_KEY) + emergentintegrations.
Implemented & tested (backend 12/12, frontend E2E 100%):
- Home Dashboard: stats (MRR, active/onboarding clients, open tasks, new leads) + AI Briefing + Next Best Action + today's tasks.
- Clients: workspaces + full CRM (edit), create/delete, status.
- AI Client Brain: Claude analyzes client (findings + priority actions), history saved.
- Onboarding Wizard: 3-step → Claude strategy → auto-creates client + task checklist.
- AI COO chat: ranked answers over all client/task context, persisted history.
- Documents: Claude-generated Proposal/Contract/Invoice → branded PDF (xhtml2pdf, logo + line items + signature).

### Agency OS Backlog
- P1: Meta Ads live sync (spend/CPL/leads per client) — playbook ready, awaiting user's Meta App ID/Secret + ads_read token + act_ ids.
- P2: AI Sales Coach (call prep + transcript scoring), Ad Creator, Commercial/Video generator.

### Phase 3 (2026-08-02)
- AI Sales Coach (call prep + transcript scoring), AI Ad Creator (full FB/IG campaigns), Client Portal + branded monthly reports (public /portal/:token), per-client metrics layer feeding dashboard "Ad Spend Managed" + "Leads Generated". Tested 21/21 backend + E2E.
- Higgsfield AI ad visuals: per-ad "Generate image / video" in Ad Creator. Models: higgsfield-ai/soul/v2/standard (text2image), higgsfield-ai/dop/turbo (image2video). Endpoints POST/GET /api/ads/visual (background job). Verified 25/25 backend + E2E; account currently out of credits (graceful error shown).
- Pending: Meta Ads live sync (needs user's Meta credentials).

### Phase 4 (2026-08-02)
- Creative Library: every generated image/video auto-saved (on success) to a searchable, client-filterable library (/dashboard/library). Endpoints GET/DELETE /api/creatives. Verified E2E.
- Competitor Ad Intel: paste competitor ad copy and/or upload a screenshot (Claude vision) -> breakdown, strengths/weaknesses, how-to-win tactics, recommended copy, and a ready-to-use Higgsfield prompt for a better ad; one-click Generate saves to library. Endpoints POST /api/ads/analyze-competitor, GET/DELETE /api/ads/competitor-analyses. Verified 5/5 backend + E2E.
- Higgsfield API is credit-metered (separate from web subscription); generation works once the API key's account has API credits.
- Tech debt: server.py ~1000 lines — split into routers before major additions.

### Phase 5 (2026-08-02)
- Winning Angle Tracker: track competitor "how to win" tactics per client (status Testing/Reused/Won), shown in a Winning Angles panel in the Ad Intel tab. Endpoints POST/GET/PUT/DELETE /api/angles. Proven angles are injected as context into Ad Creator + Competitor Ad Intel prompts so the AI leans into what works per niche. Verified 4/4 backend + E2E.

### Phase 7 — Interconnected 12-Agent Intelligence System (2026-08-03)
- **Campaign Engine** tab inside every Client workspace. 12 agents chained in 3 layers with each layer consuming the previous:
  - Layer 1 REALITY: Human Reality Intelligence, Pain Discovery (surface / emotional / identity / hidden / future), Belief Change ladder, Market Battlefield gaps.
  - Layer 2 CREATIVE: Attention & Behavior Engine (curiosity gap, pattern interrupt, emotional trigger, dopamine loop), Creative Director (3 concepts each with hook/script/storyboard/headline/primary_text/cta/image_prompt/why_it_works), Content Intelligence structures.
  - Layer 3 CONVERSION: Offer Psychology, Funnel Intelligence (cold → interested → warm → ready + landing page + retargeting + email + SMS), Trust Plan, Performance Science (human metrics not just CTR), Learning Loop tags.
- Async job model — POST /api/campaigns/build returns instantly with build_status='building', FastAPI BackgroundTasks writes each layer to Mongo as it lands, frontend polls every 4.5s so users see progressive reveal instead of a 3-minute spinner. Solves the Cloudflare ingress 100s timeout.
- Per-layer Refine with optional cascade: refining Reality re-runs Creative + Conversion downstream automatically to keep the plan internally consistent. Refining Creative re-runs Conversion. Refining Conversion runs alone.
- **Traction Labs Intelligence** — shared knowledge base (Mongo `intelligence` collection) keyed by (industry, kind, key). Every campaign marked WON pushes winning_hooks / winning_emotions / winning_offers / winning_angles / customer_language / objections back into the brain with weight+=3 per hit. Every existing AI agent (Ad Creator, Batch Spy, Ad Intel) now reads the top-weighted intel for the client's industry and injects it as context before generating anything new. System gets smarter with every client in a given niche.
- New sidebar page /dashboard/intelligence — grouped card view with industry filter chips, weight badges, delete-entry.
- Endpoints: POST /api/campaigns/build, GET /api/campaigns, GET /api/campaigns/{id}, POST /api/campaigns/{id}/refine, POST /api/campaigns/{id}/result, DELETE /api/campaigns/{id}, GET /api/intelligence, GET /api/intelligence/summary, GET /api/intelligence/industries, DELETE /api/intelligence/{id}.
- Also increased Claude max_tokens to 8000 for the Conversion layer (schema is large).
- Verified: 9/9 backend pytest + 17/17 regression (Ad Creator / Batch Spy / Ad Intel intelligence-injection did not break them) + full frontend E2E (iteration_10.json). No bugs.

### Agency OS Backlog (updated 2026-08-03)
- P1: Meta Ads live sync — awaiting user's META_APP_ID / META_APP_SECRET / META_ACCESS_TOKEN / act_ ids.
- P1: One-click "Push winning ad to Meta" straight from Campaign Engine or Batch Spy.
- P2: Angle Insights — cross-client leaderboard (now largely covered by the Intelligence page but the leaderboard view + reuse-in-ad-creator flow is not yet built).
- P2: Server.py refactor into /app/backend/routes/ (~1400 lines now).
- P2: Escape JSX entity warnings in dashboard components (cosmetic).

- Batch Spy tab inside every Client workspace. Paste 2–N competitor ads at once → Claude returns (a) ranked competitor scores 0-100 with reasoning, (b) market gaps none exploit, (c) winning_strategy (positioning + big idea + offer), (d) beat-them-all tactics (one-click Trophy to promote into Angle Tracker), (e) campaign_brief with 3 ready-to-launch ads (hook, headline, primary_text, cta, image_prompt).
- Each of the 3 ads exposes a "Copy ad copy (Meta / Google)" button and a "Copy Higgsfield prompt" button plus a visible raw-prompt box so the workflow is: Batch Spy → Copy prompt → paste into Higgsfield → Copy ad copy → paste into Meta/Google Ads Manager.
- Endpoints POST/GET/DELETE /api/ads/batch-spy. Verified 4/4 backend pytest + full frontend E2E (iteration_9.json). No bugs.

### Agency OS Backlog (updated)
- P1: Meta Ads live sync — awaiting user's META_APP_ID / META_APP_SECRET / META_ACCESS_TOKEN / act_ ids.
- P1: Angle Insights — cross-client "Won angles" leaderboard by niche so proven winners are reusable across every client.
- P2: Server.py refactor into /app/backend/routes/ (currently ~1170 lines).
- P2: Escape JSX entity warnings in dashboard components (cosmetic).
