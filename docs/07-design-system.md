# 07 — Design System

> **Source of truth:** `design_handoff_trp_lab_console/README.md` for the spec,
> and `app/globals.css` for the implementation. The working rules a developer
> needs day to day are in [`CLAUDE.md`](../CLAUDE.md) §1.
>
> This document covers the parts that are *not* in the handoff: interaction
> design, the keyboard map, print layout and accessibility. Where it and the
> handoff disagree, the handoff wins.

---

## 1. Design principles

**Dense, calm, clinical.** This is a tool people use for eight hours, not a
marketing site. Information density is a feature.

**Keyboard first, mouse never required.** Lab technicians are fast typists. If a
high-frequency flow can only be completed with a mouse, that is a bug.

**Quiet by default, loud when it matters.** The interface is visually uneventful
so that an out-of-range value and a critical value stand out immediately. This
is why there is no decorative colour and no animation.

**Designed for the bad states.** Offline, half-entered, printer jammed, wrong
patient selected, power just came back.

---

## 2. Tokens

Implemented in `app/globals.css`, matched to the handoff. Summarised in
`CLAUDE.md` §1 so it is loaded every session. Not repeated here — a third copy
would only drift.

The one addition beyond the handoff is the **data-viz series palette**
(`--series-1/2/3`), validated for colour-vision deficiency. See §6.

---

## 3. Wireframe — Result entry (the screen that matters most)

Target: a full CBC in under 90 seconds, no mouse.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Enter results                                                             │
│ Ram Bahadur Thapa · MRN 10294 · Male / 45 yrs · TRP-2083-000418           │
├───────────────────────────────────────────────────────────────────────────┤
│  ⚠ 1 critical value detected.                                             │
│    Haemoglobin: 6.2 gm/dl                                                 │
│    ☐ I confirm these results have been re-checked.                        │
├───────────────────────────────────────────────────────────────────────────┤
│  Test                        Result       Unit      Reference             │
│  ─────────────────────────────────────────────────────────────────────    │
│  Haemoglobin              [  11.2  ] L    gm/dl     Male : 12-18          │
│  RBC Count                [   4.20 ]      mill/cumm 4.00-6.00             │
│  MCH                      [ ______ ] ◀    pg        27-32                 │
│                                                                           │
│  Differential Leucocyte Count (DLC)                                       │
│  Neutrophil               [        ]      %         40-70                 │
│                                                                           │
│  Absolute Leucocyte Count                   calculated automatically      │
│  Neutrophils                 ——           /cmm      2000-7000            │
├───────────────────────────────────────────────────────────────────────────┤
│  8 of 25 entered          [ Save & preview → ]                            │
└───────────────────────────────────────────────────────────────────────────┘
```

**Interaction rules**

- `Enter` or `↓` moves to the next analyte; `↑` goes back.
- Calculated rows are skipped by the focus order entirely, so they never
  interrupt the typing rhythm. They show `——` until their inputs exist.
- The reference range sits on the same row, always visible. No hovering.
- `L` / `H` appear the instant a value is typed.
- A **critical value** blocks progress until explicitly confirmed. This is the
  only place the design deliberately interrupts.

---

## 4. Keyboard map

### Implemented
| Key | Action |
|---|---|
| `Enter` / `↓` | Next analyte |
| `Shift+Enter` / `↑` | Previous analyte |
| First letter | Selects in a picklist (`P` → Pale yellow) |
| `Tab` | Standard focus order, skipping calculated rows |

### Planned, not yet built
| Key | Action |
|---|---|
| `Ctrl+K` | Command palette |
| `Ctrl+/` | Patient search from anywhere |
| `Ctrl+N` / `Ctrl+O` | New patient / new order |
| `Ctrl+S` | Save |
| `F9` | Print preview |
| `Ctrl+D` | Copy this analyte from the patient's previous report |
| `Ctrl+L` | Lock screen |
| `F1` | Shortcut help overlay |

When these land, `F1` should show the list in-app and it should print onto one
sheet for the wall above the bench. That sheet will do more for adoption than
any amount of training.

---

## 5. Print specification

**The printed report is the actual product.** It is styled independently of the
app UI and must not be "modernised" to match it.

| Setting | Value |
|---|---|
| Paper | A4 portrait, `@page` margin 12mm 15mm |
| Font | System stack, **not** Jakarta, 10pt |
| Top reserve, preprinted mode | 45mm page 1, configurable in mm |
| Table columns | Test 46% · Result 16% · Unit 14% · Reference 24% |
| Department band | Full width, centred, bold, 1pt rules above and below |
| Flags | `H` / `L` as **characters**, never colour alone |
| Running footer | Patient name + Reg No on every page |
| Colour | Black only, except the letterhead logo |

Page-break rules: rows never split (`break-inside: avoid`), headings never
orphan (`break-after: avoid`), `End Of Report` and the signature block appear
only on the final page.

**Still missing:** page numbers (`Page n of m`). Chrome cannot number pages from
HTML; this needs the server-side PDF renderer described in
`docs/05-report-engine.md` §6.

---

## 6. Data visualisation

Series colours are `--series-1` `#2563EB`, `--series-2` `#EB6834`,
`--series-3` `#1BAF7A`. Validated: all six checks pass at three slots, worst
adjacent CVD ΔE 9.2, normal-vision ΔE 27.6.

- The aqua slot sits below 3:1 contrast on white, so **every department bar
  carries a direct value label** as the required relief. Do not remove those
  labels.
- Single-series charts need no legend — the card title names the series.
- Never a dual-axis chart.
- Status colours (`--success-*`, `--warning-*`, `--danger-*`) are reserved and
  must never be reused as a series colour.

---

## 7. Accessibility

- WCAG 2.1 AA is the target. **Not yet automated in CI** — see
  `docs/09-quality-gates.md` Gate 7, which is still outstanding.
- Focus is always visible; focus outlines are never removed.
- Every input has a real associated label; placeholder text is never the label.
- Flags are conveyed by **letter and position**, never colour alone — which is
  also why they print correctly in monochrome.
- Disabled controls carry a `title` explaining *why*, not just a dimmed state.
- Touch targets ≥ 44px for later tablet use in the ward.
- Full keyboard operability is a hard requirement, not a nicety — it is also
  the fastest way to work.
