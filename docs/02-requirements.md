# 02 — Product Requirements (v1: Pathology Reports)

## 1. The one-sentence goal

**A lab technician can turn a set of raw analyser numbers into a printed,
letterhead-correct, verified pathology report in under 60 seconds, without opening
Microsoft Word.**

---

## 2. Users and roles

Only two roles exist in v1. Least privilege is the default.

### 2.1 Lab Technician
Registers/finds patients, creates lab orders, enters results, marks a report ready
for verification, prints released reports, views a patient's report history.

**Cannot:** change the test catalogue, edit reference ranges, release their own
report, alter a released report, manage users, or see the audit log.

### 2.2 Administrator
Everything the technician can do, plus: manage the test catalogue and reference
ranges, edit the report layout and letterhead, manage users, view the audit log,
release/verify reports, issue amendments, export data, restore from backup.

### 2.3 Verifier (a permission, not a separate role in v1)
The **Release report** permission is granted per user. In a small lab this is the
pathologist or the lab in-charge, who may or may not be an admin. Modelling it as
a permission rather than a role means adding a visiting pathologist later does not
require restructuring anything.

> **Design note:** roles are stored as data, not hard-coded. Adding "Doctor",
> "Receptionist" and "Accountant" in a later phase is a seed-data change plus new
> screens, not a rewrite of the permission system.

---

## 3. Modules in v1

### M1 — Patient registry

Register a patient once and reuse forever.

- Fields: MRN (auto), full name, sex, date of birth **or** age, phone, address
  (Province / District / Municipality / Ward, defaulting to Chitwan / Ratnanagar),
  referring doctor, notes.
- Age handling: the samples print `Sex / Age`, so age must be printable even when
  only an approximate age is known. We store DOB when given and a fallback
  `age_years` when it is not, and always print age **as at the sample date**, not
  as at today. A report reprinted next year must still show the age at testing.
- Search: single box, matches on name, phone or MRN, tolerant of spelling
  (`Sabin` finds `Sabbin`). Target under 200 ms.
- Duplicate detection: on save, warn if a same-name + same-phone or same-name +
  similar-age patient already exists. Warn, never block.
- Merge: admin-only, audited, reversible for 30 days.

**Acceptance:** A walk-in patient is registered and an order started in under 30
seconds by a two-finger typist. Searching a database seeded with 100,000 patients
returns results in under 200 ms at the 95th percentile.

### M2 — Lab order (accession)

- Select patient, select one or more panels (CBC, LFT, RFT, Lipid, Urine R/E),
  and the order is created with an accession number and a sample-collected
  timestamp.
- Order states: `Ordered` to `Sample Collected` to `In Progress` to
  `Awaiting Verification` to `Released` to `Amended`.
- Every state change is timestamped and attributed. This gives turnaround time
  for free later.

**Acceptance:** An order for three panels is created in under 15 seconds.

### M3 — Result entry

The screen technicians will live in for eight hours a day. See the wireframe in
`07-design-system.md`.

- One row per analyte, pre-labelled with unit and reference range.
- **Keyboard only.** Type a number, press Enter, cursor drops to the next
  analyte. Never require the mouse.
- Calculated analytes are read-only and recompute live as their inputs are typed.
- Out-of-range values flag instantly: the row highlights and shows H (high) or
  L (low). Critical values (see M4) show a stronger warning.
- Qualitative analytes (urine colour, stool consistency) offer a picklist with
  free-text override, and the picklist accepts typing the first letter.
- Partial saves are allowed and constant. Nothing is ever lost to a power cut.
- Works offline. Entry, calculation, flagging and printing all function with no
  internet.

**Acceptance:** A full CBC (25 analytes, 5 of them calculated) is entered from
paper in under 90 seconds with no mouse contact. Closing the laptop lid mid-entry
and reopening loses nothing.

### M4 — Reference ranges and flagging

- Ranges resolve by sex and by age at sample date.
- Four range types supported: numeric interval, sex-conditional, age-conditional,
  and multi-band interpretive text. See `05-report-engine.md` section 3.
- **Critical values** are ring-fenced separately from merely abnormal, for example
  Hb below 7, platelets below 20,000, glucose above 400. These prompt the
  technician to confirm they have re-checked before the report can be marked ready.
