/**
 * The light that reached the wafer, per recorded iteration, drawn on a white
 * (or dark) stage. Decodes the hero's intensity file (uint16, 256x256 per
 * frame, sample k at (k + 0.25) * fov/256 nm), resamples the page's 600 nm
 * window bicubically, and colours it with the 3D view's colormap faded to
 * transparent below t = 0.08, exactly like the landing's light-field renders.
 * Blends between two recorded frames are visual mixes of recorded data, never
 * a simulated intermediate.
 */
import { FOV_NM, FRAMES, GRID, INTENSITY_FILE, SPECTRUM, WINDOW, sampleStops } from "./learn-data";

export const LIGHT_PX = 640;
const DELTA = FOV_NM / GRID;
const FADE: [number, number] = [0.08, 0.5];
const OPACITY = 0.78;
const LUT_N = 1024;

type Taps = { index: Int32Array; weight: Float32Array };

/** Catmull-Rom weights for the four samples around a fractional position. */
function cubicWeights(f: number): [number, number, number, number] {
  const f2 = f * f;
  const f3 = f2 * f;
  return [
    -0.5 * f3 + f2 - 0.5 * f,
    1.5 * f3 - 2.5 * f2 + 1,
    -1.5 * f3 + 2 * f2 + 0.5 * f,
    0.5 * f3 - 0.5 * f2,
  ];
}

function buildTaps(n: number, coordAt: (k: number) => number): Taps {
  const index = new Int32Array(n * 4);
  const weight = new Float32Array(n * 4);
  for (let k = 0; k < n; k++) {
    const c = coordAt(k);
    const c0 = Math.floor(c);
    const w = cubicWeights(c - c0);
    for (let t = 0; t < 4; t++) {
      index[k * 4 + t] = Math.max(0, Math.min(GRID - 1, c0 - 1 + t));
      weight[k * 4 + t] = w[t];
    }
  }
  return { index, weight };
}

const COLS = buildTaps(LIGHT_PX, (j) => (WINDOW.x + ((j + 0.5) * WINDOW.size) / LIGHT_PX) / DELTA - 0.25);
/** Screen rows run down the window; the recording's y is negated, so the nm row runs the other way. */
const ROWS = buildTaps(LIGHT_PX, (i) => (-WINDOW.y - ((i + 0.5) * WINDOW.size) / LIGHT_PX) / DELTA - 0.25);

/** Normalised intensity (0..1) of one frame, resampled to the window. */
export function resampleWindow(codes: Uint16Array): Float32Array {
  let rowMin = GRID;
  let rowMax = 0;
  for (let i = 0; i < ROWS.index.length; i++) {
    rowMin = Math.min(rowMin, ROWS.index[i]);
    rowMax = Math.max(rowMax, ROWS.index[i]);
  }
  const rows = rowMax - rowMin + 1;
  const horizontal = new Float32Array(rows * LIGHT_PX);
  for (let r = 0; r < rows; r++) {
    const base = (rowMin + r) * GRID;
    for (let j = 0; j < LIGHT_PX; j++) {
      let v = 0;
      for (let t = 0; t < 4; t++) v += COLS.weight[j * 4 + t] * codes[base + COLS.index[j * 4 + t]];
      horizontal[r * LIGHT_PX + j] = v / 65535;
    }
  }
  const out = new Float32Array(LIGHT_PX * LIGHT_PX);
  for (let i = 0; i < LIGHT_PX; i++) {
    for (let j = 0; j < LIGHT_PX; j++) {
      let v = 0;
      for (let t = 0; t < 4; t++) {
        v += ROWS.weight[i * 4 + t] * horizontal[(ROWS.index[i * 4 + t] - rowMin) * LIGHT_PX + j];
      }
      out[i * LIGHT_PX + j] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
  }
  return out;
}

let cache: Promise<Float32Array[]> | null = null;

/** The window of every recorded iteration, fetched once per page. */
export function loadLightFrames(): Promise<Float32Array[]> {
  if (!cache) {
    cache = fetch(INTENSITY_FILE)
      .then((response) => {
        if (!response.ok) throw new Error(`light field ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) =>
        FRAMES.map((frame) => {
          const count = frame.intensity.w * frame.intensity.h;
          const codes = new Uint16Array(buffer, frame.intensity.offset * count * 2, count);
          return resampleWindow(codes);
        }),
      )
      .catch((error) => {
        cache = null;
        throw error;
      });
  }
  return cache;
}

/** Colormap with the white-page fade, as RGBA bytes. */
export function buildLut(): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(LUT_N * 4);
  for (let k = 0; k < LUT_N; k++) {
    const t = k / (LUT_N - 1);
    const [r, g, b] = sampleStops(SPECTRUM, t);
    const u = Math.max(0, Math.min(1, (t - FADE[0]) / (FADE[1] - FADE[0])));
    lut[k * 4] = r;
    lut[k * 4 + 1] = g;
    lut[k * 4 + 2] = b;
    lut[k * 4 + 3] = u * u * (3 - 2 * u) * OPACITY * 255;
  }
  return lut;
}

/** Paint frame a, or the mix of a and b at weight w, into the image. */
export function paintLight(
  image: ImageData,
  lut: Uint8ClampedArray,
  a: Float32Array,
  b: Float32Array | null,
  w: number,
) {
  const data = image.data;
  const scale = LUT_N - 1;
  for (let i = 0, n = a.length; i < n; i++) {
    const t = b ? a[i] + (b[i] - a[i]) * w : a[i];
    const k = ((t * scale + 0.5) | 0) * 4;
    const o = i * 4;
    data[o] = lut[k];
    data[o + 1] = lut[k + 1];
    data[o + 2] = lut[k + 2];
    data[o + 3] = lut[k + 3];
  }
}
