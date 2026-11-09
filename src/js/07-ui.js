/* ==================== DRAFT: 1 of 3 for battle points + SUPER cards ==================== */
function freeSlot(){for(var i=0;i<4;i++){if(!B.turrets.some(function(t){return t.slot===i;}))return i;}return -1;}
var SUPERS={
 skyguard:{name:"Rocket Barrage",desc:"+2 rockets per volley and +40% fire rate.",apply:function(u){u.extraProj+=2;u.haste*=1.4;}},
 laser:{name:"Mirror Resonator",desc:"The beam gains reflection and refraction at once, +60% damage.",apply:function(u){u.beamSplit=true;u.reflect=Math.max(u.reflect||0,2);u.refract=true;u.dmgMul*=1.6;}},
 disruption:{name:"Stasis Field",desc:"Slow increased to 70%, pulses gain a slowing splash.",apply:function(u){u.slowPow=0.7;u.splash=Math.max(u.splash,50);}},
 aeroblast:{name:"Hurricane",desc:"Knockback is three times stronger, blasts gain a large splash.",apply:function(u){u.knock=36;u.splash=Math.max(u.splash,60);}},
 thunder:{name:"Thunderstorm",desc:"+3 chain lightning targets and +50% damage.",apply:function(u){u.chain+=3;u.dmgMul*=1.5;}},
 beam:{name:"Annihilator",desc:"+150% damage and +20% crit chance.",apply:function(u){u.dmgMul*=2.5;u.critBonus+=0.2;}},
 firewheel:{name:"Inferno",desc:"Burning is 3 times stronger, ignite gains a splash.",apply:function(u){u.burnMul=3;u.splash=Math.max(u.splash,40);}},
 hive:{name:"Mother Swarm",desc:"Drones are released in pairs and deal double damage.",apply:function(u){u.hiveDouble=true;u.dmgMul*=1.35;}},
 railgun:{name:"Piercing Volley",desc:"The projectile pierces ALL enemies on its line, +80% damage.",apply:function(u){u.pierce=99;u.dmgMul*=1.8;}},
 tesla:{name:"Overvoltage",desc:"The discharge bounces across 6 targets, +60% damage.",apply:function(u){u.multiCount=6;u.dmgMul*=1.6;}},
 gravity:{name:"Black Singularity",desc:"Field radius +50%, pull +35%, +40% field damage.",apply:function(u){u.gravityRadius*=1.5;u.gravityPull*=1.35;u.gravityPower*=1.4;}},
 soldier:{name:"Legendary Marksman",desc:"+100% damage, +25% crit chance and +1 projectile per burst, across the whole field.",apply:function(u){u.dmgMul*=2;u.critBonus+=0.25;u.extraProj+=1;}}
};

/* Tier paths are tied to R&D upgrades, not to an arbitrary fifth battle level.
   The chains are original-inspired gameplay, not a claim that every numerical value matches the reference. */
