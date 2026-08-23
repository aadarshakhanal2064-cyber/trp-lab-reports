import assert from "node:assert/strict";
import test from "node:test";

import { PANEL_BY_ID, findAnalyte } from "../lib/catalog.ts";
import { computeAll, roundHalfUp } from "../lib/compute.ts";
import { initialsOf } from "../components/Icons.tsx";
import { toBs } from "../lib/dates.ts";
import { computeFlag, resolveRule } from "../lib/ranges.ts";
import type { Panel } from "../lib/types.ts";

function panel(id: string): Panel {
  const p = PANEL_BY_ID.get(id);
  assert.ok(p, `panel ${id} missing`);
  return p;
}

function run(
  panelIds: string[],
  values: Record<string, string>,
  sex: "M" | "F" = "M",
  age = 45,
) {
  return computeAll(panelIds.map(panel), values, sex, age);
}

/* ---------------------------------------------------------------- */
/* Calculated analytes                                               */
/* ---------------------------------------------------------------- */

test("absolute leucocyte counts = TLC x percentage", () => {
  const c = run(["CBC"], {
    tlc: "8000",
    neut_pct: "60",
    lymph_pct: "30",
    eos_pct: "8",
    mono_pct: "2",
    baso_pct: "0",
  });

  assert.equal(c.get("neut_abs")?.display, "4800");
  assert.equal(c.get("lymph_abs")?.display, "2400");
  assert.equal(c.get("eos_abs")?.display, "640");
  assert.equal(c.get("mono_abs")?.display, "160");
  assert.equal(c.get("baso_abs")?.display, "0");
});

test("absolute counts are blank, not zero, when TLC is missing", () => {
  const c = run(["CBC"], { neut_pct: "60" });
  assert.equal(c.get("neut_abs")?.display, "");
  assert.equal(c.get("neut_abs")?.numeric, null);
});

test("BUN = urea / 2.14, and BUN/creatinine chains off it", () => {
  const c = run(["RFT"], { urea: "30", creat: "1.0" });
  assert.equal(c.get("bun")?.display, "14.0");
  // 30 / 2.14 = 14.0187 ; / 1.0 -> 14.0
  assert.equal(c.get("bun_creat")?.display, "14.0");
});

test("a two-deep formula chain still resolves", () => {
  // bun_creat depends on bun, which depends on urea.
  const c = run(["RFT"], { urea: "42.8", creat: "2.0" });
  assert.equal(c.get("bun")?.display, "20.0");
  assert.equal(c.get("bun_creat")?.display, "10.0");
});

test("liver derived values", () => {
  const c = run(["LFT"], {
    bil_total: "1.80",
    bil_direct: "0.60",
    tp: "7.0",
    alb: "4.0",
    sgot: "60",
    sgpt: "30",
  });
  assert.equal(c.get("bil_indirect")?.display, "1.20");
  assert.equal(c.get("glob")?.display, "3.0");
  assert.equal(c.get("ag_ratio")?.display, "1.33");
  assert.equal(c.get("sgot_sgpt")?.display, "2.00");
});

test("lipid derived values", () => {
  const c = run(["LIPID"], { chol: "200", trig: "150", hdl: "50", ldl: "120" });
  assert.equal(c.get("vldl")?.display, "30");
  assert.equal(c.get("chol_hdl")?.display, "4.00");
  assert.equal(c.get("trig_hdl")?.display, "3.00");
  assert.equal(c.get("ldl_hdl")?.display, "2.40");
});

test("division by zero yields blank, never Infinity or an error", () => {
  const c = run(["LIPID"], { chol: "200", hdl: "0" });
  assert.equal(c.get("chol_hdl")?.display, "");
  assert.equal(c.get("chol_hdl")?.numeric, null);
});

/* ---------------------------------------------------------------- */
/* Reference ranges                                                  */
/* ---------------------------------------------------------------- */

test("sex-conditional range picks the right band", () => {
  const hb = findAnalyte("hb");
  assert.ok(hb);
  assert.equal(computeFlag(hb, 11.2, "M", 45), "L"); // male 12-18
  assert.equal(computeFlag(hb, 11.2, "F", 45), "N"); // female 11-16
  assert.equal(computeFlag(hb, 17.0, "F", 45), "H");
  assert.equal(computeFlag(hb, 17.0, "M", 45), "N");
});

test("age-conditional range: alkaline phosphatase at the boundaries", () => {
  const alp = findAnalyte("alp");
  assert.ok(alp);
  // Children 3-15: 104-390. Adults: 25-140.
  assert.equal(computeFlag(alp, 200, "M", 10), "N"); // child, in range
  assert.equal(computeFlag(alp, 200, "M", 45), "H"); // adult, high
  assert.equal(computeFlag(alp, 200, "M", 15), "N"); // 15 is still a child
  assert.equal(computeFlag(alp, 200, "M", 16), "H"); // 16 is an adult
  assert.equal(computeFlag(alp, 200, "M", 2), "H"); // under 3 falls to adult rule
});

