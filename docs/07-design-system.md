# 07 — Design System

## 1. Design principles

**Dense, calm, clinical.** This is a tool people use for eight hours, not a
marketing site. Information density is a feature. Whitespace that would look
elegant on a landing page is wasted screen on a lab bench.

**Keyboard first, mouse never required.** Lab technicians are fast typists. Every
high-frequency action has a key. If a flow can only be completed with a mouse, it
is a bug.

**Quiet by default, loud when it matters.** The interface should be visually
uneventful so that an out-of-range value and a critical value stand out
immediately. This is why there is no decorative colour and no animation.

**Designed for the bad states.** Offline, half-entered, printer jammed, wrong
patient selected, power just came back. These are designed screens, not
afterthoughts.

---

## 2. Design tokens

No hard-coded hex values or magic pixel numbers anywhere in a component. A lint
rule enforces this — see `09-quality-gates.md`.

### Colour

Deliberately restrained. Colour carries meaning here; it is not decoration.

| Token | Light | Purpose |
|---|---|---|
| `--bg` | `#FFFFFF` | Page |
| `--bg-subtle` | `#F6F7F9` | Table stripes, panel backgrounds |
| `--border` | `#D8DCE2` | Rules and dividers |
| `--text` | `#14181D` | Primary text |
| `--text-muted` | `#5A6470` | Labels, units, secondary |
| `--brand` | `#1B27A8` | From the clinic logo blue. Used for focus and primary actions only. |
| `--focus-ring` | `#1B27A8` | 2px, always visible, never removed |
| `--flag-high` | `#B42318` | H marker |
| `--flag-low` | `#1B5FB4` | L marker |
| `--flag-critical-bg` | `#FEF0EF` | Critical value row background |
| `--ok` | `#1F7A44` | Released, saved, synced |
| `--warn` | `#9A6400` | Offline, unsaved, pending |

All pairings verified at **WCAG AA 4.5:1** minimum, checked automatically in CI.
A dark theme is not in v1 — a lab is a bright room and it is scope we do not need.

> Note: `--brand` is taken from the logo's blue. If the vector logo (question A3)
> reveals a different official blue, this token changes in one place.

### Type

System font stack for speed — no web font download on first load, which matters on
a clinic connection. Devanagari-capable fonts are embedded for **print** from day
one.

| Token | Size / line | Use |
|---|---|---|
| `--text-xs` | 12 / 16 | Units, methods, table meta |
| `--text-sm` | 13 / 18 | **Default for dense tables** |
| `--text-base` | 15 / 22 | Forms, body |
| `--text-lg` | 18 / 26 | Section headings |
| `--text-xl` | 22 / 30 | Page titles |

Tabular figures are enabled everywhere numbers appear, so digits align in columns.

### Spacing, radius, elevation

4px base scale: `--space-1` 4px through `--space-8` 32px.
Radii: `--radius-sm` 3px, `--radius-md` 5px. Nothing rounder — this is not a
consumer app.
Two shadows only: `--shadow-popover` and `--shadow-modal`. Everything else is flat.

### Motion

`--duration-fast` 120ms for focus and hover only. **No entrance animations, no
skeleton shimmer, no page transitions.** Motion costs frames on a 4 GB PC and
costs attention on a busy day. `prefers-reduced-motion` removes what little remains.

---

## 3. Component inventory

Built once, documented with every state, used everywhere.

**Inputs:** TextField, NumberField (tabular figures, unit suffix), Select,
Combobox (type-ahead, keyboard), PicklistWithOverride (for urine/stool),
DateField (BS + AD dual, see below), Textarea, Checkbox, RadioGroup.

**Data:** DataTable (dense, keyboard-navigable, sticky header), ResultGrid (the
specialised result-entry grid), DefinitionList (patient header), Badge, FlagMarker.

**Feedback:** Toast, InlineError, EmptyState, LoadingRow, ConfirmDialog,
CriticalValueDialog, OfflineBanner, SyncStatus.

**Layout:** AppShell, PageHeader, Toolbar, Modal, Drawer, Tabs, SplitPane.

**Every component ships with:** default, hover, focus, active, disabled, error,
loading and empty states, plus a keyboard interaction spec and an accessibility
note. A component without all of these does not count as done.

### The BS/AD date field

Deserves its own note because it is where Nepali software usually goes wrong.

- One field, two calendars. Type `2082-05-07` or `2025-08-23`; the format is
  detected from the year.
