import type { MaskRect, QualityMode } from "./surface3d-types";
import { createIlluminationField } from "./surface3d-illumination";

export function getSurfacePixelRatio(width: number, height: number, deviceRatio: number, quality: QualityMode) {
  const base = quality === "FAST" ? 1.5 : Math.min(2.5, Math.max(2, deviceRatio || 1));
  const pixelLimit = quality === "FAST" ? 4_000_000 : 8_000_000;
  return Math.min(base, Math.max(1, Math.sqrt(pixelLimit / Math.max(1, width * height))));
}

/** Small previews need sharp pixels, but not a full-size scene's render targets. */
export function getSurfaceRenderBudget(width: number, height: number, pixelRatio: number, quality: QualityMode) {
  const longest = Math.max(width, height) * pixelRatio;
  const preview = Math.max(width, height) < 650;
  return {
    geometrySegments: quality === "FAST" ? 96 : longest < 1000 ? 192 : longest < 1800 ? 288 : 384,
    reflectionSize: quality === "FAST" ? (preview ? 256 : 512) : preview ? 512 : longest < 1800 ? 768 : 1024,
    // Stable across FAST/FULL so a drag never rebuilds the mask's alpha maps.
    maskTextureSize: preview ? 1024 : 2048,
    lightSteps: quality === "FAST" ? 16 : preview ? 24 : 40,
  };
}

type IlluminationField = ReturnType<typeof createIlluminationField>;
const illuminationCache = new Map<string, IlluminationField>();

/** CPU fields survive FAST/FULL transitions and moving the same scene to main. */
export function getCachedIlluminationField(add: MaskRect[], subtract: MaskRect[], fovNm: number): IlluminationField {
  const key = JSON.stringify([fovNm, add, subtract]);
  if (illuminationCache.has(key)) {
    const cached = illuminationCache.get(key)!;
    illuminationCache.delete(key);
    illuminationCache.set(key, cached);
    return cached;
  }
  const field = createIlluminationField(add, subtract, fovNm);
  illuminationCache.set(key, field);
  while (illuminationCache.size > 4) illuminationCache.delete(illuminationCache.keys().next().value!);
  return field;
}
