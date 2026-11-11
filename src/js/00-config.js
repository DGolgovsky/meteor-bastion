"use strict";
/* ==================== CONFIG ==================== */
var RARITY={common:{n:"Common"},rare:{n:"Rare"},epic:{n:"Epic"},legend:{n:"Legendary"}};
var TURRETS=[
 {id:"skyguard",name:"Sky Guard",icon:"🚀",dmgType:"Rockets",damage:17,attackSpeed:1.5,range:640,projSpeed:400,crit:0.08,critMul:1.8,target:"closestBase",effect:"rocket",rarity:"common",color:"#ffd34d",desc:"Rocket launcher: fires homing rockets that deal area damage. Range covers almost the whole map."},
 {id:"laser",name:"Laser",icon:"🔆",dmgType:"Energy",damage:26,attackSpeed:1,range:1200,projSpeed:0,crit:0.05,critMul:1.8,target:"strongest",effect:"beam",rarity:"common",color:"#4ade80",desc:"A map-wide beam: damages ALL enemies caught in it. Upgrades add beam reflection and refraction."},
 {id:"disruption",name:"Disruption Drone",icon:"🛸",dmgType:"Force field",damage:7,attackSpeed:1.1,range:180,projSpeed:340,crit:0.05,critMul:1.7,target:"closestBase",effect:"slow",rarity:"rare",color:"#38c8ff",desc:"Force-field pulses slow enemies by 35%."},
 {id:"aeroblast",name:"Aeroblast",icon:"🌀",dmgType:"Air",damage:10,attackSpeed:0.8,range:540,projSpeed:520,crit:0.06,critMul:1.8,target:"nearest",effect:"knockback",rarity:"common",color:"#7dd7ff",desc:"A medium-range air shotgun: 5 pellets, a tight spread at range and strong knockback up close."},
 {id:"thunder",name:"Thunderbolt",icon:"⚡",dmgType:"Electric",damage:16,attackSpeed:0.8,range:180,projSpeed:0,crit:0.12,critMul:2.0,target:"nearest",effect:"chain",rarity:"rare",color:"#c084fc",desc:"Lightning jumps to nearby enemies."},
 {id:"beam",name:"Beam",icon:"🔷",dmgType:"Energy",damage:55,attackSpeed:0.55,range:420,projSpeed:520,crit:0.1,critMul:2.2,target:"strongest",effect:"none",rarity:"epic",color:"#38bdf8",desc:"Fires a focused series of energy hits at the toughest targets."},
 {id:"firewheel",name:"Firewheel Drone",icon:"🔥",dmgType:"Fire",damage:10,attackSpeed:1.4,range:580,projSpeed:360,crit:0.06,critMul:1.8,target:"closestBase",effect:"burn",rarity:"rare",color:"#ff8a3c",desc:"Releases a long-lived bouncing fire disc that repeatedly hits enemies."},
 {id:"hive",name:"Hive",icon:"🐝",dmgType:"Drones",damage:14,attackSpeed:0.5,range:390,projSpeed:300,crit:0.05,critMul:1.7,target:"nearest",effect:"hive",rarity:"epic",color:"#facc15",desc:"Releases persistent wasps within range. Released wasps hunt across the whole field and strike repeatedly."},
 {id:"railgun",name:"Railgun",icon:"🎯",dmgType:"Rail",damage:70,attackSpeed:0.45,range:230,projSpeed:900,crit:0.15,critMul:2.4,target:"closestBase",effect:"pierce",rarity:"legend",color:"#f472b6",desc:"The projectile pierces straight through enemies along its line."},
 {id:"tesla",name:"Tesla Coil",icon:"🌩️",dmgType:"Electric",damage:15,attackSpeed:0.88,range:470,projSpeed:430,crit:0.1,critMul:2.0,target:"random",effect:"charge",rarity:"epic",color:"#a06bff",desc:"The charge deals explosive damage and releases chain lightning."},
 {id:"gravity",name:"Gravity Vortex Gun",icon:"🕳️",dmgType:"Gravity",damage:9,attackSpeed:0.48,range:390,projSpeed:0,crit:0.04,critMul:1.65,target:"closestBase",effect:"gravity",rarity:"epic",color:"#8cb5ff",desc:"Creates a gravity field that pulls enemies in and deals damage over time."}
];
var SOLDIER_CFG={id:"soldier",name:"Soldier \"Bastion\"",icon:"🪖",dmgType:"Rifle",damage:12,attackSpeed:4.0,range:9999,projSpeed:640,crit:0.15,critMul:2.0,target:"closestBase",effect:"none",rarity:"legend",color:"#ffd34d",desc:"Your movable fighter on the fortress deck. Range: the whole field."};
/* res: incoming damage multipliers by type (like the ±50% resistances in Galaxy Defense):
   <1 is resistance, >1 is vulnerability */
