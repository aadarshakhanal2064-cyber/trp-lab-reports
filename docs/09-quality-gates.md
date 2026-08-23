# 09 — Quality Gates

## 1. The problem this document solves

You told me plainly: you cannot read the code, you cannot catch mistakes in it,
and you will approve anything that looks fine. That is an honest and useful thing
to know, and it changes how this project should be built.

So the rule is: **the tooling has to be what stops bad code, not you.**

Every gate below runs automatically on every change. If any gate fails, the change
**cannot be merged** — not by me, not by a future developer, not by someone in a
hurry at 7 p.m. That is the entire point. A gate that can be skipped is not a gate.

Section 4 tells you how to **verify each gate is really working**, without reading
any code. Please actually do those checks — a quality gate nobody has tested is
worth precisely as much as a backup nobody has restored.

---

## 2. The gates

Every one of these runs on every proposed change, in this order:

### Gate 1 — Types
**Tool:** TypeScript in `strict` mode.
**Blocks:** any type error; `any`; implicit `any`; unchecked null.

This catches whole categories of bug before the code ever runs — passing a patient
where an order was expected, using a value that might be missing, mistyping a field
name. Configuration is locked so a future developer cannot quietly relax it.

### Gate 2 — Lint and format
**Tool:** ESLint + Prettier. **Zero warnings tolerated** — not "few", zero.
**Blocks:** unused code, unsafe patterns, floating promises (a real source of
"the save silently didn't happen"), inconsistent formatting.

Plus **custom rules written specifically for this project**:
- No hard-coded colour values or pixel numbers in components — design tokens only.
- No raw SQL string concatenation — parameterised queries only.
- No `console.log` in shipped code — structured logging only.
- No patient-identifying field passed to a logger.

### Gate 3 — Tests
**Tools:** Vitest for unit and integration, Playwright for end-to-end.

**Unit tests — mandatory, no exceptions, for:**
- Every calculated analyte formula, tested with values from real reports
- Reference-range resolution across all four range types, including the sex and
  age boundaries (what happens at exactly 15 years old for Alkaline Phosphatase?)
- Flag determination, including the boundaries — is exactly 12.0 normal or low?
- Critical-value detection
- BS ↔ AD date conversion against known date pairs across the whole range
- Age-at-sample-date calculation, including leap years

> These are the calculations where a silent bug is invisible on screen, looks
> perfectly plausible on paper, and reaches a patient. They get the most tests.

**Integration tests:** every API endpoint, including its permission behaviour.

**End-to-end tests** for the critical flows:
1. Register patient → create order → enter CBC → verify → release → print
2. Same flow entirely offline, then reconnect and confirm sync
3. Amend a released report; confirm v1 is unchanged and v2 is marked AMENDED
4. Search 100,000 patients within the time budget
5. A technician attempts an admin action and is refused **by the server**

**Coverage target:** 90% on business logic (calculations, ranges, flags, dates,
permissions); 70% overall. Set as a floor that cannot be lowered without an
explicit, visible change.

### Gate 4 — The authorisation test *(the most important one for you)*
**Custom automated test.** It enumerates every API endpoint in the application and
asserts that each one performs a server-side permission check.

**A new endpoint without a permission check fails the build.**

This exists because "someone forgot the permission check on one endpoint" is the
single most common way real systems leak patient data, and it is completely
invisible in a demo. The UI looks perfect. The data is open.

### Gate 5 — Dependency and secret scanning
**Tools:** `npm audit`, Dependabot, and a secret scanner on every commit.
**Blocks:** any high or critical vulnerability; anything resembling a key,
password or token in the repository.

Dependency policy: minimal, well-maintained packages only. Adding a dependency is
a decision that gets recorded, not a reflex.

### Gate 6 — Security scanning
**Tools:** static analysis (Semgrep) with rules for injection, authorisation and
unsafe rendering; automated security headers check.

### Gate 7 — Accessibility
**Tool:** axe, run against every screen in the end-to-end tests.
**Blocks:** any WCAG 2.1 AA violation, including contrast failures.

### Gate 8 — Performance budgets
Automated assertions, so "superfast" is measured rather than claimed:
- Patient search under 200 ms at p95 against 100,000 seeded records
- Result-entry keystroke response under 50 ms
- Report preview under 2 s
- Bundle size ceiling, so the app keeps loading fast on a clinic connection

**A change that makes the application slower fails the build.** Performance decays
by a hundred small unnoticed regressions; this is the only reliable defence.

### Gate 9 — Migrations
Schema changes only ever through versioned migrations. CI verifies that every
migration applies cleanly to a copy of the production schema and that a rollback
exists. **No hand-edited database, ever.**

### Gate 10 — Build
The application must actually build and start. Obvious, and it still catches things.

---

## 3. Beyond the automated gates

**Conventional commits** (`feat:`, `fix:`, `chore:`) so history is readable and a
changelog generates itself.

**Branch protection:** no direct commits to `main`. Every change goes through a
pull request with all gates green.

**ADRs** — a short record of every non-obvious decision, in plain language, so a
future developer understands *why* rather than guessing. The five from
`03-architecture.md` are the first.

**One-command setup** — `npm run setup` gives a new machine a running system with
seed data. If onboarding takes a day, the next developer starts by breaking things.

---

## 4. How you verify each gate actually works

Do these once, at the start of week 3, when the foundations are in place. It takes
about half an hour and it is the only way you will ever know the safety net is
real.

Ask me to deliberately break something, then watch the build go red. Specifically:

| # | Ask me to... | You should see |
|---|---|---|
| 1 | Add a variable typed `any` | Gate 1 fails: type error |
| 2 | Add a hard-coded colour like `#FF0000` to a component | Gate 2 fails: token rule violated |
| 3 | Change the VLDL formula from `Trig / 5` to `Trig / 4` | Gate 3 fails: formula unit test |
| 4 | Add an API endpoint with no permission check | Gate 4 fails: authorisation test |
| 5 | Commit a fake API key | Gate 5 fails: secret detected |
| 6 | Set button text colour to light grey on white | Gate 7 fails: contrast |
| 7 | Add an artificial 500 ms delay to patient search | Gate 8 fails: budget exceeded |
| 8 | Edit a database table without a migration | Gate 9 fails: schema drift |

**Then ask me to try merging each one anyway.** You should see it refused. That
refusal is what you are buying.

I will record these eight demonstrations in a document you keep, with screenshots
of each failure. If a future developer ever weakens a gate, that document is your
reference for what protection existed.

---

## 5. The honest limits of this

Automated gates catch a great deal. They do not catch everything, and you should
know where the edges are:

- **They cannot tell you a reference range is medically wrong.** If the seeded
  range for potassium is mistyped, every test passes and every report is wrong.
  **Only the lab in-charge signing off the ranges catches that** — which is why
  it is a hard gate in the week 4 milestone rather than a suggestion.
- **They cannot tell you the workflow is wrong.** If technicians find the entry
  screen awkward, the build is green and the product is bad. Only watching a real
  technician use it catches that — hence week 10's parallel running.
- **They cannot tell you the printed report looks unprofessional.** Only holding
  it next to the current one catches that.

So: the tooling stops bad *code*. Three human checkpoints stop bad *product* —
the range sign-off, the technician trial, and the printout comparison. Those three
are your job, and they are the only three. I will make sure each one happens and
tell you plainly if one is being skipped.
