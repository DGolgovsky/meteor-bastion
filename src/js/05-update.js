/* ---------- update ---------- */
function update(dt){
 B.t+=dt;B.elapsed+=dt;
 if(B.waveState==="intro"){B.introT-=dt;if(B.introT<=0)startWave(1);syncHud();return;}
 /* spawning */
 if(B.waveQueue>0){
   B.spawnT-=dt;
   var interval=Math.max(BALANCE.spawnMin,BALANCE.spawnBase-B.wave*BALANCE.spawnReduction);
   if(B.spawnT<=0){if(spawnEnemy(wavePickKind()))B.waveQueue--;B.spawnT=interval*(0.7+Math.random()*0.6);}
 }
 /* Never lose the boss when the enemy cap is reached or the spawn queue empties. */
 if(B.wave===WAVES&&!B.bossSpawned&&B.waveQueue<=Math.floor(B.waveTotal/2)){
   if(spawnBoss())B.bossSpawned=true;
 }
 /* enemies */
 for(var i=B.enemies.length-1;i>=0;i--){
   var e=B.enemies[i];
   if(e.dead){B.enemies.splice(i,1);continue;}
   if(e.burnT>0){e.burnT-=dt;var burnHit=Math.min(e.hp,e.burnDps*dt);e.hp-=burnHit;if(e.burnSource)e.burnSource.totalDmg+=burnHit;if(Math.random()<dt*6)B.parts.push({x:e.x,y:e.y,vx:0,vy:-40,life:0.3,t:0,color:"#ff8a3c",r:2});if(e.hp<=0){killEnemy(e);B.enemies.splice(i,1);continue;}}
   if(e.slowT>0){e.slowT-=dt;if(e.slowT<=0)e.slowFactor=1;}
   /* звезда регенерации лечит соседних врагов (поддержка, как Rejuvenation Star) */
   if(e.kind==="healer"&&!e.dead){
     e.healT-=dt;
     if(e.healT<=0){e.healT=2.2;
       B.enemies.forEach(function(o){if(o!==e&&!o.dead&&o.hp>0&&o.hp<o.maxHp&&Math.hypot(o.x-e.x,o.y-e.y)<=95){o.hp=Math.min(o.maxHp,o.hp+o.maxHp*0.06);beamFx(e.x,e.y,o.x,o.y,"#4ade80",1.5);}});
       ringFx(e.x,e.y,"#4ade80",95);
     }
   }
   if(e.flash>0)e.flash-=dt;
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
   e.y+=e.speed*e.slowFactor*(e.hasteT>0?BALANCE.eliteAuraSpeed:1)*dt;
   if(e.kind==="flyer")e.x+=Math.sin(e.phase)*22*dt;
   if(e.cfg.id==="meteor"||e.cfg.id==="fast"||e.cfg.id==="armored"||e.cfg.id==="mini"){if(Math.random()<dt*22)B.parts.push({x:e.x+(Math.random()*8-4),y:e.y-e.r,life:0.32,t:0,vx:Math.random()*14-7,vy:-46-Math.random()*30,color:Math.random()<0.5?"#ff8a3c":"#ffb03c",r:2+Math.random()*2});}
   if(e.y>=BASEY-16){
     e.dead=true;B.enemies.splice(i,1);B.waveKilled++;
     var d=e.dmg;
     if(B.shield>0){var ab=Math.min(B.shield,d);B.shield-=ab;d-=ab;}
     B.baseHp-=d;B.shake=Math.min(12,B.shake+5);burst(e.x,BASEY,14,"#ff5470");SFX.boom();
     if(B.baseHp<=0){B.baseHp=0;endBattle(false);return;}
   }
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
    if(dr.hitT<=0&&Math.hypot(dr.tgt.x-dr.x,dr.tgt.y-dr.y)<19){
      dealDamage(dr.src,dr.tgt,dr.src.cfg.damage*0.65*dr.boost,dr.src.hiveBurn?{burn:true}:{});
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
   var nextTarget=pickTarget(wheel.src);
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
    if(e.dead||e.hp<=0||sweptContact(wx0,wy0,wheel.x,wheel.y,e.x,e.y,e.r+9)===null)return;
    var prev=wheel.last.has(e)?wheel.last.get(e):-99;
    if(B.t-prev<0.3)return;
    wheel.last.set(e,B.t);wheel.hits++;
    dealDamage(wheel.src,e,wheel.src.cfg.damage*1.15*bonus,{burn:true});
    if(wheel.src.fireTrail)B.parts.push({x:wheel.x,y:wheel.y,vx:0,vy:0,life:0.5,t:0,color:"#ff8a3c",r:6});
    if(wheel.hits%20===0){ringFx(wheel.x,wheel.y,"#ff8a3c",100);B.enemies.forEach(function(o){if(!o.dead&&o.hp>0&&Math.hypot(o.x-wheel.x,o.y-wheel.y)<=45)dealDamage(wheel.src,o,wheel.src.cfg.damage*2,{});});}
   });
   if(wheel.life<=0)B.wheels.splice(wi,1);
 }
 /* Tesla matrices and Disruption fields. Pulses stop when the field expires. */
 for(var fi=B.fields.length-1;fi>=0;fi--){
   var field=B.fields[fi];field.life-=dt;field.tick-=dt;
   if(field.tick<=0){
    field.tick+=field.kind==="matrix"?0.45:0.4;
    B.enemies.forEach(function(e){
      if(e.dead||e.hp<=0||Math.hypot(e.x-field.x,e.y-field.y)>field.r)return;
      if(field.kind==="slow"){e.slowFactor=Math.min(e.slowFactor,1-(field.src.slowPow||0.35));e.slowT=0.65;}
      else dealDamage(field.src,e,field.src.cfg.damage*(field.src.teslaMatrixPlus?0.95:0.65),{});
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
       var turn=Math.max(-3.6*dt,Math.min(3.6*dt,df));ca+=turn;pr.vx=Math.cos(ca)*sp;pr.vy=Math.sin(ca)*sp;}
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
   if(B.wave>=WAVES){if(!B.bossSpawned)return;endBattle(true);return;}
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

