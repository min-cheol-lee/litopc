/**
 * opc-correction.ts — Simple model-based OPC correction
 *
 * Algorithm (per iteration):
 *   1. Simulate current mask → get printed contours
 *   2. For each additive rect in the mask, sample N points along each of the 4 EDGES.
 *      Sampling is done at the TARGET edge position for stability (not at the shifting mask edge).
 *   3. For each sample, find nearest contour point and compute signed EPE:
 *        EPE = (nearest - targetSample) · outwardNormal
 *      EPE < 0  → contour is inside target  → mask must grow (bias outward)
 *      EPE > 0  → contour is outside target → mask must shrink (bias inward)
 *   4. Bias mask edge by  –gain × mean_EPE  in the outward direction:
 *        left/top  edges: position -= delta   (outward = decreasing coordinate)
 *        right/bot edges: position += delta   (outward = increasing coordinate)
 *   5. Skip edges that are "interior" (fully covered by another add-shape).
 *   6. Apply MRC constraints after each delta:
 *        – minCdNm   : shape cannot shrink below the Rayleigh printability floor
 *        – minSpaceNm: outward growth is clamped to prevent bridging an external shape
 *        – maxBiasNm : total edge displacement from the batch-start position is capped
 *
 * Sign convention check for LEFT edge (outward = −x):
 *   contour inside → cx > target_x_left → EPE < 0 → delta > 0 → x_nm -= delta ✓
 */

import type { MaskShape, SimRequest, SimResponse } from "./types";
import { getApiBase } from "./api-base";
import { clientHeaders } from "./usage";

type EdgeName = "left" | "right" | "top" | "bottom";
type RectShape = Extract<MaskShape, { type: "rect" }>;

// ── MRC (Mask Rule Check) constraints ─────────────────────────────────────────

/**
 * Mask Rule Check constraints enforced during OPC edge biasing.
 *
 * minCdNm     — minimum feature width/height in nm.
 *               Prevents a cell from shrinking below the Rayleigh printability
 *               floor, which would create a disconnection ("break") in the mask.
 *
 * minSpaceNm  — minimum gap between distinct (non-touching) shapes in nm.
 *               Clamped before outward growth to prevent two separately-corrected
 *               cells from merging into an unintended "bridge".
 *
 * maxBiasNm   — maximum edge displacement from the batch-start position in nm.
 *               Bounds the OPC correction amplitude per run so staircase profiles
 *               stay within manufacturable mask-rule limits.
 *
 * gridNm      — manufacturing grid pitch in nm (wafer scale).
 *               All edge coordinates are snapped to the nearest multiple of gridNm
 *               after each iteration, preventing sub-grid features that cannot be
 *               written by the mask e-beam tool.  Set to 0 to disable snapping.
 */
export type MrcConstraints = {
  minCdNm: number;
  minSpaceNm: number;
  maxBiasNm: number;
  gridNm: number;
};

/**
 * Preset-specific MRC defaults (all values in wafer-level nm).
 *
 * minCdNm is set to ≈ Rayleigh CD floor for each node (k₁·λ/NA, k₁ ≈ 0.28–0.30).
 * minSpaceNm is set equal to minCdNm — standard symmetric 1:1 CD/space rule.
 * maxBiasNm is set to ≈ 50 % of the segment size for that preset, which allows
 * meaningful correction without producing extreme staircase profiles.
 *
 *   DUV 193 Dry  (NA 0.93):  Rayleigh ≈ 58 nm  → minCd = 50 nm, maxBias = 40 nm
 *   DUV 193 Imm  (NA 1.35):  Rayleigh ≈ 37 nm  → minCd = 32 nm, maxBias = 25 nm
 *   EUV LNA      (NA 0.33):  Rayleigh ≈ 12 nm  → minCd = 12 nm, maxBias = 10 nm
 *   EUV HNA      (NA 0.55):  Rayleigh ≈  7 nm  → minCd =  6 nm, maxBias =  6 nm
 */
export const MRC_BY_PRESET: Record<string, MrcConstraints> = {
  // maxBiasNm raised to ≈ typical optical edge shrinkage × 1.5 so that the
  // full EPE can be corrected within a single 5-iteration batch.
  // bridging is still prevented by the per-edge minSpaceNm check in maxOutwardDeltaForSpace.
  DUV_193_DRY: { minCdNm: 50, minSpaceNm: 50, maxBiasNm: 80, gridNm: 1   },
  DUV_193_IMM: { minCdNm: 32, minSpaceNm: 32, maxBiasNm: 50, gridNm: 1   },
  EUV_LNA:     { minCdNm: 12, minSpaceNm: 12, maxBiasNm: 20, gridNm: 0.5 },
  EUV_HNA:     { minCdNm:  6, minSpaceNm:  6, maxBiasNm: 12, gridNm: 0.5 },
};

