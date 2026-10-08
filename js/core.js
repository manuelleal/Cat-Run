// Núcleo de Cat Run. Los módulos de js/ (worlds, cats, fx, levels) se enchufan con install(game).
// El contrato completo está en AGENTES.md.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LANE = 3, HALF = 7.5, DEPTH = 10; // carril, media calle (con andenes), fondo de edificios

/* ---------- Eventos, ajustes y estado ---------- */
const listeners = {};
const on = (name, fn) => { (listeners[name] ||= []).push(fn); };
function emit(name, data) {
  for (const fn of listeners[name] || []) try { fn(data); } catch (e) { console.error(`[evento ${name}]`, e); }
}
const hooks = { damage: [] }; // damage: fn(o) → false cancela el golpe
const flags = { customMenu: false }; // customMenu: un módulo maneja menú y reinicio; el núcleo no arranca solo
const cfg = {
  baseSpeed: 16, accel: .22, maxSpeed: 38, jumpV: 11.5, gravity: 34, airJumps: 0, slideTime: .85, laneSnap: 14,
  invuln: 1.2, hitSlow: .45, mouseHeal: 4, gapMin: 4, gapMax: 8.5, rowGap: [19, 26], scoreCoin: 5, scoreMouse: 25
};
const S = { state: 'menu', paused: false, time: 0, dist: 0, mice: 0, coins: 0, health: 100, speed: 16, speedMul: 1,
  shake: 0, dogGap: 6.7, dogOff: 0, dieT: 0, score: 0, won: false };
const p = {};
const store = {
  get(key, def) { try { const v = localStorage.getItem(key); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};

/* ---------- Escena ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf5d9b8, 55, 165);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 420);
const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x8a6f5a, 2.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 70 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);

// la cámara va detrás del perro: el perro queda en primer plano y el gato adelante
const view = { back: 6, h: 6.8, fov: 62 }; // alta y retirada: Panela pequeña abajo, Tinto despejado y mucha calle por delante
function resize() {
  const w = window.innerWidth, h = window.innerHeight, portrait = h > w;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  view.fov = camera.fov = portrait ? 78 : 62;
  view.back = portrait ? 7 : 6;
  view.h = portrait ? 8 : 6.8;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- Materiales, texturas y piezas ---------- */
const BOX = new THREE.BoxGeometry(1, 1, 1);
const BALL = new THREE.SphereGeometry(.5, 24, 18);
const CAP = new THREE.CapsuleGeometry(.5, 1, 6, 14);
const EAR = new THREE.ConeGeometry(.5, 1, 12);
const CYL = new THREE.CylinderGeometry(.5, .5, 1, 14);
const SPH = new THREE.SphereGeometry(.5, 12, 10);
const CONE = new THREE.ConeGeometry(.5, 1, 4);
const DISC = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
const RING = new THREE.RingGeometry(.95, 1.25, 24).rotateX(-Math.PI / 2);
const geo = { BOX, BALL, CAP, EAR, CYL, SPH, CONE, DISC, RING };

const mats = {};
const mat = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function stripes(a, b) {
  return canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    g.fillStyle = b;
    for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.lineTo(x + h + 16, 0); g.lineTo(x + 16, h); g.fill(); }
  });
}
const skyTex = stops => canvasTex(2, 256, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => grad.addColorStop([0, .55, .8][i], c));
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
});
function defaultRoad(g, w, h) {
  g.fillStyle = '#3b3e48'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < .5 ? '#434652' : '#343741'; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  g.fillStyle = '#f0f0f0';
  g.fillRect(w / 3 - 3, 0, 6, h / 2); g.fillRect(2 * w / 3 - 3, 0, 6, h / 2);
  g.fillStyle = '#ffd94a';
  g.fillRect(4, 0, 5, h); g.fillRect(w - 9, 0, 5, h);
}
// casas de pueblo: ventanas de madera con balcón y puertas en la planta baja
function defaultFacade(g, w, h, rows) {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
    const x = c * 32, y = r * 32, door = r === rows - 1 && c % 2 === 0;
    g.fillStyle = '#6b3f22';
    if (door) { g.fillRect(x + 8, y + 6, 16, 26); g.fillStyle = '#4a2a14'; g.fillRect(x + 15, y + 6, 2, 26); continue; }
    g.fillRect(x + 7, y + 5, 18, 20);
    g.fillStyle = Math.random() < .2 ? '#ffe2a0' : '#2f3a4a'; g.fillRect(x + 9, y + 7, 14, 16);
    g.fillStyle = '#6b3f22'; g.fillRect(x + 15, y + 7, 2, 16);
    if (r < rows - 1) { g.fillStyle = '#26262b'; g.fillRect(x + 3, y + 25, 26, 3); g.fillRect(x + 3, y + 19, 2, 8); g.fillRect(x + 27, y + 19, 2, 8); }
  }
}
const policeMat = new THREE.MeshLambertMaterial({ map: stripes('#ffffff', '#f26a1b') });
const hazardMat = new THREE.MeshLambertMaterial({ map: stripes('#ffd400', '#111111') });
const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const WHITE = new THREE.Color(1, 1, 1);

function part(geometry, m, sx, sy, sz, x, y, z, parent) {
  const o = new THREE.Mesh(geometry, typeof m === 'number' ? mat(m) : m);
  o.scale.set(sx, sy, sz); o.position.set(x, y, z);
  parent.add(o);
  return o;
}
// Funde todas las piezas de un grupo en una malla por material (color por vértice): muchas menos llamadas de dibujo
function bake(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), buckets = new Map(), m4 = new THREE.Matrix4();
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
    const m = o.material.map ? o.material : vcMat, c = o.userData.tint || (o.material.map ? WHITE : o.material.color);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(g);
  });
  return [...buckets].map(([material, gs]) => ({ geometry: mergeGeometries(gs), material }));
}
function leg(parent, color, paw, w, len, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  part(CAP, color, w, len / 2, w, 0, -len / 2, 0, g);
  part(BALL, paw, w * 1.3, w * .8, w * 1.6, 0, -len + w * .3, -w * .25, g);
  parent.add(g);
  return g;
}

