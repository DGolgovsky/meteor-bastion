/* ==================== DRAFT: 1 of 3 for battle points ==================== */
/* Pool: build a free slot, the unit cards of 07-cards.js (levels/pips), combos, fortress modules.
   Purple cards are never random: a unit with 3 pips gets its purple card forced into the draft. */
function freeSlot(){for(var i=0;i<4;i++){if(!B.turrets.some(function(t){return t.slot===i;}))return i;}return -1;}
var COMBOS={spin:["Spinning Laser","Laser + Tesla Coil: an extra beam and +20% Laser damage."],det:["Detonation Lightning","Sky Guard + Thunderbolt: rockets shock nearby enemies."],blaze:["Blazing Swarm","Firewheel + Hive: wasps set enemies on fire."],disr:["Disrupting Beam","Beam + Disruption Drone: the beam slows its target."],vortexWheel:["Vortex Disc","Firewheel + Gravity: the disc gains +25% damage and +2 s lifetime."],binaryStars:["Binary Singularity","Gravity + Hive: stronger pull, field radius +30%."],surgePierce:["Surge Rail","Railgun + Tesla: pierce +2, damage +25%."]};
var MODULES={boost:["Battlefield Boost","All units deal +12% damage until the end of the battle."],healm:["Fortress Repair","Instantly restore 250 HP to the base."],regenm:["Regeneration Cycle","Instantly restore 200 HP to the base."],jam:["Wave Jammer","All enemies are 15% slower until the end of the battle."],patch:["Field Patch","Instantly restore 120 HP to the base. Offered only when no other cards are left."]};
function forcedPurples(){
 var res=[];
 allFighters().forEach(function(u){var d=purpleFor(u);if(d)res.push({kind:"card",u:u,def:d,forced:true});});
 return res.sort(function(a,b){return a.u.slot-b.u.slot;});
}
function genCards(allowForced){
 var picks=[];
 if(allowForced!==false)forcedPurples().slice(0,2).forEach(function(c){picks.push(c);});
 var pool=[];
 if(freeSlot()>=0)TURRETS.forEach(function(cfg){
   if(!B.usedTypes[cfg.id]){
     var factor=B.turrets.length<2?3.4:2.2;
     pool.push({kind:"new",cfg:cfg,w:(cfg.rarity==="legend"?2:cfg.rarity==="epic"?3:5)*factor});
   }
 });
 allFighters().forEach(function(u){
  var defs=unitCards(u).filter(function(d){return !d.rare;});
  /* each unit gets about the same total weight regardless of how many cards it has left */
  defs.forEach(function(d){pool.push({kind:"card",u:u,def:d,w:Math.max(3,18/defs.length)*(d.lvl===2?1.2:1)});});
 });
 /* combo cards for turret pairs (the Combo mechanic from Galaxy Defense) */
 var hasT=function(id){return B.turrets.some(function(u){return u.cfg.id===id;});};
 var fuT=function(id){return B.turrets.filter(function(u){return u.cfg.id===id;})[0];};
 if(hasT("laser")&&hasT("tesla")&&META.levels.tesla>=14&&!B.combos.spin)pool.push({kind:"combo",modId:"spin",u:fuT("laser"),w:3});
 if(hasT("skyguard")&&hasT("thunder")&&META.levels.skyguard>=14&&!B.combos.det)pool.push({kind:"combo",modId:"det",u:fuT("skyguard"),w:3});
 if(hasT("firewheel")&&hasT("hive")&&META.levels.firewheel>=22&&!B.combos.blaze)pool.push({kind:"combo",modId:"blaze",u:fuT("hive"),w:3});
 if(hasT("beam")&&hasT("disruption")&&META.levels.beam>=22&&!B.combos.disr)pool.push({kind:"combo",modId:"disr",u:fuT("beam"),w:3});
 if(hasT("firewheel")&&hasT("gravity")&&META.levels.gravity>=18&&!B.combos.vortexWheel)pool.push({kind:"combo",modId:"vortexWheel",u:fuT("firewheel"),w:3});
 if(hasT("gravity")&&hasT("hive")&&META.levels.gravity>=22&&!B.combos.binaryStars)pool.push({kind:"combo",modId:"binaryStars",u:fuT("gravity"),w:3});
 if(hasT("railgun")&&hasT("tesla")&&META.levels.railgun>=22&&!B.combos.surgePierce)pool.push({kind:"combo",modId:"surgePierce",u:fuT("railgun"),w:3});
 /* fortress modules: global battle boosts, each once per battle */
 ["boost","healm","regenm","jam"].forEach(function(mid){if(!B.modulesUsed[mid])pool.push({kind:"module",modId:mid,w:3});});
 var guard=0;
 while(picks.length<3&&pool.length&&guard++<80){
   var tot=0;pool.forEach(function(x){tot+=x.w;});
   var r=Math.random()*tot,idx=0;
   for(var i=0;i<pool.length;i++){r-=pool[i].w;if(r<=0){idx=i;break;}}
   var c=pool.splice(idx,1)[0];
   if(picks.some(function(p){return sameCard(p,c);}))continue;
   picks.push(c);
 }
 /* never leave the player with an empty or short draft once every card is taken */
 while(picks.length<3)picks.push({kind:"module",modId:"patch",w:0});
 return picks;
}
function sameCard(a,b){
 if(a.kind!==b.kind)return false;
 if(a.kind==="new")return a.cfg.id===b.cfg.id;
 if(a.kind==="card")return a.u===b.u&&a.def.id===b.def.id;
 return a.modId===b.modId&&a.modId!=="patch";
}
function cardHTML(c){
 if(c.kind==="card"){var d=c.def;
  return{cls:d.rare?"purple":"teal",icon:c.u.cfg.icon,name:d.name,unit:c.u.cfg.name,lvl:d.lvl,rare:!!d.rare,
   tag:(d.isSuper?"⭐ SUPER":d.rare?"EVOLUTION":"Lv."+d.lvl),
   desc:cardDesc(d)+(d.rare?" <b>Unit Lv."+c.u.runLv+" → "+(c.u.runLv+1)+"</b>":"")};}
 if(c.kind==="new")return{cls:"teal",icon:c.cfg.icon,name:c.cfg.name,unit:c.cfg.name,lvl:1,rare:false,tag:"NEW",desc:"Build <b>"+c.cfg.name+"</b> ["+DTYPE_RU[c.cfg.dtype]+" DMG]: "+c.cfg.desc+"<br>Damage: <b>"+c.cfg.damage+"</b> · "+RARITY[c.cfg.rarity].n};
 if(c.kind==="combo"){var CM=COMBOS[c.modId];
  return{cls:"purple",icon:"🔗",name:"Combo: "+CM[0],unit:c.u.cfg.name,lvl:1,rare:false,tag:"COMBO",desc:CM[1]};}
 if(c.kind==="module"){var MD=MODULES[c.modId];
  return{cls:"module",icon:"🧩",name:"Module: "+MD[0],unit:"Fortress",lvl:0,rare:false,tag:"FORTRESS MODULE",desc:MD[1]};}
 return{cls:"teal",icon:"?",name:"?",unit:"",lvl:0,rare:false,tag:"",desc:"?"};
}
var curCards=[];
function openDraft(){
 SFX.levelup();
 $("lu-title").textContent="🎴 Points earned!";
 $("lu-sub").textContent="Card for battle points · Cards taken: "+B.drafts+" · Next at "+B.draftNeed+" pts"+(B.pendingDrafts>1?" · "+(B.pendingDrafts-1)+" more queued!":"");
 renderSlotRow($("lu-build"));
 curCards=genCards();
 renderCards();
 $("btn-reroll").style.display=B.reroll?"":"none";
 $("ov-levelup").classList.add("on");
}
function renderCards(){
 var box=$("lu-cards");box.innerHTML="";
 curCards.forEach(function(c){
   var h=cardHTML(c);
   var b=document.createElement("button");b.className="ucard "+h.cls;
   b.innerHTML='<span class="uicw"><span class="uic">'+h.icon+'</span>'+(h.lvl?'<span class="lvb">'+h.lvl+'</span>':'')+'</span><span><span class="uunit">'+h.unit+'</span><span class="un">'+h.name+'<span class="utag">'+h.tag+'</span></span><div class="ud">'+h.desc+'</div></span>';
   b.addEventListener("click",function(){applyCard(c);});
   box.appendChild(b);
 });
}
$("btn-reroll").addEventListener("click",function(){if(!B.reroll)return;B.reroll=false;
 // forced purple cards survive a reroll
 var keep=curCards.filter(function(c){return c.forced;});
 curCards=keep.concat(genCards(false).filter(function(c){return !keep.some(function(k){return sameCard(k,c);});})).slice(0,3);
 renderCards();$("btn-reroll").style.display="none";SFX.pick();});
