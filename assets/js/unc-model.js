// UNC — original 3D mascot built from three.js primitives.
// Usage: import { createUnc } from './unc-model.js'; const unc = createUnc({ pose: 'phone' }); scene.add(unc.root);
// Feet at y=0, top of head ~1.84, facing +z. Named pivots in unc.parts for animation.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const UNC_COLORS = {
  skin: 0xf0b088, skinShade: 0xe29c74, hair: 0xcfd2d6, stache: 0xc2c5c9,
  polo: 0xff7a59, poloDark: 0xe8623f, button: 0xfff4dc,
  shorts: 0xcdb48c, pocket: 0xb99f76, belt: 0x5a3a22, buckle: 0xd8d8d8,
  sock: 0xf7f5ef, stripeA: 0x22306b, stripeB: 0xd7473a,
  shoe: 0xf6f4ee, sole: 0xdcd7cb, shoeTrim: 0xc9c4b8,
  frame: 0x3a2618, lens: 0xbfe3ff, lanyard: 0xffd23f, badge: 0xffffff, badgeBand: 0x3b5998,
  vrShell: 0xf3f4f7, vrVisor: 0x151827, vrStrap: 0x3b3f4a, sling: 0x1f2126, zip: 0x9aa0aa, pick: 0xe9c98f, beard: 0xb7babf,
  phone: 0x1d1f24, screen: 0xdff1ff, eye: 0x1b1410, mouth: 0x7a3a2a,
};

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.62, metalness: o.m ?? 0, ...o.extra });
}

function mesh(geo, material, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

const sph = (r, w = 40, h = 28) => new THREE.SphereGeometry(r, w, h);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 10, 24);
const cyl = (rt, rb, h, s = 32) => new THREE.CylinderGeometry(rt, rb, h, s);

