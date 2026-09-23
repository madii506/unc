// The 4.6-second intro: unc drops in, lands, spins, slams the headset down, and the camera dives into the visor.
import * as THREE from 'three';
import { createUnc, applyPose } from './unc-model.js';
import { C, inkify, outline } from './ink.js';

export function playIntro(root, { onFill, onDone } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvasHost = root.querySelector('.i3d');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  canvasHost.append(renderer.domElement);
  const scene = new THREE.Scene();
  const unc = createUnc({ pose: 'front' });
  const P = unc.parts, M = unc.materials;
  inkify(unc.root, new Map([
    [M.polo, C.blue], [M.poloDark, C.blue], [M.stripeA, C.blue], [M.vrVisor, C.blue],
    [M.hair, C.grey], [M.stache, C.grey2], [M.beard, C.grey], [M.pick, C.wood], [M.screen, C.blueLt],
    [M.belt, C.ink], [M.stripeB, C.ink], [M.frame, C.ink], [M.vrStrap, C.ink], [M.sling, C.ink], [M.phone, C.ink], [M.eye, C.ink], [M.mouth, C.ink],
  ]));
  outline(unc.root, 0.012);
  const spin = new THREE.Group(); spin.add(unc.root); scene.add(spin);
  const vr0 = P.vr.position.clone(), vrR0 = P.vr.rotation.x;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  const size = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 44 : 30; camera.updateProjectionMatrix(); };
  size(); addEventListener('resize', size);

  const T = { land: 0.9, orbit: 1.25, slam: 2.75, dive: 3.45, end: 4.6 };
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const eIn = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * x;
  let t0 = 0, done = false, filled = false, released = false, posed = false, raf = 0;
  const cls = (c, on) => root.classList.toggle(c, on);
  // the intro holds on the blue fill until the office is built underneath it, then fades out
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    root.classList.add('out');
    setTimeout(() => { renderer.dispose(); root.remove(); }, 700);
    onDone?.();
  }
  function release() { released = true; if (filled) finish(); }
  function skipAhead() { if (!t0 || filled) return; const left = T.end - 0.35 - (performance.now() - t0) / 1000; if (left > 0) t0 -= left * 1000; }
  root.addEventListener('pointerdown', skipAhead);
  addEventListener('keydown', function skip(e) { if (done) { removeEventListener('keydown', skip); return; } if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skipAhead(); } });

  const head = new THREE.Vector3();
  function frame() {
    if (done) return;
    raf = requestAnimationFrame(frame);
    if (!t0) t0 = performance.now() - (reduced ? (T.end - 0.5) * 1000 : 0);
    const t = (performance.now() - t0) / 1000;
    if (filled) return;
    // 1. the drop: from the sky, spinning
    const f = ease(t / T.land);
    unc.root.position.y = (1 - eIn(Math.min(1, t / T.land))) * 5.5;
    spin.rotation.y = (1 - f) * Math.PI * 5 + (t > T.orbit ? 0 : 0);
    const sc = 0.7 + 0.3 * f; unc.root.scale.setScalar(sc);
    // 2. the landing: squash, shake, shockwave
    const lt = t - T.land;
    if (lt > 0 && lt < 0.5) { const k = Math.exp(-lt * 9) * Math.cos(lt * 30); P.body.scale.set(1 + 0.18 * k, 1 - 0.22 * k, 1 + 0.18 * k); } else P.body.scale.set(1, 1, 1);
    cls('shake', lt > 0 && lt < 0.35); cls('ring', lt > 0);
    // 3. the orbit: camera swings round him, the phone comes out, the backdrop flips to blue
    if (t > T.orbit && !posed) { applyPose(P, 'phone'); posed = true; }
    cls('blue', t > T.orbit);
    const ot = ease((t - T.orbit) / (T.dive - T.orbit));
    const ang = -0.35 + ot * (Math.PI * 2 + 0.35);
    let camR = 4.6 - 0.8 * ot, camY = 1.25 + 0.25 * Math.sin(ot * Math.PI);
    // 4. the slam: headset comes down over his eyes, flash
    const vt = ease((t - T.slam) / 0.18);
    P.vr.position.set(vr0.x, vr0.y - 0.2 * vt, vr0.z + 0.07 * vt); P.vr.rotation.x = vrR0 + 0.12 * vt;
    cls('flash', t > T.slam + 0.12 && t < T.slam + 0.3); cls('glitch', t > T.slam && t < T.dive + 0.4);
    // 5. the dive: straight into the visor
    const dt = eIn((t - T.dive) / (T.end - T.dive - 0.15));
    P.head.getWorldPosition(head); head.y += 0.06;
    const cx = Math.sin(ang) * camR, cz = Math.cos(ang) * camR;
    const lookY = 0.95 + 0.6 * dt;
    camera.position.set(cx + (head.x + Math.sin(ang) * 0.42 - cx) * dt, camY + (head.y - camY) * dt, cz + (head.z + Math.cos(ang) * 0.42 - cz) * dt);
    camera.lookAt(head.x * dt, lookY + (head.y - lookY) * dt, head.z * dt);
    cls('fill', t > T.end - 0.35);
    renderer.render(scene, camera);
    if (t >= T.end && !filled) { filled = true; onFill?.(); if (released) finish(); }
  }
  // compile the shaders once before the clock starts, so the drop doesn't stutter
  size(); renderer.compile(scene, camera);
  frame();
  return { release, skip: skipAhead };
}