- The system flags. **The system never interprets.** No suggested diagnosis, ever.
  Marking a value as outside its range is a factual comparison; anything beyond
  that is a clinical judgement the software does not make.

**Acceptance:** Changing a patient's sex from Male to Female changes the
Haemoglobin reference range on screen and on the printed report. A haemoglobin of
6.2 raises a critical-value confirmation.

### M5 — Verification and release

- Technician marks a report **Ready for verification**.
- A user holding `report.release` reviews all values side by side with the ranges
  and either **Releases** or **Returns for correction** with a mandatory reason.
- On release, a PDF is rendered and stored **immutably**. That exact file is what
  gets reprinted forever after.
- Reprints are unlimited and logged.

**Acceptance:** A released report's PDF is byte-identical on the tenth reprint.

### M6 — Amendments

- A released report can never be silently edited.
- An amendment creates **version 2**, printed with a clear `AMENDED` banner, the
  amendment reason, and the date of the original.
- Version 1 remains retrievable forever.

**Acceptance:** Correcting a mistyped potassium produces a v2 PDF marked AMENDED;
v1 is still downloadable and still says what it originally said.

### M7 — Printing

- **A4 report**, two modes: full letterhead on blank paper, or body-only onto
  preprinted stationery (header suppressed, top margin preserved).
- Multi-panel orders print as one continuous report with department bands, not as
  separate sheets, matching current practice.
- Page breaks never split an analyte from its reference range, and never orphan a
  section heading.
- `Page 1 of 2` footer on multi-page reports.
- Printing works offline.

**Acceptance:** The printed output is dimensionally indistinguishable from the
supplied samples when measured against them.

### M8 — Patient history

- One patient view: every order, every report, newest first, each openable and
  reprintable.
- v1 does **not** include trend charts of repeated parameters. That is Phase 2 and
  is noted in the roadmap.

### M9 — Users and audit

- Admin creates users, assigns role and permissions, deactivates leavers.
- Password rules, Argon2id hashing, lockout on repeated failure.
- **Append-only audit log**: who viewed, created, edited, released, amended,
  reprinted or exported which patient record, and when. Admin-viewable,
  exportable, never editable by anyone through the application.

### M10 — Backup

- Automated daily encrypted backup, off-site.
- **A documented, actually-tested restore procedure.** An untested backup is not a
  backup. The roadmap includes a live restore drill as a milestone, not an
  afterthought.

---

## 4. Non-functional requirements

| Requirement | Target | How it is measured |
|---|---|---|
| Keystroke response in result entry | under 50 ms | Automated performance test in CI |
| Patient search | under 200 ms at p95, 100k patients | Seeded load test in CI |
| Report preview render | under 2 s | End-to-end test assertion |
| App load on clinic connection | under 3 s first load, under 1 s thereafter | Lighthouse budget in CI |
| Runs on | 4 GB RAM Windows PC, Chrome | Manual acceptance on clinic hardware |
| Offline | Full entry and print with no internet | End-to-end test with network disabled |
| Accessibility | WCAG 2.1 AA | Automated axe scan in CI, blocking |

---

## 5. Explicitly OUT of scope for v1

Listed so that nobody is surprised, including me.

- Billing, invoicing, receipts, price lists, day-end cash summary
- OPD registration, tokens, queues, doctor consultation notes, prescriptions
- Pharmacy, stock, batches, expiry, purchases
- Imaging reports (X-Ray, Video X-Ray, ECHO, ECG) and image attachment
- Physiotherapy, Dental, Minor OT, Nebulizer, Oxygen
- Inpatient admission, bed board, discharge summaries
- MIS dashboards, revenue analysis, TAT reporting
- Trend and cumulative charts of repeated parameters
- SMS / Viber / WhatsApp delivery, QR patient download
- Credit parties, corporate accounts, insurance claims
- Direct analyser interfacing (reading results off the AGD2260 automatically)
- Migration of historic Word and Excel records
- Nepali (Devanagari) data entry — supported by the PDF layer, not exposed in UI
- Any AI or automated clinical interpretation — permanently out of scope, not
  merely deferred

> **On analyser interfacing:** connecting the AGD2260 and the cell counter
> directly, so results flow in without typing, is the single biggest future win —
> it removes transcription error entirely. It is out of scope for v1 because it
> needs on-site access to the machines and their manuals. Worth planning for
> Phase 2.
