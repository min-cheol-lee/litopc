const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const THREE = require('three');

function load(name) {
  const source = fs.readFileSync(path.join(__dirname, '../lib', name), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: name => name.startsWith('./') ? load(name.slice(2) + '.ts') : require(name) });
  return exports;
}

const { createSurface3dRotation, getSurface3dPivot } = load('surface3d-view.ts');
const { SURFACE_PALETTES, getSurfacePaletteColor } = load('surface3d-palettes.ts');
const { createIlluminationField } = load('surface3d-illumination.ts');
const { getSurfacePixelRatio, getSurfaceRenderBudget, getCachedIlluminationField } = load('surface3d-performance.ts');

test('Classic projection rotates points exactly like the Rendered WebGL group', () => {
  for (const angles of [[0, 0, 0], [34, 34, 0], [-125, 68, 35], [180, -89, 140], [-180, 89, -140]]) {
    const [azimuth, elevation, roll] = angles;
    const rotate = createSurface3dRotation(...angles);
    const euler = new THREE.Euler(-elevation * Math.PI / 180, roll * Math.PI / 180, azimuth * Math.PI / 180, 'ZXY');
    for (const p of [[0, 0, 0], [.5, -.5, .69], [-.32, .17, -.02]]) {
      const expected = new THREE.Vector3(...p).applyEuler(euler);
      const actual = rotate(...p);
      for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(actual[axis] - expected[axis]) < 1e-12, `${angles}: ${axis}`);
    }
  }
});

test('the fixed orbit point is halfway between each pair of plate centers', () => {
  for (const [mode, silicon, mask] of [['classic', -.02, .44], ['rendered', -.0075, .6825]]) {
    const pivot = getSurface3dPivot(mode);
    assert.ok(Math.abs((pivot - silicon) - (mask - pivot)) < 1e-12);
    const rotate = createSurface3dRotation(127, -53, 82);
    const p = rotate(0, 0, pivot - pivot);
    assert.equal(Math.abs(p.x), 0);
    assert.equal(Math.abs(p.y), 0);
    assert.equal(p.z + pivot, pivot);
  }
});

test('new sequential palettes retain endpoints and increasing luminance', () => {
  for (const palette of SURFACE_PALETTES) {
    const first = getSurfacePaletteColor(palette.value, 0);
    const last = getSurfacePaletteColor(palette.value, 1);
    const rgbHex = (rgb) => '#' + Array.from(rgb, (v) => v.toString(16).padStart(2, '0')).join('');
    assert.equal(rgbHex(first), palette.stops[0]);
    assert.equal(rgbHex(last), palette.stops.at(-1));
    let previous = -1;
    for (let i = 0; i <= 100; i++) {
      const [r, g, b] = getSurfacePaletteColor(palette.value, i / 100);
      const luminance = .2126 * r + .7152 * g + .0722 * b;
      assert.ok(luminance >= previous);
      previous = luminance;
    }
  }
  assert.equal(getSurfacePaletteColor('viridis', .5), null);
});

test('illumination is identical when OPC subdivides or overlaps the same mask', () => {
  const whole = [{ x: 300, y: 300, w: 400, h: 120 }, { x: 580, y: 300, w: 120, h: 400 }];
  const segmented = [];
  for (let i = 0; i < 8; i++) segmented.push({ x: 300 + i * 50, y: 300, w: 50, h: 120 });
  for (let i = 0; i < 8; i++) segmented.push({ x: 580, y: 300 + i * 50, w: 120, h: 50 });
  segmented.push(whole[0]);
  const a = createIlluminationField(whole, [], 1000, 128);
  const b = createIlluminationField(segmented, [], 1000, 128);
  for (const key of ['centerX', 'centerY', 'width', 'height']) assert.equal(a[key], b[key]);
  assert.deepEqual(Array.from(a.data), Array.from(b.data));
});

test('illumination respects subtraction and handles empty or off-mask regions', () => {
  const whole = [{ x: 250, y: 250, w: 500, h: 500 }];
  const a = createIlluminationField(whole, [], 1000, 128);
  const b = createIlluminationField(whole, [{ x: 425, y: 425, w: 150, h: 150 }], 1000, 128);
  const middle = 64 * 128 + 64;
  assert.ok(a.data[middle] > 250);
  assert.ok(b.data[middle] < 10);
  const offMask = createIlluminationField(whole, [{ x: -5000, y: -5000, w: 100, h: 100 }], 1000, 128);
  assert.deepEqual(Array.from(a.data), Array.from(offMask.data));
  assert.equal(createIlluminationField([], [], 1000), null);
  assert.equal(createIlluminationField(whole, whole, 1000), null);
  assert.equal(createIlluminationField(whole, [], 0), null);
});

test('small previews and interaction use smaller budgets without lowering settled display sharpness', () => {
  const mini = getSurfaceRenderBudget(340, 300, 2, 'FULL');
  const main = getSurfaceRenderBudget(1146, 1174, 2, 'FULL');
  const moving = getSurfaceRenderBudget(1146, 1174, 1.5, 'FAST');
  for (const key of ['geometrySegments', 'reflectionSize', 'lightSteps']) {
    assert.ok(mini[key] < main[key], key);
    assert.ok(moving[key] < main[key], key);
  }
  assert.equal(moving.maskTextureSize, main.maskTextureSize, 'dragging preserves the mask texture');
  assert.equal(getSurfacePixelRatio(340, 300, 1, 'FULL'), 2);
  const largeRatio = getSurfacePixelRatio(3840, 2160, 3, 'FULL');
  assert.ok(largeRatio < 2 && largeRatio >= 1);
});

test('illumination cache reuses identical masks and invalidates on subtractive edits', () => {
  const mask = [{ x: 300, y: 300, w: 400, h: 100 }];
  const first = getCachedIlluminationField(mask, [], 1000);
  const same = getCachedIlluminationField(mask.map(r => ({ ...r })), [], 1000);
  assert.equal(first, same);
  assert.equal(getCachedIlluminationField(mask, mask, 1000), null);
  assert.notEqual(getCachedIlluminationField(mask, [], 2000), first);
});
