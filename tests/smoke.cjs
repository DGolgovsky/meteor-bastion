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
    }
  }, {
    get(target, key) { return target[key] ?? (() => {}); },
    set(target, key, value) { target[key] = value; return true; }
  });
  function element(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set();
    const value = {
      id, style: {}, dataset: {}, clientWidth: 420, width: 420, height: 760,
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
      getBoundingClientRect() { return { top: 0, left: 0, width: 420, height: 760 }; },
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
  // "Firefly": one large long-lived disc; repeated shots do not spawn
  // new ones while the previous one is alive. The wheelCount card raises the limit to two.
  assert.equal(g.B.wheels.length, 1);
  assert.ok(g.B.wheels[0].life >= 9, "disc should live ~10s, got " + g.B.wheels[0].life);
  for (let i = 0; i < 5; i++) g.unitFire(u, 0.8);
  assert.equal(g.B.wheels.length, 1);
  g.applyCard({ kind: "card", u, def: g.cardById("firewheel", "wheelCount") });
  g.unitFire(u, 0.8);
  assert.equal(g.B.wheels.length, 2);
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
    if (def.rare) assert.equal(u.runLv, def.lvl + 1, def.id + " must level the unit up");
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
  assert.equal(g.cardDesc(g.cardById("skyguard", "volleyMissile")), "Missiles +1, DMG -15%.");
  assert.equal(g.cardDesc(g.cardById("laser", "laserAmplification")), "Laser DMG +50%.");
});

test("generic cards and SUPER-every-5-levels are gone; every unit has a level-1 purple at R&D 1", () => {
  assert.equal(typeof g.CARD_CHAINS, "undefined");
  assert.equal(typeof g.gainLevel, "undefined");
  assert.ok(!/kind:"up"|kind:"mod"|kind:"chain"/.test(source), "old card kinds must be removed");
  for (const cfg of g.allUnitsCfg()) {
    const purple1 = g.CARDS.filter(d => d.unit === cfg.id && d.rare && d.lvl === 1);
    const supers = g.CARDS.filter(d => d.unit === cfg.id && d.isSuper);
    assert.equal(supers.length, 1, cfg.id + " SUPER");
    assert.equal(supers[0].lvl, 2);
    assert.equal(g.cardRd(supers[0]), g.rdTierUnlock(cfg.id));
    const normal1 = g.CARDS.filter(d => d.unit === cfg.id && !d.rare && d.lvl === 1 && (d.rd || 1) <= 1);
    const slots = normal1.reduce((s, d) => s + (d.max || 1), 0);
    assert.ok(slots >= 3, cfg.id + " needs at least 3 level-1 pips reachable at R&D 1, has " + slots);
    if (purple1.length) assert.ok(purple1.every(d => (d.rd || 1) <= 1), cfg.id + " level-1 purple must not need R&D");
  }
});

