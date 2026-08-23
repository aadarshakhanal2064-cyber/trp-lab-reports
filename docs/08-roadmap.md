# 08 — Roadmap

## 1. Estimate, and how much to trust it

**10 weeks to go-live**, assuming the answers in `01-open-questions.md` arrive in
the first two weeks and the lab in-charge is available for about two hours a week.

Treat this as a **range of 9–14 weeks**, not a promise. The two things most likely
to extend it are outside my control: the missing report formats and reference
ranges (question A5), and the letterhead/logo/signature questions (A1–A4). Work
stops on print output without them.

The single biggest cost driver is the offline requirement — roughly **weeks 6–7
exist entirely because of it**. That was the right call, but it should be visible.

---

## 2. Phase 1 — the lab stops using Word

### Weeks 1–2: Foundations
Repository, TypeScript strict mode, database schema and migrations, CI pipeline
with every gate from `09-quality-gates.md` **switched on and failing correctly
before any feature code is written**, authentication, roles and permissions,
audit-log infrastructure, seeded address masters, one-command local setup.

*Milestone:* an empty but secure application that a user can log in to, with a red
build if any rule is broken. **Deliberately unglamorous, and not negotiable** —
turning gates on later never happens.

### Week 3: Patients
Registration, fuzzy search under 200 ms against 100,000 seeded records, duplicate
detection, patient view, merge, soft delete, full audit.

*Milestone:* register a patient and find them instantly. Demo to you.

### Week 4: Catalogue
Panels, analytes, groups, units, methods, the reference-range rule engine covering
all four range types, the calculated-field engine with unit tests, admin screens.
Seed the seven supplied formats.

*Milestone:* CBC, LFT, RFT, Lipid, FBS/PPBS, Urine R/E and Stool R/E exist in the
system with correct ranges. **Lab in-charge reviews and signs off the ranges.**
This is a hard gate — no further work on those tests until it happens.

### Week 5: Result entry
The result grid, keyboard navigation, live calculation, live flagging,
critical-value confirmation, picklists for qualitative results, constant autosave,
order and accession workflow.

*Milestone:* a technician enters a full CBC in under 90 seconds without a mouse.
**Get a real technician to try this**, not you and not me.

### Weeks 6–7: Print, and offline
The report engine, the master layout, both letterhead modes, the alignment test
sheet, pagination rules, server-side PDF with hashing, immutable storage.

Then the offline layer: catalogue caching, the local outbox, sync on reconnect,
honest connection indicators, offline printing.

*Milestone:* pull the network cable mid-CBC. Entry, calculation, flagging and
printing all continue. Reconnect; everything syncs cleanly.

### Week 8: Verify, release, amend
Verification screen, release with immutable PDF, reprint, amendment with versioning
and the AMENDED banner, return-for-correction.

*Milestone:* release a report, amend it, and confirm v1 is still retrievable and
unchanged.

### Week 9: Hardening
Full end-to-end test suite for the five critical flows, load testing, security
review, accessibility audit, backup configuration, **the first live restore
drill**, the runbook, and printing on the clinic's actual printer with the
clinic's actual paper.

*Milestone:* a successful restore from backup, timed and signed off.

### Week 10: Parallel running
The system runs **alongside Word**, not instead of it. Every report is produced
both ways and compared. Staff training, printed shortcut sheets, the wall chart,
daily check-ins to catch friction while it is still cheap to fix.

*Milestone:* three consecutive days where every report matches, and technicians
say the new way is faster. **Only then does Word get switched off.**

---

## 3. Definition of done — Phase 1

Not "the code is written". All of these:

- [ ] All seven supplied formats reproduce the current reports, verified by
      measuring a printout against the original
- [ ] Reference ranges signed off in writing by the lab in-charge
- [ ] Every calculated field has a unit test using values from a real report
- [ ] A technician enters a CBC in under 90 seconds without a mouse
- [ ] Patient search under 200 ms at p95 with 100,000 records
- [ ] Full offline entry and print demonstrated with the network disconnected
- [ ] Released PDFs immutable and hash-verified
- [ ] Amendment produces v2; v1 remains retrievable
- [ ] Every endpoint has an automated permission-check test
- [ ] Zero type errors, zero lint warnings, zero high/critical vulnerabilities
- [ ] Accessibility audit passes with no violations
- [ ] Backup restore drill completed and timed
- [ ] Runbook written in plain language and printed at the clinic
- [ ] Three days of clean parallel running

---

## 4. What comes after (not committed, not costed)

Listed so the sequence is visible, in the order I would actually recommend:

**Phase 2 — depth in the lab (4–6 weeks)**
The remaining test formats; trend charts of repeated parameters (every HbA1c on
one line, which is the feature doctors will ask for first); turnaround-time
reporting; **direct analyser interfacing** — connecting the AGD2260 and the cell
counter so results arrive without typing. That last one removes transcription
error entirely and is the highest-value thing on this whole list.

**Phase 3 — outward (4–6 weeks)**
Doctor login and read-only result access; imaging report entry (X-Ray, Video X-Ray,
ECHO, ECG) reusing the same report engine; report delivery by Viber/WhatsApp with
QR self-download.

**Phase 4 — the money side (8–12 weeks)**
Billing, receipts, day-end reconciliation, department and doctor revenue. **This
is where the IRD, CBMS and VAT questions in `06-security-and-compliance.md`
become live**, and they should be settled before this phase starts, not during it.

**Phase 5 — the rest of the clinic**
Pharmacy with batch and expiry tracking; OPD and queues; IPD and bed board.
Pharmacy alone is comparable in size to everything in Phase 1.

> **A recommendation you did not ask for:** run Phase 1 for at least two months
> before starting Phase 2. Not to save money — to find out what the staff actually
> need, which will be different from what any of us predict now. The most common
> way projects like this fail is building phases 2 through 5 on assumptions formed
> before phase 1 met a real user.
