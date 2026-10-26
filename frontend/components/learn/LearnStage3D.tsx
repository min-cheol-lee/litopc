"use client";

/**
 * The hero's 3D stage (mask plate over the simulated light) inside the learn
 * page's light pane. The pane itself provides the landing's light stage look;
 * the hero is told to draw no field and no controls of its own.
 */
import React, { useState, type MutableRefObject } from "react";
import { MarketingHero3D, type HeroActions, type HeroState } from "../MarketingHero3D";
import { heroCorrectionScenes } from "../../lib/marketing-hero-scenes";

const SCENES = [heroCorrectionScenes[0]];

export function LearnStage3D({
  hidden,
  actionsRef,
  onState,
}: {
  hidden: boolean;
  actionsRef: MutableRefObject<HeroActions | null>;
  onState: (state: HeroState) => void;
}) {
  const [state, setState] = useState<HeroState | null>(null);
  const live = !!state?.live;
  const moved = !!state?.moved;
  return (
    <div className={`lrn-3d${hidden ? " is-hidden" : ""}`} aria-hidden={hidden || undefined}>
      <MarketingHero3D
        scenes={SCENES}
        field={false}
        controls="none"
        targetOverlay="always"
        onChange={(next) => {
          setState(next);
          onState(next);
        }}
        renderControls={(_state, actions) => {
          actionsRef.current = actions;
          return null;
        }}
      />
      <div className="lrn-3d-corner">
        {live && !moved && <span className="lrn-3d-hint">Drag to turn</span>}
        {moved && (
          <button
            type="button"
            className="lrn-pill lrn-pill-ghost lrn-pill-sm"
            onClick={() => actionsRef.current?.resetView()}
          >
            Reset view
          </button>
        )}
      </div>
    </div>
  );
}
