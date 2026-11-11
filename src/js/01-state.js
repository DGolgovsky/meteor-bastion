/* ==================== STATE + SAVE ==================== */
function allUnitsCfg(){return TURRETS.concat([SOLDIER_CFG]);}
function freshMeta(){
  var m={coins:600,gems:12,energy:30,playerXp:0,wins:0,unlocked:1,selStage:1,music:true,sfx:true,levels:{},mats:{},components:0,chips:{core:0,speed:0,fort:0},livery:"classic",elite:false,eliteCleared:{},normalCleared:{},lastPatrol:Date.now(),lastEnergyAt:Date.now()};
  allUnitsCfg().forEach(function(t){m.levels[t.id]=1;m.mats[t.id]=0;});
  return m;
}
var META=freshMeta();
/* ===== Progress saving: localStorage, schema v1 (explicit player request: progress must survive a reload) ===== */
var SAVE_KEY="meteor-bastion-save-v1";
function persist(){try{var d={v:1};["coins","gems","energy","components","playerXp","wins","unlocked","selStage","music","sfx","elite","lastPatrol","lastEnergyAt"].forEach(function(k){d[k]=META[k];});d.chips=META.chips;d.livery=META.livery;d.eliteCleared=META.eliteCleared;d.normalCleared=META.normalCleared;d.levels=META.levels;d.mats=META.mats;localStorage.setItem(SAVE_KEY,JSON.stringify(d));}catch(e){}}
function loadSave(){try{var raw=localStorage.getItem(SAVE_KEY);if(!raw)return;var d=JSON.parse(raw);if(!d||d.v!==1)return;
 ["coins","gems","energy","components","playerXp","wins","unlocked","selStage"].forEach(function(k){if(typeof d[k]==="number"&&isFinite(d[k]))META[k]=d[k];});
 if(d.chips&&typeof d.chips==="object")["core","speed","fort"].forEach(function(k){var n=d.chips[k];if(typeof n==="number"&&isFinite(n))META.chips[k]=Math.max(0,Math.min(5,Math.floor(n)));});
 if(["classic","arctic","ember"].includes(d.livery))META.livery=d.livery;
 if(typeof d.music==="boolean")META.music=d.music; if(typeof d.sfx==="boolean")META.sfx=d.sfx;
 if(typeof d.elite==="boolean")META.elite=d.elite; if(typeof d.lastPatrol==="number"&&isFinite(d.lastPatrol)&&d.lastPatrol>0)META.lastPatrol=d.lastPatrol;
 if(typeof d.lastEnergyAt==="number"&&isFinite(d.lastEnergyAt)&&d.lastEnergyAt>0)META.lastEnergyAt=d.lastEnergyAt;
 if(d.eliteCleared&&typeof d.eliteCleared==="object")for(var ck in d.eliteCleared){if(+ck>=1&&+ck<=STAGES.length&&d.eliteCleared[ck]===true)META.eliteCleared[ck]=true;}
 if(d.normalCleared&&typeof d.normalCleared==="object")for(var nk in d.normalCleared){if(+nk>=1&&+nk<=STAGES.length&&d.normalCleared[nk]===true)META.normalCleared[nk]=true;}
 META.energy=Math.max(0,Math.min(30,META.energy));META.unlocked=Math.max(1,Math.min(STAGES.length,META.unlocked));META.selStage=Math.max(1,Math.min(META.unlocked,META.selStage));
 if(d.levels)allUnitsCfg().forEach(function(t){var v=d.levels[t.id];if(typeof v==="number"&&v>=1)META.levels[t.id]=Math.min(45,Math.floor(v));});
 if(d.mats)allUnitsCfg().forEach(function(t){var v=d.mats[t.id];if(typeof v==="number"&&v>=0)META.mats[t.id]=Math.floor(v);});
}catch(e){}}
loadSave();
function totalCritBonus(){var s=0;allUnitsCfg().forEach(function(t){s+=(Math.min(45,META.levels[t.id])-1)*3;});return Math.min(100,s);}
function upCost(t){var lv=META.levels[t.id];return{mats:14+lv*9,coins:70+lv*30};}
var CHIP_DEFS=[
 {id:"core",name:"Turret Amplifier",icon:"◆",desc:"Turret damage +3% per level",max:5},
 {id:"speed",name:"Chrono Module",icon:"✧",desc:"Fire rate +2% per level",max:5},
 {id:"fort",name:"Fortress Reserve",icon:"⬡",desc:"+40 max base HP per level",max:5}
];
function chipCost(id){return 4+(META.chips[id]||0)*4;}
function purchaseChip(id){
 var def=CHIP_DEFS.find(function(c){return c.id===id;}),cost=chipCost(id);
 if(!def||META.chips[id]>=def.max||META.components<cost)return false;
 META.components-=cost;META.chips[id]++;persist();SFX.pick();renderTurrets();return true;
}
function renderChips(){
 var grid=$("chip-grid");grid.innerHTML="";
 CHIP_DEFS.forEach(function(def){
  var lv=META.chips[def.id],cost=chipCost(def.id),can=lv<def.max&&META.components>=cost;
  var card=document.createElement("div");card.className="chip-card";
  card.innerHTML='<strong>'+def.icon+' '+def.name+'</strong><span>Lv. '+lv+' / '+def.max+'</span><small>'+def.desc+'</small>'+
    '<button class="btn" '+(can?'':'disabled')+'>'+(lv>=def.max?'MAX LV.':'⬡ '+cost+' components')+'</button>';
  card.querySelector("button").addEventListener("click",function(){purchaseChip(def.id);});grid.appendChild(card);
 });
}
function setLivery(id){
 if(!["classic","arctic","ember"].includes(id)||META.livery===id)return false;
 META.livery=id;persist();syncToggles();SFX.pick();return true;
}
function rdTierUnlock(id){return {skyguard:14,laser:10,disruption:18,aeroblast:10,thunder:18,beam:18,firewheel:10,hive:18,railgun:14,tesla:18,gravity:10,soldier:18}[id]||18;}
function rdTierName(level){return level>=22?"T3/Combo":level>=14?"Breakthrough":level>=10?"T3":level>=6?"T2":level>=2?"T1":"BASIC";}

