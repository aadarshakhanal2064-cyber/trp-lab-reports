# 01 — Open Questions & Assumptions

Answer what you can. Where you don't answer, I will build to the **assumption**
stated, which is written in bold so you can catch it and correct it.

---

## A. Blocking — I need these before the relevant part can be built

### A1. Does the clinic print onto preprinted letterhead paper today?
Every one of the seven sample PDFs has a completely blank top area. That means
either (a) they print onto pre-printed stationery, or (b) the letterhead was
stripped when the samples were made.

**I need:** one scan or photo of a *finished* report as handed to a patient, so I
can see the real header, and if possible one sheet of the blank stationery.

**Assumption if unanswered:** preprinted stationery is in use, ~45mm reserved at
the top, and we build the app-printed letterhead as the secondary mode.

### A2. Are lab reports signed today, and by whom?
No signature block appears in any sample. This is unusual for pathology reports
and it matters both clinically and legally.

**I need:** the verifier's full name, qualification, and **NMC registration
number**; whether they want a scanned signature image on the PDF; and whether a
second signatory (e.g. lab in-charge / MLT) also appears.

**Assumption if unanswered:** one verifier, printed name + qualification + NMC
number, no signature image, with a footer line reading
*"Electronically verified. Valid without physical signature."*

### A3. The logo file is too low-resolution to print.
`ASSEST/logo hospital.jpg` is roughly 231×231 pixels. Printed at the size a
letterhead needs, it will look visibly blurry and blocky.

**I need:** the original vector file (`.ai`, `.eps`, `.svg`, `.cdr`) from whoever
designed it or from the printing press that makes the clinic's stationery. Failing
that, a scan of printed stationery at 600 dpi.

**Assumption if unanswered:** we use preprinted-stationery mode only, and the
app-printed letterhead mode ships without a logo until a good file arrives.

### A4. Exact clinic identity block for the letterhead.
Registered name as it must legally appear, full address, phone(s), email, and any
registration or licence numbers that must be printed on a pathology report.

**Assumption if unanswered:** "Tandi Ratnanagar Polyclinic Pvt. Ltd.,
Ratnanagar-2, Chitwan, Nepal" with placeholders for the rest, flagged in the app
as incomplete.

### A5. The remaining test formats.
Seven were supplied. To reach the agreed 15–20, I need the formats for whatever
else the lab runs. Likely candidates based on a clinic of this type:
Thyroid (TSH/T3/T4), HbA1c, Widal, Blood Grouping & Rh, Serum Electrolytes,
Amylase/Lipase, PT/INR, ESR, Pregnancy (UPT), HBsAg / HIV / HCV rapid tests,
Semen analysis, Blood Sugar Random, Calcium, Serum Iron.

**Assumption if unanswered:** I seed the seven supplied formats exactly, plus
HbA1c, TSH/T3/T4, Widal, Blood Grouping, ESR and UPT built to standard formats,
all marked "unverified — admin must confirm reference ranges before use."

---

## B. Important — affects design, but I can proceed

### B6. Reference ranges: the clinic's own, or the ones in the samples?
The supplied ranges will be used verbatim. If the lab's analyser
(AGD2260 / EL-120 Erma) came with its own validated ranges that differ, those
must win. **Assumption: the sample ranges are correct as supplied.**

### B7. Do reference ranges need paediatric bands?
Only Alkaline Phosphatase carries an age split in the samples. Children's CBC and
biochemistry ranges differ substantially from adults'.
**Assumption: adult ranges only, plus the ALP age split. Paediatric bands added
later if the clinic sees children regularly.** Tell me if they do.

### B8. Report / accession numbering.
Is there an existing lab number series to continue, and does it reset yearly (e.g.
by Nepali fiscal year)?
**Assumption: a fresh series `TRP-{BS-year}-{6 digits}`, resetting each Baisakh.**

### B9. Date format on the printed report.
**Assumption: BS as the primary printed date with AD in smaller type beside it,
e.g. `2082-05-07 (2025-08-23)`. Internally everything stores AD timestamps.**

### B10. Are results delivered digitally as well as on paper?
**Assumption: paper only in v1.** Viber/WhatsApp PDF delivery and patient
self-download by QR code are deliberately deferred — they add a patient-identity
and consent problem that deserves its own design.

### B11. Volume — how many lab reports per day?
This sets the performance targets and the hosting tier.
**Assumption: 60–120 reports/day, ~2 technicians entering, growing to 200/day.**

### B12. How many PCs, what browser, what printer?
**Assumption: 2–3 Windows PCs on Chrome, one shared A4 laser printer.** If any
machine is on Internet Explorer or a very old Chrome, tell me now — it changes the
front-end build target.

### B13. Existing patient records to import?
**Assumption: start clean.** Historic Word/Excel records are not migrated in v1.

---

## C. Commercial & ownership — please answer, these are yours not mine

### C14. Who owns and pays for the hosting account?
If the clinic pays, the account should be in the clinic's name with you as an
administrator. If you pay personally, write down what happens to the patient data
if you and the clinic part ways. This is a real governance question, not a
technical one, and it is easier to settle now than later.

### C15. Target go-live date?
**Assumption: no hard deadline.** If there is one — an inspection, a new
financial year, an equipment purchase — tell me, because it changes what gets cut.

### C16. Is the clinic empanelled with the Health Insurance Board?
Only relevant later (claims), but it affects whether reports need specific
identifiers. **Assumption: not empanelled, or not relevant to lab reports.**

---

## D. Things I am deliberately NOT deciding for you

- **Whether reports may legally go out unsigned.** See A2. You are better placed
  than I am to check what the Nepal Medical Council and the lab's own licensing
  require. I will build for signed release because that is the safe default.
- **Retention period for clinical records.** See `06-security-and-compliance.md`.
  I have named the statutes I believe apply but I have deliberately not invented
  section numbers or periods. As a CA you can verify these properly; if you would
  like me to research it with sources before you do, say so and I will.
