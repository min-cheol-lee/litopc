"use client";

import { useEffect, useId, useRef, useState } from "react";
import recording from "../lib/marketing-opc-recording.json";
import { createRecordedPathTween } from "../lib/marketing-opc-tween";

const initial = recording.frames[0];
const replayStepDuration = 950;
const replayTweens = recording.frames.slice(0, -1).map((frame, index) => ({
  mask: createRecordedPathTween(frame.mask, recording.frames[index + 1].mask),
  contour: createRecordedPathTween(
    frame.contour,
    recording.frames[index + 1].contour,
  ),
}));
type Layer = "mask" | "contour" | "target";
type RecordedInterpolation = { from: number; to: number; progress: number };

export function ProductGallery() {
  const [view, setView] = useState(0);
  const id = useId();
  const views = [
    {
      label: "L-corner",
      src: "/marketing/review/l-corner-rendered.webp",
      alt: "Actual litopc 3D render of a corrected L-shaped mask and its aerial-intensity surface",
    },
    {
      label: "Line / space",
      src: "/marketing/review/optical-surface.webp",
      alt: "Actual litopc export of four parallel mask lines and their aerial-intensity surfaces",
    },
  ];
  return (
    <figure
      className="m-gallery"
      aria-label="Interactive lithography rendering"
    >
      <div
        className="m-gallery-image"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${view}`}
      >
        <img
          key={view}
          src={views[view].src}
          alt={views[view].alt}
          width="2000"
          height="2000"
          fetchPriority="high"
        />
      </div>
      <div className="m-gallery-switch">
        <div role="tablist" aria-label="Model examples">
          {views.map((item, i) => (
            <button
              type="button"
              role="tab"
              key={item.label}
              id={`${id}-${i}`}
              aria-controls={`${id}-panel`}
              aria-selected={i === view}
              aria-label={item.label}
              title={item.label}
              tabIndex={i === view ? 0 : -1}
              onClick={() => setView(i)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? views.length - 1
                      : (i +
                          (event.key === "ArrowLeft" ? -1 : 1) +
                          views.length) %
                        views.length;
                setView(next);
                document.getElementById(`${id}-${next}`)?.focus();
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                {i === 0 ? (
                  <path d="M5 5h14v14h-5v-9H5z" />
                ) : (
                  <path d="M5 4v16M10 4v16M15 4v16M20 4v16" />
                )}
              </svg>
            </button>
          ))}
        </div>
      </div>
    </figure>
  );
}

export function RecordedDrawing({
  frame = 0,
  interpolation = null,
  fullField = false,
  layers = { mask: true, contour: true, target: true },
  label = "Simulated mask, contour and fixed target",
}: {
  frame?: number;
  interpolation?: RecordedInterpolation | null;
  fullField?: boolean;
  layers?: Record<Layer, boolean>;
  label?: string;
}) {
  const current = recording.frames[frame];
  const tween = interpolation ? replayTweens[interpolation.from] : null;
  const mask =
    tween && interpolation
      ? tween.mask.at(interpolation.progress)
      : current.mask;
  const contour =
    tween && interpolation
      ? tween.contour.at(interpolation.progress)
      : current.contour;
  return (
    <svg
      className="m-simulation-drawing"
      viewBox={fullField ? "0 -1100 1100 1100" : recording.viewBox.join(" ")}
      role="img"
      aria-label={label}
    >
      <g
        className="m-recorded-frame m-recorded-frame-current"
        data-recorded-frame={frame}
      >
        {layers.mask && (
          <path className="m-layer-mask" data-layer="mask" d={mask} />
        )}
        {layers.contour && (
          <>
            <path className="m-layer-halo" d={contour} />
            <path
              className="m-layer-contour"
              data-layer="contour"
              d={contour}
            />
          </>
        )}
      </g>
      {layers.target && (
        <>
          <path className="m-layer-target-halo" d={recording.target} />
          <path
            className="m-layer-target"
            data-layer="target"
            d={recording.target}
          />
        </>
      )}
      <g
        className="m-scale-bar"
        transform={
          fullField
            ? "translate(80,-100)"
            : `translate(${recording.scale.x},${recording.scale.y})`
        }
      >
        <path d="M0 -4 V4 M0 0 H100 M100 -4 V4" />
        <text x="0" y="-13">
          100 nm
        </text>
      </g>
    </svg>
  );
}

export function OpcReplay({ compact = false }: { compact?: boolean }) {
  const [frame, setFrame] = useState(0);
  const [interpolation, setInterpolation] =
    useState<RecordedInterpolation | null>(null);
  const settledFrame = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [layers, setLayers] = useState({
    mask: true,
    contour: true,
    target: true,
  });
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const last = recording.frames.length - 1;
  const current = recording.frames[frame];
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
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { threshold: 0.2 },
    );
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
    let completed = settledFrame.current;
    let phase: "initial" | "step" | "final" =
      completed === 0 ? "initial" : completed === last ? "final" : "step";
    const settle = (step: number) => {
      completed = step;
      settledFrame.current = step;
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
        if (elapsed >= 3000) {
          settle(0);
          phase = "initial";
          started = now;
        }
      } else {
        const progress = Math.min(1, elapsed / replayStepDuration);
        if (progress >= 1) {
          settle(completed + 1);
          phase = completed === last ? "final" : "step";
          started = now;
        } else if (!reducedMotion) {
          // Visual geometry between two real results. Reported EPE and the
          // iteration number remain the last completed recorded measurement.
          setInterpolation({
            from: completed,
            to: completed + 1,
            progress,
          });
        }
      }
      request = window.requestAnimationFrame(advance);
    };
    request = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(request);
  }, [playing, visible, pageVisible, reducedMotion, last]);
  const plot = recording.frames
    .map((f, i) => `${15 + i * 23},${67 - (f.epe / initial.epe) * 50}`)
    .join(" ");
  return (
    <figure
      className={`m-replay${compact ? " m-replay-compact" : ""}`}
      id={compact ? "correction" : undefined}
      ref={root}
      aria-label="Recorded mask correction"
      data-frame={frame}
      data-transitioning={(canAnimate && interpolation !== null) || undefined}
      data-visual-progress={
        canAnimate && interpolation
          ? interpolation.progress.toFixed(3)
          : undefined
      }
    >
      <div className="m-replay-pair">
        <div className="m-replay-canvas m-replay-before">
          <span className="m-replay-label">Before correction</span>
          <RecordedDrawing
            layers={layers}
            label="Before correction: the contour falls inside the unchanged target"
          />
          <span className="m-replay-value">
            {initial.epe.toFixed(2)} <small>nm mean EPE</small>
          </span>
        </div>
        <div className="m-replay-canvas m-replay-after">
          <span className="m-replay-label">
            Iteration {String(frame).padStart(2, "0")} <span>/ {last}</span>
          </span>
          <RecordedDrawing
            frame={frame}
            interpolation={canAnimate ? interpolation : null}
            layers={layers}
            label={`Correction iteration ${frame}: actual mask, contour and fixed target`}
          />
          <span
            className="m-replay-value"
            aria-live={playing ? "off" : "polite"}
          >
            {current.epe.toFixed(2)} <small>nm mean EPE</small>
          </span>
        </div>
      </div>
      <div className="m-replay-toolbar">
        <button
          className="m-play-button"
          type="button"
          aria-label={
            playing ? "Pause correction animation" : "Play correction animation"
          }
          onClick={() => {
            setInterpolation(null);
            setPlaying(!playing);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <label className="m-replay-scrub" htmlFor={`${id}-step`}>
          <span>Correction step</span>
          <input
            id={`${id}-step`}
            aria-label="Correction iteration"
            type="range"
            min="0"
            max={last}
            step="1"
            value={frame}
            onChange={(event) => {
              setPlaying(false);
              setInterpolation(null);
              const step = Number(event.target.value);
              settledFrame.current = step;
              setFrame(step);
            }}
          />
        </label>
        {!compact && (
          <svg
            className="m-error-trace"
            viewBox="0 0 260 82"
            role="img"
            aria-label="Mean edge placement error across the recorded iterations"
          >
            <path d="M15 68H248" stroke="currentColor" fill="none" />
            <polyline
              points={plot}
              fill="none"
              stroke="#96baae"
              strokeWidth="1.7"
            />
            <circle
              cx={15 + frame * 23}
              cy={67 - (current.epe / initial.epe) * 50}
              r="3.3"
              fill="#e8eee9"
            />
          </svg>
        )}
      </div>
      <div
        className="m-layer-legend"
        role="group"
        aria-label="Visible correction layers"
      >
        {(["mask", "contour", "target"] as Layer[]).map((layer) => (
          <button
            type="button"
            key={layer}
            aria-pressed={layers[layer]}
            onClick={() =>
              setLayers((value) => ({ ...value, [layer]: !value[layer] }))
            }
          >
            <span className={`m-swatch m-swatch-${layer}`} aria-hidden="true" />
            {layer[0].toUpperCase() + layer.slice(1)}
          </button>
        ))}
      </div>
      <figcaption className="m-replay-caption">
        <div className="m-recording-specs">
          <span className="m-caption-label">
            <i aria-hidden="true" />
            Recorded in litopc
          </span>
          <span>DUV 193 nm</span>
          <span>NA 0.93</span>
          <span>Threshold 0.5</span>
          <span>512² grid</span>
        </div>
        <p>
          Animated between recorded steps. EPE values are recorded results.
          {!compact && " Results depend on the pattern and settings."}
        </p>
      </figcaption>
    </figure>
  );
}
