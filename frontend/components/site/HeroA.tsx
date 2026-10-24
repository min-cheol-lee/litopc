"use client";

import {
  MarketingHero3D,
  PatternGlyph,
  type HeroActions,
  type HeroState,
} from "../MarketingHero3D";
import { heroCorrectionScenes } from "../../lib/marketing-hero-scenes";

function stateLabel(state: HeroState) {
  if (state.running) return `Iteration ${state.frame} of ${state.lastFrame}`;
  if (state.frame > 0) return `After ${state.frame} iterations`;
  return "Before correction";
}

/**
 * Around the stage: the provenance caption above the pane (top right), a rotate
 * hint in the pane corner that becomes "Reset view" once the model has been
 * turned, and one orderly row below: pattern, state, mask.
 */
function HeroControls({ state, actions }: { state: HeroState; actions: HeroActions }) {
  const corrected = state.frame > 0;
  const invite = state.live && !corrected && !state.running;
  return (
    <>
      <p className="pa-hero-note">
        Actual <span className="pa-wordmark">litopc</span> output
      </p>
      <div className="pa-hero-hint" hidden={state.moved} aria-hidden="true">
        <svg viewBox="0 0 20 20">
          <ellipse cx="10" cy="10" rx="8" ry="3.4" />
          <circle cx="10" cy="4.2" r="1.6" />
        </svg>
        Drag to rotate
      </div>
      <button type="button" className="pa-hero-reset" hidden={!state.moved} onClick={actions.resetView}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5.2 8.2A5.4 5.4 0 1 1 4.6 11.6" />
          <path d="M4.2 4.6v3.8H8" />
        </svg>
        Reset view
      </button>
      <div className="pa-hero-row">
        <div className="pa-seg" role="tablist" aria-label="Pattern">
          {heroCorrectionScenes.map((scene, index) => (
            <button
              type="button"
              role="tab"
              key={scene.meta.id}
              aria-selected={index === state.scene}
              aria-label={scene.meta.label}
              title={scene.meta.label}
              tabIndex={index === state.scene ? 0 : -1}
              onClick={() => actions.selectScene(index)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                event.preventDefault();
                actions.selectScene((index + (event.key === "ArrowLeft" ? -1 : 1) + heroCorrectionScenes.length) % heroCorrectionScenes.length);
              }}
            >
              <PatternGlyph id={scene.meta.id} />
            </button>
          ))}
        </div>
        <span className="pa-hero-state" aria-live="polite">
          {stateLabel(state)}
        </span>
        <div className="pa-seg pa-seg-text" role="group" aria-label="Mask state">
          <button
            type="button"
            aria-pressed={!corrected && !state.running}
            disabled={!state.live}
            onClick={actions.original}
          >
            Original
          </button>
          <button
            type="button"
            aria-pressed={corrected || state.running}
            disabled={!state.live || state.running}
            data-running={state.running || undefined}
            data-invite={invite || undefined}
            onClick={() => {
              if (!corrected) actions.correct();
            }}
          >
            {state.running ? "Correcting" : "Corrected"}
          </button>
        </div>
      </div>
    </>
  );
}

export function HeroStageA() {
  return (
    <div className="pa-hero-stage">
      <MarketingHero3D
        scenes={heroCorrectionScenes}
        field={false}
        targetOverlay="before"
        renderControls={(state, actions) => <HeroControls state={state} actions={actions} />}
      />
    </div>
  );
}
