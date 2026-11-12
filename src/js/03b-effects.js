/* ==================== shared card effect systems (docs/turrets-reference.md) ====================
   Floating Mines, Pulse Waves, Ripping Lasers, high-voltage shocks, Chain Lightning, small lightning
   strikes and stationary small Thunderbolts, black holes, Electric Matrices, portals, Spinning Lasers,
   mini Firewheels, Penetrating Shotgun Shells, delayed explosions, Echo Wasps and the status effects
   (Paralyze, Immobilize, Physical Vulnerable, Disruption stacks, teleport-back).
   Every spawner is capped (FX_CAP) so cards cannot flood a phone with entities. */
var FX_CAP={mines:30,pulses:24,bolts:8,holes:6,portals:4,spinners:4,minis:12,delayed:30,projs:400,fields:56,rips:10,drones:90};
function aliveE(e){return !!e&&!e.dead&&e.hp>0;}
function onField(e){return aliveE(e)&&e.y>=VIS_TOP-10&&e.y<=BASEY+12;}
function dist2(e,x,y){var dx=e.x-x,dy=e.y-y;return dx*dx+dy*dy;}
function enemiesIn(x,y,r,exclude){return B.enemies.filter(function(e){if(!onField(e)||e===exclude)return false;var rr=r+(e.r||0)*0.5;return dist2(e,x,y)<=rr*rr;});}
function nearestList(x,y,n,maxD,exclude){
 exclude=exclude||[];
 return B.enemies.filter(function(e){return onField(e)&&exclude.indexOf(e)<0&&dist2(e,x,y)<=maxD*maxD;})
  .sort(function(a,b){return dist2(a,x,y)-dist2(b,x,y);}).slice(0,n);
}
function unitOf(id){if(!B)return null;if(id==="soldier")return B.soldier;return B.turrets.filter(function(u){return u.cfg.id===id;})[0]||null;}
function clampFieldY(y){return Math.max(VIS_TOP+8,Math.min(BASEY-40,y));}
function explodeAt(src,x,y,r,dmg,opts,color){
 var hits=enemiesIn(x,y,r);
 hits.forEach(function(e){dealDamage(src,e,dmg,opts||{});});
 ringFx(x,y,color||"#ffb03c",Math.max(40,r/0.35));burst(x,y,6,color||"#ffb03c");
 return hits;
}
/* damage that ignores multipliers (percent-of-max-HP effects) */
function trueDamage(src,e,d){
 if(!aliveE(e)||d<=0)return;
 e.hp-=d;e.flash=0.08;if(src)src.totalDmg+=Math.max(0,Math.min(d,e.hp+d));
 addNum(e.x,e.y-e.r-4,Math.round(d),false,1.3,e);
 if(e.hp<=0){e.lastSrc=src;killEnemy(e);}
}
/* ---------- statuses ---------- */
function statusFactor(e){return e.kind==="boss"?0.3:e.champion?0.5:1;}
/* after a Paralyze/Immobilize ends the enemy is immune for 1 s, so stacked sources cannot perma-stun */
function applyParalyze(e,dur){
 if(!aliveE(e)||(e.paraImmuneT||0)>0)return false;
 var d=dur*statusFactor(e);e.paralyzeT=Math.max(e.paralyzeT||0,d);e.paraImmuneT=d+1;return true;
}
function applyImmobilize(e,dur){
 if(!aliveE(e)||(e.paraImmuneT||0)>0)return false;
 var d=dur*statusFactor(e);e.immobT=Math.max(e.immobT||0,d);e.paraImmuneT=d+1;return true;
}
function debuffCount(e){
 var n=0;
 if(e.burnT>0)n++;if(e.slowT>0&&e.slowFactor<1)n++;if(e.paralyzeT>0)n++;if(e.immobT>0)n++;
 if(e.vulnerableT>0&&e.vulnerableStacks>0)n++;if(e.physVulnT>0)n++;if(e.disr>0)n++;
 return n;
}
/* teleport-back: "some distance" = 120px, "starting point" = above the screen. Bosses are immune. */
function teleportBack(e,toStart,src){
 if(!aliveE(e)||e.kind==="boss")return false;
 var oy=e.y;e.y=toStart?-20:Math.max(-20,e.y-120*(e.champion?0.5:1));
 ringFx(e.x,oy,WEAPON_COLOR.disruption,90);ringFx(e.x,Math.max(VIS_TOP,e.y),WEAPON_COLOR.disruption,90);
 if(src&&src.teleportDamage)trueDamage(src,e,Math.min(0.03*e.maxHp,60000*src.cfg.damage*src.dmgMul));
 return true;
}
function addDisruption(e,src,n){
 if(!aliveE(e))return;
 var own=unitOf("disruption")||src,max=own.disrMax||3;
 e.disr=(e.disr||0)+n;e.disrT=5;
 if(e.disr>=max){
  e.disr=0;var pw=own.disrPower||1;
  ringFx(e.x,e.y,WEAPON_COLOR.disruption,120);
  dealDamage(own,e,own.cfg.damage*2*pw,{kind:"disr",dtype:"force"});
  if(own.disrBurst&&aliveE(e))dealDamage(own,e,own.cfg.damage*6*pw,{kind:"disr",dtype:"force"});
  if(own.areaDisr)explodeAt(own,e.x,e.y,50,own.cfg.damage*2*pw,{kind:"disr",dtype:"force"},WEAPON_COLOR.disruption);
 }
}
/* ---------- spawners ---------- */
function addMine(src,x,y){
 if(B.mines.length>=FX_CAP.mines)return null;
 var m={x:Math.max(12,Math.min(W-12,x)),y:clampFieldY(y),src:src,life:10,arm:0.35,ph:Math.random()*6.28};
 B.mines.push(m);return m;
}
function addPulse(src,x,y,R,dmg){
 if(B.pulses.length>=FX_CAP.pulses)return null;
 var p={x:x,y:y,R:R*(src.pulseRMul||1),r:0,t:0,src:src,dmg:dmg,hit:[]};
 B.pulses.push(p);return p;
}
function ripBudget(){
 if(B.t-(B.ripWinT||-9)>1){B.ripWinT=B.t;B.ripN=0;}
 if(B.ripN>=FX_CAP.rips)return false;B.ripN++;return true;
}
/* Ripping Laser: a short-lived wide tearing beam along a line */
function ripLaser(src,x,y,ang,dmg){
 if(!ripBudget())return [];
 var dx=Math.cos(ang),dy=Math.sin(ang),len=240,hits=[];
 B.enemies.forEach(function(e){
  if(!onField(e))return;
  var px=e.x-x,py=e.y-y,pr=px*dx+py*dy;
  if(pr>0&&pr<len&&Math.abs(px*dy-py*dx)<=e.r+9)hits.push(e);
 });
 B.beams.push({x1:x,y1:y,x2:x+dx*len,y2:y+dy*len,color:WEAPON_COLOR.laser,ripping:true,w:3.5,t:0,life:0.16});
 hits.forEach(function(e){dealDamage(src,e,dmg,{kind:"rip",dtype:"energy"});});
 return hits;
}
function shockFrom(src,x,y,n,dmg,exclude){
 var ts=nearestList(x,y,n,110,exclude);
 ts.forEach(function(o){arcFx(x,y,o.x,o.y,WEAPON_COLOR.tesla);dealDamage(src,o,dmg,{dtype:"electric",kind:"shock"});});
 return ts;
}
function chainLightning(src,e0,jumps,dmg,opts){
 opts=opts||{};var hit=[e0],cur=e0,thunder=src.cfg.id==="thunder"?src:null;
 for(var j=0;j<jumps;j++){
  var nx=nearestList(cur.x,cur.y,1,120,hit)[0];
  if(!nx)break;
  arcFx(cur.x,cur.y,nx.x,nx.y,"#d8b4fe");
  var o={dtype:"electric",kind:"chainL",noTC:opts.noTC};
  dealDamage(src,nx,dmg,o);
  if(thunder){
   if(thunder.chainInterference)applyParalyze(nx,1.0*(thunder.paraDurMul||1));
   if(thunder.chainStrike&&Math.random()<0.25)smallStrike(thunder,nx.x,thunder.cfg.damage*0.5);
   if(thunder.lightningTeleport&&Math.random()<0.5)teleportBack(nx,false,null);
  }
  hit.push(nx);cur=nx;
 }
 return hit.slice(1);
}
function boltFx(x,y2,color,w){B.beams.push({x1:x,y1:VIS_TOP,x2:x,y2:y2,color:color||"#c4b5fd",w:w||2,t:0,life:0.16,bolt:true});}
/* small lightning strike: a narrow vertical bolt at x */
function smallStrike(src,x,dmg){
 var hits=B.enemies.filter(function(e){return onField(e)&&Math.abs(e.x-x)<=9+e.r*0.5;});
 var low=hits.reduce(function(m,e){return Math.max(m,e.y);},VIS_TOP+120);
 boltFx(x,low,"#ddd6fe",1.6);
 hits.forEach(function(e){dealDamage(src,e,dmg,{dtype:"electric",kind:"smallStrike"});});
 return hits;
}
/* stationary small Thunderbolt: strikes the nearest enemy every 0.6 s */
function addBolt(src,x,y,life){
 if(B.bolts.length>=FX_CAP.bolts)return null;
 var b={x:x,y:clampFieldY(y),src:src,life:life||5,cd:0.2};B.bolts.push(b);return b;
}
function addBlackHole(src,x,y,r,pull,life,dmg){
 if(B.fields.filter(function(f){return f.kind==="blackhole";}).length>=FX_CAP.holes||B.fields.length>=FX_CAP.fields)return null;
 var f={kind:"blackhole",x:x,y:clampFieldY(y),r:r,pull:pull,life:life,src:src,tick:0.1,dmg:dmg};
 B.fields.push(f);return f;
}
function addMatrix(src,x,y,r,life,o){
 if(B.fields.length>=FX_CAP.fields)return null;
 o=o||{};
 var f={kind:"matrix",x:x,y:y,r:o.expanding?12:r,rMax:r,expanding:!!o.expanding,life:life,maxLife:life,src:src,tick:0.1,
  dmg:o.dmg||src.cfg.damage*0.65,slow:!!o.slow,paralyze:!!o.paralyze,boltT:0.5,bolts:!!o.bolts};
 B.fields.push(f);return f;
}
function addPortal(src,x,y,r,ex,ey,life){
 if(B.portals.length>=FX_CAP.portals)return null;
 var p={x:x,y:y,r:r,ex:Math.max(16,Math.min(W-16,ex)),ey:Math.max(VIS_TOP+10,ey),life:life,src:src,used:[]};
 B.portals.push(p);return p;
}
function addSpinner(src,x,y,dmg){
 if(B.spinners.length>=FX_CAP.spinners)return null;
 var s={x:x,y:y,ang:Math.random()*6.28,life:1.6,tick:0,src:src,dmg:dmg,len:90};B.spinners.push(s);return s;
}
function addMiniWheel(src,x,y){
 if(B.wheels.filter(function(w){return w.mini;}).length>=FX_CAP.minis)return null;
 var a=Math.random()*6.28,sp=230;
 var w={mini:true,x:x,y:clampFieldY(y),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,src:src,life:4*(src.miniDurMul||1),speed:sp,r:9,
  bounces:0,last:new Map(),hits:0,age:0};
 B.wheels.push(w);return w;
}
function addShell(src,x,y,ang,dmg,life,o){
 if(B.projs.length>=FX_CAP.projs)return null;
 o=o||{};var sp=o.speed||620;
 var p={kind:"shell",x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,src:src,dmg:dmg,pierce:o.pierce===undefined?99:o.pierce,
  hitSet:o.hitSet||[],life:life,tgt:null,color:o.color||"#e2e8f0",dtype:o.dtype};
 B.projs.push(p);return p;
}
function addDelayed(src,e,dmg,delay,r){
 if(B.delayed.length>=FX_CAP.delayed)return null;
 var d={src:src,e:e,x:e.x,y:e.y,t:delay,dmg:dmg,r:r||40};B.delayed.push(d);return d;
}
function newWasp(src,x,y,o){
 o=o||{};
 return {x:x,y:y,src:src,life:o.life||20*src.durationMul,tgt:null,hitT:0,hits:o.hits||src.hiveAttacks||5,boost:o.boost||1,phase:Math.random()*6.283,/* 2026-11-12, owner order: wasps live 20 s at base (8.5 -> 12.75 -> 20); phase drives the flutter weave so they do not fly straight like projectiles */
  tier:o.tier||1,echoed:!!o.isEcho,isEcho:!!o.isEcho,launchT:o.launchT||0,vx:o.vx||0,vy:o.vy||0,fury:0,attacks:0};
}
function addEchoWasp(src,x,y,power,tier){
 if(B.drones.length>=FX_CAP.drones)return null;
 var hs=src.hiveAttacks?Math.max(2,Math.ceil(src.hiveAttacks*0.65)):3;
 var d=newWasp(src,x,y,{life:6.5,hits:hs,boost:power,isEcho:true,tier:tier||1});
 B.drones.push(d);return d;
}
/* ---------- kill hooks (attribution: e.lastSrc / e.lastKind set by dealDamage) ---------- */
function onKill(e){
 var s=e.lastSrc,k=e.lastKind||"";
 if(e.burnT>0&&e.burnSource&&e.burnSource.deathIgnition){var bs=e.burnSource;explodeAt(bs,e.x,e.y,45,bs.cfg.damage*0.8,{kind:"ignite",dtype:"fire"},bs.cfg.color);}
 if(e.y>=VIS_TOP)for(var i=0;i<B.fields.length;i++){var f=B.fields[i];
  if(f.kind==="slow"&&f.src.interferenceCore&&dist2(e,f.x,f.y)<=f.r*f.r){if(Math.random()<0.3)addBolt(f.src,e.x,e.y,5);break;}}
 if(!s||!s.cfg)return;
 var id=s.cfg.id;
 if(id==="skyguard"&&s.detonationBolt&&(k==="rocket"||k==="mini"))addBolt(s,e.x,e.y,5);
 if(id==="thunder"&&s.slaughterBolt&&k==="strike"&&Math.random()<0.6)addBolt(s,e.x,e.y,5);
 if(id==="aeroblast"&&s.extraLoading)s.aeroLoaded=Math.min(10,(s.aeroLoaded||0)+1);
 if(id==="railgun"&&k==="rail"){
  if(s.surgePierceCard&&Math.random()<0.5)shockFrom(s,e.x,e.y,3,s.cfg.damage*0.5,[e]);
  if(s.execPen)s.execPierce=Math.min(5,(s.execPierce||0)+1);
 }
 if(id==="beam"&&s.slaughterBeam&&k==="beam")s.beamKillBonus=Math.min(1,(s.beamKillBonus||0)+0.1);
 if(id==="firewheel"&&k==="wheel"){
  s.wheelKills=(s.wheelKills||0)+1;
  if(s.wheelKills%2===0){
   if(s.killingArray){addMiniWheel(s,e.x,e.y);addMiniWheel(s,e.x,e.y);}
   if(s.killingCharge)s.chargeCut=Math.min(5,(s.chargeCut||0)+0.5);
  }
 }
 if(id==="soldier"&&s.electricBullet&&k==="bullet"&&Math.random()<0.5)smallStrike(s,e.x,s.cfg.damage*1.5);
}
/* ---------- per-frame update of the shared systems ---------- */
function updateEffects(dt){
 var i;
 for(i=B.mines.length-1;i>=0;i--){
  var m=B.mines[i];m.life-=dt;m.arm-=dt;m.ph+=dt*3;
  var trig=m.arm<=0&&B.enemies.some(function(e){return onField(e)&&Math.hypot(e.x-m.x,e.y-m.y)<=e.r+14;});
  if(trig){
   var ms=m.src;
   explodeAt(ms,m.x,m.y,40,ms.cfg.damage*(ms.mineDmgMul||1),{kind:"mine",knock:10*(ms.mineKnockMul||1)},WEAPON_COLOR.aeroblast);
  }
  if(trig||m.life<=0)B.mines.splice(i,1);
 }
 for(i=B.pulses.length-1;i>=0;i--){
  var p=B.pulses[i];p.t+=dt;p.r=p.R*Math.min(1,p.t/0.35);
  B.enemies.forEach(function(e){
   if(!onField(e)||p.hit.indexOf(e)>=0||dist2(e,p.x,p.y)>(p.r+e.r)*(p.r+e.r))return;
   p.hit.push(e);dealDamage(p.src,e,p.dmg,p.src.pulseSlow?{kind:"pulse",slow:true,slowPow:0.3}:{kind:"pulse"});
  });
  if(p.t>=0.45)B.pulses.splice(i,1);
 }
 for(i=B.bolts.length-1;i>=0;i--){
  var b=B.bolts[i];b.life-=dt;b.cd-=dt;
  if(b.cd<=0){b.cd=0.6;var tg=nearestList(b.x,b.y,1,150)[0];if(tg)smallStrike(b.src,tg.x,b.src.cfg.damage*0.5);}
  if(b.life<=0)B.bolts.splice(i,1);
 }
 for(i=B.portals.length-1;i>=0;i--){
  var po=B.portals[i];po.life-=dt;
  B.enemies.forEach(function(e){
   if(!onField(e)||e.kind==="boss"||po.used.indexOf(e)>=0||Math.hypot(e.x-po.x,e.y-po.y)>po.r+e.r*0.5)return;
   po.used.push(e);e.x=po.ex;e.y=Math.min(e.y,po.ey);ringFx(po.ex,po.ey,WEAPON_COLOR.gravity,80);
  });
  if(po.life<=0)B.portals.splice(i,1);
 }
 for(i=B.spinners.length-1;i>=0;i--){
  var sp=B.spinners[i];sp.life-=dt;sp.ang+=7*dt;sp.tick-=dt;
  if(sp.tick<=0){
   sp.tick=0.15;var dx=Math.cos(sp.ang),dy=Math.sin(sp.ang);
   B.enemies.forEach(function(e){
    if(!onField(e))return;var px=e.x-sp.x,py=e.y-sp.y,pr=px*dx+py*dy;
    if(Math.abs(pr)<=sp.len&&Math.abs(px*dy-py*dx)<=e.r+7)dealDamage(sp.src,e,sp.dmg,{kind:"spin",dtype:"energy"});
   });
  }
  if(sp.life<=0)B.spinners.splice(i,1);
 }
 for(i=B.delayed.length-1;i>=0;i--){
  var d=B.delayed[i];d.t-=dt;if(aliveE(d.e)){d.x=d.e.x;d.y=d.e.y;}
  if(d.t<=0){explodeAt(d.src,d.x,d.y,d.r,d.dmg,{kind:"delayed"},WEAPON_COLOR.aeroblast);B.delayed.splice(i,1);}
 }
}
/* ---------- rendering of the shared systems (no RNG) ---------- */
function drawEffects(){
 B.mines.forEach(function(m){
  ctx.save();ctx.translate(m.x,m.y+Math.sin(m.ph)*2);
  ctx.fillStyle="#1e293b";ctx.strokeStyle=m.arm>0?"#64748b":WEAPON_COLOR.aeroblast;ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(0,0,5.5,0,6.29);ctx.fill();ctx.stroke();
  ctx.fillStyle=Math.sin(m.ph*2)>0?"#f87171":WEAPON_COLOR.aeroblast;ctx.beginPath();ctx.arc(0,0,1.8,0,6.29);ctx.fill();
  ctx.restore();
 });
 B.pulses.forEach(function(p){
  ctx.save();ctx.globalAlpha=Math.max(0,1-p.t/0.45);ctx.strokeStyle=p.src.cfg.color;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.01,p.r),0,6.29);ctx.stroke();ctx.restore();
 });
 B.bolts.forEach(function(b){
  ctx.save();ctx.globalAlpha=Math.min(1,b.life);ctx.fillStyle="#c4b5fd";ctx.shadowColor="#a78bfa";ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(b.x,b.y-8);ctx.lineTo(b.x+5,b.y);ctx.lineTo(b.x,b.y+8);ctx.lineTo(b.x-5,b.y);ctx.closePath();ctx.fill();ctx.restore();
 });
 B.portals.forEach(function(p){
  ctx.save();ctx.globalAlpha=Math.min(0.8,p.life);ctx.strokeStyle=WEAPON_COLOR.gravity;ctx.lineWidth=2.5;ctx.setLineDash([5,4]);
  ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.01,p.r),B.t*2,B.t*2+6.29);ctx.stroke();
  ctx.beginPath();ctx.arc(p.ex,p.ey,Math.max(0.01,p.r*0.7),-B.t*2,-B.t*2+6.29);ctx.stroke();ctx.setLineDash([]);ctx.restore();
 });
 B.spinners.forEach(function(s){
  var dx=Math.cos(s.ang)*s.len,dy=Math.sin(s.ang)*s.len;
  ctx.save();ctx.globalAlpha=Math.min(1,s.life*2);ctx.strokeStyle=WEAPON_COLOR.laser;ctx.lineWidth=3;ctx.shadowColor=WEAPON_COLOR.laser;ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(s.x-dx,s.y-dy);ctx.lineTo(s.x+dx,s.y+dy);ctx.stroke();ctx.restore();
 });
}
/* ==================== per-entity update helpers used by update() ==================== */
/* one wasp attack; returns true when the wasp has used up its attacks */
function waspSting(dr){
 var src=dr.src,tgt=dr.tgt;
 var sting=src.cfg.damage*0.65*dr.boost*(1+(dr.fury||0));
 dealDamage(src,tgt,sting,{kind:"wasp",dtype:"force",burn:!!src.hiveBurn});
 if(src.waspImmobilize&&Math.random()<0.2)applyImmobilize(tgt,1.2);
 if(src.contactPulse&&!dr.pulsed){dr.pulsed=true;addPulse(src,tgt.x,tgt.y,55,src.cfg.damage*0.5);}
 /* Electro-Wasps: 50% chance per attack of a high-voltage shock at up to 2 nearby enemies */
 if(src.electroWasps&&Math.random()<0.5){
  nearestList(tgt.x,tgt.y,2,80,[tgt]).forEach(function(o){arcFx(tgt.x,tgt.y,o.x,o.y,WEAPON_COLOR.tesla);dealDamage(src,o,sting*0.6,{dtype:"electric",kind:"shock"});});
 }
 /* Volley Wasp: every extra wasp bullet stings another enemy nearby */
 if(src.waspBullets>0)nearestList(tgt.x,tgt.y,src.waspBullets,90,[tgt]).forEach(function(o){beamFx(dr.x,dr.y,o.x,o.y,WEAPON_COLOR.hive,1.2);dealDamage(src,o,sting,{kind:"wasp",dtype:"force"});});
 if(src.aeroSplit&&Math.random()<0.6){
  nearestList(tgt.x,tgt.y,3,200,[tgt]).forEach(function(o){addShell(src,dr.x,dr.y,Math.atan2(o.y-dr.y,o.x-dr.x),src.cfg.damage*0.4,0.5,{pierce:2,dtype:"phys",color:WEAPON_COLOR.aeroblast,speed:760});});
 }
 if(src.swarmFury)dr.fury=(dr.fury||0)+0.3;
 /* Wasp Evolution II / III: Wasp I → II → III after 3 attacks at each tier */
 dr.attacks=(dr.attacks||0)+1;dr.evoAttacks=(dr.evoAttacks||0)+1;
 if(!dr.isEcho&&dr.evoAttacks>=(src.waspEvolve||3)){
  if(dr.tier===1&&src.waspEvolve){dr.tier=2;dr.evoAttacks=0;dr.evolved=true;dr.boost*=1.5;burst(dr.x,dr.y,6,WEAPON_COLOR.hive);}
  else if(dr.tier===2&&src.waspEvolve3){dr.tier=3;dr.evoAttacks=0;dr.evolved=true;dr.boost*=2/1.5;burst(dr.x,dr.y,8,"#e0ffdf");}
 }
 /* Swarm Echo I–III: an ordinary wasp that kills releases one echo (echoes never multiply) */
 if(tgt.dead&&src.hiveEcho&&!dr.isEcho&&!dr.echoed){
  dr.echoed=true;
  addEchoWasp(src,dr.x,dr.y,src.hiveEcho===1?0.5:src.hiveEcho===2?0.75:1,src.hiveEcho);
 }
 dr.hits--;dr.hitT=0.26;
 burst(dr.x,dr.y,3,WEAPON_COLOR.hive);
 return dr.hits<=0;
}
function waspDies(dr){
 var src=dr.src;
 if(src.finalResonance)addPulse(src,dr.x,dr.y,55,src.cfg.damage*0.5);
 if(src.beeBomb){explodeAt(src,dr.x,dr.y,35,src.cfg.damage*0.6,{kind:"wasp"},WEAPON_COLOR.hive);addFireField(src,dr.x,dr.y,24,3,0.2);}
 if(src.retrieval&&!dr.isEcho&&Math.random()<0.5)src.stored=Math.min(5,(src.stored||0)+1);
}
/* moves one Firewheel disc; returns true when it should be removed */
function stepWheel(w,dt){
 var s=w.src;w.life-=dt;w.age=(w.age||0)+dt;
 var x0=w.x,y0=w.y,r=w.r||20;
 if(!w.holding){
  var nt=pickDroneTarget({x:w.x,y:w.y});
  var spd=w.speed*(!w.mini&&s.smartAccel&&B.t-w.lastDmgT>0.3?1.8:1);
  var curr=Math.atan2(w.vy,w.vx);
  if(nt){var wanted=Math.atan2(nt.y-w.y,nt.x-w.x),turn=Math.atan2(Math.sin(wanted-curr),Math.cos(wanted-curr));curr+=Math.max(-1.15*dt,Math.min(1.15*dt,turn));}
  w.vx=Math.cos(curr)*spd;w.vy=Math.sin(curr)*spd;
  w.x+=w.vx*dt;w.y+=w.vy*dt;
  if(w.x<r||w.x>W-r){w.x=Math.max(r,Math.min(W-r,w.x));w.vx*=-1;w.bounces++;}
  if((w.y<88&&w.vy<0)||(w.y>BASEY-38&&w.vy>0)){w.y=Math.max(88,Math.min(BASEY-38,w.y));w.vy*=-1;w.bounces++;}
 }
 if(!w.mini){
  if(s.vortexWheel)B.enemies.forEach(function(e){
   if(!onField(e)||e.kind==="boss")return;var dx=w.x-e.x,dy=w.y-e.y,d=Math.hypot(dx,dy);
   if(d>r*3.5||d<r)return;e.x+=dx/d*45*dt;e.y+=dy/d*45*dt*0.5;
  });
  if(s.fireTrail){w.trailT-=dt;if(w.trailT<=0){w.trailT=0.25;addFireField(s,w.x,w.y,r,2+(s.trailDurBonus||0),0.23*(s.trailDmgMul||1));}}
  if(s.miniDrones){w.miniT-=dt;if(w.miniT<=0){w.miniT=3;addMiniWheel(s,w.x,w.y);addMiniWheel(s,w.x,w.y);}}
  if(s.blazingPulse){w.pulseT-=dt;if(w.pulseT<=0){w.pulseT=1.5;addPulse(s,w.x,w.y,70,s.cfg.damage*0.6);}}
 }
 var bonus=1+Math.min(0.6,w.bounces*0.1);
 B.enemies.forEach(function(e){
  if(e.dead||e.hp<=0||sweptContact(x0,y0,w.x,w.y,e.x,e.y,e.r+r)===null)return;
  var prev=w.last.has(e)?w.last.get(e):-99;
  if(B.t-prev<0.3)return;
  w.last.set(e,B.t);w.hits++;
  var dm;
  if(w.mini)dm=s.cfg.damage*0.4*(s.miniDmgMul||1);
  else{
   /* 3x (was 1.15x + guaranteed burn): burn is now the Ignition card, the disc is bigger and slower */
   dm=s.cfg.damage*3*bonus;
   if(s.smartAccel&&B.t-w.lastDmgT>0.3)dm*=1.6;
   if(s.comboBoost)dm*=1+Math.min(2,0.2*Math.floor(w.hits/20));
   if(s.flamePowerSurge)dm*=1+4*Math.min(1,w.age/15);
  }
  w.lastDmgT=B.t;
  dealDamage(s,e,dm,{kind:w.mini?"miniwheel":"wheel",dtype:"fire",burn:Math.random()<(s.wheelIgnite||0)});
  if(!w.mini){
   if(w.hits%20===0){ringFx(w.x,w.y,WEAPON_COLOR.firewheel,100);enemiesIn(w.x,w.y,45).forEach(function(o){dealDamage(s,o,s.cfg.damage*2,{kind:"wheel"});});}
   if(s.extraBarrage&&w.hits%15===0)for(var k=0;k<8;k++)addShell(s,w.x,w.y,k*Math.PI/4,s.cfg.damage*0.5,0.6,{pierce:3,color:WEAPON_COLOR.firewheel,speed:520});
  }
 });
 if(w.life<=0){
  if(!w.mini&&s.holdGround&&!w.held){w.held=true;w.holding=true;w.life=10;return false;}
  return true;
 }
 return false;
}
function stepField(f,dt){
 var s=f.src;
 if(f.kind==="gravity"&&!f.ended&&f.vx!==undefined){
  var sp=f.speed;f.x+=f.vx*dt;f.y+=f.vy*dt;f.traveled+=sp*dt;
  /* A field leaves its emitter below the arena. The lower wall only catches a returning field. */
  var hitWall=f.x<16||f.x>W-16||f.y<VIS_TOP+10||(f.y>BASEY-35&&f.vy>0);
  if(hitWall){
   if(s.fieldReflect&&f.bounces<3){
    if(f.x<16||f.x>W-16)f.vx*=-1;else f.vy*=-1;f.bounces++;
    f.x=Math.max(16,Math.min(W-16,f.x));f.y=Math.max(VIS_TOP+10,Math.min(BASEY-35,f.y));
   }else{f.x=Math.max(16,Math.min(W-16,f.x));f.y=Math.max(VIS_TOP+10,Math.min(BASEY-35,f.y));endGravityField(f);}
  }
  if(f.traveled>=f.range)endGravityField(f);
  var frac=Math.min(1,f.traveled/f.range);
  f.r=f.r0*(s.extendedPull?1+0.6*frac:1);
  f.grow=s.gravityIncrease?1+frac:1;
  if(s.gravLightning){f.shockT-=dt;if(f.shockT<=0){f.shockT=0.5;shockFrom(s,f.x,f.y,4,s.cfg.damage*0.4);}}
 }
 if(f.kind==="matrix"&&f.expanding)f.r=12+(f.rMax-12)*Math.min(1,f.age/(f.maxLife*0.6));
 if(f.kind==="matrix"&&f.bolts){f.boltT-=dt;if(f.boltT<=0){f.boltT=0.5;addBolt(s,f.x+(Math.random()-0.5)*f.r,f.y+(Math.random()-0.5)*f.r,5);}}
 /* pull: gravity fields (toward the field or its binary stars) and black holes */
 if(f.kind==="gravity"||f.kind==="blackhole"){
  var centers=[[f.x,f.y]];
  if(f.binary){var ba=B.t*4;centers=[[f.x+Math.cos(ba)*22,f.y+Math.sin(ba)*22],[f.x-Math.cos(ba)*22,f.y-Math.sin(ba)*22]];}
  var pullMul=f.grow||1;
  B.enemies.forEach(function(e){
   if(e.dead||e.hp<=0)return;
   var c=centers.length>1&&dist2(e,centers[1][0],centers[1][1])<dist2(e,centers[0][0],centers[0][1])?centers[1]:centers[0];
   var dx=c[0]-e.x,dy=c[1]-e.y,d=Math.hypot(dx,dy);
   if(d>=f.r||d<4)return;
   var strength=f.pull*pullMul*(1-d/f.r)*(e.kind==="boss"?0.20:e.champion?0.48:1);
   e.x=Math.max(e.r,Math.min(W-e.r,e.x+dx/d*strength*dt));
   /* the VIS_TOP lower bound keeps an enemy below the HUD, but must not "teleport" down
      a freshly spawned one (y<VIS_TOP): for it, the floor is its current height */
   e.y=Math.min(BASEY-20,Math.max(Math.min(e.y,VIS_TOP),e.y+dy/d*strength*dt*0.28));
  });
 }
 if(f.kind==="slow"&&!f.small){
  if(s.smallLaserField){f.laserAng+=3*dt;f.laserT-=dt;
   if(f.laserT<=0){f.laserT=0.3;var lx=Math.cos(f.laserAng),ly=Math.sin(f.laserAng),L=f.r*1.6;
    B.enemies.forEach(function(e){if(!onField(e))return;var px=e.x-f.x,py=e.y-f.y,pr=px*lx+py*ly;
     if(Math.abs(pr)<=L&&Math.abs(px*ly-py*lx)<=e.r+6)dealDamage(s,e,s.cfg.damage*0.3,{kind:"field",dtype:"energy"});});}}
  if(s.disrShotgun){f.shotT-=dt;if(f.shotT<=0){f.shotT=1;var ports=turretPorts(s);
   for(var k=-1;k<=1;k++){
    var muzzle=turretMuzzle(s,ports[(k+1)%ports.length]);
    var sa=Math.atan2(f.y-muzzle.y,f.x-muzzle.x);
    addShell(s,muzzle.x,muzzle.y,sa+k*.06,s.cfg.damage*.5,.9,{pierce:99,dtype:"phys",color:WEAPON_COLOR.aeroblast,speed:640});
   }}}
 }
 if(f.tick>0)return;
 var interval=f.kind==="gravity"?0.5:f.kind==="blackhole"?0.5:f.kind==="matrix"?0.45:f.kind==="slow"?0.5*(s.fieldIntervalMul||1):0.4;
 f.tick+=interval;
 if(f.kind==="gravity"&&s.wormhole&&!f.portalDone){
  var first=enemiesIn(f.x,f.y,f.r)[0];
  if(first){f.portalDone=true;addPortal(s,first.x,first.y,22*(s.portalRMul||1),f.ex,f.ey,3*(s.portalDurMul||1));}
 }
 B.enemies.forEach(function(e){
  if(e.dead||e.hp<=0||Math.hypot(e.x-f.x,e.y-f.y)>f.r)return;
  if(f.kind==="slow"){
   var pow=s.slowPow||0.35;
   if(s.stasisField&&e.kind!=="boss"){e.stasisSlow=Math.min(0.9,Math.max(e.stasisSlow||0,pow)+0.1);pow=e.stasisSlow;}
   if(e.kind!=="boss"){e.slowFactor=Math.min(e.slowFactor,1-pow*(e.champion?0.55:1));e.slowT=Math.max(e.slowT,0.65);}
   if(s.fieldExpose){e.vulnerableStacks=Math.min(3,(e.vulnerableStacks||0)+1);e.vulnerableT=3;}
   var sup=s.fieldSuppression?1+Math.min(2,(1-e.slowFactor)*3):1;
   dealDamage(s,e,s.cfg.damage*0.6*(f.dmgScale||1)*sup,{kind:"field",dtype:"force"});
   if(!aliveE(e))return;
   if(s.disrForce)addDisruption(e,s,1);
   if(s.electricField&&Math.random()<0.3)applyParalyze(e,0.8);
   if(s.randomTeleport&&Math.random()<0.05)teleportBack(e,false,s);
   else if(s.rewindTeleport&&Math.random()<0.025)teleportBack(e,true,s);
   if(s.convergingField&&e.kind!=="boss"&&aliveE(e)){e.x+=(f.x-e.x)*0.25;e.y+=(f.y-e.y)*0.25;}
  }
  else if(f.kind==="gravity"){
   /* the field now flies (reference) and spends less time on each enemy: 0.65x -> 2.2x per tick keeps HEAD-level DPS */
   dealDamage(s,e,s.cfg.damage*2.2*(f.power||1)*(f.grow||1),{kind:"gravity"});
   if(s.fieldDisrupt&&aliveE(e))addDisruption(e,s,1);
  }
  else if(f.kind==="blackhole")dealDamage(s,e,f.dmg,{kind:"blackhole",dtype:"force"});
  else if(f.kind==="firetrail")dealDamage(s,e,s.cfg.damage*(f.dmgF||0.23),{burn:true,kind:"trail",dtype:"fire"});
  else if(f.kind==="matrix"){
   dealDamage(s,e,f.dmg||s.cfg.damage*0.65,{kind:"matrix",dtype:"electric",slow:!!f.slow,slowPow:0.3});
   if(f.paralyze&&Math.random()<0.25)applyParalyze(e,0.6);
  }
 });
}
