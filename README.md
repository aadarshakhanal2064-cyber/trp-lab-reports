# TRP Lab Reports — demonstration build

A pathology report generator for **Tandi Ratnanagar Polyclinic**, Ratnanagar-2,
Chitwan. Built to replace typing lab reports by hand in Microsoft Word.

> **This is a demonstration, not a clinical system.** See [Limits](#limits) below
> before anyone uses it on a real patient.

---

## What it does

1. Register a patient once — name, sex, age, phone, referring doctor.
2. Pick one or more test panels.
3. Type only the **values**. Everything else is generated:
   - units and reference ranges fill in automatically
   - ranges resolve by the patient's **sex and age** (male vs female haemoglobin,
     children vs adult alkaline phosphatase)
   - out-of-range values flag **H** or **L** instantly
   - critical values require the technician to confirm a re-check
   - **calculated values compute themselves** — BUN, globulin, A/G ratio, VLDL,
     the five absolute leucocyte counts and every lipid ratio
4. Print a letterhead-correct A4 report, or save it as a PDF.
5. Patients and past reports stay searchable; any report can be reprinted.

Dates print in **Bikram Sambat with AD alongside**.

## Test panels included

Transcribed from the clinic's own report formats:

| Panel | Department |
|---|---|
| Haemogram on Cell Counter (CBC) | Haematology |
| Liver Function Test | Biochemistry |
| Renal Function Test | Biochemistry |
| Lipid Panel | Biochemistry |
| Blood Sugar Fasting & Post Glucose | Biochemistry |
| Urine Analysis (R/E) | Clinical Pathology |
| Stool Examination (R/E) | Clinical Pathology |

---

## Running it locally

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>.

Other commands:

```bash
npm run check
```

That runs typecheck, tests and a production build in one go.

---

## Deploying to Vercel (free)

The app is a fully static site with no backend and no database, so it runs on
Vercel's free Hobby tier at **no cost**.

1. Push this folder to a new GitHub repository.
2. Go to <https://vercel.com/new>, import that repository.
3. Accept the defaults — Vercel detects Next.js automatically. No environment
   variables are needed.
4. Deploy.

> **Vercel's Hobby tier prohibits commercial use.** Showing this to the clinic as
> a demonstration is fine. Producing real patient reports on it is not — that
> needs a paid plan, or the self-hosted setup described in
> `docs/03-architecture.md`.

---

## Where the data lives

**In the browser, on that one computer.** There is no server and no database.

- Nothing is transmitted anywhere. No patient data leaves the machine.
- There is no login, because there is nothing remote to log in to.
- Records do **not** follow you to another computer or another browser.
- Clearing browser data erases everything. So does using a private window.

This is the right trade for a demonstration — zero cost, zero hosting, and no
patient data sitting on someone else's server. It is the wrong trade for real
use, which is what `docs/03-architecture.md` is about.

**Please use fictional patient names when demonstrating this.**

---

## Limits

Things this demo deliberately does not do, and why:

| Not included | Why |
|---|---|
| Reference ranges verified by a clinician | **The ranges came from the sample PDFs and are unverified.** The lab in-charge must sign them off. This is the single most important gap. |
| User accounts, roles, permissions | No server to enforce them against |
| Verify-before-release by a second person | Demo prints directly; the real workflow is in `docs/02-requirements.md` |
| Immutable stored PDFs and amendment versioning | Needs server-side rendering and storage |
| Audit log | Needs a server |
| Backups | Browser storage only — assume it can vanish |
| Offline sync between machines | Nothing to sync to |
| Page numbers on multi-page reports | Chrome cannot number pages from HTML; needs the server-side PDF renderer |
| Billing, pharmacy, OPD, imaging, IPD | Out of scope — see `docs/02-requirements.md` §5 |

Every printed page carries the patient name and registration number, so a loose
second sheet is still identifiable.

---

## Project layout

```
app/            Next.js pages, global stylesheet and print CSS
components/     App shell, result entry grid, printed report
lib/
  catalog.ts    The seven test panels — analytes, units, ranges, formulas
  ranges.ts     Reference-range resolution and H/L/critical flagging
  compute.ts    Calculated analytes and decimal-safe rounding
  dates.ts      Bikram Sambat conversion
  storage.ts    Browser persistence
tests/          Unit tests for the calculations and ranges
docs/           The full plan: requirements, architecture, security, roadmap
ASSEST/         Source material from the clinic (logo, sample report formats)
```

## Tests

```bash
npm test
```

Nineteen tests covering every calculated formula, all four reference-range
shapes, the age and sex boundaries, critical-value detection, decimal rounding
and BS date conversion. These are the calculations where a silent bug would be
invisible on screen and wrong on paper.

---

## The plan

This demo is one slice of a larger piece of work. The full analysis lives in
[`docs/`](docs/) — start with [`docs/README.md`](docs/README.md), then
[`docs/01-open-questions.md`](docs/01-open-questions.md), which lists what is
still needed from the clinic.
