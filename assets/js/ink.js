// Ink look for any mesh: flat fill (or texture), world-lit screen-space hatching, inverted-hull outline.
import * as THREE from 'three';
THREE.ColorManagement.enabled = false;

export const C = {
  paper: 0xf7f4ec, paper2: 0xece6d8, ink: 0x111114, blue: 0x0866ff, blueLt: 0xcfe0ff, grey: 0xb4b7bd, grey2: 0x8f939a,
  wood: 0xe3bf82, green: 0x7fb88a, red: 0xe0321c,
};
const LIGHT = new THREE.Vector3(-0.45, 1.0, 0.6).normalize();
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const cache = new Map();

const VS = `varying vec3 vN; varying vec2 vUv;
  void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FS = `uniform vec3 uColor; uniform vec3 uInk; uniform vec3 uLight; uniform float uDpr,uT1,uT2,uS,uW,uHasMap; uniform sampler2D uMap; varying vec3 vN; varying vec2 vUv;
  void main(){
    float d = dot(normalize(vN), uLight);
    vec2 p = gl_FragCoord.xy / uDpr;
    float wob = 1.2*sin(p.y*0.042 + p.x*0.008);
    float h1 = step(mod(p.x + p.y + wob, uS), uW);
    float h2 = step(mod(p.x - p.y + wob, uS), uW);
    float ink = max(step(d, uT1)*h1, step(d, uT2)*h2);
    vec3 base = uColor;
    if (uHasMap > 0.5) { vec4 t = texture2D(uMap, vUv); base = mix(uColor, t.rgb, t.a); }
    gl_FragColor = vec4(mix(base, uInk, ink), 1.0);
  }`;

export function inkMat(color, { map = null, t1 = 0.12, t2 = -0.5 } = {}) {
  const key = map ? null : `${color}|${t1}|${t2}`;
  if (key && cache.has(key)) return cache.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uInk: { value: new THREE.Color(C.ink) }, uLight: { value: LIGHT },
      uDpr: { value: DPR }, uT1: { value: t1 }, uT2: { value: t2 }, uS: { value: 8.0 }, uW: { value: 1.3 },
      uHasMap: { value: map ? 1 : 0 }, uMap: { value: map },
    },
    vertexShader: VS, fragmentShader: FS,
  });
  if (key) cache.set(key, m);
  return m;
}

const hullCache = new Map();
function hullMat(t) {
  const k = t.toFixed(4);
  if (hullCache.has(k)) return hullCache.get(k);
  const om = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
  om.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * ${k};`); };
  om.customProgramCacheKey = () => 'hull' + k;
  hullCache.set(k, om); return om;
}

// Add an ink outline to every mesh under root (call after the object is placed/scaled).
export function outline(root, OUT = 0.02) {
  root.updateMatrixWorld(true);
  const meshes = []; root.traverse(o => { if (o.isMesh && !o.userData.noOutline && !o.userData.isHull) meshes.push(o); });
  for (const m of meshes) {
    const ws = new THREE.Vector3(); m.getWorldScale(ws);
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const bs = new THREE.Vector3(); m.geometry.boundingBox.getSize(bs);
    const dims = [bs.x * ws.x, bs.y * ws.y, bs.z * ws.z].filter(v => v > 1e-4);
    const sc = Math.cbrt(Math.abs(ws.x * ws.y * ws.z) || 1), rad = Math.min(...dims) / 2;
    const t = Math.min(OUT, rad * 0.45) / sc;
    const h = new THREE.Mesh(m.geometry, hullMat(t)); h.userData.isHull = true; h.raycast = () => {};
    m.add(h);
  }
}

// Swap the model's standard materials for ink ones.
export function inkify(root, map) {
  root.traverse(o => { if (o.isMesh && !o.userData.isHull) { o.material = inkMat(map.get(o.material) ?? C.paper); o.castShadow = o.receiveShadow = false; } });
}

// A hatched ellipse on the floor (contact shadow).
export function shadowBlob(w = 1.1, d = 0.5) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uDpr: { value: DPR }, uInk: { value: new THREE.Color(C.ink) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uDpr; uniform vec3 uInk; varying vec2 vUv;
      void main(){ vec2 q=(vUv-0.5)*2.0; float r=dot(q,q); vec2 p=gl_FragCoord.xy/uDpr;
        if (step(mod(p.x+p.y,6.0),1.2)*step(r,1.0) < 0.5) discard; gl_FragColor=vec4(uInk,0.85); }`,
  });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  s.rotation.x = -Math.PI / 2; s.position.y = 0.006; s.userData.noOutline = true; s.raycast = () => {};
  return s;
}
