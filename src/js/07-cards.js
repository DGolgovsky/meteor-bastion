/* ==================== CARDS: declarative battle cards, turret levels 1–3 and pips ==================== */
/* One source of truth for every battle card. Each entry holds both the effect (fx ops) and
   the text: cardDesc() builds the description from `text` + the numeric fx ops, and
   applyCardDef() runs exactly the same ops, so a card can never say one number and do another.
   fx op forms:
     {k:"dmgMul",mul:1.5,l:"DMG"}           → u.dmgMul*=1.5,            text "DMG +50%"
     {k:"hiveCount",add:2,l:"Wasps"}        → u.hiveCount+=2,           text "Wasps +2"
     {k:"x",add:0.4,pct:1,l:"Duration"}     → u.x=(u.x||0)+0.4,         text "Duration +40%"
     {k:"x",add:2,unit:" s",l:"Flight"}     → seconds,                  text "Flight +2 s"
     {k:"x",set:true}                       → flag; described by `text`
     cap / floor clamp the result of add/mul.
   Levels (owner decision 2026-11-10, reference "Selected Cards Overview"):
   - a turret is built at Lv.1 with 0/4 pips; every normal (teal) card of that unit fills one pip;
   - after 3 pips the unit's purple card is GUARANTEED in every draft until taken; the purple
     card fills the 4th pip and raises the level (Lv.1→2 = evolution card, Lv.2→3 = the SUPER);
   - Lv.3 is the maximum; the card badge (1/2) is the minimum unit level for the card to appear;
   - R&D gates: card.rd (migrated T1 cards R&D 2, Lv.2 cards R&D ≥6, SUPER = rdTierUnlock). */
