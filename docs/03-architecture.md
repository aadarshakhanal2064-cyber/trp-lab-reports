# 03 — Architecture: three options, in plain language

Currency note: costs are converted at roughly **NPR 135 = USD 1**. Exchange rates
move; treat these as indicative and expect them to drift 5–10% either way.

---

## 1. First, the shape of the thing

Whatever we choose, the system has four parts:

1. **The screen** — what the technician sees, running in Chrome on a clinic PC.
2. **The brain** — the rules: reference ranges, calculated values, who may do what.
3. **The filing cabinet** — the database of patients, results and released PDFs.
4. **The printer path** — turning a finished report into ink on A4.

The **offline requirement changes where the brain lives.** Because the lab must
keep working during an outage, the reference-range logic and the calculations have
to run **on the technician's PC, inside the browser**, not only on the server.

That creates the classic trap: the same rule written twice, once for the browser
and once for the server, which then drift apart and produce different numbers.
The way to avoid it is to write the rules **once, in one language, and run that
same code in both places**. That single constraint is what drives the stack
recommendation below more than anything else.

### How offline will actually work (and why it is affordable)

Full two-way sync — where any device can edit anything while disconnected and the
system reconciles the mess — is genuinely expensive and is where projects like this
go to die.

We do not need it. The lab's real offline need is narrow:

- The **test catalogue** (panels, analytes, units, reference ranges) changes maybe
  monthly. It is cached on the PC in full. Read-only offline.
- **Today's patients and orders** are cached. New patients created offline get a
  temporary local ID.
- A result is **owned by one technician at one bench at one time.** Two people do
  not type the same CBC simultaneously.

So offline becomes a **one-way outbox**: work done offline is queued locally and
pushed up when the connection returns, in order. Genuine conflicts are close to
impossible by design rather than by clever reconciliation. If one does occur, the
server refuses the write and raises it for a human to resolve — it never guesses.

**This is the single most important design decision in the document.** It is what
keeps an offline-capable cloud app inside a small clinic's budget.

---

## 2. Option A — Managed cloud platform *(recommended)*

**What it is:** We rent a ready-made database and a ready-made place to run the
app. Somebody else patches the servers, takes the backups and keeps the lights on.

**Stack:** TypeScript everywhere. React (Vite) as a Progressive Web App for the
screen and offline cache; Node.js + Fastify for the API; PostgreSQL for the data;
server-side Chromium for the immutable PDF.

**Hosting:** Supabase (managed PostgreSQL, auth, file storage) in the Mumbai or
Singapore region, plus a small app host.

| Item | USD/month | NPR/month |
|---|---|---|
| Supabase Pro (database, auth, PDF storage, daily backups) | 25 | ~3,375 |
| App hosting (small instance) | 5–10 | ~675–1,350 |
| **Total** | **30–35** | **~4,000–4,700** |

Plus one-off: domain ~NPR 1,500/year.

**Good:** Nothing for you to maintain. Backups are automatic and point-in-time.
Fastest route to a working system. Scales well past this clinic's needs.

**Bad:** Most expensive of the three. Payment needs an international card, which
is a real friction in Nepal — see the warning in section 5.

**Lock-in:** Low but not zero. The database is standard PostgreSQL and the app
runs in a standard container, so moving to Option B later is a weekend of work,
not a rewrite. The one piece that is Supabase-specific is authentication, which we
keep deliberately thin for that reason.

---

## 3. Option B — One rented server you control

**What it is:** We rent a single virtual machine and put everything on it.

**Stack:** Identical to Option A. Only the hosting differs.

| Item | USD/month | NPR/month |
|---|---|---|
| VPS, 2 vCPU / 4 GB (Hetzner or DigitalOcean) | 5–12 | ~675–1,600 |
| Off-site encrypted backup storage | 1–2 | ~135–270 |
| Cloudflare (free tier) | 0 | 0 |
| **Total** | **6–14** | **~800–1,900** |

**Good:** Cheapest credible option — roughly **a quarter the cost of Option A**.
Zero lock-in; the whole system is portable. Full control.