export function createUnc({ pose = 'phone', colors = {} } = {}) {
  const C = { ...UNC_COLORS, ...colors };
  const M = {
    skin: mat(C.skin, { r: 0.55 }), skinShade: mat(C.skinShade, { r: 0.6 }),
    scalp: mat(C.skin, { r: 0.32 }),
    hair: mat(C.hair, { r: 0.9 }), stache: mat(C.stache, { r: 0.95 }),
    polo: mat(C.polo, { r: 0.8 }), poloDark: mat(C.poloDark, { r: 0.8 }), button: mat(C.button, { r: 0.4 }),
    shorts: mat(C.shorts, { r: 0.85 }), pocket: mat(C.pocket, { r: 0.85 }),
    belt: mat(C.belt, { r: 0.5 }), buckle: mat(C.buckle, { r: 0.25, m: 0.7 }),
    sock: mat(C.sock, { r: 0.9 }), stripeA: mat(C.stripeA), stripeB: mat(C.stripeB),
    shoe: mat(C.shoe, { r: 0.55 }), sole: mat(C.sole, { r: 0.7 }), shoeTrim: mat(C.shoeTrim, { r: 0.6 }),
    frame: mat(C.frame, { r: 0.35 }),
    lens: new THREE.MeshPhysicalMaterial({ color: C.lens, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.45 }),
    lanyard: mat(C.lanyard, { r: 0.7 }), badge: mat(C.badge, { r: 0.35 }), badgeBand: mat(C.badgeBand, { r: 0.5 }),
    phone: mat(C.phone, { r: 0.3, m: 0.2 }),
    screen: new THREE.MeshStandardMaterial({ color: C.screen, emissive: C.screen, emissiveIntensity: 1.4, roughness: 0.2 }),
    eye: mat(C.eye, { r: 0.25 }), mouth: mat(C.mouth, { r: 0.7 }),
    vrShell: mat(C.vrShell, { r: 0.3 }), vrVisor: new THREE.MeshPhysicalMaterial({ color: C.vrVisor, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
    vrStrap: mat(C.vrStrap, { r: 0.8 }), sling: mat(C.sling, { r: 0.55 }), zip: mat(C.zip, { r: 0.3, m: 0.6 }),
    pick: mat(C.pick, { r: 0.8 }), beard: mat(C.beard, { r: 0.95 }),
  };

  const root = new THREE.Group(); root.name = 'unc';
  const body = new THREE.Group(); body.name = 'body'; root.add(body);
  const parts = { root, body };

  // ---------- legs, socks, dad sneakers (each leg pivots at the hip for walking) ----------
  for (const side of [-1, 1]) {
    const x = side * 0.13, H = 0.49;
    const leg = new THREE.Group(); leg.name = side < 0 ? 'legR' : 'legL'; leg.position.set(x, H, 0); body.add(leg);
    parts[leg.name] = leg;
    leg.add(mesh(cyl(0.062, 0.058, 0.26), M.skin, [0, 0.36 - H, 0]));
    leg.add(mesh(cyl(0.07, 0.066, 0.22), M.sock, [0, 0.19 - H, 0]));
    leg.add(mesh(cyl(0.071, 0.071, 0.02), M.stripeA, [0, 0.27 - H, 0]));
    leg.add(mesh(cyl(0.071, 0.071, 0.02), M.stripeB, [0, 0.24 - H, 0]));
    // chunky unbranded dad sneaker
    const shoe = new THREE.Group(); shoe.position.set(side * 0.01, -H, 0.05); shoe.rotation.y = side * 0.08;
    shoe.add(mesh(new RoundedBoxGeometry(0.19, 0.06, 0.36, 4, 0.025), M.sole, [0, 0.03, 0]));
    shoe.add(mesh(new RoundedBoxGeometry(0.175, 0.1, 0.32, 5, 0.045), M.shoe, [0, 0.1, -0.005]));
    shoe.add(mesh(sph(0.09), M.shoe, [0, 0.085, 0.12], [0.95, 0.62, 0.8]));
    shoe.add(mesh(new RoundedBoxGeometry(0.18, 0.022, 0.2, 3, 0.01), M.shoeTrim, [0, 0.068, -0.06]));
    shoe.add(mesh(new RoundedBoxGeometry(0.12, 0.05, 0.1, 3, 0.02), M.shoe, [0, 0.155, -0.08]));
    leg.add(shoe);
  }

  // ---------- cargo shorts ----------
  body.add(mesh(cap(0.3, 0.06), M.shorts, [0, 0.62, 0], [1.02, 0.55, 0.78]));
  for (const side of [-1, 1]) {
    const x = side * 0.145;
    body.add(mesh(cyl(0.15, 0.142, 0.26), M.shorts, [x, 0.5, 0], [1, 1, 0.95], [0, 0, side * 0.05]));
    body.add(mesh(new RoundedBoxGeometry(0.05, 0.12, 0.13, 3, 0.015), M.pocket, [x + side * 0.145, 0.48, 0.0], [1, 1, 1], [0, 0, side * 0.05]));
    body.add(mesh(new RoundedBoxGeometry(0.055, 0.03, 0.135, 2, 0.01), M.pocket, [x + side * 0.148, 0.55, 0.0], [1, 1, 1], [0, 0, side * 0.05]));
  }

  // ---------- torso: tucked polo + belly ----------
  const torso = new THREE.Group(); torso.name = 'torso'; torso.position.set(0, 0.66, 0); body.add(torso); parts.torso = torso;
  torso.add(mesh(new THREE.TorusGeometry(0.305, 0.028, 12, 48), M.belt, [0, 0.02, 0], [1.02, 0.78, 1], [Math.PI / 2, 0, 0]));
  torso.add(mesh(new RoundedBoxGeometry(0.085, 0.06, 0.03, 3, 0.01), M.buckle, [0, 0.02, 0.24]));
  torso.add(mesh(cap(0.33, 0.26), M.polo, [0, 0.33, -0.01], [1.06, 1, 0.8]));
  torso.add(mesh(sph(0.31), M.polo, [0, 0.19, 0.09], [1.02, 0.85, 0.98]));   // the belly
  torso.add(mesh(sph(0.2), M.polo, [0, 0.52, 0], [1.9, 0.62, 1.05]));    // shoulders
  // collar + placket
  torso.add(mesh(new THREE.TorusGeometry(0.125, 0.028, 12, 40), M.poloDark, [0, 0.6, 0.02], [1, 1, 0.85], [Math.PI / 2 - 0.25, 0, 0]));
  for (const side of [-1, 1]) {
    torso.add(mesh(new RoundedBoxGeometry(0.13, 0.018, 0.11, 2, 0.008), M.poloDark, [side * 0.07, 0.575, 0.2], [1, 1, 1], [0.95, side * -0.4, side * -0.45]));
  }
  torso.add(mesh(new RoundedBoxGeometry(0.06, 0.17, 0.02, 2, 0.008), M.poloDark, [0, 0.47, 0.235], [1, 1, 1], [-0.28, 0, 0]));
  torso.add(mesh(sph(0.012), M.button, [0, 0.51, 0.25]));
  torso.add(mesh(sph(0.012), M.button, [0, 0.44, 0.27]));

  // crossbody sling bag (the unc bag)
  const strap = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.24, 0.66, -0.12), new THREE.Vector3(0.2, 0.6, 0.16), new THREE.Vector3(0.05, 0.42, 0.3),
    new THREE.Vector3(-0.12, 0.25, 0.33), new THREE.Vector3(-0.3, 0.08, 0.2), new THREE.Vector3(-0.33, 0.02, -0.1),
    new THREE.Vector3(-0.1, 0.06, -0.3), new THREE.Vector3(0.18, 0.38, -0.3), new THREE.Vector3(0.24, 0.66, -0.12),
  ], true);
  torso.add(mesh(new THREE.TubeGeometry(strap, 120, 0.018, 8, true), M.sling, [0, 0, 0], [1, 1, 1.02]));
  const bag = new THREE.Group(); bag.position.set(-0.1, 0.27, 0.35); bag.rotation.set(-0.2, -0.15, 0.55); torso.add(bag); parts.bag = bag;
  bag.add(mesh(cap(0.07, 0.17), M.sling, [0, 0, 0], [1, 1, 0.6], [0, 0, Math.PI / 2]));
  bag.add(mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 30, Math.PI), M.zip, [0, 0.0, 0.035], [1.7, 0.55, 1]));
  bag.add(mesh(new RoundedBoxGeometry(0.02, 0.035, 0.012, 2, 0.004), M.zip, [0.12, 0.02, 0.045]));
  // reading glasses hooked on the polo placket
  const hung = new THREE.Group(); hung.position.set(0.0, 0.5, 0.265); hung.rotation.set(-0.25, 0, 0.08); torso.add(hung); parts.hungGlasses = hung;
  for (const side of [-1, 1]) {
    hung.add(mesh(new THREE.TorusGeometry(0.042, 0.008, 8, 28), M.frame, [side * 0.052, -0.045, 0.012], [1.15, 0.85, 1]));
    hung.add(mesh(new THREE.CircleGeometry(0.042, 24), M.lens, [side * 0.052, -0.045, 0.013], [1.15, 0.85, 1]));
  }
  hung.add(mesh(cyl(0.006, 0.006, 0.03, 8), M.frame, [0, -0.035, 0.012], [1, 1, 1], [0, 0, Math.PI / 2]));

  // ---------- head ----------
  const neck = new THREE.Group(); neck.name = 'neck'; neck.position.set(0, 0.6, 0.0); torso.add(neck); parts.neck = neck;
  neck.add(mesh(cyl(0.1, 0.11, 0.14), M.skin, [0, 0.05, 0]));
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, 0.28, 0.02); neck.add(head); parts.head = head;
  head.add(mesh(sph(0.3, 64, 48), M.scalp, [0, 0.02, 0], [1, 1.07, 0.98]));
  head.add(mesh(sph(0.2), M.skin, [0, -0.13, 0.07], [1.25, 0.9, 1.0]));       // jowls/chin
  for (const side of [-1, 1]) {
    head.add(mesh(sph(0.06), M.skin, [side * 0.14, -0.07, 0.19]));         // cheeks
    head.add(mesh(sph(0.085), M.skin, [side * 0.3, -0.01, -0.01], [0.42, 1, 0.72])); // ears
    head.add(mesh(sph(0.04), M.skinShade, [side * 0.315, -0.01, 0.0], [0.3, 0.65, 0.45]));
    // tired squinting eyes
    head.add(mesh(cap(0.021, 0.055), M.eye, [side * 0.1, 0.03, 0.27], [1, 1, 0.7], [0, 0, Math.PI / 2 + side * 0.2])); // squint
    // bushy grey brows
    head.add(mesh(cap(0.026, 0.07), M.hair, [side * 0.11, 0.1, 0.268], [1, 1, 0.8], [0, 0, side * 1.85]));
  }
  head.add(mesh(sph(0.078), M.skinShade, [0, -0.02, 0.305], [1, 0.95, 1.05]));   // big nose
  // salt-and-pepper moustache + goatee, toothpick in the corner
  head.add(mesh(sph(0.075), M.stache, [0, -0.095, 0.285], [1.45, 0.52, 0.72]));
  for (const side of [-1, 1]) head.add(mesh(cap(0.034, 0.1), M.stache, [side * 0.085, -0.14, 0.255], [1, 1, 0.75], [0, 0, side * -0.25]));
  head.add(mesh(sph(0.085), M.beard, [0, -0.225, 0.2], [1.05, 0.95, 0.85]));
  head.add(mesh(cyl(0.0045, 0.0035, 0.13, 8), M.pick, [0.115, -0.15, 0.3], [1, 1, 1], [0.5, 0, 1.3]));
  // horseshoe hair (sides + back only — bald on top)
  const hairArc = new THREE.TorusGeometry(0.265, 0.07, 16, 60, Math.PI * 1.32);
  head.add(mesh(hairArc, M.hair, [0, 0.0, -0.02], [1.02, 1, 1.0], [Math.PI / 2, 0, -Math.PI * 0.16 + Math.PI]));
  for (const side of [-1, 1]) head.add(mesh(sph(0.065), M.hair, [side * 0.262, 0.03, 0.06], [0.6, 1.1, 0.9]));
  // VR headset pushed up on the forehead (tried the metaverse once)
  const vr = new THREE.Group(); vr.name = 'vr'; vr.position.set(0, 0.245, 0.2); vr.rotation.x = -0.12; head.add(vr); parts.vr = vr;
  vr.add(mesh(new RoundedBoxGeometry(0.34, 0.15, 0.13, 6, 0.05), M.vrShell, [0, 0, 0.02]));
  vr.add(mesh(new RoundedBoxGeometry(0.31, 0.12, 0.02, 5, 0.01), M.vrVisor, [0, 0, 0.086]));
  for (const side of [-1, 1]) vr.add(mesh(sph(0.012), M.vrVisor, [side * 0.11, 0.035, 0.098]));
  head.add(mesh(new THREE.TorusGeometry(0.285, 0.02, 10, 64), M.vrStrap, [0, 0.13, -0.01], [1.03, 1, 1.0], [Math.PI / 2 - 0.42, 0, 0]));

  // ---------- arms ----------
  function arm(side) {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.36, 0.5, 0); torso.add(shoulder);
    shoulder.add(mesh(sph(0.105), M.polo, [0, -0.03, 0]));
    shoulder.add(mesh(cyl(0.1, 0.095, 0.15), M.polo, [0, -0.09, 0]));           // short sleeve
    shoulder.add(mesh(cyl(0.097, 0.097, 0.02), M.poloDark, [0, -0.165, 0]));
    shoulder.add(mesh(cap(0.068, 0.16), M.skin, [0, -0.17, 0]));
    const elbow = new THREE.Group(); elbow.position.set(0, -0.28, 0); shoulder.add(elbow);
    elbow.add(mesh(sph(0.066), M.skin));
    elbow.add(mesh(cap(0.062, 0.17), M.skin, [0, -0.12, 0]));
    const hand = new THREE.Group(); hand.position.set(0, -0.27, 0); elbow.add(hand);
    hand.add(mesh(sph(0.072), M.skin, [0, 0, 0], [0.9, 1.05, 0.75]));
    hand.add(mesh(cap(0.024, 0.05), M.skin, [side * -0.06, 0.02, 0.03], [1, 1, 1], [0, 0, side * 0.6])); // thumb
    return { shoulder, elbow, hand };
  }
  parts.armR = arm(-1); // character's right (viewer's left when facing camera)
  parts.armL = arm(1);

  // phone (held by right hand)
  const phone = new THREE.Group(); phone.name = 'phone'; parts.phone = phone;
  phone.add(mesh(new RoundedBoxGeometry(0.13, 0.25, 0.016, 4, 0.014), M.phone));
  const scr = mesh(new RoundedBoxGeometry(0.116, 0.232, 0.004, 3, 0.01), M.screen, [0, 0, -0.009]);
  phone.add(scr); parts.screen = scr;
  parts.armR.hand.add(phone);
  phone.position.set(0, -0.08, 0.02);

  applyPose(parts, pose);
  return { root, parts, materials: M, applyPose: (p) => applyPose(parts, p) };
}

