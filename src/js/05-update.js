/* ---------- update ---------- */
/* No intrinsic enemy flight ever moves upward. Knockback and Gravity are external forces. */
function stepMove(e,dt){
 /* The Hive Tyrant does not hold a firing station: it descends on the fortress
    (2026-11-12, owner order). If it arrives, it deals 90% of base max HP. */
 if(e.kind==="boss"){
  var bspeed=e.baseSpeed===undefined?e.speed:e.baseSpeed;
  var bvy=(e.paralyzeT>0||e.immobT>0)?0:Math.max(0,bspeed*(e.slowFactor===undefined?1:e.slowFactor)*(e.hasteT>0?BALANCE.eliteAuraSpeed:1));
  e.vy=bvy;e.y+=bvy*dt;e.x+=Math.sin(B.t*.9+(e.phase||0))*12*dt;
  e.x=Math.max(e.r,Math.min(W-e.r,e.x));return;
 }
 if(!isMeteorEnemy(e)){stepInsectMove(e,dt);return;}
 var type=e.moveKind||(e.cfg&&e.cfg.id)||e.kind;
 var speed=e.baseSpeed===undefined?e.speed:e.baseSpeed;
 var mul=1+.15*Math.sin(B.t*.9+(e.speedPhase||0)),vx=0,dir=e.driftDir||1;
 if(type==="armored")mul=1+.05*Math.sin(B.t+e.phase);
 else if(type==="meteor")vx=Math.sin(B.t*.9+e.phase)*18;
 else if(type==="fast"){
  e.driftT=(e.driftT||1.6)-dt;if(e.driftT<=0){e.driftDir=-dir;dir=e.driftDir;e.driftT=1.2+Math.random()*.8;}
  mul=Math.sin(B.t*4+e.speedPhase)>.5?1.3:.8;
  vx=dir*speed*.38;
 } else if(type==="charger"){mul=e.chargeRemaining>0?1:.7;vx=e.chargeRemaining>0?(W/2>e.x?1:-1)*speed*.3:0;}
 /* Paralyze / Immobilize: the enemy stops completely */
 if(e.paralyzeT>0||e.immobT>0){mul=0;vx=0;}
 var vy=Math.max(0,speed*mul*e.slowFactor*(e.chargeMul||1)*(e.hasteT>0?BALANCE.eliteAuraSpeed:1));
 if(type==="fast")vy*=.91;
 if(speed<=0)vx=0;
 var oldY=e.y;e.vx=vx;e.vy=vy;e.y+=vy*dt;e.x+=vx*dt;
 if(e.x<e.r||e.x>W-e.r){e.x=Math.max(e.r,Math.min(W-e.r,e.x));e.driftDir=-(e.driftDir||1);}
 B.maxUpwardOwn=Math.max(B.maxUpwardOwn||0,Math.max(0,oldY-e.y));
}

/* Insects approach a per-enemy firing station, then strafe without diving into
   the deck. Knockback/gravity can displace them; they must approach again. */
function stepInsectMove(e,dt){
 initEnemyStation(e);
 /* Only an external pull or a legacy/manual spawn can put an insect below its
    station. Correct deck overshoot before recording intrinsic motion: it is not
    a spontaneous upward flight, and a displaced shooter never occupies the bunker.
    The dome is the boundary (2026-11-12, owner order): it never sits inside it. */
 var cap=Math.min(BASEY-60,domeY(e.x)-(e.r||0));
 if(e.y>cap)e.y=cap;
 var speed=e.baseSpeed===undefined?e.speed:e.baseSpeed,stopped=e.paralyzeT>0||e.immobT>0;
 var sf=stopped?0:Math.max(0,e.slowFactor===undefined?1:e.slowFactor),gap=Math.max(0,e.standY-e.y);
 var vy=Math.max(0,(speed||0)*sf*(e.hasteT>0?BALANCE.eliteAuraSpeed:1));
 if(dt>0)vy=Math.min(vy,gap/dt);else vy=0;
 var anchored=gap<8,target=e.standX+Math.sin(B.t*(e.cfg.id==="needle"?.7:1.1)+(e.phase||0))*18;
 var vx=stopped?0:anchored?Math.max(-24,Math.min(24,(target-e.x)*1.8))*sf:Math.sin(B.t*.9+(e.phase||0))*Math.min(18,(speed||0)*.2)*sf;
 var oldY=e.y,oldX=e.x;e.y+=vy*dt;e.x=Math.max(e.r,Math.min(W-e.r,e.x+vx*dt));
 e.vx=dt>0?(e.x-oldX)/dt:0;e.vy=vy;e.hoverT=anchored?1:0;
 B.maxUpwardOwn=Math.max(B.maxUpwardOwn||0,Math.max(0,oldY-e.y));
}
/* The dome is the fortress boundary (2026-11-12, owner order): enemies impact
   on its surface and never pass behind it. domeY(x) is the upper edge of the
   dome ellipse at that x; the enemy's leading (bottom) edge touches it. */
