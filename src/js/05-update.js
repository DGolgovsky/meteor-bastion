/* ---------- update ---------- */
/* No intrinsic enemy flight ever moves upward. Knockback and Gravity are external forces. */
function stepMove(e,dt){
 var type=e.moveKind||(e.cfg&&e.cfg.id)||e.kind;
 var speed=e.baseSpeed===undefined?e.speed:e.baseSpeed;
 var mul=1+.15*Math.sin(B.t*.9+(e.speedPhase||0)),vx=0,dir=e.driftDir||1;
 if(type==="armored")mul=1+.05*Math.sin(B.t+e.phase);
 else if(type==="splitter")mul=1;
 else if(type==="meteor")vx=Math.sin(B.t*.9+e.phase)*18;
 else if(type==="fast"){
  e.driftT=(e.driftT||1.6)-dt;if(e.driftT<=0){e.driftDir=-dir;dir=e.driftDir;e.driftT=1.2+Math.random()*.8;}
  mul=Math.sin(B.t*4+e.speedPhase)>.5?1.3:.8;
  vx=dir*speed*.38;
 }else if(type==="mini"){mul=1.15;vx=dir*speed*.50;}
 else if(type==="flyer")vx=Math.sin(B.t*1.4+e.phase)*35;
 else if(type==="healer"){mul=.9;vx=Math.sin(B.t*.5+e.phase)*12;}
 else if(type==="elite"){mul=1+.2*Math.sin(B.t*.9+e.speedPhase);vx=dir*speed*.27;}
 else if(type==="phase"){mul=e.cloakT>0?1.25:1;vx=e.cloakT>0?dir*speed*.48:Math.sin(B.t*1.5+e.phase)*25;}
 else if(type==="charger"){mul=e.chargeRemaining>0?1:.7;vx=e.chargeRemaining>0?(W/2>e.x?1:-1)*speed*.3:0;}
 else if(type==="boss"){mul=1;vx=dir*speed*.16;e.driftT=(e.driftT||5)-dt;if(e.driftT<=0){e.driftDir=-dir;e.driftT=4+Math.random()*2;}}
 e.hoverCd=(e.hoverCd===undefined?4:e.hoverCd)-dt;
 var maxHover=type==="healer"?3:2,canHover=["flyer","healer","elite","boss"].indexOf(type)>=0;
 if(canHover&&e.hoverT<=0&&e.hoverCd<=0&&e.hoverCount<maxHover&&e.y>150&&e.y<450){
  e.hoverT=type==="healer"?1.5+Math.random():type==="boss"?1+Math.random()*.5:.6+Math.random()*.6;
  e.hoverCount++;e.hoverCd=type==="boss"?8+Math.random()*2:type==="healer"?3+Math.random():4+Math.random()*2;
 }
 if(e.hoverT>0){e.hoverT=Math.max(0,e.hoverT-dt);mul=0;vx=0;}
 /* Paralyze / Immobilize: the enemy stops completely */
 if(e.paralyzeT>0||e.immobT>0){mul=0;vx=0;}
 var vy=Math.max(0,speed*mul*e.slowFactor*(e.chargeMul||1)*(e.hasteT>0?BALANCE.eliteAuraSpeed:1));
 if(["fast","mini","elite","phase","boss"].indexOf(type)>=0)vy*=.91;
 if(speed<=0)vx=0;
 var oldY=e.y;e.vx=vx;e.vy=vy;e.y+=vy*dt;e.x+=vx*dt;
 if(e.x<e.r||e.x>W-e.r){e.x=Math.max(e.r,Math.min(W-e.r,e.x));e.driftDir=-(e.driftDir||1);}
 B.maxUpwardOwn=Math.max(B.maxUpwardOwn||0,Math.max(0,oldY-e.y));
}

