# 10 — Risks

Ranked by **expected damage**, not by how alarming they sound. The top three are
the ones I would actually lose sleep over, and none of them is a coding problem.

---

## R1 — Staff resist it and quietly keep using Word
**Likelihood: High · Impact: Fatal to the project**

This is the most likely way this project fails, and it has nothing to do with the
software being good or bad.

People who have typed reports in Word for years are **fast at it**. They have their
own files, their own shortcuts, their own workarounds. On day one, the new system
will make them slower — every new system does. If there is a queue of patients and
a technician is struggling, they will open Word, because Word works and they have
a person waiting in front of them. Entirely rational, and it is how these projects
die: not with a rejection, but with a slow drift back.

**Mitigations**
- **Parallel running for a full week** (roadmap week 10). Word stays available.
  Nobody is asked to trust the new thing before it has earned it.
- **Word is switched off only when the technicians say the new way is faster** —
  not when I say it is finished. That is a genuine handover of the decision.
- Involve the technicians in **week 5**, not week 10. Someone who was asked their
  opinion in week 5 defends the system in week 12.
- **Keyboard-first design** is an adoption strategy as much as a design one. The
  moment a fast typist realises they never have to touch the mouse, resistance
  turns into preference.
- Printed shortcut sheet taped above the bench. Small, cheap, disproportionately
  effective.
- Find the one technician who is quickest to pick it up and make them the local
  expert. Peer help beats external training every time.
- **Measure it honestly**: if reports are still slower after two weeks, that is my
  failure to fix, not the staff's failure to adapt. I will tell you if that happens.

---

## R2 — A wrong result reaches a patient
**Likelihood: Medium · Impact: Critical**

The worst outcome available to this project. Three routes: a mistyped reference
range in the catalogue, a wrong calculation formula, or a value entered against
the wrong patient.

**Mitigations**
- Reference ranges signed off in writing by the lab in-charge before go-live
  (roadmap week 4, a hard gate).
- Every calculated formula unit-tested with values from real reports.
- Verify-before-release, by a different person than the one who entered.
- Critical-value confirmation that interrupts the technician deliberately.
- Patient name, sex and age visible at all times during entry.
- Immutable versioning, so an error is corrected visibly rather than hidden.

**Residual risk I cannot remove:** if the lab in-charge signs off a range that is
itself wrong, everything passes and the reports are wrong. Section 5 of
`09-quality-gates.md` is explicit about this. It is a human control, and it is the
most important one in the project.

---

## R3 — The missing inputs never arrive
**Likelihood: Medium-High · Impact: High**

The plan depends on the logo, letterhead, signature details, remaining test
formats and reference ranges in `01-open-questions.md`. In my experience these
things take weeks to extract from a busy clinic, and the work stalls in the
meantime.

**Mitigations**
- Sequenced so weeks 1–3 need none of them.
- Everything unanswered has a stated assumption, so building continues.
- The catalogue is admin-editable, so a late correction is a data change, not a
  code change.
- **The one that genuinely blocks is A5 — the remaining test formats.** If those
  are not in hand by week 4, we ship with the seven supplied and add the rest
  later. That is an acceptable outcome. Say so early and we plan for it rather
  than discovering it.

---

## R4 — Offline sync produces duplicate or lost data
**Likelihood: Medium · Impact: High**

The offline requirement is the most technically dangerous part of this build. Done
badly, it produces two copies of the same patient, results attached to the wrong
order, or work that silently disappears on reconnect — and the last one destroys
trust permanently.

**Mitigations**
- The deliberately narrow design in `03-architecture.md` section 1: one-way
  outbox, single-writer-per-report, no general two-way merge. Most conflict
  scenarios are made structurally impossible rather than handled.
- The server **refuses** a genuine conflict and raises it for a human. It never
  guesses which version is right.
- Offline sync is an explicit end-to-end test, run on every build.
- Honest, always-visible connection status. A technician always knows whether
  their work has reached the server.

