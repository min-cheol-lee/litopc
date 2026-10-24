"use client";

/**
 * Interactive hero: the approved render image is shown first; once WebGL,
 * the renderer bundle and the recorded intensity field are ready, the same
 * scene is drawn live with the simulator's own renderer and can be turned by
 * hand. Rotation only changes the camera pose of already computed results.
 *
 * A scene may carry a recorded correction sequence (iteration 0 = the
 * uncorrected mask, then real OPC iterations). "Correct" steps through those
 * recorded states; the field is visually blended between two recorded states
 * while a step plays, exactly like the 2D replay. Nothing is recomputed.
 */
import dynamic from "next/dynamic";
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import type {
  ContourSet,
  MaskRect,
  Surface3DHandle,
  Surface3DProps,
} from "../marketing3d/lib/surface3d-types";
import "../app/marketing-hero3d.css";

const Surface3DCanvas = dynamic(
  () => import("../marketing3d/components/Surface3DCanvas"),
  { ssr: false },
);

export type HeroSceneMeta = Omit<
  Surface3DProps,
  "intensityData" | "rendererRef"
> & {
  id: string;
  label: string;
  image: string;
  intensity: { file: string; w: number; h: number; min: number; max: number };
};

export type HeroFrame = {
  iteration: number;
  epeMeanNm: number;
  maskAddRects: MaskRect[];
  contours: ContourSet[];
  intensity: { offset: number; w: number; h: number; min: number; max: number };
};

export type HeroSequence = {
  id: string;
  file: string;
  settings?: Record<string, number | string>;
  targetRects?: MaskRect[];
  targetContours?: ContourSet[];
  frames: HeroFrame[];
};

export type HeroScene = {
  meta: HeroSceneMeta;
  alt: string;
  /** Recorded correction states; when present, frame 0 replaces meta's own field. */
  sequence?: HeroSequence;
  /** Still shown before the live scene is ready (for the sequence's frame 0). */
  image?: string;
  /** Tilt range in degrees relative to the approved pose. */
  tilt?: [number, number];
};

export type HeroState = {
  scene: number;
  live: boolean;
  support: "unknown" | "yes" | "no";
  frame: number;
  lastFrame: number;
  running: boolean;
  epeMeanNm: number | null;
  moved: boolean;
  hasSequence: boolean;
};

export type HeroActions = {
  selectScene: (index: number) => void;
  correct: () => void;
  original: () => void;
  resetView: () => void;
};

type View = { spin: number; tilt: number };
const REST: View = { spin: 0, tilt: 0 };
const DEG = Math.PI / 180;
const STEP_MS = 760;
const SUBSTEPS = 9;

/** Approved pose as the renderer applies it (ZXY, screen Y inverted). */
function poseMatrix(meta: HeroSceneMeta) {
  return new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(
      -meta.elevationDeg * DEG,
      meta.rollDeg * DEG,
      meta.azimuthDeg * DEG,
      "ZXY",
    ),
  );
}

/**
 * Turntable on top of the approved pose: spin turns the stack about its own
 * axis; tilt rotates about the screen-plane axis perpendicular to that stack
 * axis. The result is decomposed back into the renderer's three angles, so the
 * mask, light volumes, intensity surface and reflections keep their geometry.
 */
export function composeView(meta: HeroSceneMeta, view: View) {
  const base = poseMatrix(meta);
  const stackAxis = new THREE.Vector3(0, 0, 1).applyMatrix4(base);
  const projected = new THREE.Vector3(stackAxis.x, stackAxis.y, 0);
  const tiltAxis =
    projected.length() < 1e-4
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(projected.y, -projected.x, 0).normalize();
  const spin = new THREE.Matrix4().makeRotationZ(view.spin * DEG);
  const tilt = new THREE.Matrix4().makeRotationAxis(tiltAxis, view.tilt * DEG);
  const total = tilt.multiply(base).multiply(spin);
  const euler = new THREE.Euler().setFromRotationMatrix(total, "ZXY");
  return {
    azimuthDeg: euler.z / DEG,
    elevationDeg: -euler.x / DEG,
    rollDeg: euler.y / DEG,
  };
}

