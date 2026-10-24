export const SURFACE_PALETTES = [
  { value: "silver", label: "Silver", stops: ["#25323f", "#455d70", "#6e8da3", "#a7c1ce", "#e7eff1"] },
  { value: "cobalt", label: "Cobalt", stops: ["#18283c", "#224767", "#3f769e", "#8eb8d2", "#dcecf5"] },
  { value: "amber", label: "Amber", stops: ["#2b2925", "#574c3b", "#957752", "#c7aa77", "#efe0b9"] },
] as const;

/** RGB in sRGB space. Renderers convert to linear light before assigning vertex colors. */
export function getSurfacePaletteColor(type: string, value: number): [number, number, number] | null {
  const palette = SURFACE_PALETTES.find((item) => item.value === type);
  if (!palette) return null;
  const t = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const p = t * (palette.stops.length - 1);
  const i = Math.min(palette.stops.length - 2, Math.floor(p));
  const u = p - i;
  const a = parseInt(palette.stops[i].slice(1), 16);
  const b = parseInt(palette.stops[i + 1].slice(1), 16);
  return [16, 8, 0].map((shift) => {
    const start = (a >> shift) & 255;
    return Math.round(start + (((b >> shift) & 255) - start) * u);
  }) as [number, number, number];
}
