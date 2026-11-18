import * as T from 'three';
import {sculpt} from './geometry.js';

const canvas=document.querySelector('canvas');
// Assign a destination here when its page is published.
const destinations={Bio:null,Projects:null,Experience:null,Contact:null};
for(const button of document.querySelectorAll('nav button')){
 const url=destinations[button.textContent];
 button.disabled=false;
 if(url)button.onclick=()=>location.assign(url);
 else button.setAttribute('aria-disabled','true');
}

function mount(){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0x080808);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-5,5,3,-3,.1,50);
 camera.position.z=12;
 const group=new T.Group();scene.add(group);
 // Analytic studio environment. Reflected rays sample three large softboxes
 // with feathered edges and darker falloff towards the ends of each panel.
 const material=new T.ShaderMaterial({
 vertexShader:`varying vec3 n; varying vec3 p;void main(){vec4 v=modelViewMatrix*vec4(position,1.);n=normalMatrix*normal;p=v.xyz;gl_Position=projectionMatrix*v;}`,
 fragmentShader:`varying vec3 n;varying vec3 p;
 float panel(vec3 r,vec3 center,vec3 axis,vec2 size,float blur){
 vec3 c=normalize(center),u=normalize(cross(axis,c)),v=cross(c,u);
 float f=dot(r,c);vec2 uv=abs(vec2(dot(r,u),dot(r,v)))/max(f,.001);
 vec2 edge=1.-smoothstep(size*(1.-blur),size*(1.+blur),uv);
 return step(.0,f)*edge.x*edge.y*(1.-.28*min(1.,uv.y/size.y));}
 void main(){vec3 norm=normalize(n),r=reflect(normalize(vec3(p.xy*.025,-1.)),norm);
 float a=panel(r,vec3(-.82,.5,.56),vec3(.16,1.,.03),vec2(.45,1.55),.19);
 float b=panel(r,vec3(.91,.19,-.48),vec3(-.18,1.,.1),vec2(.28,1.6),.26);
 float c=panel(r,vec3(.08,1.,.06),vec3(1.,.1,.1),vec2(.48,1.35),.42);
 float fill=panel(r,vec3(-.34,.16,.93),vec3(.14,1.,.03),vec2(.43,1.75),.58);
 float rim=pow(1.-max(norm.z,0.),2.);
 float tone=.018+.020*max(norm.y,0.)+.07*rim+.32*a+.22*b+.19*c+.155*fill;
 gl_FragColor=vec4(vec3(tone),1.);}`
 });
 const cache=new Map();
 const letters=[...'PRANAV'].map(ch=>{
  if(!cache.has(ch))cache.set(ch,sculpt(ch,material));
  const mesh=new T.Mesh(cache.get(ch),material); group.add(mesh);return mesh;
 });
 const tilt=[.13,.08,-.11,.10,-.10,-.15],heights=[.22,.38,-.20,.10,-.36,.16];
 function resize(){
  const w=innerWidth,h=innerHeight,aspect=w/h;
  letters.forEach((m,i)=>{
   m.position.set((i-2.5)*1.58,heights[i]*.85,[.32,-.16,.23,-.12,.26,-.24][i]);
   m.scale.set(1,Math.max(1,Math.min(1.65,2.42/aspect)),1);
   m.rotation.set([-.09,.12,.08,-.14,.07,-.08][i],[-.18,.19,-.12,.22,-.20,.14][i],tilt[i]);
  });
  const width=Math.max(aspect<1?10.55:10.05,3.95*aspect);
  camera.left=-width/2;camera.right=width/2;camera.top=width/aspect/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75,Math.sqrt(3600000/(w*h))));renderer.setSize(w,h,false);
 }
 resize();const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let mx=0,my=0,rx=0,ry=0,start=performance.now(),previous=start;
 function draw(now){
  const t=(now-start)/1000,k=1-Math.exp(-Math.min(.1,(now-previous)/1000)*4);previous=now;
  rx+=(mx-rx)*k;ry+=(my-ry)*k;
  const intro=Math.pow(Math.max(0,1-t/1.9),3);
  group.rotation.set(motion.matches?0:ry*.052+intro*.09,motion.matches?0:rx*.085+.012*Math.sin(t*.4)-intro*.12,0);
  group.position.y=motion.matches?0:.012*Math.sin(t*.6)-intro*.12;
  renderer.render(scene,camera);
 }
 const pointer=e=>{if(e.pointerType==='mouse'){mx=e.clientX/innerWidth*2-1;my=e.clientY/innerHeight*2-1;}};
 const reset=()=>{mx=my=0;};
 const loop=()=>renderer.setAnimationLoop(document.hidden||motion.matches?null:draw);
 const update=()=>{resize();draw(performance.now());loop();};
 const listeners=[[window,'resize',update],[window,'pointermove',pointer],[document,'pointerleave',reset],[document,'visibilitychange',loop],[motion,'change',update]];
 for(const [el,type,fn] of listeners)el.addEventListener(type,fn);
 update();document.body.classList.add('ready');
 function dispose(){renderer.setAnimationLoop(null);for(const [el,type,fn] of listeners)el.removeEventListener(type,fn);for(const geo of cache.values())geo.dispose();material.dispose();renderer.dispose();document.body.classList.remove('ready');}
 canvas.addEventListener('webglcontextlost',dispose,{once:true});
 if(import.meta.hot)import.meta.hot.dispose(dispose);
}
try{mount();}catch(error){console.warn('Sculpture renderer unavailable',error);}