function applyCard(c){
 if(c.kind==="new"){
   var s=freeSlot();if(s<0)return;
   var nt=mkUnit(c.cfg,TURRET_X[s],s,false);B.turrets.push(nt);B.usedTypes[c.cfg.id]=1;burst(nt.x,nt.y,16,c.cfg.color);
   recordPick({unit:c.cfg.id,icon:c.cfg.icon,id:"build",name:c.cfg.name,lvl:1,rare:false,desc:"["+DTYPE_RU[c.cfg.dtype]+"] DMG build"});
 }else if(c.kind==="card"){
   if(!cardEligible(c.u,c.def))return;
   takeCard(c.u,c.def);
 }else if(c.kind==="combo"){
   B.combos[c.modId]=1;
   if(c.modId==="spin"){c.u.beamSplit=true;c.u.dmgMul*=1.2;}
   if(c.modId==="det")c.u.zapOnHit=true;
   if(c.modId==="blaze")c.u.hiveBurn=true;
   if(c.modId==="disr")c.u.beamSlow=true;
   if(c.modId==="vortexWheel"){c.u.dmgMul*=1.25;c.u.wheelDurationBonus=(c.u.wheelDurationBonus||0)+2;}
   if(c.modId==="binaryStars"){c.u.gravityPull*=1.25;c.u.gravityRadius*=1.3;}
   if(c.modId==="surgePierce"){c.u.pierce=Math.min(15,c.u.pierce+2);c.u.dmgMul*=1.25;}
   burst(c.u.x,c.u.y,16,"#a06bff");
   addPip(c.u);
   recordPick({unit:c.u.cfg.id,icon:"🔗",id:"combo:"+c.modId,name:COMBOS[c.modId][0],lvl:1,rare:true,desc:COMBOS[c.modId][1]});
 }else if(c.kind==="module"){
   if(c.modId!=="patch")B.modulesUsed[c.modId]=1;
   if(c.modId==="boost")B.allDmgMul*=1.12;
   if(c.modId==="healm")B.baseHp=Math.min(B.baseMax,B.baseHp+250);
   if(c.modId==="regenm")B.baseHp=Math.min(B.baseMax,B.baseHp+200);
   if(c.modId==="patch")B.baseHp=Math.min(B.baseMax,B.baseHp+120);
   if(c.modId==="jam"){B.enemySpdMul*=0.85;B.enemies.forEach(function(e){e.speed*=0.85;if(e.baseSpeed!==undefined)e.baseSpeed*=0.85;});}
   burst(W/2,BASEY-46,18,"#2ee6c8");
   recordPick({unit:"fortress",icon:"🧩",id:"module:"+c.modId,name:MODULES[c.modId][0],lvl:0,rare:false,desc:MODULES[c.modId][1]});
 }
 SFX.pick();
 B.drafts++;
 /* one queued card used; if the points earned more, open the next draft right away */
 B.pendingDrafts=Math.max(0,B.pendingDrafts-1);
 if(B.pendingDrafts>0){openDraft();lastTs=performance.now();return;}
 $("ov-levelup").classList.remove("on");
 if(B.draftReturn==="nextwave"){startWave(B.wave+1);}
 else B.waveState="fighting";
 lastTs=performance.now();
}
/* 5-slot level/pip row, in field order: far left, center left, Guardian, center right, far right. */
var SLOT_ROW_ORDER=[0,2,"soldier",3,1];
function pipsHTML(t){
 var h='<div class="pips">';
 for(var i=0;i<PIPS_PER_LV;i++)h+='<i class="pip'+(i===PIPS_PER_LV-1?' p':'')+(i<t.pips?' on':'')+'"></i>';
 return h+'</div>';
}
function slotRowHTML(){
 return SLOT_ROW_ORDER.map(function(k){
  var t=k==="soldier"?B.soldier:B.turrets.filter(function(u){return u.slot===k;})[0];
  if(!t)return '<div class="slot empty"><div class="slv">&nbsp;</div><div class="sic">＋</div><div class="snm">Empty slot</div>'+pipsHTML({pips:0})+'</div>';
  return '<div class="slot"><div class="slv">'+t.runLv+'</div><div class="sic">'+t.cfg.icon+'</div><div class="snm">'+t.cfg.name+'</div>'+pipsHTML(t)+'</div>';
 }).join("");
}
function renderSlotRow(el){el.className="slots";el.innerHTML=slotRowHTML();}
function pipText(t){var s="";for(var i=0;i<PIPS_PER_LV;i++)s+=i<t.pips?"◆":"◇";return s;}
function openCardsOverview(){
 if(!B)return;
 renderSlotRow($("cards-slots"));
 var list=B.picked||[];
 $("cards-sub").textContent="Cards taken: "+B.drafts+" · unique: "+list.length;
 $("cards-grid").innerHTML=list.length?list.map(function(p){
  var cls=p.unit==="fortress"?"module":p.rare?"purple":"teal";
  return '<div class="mcard '+cls+'">'+(p.n>1?'<span class="mn">×'+p.n+'</span>':'')+'<div class="mt">'+p.name+'</div>'+
   '<div class="mic">'+p.icon+(p.lvl?'<span class="lvb">'+p.lvl+'</span>':'')+'</div><div class="md">'+p.desc+'</div></div>';
 }).join(""):'<div class="cempty">No cards picked yet.</div>';
 $("ov-cards").classList.add("on");
}
$("btn-cards-close").addEventListener("click",function(){$("ov-cards").classList.remove("on");lastTs=performance.now();});
$("btn-lu-cards").addEventListener("click",openCardsOverview);
$("btn-pause-cards").addEventListener("click",openCardsOverview);
$("btn-res-cards").addEventListener("click",openCardsOverview);