var CARD_CHAINS={
 skyguard:[
  {id:"rocketPayload",name:"Heavy Payload",desc:"T1 · rocket explosion +35%.",rd:2,apply:function(u){u.splash*=1.35;}},
  {id:"rocketCluster",name:"Cluster Salvo",desc:"T2 · +1 rocket, −10% damage each.",rd:6,apply:function(u){u.extraProj++;u.dmgMul*=0.90;}},
  {id:"thermalWarhead",name:"Thermal Warhead",desc:"T3 · the explosion sets enemies on fire.",rd:14,apply:function(u){u.rocketBurn=true;}}
 ],
 laser:[
  {id:"laserVulnerable",name:"Vulnerability Mark",desc:"T1 · repeated beam hits increase incoming damage by up to +30%.",rd:2,apply:function(u){u.laserVulnerable=true;}},
  {id:"laserResonance",name:"Optical Resonance",desc:"T2 · duration +30% and a second beam.",rd:6,apply:function(u){u.laserDurationMul=(u.laserDurationMul||1)+0.3;u.laserDeflect=1;}},
  {id:"laserStorm",name:"Scanning System",desc:"T3 · +1 reflection and a sweeping beam.",rd:14,apply:function(u){u.reflect=(u.reflect||0)+1;u.laserSweep=1;}}
 ],
 disruption:[
  {id:"fieldSaturation",name:"Field Saturation",desc:"T1 · the field is 20% larger.",rd:2,apply:function(u){u.splash*=1.20;}},
  {id:"fieldStasis",name:"Disruption Stasis",desc:"T2 · slow +15 pp.",rd:6,apply:function(u){u.slowPow=Math.min(0.75,u.slowPow+0.15);}},
  {id:"fieldExpose",name:"Defense Breach",desc:"T3 · field pulses apply vulnerability.",rd:14,apply:function(u){u.fieldExpose=true;}}
 ],
 aeroblast:[
  {id:"aeroPressure",name:"Compression",desc:"T1 · knockback and radius +20%.",rd:2,apply:function(u){u.knock*=1.2;u.splash*=1.2;}},
  {id:"aeroCascade",name:"Shockwave",desc:"T2 · +1 air projectile.",rd:6,apply:function(u){u.extraProj++;}},
  {id:"aeroStorm",name:"Air Storm",desc:"T3 · impact area +50%, damage +20%.",rd:14,apply:function(u){u.splash*=1.5;u.dmgMul*=1.2;}}
 ],
 thunder:[
  {id:"thunderLink",name:"Double Chain",desc:"T1 · +1 chain lightning target.",rd:2,apply:function(u){u.chain++;}},
  {id:"thunderStun",name:"Paralyzing Discharge",desc:"T2 · lightning slows enemies.",rd:6,apply:function(u){u.thunderParalyze=true;}},
  {id:"thunderStorm",name:"Discharge Storm",desc:"T3 · fire rate +25%.",rd:14,apply:function(u){u.haste*=1.25;}}
 ],
 beam:[
  {id:"beamConcentrate",name:"Beam Focus",desc:"T1 · damage grows with repeated hits on a target.",rd:2,apply:function(u){u.beamFocusCap=Math.max(0.8,u.beamFocusCap||0);}},
  {id:"beamStack",name:"Stacking Damage",desc:"T2 · the accumulated bonus is kept when switching targets.",rd:6,apply:function(u){u.beamStacking=true;}},
  {id:"beamOvercharge",name:"Concentrated Stream",desc:"T3 · focus cap raised to +300%.",rd:14,apply:function(u){u.beamFocusCap=3.0;}}
 ],
 firewheel:[
  {id:"flameTrail",name:"Flame Trail",desc:"T1 · the disc leaves burning areas.",rd:2,apply:function(u){u.fireTrail=true;}},
  {id:"blazingTrail",name:"Blazing Trail",desc:"T2 · the burning disc deals +25% damage.",rd:6,apply:function(u){u.dmgMul*=1.25;}},
  {id:"extendedTrail",name:"Extended Trail",desc:"T3 · the disc flies 3 seconds longer.",rd:14,apply:function(u){u.wheelDurationBonus=(u.wheelDurationBonus||0)+3;}}
 ],
 hive:[
  {id:"swarmEcho",name:"Swarm Echo",desc:"T1 · wasps release one extra echo swarm with 50% damage.",rd:2,apply:function(u){u.hiveEcho=1;}},
  {id:"echoUpgrade2",name:"Echo Upgrade II",desc:"T2 · echo wasp damage up to 75%.",rd:6,apply:function(u){u.hiveEcho=2;}},
  {id:"echoUpgrade3",name:"Echo Upgrade III",desc:"T3 · echo wasps deal full damage.",rd:10,apply:function(u){u.hiveEcho=3;}}
 ],
 railgun:[
  {id:"railExplosive",name:"Explosive Shells",desc:"T1 · piercing projectiles explode over a small area.",rd:2,apply:function(u){u.railExplosive=true;}},
  {id:"railPiercing",name:"Piercing Impact",desc:"T2 · pierce +2.",rd:6,apply:function(u){u.pierce=Math.min(15,u.pierce+2);}},
  {id:"railShock",name:"Shock Rail",desc:"T3 · damage +30%, pierce +1.",rd:14,apply:function(u){u.dmgMul*=1.3;u.pierce=Math.min(15,u.pierce+1);}}
 ],
 tesla:[
  {id:"trapMatrix",name:"Trap Matrix",desc:"T1 · an electric matrix after the explosion.",rd:2,apply:function(u){u.teslaMatrix=true;}},
  {id:"enhancedMatrix",name:"Enhanced Matrix",desc:"T2 · the matrix lasts longer and hits harder.",rd:6,apply:function(u){u.teslaMatrixPlus=true;}},
  {id:"matrixThunder",name:"Matrix Thunderbolt",desc:"T3 · the matrix periodically paralyzes enemies.",rd:10,apply:function(u){u.teslaThunder=true;}}
 ],
 gravity:[
  {id:"smallBlackHole",name:"Small Black Hole",desc:"T1 · the field pulls enemies in for longer.",rd:2,apply:function(u){u.gravityDuration+=1.2;}},
  {id:"blackHoleExpansion",name:"Black Hole Expansion",desc:"T2 · radius +35%, pull +20%.",rd:6,apply:function(u){u.gravityRadius*=1.35;u.gravityPull*=1.20;}},
  {id:"destructiveBlackHole",name:"Destructive Black Hole",desc:"T3 · the field applies vulnerability.",rd:14,apply:function(u){u.gravityShred=true;}}
 ],
 soldier:[
  {id:"guardianCharge",name:"Charged Shot",desc:"T1 · Guardian damage +25%.",rd:2,apply:function(u){u.dmgMul*=1.25;}},
  {id:"guardianExplosion",name:"Explosive Rounds",desc:"T2 · Guardian bullets deal area damage.",rd:6,apply:function(u){u.splash=Math.max(u.splash,34);}},
  {id:"guardianOverdrive",name:"Guardian Overdrive",desc:"T3 · fire rate +25%.",rd:14,apply:function(u){u.haste*=1.25;}}
 ]
};
function chainCandidates(u){
 var defs=CARD_CHAINS[u.cfg.id]||[],result=[];
 for(var i=0;i<defs.length;i++){
  var def=defs[i];
  if(u.mods.includes(def.id)||META.levels[u.cfg.id]<def.rd||u.runLv<i+2)continue;
  if(i>0&&!u.mods.includes(defs[i-1].id))continue;
  result.push({kind:"chain",u:u,def:def,tier:i+1,modId:def.id,w:4+i});
 }
 return result;
}

