"use client";

import React, { useMemo, useState } from "react";
import type { PresetID, TemplateID } from "../lib/types";
import { PATTERN_CATALOG, type PatternEntry } from "../lib/pattern-catalog";
import { buildTemplateBaseShapes } from "../lib/template-mask";
import { templateParamDefaults } from "../lib/template-defaults";
import { normalizeTemplateId } from "../lib/template-variants";

// Styles: frontend/app/simulator-patterns.css (imported by the page, not here).

export type PatternPickerProps = {
  presetId: PresetID;
  plan: "FREE" | "PRO";
  value: TemplateID | null;
  custom: boolean;
  onSelect: (id: TemplateID) => void;
  onLocked: (id: TemplateID) => void;
  /** Opens the blank custom workspace (draw your own mask and target). */
  onCustom?: () => void;
};

const THUMB_FOV_NM = 1100;
/** The grid is two rows of four: seven pattern slots and the Custom tile. */
const VISIBLE_SLOTS = 7;
/** Patterns that live behind "More patterns" unless they are selected. */
const FOLDED_KEYS: ReadonlyArray<string> = ["tip-to-side"];

type Bounds = { x0: number; y0: number; x1: number; y1: number };

function thumbShapes(templateId: TemplateID, presetId: PresetID) {
  return buildTemplateBaseShapes(templateId, { ...templateParamDefaults(templateId, presetId), fov_nm: THUMB_FOV_NM });
}

function shapeBounds(shapes: ReturnType<typeof buildTemplateBaseShapes>): Bounds {
  const b: Bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const s of shapes) {
    b.x0 = Math.min(b.x0, s.x_nm);
    b.y0 = Math.min(b.y0, s.y_nm);
    b.x1 = Math.max(b.x1, s.x_nm + s.w_nm);
    b.y1 = Math.max(b.y1, s.y_nm + s.h_nm);
  }
  if (!Number.isFinite(b.x0)) return { x0: 0, y0: 0, x1: THUMB_FOV_NM, y1: THUMB_FOV_NM };
  return b;
}

/**
 * One frame per imaging family so the tiles share a scale: EUV patterns are
 * 4 to 5 times smaller than DUV ones and would vanish in a full-field thumbnail.
 */
function useFamilyFrameNm(presetId: PresetID): number {
  return useMemo(() => {
    let side = 0;
    for (const entry of PATTERN_CATALOG) {
      const id = entry.templateIdFor(presetId);
      const b = shapeBounds(thumbShapes(id, presetId));
      side = Math.max(side, b.x1 - b.x0, b.y1 - b.y0);
    }
    return Math.min(THUMB_FOV_NM, Math.max(200, side * 1.18));
  }, [presetId]);
}

function PatternThumbnail({ templateId, presetId, frameNm }: { templateId: TemplateID; presetId: PresetID; frameNm: number }) {
  const shapes = useMemo(() => thumbShapes(templateId, presetId), [templateId, presetId]);
  const b = shapeBounds(shapes);
  const cx = (b.x0 + b.x1) / 2;
  const cySvg = THUMB_FOV_NM - (b.y0 + b.y1) / 2;
  return (
    <svg className="pat-thumb" viewBox={`${cx - frameNm / 2} ${cySvg - frameNm / 2} ${frameNm} ${frameNm}`} aria-hidden="true" focusable="false">
      {shapes.map((shape, index) => (
        // Template space is y-up with the origin at the bottom-left; SVG is y-down.
        <rect
          key={index}
          x={shape.x_nm}
          y={THUMB_FOV_NM - shape.y_nm - shape.h_nm}
          width={shape.w_nm}
          height={shape.h_nm}
        />
      ))}
    </svg>
  );
}

export function PatternPicker({ presetId, plan, value, custom, onSelect, onLocked, onCustom }: PatternPickerProps) {
  const selectedId = custom ? null : normalizeTemplateId(value);
  const frameNm = useFamilyFrameNm(presetId);
  const [moreOpen, setMoreOpen] = useState(false);

  // Seven visible slots: the unfolded patterns in catalog order; a folded pattern
  // that is currently selected takes the last slot so the grid never grows a row.
  const { visible, folded } = useMemo(() => {
    const unfolded = PATTERN_CATALOG.filter((e) => !FOLDED_KEYS.includes(e.key));
    const foldedEntries = PATTERN_CATALOG.filter((e) => FOLDED_KEYS.includes(e.key));
    const vis: PatternEntry[] = unfolded.slice(0, VISIBLE_SLOTS);
    const selectedFolded = foldedEntries.find((e) => e.templateIdFor(presetId) === selectedId)
      ?? unfolded.slice(VISIBLE_SLOTS).find((e) => e.templateIdFor(presetId) === selectedId);
    if (selectedFolded) vis[VISIBLE_SLOTS - 1] = selectedFolded;
    const rest = PATTERN_CATALOG.filter((e) => !vis.includes(e));
    return { visible: vis, folded: rest };
  }, [presetId, selectedId]);

  const renderTile = (entry: PatternEntry, compact = false) => {
    const templateId = entry.templateIdFor(presetId);
    const locked = entry.tier === "PRO" && plan !== "PRO";
    const selected = selectedId === templateId;
    const activate = () => {
      if (locked) onLocked(templateId);
      else onSelect(templateId);
      setMoreOpen(false);
    };
    if (compact) {
      return (
        <button key={entry.key} type="button" className={`pat-more-item${selected ? " is-selected" : ""}`} onClick={activate} aria-pressed={selected}>
          <span className="pat-more-thumb"><PatternThumbnail templateId={templateId} presetId={presetId} frameNm={frameNm} /></span>
          <span className="pat-more-label">{entry.label}</span>
          {locked && <span className="pat-tag pat-tag--inline">Pro</span>}
        </button>
      );
    }
    return (
      <button
        key={entry.key}
        type="button"
        className={`pat-tile${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}`}
        aria-pressed={selected}
        aria-label={locked ? `${entry.label} (Pro)` : entry.label}
        title={entry.label}
        onClick={activate}
      >
        <span className="pat-tile-frame">
          <PatternThumbnail templateId={templateId} presetId={presetId} frameNm={frameNm} />
          {locked && <span className="pat-tag">Pro</span>}
        </span>
        <span className="pat-tile-label">{entry.shortLabel ?? entry.label}</span>
      </button>
    );
  };

  return (
    <div className="pat-picker">
      <div className="pat-grid" role="group" aria-label="Pattern">
        {visible.map((entry) => renderTile(entry))}
        {moreOpen && folded.map((entry) => renderTile(entry))}
        <button
          type="button"
          className={`pat-tile pat-tile--custom${custom ? " is-selected" : ""}`}
          aria-pressed={custom}
          aria-label="Custom: draw your own mask and target"
          title="Draw your own mask and target"
          onClick={() => { if (!custom) onCustom?.(); }}
        >
          <span className="pat-tile-frame pat-tile-frame--dashed">
            <svg className="pat-thumb pat-thumb--custom" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
              <rect x="8" y="10" width="20" height="12" rx="1.5" />
              <rect x="18" y="18" width="18" height="16" rx="1.5" />
              <path d="M31 9.5l3.5 3.5-9 9H22v-3.5z" />
            </svg>
          </span>
          <span className="pat-tile-label">Custom</span>
        </button>
      </div>
      {folded.length > 0 && (
        <div className="pat-more">
          <button type="button" className="pat-more-toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
            {moreOpen ? "Fewer patterns" : `More patterns (${folded.length})`}
            <span aria-hidden="true">{moreOpen ? "▴" : "▾"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default PatternPicker;
