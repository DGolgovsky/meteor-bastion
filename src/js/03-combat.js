/* ---------- targeting & damage ---------- */
/* Дальность ограничивает только высоту: по ширине юнит видит всё поле целиком,
   а вниз зона поражения тянется до самой базы (враг у базы виден при любом x).
   Сверху — VIS_TOP: враги выше строки состояния (за HUD) в прицел не берутся. */
function inRange(t,e){
 if(e.hp<=0||e.dead)return false;
 if(e.y<VIS_TOP)return false;
 return (t.y-e.y)<=t.cfg.range && e.y<=BASEY+12;
}
/* Hive launches within turret range, but deployed wasps hunt across the WHOLE field. */
function pickDroneTarget(dr){
 var alive=B.enemies.filter(function(e){return !e.dead&&e.hp>0&&e.y<=BASEY+12;});
 if(!alive.length)return null;
 var best=null,bestScore=Infinity;
 alive.forEach(function(e){
  var dist=Math.hypot(e.x-dr.x,e.y-dr.y);
  var urgency=Math.max(0,e.y/BASEY)*32;
  var score=dist-urgency;
  if(score<bestScore){bestScore=score;best=e;}
 });
 return best;
}
function pickTarget(t){
 var inR=B.enemies.filter(function(e){return inRange(t,e);});
 if(!inR.length)return null;
 switch(t.cfg.target){
  case "strongest":return inR.reduce(function(a,b){return b.maxHp>a.maxHp?b:a;});
  case "weakest":return inR.reduce(function(a,b){return b.hp<a.hp?b:a;});
  case "nearest":return inR.reduce(function(a,b){return Math.hypot(b.x-t.x,b.y-t.y)<Math.hypot(a.x-t.x,a.y-t.y)?b:a;});
  case "random":return inR[Math.floor(Math.random()*inR.length)];
  default:return inR.reduce(function(a,b){return b.y>a.y?b:a;});
 }
}
/* скорость врага для упреждения: vy — падение с учётом замедления, vx — рысканье летуна (как в update) */
function enemyVel(e){
 var vx=0;
 if(e.kind==="flyer")vx=Math.sin(e.phase)*22;
 return {x:vx,y:e.speed*e.slowFactor};
}
/* точка перехвата: решаем |P + V·t − S| = projSpeed·t и целимся туда, а не в текущую позицию */
function aimPoint(t,e){
 var sx=t.x,sy=t.y-10,sp=t.cfg.projSpeed;
 if(sp<=0)return{x:e.x,y:e.y};
 var v=enemyVel(e);
 var dx=e.x-sx,dy=e.y-sy;
 var a=v.x*v.x+v.y*v.y-sp*sp,b=2*(dx*v.x+dy*v.y),c=dx*dx+dy*dy;
 var tt=Math.sqrt(c)/sp;
 if(Math.abs(a)>1e-6){
   var disc=b*b-4*a*c;
   if(disc>=0){var sq=Math.sqrt(disc),t1=(-b-sq)/(2*a),t2=(-b+sq)/(2*a),best=-1;
     if(t1>0)best=t1;
     if(t2>0&&(best<0||t2<best))best=t2;
     if(best>0)tt=best;}
 }else if(b<0){tt=-c/b;}
 tt=Math.max(0,Math.min(tt,1.5));
 return {x:e.x+v.x*tt,y:e.y+v.y*tt};
}
function dealDamage(src,e,baseDmg,opts){
 opts=opts||{}; if(e.hp<=0||e.dead)return 0;
 var crit=Math.random()<Math.min(0.95,Math.max(0,src?src.cfg.crit+src.critBonus:0.05));
 var cm=crit?(src?src.cfg.critMul:1.8)*(1+totalCritBonus()/100):1;
 /* сопротивление/уязвимость врага к типу урона атакующего (механика Galaxy Defense) */
 var rm=1;
 if(src&&src.cfg.dtype&&e.cfg.res&&e.cfg.res[src.cfg.dtype])rm=e.cfg.res[src.cfg.dtype];
 if(e.champion)rm=Math.min(1,rm);
 var dmg=baseDmg*(src?src.dmgMul:1)*(src&&B?B.allDmgMul:1)*cm*rm*(1-(e.armor||0));
 e.hp-=dmg; e.flash=0.08;
 if(src)src.totalDmg+=Math.max(0,Math.min(dmg,e.hp+dmg));
 if(dmg>=3||Math.random()<0.25)addNum(e.x+(Math.random()*16-8),e.y-e.r-4,Math.round(dmg),crit,rm);
 if(opts.slow&&e.kind!=="boss"){
   var slow=(opts.slowPow||0.35)*(e.champion?0.55:1);
   e.slowFactor=Math.min(e.slowFactor||1,1-slow);e.slowT=2.5;
 }
 if(opts.knock&&e.kind!=="boss")e.y-=opts.knock*(e.champion?0.45:1);
 if(opts.burn){var dot=baseDmg*0.5*(src?src.dmgMul*src.burnMul:1);if(dot>e.burnDps){e.burnDps=dot;e.burnSource=src;}e.burnT=3;}
 if(e.hp<=0)killEnemy(e);
 return dmg;
}
/* Очки боя за убийство: значения берутся из поля xp конфига врага
   (метеорит 1, летун 2, бронированный 3, голем-матка 5, звезда 6, элит 8, босс 60).
   При достижении порога в очередь ставится карточка; сам драфт откроется в конце кадра update(). */
