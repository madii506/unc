// The UNC HQ virtual office: an ink-drawn diorama with things unc can walk up to.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { C, inkMat, outline, shadowBlob } from './ink.js';

const W = 14, D = 10, X0 = -7, Z0 = -5, WALL_H = 3.1;

function box(w, h, d, color, pos, r = 0.035, opts = {}) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1)), opts.map ? inkMat(color, { map: opts.map }) : inkMat(color, opts));
  m.position.set(...pos); if (opts.rot) m.rotation.set(...opts.rot);
  return m;
}
const cyl = (rt, rb, h, color, pos, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), inkMat(color)); m.position.set(...pos); return m; };
const sph = (r, color, pos, scale = [1, 1, 1]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), inkMat(color)); m.position.set(...pos); m.scale.set(...scale); return m; };

// ---------- canvas signs ----------
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.colorSpace = THREE.NoColorSpace;
  t.userData = { cv, draw };
  return t;
}
const FONT_D = (px) => `${px}px Anton, Impact, sans-serif`;
const FONT_M = (px, w = 600) => `${w} ${px}px Plex, "IBM Plex Mono", monospace`;
const FONT_S = (px, w = 800) => `${w} ${px}px Inter, system-ui, sans-serif`;
const INK = '#111114', PAPER = '#f7f4ec', BLUE = '#0866ff';

function signPlane(tex, w, h, pos, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), inkMat(C.paper, { map: tex, t1: -2 }));
  m.position.set(...pos); m.rotation.y = rotY; m.userData.noOutline = true;
  const frame = box(w + 0.08, h + 0.08, 0.05, C.ink, [0, 0, -0.03], 0.02, { t1: -2 });
  frame.userData.noOutline = true; m.add(frame);
  return m;
}

function feedDraw(state) {
  return (g, w, h) => {
    g.fillStyle = '#0a1f55'; g.fillRect(0, 0, w, h);
    g.fillStyle = BLUE; g.fillRect(0, 0, w, 86);
    g.fillStyle = '#fff'; g.font = FONT_D(58); g.textBaseline = 'middle'; g.fillText('THE FEED', 34, 46);
    g.font = FONT_M(24); g.textAlign = 'right'; g.fillText(state.countOk === false ? '○ COUNTER QUIET' : '● ON', w - 34, 46); g.textAlign = 'left';
    const rows = [['$UNC', 'Robinhood Chain · Pons'], ['PAIRED WITH', 'META'], ['FEES', 'buy META for holders'], ['CA', state.ca || 'soon']];
    rows.forEach(([k, v], i) => {
      const y = 140 + i * 62;
      g.fillStyle = '#8fb5ff'; g.font = FONT_M(22); g.fillText(k, 34, y);
      g.fillStyle = '#fff'; g.font = FONT_S(30); g.fillText(v, 250, y);
    });
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(34, 400); g.lineTo(w - 34, 400); g.stroke();
    g.fillStyle = '#8fb5ff'; g.font = FONT_M(22); g.fillText('UNCS BADGED', 34, 452);
    g.fillStyle = '#fff'; g.font = FONT_D(92); g.textAlign = 'right';
    g.fillText(Number.isFinite(state.count) ? state.count.toLocaleString('en-US') : '—', w - 34, 452); g.textAlign = 'left';
  };
}

// ---------- legless colleagues (nobody here has legs) ----------
function colleague(shirt, hairColor) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  body.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.28, 8, 20), inkMat(shirt)));
  body.children[0].position.y = 0.0; body.children[0].scale.set(1, 1, 0.78);
  const head = new THREE.Group(); head.position.y = 0.58; body.add(head);
  head.add(sph(0.22, C.paper, [0, 0, 0], [1, 1.05, 1]));
  head.add(sph(0.2, hairColor, [0, 0.09, -0.03], [1.05, 0.72, 1.02]));
  for (const s of [-1, 1]) {
    head.add(sph(0.028, C.ink, [s * 0.075, 0.0, 0.2], [1, 1.3, 0.6]));
    body.add(sph(0.075, C.paper, [s * 0.34, -0.12, 0.12]));           // floating hands
  }
  head.add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 20, Math.PI), inkMat(C.ink)));
  head.children.at(-1).position.set(0, -0.08, 0.2); head.children.at(-1).rotation.z = Math.PI;
  g.userData.head = head; g.userData.body = body;
  return g;
}