test("interval boundaries are inclusive", () => {
  const rbc = findAnalyte("rbc");
  assert.ok(rbc);
  assert.equal(computeFlag(rbc, 4.0, "M", 45), "N");
  assert.equal(computeFlag(rbc, 6.0, "M", 45), "N");
  assert.equal(computeFlag(rbc, 3.99, "M", 45), "L");
  assert.equal(computeFlag(rbc, 6.01, "M", 45), "H");
});

test("one-sided limit never flags low", () => {
  const sgpt = findAnalyte("sgpt");
  assert.ok(sgpt);
  assert.equal(computeFlag(sgpt, 45, "M", 45), "N");
  assert.equal(computeFlag(sgpt, 46, "M", 45), "H");
  assert.equal(computeFlag(sgpt, 1, "M", 45), "N"); // there is no "low SGPT"
});

test("interpretive bands flag above the first band", () => {
  const trig = findAnalyte("trig");
  assert.ok(trig);
  assert.equal(computeFlag(trig, 160, "M", 45), "N");
  assert.equal(computeFlag(trig, 161, "M", 45), "H");
  assert.equal(computeFlag(trig, 250, "M", 45), "H");
});

test("critical values outrank the ordinary range", () => {
  const hb = findAnalyte("hb");
  assert.ok(hb);
  assert.equal(computeFlag(hb, 6.2, "M", 45), "CL");
  assert.equal(computeFlag(hb, 11.0, "M", 45), "L"); // low but not critical

  const k = findAnalyte("k");
  assert.ok(k);
  assert.equal(computeFlag(k, 7.0, "M", 45), "CH");
  assert.equal(computeFlag(k, 5.8, "M", 45), "H");
});

test("a missing value never produces a flag", () => {
  const hb = findAnalyte("hb");
  assert.ok(hb);
  assert.equal(computeFlag(hb, null, "M", 45), "N");
});

test("first matching rule wins, so sex rules precede the fallback", () => {
  const creat = findAnalyte("creat");
  assert.ok(creat);
  assert.equal(resolveRule(creat, "M", 45)?.low, 0.6);
  assert.equal(resolveRule(creat, "F", 45)?.low, 0.5);
});

/* ---------------------------------------------------------------- */
/* Formatting and dates                                              */
/* ---------------------------------------------------------------- */

test("values are formatted to the analyte's declared precision", () => {
  const c = run(["CBC"], { tlc: "8000", neut_pct: "33.333" });
  // decimals: 0 on an absolute count
  assert.equal(c.get("neut_abs")?.display, "2667");

  const l = run(["LFT"], { tp: "7.05", alb: "4.0" });
  assert.equal(l.get("glob")?.display, "3.1"); // decimals: 1
});

test("rounding survives binary floating-point noise", () => {
  // 7.05 - 4.0 is 3.0499999999999998 in IEEE-754; the decimal answer is 3.05.
  assert.equal(roundHalfUp(7.05 - 4.0, 1), 3.1);
  assert.equal(roundHalfUp(1.8 - 0.6, 2), 1.2);
  assert.equal(roundHalfUp(0.1 + 0.2, 2), 0.3);
  assert.equal(roundHalfUp(2.5, 0), 3);
  assert.equal(roundHalfUp(2.4, 0), 2);
  assert.equal(roundHalfUp(1e-9, 2), 0);
});

test("BS conversion matches known AD/BS pairs", () => {
  assert.equal(toBs("2025-08-23T00:00:00"), "2082-05-07");
  assert.equal(toBs("2024-04-13T00:00:00"), "2081-01-01"); // Nepali new year
  assert.equal(toBs("2000-01-01T00:00:00"), "2056-09-17");
});

test("typed values pass through untouched, derived ones are formatted", () => {
  const c = run(["CBC"], { hb: "11.2", tlc: "8000", neut_pct: "60" });
  assert.equal(c.get("hb")?.display, "11.2");
  assert.equal(c.get("hb")?.isDerived, false);
  assert.equal(c.get("neut_abs")?.isDerived, true);
});

/* ---------------------------------------------------------------- */
/* Display helpers                                                   */
/* ---------------------------------------------------------------- */

test("initials ignore punctuation and extra words", () => {
  assert.equal(initialsOf("Ram Bahadur Thapa"), "RT");
  assert.equal(initialsOf("Sita"), "S");
  assert.equal(initialsOf("UI Test Account (disabled)"), "UD");
  assert.equal(initialsOf("  keshav   gautam  "), "KG");
  assert.equal(initialsOf("राम थापा"), "रथ");
  assert.equal(initialsOf("((("), "?");
  assert.equal(initialsOf(""), "?");
});
