type Point = { x: number; y: number };

export type RecordedPathTween = {
  at: (progress: number) => string;
};

/** These recordings contain one closed, absolute M/L polygon per layer. */
function readRecordedPolygon(path: string): Point[] {
  const commands = path.match(/[a-df-z]/gi) ?? [];
  if (
    commands[0] !== "M" ||
    commands[commands.length - 1] !== "Z" ||
    commands.filter((command) => command === "M").length !== 1 ||
    commands.some((command) => !["M", "L", "Z"].includes(command))
  ) {
    throw new Error("Recorded path tween requires one closed M/L polygon.");
  }
  const points = Array.from(
    path.matchAll(/[ML]\s*([-+\d.eE]+)[\s,]+([-+\d.eE]+)/g),
    (match) => ({ x: Number(match[1]), y: Number(match[2]) }),
  ).filter(
    (point, index, all) =>
      index === 0 ||
      Math.hypot(point.x - all[index - 1].x, point.y - all[index - 1].y) > 1e-8,
  );
  const first = points[0];
  const final = points[points.length - 1];
  if (
    points.length < 3 ||
    points.some((point) => !Number.isFinite(point.x + point.y))
  ) {
    throw new Error("Recorded polygon has invalid points.");
  }
  if (first.x === final.x && first.y === final.y) points.pop();

  // A shared winding and the leftmost lower corner anchor prevent a cyclic
  // SVG start-index change from turning into an apparent rotation.
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  if (area < 0) points.reverse();
  let anchor = 0;
  points.forEach((point, index) => {
    const current = points[anchor];
    if (point.x < current.x || (point.x === current.x && point.y > current.y)) {
      anchor = index;
    }
  });
  return [...points.slice(anchor), ...points.slice(0, anchor)];
}

function measurePolygon(points: Point[]) {
  const distances = [0];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    distances.push(
      distances[index] + Math.hypot(next.x - point.x, next.y - point.y),
    );
  });
  const perimeter = distances[distances.length - 1];
  const knots = distances.map((distance) => distance / perimeter);
  return { points, knots };
}

function pointAt(
  polygon: ReturnType<typeof measurePolygon>,
  position: number,
): Point {
  const { points, knots } = polygon;
  if (position >= 1) return points[0];
  let edge = 0;
  while (edge < points.length - 1 && knots[edge + 1] < position) edge++;
  const a = points[edge];
  const b = points[(edge + 1) % points.length];
  const edgeLength = knots[edge + 1] - knots[edge];
  const progress = edgeLength > 0 ? (position - knots[edge]) / edgeLength : 0;
  return {
    x: a.x + (b.x - a.x) * progress,
    y: a.y + (b.y - a.y) * progress,
  };
}

/**
 * Geometry-only playback tween, never a simulated or measured intermediate.
 * The union of both polygons' arc-length knots retains every original corner.
 * At a recorded endpoint, return its original path string verbatim.
 */
export function createRecordedPathTween(
  fromPath: string,
  toPath: string,
): RecordedPathTween {
  const from = measurePolygon(readRecordedPolygon(fromPath));
  const to = measurePolygon(readRecordedPolygon(toPath));
  const knots = [...from.knots, ...to.knots]
    .sort((a, b) => a - b)
    .filter(
      (position, index, all) =>
        position < 1 && (index === 0 || position - all[index - 1] > 1e-9),
    );
  const pairs = knots.map((position) => ({
    from: pointAt(from, position),
    to: pointAt(to, position),
  }));
  return {
    at(progress) {
      if (progress <= 0) return fromPath;
      if (progress >= 1) return toPath;
      return (
        pairs
          .map(({ from: a, to: b }, index) => {
            const x = a.x + (b.x - a.x) * progress;
            const y = a.y + (b.y - a.y) * progress;
            return `${index === 0 ? "M" : "L"}${x.toFixed(3)} ${y.toFixed(3)}`;
          })
          .join(" ") + " Z"
      );
    },
  };
}
