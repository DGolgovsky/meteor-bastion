/* ---------- draw ---------- */
/* ---------- shared drawing helpers ---------- */
var LIVERY_COL={classic:"#2ee6c8",arctic:"#90d5ff",ember:"#ff995e"};
function liveryCol(){return LIVERY_COL[META.livery]||LIVERY_COL.classic;}
/* rounded rectangle without ctx.roundRect (it is missing in old Android WebViews) */
function rrPath(x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));
 ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function shade(c1,c2,x0,y0,x1,y1){var g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,c1);g.addColorStop(1,c2);return g;}
/* deterministic seeded "noise": each enemy's shape is stable from frame to frame, but differs between enemies */
function hrand(seed,i){var v=Math.sin(seed*127.1+i*311.7)*43758.5453;return v-Math.floor(v);}
var _tintCache={};
/* lighten (amt>0) or darken (amt<0) a #rrggbb color */
function tint(hex,amt){var key=hex+"|"+amt;if(_tintCache[key])return _tintCache[key];
 if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
 var n=parseInt(hex.slice(1),16),R=n>>16,G=(n>>8)&255,Bl=n&255;
 function f(c){return Math.max(0,Math.min(255,Math.round(amt<0?c*(1+amt):c+(255-c)*amt)));}
 return(_tintCache[key]="rgb("+f(R)+","+f(G)+","+f(Bl)+")");}
function glowDot(x,y,r,c,blur){ctx.save();ctx.shadowColor=c;ctx.shadowBlur=blur||r*2.4;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.fill();ctx.restore();}
/* ---------- projectile rendering: tapered motion trails and gradient glows ----------
   Glows are radial gradients instead of shadowBlur (crisper at high DPR, much cheaper on phones).
   Trails come from p.tr, the position history recorded by update() (flat x,y,t triplets, pruned by age,
   so the length does not depend on frame rate). A projectile without history yet (just fired) falls back
   to a short straight streak along its velocity. Nothing here uses Math.random: flicker is a function of B.t. */
var _glowCache={};
function glowRgba(hex,a){var key=hex+"|"+a;if(_glowCache[key])return _glowCache[key];
 if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
 var n=parseInt(hex.slice(1),16);return(_glowCache[key]="rgba("+(n>>16)+","+((n>>8)&255)+","+(n&255)+","+a+")");}
/* comet tail: widest at the projectile, tapering to nothing over `dur` seconds; w = full width at the head,
   col = body colour, core = colour of a thin bright centre line (or falsy for none) */
function projTrail(p,dur,w,col,core){
 var tr=p.tr,pts;
 if(tr&&tr.length>=6)pts=tr;else{var k=dur*0.6;pts=[p.x-p.vx*k,p.y-p.vy*k,B.t-k,p.x,p.y,B.t];}
 var m=pts.length/3,s=0,i;
 while(s<m-2&&B.t-pts[3*s+5]>=dur)s++; /* drop expired points, keeping one anchor so the tail has no visible cut */
 var n=m-s,xs=[],ys=[],nx=[],ny=[],hw=[];
 for(i=0;i<n;i++){
  var a=3*(s+Math.max(i-1,0)),b=3*(s+Math.min(i+1,n-1)),dx=pts[b]-pts[a],dy=pts[b+1]-pts[a+1],d=Math.sqrt(dx*dx+dy*dy)||1;
  xs.push(pts[3*(s+i)]);ys.push(pts[3*(s+i)+1]);nx.push(-dy/d);ny.push(dx/d);
  hw.push(Math.max(0,1-(B.t-pts[3*(s+i)+2])/dur));
 }
 var hx=xs[n-1],hy=ys[n-1];
 if(Math.abs(hx-xs[0])+Math.abs(hy-ys[0])<1.5)return;
 var gc=ctx.createLinearGradient(xs[0],ys[0],hx,hy);gc.addColorStop(0,glowRgba(col,0));gc.addColorStop(1,glowRgba(col,1));
 function ribbon(scale,style,alpha){
  ctx.globalAlpha=alpha;ctx.fillStyle=style;ctx.beginPath();
  for(i=0;i<n;i++){var h=w*0.5*scale*hw[i];if(i===0)ctx.moveTo(xs[i]+nx[i]*h,ys[i]+ny[i]*h);else ctx.lineTo(xs[i]+nx[i]*h,ys[i]+ny[i]*h);}
  for(i=n-1;i>=0;i--){var h2=w*0.5*scale*hw[i];ctx.lineTo(xs[i]-nx[i]*h2,ys[i]-ny[i]*h2);}
  ctx.closePath();ctx.fill();
  if(scale<=1){ctx.beginPath();ctx.arc(hx,hy,w*0.5*scale,0,6.29);ctx.fill();} /* round head (solid layers only) */
 }
 ribbon(2.4,gc,0.18);ribbon(1,gc,0.88);
 if(core){var gw=ctx.createLinearGradient(xs[0],ys[0],hx,hy);gw.addColorStop(0,glowRgba(core,0));gw.addColorStop(1,glowRgba(core,1));ribbon(0.38,gw,0.95);}
 ctx.globalAlpha=1;
}
/* glowing head: soft radial halo, solid disc, bright centre */
function projOrb(x,y,r,col,core){
 var g=ctx.createRadialGradient(x,y,0,x,y,r*2.7);
 g.addColorStop(0,glowRgba(col,0.6));g.addColorStop(0.4,glowRgba(col,0.22));g.addColorStop(1,glowRgba(col,0));
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*2.7,0,6.29);ctx.fill();
 ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,6.29);ctx.fill();
 if(core){ctx.fillStyle=core;ctx.beginPath();ctx.arc(x,y,r*0.45,0,6.29);ctx.fill();}
}
/* metal panel: vertical gradient, accent outline and a highlight along the top edge */
function metal(x,y,w,h,col,r,lw){
 rrPath(x,y,w,h,r===undefined?1.6:r);
 ctx.fillStyle=shade("#34506f","#121f33",x,y,x,y+h);ctx.fill();
 ctx.lineWidth=lw||1.1;ctx.strokeStyle=col;ctx.stroke();
 ctx.fillStyle="rgba(255,255,255,.16)";ctx.fillRect(x+1.2,y+0.9,Math.max(0,w-2.4),Math.min(1.3,h/4));
}
/* trapezoid pedestal the mount stands on (bottom edge y=12 is the deck) */
function pedestal(col,w1,w2,h){
 ctx.beginPath();ctx.moveTo(-w1,12);ctx.lineTo(w1,12);ctx.lineTo(w2,12-h);ctx.lineTo(-w2,12-h);ctx.closePath();
 ctx.fillStyle=shade("#2f4a69","#0f1b2d",0,12-h,0,12);ctx.fill();
 ctx.lineWidth=1.2;ctx.strokeStyle=col;ctx.stroke();
 ctx.fillStyle=col;ctx.globalAlpha=0.75;ctx.fillRect(-w2+1.5,12-h+1.6,(w2-1.5)*2,1.1);ctx.globalAlpha=1;
}
/* rotating head: origin at the rotation axis, "forward" = −y */
function aimed(t,px,py,fn){ctx.save();ctx.translate(px,py);ctx.rotate(t.angle+Math.PI/2);ctx.translate(0,Math.min(4,t.recoil*.7));fn();ctx.restore();}
/* landing pad */
function drawPad(col){
 ctx.fillStyle="rgba(0,0,0,.5)";ctx.beginPath();ctx.ellipse(0,14.6,23,4,0,0,6.2832);ctx.fill();
 ctx.fillStyle="#101617";ctx.beginPath();ctx.moveTo(-21,15);ctx.lineTo(-16,10);ctx.lineTo(16,10);ctx.lineTo(21,15);ctx.closePath();ctx.fill();
 ctx.fillStyle="#394644";ctx.fillRect(-15,10,30,1.4);
 ctx.fillStyle=col;ctx.globalAlpha=.38;ctx.fillRect(-10,11.8,20,1);ctx.globalAlpha=1;
}

