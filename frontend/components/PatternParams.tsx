"use client";

import React, { useId, useState } from "react";
import type { PresetID, TemplateID } from "../lib/types";
import { patternForTemplateId, type ParamSpec } from "../lib/pattern-catalog";
import { templateParamDefaults } from "../lib/template-defaults";

// Styles: frontend/app/simulator-patterns.css (imported by the page, not here).

export type PatternParamsProps = {
  presetId: PresetID;
  templateId: TemplateID;
  params: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
};

function clampToSpec(spec: ParamSpec, raw: number): number {
  const bounded = Math.min(spec.max, Math.max(spec.min, raw));
  if (spec.step >= 1) return Math.round(bounded);
  const decimals = Math.min(6, Math.max(0, Math.ceil(-Math.log10(spec.step))));
  return Number(bounded.toFixed(decimals));
}

function formatValue(value: number, spec: ParamSpec): string {
  if (spec.step >= 1) return String(Math.round(value));
  return String(value);
}

function ParamRow({ spec, value, onCommit }: { spec: ParamSpec; value: number; onCommit: (next: number) => void }) {
  const inputId = useId();
  // Draft text lets the user type intermediate values (e.g. "1" on the way to "150") without being clamped.
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) onCommit(parsed);
    setDraft(null);
  };

  return (
    <div className="pat-param-row">
      <label className="pat-param-label" htmlFor={inputId}>{spec.label}</label>
      <input
        className="pat-param-range"
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        aria-label={spec.label}
        onChange={(event) => onCommit(Number(event.target.value))}
      />
      <input
        id={inputId}
        className="pat-param-number"
        type="number"
        inputMode="decimal"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={draft ?? formatValue(value, spec)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setDraft(null);
        }}
      />
      {spec.unit ? <span className="pat-param-unit">{spec.unit}</span> : <span className="pat-param-unit" />}
    </div>
  );
}

export function PatternParams({ presetId, templateId, params, onChange }: PatternParamsProps) {
  const entry = patternForTemplateId(templateId);
  if (!entry) return null;
  const specs = entry.params(presetId);
  const defaults = templateParamDefaults(templateId, presetId);

  const valueOf = (spec: ParamSpec): number => {
    const current = params[spec.key];
    if (Number.isFinite(current)) return current;
    const fallback = defaults[spec.key];
    return Number.isFinite(fallback) ? fallback : spec.min;
  };

  const commit = (spec: ParamSpec, raw: number) => {
    if (!Number.isFinite(raw)) return;
    const next = clampToSpec(spec, raw);
    if (next === valueOf(spec)) return;
    onChange({ ...params, [spec.key]: next });
  };

  return (
    <div className="pat-params">
      {specs.map((spec) => (
        <ParamRow key={spec.key} spec={spec} value={valueOf(spec)} onCommit={(raw) => commit(spec, raw)} />
      ))}
    </div>
  );
}

export default PatternParams;
