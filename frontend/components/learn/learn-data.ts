/**
 * Everything the "How OPC works" page shows, derived at runtime from the
 * recorded L-corner run. No number on the page is typed in by hand:
 *
 * - geometry (mask and printed contour per iteration, the target) comes from
 *   lib/marketing-opc-recording.json (nm, y negated), the same paths the
 *   landing figures draw;
 * - iteration means, settings and the intensity field come from
 *   lib/marketing-scenes/l-corner-sequence.json, the hero's recorded sequence;
 * - the ticks are measured here, per iteration, with the simulator's own EPE
 *   rule (epe-measure.ts) on the recorded contours, and cross-checked against
 *   the recorded means.
 */
import sequence from "../../lib/marketing-scenes/l-corner-sequence.json";
import recording from "../../lib/marketing-opc-recording.json";
import epeSamples from "../../lib/marketing-epe-samples.json";
import { MRC_BY_PRESET } from "../../lib/opc-correction";
import { measureEpe, type Point } from "./epe-measure";

/** The 600 nm window around the L, in the recording's coordinates (nm, y negated): the landing's print window. */
export const WINDOW = { x: 182, y: -774, size: 600 } as const;

export const SETTINGS = sequence.settings;
export const FOV_NM = Number(SETTINGS.fovNm);
export const GRID: number = sequence.frames[0].intensity.w;
export const INTENSITY_FILE: string = sequence.intensityFile;

export type Tick = {
  id: string;
  /** Sample point on the target edge (recording coordinates). */
  p: Point;
  /** Where the printed contour crosses the edge normal. */
  q: Point;
  /** Signed EPE in nm: negative = the print falls short of the target. */
  epeNm: number;
};

export type LearnFrame = {
  iteration: number;
  /** Mean |EPE| the run recorded for this iteration. */
  epeMeanNm: number;
  /** The same mean, re-measured here from the recorded contour. */
  measuredMeanNm: number;
  maxAbsNm: number;
  sampleCount: number;
  maskPath: string;
  contourPath: string;
  /** One tick per exposed target edge: the middle of its samples. */
  ticks: Tick[];
  intensity: { offset: number; w: number; h: number; min: number; max: number };
};

const preset = String(SETTINGS.preset);
const mrc = MRC_BY_PRESET[preset] ?? MRC_BY_PRESET.DUV_193_DRY;
const nSamples = Number(SETTINGS.nSamples);
/** The segmented, uncorrected target: request 0 of the run (its rects union to the plain L). */
const targets = sequence.frames[0].maskAddRects;
const middle = Math.floor(nSamples / 2);
const flip = (p: Point): Point => ({ x: p.x, y: -p.y });

export const FRAMES: LearnFrame[] = sequence.frames.map((frame, index) => {
  const measured = measureEpe(targets, frame.contours, {
    nSamples,
    maxBiasNm: mrc.maxBiasNm,
    minSpaceNm: mrc.minSpaceNm,
  });
  const ticks: Tick[] = measured.samples
    .filter((s) => s.index === middle)
    .map((s) => ({ id: `${s.rect}-${s.edge}`, p: flip(s.p), q: flip(s.q), epeNm: s.epeNm }));
  const rec = recording.frames[index];
  return {
    iteration: frame.iteration,
    epeMeanNm: frame.epeMeanNm,
    measuredMeanNm: measured.meanAbsNm,
    maxAbsNm: measured.maxAbsNm,
    sampleCount: measured.samples.length,
    maskPath: rec.mask,
    contourPath: rec.contour,
    ticks,
    intensity: frame.intensity,
  };
});

export const TARGET_PATH: string = recording.target;
export const LAST = FRAMES.length - 1;
export const ITERATIONS = LAST;
export const POINT_COUNT = FRAMES[0].sampleCount;
export const TICKS_SHOWN = FRAMES[0].ticks.length;
export const MEAN_BEFORE = FRAMES[0].epeMeanNm;
export const MEAN_AFTER = FRAMES[LAST].epeMeanNm;
export const MAX_ABS_BEFORE = FRAMES[0].maxAbsNm;
/** The three largest misses before correction, by tick id. */
export const LARGEST: string[] = [...FRAMES[0].ticks]
  .sort((a, b) => Math.abs(b.epeNm) - Math.abs(a.epeNm))
  .slice(0, 3)
  .map((t) => t.id);

