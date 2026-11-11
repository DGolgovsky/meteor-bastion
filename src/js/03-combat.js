/* ---------- targeting & damage ---------- */
/* Range limits only height: horizontally a unit sees the entire field,
   and downward the engagement zone extends all the way to the base (an enemy at the base is visible at any x).
   At the top is VIS_TOP: enemies above the status row (behind the HUD) are not targeted. */
function inRange(t,e){
 if(e.hp<=0||e.dead)return false;
 if(e.y<VIS_TOP)return false;
 if(e.kind==="phase"&&e.cloakT>0&&!(e.revealedT>0)&&!["laser","disruption","firewheel","gravity"].includes(t.cfg.id))return false;
 return (t.y-e.y)<=t.cfg.range*(t.rangeMul||1) && e.y<=BASEY+12;
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
  case "closestBase":return inR.reduce(function(a,b){return b.y>a.y?b:a;});
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
 var dtp=opts.dtype||(src&&src.cfg.dtype);
 if(dtp&&e.cfg.res&&e.cfg.res[dtp])rm=e.cfg.res[dtp];
 if(e.champion)rm=Math.min(1,rm);
 /* Physical Vulnerable: +25% physical damage taken */
 if(dtp==="phys"&&e.physVulnT>0)rm*=1.25;
 var dmg=baseDmg*(src?src.dmgMul:1)*(src&&B?B.allDmgMul:1)*cm*rm*(1-(e.armor||0))*(1+(e.vulnerableStacks||0)*0.10);
 e.hp-=dmg; e.flash=0.08;
 if(src)src.totalDmg+=Math.max(0,Math.min(dmg,e.hp+dmg));
 if(dmg>=3||Math.random()<0.25)addNum(e.x+(Math.random()*16-8),e.y-e.r-4,Math.round(dmg),crit,rm,e);
 if(crit&&B.t-(e.lastCritRing===undefined?-99:e.lastCritRing)>.2){e.lastCritRing=B.t;B.rings.push({x:e.x,y:e.y,r:5,vr:90,t:0,life:.15,color:"#ff9f2e"});if(B.rings.length>40)B.rings.shift();}
 var durMul=opts.durMul||1;
 e.lastSrc=src;e.lastKind=opts.kind||"";
 if(opts.vulnerable){e.vulnerableStacks=Math.min(3,(e.vulnerableStacks||0)+1);e.vulnerableT=3.8*durMul;}
 if(opts.slow&&e.kind!=="boss"){
   var slow=(opts.slowPow||0.35)*(e.champion?0.55:1);
   e.slowFactor=Math.min(e.slowFactor||1,1-slow);e.slowT=Math.max(e.slowT||0,2.5*durMul);
 }
 if(opts.paralyze)applyParalyze(e,opts.paralyze*durMul);
 if(opts.physVuln)e.physVulnT=Math.max(e.physVulnT||0,opts.physVuln*durMul);
 /* Thunder Chain: a marked enemy launches a small Chain Lightning whenever it takes damage (every 0.5 s) */
 if(e.thunderChainT>0&&!opts.noTC&&e.tcSrc&&(e.tcCd||0)<=0&&e.hp>0){e.tcCd=0.5;chainLightning(e.tcSrc,e,2,e.tcSrc.cfg.damage*0.3,{noTC:true});}
 if(opts.knock&&e.kind!=="boss")e.y-=opts.knock*(e.champion?0.45:1);
 if(opts.burn){var dot=baseDmg*0.5*(src?src.dmgMul*src.burnMul:1);if(dot>e.burnDps){e.burnDps=dot;e.burnSource=src;}e.burnT=Math.max(e.burnT||0,3*durMul);}
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
 onKill(e);
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
   var hpMul=B.stage.hpMul*(1+(B.wave-1)*BALANCE.waveHpGrowth)*BALANCE.enemyHpMul*0.8;
   [-16,16].forEach(function(off){
     if(B.enemies.length>=MAX_ENEMIES)return;
      B.enemies.push({cfg:mini,kind:mini.kind,x:Math.max(16,Math.min(W-16,e.x+off)),y:e.y,hp:mini.hp*hpMul,maxHp:mini.hp*hpMul,
      speed:mini.speed*B.stage.spdMul*B.enemySpdMul*.85*1.15,baseSpeed:mini.speed*B.stage.spdMul*B.enemySpdMul*.85*1.15,dmg:mini.dmg*.8*BALANCE.enemyDmgMul,armor:mini.armor,xp:mini.xp,r:mini.r,color:mini.color,
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
function beamFx(x1,y1,x2,y2,color,w){if(B.beams.length>=220)return;B.beams.push({x1:x1,y1:y1,x2:x2,y2:y2,color:color,w:w||2,t:0,life:0.09});}
function arcFx(x1,y1,x2,y2,color){if(B.beams.length>=220)return;B.beams.push({x1:x1,y1:y1,x2:x2,y2:y2,mx:(x1+x2)/2+(Math.random()*24-12),my:(y1+y2)/2+(Math.random()*24-12),color:color||"#c084fc",w:2,t:0,life:0.12,arc:true});}
function ringFx(x,y,color,vr){B.rings.push({x:x,y:y,r:5,vr:vr||110,t:0,life:0.35,color:color});if(B.rings.length>40)B.rings.shift();}

/* ---------- firing ---------- */
function rayHits(t,ox,oy,ang,band,exclude){
 var dx=Math.cos(ang),dy=Math.sin(ang),hits=[];
 B.enemies.forEach(function(e){
  if(!inRange(t,e)||(exclude&&exclude.indexOf(e)>=0))return;
  var px=e.x-ox,py=e.y-oy,pr=px*dx+py*dy;
  if(pr>0&&Math.abs(px*dy-py*dx)<=(e.r+8)*band)hits.push(e);
 });
 return hits;
}
function edgeLen(ox,oy,dx,dy){
 var t=Infinity;
 if(dx>1e-6)t=Math.min(t,(W-ox)/dx);if(dx<-1e-6)t=Math.min(t,(0-ox)/dx);
 if(dy>1e-6)t=Math.min(t,(H-oy)/dy);if(dy<-1e-6)t=Math.min(t,(0-oy)/dy);
 return isFinite(t)?t:400;
}
/* Laser width follows the laser's damage power relative to its build-time power:
   ×1 at base, up to ×3 (sqrt scale), times the High-Energy Pulse band. */
function laserPowerScale(t){return t.dmgMul*(B?B.allDmgMul:1)*(t.laserPower||1)/(t.baseDmgMul||t.dmgMul||1);}
function laserWidth(t){return 3*Math.min(3,Math.max(1,Math.sqrt(laserPowerScale(t))))*(t.laserBandMul||1);}
/* A channel owns one visual per ray, refreshed in place. Appending a 90ms beam on
   every frame used to draw 5/10 identical full-height blurred rays at 60/120Hz. */
function laserVisual(t,key,ox,oy,x2,y2,w,color,life){
 var slots=t.laserVisuals||(t.laserVisuals={}),b=slots[key];
 if(!b||b.t>=b.life||B.beams.indexOf(b)<0){
  if(B.beams.length>=220)return;
  b=slots[key]={laser:true};B.beams.push(b);
 }
 b.x1=ox;b.y1=oy;b.x2=x2;b.y2=y2;b.color=color;b.w=w;b.t=0;b.life=life||0.09;
}
function laserBeam(t,key,ox,oy,ang,w,color,len){
 var dx=Math.cos(ang),dy=Math.sin(ang);len=len||edgeLen(ox,oy,dx,dy);
 laserVisual(t,key,ox,oy,ox+dx*len,oy+dy*len,w,color);
}
function laserOpts(t,extra){
 var o={kind:"laser",durMul:t.debuffDurMul||1,vulnerable:!!t.laserVulnerable};
 if(t.beamSlow){o.slow=true;o.slowPow=0.3;}
 if(t.laserParalyze)o.paralyze=0.6;
 for(var k in extra)o[k]=extra[k];
 return o;
}
function laserHit(t,e,base,o){
 var m=t.energyBoost?1+Math.min(3,0.6*debuffCount(e)):1,burning=e.burnT>0;
 dealDamage(t,e,base*m,o);
 if(t.energyDetonation&&burning&&B.t-(e.ignT===undefined?-9:e.ignT)>1){e.ignT=B.t;explodeAt(t,e.x,e.y,45,t.cfg.damage,{kind:"ignite"},"#ff6a2c");}
 if(t.disruptionLaser&&Math.random()<0.1)addDisruption(e,t,1);
}
/* Laser: finite channel with the direction LOCKED at pulse start. Every laser of this turret
   (main, deflected, sweeping, reflected, refracted, convergence, ripping) starts AT THE TURRET. */
function fireLaser(t,dt){
 t.cd-=dt;
 if(t.laserActive<=0){
   if(t.cd>0)return;
   var initial=pickTarget(t);if(!initial)return;
   t.laserDur=1.65*t.durationMul*(t.laserDurationMul||1);
   t.laserActive=t.laserDur;t.recoil=3;t.laserTickT=0;t.emberT=0;
   t.cd=7.8*t.metaCd/t.haste;
   t.laserAngle=Math.atan2(initial.y-(t.y-14),initial.x-t.x);
   t.laserAimX=initial.x;t.laserAimY=initial.y;
   SFX.laser();
 }
 t.laserActive=Math.max(0,t.laserActive-dt);
 var prog=1-t.laserActive/Math.max(0.01,t.laserDur);
 var ox=t.x,oy=t.y-14,A=t.laserAngle;t.angle=A;
 /* Only damaging ticks need an enemy-line scan. Take that snapshot before the
    Graviton movement below, exactly as before, without scanning on visual-only frames. */
 t.laserTickT-=dt;
 var tickCount=0;
 while(t.laserTickT<=0&&tickCount<4){t.laserTickT+=0.12;tickCount++;}
 var w=laserWidth(t),hits=tickCount?rayHits(t,ox,oy,A,t.laserBandMul||1):null;
 laserBeam(t,"main",ox,oy,A,w,"#4ade80");
 var defl=[],sweeps=[],i;
 for(i=0;i<(t.laserDeflect||0);i++)defl.push(A+(i%2?1:-1)*0.3*(1+Math.floor(i/2)));
 /* sweeping lasers swing ±0.8 rad around the locked line; Sweep Boost adds a return pass */
 var passes=t.sweepPasses||1,x=prog*passes,fr=x%2,pos=fr<1?fr:2-fr;
 for(i=0;i<(t.laserSweep||0);i++)sweeps.push(i%2?A+0.8-1.6*pos:A-0.8+1.6*pos);
 defl.forEach(function(a,i){laserBeam(t,"deflect"+i,ox,oy,a,w*0.55,"#86efac");});
 sweeps.forEach(function(a,i){laserBeam(t,"sweep"+i,ox,oy,a,w*0.6,"#a7f3d0");});
 if(t.refract)[-0.34,0.34].forEach(function(a,i){laserBeam(t,"refract"+i,ox,oy,A+a,w*0.5,"#86efac");});
 if(t.gravitonLaser){
  var gx=Math.cos(A),gy=Math.sin(A);
  B.enemies.forEach(function(e){
   if(!onField(e)||e.kind==="boss")return;
   var px=e.x-ox,py=e.y-oy;if(px*gx+py*gy<=0)return;
   var perp=px*gy-py*gx;if(Math.abs(perp)>70||Math.abs(perp)<2)return;
   var st=(perp>0?1:-1)*Math.min(Math.abs(perp),55*dt);
   e.x-=gy*st;e.y+=gx*st;
  });
 }
 if(t.emberrail){
  t.emberT-=dt;
  if(t.emberT<=0){t.emberT=0.4;var L=edgeLen(ox,oy,Math.cos(A),Math.sin(A));
   for(var k=1;k<=3;k++){var fx=ox+Math.cos(A)*L*k/4,fy=oy+Math.sin(A)*L*k/4;if(fy>VIS_TOP&&fy<BASEY-30)addFireField(t,fx,fy,20,2,0.23);}}
 }
 if(!tickCount)return;
 var base=t.cfg.damage*tickCount*(t.laserPower||1);
 var oMain=laserOpts(t),oDefl=laserOpts(t,t.laserSlow?{slow:true,slowPow:0.3}:{}),oSweep=laserOpts(t,t.sweepVuln?{vulnerable:true}:{});
 hits.forEach(function(e){laserHit(t,e,base,oMain);});
 var seen=hits.slice();
 /* Laser Reflection: each reflection is a new beam FROM THE TURRET to the enemy nearest to the
    previous beam's end, -20% per reflection (0.8, 0.64, ...) */
 function reflectFrom(last,count,mul0,o,key){
  var cur=last;
  for(var z=0;z<count;z++){
   /* Nearest candidate in one stable pass: no temporary array, sort or square roots. */
   var nx=null,best=170*170;
   B.enemies.forEach(function(e){
    if(!inRange(t,e)||seen.indexOf(e)>=0)return;
    var dx=e.x-cur.x,dy=e.y-cur.y,d=dx*dx+dy*dy;if(d<best){best=d;nx=e;}
   });
   if(!nx)break;
   laserVisual(t,key+z,ox,oy,nx.x,nx.y,w*0.5,"#86efac");
   laserHit(t,nx,base*mul0*Math.pow(0.8,z+1),o);seen.push(nx);cur=nx;
  }
 }
 if(t.reflect>0&&hits.length){
  var far=hits.reduce(function(a,b){return Math.hypot(b.x-ox,b.y-oy)>Math.hypot(a.x-ox,a.y-oy)?b:a;});
  reflectFrom(far,t.reflect,1,oMain,"reflection");
 }
 defl.forEach(function(a,i){
  var dh=rayHits(t,ox,oy,a,1,hits);
  dh.forEach(function(e){laserHit(t,e,base*0.5,oDefl);});
  if(t.deflectReflect&&dh.length)reflectFrom(dh[dh.length-1],t.deflectReflect,0.5,oDefl,"deflectReflection"+i+":");
 });
 sweeps.forEach(function(a){rayHits(t,ox,oy,a,1,hits).forEach(function(e){laserHit(t,e,base*0.8,oSweep);});});
 if(t.refract)[-0.34,0.34].forEach(function(a){rayHits(t,ox,oy,A+a,1,hits).forEach(function(e){laserHit(t,e,base*0.5,oMain);});});
 if(t.beamSplit){
  var others=B.enemies.filter(function(e){return inRange(t,e)&&hits.indexOf(e)<0;});
  if(others.length){var e2=others[0];laserVisual(t,"split",ox,oy,e2.x,e2.y,w*0.6,"#4ade80");laserHit(t,e2,t.cfg.damage*0.7*tickCount,oMain);}
 }
 if(t.convergence&&hits.length){
  var made=0;
  hits.forEach(function(e){
   if(made>=2||Math.random()>=0.3)return;
   var o=nearestList(e.x,e.y,1,200,seen)[0];
   if(o){laserVisual(t,"convergence"+made,ox,oy,o.x,o.y,w*0.5,"#bbf7d0",0.12);made++;seen.push(o);laserHit(t,o,base*0.5,oMain);}
  });
 }
 if(t.tearExplosion&&hits.length&&Math.random()<1-Math.pow(0.8,Math.min(3,hits.length)))
  ripLaser(t,ox,oy,A+(Math.random()-0.5)*0.5,t.cfg.damage*1.5);
}
function beamOpts(t){
 var o={kind:"beam",vulnerable:!!(t.laserVulnerable||t.beamVulnerable)};
 if(t.beamSlow){o.slow=true;o.slowPow=0.3;}
 return o;
}
/* Beam: a continuous focused stream (drawn as a thick pulsing stream in 06-render while active) */
function fireFocusedBeam(t,dt){
 t.cd-=dt;
 t.beamVisT=Math.max(0,(t.beamVisT||0)-dt);
 if(t.beamTicks<=0){
  if(t.cd>0)return;
  var first=pickTarget(t);if(!first)return;
  var interval=Math.max(0.08,t.beamInterval||0.2);
  t.beamTicks=Math.round(4.0*t.durationMul*(t.beamDurationMul||1)*(1+(t.beamKillBonus||0))/interval);
  t.beamTickT=0;t.beamTarget=first;t.beamRamp=0;
  t.cd=10.0*t.metaCd/t.haste;
  SFX.laser();
 }
 t.beamTickT-=dt;
 var steps=0;
 while(t.beamTickT<=0&&t.beamTicks>0&&steps++<4){
  t.beamTickT+=Math.max(0.08,t.beamInterval||0.2);
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
  var opts=beamOpts(t);
  dealDamage(t,target,t.cfg.damage*1.45*(t.beamPower||1)*ramp,opts);
  t.beamVisT=0.3;t.beamVisX=target.x;t.beamVisY=target.y;t.beamVisRamp=ramp;
  if(cap)t.beamRamp+=0.09;
  if(t.targetExplosion)explodeAt(t,target.x,target.y,35,t.cfg.damage*0.4,{kind:"beamx"},"#38bdf8");
  if(t.disruptiveBeam&&B.t-(t.disrBeamT===undefined?-9:t.disrBeamT)>1){t.disrBeamT=B.t;var dsrc=unitOf("disruption");addDisruptionField(dsrc||t,target.x,target.y,{r:26,life:1.5,dmgScale:dsrc?1:0.12,small:true});}
  if(t.bhSpotlight&&B.t-(t.bhT===undefined?-9:t.bhT)>1.5){t.bhT=B.t;addBlackHole(t,target.x,target.y,40,70,2,t.cfg.damage*0.15);}
  if(t.beamLightning&&Math.random()<0.3)chainLightning(t,target,3,t.cfg.damage*0.4);
  if(t.matrixResonance&&B.t-(t.mrT===undefined?-9:t.mrT)>1){t.mrT=B.t;addMatrix(t,target.x,target.y,70,1.6,{expanding:true,dmg:t.cfg.damage*0.2});}
  if(t.beeWave&&ramp>1.3&&Math.random()<0.4&&B.t-(t.bwT===undefined?-9:t.bwT)>0.5){t.bwT=B.t;addPulse(t,target.x,target.y,60,t.cfg.damage*0.4);}
  if(t.beamSplit){
   var extra=B.enemies.filter(function(e){return e!==target&&inRange(t,e);});
   var alt=extra.length?extra[0]:target;
   beamFx(t.x,t.y-10,alt.x,alt.y,"#7dd7ff",2.5);
   dealDamage(t,alt,t.cfg.damage*0.75,{kind:"beam"});
  }
  /* Beam Refraction: refracted beams jump from the target to the nearest other enemies */
  var nref=t.beamRefractions||(t.refract?2:0);
  if(nref>0){
   var other=B.enemies.filter(function(e){return e!==target&&inRange(t,e);})
    .sort(function(a,b){return Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y);}).slice(0,nref);
   other.forEach(function(e){
    beamFx(target.x,target.y,e.x,e.y,"#38bdf8",2);
    dealDamage(t,e,t.cfg.damage*0.55,{kind:"beam",vulnerable:!!t.beamVulnerable});
    if(t.refractPull&&e.kind!=="boss"&&aliveE(e)){e.x+=(target.x-e.x)*0.25;e.y+=(target.y-e.y)*0.25;}
    if(t.refractExplosion)explodeAt(t,e.x,e.y,30,t.cfg.damage*0.3,{kind:"beamx"},"#38bdf8");
   });
  }
 }
}
/* ---------- Thunderbolt: vertical lightning strikes (width = DMG range) ---------- */
function thunderStrike(t,x,mul){
 var hw=14*(t.strikeWidthBase||1)*(t.strikeWidthMul||1);
 var hits=B.enemies.filter(function(e){return inRange(t,e)&&Math.abs(e.x-x)<=hw+e.r*0.5;});
 var low=hits.reduce(function(m,e){return Math.max(m,e.y);},VIS_TOP+160);
 B.beams.push({x1:x,y1:VIS_TOP,x2:x,y2:low,color:"#c084fc",w:Math.max(3,hw*0.35),t:0,life:0.18,bolt:true});
 ringFx(x,low,"#c084fc",90);
 var dmg=t.cfg.damage*mul,pd=1.0*(t.paraDurMul||1);
 hits.forEach(function(e){
  var mh=e.maxHp;
  dealDamage(t,e,dmg,{kind:"strike"});
  if(!aliveE(e))return;
  if(t.thunderParalyze&&applyParalyze(e,pd)){
   if(t.lifeErosion)trueDamage(t,e,Math.min(0.01*mh,20000*t.cfg.damage*t.dmgMul));
   if(t.paraShock&&aliveE(e)){e.paraShockSrc=t;e.paraShockT=1;}
  }
  if(t.thunderChain){e.thunderChainT=2;e.tcSrc=t;}
  if(t.lightningTeleport&&Math.random()<0.5)teleportBack(e,false,null);
  if(t.strikeBurst&&Math.random()<0.1)explodeAt(t,e.x,e.y,50,t.cfg.damage*1.2,{kind:"burst"},"#c084fc");
 });
 if(hits.length){
  if(t.chainLightning)chainLightning(t,hits[0],t.chainTargets||5,t.cfg.damage*0.6*(t.chainInterference?2:1));
  if(t.aftershockMine&&Math.random()<0.5)addMine(t,hits[0].x,hits[0].y);
 }
 if(t.lightningTrail)[0.4,0.65,0.9].forEach(function(f){var y=VIS_TOP+(low-VIS_TOP)*f;addFireField(t,x,y,18,2,0.2);});
 if(t.stormcall){var o=nearestList(x,VIS_TOP+30,1,700)[0];if(o){beamFx(x,VIS_TOP+30,o.x,o.y,"#e9d5ff",2.5);dealDamage(t,o,t.cfg.damage,{kind:"beam2",dtype:"energy"});}}
 SFX.zap();
 return hits;
}
function fireThunder(t,target){
 var xs=[target.x],n=Math.max(1,t.strikes||1);
 if(n>1){
  var cands=B.enemies.filter(function(e){return inRange(t,e)&&e!==target;}).sort(function(a,b){return b.y-a.y;});
  for(var i=0;i<cands.length&&xs.length<n;i++){var cx=cands[i].x;if(xs.every(function(x){return Math.abs(x-cx)>20;}))xs.push(cx);}
 }
 xs.forEach(function(x){
  thunderStrike(t,x,1);
  if(t.extraStrike&&Math.random()<0.5)thunderStrike(t,x,1);
 });
 t.recoil=3;
}
/* ---------- Disruption fields ---------- */
function addDisruptionField(t,x,y,o){
 if(B.fields.length>=FX_CAP.fields)return null;
 o=o||{};
 var f={kind:"slow",x:x,y:y,r:o.r||Math.max(80,t.splash),life:(o.life||3.0)*(o.small?1:t.durationMul*(t.fieldDurMul||1)),age:0,seed:Math.random()*1000,
  src:t,tick:0.1,dmgScale:o.dmgScale||1,shotT:0.5,laserAng:Math.random()*6.28,laserT:0,small:!!o.small,fortress:!!o.fortress};
 B.fields.push(f);return f;
}
function addFireField(t,x,y,r,life,dmgF){
 if(B.fields.length>=FX_CAP.fields||B.fields.filter(function(f){return f.kind==="firetrail";}).length>=28)return null;
 var f={kind:"firetrail",x:x,y:y,r:r,life:life,src:t,tick:0.15,dmgF:dmgF||0.23};B.fields.push(f);return f;
}
/* ---------- Gravity Vortex Gun: a moving field with a flight range ---------- */
function spawnGravityField(t,x,y,ang,o){
 o=o||{};
 if(B.fields.length>=FX_CAP.fields)return null;
 var range=o.range||t.gravityRange||260,sp=95;
 var ex=Math.max(20,Math.min(W-20,x+Math.cos(ang)*range)),ey=Math.max(VIS_TOP+20,Math.min(BASEY-35,y+Math.sin(ang)*range));
 var f={kind:"gravity",x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,speed:sp,r:o.r||t.gravityRadius,r0:o.r||t.gravityRadius,traveled:0,range:range,
  life:range/sp+0.5,src:t,tick:0.15,pull:t.gravityPull,power:t.gravityPower||1,sub:!!o.sub,portalDone:false,shockT:0.5,ended:false,bounces:0,ex:ex,ey:ey,binary:!!t.binaryStarsCard};
 B.fields.push(f);return f;
}
function endGravityField(f){
 if(f.ended)return;f.ended=true;f.life=Math.min(f.life,0.3);
 var t=f.src;
 if(t.smallBH)addBlackHole(t,f.x,f.y,55*(t.bhRMul||1),80*(t.bhPullMul||1),5,t.cfg.damage*0.4*(t.bhDmgMul||1));
 if(t.doubleFission&&!f.sub){
  var a=Math.atan2(f.vy,f.vx);
  [-0.6,0.6].forEach(function(d){spawnGravityField(t,f.x,f.y,a+d,{r:f.r0*0.6,range:f.range*0.5,sub:true});});
 }
}
function fireGravity(t,target){
 var mine=B.fields.filter(function(f){return f.kind==="gravity"&&f.src===t;}).length;
 var n=1+(t.extraFields||0);if(mine>=4+n)return;
 var a=Math.atan2(target.y-(t.y-40),target.x-t.x),px=-Math.sin(a),py=Math.cos(a);
 /* extra fields fly parallel to the main one (30px lateral offset), not in a spread */
 for(var k=0;k<n;k++){var off=(k-(n-1)/2)*30;spawnGravityField(t,Math.max(20,Math.min(W-20,t.x+px*off)),t.y-40+py*off,a);}
 ringFx(t.x,t.y-20,"#8cb5ff",120);t.recoil=3;SFX.zap();
}
/* ---------- Hive ---------- */
function waspBoost(tier){return tier>=3?2:tier===2?1.5:1;}
function fireHive(t,target){
 t.recoil=2;t.volleys=(t.volleys||0)+1;
 var hcount=Math.min(12,t.hiveCount*(t.hiveDouble?2:1))+(t.stored||0);t.stored=0;
 var tiers=[];for(var h=0;h<hcount;h++)tiers.push(1);
 if(t.volleys%2===0){
  if(t.mutation3&&Math.random()<0.5)tiers.push(3);else if(t.mutation2)tiers.push(2);
 }
 tiers.forEach(function(tier){
  if(B.drones.length>=FX_CAP.drones)return;
  /* wasps fly out in an upward fan, then home in (see update); max 2 wasps per target */
  var la=-Math.PI/2+(Math.random()*1.1-0.55),lr=10+Math.random()*4;
  var dr=newWasp(t,t.x+Math.cos(la)*lr,t.y-10+Math.sin(la)*lr,{launchT:0.25,vx:Math.cos(la)*120,vy:Math.sin(la)*120,tier:tier,boost:waspBoost(tier)});
  dr.evolved=tier>1;
  B.drones.push(dr);
  dr.tgt=pickDroneTarget(dr)||target;
 });
 SFX.shoot();
}
/* ---------- Firewheel ---------- */
function fireWheel(t){
 var active=B.wheels.some(function(w){return w.src===t&&!w.mini;});
 if(active)return false;
 t.cd-=0;if(t.cd>0)return false;
 var sp=200,r=20*(t.wheelSizeMul||1),ang=t.angle;
 B.wheels.push({x:t.x,y:t.y-13,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,src:t,life:(10*t.durationMul+(t.wheelDurationBonus||0))*(t.wheelDurMul||1),
  speed:sp,r:r,bounces:0,last:new Map(),hits:0,age:0,miniT:3,pulseT:1.5,trailT:0,lastDmgT:-9});
 t.recoil=3;SFX.shoot();return true;
}
/* ---------- Aeroblast ---------- */
function aeroVolley(t,target){
 var cfg=t.cfg,ap=aimPoint(t,target);
 t.angle=Math.atan2(ap.y-(t.y-10),ap.x-t.x);
 var charged=!!t.chargeBlast&&(Math.random()<0.3||!!(B.soldier&&B.soldier.chargedLeft>0));
 /* SHOTGUN: the spread is wide up close but narrows toward distant targets */
 var pellets=(t.aeroPellets||5)+t.extraProj,mid=Math.floor(pellets/2);
 var targetDist=Math.hypot(ap.x-t.x,ap.y-(t.y-10));
 var spreadStep=Math.min(0.14,14/Math.max(90,targetDist));
 for(var k=0;k<pellets&&B.projs.length<FX_CAP.projs;k++){
   var a=t.angle+(k-(pellets-1)/2)*spreadStep;
   B.projs.push({x:t.x,y:t.y-10,vx:Math.cos(a)*cfg.projSpeed,vy:Math.sin(a)*cfg.projSpeed,src:t,dmg:cfg.damage*(charged?2:1),pierce:t.pelletPierce||0,
    hitSet:[],life:2.6,tgt:target,main:k===mid,bounce:t.bounceCount||0,charged:charged});
 }
 var shells=(t.aeroShells||0)+(t.aeroLoaded||0);t.aeroLoaded=0;
 for(var s=0;s<shells;s++){
  var sa=t.angle+(s-(shells-1)/2)*0.05;
  addShell(t,t.x,t.y-10,sa,cfg.damage*0.4*(t.shellDmgMul||1),0.7*(t.shellRangeMul||1),{pierce:99,color:"#bae6fd",speed:640});
 }
 t.recoil=6;
 B.parts.push({kind:"muzzle",angle:t.angle,x:t.x+Math.cos(t.angle)*14,y:t.y-10+Math.sin(t.angle)*14,life:.08,t:0,color:charged?"#fde047":cfg.color,r:charged?20:14,vx:0,vy:0});
 SFX.shoot();
}
/* ---------- Teslacoil: charge phase, then the discharge projectile ---------- */
function fireTesla(t,dt){
 if(t.charging>0){
  t.charging-=dt;t.cd-=dt; /* the cooldown runs during the charge, so the charge does not lower the fire rate */
  if(t.coopBeam){t.coopT=(t.coopT||0)-dt;if(t.coopT<=0){t.coopT=0.2;
   B.enemies.filter(function(e){return inRange(t,e);}).sort(function(a,b){return Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y);}).slice(0,2)
    .forEach(function(e){beamFx(t.x,t.y-14,e.x,e.y,"#c4b5fd",2);dealDamage(t,e,t.cfg.damage*0.3,{kind:"tesla",dtype:"energy"});});}}
  if(t.chargedShock){t.shockT=(t.shockT||0)-dt;if(t.shockT<=0){t.shockT=0.25;
   B.enemies.filter(function(e){return inRange(t,e);}).sort(function(a,b){return Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y);}).slice(0,2)
    .forEach(function(e){arcFx(t.x,t.y-14,e.x,e.y,"#a5f3fc");dealDamage(t,e,t.cfg.damage*0.35,{kind:"shock",dtype:"electric"});});}}
  if(t.charging>0)return;
  var tg=pickTarget(t);if(!tg)return;
  var ap=aimPoint(t,tg);t.angle=Math.atan2(ap.y-(t.y-10),ap.x-t.x);
  firePlain(t,tg,{chargeT:t.chargeUsed});
  return;
 }
 t.cd-=dt;if(t.cd>0)return;
 var target=pickTarget(t);if(!target)return;
 t.cd=1/t.cfg.attackSpeed*t.metaCd/t.haste;
 t.charging=Math.max(0.01,t.chargeTime||0.3);t.chargeUsed=t.charging;t.coopT=0;t.shockT=0;
}
/* ---------- Guardian charge (Charge Activation) ---------- */
function guardianCharge(t,shots){
 if(!t.chargeActive)return;
 if(t.chargedLeft>0){t.chargedLeft=Math.max(0,t.chargedLeft-1);return;}
 t.chargePts=(t.chargePts||0)+shots*(t.chargeGain||1);
 if(t.chargePts>=60){t.chargePts=0;t.chargedLeft=Math.round(20*(t.chargeShots||1));ringFx(t.x,t.y-10,"#fde047",140);}
}
function mirrorX(t){return t.x<W/2?t.x+40:t.x-40;}
/* plain projectile volley: parallel extra projectiles (7px lateral offset); Guardian fires from its hands */
function firePlain(t,target,extra){
 var cfg=t.cfg,n=1+t.extraProj;t.recoil=5;
 var px=-Math.sin(t.angle),py=Math.cos(t.angle);
 function push(o){if(B.projs.length<FX_CAP.projs)B.projs.push(o);return o;}
 if(t.isSoldier){
  var charged=t.chargedLeft>0;
  var hand=(t.handAlt?1:-1)*6;t.handAlt=!t.handAlt;
  var origins=[t.x];if(t.mirrorGuardian)origins.push(mirrorX(t));
  origins.forEach(function(x0,oi){
   var dm=oi?0.5:1;
   for(var k=0;k<n;k++){
    var off=k-(n-1)/2;
    push({x:x0+px*(off*3+hand),y:t.y-10+py*(off*3+hand),vx:Math.cos(t.angle)*cfg.projSpeed,vy:Math.sin(t.angle)*cfg.projSpeed,src:t,dmg:cfg.damage*dm,pierce:t.pierce,hitSet:[],life:2.6,tgt:target,bullet:true,ricochet:t.ricochet||0,charged:charged});
   }
   /* Shotgun Evolution: the documented EXCEPTION to "extra projectiles fly parallel" —
      every shot scatters into shotgunSpread sub-bullets in a real angular spread (±0.12 rad steps) */
   for(var sg=1;sg<=(t.shotgunSpread||0);sg++){
    var sa=t.angle+(sg%2?1:-1)*0.12*Math.ceil(sg/2);
    push({x:x0+px*hand,y:t.y-10+py*hand,vx:Math.cos(sa)*cfg.projSpeed,vy:Math.sin(sa)*cfg.projSpeed,src:t,dmg:cfg.damage*dm,pierce:t.pierce,hitSet:[],life:2.6,tgt:null,scatter:true,bullet:true,ricochet:t.ricochet||0,charged:charged});
   }
  });
  guardianCharge(t,n);
  t.shotCount=(t.shotCount||0)+1;
  if(t.counterburst&&t.shotCount%40===0){
   B.enemies.filter(onField).sort(function(a,b){return b.y-a.y;}).slice(0,6).forEach(function(e){
    addShell(t,t.x,t.y-12,Math.atan2(e.y-(t.y-12),e.x-t.x),cfg.damage*1.5,1.2,{pierce:99,color:"#ffd34d",speed:700});
   });
  }
 }else{
  for(var k2=0;k2<n;k2++){
   var off2=k2-(n-1)/2;
   var p=push({x:t.x+px*off2*7,y:t.y-10+py*off2*7,vx:Math.cos(t.angle)*cfg.projSpeed,vy:Math.sin(t.angle)*cfg.projSpeed,src:t,dmg:cfg.damage,
    pierce:t.pierce+(t.execPierce||0),hitSet:[],life:2.6,tgt:target});
   if(cfg.id==="railgun"){p.rail=true;p.ricochet=t.ricochet||0;}
   if(extra)for(var key in extra)p[key]=extra[key];
  }
  if(cfg.id==="railgun"&&t.armorPulse)addPulse(t,t.x,t.y-60,70,cfg.damage*0.5);
 }
 B.parts.push({x:t.x+Math.cos(t.angle)*14,y:t.y-10+Math.sin(t.angle)*14,vx:Math.cos(t.angle)*46,vy:Math.sin(t.angle)*46,life:0.12,t:0,color:cfg.color,r:2.2});
 if(cfg.id==="skyguard")for(var sm=0;sm<4;sm++)B.parts.push({x:t.x+(sm-1.5)*5.5,y:t.y-25,vx:(sm-1.5)*8,vy:-22,life:0.35,t:0,color:"#8fa1b4",r:2});
 SFX.shoot();
}
function unitFire(t,dt){
 var cfg=t.cfg;
 if(cfg.id==="laser"){fireLaser(t,dt);return;}
 if(cfg.id==="beam"){fireFocusedBeam(t,dt);return;}
 if(cfg.effect==="charge"){fireTesla(t,dt);return;}
 if(cfg.id==="aeroblast"&&t.aeroAgainT>0){t.aeroAgainT-=dt;if(t.aeroAgainT<=0){var rt=pickTarget(t);if(rt)aeroVolley(t,rt);}}
 if(cfg.id==="firewheel"){
  /* one disc at a time; the cooldown starts when the disc is gone (see update) */
  if(B.wheels.some(function(w){return w.src===t&&!w.mini;}))return;
  t.cd-=dt;if(t.cd>0)return;
  var wt=pickTarget(t);if(!wt)return;
  t.angle=Math.atan2(wt.y-(t.y-10),wt.x-t.x);
  fireWheel(t);return;
 }
 t.cd-=dt;
 if(t.cd>0)return;
 var target=pickTarget(t); if(!target)return;
 var ap=aimPoint(t,target); /* leading: the projectile flies to the intercept point of the moving target */
 t.angle=Math.atan2(ap.y-(t.y-10),ap.x-t.x);
 t.cd=1/cfg.attackSpeed*t.metaCd/t.haste;
 if(t.isSoldier&&t.chargedLeft>0)t.cd/=1.5;
 if(cfg.effect==="gravity"){fireGravity(t,target);return;}
 if(cfg.effect==="chain"){fireThunder(t,target);return;}
 if(cfg.effect==="hive"){fireHive(t,target);return;}
 if(cfg.id==="aeroblast"){aeroVolley(t,target);if(t.aeroRepeat)t.aeroAgainT=0.18;return;}
 firePlain(t,target);
 if(cfg.id==="disruption"&&t.fortressSupport&&!B.fields.some(function(f){return f.fortress&&f.src===t;}))
  addDisruptionField(t,W/2,BASEY-110,{r:Math.max(30,t.splash)*1.4,fortress:true});
}
/* ---------- hits ---------- */
function igniteE(src,e,base){var dot=base*0.5*src.dmgMul*(src.burnMul||1);if(dot>e.burnDps){e.burnDps=dot;e.burnSource=src;}e.burnT=3;}
function applyHit(p,e){
 var cfg=p.src.cfg;
 if(p.rail){railHit(p,e);return;}
 if(p.bullet){bulletHit(p,e);return;}
 if(p.kind==="shell"){dealDamage(p.src,e,p.dmg,{kind:"shell",dtype:p.dtype});burst(e.x,e.y,2,p.color);return;}
 if(cfg.effect==="charge"){teslaHit(p,e);return;}
 if(cfg.effect==="rocket"){rocketHit(p,e);return;}
 if(cfg.effect==="knockback"){aeroHit(p,e);return;}
 var opts={};
 if(cfg.effect==="slow"){
  opts={slow:true,slowPow:p.src.slowPow,vulnerable:!!p.src.fieldExpose,kind:"field"};
  addDisruptionField(p.src,e.x,e.y);
 }
 if(cfg.effect==="burn")opts={burn:true};
 dealDamage(p.src,e,p.dmg,opts);
 if(p.src.zapOnHit)zapNeighbour(p,e);
 if(p.src.splash>0){
  B.enemies.forEach(function(o){if(o!==e&&o.hp>0&&!o.dead&&Math.hypot(o.x-e.x,o.y-e.y)<=p.src.splash)dealDamage(p.src,o,p.dmg*0.5,cfg.effect==="slow"?{slow:true,slowPow:p.src.slowPow}:{});});
 }
 if(cfg.effect==="slow")ringFx(e.x,e.y,"#38c8ff",130);
 burst(e.x,e.y,3,cfg.color);
}
function zapNeighbour(p,e){
 var nx2=null,bd2=85;
 B.enemies.forEach(function(o){if(o!==e&&o.hp>0&&!o.dead){var dd=Math.hypot(o.x-e.x,o.y-e.y);if(dd<bd2){bd2=dd;nx2=o;}}});
 if(nx2){arcFx(e.x,e.y,nx2.x,nx2.y,"#c084fc");dealDamage(p.src,nx2,p.dmg*0.5,{});}
}
function bulletHit(p,e){
 var t=p.src,o={kind:"bullet"};
 if(t.flameBullet)o.burn=true;
 if(t.impactBullet)o.knock=4*(p.charged?3:1);
 dealDamage(t,e,p.dmg,o);
 if(t.bulletExplode>0&&Math.random()<t.bulletExplode)explodeAt(t,e.x,e.y,34*(t.bulletExplR||1),t.cfg.damage*0.8*(t.bulletExplDmg||1),{kind:"bulletx"},"#ffd34d");
 if(t.splitBullet&&!p.sub){
  nearestList(e.x,e.y,p.charged?2:1,160,[e]).forEach(function(o2){
   var q=addShell(t,e.x,e.y,Math.atan2(o2.y-e.y,o2.x-e.x),p.dmg*0.5,0.5,{pierce:0,hitSet:[e],color:"#ffd34d",speed:640});
   if(q){q.bullet=true;q.sub=true;}
  });
 }
 /* Laser Shot: the Ripping Laser starts at the Guardian (laser rule: lasers fire from the turret) */
 if(t.laserShot&&Math.random()<0.2*(p.charged?2:1))ripLaser(t,t.x,t.y-14,Math.atan2(e.y-(t.y-14),e.x-t.x),t.cfg.damage*1.5);
 if(t.disruptionFire&&Math.random()<0.1)addDisruption(e,t,1);
 if(t.zapOnHit)zapNeighbour(p,e);
 burst(e.x,e.y,2,t.cfg.color);
}
function splitShell(p,e,n,kind){
 var a0=Math.atan2(p.vy,p.vx);
 for(var i=0;i<n;i++){
  var a=a0+(i-(n-1)/2)*0.35;
  var q=addShell(p.src,e.x,e.y,a,p.dmg*(kind==="small"?0.4:0.5),0.45,{pierce:kind==="small"?1:0,hitSet:[e],color:"#f9a8d4",speed:820});
  if(q){q.rail=true;q.small=kind==="small";q.mini2=kind==="mini";}
 }
}
function railHit(p,e){
 var t=p.src,first=!p.pierced;
 var mul=t.weakSpot?1+0.5*Math.max(0,Math.min(1,e.hp/e.maxHp)):1;
 var o={kind:"rail",dtype:"phys"};
 if(t.railKnock&&!p.small&&!p.mini2)o.knock=t.railKnock;
 if(t.piercingMark)o.physVuln=4;
 dealDamage(t,e,p.dmg*mul,o);
 p.pierced=(p.pierced||0)+1;
 if(t.railExplosive&&!p.mini2){
  var k=p.pierced-1;
  explodeAt(t,e.x,e.y,45*(t.impactSpread?1+0.2*k:1),p.dmg*0.25*(t.impactBoost?1+0.3*k:1),{kind:"railx"},"#f472b6");
 }
 if(first){
  var more=Math.random()<0.2+(t.splitBonus||0)?2:0;
  if(t.splitBase&&!p.small&&!p.mini2)splitShell(p,e,2+more,"small");
  else if(t.splitSmall&&p.small)splitShell(p,e,2+more,"mini");
  if(t.secMine&&!p.small&&!p.mini2)addMine(t,e.x,e.y);
 }
 if(t.lightSplit&&Math.random()<0.1)ripLaser(t,e.x,e.y,Math.atan2(p.vy,p.vx),t.cfg.damage*0.8);
 if(t.zapOnHit)zapNeighbour(p,e);
 burst(e.x,e.y,3,t.cfg.color);
}
function teslaHit(p,e){
 /* direct discharge + area explosion, then a BOUNCE chain with decaying damage */
 var t=p.src,ct=p.chargeT||0;
 var dm=t.chargeDestruction?1+0.5*ct:1;
 var radius=Math.max(55,t.splash||60)*(t.teslaRadiusMul||1)*(t.chargeRadius?1+0.5*ct:1)*(t.expandedShock?1.5:1);
 dealDamage(t,e,p.dmg*0.8*dm,{kind:"tesla"});
 var inner=radius/1.5;
 enemiesIn(e.x,e.y,radius).forEach(function(o){
  var outer=t.expandedShock&&Math.hypot(o.x-e.x,o.y-e.y)>inner;
  dealDamage(t,o,p.dmg*0.65*dm*(outer?0.5:1),{kind:"tesla"});
  if(t.teslaInterference)applyParalyze(o,0.6);
 });
 var bounces=Math.max(0,t.multiCount-1),bounceMul=[0.7,0.5,0.35,0.25,0.2],cur=e,bounced=[e];
 for(var bi=0;bi<bounces;bi++){
  var nx=nearestList(cur.x,cur.y,1,150,bounced)[0];
  if(!nx)break;
  arcFx(cur.x,cur.y,nx.x,nx.y,"#a06bff");
  dealDamage(t,nx,p.dmg*bounceMul[Math.min(bi,bounceMul.length-1)],{kind:"tesla"});
  bounced.push(nx);cur=nx;
 }
 if(t.teslaMatrix)addMatrix(t,e.x,e.y,radius*1.2,2+(t.matrixDurBonus||0),{dmg:t.cfg.damage*0.65*(t.matrixDmgMul||1),slow:true,paralyze:!!t.teslaInterference,bolts:!!t.matrixBolt});
 if(t.chainSurge)shockFrom(t,e.x,e.y,5,p.dmg*0.35,[e]);
 if(t.highvolt)chainLightning(t,e,5,p.dmg*0.4);
 if(t.fission)nearestList(e.x,e.y,2,160,[e]).forEach(function(o){explodeAt(t,o.x,o.y,radius*0.6,p.dmg*0.4,{kind:"tesla"},"#a06bff");});
 if(t.spinLaser)addSpinner(t,e.x,e.y,t.cfg.damage*0.4);
 if(t.stormFlare){var ws=unitOf("firewheel")||t;for(var m=0;m<3;m++)addMiniWheel(ws,e.x,e.y);}
 if(t.waspMirage)addEchoWasp(unitOf("hive")||t,e.x,e.y,0.5,1);
 ringFx(e.x,e.y,"#a06bff",Math.max(170,radius/0.35));burst(e.x,e.y,12,"#a06bff");
}
function rocketHit(p,e){
 /* Sky Guard missile: separate impact and explosion damage, including the impact target.
    Impact Multiplier scales only the impact part; small missiles deal impact only. */
 var t=p.src,o={kind:p.mini?"mini":"rocket"};
 if(t.rocketBurn)o.burn=true;
 dealDamage(t,e,p.dmg*0.55*(t.impactMul||1),o);
 if(t.shockMine&&Math.random()<0.2)addMine(t,e.x,e.y);
 if(t.impactCleave)ripLaser(t,e.x,e.y,Math.atan2(p.vy,p.vx),t.cfg.damage*0.6);
 if(p.mini){
  if(t.thermalMini&&Math.random()<0.6)explodeAt(t,e.x,e.y,Math.max(20,t.splash*0.5),p.dmg*0.7,o,"#ff8a3c");
  if(t.chainReaction&&(p.gen||0)<3&&Math.random()<0.6)launchMiniMissiles(p,e,1);
  burst(e.x,e.y,6,"#ff8a3c");return;
 }
 if(t.impactReinforce>0)launchMiniMissiles(p,e,t.impactReinforce);
 var r=Math.max(24,t.splash);
 explodeAt(t,e.x,e.y,r,p.dmg*0.7,{kind:"rocket",burn:!!t.rocketBurn},"#ff8a3c");
 if(t.burnArea)addFireField(t,e.x,e.y,r*0.8,5,0.23);
 if(t.collapseHole)addBlackHole(t,e.x,e.y,45,70,3,t.cfg.damage*0.2);
 if(t.closeBlast)explodeAt(t,e.x,e.y-r*0.5,r*0.7,p.dmg*0.8,{kind:"rocket"},"#ffd34d");
 if(t.zapOnHit){
  var next=nearestList(e.x,e.y,1,100,[e])[0];
  if(next){arcFx(e.x,e.y,next.x,next.y,"#c084fc");dealDamage(t,next,p.dmg*0.5,{});}
 }
}
function aeroHit(p,e){
 var t=p.src,kn=t.knock*(p.charged?1.5:1);
 dealDamage(t,e,p.dmg,{knock:kn,kind:"aero"});
 if(t.secondaryExplosion&&B.t-(e.secExpT===undefined?-9:e.secExpT)>1){e.secExpT=B.t;addDelayed(t,e,t.cfg.damage*0.6,1,40);}
 var r=t.splash||40;
 if(p.main&&t.gravityBomb)enemiesIn(e.x,e.y,r*1.6,e).forEach(function(o){if(o.kind!=="boss"){o.x+=(e.x-o.x)*0.5;o.y+=(e.y-o.y)*0.5;}});
 var victims=enemiesIn(e.x,e.y,r,e);
 var mul=p.main&&t.chainExplosion?1+Math.min(2,0.2*(victims.length+1)):1;
 victims.forEach(function(o){dealDamage(t,o,p.dmg*0.5*mul,{knock:kn*0.6,kind:"aero"});});
 if(p.main){
  for(var m=0;m<(t.mineCount||0);m++){var a=m*2.4;addMine(t,e.x+Math.cos(a)*r*0.6,e.y+Math.sin(a)*r*0.6);}
  if(t.centralBlast)explodeAt(t,e.x,e.y,r*0.6,t.cfg.damage,{kind:"aero",dtype:"energy"},"#e0f2fe");
  if(t.firewheelSummon){var ws=unitOf("firewheel")||t;[e].concat(victims).slice(0,3).forEach(function(v){addMiniWheel(ws,v.x,v.y);});}
  if(t.shatterImpact){ripLaser(t,e.x,e.y,-Math.PI/2-0.5,t.cfg.damage*1.2);ripLaser(t,e.x,e.y,-Math.PI/2+0.5,t.cfg.damage*1.2);}
 }
 ringFx(e.x,e.y,"#7dd7ff",p.main?170:110);burst(e.x,e.y,5,"#7dd7ff");
}
/* Impact Reinforcement: small missiles (50% of the missile's damage, impact only)
   fly out and home in on the enemies nearest to the impact point. */
function launchMiniMissiles(p,e,count){
 var near=nearestList(e.x,e.y,8,400,[e]);
 var sp=p.src.cfg.projSpeed*0.9,n=count||p.src.impactReinforce,gen=(p.gen||0)+(p.mini?1:0);
 for(var i=0;i<n&&B.projs.length<FX_CAP.projs;i++){
  var a=-Math.PI/2+(i-(n-1)/2)*0.9;
  B.projs.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,src:p.src,dmg:p.mini?p.dmg:p.dmg*0.5,pierce:0,hitSet:[e],life:1.6,tgt:near.length?near[i%near.length]:null,mini:true,gen:gen});
 }
}
/* Segment-circle hit test: detects targets crossed between fast projectile frames. */
function sweptContact(x0,y0,x1,y1,cx,cy,r){
 var dx=x1-x0,dy=y1-y0,den=dx*dx+dy*dy;
 var t=den>0?Math.max(0,Math.min(1,((cx-x0)*dx+(cy-y0)*dy)/den)):0;
 var px=x0+dx*t-cx,py=y0+dy*t-cy;
 return px*px+py*py<=r*r?t:null;
}
