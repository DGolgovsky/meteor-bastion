"use strict";
/* ==================== CONFIG ==================== */
var RARITY={common:{n:"Common"},rare:{n:"Rare"},epic:{n:"Epic"},legend:{n:"Legendary"}};
/* Light emitted by each weapon. Fire is blue on Sky Guard and Firewheel. */
var WEAPON_COLOR={
 skyguard:"#248aff",laser:"#a4f53d",disruption:"#b6f7cc",aeroblast:"#45f1ed",
 thunder:"#ac86ef",beam:"#57e829",firewheel:"#28d9fa",hive:"#c2f5cb",
 railgun:"#24e3e3",tesla:"#ae83ff",gravity:"#cef5bc"
};
var DAMAGE_TYPE_NAME={fire:"Fire",energy:"Energy",force:"Force-field",phys:"Physical",electric:"Electric"};
var TURRETS=[
 {id:"skyguard",name:"Sky Guard",icon:"🚀",dtype:"fire",damage:17,attackSpeed:1.5,range:640,projSpeed:400,crit:0.08,critMul:1.8,target:"closestBase",effect:"rocket",rarity:"common",color:WEAPON_COLOR.skyguard,desc:"Homing missiles deal fire damage on impact and in the blast around the target."},
 {id:"laser",name:"Laser",icon:"🔆",dtype:"energy",damage:26,attackSpeed:1,range:1200,projSpeed:0,crit:0.05,critMul:1.8,target:"strongest",effect:"beam",rarity:"common",color:WEAPON_COLOR.laser,desc:"A piercing laser damages enemies along its locked firing line. Upgrades add beam reflection and refraction."},
 {id:"disruption",name:"Disruption Drone",icon:"🛸",dtype:"force",damage:7,attackSpeed:1.1,range:180,projSpeed:340,crit:0.05,critMul:1.7,target:"closestBase",effect:"slow",rarity:"rare",color:WEAPON_COLOR.disruption,desc:"Projects a horizontal slowing field that deals damage over time and reveals cloaked enemies."},
 {id:"aeroblast",name:"Aeroblast",icon:"🌀",dtype:"phys",damage:10,attackSpeed:0.8,range:540,projSpeed:520,crit:0.06,critMul:1.8,target:"nearest",effect:"knockback",rarity:"common",color:WEAPON_COLOR.aeroblast,desc:"A medium-range air shotgun: 5 pellets, a tight spread at range and strong knockback up close."},
 {id:"thunder",name:"Thunderbolt",icon:"⚡",dtype:"electric",damage:16,attackSpeed:0.8,range:560,projSpeed:0,crit:0.12,critMul:2.0,target:"closestBase",effect:"chain",rarity:"rare",color:WEAPON_COLOR.thunder,desc:"Calls vertical lightning strikes that hit every enemy in the bolt's column."},
 {id:"beam",name:"Beam",icon:"🔷",dtype:"energy",damage:55,attackSpeed:0.55,range:420,projSpeed:520,crit:0.1,critMul:2.2,target:"closestBase",effect:"none",rarity:"epic",color:WEAPON_COLOR.beam,desc:"A curved energy stream repeatedly hits the target closest to the base."},
 {id:"firewheel",name:"Firewheel Drone",icon:"🔥",dtype:"fire",damage:10,attackSpeed:1.4,range:580,projSpeed:360,crit:0.06,critMul:1.8,target:"closestBase",effect:"burn",rarity:"rare",color:WEAPON_COLOR.firewheel,desc:"Releases a long-lived bouncing fire disc that repeatedly hits enemies."},
 {id:"hive",name:"Hive",icon:"🐝",dtype:"force",damage:14,attackSpeed:0.5,range:390,projSpeed:300,crit:0.05,critMul:1.7,target:"nearest",effect:"hive",rarity:"epic",color:WEAPON_COLOR.hive,desc:"Releases persistent wasps within range. Released wasps hunt across the whole field and strike repeatedly."},
 {id:"railgun",name:"Railgun",icon:"🎯",dtype:"phys",damage:70,attackSpeed:0.45,range:230,projSpeed:900,crit:0.15,critMul:2.4,target:"closestBase",effect:"pierce",rarity:"legend",color:WEAPON_COLOR.railgun,desc:"The projectile pierces straight through enemies along its line."},
 {id:"tesla",name:"Tesla Coil",icon:"🌩️",dtype:"electric",damage:15,attackSpeed:0.88,range:470,projSpeed:430,crit:0.1,critMul:2.0,target:"random",effect:"charge",rarity:"epic",color:WEAPON_COLOR.tesla,desc:"Launches a ball of lightning that explodes on contact and arcs to nearby enemies."},
 {id:"gravity",name:"Gravity Vortex Gun",icon:"🕳️",dtype:"force",damage:9,attackSpeed:0.48,range:390,projSpeed:0,crit:0.04,critMul:1.65,target:"closestBase",effect:"gravity",rarity:"epic",color:WEAPON_COLOR.gravity,desc:"Creates a gravity field that pulls enemies in and deals damage over time."}
];
var SOLDIER_CFG={id:"soldier",name:"Soldier \"Bastion\"",icon:"🪖",dtype:"phys",damage:12,attackSpeed:4.0,range:9999,projSpeed:640,crit:0.15,critMul:2.0,target:"closestBase",effect:"none",rarity:"legend",color:"#ffd34d",desc:"Your movable fighter on the fortress deck. Range: the whole field."};
TURRETS.concat([SOLDIER_CFG]).forEach(function(cfg){cfg.dmgType=DAMAGE_TYPE_NAME[cfg.dtype];});
/* res: incoming damage multipliers by type (like the ±50% resistances in Galaxy Defense):
   <1 is resistance, >1 is vulnerability */
