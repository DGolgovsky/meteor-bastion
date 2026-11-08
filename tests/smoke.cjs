"use strict";
/* Meteor Bastion headless regression checks. Run with: node tests/smoke.cjs
 * No npm, browser, network, or external dependencies required. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "index.html must contain one inline game script");

function harness(legacySave) {
  const nodes = new Map();
  const gradient = { addColorStop() {} };
  const canvasContext = new Proxy({
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient
  }, {
    get(target, key) { return target[key] ?? (() => {}); },
    set(target, key, value) { target[key] = value; return true; }
  });
  function element(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set();
    const value = {
      id, style: {}, dataset: {}, clientWidth: 420, width: 420, height: 700,
      innerHTML: "", textContent: "", disabled: false,
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); },
        toggle(name, on) {
          if (on === undefined) on = !classes.has(name);
          if (on) classes.add(name);
          else classes.delete(name);
          return on;
        }
      },
      getBoundingClientRect() { return { top: 0, left: 0, width: 420, height: 700 }; },
      getContext() { return canvasContext; },
      setPointerCapture() {},
      addEventListener() {},
      appendChild() {},
      querySelector() { return element("_child:" + id); },
      querySelectorAll() { return []; }
    };
    nodes.set(id, value);
    return value;
  }
  const store = new Map();
  if (legacySave) store.set("meteor-bastion-save-v1", JSON.stringify(legacySave));
  let nextId = 0, seed = 3121;
  const seededMath = Object.create(Math);
  seededMath.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const sandbox = {
    document: {
      getElementById: element,
      createElement: () => element("_created:" + (++nextId)),
      querySelectorAll: () => []
    },
    window: {
      innerWidth: 420, devicePixelRatio: 1,
      addEventListener() {}, scrollTo() {}
    },
    localStorage: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value)
    },
    Math: seededMath,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox, { filename: "index.html", timeout: 10000 });
  return { game: sandbox, store };
}

function sampleEnemy(g, y = 340) {
  const cfg = g.ENEMIES[0];
  return {
    cfg, kind: cfg.kind, x: 180, y, hp: 1000, maxHp: 1000,
    speed: 0, dmg: 20, armor: 0, xp: 1, r: cfg.r, color: cfg.color,
    phase: 0, flash: 0, slowFactor: 1, slowT: 0,
    burnDps: 0, burnT: 0, dead: false, healT: 1
  };
}

const tests = [];
function test(name, fn) {
  fn();
  tests.push(name);
  console.log("PASS " + name);
}

const { game: g } = harness();

test("game initializes and uses the old save key", () => {
  assert.equal(g.TURRETS.length, 10);
  assert.equal(g.SAVE_KEY, "meteor-bastion-save-v1");
  assert.equal(g.WAVES, 20);
});

test("legacy v1 saves load and level is clamped at 45", () => {
  const { game: old } = harness({
    v: 1, coins: 777, energy: 12, levels: { skyguard: 88 },
    mats: { skyguard: 123 }, music: false
  });
  assert.equal(old.META.coins, 777);
  assert.equal(old.META.levels.skyguard, 45);
  assert.equal(old.META.mats.skyguard, 123);
  assert.equal(old.META.music, false);
});

test("swept collisions detect enemies between frame endpoints", () => {
  assert.notEqual(g.sweptContact(0, 0, 100, 0, 50, 2, 8), null);
  assert.equal(g.sweptContact(0, 0, 100, 0, 50, 40, 8), null);
});

test("Guardian starts and canvas renders", () => {
  g.startBattle();
  assert.equal(g.META.energy, 25);
  assert.ok(g.B.soldier);
  g.update(0.05);
  g.draw();
});

test("Firewheel spawns airborne bouncing discs", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  const u = g.mkUnit(g.TURRETS.find(t => t.id === "firewheel"), 52, 0, false);
  g.B.turrets = [u];
  g.B.enemies = [sampleEnemy(g)];
  g.unitFire(u, 0.4);
  assert.ok(g.B.wheels.length > 0);
});

test("Hive launches repeated-attack wasps", () => {
  const u = g.mkUnit(g.TURRETS.find(t => t.id === "hive"), 52, 0, false);
  g.B.turrets = [u];
  g.B.drones = [];
  g.unitFire(u, 0.5);
  assert.equal(g.B.drones.length, u.hiveCount);
  assert.ok(g.B.drones[0].hits > 1);
});

test("every specialist card renders and applies without exceptions", () => {
  const mods = {
    laser: ["laserSweep", "laserDeflect", "laserDuration"],
    beam: ["beamDuration", "beamFocus"],
    tesla: ["teslaMatrix", "teslaMatrixPlus", "teslaChain"],
    hive: ["hiveCount", "hiveAttacks"],
    firewheel: ["wheelDuration"]
  };
  for (const [id, names] of Object.entries(mods)) {
    for (const mod of names) {
      g.B = g.newBattle(g.STAGES[0]);
      g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
      const u = g.mkUnit(g.TURRETS.find(t => t.id === id), 52, 0, false);
      u.runLv = 3;
      g.B.turrets = [u];
      g.B.wave = 1;
      g.B.waveState = "draft";
      g.B.pendingDrafts = 1;
      const card = { kind: "mod", u, mod };
      assert.ok(g.cardHTML(card).desc, mod);
      g.applyCard(card);
      assert.ok(u.mods.includes(mod), mod);
    }
  }
});

test("random three-card drafts always have valid display data", () => {
  for (const cfg of g.TURRETS) {
    g.B = g.newBattle(g.STAGES[0]);
    g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
    const u = g.mkUnit(cfg, 52, 0, false);
    u.runLv = 4;
    g.B.turrets = [u];
    g.B.usedTypes[cfg.id] = 1;
    for (let i = 0; i < 100; i++) {
      const cards = g.genCards();
      assert.equal(cards.length, 3);
      for (const card of cards) assert.ok(g.cardHTML(card).desc);
    }
  }
});

test("final boss appears even after the regular spawn queue is empty", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  g.B.wave = 20;
  g.B.waveState = "fighting";
  g.B.waveQueue = 0;
  g.update(0.05);
  assert.ok(g.B.bossSpawned);
  assert.ok(g.B.enemies.some(e => e.kind === "boss"));
});

test("draft progression yields roughly 21 picks for a full clear", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.addDraftScore(1791);
  assert.equal(g.B.draftsEarned, 21);
});

test("smoke combat loops do not crash during spawning and drawing", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  g.startWave(1);
  for (let i = 0; i < 360; i++) {
    if (g.B.waveState === "draft") {
      g.applyCard(g.curCards[0]);
    } else {
      g.update(0.05);
    }
    if (i % 30 === 0) g.draw();
    if (g.B.over) break;
  }
  assert.ok(g.B.kills >= 2);
});

console.log("\n" + tests.length + " smoke tests passed.");
