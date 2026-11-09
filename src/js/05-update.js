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
   if(B.formationCd<=0&&B.waveQueue>=3){n=spawnWaveGroup();if(n>0)B.formationCd=4;}
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
     /* ожог кончился — сбросить DPS: иначе устаревший сильный ожог перебивал бы любой более слабый поджог позже */
     if(e.burnT<=0){e.burnDps=0;e.burnSource=null;}if(Math.random()<dt*6)B.parts.push({x:e.x,y:e.y,vx:0,vy:-40,life:0.3,t:0,color:"#ff8a3c",r:2});if(e.hp<=0){killEnemy(e);B.enemies.splice(i,1);continue;}}
   if(e.slowT>0){e.slowT-=dt;if(e.slowT<=0)e.slowFactor=1;}
   /* звезда регенерации лечит соседних врагов (поддержка, как Rejuvenation Star) */
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
 allFighters().forEach(function(t){unitFire(t,dt);});
 /* Persistent multi-hit wasps, retargeting instead of exploding at first contact. */
 for(var j=B.drones.length-1;j>=0;j--){
   var dr=B.drones[j];dr.life-=dt;dr.hitT=Math.max(0,dr.hitT-dt);
   if(dr.launchT>0){
     /* фаза вылета: оса летит наружу от турели, самонаведение ещё не включено,
        но цель уже переназначается, если первая погибла, — после вылета оса
        сразу летит к живой цели, а не тратит время на перевыбор */
     if(!dr.tgt||dr.tgt.hp<=0||dr.tgt.dead||B.enemies.indexOf(dr.tgt)<0)dr.tgt=pickDroneTarget(dr);
     dr.launchT-=dt;dr.x+=dr.vx*dt;dr.y+=dr.vy*dt;
     if(Math.random()<dt*15)B.parts.push({x:dr.x,y:dr.y+3,vx:0,vy:12,life:0.22,t:0,color:"#facc15",r:1.5});
     if(dr.life<=0)B.drones.splice(j,1);
     continue;
   }
   if(!dr.tgt||dr.tgt.hp<=0||dr.tgt.dead||B.enemies.indexOf(dr.tgt)<0)dr.tgt=pickDroneTarget(dr);
   if(dr.tgt){
    var a=Math.atan2(dr.tgt.y-dr.y,dr.tgt.x-dr.x);
    dr.x+=Math.cos(a)*240*dt;dr.y+=Math.sin(a)*240*dt;
    if(Math.random()<dt*15)B.parts.push({x:dr.x,y:dr.y+3,vx:0,vy:12,life:0.22,t:0,color:"#facc15",r:1.5});
    /* оса бьёт, находясь ПОД врагом: касание нижней кромки (дистанция до центра
       меньше радиуса врага + 4), а не долёт до его центра */
    if(dr.hitT<=0&&dr.y>=dr.tgt.y&&Math.hypot(dr.tgt.x-dr.x,dr.tgt.y-dr.y)<dr.tgt.r+4){
      dealDamage(dr.src,dr.tgt,dr.src.cfg.damage*0.65*dr.boost,dr.src.hiveBurn?{burn:true}:{});
      /* Swarm Echo T1–T3: an ordinary wasp that kills an enemy releases one echo.
         Echo wasps never multiply again, avoiding an exponential swarm. */
      if(dr.tgt.dead&&dr.src.hiveEcho&&!dr.isEcho&&!dr.echoed&&B.drones.length<90){
        dr.echoed=true;
        var power=dr.src.hiveEcho===1?0.5:dr.src.hiveEcho===2?0.75:1;
        B.drones.push({x:dr.x,y:dr.y,src:dr.src,life:6.5,tgt:null,
          hitT:0,hits:Math.max(2,Math.ceil(dr.src.hiveAttacks*0.65)),boost:power,
          isEcho:true,echoed:true,launchT:0});
      }
      dr.hits--;dr.hitT=0.26;
      dr.x+=Math.cos(a+Math.PI)*14;dr.y+=Math.sin(a+Math.PI)*14;
      burst(dr.x,dr.y,3,"#facc15");
      if(dr.hits<=0){B.drones.splice(j,1);continue;}
      dr.tgt=null;
    }
   }else dr.y-=35*dt;
   if(dr.life<=0)B.drones.splice(j,1);
 }
 /* Bouncing Firewheel drones: each foe can be hit repeatedly, with a per-target interval. */
 for(var wi=B.wheels.length-1;wi>=0;wi--){
   var wheel=B.wheels[wi];wheel.life-=dt;
   var wx0=wheel.x,wy0=wheel.y;
   var nextTarget=pickDroneTarget({x:wheel.x,y:wheel.y});
   if(nextTarget){
     var curr=Math.atan2(wheel.vy,wheel.vx),wanted=Math.atan2(nextTarget.y-wheel.y,nextTarget.x-wheel.x);
     var turn=Math.atan2(Math.sin(wanted-curr),Math.cos(wanted-curr));
     curr+=Math.max(-1.15*dt,Math.min(1.15*dt,turn));
     wheel.vx=Math.cos(curr)*wheel.speed;wheel.vy=Math.sin(curr)*wheel.speed;
   }
   wheel.x+=wheel.vx*dt;wheel.y+=wheel.vy*dt;
   if(wheel.x<14||wheel.x>W-14){wheel.x=Math.max(14,Math.min(W-14,wheel.x));wheel.vx*=-1;wheel.bounces++;}
   if(wheel.y<88||wheel.y>BASEY-38){wheel.y=Math.max(88,Math.min(BASEY-38,wheel.y));wheel.vy*=-1;wheel.bounces++;}
   var bonus=1+Math.min(0.6,wheel.bounces*0.1);
   B.enemies.forEach(function(e){
    if(e.dead||e.hp<=0||sweptContact(wx0,wy0,wheel.x,wheel.y,e.x,e.y,e.r+14)===null)return;
    var prev=wheel.last.has(e)?wheel.last.get(e):-99;
    if(B.t-prev<0.3)return;
    wheel.last.set(e,B.t);wheel.hits++;
    dealDamage(wheel.src,e,wheel.src.cfg.damage*1.15*bonus,{burn:true});
    if(wheel.src.fireTrail&&B.fields.length<48)B.fields.push({kind:"firetrail",x:wheel.x,y:wheel.y,r:23,life:1.1,src:wheel.src,tick:0.15});
    if(wheel.hits%20===0){ringFx(wheel.x,wheel.y,"#ff8a3c",100);B.enemies.forEach(function(o){if(!o.dead&&o.hp>0&&Math.hypot(o.x-wheel.x,o.y-wheel.y)<=45)dealDamage(wheel.src,o,wheel.src.cfg.damage*2,{});});}
   });
   if(wheel.life<=0)B.wheels.splice(wi,1);
 }
 /* Tesla matrices and Disruption fields. Pulses stop when the field expires. */
 for(var fi=B.fields.length-1;fi>=0;fi--){
   var field=B.fields[fi];field.age=(field.age||0)+dt;field.life-=dt;field.tick-=dt;
   if(field.kind==="gravity"){
     B.enemies.forEach(function(e){
       if(e.dead||e.hp<=0)return;
       var dx=field.x-e.x,dy=field.y-e.y,d=Math.hypot(dx,dy);
       if(d>=field.r||d<4)return;
       var strength=field.pull*(1-d/field.r)*(e.kind==="boss"?0.20:e.champion?0.48:1);
       e.x=Math.max(e.r,Math.min(W-e.r,e.x+dx/d*strength*dt));
       /* нижняя граница VIS_TOP держит врага под HUD, но не должна «телепортировать» вниз
          только что появившегося (y<VIS_TOP): для него пол — его текущая высота */
       e.y=Math.min(BASEY-20,Math.max(Math.min(e.y,VIS_TOP),e.y+dy/d*strength*dt*0.28));
     });
   }
   if(field.tick<=0){
    field.tick+=field.kind==="gravity"?0.5:field.kind==="matrix"?0.45:0.4;
    B.enemies.forEach(function(e){
      if(e.dead||e.hp<=0||Math.hypot(e.x-field.x,e.y-field.y)>field.r)return;
      if(field.kind==="slow"){e.slowFactor=Math.min(e.slowFactor,1-(field.src.slowPow||0.35));e.slowT=0.65;if(field.src.fieldExpose){e.vulnerableStacks=Math.min(3,(e.vulnerableStacks||0)+1);e.vulnerableT=3;}}
      else if(field.kind==="gravity")dealDamage(field.src,e,field.src.cfg.damage*0.65*(field.power||1),{vulnerable:!!field.src.gravityShred});
      else if(field.kind==="firetrail")dealDamage(field.src,e,field.src.cfg.damage*0.23,{burn:true});
      else{dealDamage(field.src,e,field.src.cfg.damage*(field.src.teslaMatrixPlus?0.95:0.65),{});
        if(field.src.teslaThunder&&Math.random()<0.25){e.slowFactor=Math.min(e.slowFactor,0.65);e.slowT=Math.max(e.slowT,0.7);}
      }
    });
   }
   if(field.life<=0)B.fields.splice(fi,1);
 }
 /* projectiles */
 for(var q=B.projs.length-1;q>=0;q--){
   var pr=B.projs[q];pr.life-=dt;
   /* ракеты Sky Guard самонаводятся на цель */
   if(pr.src.cfg.effect==="rocket"){
     if(!pr.tgt||pr.tgt.hp<=0||pr.tgt.dead)pr.tgt=pickTarget(pr.src);
     if(pr.tgt){var sp=pr.src.cfg.projSpeed,ca=Math.atan2(pr.vy,pr.vx),wa=Math.atan2(pr.tgt.y-pr.y,pr.tgt.x-pr.x),df=wa-ca;
       while(df>Math.PI)df-=Math.PI*2;while(df<-Math.PI)df+=Math.PI*2;
       var rturn=Math.max(-3.6*dt,Math.min(3.6*dt,df));ca+=rturn;pr.vx=Math.cos(ca)*sp;pr.vy=Math.sin(ca)*sp;}
   }
   var p0x=pr.x,p0y=pr.y;
   pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;
   if(pr.src.cfg.effect==="rocket"&&Math.random()<dt*55)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*16-8,vy:Math.random()*16-8,life:0.26,t:0,color:Math.random()<0.5?"#ff8a3c":"#ffb03c",r:2.2});
   if(pr.src.cfg.effect==="charge"&&Math.random()<dt*50)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*14-7,vy:Math.random()*14-7,life:0.24,t:0,color:"#a06bff",r:1.9});
   /* следы снарядов — у каждого типа свой */
   if(pr.src.cfg.id==="firewheel"&&Math.random()<dt*46)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*20-10,vy:Math.random()*20-10,life:0.28,t:0,color:Math.random()<0.5?"#ff8a3c":"#ffb03c",r:2.4});
   if(pr.src.cfg.id==="railgun"&&Math.random()<dt*60)B.parts.push({x:pr.x,y:pr.y,vx:0,vy:0,life:0.22,t:0,color:"#f472b6",r:2});
   if(pr.src.cfg.id==="disruption"&&Math.random()<dt*30)B.parts.push({x:pr.x,y:pr.y,vx:0,vy:0,life:0.25,t:0,color:"#38c8ff",r:1.8});
   if(pr.src.cfg.id==="aeroblast"&&Math.random()<dt*36)B.parts.push({x:pr.x,y:pr.y,vx:Math.random()*16-8,vy:Math.random()*16-8,life:0.3,t:0,color:"#7dd7ff",r:2});
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
       pr.hitSet.push(en);applyHit(pr,en);SFX.hit();
       if(pr.pierce>0)pr.pierce--;else{dead=true;break;}
     }
   }
   if(dead)B.projs.splice(q,1);
 }
 B.beams=B.beams.filter(function(b){b.t+=dt;return b.t<b.life;});
 B.parts=B.parts.filter(function(pt){pt.t+=dt;pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;return pt.t<pt.life;});
 B.rings=B.rings.filter(function(r){r.t+=dt;r.r+=r.vr*dt;return r.t<r.life;});
 B.nums=B.nums.filter(function(n){n.t+=dt;n.y-=26*dt;return n.t<0.85;});
 if(B.shake>0)B.shake=Math.max(0,B.shake-dt*26);
 /* wave clear? — волна сама по себе карточек больше НЕ даёт:
    следующая волна стартует сразу, а драфт открывается только по очкам */
 if(B.waveState==="fighting"&&B.waveQueue<=0&&B.enemies.length===0&&!B.over){
   if(B.wave>=finalWave()){if(!B.bossSpawned)return;endBattle(true);return;}
   if(B.pendingDrafts>0){B.waveState="draft";B.draftReturn="nextwave";openDraft();}
   else startWave(B.wave+1);
   syncHud();return;
 }
 /* карточка по накоплению очков — драфт открывается прямо посреди волны */
 if(B.waveState==="fighting"&&B.pendingDrafts>0&&!B.over){
   B.waveState="draft";B.draftReturn="fighting";openDraft();
 }
 syncHud();
}
function loop(ts){
 if(!B)return;
 var raw=Math.min(0.05,(ts-lastTs)/1000);lastTs=ts;
 if(!B.paused&&!B.over&&!$("ov-levelup").classList.contains("on"))update(raw*B.speed);
 draw();
 raf=requestAnimationFrame(loop);
}

