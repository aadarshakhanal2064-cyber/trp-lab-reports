# Tandi Ratnanagar Polyclinic — Lab Report System
## Planning pack (v1 scope: Pathology reports only)

**Status:** Plan for review. No application code has been written.
**Date:** 2026-08-23

---

## What we are building

A cloud-hosted web application that replaces Microsoft Word for **pathology lab
reports only**. A technician selects a patient, picks a test panel, types the
numeric values, and a print-ready report comes out — letterhead correct, units
and reference ranges filled in automatically, out-of-range values flagged,
calculated fields computed, and the finished PDF stored permanently against that
patient.

Everything else in the original brief — OPD, billing, pharmacy, imaging, IPD,
MIS — is **explicitly out of scope for v1** and is not designed for here, though
the data model leaves room for it.

---

## Decisions already locked (from our conversation)

| Decision | Choice | Why it matters |
|---|---|---|
| Where it runs | Cloud web app | Accessible anywhere, backups automatic, no server PC to babysit. Recurring cost. |
| Outage behaviour | Offline-capable in the browser | Lab keeps working and printing when internet drops; syncs on reconnect. |
| Patient data | Stored, with full report history | Type a patient once; see every past report. |
| Letterhead | Both modes, switchable | App-printed letterhead on blank A4, **or** body-only onto preprinted stationery. |
| Language | English/Roman for v1 | Devanagari-ready underneath so it is a setting later, not a rewrite. |
| Users | Lab technician + Admin | Two roles. Doctors and reception come later. |
| Workflow | Enter → Verify → Release → Print | Released PDF is locked. Corrections create an "Amended" version. |
| Test coverage | ~15–20 common tests | Seeded from the 7 real formats supplied, plus common additions. |

---

## What the supplied samples told us

Seven real report formats were provided in `ASSEST/TEMPLATE/reportformat.zip`:
CBC, LFT, RFT, Lipid Panel, FBS/PPBS, Urine R/E, Stool R/E.

Five findings that shaped this plan:

1. **All seven share one master layout.** Same header block, same department
   band, same four-column table (Test Name / Result / Unit / Reference Range),
   same "End Of Report" footer. This is very good news — we build **one** layout
   engine, not seven templates.

2. **The reference range is not a simple min–max pair.** It is one of four
   different shapes: a plain numeric range (`4.00-6.00`), a sex-conditional range
   (Haemoglobin, Creatinine, Uric Acid), an age-conditional range (Alkaline
   Phosphatase: children 3–15 vs adults), and a multi-band interpretive text block
   (Triglycerides: Normal / Border-line High / High). A single `min`/`max` column
   in the database would have been wrong. See `05-report-engine.md`.

3. **Several values are calculated, not typed.** BUN, Globulin, A/G ratio,
   SGOT/SGPT ratio, VLDL, Chol/HDL ratio, LDL/HDL ratio, BUN/Creatinine ratio, and
   all five Absolute Leucocyte Counts. Roughly **1 in 5 numbers on these reports is
   derived**. Automating those is a major time saving and a major correctness risk
   — every formula gets a unit test.

4. **The sample PDFs have no letterhead and no signature block.** The top of every
   page is blank, which strongly suggests the clinic prints onto **preprinted
   stationery** today, and that reports currently go out **unsigned**. Both need
   confirming — see question 1 and 2 in `01-open-questions.md`.

5. **Two structurally different report types.** Numeric panels (CBC, LFT, RFT,
   Lipid, Sugar) versus descriptive/qualitative reports (Urine R/E, Stool R/E,
   where results are picklists and free text like *Pale yellow*, *Nil*, *Trace*,
   *2–4 /hpf*). The entry screen must handle both well.

---

## The documents

| File | What it answers |
|---|---|
| `01-open-questions.md` | **Read this first.** What I still need from you, and every assumption I made in the absence of an answer. |
| `02-requirements.md` | Who uses it, what it must do, acceptance criteria, out-of-scope list. |
| `03-architecture.md` | Three stack options in plain language, costs in NPR, and a recommendation. |
| `04-data-model.md` | The database design and why each table exists. |
| `05-report-engine.md` | The heart of the product — how a report is defined, filled and printed. |
| `06-security-and-compliance.md` | Threat model, permissions matrix, backups, Nepali legal position. |
| `07-design-system.md` | Design tokens, components, three screen wireframes, print specs, keyboard map. |
| `08-roadmap.md` | Week-by-week build sequence and definition of done. |
| `09-quality-gates.md` | The automated tooling that catches bad code so you don't have to. |
| `10-risks.md` | What could go wrong, including staff resistance. |

---

## What I need you to do

1. Read `01-open-questions.md` and answer what you can.
2. Read `03-architecture.md` and approve a hosting option — this is the one that
   costs money every month.
3. Tell me to start, or tell me what to change.

I will not write application code until you say so.
