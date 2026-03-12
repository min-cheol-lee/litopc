import type { PresetID, TemplateID } from "./types";

export type TemplatePresetFamily = "DUV" | "EUV";

const SHARED_TEMPLATE_IDS: ReadonlyArray<TemplateID> = [
  "ISO_LINE",
  "DENSE_LS",
  "LINE_END_RAW",
  "LINE_END_OPC_HAMMER",
  "STAIRCASE",
  "STAIRCASE_OPC",
];

const DUV_ONLY_TEMPLATE_IDS: ReadonlyArray<TemplateID> = [
  "CONTACT_RAW",
  "CONTACT_OPC_SERIF",
  "L_CORNER_RAW_DUV",
  "L_CORNER_OPC_DUV",
];

const EUV_ONLY_TEMPLATE_IDS: ReadonlyArray<TemplateID> = [
  "L_CORNER_RAW_EUV",
  "L_CORNER_OPC_EUV",
];

const ENABLED_TEMPLATE_IDS_BY_FAMILY: Record<TemplatePresetFamily, ReadonlyArray<TemplateID>> = {
  DUV: [
    "ISO_LINE",
    "DENSE_LS",
    "CONTACT_RAW",
    "CONTACT_OPC_SERIF",
    "LINE_END_RAW",
    "LINE_END_OPC_HAMMER",
    // Keep DUV staircase presets disabled for now.
    // Re-enable later by adding their canonical IDs here.
    "L_CORNER_RAW_DUV",
    "L_CORNER_OPC_DUV",
  ],
  EUV: [
    "ISO_LINE",
    "DENSE_LS",
    // Keep EUV-specific square, L-shape, and stepped presets disabled for now.
    // Re-enable later by adding their canonical IDs here.
  ],
};

export function presetFamilyForPreset(presetId: PresetID): TemplatePresetFamily {
  return presetId === "EUV_LNA" || presetId === "EUV_HNA" ? "EUV" : "DUV";
}

export function normalizeTemplateId(templateId: TemplateID | string | null | undefined): TemplateID | null {
  if (!templateId) return null;
  switch (templateId) {
    case "L_CORNER":
    case "L_CORNER_RAW":
      return "L_CORNER_RAW_DUV";
    case "L_CORNER_OPC_SERIF":
      return "L_CORNER_OPC_DUV";
    case "ISO_LINE":
    case "DENSE_LS":
    case "CONTACT_RAW":
    case "CONTACT_OPC_SERIF":
    case "LINE_END_RAW":
    case "LINE_END_OPC_HAMMER":
    case "L_CORNER_RAW_DUV":
    case "L_CORNER_OPC_DUV":
    case "L_CORNER_RAW_EUV":
    case "L_CORNER_OPC_EUV":
    case "STAIRCASE":
    case "STAIRCASE_OPC":
      return templateId;
    default:
      return null;
  }
}

export function isLShapeRawTemplate(templateId: TemplateID | string | null | undefined): boolean {
  const normalized = normalizeTemplateId(templateId);
  return normalized === "L_CORNER_RAW_DUV" || normalized === "L_CORNER_RAW_EUV";
}

export function isLShapeOpcTemplate(templateId: TemplateID | string | null | undefined): boolean {
  const normalized = normalizeTemplateId(templateId);
  return normalized === "L_CORNER_OPC_DUV" || normalized === "L_CORNER_OPC_EUV";
}

export function isLShapeTemplate(templateId: TemplateID | string | null | undefined): boolean {
  return isLShapeRawTemplate(templateId) || isLShapeOpcTemplate(templateId);
}

export function templateSupportsPresetFamily(
  templateId: TemplateID | string | null | undefined,
  presetId: PresetID,
): boolean {
  const normalized = normalizeTemplateId(templateId);
  if (!normalized) return false;
  if (SHARED_TEMPLATE_IDS.includes(normalized)) return true;
  const family = presetFamilyForPreset(presetId);
  return family === "DUV"
    ? DUV_ONLY_TEMPLATE_IDS.includes(normalized)
    : EUV_ONLY_TEMPLATE_IDS.includes(normalized);
}

export function templateEnabledForPreset(
  templateId: TemplateID | string | null | undefined,
  presetId: PresetID,
): boolean {
  const normalized = normalizeTemplateId(templateId);
  if (!normalized) return false;
  const family = presetFamilyForPreset(presetId);
  return ENABLED_TEMPLATE_IDS_BY_FAMILY[family].includes(normalized);
}

export function getCompatibleTemplateIdForPreset(
  templateId: TemplateID | string | null | undefined,
  presetId: PresetID,
): TemplateID | null {
  const normalized = normalizeTemplateId(templateId);
  if (!normalized) return null;
  if (templateSupportsPresetFamily(normalized, presetId)) return normalized;
  const family = presetFamilyForPreset(presetId);
  switch (normalized) {
    case "L_CORNER_RAW_DUV":
    case "L_CORNER_RAW_EUV":
      return family === "DUV" ? "L_CORNER_RAW_DUV" : "L_CORNER_RAW_EUV";
    case "L_CORNER_OPC_DUV":
    case "L_CORNER_OPC_EUV":
      return family === "DUV" ? "L_CORNER_OPC_DUV" : "L_CORNER_OPC_EUV";
    default:
      return normalized;
  }
}
