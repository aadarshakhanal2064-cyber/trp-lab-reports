# 05 — The Report Engine

This is the heart of the product. Everything else exists to feed it.

---

## 1. The good news from your samples

I expected to build seven templates. After reading all seven supplied PDFs, they
are clearly **one layout with different contents**. Every report has:

```
┌──────────────────────────────────────────────────────────────┐
│  [ letterhead — or blank space if preprinted stationery ]     │
├──────────────────────────────────────────────────────────────┤
│  Reg No     : ____________        Sex / Age   : ____________  │
│  Name       : ____________        Reg Date    : ____________  │
│  Referred By: ____________        Report Date : ____________  │
│  Referred Dr: ____________                                    │
├──────────────────────────────────────────────────────────────┤
│                      B I O C H E M I S T R Y                  │   <- department band
├──────────────────────────────────────────────────────────────┤
│  Test Name          Result      Unit      Reference Range     │   <- column header
│  ────────────────────────────────────────────────────────────│
│  LIPID Panel                                                  │   <- panel title
│  S. Cholesterol      185        mg/dL     Upto 200            │
│  S. Triglycerides    240   H    mg/dL     Normal: Upto 160    │
│                                           Border-line: 161-199│
│                                           High: >200          │
│  ...                                                          │
│  Instrument Used : AGD2260 Fully Automated Biochemistry Anal. │
│  Comment :                                                    │
├──────────────────────────────────────────────────────────────┤
│  Note : Cholesterol : CHOD PAP; HDL: Direct ...               │
│                       End Of Report                           │
│  [ verifier name / qualification / NMC no. ]                  │
└──────────────────────────────────────────────────────────────┘
```

So we build **one** engine with a handful of configurable row types, rather than
seven hand-drawn templates. Adding the eighth, ninth and twentieth test then costs
minutes of data entry by an admin instead of days of development.

---

## 2. Row types

The whole of every supplied report is expressible in six row types:

| Row type | Example from your samples |
|---|---|
| `panel_title` | `RENAL FUNCTION TEST`, `HAEMOGRAM ON CELL COUNTER` |
| `group_heading` | `Differential Leucocyte Count (DLC)`, `Physical Examination` |
| `analyte` | `Haemoglobin | 13.4 | gm/dl | Male : 12-18` |
| `analyte_with_method` | Same, plus a small indented method line (`IFCC`, `Biuret`) |
| `note_block` | The `Note :` paragraph at the foot of the CBC and Lipid reports |
| `footer_field` | `Instrument Used`, `Comment` |

If a future test needs a seventh row type, it is added once to the engine and is
then available to every report.

---

## 3. Reference ranges — the part that would have been got wrong

A naive design stores `min` and `max` numbers. Your samples break that
immediately. Four distinct shapes appear:

**Type 1 — plain interval.** `RBC COUNT: 4.00-6.00`
Straightforward. Flag high or low against the bounds.

**Type 2 — one-sided limit.** `SGPT: Upto 45`, `Blood Sugar PP: Upto 140`
Only an upper bound exists. There is no such thing as a "low SGPT" flag here, and
inventing a lower bound of zero would produce nonsense flags.

**Type 3 — conditional on the patient.**
```
Haemoglobin      Male : 12-18 / Female : 11-16
Serum Creatinine Male : 0.6-1.4 / Female : 0.5-1.2
Alkaline Phos.   Children (3-15 yrs) : 104-390 / Adults : 25-140
```
The applicable range depends on the patient's **sex and age at the sample date**.
The report prints the full text (so a doctor sees both bands) but the flag is
computed against the one that applies.

**Type 4 — interpretive bands.**
```
S. Triglycerides   Normal: Upto 160
                   Border-line High: 161-199
                   High: >200
```
Not a pass/fail at all — a classification. The report prints all three lines, and
the flag reflects which band the value fell into.

**Design consequence:** a reference range is a small **rule object**, versioned,
with the exact display text stored alongside the machine-readable bounds. The text
is what prints; the bounds are what flags. Keeping them together in one row is
what stops the printed range and the H/L marker from ever disagreeing — a subtle
failure that would badly damage trust in the system.

---

## 4. Letterhead: the two modes

**Preprinted mode** (what the clinic appears to do today)
The engine renders a configurable blank reserve at the top of page 1 — default
45 mm, adjustable in millimetres by the admin with a live preview and a printable
alignment test sheet. Pages 2+ get a smaller reserve or none, configurable,
because preprinted stationery usually only has a header on the first sheet.

**Full letterhead mode**
The engine draws logo, clinic name, address, phone, email and registration numbers
onto blank A4. Needs the vector logo requested in question A3.

Both modes render from the **same HTML and the same print stylesheet**. The
difference is one CSS variable. This matters because it means the two modes cannot
drift apart in layout.

**Alignment tooling.** Getting print to land correctly on preprinted paper is
always fiddly and always frustrating. We ship a one-click **alignment test page**
that prints a millimetre ruler and crosshairs; the admin measures against the real
stationery and types in the offset. This turns a week of "it prints slightly wrong
and nobody knows why" into a five-minute setup.

---

## 5. Pagination rules

Print layout is where cheap systems look cheap. Explicit rules:

