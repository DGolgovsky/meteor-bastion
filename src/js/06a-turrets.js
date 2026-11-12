/* Native Canvas silhouettes, shared by the battlefield and the equipment portraits.
   Head coordinates are relative to TURRET_MOUNTS. Every lit opening is a real port. */
function turretFace(g,points,fill,edge){
 g.beginPath();g.moveTo(points[0],points[1]);
 for(var i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
 g.closePath();g.fillStyle=fill;g.fill();
 if(edge){g.strokeStyle=edge;g.lineWidth=.85;g.stroke();}
}
function turretLine(g,points,color,width){
 g.beginPath();g.moveTo(points[0],points[1]);
 for(var i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
 g.strokeStyle=color;g.lineWidth=width;g.stroke();
}
function turretOval(g,x,y,rx,ry,fill){
 g.fillStyle=fill;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();
}
function turretHalo(g,x,y,r,color,alpha){
 var glow=g.createRadialGradient(x,y,0,x,y,r);
 glow.addColorStop(0,glowRgba(color,alpha));glow.addColorStop(1,glowRgba(color,0));
 g.fillStyle=glow;g.fillRect(x-r,y-r,2*r,2*r);
}
/* A luminous sphere with a hot centre, a violet limb and short branching discharges.
   Its silhouette has no velocity-dependent axis. Charging and flight use the same effect. */
var TESLA_ORB_RADIUS=7.8;
function ballLightning(g,x,y,r,time,seed){
 var phase=time*6+seed,step=Math.floor(time*15)+seed;
 r*=1+.045*Math.sin(phase*2);
 var light=g.createRadialGradient(x-r*.19,y-r*.22,0,x,y,r*2);
 light.addColorStop(0,"#ffffff");light.addColorStop(.15,"#f8edff");
 light.addColorStop(.33,"#dcbdff");light.addColorStop(.45,"#9867f7");
 light.addColorStop(.5,"#c9a7ff");light.addColorStop(.57,"rgba(143,87,251,.44)");
 light.addColorStop(1,"rgba(114,63,249,0)");
 g.fillStyle=light;g.fillRect(x-r*2,y-r*2,r*4,r*4);
 g.beginPath();
 for(var i=0;i<6;i++){
  var a=phase*.32+i*Math.PI/3,dx=Math.cos(a),dy=Math.sin(a);
  var bend=(hrand(step,i)-.5)*r*.75,reach=r*(1.12+.27*hrand(step,i+6));
  var kx=x+dx*r*.76-dy*bend,ky=y+dy*r*.76+dx*bend;
  g.moveTo(x+dx*r*.26,y+dy*r*.26);g.lineTo(kx,ky);
  g.lineTo(x+dx*r+dy*bend*.4,y+dy*r-dx*bend*.4);g.lineTo(x+dx*reach,y+dy*reach);
  if(i%2===0){g.moveTo(kx,ky);g.lineTo(kx+dx*r*.24-dy*bend,ky+dy*r*.24+dx*bend);}
 }
 g.strokeStyle="#f5eaff";g.lineWidth=Math.max(.65,r*.095);g.stroke();
}
var TURRET_DRAW={
 skyguard:function(g,t,ports){
  var c=t.cfg.color;
  turretFace(g,[-15,5,-15,-17,-12,-21,12,-21,15,-17,15,5,9,9,-9,9],"#16212c","#485462");
  ports.forEach(function(p){
   var x=p[0],y=p[1];
   turretFace(g,[x-3.4,1,x-3.4,y+2,x-2.3,y-1,x+2.3,y-1,x+3.4,y+2,x+3.4,-2,x+1.5,2],"#243342","#405667");
   turretLine(g,[x-2.5,-3,x-2.5,y+4,x-.5,y+1],c,1.1);
   turretOval(g,x,y,3.1,1.9,"#071626");turretOval(g,x,y,1.65,.8,"#66e6ff");
  });
  turretLine(g,[-13,2,-8,6,8,6,13,2],c,1.4);
 },
 laser:function(g,t,ports){
  var c=t.cfg.color,p=ports[0],y=p[1];
  turretOval(g,0,3,8,8,"#192a23");
  turretFace(g,[-6,4,-5,-10,-7,y+5,-6,y-1,6,y-1,7,y+5,5,-10,6,4],"#26362a","#52634c");
  for(var k=0;k<3;k++)turretLine(g,[-5,-4-k*2.7,0,-2.5-k*2.7,5,-4-k*2.7],c,1.25);
  turretHalo(g,0,y,t.laserActive>0?12:7,c,.5);
  turretOval(g,0,y,6,2.1,c);turretOval(g,0,y,4.9,1.05,"#f5ffc6");
 },
 disruption:function(g,t,ports){
  var c=t.cfg.color;
  turretFace(g,[-11,-2,-8,-5,-1,-4,1,-4,8,-5,11,-2,9,2,3,0,2,6,-2,6,-3,0,-9,2],"#26382f","#4c6759");
  ports.forEach(function(p){
   turretOval(g,p[0],p[1],4.9,5.2,"#16221f");
   turretOval(g,p[0],p[1],3.2,3.3,c);turretOval(g,p[0]-.5,p[1]-.6,1.6,1.5,"#ecfff1");
  });
  turretHalo(g,0,-2,7,c,.45);
  turretFace(g,[-2,-2,0,-4.2,2,-2,0,.2],c);
 },
 aeroblast:function(g,t,ports){
  var c=t.cfg.color,y=ports[0][1];
  turretFace(g,[-7,7,-9,1,-6,-10,-6,y+5,-8,y+2,-7,y-1,7,y-1,8,y+2,6,y+5,6,-8,8,-1,5,7],"#202b33","#4e6267");
  turretFace(g,[-7,2,-4,-6,1,-10,5,-10,3,-6,0,-5,-2,1],"#101a21");
  turretLine(g,[-4,1,-3,-5,2,-9,5,-9],c,1.6);
  for(var k=0;k<3;k++)turretLine(g,[-6,-12-k*3.5,-4,-13-k*3.5],c,1.5);
  turretOval(g,0,y,7.3,1.8,c);turretOval(g,0,y,4.5,.85,"#124b52");
 },
 thunder:function(g,t,ports,time){
  var c=t.cfg.color,p=ports[0];
  turretLine(g,[0,3,0,p[1]],"#414052",3);
  for(var k=0;k<2;k++){
   var y=-3-k*8,w=11-k*3.3;
   turretOval(g,0,y,w,4.4,"#1c1928");
   for(var j=-1;j<=1;j++)turretOval(g,j*w*.61,y,w*.12,3.9,j===0?"#8365d3":"#624aaa");
   turretLine(g,[-w+2,y-2,-w*.4,y-3.7,w*.4,y-3.7],c,.75);
  }
  turretHalo(g,p[0],p[1],t.recoil>0?14:9,c,.7);
  turretOval(g,p[0],p[1],3.9,3.9,"#ddc7ff");
  turretOval(g,p[0]-.4,p[1]-.4,2.7+.2*Math.sin(time*7),2.7,"#fff9ff");
 },
 beam:function(g,t,ports){
  var c=t.cfg.color,y=ports[0][1];
  turretOval(g,0,2,7.6,7.6,"#1d3020");turretOval(g,0,2,3.4,3.4,c);
  [-1,1].forEach(function(side){
   turretFace(g,[side*1.8,-3,side*1.8,-16,side*4.4,y,side*7.8,y-2,side*6.3,-9,side*4.2,-3],"#1c2828","#425348");
   turretLine(g,[side*4.2,-4,side*3.5,-14,side*4.5,y+2],c,1.25);
  });
  turretHalo(g,0,y,5,c,.55);turretOval(g,0,y,2.1,1.2,"#baff93");
 },
 firewheel:function(g,t,ports,time){
  var c=t.cfg.color,p=ports[0],y=p[1];
  turretFace(g,[-6,17,-4,4,-6,-5,-3,-2,3,-2,6,-5,4,4,6,17],"#1d2942","#484d68");
  turretLine(g,[-4,10,-2.8,6,-2.5,1],"#596eff",1.7);turretLine(g,[4,10,2.8,6,2.5,1],"#596eff",1.7);
  turretHalo(g,0,y,13,c,.55);
  turretFace(g,[-6,y+2,-5,y-5,-2.4,y-2,.8,y-10,2,y-4,5.5,y-8+Math.sin(time*9),6,y-1,4,y+4,0,y+6,-3.6,y+4],"#157cba");
  turretOval(g,0,y,4.7,5.3,c);turretOval(g,0,y,2.5,2.6,"#e0faff");
 },
 hive:function(g,t,ports){
  var c=t.cfg.color;
  turretFace(g,[-7,-3.8,-3.5,-8,3.5,-8,7,-3.8,7,3,3.5,7,-3.5,7,-7,3],"#172721","#5e7666");
  turretFace(g,[-4.9,-2.5,-2.4,-5,2.4,-5,4.9,-2.5,4.9,2.5,2.4,5,-2.4,5,-4.9,2.5],c);
  turretOval(g,0,0,3.3,3.4,"#11231d");
  ports.forEach(function(p){
   turretLine(g,[p[0]*.5,p[1]*.5,p[0],p[1]],"#34463b",4);
   turretFace(g,[p[0]-2.8,p[1]+1,p[0]-1.4,p[1]-2.3,p[0]+1.4,p[1]-2.3,p[0]+2.8,p[1]+1,p[0]+1.6,p[1]+2.5,p[0]-1.6,p[1]+2.5],c);
  });
 },
 railgun:function(g,t,ports){
  var c=t.cfg.color,y=ports[0][1];
  turretFace(g,[-7,6,-7,-6,-4,-13,-4,-23,4,-23,4,-12,7,-6,7,3,3,7],"#1b2730","#465962");
  turretLine(g,[-5,3,-5,-5,-2,-12,-2,-18],c,1.4);
  ports.forEach(function(p){
   var x=p[0];
   turretFace(g,[x-2.6,-8,x-2.6,y+5,x-1.9,y-1,x+1.9,y-1,x+2.6,y+5,x+2.6,-10],"#202c33","#44545d");
   turretLine(g,[x-1.5,-11,x-1.5,y+3],c,.9);
   turretOval(g,x,y,2.5,1.05,c);
  });
 },
 tesla:function(g,t,ports,time){
  var c=t.cfg.color,y=ports[0][1];
  turretFace(g,[-6,6,-7,-4,-5,-13,-2,y,2,y,5,-13,7,-4,6,4,2,7],"#211f2d","#515061");
  for(var k=0;k<4;k++){
   var cy=-4-5*k,w=6.6-.85*k;
   turretLine(g,[-w,cy-1,-w*.55,cy-2.2,w*.6,cy-.3,w,cy+1],c,2.7);
  }
  turretFace(g,[-3.4,y+2,0,y-2.4,3.4,y+2,0,y+4],"#dfc4ff");
  if(t.charging>0){
   var charge=1-Math.min(1,t.charging/t.chargeUsed);
   ballLightning(g,0,y,(.32+.68*charge)*TESLA_ORB_RADIUS/UNIT_SCALE,time,t.x);
  }else turretOval(g,0,y,1.6,1.5,"#fff2ff");
 },
 gravity:function(g,t,ports,time){
  var c=t.cfg.color;
  turretOval(g,0,0,9.3,9.3,"#15231f");turretOval(g,0,0,6.8,6.8,c);turretOval(g,0,0,5.3,5.3,"#080e11");
  g.strokeStyle="#f1ffe1";g.lineWidth=1;g.beginPath();g.arc(0,0,6.3,time*2,time*2+2.9);g.stroke();
  ports.forEach(function(p){
   turretFace(g,[0,-4,p[0]-2,p[1]+4,p[0],p[1]-1,p[0]+1.7,p[1]+4,2,-3],"#4a6957");
   turretLine(g,[1,-4,p[0],p[1]],c,1.65);
  });
  turretLine(g,[0,6,0,11],c,1.2);
 }
};
function drawTurretModel(g,t,time){
 var c=t.cfg.color,pose=turretHeadPose(t,time),ports=turretPorts(t);
 g.save();g.lineJoin="round";g.lineCap="round";
 turretFace(g,[-13,12,-10,7,-5.5,6,-3,pose.y,3,pose.y,6,6,10,7,13,12],"#172229","#506164");
 turretLine(g,[-9,10,-6.8,7.8,-3.5,7.8],c,.9);
 if(!TURRET_MOUNTS[t.cfg.id].fixed){
  turretOval(g,0,pose.y,6.1,6.1,"#29343b");turretOval(g,0,pose.y,3.7,3.7,c);
 }
 g.translate(0,pose.y);g.rotate(pose.rotation);g.translate(0,pose.kick);
 TURRET_DRAW[t.cfg.id](g,t,ports,time);
 g.restore();
}
/* Portraits use the combat head at rest. One small bitmap per turret, built on first display. */
var turretPortraits={};
function unitIcon(cfg){
 if(!TURRET_DRAW[cfg.id])return cfg.icon;
 if(turretPortraits[cfg.id])return turretPortraits[cfg.id];
 var canvas=document.createElement("canvas");
 if(!canvas.toDataURL)return turretPortraits[cfg.id]=cfg.icon;
 canvas.width=96;canvas.height=96;
 var g=canvas.getContext("2d");g.translate(43,67);g.scale(2,2);
 drawTurretModel(g,{cfg:cfg,x:0,angle:-.92,recoil:0},0);
 return turretPortraits[cfg.id]='<img class="unit-portrait" alt="" src="'+canvas.toDataURL()+'">';
}
