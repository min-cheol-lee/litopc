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
const { PATTERN_CATALOG, PRO_ONLY_TEMPLATE_IDS, patternForTemplateId, isProOnlyTemplate, templateLabelFor } = load('pattern-catalog.ts');
const { enabledTemplateIdsForPreset, templateEnabledForPreset, templateSupportsPresetFamily, normalizeTemplateId } = load('template-variants.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const rects = shapes => plain(shapes.map(s => [s.x_nm, s.y_nm, s.w_nm, s.h_nm]));

const FOV = 1100;
const PRESETS = ['DUV_193_DRY', 'EUV_LNA'];
const NEW_IDS = ['TIP_TO_TIP', 'TIP_TO_SIDE', 'TOUCHING_CORNERS', 'CONTACT_ARRAY'];

function assertInsideFov(shapes, label) {
  assert.ok(shapes.length > 0, `${label}: no shapes`);
  for (const s of shapes) {
    assert.ok(s.w_nm > 0 && s.h_nm > 0, `${label}: degenerate rect ${JSON.stringify(s)}`);
    assert.ok(s.x_nm >= 0 && s.y_nm >= 0 && s.x_nm + s.w_nm <= FOV && s.y_nm + s.h_nm <= FOV,
      `${label}: rect outside FOV ${JSON.stringify(s)}`);
  }
}

test('catalog lists the eight patterns in order with Free/Pro tiers and labels', () => {
  assert.deepEqual(plain(PATTERN_CATALOG.map(e => e.label)), [
    'Iso line', 'Dense L/S', 'Square', 'L-shape', 'Tip to tip', 'Tip to side', 'Touching corners', 'Contact array',
  ]);
  assert.deepEqual(plain(PATTERN_CATALOG.map(e => e.tier)), ['FREE', 'FREE', 'FREE', 'FREE', 'PRO', 'PRO', 'PRO', 'PRO']);
  assert.deepEqual(plain(PATTERN_CATALOG.map(e => e.templateIdFor('DUV_193_DRY'))), [
    'ISO_LINE_DUV', 'DENSE_LS', 'CONTACT_RAW', 'L_CORNER_RAW_DUV', ...NEW_IDS,
  ]);
  assert.deepEqual(plain(PATTERN_CATALOG.map(e => e.templateIdFor('EUV_LNA'))), [
    'ISO_LINE_EUV', 'DENSE_LS', 'CONTACT_RAW', 'L_CORNER_RAW_EUV', ...NEW_IDS,
  ]);
  assert.deepEqual(plain(PRO_ONLY_TEMPLATE_IDS), NEW_IDS);
});

test('enabled template lists match the catalog order and drop the line-end templates', () => {
  for (const preset of PRESETS) {
    assert.deepEqual([...enabledTemplateIdsForPreset(preset)], plain(PATTERN_CATALOG.map(e => e.templateIdFor(preset))));
    for (const id of ['LINE_END_RAW_DUV', 'LINE_END_RAW_EUV', 'LINE_END_RAW', 'LINE_END_OPC_HAMMER']) {
      assert.equal(templateEnabledForPreset(id, preset), false, `${id} must not be enabled for ${preset}`);
    }
    for (const id of NEW_IDS) {
      assert.equal(templateSupportsPresetFamily(id, preset), true);
      assert.equal(templateEnabledForPreset(id, preset), true);
      assert.equal(normalizeTemplateId(id), id);
    }
    assert.equal(templateSupportsPresetFamily('CONTACT_RAW', preset), true);
  }
  // Legacy IDs still normalise so saved history keeps resolving.
  assert.equal(normalizeTemplateId('LINE_END_RAW_EUV'), 'LINE_END_RAW_EUV');
  assert.equal(normalizeTemplateId('LINE_END_RAW'), 'LINE_END_RAW_DUV');
});

test('param specs expose the editable keys per pattern with family-scaled ranges', () => {
  const keys = (label, preset) => plain(PATTERN_CATALOG.find(e => e.label === label).params(preset).map(p => p.key));
  for (const preset of PRESETS) {
    assert.deepEqual(keys('Iso line', preset), ['cd_nm', 'length_nm']);
    assert.deepEqual(keys('Dense L/S', preset), ['cd_nm', 'pitch_nm', 'n_lines']);
    assert.deepEqual(keys('Square', preset), ['w_nm']);
    assert.deepEqual(keys('L-shape', preset), ['cd_nm', 'length_nm', 'arm_nm']);
    assert.deepEqual(keys('Tip to tip', preset), ['cd_nm', 'length_nm', 'gap_nm']);
    assert.deepEqual(keys('Tip to side', preset), ['cd_nm', 'length_nm', 'attacker_nm', 'gap_nm']);
    assert.deepEqual(keys('Touching corners', preset), ['w_nm', 'h_nm', 'gap_x_nm', 'gap_y_nm']);
    assert.deepEqual(keys('Contact array', preset), ['w_nm', 'pitch_nm', 'n_rows', 'n_cols']);
    // Every default sits inside its slider range.
    for (const entry of PATTERN_CATALOG) {
      const id = entry.templateIdFor(preset);
      const defaults = templateParamDefaults(id, preset);
      for (const spec of entry.params(preset)) {
        assert.ok(spec.min < spec.max && spec.step > 0, `${id}.${spec.key} range`);
        assert.ok(defaults[spec.key] >= spec.min && defaults[spec.key] <= spec.max,
          `${id}.${spec.key} default ${defaults[spec.key]} outside [${spec.min}, ${spec.max}] for ${preset}`);
      }
    }
  }
  const corners = PATTERN_CATALOG.find(e => e.label === 'Touching corners');
  assert.deepEqual(plain(corners.params('DUV_193_DRY').filter(p => p.key.startsWith('gap_')).map(p => [p.min, p.max])), [[0, 300], [0, 300]]);
  assert.deepEqual(plain(corners.params('EUV_LNA').filter(p => p.key.startsWith('gap_')).map(p => [p.min, p.max])), [[0, 100], [0, 100]]);
  const array = PATTERN_CATALOG.find(e => e.label === 'Contact array');
  assert.deepEqual(plain(array.params('EUV_LNA').filter(p => p.key.startsWith('n_')).map(p => [p.min, p.max])), [[1, 5], [1, 5]]);
});

test('defaults always carry cd_nm and every catalog thumbnail fits the FOV in both families', () => {
  for (const preset of PRESETS) {
    for (const entry of PATTERN_CATALOG) {
      const id = entry.templateIdFor(preset);
      const defaults = templateParamDefaults(id, preset);
      assert.ok(Number.isFinite(defaults.cd_nm), `${id} (${preset}) defaults must include cd_nm`);
      assertInsideFov(buildTemplateBaseShapes(id, { fov_nm: FOV, ...defaults }), `${id} (${preset})`);
    }
  }
});

test('new pattern geometry matches the specification for DUV and EUV defaults', () => {
  const shapesFor = (id, preset, extra = {}) => rects(buildTemplateBaseShapes(id, { ...templateParamDefaults(id, preset), ...extra }));
  assert.deepEqual(shapesFor('TIP_TO_TIP', 'DUV_193_DRY'), [[500, 110, 100, 380], [500, 610, 100, 380]]);
  assert.deepEqual(shapesFor('TIP_TO_TIP', 'EUV_LNA'), [[538, 384, 24, 150], [538, 566, 24, 150]]);
  assert.deepEqual(shapesFor('TIP_TO_SIDE', 'DUV_193_DRY'), [[500, 150, 100, 800], [10, 500, 380, 100]]);
  assert.deepEqual(shapesFor('TIP_TO_SIDE', 'EUV_LNA'), [[538, 400, 24, 300], [368, 538, 140, 24]]);
  assert.deepEqual(shapesFor('TOUCHING_CORNERS', 'DUV_193_DRY'), [[260, 260, 260, 260], [580, 580, 260, 260]]);
  assert.deepEqual(shapesFor('TOUCHING_CORNERS', 'EUV_LNA'), [[450, 450, 90, 90], [560, 560, 90, 90]]);
  assert.deepEqual(shapesFor('CONTACT_ARRAY', 'DUV_193_DRY'), [
    [250, 250, 120, 120], [490, 250, 120, 120], [730, 250, 120, 120],
    [250, 490, 120, 120], [490, 490, 120, 120], [730, 490, 120, 120],
    [250, 730, 120, 120], [490, 730, 120, 120], [730, 730, 120, 120],
  ]);
  assert.equal(shapesFor('CONTACT_ARRAY', 'EUV_LNA').length, 9);
  assert.deepEqual(shapesFor('CONTACT_ARRAY', 'EUV_LNA')[0], [471, 471, 30, 30]);
  // gap 0 makes the corners touch; x and y gaps move independently.
  assert.deepEqual(shapesFor('TOUCHING_CORNERS', 'DUV_193_DRY', { gap_x_nm: 0, gap_y_nm: 0 }), [[290, 290, 260, 260], [550, 550, 260, 260]]);
  assert.deepEqual(shapesFor('TOUCHING_CORNERS', 'DUV_193_DRY', { gap_x_nm: 100, gap_y_nm: 0 }), [[240, 290, 260, 260], [600, 550, 260, 260]]);
  // Contact array counts are clamped so the grid stays inside the FOV.
  assert.equal(shapesFor('CONTACT_ARRAY', 'DUV_193_DRY', { pitch_nm: 400, n_rows: 5, n_cols: 5 }).length, 9);
  // The attacker is horizontal (height = cd) and stops gap_nm short of the line.
  const [line, attacker] = shapesFor('TIP_TO_SIDE', 'DUV_193_DRY', { gap_nm: 60, attacker_nm: 200 });
  assert.equal(attacker[0] + attacker[2] + 60, line[0]);
  assert.equal(attacker[3], 100);
});

test('target guides for the new patterns mirror the mask geometry and name each pattern', () => {
  for (const preset of PRESETS) {
    for (const id of NEW_IDS) {
      const params = { fov_nm: FOV, ...templateParamDefaults(id, preset) };
      const guide = getPresetTargetGuide(id, preset, params);
      assert.deepEqual(plain(guide.targetShapes), plain(buildTemplateBaseShapes(id, params)));
      assert.ok(guide.targetContours.length > 0, `${id} target contours`);
      assert.notEqual(guide.title, 'Target', `${id} should have a dedicated target guide`);
    }
    // Square is now shared: EUV gets a family-scaled contact.
    const square = getPresetTargetGuide('CONTACT_RAW', preset, templateParamDefaults('CONTACT_RAW', preset));
    assert.deepEqual(plain(square.targetShapes), plain(buildTemplateBaseShapes('CONTACT_RAW', templateParamDefaults('CONTACT_RAW', preset))));
  }
  assert.deepEqual(plain(templateParamDefaults('CONTACT_RAW', 'EUV_LNA')), { cd_nm: 60, w_nm: 60, serif_nm: 10 });
  assert.deepEqual(plain(templateParamDefaults('CONTACT_RAW', 'DUV_193_DRY')), { cd_nm: 200, w_nm: 200, serif_nm: 28 });
});

test('catalog lookups and labels cover current and legacy template IDs', () => {
  assert.equal(patternForTemplateId('ISO_LINE_EUV').label, 'Iso line');
  assert.equal(patternForTemplateId('ISO_LINE').label, 'Iso line');
  assert.equal(patternForTemplateId('L_CORNER_RAW').label, 'L-shape');
  assert.equal(patternForTemplateId('CONTACT_ARRAY').tier, 'PRO');
  assert.equal(patternForTemplateId('LINE_END_RAW_DUV'), null);
  assert.equal(patternForTemplateId(null), null);
  assert.equal(isProOnlyTemplate('TIP_TO_SIDE'), true);
  assert.equal(isProOnlyTemplate('DENSE_LS'), false);
  assert.equal(isProOnlyTemplate(undefined), false);
  assert.equal(templateLabelFor('TOUCHING_CORNERS'), 'Touching corners');
  assert.equal(templateLabelFor('CONTACT_RAW'), 'Square');
  assert.equal(templateLabelFor('LINE_END_RAW_EUV'), 'Line end');
  assert.equal(templateLabelFor('LINE_END_OPC_HAMMER'), 'Line end (hammerhead)');
  assert.equal(templateLabelFor('STAIRCASE'), 'Stepped interconnect');
  assert.equal(templateLabelFor('L_CORNER_OPC_EUV'), 'L-shape (OPC)');
  assert.equal(templateLabelFor(null), 'Pattern');
});
