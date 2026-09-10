# iKSANA Timesheet

Standalone timesheet/leave/costing system — built independently of the IAF
recruitment portal (`hr.iksana.tech`), on Supabase + Vercel.

## Current state

Starter scaffold only, proving the deployment pipeline works end to end
(GitHub → Vercel → Supabase). No real timesheet features yet — those come
next, once this foundation is confirmed working in production.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — hosted on Vercel
- **Supabase** — Postgres database, authentication, Row Level Security

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in the real
   publishable key from the Supabase dashboard (Settings → API Keys).
2. `npm install`
3. `npm run dev`

## Database

SQL migrations live in `/supabase/migrations`, run in order via the
Supabase SQL Editor (Supabase dashboard → SQL Editor). Start with
`00001_enable_automatic_rls.sql` before creating any other tables — every
table created afterward gets Row Level Security switched on automatically,
so nothing is ever accidentally left open.

## Deployment

Connected to Vercel via GitHub import. Every push to `main` deploys
automatically — no manual deploy step. Environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) are set
in Vercel's Project Settings, not committed to this repo.
