/* ---------- targeting & damage ---------- */
/* Range limits only height: horizontally a unit sees the entire field,
   and downward the engagement zone extends all the way to the base (an enemy at the base is visible at any x).
   At the top is VIS_TOP: enemies above the status row (behind the HUD) are not targeted. */
function inRange(t,e){
 if(e.hp<=0||e.dead)return false;
 if(e.y<VIS_TOP)return false;
 if(e.kind==="phase"&&e.cloakT>0&&!(e.revealedT>0)&&!["laser","disruption","firewheel","gravity"].includes(t.cfg.id))return false;
 return (t.y-e.y)<=t.cfg.range && e.y<=BASEY+12;
}
/* Hive launches within turret range, but deployed wasps hunt across the WHOLE field.
   Wasps are distributed across targets: at most 2 wasps per target, so the crowd does not fly
   into the center of a single enemy. If all live targets are already taken, a wasp picks the least
   loaded one. */
function pickDroneTarget(dr){
 var alive=B.enemies.filter(function(e){return !e.dead&&e.hp>0&&e.y<=BASEY+12&&!(e.kind==="phase"&&e.cloakT>0&&!(e.revealedT>0));});
 if(!alive.length)return null;
 function assigned(e){var n=0;B.drones.forEach(function(o){if(o.tgt===e)n++;});return n;}
 var best=null,bestScore=Infinity;
 alive.forEach(function(e){
  if(assigned(e)>=2)return;
  var dist=Math.hypot(e.x-dr.x,e.y-dr.y);
  var urgency=Math.max(0,e.y/BASEY)*32;
  var score=dist-urgency;
  if(score<bestScore){bestScore=score;best=e;}
 });
 if(best)return best;
 var least=null,leastScore=Infinity;
 alive.forEach(function(e){
  var score=assigned(e)*1000+Math.hypot(e.x-dr.x,e.y-dr.y);
  if(score<leastScore){leastScore=score;least=e;}
 });
 return least;
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
/* enemy velocity for leading shots: vy is the descent including slow, vx is the flyer's weaving (as in update) */
function enemyVel(e){
 return {x:e.vx===undefined?0:e.vx,y:e.vy===undefined?e.speed*e.slowFactor*(e.chargeMul||1):e.vy};
}
/* intercept point: solve |P + V·t − S| = projSpeed·t and aim there rather than at the current position */
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
 if(src&&["laser","disruption","firewheel"].includes(src.cfg.id)){e.revealedT=4;e.cloakT=0;}
 if(opts.reveal){e.revealedT=Math.max(e.revealedT||0,4);e.cloakT=0;}
 var crit=Math.random()<Math.min(0.95,Math.max(0,src?src.cfg.crit+src.critBonus:0.05));
 var cm=crit?(src?src.cfg.critMul:1.8)*(1+totalCritBonus()/100):1;
 /* the enemy's resistance/vulnerability to the attacker's damage type (a Galaxy Defense mechanic) */
 var rm=1;
 if(src&&src.cfg.dtype&&e.cfg.res&&e.cfg.res[src.cfg.dtype])rm=e.cfg.res[src.cfg.dtype];
 if(e.champion)rm=Math.min(1,rm);
 var dmg=baseDmg*(src?src.dmgMul:1)*(src&&B?B.allDmgMul:1)*cm*rm*(1-(e.armor||0))*(1+(e.vulnerableStacks||0)*0.10);
 e.hp-=dmg; e.flash=0.08;
 if(src)src.totalDmg+=Math.max(0,Math.min(dmg,e.hp+dmg));
 if(dmg>=3||Math.random()<0.25)addNum(e.x+(Math.random()*16-8),e.y-e.r-4,Math.round(dmg),crit,rm,e);
 if(crit&&B.t-(e.lastCritRing===undefined?-99:e.lastCritRing)>.2){e.lastCritRing=B.t;B.rings.push({x:e.x,y:e.y,r:5,vr:90,t:0,life:.15,color:"#ff9f2e"});if(B.rings.length>40)B.rings.shift();}
 if(opts.vulnerable){e.vulnerableStacks=Math.min(3,(e.vulnerableStacks||0)+1);e.vulnerableT=3.8;}
 if(opts.slow&&e.kind!=="boss"){
   var slow=(opts.slowPow||0.35)*(e.champion?0.55:1);
   e.slowFactor=Math.min(e.slowFactor||1,1-slow);e.slowT=2.5;
 }
 if(opts.knock&&e.kind!=="boss")e.y-=opts.knock*(e.champion?0.45:1);
 if(opts.burn){var dot=baseDmg*0.5*(src?src.dmgMul*src.burnMul:1);if(dot>e.burnDps){e.burnDps=dot;e.burnSource=src;}e.burnT=3;}
 if(e.hp<=0)killEnemy(e);
 return dmg;
}
/* Battle points per kill: values come from the xp field of the enemy config
   (meteor 1, flyer 2, armored 3, golem mother 5, star 6, elite 8, boss 60).
   When a threshold is reached, a card is queued; the draft itself opens at the end of the update() frame. */
