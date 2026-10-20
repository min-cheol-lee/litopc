const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the real correction loop with a deterministic simulated print. Only
// HTTP/auth are substituted; contour measurement and mask updates run unchanged.
function loadCorrection(simulate) {
  const filename = path.join(__dirname, "../lib/opc-correction.ts");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const requests = [];
  const context = vm.createContext({
    module, exports: module.exports,
    require(name) {
      if (name === "./api-base") return { getApiBase: () => "http://local-test" };
      if (name === "./usage") return { clientHeaders: () => ({}) };
      throw new Error(`Unexpected dependency ${name}`);
    },
    async fetch(url, options) {
      const body = JSON.parse(options.body);
      requests.push(body);
      const response = await simulate(body, requests.length, options.signal);
      return { ok: true, json: async () => response };
    },
  });
  vm.runInContext(compiled, context, { filename });
  return { ...module.exports, requests };
}

const rect = (x = 100, y = 100) => ({ type: "rect", x_nm: x, y_nm: y, w_nm: 100, h_nm: 100 });
const base = { plan: "PRO", preset_id: "DUV_193_DRY", grid: 1024,
  dose: 0.5, focus: 0, mask: { mode: "CUSTOM", params_nm: { fov_nm: 1100 }, shapes: [] } };
const options = { iterations: 2, nSamples: 1, segmentNm: 0, gain: 0.5,
  mrc: { minCdNm: 1, minSpaceNm: 50, maxBiasNm: 200, gridNm: 0 } };

function printed(body, inset = 20) {
  const contours_nm = body.mask.shapes.map(r => ({ points_nm: [
    { x: r.x_nm + inset, y: r.y_nm + inset },
    { x: r.x_nm + r.w_nm - inset, y: r.y_nm + inset },
    { x: r.x_nm + r.w_nm - inset, y: r.y_nm + r.h_nm - inset },
    { x: r.x_nm + inset, y: r.y_nm + r.h_nm - inset },
  ] }));
  return { grid_used: body.grid, nm_per_pixel: 1100 / body.grid, contours_nm,
    // Marker identifies the exact simulated mask independently of the EPE result.
    metrics: { cd_nm: body.mask.shapes[0].w_nm }, intensity: null };
}

test("each published mask, contour and EPE describes the same corrected input", async () => {
  const api = loadCorrection(body => printed(body));
  const updates = [];
  const result = await api.runOpcCorrection([rect()], [rect()], base, options, r => updates.push(r));
  assert.equal(api.requests.length, 3, "one baseline plus two corrected-mask simulations");
  assert.equal(result.length, 2);
  assert.deepEqual(Array.from(result, r => r.epeMeanNm), [10, 5]);
  for (let i = 0; i < result.length; i++) {
    assert.equal(JSON.stringify(result[i].maskShapes), JSON.stringify(api.requests[i + 1].mask.shapes));
    assert.equal(result[i].simResult.metrics.cd_nm, result[i].maskShapes[0].w_nm);
    assert.equal(result[i].simResult.metrics.epe_mean_nm, result[i].epeMeanNm);
    assert.equal(result[i].simResult.metrics.epe_max_nm, result[i].epeMaxNm);
    assert.equal(result[i].initialEpeMeanNm, 20);
    assert.equal(updates[i], result[i]);
  }
  assert.equal(api.opcImprovementPercent(result[0].initialEpeMeanNm, result[1].epeMeanNm), 75);
  assert.ok(api.requests.every(r => r.grid === base.grid), "OPC preserves the workspace grid");
});

test("an empty print cannot publish a zero EPE or an applied candidate", async () => {
  const api = loadCorrection(body => ({ ...printed(body), contours_nm: [] }));
  const updates = [];
  await assert.rejects(api.runOpcCorrection([rect()], [rect()], base, options, r => updates.push(r)), /no printed contour.*EPE is unavailable/);
  assert.equal(updates.length, 0);
  assert.equal(api.requests.length, 1);
});

test("a missing feature is an incomplete measurement, not a low average EPE", async () => {
  const api = loadCorrection(body => ({ ...printed(body), contours_nm: printed(body).contours_nm.slice(0, 1) }));
  const targets = [rect(), rect(700, 700)];
  const updates = [];
  await assert.rejects(api.runOpcCorrection(targets, targets, base, options, r => updates.push(r)), /target edge has no measurable contour/);
  assert.equal(updates.length, 0);
});

test("a non-printing later candidate cannot replace the last verified result", async () => {
  const api = loadCorrection((body, count) => count < 3 ? printed(body) : { ...printed(body), contours_nm: [] });
  const updates = [];
  await assert.rejects(api.runOpcCorrection([rect()], [rect()], base, options, r => updates.push(r)), /no printed contour/);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].epeMeanNm, 10);
  assert.equal(updates[0].simResult.metrics.cd_nm, updates[0].maskShapes[0].w_nm);
});

test("a zero baseline produces no Infinity/NaN improvement", async () => {
  const api = loadCorrection(body => printed(body, 0));
  const result = await api.runOpcCorrection([rect()], [rect()], base, options, () => {});
  assert.equal(result[0].epeMeanNm, 0);
  assert.equal(api.opcImprovementPercent(0, 0), null);
  assert.equal(api.opcImprovementPercent(0, 1), null);
});

test("cancellation reaches the in-flight simulation and publishes no late frame", async () => {
  const controller = new AbortController();
  const api = loadCorrection((body, count, signal) => {
    assert.equal(signal, controller.signal);
    if (count === 2) controller.abort();
    return printed(body);
  });
  const updates = [];
  const result = await api.runOpcCorrection([rect()], [rect()], base, options, r => updates.push(r), controller.signal);
  assert.equal(result.length, 0);
  assert.equal(updates.length, 0);
  assert.equal(api.requests.length, 2);
});

test("an aborted fetch preserves earlier verified frames", async () => {
  const controller = new AbortController();
  const api = loadCorrection((body, count) => {
    if (count === 3) { controller.abort(); throw new Error("aborted"); }
    return printed(body);
  });
  const result = await api.runOpcCorrection([rect()], [rect()], base, options, () => {}, controller.signal);
  assert.equal(result.length, 1);
  assert.equal(result[0].epeMeanNm, 10);
});

test("unsupported targets fail clearly instead of reporting zero EPE", async () => {
  const api = loadCorrection(printed);
  const polygon = { type: "polygon", points_nm: [{ x_nm: 0, y_nm: 0 }, { x_nm: 10, y_nm: 0 }, { x_nm: 0, y_nm: 10 }] };
  await assert.rejects(api.runOpcCorrection([polygon], [polygon], base, options, () => {}), /additive rectangle target/);
  assert.equal(api.requests.length, 0);
});
