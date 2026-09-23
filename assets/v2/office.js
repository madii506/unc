// UNC HQ: a full floor of an ink-drawn virtual office. Everything unc can walk up to is an `item`.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { C, inkMat, outline, shadowBlob } from './ink.js';

export const FLOOR = { x0: -14, x1: 14, z0: -10, z1: 10 };
const WALL_H = 3.1;

function box(w, h, d, color, pos, r = 0.035, opts = {}) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1)), inkMat(color, opts));
  m.position.set(...pos); if (opts.rot) m.rotation.set(...opts.rot);
  return m;
}
const cyl = (rt, rb, h, color, pos, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), inkMat(color)); m.position.set(...pos); return m; };
const sph = (r, color, pos, scale = [1, 1, 1]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), inkMat(color)); m.position.set(...pos); m.scale.set(...scale); return m; };

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.colorSpace = THREE.NoColorSpace;
  t.userData = { cv, draw };
  return t;
}
const FD = px => `${px}px Anton, Impact, sans-serif`;
const FM = (px, w = 600) => `${w} ${px}px Plex, "IBM Plex Mono", monospace`;
const FS = (px, w = 800) => `${w} ${px}px Inter, system-ui, sans-serif`;
const INK = '#111114', PAPER = '#f7f4ec', BLUE = '#0866ff', NAVY = '#0a1f55';

function signPlane(tex, w, h, pos, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), inkMat(C.paper, { map: tex, t1: -2 }));
  m.position.set(...pos); m.rotation.y = rotY; m.userData.noOutline = true;
  const frame = box(w + 0.08, h + 0.08, 0.05, C.ink, [0, 0, -0.03], 0.02, { t1: -2 });
  frame.userData.noOutline = true; m.add(frame);
  return m;
}
const bigText = (lines, bg, fg, size, w = 700, h = 420) => canvasTex(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = FD(size); g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 0.95 + 6));
});

// nobody here has legs
function colleague(shirt, hairColor) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.28, 8, 20), inkMat(shirt)); torso.scale.set(1, 1, 0.78); body.add(torso);
  const head = new THREE.Group(); head.position.y = 0.58; body.add(head);
  head.add(sph(0.22, C.paper, [0, 0, 0], [1, 1.05, 1]));
  head.add(sph(0.2, hairColor, [0, 0.09, -0.03], [1.05, 0.72, 1.02]));
  for (const s of [-1, 1]) { head.add(sph(0.028, C.ink, [s * 0.075, 0, 0.2], [1, 1.3, 0.6])); body.add(sph(0.075, C.paper, [s * 0.34, -0.12, 0.12])); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 20, Math.PI), inkMat(C.ink)); smile.position.set(0, -0.08, 0.2); smile.rotation.z = Math.PI; head.add(smile);
  g.userData.head = head; g.userData.body = body;
  return g;
}

