import type { Plan, PresetID } from "./types";

export const PRESET_LABELS: Record<PresetID, string> = {
  DUV_193_DRY: "DUV | 193 nm Dry",
  DUV_193_IMM: "DUV | 193 nm Immersion (Pro)",
  EUV_LNA: "EUV | 13.5 nm Low-NA",
  EUV_HNA: "EUV | 13.5 nm High-NA (Pro)",
};

export const ENABLED_PRESET_IDS_BY_PLAN: Record<Plan, ReadonlyArray<PresetID>> = {
  FREE: [
    "DUV_193_DRY",
    "EUV_LNA",
  ],
  PRO: [
    "DUV_193_DRY",
    "EUV_LNA",
    // Keep DUV_193_IMM and EUV_HNA disabled for now.
    // Re-enable later by adding them back here.
  ],
};

const PRESET_FALLBACKS: Partial<Record<PresetID, PresetID>> = {
  DUV_193_IMM: "DUV_193_DRY",
  EUV_HNA: "EUV_LNA",
};

export function enabledPresetIdsForPlan(plan: Plan): Array<PresetID> {
  return [...ENABLED_PRESET_IDS_BY_PLAN[plan]];
}

export function enabledPresetOptionsForPlan(plan: Plan): Array<{ id: PresetID; label: string }> {
  return enabledPresetIdsForPlan(plan).map((id) => ({
    id,
    label: PRESET_LABELS[id],
  }));
}

export function getCompatibleEnabledPresetId(presetId: PresetID, plan: Plan): PresetID {
  const enabled = ENABLED_PRESET_IDS_BY_PLAN[plan];
  if (enabled.includes(presetId)) return presetId;
  const fallback = PRESET_FALLBACKS[presetId];
  if (fallback && enabled.includes(fallback)) return fallback;
  return enabled[0] ?? "DUV_193_DRY";
}
