/** Reference planes shared by the canvas and WebGL views (normalized FOV units). */
export const SURFACE3D_PLANES = {
  classic: { maskTopZ: 0.44, siliconCenterZ: -0.02 },
  rendered: { maskTopZ: 0.69, maskDepth: 0.015, siliconCenterZ: -0.0075 },
} as const;

export function getSurface3dPivot(mode: "classic" | "rendered"): number {
  const planes = SURFACE3D_PLANES[mode];
  const maskCenter = mode === "rendered"
    ? planes.maskTopZ - SURFACE3D_PLANES.rendered.maskDepth / 2
    : planes.maskTopZ;
  return (maskCenter + planes.siliconCenterZ) / 2;
}

/** Same ZXY Euler transform used by the WebGL group. Screen Y is inverted by the projector. */
export function createSurface3dRotation(azimuthDeg: number, elevationDeg: number, rollDeg: number) {
  const a = azimuthDeg * Math.PI / 180;
  const e = elevationDeg * Math.PI / 180;
  const r = rollDeg * Math.PI / 180;
  const ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e), cr = Math.cos(r), sr = Math.sin(r);
  return (x: number, y: number, z: number) => {
    const xr = x * cr + z * sr;
    const zr = -x * sr + z * cr;
    const ye = y * ce + zr * se;
    return { x: xr * ca - ye * sa, y: xr * sa + ye * ca, z: -y * se + zr * ce };
  };
}