const DEFAULT_MRC: MrcConstraints = { minCdNm: 4, minSpaceNm: 4, maxBiasNm: 200, gridNm: 1 };

// ── Grid snapping ─────────────────────────────────────────────────────────────

/**
 * Snap all four edges of a rect to the nearest multiple of gridNm.
 * Snapping is applied AFTER all edge deltas so the final position is
 * always grid-aligned (required by mask e-beam write tools).
 * Minimum size is preserved: snapped w/h cannot go below gridNm.
 */
function snapToGrid(shape: RectShape, gridNm: number): RectShape {
  if (gridNm <= 0) return shape;
  const snap = (v: number) => Math.round(v / gridNm) * gridNm;
  const x1 = snap(shape.x_nm);
  const y1 = snap(shape.y_nm);
  const x2 = snap(shape.x_nm + shape.w_nm);
  const y2 = snap(shape.y_nm + shape.h_nm);
  return {
    ...shape,
    x_nm: x1,
    y_nm: y1,
    w_nm: Math.max(gridNm, x2 - x1),
    h_nm: Math.max(gridNm, y2 - y1),
  };
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function rectEdgeCoord(r: RectShape, edge: EdgeName): number {
  switch (edge) {
    case "left":   return r.x_nm;
    case "right":  return r.x_nm + r.w_nm;
    case "top":    return r.y_nm;
    case "bottom": return r.y_nm + r.h_nm;
  }
}

/** outward unit normal for each edge */
const NORMALS: Record<EdgeName, { nx: number; ny: number }> = {
  left:   { nx: -1, ny:  0 },
  right:  { nx:  1, ny:  0 },
  top:    { nx:  0, ny: -1 },
  bottom: { nx:  0, ny:  1 },
};

/**
 * Sample N evenly-spaced points along one edge of a reference rectangle.
 * A 15% margin is applied at each end to avoid corner contamination.
 */
function sampleEdge(
  ref: RectShape,
  edge: EdgeName,
  n: number,
): Array<{ px: number; py: number; nx: number; ny: number }> {
  const { x_nm: x, y_nm: y, w_nm: w, h_nm: h } = ref;
  const margin = 0.15;
  const { nx, ny } = NORMALS[edge];
  const pts: Array<{ px: number; py: number; nx: number; ny: number }> = [];

  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : margin + (i / (n - 1)) * (1 - 2 * margin);
    let px: number, py: number;
    switch (edge) {
      case "left":   px = x;     py = y + t * h; break;
      case "right":  px = x + w; py = y + t * h; break;
      case "top":    px = x + t * w; py = y;     break;
      case "bottom": px = x + t * w; py = y + h; break;
    }
    pts.push({ px, py, nx, ny });
  }
  return pts;
}

// ── Per-edge directional search box ──────────────────────────────────────────

/**
 * Build a tight search box for finding contour points relevant to ONE edge.
 *
 * The box extends ONLY in the outward direction of the edge by
 *   outward = min(maxBiasNm, minSpaceNm / 2)
 * and covers the full target feature interior in the inward direction.
 *
 * Why cap at minSpaceNm / 2:
 *   Features are guaranteed to be ≥ minSpaceNm apart (mask rule).
 *   With outward = minSpaceNm / 2, the search box stops at the midpoint of
 *   the gap between this feature and the nearest neighbour.  The neighbour's
 *   contour (which sits ≥ minSpaceNm/2 from the neighbour's edge, i.e. near
 *   the midpoint) is safely excluded.
 *
 *   Example — Dense L/S (space = 80 nm, minSpaceNm = 50 nm):
 *     outward = min(80, 25) = 25 nm
 *     neighbour edge at +80 nm → neighbour contour at ~+60–90 nm → excluded ✓
 *     Without this cap: outward = 80 nm → neighbour contour INCLUDED
 *       → EPE = +large positive → mask shrinks → catastrophic first-iteration shrinkage
 *
 * Lateral margin (perpendicular) = maxBiasNm, which allows for contour
 * width variation without risking inclusion of a perpendicularly adjacent feature.
 */
function edgeSearchBox(
  targetRect: RectShape,
  edge: EdgeName,
  maxBiasNm: number,
  minSpaceNm: number,
): BBox {
  // Outward extension: bounded by half the minimum inter-feature gap so the
  // search box never crosses into the space owned by an adjacent feature.
  const outward = Math.min(maxBiasNm, minSpaceNm / 2);
  const lat = maxBiasNm; // lateral (perpendicular) tolerance
  const { x_nm: x, y_nm: y, w_nm: w, h_nm: h } = targetRect;
  switch (edge) {
    case "left":
      // Outward = −x: extend leftward by outward; include full interior rightward to x+w
      return { x1: x - outward, y1: y - lat, x2: x + w,          y2: y + h + lat };
    case "right":
      // Outward = +x: include full interior from x; extend rightward by outward
      return { x1: x,           y1: y - lat, x2: x + w + outward, y2: y + h + lat };
    case "top":
      // Outward = −y: extend upward by outward; include full interior downward to y+h
      return { x1: x - lat, y1: y - outward, x2: x + w + lat, y2: y + h };
    case "bottom":
      // Outward = +y: include full interior from y; extend downward by outward
      return { x1: x - lat, y1: y,           x2: x + w + lat, y2: y + h + outward };
  }
}

