/* ---------- draw ---------- */
/* ---------- shared drawing helpers ---------- */
var LIVERY_COL={classic:"#2ee6c8",arctic:"#90d5ff",ember:"#ff995e"};
function liveryCol(){return LIVERY_COL[META.livery]||LIVERY_COL.classic;}
/* скруглённый прямоугольник без ctx.roundRect (его нет в старых Android WebView) */
function rrPath(x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));
 ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function shade(c1,c2,x0,y0,x1,y1){var g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,c1);g.addColorStop(1,c2);return g;}
/* детерминированный «шум» по зерну: форма каждого врага стабильна от кадра к кадру, но у врагов разная */
function hrand(seed,i){var v=Math.sin(seed*127.1+i*311.7)*43758.5453;return v-Math.floor(v);}
var _tintCache={};
/* осветлить (amt>0) или затемнить (amt<0) цвет #rrggbb */
function tint(hex,amt){var key=hex+"|"+amt;if(_tintCache[key])return _tintCache[key];
 if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
 var n=parseInt(hex.slice(1),16),R=n>>16,G=(n>>8)&255,Bl=n&255;
 function f(c){return Math.max(0,Math.min(255,Math.round(amt<0?c*(1+amt):c+(255-c)*amt)));}
 return(_tintCache[key]="rgb("+f(R)+","+f(G)+","+f(Bl)+")");}
function glowDot(x,y,r,c,blur){ctx.save();ctx.shadowColor=c;ctx.shadowBlur=blur||r*2.4;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.fill();ctx.restore();}
/* металлическая панель: вертикальный градиент, акцентная окантовка и блик по верхней кромке */
function metal(x,y,w,h,col,r,lw){
 rrPath(x,y,w,h,r===undefined?1.6:r);
 ctx.fillStyle=shade("#34506f","#121f33",x,y,x,y+h);ctx.fill();
 ctx.lineWidth=lw||1.1;ctx.strokeStyle=col;ctx.stroke();
 ctx.fillStyle="rgba(255,255,255,.16)";ctx.fillRect(x+1.2,y+0.9,Math.max(0,w-2.4),Math.min(1.3,h/4));
}
/* постамент-трапеция, на которой стоит установка (нижняя кромка y=12 — палуба) */
function pedestal(col,w1,w2,h){
 ctx.beginPath();ctx.moveTo(-w1,12);ctx.lineTo(w1,12);ctx.lineTo(w2,12-h);ctx.lineTo(-w2,12-h);ctx.closePath();
 ctx.fillStyle=shade("#2f4a69","#0f1b2d",0,12-h,0,12);ctx.fill();
 ctx.lineWidth=1.2;ctx.strokeStyle=col;ctx.stroke();
 ctx.fillStyle=col;ctx.globalAlpha=0.75;ctx.fillRect(-w2+1.5,12-h+1.6,(w2-1.5)*2,1.1);ctx.globalAlpha=1;
}
/* поворотная голова: начало координат в оси вращения, «вперёд» = −y */
function aimed(t,px,py,fn){ctx.save();ctx.translate(px,py);ctx.rotate(t.angle+Math.PI/2);ctx.translate(0,Math.min(4,t.recoil*.7));fn();ctx.restore();}
/* посадочная площадка */
function drawPad(col){
 ctx.fillStyle="rgba(0,0,0,.38)";ctx.beginPath();ctx.ellipse(0,14.6,24,6.6,0,0,6.2832);ctx.fill();
 ctx.fillStyle="#0c1626";ctx.strokeStyle="rgba(120,160,190,.5)";ctx.lineWidth=1;
 ctx.beginPath();ctx.ellipse(0,13,22,6,0,0,6.2832);ctx.fill();ctx.stroke();
 ctx.fillStyle="#152741";ctx.beginPath();ctx.ellipse(0,12.7,17,4.5,0,0,6.2832);ctx.fill();
 ctx.strokeStyle=col;ctx.globalAlpha=0.6;ctx.lineWidth=1.3;
 ctx.beginPath();ctx.ellipse(0,12.7,17,4.5,0,0.2,Math.PI-0.2);ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle="#6f8ea3";[-19,19].forEach(function(bx){ctx.beginPath();ctx.arc(bx,13.4,1.1,0,6.2832);ctx.fill();});
}

/* ---------- Guardian: боец с каской, бронежилетом, руками и винтовкой ---------- */
function drawGuardian(t,col){
 var ca=Math.cos(t.angle);
 /* боец смотрит в сторону цели; у самой вертикали не дёргается (гистерезис) */
 if(Math.abs(ca)>0.14||!t.facing)t.facing=ca<0?-1:1;
 var f=t.facing,la=Math.atan2(Math.sin(t.angle),f*ca),rc=t.recoil*0.55,tm=B.t;
 var br=Math.sin(tm*2.6)*0.45;               /* лёгкое дыхание */
 ctx.save();ctx.scale(f,1);ctx.lineCap="round";ctx.lineJoin="round";
 /* ноги и ботинки */
 ctx.strokeStyle="#263a52";ctx.lineWidth=3.6;
 ctx.beginPath();ctx.moveTo(-2.6,1.5);ctx.lineTo(-4.2,10.6);ctx.moveTo(2.6,1.5);ctx.lineTo(4.4,10.6);ctx.stroke();
 ctx.strokeStyle="#34506f";ctx.lineWidth=1.2;
 ctx.beginPath();ctx.moveTo(-3.2,4);ctx.lineTo(-3.8,8);ctx.moveTo(3.2,4);ctx.lineTo(3.9,8);ctx.stroke();
 ctx.fillStyle="#0d1420";rrPath(-7.2,10,5.6,2.6,1.2);ctx.fill();rrPath(1.6,10,6.2,2.6,1.2);ctx.fill();
 /* рюкзак-боеукладка за спиной */
 ctx.fillStyle="#17283d";rrPath(-10,-9+br,4.6,10,1.4);ctx.fill();
 ctx.strokeStyle=col;ctx.globalAlpha=0.8;ctx.lineWidth=0.9;ctx.stroke();ctx.globalAlpha=1;
 /* торс: бронежилет, пластина и ливрея на плечах */
 rrPath(-6.6,-10+br,13.2,12.6,2.2);ctx.fillStyle=shade("#2d6a54","#17382d",0,-10,0,3);ctx.fill();
 ctx.lineWidth=0.9;ctx.strokeStyle="rgba(0,0,0,.45)";ctx.stroke();
 ctx.fillStyle="rgba(255,255,255,.10)";rrPath(-4.2,-8.4+br,8.4,5.2,1.3);ctx.fill();
 ctx.fillStyle=col;ctx.fillRect(-6.6,-10+br,13.2,2.2);
 ctx.fillStyle="#0d1420";ctx.fillRect(-6.6,1.2,13.2,1.5);ctx.fillStyle="#8fa8b5";ctx.fillRect(-1.2,1.1,2.4,1.7);
 /* дальняя рука держит цевьё */
 var cs=Math.cos(la),sn=Math.sin(la),SX=2.4,SY=-6.4+br;
 var gx=SX+cs*(8.5-rc),gy=SY+sn*(8.5-rc)+0.9,tx=SX+cs*(2.2-rc),ty=SY+sn*(2.2-rc)+1.6;
 ctx.strokeStyle="#1d4a3a";ctx.lineWidth=2.8;
 ctx.beginPath();ctx.moveTo(-2.8,-7.2+br);ctx.quadraticCurveTo((-2.8+gx)/2-0.5,(-7.2+gy)/2+3,gx,gy);ctx.stroke();
 /* ближняя рука к рукояти */
 ctx.strokeStyle="#256650";ctx.beginPath();ctx.moveTo(SX,SY);ctx.quadraticCurveTo((SX+tx)/2-0.4,(SY+ty)/2+2.4,tx,ty);ctx.stroke();
 ctx.fillStyle="#d9b380";ctx.beginPath();ctx.arc(gx,gy,1.5,0,6.2832);ctx.arc(tx,ty,1.5,0,6.2832);ctx.fill();
 /* винтовка: поворачивается вокруг плеча (локальный угол всегда «вперёд», не вверх ногами) */
 ctx.save();ctx.translate(SX,SY);ctx.rotate(la);ctx.translate(-rc,0);
 ctx.fillStyle="#1a2638";rrPath(-6.2,-1.5,7,3.4,1);ctx.fill();                  /* приклад */
 ctx.fillStyle=shade("#3a4f66","#18222f",0,-2,0,2.4);rrPath(0,-2,11,4.2,1);ctx.fill();    /* ствольная коробка */
 ctx.fillStyle="#10161f";ctx.fillRect(3.2,2,2.4,3.6);                          /* магазин */
 ctx.fillStyle="#0d1420";rrPath(11,-1.1,7.4,2.2,0.8);ctx.fill();                /* ствол */
 ctx.fillStyle="#7b97a8";ctx.fillRect(17.4,-1.5,2,3);                          /* дульный тормоз */
 ctx.fillStyle=col;ctx.globalAlpha=0.85;ctx.fillRect(1,-0.3,8.4,0.9);ctx.globalAlpha=1;
 ctx.fillStyle="#0d1420";rrPath(3.2,-3.6,5,1.8,0.7);ctx.fill();                /* прицел */
 ctx.fillStyle=col;ctx.beginPath();ctx.arc(8,-2.7,0.8,0,6.2832);ctx.fill();
 if(t.recoil>2.4){                                                              /* вспышка выстрела */
   ctx.save();ctx.shadowColor="#ffd34d";ctx.shadowBlur=9;ctx.fillStyle="#fff3b0";
   ctx.beginPath();ctx.moveTo(19.4,0);ctx.lineTo(22.5,-3);ctx.lineTo(25,0);ctx.lineTo(22.5,3);ctx.closePath();ctx.fill();ctx.restore();
 }
 ctx.restore();
 /* голова рисуется ПОСЛЕ винтовки: при прицеливании вверх ствол не закрывает лицо */
 var hx=1.2,hy=-14.6+br;
 ctx.fillStyle="#d9b380";ctx.beginPath();ctx.arc(hx,hy,4.6,0,6.2832);ctx.fill();
 ctx.fillStyle=shade("#59803a","#324d1f",0,hy-6,0,hy);ctx.beginPath();ctx.arc(hx,hy-0.8,5.6,Math.PI,0);ctx.fill();
 ctx.fillRect(hx-5.7,hy-1,11.4,1.7);
 ctx.fillStyle="rgba(255,255,255,.18)";ctx.beginPath();ctx.arc(hx-1.2,hy-3.2,2.6,Math.PI*1.1,Math.PI*1.8);ctx.fill();
 ctx.save();ctx.shadowColor=col;ctx.shadowBlur=5;ctx.fillStyle=col;rrPath(hx+0.8,hy-0.2,5,2.5,1);ctx.fill();ctx.restore();
 ctx.restore();
}

