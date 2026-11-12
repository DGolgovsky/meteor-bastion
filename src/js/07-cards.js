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
   Levels (owner decisions 2026-11-10 / 2026-11-11, docs/turrets-reference.md):
   - a turret is built at Lv.1 with 0/4 pips; every normal (teal) card fills one pip;
   - the card pool of a unit at level L = its normal cards of Star Tier ≤ L;
   - after 3 pips the unit's Extra (purple) cards of Star Tier ≤ L enter the weighted pool;
     Extras are rarer than normal cards and are not guaranteed. A purple fills the 4th pip
     and raises the level (max Lv.3). At Lv.3 a purple
     completes a "mastery" cycle: pips reset to 0 and the next purple can be earned again;
   - reaching Lv.3 switches on the unit's Super Mode automatically if R&D ≥ rdTierUnlock(id);
   - R&D gates: card.rd = the reference lock "🔒 Lv.X" or the Lv.2/6/10 unlock level. */
var MAX_RUN_LV=3, PIPS_PER_LV=4;
/* Relative offer weights, not fixed probabilities: the available card pool changes as cards
   are taken. A higher Star Tier is always rarer than a lower one in the same unit's pool. */
var CARD_DROP={tier:[1,0.5,0.25],extra:0.2,unitWeight:18,bonusWeight:0.8};
function cardDropWeight(def){return CARD_DROP.tier[Math.max(0,Math.min(2,(def.lvl||1)-1))]*(def.rare?CARD_DROP.extra:1);}
var SUPERS={
 skyguard:{name:"Rocket Barrage",desc:"+2 rockets per volley and +40% fire rate.",apply:function(u){u.extraProj+=2;u.haste*=1.4;}},
 laser:{name:"Mirror Resonator",desc:"The beam gains reflection and refraction at once, +60% damage.",apply:function(u){u.beamSplit=true;u.reflect=Math.max(u.reflect||0,2);u.refract=true;u.dmgMul*=1.6;}},
 disruption:{name:"Stasis Field",desc:"Slow increased to 70%, pulses gain a slowing splash.",apply:function(u){u.slowPow=0.7;u.splash=Math.max(u.splash,50);}},
 aeroblast:{name:"Hurricane",desc:"Knockback is three times stronger, blasts gain a large splash.",apply:function(u){u.knock=36;u.splash=Math.max(u.splash,60);}},
 thunder:{name:"Thunderstorm",desc:"Every strike launches Chain Lightning with +3 targets, +50% damage.",apply:function(u){u.chainLightning=true;u.chainTargets=(u.chainTargets||5)+3;u.dmgMul*=1.5;}},
 beam:{name:"Annihilator",desc:"+150% damage and +20% crit chance.",apply:function(u){u.dmgMul*=2.5;u.critBonus+=0.2;}},
 firewheel:{name:"Inferno",desc:"Every disc hit ignites the enemy and burning is 3 times stronger.",apply:function(u){u.burnMul=3;u.wheelIgnite=1;}},
 hive:{name:"Mother Swarm",desc:"Drones are released in pairs and deal double damage.",apply:function(u){u.hiveDouble=true;u.dmgMul*=1.35;}},
 railgun:{name:"Piercing Volley",desc:"The projectile pierces ALL enemies on its line, +80% damage.",apply:function(u){u.pierce=99;u.dmgMul*=1.8;}},
 tesla:{name:"Overvoltage",desc:"The discharge bounces across 6 targets, +60% damage.",apply:function(u){u.multiCount=6;u.dmgMul*=1.6;}},
 gravity:{name:"Black Singularity",desc:"Field radius +50%, pull +35%, +40% field damage.",apply:function(u){u.gravityRadius*=1.5;u.gravityPull*=1.35;u.gravityPower*=1.4;}},
 soldier:{name:"Legendary Marksman",desc:"+100% damage, +25% crit chance and +1 projectile per burst, across the whole field.",apply:function(u){u.dmgMul*=2;u.critBonus+=0.25;u.extraProj+=1;}}
};
/* Reference card set (docs/turrets-reference.md, owner request 2026-11-11).
   C(unit, starTier, name, rdGate, isExtra, text, fx). Star Tier N = in-run level N pool (badge N);
   Extra (purple) = completes the 4th pip; rdGate = the reference "🔒 Lv.X" / Lv.2/6/10 unlock. */