export function buildOffice(scene) {
  const root = new THREE.Group(); scene.add(root);
  const items = [], obstacles = [], colleagues = [], anims = [];
  const state = { count: null, countOk: true, ca: '' };

  // floor: carpet tiles + a rug
  const floorTex = canvasTex(1400, 1000, (g, w, h) => {
    g.fillStyle = '#efe9dc'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(17,17,20,.13)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 100) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 100) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    // blue rug by the couch
    g.fillStyle = '#dfe9ff'; g.strokeStyle = INK; g.lineWidth = 5;
    g.beginPath(); g.roundRect(60, 600, 380, 330, 26); g.fill(); g.stroke();
    // metaverse pad
    g.fillStyle = BLUE; g.beginPath(); g.arc(1160, 810, 92, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#efe9dc'; g.beginPath(); g.arc(1160, 810, 62, 0, Math.PI * 2); g.fill(); g.stroke();
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), inkMat(C.paper2));
  floor.position.set(0, -0.1, 0); root.add(floor);
  const floorTop = new THREE.Mesh(new THREE.PlaneGeometry(W, D), inkMat(C.paper2, { map: floorTex, t1: -2 }));
  floorTop.rotation.x = -Math.PI / 2; floorTop.position.y = 0.002; floorTop.userData.noOutline = true; floorTop.name = 'floor'; root.add(floorTop);

  // walls (back z=-5, left x=-7), a blue baseboard and top trim
  const wallB = box(W, WALL_H, 0.2, C.paper, [0, WALL_H / 2, Z0 - 0.1], 0.02); root.add(wallB);
  const wallL = box(0.2, WALL_H, D, C.paper, [X0 - 0.1, WALL_H / 2, 0], 0.02); root.add(wallL);
  root.add(box(W, 0.18, 0.06, C.blue, [0, 0.09, Z0 + 0.03], 0.02));
  root.add(box(0.06, 0.18, D, C.blue, [X0 + 0.03, 0.09, 0], 0.02));
  root.add(box(W + 0.2, 0.12, 0.3, C.ink, [0, WALL_H + 0.06, Z0 - 0.1], 0.02));
  root.add(box(0.3, 0.12, D, C.ink, [X0 - 0.1, WALL_H + 0.06, 0], 0.02));

  // helper: register something unc can walk up to
  function item(o) { items.push(o); if (o.obstacle) obstacles.push(o.obstacle); return o; }

  // ---- badge kiosk (back left)
  const kiosk = new THREE.Group(); kiosk.position.set(-4.4, 0, -4.1); root.add(kiosk);
  kiosk.add(box(2.1, 1.0, 0.8, C.blue, [0, 0.5, 0]));
  kiosk.add(box(2.25, 0.08, 0.95, C.wood, [0, 1.04, 0.02]));
  kiosk.add(box(0.5, 0.36, 0.05, C.ink, [0.55, 1.3, -0.15], 0.02, { rot: [-0.25, 0, 0] }));
  kiosk.add(box(0.44, 0.3, 0.02, C.blueLt, [0.55, 1.3, -0.12], 0.01, { rot: [-0.25, 0, 0], t1: -2 }));
  kiosk.add(box(0.36, 0.05, 0.26, C.paper, [-0.45, 1.1, 0.1], 0.01));      // a stack of badges
  const kioskSign = canvasTex(900, 300, (g, w, h) => {
    g.fillStyle = BLUE; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = FONT_D(150); g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText('UNC BADGES', w / 2, h / 2 + 6);
  });
  root.add(signPlane(kioskSign, 2.4, 0.8, [-4.4, 2.25, Z0 + 0.03]));
  item({ id: 'kiosk', prompt: 'Get your unc badge', at: [-4.4, -3.2], r: 1.35, stand: [-4.4, -3.15], face: Math.PI, group: kiosk, obstacle: { x: -4.4, z: -4.1, r: 1.15, box: [1.2, 0.55] } });

  // ---- the feed (back wall screen)
  const feedTex = canvasTex(900, 500, feedDraw(state));
  const feed = signPlane(feedTex, 3.4, 1.9, [1.7, 1.75, Z0 + 0.04]); root.add(feed);
  const feedStand = box(0.12, 0.2, 0.12, C.ink, [1.7, 0.72, Z0 + 0.1], 0.02); root.add(feedStand);
  item({ id: 'feed', prompt: 'Read the feed', at: [1.7, -3.9], r: 1.5, stand: [1.7, -3.7], face: Math.PI, group: feed });

  // ---- marketplace corkboard
  const cork = canvasTex(700, 520, (g, w, h) => {
    g.fillStyle = '#c99a5b'; g.fillRect(0, 0, w, h);
    g.fillStyle = INK; g.font = FONT_D(64); g.fillText('MARKETPLACE', 36, 84);
    const notes = [['is this still\navailable?', '#fffbe8', -0.05], ['free couch.\nbad back.', '#dfe9ff', 0.04], ['lost:\nreading glasses', '#fff', 0.03], ['selling: VR\nheadset. used once.', '#ffe3dc', -0.04]];
    notes.forEach(([t, col, rot], i) => {
      g.save(); g.translate(40 + (i % 2) * 330, 120 + Math.floor(i / 2) * 190); g.rotate(rot);
      g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 4; g.fillRect(0, 0, 290, 160); g.strokeRect(0, 0, 290, 160);
      g.fillStyle = '#e0321c'; g.beginPath(); g.arc(145, 14, 10, 0, 7); g.fill();
      g.fillStyle = INK; g.font = FONT_S(30, 800); t.split('\n').forEach((ln, j) => g.fillText(ln, 18, 62 + j * 38));
      g.restore();
    });
  });
  const corkP = signPlane(cork, 2.1, 1.56, [-1.4, 1.7, Z0 + 0.04]); root.add(corkP);
  item({ id: 'cork', prompt: 'Check Marketplace', at: [-1.4, -4.0], r: 1.3, stand: [-1.4, -3.8], face: Math.PI, group: corkP });

  // ---- window with weather (back right)
  const win = canvasTex(500, 400, (g, w, h) => {
    g.fillStyle = '#bcd4ff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 5;
    const cloud = (x, y, s) => { g.beginPath(); g.arc(x, y, 34 * s, Math.PI, 0); g.arc(x + 44 * s, y - 12 * s, 40 * s, Math.PI, 0); g.arc(x + 92 * s, y, 30 * s, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); };
    cloud(70, 150, 1.1); cloud(260, 260, 0.9);
    g.strokeStyle = '#3a5fb0'; g.lineWidth = 4;
    for (let i = 0; i < 16; i++) { const x = 40 + (i * 53) % 440, y = 190 + (i * 37) % 170; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 26); g.stroke(); }
    g.fillStyle = INK; g.fillRect(w / 2 - 6, 0, 12, h); g.fillRect(0, h / 2 - 6, w, 12);
  });
  const winP = signPlane(win, 1.9, 1.5, [5.3, 1.85, Z0 + 0.04]); root.add(winP);
  item({ id: 'window', prompt: 'Look outside', at: [5.3, -3.9], r: 1.2, stand: [5.3, -3.75], face: Math.PI, group: winP });

  // ---- printer (back right corner)
  const printer = new THREE.Group(); printer.position.set(6.25, 0, -4.3); root.add(printer);
  printer.add(box(0.9, 0.7, 0.7, C.grey, [0, 0.35, 0]));
  printer.add(box(0.95, 0.28, 0.72, C.paper, [0, 0.84, 0]));
  printer.add(box(0.5, 0.03, 0.3, C.ink, [0, 0.99, 0.08], 0.01));
  const paper = box(0.42, 0.01, 0.36, 0xffffff, [0, 0.72, 0.3], 0.004); printer.add(paper); paper.visible = false;
  printer.userData.paper = paper;
  item({ id: 'printer', prompt: 'Print something', at: [6.25, -3.4], r: 1.2, stand: [6.1, -3.35], face: Math.PI, group: printer, obstacle: { x: 6.25, z: -4.3, r: 0.6 } });

  // ---- water cooler (left wall)
  const cooler = new THREE.Group(); cooler.position.set(-6.45, 0, -1.7); root.add(cooler);
  cooler.add(box(0.5, 0.95, 0.5, C.paper, [0, 0.475, 0]));
  cooler.add(cyl(0.2, 0.2, 0.48, C.blueLt, [0, 1.2, 0]));
  cooler.add(sph(0.2, C.blueLt, [0, 1.44, 0], [1, 0.4, 1]));
  cooler.add(box(0.08, 0.06, 0.08, C.blue, [0.26, 0.72, 0.1], 0.01));
  item({ id: 'cooler', prompt: 'Water cooler talk', at: [-5.6, -1.7], r: 1.2, stand: [-5.55, -1.7], face: -Math.PI / 2, group: cooler, obstacle: { x: -6.45, z: -1.7, r: 0.45 } });

  // ---- thermostat (left wall)
  const thermoTex = canvasTex(240, 300, (g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0a1f55'; g.fillRect(30, 40, w - 60, 120);
    g.fillStyle = '#8fb5ff'; g.font = FONT_M(40); g.textAlign = 'center'; g.fillText('LOCKED', w / 2, 116);
    g.fillStyle = INK; g.font = FONT_S(30); g.fillText("DON'T.", w / 2, 230);
  });
  const thermoP = signPlane(thermoTex, 0.34, 0.42, [X0 + 0.04, 1.45, -0.35], Math.PI / 2); root.add(thermoP);
  item({ id: 'thermostat', prompt: 'Touch the thermostat', at: [-6.1, -0.35], r: 0.95, stand: [-6.0, -0.35], face: -Math.PI / 2, group: thermoP });

  // ---- couch + coffee table + birthday cake (left front)
  const couch = new THREE.Group(); couch.position.set(-6.25, 0, 2.35); root.add(couch);
  couch.add(box(0.95, 0.42, 2.5, C.grey, [0, 0.21, 0], 0.08));
  couch.add(box(0.28, 0.95, 2.5, C.grey, [-0.34, 0.5, 0], 0.08));
  couch.add(box(0.95, 0.62, 0.26, C.grey, [0, 0.32, 1.25], 0.08));
  couch.add(box(0.95, 0.62, 0.26, C.grey, [0, 0.32, -1.25], 0.08));
  couch.add(box(0.7, 0.14, 1.1, C.grey2, [0.05, 0.49, 0.56], 0.06));
  couch.add(box(0.7, 0.14, 1.1, C.grey2, [0.05, 0.49, -0.56], 0.06));
  const poster = canvasTex(700, 420, (g, w, h) => {
    g.fillStyle = BLUE; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = FONT_D(118); g.textAlign = 'center'; g.fillText('BACK IN', w / 2, 170); g.fillText('MY DAY', w / 2, 300);
  });
  root.add(signPlane(poster, 1.9, 1.14, [X0 + 0.04, 2.05, 2.35], Math.PI / 2));
  item({ id: 'couch', prompt: 'Sit down', at: [-5.35, 2.35], r: 1.25, stand: [-5.4, 2.35], face: Math.PI / 2, group: couch, obstacle: { x: -6.25, z: 2.35, r: 0.5, box: [0.5, 1.4] } });
  const table = new THREE.Group(); table.position.set(-4.35, 0, 3.35); root.add(table);
  table.add(box(1.1, 0.07, 0.7, C.wood, [0, 0.45, 0]));
  for (const [x, z] of [[-0.46, -0.27], [0.46, -0.27], [-0.46, 0.27], [0.46, 0.27]]) table.add(box(0.06, 0.42, 0.06, C.ink, [x, 0.21, z], 0.01));
  table.add(cyl(0.22, 0.22, 0.18, C.paper, [0, 0.58, 0]));
  table.add(cyl(0.225, 0.225, 0.04, C.blue, [0, 0.64, 0]));
  table.add(cyl(0.012, 0.012, 0.12, C.red, [0, 0.72, 0]));
  item({ id: 'cake', prompt: 'Happy birthday!!', at: [-4.35, 3.35], r: 1.05, stand: [-4.35, 4.1], face: Math.PI, group: table, obstacle: { x: -4.35, z: 3.35, r: 0.55 } });

  // ---- desk pod with legless colleagues
  const shirts = [C.paper, C.grey, C.blueLt], hair = [C.ink, C.grey2, 0x6b4a2b];
  [0.4, 2.3, 4.2].forEach((x, i) => {
    const desk = new THREE.Group(); desk.position.set(x, 0, -0.9); root.add(desk);
    desk.add(box(1.6, 0.07, 0.85, C.wood, [0, 0.76, 0]));
    for (const sx of [-0.74, 0.74]) desk.add(box(0.07, 0.74, 0.8, C.ink, [sx, 0.37, 0], 0.02));
    desk.add(box(0.72, 0.44, 0.05, C.ink, [0, 1.12, -0.18], 0.02));
    desk.add(box(0.08, 0.2, 0.08, C.ink, [0, 0.88, -0.2], 0.02));
    desk.add(box(0.5, 0.02, 0.18, C.paper, [0, 0.8, 0.12], 0.008));
    desk.add(sph(0.05, i === 1 ? C.blue : C.paper, [0.46, 0.83, 0.12]));
    const chair = new THREE.Group(); chair.position.set(x, 0, -1.7); root.add(chair);
    chair.add(cyl(0.28, 0.28, 0.08, C.ink, [0, 0.5, 0]));
    chair.add(box(0.5, 0.5, 0.07, C.ink, [0, 0.82, -0.25], 0.03));
    chair.add(cyl(0.03, 0.03, 0.45, C.ink, [0, 0.25, 0], 8));
    const c = colleague(shirts[i], hair[i]); c.position.set(x, 1.12, -1.62); root.add(c);
    const sh = shadowBlob(0.6, 0.3); sh.position.set(x, 0.006, -1.45); root.add(sh);
    colleagues.push({ g: c, phase: i * 1.7 });
    item({ id: 'colleague' + i, idx: i, prompt: 'Say hi', at: [x, 0.05], r: 1.0, stand: [x, 0.0], face: Math.PI, group: c, obstacle: { x, z: -1.2, r: 0.55, box: [0.85, 0.75] } });
  });

  // ---- the metaverse booth (right front)
  const vrSign = canvasTex(520, 360, (g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
    g.fillStyle = BLUE; g.fillRect(0, 0, w, 96);
    g.fillStyle = '#fff'; g.font = FONT_M(40); g.textAlign = 'center'; g.fillText('THIS WAY TO', w / 2, 64);
    g.fillStyle = INK; g.font = FONT_D(104); g.fillText('THE', w / 2, 196); g.fillText('METAVERSE', w / 2, 310);
  });
  const standee = new THREE.Group(); standee.position.set(5.7, 0, 2.0); standee.rotation.y = -0.5; root.add(standee);
  standee.add(box(0.06, 1.0, 0.06, C.ink, [0, 0.5, 0], 0.02));
  standee.add(signPlane(vrSign, 1.2, 0.83, [0, 1.35, 0.04]));
  const vrStand = new THREE.Group(); vrStand.position.set(4.6, 0, 3.1); root.add(vrStand);
  vrStand.add(cyl(0.05, 0.05, 1.1, C.ink, [0.95, 0.55, -0.4], 8));
  vrStand.add(box(0.32, 0.15, 0.13, C.paper, [0.95, 1.18, -0.4], 0.05));
  vrStand.add(box(0.29, 0.12, 0.02, C.blue, [0.95, 1.18, -0.33], 0.01));
  item({ id: 'vr', prompt: 'Enter the metaverse', at: [4.6, 3.1], r: 1.0, stand: [4.6, 3.1], face: 0, group: vrStand, obstacle: { x: 5.55, z: 2.7, r: 0.25 } });

  // ---- plants
  for (const [x, z] of [[6.45, 4.45], [-6.45, -4.5], [6.5, -1.9]]) {
    const p = new THREE.Group(); p.position.set(x, 0, z); root.add(p);
    p.add(cyl(0.24, 0.19, 0.42, C.paper, [0, 0.21, 0]));
    p.add(sph(0.36, C.green, [0, 0.72, 0], [1, 1.1, 1]));
    p.add(sph(0.24, C.green, [0.2, 0.98, 0.06]));
    obstacles.push({ x, z, r: 0.38 });
  }

  outline(root, 0.022);
  for (const c of colleagues) {
    // colleagues bob above their chairs
    anims.push(t => { c.g.userData.body.position.y = Math.sin(t * 1.6 + c.phase) * 0.05; c.g.userData.head.rotation.y = Math.sin(t * 0.5 + c.phase) * 0.35; });
  }

  function setFeed(patch) { Object.assign(state, patch); const d = feedTex.userData; const g = d.cv.getContext('2d'); d.draw(g, d.cv.width, d.cv.height); feedTex.needsUpdate = true; }
  function redrawSigns() { for (const t of [feedTex, kioskSign, cork, poster, vrSign, thermoTex, win]) { const d = t.userData; d.draw(d.cv.getContext('2d'), d.cv.width, d.cv.height); t.needsUpdate = true; } }

  return { root, items, obstacles, colleagues, anims, floor: floorTop, bounds: { x0: X0 + 0.45, x1: -X0 - 0.35, z0: Z0 + 0.45, z1: -Z0 - 0.35 }, setFeed, redrawSigns, printer };
}