var MAX_RUN_LV=3, PIPS_PER_LV=4;
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
var CARDS=[
 /* ---- Sky Guard (Fire) ---- */
 {id:"volleyMissile",unit:"skyguard",name:"Volley Missile",lvl:1,max:2,fx:[{k:"extraProj",add:1,l:"Missiles"},{k:"dmgMul",mul:0.85,l:"DMG"}]},
 {id:"explosionSpread",unit:"skyguard",name:"Explosion Spread",lvl:1,max:2,fx:[{k:"splash",mul:1.3,l:"Explosion range"}]},
 {id:"impactReinforcement",unit:"skyguard",name:"Impact Reinforcement",lvl:1,text:"After a hit, the missile launches 3 small missiles that deal impact damage only.",fx:[{k:"impactReinforce",set:3}]},
 {id:"impactMultiplier",unit:"skyguard",name:"Impact Multiplier",lvl:1,rare:true,text:"All Sky Guard missiles:",fx:[{k:"impactMul",add:2,pct:1,base:1,l:"Impact DMG"}]},
 {id:"thermalWarhead",unit:"skyguard",name:"Thermal Warhead",lvl:2,rd:14,text:"Missile explosions set enemies on fire.",fx:[{k:"rocketBurn",set:true}]},
 /* ---- Laser (Energy) ---- */
 {id:"laserAmplification",unit:"laser",name:"Laser Amplification",lvl:1,max:2,fx:[{k:"dmgMul",mul:1.5,l:"Laser DMG"}]},
 {id:"laserReflection",unit:"laser",name:"Laser Reflection",lvl:1,max:3,text:"DMG -20% per reflection.",fx:[{k:"reflect",add:1,cap:3,l:"Reflections"}]},
 {id:"energySurge",unit:"laser",name:"Energy Surge",lvl:1,text:"Fires 2 additional deflected lasers.",fx:[{k:"laserDeflect",set:2}]},
 {id:"stableEnergy",unit:"laser",name:"Stable Energy",lvl:1,max:2,fx:[{k:"laserDurationMul",add:0.4,pct:1,base:1,l:"Laser duration"}]},
 {id:"additionalSweep",unit:"laser",name:"Additional Sweep",lvl:1,max:2,text:"Fires 1 additional sweeping laser at the toughest remaining enemy.",fx:[{k:"laserSweep",add:1,cap:2}]},
 {id:"refractingLens",unit:"laser",name:"Refracting Lens",lvl:1,text:"The beam refracts at the target: two side branches hit nearby enemies for 50% damage.",fx:[{k:"refract",set:true}]},
 {id:"highEnergyPulse",unit:"laser",name:"High-Energy Pulse",lvl:1,rare:true,text:"The laser hits a twice wider band.",fx:[{k:"laserBandMul",add:1,pct:1,base:1,l:"Laser DMG range"}]},
 {id:"slowLaser",unit:"laser",name:"Slow Laser",lvl:2,rd:6,text:"Enemies hit by deflected, reflected and sweeping lasers get [Slow] (30%).",fx:[{k:"laserSlow",set:true}]},
 {id:"laserVulnerable",unit:"laser",name:"Vulnerability Mark",lvl:1,rd:2,text:"Repeated laser hits make enemies [Vulnerable]: up to +30% incoming damage.",fx:[{k:"laserVulnerable",set:true}]},
 /* ---- Beam (Energy) ---- */
 {id:"highFrequencyBeam",unit:"beam",name:"High-Frequency Beam",lvl:1,max:3,fx:[{k:"haste",mul:1.3,l:"Beam cooldown speed"}]},
 {id:"beamRefraction",unit:"beam",name:"Beam Refraction",lvl:1,text:"On hit, the beam spawns refracted beams at nearby enemies.",fx:[{k:"beamRefractions",add:2,l:"Refractions"}]},
 {id:"beamResonance",unit:"beam",name:"Beam Resonance",lvl:1,max:2,fx:[{k:"beamDurationMul",add:0.35,pct:1,base:1,l:"Beam series duration"}]},
 {id:"beamFocus",unit:"beam",name:"Beam Focus",lvl:1,rd:2,text:"Repeated hits on the same target build damage up to +80%.",fx:[{k:"beamFocusCap",set:0.8}]},
 {id:"beamPenetration",unit:"beam",name:"Beam Penetration",lvl:1,rare:true,text:"All beams inflict [Vulnerable] on their targets.",fx:[{k:"beamVulnerable",set:true}]},
 {id:"beamStack",unit:"beam",name:"Stacking Damage",lvl:2,rd:6,req:["beamFocus"],text:"The accumulated focus bonus is kept when switching targets.",fx:[{k:"beamStacking",set:true}]},
 {id:"beamOvercharge",unit:"beam",name:"Concentrated Stream",lvl:2,rd:14,req:["beamStack"],text:"Focus cap raised to +300%.",fx:[{k:"beamFocusCap",set:3}]},
 /* ---- Hive (Force field) ---- */
 {id:"denseSwarm",unit:"hive",name:"Dense Swarm",lvl:1,max:2,fx:[{k:"hiveCount",add:2,cap:12,l:"Wasps"},{k:"dmgMul",mul:0.85,l:"DMG"}]},
 {id:"rapidBarrage",unit:"hive",name:"Rapid Barrage",lvl:1,max:3,fx:[{k:"hiveAttacks",add:2,l:"Wasp attack count"}]},
 {id:"swarmAssault",unit:"hive",name:"Swarm Assault",lvl:1,max:2,fx:[{k:"dmgMul",mul:1.5,l:"Wasp DMG"}]},
 {id:"swarmEcho",unit:"hive",name:"Swarm Echo",lvl:1,rd:2,text:"On a kill, a wasp spawns 1 Echo Wasp I (50% DMG, max 1 per wasp).",fx:[{k:"hiveEcho",set:1}]},
 {id:"waspEvolution",unit:"hive",name:"Wasp Evolution II",lvl:1,rare:true,text:"A Wasp I evolves into Wasp II (+50% DMG) after 3 attacks.",fx:[{k:"waspEvolve",set:3}]},
 {id:"electroWasps",unit:"hive",name:"Electro-Wasps",lvl:2,rd:6,text:"Each wasp attack has a 50% chance to release a high-voltage shock at up to 2 nearby enemies (60% of the sting, Electric DMG).",fx:[{k:"electroWasps",set:true}]},
 {id:"echoUpgrade2",unit:"hive",name:"Echo Upgrade II",lvl:2,rd:6,req:["swarmEcho"],text:"Echo wasps evolve into Echo Wasp II (75% DMG).",fx:[{k:"hiveEcho",set:2}]},
 {id:"echoUpgrade3",unit:"hive",name:"Echo Upgrade III",lvl:2,rd:10,req:["echoUpgrade2"],text:"Echo wasps deal full damage.",fx:[{k:"hiveEcho",set:3}]},
 /* ---- Tesla Coil (Electric) ---- */
 {id:"electroChain",unit:"tesla",name:"Electro Chain",lvl:1,max:3,fx:[{k:"multiCount",add:1,cap:6,l:"Bounces"},{k:"dmgMul",mul:0.85,l:"DMG"}]},
 {id:"electroAcceleration",unit:"tesla",name:"Electro Acceleration",lvl:1,max:2,fx:[{k:"haste",mul:1.3,l:"Tesla cooldown speed"}]},
 {id:"trapMatrix",unit:"tesla",name:"Trap Matrix",lvl:1,rare:true,text:"A discharge leaves an electric matrix that damages enemies over time.",fx:[{k:"teslaMatrix",set:true}]},
 {id:"enhancedMatrix",unit:"tesla",name:"Enhanced Matrix",lvl:2,rd:6,req:["trapMatrix"],text:"The matrix lasts longer and hits harder.",fx:[{k:"teslaMatrixPlus",set:true}]},
 {id:"matrixThunder",unit:"tesla",name:"Matrix Thunderbolt",lvl:2,rd:10,req:["enhancedMatrix"],text:"The matrix periodically paralyzes enemies.",fx:[{k:"teslaThunder",set:true}]},
 /* ---- Aeroblast (Physical) ---- */
 {id:"impactEnhancement",unit:"aeroblast",name:"Impact Enhancement",lvl:1,max:2,fx:[{k:"knock",mul:1.5,l:"Knockback"},{k:"dmgMul",mul:1.3,l:"DMG"}]},
 {id:"rapidBlast",unit:"aeroblast",name:"Rapid Blast",lvl:1,max:2,fx:[{k:"haste",mul:1.2,l:"Fire rate"}]},
 {id:"aeroPressure",unit:"aeroblast",name:"Compression",lvl:1,rd:2,fx:[{k:"knock",mul:1.2,l:"Knockback"},{k:"splash",mul:1.2,l:"Impact radius"}]},
 {id:"aeroStorm",unit:"aeroblast",name:"Air Storm",lvl:1,rare:true,fx:[{k:"splash",mul:1.5,l:"Impact area"},{k:"dmgMul",mul:1.2,l:"DMG"}]},
 {id:"aeroCascade",unit:"aeroblast",name:"Shockwave",lvl:2,rd:6,fx:[{k:"extraProj",add:1,l:"Air pellets"}]},
 /* ---- Disruption Drone (Force field) ---- */
 {id:"cryoCore",unit:"disruption",name:"Cryo Core",lvl:1,max:2,fx:[{k:"slowPow",add:0.12,cap:0.75,pct:1,l:"Slow"}]},
 {id:"pulseOverclock",unit:"disruption",name:"Pulse Overclock",lvl:1,max:2,fx:[{k:"haste",mul:1.2,l:"Pulse rate"}]},
 {id:"fieldSaturation",unit:"disruption",name:"Field Saturation",lvl:1,rd:2,fx:[{k:"splash",mul:1.2,l:"Field area"}]},
 {id:"fieldExpose",unit:"disruption",name:"Defense Breach",lvl:1,rare:true,text:"Field pulses inflict [Vulnerable].",fx:[{k:"fieldExpose",set:true}]},
 {id:"fieldStasis",unit:"disruption",name:"Disruption Stasis",lvl:2,rd:6,fx:[{k:"slowPow",add:0.15,cap:0.75,pct:1,l:"Slow"}]},
 /* ---- Thunderbolt (Electric) ---- */
 {id:"thunderLink",unit:"thunder",name:"Double Chain",lvl:1,max:3,fx:[{k:"chain",add:1,cap:6,l:"Chain targets"}]},
 {id:"stormCapacitor",unit:"thunder",name:"Storm Capacitor",lvl:1,max:2,fx:[{k:"haste",mul:1.2,l:"Fire rate"}]},
 {id:"thunderStun",unit:"thunder",name:"Paralyzing Discharge",lvl:1,rare:true,text:"Lightning inflicts [Slow].",fx:[{k:"thunderParalyze",set:true}]},
 {id:"thunderStorm",unit:"thunder",name:"Discharge Storm",lvl:2,rd:14,fx:[{k:"haste",mul:1.25,l:"Fire rate"}]},
 /* ---- Firewheel Drone (Fire) ---- */
 {id:"wheelDuration",unit:"firewheel",name:"Firewheel Stabilizer",lvl:1,max:3,fx:[{k:"wheelDurationBonus",add:2,unit:" s",l:"Disc flight time"}]},
 {id:"wheelCount",unit:"firewheel",name:"Second Firefly",lvl:1,text:"Keeps two fire discs on the field instead of one.",fx:[{k:"wheelMax",set:2}]},
 {id:"flameTrail",unit:"firewheel",name:"Flame Trail",lvl:1,rare:true,text:"The disc leaves burning areas behind it.",fx:[{k:"fireTrail",set:true}]},
 {id:"blazingTrail",unit:"firewheel",name:"Blazing Trail",lvl:2,rd:6,fx:[{k:"dmgMul",mul:1.25,l:"Disc DMG"}]},
 {id:"extendedTrail",unit:"firewheel",name:"Extended Trail",lvl:2,rd:14,fx:[{k:"wheelDurationBonus",add:3,unit:" s",l:"Disc flight time"}]},
 /* ---- Railgun (Physical) ---- */
 {id:"armorPiercer",unit:"railgun",name:"Armor Piercer",lvl:1,max:2,fx:[{k:"pierce",add:2,cap:15,l:"Pierce"}]},
 {id:"railCapacitor",unit:"railgun",name:"Rail Capacitor",lvl:1,max:2,fx:[{k:"dmgMul",mul:1.2,l:"DMG"}]},
 {id:"railExplosive",unit:"railgun",name:"Explosive Shells",lvl:1,rare:true,text:"Piercing projectiles explode over a small area.",fx:[{k:"railExplosive",set:true}]},
 {id:"railPiercing",unit:"railgun",name:"Piercing Impact",lvl:2,rd:6,fx:[{k:"pierce",add:2,cap:15,l:"Pierce"}]},
 {id:"railShock",unit:"railgun",name:"Shock Rail",lvl:2,rd:14,fx:[{k:"dmgMul",mul:1.3,l:"DMG"},{k:"pierce",add:1,cap:15,l:"Pierce"}]},
 /* ---- Gravity Vortex Gun (Force field) ---- */
 {id:"fieldAmplifier",unit:"gravity",name:"Field Amplifier",lvl:1,max:2,fx:[{k:"gravityPower",mul:1.3,l:"Field DMG"}]},
 {id:"eventHorizon",unit:"gravity",name:"Event Horizon",lvl:1,max:2,fx:[{k:"gravityRadius",mul:1.2,l:"Field size"}]},
 {id:"smallBlackHole",unit:"gravity",name:"Small Black Hole",lvl:1,rare:true,fx:[{k:"gravityDuration",add:1.2,unit:" s",l:"Pull duration"}]},
 {id:"blackHoleExpansion",unit:"gravity",name:"Black Hole Expansion",lvl:2,rd:6,fx:[{k:"gravityRadius",mul:1.35,l:"Radius"},{k:"gravityPull",mul:1.2,l:"Pull"}]},
 {id:"destructiveBlackHole",unit:"gravity",name:"Destructive Black Hole",lvl:2,rd:14,text:"The field inflicts [Vulnerable].",fx:[{k:"gravityShred",set:true}]},
 /* ---- Guardian = the reference's bullet turret (Physical) ---- */
 {id:"bulletsBoost",unit:"soldier",name:"Bullets Boost",lvl:1,max:2,fx:[{k:"dmgMul",mul:1.5,l:"Bullet DMG"}]},
 {id:"volleyShot",unit:"soldier",name:"Volley Shot",lvl:1,max:2,fx:[{k:"extraProj",add:1,l:"Bullets"},{k:"dmgMul",mul:0.85,l:"DMG"}]},
 {id:"piercingBullet",unit:"soldier",name:"Piercing Bullet",lvl:1,max:2,fx:[{k:"pierce",add:1,l:"Bullet penetration"}]},
 {id:"shotgunEvolution",unit:"soldier",name:"Shotgun Evolution",lvl:1,rare:true,text:"Each shot scatters into 2 additional bullets in a real spread.",fx:[{k:"shotgunSpread",set:2}]},
 {id:"flameBullet",unit:"soldier",name:"Flame Bullet",lvl:2,rd:6,text:"Bullets become flame bullets and deal extra fire damage over time on hit.",fx:[{k:"flameBullet",set:true}]},
 {id:"guardianExplosion",unit:"soldier",name:"Explosive Rounds",lvl:2,rd:6,text:"Bullets deal area damage.",fx:[{k:"splash",set:34}]},
 {id:"guardianOverdrive",unit:"soldier",name:"Guardian Overdrive",lvl:2,rd:14,fx:[{k:"haste",mul:1.25,l:"Fire rate"}]}
];
/* Level-2 purple card of every unit = its SUPER, gated by rdTierUnlock as before. */
Object.keys(SUPERS).forEach(function(id){
 CARDS.push({id:"super",unit:id,name:SUPERS[id].name,lvl:2,rare:true,isSuper:true,text:SUPERS[id].desc,fx:[{fn:SUPERS[id].apply}]});
});
function cardRd(def){return def.isSuper?rdTierUnlock(def.unit):(def.rd||1);}
function fmtNum(x){return String(Math.round(x*100)/100);}
function fxText(op){
 if(!op.l)return "";
 if(op.mul!==undefined){var p=Math.round((op.mul-1)*100);return op.l+" "+(p>=0?"+":"-")+Math.abs(p)+"%";}
 if(op.add!==undefined){
  if(op.pct)return op.l+" "+(op.add>=0?"+":"-")+Math.round(Math.abs(op.add)*100)+"%";
  return op.l+" "+(op.add>=0?"+":"-")+fmtNum(Math.abs(op.add))+(op.unit||"");
 }
 return "";
}
function cardDesc(def){
 var stats=def.fx.map(fxText).filter(Boolean).join(", ");
 if(def.text&&stats)return def.text+" "+stats+".";
 return def.text||(stats+".");
}
function applyCardDef(def,u){
 def.fx.forEach(function(op){
  if(op.fn){op.fn(u);return;}
  var v=u[op.k];
  if(op.mul!==undefined)v=(v===undefined?(op.base||1):v)*op.mul;
  else if(op.add!==undefined)v=(v===undefined||v===false?(op.base||0):v)+op.add;
  else v=op.set;
  if(op.cap!==undefined&&typeof v==="number")v=Math.min(op.cap,v);
  u[op.k]=v;
 });
}
function unitCardCount(u,id){return (u.cards&&u.cards[id])||0;}
/* Is the card offerable for this unit right now? Purple cards need 3 filled pips on their level. */
function cardEligible(u,def){
 if(def.unit!==u.cfg.id)return false;
 if(unitCardCount(u,def.id)>=(def.max||1))return false;
 if((META.levels[u.cfg.id]||1)<cardRd(def))return false;
 if(u.runLv<def.lvl)return false;
 if(def.req&&!def.req.every(function(r){return u.mods.includes(r);}))return false;
 if(def.rare)return def.lvl===u.runLv&&u.runLv<MAX_RUN_LV&&u.pips>=PIPS_PER_LV-1;
 return true;
}
function unitCards(u){return CARDS.filter(function(d){return cardEligible(u,d);});}
function purpleFor(u){return unitCards(u).filter(function(d){return d.rare;})[0]||null;}
function cardById(unit,id){return CARDS.filter(function(d){return d.unit===unit&&d.id===id;})[0]||null;}
/* Pip bookkeeping: normal cards fill pips 1–3; a purple card fills the 4th and levels the unit up. */
function addPip(u){if(u.runLv<MAX_RUN_LV&&u.pips<PIPS_PER_LV-1)u.pips++;}
function levelUp(u){
 u.runLv=Math.min(MAX_RUN_LV,u.runLv+1);u.pips=u.runLv>=MAX_RUN_LV?PIPS_PER_LV:0;
 u.dmgMul*=1+BALANCE.levelUpDmg;
 burst(u.x,u.y,22,u.cfg.color);if(B)B.shake=Math.max(B.shake||0,5);
}
function takeCard(u,def){
 applyCardDef(def,u);
 u.cards[def.id]=unitCardCount(u,def.id)+1;
 if(!u.mods.includes(def.id))u.mods.push(def.id);
 if(def.rare)levelUp(u);else{addPip(u);burst(u.x,u.y,12,u.cfg.color);}
 recordPick({unit:u.cfg.id,icon:u.cfg.icon,id:def.id,name:def.name,lvl:def.lvl,rare:!!def.rare,desc:cardDesc(def)});
}
function recordPick(p){
 if(!B.picked)B.picked=[];
 var same=B.picked.filter(function(x){return x.unit===p.unit&&x.id===p.id;})[0];
 if(same)same.n++;else{p.n=1;B.picked.push(p);}
}