export function applyPose(parts, pose) {
  const { armR, armL, head, neck, torso, phone, body } = parts;
  const reset = (g) => g.rotation.set(0, 0, 0);
  [armR.shoulder, armR.elbow, armR.hand, armL.shoulder, armL.elbow, armL.hand, head, neck, torso, body, parts.legL, parts.legR].forEach(reset);
  phone.visible = true; phone.scale.setScalar(1);
  if (pose === 'phone' || pose === 'bust') {
    // right arm straight out at eye level, phone held as far away as it goes; left hand on the lower back
    armR.shoulder.rotation.set(-1.62, 0.0, -0.42);
    armR.elbow.rotation.set(-0.08, 0, 0);
    armR.hand.rotation.set(0.25, 0, 0);
    phone.rotation.set(-0.35, 0.35, 0);
    phone.position.set(0.0, -0.1, 0.03);
    armL.shoulder.rotation.set(0.62, 0, 0.5);
    armL.elbow.rotation.set(0.1, -0.2, -1.75);
    armL.hand.rotation.set(0, 0, 0);
    torso.rotation.set(-0.08, 0.1, 0);
    neck.rotation.set(-0.08, -0.38, 0.05);
    head.rotation.set(-0.1, -0.3, 0.08);
  } else if (pose === 'front') {
    // standing straight, facing forward, phone in the right hand at his side
    armR.shoulder.rotation.set(0.04, 0, -0.2);
    armR.elbow.rotation.set(-0.35, 0, 0);
    armR.hand.rotation.set(0.1, 0, 0);
    phone.rotation.set(-0.15, 0.2, 0);
    phone.position.set(0.02, -0.1, 0.06); phone.scale.setScalar(0.72);
    armL.shoulder.rotation.set(0.04, 0, 0.2);
    armL.elbow.rotation.set(-0.35, 0, 0);
  } else if (pose === 'idle') {
    armR.shoulder.rotation.set(0, 0, -0.12);
    armL.shoulder.rotation.set(0, 0, 0.12);
    phone.visible = false;
  }
}
