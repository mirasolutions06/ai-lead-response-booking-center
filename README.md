# AI Lead Response & Booking Control Center

A real, production-shaped AI receptionist and lead automation dashboard for service SMBs.

## Setup

1. `npm install`
2. Create a free Supabase project at supabase.com, copy the pooled and direct connection strings into `.env` (see `.env.example`).
3. `npx prisma migrate dev` (already run once during initial setup; re-run after pulling schema changes).
4. `npx prisma db seed` — creates a default business and generates 10 business days of appointment slots.
5. `npm run dev` — dashboard at http://localhost:3000.

## AI provider

Set `OPENAI_API_KEY` in `.env` to use real GPT-based extraction. Without it, a deterministic rule-based extractor runs instead — the rest of the pipeline (persistence, scoring thresholds, safety flags, logging, approval gates) behaves identically either way. If the OpenAI provider throws (e.g. malformed JSON from the model), the pipeline automatically falls back to the rule-based extractor for that lead and records which engine actually produced the result.

## Testing

`npm test` runs the full suite against your real Supabase database; tests clean up the rows they create. `npm run typecheck` and `npm run lint` check types and style.

## What's built so far

The real backend: database schema, AI provider abstraction (with automatic fallback on provider failure), the real lead intake pipeline (`POST /api/leads/intake`, backed by a shared Prisma client singleton with error handling), safety-flag logic, automation logging, and the scheduling slot generator. The dashboard UI (Lead Inbox, Lead Detail, Booking Panel, CRM Pipeline, Automation Logs, Quick Intake) is built — see the "Dashboard UI" section below.

Known scope gaps carried forward intentionally (see `docs/superpowers/specs/2026-07-04-ai-lead-response-booking-center-design.md` and `docs/superpowers/plans/2026-07-04-foundation-backend.md` for full rationale):
- No auth (single-tenant, single business record).
- No real SMS/email dispatch — notifications are staged/logged, not sent.
- `lib/scheduling/slots.ts` computes business hours in the server's local timezone, not `Business.timezone` — fine for local dev, will need proper IANA-timezone handling before a real multi-timezone deployment.
- `lib/leads/intake.ts` writes several rows sequentially without a wrapping database transaction — a mid-pipeline failure after lead creation can leave a lead without a full extraction/draft. Acceptable for now; worth revisiting before production traffic.

## Dashboard UI

All six screens are built: Lead Inbox (with hero metrics), Lead Detail (slide-over panel), Booking Panel, CRM Pipeline (drag-and-drop kanban), Automation Logs (live-polling feed), and Quick Intake. Three Server Actions gate every mutation: `approveFollowUp`, `bookAppointment`, `moveLeadStage` — none of them bypassable from the UI.

Run `npx prisma db seed` on a fresh database to populate every screen with realistic demo data (7 leads spread across every CRM stage, one booked) before recording a demo — the seed script is idempotent and skips lead creation if leads already exist.

Known UI-layer gaps, carried forward deliberately:
- No dark mode (architecture supports it later; not built).
- Lead Detail uses component state, not a dedicated route — no shareable per-lead URL yet.
- The standalone public `/intake` embeddable form (as opposed to the in-dashboard Quick Intake) isn't built — Quick Intake covers the demo need for now.
- The "Edit" button next to a lead's draft follow-up is not wired to anything yet — approve or manually adjust the draft's wording before approving for now.
