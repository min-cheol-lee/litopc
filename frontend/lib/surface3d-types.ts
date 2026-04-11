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

export type ColormapType = "apple" | "plasma" | "viridis" | "hot" | "grayscale" | "ice";
export type ContourStyle = "CLASSIC" | "NEON" | "GOLD" | "MINIMAL";
export type QualityMode = "FAST" | "FULL";
export type EpeMode = "COLOR" | "ARROWS" | "BOTH";
export type MaskOpacityPreset = "BALANCED" | "REVEAL";

export interface Surface3DProps {
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
}

export interface Surface3DHandle {
  exportPng(sizePx: number): Promise<Blob | null>;
}
