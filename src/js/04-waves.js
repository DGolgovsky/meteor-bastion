/* ---------- waves ---------- */
function campaignOpening(stage,wave,elite){
 var n=stage&&stage.n||1,index=Math.max(0,Math.min(3,wave-1));
 if(n<CAMPAIGN_OPENING.startStage)return {bonus:1,spawn:1,recon:false};
 var sectorPressure=Math.min(1,(n-CAMPAIGN_OPENING.startStage+1)/9);
 var spawn=1+CAMPAIGN_OPENING.spawnRamp[index]*sectorPressure;
 if(elite&&wave<4)spawn*=1+(CAMPAIGN_OPENING.eliteCadence-1)*(4-wave)/3;
 return {bonus:CAMPAIGN_OPENING.bonusRamp[index],spawn:spawn,recon:wave===1};
}
function waveEnemyTotal(stage,wave,elite){var opening=campaignOpening(stage,wave,elite);return BALANCE.waveStart+Math.round(wave*BALANCE.waveGrowth)+Math.round(((stage&&stage.n||1)-1)*6*opening.bonus)+(elite?Math.ceil(BALANCE.eliteWaveBase+wave*BALANCE.eliteWaveGrowth):0);}
function startWave(n){
 B.wave=n;B.waveState="fighting";B.bossSpawned=false;
 B.waveTotal=B.waveQueue=waveEnemyTotal(B.stage,n,B.elite);
 B.waveKilled=0;B.spawnT=0.25;B.formationCd=0;B.waveKinds={};B.waveKindCount={};
 B.waveSpecials=0;
 /* the "Wave N / 20" toast at wave start was removed (2026-11-08): the notification under the field
    got in the way; the boss warning in spawnBoss is kept, since it is a separate event */
}
/* Every sector has a specific ecology. Entries are [id,weight,firstWave];
   future castes cannot leak into an early sector through random formations. */
