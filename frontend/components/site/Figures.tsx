import geometry from "../../lib/marketing-simulation.json";
import recording from "../../lib/marketing-opc-recording.json";
import epeSamples from "../../lib/marketing-epe-samples.json";
import custom from "../../lib/marketing-custom-run.json";

/** A 940 nm window centered on the pattern (center 485, 480 nm): shapes read about 17% larger than the full field, centered. */
const WINDOW = "15 -950 940 940";

/** Mask, aerial image and printed contour of the same uncorrected L, in the same window. */
export function SimulationFigure() {
  return (
    <figure className="pa-trio" aria-label="Mask, simulated aerial image and printed contour of the same pattern">
      <div className="pa-panel">
        <svg viewBox={WINDOW} role="img" aria-label="Binary mask of the uncorrected L-shaped pattern">
          <path className="pa-ln-mask" d={geometry.before.mask} />
        </svg>
        <span>Mask</span>
      </div>
      <div className="pa-panel pa-panel-lit">
        <div className="pa-raster">
          {/* Rendered for this window by _tools/render-light-fields.py from the recorded field of the same run */}
          <img className="pa-raster-window" src="/marketing/review/aerial-field-light.webp" alt="Simulated aerial image of the same mask under DUV 193 nm" width="760" height="760" loading="lazy" />
        </div>
        <span>Aerial image</span>
      </div>
      <div className="pa-panel">
        <svg viewBox={WINDOW} role="img" aria-label="Printed contour of the same mask against the dashed target">
          <path className="pa-ln-target" d={geometry.before.target} />
          <path className="pa-ln-print" d={geometry.before.contour} />
        </svg>
        <span>Printed contour</span>
      </div>
    </figure>
  );
}

/** 600 nm around the L; the light-field images are rendered for exactly this window. */
const PRINT_WINDOW = { x: 182, y: -774, size: 600 };

/**
 * One recorded iteration of the L-corner run on a white field: the light that reaches the wafer
 * (recorded intensity in the 3D view's colormap), the mask, the fixed target and the printed contour.
 * With `showMisses`, litopc's own edge placement measurements for iteration 0, one per target edge.
 */
export function RecordedPrint({ iteration, showMisses = false, label }: { iteration: 0 | 5; showMisses?: boolean; label: string }) {
  const frame = recording.frames[iteration];
  const { x, y, size } = PRINT_WINDOW;
  return (
    <svg className="pa-print" viewBox={`${x} ${y} ${size} ${size}`} role="img" aria-label={label}>
      {/* Mask fill under the light, its edge over it, so the light keeps one hue inside and outside the mask */}
      <path className="pa-ln-mask pa-ln-mask-fill" d={frame.mask} />
      <image href={`/marketing/review/l-corner-light-${iteration}.webp`} x={x} y={y} width={size} height={size} />
      <path className="pa-ln-mask pa-ln-mask-edge" d={frame.mask} />
      <path className="pa-ln-target" d={recording.target} />
      <path className="pa-ln-print" d={frame.contour} />
      {showMisses &&
        iteration === 0 &&
        epeSamples.samples.map(({ p, q }) => (
          <g key={`${p[0]},${p[1]}`} className="pa-miss">
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />
            <circle cx={p[0]} cy={p[1]} r="3" />
          </g>
        ))}
    </svg>
  );
}

/**
 * A mask drawn by hand, not picked from the library: three rectangles, simulated and corrected
 * with the same code the simulator runs (lib/marketing-custom-run.json, images rendered from its
 * recorded light). Three panels: what was drawn, what printed, what the correction made of it.
 */
export function CustomFigure() {
  const { x, y, size } = custom.window;
  const view = `${x} ${-(y + size)} ${size} ${size}`;
  const [before, after] = custom.frames;
  return (
    <figure className="pa-trio pa-custom" aria-label="A custom mask: drawn from three rectangles, its print, and its corrected mask">
      <div className="pa-panel">
        <svg className="pa-print" viewBox={view} role="img" aria-label="Three rectangles drawn as a mask: a pad with a notch and a line ending next to it">
          {/* Each rectangle on its own, so the three the user drew stay visible as three */}
          {custom.targetRectPaths.map((d, i) => (
            <path key={i} className="pa-ln-mask" d={d} />
          ))}
          {custom.targetRects.map((r, i) => (
            <g key={i} className="pa-custom-tag" transform={`translate(${r.x + r.w / 2} ${r.y + r.h / 2})`}>
              <circle r="30" />
              <text dy="0.36em">{i + 1}</text>
            </g>
          ))}
        </svg>
        <span>Drawn, 3 rectangles</span>
      </div>
      <div className="pa-panel pa-panel-lit">
        <svg className="pa-print" viewBox={view} role="img" aria-label="The simulated print of the drawn mask: the light on the wafer and the printed outline against the dashed target">
          <path className="pa-ln-mask pa-ln-mask-fill" d={before.mask} />
          <image href="/marketing/review/custom-light-0.webp" x={x} y={-(y + size)} width={size} height={size} />
          <path className="pa-ln-mask pa-ln-mask-edge" d={before.mask} />
          <path className="pa-ln-target" d={custom.target} />
          <path className="pa-ln-print" d={before.contour} />
        </svg>
        <span>Printed</span>
      </div>
      <div className="pa-panel pa-panel-lit">
        <svg className="pa-print" viewBox={view} role="img" aria-label={`The mask after ${after.iteration} rounds of correction, now ${after.maskRects} small rectangles, and its print on the target`}>
          <path className="pa-ln-mask pa-ln-mask-fill" d={after.mask} />
          <image href={`/marketing/review/custom-light-${after.iteration}.webp`} x={x} y={-(y + size)} width={size} height={size} />
          <path className="pa-ln-mask pa-ln-mask-edge" d={after.mask} />
          <path className="pa-ln-target" d={custom.target} />
          <path className="pa-ln-print" d={after.contour} />
        </svg>
        <span>Corrected, {after.iteration} rounds</span>
      </div>
    </figure>
  );
}