var ENEMIES=[
 {id:"meteor",name:"Meteor",hp:65,speed:82,dmg:36,armor:0,xp:1,r:13,color:"#8a6a55",kind:"meteor",res:{fire:0.65,phys:1.22}},
 {id:"fast",name:"Fast meteor",hp:46,speed:118,dmg:34,armor:0,xp:1,r:9,color:"#a87a52",kind:"meteor",res:{electric:1.30}},
 {id:"armored",name:"Armored",hp:190,speed:70,dmg:78,armor:0.35,xp:3,r:16,color:"#6b7686",kind:"meteor",res:{phys:0.55,fire:0.82,electric:1.4}},
 {id:"flyer",name:"Flyer",hp:74,speed:100,dmg:49,armor:0,xp:2,r:12,color:"#7c5cbf",kind:"flyer",res:{electric:1.35,energy:0.8}},
 {id:"splitter",name:"Golem mother",hp:245,speed:62,dmg:82,armor:0.12,xp:5,r:19,color:"#4f7a52",kind:"splitter",res:{force:0.7,phys:1.25}},
 {id:"mini",name:"Golem shard",hp:52,speed:125,dmg:27,armor:0,xp:1,r:9,color:"#5d8a60",kind:"meteor",res:{force:0.7,phys:1.2}},
 {id:"healer",name:"Regeneration star",hp:230,speed:78,dmg:53,armor:0.12,xp:6,r:15,color:"#3fae6a",kind:"healer",res:{energy:1.35,electric:0.75}},
 {id:"elite",name:"Elite",hp:430,speed:82,dmg:135,armor:0.26,xp:8,r:20,color:"#b03a5b",kind:"elite",res:{energy:0.75,force:1.25}},
 {id:"phase",name:"Phantom scout",hp:105,speed:112,dmg:58,armor:0.08,xp:3,r:11,color:"#83a4d9",kind:"phase",res:{energy:1.3,electric:0.85}},
 {id:"charger",name:"Assault meteor",hp:135,speed:96,dmg:80,armor:0.12,xp:3,r:13,color:"#e38554",kind:"charger",res:{fire:0.8,force:1.3}},
 {id:"boss",name:"BOSS \"Goliath\"",hp:2200,speed:30,dmg:410,armor:0.25,xp:60,r:34,color:"#5b1f2e",kind:"boss",res:{fire:0.75,phys:0.85}}
];
/* Campaign progression: early stages have 20 waves, sectors II/III have longer runs. */
var STAGES=[
 {n:1,name:"Normal Stage 1",hpMul:1.00,spdMul:1.00,waves:20,desc:"The first assault waves and meteors. Final boss in wave 20."},
 {n:2,name:"Normal Stage 2",hpMul:1.30,spdMul:1.03,waves:20,desc:"Dense meteor streams and fast targets."},
 {n:3,name:"Hard Stage 3",hpMul:1.65,spdMul:1.06,waves:20,desc:"Armor, golems and reinforced waves."},
 {n:4,name:"Sector II · Stage 4",hpMul:2.05,spdMul:1.09,waves:25,desc:"Phantom scouts and reinforced assaults. 25 waves."},
 {n:5,name:"Sector II · Stage 5",hpMul:2.50,spdMul:1.12,waves:25,desc:"Head-on attacks by swift targets."},
 {n:6,name:"Sector II · Stage 6",hpMul:3.10,spdMul:1.15,waves:25,desc:"Dangerous splitting meteors."},
 {n:7,name:"Sector II · Stage 7",hpMul:3.80,spdMul:1.17,waves:25,desc:"Strong support enemies and heavy armor."},
 {n:8,name:"Sector II · Stage 8",hpMul:4.60,spdMul:1.19,waves:25,desc:"An extreme number of enemies, 25 waves."},
 {n:9,name:"Sector III · Stage 9",hpMul:5.50,spdMul:1.21,waves:30,desc:"A long thirty-wave assault."},
 {n:10,name:"Sector III · Stage 10",hpMul:6.50,spdMul:1.23,waves:30,desc:"Ultra-fast enemies and champions."},
 {n:11,name:"Sector III · Stage 11",hpMul:7.70,spdMul:1.24,waves:30,desc:"A siege force and tricky resistance combinations."},
 {n:12,name:"Sector III · Stage 12",hpMul:9.10,spdMul:1.25,waves:30,desc:"Campaign finale: 30 waves, an empowered Goliath."}
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
 waveStart:24,waveGrowth:8.4,
 spawnBase:0.20,spawnReduction:0.002,spawnMin:0.06,formationCd:1.33,
 enemyHpMul:0.78,
 /* waveHpGrowth 0.06 -> 0.14 (2026-11-10): the reference card numbers (+50%, +200%) made Stage 1 a
    75% win for the sensible headless policy; enemies, not cards, were retuned back to ~1/3 */
 waveHpGrowth:0.14,bossHpGrowth:0.07,turretBasePower:1.6,
 /* a purple card raises the unit level (max 3); each level-up multiplies its damage */
 levelUpDmg:0.25,
 eliteHp:1.68,eliteSpeed:1.10,eliteContact:1.18,
 eliteWaveBase:6,eliteWaveGrowth:0.84,
 eliteChampionBaseChance:0.095,eliteChampionWaveChance:0.004,eliteChampionMaxChance:0.21,
 eliteChampionHp:1.37,eliteChampionSpeed:1.03,eliteChampionContact:1.14,eliteChampionArmor:0.07,
 eliteBossHp:1.32,eliteBossContact:1.20,eliteAuraSpeed:1.15
};
/* 45-level long-term progression. Levels upgrade DMG every time, cooldown at four milestones,
   and a turret-specific secondary stat at five other milestones. */
