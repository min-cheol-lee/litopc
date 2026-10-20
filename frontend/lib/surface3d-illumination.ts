import type { MaskRect } from "./surface3d-types";

/** One union field, independent of how OPC partitions a shape into rectangles. */
export function createIlluminationField(add: MaskRect[], subtract: MaskRect[], fov: number, size = 256) {
  if (!(fov > 0) || !Number.isFinite(fov)) return null;
  const rects = add.filter(r => [r.x, r.y, r.w, r.h].every(Number.isFinite) && r.w > 0 && r.h > 0);
  if (!rects.length) return null;
  const minX = Math.max(-.55, Math.min(...rects.map(r => r.x / fov - .5)));
  const maxX = Math.min(.55, Math.max(...rects.map(r => (r.x + r.w) / fov - .5)));
  const minY = Math.max(-.55, Math.min(...rects.map(r => .5 - (r.y + r.h) / fov)));
  const maxY = Math.min(.55, Math.max(...rects.map(r => .5 - r.y / fov)));
  if (maxX <= minX || maxY <= minY) return null;
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  const width = Math.max(.2, maxX - minX + .14), height = Math.max(.2, maxY - minY + .14);
  const xOrigin = centerX - width / 2, yOrigin = centerY - height / 2;
  const field = new Float32Array(size * size);
  const paint = (r: MaskRect, value: number) => {
    if (![r.x, r.y, r.w, r.h].every(Number.isFinite) || r.w <= 0 || r.h <= 0) return;
    const x0 = Math.max(0, Math.floor((Math.max(-.55, r.x / fov - .5) - xOrigin) / width * size));
    const x1 = Math.min(size, Math.ceil((Math.min(.55, (r.x + r.w) / fov - .5) - xOrigin) / width * size));
    const y0 = Math.max(0, Math.floor((Math.max(-.55, .5 - (r.y + r.h) / fov) - yOrigin) / height * size));
    const y1 = Math.min(size, Math.ceil((Math.min(.55, .5 - r.y / fov) - yOrigin) / height * size));
    if (x0 >= x1 || y0 >= y1) return;
    for (let y = y0; y < y1; y++) field.fill(value, y * size + x0, y * size + x1);
  };
  rects.forEach(r => paint(r, 1));
  subtract.forEach(r => paint(r, 0));
  if (!field.some(value => value > 0)) return null;

  // Blur the UNION, never individual segments: shared edges leave no bright seam.
  const blur = (input: Float32Array, horizontal: boolean, sigma: number) => {
    const radius = Math.ceil(sigma * 3), weights: number[] = [];
    let total = 0;
    for (let i = -radius; i <= radius; i++) { const w = Math.exp(-i * i / (2 * sigma * sigma)); weights.push(w); total += w; }
    const output = new Float32Array(input.length);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let value = 0;
      for (let i = -radius; i <= radius; i++) {
        const xx = horizontal ? x + i : x, yy = horizontal ? y : y + i;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) value += input[yy * size + xx] * weights[i + radius];
      }
      output[y * size + x] = value / total;
    }
    return output;
  };
  const softened = blur(blur(field, true, .022 / width * size), false, .022 / height * size);
  const data = Uint8Array.from(softened, value => Math.round(value * 255));
  return { data, size, centerX, centerY, width, height };
}
