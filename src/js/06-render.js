/* ---------- draw ---------- */
function drawUnit(t){
 var col=t.cfg.color,id=t.cfg.id;
 t.recoil=Math.max(0,(t.recoil||0)-1.1);
 ctx.save();ctx.translate(t.x,t.y);
 ctx.scale(0.88,0.88); /* турели и солдат чуть меньше; подпись уровня ниже — вне save/restore, не масштабируется */
 /* посадочная платформа, на которой СТОИТ установка */
 ctx.fillStyle="#0c1626";ctx.strokeStyle="rgba(120,160,190,.45)";ctx.lineWidth=1;
 ctx.beginPath();ctx.ellipse(0,13,21,5.5,0,0,6.29);ctx.fill();ctx.stroke();
 ctx.fillStyle=col;ctx.globalAlpha=.5;ctx.fillRect(-16,11.6,32,1.6);ctx.globalAlpha=1;
 function head(px,py,fn){ctx.save();ctx.translate(px,py);ctx.rotate(t.angle+Math.PI/2);fn();ctx.restore();}
 function stand(w1,w2,h){ctx.fillStyle="#182a42";ctx.strokeStyle=col;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-w1,12);ctx.lineTo(w1,12);ctx.lineTo(w2,12-h);ctx.lineTo(-w2,12-h);ctx.closePath();ctx.fill();ctx.stroke();}
 if(t.isSoldier){
   /* стоящий солдат: ноги, торс, голова в каске; винтовка поворачивается к цели с отдачей */
   ctx.strokeStyle="#2b3f57";ctx.lineWidth=3.4;ctx.lineCap="round";
   ctx.beginPath();ctx.moveTo(-3,1);ctx.lineTo(-4.5,12);ctx.moveTo(3,1);ctx.lineTo(4.5,12);ctx.stroke();
   ctx.fillStyle="#1e4034";ctx.fillRect(-6.5,-9,13,11);
   ctx.fillStyle="#2ee6c8";ctx.fillRect(-6.5,-9,13,2.4);
   ctx.fillStyle="#d9b380";ctx.beginPath();ctx.arc(0,-13.5,4.8,0,6.29);ctx.fill();
   ctx.fillStyle="#476b2a";ctx.beginPath();ctx.arc(0,-14.5,5.6,Math.PI,0);ctx.fill();ctx.fillRect(-6.4,-14.8,12.8,1.8);
   ctx.save();ctx.translate(3,-6);ctx.rotate(t.angle);
   ctx.strokeStyle="#0d1420";ctx.lineWidth=3.6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(13-t.recoil*0.7,0);ctx.stroke();
   ctx.strokeStyle="#5b7a8c";ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(6-t.recoil*0.7,0);ctx.lineTo(17-t.recoil*0.7,0);ctx.stroke();
   ctx.restore();
 }else if(id==="skyguard"){
   /* ракетная установка: пакет из 4 труб с ракетами на поворотной раме */
   stand(11,7,10);
   head(0,-6,function(){var r=t.recoil*0.6;
     ctx.fillStyle="#22344e";ctx.strokeStyle=col;ctx.lineWidth=1.3;ctx.fillRect(-11,-13+r,22,13);ctx.strokeRect(-11,-13+r,22,13);
     ctx.fillStyle="#0a101c";
     [-8.2,-2.8,2.8,8.2].forEach(function(tx){ctx.beginPath();ctx.arc(tx,-6.5+r,2.3,0,6.29);ctx.fill();});
     ctx.fillStyle="#ff5470";
     [-8.2,-2.8,2.8,8.2].forEach(function(tx){ctx.beginPath();ctx.moveTo(tx,-12.5+r);ctx.lineTo(tx+1.6,-9+r);ctx.lineTo(tx-1.6,-9+r);ctx.closePath();ctx.fill();});
     ctx.fillStyle=col;ctx.fillRect(-11,-1.5+r,22,1.6);});
 }else if(id==="laser"){
   ctx.fillStyle="#182a42";ctx.strokeStyle=col;ctx.lineWidth=1.3;
   ctx.fillRect(-2.2,-14,4.4,26);ctx.strokeRect(-2.2,-14,4.4,26);
   ctx.beginPath();ctx.moveTo(-9,12);ctx.lineTo(0,-8);ctx.lineTo(9,12);ctx.stroke();
   head(0,-14,function(){ctx.fillStyle="#0d2c1e";ctx.fillRect(-1.6,-9,3.2,8);
     ctx.save();ctx.shadowColor="#4ade80";ctx.shadowBlur=9;ctx.fillStyle="#4ade80";
     ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(4.4,-10);ctx.lineTo(0,-3);ctx.lineTo(-4.4,-10);ctx.closePath();ctx.fill();ctx.restore();});
 }else if(id==="disruption"){
   var bob=Math.sin(B.t*3+t.x)*1.6;
   ctx.strokeStyle="rgba(56,200,255,.35)";ctx.beginPath();ctx.ellipse(0,12,13,3.4,0,0,6.29);ctx.stroke();
   ctx.save();ctx.translate(0,-15+bob);
   ctx.fillStyle="#16283e";ctx.strokeStyle=col;ctx.lineWidth=1.4;
   ctx.beginPath();ctx.ellipse(0,0,12,6,0,0,6.29);ctx.fill();ctx.stroke();
   ctx.fillStyle="rgba(56,200,255,.85)";ctx.beginPath();ctx.ellipse(0,-2.4,5.5,3,0,Math.PI,0);ctx.fill();
   ctx.strokeStyle=col;var rp=Math.sin(B.t*24)*7;
   ctx.beginPath();ctx.moveTo(-16,-4);ctx.lineTo(-9+rp,-4);ctx.moveTo(16,-4);ctx.lineTo(9-rp,-4);ctx.stroke();
   ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,5,2,0,6.29);ctx.fill();
   ctx.restore();
 }else if(id==="aeroblast"){
   stand(11,8,10);
   ctx.fillStyle="#16283e";ctx.strokeStyle=col;ctx.lineWidth=1.6;
   ctx.beginPath();ctx.arc(0,-8,10.5,0,6.29);ctx.fill();ctx.stroke();
   ctx.strokeStyle="#7dd7ff";ctx.lineWidth=2;
   for(var fb=0;fb<3;fb++){var fa=B.t*7+fb*2.09;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(Math.cos(fa)*8,-8+Math.sin(fa)*8);ctx.stroke();}
   head(0,-8,function(){ctx.fillStyle="#0d2233";ctx.beginPath();ctx.moveTo(-3.4,-8);ctx.lineTo(3.4,-8);ctx.lineTo(1.8,1);ctx.lineTo(-1.8,1);ctx.closePath();ctx.fill();});
 }else if(id==="thunder"){
   stand(11,7,13);
   ctx.strokeStyle=col;ctx.lineWidth=2.6;ctx.lineCap="round";
   ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(-6,-20);ctx.moveTo(6,0);ctx.lineTo(6,-20);ctx.stroke();
   ctx.save();ctx.shadowColor="#c084fc";ctx.shadowBlur=8;ctx.fillStyle="#e9d5ff";
   ctx.beginPath();ctx.arc(-6,-22,3.2,0,6.29);ctx.arc(6,-22,3.2,0,6.29);ctx.fill();ctx.restore();
   if(Math.random()<0.35){ctx.strokeStyle="rgba(216,180,254,.9)";ctx.lineWidth=1.2;ctx.beginPath();var zx=-6;ctx.moveTo(-6,-22);while(zx<5){zx+=3+Math.random()*3;ctx.lineTo(zx,-22+(Math.random()*6-3));}ctx.lineTo(6,-22);ctx.stroke();}
 }else if(id==="beam"){
   stand(13,9,13);
   head(0,-3,function(){ctx.fillStyle="#1d3049";ctx.strokeStyle=col;ctx.lineWidth=1.4;
     ctx.beginPath();ctx.moveTo(-8,3);ctx.lineTo(8,3);ctx.lineTo(6,-6);ctx.lineTo(-6,-6);ctx.closePath();ctx.fill();ctx.stroke();
     var r=t.recoil*0.7;ctx.fillStyle="#0d2c44";ctx.fillRect(-3.6,-22+r,7.2,17);
     ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(-4.6,-16+r);ctx.lineTo(4.6,-16+r);ctx.moveTo(-4.6,-10+r);ctx.lineTo(4.6,-10+r);ctx.stroke();
     ctx.fillStyle="#7dd7ff";ctx.fillRect(-3.6,-23.5+r,7.2,2.4);});
 }else if(id==="firewheel"){
   ctx.strokeStyle="#3a3f4d";ctx.lineWidth=3;ctx.lineCap="round";
   ctx.beginPath();ctx.moveTo(-8,12);ctx.lineTo(0,-4);ctx.lineTo(8,12);ctx.stroke();
   ctx.save();ctx.translate(0,-13);ctx.rotate(B.t*3.4);
   ctx.strokeStyle="#ff8a3c";ctx.lineWidth=3.4;ctx.beginPath();ctx.arc(0,0,10.5,0,6.29);ctx.stroke();
   ctx.lineWidth=2;for(var fs=0;fs<3;fs++){var sa=fs*2.09;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(sa)*10.5,Math.sin(sa)*10.5);ctx.stroke();}
   ctx.restore();
   ctx.save();ctx.shadowColor="#ffb03c";ctx.shadowBlur=10;ctx.fillStyle="#ffb03c";ctx.beginPath();ctx.arc(0,-13,3.6,0,6.29);ctx.fill();ctx.restore();
 }else if(id==="hive"){
   ctx.fillStyle="#241f0d";ctx.strokeStyle=col;ctx.lineWidth=1.6;
   ctx.beginPath();for(var hx=0;hx<6;hx++){var ha=hx/6*6.29-1.57;var px=Math.cos(ha)*12,py=-8+Math.sin(ha)*12;if(hx===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle="#0a0803";
   [[-5,-11],[4,-14],[0,-5]].forEach(function(hp){ctx.beginPath();ctx.arc(hp[0],hp[1],2.6,0,6.29);ctx.fill();});
   ctx.strokeStyle="#3a3410";ctx.beginPath();ctx.moveTo(-7,4);ctx.lineTo(0,-2);ctx.lineTo(7,4);ctx.stroke();
   for(var ob=0;ob<2;ob++){var oa=B.t*2.2+ob*3.14,bx=Math.cos(oa)*17,by=-10+Math.sin(oa)*6;
     ctx.fillStyle="#facc15";ctx.beginPath();ctx.ellipse(bx,by,3.4,2.4,0,0,6.29);ctx.fill();
     ctx.fillStyle="rgba(220,240,255,.8)";ctx.beginPath();ctx.ellipse(bx,by-2.8,2.6,1.2,0,0,6.29);ctx.fill();}
 }else if(id==="railgun"){
   ctx.fillStyle="#182a42";ctx.strokeStyle=col;ctx.lineWidth=1.3;ctx.fillRect(-13,4,26,8);ctx.strokeRect(-13,4,26,8);
   ctx.beginPath();ctx.moveTo(-8,4);ctx.lineTo(-3,-4);ctx.moveTo(8,4);ctx.lineTo(3,-4);ctx.stroke();
   head(0,-3,function(){var r=t.recoil*0.8;ctx.fillStyle="#0d1420";ctx.fillRect(-1.7,-32+r,3.4,29);
     ctx.strokeStyle="#f472b6";ctx.lineWidth=2;[-24,-17,-10].forEach(function(ry){ctx.beginPath();ctx.moveTo(-5,ry+r);ctx.lineTo(5,ry+r);ctx.stroke();});
     ctx.fillStyle="#fff";ctx.fillRect(-1.7,-33.5+r,3.4,2);});
 }else if(id==="tesla"){
   ctx.strokeStyle=col;ctx.lineWidth=1.4;ctx.fillStyle="#182a42";
   [13,10,7].forEach(function(rw,i){var ry=10-i*7;ctx.beginPath();ctx.ellipse(0,ry,rw,rw*0.34,0,0,6.29);ctx.fill();ctx.stroke();});
   ctx.fillRect(-1.6,-16,3.2,12);
   ctx.save();ctx.shadowColor="#a06bff";ctx.shadowBlur=12;ctx.fillStyle="#d8b4fe";ctx.beginPath();ctx.arc(0,-20,6,0,6.29);ctx.fill();ctx.restore();
   if(Math.random()<0.25){ctx.strokeStyle="rgba(216,180,254,.85)";ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo((Math.random()*16-8),-33-Math.random()*6);ctx.stroke();}
 }else{
   stand(10,7,14);
   head(0,-3,function(){ctx.fillStyle="#22344e";ctx.strokeStyle=col;ctx.fillRect(-6,-6,12,8);ctx.strokeRect(-6,-6,12,8);ctx.fillStyle="#0d1420";ctx.fillRect(-1.6,-16+t.recoil*0.6,3.2,11);});
 }
 ctx.restore();
 /* уровень под юнитом — внутри поля */
 ctx.fillStyle="#0a1420";ctx.fillRect(t.x-14,t.y+16,28,5);
 ctx.fillStyle=t.cfg.color;ctx.fillRect(t.x-14,t.y+16,28*Math.min(1,t.runLv/10),5);
 ctx.font="700 9px 'Segoe UI',sans-serif";ctx.textAlign="center";ctx.fillStyle="#cfe8e2";
 ctx.fillText("Lv."+t.runLv,t.x,t.y+30);
}
/* Боевой HUD — одна строка на прозрачном фоне, без подложки и шкал.
   Слева направо: режим/этап, волна, средний DPS, убийства; таймер — справа.
   DOM-кнопки (пауза/×2/сборка) занимают левые ~130px поля, поэтому текст начинается с x=140.
   Размер шрифта подбирается по измеренной ширине, чтобы всё влезло в 420px. */
function drawCombatHud(){
 ctx.save();
 var left=140,gap=9,y=18;
 var stage=(B.elite?"ELITE":"NORMAL")+" STAGE "+B.stage.n;
 var wave="WAVE "+B.wave+" / "+WAVES;
 var dps=Math.round(allFighters().reduce(function(sum,t){return sum+t.totalDmg;},0)/Math.max(1,B.elapsed));
 var items=[stage,wave,"AVG DPS "+fmt(dps),"KILL "+B.kills];
 var timeS=mmss(B.elapsed);
 var fs=11,tw=0,total=0,ws=[];
 function measure(){
   ctx.font="800 "+fs+"px 'Segoe UI',sans-serif";
   ws=items.map(function(s){return ctx.measureText(s).width;});
   ctx.font="800 "+(fs+1)+"px 'Segoe UI',sans-serif";
   tw=ctx.measureText(timeS).width;
   total=ws[0]+ws[1]+ws[2]+ws[3]+gap*3;
 }
 measure();
 while(fs>8.5&&left+total+8+tw>W-10){fs-=0.5;measure();}
 ctx.font="800 "+fs+"px 'Segoe UI',sans-serif";ctx.textAlign="left";
 ctx.fillStyle=B.elite?"#e6b2ff":"#9df8e6";
 ctx.fillText(items[0],left,y);
 var x=left+ws[0]+gap;
 ctx.fillStyle="#e5f2f4";ctx.fillText(items[1],x,y);x+=ws[1]+gap;
 ctx.fillStyle="#a6bfca";ctx.fillText(items[2],x,y);x+=ws[2]+gap;
 ctx.fillStyle="#e5f2f4";ctx.fillText(items[3],x,y);
 ctx.font="800 "+(fs+1)+"px 'Segoe UI',sans-serif";ctx.textAlign="right";ctx.fillStyle="#d4e6e8";
 ctx.fillText(timeS,W-10,y);
 ctx.restore();
}
function draw(){
 /* рендерим в физических пикселях экрана, рисуя в логических координатах 420×700 */
 ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);
 ctx.clearRect(0,0,W,H);
 var sx=B.shake?(Math.random()*B.shake-B.shake/2):0, sy=B.shake?(Math.random()*B.shake-B.shake/2):0;
 ctx.save();ctx.translate(sx,sy);
 ctx.fillStyle=B.elite?"#0d0714":"#04060c";ctx.fillRect(-14,-14,W+28,H+28);
 if(B.elite){
   var eliteGlow=ctx.createRadialGradient(W/2,230,12,W/2,230,350);
   eliteGlow.addColorStop(0,"rgba(108,23,106,.16)");
   eliteGlow.addColorStop(1,"rgba(50,16,57,0)");
   ctx.fillStyle=eliteGlow;ctx.fillRect(0,86,W,H-86);
 }
 ctx.fillStyle="rgba(140,180,220,.5)";
 for(var i=0;i<40;i++){var px=(i*67)%W,py=((i*131)+((B?B.t*6*(1+i%3):0)%H))%H;ctx.fillRect(px,py,1.6,1.6);}
 ctx.strokeStyle="rgba(46,230,200,.05)";ctx.lineWidth=1;
 for(var gx=0;gx<=W;gx+=42){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
 /* HUD is drawn last, over enemies and projectiles. */
 /* купол базы */
 var grd=ctx.createRadialGradient(W/2,BASEY+16,8,W/2,BASEY+16,120);
 grd.addColorStop(0,"rgba(46,230,200,.35)");grd.addColorStop(1,"rgba(46,230,200,0)");
 ctx.fillStyle=grd;ctx.beginPath();ctx.arc(W/2,BASEY+16,120,0,6.29);ctx.fill();
 ctx.strokeStyle="rgba(46,230,200,.55)";ctx.beginPath();ctx.arc(W/2,BASEY+22,104,Math.PI,6.29);ctx.stroke();
 /* палуба базы: турели и солдат СТОЯТ на ней, на одном уровне с базой */
 ctx.fillStyle="#101c2e";ctx.fillRect(0,BASEY+14,W,H-(BASEY+14));
 ctx.fillStyle="rgba(46,230,200,.4)";ctx.fillRect(0,BASEY+14,W,2);
 ctx.fillStyle="#16283e";ctx.fillRect(0,BASEY+14,W,8);
 ctx.font="26px serif";ctx.textAlign="center";ctx.fillText("🏰",W/2,BASEY+12);
 /* HP и щит базы — две дуги над куполом (тот же центр, что у купола: W/2, BASEY+22),
    длина дуги ∝ доле HP/щита, симметрично по центру вершины. Полный угол дуг — 120°
    (±60° от вершины): концы при полном HP — на ~48px выше палубы, над рядом юнитов,
    и не спускаются между стражем и турелями. Точное HP — числом над куполом. */
 function baseArc(r,frac,color,bg,width){
   ctx.strokeStyle=bg;ctx.lineWidth=width;ctx.beginPath();ctx.arc(W/2,BASEY+22,r,Math.PI*1.5-Math.PI/3,Math.PI*1.5+Math.PI/3);ctx.stroke();
   if(frac>0){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(W/2,BASEY+22,r,Math.PI*1.5-(Math.PI/3)*frac,Math.PI*1.5+(Math.PI/3)*frac);ctx.stroke();}
 }
 baseArc(112,Math.max(0,B.baseHp/B.baseMax),B.elite?"#bc8ee3":"#2ee6c8","rgba(46,230,200,.14)",5);
 baseArc(121,Math.max(0,B.shield/B.shieldMax),"#38c8ff","rgba(56,200,255,.12)",3.5);
 ctx.font="800 10px 'Segoe UI',sans-serif";ctx.textAlign="center";ctx.fillStyle="#e8f4f2";
 ctx.fillText(Math.ceil(B.baseHp),W/2,BASEY-106);
 ctx.lineWidth=1;
 /* пустые слоты турелей */
 TURRET_X.forEach(function(x,i){
   if(!B.turrets.some(function(t){return t.slot===i;})){
     ctx.strokeStyle="rgba(143,168,181,.35)";ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(x,LINE_Y,15,0,6.29);ctx.stroke();ctx.setLineDash([]);
     ctx.font="8.5px 'Segoe UI',sans-serif";ctx.fillStyle="rgba(143,168,181,.8)";ctx.textAlign="center";ctx.fillText("СЛОТ",x,LINE_Y+26);
   }
 });
 /* враги */
 B.enemies.forEach(function(e){
   ctx.save();ctx.translate(e.x,e.y);
   if(e.kind==="healer"){
     /* звезда регенерации: вращающаяся звезда с медицинским крестом */
     ctx.save();ctx.rotate(e.phase*0.35);
     ctx.fillStyle=e.flash>0?"#ffffff":e.color;ctx.beginPath();
     for(var sp=0;sp<10;sp++){var sa=sp/10*6.29-1.57,sr=sp%2?e.r*0.55:e.r;ctx.lineTo(Math.cos(sa)*sr,Math.sin(sa)*sr);}
     ctx.closePath();ctx.fill();ctx.restore();
     ctx.fillStyle="#eafff2";ctx.fillRect(-2,-7,4,14);ctx.fillRect(-7,-2,14,4);
     ctx.strokeStyle="rgba(74,222,128,.65)";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,e.r+4+Math.sin(e.phase*2)*1.6,0,6.29);ctx.stroke();
   }else if(e.kind==="splitter"){
     /* голем-матка: каменный ком с двумя зародышами внутри и трещинами */
     ctx.rotate(e.phase*0.1);
     ctx.fillStyle=e.flash>0?"#ffffff":e.color;ctx.beginPath();
     for(var sk=0;sk<8;sk++){var saa=sk/8*6.29,srr=e.r*(0.85+((sk*41)%10)/40);ctx.lineTo(Math.cos(saa)*srr,Math.sin(saa)*srr);}
     ctx.closePath();ctx.fill();
     ctx.rotate(-e.phase*0.1);
     ctx.fillStyle="#9ccb8f";ctx.beginPath();ctx.arc(-6,3,5,0,6.29);ctx.arc(6,-3,5,0,6.29);ctx.fill();
     ctx.strokeStyle="rgba(10,20,10,.6)";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-3,-e.r+3);ctx.lineTo(1,-4);ctx.lineTo(-2,3);ctx.lineTo(2,e.r-4);ctx.stroke();
     if(e.slowFactor<1){ctx.strokeStyle="rgba(56,200,255,.8)";ctx.beginPath();ctx.arc(0,0,e.r+2,0,6.29);ctx.stroke();}
   }else if(e.kind==="flyer"){
     ctx.fillStyle=e.flash>0?"#fff":e.color;
     ctx.beginPath();ctx.ellipse(0,0,e.r,e.r*0.72,0,0,6.29);ctx.fill();
     ctx.fillStyle="#2a1a4a";var w=Math.sin(e.phase)*5;
     ctx.beginPath();ctx.moveTo(-e.r,0);ctx.lineTo(-e.r-10,-6+w);ctx.lineTo(-e.r-2,4);ctx.fill();
     ctx.beginPath();ctx.moveTo(e.r,0);ctx.lineTo(e.r+10,-6-w);ctx.lineTo(e.r+2,4);ctx.fill();
     ctx.fillStyle="#7ef0d4";ctx.beginPath();ctx.arc(-4,-2,2.2,0,6.29);ctx.arc(4,-2,2.2,0,6.29);ctx.fill();
   }else{
     ctx.rotate(e.phase*0.15);
     ctx.fillStyle=e.flash>0?"#ffffff":e.color;
     ctx.beginPath();
     for(var k=0;k<7;k++){var a=k/7*6.29,rr=e.r*(0.82+((k*37)%10)/38);ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}
     ctx.closePath();ctx.fill();
     ctx.fillStyle="rgba(255,138,60,.85)";ctx.beginPath();ctx.arc(0,0,e.r*0.34,0,6.29);ctx.fill();
     ctx.rotate(-e.phase*0.15);
     if(e.kind==="elite"||e.kind==="boss"){ctx.strokeStyle="#ffd34d";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.r+4+Math.sin(e.phase*2)*1.5,0,6.29);ctx.stroke();}
     if(e.slowFactor<1){ctx.strokeStyle="rgba(56,200,255,.8)";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,e.r+2,0,6.29);ctx.stroke();}
   }
   if(e.champion){
     ctx.save();
     ctx.strokeStyle=B.elite?"rgba(228,141,255,.94)":"rgba(255,211,77,.8)";
     ctx.shadowColor="#d884ff";ctx.shadowBlur=13;ctx.lineWidth=2.2;
     ctx.beginPath();ctx.arc(0,0,e.r+6+Math.sin(B.t*5+e.phase)*1.2,0,Math.PI*2);ctx.stroke();
     ctx.fillStyle="#f2c3ff";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText("✦",0,-e.r-8);
     ctx.restore();
   }
   ctx.restore();
   if(e.hp<e.maxHp||e.champion){ctx.fillStyle="#20060c";ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2,4);ctx.fillStyle=e.champion?"#d88cff":e.kind==="boss"?"#ff5470":"#4ade80";ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2*Math.max(0,e.hp/e.maxHp),4);}
 });
 /* Hive выпускает рой пчёл: полосатое тельце, машущие крылья, жало */
 B.drones.forEach(function(d){
   var flap=Math.sin(B.t*46+d.x*0.7)*0.5;
   ctx.save();ctx.translate(d.x,d.y);
   ctx.fillStyle="rgba(220,240,255,.8)";
   ctx.beginPath();ctx.ellipse(-3,-4.6,4.8,2.1,-0.7-flap*0.35,0,6.29);ctx.fill();
   ctx.beginPath();ctx.ellipse(3,-4.6,4.8,2.1,0.7+flap*0.35,0,6.29);ctx.fill();
   ctx.fillStyle="#facc15";ctx.beginPath();ctx.ellipse(0,0,6.2,4.4,0,0,6.29);ctx.fill();
   ctx.fillStyle="#191919";ctx.fillRect(-3,-4.1,2.3,8.2);ctx.fillRect(0.9,-4.1,2.3,8.2);
   ctx.fillStyle="#fff7cc";ctx.beginPath();ctx.arc(5.2,0,1.7,0,6.29);ctx.fill();
   ctx.restore();
 });
 /* Persistent Firewheel and field effects. */
 B.fields.forEach(function(f){ctx.save();ctx.globalAlpha=Math.max(0,Math.min(0.28,f.life/7));ctx.fillStyle=f.kind==="matrix"?"#a06bff":"#38c8ff";ctx.strokeStyle=f.kind==="matrix"?"#d8b4fe":"#38c8ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,6.29);ctx.fill();ctx.stroke();ctx.restore();});
 B.wheels.forEach(function(w){ctx.save();ctx.translate(w.x,w.y);ctx.rotate(B.t*12);ctx.shadowColor="#ff8a3c";ctx.shadowBlur=18;ctx.strokeStyle="#ffb03c";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,14,0,6.29);ctx.stroke();for(var i=0;i<3;i++){var a=i*2.094;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*13,Math.sin(a)*13);ctx.stroke();}ctx.restore();});
 allFighters().forEach(drawUnit);
 /* снаряды: у каждого типа турели свой силуэт и свечение */
 B.projs.forEach(function(p){
   var id=p.src.cfg.id,col=p.src.cfg.color;
   ctx.save();ctx.shadowColor=col;
   if(id==="skyguard"){ /* ракета: корпус по курсу полёта, конус и огненный выхлоп */
     ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));
     ctx.shadowBlur=8;ctx.fillStyle="#e5edf5";ctx.fillRect(-7,-2.6,13,5.2);
     ctx.fillStyle="#ff5470";ctx.beginPath();ctx.moveTo(6,-2.6);ctx.lineTo(11,0);ctx.lineTo(6,2.6);ctx.closePath();ctx.fill();
     ctx.fillStyle="#5b7a8c";ctx.fillRect(-7,-4.6,3.4,2);ctx.fillRect(-7,2.6,3.4,2);
     ctx.shadowColor="#ff8a3c";ctx.shadowBlur=12;ctx.fillStyle="#ffb03c";ctx.beginPath();ctx.arc(-8.6,0,2.6+Math.random()*1.6,0,6.29);ctx.fill();
   }else if(id==="tesla"){ /* летящий заряд энергии: фиолетовая сфера с белым ядром и искрами */
     ctx.shadowColor="#a06bff";ctx.shadowBlur=16;ctx.fillStyle="#a06bff";ctx.beginPath();ctx.arc(p.x,p.y,5.8,0,6.29);ctx.fill();
     ctx.shadowBlur=0;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(p.x,p.y,2.3,0,6.29);ctx.fill();
     ctx.strokeStyle="rgba(216,180,254,.9)";ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(p.x-3,p.y-6);ctx.lineTo(p.x+1,p.y-10-Math.random()*3);ctx.moveTo(p.x+4,p.y+3);ctx.lineTo(p.x+8+Math.random()*3,p.y+6);ctx.stroke();
   }else if(id==="railgun"){ /* длинный розовый след-штрих и белое ядро */
     ctx.lineWidth=3;ctx.shadowBlur=10;ctx.strokeStyle=col;
     ctx.beginPath();ctx.moveTo(p.x-p.vx*0.09,p.y-p.vy*0.09);ctx.lineTo(p.x,p.y);ctx.stroke();
     ctx.shadowBlur=0;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,6.29);ctx.fill();
   }else if(id==="disruption"){ /* пульсирующее кольцо-импульс */
     ctx.lineWidth=2;ctx.shadowBlur=8;ctx.strokeStyle=col;
     ctx.beginPath();ctx.arc(p.x,p.y,6+Math.sin(B.t*30)*1.6,0,6.29);ctx.stroke();
     ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,2,0,6.29);ctx.fill();
   }else if(id==="aeroblast"){ /* вращающаяся воздушная дуга-вихрь */
     ctx.lineWidth=2.6;ctx.shadowBlur=6;ctx.strokeStyle=col;
     var a0=B.t*18+p.x*0.05;ctx.beginPath();ctx.arc(p.x,p.y,6.5,a0,a0+4.2);ctx.stroke();
   }else if(id==="beam"){ /* тяжёлый энергозаряд с белым ядром */
     ctx.shadowBlur=16;ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,5.6,0,6.29);ctx.fill();
     ctx.shadowBlur=0;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,6.29);ctx.fill();
   }else if(id==="firewheel"){ /* огненный шар */
     ctx.shadowColor="#ff8a3c";ctx.shadowBlur=13;ctx.fillStyle="#ffb03c";ctx.beginPath();ctx.arc(p.x,p.y,4.6,0,6.29);ctx.fill();
     ctx.shadowBlur=0;ctx.fillStyle="#ff8a3c";ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,6.29);ctx.fill();
   }else{ /* трассеры: Sky Guard — жёлтые, солдат — золотые, покороче/подлиннее */
     ctx.lineWidth=id==="soldier"?2.6:2;ctx.shadowBlur=6;ctx.strokeStyle=col;
     var tl=id==="soldier"?0.045:0.03;
     ctx.beginPath();ctx.moveTo(p.x-p.vx*tl,p.y-p.vy*tl);ctx.lineTo(p.x,p.y);ctx.stroke();
   }
   ctx.restore();
 });
 B.beams.forEach(function(b){ctx.save();ctx.globalAlpha=1-b.t/b.life;ctx.strokeStyle=b.color;ctx.lineWidth=b.w;ctx.shadowColor=b.color;ctx.shadowBlur=7;ctx.beginPath();ctx.moveTo(b.x1,b.y1);if(b.arc&&b.mx!==undefined)ctx.lineTo(b.mx,b.my);ctx.lineTo(b.x2,b.y2);ctx.stroke();ctx.restore();});
 B.rings.forEach(function(r){ctx.save();ctx.globalAlpha=1-r.t/r.life;ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,6.29);ctx.stroke();ctx.restore();});
 B.parts.forEach(function(p){ctx.save();ctx.globalAlpha=1-p.t/p.life;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.29);ctx.fill();ctx.restore();});
 /* числа урона: крит — золото, уязвимость врага — оранжевым крупнее, сопротивление — приглушённо */
 B.nums.forEach(function(n){ctx.save();ctx.globalAlpha=1-n.t/0.85;ctx.font=(n.crit?"800 17px":(n.rm>1.15?"800 14.5px":"700 12px"))+" 'Segoe UI',sans-serif";ctx.textAlign="center";ctx.fillStyle=n.crit?"#ff9f2e":(n.rm>1.15?"#ff7a4d":(n.rm<0.85?"#8fa8b5":"#ffffff"));ctx.fillText(n.txt,n.x,n.y);ctx.restore();});
 ctx.restore();
 drawCombatHud();
}
function mmss(s){s=Math.max(0,Math.floor(s));return "0"+Math.floor(s/60)+":"+("0"+(s%60)).slice(-2);}
function syncHud(){ /* все метрики боя рисуются прямо на канвасе внутри поля (draw) */ }
$("btn-speed").addEventListener("click",function(){if(!B)return;B.speed=B.speed===1?2:1;this.textContent="×"+B.speed;this.classList.toggle("on",B.speed===2);SFX.pick();});
$("btn-pause").addEventListener("click",function(){if(!B||B.over)return;B.paused=true;openPause("⏸ Пауза");});
$("btn-buildinfo").addEventListener("click",function(){if(!B)return;B.paused=true;openPause("🧰 Сборка");});
function openPause(title){
 $("pause-title").textContent=title;
 var h='<table class="stats"><thead><tr><th>Юнит</th><th>Ур.</th><th>DMG</th></tr></thead><tbody>';
 allFighters().slice().sort(function(a,b){return b.totalDmg-a.totalDmg;}).forEach(function(t){h+="<tr><td>"+t.cfg.icon+" "+t.cfg.name+"</td><td>"+t.runLv+"</td><td>"+fmt(t.totalDmg)+"</td></tr>";});
 $("pause-body").innerHTML=h+"</tbody></table>";
 $("ov-pause").classList.add("on");
}
$("btn-resume").addEventListener("click",function(){$("ov-pause").classList.remove("on");if(B)B.paused=false;lastTs=performance.now();});
$("btn-quit").addEventListener("click",function(){$("ov-pause").classList.remove("on");if(B&&!B.over)endBattle(false);});