/* ---------- Guardian: a fighter with a helmet, body armor, arms and a rifle ---------- */
function drawGuardian(t,col){
 var ca=Math.cos(t.angle);
 /* the fighter faces the target; near vertical it does not jitter (hysteresis) */
 if(Math.abs(ca)>0.14||!t.facing)t.facing=ca<0?-1:1;
 var f=t.facing,la=Math.atan2(Math.sin(t.angle),f*ca),rc=t.recoil*0.55,tm=B.t;
 var br=Math.sin(tm*2.6)*0.45;               /* light breathing */
 ctx.save();ctx.scale(f,1);ctx.lineCap="round";ctx.lineJoin="round";
 /* legs and boots */
 ctx.strokeStyle="#263a52";ctx.lineWidth=3.6;
 ctx.beginPath();ctx.moveTo(-2.6,1.5);ctx.lineTo(-4.2,10.6);ctx.moveTo(2.6,1.5);ctx.lineTo(4.4,10.6);ctx.stroke();
 ctx.strokeStyle="#34506f";ctx.lineWidth=1.2;
 ctx.beginPath();ctx.moveTo(-3.2,4);ctx.lineTo(-3.8,8);ctx.moveTo(3.2,4);ctx.lineTo(3.9,8);ctx.stroke();
 ctx.fillStyle="#0d1420";rrPath(-7.2,10,5.6,2.6,1.2);ctx.fill();rrPath(1.6,10,6.2,2.6,1.2);ctx.fill();
 /* ammo backpack on the back */
 ctx.fillStyle="#17283d";rrPath(-10,-9+br,4.6,10,1.4);ctx.fill();
 ctx.strokeStyle=col;ctx.globalAlpha=0.8;ctx.lineWidth=0.9;ctx.stroke();ctx.globalAlpha=1;
 /* torso: body armor, plate and livery on the shoulders */
 rrPath(-6.6,-10+br,13.2,12.6,2.2);ctx.fillStyle=shade("#2d6a54","#17382d",0,-10,0,3);ctx.fill();
 ctx.lineWidth=0.9;ctx.strokeStyle="rgba(0,0,0,.45)";ctx.stroke();
 ctx.fillStyle="rgba(255,255,255,.10)";rrPath(-4.2,-8.4+br,8.4,5.2,1.3);ctx.fill();
 ctx.fillStyle=col;ctx.fillRect(-6.6,-10+br,13.2,2.2);
 ctx.fillStyle="#0d1420";ctx.fillRect(-6.6,1.2,13.2,1.5);ctx.fillStyle="#8fa8b5";ctx.fillRect(-1.2,1.1,2.4,1.7);
 /* the far hand holds the handguard */
 var cs=Math.cos(la),sn=Math.sin(la),SX=2.4,SY=-6.4+br;
 var gx=SX+cs*(8.5-rc),gy=SY+sn*(8.5-rc)+0.9,tx=SX+cs*(2.2-rc),ty=SY+sn*(2.2-rc)+1.6;
 ctx.strokeStyle="#1d4a3a";ctx.lineWidth=2.8;
 ctx.beginPath();ctx.moveTo(-2.8,-7.2+br);ctx.quadraticCurveTo((-2.8+gx)/2-0.5,(-7.2+gy)/2+3,gx,gy);ctx.stroke();
 /* the near hand on the grip */
 ctx.strokeStyle="#256650";ctx.beginPath();ctx.moveTo(SX,SY);ctx.quadraticCurveTo((SX+tx)/2-0.4,(SY+ty)/2+2.4,tx,ty);ctx.stroke();
 ctx.fillStyle="#d9b380";ctx.beginPath();ctx.arc(gx,gy,1.5,0,6.2832);ctx.arc(tx,ty,1.5,0,6.2832);ctx.fill();
 /* rifle: rotates around the shoulder (the local angle is always "forward", never upside down) */
 ctx.save();ctx.translate(SX,SY);ctx.rotate(la);ctx.translate(-rc,0);
 ctx.fillStyle="#1a2638";rrPath(-6.2,-1.5,7,3.4,1);ctx.fill();                  /* stock */
 ctx.fillStyle=shade("#3a4f66","#18222f",0,-2,0,2.4);rrPath(0,-2,11,4.2,1);ctx.fill();    /* receiver */
 ctx.fillStyle="#10161f";ctx.fillRect(3.2,2,2.4,3.6);                          /* magazine */
 ctx.fillStyle="#0d1420";rrPath(11,-1.1,7.4,2.2,0.8);ctx.fill();                /* barrel */
 ctx.fillStyle="#7b97a8";ctx.fillRect(17.4,-1.5,2,3);                          /* muzzle brake */
 ctx.fillStyle=col;ctx.globalAlpha=0.85;ctx.fillRect(1,-0.3,8.4,0.9);ctx.globalAlpha=1;
 ctx.fillStyle="#0d1420";rrPath(3.2,-3.6,5,1.8,0.7);ctx.fill();                /* sight */
 ctx.fillStyle=col;ctx.beginPath();ctx.arc(8,-2.7,0.8,0,6.2832);ctx.fill();
 if(t.recoil>2.4){                                                              /* muzzle flash */
   ctx.save();ctx.shadowColor="#ffd34d";ctx.shadowBlur=9;ctx.fillStyle="#fff3b0";
   ctx.beginPath();ctx.moveTo(19.4,0);ctx.lineTo(22.5,-3);ctx.lineTo(25,0);ctx.lineTo(22.5,3);ctx.closePath();ctx.fill();ctx.restore();
 }
 ctx.restore();
 /* the head is drawn AFTER the rifle: when aiming upward, the barrel does not cover the face */
 var hx=1.2,hy=-14.6+br;
 ctx.fillStyle="#d9b380";ctx.beginPath();ctx.arc(hx,hy,4.6,0,6.2832);ctx.fill();
 ctx.fillStyle=shade("#59803a","#324d1f",0,hy-6,0,hy);ctx.beginPath();ctx.arc(hx,hy-0.8,5.6,Math.PI,0);ctx.fill();
 ctx.fillRect(hx-5.7,hy-1,11.4,1.7);
 ctx.fillStyle="rgba(255,255,255,.18)";ctx.beginPath();ctx.arc(hx-1.2,hy-3.2,2.6,Math.PI*1.1,Math.PI*1.8);ctx.fill();
 ctx.save();ctx.shadowColor=col;ctx.shadowBlur=5;ctx.fillStyle=col;rrPath(hx+0.8,hy-0.2,5,2.5,1);ctx.fill();ctx.restore();
 ctx.restore();
}