/* ---------- турели ---------- */
var TURRET_DRAW={
 skyguard:function(t,col){
   /* ракетная установка: пакет из 4 труб на цапфах, ось вращения — на верхней кромке постамента */
   pedestal(col,11,8,8);
   ctx.fillStyle="#1d3350";ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,4,9,2.5,0,0,6.2832);ctx.fill();ctx.stroke();
   aimed(t,0,2,function(){var r=t.recoil*0.6;
     ctx.fillStyle="#22344e";ctx.strokeStyle=col;ctx.lineWidth=1;
     rrPath(-13.2,-4,3.2,9,1);ctx.fill();ctx.stroke();rrPath(10,-4,3.2,9,1);ctx.fill();ctx.stroke();   /* цапфы */
     metal(-10.4,-12+r,20.8,15.5,col,2);
     [-7.4,-2.5,2.5,7.4].forEach(function(tx){
       ctx.fillStyle="#070b13";ctx.fillRect(tx-2.3,-15.4+r,4.6,4.6);                                /* дульные срезы */
       ctx.fillStyle="#e5edf5";ctx.fillRect(tx-1.3,-14.6+r,2.6,3);
       ctx.fillStyle="#ff5470";ctx.beginPath();ctx.moveTo(tx-1.5,-14.6+r);ctx.lineTo(tx,-17.8+r);ctx.lineTo(tx+1.5,-14.6+r);ctx.closePath();ctx.fill();
     });
     ctx.fillStyle=col;ctx.globalAlpha=0.9;ctx.fillRect(-10.4,-3+r,20.8,1.5);ctx.globalAlpha=1;
     ctx.fillStyle="#0a101c";ctx.fillRect(-6,0.4+r,3,1.6);ctx.fillRect(3,0.4+r,3,1.6);                  /* задние сопла */
   });
 },
 laser:function(t,col){
   /* мачта на треноге; призма-излучатель сидит прямо на её вершине */
   ctx.strokeStyle=col;ctx.lineWidth=1.3;ctx.fillStyle=shade("#2f4a69","#0f1b2d",0,-6,0,12);
   ctx.beginPath();ctx.moveTo(-11,12);ctx.lineTo(-2.4,-7);ctx.lineTo(2.4,-7);ctx.lineTo(11,12);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle="#0a2218";ctx.fillRect(-1.4,-4,2.8,14);
   ctx.fillStyle=col;ctx.globalAlpha=0.8;ctx.fillRect(-6.4,8,12.8,1.1);ctx.globalAlpha=1;
   metal(-3.6,-14,7.2,8,col,1.6);
   aimed(t,0,-10,function(){
     metal(-3.4,-7,6.8,10,col,1.6);
     ctx.fillStyle="#0a2218";ctx.fillRect(-1.5,-10,3,4);
     ctx.save();ctx.shadowColor="#4ade80";ctx.shadowBlur=t.laserActive>0?16:6;ctx.fillStyle=t.laserActive>0?"#4ade80":"#33a868";
     ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(4.6,-12.6);ctx.lineTo(0,-6.4);ctx.lineTo(-4.6,-12.6);ctx.closePath();ctx.fill();ctx.restore();
     ctx.fillStyle="rgba(255,255,255,.75)";ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(1.7,-12.6);ctx.lineTo(0,-9);ctx.lineTo(-1.7,-12.6);ctx.closePath();ctx.fill();
   });
   if(t.laserActive>0)glowDot(0,-10,3.2,"#c9ffd9",12);
 },
 disruption:function(t,col){
   var bob=Math.sin(B.t*3+t.x)*1.6,tm=B.t;
   /* колодец-излучатель на палубе и конус удерживающего поля */
   ctx.strokeStyle="rgba(56,200,255,.4)";ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,12,13,3.4,0,0,6.2832);ctx.stroke();
   ctx.fillStyle="rgba(56,200,255,.10)";ctx.beginPath();ctx.moveTo(-9,-8+bob);ctx.lineTo(9,-8+bob);ctx.lineTo(13,12);ctx.lineTo(-13,12);ctx.closePath();ctx.fill();
   ctx.save();ctx.translate(0,-15+bob);
   ctx.fillStyle=shade("#2c4a6c","#10203a",0,-6,0,6);ctx.strokeStyle=col;ctx.lineWidth=1.4;
   ctx.beginPath();ctx.ellipse(0,0,12.6,6.2,0,0,6.2832);ctx.fill();ctx.stroke();
   ctx.fillStyle="rgba(56,200,255,.9)";ctx.beginPath();ctx.ellipse(0,-2.2,5.8,3.2,0,Math.PI,0);ctx.fill();
   ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.ellipse(-1.6,-3.6,2.2,1,-0.3,0,6.2832);ctx.fill();
   for(var li=0;li<4;li++){var la=tm*2.2+li*1.571;glowDot(Math.cos(la)*9.6,Math.sin(la)*3.6+0.6,1.1,"#bff0ff",4);}   /* бегущие огни по ободу */
   var rp=Math.sin(tm*24)*6;ctx.strokeStyle=col;ctx.lineWidth=1.6;                                                       /* стабилизаторы */
   ctx.beginPath();ctx.moveTo(-18,-3);ctx.lineTo(-11+rp,-3);ctx.moveTo(18,-3);ctx.lineTo(11-rp,-3);ctx.stroke();
   ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,5.4,2,0,6.2832);ctx.fill();
   ctx.restore();
 },
 aeroblast:function(t,col){
   pedestal(col,11,8,8);
   ctx.fillStyle=shade("#2c4a6c","#10203a",0,-18,0,2);ctx.strokeStyle=col;ctx.lineWidth=1.6;
   ctx.beginPath();ctx.arc(0,-8,10.8,0,6.2832);ctx.fill();ctx.stroke();
   ctx.fillStyle="#071522";ctx.beginPath();ctx.arc(0,-8,8.2,0,6.2832);ctx.fill();
   var sp=B.t*9;                                                                      /* крыльчатка: 4 лопасти */
   for(var fb=0;fb<4;fb++){var fa=sp+fb*1.5708;ctx.fillStyle=fb%2?"#5fc6ee":"#8fe0ff";
     ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(Math.cos(fa-0.32)*8,-8+Math.sin(fa-0.32)*8);ctx.lineTo(Math.cos(fa+0.32)*8,-8+Math.sin(fa+0.32)*8);ctx.closePath();ctx.fill();}
   ctx.fillStyle="#cfeeff";ctx.beginPath();ctx.arc(0,-8,2,0,6.2832);ctx.fill();
   aimed(t,0,-8,function(){                                                          /* сопло смотрит на цель */
     ctx.fillStyle=shade("#2c4a6c","#0d1f33",-5,0,5,0);ctx.strokeStyle=col;ctx.lineWidth=1.2;
     ctx.beginPath();ctx.moveTo(-4.4,-6);ctx.lineTo(4.4,-6);ctx.lineTo(6.6,-14);ctx.lineTo(-6.6,-14);ctx.closePath();ctx.fill();ctx.stroke();
     ctx.fillStyle="#7dd7ff";ctx.fillRect(-6.6,-15.2,13.2,1.5);
     ctx.fillStyle="#05121e";ctx.fillRect(-4.2,-14.2,8.4,1.5);
   });
 },
 thunder:function(t,col){
   pedestal(col,12,8.4,9);
   metal(-5,0,10,3.2,col,1);
   ctx.lineCap="round";
   [-6.4,6.4].forEach(function(ex){
     ctx.strokeStyle="#1b2c46";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(ex,2.6);ctx.lineTo(ex,-19);ctx.stroke();
     ctx.strokeStyle=col;ctx.lineWidth=1.3;                                         /* витки катушки */
     for(var cw=0;cw<5;cw++){var cy=-1-cw*3.8;ctx.beginPath();ctx.moveTo(ex-2.6,cy);ctx.lineTo(ex+2.6,cy-1.6);ctx.stroke();}
   });
   glowDot(-6.4,-22,3.4,"#e9d5ff",t.recoil>0?16:8);glowDot(6.4,-22,3.4,"#e9d5ff",t.recoil>0?16:8);
   ctx.strokeStyle="rgba(216,180,254,"+(0.35+Math.random()*0.5)+")";ctx.lineWidth=1.3;ctx.beginPath();
   var zx=-6.4;ctx.moveTo(zx,-22);while(zx<5){zx+=2.6+Math.random()*2.6;ctx.lineTo(zx,-22+(Math.random()*7-3.5));}ctx.lineTo(6.4,-22);ctx.stroke();
 },
 beam:function(t,col){
   pedestal(col,14,10,9);
   ctx.fillStyle="#1d3350";ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,3,9.5,2.6,0,0,6.2832);ctx.fill();ctx.stroke();
   aimed(t,0,0,function(){var r=t.recoil*0.7;
     metal(-7.6,-6,15.2,10,col,2);                                                  /* корпус на оси */
     metal(-3.8,-24+r,7.6,19,col,1.4);                                              /* ствол */
     ctx.strokeStyle=col;ctx.lineWidth=1;
     for(var fin=0;fin<4;fin++){ctx.beginPath();ctx.moveTo(-5.6,-20+fin*3.6+r);ctx.lineTo(5.6,-20+fin*3.6+r);ctx.stroke();}   /* рёбра охлаждения */
     ctx.fillStyle="#0a2236";ctx.fillRect(-2,-24.4+r,4,2);
     ctx.save();ctx.shadowColor="#7dd7ff";ctx.shadowBlur=9;ctx.fillStyle="#bfeaff";ctx.fillRect(-3.8,-26+r,7.6,2.2);ctx.restore();
     glowDot(0,-0.6,2.1,"#7dd7ff",7);
   });
 },
 firewheel:function(t,col){
   /* жаровня-подставка и огненное колесо */
   ctx.strokeStyle="#3a3f4d";ctx.lineWidth=3;ctx.lineCap="round";
   ctx.beginPath();ctx.moveTo(-9,12);ctx.lineTo(0,-5);ctx.lineTo(9,12);ctx.stroke();
   ctx.strokeStyle="#59606f";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5.4,6);ctx.lineTo(5.4,6);ctx.stroke();
   metal(-5,-5,10,4,"#ff8a3c",1.4);
   var tm=B.t;
   ctx.save();ctx.translate(0,-13);
   ctx.fillStyle="rgba(255,138,60,.16)";ctx.beginPath();ctx.arc(0,0,15.5,0,6.2832);ctx.fill();   /* жар */
   ctx.rotate(tm*3.4);
   ctx.strokeStyle="#ff8a3c";ctx.lineWidth=3.2;ctx.beginPath();ctx.arc(0,0,10.2,0,6.2832);ctx.stroke();
   for(var fs=0;fs<6;fs++){var sa=fs*1.0472;ctx.strokeStyle=fs%2?"#ffb03c":"#ff6a2c";ctx.lineWidth=fs%2?1.4:2.2;
     ctx.beginPath();ctx.moveTo(Math.cos(sa)*3,Math.sin(sa)*3);ctx.lineTo(Math.cos(sa)*10,Math.sin(sa)*10);ctx.stroke();}
   ctx.fillStyle="#ffcf6a";                                                                     /* языки пламени по ободу */
   for(var fl=0;fl<8;fl++){var fa=fl*0.7854;ctx.beginPath();ctx.moveTo(Math.cos(fa-0.16)*10.2,Math.sin(fa-0.16)*10.2);
     ctx.lineTo(Math.cos(fa)*(13.6+Math.sin(tm*14+fl*2)*1.6),Math.sin(fa)*(13.6+Math.sin(tm*14+fl*2)*1.6));ctx.lineTo(Math.cos(fa+0.16)*10.2,Math.sin(fa+0.16)*10.2);ctx.closePath();ctx.fill();}
   ctx.restore();
   glowDot(0,-13,3.6,"#ffb03c",10);
 },
 hive:function(t,col){
   /* улей на опорной колонне: сот-пакет с лётным люком и осами на орбите */
   ctx.strokeStyle="#3a3410";ctx.lineWidth=3.2;ctx.lineCap="round";
   ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(0,1);ctx.stroke();
   ctx.strokeStyle="#6b5f1d";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-6,12);ctx.lineTo(0,3);ctx.lineTo(6,12);ctx.stroke();
   function hex(cx,cy,r,fill,stroke,lw){ctx.beginPath();for(var hx=0;hx<6;hx++){var ha=hx/6*6.2832-1.5708,px=cx+Math.cos(ha)*r,py=cy+Math.sin(ha)*r;if(hx===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();
     if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=lw||1;ctx.strokeStyle=stroke;ctx.stroke();}}
   hex(0,-9,13,shade("#4a3f12","#201a07",0,-22,0,4),col,1.7);
   hex(-4.6,-12.4,3.9,"#0a0803","#6b5f1d",1);hex(4.6,-12.4,3.9,"#0a0803","#6b5f1d",1);
   hex(0,-5.2,3.9,"#0a0803","#6b5f1d",1);
   var pulse=0.55+0.45*Math.sin(B.t*3.2);hex(0,-5.2,2.7,"rgba(250,204,21,"+pulse.toFixed(2)+")");   /* светится соты с «личинкой» */
   ctx.fillStyle="#fff7cc";ctx.globalAlpha=0.2;ctx.beginPath();ctx.ellipse(-4,-17,5,1.8,-0.5,0,6.2832);ctx.fill();ctx.globalAlpha=1;
   for(var ob=0;ob<2;ob++){var oa=B.t*2.2+ob*3.1416,bx=Math.cos(oa)*18,by=-10+Math.sin(oa)*6,bz=Math.sin(oa)>0?1:0.85;
     ctx.fillStyle="rgba(220,240,255,.8)";ctx.beginPath();ctx.ellipse(bx,by-2.8,2.8*bz,1.2,0,0,6.2832);ctx.fill();
     ctx.fillStyle="#facc15";ctx.beginPath();ctx.ellipse(bx,by,3.5*bz,2.5*bz,0,0,6.2832);ctx.fill();
     ctx.fillStyle="#191919";ctx.fillRect(bx-1.2,by-2,1,4);}
 },
 railgun:function(t,col){
   /* накопитель-конденсатор и два рельса, сходящихся к дульному срезу */
   metal(-14,3,28,9,col,2);
   ctx.fillStyle=col;[-9,-3,3,9].forEach(function(bx,i){ctx.globalAlpha=0.35+0.45*((Math.sin(B.t*4+i)+1)/2);ctx.fillRect(bx-1.1,5,2.2,5);});ctx.globalAlpha=1;
   ctx.strokeStyle="#2a4262";ctx.lineWidth=2.6;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-8,3.4);ctx.lineTo(-3,-3);ctx.moveTo(8,3.4);ctx.lineTo(3,-3);ctx.stroke();
   aimed(t,0,-3,function(){var r=t.recoil*0.8;
     ctx.fillStyle="#0b121d";ctx.fillRect(-4.4,-6,8.8,9);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(-4.4,-6,8.8,9);
     ctx.fillStyle=shade("#34506f","#121f33",-3,0,3,0);ctx.fillRect(-3.8,-34+r,2.6,31);ctx.fillRect(1.2,-34+r,2.6,31);   /* рельсы */
     ctx.strokeStyle="#f472b6";ctx.lineWidth=1.8;[-28,-21,-14,-8].forEach(function(ry){ctx.beginPath();ctx.moveTo(-5.4,ry+r);ctx.lineTo(5.4,ry+r);ctx.stroke();});   /* катушки */
     ctx.fillStyle="#0a0f18";ctx.fillRect(-1.2,-34+r,2.4,31);
     ctx.save();ctx.shadowColor="#f472b6";ctx.shadowBlur=8;ctx.fillStyle="#ffffff";ctx.fillRect(-3.8,-35.4+r,7.6,2);ctx.restore();
   });
 },
 gravity:function(t,col){
   /* эмиттер-тарелка на колонне, над ней — аккреционные кольца вокруг сингулярности */
   pedestal(col,12,7,6);
   ctx.fillStyle="#1d3350";ctx.strokeStyle=col;ctx.lineWidth=1.2;
   ctx.beginPath();ctx.moveTo(-9,6);ctx.lineTo(9,6);ctx.lineTo(5,-1);ctx.lineTo(-5,-1);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle="rgba(140,181,255,.18)";ctx.beginPath();ctx.moveTo(-5,-1);ctx.lineTo(5,-1);ctx.lineTo(9,-9);ctx.lineTo(-9,-9);ctx.closePath();ctx.fill();   /* луч захвата */
   var tm=B.t;
   ctx.save();ctx.translate(0,-14);
   ctx.fillStyle="rgba(140,181,255,.14)";ctx.beginPath();ctx.arc(0,0,16,0,6.2832);ctx.fill();
   ctx.rotate(tm*0.9);ctx.strokeStyle="#8cb5ff";ctx.shadowColor="#8cb5ff";ctx.shadowBlur=9;ctx.lineWidth=2.4;
   ctx.beginPath();ctx.ellipse(0,0,12,5,0,0,6.2832);ctx.stroke();
   ctx.rotate(-tm*1.8);ctx.strokeStyle="#b8d0ff";ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(0,0,6.4,12,-0.5,0,6.2832);ctx.stroke();
   ctx.shadowBlur=0;ctx.fillStyle="#04040b";ctx.beginPath();ctx.arc(0,0,6.2,0,6.2832);ctx.fill();
   ctx.strokeStyle="#e4ecff";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,3.8,0.6,5.2);ctx.stroke();
   ctx.restore();
 },
 tesla:function(t,col){
   ctx.strokeStyle=col;ctx.lineWidth=1.3;
   [[14,10],[11,3],[8,-4]].forEach(function(p,i){var rw=p[0],ry=p[1];
     ctx.fillStyle=shade("#34506f","#101c2e",0,ry-4,0,ry+4);ctx.beginPath();ctx.ellipse(0,ry,rw,rw*0.34,0,0,6.2832);ctx.fill();ctx.stroke();});
   metal(-2.4,-15,4.8,22,col,1.2);
   ctx.strokeStyle=col;ctx.lineWidth=1.1;for(var cw=0;cw<5;cw++){var cy=4-cw*4;ctx.beginPath();ctx.moveTo(-3.6,cy);ctx.lineTo(3.6,cy-1.6);ctx.stroke();}
   ctx.save();ctx.shadowColor="#a06bff";ctx.shadowBlur=13;ctx.fillStyle=shade("#f1e3ff","#a97ff0",-4,-26,4,-14);ctx.beginPath();ctx.arc(0,-21,6.2,0,6.2832);ctx.fill();ctx.restore();
   ctx.fillStyle="rgba(255,255,255,.65)";ctx.beginPath();ctx.arc(-2,-23,1.8,0,6.2832);ctx.fill();
   if(Math.random()<0.4){ctx.strokeStyle="rgba(216,180,254,.9)";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,-27);
     var ax=0,ay=-27;for(var z=0;z<3;z++){ax+=Math.random()*10-5;ay-=2.4+Math.random()*2.4;ctx.lineTo(ax,ay);}ctx.stroke();}
 }
};
function drawGenericTurret(t,col){
 pedestal(col,10,7,14);
 aimed(t,0,-3,function(){metal(-6,-6,12,8,col,1.6);ctx.fillStyle="#0d1420";ctx.fillRect(-1.6,-16+t.recoil*0.6,3.2,11);});
}
function drawUnit(t){
 var col=t.isSoldier?liveryCol():t.cfg.color;
 t.recoil=Math.max(0,(t.recoil||0)-1.1);
 ctx.save();ctx.translate(t.x,t.y);
 ctx.scale(0.88,0.88); /* турели и солдат чуть меньше; подпись уровня ниже — вне save/restore, не масштабируется */
 drawPad(col);
 if(t.isSoldier)drawGuardian(t,col);
 else(TURRET_DRAW[t.cfg.id]||drawGenericTurret)(t,col);
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
 var wave="WAVE "+B.wave+" / "+finalWave();
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
/* Fortress base: a 120-degree, r112 HP arc; no shield mechanic. */
function drawBaseHp(){
 var ratio=Math.max(0,Math.min(1,B.baseHp/B.baseMax));
 var livery=B.elite?"#bc8ee3":({classic:"#2ee6c8",arctic:"#90d5ff",ember:"#ff995e"}[META.livery]||"#2ee6c8");
 var color=ratio<0.25?"#ff5470":ratio<=0.5?"#ffd34d":livery;
 var alpha=ratio<0.25?0.7+0.3*Math.sin(B.t*6):1;
 ctx.save();ctx.globalAlpha=Math.max(0.4,alpha);
 ctx.lineWidth=7;ctx.lineCap="round";
 ctx.strokeStyle="rgba(130,165,175,.22)";ctx.beginPath();ctx.arc(W/2,BASEY+22,112,Math.PI*7/6,Math.PI*11/6);ctx.stroke();
 if(ratio>0){ctx.strokeStyle=B.baseFlashT>0?"#ffffff":color;ctx.beginPath();ctx.arc(W/2,BASEY+22,112,Math.PI*1.5-Math.PI/3*ratio,Math.PI*1.5+Math.PI/3*ratio);ctx.stroke();}
 ctx.font="800 "+(B.baseHitTextT>0?16:14)+"px 'Segoe UI',sans-serif";
 ctx.textAlign="center";ctx.lineWidth=2.8;ctx.strokeStyle=color;ctx.strokeText(Math.ceil(B.baseHp),W/2,BASEY-118);
 ctx.fillStyle=B.baseHitTextT>0?"#ff5470":"#f6ffff";ctx.fillText(Math.ceil(B.baseHp),W/2,BASEY-118);
 ctx.restore();
}
/* Visual-only Disruption strips use circular collision fields unchanged. All fields draw below enemies. */
function drawBattleFields(){
 var strips=[];
 B.fields.forEach(function(f){
  if(f.kind!=="slow")return;
  var y=Math.max(VIS_TOP+40,Math.min(BASEY-80,f.y)),h=Math.max(56,Math.min(96,2*f.r));
  var opacity=Math.min(1,(f.age||0)/0.15,Math.max(0,f.life)/0.3);
  if(opacity<=0)return;
  var near=strips.filter(function(s){return Math.abs(s.y-y)<40;})[0];
  if(near){near.y=(near.y*near.count+y)/(near.count+1);near.count++;near.h=Math.max(h,near.h);near.opacity=Math.max(near.opacity,opacity);}
  else strips.push({y:y,h:h,opacity:opacity,count:1,seed:f.seed||0});
 });
 strips.forEach(function(s){
  ctx.save();ctx.globalAlpha=s.opacity;
  var grad=ctx.createLinearGradient(0,s.y-s.h/2,0,s.y+s.h/2);
  grad.addColorStop(0,"rgba(56,200,255,.05)");grad.addColorStop(.5,"rgba(56,200,255,.16)");grad.addColorStop(1,"rgba(56,200,255,.05)");
  ctx.fillStyle=grad;ctx.fillRect(0,s.y-s.h/2,W,s.h);
  ctx.fillStyle="rgba(138,232,255,.10)";
  for(var k=0;k<6;k++){var x=(s.seed*19+k*79+B.t*(12+k%3*4))%(W+130)-65;ctx.beginPath();ctx.ellipse(x,s.y+Math.sin(s.seed+k)*s.h*.28,28+k%3*13,6+k%2*6,0,0,6.29);ctx.fill();}
  ctx.strokeStyle="rgba(56,200,255,.65)";ctx.lineWidth=2;ctx.shadowColor="#38c8ff";ctx.shadowBlur=6;
  [s.y-s.h/2,s.y+s.h/2].forEach(function(y){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();});
  ctx.restore();
 });
 B.fields.forEach(function(f){
  if(f.kind==="slow")return;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(.26,f.life/7));
  var col=f.kind==="matrix"?"#a06bff":f.kind==="gravity"?"#7a8cff":"#ff8538";
  ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=f.kind==="gravity"?2.7:2;
  if(f.kind==="firetrail"){ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  else{ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();ctx.stroke();}
  if(f.kind==="gravity"){
   ctx.globalAlpha=.72;ctx.strokeStyle="#d2d8ff";ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.35+.08*Math.sin(B.t*5)),B.t,B.t+Math.PI*1.6);ctx.stroke();
   for(var j=0;j<4;j++){var a=B.t*5+j*Math.PI/2,r=f.r*(.17+.26*(j%3)/3);ctx.fillStyle="#d2d8ff";ctx.beginPath();ctx.arc(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,1.8,0,6.29);ctx.fill();}
   if(f.src){ctx.globalAlpha=.3;ctx.strokeStyle="#8cb5ff";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(f.src.x,f.src.y-13);ctx.lineTo(f.x,f.y);ctx.stroke();}
  }
  ctx.restore();
 });
}
/* ---------- враги: у каждого типа свой силуэт ----------
   Без градиентов и shadowBlur: врагов в кадре до ~70, на телефоне это дорого. Объём даётся наложением
   плоских слоёв (база → тень → блик → детали). Форма зависит от e.seed (стабильна у конкретного врага). */
