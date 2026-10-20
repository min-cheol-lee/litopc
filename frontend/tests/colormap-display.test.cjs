const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/colormap-display.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
vm.runInNewContext(compiled, { exports: exported });
const { mapColormapIntensity, COLORMAP_THRESHOLD_MIN, COLORMAP_THRESHOLD_MAX, COLORMAP_THRESHOLD_DEFAULT } = exported;

test('the default display range preserves every normalized intensity', () => {
  assert.equal(COLORMAP_THRESHOLD_DEFAULT, 1);
  for (let i = 0; i <= 100; i++) assert.equal(mapColormapIntensity(i / 100), i / 100);
});

test('intensity ordering remains monotonic across the full display-range control', () => {
  for (const threshold of [COLORMAP_THRESHOLD_MIN, 0.75, 1, 1.5, 2, COLORMAP_THRESHOLD_MAX]) {
    let previous = -1;
    for (let i = 0; i <= 100; i++) {
      const mapped = mapColormapIntensity(i / 100, threshold);
      assert.ok(mapped >= previous);
      assert.ok(mapped >= 0 && mapped <= 1);
      previous = mapped;
    }
  }
});

test('raising the upper display range reduces saturation without changing zero intensity', () => {
  assert.equal(mapColormapIntensity(1, 2), 0.5);
  assert.equal(mapColormapIntensity(0.6, 2), 0.3);
  assert.equal(mapColormapIntensity(0, 2.5), 0);
  for (const intensity of [0.1, 0.5, 1]) {
    assert.ok(mapColormapIntensity(intensity, 2) < mapColormapIntensity(intensity, 1));
  }
});

test('the display range is limited to its documented bounds', () => {
  assert.equal(COLORMAP_THRESHOLD_MIN, 0.5);
  assert.equal(COLORMAP_THRESHOLD_MAX, 2.5);
  assert.equal(mapColormapIntensity(0.4, -10), 0.8);
  assert.equal(mapColormapIntensity(1, 100), 0.4);
  assert.equal(mapColormapIntensity(0.8, 0.5), 1);
});

test('invalid ranges fall back to identity and invalid intensities stay finite', () => {
  for (const threshold of [NaN, Infinity, -Infinity]) assert.equal(mapColormapIntensity(0.4, threshold), 0.4);
  for (const intensity of [NaN, Infinity, -Infinity]) assert.equal(mapColormapIntensity(intensity), 0);
  assert.equal(mapColormapIntensity(-1, 2), 0);
  assert.equal(mapColormapIntensity(2, 2), 0.5);
  for (const intensity of [NaN, Infinity, -Infinity, -1, 0, 0.5, 1, 2]) {
    for (const threshold of [NaN, Infinity, -Infinity, -1, 0.5, 1, 2.5, 5]) {
      const mapped = mapColormapIntensity(intensity, threshold);
      assert.ok(Number.isFinite(mapped) && mapped >= 0 && mapped <= 1);
    }
  }
});