var STAGE_ECOLOGY=[
 {name:"Debris Front",pool:[["meteor",12,1],["fast",7,2],["flyer",3,3],["armored",3,5],["needle",1.4,8]]},
 {name:"Hive Outskirts",pool:[["meteor",7,1],["fast",6,2],["flyer",6,3],["spitter",3,5],["needle",2,9]]},
 {name:"Brood Gardens",pool:[["meteor",6,1],["armored",4,2],["flyer",4,3],["splitter",2.5,4],["healer",1.2,6]]},
 {name:"Acid Marsh",recon:[["meteor",8],["fast",2]],pool:[["meteor",5,1],["fast",3,2],["spitter",8,3],["bulwark",2.5,6],["healer",1,8]]},
 {name:"Needle Passage",recon:[["meteor",6],["fast",4]],pool:[["fast",7,1],["armored",3,2],["flyer",4,3],["needle",7,4],["phase",2,7]]},
 {name:"Brood Furnace",recon:[["meteor",9],["fast",1]],pool:[["meteor",5,1],["armored",5,2],["splitter",4,3],["spitter",4,4],["healer",1.5,6]]},
 {name:"Prism Bloom",recon:[["meteor",7],["fast",3]],pool:[["meteor",4,1],["fast",4,2],["moth",6,3],["needle",5,4],["phase",2,6],["healer",1,8]]},
 {name:"Iron Carapace",recon:[["meteor",8],["fast",2]],pool:[["armored",8,2],["charger",5,2],["bulwark",5,3],["spitter",3,5],["elite",1.5,8]]},
 {name:"Phantom Nebula",recon:[["meteor",6],["fast",4]],pool:[["fast",5,1],["phase",7,2],["moth",5,3],["needle",4,4],["elite",1.5,8]]},
 {name:"Storm Swarm",recon:[["meteor",5],["fast",5]],pool:[["meteor",4,1],["fast",6,2],["flyer",6,2],["needle",6,3],["moth",4,5],["elite",1.8,7]]},
 {name:"Siege Ring",recon:[["meteor",8],["fast",2]],pool:[["armored",6,2],["charger",6,2],["bulwark",5,3],["spitter",5,4],["healer",1.2,6],["elite",1.8,8]]},
 {name:"Queen's Nexus",recon:[["meteor",7],["fast",3]],pool:[["meteor",4,1],["armored",4,2],["charger",5,2],["splitter",3,3],["spitter",4,3],["needle",4,4],["bulwark",3,5],["moth",4,6],["phase",3,7],["healer",1.2,8],["elite",2,9]]}
];
function stageEcology(stage){stage=stage||(B&&B.stage)||STAGES[0];return STAGE_ECOLOGY[Math.max(0,Math.min(STAGE_ECOLOGY.length-1,(stage.n||1)-1))];}
/* Optional arguments make the stage preview use the exact same roster as battle. */
function waveEnemyPool(stage,wave,elite,counts){
 var live=!stage;stage=stage||(B&&B.stage)||STAGES[0];
 if(wave===undefined)wave=live&&B?B.wave:1;
 if(elite===undefined)elite=!!(live&&B&&B.elite);
 counts=counts||(live&&B&&B.waveKindCount)||{};
 var opening=campaignOpening(stage,wave,elite),ecology=stageEcology(stage);
 if(opening.recon)return (ecology.recon||[["meteor",1]]).map(function(x){return [x[0],x[1]];});
 var w=wave+(elite&&!(stage.n>=CAMPAIGN_OPENING.startStage&&wave<=2)?1:0);
 return ecology.pool.filter(function(x){
  return w>=x[2]&&(x[0]!=="healer"||(counts.healer||0)<1)&&
   (x[0]!=="elite"||(counts.elite||0)<2)&&(x[0]!=="splitter"||(counts.splitter||0)<4);
 }).map(function(x){return [x[0],x[1]*(elite&&!METEOR_IDS[x[0]]?1.2:1)];});
}
function wavePickKind(){
 /* Opening card timing remains deterministic: two meteor XP grants, never a scout. */
 if(B.stage.n===1&&B.wave===1&&((B.waveKindCount||{}).meteor||0)<2)return "meteor";
 var pool=waveEnemyPool(),seen=B.waveKinds||{},required=Math.min(pool.length,B.wave>=8?3:B.wave>=3?2:1);
 if(Object.keys(seen).length<required&&B.waveQueue<=B.waveTotal-required+Object.keys(seen).length+1){
  var fresh=pool.filter(function(x){return !seen[x[0]];});if(fresh.length)pool=fresh;
 }
 var total=0;pool.forEach(function(x){total+=x[1];});
 var roll=Math.random()*total;
 for(var i=0;i<pool.length;i++){roll-=pool[i][1];if(roll<=0)return pool[i][0];}
 return pool.length?pool[0][0]:"meteor";
}
function isMeteorEnemy(e){return !!(e&&e.cfg&&METEOR_IDS[e.cfg.id]);}
function enemyAttackProfile(e){return ENEMY_ATTACKS[e.cfg&&e.cfg.id]||ENEMY_ATTACKS[e.kind]||ENEMY_ATTACKS.flyer;}
function initEnemyStation(e){
 if(isMeteorEnemy(e))return;
 var p=enemyAttackProfile(e),seed=Math.sin((e.phase||0)*71.37+(e.x||0)*.17)*43758.5453;seed-=Math.floor(seed);
 if(!Number.isFinite(e.standY))e.standY=BASEY-p.dist[0]-(p.dist[1]-p.dist[0])*seed;
 if(!Number.isFinite(e.standX))e.standX=e.x;
 if(!Number.isFinite(e.attackCd))e.attackCd=.8+seed*1.4;
 if(!Number.isFinite(e.attackCharge))e.attackCharge=0;
 if(!Number.isFinite(e.attackWindup))e.attackWindup=p.windup;
 if(!e.attackState)e.attackState="approach";
 if(!Number.isFinite(e.siegeAge))e.siegeAge=0;
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
 initEnemyStation(B.enemies[B.enemies.length-1]);
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
  var id=mode==="scatter"&&k>0?wavePickKind():mode==="wedge"&&k>0&&waveEnemyPool().some(function(x){return x[0]==="armored";})?"armored":kind;
  if(["boss","healer","elite","splitter"].indexOf(id)>=0)id=kind;
  var x=mode==="scatter"?26+Math.random()*(W-52):mode==="wedge"?cx+(k===0?0:(k%2?1:-1)*Math.ceil(k/2)*28):cx+(Math.random()*2-1)*(20+Math.random()*25);
  var y=mode==="wedge"?-30-Math.ceil(k/2)*26:-30-k*(mode==="scatter"?8:12);
  if(!spawnEnemy(id,{x:x,y:y,speedScale:speedScale,driftDir:dir}))return k;
 }
 return count;
}
function spawnBoss(){
 if(B.enemies.length>=MAX_ENEMIES)return false;
 var cfg=ENEMIES.filter(function(e){return e.id==="boss";})[0];
 var hpMul=B.stage.hpMul*1.1*(1+(B.wave-1)*BALANCE.bossHpGrowth)*(B.elite?BALANCE.eliteBossHp:1)*13.2; /* 2026-11-12, owner order: boss 15x HP (0.88*15), its own number, not the general 5x */
 B.enemies.push({cfg:cfg,kind:"boss",x:W/2,y:-50,hp:cfg.hp*hpMul,maxHp:cfg.hp*hpMul,
  speed:cfg.speed*B.stage.spdMul*(B.elite?1.08:1)*0.25,baseSpeed:cfg.speed*B.stage.spdMul*(B.elite?1.08:1)*0.25, /* 2026-11-12, owner order: boss 75% slower, its own factor, not stacked with the general 25% */
  vx:0,vy:cfg.speed,moveKind:"boss",hoverCd:8,hoverT:0,hoverCount:0,driftDir:1,driftT:5,speedPhase:0,visualScale:1,dmg:cfg.dmg*(B.stage.contactMul||1)*(B.elite?BALANCE.eliteBossContact:1),
  armor:cfg.armor+(B.elite?0.10:0),xp:cfg.xp,r:cfg.r+(B.elite?6:0),color:B.elite?"#df4d9c":cfg.color,
  champion:!!B.elite,eliteMode:B.elite,phase:0,flash:0,slowFactor:1,slowT:0,burnDps:0,burnT:0,dead:false,hasteT:0,auraT:2});
 initEnemyStation(B.enemies[B.enemies.length-1]);
 B.bossSpawns++;SFX.boom();return true;
}