/* ---------- Personajes (miran hacia -Z), redondeados estilo caricatura ---------- */
function makeCat({ fur, dark, white, eye }) {
  const g = new THREE.Group(), b = new THREE.Group();
  g.add(b);
  part(BALL, fur, .64, .6, 1.25, 0, .7, 0, b);
  part(BALL, white, .5, .4, 1, 0, .56, -.05, b);
  [-.32, 0, .3].forEach(z => part(BALL, dark, .66, .5, .11, 0, .77, z, b)); // rayas del lomo
  part(BALL, fur, .66, .58, .58, 0, 1.08, -.72, b);
  part(BALL, dark, .2, .6, .5, 0, 1.08, -.7, b);
  part(BALL, white, .36, .26, .22, 0, .98, -.97, b);
  part(BALL, 0xff8fa8, .09, .07, .07, 0, 1.03, -1.08, b);
  for (const x of [-.16, .16]) {
    part(BALL, 0xffffff, .22, .24, .12, x, 1.16, -.94, b);
    part(BALL, eye, .15, .17, .1, x, 1.16, -.98, b);
    part(BALL, 0x111111, .07, .12, .06, x, 1.16, -1.01, b);
    part(EAR, fur, .26, .32, .16, x * 1.25, 1.42, -.7, b);
    part(EAR, 0xff9fb5, .15, .2, .08, x * 1.25, 1.4, -.76, b);
  }
  const tail = new THREE.Group();
  tail.position.set(0, .88, .55); tail.rotation.x = .6;
  part(CAP, fur, .15, .36, .15, 0, .36, 0, tail);
  part(BALL, white, .19, .24, .19, 0, .74, 0, tail);
  b.add(tail);
  const legs = [[-.18, -.42], [.18, -.42], [.18, .42], [-.18, .42]].map(([x, z]) => leg(b, fur, white, .16, .46, x, .46, z));
  g.scale.setScalar(1.25);
  g.userData = { legs, tail, body: b };
  return g;
}
function makeDog() {
  const g = new THREE.Group(), b = new THREE.Group(), B = 0xb86a2c, D = 0x7a4218, W = 0xffffff;
  g.add(b);
  part(BALL, B, 1.1, 1, 1.95, 0, 1.08, 0, b);
  part(BALL, W, .85, .75, .8, 0, .95, -.62, b);
  part(BALL, W, .55, .4, 1, 0, 1.4, -.15, b); // mancha blanca del lomo
  part(BALL, B, 1, .9, .9, 0, 1.68, -1.1, b);
  part(BALL, W, .3, .93, .93, 0, 1.68, -1.1, b);
  part(BALL, W, .66, .46, .55, 0, 1.5, -1.5, b); // hocico
  part(BALL, 0x111111, .22, .16, .16, 0, 1.6, -1.77, b);
  part(BOX, W, .36, .09, .1, 0, 1.33, -1.7, b); // dientes
  for (const x of [-1, 1]) {
    part(BALL, D, .22, .55, .42, x * .5, 1.62, -1.02, b).rotation.z = x * .35; // orejas caídas
    part(BALL, W, .2, .2, .12, x * .22, 1.84, -1.48, b);
    part(BALL, 0x111111, .1, .1, .08, x * .22, 1.83, -1.53, b);
    part(BOX, D, .26, .07, .08, x * .22, 1.96, -1.5, b).rotation.z = x * .45; // cejas bravas
  }
  part(CYL, 0xd01828, 1, .2, .92, 0, 1.33, -.76, b).rotation.x = Math.PI / 2; // collar
  part(BALL, 0xffc21a, .16, .16, .16, 0, .93, -.9, b);
  const tail = new THREE.Group();
  tail.position.set(0, 1.4, .9); tail.rotation.x = .9;
  part(CAP, B, .18, .22, .18, 0, .22, 0, tail);
  b.add(tail);
  const legs = [[-.3, -.6], [.3, -.6], [.3, .6], [-.3, .6]].map(([x, z]) => leg(b, B, W, .3, .72, x, .72, z));
  g.scale.setScalar(1.2);
  g.userData = { legs, tail, body: b };
  return g;
}
function runCycle(model, phase, amp = .9) {
  const u = model.userData;
  u.legs?.forEach((l, i) => l.rotation.x = Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.4 : 0)) * amp);
  if (u.tail) u.tail.rotation.z = Math.sin(phase * .5) * .4;
}

