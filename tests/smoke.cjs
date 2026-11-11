"use strict";
/* Meteor Bastion headless regression checks. Run with: node tests/smoke.cjs
 * No npm, browser, network, or external dependencies required. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

/* Construct the same HTML produced by build.py directly from checked-in modules.
 * A fresh clone has no generated index.html; tests must still work. */
const root = path.join(__dirname, "..");
const shell = fs.readFileSync(path.join(root, "src", "shell.html"), "utf8");
const order = fs.readFileSync(path.join(root, "src", "order.txt"), "utf8").split(/\r?\n/)
  .map(s => s.trim()).filter(s => s && !s.startsWith("#"));
const source = order.map(name => fs.readFileSync(path.join(root, "src", "js", name), "utf8")).join("");
assert.ok(shell.includes("<!-- __GAME_JS__ -->"), "shell must contain JS placeholder");
const html = shell.replace("<!-- __GAME_JS__ -->", source);
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "index.html must contain one inline game script");

function harness(legacySave) {
  const nodes = new Map();
  const gradient = { addColorStop() {} };
  const canvasContext = new Proxy({
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    /* measureText: width approximation for the current font (for the adaptive HUD) */
    measureText(s) {
      const m = /(\d+(?:\.\d+)?)px/.exec(canvasContext.font || "11px");
      const size = m ? parseFloat(m[1]) : 11;
      return { width: s.length * size * 0.6 };
    },
    /* arc: mirror the browser — a negative radius throws IndexSizeError */
    arc(x, y, radius) {
      if (radius < 0) throw new Error("IndexSizeError: Failed to execute 'arc' on 'CanvasRenderingContext2D': The radius provided (" + radius + ") is negative.");
    }
  }, {
    get(target, key) { return target[key] ?? (() => {}); },
    set(target, key, value) { target[key] = value; return true; }
  });
  function element(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set();
    const value = {
      id, style: {}, dataset: {}, clientWidth: 420, width: 420, height: 820,
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
      getBoundingClientRect() { return { top: 0, left: 0, width: 420, height: 820 }; },
      getContext() { return canvasContext; },
      setPointerCapture() {},
      listeners: {},
      addEventListener(name, fn) { (value.listeners[name] ||= []).push(fn); },
      appendChild() {},
      querySelector() { return element("_child:" + id); },
      querySelectorAll() { return []; }
    };
    nodes.set(id, value);
    return value;
  }
  const store = new Map();
  if (legacySave) store.set("meteor-bastion-save-v1", JSON.stringify(legacySave));
  let nextId = 0, seed = arguments.length>=2?arguments[1]:3121;
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
  return { game: sandbox, store, element };
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
  assert.equal(g.TURRETS.length, 11);
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
  // "Firefly": one large long-lived disc; repeated shots do not spawn new ones while it is alive.
  assert.equal(g.B.wheels.length, 1);
  assert.ok(g.B.wheels[0].life >= 9, "disc should live ~10s, got " + g.B.wheels[0].life);
  // owner request 2026-11-11: the disc is bigger (r 20, was 14) and slower (200 px/s, was 290)
  assert.equal(g.B.wheels[0].r, 20);
  assert.ok(Math.abs(Math.hypot(g.B.wheels[0].vx, g.B.wheels[0].vy) - 200) < 1e-6);
  for (let i = 0; i < 5; i++) g.unitFire(u, 0.8);
  assert.equal(g.B.wheels.length, 1);
  g.applyCardDef(g.cardById("firewheel", "sizeBoost"), u);
  g.B.wheels = []; u.cd = 0; g.unitFire(u, 0.1);
  assert.equal(g.B.wheels[0].r, 25, "Size Boost +25%");
});

test("Guardian fires alternating hands in a checkerboard stream", () => {
  g.B = g.newBattle(g.STAGES[0]);
  const s = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  g.B.soldier = s;
  g.B.turrets = [];
  const e = sampleEnemy(g, 300);
  e.x = 210;
  g.B.enemies = [e];
  const xs = [];
  for (let i = 0; i < 14; i++) {
    const before = g.B.projs.length;
    g.unitFire(s, 0.2);
    if (g.B.projs.length > before) xs.push(g.B.projs[g.B.projs.length - 1].x);
  }
  assert.ok(xs.length >= 4, "soldier should fire repeatedly, got " + xs.length);
  for (let i = 1; i < xs.length; i++) {
    assert.ok((xs[i] - 210) * (xs[i - 1] - 210) < 0, "consecutive shots must alternate hands");
  }
});

test("Hive launches repeated-attack wasps", () => {
  const u = g.mkUnit(g.TURRETS.find(t => t.id === "hive"), 52, 0, false);
  g.B.turrets = [u];
  g.B.drones = [];
  // the test depended on an enemy left over from the previous test; with the taller field
  // (BASEY 720) that enemy ended up outside the hive radius, so we place our own, within range
  g.B.enemies = [sampleEnemy(g, 500)];
  g.unitFire(u, 0.5);
  assert.equal(g.B.drones.length, u.hiveCount);
  assert.ok(g.B.drones[0].hits > 1);
});

test("every declarative card renders and applies without exceptions", () => {
  const { game: c } = harness();
  c.META.music = false; c.META.sfx = false;
  for (const id of Object.keys(c.META.levels)) c.META.levels[id] = 45;
  for (const def of c.CARDS) {
    c.B = c.newBattle(c.STAGES[0]);
    c.B.soldier = c.mkUnit(c.SOLDIER_CFG, 210, -1, true);
    const u = def.unit === "soldier" ? c.B.soldier : c.mkUnit(c.TURRETS.find(t => t.id === def.unit), 52, 0, false);
    if (def.unit !== "soldier") c.B.turrets = [u];
    u.runLv = def.lvl; u.pips = def.rare ? 3 : 0;
    (def.req || []).forEach(r => u.mods.push(r));
    c.B.wave = 1; c.B.waveState = "draft"; c.B.pendingDrafts = 1;
    assert.ok(c.cardEligible(u, def), def.unit + ":" + def.id + " must be eligible");
    const card = { kind: "card", u, def };
    const h = c.cardHTML(card);
    assert.ok(h.desc && h.name && h.tag, def.id);
    assert.equal(h.cls, def.rare ? "purple" : "teal");
    c.applyCard(card);
    assert.equal(u.cards[def.id], 1, def.id);
    if (def.rare) assert.equal(u.runLv, Math.min(3, def.lvl + 1), def.id + " must level the unit up (max 3)");
    if (def.rare) assert.equal(u.pips, 0, def.id + " resets pips");
  }
});

test("card text is generated from the same fx ops that apply the effect", () => {
  for (const def of g.CARDS) {
    const desc = g.cardDesc(def);
    for (const op of def.fx) {
      if (op.mul !== undefined) assert.ok(desc.includes(Math.abs(Math.round((op.mul - 1) * 100)) + "%"), def.id + ": " + desc);
      if (op.add !== undefined && op.l) assert.ok(desc.includes(op.pct ? Math.round(op.add * 100) + "%" : String(op.add)), def.id + ": " + desc);
    }
  }
  const t = g.cardById("hive", "denseSwarm");
  assert.equal(g.cardDesc(t), "Wasps +2, DMG -15%.");
  assert.equal(g.cardDesc(g.cardById("skyguard", "volleyMissile")), "Sky Guard missiles +1, DMG -15%.");
  assert.equal(g.cardDesc(g.cardById("laser", "laserAmplification")), "Laser DMG +50%.");
});

test("reference rules: no SUPER cards, Super Mode at max level; every unit can level from a fresh account", () => {
  assert.equal(typeof g.CARD_CHAINS, "undefined");
  assert.equal(typeof g.gainLevel, "undefined");
  assert.ok(!/kind:"up"|kind:"mod"|kind:"chain"/.test(source), "old card kinds must be removed");
  assert.equal(g.CARDS.filter(d => d.isSuper).length, 0, "Super Mode is not a card any more");
  for (const cfg of g.allUnitsCfg()) {
    const normal1 = g.CARDS.filter(d => d.unit === cfg.id && !d.rare && d.lvl === 1 && d.rd <= 1);
    assert.ok(normal1.length >= 3, cfg.id + " needs at least 3 Tier-1 cards at R&D 1, has " + normal1.length);
    const purple1 = g.CARDS.filter(d => d.unit === cfg.id && d.rare && d.lvl === 1 && d.rd <= 1);
    assert.ok(purple1.length >= 1, cfg.id + " needs a Tier-1 Extra at R&D 1");
    assert.ok(g.SUPERS[cfg.id], cfg.id + " has a Super Mode");
  }
  /* reference "Lv.10: Super Mode at max level" */
  ["laser", "aeroblast", "gravity", "firewheel"].forEach(id => assert.equal(g.rdTierUnlock(id), 10, id));
});

test("pips: Tier pools grow with level, 3 pips unlock rarer Extras, Lv.3 turns Super Mode on, then mastery cycles", () => {
  const { game: c } = harness();
  c.META.music = false; c.META.sfx = false;
  c.B = c.newBattle(c.STAGES[0]);
  c.B.soldier = c.mkUnit(c.SOLDIER_CFG, 210, -1, true);
  const u = c.mkUnit(c.TURRETS.find(t => t.id === "tesla"), 52, 0, false);
  c.B.turrets = [u]; c.B.usedTypes.tesla = 1;
  const take = def => { c.B.pendingDrafts = 1; c.B.waveState = "draft"; c.applyCard({ kind: "card", u, def }); };
  const ids = () => c.unitCards(u).map(d => d.id);
  assert.equal(u.runLv, 1); assert.equal(u.pips, 0);
  assert.equal(c.purpleFor(u), null, "no purple before 3 pips");
  assert.ok(!ids().includes("chargeDestruction"), "Tier-2 cards need unit Lv.2");
  assert.ok(!ids().includes("trapMatrix"), "Trap Matrix needs R&D 2 (reference Lv.2 unlock)");
  take(c.cardById("tesla", "electroBoost"));
  take(c.cardById("tesla", "electroChain"));
  assert.equal(u.pips, 2);
  assert.ok(c.genCards().every(x => !(x.kind === "card" && x.def.rare)), "Extras need 3 pips");
  take(c.cardById("tesla", "electroAcceleration"));
  assert.equal(u.pips, 3);
  const purples = c.unitCards(u).filter(d => d.rare).map(d => d.id).sort();
  assert.equal(JSON.stringify(purples), JSON.stringify(["electricChainSurge", "electroInterference"]), "Tier-1 Extras");
  let extraDrafts = 0;
  for (let i = 0; i < 200; i++) {
    const cards = c.genCards().filter(x => x.kind === "card" && x.def.rare);
    if (cards.length) extraDrafts++;
  }
  assert.ok(extraDrafts > 0 && extraDrafts < 200, "Extras are possible but not forced");
  take(c.cardById("tesla", "chargeExpansion"));
  assert.equal(u.pips, 3, "pips do not overflow past 3 before the purple card");
  const dmg = u.dmgMul;
  take(c.cardById("tesla", "electroInterference"));
  assert.equal(u.runLv, 2); assert.equal(u.pips, 0);
  assert.ok(Math.abs(u.dmgMul / dmg - (1 + c.BALANCE.levelUpDmg)) < 1e-9, "level-up damage bonus");
  assert.ok(ids().includes("chargeDestruction") && !ids().includes("enhancedMatrix"), "Enhanced Matrix needs R&D 6");
  c.META.levels.tesla = 6;
  assert.ok(ids().includes("enhancedMatrix"));
  assert.ok(!ids().includes("chargeDelayed"), "Tier-3 cards need unit Lv.3");
  u.pips = 3;
  const p2 = c.unitCards(u).filter(d => d.rare).map(d => d.id).sort();
  assert.equal(JSON.stringify(p2), JSON.stringify(["chargedShock", "electricChainSurge", "expandedShockwave"]), "Tier ≤ 2 Extras");
  c.META.levels.tesla = c.rdTierUnlock("tesla");
  take(c.cardById("tesla", "chargedShock"));
  assert.equal(u.runLv, 3); assert.equal(u.superOn, true, "Super Mode switches on at max level");
  assert.equal(u.multiCount, 6, "Overvoltage applied");
  assert.ok(c.B.picked.some(p => p.id === "super"));
  assert.ok(ids().includes("chargeDelayed"));
  u.pips = 3;
  take(c.cardById("tesla", "expandedShockwave"));
  assert.equal(u.runLv, 3, "level 3 is the maximum"); assert.equal(u.pips, 0, "mastery cycle resets pips");
  take(c.cardById("tesla", "chargeDelayed"));
  assert.equal(u.pips, 1);
  assert.ok(c.B.picked.length >= 7 && c.B.picked.find(p => p.id === "electroChain").n === 1, "picked cards are recorded");
});

test("without enough R&D a turret reaches Lv.3 but Super Mode stays off", () => {
  const { game: c } = harness();
  c.META.music = false; c.META.sfx = false;
  c.B = c.newBattle(c.STAGES[0]);
  const u = c.mkUnit(c.TURRETS.find(t => t.id === "laser"), 52, 0, false);
  c.B.turrets = [u];
  u.runLv = 2; u.pips = 3;
  c.takeCard(u, c.cardById("laser", "vulnerableLaser")); u.pips = 3;
  c.takeCard(u, c.cardById("laser", "tearExplosion"));
  assert.equal(u.runLv, 3); assert.ok(!u.superOn);
  assert.ok(!u.refract);
});

test("random three-card drafts always have valid display data", () => {
  for (const cfg of g.TURRETS) {
    for (const lv of [1, 2, 3]) {
      g.B = g.newBattle(g.STAGES[0]);
      g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
      const u = g.mkUnit(cfg, 52, 0, false);
      u.runLv = lv; u.pips = 3;
      g.B.turrets = [u];
      g.B.usedTypes[cfg.id] = 1;
      for (let i = 0; i < 40; i++) {
        const cards = g.genCards();
        assert.equal(cards.length, 3);
        for (const card of cards) assert.ok(g.cardHTML(card).desc);
      }
    }
  }
});

test("a draft is never empty once every unit card is taken", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  g.B.turrets = [0, 1, 2, 3].map(i => g.mkUnit(g.TURRETS[i], g.TURRET_X[i], i, false));
  g.B.turrets.forEach(u => { g.B.usedTypes[u.cfg.id] = 1; });
  g.allFighters().forEach(u => { u.runLv = 3; u.pips = 4; g.CARDS.forEach(d => { if (d.unit === u.cfg.id) u.cards[d.id] = 9; }); });
  ["boost", "healm", "regenm", "jam"].forEach(m => { g.B.modulesUsed[m] = 1; });
  const cards = g.genCards();
  assert.equal(cards.length, 3);
  assert.ok(cards.every(c => c.kind === "module" && c.modId === "patch"));
  g.B.baseHp = 500; g.B.pendingDrafts = 1; g.applyCard(cards[0]);
  assert.equal(g.B.baseHp, 620);
});

