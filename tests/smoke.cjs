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
    /* measureText: приближение ширины по текущему шрифту (для адаптивного HUD) */
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
  // «Светлячок»: один большой долгоживущий диск; повторные выстрелы не плодят
  // новых, пока прежний жив. Карточка wheelCount поднимает лимит до двух.
  assert.equal(g.B.wheels.length, 1);
  assert.ok(g.B.wheels[0].life >= 9, "disc should live ~10s, got " + g.B.wheels[0].life);
  for (let i = 0; i < 5; i++) g.unitFire(u, 0.8);
  assert.equal(g.B.wheels.length, 1);
  g.applyCard({ kind: "mod", u, mod: "wheelCount" });
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
  // тест был зависим от врага, оставшегося от прошлого теста; при taller-поле
  // (BASEY 720) тот враг оказался вне радиуса улья — ставим своего, в радиусе
  g.B.enemies = [sampleEnemy(g, 500)];
  g.unitFire(u, 0.5);
  assert.equal(g.B.drones.length, u.hiveCount);
  assert.ok(g.B.drones[0].hits > 1);
});

test("every specialist card renders and applies without exceptions", () => {
  const mods = {
    laser: ["laserSweep", "laserDeflect", "laserDuration"],
    beam: ["beamDuration", "beamFocus"],
    tesla: ["teslaMatrix", "teslaMatrixPlus", "teslaBounce"],
    hive: ["hiveCount", "hiveAttacks"],
    firewheel: ["wheelDuration", "wheelCount"]
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

test("R&D unlocks T1, T2 and T3 sequentially", () => {
  const {game:rnd}=harness();
  rnd.META.music=false;rnd.META.sfx=false;
  rnd.startBattle();
  const t=rnd.mkUnit(rnd.TURRETS.find(t=>t.id==="gravity"),52,0,false);
  t.runLv=2;rnd.B.turrets=[t];rnd.B.pendingDrafts=1;
  assert.equal(rnd.chainCandidates(t).length,0,"tier cards must not appear at R&D 1");
  rnd.META.levels.gravity=2;
  const t1=rnd.chainCandidates(t);
  assert.equal(t1.length,1);assert.equal(t1[0].tier,1);
  rnd.applyCard(t1[0]);
  assert.equal(t.mods.includes("smallBlackHole"),true);
  rnd.META.levels.gravity=6;
  const t2=rnd.chainCandidates(t);
  assert.equal(t2.length,1);assert.equal(t2[0].tier,2);
  rnd.B.pendingDrafts=1;rnd.applyCard(t2[0]);
  rnd.META.levels.gravity=14;
  const t3=rnd.chainCandidates(t);
  assert.equal(t3.length,1);assert.equal(t3[0].tier,3);
  rnd.B.pendingDrafts=1;rnd.applyCard(t3[0]);
  assert.ok(t.gravityShred);
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
  g.unitFire(laser,0.3); /* первый выстрел: канал стартует (cd ≤ 0,2) */
  assert.ok(g.B.beams.length>0,"laser should emit a beam");
  const first=g.B.beams[g.B.beams.length-1];
  const a1=Math.atan2(first.y2-first.y1,first.x2-first.x1);
  assert.ok(Number.isFinite(laser.laserAngle),"laser must store its firing angle");
  assert.equal(laser.laserAngle,Math.atan2(400-(laser.y-14),180-laser.x),"angle must come from the target position at firing time");
  enemy.x=320;enemy.y=250; /* цель резко уходит в сторону */
  g.unitFire(laser,0.05); /* канал ещё активен */
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

console.log("\n" + tests.length + " smoke tests passed.");