- An analyte row never splits across a page.
- A `group_heading` is never the last thing on a page.
- A panel with fewer than three rows remaining never leaves one orphan row over.
- Column headers repeat at the top of every page.
- The department band repeats when a panel continues onto a new page.
- `End Of Report` and the verifier block appear **only on the final page**.
- Every page after page 1 carries `Reg No`, `Name` and `Page n of m` — so a loose
  second sheet is still identifiable as belonging to a patient.

---

## 6. From screen to paper: how identical output is guaranteed

One HTML document, one print stylesheet, two consumers:

- **Immediate printing** (works offline) — the browser prints that HTML directly.
- **The archived PDF** — a server-side Chromium renders the *same* HTML to PDF at
  release, storing it with a SHA-256 hash.

Because both paths render identical markup with identical CSS, what the technician
sees, what the printer produces and what is archived cannot diverge. The
alternative — a separate PDF library building its own layout — guarantees they
eventually will.

**Fonts** are embedded and self-hosted, never loaded from the internet, so an
offline PC prints exactly the same as an online one. Devanagari-capable fonts
(Noto Sans Devanagari) are embedded from day one even though v1 does not expose
Nepali entry, so that turning it on later is a setting rather than a re-test of
every report.

---

## 7. Amended reports

- `AMENDED` prints as a clear banner at the top of the body, not a footnote.
- The amendment reason prints beneath it.
- The original report date prints alongside the amendment date.
- Version 1's PDF remains downloadable, unchanged, forever.

Amendment is a deliberately heavier action than correction-before-release. That is
the point: it should feel like a formal act, because it is.

---

## 8. Appendix — analytes extracted from your samples

This is what will be seeded, taken verbatim from the supplied PDFs. **Please have
the lab in-charge check the reference ranges**, since these become the ranges the
system flags against.

### CBC — Haematology
| Analyte | Unit | Reference |
|---|---|---|
| Haemoglobin | gm/dl | M 12-18 / F 11-16 |
| RBC Count | mill/cumm | 4.00-6.00 |
| PCV | % | 36.00-52.00 |
| MCV | fL | 80.0-96.0 |
| MCH | pg | 27-32 |
| MCHC | % | 31.5-34.5 |
| RDW | % | 12.20-15.40 |
| TLC | /cmm | 4000-11000 |
| Neutrophil / Lymphocyte / Eosinophil / Monocyte / Basophil | % | 40-70 / 20-45 / 00-06 / 00-08 / 00-01 |
| Absolute counts (5, calculated) | /cmm | 2000-7000 / 1000-3000 / 40-440 / 200-1000 / 20-100 |
| Platelet Count | /cmm | 150000-400000 |
| Mean Platelet Volume | fL | 6.5-12.0 |

Footer note: the ICSH note on absolute differential counts.

### LFT — Biochemistry
Bilirubin Total (0.12-1.20) / Direct (0.00-0.50) / Indirect (Upto 0.7, calculated);
SGPT (IFCC, Upto 45); SGOT (IFCC, Upto 40); SGOT/SGPT ratio (Upto 2, calculated);
Alkaline Phosphatase (PNPP/AMP kinetic — children 3-15: 104-390, adults: 25-140);
Total Protein (Biuret, 6.0-8.8); Albumin (BCG, 3.5-5.5); Globulin (calculated,
2.3-3.3); A/G ratio (calculated).

> The extracted text for this report is jumbled — the source document appears to
> use text boxes. **The LFT layout needs a visual check against a real printout
> before seeding**, particularly which reference range belongs to which analyte.

### RFT — Biochemistry
Blood Urea (Urease GLDH, 15-40); BUN (calculated, 5-21); Creatinine (enzymatic,
M 0.6-1.4 / F 0.5-1.2); Uric Acid (TBHBA, M 3.4-7.0 / F 2.5-6.0); Sodium (ISE,
136-145); Potassium (ISE, 3.5-5.5); BUN/Creatinine ratio (calculated, Upto 20).

### Lipid Panel — Biochemistry
Cholesterol (Upto 200); Triglycerides (3 bands); HDL (30-87); LDL (3 bands); VLDL
(calculated, Upto 35); Chol/HDL (< 5.0); Trig/HDL (< 3.00); LDL/HDL (< 3.60).

### FBS / PPBS — Biochemistry
Fasting (GOD-POD, 65-110); Post-prandial (Upto 140).

### Urine R/E — Clinical Pathology
Physical: Quantity, Colour, Appearance, Deposits.
Chemical: Reaction (pH), Proteins, Glucose, Ketone Bodies, Bile Pigments,
Urobilinogen, Specific Gravity (1.015-1.024).
Microscopic (/hpf): Pus (WBC) Cells, RBC, Epithelial Cells, Casts, Crystals,
Others. Plus Comment.

### Stool R/E — Clinical Pathology
Physical: Colour, Consistency, Mucus, Blood, Parasites.
Chemical: Reaction.
Microscopic (/hpf): RBC, Pus Cells, Veg. Cells/Fibres, Fat Droplets, Ova/Eggs,
Cyst, Other.

> For Urine and Stool, most values are qualitative. These get **picklists**
> (`Nil`, `Trace`, `+`, `++`, `+++`, `Pale yellow`, `Straw`, `Semi-solid`...) with
> free-text override. The picklist contents are the second thing I need from the
> lab in-charge after the reference ranges — they are what the technicians
> actually type today, and getting them right is what makes the screen feel fast
> rather than obstructive.
