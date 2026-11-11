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

/* Deterministic campaigns; no external dependencies. Default: the original 12 seeds
 * for each policy. Examples:
 *   node tests/balance.cjs --runs 3 --policy smart
 *   node tests/balance.cjs --runs 12 --stage 4 --rd 12 --elite --fort 2
 *   node tests/balance.cjs --seeds 3121,777,42 --stage 12 --rd 45
 * Fixed seeds are regression probes, not estimates of human win rate. */
const SEEDS = [3121,777,42,1234,9999,2026,555,8888,31415,2718,1618,4242];
const POLICIES = ["smart","first"];
const DEFAULTS = { runs:12, stage:1, rd:1, elite:false, fort:0, policy:"both", dt:.05, maxSeconds:2400 };
function chooseCard(cards, policy){
 assert.ok(cards.length, "draft has no choices");
 if(policy === "first") return cards[0];
 const ranks={skyguard:85,laser:82,tesla:81,hive:79,firewheel:76,aeroblast:73,beam:73,gravity:70,railgun:68,thunder:68,disruption:59};
 function value(c){
  if(c.kind === "card" && c.def.rare) return 120; /* Extra levels the unit up; Super is automatic at Lv3. */
  if(c.kind === "new") return ranks[c.cfg.id] || 65;
  if(c.kind === "module") return c.modId === "healm" ? 83 : c.modId === "patch" ? 10 : 30;
  if(c.kind === "combo") return 75;
  if(c.kind === "card"){
   const f=c.def.fx.find(op=>op.k === "dmgMul" && op.mul > 1);
   return (c.def.lvl === 2 ? 70 : 50)+(f ? 12 : 0)+Math.min(35,c.u.totalDmg/700)+(c.u.isSoldier ? 4 : 0);
  }
  return 20;
 }
 return cards.slice().sort((a,b)=>value(b)-value(a))[0];
}
function integer(n, min, max, label){
 assert.ok(Number.isInteger(n) && n >= min && n <= max, label+" must be an integer from "+min+" to "+max);
 return n;
}
function optionsWithDefaults(options={}){
 const o={...DEFAULTS,...options};
 integer(o.runs,1,1000,"runs"); integer(o.stage,1,12,"stage");
 integer(o.rd,1,45,"rd"); integer(o.fort,0,5,"fort");
 assert.ok(["smart","first","both"].includes(o.policy),"policy must be smart, first or both");
 assert.ok(Number.isFinite(o.dt) && o.dt > 0 && o.dt <= .1,"dt must be within (0, .1]");
 assert.ok(Number.isFinite(o.maxSeconds) && o.maxSeconds > 0,"maxSeconds must be positive");
 if(o.seeds){assert.ok(Array.isArray(o.seeds) && o.seeds.length,"seeds must be a nonempty array");o.seeds.forEach(n=>integer(n,0,0xffffffff,"seed"));}
 return o;
}
function generateSeeds(count){
 integer(count,1,1000,"runs");
 const seeds=SEEDS.slice(0,count),seen=new Set(seeds);let state=0x4d455445;
 while(seeds.length < count){state=(Math.imul(state,1664525)+1013904223)>>>0;if(!seen.has(state)){seen.add(state);seeds.push(state);}}
 return seeds;
}
function cardCounts(){return { total:0, builds:0, normal:0, extras:0, combos:0, modules:0, patches:0, byTier:{1:0,2:0,3:0} };}
function countCard(counts,c){
 counts.total++;
 if(c.kind === "card"){
  counts.byTier[c.def.lvl]=(counts.byTier[c.def.lvl] || 0)+1;
  counts[c.def.rare ? "extras" : "normal"]++;
 }else if(c.kind === "new")counts.builds++;
 else if(c.kind === "combo")counts.combos++;
 else if(c.kind === "module"){counts.modules++;if(c.modId === "patch")counts.patches++;}
}
function mean(values){const a=values.filter(x=>x!==null && Number.isFinite(x));return a.length ? +(a.reduce((s,v)=>s+v,0)/a.length).toFixed(1) : null;}
function run(seed,policy="smart",options={}){
 const o=optionsWithDefaults({...options,policy});
 assert.ok(POLICIES.includes(policy),"run policy must be smart or first");
 integer(seed,0,0xffffffff,"seed");
 const {game:g}=harness(undefined,seed);
 g.META.music=g.META.sfx=false;
 g.META.unlocked=g.STAGES.length;g.META.selStage=o.stage;g.META.elite=!!o.elite;
 for(const id of Object.keys(g.META.levels))g.META.levels[id]=o.rd;
 g.META.chips.fort=o.fort;
 /* Calibration can override coefficients in memory without changing production sources. */
 if(o.balance)Object.assign(g.BALANCE,o.balance);
 if(o.configure)o.configure(g);
 let endSignal=null,bossKilled=false,maxMeteorUpward=0;
 const waveSpawns={};
 const spawnEnemy=g.spawnEnemy,spawnBoss=g.spawnBoss;
 g.spawnEnemy=function(kind,opts){const made=spawnEnemy(kind,opts);if(made)waveSpawns[kind]=(waveSpawns[kind] || 0)+1;return made;};
 g.spawnBoss=function(){const made=spawnBoss();if(made)waveSpawns.boss=(waveSpawns.boss || 0)+1;return made;};
 const endBattle=g.endBattle,killEnemy=g.killEnemy,stepMove=g.stepMove;
 g.endBattle=function(win){endSignal=!!win;return endBattle(win);};
 g.killEnemy=function(e){if(e.cfg.id === "boss" && !e.dead && e.hp <= 0)bossKilled=true;return killEnemy(e);};
 g.stepMove=function(e,dt){
  const y=e.y,meteor=typeof g.isMeteorEnemy === "function" ? g.isMeteorEnemy(e) : ["meteor","fast","armored","charger"].includes(e.cfg.id);
  const result=stepMove(e,dt);
  if(meteor)maxMeteorUpward=Math.max(maxMeteorUpward,Math.max(0,y-e.y));
  return result;
 };
 /* Use the actual start path so Elite, chip HP and R&D apply exactly as in the UI. */
 g.startBattle();g.startWave(1);
 let steps=0,lastWave=1,hpAt10=null,hpAt20=null,firstShotAt=null,firstShotWave=null,firstRangedHitAt=null;
 const visible={},taken=cardCounts(),offered=cardCounts(),hpAfterWave={};
 const maxSteps=Math.ceil(o.maxSeconds/o.dt)+1000;
 while(!g.B.over && steps++ < maxSteps && g.B.elapsed < o.maxSeconds){
  if(g.B.waveState === "draft"){
   for(const c of g.curCards)countCard(offered,c);
   const c=chooseCard(g.curCards,policy),before=g.B.drafts;countCard(taken,c);g.applyCard(c);
   assert.equal(g.B.drafts,before+1,"a selected draft choice did not apply: "+policy+" seed "+seed);
  }else{
   g.update(o.dt);
   if(firstShotAt === null && g.B.enemyShotsFired > 0){firstShotAt=+g.B.elapsed.toFixed(2);firstShotWave=g.B.wave;}
   if(firstRangedHitAt === null && g.B.enemyShotHits > 0)firstRangedHitAt=+g.B.elapsed.toFixed(2);
   if(g.B.waveState === "fighting"){
    const w=g.B.wave;
    const count=g.B.enemies.filter(e=>!e.dead && e.hp>0 && e.y>=g.VIS_TOP && e.y<=g.BASEY).length;
    const x=visible[w] || (visible[w]={seconds:0,sum:0,peak:0});
    x.seconds+=o.dt;x.sum+=count*o.dt;x.peak=Math.max(x.peak,count);
   }
  }
  assert.ok(Number.isFinite(g.B.baseHp) && Number.isFinite(g.B.elapsed),"nonfinite battle state: "+policy+" seed "+seed);
  if(steps % 40 === 0){
   for(const e of g.B.enemies)assert.ok([e.x,e.y,e.hp,e.maxHp].every(Number.isFinite),"nonfinite enemy state: "+e.cfg.id+" seed "+seed);
   for(const s of g.B.enemyShots || [])assert.ok([s.x,s.y,s.vx,s.vy,s.life].every(Number.isFinite),"nonfinite enemy projectile: seed "+seed);
  }
  if(g.B.wave !== lastWave){
   hpAfterWave[lastWave]=Math.round(g.B.baseHp);
   if(lastWave === 10)hpAt10=Math.round(g.B.baseHp);
   if(lastWave === 20)hpAt20=Math.round(g.B.baseHp);
   lastWave=g.B.wave;
  }
 }
 if(g.B.wave === 10 && hpAt10 === null)hpAt10=Math.round(g.B.baseHp);
 if(g.B.wave === 20 && hpAt20 === null)hpAt20=Math.round(g.B.baseHp);
 const remaining=g.B.enemies.filter(e=>!e.dead && e.hp>0).map(e=>e.cfg.id);
 assert.ok(g.B.over && endSignal !== null,"campaign did not terminate: "+policy+" seed "+seed+" stage "+o.stage+" wave "+g.B.wave+" after "+Math.round(g.B.elapsed)+"s; remaining "+remaining.slice(0,15).join(","));
 assert.equal(maxMeteorUpward,0,"a meteor's own movement went upward (external card knockback is allowed)");
 if(endSignal){
  assert.equal(g.B.wave,g.stageWaves(g.B.stage),"victory before final wave");
  assert.ok(g.B.baseHp > 0 && (bossKilled||(g.B.bossDamage||0)>0),"victory must require a surviving fortress and a resolved boss (killed, or crashed into the base)");
  assert.equal(g.B.bossSpawns,1,"exactly one boss must spawn in a campaign");
  assert.equal(remaining.length,0,"victory with living enemies");
  assert.equal(g.B.enemyShots.length,0,"victory with enemy ammunition still in flight");
 }
 const waveSamples=[...new Set([1,10,20,g.stageWaves(g.B.stage)])];
 const fighters=g.allFighters();
 return {
  seed,policy,stage:o.stage,rd:o.rd,elite:!!o.elite,fort:o.fort,
  win:endSignal === true,bossKilled,bossArrived:(g.B.bossDamage||0)>0,wave:g.B.wave,finalWave:g.stageWaves(g.B.stage),steps,elapsed:Math.round(g.B.elapsed),
  hp:Math.round(g.B.baseHp),hpAt10,hpAt20,hpAfterWave,kills:g.B.kills,leaks:g.B.leaks,
  meteorDamage:Math.round(g.B.meteorDamage || 0),rangedDamage:Math.round(g.B.enemyShotDamage || 0),
  rangedHits:g.B.enemyShotHits || 0,shotsFired:g.B.enemyShotsFired || 0,shotsBlocked:g.B.enemyShotsIntercepted || 0,firstShotAt,firstShotWave,firstRangedHitAt,
  healed:Math.round(g.B.totalHealed),drafts:g.B.drafts,cards:{taken,offered},waveSpawns,
  balance:{enemyHpMul:g.BALANCE.enemyHpMul,waveHpGrowth:g.BALANCE.waveHpGrowth,turretBasePower:g.BALANCE.turretBasePower,
   eliteHp:g.BALANCE.eliteHp,eliteSpeed:g.BALANCE.eliteSpeed,eliteContact:g.BALANCE.eliteContact,
   eliteChampionHp:g.BALANCE.eliteChampionHp,eliteChampionContact:g.BALANCE.eliteChampionContact,eliteBossHp:g.BALANCE.eliteBossHp,...(o.balance || {})},
  opening:JSON.parse(JSON.stringify(g.CAMPAIGN_OPENING || {})),
  build:fighters.map(t=>({unit:t.cfg.id,level:t.runLv,pips:t.pips,dmg:Math.round(t.totalDmg),dps:+(t.totalDmg/Math.max(1,g.B.elapsed)).toFixed(1)})),
  waves:waveSamples.map(w=>({
   wave:w,
   meanAlive:g.B.waveDensity[w] ? +(g.B.waveDensity[w].enemySeconds/g.B.waveDensity[w].seconds).toFixed(1) : null,
   peakAlive:g.B.waveDensity[w]?.peak ?? null,
   meanVisible:visible[w] ? +(visible[w].sum/visible[w].seconds).toFixed(1) : null,
   peakVisible:visible[w]?.peak ?? null
  }))
 };
}
function summarize(runs,policies=POLICIES){
 return policies.map(policy=>{
  const group=runs.filter(r=>r.policy === policy),firstVictory=group.findIndex(r=>r.win);
  const sampled=[...new Set(group.flatMap(r=>r.waves.map(w=>w.wave)))];
  return {
   policy,firstVictory:firstVictory>=0 ? firstVictory+1 : null,wins:group.filter(r=>r.win).length,attempts:group.length,
   firstThree:{attempts:Math.min(3,group.length),wins:group.slice(0,3).filter(r=>r.win).length,seeds:group.slice(0,3).map(r=>r.seed)},
   meanHp10:mean(group.map(r=>r.hpAt10)),meanHp20:mean(group.map(r=>r.hpAt20)),
   meanLeaks:mean(group.map(r=>r.leaks)),meanMeteorDamage:mean(group.map(r=>r.meteorDamage)),meanRangedDamage:mean(group.map(r=>r.rangedDamage)),
   meanHealed:mean(group.map(r=>r.healed)),meanElapsed:mean(group.map(r=>r.elapsed)),meanDrafts:mean(group.map(r=>r.drafts)),
   meanExtras:mean(group.map(r=>r.cards.taken.extras)),meanFirstShotAt:mean(group.map(r=>r.firstShotAt)),
   waves:sampled.map(w=>{
    const values=group.map(r=>r.waves.find(x=>x.wave === w));
    return {wave:w,meanAlive:mean(values.map(x=>x?.meanAlive)),peakAlive:mean(values.map(x=>x?.peakAlive)),
     meanVisible:mean(values.map(x=>x?.meanVisible)),peakVisible:mean(values.map(x=>x?.peakVisible))};
   })
  };
 });
}
function checkBalanceReport(result){
 const triplet=result.report.find(r=>r.policy === "smart")?.firstThree;
 assert.ok(triplet && triplet.attempts === 3,"balance guard requires three smart-policy attempts");
 /* 2026-11-12, owner order: enemies 5x HP, 25% slower, one continuous stream.
    A fresh R&D 1 account no longer wins at all: the measured baseline is 0/3
    (all three seeds die on virtual wave 4 at ~19 s, ~36 leaks). The old 1..2/3
    target is gone — this guard now pins the new reality, so any future
    rebalancing shows up as a change here instead of silent drift. */
 assert.ok(triplet.wins === 0,"fresh Stage 1 balance regression: expected 0 smart wins among fixed seeds 3121,777,42 after the 2026-11-12 owner order; got "+triplet.wins+"/3");
}
function runSuite(options={}){
 const o=optionsWithDefaults(options),seeds=o.seeds || generateSeeds(o.runs),policies=o.policy === "both" ? POLICIES : [o.policy];
 if(o.checkBalance){
  assert.ok(o.stage === 1 && o.rd === 1 && !o.elite && o.fort === 0 && policies.includes("smart"),
   "--check-balance is only for fresh Stage 1 Normal (R&D 1, fort 0), with smart or both policies");
  assert.ok(seeds.length >= 3 && seeds.slice(0,3).every((s,i)=>s === SEEDS[i]),
   "--check-balance requires the unchanged first three seeds: 3121,777,42");
  assert.ok(!o.balance && !o.configure,"--check-balance uses production coefficients and does not accept calibration overrides");
 }
 const runs=[];
 for(const policy of policies)for(const seed of seeds)runs.push(run(seed,policy,o));
 const config={stage:o.stage,rd:o.rd,elite:!!o.elite,fort:o.fort,policies,dt:o.dt,maxSeconds:o.maxSeconds,balance:runs[0].balance,opening:runs[0].opening};
 const result={config,seeds,report:summarize(runs,policies),runs};
 if(o.checkBalance){checkBalanceReport(result);result.balanceGuard="passed: 0/3 smart wins on the fixed fresh-account triplet (2026-11-12 owner order: 5x HP, continuous stream);";}
 return result;
}
function parseArgs(args){
 const options={};
 for(let i=0;i<args.length;i++){
  const [flag,inline]=args[i].split("=",2);
  if(flag === "--help" || flag === "-h"){options.help=true;continue;}
  if(flag === "--check-balance"){assert.equal(inline,undefined,"--check-balance takes no value");options.checkBalance=true;continue;}
  if(flag === "--elite"){assert.ok(inline === undefined || inline === "true" || inline === "false","--elite accepts true or false");options.elite=inline !== "false";continue;}
  const key={"--runs":"runs","--stage":"stage","--rd":"rd","--fort":"fort","--policy":"policy","--seeds":"seeds","--max-seconds":"maxSeconds"}[flag];
  assert.ok(key,"unknown option: "+flag);
  const raw=inline === undefined ? args[++i] : inline;
  assert.ok(raw !== undefined && !raw.startsWith("--"),"missing value for "+flag);
  if(key === "seeds")assert.ok(raw.split(",").every(x=>x.trim() !== ""),"seed list contains an empty entry");
  options[key]=key === "policy" ? raw : key === "seeds" ? raw.split(",").map(Number) : Number(raw);
 }
 return options;
}
if(require.main === module){
 try{
  const options=parseArgs(process.argv.slice(2));
  if(options.help)console.log("Usage: node tests/balance.cjs [--runs 3|12|72] [--seeds 3121,777,42] [--stage 1..12] [--rd 1..45] [--fort 0..5] [--elite] [--policy smart|first|both] [--max-seconds 2400] [--check-balance]\n--check-balance: require 0 smart wins on the unchanged fresh Normal Stage 1 triplet (3121,777,42) — the measured baseline after the 2026-11-12 owner order (5x HP, continuous stream).\nDefaults: Stage 1, R&D 1, no chips, Normal, 12 fixed seeds for both policies.");
  else console.log(JSON.stringify(runSuite(options),null,2));
 }catch(error){console.error(error.stack || error);process.exitCode=1;}
}
module.exports={harness,chooseCard,run,runSuite,summarize,generateSeeds,parseArgs,checkBalanceReport,SEEDS,POLICIES,DEFAULTS};
