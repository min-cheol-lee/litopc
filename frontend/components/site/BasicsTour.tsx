"use client";

/**
 * The opening of the plain-language guide: the four-step "How OPC works" stage
 * (components/learn) played like a short film. Steps advance on their own once
 * the tour is on screen, each step's line fills as it plays, and the tour stops
 * on the last step. Clicking a step jumps there; the button pauses, resumes or
 * replays. With reduced motion nothing advances on its own.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LearnStage } from "../learn/LearnStage";
import { PROVENANCE, STEPS } from "../learn/learn-data";
import { WithOpc } from "./Opc";

/** How long each step stays up. Step 4 covers the 450 ms lead-in, five recorded iterations and a hold. */
const DWELL_MS = [5200, 6200, 6800, 8600];
const LAST_STEP = STEPS.length;

export function BasicsTour() {
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fillRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const elapsed = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motion.matches);
    const onChange = () => setReducedMotion(motion.matches);
    motion.addEventListener("change", onChange);
    return () => motion.removeEventListener("change", onChange);
  }, []);

  // Start once the tour is on screen; hold the clock while it is scrolled away.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.45 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible && !started.current && !reducedMotion) {
      started.current = true;
      setPlaying(true);
    }
  }, [visible, reducedMotion]);

  const paintFills = useCallback((current: number, fraction: number) => {
    fillRefs.current.forEach((fill, index) => {
      if (!fill) return;
      const value = index + 1 < current ? 1 : index + 1 === current ? fraction : 0;
      fill.style.transform = `scaleX(${value})`;
    });
  }, []);

  // The clock: fills the current step's line and moves on when its dwell is over.
  useEffect(() => {
    paintFills(step, ended ? 1 : Math.min(1, elapsed.current / DWELL_MS[step - 1]));
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      const dwell = DWELL_MS[step - 1];
      paintFills(step, Math.min(1, elapsed.current / dwell));
      if (elapsed.current < dwell) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      elapsed.current = 0;
      if (step < LAST_STEP) setStep(step + 1);
      else {
        setPlaying(false);
        setEnded(true);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [step, playing, visible, ended, paintFills]);

  const go = (next: number) => {
    elapsed.current = 0;
    setEnded(false);
    setStep(next);
  };

  const toggle = () => {
    if (ended) {
      go(1);
      setPlaying(true);
      return;
    }
    setPlaying((value) => !value);
  };

  const current = STEPS[step - 1];
  const buttonLabel = ended ? "Play again" : playing ? "Pause" : "Play";

  return (
    <div ref={rootRef} className="pa-tour">
      <div className="lrn pa-tour-stage">
        <LearnStage step={step} reducedMotion={reducedMotion} />
      </div>
      <div className="pa-tour-bar">
        <button type="button" className="pa-tour-play" onClick={toggle} aria-label={buttonLabel} title={buttonLabel}>
          {ended ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10a6 6 0 1 0 1.8-4.3" />
              <path d="M4 3.6v3.6h3.6" />
            </svg>
          ) : playing ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 5v10M13 5v10" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path className="pa-tour-play-tri" d="M7 4.8v10.4l8.2-5.2z" />
            </svg>
          )}
        </button>
        <ol className="pa-tour-steps">
          {STEPS.map((s, index) => (
            <li key={s.id}>
              <button
                type="button"
                className={s.id === step ? "is-on" : s.id < step ? "is-done" : ""}
                aria-current={s.id === step ? "step" : undefined}
                onClick={() => go(s.id)}
              >
                <span className="pa-tour-track" aria-hidden="true">
                  <span
                    ref={(el) => {
                      fillRefs.current[index] = el;
                    }}
                  />
                </span>
                <span className="pa-tour-label">
                  <b>{s.id}</b>
                  {s.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="pa-tour-copy" aria-live="polite">
        <p className="pa-tour-lead">
          <WithOpc text={current.lead} />
        </p>
        <p className="pa-tour-sub">{current.sub}</p>
      </div>
      <p className="pa-tour-provenance">{PROVENANCE}</p>
    </div>
  );
}
