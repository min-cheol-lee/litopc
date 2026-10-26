#!/usr/bin/env node
/*
 * Prints the frontend template geometry as JSON so the backend parity test
 * (backend/tests/test_pattern_library.py) can compare it with sim/templates.py.
 *
 * Usage:
 *   node scripts/dump-template-shapes.cjs                 # built-in matrix
 *   node scripts/dump-template-shapes.cjs spec.json       # custom cases
 *   echo '[...]' | node scripts/dump-template-shapes.cjs -  # cases on stdin
 *
 * A case is { template_id, preset_id, params? }. The frontend sends
 * templateParamDefaults(template, preset) merged with params, exactly like the
 * simulator page does, so "params" only needs the overrides.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(path.join(__dirname, '..', 'node_modules', 'typescript'));

const libDir = path.join(__dirname, '..', 'lib');
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = fs.readFileSync(path.join(libDir, name), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  modules.set(name, exports);
  vm.runInNewContext(js, { exports, require: (dep) => (dep.startsWith('./') ? load(dep.slice(2) + '.ts') : require(dep)) });
  return exports;
}

const { templateParamDefaults } = load('template-defaults.ts');
const { buildTemplateBaseShapes } = load('template-mask.ts');
const { PATTERN_CATALOG } = load('pattern-catalog.ts');

function defaultMatrix() {
  const cases = [];
  for (const preset of ['DUV_193_DRY', 'EUV_LNA']) {
    for (const entry of PATTERN_CATALOG) {
      cases.push({ template_id: entry.templateIdFor(preset), preset_id: preset, params: {} });
    }
  }
  return cases;
}

function readCases() {
  const arg = process.argv[2];
  if (!arg) return defaultMatrix();
  const text = arg === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(arg, 'utf8');
  return JSON.parse(text);
}

const out = readCases().map((c) => {
  const params = { fov_nm: 1100, ...templateParamDefaults(c.template_id, c.preset_id), ...(c.params || {}) };
  const shapes = buildTemplateBaseShapes(c.template_id, params).map((s) => [s.x_nm, s.y_nm, s.w_nm, s.h_nm]);
  return { template_id: c.template_id, preset_id: c.preset_id, params, shapes };
});
process.stdout.write(JSON.stringify(out));