function genCards(allowSuper){
 var picks=[];
 if(allowSuper!==false&&B.pendingSuper.length){var su=B.pendingSuper.shift();if(!su.mods.includes("super"))picks.push({kind:"super",u:su});}
 var pool=[];
 if(freeSlot()>=0)TURRETS.forEach(function(cfg){
   if(!B.usedTypes[cfg.id]){
     var factor=B.turrets.length<2?3.4:2.2;
     pool.push({kind:"new",cfg:cfg,w:(cfg.rarity==="legend"?2:cfg.rarity==="epic"?3:5)*factor});
   }
 });
 allFighters().forEach(function(u){pool.push({kind:"up",u:u,w:u.isSoldier?7:6});});
 allFighters().forEach(function(u){
   pool.push({kind:"mod",u:u,mod:"dmg",w:4});
   pool.push({kind:"mod",u:u,mod:"crit",w:3});
   pool.push({kind:"mod",u:u,mod:"haste",w:3});
   if(u.extraProj<2&&["soldier","skyguard","disruption","aeroblast","railgun","tesla"].includes(u.cfg.id))pool.push({kind:"mod",u:u,mod:"proj",w:2});
   if(u.cfg.effect==="chain"&&u.chain<5)pool.push({kind:"mod",u:u,mod:"chain",w:2});
   if(u.cfg.effect==="pierce"&&u.pierce<7&&u.pierce<90)pool.push({kind:"mod",u:u,mod:"pierce",w:2});
   if(["skyguard","disruption","aeroblast","tesla"].includes(u.cfg.id)&&u.splash<100)pool.push({kind:"mod",u:u,mod:"splash",w:2});
   if(u.cfg.effect==="slow"&&u.slowPow<0.6)pool.push({kind:"mod",u:u,mod:"slowpow",w:2});
   if(u.cfg.id==="laser"&&!u.refract)pool.push({kind:"mod",u:u,mod:"refract",w:2});
   if(u.cfg.id==="laser"&&(u.reflect||0)<3)pool.push({kind:"mod",u:u,mod:"reflect",w:2});
  if(u.cfg.id==="laser"&&META.levels.laser>=14&&u.runLv>=2&&!u.laserSweep)pool.push({kind:"mod",u:u,mod:"laserSweep",w:3});
  if(u.cfg.id==="laser"&&META.levels.laser>=6&&u.runLv>=2&&!u.laserDeflect)pool.push({kind:"mod",u:u,mod:"laserDeflect",w:2});
  if(u.cfg.id==="laser"&&u.runLv>=2&&(u.laserDurationMul||1)<1.8)pool.push({kind:"mod",u:u,mod:"laserDuration",w:3});
  if(u.cfg.id==="beam"&&u.runLv>=2&&(u.beamDurationMul||1)<1.8)pool.push({kind:"mod",u:u,mod:"beamDuration",w:3});
  if(u.cfg.id==="beam"&&META.levels.beam>=2&&u.runLv>=3&&!u.beamFocusCap)pool.push({kind:"mod",u:u,mod:"beamFocus",w:2});
  if(u.cfg.id==="tesla"&&META.levels.tesla>=2&&u.runLv>=2&&!u.teslaMatrix)pool.push({kind:"mod",u:u,mod:"teslaMatrix",w:3});
  if(u.cfg.id==="tesla"&&META.levels.tesla>=6&&u.teslaMatrix&&!u.teslaMatrixPlus)pool.push({kind:"mod",u:u,mod:"teslaMatrixPlus",w:2});
  if(u.cfg.id==="tesla"&&u.multiCount<6)pool.push({kind:"mod",u:u,mod:"teslaBounce",w:2});
  if(u.cfg.id==="hive"&&u.hiveCount<5)pool.push({kind:"mod",u:u,mod:"hiveCount",w:3});
  if(u.cfg.id==="hive"&&u.runLv>=2&&u.hiveAttacks<16)pool.push({kind:"mod",u:u,mod:"hiveAttacks",w:3});
  if(u.cfg.id==="firewheel"&&u.runLv>=2&&(u.wheelDurationBonus||0)<6)pool.push({kind:"mod",u:u,mod:"wheelDuration",w:3});
  if(u.cfg.id==="firewheel"&&u.runLv>=2&&(u.wheelMax||1)<2)pool.push({kind:"mod",u:u,mod:"wheelCount",w:3});
  chainCandidates(u).forEach(function(card){pool.push(card);});
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
 while(picks.length<3&&pool.length&&guard++<60){
   var tot=0;pool.forEach(function(x){tot+=x.w;});
   var r=Math.random()*tot,idx=0;
   for(var i=0;i<pool.length;i++){r-=pool[i].w;if(r<=0){idx=i;break;}}
   var c=pool.splice(idx,1)[0];
   if(picks.some(function(p){return (p.u&&c.u&&p.u===c.u&&p.kind===c.kind&&p.mod===c.mod)||(p.cfg&&c.cfg&&p.cfg.id===c.cfg.id)||(p.modId&&c.modId&&p.modId===c.modId);}))continue;
   picks.push(c);
 }
 return picks;
}
function cardHTML(c){
 if(c.kind==="chain")return{cls:c.tier===3?"legend":"epic",icon:c.u.cfg.icon,name:c.u.cfg.name+": "+c.def.name,tag:"T"+c.tier+" · R&D "+c.def.rd,desc:c.def.desc+" <b>+1 unit level</b>."};
 if(c.kind==="super"){var s=SUPERS[c.u.cfg.id];return{cls:"super",icon:c.u.cfg.icon,name:c.u.cfg.name+": "+s.name,tag:"⭐ SUPER · Lv. "+(c.u.runLv+1),desc:s.desc+" <b>+1 unit level.</b>"};}
 if(c.kind==="new")return{cls:c.cfg.rarity,icon:c.cfg.icon,name:c.cfg.name,tag:"NEW",desc:"Build <b>"+c.cfg.name+"</b>: "+c.cfg.desc+"<br>Damage: <b>"+c.cfg.damage+"</b> · "+c.cfg.dmgType+" · "+RARITY[c.cfg.rarity].n};
 if(c.kind==="up")return{cls:c.u.cfg.rarity,icon:c.u.cfg.icon,name:c.u.cfg.name,tag:"Lv. "+(c.u.runLv+1),desc:"<b>+18% damage</b>, +4% fire rate."+(((c.u.runLv+1)%5===0)?" <b style='color:var(--gold)'>Super Mode requirement: turret R&D and battle level</b>":"")+" Battle damage: <b>"+fmt(c.u.totalDmg)+"</b>."};
 if(c.kind==="combo"){var CM={spin:["Spinning Laser","Laser + Tesla Coil: an extra beam and +20% Laser damage."],det:["Detonation Lightning","Sky Guard + Thunderbolt: rockets shock nearby enemies."],blaze:["Blazing Swarm","Firewheel + Hive: wasps set enemies on fire."],disr:["Disrupting Beam","Beam + Disruption Drone: the beam slows its target."],vortexWheel:["Vortex Disc","Firewheel + Gravity: the disc gains +25% damage and +2 s lifetime."],binaryStars:["Binary Singularity","Gravity + Hive: stronger pull, field radius +30%."],surgePierce:["Surge Rail","Railgun + Tesla: pierce +2, damage +25%."]}[c.modId];
  return{cls:"epic",icon:"🔗",name:"Combo: "+CM[0],tag:"COMBO · Lv. "+(c.u.runLv+1),desc:CM[1]+" <b>+1 level: "+c.u.cfg.name+"</b>."};}
 if(c.kind==="module"){var MD={boost:["Battlefield Boost","All units deal +12% damage until the end of the battle."],healm:["Fortress Repair","Instantly restore 250 HP to the base."],regenm:["Regeneration Cycle","Instantly restore 200 HP to the base."],jam:["Wave Jammer","All enemies are 15% slower until the end of the battle."]}[c.modId];
  return{cls:"rare",icon:"🧩",name:"Module: "+MD[0],tag:"FORTRESS MODULE",desc:MD[1]};}
 var M={dmg:["Power Module","+15% unit damage."],crit:["Crit Scope","+6% crit chance."],haste:["Accelerator","+10% fire rate."],proj:["Twin Barrel","+1 extra projectile per volley."],chain:["Coil+","+1 chain lightning target."],pierce:["Armor Piercer","+2 projectile pierce."],splash:["Fragmentation Charge","Projectiles gain area damage."],slowpow:["Cryo Core","Slow increased by another 12%."],refract:["Refracting Lens","The beam refracts at the target: two side branches hit nearby enemies for 50% damage."],reflect:["Reflecting Prism","The beam reflects from the farthest target into a neighboring enemy (+1 reflection, up to 3)."],
   laserSweep:["Sweeping Beam","The beam hits an extra target: the toughest of the remaining ones."],
   laserDeflect:["Deflector","An extra beam hits a second target while the laser fires."],
   laserDuration:["Boosted Capacitor","Laser pulse duration +30%."],
   beamDuration:["Beam Resonance","Beam series duration +35%."],
   beamFocus:["Beam Focus","Repeated hits on the same target build damage up to +80%."],
   teslaMatrix:["Electric Matrix","A discharge leaves behind a damage-over-time field."],
   teslaMatrixPlus:["Enhanced Matrix","Increased duration and damage of the Tesla field."],
   teslaBounce:["Discharge Bounce","After a hit, the discharge bounces to one more nearby enemy."],
   hiveCount:["New Wasps","+1 wasp per hive release."],
   hiveAttacks:["Reinforced Stingers","+2 attacks per wasp."],
   wheelDuration:["Firewheel Stabilizer","Fire disc flight time +2 seconds."],
   wheelCount:["Second Firefly","Firewheel keeps two fire discs on the field instead of one."]};
 var m=M[c.mod];return{cls:"rare",icon:c.u.cfg.icon,name:c.u.cfg.name+": "+m[0],tag:"MOD · Lv. "+(c.u.runLv+1),desc:m[1]+" <b>+1 unit level.</b>"+(((c.u.runLv+1)%5===0)?" <b style='color:var(--gold)'>Super Mode requirement: turret R&D and battle level</b>":"")};
}
var curCards=[];
function openDraft(){
 SFX.levelup();
 $("lu-title").textContent="🎴 Points earned!";
 $("lu-sub").textContent="Card for battle points · Cards taken: "+B.drafts+" · Next at "+B.draftNeed+" pts"+(B.pendingDrafts>1?" · "+(B.pendingDrafts-1)+" more queued!":"")+(B.pendingSuper.length?" · ⭐ A super card is in this draft!":"");
 var lb=$("lu-build");lb.innerHTML="";
 allFighters().forEach(function(t){var s=document.createElement("span");s.className="bchip";s.innerHTML=t.cfg.icon+" "+t.cfg.name+" <b>Lv."+t.runLv+"</b>";lb.appendChild(s);});
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
   b.innerHTML='<span class="uic">'+h.icon+'</span><span><span class="un">'+h.name+'<span class="utag">'+h.tag+'</span></span><div class="ud">'+h.desc+'</div></span>';
   b.addEventListener("click",function(){applyCard(c);});
   box.appendChild(b);
 });
}
$("btn-reroll").addEventListener("click",function(){if(!B.reroll)return;B.reroll=false;
 // do not lose the super card on reroll
 var sup=curCards.filter(function(c){return c.kind==="super";});
 curCards=genCards(sup.length===0);sup.forEach(function(s){if(!curCards.some(function(c){return c.kind==="super";}))curCards[0]=s;});
 renderCards();$("btn-reroll").style.display="none";SFX.pick();});
