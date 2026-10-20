export interface Point {
  x: number;
  y: number;
}

const EPE_STOPS = [
  [140, 201, 174], // 0 nm: #8cc9ae
  [224, 185, 118], // 6 nm: #e0b976
  [227, 119, 102], // 12 nm: #e37766
] as const;

/** Shared sRGB measurement scale; negative/NaN values use zero and 12+ nm saturates. */
export function getEpeColor(distNm: number): [number, number, number] {
  const distance = Number.isNaN(distNm) ? 0 : Math.max(0, Math.min(12, distNm));
  const index = distance <= 6 ? 0 : 1;
  const weight = (distance - index * 6) / 6;
  const start = EPE_STOPS[index];
  const end = EPE_STOPS[index + 1];
  return start.map((value, channel) => Math.round(value + (end[channel] - value) * weight)) as [number, number, number];
}

function isFinitePoint(point: Point | null | undefined): point is Point {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

/** Closest point on independent closed target boundaries, including degenerate points. */
export function nearestTargetPoint(
  point: Point,
  contours: Array<{ points_nm: Point[] }>,
): { point: Point; dist: number } | null {
  if (!isFinitePoint(point)) return null;
  let nearest: { point: Point; dist: number } | null = null;

  const consider = (candidate: Point) => {
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (Number.isFinite(distance) && (!nearest || distance < nearest.dist)) {
      nearest = { point: candidate, dist: distance };
    }
  };

  for (const contour of contours) {
    const points = contour.points_nm.filter(isFinitePoint);
    for (let index = 0; index < points.length; index++) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (!Number.isFinite(length) || length === 0) {
        consider({ x: start.x, y: start.y });
        continue;
      }
      const ux = dx / length;
      const uy = dy / length;
      const along = (point.x - start.x) * ux + (point.y - start.y) * uy;
      const projection = Math.max(0, Math.min(length, along));
      consider({ x: start.x + ux * projection, y: start.y + uy * projection });
    }
  }

  return nearest;
}
