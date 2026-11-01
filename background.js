// Interactive farm background: windmill scene driven by live site weather, site-local time and page scroll.
(()=>{
 const cv=document.createElement("canvas");cv.id="farm-bg";cv.setAttribute("aria-hidden","true");document.body.prepend(cv);
 const ctx=cv.getContext("2d"),stat=document.createElement("canvas"),sctx=stat.getContext("2d");
 const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
 let W=0,H=0,dpr=1,wx={cloud:30,rain:0,code:1,wind:12},angle=0,boost=0,lastY=scrollY,last=performance.now(),flash=0,dirty=true,pal=null,clouds=[],drops=[],stars=[];

 // Colour keyframes across the site-local day (hour → palette).
 const K=[
  [0,{top:"#0d1b33",bot:"#2b3f63",far:"#24364f",near:"#1d3a37",field:"#22402f",light:.18}],
  [5,{top:"#0d1b33",bot:"#2b3f63",far:"#24364f",near:"#1d3a37",field:"#22402f",light:.18}],
  [6.2,{top:"#5a6fa3",bot:"#f6b38a",far:"#7b7f99",near:"#5d7a55",field:"#6e8a4a",light:.6}],
  [7.6,{top:"#7fb8ea",bot:"#dff0fb",far:"#9fbfae",near:"#79a86a",field:"#9cc26a",light:1}],
  [16.4,{top:"#7fb8ea",bot:"#dff0fb",far:"#9fbfae",near:"#79a86a",field:"#9cc26a",light:1}],
  [17.9,{top:"#4f5f9a",bot:"#f59b6b",far:"#7a6f8a",near:"#5a6e48",field:"#76804a",light:.6}],
  [19.2,{top:"#0d1b33",bot:"#2b3f63",far:"#24364f",near:"#1d3a37",field:"#22402f",light:.18}],
  [24,{top:"#0d1b33",bot:"#2b3f63",far:"#24364f",near:"#1d3a37",field:"#22402f",light:.18}]];
 const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),rgb=a=>"rgb("+a.map(v=>Math.round(v)).join(",")+")";
 const mix=(a,b,t)=>{a=typeof a==="string"?hex(a):a;b=typeof b==="string"?hex(b):b;return a.map((v,i)=>v+(b[i]-v)*t);};
 function siteHour(){const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",hour:"numeric",minute:"numeric",hourCycle:"h23"}).formatToParts(new Date());const g=t=>+p.find(x=>x.type===t).value;return g("hour")+g("minute")/60;}
 function palette(h){let i=0;while(K[i+1][0]<h)i++;const[a,pa]=K[i],[b,pb]=K[i+1],t=(h-a)/(b-a||1),o={hour:h};
  for(const k in pa)o[k]=k==="light"?pa[k]+(pb[k]-pa[k])*t:mix(pa[k],pb[k],t);
  // Overcast and rain grey out the scene.
  const g=Math.min(1,wx.cloud/100*.45+(wx.rain>0?.25:0)+(wx.code>=95?.2:0)),grey=mix([150,160,172],[40,48,60],1-o.light);
  ["top","bot","far"].forEach(k=>o[k]=mix(o[k],grey,g));["near","field"].forEach(k=>o[k]=mix(o[k],grey,g*.4));o.light*=1-g*.35;return o;}

 function resize(){dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;[cv,stat].forEach(c=>{c.width=W*dpr;c.height=H*dpr;});cv.style.width=W+"px";cv.style.height=H+"px";
  stars=Array.from({length:90},()=>({x:Math.random()*W,y:Math.random()*H*.5,r:Math.random()*1.2+.3,p:Math.random()*6}));
  seedClouds();dirty=true;}
 function seedClouds(){const n=Math.round(2+wx.cloud/100*9);clouds=Array.from({length:n},(_,i)=>({x:Math.random()*W*1.2-W*.1,y:H*(.06+Math.random()*.3),s:.6+Math.random()*.9,v:4+Math.random()*8}));}
 // Anchor point for the windmill: right side, clear of the fixed sidebar.
 const mill=()=>{const s=Math.max(.7,Math.min(1.5,H/800));return{x:W>780?W*.82:W*.7,y:H*.8,s};};

 function hill(c,base,amp,freq,phase,col){c.fillStyle=col;c.beginPath();c.moveTo(0,H);for(let x=0;x<=W+20;x+=20)c.lineTo(x,base+Math.sin(x*freq+phase)*amp+Math.sin(x*freq*2.3+phase)*amp*.35);c.lineTo(W,H);c.fill();}
 function drawStatic(){const c=sctx,p=pal;c.setTransform(dpr,0,0,dpr,0,0);
  const sky=c.createLinearGradient(0,0,0,H*.7);sky.addColorStop(0,rgb(p.top));sky.addColorStop(1,rgb(p.bot));c.fillStyle=sky;c.fillRect(0,0,W,H);
  // Sun by day, moon by night, travelling on an arc.
  const h=p.hour,day=h>=6&&h<=18.6,t=day?(h-6)/12.6:((h<6?h+24:h)-18.6)/11.4,sx=W*(.3+t*.6),sy=H*.55-Math.sin(t*Math.PI)*H*.42,vis=1-wx.cloud/100*.75;
  c.globalAlpha=Math.max(.15,vis);
  if(day){const g=c.createRadialGradient(sx,sy,0,sx,sy,90);g.addColorStop(0,"rgba(255,236,170,.9)");g.addColorStop(1,"rgba(255,236,170,0)");c.fillStyle=g;c.fillRect(sx-90,sy-90,180,180);c.fillStyle=h<7.5||h>16.5?"#ffb46b":"#fff3c4";c.beginPath();c.arc(sx,sy,26,0,7);c.fill();}
  else{c.fillStyle="#eef2ff";c.beginPath();c.arc(sx,sy,20,0,7);c.fill();c.fillStyle=rgb(p.top);c.beginPath();c.arc(sx+8,sy-5,18,0,7);c.fill();}
  c.globalAlpha=1;
  hill(c,H*.63,22,.004,1,rgb(p.far));
  // Distant turbine towers (blades animated per frame).
  c.strokeStyle=rgb(mix(p.far,[255,255,255],.35));c.lineWidth=2;turbines().forEach(t=>{c.beginPath();c.moveTo(t.x,t.y);c.lineTo(t.x,t.y-t.h);c.stroke();});
  hill(c,H*.72,16,.006,3,rgb(p.near));
  hill(c,H*.82,10,.003,5,rgb(p.field));
  // Crop rows.
  c.strokeStyle=rgb(mix(p.field,[0,0,0],.12));c.lineWidth=1;for(let i=0;i<7;i++){const y=H*.85+i*i*4;c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(W/2,y-8,W,y);c.stroke();}
  const m=mill(),L=p.light;
  // Barn.
  const bx=m.x-150*m.s,by=m.y+6*m.s,bw=70*m.s,bh=44*m.s;c.fillStyle=rgb(mix([178,54,46],[50,30,40],1-L));c.fillRect(bx,by-bh,bw,bh);
  c.fillStyle=rgb(mix([120,36,32],[35,22,30],1-L));c.beginPath();c.moveTo(bx-6*m.s,by-bh);c.lineTo(bx+bw/2,by-bh-26*m.s);c.lineTo(bx+bw+6*m.s,by-bh);c.fill();
  c.strokeStyle=rgb(mix([245,240,230],[90,90,100],1-L));c.lineWidth=2*m.s;c.strokeRect(bx+bw*.32,by-bh*.6,bw*.36,bh*.6);c.beginPath();c.moveTo(bx+bw*.32,by-bh*.6);c.lineTo(bx+bw*.68,by);c.moveTo(bx+bw*.68,by-bh*.6);c.lineTo(bx+bw*.32,by);c.stroke();
  if(L<.5){c.fillStyle="rgba(255,206,120,.85)";c.fillRect(bx+bw*.42,by-bh-14*m.s,bw*.16,8*m.s);}
  // Fence.
  c.strokeStyle=rgb(mix([150,110,70],[50,45,45],1-L));c.lineWidth=2*m.s;const fy=m.y+26*m.s;c.beginPath();for(let x=m.x-260*m.s;x<m.x+170*m.s;x+=22*m.s){c.moveTo(x,fy);c.lineTo(x,fy-16*m.s);}c.moveTo(m.x-260*m.s,fy-11*m.s);c.lineTo(m.x+170*m.s,fy-11*m.s);c.moveTo(m.x-260*m.s,fy-5*m.s);c.lineTo(m.x+170*m.s,fy-5*m.s);c.stroke();
  // Windmill tower.
  const tw=mix([236,226,206],[70,72,88],1-L);c.fillStyle=rgb(tw);c.beginPath();c.moveTo(m.x-30*m.s,m.y+10*m.s);c.lineTo(m.x-17*m.s,m.y-150*m.s);c.lineTo(m.x+17*m.s,m.y-150*m.s);c.lineTo(m.x+30*m.s,m.y+10*m.s);c.fill();
  c.fillStyle=rgb(mix(tw,[0,0,0],.18));c.beginPath();c.moveTo(m.x+6*m.s,m.y+10*m.s);c.lineTo(m.x+6*m.s,m.y-150*m.s);c.lineTo(m.x+17*m.s,m.y-150*m.s);c.lineTo(m.x+30*m.s,m.y+10*m.s);c.fill();
  c.fillStyle=rgb(mix([110,70,50],[40,30,35],1-L));c.beginPath();c.moveTo(m.x-24*m.s,m.y-148*m.s);c.quadraticCurveTo(m.x,m.y-190*m.s,m.x+24*m.s,m.y-148*m.s);c.fill();
  c.fillRect(m.x-8*m.s,m.y-16*m.s,16*m.s,26*m.s);
  c.fillStyle=L<.5?"rgba(255,206,120,.9)":rgb(mix([90,120,150],[30,30,40],1-L));c.fillRect(m.x-5*m.s,m.y-90*m.s,10*m.s,13*m.s);
  dirty=false;}
 function turbines(){return[.28,.42,.55].map((f,i)=>({x:W*f+(W>780?120:0)*(1-f),y:H*.63+8,h:H*(.12-i*.015)}));}

 function sails(c,x,y,r,a,col,lat){c.save();c.translate(x,y);c.rotate(a);for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.fillStyle=col;c.fillRect(-2,0,4,r);c.globalAlpha=.85;c.fillStyle=lat;c.fillRect(3,r*.18,r*.2,r*.82);c.strokeStyle=col;c.lineWidth=1;for(let k=1;k<5;k++){c.beginPath();c.moveTo(3,r*.18+k*r*.164);c.lineTo(3+r*.2,r*.18+k*r*.164);c.stroke();}c.globalAlpha=1;}c.fillStyle=col;c.beginPath();c.arc(0,0,5,0,7);c.fill();c.restore();}
 function cloud(c,x,y,s,col){c.fillStyle=col;c.beginPath();[[0,0,26],[24,-10,30],[52,0,24],[26,8,26]].forEach(([dx,dy,r])=>{c.moveTo(x+dx*s+r*s,y+dy*s);c.arc(x+dx*s,y+dy*s,r*s,0,7);});c.fill();}

 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
  if(dirty)drawStatic();const p=pal,m=mill();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.drawImage(stat,0,0,W,H);
  if(p.light<.45){ctx.fillStyle="#fff";stars.forEach(s=>{ctx.globalAlpha=(.45-p.light)*2*(1-wx.cloud/100)*(.6+.4*Math.sin(now/700+s.p));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();});ctx.globalAlpha=1;}
  const cc=rgb(mix(mix([255,255,255],[120,130,145],Math.min(1,wx.cloud/100*.6+(wx.rain>0?.3:0))),p.top,.35*(1-p.light)));
  ctx.globalAlpha=.85;clouds.forEach(k=>{k.x+=k.v*(.5+wx.wind/20)*dt;if(k.x>W+120)k.x=-140;cloud(ctx,k.x,k.y,k.s,cc);});ctx.globalAlpha=1;
  // Slow constant spin scaled by wind, plus a decaying boost from scrolling.
  const base=(reduce?.15:.35)+Math.min(1.4,wx.wind/25);boost*=Math.exp(-dt*1.6);angle+=(base+boost)*dt;
  const bl=rgb(mix(pal.far,[255,255,255],.35));turbines().forEach((t,i)=>{ctx.save();ctx.translate(t.x,t.y-t.h);ctx.rotate(angle*1.3+i);ctx.strokeStyle=bl;ctx.lineWidth=2;for(let b=0;b<3;b++){ctx.rotate(Math.PI*2/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,t.h*.45);ctx.stroke();}ctx.restore();});
  sails(ctx,m.x,m.y-150*m.s,110*m.s,angle,rgb(mix([95,65,48],[35,30,38],1-p.light)),rgb(mix([250,246,236],[95,98,115],1-p.light)));
  // Rain, fog and lightning overlays.
  const want=reduce?0:Math.min(260,Math.round(wx.rain*60+(wx.rain>0?40:0)));while(drops.length<want)drops.push({x:Math.random()*W,y:Math.random()*H,v:500+Math.random()*300});drops.length=want;
  if(want){ctx.strokeStyle="rgba(170,190,215,.55)";ctx.lineWidth=1;ctx.beginPath();const slant=Math.min(.5,wx.wind/60);drops.forEach(d=>{d.y+=d.v*dt;d.x+=d.v*slant*dt;if(d.y>H){d.y=-10;d.x=Math.random()*W;}if(d.x>W)d.x-=W;ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-slant*14,d.y-14);});ctx.stroke();}
  if(wx.code===45||wx.code===48){ctx.fillStyle="rgba(220,225,232,.45)";ctx.fillRect(0,0,W,H);}
  if(wx.code>=95&&!reduce){if(Math.random()<dt*.15)flash=1;if(flash>0){ctx.fillStyle="rgba(255,255,255,"+flash*.5+")";ctx.fillRect(0,0,W,H);flash-=dt*3;}}
  // Wash so dashboard text stays readable over the scene.
  ctx.fillStyle="rgba(244,247,251,"+(.42+(1-p.light)*.28)+")";ctx.fillRect(0,0,W,H);
  requestAnimationFrame(frame);}

 function tick(){const h=siteHour();if(!pal||Math.abs(h-pal.hour)>.02){pal=palette(h);dirty=true;}}
 addEventListener("weather:update",e=>{const c=e.detail&&e.detail.current;if(!c)return;wx={cloud:+c.cloud_cover||0,rain:+c.precipitation||0,code:+c.weather_code||0,wind:+c.wind_speed_10m||0};pal=palette(siteHour());seedClouds();dirty=true;});
 addEventListener("scroll",()=>{const y=scrollY;boost=Math.min(reduce?1:7,boost+Math.abs(y-lastY)*.012);lastY=y;},{passive:true});
 addEventListener("resize",resize);resize();tick();setInterval(tick,60000);requestAnimationFrame(frame);
})();
