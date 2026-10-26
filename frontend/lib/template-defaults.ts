import type { PresetID, TemplateID } from "./types";
import { normalizeTemplateId, presetFamilyForPreset } from "./template-variants";

// Wafer-scale dimensions, shared by mask previews and target initialization.
export const L_SHAPE_RAW_DEFAULTS = {
  DUV: { cd_nm: 100, length_nm: 450, arm_nm: 420, elbow_x_offset_nm: 160, elbow_y_offset_nm: 140 },
  EUV: { cd_nm: 24, length_nm: 160, arm_nm: 160, elbow_x_offset_nm: 80, elbow_y_offset_nm: 80 },
} as const;

// Shared pattern templates (2026-10-25). Mirrored by the backend
// SHARED_TEMPLATE_DUV_DEFAULTS / SHARED_TEMPLATE_EUV_DEFAULTS in sim/templates.py.
// cd_nm is always present: the app treats it as the generic "feature size".
export const TIP_TO_TIP_DEFAULTS = {
  DUV: { cd_nm: 100, length_nm: 380, gap_nm: 120 },
  EUV: { cd_nm: 24, length_nm: 150, gap_nm: 32 },
} as const;

export const TIP_TO_SIDE_DEFAULTS = {
  DUV: { cd_nm: 100, length_nm: 800, attacker_nm: 380, gap_nm: 110 },
  EUV: { cd_nm: 24, length_nm: 300, attacker_nm: 140, gap_nm: 30 },
} as const;

export const TOUCHING_CORNERS_DEFAULTS = {
  DUV: { w_nm: 260, h_nm: 260, gap_x_nm: 60, gap_y_nm: 60, cd_nm: 260 },
  EUV: { w_nm: 90, h_nm: 90, gap_x_nm: 20, gap_y_nm: 20, cd_nm: 90 },
} as const;

export const CONTACT_ARRAY_DEFAULTS = {
  DUV: { w_nm: 120, pitch_nm: 240, n_rows: 3, n_cols: 3, cd_nm: 120 },
  EUV: { w_nm: 30, pitch_nm: 64, n_rows: 3, n_cols: 3, cd_nm: 30 },
} as const;

export const CONTACT_RAW_DEFAULTS = {
  DUV: { cd_nm: 200, w_nm: 200, serif_nm: 28 },
  EUV: { cd_nm: 60, w_nm: 60, serif_nm: 10 },
} as const;

/** Field of view per imaging family. EUV features are 4 to 5 times smaller, so a
 *  smaller field keeps them legible in 2D and 3D and spends the grid where it matters. */
export const FOV_NM_BY_FAMILY = { DUV: 1100, EUV: 360 } as const;

export function templateParamDefaults(id: TemplateID, presetId: PresetID): Record<string, number> {
  const normalizedId = normalizeTemplateId(id) ?? id;
  switch (normalizedId) {
    // Always include cd_nm / length_nm explicitly so that switching templates
    // always resets these to scale-appropriate values.  Without this, a
    // preceding LINE_END_RAW_EUV selection (cd_nm=24) would bleed into
    // ISO_LINE_DUV, DENSE_LS, etc. via the `{ ...params, ...defaults }` merge.
    case "ISO_LINE_DUV":
      return { cd_nm: 100, length_nm: 900 };
    case "ISO_LINE_EUV":
      // EUV 13.5 nm LNA: cd=24 nm ≈ 2× Rayleigh floor (~12 nm).
      // Shows real EUV proximity effects; 500 nm length fits well in the 1100 nm FOV.
      return { cd_nm: 24, length_nm: 300 };
    case "DENSE_LS":
      return presetFamilyForPreset(presetId) === "EUV"
        ? { cd_nm: 24, length_nm: 320, pitch_nm: 48, n_lines: 4 }
        : { cd_nm: 150, length_nm: 900, pitch_nm: 250, n_lines: 7 };
    case "LINE_END_RAW_DUV":
      return { cd_nm: 100, length_nm: 600 };
    case "LINE_END_RAW_EUV":
      return { cd_nm: 24, length_nm: 160 };
    case "CONTACT_RAW":
      return { ...CONTACT_RAW_DEFAULTS[presetFamilyForPreset(presetId)] };
    case "TIP_TO_TIP":
      return { ...TIP_TO_TIP_DEFAULTS[presetFamilyForPreset(presetId)] };
    case "TIP_TO_SIDE":
      return { ...TIP_TO_SIDE_DEFAULTS[presetFamilyForPreset(presetId)] };
    case "TOUCHING_CORNERS":
      return { ...TOUCHING_CORNERS_DEFAULTS[presetFamilyForPreset(presetId)] };
    case "CONTACT_ARRAY":
      return { ...CONTACT_ARRAY_DEFAULTS[presetFamilyForPreset(presetId)] };
    case "CONTACT_OPC_SERIF":
      return {
        cd_nm: 170,
        w_nm: 170,
        serif_nm: 112,
      };
    case "L_CORNER_RAW_DUV":
      return { ...L_SHAPE_RAW_DEFAULTS.DUV };
    case "L_CORNER_OPC_DUV":
      return {
        cd_nm: 120,
        length_nm: 350,
        arm_nm: 320,
        serif_nm: 90,
        m1_x_nm: 300,
        m1_y_nm: 580,
        m2_x_nm: 600,
        m2_y_nm: 305,
        r1_x_nm: 245,
        r1_y_nm: 540,
        left_hammer_w_nm: 55,
        left_hammer_h_nm: 180,
        r2_x_nm: 570,
        r2_y_nm: 250,
        bottom_hammer_w_nm: 180,
        bottom_hammer_h_nm: 55,
        r3_x_nm: 650,
        r3_y_nm: 625,
        r4_x_nm: 470,
        r4_y_nm: 555,
        r4_w_nm: 90,
        r4_h_nm: 160,
        r5_x_nm: 585,
        r5_y_nm: 432,
        r5_w_nm: 150,
        r5_h_nm: 125,
      };
    case "L_CORNER_RAW_EUV":
      return { ...L_SHAPE_RAW_DEFAULTS.EUV };
    case "L_CORNER_OPC_EUV":
      return {
        cd_nm: 110,
        length_nm: 380,
        arm_nm: 348,
        serif_nm: 60,
        m1_x_nm: 288,
        m1_y_nm: 586,
        m2_x_nm: 604,
        m2_y_nm: 286,
        r1_x_nm: 252,
        r1_y_nm: 546,
        left_hammer_w_nm: 40,
        left_hammer_h_nm: 136,
        r2_x_nm: 580,
        r2_y_nm: 254,
        bottom_hammer_w_nm: 150,
        bottom_hammer_h_nm: 40,
        r3_x_nm: 642,
        r3_y_nm: 618,
      };
    case "STAIRCASE":
      return {
        cd_nm: 88,
        thickness_nm: 88,
        step_w_nm: 180,
        step_h_nm: 110,
      };
    case "STAIRCASE_OPC":
      return {
        cd_nm: 88,
        thickness_nm: 88,
        step_w_nm: 180,
        step_h_nm: 110,
        serif_nm: 18,
        opc_bias_nm: 12,
        end_extension_nm: 24,
      };
    default:
      return {};
  }
}
