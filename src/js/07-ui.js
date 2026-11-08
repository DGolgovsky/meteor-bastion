/* ==================== DRAFT: 1 из 3 по очкам боя + СУПЕР-карточки ==================== */
function freeSlot(){for(var i=0;i<4;i++){if(!B.turrets.some(function(t){return t.slot===i;}))return i;}return -1;}
var SUPERS={
 skyguard:{name:"Ракетный залп",desc:"+2 ракеты в залпе и +40% к скорострельности.",apply:function(u){u.extraProj+=2;u.haste*=1.4;}},
 laser:{name:"Зеркальный резонатор",desc:"Луч получает отражение и преломление сразу, +60% урона.",apply:function(u){u.beamSplit=true;u.reflect=Math.max(u.reflect||0,2);u.refract=true;u.dmgMul*=1.6;}},
 disruption:{name:"Стазис-поле",desc:"Замедление усилено до 70%, импульсы получают сплеш с замедлением.",apply:function(u){u.slowPow=0.7;u.splash=Math.max(u.splash,50);}},
 aeroblast:{name:"Ураган",desc:"Отброс втрое сильнее, заряды получают большой сплеш.",apply:function(u){u.knock=44;u.splash=Math.max(u.splash,60);}},
 thunder:{name:"Гроза",desc:"+3 цели цепной молнии и +50% урона.",apply:function(u){u.chain+=3;u.dmgMul*=1.5;}},
 beam:{name:"Аннигилятор",desc:"+150% урона и +20% шанса крита.",apply:function(u){u.dmgMul*=2.5;u.critBonus+=0.2;}},
 firewheel:{name:"Инферно",desc:"Горение в 3 раза сильнее, поджог получает сплеш.",apply:function(u){u.burnMul=3;u.splash=Math.max(u.splash,40);}},
 hive:{name:"Рой-мать",desc:"Дроны выпускаются парами и наносят двойной урон.",apply:function(u){u.hiveDouble=true;u.dmgMul*=1.35;}},
 railgun:{name:"Сквозной залп",desc:"Снаряд пробивает ВСЕХ врагов на линии, +80% урона.",apply:function(u){u.pierce=99;u.dmgMul*=1.8;}},
 tesla:{name:"Сверхнапряжение",desc:"Разряды бьют по 6 целям, +60% урона.",apply:function(u){u.multiCount=6;u.dmgMul*=1.6;}},
 gravity:{name:"Чёрная сингулярность",desc:"Радиус поля +50%, притяжение +35%, +40% урона поля.",apply:function(u){u.gravityRadius*=1.5;u.gravityPull*=1.35;u.gravityPower*=1.4;}},
 soldier:{name:"Легендарный стрелок",desc:"+100% урона, +25% шанса крита и +1 снаряд в очереди — на всё поле.",apply:function(u){u.dmgMul*=2;u.critBonus+=0.25;u.extraProj+=1;}}
};

/* Tier paths are tied to R&D upgrades, not to an arbitrary fifth battle level.
   The chains are original-inspired gameplay, not a claim that every numerical value matches the reference. */