var ENEMIES=[
 {id:"meteor",name:"Meteor",hp:65,speed:82,dmg:36,armor:0,xp:1,r:13,color:"#8a6a55",kind:"meteor",res:{fire:0.65,phys:1.22}},
 {id:"fast",name:"Fast meteor",hp:46,speed:118,dmg:34,armor:0,xp:1,r:9,color:"#a87a52",kind:"meteor",res:{electric:1.30}},
 {id:"armored",name:"Armored",hp:190,speed:70,dmg:78,armor:0.35,xp:3,r:16,color:"#6b7686",kind:"meteor",res:{phys:0.55,fire:0.82,electric:1.4}},
 {id:"flyer",name:"Dartwing",hp:74,speed:100,dmg:49,armor:0,xp:2,r:12,color:"#7c5cbf",kind:"flyer",res:{electric:1.35,energy:0.8}},
 {id:"splitter",name:"Brood Carrier",hp:245,speed:62,dmg:82,armor:0.12,xp:5,r:19,color:"#4f7a52",kind:"splitter",res:{force:0.7,phys:1.25}},
 {id:"mini",name:"Broodling",hp:52,speed:125,dmg:27,armor:0,xp:1,r:9,color:"#5d8a60",kind:"broodling",res:{force:0.7,phys:1.2}},
 {id:"healer",name:"Nurse Scarab",hp:230,speed:78,dmg:53,armor:0.12,xp:6,r:15,color:"#3fae6a",kind:"healer",res:{energy:1.35,electric:0.75}},
 {id:"elite",name:"Royal Hornet",hp:430,speed:82,dmg:135,armor:0.26,xp:8,r:20,color:"#b03a5b",kind:"elite",res:{energy:0.75,force:1.25}},
 {id:"phase",name:"Veilwing",hp:105,speed:112,dmg:58,armor:0.08,xp:3,r:11,color:"#83a4d9",kind:"phase",res:{energy:1.3,electric:0.85}},
 {id:"charger",name:"Assault meteor",hp:135,speed:96,dmg:80,armor:0.12,xp:3,r:13,color:"#e38554",kind:"charger",res:{fire:0.8,force:1.3}},
 {id:"spitter",name:"Acid Spitter",hp:125,speed:78,dmg:62,armor:0.06,xp:3,r:14,color:"#a8bd4f",kind:"spitter",res:{fire:1.35,phys:0.85}},
 {id:"needle",name:"Needle Wasp",hp:83,speed:110,dmg:52,armor:0.02,xp:2,r:11,color:"#d5a557",kind:"needle",res:{electric:1.35,force:0.8}},
 {id:"bulwark",name:"Shell Beetle",hp:300,speed:60,dmg:105,armor:0.3,xp:5,r:20,color:"#597e89",kind:"bulwark",res:{phys:0.55,electric:1.45}},
 {id:"moth",name:"Prism Moth",hp:180,speed:88,dmg:72,armor:0.08,xp:4,r:17,color:"#c285c8",kind:"moth",res:{energy:0.65,fire:1.3}},
 {id:"boss",name:"BOSS \"Hive Tyrant\"",hp:2200,speed:30,dmg:410,armor:0.25,xp:60,r:34,color:"#5b1f2e",kind:"boss",res:{fire:0.75,phys:0.85}}
];
/* Only these geological bodies hit the deck; all other enemies establish firing stations. */
var METEOR_IDS={meteor:1,fast:1,armored:1,charger:1};
/* dist is distance ABOVE the base, not a targeting range. Each individual chooses
   its own station; delayed visible windups give the defender time to interrupt it. */