function cardBattle(c) {
  c.B = c.newBattle(c.STAGES[0]);
  c.B.soldier = c.mkUnit(c.SOLDIER_CFG, 210, -1, true);
  c.B.wave = 3; c.B.waveState = "fighting"; c.B.waveQueue = 1; c.B.spawnT = 999;
}
test("Impact Multiplier triples only the missile impact; Impact Reinforcement launches 3 impact-only small missiles", () => {
  cardBattle(g);
  const sg = g.mkUnit(g.TURRETS.find(t => t.id === "skyguard"), 52, 0, false);
  sg.critBonus = -1; sg.dmgMul = 1; g.B.turrets = [sg];
  const a = sampleEnemy(g, 400), far = sampleEnemy(g, 400); far.x = 400;
  g.B.enemies = [a, far];
  g.applyHit({ src: sg, dmg: 100 }, a);
  const base = 1000 - a.hp;
  a.hp = 1000;
  g.applyCardDef(g.cardById("skyguard", "impactMultiplier"), sg);
  assert.equal(sg.impactMul, 3);
  g.applyHit({ src: sg, dmg: 100 }, a);
  const boosted = 1000 - a.hp;
  const r = g.ENEMIES[0].res.fire;
  assert.ok(Math.abs((boosted - base) - 100 * 0.55 * 2 * r) < 1e-6, "only the impact part grows: " + base + " -> " + boosted);
  g.applyCardDef(g.cardById("skyguard", "impactReinforcement"), sg);
  const before = g.B.projs.length;
  g.applyHit({ src: sg, dmg: 100 }, a);
  const minis = g.B.projs.slice(before);
  assert.equal(minis.length, 3);
  assert.ok(minis.every(m => m.mini && Math.abs(m.dmg - 50) < 1e-9));
  const hp = far.hp, n = g.B.projs.length;
  g.applyHit(minis[0], far);
  assert.equal(g.B.projs.length, n, "small missiles never spawn more missiles");
  assert.ok(Math.abs((hp - far.hp) - 50 * 0.55 * 3 * r) < 1e-6, "small missile = impact damage only");
});

test("Wasp Evolution II evolves a wasp after 3 attacks; Electro-Wasps shock nearby enemies with Electric damage", () => {
  cardBattle(g);
  const hive = g.mkUnit(g.TURRETS.find(t => t.id === "hive"), 52, 0, false);
  g.B.turrets = [hive];
  hive.waspEvolve = 3; hive.electroWasps = true;
  const tgt = sampleEnemy(g, 500); tgt.hp = tgt.maxHp = 1e6;
  const near = sampleEnemy(g, 500); near.x = tgt.x + 40; near.hp = near.maxHp = 1e6;
  g.B.enemies = [tgt, near];
  const dr = { x: tgt.x, y: tgt.y + 2, src: hive, life: 9, tgt, hitT: 0, hits: 20, boost: 1, tier: 1, echoed: false, isEcho: false, launchT: 0, vx: 0, vy: 0 };
  g.B.drones = [dr];
  for (let i = 0; i < 3; i++) { dr.hitT = 0; dr.x = tgt.x; dr.y = tgt.y + 6; dr.tgt = tgt; g.update(0.01); }
  assert.equal(dr.evolved, true, "wasp must evolve after 3 attacks");
  assert.equal(dr.boost, 1.5);
  for (let i = 0; i < 12; i++) { dr.hitT = 0; dr.x = tgt.x; dr.y = tgt.y + 6; dr.tgt = tgt; g.update(0.01); }
  assert.ok(near.hp < near.maxHp, "electro shock must reach the neighbour");
  assert.ok(g.B.beams.some(b => b.arc && b.color === "#a5f3fc"));
});

test("Laser fires only from the turret: High-Energy Pulse band, Energy Surge deflected lasers with Slow, width grows with power", () => {
  cardBattle(g);
  const laser = g.mkUnit(g.TURRETS.find(t => t.id === "laser"), 210, 0, false);
  g.B.turrets = [laser];
  const ox = 210, oy = laser.y - 14, d = 300;
  const main = sampleEnemy(g, oy - d); main.x = ox;
  const side = sampleEnemy(g, oy - d); side.x = ox + main.r + 8 + 10;
  /* deflected lasers are locked at ±0.3 rad from the main line and start at the turret */
  const o1 = sampleEnemy(g, oy - d * Math.cos(0.3)); o1.x = ox + d * Math.sin(0.3);
  const o2 = sampleEnemy(g, oy - d * Math.cos(0.3)); o2.x = ox - d * Math.sin(0.3);
  [main, side, o1, o2].forEach(e => { e.speed = 0; e.baseSpeed = 0; });
  g.B.enemies = [main, side, o1, o2];
  laser.cd = 0; g.unitFire(laser, 0.2);
  assert.equal(side.hp, 1000, "a normal laser misses an enemy 10px outside its band");
  assert.equal(o1.hp, 1000, "no deflected lasers without the card");
  const w0 = g.laserWidth(laser);
  g.applyCardDef(g.cardById("laser", "highEnergyPulse"), laser);
  g.applyCardDef(g.cardById("laser", "energySurge"), laser);
  g.applyCardDef(g.cardById("laser", "slowLaser"), laser);
  assert.equal(laser.laserBandMul, 2); assert.equal(laser.laserDeflect, 2);
  g.B.beams = [];
  laser.cd = 0; laser.laserActive = 0; laser.laserTickT = 0; g.unitFire(laser, 0.2);
  assert.ok(side.hp < 1000, "a doubled band hits it");
  assert.ok(o1.hp < 1000 && o2.hp < 1000, "two deflected lasers hit two other enemies");
  assert.ok(o1.slowFactor < 1 && o2.slowFactor < 1, "deflected lasers slow");
  const lasers = g.B.beams.filter(b => b.laser);
  assert.ok(lasers.length >= 3);
  assert.ok(lasers.every(b => b.x1 === ox && b.y1 === oy), "every laser starts at the turret");
  /* thickness follows damage power */
  const w1 = g.laserWidth(laser);
  g.applyCardDef(g.cardById("laser", "laserAmplification"), laser);
  assert.ok(g.laserWidth(laser) > w1 && w1 > w0, "laser width grows with damage power");
  laser.dmgMul *= 100;
  assert.ok(g.laserWidth(laser) <= 3 * 3 * 2 + 1e-9, "width is capped");
});

test("Laser Reflection, Sweeping Lasers and Convergence beams all originate at the turret", () => {
  cardBattle(g);
  const laser = g.mkUnit(g.TURRETS.find(t => t.id === "laser"), 210, 0, false);
  g.B.turrets = [laser];
  laser.reflect = 2; laser.laserSweep = 2; laser.sweepPasses = 2; laser.convergence = true; laser.tearExplosion = true;
  const ox = 210, oy = laser.y - 14;
  const es = [];
  for (let i = 0; i < 8; i++) { const e = sampleEnemy(g, 300 + (i % 3) * 40); e.x = 120 + i * 25; e.speed = 0; e.baseSpeed = 0; e.hp = e.maxHp = 1e6; es.push(e); }
  g.B.enemies = es;
  laser.cd = 0;
  let sweepAngles = new Set();
  for (let i = 0; i < 40; i++) {
    g.B.beams = [];
    g.unitFire(laser, 0.05);
    const ls = g.B.beams.filter(b => b.laser);
    assert.ok(ls.every(b => Math.abs(b.x1 - ox) < 1e-9 && Math.abs(b.y1 - oy) < 1e-9), "all laser beams start at the turret");
    g.B.beams.filter(b => b.color === "#a7f3d0").forEach(b => sweepAngles.add(Math.round(Math.atan2(b.y2 - b.y1, b.x2 - b.x1) * 20)));
    const rips = g.B.beams.filter(b => b.color === "#ff6b9a");
    assert.ok(rips.every(b => Math.abs(b.x1 - ox) < 1e-9), "Tear Explosion ripping lasers start at the turret");
  }
  assert.ok(sweepAngles.size >= 6, "sweeping lasers really sweep: " + sweepAngles.size);
  assert.ok(es.filter(e => e.hp < e.maxHp).length >= 5, "reflections/sweeps reach several enemies");
});

test("Beam Refraction adds 2 refracted beams, Beam Penetration makes every beam hit Vulnerable", () => {
  cardBattle(g);
  const beam = g.mkUnit(g.TURRETS.find(t => t.id === "beam"), 52, 0, false);
  g.B.turrets = [beam];
  const t1 = sampleEnemy(g, 400); t1.maxHp = 5000; t1.hp = 5000;
  const n1 = sampleEnemy(g, 420), n2 = sampleEnemy(g, 440), n3 = sampleEnemy(g, 470);
  g.B.enemies = [t1, n1, n2, n3];
  g.applyCardDef(g.cardById("beam", "beamRefraction"), beam);
  g.applyCardDef(g.cardById("beam", "beamPenetration"), beam);
  beam.cd = 0; g.unitFire(beam, 0.05);
  assert.ok(t1.vulnerableStacks > 0, "main beam inflicts Vulnerable");
  assert.ok(n1.hp < 1000 && n2.hp < 1000 && n3.hp === 1000, "exactly the 2 nearest enemies are refracted to");
  assert.ok(n1.vulnerableStacks > 0);
});

test("Guardian: Piercing Bullet, Flame Bullet and Shotgun Evolution (the documented real-spread exception)", () => {
  cardBattle(g);
  const s = g.B.soldier; g.B.turrets = [];
  const e = sampleEnemy(g, 300); e.x = 210; g.B.enemies = [e];
  ["piercingBullet", "flameBullet", "shotgunEvolution"].forEach(id => g.applyCardDef(g.cardById("soldier", id), s));
  let shots = null;
  for (let i = 0; i < 20 && !shots; i++) { const before = g.B.projs.length; g.unitFire(s, 0.3); if (g.B.projs.length > before) shots = g.B.projs.slice(before); }
  assert.equal(shots.length, 3, "1 bullet + 2 scattered");
  const angles = shots.map(p => Math.atan2(p.vy, p.vx));
  assert.ok(Math.max(...angles) - Math.min(...angles) > 0.2, "Shotgun Evolution must truly spread");
  assert.ok(shots.every(p => p.pierce === 1), "Piercing Bullet +1 penetration");
  g.applyHit(shots[0], e);
  assert.ok(e.burnT > 0 && e.burnDps > 0, "Flame Bullet ignites the target");
});

