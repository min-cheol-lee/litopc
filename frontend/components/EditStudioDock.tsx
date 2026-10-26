"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { MaskShape, Plan, TemplateID } from "../lib/types";
import type {
  CornerAnchor,
  EditorLayer,
  EditorTool,
  EdgeAnchor,
  SrafOrientation,
  TargetGuide,
} from "../lib/opc-workspace";
import { trackProductEvent } from "../lib/telemetry";
import { isLShapeOpcTemplate, isLShapeRawTemplate, normalizeTemplateId } from "../lib/template-variants";

function StudioToolIcon(props: { kind: "select" | "add" | "subtract" | "sraf" }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (props.kind === "select") {
    return (
      <svg className="workspace-tool-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 2.7 10.6 8 7.5 8.6 9.6 13.3 7.8 14 5.7 9.3 3.4 11z" {...stroke} />
      </svg>
    );
  }

  if (props.kind === "add") {
    return (
      <svg className="workspace-tool-icon" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.8" {...stroke} />
        <path d="M12 9.8v3.7M10.2 11.6h3.6" {...stroke} />
      </svg>
    );
  }

  if (props.kind === "subtract") {
    return (
      <svg className="workspace-tool-icon" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.8" {...stroke} />
        <path d="M10.2 11.6h3.6" {...stroke} />
      </svg>
    );
  }

  return (
    <svg className="workspace-tool-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 5h11M2.5 8h11M2.5 11h11" {...stroke} />
    </svg>
  );
}

