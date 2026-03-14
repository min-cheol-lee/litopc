"use client";

import React, { useCallback, useState } from "react";
import { Viewport } from "../../../components/Viewport";
import LearnStepPanel, { type LearnStep } from "../../../components/LearnStepPanel";
import type { SimRequest, SimResponse, MaskShape } from "../../../lib/types";
import type { OpcIterResult } from "../../../lib/opc-correction";
import { runOpcCorrection } from "../../../lib/opc-correction";
import { getPresetTargetGuide, cloneMaskShapes } from "../../../lib/opc-workspace";
import { getApiBase } from "../../../lib/api-base";
import { clientHeaders } from "../../../lib/usage";
import { buildTemplateBaseShapes } from "../../../lib/template-mask";


const LEARN_TEMPLATE_ID = "L_CORNER_RAW_DUV" as const;
const LEARN_PRESET_ID   = "DUV_193_DRY" as const;
const LEARN_PARAMS: Record<string, number> = { fov_nm: 1100 };

function buildLearnReq(maskShapes?: MaskShape[]): SimRequest {
  const base: SimRequest = {
    plan: "FREE",
    grid: 512,
    preset_id: LEARN_PRESET_ID,
    dose: 0.5,
    focus: 0,
    return_intensity: true,
    mask: {
      mode: "TEMPLATE",
      template_id: LEARN_TEMPLATE_ID,
      params_nm: LEARN_PARAMS,
    },
  };
  if (maskShapes) {
    return {
      ...base,
      mask: {
        mode: "CUSTOM",
        template_id: LEARN_TEMPLATE_ID,
        params_nm: LEARN_PARAMS,
        shapes: maskShapes,
        target_shapes: cloneMaskShapes(
          getPresetTargetGuide(LEARN_TEMPLATE_ID, LEARN_PRESET_ID, LEARN_PARAMS).targetShapes,
        ),
      },
    };
  }
  return base;
}

async function runSim(req: SimRequest): Promise<SimResponse> {
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...clientHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Simulation failed: ${res.status}`);
  return res.json() as Promise<SimResponse>;
}

// Steps: 0=Mask, 1=AerialImage, 2=EPE+OPC
export default function LearnPage() {
  const [step, setStep]             = useState<LearnStep>(0);
  const [loading, setLoading]       = useState(false);
  const [opcRunning, setOpcRunning] = useState(false);
  const [opcProgress, setOpcProgress] = useState<OpcIterResult[]>([]);

  const [req, setReq]           = useState<SimRequest>(buildLearnReq());
  const [sim, setSim]           = useState<SimResponse | null>(null);
  const [maskShapes, setMaskShapes] = useState<MaskShape[]>(() =>
    buildTemplateBaseShapes(LEARN_TEMPLATE_ID, LEARN_PARAMS),
  );
  const [targetGuide] = useState(() =>
    getPresetTargetGuide(LEARN_TEMPLATE_ID, LEARN_PRESET_ID, LEARN_PARAMS),
  );

  const handleNextStep = useCallback(async () => {
    if (step === 0) {
      // Step 0 → 1: run simulation, stay on step 1 when done
      setLoading(true);
      setStep(1);
      try {
        const r = await runSim(req);
        setSim(r);
      } catch (e) {
        console.error("Simulation error:", e);
      } finally {
        setLoading(false);
      }
    } else if (step === 1) {
      // Step 1 → 2: advance to EPE step
      setStep(2);
    } else if (step === 2) {
      // Step 2 → 3: start OPC and advance
      setStep(3);
      setOpcRunning(true);
      setOpcProgress([]);
      try {
        const currentMaskShapes = cloneMaskShapes(maskShapes);
        const opcReq = buildLearnReq(currentMaskShapes);
        await runOpcCorrection(
          currentMaskShapes,
          targetGuide.targetShapes,
          opcReq,
          { iterations: 5, gain: 0.5, nSamples: 7, segmentNm: 80 },
          (result: OpcIterResult) => {
            setOpcProgress(prev => [...prev, result]);
            setMaskShapes(cloneMaskShapes(result.maskShapes));
            setReq(buildLearnReq(result.maskShapes));
            setSim(result.simResult);
          },
        );
      } catch (e) {
        console.error("OPC error:", e);
      } finally {
        setOpcRunning(false);
      }
    }
  }, [step, req, maskShapes, targetGuide]);

  const epeMode = step >= 2 ? "BOTH" : "NONE";
  const resolvedMasks = step === 3 && opcProgress.length > 0 ? maskShapes : undefined;

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", flexDirection: "row",
      background: "#0a1628",
      overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <LearnStepPanel
        step={step}
        loading={loading}
        opcRunning={opcRunning}
        opcProgress={opcProgress}
        onNextStep={handleNextStep}
      />
      <div style={{ flex: 1, height: "100%", minWidth: 0, position: "relative" }}>
        <Viewport
          key={`learn-${step >= 2 ? "epe" : "base"}`}
          sim={sim}
          req={req}
          resolvedMaskShapes={resolvedMasks}
          targetGuide={targetGuide}
          initialEpeOverlayMode={epeMode}
          showEditDockPanel={false}
          showSurfacePanel={false}
          showMetricsFooter={step >= 2}
          panelLayoutMode="side"
        />
      </div>
    </div>
  );
}
