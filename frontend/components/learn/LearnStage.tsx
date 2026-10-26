"use client";

/**
 * The stage of the "How OPC works" page: one recorded L-corner run, drawn
 * step by step. Steps 1-3 build the picture up (mask, light and print, the
 * misses); step 4 replays the recorded correction iteration by iteration,
 * morphing mask and contour between recorded states (geometry-only tweens),
 * blending the recorded light fields, and shrinking the measured ticks.
 * Everything animated here is written straight to the DOM from one
 * renderPos(position) function so React only re-renders on whole iterations.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createRecordedPathTween } from "../../lib/marketing-opc-tween";
import type { HeroActions, HeroState } from "../MarketingHero3D";
import {
  FRAMES,
  LARGEST,
  LAST,
  MAX_ABS_BEFORE,
  MEAN_BEFORE,
  POINT_COUNT,
  TARGET_PATH,
  TICKS_SHOWN,
  TICK_GRADIENT,
  WINDOW,
  fmt,
  tickColor,
} from "./learn-data";
import { LIGHT_PX, buildLut, loadLightFrames, paintLight } from "./light-field";
import { LearnStage3D } from "./LearnStage3D";

/** Per recorded iteration, as the landing hero plays it. */
const STEP_MS = 760;
const GAP_MS = 140;
/** The light field blends in the hero's quantised substeps. */
const SUBSTEPS = 9;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const pct = (v: number, origin: number) => ((v - origin) / WINDOW.size) * 100;
const VIEWBOX = `${WINDOW.x} ${WINDOW.y} ${WINDOW.size} ${WINDOW.size}`;

type Mode = "2d" | "3d";
type Dir = "up" | "down" | "left";

const tick = (id: string) => FRAMES[0].ticks.find((t) => t.id === id)!;
/** Pin anchors on the recorded geometry: the bar's upper edge, the pulled-back line end, the bar's lower edge. */
const PIN_MASK = tick("1-bottom").p;
const PIN_PRINT = tick("0-left").q;
const PIN_TARGET = tick("1-top").p;

function Pin({
  x,
  y,
  dir,
  color,
  label,
  delay,
  quiet = false,
}: {
  x: number;
  y: number;
  dir: Dir;
  color: string;
  label: string;
  delay: number;
  quiet?: boolean;
}) {
  return (
    <div
      className={`lrn-pin lrn-pin-${dir}${quiet ? " is-quiet" : ""}`}
      style={{ left: `${pct(x, WINDOW.x)}%`, top: `${pct(y, WINDOW.y)}%`, animationDelay: `${delay}ms` }}
    >
      <i className="lrn-pin-dot" style={{ background: color }} />
      <span className="lrn-pin-label">{label}</span>
    </div>
  );
}

function Sparkline({ frame }: { frame: number }) {
  const W = 190;
  const H = 56;
  const PX = 16;
  const PY = 13;
  const max = Math.max(...FRAMES.map((f) => f.epeMeanNm));
  const pts = FRAMES.map((f, k) => ({
    x: PX + (k / LAST) * (W - 2 * PX),
    y: PY + (1 - f.epeMeanNm / max) * (H - 2 * PY),
  }));
  return (
    <div className="lrn-chip lrn-spark">
      <span className="lrn-chip-k">Mean EPE per iteration</span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <polyline
          className="lrn-spark-line"
          points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          pathLength={1}
          style={{ strokeDashoffset: 1 - frame / LAST }}
        />
        {pts.map((p, k) => (
          <circle
            key={k}
            className={`lrn-spark-dot${k <= frame ? " is-in" : ""}${k === frame ? " is-on" : ""}`}
            cx={p.x}
            cy={p.y}
            r={k === frame ? 4 : 3}
          />
        ))}
        <text className="lrn-spark-t" x={pts[0].x + 8} y={pts[0].y + 4}>
          {fmt(FRAMES[0].epeMeanNm)}
        </text>
        <text
          className={`lrn-spark-t${frame >= LAST ? " is-in" : ""}`}
          x={pts[LAST].x - 2}
          y={pts[LAST].y - 9}
          textAnchor="end"
        >
          {fmt(FRAMES[LAST].epeMeanNm)}
        </text>
      </svg>
    </div>
  );
}

