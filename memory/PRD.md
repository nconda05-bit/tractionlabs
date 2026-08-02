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