/* ---------- Obstáculos ---------- */
const CAR_COLORS = [0xf2c230, 0xd8433b, 0xf2f2f2]; // el primero es el taxi
const VARIANTS = { carro: 3, senora: 3 };
const BUILD = {
  valla(g) {
    part(BOX, policeMat, 2.8, .45, .12, 0, .85, 0, g);
    part(BOX, policeMat, 2.8, .25, .12, 0, .35, 0, g);
    part(BOX, 0x333842, .12, 1.1, .7, -1.2, .55, 0, g);
    part(BOX, 0x333842, .12, 1.1, .7, 1.2, .55, 0, g);
  },
  caja(g) {
    part(BOX, 0xb9833f, 1.7, 1.2, 1.7, 0, .6, 0, g);
    for (const y of [.08, 1.12]) part(BOX, 0x7a4f22, 1.78, .16, 1.78, 0, y, 0, g);
    for (const x of [-.81, .81]) for (const z of [-.81, .81]) part(BOX, 0x7a4f22, .16, 1.2, .16, x, .6, z, g);
  },
  bus(g) {
    part(BOX, 0xd8433b, 2.5, 1.3, 9, 0, 1.05, 0, g);
    part(BOX, 0xf2f2f2, 2.5, 1.5, 9, 0, 2.45, 0, g);
    part(BOX, 0x23283a, 2.56, .9, 8, 0, 2.4, 0, g);
    part(BOX, 0x23283a, 2.2, 1, 9.06, 0, 2.4, 0, g);
    part(BOX, 0xfff2a8, .5, .25, 9.08, -.8, .9, 0, g); part(BOX, 0xfff2a8, .5, .25, 9.08, .8, .9, 0, g);
    for (const x of [-1.25, 1.25]) for (const z of [-3, 3]) part(CYL, 0x15151a, 1, .3, 1, x, .5, z, g).rotation.z = Math.PI / 2;
  },
  carreta(g) {
    part(BOX, 0x8a5a2b, 2, .5, 2.6, 0, 1.05, 0, g);
    for (const x of [-1.08, 1.08]) part(CYL, 0x5a3a1c, 1.2, .14, 1.2, x, .6, .3, g).rotation.z = Math.PI / 2;
    for (let i = 0; i < 10; i++) part(SPH, i % 4 ? 0xff8a1f : 0x7fc241, .42, .42, .42, -.6 + (i % 3) * .6, 1.45 + (i > 5 ? .3 : 0), -.9 + Math.floor(i / 3) * .55, g);
    for (const x of [-.95, .95]) for (const z of [-1.25, 1.25]) part(BOX, 0x5a3a1c, .1, 1.6, .1, x, 2.05, z, g);
    part(BOX, 0x2f8f6b, 2.5, .14, 3.1, 0, 2.9, 0, g);
  },
  moneda(g) {
    part(CYL, 0xffc21a, .9, .12, .9, 0, 1, 0, g).rotation.x = Math.PI / 2;
    part(CYL, 0xd9920a, .42, .16, .42, 0, .95, 0, g).rotation.x = Math.PI / 2;
    for (const x of [-.22, 0, .22]) part(CYL, 0xd9920a, .16, .16, .16, x, 1.22 - Math.abs(x) * .3, 0, g).rotation.x = Math.PI / 2;
  },
  basura(g) {
    part(CYL, 0x2f7a4a, .9, 1, .9, -.2, .5, 0, g);
    part(CYL, 0x245c38, 1, .1, 1, -.2, 1.05, 0, g);
    part(SPH, 0x1a1a1f, .8, .7, .8, .6, .35, .2, g);
    part(SPH, 0x26262d, .6, .5, .6, .3, .25, .7, g);
  },
  carro(g, v) {
    part(BOX, CAR_COLORS[v % 3], 2.2, .8, 4.2, 0, .8, 0, g);
    part(BOX, CAR_COLORS[v % 3], 2, .15, 2.3, 0, 1.95, .1, g);
    if (v % 3 === 0) part(BOX, 0x1a1a1f, .7, .22, .3, 0, 2.13, .1, g);
    part(BOX, 0x23283a, 1.9, .7, 2.2, 0, 1.55, .1, g);
    part(BOX, 0xfff2a8, .5, .2, .1, -.7, .9, -2.1, g); part(BOX, 0xfff2a8, .5, .2, .1, .7, .9, -2.1, g);
    part(BOX, 0xff3030, .5, .2, .1, -.7, .9, 2.1, g); part(BOX, 0xff3030, .5, .2, .1, .7, .9, 2.1, g);
    for (const x of [-1.1, 1.1]) for (const z of [-1.3, 1.3]) part(CYL, 0x15151a, .8, .3, .8, x, .4, z, g).rotation.z = Math.PI / 2;
  },
  senora(g, v) {
    if (v % 3 === 0) { // señor de sombrero con maletín
      part(BOX, 0x2a2d3a, .55, .95, .35, 0, .48, 0, g);
      part(BOX, 0xb03a3a, .75, .85, .42, 0, 1.38, 0, g);
      part(SPH, 0xe0a878, .5, .5, .5, 0, 2.02, 0, g);
      part(CYL, 0xe8d29a, 1, .06, 1, 0, 2.24, 0, g);
      part(CYL, 0xe8d29a, .5, .26, .5, 0, 2.38, 0, g);
      part(BOX, 0x5a3a22, .16, .45, .6, .52, .95, 0, g);
      return;
    }
    part(CYL, v % 3 === 1 ? 0x9b4fc4 : 0x3f8fbf, .9, 1.3, .9, 0, .65, 0, g);
    part(BOX, 0xf0d9b5, .6, .5, .4, 0, 1.5, 0, g);
    part(SPH, 0xf2c9a0, .5, .5, .5, 0, 2, 0, g);
    part(SPH, 0xcfcfd6, .52, .4, .52, 0, 2.14, .05, g);
    part(SPH, 0xcfcfd6, .25, .25, .25, 0, 2.35, .15, g);
    part(BOX, 0x7a4a2a, .2, .4, .45, .5, 1.05, 0, g);
  },
  alcantarilla(g) {
    part(DISC, 0x05050a, .95, 1, .95, 0, .03, 0, g);
    part(RING, 0xff8a1f, 1, 1, 1, 0, .02, 0, g);
    part(CYL, 0x6a6f7a, 1.6, .12, 1.6, 1.15, .1, .9, g);
    part(CONE, 0xff6a1f, .5, .9, .5, -1.1, .45, .6, g);
  },
  cinta(g) {
    part(BOX, 0x333842, .18, 2.3, .18, -4.6, 1.15, 0, g);
    part(BOX, 0x333842, .18, 2.3, .18, 4.6, 1.15, 0, g);
    part(BOX, hazardMat, 9.2, .7, .1, 0, 1.75, 0, g);
  },
  rampa(g) { // tablón inclinado: 5 de largo, sube a 2,2
    const t = part(BOX, 0xc9954f, 2.5, .16, 5.5, 0, 1.06, 0, g);
    t.rotation.x = Math.atan2(2.2, 5);
    for (const x of [-1.1, 1.1]) part(BOX, 0x7a4f22, .16, 1.9, .16, x, .95, -2.2, g);
    for (const z of [-1.5, 0, 1.5]) part(BOX, 0x7a4f22, 2.5, .08, .12, 0, 1.2 - z * .44, z, g).rotation.x = Math.atan2(2.2, 5);
    part(CONE, 0x35f07a, .6, .8, .6, 0, .9, 2.9, g); // flecha: por aquí se sube
  },
  tarima(g) { // andamio de madera de 14 de largo y 2,2 de alto
    part(BOX, 0xc9954f, 2.6, .2, 14, 0, 2.1, 0, g);
    part(BOX, 0x8a5a2b, 2.7, .12, 14.1, 0, 1.96, 0, g);
    for (const x of [-1.2, 1.2]) for (let z = -6.6; z <= 6.7; z += 3.3) part(BOX, 0x7a4f22, .18, 2, .18, x, 1, z, g);
    for (const x of [-1.2, 1.2]) part(BOX, 0x7a4f22, .1, .1, 14, x, .9, 0, g);
  },
  pescado(g) {
    part(SPH, 0x6fb7e8, .9, .45, .3, 0, .45, 0, g);
    part(CONE, 0x4f96c8, .5, .5, .2, .6, .45, 0, g).rotation.z = Math.PI / 2;
    part(SPH, 0xffffff, .12, .12, .1, -.25, .52, .13, g); part(SPH, 0x111111, .06, .06, .06, -.27, .52, .17, g);
  },
  raton(g) {
    part(SPH, 0xc9ccd6, .6, .55, .9, 0, .4, 0, g);
    part(SPH, 0xc9ccd6, .42, .4, .45, 0, .5, -.5, g);
    part(SPH, 0xffa6c1, .34, .34, .1, -.24, .8, -.45, g);
    part(SPH, 0xffa6c1, .34, .34, .1, .24, .8, -.45, g);
    part(SPH, 0xffa6c1, .1, .1, .1, 0, .48, -.74, g);
    part(BOX, 0xffa6c1, .06, .06, .8, 0, .3, .8, g);
  }
};
// hw/hl: medio ancho y medio largo · y0..y1: altura que ocupa · dmg: daño · collect: se recoge en vez de chocar
const SPEC = {
  valla: { hw: 1.4, hl: .3, y0: 0, y1: 1, dmg: 20, fly: true },
  basura: { hw: .8, hl: .6, y0: 0, y1: 1, dmg: 15, fly: true },
  carro: { hw: 1.15, hl: 2.1, y0: .55, y1: 2.3, dmg: 30 }, // y0: el hueco bajo el chasis; agachado se pasa
  senora: { hw: .5, hl: .5, y0: 0, y1: 2.6, dmg: 25, fly: true },
  alcantarilla: { hw: .9, hl: .9, y0: -1, y1: .05, dmg: 30, shadow: false },
  cinta: { hw: 5, hl: .2, y0: 1.15, y1: 3, dmg: 20, fly: true },
  caja: { hw: .9, hl: .85, y0: 0, y1: 1.2, dmg: 15, fly: true },
  bus: { hw: 1.25, hl: 4.5, y0: .6, y1: 3.4, dmg: 30 },
  carreta: { hw: 1.1, hl: 1.4, y0: 0, y1: 3, dmg: 25 },
  rampa: { hw: 1.25, hl: 2.5, y0: 0, y1: 2.2, top: 2.2, ramp: true, dmg: 0 },
  tarima: { hw: 1.3, hl: 7, y0: 0, y1: 2.2, top: 2.2, dmg: 25 },
  pescado: { hw: 1.1, hl: 1, y0: 0, y1: 1.6, collect: true, food: 10, shadow: false },
  raton: { hw: 1.1, hl: 1, y0: 0, y1: 1.4, collect: true, shadow: false },
  moneda: { hw: 1.1, hl: 1, y0: 0, y1: 2.2, collect: true, shadow: false }
};
const protos = {};
function spawn(type) {
  const v = Math.floor(Math.random() * 15), key = type + (VARIANTS[type] ? v % VARIANTS[type] : '');
  if (!protos[key]) { const g = new THREE.Group(); BUILD[type](g, v); protos[key] = bake(g); }
  const g = new THREE.Group();
  for (const { geometry, material } of protos[key]) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = SPEC[type].shadow !== false;
    g.add(m);
  }
  return g;
}

