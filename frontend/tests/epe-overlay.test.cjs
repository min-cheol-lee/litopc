const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/epe-overlay.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
vm.runInNewContext(compiled, { exports: exported });
const { getEpeColor, nearestTargetPoint } = exported;

const loop = (points) => ({ points_nm: points.map(([x, y]) => ({ x, y })) });
const rect = (x0, y0, x1, y1) => loop([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]);

test('disconnected targets never gain a bridge that reports a false zero EPE', () => {
  const result = nearestTargetPoint({ x: 20, y: 0 }, [rect(0, 0, 10, 10), rect(30, 0, 40, 10)]);
  assert.equal(result.dist, 10);
  assert.equal(result.point.x, 10);
  assert.equal(result.point.y, 0);
});

test('the closing edge participates when the first vertex is not repeated', () => {
  const result = nearestTargetPoint({ x: -3, y: 4 }, [loop([[0, 0], [10, 0], [10, 10], [0, 10]])]);
  assert.equal(result.dist, 3);
  assert.equal(result.point.x, 0);
  assert.equal(result.point.y, 4);
});

test('a projection outside a target segment selects its nearest endpoint', () => {
  const result = nearestTargetPoint({ x: 13, y: -4 }, [loop([[0, 0], [10, 0]])]);
  assert.equal(result.dist, 5);
  assert.equal(result.point.x, 10);
  assert.equal(result.point.y, 0);
});

test('singletons, repeated points, and invalid vertices produce finite measurements', () => {
  const query = { x: 1, y: 1 };
  for (const target of [loop([[4, 5]]), loop([[4, 5], [4, 5]]), loop([[NaN, 0], [4, 5], [Infinity, 9]])]) {
    const result = nearestTargetPoint(query, [target]);
    assert.equal(result.dist, 5);
    assert.equal(result.point.x, 4);
    assert.equal(result.point.y, 5);
  }
  assert.equal(nearestTargetPoint(query, []), null);
  assert.equal(nearestTargetPoint(query, [loop([]), loop([[NaN, 4], [2, Infinity]])]), null);
  assert.equal(nearestTargetPoint({ x: NaN, y: 0 }, [rect(0, 0, 10, 10)]), null);
});

test('the common color scale preserves exact endpoints and midpoint with integer sRGB', () => {
  for (const [distance, expected] of [
    [0, [140, 201, 174]], [3, [182, 193, 146]], [6, [224, 185, 118]],
    [9, [226, 152, 110]], [12, [227, 119, 102]],
  ]) assert.deepEqual(Array.from(getEpeColor(distance)), expected);
});

test('the color scale saturates outside its range and never returns NaN channels', () => {
  for (const distance of [-Infinity, -1, NaN]) {
    assert.deepEqual(Array.from(getEpeColor(distance)), [140, 201, 174]);
  }
  for (const distance of [13, Infinity]) {
    assert.deepEqual(Array.from(getEpeColor(distance)), [227, 119, 102]);
  }
});
