import type { PresetID, TemplateID } from "./types";
import { normalizeTemplateId, presetFamilyForPreset } from "./template-variants";

/*
 * Pattern library shown in the simulator sidebar (2026-10-25).
 * Eight entries in display order; the first four are Free, the last four Pro.
 * Each entry maps to a template ID per preset family and lists the sliders the
 * parameter editor shows for it. Geometry lives in template-mask.ts (frontend)
 * and sim/templates.py (backend); this file only describes the catalogue.
 */

export type PatternTier = "FREE" | "PRO";

export type ParamSpec = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: "nm";
};

export type PatternEntry = {
  key: string;
  label: string;
  /** One-line label for the picker tile; `label` stays the full name. */
  shortLabel?: string;
  tier: PatternTier;
  templateIdFor(presetId: PresetID): TemplateID;
  params(presetId: PresetID): ParamSpec[];
};

export const PRO_ONLY_TEMPLATE_IDS: ReadonlyArray<TemplateID> = [
  "TIP_TO_TIP",
  "TIP_TO_SIDE",
  "TOUCHING_CORNERS",
  "CONTACT_ARRAY",
];

type Range = readonly [min: number, max: number, step: number];

function nm(key: string, label: string, [min, max, step]: Range): ParamSpec {
  return { key, label, min, max, step, unit: "nm" };
}

function count(key: string, label: string, [min, max, step]: Range): ParamSpec {
  return { key, label, min, max, step };
}

function byFamily(presetId: PresetID, duv: ParamSpec[], euv: ParamSpec[]): ParamSpec[] {
  return presetFamilyForPreset(presetId) === "EUV" ? euv : duv;
}

function familyId(duvId: TemplateID, euvId: TemplateID): (presetId: PresetID) => TemplateID {
  return (presetId) => (presetFamilyForPreset(presetId) === "EUV" ? euvId : duvId);
}

function sharedId(id: TemplateID): (presetId: PresetID) => TemplateID {
  return () => id;
}

export const PATTERN_CATALOG: ReadonlyArray<PatternEntry> = [
  {
    key: "iso-line",
    label: "Iso line",
    tier: "FREE",
    templateIdFor: familyId("ISO_LINE_DUV", "ISO_LINE_EUV"),
    params: (presetId) => byFamily(
      presetId,
      [nm("cd_nm", "CD", [40, 300, 2]), nm("length_nm", "Length", [200, 1000, 10])],
      [nm("cd_nm", "CD", [12, 80, 1]), nm("length_nm", "Length", [100, 800, 10])],
    ),
  },
  {
    key: "dense-ls",
    label: "Dense L/S",
    tier: "FREE",
    templateIdFor: sharedId("DENSE_LS"),
    params: (presetId) => byFamily(
      presetId,
      [nm("cd_nm", "CD", [40, 300, 2]), nm("pitch_nm", "Pitch", [80, 500, 2]), count("n_lines", "Lines", [1, 9, 1])],
      [nm("cd_nm", "CD", [12, 60, 1]), nm("pitch_nm", "Pitch", [24, 160, 1]), count("n_lines", "Lines", [1, 9, 1])],
    ),
  },
  {
    key: "square",
    label: "Square",
    tier: "FREE",
    templateIdFor: sharedId("CONTACT_RAW"),
    params: (presetId) => byFamily(
      presetId,
      [nm("w_nm", "Width", [60, 400, 2])],
      [nm("w_nm", "Width", [16, 120, 1])],
    ),
  },
  {
    key: "l-shape",
    label: "L-shape",
    tier: "FREE",
    templateIdFor: familyId("L_CORNER_RAW_DUV", "L_CORNER_RAW_EUV"),
    params: (presetId) => byFamily(
      presetId,
      [nm("cd_nm", "CD", [40, 200, 2]), nm("length_nm", "Length", [150, 600, 10]), nm("arm_nm", "Arm", [150, 600, 10])],
      [nm("cd_nm", "CD", [12, 60, 1]), nm("length_nm", "Length", [60, 300, 5]), nm("arm_nm", "Arm", [60, 300, 5])],
    ),
  },
  {
    key: "tip-to-tip",
    label: "Tip to tip",
    tier: "PRO",
    templateIdFor: sharedId("TIP_TO_TIP"),
    params: (presetId) => byFamily(
      presetId,
      [nm("cd_nm", "CD", [40, 200, 2]), nm("length_nm", "Length", [100, 500, 10]), nm("gap_nm", "Gap", [20, 400, 2])],
      [nm("cd_nm", "CD", [12, 60, 1]), nm("length_nm", "Length", [50, 250, 5]), nm("gap_nm", "Gap", [8, 120, 1])],
    ),
  },
  {
    key: "tip-to-side",
    label: "Tip to side",
    tier: "PRO",
    templateIdFor: sharedId("TIP_TO_SIDE"),
    params: (presetId) => byFamily(
      presetId,
      [
        nm("cd_nm", "CD", [40, 200, 2]),
        nm("length_nm", "Length", [200, 900, 10]),
        nm("attacker_nm", "Attacker", [100, 400, 10]),
        nm("gap_nm", "Gap", [20, 300, 2]),
      ],
      [
        nm("cd_nm", "CD", [12, 60, 1]),
        nm("length_nm", "Length", [100, 400, 5]),
        nm("attacker_nm", "Attacker", [40, 200, 5]),
        nm("gap_nm", "Gap", [8, 100, 1]),
      ],
    ),
  },
  {
    key: "touching-corners",
    label: "Touching corners",
    shortLabel: "Corners",
    tier: "PRO",
    templateIdFor: sharedId("TOUCHING_CORNERS"),
    params: (presetId) => byFamily(
      presetId,
      [
        nm("w_nm", "Width", [60, 400, 2]),
        nm("h_nm", "Height", [60, 400, 2]),
        nm("gap_x_nm", "Gap X", [0, 300, 2]),
        nm("gap_y_nm", "Gap Y", [0, 300, 2]),
      ],
      [
        nm("w_nm", "Width", [20, 150, 1]),
        nm("h_nm", "Height", [20, 150, 1]),
        nm("gap_x_nm", "Gap X", [0, 100, 1]),
        nm("gap_y_nm", "Gap Y", [0, 100, 1]),
      ],
    ),
  },
  {
    key: "contact-array",
    label: "Contact array",
    shortLabel: "Contacts",
    tier: "PRO",
    templateIdFor: sharedId("CONTACT_ARRAY"),
    params: (presetId) => byFamily(
      presetId,
      [
        nm("w_nm", "Width", [40, 200, 2]),
        nm("pitch_nm", "Pitch", [80, 400, 2]),
        count("n_rows", "Rows", [1, 5, 1]),
        count("n_cols", "Columns", [1, 5, 1]),
      ],
      [
        nm("w_nm", "Width", [12, 60, 1]),
        nm("pitch_nm", "Pitch", [24, 120, 1]),
        count("n_rows", "Rows", [1, 5, 1]),
        count("n_cols", "Columns", [1, 5, 1]),
      ],
    ),
  },
];