var ENEMY_ATTACKS={
 flyer:{dist:[145,215],cd:4.4,windup:.75,mul:.18,speed:175,burst:1,kind:"needle",color:"#d3a3f5",hp:5,r:3},
 splitter:{dist:[190,270],cd:5.4,windup:1.0,mul:.12,speed:130,burst:2,spread:38,kind:"orb",color:"#a7d685",hp:9,r:5},
 mini:{dist:[100,165],cd:4.8,windup:.6,mul:.16,speed:195,burst:1,kind:"needle",color:"#bbe29c",hp:3,r:2.5},
 healer:{dist:[230,305],cd:6.5,windup:1.1,mul:.15,speed:135,burst:1,kind:"orb",color:"#6ce3b0",hp:8,r:5},
 elite:{dist:[140,230],cd:5.2,windup:1.0,mul:.095,speed:180,burst:3,spread:26,kind:"needle",color:"#f08bb7",hp:6,r:3.5},
 phase:{dist:[235,315],cd:4.6,windup:1.0,mul:.19,speed:230,burst:1,kind:"prism",color:"#b7d9ff",hp:6,r:3.5},
 spitter:{dist:[180,250],cd:5.0,windup:1.15,mul:.24,speed:120,burst:1,kind:"spit",color:"#c8e66d",hp:9,r:5},
 needle:{dist:[300,370],cd:4.2,windup:1.25,mul:.18,speed:260,burst:1,kind:"needle",color:"#ffd789",hp:4,r:3},
 bulwark:{dist:[90,145],cd:5.8,windup:1.15,mul:.15,speed:135,burst:2,spread:30,kind:"siege",color:"#9ee4e8",hp:14,r:6},
 moth:{dist:[255,325],cd:6.0,windup:1.25,mul:.10,speed:160,burst:3,spread:58,kind:"prism",color:"#e7b1f1",hp:7,r:4},
 boss:{dist:[185,255],cd:5.6,windup:1.6,mul:.055,speed:150,burst:3,spread:65,kind:"siege",color:"#ffad8e",hp:18,r:7}
};
var ENEMY_SHOT_CAP=64;
/* Late sectors open with reconnaissance, giving the starting Guardian time to
   earn a build. Full stage density returns by wave 4; Elite's HP/speed/contact
   modifiers still apply. Stages 1–3 retain their established opening exactly. */
var CAMPAIGN_OPENING={startStage:4,bonusRamp:[0,.35,.7,1],spawnRamp:[1.7,.9,.3,0],eliteCadence:1.5};
/* Campaign progression: one continuous stream per stage; early stages run 20 virtual
   waves, sectors II/III 25/30 (internal pacing counters only, never shown to the player). */
