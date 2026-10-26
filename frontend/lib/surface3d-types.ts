export interface EpePoint {
  p: { x: number; y: number };
  nearest: { x: number; y: number };
  dist: number;
}

export interface ContourSet {
  points_nm: Array<{ x: number; y: number }>;
}

export interface SweepContourSet3d {
  contours: ContourSet[];
  color: string;
  opacity: number;
  dash?: [number, number];
  underColor?: string;
  baseZ?: number;
  plane?: "silicon" | "mask";
}

// Matches shapesToRects() output in Viewport.tsx
export interface MaskRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ColormapType = "silver" | "cobalt" | "amber" | "apple" | "plasma" | "viridis" | "hot" | "grayscale" | "ice";
export type ContourStyle = "CLASSIC" | "NEON" | "GOLD" | "MINIMAL";
export type QualityMode = "FAST" | "FULL";
export type EpeMode = "COLOR" | "ARROWS" | "BOTH";
export type MaskOpacityPreset = "BALANCED" | "REVEAL";
/** Neutral stage behind a transparent canvas (2026-10-25 simulator theme). Unset keeps the legacy navy studio. */
export type Surface3DTheme = "light" | "dark";

export interface Surface3DProps {
  // A regular prop survives next/dynamic's loadable wrapper, which does not forward refs.
  rendererRef?: { current: Surface3DHandle | null };
  // Intensity data
  intensityW: number;
  intensityH: number;
  intensityData: number[];
  nmPerPixel: number;

  // Camera
  azimuthDeg: number;
  elevationDeg: number;
  rollDeg: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  depthScale: number;
  zoomScale: number;
  qualityMode: QualityMode;
  fovNm: number;

  // Appearance
  colormapType: ColormapType;
  colormapThreshold?: number;
  // Display opacity only: 0 hides the scalar overlay; 1 preserves its original appearance.
  colormapOpacity?: number;
  contourStyle: ContourStyle;
  showAerial: boolean;
  maskOpacityPreset: MaskOpacityPreset;

  // Contours
  contours: ContourSet[];
  targetContours: ContourSet[];
  showTargetOverlay: boolean;
  showMainContour: boolean;
  finalMaskContours: ContourSet[];
  maskAddRects: MaskRect[];
  maskSubtractRects: MaskRect[];
  overlayAddRects: MaskRect[];

  // Compare
  compareActive: boolean;
  compareAContours: ContourSet[];
  compareBContours: ContourSet[];

  // Sweep
  sweepContourSets: SweepContourSet3d[];

  // EPE
  epeContours: EpePoint[][] | null;
  epeMode?: EpeMode;

  // Light effect
  showLightEffect?: boolean;
  wavelengthNm?: number;

  // Stage. The landing hero mounts this same renderer transparently over its light pane.
  /** Drops the navy backdrop so the CSS stage shows through, and picks that stage's slate wafer and grey target. */
  theme?: Surface3DTheme;
  /** Leave the canvas transparent (no scene background, no backdrop plane) without choosing a theme. */
  transparent?: boolean;
  /** Wafer (silicon) body color; default 0x1e2f42 legacy, 0x6f7f92 light, 0x3b4452 dark. */
  waferColor?: number;
  /** Dashed target overlay color; default 0x8dbebc legacy, 0x8f8f8f light, 0x9a9a9a dark. */
  targetColor?: number;
  /** Called once the first frames are drawn, so a host can fade the live canvas in. */
  onFirstFrame?: () => void;
}

export interface Surface3DHandle {
  exportPng(sizePx: number): Promise<Blob | null>;
}