// ── Nearest contour point ─────────────────────────────────────────────────────

type BBox = { x1: number; y1: number; x2: number; y2: number };

function nearestOnContours(
  px: number,
  py: number,
  contours: Array<{ points_nm: Array<{ x: number; y: number }> }>,
  searchBox?: BBox,
): { x: number; y: number } | null {
  let bestDist = Infinity;
  let best: { x: number; y: number } | null = null;
  for (const c of contours) {
    for (const pt of c.points_nm) {
      // If a search box is given, skip contour points that fall outside it.
      // This prevents a sample on feature A from finding its nearest contour
      // point on feature B's printed image when multiple shapes are present.
      if (searchBox && (
        pt.x < searchBox.x1 || pt.x > searchBox.x2 ||
        pt.y < searchBox.y1 || pt.y > searchBox.y2
      )) continue;
      const d = Math.hypot(pt.x - px, pt.y - py);
      if (d < bestDist) { bestDist = d; best = pt; }
    }
  }
  return best;
}

// ── Interior-edge detection ───────────────────────────────────────────────────

/**
 * Return true if the given edge of `shape` is covered by any other add-rect
 * in the list (i.e. it is an interior edge in the boolean union).
 * We check whether the edge midpoint plus a small outward step lands inside
 * another additive rectangle.
 */
function isInteriorEdge(
  shape: RectShape,
  edge: EdgeName,
  allShapes: MaskShape[],
): boolean {
  const { nx, ny } = NORMALS[edge];
  const step = 2; // nm — small outward probe

  // Sample 3 evenly-spaced points along the edge (including centre)
  const samples = sampleEdge(shape, edge, 3);
  let coveredCount = 0;

  for (const { px, py } of samples) {
    // Probe point just outside the edge
    const probX = px + nx * step;
    const probY = py + ny * step;

    for (const other of allShapes) {
      if (other === shape) continue;
      if (other.type !== "rect" || other.op === "subtract") continue;
      const o = other as RectShape;
      if (
        probX > o.x_nm && probX < o.x_nm + o.w_nm &&
        probY > o.y_nm && probY < o.y_nm + o.h_nm
      ) {
        coveredCount++;
        break;
      }
    }
  }
  // Edge is interior if all 3 probe points are inside another rect
  return coveredCount >= 3;
}

// ── MRC helpers ───────────────────────────────────────────────────────────────

/**
 * Compute the maximum outward delta the given edge can receive before it would
 * bring the shape within minSpaceNm of another distinct (non-touching) shape.
 *
 * "Distinct" = not adjacent sub-segments (gap > 2 nm in the outward direction).
 * Adjacent sub-segments from the same parent touch at gap ≈ 0 and are skipped
 * because interior-edge detection already handles them.
 */
function maxOutwardDeltaForSpace(
  shape: RectShape,
  edge: EdgeName,
  allShapes: MaskShape[],
  minSpaceNm: number,
): number {
  const currentEdge = rectEdgeCoord(shape, edge);
  const { nx } = NORMALS[edge];
  let maxD = Infinity;

  for (const other of allShapes) {
    if (other === shape || other.type !== "rect" || other.op === "subtract") continue;
    const o = other as RectShape;

    // Only shapes that overlap in the perpendicular dimension are proximity-relevant.
    if (nx !== 0) {
      // left / right edge — check y overlap
      const yOverlap =
        Math.min(shape.y_nm + shape.h_nm, o.y_nm + o.h_nm) -
        Math.max(shape.y_nm, o.y_nm);
      if (yOverlap <= 1) continue;
    } else {
      // top / bottom edge — check x overlap
      const xOverlap =
        Math.min(shape.x_nm + shape.w_nm, o.x_nm + o.w_nm) -
        Math.max(shape.x_nm, o.x_nm);
      if (xOverlap <= 1) continue;
    }

    // Signed gap: positive when the other shape lies ahead in the outward direction.
    let gap = 0;
    switch (edge) {
      case "left":   gap = currentEdge - (o.x_nm + o.w_nm); break; // outward = −x
      case "right":  gap = o.x_nm - currentEdge;             break; // outward = +x
      case "top":    gap = currentEdge - (o.y_nm + o.h_nm); break; // outward = −y
      case "bottom": gap = o.y_nm - currentEdge;             break; // outward = +y
    }

    // gap ≤ 2 nm → touching/adjacent sub-segment of the same feature → skip.
    if (gap <= 2) continue;

    // Remaining room before violating min space.
    maxD = Math.min(maxD, Math.max(0, gap - minSpaceNm));
  }

  return maxD;
}