var CARDS=[];
function cardIdOf(name){var s=name.replace(/\+/g," Plus").replace(/[^A-Za-z0-9]+(.)?/g,function(m,c){return c?c.toUpperCase():"";});return s.charAt(0).toLowerCase()+s.slice(1);}
function defCard(unit,lvl,name,rd,rare,text,fx){CARDS.push({id:cardIdOf(name),unit:unit,name:name,lvl:lvl,rd:rd||1,rare:!!rare,text:text||"",fx:fx||[]});}
function fxFlag(k){return {k:k,set:true};}
/* ---- Sky Guard (Fire) ---- */
defCard("skyguard",1,"Volley Missile",1,0,"",[{k:"extraProj",add:1,l:"Sky Guard missiles"},{k:"dmgMul",mul:0.85,l:"DMG"}]);
defCard("skyguard",1,"Sky Guard Boost",1,0,"",[{k:"dmgMul",mul:1.5,l:"Sky Guard missile DMG"}]);
defCard("skyguard",1,"Explosion Spread",1,0,"",[{k:"splash",mul:1.3,l:"Explosion range"}]);
defCard("skyguard",1,"Impact Reinforcement",1,0,"After hitting a target, a Sky Guard missile launches 3 small missiles that deal impact damage only.",[{k:"impactReinforce",add:3}]);
defCard("skyguard",1,"Ignition",2,0,"Enemies hit by Sky Guard missiles get [Burn].",[fxFlag("rocketBurn")]);
defCard("skyguard",1,"Volley Missile+",26,0,"",[{k:"extraProj",add:1,l:"Sky Guard missiles"}]);
defCard("skyguard",1,"Sky Guard Boost+",34,0,"",[{k:"dmgMul",mul:2,l:"Sky Guard missile DMG"}]);
defCard("skyguard",1,"Explosion Spread+",42,0,"",[{k:"splash",mul:1.45,l:"Explosion range"}]);
defCard("skyguard",1,"Burning Area",1,1,"After exploding, Sky Guard missiles leave a burning area for 5 s.",[fxFlag("burnArea")]);
defCard("skyguard",1,"Impact Multiplier",1,1,"All Sky Guard missiles:",[{k:"impactMul",add:2,pct:1,base:1,l:"Impact DMG"}]);
defCard("skyguard",2,"Missile Amplification",1,0,"",[{k:"impactReinforce",add:3,l:"Sky Guard small missiles"}]);
defCard("skyguard",2,"Ignition Amplification",6,0,"",[{k:"burnMul",mul:2,l:"[Burn] DMG"}]);
defCard("skyguard",2,"Thermal Warhead",22,0,"Sky Guard small missiles have a 60% chance to explode on hitting an enemy.",[fxFlag("thermalMini")]);
defCard("skyguard",2,"Collapse Explosion",1,0,"After a Sky Guard missile explodes, a small black hole appears.",[fxFlag("collapseHole")]);
defCard("skyguard",2,"Shock Thunder Blast",30,0,"All missiles have a 20% chance to leave a Floating Mine when dealing impact damage.",[fxFlag("shockMine")]);
defCard("skyguard",2,"Strong Impact",1,1,"",[{k:"extraProj",add:2,l:"Sky Guard missiles"}]);
defCard("skyguard",2,"Close-range Explosion",14,1,"After hitting a target, a Sky Guard missile triggers an extra strong explosion nearby.",[fxFlag("closeBlast")]);
defCard("skyguard",3,"Chain Reaction",1,0,"Sky Guard small missiles have a 60% chance to launch one more small missile on hitting an enemy.",[fxFlag("chainReaction")]);
defCard("skyguard",3,"Death Ignition",10,0,"An enemy dying under [Burn] explodes.",[fxFlag("deathIgnition")]);
defCard("skyguard",3,"Detonation Thunderbolt",1,0,"When Sky Guard missiles kill an enemy, a stationary small Thunderbolt appears for 5 s.",[fxFlag("detonationBolt")]);
defCard("skyguard",3,"Path Strike",1,0,"Sky Guard missiles deal impact damage to enemies along their path.",[fxFlag("pathStrike")]);
defCard("skyguard",3,"Impact Cleave",38,0,"All missiles fire a Ripping Laser when dealing impact damage.",[fxFlag("impactCleave")]);
defCard("skyguard",3,"Fire Transmission",1,1,"Sky Guard missiles inflict [Burn] on enemies they fly through.",[fxFlag("fireTrans")]);
/* ---- Laser (Energy) — every laser starts at the turret ---- */
defCard("laser",1,"Laser Amplification",1,0,"",[{k:"dmgMul",mul:1.5,l:"Laser DMG"}]);
defCard("laser",1,"Stable Energy",1,0,"",[{k:"laserDurationMul",add:0.4,pct:1,base:1,l:"Laser duration"}]);
defCard("laser",1,"Laser Reflection",1,0,"DMG -20% per reflection.",[{k:"reflect",add:1,l:"Laser reflections"}]);
defCard("laser",1,"Additional Sweep",1,0,"Fires 1 additional Sweeping Laser from the turret.",[{k:"laserSweep",add:1}]);
defCard("laser",1,"Energy Surge",2,0,"Fires 2 additional Deflected Lasers from the turret.",[{k:"laserDeflect",add:2}]);
defCard("laser",1,"Laser Amplification+",26,0,"",[{k:"dmgMul",mul:2,l:"Laser DMG"}]);
defCard("laser",1,"Laser Reflection+",34,0,"",[{k:"reflect",add:1,l:"Laser reflections"}]);
defCard("laser",1,"Stable Energy+",42,0,"",[{k:"laserDurationMul",add:0.6,pct:1,base:1,l:"Laser duration"}]);
defCard("laser",1,"High-Energy Pulse",1,1,"",[{k:"laserBandMul",add:1,pct:1,base:1,l:"Laser DMG range"}]);
defCard("laser",1,"Multi-Strike",1,1,"",[{k:"laserDurationMul",add:1,pct:1,base:1,l:"Laser duration"},{k:"haste",mul:1.2,l:"Cooldown speed"}]);
defCard("laser",2,"Vulnerable Laser",1,0,"Enemies hit by Sweeping Lasers get [Vulnerable].",[fxFlag("sweepVuln")]);
defCard("laser",2,"Slow Laser",6,0,"Enemies hit by Deflected Lasers get [Slow].",[fxFlag("laserSlow")]);
defCard("laser",2,"Energy Paralysis",1,0,"Enemies hit by the laser get [Paralyze].",[fxFlag("laserParalyze")]);
defCard("laser",2,"Graviton Laser",22,0,"Lasers pull nearby enemies in.",[fxFlag("gravitonLaser")]);
defCard("laser",2,"Emberrail Laser",38,0,"While active, the piercing laser leaves a Flame Trail.",[fxFlag("emberrail")]);
defCard("laser",2,"Energy Overload",1,1,"",[{k:"debuffDurMul",add:1,pct:1,base:1,l:"Duration of all laser debuffs"}]);
defCard("laser",2,"Tear Explosion",1,1,"A laser hit has a 20% chance to fire a Ripping Laser from the turret.",[fxFlag("tearExplosion")]);
defCard("laser",2,"Energy Boost",18,1,"Laser DMG +60% for every debuff on the enemy (max 300%).",[fxFlag("energyBoost")]);
defCard("laser",3,"Sweep Boost",1,0,"The Sweeping Laser sweeps one more time.",[{k:"sweepPasses",add:1,base:1}]);
defCard("laser",3,"Deflected Laser Reflection",14,0,"Deflected laser reflections +1.",[{k:"deflectReflect",add:1}]);
defCard("laser",3,"Energy Detonation",1,0,"All lasers trigger an Ignition Explosion when hitting enemies with [Burn].",[fxFlag("energyDetonation")]);
defCard("laser",3,"Convergence Trigger",1,0,"A laser hit has a 30% chance to create a Refracted Beam from the turret.",[fxFlag("convergence")]);
defCard("laser",3,"Disruption Laser",30,0,"When dealing damage, the laser has a 10% chance to apply 1 stack of [Disruption].",[fxFlag("disruptionLaser")]);
/* ---- Disruption Drone (Force field) ---- */
defCard("disruption",1,"Field Amplification",1,0,"",[{k:"dmgMul",mul:1.5,l:"Disruption Field DMG"}]);
defCard("disruption",1,"Field Duration",1,0,"",[{k:"fieldDurMul",add:0.3,pct:1,base:1,l:"Disruption Field duration"}]);
defCard("disruption",1,"Field Expansion",1,0,"",[{k:"splash",mul:1.3,l:"Disruption Field DMG area"}]);
defCard("disruption",1,"Disruption Force",1,0,"Each time the Disruption Field deals damage, it applies 1 stack of [Disruption].",[fxFlag("disrForce")]);
defCard("disruption",1,"Random Disturbance",2,0,"Enemies hit by the Disruption Field have a 5% chance to teleport back some distance.",[fxFlag("randomTeleport")]);
defCard("disruption",1,"Field Amplification+",26,0,"",[{k:"dmgMul",mul:2,l:"Disruption Field DMG"}]);
defCard("disruption",1,"Field Expansion+",34,0,"",[{k:"splash",mul:1.45,l:"Disruption Field DMG area"}]);
defCard("disruption",1,"Field Duration+",42,0,"",[{k:"fieldDurMul",add:0.45,pct:1,base:1,l:"Disruption Field duration"}]);
defCard("disruption",1,"Final Blast",1,1,"When the Disruption Field ends, it deals explosion damage.",[fxFlag("finalBlast")]);
defCard("disruption",1,"Stasis Field",1,1,"Each time enemies take Disruption Field damage, their [Slow] grows by 10% (max 90%).",[fxFlag("stasisField")]);
defCard("disruption",2,"Disruption Burst",1,0,"When [Disruption] reaches max stacks, it deals 1 powerful one-time hit.",[fxFlag("disrBurst")]);
defCard("disruption",2,"Rewind Teleport",6,0,"Enemies hit by the Disruption Field have a 2.5% chance to teleport back to their starting point.",[fxFlag("rewindTeleport")]);
defCard("disruption",2,"Overcharged Disruption",22,0,"[Disruption] DMG +100%, max stacks become 5.",[{k:"disrPower",set:2},{k:"disrMax",set:5}]);
defCard("disruption",2,"Small Laser",1,0,"A Sweeping Laser appears in the center of each Disruption Field.",[fxFlag("smallLaserField")]);
defCard("disruption",2,"Electric Field",1,0,"Enemies hit by the Disruption Field have a 30% chance to get [Paralyze].",[fxFlag("electricField")]);
defCard("disruption",2,"Interference Thunder Core",30,0,"Enemies dying in the Disruption Field have a 30% chance to create a small Thunderbolt.",[fxFlag("interferenceCore")]);
defCard("disruption",2,"Quick Cooldown",1,1,"",[{k:"fieldIntervalMul",mul:0.7,base:1,l:"Disruption Drone DMG interval"},{k:"haste",mul:1.3,l:"Cooldown speed"}]);
defCard("disruption",2,"Field Suppression",1,1,"Enemies in the Disruption Field take extra damage based on their slow strength (max +200%).",[fxFlag("fieldSuppression")]);
defCard("disruption",3,"Area Disruption",1,0,"When [Disruption] reaches max stacks, it deals 1 extra area hit.",[fxFlag("areaDisr")]);
defCard("disruption",3,"Teleport Damage",10,0,"A teleport out of the Disruption Field deals 3% of the target's max HP (max 60000 × ATK).",[fxFlag("teleportDamage")]);
defCard("disruption",3,"Fortress Support",1,0,"An extra set of Disruption Drones launches above the fortress.",[fxFlag("fortressSupport")]);
defCard("disruption",3,"Field Replication",1,0,"A Railgun shell entering a Disruption Field for the first time splits with a 100% chance (+1 Railgun shell).",[fxFlag("fieldReplication")]);
defCard("disruption",3,"Disruption Shotgun",38,0,"While a Disruption Field is active, the drones fire Penetrating Shotgun Shells into it.",[fxFlag("disrShotgun")]);
defCard("disruption",3,"Converging Field",18,1,"Every damage tick pulls enemies to the field center.",[{k:"dmgMul",mul:2,l:"Disruption Drone DMG"},fxFlag("convergingField")]);
/* ---- Aeroblast (Physical) ---- */
defCard("aeroblast",1,"Powerful Blast",1,0,"",[{k:"dmgMul",mul:1.5,l:"Aeroblast projectile DMG"}]);
defCard("aeroblast",1,"Multiple Blast",1,0,"",[{k:"extraProj",add:1,l:"Aeroblast projectiles"},{k:"dmgMul",mul:0.85,l:"DMG"}]);
defCard("aeroblast",1,"Impact Enhancement",1,0,"",[{k:"knock",mul:1.5,l:"Knockback"},{k:"dmgMul",mul:1.3,l:"DMG"}]);
defCard("aeroblast",1,"Shotgun Barrage",1,0,"After firing, Aeroblast releases 5 Penetrating Shotgun Shells.",[{k:"aeroShells",add:5}]);
defCard("aeroblast",1,"Floating Mine",2,0,"On explosion, the Aeroblast projectile leaves 2 Floating Mines in the blast area.",[{k:"mineCount",add:2}]);
defCard("aeroblast",1,"Powerful Blast+",26,0,"",[{k:"dmgMul",mul:2,l:"Aeroblast projectile DMG"}]);
defCard("aeroblast",1,"Multiple Blast+",34,0,"Aeroblast fires 1 extra time.",[{k:"aeroRepeat",add:1}]);
defCard("aeroblast",1,"Impact Enhancement+",42,0,"",[{k:"knock",mul:1.75,l:"Knockback"},{k:"dmgMul",mul:1.3,l:"DMG"}]);
defCard("aeroblast",1,"Massive Explosion",1,1,"",[{k:"splash",mul:1.7,l:"Aeroblast explosion radius"}]);
defCard("aeroblast",1,"Central Blast",1,1,"Aeroblast projectiles also detonate a high-energy blast at the center of the area.",[fxFlag("centralBlast")]);
defCard("aeroblast",2,"Extra Loading",1,0,"For each enemy killed, Aeroblast fires 1 extra Penetrating Shotgun Shell (max 10).",[fxFlag("extraLoading")]);
defCard("aeroblast",2,"Wide Minefield",6,0,"",[{k:"mineCount",add:2,l:"Floating Mines"},{k:"mineDmgMul",mul:1.25,base:1,l:"Mine explosion DMG"}]);
defCard("aeroblast",2,"Mine Shockwave",14,0,"",[{k:"mineCount",add:2,l:"Floating Mines"},{k:"mineKnockMul",mul:2,base:1,l:"Mine knockback"}]);
defCard("aeroblast",2,"Piercing Blast",1,0,"",[{k:"pelletPierce",add:1,l:"Aeroblast projectile penetration"}]);
defCard("aeroblast",2,"Firewheel Summon",1,0,"Every enemy hit by an Aeroblast explosion summons a small Firewheel drone.",[fxFlag("firewheelSummon")]);
defCard("aeroblast",2,"Bouncing Barrage",30,0,"",[{k:"bounceCount",add:1,l:"Aeroblast projectile bounces"}]);
defCard("aeroblast",2,"Chain Explosion",1,1,"Explosion DMG +20% for every enemy hit by the Aeroblast explosion (max 200%).",[fxFlag("chainExplosion")]);
defCard("aeroblast",2,"Range Extension",1,1,"",[{k:"rangeMul",mul:1.7,base:1,l:"Aeroblast range"}]);
defCard("aeroblast",2,"Secondary Explosion",18,1,"Enemies hit by an Aeroblast projectile cause an extra explosion after 1 s.",[fxFlag("secondaryExplosion")]);
defCard("aeroblast",3,"Shotgun Penetration",1,0,"",[{k:"shellDmgMul",mul:1.5,base:1,l:"Shotgun Shell DMG"},{k:"shellRangeMul",mul:1.7,base:1,l:"range"}]);
defCard("aeroblast",3,"Gravity Bomb",1,0,"The projectile pulls enemies to the center before exploding.",[{k:"dmgMul",mul:2,l:"Aeroblast projectile DMG"},fxFlag("gravityBomb")]);
defCard("aeroblast",3,"Shatter Impact",22,0,"On hit, the Aeroblast projectile creates 2 extra Ripping Lasers.",[fxFlag("shatterImpact")]);
defCard("aeroblast",3,"Charge Blast",38,0,"30% chance to fire Charge Shots, and keeps firing them while the Guard is in Charged State.",[fxFlag("chargeBlast")]);
/* ---- Thunderbolt (Electric) ---- */
defCard("thunder",1,"Continuous Strike",1,0,"",[{k:"strikes",add:1,base:1,l:"Thunderbolts"},{k:"dmgMul",mul:0.85,l:"Lightning strike DMG"}]);
defCard("thunder",1,"Swift Strike",1,0,"",[{k:"haste",mul:1.1,l:"Lightning strike cooldown speed"},{k:"dmgMul",mul:1.3,l:"DMG"}]);
defCard("thunder",1,"Lightning Boost",1,0,"",[{k:"dmgMul",mul:1.5,l:"Lightning strike DMG"}]);
defCard("thunder",1,"Lightning Paralysis",1,0,"Enemies hit by a lightning strike get [Paralyze].",[fxFlag("thunderParalyze")]);
defCard("thunder",1,"Chain Lightning",2,0,"A lightning strike launches 1 Chain Lightning on hit (max 5 targets).",[fxFlag("chainLightning")]);
defCard("thunder",1,"Lightning Boost+",26,0,"",[{k:"dmgMul",mul:2,l:"Lightning strike DMG"}]);
defCard("thunder",1,"Continuous Strike+",34,0,"",[{k:"strikes",add:1,base:1,l:"Thunderbolts"}]);
defCard("thunder",1,"Swift Strike+",42,0,"",[{k:"haste",mul:1.2,l:"Lightning strike cooldown speed"},{k:"dmgMul",mul:1.3,l:"DMG"}]);
defCard("thunder",1,"Lightning Expansion",1,1,"",[{k:"strikeWidthMul",add:1,pct:1,base:1,l:"Lightning strike width"}]);
defCard("thunder",1,"Slaughtering Lightning",1,1,"When a lightning strike kills an enemy, there is a 60% chance to create a stationary small Thunderbolt.",[fxFlag("slaughterBolt")]);
defCard("thunder",2,"Paralysis Extension",1,0,"",[{k:"paraDurMul",add:1,pct:1,base:1,l:"Thunderbolt [Paralyze] duration"}]);
defCard("thunder",2,"Chain Expansion",6,0,"",[{k:"chainTargets",add:4,base:5,l:"Chain Lightning targets"}]);
defCard("thunder",2,"Paralyzing Shock",22,0,"While Thunderbolt's [Paralyze] lasts, a small lightning strike hits the enemy every 1 s.",[fxFlag("paraShock")]);
defCard("thunder",2,"Lightning Aftershock",1,0,"A Thunderbolt hit has a 50% chance to create 1 Floating Mine.",[fxFlag("aftershockMine")]);
defCard("thunder",2,"Lightning Trail",1,0,"A lightning strike leaves a fire trail along its path.",[fxFlag("lightningTrail")]);
defCard("thunder",2,"Stormcall Laser",30,0,"After each lightning strike, the Lightning Orb fires a Secondary Beam.",[fxFlag("stormcall")]);
defCard("thunder",2,"Extra Strike",1,1,"A lightning strike has a 50% chance to strike 1 more time.",[fxFlag("extraStrike")]);
defCard("thunder",2,"Thunder Chain",1,1,"Enemies hit by a lightning strike launch a small Chain Lightning whenever they take damage (lasts 2 s, interval 0.5 s).",[fxFlag("thunderChain")]);
defCard("thunder",2,"Chain Strike",18,1,"Enemies hit by Chain Lightning have a 25% chance to call a small lightning strike.",[fxFlag("chainStrike")]);
defCard("thunder",3,"Life Erosion",1,0,"A lightning strike that applies [Paralyze] also deals 1% of the target's max HP (max 20000 × ATK).",[fxFlag("lifeErosion")]);
defCard("thunder",3,"Chain Interference",10,0,"Enemies hit by Chain Lightning get [Paralyze]; Chain Lightning DMG +100%.",[fxFlag("chainInterference")]);
defCard("thunder",3,"Lightning Teleportation",1,0,"Enemies hit by a lightning strike or Chain Lightning have a 50% chance to teleport back some distance.",[fxFlag("lightningTeleport")]);
defCard("thunder",3,"Lightning Strike Burst",38,0,"A lightning strike has a 10% chance to cause an explosion on hit.",[fxFlag("strikeBurst")]);
/* ---- Beam (Energy) ---- */
defCard("beam",1,"Beam Boost",1,0,"",[{k:"dmgMul",mul:1.5,l:"Beam DMG"}]);
defCard("beam",1,"High-Frequency Beam",1,0,"",[{k:"haste",mul:1.3,l:"Beam cooldown speed"}]);
defCard("beam",1,"Damage Increase",1,0,"Beam DMG on the same target keeps growing (max 200%).",[{k:"beamFocusCap",set:2}]);
defCard("beam",1,"Efficient Beam",1,0,"",[{k:"beamDurationMul",add:0.4,pct:1,base:1,l:"Beam duration"}]);
defCard("beam",1,"Beam Refraction",2,0,"On hit, the beam creates Refracted Beams.",[{k:"beamRefractions",add:2,l:"Refractions"}]);
defCard("beam",1,"Beam Boost+",26,0,"",[{k:"dmgMul",mul:2,l:"Beam DMG"}]);
defCard("beam",1,"High-Frequency Beam+",34,0,"",[{k:"haste",mul:1.45,l:"Beam cooldown speed"}]);
defCard("beam",1,"Efficient Beam+",42,0,"",[{k:"beamDurationMul",add:0.6,pct:1,base:1,l:"Beam duration"}]);
defCard("beam",1,"DMG Multiplier",1,1,"",[{k:"beamInterval",mul:0.6,base:0.2,l:"Beam DMG interval"}]);
defCard("beam",1,"Beam Penetration",1,1,"All beams inflict [Vulnerable] on their targets.",[fxFlag("beamVulnerable")]);
defCard("beam",2,"Stacking Damage",1,0,"The accumulated damage bonus is kept when the beam switches targets.",[fxFlag("beamStacking")]);
defCard("beam",2,"Refraction Pull",6,0,"Refracted beams pull the hit target to the center.",[{k:"beamRefractions",add:2,l:"Refractions"},fxFlag("refractPull")]);
defCard("beam",2,"Target Explosion",1,0,"Every beam hit causes an explosion.",[fxFlag("targetExplosion")]);
defCard("beam",2,"Disruptive Beam",22,0,"Targets hit by the beam create a small Disruption Field.",[fxFlag("disruptiveBeam")]);
defCard("beam",2,"Black Hole Spotlight",38,0,"A black hole appears at the ends of all beams.",[fxFlag("bhSpotlight")]);
defCard("beam",2,"Slaughtering Beam",1,1,"Beam duration +10% for every enemy killed by the beam (max 100%).",[fxFlag("slaughterBeam")]);
defCard("beam",2,"Extra Beam",1,1,"Fires an additional Secondary Beam.",[fxFlag("beamSplit")]);
defCard("beam",3,"Extreme Focus",1,0,"The damage-growth cap rises to 400%.",[{k:"beamFocusCap",set:4}]);
defCard("beam",3,"Refraction Explosion",10,0,"Every Refracted Beam hit causes an explosion.",[fxFlag("refractExplosion")]);
defCard("beam",3,"Beam Lightning",1,0,"Every beam hit has a 30% chance to launch 1 Chain Lightning.",[fxFlag("beamLightning")]);
defCard("beam",3,"Matrix Resonance",14,0,"On hit, the beam releases an expanding Electric Matrix.",[fxFlag("matrixResonance")]);
defCard("beam",3,"Power-Accumulating Bee Wave",30,0,"When charged beams deal damage, there is a 40% chance to release a Pulse Wave.",[fxFlag("beeWave")]);
/* ---- Railgun (Physical) ---- */
defCard("railgun",1,"Ammo Boost",1,0,"",[{k:"dmgMul",mul:1.5,l:"Railgun shell DMG"}]);
defCard("railgun",1,"Shell Salvo",1,0,"",[{k:"extraProj",add:1,l:"Railgun shells"},{k:"dmgMul",mul:0.85,l:"DMG"}]);
defCard("railgun",1,"Railgun Upgrade",1,0,"",[{k:"dmgMul",mul:1.3,l:"Railgun shell DMG"},{k:"pierce",add:1,l:"Penetration"}]);
defCard("railgun",1,"Basic Split",1,0,"On hitting the first enemy, the Railgun shell splits into 2 small shells, with a 20% chance of 2 more.",[fxFlag("splitBase")]);
defCard("railgun",1,"Explosive Shells",2,0,"The Railgun shell explodes on hit.",[fxFlag("railExplosive")]);
defCard("railgun",1,"Ammo Boost+",26,0,"",[{k:"dmgMul",mul:2,l:"Railgun shell DMG"}]);
defCard("railgun",1,"Shell Salvo+",34,0,"",[{k:"extraProj",add:1,l:"Railgun shells"}]);
defCard("railgun",1,"Railgun Upgrade+",42,0,"",[{k:"pierce",add:1,l:"Penetration"},{k:"dmgMul",mul:1.6,l:"Railgun shell DMG"}]);
defCard("railgun",1,"Power Penetration",1,1,"",[{k:"pierce",add:3,l:"Penetration"},{k:"railKnock",mul:2,base:6,l:"Knockback"}]);
defCard("railgun",1,"Weak Spot Strike",1,1,"Railgun shell DMG grows with the target's HP (max 150%).",[fxFlag("weakSpot")]);
defCard("railgun",2,"Piercing Enhancement",1,0,"On hitting the first enemy, a small Railgun shell splits into 2 mini shells, with a 20% chance of 2 more.",[fxFlag("splitSmall")]);
defCard("railgun",2,"Impact Spread",6,0,"Railgun explosion radius +20% per penetration.",[fxFlag("impactSpread")]);
defCard("railgun",2,"Impact Boost",10,0,"Railgun explosion DMG +30% per penetration.",[fxFlag("impactBoost")]);
defCard("railgun",2,"Piercing Mark",1,0,"Enemies hit by any Railgun shell get [Physical Vulnerable].",[fxFlag("piercingMark")]);
defCard("railgun",2,"Surge Pierce",22,0,"When a Railgun shell kills an enemy, there is a 50% chance to release a high-voltage shock.",[fxFlag("surgePierceCard")]);
defCard("railgun",2,"Armor Piercing Pulse",38,0,"Firing a Railgun shell creates a Pulse Wave.",[fxFlag("armorPulse")]);
defCard("railgun",2,"Shell Crit Boost",1,1,"",[{k:"dmgMul",mul:1.4,l:"All Railgun shell DMG"},{k:"critBonus",add:0.3,pct:1,l:"Crit chance"}]);
defCard("railgun",2,"Execution Penetration",1,1,"Railgun shell penetration +1 per kill (max +5).",[fxFlag("execPen")]);
defCard("railgun",3,"Split Mastery",1,0,"",[{k:"splitBonus",add:0.4,pct:1,l:"Split chance of all Railgun shells"}]);
defCard("railgun",3,"Secondary Minefield",1,0,"A Railgun shell leaves 1 Floating Mine on hit.",[fxFlag("secMine")]);
defCard("railgun",3,"Piercing Ricochet",18,0,"",[{k:"pierce",add:1,l:"Penetration"},{k:"ricochet",add:1,l:"Ricochets"}]);
defCard("railgun",3,"Armor-Piercing Light Split",30,0,"Enemies hit by any Railgun shell have a 10% chance to fire a Ripping Laser.",[fxFlag("lightSplit")]);
/* ---- Teslacoil (Electric) ---- */
defCard("tesla",1,"Electro Boost",1,0,"",[{k:"dmgMul",mul:1.5,l:"Teslacoil DMG"}]);
defCard("tesla",1,"Electro Chain",1,0,"",[{k:"multiCount",add:1,l:"Bounces"},{k:"dmgMul",mul:0.85,l:"DMG"}]);
defCard("tesla",1,"Electro Acceleration",1,0,"",[{k:"haste",mul:1.3,l:"Teslacoil cooldown speed"}]);
defCard("tesla",1,"Charge Expansion",1,0,"DMG radius grows with charge time.",[{k:"chargeTime",add:0.5,unit:" s",l:"Charge time"},fxFlag("chargeRadius")]);
defCard("tesla",1,"Trap Matrix",2,0,"Teslacoil releases an Electric Matrix in the explosion area that deals extra damage and applies [Slow] for 2 s.",[fxFlag("teslaMatrix")]);
defCard("tesla",1,"Electro Boost+",26,0,"",[{k:"dmgMul",mul:2,l:"Teslacoil DMG"}]);
defCard("tesla",1,"Electro Chain+",34,0,"",[{k:"multiCount",add:1,l:"Bounces"}]);
defCard("tesla",1,"Electro Acceleration+",42,0,"",[{k:"haste",mul:1.45,l:"Teslacoil cooldown speed"}]);
defCard("tesla",1,"Electric Chain Surge",1,1,"On hit, Teslacoil releases up to 5 high-voltage shocks at the nearest enemies.",[fxFlag("chainSurge")]);
defCard("tesla",1,"Electro Interference",1,1,"The Teslacoil explosion and Electric Matrix apply [Paralyze].",[{k:"teslaRadiusMul",mul:1.3,base:1,l:"Teslacoil explosion radius"},fxFlag("teslaInterference")]);
defCard("tesla",2,"Charge Destruction",1,0,"DMG grows with charge time.",[{k:"chargeTime",add:0.5,unit:" s",l:"Charge time"},fxFlag("chargeDestruction")]);
defCard("tesla",2,"Enhanced Matrix",6,0,"",[{k:"matrixDmgMul",mul:2,base:1,l:"Electric Matrix DMG"},{k:"matrixDurBonus",add:1,unit:" s",l:"duration"}]);
defCard("tesla",2,"Cooperative Beam",1,0,"While charging, Teslacoil fires 2 Refracted Beams.",[fxFlag("coopBeam")]);
defCard("tesla",2,"Wasp Mirage",22,0,"A Teslacoil hit summons an Echo Wasp.",[fxFlag("waspMirage")]);
defCard("tesla",2,"Electromagnetic Fission",30,0,"The Teslacoil explosion splits into 2 small Teslacoils.",[fxFlag("fission")]);
defCard("tesla",2,"Expanded Shockwave",1,1,"Teslacoil explosion radius is increased; damage in the outer part is halved.",[fxFlag("expandedShock")]);
defCard("tesla",2,"Charged Shock",1,1,"While charging, Teslacoil releases up to 2 high-voltage shocks at the nearest enemies every 0.25 s.",[fxFlag("chargedShock")]);
defCard("tesla",3,"Charge Delayed",1,0,"",[{k:"chargeTime",add:1,unit:" s",l:"Charge time"}]);
defCard("tesla",3,"Matrix Thunderbolt",10,0,"Every 0.5 s the Electric Matrix creates a stationary small Thunderbolt that lasts 5 s.",[fxFlag("matrixBolt")]);
defCard("tesla",3,"Highvolt Trigger",1,0,"The Teslacoil explosion launches 1 Chain Lightning through the enemies hit (max 5).",[fxFlag("highvolt")]);
defCard("tesla",3,"Spinning Laser",14,0,"On hit, Teslacoil fires 1 Spinning Laser.",[fxFlag("spinLaser")]);
defCard("tesla",3,"Magnetic Storm Flare",38,0,"After hitting an enemy, Teslacoil creates 3 small Firewheel drones.",[fxFlag("stormFlare")]);
/* ---- Gravity Vortex Gun (Force field) ---- */
defCard("gravity",1,"High Power Field",1,0,"",[{k:"dmgMul",mul:1.5,l:"Gravity field DMG"}]);
defCard("gravity",1,"Wide Field",1,0,"",[{k:"gravityRadius",mul:1.25,l:"Gravity field radius"}]);
defCard("gravity",1,"Extended Field",1,0,"",[{k:"gravityRange",mul:1.3,l:"Gravity field flight range"}]);
defCard("gravity",1,"Static Wormhole",1,0,"On hitting the first enemy, the field opens a portal that for 3 s moves enemies to where the field ends.",[fxFlag("wormhole")]);
defCard("gravity",1,"Small Black Hole",2,0,"When the field ends, a small black hole appears and pulls enemies for 5 s.",[fxFlag("smallBH")]);
defCard("gravity",1,"High Power Field+",26,0,"",[{k:"dmgMul",mul:2,l:"Gravity field DMG"}]);
defCard("gravity",1,"Wide Field+",34,0,"",[{k:"gravityRadius",mul:1.4,l:"Gravity field radius"}]);
defCard("gravity",1,"Extended Field+",42,0,"",[{k:"gravityRange",mul:1.5,l:"Gravity field flight range"}]);
defCard("gravity",1,"Extended Pull",1,1,"The farther the gravity field flies, the bigger its radius.",[fxFlag("extendedPull")]);
defCard("gravity",1,"Field Amplification",1,1,"",[{k:"dmgMul",mul:1.8,l:"Gravity field DMG"},{k:"gravityPull",mul:2,l:"Pull"}]);
defCard("gravity",2,"Wormhole Enhancement",1,0,"",[{k:"portalDurMul",add:1,pct:1,base:1,l:"Portal duration (entry and exit)"}]);
defCard("gravity",2,"Wormhole Expansion",1,0,"",[{k:"portalRMul",add:1,pct:1,base:1,l:"Portal entry radius"}]);
defCard("gravity",2,"Black Hole Expansion",6,0,"",[{k:"bhRMul",mul:1.5,base:1,l:"Small black hole radius"},{k:"bhPullMul",mul:1.5,base:1,l:"pull"}]);
defCard("gravity",2,"Field Reflection",1,0,"All gravity fields can bounce off walls.",[fxFlag("fieldReflect")]);
defCard("gravity",2,"Field Disruption",1,0,"The gravity field applies [Disruption] on hit.",[fxFlag("fieldDisrupt")]);
defCard("gravity",2,"Gravity Lightning",38,0,"Every 0.5 s the gravity field releases 4 high-voltage shocks.",[fxFlag("gravLightning")]);
defCard("gravity",2,"Extra Field",1,1,"",[{k:"extraFields",add:1,l:"Gravity fields"}]);
defCard("gravity",2,"Extended Range",1,1,"",[{k:"gravityRange",mul:2,l:"Gravity field flight range"}]);
defCard("gravity",3,"Destructive Black Hole",14,0,"",[{k:"bhDmgMul",mul:3.5,base:1,l:"Small black hole DMG"}]);
defCard("gravity",3,"Double Fission",18,0,"At the end of its flight, the gravity field splits into 2 small fields.",[fxFlag("doubleFission")]);
defCard("gravity",3,"Binary Stars",22,0,"The gravity field splits into a pair of orbiting binary stars.",[fxFlag("binaryStarsCard")]);
defCard("gravity",3,"Gravity Increase",30,0,"The farther the gravity field flies, the stronger its pull and damage.",[fxFlag("gravityIncrease")]);
/* ---- Hive (Force field) ---- */
defCard("hive",1,"Swarm Assault",1,0,"",[{k:"dmgMul",mul:1.5,l:"Wasp DMG"}]);
defCard("hive",1,"Rapid Barrage",1,0,"",[{k:"hiveAttacks",add:2,l:"Wasp attack count"}]);
defCard("hive",1,"Dense Swarm",1,0,"",[{k:"hiveCount",add:2,cap:12,l:"Wasps"},{k:"dmgMul",mul:0.85,l:"DMG"}]);
defCard("hive",1,"Contact Pulse",1,0,"On its first hit, a wasp releases 1 Pulse Wave.",[fxFlag("contactPulse")]);
defCard("hive",1,"Swarm Echo",2,0,"On a kill, a wasp spawns 1 Echo Wasp I (max 1).",[{k:"hiveEcho",set:1}]);
defCard("hive",1,"Swarm Assault+",26,0,"",[{k:"dmgMul",mul:2,l:"Wasp DMG"}]);
defCard("hive",1,"Rapid Barrage+",34,0,"",[{k:"hiveAttacks",add:2,l:"Wasp attack count"},{k:"dmgMul",mul:1.3,l:"DMG"}]);
defCard("hive",1,"Dense Swarm+",42,0,"",[{k:"hiveCount",add:2,cap:14,l:"Wasps"}]);
defCard("hive",1,"Wasp Evolution II",1,1,"A Wasp I evolves into Wasp II after 3 attacks.",[{k:"waspEvolve",set:3}]);
defCard("hive",1,"Hive Mutation II",1,1,"After every 2 volleys, the Hive releases a Wasp II.",[fxFlag("mutation2")]);
defCard("hive",2,"Amplified Pulse",1,0,"Pulse Waves apply [Slow] on hit.",[{k:"pulseRMul",mul:1.3,base:1,l:"Pulse Wave DMG radius"},fxFlag("pulseSlow")]);
defCard("hive",2,"Final Resonance",1,0,"At the end of its life, a wasp releases 1 Pulse Wave.",[fxFlag("finalResonance")]);
defCard("hive",2,"Echo Upgrade II",6,0,"Echo wasps evolve into Echo Wasp II.",[{k:"hiveEcho",set:2}]);
defCard("hive",2,"Electro-Wasps",1,0,"Each wasp attack has a 50% chance to release a high-voltage shock at the nearest enemies.",[fxFlag("electroWasps")]);
defCard("hive",2,"Aero Split",22,0,"A wasp hit has a 60% chance to split into 3 small Railgun shells.",[fxFlag("aeroSplit")]);
defCard("hive",2,"Bee-Bomb Incineration Domain",30,0,"A destroyed wasp self-detonates and leaves a burning area.",[fxFlag("beeBomb")]);
defCard("hive",2,"Wasp Evolution III",1,1,"A Wasp II evolves into Wasp III after 3 attacks.",[fxFlag("waspEvolve3")]);
defCard("hive",2,"Hive Mutation III",1,1,"After every 2 volleys, the Hive has a 50% chance to release a Wasp III.",[fxFlag("mutation3")]);
defCard("hive",2,"Wasp Retrieval",14,1,"Destroyed wasps have a 50% chance to return to the Hive (up to 5 stored).",[fxFlag("retrieval")]);
defCard("hive",3,"Echo Upgrade III",10,0,"Echo wasps evolve into Echo Wasp III.",[{k:"hiveEcho",set:3}]);
defCard("hive",3,"Volley Wasp",1,0,"",[{k:"waspBullets",add:1,l:"Wasp bullets"}]);
defCard("hive",3,"Swarm Fury",1,0,"After each attack, wasp DMG +30%.",[fxFlag("swarmFury")]);
defCard("hive",3,"Wasp Immobilize",38,0,"A wasp attack has a 20% chance to apply [Immobilize].",[fxFlag("waspImmobilize")]);
/* ---- Firewheel Drone (Fire) ---- */
defCard("firewheel",1,"Firewheel Boost",1,0,"",[{k:"dmgMul",mul:1.5,l:"Firewheel Drone DMG"}]);
defCard("firewheel",1,"Size Boost",1,0,"",[{k:"wheelSizeMul",mul:1.25,base:1,l:"Firewheel Drone size"}]);
defCard("firewheel",1,"Duration Extension",1,0,"",[{k:"wheelDurMul",mul:1.3,base:1,l:"Firewheel Drone duration"}]);
defCard("firewheel",1,"Mini Drones",1,0,"Every 3 s the Firewheel Drone summons 2 mini Firewheel drones.",[fxFlag("miniDrones")]);
defCard("firewheel",1,"Flame Trail",2,0,"In flight, the Firewheel Drone leaves a fire trail for 2 s.",[fxFlag("fireTrail")]);
defCard("firewheel",1,"Firewheel Boost+",26,0,"",[{k:"dmgMul",mul:2,l:"Firewheel Drone DMG"}]);
defCard("firewheel",1,"Size Boost+",34,0,"",[{k:"wheelSizeMul",mul:1.4,base:1,l:"Firewheel Drone size"}]);
defCard("firewheel",1,"Duration Extension+",42,0,"",[{k:"wheelDurMul",mul:1.45,base:1,l:"Firewheel Drone duration"}]);
defCard("firewheel",1,"Smart Acceleration",1,1,"Firewheel Drone DMG +60% and speed +80% while it is not dealing damage.",[fxFlag("smartAccel")]);
defCard("firewheel",1,"Hold the Ground",1,1,"When its time runs out, the Firewheel Drone stays for 10 s more.",[fxFlag("holdGround")]);
defCard("firewheel",2,"Killing Array",1,0,"For every 2 enemies killed directly by the Firewheel Drone, 2 mini Firewheel drones are summoned.",[fxFlag("killingArray")]);
defCard("firewheel",2,"Blazing Trail",6,0,"",[{k:"trailDmgMul",mul:1.6,base:1,l:"Fire trail DMG"}]);
defCard("firewheel",2,"Firewheel Ignition",1,0,"The Firewheel Drone has a 20% chance to apply [Burn].",[{k:"wheelIgnite",set:0.2}]);
defCard("firewheel",2,"Vortex Firewheel",18,0,"The Firewheel Drone pulls nearby enemies in.",[fxFlag("vortexWheel")]);
defCard("firewheel",2,"Killing Charge",1,1,"For every 2 enemies killed directly by the Firewheel Drone, its cooldown -0.5 s (max 5 s).",[fxFlag("killingCharge")]);
defCard("firewheel",2,"Combo Boost",1,1,"Every 20 Firewheel Drone hits, its DMG +20% (max +200%).",[fxFlag("comboBoost")]);
defCard("firewheel",3,"Mini Size Boost",1,0,"",[{k:"miniDmgMul",mul:1.5,base:1,l:"Mini Firewheel DMG"},{k:"miniDurMul",mul:1.5,base:1,l:"duration"}]);
defCard("firewheel",3,"Extended Trail",14,0,"",[{k:"trailDurBonus",add:2,unit:" s",l:"Fire trail duration"}]);
defCard("firewheel",3,"Extra Barrage",1,0,"Every 15 Firewheel Drone hits, it fires a ring of penetrating bullets.",[fxFlag("extraBarrage")]);
defCard("firewheel",3,"Blazing Pulse",22,0,"The Firewheel Drone releases a Pulse Wave every 1.5 s.",[fxFlag("blazingPulse")]);
defCard("firewheel",3,"Flame Power Surge",38,0,"Firewheel Drone DMG grows over time, up to 500%.",[fxFlag("flamePowerSurge")]);
/* ---- Guardian = the bullet turret (Physical). Reference locks Lv.61/71/101/121 exceed the R&D cap
   of 45, so they are scaled into it: gate = round(X × 45/121) → 23/26/38/45. ---- */