function update(dt){
 B.t+=dt;B.elapsed+=dt;
 B.baseFlashT=Math.max(0,(B.baseFlashT||0)-dt);B.baseHitTextT=Math.max(0,(B.baseHitTextT||0)-dt);
 if(B.waveState==="intro"){B.introT-=dt;if(B.introT<=0)startWave(1);syncHud();return;}
 /* Groups are atomic: at the enemy cap they wait rather than losing members. */
 if(B.waveQueue>0){
  B.spawnT-=dt;B.formationCd=Math.max(0,(B.formationCd||0)-dt);
  var interval=Math.max(BALANCE.spawnMin,BALANCE.spawnBase-B.wave*BALANCE.spawnReduction);
  if(B.spawnT<=0){
   var n=0;
   if(B.formationCd<=0&&B.waveQueue>=3){n=spawnWaveGroup();if(n>0)B.formationCd=BALANCE.formationCd;}
   else if(spawnEnemy(wavePickKind()))n=1;
   if(n>0)B.waveQueue-=n;
   B.spawnT=n>0?interval*(.7+Math.random()*.6):.16;
  }
 }
 /* Never lose the boss when the enemy cap is reached or the spawn queue empties. */
 if(B.wave===finalWave()&&!B.bossSpawned&&B.waveQueue<=Math.floor(B.waveTotal/2)){
   if(spawnBoss())B.bossSpawned=true;
 }
 /* enemies */
 for(var i=B.enemies.length-1;i>=0;i--){
   var e=B.enemies[i];
   if(e.dead){B.enemies.splice(i,1);continue;}
   if(e.burnT>0){e.burnT-=dt;var burnHit=Math.min(e.hp,e.burnDps*dt);e.hp-=burnHit;if(e.burnSource)e.burnSource.totalDmg+=burnHit;
     /* the burn has ended, so reset its DPS: otherwise a stale strong burn would override any weaker ignite later */
     if(e.burnT<=0){e.burnDps=0;e.burnSource=null;}if(Math.random()<dt*6)B.parts.push({x:e.x,y:e.y,vx:0,vy:-40,life:0.3,t:0,color:"#ff8a3c",r:2});if(e.hp<=0){killEnemy(e);B.enemies.splice(i,1);continue;}}
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
   if(e.cfg.id==="meteor"||e.cfg.id==="fast"||e.cfg.id==="armored"||e.cfg.id==="mini"){if(B.parts.length<250&&Math.random()<dt*9)B.parts.push({x:e.x+(Math.random()*8-4),y:e.y-e.r,life:0.32,t:0,vx:Math.random()*14-7,vy:-46-Math.random()*30,color:Math.random()<0.5?"#ff8a3c":"#ffb03c",r:2+Math.random()*2});}
   if(e.y>=BASEY-16){
     e.dead=true;B.enemies.splice(i,1);B.waveKilled++;B.leaks++;
     B.baseHp-=e.dmg;B.baseFlashT=0.12;B.baseHitTextT=0.2;B.shake=Math.min(12,B.shake+5);burst(e.x,BASEY,14,"#ff5470");SFX.boom();
     if(B.baseHp<=0){B.baseHp=0;endBattle(false);return;}
   }
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
   var dr=B.drones[j];dr.life-=dt;dr.hitT=Math.max(0,dr.hitT-dt);
   if(dr.launchT>0){
     /* launch phase: the wasp flies outward from the turret; the target is reassigned if it died */
     if(!dr.tgt||dr.tgt.hp<=0||dr.tgt.dead||B.enemies.indexOf(dr.tgt)<0)dr.tgt=pickDroneTarget(dr);
     dr.launchT-=dt;dr.x+=dr.vx*dt;dr.y+=dr.vy*dt;
     if(Math.random()<dt*15)B.parts.push({x:dr.x,y:dr.y+3,vx:0,vy:12,life:0.22,t:0,color:"#facc15",r:1.5});
     if(dr.life<=0){waspDies(dr);B.drones.splice(j,1);}
     continue;
   }
   if(!dr.tgt||dr.tgt.hp<=0||dr.tgt.dead||B.enemies.indexOf(dr.tgt)<0)dr.tgt=pickDroneTarget(dr);
   if(dr.tgt){
    var a=Math.atan2(dr.tgt.y-dr.y,dr.tgt.x-dr.x);
    dr.x+=Math.cos(a)*240*dt;dr.y+=Math.sin(a)*240*dt;
    if(Math.random()<dt*15)B.parts.push({x:dr.x,y:dr.y+3,vx:0,vy:12,life:0.22,t:0,color:"#facc15",r:1.5});
    /* the wasp strikes while UNDER the enemy: touching its bottom edge */
    if(dr.hitT<=0&&dr.y>=dr.tgt.y&&Math.hypot(dr.tgt.x-dr.x,dr.tgt.y-dr.y)<dr.tgt.r+4){
      if(waspSting(dr)){waspDies(dr);B.drones.splice(j,1);continue;}
      dr.x+=Math.cos(a+Math.PI)*14;dr.y+=Math.sin(a+Math.PI)*14;
      dr.tgt=null;
    }
   }else dr.y-=35*dt;
   if(dr.life<=0){waspDies(dr);B.drones.splice(j,1);}
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
     if(field.kind==="slow"&&field.src.finalBlast)explodeAt(field.src,field.x,field.y,field.r*1.2,field.src.cfg.damage*2*(field.dmgScale||1),{kind:"field"},"#38c8ff");
     if(field.kind==="gravity")endGravityField(field);
     B.fields.splice(fi,1);
   }
 }
 updateEffects(dt);
 /* projectiles */
 for(var q=B.projs.length-1;q>=0;q--){
   var pr=B.projs[q];pr.life-=dt;
   /* Sky Guard rockets home in on their target */
   if(pr.src.cfg.effect==="rocket"&&!pr.kind){
     if(!pr.tgt||pr.tgt.hp<=0||pr.tgt.dead)pr.tgt=pickTarget(pr.src);
     if(pr.tgt){var sp=pr.src.cfg.projSpeed,ca=Math.atan2(pr.vy,pr.vx),wa=Math.atan2(pr.tgt.y-pr.y,pr.tgt.x-pr.x),df=wa-ca;
       while(df>Math.PI)df-=Math.PI*2;while(df<-Math.PI)df+=Math.PI*2;
       var rturn=Math.max(-3.6*dt,Math.min(3.6*dt,df));ca+=rturn;pr.vx=Math.cos(ca)*sp;pr.vy=Math.sin(ca)*sp;}
     /* Fire Transmission: missiles ignite the enemies they fly through */
     if(pr.src.fireTrans){var bl=pr.burned||(pr.burned=[]);
       B.enemies.forEach(function(en){if(onField(en)&&bl.indexOf(en)<0&&Math.hypot(en.x-pr.x,en.y-pr.y)<=en.r+8){bl.push(en);igniteE(pr.src,en,pr.src.cfg.damage);}});}
   }
   var p0x=pr.x,p0y=pr.y;
   pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;
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
   var trh=pr.tr||(pr.tr=[]),trn=trh.length;
   if(trn>=6&&Math.abs(trh[trn-6]-pr.x)+Math.abs(trh[trn-5]-pr.y)<3){trh[trn-3]=pr.x;trh[trn-2]=pr.y;trh[trn-1]=B.t;}
   else trh.push(pr.x,pr.y,B.t);
   while(trh.length>6&&B.t-trh[5]>PROJ_TRAIL_T)trh.splice(0,3);
   if(!pr.kind&&B.parts.length<300){
    if(pr.src.cfg.effect==="rocket"&&Math.random()<dt*55)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*16-8,vy:Math.random()*16-8,life:0.26,t:0,color:Math.random()<0.5?"#ff8a3c":"#ffb03c",r:2.2});
    if(pr.src.cfg.effect==="charge"&&Math.random()<dt*50)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*14-7,vy:Math.random()*14-7,life:0.24,t:0,color:"#a06bff",r:1.9});
    if(pr.src.cfg.id==="railgun"&&Math.random()<dt*60)B.parts.push({x:pr.x,y:pr.y,vx:0,vy:0,life:0.22,t:0,color:"#f472b6",r:2});
    if(pr.src.cfg.id==="disruption"&&Math.random()<dt*30)B.parts.push({x:pr.x,y:pr.y,vx:0,vy:0,life:0.25,t:0,color:"#38c8ff",r:1.8});
    if(pr.src.cfg.id==="aeroblast"&&Math.random()<dt*36)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*16-8,vy:Math.random()*16-8,life:0.3,t:0,color:"#7dd7ff",r:2});
   }
   var dead=pr.life<=0||pr.x<-20||pr.x>W+20||pr.y<-30||pr.y>H+20;
   if(pr.life>0){
     var intersections=[];
     B.enemies.forEach(function(en){
       if(en.hp<=0||en.dead||pr.hitSet.indexOf(en)>=0)return;
       var hitAt=sweptContact(p0x,p0y,pr.x,pr.y,en.x,en.y,en.r+5);
       if(hitAt!==null)intersections.push({enemy:en,at:hitAt});
     });
     intersections.sort(function(a,b){return a.at-b.at;});
     for(var h=0;h<intersections.length;h++){
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
         if(nb){pr.bounce--;var bsp=Math.hypot(pr.vx,pr.vy),ba=Math.atan2(nb.y-en.y,nb.x-en.x);pr.x=en.x;pr.y=en.y;pr.vx=Math.cos(ba)*bsp;pr.vy=Math.sin(ba)*bsp;pr.tgt=nb;pr.life=Math.max(pr.life,0.6);break;}
         dead=true;break;
       }else{dead=true;break;}
     }
   }
   if(dead)B.projs.splice(q,1);
 }
 B.beams=B.beams.filter(function(b){b.t+=dt;return b.t<b.life;});
 B.parts=B.parts.filter(function(pt){pt.t+=dt;pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;return pt.t<pt.life;});
 B.rings=B.rings.filter(function(r){r.t+=dt;r.r+=r.vr*dt;return r.t<r.life;});
 B.nums=B.nums.filter(function(n){n.t+=dt;n.y-=26*dt;return n.t<0.85;});
 if(B.shake>0)B.shake=Math.max(0,B.shake-dt*26);
 /* wave clear? A wave by itself NO longer grants cards:
    the next wave starts immediately, and the draft opens only from points */
 if(B.waveState==="fighting"&&B.waveQueue<=0&&B.enemies.length===0&&!B.over){
   if(B.wave>=finalWave()){if(!B.bossSpawned)return;endBattle(true);return;}
   if(B.pendingDrafts>0){B.waveState="draft";B.draftReturn="nextwave";openDraft();}
   else startWave(B.wave+1);
   syncHud();return;
 }
 /* a card from accumulated points: the draft opens right in the middle of a wave */
 if(B.waveState==="fighting"&&B.pendingDrafts>0&&!B.over){
   B.waveState="draft";B.draftReturn="fighting";openDraft();
 }
 syncHud();
}
function loop(ts){
 if(!B)return;
 var raw=Math.max(0,Math.min(0.05,(ts-lastTs)/1000));lastTs=ts;
 try{
  if(!B.paused&&!B.over&&!$("ov-levelup").classList.contains("on"))update(raw*B.speed);
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
 raf=requestAnimationFrame(loop);
}