/* ANY card for an existing unit (upgrade, mod, super) = +1 to its level.
   Every 5th level queues a super card for the next draft. */
function gainLevel(u,statBoost){
 u.runLv++;
 if(statBoost){u.dmgMul*=1.18;u.haste*=1.04;}
 burst(u.x,u.y,12,u.cfg.color);
 if(u.runLv>=5&&u.runLv%5===0&&META.levels[u.cfg.id]>=rdTierUnlock(u.cfg.id)&&!u.mods.includes("super")&&!B.pendingSuper.includes(u))B.pendingSuper.push(u);
}
function applyCard(c){
 if(c.kind==="new"){
   var s=freeSlot();if(s<0)return;
   var nt=mkUnit(c.cfg,TURRET_X[s],s,false);B.turrets.push(nt);B.usedTypes[c.cfg.id]=1;burst(nt.x,nt.y,16,c.cfg.color);
  }else if(c.kind==="chain"){
   if(META.levels[c.u.cfg.id]<c.def.rd||(c.tier>1&&!c.u.mods.includes(CARD_CHAINS[c.u.cfg.id][c.tier-2].id)))return;
   if(c.u.mods.includes(c.def.id))return;
   c.def.apply(c.u);c.u.mods.push(c.def.id);gainLevel(c.u,false);
 }else if(c.kind==="super"){
   SUPERS[c.u.cfg.id].apply(c.u);c.u.mods.push("super");burst(c.u.x,c.u.y,22,"#ffd34d");B.shake=6;
   gainLevel(c.u,false);
 }else if(c.kind==="up"){
   gainLevel(c.u,true);
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
   gainLevel(c.u,false);
 }else if(c.kind==="module"){
   B.modulesUsed[c.modId]=1;
   if(c.modId==="boost")B.allDmgMul*=1.12;
   if(c.modId==="healm")B.baseHp=Math.min(B.baseMax,B.baseHp+250);
   if(c.modId==="regenm")B.baseHp=Math.min(B.baseMax,B.baseHp+200);
   if(c.modId==="jam"){B.enemySpdMul*=0.85;B.enemies.forEach(function(e){e.speed*=0.85;if(e.baseSpeed!==undefined)e.baseSpeed*=0.85;});}
   burst(W/2,BASEY-46,18,"#2ee6c8");
 }else{
   var t=c.u;
   if(c.mod==="dmg")t.dmgMul*=1.15;
   if(c.mod==="crit")t.critBonus+=0.06;
   if(c.mod==="haste")t.haste*=1.10;
   if(c.mod==="proj")t.extraProj++;
   if(c.mod==="chain")t.chain++;
   if(c.mod==="pierce")t.pierce=Math.min(15,t.pierce+2);
   if(c.mod==="splash")t.splash+=28;
   if(c.mod==="slowpow")t.slowPow=Math.min(0.75,t.slowPow+0.12);
   if(c.mod==="refract")t.refract=true;
   if(c.mod==="reflect")t.reflect=(t.reflect||0)+1;
   if(c.mod==="laserSweep")t.laserSweep=1;
   if(c.mod==="laserDeflect")t.laserDeflect=1;
   if(c.mod==="laserDuration")t.laserDurationMul=(t.laserDurationMul||1)+0.3;
   if(c.mod==="beamDuration")t.beamDurationMul=(t.beamDurationMul||1)+0.35;
   if(c.mod==="beamFocus")t.beamFocusCap=0.8;
   if(c.mod==="teslaMatrix")t.teslaMatrix=true;
   if(c.mod==="teslaMatrixPlus")t.teslaMatrixPlus=true;
   if(c.mod==="teslaBounce")t.multiCount++;
   if(c.mod==="hiveCount")t.hiveCount++;
   if(c.mod==="hiveAttacks")t.hiveAttacks+=2;
   if(c.mod==="wheelDuration")t.wheelDurationBonus=(t.wheelDurationBonus||0)+2;
   if(c.mod==="wheelCount")t.wheelMax=2;
   t.mods.push(c.mod);
   gainLevel(t,false);
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

