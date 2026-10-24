export const COLORMAP_THRESHOLD_MIN = 0.5;
export const COLORMAP_THRESHOLD_MAX = 2.5;
export const COLORMAP_THRESHOLD_DEFAULT = 1;

/** Map normalized intensity into the selected upper display range. */
export function mapColormapIntensity(value: number, threshold: number = COLORMAP_THRESHOLD_DEFAULT): number {
  const intensity = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const range = Number.isFinite(threshold)
    ? Math.max(COLORMAP_THRESHOLD_MIN, Math.min(COLORMAP_THRESHOLD_MAX, threshold))
    : COLORMAP_THRESHOLD_DEFAULT;
  return Math.max(0, Math.min(1, intensity / range));
}
