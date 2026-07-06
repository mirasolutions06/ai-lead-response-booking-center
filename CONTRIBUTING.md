# Contributing

Thanks for your interest in improving the AI Lead Response & Booking Control Center.

## Prerequisites

- Node 20+
- A Supabase Postgres database (for running the app and the test suite)
- An OpenAI API key (optional — the app falls back to a deterministic rule-based extractor without one)

## Local setup

Follow the Getting started section in the [README](./README.md#getting-started) to install dependencies, configure `.env`, and seed the database.

## Branching

Use short, descriptive branch names prefixed by type:

- `feat/...` — new functionality
- `fix/...` — bug fixes
- `docs/...` — documentation only
- `chore/...` — tooling, config, dependencies

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.

## Before opening a PR

Run both of these and make sure they pass:

```bash
npm run typecheck
npm run lint
```

The full test suite (`npm test`) runs against a configured Supabase database, so it is not part of CI. Run it locally against your own database when your change touches the intake, scoring, or booking logic.

## Pull requests

- Open PRs against `main`.
- Fill in the PR template.
- Keep PRs focused — one logical change per PR is easier to review.