function domeY(x){
 var q=(x-W/2)/FORTRESS.domeRx;
 return FORTRESS.deckY-FORTRESS.domeRy*Math.sqrt(Math.max(0,1-q*q));
}
function hitFortress(amount,kind,x){
 if(B.over||!(amount>0))return;
 if(kind==="meteor"){B.leaks++;B.meteorDamage=(B.meteorDamage||0)+amount;}
 else if(kind==="boss"){B.bossDamage=(B.bossDamage||0)+amount;}
 else {B.enemyShotHits=(B.enemyShotHits||0)+1;B.enemyShotDamage=(B.enemyShotDamage||0)+amount;}
 B.baseHp=Math.max(0,B.baseHp-amount);B.baseFlashT=.12;B.baseHitTextT=.2;B.shake=Math.min(12,B.shake+(kind==="boss"?10:kind==="meteor"?5:2));
 burst(x,BASEY,kind==="boss"?26:kind==="meteor"?14:5,"#ff5470");
 if(kind==="meteor"||kind==="boss")SFX.boom();
 if(B.baseHp<=0)endBattle(false);
}
function fireEnemyVolley(e,p){
 var shots=B.enemyShots||(B.enemyShots=[]),created=0;
 var pressure=1+Math.min(.6,Math.max(0,(e.siegeAge||0)-20)*.01);
 for(var i=0;i<p.burst&&shots.length<ENEMY_SHOT_CAP;i++){
  var x=e.x,y=Math.min(BASEY-36,e.y+e.r+2),tx=Math.max(16,Math.min(W-16,e.attackAimX+(i-(p.burst-1)/2)*(p.spread||0))),ty=e.attackAimY;
  var dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1;
  shots.push({x:x,y:y,vx:dx/d*p.speed,vy:dy/d*p.speed,r:p.r,hp:p.hp,damage:e.dmg*p.mul*pressure,
   kind:p.kind,color:p.color,life:8,dead:false,source:e,aimX:tx,aimY:ty});created++;
 }
 B.enemyShotsFired=(B.enemyShotsFired||0)+created;
 if(created)e.attackVolley=(e.attackVolley||0)+1;
 return created;
}
function stepEnemyAttack(e,dt){
 if(isMeteorEnemy(e))return;initEnemyStation(e);
 var p=enemyAttackProfile(e);
 if(e.y<e.standY-8){e.attackState="approach";e.attackCharge=0;return;}
 e.siegeAge+=dt;
 if(e.paralyzeT>0||e.immobT>0){e.attackState="stunned";e.attackCharge=0;return;}
 /* Slowing a shooter also delays its windup and reload, not only its flight. */
 var tempo=Math.max(.2,e.slowFactor===undefined?1:e.slowFactor)*(e.hasteT>0?BALANCE.eliteAuraSpeed:1);
 if(e.attackState==="charge"){
  e.attackCharge+=dt*tempo;
  if(e.attackCharge>=e.attackWindup){
   if(fireEnemyVolley(e,p)){e.attackState="recover";e.attackCharge=0;e.attackCd=p.cd;}
   else e.attackCharge=e.attackWindup;
  }
 }else{
  e.attackState="recover";e.attackCd-=dt*tempo;
  if(e.attackCd<=0){
   /* The visible aiming line and volley share a locked impact point. */
   e.attackAimX=Math.max(24,Math.min(W-24,e.x+(W/2-e.x)*.32+Math.sin((e.phase||0)+(e.attackVolley||0)*2.3)*28));
   e.attackAimY=BASEY-16;e.attackCharge=0;e.attackWindup=p.windup;e.attackState="charge";
   if(e.kind==="phase"){e.cloakT=0;e.revealedT=Math.max(e.revealedT||0,p.windup+.15);}
  }
 }
}
/* Shooting ammunition grants no kill, healing or battle points. */
function interceptEnemyShot(shot,damage){
 if(!shot||shot.dead||shot.hp<=0||!(damage>0))return false;
 shot.hp-=damage;
 if(shot.hp<=0){shot.dead=true;B.enemyShotsIntercepted=(B.enemyShotsIntercepted||0)+1;return true;}
 return false;
}
/* Player rounds and hostile ammunition travel during the same time step.
   Record hostile displacement once so every interception sees the same path. */