/* ---------- Mundos ---------- */
const WORLD_DEFAULTS = {
  sky: ['#3f86dc', '#a9d2f5', '#f5d9b8'], fog: 0xf5d9b8, fogRange: [55, 165], hemi: [0xcfe6ff, 0x8a6f5a, 2.1], sun: [0xffe2b0, 2.4],
  tints: [0xfaf3e3, 0xf4d98a, 0xe9a66b, 0xf2c4a8, 0xbfd9e8, 0xf7e8c8, 0xf1b24a], zocalos: [0x2f7a4a, 0x2f5fa8, 0xb5482f, 0x7a4a2a, 0xd9a520],
  roof: 0xb5482f, awnings: [0xd8433b, 0x2f8f6b], sidewalk: 0xcbb89a, ground: 0xb9a98c, crossing: 0x3b3e48,
  mountains: true, mountainColors: [0x6f9a78, 0x7fa98a, 0x8fb3a0, 0x5f8a70], trees: true, lamps: true, flowers: true,
  heights: [0, 1, 2, 3], rowWeights: {}
};
const worlds = [
  { id: 'dia', name: 'Día', emoji: '☀️', desc: 'El pueblo a pleno sol' },
  { id: 'atardecer', name: 'Atardecer', emoji: '🌇', desc: 'La hora dorada',
    sky: ['#6a4fa3', '#f08a6b', '#ffd08a'], fog: 0xf6b98a, hemi: [0xffc9a8, 0x7a5a6a, 1.7], sun: [0xff9a5a, 2.6] },
  { id: 'noche', name: 'Noche', emoji: '🌙', desc: 'Calles a oscuras',
    sky: ['#0b1030', '#1d2456', '#3a3f7a'], fog: 0x262d62, hemi: [0x8090ff, 0x24244a, 1.1], sun: [0xaab8ff, 1.3], mountains: false }
];
let world = worlds[0];
const W = key => world[key] ?? WORLD_DEFAULTS[key];
const texCache = new Map();
function worldMats() {
  if (!texCache.has(world)) texCache.set(world, {
    facades: [2, 3, 4, 5].map(rows => new THREE.MeshLambertMaterial({ vertexColors: true,
      map: canvasTex(128, rows * 32, (g, w, h) => (world.facade || defaultFacade)(g, w, h, rows)) })),
    road: (() => { const t = canvasTex(256, 256, world.road || defaultRoad); t.wrapT = THREE.RepeatWrapping; return new THREE.MeshLambertMaterial({ map: t }); })()
  });
  return texCache.get(world);
}
const ground = part(BOX, new THREE.MeshLambertMaterial({ color: 0xb9a98c }), 700, .2, 700, 0, -.2, 0, scene);
let backdrop = null;
function makeMountains(colors) {
  const g = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + rand(-.1, .1), h = rand(60, 120);
    const m = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshBasicMaterial({ color: pick(colors), fog: false }));
    m.scale.set(rand(60, 100), h, rand(60, 100));
    m.position.set(Math.cos(a) * 300, h / 2 - 4, Math.sin(a) * 300);
    g.add(m);
  }
  return g;
}
function applyWorld(w) {
  world = w;
  if (scene.background) scene.background.dispose();
  scene.background = skyTex(W('sky'));
  scene.fog.color.set(W('fog')); [scene.fog.near, scene.fog.far] = W('fogRange');
  const h = W('hemi'), s = W('sun');
  hemi.color.set(h[0]); hemi.groundColor.set(h[1]); hemi.intensity = h[2];
  sun.color.set(s[0]); sun.intensity = s[1];
  ground.material.color.set(W('ground'));
  if (backdrop) { scene.remove(backdrop); backdrop.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); }
  backdrop = world.backdrop ? world.backdrop(game) : W('mountains') ? makeMountains(W('mountainColors')) : new THREE.Group();
  scene.add(backdrop);
  emit('world', world);
}
function setWorld(id) {
  applyWorld(worlds.find(w => w.id === id) || worlds[0]);
  refreshMenu();
  if (S.state !== 'play' && S.state !== 'dying' && cur) reset();
}

/* ---------- Gatos ---------- */
const cats = [
  { id: 'gris', name: 'Michi', emoji: '🐱', desc: 'El clásico atigrado', colors: { fur: 0x9a9ea8, dark: 0x4d5058, white: 0xffffff, eye: 0x8fd14f } },
  { id: 'naranja', name: 'Mango', emoji: '🐈', desc: 'Naranja y sin miedo', colors: { fur: 0xf28c28, dark: 0xb85f10, white: 0xfff1e0, eye: 0x8fd14f } },
  { id: 'negro', name: 'Sombra', emoji: '🐈‍⬛', desc: 'Negro de ojos amarillos', colors: { fur: 0x2a2a33, dark: 0x15151a, white: 0x2a2a33, eye: 0xffd23f } }
];
let cat = null, catDef = cats[0];
function setCat(id) {
  catDef = cats.find(c => c.id === id) || cats[0];
  store.set('catRunCat', catDef.id);
  if (cat) scene.remove(cat);
  cat = catDef.build ? catDef.build(game) : makeCat(catDef.colors);
  cat.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(cat);
  refreshMenu();
  emit('cat', catDef);
  if (cur) place(0);
}
const dog = makeDog();
dog.traverse(o => { if (o.isMesh) o.castShadow = true; });
scene.add(dog);