/* ---------- turrets ---------- */
var TURRET_DRAW={
 skyguard:function(t,col){
   /* rocket launcher: a pack of 4 tubes on trunnions, rotation axis on the top edge of the pedestal */
   pedestal(col,11,8,8);
   ctx.fillStyle="#1d3350";ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,4,9,2.5,0,0,6.2832);ctx.fill();ctx.stroke();
   aimed(t,0,2,function(){var r=t.recoil*0.6;
     ctx.fillStyle="#22344e";ctx.strokeStyle=col;ctx.lineWidth=1;
     rrPath(-13.2,-4,3.2,9,1);ctx.fill();ctx.stroke();rrPath(10,-4,3.2,9,1);ctx.fill();ctx.stroke();   /* trunnions */
     metal(-10.4,-12+r,20.8,15.5,col,2);
     [-7.4,-2.5,2.5,7.4].forEach(function(tx){
       ctx.fillStyle="#070b13";ctx.fillRect(tx-2.3,-15.4+r,4.6,4.6);                                /* muzzle openings */
       ctx.fillStyle="#e5edf5";ctx.fillRect(tx-1.3,-14.6+r,2.6,3);
       ctx.fillStyle="#ff5470";ctx.beginPath();ctx.moveTo(tx-1.5,-14.6+r);ctx.lineTo(tx,-17.8+r);ctx.lineTo(tx+1.5,-14.6+r);ctx.closePath();ctx.fill();
     });
     ctx.fillStyle=col;ctx.globalAlpha=0.9;ctx.fillRect(-10.4,-3+r,20.8,1.5);ctx.globalAlpha=1;
     ctx.fillStyle="#0a101c";ctx.fillRect(-6,0.4+r,3,1.6);ctx.fillRect(3,0.4+r,3,1.6);                  /* rear nozzles */
   });
 },
 laser:function(t,col){
   /* tripod mast; the emitter prism sits right on its top */
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
   /* emitter well on the deck and the cone of the containment field */
   ctx.strokeStyle="rgba(56,200,255,.4)";ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,12,13,3.4,0,0,6.2832);ctx.stroke();
   ctx.fillStyle="rgba(56,200,255,.10)";ctx.beginPath();ctx.moveTo(-9,-8+bob);ctx.lineTo(9,-8+bob);ctx.lineTo(13,12);ctx.lineTo(-13,12);ctx.closePath();ctx.fill();
   ctx.save();ctx.translate(0,-15+bob);
   ctx.fillStyle=shade("#2c4a6c","#10203a",0,-6,0,6);ctx.strokeStyle=col;ctx.lineWidth=1.4;
   ctx.beginPath();ctx.ellipse(0,0,12.6,6.2,0,0,6.2832);ctx.fill();ctx.stroke();
   ctx.fillStyle="rgba(56,200,255,.9)";ctx.beginPath();ctx.ellipse(0,-2.2,5.8,3.2,0,Math.PI,0);ctx.fill();
   ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.ellipse(-1.6,-3.6,2.2,1,-0.3,0,6.2832);ctx.fill();
   for(var li=0;li<4;li++){var la=tm*2.2+li*1.571;glowDot(Math.cos(la)*9.6,Math.sin(la)*3.6+0.6,1.1,"#bff0ff",4);}   /* running lights along the rim */
   var rp=Math.sin(tm*24)*6;ctx.strokeStyle=col;ctx.lineWidth=1.6;                                                       /* stabilizers */
   ctx.beginPath();ctx.moveTo(-18,-3);ctx.lineTo(-11+rp,-3);ctx.moveTo(18,-3);ctx.lineTo(11-rp,-3);ctx.stroke();
   ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,5.4,2,0,6.2832);ctx.fill();
   ctx.restore();
 },
 aeroblast:function(t,col){
   pedestal(col,11,8,8);
   ctx.fillStyle=shade("#2c4a6c","#10203a",0,-18,0,2);ctx.strokeStyle=col;ctx.lineWidth=1.6;
   ctx.beginPath();ctx.arc(0,-8,10.8,0,6.2832);ctx.fill();ctx.stroke();
   ctx.fillStyle="#071522";ctx.beginPath();ctx.arc(0,-8,8.2,0,6.2832);ctx.fill();
   var sp=B.t*9;                                                                      /* impeller: 4 blades */
   for(var fb=0;fb<4;fb++){var fa=sp+fb*1.5708;ctx.fillStyle=fb%2?"#5fc6ee":"#8fe0ff";
     ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(Math.cos(fa-0.32)*8,-8+Math.sin(fa-0.32)*8);ctx.lineTo(Math.cos(fa+0.32)*8,-8+Math.sin(fa+0.32)*8);ctx.closePath();ctx.fill();}
   ctx.fillStyle="#cfeeff";ctx.beginPath();ctx.arc(0,-8,2,0,6.2832);ctx.fill();
   aimed(t,0,-8,function(){                                                          /* the nozzle faces the target */
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
     ctx.strokeStyle=col;ctx.lineWidth=1.3;                                         /* coil windings */
     for(var cw=0;cw<5;cw++){var cy=-1-cw*3.8;ctx.beginPath();ctx.moveTo(ex-2.6,cy);ctx.lineTo(ex+2.6,cy-1.6);ctx.stroke();}
   });
   glowDot(-6.4,-22,3.4,"#e9d5ff",t.recoil>0?16:8);glowDot(6.4,-22,3.4,"#e9d5ff",t.recoil>0?16:8);
   var spark=Math.floor(B.t*20)+t.x;
   ctx.strokeStyle="rgba(216,180,254,"+(0.35+hrand(spark,0)*0.5)+")";ctx.lineWidth=1.3;ctx.beginPath();
   ctx.moveTo(-6.4,-22);
   for(var j=1;j<=3;j++)ctx.lineTo(-6.4+j*3.2+(hrand(spark,j)-0.5)*1.6,-22+hrand(spark,j+3)*7-3.5);
   ctx.lineTo(6.4,-22);ctx.stroke();
 },
 beam:function(t,col){
   pedestal(col,14,10,9);
   ctx.fillStyle="#1d3350";ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,3,9.5,2.6,0,0,6.2832);ctx.fill();ctx.stroke();
   aimed(t,0,0,function(){var r=t.recoil*0.7;
     metal(-7.6,-6,15.2,10,col,2);                                                  /* body on the axis */
     metal(-3.8,-24+r,7.6,19,col,1.4);                                              /* barrel */
     ctx.strokeStyle=col;ctx.lineWidth=1;
     for(var fin=0;fin<4;fin++){ctx.beginPath();ctx.moveTo(-5.6,-20+fin*3.6+r);ctx.lineTo(5.6,-20+fin*3.6+r);ctx.stroke();}   /* cooling fins */
     ctx.fillStyle="#0a2236";ctx.fillRect(-2,-24.4+r,4,2);
     ctx.save();ctx.shadowColor="#7dd7ff";ctx.shadowBlur=9;ctx.fillStyle="#bfeaff";ctx.fillRect(-3.8,-26+r,7.6,2.2);ctx.restore();
     glowDot(0,-0.6,2.1,"#7dd7ff",7);
   });
 },
 firewheel:function(t,col){
   /* brazier stand and the fire wheel */
   ctx.strokeStyle="#3a3f4d";ctx.lineWidth=3;ctx.lineCap="round";
   ctx.beginPath();ctx.moveTo(-9,12);ctx.lineTo(0,-5);ctx.lineTo(9,12);ctx.stroke();
   ctx.strokeStyle="#59606f";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5.4,6);ctx.lineTo(5.4,6);ctx.stroke();
   metal(-5,-5,10,4,"#ff8a3c",1.4);
   var tm=B.t;
   ctx.save();ctx.translate(0,-13);
   ctx.fillStyle="rgba(255,138,60,.16)";ctx.beginPath();ctx.arc(0,0,15.5,0,6.2832);ctx.fill();   /* heat */
   ctx.rotate(tm*3.4);
   ctx.strokeStyle="#ff8a3c";ctx.lineWidth=3.2;ctx.beginPath();ctx.arc(0,0,10.2,0,6.2832);ctx.stroke();
   for(var fs=0;fs<6;fs++){var sa=fs*1.0472;ctx.strokeStyle=fs%2?"#ffb03c":"#ff6a2c";ctx.lineWidth=fs%2?1.4:2.2;
     ctx.beginPath();ctx.moveTo(Math.cos(sa)*3,Math.sin(sa)*3);ctx.lineTo(Math.cos(sa)*10,Math.sin(sa)*10);ctx.stroke();}
   ctx.fillStyle="#ffcf6a";                                                                     /* flame tongues along the rim */
   for(var fl=0;fl<8;fl++){var fa=fl*0.7854;ctx.beginPath();ctx.moveTo(Math.cos(fa-0.16)*10.2,Math.sin(fa-0.16)*10.2);
     ctx.lineTo(Math.cos(fa)*(13.6+Math.sin(tm*14+fl*2)*1.6),Math.sin(fa)*(13.6+Math.sin(tm*14+fl*2)*1.6));ctx.lineTo(Math.cos(fa+0.16)*10.2,Math.sin(fa+0.16)*10.2);ctx.closePath();ctx.fill();}
   ctx.restore();
   glowDot(0,-13,3.6,"#ffb03c",10);
 },
 hive:function(t,col){
   /* hive on a support column: a honeycomb pack with a flight hatch and wasps in orbit */
   ctx.strokeStyle="#3a3410";ctx.lineWidth=3.2;ctx.lineCap="round";
   ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(0,1);ctx.stroke();
   ctx.strokeStyle="#6b5f1d";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-6,12);ctx.lineTo(0,3);ctx.lineTo(6,12);ctx.stroke();
   function hex(cx,cy,r,fill,stroke,lw){ctx.beginPath();for(var hx=0;hx<6;hx++){var ha=hx/6*6.2832-1.5708,px=cx+Math.cos(ha)*r,py=cy+Math.sin(ha)*r;if(hx===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();
     if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=lw||1;ctx.strokeStyle=stroke;ctx.stroke();}}
   hex(0,-9,13,shade("#4a3f12","#201a07",0,-22,0,4),col,1.7);
   hex(-4.6,-12.4,3.9,"#0a0803","#6b5f1d",1);hex(4.6,-12.4,3.9,"#0a0803","#6b5f1d",1);
   hex(0,-5.2,3.9,"#0a0803","#6b5f1d",1);
   var pulse=0.55+0.45*Math.sin(B.t*3.2);hex(0,-5.2,2.7,"rgba(250,204,21,"+pulse.toFixed(2)+")");   /* glowing honeycomb cell with a "larva" */
   ctx.fillStyle="#fff7cc";ctx.globalAlpha=0.2;ctx.beginPath();ctx.ellipse(-4,-17,5,1.8,-0.5,0,6.2832);ctx.fill();ctx.globalAlpha=1;
   for(var ob=0;ob<2;ob++){var oa=B.t*2.2+ob*3.1416,bx=Math.cos(oa)*18,by=-10+Math.sin(oa)*6,bz=Math.sin(oa)>0?1:0.85;
     ctx.fillStyle="rgba(220,240,255,.8)";ctx.beginPath();ctx.ellipse(bx,by-2.8,2.8*bz,1.2,0,0,6.2832);ctx.fill();
     ctx.fillStyle="#facc15";ctx.beginPath();ctx.ellipse(bx,by,3.5*bz,2.5*bz,0,0,6.2832);ctx.fill();
     ctx.fillStyle="#191919";ctx.fillRect(bx-1.2,by-2,1,4);}
 },
 railgun:function(t,col){
   /* capacitor bank and two rails converging at the muzzle */
   metal(-14,3,28,9,col,2);
   ctx.fillStyle=col;[-9,-3,3,9].forEach(function(bx,i){ctx.globalAlpha=0.35+0.45*((Math.sin(B.t*4+i)+1)/2);ctx.fillRect(bx-1.1,5,2.2,5);});ctx.globalAlpha=1;
   ctx.strokeStyle="#2a4262";ctx.lineWidth=2.6;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-8,3.4);ctx.lineTo(-3,-3);ctx.moveTo(8,3.4);ctx.lineTo(3,-3);ctx.stroke();
   aimed(t,0,-3,function(){var r=t.recoil*0.8;
     ctx.fillStyle="#0b121d";ctx.fillRect(-4.4,-6,8.8,9);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(-4.4,-6,8.8,9);
     ctx.fillStyle=shade("#34506f","#121f33",-3,0,3,0);ctx.fillRect(-3.8,-34+r,2.6,31);ctx.fillRect(1.2,-34+r,2.6,31);   /* rails */
     ctx.strokeStyle="#f472b6";ctx.lineWidth=1.8;[-28,-21,-14,-8].forEach(function(ry){ctx.beginPath();ctx.moveTo(-5.4,ry+r);ctx.lineTo(5.4,ry+r);ctx.stroke();});   /* coils */
     ctx.fillStyle="#0a0f18";ctx.fillRect(-1.2,-34+r,2.4,31);
     ctx.save();ctx.shadowColor="#f472b6";ctx.shadowBlur=8;ctx.fillStyle="#ffffff";ctx.fillRect(-3.8,-35.4+r,7.6,2);ctx.restore();
   });
 },
 gravity:function(t,col){
   /* emitter dish on a column, above it accretion rings around the singularity */
   pedestal(col,12,7,6);
   ctx.fillStyle="#1d3350";ctx.strokeStyle=col;ctx.lineWidth=1.2;
   ctx.beginPath();ctx.moveTo(-9,6);ctx.lineTo(9,6);ctx.lineTo(5,-1);ctx.lineTo(-5,-1);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle="rgba(140,181,255,.18)";ctx.beginPath();ctx.moveTo(-5,-1);ctx.lineTo(5,-1);ctx.lineTo(9,-9);ctx.lineTo(-9,-9);ctx.closePath();ctx.fill();   /* tractor beam */
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
   var spark=Math.floor(B.t*20)+t.x;
   if(hrand(spark,0)<0.4){ctx.strokeStyle="rgba(216,180,254,.9)";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,-27);
     var ax=0,ay=-27;for(var z=1;z<=3;z++){ax+=hrand(spark,z)*10-5;ay-=2.4+hrand(spark,z+3)*2.4;ctx.lineTo(ax,ay);}ctx.stroke();}
 }
};
function drawGenericTurret(t,col){
 pedestal(col,10,7,14);
 aimed(t,0,-3,function(){metal(-6,-6,12,8,col,1.6);ctx.fillStyle="#0d1420";ctx.fillRect(-1.6,-16+t.recoil*0.6,3.2,11);});
}
function drawUnit(t){
 var col=t.isSoldier?liveryCol():t.cfg.color;
 ctx.save();ctx.translate(t.x,t.y);
 ctx.scale(0.88,0.88); /* turrets and the soldier are slightly smaller; the level label below is outside save/restore and is not scaled */
 drawPad(col);
 if(t.isSoldier)drawGuardian(t,col);
 else(TURRET_DRAW[t.cfg.id]||drawGenericTurret)(t,col);
 ctx.restore();
 if(t.isSoldier&&t.mirrorGuardian){ /* Mirror Guardian clone (50% DMG) */
  ctx.save();ctx.globalAlpha=.45;ctx.translate(mirrorX(t),t.y);ctx.scale(0.8,0.8);drawGuardian(t,"#a5f3fc");ctx.restore();
 }
 if(t.isSoldier&&t.chargedLeft>0){ctx.save();ctx.strokeStyle="#fde047";ctx.lineWidth=2;ctx.globalAlpha=.6+.3*Math.sin(B.t*12);ctx.beginPath();ctx.arc(t.x,t.y-8,22,0,6.29);ctx.stroke();ctx.restore();}
 /* level and the 4 card pips under the unit (3 teal + 1 purple, filled = earned) */
 drawUnitPips(t);
 ctx.font="700 9px 'Segoe UI',sans-serif";ctx.textAlign="center";ctx.fillStyle="#cfe8e2";
 ctx.fillText("Lv."+t.runLv,t.x,t.y+31);
}
function drawUnitPips(t){
 var n=PIPS_PER_LV,step=7,x0=t.x-(n-1)*step/2,y=t.y+19;
 for(var i=0;i<n;i++){
  var cx=x0+i*step,last=i===n-1,on=i<(t.pips||0),col=last?"#a06bff":"#2ee6c8";
  ctx.beginPath();ctx.moveTo(cx,y-3);ctx.lineTo(cx+3,y);ctx.lineTo(cx,y+3);ctx.lineTo(cx-3,y);ctx.closePath();
  ctx.fillStyle=on?col:"#0a1420";ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=col;ctx.stroke();
 }
}
/* Compact single-row HUD. Shorten labels before shrinking text; reserve a measured
   timer column so long late-run values can never paint over it. */