function AssistActionIcon() {
  return (
    <svg className="workspace-assist-action-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.2v9.6M3.2 8h9.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function templateInspectorLabel(templateId: TemplateID) {
  const normalizedTemplateId = normalizeTemplateId(templateId) ?? templateId;
  switch (normalizedTemplateId) {
    case "ISO_LINE":
      return "Isolated Line";
    case "DENSE_LS":
      return "Dense L/S";
    case "CONTACT_RAW":
      return "Square";
    case "CONTACT_OPC_SERIF":
      return "Square OPC";
    case "L_CORNER_RAW_DUV":
      return "L-Shape (DUV)";
    case "L_CORNER_OPC_DUV":
      return "L-Shape OPC (DUV)";
    case "L_CORNER_RAW_EUV":
      return "L-Shape (EUV)";
    case "L_CORNER_OPC_EUV":
      return "L-Shape OPC (EUV)";
    case "STAIRCASE":
      return "Stepped Interconnect";
    case "STAIRCASE_OPC":
      return "Stepped Interconnect OPC";
    default:
      return "Pattern";
  }
}

export function EditStudioDock(props: {
  layout?: "full" | "side";
  plan: Plan;
  maskMode: "TEMPLATE" | "CUSTOM";
  activeEditLayer: EditorLayer;
  onSetActiveEditLayer: (v: EditorLayer) => void;
  editorTool: EditorTool;
  onSetEditorTool: (v: EditorTool) => void;
  templateId: TemplateID;
  params: Record<string, number>;
  setParams: (v: Record<string, number>) => void;
  targetTemplateId: TemplateID | null;
  targetParams: Record<string, number>;
  onSetTargetParams: (v: Record<string, number>) => void;
  targetCanUseGlobalInspector: boolean;
  targetGuide: TargetGuide | null;
  editableShapes: Array<MaskShape>;
  maskShapes: Array<MaskShape>;
  targetShapes: Array<MaskShape>;
  presetAnchorShapes: Array<Extract<MaskShape, { type: "rect" }>>;
  currentPresetFeatureRect: Extract<MaskShape, { type: "rect" }> | null;
  presetFeatureOverrideActive: boolean;
  onUpdatePresetFeatureRect: (rect: Extract<MaskShape, { type: "rect" }>) => void;
  onUpdatePresetFeatureRectAt?: (index: number, rect: Extract<MaskShape, { type: "rect" }>) => void;
  /** Resize a pattern feature through its pattern parameter when one exists; returns false to fall back to an override. */
  onPatternFeatureResize?: (index: number, rect: Extract<MaskShape, { type: "rect" }>) => boolean;
  onResetPresetFeatureRect: () => void;
  selectedPresetAnchorIndex: number;
  onSetSelectedPresetAnchorIndex: (i: number) => void;
  selectedCustomShapeIndex: number;
  selectedCustomShapeIndexes: number[];
  onSelectCustomShapeChip: (i: number, additive?: boolean) => void;
  onDeleteCustomShape: (i: number) => void;
  onUpdateCustomShape: (i: number, shape: MaskShape) => void;
  onAddHammerheadToSelected: () => void;
  onAddSerifToSelected: () => void;
  onAddMousebiteToSelected: () => void;
  hammerheadEdge: EdgeAnchor;
  onSetHammerheadEdge: (v: EdgeAnchor) => void;
  serifCorner: CornerAnchor;
  onSetSerifCorner: (v: CornerAnchor) => void;
  mousebiteEdge: EdgeAnchor;
  onSetMousebiteEdge: (v: EdgeAnchor) => void;
  srafOrientation: SrafOrientation;
  onSetSrafOrientation: (v: SrafOrientation) => void;
  freeCustomRectLimit: number;
  proCustomShapeLimit: number;
  customLimitReached: boolean;
  customLimitNotice: string | null;
  /** Shapes that count against the manual-edit limit (OPC output is excluded by the page). */
  manualShapeCount?: number;
  onCopyTargetToMask: () => void;
  onCopyMaskToTarget: () => void;
  onClearTargetLayer: () => void;
  onUpgradeIntent: (source: string) => void;
  /** Called when the user edits a global mask param while maskMode=CUSTOM; should reinitialise the mask from the template. */
  onReinitWithParams?: (nextParams?: Record<string, number>) => void;
  onLoadCustomExample?: () => void;
}) {
  const {
    layout = "full",
    plan,
    maskMode,
    activeEditLayer,
    onSetActiveEditLayer,
    editorTool,
    onSetEditorTool,
    templateId,
    params,
    setParams,
    targetTemplateId,
    targetParams,
    onSetTargetParams,
    targetCanUseGlobalInspector,
    targetGuide,
    editableShapes,
    maskShapes,
    targetShapes,
    presetAnchorShapes,
    currentPresetFeatureRect,
    presetFeatureOverrideActive,
    onUpdatePresetFeatureRect,
    onUpdatePresetFeatureRectAt,
    onPatternFeatureResize,
    onResetPresetFeatureRect,
    selectedPresetAnchorIndex,
    onSetSelectedPresetAnchorIndex,
    selectedCustomShapeIndex,
    selectedCustomShapeIndexes,
    onSelectCustomShapeChip,
    onDeleteCustomShape,
    onUpdateCustomShape,
    onAddHammerheadToSelected,
    onAddSerifToSelected,
    onAddMousebiteToSelected,
    hammerheadEdge,
    onSetHammerheadEdge,
    serifCorner,
    onSetSerifCorner,
    mousebiteEdge,
    onSetMousebiteEdge,
    srafOrientation,
    onSetSrafOrientation,
    freeCustomRectLimit,
    proCustomShapeLimit,
    customLimitReached,
    customLimitNotice,
    manualShapeCount,
    onCopyTargetToMask,
    onCopyMaskToTarget,
    onClearTargetLayer,
    onUpgradeIntent,
    onReinitWithParams,
    onLoadCustomExample,
  } = props;

  const targetEditing = activeEditLayer === "TARGET";
  const canUseSubtractTools = !targetEditing;
  const presetAnchorAvailable = maskMode === "TEMPLATE" && !targetEditing && presetAnchorShapes.length > 0;
  const manualSelectionCount = selectedCustomShapeIndexes.length > 0
    ? selectedCustomShapeIndexes.length
    : (selectedCustomShapeIndex >= 0 ? 1 : 0);
  const hasManualSelection = manualSelectionCount > 0;
  const hasPresetSelection =
    presetAnchorAvailable &&
    !hasManualSelection &&
    selectedPresetAnchorIndex >= 0 &&
    selectedPresetAnchorIndex < presetAnchorShapes.length;
  const selectedManualIndex = selectedCustomShapeIndexes.length === 1
    ? selectedCustomShapeIndexes[0]
    : selectedCustomShapeIndex;
  const selectedShape = selectedManualIndex >= 0 ? editableShapes[selectedManualIndex] ?? null : null;
  const hasMultiManualSelection = manualSelectionCount > 1;
  const hasSingleManualSelection =
    !hasMultiManualSelection &&
    selectedManualIndex >= 0 &&
    !!selectedShape;
  const manualSelectedRect = hasSingleManualSelection && selectedShape?.type === "rect" ? selectedShape : null;
  const editingPresetFeature =
    maskMode === "TEMPLATE" &&
    !hasManualSelection &&
    !manualSelectedRect &&
    !!currentPresetFeatureRect;
  const selectedRect = manualSelectedRect ?? (editingPresetFeature ? currentPresetFeatureRect : null);
  const fovNm = params.fov_nm ?? 1100;
  const maxRectX = selectedRect ? Math.max(0, fovNm - selectedRect.w_nm) : fovNm;
  const maxRectY = selectedRect ? Math.max(0, fovNm - selectedRect.h_nm) : fovNm;
  const inspectorTemplateId = targetEditing ? (targetTemplateId ?? templateId) : templateId;
  const inspectorParams = targetEditing ? targetParams : params;
  const activeInspectorTemplateId = inspectorTemplateId ?? templateId;
  const steppedTemplate = inspectorTemplateId === "STAIRCASE" || inspectorTemplateId === "STAIRCASE_OPC";
  const squareTemplate = inspectorTemplateId === "CONTACT_RAW" || inspectorTemplateId === "CONTACT_OPC_SERIF";
  // Global inspector is available whenever a template is selected.
  // For mask: always enabled (not just in TEMPLATE mode) so users can see and adjust
  // template-wide dims after OPC has run (maskMode="CUSTOM"). Changing a global param
  // in CUSTOM mode updates the template params state for the next Reinitialize without
  // overwriting the current OPC mask.
  // For target: delegated to targetCanUseGlobalInspector (see page.tsx).
  const canUseGlobalInspector = targetEditing ? targetCanUseGlobalInspector : true;
  const [inspectorScope, setInspectorScope] = useState<"LOCAL" | "GLOBAL">("LOCAL");
  const globalInspector = canUseGlobalInspector && inspectorScope === "GLOBAL";
  const dockMeta = useMemo(() => "Workspace", []);
  useEffect(() => {
    if (!canUseGlobalInspector && inspectorScope !== "LOCAL") {
      setInspectorScope("LOCAL");
    }
  }, [canUseGlobalInspector, inspectorScope]);
  // When mask switches to CUSTOM mode (e.g. after OPC runs), auto-switch inspector to
  // GLOBAL so template dims are immediately visible instead of the empty "select a rect" state.
  // When switching back to TEMPLATE mode (Reinitialize), keep the user's last scope choice.
  useEffect(() => {
    if (!targetEditing && maskMode === "CUSTOM") {
      setInspectorScope("GLOBAL");
    }
  }, [maskMode, targetEditing]);
  const inspectorChip = useMemo(() => {
    if (globalInspector) {
      return {
        label: templateInspectorLabel(activeInspectorTemplateId),
        kind: "template" as const,
        title: targetEditing ? "Target-wide parameters" : "Pattern-wide parameters",
      };
    }
    if (hasMultiManualSelection) {
      return {
        label: `${manualSelectionCount} ${targetEditing ? "targets" : "edits"}`,
        kind: "multi" as const,
        title: targetEditing ? "Multiple target shapes selected" : "Multiple manual edits selected",
      };
    }
    if (editingPresetFeature) {
      return {
        label: `M${selectedPresetAnchorIndex + 1}`,
        kind: "preset" as const,
        title: `${activeEditLayer === "TARGET" ? "Target" : "Mask"} feature M${selectedPresetAnchorIndex + 1}`,
      };
    }
    if (manualSelectedRect && selectedManualIndex >= 0) {
      if (targetEditing) {
        return {
          label: `T${selectedManualIndex + 1}`,
          kind: "target" as const,
          title: `Target shape T${selectedManualIndex + 1}`,
        };
      }
      const prefix = manualSelectedRect.op === "subtract" ? "-" : "+";
      return {
        label: `${prefix}R${selectedManualIndex + 1}`,
        kind: manualSelectedRect.op === "subtract" ? "subtract" as const : "manual" as const,
        title: manualSelectedRect.op === "subtract" ? "Subtract edit" : "Add edit",
      };
    }
    return { label: "Template", kind: "template" as const, title: targetEditing ? "Target defaults" : "Template defaults" };
  }, [globalInspector, activeInspectorTemplateId, hasMultiManualSelection, manualSelectionCount, editingPresetFeature, selectedPresetAnchorIndex, activeEditLayer, manualSelectedRect, selectedManualIndex, targetEditing]);

  const isManualShapeSelected = (index: number) =>
    selectedCustomShapeIndexes.includes(index)
    || (selectedCustomShapeIndexes.length === 0 && selectedCustomShapeIndex === index);

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  function setParam(key: string, v: number) {
    if (targetEditing) {
      onSetTargetParams({ ...inspectorParams, [key]: v });
      return;
    }
    const next = { ...params, [key]: v };
    setParams(next);
    // In CUSTOM mode (e.g. after OPC), a global-inspector param change reinitialises
    // the mask from the template with the new value so the canvas responds immediately.
    if (maskMode === "CUSTOM") onReinitWithParams?.(next);
  }

  function requestUpgrade(source: string) {
    trackProductEvent("upgrade_prompt_clicked", { source, fromPlan: plan });
    onUpgradeIntent(source);
  }

  function setCd(v: number) {
    const bounded = clamp(v, 1, 900);
    if (manualSelectedRect && selectedManualIndex >= 0) {
      const nextW = bounded;
      const cx = selectedRect.x_nm + selectedRect.w_nm * 0.5;
      const nextX = clamp(cx - nextW * 0.5, 0, Math.max(0, fovNm - nextW));
      onUpdateCustomShape(selectedManualIndex, { ...selectedRect, x_nm: nextX, w_nm: nextW });
      return;
    }
    if (editingPresetFeature && selectedRect) {
      const nextW = bounded;
      const cx = selectedRect.x_nm + selectedRect.w_nm * 0.5;
      const nextX = clamp(cx - nextW * 0.5, 0, Math.max(0, fovNm - nextW));
      onUpdatePresetFeatureRect({ ...selectedRect, x_nm: nextX, w_nm: nextW });
      return;
    }
    const next: Record<string, number> = { ...params, cd_nm: bounded };
    if (steppedTemplate) next.thickness_nm = bounded;
    if (squareTemplate) next.w_nm = bounded;
    setParams(next);
  }

  function setHeight(v: number) {
    const bounded = clamp(v, 1, 900);
    if (manualSelectedRect && selectedManualIndex >= 0) {
      const nextH = bounded;
      const cy = selectedRect.y_nm + selectedRect.h_nm * 0.5;
      const nextY = clamp(cy - nextH * 0.5, 0, Math.max(0, fovNm - nextH));
      onUpdateCustomShape(selectedManualIndex, { ...selectedRect, y_nm: nextY, h_nm: nextH });
      return;
    }
    if (editingPresetFeature && selectedRect) {
      const nextH = bounded;
      const cy = selectedRect.y_nm + selectedRect.h_nm * 0.5;
      const nextY = clamp(cy - nextH * 0.5, 0, Math.max(0, fovNm - nextH));
      onUpdatePresetFeatureRect({ ...selectedRect, y_nm: nextY, h_nm: nextH });
      return;
    }
    if (steppedTemplate) {
      setParam("step_h_nm", bounded);
      return;
    }
    setParam("length_nm", bounded);
  }

  function setGlobalWidth(v: number) {
    const bounded = clamp(v, 1, 900);
    const next = { ...inspectorParams };
    if (squareTemplate) {
      next.w_nm = bounded;
      next.cd_nm = bounded;
    } else if (steppedTemplate) {
      next.thickness_nm = bounded;
      next.cd_nm = bounded;
    } else {
      next.cd_nm = bounded;
    }
    if (targetEditing) {
      onSetTargetParams(next);
      return;
    }
    setParams(next);
    if (maskMode === "CUSTOM") onReinitWithParams?.(next);
  }

  function setGlobalHeight(v: number) {
    const bounded = clamp(v, 1, 900);
    if (steppedTemplate) {
      setParam("step_h_nm", bounded);
      return;
    }
    setParam("length_nm", bounded);
  }

  function setRectAxis(axis: "x" | "y", next: number) {
    if (!selectedRect) return;
    if (editingPresetFeature) {
      if (axis === "x") {
        onUpdatePresetFeatureRect({ ...selectedRect, x_nm: clamp(next, 0, maxRectX) });
        return;
      }
      onUpdatePresetFeatureRect({ ...selectedRect, y_nm: clamp(next, 0, maxRectY) });
      return;
    }
    if (!manualSelectedRect || selectedManualIndex < 0) return;
    if (axis === "x") {
      onUpdateCustomShape(selectedManualIndex, { ...selectedRect, x_nm: clamp(next, 0, maxRectX) });
      return;
    }
    onUpdateCustomShape(selectedManualIndex, { ...selectedRect, y_nm: clamp(next, 0, maxRectY) });
  }

  function renderInspectorControl(
    label: string,
    value: number,
    onChange: (next: number) => void,
    min: number,
    max: number,
    step = 1,
  ) {
    return (
      <div className="inspector-control-row">
        <span className="inspector-control-label">{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="inspector-control-slider"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Math.round(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="inspector-control-number"
        />
      </div>
    );
  }

  return (
    <div className={`workspace-edit-dock ${layout === "side" ? "workspace-edit-dock-side-layout" : ""}`}>
      <div className="workspace-edit-dock-head">
        <div className="workspace-edit-dock-eyebrow">Edit</div>
        <div className="workspace-layer-toggle workspace-layer-toggle-inline" role="group" aria-label="Layer">
          <button
            className={activeEditLayer === "MASK" ? "is-active" : ""}
            onClick={() => onSetActiveEditLayer("MASK")}
            disabled={activeEditLayer === "MASK"}
          >
            Mask
          </button>
          <button
            className={activeEditLayer === "TARGET" ? "is-active" : ""}
            onClick={() => onSetActiveEditLayer("TARGET")}
            disabled={activeEditLayer === "TARGET"}
          >
            Target{targetShapes.length === 0 && activeEditLayer !== "TARGET" && (
              <span className="layer-tab-dot" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {maskMode === "CUSTOM" && editableShapes.length === 0 && (
        <div className="workspace-guide" role="note">
          <div className="workspace-guide-title">Draw your own {targetEditing ? "target" : "mask"}</div>
          <ol className="workspace-guide-steps">
            <li>Choose <b>Add</b>, then drag on the canvas to draw a rectangle.</li>
            <li>Drag a corner to resize, or type a size in the list below. Arrow keys nudge, <b>Delete</b> removes.</li>
            <li>Switch to <b>Target</b> for the shape you want printed, then Simulate.</li>
          </ol>
          {onLoadCustomExample && (
            <button type="button" className="mini-btn workspace-guide-example" onClick={onLoadCustomExample}>Load an example</button>
          )}
        </div>
      )}

      <div className="workspace-studio-block workspace-tools-block">
        <div className="draw-action-row workspace-tool-grid workspace-tool-grid-compact">
          <button
            className={`mini-btn draw-action workspace-tool-button ${editorTool === "SELECT" ? "active-draw-btn" : ""}`}
            onClick={() => onSetEditorTool("SELECT")}
            title="Select and move shapes"
            aria-label="Select"
          >
            <StudioToolIcon kind="select" />
            <span>Select</span>
          </button>
          <button
            className={`mini-btn draw-action workspace-tool-button ${editorTool === "DRAW_ADD_RECT" ? "active-draw-btn" : ""}`}
            onClick={() => onSetEditorTool(editorTool === "DRAW_ADD_RECT" ? "SELECT" : "DRAW_ADD_RECT")}
            title="Draw a rectangle to add"
            aria-label="Add rectangle"
          >
            <StudioToolIcon kind="add" />
            <span>Add</span>
          </button>
          <button
            className={`mini-btn draw-action workspace-tool-button ${editorTool === "DRAW_SUBTRACT_RECT" ? "active-draw-btn" : ""}`}
            onClick={() => onSetEditorTool(editorTool === "DRAW_SUBTRACT_RECT" ? "SELECT" : "DRAW_SUBTRACT_RECT")}
            disabled={!canUseSubtractTools}
            title={canUseSubtractTools ? "Draw a rectangle to cut out" : "The target layer is additive only"}
            aria-label="Subtract rectangle"
          >
            <StudioToolIcon kind="subtract" />
            <span>Sub</span>
          </button>
        </div>
        <div className="workspace-tips">Drag on the canvas to draw · drag corners to resize · arrows nudge · Delete removes</div>
      </div>

      <div className="workspace-studio-block">
        <div className="workspace-mini-head">
          <span>{targetEditing ? "Target shapes" : "Mask shapes"}</span>
          <span>
            {presetAnchorAvailable
              ? `${presetAnchorShapes.length} from pattern · ${manualShapeCount ?? editableShapes.length}/${plan === "FREE" ? freeCustomRectLimit : proCustomShapeLimit} edits`
              : `${manualShapeCount ?? editableShapes.length}/${plan === "FREE" ? freeCustomRectLimit : proCustomShapeLimit} used`}
          </span>
        </div>
        {(customLimitReached || customLimitNotice) && !targetEditing && (
          <div className="upgrade-inline-wrap">
            <div className="small-note tiny-note">
              {customLimitNotice
                ? customLimitNotice
                : (plan === "FREE"
                    ? `Free limit: ${freeCustomRectLimit} manual shapes per layer.`
                    : `Edit capacity reached (${proCustomShapeLimit}).`)}
            </div>
            {plan === "FREE" && customLimitReached && (
              <button className="mini-btn slim upgrade-inline-cta" onClick={() => requestUpgrade("custom_shape_limit")}>
                Upgrade
              </button>
            )}
          </div>
        )}
        <div className="ws-shapes" role="list">
          <div className="ws-shape-row ws-shape-row--head" aria-hidden="true">
            <span />
            <span>Width</span>
            <span>Height</span>
            <span />
          </div>
          {presetAnchorAvailable && presetAnchorShapes.map((rect, i) => {
            const overridden = presetFeatureOverrideActive && selectedPresetAnchorIndex === i;
            const selected = hasPresetSelection && selectedPresetAnchorIndex === i;
            const update = (next: Extract<MaskShape, { type: "rect" }>) => {
              if (onPatternFeatureResize?.(i, next)) return;
              if (onUpdatePresetFeatureRectAt) onUpdatePresetFeatureRectAt(i, next);
              else { onSetSelectedPresetAnchorIndex(i); onUpdatePresetFeatureRect(next); }
            };
            return (
              <div key={`anchor-${i}`} className={`ws-shape-row ${selected ? "is-selected" : ""}`} role="listitem">
                <button type="button" className="ws-shape-name" onClick={() => onSetSelectedPresetAnchorIndex(i)} title="Pattern feature: select to move it on the canvas">
                  M{i + 1}
                </button>
                <input
                  type="number"
                  className="ws-dim"
                  aria-label={`M${i + 1} width (nm)`}
                  value={Math.round(rect.w_nm)}
                  min={1}
                  max={fovNm}
                  onChange={(e) => {
                    const w = clamp(Number(e.target.value) || 1, 1, fovNm);
                    const cx = rect.x_nm + rect.w_nm / 2;
                    update({ ...rect, w_nm: w, x_nm: clamp(cx - w / 2, 0, Math.max(0, fovNm - w)) });
                  }}
                />
                <input
                  type="number"
                  className="ws-dim"
                  aria-label={`M${i + 1} height (nm)`}
                  value={Math.round(rect.h_nm)}
                  min={1}
                  max={fovNm}
                  onChange={(e) => {
                    const h = clamp(Number(e.target.value) || 1, 1, fovNm);
                    const cy = rect.y_nm + rect.h_nm / 2;
                    update({ ...rect, h_nm: h, y_nm: clamp(cy - h / 2, 0, Math.max(0, fovNm - h)) });
                  }}
                />
                {overridden ? (
                  <button type="button" className="ws-shape-action" onClick={onResetPresetFeatureRect} title="Reset this feature to the pattern" aria-label={`Reset M${i + 1}`}>↺</button>
                ) : <span className="ws-shape-action ws-shape-action--none" aria-hidden="true" />}
              </div>
            );
          })}
          {editableShapes.map((shape, i) => {
            const label = targetEditing ? `T${i + 1}` : `${shape.op === "subtract" ? "−" : "+"}R${i + 1}`;
            const rect = shape.type === "rect" ? shape : null;
            return (
              <div key={`shape-${i}`} className={`ws-shape-row ${isManualShapeSelected(i) ? "is-selected" : ""}`} role="listitem">
                <button
                  type="button"
                  className="ws-shape-name"
                  onClick={(e) => onSelectCustomShapeChip(i, e.shiftKey || e.ctrlKey || e.metaKey)}
                  title="Select (shift-click to add to the selection)"
                >
                  {label}
                </button>
                {rect ? (
                  <>
                    <input
                      type="number"
                      className="ws-dim"
                      aria-label={`${label} width (nm)`}
                      value={Math.round(rect.w_nm)}
                      min={1}
                      max={fovNm}
                      onChange={(e) => {
                        const w = clamp(Number(e.target.value) || 1, 1, fovNm);
                        const cx = rect.x_nm + rect.w_nm / 2;
                        onUpdateCustomShape(i, { ...rect, w_nm: w, x_nm: clamp(cx - w / 2, 0, Math.max(0, fovNm - w)) });
                      }}
                    />
                    <input
                      type="number"
                      className="ws-dim"
                      aria-label={`${label} height (nm)`}
                      value={Math.round(rect.h_nm)}
                      min={1}
                      max={fovNm}
                      onChange={(e) => {
                        const h = clamp(Number(e.target.value) || 1, 1, fovNm);
                        const cy = rect.y_nm + rect.h_nm / 2;
                        onUpdateCustomShape(i, { ...rect, h_nm: h, y_nm: clamp(cy - h / 2, 0, Math.max(0, fovNm - h)) });
                      }}
                    />
                  </>
                ) : (
                  <span className="ws-shape-poly">polygon</span>
                )}
                <button type="button" className="ws-shape-action" onClick={() => onDeleteCustomShape(i)} title="Delete" aria-label={`Delete ${label}`}>×</button>
              </div>
            );
          })}
          {!presetAnchorAvailable && editableShapes.length === 0 && (
            <div className="workspace-empty-chip">{targetEditing ? "No target shapes yet" : "No shapes yet"}</div>
          )}
        </div>
        {selectedRect && !hasMultiManualSelection && (
          <div className="ws-position">
            <span className="ws-position-label">Position</span>
            <label className="ws-position-field">
              <span>X</span>
              <input type="number" className="ws-dim" aria-label="X (nm)" value={Math.round(clamp(selectedRect.x_nm, 0, Math.max(1, maxRectX)))} min={0} max={Math.max(1, maxRectX)} onChange={(e) => setRectAxis("x", Number(e.target.value) || 0)} />
            </label>
            <label className="ws-position-field">
              <span>Y</span>
              <input type="number" className="ws-dim" aria-label="Y (nm)" value={Math.round(clamp(selectedRect.y_nm, 0, Math.max(1, maxRectY)))} min={0} max={Math.max(1, maxRectY)} onChange={(e) => setRectAxis("y", Number(e.target.value) || 0)} />
            </label>
            <span className="ws-position-unit">nm</span>
          </div>
        )}
        {hasMultiManualSelection && (
          <div className="workspace-tips">Several shapes selected: drag or use the arrow keys to move them together.</div>
        )}
        <div className="workspace-layer-actions ws-layer-actions">
          <button className="layer-action-btn" onClick={onCopyMaskToTarget} title="Copy the mask shapes into the Target layer">
            <span>Mask</span><span className="layer-action-arrow">→</span><span>Target</span>
          </button>
          <button className="layer-action-btn" onClick={onCopyTargetToMask} title="Copy the target shapes back into the Mask layer" disabled={targetShapes.length === 0}>
            <span>Target</span><span className="layer-action-arrow">→</span><span>Mask</span>
          </button>
          <button className="layer-action-btn danger" onClick={onClearTargetLayer} title="Remove every target shape" disabled={targetShapes.length === 0}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
            Clear target
          </button>
        </div>
      </div>

      {targetEditing && targetCanUseGlobalInspector && (
        <details className="workspace-foldout" open>
          <summary>Target pattern <span className="workspace-foldout-hint">regenerates every target shape</span></summary>
          <div className="workspace-foldout-body">
                {!targetEditing && maskMode === "CUSTOM" && (
                  <div className="small-note tiny-note workspace-inspector-note" style={{ marginBottom: 6 }}>
                    Template dims — changes apply on Reinitialize.
                  </div>
                )}
                {(activeInspectorTemplateId === "ISO_LINE" || activeInspectorTemplateId === "DENSE_LS") && renderInspectorControl(
                  "Width (nm)",
                  inspectorParams.cd_nm ?? 100,
                  (next) => setGlobalWidth(next),
                  1,
                  900,
                )}
                {(activeInspectorTemplateId === "ISO_LINE" || activeInspectorTemplateId === "DENSE_LS") && renderInspectorControl(
                  "Height (nm)",
                  inspectorParams.length_nm ?? 900,
                  (next) => setGlobalHeight(next),
                  10,
                  900,
                )}
                {activeInspectorTemplateId === "DENSE_LS" && renderInspectorControl(
                  "Pitch (nm)",
                  inspectorParams.pitch_nm ?? 140,
                  (next) => setParam("pitch_nm", next),
                  60,
                  300,
                )}

                {(activeInspectorTemplateId === "CONTACT_RAW" || activeInspectorTemplateId === "CONTACT_OPC_SERIF") && renderInspectorControl(
                  "Side (nm)",
                  inspectorParams.w_nm ?? inspectorParams.cd_nm ?? 100,
                  (next) => {
                    const bounded = clamp(next, 1, 900);
                    if (targetEditing) {
                      onSetTargetParams({ ...inspectorParams, w_nm: bounded, cd_nm: bounded });
                      return;
                    }
                    setParams({ ...params, w_nm: bounded, cd_nm: bounded });
                  },
                  1,
                  900,
                )}
                {activeInspectorTemplateId === "CONTACT_OPC_SERIF" && renderInspectorControl(
                  "Serif Size (nm)",
                  inspectorParams.serif_nm ?? 28,
                  (next) => setParam("serif_nm", next),
                  5,
                  200,
                )}

                {(isLShapeRawTemplate(activeInspectorTemplateId) || isLShapeOpcTemplate(activeInspectorTemplateId)) && renderInspectorControl(
                  "Width (nm)",
                  inspectorParams.cd_nm ?? 92,
                  (next) => setGlobalWidth(next),
                  1,
                  300,
                )}
                {(isLShapeRawTemplate(activeInspectorTemplateId) || isLShapeOpcTemplate(activeInspectorTemplateId)) && renderInspectorControl(
                  "Horizontal Arm (nm)",
                  inspectorParams.length_nm ?? 470,
                  (next) => setParam("length_nm", next),
                  80,
                  900,
                )}
                {(isLShapeRawTemplate(activeInspectorTemplateId) || isLShapeOpcTemplate(activeInspectorTemplateId)) && renderInspectorControl(
                  "Vertical Arm (nm)",
                  inspectorParams.arm_nm ?? 432,
                  (next) => setParam("arm_nm", next),
                  80,
                  900,
                )}
                {isLShapeOpcTemplate(activeInspectorTemplateId) && renderInspectorControl(
                  "Serif Size (nm)",
                  inspectorParams.serif_nm ?? 18,
                  (next) => setParam("serif_nm", next),
                  5,
                  200,
                )}

                {(activeInspectorTemplateId === "STAIRCASE" || activeInspectorTemplateId === "STAIRCASE_OPC") && renderInspectorControl(
                  "Track Width (nm)",
                  inspectorParams.thickness_nm ?? inspectorParams.cd_nm ?? 88,
                  (next) => {
                    const bounded = clamp(next, 1, 400);
                    if (targetEditing) {
                      onSetTargetParams({ ...inspectorParams, thickness_nm: bounded, cd_nm: bounded });
                      return;
                    }
                    setParams({ ...params, thickness_nm: bounded, cd_nm: bounded });
                  },
                  1,
                  400,
                )}
                {(activeInspectorTemplateId === "STAIRCASE" || activeInspectorTemplateId === "STAIRCASE_OPC") && renderInspectorControl(
                  "Step Run (nm)",
                  inspectorParams.step_w_nm ?? 180,
                  (next) => setParam("step_w_nm", next),
                  30,
                  400,
                )}
                {(activeInspectorTemplateId === "STAIRCASE" || activeInspectorTemplateId === "STAIRCASE_OPC") && renderInspectorControl(
                  "Step Rise (nm)",
                  inspectorParams.step_h_nm ?? 110,
                  (next) => setParam("step_h_nm", next),
                  20,
                  300,
                )}
                {activeInspectorTemplateId === "STAIRCASE_OPC" && renderInspectorControl(
                  "Corner Pad (nm)",
                  inspectorParams.serif_nm ?? 18,
                  (next) => setParam("serif_nm", next),
                  5,
                  120,
                )}
          </div>
        </details>
      )}

      {!targetEditing && (
        <details className="workspace-foldout">
          <summary>Assist shapes <span className="workspace-foldout-hint">hammerhead · serif · mousebite · SRAF</span></summary>
          <div className="workspace-foldout-body">
            <div className="workspace-tips">Select a mask shape first, then add the assist to its edge or corner.</div>
                <div className="workspace-field-grid workspace-field-grid-wide">
                  <div className="workspace-field">
                    <label className="label">Hammerhead Edge</label>
                    <div className="workspace-assist-inline">
                      <select value={hammerheadEdge} onChange={(e) => onSetHammerheadEdge(e.target.value as EdgeAnchor)} style={{ width: "100%" }}>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                      </select>
                      <button
                        className="mini-btn slim workspace-assist-icon-btn"
                        onClick={onAddHammerheadToSelected}
                        disabled={(maskMode === "CUSTOM" && !selectedRect) || (maskMode === "TEMPLATE" && !presetAnchorAvailable)}
                        title="Add a hammerhead using the selected edge."
                        aria-label="Add hammerhead"
                      >
                        <AssistActionIcon />
                      </button>
                    </div>
                  </div>
                  <div className="workspace-field">
                    <label className="label">Serif Corner</label>
                    <div className="workspace-assist-inline">
                      <select value={serifCorner} onChange={(e) => onSetSerifCorner(e.target.value as CornerAnchor)} style={{ width: "100%" }}>
                        <option value="nw">Top Left</option>
                        <option value="ne">Top Right</option>
                        <option value="sw">Bottom Left</option>
                        <option value="se">Bottom Right</option>
                      </select>
                      <button
                        className="mini-btn slim workspace-assist-icon-btn"
                        onClick={onAddSerifToSelected}
                        disabled={(maskMode === "CUSTOM" && !selectedRect) || (maskMode === "TEMPLATE" && !presetAnchorAvailable)}
                        title="Add a serif at the selected corner."
                        aria-label="Add serif"
                      >
                        <AssistActionIcon />
                      </button>
                    </div>
                  </div>
                  <div className="workspace-field">
                    <label className="label">Mousebite Edge</label>
                    <div className="workspace-assist-inline">
                      <select value={mousebiteEdge} onChange={(e) => onSetMousebiteEdge(e.target.value as EdgeAnchor)} style={{ width: "100%" }}>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                      </select>
                      <button
                        className="mini-btn slim workspace-assist-icon-btn"
                        onClick={onAddMousebiteToSelected}
                        disabled={(maskMode === "CUSTOM" && !selectedRect) || (maskMode === "TEMPLATE" && !presetAnchorAvailable)}
                        title="Cut a mousebite on the selected edge."
                        aria-label="Add mousebite"
                      >
                        <AssistActionIcon />
                      </button>
                    </div>
                  </div>
                  <div className="workspace-field">
                    <label className="label">SRAF Orientation</label>
                    <div className="workspace-assist-inline">
                      <select value={srafOrientation} onChange={(e) => onSetSrafOrientation(e.target.value as SrafOrientation)} style={{ width: "100%" }}>
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                      <button
                        className={`mini-btn slim workspace-assist-icon-btn ${editorTool === "PLACE_SRAF" ? "active" : ""}`}
                        onClick={() => onSetEditorTool(editorTool === "PLACE_SRAF" ? "SELECT" : "PLACE_SRAF")}
                        disabled={targetEditing}
                        title="Place an assist bar using the selected orientation."
                        aria-label="Place assist bar"
                      >
                        <AssistActionIcon />
                      </button>
                    </div>
                  </div>
                </div>
          </div>
        </details>
      )}
    </div>
  );
}
