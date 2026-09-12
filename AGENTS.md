# Agent Instructions

## Project

- Plan Lima is a single React + TypeScript + Vite frontend; there is no monorepo or backend application.
- `src/App.tsx` owns the page UI, filters, mobile menu, event cards, and event detail modal.
- `src/lib/events.ts` is the data boundary: it queries Supabase, validates rows, maps database names to `EventItem`, and uses `src/data.ts` only as a development fallback.
- `src/lib/supabase.ts` creates the client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never use or expose a `service_role` key.
- `supabase/schema.sql` is the database source of truth. Public reads are restricted by RLS to published, free, current events in Lima; there is no public admin panel.

## Commands

- Install dependencies with `npm install`.
- Start local development with `npm run dev`.
- Verify changes with `npm run build`; this runs TypeScript project checking before Vite builds.
- Preview the production build with `npm run preview`.
- There are no test or lint scripts in `package.json`; do not assume they exist.

## Environment And Build

- Copy `.env.example` to `.env.local` for local Supabase-backed development.
- `VITE_SITE_URL` is used by `scripts/generate-seo.mjs` during `prebuild` to write `public/sitemap.xml` and the sitemap entry in `public/robots.txt`.
- Without `VITE_SITE_URL`, the build succeeds but warns and writes robots.txt without a sitemap.
- Development can use local fallback events when Supabase variables are absent; production intentionally throws instead of publishing demo data.
- `.env.local` and `dist/` are ignored. Do not commit secrets or generated build output.

## Data Changes

- Run the complete `supabase/schema.sql` in the Supabase SQL Editor when applying schema, RLS, index, or trigger changes.
- Keep event data aligned with the schema constraints and the frontend validation in `src/lib/events.ts`; published records must be genuinely free, current, Lima events with an official working source URL.
- Verify RLS and real event loading in an incognito window before deployment.

## Deployment

- Vercel uses `npm run build` and `dist` as the output directory; configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL` for the deployment environment.
- Do not add a public write path, authentication, or an admin dashboard without an explicit product requirement and an accompanying security design.