export function LearnStage({ step, reducedMotion }: { step: number; reducedMotion: boolean }) {
  const [frame, setFrame] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<Mode>("2d");
  const [want3d, setWant3d] = useState(false);
  const [hero, setHero] = useState<HeroState | null>(null);
  const [mount3d, setMount3d] = useState(false);
  const [landed, setLanded] = useState(false);

  const maskFillRef = useRef<SVGPathElement>(null);
  const maskEdgeRef = useRef<SVGPathElement>(null);
  const contourRef = useRef<SVGPathElement>(null);
  const lineRefs = useRef<Array<SVGLineElement | null>>([]);
  const glowRefs = useRef<Array<SVGLineElement | null>>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<ImageData | null>(null);
  const lutRef = useRef<Uint8ClampedArray | null>(null);
  const lightRef = useRef<Float32Array[] | null>(null);
  const lastPaint = useRef("");
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const readoutValue = useRef(MEAN_BEFORE);
  const readoutAnim = useRef({ raf: 0, timer: 0 });
  const posRef = useRef(0);
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const actionsRef = useRef<HeroActions | null>(null);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const tweens = useMemo(
    () =>
      FRAMES.slice(0, LAST).map((f, i) => ({
        mask: createRecordedPathTween(f.maskPath, FRAMES[i + 1].maskPath),
        contour: createRecordedPathTween(f.contourPath, FRAMES[i + 1].contourPath),
      })),
    [],
  );

  const writeReadout = useCallback((value: number) => {
    readoutValue.current = value;
    if (readoutRef.current) readoutRef.current.textContent = fmt(value);
  }, []);

  /** Draw the recorded state at a fractional iteration position (0..LAST). */
  const renderPos = useCallback(
    (pos: number) => {
      const clamped = Math.max(0, Math.min(LAST, pos));
      const k = Math.min(LAST - 1, Math.floor(clamped));
      const f = clamped - k;
      const a = FRAMES[k];
      const b = FRAMES[k + 1];
      const maskD = f <= 0 ? a.maskPath : f >= 1 ? b.maskPath : tweens[k].mask.at(f);
      const contourD = f <= 0 ? a.contourPath : f >= 1 ? b.contourPath : tweens[k].contour.at(f);
      maskFillRef.current?.setAttribute("d", maskD);
      maskEdgeRef.current?.setAttribute("d", maskD);
      contourRef.current?.setAttribute("d", contourD);
      a.ticks.forEach((ta, i) => {
        const tb = b.ticks[i];
        const x = ta.q.x + (tb.q.x - ta.q.x) * f;
        const y = ta.q.y + (tb.q.y - ta.q.y) * f;
        const abs = Math.abs(ta.epeNm) + (Math.abs(tb.epeNm) - Math.abs(ta.epeNm)) * f;
        const color = tickColor(abs);
        const line = lineRefs.current[i];
        const glow = glowRefs.current[i];
        if (line) {
          line.setAttribute("x2", x.toFixed(2));
          line.setAttribute("y2", y.toFixed(2));
          line.style.stroke = color;
        }
        if (glow) {
          glow.setAttribute("x2", x.toFixed(2));
          glow.setAttribute("y2", y.toFixed(2));
          glow.style.stroke = color;
          glow.style.strokeOpacity = (0.08 + 0.24 * Math.min(1, abs / MAX_ABS_BEFORE)).toFixed(3);
        }
      });
      const light = lightRef.current;
      const ctx = ctxRef.current;
      const image = imageRef.current;
      const lut = lutRef.current;
      if (light && ctx && image && lut) {
        const w = f <= 0 ? 0 : f >= 1 ? 1 : Math.round(f * SUBSTEPS) / SUBSTEPS;
        const key = w >= 1 ? `${k + 1}:0` : `${k}:${w}`;
        if (lastPaint.current !== key) {
          lastPaint.current = key;
          if (w >= 1) paintLight(image, lut, light[k + 1], null, 0);
          else paintLight(image, lut, light[k], w > 0 ? light[k + 1] : null, w);
          ctx.putImageData(image, 0, 0);
        }
      }
      writeReadout(a.epeMeanNm + (b.epeMeanNm - a.epeMeanNm) * f);
    },
    [tweens, writeReadout],
  );

  const canvasCallback = useCallback(
    (el: HTMLCanvasElement | null) => {
      canvasRef.current = el;
      ctxRef.current = el ? el.getContext("2d") : null;
      imageRef.current = ctxRef.current ? ctxRef.current.createImageData(LIGHT_PX, LIGHT_PX) : null;
      lastPaint.current = "";
      if (el) renderPos(posRef.current);
    },
    [renderPos],
  );

  const readoutCallback = useCallback((el: HTMLSpanElement | null) => {
    readoutRef.current = el;
    if (el) el.textContent = fmt(readoutValue.current);
  }, []);

  // The recorded light fields, fetched once; painted as soon as a canvas exists.
  useEffect(() => {
    let cancelled = false;
    lutRef.current = buildLut();
    loadLightFrames()
      .then((frames) => {
        if (cancelled) return;
        lightRef.current = frames;
        lastPaint.current = "";
        renderPos(posRef.current);
      })
      .catch(() => {
        /* the figure stays mask, target and contour without the light */
      });
    return () => {
      cancelled = true;
    };
  }, [renderPos]);

  const cancelReadoutAnim = useCallback(() => {
    window.cancelAnimationFrame(readoutAnim.current.raf);
    window.clearTimeout(readoutAnim.current.timer);
  }, []);

  const animateReadout = useCallback(
    (to: number, ms: number, delay: number, onDone?: () => void) => {
      cancelReadoutAnim();
      const from = readoutValue.current;
      if (reducedRef.current) {
        writeReadout(to);
        onDone?.();
        return;
      }
      readoutAnim.current.timer = window.setTimeout(() => {
        const started = performance.now();
        const frameTick = (now: number) => {
          const t = Math.min(1, (now - started) / ms);
          writeReadout(from + (to - from) * easeOut(t));
          if (t < 1) readoutAnim.current.raf = window.requestAnimationFrame(frameTick);
          else onDone?.();
        };
        readoutAnim.current.raf = window.requestAnimationFrame(frameTick);
      }, delay);
    },
    [cancelReadoutAnim, writeReadout],
  );

  const stopPlayback = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    window.clearTimeout(timerRef.current);
    setRunning(false);
  }, []);

  /** Replay the recorded iterations from `from` to the last one. */
  const play = useCallback(
    (from = 0) => {
      stopPlayback();
      setDone(false);
      if (reducedRef.current) {
        posRef.current = LAST;
        renderPos(LAST);
        setFrame(LAST);
        setDone(true);
        return;
      }
      setRunning(true);
      let k = from >= LAST ? 0 : from;
      posRef.current = k;
      renderPos(k);
      setFrame(k);
      const playStep = () => {
        const started = performance.now();
        // The mask changes first; the readouts follow it.
        setFrame(k + 1);
        const frameTick = (now: number) => {
          const t = Math.min(1, (now - started) / STEP_MS);
          const p = k + easeInOut(t);
          posRef.current = p;
          renderPos(p);
          if (t < 1) {
            rafRef.current = window.requestAnimationFrame(frameTick);
            return;
          }
          k += 1;
          if (k < LAST) timerRef.current = window.setTimeout(playStep, GAP_MS);
          else {
            setRunning(false);
            setDone(true);
          }
        };
        rafRef.current = window.requestAnimationFrame(frameTick);
      };
      playStep();
    },
    [renderPos, stopPlayback],
  );
  const playRef = useRef(play);
  playRef.current = play;

  /** Scrubber: ease from the current position to a recorded iteration. */
  const jumpTo = useCallback(
    (k: number) => {
      if (mode === "3d") return;
      stopPlayback();
      setDone(k === LAST);
      const from = posRef.current;
      if (reducedRef.current || Math.abs(from - k) < 1e-3) {
        posRef.current = k;
        renderPos(k);
        setFrame(k);
        return;
      }
      const started = performance.now();
      const ms = 600;
      const frameTick = (now: number) => {
        const t = Math.min(1, (now - started) / ms);
        const p = from + (k - from) * easeOut(t);
        posRef.current = p;
        renderPos(p);
        setFrame(Math.round(p));
        if (t < 1) rafRef.current = window.requestAnimationFrame(frameTick);
      };
      rafRef.current = window.requestAnimationFrame(frameTick);
    },
    [mode, renderPos, stopPlayback],
  );

  // Step changes: build up (1-3) or start the correction (4).
  useEffect(() => {
    stopPlayback();
    cancelReadoutAnim();
    setLanded(false);
    // Preload the 3D view while the misses are shown, never while the replay runs:
    // its first WebGL frame would stall the 2D motion.
    if (step === 3) setMount3d(true);
    if (step === 4) {
      if (reducedRef.current) playRef.current(0);
      else timerRef.current = window.setTimeout(() => playRef.current(0), 450);
      return;
    }
    posRef.current = 0;
    renderPos(0);
    setFrame(0);
    setDone(false);
    setMode("2d");
    setWant3d(false);
    actionsRef.current?.original();
    if (step === 3) {
      writeReadout(0);
      animateReadout(MEAN_BEFORE, 900, 500, () => setLanded(true));
    }
  }, [step, animateReadout, cancelReadoutAnim, renderPos, stopPlayback, writeReadout]);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(rafRef.current);
      window.clearTimeout(timerRef.current);
      window.cancelAnimationFrame(readoutAnim.current.raf);
      window.clearTimeout(readoutAnim.current.timer);
    },
    [],
  );

  // Reached step 4 directly: bring the 3D view in once the replay has finished.
  useEffect(() => {
    if (step === 4 && done) setMount3d(true);
  }, [step, done]);

  // 3D view: play the same recorded correction once the live scene is ready.
  useEffect(() => {
    if (mode !== "3d" || !want3d || !hero || !hero.live || hero.running) return;
    setWant3d(false);
    if (hero.frame === 0) actionsRef.current?.correct();
  }, [mode, want3d, hero]);

  // The readout follows whichever view is showing.
  useEffect(() => {
    if (mode === "3d") {
      if (hero) animateReadout(FRAMES[Math.min(LAST, hero.frame)].epeMeanNm, 600, 0);
      return;
    }
    cancelReadoutAnim();
    renderPos(posRef.current);
  }, [mode, hero?.frame, hero, animateReadout, cancelReadoutAnim, renderPos]);

  const choose = (next: Mode) => {
    if (next === mode) return;
    if (next === "3d") {
      // The 2D replay ends where it was heading; the 3D one starts.
      stopPlayback();
      posRef.current = LAST;
      renderPos(LAST);
      setFrame(LAST);
      setDone(true);
      setMount3d(true);
      setWant3d(true);
    }
    setMode(next);
  };

  const replay = () => {
    if (mode === "3d") actionsRef.current?.correct();
    else play(0);
  };

  const lit = step >= 2;
  const displayFrame = mode === "3d" ? Math.min(LAST, hero?.frame ?? 0) : frame;
  const displayRunning = mode === "3d" ? !!hero?.running : running;
  const displayDone = mode === "3d" ? !!hero && hero.frame >= LAST && !hero.running : done;
  const caption =
    step === 1
      ? "Mask as drawn"
      : step === 2
        ? "Print on the light that arrived"
        : step === 3
          ? `${TICKS_SHOWN} of ${POINT_COUNT} measurements, one per edge`
          : `Iteration ${displayFrame} of ${LAST}`;
  const figureLabel =
    step === 1
      ? "The L-shaped photomask as drawn"
      : step === 2
        ? "The simulated light under the mask, the printed contour and the dashed target"
        : step === 3
          ? `Edge placement error ticks at ${TICKS_SHOWN} target edges, mean ${fmt(MEAN_BEFORE)} nm`
          : `Recorded OPC iteration ${displayFrame} of ${LAST}, mean EPE ${fmt(FRAMES[displayFrame].epeMeanNm)} nm`;

  return (
    <div className="lrn-stage" data-step={step} data-mode={mode}>
      <div className="lrn-stage-top">
        <div className="lrn-cap">
          <span className="lrn-cap-src">
            Actual <span className="lrn-wordmark">litopc</span> output ·{" "}
          </span>
          {caption}
        </div>
        {step === 4 && (
          <div
            className={`lrn-seg${done && mode === "2d" && !displayRunning ? " is-invite" : ""}`}
            role="group"
            aria-label="View"
          >
            <button type="button" aria-pressed={mode === "2d"} onClick={() => choose("2d")}>
              2D
            </button>
            <button type="button" aria-pressed={mode === "3d"} onClick={() => choose("3d")}>
              3D
            </button>
          </div>
        )}
      </div>

      <div className="lrn-body">
        <div className={`lrn-fig${mode === "3d" ? " is-hidden" : ""}`} data-lit={lit ? "true" : "false"}>
          <svg className="lrn-layer" viewBox={VIEWBOX} aria-hidden="true">
            <path ref={maskFillRef} className="lrn-mask-fill" d={FRAMES[0].maskPath} />
          </svg>
          {lit && (
            <canvas
              ref={canvasCallback}
              className="lrn-layer lrn-light"
              width={LIGHT_PX}
              height={LIGHT_PX}
              aria-hidden="true"
            />
          )}
          <svg className="lrn-layer" viewBox={VIEWBOX} role="img" aria-label={figureLabel}>
            <path ref={maskEdgeRef} className="lrn-mask-edge" d={FRAMES[0].maskPath} pathLength={1} />
            {lit && <path className="lrn-target" d={TARGET_PATH} />}
            {lit && <path ref={contourRef} className="lrn-contour" d={FRAMES[0].contourPath} pathLength={1} />}
            {step >= 3 && (
              <g className="lrn-ticks">
                {FRAMES[0].ticks.map((t, i) => {
                  const color = tickColor(Math.abs(t.epeNm));
                  const opacity = (0.08 + 0.24 * Math.min(1, Math.abs(t.epeNm) / MAX_ABS_BEFORE)).toFixed(3);
                  return (
                    <g key={t.id} className="lrn-tick" style={{ "--i": i } as CSSProperties}>
                      <line
                        ref={(el) => {
                          glowRefs.current[i] = el;
                        }}
                        className="lrn-tick-glow"
                        x1={t.p.x}
                        y1={t.p.y}
                        x2={t.q.x}
                        y2={t.q.y}
                        style={{ stroke: color, strokeOpacity: opacity }}
                      />
                      <line
                        ref={(el) => {
                          lineRefs.current[i] = el;
                        }}
                        className="lrn-tick-line"
                        x1={t.p.x}
                        y1={t.p.y}
                        x2={t.q.x}
                        y2={t.q.y}
                        pathLength={1}
                        style={{ stroke: color }}
                      />
                      <circle className="lrn-tick-dot" cx={t.p.x} cy={t.p.y} r={2.4} />
                      {step === 3 && LARGEST.includes(t.id) && (
                        <circle className="lrn-ring" cx={t.q.x} cy={t.q.y} r={9} />
                      )}
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
          {step <= 2 && (
            <Pin
              x={PIN_MASK.x}
              y={PIN_MASK.y}
              dir="up"
              color="var(--lt-mask-stroke)"
              label="Mask"
              delay={step === 1 ? 900 : 300}
              quiet={step === 2}
            />
          )}
          {step === 2 && (
            <Pin x={PIN_PRINT.x} y={PIN_PRINT.y} dir="left" color="var(--lt-print)" label="Print" delay={1200} />
          )}
          {step === 2 && (
            <Pin x={PIN_TARGET.x} y={PIN_TARGET.y} dir="down" color="var(--lt-target)" label="Target" delay={1500} />
          )}
        </div>

        {mount3d && <LearnStage3D hidden={mode !== "3d"} actionsRef={actionsRef} onState={setHero} />}

        {step >= 3 && (
          <div className="lrn-hud">
            <div className={`lrn-chip lrn-readout${landed ? " is-landed" : ""}`}>
              <span className="lrn-chip-k">Mean EPE</span>
              <span className="lrn-chip-v">
                <span ref={readoutCallback} />
                <small>nm</small>
              </span>
            </div>
            {step === 3 && (
              <div className="lrn-chip lrn-scale">
                <span className="lrn-chip-k">Miss</span>
                <i className="lrn-scale-bar" style={{ background: TICK_GRADIENT }} />
                <span className="lrn-scale-l">
                  <b>0</b>
                  <b>{Math.round(MAX_ABS_BEFORE)} nm</b>
                </span>
              </div>
            )}
            {step === 4 && <Sparkline frame={displayFrame} />}
          </div>
        )}
      </div>

      <div className="lrn-foot">
        {step < 4 ? (
          <div className="lrn-legend" aria-label="Key">
            <span className="is-in">
              <i className="lrn-sw lrn-sw-mask" />
              Mask
            </span>
            <span className={step >= 2 ? "is-in" : ""}>
              <i className="lrn-sw lrn-sw-print" />
              Print
            </span>
            <span className={step >= 2 ? "is-in" : ""}>
              <i className="lrn-sw lrn-sw-target" />
              Target
            </span>
            <span className={step >= 3 ? "is-in" : ""}>
              <i className="lrn-sw lrn-sw-epe" />
              EPE, one tick per edge
            </span>
          </div>
        ) : (
          <div className="lrn-scrub">
            <span className="lrn-scrub-k">Iteration</span>
            <div className="lrn-scrub-track" style={{ "--p": displayFrame / LAST } as CSSProperties}>
              <span className="lrn-scrub-fill" aria-hidden="true" />
              {FRAMES.map((f, k) => (
                <button
                  type="button"
                  key={k}
                  className={k === displayFrame ? "is-on" : k < displayFrame ? "is-done" : ""}
                  aria-label={`Iteration ${k}, mean EPE ${fmt(f.epeMeanNm)} nm`}
                  aria-current={k === displayFrame ? "step" : undefined}
                  disabled={mode === "3d"}
                  onClick={() => jumpTo(k)}
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`lrn-pill lrn-pill-ghost lrn-pill-sm lrn-replay${displayDone ? " is-in" : ""}`}
              tabIndex={displayDone ? 0 : -1}
              aria-hidden={!displayDone}
              onClick={replay}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v6h6" />
              </svg>
              Replay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
