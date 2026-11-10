/* ---------- waves ---------- */
function startWave(n){
 B.wave=n;B.waveState="fighting";B.bossSpawned=false;
 B.waveTotal=B.waveQueue=BALANCE.waveStart+Math.round(n*BALANCE.waveGrowth)+(B.stage.n-1)*6+(B.elite?Math.ceil(BALANCE.eliteWaveBase+n*BALANCE.eliteWaveGrowth):0);
 B.waveKilled=0;B.spawnT=0.25;B.formationCd=0;B.waveKinds={};B.waveKindCount={};
 B.waveSpecials=0;
 /* the "Wave N / 20" toast at wave start was removed (2026-11-08): the notification under the field
    got in the way; the boss warning in spawnBoss is kept, since it is a separate event */
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
 /* Minimum distinct types from wave 3/8 and capped special support. */
 var counts=B.waveKindCount||{},seen=B.waveKinds||{},distinct=Object.keys(seen).length,required=w>=8?3:w>=3?2:1;
 pool=pool.filter(function(x){return (x[0]!=="healer"||(counts.healer||0)<1)&&(x[0]!=="elite"||(counts.elite||0)<2);});
 if(w>=6&&B.waveQueue<=B.waveTotal/2&&!(counts.healer||0)&&pool.some(function(x){return x[0]==="healer";}))return "healer";
 if(w>=10&&B.waveQueue<=B.waveTotal/2&&!(counts.elite||0)&&pool.some(function(x){return x[0]==="elite";}))return "elite";
 if(distinct<required&&B.waveQueue<=B.waveTotal-required+distinct+1){
  var fresh=pool.filter(function(x){return !seen[x[0]];});if(fresh.length)pool=fresh;
 }
 var tot=0;pool.forEach(function(item){tot+=item[1];});
 var roll=Math.random()*tot;
 for(var i=0;i<pool.length;i++){roll-=pool[i][1];if(roll<=0)return pool[i][0];}
 return "meteor";
}
function spawnEnemy(kind,opts){
 opts=opts||{};
 if(B.enemies.length>=MAX_ENEMIES)return false;
 var cfg=ENEMIES.filter(function(e){return e.id===kind;})[0];
 if(!cfg)return false;
 /* Elite has higher pressure, occasional champions and a forced warning at the beginning
    of the first and every fifth wave; once launched, the champion is an independent foe. */
 var scripted=B.elite&&B.waveQueue===B.waveTotal&&Object.keys(B.waveKindCount||{}).length===0&&(B.wave===1||B.wave%5===0);
 var champion=B.elite&&(scripted||cfg.id==="elite"||Math.random()<Math.min(BALANCE.eliteChampionMaxChance,BALANCE.eliteChampionBaseChance+B.wave*BALANCE.eliteChampionWaveChance));
 var champMul=champion?BALANCE.eliteChampionHp:1;
 var hpMul=B.stage.hpMul*(1+(B.wave-1)*BALANCE.waveHpGrowth)*champMul*BALANCE.enemyHpMul;
 var speed=cfg.speed*B.stage.spdMul*B.enemySpdMul*(0.93+Math.random()*0.18)*0.85*(opts.speedScale||1);
 var spawnR=cfg.r+(champion?2:0);
 var x=opts.x===undefined?26+Math.random()*(W-52):Math.max(spawnR,Math.min(W-spawnR,opts.x));
 x=Math.max(spawnR,Math.min(W-spawnR,x));
 B.enemies.push({cfg:cfg,kind:cfg.kind,x:x,y:opts.y===undefined?-30:opts.y,hp:cfg.hp*hpMul,maxHp:cfg.hp*hpMul,
  speed:speed*(champion?BALANCE.eliteChampionSpeed:1),baseSpeed:speed*(champion?BALANCE.eliteChampionSpeed:1),dmg:cfg.dmg*(["meteor","fast","mini","flyer"].indexOf(cfg.id)>=0?0.8:1)*(B.stage.contactMul||1)*(champion?BALANCE.eliteChampionContact:1),
  armor:Math.min(0.65,cfg.armor+(champion?BALANCE.eliteChampionArmor:0)),xp:cfg.xp,
  r:cfg.r+(champion?2:0),visualScale:.85+Math.random()*.3,color:champion?"#cc65ef":cfg.color,champion:champion,eliteMode:B.elite,
  phase:Math.random()*6.28,flash:0,slowFactor:1,slowT:0,burnDps:0,burnT:0,dead:false,
  moveKind:cfg.id,vx:0,vy:speed,speedPhase:Math.random()*6.28,hoverT:0,hoverCd:3+Math.random()*3,hoverCount:0,driftDir:opts.driftDir||(Math.random()<.5?-1:1),driftT:1.2+Math.random()*.8,
  healT:Math.random()*2,auraT:2+Math.random()*1.5,hasteT:0,cloakT:kind==="phase"?2.0:0,chargeT:kind==="charger"?3:0,chargeMul:1.0,revealedT:0});
 if(champion)B.championsSpawned++;
 B.waveKinds=B.waveKinds||{};B.waveKindCount=B.waveKindCount||{};B.waveKinds[cfg.id]=true;B.waveKindCount[cfg.id]=(B.waveKindCount[cfg.id]||0)+1;
 return true;
}
/* A whole group must fit under the live-enemy cap: never silently drop its tail. */
function spawnWaveGroup(){
 if(B.waveQueue<=0)return 0;
 var count=Math.min(B.waveQueue,3+Math.floor(Math.random()*5));
 if(B.wave<=2)count=Math.min(count,4);
 var mode=B.wave>=8&&Math.random()<.25?"scatter":B.wave>=5&&Math.random()<.3?"wedge":"flock";
 if(mode==="wedge")count=Math.min(count,5);
 var kind=wavePickKind();
 if(["elite","healer","splitter","phase","charger"].indexOf(kind)>=0)return spawnEnemy(kind)?1:0;
 if(B.enemies.length+count>MAX_ENEMIES)return 0;
 var cx=40+Math.random()*(W-80),dir=Math.random()<.5?-1:1,speedScale=.95+Math.random()*.1;
 for(var k=0;k<count;k++){
  var id=mode==="scatter"&&k>0?wavePickKind():mode==="wedge"&&k>0?"armored":kind;
  if(["boss","healer","elite"].indexOf(id)>=0)id=kind;
  var x=mode==="scatter"?26+Math.random()*(W-52):mode==="wedge"?cx+(k===0?0:(k%2?1:-1)*Math.ceil(k/2)*28):cx+(Math.random()*2-1)*(20+Math.random()*25);
  var y=mode==="wedge"?-30-Math.ceil(k/2)*26:-30-k*(mode==="scatter"?8:12);
  if(!spawnEnemy(id,{x:x,y:y,speedScale:speedScale,driftDir:dir}))return k;
 }
 return count;
}
function spawnBoss(){
 if(B.enemies.length>=MAX_ENEMIES)return false;
 var cfg=ENEMIES.filter(function(e){return e.id==="boss";})[0];
 var hpMul=B.stage.hpMul*1.1*(1+(B.wave-1)*BALANCE.bossHpGrowth)*(B.elite?BALANCE.eliteBossHp:1)*0.88;
 B.enemies.push({cfg:cfg,kind:"boss",x:W/2,y:-50,hp:cfg.hp*hpMul,maxHp:cfg.hp*hpMul,
  speed:cfg.speed*B.stage.spdMul*(B.elite?1.08:1),baseSpeed:cfg.speed*B.stage.spdMul*(B.elite?1.08:1),
  vx:0,vy:cfg.speed,moveKind:"boss",hoverCd:8,hoverT:0,hoverCount:0,driftDir:1,driftT:5,speedPhase:0,visualScale:1,dmg:cfg.dmg*(B.stage.contactMul||1)*(B.elite?BALANCE.eliteBossContact:1),
  armor:cfg.armor+(B.elite?0.10:0),xp:cfg.xp,r:cfg.r+(B.elite?6:0),color:B.elite?"#df4d9c":cfg.color,
  champion:!!B.elite,eliteMode:B.elite,phase:0,flash:0,slowFactor:1,slowT:0,burnDps:0,burnT:0,dead:false,hasteT:0,auraT:2});
 B.bossSpawns++;SFX.boom();return true;
}

