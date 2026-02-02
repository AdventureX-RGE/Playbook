import { useEffect, useRef } from "react";
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Vector2,
  Vector3,
  Vector4,
  Color,
} from "three";

const vertexShader = `void main(){gl_Position=vec4(position,1.);}`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec4 uParams;
uniform vec4 uParams2;
uniform vec4 uParams3;
uniform vec3 uColor;
uniform vec3 uTailColor;

uvec3 hash3(uvec3 p) {
  p = p * uvec3(0x456789abu, 0x6789ab45u, 0x89ab4567u);
  p.x += p.y * p.z;
  p.y += p.z * p.x;
  p.z += p.x * p.y;
  p ^= p >> 16u;
  p.x += p.y * p.z;
  p.y += p.z * p.x;
  p.z += p.x * p.y;
  return p;
}

const vec3 cK=vec3(.577,.577,.577),cI=vec3(.707,0.,-.707),cJ=vec3(-.408,.816,-.408);

vec2 boxMeteor(vec2 p, float tl, float invTl) {
  float ay = abs(p.y);
  float headD = max(abs(p.x), ay) - 0.15;
  float t = clamp(p.x * invTl, 0.0, 1.0);
  float tw = 0.08 - t * 0.064;
  float insideX = step(0.0, p.x) * step(p.x, tl);
  float tailD = ay - tw;
  float d = mix(headD, min(headD, max(0.0, tailD)), insideX);
  return vec2(d, t * insideX);
}

void main(){
  float pxSz=max(1.,floor(.5+uRes.x/uParams.z));
  vec2 uv=floor(gl_FragCoord.xy/pxSz),r=uRes/pxSz;
  vec3 ray=normalize(vec3((uv-r*.5)/r.x,1.));
  ray=ray.x*cI+ray.y*cJ+ray.z*cK;
  
  float c=-uParams3.w,s=-uParams3.z;
  vec3 camP=(c*1.2*cI+s*1.2*cJ+.3*cK)*uTime*uParams.w;
  vec3 pos=camP;
  
  vec3 st=1./max(abs(ray),vec3(.001));
  vec3 sg=step(ray,vec3(0.));
  vec3 ph=fract(pos)*st;
  ph=mix(st-ph,ph,sg);
  
  float rk=1./dot(ray,cK),idf=1./uParams2.x,hr=.5/r.x,tlm=uParams3.y*10.;
  float density=uParams3.x;
  float invTlm=1./tlm;
  
  for(int i=0;i<64;i++){
    float t=dot(pos-camP,cK);
    if(t>=uParams2.y)break;
    
    vec3 fp=floor(pos);
    uvec3 h=hash3(uvec3(ivec3(fp)));
    vec3 hf=vec3(h)*(1./4294967296.);
    
    if(hf.x<density){
      vec3 mp=hf*.6+.2+fp;
      float ti=dot(mp-pos,cK)*rk;
      if(ti>0.){
        vec3 tp=pos+ray*ti-mp;
        float tx=dot(tp,cI),ty=dot(tp,cJ);
        float dp=dot(mp-camP,cK);
        float sz=max(uParams.x,uParams.y*dp*hr),isz=1./sz;
        vec2 rp=vec2(c*tx+s*ty,-s*tx+c*ty)*isz;
        vec2 md=boxMeteor(rp,tlm,invTlm);
        float d=md.x,tt=md.y;
        if(d<0.5){
          float sr=uParams.x*isz;
          float I=exp2(-(t+ti)*idf)*min(1.,sr*sr)*uParams2.z*(1.-tt*.9);
          gl_FragColor=vec4(mix(uColor,uTailColor,tt)*pow(vec3(I),vec3(uParams2.w)),1.);
          return;
        }
      }
    }
    
    float ns=min(min(ph.x,ph.y),ph.z);
    vec3 sl=step(ph,vec3(ns));
    ph=ph-ns+st*sl;
    pos=mix(pos+ray*ns,floor(pos+ray*ns+.5),sl);
  }
  gl_FragColor=vec4(0.);
}`;

interface Props {
  color?: string;
  tailColor?: string;
  meteorSize?: number;
  minMeteorSize?: number;
  pixelResolution?: number;
  speed?: number;
  depthFade?: number;
  farPlane?: number;
  brightness?: number;
  gamma?: number;
  density?: number;
  tailLength?: number;
  direction?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function MobaiMeteor({
  color = "#ffffff",
  tailColor = "#ff6b35",
  meteorSize = 0.015,
  minMeteorSize = 1.5,
  pixelResolution = 200,
  speed = 2.5,
  depthFade = 10,
  farPlane = 25,
  brightness = 1.2,
  gamma = 0.5,
  density = 0.15,
  tailLength = 0.8,
  direction = 225,
  className = "",
  style = {},
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef<{
    renderer?: WebGLRenderer;
    material?: ShaderMaterial;
    raf?: number;
    time: number;
    lastFrame: number;
    visible: boolean;
  }>({ time: 0, lastFrame: 0, visible: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const s = state.current;
    const scene = new Scene();
    const cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: false,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(el.offsetWidth, el.offsetHeight);
    el.appendChild(renderer.domElement);
    s.renderer = renderer;

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new Vector2(el.offsetWidth, el.offsetHeight) },
        uParams: { value: new Vector4() },
        uParams2: { value: new Vector4() },
        uParams3: { value: new Vector4() },
        uColor: { value: new Vector3() },
        uTailColor: { value: new Vector3() },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    s.material = material;

    scene.add(new Mesh(new PlaneGeometry(2, 2), material));

    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(([e]) => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const { width: w, height: h } = e.contentRect;
        if (w > 0 && h > 0) {
          renderer.setSize(w, h);
          material.uniforms.uRes.value.set(w, h);
        }
      }, 50);
    });
    ro.observe(el);

    const io = new IntersectionObserver(
      ([e]) => {
        s.visible = e.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(el);

    s.lastFrame = performance.now();
    const animate = (now: number) => {
      s.raf = requestAnimationFrame(animate);
      const dt = Math.min(now - s.lastFrame, 100);
      s.lastFrame = now;
      s.time += dt;
      if (s.visible) {
        material.uniforms.uTime.value = s.time * 0.001;
        renderer.render(scene, cam);
      }
    };
    s.raf = requestAnimationFrame(animate);

    return () => {
      if (s.raf) cancelAnimationFrame(s.raf);
      clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      el.removeChild(renderer.domElement);
      renderer.dispose();
      material.dispose();
    };
  }, []);

  useEffect(() => {
    const m = state.current.material;
    if (!m) return;

    const rad = (direction * Math.PI) / 180;
    const c = new Color(color);
    const tc = new Color(tailColor);

    (m.uniforms.uParams.value as Vector4).set(
      meteorSize,
      minMeteorSize,
      pixelResolution,
      speed,
    );
    (m.uniforms.uParams2.value as Vector4).set(
      depthFade,
      farPlane,
      brightness,
      gamma,
    );
    (m.uniforms.uParams3.value as Vector4).set(
      density,
      tailLength,
      Math.sin(rad),
      Math.cos(rad),
    );
    (m.uniforms.uColor.value as Vector3).set(c.r, c.g, c.b);
    (m.uniforms.uTailColor.value as Vector3).set(tc.r, tc.g, tc.b);
  }, [
    color,
    tailColor,
    meteorSize,
    minMeteorSize,
    pixelResolution,
    speed,
    depthFade,
    farPlane,
    brightness,
    gamma,
    density,
    tailLength,
    direction,
  ]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "absolute", inset: 0, contain: "strict", ...style }}
    />
  );
}