**Bad:** Somebody has to be the system administrator — security patches, database
backups, certificate renewal, disk space, and being the person who gets called
when it breaks at 9 p.m. **That person cannot be you.** If you go this route,
budget either a retainer for a local technician (realistically NPR 3,000–8,000 a
month, which erases the saving) or accept that it will be neglected.

**My honest read:** the cost saving is real but it is not free — it is paid in
attention that a working CA does not have.

---

## 4. Option C — PHP / Laravel on cheap shared hosting

**What it is:** The most common web stack in Nepal, on the cheapest hosting there
is. Included because you asked about the hiring pool, and it is a fair question.

| Item | NPR/month |
|---|---|
| Shared hosting with MySQL | ~500–1,200 |

**Good:** Cheapest. The largest pool of developers in Nepal who can maintain it.
Local hosting providers who accept eSewa/Khalti and issue a Nepali VAT bill.

**Bad, and it is disqualifying here:**

- **Offline is the problem.** The PHP half cannot run in the browser, so the
  reference ranges and every calculated value would have to be written twice —
  once in PHP for the server, once in JavaScript for offline use. Two copies of
  the rule that decides whether a haemoglobin is dangerously low is exactly the
  kind of silent, expensive bug you told me you cannot personally catch.
- Shared hosting typically forbids the background Chromium process we need for
  reliable PDF rendering, and often forbids long-running processes generally.
- Weaker type safety, so fewer mistakes are caught automatically — which
  undermines the whole "the tooling must stop bad code, not me" requirement.

**Verdict: not recommended**, specifically because of the offline decision you
made. If you later drop the offline requirement, Option C becomes reasonable
again and I will say so.

---

## 5. Recommendation

**Start with Option A. Design so that moving to Option B is easy.**

The reasoning in one paragraph: you cannot be a system administrator and should
not become one, so managed hosting is worth the extra ~NPR 3,000 a month. The
extra cost is roughly what the clinic charges for **two lipid profiles**. Every
component we use is standard and portable, so if the clinic later finds a
technician who wants to run it on a cheap VPS, that door stays open.

Set a review point at **twelve months**. If the system is stable and someone
competent is available locally, moving to Option B saves around NPR 36,000 a year.

### One thing to check before committing — payment

Supabase, Hetzner, DigitalOcean and Vercel all bill in USD and require an
international credit card. Nepali cards frequently fail on these, and NRB rules on
foreign currency spending are your territory rather than mine. **Please confirm
the clinic can actually pay a recurring USD subscription before we build on one.**
If it cannot, tell me and I will re-plan around a Nepali hosting provider — it is a
worse technical fit, but a system nobody can pay for is worse still.

---

## 6. Other costs you should see now

| Item | Cost | Notes |
|---|---|---|
| Hosting | NPR 4,000–4,700/month | Recurring, forever |
| Domain | ~NPR 1,500/year | Recurring |
| **UPS for the lab PC + router** | NPR 8,000–15,000 one-off | Strongly recommended. Cheap insurance against the power cuts you flagged, and it protects the PC too. |
| Logo redraw as a vector file | NPR 2,000–5,000 one-off | See question A3 — the current file will print badly |
| Better A4 laser printer, if the current one is tired | NPR 20,000–35,000 | Only if needed |

---

## 7. Where the servers sit, and why it matters

Choose the **Mumbai** region. From Chitwan the round trip is roughly 40–70 ms,
against 100–160 ms for Singapore and 300 ms+ for Europe or the US.

That said, the offline-first design means server latency barely affects the
technician's experience — typing, calculating and flagging all happen locally and
respond instantly regardless of the network. Region choice mainly affects how
quickly the app loads in the morning and how fast search feels.

---

## 8. Decisions recorded

Each of these will get a short ADR file in the repository when we start building,
so a future developer understands the reasoning:

- **ADR-001** TypeScript on both sides, so business rules are written once.
- **ADR-002** Offline via a one-way outbox, not full bidirectional sync.
- **ADR-003** PostgreSQL over MySQL, for stronger constraints and better JSON
  handling in reference-range rules.
- **ADR-004** Reference ranges as versioned data rather than code, so an admin can
  correct one without a developer.
- **ADR-005** Released reports stored as immutable PDFs, rendered from the same
  HTML the browser prints, so screen and paper cannot diverge.
