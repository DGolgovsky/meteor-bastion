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

/* Deterministic R&D 1 Stage 1 headless campaigns; no external dependencies.
 * Run with: node tests/balance.cjs
 * 12 fixed seeds for each policy, results are exploratory calibration, not win-rate estimates.
 * Density is measured per active wave using game-time weighting. */
const SEEDS=[3121,777,42,1234,9999,2026,555,8888,31415,2718,1618,4242];
const POLICIES=["smart","first"];
function chooseCard(cards,policy){
 if(policy==="first")return cards[0];
 const ranks={skyguard:85,laser:82,tesla:81,hive:79,firewheel:76,aeroblast:73,beam:73,gravity:70,railgun:68,thunder:68,disruption:59};
 function value(c){
  if(c.kind==="super")return 120;
  if(c.kind==="new")return ranks[c.cfg.id]||65;
  if(c.kind==="module")return c.modId==="healm"?83:30;
  if(c.kind==="chain")return 84+(c.tier||0)*2;
  if(c.kind==="combo")return 75;
  if(c.kind==="up")return 40+Math.min(40,c.u.totalDmg/700)+(c.u.isSoldier?4:0);
  if(c.kind==="mod")return c.mod==="dmg"?60+Math.min(35,c.u.totalDmg/700):c.mod==="proj"?62:c.mod==="haste"?58:34;
  return 20;
 }
 return cards.slice().sort((a,b)=>value(b)-value(a))[0];
}
function run(seed,policy){
 const {game:g}=harness(undefined,seed);
 g.META.music=false;g.META.sfx=false;
 g.B=g.newBattle(g.STAGES[0]);
 g.B.soldier=g.mkUnit(g.SOLDIER_CFG,210,-1,true);
 g.startWave(1);
 let steps=0,lastWave=1,hpAt10=null,hpAt20=null;
 const visible={};
 while(!g.B.over&&steps++<48000){
  if(g.B.waveState==="draft")g.applyCard(chooseCard(g.curCards,policy));
  else{
   g.update(.05);
   if(g.B.waveState==="fighting"){
    const w=g.B.wave;
    const count=g.B.enemies.filter(e=>!e.dead&&e.hp>0&&e.y>=g.VIS_TOP&&e.y<=g.BASEY).length;
    const x=visible[w]||(visible[w]={seconds:0,sum:0,peak:0});
    x.seconds+=.05;x.sum+=count*.05;x.peak=Math.max(x.peak,count);
   }
  }
  if(g.B.wave!==lastWave){
   if(lastWave===10)hpAt10=Math.round(g.B.baseHp);
   if(lastWave===20)hpAt20=Math.round(g.B.baseHp);
   lastWave=g.B.wave;
  }
 }
 if(g.B.wave===10&&hpAt10===null)hpAt10=Math.round(g.B.baseHp);
 if(g.B.wave===20&&hpAt20===null)hpAt20=Math.round(g.B.baseHp);
 assert.ok(g.B.over&&steps<48000,"campaign did not terminate: "+policy+" seed "+seed);
 assert.equal(g.B.maxUpwardOwn,0,"own upward movement detected");
 return {
  seed,policy,win:g.B.baseHp>0,wave:g.B.wave,steps,elapsed:Math.round(g.B.elapsed),
  hp:Math.round(g.B.baseHp),hpAt10,hpAt20,kills:g.B.kills,leaks:g.B.leaks,
  healed:Math.round(g.B.totalHealed),drafts:g.B.drafts,
  waves:[1,10,20].map(w=>({
   wave:w,
   meanAlive:g.B.waveDensity[w]?+(g.B.waveDensity[w].enemySeconds/g.B.waveDensity[w].seconds).toFixed(1):null,
   peakAlive:g.B.waveDensity[w]?.peak??null,
   meanVisible:visible[w]?+(visible[w].sum/visible[w].seconds).toFixed(1):null,
   peakVisible:visible[w]?.peak??null
  }))
 };
}
const runs=[];
for(const policy of POLICIES)for(const seed of SEEDS)runs.push(run(seed,policy));
function mean(values){const a=values.filter(x=>x!==null&&Number.isFinite(x));return a.length?+(a.reduce((s,v)=>s+v,0)/a.length).toFixed(1):null;}
const reports=POLICIES.map(policy=>{
 const group=runs.filter(r=>r.policy===policy);
 const firstVictory=group.findIndex(r=>r.win);
 return {
  policy,firstVictory:firstVictory>=0?firstVictory+1:null,wins:group.filter(r=>r.win).length,attempts:group.length,
  meanHp10:mean(group.map(r=>r.hpAt10)),meanHp20:mean(group.map(r=>r.hpAt20)),
  meanLeaks:mean(group.map(r=>r.leaks)),meanHealed:mean(group.map(r=>r.healed)),
  waves:[1,10,20].map((w,i)=>({wave:w,
   meanAlive:mean(group.map(r=>r.waves[i].meanAlive)),
   peakAlive:mean(group.map(r=>r.waves[i].peakAlive)),
   meanVisible:mean(group.map(r=>r.waves[i].meanVisible)),
   peakVisible:mean(group.map(r=>r.waves[i].peakVisible))
  }))
 };
});
console.log(JSON.stringify({seeds:SEEDS,report:reports,runs:runs.map(r=>({policy:r.policy,seed:r.seed,win:r.win,wave:r.wave,hp:r.hp,leaks:r.leaks}))},null,2));
