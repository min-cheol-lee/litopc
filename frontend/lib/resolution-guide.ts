import type { MaskShape, PresetID } from "./types";

/**
 * Practical resolution floor per imaging preset: k1 · λ / NA with the educational
 * k1 the simulator reports in its trust strip. Features narrower than this print
 * faint or not at all at the default threshold, and OPC cannot measure an edge.
 */
export const RESOLUTION_FLOOR_NM: Record<PresetID, number> = {
  DUV_193_DRY: Math.round((0.28 * 193) / 0.93), // ≈ 58 nm
  DUV_193_IMM: Math.round((0.26 * 193) / 1.35), // ≈ 37 nm
  EUV_LNA: Math.round((0.3 * 13.5) / 0.33), // ≈ 12 nm
  EUV_HNA: Math.round((0.26 * 13.5) / 0.55), // ≈ 6 nm
};

export const PRESET_SHORT_NAME: Record<PresetID, string> = {
  DUV_193_DRY: "193 nm DUV (dry)",
  DUV_193_IMM: "193 nm DUV (immersion)",
  EUV_LNA: "13.5 nm EUV (low-NA)",
  EUV_HNA: "13.5 nm EUV (high-NA)",
};

export function isEuvPreset(presetId: PresetID): boolean {
  return presetId === "EUV_LNA" || presetId === "EUV_HNA";
}

/** Smallest rectangle side among the additive shapes, or null when there is none. */
export function smallestFeatureNm(shapes: ReadonlyArray<MaskShape>): number | null {
  let min: number | null = null;
  for (const shape of shapes) {
    if (shape.type !== "rect" || shape.op === "subtract") continue;
    const side = Math.min(shape.w_nm, shape.h_nm);
    if (!Number.isFinite(side) || side <= 0) continue;
    min = min === null ? side : Math.min(min, side);
  }
  return min;
}

/** A short warning for the Pattern card when the chosen size is under the floor. */
export function sizeWarning(presetId: PresetID, shapes: ReadonlyArray<MaskShape>): string | null {
  const floor = RESOLUTION_FLOOR_NM[presetId];
  const smallest = smallestFeatureNm(shapes);
  if (smallest === null || smallest >= floor) return null;
  const alt = isEuvPreset(presetId) ? "" : " For features this small, switch the imaging tool to EUV.";
  return `${Math.round(smallest)} nm is below what ${PRESET_SHORT_NAME[presetId]} resolves (about ${floor} nm). The print may vanish and OPC will have nothing to measure.${alt}`;
}

/**
 * Turns the OPC routine's internal error into a message that explains the physics:
 * which feature is too small for which tool, and what to do about it.
 */
export function explainOpcFailure(
  rawMessage: string,
  presetId: PresetID,
  targetShapes: ReadonlyArray<MaskShape>,
  dose: number,
): string {
  const floor = RESOLUTION_FLOOR_NM[presetId];
  const smallest = smallestFeatureNm(targetShapes);
  const tool = PRESET_SHORT_NAME[presetId];
  const noContour = /no printed contour|no measurable contour|no exposed target edges/i.test(rawMessage);
  if (noContour && smallest !== null && smallest < floor) {
    const fix = isEuvPreset(presetId)
      ? `Make the smallest feature at least ${floor} nm, or lower the dose threshold (now ${dose.toFixed(2)}).`
      : `Make the smallest feature at least ${floor} nm, switch the imaging tool to EUV, or lower the dose threshold (now ${dose.toFixed(2)}).`;
    return `OPC could not measure an edge: the ${Math.round(smallest)} nm feature is below the ${tool} resolution floor (about ${floor} nm), so nothing printed at this threshold. ${fix}`;
  }
  if (noContour) {
    return `OPC could not measure an edge: nothing printed at the dose threshold ${dose.toFixed(2)}. Lower the threshold or enlarge the target, then simulate again.`;
  }
  if (/additive rectangle target/i.test(rawMessage)) {
    return "OPC needs a target made of filled rectangles. Remove subtract shapes from the Target layer and try again.";
  }
  if (/do not match/i.test(rawMessage)) {
    return "The mask and target no longer line up. Press Reset in the Correct step, then run the correction again.";
  }
  return rawMessage;
}
