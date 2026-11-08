/* ==================== STATE + SAVE ==================== */
function allUnitsCfg(){return TURRETS.concat([SOLDIER_CFG]);}
function freshMeta(){
  var m={coins:600,gems:12,energy:30,playerXp:0,wins:0,unlocked:1,selStage:1,music:true,sfx:true,levels:{},mats:{},components:0,elite:false,eliteCleared:{},normalCleared:{},lastPatrol:Date.now(),lastEnergyAt:Date.now()};
  allUnitsCfg().forEach(function(t){m.levels[t.id]=1;m.mats[t.id]=0;});
  return m;
}
var META=freshMeta();
/* ===== Сохранение прогресса: localStorage, схема v1 (явный запрос игрока: прогресс должен переживать перезагрузку) ===== */
var SAVE_KEY="meteor-bastion-save-v1";
function persist(){try{var d={v:1};["coins","gems","energy","components","playerXp","wins","unlocked","selStage","music","sfx","elite","lastPatrol","lastEnergyAt"].forEach(function(k){d[k]=META[k];});d.eliteCleared=META.eliteCleared;d.normalCleared=META.normalCleared;d.levels=META.levels;d.mats=META.mats;localStorage.setItem(SAVE_KEY,JSON.stringify(d));}catch(e){}}
function loadSave(){try{var raw=localStorage.getItem(SAVE_KEY);if(!raw)return;var d=JSON.parse(raw);if(!d||d.v!==1)return;
 ["coins","gems","energy","components","playerXp","wins","unlocked","selStage"].forEach(function(k){if(typeof d[k]==="number"&&isFinite(d[k]))META[k]=d[k];});
 if(typeof d.music==="boolean")META.music=d.music; if(typeof d.sfx==="boolean")META.sfx=d.sfx;
 if(typeof d.elite==="boolean")META.elite=d.elite; if(typeof d.lastPatrol==="number"&&isFinite(d.lastPatrol)&&d.lastPatrol>0)META.lastPatrol=d.lastPatrol;
 if(typeof d.lastEnergyAt==="number"&&isFinite(d.lastEnergyAt)&&d.lastEnergyAt>0)META.lastEnergyAt=d.lastEnergyAt;
 if(d.eliteCleared&&typeof d.eliteCleared==="object")for(var ck in d.eliteCleared){if(/^[123]$/.test(ck)&&d.eliteCleared[ck]===true)META.eliteCleared[ck]=true;}
 if(d.normalCleared&&typeof d.normalCleared==="object")for(var nk in d.normalCleared){if(/^[123]$/.test(nk)&&d.normalCleared[nk]===true)META.normalCleared[nk]=true;}
 META.energy=Math.max(0,Math.min(30,META.energy));META.unlocked=Math.max(1,Math.min(3,META.unlocked));META.selStage=Math.max(1,Math.min(3,META.selStage));
 if(d.levels)allUnitsCfg().forEach(function(t){var v=d.levels[t.id];if(typeof v==="number"&&v>=1)META.levels[t.id]=Math.min(45,Math.floor(v));});
 if(d.mats)allUnitsCfg().forEach(function(t){var v=d.mats[t.id];if(typeof v==="number"&&v>=0)META.mats[t.id]=Math.floor(v);});
}catch(e){}}
loadSave();
function totalCritBonus(){var s=0;allUnitsCfg().forEach(function(t){s+=(Math.min(45,META.levels[t.id])-1)*3;});return Math.min(180,s);}
function upCost(t){var lv=META.levels[t.id];return{mats:14+lv*9,coins:70+lv*30};}
function refillEnergy(){var now=Date.now();if(!META.lastEnergyAt)META.lastEnergyAt=now;
 if(META.energy>=30){META.energy=30;META.lastEnergyAt=now;return;}
 var ticks=Math.floor(Math.max(0,now-META.lastEnergyAt)/720000);
 if(ticks>0){META.energy=Math.min(30,META.energy+ticks);META.lastEnergyAt=META.energy===30?now:META.lastEnergyAt+ticks*720000;persist();}
}
function fmt(n){n=Math.floor(n);if(n>=1e6)return(n/1e6).toFixed(2)+"m";if(n>=1e4)return(n/1e3).toFixed(1)+"k";return ""+n;}
function $(id){return document.getElementById(id);}
function toast(msg){var t=$("toast");t.textContent=msg;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove("on");},2400);}

