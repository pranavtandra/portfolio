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
 const letters=[...'PRANAVTANDRA'].map(ch=>{
  if(!cache.has(ch))cache.set(ch,sculpt(ch,material));
  const mesh=new T.Mesh(cache.get(ch),material); group.add(mesh);return mesh;
 });
 const tilt=[.13,.08,-.11,.10,-.10,-.15],heights=[.187,.323,-.17,.085,-.306,.136];
 const pitch=[-.09,.12,.08,-.14,.07,-.08];
 const baseline=letters.map(()=>0);
 const hover=letters.map(()=>({weight:0,velocity:0}));
 const floats=letters.map(()=>({
  phase:Math.random()*2*Math.PI,
  speed:2*Math.PI/(3.6+Math.random()*2),
  amplitude:.09+Math.random()*.045
 }));
 const raycaster=new T.Raycaster(),cursor=new T.Vector2();
 let hovered=null;
 function resize(){
  hovered=null;
  const w=innerWidth,h=innerHeight,aspect=w/h;
  const width=Math.max(10.55,5.7*aspect);
  const verticalScale=Math.min(1.4,width/aspect/8.2);
  letters.forEach((m,i)=>{
   const column=i%6;
   const rowCenter=i<6?1.88:-1.88;
   baseline[i]=(rowCenter+heights[column]*.45)*verticalScale;
   m.position.set((column-2.5)*1.58,baseline[i],[.32,-.16,.23,-.12,.26,-.24][column]);
   m.scale.set(1,verticalScale,1);
   m.rotation.set(pitch[column],[-.18,.19,-.12,.22,-.20,.14][column],tilt[column]);
  });
  camera.left=-width/2;camera.right=width/2;camera.top=width/aspect/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75,Math.sqrt(3600000/(w*h))));renderer.setSize(w,h,false);
 }
 resize();const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let mx=0,my=0,rx=0,ry=0,start=performance.now(),previous=start;
 function draw(now){
  const dt=Math.min(.1,(now-previous)/1000);
  const t=(now-start)/1000,k=1-Math.exp(-dt*4);previous=now;
  rx+=(mx-rx)*k;ry+=(my-ry)*k;
  const intro=Math.pow(Math.max(0,1-t/1.9),3);
  group.rotation.set(motion.matches?0:ry*.052+intro*.09,motion.matches?0:rx*.085+.012*Math.sin(t*.4)-intro*.12,0);
  group.position.y=motion.matches?0:.012*Math.sin(t*.6)-intro*.12;
  letters.forEach((letter,i)=>{
   const target=letter===hovered?1:0;
   const {phase,speed,amplitude}=floats[i];
   const drift=motion.matches?0:amplitude*Math.sin(t*speed+phase);
   const response=hover[i];
   if(motion.matches){
    response.weight=0;
    response.velocity=0;
   }else{
    // A critically damped spring keeps velocity continuous on entry and exit.
    const rate=7;
    const offset=response.weight-target;
    const slope=response.velocity+rate*offset;
    const decay=Math.exp(-rate*dt);
    response.weight=target+(offset+slope*dt)*decay;
    response.velocity=(response.velocity-rate*slope*dt)*decay;
   }
   letter.rotation.x=pitch[i%6]+.085*response.weight;
   letter.position.y=baseline[i]+drift;
  });
  renderer.render(scene,camera);
 }
 const pointer=e=>{
  hovered=null;
  if(e.pointerType==='touch'||motion.matches)return;
  mx=e.clientX/innerWidth*2-1;
  my=e.clientY/innerHeight*2-1;
  if(e.target!==canvas)return;
  cursor.set(mx,-my);
  raycaster.setFromCamera(cursor,camera);
  hovered=raycaster.intersectObjects(letters,false)[0]?.object;
 };
 const reset=()=>{mx=my=0;hovered=null;};
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
