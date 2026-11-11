"use strict";
/* Deterministic Laser workload, not an Android FPS estimate.
 * node tests/laser-perf.cjs
 * node tests/laser-perf.cjs --compare /path/to/baseline --repeats 5
 * NODE_PATH=... node tests/laser-perf.cjs --compare /path/to/baseline --raster
 * Pure Node measures CPU/event counts. Optional --raster uses @napi-rs/canvas;
 * it is deliberately not a dependency of the game, smoke tests or normal bench.
 * Scene: 330 static, immortal targets; a 2s channel at 60/120 simulation Hz.
 * Upgraded load: 4 deflections, 2 sweeps, refraction, 3 reflections,
 * 2 deflection reflections, split beam and High-Energy Pulse band.
 * Damage is recorded instead of applying statuses/RNG/kill effects, so comparing
 * checksums proves target order, base damage and tick timestamps are unchanged.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const {performance} = require("node:perf_hooks");
const args = process.argv.slice(2);
function option(name, fallback) {
  const at = args.indexOf(name);
  return at < 0 ? fallback : args[at + 1];
}
const current = path.resolve(option("--source", path.join(__dirname, "..")));
const baseline = option("--compare", null);
const repeats = Math.max(1, Math.min(15, Number(option("--repeats", 3)) || 3));
const raster = args.includes("--raster");
let createCanvas;
if (raster) {
  try { ({createCanvas} = require("@napi-rs/canvas")); }
  catch (_) { throw new Error("--raster needs optional @napi-rs/canvas (set NODE_PATH); omit it for the dependency-free bench."); }
}
function makeHarness(repo) {
  /* Reuse the same DOM/save stub as smoke without executing the tests. No game
     implementation is copied here. The header ends at its test registry. */
  const test = fs.readFileSync(path.join(repo, "tests/smoke.cjs"), "utf8");
  const boundary = test.indexOf("const tests = [];");
  assert.ok(boundary > 0, "smoke harness header is missing");
  const scope = {require, __dirname: path.join(repo, "tests"), console};
  vm.runInNewContext(test.slice(0, boundary) + ";globalThis.makeHarness=harness;", scope);
  return scope.makeHarness;
}
function workload(repo, harness, upgraded, hz) {
  const {game:g} = harness(), cfg = g.ENEMIES[0];
  g.META.music = g.META.sfx = false;
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  const t = g.mkUnit(g.TURRETS.find(c => c.id === "laser"), 52, 0, false);
  g.B.turrets = [t];t.cd = 0;t.laserDurationMul = 100;
  if (upgraded) Object.assign(t, {laserDeflect:4, laserSweep:2, refract:true, reflect:3, deflectReflect:2, beamSplit:true, laserBandMul:2});
  for (let i = 0; i < 330; i++) g.B.enemies.push({
    cfg, kind:cfg.kind, x:15 + i % 15 * 28, y:80 + Math.floor(i / 15) * 27,
    hp:1e9, maxHp:1e9, r:13, armor:0, dead:false, perfIndex:i
  });
  const events = [];
  let damage = 0;
  g.dealDamage = (src, e, d) => {damage += d;events.push(e.perfIndex + ":" + d + ":" + g.B.t + ";");return d;};
  let drawBeams, drawMs = 0, blurred = 0;
  if (raster) {
    const canvas = createCanvas(g.W * 2, g.H * 2), ctx = canvas.getContext("2d");
    g.ctx = new Proxy(ctx, {
      get(target, key) {
        const value = target[key];
        return typeof value !== "function" ? value : (...a) => {
          if (key === "stroke" && target.shadowBlur > 0) blurred++;
          return value.apply(target, a);
        };
      },
      set(target, key, value) {target[key] = value;return true;}
    });
    g.ctx.setTransform(2, 0, 0, 2, 0, 0);
    const renderer = fs.readFileSync(path.join(repo, "src/js/06-render.js"), "utf8");
    const begin = renderer.indexOf(" B.beams.forEach(function(b){");
    const end = renderer.indexOf(" drawBeamStreams();", begin);
    assert.ok(begin >= 0 && end > begin, "beam renderer section is missing");
    vm.runInContext("function perfDrawBeams(){" + renderer.slice(begin, end) + "}", g);
    drawBeams = g.perfDrawBeams;
  }
  let maxVisuals = 0, visualSum = 0;
  const start = performance.now();
  for (let i = 0; i < hz * 2; i++) {
    g.B.t += 1 / hz;g.fireLaser(t, 1 / hz);
    g.B.beams = g.B.beams.filter(b => {b.t += 1 / hz;return b.t < b.life;});
    maxVisuals = Math.max(maxVisuals, g.B.beams.length);visualSum += g.B.beams.length;
    if (drawBeams && i >= hz * 2 - 8) {const before = performance.now();drawBeams();drawMs += performance.now() - before;}
  }
  const totalMs = performance.now() - start;
  return {
    upgraded, hz, targets:330, seconds:2, hits:events.length, damage,
    checksum:crypto.createHash("sha256").update(events.join("")).digest("hex"),
    maxVisuals, meanVisuals:visualSum / (hz * 2), simulationMs:totalMs - drawMs,
    rasterMsPerFrame:raster ? drawMs / 8 : null, blurredStrokesPerFrame:raster ? blurred / 8 : null
  };
}
function median(values) {const v = values.slice().sort((a,b) => a-b);return v[Math.floor(v.length / 2)];}
function measure(repo) {
  const harness = makeHarness(repo), groups = [];
  for (const upgraded of [false,true]) for (const hz of [60,120]) {
    const runs = [];
    for (let i = 0; i < repeats; i++) runs.push(workload(repo,harness,upgraded,hz));
    runs.forEach(r => {assert.equal(r.checksum,runs[0].checksum,"fixture must be deterministic");});
    const summary = {...runs[0]};
    for (const k of ["maxVisuals","meanVisuals","simulationMs","rasterMsPerFrame","blurredStrokesPerFrame"])
      if (summary[k] !== null) summary[k] = +median(runs.map(r => r[k])).toFixed(3);
    groups.push(summary);
  }
  return groups;
}
const before = baseline ? measure(path.resolve(baseline)) : null;
const after = measure(current);
after.forEach((row,i) => {
  assert.ok(row.maxVisuals <= (row.upgraded ? 24 : 1), "laser visuals must be bounded independently of display Hz");
  if (raster) assert.equal(row.blurredStrokesPerFrame,0,"laser ray renderer must not blur long strokes");
  if (before) assert.equal(row.checksum,before[i].checksum,"optimized Laser changed targets, damage or tick cadence");
});
console.log(JSON.stringify({protocol:{seconds:2,targets:330,repeats,raster,device:"Node/native CPU raster; not Android FPS"},before,after},null,2));