const CATALOG_PRESET_PROBES: ReadonlyArray<PresetID> = ["DUV_193_DRY", "EUV_LNA"];

/** Catalogue entry that owns the template ID (any family), or null for legacy / unknown IDs. */
export function patternForTemplateId(templateId: TemplateID | string | null | undefined): PatternEntry | null {
  const normalized = normalizeTemplateId(templateId);
  if (!normalized) return null;
  for (const entry of PATTERN_CATALOG) {
    if (CATALOG_PRESET_PROBES.some((presetId) => entry.templateIdFor(presetId) === normalized)) return entry;
  }
  return null;
}

export function isProOnlyTemplate(templateId: TemplateID | string | null | undefined): boolean {
  const normalized = normalizeTemplateId(templateId);
  return normalized != null && PRO_ONLY_TEMPLATE_IDS.includes(normalized);
}

const LEGACY_TEMPLATE_LABELS: Record<string, string> = {
  ISO_LINE: "Iso line",
  CONTACT: "Square",
  CONTACT_OPC_SERIF: "Square (serif OPC)",
  L_CORNER: "L-shape",
  L_CORNER_RAW: "L-shape",
  L_CORNER_OPC_SERIF: "L-shape (OPC)",
  L_CORNER_OPC_DUV: "L-shape (OPC)",
  L_CORNER_OPC_EUV: "L-shape (OPC)",
  LINE_END_RAW: "Line end",
  LINE_END_RAW_DUV: "Line end",
  LINE_END_RAW_EUV: "Line end",
  LINE_END_OPC_HAMMER: "Line end (hammerhead)",
  STAIRCASE: "Stepped interconnect",
  STAIRCASE_OPC: "Stepped interconnect (OPC)",
};

/** Human label for any template ID, including legacy IDs kept for saved history. */
export function templateLabelFor(templateId: TemplateID | string | null | undefined): string {
  if (!templateId) return "Pattern";
  const entry = patternForTemplateId(templateId);
  if (entry) return entry.label;
  const normalized = normalizeTemplateId(templateId) ?? String(templateId);
  return LEGACY_TEMPLATE_LABELS[normalized] ?? LEGACY_TEMPLATE_LABELS[String(templateId)] ?? String(templateId);
}

/**
 * Inverse of the template builders for the pattern features the Edit panel lists
 * (M1, M2, ...): resizing a feature becomes a pattern-parameter change so the mask,
 * its target and the Set-up sliders stay one thing. Returns null when the resize has
 * no parametric meaning (then the caller keeps a per-feature override).
 */
export function paramsFromFeature(
  templateId: TemplateID | string | null | undefined,
  featureIndex: number,
  rect: { w_nm: number; h_nm: number },
  params: Record<string, number>,
): Record<string, number> | null {
  const id = normalizeTemplateId(templateId);
  if (!id) return null;
  const w = Math.round(rect.w_nm);
  const h = Math.round(rect.h_nm);
  switch (id) {
    case "ISO_LINE_DUV":
    case "ISO_LINE_EUV":
    case "DENSE_LS":
    case "TIP_TO_TIP":
      return { ...params, cd_nm: w, length_nm: h };
    case "CONTACT_RAW":
    case "CONTACT_ARRAY": {
      // A square keeps one side: take whichever dimension the user changed.
      const current = Math.round(params.w_nm ?? params.cd_nm ?? w);
      const s = w !== current ? w : h;
      return { ...params, cd_nm: s, w_nm: s };
    }
    case "L_CORNER_RAW_DUV":
    case "L_CORNER_RAW_EUV":
      if (featureIndex === 0) return { ...params, length_nm: w, cd_nm: h };
      if (featureIndex === 1) return { ...params, cd_nm: w, arm_nm: h };
      return null;
    case "TIP_TO_SIDE":
      if (featureIndex === 0) return { ...params, cd_nm: w, length_nm: h };
      if (featureIndex === 1) return { ...params, attacker_nm: w, cd_nm: h };
      return null;
    case "TOUCHING_CORNERS":
      return { ...params, w_nm: w, h_nm: h };
    default:
      return null;
  }
}