test("pips: 3 normal cards force the purple card; it levels up; max level is 3", () => {
  const { game: c } = harness();
  c.META.music = false; c.META.sfx = false;
  c.B = c.newBattle(c.STAGES[0]);
  c.B.soldier = c.mkUnit(c.SOLDIER_CFG, 210, -1, true);
  const u = c.mkUnit(c.TURRETS.find(t => t.id === "tesla"), 52, 0, false);
  c.B.turrets = [u]; c.B.usedTypes.tesla = 1;
  const take = def => { c.B.pendingDrafts = 1; c.B.waveState = "draft"; c.applyCard({ kind: "card", u, def }); };
  assert.equal(u.runLv, 1); assert.equal(u.pips, 0);
  assert.equal(c.purpleFor(u), null, "no purple before 3 pips");
  take(c.cardById("tesla", "electroChain"));
  take(c.cardById("tesla", "electroChain"));
  assert.equal(u.pips, 2);
  assert.ok(c.genCards().every(x => !(x.kind === "card" && x.def.rare)), "purple cards are never random");
  take(c.cardById("tesla", "electroAcceleration"));
  assert.equal(u.pips, 3);
  const purple = c.purpleFor(u);
  assert.equal(purple.id, "trapMatrix");
  for (let i = 0; i < 20; i++) {
    const cards = c.genCards();
    assert.ok(cards.some(x => x.kind === "card" && x.u === u && x.def.id === "trapMatrix"), "purple card must be guaranteed");
  }
  take(c.cardById("tesla", "electroAcceleration"));
  assert.equal(u.pips, 3, "pips do not overflow past 3 before the purple card");
  const dmg = u.dmgMul;
  take(purple);
  assert.equal(u.runLv, 2); assert.equal(u.pips, 0);
  assert.ok(Math.abs(u.dmgMul / dmg - (1 + c.BALANCE.levelUpDmg)) < 1e-9, "level-up damage bonus");
  assert.ok(u.teslaMatrix);
  /* level-2 cards need R&D 6; the SUPER needs rdTierUnlock */
  assert.equal(c.cardEligible(u, c.cardById("tesla", "enhancedMatrix")), false);
  c.META.levels.tesla = 6;
  assert.equal(c.cardEligible(u, c.cardById("tesla", "enhancedMatrix")), true);
  u.pips = 3;
  assert.equal(c.purpleFor(u), null, "SUPER is gated by rdTierUnlock");
  c.META.levels.tesla = c.rdTierUnlock("tesla");
  assert.equal(c.purpleFor(u).isSuper, true);
  take(c.purpleFor(u));
  assert.equal(u.runLv, 3); assert.equal(u.pips, 4);
  assert.equal(c.purpleFor(u), null, "level 3 is the maximum");
  take(c.cardById("tesla", "enhancedMatrix"));
  assert.equal(u.runLv, 3); assert.equal(u.pips, 4);
  assert.ok(c.B.picked.length >= 4 && c.B.picked.find(p => p.id === "electroChain").n === 2, "picked cards are grouped with counts");
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

test("R&D gates migrated tier cards: T1 at R&D 2, level-2 cards at R&D 6/10 and in order", () => {
  const {game:rnd}=harness();
  rnd.META.music=false;rnd.META.sfx=false;
  rnd.startBattle();
  const t=rnd.mkUnit(rnd.TURRETS.find(t=>t.id==="hive"),52,0,false);
  rnd.B.turrets=[t];
  const ids=()=>rnd.unitCards(t).map(d=>d.id);
  assert.ok(!ids().includes("swarmEcho"),"Swarm Echo needs R&D 2");
  rnd.META.levels.hive=2;
  assert.ok(ids().includes("swarmEcho"));
  rnd.B.pendingDrafts=1;rnd.applyCard({kind:"card",u:t,def:rnd.cardById("hive","swarmEcho")});
  assert.equal(t.hiveEcho,1);
  t.runLv=2;t.pips=0;
  assert.ok(!ids().includes("echoUpgrade2"),"level-2 cards need R&D 6");
  rnd.META.levels.hive=6;
  assert.ok(ids().includes("echoUpgrade2"));
  assert.ok(!ids().includes("echoUpgrade3"),"Echo III needs Echo II and R&D 10");
  rnd.B.pendingDrafts=1;rnd.applyCard({kind:"card",u:t,def:rnd.cardById("hive","echoUpgrade2")});
  rnd.META.levels.hive=10;
  assert.ok(ids().includes("echoUpgrade3"));
  t.runLv=1;
  assert.ok(!ids().includes("echoUpgrade3"),"level-2 cards never appear on a level-1 unit");
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

test("laser sweep hits the strongest remaining target, never a random one", () => {
  g.B = g.newBattle(g.STAGES[0]);
  g.B.soldier = g.mkUnit(g.SOLDIER_CFG, 210, -1, true);
  const laser = g.mkUnit(g.TURRETS.find(t => t.id === "laser"), 52, 0, false);
  laser.laserSweep = 1;
  g.B.turrets = [laser];
  const strong = sampleEnemy(g, 400); strong.x = 180; strong.maxHp = 1000; strong.hp = 5000;
  const mid = sampleEnemy(g, 400); mid.x = 100; mid.maxHp = 800; mid.hp = 800;
  const weak = sampleEnemy(g, 400); weak.x = 300; weak.maxHp = 500; weak.hp = 500;
  g.B.enemies = [strong, mid, weak];
  let swept = null;
  for (let ch = 0; ch < 5 && !swept; ch++) {
    laser.cd = 0; laser.laserActive = 0;
    for (let i = 0; i < 60 && !swept; i++) {
      g.unitFire(laser, 0.05);
      const sw = g.B.beams.find(b => b.color === "#a7f3d0");
      if (sw) swept = sw;
    }
  }
  assert.ok(swept, "a sweep beam should appear within a few channels");
  assert.ok(Math.abs(swept.x2 - 100) < 1 && Math.abs(swept.y2 - 400) < 1,
    "sweep must hit the strongest remaining target (mid, 800 HP), got endpoint (" + swept.x2 + "," + swept.y2 + ")");
  assert.equal(weak.hp, 500, "sweep must never hit the weaker target");
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

console.log("\n" + tests.length + " smoke tests passed.");