// ── Per-edge EPE and mask-edge bias ──────────────────────────────────────────

/**
 * Compute mean EPE for one edge of maskShape by sampling along the
 * CORRESPONDING TARGET edge (targetShape same index).
 *
 * EPE = (nearest_contour − target_sample) · outwardNormal
 *   < 0 → contour inside target → grow mask
 *   > 0 → contour outside target → shrink mask
 *
 * Returns delta = –gain × mean_EPE, the amount to move the mask edge
 * in the outward direction.
 */
function edgeDelta(
  targetShape: RectShape,
  edge: EdgeName,
  contours: Array<{ points_nm: Array<{ x: number; y: number }> }>,
  gain: number,
  nSamples: number,
  searchBox?: BBox,
): { delta: number; absEpes: number[] } {
  const samples = sampleEdge(targetShape, edge, nSamples);
  const absEpes: number[] = [];
  let epeSum = 0;
  let count = 0;

  for (const { px, py, nx, ny } of samples) {
    const nearest = nearestOnContours(px, py, contours, searchBox);
    if (!nearest) continue;
    const epe = (nearest.x - px) * nx + (nearest.y - py) * ny;
    epeSum += epe;
    absEpes.push(Math.abs(epe));
    count++;
  }

  const meanEpe = count > 0 ? epeSum / count : 0;
  return { delta: -gain * meanEpe, absEpes };
}

/**
 * Apply a delta (move-in-outward-direction) to one edge of a mask rectangle,
 * enforcing MRC constraints:
 *
 *  1. Max-bias clamp  — edge cannot move more than mrc.maxBiasNm from
 *                       origEdgeCoord (the position at batch-run start).
 *  2. Min-CD clamp    — shape width/height cannot go below mrc.minCdNm,
 *                       preventing a collapsed or "broken" mask feature.
 *
 * Sign convention:
 *  left   outward = −x  → x_nm -= delta, w_nm += delta
 *  right  outward = +x  → w_nm += delta
 *  top    outward = −y  → y_nm -= delta, h_nm += delta
 *  bottom outward = +y  → h_nm += delta
 */
function applyDelta(
  shape: RectShape,
  edge: EdgeName,
  delta: number,
  mrc: MrcConstraints,
  origEdgeCoord: number,
): RectShape {
  // ── Max-bias clamp ────────────────────────────────────────────────────────
  // For left/top, outward movement decreases coordinate (sign = −1).
  // For right/bottom, outward movement increases coordinate (sign = +1).
  const sign = (edge === "right" || edge === "bottom") ? 1 : -1;
  const currentCoord = rectEdgeCoord(shape, edge);
  const newCoord = currentCoord + sign * delta;
  const clampedCoord = Math.max(
    origEdgeCoord - mrc.maxBiasNm,
    Math.min(origEdgeCoord + mrc.maxBiasNm, newCoord),
  );
  delta = sign * (clampedCoord - currentCoord);

  let { x_nm, y_nm, w_nm, h_nm } = shape;

  switch (edge) {
    case "left":   x_nm -= delta; w_nm += delta; break;
    case "right":  w_nm += delta;                break;
    case "top":    y_nm -= delta; h_nm += delta; break;
    case "bottom": h_nm += delta;                break;
  }

  // ── Min-CD clamp ──────────────────────────────────────────────────────────
  // Prevent features below the Rayleigh printability floor (→ no broken masks).
  const minNm = mrc.minCdNm;
  if (w_nm < minNm) {
    if (edge === "left") x_nm = shape.x_nm + shape.w_nm - minNm;
    w_nm = minNm;
  }
  if (h_nm < minNm) {
    if (edge === "top") y_nm = shape.y_nm + shape.h_nm - minNm;
    h_nm = minNm;
  }

  return { ...shape, x_nm, y_nm, w_nm, h_nm };
}

// ── API call ──────────────────────────────────────────────────────────────────