var STAGES=[
 {n:1,name:"Normal Stage 1",hpMul:1.00,spdMul:1.00,waves:20,desc:"Debris Front: meteor rain, then scattered Dartwings and long-range Needle Wasps."},
 {n:2,name:"Normal Stage 2",hpMul:1.30,spdMul:1.03,waves:20,desc:"Hive Outskirts: fast debris, darting scouts and the first Acid Spitters."},
 {n:3,name:"Hard Stage 3",hpMul:1.65,spdMul:1.06,waves:20,desc:"Brood Gardens: Brood Carriers hatch Broodlings; Nurse Scarabs support the swarm."},
 {n:4,name:"Sector II · Stage 4",hpMul:2.05,spdMul:1.09,waves:25,desc:"Acid Marsh: massed Spitters behind the first armored Shell Beetles."},
 {n:5,name:"Sector II · Stage 5",hpMul:2.50,spdMul:1.12,waves:25,desc:"Needle Passage: distant Needle Wasps and cloaking Veilwings."},
 {n:6,name:"Sector II · Stage 6",hpMul:3.10,spdMul:1.15,waves:25,desc:"Brood Furnace: splitting carriers mix with iron meteors and acid fire."},
 {n:7,name:"Sector II · Stage 7",hpMul:3.80,spdMul:1.17,waves:25,desc:"Prism Bloom: Prism Moths fire broad fans behind a veil of scouts."},
 {n:8,name:"Sector II · Stage 8",hpMul:4.60,spdMul:1.19,waves:25,desc:"Iron Carapace: armored meteor wedges and close-range Shell Beetles."},
 {n:9,name:"Sector III · Stage 9",hpMul:5.50,spdMul:1.21,waves:30,desc:"Phantom Nebula: cloaked Veilwings and Prism Moths."},
 {n:10,name:"Sector III · Stage 10",hpMul:6.50,spdMul:1.23,waves:30,desc:"Storm Swarm: fast wasp formations protected by Royal Hornets."},
 {n:11,name:"Sector III · Stage 11",hpMul:7.70,spdMul:1.24,waves:30,desc:"Siege Ring: Shell Beetles, acid artillery and assault meteors."},
 {n:12,name:"Sector III · Stage 12",hpMul:9.10,spdMul:1.25,waves:30,desc:"Queen's Nexus: all hive castes and the empowered Hive Tyrant."}
];
var WAVES=20, MAX_ENEMIES=330;
function stageWaves(stage){return stage&&stage.waves||WAVES;}
function finalWave(){return stageWaves(B&&B.stage);}
/* Battle pacing parameters; values are test targets, not official Galaxy Defense numbers. */
var BALANCE={
 draftFirst:2,draftOpeningCosts:[2,4,6,9],draftLateBase:14,draftGrowth:10,draftWaveGrowth:2.5,
 /* x3 enemies (2026-11-09, owner order): totals, spawn rate and formation
    pacing all tripled, so wave duration stays ~the same and the on-screen
    count actually triples (tripling totals alone only stretches waves). */
 waveStart:14,waveGrowth:7,/* 2026-11-12, owner order: fewer enemies in the first waves, smaller total (Stage 1 stream 2244 -> 1750); was 24/8.4 */
 spawnBase:0.20,spawnReduction:0.002,spawnMin:0.06,formationCd:1.33,
 /* Stationary insect artillery + rarer Extras, calibrated against fixed Stage 1
    attempts. .85/.13: a win on attempt 3 for the sensible fresh-account draft.
    4.25 (2026-11-12, owner order): enemies 5x HP. */
 enemyHpMul:4.25,
 enemyDmgMul:0.8,/* 2026-11-12, owner order: enemy damage down a bit ("nemnogo") */
 waveHpGrowth:0.13,bossHpGrowth:0.07,turretBasePower:1.6,jamSpeed:0.85,
 /* a purple card raises the unit level (max 3); each level-up multiplies its damage */
 levelUpDmg:0.25,
 eliteHp:1.4,eliteSpeed:1.10,eliteContact:1.18,
 eliteWaveBase:6,eliteWaveGrowth:0.84,
 eliteChampionBaseChance:0.095,eliteChampionWaveChance:0.004,eliteChampionMaxChance:0.21,
 eliteChampionHp:1.37,eliteChampionSpeed:1.03,eliteChampionContact:1.14,eliteChampionArmor:0.07,
 eliteBossHp:1.32,eliteBossContact:1.20,eliteAuraSpeed:1.15
};
/* 45-level long-term progression. Levels upgrade DMG every time, cooldown at four milestones,
   and a turret-specific secondary stat at five other milestones. */
var CD_LEVELS=[8,16,28,36], SECONDARY_LEVELS=[4,12,24,32,44];
function metaDamage(lv){return 1+0.08*(Math.min(45,Math.max(1,lv))-1);}
/* reference Lv.8 reward "Cooldown Speed +5%" (factor 1/1.05); later steps keep -7.5% each */
function metaCooldown(lv){return (lv>=CD_LEVELS[0]?1/1.05:1)*(1-0.075*CD_LEVELS.slice(1).filter(function(x){return lv>=x;}).length);}
/* number of reference Lv.4 / Lv.12 (and later) +20% secondary bumps */
function metaSteps(lv){return SECONDARY_LEVELS.filter(function(x){return lv>=x;}).length;}
function metaSecondary(lv){return 1+0.2*SECONDARY_LEVELS.filter(function(x){return lv>=x;}).length;}
function secondaryName(id){return ({skyguard:"Blast radius",laser:"Beam duration",aeroblast:"Impact radius",beam:"Beam duration",firewheel:"Drone lifetime",hive:"Wasp ATK count",railgun:"Penetration",tesla:"Discharge radius",gravity:"Gravity field radius",disruption:"Field duration",thunder:"Strike width",soldier:"Shots"})[id]||"Effect strength";}

/* Placement order: outer left, outer right, inner left, inner right.
   Each flank is a compact pair, with a clear central bunker/Guardian lane.
   The extra 60px below the deck is scenery; combat geometry stays at y=720. */
var TURRET_X=[52,368,96,324], SOLDIER_X=210, LINE_Y=720, BASEY=720, W=420, H=820;
var FORTRESS={deckY:BASEY+14,domeRx:260,domeRy:112,hpRadius:48};
/* Top of turret visibility: just below the HUD status row (~24px). Enemies above this
   line are not targeted; spawning (y=-30) is unchanged: an enemy becomes a target
   as soon as it drops below the line. */
var VIS_TOP=30;
/* How long (seconds) update() keeps a projectile's position history for its rendered trail; each weapon draws a shorter slice of it. */
var PROJ_TRAIL_T=0.34;
