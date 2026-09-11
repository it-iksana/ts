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

1. Copy `.env.local.example` to `.env.local` and fill in the real values
   from the Supabase dashboard (Settings → API Keys) — both the
   publishable key and the server-only secret key (needed for employee
   creation; see `.env.local.example` for why it's handled differently).
2. `npm install`
3. `npm run dev`

## Database

SQL migrations live in `/supabase/migrations`, run in order via the
Supabase SQL Editor (Supabase dashboard → SQL Editor). Start with
`00001_enable_automatic_rls.sql` before creating any other tables — every
table created afterward gets Row Level Security switched on automatically,
so nothing is ever accidentally left open.

## Creating the first administrator

Every employee after the first gets created through the app itself
(`/admin/employees`), by an existing Cost Admin or TL/DC. But that screen
only works for someone who's already logged in as an admin — so the very
first account has to be created directly in Supabase, once, by hand.

**1. Create the actual login**, in Supabase's dashboard:
- **Authentication → Users → Add User**
- **Email**: must match the internal format the app expects —
  `{employee_code}@iksana.local`, lowercase. For employee code `EMP001`,
  that's `emp001@iksana.local`.
- **Password**: whatever real password this person will use
- Check **Auto Confirm User** (skips email verification — there's no real
  inbox behind that address)
- Create it, then copy the **UUID** shown next to the new user

**2. Create the matching employee record**, in the SQL Editor:

```sql
INSERT INTO employees (id, employee_code, full_name, role, date_of_joining)
VALUES (
  'paste-the-uuid-from-step-1',
  'EMP001',
  'Their Full Name',
  'cost_admin',
  '2026-01-01'
);
```

The `id` here must be the exact UUID from step 1 — that's what links the
login to the employee record. Use `cost_admin` for this first account,
since that's the role that can create everyone else afterward.

**Do this once.** Every administrator after the first should be created
through `/admin/employees` by someone who already has access — not by
repeating this manual process, which bypasses the app's own role
safeguards (see migration `00003`) entirely.

## Deployment

Connected to Vercel via GitHub import. Every push to `main` deploys
automatically — no manual deploy step. Environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`) are set in Vercel's Project Settings, not committed
to this repo.