/* ==================== AUDIO ==================== */
var AC=null;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==="suspended")AC.resume();return AC;}
function beep(f,dur,type,vol,slide){if(!META.sfx)return;var c=ac();if(!c)return;var o=c.createOscillator(),g=c.createGain();o.type=type||"square";o.frequency.value=f;if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),c.currentTime+dur);g.gain.setValueAtTime(vol||0.05,c.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+dur);}
var SFX={
 shoot:function(){beep(720,0.06,"square",0.016);},
 laser:function(){beep(1180,0.09,"sawtooth",0.012);},
 zap:function(){beep(180,0.12,"sawtooth",0.028,-120);},
 hit:function(){beep(240,0.05,"triangle",0.018);},
 boom:function(){beep(90,0.28,"sawtooth",0.055,-50);},
 levelup:function(){beep(520,0.12,"square",0.05);setTimeout(function(){beep(780,0.12,"square",0.05);},110);setTimeout(function(){beep(1040,0.2,"square",0.05);},220);},
 pick:function(){beep(660,0.1,"triangle",0.05);},
 win:function(){[523,659,784,1046].forEach(function(f,i){setTimeout(function(){beep(f,0.22,"triangle",0.06);},i*140);});},
 lose:function(){[400,320,240,160].forEach(function(f,i){setTimeout(function(){beep(f,0.25,"sawtooth",0.05);},i*160);});}
};
var musicTimer=null;
function startMusic(){stopMusic();if(!META.music)return;var notes=[110,110,130.8,98];var i=0;musicTimer=setInterval(function(){if(!META.music)return;var c=ac();if(!c)return;var o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=notes[i%notes.length];g.gain.setValueAtTime(0.032,c.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+0.42);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.45);i++;},460);}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}}

/* ==================== NAV / META UI ==================== */
function show(name){
 ["home","turrets","settings","battle"].forEach(function(s){$("scr-"+s).classList.toggle("on",s===name);});
 document.querySelectorAll(".nav button").forEach(function(b){b.classList.toggle("on",b.dataset.nav===name);});
 if(name==="home")renderHome(); if(name==="turrets")renderTurrets();
 window.scrollTo(0,0);
 /* канвас виден только на экране боя — его CSS-ширина известна лишь после показа */
 if(name==="battle")requestAnimationFrame(fitCanvas);
}
document.querySelectorAll("[data-nav]").forEach(function(b){b.addEventListener("click",function(){show(b.dataset.nav);});});
function curHTML(){return '<span class="resource-item gold"><span class="currency-icon">●</span><b>'+fmt(META.coins)+'</b></span>'+
 '<span class="resource-item gem"><span class="currency-icon">◆</span><b>'+fmt(META.gems)+'</b></span>'+
 '<span class="resource-item energy"><span class="currency-icon">ϟ</span><b>'+META.energy+'/30</b></span>'+
 '<span class="resource-item parts"><span class="currency-icon">⬡</span><b>'+fmt(META.components)+'</b></span>';}