var CARD_CHAINS={
 skyguard:[
  {id:"rocketPayload",name:"Усиленный заряд",desc:"T1 · взрыв ракеты +35%.",rd:2,apply:function(u){u.splash*=1.35;}},
  {id:"rocketCluster",name:"Кассетный залп",desc:"T2 · +1 ракета, урон каждой −10%.",rd:6,apply:function(u){u.extraProj++;u.dmgMul*=0.90;}},
  {id:"thermalWarhead",name:"Термобоевая часть",desc:"T3 · взрыв поджигает противников.",rd:14,apply:function(u){u.rocketBurn=true;}}
 ],
 laser:[
  {id:"laserVulnerable",name:"Метка уязвимости",desc:"T1 · повторные попадания лучом увеличивают входящий урон до +30%.",rd:2,apply:function(u){u.laserVulnerable=true;}},
  {id:"laserResonance",name:"Оптический резонанс",desc:"T2 · длительность +30% и второй луч.",rd:6,apply:function(u){u.laserDurationMul=(u.laserDurationMul||1)+0.3;u.laserDeflect=1;}},
  {id:"laserStorm",name:"Сканирующая система",desc:"T3 · отражение +1 и сканирующий луч.",rd:14,apply:function(u){u.reflect=(u.reflect||0)+1;u.laserSweep=1;}}
 ],
 disruption:[
  {id:"fieldSaturation",name:"Насыщение поля",desc:"T1 · поле на 20% больше.",rd:2,apply:function(u){u.splash*=1.20;}},
  {id:"fieldStasis",name:"Стазис помех",desc:"T2 · замедление +15 п.п.",rd:6,apply:function(u){u.slowPow=Math.min(0.75,u.slowPow+0.15);}},
  {id:"fieldExpose",name:"Вскрытие защиты",desc:"T3 · импульсы поля накладывают уязвимость.",rd:14,apply:function(u){u.fieldExpose=true;}}
 ],
 aeroblast:[
  {id:"aeroPressure",name:"Компрессия",desc:"T1 · отброс и радиус +20%.",rd:2,apply:function(u){u.knock*=1.2;u.splash*=1.2;}},
  {id:"aeroCascade",name:"Ударная волна",desc:"T2 · +1 воздушный снаряд.",rd:6,apply:function(u){u.extraProj++;}},
  {id:"aeroStorm",name:"Воздушный шторм",desc:"T3 · область удара +50%, урон +20%.",rd:14,apply:function(u){u.splash*=1.5;u.dmgMul*=1.2;}}
 ],
 thunder:[
  {id:"thunderLink",name:"Двойная цепь",desc:"T1 · +1 цель цепной молнии.",rd:2,apply:function(u){u.chain++;}},
  {id:"thunderStun",name:"Парализующий разряд",desc:"T2 · молния замедляет врагов.",rd:6,apply:function(u){u.thunderParalyze=true;}},
  {id:"thunderStorm",name:"Разрядный шторм",desc:"T3 · скорострельность +25%.",rd:14,apply:function(u){u.haste*=1.25;}}
 ],
 beam:[
  {id:"beamConcentrate",name:"Фокусировка Beam",desc:"T1 · урон возрастает при повторном поражении цели.",rd:2,apply:function(u){u.beamFocusCap=Math.max(0.8,u.beamFocusCap||0);}},
  {id:"beamStack",name:"Stacking Damage",desc:"T2 · накопленный бонус сохраняется при смене цели.",rd:6,apply:function(u){u.beamStacking=true;}},
  {id:"beamOvercharge",name:"Концентрированный поток",desc:"T3 · предел фокусировки до +300%.",rd:14,apply:function(u){u.beamFocusCap=3.0;}}
 ],
 firewheel:[
  {id:"flameTrail",name:"Flame Trail",desc:"T1 · диск оставляет горящие области.",rd:2,apply:function(u){u.fireTrail=true;}},
  {id:"blazingTrail",name:"Blazing Trail",desc:"T2 · горящий диск +25% урона.",rd:6,apply:function(u){u.dmgMul*=1.25;}},
  {id:"extendedTrail",name:"Extended Trail",desc:"T3 · диск летает на 3 секунды дольше.",rd:14,apply:function(u){u.wheelDurationBonus=(u.wheelDurationBonus||0)+3;}}
 ],
 hive:[
  {id:"swarmEcho",name:"Swarm Echo",desc:"T1 · осы выпускают один дополнительный эхорой с 50% уроном.",rd:2,apply:function(u){u.hiveEcho=1;}},
  {id:"echoUpgrade2",name:"Echo Upgrade II",desc:"T2 · урон эхоос до 75%.",rd:6,apply:function(u){u.hiveEcho=2;}},
  {id:"echoUpgrade3",name:"Echo Upgrade III",desc:"T3 · эхоосы получают полный урон.",rd:10,apply:function(u){u.hiveEcho=3;}}
 ],
 railgun:[
  {id:"railExplosive",name:"Explosive Shells",desc:"T1 · пробивающие снаряды взрываются по небольшой области.",rd:2,apply:function(u){u.railExplosive=true;}},
  {id:"railPiercing",name:"Piercing Impact",desc:"T2 · пробитие +2.",rd:6,apply:function(u){u.pierce=Math.min(15,u.pierce+2);}},
  {id:"railShock",name:"Ударная рельса",desc:"T3 · урон +30%, дальность пробития +1.",rd:14,apply:function(u){u.dmgMul*=1.3;u.pierce=Math.min(15,u.pierce+1);}}
 ],
 tesla:[
  {id:"trapMatrix",name:"Trap Matrix",desc:"T1 · электрическая матрица после взрыва.",rd:2,apply:function(u){u.teslaMatrix=true;}},
  {id:"enhancedMatrix",name:"Enhanced Matrix",desc:"T2 · матрица действует дольше и сильнее.",rd:6,apply:function(u){u.teslaMatrixPlus=true;}},
  {id:"matrixThunder",name:"Matrix Thunderbolt",desc:"T3 · матрица периодически парализует врагов.",rd:10,apply:function(u){u.teslaThunder=true;}}
 ],
 gravity:[
  {id:"smallBlackHole",name:"Small Black Hole",desc:"T1 · поле притягивает врагов дольше.",rd:2,apply:function(u){u.gravityDuration+=1.2;}},
  {id:"blackHoleExpansion",name:"Black Hole Expansion",desc:"T2 · радиус +35%, притяжение +20%.",rd:6,apply:function(u){u.gravityRadius*=1.35;u.gravityPull*=1.20;}},
  {id:"destructiveBlackHole",name:"Destructive Black Hole",desc:"T3 · поле накладывает уязвимость.",rd:14,apply:function(u){u.gravityShred=true;}}
 ],
 soldier:[
  {id:"guardianCharge",name:"Заряженный выстрел",desc:"T1 · урон Guardian +25%.",rd:2,apply:function(u){u.dmgMul*=1.25;}},
  {id:"guardianExplosion",name:"Разрывные пули",desc:"T2 · пули Guardian бьют по области.",rd:6,apply:function(u){u.splash=Math.max(u.splash,34);}},
  {id:"guardianOverdrive",name:"Перегрузка Guardian",desc:"T3 · скорострельность +25%.",rd:14,apply:function(u){u.haste*=1.25;}}
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
  if(u.cfg.id==="tesla"&&u.multiCount<6)pool.push({kind:"mod",u:u,mod:"teslaChain",w:2});
  if(u.cfg.id==="hive"&&u.hiveCount<5)pool.push({kind:"mod",u:u,mod:"hiveCount",w:3});
  if(u.cfg.id==="hive"&&u.runLv>=2&&u.hiveAttacks<16)pool.push({kind:"mod",u:u,mod:"hiveAttacks",w:3});
  if(u.cfg.id==="firewheel"&&u.runLv>=2&&(u.wheelDurationBonus||0)<6)pool.push({kind:"mod",u:u,mod:"wheelDuration",w:3});
  if(u.cfg.id==="firewheel"&&u.runLv>=2&&(u.wheelMax||1)<2)pool.push({kind:"mod",u:u,mod:"wheelCount",w:3});
  chainCandidates(u).forEach(function(card){pool.push(card);});
 });
 /* комбо-карточки пар турелей (механика Combo из Galaxy Defense) */
 var hasT=function(id){return B.turrets.some(function(u){return u.cfg.id===id;});};
 var fuT=function(id){return B.turrets.filter(function(u){return u.cfg.id===id;})[0];};
 if(hasT("laser")&&hasT("tesla")&&META.levels.tesla>=14&&!B.combos.spin)pool.push({kind:"combo",modId:"spin",u:fuT("laser"),w:3});
 if(hasT("skyguard")&&hasT("thunder")&&META.levels.skyguard>=14&&!B.combos.det)pool.push({kind:"combo",modId:"det",u:fuT("skyguard"),w:3});
 if(hasT("firewheel")&&hasT("hive")&&META.levels.firewheel>=22&&!B.combos.blaze)pool.push({kind:"combo",modId:"blaze",u:fuT("hive"),w:3});
 if(hasT("beam")&&hasT("disruption")&&META.levels.beam>=22&&!B.combos.disr)pool.push({kind:"combo",modId:"disr",u:fuT("beam"),w:3});
 if(hasT("firewheel")&&hasT("gravity")&&META.levels.gravity>=18&&!B.combos.vortexWheel)pool.push({kind:"combo",modId:"vortexWheel",u:fuT("firewheel"),w:3});
 if(hasT("gravity")&&hasT("hive")&&META.levels.gravity>=22&&!B.combos.binaryStars)pool.push({kind:"combo",modId:"binaryStars",u:fuT("gravity"),w:3});
 if(hasT("railgun")&&hasT("tesla")&&META.levels.railgun>=22&&!B.combos.surgePierce)pool.push({kind:"combo",modId:"surgePierce",u:fuT("railgun"),w:3});
 /* модули крепости — глобальные усиления боя, каждый один раз за бой */
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
 if(c.kind==="chain")return{cls:c.tier===3?"legend":"epic",icon:c.u.cfg.icon,name:c.u.cfg.name+": "+c.def.name,tag:"T"+c.tier+" · R&D "+c.def.rd,desc:c.def.desc+" <b>+1 уровень юнита</b>."};
 if(c.kind==="super"){var s=SUPERS[c.u.cfg.id];return{cls:"super",icon:c.u.cfg.icon,name:c.u.cfg.name+": "+s.name,tag:"⭐ СУПЕР · Lv. "+(c.u.runLv+1),desc:s.desc+" <b>+1 уровень юнита.</b>"};}
 if(c.kind==="new")return{cls:c.cfg.rarity,icon:c.cfg.icon,name:c.cfg.name,tag:"NEW",desc:"Построить <b>"+c.cfg.name+"</b>: "+c.cfg.desc+"<br>Урон: <b>"+c.cfg.damage+"</b> · "+c.cfg.dmgType+" · "+RARITY[c.cfg.rarity].n};
 if(c.kind==="up")return{cls:c.u.cfg.rarity,icon:c.u.cfg.icon,name:c.u.cfg.name,tag:"Lv. "+(c.u.runLv+1),desc:"<b>+18% урона</b>, +4% скорострельности."+(((c.u.runLv+1)%5===0)?" <b style='color:var(--gold)'>Условие Super Mode: R&D турели и уровень боя</b>":"")+" Урон за бой: <b>"+fmt(c.u.totalDmg)+"</b>."};
 if(c.kind==="combo"){var CM={spin:["Вращающийся лазер","Laser + Tesla Coil: дополнительный луч и +20% урона Laser."],det:["Детонационная молния","Sky Guard + Thunderbolt: ракеты поражают соседей током."],blaze:["Пылающий рой","Firewheel + Hive: осы поджигают противников."],disr:["Разрушающий луч","Beam + Disruption Drone: луч замедляет цель."],vortexWheel:["Вихревой диск","Firewheel + Gravity: диск получает +25% урона и срок жизни +2 с."],binaryStars:["Двойная сингулярность","Gravity + Hive: сильнее притяжение, радиус поля +30%."],surgePierce:["Электрорельса","Railgun + Tesla: пробитие +2, урон +25%."]}[c.modId];
  return{cls:"epic",icon:"🔗",name:"Комбо: "+CM[0],tag:"КОМБО · Lv. "+(c.u.runLv+1),desc:CM[1]+" <b>+1 уровень: "+c.u.cfg.name+"</b>."};}
 if(c.kind==="module"){var MD={boost:["Усиление поля боя","Все юниты наносят +12% урона до конца боя."],healm:["Лечение крепости","Немедленно восстановить 250 HP базы."],regenm:["Цикл регенерации","Немедленно восстановить 300 HP базы."],jam:["Глушилка волн","Все враги на 15% медленнее до конца боя."]}[c.modId];
  return{cls:"rare",icon:"🧩",name:"Модуль: "+MD[0],tag:"МОДУЛЬ КРЕПОСТИ",desc:MD[1]};}
 var M={dmg:["Силовой модуль","+15% к урону юнита."],crit:["Прицел крита","+6% шанс крита."],haste:["Ускоритель","+10% к скорострельности."],proj:["Сдвоенный ствол","+1 дополнительный снаряд в залпе."],chain:["Катушка+","+1 цель цепной молнии."],pierce:["Бронебой","+2 пробития снаряда."],splash:["Осколочный заряд","Снаряды получают урон по области."],slowpow:["Крио-ядро","Замедление усилено ещё на 12%."],refract:["Преломляющая линза","Луч преломляется в точке цели: две боковые ветви бьют врагов рядом на 50% урона."],reflect:["Отражающая призма","Луч отражается от крайней цели в соседнего врага (+1 отражение, до 3)."],
   laserSweep:["Сканирующий луч","Луч может поражать дополнительную случайную цель."],
   laserDeflect:["Дефлектор","Дополнительный луч бьёт вторую цель при работе лазера."],
   laserDuration:["Усиленный конденсатор","Длительность лазерного импульса +30%."],
   beamDuration:["Резонанс Beam","Продолжительность серии Beam +35%."],
   beamFocus:["Фокусировка Beam","Повторные попадания по одной цели наращивают урон до +80%."],
   teslaMatrix:["Электрическая матрица","После разряда остаётся поле периодического урона."],
   teslaMatrixPlus:["Усиленная матрица","Увеличены длительность и урон поля Tesla."],
   teslaChain:["Вторичная дуга","Ещё одна цель цепного разряда Tesla."],
   hiveCount:["Новые осы","+1 оса при каждом выпуске улья."],
   hiveAttacks:["Усиленные жала","+2 атаки каждой осы."],
   wheelDuration:["Стабилизатор Firewheel","Время полёта огненного диска +2 секунды."],
   wheelCount:["Второй светлячок","Firewheel держит в поле два огненных диска вместо одного."]};
 var m=M[c.mod];return{cls:"rare",icon:c.u.cfg.icon,name:c.u.cfg.name+": "+m[0],tag:"МОД · Lv. "+(c.u.runLv+1),desc:m[1]+" <b>+1 уровень юнита.</b>"+(((c.u.runLv+1)%5===0)?" <b style='color:var(--gold)'>Условие Super Mode: R&D турели и уровень боя</b>":"")};
}
var curCards=[];
function openDraft(){
 SFX.levelup();
 $("lu-title").textContent="🎴 Очки накоплены!";
 $("lu-sub").textContent="Карточка за очки боя · Взято карточек: "+B.drafts+" · Следующая — за "+B.draftNeed+" очк."+(B.pendingDrafts>1?" · В очереди ещё "+(B.pendingDrafts-1)+"!":"")+(B.pendingSuper.length?" · ⭐ В драфте супер-карточка!":"");
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
 // супер-карточку при реролле не теряем
 var sup=curCards.filter(function(c){return c.kind==="super";});
 curCards=genCards(sup.length===0);sup.forEach(function(s){if(!curCards.some(function(c){return c.kind==="super";}))curCards[0]=s;});
 renderCards();$("btn-reroll").style.display="none";SFX.pick();});