var CD_LEVELS=[8,16,28,36], SECONDARY_LEVELS=[4,12,24,32,44];
function metaDamage(lv){return 1+0.08*(Math.min(45,Math.max(1,lv))-1);}
function metaCooldown(lv){return 1-0.075*CD_LEVELS.filter(function(x){return lv>=x;}).length;}
function metaSecondary(lv){return 1+0.2*SECONDARY_LEVELS.filter(function(x){return lv>=x;}).length;}
function secondaryName(id){return ({skyguard:"Blast radius",laser:"Beam duration",aeroblast:"Impact radius",beam:"Beam duration",firewheel:"Drone lifetime",hive:"Wasp attacks",railgun:"Pierce",tesla:"Discharge radius",gravity:"Gravity field size",disruption:"Field area",thunder:"Chain targets",soldier:"Shots"})[id]||"Effect strength";}

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
/* damage types per the Galaxy Defense wiki: Fire / Energy / Force-field / Physical / Electric */
var DTYPES={skyguard:"fire",laser:"energy",disruption:"force",aeroblast:"phys",thunder:"electric",beam:"energy",firewheel:"fire",hive:"force",railgun:"phys",tesla:"electric",gravity:"force",soldier:"phys"};
TURRETS.concat([SOLDIER_CFG]).forEach(function(t){t.dtype=DTYPES[t.id];});
var DTYPE_RU={fire:"Fire",energy:"Energy",force:"Force field",phys:"Phys.",electric:"Electric"};

