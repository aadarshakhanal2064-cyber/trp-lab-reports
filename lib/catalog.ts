import type { Analyte, Panel, PanelRow } from "./types";

/**
 * The test catalogue, transcribed from the clinic's own report formats
 * (ASSEST/TEMPLATE/reportformat.zip).
 *
 * IMPORTANT: every reference range below came from those PDFs and has NOT been
 * clinically verified. The lab in-charge must sign these off before the system
 * is used on real patients. See docs/01-open-questions.md question B6.
 *
 * In the production system this catalogue becomes admin-editable database rows
 * (see docs/04-data-model.md). It is code here only because the demo has no
 * backend.
 */

const num = (
  id: string,
  name: string,
  unit: string | undefined,
  rangeLines: string[],
  rules: Analyte["rules"],
  extra: Partial<Analyte> = {},
): Analyte => ({
  id,
  name,
  unit,
  valueType: "numeric",
  rangeLines,
  rules,
  ...extra,
});

const pick = (
  id: string,
  name: string,
  options: string[],
  unit?: string,
  rangeLines: string[] = [],
): Analyte => ({
  id,
  name,
  unit,
  valueType: "picklist",
  options,
  rangeLines,
  rules: [{ kind: "none" }],
});

const g = (heading: string): PanelRow => ({ kind: "group", heading });
const a = (analyte: Analyte): PanelRow => ({ kind: "analyte", analyte });

/* Shared picklist vocabularies. These are a first guess at what the technicians
   actually type today — see docs/05-report-engine.md, closing note. */
const PLUS_SCALE = ["Nil", "Trace", "+", "++", "+++"];
const HPF_SCALE = ["Nil", "0-1", "1-2", "2-4", "4-6", "6-8", "8-10", "Plenty"];

/* ------------------------------------------------------------------ */
/* CBC                                                                 */
/* ------------------------------------------------------------------ */

const cbc: Panel = {
  id: "CBC",
  title: "HAEMOGRAM ON CELL COUNTER",
  department: "HAEMATOLOGY",
  hasComment: true,
  note:
    "As per recommendation of International for Standardization in Hematology, " +
    "the differential leucocyte counts are additionally being reported as " +
    "absolute numbers of each cells.",
  rows: [
    a(
      num(
        "hb",
        "Haemoglobin",
        "gm/dl",
        ["Male : 12-18", "Female : 11-16"],
        [
          { sex: "M", kind: "interval", low: 12, high: 18 },
          { sex: "F", kind: "interval", low: 11, high: 16 },
        ],
        { decimals: 1, criticalLow: 7 },
      ),
    ),
    a(
      num("rbc", "RBC COUNT", "mill/cumm", ["4.00-6.00"], [
        { kind: "interval", low: 4, high: 6 },
      ], { decimals: 2 }),
    ),
    a(
      num("pcv", "PCV", "%", ["36.00 - 52.00"], [
        { kind: "interval", low: 36, high: 52 },
      ], { decimals: 2 }),
    ),
    a(
      num("mcv", "MCV", "fL", ["80.0 - 96.0"], [
        { kind: "interval", low: 80, high: 96 },
      ], { decimals: 1 }),
    ),
    a(
      num("mch", "MCH", "pg", ["27-32"], [
        { kind: "interval", low: 27, high: 32 },
      ], { decimals: 1 }),
    ),
    a(
      num("mchc", "MCHC", "%", ["31.5 - 34.5"], [
        { kind: "interval", low: 31.5, high: 34.5 },
      ], { decimals: 1 }),
    ),
    a(
      num(
        "rdw",
        "Red Cell Distribution Width (RDW)",
        "%",
        ["12.20-15.40"],
        [{ kind: "interval", low: 12.2, high: 15.4 }],
        { decimals: 2 },
      ),
    ),
    a(
      num(
        "tlc",
        "Total Leucocyte Count (TLC)",
        "/cmm",
        ["4000 - 11000"],
        [{ kind: "interval", low: 4000, high: 11000 }],
        { decimals: 0 },
      ),
    ),

    g("Differential Leucocyte Count (DLC)"),
    a(num("neut_pct", "Neutrophil", "%", ["40 - 70"], [
      { kind: "interval", low: 40, high: 70 },
    ], { decimals: 0 })),
    a(num("lymph_pct", "Lymphocytes", "%", ["20 - 45"], [
      { kind: "interval", low: 20, high: 45 },
    ], { decimals: 0 })),
    a(num("eos_pct", "Eosinophils", "%", ["00 - 06"], [
      { kind: "interval", low: 0, high: 6 },
    ], { decimals: 0 })),
    a(num("mono_pct", "Monocytes", "%", ["00 - 08"], [
      { kind: "interval", low: 0, high: 8 },
    ], { decimals: 0 })),
    a(num("baso_pct", "Basophils", "%", ["00 - 01"], [
      { kind: "interval", low: 0, high: 1 },
    ], { decimals: 0 })),

    g("Absolute Leucocyte Count"),
    a(
      num("neut_abs", "Neutrophils", "/cmm", ["2000-7000"], [
        { kind: "interval", low: 2000, high: 7000 },
      ], { decimals: 0, formula: absOf("neut_pct") }),
    ),
    a(
      num("lymph_abs", "Lymphocytes", "/cmm", ["1000-3000"], [
        { kind: "interval", low: 1000, high: 3000 },
      ], { decimals: 0, formula: absOf("lymph_pct") }),
    ),
    a(
      num("eos_abs", "Eosinophils", "/cmm", ["40-440"], [
        { kind: "interval", low: 40, high: 440 },
      ], { decimals: 0, formula: absOf("eos_pct") }),
    ),
    a(
      num("mono_abs", "Monocytes", "/cmm", ["200-1000"], [
        { kind: "interval", low: 200, high: 1000 },
      ], { decimals: 0, formula: absOf("mono_pct") }),
    ),
    a(
      num("baso_abs", "Basophils", "/cmm", ["20-100"], [
        { kind: "interval", low: 20, high: 100 },
      ], { decimals: 0, formula: absOf("baso_pct") }),
    ),

    a(
      num(
        "plt",
        "Platelet Count",
        "/cmm",
        ["150000 - 400000"],
        [{ kind: "interval", low: 150000, high: 400000 }],
        { decimals: 0, criticalLow: 20000 },
      ),
    ),
    a(
      num("mpv", "Mean Platelet Volume", "fL", ["6.5-12.0"], [
        { kind: "interval", low: 6.5, high: 12 },
      ], { decimals: 1 }),
    ),
  ],
};

