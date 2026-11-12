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
/* Progression probe: does a fresh account win Stage 1 Normal on attempt 3-5,
 * levelling up between attempts with the REAL economy?
 * One harness per seed (the RNG stream continues across attempts, like real play).
 * After each loss endBattle has already credited META via applyRewards; then the
 * probe greedily buys R&D levels — top damage dealer first, one level at a time,
 * until nothing is affordable — using exactly the UI's upCost rules.
 * Must NOT modify game code or balance.cjs assertions.
 * Usage: node tests/progression-probe.cjs [--seeds 3121,777,42] [--attempts 5] */
const SEEDS=[3121,777,42,1234,9999,2026];
const MAX_ATTEMPTS=5;
function chooseCard(cards,policy){
 assert.ok(cards.length,"draft has no choices");
 if(policy==="first")return cards[0];
 const ranks={skyguard:85,laser:82,tesla:81,hive:79,firewheel:76,aeroblast:73,beam:73,gravity:70,railgun:68,thunder:68,disruption:59};
 function value(c){
  if(c.kind==="card"&&c.def.rare)return 120;
  if(c.kind==="new")return ranks[c.cfg.id]||65;
  if(c.kind==="module")return c.modId==="healm"?83:c.modId==="patch"?10:30;
  if(c.kind==="combo")return 75;
  if(c.kind==="card"){
   const f=c.def.fx.find(op=>op.k==="dmgMul"&&op.mul>1);
   return (c.def.lvl===2?70:50)+(f?12:0)+Math.min(35,c.u.totalDmg/700)+(c.u.isSoldier?4:0);
  }
  return 20;
 }
 return cards.slice().sort((a,b)=>value(b)-value(a))[0];
}
function runAttempt(g,seed,attempt,sig,policy){
 const dt=.05,maxSeconds=2400,maxSteps=Math.ceil(maxSeconds/dt)+1000;
 g.startBattle();g.startWave(1);
 let steps=0;
 while(!g.B.over&&steps++<maxSteps&&g.B.elapsed<maxSeconds){
  if(g.B.waveState==="draft"){
   const c=chooseCard(g.curCards,policy),before=g.B.drafts;g.applyCard(c);
   assert.equal(g.B.drafts,before+1,"a selected draft choice did not apply: "+policy+" seed "+seed+" attempt "+attempt);
  }else{
   g.update(dt);
  }
 }
 assert.ok(g.B.over&&sig.win!==null,"campaign did not terminate: "+policy+" seed "+seed+" attempt "+attempt+" wave "+g.B.wave+" after "+Math.round(g.B.elapsed)+"s");
 const fighters=g.allFighters().map(function(t){return{id:t.cfg.id,name:t.cfg.name,dmg:Math.round(t.totalDmg),runLv:t.runLv};});
 const r=g.lastRewards||{};
 return {attempt:attempt,win:sig.win===true,wave:g.B.wave,elapsed:Math.round(g.B.elapsed),hp:Math.round(g.B.baseHp),kills:g.B.kills,leaks:g.B.leaks,meteorDamage:Math.round(g.B.meteorDamage||0),bossArrived:(g.B.bossDamage||0)>0,bossDamage:Math.round(g.B.bossDamage||0),rangedDamage:Math.round(g.B.enemyShotDamage||0),rangedHits:g.B.enemyShotHits||0,shotsFired:g.B.enemyShotsFired||0,rewards:{coins:r.coins||0,gems:r.gems||0,comp:r.comp||0,pxp:r.pxp||0,mats:r.mats||{}},fighters:fighters};
}
function buyUpgrades(g,dmgById){
 const bought=[];
 let progress=true;
 while(progress){
  progress=false;
  const order=g.allUnitsCfg().slice().sort(function(a,b){return (dmgById[b.id]||0)-(dmgById[a.id]||0)||(g.META.mats[b.id]||0)-(g.META.mats[a.id]||0);});
  for(const cfg of order){
   const lv=g.META.levels[cfg.id];
   if(lv>=45)continue;
   const c=g.upCost(cfg);
   if((g.META.mats[cfg.id]||0)>=c.mats&&g.META.coins>=c.coins){
    g.META.mats[cfg.id]-=c.mats;g.META.coins-=c.coins;g.META.levels[cfg.id]++;
    bought.push({id:cfg.id,from:lv,to:lv+1,mats:c.mats,coins:c.coins});
    progress=true;
   }
  }
 }
 return bought;
}
function main(){
 const args=process.argv.slice(2);
 let seeds=SEEDS,attempts=MAX_ATTEMPTS;
 for(let i=0;i<args.length;i++){
  if(args[i]==="--seeds")seeds=args[++i].split(",").map(Number);
  else if(args[i]==="--attempts")attempts=parseInt(args[++i],10);
 }
 const results=[];
 for(const seed of seeds){
  const {game:g}=harness(undefined,seed);
  g.META.music=g.META.sfx=false;
  g.META.unlocked=g.STAGES.length;g.META.selStage=1;g.META.elite=false;
  for(const id of Object.keys(g.META.levels))g.META.levels[id]=1;
  g.META.chips.fort=0;
  const sig={win:null};
  const endBattle=g.endBattle;
  g.endBattle=function(win){sig.win=!!win;return endBattle(win);};
  const entry={seed:seed,attempts:[],firstWin:null,finalLevels:{}};
  for(let a=1;a<=attempts;a++){
   sig.win=null;
   const att=runAttempt(g,seed,a,sig,"smart");
   if(att.win){entry.attempts.push(att);entry.firstWin=a;break;}
   const dmgById={};
   att.fighters.forEach(function(f){dmgById[f.id]=f.dmg;});
   att.bought=buyUpgrades(g,dmgById);
   att.levelsAfter=JSON.parse(JSON.stringify(g.META.levels));
   att.coinsAfter=g.META.coins;
   att.matsAfter=JSON.parse(JSON.stringify(g.META.mats));
   entry.attempts.push(att);
  }
  entry.finalLevels=JSON.parse(JSON.stringify(g.META.levels));
  results.push(entry);
 }
 for(const e of results){
  console.log("seed "+e.seed+": firstWin "+(e.firstWin===null?"none in "+e.attempts.length+" attempts":"attempt "+e.firstWin));
  e.attempts.forEach(function(a){
   console.log("  attempt "+a.attempt+": "+(a.win?"WIN":"loss")+" wave "+a.wave+" elapsed "+a.elapsed+"s hp "+a.hp+" kills "+a.kills+" leaks "+a.leaks+" boss "+(a.bossArrived?"arrived "+a.bossDamage:"no")+" ranged "+a.rangedDamage+" ("+a.rangedHits+" hits) | rewards coins "+a.rewards.coins+" gems "+a.rewards.gems+" comp "+a.rewards.comp+" mats "+JSON.stringify(a.rewards.mats)+" | bought "+(a.bought&&a.bought.length?a.bought.map(function(b){return b.id+" "+b.from+"->"+b.to;}).join(", "):"nothing")+" | coinsAfter "+a.coinsAfter);
  });
 }
 console.log(JSON.stringify({seeds:results}));
}
main();
