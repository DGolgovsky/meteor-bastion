"use strict";
/* ==================== CONFIG ==================== */
var RARITY={common:{n:"Обычная"},rare:{n:"Редкая"},epic:{n:"Эпическая"},legend:{n:"Легенда"}};
var TURRETS=[
 {id:"skyguard",name:"Sky Guard",icon:"🚀",dmgType:"Ракеты",damage:17,attackSpeed:1.5,range:640,projSpeed:400,crit:0.08,critMul:1.8,target:"closestBase",effect:"rocket",rarity:"common",color:"#ffd34d",desc:"Ракетная установка: выпускает самонаводящиеся ракеты с уроном по площади. Дальность — почти вся карта."},
 {id:"laser",name:"Laser",icon:"🔆",dmgType:"Энергия",damage:26,attackSpeed:1,range:1200,projSpeed:0,crit:0.05,critMul:1.8,target:"strongest",effect:"beam",rarity:"common",color:"#4ade80",desc:"Луч на всю карту: наносит урон ВСЕМ врагам, попавшим в луч. Улучшениями получает отражение и преломление луча."},
 {id:"disruption",name:"Disruption Drone",icon:"🛸",dmgType:"Силовое поле",damage:7,attackSpeed:1.1,range:180,projSpeed:340,crit:0.05,critMul:1.7,target:"closestBase",effect:"slow",rarity:"rare",color:"#38c8ff",desc:"Импульсы силового поля замедляют врагов на 35%."},
 {id:"aeroblast",name:"Aeroblast",icon:"🌀",dmgType:"Воздух",damage:12,attackSpeed:0.9,range:170,projSpeed:380,crit:0.06,critMul:1.8,target:"nearest",effect:"knockback",rarity:"common",color:"#7dd7ff",desc:"Воздушные заряды отбрасывают врагов назад."},
 {id:"thunder",name:"Thunderbolt",icon:"⚡",dmgType:"Электричество",damage:16,attackSpeed:0.8,range:180,projSpeed:0,crit:0.12,critMul:2.0,target:"nearest",effect:"chain",rarity:"rare",color:"#c084fc",desc:"Молния перескакивает на соседних врагов."},
 {id:"beam",name:"Beam",icon:"🔷",dmgType:"Энергия",damage:55,attackSpeed:0.55,range:420,projSpeed:520,crit:0.1,critMul:2.2,target:"strongest",effect:"none",rarity:"epic",color:"#38bdf8",desc:"Тяжёлые энергозаряды по самым прочным целям."},
 {id:"firewheel",name:"Firewheel Drone",icon:"🔥",dmgType:"Огонь",damage:10,attackSpeed:1.4,range:580,projSpeed:360,crit:0.06,critMul:1.8,target:"closestBase",effect:"burn",rarity:"rare",color:"#ff8a3c",desc:"Поджигает врагов: урон продолжает тикать."},
 {id:"hive",name:"Hive",icon:"🐝",dmgType:"Дроны",damage:14,attackSpeed:0.5,range:390,projSpeed:300,crit:0.05,critMul:1.7,target:"nearest",effect:"hive",rarity:"epic",color:"#facc15",desc:"Выпускает автономных дронов-камикадзе."},
 {id:"railgun",name:"Railgun",icon:"🎯",dmgType:"Рельса",damage:70,attackSpeed:0.45,range:230,projSpeed:900,crit:0.15,critMul:2.4,target:"closestBase",effect:"pierce",rarity:"legend",color:"#f472b6",desc:"Снаряд пробивает врагов насквозь по линии."},
 {id:"tesla",name:"Tesla Coil",icon:"🌩️",dmgType:"Электричество",damage:13,attackSpeed:1.0,range:470,projSpeed:430,crit:0.1,critMul:2.0,target:"random",effect:"charge",rarity:"epic",color:"#a06bff",desc:"Выпускает летящий заряд энергии: при попадании разряжается дугами по соседним врагам."}
];
var SOLDIER_CFG={id:"soldier",name:"Солдат «Бастион»",icon:"🪖",dmgType:"Винтовка",damage:13,attackSpeed:6.6667,range:9999,projSpeed:640,crit:0.15,critMul:2.0,target:"closestBase",effect:"none",rarity:"legend",color:"#ffd34d",desc:"Твой боец в центре линии. Дальность — всё поле."};
/* res — множители входящего урона по типам (как ±50% сопротивлений в Galaxy Defense):
   <1 — сопротивление, >1 — уязвимость */