/** Absolute count = TLC x (percentage / 100). */
function absOf(pctId: string) {
  return (get: (id: string) => number | null): number | null => {
    const tlc = get("tlc");
    const pct = get(pctId);
    if (tlc === null || pct === null) return null;
    return (tlc * pct) / 100;
  };
}

/* ------------------------------------------------------------------ */
/* LFT                                                                 */
/* ------------------------------------------------------------------ */

const lft: Panel = {
  id: "LFT",
  title: "LIVER FUNCTION TEST",
  department: "BIOCHEMISTRY",
  hasComment: true,
  footerFields: [
    { label: "Instrument Used", value: "AGD2260 Fully Automated Biochemistry Analyser" },
  ],
  rows: [
    a(
      num("bil_total", "Bilirubin- Total", "mg/dl", ["0.12-1.20"], [
        { kind: "interval", low: 0.12, high: 1.2 },
      ], { decimals: 2, method: "DCA" }),
    ),
    a(
      num("bil_direct", "Bilirubin- Direct", "mg/dL", ["0.00-0.50"], [
        { kind: "interval", low: 0, high: 0.5 },
      ], { decimals: 2, method: "DCA" }),
    ),
    a(
      num("bil_indirect", "Bilirubin- Indirect", "mg/dL", ["Upto 0.7"], [
        { kind: "upper", high: 0.7 },
      ], {
        decimals: 2,
        method: "Calculative",
        formula: (get) => {
          const t = get("bil_total");
          const d = get("bil_direct");
          if (t === null || d === null) return null;
          return t - d;
        },
      }),
    ),
    a(
      num("sgpt", "SGPT (ALT)", "U/L", ["Upto 45"], [{ kind: "upper", high: 45 }], {
        decimals: 0,
        method: "IFCC",
      }),
    ),
    a(
      num("sgot", "SGOT (AST)", "U/L", ["Upto 40"], [{ kind: "upper", high: 40 }], {
        decimals: 0,
        method: "IFCC",
      }),
    ),
    a(
      num("sgot_sgpt", "SGOT/SGPT Ratio", undefined, ["Upto 2"], [
        { kind: "upper", high: 2 },
      ], {
        decimals: 2,
        method: "Calculation",
        formula: (get) => ratio(get("sgot"), get("sgpt")),
      }),
    ),
    a(
      num(
        "alp",
        "Alkaline Phosphatase",
        "U/L",
        ["Children (3-15 yrs) : 104-390", "Adults : 25-140"],
        [
          { ageMin: 3, ageMax: 15, kind: "interval", low: 104, high: 390 },
          { kind: "interval", low: 25, high: 140 },
        ],
        { decimals: 0, method: "PNPP/AMP KINETIC" },
      ),
    ),
    a(
      num("tp", "Total Proteins", "gm/dL", ["6.0-8.8"], [
        { kind: "interval", low: 6, high: 8.8 },
      ], { decimals: 1, method: "Biuret" }),
    ),
    a(
      num("alb", "Serum Albumin", "gm/dL", ["3.5-5.5"], [
        { kind: "interval", low: 3.5, high: 5.5 },
      ], { decimals: 1, method: "BCG" }),
    ),
    a(
      num("glob", "Serum Globulin", "gm/dL", ["2.3 - 3.3"], [
        { kind: "interval", low: 2.3, high: 3.3 },
      ], {
        decimals: 1,
        method: "Calculation",
        formula: (get) => {
          const t = get("tp");
          const al = get("alb");
          if (t === null || al === null) return null;
          return t - al;
        },
      }),
    ),
    a(
      num("ag_ratio", "A/G ratio", undefined, [], [{ kind: "none" }], {
        decimals: 2,
        method: "Calculation",
        formula: (get) => ratio(get("alb"), get("glob")),
      }),
    ),
  ],
};

