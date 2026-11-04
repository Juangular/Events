# Agent Instructions

## Project

- Plan Lima is a single React + TypeScript + Vite frontend; there is no monorepo or backend application.
- `src/App.tsx` owns the page UI, filters, mobile menu, event cards, and event detail modal.
- `src/lib/events.ts` is the data boundary: it queries Supabase, validates rows, maps database names to `EventItem`, and uses `src/data.ts` only as a development fallback.
- `src/lib/supabase.ts` creates the client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never use or expose a `service_role` key.
- `supabase/schema.sql` is the database source of truth. Public reads are restricted by RLS to published, free, current events in Lima; there is no public admin panel.
- `pipeline/` is a standalone Node + TypeScript ingestion tool (own `package.json`) that collects free Lima events from public sources and writes them to `events` with the `service_role` key; it never runs in the browser.

## Commands

- Install dependencies with `npm install`.
- Start local development with `npm run dev`.
- Verify changes with `npm run build`; this runs TypeScript project checking before Vite builds.
- Preview the production build with `npm run preview`.
- There are no test or lint scripts in `package.json`; do not assume they exist.
- Pipeline commands run inside `pipeline/`: `npm install`, `npm run typecheck`, `npm run ingest:dry` (prints candidates, writes nothing), `npm run ingest` (writes to Supabase; requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`).

## Environment And Build

- Copy `.env.example` to `.env.local` for local Supabase-backed development.
- `VITE_SITE_URL` is used by `scripts/generate-seo.mjs` during `prebuild` to write `public/sitemap.xml` and the sitemap entry in `public/robots.txt`.
- Without `VITE_SITE_URL`, the build succeeds but warns and writes robots.txt without a sitemap.
- Development can use local fallback events when Supabase variables are absent; production intentionally throws instead of publishing demo data.
- `.env.local` and `dist/` are ignored. Do not commit secrets or generated build output.
- The pipeline reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from its environment only; `PUBLISH_MODE` optionally overrides the `publish_mode` setting. Keep the `service_role` key in GitHub Actions secrets, never in the repo, Vercel, or `.env.local`.

## Data Changes

- Run the complete `supabase/schema.sql` in the Supabase SQL Editor when applying schema, RLS, index, or trigger changes.
- Keep event data aligned with the schema constraints and the frontend validation in `src/lib/events.ts`; published records must be genuinely free, current, Lima events with an official working source URL.
- Verify RLS and real event loading in an incognito window before deployment.
- Automated rows use `origin = 'auto'`, `source_key`, and a unique `fingerprint`; do not edit those columns manually unless fixing bad data, and never change `origin` on hand-entered events.
- The ingestion switch lives in `automation_settings` (`publish_mode = 'auto' | 'review'`): `auto` publishes candidates that pass every quality gate; `review` stores everything as `draft` for manual approval in the Supabase dashboard. `sync_runs` records each run's counts and errors.
- Source adapters live in `pipeline/src/sources/`; one file per source. Quality gates (free, Lima, dates, URLs) live in `pipeline/src/core/gates.ts` and must stay strict.

## Deployment

- Vercel uses `npm run build` and `dist` as the output directory; configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL` for the deployment environment.
- Do not add a public write path, authentication, or an admin dashboard without an explicit product requirement and an accompanying security design.
- `.github/workflows/ingest-events.yml` runs the pipeline on a cron (06:00 and 18:00 America/Lima) using GitHub secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The pipeline is the only automated writer and must stay server-side; do not add ingestion endpoints to the frontend.
