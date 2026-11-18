import { CatmullRomCurve3, Vector3, BufferGeometry, Float32BufferAttribute } from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';

// Each stroke is a spatial centerline. Smooth unions weld the shoulders and
// crossbars into the same inflated skin as the main stroke.
const upright=[[-.55,-1.34],[-.56,-.2],[-.53,1.27]];
const bowl=[[-.53,1.27],[-.03,1.34],[.49,1.17],[.62,.72],[.49,.28],[-.02,.10],[-.53,.11]];
const paths={
 P:[upright,bowl],R:[upright,bowl,[[-.22,.12],[.16,-.47],[.68,-1.32]]],
 A:[[[-.72,-1.34],[-.38,.02],[.01,1.32],[.39,.04],[.72,-1.31]],[[-.48,-.49],[.02,-.45],[.48,-.48]]],
 N:[[[-.61,-1.32],[-.61,.05],[-.60,1.33],[-.05,.16],[.61,-1.31],[.62,.06],[.61,1.32]]],
 V:[[[-.69,1.31],[-.35,.02],[.02,-1.33],[.39,.04],[.69,1.33]]]
};
export function sculpt(letter, material){
 const size=64, extent=1.85;
 const field=new MarchingCubes(size,material,false,false,36000);
 field.isolation=0;
 const strokes=paths[letter].map(points=>{
  const curve=new CatmullRomCurve3(points.map(([x,y])=>new Vector3(x,y,.07*Math.sin(2*y+x))),false,'catmullrom',points===bowl?.48:.20);
  return curve.getPoints(points.length*4).slice(1).map((b,i,arr)=>{
   const a=i?arr[i-1]:curve.getPoint(0),d=b.clone().sub(a);
   return [a.x,a.y,a.z,d.x,d.y,d.z,1/d.lengthSq()];
  });
 });
 for(let z=1;z<size-1;z++)for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
  const px=(2*x/size-1)*extent,py=(2*y/size-1)*extent,pz=(2*z/size-1)*extent;
  let dist=2;
  if(Math.abs(pz)<.58 && Math.abs(px)<1.15){
   for(const segments of strokes){
    let near=10;
    for(const [ax,ay,az,dx,dy,dz,inv] of segments){
     const u=px-ax,v=py-ay,w=pz-az,t=Math.max(0,Math.min(1,(u*dx+v*dy+w*dz)*inv));
     near=Math.min(near,(u-t*dx)**2+(v-t*dy)**2+(w-t*dz)**2);
    }
    const s=Math.sqrt(near)-(.278+.015*Math.cos(py*2+px));
    const h=Math.max(.19-Math.abs(dist-s),0);dist=Math.min(dist,s)-h*h/.76;
   }
  }
  field.field[x+size*(y+size*z)]=-dist;
 }
 field.update();
 const geometry=new BufferGeometry();
 for(const key of ['position','normal'])geometry.setAttribute(key,new Float32BufferAttribute(field.geometry.attributes[key].array.slice(0,field.count*3),3));
 geometry.scale(extent,extent,extent);geometry.normalizeNormals();field.geometry.dispose();return geometry;
}