/* ---------- Calle procedural: tramos rectos que terminan en un cruce con calles laterales ---------- */
function addObstacle(seg, type, s, lane, y = 0) {
  const g = spawn(type);
  g.position.set(lane * LANE, y, -s);
  seg.g.add(g);
  const o = { type, s, x: lane * LANE, mesh: g, hit: false, ...SPEC[type], yb: y };
  o.y0 += y; o.y1 += y;
  if (type === 'senora') { o.w = rand(.7, 1.2); o.ph = rand(0, 6); }
  seg.obs.push(o);
  return o;
}
// Cada fila de obstáculos: make(seg, s, lanes) con lanes = los tres carriles barajados. El peso se puede cambiar por mundo (rowWeights).
const ROWS = [
  { id: 'valla', weight: 22, make: (seg, s, lanes) => lanes.slice(0, pick([1, 2, 2, 3])).forEach(l => addObstacle(seg, 'valla', s, l)) },
  { id: 'alcantarilla', weight: 16, make: (seg, s, lanes) => lanes.slice(0, pick([1, 2])).forEach(l => addObstacle(seg, 'alcantarilla', s, l)) },
  { id: 'carro', weight: 12, make: (seg, s, lanes) => lanes.slice(0, pick([1, 2])).forEach(l => addObstacle(seg, 'carro', s, l)) },
  { id: 'bus', weight: 8, make: (seg, s, lanes) => addObstacle(seg, 'bus', s + 2, lanes[2]) },
  { id: 'senora', weight: 12, make: (seg, s) => addObstacle(seg, 'senora', s, 0) },
  { id: 'carreta', weight: 8, make: (seg, s) => addObstacle(seg, 'carreta', s, pick([-1, 1])) },
  { id: 'caja', weight: 12, make: (seg, s, lanes) => lanes.slice(0, pick([1, 2])).forEach(l => addObstacle(seg, pick(['caja', 'basura']), s, l)) },
  { id: 'cinta', weight: 6, make: (seg, s) => addObstacle(seg, 'cinta', s, 0) },
  // rampa + tarima: arriba no hay obstáculos y hay monedas y pescado; abajo, por ese carril, no se pasa
  { id: 'tarima', weight: 11, make: (seg, s, lanes) => {
    if (s + 20 > seg.L - 30) return;
    const l = lanes[2];
    addObstacle(seg, 'rampa', s + 2.5, l); addObstacle(seg, 'tarima', s + 12, l);
    for (let k = 0; k < 5; k++) addObstacle(seg, 'moneda', s + 7 + k * 2.2, l, 2.2);
    addObstacle(seg, 'pescado', s + 18, l, 2.2);
  } },
  { id: 'libre', weight: 4, make() {} }
];
function pickRow() {
  const rw = W('rowWeights'), weight = r => rw[r.id] ?? r.weight;
  let t = Math.random() * ROWS.reduce((a, r) => a + weight(r), 0);
  for (const r of ROWS) if ((t -= weight(r)) <= 0) return r;
  return ROWS[ROWS.length - 1];
}
// entre obstáculos: una fila de monedas y un grupito de ratones en otro carril
function defaultFill(seg, s, gap, lanes) {
  const n = Math.min(7, Math.floor((gap - 11) / 2.4));
  for (let k = 0; k < n; k++) addObstacle(seg, 'moneda', s + 8 + k * 2.4, lanes[0]);
  for (const l of seg.bonus ? lanes.slice(1) : lanes.slice(1, 2)) for (let k = 0; k < 3; k++) addObstacle(seg, 'raton', s + 9 + k * 2.6, l);
}
function populate(seg, first) {
  let s = first ? 50 : 34;
  while (s < seg.L - 36) {
    const lanes = [-1, 0, 1].sort(() => Math.random() - .5), gap = rand(...cfg.rowGap) + S.speed * .35;
    pickRow().make(seg, s, lanes);
    (world.fill || game.fill)(seg, s, gap, lanes);
    s += gap;
  }
}
function block(g, x, z, sx, sz) {
  const i = pick(W('heights')), h = (i + 2) * 3.2;
  part(BOX, worldMats().facades[i], sx, h, sz, x, h / 2, z, g).userData.tint = new THREE.Color(pick(W('tints')));
  part(BOX, W('roof'), sx + 1.6, .45, sz + .3, x, h + .22, z, g); // alero
}
function defaultSide(st, seg, side, s0, end) {
  let s = s0;
  while (s < end - .1) {
    let w = pick([10, 12, 14]);
    if (end - s - w < 8) w = end - s;
    block(st, side * (HALF + DEPTH / 2), -(s + w / 2), DEPTH, w);
    part(BOX, pick(W('zocalos')), .16, 1, w, side * (HALF + .02), .7, -(s + w / 2), st); // zócalo pintado
    if (Math.random() < .35) part(BOX, pick(W('awnings')), 1.5, .2, w - 2, side * (HALF - .7), 3.1, -(s + w / 2), st); // toldo
    else if (W('flowers')) for (let k = 0; k < 2; k++) { // materas con flores
      const z = -(s + w * (.3 + k * .4));
      part(CYL, 0xb5653a, .5, .5, .5, side * 7.1, .45, z, st);
      part(SPH, pick([0xe8456b, 0xffb020, 0xd94fd0]), .6, .5, .6, side * 7.1, .85, z, st);
    }
    s += w;
  }
  if (W('trees')) for (let t = Math.max(s0, 12) + (side > 0 ? 11 : 0); t < end - 4; t += 22) {
    part(CYL, 0x6b4a2f, .3, 2.2, .3, side * 5.3, 1.3, -t, st);
    part(SPH, 0x3f9a4f, 2.3, 2, 2.3, side * 5.3, 3.3, -t, st);
    part(SPH, 0x57b862, 1.6, 1.5, 1.6, side * 5.3 + .3, 4.3, -t - .2, st);
  }
  if (W('lamps')) for (let t = Math.max(s0, 12) + (side > 0 ? 0 : 22); t < end - 4; t += 44) {
    part(CYL, 0x4a4f5c, .16, 5.6, .16, side * 7, 3, -t, st);
    part(BOX, 0x4a4f5c, 1.8, .12, .12, side * 6.2, 5.8, -t, st);
    part(BOX, 0xfff2a8, .6, .16, .35, side * 5.4, 5.7, -t, st);
  }
}
function buildSegment(origin, yaw, first) {
  const L = first ? 180 : rand(165, 230), r = Math.random();
  const seg = {
    origin, yaw, L, first: !!first, obs: [], exits: {}, g: new THREE.Group(), world,
    sides: world.tunnel ? [] : r < .35 ? [-1] : r < .7 ? [1] : [-1, 1], // calles laterales: -1 izquierda, 1 derecha
    bonus: !first && Math.random() < .35,
    dir: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)),
    right: new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
  };
  seg.g.position.copy(origin); seg.g.rotation.y = yaw;
  const st = new THREE.Group(), s0 = first ? -40 : HALF, end = L - HALF, len = end - s0, mid = -(s0 + len / 2);

  const roadGeo = new THREE.PlaneGeometry(9, len), uv = roadGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 8);
  roadGeo.rotateX(-Math.PI / 2);
  const road = new THREE.Mesh(roadGeo, worldMats().road);
  road.position.set(0, 0, mid);
  st.add(road);
  part(BOX, W('sidewalk'), 3, .3, len, -6, .05, mid, st);
  part(BOX, W('sidewalk'), 3, .3, len, 6, .05, mid, st);

  // cruce con pasos de cebra
  part(BOX, W('crossing'), 15, .1, 15, 0, -.05, -L, st);
  if (!world.tunnel) for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) {
    part(BOX, 0xf0f0f0, 1, .03, 2.4, x, .015, -(L - 5.6), st);
    part(BOX, 0xf0f0f0, 1, .03, 2.4, x, .015, -(L + 5.6), st);
    for (const d of seg.sides) part(BOX, 0xf0f0f0, 2.4, .03, 1, d * 5.6, .015, -(L + x), st);
  }
  for (const side of [-1, 1]) {
    if (world.tunnel) { world.side(st, seg, side, first ? s0 : HALF + DEPTH, L + HALF + DEPTH, game); continue; } // pared continua
    (world.side || defaultSide)(st, seg, side, first ? s0 : HALF + DEPTH, end, game);
    block(st, side * (HALF + DEPTH / 2), -(L + HALF + DEPTH / 2), DEPTH, DEPTH); // esquina del fondo
    if (!seg.sides.includes(side)) block(st, side * (HALF + DEPTH / 2), -L, DEPTH, 15); // lado sin calle
  }
  world.decorate?.(st, seg, game);

  seg.geos = bake(st).map(({ geometry, material }) => {
    const m = new THREE.Mesh(geometry, material);
    m.receiveShadow = true;
    seg.g.add(m);
    return geometry;
  });
  populate(seg, first);
  scene.add(seg.g);
  emit('segment', seg);
  return seg;
}
const endOf = seg => seg.origin.clone().addScaledVector(seg.dir, seg.L);
function openExits(seg) {
  for (const d of [0, ...seg.sides]) seg.exits[d] = buildSegment(endOf(seg), seg.yaw - d * Math.PI / 2);
}
function removeSegment(seg) {
  emit('segmentRemoved', seg);
  scene.remove(seg.g);
  seg.geos.forEach(g => g.dispose());
}

/* ---------- Partida ---------- */
let prev = null, cur = null, overAt = 0, camYaw = 0, flying = [];

