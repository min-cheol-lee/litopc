"use client";

/**
 * The recorded correction, limited to the first five iterations: the same run
 * the hero plays. Geometry between recorded steps is a visual tween; reported
 * EPE and iteration numbers are always recorded values.
 */
import { useEffect, useId, useRef, useState } from "react";
import recording from "../../lib/marketing-opc-recording.json";
import { createRecordedPathTween } from "../../lib/marketing-opc-tween";

const LAST = 5;
const frames = recording.frames.slice(0, LAST + 1);
const stepDuration = 950;
const tweens = frames.slice(0, -1).map((frame, index) => ({
  mask: createRecordedPathTween(frame.mask, frames[index + 1].mask),
  contour: createRecordedPathTween(frame.contour, frames[index + 1].contour),
}));
type Layer = "mask" | "contour" | "target";
type Interpolation = { from: number; to: number; progress: number };

function Drawing({
  frame = 0,
  interpolation = null,
  layers,
  label,
}: {
  frame?: number;
  interpolation?: Interpolation | null;
  layers: Record<Layer, boolean>;
  label: string;
}) {
  const current = frames[frame];
  const tween = interpolation ? tweens[interpolation.from] : null;
  const mask = tween && interpolation ? tween.mask.at(interpolation.progress) : current.mask;
  const contour = tween && interpolation ? tween.contour.at(interpolation.progress) : current.contour;
  return (
    <svg className="pa-drawing" viewBox="111 -854 748 748" role="img" aria-label={label}>
      <g data-recorded-frame={frame}>
        {layers.mask && <path className="pa-ln-mask" data-layer="mask" d={mask} />}
      </g>
      {layers.target && <path className="pa-ln-target" data-layer="target" d={recording.target} />}
      <g data-recorded-frame={frame}>
        {layers.contour && <path className="pa-ln-print" data-layer="contour" d={contour} />}
      </g>
    </svg>
  );
}

