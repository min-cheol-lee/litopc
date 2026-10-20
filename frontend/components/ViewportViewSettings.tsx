"use client";

import React from "react";
import type { ColormapType } from "../lib/surface3d-types";
import { COLORMAP_THRESHOLD_MIN, COLORMAP_THRESHOLD_MAX } from "../lib/colormap-display";

type Toggle = { value: boolean; toggle: () => void; disabled?: boolean };
type CameraAxis = "azimuth" | "elevation" | "roll";

export function ViewportViewSettings(props: {
  palette: ColormapType;
  onPalette: (value: ColormapType) => void;
  colorRange: number;
  onColorRange: (value: number) => void;
  reference: boolean;
  intensity: Toggle;
  contour: Toggle;
  target: Toggle;
  legend: Toggle;
  rulers: Toggle;
  surface: Toggle;
  hasTarget: boolean;
  epe: "NONE" | "COLOR" | "ARROWS" | "BOTH";
  onEpe: (mode: "NONE" | "COLOR" | "ARROWS" | "BOTH") => void;
  rendered: boolean;
  onRendered: (value: boolean) => void;
  light: Toggle;
  camera: Record<CameraAxis, number>;
  onCamera: (axis: CameraAxis, value: number) => void;
  onCameraPreset: (preset: "ISO" | "FRONT" | "TOP") => void;
  background: "DARK" | "LIGHT";
  onBackground: (value: "DARK" | "LIGHT") => void;
  opacity: number;
  onOpacity: (value: number) => void;
  compareClean?: Toggle;
}) {
  const layer = (label: string, state: Toggle) => (
    <button key={label} type="button" className={`view-chip viewport-setting-toggle ${state.value ? "on" : ""}`}
      aria-pressed={state.value} disabled={state.disabled} onClick={state.toggle}>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="viewport-view-settings">
      <div className="viewport-settings-heading">View</div>
      <section className="viewport-settings-section">
        <label className="viewport-colormap-control">
          <span className="viewport-settings-label">Colormap</span>
          <select aria-label="Colormap for 2D and 3D" value={props.palette} disabled={props.reference}
            onChange={event => props.onPalette(event.target.value as ColormapType)}>
            <option value="apple">Spectrum</option>
            <option value="hot">Hot</option>
            <option value="grayscale">Grayscale</option>
            <option value="silver">Silver</option>
          </select>
        </label>
        <label className="viewport-setting-slider viewport-colormap-range" title="Upper color limit. Increase the range to reduce white saturation; 100% keeps the original mapping.">
          <span>Range</span>
          <input type="range" aria-label="Colormap range" min={COLORMAP_THRESHOLD_MIN} max={COLORMAP_THRESHOLD_MAX} step={.05}
            value={props.colorRange} disabled={props.reference} aria-valuetext={`${Math.round(props.colorRange * 100)}% upper color limit`}
            onChange={event => props.onColorRange(Number(event.target.value))} />
          <output>{Math.round(props.colorRange * 100)}%</output>
        </label>
        {props.reference && <p className="viewport-settings-note">Original Cosmic reference</p>}
      </section>
      <section className="viewport-settings-section">
        <span className="viewport-settings-label">Layers</span>
        <div className="viewport-setting-grid">
          {layer("Intensity", props.intensity)}{layer("Contour", props.contour)}
          {layer("Target", props.target)}{layer("Legend", props.legend)}
        </div>
      </section>
      <section className="viewport-settings-section">
        <span className="viewport-settings-label">EPE</span>
        <div className="viewport-segmented" role="group" aria-label="EPE overlay">
          {(["NONE", "COLOR", "ARROWS", "BOTH"] as const).map(mode => (
            <button key={mode} type="button" aria-pressed={props.epe === mode} disabled={!props.hasTarget}
              onClick={() => props.onEpe(mode)}>{mode === "NONE" ? "Off" : mode === "ARROWS" ? "Arrows" : mode === "BOTH" ? "Both" : "Color"}</button>
          ))}
        </div>
        {props.hasTarget && props.epe !== "NONE" && <div className="viewport-epe-scale" aria-label="EPE scale 0 to 12 nanometers"><i /><span>0</span><span>6</span><span>12+ nm</span></div>}
        {!props.hasTarget && <p className="viewport-settings-note">Simulate a pattern with a target to show EPE.</p>}
      </section>
      <section className="viewport-settings-section">
        <div className="viewport-settings-row"><span className="viewport-settings-label">3D</span>
          <button type="button" className="viewport-setting-link" aria-pressed={props.surface.value} onClick={props.surface.toggle} disabled={props.surface.disabled}>{props.surface.value ? "Hide panel" : "Show panel"}</button>
        </div>
        <div className="viewport-settings-row">
          <div className="viewport-segmented viewport-renderer-options" role="group" aria-label="3D rendering style">
            <button type="button" aria-pressed={props.rendered} onClick={() => props.onRendered(true)}>{props.reference ? "Cosmic ref" : "Rendered"}</button>
            <button type="button" aria-pressed={!props.rendered} onClick={() => props.onRendered(false)}>Classic</button>
          </div>
          <button type="button" className={`view-chip viewport-light-toggle ${props.light.value ? "on" : ""}`} aria-pressed={props.light.value}
            aria-label={props.light.value ? "Turn off light effect" : "Turn on light effect"} disabled={!props.rendered} onClick={props.light.toggle}>Light</button>
        </div>
        <details className="viewport-settings-foldout">
          <summary>Camera</summary>
          <div className="viewport-camera-presets">
            {(["ISO", "FRONT", "TOP"] as const).map(preset => <button key={preset} type="button" className="mini-btn slim" onClick={() => props.onCameraPreset(preset)}>{preset === "ISO" ? "Isometric" : preset === "FRONT" ? "Front" : "Top"}</button>)}
          </div>
          {(["azimuth", "elevation", "roll"] as const).map(axis => <label key={axis} className="viewport-setting-slider">
            <span>{axis === "azimuth" ? "Azimuth" : axis === "elevation" ? "Elevation" : "Roll"}</span>
            <input type="range" aria-label={`3D camera ${axis}`} min={axis === "elevation" ? -89 : -180} max={axis === "elevation" ? 89 : 180} value={props.camera[axis]} onChange={event => props.onCamera(axis, Number(event.target.value))} />
            <output>{props.camera[axis]}°</output>
          </label>)}
          <p className="viewport-settings-note">Drag to rotate · Shift + drag to pan</p>
        </details>
      </section>
      <details className="viewport-settings-foldout viewport-2d-settings">
        <summary>2D appearance</summary>
        <div className="viewport-segmented" role="group" aria-label="2D background">
          {(["DARK", "LIGHT"] as const).map(theme => <button key={theme} type="button" aria-pressed={props.background === theme} onClick={() => props.onBackground(theme)}>{theme === "DARK" ? "Dark" : "Light"}</button>)}
        </div>
        <label className="viewport-setting-slider"><span>Intensity</span><input type="range" aria-label="2D intensity opacity" min={.1} max={1} step={.05} value={props.opacity} onChange={event => props.onOpacity(Number(event.target.value))} /><output>{Math.round(props.opacity * 100)}%</output></label>
        {layer("Rulers", props.rulers)}
      </details>
      {props.compareClean && <section className="viewport-settings-section">{layer("Clean A/B overlay", props.compareClean)}</section>}
    </div>
  );
}
