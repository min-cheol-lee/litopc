const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = fs.readFileSync(path.join(__dirname, '../lib', name), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  modules.set(name, exports);
  vm.runInNewContext(js, { exports, require: name => name.startsWith('./') ? load(name.slice(2) + '.ts') : require(name) });
  return exports;
}

const { templateParamDefaults } = load('template-defaults.ts');
const { buildTemplateBaseShapes } = load('template-mask.ts');
const { getPresetTargetGuide } = load('opc-workspace.ts');
const plain = value => JSON.parse(JSON.stringify(value));

test('EUV L-shape mask and target use the same 24 nm wafer-scale geometry', () => {
  const params = { fov_nm: 1100, ...templateParamDefaults('L_CORNER_RAW_EUV', 'EUV_LNA') };
  const mask = buildTemplateBaseShapes('L_CORNER_RAW_EUV', params);
  const target = getPresetTargetGuide('L_CORNER_RAW_EUV', 'EUV_LNA', params).targetShapes;
  assert.deepEqual(plain(mask), [
    { type: 'rect', op: 'add', x_nm: 470, y_nm: 606, w_nm: 160, h_nm: 24 },
    { type: 'rect', op: 'add', x_nm: 606, y_nm: 470, w_nm: 24, h_nm: 160 },
  ]);
  assert.deepEqual(plain(target), plain(mask));
  assert.deepEqual(plain(buildTemplateBaseShapes('L_CORNER_RAW_EUV', {})), plain(mask));
});

test('L-shape targets follow changed dimensions and field centers instead of fixed DUV coordinates', () => {
  for (const [template, preset] of [['L_CORNER_RAW_EUV', 'EUV_LNA'], ['L_CORNER_RAW_DUV', 'DUV_193_DRY']]) {
    const params = { ...templateParamDefaults(template, preset), fov_nm: 600, cd_nm: 32, length_nm: 180, arm_nm: 144 };
    assert.deepEqual(plain(getPresetTargetGuide(template, preset, params).targetShapes), plain(buildTemplateBaseShapes(template, params)));
  }
});

test('Dense L/S reinitialization restores each imaging family dimensions in both directions', () => {
  let params = { ...templateParamDefaults('DENSE_LS', 'DUV_193_DRY') };
  params = { ...params, ...templateParamDefaults('DENSE_LS', 'EUV_LNA') };
  assert.deepEqual(plain(params), { cd_nm: 24, length_nm: 320, pitch_nm: 48, n_lines: 4 });
  const mask = buildTemplateBaseShapes('DENSE_LS', params);
  assert.equal(mask.length, 4);
  assert.equal(mask[1].x_nm - mask[0].x_nm, 48);
  assert.deepEqual(plain(getPresetTargetGuide('DENSE_LS', 'EUV_LNA', params).targetShapes), plain(mask));
  params = { ...params, ...templateParamDefaults('DENSE_LS', 'DUV_193_DRY') };
  assert.deepEqual(plain(params), { cd_nm: 150, length_nm: 900, pitch_nm: 250, n_lines: 7 });
  assert.equal(buildTemplateBaseShapes('DENSE_LS', params).length, 4);
});

test('the DUV L-shape retains its existing initial geometry', () => {
  const params = templateParamDefaults('L_CORNER_RAW_DUV', 'DUV_193_DRY');
  assert.deepEqual(plain(buildTemplateBaseShapes('L_CORNER_RAW_DUV', params)), [
    { type: 'rect', op: 'add', x_nm: 260, y_nm: 590, w_nm: 450, h_nm: 100 },
    { type: 'rect', op: 'add', x_nm: 610, y_nm: 270, w_nm: 100, h_nm: 420 },
  ]);
});