/* ------------------------------------------------------------------ */
/* RFT                                                                 */
/* ------------------------------------------------------------------ */

const rft: Panel = {
  id: "RFT",
  title: "RENAL FUNCTION TEST",
  department: "BIOCHEMISTRY",
  hasComment: true,
  footerFields: [
    {
      label: "Instrument Used",
      value: "AGD2260 Fully Automated Biochemistry Analyser, EL-120 Erma (Japan)",
    },
  ],
  rows: [
    a(
      num("urea", "Blood Urea", "mg/dL", ["15 to 40"], [
        { kind: "interval", low: 15, high: 40 },
      ], { decimals: 0, method: "Urease GLDH" }),
    ),
    a(
      num("bun", "Blood Urea Nitrogen (BUN)", "mg/dL", ["5-21"], [
        { kind: "interval", low: 5, high: 21 },
      ], {
        decimals: 1,
        // NOTE: divisor 2.14 is the standard urea-to-BUN conversion, but some
        // labs read BUN directly off the analyser. See docs/04-data-model.md s5.
        formula: (get) => {
          const u = get("urea");
          return u === null ? null : u / 2.14;
        },
      }),
    ),
    a(
      num(
        "creat",
        "Serum Creatinine",
        "mg/dL",
        ["Male : 0.6-1.4", "Female : 0.5-1.2"],
        [
          { sex: "M", kind: "interval", low: 0.6, high: 1.4 },
          { sex: "F", kind: "interval", low: 0.5, high: 1.2 },
        ],
        { decimals: 2, method: "Enzymatic" },
      ),
    ),
    a(
      num(
        "uric",
        "Serum Uric Acid",
        "mg/dL",
        ["Male - 3.4- 7.0", "Female - 2.5-6.0"],
        [
          { sex: "M", kind: "interval", low: 3.4, high: 7 },
          { sex: "F", kind: "interval", low: 2.5, high: 6 },
        ],
        { decimals: 1, method: "TBHBA" },
      ),
    ),
    a(
      num("na", "Sodium (Serum)", "mEq/L", ["136-145"], [
        { kind: "interval", low: 136, high: 145 },
      ], { decimals: 0, method: "ISE", criticalLow: 120, criticalHigh: 160 }),
    ),
    a(
      num("k", "Potassium (Serum)", "mEq/L", ["3.5-5.5"], [
        { kind: "interval", low: 3.5, high: 5.5 },
      ], { decimals: 1, method: "ISE", criticalLow: 2.5, criticalHigh: 6.5 }),
    ),
    a(
      num("bun_creat", "BUN/Creatinine Ratio", undefined, ["Upto 20"], [
        { kind: "upper", high: 20 },
      ], {
        decimals: 1,
        formula: (get) => ratio(get("bun"), get("creat")),
      }),
    ),
  ],
};

/* ------------------------------------------------------------------ */
/* Lipid Panel                                                         */
/* ------------------------------------------------------------------ */