function combatHudLayout(){
 var dps=Math.round(allFighters().reduce(function(sum,t){return sum+t.totalDmg;},0)/Math.max(1,B.elapsed));
 var stage=(B.elite?"ELITE":"NORMAL")+" "+B.stage.n;
 /* no waves are shown: the stream progress is the enemies still to come plus those on the field */
 var items=[stage,"▣ "+fmt((B.stageQueue||0)+B.enemies.length),"DPS "+fmt(dps),"K "+fmt(B.kills)];
 var fs=10.5,gap=7,left=136,time=mmss(B.elapsed),widths=[],timeWidth=0;
 function measure(){ctx.font="800 "+fs+"px 'Segoe UI',sans-serif";widths=items.map(function(s){return ctx.measureText(s).width;});timeWidth=ctx.measureText(time).width;}
 measure();
 function total(){return widths.reduce(function(sum,w){return sum+w;},0)+gap*3;}
 if(total()+timeWidth+gap>W-10-left){items[0]=(B.elite?"E":"N")+B.stage.n;measure();}
 while(fs>9&&total()+timeWidth+gap>W-10-left){fs-=.5;measure();}
 var available=W-10-left-timeWidth-gap;
 return {items:items,widths:widths,font:fs,gap:gap,left:left,time:time,timeWidth:timeWidth,
  scale:Math.min(1,available/Math.max(1,total()))};
}
function drawCombatHud(){
 ctx.save();var h=combatHudLayout();
 ctx.font="800 "+h.font+"px 'Segoe UI',sans-serif";ctx.textAlign="left";
 ctx.save();ctx.translate(h.left,0);ctx.scale(h.scale,1);
 var x=0;
 h.items.forEach(function(s,i){ctx.fillStyle=i===0?(B.elite?"#e6b2ff":"#85deca"):i===2?"#a6bfba":"#d3e3df";ctx.fillText(s,x,18);x+=h.widths[i]+h.gap;});
 ctx.restore();ctx.textAlign="right";ctx.fillStyle="#a2e6d7";ctx.fillText(h.time,W-10,18);ctx.restore();
}
/* Charcoal sky, distant city silhouettes and a low bank of illuminated fog.
   All scenery is deterministic: drawing must not advance combat's random stream. */
function drawBattleBackdrop(){
 var hue=B.elite?["#19171d","#302a33"]:({classic:["#191b1c","#303334"],arctic:["#161c22","#2a353d"],ember:["#211b1a","#3b302c"]}[META.livery]||["#191b1c","#303334"]);
 ctx.fillStyle=shade(hue[0],hue[1],0,0,0,FORTRESS.deckY);ctx.fillRect(-14,-14,W+28,H+28);
 var cloud=ctx.createRadialGradient(W*.28,BASEY*.38,10,W*.28,BASEY*.38,W*.9);
 cloud.addColorStop(0,"rgba(180,185,182,.065)");cloud.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=cloud;ctx.fillRect(0,0,W,FORTRESS.deckY);
 for(var layer=0;layer<3;layer++){
  ctx.fillStyle=["rgba(21,24,26,.18)","rgba(15,19,21,.24)","rgba(10,14,16,.36)"][layer];
  for(var i=0;i<12;i++){
   var x=i*39-25+layer*13,w=20+hrand(layer+7,i)*26,ht=45+hrand(layer+11,i)*150+layer*15,y=FORTRESS.deckY-ht;
   ctx.fillRect(x,y,w,ht);
   if(i%3===0){ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+w*.5,y-26);ctx.lineTo(x+w+3,y);ctx.closePath();ctx.fill();}
   if(i%4===1)ctx.fillRect(x+w*.45,y-42,1.5,42);
  }
 }
 var haze=ctx.createLinearGradient(0,BASEY-155,0,FORTRESS.deckY);
 haze.addColorStop(0,"rgba(149,160,158,0)");haze.addColorStop(.65,"rgba(149,160,158,.06)");haze.addColorStop(1,"rgba(181,192,187,.24)");
 ctx.fillStyle=haze;ctx.fillRect(0,BASEY-155,W,169);
}
function drawFortress(){
 var deck=FORTRESS.deckY,cx=W/2;
 var dome=B.baseFlashT>0?"#ff6a78":B.elite?"#b2a2c5":"#b9d6d7";
 ctx.save();
 var dg=ctx.createLinearGradient(0,deck-FORTRESS.domeRy,0,deck);
 dg.addColorStop(0,glowRgba(dome,.10));dg.addColorStop(.22,glowRgba(dome,.025));dg.addColorStop(1,glowRgba(dome,.12));
 ctx.beginPath();ctx.ellipse(cx,deck,FORTRESS.domeRx,FORTRESS.domeRy,0,Math.PI,Math.PI*2);ctx.closePath();ctx.fillStyle=dg;ctx.fill();
 ctx.strokeStyle=glowRgba(dome,B.baseFlashT>0?.65:.23);ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(cx,deck,FORTRESS.domeRx,FORTRESS.domeRy,0,Math.PI,Math.PI*2);ctx.stroke();
 /* Five passive emitter fittings follow the dome. These are scenery, not slots. */
 for(var i=0;i<5;i++){
  var x=W*(.14+i*.18),q=(x-cx)/FORTRESS.domeRx,y=deck-FORTRESS.domeRy*Math.sqrt(1-q*q)-24;
  ctx.fillStyle="#080d0d";ctx.beginPath();ctx.arc(x,y,11,0,6.29);ctx.fill();
  ctx.strokeStyle="#405f59";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,7,0,6.29);ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,3,0,6.29);ctx.stroke();
  for(var n=0;n<3;n++){var a=n*2.094-Math.PI/2;ctx.fillStyle="#0b1412";ctx.beginPath();ctx.arc(x+Math.cos(a)*7,y+Math.sin(a)*7,2.2,0,6.29);ctx.fill();}
 }
 var halo=ctx.createRadialGradient(cx,deck-14,4,cx,deck-14,130);
 halo.addColorStop(0,"rgba(220,233,216,.34)");halo.addColorStop(.4,"rgba(202,218,207,.13)");halo.addColorStop(1,"rgba(202,218,207,0)");ctx.fillStyle=halo;ctx.fillRect(0,deck-144,W,144);
 /* Central bunker: layered roof, buttresses, lit windows, recessed door. */
 ctx.fillStyle="#323b39";ctx.fillRect(cx-29,deck-29,58,29);
 ctx.fillStyle="#202826";ctx.fillRect(cx-32,deck-22,6,22);ctx.fillRect(cx+26,deck-22,6,22);
 ctx.fillStyle="#3f4945";ctx.beginPath();ctx.moveTo(cx-34,deck-29);ctx.lineTo(cx-26,deck-39);ctx.lineTo(cx+26,deck-39);ctx.lineTo(cx+34,deck-29);ctx.closePath();ctx.fill();
 ctx.fillStyle="#626d64";ctx.fillRect(cx-25,deck-38,50,1.5);
 ctx.fillStyle="#161e1b";ctx.fillRect(cx-7,deck-14,14,14);
 ctx.fillStyle="#c2d4ad";ctx.globalAlpha=.65;
 [-19,0,19].forEach(function(x){ctx.fillRect(cx+x-3,deck-25,6,4);});
 [-19,19].forEach(function(x){ctx.fillRect(cx+x-3,deck-12,6,4);});ctx.globalAlpha=1;
 /* Dark cross-section under the deck, with structural ribs and utility pipes. */
 ctx.fillStyle=shade("#101313","#07090a",0,deck,0,H);ctx.fillRect(0,deck,W,H-deck);
 ctx.fillStyle="#202624";ctx.beginPath();ctx.moveTo(0,deck-2);
 for(var j=0;j<=28;j++){var px=j*W/28;ctx.lineTo(px,deck-2-hrand(29,j)*2);}
 ctx.lineTo(W,deck+5);ctx.lineTo(0,deck+5);ctx.closePath();ctx.fill();
 ctx.fillStyle="#070b0b";ctx.fillRect(0,deck+5,W,8);
 for(var s=0;s<5;s++){
  var bx=s*103-8;ctx.fillStyle="#141918";ctx.fillRect(bx,deck+13,12,H-deck);
  ctx.fillStyle="#1c2220";ctx.fillRect(bx+1,deck+15,2,H-deck-15);
  ctx.beginPath();ctx.moveTo(bx+10,deck+14);ctx.lineTo(bx+45,deck+14);ctx.lineTo(bx+10,deck+49);ctx.closePath();ctx.fill();
 }
 ctx.strokeStyle="#191e1c";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(38,H);ctx.lineTo(38,deck+58);ctx.quadraticCurveTo(38,deck+27,78,deck+27);ctx.lineTo(139,deck+27);ctx.quadraticCurveTo(165,deck+27,165,deck+52);ctx.lineTo(165,H);ctx.stroke();
 ctx.strokeStyle="#0a0d0d";ctx.lineWidth=3;ctx.stroke();
 /* Empty mounts have soft floodlights; occupied mounts share the same deck anchors. */
 TURRET_X.forEach(function(x,i){
  var empty=!B.turrets.some(function(t){return t.slot===i;});
  if(empty){var light=ctx.createLinearGradient(0,deck-28,0,deck);light.addColorStop(0,"rgba(234,244,231,0)");light.addColorStop(1,"rgba(234,244,231,.24)");ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(x-19,deck-28);ctx.lineTo(x+19,deck-28);ctx.lineTo(x+9,deck);ctx.lineTo(x-9,deck);ctx.closePath();ctx.fill();}
  ctx.fillStyle="#080c0c";ctx.beginPath();ctx.moveTo(x-19,deck+1);ctx.lineTo(x-14,deck-5);ctx.lineTo(x+14,deck-5);ctx.lineTo(x+19,deck+1);ctx.closePath();ctx.fill();
  ctx.fillStyle=empty?"#adb9ad":"#48574f";ctx.fillRect(x-11,deck-4,22,1.6);
 });
 ctx.restore();
}
/* Compact 120-degree HP arc above the bunker, safely below the dome apex. */
function drawBaseHp(){
 var ratio=Math.max(0,Math.min(1,B.baseHp/B.baseMax)),r=FORTRESS.hpRadius,cy=FORTRESS.deckY;
 var livery=B.elite?"#bc8ee3":liveryCol();
 var color=ratio<.25?"#ff5470":ratio<=.5?"#ffd34d":livery;
 ctx.save();ctx.globalAlpha=ratio<.25?.7+.3*Math.sin(B.t*6):1;ctx.lineWidth=5;ctx.lineCap="round";
 ctx.strokeStyle="rgba(130,165,150,.25)";ctx.beginPath();ctx.arc(W/2,cy,r,Math.PI*7/6,Math.PI*11/6);ctx.stroke();
 if(ratio>0){ctx.strokeStyle=B.baseFlashT>0?"#ffffff":color;ctx.beginPath();ctx.arc(W/2,cy,r,Math.PI*1.5-Math.PI/3*ratio,Math.PI*1.5+Math.PI/3*ratio);ctx.stroke();}
 ctx.font="800 "+(B.baseHitTextT>0?14:12)+"px 'Segoe UI',sans-serif";ctx.textAlign="center";
 ctx.lineWidth=2.5;ctx.strokeStyle="#182420";ctx.strokeText(Math.ceil(B.baseHp),W/2,cy-r-11);
 ctx.fillStyle=B.baseHitTextT>0?"#ff8991":color;ctx.fillText(Math.ceil(B.baseHp),W/2,cy-r-11);ctx.restore();
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
  var col=f.kind==="matrix"?"#a06bff":f.kind==="gravity"?"#7a8cff":f.kind==="blackhole"?"#6d28d9":"#ff8538";
  ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=f.kind==="gravity"?2.7:2;
  if(f.kind==="firetrail"){ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  else{ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();ctx.stroke();}
  if(f.kind==="blackhole"){ctx.globalAlpha=.85;ctx.fillStyle="#0b0618";ctx.beginPath();ctx.arc(f.x,f.y,Math.max(3,f.r*0.22),0,6.29);ctx.fill();
   ctx.strokeStyle="#c4b5fd";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(f.x,f.y,f.r*0.4,B.t*4,B.t*4+4);ctx.stroke();}
  if(f.kind==="slow"&&f.src&&f.src.smallLaserField&&!f.small){var lx=Math.cos(f.laserAng)*f.r*1.6,ly=Math.sin(f.laserAng)*f.r*1.6;
   ctx.globalAlpha=.8;ctx.strokeStyle="#7dd3fc";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x-lx,f.y-ly);ctx.lineTo(f.x+lx,f.y+ly);ctx.stroke();}
  if(f.kind==="gravity"&&f.binary){ctx.globalAlpha=.9;ctx.fillStyle="#e0e7ff";var ba=B.t*4;
   ctx.beginPath();ctx.arc(f.x+Math.cos(ba)*22,f.y+Math.sin(ba)*22,5,0,6.29);ctx.fill();ctx.beginPath();ctx.arc(f.x-Math.cos(ba)*22,f.y-Math.sin(ba)*22,5,0,6.29);ctx.fill();}
  if(f.kind==="gravity"){
   ctx.globalAlpha=.72;ctx.strokeStyle="#d2d8ff";ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.35+.08*Math.sin(B.t*5)),B.t,B.t+Math.PI*1.6);ctx.stroke();
   for(var j=0;j<4;j++){var a=B.t*5+j*Math.PI/2,r=f.r*(.17+.26*(j%3)/3);ctx.fillStyle="#d2d8ff";ctx.beginPath();ctx.arc(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,1.8,0,6.29);ctx.fill();}
   if(f.src){ctx.globalAlpha=.3;ctx.strokeStyle="#8cb5ff";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(f.src.x,f.src.y-13);ctx.lineTo(f.x,f.y);ctx.stroke();}
  }
  ctx.restore();
 });
}
/* ---------- enemies: each type has its own silhouette ----------
   No gradients or shadowBlur: there are up to ~70 enemies per frame, which is expensive on a phone. Volume comes from layering
   flat layers (base → shadow → highlight → details). The shape depends on e.seed (stable for a given enemy). */