function bindTop(){ /* Debug top-up buttons are deliberately removed from release UI. */ }
function bindTops(){bindTop($("home-cur"));bindTop($("tur-cur"));}
var INTEL=[
 "Разведка: метеориты слабы к физ. урону и держат огонь; бронированные почти не берут физ. — бей электричеством.",
 "Разведка: летуны уязвимы к электричеству; с 5-й волны — големы-матки (делятся при гибели), с 6-й — звёзды регенерации (лечат соседей).",
 "Разведка: элитки держат энергию, но слабы к силовому полю; босс устойчив к огню и физ. урону."
];
function patrolAccrued(){var h=(Date.now()-META.lastPatrol)/3600000;return Math.floor(Math.min(8,h)*25*(1+META.unlocked*0.5));}
function renderHome(){
 refillEnergy();
 $("home-cur").innerHTML=curHTML();
 var accountLv=1+Math.floor(META.playerXp/100),stage=STAGES[META.selStage-1],elite=META.elite;
 $("prof-line").textContent="Командир · Ур. "+accountLv+" · Побед "+META.wins;
 $("home-stage-title").textContent=(elite?"ELITE":"NORMAL")+" STAGE "+stage.n;
 $("scr-home").classList.toggle("elite-mode",elite);
 $("hq-scene").classList.toggle("elite-mode",elite);
 $("btn-normal").classList.toggle("selected",!elite);
 $("btn-elite").classList.toggle("selected",elite);
 $("stage-prev").disabled=META.selStage<=1;
 $("stage-next").disabled=META.selStage>=META.unlocked;
 $("scene-stage-num").textContent=("0"+stage.n).slice(-2)+" / "+("0"+STAGES.length).slice(-2);
 var clearMap=elite?META.eliteCleared:META.normalCleared;
 $("scene-stage-status").textContent=clearMap[stage.n]?"✓ ПРОЙДЕН":elite?"⚠ ЭЛИТНАЯ УГРОЗА":"ЭТАП ДОСТУПЕН";
 $("stage-brief").textContent=elite?"Элитные враги • усиленные волны":"Метеоритный шторм • 20 волн";
 $("stage-risk").textContent=elite?"ELITE ×"+BALANCE.eliteHp+" HP":"NORMAL";
 var waveCount=BALANCE.waveStart+Math.round(BALANCE.waveGrowth*1)+(stage.n-1)*2+(elite?Math.ceil(BALANCE.eliteWaveBase+BALANCE.eliteWaveGrowth):0);
 $("stage-metrics").innerHTML='<span class="hq-metric">⚔ <b>20</b> волн</span>'+
 '<span class="hq-metric">▣ <b>'+waveCount+'</b> в первой</span>'+
 '<span class="hq-metric">✦ <b>'+(elite?"×1.6":"×1.0")+'</b> награды</span>';
 var pa=patrolAccrued();
 $("btn-patrol").innerHTML='<span class="hq-action-ico">◉</span><span>Автопатруль</span><span style="font-size:10px;color:#f6d078">'+pa+' ⬤</span>';
 $("btn-patrol").disabled=pa<=0;
 $("btn-start").innerHTML="BATTLE <small>ϟ5</small>";
 $("battle-energy-note").textContent=elite?"⚠ Элитные враги · 5 энергии":"Обычный этап · 5 энергии";
}
function setGameMode(elite){
 if(META.elite===elite)return;
 META.elite=elite;persist();SFX.pick();renderHome();
}
$("btn-normal").addEventListener("click",function(){setGameMode(false);});
$("btn-elite").addEventListener("click",function(){setGameMode(true);});
function stepStage(delta){
 var next=Math.max(1,Math.min(META.unlocked,META.selStage+delta));
 if(next===META.selStage)return;
 META.selStage=next;persist();SFX.pick();renderHome();
}
$("stage-prev").addEventListener("click",function(){stepStage(-1);});
$("stage-next").addEventListener("click",function(){stepStage(1);});
$("btn-profile").addEventListener("click",function(){show("turrets");});
function openStageInfo(){
 var st=STAGES[META.selStage-1],mode=META.elite?"Elite":"Normal",clear=META.elite?META.eliteCleared:META.normalCleared;
 $("stage-info-title").textContent=mode+" Stage "+st.n;
 $("stage-info-sub").textContent=INTEL[st.n-1];
 $("stage-info-body").innerHTML='<div class="hq-stage-info-cell"><span>ВОЛНЫ</span><b>20 · БОСС</b>Враг атакует крепость сверху</div>'+
 '<div class="hq-stage-info-cell"><span>РЕЖИМ</span><b>'+mode.toUpperCase()+'</b>'+(META.elite?"Чемпионы, ускоряющие союзников":"Стандартные составы волн")+'</div>'+
 '<div class="hq-stage-info-cell"><span>СТАТУС</span><b>'+(clear[st.n]?"ПРОЙДЕН":"НЕ ПРОЙДЕН")+'</b>Сохраняется на устройстве</div>'+
 '<div class="hq-stage-info-cell"><span>НАГРАДЫ</span><b>'+(META.elite?"×1.6":"×1")+'</b>При победе или поражении</div>';
 $("ov-stage-info").classList.add("on");
}
$("btn-stage-chest").addEventListener("click",openStageInfo);
$("btn-home-info").addEventListener("click",openStageInfo);
$("btn-close-stage-info").addEventListener("click",function(){$("ov-stage-info").classList.remove("on");});
$("btn-patrol").addEventListener("click",function(){var pa=patrolAccrued();if(pa<=0)return;META.coins+=pa;META.lastPatrol=Date.now();persist();SFX.pick();toast("Авто-патруль привёз "+pa+" монет");renderHome();bindTops();});
function renderTurrets(){refillEnergy();
 $("tur-cur").innerHTML=curHTML();
 $("bonus-bar").innerHTML='<div class="upgrade-stat"><span>ПОСТОЯННЫЕ УСИЛЕНИЯ</span><b>CRIT DMG +'+totalCritBonus()+'%</b><small>Урон +8% / уровень · CD и эффекты по этапам</small></div>';
 var g=$("tgrid");g.innerHTML="";
 allUnitsCfg().forEach(function(t){
   var lv=META.levels[t.id],c=upCost(t),can=lv<45&&META.mats[t.id]>=c.mats&&META.coins>=c.coins;
   var d=document.createElement("div");d.className="tcard"+(t.id==="soldier"?" soldier":"");
   d.innerHTML=(can?'<span class="avail"></span>':"")+'<div class="tic">'+t.icon+'</div><div class="tn">'+t.name+'</div>'+
    '<div class="tl">Lv. '+lv+'</div><div class="dmg">DMG '+Math.round(t.damage*metaDamage(lv))+' · '+t.dmgType+'</div>'+
    '<div class="dmg">CD −'+Math.round((1-metaCooldown(lv))*100)+'% · '+secondaryName(t.id)+' ×'+metaSecondary(lv).toFixed(1)+'</div>'+
     '<div class="prog"><i style="width:'+Math.min(100,META.mats[t.id]/c.mats*100)+'%"></i></div>'+
    '<div class="mats">🔩 '+META.mats[t.id]+' / '+c.mats+' · 🪙 '+c.coins+'</div>'+
    '<button class="btn up">'+(lv>=45?"MAX Lv.45":"⬆ Улучшить")+'</button>';
   var btn=d.querySelector(".up");
   if(!can)btn.disabled=true;
   btn.addEventListener("click",function(){
     if(META.levels[t.id]>=45||META.mats[t.id]<c.mats||META.coins<c.coins)return;
     META.mats[t.id]-=c.mats;META.coins-=c.coins;META.levels[t.id]++;persist();SFX.pick();toast(t.name+" → Lv. "+META.levels[t.id]);renderTurrets();bindTops();
   });
   g.appendChild(d);
 });
}
function syncToggles(){$("tgl-music").classList.toggle("on",META.music);$("tgl-sfx").classList.toggle("on",META.sfx);}
$("tgl-music").addEventListener("click",function(){META.music=!META.music;persist();syncToggles();if(META.music)startMusic();else stopMusic();});
$("tgl-sfx").addEventListener("click",function(){META.sfx=!META.sfx;persist();syncToggles();});
var resetArm=false;
$("btn-reset").addEventListener("click",function(){
 if(!resetArm){resetArm=true;$("btn-reset").textContent="Точно сбросить?";setTimeout(function(){resetArm=false;$("btn-reset").textContent="Сброс";},3000);return;}
 META=freshMeta();persist();resetArm=false;$("btn-reset").textContent="Сброс";syncToggles();toast("Прогресс сброшен");show("home");
});