const lipid: Panel = {
  id: "LIPID",
  title: "LIPID Panel",
  department: "BIOCHEMISTRY",
  hasComment: true,
  footerFields: [
    { label: "Instrument Used", value: "AGD2260 Fully Automated Biochemistry Analyser" },
  ],
  note:
    "Cholesterol : CHOD PAP; HDL Cholesterol: Direct ; LDL:Direct Measurement ; " +
    "Triglycerides :GPO; (**The Above Reference range is Desirable/Optimal Range )",
  rows: [
    a(
      num("chol", "S. Cholesterol", "mg/dL", ["Upto 200"], [
        { kind: "upper", high: 200 },
      ], { decimals: 0 }),
    ),
    a(
      num(
        "trig",
        "S. Triglycerides",
        "mg/dL",
        ["Normal: Upto 160", "Border-line High: 161-199", "High: >200"],
        [
          {
            kind: "bands",
            bands: [
              { label: "Normal", high: 160 },
              { label: "Border-line High", low: 161, high: 199 },
              { label: "High", low: 200 },
            ],
          },
        ],
        { decimals: 0 },
      ),
    ),
    a(
      num("hdl", "HDL Cholesterol", "mg/dL", ["30-87"], [
        { kind: "interval", low: 30, high: 87 },
      ], { decimals: 0 }),
    ),
    a(
      num(
        "ldl",
        "LDL Cholesterol",
        "mg/dL",
        [
          "Normal: Upto 130",
          "Increased risk of coronary heart disease: 131-159",
          "High risk of coronary heart: >160",
        ],
        [
          {
            kind: "bands",
            bands: [
              { label: "Normal", high: 130 },
              { label: "Increased risk", low: 131, high: 159 },
              { label: "High risk", low: 160 },
            ],
          },
        ],
        { decimals: 0 },
      ),
    ),
    a(
      num("vldl", "VLDL Cholesterol", "mg/dL", ["Upto 35"], [
        { kind: "upper", high: 35 },
      ], {
        decimals: 0,
        formula: (get) => {
          const t = get("trig");
          return t === null ? null : t / 5;
        },
      }),
    ),
    a(
      num("chol_hdl", "S.Cholesterol/HDL Ratio", undefined, ["< 5.0"], [
        { kind: "upper", high: 5 },
      ], { decimals: 2, formula: (get) => ratio(get("chol"), get("hdl")) }),
    ),
    a(
      num("trig_hdl", "S.Triglycerides/HDL Chole", undefined, ["Desirable : < 3.00"], [
        { kind: "upper", high: 3 },
      ], { decimals: 2, formula: (get) => ratio(get("trig"), get("hdl")) }),
    ),
    a(
      num("ldl_hdl", "LDL Chole/HDL Chole", undefined, ["Desirable : < 3.60"], [
        { kind: "upper", high: 3.6 },
      ], { decimals: 2, formula: (get) => ratio(get("ldl"), get("hdl")) }),
    ),
  ],
};

/* ------------------------------------------------------------------ */
/* Blood sugar                                                         */
/* ------------------------------------------------------------------ */

const sugar: Panel = {
  id: "FBS_PPBS",
  title: "Blood Sugar Fasting and Post Glucose",
  department: "BIOCHEMISTRY",
  hasComment: true,
  footerFields: [
    { label: "Method", value: "GOD-POD" },
    { label: "Instrument Used", value: "AGD2260 Fully automated biochemistry Analyser" },
  ],
  rows: [
    a(
      num("fbs", "Blood Sugar Fasting", "mg/dl", ["65 - 110"], [
        { kind: "interval", low: 65, high: 110 },
      ], { decimals: 0, criticalLow: 40, criticalHigh: 400 }),
    ),
    a(
      num("ppbs", "Blood Sugar PP", "mg/dl", ["Upto 140"], [
        { kind: "upper", high: 140 },
      ], { decimals: 0, criticalHigh: 400 }),
    ),
  ],
};

/* ------------------------------------------------------------------ */
/* Urine R/E                                                           */
/* ------------------------------------------------------------------ */

