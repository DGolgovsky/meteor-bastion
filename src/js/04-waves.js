/* ---------- waves ---------- */
function startWave(n){
 B.wave=n;B.waveState="fighting";B.bossSpawned=false;
 B.waveTotal=B.waveQueue=BALANCE.waveStart+Math.round(n*BALANCE.waveGrowth)+(B.stage.n-1)*2+(B.elite?Math.ceil(BALANCE.eliteWaveBase+n*BALANCE.eliteWaveGrowth):0);
 B.waveKilled=0;B.spawnT=0.25;
 B.waveSpecials=0;
 /* тост «Волна N / 20» при старте волны убран (2026-11-08): уведомление под полем
    мешало; предупреждение о боссе в spawnBoss оставлено — это отдельное событие */
}
function wavePickKind(){
 var w=B.wave,elite=B.elite,pool=[["meteor",elite?7:10]];
 if(w>=2||elite)pool.push(["fast",elite?8:7]);
 if(w>=3||(elite&&w>=2))pool.push(["flyer",elite?5.5:5]);
 if(w>=4||(elite&&w>=2))pool.push(["armored",elite?5:4]);
 if(w>=5||(elite&&w>=3))pool.push(["splitter",elite?3:2.4]);
 if(w>=6||(elite&&w>=4))pool.push(["healer",elite?2.4:1.7]);
 if(w>=6||(B.stage.n>=3&&w>=5)||(elite&&w>=3))pool.push(["elite",elite?3.3:1.5]);
 if((B.stage.n>=4&&w>=3)||(B.stage.n>=2&&w>=11)||(elite&&w>=8))pool.push(["phase",B.stage.n>=6?3.1:1.9]);
 if((B.stage.n>=4&&w>=5)||(B.stage.n>=2&&w>=14)||(elite&&w>=9))pool.push(["charger",B.stage.n>=8?4.0:2.7]);
 if(w>=10)pool.push(["armored",2.3],["elite",elite?2.2:1.2]);
 if(w>=14)pool.push(["healer",1.2],["splitter",1.4]);
 if(w>=18)pool.push(["elite",elite?2.8:1.6],["armored",1.6]);
 var tot=0;pool.forEach(function(item){tot+=item[1];});
 var roll=Math.random()*tot;
 for(var i=0;i<pool.length;i++){roll-=pool[i][1];if(roll<=0)return pool[i][0];}
 return "meteor";
}
function spawnEnemy(kind){
 if(B.enemies.length>=MAX_ENEMIES)return false;
 var cfg=ENEMIES.filter(function(e){return e.id===kind;})[0];
 if(!cfg)return false;
 /* Elite has higher pressure, occasional champions and a forced warning at the beginning
    of the first and every fifth wave; once launched, the champion is an independent foe. */
 var scripted=B.elite&&B.waveQueue===B.waveTotal&&(B.wave===1||B.wave%5===0);
 var champion=B.elite&&(scripted||cfg.id==="elite"||Math.random()<Math.min(BALANCE.eliteChampionMaxChance,BALANCE.eliteChampionBaseChance+B.wave*BALANCE.eliteChampionWaveChance));
 var champMul=champion?BALANCE.eliteChampionHp:1;
 var hpMul=B.stage.hpMul*(1+(B.wave-1)*BALANCE.waveHpGrowth)*champMul;
 var speed=cfg.speed*B.stage.spdMul*B.enemySpdMul*(0.93+Math.random()*0.18);
 var x=26+Math.random()*(W-52);
 B.enemies.push({cfg:cfg,kind:cfg.kind,x:x,y:-30,hp:cfg.hp*hpMul,maxHp:cfg.hp*hpMul,
  speed:speed*(champion?BALANCE.eliteChampionSpeed:1),dmg:cfg.dmg*(B.stage.contactMul||1)*(champion?BALANCE.eliteChampionContact:1),
  armor:Math.min(0.65,cfg.armor+(champion?BALANCE.eliteChampionArmor:0)),xp:cfg.xp,
  r:cfg.r+(champion?2:0),color:champion?"#cc65ef":cfg.color,champion:champion,eliteMode:B.elite,
  phase:Math.random()*6.28,flash:0,slowFactor:1,slowT:0,burnDps:0,burnT:0,dead:false,
  healT:Math.random()*2,auraT:2+Math.random()*1.5,hasteT:0,cloakT:kind==="phase"?2.0:0,chargeT:kind==="charger"?3:0,chargeMul:1.0,revealedT:0});
 if(champion){B.championsSpawned++;if(scripted)toast("⚠ ELITE · Мутировавший противник!");}
 return true;
}
function spawnBoss(){
 if(B.enemies.length>=MAX_ENEMIES)return false;
 var cfg=ENEMIES.filter(function(e){return e.id==="boss";})[0];
 var hpMul=B.stage.hpMul*1.1*(1+(B.wave-1)*BALANCE.bossHpGrowth)*(B.elite?BALANCE.eliteBossHp:1);
 B.enemies.push({cfg:cfg,kind:"boss",x:W/2,y:-50,hp:cfg.hp*hpMul,maxHp:cfg.hp*hpMul,
  speed:cfg.speed*B.stage.spdMul*(B.elite?1.08:1),dmg:cfg.dmg*(B.stage.contactMul||1)*(B.elite?BALANCE.eliteBossContact:1),
  armor:cfg.armor+(B.elite?0.10:0),xp:cfg.xp,r:cfg.r+(B.elite?6:0),color:B.elite?"#df4d9c":cfg.color,
  champion:!!B.elite,eliteMode:B.elite,phase:0,flash:0,slowFactor:1,slowT:0,burnDps:0,burnT:0,dead:false,hasteT:0,auraT:2});
 B.bossSpawns++;toast(B.elite?"⚠ ELITE BOSS «Голиаф»!":"⚠ БОСС «Голиаф»!");SFX.boom();return true;
}

