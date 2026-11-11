/* ==================== BATTLE ==================== */
var cv=$("cv"),ctx=cv.getContext("2d");
/* ---------- Field sharpness: render at the screen's native resolution ----------
   The canvas backing store used to be hard-coded at 420×700 px, and CSS stretched it
   across the full screen width. On a Google Pixel 10a (1080×2424 panel, DPR ≈ 2.625,
   CSS width ≈ 412 px) the field gets ~400 CSS px of width, i.e. ~1050 physical
   pixels, so the 420 px image was stretched ~2.5×, hence the blur.
   This is NOT a platform limitation: all field graphics are vector (canvas shapes
   and text), so it is enough to render them directly in physical pixels.
   fitCanvas() sets canvas.width = CSS width × DPR (DPR is capped at 3 for
   performance), and draw() scales the context so the game logic
   still works in W×H logical coordinates. The fit is automatic: on a
   phone it fits the available viewport without stretching the logical field. */
var RENDER_SCALE=1;
function fitCanvas(){
  var dpr=Math.min(window.devicePixelRatio||1,3);
  var cssW=cv.clientWidth||0;
  if(!cssW&&cv.parentElement)cssW=cv.parentElement.clientWidth||0;
  if(!cssW)cssW=Math.max(280,Math.min(window.innerWidth||420,460)-12);
  var targetW=Math.round(cssW*dpr);
  var targetH=Math.round(targetW*H/W);
  if(cv.width!==targetW||cv.height!==targetH){cv.width=targetW;cv.height=targetH;}
  RENDER_SCALE=cv.width/W;
}
var fitT=null;
window.addEventListener("resize",function(){clearTimeout(fitT);fitT=setTimeout(fitCanvas,80);});
window.addEventListener("orientationchange",function(){setTimeout(fitCanvas,80);setTimeout(fitCanvas,320);});
var B=null, raf=null, lastTs=0;
function mkUnit(cfg,x,slot,isSoldier){
 var lv=META.levels[cfg.id],secondary=metaSecondary(lv),area={rocket:32,charge:42,knockback:40,slow:34};
 return {cfg:cfg,x:x,y:LINE_Y,slot:(slot===undefined?-1:slot),isSoldier:!!isSoldier,runLv:1,pips:0,cards:{},cd:Math.random()*0.2,laserActive:0,angle:-Math.PI/2,recoil:0,handAlt:false,
  metaCd:metaCooldown(lv),durationMul:secondary,dmgMul:metaDamage(lv)*(isSoldier?1:BALANCE.turretBasePower)*(isSoldier?1:1+0.03*META.chips.core),haste:1+0.02*META.chips.speed,extraProj:0,
  pierce:(cfg.effect==="pierce"?3:0)+(cfg.id==="railgun"?Math.floor((secondary-1)*5):0),
  chain:(cfg.effect==="chain"?2:0)+(cfg.id==="thunder"?Math.floor((secondary-1)*2):0),
  splash:(area[cfg.effect]||0)*secondary,critBonus:0,slowPow:0.35,totalDmg:0,mods:[],
  beamSplit:false,reflect:0,refract:false,hiveDouble:false,burnMul:1,multiCount:3,knock:12,aeroPellets:5,
  laserTicks:0,laserTickT:0,laserTarget:null,beamTicks:0,beamTickT:0,beamTarget:null,beamRamp:0,
  chargeT:0,hiveCount:3,hiveAttacks:Math.round(7*secondary),wheelHits:Math.round(50*secondary),gravityRadius:Math.round(70*secondary),gravityPull:65,gravityDuration:3.5,gravityPower:1.0,
  laserDeflect:0,laserSweep:0,beamRefractions:0,teslaMatrix:false,teslaMatrixPlus:false,teslaChargeBonus:0,fireTrail:false,wheelMax:1};
}
function newBattle(stage){
 return {stage:stage,t:0,elapsed:0,speed:1,paused:false,over:false,elite:!!stage.elite,championsKilled:0,championsSpawned:0,guardianGoalX:SOLDIER_X,
  baseHp:1000+40*META.chips.fort,baseMax:1000+40*META.chips.fort,
  wave:0,waveQueue:0,waveTotal:0,waveKilled:0,spawnT:0,bossSpawned:false,
  kills:0,reroll:true,turrets:[],soldier:null,usedTypes:{},
  /* Battle points: kills accumulate points, and a card is granted when a threshold is reached.
     Opening costs: 2, 4, 6, 9; later costs grow with drafts and cleared waves;
     as in the original, the first card arrives right after the second monster
     (the first enemies of wave 1 are meteors worth 1 point each), then the pace slows with the waves. */
  score:0,scoreTotal:0,draftNeed:BALANCE.draftFirst,draftsEarned:0,pendingDrafts:0,draftReturn:"fighting",totalHealed:0,
  enemies:[],projs:[],beams:[],parts:[],nums:[],drones:[],rings:[],wheels:[],fields:[],
  shake:0,baseFlashT:0,baseHitTextT:0,waveDensity:{},maxUpwardOwn:0,picked:[],drafts:0,waveState:"intro",introT:1.2,
  allDmgMul:1,enemySpdMul:1,combos:{},modulesUsed:{},bossSpawns:0,leaks:0,stageWaveCount:stageWaves(stage)};
}
function startBattle(){refillEnergy();
 if(META.energy<5)return;
 META.energy-=5;if(META.energy===25)META.lastEnergyAt=Date.now();persist();
 var st=STAGES[META.selStage-1];
 var eff={n:st.n,name:(META.elite?"Elite":"Normal")+" Stage "+st.n,
   elite:!!META.elite,waves:stageWaves(st),hpMul:st.hpMul*(META.elite?BALANCE.eliteHp:1),spdMul:st.spdMul*(META.elite?BALANCE.eliteSpeed:1),
   contactMul:META.elite?BALANCE.eliteContact:1,desc:st.desc};
 B=newBattle(eff);B.elite=META.elite;
 /* a new battle always starts at ×1: reset the button (the "×2" label used to survive between battles) and any "stuck" pointer */
 var spd=$("btn-speed");spd.textContent="×1";spd.classList.toggle("on",false);guardianPointerId=null;
 B.soldier=mkUnit(SOLDIER_CFG,SOLDIER_X,-1,true);
 show("battle");fitCanvas();startMusic();
 lastTs=performance.now();
 if(raf)cancelAnimationFrame(raf);
 raf=requestAnimationFrame(loop);
}
$("btn-start").addEventListener("click",startBattle);
/* Guardian moves horizontally on the fortress deck. Touch/mouse controls are relative to canvas pixels. */
var guardianPointerId=null;
function guardianPointerX(ev){var rc=cv.getBoundingClientRect();return Math.max(22,Math.min(W-22,(ev.clientX-rc.left)/rc.width*W));}
cv.addEventListener("pointerdown",function(ev){
 if(!B||B.over||B.paused||B.waveState==="draft")return;
 var rc=cv.getBoundingClientRect();if((ev.clientY-rc.top)/rc.height*H<BASEY-165)return;
 guardianPointerId=ev.pointerId;B.guardianGoalX=guardianPointerX(ev);
 if(cv.setPointerCapture)cv.setPointerCapture(ev.pointerId);ev.preventDefault();
});
cv.addEventListener("pointermove",function(ev){
 if(!B||ev.pointerId!==guardianPointerId||B.paused||B.over)return;
 B.guardianGoalX=guardianPointerX(ev);ev.preventDefault();
});
["pointerup","pointercancel","lostpointercapture"].forEach(function(name){
 cv.addEventListener(name,function(ev){if(ev.pointerId===guardianPointerId)guardianPointerId=null;});
});

function allFighters(){return B.turrets.concat([B.soldier]);}