function decodeCodes(
  codes: Uint16Array,
  spec: { min: number; max: number },
) {
  const data = new Float32Array(codes.length);
  const span = spec.max - spec.min;
  for (let i = 0; i < codes.length; i++) {
    data[i] = spec.min + (codes[i] / 65535) * span;
  }
  return data;
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

type SceneData = { id: string; frames: Float32Array[] };
const dataCache = new Map<string, Promise<SceneData>>();

function loadSceneData(scene: HeroScene): Promise<SceneData> {
  const key = scene.sequence ? scene.sequence.file : scene.meta.intensity.file;
  if (!dataCache.has(key)) {
    const promise = fetch(key)
      .then((response) => {
        if (!response.ok) throw new Error(`Scene data ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (scene.sequence) {
          const frames = scene.sequence.frames.map((frame) => {
            const count = frame.intensity.w * frame.intensity.h;
            const codes = new Uint16Array(buffer, frame.intensity.offset * count * 2, count);
            return decodeCodes(codes, frame.intensity);
          });
          return { id: scene.meta.id, frames };
        }
        return {
          id: scene.meta.id,
          frames: [decodeCodes(new Uint16Array(buffer), scene.meta.intensity)],
        };
      })
      .catch((error) => {
        dataCache.delete(key);
        throw error;
      });
    dataCache.set(key, promise);
  }
  return dataCache.get(key)!;
}

export function MarketingHero3D({
  scenes,
  className = "",
  initialScene = 0,
  field = true,
  controls = "inside",
  targetOverlay = "corrected",
  rendererRef,
  onChange,
  renderControls,
  stageBottom = 0,
  beforeGhost = false,
}: {
  scenes: HeroScene[];
  className?: string;
  initialScene?: number;
  /** Draw the renderer's quiet field gradient behind the scene. */
  field?: boolean;
  controls?: "inside" | "none";
  /** Dashed target outline: never, only before a correction, only once one has started, or always. */
  targetOverlay?: "never" | "before" | "corrected" | "always";
  rendererRef?: { current: Surface3DHandle | null };
  onChange?: (state: HeroState) => void;
  /** Custom controls rendered by the page (outside the stage). */
  renderControls?: (state: HeroState, actions: HeroActions) => React.ReactNode;
  /** Space reserved below the stage, inside the box, for page-rendered controls. */
  stageBottom?: number;
  /** After a correction starts, keep the uncorrected print as a dashed ghost for comparison. */
  beforeGhost?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initialScene);
  const scene = scenes[active];
  const meta = scene.meta;
  const sequence = scene.sequence;
  const lastFrame = sequence ? sequence.frames.length - 1 : 0;
  const [support, setSupport] = useState<"unknown" | "yes" | "no">("unknown");
  const [wanted, setWanted] = useState(false);
  const [data, setData] = useState<SceneData | null>(null);
  const [ready, setReady] = useState(false);
  const [quality, setQuality] = useState<"FAST" | "FULL">("FULL");
  const [view, setView] = useState<View>(REST);
  const [dragging, setDragging] = useState(false);
  const [frame, setFrame] = useState(0);
  const [blend, setBlend] = useState<Float32Array | null>(null);
  const [running, setRunning] = useState(false);
  const viewRef = useRef<View>(REST);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    spin: number;
    tilt: number;
  } | null>(null);
  const qualityTimer = useRef<number | null>(null);
  const resetFrame = useRef(0);
  const runToken = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tiltRange = scene.tilt ?? [-40, 32];

  const commitView = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  // Decide once whether to attempt the live scene at all.
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motion.matches);
    const onMotion = () => setReducedMotion(motion.matches);
    motion.addEventListener("change", onMotion);
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData || !webglAvailable()) {
      setSupport("no");
      return () => motion.removeEventListener("change", onMotion);
    }
    setSupport("yes");
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    const start = () => {
      if (cancelled) return;
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle(() => !cancelled && setWanted(true), { timeout: 1500 });
      else window.setTimeout(() => !cancelled && setWanted(true), 250);
    };
    const whenVisible = () => {
      if (!root.current || !("IntersectionObserver" in window)) return start();
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          observer?.disconnect();
          start();
        },
        { rootMargin: "25% 0px" },
      );
      observer.observe(root.current);
    };
    // Never compete with the first paint: wait for the document to finish loading.
    if (document.readyState === "complete") whenVisible();
    else window.addEventListener("load", whenVisible, { once: true });
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("load", whenVisible);
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  // Fetch the recorded field(s) for the active scene.
  useEffect(() => {
    if (!wanted || support !== "yes") return;
    let cancelled = false;
    loadSceneData(scene)
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch(() => {
        if (!cancelled) setSupport("no");
      });
    return () => {
      cancelled = true;
    };
  }, [wanted, support, scene]);

  // Show the image again if the GPU context is lost.
  useEffect(() => {
    if (!ready || !root.current) return;
    const canvas = root.current.querySelector("canvas");
    if (!canvas) return;
    const lost = () => setSupport("no");
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [ready]);

  useEffect(
    () => () => {
      runToken.current++;
      if (qualityTimer.current !== null) window.clearTimeout(qualityTimer.current);
      if (resetFrame.current) window.cancelAnimationFrame(resetFrame.current);
    },
    [],
  );

  const pose = useMemo(() => composeView(meta, view), [meta, view]);
  const live = support === "yes" && data?.id === meta.id;
  const moved = Math.abs(view.spin) > 0.01 || Math.abs(view.tilt) > 0.01;

  const settleFull = useCallback((delay = 120) => {
    if (qualityTimer.current !== null) window.clearTimeout(qualityTimer.current);
    qualityTimer.current = window.setTimeout(() => {
      qualityTimer.current = null;
      setQuality("FULL");
    }, delay);
  }, []);
  const goFast = useCallback(() => {
    if (qualityTimer.current !== null) {
      window.clearTimeout(qualityTimer.current);
      qualityTimer.current = null;
    }
    setQuality("FAST");
  }, []);

  const applyDelta = useCallback(
    (spinDelta: number, tiltDelta: number, from: View = viewRef.current) => {
      const spin = ((from.spin + spinDelta + 540) % 360) - 180;
      const tilt = Math.max(tiltRange[0], Math.min(tiltRange[1], from.tilt + tiltDelta));
      commitView({ spin, tilt });
    },
    [commitView, tiltRange],
  );

  const resetView = useCallback(() => {
    if (resetFrame.current) window.cancelAnimationFrame(resetFrame.current);
    const from = viewRef.current;
    if (reducedMotion || (!from.spin && !from.tilt)) {
      commitView(REST);
      return;
    }
    goFast();
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 520);
      const ease = 1 - Math.pow(1 - t, 3);
      commitView({ spin: from.spin * (1 - ease), tilt: from.tilt * (1 - ease) });
      if (t < 1) resetFrame.current = window.requestAnimationFrame(step);
      else {
        resetFrame.current = 0;
        commitView(REST);
        settleFull(60);
      }
    };
    resetFrame.current = window.requestAnimationFrame(step);
  }, [commitView, goFast, reducedMotion, settleFull]);

  const stopRun = useCallback(() => {
    runToken.current++;
    setRunning(false);
    setBlend(null);
  }, []);

  const original = useCallback(() => {
    stopRun();
    setFrame(0);
    settleFull(60);
  }, [settleFull, stopRun]);

  /** Play the recorded iterations from the current state to the last one. */
  const correct = useCallback(() => {
    if (!sequence || !data || data.id !== meta.id || running) return;
    const token = ++runToken.current;
    const frames = data.frames;
    if (reducedMotion) {
      setFrame(lastFrame);
      return;
    }
    setRunning(true);
    goFast();
    let current = frame >= lastFrame ? 0 : frame;
    setFrame(current);
    const playStep = () => {
      if (runToken.current !== token) return;
      const next = current + 1;
      const from = frames[current];
      const to = frames[next];
      const started = performance.now();
      const out = new Float32Array(from.length);
      // The mask changes first; the printed field then follows it.
      setFrame(next);
      const tick = (now: number) => {
        if (runToken.current !== token) return;
        const t = Math.min(1, (now - started) / STEP_MS);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const quantized = Math.min(1, Math.round(ease * SUBSTEPS) / SUBSTEPS);
        const mix = new Float32Array(out.length);
        for (let i = 0; i < out.length; i++) mix[i] = from[i] + (to[i] - from[i]) * quantized;
        setBlend(quantized >= 1 ? null : mix);
        if (t < 1) window.requestAnimationFrame(tick);
        else {
          current = next;
          if (current < lastFrame) window.setTimeout(playStep, 140);
          else {
            setRunning(false);
            settleFull(80);
          }
        }
      };
      window.requestAnimationFrame(tick);
    };
    playStep();
  }, [data, frame, goFast, lastFrame, meta.id, reducedMotion, running, sequence, settleFull]);

  const selectScene = useCallback(
    (index: number) => {
      if (index === active) return;
      if (resetFrame.current) window.cancelAnimationFrame(resetFrame.current);
      resetFrame.current = 0;
      stopRun();
      setReady(false);
      setFrame(0);
      commitView(REST);
      setActive(index);
    },
    [active, commitView, stopRun],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!live || event.button !== 0) return;
    // A press on the stage only turns the model: no text selection across the
    // page and no native drag of an existing selection, which would cancel the
    // pointer capture and block the rotation.
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    event.currentTarget.focus({ preventScroll: true });
    // Focus given by a press shows no keyboard ring (see .m3d-drag[data-pointer-focus]).
    event.currentTarget.dataset.pointerFocus = "1";
    if (resetFrame.current) window.cancelAnimationFrame(resetFrame.current);
    resetFrame.current = 0;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      spin: viewRef.current.spin,
      tilt: viewRef.current.tilt,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    goFast();
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    applyDelta(dx * 0.3, dy * 0.22, { spin: state.spin, tilt: state.tilt });
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!running) settleFull();
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    delete event.currentTarget.dataset.pointerFocus;
    if (!live) return;
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-6, 0],
      ArrowRight: [6, 0],
      ArrowUp: [0, -4],
      ArrowDown: [0, 4],
    };
    if (steps[event.key]) {
      event.preventDefault();
      goFast();
      applyDelta(...steps[event.key]);
      if (!running) settleFull(200);
    } else if (["Home", "0", "Escape"].includes(event.key) && moved) {
      event.preventDefault();
      resetView();
    }
  };

  const currentFrame = sequence ? sequence.frames[Math.min(frame, lastFrame)] : null;
  const rendererProps = useMemo(() => {
    if (!data || data.id !== meta.id) return null;
    const { id: _id, label: _label, image: _image, intensity: spec, ...renderer } = meta;
    const values = blend ?? data.frames[Math.min(frame, data.frames.length - 1)];
    const overlay =
      targetOverlay === "always" ||
      (targetOverlay === "corrected" && frame > 0) ||
      (targetOverlay === "before" && frame === 0);
    return {
      ...renderer,
      intensityW: currentFrame ? currentFrame.intensity.w : spec.w,
      intensityH: currentFrame ? currentFrame.intensity.h : spec.h,
      intensityData: values as unknown as number[],
      maskAddRects: currentFrame ? currentFrame.maskAddRects : renderer.maskAddRects,
      contours: currentFrame ? currentFrame.contours : renderer.contours,
      targetContours: sequence?.targetContours ?? renderer.targetContours,
      showTargetOverlay: sequence ? overlay : renderer.showTargetOverlay,
      compareActive: !!(beforeGhost && sequence && frame > 0),
      compareAContours: beforeGhost && sequence && frame > 0 ? sequence.frames[0].contours : [],
      compareBContours: [],
    };
  }, [beforeGhost, blend, currentFrame, data, frame, meta, sequence, targetOverlay]);

  const state: HeroState = {
    scene: active,
    live: live && ready,
    support,
    frame: Math.min(frame, lastFrame),
    lastFrame,
    running,
    epeMeanNm: currentFrame ? currentFrame.epeMeanNm : null,
    moved,
    hasSequence: !!sequence,
  };
  const actions: HeroActions = { selectScene, correct, original, resetView };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, live, ready, support, frame, lastFrame, running, moved]);

  const stillSrc = scene.image ?? meta.image;

  return (
    <div
      ref={root}
      className={`m3d ${className}`.trim()}
      data-live={live && ready ? "true" : "false"}
      data-support={support}
      data-dragging={dragging || undefined}
      data-moved={moved || undefined}
      data-scene={meta.id}
      data-frame={state.frame}
      data-running={running || undefined}
    >
      {field && <div className="m3d-field" aria-hidden="true" />}
      <div className="m3d-stage" style={stageBottom ? { bottom: stageBottom } : undefined}>
        <img
          className="m3d-image"
          src={stillSrc}
          alt={scene.alt}
          width="2000"
          height="2000"
          fetchPriority={active === initialScene ? "high" : undefined}
          decoding="async"
        />
        {live && rendererProps && (
          <div className="m3d-canvas" aria-hidden="true">
            <Surface3DCanvas
              {...rendererProps}
              rendererRef={rendererRef}
              azimuthDeg={pose.azimuthDeg}
              elevationDeg={pose.elevationDeg}
              rollDeg={pose.rollDeg}
              qualityMode={quality}
              transparent
              onFirstFrame={() => setReady(true)}
            />
          </div>
        )}
        <div
          className="m3d-drag"
          role="application"
          aria-label={`${scene.alt}. ${live ? "Drag or use the arrow keys to turn the model. Press Home to return to the original view." : ""}`}
          tabIndex={live ? 0 : -1}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onDoubleClick={() => moved && resetView()}
          onKeyDown={onKeyDown}
          onBlur={(event) => {
            delete event.currentTarget.dataset.pointerFocus;
          }}
        />
      </div>
      {renderControls
        ? renderControls(state, actions)
        : controls === "inside" && (
            <div className="m3d-controls">
              {sequence && (
                <div className="m3d-correct">
                  <button
                    type="button"
                    className="m3d-correct-run"
                    onClick={correct}
                    disabled={!live || running || frame >= lastFrame}
                  >
                    {running ? `Iteration ${state.frame} of ${lastFrame}` : "Correct"}
                  </button>
                  <button
                    type="button"
                    className="m3d-correct-original"
                    onClick={original}
                    tabIndex={frame > 0 ? 0 : -1}
                    aria-hidden={frame === 0}
                  >
                    Original
                  </button>
                </div>
              )}
              <button
                type="button"
                className="m3d-reset"
                onClick={resetView}
                tabIndex={moved ? 0 : -1}
                aria-hidden={!moved}
              >
                Reset view
              </button>
              <div className="m3d-switch" role="tablist" aria-label="Pattern">
                {scenes.map((item, index) => (
                  <button
                    type="button"
                    role="tab"
                    key={item.meta.id}
                    id={`${id}-tab-${index}`}
                    aria-selected={index === active}
                    aria-label={item.meta.label}
                    title={item.meta.label}
                    tabIndex={index === active ? 0 : -1}
                    onClick={() => selectScene(index)}
                    onKeyDown={(event) => {
                      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? scenes.length - 1
                            : (index + (event.key === "ArrowLeft" ? -1 : 1) + scenes.length) % scenes.length;
                      selectScene(next);
                      document.getElementById(`${id}-tab-${next}`)?.focus();
                    }}
                  >
                    <PatternGlyph id={item.meta.id} />
                  </button>
                ))}
              </div>
            </div>
          )}
    </div>
  );
}

/** Icon-only pattern glyphs: an L corner and four lines. */
export function PatternGlyph({ id }: { id: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {id === "l-corner" ? (
        <path d="M5 5h14v14h-5v-9H5z" />
      ) : (
        <path d="M5 4v16M10 4v16M15 4v16M20 4v16" />
      )}
    </svg>
  );
}
