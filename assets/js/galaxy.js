(function(){
  const bg=document.createElement('canvas');
  bg.className='galaxy-canvas galaxy-nebula';
  const c=document.createElement('canvas');
  c.className='galaxy-canvas galaxy-stars';
  document.body.insertBefore(c,document.body.firstChild);
  document.body.insertBefore(bg,document.body.firstChild);

  const gl=bg.getContext('webgl',{antialias:false,premultipliedAlpha:false})||bg.getContext('experimental-webgl');
  const ctx=c.getContext('2d');
  let W,H;
  function resize(){W=c.width=bg.width=window.innerWidth;H=c.height=bg.height=window.innerHeight;if(gl)gl.viewport(0,0,W,H);}
  resize();
  window.addEventListener('resize',resize);

  const VS=`attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;
  const FS=`precision mediump float;
uniform float u_time;
float h(vec2 p){return fract(abs(sin(dot(p,vec2(127.1,311.7)))*43758.5453));}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1.0,0.0)),u.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;
  v+=a*vn(p);p*=2.07;a*=0.5;
  v+=a*vn(p);p*=2.07;a*=0.5;
  v+=a*vn(p);p*=2.07;a*=0.5;
  v+=a*vn(p);return v;}
vec3 stop(float n,float a,vec3 c0,float b,vec3 c1){return mix(c0,c1,clamp((n-a)/(b-a),0.0,1.0));}
vec3 grad(float n){
  if(n<0.07)return stop(n,0.0,vec3(0.0),0.07,vec3(0.012,0.008,0.059));
  if(n<0.15)return stop(n,0.07,vec3(0.012,0.008,0.059),0.15,vec3(0.031,0.020,0.137));
  if(n<0.23)return stop(n,0.15,vec3(0.031,0.020,0.137),0.23,vec3(0.078,0.031,0.275));
  if(n<0.31)return stop(n,0.23,vec3(0.078,0.031,0.275),0.31,vec3(0.157,0.039,0.412));
  if(n<0.40)return stop(n,0.31,vec3(0.157,0.039,0.412),0.40,vec3(0.275,0.059,0.549));
  if(n<0.48)return stop(n,0.40,vec3(0.275,0.059,0.549),0.48,vec3(0.373,0.078,0.620));
  if(n<0.55)return stop(n,0.48,vec3(0.373,0.078,0.620),0.55,vec3(0.165,0.063,0.439));
  if(n<0.62)return stop(n,0.55,vec3(0.165,0.063,0.439),0.62,vec3(0.039,0.188,0.518));
  if(n<0.69)return stop(n,0.62,vec3(0.039,0.188,0.518),0.69,vec3(0.071,0.345,0.620));
  if(n<0.76)return stop(n,0.69,vec3(0.071,0.345,0.620),0.76,vec3(0.125,0.502,0.698));
  if(n<0.82)return stop(n,0.76,vec3(0.125,0.502,0.698),0.82,vec3(0.227,0.635,0.776));
  if(n<0.88)return stop(n,0.82,vec3(0.227,0.635,0.776),0.88,vec3(0.412,0.753,0.871));
  if(n<0.93)return stop(n,0.88,vec3(0.412,0.753,0.871),0.93,vec3(0.647,0.804,0.949));
  if(n<0.97)return stop(n,0.93,vec3(0.647,0.804,0.949),0.97,vec3(0.816,0.737,1.0));
  return stop(n,0.97,vec3(0.816,0.737,1.0),1.0,vec3(0.910,0.871,1.0));}