var ENEMIES=[
 {id:"meteor",name:"Метеорит",hp:26,speed:34,dmg:40,armor:0,xp:1,r:13,color:"#8a6a55",kind:"meteor",res:{fire:0.6,phys:1.3}},
 {id:"fast",name:"Быстрый метеорит",hp:16,speed:62,dmg:30,armor:0,xp:1,r:9,color:"#a87a52",kind:"meteor",res:{electric:1.35}},
 {id:"armored",name:"Бронированный",hp:95,speed:22,dmg:70,armor:0.35,xp:3,r:16,color:"#6b7686",kind:"meteor",res:{phys:0.5,fire:0.8,electric:1.5}},
 {id:"flyer",name:"Летун",hp:34,speed:44,dmg:45,armor:0,xp:2,r:12,color:"#7c5cbf",kind:"flyer",res:{electric:1.4,energy:0.7}},
 {id:"splitter",name:"Голем-матка",hp:150,speed:20,dmg:60,armor:0.1,xp:5,r:19,color:"#4f7a52",kind:"splitter",res:{force:0.6,phys:1.3}},
 {id:"mini",name:"Осколок голема",hp:30,speed:40,dmg:25,armor:0,xp:1,r:9,color:"#5d8a60",kind:"meteor",res:{force:0.6,phys:1.3}},
 {id:"healer",name:"Звезда регенерации",hp:120,speed:24,dmg:35,armor:0.1,xp:6,r:15,color:"#3fae6a",kind:"healer",res:{energy:1.4,electric:0.7}},
 {id:"elite",name:"Элитный",hp:260,speed:26,dmg:120,armor:0.2,xp:8,r:20,color:"#b03a5b",kind:"elite",res:{energy:0.7,force:1.3}},
 {id:"boss",name:"БОСС «Голиаф»",hp:2600,speed:15,dmg:400,armor:0.25,xp:60,r:34,color:"#5b1f2e",kind:"boss",res:{fire:0.7,phys:0.8}}
];
var STAGES=[
 {n:1,name:"Normal Stage 1",hpMul:1,spdMul:1,desc:"20 волн метеоритов, босс в последней. Карточки — за очки боя с убийств (первая — уже после второго монстра), лечение базы +2 HP за врага."},
 {n:2,name:"Normal Stage 2",hpMul:1.45,spdMul:1.08,desc:"Крепче и плотнее. Открывается после победы на этапе 1."},
 {n:3,name:"Hard Stage 3",hpMul:2.0,spdMul:1.16,desc:"Шторм: элитки с 5-й волны и усиленный босс."}
];
var WAVES=20, MAX_ENEMIES=58;
/* Battle pacing parameters; values are test targets, not official Galaxy Defense numbers. */
var BALANCE={
 draftFirst:2,draftGrowth:8,draftWaveGrowth:2,
 waveStart:6,waveGrowth:2.4,
 spawnBase:0.86,spawnReduction:0.027,spawnMin:0.28,
 waveHpGrowth:0.165,bossHpGrowth:0.12,
 eliteHp:1.68,eliteSpeed:1.10,eliteContact:1.18,
 eliteWaveBase:2,eliteWaveGrowth:0.28,
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
function secondaryName(id){return ({skyguard:"Радиус взрыва",laser:"Длительность луча",aeroblast:"Радиус удара",beam:"Длительность луча",firewheel:"Время жизни дрона",hive:"Атаки ос",railgun:"Пробитие",tesla:"Радиус разряда",disruption:"Площадь поля",thunder:"Количество цепных целей",soldier:"Выстрелы"})[id]||"Сила эффекта";}

/* Placement order in a run: far left, far right, center left, center right. */
var TURRET_X=[52,368,128,292], SOLDIER_X=210, LINE_Y=660, BASEY=660, W=420, H=700;
/* Верх видимости турелей: чуть ниже строки состояния HUD (~24px). Враги выше этой
   линии не берутся в прицел; спавн (y=-30) не меняется — враг становится целью,
   как только опустится ниже линии. */
var VIS_TOP=30;
/* типы урона по вики Galaxy Defense: Fire / Energy / Force-field / Physical / Electric */
var DTYPES={skyguard:"fire",laser:"energy",disruption:"force",aeroblast:"phys",thunder:"electric",beam:"energy",firewheel:"fire",hive:"force",railgun:"phys",tesla:"electric",soldier:"phys"};
TURRETS.concat([SOLDIER_CFG]).forEach(function(t){t.dtype=DTYPES[t.id];});
var DTYPE_RU={fire:"Огонь",energy:"Энергия",force:"Силовое поле",phys:"Физ.",electric:"Электро"};