function prepareEnemyShots(dt){
 for(var i=0;i<B.enemyShots.length;i++){
  var s=B.enemyShots[i];
  if(s.dead||s.hp<=0||s.life<=0)continue;
  var slow=1;
  /* Disruption offers projectile cover as well as slowing the shooters. */
  for(var k=0;k<B.fields.length;k++){
   var f=B.fields[k];if(f.kind==="slow"&&f.life>0&&Math.hypot(s.x-f.x,s.y-f.y)<=f.r){slow=.5;break;}
  }
  s.stepX=s.vx*dt*slow;s.stepY=s.vy*dt*slow;
  s.stepLimit=dt>0?Math.min(1,s.life/dt):1;
  var gap=BASEY-16-s.y;
  s.hitsBase=gap<=0||(s.stepY>0&&s.stepY*s.stepLimit>=gap);
  if(s.hitsBase)s.stepLimit=gap<=0?0:gap/s.stepY;
 }
}
function resolveEnemyShots(dt){
 var shots=B.enemyShots;
 for(var i=shots.length-1;i>=0;i--){
  var s=shots[i];
  if(s.dead||s.hp<=0||s.life<=0){shots.splice(i,1);continue;}
  s.x+=s.stepX*s.stepLimit;s.y+=s.stepY*s.stepLimit;s.life-=dt;
  if(s.hitsBase){shots.splice(i,1);hitFortress(s.damage,"ranged",s.x);if(B.over)return;}
  else if(s.life<=0||s.x<-20||s.x>W+20||s.y<-40)shots.splice(i,1);
 }
}