- The other calendar shows in muted text beneath as you type.
- A picker opens on `F4`, defaults to BS, toggles with `Ctrl+B`.
- Conversion uses a maintained library — **never hand-rolled**, and covered by
  tests against known date pairs spanning the full supported range.
- Internally, everything is stored as an AD timestamp. BS is a display format,
  never a storage format. This one decision prevents an entire category of bug.

---

## 4. Wireframe A — Patient registration

Target: registered in under 30 seconds, no mouse.

```
┌─ New Patient ──────────────────────────────── [Esc] Cancel ──┐
│                                                               │
│  Full name *        [ Ram Bahadur Thapa____________ ]         │
│                     ⚠ 2 similar patients exist  [F2] review   │
│                                                               │
│  Sex *   ( ) Male  ( ) Female  ( ) Other      Alt+M / Alt+F    │
│                                                               │
│  Age *   [ 45 ] years    or   DOB [ ____-__-__ ]  BS ⇄ AD     │
│                                                               │
│  Phone            [ 98XXXXXXXX_____ ]                         │
│  Referred by      [ Dr. ____________ ▾ ]  type to search      │
│                                                               │
│  ── Address ─────────────────────────────────────────────     │
│  Province [ Bagmati ▾ ]  District [ Chitwan ▾ ]               │
│  Municipality [ Ratnanagar ▾ ]  Ward [ 2 ]                    │
│  (pre-filled — Tab straight past)                             │
│                                                               │
│  ───────────────────────────────────────────────────────      │
│         [ Ctrl+S  Save ]   [ Ctrl+Enter  Save & New Order ]   │
└───────────────────────────────────────────────────────────────┘
```

**Notes.** Address defaults to Chitwan/Ratnanagar so the common case is four
keystrokes. Duplicate warning appears inline as the name is typed — it warns, it
never blocks. `Ctrl+Enter` goes straight into ordering, which is the real path
90% of the time.

---

## 5. Wireframe B — Result entry (the most important screen)