function addDraftScore(pts){
 B.scoreTotal+=pts;B.score+=pts;
 while(B.score>=B.draftNeed){
   B.score-=B.draftNeed;B.draftsEarned++;B.pendingDrafts++;
   var n=B.draftsEarned;
    B.draftNeed=n<BALANCE.draftOpeningCosts.length?BALANCE.draftOpeningCosts[n]:
      BALANCE.draftLateBase+(n-BALANCE.draftOpeningCosts.length)*BALANCE.draftGrowth+
      Math.max(0,B.wave-1)*BALANCE.draftWaveGrowth;
 }
}
function killEnemy(e){
 if(e.dead)return;e.dead=true;
 B.kills++;B.waveKilled++;if(e.champion)B.championsKilled++;
 addDraftScore(e.xp||1);
 /* every enemy hit and destroyed restores +2 HP to the base, capped at the maximum */
 if(B.baseHp<B.baseMax){
   var healed=Math.min(2,B.baseMax-B.baseHp);
   B.baseHp+=healed;B.totalHealed+=healed;
   if(B.t-(B.healWindowAt||0)>1){B.healWindowAt=B.t;B.healWindowAmount=0;}
    B.healWindowAmount=(B.healWindowAmount||0)+healed;
    if(B.healWindowAmount>=6){addNum(W/2+(Math.random()*70-35),BASEY-52,"+6",false,1);B.healWindowAmount=0;B.healWindowAt=B.t;}
    else if(Math.random()<.3)addNum(W/2+(Math.random()*70-35),BASEY-52,"+"+Math.round(healed),false,1);
 }
 burst(e.x,e.y,e.kind==="boss"?26:12,e.color);
 if(e.kind==="boss"){B.shake=10;SFX.boom();}
 /* a golem mother splits into two shards on death (like the Alien Golem in Galaxy Defense) */
 if(e.cfg.id==="splitter"){
   var mini=ENEMIES.filter(function(x){return x.id==="mini";})[0];
   var hpMul=B.stage.hpMul*(1+(B.wave-1)*BALANCE.waveHpGrowth)*0.78*0.8;
   [-16,16].forEach(function(off){
     if(B.enemies.length>=MAX_ENEMIES)return;
      B.enemies.push({cfg:mini,kind:mini.kind,x:Math.max(16,Math.min(W-16,e.x+off)),y:e.y,hp:mini.hp*hpMul,maxHp:mini.hp*hpMul,
      speed:mini.speed*B.stage.spdMul*B.enemySpdMul*.85*1.15,baseSpeed:mini.speed*B.stage.spdMul*B.enemySpdMul*.85*1.15,dmg:mini.dmg*.8,armor:mini.armor,xp:mini.xp,r:mini.r,color:mini.color,
       moveKind:"mini",visualScale:.85+Math.random()*.3,vx:0,vy:0,hoverCd:5,hoverT:0,hoverCount:0,driftDir:off<0?-1:1,driftT:2,speedPhase:Math.random()*6.28,
      phase:Math.random()*6.28,flash:0,slowFactor:1,slowT:0,burnDps:0,burnT:0,dead:false,healT:0});
   });
 }
}
function burst(x,y,n,color){for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,s=40+Math.random()*130;B.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.35+Math.random()*0.3,t:0,color:color,r:1.5+Math.random()*2.5});}}
/* Merge three or more damage numbers on a target within 0.25s. */
function addNum(x,y,txt,crit,rm,enemy){
 x=Math.max(20,Math.min(W-20,x));y=Math.max(VIS_TOP+12,Math.min(BASEY-20,y));
 var heal=String(txt).charAt(0)==="+",value=heal?Number(String(txt).slice(1)):Number(txt);
 var matches=enemy?B.nums.filter(function(n){return n.target===enemy&&n.t<.25&&!n.heal;}):[];
 if(matches.length){
  var hits=1,sum=value,isCrit=!!crit,importance=rm||1;
  matches.forEach(function(n){hits+=n.hits||1;sum+=n.total===undefined?Number(n.txt):n.total;isCrit=isCrit||n.crit;importance=Math.max(importance,n.rm);});
  if(hits>=3){
   B.nums=B.nums.filter(function(n){return matches.indexOf(n)<0;});
   B.nums.push({x:x,y:y,txt:""+Math.round(sum),total:sum,hits:hits,crit:isCrit,rm:importance,t:0,target:enemy,heal:false});
   if(B.nums.length>60)B.nums.shift();return;
  }
 }
 B.nums.push({x:x,y:y,txt:""+txt,total:value,hits:1,crit:!!crit,rm:rm||1,t:0,target:enemy||null,heal:heal});
 if(B.nums.length>60)B.nums.shift();
}
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
   t.laserActive=1.65*t.durationMul*(t.laserDurationMul||1);t.recoil=3;
   t.laserTickT=0;
   t.cd=7.8*t.metaCd/t.haste; /* the cooldown between pulses is increased 1.5× (was 5.2) */
   /* the beam does NOT track the target: the direction and aim point are locked at the moment of firing
      (the target's position when the channel starts) and do not follow it until the channel ends */
   t.laserAngle=Math.atan2(initial.y-(t.y-14),initial.x-t.x);
   t.laserAimX=initial.x;t.laserAimY=initial.y;
   SFX.laser();
 }
 t.laserActive=Math.max(0,t.laserActive-dt);
 var ox=t.x,oy=t.y-14;
 t.angle=t.laserAngle;
 var dx=Math.cos(t.angle),dy=Math.sin(t.angle),hits=[],far=0;
 B.enemies.forEach(function(e){
   if(!inRange(t,e))return;
   var px=e.x-ox,py=e.y-oy,pr=px*dx+py*dy;
   if(pr<=0)return;
   if(Math.abs(px*dy-py*dx)<=e.r+8){hits.push(e);far=Math.max(far,pr);}
 });
 /* the beam goes from the turret through the target to the edge of the field in the firing direction;
    damage does not change (it is computed from hits), only the visual length changes */
 var edgeT=Infinity;
 if(dx>1e-6)edgeT=Math.min(edgeT,(W-ox)/dx);
 if(dx<-1e-6)edgeT=Math.min(edgeT,(0-ox)/dx);
 if(dy>1e-6)edgeT=Math.min(edgeT,(H-oy)/dy);
 if(dy<-1e-6)edgeT=Math.min(edgeT,(0-oy)/dy);
 var len=isFinite(edgeT)?edgeT:Math.max(350,far+28);
 beamFx(ox,oy,ox+dx*len,oy+dy*len,"#4ade80",3+(t.laserWidth||0));
 t.laserTickT-=dt;
 var tickCount=0;
 while(t.laserTickT<=0&&tickCount<4){t.laserTickT+=0.12;tickCount++;}
 if(!tickCount)return;
 var opts=t.beamSlow?{slow:true,slowPow:0.3,vulnerable:!!t.laserVulnerable}:{vulnerable:!!t.laserVulnerable};
 hits.forEach(function(e){dealDamage(t,e,t.cfg.damage*tickCount*(t.laserPower||1),opts);});
 if(t.refract&&hits.length){
  [-0.34,0.34].forEach(function(a){
   var ang=t.angle+a,vx=Math.cos(ang),vy=Math.sin(ang);
   beamFx(t.laserAimX,t.laserAimY,t.laserAimX+vx*160,t.laserAimY+vy*160,"#86efac",2);
   B.enemies.forEach(function(e){
    if(!inRange(t,e)||hits.indexOf(e)>=0)return;
    var px=e.x-t.laserAimX,py=e.y-t.laserAimY,pr=px*vx+py*vy;
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
  /* the sweeping beam hits the second target DETERMINISTICALLY, the toughest
     of the remaining ones rather than a random one, so the fire does not turn into scatter */
  var candidate=B.enemies.filter(function(e){return inRange(t,e)&&hits.indexOf(e)<0;});
  if(candidate.length){var sw=candidate.reduce(function(a,b){return b.maxHp>a.maxHp?b:a;});beamFx(ox,oy,sw.x,sw.y,"#a7f3d0",2);dealDamage(t,sw,t.cfg.damage*0.8,opts);}
 }
}
function fireFocusedBeam(t,dt){
 t.cd-=dt;
 if(t.beamTicks<=0){
  if(t.cd>0)return;
  var first=pickTarget(t);if(!first)return;
  t.beamTicks=Math.round(20*t.durationMul*(t.beamDurationMul||1));
  t.beamTickT=0;t.beamTarget=first;t.beamRamp=0;
  t.cd=10.0*t.metaCd/t.haste;
  SFX.laser();
 }
 t.beamTickT-=dt;
 var steps=0;
 while(t.beamTickT<=0&&t.beamTicks>0&&steps++<4){
  t.beamTickT+=Math.max(0.08,t.beamInterval||0.20);
  t.beamTicks--;t.recoil=2;
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
  var opts=t.beamSlow?{slow:true,slowPow:0.3,vulnerable:!!t.laserVulnerable}:{vulnerable:!!t.laserVulnerable};
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
 var ap=aimPoint(t,target); /* leading: the projectile flies to the intercept point of the moving target */
 t.angle=Math.atan2(ap.y-(t.y-10),ap.x-t.x);
 t.cd=1/cfg.attackSpeed*t.metaCd/t.haste;
 if(cfg.effect==="gravity"){
   var centerX=target.x,centerY=Math.max(VIS_TOP+30,Math.min(BASEY-35,target.y));
   if(B.fields.filter(function(field){return field.kind==="gravity"&&field.src===t;}).length<4){
     B.fields.push({kind:"gravity",x:centerX,y:centerY,r:t.gravityRadius,life:t.gravityDuration*t.durationMul,
       src:t,tick:0.15,pull:t.gravityPull,power:t.gravityPower||1});
     ringFx(centerX,centerY,"#8cb5ff",135);
   }
   t.recoil=3;SFX.zap();return;
 }
 if(cfg.effect==="chain"){
   var hit=[target],cur=target;arcFx(t.x,t.y-8,target.x,target.y,t.cfg.color);dealDamage(t,target,cfg.damage,t.thunderParalyze?{slow:true,slowPow:0.30}:{});
   for(var c=0;c<t.chain;c++){
     var nx=null,bd=95;
     B.enemies.forEach(function(e){if(e.hp>0&&!e.dead&&hit.indexOf(e)<0){var d=Math.hypot(e.x-cur.x,e.y-cur.y);if(d<bd){bd=d;nx=e;}}});
     if(!nx)break;arcFx(cur.x,cur.y,nx.x,nx.y,t.cfg.color);dealDamage(t,nx,cfg.damage*0.7,t.thunderParalyze?{slow:true,slowPow:0.25}:{});hit.push(nx);cur=nx;
   }
   t.recoil=3;SFX.zap();return;
 }
 if(cfg.effect==="hive"){
   t.recoil=2;
    var hcount=Math.min(12,t.hiveCount*(t.hiveDouble?2:1));
   for(var h=0;h<hcount&&B.drones.length<90;h++){
     /* wasps FLY OUT in an upward fan from the turret (spread 10–14px from it) instead of appearing
        at its point: a short outward launch phase (~0.25 s), then homing (see update). */
     var la=-Math.PI/2+(Math.random()*1.1-0.55);
     var lr=10+Math.random()*4;
     /* a wasp joins the swarm first and only then picks a target, taking occupied targets into account;
        otherwise the whole volley flies to one point (see pickDroneTarget, max 2 per target) */
     var dr={x:t.x+Math.cos(la)*lr,y:t.y-10+Math.sin(la)*lr,src:t,life:8.5*t.durationMul,tgt:null,hitT:0,hits:t.hiveAttacks,boost:1,echoed:false,isEcho:false,launchT:0.25,vx:Math.cos(la)*120,vy:Math.sin(la)*120};
     B.drones.push(dr);
     dr.tgt=pickDroneTarget(dr)||target;
   }
   SFX.shoot();return;
 }
 if(cfg.id==="firewheel"){
   /* "Firefly": at most one disc on the field at a time (two with the
      "Second Firefly" card); just one, but large (r=14) and long-lived (10 s). While the disc
      is alive, the turret does not launch another: the cooldown runs idle, and the replacement
      flies out as soon as the previous one burns out. */
   var speed=290,count=Math.min(3,1+t.extraProj),maxWheels=t.wheelMax||1,active=0,spawned=0;
   B.wheels.forEach(function(w){if(w.src===t)active++;});
   for(var z=0;z<count&&active+spawned<maxWheels&&B.wheels.length<20;z++){
     var ang=t.angle+(z-(count-1)/2)*0.2;
     B.wheels.push({x:t.x,y:t.y-13,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,
       src:t,life:10*t.durationMul+(t.wheelDurationBonus||0),speed:speed,bounces:0,last:new Map(),hits:0});
     spawned++;
   }
   if(spawned){t.recoil=3;SFX.shoot();}return;
 }
 if(cfg.id==="aeroblast"){
   /* SHOTGUN: the spread is wide up close but narrows toward distant targets. Without this,
      the increased range gave only the central pellet: the others
      diverged past even a stationary enemy. At long range the
      angular step keeps neighboring pellets about 14px from the center. */
   var pellets=(t.aeroPellets||5)+t.extraProj;
   var targetDist=Math.hypot(ap.x-t.x,ap.y-(t.y-10));
   var spreadStep=Math.min(0.14,14/Math.max(90,targetDist));
   for(var k=0;k<pellets;k++){
     var a=t.angle+(k-(pellets-1)/2)*spreadStep;
     B.projs.push({x:t.x,y:t.y-10,vx:Math.cos(a)*cfg.projSpeed,vy:Math.sin(a)*cfg.projSpeed,src:t,dmg:cfg.damage,pierce:0,hitSet:[],life:2.6,tgt:target});
   }
   t.recoil=6;
   B.parts.push({kind:"muzzle",angle:t.angle,x:t.x+Math.cos(t.angle)*14,y:t.y-10+Math.sin(t.angle)*14,life:.08,t:0,color:cfg.color,r:14,vx:0,vy:0});
   if(cfg.id==="skyguard")for(var sm=0;sm<4;sm++)B.parts.push({x:t.x+(sm-1.5)*5.5,y:t.y-25,vx:(sm-1.5)*8,vy:-22,life:0.35,t:0,color:"#8fa1b4",r:2});
  B.parts.push({x:t.x+Math.cos(t.angle)*14,y:t.y-10+Math.sin(t.angle)*14,vx:Math.cos(t.angle)*46,vy:Math.sin(t.angle)*46,life:0.12,t:0,color:cfg.color,r:2.2});
   SFX.shoot();return;
 }
 var n=1+t.extraProj;
 t.recoil=5;
 if(t.isSoldier){
   var px=-Math.sin(t.angle),py=Math.cos(t.angle);
   /* the guardian fires from both hands: ONE hand for the whole burst, so all three shots
      go in a tight group (3px spacing) from one side, and the next burst from the other.
      Previously the hand switched on every shot of the burst, and the third shot went
      far from the first two. */
   var hand=(t.handAlt?1:-1)*6;t.handAlt=!t.handAlt;
   for(var k=0;k<n;k++){
     var off=k-(n-1)/2;
     B.projs.push({x:t.x+px*(off*3+hand),y:t.y-10+py*(off*3+hand),vx:Math.cos(t.angle)*cfg.projSpeed,vy:Math.sin(t.angle)*cfg.projSpeed,src:t,dmg:cfg.damage,pierce:t.pierce,hitSet:[],life:2.6,tgt:target});
   }
 }else{
   var px2=-Math.sin(t.angle),py2=Math.cos(t.angle);
   for(var k2=0;k2<n;k2++){
     var off2=k2-(n-1)/2;
     /* extra turret projectiles fly PARALLEL to the main one (lateral
        offset 7px), not in a spread, so cards do not turn the fire into scatter */
     B.projs.push({x:t.x+px2*off2*7,y:t.y-10+py2*off2*7,vx:Math.cos(t.angle)*cfg.projSpeed,vy:Math.sin(t.angle)*cfg.projSpeed,src:t,dmg:cfg.damage,pierce:t.pierce,hitSet:[],life:2.6,tgt:target});
   }
 }
 B.parts.push({x:t.x+Math.cos(t.angle)*14,y:t.y-10+Math.sin(t.angle)*14,vx:Math.cos(t.angle)*46,vy:Math.sin(t.angle)*46,life:0.12,t:0,color:cfg.color,r:2.2});
 SFX.shoot();
}
function applyHit(p,e){
 var cfg=p.src.cfg,opts={};
 if(cfg.effect==="charge"){
   /* Direct discharge + area explosion, then a BOUNCE: the discharge jumps
      from the struck target to the nearest enemy not yet hit, and so on along the chain;
      each subsequent bounce is weaker. The old "double charge" (hitting several
      targets around the first one simultaneously) is removed entirely. */
   dealDamage(p.src,e,p.dmg*0.8,{});
   var radius=Math.max(55,p.src.splash||60);
   B.enemies.forEach(function(o){
     if(o.hp>0&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=radius)dealDamage(p.src,o,p.dmg*0.65,{});
   });
   var bounces=Math.max(0,p.src.multiCount-1);
   var bounceMul=[0.7,0.5,0.35,0.25,0.2];
   var cur=e,bounced=[e];
   for(var bi=0;bi<bounces;bi++){
     var nx=null,bd=150;
     B.enemies.forEach(function(o){
       if(o.hp<=0||o.dead||bounced.indexOf(o)>=0)return;
       var d=Math.hypot(o.x-cur.x,o.y-cur.y);
       if(d<bd){bd=d;nx=o;}
     });
     if(!nx)break;
     arcFx(cur.x,cur.y,nx.x,nx.y,"#a06bff");
     dealDamage(p.src,nx,p.dmg*bounceMul[Math.min(bi,bounceMul.length-1)],{});
     bounced.push(nx);cur=nx;
   }
   if(p.src.teslaMatrix&&B.fields.length<32){
     B.fields.push({kind:"matrix",x:e.x,y:e.y,r:radius*1.6,life:p.src.teslaMatrixPlus?4.2:2.6,src:p.src,tick:0.1});
   }
   ringFx(e.x,e.y,"#a06bff",170);burst(e.x,e.y,12,"#a06bff");
   return;
 }
 if(cfg.effect==="rocket"){
   /* Sky Guard missile has separate impact and explosion damage, including the impact target. */
   dealDamage(p.src,e,p.dmg*0.55,p.src.rocketBurn?{burn:true}:{});
   var r=Math.max(24,p.src.splash);
   B.enemies.forEach(function(o){
     if(o.dead||o.hp<=0||Math.hypot(o.x-e.x,o.y-e.y)>r)return;
     dealDamage(p.src,o,p.dmg*0.7,p.src.rocketBurn?{burn:true}:{});
   });
   if(p.src.zapOnHit){
    var next=B.enemies.filter(function(o){return o!==e&&o.hp>0&&!o.dead;}).sort(function(a,b){return Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y);})[0];
    if(next&&Math.hypot(next.x-e.x,next.y-e.y)<100){arcFx(e.x,e.y,next.x,next.y,"#c084fc");dealDamage(p.src,next,p.dmg*0.5,{});}
   }
   ringFx(e.x,e.y,"#ff8a3c",130);burst(e.x,e.y,12,"#ff8a3c");
   return;
 }
 if(cfg.effect==="slow"){opts={slow:true,slowPow:p.src.slowPow,vulnerable:!!p.src.fieldExpose};if(B.fields.length<32)B.fields.push({kind:"slow",x:e.x,y:e.y,r:Math.max(30,p.src.splash),life:2.2,age:0,seed:Math.random()*1000,src:p.src,tick:0.1});}
 if(cfg.effect==="knockback")opts={knock:p.src.knock};
 if(cfg.effect==="burn")opts={burn:true};
 dealDamage(p.src,e,p.dmg,opts);
 if(cfg.id==="railgun"&&p.src.railExplosive){
   B.enemies.forEach(function(o){if(o!==e&&o.hp>0&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=45)dealDamage(p.src,o,p.dmg*0.25,{});});
   ringFx(e.x,e.y,"#f472b6",75);
 }
 /* Sky Guard + Thunderbolt combo: a rocket hit shocks a neighbor */
 if(p.src.zapOnHit){
   var nx2=null,bd2=85;
   B.enemies.forEach(function(o){if(o!==e&&o.hp>0&&!o.dead){var dd=Math.hypot(o.x-e.x,o.y-e.y);if(dd<bd2){bd2=dd;nx2=o;}}});
   if(nx2){arcFx(e.x,e.y,nx2.x,nx2.y,"#c084fc");dealDamage(p.src,nx2,p.dmg*0.5,{});}
 }
 if(p.src.splash>0){
   B.enemies.forEach(function(o){if(o!==e&&o.hp>0&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=p.src.splash)dealDamage(p.src,o,p.dmg*0.5,cfg.effect==="slow"?{slow:true,slowPow:p.src.slowPow}:cfg.effect==="knockback"?{knock:p.src.knock*0.6}:{});});
   burst(e.x,e.y,8,"#ff8a3c");
 }
 /* distinguishable hit effects per turret type */
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
