# Handoff — 2026-08-23

Read this first in a new session, before touching anything. It's the state of
the world, not a to-do list — `docs/08-roadmap.md` has the phased plan.

## Where things stand

- **Live:** <https://trp-lab-reports.vercel.app/> — real database, real auth,
  one active account (the owner, admin, can release).
- **Repo:** <https://github.com/aadarshakhanal2064-cyber/trp-lab-reports>,
  branch `main`, working tree clean at commit `1481e35`.
- **Stage:** one-month clinic trial with real patients, paper kept in
  parallel. Not a demo — see `CLAUDE.md` and the memory file
  `trp-clinic-trial-context.md`.
- **Read `CLAUDE.md` before writing any UI.** It has the design tokens, the
  reusable component classes, and the rules that outrank aesthetics (print
  stylesheet is the product, no stub UI, no clinical interpretation, no
  patient identifiers in logs).

## What got built, across the session

1. Planning docs in `docs/` (requirements, architecture, data model, security,
   roadmap, risks) — written before any code, per the owner's original brief.
2. A zero-cost demo: Next.js + browser localStorage, seven test panels
   transcribed from the clinic's real report PDFs (`ASSEST/TEMPLATE/`),
   reference-range engine, calculated analytes, print layout. Deployed to
   Vercel free tier.
3. Real backend: Supabase Postgres (Mumbai, free tier, project
   `xdmguimobfwyjikvootk`), email/password auth, RLS on every table,
   append-only audit log, immutable report versions.
4. Two design passes to match a supplied handoff spec exactly (full-bleed
   square shell, specific tokens, no card shadows) — see
   `design_handoff_trp_lab_console/README.md` in the redesign zip (not
   committed; ask the owner to re-share if it's needed again).
5. Bug fixes from real usage: the order-creation flow was spawning a
   duplicate `lab_orders` row every time a technician stepped back to the
   test-selection screen, so multi-visit patients accumulated empty
   "released" orders. Fixed by making that screen update the existing order
   instead of always inserting. Also added: patient editing, working dark
   mode (tokens only, print stays light), a proper Settings save flow with
   dirty-state tracking, fuzzy/scored duplicate-patient detection
   (`find_similar_patients` RPC, `pg_trgm`), and an `organisation` table so
   clinic/letterhead/verifier settings are shared across machines instead of
   living in each browser's localStorage.

## Known gaps — see `CLAUDE.md` §5 for the full list, top three:

1. **Release permission is UI-only.** RLS lets any authenticated user insert
   into `report_versions`. Needs a server-side check before more staff get
   accounts — this is the most important thing to close next.
2. Leaked-password protection is off in Supabase Auth (one dashboard toggle).
3. No offline support yet, despite the plan calling for it — the trial has
   been running online-only so far.

## If you're picking this up cold

- `npm run check` before touching anything, to confirm the baseline is green.
- The Supabase project ID and Vercel project name are both `trp-lab-reports`
  (project id `xdmguimobfwyjikvootk` for Supabase specifically) — don't
  create a second one; past sessions did this by accident more than once and
  it's confusing to untangle.
- When testing against the live database, use a throwaway account and
  **deactivate it afterward** (`is_active = false`, scramble the password) —
  don't delete it if it has touched any audit-logged data; the audit FK will
  refuse the delete anyway, which is the append-only design working as
  intended.
- The owner (Aadarsha) is a Chartered Accountant, not an engineer. He cannot
  review code. Flag risks and costs explicitly rather than assuming he'll
  catch them in a diff.