function addDraftScore(pts){
 B.scoreTotal+=pts;B.score+=pts;
 while(B.score>=B.draftNeed){
   B.score-=B.draftNeed;B.draftsEarned++;B.pendingDrafts++;
   B.draftNeed=BALANCE.draftFirst+B.draftsEarned*BALANCE.draftGrowth+Math.max(0,B.wave-1)*BALANCE.draftWaveGrowth;
 }
}
function killEnemy(e){
 if(e.dead)return;e.dead=true;
 B.kills++;B.waveKilled++;if(e.champion)B.championsKilled++;
 addDraftScore(e.xp||1);
 /* каждый поражённый (уничтоженный) враг восстанавливает базе +2 HP, не выше максимума */
 if(B.baseHp<B.baseMax){
   var healed=Math.min(2,B.baseMax-B.baseHp);
   B.baseHp+=healed;B.totalHealed+=healed;
   if(Math.random()<0.3)addNum(W/2+(Math.random()*70-35),BASEY-64,"+2",false,1);
 }
 burst(e.x,e.y,e.kind==="boss"?26:12,e.color);
 if(e.kind==="boss"){B.shake=10;SFX.boom();}
 /* голем-матка при гибели делится на двух осколков (как Alien Golem в Galaxy Defense) */
 if(e.cfg.id==="splitter"){
   var mini=ENEMIES.filter(function(x){return x.id==="mini";})[0];
   var hpMul=B.stage.hpMul*(1+(B.wave-1)*BALANCE.waveHpGrowth);
   [-16,16].forEach(function(off){
     B.enemies.push({cfg:mini,kind:mini.kind,x:Math.max(16,Math.min(W-16,e.x+off)),y:e.y,hp:mini.hp*hpMul,maxHp:mini.hp*hpMul,
      speed:mini.speed*B.stage.spdMul*B.enemySpdMul,dmg:mini.dmg,armor:mini.armor,xp:mini.xp,r:mini.r,color:mini.color,
      phase:Math.random()*6.28,flash:0,slowFactor:1,slowT:0,burnDps:0,burnT:0,dead:false,healT:0});
   });
 }
}
function burst(x,y,n,color){for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,s=40+Math.random()*130;B.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.35+Math.random()*0.3,t:0,color:color,r:1.5+Math.random()*2.5});}}
function addNum(x,y,txt,crit,rm){B.nums.push({x:x,y:y,txt:""+txt,crit:!!crit,rm:rm||1,t:0});if(B.nums.length>60)B.nums.shift();}
function beamFx(x1,y1,x2,y2,color,w){B.beams.push({x1:x1,y1:y1,x2:x2,y2:y2,color:color,w:w||2,t:0,life:0.09});}
function arcFx(x1,y1,x2,y2,color){B.beams.push({x1:x1,y1:y1,x2:x2,y2:y2,mx:(x1+x2)/2+(Math.random()*24-12),my:(y1+y2)/2+(Math.random()*24-12),color:color||"#c084fc",w:2,t:0,life:0.12,arc:true});}
function ringFx(x,y,color,vr){B.rings.push({x:x,y:y,r:5,vr:vr||110,t:0,life:0.35,color:color});if(B.rings.length>40)B.rings.shift();}