export function buildOffice(scene) {
  const root = new THREE.Group(); scene.add(root);
  const items = [], obstacles = [], colleagues = [], anims = [], seats = {}, texes = [];
  const state = { count: null, countOk: true, ca: '' };
  const tex = (t) => { texes.push(t); return t; };
  const item = o => { items.push(o); if (o.obstacle) obstacles.push(o.obstacle); return o; };
  const block = (x, z, hx, hz) => obstacles.push({ x, z, box: [hx, hz] });
  const W = FLOOR.x1 - FLOOR.x0, D = FLOOR.z1 - FLOOR.z0;

  // ---------- the building around the office (so there is never a void) ----------
  const groundTex = tex(canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e3dccb'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(17,17,20,.08)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }));
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), inkMat(0xe3dccb, { map: groundTex, t1: -2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.21; ground.userData.noOutline = true; root.add(ground);

  // ---------- the floor: carpet tiles + zone rugs ----------
  const floorTex = tex(canvasTex(2240, 1600, (g, w, h) => {
    const u = w / W; g.fillStyle = '#efe9dc'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(17,17,20,.12)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += u) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += u) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const X = x => (x - FLOOR.x0) * u, Z = z => (z - FLOOR.z0) * u;
    const rug = (x0, z0, x1, z1, fill) => { g.fillStyle = fill; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.roundRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0), 26); g.fill(); g.stroke(); };
    rug(-13.6, 0.6, -8.6, 6.2, '#dfe9ff');         // lounge
    rug(-13.6, -9.6, -9.2, -5.2, '#e8dcc4');       // corner office
    rug(-2.2, -9.4, 2.2, -6.2, '#d9e4ff');         // lobby
    rug(9.6, 1.1, 13.5, 6.9, '#e6e1d6');           // meeting room
    // the metaverse pad
    g.fillStyle = BLUE; g.strokeStyle = INK; g.lineWidth = 6;
    g.beginPath(); g.arc(X(0), Z(6.9), 1.35 * u, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#efe9dc'; g.beginPath(); g.arc(X(0), Z(6.9), 0.95 * u, 0, 7); g.fill(); g.stroke();
    g.fillStyle = BLUE; g.beginPath(); g.arc(X(0), Z(6.9), 0.5 * u, 0, 7); g.fill(); g.stroke();
  }));
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), inkMat(C.paper2)); slab.position.set(0, -0.1, 0); root.add(slab);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), inkMat(C.paper2, { map: floorTex, t1: -2 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; floor.userData.noOutline = true; floor.name = 'floor'; root.add(floor);

  // ---------- walls: full at the back and left, low at the front and right ----------
  root.add(box(W, WALL_H, 0.2, C.paper, [0, WALL_H / 2, FLOOR.z0 - 0.1], 0.02));
  root.add(box(0.2, WALL_H, D, C.paper, [FLOOR.x0 - 0.1, WALL_H / 2, 0], 0.02));
  root.add(box(W, 0.18, 0.06, C.blue, [0, 0.09, FLOOR.z0 + 0.03], 0.02));
  root.add(box(0.06, 0.18, D, C.blue, [FLOOR.x0 + 0.03, 0.09, 0], 0.02));
  root.add(box(W + 0.2, 0.12, 0.3, C.ink, [0, WALL_H + 0.06, FLOOR.z0 - 0.1], 0.02));
  root.add(box(0.3, 0.12, D, C.ink, [FLOOR.x0 - 0.1, WALL_H + 0.06, 0], 0.02));
  root.add(box(W + 0.2, 0.45, 0.2, C.paper, [0.1, 0.225, FLOOR.z1 + 0.1], 0.03));
  root.add(box(0.2, 0.45, D + 0.2, C.paper, [FLOOR.x1 + 0.1, 0.225, 0.1], 0.03));
  root.add(box(W + 0.2, 0.06, 0.24, C.blue, [0.1, 0.46, FLOOR.z1 + 0.1], 0.02));
  root.add(box(0.24, 0.06, D + 0.2, C.blue, [FLOOR.x1 + 0.1, 0.46, 0.1], 0.02));

  // ================= LOBBY (back middle): the elevator you arrive in =================
  const elev = new THREE.Group(); elev.position.set(0, 0, FLOOR.z0 + 0.02); root.add(elev);
  elev.add(box(2.0, 2.6, 0.16, C.ink, [0, 1.3, 0.02], 0.03));
  elev.add(box(1.55, 2.35, 0.06, 0x2a2d36, [0, 1.17, 0.05], 0.01, { t1: -2 }));
  const doorL = box(0.76, 2.3, 0.06, C.grey, [-0.385, 1.16, 0.11], 0.012), doorR = box(0.76, 2.3, 0.06, C.grey, [0.385, 1.16, 0.11], 0.012);
  elev.add(doorL, doorR);
  elev.add(signPlane(tex(bigText(['▲ 1'], NAVY, '#8fb5ff', 92, 260, 120)), 0.62, 0.29, [0, 2.84, 0.12]));
  elev.userData.setOpen = k => { doorL.position.x = -0.385 - 0.74 * k; doorR.position.x = 0.385 + 0.74 * k; };
  item({ id: 'elevator', prompt: 'Take the elevator', at: [0, -8.9], r: 1.0, stand: [0, -8.75], face: Math.PI, group: elev });

  // READ ME podium
  const readme = new THREE.Group(); readme.position.set(-1.7, 0, -7.6); readme.rotation.y = -0.4; root.add(readme);
  readme.add(box(0.5, 1.0, 0.4, C.ink, [0, 0.5, 0], 0.03));
  readme.add(box(0.62, 0.06, 0.5, C.wood, [0, 1.03, 0.02], 0.02, { rot: [0.25, 0, 0] }));
  const rm = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), inkMat(C.paper, { map: tex(bigText(['READ', 'ME'], BLUE, '#fff', 88, 320, 240)), t1: -2 }));
  rm.position.set(0, 1.07, 0.03); rm.rotation.x = -Math.PI / 2 + 0.25; rm.userData.noOutline = true; readme.add(rm);
  item({ id: 'readme', prompt: 'Read the fine print', at: [-1.55, -7.0], r: 0.95, stand: [-1.5, -6.95], face: Math.PI - 0.4, group: readme, obstacle: { x: -1.7, z: -7.6, r: 0.36 } });

  // reception / badge desk
  const kiosk = new THREE.Group(); kiosk.position.set(3.3, 0, -8.5); root.add(kiosk);
  kiosk.add(box(2.4, 1.0, 0.85, C.blue, [0, 0.5, 0]));
  kiosk.add(box(2.55, 0.08, 1.0, C.wood, [0, 1.04, 0.02]));
  kiosk.add(box(0.5, 0.36, 0.05, C.ink, [0.6, 1.3, -0.15], 0.02, { rot: [-0.25, 0, 0] }));
  kiosk.add(box(0.44, 0.3, 0.02, C.blueLt, [0.6, 1.3, -0.12], 0.01, { rot: [-0.25, 0, 0], t1: -2 }));
  kiosk.add(box(0.36, 0.05, 0.26, C.paper, [-0.5, 1.1, 0.1], 0.01));
  root.add(signPlane(tex(bigText(['UNC BADGES'], BLUE, '#fff', 150, 900, 300)), 2.4, 0.8, [3.3, 2.3, FLOOR.z0 + 0.04]));
  item({ id: 'kiosk', prompt: 'Get your unc badge', at: [3.3, -7.45], r: 1.3, stand: [3.3, -7.35], face: Math.PI, group: kiosk, obstacle: { x: 3.3, z: -8.8, box: [1.28, 0.85] } });

  // the wall clock (real time)
  const clk = new THREE.Group(); clk.position.set(-1.9, 2.5, FLOOR.z0 + 0.06); root.add(clk);
  const face = cyl(0.3, 0.3, 0.05, C.paper, [0, 0, 0], 32); face.rotation.x = Math.PI / 2; clk.add(face);
  const hH = new THREE.Group(), hM = new THREE.Group(); hH.add(box(0.035, 0.17, 0.02, C.ink, [0, 0.07, 0.04], 0.008)); hM.add(box(0.025, 0.25, 0.02, C.ink, [0, 0.11, 0.05], 0.008)); clk.add(hH, hM);
  for (let i = 0; i < 12; i++) clk.add(box(0.02, 0.05, 0.02, C.ink, [Math.sin(i * Math.PI / 6) * 0.24, Math.cos(i * Math.PI / 6) * 0.24, 0.035], 0.005));
  anims.push(() => { const d = new Date(); hM.rotation.z = -(d.getMinutes() + d.getSeconds() / 60) / 60 * Math.PI * 2; hH.rotation.z = -((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2; });

  // ================= THE FEED + window + printer (back right) =================
  const feedTex = tex(canvasTex(900, 500, (g, w, h) => {
    g.fillStyle = NAVY; g.fillRect(0, 0, w, h); g.fillStyle = BLUE; g.fillRect(0, 0, w, 86);
    g.fillStyle = '#fff'; g.font = FD(58); g.textBaseline = 'middle'; g.fillText('THE FEED', 34, 46);
    g.font = FM(24); g.textAlign = 'right'; g.fillText('● ON', w - 34, 46); g.textAlign = 'left';
    [['$UNC', 'Solana · pump.fun'], ['THE STOCK', 'META'], ['FEES', 'buy META for holders'], ['CA', state.ca || 'soon']].forEach(([k, v], i) => {
      const y = 140 + i * 62; g.fillStyle = '#8fb5ff'; g.font = FM(22); g.fillText(k, 34, y); g.fillStyle = '#fff'; g.font = FS(30); g.fillText(v, 250, y);
    });
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(34, 400); g.lineTo(w - 34, 400); g.stroke();
    g.fillStyle = '#8fb5ff'; g.font = FM(22); g.fillText('UNCS BADGED', 34, 452);
    g.fillStyle = '#fff'; g.font = FD(92); g.textAlign = 'right';
    g.fillText(Number.isFinite(state.count) ? state.count.toLocaleString('en-US') : '—', w - 34, 452); g.textAlign = 'left';
  }));
  const feed = signPlane(feedTex, 3.8, 2.1, [7.6, 1.8, FLOOR.z0 + 0.05]); root.add(feed);
  item({ id: 'feed', prompt: 'Read the feed', at: [7.6, -8.9], r: 1.6, stand: [7.6, -8.7], face: Math.PI, group: feed });
  const winTex = tex(canvasTex(500, 400, (g, w, h) => {
    g.fillStyle = '#bcd4ff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 5;
    const cloud = (x, y, s) => { g.beginPath(); g.arc(x, y, 34 * s, Math.PI, 0); g.arc(x + 44 * s, y - 12 * s, 40 * s, Math.PI, 0); g.arc(x + 92 * s, y, 30 * s, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); };
    cloud(70, 150, 1.1); cloud(260, 260, 0.9);
    g.strokeStyle = '#3a5fb0'; g.lineWidth = 4;
    for (let i = 0; i < 16; i++) { const x = 40 + (i * 53) % 440, y = 190 + (i * 37) % 170; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 26); g.stroke(); }
    g.fillStyle = INK; g.fillRect(w / 2 - 6, 0, 12, h); g.fillRect(0, h / 2 - 6, w, 12);
  }));
  const win = signPlane(winTex, 1.9, 1.5, [11.1, 1.9, FLOOR.z0 + 0.05]); root.add(win);
  item({ id: 'window', prompt: 'Look outside', at: [11.1, -9.0], r: 1.1, stand: [11.1, -8.85], face: Math.PI, group: win });
  const printer = new THREE.Group(); printer.position.set(13.1, 0, -9.3); root.add(printer);
  printer.add(box(0.9, 0.7, 0.7, C.grey, [0, 0.35, 0])); printer.add(box(0.95, 0.28, 0.72, C.paper, [0, 0.84, 0]));
  printer.add(box(0.5, 0.03, 0.3, C.ink, [0, 0.99, 0.08], 0.01));
  const paper = box(0.42, 0.01, 0.36, 0xffffff, [0, 0.72, 0.3], 0.004); printer.add(paper); paper.visible = false; printer.userData.paper = paper;
  item({ id: 'printer', prompt: 'Print something', at: [13.0, -8.4], r: 1.1, stand: [12.9, -8.35], face: Math.PI, group: printer, obstacle: { x: 13.1, z: -9.3, r: 0.6 } });

  // ================= KITCHEN (back left of the lobby) =================
  const kitchen = new THREE.Group(); root.add(kitchen);
  kitchen.add(box(4.2, 0.95, 0.8, C.paper, [-5.6, 0.475, FLOOR.z0 + 0.45]));
  kitchen.add(box(4.3, 0.07, 0.9, C.ink, [-5.6, 0.98, FLOOR.z0 + 0.45], 0.02));
  kitchen.add(box(4.2, 0.7, 0.4, C.paper, [-5.6, 2.25, FLOOR.z0 + 0.25]));      // cupboards
  for (let i = 0; i < 4; i++) kitchen.add(box(0.05, 0.5, 0.02, C.ink, [-7.1 + i * 1.0, 2.25, FLOOR.z0 + 0.46], 0.01));
  block(-5.6, FLOOR.z0 + 0.45, 2.1, 0.45);
  const coffee = new THREE.Group(); coffee.position.set(-4.2, 1.0, FLOOR.z0 + 0.45); root.add(coffee);
  coffee.add(box(0.45, 0.55, 0.4, C.ink, [0, 0.275, 0], 0.04)); coffee.add(cyl(0.07, 0.06, 0.12, C.paper, [0, 0.07, 0.25]));
  item({ id: 'coffee', prompt: 'Make coffee', at: [-4.2, -8.6], r: 0.9, stand: [-4.2, -8.55], face: Math.PI, group: coffee });
  const fridge = new THREE.Group(); fridge.position.set(-8.3, 0, FLOOR.z0 + 0.5); root.add(fridge);
  fridge.add(box(0.95, 2.1, 0.85, C.paper, [0, 1.05, 0], 0.06)); fridge.add(box(0.95, 0.03, 0.87, C.ink, [0, 1.35, 0], 0.01));
  fridge.add(box(0.05, 0.4, 0.06, C.ink, [0.36, 1.65, 0.45], 0.02)); fridge.add(box(0.05, 0.4, 0.06, C.ink, [0.36, 0.95, 0.45], 0.02));
  fridge.add(box(0.2, 0.26, 0.01, 0xfff3b0, [-0.15, 1.7, 0.43], 0.004)); // a note on the fridge
  item({ id: 'fridge', prompt: 'Open the fridge', at: [-8.3, -8.5], r: 0.95, stand: [-8.3, -8.45], face: Math.PI, group: fridge, obstacle: { x: -8.3, z: FLOOR.z0 + 0.5, box: [0.5, 0.45] } });
  const vend = new THREE.Group(); vend.position.set(-2.35, 0, FLOOR.z0 + 0.55); root.add(vend);
  vend.add(box(0.95, 1.95, 0.8, C.blue, [0, 0.975, 0], 0.05));
  const vTex = tex(canvasTex(300, 420, (g, w, h) => { g.fillStyle = '#dfe9ff'; g.fillRect(0, 0, w, h); ['PRUNES', 'FIBER', 'DECAF', 'ANTACID'].forEach((t, i) => { g.fillStyle = INK; g.fillRect(14, 16 + i * 100, w - 28, 4); g.font = FM(30); g.fillText(t, 22, 70 + i * 100); g.fillStyle = BLUE; g.fillRect(w - 70, 40 + i * 100, 40, 40); }); }));
  vend.add(signPlane(vTex, 0.62, 0.87, [0, 1.25, 0.43]));
  item({ id: 'vending', prompt: 'Get a snack', at: [-2.35, -8.4], r: 0.9, stand: [-2.35, -8.35], face: Math.PI, group: vend, obstacle: { x: -2.35, z: FLOOR.z0 + 0.55, box: [0.5, 0.42] } });
  const cafe = new THREE.Group(); cafe.position.set(-5.8, 0, -6.6); root.add(cafe);
  cafe.add(cyl(0.55, 0.55, 0.05, C.wood, [0, 0.76, 0], 32)); cafe.add(cyl(0.05, 0.05, 0.74, C.ink, [0, 0.37, 0], 10)); cafe.add(cyl(0.28, 0.3, 0.04, C.ink, [0, 0.02, 0], 20));
  for (const a of [0.4, 2.6, 4.6]) { const st = new THREE.Group(); st.position.set(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85); cafe.add(st); st.add(cyl(0.2, 0.2, 0.05, C.blue, [0, 0.62, 0])); st.add(cyl(0.03, 0.03, 0.6, C.ink, [0, 0.3, 0], 8)); }
  obstacles.push({ x: -5.8, z: -6.6, r: 0.75 });
  const cork = signPlane(tex(canvasTex(700, 520, (g, w, h) => {
    g.fillStyle = '#c99a5b'; g.fillRect(0, 0, w, h); g.fillStyle = INK; g.font = FD(64); g.fillText('MARKETPLACE', 36, 84);
    [['is this still\navailable?', '#fffbe8', -0.05], ['free couch.\nbad back.', '#dfe9ff', 0.04], ['lost:\nreading glasses', '#fff', 0.03], ['selling: VR\nheadset. used once.', '#ffe3dc', -0.04]].forEach(([t, col, rot], i) => {
      g.save(); g.translate(40 + (i % 2) * 330, 120 + Math.floor(i / 2) * 190); g.rotate(rot);
      g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 4; g.fillRect(0, 0, 290, 160); g.strokeRect(0, 0, 290, 160);
      g.fillStyle = '#e0321c'; g.beginPath(); g.arc(145, 14, 10, 0, 7); g.fill();
      g.fillStyle = INK; g.font = FS(30); t.split('\n').forEach((ln, j) => g.fillText(ln, 18, 62 + j * 38)); g.restore();
    });
  })), 1.9, 1.4, [FLOOR.x0 + 0.05, 1.75, -6.6], Math.PI / 2);
  root.add(cork);
  item({ id: 'cork', prompt: 'Check Marketplace', at: [-13.2, -6.6], r: 1.0, stand: [-13.1, -6.6], face: -Math.PI / 2, group: cork });

  // ================= CORNER OFFICE (back left): unc's recliner =================
  const office = new THREE.Group(); root.add(office);
  office.add(box(2.2, 0.08, 1.0, C.wood, [-11.4, 0.78, -8.7])); office.add(box(0.1, 0.76, 0.9, C.ink, [-12.4, 0.38, -8.7], 0.02)); office.add(box(0.1, 0.76, 0.9, C.ink, [-10.4, 0.38, -8.7], 0.02));
  office.add(box(0.62, 0.42, 0.05, C.ink, [-11.4, 1.1, -9.0], 0.02)); office.add(box(0.56, 0.36, 0.02, C.blueLt, [-11.4, 1.1, -8.97], 0.01, { t1: -2 }));
  office.add(cyl(0.07, 0.06, 0.13, C.paper, [-10.8, 0.88, -8.5])); // the mug
  block(-11.4, -8.7, 1.15, 0.52);
  const shelf = new THREE.Group(); shelf.position.set(FLOOR.x0 + 0.3, 0, -8.6); root.add(shelf);
  shelf.add(box(0.5, 2.0, 1.6, C.wood, [0, 1.0, 0], 0.03));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) shelf.add(box(0.3, 0.32, 0.12, [C.blue, C.paper, C.ink, C.grey][(i + j) % 4], [0.1, 0.35 + i * 0.45, -0.55 + j * 0.27], 0.02));
  block(FLOOR.x0 + 0.3, -8.6, 0.3, 0.85);
  const cert = signPlane(tex(bigText(["WORLD'S", 'OKAYEST', 'UNC'], PAPER, INK, 84, 520, 380)), 1.0, 0.73, [FLOOR.x0 + 0.05, 1.9, -6.95 + 0.3 - 0.3], Math.PI / 2);
  cert.position.z = -5.4; root.add(cert);
  const recliner = new THREE.Group(); recliner.position.set(-11.0, 0, -6.5); recliner.rotation.y = Math.PI * 0.8; root.add(recliner);
  recliner.add(box(1.0, 0.45, 0.95, 0x6b4a2b, [0, 0.3, 0], 0.1)); recliner.add(box(1.0, 1.0, 0.28, 0x6b4a2b, [0, 0.7, -0.4], 0.1));
  recliner.add(box(0.2, 0.62, 0.95, 0x5a3a22, [-0.52, 0.4, 0], 0.08)); recliner.add(box(0.2, 0.62, 0.95, 0x5a3a22, [0.52, 0.4, 0], 0.08));
  recliner.add(box(0.8, 0.12, 0.55, 0x6b4a2b, [0, 0.3, 0.7], 0.05));
  seats.recliner = { pos: [-11.0, -6.5], face: Math.PI * 0.8, y: -0.25, legs: 1.45, stand: [-10.5, -5.8] };
  item({ id: 'recliner', prompt: 'Sit in the recliner', seat: 'recliner', at: [-10.5, -5.8], r: 1.1, stand: [-10.45, -5.75], face: Math.PI * 0.8, group: recliner, obstacle: { x: -11.0, z: -6.5, r: 0.55 } });

  // ================= LEFT WALL: water cooler, thermostat =================
  const cooler = new THREE.Group(); cooler.position.set(-13.45, 0, -3.4); root.add(cooler);
  cooler.add(box(0.5, 0.95, 0.5, C.paper, [0, 0.475, 0])); cooler.add(cyl(0.2, 0.2, 0.48, C.blueLt, [0, 1.2, 0])); cooler.add(sph(0.2, C.blueLt, [0, 1.44, 0], [1, 0.4, 1])); cooler.add(box(0.08, 0.06, 0.08, C.blue, [0.26, 0.72, 0.1], 0.01));
  item({ id: 'cooler', prompt: 'Water cooler talk', at: [-12.6, -3.4], r: 1.1, stand: [-12.55, -3.4], face: -Math.PI / 2, group: cooler, obstacle: { x: -13.45, z: -3.4, r: 0.45 } });
  const thermo = signPlane(tex(canvasTex(240, 300, (g, w, h) => { g.fillStyle = PAPER; g.fillRect(0, 0, w, h); g.fillStyle = NAVY; g.fillRect(30, 40, w - 60, 120); g.fillStyle = '#8fb5ff'; g.font = FM(40); g.textAlign = 'center'; g.fillText('LOCKED', w / 2, 116); g.fillStyle = INK; g.font = FS(30); g.fillText("DON'T.", w / 2, 230); })), 0.34, 0.42, [FLOOR.x0 + 0.05, 1.45, -1.6], Math.PI / 2);
  root.add(thermo);
  item({ id: 'thermostat', prompt: 'Touch the thermostat', at: [-13.1, -1.6], r: 0.9, stand: [-13.0, -1.6], face: -Math.PI / 2, group: thermo });

  // ================= LOUNGE (left front): couch, cake, poster =================
  const couch = new THREE.Group(); couch.position.set(FLOOR.x0 + 0.75, 0, 3.4); root.add(couch);
  couch.add(box(0.95, 0.42, 2.6, C.grey, [0, 0.21, 0], 0.08)); couch.add(box(0.28, 0.95, 2.6, C.grey, [-0.34, 0.5, 0], 0.08));
  couch.add(box(0.95, 0.62, 0.26, C.grey, [0, 0.32, 1.3], 0.08)); couch.add(box(0.95, 0.62, 0.26, C.grey, [0, 0.32, -1.3], 0.08));
  couch.add(box(0.7, 0.14, 1.15, C.grey2, [0.05, 0.49, 0.58], 0.06)); couch.add(box(0.7, 0.14, 1.15, C.grey2, [0.05, 0.49, -0.58], 0.06));
  root.add(signPlane(tex(bigText(['BACK IN', 'MY DAY'], BLUE, '#fff', 118)), 2.0, 1.2, [FLOOR.x0 + 0.05, 2.05, 3.4], Math.PI / 2));
  seats.couch = { pos: [FLOOR.x0 + 0.98, 3.4], face: Math.PI / 2, y: -0.33, legs: 1.45, stand: [-12.1, 3.4] };
  item({ id: 'couch', prompt: 'Sit down', seat: 'couch', at: [-12.1, 3.4], r: 1.2, stand: [-12.15, 3.4], face: Math.PI / 2, group: couch, obstacle: { x: FLOOR.x0 + 0.75, z: 3.4, box: [0.5, 1.45] } });
  const table = new THREE.Group(); table.position.set(-11.0, 0, 4.6); root.add(table);
  table.add(box(1.1, 0.07, 0.7, C.wood, [0, 0.45, 0]));
  for (const [x, z] of [[-0.46, -0.27], [0.46, -0.27], [-0.46, 0.27], [0.46, 0.27]]) table.add(box(0.06, 0.42, 0.06, C.ink, [x, 0.21, z], 0.01));
  table.add(cyl(0.22, 0.22, 0.18, C.paper, [0, 0.58, 0])); table.add(cyl(0.225, 0.225, 0.04, C.blue, [0, 0.64, 0])); table.add(cyl(0.012, 0.012, 0.12, C.red, [0, 0.72, 0]));
  item({ id: 'cake', prompt: 'Happy birthday!!', at: [-11.0, 5.4], r: 0.9, stand: [-11.0, 5.4], face: Math.PI, group: table, obstacle: { x: -11.0, z: 4.6, r: 0.55 } });
  const tv = new THREE.Group(); tv.position.set(-9.2, 0, 3.4); tv.rotation.y = -Math.PI / 2; root.add(tv);
  tv.add(box(1.6, 0.5, 0.45, C.wood, [0, 0.25, 0])); tv.add(box(1.7, 1.0, 0.08, C.ink, [0, 1.05, 0], 0.03));
  const tvTex = tex(bigText(['THE NEWS'], NAVY, '#8fb5ff', 110, 640, 360));
  tv.add(signPlane(tvTex, 1.55, 0.87, [0, 1.05, 0.05]));
  item({ id: 'tv', prompt: 'Watch the news', at: [-9.9, 3.4], r: 0.9, stand: [-9.95, 3.4], face: Math.PI / 2, group: tv, obstacle: { x: -9.2, z: 3.4, box: [0.28, 0.85] } });

  // ================= PING PONG (middle left) =================
  const pp = new THREE.Group(); pp.position.set(-5.6, 0, 2.2); root.add(pp);
  pp.add(box(2.7, 0.07, 1.5, C.blue, [0, 0.76, 0], 0.02)); pp.add(box(2.7, 0.012, 0.03, 0xffffff, [0, 0.8, 0], 0.005)); pp.add(box(0.03, 0.012, 1.5, 0xffffff, [0, 0.8, 0], 0.005));
  pp.add(box(0.03, 0.16, 1.6, C.ink, [0, 0.87, 0], 0.01));
  for (const [x, z] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]]) pp.add(box(0.07, 0.74, 0.07, C.ink, [x, 0.37, z], 0.02));
  const ball = sph(0.04, 0xffffff, [0.3, 0.95, 0.2]); pp.add(ball);
  anims.push(t => { const p = (t * 0.9) % 2, s = p < 1 ? p : 2 - p; ball.position.set(-1.1 + 2.2 * s, 0.83 + Math.abs(Math.sin(s * Math.PI * 3)) * 0.3, 0.2 * Math.sin(t)); });
  item({ id: 'pingpong', prompt: 'Play ping pong', at: [-5.6, 3.55], r: 1.1, stand: [-5.6, 3.5], face: Math.PI, group: pp, obstacle: { x: -5.6, z: 2.2, box: [1.4, 0.8] } });

  // ================= DESK PODS (middle right): six desks, five legless colleagues, one empty desk =================
  const shirts = [C.paper, C.grey, C.blueLt, C.paper, C.blueLt, C.grey], hair = [C.ink, C.grey2, 0x6b4a2b, 0x6b4a2b, C.ink, C.grey2];
  const deskSpots = [[3.2, -3.0], [5.2, -3.0], [7.2, -3.0], [3.2, 1.3], [5.2, 1.3], [7.2, 1.3]];
  deskSpots.forEach(([x, z], i) => {
    const desk = new THREE.Group(); desk.position.set(x, 0, z); root.add(desk);
    desk.add(box(1.7, 0.07, 0.85, C.wood, [0, 0.76, 0]));
    for (const sx of [-0.78, 0.78]) desk.add(box(0.07, 0.74, 0.8, C.ink, [sx, 0.37, 0], 0.02));
    desk.add(box(0.72, 0.44, 0.05, C.ink, [0, 1.12, -0.18], 0.02)); desk.add(box(0.08, 0.2, 0.08, C.ink, [0, 0.88, -0.2], 0.02));
    desk.add(box(0.5, 0.02, 0.18, C.paper, [0, 0.8, 0.12], 0.008));
    const chair = new THREE.Group(); chair.position.set(x, 0, z - 0.8); root.add(chair);
    chair.add(cyl(0.28, 0.28, 0.08, C.ink, [0, 0.5, 0])); chair.add(box(0.5, 0.5, 0.07, C.ink, [0, 0.82, -0.25], 0.03)); chair.add(cyl(0.03, 0.03, 0.45, C.ink, [0, 0.25, 0], 8));
    if (i === 4) {
      // unc's own desk: mug, family photo, sticky notes
      desk.add(cyl(0.07, 0.06, 0.13, C.blue, [0.55, 0.86, 0.15])); desk.add(box(0.2, 0.16, 0.03, C.ink, [-0.55, 0.88, -0.1], 0.01, { rot: [-0.3, 0.3, 0] }));
      for (let k = 0; k < 3; k++) desk.add(box(0.1, 0.1, 0.01, 0xfff3b0, [-0.25 + k * 0.13, 1.18, -0.15], 0.003));
      seats.desk = { pos: [x, z - 0.72], face: 0, y: -0.2, legs: 1.45, stand: [x, z - 1.5] };
      item({ id: 'mydesk', prompt: 'Sit at your desk', seat: 'desk', at: [x, z + 0.8], r: 1.0, stand: [x, z + 0.85], face: Math.PI, group: desk, obstacle: { x, z: z - 0.35, box: [0.9, 0.8] } });
      return;
    }
    const c = colleague(shirts[i], hair[i]); c.position.set(x, 1.12, z - 0.72); root.add(c);
    const sh = shadowBlob(0.6, 0.3); sh.position.set(x, 0.006, z - 0.55); root.add(sh);
    const idx = colleagues.push({ g: c, phase: i * 1.7 }) - 1;
    item({ id: 'colleague' + i, idx, prompt: 'Say hi', at: [x, z + 0.8], r: 1.0, stand: [x, z + 0.85], face: Math.PI, group: c, obstacle: { x, z: z - 0.35, box: [0.9, 0.8] } });
  });

  // ================= MEETING ROOM (right front): glass walls, knees chart =================
  const glass = new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const pane = (w, h, pos, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); m.position.set(...pos); m.rotation.y = rotY; m.userData.noOutline = true; m.raycast = () => {}; root.add(m); root.add(box(rotY ? 0.06 : w, 0.06, rotY ? w : 0.06, C.ink, [pos[0], h, pos[2]], 0.02)); return m; };
  pane(4.0, 2.2, [11.6, 1.1, 1.0], 0); block(11.6, 1.0, 2.0, 0.06);
  pane(2.4, 2.2, [9.6, 1.1, 2.2], Math.PI / 2); block(9.6, 2.2, 0.06, 1.2);
  pane(1.9, 2.2, [9.6, 1.1, 6.05], Math.PI / 2); block(9.6, 6.05, 0.06, 0.95);
  for (const [x, z] of [[9.6, 1.0], [13.6, 1.0], [9.6, 3.4], [9.6, 5.1], [9.6, 7.0]]) root.add(box(0.08, 2.2, 0.08, C.ink, [x, 1.1, z], 0.02));
  const meet = new THREE.Group(); meet.position.set(11.8, 0, 4.3); root.add(meet);
  meet.add(box(2.2, 0.07, 1.2, C.wood, [0, 0.76, 0], 0.05)); meet.add(box(0.12, 0.72, 0.12, C.ink, [-0.8, 0.36, 0], 0.03)); meet.add(box(0.12, 0.72, 0.12, C.ink, [0.8, 0.36, 0], 0.03));
  meet.add(box(0.28, 0.02, 0.2, C.paper, [0.3, 0.8, 0.1], 0.006));
  const wb = new THREE.Group(); wb.position.set(13.2, 0, 6.2); wb.rotation.y = -1.2; root.add(wb);
  wb.add(box(0.05, 1.3, 0.05, C.ink, [-0.55, 0.65, 0], 0.02)); wb.add(box(0.05, 1.3, 0.05, C.ink, [0.55, 0.65, 0], 0.02));
  wb.add(signPlane(tex(canvasTex(420, 300, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 30); g.lineTo(40, 250); g.lineTo(390, 250); g.stroke();
    g.strokeStyle = BLUE; g.lineWidth = 8; g.beginPath(); g.moveTo(50, 60); g.lineTo(130, 90); g.lineTo(210, 150); g.lineTo(290, 170); g.lineTo(380, 235); g.stroke();
    g.fillStyle = INK; g.font = FD(46); g.fillText('KNEES', 240, 70);
  })), 1.2, 0.86, [0, 1.3, 0.03]));
  obstacles.push({ x: 13.2, z: 6.2, r: 0.3 });
  [[10.4, 3.6, Math.PI / 2 - 0.2], [11.8, 3.2, 0.1], [13.1, 4.4, -Math.PI / 2]].forEach(([x, z, ry], i) => {
    const c = colleague([C.grey, C.blueLt, C.paper][i], [C.grey2, C.ink, 0x6b4a2b][i]); c.position.set(x, 1.12, z); c.rotation.y = ry; root.add(c);
    const sh = shadowBlob(0.55, 0.28); sh.position.set(x, 0.006, z); root.add(sh);
    colleagues.push({ g: c, phase: 3 + i });
  });
  const meetC = colleagues.length - 2;
  item({ id: 'meeting', idx: meetC, prompt: 'Join the meeting', at: [11.8, 5.6], r: 1.2, stand: [11.8, 5.65], face: Math.PI, group: meet, obstacle: { x: 11.8, z: 4.3, box: [1.15, 0.65] } });

  // ================= THE METAVERSE (front middle) =================
  const standee = new THREE.Group(); standee.position.set(1.9, 0, 5.6); standee.rotation.y = -0.6; root.add(standee);
  standee.add(box(0.06, 1.0, 0.06, C.ink, [0, 0.5, 0], 0.02));
  standee.add(signPlane(tex(canvasTex(520, 360, (g, w, h) => { g.fillStyle = PAPER; g.fillRect(0, 0, w, h); g.fillStyle = BLUE; g.fillRect(0, 0, w, 96); g.fillStyle = '#fff'; g.font = FM(40); g.textAlign = 'center'; g.fillText('THIS WAY TO', w / 2, 64); g.fillStyle = INK; g.font = FD(104); g.fillText('THE', w / 2, 196); g.fillText('METAVERSE', w / 2, 310); })), 1.2, 0.83, [0, 1.35, 0.04]));
  obstacles.push({ x: 1.9, z: 5.6, r: 0.2 });
  const vrStand = new THREE.Group(); vrStand.position.set(-1.6, 0, 6.2); root.add(vrStand);
  vrStand.add(cyl(0.05, 0.05, 1.1, C.ink, [0, 0.55, 0], 8)); vrStand.add(box(0.32, 0.15, 0.13, C.paper, [0, 1.18, 0], 0.05)); vrStand.add(box(0.29, 0.12, 0.02, C.blue, [0, 1.18, 0.07], 0.01));
  obstacles.push({ x: -1.6, z: 6.2, r: 0.2 });
  const floaties = new THREE.Group(); floaties.position.set(0, 0, 6.9); root.add(floaties);
  const fl = [new THREE.IcosahedronGeometry(0.28, 0), new THREE.TorusGeometry(0.22, 0.08, 10, 24), new THREE.OctahedronGeometry(0.26, 0), new THREE.BoxGeometry(0.34, 0.34, 0.34)];
  fl.forEach((geo, i) => { const m = new THREE.Mesh(geo, inkMat(i % 2 ? C.blue : C.paper)); m.userData.a = i * Math.PI / 2; floaties.add(m); });
  anims.push(t => floaties.children.forEach((m, i) => { if (m.userData.isHull) return; const a = m.userData.a + t * 0.5; m.position.set(Math.cos(a) * 1.05, 2.0 + Math.sin(t * 1.4 + i) * 0.18, Math.sin(a) * 1.05); m.rotation.set(t * 0.8 + i, t * 0.6, 0); }));
  item({ id: 'vr', prompt: 'Enter the metaverse', at: [0, 6.9], r: 1.1, stand: [0, 6.9], face: 0, group: vrStand });

  // ---------- plants ----------
  for (const [x, z] of [[13.3, 9.3], [-13.3, 9.2], [8.6, -6.2], [-7.6, 8.8], [4.2, 8.9], [-3.4, -5.6], [13.3, -5.5]]) {
    const p = new THREE.Group(); p.position.set(x, 0, z); root.add(p);
    p.add(cyl(0.24, 0.19, 0.42, C.paper, [0, 0.21, 0])); p.add(sph(0.36, C.green, [0, 0.72, 0], [1, 1.1, 1])); p.add(sph(0.24, C.green, [0.2, 0.98, 0.06]));
    obstacles.push({ x, z, r: 0.38 });
  }

  // ---------- a colleague who floats laps around the floor (no legs, no collisions) ----------
  const lap = colleague(C.blue, C.ink); root.add(lap);
  const lapSh = shadowBlob(0.55, 0.28); root.add(lapSh);
  const path = new THREE.CatmullRomCurve3([[-7.5, -4.6], [0.5, -5.2], [8.8, -5.0], [9.0, -1.0], [8.6, 3.2], [5.0, 4.2], [0.8, 3.6], [-2.8, 5.4], [-8.2, 7.0], [-8.4, 0.4]].map(([x, z]) => new THREE.Vector3(x, 0, z)), true);
  const lapObj = { g: lap, phase: 5.5 }; colleagues.push(lapObj);
  anims.push(t => { const u = (t * 0.011) % 1, p = path.getPointAt(u), q = path.getPointAt((u + 0.003) % 1); lap.position.set(p.x, 1.12, p.z); lap.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); lapSh.position.set(p.x, 0.006, p.z); });

  outline(root, 0.022);
  for (const c of colleagues) anims.push(t => { c.g.userData.body.position.y = Math.sin(t * 1.6 + c.phase) * 0.05; if (c !== lapObj) c.g.userData.head.rotation.y = Math.sin(t * 0.5 + c.phase) * 0.35; });

  const setFeed = patch => { Object.assign(state, patch); const d = feedTex.userData; d.draw(d.cv.getContext('2d'), d.cv.width, d.cv.height); feedTex.needsUpdate = true; };
  const redrawSigns = () => texes.forEach(t => { const d = t.userData; d.draw(d.cv.getContext('2d'), d.cv.width, d.cv.height); t.needsUpdate = true; });

  return { root, items, obstacles, colleagues, anims, seats, floor, elev, lap: lapObj, printer, tvTex,
    bounds: { x0: FLOOR.x0 + 0.45, x1: FLOOR.x1 - 0.35, z0: FLOOR.z0 + 0.45, z1: FLOOR.z1 - 0.35 }, setFeed, redrawSigns };
}