/* ЛЮБАЯ карточка по существующему юниту (усиление, мод, супер) = +1 к его уровню.
   Каждый 5-й уровень ставит супер-карточку в очередь на следующий драфт. */
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
   if(c.modId==="jam"){B.enemySpdMul*=0.85;B.enemies.forEach(function(e){e.speed*=0.85;});}
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
   if(c.mod==="teslaChain")t.multiCount++;
   if(c.mod==="hiveCount")t.hiveCount++;
   if(c.mod==="hiveAttacks")t.hiveAttacks+=2;
   if(c.mod==="wheelDuration")t.wheelDurationBonus=(t.wheelDurationBonus||0)+2;
   if(c.mod==="wheelCount")t.wheelMax=2;
   t.mods.push(c.mod);
   gainLevel(t,false);
 }
 SFX.pick();
 B.drafts++;
 /* одна карточка из очереди потрачена; если очки дали ещё — сразу следующий драфт */
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
 var rw=B.elite?1.6:1; /* Elite: враги крепче — награды щедрее */
 var coins=Math.floor((B.kills*2.2+(win?220:60)+B.wave*25)*(1+(B.stage.n-1)*0.23)*rw);
 var comp=Math.floor((2+Math.floor(B.kills/25)+(win?3:0))*rw);
 var gems=(win?2:(B.kills>60?1:0))+(B.elite&&win?1:0);
 var pxp=Math.floor((win?40+B.wave*6:10+B.wave*3)*rw*(1+(B.stage.n-1)*0.17));
 var mats={};
 allFighters().forEach(function(t){mats[t.cfg.id]=Math.floor((8+Math.floor(t.totalDmg/260))*(1+(B.stage.n-1)*0.15)*rw);});
 lastRewards={win:win,coins:coins,gems:gems,comp:comp,pxp:pxp,mats:mats,applied:false};
 if(win){META.wins++;
   if(B.elite)META.eliteCleared[B.stage.n]=true;else META.normalCleared[B.stage.n]=true;
   if(B.stage.n===META.unlocked&&META.unlocked<STAGES.length)META.unlocked++;
 }
 persist();
 $("res-title").textContent=win?"Victory":"Defeat";
 $("res-title").className=win?"win":"lose";
 $("res-sub").textContent=B.stage.name+" · Волн пройдено: "+(win?finalWave():B.wave)+" · Убийств: "+B.kills+" · Время: "+mmss(B.elapsed)+" · 🎴 Карточек взято: "+B.drafts+" · ❤ Базе восстановлено: "+Math.floor(B.totalHealed)+" HP";
 renderRewards();
 var tb=$("res-stats");tb.innerHTML="";
 stats.forEach(function(s){tb.innerHTML+="<tr><td>"+s.t.cfg.icon+" "+s.t.cfg.name+" <span style='color:var(--muted)'>Lv."+s.t.runLv+"</span></td><td>"+fmt(s.dmg)+"</td><td>"+fmt(s.dps)+"</td></tr>";});
 $("ov-result").classList.add("on");
 if(win)SFX.win();else SFX.lose();
}
function renderRewards(){
 var r=lastRewards,m=1;
 var top3=Object.keys(r.mats).slice(0,3);
 var h='<div class="rwd"><div class="ric">⭐</div><div class="rv">'+(r.pxp*m)+'</div><div class="rn">Опыт аккаунта</div></div>'+
 '<div class="rwd"><div class="ric">🪙</div><div class="rv">'+(r.coins*m)+'</div><div class="rn">Монеты</div></div>'+
 '<div class="rwd"><div class="ric">💎</div><div class="rv">'+(r.gems*m)+'</div><div class="rn">Гемы</div></div>'+
 '<div class="rwd"><div class="ric">🧩</div><div class="rv">'+(r.comp*m)+'</div><div class="rn">Компоненты</div></div>';
 top3.forEach(function(id){var cfg=allUnitsCfg().filter(function(t){return t.id===id;})[0];h+='<div class="rwd"><div class="ric">'+cfg.icon+'</div><div class="rv">'+(r.mats[id]*m)+'</div><div class="rn">Материалы: '+cfg.name+'</div></div>';});
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

