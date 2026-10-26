/**
 * Edge placement error measurement for the "How OPC works" page.
 *
 * A line-for-line port of the measurement inside lib/opc-correction.ts
 * (sampleEdge, edgeSearchBox, nearestOnContourSegment, nearestOnContours,
 * isInteriorEdge and the measure() closure of runOpcCorrection), which that
 * module does not export. It is applied at runtime to the recorded contours of
 * the L-corner run, so every tick and every mean on the page is measured from
 * recorded data with the simulator's own rule. learn-data.ts checks the result
 * against the recorded means.
 */
export type Rect = { x: number; y: number; w: number; h: number };
export type Contour = { points_nm: Array<{ x: number; y: number }> };
export type EdgeName = "left" | "right" | "top" | "bottom";
export type Point = { x: number; y: number };

export type EpeSample = {
  rect: number;
  edge: EdgeName;
  index: number;
  /** Sample point on the target edge. */
  p: Point;
  /** Nearest printed contour point inside the edge's search box. */
  q: Point;
  /** Outward unit normal of the target edge. */
  n: Point;
  /** Signed EPE along the normal: positive = the print lies outside the target. */
  epeNm: number;
};

export type EpeMeasurement = {
  samples: EpeSample[];
  meanAbsNm: number;
  maxAbsNm: number;
};

type BBox = { x1: number; y1: number; x2: number; y2: number };

const EDGES: EdgeName[] = ["left", "right", "top", "bottom"];

const NORMALS: Record<EdgeName, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

/** N evenly spaced points along one edge, with a 15% margin at each end. */
function sampleEdge(r: Rect, edge: EdgeName, n: number): Array<{ p: Point; n: Point }> {
  const margin = 0.15;
  const normal = NORMALS[edge];
  const out: Array<{ p: Point; n: Point }> = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : margin + (i / (n - 1)) * (1 - 2 * margin);
    let p: Point;
    switch (edge) {
      case "left":
        p = { x: r.x, y: r.y + t * r.h };
        break;
      case "right":
        p = { x: r.x + r.w, y: r.y + t * r.h };
        break;
      case "top":
        p = { x: r.x + t * r.w, y: r.y };
        break;
      default:
        p = { x: r.x + t * r.w, y: r.y + r.h };
    }
    out.push({ p, n: normal });
  }
  return out;
}

/** The contour points one edge may claim: outward by min(maxBias, minSpace/2), the full interior inward. */
function edgeSearchBox(r: Rect, edge: EdgeName, maxBiasNm: number, minSpaceNm: number): BBox {
  const outward = Math.min(maxBiasNm, minSpaceNm / 2);
  const lat = maxBiasNm;
  switch (edge) {
    case "left":
      return { x1: r.x - outward, y1: r.y - lat, x2: r.x + r.w, y2: r.y + r.h + lat };
    case "right":
      return { x1: r.x, y1: r.y - lat, x2: r.x + r.w + outward, y2: r.y + r.h + lat };
    case "top":
      return { x1: r.x - lat, y1: r.y - outward, x2: r.x + r.w + lat, y2: r.y + r.h };
    default:
      return { x1: r.x - lat, y1: r.y, x2: r.x + r.w + lat, y2: r.y + r.h + outward };
  }
}

function nearestOnContourSegment(px: number, py: number, a: Point, b: Point, box: BBox): Point | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (!Number.isFinite(lengthSq) || lengthSq === 0) return null;
  let lo = 0;
  let hi = 1;
  const axes: Array<[number, number, number, number]> = [
    [a.x, dx, box.x1, box.x2],
    [a.y, dy, box.y1, box.y2],
  ];
  for (const [start, delta, minimum, maximum] of axes) {
    if (delta === 0) {
      if (start < minimum || start > maximum) return null;
    } else {
      const first = (minimum - start) / delta;
      const last = (maximum - start) / delta;
      lo = Math.max(lo, Math.min(first, last));
      hi = Math.min(hi, Math.max(first, last));
      if (lo > hi) return null;
    }
  }
  const projection = ((px - a.x) * dx + (py - a.y) * dy) / lengthSq;
  const t = Math.max(lo, Math.min(hi, projection));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function nearestOnContours(px: number, py: number, contours: Contour[], box: BBox): Point | null {
  let bestDist = Infinity;
  let best: Point | null = null;
  const consider = (point: Point) => {
    const distance = Math.hypot(point.x - px, point.y - py);
    if (distance < bestDist) {
      bestDist = distance;
      best = point;
    }
  };
  for (const c of contours) {
    for (let index = 0; index < c.points_nm.length; index++) {
      const pt = c.points_nm[index];
      if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
      if (pt.x >= box.x1 && pt.x <= box.x2 && pt.y >= box.y1 && pt.y <= box.y2) consider(pt);
      const previous = c.points_nm[index - 1];
      if (!previous || !Number.isFinite(previous.x) || !Number.isFinite(previous.y)) continue;
      const nearest = nearestOnContourSegment(px, py, previous, pt, box);
      if (nearest) consider(nearest);
    }
  }
  return best;
}

/** An edge is interior when a 2 nm probe outside each of 3 samples lands inside another rect. */
function isInteriorEdge(rect: Rect, edge: EdgeName, all: Rect[]): boolean {
  const normal = NORMALS[edge];
  let covered = 0;
  for (const { p } of sampleEdge(rect, edge, 3)) {
    const bx = p.x + normal.x * 2;
    const by = p.y + normal.y * 2;
    for (const other of all) {
      if (other === rect) continue;
      if (bx > other.x && bx < other.x + other.w && by > other.y && by < other.y + other.h) {
        covered++;
        break;
      }
    }
  }
  return covered >= 3;
}

/**
 * Measure every exposed edge of the target rects against the printed contours.
 * Throws, like the simulator, when an exposed edge has no measurable contour.
 */
export function measureEpe(
  targets: Rect[],
  contours: Contour[],
  options: { nSamples: number; maxBiasNm: number; minSpaceNm: number },
): EpeMeasurement {
  const samples: EpeSample[] = [];
  targets.forEach((rect, rectIndex) => {
    for (const edge of EDGES) {
      if (isInteriorEdge(rect, edge, targets)) continue;
      const box = edgeSearchBox(rect, edge, options.maxBiasNm, options.minSpaceNm);
      let got = 0;
      sampleEdge(rect, edge, options.nSamples).forEach(({ p, n }, index) => {
        const q = nearestOnContours(p.x, p.y, contours, box);
        if (!q) return;
        const epeNm = (q.x - p.x) * n.x + (q.y - p.y) * n.y;
        samples.push({ rect: rectIndex, edge, index, p, q, n, epeNm });
        got++;
      });
      if (got !== options.nSamples) {
        throw new Error(`EPE: target edge ${rectIndex}/${edge} has no measurable contour.`);
      }
    }
  });
  if (samples.length === 0) throw new Error("EPE: no exposed target edges.");
  let sum = 0;
  let max = 0;
  for (const s of samples) {
    const a = Math.abs(s.epeNm);
    sum += a;
    if (a > max) max = a;
  }
  return { samples, meanAbsNm: sum / samples.length, maxAbsNm: max };
}