/* ==================== RESULTS ==================== */
var lastRewards=null;
function endBattle(win){
 if(B.over)return;B.over=true;stopMusic();
 var time=Math.max(1,B.elapsed);
 var stats=allFighters().slice().sort(function(a,b){return b.totalDmg-a.totalDmg;}).map(function(t){return{t:t,dmg:t.totalDmg,dps:t.totalDmg/time};});
 var rw=B.elite?1.6:1; /* Elite: tougher enemies, more generous rewards */
 /* Level rewards cut tenfold (2026-11-09, owner decision); gems untouched —
    there are only 0–3 of them per battle, dividing would zero them entirely. */
 var coins=Math.floor((B.kills*2.2+(win?220:60)+B.wave*25)*(1+(B.stage.n-1)*0.23)*rw/10);
 var comp=Math.floor((2+Math.floor(B.kills/25)+(win?3:0))*rw/10);
 var gems=(win?2:(B.kills>60?1:0))+(B.elite&&win?1:0);
 var pxp=Math.floor((win?40+B.wave*6:10+B.wave*3)*rw*(1+(B.stage.n-1)*0.17)/10);
 var mats={};
 allFighters().forEach(function(t){mats[t.cfg.id]=Math.floor((8+Math.floor(t.totalDmg/260))*(1+(B.stage.n-1)*0.15)*rw/10);});
 lastRewards={win:win,coins:coins,gems:gems,comp:comp,pxp:pxp,mats:mats,applied:false};
 if(win){META.wins++;
   if(B.elite)META.eliteCleared[B.stage.n]=true;else META.normalCleared[B.stage.n]=true;
   if(B.stage.n===META.unlocked&&META.unlocked<STAGES.length)META.unlocked++;
 }
 persist();
 $("res-title").textContent=win?"Victory":"Defeat";
 $("res-title").className=win?"win":"lose";
 $("res-sub").textContent=B.stage.name+" · Waves cleared: "+(win?finalWave():B.wave)+" · Kills: "+B.kills+" · Time: "+mmss(B.elapsed)+" · 🎴 Cards taken: "+B.drafts+" · ❤ Base HP restored: "+Math.floor(B.totalHealed)+" HP";
 renderRewards();
 var tb=$("res-stats");tb.innerHTML="";
 stats.forEach(function(s){tb.innerHTML+="<tr><td>"+s.t.cfg.icon+" "+s.t.cfg.name+" <span style='color:var(--muted)'>Lv."+s.t.runLv+"</span></td><td>"+fmt(s.dmg)+"</td><td>"+fmt(s.dps)+"</td></tr>";});
 /* rewards are credited immediately: previously they were credited only via the "back" button, while stage progress
    was already saved, so closing the app on the results screen left the stage unlocked without rewards */
 applyRewards();
 $("ov-result").classList.add("on");
 if(win)SFX.win();else SFX.lose();
}
/* Game-loop error banner: shown when a frame throws (see loop in 05-update.js).
   The game keeps running; tap the banner to dismiss it. */
