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
- P1: Admin dashboard to view/manage leads (GET /api/bookings exists).
- P1: Replace LEAD_NOTIFICATION_EMAIL placeholder (delivered@resend.dev) with real inbox.
- P2: Replace testimonial placeholders with real case studies.
- P2: Confirmation email to the lead + calendar (.ics) invite.
- P2: Blog/resources section for SEO.