export const fmt = (nm: number) => nm.toFixed(1);

export const PROVENANCE =
  `Recorded from a real litopc run · DUV ${SETTINGS.wavelengthNm} nm · L-corner · NA ${SETTINGS.na} · ` +
  `threshold ${SETTINGS.threshold} · ${SETTINGS.fovNm} nm field on a ${SETTINGS.grid} grid · ` +
  `${SETTINGS.segmentNm} nm segments · gain ${SETTINGS.gain} · ${SETTINGS.nSamples} samples per edge`;

export const STEPS = [
  {
    id: 1,
    title: "The mask",
    lead: "A photomask is the pattern we want on the wafer.",
    sub: "This L-shape is the design intent.",
  },
  {
    id: 2,
    title: "The print",
    lead: "Light bends on its way through the lens, so the print is softer than the mask.",
    sub: "Corners round off and line ends pull back.",
  },
  {
    id: 3,
    title: "The miss",
    lead: "Edge placement error, EPE, is how far the printed edge lands from the target.",
    sub: `Measured at ${POINT_COUNT} points · mean ${fmt(MEAN_BEFORE)} nm before correction.`,
  },
  {
    id: 4,
    title: "The fix",
    lead: "OPC moves the mask edges the other way until the print lands on target.",
    sub: `${ITERATIONS} iterations · ${fmt(MEAN_BEFORE)} → ${fmt(MEAN_AFTER)} nm mean EPE.`,
  },
] as const;

/* ── colour ─────────────────────────────────────────────────────────────── */

/** The 3D view's "apple" colormap by intensity 0..1 (the light field). */
export const SPECTRUM: Array<[number, string]> = [
  [0, "#0e141e"],
  [0.22, "#27436c"],
  [0.45, "#5e5ce6"],
  [0.68, "#bf5af2"],
  [0.86, "#ff453a"],
  [1, "#ffd60a"],
];

/**
 * Tick colour by |EPE| / largest miss: the spectrum's three accents, starting
 * from the target grey (a tick on target cools to grey). The near-black and
 * navy low stops would vanish on the dark stage and the yellow top on the
 * white one, so a miss runs grey → indigo → purple → red (the largest miss).
 */
export const TICK_SPECTRUM: Array<[number, string]> = [
  [0, "#9a9a9a"],
  [0.3, "#5e5ce6"],
  [0.65, "#bf5af2"],
  [1, "#ff453a"],
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function sampleStops(stops: Array<[number, string]>, t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  let a = 0;
  while (a < stops.length - 2 && v > stops[a + 1][0]) a++;
  const [t0, c0] = stops[a];
  const [t1, c1] = stops[a + 1];
  const u = t1 > t0 ? (v - t0) / (t1 - t0) : 0;
  const lo = hexToRgb(c0);
  const hi = hexToRgb(c1);
  return [lo[0] + (hi[0] - lo[0]) * u, lo[1] + (hi[1] - lo[1]) * u, lo[2] + (hi[2] - lo[2]) * u];
}

export function tickColor(absNm: number): string {
  const [r, g, b] = sampleStops(TICK_SPECTRUM, absNm / MAX_ABS_BEFORE);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export const TICK_GRADIENT = `linear-gradient(90deg, ${TICK_SPECTRUM.map(([o, c]) => `${c} ${o * 100}%`).join(", ")})`;

/* ── consistency checks (development only) ───────────────────────────────── */
if (process.env.NODE_ENV !== "production") {
  FRAMES.forEach((f, i) => {
    if (recording.frames[i].iteration !== f.iteration) {
      console.warn(`learn: recording frame ${i} is iteration ${recording.frames[i].iteration}, sequence says ${f.iteration}`);
    }
    if (Math.abs(f.measuredMeanNm - f.epeMeanNm) > 1e-3) {
      console.warn(`learn: iteration ${f.iteration} re-measured mean ${f.measuredMeanNm} differs from recorded ${f.epeMeanNm}`);
    }
  });
  if (epeSamples.count !== POINT_COUNT) {
    console.warn(`learn: ${POINT_COUNT} samples measured, the shipped sample file says ${epeSamples.count}`);
  }
}
