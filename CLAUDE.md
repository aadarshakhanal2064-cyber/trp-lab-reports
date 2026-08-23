# TRP Lab Reports — working rules

Pathology reporting for Tandi Ratnanagar Polyclinic, Chitwan. Live at
<https://trp-lab-reports.vercel.app/>. Currently in a **one-month clinic trial
with real patients**, running alongside paper records.

Because real results go through this, "it looks right" is not enough. The
automated gates and the rules below are what stop bad code — the owner is a
Chartered Accountant, not an engineer, and cannot catch mistakes by reading a
diff.

---

## 1. Design system — follow this for EVERY new module

The canonical spec is `design_handoff_trp_lab_console/README.md` (in the
redesign zip, kept out of the repo). Its values are already implemented in
`app/globals.css`. **Never invent a colour, size, radius or shadow — use the
tokens.** If a new module seems to need a token that doesn't exist, that is a
signal to reuse an existing one, not to add a hex value inline.

### Non-negotiables

- **Shell is full-bleed and square.** Page `--canvas` (#F6F7FA), wrapper padding
  `16px 22px 24px`, **radius 0**. No outer frame, no page-level drop shadow.
- **Cards never carry a shadow.** Separation comes from the 1px `--border`.
  The only two shadows in the system are the active rail glow and the selected
  tab, both already defined.
- **Font is Plus Jakarta Sans**, self-hosted via `next/font` in `app/layout.tsx`.
  Never add a `<link>` to Google Fonts — the clinic's connection is slow and
  unreliable, and a runtime font fetch changes how the app renders.
- **Type scale**: 34/800 KPI · 24/800 page title · 20/800 report title ·
  17/700 card title · 16/700 panel title · 13.5/600 body-strong · 13 body ·
  12.5/600 controls · 12 captions · 11.5/700 pills.
- **Radius**: 7 small pills · 8 pills/tabs · 10 buttons/chips/inputs ·
  11 icon buttons · 12 top-bar cards & rail items · 13 queue items ·
  14 panels · 16 KPI cards · 18 large cards · 20 rail · 50% avatars.

### Reusable pieces — use these, don't rebuild them

| Need | Class |
|---|---|
| Surface card | `.card` (`.card.pad` for even padding, `.card.mt` for top margin) |
| Stat tile | `.kpi` + `.kpi-top` / `.kpi-label` / `.kpi-value` / `.kpi-foot` |
| Status badge | `.pill` + `.green` / `.amber` / `.blue` / `.red` / `.grey` (`.lg` for table rows) |
| Segmented filter | `.tabs` + `.tab` / `.tab.on` |
| Data grid | `.ghead` + `button.grow`, with `gridTemplateColumns` per screen |
| Grid footer / pager | `.gfoot` + `.pager` |
| Search input | `.searchbar` wrapping `IconSearch` + `input` |
| Initials avatar | `.ini` (`.ini.sm` in tables) with `initialsOf(name)` |
| Empty state | `.empty` |
| Toolbar above a grid | `.toolbar-row` |

Icons live in `components/Icons.tsx` as inline 24×24 stroke SVGs
(stroke-width 1.8–2, `fill:none`, round joins). Add new ones there. **Do not
install an icon library** — bundle size matters on clinic hardware.

### Layout rules

- Rail is 62px, sticky, with the logout button pushed down (`.rail-btn.pushdown`).
- Below **1200px**: KPI grid collapses to 2 columns, the Reports split goes
  single-column. Below 680px everything is one column.
- Wide tables scroll inside `.gscroll` with a `minWidth` on the inner div.
  The page body must never scroll horizontally.

---

## 2. Rules that outrank aesthetics

- **The print stylesheet is the product.** The A4 report in `.sheet` and the
  `@media print` block match the clinic's existing format, measured against
  their real printouts. Do not restyle it to match the app UI. It deliberately
  uses a system font stack, not Jakarta.
- **Flags print as letters, never colour alone** (`H` / `L`). The lab prints on
  a monochrome laser, and roughly 1 in 12 men has a colour vision deficiency.
- **No stub UI.** If a feature isn't built, the control is `disabled` with a
  "not built yet" title — never a live-looking button that silently does
  nothing. Real technicians use this during the trial.
- **No AI or automated clinical interpretation, ever.** Flagging a value
  against its reference range is a factual comparison and is fine. Suggesting a
  diagnosis is permanently out of scope, not merely deferred.
- **Never put patient identifiers in logs or audit `detail`.** IDs and action
  names only. See `docs/06-security-and-compliance.md` §6.

---

## 3. Data & correctness

- **Reference ranges and formulas are unverified** until the lab in-charge signs
  them off. They came from the clinic's sample PDFs. Treat any change to
  `lib/catalog.ts` as clinically significant.
- **Every calculated analyte needs a unit test** in `tests/logic.test.ts` using
  values from a real report. This is where a silent bug reaches a patient.
- **Use `roundHalfUp`, never bare `toFixed`.** `7.05 - 4.0` is
  3.0499999999999998 in IEEE-754; `.toFixed(1)` silently gives "3.0".
- **BS dates are a display format only.** Store AD ISO timestamps always.
- **Snapshot, don't re-derive.** A released report must print identically in ten
  years, after ranges, letterhead and verifier have all changed.

## 4. Database

- Supabase free tier, Mumbai (`ap-south-1`), project `xdmguimobfwyjikvootk`.
- **RLS on every table.** `report_versions` and `audit_log` have no UPDATE or
  DELETE policy by design — reports are immutable, the audit log is append-only.
  Never add one.
- Schema changes go through `apply_migration`, never ad-hoc SQL.
- Views need `with (security_invoker = on)` or they bypass row security.
- Deactivate users, never delete them — the audit trail must keep referring to
  whoever acted.
- After any migration, run `get_advisors` and fix what it flags.

## 5. Known gaps (don't rediscover these)

- **Release permission is UI-only.** RLS lets any authenticated user insert into
  `report_versions`. Needs a server-side check before more staff get accounts.
- Clinic/letterhead/verifier settings live in browser localStorage, so each PC
  needs them set once. Should move to the database.
- Leaked-password protection is off in Supabase Auth.
- No offline support yet, despite the plan calling for it.

## 6. Commands

```bash
npm run dev      # http://localhost:3000
npm run check    # typecheck + tests + build — run before every commit
npm test
```

Commits use conventional prefixes. Push to `main` auto-deploys to Vercel
(~1 min). Vercel's Hobby tier prohibits commercial use — flag this before the
clinic relies on it in production.