function enemyTones(e){var fl=e.flash>0;
 return{fl:fl,base:fl?"#ffffff":e.color,lt:fl?"#ffffff":tint(e.color,0.34),dk:fl?"#cfd9e6":tint(e.color,-0.42),deep:fl?"#b8c6d8":tint(e.color,-0.65)};}
/* вершины неправильного многоугольника считаются один раз на врага и кэшируются (раньше — ~30 вызовов sin() за кадр) */
function shapePts(e,n,jit){var key="p"+n,c=e.shp||(e.shp={});if(c[key])return c[key];
 var a=[];for(var i=0;i<n;i++){var ang=i/n*6.2832,rr=1-jit+hrand(e.seed,i)*jit*2;a.push(Math.cos(ang)*rr,Math.sin(ang)*rr);}return(c[key]=a);}
/* путь: кэшированный многоугольник, масштаб s и сдвиг (ox,oy). Объём — «тёмное тело + сдвинутое светлое»,
   без clip(): clip с большой заливкой на мобильном канвасе заметно дороже */
function blobE(e,n,jit,s,ox,oy){var p=shapePts(e,n,jit),r=e.r*s;ctx.beginPath();
 for(var i=0;i<p.length;i+=2){var x=ox+p[i]*r,y=oy+p[i+1]*r;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();}
/* направление света «сверху-слева» остаётся неизменным, пока тело вращается */
function lightOff(rot,dx,dy){var c=Math.cos(rot),sn=Math.sin(rot);return[dx*c+dy*sn,-dx*sn+dy*c];}

function eMeteor(e,k){var r=e.r,sd=e.seed,small=r<11,rot=e.phase*0.12+sd*6.28,lo=lightOff(rot,-r*0.07,-r*0.08);
 ctx.save();ctx.rotate(rot);
 blobE(e,9,0.17,1,0,0);ctx.fillStyle=k.dk;ctx.fill();                               /* тёмное тело */
 blobE(e,9,0.17,0.9,lo[0],lo[1]);ctx.fillStyle=k.base;ctx.fill();                   /* освещённая часть */
 if(!small){var hl=lightOff(rot,-r*0.36,-r*0.4);ctx.globalAlpha=0.38;ctx.fillStyle=k.lt;ctx.beginPath();ctx.arc(hl[0],hl[1],r*0.4,0,6.2832);ctx.fill();ctx.globalAlpha=1;}
 if(!small)for(var i=0;i<3;i++){var a=hrand(sd,20+i)*6.28,d=r*(0.22+hrand(sd,30+i)*0.3),cr=r*(0.13+hrand(sd,40+i)*0.1),cx=Math.cos(a)*d,cy=Math.sin(a)*d;
   ctx.fillStyle=k.deep;ctx.globalAlpha=0.7;ctx.beginPath();ctx.ellipse(cx,cy,cr,cr*0.78,a,0,6.2832);ctx.fill();ctx.globalAlpha=1;}
 /* раскалённые трещины (не выходят за контур) */
 ctx.strokeStyle="#ff9a3c";ctx.lineWidth=Math.max(0.9,r*0.085);ctx.lineCap="round";ctx.globalAlpha=k.fl?0.4:0.95;
 ctx.beginPath();for(var c=0;c<(small?2:3);c++){var ca=hrand(sd,50+c)*6.28,ca2=ca+(hrand(sd,60+c)-0.5)*1.2;
   ctx.moveTo(Math.cos(ca)*r*0.12,Math.sin(ca)*r*0.12);ctx.lineTo(Math.cos(ca2)*r*0.5,Math.sin(ca2)*r*0.5);ctx.lineTo(Math.cos(ca2+0.25)*r*0.8,Math.sin(ca2+0.25)*r*0.8);}
 ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle="rgba(255,138,60,.9)";ctx.beginPath();ctx.arc(0,0,r*0.26,0,6.2832);ctx.fill();
 if(!small){ctx.fillStyle="rgba(255,225,160,.9)";ctx.beginPath();ctx.arc(0,0,r*0.12,0,6.2832);ctx.fill();}
 blobE(e,9,0.17,1,0,0);ctx.strokeStyle=k.deep;ctx.lineWidth=1;ctx.stroke();
 ctx.restore();
 ctx.strokeStyle="rgba(255,160,70,.55)";ctx.lineWidth=Math.max(1.2,r*0.14);ctx.lineCap="round";ctx.beginPath();ctx.arc(0,0,r*1.02,0.55,Math.PI-0.55);ctx.stroke();   /* разогретая передняя кромка (низ) */
}
function eFast(e,k){var r=e.r,sway=Math.sin(e.phase*1.8)*0.5;
 ctx.fillStyle="rgba(255,150,60,.14)";ctx.beginPath();ctx.moveTo(-r*0.95,0);ctx.lineTo(sway,-r*4.4);ctx.lineTo(r*0.95,0);ctx.closePath();ctx.fill();
 ctx.fillStyle="rgba(255,196,100,.28)";ctx.beginPath();ctx.moveTo(-r*0.55,0);ctx.lineTo(sway,-r*2.9);ctx.lineTo(r*0.55,0);ctx.closePath();ctx.fill();
 ctx.fillStyle=k.base;ctx.beginPath();ctx.moveTo(0,r*1.25);ctx.quadraticCurveTo(r*1.1,r*0.25,r*0.66,-r*0.75);ctx.lineTo(0,-r*1.0);ctx.lineTo(-r*0.66,-r*0.75);ctx.quadraticCurveTo(-r*1.1,r*0.25,0,r*1.25);ctx.closePath();ctx.fill();
 ctx.fillStyle=k.dk;ctx.globalAlpha=0.55;ctx.beginPath();ctx.moveTo(0,r*1.25);ctx.quadraticCurveTo(r*1.1,r*0.25,r*0.66,-r*0.75);ctx.lineTo(0,-r*1.0);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle=k.lt;ctx.globalAlpha=0.5;ctx.beginPath();ctx.ellipse(-r*0.3,-r*0.1,r*0.16,r*0.42,0.15,0,6.2832);ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle="#ffe6b0";ctx.beginPath();ctx.arc(0,r*0.28,r*0.34,0,6.2832);ctx.fill();
 ctx.fillStyle="#ff8a3c";ctx.beginPath();ctx.arc(0,r*0.28,r*0.18,0,6.2832);ctx.fill();
}
function eArmored(e,k){var r=e.r,sd=e.seed;
 ctx.save();ctx.rotate(Math.sin(e.phase*0.35+sd*6)*0.1);
 function oct(sc,ox,oy){ctx.beginPath();for(var i=0;i<8;i++){var a=i/8*6.2832+0.3927,px=ox+Math.cos(a)*r*sc,py=oy+Math.sin(a)*r*sc;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();}
 oct(1,0,0);ctx.fillStyle=k.dk;ctx.fill();
 oct(0.92,-r*0.05,-r*0.06);ctx.fillStyle=k.base;ctx.fill();
 ctx.fillStyle=k.lt;ctx.globalAlpha=0.35;ctx.beginPath();ctx.moveTo(-r*0.4,-r*0.9);ctx.lineTo(r*0.4,-r*0.9);ctx.lineTo(r*0.62,-r*0.68);ctx.lineTo(-r*0.62,-r*0.68);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 ctx.strokeStyle=k.deep;ctx.lineWidth=1.2;ctx.beginPath();                                   /* швы плит */
 ctx.moveTo(-r*0.9,0);ctx.lineTo(r*0.9,0);ctx.moveTo(0,-r*0.9);ctx.lineTo(0,r*0.9);ctx.stroke();
 ctx.fillStyle="#0e1219";ctx.beginPath();ctx.ellipse(0,0,r*0.5,r*0.16,0,0,6.2832);ctx.fill();   /* вентиляционная щель с жаром */
 ctx.fillStyle="rgba(255,138,60,.95)";ctx.beginPath();ctx.ellipse(0,0,r*0.36,r*0.09,0,0,6.2832);ctx.fill();
 ctx.fillStyle=k.lt;ctx.beginPath();for(var q=0;q<4;q++){var ra=0.3927+q*1.5708;ctx.moveTo(Math.cos(ra)*r*0.7+r*0.075,Math.sin(ra)*r*0.7);ctx.arc(Math.cos(ra)*r*0.7,Math.sin(ra)*r*0.7,r*0.075,0,6.2832);}ctx.fill();   /* заклёпки */
 oct(1,0,0);ctx.strokeStyle=k.deep;ctx.lineWidth=1.6;ctx.stroke();
 ctx.restore();
}
function eFlyer(e,k){var r=e.r,w=Math.sin(B.t*(e.hoverT>0?27:18)+e.phase);
 [-1,1].forEach(function(s){
   ctx.fillStyle=k.dk;ctx.beginPath();ctx.moveTo(s*r*0.55,-r*0.15);ctx.lineTo(s*(r+13),-r*0.95-w*6);ctx.lineTo(s*(r+9.5),r*0.05-w*3.4);ctx.lineTo(s*(r+3),r*0.62);ctx.lineTo(s*r*0.45,r*0.55);ctx.closePath();ctx.fill();
   ctx.strokeStyle=k.lt;ctx.globalAlpha=0.55;ctx.lineWidth=0.9;ctx.beginPath();
   ctx.moveTo(s*r*0.5,0);ctx.lineTo(s*(r+13),-r*0.95-w*6);ctx.moveTo(s*r*0.5,0);ctx.lineTo(s*(r+9.5),r*0.05-w*3.4);ctx.moveTo(s*r*0.5,0);ctx.lineTo(s*(r+3),r*0.62);ctx.stroke();ctx.globalAlpha=1;
 });
 ctx.fillStyle=k.base;ctx.beginPath();ctx.ellipse(0,0,r*0.86,r*0.98,0,0,6.2832);ctx.fill();
 ctx.fillStyle=k.dk;ctx.globalAlpha=0.5;ctx.beginPath();ctx.ellipse(r*0.2,r*0.25,r*0.66,r*0.76,0,0,6.2832);ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle=k.lt;ctx.globalAlpha=0.5;ctx.beginPath();ctx.ellipse(-r*0.25,-r*0.4,r*0.3,r*0.2,-0.5,0,6.2832);ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle=k.deep;ctx.beginPath();ctx.moveTo(-r*0.28,-r*0.78);ctx.lineTo(0,-r*1.35);ctx.lineTo(r*0.28,-r*0.78);ctx.closePath();ctx.fill();   /* хвостовой шип */
 ctx.fillStyle=k.fl?"#fff":"#7ef0d4";ctx.beginPath();ctx.arc(-r*0.34,r*0.14,r*0.2,0,6.2832);ctx.arc(r*0.34,r*0.14,r*0.2,0,6.2832);ctx.fill();
 ctx.fillStyle="#06201a";ctx.beginPath();ctx.arc(-r*0.34,r*0.2,r*0.08,0,6.2832);ctx.arc(r*0.34,r*0.2,r*0.08,0,6.2832);ctx.fill();
}
function eSplitter(e,k){var r=e.r,sd=e.seed,pl=0.6+0.4*Math.sin(e.phase*1.4),rot=e.phase*0.07+sd*6,lo=lightOff(rot,-r*0.07,-r*0.08),br=1+.03*Math.sin(B.t*2+e.phase);
 ctx.save();ctx.scale(br,br);ctx.save();ctx.rotate(rot);
 blobE(e,10,0.14,1,0,0);ctx.fillStyle=k.dk;ctx.fill();
 blobE(e,10,0.14,0.9,lo[0],lo[1]);ctx.fillStyle=k.base;ctx.fill();
 var hl=lightOff(rot,-r*0.38,-r*0.4);ctx.fillStyle=k.lt;ctx.globalAlpha=0.32;ctx.beginPath();ctx.arc(hl[0],hl[1],r*0.28,0,6.2832);ctx.fill();
 ctx.fillStyle=k.deep;ctx.globalAlpha=0.5;ctx.beginPath();for(var m=0;m<4;m++){var mx=(hrand(sd,70+m)-0.5)*r*1.0,my=(hrand(sd,80+m)-0.5)*r*1.0;ctx.moveTo(mx+r*0.1,my);ctx.arc(mx,my,r*0.1,0,6.2832);}ctx.fill();ctx.globalAlpha=1;
 blobE(e,10,0.14,1,0,0);ctx.strokeStyle=k.deep;ctx.lineWidth=1.1;ctx.stroke();
 ctx.restore();
 /* два «зародыша» в прозрачных ячейках, трещина между ними */
 [[-r*0.32,r*0.16],[r*0.3,-r*0.12]].forEach(function(p,i){
   ctx.fillStyle="rgba(10,30,14,.55)";ctx.beginPath();ctx.arc(p[0],p[1],r*0.3,0,6.2832);ctx.fill();
   ctx.fillStyle=k.fl?"#fff":"rgba(168,230,150,"+(0.7+0.3*pl).toFixed(2)+")";ctx.beginPath();ctx.arc(p[0],p[1],r*0.22+pl*r*0.03*(i?-1:1),0,6.2832);ctx.fill();
   ctx.fillStyle="rgba(255,255,255,.6)";ctx.beginPath();ctx.arc(p[0]-r*0.07,p[1]-r*0.08,r*0.06,0,6.2832);ctx.fill();});
 ctx.strokeStyle="rgba(10,20,10,.65)";ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-r*0.1,-r*0.7);ctx.lineTo(r*0.08,-r*0.25);ctx.lineTo(-r*0.06,r*0.12);ctx.lineTo(r*0.1,r*0.72);ctx.stroke();
 ctx.restore();
}
function eHealer(e,k){var r=e.r,pu=Math.sin(e.phase*2);
 ctx.fillStyle="rgba(74,222,128,.14)";ctx.beginPath();ctx.arc(0,0,r+7+pu*1.6,0,6.2832);ctx.fill();
 ctx.save();ctx.rotate(e.phase*0.35);
 ctx.fillStyle=k.dk;ctx.beginPath();for(var s=0;s<10;s++){var a=s/10*6.2832-1.5708,sr=s%2?r*0.58:r*1.04;ctx.lineTo(Math.cos(a)*sr,Math.sin(a)*sr);}ctx.closePath();ctx.fill();
 ctx.fillStyle=k.base;ctx.beginPath();for(var q=0;q<10;q++){var b=q/10*6.2832-1.5708,qr=q%2?r*0.5:r*0.9;ctx.lineTo(Math.cos(b)*qr,Math.sin(b)*qr);}ctx.closePath();ctx.fill();
 ctx.restore();
 ctx.fillStyle="rgba(255,255,255,.18)";ctx.beginPath();ctx.arc(-r*0.2,-r*0.25,r*0.34,0,6.2832);ctx.fill();
 ctx.fillStyle=k.fl?"#ffffff":"#eafff2";ctx.fillRect(-r*0.15,-r*0.5,r*0.3,r);ctx.fillRect(-r*0.5,-r*0.15,r,r*0.3);
 ctx.strokeStyle=e.hoverT>0?"rgba(74,222,128,.95)":"rgba(74,222,128,.7)";ctx.lineWidth=e.hoverT>0?2:1.4;ctx.beginPath();ctx.arc(0,0,r+4+pu*1.6,0,6.2832);ctx.stroke();
}
function eElite(e,k){var r=e.r;
 ctx.save();ctx.rotate(Math.sin(e.phase*0.3)*0.12);
 function star(sc,ox,oy){ctx.beginPath();for(var i=0;i<16;i++){var a=i/16*6.2832-1.5708,rr=(i%2?r*0.7:r*1.1)*sc;if(i===0)ctx.moveTo(ox+Math.cos(a)*rr,oy+Math.sin(a)*rr);else ctx.lineTo(ox+Math.cos(a)*rr,oy+Math.sin(a)*rr);}ctx.closePath();}
 star(1,0,0);ctx.fillStyle=k.dk;ctx.fill();
 star(0.9,-r*0.05,-r*0.06);ctx.fillStyle=k.base;ctx.fill();
 star(1,0,0);ctx.strokeStyle=k.deep;ctx.lineWidth=1.2;ctx.stroke();
 ctx.beginPath();for(var j=0;j<8;j++){var b=j/8*6.2832+0.3927;if(j===0)ctx.moveTo(Math.cos(b)*r*0.62,Math.sin(b)*r*0.62);else ctx.lineTo(Math.cos(b)*r*0.62,Math.sin(b)*r*0.62);}ctx.closePath();
 ctx.fillStyle=k.lt;ctx.globalAlpha=0.28;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=k.deep;ctx.lineWidth=1;ctx.stroke();
 ctx.fillStyle="#12060b";ctx.beginPath();ctx.ellipse(0,0,r*0.4,r*0.2,0,0,6.2832);ctx.fill();
 ctx.fillStyle=k.fl?"#fff":"#ff9a3c";ctx.beginPath();ctx.ellipse(0,0,r*0.3,r*0.13,0,0,6.2832);ctx.fill();
 ctx.fillStyle="#fff2c0";ctx.beginPath();ctx.arc(0,0,r*0.07,0,6.2832);ctx.fill();
 ctx.restore();
}
function ePhase(e,k){var r=e.r,fl=0.8+0.2*Math.sin(e.phase*5);
 [[2.1,0.1],[1.2,0.2]].forEach(function(p){ctx.globalAlpha=p[1]*fl;ctx.fillStyle=k.lt;ctx.beginPath();ctx.moveTo(0,-r*p[0]+r);ctx.lineTo(r*0.62,-r*p[0]);ctx.lineTo(0,-r*p[0]-r*0.9);ctx.lineTo(-r*0.62,-r*p[0]);ctx.closePath();ctx.fill();});
 ctx.globalAlpha=1;
 ctx.fillStyle=k.base;ctx.beginPath();ctx.moveTo(0,r*1.3);ctx.lineTo(r*0.72,-r*0.1);ctx.lineTo(0,-r*1.0);ctx.lineTo(-r*0.72,-r*0.1);ctx.closePath();ctx.fill();
 ctx.fillStyle=k.dk;ctx.globalAlpha=0.55;ctx.beginPath();ctx.moveTo(0,r*1.3);ctx.lineTo(r*0.72,-r*0.1);ctx.lineTo(0,-r*1.0);ctx.lineTo(0,r*0.15);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 ctx.strokeStyle=k.lt;ctx.lineWidth=1;ctx.globalAlpha=0.7;ctx.beginPath();ctx.moveTo(0,r*1.3);ctx.lineTo(0,-r*1.0);ctx.moveTo(-r*0.72,-r*0.1);ctx.lineTo(r*0.72,-r*0.1);ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle="rgba(5,20,40,.8)";ctx.beginPath();ctx.ellipse(0,r*0.1,r*0.3,r*0.17,0,0,6.2832);ctx.fill();
 ctx.fillStyle=k.fl?"#fff":"#8ff3ff";ctx.beginPath();ctx.arc(0,r*0.1,r*0.12,0,6.2832);ctx.fill();
}
function eCharger(e,k){var r=e.r,ch=(e.chargeMul||1)>1.2,fl=Math.sin(B.t*40+e.phase),len=ch?r*2.4+fl*r*0.3:r*0.9+fl*r*0.12;
 ctx.fillStyle="rgba(255,120,40,.35)";ctx.beginPath();ctx.moveTo(-r*0.5,-r*0.85);ctx.lineTo(0,-r*0.85-len*1.25);ctx.lineTo(r*0.5,-r*0.85);ctx.closePath();ctx.fill();
 ctx.fillStyle=ch?"#ffd27a":"#ff9a4d";ctx.beginPath();ctx.moveTo(-r*0.3,-r*0.85);ctx.lineTo(0,-r*0.85-len);ctx.lineTo(r*0.3,-r*0.85);ctx.closePath();ctx.fill();
 ctx.fillStyle=k.dk;ctx.beginPath();ctx.moveTo(-r*0.6,-r*0.55);ctx.lineTo(-r*1.2,-r*1.05);ctx.lineTo(-r*0.95,r*0.35);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(r*0.6,-r*0.55);ctx.lineTo(r*1.2,-r*1.05);ctx.lineTo(r*0.95,r*0.35);ctx.closePath();ctx.fill();
 ctx.fillStyle=k.base;ctx.beginPath();ctx.moveTo(0,r*1.3);ctx.lineTo(r*0.98,-r*0.1);ctx.lineTo(r*0.72,-r*0.92);ctx.lineTo(-r*0.72,-r*0.92);ctx.lineTo(-r*0.98,-r*0.1);ctx.closePath();ctx.fill();
 ctx.fillStyle=k.dk;ctx.globalAlpha=0.5;ctx.beginPath();ctx.moveTo(0,r*1.3);ctx.lineTo(r*0.98,-r*0.1);ctx.lineTo(r*0.72,-r*0.92);ctx.lineTo(0,-r*0.92);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle=k.lt;ctx.globalAlpha=0.45;ctx.beginPath();ctx.moveTo(0,r*0.95);ctx.lineTo(-r*0.5,0);ctx.lineTo(-r*0.4,-r*0.6);ctx.lineTo(0,-r*0.2);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle="#0e0a08";ctx.beginPath();ctx.moveTo(-r*0.34,-r*0.08);ctx.lineTo(r*0.34,-r*0.08);ctx.lineTo(0,r*0.38);ctx.closePath();ctx.fill();
 ctx.fillStyle=k.fl?"#fff":(ch?"#fff1b0":"#ff8a3c");ctx.beginPath();ctx.moveTo(-r*0.22,-r*0.04);ctx.lineTo(r*0.22,-r*0.04);ctx.lineTo(0,r*0.26);ctx.closePath();ctx.fill();
 ctx.strokeStyle=k.deep;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(0,r*1.3);ctx.lineTo(r*0.98,-r*0.1);ctx.lineTo(r*0.72,-r*0.92);ctx.lineTo(-r*0.72,-r*0.92);ctx.lineTo(-r*0.98,-r*0.1);ctx.closePath();ctx.stroke();
}
function eBoss(e,k){var r=e.r,pu=0.5+0.5*Math.sin(B.t*2.4);
 ctx.save();ctx.rotate(e.phase*0.04);
 ctx.fillStyle=k.fl?"#ffffff":tint(e.color,0.12);ctx.beginPath();                      /* шипы-«корона» */
 for(var i=0;i<12;i++){var a=i/12*6.2832,a1=a-0.17,a2=a+0.17;ctx.moveTo(Math.cos(a1)*r*0.9,Math.sin(a1)*r*0.9);ctx.lineTo(Math.cos(a)*r*1.26,Math.sin(a)*r*1.26);ctx.lineTo(Math.cos(a2)*r*0.9,Math.sin(a2)*r*0.9);}
 ctx.fill();
 ctx.restore();
 var rot=-e.phase*0.02,lo=lightOff(rot,-r*0.05,-r*0.06);
 ctx.save();ctx.rotate(rot);
 blobE(e,12,0.09,1,0,0);ctx.fillStyle=k.dk;ctx.fill();
 blobE(e,12,0.09,0.92,lo[0],lo[1]);ctx.fillStyle=k.base;ctx.fill();
 ctx.fillStyle=k.lt;ctx.globalAlpha=0.28;ctx.beginPath();                              /* бронеплиты вокруг ядра (внутри контура) */
 for(var p=0;p<6;p++){var pa=p/6*6.2832+0.5;
   ctx.moveTo(Math.cos(pa)*r*0.5,Math.sin(pa)*r*0.5);ctx.lineTo(Math.cos(pa)*r*0.86,Math.sin(pa)*r*0.86);ctx.lineTo(Math.cos(pa+0.9)*r*0.86,Math.sin(pa+0.9)*r*0.86);ctx.lineTo(Math.cos(pa+0.9)*r*0.5,Math.sin(pa+0.9)*r*0.5);ctx.closePath();}
 ctx.fill();
 ctx.globalAlpha=1;ctx.strokeStyle=k.deep;ctx.lineWidth=1.6;ctx.beginPath();
 for(var q=0;q<6;q++){var sa=q/6*6.2832+0.5;ctx.moveTo(Math.cos(sa)*r*0.5,Math.sin(sa)*r*0.5);ctx.lineTo(Math.cos(sa)*r*0.88,Math.sin(sa)*r*0.88);}
 ctx.stroke();
 blobE(e,12,0.09,1,0,0);ctx.strokeStyle=k.deep;ctx.lineWidth=1.8;ctx.stroke();
 ctx.restore();
 ctx.fillStyle="#1a0508";ctx.beginPath();ctx.arc(0,0,r*0.5,0,6.2832);ctx.fill();         /* ядро */
 ctx.fillStyle="rgba(255,90,60,"+(0.55+pu*0.35).toFixed(2)+")";ctx.beginPath();ctx.arc(0,0,r*0.42,0,6.2832);ctx.fill();
 ctx.fillStyle=k.fl?"#fff":"#ffb15c";ctx.beginPath();ctx.arc(0,0,r*(0.26+pu*0.04),0,6.2832);ctx.fill();
 ctx.fillStyle="#fff4cf";ctx.beginPath();ctx.arc(-r*0.04,-r*0.05,r*0.1,0,6.2832);ctx.fill();
 ctx.strokeStyle=k.lt;ctx.lineWidth=1.4;ctx.globalAlpha=0.7;ctx.beginPath();ctx.arc(0,0,r*0.5,0,6.2832);ctx.stroke();ctx.globalAlpha=1;
}
function drawEnemyBody(e){
 if(e.seed===undefined)e.seed=hrand(e.phase,7); /* зерно формы берётся один раз — от случайной начальной фазы */
 var k=enemyTones(e);
 switch(e.cfg.id){
  case "fast":eFast(e,k);break;
  case "armored":eArmored(e,k);break;
  case "meteor":case "mini":eMeteor(e,k);break;
  default:
   switch(e.kind){
    case "healer":eHealer(e,k);break;
    case "splitter":eSplitter(e,k);break;
    case "flyer":eFlyer(e,k);break;
    case "elite":eElite(e,k);break;
    case "phase":ePhase(e,k);break;
    case "charger":eCharger(e,k);break;
    case "boss":eBoss(e,k);break;
    default:eMeteor(e,k);
   }
 }
}
function drawEnemy(e){
 ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.visualScale||1,e.visualScale||1);
 if(e.kind==="phase"&&e.cloakT>0&&!e.revealedT)ctx.globalAlpha=0.38;
 drawEnemyBody(e);
 if(e.cfg.id==="elite"){ctx.strokeStyle="#ff7ab8";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-e.r*1.2,-e.r*1.2);ctx.lineTo(e.r*1.2,e.r*1.2);ctx.moveTo(e.r*1.2,-e.r*1.2);ctx.lineTo(-e.r*1.2,e.r*1.2);ctx.stroke();}   /* метка элиты */
 if(e.cfg.id==="phase"&&e.cloakT>0){ctx.fillStyle="rgba(131,164,217,.3)";for(var ph=0;ph<3;ph++){ctx.beginPath();ctx.arc(0,-e.r-6-ph*7,2+ph,0,6.2832);ctx.fill();}}   /* «пар» скрытности */
 if(e.kind==="charger"){ctx.strokeStyle="#ff9a4d";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.r+2+Math.sin(B.t*14)*1.5,0,6.2832);ctx.stroke();}
 if(e.kind==="elite"||e.kind==="boss"){ctx.strokeStyle="#ffd34d";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.r+4+Math.sin(e.phase*2)*1.5,0,6.2832);ctx.stroke();}
 if(e.slowFactor<1){ctx.strokeStyle="rgba(56,200,255,.8)";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,e.r+2,0,6.2832);ctx.stroke();}
 if(e.champion){
   ctx.save();
   ctx.strokeStyle=B.elite?"rgba(228,141,255,.94)":"rgba(255,211,77,.8)";
   ctx.shadowColor="#d884ff";ctx.shadowBlur=13;ctx.lineWidth=2.2;
   ctx.beginPath();ctx.arc(0,0,e.r+6+Math.sin(B.t*5+e.phase)*1.2,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle="#f2c3ff";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText("✦",0,-e.r-8);
   ctx.restore();
 }
 ctx.restore();
 /* полоса HP и число HP босса — без изменений относительно существующего интерфейса */
 if(e.hp<e.maxHp||e.champion){var bh=e.kind==="boss"?6:e.r<12?3:4;
   ctx.fillStyle="#20060c";ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2,bh);
   ctx.fillStyle=e.champion?"#d88cff":e.kind==="boss"?"#ff5470":"#4ade80";ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2*Math.max(0,e.hp/e.maxHp),bh);
   if(e.kind==="boss"){ctx.font="700 10px sans-serif";ctx.textAlign="right";ctx.fillStyle="#ffe9ce";ctx.fillText(Math.ceil(e.hp),e.x+e.r*1.2,e.y-e.r-13);}
 }
}
function draw(){
 /* рендерим в физических пикселях экрана, рисуя в логических координатах 420×700 */
 ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);
 ctx.clearRect(0,0,W,H);
 var sx=B.shake?(Math.random()*B.shake-B.shake/2):0, sy=B.shake?(Math.random()*B.shake-B.shake/2):0;
 ctx.save();ctx.translate(sx,sy);ctx.lineJoin="round";
 /* Three-layer dusk background: sky gradient, distant ruins and low mist. */
 var sky=ctx.createLinearGradient(0,0,0,BASEY);
 var hue=B.elite?["#0d0714","#261020"]:({classic:["#04060c","#11202a"],arctic:["#050b18","#122538"],ember:["#110b11","#31211d"]}[META.livery]||["#04060c","#11202a"]);
 sky.addColorStop(0,hue[0]);sky.addColorStop(1,hue[1]);
 ctx.fillStyle=sky;ctx.fillRect(-14,-14,W+28,H+28);
 ctx.fillStyle="rgba(140,180,220,.36)";
 for(var i=0;i<28;i++){var px=(i*67)%W,py=((i*131)+(B.t*2*(1+i%3))%H)%H;ctx.fillRect(px,py,1.1,1.1);}
 for(var s=0;s<11;s++){
  var bw=24+(s*17)%20,bh=20+(s*29)%43,bx=s*41-8;
  ctx.fillStyle="#05080f";ctx.globalAlpha=.9;ctx.fillRect(bx,BASEY+10-bh,bw,bh);
  if(s%3!==0){ctx.fillStyle="rgba(255,200,100,.5)";ctx.fillRect(bx+7,BASEY+16-bh+10,1.5,1.5);}
 }
 ctx.globalAlpha=1;
 var haze=ctx.createLinearGradient(0,BASEY-95,0,BASEY+20);
 haze.addColorStop(0,"rgba(55,88,100,0)");haze.addColorStop(1,"rgba(82,115,120,.11)");
 ctx.fillStyle=haze;ctx.fillRect(0,BASEY-95,W,115);
 /* HUD is drawn last, over enemies and projectiles. */
 /* Visual-only atmosphere: a wide low ellipse, translucent over the fortress. */
 var tint=B.elite?[188,142,227]:({classic:[46,230,200],arctic:[144,213,255],ember:[255,153,94]}[META.livery]||[46,230,200]);
 var domeColor=B.baseFlashT>0?[255,84,112]:tint;
 function rgba(c,a){return "rgba("+c.join(",")+","+a+")";}
 ctx.save();
 var dg=ctx.createLinearGradient(0,BASEY-48,0,BASEY+14);
 dg.addColorStop(0,rgba(domeColor,B.baseFlashT>0?.11:.06));
 dg.addColorStop(1,rgba(domeColor,B.baseFlashT>0?.18:.14));
 ctx.beginPath();ctx.moveTo(W/2-205,BASEY+14);ctx.ellipse(W/2,BASEY+14,205,62,0,Math.PI,Math.PI*2);ctx.closePath();
 ctx.fillStyle=dg;ctx.fill();
 ctx.strokeStyle=rgba(domeColor,B.baseFlashT>0?.65:.35);ctx.lineWidth=1.5;ctx.shadowColor=rgba(domeColor,.35);ctx.shadowBlur=8;
 ctx.beginPath();ctx.ellipse(W/2,BASEY+14,205,62,0,Math.PI,Math.PI*2);ctx.stroke();ctx.restore();
 /* палуба базы: турели и солдат СТОЯТ на ней, на одном уровне с базой */
 ctx.fillStyle="#101c2e";ctx.fillRect(0,BASEY+14,W,H-(BASEY+14));
 ctx.fillStyle="rgba(46,230,200,.4)";ctx.fillRect(0,BASEY+14,W,2);
 ctx.fillStyle="#16283e";ctx.fillRect(0,BASEY+14,W,8);
 ctx.font="26px serif";ctx.textAlign="center";ctx.fillText("🏰",W/2,BASEY+12);
 /* HP arc is drawn over the units; see drawBaseHp(). */
 /* пустые слоты турелей */
 TURRET_X.forEach(function(x,i){
   if(!B.turrets.some(function(t){return t.slot===i;})){
     ctx.strokeStyle="rgba(143,168,181,.35)";ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(x,LINE_Y,15,0,6.29);ctx.stroke();ctx.setLineDash([]);
     ctx.font="8.5px 'Segoe UI',sans-serif";ctx.fillStyle="rgba(143,168,181,.8)";ctx.textAlign="center";ctx.fillText("СЛОТ",x,LINE_Y+26);
   }
 });
 drawBattleFields();
 /* враги */
 B.enemies.forEach(drawEnemy);
 /* Hive выпускает рой пчёл: полосатое тельце, машущие крылья, жало */
 B.drones.forEach(function(d){
   var flap=Math.sin(B.t*46+d.x*0.7)*0.5;
   ctx.save();ctx.translate(d.x,d.y);
   ctx.fillStyle="rgba(220,240,255,.8)";
   ctx.beginPath();ctx.ellipse(-3,-4.6,4.8,2.1,-0.7-flap*0.35,0,6.29);ctx.fill();
   ctx.beginPath();ctx.ellipse(3,-4.6,4.8,2.1,0.7+flap*0.35,0,6.29);ctx.fill();
   ctx.fillStyle=d.isEcho?"#b7baff":"#facc15";ctx.beginPath();ctx.ellipse(0,0,7.1,4.4,0,0,6.29);ctx.fill();
   ctx.fillStyle="#191919";ctx.fillRect(-3,-4.1,2.3,8.2);ctx.fillRect(0.9,-4.1,2.3,8.2);
   ctx.fillStyle="#fff7cc";ctx.beginPath();ctx.arc(5.2,0,1.7,0,6.29);ctx.fill();ctx.strokeStyle="#e5ba39";ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(-10,1.5);ctx.stroke();
   ctx.restore();
 });
 B.wheels.forEach(function(w){ctx.save();ctx.translate(w.x,w.y);ctx.rotate(B.t*12);ctx.shadowColor="#ff8a3c";ctx.shadowBlur=18;ctx.strokeStyle="#ffb03c";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,14,0,6.29);ctx.stroke();for(var i=0;i<3;i++){var a=i*2.094;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*13,Math.sin(a)*13);ctx.stroke();}ctx.restore();});
 allFighters().forEach(drawUnit);
 drawBaseHp();
 /* снаряды: у каждого типа турели свой силуэт и свечение */
 B.projs.forEach(function(p){
   var id=p.src.cfg.id,col=p.src.cfg.color;
   ctx.save();ctx.shadowColor=col;
   if(id==="skyguard"){ /* ракета: корпус по курсу полёта, конус и огненный выхлоп */
     ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));
     ctx.shadowBlur=8;ctx.fillStyle="#e5edf5";ctx.fillRect(-7,-2.6,13,5.2);
     ctx.fillStyle="#ff5470";ctx.beginPath();ctx.moveTo(6,-2.6);ctx.lineTo(11,0);ctx.lineTo(6,2.6);ctx.closePath();ctx.fill();
     ctx.fillStyle="#5b7a8c";ctx.fillRect(-7,-4.6,3.4,2);ctx.fillRect(-7,2.6,3.4,2);
     ctx.shadowColor="#ff8a3c";ctx.shadowBlur=12;ctx.fillStyle="#ffb03c";ctx.beginPath();ctx.arc(-8.6,0,3.4+Math.random()*1.3,0,6.29);ctx.fill();
   }else if(id==="tesla"){ /* летящий заряд энергии: фиолетовая сфера с белым ядром и искрами */
     ctx.shadowColor="#a06bff";ctx.shadowBlur=16;ctx.fillStyle="#a06bff";ctx.beginPath();ctx.arc(p.x,p.y,5.8,0,6.29);ctx.fill();
     ctx.shadowBlur=0;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(p.x,p.y,2.3,0,6.29);ctx.fill();
     ctx.strokeStyle="rgba(216,180,254,.8)";ctx.lineWidth=1.5;ctx.beginPath();
     ctx.moveTo(p.x-p.vx*.04,p.y-p.vy*.04);
     ctx.lineTo(p.x-p.vx*.027+Math.sin(B.t*40)*3,p.y-p.vy*.027);
     ctx.lineTo(p.x-p.vx*.014-Math.sin(B.t*45)*3,p.y-p.vy*.014);
     ctx.lineTo(p.x,p.y);ctx.stroke();
     ctx.strokeStyle="rgba(216,180,254,.9)";ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(p.x-3,p.y-6);ctx.lineTo(p.x+1,p.y-10-Math.random()*3);ctx.moveTo(p.x+4,p.y+3);ctx.lineTo(p.x+8+Math.random()*3,p.y+6);ctx.stroke();
   }else if(id==="railgun"){ /* длинный розовый след-штрих и белое ядро */
     ctx.lineWidth=3.5;ctx.shadowBlur=10;ctx.strokeStyle=col;
     ctx.beginPath();ctx.moveTo(p.x-p.vx*0.12,p.y-p.vy*0.12);ctx.lineTo(p.x,p.y);ctx.stroke();
     ctx.shadowBlur=0;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,6.29);ctx.fill();
   }else if(id==="disruption"){ /* пульсирующее кольцо-импульс */
     ctx.lineWidth=2;ctx.shadowBlur=8;ctx.strokeStyle=col;
     ctx.globalAlpha=Math.max(.25,p.life/2.6);ctx.beginPath();ctx.arc(p.x,p.y,4+(2.6-p.life)/2.6*8,0,6.29);ctx.stroke();
     ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,2,0,6.29);ctx.fill();
   }else if(id==="aeroblast"){ /* вращающаяся воздушная дуга-вихрь */
     ctx.lineWidth=2.6;ctx.shadowBlur=6;ctx.strokeStyle=col;
     var a0=B.t*18+p.x*0.05;ctx.beginPath();ctx.arc(p.x,p.y,6.5,a0,a0+4.2);ctx.stroke();
   }else if(id==="beam"){ /* тяжёлый энергозаряд с белым ядром */
     ctx.shadowBlur=16;ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,5.6+Math.min(2,p.src.beamRamp||0)*1.5,0,6.29);ctx.fill();
     ctx.shadowBlur=0;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,6.29);ctx.fill();
   }else if(id==="firewheel"){ /* огненный шар */
     ctx.shadowColor="#ff8a3c";ctx.shadowBlur=13;ctx.fillStyle="#ffb03c";ctx.beginPath();ctx.arc(p.x,p.y,4.6,0,6.29);ctx.fill();
     ctx.shadowBlur=0;ctx.fillStyle="#ff8a3c";ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,6.29);ctx.fill();
   }else{ /* трассеры: Sky Guard — жёлтые, солдат — золотые, покороче/подлиннее */
     ctx.lineWidth=id==="soldier"?3.2:2;ctx.shadowBlur=id==="soldier"?10:6;ctx.strokeStyle=id==="soldier"?"#ffd34d":col;
     var tl=id==="soldier"?0.07:0.03;
     ctx.beginPath();ctx.moveTo(p.x-p.vx*tl,p.y-p.vy*tl);ctx.lineTo(p.x,p.y);ctx.stroke();
   }
   ctx.restore();
 });
 B.beams.forEach(function(b){
  ctx.save();ctx.globalAlpha=1-b.t/b.life;
  function strokeBeam(w,color,blur){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.shadowColor=b.color;ctx.shadowBlur=blur;ctx.beginPath();ctx.moveTo(b.x1,b.y1);if(b.arc&&b.mx!==undefined)ctx.lineTo(b.mx,b.my);ctx.lineTo(b.x2,b.y2);ctx.stroke();}
  if(b.color==="#4ade80"&&b.w>=3){strokeBeam(12,"rgba(74,222,128,.35)",12);strokeBeam(6,"#4ade80",8);strokeBeam(3,"#ffffff",4);}
  else strokeBeam(b.w,b.color,7);
  ctx.restore();
 });
 B.rings.forEach(function(r){ctx.save();ctx.globalAlpha=1-r.t/r.life;ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,6.29);ctx.stroke();ctx.restore();});
 B.parts.forEach(function(p){
  ctx.save();ctx.globalAlpha=1-p.t/p.life;
  if(p.kind==="muzzle"){ctx.strokeStyle=p.color;ctx.lineWidth=4;ctx.shadowColor=p.color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,p.r,p.angle-.44,p.angle+.44);ctx.stroke();}
  else {ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.29);ctx.fill();}
  ctx.restore();
 });
 /* числа урона: крит — золото, уязвимость врага — оранжевым крупнее, сопротивление — приглушённо */
 B.nums.forEach(function(n){ctx.save();ctx.globalAlpha=1-n.t/0.85;ctx.font=(n.crit?"800 17px":(n.rm>1.15?"800 14.5px":"700 12px"))+" 'Segoe UI',sans-serif";ctx.textAlign="center";ctx.fillStyle=n.heal?"#4ade80":n.crit?"#ff9f2e":(n.rm>1.15?"#ff7a4d":(n.rm<0.85?"#8fa8b5":"#ffffff"));ctx.fillText(n.txt,n.x,n.y);ctx.restore();});
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