function enemyTones(e){var fl=e.flash>0;
 return{fl:fl,base:fl?"#ffffff":e.color,lt:fl?"#ffffff":tint(e.color,0.34),dk:fl?"#cfd9e6":tint(e.color,-0.42),deep:fl?"#b8c6d8":tint(e.color,-0.65)};}
/* irregular polygon vertices are computed once per enemy and cached (previously ~30 sin() calls per frame) */
function shapePts(e,n,jit){var key="p"+n,c=e.shp||(e.shp={});if(c[key])return c[key];
 var a=[];for(var i=0;i<n;i++){var ang=i/n*6.2832,rr=1-jit+hrand(e.seed,i)*jit*2;a.push(Math.cos(ang)*rr,Math.sin(ang)*rr);}return(c[key]=a);}
/* path: cached polygon, scale s and offset (ox,oy). Volume is "dark body + offset light body",
   without clip(): clip with a large fill is noticeably more expensive on a mobile canvas */
function blobE(e,n,jit,s,ox,oy){var p=shapePts(e,n,jit),r=e.r*s;ctx.beginPath();
 for(var i=0;i<p.length;i+=2){var x=ox+p[i]*r,y=oy+p[i+1]*r;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();}
/* the "top-left" light direction stays fixed while the body rotates */
function lightOff(rot,dx,dy){var c=Math.cos(rot),sn=Math.sin(rot);return[dx*c+dy*sn,-dx*sn+dy*c];}

function eMeteor(e,k){var r=e.r,sd=e.seed,small=r<11,rot=e.phase*0.12+sd*6.28,lo=lightOff(rot,-r*0.07,-r*0.08);
 ctx.save();ctx.rotate(rot);
 blobE(e,9,0.17,1,0,0);ctx.fillStyle=k.dk;ctx.fill();                               /* dark body */
 blobE(e,9,0.17,0.9,lo[0],lo[1]);ctx.fillStyle=k.base;ctx.fill();                   /* lit part */
 if(!small){var hl=lightOff(rot,-r*0.36,-r*0.4);ctx.globalAlpha=0.38;ctx.fillStyle=k.lt;ctx.beginPath();ctx.arc(hl[0],hl[1],r*0.4,0,6.2832);ctx.fill();ctx.globalAlpha=1;}
 if(!small)for(var i=0;i<3;i++){var a=hrand(sd,20+i)*6.28,d=r*(0.22+hrand(sd,30+i)*0.3),cr=r*(0.13+hrand(sd,40+i)*0.1),cx=Math.cos(a)*d,cy=Math.sin(a)*d;
   ctx.fillStyle=k.deep;ctx.globalAlpha=0.7;ctx.beginPath();ctx.ellipse(cx,cy,cr,cr*0.78,a,0,6.2832);ctx.fill();ctx.globalAlpha=1;}
 /* glowing cracks (they stay inside the outline) */
 ctx.strokeStyle="#ff9a3c";ctx.lineWidth=Math.max(0.9,r*0.085);ctx.lineCap="round";ctx.globalAlpha=k.fl?0.4:0.95;
 ctx.beginPath();for(var c=0;c<(small?2:3);c++){var ca=hrand(sd,50+c)*6.28,ca2=ca+(hrand(sd,60+c)-0.5)*1.2;
   ctx.moveTo(Math.cos(ca)*r*0.12,Math.sin(ca)*r*0.12);ctx.lineTo(Math.cos(ca2)*r*0.5,Math.sin(ca2)*r*0.5);ctx.lineTo(Math.cos(ca2+0.25)*r*0.8,Math.sin(ca2+0.25)*r*0.8);}
 ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle="rgba(255,138,60,.9)";ctx.beginPath();ctx.arc(0,0,r*0.26,0,6.2832);ctx.fill();
 if(!small){ctx.fillStyle="rgba(255,225,160,.9)";ctx.beginPath();ctx.arc(0,0,r*0.12,0,6.2832);ctx.fill();}
 blobE(e,9,0.17,1,0,0);ctx.strokeStyle=k.deep;ctx.lineWidth=1;ctx.stroke();
 ctx.restore();
 ctx.strokeStyle="rgba(255,160,70,.55)";ctx.lineWidth=Math.max(1.2,r*0.14);ctx.lineCap="round";ctx.beginPath();ctx.arc(0,0,r*1.02,0.55,Math.PI-0.55);ctx.stroke();   /* heated leading edge (bottom) */
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
 ctx.strokeStyle=k.deep;ctx.lineWidth=1.2;ctx.beginPath();                                   /* plate seams */
 ctx.moveTo(-r*0.9,0);ctx.lineTo(r*0.9,0);ctx.moveTo(0,-r*0.9);ctx.lineTo(0,r*0.9);ctx.stroke();
 ctx.fillStyle="#0e1219";ctx.beginPath();ctx.ellipse(0,0,r*0.5,r*0.16,0,0,6.2832);ctx.fill();   /* vent slit with heat */
 ctx.fillStyle="rgba(255,138,60,.95)";ctx.beginPath();ctx.ellipse(0,0,r*0.36,r*0.09,0,0,6.2832);ctx.fill();
 ctx.fillStyle=k.lt;ctx.beginPath();for(var q=0;q<4;q++){var ra=0.3927+q*1.5708;ctx.moveTo(Math.cos(ra)*r*0.7+r*0.075,Math.sin(ra)*r*0.7);ctx.arc(Math.cos(ra)*r*0.7,Math.sin(ra)*r*0.7,r*0.075,0,6.2832);}ctx.fill();   /* rivets */
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
 ctx.fillStyle=k.deep;ctx.beginPath();ctx.moveTo(-r*0.28,-r*0.78);ctx.lineTo(0,-r*1.35);ctx.lineTo(r*0.28,-r*0.78);ctx.closePath();ctx.fill();   /* tail spike */
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
 /* two "embryos" in transparent cells, with a crack between them */
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
 ctx.fillStyle=k.fl?"#ffffff":tint(e.color,0.12);ctx.beginPath();                      /* spike "crown" */
 for(var i=0;i<12;i++){var a=i/12*6.2832,a1=a-0.17,a2=a+0.17;ctx.moveTo(Math.cos(a1)*r*0.9,Math.sin(a1)*r*0.9);ctx.lineTo(Math.cos(a)*r*1.26,Math.sin(a)*r*1.26);ctx.lineTo(Math.cos(a2)*r*0.9,Math.sin(a2)*r*0.9);}
 ctx.fill();
 ctx.restore();
 var rot=-e.phase*0.02,lo=lightOff(rot,-r*0.05,-r*0.06);
 ctx.save();ctx.rotate(rot);
 blobE(e,12,0.09,1,0,0);ctx.fillStyle=k.dk;ctx.fill();
 blobE(e,12,0.09,0.92,lo[0],lo[1]);ctx.fillStyle=k.base;ctx.fill();
 ctx.fillStyle=k.lt;ctx.globalAlpha=0.28;ctx.beginPath();                              /* armor plates around the core (inside the outline) */
 for(var p=0;p<6;p++){var pa=p/6*6.2832+0.5;
   ctx.moveTo(Math.cos(pa)*r*0.5,Math.sin(pa)*r*0.5);ctx.lineTo(Math.cos(pa)*r*0.86,Math.sin(pa)*r*0.86);ctx.lineTo(Math.cos(pa+0.9)*r*0.86,Math.sin(pa+0.9)*r*0.86);ctx.lineTo(Math.cos(pa+0.9)*r*0.5,Math.sin(pa+0.9)*r*0.5);ctx.closePath();}
 ctx.fill();
 ctx.globalAlpha=1;ctx.strokeStyle=k.deep;ctx.lineWidth=1.6;ctx.beginPath();
 for(var q=0;q<6;q++){var sa=q/6*6.2832+0.5;ctx.moveTo(Math.cos(sa)*r*0.5,Math.sin(sa)*r*0.5);ctx.lineTo(Math.cos(sa)*r*0.88,Math.sin(sa)*r*0.88);}
 ctx.stroke();
 blobE(e,12,0.09,1,0,0);ctx.strokeStyle=k.deep;ctx.lineWidth=1.8;ctx.stroke();
 ctx.restore();
 ctx.fillStyle="#1a0508";ctx.beginPath();ctx.arc(0,0,r*0.5,0,6.2832);ctx.fill();         /* core */
 ctx.fillStyle="rgba(255,90,60,"+(0.55+pu*0.35).toFixed(2)+")";ctx.beginPath();ctx.arc(0,0,r*0.42,0,6.2832);ctx.fill();
 ctx.fillStyle=k.fl?"#fff":"#ffb15c";ctx.beginPath();ctx.arc(0,0,r*(0.26+pu*0.04),0,6.2832);ctx.fill();
 ctx.fillStyle="#fff4cf";ctx.beginPath();ctx.arc(-r*0.04,-r*0.05,r*0.1,0,6.2832);ctx.fill();
 ctx.strokeStyle=k.lt;ctx.lineWidth=1.4;ctx.globalAlpha=0.7;ctx.beginPath();ctx.arc(0,0,r*0.5,0,6.2832);ctx.stroke();ctx.globalAlpha=1;
}
/* Siege insects use flat shell/wing layers: no per-enemy gradients or blur. */
function insectLegs(e,k,wide){
 var r=e.r,fl=Math.sin(B.t*7+e.phase)*r*.08;
 ctx.lineWidth=Math.max(1,r*.09);ctx.strokeStyle=k.deep;ctx.beginPath();
 for(var side=-1;side<=1;side+=2)for(var i=0;i<3;i++){
  var y=(i-1)*r*.46;ctx.moveTo(side*r*.46,y);ctx.lineTo(side*r*(wide?1.14:.88),y+r*.22+fl);ctx.lineTo(side*r*(wide?1.32:1.08),y+r*.53+fl);
 }ctx.stroke();
}
function eSpitter(e,k){
 var r=e.r,pu=.5+.5*Math.sin(B.t*3+e.phase);insectLegs(e,k,true);
 ctx.fillStyle=k.dk;ctx.beginPath();ctx.ellipse(0,-r*.25,r*.82,r*.94,0,0,6.29);ctx.fill();
 ctx.fillStyle=k.base;ctx.beginPath();ctx.ellipse(-r*.07,-r*.34,r*.69,r*.8,0,0,6.29);ctx.fill();
 ctx.strokeStyle=k.deep;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-r*1.05);ctx.lineTo(0,r*.45);ctx.stroke();
 ctx.fillStyle=k.lt;ctx.globalAlpha=.5;ctx.beginPath();ctx.ellipse(-r*.33,-r*.44,r*.15,r*.36,-.25,0,6.29);ctx.fill();ctx.globalAlpha=1;
 [-1,1].forEach(function(side){ctx.fillStyle="#b6f064";ctx.beginPath();ctx.arc(side*r*.61,r*.23,r*(.23+pu*.03),0,6.29);ctx.fill();ctx.fillStyle=k.deep;ctx.beginPath();ctx.arc(side*r*.22,r*.47,r*.15,0,6.29);ctx.fill();});
 ctx.fillStyle=k.deep;ctx.beginPath();ctx.ellipse(0,r*.63,r*.43,r*.36,0,0,6.29);ctx.fill();
 ctx.fillStyle="#d7fb9c";ctx.beginPath();ctx.arc(0,r*.87,r*.17,0,6.29);ctx.fill();
}
function eNeedle(e,k){
 var r=e.r,fl=Math.sin(B.t*26+e.phase)*r*.16;
 ctx.fillStyle="rgba(242,221,139,.28)";
 [-1,1].forEach(function(side){ctx.beginPath();ctx.moveTo(side*r*.22,-r*.42);ctx.lineTo(side*r*1.7,-r*.93+fl);ctx.lineTo(side*r*1.23,r*.1+fl);ctx.lineTo(side*r*.2,r*.32);ctx.closePath();ctx.fill();});
 insectLegs(e,k,false);ctx.fillStyle=k.deep;ctx.beginPath();ctx.ellipse(0,-r*.23,r*.4,r*1.1,0,0,6.29);ctx.fill();
 ctx.fillStyle=k.base;ctx.beginPath();ctx.ellipse(-r*.03,-r*.36,r*.31,r*.84,0,0,6.29);ctx.fill();
 ctx.strokeStyle=k.deep;ctx.lineWidth=r*.18;ctx.beginPath();ctx.moveTo(-r*.3,-r*.48);ctx.lineTo(r*.3,-r*.48);ctx.moveTo(-r*.31,-r*.06);ctx.lineTo(r*.31,-r*.06);ctx.stroke();
 ctx.fillStyle="#fff1ac";ctx.beginPath();ctx.arc(-r*.18,r*.4,r*.11,0,6.29);ctx.arc(r*.18,r*.4,r*.11,0,6.29);ctx.fill();
 ctx.fillStyle=k.lt;ctx.beginPath();ctx.moveTo(-r*.12,r*.6);ctx.lineTo(0,r*1.72);ctx.lineTo(r*.12,r*.6);ctx.closePath();ctx.fill();
}
function eBulwark(e,k){
 var r=e.r;insectLegs(e,k,true);
 ctx.fillStyle=k.deep;ctx.beginPath();ctx.ellipse(0,0,r,r*1.13,0,0,6.29);ctx.fill();
 ctx.fillStyle=k.base;ctx.beginPath();ctx.ellipse(-r*.06,-r*.12,r*.9,r*.96,0,0,6.29);ctx.fill();
 ctx.fillStyle=k.dk;ctx.beginPath();ctx.moveTo(0,-r*1.07);ctx.lineTo(r*.13,r*.72);ctx.lineTo(r*.68,r*.81);ctx.lineTo(r*.87,-r*.25);ctx.lineTo(r*.51,-r*.92);ctx.closePath();ctx.fill();
 ctx.strokeStyle=k.lt;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-r*.7,-r*.52);ctx.quadraticCurveTo(-r*.83,-r*.97,-r*.15,-r*.98);ctx.stroke();
 ctx.fillStyle="#161c17";ctx.beginPath();ctx.ellipse(0,r*.65,r*.51,r*.36,0,0,6.29);ctx.fill();
 [-1,1].forEach(function(side){ctx.fillStyle=k.lt;ctx.beginPath();ctx.moveTo(side*r*.4,r*.69);ctx.lineTo(side*r*.85,r*1.2);ctx.lineTo(side*r*.67,r*.38);ctx.closePath();ctx.fill();ctx.fillStyle="#ffe9a3";ctx.beginPath();ctx.arc(side*r*.21,r*.76,r*.09,0,6.29);ctx.fill();});
}
function eMoth(e,k){
 var r=e.r,fl=.88+.12*Math.sin(B.t*12+e.phase);
 ctx.save();ctx.scale(fl,1);
 [-1,1].forEach(function(side){
  ctx.fillStyle=k.dk;ctx.beginPath();ctx.moveTo(0,-r*.52);ctx.lineTo(side*r*1.7,-r*1.04);ctx.lineTo(side*r*1.45,r*.4);ctx.lineTo(side*r*.72,r*1.14);ctx.lineTo(0,r*.48);ctx.closePath();ctx.fill();
  ctx.fillStyle=k.base;ctx.beginPath();ctx.moveTo(side*r*.2,-r*.43);ctx.lineTo(side*r*1.46,-r*.81);ctx.lineTo(side*r*1.23,r*.26);ctx.lineTo(side*r*.68,r*.87);ctx.lineTo(side*r*.25,r*.35);ctx.closePath();ctx.fill();
  ctx.fillStyle=k.deep;ctx.beginPath();ctx.ellipse(side*r*.95,-r*.12,r*.28,r*.39,side*.45,0,6.29);ctx.fill();
  ctx.fillStyle="#ffd5f6";ctx.beginPath();ctx.arc(side*r*.95,-r*.12,r*.14,0,6.29);ctx.fill();
 });ctx.restore();
 ctx.fillStyle=k.deep;ctx.beginPath();ctx.ellipse(0,0,r*.24,r*.94,0,0,6.29);ctx.fill();
 ctx.strokeStyle=k.lt;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-r*.08,-r*.7);ctx.lineTo(-r*.46,-r*1.19);ctx.moveTo(r*.08,-r*.7);ctx.lineTo(r*.46,-r*1.19);ctx.stroke();
 ctx.fillStyle="#ffe7fa";ctx.beginPath();ctx.arc(0,r*.47,r*.13,0,6.29);ctx.fill();
}
function drawEnemyBody(e){
 if(e.seed===undefined)e.seed=hrand(e.phase,7); /* the shape seed is taken once, from the random initial phase */
 var k=enemyTones(e);
 switch(e.cfg.id){
  case "fast":eFast(e,k);break;
  case "armored":eArmored(e,k);break;
  case "meteor":eMeteor(e,k);break;
  case "mini":insectLegs(e,k,false);eFlyer(e,k);break;
  case "spitter":eSpitter(e,k);break;
  case "needle":eNeedle(e,k);break;
  case "bulwark":eBulwark(e,k);break;
  case "moth":eMoth(e,k);break;
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
/* Hostile artillery can be intercepted by player fire. Shapes distinguish acid,
   needles, prism shards and heavy siege orbs without adding expensive glows. */
function drawEnemyShots(){
 (B.enemyShots||[]).forEach(function(p){
  if(p.dead||p.life<=0)return;
  var r=p.r||3,col=p.color||"#fda4af",a=Math.atan2(p.vy,p.vx);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.lineWidth=1.2;
  ctx.fillStyle=glowRgba(col,.22);ctx.beginPath();ctx.ellipse(-r*1.4,0,r*3,r*.9,0,0,6.29);ctx.fill();
  ctx.fillStyle=col;ctx.strokeStyle=col;
  if(p.kind==="needle"){ctx.beginPath();ctx.moveTo(r*2.8,0);ctx.lineTo(-r*1.7,-r*.65);ctx.lineTo(-r*.7,0);ctx.lineTo(-r*1.7,r*.65);ctx.closePath();ctx.fill();}
  else if(p.kind==="prism"){ctx.beginPath();ctx.moveTo(r*1.8,0);ctx.lineTo(0,-r);ctx.lineTo(-r*1.6,0);ctx.lineTo(0,r);ctx.closePath();ctx.fill();}
  else {ctx.beginPath();ctx.arc(0,0,r,0,6.29);ctx.fill();if(p.kind==="siege"){ctx.beginPath();ctx.arc(0,0,r+2,0,6.29);ctx.stroke();}}
  ctx.fillStyle="#fff4dc";ctx.beginPath();ctx.ellipse(r*.25,0,r*.5,r*.28,0,0,6.29);ctx.fill();ctx.restore();
 });
}
function drawEnemyAim(){
 var drawn=0;
 B.enemies.forEach(function(e){
  if(drawn>=10||e.dead||e.attackState!=="charge"||!e.attackWindup||e.kind==="phase"&&e.cloakT>0&&!e.revealedT)return;
  var ratio=Math.min(1,e.attackCharge/e.attackWindup);
  if(ratio<.2)return;
  drawn++;ctx.save();ctx.globalAlpha=.12+.24*ratio;ctx.strokeStyle=e.color;ctx.lineWidth=1;ctx.setLineDash([3,8]);
  ctx.beginPath();ctx.moveTo(e.x,e.y+e.r);ctx.lineTo(e.attackAimX,e.attackAimY);ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=.3+.4*ratio;ctx.beginPath();ctx.ellipse(e.attackAimX,e.attackAimY,5+ratio*3,2+ratio,0,0,6.29);ctx.stroke();ctx.restore();
 });
}
function drawEnemy(e){
 ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.visualScale||1,e.visualScale||1);
 if(e.kind==="phase"&&e.cloakT>0&&!e.revealedT)ctx.globalAlpha=0.38;
 drawEnemyBody(e);
 if(e.attackState==="charge"&&e.attackWindup){
  var charge=Math.max(0,Math.min(1,e.attackCharge/e.attackWindup));
  ctx.strokeStyle=e.color;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,0,e.r+4,-Math.PI/2,-Math.PI/2+charge*6.2832);ctx.stroke();
  ctx.fillStyle="#fff0bc";ctx.beginPath();ctx.arc(0,e.r*.9,1.4+charge*2,0,6.29);ctx.fill();
 }
 if(e.cfg.id==="elite"){ctx.strokeStyle="#ff7ab8";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-e.r*1.2,-e.r*1.2);ctx.lineTo(e.r*1.2,e.r*1.2);ctx.moveTo(e.r*1.2,-e.r*1.2);ctx.lineTo(-e.r*1.2,e.r*1.2);ctx.stroke();}   /* elite mark */
 if(e.cfg.id==="phase"&&e.cloakT>0){ctx.fillStyle="rgba(131,164,217,.3)";for(var ph=0;ph<3;ph++){ctx.beginPath();ctx.arc(0,-e.r-6-ph*7,2+ph,0,6.2832);ctx.fill();}}   /* cloaking "vapor" */
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
 /* boss HP bar and HP number, unchanged from the existing interface */
 if(e.hp<e.maxHp||e.champion){var bh=e.kind==="boss"?6:e.r<12?3:4;
   ctx.fillStyle="#20060c";ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2,bh);
   ctx.fillStyle=e.champion?"#d88cff":e.kind==="boss"?"#ff5470":"#4ade80";ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2*Math.max(0,e.hp/e.maxHp),bh);
   if(e.kind==="boss"){ctx.font="700 10px sans-serif";ctx.textAlign="right";ctx.fillStyle="#ffe9ce";ctx.fillText(Math.ceil(e.hp),e.x+e.r*1.2,e.y-e.r-13);}
 }
}
function draw(){
 /* Draw in native device pixels using W×H logical coordinates. */
 ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);ctx.clearRect(0,0,W,H);
 /* Screen shake must not consume gameplay randomness or change on a paused redraw. */
 var sx=B.shake?Math.sin(B.t*137)*B.shake*.5:0,sy=B.shake?Math.sin(B.t*173+1)*B.shake*.5:0;
 ctx.save();ctx.translate(sx,sy);ctx.lineJoin="round";
 drawBattleBackdrop();drawFortress();
 drawBattleFields();
 /* enemies */
 drawEnemyAim();
 B.enemies.forEach(drawEnemy);
 drawEnemyShots();
 /* Hive releases a swarm of bees: striped body, flapping wings, stinger */
 B.drones.forEach(function(d){
   var flap=Math.sin(B.t*46+d.x*0.7)*0.5;
   ctx.save();ctx.translate(d.x,d.y);
   /* evolved wasps (Wasp II / Echo Wasp II) are larger and orange-tinted */
   var evo=d.evolved||(d.isEcho&&d.src&&d.src.hiveEcho>=2);
   if(evo)ctx.scale(1.25,1.25);
   ctx.fillStyle="rgba(220,240,255,.8)";
   ctx.beginPath();ctx.ellipse(-3,-4.6,4.8,2.1,-0.7-flap*0.35,0,6.29);ctx.fill();
   ctx.beginPath();ctx.ellipse(3,-4.6,4.8,2.1,0.7+flap*0.35,0,6.29);ctx.fill();
   ctx.fillStyle=d.isEcho?(evo?"#c7b2ff":"#b7baff"):(d.evolved?"#fb923c":"#facc15");ctx.beginPath();ctx.ellipse(0,0,7.1,4.4,0,0,6.29);ctx.fill();
   ctx.fillStyle="#191919";ctx.fillRect(-3,-4.1,2.3,8.2);ctx.fillRect(0.9,-4.1,2.3,8.2);
   ctx.fillStyle="#fff7cc";ctx.beginPath();ctx.arc(5.2,0,1.7,0,6.29);ctx.fill();ctx.strokeStyle="#e5ba39";ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(-10,1.5);ctx.stroke();
   ctx.restore();
 });
 /* Firewheel discs: bigger (r 20 × Size Boost) and slower than before; mini Firewheels are small */
 B.wheels.forEach(function(w){
  var r=w.r||20,spokes=w.mini?3:5;
  ctx.save();ctx.translate(w.x,w.y);
  if(!w.mini){var gl=ctx.createRadialGradient(0,0,r*0.2,0,0,r*1.6);gl.addColorStop(0,"rgba(255,176,60,.45)");gl.addColorStop(1,"rgba(255,120,40,0)");ctx.fillStyle=gl;ctx.beginPath();ctx.arc(0,0,r*1.6,0,6.29);ctx.fill();}
  ctx.rotate(B.t*(w.mini?14:8));ctx.shadowColor="#ff8a3c";ctx.shadowBlur=w.mini?8:18;
  ctx.strokeStyle=w.holding?"#fde047":"#ffb03c";ctx.lineWidth=w.mini?2:4;ctx.beginPath();ctx.arc(0,0,r,0,6.29);ctx.stroke();
  ctx.lineWidth=w.mini?1.5:2.5;
  for(var i=0;i<spokes;i++){var a=i*6.2832/spokes;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*0.25,Math.sin(a)*r*0.25);ctx.lineTo(Math.cos(a+0.5)*r*0.95,Math.sin(a+0.5)*r*0.95);ctx.stroke();}
  ctx.fillStyle="#fff1c2";ctx.beginPath();ctx.arc(0,0,r*0.22,0,6.29);ctx.fill();
  ctx.restore();
 });
 drawEffects();
 allFighters().forEach(drawUnit);
 drawBaseHp();
 /* projectiles: each weapon keeps its own silhouette; all share tapered trails and gradient glows */
 B.projs.forEach(function(p){
   var id=p.src.cfg.id,col=p.src.cfg.color;
   ctx.save();ctx.lineCap="round";
   if(p.kind==="shell"){projTrail(p,0.05,2.2,p.color||"#e2e8f0","#ffffff");projOrb(p.x,p.y,1.7,p.color||"#e2e8f0","#ffffff");ctx.restore();return;}
   if(id==="skyguard"){ /* rocket: smoky trail, flame cone, body along the flight path, nose cone */
     projTrail(p,0.30,5.4,"#ff8a3c","#ffe08a");
     var fl=0.5+0.5*Math.sin(B.t*70+p.x*0.37);
     ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));if(p.mini)ctx.scale(0.6,0.6);
     ctx.fillStyle="#ff8a3c";ctx.beginPath();ctx.moveTo(-7,-3.2);ctx.lineTo(-15-fl*6,0);ctx.lineTo(-7,3.2);ctx.closePath();ctx.fill();
     ctx.fillStyle="#ffe08a";ctx.beginPath();ctx.moveTo(-7,-1.8);ctx.lineTo(-11.5-fl*3,0);ctx.lineTo(-7,1.8);ctx.closePath();ctx.fill();
     ctx.fillStyle="#e5edf5";ctx.fillRect(-7,-2.6,13,5.2);
     ctx.fillStyle="#ff5470";ctx.beginPath();ctx.moveTo(6,-2.6);ctx.lineTo(11,0);ctx.lineTo(6,2.6);ctx.closePath();ctx.fill();
     ctx.fillStyle="#5b7a8c";ctx.fillRect(-7,-4.6,3.4,2);ctx.fillRect(-7,2.6,3.4,2);
     projOrb(-8,0,2.6+fl*0.8,"#ffb03c","#fff1b0");
   }else if(id==="tesla"){ /* flying energy charge: purple plasma ribbon, a sphere with a white core and sparks */
     projTrail(p,0.20,6,"#a06bff","#e9d5ff");
     projOrb(p.x,p.y,5.8,"#a06bff","#ffffff");
     ctx.strokeStyle="rgba(216,180,254,.8)";ctx.lineWidth=1.5;ctx.beginPath();
     ctx.moveTo(p.x-p.vx*.04,p.y-p.vy*.04);
     ctx.lineTo(p.x-p.vx*.027+Math.sin(B.t*40)*3,p.y-p.vy*.027);
     ctx.lineTo(p.x-p.vx*.014-Math.sin(B.t*45)*3,p.y-p.vy*.014);
     ctx.lineTo(p.x,p.y);ctx.stroke();
     ctx.strokeStyle="rgba(216,180,254,.9)";ctx.lineWidth=1.1;ctx.beginPath();
     ctx.moveTo(p.x-3,p.y-6);ctx.lineTo(p.x+1,p.y-10-1.5*(1+Math.sin(B.t*61+p.y)));
     ctx.moveTo(p.x+4,p.y+3);ctx.lineTo(p.x+8+1.5*(1+Math.sin(B.t*53+p.x)),p.y+6);ctx.stroke();
   }else if(id==="railgun"){ /* long pink streak tapering to nothing, white-hot core */
     projTrail(p,0.13,6,col,"#ffffff");
     projOrb(p.x,p.y,2.8,col,"#ffffff");
   }else if(id==="disruption"){ /* pulsing impulse ring with a soft fill and a faint wake */
     var dr=4+(2.6-p.life)/2.6*8,dg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,dr);
     projTrail(p,0.14,3,col,false);
     dg.addColorStop(0,glowRgba(col,0));dg.addColorStop(1,glowRgba(col,0.3));
     ctx.globalAlpha=Math.max(.25,p.life/2.6);
     ctx.fillStyle=dg;ctx.beginPath();ctx.arc(p.x,p.y,dr,0,6.29);ctx.fill();
     ctx.lineWidth=2;ctx.strokeStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,dr,0,6.29);ctx.stroke();
     ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,2,0,6.29);ctx.fill();
   }else if(id==="aeroblast"){ /* spinning air arc vortex with a speed-line wake */
     projTrail(p,0.14,4,col,false);
     var a0=B.t*18+p.x*0.05;
     ctx.lineWidth=2.6;ctx.strokeStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,6.5,a0,a0+4.2);ctx.stroke();
     ctx.lineWidth=1;ctx.strokeStyle="#ffffff";ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(p.x,p.y,6.5,a0+1.4,a0+3.2);ctx.stroke();
   }else if(id==="beam"){ /* heavy energy charge with a white core; grows with the ramp */
     var br=5.6+Math.min(2,p.src.beamRamp||0)*1.5;
     projTrail(p,0.16,br*1.5,col,"#ffffff");
     projOrb(p.x,p.y,br,col,"#ffffff");
   }else if(id==="firewheel"){ /* fireball with a flame tail */
     var ff=0.5+0.5*Math.sin(B.t*55+p.x*0.5+p.y*0.3);
     projTrail(p,0.22,7,"#ff8a3c","#ffe08a");
     projOrb(p.x,p.y,4.4+ff*0.6,"#ffb03c","#fff1b0");
   }else{ /* tracers: soldier gold (long, bold), other bullets shorter */
     var sol=id==="soldier",tc=sol?"#ffd34d":col;
     projTrail(p,sol?0.10:0.06,sol?4.8:2.8,tc,"#ffffff");
     projOrb(p.x,p.y,sol?2.3:1.5,tc,"#ffffff");
   }
   ctx.restore();
 });
 B.beams.forEach(function(b){
  ctx.save();ctx.globalAlpha=1-b.t/b.life;
  function strokeBeam(w,color,blur){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.shadowColor=b.color;ctx.shadowBlur=blur;ctx.beginPath();ctx.moveTo(b.x1,b.y1);if(b.arc&&b.mx!==undefined)ctx.lineTo(b.mx,b.my);ctx.lineTo(b.x2,b.y2);ctx.stroke();}
  /* Cross-ray gradient supplies the soft halo without full-screen shadowBlur passes.
     Thickness still follows damage power; one refreshed visual represents each ray. */
  if(b.laser){
   var dx=b.x2-b.x1,dy=b.y2-b.y1,len=Math.hypot(dx,dy),half=b.w*2.5;
   if(len>0){
    ctx.translate(b.x1,b.y1);ctx.rotate(Math.atan2(dy,dx));ctx.shadowBlur=0;
    var glow=ctx.createLinearGradient(0,-half,0,half);
    glow.addColorStop(0,glowRgba(b.color,0));glow.addColorStop(.4,glowRgba(b.color,.2));
    glow.addColorStop(.5,glowRgba(b.color,.5));glow.addColorStop(.6,glowRgba(b.color,.2));glow.addColorStop(1,glowRgba(b.color,0));
    ctx.fillStyle=glow;ctx.fillRect(0,-half,len,half*2);
    ctx.fillStyle=b.color;ctx.fillRect(0,-b.w,len,b.w*2);
    ctx.fillStyle="#ffffff";var core=Math.max(1,b.w);ctx.fillRect(0,-core*.5,len,core);
   }
  }
  else if(b.bolt){ /* vertical lightning strike: jagged deterministic polyline */
   ctx.strokeStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=12;ctx.lineJoin="round";
   [[b.w*1.8,0.45],[Math.max(1.5,b.w*0.6),1]].forEach(function(l,li){
    ctx.lineWidth=l[0];ctx.globalAlpha=(1-b.t/b.life)*l[1];if(li)ctx.strokeStyle="#f5f3ff";
    ctx.beginPath();ctx.moveTo(b.x1,b.y1);
    for(var k=1;k<10;k++){var yy=b.y1+(b.y2-b.y1)*k/10;ctx.lineTo(b.x1+(hrand(b.x1+b.y2,k)-0.5)*(b.w*2+10),yy);}
    ctx.lineTo(b.x2,b.y2);ctx.stroke();
   });
  }
  else strokeBeam(b.w,b.color,7);
  ctx.restore();
 });
 drawBeamStreams();
 B.rings.forEach(function(r){ctx.save();ctx.globalAlpha=1-r.t/r.life;ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,Math.max(0.01,r.r),0,6.29);ctx.stroke();ctx.restore();});
 B.parts.forEach(function(p){
  ctx.save();ctx.globalAlpha=1-p.t/p.life;
  if(p.kind==="muzzle"){ctx.strokeStyle=p.color;ctx.lineWidth=4;ctx.shadowColor=p.color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,p.r,p.angle-.44,p.angle+.44);ctx.stroke();}
  else {ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.29);ctx.fill();}
  ctx.restore();
 });
 /* damage numbers: crit in gold, enemy vulnerability larger in orange, resistance muted */
 B.nums.forEach(function(n){ctx.save();ctx.globalAlpha=1-n.t/0.85;ctx.font=(n.crit?"800 17px":(n.rm>1.15?"800 14.5px":"700 12px"))+" 'Segoe UI',sans-serif";ctx.textAlign="center";ctx.fillStyle=n.heal?"#4ade80":n.crit?"#ff9f2e":(n.rm>1.15?"#ff7a4d":(n.rm<0.85?"#8fa8b5":"#ffffff"));ctx.fillText(n.txt,n.x,n.y);ctx.restore();});
 ctx.restore();
 drawCombatHud();
}
function mmss(s){s=Math.max(0,Math.floor(s));var m=Math.floor(s/60);return (m<10?"0":"")+m+":"+("0"+(s%60)).slice(-2);}
function syncHud(){ /* all battle metrics are drawn directly on the canvas inside the field (draw) */ }
$("btn-speed").addEventListener("click",function(){if(!B)return;B.speed=B.speed===1?2:1;this.textContent="×"+B.speed;this.classList.toggle("on",B.speed===2);SFX.pick();});
$("btn-pause").addEventListener("click",function(){if(!B||B.over)return;B.paused=true;openPause("⏸ Pause");});
$("btn-buildinfo").addEventListener("click",function(){if(!B)return;B.paused=true;openPause("🧰 Build");});
function openPause(title){
 $("pause-title").textContent=title;
 var h='<table class="stats"><thead><tr><th>Unit</th><th>Lv.</th><th>DMG</th></tr></thead><tbody>';
 allFighters().slice().sort(function(a,b){return b.totalDmg-a.totalDmg;}).forEach(function(t){h+="<tr><td>"+t.cfg.icon+" "+t.cfg.name+"</td><td>"+t.runLv+"</td><td>"+fmt(t.totalDmg)+"</td></tr>";});
 $("pause-body").innerHTML=h+"</tbody></table>";
 $("ov-pause").classList.add("on");
}
$("btn-resume").addEventListener("click",function(){$("ov-pause").classList.remove("on");if(B)B.paused=false;lastTs=performance.now();requestBattleFrame();});
$("btn-quit").addEventListener("click",function(){$("ov-pause").classList.remove("on");if(B&&!B.over)endBattle(false);});