test("draft shows the 5-slot level/pip row; Selected Cards overview opens from draft, pause and results", () => {
  const { game: c, element } = harness();
  c.META.music = false; c.META.sfx = false;
  cardBattle(c);
  const hive = c.mkUnit(c.TURRETS.find(t => t.id === "hive"), c.TURRET_X[0], 0, false);
  c.B.turrets = [hive]; c.B.usedTypes.hive = 1;
  c.B.pendingDrafts = 2; c.B.waveState = "draft";
  c.applyCard({ kind: "card", u: hive, def: c.cardById("hive", "denseSwarm") });
  const row = element("lu-build").innerHTML;
  assert.equal((row.match(/class="slot/g) || []).length, 5, "five slots");
  assert.equal((row.match(/class="slot empty/g) || []).length, 3, "three empty turret slots");
  assert.equal((row.match(/pip p/g) || []).length, 5, "the 4th pip of each slot is purple");
  assert.equal((row.match(/pip on/g) || []).length, 1, "one earned pip");
  assert.ok(element("lu-cards") !== null);
  c.openCardsOverview();
  assert.ok(element("ov-cards").classList.contains("on"));
  const grid = element("cards-grid").innerHTML;
  assert.ok(grid.includes("Dense Swarm") && grid.includes("Wasps +2, DMG -15%") && grid.includes('class="mcard teal"'));
  hive.pips = 3; c.B.pendingDrafts = 1;
  c.applyCard({ kind: "card", u: hive, def: c.cardById("hive", "waspEvolutionII") });
  c.openCardsOverview();
  assert.ok(element("cards-grid").innerHTML.includes('class="mcard purple"'), "purple cards have a purple border");
  assert.ok(shell.includes('id="btn-lu-cards"') && shell.includes('id="btn-pause-cards"') && shell.includes('id="btn-res-cards"'));
  /* the field draws pips under every unit */
  c.draw();
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

test("draft progression slows with waves", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.addDraftScore(1791);
  const earlyCards=g.B.draftsEarned;
  assert.ok(earlyCards>=20&&earlyCards<=25,"early card count "+earlyCards);
  g.B = g.newBattle(g.STAGES[0]);
  g.B.wave = 20;
  g.addDraftScore(1791);
  assert.ok(g.B.draftsEarned<earlyCards,"late-wave draft progression should slow down");
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

test("Elite changes composition, champion strength and first-wave pressure", () => {
  const { game: n } = harness(), { game: elite } = harness();
  n.startBattle();elite.setGameMode(true);elite.startBattle();
  n.startWave(1);elite.startWave(1);
  assert.equal(n.B.elite,false);
  assert.equal(elite.B.elite,true);
  assert.ok(elite.B.stage.hpMul > n.B.stage.hpMul);
  assert.ok(elite.B.waveTotal > n.B.waveTotal);
  assert.ok(n.spawnEnemy("meteor"));
  assert.ok(elite.spawnEnemy("meteor"));
  const standard=n.B.enemies[0],champion=elite.B.enemies[0];
  assert.ok(champion.champion, "first elite-wave enemy should be a champion");
  assert.ok(champion.hp > standard.hp);
  assert.ok(champion.dmg > standard.dmg);
  assert.ok(champion.armor > standard.armor);
});

test("enemy counts are tripled: wave totals, spawn pacing and cap", () => {
  assert.equal(g.MAX_ENEMIES, 330);
  assert.equal(g.BALANCE.waveStart, 24);
  assert.equal(g.BALANCE.waveGrowth, 8.4);
  assert.equal(g.BALANCE.spawnBase, 0.20);
  assert.equal(g.BALANCE.spawnMin, 0.06);
  assert.equal(g.BALANCE.formationCd, 1.33);
  assert.equal(g.BALANCE.eliteWaveBase, 6);
  const { game: s } = harness();
  s.startBattle();
  [[1, 32], [10, 108], [20, 192]].forEach(function(pair) {
    s.startWave(pair[0]);
    assert.equal(s.B.waveTotal, pair[1], "Stage 1 wave " + pair[0] + " total");
  });
});

test("Hive uses range only for launch; deployed wasps hunt remote targets", () => {
  g.B=g.newBattle(g.STAGES[0]);g.B.soldier=g.mkUnit(g.SOLDIER_CFG,210,-1,true);
  g.B.wave=3;g.B.waveState="fighting";g.B.waveQueue=1;g.B.spawnT=999;
  const hive=g.mkUnit(g.TURRETS.find(t=>t.id==="hive"),52,0,false);
  g.B.turrets=[hive];
  const close=sampleEnemy(g,560),far=sampleEnemy(g,35);
  close.x=60;far.x=250;
  g.B.enemies=[close,far];
  assert.equal(g.inRange(hive,close),true);
  assert.equal(g.inRange(hive,far),false);
  g.unitFire(hive,0.4);
  assert.ok(g.B.drones.length>0);
  close.dead=true;close.hp=0;
  g.update(0.05);
  assert.ok(g.B.drones.every(dr=>dr.tgt===far),"wasps should follow the distant target outside Hive range");
});

test("Hive drops targets removed after they reach the fortress", () => {
  g.B=g.newBattle(g.STAGES[0]);g.B.soldier=g.mkUnit(g.SOLDIER_CFG,210,-1,true);
  g.B.wave=3;g.B.waveState="fighting";g.B.waveQueue=1;g.B.spawnT=999;
  const hive=g.mkUnit(g.TURRETS.find(t=>t.id==="hive"),52,0,false);
  g.B.turrets=[hive];
  const close=sampleEnemy(g,550),far=sampleEnemy(g,40);
  close.y=g.BASEY-15;close.x=60;far.x=250;
  g.B.enemies=[close,far];
  g.unitFire(hive,0.4);
  g.update(0.05);
  assert.ok(close.dead && !g.B.enemies.includes(close));
  assert.ok(g.B.drones.every(dr=>dr.tgt===far));
});

test("Elite clears persist without changing the v1 save format", () => {
  const {game:elite,store}=harness();
  elite.setGameMode(true);
  elite.startBattle();
  elite.B.wave=20;
  elite.endBattle(true);
  assert.equal(elite.META.eliteCleared[1],true);
  const saved=JSON.parse(store.get("meteor-bastion-save-v1"));
  assert.equal(saved.v,1);
  assert.equal(saved.eliteCleared[1],true);
});

test("stage-focused lobby contains all live controls", () => {
  for(const id of ["home-stage-title","btn-normal","btn-elite","stage-prev","stage-next","hq-scene",
    "btn-stage-chest","btn-home-info","btn-patrol","btn-start","stage-info-body","ov-stage-info",
    "battle-energy-note","home-cur","stage-metrics"]){
    assert.ok(html.includes('id="'+id+'"'),"missing lobby element: "+id);
  }
  g.renderHome(); // DOM shim ensures the mode, stage and metrics can be updated.
});

test("Elite champion aura accelerates nearby enemies", () => {
  const { game: elite } = harness();
  elite.setGameMode(true);
  elite.startBattle();
  elite.startWave(1);
  assert.ok(elite.spawnEnemy("meteor"));
  const champion=elite.B.enemies[0];
  assert.ok(champion.champion);
  champion.y=220;champion.auraT=0;
  const ally=sampleEnemy(elite,245);
  ally.x=champion.x+5;
  elite.B.enemies.push(ally);
  elite.B.spawnT=999;elite.B.waveQueue=1;
  elite.update(0.05);
  assert.ok(ally.hasteT>0,"champion should accelerate a nearby ally");
});

test("mode switch and stage arrows update the actual lobby state", () => {
  const {game: lobby,element}=harness();
  assert.equal(element("home-stage-title").textContent,"NORMAL STAGE 1");
  lobby.setGameMode(true);
  assert.equal(lobby.META.elite,true);
  assert.equal(element("home-stage-title").textContent,"ELITE STAGE 1");
  assert.ok(element("btn-elite").classList.contains("selected"));
  assert.ok(!element("btn-normal").classList.contains("selected"));
  lobby.META.unlocked=2;
  lobby.stepStage(1);
  assert.equal(lobby.META.selStage,2);
  assert.equal(element("home-stage-title").textContent,"ELITE STAGE 2");
  lobby.stepStage(1);
  assert.equal(lobby.META.selStage,2,"stage selector must not navigate beyond unlocked stages");
  lobby.setGameMode(false);
  assert.equal(element("home-stage-title").textContent,"NORMAL STAGE 2");
});

test("12 campaign stages, 20/25/30 waves and saved progress", () => {
  assert.equal(g.STAGES.length,12);
  assert.deepEqual(Array.from(g.STAGES.map(s=>s.waves)),[20,20,20,25,25,25,25,25,30,30,30,30]);
  assert.equal(g.TURRETS.some(t=>t.id==="gravity"),true);
  const {game:late}=harness({v:1,unlocked:12,selStage:12,coins:600,energy:30});
  assert.equal(late.META.unlocked,12);
  assert.equal(late.META.selStage,12);
  late.META.music=false;late.META.sfx=false;
  late.startBattle();
  assert.equal(late.B.stage.waves,30);
  late.B.wave=30;late.B.waveState="fighting";late.B.waveQueue=0;
  late.update(.05);
  assert.equal(late.B.bossSpawned,true,"stage 12 boss must spawn on wave 30");
});

test("R&D gates follow the reference locks and Lv.2/6/10 unlocks; Star Tier gates the in-run level", () => {
  const {game:rnd}=harness();
  rnd.META.music=false;rnd.META.sfx=false;
  rnd.startBattle();
  const t=rnd.mkUnit(rnd.TURRETS.find(t=>t.id==="hive"),52,0,false);
  rnd.B.turrets=[t];
  const ids=()=>rnd.unitCards(t).map(d=>d.id);
  assert.ok(!ids().includes("swarmEcho"),"Swarm Echo is the Lv.2 unlock");
  rnd.META.levels.hive=2;
  assert.ok(ids().includes("swarmEcho"));
  rnd.B.pendingDrafts=1;rnd.applyCard({kind:"card",u:t,def:rnd.cardById("hive","swarmEcho")});
  assert.equal(t.hiveEcho,1);
  t.runLv=2;t.pips=0;
  assert.ok(!ids().includes("echoUpgradeII"),"Echo Upgrade II is the Lv.6 unlock");
  rnd.META.levels.hive=6;
  assert.ok(ids().includes("echoUpgradeII"));
  rnd.META.levels.hive=10;
  assert.ok(!ids().includes("echoUpgradeIII"),"Echo Upgrade III is Star Tier 3");
  t.runLv=3;
  assert.ok(ids().includes("echoUpgradeIII"));
  assert.ok(!ids().includes("swarmAssaultPlus"),"Swarm Assault+ is locked to Lv.26");
  rnd.META.levels.hive=26;
  assert.ok(ids().includes("swarmAssaultPlus"));
  t.runLv=1;
  assert.ok(!ids().includes("echoUpgradeII"),"Tier-2 cards never appear on a level-1 unit");
  /* Guardian locks Lv.61/71/101/121 exceed the R&D cap of 45 and are scaled into it */
  const gd=c=>rnd.cardById("soldier",c).rd;
  assert.equal([gd("volleyShotPlus"),gd("rapidFire"),gd("counterburstScatter"),gd("mirrorGuardian")].join(","),"23,26,38,45");
});

test("Gravity Vortex creates damaging fields that pull enemies", () => {
  g.B=g.newBattle(g.STAGES[0]);g.B.soldier=g.mkUnit(g.SOLDIER_CFG,210,-1,true);
  g.B.wave=4;g.B.waveState="fighting";g.B.waveQueue=1;g.B.spawnT=999;
  const gravity=g.mkUnit(g.TURRETS.find(t=>t.id==="gravity"),52,0,false);
  const victim=sampleEnemy(g,550);victim.x=280;
  g.B.turrets=[gravity];g.B.enemies=[victim];
  gravity.cd=0;g.unitFire(gravity,0.4);
  assert.ok(g.B.fields.some(f=>f.kind==="gravity"));
  const field=g.B.fields[0];
  victim.x=Math.min(410,field.x+field.r*.75);victim.y=field.y;
  const dist=Math.abs(field.x-victim.x),initialHp=victim.hp;
  g.update(0.5);
  assert.ok(Math.abs(field.x-victim.x)<dist,"gravity should pull targets toward its center");
  assert.ok(victim.hp<initialHp,"gravity pulses should deal damage");
});

test("Cloaked scouts and charging attackers have distinct behavior", () => {
  const phase=g.ENEMIES.find(e=>e.id==="phase"),charger=g.ENEMIES.find(e=>e.id==="charger");
  const guardian=g.mkUnit(g.SOLDIER_CFG,210,-1,true),laser=g.mkUnit(g.TURRETS.find(e=>e.id==="laser"),52,0,false);
  const enemy=sampleEnemy(g,400);enemy.cfg=phase;enemy.kind="phase";enemy.cloakT=2;
  assert.equal(g.inRange(guardian,enemy),false);
  assert.equal(g.inRange(laser,enemy),true);
  const rocket=g.mkUnit(g.TURRETS.find(e=>e.id==="skyguard"),52,0,false);
  assert.equal(g.inRange(rocket,enemy),false);
  g.B=g.newBattle(g.STAGES[0]);g.B.soldier=guardian;g.B.wave=2;g.B.waveState="fighting";
  const runner=sampleEnemy(g,450);runner.cfg=charger;runner.kind="charger";runner.speed=charger.speed;
  runner.chargeT=0.01;runner.chargeMul=1;runner.chargeRemaining=0;
  g.B.enemies=[runner];g.B.waveQueue=1;g.B.spawnT=999;
  g.update(.05);
  assert.ok(runner.chargeMul>1);
});

test("enemy breach damages base HP directly and increments leak counter", () => {
  g.B=g.newBattle(g.STAGES[0]);g.B.soldier=g.mkUnit(g.SOLDIER_CFG,210,-1,true);
  g.B.wave=1;g.B.waveState="fighting";g.B.waveQueue=1;g.B.spawnT=999;
  const enemy=sampleEnemy(g,g.BASEY-18);enemy.speed=110;enemy.hp=10000;
  g.B.enemies=[enemy];const hp=g.B.baseHp;
  assert.equal(g.B.shield,undefined,"base has no shield");
  g.update(.05);assert.equal(g.B.leaks,1);
  assert.equal(g.B.baseHp,hp-enemy.dmg,"breach must damage HP in full, no shield absorption");
});

test("Fortress chips spend components and modify the next battle", () => {
  const {game:chip,store}=harness({v:1,coins:200,components:200,energy:30});
  chip.META.music=false;chip.META.sfx=false;
  const base=chip.mkUnit(chip.TURRETS.find(t=>t.id==="skyguard"),52,0,false);
  assert.equal(chip.META.chips.core,0);
  assert.equal(chip.purchaseChip("core"),true);
  assert.equal(chip.purchaseChip("speed"),true);
  assert.equal(chip.purchaseChip("fort"),true);
  const next=chip.mkUnit(chip.TURRETS.find(t=>t.id==="skyguard"),52,0,false);
  assert.ok(next.dmgMul>base.dmgMul);
  assert.ok(next.haste>base.haste);
  const oldComponents=chip.META.components;
  assert.equal(chip.purchaseChip("missing"),false);
  assert.equal(chip.META.components,oldComponents);
  chip.startBattle();
  assert.equal(chip.B.baseMax,1040,"fort chip must add +40 max HP");
  assert.equal(chip.B.baseHp,1040,"fort chip must add +40 HP at battle start");
  assert.equal(chip.B.shield,undefined,"base has no shield");
  const saved=JSON.parse(store.get("meteor-bastion-save-v1"));
  assert.equal(saved.v,1);
  assert.equal(saved.chips.core,1);
  assert.equal(saved.chips.speed,1);
  assert.equal(saved.chips.fort,1);
  for(let i=0;i<4;i++)chip.purchaseChip("core");
  assert.equal(chip.META.chips.core,5);
  assert.equal(chip.purchaseChip("core"),false);
});

test("Laser beam is fixed at the moment of firing and does not track the target", () => {
  g.B=g.newBattle(g.STAGES[0]);g.B.soldier=g.mkUnit(g.SOLDIER_CFG,210,-1,true);
  const laser=g.mkUnit(g.TURRETS.find(t=>t.id==="laser"),52,0,false);
  g.B.turrets=[laser];
  const enemy=sampleEnemy(g,400);enemy.x=180;enemy.speed=0;
  g.B.enemies=[enemy];
  g.unitFire(laser,0.3); /* first shot: the channel starts (cd ≤ 0.2) */
  assert.ok(g.B.beams.length>0,"laser should emit a beam");
  const first=g.B.beams[g.B.beams.length-1];
  const a1=Math.atan2(first.y2-first.y1,first.x2-first.x1);
  assert.ok(Number.isFinite(laser.laserAngle),"laser must store its firing angle");
  assert.equal(laser.laserAngle,Math.atan2(400-(laser.y-14),180-laser.x),"angle must come from the target position at firing time");
  enemy.x=320;enemy.y=250; /* the target abruptly moves sideways */
  g.unitFire(laser,0.05); /* the channel is still active */
  const second=g.B.beams[g.B.beams.length-1];
  const a2=Math.atan2(second.y2-second.y1,second.x2-second.x1);
  assert.ok(Math.abs(a2-a1)<1e-9,"beam must not follow the target after firing: "+a1+" vs "+a2);
});

test("no popup toasts exist anywhere in the game", () => {
  assert.equal(typeof g.toast,"undefined","toast function must be removed");
  assert.ok(!shell.includes('id="toast"'),"toast element must be removed from shell");
  assert.ok(!shell.includes(".toast"),"toast CSS must be removed from shell");
  assert.ok(!source.includes("toast("),"no toast calls may remain in the game code");
});

test("fortress heal module restores HP and no shield module exists", () => {
  g.B=g.newBattle(g.STAGES[0]);g.B.soldier=g.mkUnit(g.SOLDIER_CFG,210,-1,true);
  g.B.baseHp=500;
  assert.equal(g.B.shield,undefined);
  g.applyCard({kind:"module",modId:"healm"});
  assert.equal(g.B.baseHp,750,"heal module must restore 250 HP");
  assert.equal(g.B.modulesUsed.healm,1);
  assert.ok(g.cardHTML({kind:"module",modId:"healm"}).desc.includes("250 HP"));
  assert.ok(!source.includes("shieldm"),"no shield module id may remain in the game code");
});

test("Cosmetic liveries persist in v1 without combat modifiers", () => {
  const {game:appearance,store,element}=harness();
  const soldier=appearance.mkUnit(appearance.SOLDIER_CFG,210,-1,true);
  assert.equal(appearance.META.livery,"classic");
  assert.equal(appearance.setLivery("arctic"),true);
  assert.equal(element("livery-arctic").classList.contains("selected"),true);
  assert.equal(appearance.META.livery,"arctic");
  assert.equal(appearance.setLivery("ember"),true);
  assert.equal(appearance.setLivery("not-a-livery"),false);
  assert.equal(appearance.META.livery,"ember");
  const newSoldier=appearance.mkUnit(appearance.SOLDIER_CFG,210,-1,true);
  assert.equal(newSoldier.dmgMul,soldier.dmgMul);
  assert.equal(newSoldier.haste,soldier.haste);
  const saved=JSON.parse(store.get("meteor-bastion-save-v1"));
  assert.equal(saved.v,1);
  assert.equal(saved.livery,"ember");
  const {game:restored}=harness(saved);
  assert.equal(restored.META.livery,"ember");
});

test("Aeroblast reaches mid-field and keeps an accurate shotgun fan", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  const aero = g.mkUnit(g.TURRETS.find(t => t.id === "aeroblast"), 52, 0, false);
  g.B.turrets = [aero];
  assert.equal(aero.cfg.range, 540, "Aeroblast should engage before enemies reach the base");
  assert.equal(aero.cfg.projSpeed, 520, "pellets must reach distant moving targets quickly");
  const close = sampleEnemy(g, 600); close.x = 52; close.speed = 0;
  g.B.enemies = [close];
  g.unitFire(aero, 0.4);
  const closeShots = g.B.projs.filter(p => p.src === aero);
  assert.equal(closeShots.length, 5);
  const width = shots => Math.max(...shots.map(p => p.vx)) - Math.min(...shots.map(p => p.vx));
  const closeWidth = width(closeShots);
  assert.ok(closeWidth > 50, "close shots still spread like a shotgun");

  g.B.projs = []; aero.cd = 0;
  const mid = sampleEnemy(g, 300); mid.x = 52; mid.speed = 0;
  g.B.enemies = [mid];
  assert.equal(g.inRange(aero, mid), true, "mid-field enemy is within activation range");
  g.unitFire(aero, 0.4);
  const distantShots = g.B.projs.filter(p => p.src === aero);
  assert.equal(distantShots.length, 5);
  assert.ok(width(distantShots) < closeWidth * 0.5, "pellet fan tightens with distance");
  assert.ok(width(distantShots) > 5, "pellets retain distinct firing directions");
  assert.ok(distantShots.every(p => p.dmg === aero.cfg.damage));
  g.B.wave = 1; g.B.waveState = "fighting"; g.B.waveQueue = 1; g.B.spawnT = 9999;
  g.B.soldier.cd = 9999; aero.cd = 9999;
  for (let i = 0; i < 160; i++) g.update(1 / 60);
  assert.ok(aero.totalDmg >= aero.cfg.damage * aero.dmgMul * 2.5,
    "at least three distant pellets should hit a stationary centre-line enemy");

  g.B.projs = []; aero.cd = 0;
  const outside = sampleEnemy(g, 150); outside.x = 52;
  g.B.enemies = [outside];
  assert.equal(g.inRange(aero, outside), false, "range must still have a hard limit");
  g.unitFire(aero, 0.4);
  assert.equal(g.B.projs.length, 0, "no shots beyond the new range");
});

test("Aeroblast hits moving enemies at mid-field distance", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  const aero = g.mkUnit(g.TURRETS.find(t => t.id === "aeroblast"), 52, 0, false);
  g.B.turrets = [aero];
  const e = sampleEnemy(g, 300); e.x = 210; e.speed = 95;
  g.B.enemies = [e]; g.B.wave = 1; g.B.waveState = "fighting";
  g.B.waveQueue = 1; g.B.spawnT = 9999;
  g.B.soldier.cd = 9999;
  g.unitFire(aero, 0.4); aero.cd = 9999;
  for (let i = 0; i < 160; i++) g.update(1 / 60);
  assert.ok(aero.totalDmg > 0, "leading and pellet speed should allow a mid-field hit");
});

test("Aeroblast R&D improves splash, not its activation distance", () => {
  const previous = g.META.levels.aeroblast;
  try {
    g.META.levels.aeroblast = 45;
    g.B = g.newBattle(g.STAGES[0]);
    const aero = g.mkUnit(g.TURRETS.find(t => t.id === "aeroblast"), 52, 0, false);
    assert.equal(aero.cfg.range, 540);
    assert.ok(aero.splash >= 80, "R&D secondary should double blast radius at level 45");
    const atEdge = sampleEnemy(g, 180);
    const outside = sampleEnemy(g, 179);
    assert.equal(g.inRange(aero, atEdge), true);
    assert.equal(g.inRange(aero, outside), false);
  } finally {
    g.META.levels.aeroblast = previous;
  }
});

test("wasps live longer and spread across targets, max 2 per target", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  g.B.wave = 3; g.B.waveState = "fighting"; g.B.waveQueue = 1; g.B.spawnT = 999;
  const hive = g.mkUnit(g.TURRETS.find(t => t.id === "hive"), 52, 0, false);
  g.B.turrets = [hive];
  const targets = [60, 210, 360].map(x => { const e = sampleEnemy(g, 500); e.x = x; return e; });
  g.B.enemies = targets;
  g.unitFire(hive, 0.5);
  assert.equal(g.B.drones.length, hive.hiveCount, "volley size unchanged");
  assert.ok(g.B.drones.every(dr => dr.life >= 8), "wasps must live ~8.5s, got " + g.B.drones[0].life);
  const perTarget = new Map();
  g.B.drones.forEach(dr => { if (dr.tgt) perTarget.set(dr.tgt, (perTarget.get(dr.tgt) || 0) + 1); });
  assert.ok([...perTarget.values()].every(n => n <= 2), "no more than 2 wasps per target: " + JSON.stringify([...perTarget.values()]));
  assert.ok(perTarget.size >= 2, "wasps must spread across at least 2 targets, got " + perTarget.size);
});

test("Guardian triple volley is a tight group on one side", () => {
  g.B = g.newBattle(g.STAGES[0]);
  const s = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  s.extraProj = 2;
  g.B.soldier = s;
  g.B.turrets = [];
  const e = sampleEnemy(g, 300); e.x = 210;
  g.B.enemies = [e];
  let volley = null;
  for (let i = 0; i < 20 && !volley; i++) {
    const before = g.B.projs.length;
    g.unitFire(s, 0.3);
    if (g.B.projs.length - before === 3) volley = g.B.projs.slice(before);
  }
  assert.ok(volley, "soldier should fire a 3-shot volley");
  const xs = volley.map(p => p.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) <= 7, "volley span must be tight, got " + (Math.max(...xs) - Math.min(...xs)));
  assert.ok(xs.every(x => (x - 210) * (xs[0] - 210) > 0), "all three shots must be on the same side of the soldier");
});

test("Tesla discharge bounces sequentially to the nearest enemy with decaying damage", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  const tesla = g.mkUnit(g.TURRETS.find(t => t.id === "tesla"), 52, 0, false);
  tesla.critBonus = -1; /* deterministic: no crits in this measurement */
  g.B.turrets = [tesla];
  const e1 = sampleEnemy(g, 500); e1.x = 200;
  const e2 = sampleEnemy(g, 500); e2.x = 260;
  const e3 = sampleEnemy(g, 500); e3.x = 320;
  g.B.enemies = [e1, e2, e3];
  const hp1 = e1.hp, hp2 = e2.hp, hp3 = e3.hp;
  g.applyHit({ src: tesla, dmg: 100 }, e1);
  const d1 = hp1 - e1.hp, d2 = hp2 - e2.hp, d3 = hp3 - e3.hp;
  assert.ok(d1 > 0, "main target must take the direct hit");
  assert.ok(d2 > 0 && d3 > 0, "bounce must reach the 2nd and 3rd enemies");
  assert.ok(d2 > d3, "bounce damage must decay: 2nd " + d2 + " vs 3rd " + d3);
  const arcs = g.B.beams.filter(b => b.arc);
  assert.ok(arcs.some(a => Math.abs(a.x1 - 200) < 1 && Math.abs(a.x2 - 260) < 1), "first bounce must arc from target 1 to target 2");
  assert.ok(arcs.some(a => Math.abs(a.x1 - 260) < 1 && Math.abs(a.x2 - 320) < 1), "second bounce must arc from target 2 to target 3");
  assert.ok(!arcs.some(a => Math.abs(a.x1 - 200) < 1 && Math.abs(a.x2 - 320) < 1), "no simultaneous arc from target 1 to target 3");
});

test("sweeping lasers swing from the turret across the locked direction (no random targets)", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  const laser = g.mkUnit(g.TURRETS.find(t => t.id === "laser"), 210, 0, false);
  laser.laserSweep = 1;
  g.B.turrets = [laser];
  const e = sampleEnemy(g, 400); e.x = 210; e.speed = 0; e.baseSpeed = 0;
  g.B.enemies = [e];
  laser.cd = 0;
  const angs = [];
  for (let i = 0; i < 30 && (i === 0 || laser.laserActive > 0); i++) {
    g.B.beams = [];
    g.unitFire(laser, 0.05);
    const sw = g.B.beams.find(b => b.color === "#a7f3d0");
    assert.ok(sw && sw.x1 === 210, "a sweeping laser starts at the turret");
    angs.push(Math.atan2(sw.y2 - sw.y1, sw.x2 - sw.x1) - laser.laserAngle);
  }
  assert.ok(angs[0] < -0.6 && angs[angs.length - 1] > 0.5, "one pass swings from -0.8 to +0.8 rad: " + angs[0] + " .. " + angs[angs.length - 1]);
  for (let i = 1; i < angs.length; i++) assert.ok(angs[i] >= angs[i - 1] - 1e-9, "monotonic sweep");
});

test("extra projectiles fly parallel to the main shot, not in a fan", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  const sg = g.mkUnit(g.TURRETS.find(t => t.id === "skyguard"), 52, 0, false);
  sg.extraProj = 1;
  g.B.turrets = [sg];
  const e = sampleEnemy(g, 400); e.x = 52; e.speed = 0;
  g.B.enemies = [e];
  const before = g.B.projs.length;
  g.unitFire(sg, 0.4);
  const shots = g.B.projs.slice(before);
  assert.equal(shots.length, 2, "two parallel rockets, got " + shots.length);
  assert.ok(Math.abs(shots[0].vx - shots[1].vx) < 1e-9 && Math.abs(shots[0].vy - shots[1].vy) < 1e-9,
    "extra projectile must share the main shot direction");
  assert.ok(Math.abs(Math.abs(shots[0].x - shots[1].x) - 7) < 1e-9, "parallel offset must be 7px");
});


test("intrinsic trajectories never ascend and remain within lateral bounds", () => {
  const {game:m} = harness();
  m.B=m.newBattle(m.STAGES[0]);m.B.soldier=m.mkUnit(m.SOLDIER_CFG,210,-1,true);
  m.B.soldier.cd=99999;m.startWave(10);m.B.spawnT=99999;
  for(const c of m.ENEMIES.filter(c=>c.id!=="boss")){
    assert.ok(m.spawnEnemy(c.id),"spawn "+c.id);
  }
  const tracked=m.B.enemies.slice();
  tracked.forEach(e=>e.y=200);
  for(let tick=0;tick<55;tick++){
    const old=new Map(tracked.map(e=>[e,e.y]));
    m.update(0.05);
    for(const e of tracked){
      assert.ok(e.vy>=0,"enemy intrinsic vertical speed must be nonnegative: "+e.cfg.id);
      assert.ok(e.y+1e-9>=old.get(e),"enemy must never ascend without Gravity: "+e.cfg.id);
      assert.ok(e.x>=e.r-1e-9&&e.x<=m.W-e.r+1e-9,"enemy must remain inside the field: "+e.cfg.id);
    }
  }
  assert.equal(m.B.maxUpwardOwn,0);
});

test("whole formations wait at the enemy cap, without losing units", () => {
  const {game:m}=harness();
  m.B=m.newBattle(m.STAGES[0]);m.startWave(1);
  m.B.enemies=Array.from({length:m.MAX_ENEMIES-2},()=>({dead:false,hp:100}));
  const queued=m.B.waveQueue;
  assert.equal(m.spawnWaveGroup(),0,"group should wait for enough free slots");
  assert.equal(m.B.enemies.length,m.MAX_ENEMIES-2);
  assert.equal(m.B.waveQueue,queued,"group helper must not consume the wave queue");
  m.B.enemies=[];
  const created=m.spawnWaveGroup();
  assert.ok(created>=3&&created<=7,"spawned flock size "+created);
  assert.equal(m.B.enemies.length,created);
});

test("Disruption strip is visual only: slowing stays circular", () => {
  const {game:m}=harness();
  m.B=m.newBattle(m.STAGES[0]);m.B.soldier=m.mkUnit(m.SOLDIER_CFG,210,-1,true);
  m.B.soldier.cd=99999;m.B.wave=1;m.B.waveState="fighting";m.B.waveQueue=1;m.B.spawnT=99999;
  const dis=m.mkUnit(m.TURRETS.find(t=>t.id==="disruption"),52,0,false);
  dis.cd=99999;
  const inside=sampleEnemy(m,350),outside=sampleEnemy(m,350);
  inside.x=210;outside.x=305;
  m.B.enemies=[inside,outside];
  m.B.fields=[{kind:"slow",x:210,y:350,r:40,life:2.2,age:0,seed:7,src:dis,tick:0}];
  m.update(.05);m.draw();
  assert.ok(inside.slowFactor<1,"target inside the collision circle must slow");
  assert.equal(outside.slowFactor,1,"target in the visual stripe but outside the circle must not slow");
  assert.ok(m.B.fields[0].age>0,"field fade timer must advance");
});

test("fortress HP arc/dome flash after damage without shield absorption", () => {
  const {game:m}=harness();
  m.B=m.newBattle(m.STAGES[0]);m.B.soldier=m.mkUnit(m.SOLDIER_CFG,210,-1,true);
  m.B.soldier.cd=99999;m.B.wave=1;m.B.waveState="fighting";m.B.waveQueue=1;m.B.spawnT=99999;
  const e=sampleEnemy(m,m.BASEY-17);e.speed=110;e.hp=10000;
  m.B.enemies=[e];const hp=m.B.baseHp;
  m.update(.05);m.draw();
  assert.equal(m.B.baseHp,hp-e.dmg);
  assert.equal(m.B.shield,undefined);
  assert.equal(m.B.baseFlashT,.12);
  assert.equal(m.B.baseHitTextT,.2);
});

test("three hits aggregate; numbers stay within the screen; healing is green-channel", () => {
  const {game:m}=harness();
  m.B=m.newBattle(m.STAGES[0]);
  const e=sampleEnemy(m,400);
  m.addNum(-100,900,10,false,1,e);
  m.addNum(-100,900,11,false,1,e);
  m.addNum(-100,900,12,true,1,e);
  assert.equal(m.B.nums.length,1);
  assert.equal(m.B.nums[0].txt,"33");
  assert.equal(m.B.nums[0].crit,true);
  assert.equal(m.B.nums[0].x,20);
  assert.equal(m.B.nums[0].y,m.BASEY-20);
  m.addNum(210,m.BASEY-52,"+2",false,1);
  assert.equal(m.B.nums[1].heal,true);
});

test("jam module slows both existing and newly spawned nonlinear enemies", () => {
  const {game:m}=harness();
  m.B=m.newBattle(m.STAGES[0]);m.B.soldier=m.mkUnit(m.SOLDIER_CFG,210,-1,true);
  m.startWave(3);assert.ok(m.spawnEnemy("fast"));
  const old=m.B.enemies[0].baseSpeed;
  m.applyCard({kind:"module",modId:"jam"});
  assert.ok(m.B.enemies[0].baseSpeed<old);
  assert.ok(m.B.enemySpdMul<1);
  assert.ok(m.spawnEnemy("fast"));
  assert.ok(m.B.enemies[1].baseSpeed<old);
});

/* ---------- regressions: fixed bugs ---------- */
function freshBattle(game){
  game.B=game.newBattle(game.STAGES[0]);game.B.soldier=game.mkUnit(game.SOLDIER_CFG,210,-1,true);
  game.B.soldier.cd=999;game.B.waveState="fighting";game.B.wave=3;game.B.waveQueue=1;game.B.spawnT=999;
}
function enemyOf(game,id,x,y){
  const cfg=game.ENEMIES.find(e=>e.id===id);
  return {cfg,kind:cfg.kind,x,y,hp:1e6,maxHp:1e6,speed:0,dmg:1,armor:0,xp:1,r:cfg.r,color:cfg.color,
    phase:0,flash:0,slowFactor:1,slowT:0,burnDps:0,burnT:0,dead:false,healT:1};
}

test("Gravity field does not teleport an enemy that has just spawned above the visible line", () => {
  const {game:h}=harness();freshBattle(h);
  const gv=h.mkUnit(h.TURRETS.find(t=>t.id==="gravity"),52,0,false);gv.cd=999;h.B.turrets=[gv];
  const e=enemyOf(h,"meteor",210,-30);h.B.enemies=[e];
  h.B.fields.push({kind:"gravity",x:210,y:60,r:120,life:3,src:gv,tick:9,pull:65,power:1});
  h.update(1/30);
  assert.ok(e.y<h.VIS_TOP,"enemy at y=-30 must stay above the visible line, got "+e.y);
  /* but an already visible enemy is still not lifted above VIS_TOP by the field */
  const v=enemyOf(h,"meteor",210,h.VIS_TOP+2);h.B.enemies=[v];
  h.B.fields=[{kind:"gravity",x:210,y:-200,r:400,life:3,src:gv,tick:9,pull:500,power:1}];
  for(let i=0;i<30;i++)h.update(1/30);
  assert.ok(v.y>=h.VIS_TOP,"visible enemy must not be pulled above VIS_TOP, got "+v.y);
});

test("Burn DPS is cleared when the burn expires, so a weaker later burn is not inflated", () => {
  const {game:h}=harness();freshBattle(h);
  const fw=h.mkUnit(h.TURRETS.find(t=>t.id==="firewheel"),52,0,false);fw.cd=999;h.B.turrets=[fw];
  const e=enemyOf(h,"meteor",100,300);h.B.enemies=[e];
  fw.dmgMul=10;h.dealDamage(fw,e,10,{burn:true});
  const strong=e.burnDps;assert.ok(strong>0);
  for(let i=0;i<150;i++)h.update(1/30); /* 5 s: the burn (3 s) has expired */
  assert.equal(e.burnDps,0,"expired burn must reset DPS");
  fw.dmgMul=1;h.dealDamage(fw,e,10,{burn:true});
  assert.ok(e.burnDps<strong,"new weak burn must use its own DPS, not the stale strong one");
});

test("Burn still ticks its final frame of damage before it is cleared", () => {
  const {game:h}=harness();freshBattle(h);
  const e=enemyOf(h,"meteor",100,300);e.burnDps=60;e.burnT=0.02;e.hp=1000;h.B.enemies=[e];
  h.update(0.05);
  assert.ok(e.hp<1000,"the last burn tick must still be applied");
  assert.equal(e.burnDps,0);
});

test("Fortress module card texts match what they actually restore", () => {
  const {game:h}=harness();
  for(const [id,amount] of [["healm",250],["regenm",200]]){
    freshBattle(h);h.B.baseHp=100;
    const text=h.cardHTML({kind:"module",modId:id}).desc;
    h.applyCard({kind:"module",modId:id});
    assert.equal(h.B.baseHp-100,amount,id+" restores a different amount than expected");
    assert.ok(text.includes(amount+" HP"),id+" card text must mention "+amount+" HP: "+text);
  }
});

test("A new battle resets the x2 speed button and stale pointer state", () => {
  const {game:h,element}=harness();
  h.startBattle();h.B.speed=2;
  element("btn-speed").textContent="×2";element("btn-speed").classList.add("on");
  h.guardianPointerId=7;
  h.B.over=true;h.startBattle();
  assert.equal(h.B.speed,1);
  assert.equal(element("btn-speed").textContent,"×1");
  assert.equal(element("btn-speed").classList.contains("on"),false);
  assert.equal(h.guardianPointerId,null);
});

test("Battle rewards are credited immediately, exactly once", () => {
  const {game:h,store}=harness();h.startBattle();
  const coins0=h.META.coins;
  h.B.kills=40;h.B.wave=7;
  h.endBattle(false);
  assert.ok(h.META.coins>coins0,"coins must be credited at the end of the battle");
  const saved=JSON.parse(store.get("meteor-bastion-save-v1"));
  assert.equal(saved.coins,h.META.coins,"credited rewards must already be persisted");
  const after=h.META.coins;
  h.applyRewards();h.applyRewards();
  assert.equal(h.META.coins,after,"pressing back must not credit rewards a second time");
});

test("level rewards are cut tenfold, gems untouched", () => {
  const {game:h}=harness();h.startBattle();
  h.B.kills=40;h.B.wave=7;
  h.endBattle(false);
  /* old formula: coins 323, comp 3, pxp 31 — all divided by 10 now */
  assert.equal(h.lastRewards.coins,32);
  assert.equal(h.lastRewards.comp,0);
  assert.equal(h.lastRewards.pxp,3);
  assert.equal(h.lastRewards.gems,0);
  const {game:w}=harness();w.startBattle();
  w.B.kills=40;w.B.wave=7;
  w.endBattle(true);
  assert.equal(w.lastRewards.coins,48);
  assert.equal(w.lastRewards.pxp,8);
  assert.equal(w.lastRewards.gems,2,"gems must not be divided: 2 per win stays 2");
});

test("results show every material grant, biggest first", () => {
  const {game:h,element}=harness();
  h.lastRewards={win:true,coins:626,gems:2,comp:10,pxp:16,mats:{laser:44,hive:40,beam:30,soldier:13,skyguard:7},applied:false};
  h.renderRewards();
  var html=element("res-rewards").innerHTML;
  ["Laser","Hive","Beam","Soldier","Sky Guard"].forEach(function(name){
    assert.ok(html.includes("Materials: "+name),"rewards must show materials for "+name);
  });
  assert.ok(html.indexOf("Materials: Laser")<html.indexOf("Materials: Hive"),"biggest grant first");
  assert.ok(html.indexOf("Materials: Hive")<html.indexOf("Materials: Beam"),"grants sorted by amount");
  assert.ok(html.indexOf("Materials: Sky Guard")>html.indexOf("Materials: Soldier"),"smallest grant last");
  h.lastRewards={win:false,coins:32,gems:0,comp:0,pxp:3,mats:{laser:5,hive:0},applied:false};
  h.renderRewards();
  html=element("res-rewards").innerHTML;
  assert.ok(html.includes("Materials: Laser"),"non-zero grant must show");
  assert.ok(!html.includes("Materials: Hive"),"zero grant must stay hidden");
});

test("a throwing frame does not kill the game loop", () => {
  const {game:h,element}=harness();h.startBattle();
  var orig=h.update;
  h.update=function(){throw new Error("boom-test");};
  h.loop(16);h.loop(32);
  assert.ok(h.B.loopError&&h.B.loopError.indexOf("boom-test")>=0,"loop must record the error");
  assert.ok(element("loop-error").textContent.indexOf("boom-test")>=0,"error banner must show the error");
  h.update=orig;
  h.loop(48); /* must not throw: the loop survives and keeps running */
  assert.ok(h.B.loopError&&h.B.loopError.indexOf("boom-test")>=0,"error stays recorded until dismissed");
});

test("a backward RAF timestamp cannot drive ring radii negative", () => {
  const {game:h}=harness();h.startBattle();h.B.waveState="fighting"; /* intro returns early from update(), rings only age while fighting */
  h.loop(100); /* one normal frame */
  h.B.rings.push({x:210,y:300,r:5,vr:90,t:0,life:0.35,color:"#ff9f2e"});
  h.loop(-10); /* timestamp jumps backwards (app switch / vsync restart): raw must clamp to 0 */
  assert.ok(!h.B.loopError,"a backward timestamp must not record a loop error");
  assert.ok(h.B.rings.length===1&&h.B.rings[0].r>=0,"ring radius must stay non-negative, got "+(h.B.rings[0]&&h.B.rings[0].r));
  h.loop(6); /* next frame is normal again */
  assert.ok(!h.B.loopError,"the loop keeps running after a backward timestamp");
});

test("drawing a ring with a negative radius does not throw", () => {
  const {game:h}=harness();h.startBattle();
  h.B.rings.push({x:210,y:300,r:-0.338,vr:90,t:0,life:0.35,color:"#ff9f2e"});
  h.draw(); /* must not throw: the ring arc clamps its radius */
});

/* ---------- fortress layout and rendering regressions ---------- */
test("Turret cards build compact mirrored pairs in the original four-slot order", () => {
  const {game:h}=harness();h.startBattle();
  for(let i=0;i<4;i++){
    h.B.pendingDrafts=1;h.applyCard({kind:"new",cfg:h.TURRETS[i]});
    assert.equal(h.B.turrets[i].slot,i);
    assert.equal(h.B.turrets[i].x,h.TURRET_X[i]);
    assert.equal(h.B.turrets[i].y,h.LINE_Y);
  }
  assert.equal(h.freeSlot(),-1,"four slots, never a fifth turret");
  const [left,right,innerLeft,innerRight]=h.TURRET_X;
  assert.equal(left+right,h.W);assert.equal(innerLeft+innerRight,h.W);
  assert.ok(innerLeft-left>=40&&innerLeft-left<=48,"paired turrets need sprite clearance and a compact gap");
  assert.ok(h.SOLDIER_X-innerLeft>=100,"the bunker/Guardian lane must remain open");
  assert.equal(h.BASEY,720,"scenery must not shorten enemy travel");
});

test("Native-resolution canvas preserves the whole fortress and touch mapping after resize", () => {
  const {game:h,element}=harness();h.startBattle();
  for(const [cssW,dpr] of [[280,1],[400,2.625],[448,4]]){
    h.cv.clientWidth=cssW;h.window.devicePixelRatio=dpr;h.fitCanvas();
    assert.equal(h.cv.width,Math.round(cssW*Math.min(dpr,3)));
    assert.equal(h.cv.height,Math.round(h.cv.width*h.H/h.W));
    assert.ok(h.FORTRESS.deckY+70<h.H,"the underground structure must fit");
    h.cv.getBoundingClientRect=()=>({left:12,top:20,width:cssW,height:cssW*h.H/h.W});
    const ev={clientX:12+cssW*.75,clientY:20+cssW*(h.BASEY-50)/h.W,pointerId:7,preventDefault(){}};
    element("cv").listeners.pointerdown[0](ev);
    assert.equal(h.B.guardianGoalX,h.W*.75);
    element("cv").listeners.pointerup[0](ev);
    assert.equal(h.guardianPointerId,null);
    ev.clientY=20+cssW*300/h.W;
    element("cv").listeners.pointerdown[0](ev);
    assert.equal(h.guardianPointerId,null,"touches above the control area must not move the Guardian");
  }
  assert.ok(shell.includes('aspect-ratio:420/820'),"CSS and logical canvas must agree");
});

test("HUD reserves the timer column even for late-stage damage and kill totals", () => {
  const {game:h}=harness();h.startBattle();
  for(const elite of [false,true])for(const elapsed of [9,600,60000]){
    h.B.elite=elite;h.B.stage=h.STAGES[11];h.B.wave=30;h.B.elapsed=elapsed;
    h.B.kills=99999;h.B.soldier.totalDmg=987654321;
    const layout=h.combatHudLayout();
    const span=layout.widths.reduce((a,b)=>a+b,0)+layout.gap*3;
    assert.ok(layout.left+span*layout.scale+layout.gap<=h.W-10-layout.timeWidth+1e-6,
      "metrics must end before the timer begins");
    assert.ok(layout.font>=9);assert.ok(layout.scale>0&&layout.scale<=1);
    h.drawCombatHud();
  }
});

test("Battle timers keep two-digit minutes after ten minutes and allow long runs", () => {
  assert.equal(g.mmss(-1),"00:00");assert.equal(g.mmss(59.9),"00:59");
  assert.equal(g.mmss(60),"01:00");assert.equal(g.mmss(599),"09:59");
  assert.equal(g.mmss(600),"10:00");assert.equal(g.mmss(3600),"60:00");
  assert.equal(g.mmss(60000),"1000:00");
});

test("Recoil decays with simulation time and stays frozen on paused redraws", () => {
  const remaining=frames=>{
    const {game:h}=harness();h.startBattle();
    h.B.waveState="fighting";h.B.waveQueue=1;h.B.spawnT=999;
    h.B.soldier.cd=999;h.B.soldier.recoil=6;
    for(let i=0;i<frames;i++)h.update(.05/frames);
    const recoil=h.B.soldier.recoil;h.B.paused=true;
    for(let i=0;i<10;i++)h.draw();
    assert.equal(h.B.soldier.recoil,recoil,"redraws must not change recoil");
    return recoil;
  };
  for(const frames of [1,3,6])assert.ok(Math.abs(remaining(frames)-2.7)<1e-9);
});

test("A shaken fortress redraw consumes no gameplay randomness", () => {
  const {game:h}=harness();h.startBattle();h.B.shake=8;h.B.t=3;
  const random=h.Math.random;let calls=0;h.Math.random=()=>{calls++;return random();};
  h.draw();h.draw();assert.equal(calls,0,"rendering must not change seeded battle outcomes");
});

/* ---------- model rendering ---------- */
function drawScene(game,setup){
  game.B=game.newBattle(game.STAGES[0]);game.B.waveState="fighting";game.B.wave=3;game.B.t=1.7;
  game.B.soldier=game.mkUnit(game.SOLDIER_CFG,210,-1,true);
  setup(game);game.draw();
}

test("Every turret, the Guardian and every livery draw at any aim angle and recoil", () => {
  const {game:h}=harness();
  for(const livery of ["classic","arctic","ember"]){
    h.META.livery=livery;
    for(const angle of [-3.0,-2.2,-1.57,-0.9,0,0.4]){
      drawScene(h,g2=>{
        g2.B.soldier.angle=angle;g2.B.soldier.recoil=5;
        g2.TURRETS.forEach((cfg,i)=>{const u=g2.mkUnit(cfg,40+i*34,i%4,false);u.angle=angle;u.recoil=i%2?5:0;u.laserActive=i%2;g2.B.turrets.push(u);});
      });
    }
  }
});

test("Guardian faces its target and keeps facing near vertical aim (no flicker)", () => {
  const {game:h}=harness();
  drawScene(h,g2=>{g2.B.soldier.angle=-2.6;});
  assert.equal(h.B.soldier.facing,-1,"aiming left must face left");
  h.B.soldier.angle=-0.4;h.draw();
  assert.equal(h.B.soldier.facing,1,"aiming right must face right");
  h.B.soldier.angle=-Math.PI/2-0.05; /* almost straight up, slightly left: the previous side is kept */
  h.draw();
  assert.equal(h.B.soldier.facing,1,"near-vertical aim must not flip the Guardian");
});

test("Every enemy type draws in every state, with a stable per-enemy shape", () => {
  const {game:h}=harness();
  drawScene(h,g2=>{
    g2.ENEMIES.forEach((cfg,i)=>{
      const base=enemyOf(g2,cfg.id,30+(i%5)*80,100+Math.floor(i/5)*90);
      base.hp=base.maxHp*0.5;base.chargeMul=i%2?1.85:1;base.cloakT=i%3?0:1.8;base.revealedT=0;
      g2.B.enemies.push(base);
      g2.B.enemies.push(Object.assign({},base,{x:base.x+40,flash:0.05,slowFactor:0.6,champion:true}));
    });
  });
  h.B.enemies.forEach(e=>assert.ok(Number.isFinite(e.seed),"each enemy gets a shape seed"));
  const e=h.B.enemies[0],seed=e.seed;
  const pts=JSON.stringify(e.shp);
  h.draw();h.draw();
  assert.equal(e.seed,seed,"seed must be stable across frames");
  assert.equal(JSON.stringify(e.shp),pts,"polygon vertices must be cached, not regenerated");
});

test("Ordinary enemies of the same type do not share one identical silhouette", () => {
  const {game:h}=harness();
  drawScene(h,g2=>{for(let i=0;i<6;i++){const m=enemyOf(g2,"meteor",40+i*60,200);m.phase=0.9+i*1.07;g2.B.enemies.push(m);}});
  const shapes=new Set(h.B.enemies.map(e=>JSON.stringify(e.shp)));
  assert.ok(shapes.size>=5,"meteors must vary in shape, got "+shapes.size+" distinct");
});

/* ---------- projectile rendering ---------- */
function projScene(h,withHistory){
  h.B=h.newBattle(h.STAGES[0]);h.B.waveState="fighting";h.B.wave=3;h.B.t=1.7;h.B.draftNeed=1e9;
  h.B.soldier=h.mkUnit(h.SOLDIER_CFG,210,-1,true);
  const cfgs=h.TURRETS.concat([h.SOLDIER_CFG]);
  cfgs.forEach((cfg,i)=>{
    const u=h.mkUnit(cfg,40+i*30,i%4,cfg===h.SOLDIER_CFG);
    for(const a of [-2.9,-1.57,-0.4,0]){
      const sp=cfg.projSpeed||300,vx=Math.cos(a)*sp,vy=Math.sin(a)*sp,x=60+i*28,y=300+a*20;
      const pr={x,y,vx,vy,src:u,dmg:1,pierce:0,hitSet:[],life:2,tgt:null};
      if(withHistory===true)pr.tr=[x-vx*.2,y-vy*.2,h.B.t-.2, x-vx*.1,y-vy*.1,h.B.t-.1, x,y,h.B.t];
      if(withHistory==="one")pr.tr=[x,y,h.B.t];     /* a single point: not enough for a ribbon */
      if(withHistory==="empty")pr.tr=[];
      h.B.projs.push(pr);
    }
  });
  /* a stationary projectile and one with an expired-only history must not break the ribbon maths */
  const u0=h.mkUnit(h.TURRETS[0],100,0,false);
  h.B.projs.push({x:50,y:50,vx:0,vy:0,src:u0,dmg:1,pierce:0,hitSet:[],life:2,tgt:null,tr:[50,50,0, 50,50,0.1]});
}

test("Every projectile type draws with a full, partial, empty or missing trail history", () => {
  const {game:h}=harness();
  for(const mode of [true,"one","empty",false]){projScene(h,mode);h.draw();h.draw();}
});

test("Projectile trail history is recorded by update(), bounded, and the same length at any frame rate", () => {
  const spanAt=dt=>{
    const {game:h}=harness();
    h.B=h.newBattle(h.STAGES[0]);h.B.draftNeed=1e9;
    h.B.soldier=h.mkUnit(h.SOLDIER_CFG,210,-1,true);
    h.startWave(1);h.B.waveState="fighting";
    const u=h.mkUnit(h.TURRETS.find(t=>t.id==="railgun"),100,0,false);
    const pr={x:20,y:700,vx:0,vy:-300,src:u,dmg:1,pierce:0,hitSet:[],life:5,tgt:null};
    h.B.projs.push(pr);
    for(let i=0;i<Math.round(1/dt);i++)h.update(dt);
    assert.ok(h.B.projs.includes(pr),"the test projectile must still be in flight");
    assert.equal(pr.tr.length%3,0,"history is x,y,t triplets");
    assert.ok(pr.tr.length/3<=60,"history must stay bounded, got "+pr.tr.length/3+" points");
    assert.equal(pr.tr[pr.tr.length-3],pr.x,"the newest point is the projectile itself");
    assert.equal(pr.tr[pr.tr.length-2],pr.y);
    return pr.tr[pr.tr.length-1]-pr.tr[2];
  };
  const T=harness().game.PROJ_TRAIL_T,spans=[1/30,1/60,1/120].map(spanAt);
  spans.forEach(sp=>assert.ok(sp>=T-1e-6&&sp<=T+0.1,"history span "+sp+" should be ~"+T));
  assert.ok(Math.max(...spans)-Math.min(...spans)<0.1,"span must not depend on frame rate: "+spans);
});

test("Drawing projectiles consumes no random numbers (flicker is a function of time)", () => {
  const {game:h}=harness();
  const orig=h.Math.random;let calls=0;h.Math.random=()=>{calls++;return orig();};
  projScene(h,true);h.B.projs.length=0;calls=0;h.draw();const baseline=calls;
  projScene(h,true);calls=0;h.draw();
  assert.ok(h.B.projs.length>40);
  assert.equal(calls,baseline,"projectile drawing must not call Math.random");
});


/* ---------- reference card set (docs/turrets-reference.md) ---------- */
function parseReference() {
  const md = fs.readFileSync(path.join(root, "docs", "turrets-reference.md"), "utf8");
  const units = { "Sky Guard": "skyguard", "Laser": "laser", "Disruption Drone": "disruption", "Aeroblast": "aeroblast",
    "Thunderbolt": "thunder", "Beam": "beam", "Railgun": "railgun", "Teslacoil": "tesla", "Gravity Vortex Gun": "gravity",
    "Hive": "hive", "Firewheel Drone": "firewheel", "Guardian": "soldier" };
  const cards = []; let unit = null, tier = 0, extra = false; const unlocks = {};
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^## (.+?)(?: \(|$)/))) { unit = units[m[1].trim()] || null; tier = 0; extra = false; continue; }
    if (!unit) continue;
    if ((m = line.match(/^### Star Tier (\d)/))) { tier = +m[1]; extra = false; continue; }
    if (/^\*\*Extra:\*\*/.test(line)) { extra = true; continue; }
    if ((m = line.match(/^\| Lv\.(\d+) \| Открывает карточку \*\*(.+?)\*\*/))) { unlocks[unit + ":" + m[2]] = +m[1]; continue; }
    if (tier && (m = line.match(/^- \*\*(.+?)\*\*(?: \(🔒 Lv\.(\d+)\))?: (.+)$/))) cards.push({ unit, tier, extra, name: m[1], lock: m[2] ? +m[2] : 0, text: m[3] });
  }
  cards.forEach(c => { c.unlock = unlocks[c.unit + ":" + c.name] || 0; });
  return cards;
}
test("every reference card exists with its tier, Extra flag, R&D gate and the reference numbers", () => {
  const ref = parseReference();
  assert.ok(ref.length >= 270, "reference parsed: " + ref.length);
  const guardianScale = x => x > 45 ? Math.round(x * 45 / 121) : x;
  for (const c of ref) {
    const def = g.CARDS.find(d => d.unit === c.unit && d.name === c.name);
    assert.ok(def, "missing card " + c.unit + ": " + c.name);
    assert.equal(def.lvl, c.tier, c.name + " tier");
    assert.equal(!!def.rare, c.extra, c.name + " Extra/purple");
    const gate = c.lock ? guardianScale(c.lock) : (c.unlock || 1);
    assert.equal(def.rd, gate, c.name + " R&D gate");
    const desc = g.cardDesc(def);
    const nums = (c.text.match(/\d+(?:\.\d+)?/g) || []);
    for (const n of nums) assert.ok(desc.includes(n), c.unit + ": " + c.name + " must mention " + n + " — " + desc);
  }
  /* no invented turret cards beyond the reference */
  const names = new Set(ref.map(c => c.unit + ":" + c.name));
  const extraDefs = g.CARDS.filter(d => !names.has(d.unit + ":" + d.name));
  assert.equal(extraDefs.length, 0, "cards not in the reference: " + extraDefs.map(d => d.name).join(", "));
});

test("every card's mechanic runs in a live battle with all turrets present, entity caps hold", () => {
  const { game: c } = harness(undefined, 99);
  c.META.music = false; c.META.sfx = false;
  for (const id of Object.keys(c.META.levels)) c.META.levels[id] = 45;
  const ids = ["skyguard", "laser", "disruption", "aeroblast", "thunder", "beam", "railgun", "tesla", "gravity", "hive", "firewheel"];
  const byUnit = {};
  c.CARDS.forEach(d => (byUnit[d.unit] = byUnit[d.unit] || []).push(d));
  /* four turrets per battle (the slot limit); every turret type and the Guardian take ALL of their cards */
  const groups = [["skyguard", "laser", "disruption", "railgun"], ["aeroblast", "thunder", "beam", "firewheel"], ["tesla", "gravity", "hive", "railgun"], ["disruption", "railgun", "firewheel", "hive"]];
  for (const grp of groups) {
    c.B = c.newBattle(c.STAGES[5]);
    c.B.soldier = c.mkUnit(c.SOLDIER_CFG, 210, -1, true);
    c.B.turrets = grp.map((id, i) => c.mkUnit(c.TURRETS.find(t => t.id === id), c.TURRET_X[i], i, false));
    c.B.wave = 8; c.B.waveState = "fighting"; c.startWave(8);
    for (const u of c.allFighters()) {
      u.runLv = 3;
      for (const d of byUnit[u.cfg.id]) { c.applyCardDef(d, u); u.cards[d.id] = 1; u.mods.push(d.id); }
      c.maybeSuperMode(u);
      u.rangeMul = 5; /* short-range turrets must engage too, so every mechanic is exercised */
    }
    let peak = { mines: 0, bolts: 0, holes: 0, minis: 0, projs: 0, drones: 0, fields: 0, spinners: 0, portals: 0, pulses: 0 };
    for (let i = 0; i < 900 && !c.B.over; i++) {
      if (c.B.waveState === "draft") { c.B.pendingDrafts = 0; c.B.waveState = "fighting"; }
      c.update(1 / 30);
      if (i % 30 === 0) c.draw();
      peak.mines = Math.max(peak.mines, c.B.mines.length); peak.bolts = Math.max(peak.bolts, c.B.bolts.length);
      peak.holes = Math.max(peak.holes, c.B.fields.filter(f => f.kind === "blackhole").length);
      peak.minis = Math.max(peak.minis, c.B.wheels.filter(w => w.mini).length);
      peak.projs = Math.max(peak.projs, c.B.projs.length); peak.drones = Math.max(peak.drones, c.B.drones.length);
      peak.fields = Math.max(peak.fields, c.B.fields.length); peak.spinners = Math.max(peak.spinners, c.B.spinners.length);
      peak.portals = Math.max(peak.portals, c.B.portals.length); peak.pulses = Math.max(peak.pulses, c.B.pulses.length);
      for (const e of c.B.enemies) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && !Number.isNaN(e.hp), "enemy state stays finite");
    }
    const cap = c.FX_CAP;
    assert.ok(peak.mines <= cap.mines && peak.bolts <= cap.bolts && peak.holes <= cap.holes && peak.minis <= cap.minis, JSON.stringify(peak));
    assert.ok(peak.projs <= cap.projs + 40 && peak.drones <= cap.drones && peak.fields <= cap.fields + 4 && peak.spinners <= cap.spinners && peak.portals <= cap.portals && peak.pulses <= cap.pulses, JSON.stringify(peak));
    assert.ok(!c.B.loopError, c.B.loopError);
    assert.ok(c.allFighters().some(u => u.totalDmg > 0), "the full-card team must remain able to damage enemies");
  }
  assert.ok(ids.every(id => byUnit[id].length >= 20));
});


function mechBattle(c, ids) {
  c.META.music = false; c.META.sfx = false;
  c.B = c.newBattle(c.STAGES[0]);
  c.B.soldier = c.mkUnit(c.SOLDIER_CFG, 210, -1, true); c.B.soldier.cd = 1e9;
  c.B.turrets = (ids || []).map((id, i) => c.mkUnit(c.TURRETS.find(t => t.id === id), c.TURRET_X[i], i, false));
  c.B.turrets.forEach(u => { u.critBonus = -1; });
  c.B.wave = 3; c.B.waveState = "fighting"; c.B.waveQueue = 1; c.B.spawnT = 1e9;
  return c.B.turrets;
}
function still(c, x, y, hp) { const e = sampleEnemy(c, y); e.x = x; e.speed = 0; e.baseSpeed = 0; e.hp = e.maxHp = hp || 1e6; return e; }

test("Paralyze and Immobilize stop an enemy; a 1 s immunity prevents perma-stun; bosses are only briefly stunned", () => {
  const { game: c } = harness(); mechBattle(c, []);
  const e = sampleEnemy(c, 300); e.speed = e.baseSpeed = 40; c.B.enemies = [e];
  assert.ok(c.applyParalyze(e, 1));
  const y = e.y; c.update(0.5); assert.equal(e.y, y, "paralyzed enemy does not move");
  assert.ok(!c.applyParalyze(e, 1), "cannot be re-paralyzed while stunned");
  for (let i = 0; i < 20; i++) c.update(0.05);
  assert.ok(e.y > y, "moves again after Paralyze");
  assert.ok(!c.applyParalyze(e, 1), "immune for 1 s after Paralyze ends");
  for (let i = 0; i < 25; i++) c.update(0.05);
  assert.ok(c.applyImmobilize(e, 1), "Immobilize works after the immunity");
  const boss = sampleEnemy(c, 300); boss.kind = "boss"; c.applyParalyze(boss, 1);
  assert.ok(Math.abs(boss.paralyzeT - 0.3) < 1e-9, "bosses get 30% duration");
});

test("Disruption stacks detonate at max stacks (Burst, Area, Overcharged 5 stacks); teleport-back spares bosses", () => {
  const { game: c } = harness();
  const [d] = mechBattle(c, ["disruption"]);
  const e = still(c, 200, 300), n = still(c, 230, 300); c.B.enemies = [e, n];
  c.addDisruption(e, d, 1); c.addDisruption(e, d, 1);
  assert.equal(e.hp, 1e6); assert.equal(e.disr, 2);
  c.addDisruption(e, d, 1);
  assert.ok(e.hp < 1e6 && e.disr === 0, "detonates at 3 stacks");
  d.disrBurst = true; d.areaDisr = true; c.applyCardDef(c.cardById("disruption", "overchargedDisruption"), d);
  const hp = e.hp; for (let i = 0; i < 4; i++) c.addDisruption(e, d, 1);
  assert.equal(e.hp, hp, "Overcharged: max stacks become 5");
  c.addDisruption(e, d, 1);
  assert.ok(e.hp < hp && n.hp < 1e6, "Burst + Area hit");
  const y = e.y; assert.ok(c.teleportBack(e, false, null)); assert.ok(e.y < y);
  const b = still(c, 300, 300); b.kind = "boss"; assert.ok(!c.teleportBack(b, true, null)); assert.equal(b.y, 300);
  d.teleportDamage = true; const h2 = n.hp; c.teleportBack(n, true, d);
  assert.ok(Math.abs((h2 - n.hp) - 0.03 * n.maxHp) < 1e-6 && n.y === -20, "Teleport Damage = 3% max HP, rewind to start");
});

test("Disruption Field deals periodic damage, Final Blast on expiry, Disruption Force stacks", () => {
  const { game: c } = harness();
  const [d] = mechBattle(c, ["disruption"]);
  d.cd = 1e9; d.finalBlast = true; d.disrForce = true;
  const e = still(c, 200, 300); c.B.enemies = [e];
  c.addDisruptionField(d, 200, 300);
  c.update(0.2); const after1 = e.hp;
  assert.ok(after1 < 1e6 && e.slowFactor < 1, "the field damages and slows");
  assert.ok(e.disr >= 1, "Disruption Force applies a stack");
  let blast = 0;
  for (let i = 0; i < 80 && c.B.fields.some(f => f.kind === "slow"); i++) { const h = e.hp; c.update(0.05); blast = h - e.hp; }
  assert.ok(!c.B.fields.some(f => f.kind === "slow"), "field expires");
  assert.ok(blast >= d.cfg.damage * 2, "Final Blast on expiry: " + blast);
});

test("Thunderbolt calls a vertical strike that hits the whole column; Chain Lightning, Paralysis, Life Erosion", () => {
  const { game: c } = harness();
  const [t] = mechBattle(c, ["thunder"]);
  const a = still(c, 200, 250), b = still(c, 205, 450), off = still(c, 300, 260);
  c.B.enemies = [a, b, off];
  c.thunderStrike(t, 200, 1);
  assert.ok(a.hp < 1e6 && b.hp < 1e6 && off.hp === 1e6, "column only");
  assert.ok(c.B.beams.some(x => x.bolt && x.x1 === 200), "lightning column fx");
  ["lightningParalysis", "chainLightning", "lifeErosion"].forEach(id => c.applyCardDef(c.cardById("thunder", id), t));
  a.hp = b.hp = off.hp = 1e6; a.paraImmuneT = b.paraImmuneT = 0; a.paralyzeT = b.paralyzeT = 0;
  c.thunderStrike(t, 200, 1);
  assert.ok(a.paralyzeT > 0, "Paralyze");
  assert.ok(off.hp < 1e6, "Chain Lightning jumps to the enemy outside the column");
  assert.ok(1e6 - b.hp >= 0.01 * 1e6, "Life Erosion: 1% max HP");
});

test("Floating Mines arm and explode; Pulse Waves expand once over each enemy; Ripping Laser and shocks", () => {
  const { game: c } = harness();
  const [a] = mechBattle(c, ["aeroblast"]);
  a.cd = 1e9;
  const e = still(c, 200, 300, 1000); c.B.enemies = [e];
  c.addMine(a, 200, 300); c.update(0.1);
  assert.equal(c.B.mines.length, 1, "not armed yet");
  c.update(0.3); assert.equal(c.B.mines.length, 0); assert.ok(e.hp < 1000);
  const hp = e.hp; c.addPulse(a, 200, 280, 60, 10);
  for (let i = 0; i < 12; i++) c.update(0.05);
  assert.ok(e.hp < hp && c.B.pulses.length === 0);
  const h2 = e.hp; c.ripLaser(a, 200, 480, -Math.PI / 2, 10); assert.ok(e.hp < h2, "Ripping Laser hits along its line");
  for (let i = 0; i < 40; i++) c.ripLaser(a, 0, 0, 0, 1);
  assert.ok(c.B.ripN <= c.FX_CAP.rips, "Ripping Lasers are rate-capped");
  const n = still(c, 230, 300); c.B.enemies.push(n);
  c.shockFrom(a, 200, 300, 1, 10, [e]); assert.ok(n.hp < 1e6);
  for (let i = 0; i < 60; i++) c.addMine(a, 100, 300);
  assert.equal(c.B.mines.length, c.FX_CAP.mines, "mine cap");
});

test("Gravity field flies from the turret over its range, then leaves a small black hole; Wormhole portal", () => {
  const { game: c } = harness();
  const [gv] = mechBattle(c, ["gravity"]);
  gv.smallBH = true; gv.wormhole = true;
  const tgt = still(c, 52, 520); c.B.enemies = [tgt];
  gv.cd = 0; c.unitFire(gv, 0.05);
  const f = c.B.fields.find(x => x.kind === "gravity");
  assert.ok(f && Math.abs(f.x - 52) < 1 && f.y > 600, "spawns at the turret");
  const y0 = f.y; c.update(0.5); assert.ok(f.y < y0, "and flies toward the target");
  for (let i = 0; i < 80; i++) c.update(0.05);
  assert.ok(c.B.fields.some(x => x.kind === "blackhole"), "Small Black Hole at the end of flight");
  assert.ok(c.B.portals.length >= 1 || tgt.y !== 520, "Static Wormhole opened");
});

test("Teslacoil charges before firing; Cooperative Beam and Charged Shock work during the charge", () => {
  const { game: c } = harness();
  const [t] = mechBattle(c, ["tesla"]);
  t.coopBeam = true; t.chargedShock = true; t.chargeTime = 0.8;
  const e = still(c, 52, 400), e2 = still(c, 90, 420); c.B.enemies = [e, e2];
  t.cd = 0; c.unitFire(t, 0.05);
  assert.equal(c.B.projs.length, 0, "charging, not firing yet");
  for (let i = 0; i < 10; i++) c.unitFire(t, 0.05);
  assert.ok(e.hp < 1e6 && e2.hp < 1e6, "refracted beams / shocks during the charge");
  for (let i = 0; i < 10; i++) c.unitFire(t, 0.05);
  const p = c.B.projs.find(x => x.src === t);
  assert.ok(p && p.chargeT > 0.7, "the discharge carries its charge time");
});

test("Railgun Basic Split splits on the first hit; Piercing Mark applies Physical Vulnerable; Execution Penetration", () => {
  const { game: c } = harness();
  const [r] = mechBattle(c, ["railgun"]);
  ["basicSplit", "piercingMark", "executionPenetration"].forEach(id => c.applyCardDef(c.cardById("railgun", id), r));
  const e = still(c, 200, 300); c.B.enemies = [e, still(c, 260, 260)];
  const p = { src: r, dmg: 70, x: 200, y: 330, vx: 0, vy: -900, rail: true, hitSet: [e], pierce: 3 };
  const before = c.B.projs.length; c.applyHit(p, e);
  const frags = c.B.projs.slice(before);
  assert.ok(frags.length === 2 || frags.length === 4, "2 small shells (+20%: 2 more)");
  assert.ok(e.physVulnT > 0);
  const weak = still(c, 100, 300, 1); weak.lastSrc = null; c.B.enemies.push(weak);
  c.applyHit({ src: r, dmg: 70, x: 100, y: 330, vx: 0, vy: -900, rail: true, hitSet: [weak], pierce: 1, pierced: 1 }, weak);
  assert.equal(r.execPierce, 1, "penetration +1 per kill");
});

test("Hive: Wasp Evolution III, Hive Mutation II, Final Resonance, Wasp Retrieval", () => {
  const { game: c } = harness();
  const [h] = mechBattle(c, ["hive"]);
  ["waspEvolutionII", "waspEvolutionIII", "hiveMutationII", "finalResonance", "waspRetrieval"].forEach(id => c.applyCardDef(c.cardById("hive", id), h));
  const e = still(c, 52, 500); c.B.enemies = [e];
  const dr = c.newWasp(h, 52, 506, { hits: 20 }); dr.tgt = e; c.B.drones = [dr];
  for (let i = 0; i < 6; i++) { dr.hitT = 0; dr.x = e.x; dr.y = e.y + 6; dr.tgt = e; c.update(0.01); }
  assert.equal(dr.tier, 3); assert.equal(dr.boost, 2, "Wasp III = 2x");
  c.B.drones = []; h.cd = 0; c.unitFire(h, 0.05); const n1 = c.B.drones.length;
  c.B.drones = []; h.cd = 0; c.unitFire(h, 0.05);
  assert.equal(c.B.drones.length, n1 + 1, "every 2nd volley adds a Wasp II");
  assert.ok(c.B.drones.some(d => d.tier === 2));
  const w = c.B.drones[0]; w.life = 0; let stored = 0;
  for (let i = 0; i < 40; i++) { c.waspDies(w); }
  assert.ok(h.stored === 5, "retrieval stores up to 5");
  assert.ok(c.B.pulses.length > 0, "Final Resonance pulse");
});

test("Firewheel: Mini Drones, Hold the Ground, Killing Array; mini cap", () => {
  const { game: c } = harness();
  const [f] = mechBattle(c, ["firewheel"]);
  ["miniDrones", "holdTheGround", "killingArray"].forEach(id => c.applyCardDef(c.cardById("firewheel", id), f));
  c.B.enemies = [still(c, 200, 300)];
  f.cd = 0; c.unitFire(f, 0.05);
  const w = c.B.wheels[0];
  for (let i = 0; i < 70; i++) c.update(0.05);
  assert.ok(c.B.wheels.filter(x => x.mini).length >= 2, "2 mini drones every 3 s");
  w.life = 0.01; c.update(0.05);
  assert.ok(w.holding && c.B.wheels.includes(w), "Hold the Ground keeps the disc 10 s more");
  for (let i = 0; i < 40; i++) c.addMiniWheel(f, 200, 300);
  assert.ok(c.B.wheels.filter(x => x.mini).length <= c.FX_CAP.minis);
});

test("Guardian: Charge Activation enters Charged State; Splitting Bullet; Mirror Guardian clone fires at 50%; Counterburst", () => {
  const { game: c } = harness();
  mechBattle(c, []);
  const s = c.B.soldier; s.cd = 0;
  ["chargeActivation", "splittingBullet", "mirrorGuardian", "counterburstScatter"].forEach(id => c.applyCardDef(c.cardById("soldier", id), s));
  const e = still(c, 210, 300); c.B.enemies = [e, still(c, 240, 300), still(c, 180, 280)];
  let shots = 0;
  for (let i = 0; i < 300 && !(s.chargedLeft > 0); i++) { s.cd = 0; const b = c.B.projs.length; c.unitFire(s, 0.01); shots++; }
  assert.ok(s.chargedLeft > 0, "Charged State after enough shots: " + shots);
  const b0 = c.B.projs.length; s.cd = 0; c.unitFire(s, 0.01);
  const vol = c.B.projs.slice(b0).filter(p => p.bullet);
  assert.ok(vol.some(p => p.dmg === 6) && vol.some(p => p.dmg === 12), "clone bullets deal 50%");
  assert.ok(vol.every(p => p.charged));
  const n0 = c.B.projs.length; c.applyHit(vol[0], e);
  assert.equal(c.B.projs.length - n0, 2, "Charged State: 2 sub-bullets");
  assert.ok(c.B.projs.some(p => p.kind === "shell" && p.src === s && p.pierce === 99), "Counterburst wave fired after 40 shots");
});

test("Aeroblast: Floating Mine card, Shotgun Barrage shells, Multiple Blast+ repeat, Extra Loading", () => {
  const { game: c } = harness();
  const [a] = mechBattle(c, ["aeroblast"]);
  ["floatingMine", "shotgunBarrage", "multipleBlastPlus", "extraLoading"].forEach(id => c.applyCardDef(c.cardById("aeroblast", id), a));
  const e = still(c, 52, 450); c.B.enemies = [e];
  a.cd = 0; c.unitFire(a, 0.01);
  const pel = c.B.projs.filter(p => !p.kind), shells = c.B.projs.filter(p => p.kind === "shell");
  assert.equal(pel.filter(p => p.main).length, 1); assert.equal(shells.length, 5);
  c.applyHit(pel.find(p => p.main), e);
  assert.equal(c.B.mines.length, 2, "2 mines per explosion");
  for (let i = 0; i < 5; i++) c.unitFire(a, 0.05);
  assert.ok(c.B.projs.filter(p => !p.kind).length >= 2 * pel.length, "fires 1 extra time");
  const k = still(c, 60, 450, 1); c.B.enemies.push(k); c.dealDamage(a, k, 100, { kind: "aero" });
  assert.equal(a.aeroLoaded, 1);
});

test("Beam: thick stream visual state, Damage Increase ramp, Slaughtering Beam", () => {
  const { game: c } = harness();
  const [b] = mechBattle(c, ["beam"]);
  ["damageIncrease", "slaughteringBeam"].forEach(id => c.applyCardDef(c.cardById("beam", id), b));
  const e = still(c, 52, 450); c.B.enemies = [e];
  b.cd = 0; const hits = [];
  for (let i = 0; i < 6; i++) { const h = e.hp; c.unitFire(b, 0.2); hits.push(h - e.hp); }
  assert.ok(b.beamVisT > 0 && b.beamVisX === 52, "stream state for the renderer");
  assert.ok(hits[5] > hits[1], "damage on the same target grows");
  c.draw();
  const k = still(c, 60, 450, 1); c.B.enemies.push(k); c.dealDamage(b, k, 100, { kind: "beam" });
  assert.ok(Math.abs(b.beamKillBonus - 0.1) < 1e-9);
});

test("meta progression: Lv.4/12 +20% secondary, Lv.8 Cooldown Speed +5%, Hive ATK count +1 per bump", () => {
  const { game: c } = harness();
  assert.ok(Math.abs(c.metaCooldown(8) - 1 / 1.05) < 1e-9);
  assert.ok(Math.abs(c.metaCooldown(7) - 1) < 1e-9);
  assert.equal(c.metaSteps(3), 0); assert.equal(c.metaSteps(4), 1); assert.equal(c.metaSteps(12), 2);
  c.META.levels.hive = 12; c.B = c.newBattle(c.STAGES[0]);
  const h = c.mkUnit(c.TURRETS.find(t => t.id === "hive"), 52, 0, false);
  assert.equal(h.hiveAttacks, 9);
  c.META.levels.railgun = 4; assert.equal(c.mkUnit(c.TURRETS.find(t => t.id === "railgun"), 52, 0, false).pierce, 4);
});

/* Insert before the final smoke summary. Update the old pips test separately:
   - rename "3 pips force Extras" to "3 pips unlock rarer Extras";
   - replace its 20-draft loop that asserts cards.length === 2 with a loop over 200 drafts
     checking that some drafts contain an Extra and some do not;
   - change the assertion text "purple cards are never random" at 2 pips to "Extras need 3 pips".
*/
test("Card offers decrease with Star Tier, and Extras receive an additional rarity penalty", () => {
  const {game:h}=harness(undefined,7419);h.startBattle();
  const u=h.B.soldier;u.runLv=3;u.pips=3;h.META.levels.soldier=45;
  h.TURRETS.forEach(cfg=>h.B.usedTypes[cfg.id]=1);
  ["boost","healm","regenm","jam"].forEach(id=>h.B.modulesUsed[id]=1);
  const wanted=["volleyShot","flameBullet","explosionBoost","shotgunEvolution","penetrationBoost"];
  h.CARDS.filter(d=>d.unit==="soldier").forEach(d=>{if(!wanted.includes(d.id))u.cards[d.id]=1;});
  const counts=Object.fromEntries(wanted.map(id=>[id,0]));
  for(let i=0;i<6000;i++){
    const cards=h.genCards();
    assert.equal(cards.length,3);assert.ok(cards.every(c=>c.kind==="card"));
    assert.equal(new Set(cards.map(c=>c.def.id)).size,3,"no duplicate cards in one draft");
    counts[cards[0].def.id]++;
  }
  const normal=counts.volleyShot;
  for(const [id,lo,hi] of [["flameBullet",.42,.58],["explosionBoost",.19,.31],["shotgunEvolution",.14,.26],["penetrationBoost",.065,.135]]){
    const ratio=counts[id]/normal;
    assert.ok(ratio>lo&&ratio<hi,id+" relative frequency "+ratio+", counts "+JSON.stringify(counts));
  }
});

test("Extra offers are random after three pips, and rerolls do not pin an Extra", () => {
  const {game:h,element}=harness(undefined,1771);h.startBattle();
  const u=h.B.soldier;u.pips=3;
  let extraDrafts=0;
  for(let i=0;i<300;i++){
    const cards=h.genCards();
    assert.ok(cards.every(c=>!c.forced));
    if(cards.some(c=>c.kind==="card"&&c.def.rare))extraDrafts++;
  }
  assert.ok(extraDrafts>0&&extraDrafts<100,"Extras must appear, but rarely: "+extraDrafts+"/300");
  h.TURRETS.forEach(cfg=>h.B.usedTypes[cfg.id]=1);
  ["boost","healm","regenm","jam"].forEach(id=>h.B.modulesUsed[id]=1);
  const rare=h.cardById("soldier","shotgunEvolution");
  h.curCards=[{kind:"card",u,def:rare}];h.B.reroll=true;h.Math.random=()=>0;
  element("btn-reroll").listeners.click[0]();
  assert.equal(h.B.reroll,false);
  assert.equal(h.curCards.length,3);
  assert.ok(h.curCards.every(c=>c.kind==="card"&&!c.def.rare),"reroll samples the pool afresh");
  h.CARDS.filter(d=>d.unit==="soldier"&&!d.rare&&d.lvl===1&&d.rd<=1).forEach(d=>u.cards[d.id]=1);
  assert.ok(h.genCards().some(c=>c.kind==="card"&&c.def.rare),"exhausting normal cards must not block evolution");
});

test("Fortress modules and combos remain offerable with lower bonus weight", () => {
  const {game:h}=harness(undefined,5567);h.startBattle();
  h.TURRETS.forEach(cfg=>h.B.usedTypes[cfg.id]=1);
  for(const id of Object.keys(h.META.levels))h.META.levels[id]=45;
  const laser=h.mkUnit(h.TURRETS.find(c=>c.id==="laser"),h.TURRET_X[0],0,false);
  const tesla=h.mkUnit(h.TURRETS.find(c=>c.id==="tesla"),h.TURRET_X[1],1,false);
  h.B.turrets=[laser,tesla];
  h.allFighters().forEach(u=>h.CARDS.filter(d=>d.unit===u.cfg.id).forEach(d=>u.cards[d.id]=1));
  const normal=h.cardById("laser","laserAmplification");laser.cards[normal.id]=0;
  ["healm","regenm","jam"].forEach(id=>h.B.modulesUsed[id]=1);
  const counts={card:0,combo:0,module:0};
  for(let i=0;i<2000;i++)counts[h.genCards()[0].kind]++;
  assert.ok(counts.card>1400,"normal unit cards should dominate bonus offers: "+JSON.stringify(counts));
  assert.ok(counts.combo>50&&counts.combo<350);
  assert.ok(counts.module>50&&counts.module<350);
});

/* ---------- bounded laser visuals / tick-only hit scans ---------- */
test("A laser channel reuses one visual per ray at 60 and 120 Hz without changing its damage ticks", () => {
  for (const fps of [60, 120]) {
    const {game:h}=harness();h.startBattle();
    const t=h.mkUnit(h.TURRETS.find(x=>x.id==="laser"),52,0,false);t.cd=0;t.laserDurationMul=100;
    h.B.turrets=[t];const e=sampleEnemy(h,340);e.x=52;e.hp=e.maxHp=1e9;h.B.enemies=[e];
    let hits=0,damage=0,scans=0,maxVisuals=0,first=null;
    h.dealDamage=(src,target,dmg)=>{hits++;damage+=dmg;return dmg;};
    const rayHits=h.rayHits;h.rayHits=function(){scans++;return rayHits.apply(h,arguments);};
    for(let i=0;i<fps*2;i++){
      h.B.t+=1/fps;h.fireLaser(t,1/fps);
      if(!first)first=h.B.beams[0];
      assert.equal(h.B.beams[0],first,"continuous ray identity must stay stable");
      h.B.beams=h.B.beams.filter(b=>{b.t+=1/fps;return b.t<b.life;});
      maxVisuals=Math.max(maxVisuals,h.B.beams.length);
    }
    assert.equal(maxVisuals,1,"refresh must replace overlapping per-frame copies");
    assert.equal(hits,17);assert.equal(damage,17*t.cfg.damage,"the original 0.12s tick cadence is preserved");
    assert.equal(scans,17,"a visual-only frame must not scan every enemy");
    h.B.beams.forEach(b=>{b.t+=.1;});h.B.beams=h.B.beams.filter(b=>b.t<b.life);
    assert.equal(h.B.beams.length,0,"a released ray must fade and expire");
    h.fireLaser(t,1/fps);assert.equal(h.B.beams.length,1,"an expired cached ray must be recreated");
    h.B.beams=[];h.fireLaser(t,1/fps);assert.equal(h.B.beams.length,1,"cleared effects cannot leave a stale invisible channel");
  }
});

test("Upgraded laser visuals are frame-rate independent and keep every origin on the turret", () => {
  const counts=[];
  for(const fps of [60,120]){
    const {game:h}=harness();h.startBattle();const t=h.mkUnit(h.TURRETS.find(x=>x.id==="laser"),52,0,false);
    Object.assign(t,{cd:0,laserDurationMul:100,laserDeflect:4,laserSweep:2,refract:true,reflect:3,deflectReflect:2,beamSplit:true});
    h.B.turrets=[t];
    for(let i=0;i<120;i++){const e=sampleEnemy(h,100+Math.floor(i/10)*47);e.x=15+(i%10)*42;e.hp=e.maxHp=1e9;h.B.enemies.push(e);}
    h.dealDamage=()=>0;let max=0;
    for(let i=0;i<fps*2;i++){
      h.B.t+=1/fps;h.fireLaser(t,1/fps);
      assert.ok(h.B.beams.every(b=>b.x1===t.x&&b.y1===t.y-14),"forks, reflections and sweeps must start at the turret");
      h.B.beams=h.B.beams.filter(b=>{b.t+=1/fps;return b.t<b.life;});max=Math.max(max,h.B.beams.length);
    }
    assert.ok(max<=24,"upgrades need ray slots, not per-frame copies: "+max);counts.push(max);
  }
  assert.ok(Math.abs(counts[0]-counts[1])<=2,"high refresh rate cannot multiply ray count: "+counts);
});

test("Laser ray rendering adds no shadowBlur passes", () => {
  const {game:h}=harness();h.startBattle();
  const ctx=h.ctx;let blurs=0;
  h.ctx=new Proxy(ctx,{set(target,key,value){if(key==="shadowBlur"&&value>0)blurs++;target[key]=value;return true;}});
  h.draw();const baseline=blurs;blurs=0;
  for(let i=0;i<10;i++)h.B.beams.push({x1:52,y1:706,x2:20+i*35,y2:20,w:3+i,color:"#4ade80",t:0,life:.09,laser:true});
  h.draw();assert.equal(blurs,baseline,"long laser rays must use gradient glows, not framebuffer blur");
});

test("Laser reflections preserve the strict radius boundary and stable equal-distance order", () => {
  const {game:h}=harness();h.startBattle();
  const t=h.mkUnit(h.TURRETS.find(x=>x.id==="laser"),210,0,false);t.cd=0;t.reflect=1;h.B.turrets=[t];
  const main=sampleEnemy(h,400),left=sampleEnemy(h,400),right=sampleEnemy(h,400);
  main.x=210;left.x=40;right.x=380;[main,left,right].forEach(e=>{e.hp=e.maxHp=1e9;});
  h.B.enemies=[main,left,right];const got=[];h.dealDamage=(src,e,dmg)=>{got.push(e);return dmg;};
  h.fireLaser(t,.01);assert.deepEqual(got,[main],"original reflections exclude a target exactly 170px away");
  left.x=40.01;right.x=379.99;t.laserTickT=0;got.length=0;
  h.fireLaser(t,.01);assert.deepEqual(got,[main,left],"equal-distance ties keep enemy order");
});

test("Every weapon with its full card set deals damage without competition from other weapons", () => {
  for (const cfg of g.allUnitsCfg()) {
    const {game:h}=harness(undefined,935);
    for (const id of Object.keys(h.META.levels)) h.META.levels[id]=45;
    mechBattle(h,cfg.id==="soldier"?[]:[cfg.id]);
    const u=cfg.id==="soldier"?h.B.soldier:h.B.turrets[0];
    u.cd=0;u.runLv=3;u.rangeMul=5;
    h.CARDS.filter(d=>d.unit===cfg.id).forEach(d=>h.applyCardDef(d,u));h.maybeSuperMode(u);
    h.B.enemies=[still(h,u.x,470,1e9),still(h,u.x+12,465,1e9)];
    for(let i=0;i<200;i++)h.update(.05);
    assert.ok(u.totalDmg>0,cfg.id+" must be able to damage a target with all its cards");
  }
});

test("Stage preview shares exact wave totals and themed roster with spawning", () => {
  const {game:h,element}=harness();h.META.unlocked=12;
  for(let stage=1;stage<=12;stage++)for(const elite of [false,true]){
    h.META.selStage=stage;h.META.elite=elite;h.renderHome();h.openStageInfo();
    const total=h.waveEnemyTotal(h.STAGES[stage-1],1,elite);
    assert.ok(element("stage-metrics").innerHTML.includes('<b>'+total+'</b> in wave 1'));
    assert.ok(element("stage-info-body").innerHTML.includes(h.STAGE_ECOLOGY[stage-1].name));
    h.B=h.newBattle(h.STAGES[stage-1]);h.B.elite=elite;h.startWave(1);assert.equal(h.B.waveTotal,total);
  }
});

/* Enemy ecology, stationary attackers, ammunition and wave completion. */
function enemyDefenseScene(h){
  h.META.energy=30;h.startBattle();h.B.waveState="fighting";h.B.wave=1;h.B.waveQueue=1;h.B.spawnT=1e9;
  h.B.draftNeed=1e9;h.B.soldier.cd=1e9;h.B.soldier.extraProj=0;
}

test("Only geological bodies can breach: every insect and the boss holds its firing station", () => {
  const {game:h}=harness();
  assert.equal(h.ENEMIES.length,15);
  for(const cfg of h.ENEMIES){
    enemyDefenseScene(h);h.spawnEnemy(cfg.id,{x:210,y:h.BASEY-1});
    const e=h.B.enemies[0];e.hp=e.maxHp=1e6;e.attackCd=999;
    const meteor=["meteor","fast","armored","charger"].includes(cfg.id);
    assert.equal(h.isMeteorEnemy(e),meteor,cfg.id);
    h.update(.05);
    if(meteor){assert.equal(h.B.leaks,1,cfg.id+" must impact");assert.ok(h.B.baseHp<h.B.baseMax);}
    else {assert.equal(h.B.leaks,0,cfg.id+" must not impact");assert.equal(h.B.baseHp,h.B.baseMax);assert.ok(h.B.enemies.includes(e));}
  }
});

test("Every insect caste approaches a varied stand-off distance and fires telegraphed ammunition", () => {
  const {game:h}=harness();
  for(const cfg of h.ENEMIES.filter(x=>!["meteor","fast","armored","charger"].includes(x.id))){
    enemyDefenseScene(h);h.spawnEnemy(cfg.id,{x:210});
    const e=h.B.enemies[0],p=h.enemyAttackProfile(e);e.hp=e.maxHp=1e9;
    assert.ok(h.BASEY-e.standY>=p.dist[0]-1e-6&&h.BASEY-e.standY<=p.dist[1]+1e-6,cfg.id+" station bounds");
    let sawCharge=false;
    for(let i=0;i<900;i++){h.update(.05);if(e.attackState==="charge")sawCharge=true;}
    assert.ok(sawCharge,cfg.id+" never showed a windup");
    assert.ok(h.B.enemyShotsFired>0,cfg.id+" never fired");
    assert.ok(h.B.enemyShotHits>0&&h.B.enemyShotDamage>0,cfg.id+" cannot threaten the fortress");
    assert.equal(h.B.leaks,0,cfg.id+" should deal ranged damage, not collision damage");
    assert.ok(Math.abs(e.y-e.standY)<1,cfg.id+" did not stop at its station");
  }
  const stations=[];
  for(let i=0;i<8;i++){enemyDefenseScene(h);h.spawnEnemy("spitter",{x:40+i*40});stations.push(h.B.enemies[0].standY);}
  assert.ok(Math.max(...stations)-Math.min(...stations)>20,"individual firing distances must vary");
});

test("Windup locks its impact point; stuns and displacement interrupt it and slowing delays it", () => {
  const {game:h}=harness();enemyDefenseScene(h);h.spawnEnemy("spitter",{x:160});
  const e=h.B.enemies[0],p=h.enemyAttackProfile(e);e.y=e.standY;e.attackCd=0;
  h.stepEnemyAttack(e,.01);assert.equal(e.attackState,"charge");
  const aim=e.attackAimX;e.x+=30;h.stepEnemyAttack(e,p.windup+.01);
  assert.equal(h.B.enemyShots[0].aimX,aim,"fired shot must match the advertised target");
  h.B.enemyShots=[];e.attackState="charge";e.attackCharge=0;e.slowFactor=.5;
  h.stepEnemyAttack(e,p.windup);assert.equal(h.B.enemyShots.length,0,"slow must delay windup");
  e.paralyzeT=1;h.stepEnemyAttack(e,.1);assert.equal(e.attackState,"stunned");assert.equal(e.attackCharge,0);
  e.paralyzeT=0;e.y=e.standY-80;h.stepEnemyAttack(e,.1);assert.equal(e.attackState,"approach");
});

test("Player ammunition intercepts hostile shots without awarding kills, points or healing", () => {
  const {game:h}=harness();enemyDefenseScene(h);h.B.baseHp=500;
  h.B.enemyShots=[{x:210,y:550,vx:0,vy:140,r:5,hp:5,damage:20,kind:"spit",color:"#aabbcc",life:5,dead:false}];
  h.B.projs=[{x:210,y:590,vx:0,vy:-600,src:h.B.soldier,dmg:12,life:2,pierce:0,hitSet:[],tgt:null}];
  h.update(.1);
  assert.equal(h.B.enemyShots.length,0);assert.equal(h.B.enemyShotsIntercepted,1);
  assert.equal(h.B.baseHp,500);assert.equal(h.B.kills,0);assert.equal(h.B.scoreTotal,0);assert.equal(h.B.totalHealed,0);
});

test("Hostile ammunition is bounded, expires, and remains dangerous after the shooter dies", () => {
  const {game:h}=harness();enemyDefenseScene(h);h.spawnEnemy("moth",{x:210});
  const e=h.B.enemies[0],p=h.enemyAttackProfile(e);e.y=e.standY;e.attackAimX=210;e.attackAimY=h.BASEY-16;
  for(let i=0;i<100;i++)h.fireEnemyVolley(e,p);
  assert.equal(h.B.enemyShots.length,h.ENEMY_SHOT_CAP);
  h.B.enemyShots=[{x:210,y:400,vx:0,vy:140,r:5,hp:5,damage:20,kind:"spit",color:"#aabbcc",life:.01,dead:false}];
  h.stepEnemyShots(.05);assert.equal(h.B.enemyShots.length,0);
  h.B.enemyShots=[{x:210,y:h.BASEY-17,vx:0,vy:140,r:5,hp:5,damage:20,kind:"spit",color:"#aabbcc",life:2,dead:false,source:e}];
  e.dead=true;const hp=h.B.baseHp;h.stepEnemyShots(.05);
  assert.equal(h.B.baseHp,hp-20);assert.equal(h.B.enemyShotHits,1);
});

test("Waves wait for hostile ammunition, then advance without a stranded projectile", () => {
  const {game:h}=harness();enemyDefenseScene(h);h.B.waveQueue=0;
  h.B.enemyShots=[{x:210,y:300,vx:0,vy:100,r:5,hp:5,damage:20,kind:"spit",color:"#aabbcc",life:2,dead:false}];
  h.update(.05);assert.equal(h.B.wave,1,"outstanding shots must prevent a premature clear");
  h.B.enemyShots[0].life=.01;h.update(.05);assert.equal(h.B.wave,2,"expired shots must not strand the wave");
});

test("Campaign ecologies retain their themed roster in every random formation", () => {
  const {game:h}=harness();const compositions=[];
  assert.equal(h.STAGE_ECOLOGY.length,12);
  for(const stage of h.STAGES){
    enemyDefenseScene(h);h.B.stage=stage;h.startWave(12);
    const allowed=new Set(h.waveEnemyPool().map(x=>x[0]));
    compositions.push([...allowed].sort().join(","));
    for(let i=0;i<30;i++){
      h.B.enemies=[];h.B.waveQueue=1000;h.spawnWaveGroup();
      h.B.enemies.forEach(e=>assert.ok(allowed.has(e.cfg.id),stage.n+" leaked "+e.cfg.id));
    }
  }
  assert.ok(new Set(compositions).size>=10,"campaign sectors should have distinct ecologies");
  enemyDefenseScene(h);h.startWave(1);assert.equal(h.wavePickKind(),"meteor");
  h.spawnEnemy("meteor");assert.equal(h.wavePickKind(),"meteor");
  assert.equal(h.ENEMIES.find(e=>e.id==="meteor").xp,1);
});

test("External insect displacement cannot leave a firing creature inside the bunker", () => {
  const {game:h}=harness();enemyDefenseScene(h);h.spawnEnemy("spitter",{x:210});
  const e=h.B.enemies[0];e.y=h.BASEY-1;
  h.stepMove(e,.05);
  assert.ok(e.y<=h.BASEY-60,"legacy spawn/Gravity overshoot needs deck clearance");
  assert.equal(h.B.maxUpwardOwn,0,"external correction must not count as autonomous upward flight");
  const meteor=h.B.enemies.find(x=>h.isMeteorEnemy(x));
  assert.equal(meteor,undefined);
});

test("Late campaign reconnaissance ramps density without changing Stage 1 or leaking heavy castes", () => {
  const {game:h}=harness();
  for(const stage of h.STAGES)for(const elite of [false,true]){
    for(let wave=1;wave<=4;wave++){
      const opening=h.campaignOpening(stage,wave),pool=h.waveEnemyPool(stage,wave,elite,{});
      const full=h.BALANCE.waveStart+Math.round(wave*h.BALANCE.waveGrowth)+(stage.n-1)*6+(elite?Math.ceil(h.BALANCE.eliteWaveBase+wave*h.BALANCE.eliteWaveGrowth):0);
      if(stage.n<4){assert.equal(opening.spawn,1);assert.equal(opening.bonus,1);assert.equal(h.waveEnemyTotal(stage,wave,elite),full);}
      if(wave===4){assert.equal(opening.spawn,1);assert.equal(h.waveEnemyTotal(stage,wave,elite),full,"full pressure returns by wave4");}
      if(stage.n>=4&&wave===1){
        assert.ok(opening.recon);assert.ok(opening.spawn>1);
        if(elite)assert.ok(h.campaignOpening(stage,wave,true).spawn>opening.spawn,"Elite scouting starts slower but retains its stat pressure");
        assert.ok(pool.every(entry=>["meteor","fast"].includes(entry[0])),"opening wave needs visible light scouts");
        assert.ok(h.waveEnemyTotal(stage,wave,elite)<full);
      }
      assert.ok(pool.length>0,"a stage must always have a spawnable caste");
    }
  }
});

console.log("\n" + tests.length + " smoke tests passed.");