// Submundo (el drenaje): la calle queda guardada y oculta mientras se corre por otro lado
let sub = null;
function enterSub(w) {
  if (sub || S.state !== 'play') return;
  sub = { world, prev, cur, s: p.s, x: p.x, lane: p.lane, yaw: p.yaw, camYaw };
  for (const s of [prev, cur, ...Object.values(cur.exits)]) if (s) s.g.visible = false;
  applyWorld(w);
  prev = null;
  cur = buildSegment(new THREE.Vector3(sub.cur.origin.x + 4000, 0, sub.cur.origin.z + 4000), 0, true);
  openExits(cur);
  Object.assign(p, { s: 0, x: p.lane * LANE, yaw: 0, y: 5, gy: 0, vy: 0, fall: 0, turnQ: 0, inv: 1, slide: 0 });
  camYaw = 0;
  dog.visible = false; // Panela no cabe por la alcantarilla
  emit('sub', w);
}
function exitSub() {
  if (!sub) return;
  [prev, cur, ...Object.values(cur.exits)].forEach(s => s && removeSegment(s));
  ({ prev, cur } = sub);
  for (const s of [prev, cur, ...Object.values(cur.exits)]) if (s) s.g.visible = true;
  Object.assign(p, { s: sub.s + 5, x: sub.x, lane: sub.lane, yaw: sub.yaw, y: .01, gy: 0, vy: 9, fall: 0, turnQ: 0, inv: 1.5, slide: 0 });
  camYaw = sub.camYaw;
  S.dogGap = cfg.gapMax; // le sacó ventaja
  dog.visible = true;
  const w = sub.world;
  sub = null;
  applyWorld(w);
  emit('sub', null);
}
function reset() {
  if (sub) { // la partida terminó abajo: se bota la calle guardada y se vuelve al mundo de arriba
    [sub.prev, sub.cur, ...Object.values(sub.cur.exits)].forEach(s => s && removeSegment(s));
    const w = sub.world;
    sub = null; dog.visible = true;
    [prev, cur, ...Object.values(cur.exits)].forEach(s => s && removeSegment(s));
    cur = prev = null;
    applyWorld(w);
  }
  if (cur) [prev, cur, ...Object.values(cur.exits)].forEach(s => s && removeSegment(s));
  Object.assign(S, { paused: false, time: 0, dist: 0, mice: 0, coins: 0, health: 100, speed: cfg.baseSpeed, speedMul: 1,
    shake: 0, dogGap: cfg.gapMax, dogOff: 0, dieT: 0, score: 0, won: false });
  camYaw = 0; flying = [];
  Object.assign(p, { s: 0, x: 0, lane: 0, y: 0, gy: 0, vy: 0, h: 1.3, slide: 0, fall: 0, inv: 0, slow: 1, yaw: 0, turnQ: 0, lastDir: 0, lastT: 0, air: 0 });
  prev = null;
  cur = buildSegment(new THREE.Vector3(), 0, true);
  openExits(cur);
  cat.visible = true;
  hud();
  place(0);
}
function start() {
  if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  reset();
  $('menu').hidden = $('over').hidden = true;
  S.state = 'play';
  emit('start');
}
function showMenu() {
  S.state = 'menu';
  $('over').hidden = true; $('menu').hidden = false;
  reset();
}

/* ---------- Sonido ---------- */
let ac;
function sfx(f, d = .1, type = 'square', vol = .07, slide = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.value = f;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(ac.destination);
  o.start(); o.stop(t + d);
}
const bark = () => { sfx(180, .12, 'sawtooth', .12, -90); setTimeout(() => sfx(160, .14, 'sawtooth', .12, -90), 150); };

/* ---------- Controles ---------- */
function move(dir) {
  const now = performance.now(), dbl = p.lastDir === dir && now - p.lastT < 380, toCross = cur.L - p.s;
  p.lastDir = dir; p.lastT = now;
  // entrar a la calle lateral: doble toque al acercarse, o empujar contra el borde ya en el cruce
  if (cur.exits[dir] && toCross > -3 && ((dbl && toCross < 60) || (toCross < 30 && p.lane === dir))) return void turn(dir);
  const lane = clamp(p.lane + dir, -1, 1);
  if (lane !== p.lane) { p.lane = lane; emit('lane', dir); }
}
// pide girar hacia una calle lateral (lo usan el doble toque y los botones GIRAR)
function turn(dir) {
  const toCross = cur.L - p.s;
  if (S.state !== 'play' || S.paused || !cur.exits[dir] || toCross < -3 || toCross > 60) return;
  p.turnQ = dir;
  sfx(700, .08, 'triangle');
}
function jump() {
  if (p.fall > 0) return;
  if (p.y > p.gy + .01) { if (p.air >= cfg.airJumps) return; p.air++; }
  p.vy = cfg.jumpV; p.slide = 0;
  if (p.y <= p.gy) p.y = p.gy + .001;
  sfx(420, .15, 'square', .06, 300);
  emit('jump', { air: p.air });
}
function slide() {
  if (p.y > p.gy + .01) p.vy = -18;
  p.slide = cfg.slideTime;
  sfx(200, .15, 'sawtooth', .04, -80);
  emit('slide');
}
function anyKeyStart() {
  if (flags.customMenu) return S.state !== 'play';
  if (S.state === 'menu' || (S.state === 'over' && performance.now() - overAt > 700)) { start(); return true; }
  return S.state !== 'play';
}
function setPaused(v) { S.paused = v; emit('pause', v); }
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Enter') e.target.blur(); return; }
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (S.state !== 'play') { if (k === ' ' || k === 'enter') anyKeyStart(); return; }
  if (k === 'p' || k === 'escape') setPaused(!S.paused);
  else if (S.paused) return;
  else if (k === 'arrowleft' || k === 'a') move(-1);
  else if (k === 'arrowright' || k === 'd') move(1);
  else if (k === 'arrowup' || k === 'w' || k === ' ') jump();
  else if (k === 'arrowdown' || k === 's') slide();
  else if (k === 'e' || k === 'shift') emit('ability');
});
let touch = null;
$('pause').addEventListener('click', () => { if (S.state === 'play') setPaused(!S.paused); });
$('hl').addEventListener('click', () => turn(-1));
$('hr').addEventListener('click', () => turn(1));
window.addEventListener('pointerdown', e => {
  const w = e.target.closest('[data-world]'), c = e.target.closest('[data-cat]');
  if (w) return setWorld(w.dataset.world);
  if (c) return setCat(c.dataset.cat);
  if (e.target.closest('button, input, a, select, [data-ui]')) return; // interfaz propia o de un módulo
  if (anyKeyStart() || S.paused) return;
  touch = { x: e.clientX, y: e.clientY, used: false };
});
window.addEventListener('pointermove', e => {
  if (!touch || touch.used) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  touch.used = true;
  if (Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? -1 : 1);
  else dy < 0 ? jump() : slide();
});
window.addEventListener('pointerup', e => {
  if (touch && !touch.used && S.state === 'play') move(e.clientX < window.innerWidth / 2 ? -1 : 1);
  touch = null;
});

/* ---------- Menú y puntajes ---------- */
function refreshMenu() {
  const fill = (id, list, attr, sel) => $(id)?.replaceChildren(...list.map(it => {
    const b = document.createElement('button');
    b.dataset[attr] = it.id;
    b.textContent = `${it.emoji || ''} ${it.name}`;
    b.title = it.desc || '';
    b.setAttribute('aria-pressed', it === sel);
    return b;
  }));
  fill('worlds', worlds, 'world', world);
  fill('catsel', cats, 'cat', catDef);
}
// mejores puntajes de este dispositivo
let top = store.get('catRunTop', []), entry = null, playerName = store.get('catRunName', '');
function renderTop() {
  $('rank').replaceChildren(...top.map(e => {
    const li = document.createElement('li');
    li.textContent = `${e.n || 'Gato anónimo'} — ${e.s}`;
    if (e === entry) li.className = 'me';
    return li;
  }));
}
$('name').addEventListener('input', e => {
  playerName = e.target.value.trim();
  if (entry) entry.n = playerName;
  store.set('catRunTop', top); store.set('catRunName', playerName);
  renderTop();
});
$('share').addEventListener('click', () => {
  const text = `🐈‍⬛ Hice ${S.score} puntos con Tinto escapando de Panela. ¿Me ganas?`, url = location.href;
  if (navigator.share) navigator.share({ title: 'Tinto', text, url }).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank');
});