/* ---------- firing ---------- */
/* Laser: finite-duration piercing sweep. Unlike the previous permanent beam,
   damage is delivered only during a timed channel followed by a real cooldown. */
function fireLaser(t,dt){
 t.cd-=dt;
 if(t.laserActive<=0){
   if(t.cd>0)return;
   var initial=pickTarget(t);if(!initial)return;
   t.laserActive=1.65*t.durationMul*(t.laserDurationMul||1);
   t.laserTickT=0;
   t.cd=5.2*t.metaCd/t.haste;
   SFX.laser();
 }
 t.laserActive=Math.max(0,t.laserActive-dt);
 var target=pickTarget(t);if(!target)return;
 var ox=t.x,oy=t.y-14;
 t.angle=Math.atan2(target.y-oy,target.x-ox);
 var dx=Math.cos(t.angle),dy=Math.sin(t.angle),hits=[],far=0;
 B.enemies.forEach(function(e){
   if(!inRange(t,e))return;
   var px=e.x-ox,py=e.y-oy,pr=px*dx+py*dy;
   if(pr<=0)return;
   if(Math.abs(px*dy-py*dx)<=e.r+8){hits.push(e);far=Math.max(far,pr);}
 });
 var len=Math.max(350,far+28);
 beamFx(ox,oy,ox+dx*len,oy+dy*len,"#4ade80",3+(t.laserWidth||0));
 t.laserTickT-=dt;
 var tickCount=0;
 while(t.laserTickT<=0&&tickCount<4){t.laserTickT+=0.12;tickCount++;}
 if(!tickCount)return;
 var opts=t.beamSlow?{slow:true,slowPow:0.3}:{};
 hits.forEach(function(e){dealDamage(t,e,t.cfg.damage*tickCount*(t.laserPower||1),opts);});
 if(t.refract&&hits.length){
  [-0.34,0.34].forEach(function(a){
   var ang=t.angle+a,vx=Math.cos(ang),vy=Math.sin(ang);
   beamFx(target.x,target.y,target.x+vx*160,target.y+vy*160,"#86efac",2);
   B.enemies.forEach(function(e){
    if(!inRange(t,e)||hits.indexOf(e)>=0)return;
    var px=e.x-target.x,py=e.y-target.y,pr=px*vx+py*vy;
    if(pr>0&&pr<160&&Math.abs(px*vy-py*vx)<e.r+8){
      hits.push(e);dealDamage(t,e,t.cfg.damage*0.5*(t.laserPower||1),opts);
    }
   });
  });
 }
 if(t.reflect>0&&hits.length){
  var cur=hits[hits.length-1],seen=hits.slice();
  for(var z=0;z<t.reflect;z++){
   var nx=null,dist=170;
   B.enemies.forEach(function(e){if(!inRange(t,e)||seen.indexOf(e)>=0)return;var d=Math.hypot(e.x-cur.x,e.y-cur.y);if(d<dist){dist=d;nx=e;}});
   if(!nx)break;
   beamFx(cur.x,cur.y,nx.x,nx.y,"#86efac",2);
   dealDamage(t,nx,t.cfg.damage*0.65*(t.laserPower||1),opts);
   seen.push(nx);cur=nx;
  }
 }
 if(t.beamSplit){
  var others=B.enemies.filter(function(e){return inRange(t,e)&&hits.indexOf(e)<0;});
  if(others.length){var e2=others[0];beamFx(ox,oy,e2.x,e2.y,"#4ade80",2);dealDamage(t,e2,t.cfg.damage*0.7,opts);}
 }
 if(t.laserDeflect>0){
  var def=B.enemies.filter(function(e){return inRange(t,e)&&hits.indexOf(e)<0;})[0];
  if(def){beamFx(ox,oy,def.x,def.y,"#4ade80",1.8);dealDamage(t,def,t.cfg.damage*0.5,opts);}
 }
 if(t.laserSweep>0&&Math.random()<0.25){
  var candidate=B.enemies.filter(function(e){return inRange(t,e)&&hits.indexOf(e)<0;});
  if(candidate.length){var sw=candidate[Math.floor(Math.random()*candidate.length)];beamFx(ox,oy,sw.x,sw.y,"#a7f3d0",2);dealDamage(t,sw,t.cfg.damage*0.8,opts);}
 }
}
function fireFocusedBeam(t,dt){
 t.cd-=dt;
 if(t.beamTicks<=0){
  if(t.cd>0)return;
  var first=pickTarget(t);if(!first)return;
  t.beamTicks=Math.round(20*t.durationMul*(t.beamDurationMul||1));
  t.beamTickT=0;t.beamTarget=first;t.beamRamp=0;
  t.cd=8.0*t.metaCd/t.haste;
  SFX.laser();
 }
 t.beamTickT-=dt;
 var steps=0;
 while(t.beamTickT<=0&&t.beamTicks>0&&steps++<4){
  t.beamTickT+=Math.max(0.08,t.beamInterval||0.20);
  t.beamTicks--;
  var target=t.beamTarget;
  if(!target||target.hp<=0||target.dead||!inRange(t,target)){
   target=pickTarget(t);
   if(target!==t.beamTarget&&!t.beamStacking)t.beamRamp=0;
   t.beamTarget=target;
  }
  if(!target)continue;
  t.angle=Math.atan2(target.y-t.y,target.x-t.x);
  var cap=t.beamFocusCap||0;
  var ramp=cap?1+Math.min(cap,t.beamRamp):1;
  var opts=t.beamSlow?{slow:true,slowPow:0.3}:{};
  dealDamage(t,target,t.cfg.damage*1.45*(t.beamPower||1)*ramp,opts);
  beamFx(t.x,t.y-14,target.x,target.y,"#38bdf8",4);
  if(cap)t.beamRamp+=0.09;
  if(t.beamSplit){
   var extra=B.enemies.filter(function(e){return e!==target&&inRange(t,e);});
   var alt=extra.length?extra[0]:target;
   beamFx(t.x,t.y-10,alt.x,alt.y,"#7dd7ff",1.8);
   dealDamage(t,alt,t.cfg.damage*0.75,{});
  }
  if(t.refract){
   var other=B.enemies.filter(function(e){return e!==target&&inRange(t,e);}).slice(0,2);
   other.forEach(function(e){beamFx(target.x,target.y,e.x,e.y,"#38bdf8",1.5);dealDamage(t,e,t.cfg.damage*0.55,{});});
  }
 }
}
function unitFire(t,dt){
 var cfg=t.cfg;
 if(cfg.id==="laser"){fireLaser(t,dt);return;}
 if(cfg.id==="beam"){fireFocusedBeam(t,dt);return;}
 t.cd-=dt;
 if(t.cd>0)return;
 var target=pickTarget(t); if(!target)return;
 var ap=aimPoint(t,target); /* упреждение: снаряд летит в точку перехвата движущейся цели */
 t.angle=Math.atan2(ap.y-(t.y-10),ap.x-t.x);
 t.cd=1/cfg.attackSpeed*t.metaCd/t.haste;
 if(cfg.effect==="chain"){
   var hit=[target],cur=target;arcFx(t.x,t.y-8,target.x,target.y,t.cfg.color);dealDamage(t,target,cfg.damage,{});
   for(var c=0;c<t.chain;c++){
     var nx=null,bd=95;
     B.enemies.forEach(function(e){if(e.hp>0&&!e.dead&&hit.indexOf(e)<0){var d=Math.hypot(e.x-cur.x,e.y-cur.y);if(d<bd){bd=d;nx=e;}}});
     if(!nx)break;arcFx(cur.x,cur.y,nx.x,nx.y,t.cfg.color);dealDamage(t,nx,cfg.damage*0.7,{});hit.push(nx);cur=nx;
   }
   SFX.zap();return;
 }
 if(cfg.effect==="hive"){
   var hcount=Math.min(12,t.hiveCount*(t.hiveDouble?2:1));
   for(var h=0;h<hcount&&B.drones.length<90;h++){
     /* осы ВЫЛЕТАЮТ веером вверх от турели (разброс 10–14px от неё), а не появляются
        в её точке: короткая фаза вылета (~0,25 с) наружу, затем самонаведение (см. update). */
     var la=-Math.PI/2+(Math.random()*1.1-0.55);
     var lr=10+Math.random()*4;
     B.drones.push({x:t.x+Math.cos(la)*lr,y:t.y-10+Math.sin(la)*lr,src:t,life:5.5*t.durationMul,tgt:target,hitT:0,hits:t.hiveAttacks,boost:1,launchT:0.25,vx:Math.cos(la)*120,vy:Math.sin(la)*120});
   }
   SFX.shoot();return;
 }
 if(cfg.id==="firewheel"){
   var speed=290,count=Math.min(3,1+t.extraProj);
   for(var z=0;z<count&&B.wheels.length<20;z++){
     var ang=t.angle+(z-(count-1)/2)*0.2;
     B.wheels.push({x:t.x,y:t.y-13,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,
       src:t,life:6.5*t.durationMul+(t.wheelDurationBonus||0),speed:speed,bounces:0,last:new Map(),hits:0});
   }
   SFX.shoot();return;
 }
 var n=1+t.extraProj;
 t.recoil=5;
 for(var k=0;k<n;k++){
   var off=k-(n-1)/2;
   if(t.isSoldier){
     var px=-Math.sin(t.angle),py=Math.cos(t.angle);
     B.projs.push({x:t.x+px*off*7,y:t.y-10+py*off*7,vx:Math.cos(t.angle)*cfg.projSpeed,vy:Math.sin(t.angle)*cfg.projSpeed,src:t,dmg:cfg.damage,pierce:t.pierce,hitSet:[],life:2.6,tgt:target});
   }else{
     var a=t.angle+off*0.09;
     B.projs.push({x:t.x,y:t.y-10,vx:Math.cos(a)*cfg.projSpeed,vy:Math.sin(a)*cfg.projSpeed,src:t,dmg:cfg.damage,pierce:t.pierce,hitSet:[],life:2.6,tgt:target});
   }
 }
 B.parts.push({x:t.x+Math.cos(t.angle)*14,y:t.y-10+Math.sin(t.angle)*14,vx:Math.cos(t.angle)*46,vy:Math.sin(t.angle)*46,life:0.12,t:0,color:cfg.color,r:2.2});
 SFX.shoot();
}
function applyHit(p,e){
 var cfg=p.src.cfg,opts={};
 if(cfg.effect==="charge"){
   /* Direct burst, overlapping AoE and nearby chain are separate hits. */
   dealDamage(p.src,e,p.dmg*0.8,{});
   var radius=Math.max(55,p.src.splash||60);
   B.enemies.forEach(function(o){
     if(o.hp>0&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=radius)dealDamage(p.src,o,p.dmg*0.65,{});
   });
   var near=B.enemies.filter(function(o){return o!==e&&o.hp>0&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=125;});
   near.sort(function(a,b){return Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y);});
   near.slice(0,Math.max(0,p.src.multiCount-1)).forEach(function(o){arcFx(e.x,e.y,o.x,o.y,"#a06bff");dealDamage(p.src,o,p.dmg*0.7,{});});
   if(p.src.teslaMatrix&&B.fields.length<32){
     B.fields.push({kind:"matrix",x:e.x,y:e.y,r:radius*1.6,life:p.src.teslaMatrixPlus?4.2:2.6,src:p.src,tick:0.1});
   }
   ringFx(e.x,e.y,"#a06bff",170);burst(e.x,e.y,12,"#a06bff");
   return;
 }
 if(cfg.effect==="rocket"){
   /* Sky Guard missile has separate impact and explosion damage, including the impact target. */
   dealDamage(p.src,e,p.dmg*0.55,{});
   var r=Math.max(24,p.src.splash);
   B.enemies.forEach(function(o){
     if(o.dead||o.hp<=0||Math.hypot(o.x-e.x,o.y-e.y)>r)return;
     dealDamage(p.src,o,p.dmg*0.7,{});
   });
   if(p.src.zapOnHit){
    var next=B.enemies.filter(function(o){return o!==e&&o.hp>0&&!o.dead;}).sort(function(a,b){return Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y);})[0];
    if(next&&Math.hypot(next.x-e.x,next.y-e.y)<100){arcFx(e.x,e.y,next.x,next.y,"#c084fc");dealDamage(p.src,next,p.dmg*0.5,{});}
   }
   ringFx(e.x,e.y,"#ff8a3c",130);burst(e.x,e.y,12,"#ff8a3c");
   return;
 }
 if(cfg.effect==="slow"){opts={slow:true,slowPow:p.src.slowPow};if(B.fields.length<32)B.fields.push({kind:"slow",x:e.x,y:e.y,r:Math.max(30,p.src.splash),life:2.2,src:p.src,tick:0.1});}
 if(cfg.effect==="knockback")opts={knock:p.src.knock};
 if(cfg.effect==="burn")opts={burn:true};
 dealDamage(p.src,e,p.dmg,opts);
 /* комбо Sky Guard + Thunderbolt: попадание ракеты бьёт током соседа */
 if(p.src.zapOnHit){
   var nx2=null,bd2=85;
   B.enemies.forEach(function(o){if(o!==e&&o.hp>0&&!o.dead){var dd=Math.hypot(o.x-e.x,o.y-e.y);if(dd<bd2){bd2=dd;nx2=o;}}});
   if(nx2){arcFx(e.x,e.y,nx2.x,nx2.y,"#c084fc");dealDamage(p.src,nx2,p.dmg*0.5,{});}
 }
 if(p.src.splash>0){
   B.enemies.forEach(function(o){if(o!==e&&o.hp>0&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=p.src.splash)dealDamage(p.src,o,p.dmg*0.5,cfg.effect==="slow"?{slow:true,slowPow:p.src.slowPow}:cfg.effect==="knockback"?{knock:p.src.knock*0.6}:{});});
   burst(e.x,e.y,8,"#ff8a3c");
 }
 /* различимые эффекты попаданий по типу турели */
 if(cfg.effect==="slow")ringFx(e.x,e.y,"#38c8ff",130);
 if(cfg.effect==="knockback")ringFx(e.x,e.y,"#7dd7ff",170);
 if(cfg.effect==="burn")burst(e.x,e.y,6,"#ff8a3c");
 if(cfg.id==="beam")burst(e.x,e.y,6,"#38bdf8");
 burst(e.x,e.y,3,cfg.color);
}

/* Segment-circle hit test: detects targets crossed between fast projectile frames. */
function sweptContact(x0,y0,x1,y1,cx,cy,r){
 var dx=x1-x0,dy=y1-y0,den=dx*dx+dy*dy;
 var t=den>0?Math.max(0,Math.min(1,((cx-x0)*dx+(cy-y0)*dy)/den)):0;
 var px=x0+dx*t-cx,py=y0+dy*t-cy;
 return px*px+py*py<=r*r?t:null;
}
