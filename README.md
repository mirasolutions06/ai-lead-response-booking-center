# AI Lead Response & Booking Control Center

> An AI receptionist and lead-automation dashboard for small service businesses — inbound message in, scored lead and drafted reply out, human-approved and booked, every step logged.

[![CI](https://github.com/mirasolutions06/ai-lead-response-booking-center/actions/workflows/ci.yml/badge.svg)](https://github.com/mirasolutions06/ai-lead-response-booking-center/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-000000.svg)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748.svg)

![Lead inbox](docs/screenshots/01-lead-inbox.png)

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Metrics](#metrics)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Overview

Small service businesses — HVAC, dental, real estate, contractors, clinics, agencies — lose jobs when inbound leads sit unanswered. Whoever replies first usually wins the work, but the owner can't watch every text, form, and inbox around the clock.

This project is a working AI receptionist that closes that gap. An inbound message enters one real pipeline: the AI extracts the customer's details, scores and qualifies the lead, flags spam or missing information, and drafts a reply. A human reviews and approves — nothing is ever sent to a customer automatically — and can book a real appointment against a live availability calendar. Every action lands on a CRM pipeline board and a full audit log.

It is built as a real system, not a slideshow: a real Postgres database, real AI extraction (with a deterministic fallback), real scheduling with double-booking prevention, and a real customer-facing intake form. The demo dataset is illustrative, but every screen is driven by genuine records and genuine server-side logic.

**Status and scope (v1):** single-tenant, no login. Approved follow-ups and booking confirmations are composed and *staged* as real notification records but are not dispatched over a live SMS/email provider yet. Those integrations, authentication, and deployment are on the [roadmap](#roadmap) — see it for the honest boundary between what runs today and what a live client deployment still needs.

## Features

- **One real intake pipeline** — a website form, an in-dashboard quick intake, and the raw API all flow through the exact same `POST /api/leads/intake` endpoint. No separate demo path.
- **AI extraction and scoring** — pulls name, contact, service, urgency, and intent from free text, then assigns a 0–100 score and a Hot/Warm/Cold/Spam qualification.
- **Provider abstraction with graceful fallback** — uses OpenAI when an API key is present, and automatically falls back to a deterministic rule-based extractor otherwise or on provider failure, recording which engine produced each result.
- **Safety flags** — automatically flags spam, missing contact details, and unclear service/location so junk never buries real customers.
- **Human-in-the-loop approval** — the AI drafts; a person approves. No message reaches a customer without a click.
- **Real scheduling** — timezone-aware availability slots (DST-safe), real appointment records, and transactional double-booking prevention.
- **CRM pipeline** — a drag-and-drop kanban across New, Qualified, Booked, Follow-up needed, Won, and Lost.
- **Live automation log** — a polling, human-readable audit trail of every AI and human step, per lead.
- **Customer-facing contact form** — a standalone `/contact` page that auto-brands to the business and feeds the real pipeline.

## Screenshots

| | |
|---|---|
| ![Lead inbox](docs/screenshots/01-lead-inbox.png) **Lead inbox** — every lead, AI-scored and color-coded, with a recommended next action. | ![Lead detail](docs/screenshots/02-lead-detail.png) **Lead detail** — raw message, AI reasoning, and the drafted follow-up, behind an approval gate. |
| ![CRM pipeline](docs/screenshots/03-crm-pipeline.png) **CRM pipeline** — drag-and-drop kanban across all six stages. | ![Booking panel](docs/screenshots/04-booking-panel.png) **Booking panel** — real availability in the business's local time. |
| ![Automation logs](docs/screenshots/05-automation-logs.png) **Automation logs** — a live audit trail of every step. | ![Contact form](docs/screenshots/07-contact-form.png) **Public contact form** — the customer's front door, feeding the real pipeline. |

The contact form is responsive down to mobile:

<img src="docs/screenshots/08-contact-form-mobile.png" alt="Contact form on mobile" width="280">

## Tech stack

| Area | Choices |
|---|---|
| Framework | Next.js 15 (App Router), React 18, TypeScript 5 |
| Styling / UI | Tailwind CSS v4, shadcn/ui (Base UI primitives), TanStack Table, dnd-kit |
| Data | Prisma 5, Supabase Postgres |
| Validation | Zod (at both the API boundary and on AI output) |
| AI | OpenAI, with a deterministic rule-based fallback provider |
| Scheduling | `date-fns-tz` for DST-safe, timezone-aware slot generation |
| Testing | Vitest (integration tests against a real database) |

## Architecture

```mermaid
flowchart TB
    WF["Website form (/contact)"] --> API
    QI["Quick intake (in-app)"] --> API
    SMS["SMS / email (planned)"] -. planned .-> API

    API["POST /api/leads/intake — Zod validated"] --> PIPE

    subgraph PIPE["Lead intake pipeline"]
        AI["AI provider: OpenAI to rule-based fallback"]
        SAFE["Safety flags"]
        DRAFT["Follow-up draft"]
    end

    PIPE --> DB[(Supabase Postgres via Prisma)]
    DB --> DASH

    subgraph DASH["Operator dashboard"]
        INBOX["Inbox"]
        DETAIL["Lead detail"]
        BOOK["Booking"]
        PIPELINE["CRM pipeline"]
        LOGS["Automation logs"]
    end

    DETAIL -- approveFollowUp --> ACT
    BOOK -- bookAppointment --> ACT
    PIPELINE -- moveLeadStage --> ACT
    ACT["Server Actions — the only mutation path"] --> DB
```

Inbound messages hit a single Zod-validated API route and run through one intake pipeline: AI extraction and scoring, safety-flag computation, and a drafted follow-up, all persisted to Postgres via Prisma. The operator dashboard reads from the database, and every mutation — approving a draft, booking an appointment, moving a pipeline stage — goes through a small set of server actions that are the only write path, so business rules can't be bypassed from the UI.

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) Postgres database (free tier is fine)
- An OpenAI API key — *optional*; without one, the deterministic rule-based extractor runs instead

### Install

```bash
git clone https://github.com/mirasolutions06/ai-lead-response-booking-center.git
cd ai-lead-response-booking-center
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Fill in `.env` with your Supabase connection strings (pooled `DATABASE_URL` and direct `DIRECT_URL`), and optionally `OPENAI_API_KEY`:

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
OPENAI_API_KEY=   # optional
```

### Set up the database and run

```bash
npx prisma migrate deploy   # apply schema migrations
npx prisma db seed          # seed a demo business + realistic leads across every stage
npm run dev                 # http://localhost:3000
```

The dashboard is at `/inbox`; the public contact form is at `/contact`.

## Usage

**Walk the full flow (about 60 seconds):**

1. Open `/contact` and submit a request as a customer — or use `/intake` inside the dashboard.
2. Watch it appear in `/inbox`, scored and qualified.
3. Open the lead to see the AI's reasoning and drafted reply; click **Approve & Send**.
4. Use **Suggest booking slots** to book a real appointment and get a confirmation code.
5. See the lead move to **Booked** on `/pipeline`, and the whole journey recorded on `/logs`.

**Create a lead via the API** (the same endpoint every channel uses):

```bash
curl -X POST http://localhost:3000/api/leads/intake \
  -H "content-type: application/json" \
  -d '{
    "rawMessage": "My AC stopped working and it is 95 degrees, can someone come today?",
    "source": "website_form",
    "name": "Jane Doe",
    "phone": "555-0100",
    "email": "jane@example.com"
  }'
```

Structured `name`/`email`/`phone` are optional and take priority over AI extraction — a labeled web form supplies them directly, while an SMS or email can let the AI extract them from the message text. The response is a `201` with the created lead, its extraction, and the drafted follow-up.

## Metrics

The seed script populates a realistic spread across the CRM so no screen ever demos empty:

```mermaid
pie showData
    title Seeded pipeline distribution
    "New" : 1
    "Qualified" : 2
    "Booked" : 1
    "Follow-up needed" : 1
    "Won" : 1
    "Lost" : 1
```

Seven leads land across all six stages with one real booked appointment — enough to exercise the inbox, pipeline, booking, and log views end to end on a fresh clone.

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm test            # vitest — integration tests against your real database
```

Tests run against a real Postgres database (no mocking, by design) and clean up the rows they create, so `DATABASE_URL`/`DIRECT_URL` must be configured to run them. Because they need live database credentials, the full suite runs locally rather than in CI — [the CI workflow](.github/workflows/ci.yml) runs `prisma generate`, typecheck, and lint, which pass without a database.

## Roadmap

- [ ] Live SMS/email dispatch (Twilio / Resend) behind the existing notification abstraction
- [ ] Authentication and multi-user access
- [ ] A per-client business settings screen (hours, timezone, services)
- [ ] A deployment guide and one-click deploy
- [ ] An embeddable contact-form widget for client websites

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch naming, and PR conventions, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Released under the [MIT License](LICENSE).

## Acknowledgments

Built by Mira Solutions ([@mirasolutions06](https://github.com/mirasolutions06)). Powered by Next.js, Prisma, Supabase, and OpenAI.