Target: full CBC in under 90 seconds, no mouse.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← TRP-2082-000418   Ram Bahadur Thapa   M / 45y   MRN 10294               │
│   Sample: 2082-05-07 09:14    Ref: Dr. S. Adhikari      ● Offline — queued│
├───────────────────────────────────────────────────────────────────────────┤
│  ▸ CBC  (in progress)      ▸ RFT (pending)         [Ctrl+←/→ switch panel]│
├───────────────────────────────────────────────────────────────────────────┤
│  HAEMOGRAM ON CELL COUNTER                                                │
│                                                                           │
│  Test                        Result        Unit      Reference            │
│  ─────────────────────────────────────────────────────────────────────    │
│  Haemoglobin              [  11.2  ] L     gm/dl     Male : 12-18         │
│  RBC Count                [   4.20 ]       mill/cumm 4.00-6.00           │
│  PCV                      [  34.00 ] L     %         36.00-52.00         │
│  MCV                      [  81.0  ]       fL        80.0-96.0           │
│  MCH                      [ ______ ]  ◀    pg        27-32                │
│  MCHC                     [        ]       %         31.5-34.5           │
│  RDW                      [        ]       %         12.20-15.40         │
│  TLC                      [        ]       /cmm      4000-11000          │
│                                                                           │
│  Differential Leucocyte Count (DLC)                                       │
│  Neutrophil               [        ]       %         40-70                │
│  Lymphocytes              [        ]       %         20-45                │
│  ...                                                                      │
│                                                                           │
│  Absolute Leucocyte Count                    ƒ calculated, read-only      │
│  Neutrophils                  ——            /cmm     2000-7000           │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│  8 of 25 entered · saved locally 2s ago                                   │
│  [F9 Preview]  [Ctrl+S Save]  [Ctrl+R Mark ready for verification]        │
└───────────────────────────────────────────────────────────────────────────┘
```

**Interaction rules**

- `Enter` or `↓` moves to the next analyte. Never requires the mouse.
- The reference range sits on the same row, always visible. No hovering, no
  clicking to reveal.
- `L` / `H` markers appear the instant a value is typed.
- Calculated rows show `——` until inputs exist, then fill live. They cannot be
  focused by Tab, so they never interrupt the typing rhythm.
- A **critical value** (Hb 6.2, platelets 18,000) stops the flow with a
  confirmation dialog: *"Haemoglobin 6.2 gm/dl is a critical value. Confirm you
  have re-checked this result."* — `Y` to confirm, `Esc` to correct. This is the
  only place the design deliberately interrupts.
- Saved locally on every pause. The offline indicator is honest and always visible.
- `Ctrl+←/→` switches between panels on a multi-panel order without leaving the
  keyboard.

---

## 6. Wireframe C — Verify and release

```
┌─ Verify report — TRP-2082-000418 ─────────────────────────────────────────┐
│  Ram Bahadur Thapa   M / 45y   MRN 10294   Sample 2082-05-07             │
│  Entered by: Sita Gurung, 2082-05-07 10:22                               │
├───────────────────────────────────────────────────────────────────────────┤
│  ⚠ 3 values outside reference range · 0 critical                          │
│                                                                           │
│  Haemoglobin        11.2  L    gm/dl    Male : 12-18                      │
│  PCV                34.00 L    %        36.00-52.00                       │
│  Eosinophils         8    H    %        00-06                             │
│                                                                           │
│  [ Space ] show all 25 values          [ F9 ] print preview               │
├───────────────────────────────────────────────────────────────────────────┤
│  Verifier: Dr. ____________  NMC ______                                   │
│  Letterhead:  ( ) Full   (•) Preprinted stationery                        │
│                                                                           │
│  [ Ctrl+Enter  Release & Print ]   [ Ctrl+K  Return for correction ]      │
└───────────────────────────────────────────────────────────────────────────┘
```

Abnormal values are surfaced first, because that is what a verifier actually
checks. All values are one keystroke away.

---

## 7. Print specification

| Setting | Value |
|---|---|
| Paper | A4, 210 × 297 mm, portrait |
| Margins | 15 mm left/right, 12 mm bottom |
| Top reserve, preprinted mode | 45 mm on page 1, configurable in mm; 20 mm on later pages |
| Top reserve, full letterhead | Letterhead block drawn by the app |
| Body font | 10 pt serif-free, tabular figures |
| Table columns | Test Name 46% · Result 16% · Unit 14% · Reference 24% |
| Row height | 5.2 mm minimum, expanding for multi-line ranges |
| Department band | Full width, centred, bold, 1pt rules above and below |
| Flags | `H` / `L` in bold immediately after the value. **Never colour-only** — these print on a monochrome laser printer, so the marker must be a character. |
| Footer | `End Of Report` centred; `Page n of m` right; verifier block on final page only |
| Colour | Black only, except the letterhead logo in full-letterhead mode |

**Alignment test sheet.** A printable page with a millimetre grid and crosshairs,
so the admin can set the preprinted top reserve by measuring rather than guessing.
This turns the most annoying part of setup into five minutes.

---

## 8. Keyboard map

### Global
| Key | Action |
|---|---|
| `Ctrl+K` | Command palette — go anywhere |
| `Ctrl+/` | Patient search, from any screen |
| `Ctrl+N` | New patient |
| `Ctrl+O` | New lab order |
| `F1` | Shortcut help overlay |
| `Ctrl+L` | Lock screen |
| `Esc` | Close / cancel / step back |

### Result entry
| Key | Action |
|---|---|
| `Enter` / `↓` | Next analyte |
| `Shift+Enter` / `↑` | Previous analyte |
| `Ctrl+←` / `Ctrl+→` | Previous / next panel |
| `Ctrl+S` | Save |
| `F9` | Print preview |
| `Ctrl+R` | Mark ready for verification |
| `Ctrl+D` | Copy this analyte's value from the patient's previous report |
| First letter | Selects in a picklist (`P` → Pale yellow) |

### Verify
| Key | Action |
|---|---|
| `Space` | Toggle abnormal-only / all values |
| `Ctrl+Enter` | Release and print |
| `Ctrl+K` | Return for correction |
| `Ctrl+P` | Reprint |

`F1` shows this list in-app, and it prints onto a single sheet for taping to the
wall above the bench. That sheet will do more for adoption than any amount of
training.

---

## 9. Accessibility

- WCAG 2.1 AA, verified automatically in CI with axe. Violations fail the build.
- Focus is always visible; focus outlines are never removed.
- Every input has a real associated label. Placeholder text is never the label.
- Errors are announced to screen readers, not only shown in red.
- Flags are conveyed by **letter and position**, never by colour alone — which
  also happens to be why they print correctly in monochrome. Roughly 1 in 12 men
  has a colour vision deficiency; in a lab of six people that is a real person.
- Touch targets ≥ 44px, for later tablet use.
- Full keyboard operability is a hard requirement here, not an accessibility
  nicety — it is also the fastest way to work.