/* ---------- Juego ---------- */
function hud() {
  $('fill').style.width = Math.max(0, S.health) + '%';
  $('fill').style.background = S.health > 55 ? 'var(--good)' : S.health > 28 ? 'var(--accent)' : 'var(--bad)';
  $('danger').style.opacity = clamp(1 - S.health / 70, 0, 1);
  $('mice').textContent = S.mice;
  $('coins').textContent = S.coins;
  $('dist').textContent = Math.floor(S.dist) + ' m';
  emit('hud');
}
function hints(toCross) {
  for (const [id, d] of [['hl', -1], ['hr', 1]]) {
    const near = S.state === 'play' && cur.exits[d] && toCross < 60 && toCross > -3;
    $(id).className = 'hint' + (near ? (p.turnQ === d ? ' sel' : p.turnQ ? '' : ' on') : '');
  }
}
// o: { dmg, type, fly?, mesh? }
function damage(o) {
  for (const fn of hooks.damage) if (fn(o) === false) return false;
  S.health -= o.dmg;
  p.inv = cfg.invuln; p.slow = cfg.hitSlow; S.shake = .45;
  S.dogGap = Math.max(1.8, S.dogGap - 1.5); // el perro aprovecha el tropiezo
  sfx(110, .25, 'sawtooth', .12, -60);
  if (!sub) bark();
  const pum = $('pum');
  pum.textContent = pick(['¡PUM!', '¡CRASH!', '¡AUCH!']);
  pum.className = ''; void pum.offsetWidth; pum.className = 'on';
  if (o.type === 'alcantarilla') p.fall = .5;
  if (o.fly && o.mesh) flying.push({ mesh: o.mesh, t: .7 });
  emit('hit', o);
  if (S.health <= 0) { S.health = 0; S.state = 'dying'; S.dieT = 0; dog.visible = true; emit('dying'); }
  hud();
  return true;
}
function collect(o) {
  if (o.hit) return;
  o.hit = true;
  if (!o.keep) flying.push({ mesh: o.mesh, t: .3, coin: true });
  if (o.type === 'raton' || o.food) { S.mice++; S.health = Math.min(100, S.health + (o.food || cfg.mouseHeal)); sfx(1500, .09, 'triangle', .08, 600); }
  else if (o.type === 'moneda') { S.coins++; sfx(880 + (S.coins % 6) * 90, .07, 'square', .05); }
  emit('collect', o);
  hud();
}
// Altura del piso bajo el gato. Las tarimas (SPEC.top) se pisan si se llega desde arriba o por una rampa (SPEC.ramp).
function floorAt(x, s, fromY) {
  let g = 0;
  for (const o of cur.obs) {
    if (!o.top || Math.abs(o.x - x) > o.hw + .2 || s < o.s - o.hl || s > o.s + o.hl) continue;
    const h = o.ramp ? o.top * clamp((s - (o.s - o.hl)) / (2 * o.hl), 0, 1) : o.top;
    if ((o.ramp || h <= fromY + .45) && h > g) g = h; // la rampa siempre levanta; a la tarima solo se entra desde arriba
  }
  return g;
}
// d: 0 sigue derecho, -1 entra a la izquierda, 1 a la derecha
function choose(d) {
  const chosen = cur.exits[d];
  if (d) {
    const ns = d * p.x, nx = -d * (p.s - cur.L);
    p.s = ns; p.x = nx; p.lane = clamp(Math.round(nx / LANE), -1, 1);
  } else p.s -= cur.L;
  for (const e of Object.values(cur.exits)) if (e !== chosen) removeSegment(e);
  if (prev) removeSegment(prev);
  prev = cur; cur = chosen; p.turnQ = 0;
  openExits(cur);
  emit('turn', { dir: d, seg: cur });
}
function update(dt) {
  S.time += dt;
  emit('update', dt);
  if (S.state !== 'play') return;
  S.speed = Math.min(cfg.maxSpeed, cfg.baseSpeed + S.time * cfg.accel) * S.speedMul;
  p.slow += (1 - p.slow) * Math.min(1, dt * 1.2);
  const v = S.speed * p.slow, oldX = p.x, oldY = p.y, wasAir = p.y > p.gy + .01;
  let prevS = p.s;
  p.s += v * dt; S.dist += v * dt;
  p.x += (p.lane * LANE - p.x) * Math.min(1, dt * cfg.laneSnap);
  S.dogOff = (S.dogOff - (p.x - oldX)) * Math.max(0, 1 - dt * 5); // el perro tarda en cambiar de carril
  p.inv -= dt;
  if (p.fall > 0) { p.fall -= dt; p.y = p.fall > 0 ? -1.6 * Math.sin(p.fall / .5 * Math.PI) : 0; p.vy = 0; }
  else {
    p.vy -= cfg.gravity * dt; p.y += p.vy * dt;
    p.gy = floorAt(p.x, p.s, oldY);
    if (p.y <= p.gy) { p.y = p.gy; p.vy = 0; p.air = 0; if (wasAir) emit('land'); }
  }
  if (p.slide > 0) p.slide -= dt;
  p.h = p.slide > 0 ? .5 : 1.3;

  const toCross = cur.L - p.s;
  if (p.turnQ && toCross <= 1.5) { choose(p.turnQ); prevS = p.s; }
  else if (toCross < -HALF) { choose(0); prevS = p.s; }
  hints(cur.L - p.s);

  for (const o of cur.obs) {
    if (o.hit || o.s < prevS - o.hl - .5 || o.s > p.s + o.hl + .5) continue;
    if (o.top && (o.ramp || p.y >= o.top - .45)) continue; // por la rampa se sube; sobre la tarima se camina
    if (Math.abs(o.x - p.x) > o.hw + .4 || p.y >= o.y1 || p.y + p.h <= o.y0) continue;
    if (o.collect) collect(o);
    else if (p.inv <= 0) { o.hit = true; damage(o); }
    if (S.state !== 'play') return;
  }
  if (prev && p.s > 50) { removeSegment(prev); prev = null; }

  // el perro siempre se ve detrás; más cerca cuanta menos vida
  const gapTarget = cfg.gapMin + S.health / 100 * (cfg.gapMax - cfg.gapMin);
  S.dogGap += (gapTarget - S.dogGap) * Math.min(1, dt * (gapTarget > S.dogGap ? .7 : 3));
  if (Math.floor(S.dist / 10) !== Math.floor((S.dist - v * dt) / 10)) hud();
}
// termina la partida ya mismo (lo usan los niveles para ganar o cortar)
function end({ won = false } = {}) {
  S.state = 'over'; S.won = won; overAt = performance.now();
  S.score = Math.floor(S.dist) + S.coins * cfg.scoreCoin + S.mice * cfg.scoreMouse;
  entry = { n: playerName, s: S.score };
  top = [...top, entry].sort((a, b) => b.s - a.s).slice(0, 5);
  store.set('catRunTop', top);
  renderTop();
  $('name').value = playerName;
  $('overTitle').innerHTML = won ? '¡Nivel <span>superado</span>!' : '¡Panela te <span>alcanzó</span>!';
  $('final').textContent = `${S.coins} 🐾 · ${S.mice} 🐭 · ${Math.floor(S.dist)} m`;
  $('best').textContent = `${S.score} puntos${top[0] === entry ? ' · ¡nuevo récord!' : ''}`;
  $('over').hidden = false;
  hints(0);
  emit('over', { won, score: S.score, dist: S.dist, coins: S.coins, mice: S.mice });
}
function updateDying(dt) {
  S.dieT += dt;
  p.slow *= Math.max(0, 1 - dt * 4);
  p.s += S.speed * p.slow * dt;
  p.y = Math.max(0, p.y - dt * 6);
  S.dogGap += (.5 - S.dogGap) * Math.min(1, dt * 5);
  S.dogOff *= Math.max(0, 1 - dt * 8);
  hints(0);
  if (S.dieT > 1.3) end();
}
const pos = new THREE.Vector3(), fwd = new THREE.Vector3(), sideV = new THREE.Vector3(), look = new THREE.Vector3();
let phase = 0;
function place(dt) {
  const k = dt ? 1 : 1e9;
  for (const seg of [cur, ...Object.values(cur.exits)]) for (const o of seg.obs) {
    if (o.hit) continue;
    if (o.type === 'senora') { o.x = Math.sin(S.time * o.w + o.ph) * 4.2; o.mesh.position.x = o.x; o.mesh.rotation.y = Math.cos(S.time * o.w + o.ph) > 0 ? -1.57 : 1.57; }
    else if (o.type === 'moneda') o.mesh.rotation.y = S.time * 4 + o.s;
    else if (o.type === 'raton') { o.mesh.position.y = o.yb + Math.abs(Math.sin(S.time * 6 + o.s)) * .3; o.mesh.rotation.y = Math.sin(S.time * 4 + o.s) * .5; }
    else if (o.animate) o.animate(o, S.time, dt);
  }
  for (const f of flying) {
    f.t -= dt;
    if (f.coin) { f.mesh.position.y += dt * 9; f.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 6)); f.mesh.rotation.y += dt * 20; }
    else { f.mesh.position.z -= dt * S.speed * 1.1; f.mesh.position.y += dt * 4; f.mesh.rotation.x -= dt * 7; }
    if (f.t <= 0) f.mesh.visible = false;
  }
  flying = flying.filter(f => f.t > 0);

  p.yaw += (cur.yaw - p.yaw) * Math.min(1, dt * 12 * k);
  camYaw += (cur.yaw - camYaw) * Math.min(1, dt * 6 * k);
  pos.copy(cur.origin).addScaledVector(cur.dir, p.s).addScaledVector(cur.right, p.x);

  phase = S.dist * 1.1;
  cat.position.set(pos.x, p.y, pos.z);
  cat.rotation.set(0, p.yaw, 0);
  const body = cat.userData.body;
  if (body) {
    const air = p.y > p.gy + .01;
    body.scale.y = p.slide > 0 && !air ? .5 : 1;
    body.rotation.x = air ? clamp(p.vy * .03, -.4, .4) : 0;
  }
  cat.visible = p.inv <= 0 || S.state !== 'play' || Math.floor(p.inv * 14) % 2 === 0;
  runCycle(cat, phase * 1.6, p.y > p.gy + .01 ? .3 : .9);

  fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  sideV.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  const leap = S.state === 'dying' ? Math.sin(Math.min(1, S.dieT / .6) * Math.PI) * 1.6 : Math.abs(Math.sin(phase * .8)) * .18;
  dog.position.copy(pos).addScaledVector(fwd, -S.dogGap).addScaledVector(sideV, S.dogOff).setY(leap);
  dog.rotation.set(0, p.yaw, 0);
  runCycle(dog, phase * 1.1, 1);

  fwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  S.shake = Math.max(0, S.shake - dt);
  camera.position.copy(pos).addScaledVector(fwd, -(S.dogGap + view.back));
  camera.position.x += (Math.random() - .5) * S.shake;
  // cuando Panela se acerca, la cámara sube para seguir viendo a Tinto por encima de ella
  camera.position.y = view.h + Math.max(0, cfg.gapMax - S.dogGap) * .55 + (Math.random() - .5) * S.shake;
  camera.lookAt(look.copy(pos).addScaledVector(fwd, 9).setY(1));
  if (S.state === 'menu') { // en el menú, primer plano de Tinto de frente, con Panela al fondo
    const tall = camera.aspect < 1; // el menú deja una ventana bajo el título: se apunta más abajo para que Tinto quede ahí
    camera.position.copy(pos).addScaledVector(fwd, tall ? 4.2 : 3.8).addScaledVector(sideV, tall ? 2.3 : 2.2).setY(1.4);
    camera.lookAt(look.copy(pos).setY(tall ? .45 : .3));
  }
  ground.position.set(pos.x, -.2, pos.z);
  backdrop.position.set(pos.x, 0, pos.z);
  sun.position.set(pos.x + 9, 20, pos.z + 7);
  sun.target.position.copy(pos);
}
// un cuadro completo; game.step(dt) lo llama a mano para pruebas sin esperar al navegador
function frame(dt, draw = true) {
  $('pause').textContent = S.paused ? '▶' : 'II';
  $('top').style.visibility = S.state === 'menu' ? 'hidden' : 'visible'; // en el menú el marcador estorba al logotipo
  if (!S.paused) {
    if (S.state === 'play') update(dt);
    else if (S.state === 'dying') updateDying(dt);
    place(S.state === 'play' || S.state === 'dying' ? dt : 0);
  }
  emit('frame', { dt: S.paused ? 0 : dt, phase });
  if (draw) renderer.render(scene, camera);
}
// simula n cuadros sin dibujar (rápido); each(i) puede dar órdenes entre cuadros
function sim(n, each) {
  for (let i = 0; i < n; i++) { each?.(i); frame(1 / 60, false); }
}
let last = 0;
function tick(t) {
  requestAnimationFrame(tick);
  const dt = clamp((t - last) / 1000 || 0, 0, .05);
  last = t;
  frame(dt);
}

