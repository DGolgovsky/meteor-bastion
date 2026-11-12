"use strict";
const assert=require("node:assert/strict");
const {harness,chooseCard}=require("./balance.cjs");

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
function runAttempt(g,seed,attempt,sig,policy){
 const dt=.05,maxSeconds=2400,maxSteps=Math.ceil(maxSeconds/dt)+1000;
 const previous=g.B;g.startBattle();
 assert.notEqual(g.B,previous,"the attempt must start a new, paid battle");
 g.startWave(1);
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
  let now=g.META.lastEnergyAt;
  g.Date={now:()=>now};
  const sig={win:null};
  const endBattle=g.endBattle;
  g.endBattle=function(win){sig.win=!!win;return endBattle(win);};
  const entry={seed:seed,attempts:[],firstWin:null,finalLevels:{}};
  for(let a=1;a<=attempts;a++){
   sig.win=null;
   /* Elapsed battle time and any wait for entry energy use the game's refill clock. */
   g.refillEnergy();
   if(g.META.energy<g.BATTLE_ENERGY_COST)now=g.META.lastEnergyAt+(g.BATTLE_ENERGY_COST-g.META.energy)*g.ENERGY_REGEN_MS;
   const att=runAttempt(g,seed,a,sig,"smart");
   now+=Math.round(g.B.elapsed*1000);
   if(!att.win){
    const dmgById={};
    att.fighters.forEach(function(f){dmgById[f.id]=f.dmg;});
    att.bought=buyUpgrades(g,dmgById);
   }
   att.levelsAfter=JSON.parse(JSON.stringify(g.META.levels));
   att.coinsAfter=g.META.coins;
   att.matsAfter=JSON.parse(JSON.stringify(g.META.mats));
   entry.attempts.push(att);
   if(att.win){entry.firstWin=a;break;}
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