const urine: Panel = {
  id: "URINE_RE",
  title: "URINE ANALYSIS REPORT",
  department: "CLINICAL PATHOLOGY",
  hasComment: true,
  rows: [
    g("Physical Examination"),
    a({
      id: "u_qty",
      name: "Quantity",
      unit: "ml",
      valueType: "numeric",
      decimals: 0,
      rangeLines: [],
      rules: [{ kind: "none" }],
    }),
    a(pick("u_colour", "Colour", ["Pale yellow", "Straw", "Yellow", "Dark yellow", "Amber", "Reddish"])),
    a(pick("u_appearance", "Appearence", ["Clear", "Slightly turbid", "Turbid"])),
    a(pick("u_deposits", "Deposits", ["Nil", "Scanty", "Present", "Plenty"])),

    g("Chemical Examination"),
    a(pick("u_ph", "Reaction (pH)", ["Acidic", "Neutral", "Alkaline"])),
    a(pick("u_protein", "Proteins", PLUS_SCALE)),
    a(pick("u_glucose", "Glucose", PLUS_SCALE)),
    a(pick("u_ketone", "Ketone Bodies", PLUS_SCALE)),
    a(pick("u_bile", "Bile Pigments", ["Absent", "Present"])),
    a(pick("u_urobilinogen", "Urobilinogen", ["Normal", "Increased", "Absent"])),
    a(
      num("u_sg", "Specific gravity", undefined, ["1.015 to 1.024"], [
        { kind: "interval", low: 1.015, high: 1.024 },
      ], { decimals: 3 }),
    ),

    g("Microscopic Examination"),
    a(pick("u_pus", "PUS(WBC) Cells", HPF_SCALE, "/hpf")),
    a(pick("u_rbc", "RBC", HPF_SCALE, "/hpf")),
    a(pick("u_epithelial", "Epithelial Cells", HPF_SCALE, "/hpf")),
    a(pick("u_casts", "Casts", ["Nil", "Hyaline", "Granular", "Cellular"])),
    a(pick("u_crystals", "Crystals", ["Nil", "Calcium oxalate", "Uric acid", "Triple phosphate", "Amorphous"])),
    a(pick("u_others", "Others", ["Nil", "Bacteria", "Yeast cells", "Mucus threads"])),
  ],
};

/* ------------------------------------------------------------------ */
/* Stool R/E                                                           */
/* ------------------------------------------------------------------ */

const stool: Panel = {
  id: "STOOL_RE",
  title: "STOOL EXAMINATION",
  department: "CLINICAL PATHOLOGY",
  hasComment: true,
  rows: [
    g("Physical Examination"),
    a(pick("s_colour", "Colour", ["Brown", "Yellowish brown", "Greenish", "Blackish", "Pale"])),
    a(pick("s_consistency", "Consistency", ["Formed", "Semi-formed", "Loose", "Watery", "Hard"])),
    a(pick("s_mucus", "Mucus", ["Absent", "Present"])),
    a(pick("s_blood", "Blood", ["Absent", "Present"])),
    a(pick("s_parasites", "Parasites", ["Not seen", "Seen"])),

    g("Chemical Examination"),
    a(pick("s_reaction", "Reaction", ["Acidic", "Neutral", "Alkaline"])),

    g("Microscopic Examination"),
    a(pick("s_rbc", "RBC", HPF_SCALE, "/hpf")),
    a(pick("s_pus", "Pus Cells", HPF_SCALE, "/hpf")),
    a(pick("s_veg", "Veg.Cells/Fibres", ["Nil", "Few", "Moderate", "Plenty"], "/hpf")),
    a(pick("s_fat", "Fat Droplets", ["Nil", "Few", "Moderate", "Plenty"], "/hpf")),
    a(pick("s_ova", "Ova/Eggs", ["Not seen", "Seen"])),
    a(pick("s_cyst", "Cyst", ["Not seen", "Seen"])),
    a(pick("s_other", "Other", ["Nil", "Bacteria", "Yeast cells"])),
  ],
};

/* ------------------------------------------------------------------ */

function ratio(a1: number | null, b: number | null): number | null {
  if (a1 === null || b === null || b === 0) return null;
  return a1 / b;
}

export const PANELS: Panel[] = [cbc, lft, rft, lipid, sugar, urine, stool];

export const PANEL_BY_ID: ReadonlyMap<string, Panel> = new Map(
  PANELS.map((p) => [p.id, p]),
);

export function analytesOf(panel: Panel): Analyte[] {
  return panel.rows.flatMap((r) => (r.kind === "analyte" ? [r.analyte] : []));
}

export function findAnalyte(id: string): Analyte | undefined {
  for (const p of PANELS) {
    for (const r of p.rows) {
      if (r.kind === "analyte" && r.analyte.id === id) return r.analyte;
    }
  }
  return undefined;
}
