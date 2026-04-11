/**
 * OPC auto-correction GIF exporter
 * Renders each OPC iteration to canvas and encodes an animated GIF with
 * crossfade transitions, aerial image, mask/contour overlays, and EPE chart.
 */

import type { OpcIterResult } from "./opc-correction";
import type { MaskShape } from "./types";

// ── Canvas layout ─────────────────────────────────────────────────────────────
const CANVAS_W = 600;
const TOP_H    = 44;
const SIM_PAD  = 20;
const SIM_SIZE = CANVAS_W - 2 * SIM_PAD; // 560
const BOT_H    = 96;
const CANVAS_H = TOP_H + SIM_SIZE + BOT_H; // 700

// ── Viridis colormap (9-stop) ────────────────────────────────────────────────
const VIRIDIS_STOPS: [number, number, number][] = [
  [68,  1,   84],
  [71,  44, 122],
  [59,  81, 139],
  [44, 113, 142],
  [33, 144, 141],
  [39, 173, 129],
  [92, 200,  99],
  [190,229,  48],
  [253,231,  37],
];

function viridis(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (VIRIDIS_STOPS.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, VIRIDIS_STOPS.length - 1);
  const f  = idx - lo;
  const a  = VIRIDIS_STOPS[lo];
  const b  = VIRIDIS_STOPS[hi];
  return [
    Math.round(a[0] + f * (b[0] - a[0])),
    Math.round(a[1] + f * (b[1] - a[1])),
    Math.round(a[2] + f * (b[2] - a[2])),
  ];
}

// ── Coordinate helpers ────────────────────────────────────────────────────────
function makeCoordHelpers(fovNm: number) {
  const simX = SIM_PAD;
  const simY = TOP_H;
  return {
    // nm → canvas pixel, y-flipped (nm y-axis goes up, canvas goes down)
    cx: (xNm: number) => simX + (xNm / fovNm) * SIM_SIZE,
    cy: (yNm: number) => simY + (1 - yNm / fovNm) * SIM_SIZE,
  };
}