/* ---------- API para los módulos ---------- */
export const game = {
  THREE, scene, camera, renderer, sun, hemi, view, geo, LANE, HALF, DEPTH,
  part, bake, mat, canvasTex, stripes, leg, makeCat, makeDog, runCycle, rand, pick, clamp,
  BUILD, SPEC, VARIANTS, ROWS, spawn, addObstacle, block, defaultSide, defaultFacade, defaultRoad, fill: defaultFill,
  worlds, WORLD_DEFAULTS, setWorld, cats, setCat, refreshMenu,
  cfg, S, p, hooks, flags, store, on, emit, sfx, bark,
  start, reset, end, showMenu, enterSub, exitSub, applyWorld, damage, collect, hud, setPaused, step: frame, sim,
  input: { move, jump, slide, turn },
  ui: { hud: $('hud'), menu: $('menu'), over: $('over'), top: $('top') },
  get world() { return world; }, get cat() { return cat; }, get catDef() { return catDef; }, dog,
  get cur() { return cur; }, get sub() { return sub; }, get prev() { return prev; }, get phase() { return phase; }, get pos() { return pos; }
};
window.game = game;

setCat(store.get('catRunCat', 'gris'));
setWorld('dia');
reset();
// ?solo=fx carga un único módulo (para probarlo aislado); ?solo=ninguno carga solo el núcleo
const solo = new URLSearchParams(location.search).get('solo');
for (const name of ['worlds', 'sewer', 'cats', 'models', 'fx', 'levels'].filter(n => !solo || n === solo)) {
  try { (await import(`./${name}.js?v=${Date.now()}`)).install(game); } // la marca de tiempo evita que el navegador use una copia vieja
  catch (e) { if (!/Failed to fetch dynamically imported/i.test(String(e))) console.error(`[módulo ${name}]`, e); }
}
setCat(store.get('catRunCat', cats[0].id));
setWorld(worlds.includes(world) ? world.id : worlds[0].id);
emit('ready');
requestAnimationFrame(tick);