---

## R5 — The hosting account is lost
**Likelihood: Medium · Impact: Critical**

Discussed as T10 in `06-security-and-compliance.md`, repeated here because it is a
business risk rather than a technical one. A failed card, an expired address, a
single owner unreachable, or a disagreement between you and the clinic could put
the patient records out of reach.

**Mitigations**
- Two administrators on the hosting account from day one.
- **A monthly encrypted backup pulled down to a drive the clinic physically holds**
  — the only control that survives losing the account entirely.
- Settle the ownership question (C14) **before** go-live, not after.
- No vendor lock-in: standard PostgreSQL, standard containers, exportable data.

---

## R6 — USD payment fails
**Likelihood: Medium · Impact: Medium, but early**

Nepali cards frequently fail on international subscriptions and NRB rules on
foreign-currency spending apply. If the clinic cannot pay for Supabase or a VPS,
the recommended architecture is unusable.

**Mitigation:** confirm this in week 1, before anything is built on it. If it
fails, we re-plan onto a Nepali hosting provider — technically worse, but a system
nobody can pay for is worse still.

---

## R7 — Print output does not match the current reports
**Likelihood: Medium · Impact: Medium**

Doctors and patients recognise the current format. A report that looks subtly
different reads as less trustworthy, however accurate it is.

**Mitigations**
- The engine was designed from the actual samples, not from a generic template.
- The alignment test sheet handles preprinted stationery properly.
- Definition of done requires measuring a printout against the original.
- Fonts embedded, never fetched from the internet, so offline printing is
  identical.

---

## R8 — Scope creep back toward the full hospital system
**Likelihood: High · Impact: Medium**

The original brief covers thirteen departments. Once the lab system works, "can it
also do billing?" arrives within a fortnight. Answering yes mid-build is how a
ten-week project becomes an eighteen-month one that never ships.

**Mitigations**
- The out-of-scope list in `02-requirements.md` is explicit and is the reference
  point for that conversation.
- Requests are written down for Phase 2, not absorbed.
- The architecture genuinely accommodates later phases, so saying "later" costs
  nothing and is not a refusal.
- **I will push back** if asked to add scope mid-phase, and tell you what it costs
  in weeks rather than quietly absorbing it.

---

## R9 — Power cuts corrupt work in progress
**Likelihood: High · Impact: Low, if handled**

Frequent in Ratnanagar, and handled — but only if the mitigations are actually
bought.

**Mitigations**
- Constant local autosave; a power cut loses at most a few seconds.
- Offline-first means the app resumes rather than restarts.
- **A UPS for the lab PC and the router** (NPR 8,000–15,000, in
  `03-architecture.md` section 6). Cheap, and it protects the PC hardware too.
  Please actually buy it — it is the highest return per rupee in this whole plan.

---

## R10 — Single-developer dependency
**Likelihood: Certain · Impact: Medium-High**

If I stop being available, someone else has to pick this up.

**Mitigations**
- Boring, mainstream stack with a large hiring pool.
- ADRs explaining every non-obvious decision.
- One-command setup, seed data, comprehensive tests.
- A test suite is the most useful thing a new developer inherits — it lets them
  change code without fear.
- Plain-language runbook for operations.

**Residual risk:** a new developer will still need weeks to get productive. That
is normal and not fully solvable; it is reduced, not eliminated.

---

## R11 — Regulatory position turns out to be different
**Likelihood: Low-Medium · Impact: Medium**

The unresolved questions in `06-security-and-compliance.md` section 8 — electronic
signature validity, record retention, and whether health data may be hosted
outside Nepal.

**Mitigations**
- Signed release and NMC numbers built in from the start, which is the
  conservative position.
- Retain everything indefinitely until told otherwise — the only policy that
  cannot destroy evidence.
- **Data residency is the one that could hurt**, because it would change the
  hosting decision. Confirm before go-live, not after migration. Cheap now,
  expensive later.
