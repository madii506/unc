// UNC HQ: walk unc around the virtual office. WASD/arrows or click-to-move, E to use things.
import * as THREE from 'three';
import { createUnc } from './unc-model.js';
import { C, inkify, outline, shadowBlob } from './ink.js';
import { buildOffice } from './office.js';

const UNC_R = 0.28, SPEED = 2.3;

export function mountWorld(host, cb = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.domElement.className = 'world-gl';
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const office = buildOffice(scene);

  // ---------- unc ----------
  const unc = createUnc({ pose: 'phone' });
  const P = unc.parts, M = unc.materials;
  inkify(unc.root, new Map([
    [M.polo, C.blue], [M.poloDark, C.blue], [M.stripeA, C.blue], [M.vrVisor, C.blue],
    [M.hair, C.grey], [M.stache, C.grey2], [M.beard, C.grey], [M.pick, C.wood], [M.screen, C.blueLt],
    [M.belt, C.ink], [M.stripeB, C.ink], [M.frame, C.ink], [M.vrStrap, C.ink], [M.sling, C.ink], [M.phone, C.ink], [M.eye, C.ink], [M.mouth, C.ink],
  ]));
  outline(unc.root, 0.011);
  const me = new THREE.Group(); me.add(unc.root); scene.add(me);
  unc.root.scale.setScalar(0.92);
  const myShadow = shadowBlob(0.8, 0.42); scene.add(myShadow);
  const pos = new THREE.Vector2(4.35, -4.55); let heading = 0, walkPhase = 0, speed01 = 0;
  let entered = false, enterT = 0, introK = 0;

  const snap = o => o.rotation.clone();
  const base = { head: snap(P.head), neck: snap(P.neck), torso: snap(P.torso), rS: snap(P.armR.shoulder), rE: snap(P.armR.elbow), lS: snap(P.armL.shoulder), vrPos: P.vr.position.clone(), vrRot: snap(P.vr) };

  // ---------- camera (isometric, follows unc) ----------
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const OFF = new THREE.Vector3(9, 9.2, 10.5);
  const look = new THREE.Vector3(-0.2, 0.5, -0.6);
  let viewH = 7;
  let mode = 'wide', baseViewH = 10;
  function setView(vh) {
    const a = host.clientWidth / host.clientHeight;
    camera.left = -vh * a / 2; camera.right = vh * a / 2; camera.top = vh / 2; camera.bottom = -vh / 2;
    camera.updateProjectionMatrix();
  }
  function frame() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    const a = w / h;
    mode = a > 1.15 ? 'wide' : 'follow';
    baseViewH = a > 1.9 ? 10.2 : a > 1.15 ? 11.2 : 10.6;
  }
  new ResizeObserver(frame).observe(host); frame();
  const CENTER = new THREE.Vector2(-0.2, -0.6), ELEV = new THREE.Vector3(4.35, 0.5, -3.6);
  const want = new THREE.Vector3();
  function placeCamera(k = 1) {
    let tx, tz;
    if (mode === 'wide') { tx = CENTER.x + (pos.x - CENTER.x) * 0.22; tz = CENTER.y + (pos.y - CENTER.y) * 0.22; }
    else { tx = THREE.MathUtils.clamp(pos.x, -4.6, 4.6); tz = THREE.MathUtils.clamp(pos.y, -3.2, 3.2) + 0.3; }
    const e = introK * introK * (3 - 2 * introK);
    want.set(ELEV.x + (tx - ELEV.x) * e, 0.5, ELEV.z + (tz - ELEV.z) * e);
    look.x += (want.x - look.x) * (introK < 1 ? 1 : k); look.z += (want.z - look.z) * (introK < 1 ? 1 : k);
    camera.position.copy(look).add(OFF); camera.lookAt(look);
    setView(4.4 + (baseViewH - 4.4) * e);
  }
  placeCamera(1);

  // ---------- speech bubble + prompt ----------
  const bubble = cb.bubble; let bubbleUntil = 0, speaker = null;
  function say(text, who = 'unc') {
    speaker = who === 'unc' ? P.head : who;
    bubble.textContent = text; bubble.hidden = false; bubble.classList.toggle('them', who !== 'unc');
    bubble.style.animation = 'none'; void bubble.offsetWidth; bubble.style.animation = '';
    bubbleUntil = performance.now() + Math.max(2200, text.length * 70);
    cb.onLine?.(text, who === 'unc' ? 'unc' : 'them');
  }
  const v3 = new THREE.Vector3();
  function placeBubble() {
    if (bubble.hidden) return;
    if (performance.now() > bubbleUntil) { bubble.hidden = true; return; }
    v3.set(0, speaker === P.head ? 0.45 : 0.3, 0); speaker.localToWorld(v3); v3.project(camera);
    const w = host.clientWidth, h = host.clientHeight, bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const x = (v3.x + 1) / 2 * w, y = (1 - v3.y) / 2 * h;
    const bx = Math.max(10, Math.min(w - bw - 10, x - bw / 2)), by = Math.max(70, y - bh - 16);
    bubble.style.transform = `translate(${bx}px,${by}px)`;
    bubble.style.setProperty('--tx', Math.max(16, Math.min(bw - 16, x - bx)) + 'px');
  }

  // ---------- state machine ----------
  const act = { poke: -9, talk: -9, vrT: 0, phoneT: 0, sit: false, sitT: 0 };
  let status = '';
  const setStatus = s => { if (s !== status) { status = s; cb.onStatus?.(s); } };
  const now = () => performance.now() / 1000;
  const cyc = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
  const L = {
    talk: cyc(['facebook was the warning.', 'back in my day we poked people. nobody asked why.', 'hold on. let me find my glasses.', 'my knee says rain thursday.', 'who made the font this small.', "i'm not old. i'm unc.", "i'll be in bed by nine.", 'who is this on the phone.']),
    poke: cyc(['oof.', 'my back.', 'you poked me? that used to mean something.', "careful. that's where my back was.", '"ooooh-kay."']),
    cooler: cyc(['my knee says rain thursday.', 'you see the game last night? me neither. asleep by nine.', 'this water used to be colder.', 'anybody else hear that click in my knee?']),
    printer: cyc(['paper jam.', 'back in my day printers worked.', "it's the tray. it's always the tray."]),
    window: cyc(['my knee said rain. my knee was right.', 'nice day to stay inside and complain about it.']),
    cork: cyc(['is this still available?', 'lost: reading glasses. …they\'re on my shirt.', 'free couch, bad back. that couch is mine.']),
    cake: cyc(['happy birthday!! …whose is it?', 'happy birthday!! i wrote it on the wall too.', 'i only came for the cake.']),
    thermo: cyc(["don't touch the thermostat.", 'who touched the thermostat.', 'it says locked. good.']),
    elev: cyc(['going down? nah. i just got here.', 'the elevator music used to be better.']),
    vend: cyc(['they\'re out of prunes.', 'decaf. again.', 'the machine ate my dollar. back in my day it gave it back.']),
    meet: cyc(['this meeting could\'ve been an email.', 'can everyone see my screen?', 'let\'s circle back after lunch.']),
    meetU: cyc(['i\'ll be in bed by then.', 'my knee has a hard stop at five.', 'i printed the email.']),
    feed: cyc(['fees buy META for holders. CA: soon. i\'ll wait.', 'the feed. like facebook, but it only talks about me.']),
  };
  const HI = [['hey unc. where\'d you get legs?', 'brought \'em from home.'], ['we don\'t do legs here.', 'my knees came with them.'], ['meeting in five. it\'s always in five.', "i'll be in bed by then."], ['did you see my post?', 'i liked it. twice. by accident.']];
  let hiI = 0;

  const api = {
    talk() { standUp(); act.talk = now(); setStatus('talking · nobody asked'); say(L.talk()); },
    poke() { act.poke = now(); setStatus('poked · oof'); say(L.poke()); },
    headset() {
      if (act.vrT) return; standUp();
      act.vrT = now(); setStatus('in the metaverse · alone'); say('entering the metaverse…');
      setTimeout(() => say('nobody was there. back to facebook.'), 2600);
      setTimeout(() => { act.vrT = 0; setStatus(idleStatus()); }, 3600);
    },
    phone() {
      if (act.phoneT) return;
      act.phoneT = now(); setStatus("reading · arm's length"); say("hold on. font's too small.");
      setTimeout(() => say('who is this.'), 1900);
      setTimeout(() => { act.phoneT = 0; setStatus(idleStatus()); }, 2800);
    },
    interact() { const it = nearest(); if (it) use(it); },
    setStick(x, y) { stick.set(x, y); if (stick.lengthSq() > 0.02) { target = null; pendingUse = null; } },
    walkTo(id) { if (!entered) return; const it = office.items.find(i => i.id === id); if (it) goUse(it); },
    enter() {
      if (entered) return; entered = true; enterT = now();
      setTimeout(() => { target = new THREE.Vector2(3.55, -2.5); pendingUse = null; arrivedHello = true; }, 750);
      setTimeout(() => { closeDoors = true; }, 3800);
    },
    setFeed: office.setFeed, redrawSigns: office.redrawSigns,
  };
  let arrivedHello = false, closeDoors = false;
  const idleStatus = () => act.sit ? 'sitting · oof' : 'standing · back hurts';
  function standUp() { if (act.sit) { act.sit = false; act.sitT = now(); say('"ooooh-kay."'); pos.set(-5.35, 2.35); } }

  function use(it) {
    heading = it.face;
    switch (it.id) {
      case 'readme': say('the fine print. large font, please.'); setStatus('reading the fine print'); cb.onInfo?.('coin'); break;
      case 'elevator': say(L.elev()); setStatus('by the elevator'); break;
      case 'vending': say(L.vend()); setStatus('at the vending machine'); break;
      case 'meeting': { const c = office.colleagues[3].g; say(L.meet(), c.userData.head); setStatus('in a meeting'); setTimeout(() => say(L.meetU()), 1900); break; }
      case 'lap': { const c = office.lap.g, [a, b] = HI[hiI++ % HI.length]; say(a, c.userData.head); setStatus('small talk'); setTimeout(() => say(b), 1900); break; }
      case 'kiosk': say('one badge please. large print.'); setStatus('at the badge kiosk'); cb.onBadge?.(); break;
      case 'feed': say(L.feed()); setStatus('reading the feed'); cb.onInfo?.('coin'); break;
      case 'cork': say(L.cork()); setStatus('browsing marketplace'); break;
      case 'window': say(L.window()); setStatus('looking outside · knee hurts'); break;
      case 'printer': {
        const p = office.printer.userData.paper; p.visible = true; p.position.z = 0.3;
        say(L.printer()); setStatus('printing · jammed');
        const t0 = now(); const slide = () => { const k = Math.min(1, (now() - t0) / 0.6); p.position.z = 0.3 + 0.18 * k; if (k < 1) requestAnimationFrame(slide); };
        slide(); setTimeout(() => { p.visible = false; }, 2600); break;
      }
      case 'cooler': say(L.cooler()); setStatus('at the water cooler'); break;
      case 'thermostat': say(L.thermo()); setStatus('guarding the thermostat'); break;
      case 'cake': say(L.cake()); setStatus('eating cake'); break;
      case 'couch':
        if (act.sit) { standUp(); setStatus(idleStatus()); break; }
        act.sit = true; act.sitT = now(); pos.set(-6.02, 2.35); heading = Math.PI / 2; say('"oof."'); setStatus('sitting · oof'); break;
      case 'vr': api.headset(); break;
      default:
        if (it.id.startsWith('colleague')) {
          const c = office.colleagues[it.idx].g, [a, b] = HI[hiI++ % HI.length];
          say(a, c.userData.head); setStatus('small talk');
          setTimeout(() => say(b), 1900);
        }
    }
    cb.onUse?.(it.id);
  }

  // ---------- input ----------
  const keys = new Set(), stick = new THREE.Vector2();
  let target = null, pendingUse = null;
  addEventListener('keydown', e => {
    if (!entered || e.metaKey || e.ctrlKey || e.altKey || cb.inputBlocked?.()) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      if (!inView()) return;
      keys.add(k); target = null; pendingUse = null; e.preventDefault(); return;
    }
    const m = { t: 'talk', p: 'poke', v: 'headset', f: 'phone', e: 'interact', b: 'badge' }[k];
    if (m && inView()) { e.preventDefault(); m === 'badge' ? api.walkTo('kiosk') : api[m](); }
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  const inView = () => { const r = host.getBoundingClientRect(); return r.bottom > innerHeight * 0.35 && r.top < innerHeight * 0.65; };

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  const lapItem = { id: 'lap', prompt: 'Say hi', at: [0, 0], r: 1.15, stand: [0, 0], face: 0, group: office.lap.g }; office.items.push(lapItem);
  const pickables = []; office.items.forEach(it => { if (it.group) { it.group.traverse(o => { if (o.isMesh) o.userData.item = it; }); pickables.push(it.group); } });
  let downAt = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', e => {
    if (!entered) return;
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return; downAt = null;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(unc.root, true).length) { api.poke(); return; }
    const hit = ray.intersectObjects(pickables, true)[0];
    if (hit && hit.object.userData.item) { goUse(hit.object.userData.item); return; }
    if (ray.ray.intersectPlane(plane, hitP)) { standUp(); target = new THREE.Vector2(hitP.x, hitP.z); pendingUse = null; cb.onMoveHint?.(); }
  });
  function goUse(it) {
    if (it.id === 'lap') { const p = office.lap.g.position; it.stand = [p.x, p.z + 0.9]; }
    if (it.id === 'couch' && act.sit) { use(it); return; }
    standUp();
    target = new THREE.Vector2(...it.stand); pendingUse = it;
  }

  // ---------- movement ----------
  const camRight = new THREE.Vector3(), camFwd = new THREE.Vector3();
  function nearest() {
    let best = null, bd = 1e9;
    for (const it of office.items) { const d = Math.hypot(pos.x - it.at[0], pos.y - it.at[1]); if (d < it.r && d < bd) { bd = d; best = it; } }
    return best;
  }
  function collide(p) {
    const B = office.bounds;
    p.x = THREE.MathUtils.clamp(p.x, B.x0, B.x1); p.y = THREE.MathUtils.clamp(p.y, B.z0, B.z1);
    for (const o of office.obstacles) {
      if (o.box) {
        const hx = o.box[0] + UNC_R, hz = o.box[1] + UNC_R, dx = p.x - o.x, dz = p.y - o.z;
        if (Math.abs(dx) < hx && Math.abs(dz) < hz) { const px = hx - Math.abs(dx), pz = hz - Math.abs(dz); if (px < pz) p.x = o.x + Math.sign(dx || 1) * hx; else p.y = o.z + Math.sign(dz || 1) * hz; }
      } else {
        const dx = p.x - o.x, dz = p.y - o.z, d = Math.hypot(dx, dz), m = o.r + UNC_R;
        if (d < m && d > 1e-5) { p.x = o.x + dx / d * m; p.y = o.z + dz / d * m; }
      }
    }
  }
  let lastPrompt = undefined, stuck = 0;
  function step(dt) {
    camera.getWorldDirection(camFwd); camFwd.y = 0; camFwd.normalize();
    camRight.set(-camFwd.z, 0, camFwd.x);
    let mx = 0, mz = 0;
    const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const ky = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const sx = kx + stick.x, sy = ky - stick.y;
    if (sx || sy) { mx = camRight.x * sx + camFwd.x * sy; mz = camRight.z * sx + camFwd.z * sy; if (act.sit) standUp(); }
    else if (target) {
      mx = target.x - pos.x; mz = target.y - pos.y;
      const d = Math.hypot(mx, mz);
      if (d < Math.max(0.08, SPEED * 0.02)) { target = null; mx = mz = 0; if (pendingUse) { const it = pendingUse; pendingUse = null; use(it); } else if (arrivedHello) { arrivedHello = false; heading = 0.6; say('facebook was the warning.'); cb.onArrive?.(); } }
    }
    const len = Math.hypot(mx, mz);
    const moving = len > 0.001 && !act.sit;
    if (moving) {
      mx /= len; mz /= len;
      const before = pos.clone();
      const total = SPEED * dt, n = Math.max(1, Math.ceil(total / 0.08));
      for (let i = 0; i < n; i++) { pos.x += mx * total / n; pos.y += mz * total / n; collide(pos); }
      const moved = pos.distanceTo(before);
      if (target && moved < SPEED * dt * 0.2) { if ((stuck += dt) > 0.6) { target = null; if (pendingUse && nearest() === pendingUse) { const it = pendingUse; pendingUse = null; use(it); } pendingUse = null; stuck = 0; } } else stuck = 0;
      const want = Math.atan2(mx, mz);
      let dh = want - heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); heading += dh * Math.min(1, dt * 12);
      if (!act.vrT && !act.phoneT) setStatus('walking · slowly');
    } else if (status === 'walking · slowly') setStatus(idleStatus());
    speed01 += ((moving ? 1 : 0) - speed01) * Math.min(1, dt * 10);
    walkPhase += dt * 9 * speed01;
    const it = act.sit ? office.items.find(i => i.id === 'couch') : nearest();
    const pr = it ? (it.id === 'couch' && act.sit ? 'Get up' : it.prompt) : null;
    if (pr !== lastPrompt) { lastPrompt = pr; cb.onPrompt?.(pr); }
  }

  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  function pose(t) {
    me.position.set(pos.x, 0, pos.y); me.rotation.y = heading;
    myShadow.position.set(pos.x, 0.006, pos.y);
    const s = speed01, sw = Math.sin(walkPhase);
    const breathe = reduced ? 0 : Math.sin(t * 1.7);
    P.torso.scale.set(1, 1 + 0.012 * breathe, 1);
    const pt = t - act.poke, jolt = pt < 1.4 ? Math.exp(-pt * 4) * Math.sin(pt * 24) : 0;
    const ft = act.phoneT ? ease((t - act.phoneT) / 0.45) * (1 - ease((t - act.phoneT - 2.2) / 0.5)) : 0;
    const vt = act.vrT ? ease((t - act.vrT) / 0.5) * (1 - ease((t - act.vrT - 2.7) / 0.6)) : 0;
    const tt = t - act.talk, nod = tt < 1.6 ? Math.sin(tt * 11) * 0.05 * (1 - tt / 1.6) : 0;
    const sit = act.sit ? ease((t - act.sitT) / 0.35) : 0;
    P.legL.rotation.x = sw * 0.55 * s - 1.45 * sit; P.legR.rotation.x = -sw * 0.55 * s - 1.45 * sit;
    P.body.position.y = Math.abs(Math.cos(walkPhase)) * 0.035 * s - 0.33 * sit + Math.max(0, jolt) * 0.03;
    P.torso.rotation.set(base.torso.x - 0.05 * ft - 0.18 * sit + 0.04 * s, base.torso.y + sw * 0.06 * s, base.torso.z + 0.11 * jolt);
    P.neck.rotation.set(base.neck.x - 0.14 * ft + (reduced ? 0 : 0.015 * Math.sin(t * 0.8)), base.neck.y + 0.15 * ft, base.neck.z - 0.08 * jolt);
    P.head.rotation.set(base.head.x - 0.12 * ft + nod + 0.1 * vt, base.head.y, base.head.z + 0.1 * jolt);
    P.armR.shoulder.rotation.set(base.rS.x - 0.1 * ft + (reduced ? 0 : 0.025 * Math.sin(t * 1.3)) + sw * 0.05 * s, base.rS.y, base.rS.z - 0.25 * ft);
    P.armR.elbow.rotation.set(base.rE.x + 0.08 * ft, base.rE.y, base.rE.z);
    P.armL.shoulder.rotation.set(base.lS.x + 0.1 * jolt, base.lS.y, base.lS.z);
    P.vr.position.set(base.vrPos.x, base.vrPos.y - 0.2 * vt, base.vrPos.z + 0.07 * vt);
    P.vr.rotation.set(base.vrRot.x + 0.12 * vt, base.vrRot.y, base.vrRot.z);
    myShadow.visible = !act.sit;
  }

  // ---------- loop ----------
  let visible = true, raf = 0, last = performance.now();
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) { last = performance.now(); loop(); } });
  new IntersectionObserver(es => { const v = es[0].isIntersecting && !document.hidden; if (v && !visible) { visible = true; last = performance.now(); loop(); } else visible = v; }).observe(host);
  function loop(ts = performance.now()) {
    cancelAnimationFrame(raf); if (!visible) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.25, (ts - last) / 1000); last = ts;
    const t = ts / 1000;
    if (entered) { introK = Math.min(1, (now() - enterT - 0.5) / 2.4); if (introK < 0) introK = 0; }
    const lp = office.lap.g.position; lapItem.at = [lp.x, lp.z]; lapItem.face = Math.atan2(lp.x - pos.x, lp.z - pos.y);
    const dk = !entered ? 0 : closeDoors ? Math.max(0, 1 - (now() - enterT - 3.8) / 0.8) : Math.min(1, (now() - enterT) / 0.8);
    office.elev.userData.setOpen(dk * dk * (3 - 2 * dk));
    if (entered) step(dt);
    office.anims.forEach(f => f(reduced ? 0 : t));
    pose(t); placeCamera(Math.min(1, dt * 4));
    renderer.render(scene, camera);
    placeBubble();
  }
  setStatus(idleStatus());
  loop();
  document.fonts?.ready.then(() => office.redrawSigns());
  return api;
}
