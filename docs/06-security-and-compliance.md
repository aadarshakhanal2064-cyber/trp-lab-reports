# 06 — Security, Privacy and Compliance

## 1. What we are actually protecting

Pathology results are among the most sensitive records a clinic holds. A CBC is
mundane; an HIV, HBsAg or pregnancy result is not. In a town the size of
Ratnanagar, an unauthorised disclosure is not an abstract risk — it is a person's
neighbours finding out something about them.

The controls below are sized for that, not for a bank.

---

## 2. Threat model

Threats are ranked by **likelihood in this specific clinic**, not by how dramatic
they sound. The realistic threats here are mundane and internal.

| # | Threat | Likelihood | Impact | Controls |
|---|---|---|---|---|
| T1 | A staff member looks up a neighbour's, relative's or ex-partner's results out of curiosity | **High** | High | Every *view* is audit-logged, not just edits. Staff are told this at training. Admin gets a monthly access-review report. |
| T2 | Shared login — everyone uses "the lab account" | **High** | High | Individual accounts, no shared credentials. Fast user-switching so it is not annoying. Audit becomes worthless without this, so it is treated as a hard requirement. |
| T3 | PC left unlocked at the bench with a patient list on screen | **High** | Medium | Idle auto-lock after 10 minutes. One-key lock shortcut. Session expiry. |
| T4 | Weak or reused passwords | High | High | Argon2id hashing, minimum length enforced, common-password blocklist, lockout with backoff after repeated failure, optional 2FA for admin. |
| T5 | Departing employee retains access | Medium | High | Immediate deactivation in admin. Quarterly access review. Sessions revoked on deactivation, not just on next login. |
| T6 | Laptop or phone with the app cached is lost or stolen | Medium | High | Offline cache is encrypted at rest and holds only recent data, not the whole database. Remote session revocation. Cache cleared on logout. |
| T7 | Ransomware on the clinic PC | Medium | **Critical** | Data lives in the cloud, not on the PC. Off-site backups are immutable for 30 days so they cannot be encrypted too. |
| T8 | SQL injection / authorisation bypass by an outsider | Low | Critical | Parameterised queries only, enforced by the ORM and by a lint rule. Schema validation on every input. Server-side permission check on every endpoint, tested automatically. |
| T9 | Patient identifiers leak into logs or error reports | Medium | High | Structured logging with an ID-only policy and an automated scan. See section 6. |
| T10 | Hosting account is lost (payment fails, sole owner unreachable) | **Medium** | **Critical** | Two admin contacts on the account, documented recovery, and a nightly encrypted backup held somewhere the clinic controls independently. See question C14. |
| T11 | Backups exist but have never been restored | Medium | Critical | A restore drill is a roadmap milestone with a sign-off, not a good intention. |
| T12 | A wrong result reaches a patient | Medium | **Critical** | Verify-before-release, critical-value confirmation, calculated-field unit tests, immutable versioning with visible amendments. |

> **T1, T2 and T3 are the ones that will actually happen.** They are addressed by
> individual logins, comprehensive view-logging and telling staff the log exists.
> Nothing else on this list matters as much.

---

## 3. Permission matrix (v1)

| Capability | Lab Technician | Admin | Notes |
|---|---|---|---|
| Search / view patient | Yes | Yes | Logged |
| Create / edit patient | Yes | Yes | |
| Merge duplicate patients | No | Yes | Logged, reversible 30 days |
| Soft-delete patient | No | Yes | Logged |
| Hard-delete anything | No | **No** | No application path exists. Requires a documented, audited database procedure. |
| Create lab order | Yes | Yes | |
| Enter / edit results (pre-release) | Yes | Yes | |
| Mark ready for verification | Yes | Yes | |
| **Release report** | Only if granted `report.release` | Yes | The verifier permission |
| Return for correction | Only if granted | Yes | Reason mandatory |
| Reprint released report | Yes | Yes | Logged |
| Amend released report | No | Yes | Reason mandatory, creates v2 |
| Edit test catalogue / reference ranges | No | Yes | Versioned |
| Edit letterhead / layout | No | Yes | |
| Manage users and permissions | No | Yes | |
| View audit log | No | Yes | |
| Export data | No | Yes | Logged, and the export itself is logged |
| Restore from backup | No | Yes | Two-person process, documented |

**Enforcement:** every permission is checked on the server, on every request. The
UI hiding a button is a convenience, never a control. An automated test asserts
that **every** endpoint has a permission check — a new endpoint without one fails
the build rather than shipping silently open. This is one of the gates described
in `09-quality-gates.md`, and it exists precisely because you cannot review the
code yourself.

---

## 4. Authentication

- Argon2id password hashing with tuned parameters.
- Minimum 12 characters, checked against a breached-password list, no forced
  rotation (forced rotation produces `Password1!`, `Password2!` and is now advised
  against by NIST).
- Rate limiting and exponential lockout on the login endpoint.
- Sessions: short-lived tokens, refresh on activity, server-side revocation.
- Optional TOTP two-factor for admin accounts, recommended and off by default.
- No password reset by email in v1 — admin resets, in person. In a nine-person
  clinic that is both simpler and safer than an email reset flow.

---

## 5. Data protection

- **In transit:** TLS 1.2+ only, HSTS, strict security headers (CSP,
  X-Content-Type-Options, Referrer-Policy, frame-ancestors none).
- **At rest:** database encryption at rest via the hosting provider; released PDFs
  in encrypted object storage; the browser's offline cache encrypted.