/* Beam: a continuous, clearly visible stream while the series is active (owner request
   2026-11-11). Thickness grows with the focus ramp; flowing light dots show the direction. */
function drawBeamStreams(){
 B.turrets.forEach(function(t){
  if(t.cfg.id!=="beam"||!(t.beamVisT>0))return;
  var x1=t.x,y1=t.y-14,x2=t.beamVisX,y2=t.beamVisY,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  var ramp=Math.min(4,t.beamVisRamp||1),w=6+2.2*ramp,a=Math.min(1,t.beamVisT/0.12);
  ctx.save();ctx.lineCap="round";
  function wave(width,color,alpha,amp){
   ctx.globalAlpha=a*alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);
   for(var k=1;k<=16;k++){var f=k/16,off=Math.sin(f*18-B.t*22)*amp*(1-Math.abs(f-0.5)*1.2);ctx.lineTo(x1+dx*f+nx*off,y1+dy*f+ny*off);}
   ctx.stroke();
  }
  /* The broad translucent wave is the halo; blurring three long paths every
     frame cost more than the rest of the stream drawing at phone DPR. */
  ctx.shadowBlur=0;
  wave(w*2.4,"#38bdf8",0.28,2.5);
  wave(w*1.3,"#38bdf8",0.85,1.5);
  wave(Math.max(2,w*0.45),"#e0f2fe",1,0.6);
  ctx.shadowBlur=0;ctx.fillStyle="#ffffff";
  for(var k=0;k<7;k++){var f=(B.t*2.6+k/7)%1;ctx.globalAlpha=a*0.9;ctx.beginPath();ctx.arc(x1+dx*f,y1+dy*f,1.6+ramp*0.3,0,6.29);ctx.fill();}
  ctx.globalAlpha=a*0.7;ctx.fillStyle="#bae6fd";ctx.beginPath();ctx.arc(x2,y2,w*0.9,0,6.29);ctx.fill();
  ctx.restore();
 });
}
