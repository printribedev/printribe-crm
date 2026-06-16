# Printribe CRM — Project Log

## Session 1 — 2026-06-16

### Done
- [x] Read prototype `printribe_crm.jsx` in full
- [x] Wrote `PLAN.md` with schema, build order, account checklist, open questions
- [x] Collected answers to all 8 design questions from Usman
- [x] Scaffolded Next.js app with TypeScript, Tailwind, App Router
- [x] Installed Prisma, @supabase/supabase-js, @supabase/ssr
- [x] Wrote complete Prisma schema (all 9 models)
- [x] Set up Supabase client utilities (browser + server)
- [x] Set up Prisma singleton (`src/lib/prisma.ts`)
- [x] Auth middleware (redirects unauthenticated users to /login)
- [x] Login page (Supabase Auth)
- [x] App shell: sidebar with all 8 nav links, sign-out button
- [x] Route group `(app)` with layout wrapping sidebar
- [x] Dashboard placeholder page
- [x] `.env.local` placeholder with all required variables

### What's next (this session continues)
1. **Usman creates GitHub repo** (see instructions below)
2. **Usman creates Supabase project** (see instructions below)
3. Fill in `.env.local` with Supabase credentials
4. Run `prisma migrate dev` to create all tables
5. Connect repo to Vercel → get live URL
6. Build Vendors slice end to end

---

## Key Decisions
| # | Decision |
|---|---|
| 1 | Client deletion blocked if they have orders |
| 2 | Orders link to Clients via dropdown (FK) |
| 3 | Client stats = auto-computed + manually overridable |
| 4 | FY 2025-26 historical monthly sales imported to DB |
| 5 | Quotes = browser-only (no DB) |
| 6 | Order ID = manually typed, editable |
| 7 | Single user now, architecture supports multi-user later |
| 8 | Quote estimator GST rate pulls from selected product |

---

## Credentials Needed
All go in `U:\printribe-crm\.env.local` — never commit this file.

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → URI (Transaction mode, port 6543) |
| `DIRECT_URL` | Supabase → Project Settings → Database → Connection string → URI (Session mode, port 5432) |