function refillEnergy(){var now=Date.now();if(!META.lastEnergyAt)META.lastEnergyAt=now;
 if(META.energy>=30){META.energy=30;META.lastEnergyAt=now;return;}
 var ticks=Math.floor(Math.max(0,now-META.lastEnergyAt)/720000);
 if(ticks>0){META.energy=Math.min(30,META.energy+ticks);META.lastEnergyAt=META.energy===30?now:META.lastEnergyAt+ticks*720000;persist();}
}
function fmt(n){n=Math.floor(n);if(n>=1e6)return(n/1e6).toFixed(2)+"m";if(n>=1e4)return(n/1e3).toFixed(1)+"k";return ""+n;}
function $(id){return document.getElementById(id);}

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
 /* the canvas is visible only on the battle screen; its CSS width is known only after it is shown */
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
 "Intel: meteors are weak to physical damage and resist fire; armored ones barely take physical damage, so hit them with electricity.",
 "Intel: insects stop above the fortress and charge ranged attacks. Shoot down their ammunition or interrupt the shooter with control effects.",
 "Intel: each stage has its own hive castes. Needle Wasps fire from afar; Shell Beetles approach close. Only meteors hit the deck."
];
function patrolAccrued(){var h=(Date.now()-META.lastPatrol)/3600000;return Math.floor(Math.min(8,h)*25*(1+META.unlocked*0.5));}
function renderHome(){
 refillEnergy();
 $("home-cur").innerHTML=curHTML();
 var accountLv=1+Math.floor(META.playerXp/100),stage=STAGES[META.selStage-1],elite=META.elite;
 $("prof-line").textContent="Commander · Lv. "+accountLv+" · Wins "+META.wins;
 $("home-stage-title").textContent=(elite?"ELITE":"NORMAL")+" STAGE "+stage.n;
 $("scr-home").classList.toggle("elite-mode",elite);
 $("hq-scene").classList.toggle("elite-mode",elite);
 $("btn-normal").classList.toggle("selected",!elite);
 $("btn-elite").classList.toggle("selected",elite);
 $("stage-prev").disabled=META.selStage<=1;
 $("stage-next").disabled=META.selStage>=META.unlocked;
 $("scene-stage-num").textContent=("0"+stage.n).slice(-2)+" / "+("0"+STAGES.length).slice(-2);
 var clearMap=elite?META.eliteCleared:META.normalCleared;
 $("scene-stage-status").textContent=clearMap[stage.n]?"✓ CLEARED":elite?"⚠ ELITE THREAT":"STAGE AVAILABLE";
 $("stage-brief").textContent=(elite?"Elite · ":"")+stage.desc;
 $("stage-risk").textContent=elite?"ELITE ×"+BALANCE.eliteHp+" HP":"NORMAL";
 var waveCount=waveEnemyTotal(stage,1,elite);
 $("stage-metrics").innerHTML='<span class="hq-metric">⚔ <b>'+stageWaves(stage)+'</b> waves</span>'+
 '<span class="hq-metric">▣ <b>'+waveCount+'</b> in wave 1</span>'+
 '<span class="hq-metric">✦ <b>'+(elite?"×1.6":"×1.0")+'</b> rewards</span>';
 var pa=patrolAccrued();
 $("btn-patrol").innerHTML='<span class="hq-action-ico">◉</span><span>Auto-patrol</span><span style="font-size:10px;color:#f6d078">'+pa+' ⬤</span>';
 $("btn-patrol").disabled=pa<=0;
 $("btn-start").innerHTML="BATTLE <small>ϟ5</small>";
 $("battle-energy-note").textContent=elite?"⚠ Elite enemies · 5 energy":"Normal stage · 5 energy";
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
 $("stage-info-sub").textContent=st.desc;
 var roster=[],seen={};
 for(var wave=1;wave<=stageWaves(st);wave++)waveEnemyPool(st,wave,META.elite,{}).forEach(function(entry){
  if(seen[entry[0]])return;seen[entry[0]]=1;
  var cfg=ENEMIES.find(function(e){return e.id===entry[0];});roster.push(cfg.name+' · W'+wave);
 });
 $("stage-info-body").innerHTML='<div class="hq-stage-info-cell"><span>WAVES</span><b>'+stageWaves(st)+' · BOSS</b>Meteor impacts + insect artillery</div>'+
 '<div class="hq-stage-info-cell"><span>MODE</span><b>'+mode.toUpperCase()+'</b>'+(META.elite?"Champions that speed up their allies":"Standard wave compositions")+'</div>'+
 '<div class="hq-stage-info-cell"><span>STATUS</span><b>'+(clear[st.n]?"CLEARED":"NOT CLEARED")+'</b>Saved on this device</div>'+
 '<div class="hq-stage-info-cell"><span>REWARDS</span><b>'+(META.elite?"×1.6":"×1")+'</b>On victory or defeat</div>'+
 '<div class="hq-stage-info-cell" style="grid-column:1/-1"><span>ENEMY CASTES</span><b>'+STAGE_ECOLOGY[st.n-1].name+'</b>'+roster.join(' / ')+'</div>';
 $("ov-stage-info").classList.add("on");
}
$("btn-stage-chest").addEventListener("click",openStageInfo);
$("btn-home-info").addEventListener("click",openStageInfo);
$("btn-close-stage-info").addEventListener("click",function(){$("ov-stage-info").classList.remove("on");});
$("btn-patrol").addEventListener("click",function(){var pa=patrolAccrued();if(pa<=0)return;META.coins+=pa;META.lastPatrol=Date.now();persist();SFX.pick();renderHome();bindTops();});
function renderTurrets(){refillEnergy();
 $("tur-cur").innerHTML=curHTML();renderChips();
 $("bonus-bar").innerHTML='<div class="upgrade-stat"><span>PERMANENT BOOSTS</span><b>CRIT DMG +'+totalCritBonus()+'%</b><small>Damage +8% / level · CD and effects by tier</small></div>';
 var g=$("tgrid");g.innerHTML="";
 allUnitsCfg().forEach(function(t){
   var lv=META.levels[t.id],c=upCost(t),can=lv<45&&META.mats[t.id]>=c.mats&&META.coins>=c.coins;
   var d=document.createElement("div");d.className="tcard"+(t.id==="soldier"?" soldier":"");
   d.innerHTML=(can?'<span class="avail"></span>':"")+'<div class="tic">'+t.icon+'</div><div class="tn">'+t.name+'</div>'+
    '<div class="tl">R&D Lv. '+lv+' · '+rdTierName(lv)+'</div><div class="dmg">DMG '+Math.round(t.damage*metaDamage(lv))+' · '+t.dmgType+'</div>'+
    '<div class="dmg">CD −'+Math.round((1-metaCooldown(lv))*100)+'% · '+secondaryName(t.id)+' ×'+metaSecondary(lv).toFixed(1)+'</div>'+
     '<div class="prog"><i style="width:'+Math.min(100,META.mats[t.id]/c.mats*100)+'%"></i></div>'+
    '<div class="mats">🔩 '+META.mats[t.id]+' / '+c.mats+' · 🪙 '+c.coins+'</div>'+
    '<button class="btn up">'+(lv>=45?"MAX Lv.45":"⬆ Upgrade")+'</button>';
   var btn=d.querySelector(".up");
   if(!can)btn.disabled=true;
   btn.addEventListener("click",function(){
     if(META.levels[t.id]>=45||META.mats[t.id]<c.mats||META.coins<c.coins)return;
     META.mats[t.id]-=c.mats;META.coins-=c.coins;META.levels[t.id]++;persist();SFX.pick();renderTurrets();bindTops();
   });
   g.appendChild(d);
 });
}
function syncToggles(){
 $("tgl-music").classList.toggle("on",META.music);$("tgl-sfx").classList.toggle("on",META.sfx);
 ["classic","arctic","ember"].forEach(function(id){$("livery-"+id).classList.toggle("selected",META.livery===id);});
}
["classic","arctic","ember"].forEach(function(id){$("livery-"+id).addEventListener("click",function(){setLivery(id);});});
$("tgl-music").addEventListener("click",function(){META.music=!META.music;persist();syncToggles();if(META.music)startMusic();else stopMusic();});
$("tgl-sfx").addEventListener("click",function(){META.sfx=!META.sfx;persist();syncToggles();});
var resetArm=false;
$("btn-reset").addEventListener("click",function(){
 if(!resetArm){resetArm=true;$("btn-reset").textContent="Really reset?";setTimeout(function(){resetArm=false;$("btn-reset").textContent="Reset";},3000);return;}
 META=freshMeta();persist();resetArm=false;$("btn-reset").textContent="Reset";syncToggles();show("home");
});

