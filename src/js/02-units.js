/* ==================== BATTLE ==================== */
var cv=$("cv"),ctx=cv.getContext("2d");
/* ---------- Резкость поля: рендер в нативном разрешении экрана ----------
   Раньше бэкстор канваса был жёстко забит в 420×700 px, а CSS растягивал его
   на всю ширину экрана. На Google Pixel 10a (панель 1080×2424, DPR ≈ 2,625,
   CSS-ширина ≈ 412 px) полю достаётся ~400 CSS-px ширины, т.е. ~1050 физических
   пикселей — картинка 420 px растягивалась в ~2,5 раза, отсюда «мыло».
   Это НЕ ограничение платформы: вся графика поля — векторная (canvas-фигуры
   и текст), поэтому достаточно рендерить её сразу в физических пикселях.
   fitCanvas() ставит canvas.width = CSS-ширина × DPR (DPR ограничен 3 ради
   производительности), а draw() масштабирует контекст так, что игровая логика
   по-прежнему работает в координатах 420×700. Подбор автоматический — под
   Pixel 10a даёт ~1050×1750, на других устройствах — их нативное разрешение. */
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
 return {cfg:cfg,x:x,y:LINE_Y,slot:(slot===undefined?-1:slot),isSoldier:!!isSoldier,runLv:1,cd:Math.random()*0.2,laserActive:0,laserTickT:0,angle:-Math.PI/2,recoil:0,
  metaCd:metaCooldown(lv),durationMul:secondary,dmgMul:metaDamage(lv),haste:1,extraProj:0,
  pierce:(cfg.effect==="pierce"?3:0)+(cfg.id==="railgun"?Math.floor((secondary-1)*5):0),
  chain:(cfg.effect==="chain"?2:0)+(cfg.id==="thunder"?Math.floor((secondary-1)*2):0),
  splash:(area[cfg.effect]||0)*secondary,critBonus:0,slowPow:0.35,totalDmg:0,mods:[],
  beamSplit:false,reflect:0,refract:false,hiveDouble:false,burnMul:1,multiCount:3,knock:16,
  laserTicks:0,laserTickT:0,laserTarget:null,beamTicks:0,beamTickT:0,beamTarget:null,beamRamp:0,
  chargeT:0,hiveCount:3,hiveAttacks:Math.round(7*secondary),wheelHits:Math.round(50*secondary),
  laserDeflect:0,laserSweep:0,teslaMatrix:false,teslaMatrixPlus:false,teslaChargeBonus:0,fireTrail:false};
}
function newBattle(stage){
 return {stage:stage,t:0,elapsed:0,speed:1,paused:false,over:false,elite:!!stage.elite,championsKilled:0,championsSpawned:0,guardianGoalX:SOLDIER_X,
  baseHp:1000,baseMax:1000,shield:150,shieldMax:150,
  wave:0,waveQueue:0,waveTotal:0,waveKilled:0,spawnT:0,bossSpawned:false,
  kills:0,reroll:true,turrets:[],soldier:null,usedTypes:{},
  /* Очки боя: убийства копят очки, карточка выдаётся при достижении порога.
     Баланс порогов: 2, 10, 18, 26… (+8 к стоимости каждой следующей карточки) —
     как в оригинале, первая карточка приходит уже после второго монстра
     (первые враги волны 1 — метеориты по 1 очку), дальше темп ровный. */
  score:0,scoreTotal:0,draftNeed:BALANCE.draftFirst,draftsEarned:0,pendingDrafts:0,draftReturn:"fighting",totalHealed:0,
  enemies:[],projs:[],beams:[],parts:[],nums:[],drones:[],rings:[],wheels:[],fields:[],
  shake:0,pendingSuper:[],drafts:0,waveState:"intro",introT:1.2,
  allDmgMul:1,enemySpdMul:1,combos:{},modulesUsed:{}};
}
function startBattle(){refillEnergy();
 if(META.energy<5){toast("Недостаточно энергии: +1 каждые 12 минут.");return;}
 META.energy-=5;if(META.energy===25)META.lastEnergyAt=Date.now();persist();
 var st=STAGES[META.selStage-1];
 var eff={n:st.n,name:(META.elite?"Elite":"Normal")+" Stage "+st.n,
   elite:!!META.elite,hpMul:st.hpMul*(META.elite?BALANCE.eliteHp:1),spdMul:st.spdMul*(META.elite?BALANCE.eliteSpeed:1),
   contactMul:META.elite?BALANCE.eliteContact:1,desc:st.desc};
 B=newBattle(eff);B.elite=META.elite;
 B.soldier=mkUnit(SOLDIER_CFG,SOLDIER_X,-1,true);
 show("battle");fitCanvas();startMusic();
 lastTs=performance.now();
 if(raf)cancelAnimationFrame(raf);
 raf=requestAnimationFrame(loop);
 toast("Веди Guardian свайпом по нижней части поля. Убийства дают карточки и +2 HP.");
}
$("btn-start").addEventListener("click",startBattle);
/* Guardian moves horizontally on the fortress deck. Touch/mouse controls are relative to canvas pixels. */
var guardianPointerId=null;
function guardianPointerX(ev){var rc=cv.getBoundingClientRect();return Math.max(22,Math.min(W-22,(ev.clientX-rc.left)/rc.width*W));}
cv.addEventListener("pointerdown",function(ev){
 if(!B||B.over||B.paused||B.waveState==="draft")return;
 var rc=cv.getBoundingClientRect();if((ev.clientY-rc.top)/rc.height<0.73)return;
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

