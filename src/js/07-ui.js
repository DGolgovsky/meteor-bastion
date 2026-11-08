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
 soldier:{name:"Легендарный стрелок",desc:"+100% урона, +25% шанса крита и +1 снаряд в очереди — на всё поле.",apply:function(u){u.dmgMul*=2;u.critBonus+=0.25;u.extraProj+=1;}}
};
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
  if(u.cfg.id==="laser"&&u.runLv>=2&&!u.laserSweep)pool.push({kind:"mod",u:u,mod:"laserSweep",w:3});
  if(u.cfg.id==="laser"&&u.runLv>=2&&!u.laserDeflect)pool.push({kind:"mod",u:u,mod:"laserDeflect",w:2});
  if(u.cfg.id==="laser"&&u.runLv>=2&&(u.laserDurationMul||1)<1.8)pool.push({kind:"mod",u:u,mod:"laserDuration",w:3});
  if(u.cfg.id==="beam"&&u.runLv>=2&&(u.beamDurationMul||1)<1.8)pool.push({kind:"mod",u:u,mod:"beamDuration",w:3});
  if(u.cfg.id==="beam"&&u.runLv>=3&&!u.beamFocusCap)pool.push({kind:"mod",u:u,mod:"beamFocus",w:2});
  if(u.cfg.id==="tesla"&&u.runLv>=2&&!u.teslaMatrix)pool.push({kind:"mod",u:u,mod:"teslaMatrix",w:3});
  if(u.cfg.id==="tesla"&&u.teslaMatrix&&!u.teslaMatrixPlus)pool.push({kind:"mod",u:u,mod:"teslaMatrixPlus",w:2});
  if(u.cfg.id==="tesla"&&u.multiCount<6)pool.push({kind:"mod",u:u,mod:"teslaChain",w:2});
  if(u.cfg.id==="hive"&&u.hiveCount<5)pool.push({kind:"mod",u:u,mod:"hiveCount",w:3});
  if(u.cfg.id==="hive"&&u.runLv>=2&&u.hiveAttacks<16)pool.push({kind:"mod",u:u,mod:"hiveAttacks",w:3});
  if(u.cfg.id==="firewheel"&&u.runLv>=2&&(u.wheelDurationBonus||0)<6)pool.push({kind:"mod",u:u,mod:"wheelDuration",w:3});
 });
 /* комбо-карточки пар турелей (механика Combo из Galaxy Defense) */
 var hasT=function(id){return B.turrets.some(function(u){return u.cfg.id===id;});};
 var fuT=function(id){return B.turrets.filter(function(u){return u.cfg.id===id;})[0];};
 if(hasT("laser")&&hasT("tesla")&&!B.combos.spin)pool.push({kind:"combo",modId:"spin",u:fuT("laser"),w:3});
 if(hasT("skyguard")&&hasT("thunder")&&!B.combos.det)pool.push({kind:"combo",modId:"det",u:fuT("skyguard"),w:3});
 if(hasT("firewheel")&&hasT("hive")&&!B.combos.blaze)pool.push({kind:"combo",modId:"blaze",u:fuT("hive"),w:3});
 if(hasT("beam")&&hasT("disruption")&&!B.combos.disr)pool.push({kind:"combo",modId:"disr",u:fuT("beam"),w:3});
 /* модули крепости — глобальные усиления боя, каждый один раз за бой */
 ["boost","shieldm","regenm","jam"].forEach(function(mid){if(!B.modulesUsed[mid])pool.push({kind:"module",modId:mid,w:3});});
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
 if(c.kind==="super"){var s=SUPERS[c.u.cfg.id];return{cls:"super",icon:c.u.cfg.icon,name:c.u.cfg.name+": "+s.name,tag:"⭐ СУПЕР · Lv. "+(c.u.runLv+1),desc:s.desc+" <b>+1 уровень юнита.</b>"};}
 if(c.kind==="new")return{cls:c.cfg.rarity,icon:c.cfg.icon,name:c.cfg.name,tag:"NEW",desc:"Построить <b>"+c.cfg.name+"</b>: "+c.cfg.desc+"<br>Урон: <b>"+c.cfg.damage+"</b> · "+c.cfg.dmgType+" · "+RARITY[c.cfg.rarity].n};
 if(c.kind==="up")return{cls:c.u.cfg.rarity,icon:c.u.cfg.icon,name:c.u.cfg.name,tag:"Lv. "+(c.u.runLv+1),desc:"<b>+25% урона</b>, +6% скорострельности."+(((c.u.runLv+1)%5===0)?" <b style='color:var(--gold)'>Юбилейный уровень — в следующем драфте будет СУПЕР-карточка!</b>":"")+" Урон за бой: <b>"+fmt(c.u.totalDmg)+"</b>."};
 if(c.kind==="combo"){var CM={spin:["Вращающийся лазер","Laser + Tesla Coil: луч бьёт вторую цель, +30% урона Laser."],det:["Детонационная молния","Sky Guard + Thunderbolt: попадания ракет бьют током соседнего врага."],blaze:["Пылающий рой","Firewheel + Hive: пчёлы улья поджигают врагов."],disr:["Разрушающий луч","Beam + Disruption Drone: луч Beam замедляет цели на 30%."]}[c.modId];
  return{cls:"epic",icon:"🔗",name:"Комбо: "+CM[0],tag:"КОМБО · Lv. "+(c.u.runLv+1),desc:CM[1]+" <b>+1 уровень: "+c.u.cfg.name+"</b>."};}
 if(c.kind==="module"){var MD={boost:["Усиление поля боя","Все юниты наносят +12% урона до конца боя."],shieldm:["Щит крепости","Немедленно +250 к щиту базы и к его максимуму."],regenm:["Цикл регенерации","Немедленно восстановить 300 HP базы."],jam:["Глушилка волн","Все враги на 15% медленнее до конца боя."]}[c.modId];
  return{cls:"rare",icon:"🧩",name:"Модуль: "+MD[0],tag:"МОДУЛЬ КРЕПОСТИ",desc:MD[1]};}
 var M={dmg:["Силовой модуль","+30% к урону юнита."],crit:["Прицел крита","+10% шанс крита."],haste:["Ускоритель","+18% к скорострельности."],proj:["Сдвоенный ствол","+1 дополнительный снаряд в залпе."],chain:["Катушка+","+1 цель цепной молнии."],pierce:["Бронебой","+2 пробития снаряда."],splash:["Осколочный заряд","Снаряды получают урон по области."],slowpow:["Крио-ядро","Замедление усилено ещё на 12%."],refract:["Преломляющая линза","Луч преломляется в точке цели: две боковые ветви бьют врагов рядом на 50% урона."],reflect:["Отражающая призма","Луч отражается от крайней цели в соседнего врага (+1 отражение, до 3)."],
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
   wheelDuration:["Стабилизатор Firewheel","Время полёта огненного диска +2 секунды."]};
 var m=M[c.mod];return{cls:"rare",icon:c.u.cfg.icon,name:c.u.cfg.name+": "+m[0],tag:"МОД · Lv. "+(c.u.runLv+1),desc:m[1]+" <b>+1 уровень юнита.</b>"+(((c.u.runLv+1)%5===0)?" <b style='color:var(--gold)'>Юбилейный уровень — в следующем драфте будет СУПЕР-карточка!</b>":"")};
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
 if(statBoost){u.dmgMul*=1.25;u.haste*=1.06;}
 burst(u.x,u.y,12,u.cfg.color);
 if(u.runLv%5===0&&!u.mods.includes("super")&&!B.pendingSuper.includes(u)){B.pendingSuper.push(u);toast("⭐ "+u.cfg.name+" достиг "+u.runLv+" уровня — супер-карточка в следующем драфте!");}
}
function applyCard(c){
 if(c.kind==="new"){
   var s=freeSlot();if(s<0){toast("Все 4 слота турелей заняты");return;}
   var nt=mkUnit(c.cfg,TURRET_X[s],s,false);B.turrets.push(nt);B.usedTypes[c.cfg.id]=1;burst(nt.x,nt.y,16,c.cfg.color);
 }else if(c.kind==="super"){
   SUPERS[c.u.cfg.id].apply(c.u);c.u.mods.push("super");burst(c.u.x,c.u.y,22,"#ffd34d");B.shake=6;
   gainLevel(c.u,false);
 }else if(c.kind==="up"){
   gainLevel(c.u,true);
 }else if(c.kind==="combo"){
   B.combos[c.modId]=1;
   if(c.modId==="spin"){c.u.beamSplit=true;c.u.dmgMul*=1.3;}
   if(c.modId==="det")c.u.zapOnHit=true;
   if(c.modId==="blaze")c.u.hiveBurn=true;
   if(c.modId==="disr")c.u.beamSlow=true;
   burst(c.u.x,c.u.y,16,"#a06bff");
   gainLevel(c.u,false);
 }else if(c.kind==="module"){
   B.modulesUsed[c.modId]=1;
   if(c.modId==="boost")B.allDmgMul*=1.12;
   if(c.modId==="shieldm"){B.shieldMax+=250;B.shield+=250;}
   if(c.modId==="regenm")B.baseHp=Math.min(B.baseMax,B.baseHp+300);
   if(c.modId==="jam"){B.enemySpdMul*=0.85;B.enemies.forEach(function(e){e.speed*=0.85;});}
   burst(W/2,BASEY-46,18,"#2ee6c8");
 }else{
   var t=c.u;
   if(c.mod==="dmg")t.dmgMul*=1.3;
   if(c.mod==="crit")t.critBonus+=0.10;
   if(c.mod==="haste")t.haste*=1.18;
   if(c.mod==="proj")t.extraProj++;
   if(c.mod==="chain")t.chain++;
   if(c.mod==="pierce")t.pierce+=2;
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
 var coins=Math.floor((B.kills*2.2+(win?220:60)+B.wave*25)*rw);
 var comp=Math.floor((2+Math.floor(B.kills/25)+(win?3:0))*rw);
 var gems=(win?2:(B.kills>60?1:0))+(B.elite&&win?1:0);
 var pxp=Math.floor((win?40+B.wave*6:10+B.wave*3)*rw);
 var mats={};
 allFighters().forEach(function(t){mats[t.cfg.id]=Math.floor((3+Math.floor(t.totalDmg/400))*rw);});
 lastRewards={win:win,coins:coins,gems:gems,comp:comp,pxp:pxp,mats:mats,applied:false};
 if(win){META.wins++;
   if(B.elite)META.eliteCleared[B.stage.n]=true;else META.normalCleared[B.stage.n]=true;
   if(B.stage.n===META.unlocked&&META.unlocked<3)META.unlocked++;
 }
 persist();
 $("res-title").textContent=win?"Victory":"Defeat";
 $("res-title").className=win?"win":"lose";
 $("res-sub").textContent=B.stage.name+" · Волн пройдено: "+(win?WAVES:B.wave)+" · Убийств: "+B.kills+" · Время: "+mmss(B.elapsed)+" · 🎴 Карточек взято: "+B.drafts+" · ❤ Базе восстановлено: "+Math.floor(B.totalHealed)+" HP";
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