async function simulateCustom(
  base: SimRequest,
  shapes: MaskShape[],
): Promise<SimResponse> {
  const isEuv = base.preset_id === "EUV_LNA" || base.preset_id === "EUV_HNA";
  const body: SimRequest = {
    ...base,
    // DUV: cap at 384 for OPC iteration speed (100 nm features: 2.86 nm/px is sufficient).
    // EUV: use the full base grid — at 24 nm features, 384 gives only 8 pixels per CD,
    //      making sub-nm edge biases invisible after rasterization.
    grid: isEuv ? base.grid : Math.min(base.grid, 384),
    return_intensity: true,  // required: backend only computes contours_nm when true
    opc_sim: true,           // tells backend to skip per-plan rect-count guard (segments > free limit)
    mask: {
      ...base.mask,
      mode: "CUSTOM",
      template_id: undefined,
      shapes,
      preset_feature_overrides: undefined,
    },
  };

  const r = await fetch(`${getApiBase()}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...clientHeaders() },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "OPC simulation failed");
  }
  return r.json() as Promise<SimResponse>;
}

// ── Overlap removal ───────────────────────────────────────────────────────────

/**
 * Remove geometric overlaps between additive rectangles so that each region
 * of the mask is represented by exactly ONE shape.
 *
 * Why this is critical for OPC:
 *   The L-corner template uses two rectangles that share a corner region (the
 *   "elbow").  After segmentation each arm produces independent sub-segments
 *   inside the overlap zone.  The OPC loop corrects them independently; over
 *   several iterations they accumulate different biases and pull apart, creating
 *   a visible gap in the mask.
 *
 * Algorithm (handles edge-aligned overlaps, which cover all standard templates):
 *   For each pair (A, B) where the overlap exactly spans one full edge of A,
 *   trim A so it no longer includes the overlap — B keeps the full region.
 *   E.g. for the L-corner:
 *     Before: horiz arm spans elbowX-450→elbowX; vert arm spans elbowX-100→elbowX
 *     After:  horiz arm trimmed to elbowX-450→elbowX-100; vert arm unchanged
 */
export function resolveRectOverlaps(shapes: MaskShape[]): MaskShape[] {
  const addIdxs = shapes
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.type === "rect" && (s as RectShape).op !== "subtract")
    .map(({ i }) => i);

  // Work with a mutable copy of shapes
  const out: MaskShape[] = shapes.map((s) => ({ ...s } as MaskShape));

  for (let ai = 0; ai < addIdxs.length; ai++) {
    for (let bi = ai + 1; bi < addIdxs.length; bi++) {
      const a = out[addIdxs[ai]] as RectShape;
      const b = out[addIdxs[bi]] as RectShape;

      const ox1 = Math.max(a.x_nm, b.x_nm);
      const ox2 = Math.min(a.x_nm + a.w_nm, b.x_nm + b.w_nm);
      const oy1 = Math.max(a.y_nm, b.y_nm);
      const oy2 = Math.min(a.y_nm + a.h_nm, b.y_nm + b.h_nm);

      // No significant overlap — nothing to do
      if (ox2 - ox1 < 0.1 || oy2 - oy1 < 0.1) continue;

      const eps = 0.5; // nm tolerance

      // Overlap spans A's full height → trim A's x range
      if (Math.abs(oy1 - a.y_nm) < eps && Math.abs(oy2 - (a.y_nm + a.h_nm)) < eps) {
        if (Math.abs(ox2 - (a.x_nm + a.w_nm)) < eps) {
          // Overlap at A's RIGHT edge — trim A's right side
          (out[addIdxs[ai]] as RectShape).w_nm = ox1 - a.x_nm;
        } else if (Math.abs(ox1 - a.x_nm) < eps) {
          // Overlap at A's LEFT edge — trim A's left side
          (out[addIdxs[ai]] as RectShape).x_nm = ox2;
          (out[addIdxs[ai]] as RectShape).w_nm = a.x_nm + a.w_nm - ox2;
        }
        continue;
      }

      // Overlap spans A's full width → trim A's y range
      if (Math.abs(ox1 - a.x_nm) < eps && Math.abs(ox2 - (a.x_nm + a.w_nm)) < eps) {
        if (Math.abs(oy2 - (a.y_nm + a.h_nm)) < eps) {
          // Overlap at A's BOTTOM edge — trim A's bottom
          (out[addIdxs[ai]] as RectShape).h_nm = oy1 - a.y_nm;
        } else if (Math.abs(oy1 - a.y_nm) < eps) {
          // Overlap at A's TOP edge — trim A's top
          (out[addIdxs[ai]] as RectShape).y_nm = oy2;
          (out[addIdxs[ai]] as RectShape).h_nm = a.y_nm + a.h_nm - oy2;
        }
        continue;
      }
    }
  }

  // Remove any shapes that became zero-area after trimming
  return out.filter((s) => {
    if (s.type !== "rect") return true;
    const r = s as RectShape;
    return r.w_nm > 0.1 && r.h_nm > 0.1;
  });
}

// ── Sub-segmentation ──────────────────────────────────────────────────────────

/**
 * Build a sorted, deduplicated list of strip edge coordinates.
 *
 * Starts at `lo`, ends at `hi`, with regular spacing ≈ segNm.
 * Forced breakpoints (e.g. the edge of a neighbouring shape that falls inside
 * this shape's extent) are inserted so that no sub-segment straddles a
 * shape-to-shape boundary.  Straddling would cause isInteriorEdge() to
 * misclassify junction edges as exterior, leading to mask disconnections.
 */
function buildEdges(lo: number, hi: number, segNm: number, forced: number[]): number[] {
  const n = Math.max(1, Math.round((hi - lo) / segNm));
  const step = (hi - lo) / n;

  // Start with the regular grid.
  const edges: number[] = Array.from({ length: n + 1 }, (_, i) => lo + i * step);

  // Snap threshold: if a forced breakpoint is within this distance of an
  // existing grid point, MOVE that grid point rather than inserting a new one.
  // This prevents tiny sub-segments (e.g. a 16 nm strip when segNm=80) whose
  // height would be below minCdNm, causing the applyDelta height-clamp to fire
  // on unrelated edge corrections and produce unexpected shape positions.
  const snapThreshold = step * 0.4;

  for (const f of forced) {
    if (f <= lo + 0.5 || f >= hi - 0.5) continue; // ignore boundary-coincident points

    // Find the nearest existing edge.
    let nearestIdx = 1; // never snap lo (0) or hi (n)
    let nearestDist = Math.abs(edges[1] - f);
    for (let i = 2; i < edges.length - 1; i++) {
      const d = Math.abs(edges[i] - f);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }

    if (nearestDist <= snapThreshold) {
      // Snap: replace the closest interior grid point with the forced position.
      edges[nearestIdx] = f;
    } else {
      // Far enough away: insert as an additional breakpoint.
      edges.push(f);
    }
  }

  return Array.from(new Set(edges)).sort((a, b) => a - b);
}

/**
 * Split each additive RectShape into smaller sub-rects along its longest axis.
 * Sub-rects from the same parent share their "exposed" edge positions, so
 * isInteriorEdge() will correctly skip the internal junction edges and only
 * correct the outward-facing edges.
 *
 * Why this matters:
 *   A single rect treats its entire left edge as one unit with a single mean
 *   EPE — it can only grow/shrink the whole edge uniformly.  Segmentation gives
 *   each strip an independent correction, allowing staircase profiles
 *   (serifs at corners, hammerheads at line ends) to emerge naturally.
 *
 * Forced boundary alignment:
 *   When two shapes (e.g. the two arms of an L-corner) overlap, their shared
 *   boundary is inserted as a forced breakpoint so that no strip straddles it.
 *   Without this, a strip partially in the overlap and partially outside would
 *   have only 1 of 3 isInteriorEdge probes land inside the neighbour, making
 *   the junction edge appear exterior and causing OPC to pull the shapes apart.
 */
export function segmentizeShapes(shapes: MaskShape[], segmentNm: number): MaskShape[] {
  const out: MaskShape[] = [];

  // Collect all add-rect boundaries for forced-breakpoint insertion.
  const addRects = shapes.filter(
    (s): s is RectShape => s.type === "rect" && s.op !== "subtract",
  );

  for (const shape of shapes) {
    if (shape.type !== "rect" || shape.op === "subtract") {
      out.push(shape);
      continue;
    }
    const r = shape as RectShape;
    const w = r.w_nm;
    const h = r.h_nm;
    const aspectRatio = Math.max(w, h) / Math.min(w, h);

    // Gather boundary coordinates of ALL OTHER add-rects for forced breakpoints.
    const others = addRects.filter(o => o !== r);
    const allOtherX = others.flatMap(o => [o.x_nm, o.x_nm + o.w_nm]);
    const allOtherY = others.flatMap(o => [o.y_nm, o.y_nm + o.h_nm]);

    if (aspectRatio < 2) {
      // Near-square (contact holes, pads, etc.) — 2D grid.
      // Each cell gets independent correction of all 4 outer edges, allowing
      // corner serifs and asymmetric rounding to emerge naturally.
      const xEdges = buildEdges(r.x_nm, r.x_nm + w, segmentNm, allOtherX);
      const yEdges = buildEdges(r.y_nm, r.y_nm + h, segmentNm, allOtherY);
      for (let iy = 0; iy < yEdges.length - 1; iy++) {
        for (let ix = 0; ix < xEdges.length - 1; ix++) {
          out.push({
            ...r,
            x_nm: xEdges[ix],
            y_nm: yEdges[iy],
            w_nm: xEdges[ix + 1] - xEdges[ix],
            h_nm: yEdges[iy + 1] - yEdges[iy],
          } as RectShape);
        }
      }
    } else if (h >= w) {
      // Tall rect (lines, etc.) — horizontal strips with forced Y breakpoints.
      const yEdges = buildEdges(r.y_nm, r.y_nm + h, segmentNm, allOtherY);
      for (let i = 0; i < yEdges.length - 1; i++) {
        out.push({ ...r, y_nm: yEdges[i], h_nm: yEdges[i + 1] - yEdges[i] } as RectShape);
      }
    } else {
      // Wide rect — vertical strips with forced X breakpoints.
      const xEdges = buildEdges(r.x_nm, r.x_nm + w, segmentNm, allOtherX);
      for (let i = 0; i < xEdges.length - 1; i++) {
        out.push({ ...r, x_nm: xEdges[i], w_nm: xEdges[i + 1] - xEdges[i] } as RectShape);
      }
    }
  }
  return out;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type OpcIterResult = {
  iteration: number;
  maskShapes: MaskShape[];
  simResult: SimResponse;   // full simulation output for this iteration (live contour preview)
  epeMeanNm: number;
  epeMaxNm: number;
};

export type OpcCorrectionOptions = {
  iterations?: number;      // default 5
  gain?: number;            // default 0.5
  nSamples?: number;        // samples per edge, default 7
  segmentNm?: number;       // sub-segment size in nm, default 20; 0 = no segmentation
  mrc?: MrcConstraints;     // optional override; defaults to MRC_BY_PRESET[preset_id]
  /**
   * If set, re-center every add-rect segment about this X coordinate after each
   * iteration's edge corrections and grid snap.
   *
   * Purpose: prevents sub-pixel rasterization asymmetry from accumulating across
   * iterations for 1D-symmetric features (e.g. LINE_END).
   *
   * At high grids (e.g. 1024 for EUV at 1.07 nm/px), a 24 nm line centred at
   * 550 nm has left and right edges at different sub-pixel offsets (0.83 vs 0.17).
   * This causes the simulator to rasterize them with slightly different effective
   * edge positions, producing unequal EPE for left vs right → left gets a
   * slightly larger outward bias → after 5 iterations the two sides have drifted
   * visibly apart (the "split" asymmetric result).
   *
   * Enforcing `x_nm = centerXNm - w_nm / 2` after each snap keeps the feature
   * perfectly centred regardless of floating-point rounding in `applyDelta` or
   * the grid-snap quantisation.
   */
  centerXNm?: number;
};

/**
 * Run model-based OPC correction.
 *
 * @param initialMask   Starting mask shapes (typically = cloned targetShapes)
 * @param targetShapes  Design-intent shapes used for EPE measurement each iter
 * @param simBase       Full SimRequest for preset/dose/focus context
 * @param options       Tuning knobs
 * @param onProgress    Called after each iteration
 * @param signal        AbortSignal
 */
export async function runOpcCorrection(
  initialMask: MaskShape[],
  targetShapes: MaskShape[],
  simBase: SimRequest,
  options: OpcCorrectionOptions,
  onProgress: (r: OpcIterResult) => void,
  signal?: AbortSignal,
): Promise<OpcIterResult[]> {
  const iterations = options.iterations ?? 5;
  const baseGain = options.gain ?? 0.5;
  let gain = baseGain;           // adapted per-iteration; starts at baseGain
  const nSamples = options.nSamples ?? 7;
  const segmentNm = options.segmentNm ?? 20;
  const mrc: MrcConstraints =
    options.mrc ?? MRC_BY_PRESET[simBase.preset_id] ?? DEFAULT_MRC;

  const results: OpcIterResult[] = [];

  // Remove geometric overlaps between add-rects before segmentation.
  // Overlapping rects (e.g. the two arms of an L-corner) produce duplicate
  // sub-segments in the shared region; those sub-segments drift apart over
  // iterations causing visible mask disconnections.
  // Only apply for fresh runs (segmentNm > 0); continue runs receive
  // already-segmented shapes with no overlaps.
  const cleanTarget = segmentNm > 0 ? resolveRectOverlaps(targetShapes) : targetShapes;
  const cleanMask   = segmentNm > 0 ? resolveRectOverlaps(initialMask)  : initialMask;

  // Segmentize both initial mask and target shapes using the same split parameters.
  // Each mask sub-rect pairs 1-to-1 with its corresponding target sub-rect by index,
  // so EPE is always measured against the exact target edge for that strip.
  const segTarget = segmentNm > 0 ? segmentizeShapes(cleanTarget, segmentNm) : cleanTarget;
  let current: MaskShape[] = segmentNm > 0
    ? segmentizeShapes(cleanMask.map((s) => ({ ...s })), segmentNm)
    : cleanMask.map((s) => ({ ...s }));

  // Record original edge coords of each shape at the start of this batch.
  // Used by applyDelta to enforce maxBiasNm per run (not cumulative across batches).
  type EdgeCoords = Record<EdgeName, number>;
  const origEdgeCoords: EdgeCoords[] = current.map((shape) => {
    if (shape.type !== "rect" || shape.op === "subtract") {
      return { left: 0, right: 0, top: 0, bottom: 0 };
    }
    const r = shape as RectShape;
    return {
      left:   r.x_nm,
      right:  r.x_nm + r.w_nm,
      top:    r.y_nm,
      bottom: r.y_nm + r.h_nm,
    };
  });

  // Build a lookup of target rects by index (only add-rects)
  const targetRects = segTarget.filter(
    (s): s is RectShape => s.type === "rect" && s.op !== "subtract",
  );

  // Precompute interior-edge topology from TARGET shapes (design intent, never drifts).
  //
  // Why: in continue batches, current starts from OPC-biased shapes.  If a biased
  // strip has moved even a few nm, the 2 nm outward probe in isInteriorEdge() may
  // miss the neighbour and misclassify a junction edge as exterior.  That causes
  // the OPC loop to bias the junction edge outward on subsequent iterations, pulling
  // the two shapes apart and creating the visible mask disconnection.
  //
  // Using the target (unbiased) shapes guarantees that topology is stable across all
  // iterations and all continue batches, regardless of how far the mask has been biased.
  const targetInteriorEdges: Set<EdgeName>[] = targetRects.map((tRect) => {
    const set = new Set<EdgeName>();
    for (const edge of ["left", "right", "top", "bottom"] as EdgeName[]) {
      if (isInteriorEdge(tRect, edge, segTarget)) set.add(edge);
    }
    return set;
  });

  for (let iter = 1; iter <= iterations; iter++) {
    if (signal?.aborted) break;

    const sim = await simulateCustom(simBase, current);
    const contours = sim.contours_nm;

    const allAbsEpes: number[] = [];
    let targetIdx = 0;
    const next: MaskShape[] = current.map((shape, shapeIdx) => {
      // Pass through subtract and polygon shapes unchanged
      if (shape.type !== "rect" || shape.op === "subtract") return shape;

      const maskRect = shape as RectShape;
      const maskIdx = targetIdx;
      const targetRect = targetRects[maskIdx] ?? maskRect;
      const interiorSet = targetInteriorEdges[maskIdx] ?? new Set<EdgeName>();
      targetIdx++;

      let updated = maskRect;

      for (const edge of ["left", "right", "top", "bottom"] as EdgeName[]) {
        // Skip edges that are interior to the boolean union (adjacent sub-rects or L-corner junctions).
        // Topology is fixed from target shapes — safe across all iterations and continue batches.
        if (interiorSet.has(edge)) continue;

        // Per-edge directional search box: only extends outward by maxBiasNm in the
        // edge's outward direction, covering the full feature interior inward.
        // Prevents EPE samples from finding contour points belonging to adjacent features.
        const searchBox = edgeSearchBox(targetRect, edge, mrc.maxBiasNm, mrc.minSpaceNm);

        const { delta: rawDelta, absEpes } = edgeDelta(
          targetRect,
          edge,
          contours,
          gain,
          nSamples,
          searchBox,
        );

        let delta = rawDelta;

        // ── MRC: min-space clamp (outward growth only) ──────────────────────
        // Prevent outward-moving edge from bridging with a nearby distinct shape.
        if (delta > 0) {
          const maxOutward = maxOutwardDeltaForSpace(
            maskRect, edge, current, mrc.minSpaceNm,
          );
          delta = Math.min(delta, maxOutward);
        }

        // ── MRC: max-bias + min-CD clamp (applyDelta) ──────────────────────
        updated = applyDelta(
          updated, edge, delta, mrc, origEdgeCoords[shapeIdx][edge],
        );
        allAbsEpes.push(...absEpes);
      }

      // Snap to manufacturing grid after all edge corrections
      if (mrc.gridNm > 0) updated = snapToGrid(updated, mrc.gridNm);

      // Re-centre about centerXNm if set (prevents sub-pixel asymmetry accumulation).
      // Applied after grid snap so the width is already quantised; only x_nm shifts.
      if (options.centerXNm !== undefined) {
        updated = { ...updated, x_nm: options.centerXNm - updated.w_nm / 2 };
      }

      return updated;
    });

    const epeMeanNm =
      allAbsEpes.length > 0
        ? allAbsEpes.reduce((a, b) => a + b, 0) / allAbsEpes.length
        : 0;
    const epeMaxNm = allAbsEpes.length > 0 ? Math.max(...allAbsEpes) : 0;

    const result: OpcIterResult = { iteration: iter, maskShapes: next, simResult: sim, epeMeanNm, epeMaxNm };
    results.push(result);
    onProgress(result);
    current = next;

    // ── Adaptive gain ────────────────────────────────────────────────────────
    // If EPE increased vs the previous iteration (oscillation detected), reduce
    // gain for the next iteration by 25 %.  This damps staircase overshoot
    // while allowing recovery if the system was just temporarily worse.
    // The gain floor is baseGain / 4 to avoid stalling convergence.
    if (results.length >= 2) {
      const prevEpe = results[results.length - 2].epeMeanNm;
      if (epeMeanNm > prevEpe * 1.02) {
        gain = Math.max(baseGain / 4, gain * 0.75);
      }
    }
  }

  return results;
}