function showLoopError(msg){
 var el=$("loop-error");if(!el)return;
 el.textContent="Game loop error — the game kept running. Screenshot this: "+msg;
 el.style.display="block";
 el.onclick=function(){el.style.display="none";};
}
function renderRewards(){
 var r=lastRewards,m=1;
 /* Show every material grant, biggest first: the old first-3-in-line-order hid
    grants — e.g. Hive's 40 never appeared on the results screen. Zero grants
    (a fighter that dealt almost no damage) stay hidden. */
 var mats=Object.keys(r.mats).filter(function(id){return r.mats[id]>0;}).sort(function(a,b){return r.mats[b]-r.mats[a];});
 var h='<div class="rwd"><div class="ric">⭐</div><div class="rv">'+(r.pxp*m)+'</div><div class="rn">Account XP</div></div>'+
 '<div class="rwd"><div class="ric">🪙</div><div class="rv">'+(r.coins*m)+'</div><div class="rn">Coins</div></div>'+
 '<div class="rwd"><div class="ric">💎</div><div class="rv">'+(r.gems*m)+'</div><div class="rn">Gems</div></div>'+
 '<div class="rwd"><div class="ric">🧩</div><div class="rv">'+(r.comp*m)+'</div><div class="rn">Components</div></div>';
 mats.forEach(function(id){var cfg=allUnitsCfg().filter(function(t){return t.id===id;})[0];h+='<div class="rwd"><div class="ric">'+cfg.icon+'</div><div class="rv">'+(r.mats[id]*m)+'</div><div class="rn">Materials: '+cfg.name+'</div></div>';});
 $("res-rewards").innerHTML=h;
}
function applyRewards(){
 if(!lastRewards||lastRewards.applied)return;lastRewards.applied=true;
 var r=lastRewards,m=1;
 META.coins+=r.coins*m;META.gems+=r.gems*m;META.components+=r.comp*m;META.playerXp+=r.pxp*m;
 Object.keys(r.mats).forEach(function(id){META.mats[id]+=r.mats[id]*m;});
 persist();
}
$("btn-res-back").addEventListener("click",function(){applyRewards();$("ov-result").classList.remove("on");if(raf)cancelAnimationFrame(raf);B=null;show("home");});