void main(){
  vec2 uv=gl_FragCoord.xy*0.0055;
  float t=u_time;
  vec2 q=vec2(fbm(uv),fbm(uv+vec2(5.2,1.3)));
  vec2 r=vec2(fbm(uv+q*2.0+vec2(1.7+t*0.11,9.2-t*0.08)),fbm(uv+q*2.0+vec2(8.3-t*0.07,2.8+t*0.09)));
  float n=fbm(uv+r*2.5+vec2(t*0.05,-t*0.06));
  float g=fbm(uv*1.3+r*1.5+vec2(12.0,7.0+t*0.07));
  float brt=fbm(uv*0.8+q*2.0+vec2(20.0-t*0.06,15.0+t*0.05));
  n=pow(n,2.2);
  vec3 col=grad(n);
  float gf=clamp((g-0.70)/0.22,0.0,1.0)*0.65;
  col.r+=(0.902-col.r)*gf;
  col.g+=(0.475-col.g)*gf*0.75;
  col.b+=(0.710-col.b)*gf*0.9;
  float bf=clamp((brt-0.74)/0.18,0.0,1.0)*0.6;
  col.r+=(0.078-col.r)*bf*0.45;
  col.g+=(0.722-col.g)*bf*0.9;
  col.b+=(0.651-col.b)*bf*0.7;
  col=min(col,vec3(1.0));
  gl_FragColor=vec4(col,1.0);
}`;

  let gl_ok=false,prog,timeLoc,t=0;
  if(gl){
    function cs(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;}
    prog=gl.createProgram();
    gl.attachShader(prog,cs(gl.VERTEX_SHADER,VS));
    gl.attachShader(prog,cs(gl.FRAGMENT_SHADER,FS));
    gl.linkProgram(prog);
    if(gl.getProgramParameter(prog,gl.LINK_STATUS)){
      gl.useProgram(prog);
      const buf=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pl=gl.getAttribLocation(prog,'a_pos');
      gl.enableVertexAttribArray(pl);
      gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
      timeLoc=gl.getUniformLocation(prog,'u_time');
      gl_ok=true;
    }
  }

  const tw=Array.from({length:70},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.1+.2,ph:Math.random()*Math.PI*2,sp:Math.random()*.045+.012}));
  const sh=[];
  function spSh(){const e=Math.floor(Math.random()*4);let x,y;if(e===0){x=Math.random();y=0;}else if(e===1){x=1;y=Math.random();}else if(e===2){x=Math.random();y=1;}else{x=0;y=Math.random();}sh.push({x,y,a:Math.random()*Math.PI*2,l:Math.random()*.09+.04,sp:Math.random()*.007+.004,al:1,w:Math.random()*1+.3});}
  setInterval(spSh,950);

  const spawn=[];
  const NO_SPAWN='a, button, input, select, textarea, label, [role="button"], .letter, .glass-panel, .quiz-wrap, .wip-badge, .familiar-btn, .familiar-popup';
  let dragStart=null,dragShooter=null;
  document.addEventListener('mousedown',e=>{
    if(e.target.closest(NO_SPAWN)){dragStart=null;dragShooter=null;return;}
    dragStart={x:e.clientX,y:e.clientY,t:performance.now()};
    dragShooter=null;
  });
  document.addEventListener('mousemove',e=>{
    if(!dragStart)return;
    const cx=e.clientX,cy=e.clientY,now=performance.now();
    if(!dragShooter){
      dragShooter={x:cx,y:cy,a:0,l:0.05,w:1.2,al:1,lastX:dragStart.x,lastY:dragStart.y,lastT:dragStart.t,vx:0,vy:0};
    }
    const dt=Math.max(1,now-dragShooter.lastT);
    const dvx=(cx-dragShooter.lastX)/dt,dvy=(cy-dragShooter.lastY)/dt;
    dragShooter.vx=dragShooter.vx*0.3+dvx*0.7;
    dragShooter.vy=dragShooter.vy*0.3+dvy*0.7;
    const speed=Math.sqrt(dragShooter.vx*dragShooter.vx+dragShooter.vy*dragShooter.vy);
    if(speed>0.01)dragShooter.a=Math.atan2(dragShooter.vy,dragShooter.vx);
    dragShooter.x=cx;dragShooter.y=cy;
    const spFrac=Math.min(speed/2,1);
    dragShooter.l=0.04+spFrac*0.18;
    dragShooter.w=1.0+spFrac*2.2;
    dragShooter.lastX=cx;dragShooter.lastY=cy;dragShooter.lastT=now;
  });
  document.addEventListener('mouseup',e=>{
    if(!dragStart){dragShooter=null;return;}
    if(e.target.closest(NO_SPAWN)){dragStart=null;dragShooter=null;return;}
    if(dragShooter){
      const speed=Math.sqrt(dragShooter.vx*dragShooter.vx+dragShooter.vy*dragShooter.vy);
      const spPerFrame=speed*16.67/Math.max(W,H);
      sh.push({x:dragShooter.x/W,y:dragShooter.y/H,a:dragShooter.a,l:dragShooter.l,sp:Math.max(0.008,Math.min(0.05,spPerFrame)),al:1,w:dragShooter.w});
    }else{
      const x=dragStart.x/W,y=dragStart.y/H;
      const n=1+Math.floor(Math.random()*4);
      const pulse=0.32+Math.random()*0.14;
      spawn.push({x,y,t:0,ph:0,sp:(Math.PI*2)/(pulse*60),n,pulse});
    }
    dragStart=null;dragShooter=null;
  });

  function draw(){
    if(gl_ok){gl.uniform1f(timeLoc,t);gl.drawArrays(gl.TRIANGLES,0,6);}
    ctx.clearRect(0,0,W,H);
    tw.forEach(s=>{s.ph+=s.sp;const a=((Math.sin(s.ph)+1)/2)*.85+.1;ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(200,180,255,${a*.6})`;ctx.fill();});
    for(let i=sh.length-1;i>=0;i--){const s=sh[i];s.x+=Math.cos(s.a)*s.sp;s.y+=Math.sin(s.a)*s.sp;s.al-=.011;if(s.al<=0||s.x<-.15||s.x>1.15||s.y<-.15||s.y>1.15){sh.splice(i,1);continue;}const x1=s.x*W,y1=s.y*H,x2=x1-Math.cos(s.a)*s.l*W,y2=y1-Math.sin(s.a)*s.l*H;const sg=ctx.createLinearGradient(x2,y2,x1,y1);sg.addColorStop(0,'rgba(180,160,255,0)');sg.addColorStop(1,`rgba(230,220,255,${s.al})`);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x1,y1);ctx.strokeStyle=sg;ctx.lineWidth=s.w;ctx.stroke();ctx.beginPath();ctx.arc(x1,y1,s.w+.5,0,Math.PI*2);ctx.fillStyle=`rgba(245,240,255,${s.al})`;ctx.fill();}
    if(dragShooter){
      const x1=dragShooter.x,y1=dragShooter.y;
      const x2=x1-Math.cos(dragShooter.a)*dragShooter.l*W,y2=y1-Math.sin(dragShooter.a)*dragShooter.l*H;
      const sg=ctx.createLinearGradient(x2,y2,x1,y1);
      sg.addColorStop(0,'rgba(180,160,255,0)');
      sg.addColorStop(1,`rgba(230,220,255,${dragShooter.al})`);
      ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x1,y1);
      ctx.strokeStyle=sg;ctx.lineWidth=dragShooter.w;ctx.stroke();
      ctx.beginPath();ctx.arc(x1,y1,dragShooter.w+.5,0,Math.PI*2);
      ctx.fillStyle=`rgba(245,240,255,${dragShooter.al})`;ctx.fill();
    }
    for(let i=spawn.length-1;i>=0;i--){
      const s=spawn[i];s.t+=1/60;s.ph+=s.sp;
      const twEnd=0.4+s.n*s.pulse,total=twEnd+1.0;
      if(s.t>=total){tw.push({x:s.x,y:s.y,r:0.6+Math.random()*0.9,ph:Math.random()*Math.PI*2,sp:Math.random()*.045+.012});spawn.splice(i,1);continue;}
      const tp=(Math.sin(s.ph)+1)/2;
      let r,alpha;
      if(s.t<0.4){const p=s.t/0.4;r=1+8*p;alpha=1;}
      else if(s.t<twEnd){r=9+1*tp;alpha=0.75+0.25*tp;}
      else{const p=(s.t-twEnd)/1.0;r=9-7.8*p;alpha=0.75+0.25*tp;}
      const gx=s.x*W,gy=s.y*H;
      const gr=ctx.createRadialGradient(gx,gy,0,gx,gy,r*3);
      gr.addColorStop(0,`rgba(255,255,255,${alpha*0.9})`);
      gr.addColorStop(0.25,`rgba(255,220,240,${alpha*0.45})`);
      gr.addColorStop(1,'rgba(200,230,255,0)');
      ctx.beginPath();ctx.arc(gx,gy,r*3,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();
      const w=r*0.22;
      ctx.beginPath();
      ctx.moveTo(gx,gy-r);
      ctx.lineTo(gx+w,gy-w);ctx.lineTo(gx+r,gy);ctx.lineTo(gx+w,gy+w);
      ctx.lineTo(gx,gy+r);
      ctx.lineTo(gx-w,gy+w);ctx.lineTo(gx-r,gy);ctx.lineTo(gx-w,gy-w);
      ctx.closePath();
      ctx.fillStyle=`rgba(255,255,255,${Math.min(1,alpha+0.15)})`;
      ctx.fill();
    }
    t+=0.02;
    requestAnimationFrame(draw);
  }
  draw();
})();