function update(dt){
 B.t+=dt;B.elapsed+=dt;
 B.baseFlashT=Math.max(0,(B.baseFlashT||0)-dt);B.baseHitTextT=Math.max(0,(B.baseHitTextT||0)-dt);
 if(B.waveState==="intro"){B.introT-=dt;if(B.introT<=0)startWave(1);syncHud();return;}
 /* Groups are atomic: at the enemy cap they wait rather than losing members.
    One continuous stream (2026-11-12, owner order): every spawn also drains the
    stage queue; when a virtual wave's queue empties while the stream remains,
    the next one starts silently — no pause, no draft, no wave shown. */
 if(B.waveQueue>0){
  B.spawnT-=dt;B.formationCd=Math.max(0,(B.formationCd||0)-dt);
  var opening=campaignOpening(B.stage,B.wave,B.elite);
  /* Enemy count ramps with stream progress (2026-11-12, owner order): the stream
     starts gentle — about 4-6 enemies on the field — and the spawn pace grows to
     full pressure by the end. progress 0 → 5x slower spawning, 1 → current pace. */
  var progress=B.stageTotal>0?Math.max(0,Math.min(1,1-B.stageQueue/B.stageTotal)):0;
  var rampMul=1+4*(1-progress);
  var interval=Math.max(BALANCE.spawnMin,BALANCE.spawnBase-B.wave*BALANCE.spawnReduction)*opening.spawn*rampMul;
  if(B.spawnT<=0){
   var n=0;
   if(B.formationCd<=0&&B.waveQueue>=3){n=spawnWaveGroup();if(n>0)B.formationCd=BALANCE.formationCd*opening.spawn*rampMul;}
   else if(spawnEnemy(wavePickKind()))n=1;
   if(n>0){B.waveQueue-=n;B.stageQueue-=n;}
   B.spawnT=n>0?interval*(.7+Math.random()*.6):.16;
  }
 }
 if(B.waveState==="fighting"&&B.waveQueue<=0&&B.stageQueue>0)startWave(B.wave+1);
 /* The boss joins at 60% of the stage stream (2026-11-12, owner order): once 60%
    of the stream has spawned, the Tyrant descends on the fortress. Never lose it
    when the enemy cap is reached: the block retries every frame until it spawns. */
 if(!B.bossSpawned&&B.stageTotal>0&&B.stageQueue<=B.stageTotal*0.4){
   if(spawnBoss())B.bossSpawned=true;
 }
 /* enemies */
 for(var i=B.enemies.length-1;i>=0;i--){
   var e=B.enemies[i];
   if(e.dead){B.enemies.splice(i,1);continue;}
   if(e.burnT>0){
     var burnHit=Math.min(e.hp,e.burnDps*Math.min(dt,e.burnT));
     e.hp-=burnHit;if(e.burnSource)e.burnSource.totalDmg+=burnHit;
     if(Math.random()<dt*6)B.parts.push({x:e.x,y:e.y,vx:0,vy:-40,life:0.3,t:0,color:"#ff8a3c",r:2});
     if(e.hp<=0){e.lastSrc=e.burnSource;e.lastKind="burn";killEnemy(e);B.enemies.splice(i,1);continue;}
     e.burnT=Math.max(0,e.burnT-dt);
     if(e.burnT===0){e.burnDps=0;e.burnSource=null;}
   }
   if(e.slowT>0){e.slowT-=dt;if(e.slowT<=0){e.slowFactor=1;e.stasisSlow=0;}}
   /* card statuses (03b-effects.js) */
   if(e.paralyzeT>0){e.paralyzeT-=dt;
     if(e.paraShockSrc){e.paraShockT-=dt;if(e.paraShockT<=0){e.paraShockT=1;smallStrike(e.paraShockSrc,e.x,e.paraShockSrc.cfg.damage*0.5);}}
     if(e.paralyzeT<=0)e.paraShockSrc=null;}
   if(e.immobT>0)e.immobT-=dt;
   if(e.paraImmuneT>0)e.paraImmuneT-=dt;
   if(e.physVulnT>0)e.physVulnT-=dt;
   if(e.disrT>0){e.disrT-=dt;if(e.disrT<=0)e.disr=0;}
   if(e.thunderChainT>0){e.thunderChainT-=dt;e.tcCd=(e.tcCd||0)-dt;}
   if(e.dead||e.hp<=0){if(!e.dead)killEnemy(e);B.enemies.splice(i,1);continue;}
   /* the regeneration star heals nearby enemies (support, like the Rejuvenation Star) */
   if(e.kind==="healer"&&!e.dead){
     e.healT-=dt;
     if(e.healT<=0){e.healT=2.2;
       B.enemies.forEach(function(o){if(o!==e&&!o.dead&&o.hp>0&&o.hp<o.maxHp&&Math.hypot(o.x-e.x,o.y-e.y)<=95){o.hp=Math.min(o.maxHp,o.hp+o.maxHp*0.06);beamFx(e.x,e.y,o.x,o.y,"#4ade80",1.5);}});
       ringFx(e.x,e.y,"#4ade80",95);
     }
   }
   if(e.revealedT>0)e.revealedT=Math.max(0,e.revealedT-dt);
   if(e.vulnerableT>0){e.vulnerableT-=dt;if(e.vulnerableT<=0)e.vulnerableStacks=0;}
   if(e.kind==="phase"){
     e.cloakCooldown=(e.cloakCooldown===undefined?3.0:e.cloakCooldown)-dt;
     if(e.revealedT>0){e.cloakT=0;e.cloakCooldown=Math.max(e.cloakCooldown,1.8);}
     else if(e.cloakT>0)e.cloakT=Math.max(0,e.cloakT-dt);
     else if(e.cloakCooldown<=0){e.cloakT=1.8;e.cloakCooldown=5.0;}
   }
   if(e.kind==="charger"){
     e.chargeT=(e.chargeT===undefined?2.4:e.chargeT)-dt;
     if(e.chargeT<=0){e.chargeT=4.6;e.chargeRemaining=0.8;}
     if(e.chargeRemaining>0){e.chargeRemaining=Math.max(0,e.chargeRemaining-dt);e.chargeMul=1.6;}
     else e.chargeMul=1;
   }
   if(e.flash>0)e.flash-=dt;
   if(e.cfg&&e.cfg.id==="healer"&&e.hoverT>0&&Math.random()<dt*3&&B.parts.length<250)B.parts.push({x:e.x,y:e.y-e.r,vx:0,vy:-12,life:.35,t:0,color:"#4ade80",r:1.5});
   if(e.hasteT>0)e.hasteT=Math.max(0,e.hasteT-dt);
   if(B.elite&&e.champion&&e.kind!=="boss"&&e.y>0){
     e.auraT-=dt;
     if(e.auraT<=0){
       e.auraT=3.6;
       B.enemies.forEach(function(o){
         if(o!==e&&!o.dead&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<100)o.hasteT=Math.max(o.hasteT||0,1.6);
       });
       ringFx(e.x,e.y,"#d977fa",140);
     }
   }
   e.phase+=dt*3;
   stepMove(e,dt);
   if(isMeteorEnemy(e)){if(B.parts.length<250&&Math.random()<dt*9)B.parts.push({x:e.x+(Math.random()*8-4),y:e.y-e.r,life:0.32,t:0,vx:Math.random()*14-7,vy:-46-Math.random()*30,color:Math.random()<0.5?WEAPON_COLOR.skyguard:"#76e7ff",r:2+Math.random()*2});}
   if(e.kind==="boss"&&e.y+e.r>=domeY(e.x)){
     /* The Tyrant reached the fortress: 90% of base max HP (2026-11-12, owner order).
        No score or kill credit — this is a base hit, not a kill. */
     e.dead=true;B.enemies.splice(i,1);
     hitFortress(Math.floor(0.9*B.baseMax),"boss",e.x);if(B.over)return;
   }else if(isMeteorEnemy(e)&&e.y+e.r>=domeY(e.x)){
     e.dead=true;B.enemies.splice(i,1);B.waveKilled++;
     hitFortress(e.dmg,"meteor",e.x);if(B.over)return;
   }else stepEnemyAttack(e,dt);
 }
 /* Time-weighted enemy occupancy per wave, for headless calibration. */
 if(B.waveState==="fighting"&&B.wave>0){
  var density=B.waveDensity[B.wave]||(B.waveDensity[B.wave]={seconds:0,enemySeconds:0,peak:0});
  density.seconds+=dt;density.enemySeconds+=B.enemies.length*dt;density.peak=Math.max(density.peak,B.enemies.length);
 }
 /* Guardian movement at a capped velocity, while auto-firing. */
 if(B.soldier&&B.guardianGoalX!==undefined){var delta=B.guardianGoalX-B.soldier.x;B.soldier.x+=Math.max(-480*dt,Math.min(480*dt,delta));}
 /* units */
 allFighters().forEach(function(t){t.recoil=Math.max(0,(t.recoil||0)-66*dt);unitFire(t,dt);});
 /* Persistent multi-hit wasps, retargeting instead of exploding at first contact. */
 for(var j=B.drones.length-1;j>=0;j--){
   var dr=B.drones[j];dr.life-=dt;
   if(dr.life<=0){waspDies(dr);B.drones.splice(j,1);continue;}
   dr.hitT=Math.max(0,dr.hitT-dt);
   if(!waspCanTarget(dr.tgt)||B.enemies.indexOf(dr.tgt)<0)dr.tgt=pickDroneTarget(dr);
   if(dr.launchT>0){
     /* launch phase: the wasp flies outward from the turret; the target is reassigned if it died */
     dr.launchT-=dt;dr.x+=dr.vx*dt;dr.y+=dr.vy*dt;
     if(Math.random()<dt*15)B.parts.push({x:dr.x,y:dr.y+3,vx:0,vy:12,life:0.22,t:0,color:WEAPON_COLOR.hive,r:1.5});
     continue;
   }
   if(dr.tgt){
    var dx=dr.tgt.x-dr.x,dy=dr.tgt.y-dr.y,a=Math.atan2(dy,dx),travel=240*dt;
    if(dx*dx+dy*dy<=travel*travel){dr.x=dr.tgt.x;dr.y=dr.tgt.y;}
    else {dr.x+=Math.cos(a)*travel;dr.y+=Math.sin(a)*travel;
     /* flutter: a perpendicular weave so wasps do not fly straight like projectiles (owner order 2026-11-12) */
     var wob=Math.sin(B.t*9+(dr.phase||0))*45*dt;
     dr.x+=-Math.sin(a)*wob;dr.y+=Math.cos(a)*wob;}
    if(Math.random()<dt*15)B.parts.push({x:dr.x,y:dr.y+3,vx:0,vy:12,life:0.22,t:0,color:WEAPON_COLOR.hive,r:1.5});
    /* the wasp strikes while UNDER the enemy: touching its bottom edge */
    if(dr.hitT<=0&&dr.y>=dr.tgt.y&&Math.hypot(dr.tgt.x-dr.x,dr.tgt.y-dr.y)<dr.tgt.r+4){
      if(waspSting(dr)){waspDies(dr);B.drones.splice(j,1);continue;}
      dr.lastTgt=dr.tgt;
      dr.x+=Math.cos(a+Math.PI)*14;dr.y+=Math.sin(a+Math.PI)*14;
      dr.tgt=null;
    }
   }else dr.y=Math.max(VIS_TOP+8,dr.y-35*dt);
 }
 /* Bouncing Firewheel drones (and mini Firewheels): each foe can be hit repeatedly, 0.3 s per target. */
 for(var wi=B.wheels.length-1;wi>=0;wi--){
   var wheel=B.wheels[wi];
   if(stepWheel(wheel,dt)){
     B.wheels.splice(wi,1);
     /* the main disc is gone: the Firewheel cooldown starts now (Killing Charge shortens it, max 5 s) */
     if(!wheel.mini&&wheel.src.cfg.id==="firewheel"){var ws=wheel.src;ws.cd=Math.max(0,2*ws.metaCd/ws.haste-(ws.chargeCut||0));ws.chargeCut=0;}
   }
 }
 /* fields: Disruption, gravity, black holes, Electric Matrices, fire trails */
 for(var fi=B.fields.length-1;fi>=0;fi--){
   var field=B.fields[fi];field.age=(field.age||0)+dt;field.life-=dt;field.tick-=dt;
   stepField(field,dt);
   if(field.life<=0){
     if(field.kind==="slow"&&field.src.finalBlast)explodeAt(field.src,field.x,field.y,field.r*1.2,field.src.cfg.damage*2*(field.dmgScale||1),{kind:"field",dtype:"force"},WEAPON_COLOR.disruption);
     if(field.kind==="gravity")endGravityField(field);
     B.fields.splice(fi,1);
   }
 }
 updateEffects(dt);
 /* projectiles */
 prepareEnemyShots(dt);
 var intersections=[];
 for(var q=B.projs.length-1;q>=0;q--){
   var pr=B.projs[q];
   if(pr.life<=0){B.projs.splice(q,1);continue;}
   var flightTime=Math.min(dt,pr.life),frameFraction=dt>0?flightTime/dt:1;
   pr.life-=dt;
   /* Sky Guard rockets home in on their target */
   if(pr.src.cfg.effect==="rocket"&&!pr.kind){
     if(!pr.tgt||pr.tgt.hp<=0||pr.tgt.dead)pr.tgt=pickTarget(pr.src);
     if(pr.tgt){var sp=pr.src.cfg.projSpeed,ca=Math.atan2(pr.vy,pr.vx),wa=Math.atan2(pr.tgt.y-pr.y,pr.tgt.x-pr.x),df=wa-ca;
       while(df>Math.PI)df-=Math.PI*2;while(df<-Math.PI)df+=Math.PI*2;
       var rturn=Math.max(-3.6*flightTime,Math.min(3.6*flightTime,df));ca+=rturn;pr.vx=Math.cos(ca)*sp;pr.vy=Math.sin(ca)*sp;}
     /* Fire Transmission: missiles ignite the enemies they fly through */
     if(pr.src.fireTrans){var bl=pr.burned||(pr.burned=[]);
       B.enemies.forEach(function(en){if(onField(en)&&bl.indexOf(en)<0&&Math.hypot(en.x-pr.x,en.y-pr.y)<=en.r+8){bl.push(en);igniteE(pr.src,en,pr.src.cfg.damage);}});}
   }
   var p0x=pr.x,p0y=pr.y;
   pr.x+=pr.vx*flightTime;pr.y+=pr.vy*flightTime;
   /* Piercing Ricochet / Reflection Boost: bounce off the side walls and the top of the field */
   if(pr.ricochet>0&&(pr.x<4||pr.x>W-4||pr.y<VIS_TOP)){
     if(pr.x<4||pr.x>W-4)pr.vx*=-1;else pr.vy*=-1;
     pr.x=Math.max(4,Math.min(W-4,pr.x));pr.y=Math.max(VIS_TOP,pr.y);pr.ricochet--;pr.hitSet=pr.hitSet.slice(-1);pr.life=Math.max(pr.life,0.8);
   }
   /* Field Replication: a Railgun shell entering a Disruption Field for the first time gains +1 parallel shell */
   if(pr.rail&&!pr.kind&&!pr.replicated){
     for(var rf=0;rf<B.fields.length;rf++){var fd=B.fields[rf];
       if(fd.kind==="slow"&&fd.src.fieldReplication&&Math.hypot(pr.x-fd.x,pr.y-fd.y)<=fd.r){
         pr.replicated=true;
         if(B.projs.length<FX_CAP.projs){var sl=Math.hypot(pr.vx,pr.vy)||1;
           B.projs.push({x:pr.x-pr.vy/sl*7,y:pr.y+pr.vx/sl*7,vx:pr.vx,vy:pr.vy,src:pr.src,dmg:pr.dmg,pierce:pr.pierce,hitSet:pr.hitSet.slice(),life:pr.life,tgt:null,rail:true,replicated:true,ricochet:pr.ricochet||0});}
         break;}}
   }
   /* trail history for rendering only (x,y,t triplets), pruned by AGE; consumes no RNG */
   var trh=pr.tr||(pr.tr=[p0x,p0y,B.t-flightTime]),trn=trh.length;
   if(trn>=6&&Math.abs(trh[trn-6]-pr.x)+Math.abs(trh[trn-5]-pr.y)<3){trh[trn-3]=pr.x;trh[trn-2]=pr.y;trh[trn-1]=B.t;}
   else trh.push(pr.x,pr.y,B.t);
   while(trh.length>6&&B.t-trh[5]>PROJ_TRAIL_T)trh.splice(0,3);
   if(!pr.kind&&B.parts.length<300){
    if(pr.src.cfg.effect==="rocket"&&Math.random()<dt*55)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*16-8,vy:Math.random()*16-8,life:0.26,t:0,color:Math.random()<0.5?WEAPON_COLOR.skyguard:"#76e7ff",r:2.2});
    if(pr.src.cfg.effect==="charge"&&Math.random()<dt*50)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*14-7,vy:Math.random()*14-7,life:.065,t:0,color:WEAPON_COLOR.tesla,r:1.2});
    if(pr.src.cfg.id==="railgun"&&Math.random()<dt*60)B.parts.push({x:pr.x,y:pr.y,vx:0,vy:0,life:0.22,t:0,color:WEAPON_COLOR.railgun,r:2});
    if(pr.src.cfg.id==="disruption"&&Math.random()<dt*30)B.parts.push({x:pr.x,y:pr.y,vx:0,vy:0,life:0.25,t:0,color:WEAPON_COLOR.disruption,r:1.8});
    if(pr.src.cfg.id==="aeroblast"&&Math.random()<dt*36)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*16-8,vy:Math.random()*16-8,life:0.3,t:0,color:WEAPON_COLOR.aeroblast,r:2});
   }
   var dead=pr.life<=0||pr.x<-20||pr.x>W+20||pr.y<-30||pr.y>H+20;
   intersections.length=0;
   B.enemies.forEach(function(en){
     if(en.hp<=0||en.dead||pr.hitSet.indexOf(en)>=0)return;
     var hitAt=sweptContact(p0x,p0y,pr.x,pr.y,en.x,en.y,en.r+5);
     if(hitAt!==null)intersections.push({enemy:en,at:hitAt});
   });
   B.enemyShots.forEach(function(shot){
     if(shot.dead||shot.hp<=0||shot.life<=0||pr.hitSet.indexOf(shot)>=0)return;
     var at=sweptContact(p0x,p0y,pr.x-shot.stepX*frameFraction,pr.y-shot.stepY*frameFraction,shot.x,shot.y,shot.r+3);
     if(at!==null&&at*frameFraction<=shot.stepLimit)intersections.push({shot:shot,at:at});
   });
   if(intersections.length>1)intersections.sort(function(a,b){return a.at-b.at;});
   for(var h=0;h<intersections.length;h++){
     var hostile=intersections[h].shot;
     if(hostile){
      if(hostile.dead||hostile.hp<=0)continue;
      pr.hitSet.push(hostile);interceptEnemyShot(hostile,pr.dmg*(pr.src.dmgMul||1)*(B.allDmgMul||1));
      if(pr.pierce>0){pr.pierce--;continue;}dead=true;break;
     }
     var en=intersections[h].enemy;
     if(en.dead||en.hp<=0)continue;
     pr.hitSet.push(en);
     /* Path Strike: a missile deals impact damage to enemies on its path and flies on to its target */
     if(pr.src.pathStrike&&pr.src.cfg.effect==="rocket"&&!pr.kind&&!pr.mini&&aliveE(pr.tgt)&&en!==pr.tgt){
       dealDamage(pr.src,en,pr.dmg*0.55*(pr.src.impactMul||1),{kind:"rocket",burn:!!pr.src.rocketBurn});continue;
     }
     applyHit(pr,en);SFX.hit();
     if(pr.pierce>0)pr.pierce--;
     else if(pr.bounce>0){
       /* Bouncing Barrage: the pellet bounces to the nearest other enemy */
       var nb=nearestList(en.x,en.y,1,170,pr.hitSet)[0];
       if(nb){pr.bounce--;var bsp=Math.hypot(pr.vx,pr.vy),ba=Math.atan2(nb.y-en.y,nb.x-en.x);pr.x=en.x;pr.y=en.y;pr.vx=Math.cos(ba)*bsp;pr.vy=Math.sin(ba)*bsp;pr.tgt=nb;pr.life=Math.max(pr.life,0.6);dead=false;break;}
       dead=true;break;
     }else{dead=true;break;}
   }
   if(dead)B.projs.splice(q,1);
 }
 resolveEnemyShots(dt);if(B.over)return;
 B.beams=B.beams.filter(function(b){b.t+=dt;return b.t<b.life;});
 B.parts=B.parts.filter(function(pt){pt.t+=dt;pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;return pt.t<pt.life;});
 B.rings=B.rings.filter(function(r){r.t+=dt;r.r+=r.vr*dt;return r.t<r.life;});
 B.nums=B.nums.filter(function(n){n.t+=dt;n.y-=26*dt;return n.t<0.85;});
 if(B.shake>0)B.shake=Math.max(0,B.shake-dt*26);
 /* The stage is one continuous stream: it ends only when the whole stream has
    spawned, the boss is dead and the field is clear (no wave pauses, no wave drafts).
    Outstanding hostile ammunition still delays the end, like the field itself. */
 if(B.waveState==="fighting"&&B.stageQueue<=0&&B.waveQueue<=0&&B.enemies.length===0&&!(B.enemyShots&&B.enemyShots.length)&&!B.over){
   if(!B.bossSpawned)return;endBattle(true);return;
 }
 /* a card from accumulated points: the draft opens right in the middle of a wave */
 if(B.waveState==="fighting"&&B.pendingDrafts>0&&!B.over){
   B.draftReturn="fighting";openDraft();
 }
 syncHud();
}
function battleRunning(){return B&&!B.paused&&!B.over&&B.waveState!=="draft";}
function loop(ts){
 raf=null;
 if(!B)return;
 var raw=Math.max(0,Math.min(0.05,(ts-lastTs)/1000));lastTs=ts;
 try{
  if(battleRunning())update(raw*B.speed);
  draw();
 }catch(err){
  /* A single bad frame used to kill the loop forever: the next RAF was
     scheduled only after update+draw returned, so the field froze on the
     last good frame with no error visible (reported 2026-11-09; the HUD,
     drawn last in draw(), was missing from the frozen frame). Keep the loop
     alive and surface the error instead of dying silently. */
  B.loopError=String(err&&err.stack||err);
  try{console.error(err);}catch(e){}
  try{showLoopError(B.loopError);}catch(e){}
 }
 if(battleRunning())requestBattleFrame();
}