- **Backups:** encrypted, with the key stored separately from the backup itself.
- **Secrets:** never in the repository. Environment-based, with an automated scan
  that blocks any commit containing something that looks like a key. Documented
  rotation procedure.

---

## 6. Logging policy — no patient identifiers, ever

Application logs and error reports may contain: user ID, patient **ID**, order ID,
timestamps, error types and stack traces.

They may **never** contain: patient name, phone number, address, or any result
value.

Enforced by a structured logging library that only accepts declared fields, plus
an automated scan of log output in CI that fails the build if a name-shaped or
phone-shaped string appears. Debugging is done by looking up the ID in the
application, by someone authorised to do so.

---

## 7. Retention and deletion

- Clinical records are **soft-deleted only**. Nothing in the application hard
  deletes a patient, order, result or report.
- The audit log is append-only and outlives the records it describes.
- Released report PDFs are immutable and are never deleted by the application.
- Hard deletion, if ever legally required, is a documented database procedure
  performed by two people and recorded outside the system.

**The retention period is not set in this document.** See section 8 — I am not
going to invent a number for a clinical record retention requirement.

---

## 8. Nepali legal and regulatory position

You asked for citations and said you would verify them. I will therefore be
precise about what I am confident of and explicit about what I am not.

### What v1's narrow scope removes

Because v1 has **no billing, no invoicing and no pricing**, the tax questions in
your original brief are **not triggered yet**:

- IRD invoicing rules, the Central Billing Monitoring System (CBMS), and the VAT
  treatment of pharmacy sales versus exempt health services all attach to
  *billing*, which we are not building. These become live at the point billing is
  added, and should be re-examined then rather than guessed at now.

### What does apply to v1

These statutes exist and are, in my understanding, the relevant ones. **I have
deliberately not cited section numbers, because I am not confident enough in the
specific provisions to hand a Chartered Accountant numbers he might rely on.**

| Instrument | Why it is relevant here | Confidence |
|---|---|---|
| **Individual Privacy Act, 2075 (2018)** | Nepal's general personal-data law. Health data is treated as sensitive personal information; consent, security and limits on disclosure apply. This is the primary law governing what we are building. | High that it applies; **low** on specific obligations |
| **Electronic Transactions Act, 2063 (2008)** | Governs electronic records and digital signatures, and criminalises unauthorised access to computer data. Relevant to whether an electronically released report is valid without a wet signature — see question A2. | High that it applies; **low** on the signature question |
| **Public Health Service Act, 2075 (2018)** and its Regulations | Health-service obligations including record keeping. The retention period, if prescribed, most likely sits here or in the Regulations. | Medium |
| **Nepal Medical Council Act and NMC Code of Ethics** | Practitioner registration and confidentiality duties; the basis for printing the NMC number on reports. | High |
| **National Public Health Laboratory / lab licensing standards** | May prescribe report content, verification and retention for pathology laboratories specifically. This is the one most likely to contain a concrete answer, and the one I know least about. | **Low** |

### What I recommend you actually do

Three practical steps, in order of value:

1. **Ask the lab's own licensing authority** what a pathology report must contain
   and how long records must be kept. One phone call from the clinic will beat any
   amount of desk research, and it is the authority that would actually inspect.
2. **Settle the signature question (A2)** with the same call — whether a report
   released electronically, printed with a name and NMC number but no wet
   signature, is acceptable.
3. **Set an interim retention policy** while you confirm: I suggest **retain
   everything indefinitely** for now. Storage is trivially cheap at this volume,
   and it is the only policy that cannot be wrong in the direction that destroys
   evidence. Narrowing later is easy; recovering deleted records is not.

**Offer:** if you want, I can run a proper sourced research pass on these — actual
documents, actual provisions — before you verify them yourself. I did not do it
unprompted because it is a meaningful piece of work and you asked me to flag
things rather than assume. Say the word.

### One thing worth raising now

Hosting patient data on servers **outside Nepal** (Mumbai or Singapore) may
interact with the Individual Privacy Act's provisions on data handling and
disclosure. I do not know whether Nepal imposes health-data localisation
requirements, and I am not going to pretend otherwise. **This is worth confirming
before go-live**, because if localisation is required it changes the hosting
decision in `03-architecture.md` — and it is far cheaper to find out now than
after migration.

---

## 9. Backup and disaster recovery

| Parameter | Target |
|---|---|
| **RPO** (how much work we can afford to lose) | 15 minutes |
| **RTO** (how fast we are back up) | 4 hours |

**Backup schedule**
- Continuous point-in-time recovery on the database (managed hosting provides
  this; it is a large part of what Option A's cost buys).
- Nightly full encrypted backup to separate off-site storage.
- Released PDFs replicated to a second location.
- 30-day immutable retention so ransomware cannot reach the backups.
- **A monthly encrypted copy pulled down to a drive the clinic physically holds.**
  This is the one that saves you if the hosting account itself is lost — see T10.

**Restore drill**
A real restore into a scratch environment, verified against a checklist, with the
elapsed time recorded. Scheduled at go-live, at one month, and every six months
after. A backup that has not been restored is a rumour.

**The runbook** — a plain-language document, written for someone who is not a
developer, covering: internet down, hosting provider down, ransomware on a clinic
PC, an admin locked out, and a corrupted report. It lives in the repository *and*
printed in a folder at the clinic, because a runbook that only exists inside the
system that is down is no runbook at all.