/** Mean EPE per recorded iteration, with the current step highlighted. */
function EpePlot({ frame }: { frame: number }) {
  const W = 300;
  const H = 180;
  const left = 22;
  const right = 22;
  const top = 26;
  const bottom = 34;
  const max = frames[0].epe;
  const x = (i: number) => left + (i / LAST) * (W - left - right);
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);
  const points = frames.map((f, i) => `${x(i).toFixed(1)},${y(f.epe).toFixed(1)}`).join(" ");
  const area = `M${x(0).toFixed(1)},${(H - bottom).toFixed(1)} L${points.replace(/ /g, " L")} L${x(LAST).toFixed(1)},${(H - bottom).toFixed(1)} Z`;
  return (
    <svg className="pa-epe" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mean edge placement error per iteration, from ${frames[0].epe.toFixed(1)} to ${frames[LAST].epe.toFixed(1)} nanometers`}>
      <defs>
        <linearGradient id="pa-epe-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9cc3ef" stopOpacity="0.28" />
          <stop offset="1" stopColor="#9cc3ef" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pa-epe-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8fd3e8" />
        </linearGradient>
      </defs>
      <line className="pa-epe-axis" x1={left} y1={H - bottom} x2={W - right} y2={H - bottom} />
      <path className="pa-epe-area" d={area} />
      <polyline className="pa-epe-trace" points={points} />
      {frames.map((f, i) => (
        <circle key={i} className="pa-epe-dot" cx={x(i)} cy={y(f.epe)} r={i === frame ? 5 : 2.5} data-active={i === frame || undefined} />
      ))}
      <text className="pa-epe-label" x={x(0)} y={y(frames[0].epe) - 10}>
        {frames[0].epe.toFixed(1)} nm
      </text>
      <text className="pa-epe-label" x={x(LAST)} y={y(frames[LAST].epe) - 10} textAnchor="end">
        {frames[LAST].epe.toFixed(1)} nm
      </text>
      {frames.map((_, i) => (
        <text key={i} className="pa-epe-tick" x={x(i)} y={H - 12} textAnchor="middle">
          {i}
        </text>
      ))}
    </svg>
  );
}

export function ReplayA() {
  const [frame, setFrame] = useState(0);
  const [interpolation, setInterpolation] = useState<Interpolation | null>(null);
  const settled = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [layers, setLayers] = useState({ mask: true, contour: true, target: true });
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const current = frames[frame];
  const canAnimate = playing && visible && pageVisible && !reducedMotion;
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motion.matches);
    setPlaying(!motion.matches);
    const onMotion = () => {
      setReducedMotion(motion.matches);
      if (motion.matches) {
        setPlaying(false);
        setInterpolation(null);
      }
    };
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    const observer = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), { threshold: 0.2 });
    if (root.current) observer.observe(root.current);
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  useEffect(() => {
    if (!playing || !visible || !pageVisible) {
      setInterpolation(null);
      return;
    }
    let request = 0;
    let started: number | null = null;
    let completed = settled.current;
    let phase: "initial" | "step" | "final" = completed === 0 ? "initial" : completed === LAST ? "final" : "step";
    const settle = (step: number) => {
      completed = step;
      settled.current = step;
      setFrame(step);
      setInterpolation(null);
    };
    const advance = (now: number) => {
      if (started === null) started = now;
      const elapsed = now - started;
      if (phase === "initial") {
        if (elapsed >= 1400) {
          phase = "step";
          started = now;
        }
      } else if (phase === "final") {
        if (elapsed >= 3200) {
          settle(0);
          phase = "initial";
          started = now;
        }
      } else {
        const progress = Math.min(1, elapsed / stepDuration);
        if (progress >= 1) {
          settle(completed + 1);
          phase = completed === LAST ? "final" : "step";
          started = now;
        } else if (!reducedMotion) {
          setInterpolation({ from: completed, to: completed + 1, progress });
        }
      }
      request = window.requestAnimationFrame(advance);
    };
    request = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(request);
  }, [playing, visible, pageVisible, reducedMotion]);
  const toggle = (layer: Layer) => setLayers((value) => ({ ...value, [layer]: !value[layer] }));
  return (
    <figure
      className="pa-replay"
      id="correction"
      ref={root}
      aria-label="Recorded mask correction, five iterations"
      data-frame={frame}
      data-transitioning={(canAnimate && interpolation !== null) || undefined}
    >
      <div className="pa-replay-row">
        <div className="pa-panel pa-replay-panel">
          <span className="pa-panel-label">Before</span>
          <Drawing layers={layers} label="Before correction: the printed contour falls inside the target" />
          <span className="pa-replay-value">
            {frames[0].epe.toFixed(1)}<small>nm</small>
          </span>
        </div>
        <div className="pa-panel pa-panel-lit pa-replay-panel">
          <span className="pa-panel-label">
            Iteration {frame} <span>of {LAST}</span>
          </span>
          <Drawing frame={frame} interpolation={canAnimate ? interpolation : null} layers={layers} label={`Correction iteration ${frame}: recorded mask, contour and fixed target`} />
          <span className="pa-replay-value" aria-live={playing ? "off" : "polite"}>
            {current.epe.toFixed(1)}<small>nm</small>
          </span>
        </div>
        <div className="pa-panel pa-replay-panel pa-replay-plot">
          <span className="pa-panel-label">Mean edge placement error</span>
          <EpePlot frame={frame} />
          <span className="pa-replay-plot-note">nm per iteration</span>
        </div>
      </div>
      <div className="pa-replay-bar">
        <button
          className="pa-play"
          type="button"
          aria-label={playing ? "Pause correction animation" : "Play correction animation"}
          onClick={() => {
            setInterpolation(null);
            setPlaying(!playing);
          }}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 3h3v10H4zM9 3h3v10H9z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 3l8 5-8 5z" />
            </svg>
          )}
        </button>
        <label className="pa-scrub" htmlFor={`${id}-step`}>
          <span className="pa-visually-hidden">Correction iteration</span>
          <input
            id={`${id}-step`}
            type="range"
            min="0"
            max={LAST}
            step="1"
            value={frame}
            style={{ "--pa-fill": `${(frame / LAST) * 100}%` } as React.CSSProperties}
            onChange={(event) => {
              setPlaying(false);
              setInterpolation(null);
              const step = Number(event.target.value);
              settled.current = step;
              setFrame(step);
            }}
          />
        </label>
        <div className="pa-keys" role="group" aria-label="Visible layers">
          {(["mask", "target", "contour"] as Layer[]).map((layer) => (
            <button type="button" key={layer} aria-pressed={layers[layer]} onClick={() => toggle(layer)}>
              <i className={`pa-key pa-key-${layer}`} aria-hidden="true" />
              {layer === "contour" ? "Print" : layer[0].toUpperCase() + layer.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <figcaption className="pa-replay-caption">
        Recorded in litopc · DUV 193 nm · NA 0.93 · threshold 0.5. Animated between recorded steps; values are recorded results.
      </figcaption>
    </figure>
  );
}