defCard("soldier",1,"Volley Shot",1,0,"",[{k:"extraProj",add:1,l:"Bullets"},{k:"dmgMul",mul:0.85,l:"DMG"}]);
defCard("soldier",1,"Bullets Boost",1,0,"",[{k:"dmgMul",mul:1.5,l:"Bullet DMG"}]);
defCard("soldier",1,"Piercing Bullet",1,0,"",[{k:"pierce",add:1,l:"Penetration"}]);
defCard("soldier",1,"Bullet Explosion",1,0,"A bullet has a 10% chance to explode on hit.",[{k:"bulletExplode",add:0.1}]);
defCard("soldier",1,"Charge Activation",1,0,"The Guard gains Charge Points by firing bullets and enters Charged State when the bar is full.",[fxFlag("chargeActive")]);
defCard("soldier",1,"Volley Shot+",23,0,"",[{k:"extraProj",add:1,l:"Bullets"}]);
defCard("soldier",1,"Rapid Fire",26,0,"",[{k:"haste",mul:1.2,l:"Fire rate"}]);
defCard("soldier",1,"Shotgun Evolution",1,1,"Each shot scatters 2 additional sub-bullets in a real spread.",[{k:"shotgunSpread",set:2}]);
defCard("soldier",1,"Splitting Bullet",1,1,"Bullets split into 1 sub-bullet; 2 sub-bullets in Charged State.",[fxFlag("splitBullet")]);
defCard("soldier",1,"Impact Bullet",1,1,"Bullets gain a weak knockback; knockback +200% in Charged State.",[{k:"dmgMul",mul:2,l:"Bullet DMG"},fxFlag("impactBullet")]);
defCard("soldier",2,"Explosion Expansion",1,0,"",[{k:"bulletExplR",mul:1.5,base:1,l:"Explosion range"}]);
defCard("soldier",2,"Quick Charge",1,0,"",[{k:"chargeGain",mul:2,base:1,l:"Charge Points from bullets"}]);
defCard("soldier",2,"Sustained Charge",1,0,"",[{k:"chargeShots",mul:2,base:1,l:"Shots fired in Charged State"}]);
defCard("soldier",2,"Flame Bullet",1,0,"Bullets become flame bullets and add extra fire DMG on hit.",[fxFlag("flameBullet")]);
defCard("soldier",2,"Electric Bullet",1,0,"When a bullet kills an enemy, there is a 50% chance to trigger a small lightning strike.",[fxFlag("electricBullet")]);
defCard("soldier",2,"Counterburst Scatter",38,0,"After every 40 shots, fires a wave of Penetrating Shotgun Shells at enemies near the Fortress.",[fxFlag("counterburst")]);
defCard("soldier",2,"Penetration Boost",1,1,"",[{k:"pierce",add:2,l:"Penetration of all bullets"}]);
defCard("soldier",2,"Reflection Boost",1,1,"",[{k:"ricochet",add:2,l:"Reflections of all bullets"}]);
defCard("soldier",3,"Explosion Boost",1,0,"",[{k:"bulletExplDmg",mul:1.6,base:1,l:"Explosion DMG"},{k:"bulletExplode",add:0.1,pct:1,l:"explosion chance"}]);
defCard("soldier",3,"Laser Shot",1,0,"Bullet hits have a 20% chance to fire a Ripping Laser from the Guard, doubled in Charged State.",[fxFlag("laserShot")]);
defCard("soldier",3,"Disruption Fire",1,0,"Every bullet hit has a 10% chance to inflict 1 stack of [Disruption].",[fxFlag("disruptionFire")]);
defCard("soldier",3,"Mirror Guardian",45,0,"Creates a clone that deals 50% of the Guard's DMG.",[fxFlag("mirrorGuardian")]);
function cardRd(def){return def.rd||1;}
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
 if(def.req&&!def.req.every(function(r){return u.mods.includes(r);}))return false;
 if(def.lvl>u.runLv)return false;
 if(def.rare)return u.pips>=PIPS_PER_LV-1;
 return true;
}
function unitCards(u){return CARDS.filter(function(d){return cardEligible(u,d);});}
function purpleFor(u){return unitCards(u).filter(function(d){return d.rare;})[0]||null;}
function cardById(unit,id){return CARDS.filter(function(d){return d.unit===unit&&d.id===id;})[0]||null;}
/* Pip bookkeeping: normal cards fill pips 1–3; a purple card fills the 4th and levels the unit up. */
function addPip(u){if(u.pips<PIPS_PER_LV-1)u.pips++;}
function levelUp(u){
 u.pips=0;
 if(u.runLv<MAX_RUN_LV){
  u.runLv++;u.dmgMul*=1+BALANCE.levelUpDmg;
  if(u.runLv>=MAX_RUN_LV)maybeSuperMode(u);
 }else u.mastery=(u.mastery||0)+1;
 burst(u.x,u.y,22,u.cfg.color);if(B)B.shake=Math.max(B.shake||0,5);
}
/* Super Mode: "activates when the turret reaches its maximum level" (reference Lv.10 reward) */
function superModeReady(u){return !!SUPERS[u.cfg.id]&&(META.levels[u.cfg.id]||1)>=rdTierUnlock(u.cfg.id);}
function maybeSuperMode(u){
 if(u.superOn||!superModeReady(u))return false;
 u.superOn=true;SUPERS[u.cfg.id].apply(u);
 if(B)recordPick({unit:u.cfg.id,icon:u.cfg.icon,id:"super",name:"SUPER MODE: "+SUPERS[u.cfg.id].name,lvl:3,rare:true,desc:SUPERS[u.cfg.id].desc});
 return true;
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