// ── Draw mask shapes ──────────────────────────────────────────────────────────
function drawShapes(
  ctx: CanvasRenderingContext2D,
  shapes: MaskShape[],
  fovNm: number,
  fillColor: string,
  strokeColor: string,
  lineWidth = 1.5,
  dash: number[] = [],
) {
  const { cx, cy } = makeCoordHelpers(fovNm);
  ctx.save();
  ctx.setLineDash(dash);
  ctx.lineWidth = lineWidth;
  for (const shape of shapes) {
    if (shape.op === "subtract") continue;
    ctx.beginPath();
    if (shape.type === "rect") {
      const { x_nm, y_nm, w_nm, h_nm } = shape;
      const px = cx(x_nm);
      const py = cy(y_nm + h_nm);
      const pw = (w_nm / fovNm) * SIM_SIZE;
      const ph = (h_nm / fovNm) * SIM_SIZE;
      ctx.rect(px, py, pw, ph);
    } else {
      const pts = shape.points_nm;
      if (pts.length < 2) continue;
      ctx.moveTo(cx(pts[0].x_nm), cy(pts[0].y_nm));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(cx(pts[i].x_nm), cy(pts[i].y_nm));
      ctx.closePath();
    }
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
  ctx.restore();
}

// ── Render one frame ──────────────────────────────────────────────────────────
function renderFrame(
  iter: OpcIterResult | null,   // null = "Design Intent" initial frame
  targetShapes: MaskShape[],
  epeHistory: number[],         // EPE values for all displayed iterations
  fovNm: number,
  opts: {
    iterLabel: string;
    presetLabel: string;
    isFinal: boolean;
  },
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;

  // ── Background ────────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bgGrad.addColorStop(0, "#091522");
  bgGrad.addColorStop(1, "#050c16");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Top bar ───────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, CANVAS_W, TOP_H);

  // Wordmark
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillStyle = "rgba(180, 210, 255, 0.95)";
  ctx.textAlign = "left";
  ctx.fillText("litopc", 16, 28);

  // Preset (center)
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillStyle = "rgba(130, 165, 210, 0.7)";
  ctx.textAlign = "center";
  ctx.fillText(opts.presetLabel, CANVAS_W / 2, 28);

  // Iter label (right)
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = opts.isFinal
    ? "rgba(80, 230, 120, 0.95)"
    : iter === null
    ? "rgba(150, 200, 255, 0.75)"
    : "rgba(200, 220, 255, 0.9)";
  ctx.textAlign = "right";
  ctx.fillText(opts.iterLabel, CANVAS_W - 16, 28);
  ctx.textAlign = "left";

  // Subtle separator line
  ctx.strokeStyle = "rgba(100, 140, 200, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, TOP_H);
  ctx.lineTo(CANVAS_W, TOP_H);
  ctx.stroke();

  // ── Sim area background ───────────────────────────────────────────────────
  ctx.fillStyle = "#060f1c";
  ctx.fillRect(SIM_PAD, TOP_H, SIM_SIZE, SIM_SIZE);

  // ── Aerial image ──────────────────────────────────────────────────────────
  if (iter?.simResult?.intensity) {
    const { w, h, data, vmin, vmax } = iter.simResult.intensity;
    const span = Math.max(vmax - vmin, 1e-9);

    const offC = document.createElement("canvas");
    offC.width = w; offC.height = h;
    const offCtx = offC.getContext("2d")!;
    const imgData = offCtx.createImageData(w, h);
    for (let i = 0; i < data.length; i++) {
      const t = Math.max(0, Math.min(1, (data[i] - vmin) / span));
      const [r, g, b] = viridis(t);
      const alpha = t < 0.07
        ? 0
        : Math.min(255, Math.round(Math.pow((t - 0.07) / 0.93, 1.5) * 235 + 20));
      imgData.data[i * 4]     = r;
      imgData.data[i * 4 + 1] = g;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = alpha;
    }
    offCtx.putImageData(imgData, 0, 0);
    // Draw with y-flip (aerial image is flipped relative to nm coords)
    ctx.save();
    ctx.translate(SIM_PAD, TOP_H + SIM_SIZE);
    ctx.scale(SIM_SIZE / w, -SIM_SIZE / h);
    ctx.drawImage(offC, 0, 0);
    ctx.restore();
  }

  // ── Subtle vignette over sim area ─────────────────────────────────────────
  const vgGrad = ctx.createRadialGradient(
    CANVAS_W / 2, TOP_H + SIM_SIZE / 2, SIM_SIZE * 0.28,
    CANVAS_W / 2, TOP_H + SIM_SIZE / 2, SIM_SIZE * 0.72,
  );
  vgGrad.addColorStop(0, "rgba(0,0,0,0)");
  vgGrad.addColorStop(1, "rgba(5,12,22,0.55)");
  ctx.fillStyle = vgGrad;
  ctx.fillRect(SIM_PAD, TOP_H, SIM_SIZE, SIM_SIZE);

  // ── Target shapes — dashed green ──────────────────────────────────────────
  drawShapes(
    ctx, targetShapes, fovNm,
    "rgba(60, 220, 100, 0.08)",
    "rgba(60, 220, 100, 0.75)",
    1.5, [6, 5],
  );

  // ── Mask shapes — pink/magenta ────────────────────────────────────────────
  if (iter) {
    drawShapes(
      ctx, iter.maskShapes, fovNm,
      "rgba(220, 65, 105, 0.32)",
      "rgba(255, 100, 140, 0.88)",
      1.8,
    );
  }

  // ── Simulation contours — cyan ────────────────────────────────────────────
  if (iter?.simResult?.contours_nm?.length) {
    const { cx, cy } = makeCoordHelpers(fovNm);
    ctx.save();
    ctx.strokeStyle = "rgba(80, 215, 255, 0.92)";
    ctx.lineWidth = 2.0;
    ctx.lineJoin = "round";
    for (const contour of iter.simResult.contours_nm) {
      const pts = contour.points_nm;
      if (pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(cx(pts[0].x), cy(pts[0].y));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(cx(pts[i].x), cy(pts[i].y));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Bottom bar ────────────────────────────────────────────────────────────
  const botY = TOP_H + SIM_SIZE;

  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, botY, CANVAS_W, BOT_H);

  // Separator
  ctx.strokeStyle = "rgba(100, 140, 200, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, botY);
  ctx.lineTo(CANVAS_W, botY);
  ctx.stroke();

  // EPE section label
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillStyle = "rgba(120, 160, 210, 0.65)";
  ctx.textAlign = "left";
  ctx.fillText("EPE (nm)", 16, botY + 15);

  // ── EPE bar chart (left side) ─────────────────────────────────────────────
  if (epeHistory.length > 0) {
    const maxEpe  = Math.max(...epeHistory, 1);
    const barW    = Math.min(28, Math.floor((CANVAS_W * 0.6 - 16) / epeHistory.length) - 4);
    const barMaxH = 52;
    const barGap  = Math.max(2, barW * 0.18);
    const baseX   = 16;
    const baseY   = botY + BOT_H - 12;

    for (let i = 0; i < epeHistory.length; i++) {
      const epe   = epeHistory[i];
      const barH  = Math.max(3, (epe / maxEpe) * barMaxH);
      const bx    = baseX + i * (barW + barGap);
      const by    = baseY - barH;
      const isLatest = i === epeHistory.length - 1;
      const improved = i > 0 && epe < epeHistory[i - 1];

      // Bar glow for latest
      if (isLatest) {
        const glowGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
        glowGrad.addColorStop(0, opts.isFinal ? "rgba(80,230,130,0.95)" : "rgba(80,190,255,0.95)");
        glowGrad.addColorStop(1, opts.isFinal ? "rgba(40,160,90,0.6)"  : "rgba(40,120,200,0.5)");
        ctx.fillStyle = glowGrad;
      } else if (improved) {
        ctx.fillStyle = "rgba(80, 200, 100, 0.65)";
      } else {
        ctx.fillStyle = "rgba(180, 80, 90, 0.65)";
      }
      ctx.fillRect(bx, by, barW, barH);

      // Iter number below bar
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillStyle = "rgba(140, 170, 210, 0.65)";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, bx + barW / 2, baseY + 11);
      ctx.textAlign = "left";

      // EPE value above bar
      ctx.font = "8px 'Courier New', monospace";
      ctx.fillStyle = isLatest ? "rgba(200, 230, 255, 0.9)" : "rgba(140, 170, 210, 0.6)";
      ctx.textAlign = "center";
      ctx.fillText(epe.toFixed(1), bx + barW / 2, by - 3);
      ctx.textAlign = "left";
    }
  }

  // ── Current EPE readout (right side) ─────────────────────────────────────
  if (iter) {
    const epe = iter.epeMeanNm;
    const epeColor = epe < 5 ? "#4ade80" : epe < 15 ? "#fbbf24" : "#f87171";

    ctx.font = "bold 28px 'Courier New', monospace";
    ctx.fillStyle = epeColor;
    ctx.textAlign = "right";
    ctx.fillText(`${epe.toFixed(1)}`, CANVAS_W - 16, botY + 52);

    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "rgba(140, 170, 210, 0.6)";
    ctx.fillText("nm mean EPE", CANVAS_W - 16, botY + 68);

    // OPC COMPLETE badge on final frame
    if (opts.isFinal) {
      const badgeW = 120;
      const badgeH = 22;
      const badgeX = CANVAS_W - 16 - badgeW;
      const badgeY = botY + 74;
      ctx.fillStyle = "rgba(40, 200, 100, 0.2)";
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(60, 220, 110, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = "bold 10px 'Courier New', monospace";
      ctx.fillStyle = "rgba(80, 240, 130, 0.9)";
      ctx.textAlign = "center";
      ctx.fillText("OPC COMPLETE", badgeX + badgeW / 2, badgeY + 15);
    }
    ctx.textAlign = "left";
  }

  return canvas;
}

// ── Alpha-blend two canvases ──────────────────────────────────────────────────
function blendCanvases(
  a: HTMLCanvasElement,
  b: HTMLCanvasElement,
  alpha: number,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width  = CANVAS_W;
  out.height = CANVAS_H;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(a, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(b, 0, 0);
  ctx.globalAlpha = 1;
  return out;
}

// ── GIF type declarations (minimal) ──────────────────────────────────────────
interface GifInstance {
  addFrame(canvas: HTMLCanvasElement, opts: { delay: number; copy: boolean }): void;
  on(event: "finished", cb: (blob: Blob) => void): void;
  on(event: "error",    cb: (err: unknown) => void): void;
  on(event: "progress", cb: (p: number) => void): void;
  render(): void;
}
interface GifConstructor {
  new(opts: {
    workers: number;
    quality: number;
    width: number;
    height: number;
    workerScript: string;
    repeat: number;
  }): GifInstance;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface OpcGifOptions {
  fovNm:        number;
  presetLabel?: string;
  onProgress?:  (pct: number) => void;
}

export async function exportOpcGif(
  opcProgress: OpcIterResult[],
  targetShapes: MaskShape[],
  opts: OpcGifOptions,
): Promise<void> {
  if (opcProgress.length === 0) return;

  // Dynamic import — client-side only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GifLib = (await import("gif.js" as any)).default as GifConstructor;

  const gif = new GifLib({
    workers:      2,
    quality:      8,      // lower = better quality, slower
    width:        CANVAS_W,
    height:       CANVAS_H,
    workerScript: "/gif.worker.js",
    repeat:       0,      // loop forever
  });

  if (opts.onProgress) {
    gif.on("progress", (p: number) => opts.onProgress!(Math.round(p * 100)));
  }

  const presetLabel = opts.presetLabel ?? "";
  const fovNm       = opts.fovNm;

  const HOLD_INITIAL_MS = 900;
  const HOLD_ITER_MS    = 500;
  const HOLD_FINAL_MS   = 2000;
  const FADE_STEPS      = 10;
  const FADE_STEP_MS    = 50;

  const addFrame = (canvas: HTMLCanvasElement, delay: number) => {
    gif.addFrame(canvas, { delay, copy: true });
  };

  // ── Initial "Design Intent" frame ─────────────────────────────────────────
  const initialCanvas = renderFrame(null, targetShapes, [], fovNm, {
    iterLabel: "Design Intent",
    presetLabel,
    isFinal: false,
  });
  addFrame(initialCanvas, HOLD_INITIAL_MS);

  let prevCanvas = initialCanvas;

  // ── Per-iteration frames ──────────────────────────────────────────────────
  for (let i = 0; i < opcProgress.length; i++) {
    const iter    = opcProgress[i];
    const isFinal = i === opcProgress.length - 1;
    const epeHistory = opcProgress.slice(0, i + 1).map(r => r.epeMeanNm);

    const iterCanvas = renderFrame(iter, targetShapes, epeHistory, fovNm, {
      iterLabel: `Iter ${iter.iteration}${isFinal ? " ✓" : ""}`,
      presetLabel,
      isFinal,
    });

    // Crossfade from previous frame
    for (let f = 1; f <= FADE_STEPS; f++) {
      const alpha = f / FADE_STEPS;
      // Ease-in-out curve for smoother feel
      const eased = alpha < 0.5
        ? 2 * alpha * alpha
        : 1 - Math.pow(-2 * alpha + 2, 2) / 2;
      addFrame(blendCanvases(prevCanvas, iterCanvas, eased), FADE_STEP_MS);
    }

    // Hold on this iteration
    const holdMs = isFinal ? HOLD_FINAL_MS : HOLD_ITER_MS;
    addFrame(iterCanvas, holdMs);
    prevCanvas = iterCanvas;
  }

  // ── Encode & download ─────────────────────────────────────────────────────
  return new Promise<void>((resolve, reject) => {
    gif.on("finished", (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `litopc-opc-${Date.now()}.gif`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
      resolve();
    });
    gif.on("error", reject);
    gif.render();
  });
}
