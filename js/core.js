// Núcleo de Tinto. Los módulos de js/ (worlds, sewer, cats, models, fx, levels, stats) se enchufan con install(game).
// El contrato completo está en AGENTES.md. Las reglas (los números) viven en js/rules.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rules } from './rules.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LANE = 3, HALF = 7.5, DEPTH = 10; // carril, media calle (con andenes), fondo de edificios

/* ---------- Eventos, reglas y estado ---------- */
const listeners = {};
const on = (name, fn) => { (listeners[name] ||= []).push(fn); };
function emit(name, data) {
  for (const fn of listeners[name] || []) try { fn(data); } catch (e) { console.error(`[evento ${name}]`, e); }
}
const hooks = { damage: [] }; // damage: fn(o) → false cancela el golpe (o.lethal dice si iba a ser captura)
const flags = { customMenu: false, cameraOwner: false }; // customMenu: un módulo maneja menú y reinicio; cameraOwner: un módulo mueve la cámara
const cfg = rules.cfg; // vista de solo lectura de las reglas vigentes
// Estado de la partida. Solo el núcleo lo escribe; los módulos lo leen y piden cambios por función (damage, collect, racha, invuln…).
const S = { state: 'menu', paused: false, time: 0, dist: 0, mice: 0, coins: 0, speed: 15, speedMul: 1, shake: 0, dogGap: 8.5, dogOff: 0, dieT: 0, score: 0, won: false,
  danger: 0, bocado: 0, bocados: 0, canecas: 0, heat: 0, chase: 0, stumbles: 0, cause: '', hardCause: false, health: 100,
  racha: 0, mult: 1, bonus: 0, nearmiss: 0, passes: 0, lastCaneca: -1, rescued: false, rescueT: 0, multBest: 1 };
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
const view = { back: 6, h: 6.8, fov: 62 };
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
  [-.32, 0, .3].forEach(z => part(BALL, dark, .66, .5, .11, 0, .77, z, b));
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
  part(BALL, W, .55, .4, 1, 0, 1.4, -.15, b);
  part(BALL, B, 1, .9, .9, 0, 1.68, -1.1, b);
  part(BALL, W, .3, .93, .93, 0, 1.68, -1.1, b);
  part(BALL, W, .66, .46, .55, 0, 1.5, -1.5, b);
  part(BALL, 0x111111, .22, .16, .16, 0, 1.6, -1.77, b);
  part(BOX, W, .36, .09, .1, 0, 1.33, -1.7, b);
  for (const x of [-1, 1]) {
    part(BALL, D, .22, .55, .42, x * .5, 1.62, -1.02, b).rotation.z = x * .35;
    part(BALL, W, .2, .2, .12, x * .22, 1.84, -1.48, b);
    part(BALL, 0x111111, .1, .1, .08, x * .22, 1.83, -1.53, b);
    part(BOX, D, .26, .07, .08, x * .22, 1.96, -1.5, b).rotation.z = x * .45;
  }
  part(CYL, 0xd01828, 1, .2, .92, 0, 1.33, -.76, b).rotation.x = Math.PI / 2;
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

/* ---------- Obstáculos: modelos ---------- */
const CAR_COLORS = [0xf2c230, 0xd8433b, 0xf2f2f2];
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
    part(BOX, 0xd9dde4, 2.2, .06, 9, 0, .18, 0, g); // franja clara del hueco: por debajo se pasa agachado
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
    part(BOX, 0xd9dde4, 1.8, .05, 4, 0, .12, 0, g); // franja clara del hueco
  },
  senora(g, v) {
    if (v % 3 === 0) {
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
  },
  // --- piezas nuevas, genéricas de calle y obra (modelos sencillos; otro agente los hará en Blender) ---
  contenedor(g) { // contenedor de obra: muro macizo de un carril
    part(BOX, 0xe0702a, 2.4, 2.2, 3.4, 0, 1.3, 0, g);
    part(BOX, 0xb85a1e, 2.5, .25, 3.5, 0, 2.5, 0, g);
    for (const z of [-1.2, 0, 1.2]) part(BOX, 0xb85a1e, 2.46, 2.1, .12, 0, 1.3, z, g);
    part(BOX, hazardMat, 2.2, .35, .06, 0, .55, -1.72, g);
    part(BOX, 0x6a4a3a, 1.8, .2, 2.6, 0, .1, 0, g);
  },
  bolsas(g) { // muro blando: ni se salta ni se pasa por debajo, hay que cambiar de carril.
    // Antes era un montón bajo de bolsas negras que parecía saltable; ahora es una pila alta de cajas con un aviso de cierre.
    for (const [x, y, z, r] of [[-.08, .45, 0, .04], [.1, 1.35, .05, -.07], [-.05, 2.25, -.03, .05]]) {
      const c = part(BOX, 0xb9833f, 2, .88, 1.5, x, y, z, g);
      c.rotation.y = r;
      part(BOX, 0x7a4f22, 2.06, .1, 1.56, x, y + .4, z, g).rotation.y = r;
      part(BOX, 0x7a4f22, 2.06, .1, 1.56, x, y - .4, z, g).rotation.y = r;
    }
    part(BOX, 0xd8232f, 1.7, 1.7, .08, 0, 1.45, .84, g); // tablero rojo de frente al jugador
    part(BOX, 0xffffff, 1.9, .26, .1, 0, 1.45, .88, g).rotation.z = Math.PI / 4; // equis blanca: por aquí no
    part(BOX, 0xffffff, 1.9, .26, .1, 0, 1.45, .88, g).rotation.z = -Math.PI / 4;
  },
  poste(g, v) { // poste caído en diagonal: bajo en un lado, alto en el otro
    const dir = v % 2 ? 1 : -1, L = 9.6, h0 = .35, h1 = 2.5;
    const t = part(CYL, 0x8a6a40, .5, L, .5, 0, (h0 + h1) / 2, 0, g);
    t.rotation.z = dir * (Math.PI / 2 - Math.atan2(h1 - h0, L));
    part(CYL, 0x6b4a2f, .9, 1.1, .9, -dir * 5.4, .5, 0, g);
    part(BOX, 0x333842, .5, .5, .5, dir * 4.6, 2.6, 0, g);
    part(CONE, 0xff6a1f, .5, .9, .5, -dir * 2.8, .45, .7, g); part(CONE, 0xff6a1f, .5, .9, .5, dir * 1.4, .45, -.7, g);
  },
  nada() {},
  zanja(g) { // zanja de obra de dos carriles: hoyo con conos; el tercer carril queda libre
    part(DISC, 0x1b1410, 2.9, 1, 1.5, 0, .03, 0, g);
    part(BOX, 0x9a7a4a, 6, .25, .3, 0, .12, -1.7, g); part(BOX, 0x9a7a4a, 6, .25, .3, 0, .12, 1.7, g);
    for (const x of [-2.5, 2.5]) for (const z of [-1.6, 1.6]) part(CONE, 0xff6a1f, .5, .9, .5, x, .45, z, g);
    part(BOX, hazardMat, 6.2, .25, .08, 0, .9, -1.8, g);
  },
  tuboc(g) { // tubo de concreto acostado: por dentro agachado, por encima saltando
    part(CYL, 0xb9b4a8, 1.9, 8, 1.9, 0, 1, 0, g).rotation.x = Math.PI / 2;
    part(CYL, 0x8d877b, 1.3, 8.1, 1.3, 0, 1, 0, g).rotation.x = Math.PI / 2;
    part(CYL, 0x2a2622, 1.2, 8.2, 1.2, 0, .95, 0, g).rotation.x = Math.PI / 2;
    for (const z of [-3.7, 3.7]) part(CYL, 0xa49e92, 2, .3, 2, 0, 1, z, g).rotation.x = Math.PI / 2;
    part(BOX, 0x6b4a2f, 2.2, .2, .2, 0, .1, -2.5, g); part(BOX, 0x6b4a2f, 2.2, .2, .2, 0, .1, 2.5, g);
  },
  hidrante(g) { // hidrante que abre y cierra un chorro de agua a través del carril
    part(CYL, 0xd8433b, .5, 1.1, .5, 0, .55, 0, g); part(SPH, 0xd8433b, .55, .4, .55, 0, 1.15, 0, g);
    part(CYL, 0xb03030, .3, .3, .3, .35, .8, 0, g).rotation.z = Math.PI / 2;
    part(CYL, 0xb03030, .3, .3, .3, 0, .8, .35, g).rotation.x = Math.PI / 2;
  },
  chorro(g) { part(BOX, 0x8fd8ff, 2.6, 2.2, .5, 0, 1.3, 0, g); part(DISC, 0x6fb7e8, 1.4, 1, .9, 0, .03, 0, g); },
  andamio(g) { // andamio bajo de obra: un tablón a media altura; se pasa agachado
    for (const x of [-1.1, 1.1]) { part(BOX, 0x4a4f5c, .14, 2.3, .14, x, 1.15, -.45, g); part(BOX, 0x4a4f5c, .14, 2.3, .14, x, 1.15, .45, g); }
    part(BOX, 0xc9954f, 2.5, .12, 1.1, 0, 1.35, 0, g);
    part(BOX, 0x4a4f5c, 2.4, .08, .08, 0, 2.25, -.45, g); part(BOX, 0x4a4f5c, 2.4, .08, .08, 0, 2.25, .45, g);
    part(CYL, 0xd8433b, .5, .5, .5, .5, 1.66, 0, g); part(BOX, hazardMat, 2.5, .22, .05, 0, 1.9, -.5, g);
  },
  caneca(g) { // caneca grande volcada: se pasa agachado por dentro
    part(CYL, 0x2f7a4a, 1.5, 3, 1.5, 0, .75, 0, g).rotation.x = Math.PI / 2;
    part(CYL, 0x1d4f30, 1.52, .3, 1.52, 0, .75, -1.4, g).rotation.x = Math.PI / 2;
    part(CYL, 0x1d4f30, 1.52, .3, 1.52, 0, .75, 1.4, g).rotation.x = Math.PI / 2;
    part(CYL, 0x06140a, 1.15, .2, 1.15, 0, .7, 1.55, g).rotation.x = Math.PI / 2; // boca oscura hacia el gato
    part(BOX, 0x35f07a, .5, .06, .6, 0, 1.53, 0, g); // huella pintada encima
    for (const x of [-.22, .22]) part(SPH, 0x35f07a, .16, .06, .16, x, 1.53, -.45, g);
  },
  escalones(g) { // escalones del balcón: cajas apiladas que suben al andén elevado
    for (let k = 0; k < 4; k++) part(BOX, k % 2 ? 0xb9833f : 0xc9954f, 2.4, .55 * (k + 1), 1.25, 0, .275 * (k + 1), 1.9 - k * 1.25, g);
    part(CONE, 0x35f07a, .6, .8, .6, 0, 3.2, 2.5, g);
  },
  balcon(g, v) { // corredor de madera con baranda, pegado a la fachada (largo según variante)
    const L = rules.get('balconyLens')[v % 3];
    part(BOX, 0xc9954f, 2.6, .2, L, 0, 2.1, 0, g);
    part(BOX, 0x8a5a2b, 2.7, .12, L + .1, 0, 1.96, 0, g);
    for (let z = -L / 2 + .3; z <= L / 2; z += 2.6) { part(BOX, 0x7a4f22, .18, 2, .18, -1.2, 1, z, g); part(BOX, 0x7a4f22, .12, 1, .12, -1.2, 2.7, z, g); }
    part(BOX, 0x7a4f22, .1, .1, L, -1.2, 3.2, 0, g); part(BOX, 0x7a4f22, .1, .1, L, -1.2, 2.65, 0, g);
    part(BOX, 0x7a4f22, .1, .1, L, -1.2, .9, 0, g);
  }
};
VARIANTS.poste = 2; VARIANTS.balcon = 3;
// hw/hl: medio ancho y medio largo · y0..y1: altura que ocupa · cell: S bajo (saltar), A alto con hueco (agacharse), X muro (cambiar), M móvil, T temporizado
// hard: choque de frente es captura · move: se mueve de lado (nunca es duro) · full: ocupa los tres carriles · long: ocupa mucho largo · lanes: carriles que cubre
const SPEC = {
  valla: { hw: 1.4, hl: .3, y0: 0, y1: 1, cell: 'S', fly: true },
  basura: { hw: .8, hl: .6, y0: 0, y1: 1, cell: 'S', fly: true },
  caja: { hw: .9, hl: .85, y0: 0, y1: 1.2, cell: 'S', fly: true },
  alcantarilla: { hw: .9, hl: .9, y0: -1, y1: .05, cell: 'S', hole: true, shadow: false },
  carro: { hw: 1.15, hl: 2.1, y0: .55, y1: 2.3, cell: 'A', hard: true },
  bus: { hw: 1.25, hl: 4.5, y0: .6, y1: 3.4, cell: 'A', hard: true, long: true },
  senora: { hw: .5, hl: .5, y0: 0, y1: 2.6, cell: 'M', move: true, fly: true },
  carreta: { hw: 1.1, hl: 1.4, y0: 0, y1: 3, cell: 'X', hard: true },
  cinta: { hw: 5, hl: .2, y0: 1.15, y1: 3, cell: 'A', full: true, fly: true },
  contenedor: { hw: 1.25, hl: 1.8, y0: 0, y1: 2.6, cell: 'X', hard: true },
  bolsas: { hw: 1.1, hl: .85, y0: 0, y1: 2.7, cell: 'X', fly: true },
  poste: { hw: 0, hl: .4, y0: 0, y1: 0, cell: 'W6', full: true, cells: 'SXA', shadow: true },
  nada: { hw: 1.3, hl: .4, y0: 0, y1: .9, cell: 'S', fly: false, shadow: false, ghost: true },
  zanja: { hw: 2.9, hl: 1.5, y0: -1, y1: .05, cell: 'S', hole: true, lanes: 2, shadow: false },
  tuboc: { hw: 1.2, hl: 4, y0: .55, y1: 1.6, top: 1.6, cell: 'A', long: true },
  hidrante: { hw: 1.3, hl: .4, y0: 0, y1: 2.4, cell: 'X', timed: true, fly: false }, // bloquea un carril a ratos: para el generador es un muro
  andamio: { hw: 1.2, hl: .55, y0: .55, y1: 2.3, cell: 'A', fly: true }, // la única celda A blanda de un carril: hace falta en todo mundo
  chorro: { hw: 1.3, hl: .4, y0: 0, y1: 2.4, shadow: false },
  caneca: { hw: .9, hl: 1.6, y0: .55, y1: 1.6, cell: 'A', fly: true, special: true },
  escalones: { hw: 1.25, hl: 2.5, y0: 0, y1: 2.2, top: 2.2, ramp: true, dmg: 0, special: true },
  balcon: { hw: 1.3, hl: 12, y0: 0, y1: 2.2, top: 2.2, dmg: 0, special: true },
  pescado: { hw: 1.1, hl: 1, y0: 0, y1: 1.6, collect: true, food: true, shadow: false },
  raton: { hw: 1.1, hl: 1, y0: 0, y1: 1.4, collect: true, shadow: false },
  moneda: { hw: 1.1, hl: 1, y0: 0, y1: 2.2, collect: true, shadow: false }
};
for (const k in SPEC) if (SPEC[k].dmg === undefined && !SPEC[k].collect) SPEC[k].dmg = 1; // dmg > 0 = hace tropezar (la cantidad ya no importa)
const protos = {};
function spawn(type) {
  const v = Math.floor(Math.random() * 15), key = type + (VARIANTS[type] ? v % VARIANTS[type] : '');
  if (!protos[key]) { const g = new THREE.Group(); BUILD[type](g, v); protos[key] = g.children.length ? bake(g) : []; }
  const g = new THREE.Group();
  for (const { geometry, material } of protos[key]) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = SPEC[type]?.shadow !== false;
    g.add(m);
  }
  g.userData.variant = v;
  return g;
}

/* ---------- Mundos ---------- */
const WORLD_DEFAULTS = {
  sky: ['#3f86dc', '#a9d2f5', '#f5d9b8'], fog: 0xf5d9b8, fogRange: [55, 165], hemi: [0xcfe6ff, 0x8a6f5a, 2.1], sun: [0xffe2b0, 2.4],
  tints: [0xfaf3e3, 0xf4d98a, 0xe9a66b, 0xf2c4a8, 0xbfd9e8, 0xf7e8c8, 0xf1b24a], zocalos: [0x2f7a4a, 0x2f5fa8, 0xb5482f, 0x7a4a2a, 0xd9a520],
  roof: 0xb5482f, awnings: [0xd8433b, 0x2f8f6b], sidewalk: 0xcbb89a, ground: 0xb9a98c, crossing: 0x3b3e48,
  mountains: true, mountainColors: [0x6f9a78, 0x7fa98a, 0x8fb3a0, 0x5f8a70], trees: true, lamps: true, flowers: true,
  heights: [0, 1, 2, 3], pieces: {}, tierShift: 0, miceEvery: 3, balconies: false, rules: null
};
const worlds = [
  { id: 'dia', name: 'Día', emoji: '☀️', desc: 'El pueblo a pleno sol', pieces: { valla: 14, caja: 10, basura: 6, alcantarilla: 8, carro: 6, bus: 4, senora: 8, carreta: 8, cinta: 6, contenedor: 5, bolsas: 6, poste: 5, zanja: 5, tuboc: 4, hidrante: 4, andamio: 7 } }
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
  rules.layer('world', w.rules || null); // capa de reglas del mundo (por ejemplo, el primer mundo sin choques duros)
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
  if (S.state !== 'play' && S.state !== 'dying' && S.state !== 'rescue' && cur) reset();
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

/* ---------- Obstáculos: siembra ---------- */
// lane puede ser ±2 (balcones) o ±.5 (piezas de dos carriles). Las piezas se colocan con el frente en `s` (se corre hl hacia adelante).
function addObstacle(seg, type, s, lane, y = 0) {
  const g = spawn(type);
  const spec = SPEC[type];
  const sc = s + (spec.collect || spec.special ? 0 : spec.hl);
  g.position.set(lane * LANE, y, -sc);
  seg.g.add(g);
  const o = { type, s: sc, x: lane * LANE, lane, mesh: g, hit: false, passed: false, ...spec, yb: y, variant: g.userData.variant };
  if (o.dmg === undefined) o.dmg = o.collect ? 0 : 1; // todo lo que no se recoge hace tropezar (también las piezas que registran los mundos)
  o.y0 += y; o.y1 += y;
  if (type === 'senora') { o.w = rand(.7, 1.2); o.ph = rand(0, 6); }
  seg.obs.push(o);
  return o;
}
// Registro de piezas: cada tipo dice qué celda es, si es duro, en qué mundos sale y cómo se siembra.
const PIECES = {};
function piece(type, def = {}) {
  const spec = SPEC[type] || {};
  PIECES[type] = { type, cell: spec.cell, hard: !!spec.hard, move: !!spec.move, full: !!spec.full, long: !!spec.long, lanes: spec.lanes || 1,
    worlds: {}, make: (seg, s, lane) => addObstacle(seg, type, s, lane), ...def };
  return PIECES[type];
}
// piezas del núcleo (los pesos por mundo los pone cada mundo en `pieces`; el mundo por defecto arriba)
for (const t of ['valla', 'caja', 'basura', 'alcantarilla', 'carro', 'bus', 'senora', 'carreta', 'cinta', 'contenedor', 'bolsas', 'zanja', 'tuboc', 'andamio']) piece(t);
piece('caneca'); // punto de regeneración: no entra en las filas, solo la coloca specials() en un respiro
piece('poste', { make(seg, s, lane) { // una sola viga, tres celdas: S en un lado, X en el centro, A en el otro
  const o = addObstacle(seg, 'poste', s, 0), dir = o.variant % 2 ? 1 : -1;
  const lo = addObstacle(seg, 'nada', s, -dir), hi = addObstacle(seg, 'nada', s, dir), mid = addObstacle(seg, 'nada', s, 0);
  Object.assign(mid, { y0: 0, y1: 2.4, cell: 'X' }); Object.assign(hi, { y0: 1.1, y1: 2.6, cell: 'A' }); lo.cell = 'S';
  lo.type = mid.type = hi.type = 'poste'; // las tres cajas de choque cuentan como "poste" al chocar
  o.cells = dir > 0 ? 'SXA' : 'AXS';
  return o;
} });
piece('hidrante', { make(seg, s, lane) {
  const o = addObstacle(seg, 'hidrante', s, lane), jet = spawn('chorro');
  jet.position.set(0, 0, 0); o.mesh.add(jet); o.jet = jet; o.ph = rand(0, 6);
  o.y0 = -9; o.y1 = -8;
  o.animate = (o, t) => { // 1,2 s abierto, 1,2 s cerrado; el chorro se ve 0,4 s antes de contar (aviso)
    const u = ((t + o.ph) % 2.4), open = u < 1.2, warn = u > 2.0;
    o.jet.visible = open || warn; o.jet.scale.y = open ? 1 : .25;
    o.y0 = open ? 0 : -9; o.y1 = open ? 2.4 : -8;
  };
  return o;
} });

/* ---------- Generador de filas por patrones ---------- */
// Vocabulario: una fila son tres celdas ('.', 'S', 'A', 'X', 'M', 'T'); 'L' es una celda A larga (bus, chiva, tubo de concreto).
// Invariantes (equipo/diseno-bucle.md §3.3): toda fila tiene salida; las salidas se encadenan; ningún carril pasa más de
// tierFreeMax filas seguidas libre; cada 6 filas una completa de verticales; cada carril recibe un muro cada 8 filas;
// los respiros van entre filas completas; la primera y la última fila de cada tramo son completas.
const PATTERNS = {
  U1: { w: [30, 15, 6, 0, 0], gen: t => perm3(pick(t >= 1 ? ['S..', 'A..', 'X..'] : ['S..', 'A..']) ) },
  D1: { w: [20, 18, 12, 10, 8], gen: () => perm3('XX.') },
  D2: { w: [20, 15, 10, 8, 6], gen: () => perm3(pick(['SS.', 'AA.', 'SA.'])) },
  D3: { w: [0, 12, 12, 10, 8], gen: () => perm3(pick(['XS.', 'XA.'])) },
  W1: { w: [15, 10, 8, 6, 6], gen: () => 'SSS' },
  W2: { w: [15, 10, 8, 6, 6], gen: () => 'AAA' },
  W3: { w: [0, 5, 6, 6, 6], gen: () => perm3('XXS') },
  W4: { w: [0, 5, 6, 6, 6], gen: () => perm3('XXA') },
  W5: { w: [0, 6, 8, 10, 10], gen: () => perm3(pick(['SAS', 'ASA', 'SSA', 'AAS'])) },
  W6: { w: [0, 0, 6, 8, 8], gen: () => 'W6' },
  L1: { w: [0, 4, 6, 6, 6], gen: () => perm3(pick(['LS.', 'LX.', 'L..', 'LSS', 'LAS'])) },
  M1: { w: [0, 0, 6, 8, 8], gen: () => pick(['SM.', '.MS', 'AM.', '.MA']) },
  T1: { w: [0, 0, 4, 6, 6], gen: () => 'TTT' },
  C2: { w: [0, 0, 6, 10, 12], combo: () => pick([['SSS', 'AAA', .6], ['XX.', 'XXS', .5], ['XX.', '.XX', .5], ['AAA', 'SSS', .8]]) },
  C3: { w: [0, 0, 0, 6, 10], combo: () => pick([['S..', '.S.', '..S', .8], ['XX.', '.XX', 'SSS', .6], ['AAA', 'SSS', 'AAA', .7]]) }
};
function perm3(s) { const a = s.split(''); for (let i = 2; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join(''); }
const SCRIPTED = ['SSS', 'AAA', 'XX.']; // arranque guionado: saltar, agacharse, cambiar de carril
const gen = { free: [0, 0, 0], sinceW: 0, sinceX: [0, 0, 0], lastExits: [-1, 0, 1], seen: new Set(), scripted: 0, wave: 0, waveN: 5, respiro: 0, afterRespiro: false,
  gapN: 0, nextCaneca: 0, nextSewer: 0, nextBalcony: 0, balconySide: 1, sewerExitAt: -1e9, rescuedAt: -1e9, base: 0 };
function genReset() {
  Object.assign(gen, { free: [0, 0, 0], sinceW: 0, sinceX: [0, 0, 0], lastExits: [-1, 0, 1], seen: new Set(), scripted: 0, wave: 0, waveN: 5, respiro: 0, afterRespiro: false, gapN: 0,
    nextCaneca: cfg.canecaFirst, nextSewer: rand(...cfg.sewerEvery), nextBalcony: cfg.balconyFirst, balconySide: pick([-1, 1]), sewerExitAt: -1e9, rescuedAt: -1e9, base: 0 });
}
const tierOf = heat => { const th = cfg.tierHeat; let t = 0; for (let i = 1; i < th.length; i++) if (heat >= th[i]) t = i; return Math.min(t, cfg.tierMax); };
const speedAt = heat => Math.min(cfg.maxSpeed, cfg.baseSpeed + heat * cfg.accel) * S.speedMul;
const idx = lane => lane + 1;
// piezas disponibles para una celda en el mundo actual (peso > 0), con las reglas de dureza y de primer encuentro
function candidates(cell, tier, opts = {}) {
  const wp = W('pieces'), out = [];
  for (const k in wp) {
    const pc = PIECES[k], w = wp[k];
    if (!pc || !(w > 0)) continue;
    if (cell === 'L') { if (pc.cell !== 'A' || !pc.long) continue; }
    else if (pc.cell !== cell) continue;
    else if (cell === 'A' && (pc.long || pc.full) && !opts.full) continue;
    else if (cell === 'T' && !pc.full) continue;
    else if (cell === 'A' && opts.full && !pc.full) continue;
    if (cell === 'S' && pc.lanes === 2 && !opts.wide) continue;
    if (cell === 'S' && opts.wide && pc.lanes !== 2) continue;
    if (pc.hard && tier < 1) continue;
    if ((SPEC[k]?.minTier || 0) > tier) continue; // piezas que se acercan de frente: solo desde cierto escalón
    if (opts.seenOnly && !gen.seen.has(k)) continue;
    out.push([k, w]);
  }
  return out;
}
function pickPiece(cell, tier, opts) {
  let list = candidates(cell, tier, { ...opts, seenOnly: opts?.mixed });
  if (!list.length) list = candidates(cell, tier, opts);
  if (!list.length) return null;
  let t = Math.random() * list.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of list) if ((t -= w) <= 0) return PIECES[k];
  return PIECES[list[list.length - 1][0]];
}
// ¿esta forma respeta las invariantes dado el estado del generador?
function shapeOk(shape, tier, force) {
  if (shape === 'W6') return !!candidates('W6', tier).length || false;
  if (shape === 'TTT') return !!candidates('T', tier).length;
  const cells = shape.split('');
  const exits = [], complete = !cells.some(c => c === '.' || c === 'M' || c === 'T');
  cells.forEach((c, i) => { if ('.SAL'.includes(c)) exits.push(i - 1); });
  if (!exits.length) return false;
  if (!gen.lastExits.some(a => exits.some(b => Math.abs(a - b) <= 1))) return false;
  if (force && !complete) return false;
  const maxFree = cfg.tierFreeMax[tier];
  for (let i = 0; i < 3; i++) if (gen.free[i] >= maxFree && !'SAXL'.includes(cells[i])) return false;
  if (gen.sinceW >= 5 && (!complete || cells.some(c => c === 'X'))) return false;
  const hasX = candidates('X', tier).length > 0;
  if (hasX) for (let i = 0; i < 3; i++) if (gen.sinceX[i] >= 7 && cells[i] !== 'X') return false;
  if (tier === 0 && (cells.includes('M') || cells.includes('T'))) return false;
  // cada celda tiene que poder sembrarse tal como placeRow la va a sembrar: 'AAA' admite una pieza de ancho total; el resto, piezas normales
  for (const c of new Set(cells)) {
    if (c === '.') continue;
    if (c === 'A' && shape === 'AAA' && candidates('A', tier, { full: true }).length) continue;
    if (!candidates(c, tier).length) return false;
  }
  return true;
}
function pickShape(tier, force, noCombo) {
  const keys = Object.keys(PATTERNS), ws = keys.map(k => PATTERNS[k].w[Math.min(tier, 4)]), total = ws.reduce((a, b) => a + b, 0);
  for (let tries = 0; tries < 40; tries++) {
    let t = Math.random() * total, key = keys[0];
    for (let i = 0; i < keys.length; i++) if ((t -= ws[i]) <= 0) { key = keys[i]; break; }
    const pat = PATTERNS[key];
    if (pat.combo) {
      if (force || noCombo || gen.lastCombo) continue;
      const c = pat.combo(); // [forma, forma, (forma,) hueco interno en s]
      const shapes = c.slice(0, -1), inner = c[c.length - 1];
      if (shapeOk(shapes[0], tier, false)) return { shapes, inner, key };
      continue;
    }
    const shape = pat.gen(tier);
    if (shapeOk(shape, tier, force)) return { shapes: [shape], inner: 0, key };
  }
  // sin candidato: una fila completa de verticales siempre cumple (AAA solo si hay pieza de ancho total o piezas A normales)
  const fb = shapeOk('AAA', tier, force) && Math.random() < .5 ? 'AAA' : 'SSS';
  return { shapes: [fb], inner: 0, key: 'fallback' };
}
const FALLBACK_CELL = { A: 'S', X: 'S', S: 'A', M: 'S', T: 'A' }; // si una celda no tiene pieza, se siembra la vecina: una fila nunca queda vacía por falta de piezas
// siembra una fila; devuelve { len, exits, complete }
function placeRow(seg, s, shape, tier) {
  let len = 1, cells;
  if (shape === 'W6') { const pc = pickPiece('W6', tier); const o = pc.make(seg, s, 0); cells = (o?.cells || 'SXA').split(''); gen.seen.add(pc.type); len = 1; }
  else if (shape === 'TTT') { const pc = pickPiece('T', tier); const o = pc.make(seg, s, 0); cells = ['T', 'T', 'T']; gen.seen.add(pc.type); len = 2 * (o?.hl || .3); }
  else {
    cells = shape.split('');
    const kinds = new Set(cells.filter(c => c !== '.')), single = kinds.size === 1;
    const mixed = !single || cells.includes('.');
    // fila completa de A: una pieza de ancho total a veces, o siempre si no hay piezas A de un carril
    if (shape === 'AAA' && (Math.random() < .35 || !candidates('A', tier).length)) {
      const pc = pickPiece('A', tier, { full: true });
      if (pc) { const o = pc.make(seg, s, 0); gen.seen.add(pc.type); return { len: 2 * (o?.hl || .3), exits: [-1, 0, 1], complete: true, cells }; }
    }
    let sameType = null;
    for (let i = 0; i < 3; i++) {
      const c = cells[i];
      if (c === '.') continue;
      if (c === 'S' && i < 2 && cells[i + 1] === 'S' && Math.random() < .35) { // dos S vecinas: puede ser una pieza de dos carriles (zanja)
        const wide = pickPiece('S', tier, { wide: true, mixed });
        if (wide) { const o = wide.make(seg, s, i - 1 + .5); gen.seen.add(wide.type); len = Math.max(len, 2 * o.hl); i++; continue; }
      }
      let pc = single && sameType ? sameType : pickPiece(c, tier, { mixed });
      if (!pc && FALLBACK_CELL[c]) { pc = pickPiece(FALLBACK_CELL[c], tier, { mixed }); if (pc) cells[i] = FALLBACK_CELL[c]; }
      if (!pc) { cells[i] = '.'; continue; }
      if (single && !sameType && Math.random() < .7) sameType = pc;
      const lane = c === 'M' ? 0 : i - 1;
      const o = pc.make(seg, s, lane);
      gen.seen.add(pc.type);
      len = Math.max(len, 2 * (o?.hl || .5));
    }
  }
  const exits = []; cells.forEach((c, i) => { if ('.SAL'.includes(c)) exits.push(i - 1); });
  const complete = !cells.some(c => c === '.' || c === 'M' || c === 'T');
  return { len, exits, complete, cells };
}
function afterRow(row) {
  const cells = row.cells;
  for (let i = 0; i < 3; i++) {
    gen.free[i] = 'SAXL'.includes(cells[i]) ? 0 : gen.free[i] + 1;
    gen.sinceX[i] = cells[i] === 'X' ? 0 : gen.sinceX[i] + 1;
  }
  gen.sinceW = row.complete && !cells.includes('X') ? 0 : gen.sinceW + 1;
  gen.lastExits = row.exits.length ? row.exits : [-1, 0, 1];
}
// monedas por una ruta válida entre dos filas; ratones fuera de la ruta cada N huecos
function fillGap(seg, s0, s1, exitsA, exitsB, opts = {}) {
  const room = s1 - s0 - 6;
  if (room < 4) return;
  let a = exitsA.find(l => exitsB.includes(l));
  let b = a;
  if (a === undefined) { a = pick(exitsA); b = exitsB.find(l => Math.abs(l - a) <= 1) ?? a; }
  if (opts.zigzag) { a = pick(exitsA); b = pick(exitsB.filter(l => Math.abs(l - a) <= 1)) ?? a; }
  const n = Math.min(7, Math.floor(room / 2.4)), start = s0 + 3 + (room - (n - 1) * 2.4) / 2;
  for (let k = 0; k < n; k++) addObstacle(seg, 'moneda', start + k * 2.4, k < n / 2 ? a : b);
  gen.gapN++;
  const every = opts.mice ?? W('miceEvery');
  if (every > 0 && gen.gapN % every === 0 && room >= 9) {
    const lanes = [-1, 0, 1].filter(l => l !== a && l !== b);
    const l = lanes.length ? pick(lanes) : (a === b ? pick([-1, 0, 1].filter(x => x !== a)) : a);
    const mid = s0 + 3 + room / 2;
    for (let k = 0; k < 3; k++) addObstacle(seg, 'raton', mid - 2.6 + k * 2.6, l);
  }
  world.gap?.(seg, s0 + 3, s1 - 3, [a, b], gen.base + s0, game); // el mundo puede poner algo en cualquier hueco (el drenaje: escaleras)
}
// cosas que solo van en un respiro: caneca, alcantarilla verde, acceso a balcón (cada una en un carril distinto de la ruta)
function specials(seg, s0, s1, exits, dist, heat) {
  const used = new Set(exits.slice(0, 1)), freeLane = pref => { const l = pref.filter(x => !used.has(x)); if (!l.length) return null; const c = pick(l); used.add(c); return c; };
  if (PIECES.caneca && dist >= gen.nextCaneca && heat >= cfg.canecaMinHeat && dist - gen.rescuedAt >= cfg.canecaAfterRescue && s1 - s0 > 12) {
    const l = freeLane([-1, 0, 1]);
    if (l !== null) { addObstacle(seg, 'caneca', (s0 + s1) / 2 - 1.6, l); gen.nextCaneca = dist + rand(...cfg.canecaEvery); emit('specialPlaced', { type: 'caneca', dist }); }
  }
  if (PIECES.drenaje && !sub && !seg.first && dist >= gen.nextSewer && heat >= cfg.sewerMinHeat && dist - gen.sewerExitAt >= cfg.sewerCooldown) {
    const l = freeLane([-1, 1]);
    if (l !== null) { PIECES.drenaje.make(seg, (s0 + s1) / 2 + 3, l); gen.nextSewer = dist + rand(...cfg.sewerEvery); }
  }
  world.respiro?.(seg, s0, s1, exits, dist, heat, game);
}
function populate(seg, first) {
  const base = seg.base, run = !sub && first; // tramo inicial de la carrera: arranque guionado
  let s = run ? 60 : 20;
  const end = seg.L - 20, arrival = at => S.heat + Math.max(0, base + at - S.dist) / Math.max(8, S.speed);
  let prev = null; // { s: fin de la fila anterior, exits }
  if (run) { genReset(); gen.scripted = SCRIPTED.length; gen.base = 0; }
  // monedas de bienvenida: desde el cruce hasta la primera fila, por el carril de la ruta anterior
  const head0 = run ? 20 : 8, headLane = gen.lastExits.includes(0) ? 0 : pick(gen.lastExits);
  for (let k = head0; k < s - 4; k += 2.4) addObstacle(seg, 'moneda', k, headLane);
  let rowsInSeg = 0;
  while (s < end) {
    const heat = arrival(s), tier = gen.scripted > 0 ? 0 : Math.max(0, tierOf(heat) + W('tierShift')), v = speedAt(heat); // el arranque guionado enseña con piezas blandas
    const [t0, t1] = cfg.tierRowTime[Math.min(tier, 4)];
    const tRow = rand(t0, t1);
    const nearEnd = s + v * t1 * 1.5 + 14 > end; // cerca del cruce no caben combos
    const lastRow = s + v * t1 + 14 > end; // si después de esta fila ya no cabe otra, esta es la última: completa
    if (gen.respiro > 0 && !lastRow && !gen.scripted) { // respiro: dos huecos sin filas, con premio y decisiones de ruta
      const s1 = s + v * tRow;
      fillGap(seg, s - 2, s1, gen.lastExits, gen.lastExits, { zigzag: true, mice: 1 });
      if (gen.respiro === 2) specials(seg, s + 2, s1 - 2, gen.lastExits, base + s, heat);
      gen.respiro--; gen.afterRespiro = gen.respiro === 0; gen.wave = 0;
      s = s1; prev = { s: s - 2, exits: gen.lastExits, filled: true };
      continue;
    }
    const force = rowsInSeg === 0 || lastRow || gen.afterRespiro || gen.wave >= gen.waveN;
    let plan;
    if (gen.scripted > 0) { plan = { shapes: [SCRIPTED[SCRIPTED.length - gen.scripted]], inner: 0, key: 'guion' }; gen.scripted--; }
    else plan = pickShape(tier, force, nearEnd);
    gen.lastCombo = plan.shapes.length > 1;
    let rowS = s, row = null;
    for (let i = 0; i < plan.shapes.length; i++) {
      if (i > 0 && !shapeOk(plan.shapes[i], tier, false)) break;
      row = placeRow(seg, rowS, plan.shapes[i], tier);
      if (prev && !prev.filled) fillGap(seg, prev.s, rowS, prev.exits, row.exits);
      afterRow(row);
      prev = { s: rowS + row.len, exits: row.exits, filled: i < plan.shapes.length - 1 };
      rowsInSeg++;
      if (i < plan.shapes.length - 1) rowS += row.len + v * plan.inner;
    }
    gen.afterRespiro = false;
    const after = tRow * (plan.shapes.length === 3 ? 1.5 : plan.shapes.length === 2 ? 1.25 : 1);
    s = prev.s + v * after;
    if (lastRow) break;
    if (row.complete && gen.wave >= gen.waveN && !gen.scripted) { // oleada cumplida y fila completa: toca respiro
      gen.respiro = 2; gen.waveN = Math.round(rand(...cfg.tierWave[Math.min(tier, 4)]));
    } else gen.wave++;
  }
  if (prev && !prev.filled) fillGap(seg, prev.s, seg.L - 6, prev.exits, prev.exits);
  gen.base = base + seg.L;
}
// relleno antiguo, conservado por compatibilidad con mundos que lo llamen
function defaultFill() {}

function block(g, x, z, sx, sz) {
  const i = pick(W('heights')), h = (i + 2) * 3.2;
  part(BOX, worldMats().facades[i], sx, h, sz, x, h / 2, z, g).userData.tint = new THREE.Color(pick(W('tints')));
  part(BOX, W('roof'), sx + 1.6, .45, sz + .3, x, h + .22, z, g);
}
// ¿hay balcón en este lado a la altura s? (para que el decorado no lo atraviese)
const balconyAt = (seg, side, s) => (seg.balconies || []).some(b => b.side === side && s > b.s0 - 10 && s < b.s1 + 4);
function defaultSide(st, seg, side, s0, end) {
  let s = s0;
  while (s < end - .1) {
    let w = pick([10, 12, 14]);
    if (end - s - w < 8) w = end - s;
    block(st, side * (HALF + DEPTH / 2), -(s + w / 2), DEPTH, w);
    part(BOX, pick(W('zocalos')), .16, 1, w, side * (HALF + .02), .7, -(s + w / 2), st);
    const clear = balconyAt(seg, side, s + w / 2);
    if (!clear && Math.random() < .35) part(BOX, pick(W('awnings')), 1.5, .2, w - 2, side * (HALF - .7), 3.1, -(s + w / 2), st);
    else if (!clear && W('flowers')) for (let k = 0; k < 2; k++) {
      const z = -(s + w * (.3 + k * .4));
      part(CYL, 0xb5653a, .5, .5, .5, side * 7.1, .45, z, st);
      part(SPH, pick([0xe8456b, 0xffb020, 0xd94fd0]), .6, .5, .6, side * 7.1, .85, z, st);
    }
    s += w;
  }
  if (W('trees')) for (let t = Math.max(s0, 12) + (side > 0 ? 11 : 0); t < end - 4; t += 22) {
    if (balconyAt(seg, side, t)) continue;
    part(CYL, 0x6b4a2f, .3, 2.2, .3, side * 5.3, 1.3, -t, st);
    part(SPH, 0x3f9a4f, 2.3, 2, 2.3, side * 5.3, 3.3, -t, st);
    part(SPH, 0x57b862, 1.6, 1.5, 1.6, side * 5.3 + .3, 4.3, -t - .2, st);
  }
  if (W('lamps')) for (let t = Math.max(s0, 12) + (side > 0 ? 0 : 22); t < end - 4; t += 44) {
    if (balconyAt(seg, side, t)) continue;
    part(CYL, 0x4a4f5c, .16, 5.6, .16, side * 7, 3, -t, st);
    part(BOX, 0x4a4f5c, 1.8, .12, .12, side * 6.2, 5.8, -t, st);
    part(BOX, 0xfff2a8, .6, .16, .35, side * 5.4, 5.7, -t, st);
  }
}
// balcones: corredores elevados pegados a la fachada; se deciden antes de armar las fachadas
function planBalconies(seg) {
  seg.balconies = [];
  if (sub || seg.first || !W('balconies')) return;
  const dist = seg.base;
  if (dist + seg.L - 70 < gen.nextBalcony) return;
  const L = pick(cfg.balconyLens), s0 = Math.max(45, gen.nextBalcony - dist, rand(45, seg.L - 75 - L));
  if (s0 + 5 + L > seg.L - 70) return;
  const side = gen.balconySide;
  gen.balconySide = -side;
  gen.nextBalcony = dist + s0 + L + rand(...cfg.balconyEvery);
  seg.balconies.push({ side, s0, s1: s0 + 5 + L, L });
}
function sowBalconies(seg) {
  for (const b of seg.balconies) {
    const lane = b.side * 2;
    const st = addObstacle(seg, 'escalones', b.s0, lane); st.access = [b.s0 - 8, b.s0 + 3];
    const bal = addObstacle(seg, 'balcon', b.s0 + 5 + b.L / 2, lane);
    bal.hl = b.L / 2; bal.mesh.children.forEach(m => { m.scale.z = 1; });
    bal.mesh.scale.z = b.L / rules.get('balconyLens')[bal.variant % 3];
    bal.mesh.rotation.y = b.side > 0 ? Math.PI : 0; // la baranda queda hacia la calle
    for (let k = b.s0 + 7; k < b.s0 + 5 + b.L - 4; k += 2.4) addObstacle(seg, 'moneda', k, lane, 2.2);
    const food = W('food') && PIECES[W('food')] ? PIECES[W('food')] : null; // la comida del mundo (gallina, cangrejo) o un pescado
    if (food) food.make(seg, b.s0 + 5 + b.L - 3, lane, 2.2); else addObstacle(seg, 'pescado', b.s0 + 5 + b.L - 3, lane, 2.2);
  }
}
function buildSegment(origin, yaw, first, base = 0) {
  const L = first ? 180 : rand(165, 230), r = Math.random();
  const seg = {
    origin, yaw, L, first: !!first, obs: [], exits: {}, g: new THREE.Group(), world, base,
    sides: world.tunnel ? [] : r < .35 ? [-1] : r < .7 ? [1] : [-1, 1],
    bonus: !first && Math.random() < .35,
    dir: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)),
    right: new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
  };
  seg.g.position.copy(origin); seg.g.rotation.y = yaw;
  planBalconies(seg);
  const st = new THREE.Group(), s0 = first ? -40 : HALF, end = L - HALF, len = end - s0, mid = -(s0 + len / 2);

  const roadGeo = new THREE.PlaneGeometry(9, len), uv = roadGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 8);
  roadGeo.rotateX(-Math.PI / 2);
  const road = new THREE.Mesh(roadGeo, worldMats().road);
  road.position.set(0, 0, mid);
  st.add(road);
  part(BOX, W('sidewalk'), 3, .3, len, -6, .05, mid, st);
  part(BOX, W('sidewalk'), 3, .3, len, 6, .05, mid, st);

  part(BOX, W('crossing'), 15, .1, 15, 0, -.05, -L, st);
  if (!world.tunnel) for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) {
    part(BOX, 0xf0f0f0, 1, .03, 2.4, x, .015, -(L - 5.6), st);
    part(BOX, 0xf0f0f0, 1, .03, 2.4, x, .015, -(L + 5.6), st);
    for (const d of seg.sides) part(BOX, 0xf0f0f0, 2.4, .03, 1, d * 5.6, .015, -(L + x), st);
  }
  for (const side of [-1, 1]) {
    if (world.tunnel) { world.side(st, seg, side, first ? s0 : HALF + DEPTH, L + HALF + DEPTH, game); continue; }
    (world.side || defaultSide)(st, seg, side, first ? s0 : HALF + DEPTH, end, game);
    block(st, side * (HALF + DEPTH / 2), -(L + HALF + DEPTH / 2), DEPTH, DEPTH);
    if (!seg.sides.includes(side)) block(st, side * (HALF + DEPTH / 2), -L, DEPTH, 15);
  }
  world.decorate?.(st, seg, game);

  seg.geos = bake(st).map(({ geometry, material }) => {
    const m = new THREE.Mesh(geometry, material);
    m.receiveShadow = true;
    seg.g.add(m);
    return geometry;
  });
  populate(seg, first);
  sowBalconies(seg);
  scene.add(seg.g);
  emit('segment', seg);
  return seg;
}
const endOf = seg => seg.origin.clone().addScaledVector(seg.dir, seg.L);
function openExits(seg) {
  for (const d of [0, ...seg.sides]) seg.exits[d] = buildSegment(endOf(seg), seg.yaw - d * Math.PI / 2, false, seg.base + seg.L);
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
  sub = { world, prev, cur, s: p.s, x: p.x, lane: p.lane, yaw: p.yaw, camYaw, gen: { ...gen, free: [...gen.free], sinceX: [...gen.sinceX], lastExits: [...gen.lastExits] } };
  for (const s of [prev, cur, ...Object.values(cur.exits)]) if (s) s.g.visible = false;
  applyWorld(w);
  prev = null;
  Object.assign(gen, { free: [0, 0, 0], sinceW: 0, sinceX: [0, 0, 0], lastExits: [-1, 0, 1], wave: 0, respiro: 0, afterRespiro: false, scripted: 0 });
  cur = buildSegment(new THREE.Vector3(sub.cur.origin.x + 4000, 0, sub.cur.origin.z + 4000), 0, true, S.dist);
  openExits(cur);
  Object.assign(p, { s: 0, x: clamp(p.lane, -1, 1) * LANE, lane: clamp(p.lane, -1, 1), yaw: 0, y: 5, gy: 0, vy: 0, fall: 0, turnQ: 0, inv: 1, slide: 0 });
  camYaw = 0;
  S.chase = 0; S.danger = 0;
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
  const g = sub.gen; Object.assign(gen, { free: g.free, sinceW: g.sinceW, sinceX: g.sinceX, lastExits: g.lastExits, wave: g.wave, waveN: g.waveN, scripted: 0, respiro: 2, afterRespiro: false });
  gen.sewerExitAt = S.dist;
  S.danger = 0; S.chase = 0; S.dogGap = cfg.gapMax; // le sacó ventaja: el peligro de arriba se limpia
  dog.visible = true;
  const w = sub.world;
  sub = null;
  applyWorld(w);
  emit('sub', null);
}
function reset() {
  if (sub) {
    [sub.prev, sub.cur, ...Object.values(sub.cur.exits)].forEach(s => s && removeSegment(s));
    const w = sub.world;
    sub = null; dog.visible = true;
    [prev, cur, ...Object.values(cur.exits)].forEach(s => s && removeSegment(s));
    cur = prev = null;
    applyWorld(w);
  }
  if (cur) [prev, cur, ...Object.values(cur.exits)].forEach(s => s && removeSegment(s));
  rescueFx(null);
  Object.assign(S, { paused: false, time: 0, dist: 0, mice: 0, coins: 0, speed: cfg.baseSpeed, speedMul: 1, shake: 0, dogGap: cfg.gapMax, dogOff: 0, dieT: 0, score: 0, won: false,
    danger: 0, bocado: 0, bocados: 0, canecas: 0, heat: cfg.heatStart, chase: 0, stumbles: 0, cause: '', hardCause: false, health: 100,
    racha: 0, mult: 1, bonus: 0, nearmiss: 0, passes: 0, lastCaneca: -1, rescued: false, rescueT: 0, multBest: 1 });
  camYaw = 0; flying = [];
  Object.assign(p, { s: 0, x: 0, lane: 0, prevLane: 0, y: 0, gy: 0, vy: 0, h: 1.3, slide: 0, fall: 0, inv: 0, slow: 1, yaw: 0, turnQ: 0, lastDir: 0, lastT: 0, air: 0, want: null, nearT: 0 });
  prev = null;
  genReset();
  cur = buildSegment(new THREE.Vector3(), 0, true, 0);
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
// Tres candados para que el sonido no se desboque: mudo mientras se simula sin dibujar (pruebas),
// mudo con la pestaña oculta, y un tope de voces a la vez (muchos efectos en el mismo instante se apilaban).
let muted = false, voices = 0;
const MAX_VOICES = 6;
function sfx(f, d = .1, type = 'square', vol = .07, slide = 0) {
  if (!ac || muted || document.hidden || ac.state !== 'running' || voices >= MAX_VOICES) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  voices++;
  o.onended = () => { voices = Math.max(0, voices - 1); };
  o.type = type; o.frequency.value = f;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(ac.destination);
  o.start(); o.stop(t + d);
}
const bark = () => { sfx(180, .12, 'sawtooth', .12, -90); setTimeout(() => sfx(160, .14, 'sawtooth', .12, -90), 150); };

/* ---------- Controles ---------- */
// ¿se puede pasar al carril elevado `lane` (±2)? Solo en la zona de acceso de unos escalones o si ya está a esa altura
function canClimb(lane) {
  const x = lane * LANE;
  for (const o of cur.obs) {
    if (o.lane !== lane || !o.top) continue;
    if (o.ramp && p.s >= o.access[0] && p.s <= o.access[1] && p.y <= p.gy + .01) return true;
    if (!o.ramp && Math.abs(p.s - o.s) <= o.hl && p.y >= o.top - .45) return true;
  }
  return false;
}
function move(dir) {
  const now = performance.now(), dbl = p.lastDir === dir && now - p.lastT < 380, toCross = cur.L - p.s;
  p.lastDir = dir; p.lastT = now;
  if (cur.exits[dir] && toCross > -3 && ((dbl && toCross < 60) || (toCross < 30 && p.lane === dir))) return void turn(dir);
  let lane = p.lane + dir;
  if (Math.abs(lane) === 2 && !canClimb(lane)) lane = p.lane;
  lane = clamp(lane, -2, 2);
  if (lane !== p.lane) { p.prevLane = p.lane; p.lane = lane; emit('lane', dir); }
}
function turn(dir) {
  const toCross = cur.L - p.s;
  if (S.state !== 'play' || S.paused || !cur.exits[dir] || toCross < -3 || toCross > 60) return;
  p.turnQ = dir;
  sfx(700, .08, 'triangle');
}
function jump() {
  if (p.fall > 0) return;
  if (p.y > p.gy + .01) { if (p.air >= cfg.airJumps) { p.want = { a: 'J', t: S.time }; return; } p.air++; }
  p.vy = cfg.jumpV; p.slide = 0; p.want = null;
  if (p.y <= p.gy) p.y = p.gy + .001;
  sfx(420, .15, 'square', .06, 300);
  emit('jump', { air: p.air });
}
function slide() {
  if (p.y > p.gy + .01) { p.vy = -18; p.want = { a: 'S', t: S.time }; }
  p.slide = cfg.slideTime; p.want = p.want?.a === 'S' ? p.want : null;
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
  if (e.target.closest('button, input, a, select, [data-ui]')) return;
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

/* ---------- HUD ---------- */
// La barra ya no es vida: es el Bocado. Al lado, el icono de caneca (carga de rescate) y el multiplicador lo pinta fx.js.
const bocadoPill = document.createElement('span'); bocadoPill.className = 'pill'; bocadoPill.id = 'bocadoPill'; bocadoPill.textContent = '🐟';
const canecaPill = document.createElement('span'); canecaPill.className = 'pill'; canecaPill.id = 'canecaPill'; canecaPill.textContent = '🗑️'; canecaPill.style.opacity = .35;
$('bar').after(bocadoPill, canecaPill);
$('bar').title = 'Bocado: ratones y comida. Lleno, salva de una captura por doble tropiezo';
function hud() {
  const full = S.bocados > 0;
  $('fill').style.width = (full ? 100 : 100 * S.bocado / cfg.bocadoMax) + '%';
  $('fill').style.background = full ? 'var(--accent)' : 'var(--good)';
  bocadoPill.style.opacity = full ? 1 : .5;
  bocadoPill.textContent = full ? '🐟 ¡Bocado!' : '🐟';
  canecaPill.style.opacity = S.canecas > 0 ? 1 : .35;
  $('danger').style.opacity = S.state === 'play' ? clamp(S.danger / cfg.dangerTime, 0, 1) * .9 : 0;
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

/* ---------- Reglas de juego: tropiezo, captura, Bocado, racha ---------- */
function pum() {
  const el = $('pum');
  el.textContent = pick(['¡PUM!', '¡CRASH!', '¡AUCH!']);
  el.className = ''; void el.offsetWidth; el.className = 'on';
}
// racha: puntos que suben el multiplicador; se pierde dos escalones al tropezar
function racha(points, score = 0, why = '') {
  S.racha += points;
  const steps = cfg.multSteps;
  let m = 1; for (const t of steps) if (S.racha >= t) m++;
  if (m !== S.mult) { S.mult = m; S.multBest = Math.max(S.multBest, m); emit('mult', { mult: m, up: true, why }); }
  if (score) S.bonus += score * (S.mult - 1);
}
function rachaDrop() {
  const m = Math.max(1, S.mult - cfg.multDrop);
  S.racha = m > 1 ? cfg.multSteps[m - 2] : 0;
  if (m !== S.mult) { S.mult = m; emit('mult', { mult: m, up: false }); }
}
function invuln(sec) { p.inv = Math.max(p.inv, sec); }
function calm() { S.danger = 0; hud(); } // cierra la ventana de peligro (habilidades que despistan a Panela)
// o: obstáculo golpeado. El llamador pone o.frontal (entró por la cara delantera) antes de llamar.
function damage(o) {
  const frontal = o.frontal !== false, hard = !!o.hard && !o.move, corner = frontal && Math.abs(o.x - p.x) > o.hw - .1;
  const lethalHard = hard && cfg.hardCrash && frontal && !corner;
  o.lethal = lethalHard || S.danger > 0; o.lethalHard = lethalHard;
  for (const fn of hooks.damage) if (fn(o) === false) return false;
  S.stumbles++;
  if (!o.lethal) { stumble(o); return true; }
  if (!lethalHard && S.bocados > 0) { // Tinto suelta la presa y Panela se distrae
    S.bocados = 0; S.danger = 0; p.inv = 1.5; p.slow = cfg.hitSlow; S.shake = .3;
    sfx(600, .25, 'triangle', .08, 300);
    emit('bocadoUsed', o); emit('hit', o);
    hud();
    return true;
  }
  stumble(o, true);
  capture(o.type, lethalHard);
  return true;
}
function stumble(o, lethal) {
  S.danger = cfg.dangerTime; p.inv = cfg.invuln; p.slow = cfg.hitSlow; S.shake = .45;
  if (sub) S.chase += cfg.stumbleChase; // abajo, cada tropiezo acerca al cocodrilo
  if (o.frontal === false && Math.abs(p.prevLane) <= 2) p.lane = p.prevLane; // entrada lateral: vuelve a su carril
  sfx(110, .25, 'sawtooth', .12, -60);
  if (!sub) bark();
  pum();
  if (o.hole) p.fall = .5;
  if (o.fly && o.mesh) flying.push({ mesh: o.mesh, t: .7 });
  rachaDrop();
  emit('hit', o);
  if (!lethal) emit('stumble', o);
  hud();
}
function capture(cause, hard = false) {
  if (S.state !== 'play') return;
  S.state = 'dying'; S.dieT = 0; S.cause = cause; S.hardCause = hard; S.health = 0;
  dog.visible = !sub;
  emit('dying', { cause, hard, sub: !!sub });
  hud();
}
function collect(o) {
  if (o.hit) return;
  o.hit = true;
  if (!o.keep) flying.push({ mesh: o.mesh, t: .3, coin: true });
  if (o.type === 'raton' || o.food) {
    S.mice++;
    const add = o.food ? cfg.bocadoFood : cfg.bocadoMouse;
    if (S.bocados < 1) { S.bocado = Math.min(cfg.bocadoMax, S.bocado + add); if (S.bocado >= cfg.bocadoMax) { S.bocado = 0; S.bocados = 1; emit('bocado'); } }
    racha(2, cfg.scoreMouse, 'raton');
    sfx(1500, .09, 'triangle', .08, 600);
  } else if (o.type === 'moneda') { S.coins++; racha(1, cfg.scoreCoin, 'moneda'); sfx(880 + (S.coins % 6) * 90, .07, 'square', .05); }
  emit('collect', o);
  hud();
}
function coins(n, why) { S.coins += n; racha(0, cfg.scoreCoin * n, why); emit('collect', { type: 'moneda', bonus: n, why }); hud(); }
// pasar por dentro o por debajo de algo sin chocarlo (canecas, vehículos agachado, tubo)
function passed(o) {
  o.passed = true; S.passes++;
  if (o.type === 'caneca') {
    const charged = S.canecas < 1;
    S.danger = 0;
    if (charged) { S.canecas = 1; S.lastCaneca = S.dist; } else coins(10, 'caneca');
    sfx(300, .2, 'square', .08, 200);
    emit('caneca', { charged, o });
  } else racha(5, 20, 'pass');
  emit('pass', o);
  hud();
}
function nearmiss(o, how) {
  if (S.time - p.nearT < 1.2) return;
  p.nearT = S.time; S.nearmiss++;
  racha(5, 20, 'nearmiss');
  sfx(1800, .08, 'sine', .05, 400);
  emit('nearmiss', { o, how });
}

/* ---------- Rescate: salir de la caneca ---------- */
// Se puede pedir desde 'dying' u 'over' (antes de reset) si hay carga de caneca y no se usó en esta partida.
let rescueMesh = null;
function rescueFx(m) { if (rescueMesh) { scene.remove(rescueMesh); rescueMesh = null; } if (m) { rescueMesh = m; scene.add(m); } }
const canRescue = () => (S.state === 'dying' || S.state === 'over') && S.canecas > 0 && !S.rescued && !!cur;
function rescue() {
  if (!canRescue()) return false;
  if (sub) exitSub();
  $('over').hidden = true;
  S.rescued = true; S.canecas = 0; S.rescueT = 0; S.state = 'rescue';
  S.danger = 0; S.chase = 0; S.dogGap = cfg.gapMax; S.dogOff = 0;
  S.heat = Math.max(0, S.heat - cfg.rescueHeat);
  gen.rescuedAt = S.dist; gen.respiro = 2;
  const ahead = cfg.rescueClear * Math.max(S.speed, 12);
  for (const seg of [cur, ...Object.values(cur.exits)]) for (const o of seg.obs) {
    const d = (seg === cur ? 0 : cur.L) + o.s - p.s;
    if (!o.hit && !o.collect && !o.special && d > -2 && d < ahead) { o.hit = true; o.mesh.visible = false; }
  }
  Object.assign(p, { lane: 0, prevLane: 0, x: 0, y: 0, gy: 0, vy: 0, fall: 0, slide: 0, inv: 0, slow: 1, turnQ: 0 });
  p.s += 8;
  const m = spawn('caneca');
  m.position.copy(cur.origin).addScaledVector(cur.dir, p.s);
  m.rotation.y = cur.yaw;
  rescueFx(m);
  cat.visible = false;
  emit('rescueStart', { cause: S.cause });
  return true;
}
function updateRescue(dt) {
  S.rescueT += dt;
  if (rescueMesh) { const k = S.rescueT > .5 ? Math.sin((S.rescueT - .5) * 40) * .08 : 0; rescueMesh.rotation.z = k; rescueMesh.scale.y = 1 + Math.max(0, k); }
  S.dogGap = cfg.gapMax;
  if (S.rescueT >= .8) {
    rescueFx(null);
    cat.visible = true;
    Object.assign(p, { y: .01, vy: 9, inv: cfg.rescueInv });
    S.state = 'play'; S.cause = ''; S.health = 100;
    sfx(500, .3, 'triangle', .08, 500);
    emit('rescue', { cause: S.cause });
    hud();
  }
}

/* ---------- Física y colisiones ---------- */
function floorAt(x, s, fromY) {
  let g = 0;
  for (const o of cur.obs) {
    if (!o.top || Math.abs(o.x - x) > o.hw + .2 || s < o.s - o.hl || s > o.s + o.hl) continue;
    const h = o.ramp ? o.top * clamp((s - (o.s - o.hl)) / (2 * o.hl), 0, 1) : o.top;
    if ((o.ramp || h <= fromY + .45) && h > g) g = h;
  }
  return g;
}
function choose(d) {
  const chosen = cur.exits[d];
  if (d) {
    const ns = d * p.x, nx = -d * (p.s - cur.L);
    p.s = ns; p.x = nx; p.lane = clamp(Math.round(nx / LANE), -1, 1); p.prevLane = p.lane;
    if (S.danger > 0) S.danger = Math.max(0, S.danger - 2); // Panela derrapa en la esquina
    racha(10, 50, 'turn');
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
  if (S.state === 'rescue') return updateRescue(dt);
  if (S.state !== 'play') return;
  S.heat += dt;
  S.speed = speedAt(S.heat);
  p.slow += (1 - p.slow) * Math.min(1, dt * 1.2);
  const v = S.speed * p.slow, oldX = p.x, oldY = p.y, wasAir = p.y > p.gy + .01;
  let prevS = p.s;
  p.s += v * dt; S.dist += v * dt;
  S.bonus += v * dt * (S.mult - 1);
  p.x += (p.lane * LANE - p.x) * Math.min(1, dt * cfg.laneSnap);
  S.dogOff = (S.dogOff - (p.x - oldX)) * Math.max(0, 1 - dt * 5);
  p.inv -= dt;
  if (p.fall > 0) { p.fall -= dt; p.y = p.fall > 0 ? -1.6 * Math.sin(p.fall / .5 * Math.PI) : 0; p.vy = 0; }
  else {
    p.vy -= cfg.gravity * dt; p.y += p.vy * dt;
    p.gy = floorAt(p.x, p.s, oldY);
    if (p.y <= p.gy) {
      p.y = p.gy; p.vy = 0; p.air = 0;
      if (wasAir) { emit('land'); if (p.want && S.time - p.want.t <= cfg.inputBuffer) { const a = p.want.a; p.want = null; a === 'J' ? jump() : slide(); } else p.want = null; }
    }
  }
  if (Math.abs(p.lane) === 2 && p.gy <= 0 && p.y <= .01 && !canClimb(p.lane)) { p.prevLane = p.lane; p.lane = Math.sign(p.lane); } // se acabó el balcón: vuelve al carril de afuera
  if (p.slide > 0) p.slide -= dt;
  p.h = p.slide > 0 ? .5 : 1.3;
  if (S.danger > 0) S.danger = Math.max(0, S.danger - dt * (p.y > 1.5 && Math.abs(p.lane) === 2 ? 2 : 1)); // en el balcón Panela lo pierde de vista

  const toCross = cur.L - p.s;
  if (p.turnQ && toCross <= 1.5) { choose(p.turnQ); prevS = p.s; }
  else if (toCross < -HALF) { choose(0); prevS = p.s; }
  hints(cur.L - p.s);

  for (const o of cur.obs) {
    if (o.hit || o.s < prevS - o.hl - .5 || o.s > p.s + o.hl + .5) continue;
    if (o.top && (o.ramp || p.y >= o.top - .45)) continue;
    const dx = Math.abs(o.x - p.x), front = o.s - o.hl, crossing = !o.passed && front > prevS - .01 && front <= p.s;
    const over = p.y >= o.y1, under = p.y + p.h <= o.y0, inLane = dx <= o.hw + .4;
    if (!o.collect && o.dmg > 0 && crossing) { // ¿pasó por un pelo o por debajo?
      if (inLane && under && o.y0 > 0) passed(o);
      else if (inLane && over && p.y - o.y1 < .5 && o.y1 > .3) nearmiss(o, 'arriba');
      else if (!inLane && !o.move && dx <= o.hw + 1.4 && !over && !under) nearmiss(o, 'lado');
      if (!o.passed) o.passed = true;
    }
    if (!inLane || over || under) continue;
    if (o.collect) collect(o);
    else if (p.inv <= 0 && o.dmg > 0) { o.hit = true; o.frontal = prevS < front + .3; damage(o); }
    if (S.state !== 'play') return;
  }
  if (prev && p.s > 50) { removeSegment(prev); prev = null; }

  // el perseguidor: arriba Panela a la distancia que dicta el peligro; abajo el cocodrilo con su propio reloj
  if (sub) {
    S.chase += dt;
    const k = clamp(S.chase / cfg.catchIn, 0, 1);
    S.dogGap = (cfg.gapMax + 1.5) + (cfg.biteAt - cfg.gapMax - 1.5) * k;
    if (S.chase >= cfg.catchIn) capture('cocodrilo', false);
  } else {
    const d = S.danger, dg = cfg.dangerGap, gm = cfg.gapMax, f = cfg.dangerFade;
    S.dogGap = d > f ? dg : dg + (gm - dg) * (1 - d / f);
  }
  S.health = S.danger > 0 ? 40 + 60 * (1 - S.danger / cfg.dangerTime) : 100; // valor derivado, solo para quien lo lea
  if (Math.floor(S.dist / 10) !== Math.floor((S.dist - v * dt) / 10)) hud();
}
function end({ won = false, reason = '' } = {}) {
  if (S.state === 'over') return;
  S.state = 'over'; S.won = won; overAt = performance.now();
  if (reason) S.cause = reason;
  S.score = Math.floor(S.dist) + S.coins * cfg.scoreCoin + S.mice * cfg.scoreMouse + Math.floor(S.bonus);
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
  emit('over', { won, score: S.score, dist: S.dist, coins: S.coins, mice: S.mice, cause: S.cause, hard: S.hardCause, mult: S.multBest, canRescue: canRescue() });
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
const pos = new THREE.Vector3(), fwd = new THREE.Vector3(), sideV = new THREE.Vector3(), look = new THREE.Vector3(), camPos = new THREE.Vector3();
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
  cat.visible = S.state === 'rescue' ? false : p.inv <= 0 || S.state !== 'play' || Math.floor(p.inv * 14) % 2 === 0;
  runCycle(cat, phase * 1.6, p.y > p.gy + .01 ? .3 : .9);

  fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  sideV.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  const leap = S.state === 'dying' ? Math.sin(Math.min(1, S.dieT / .6) * Math.PI) * 1.6 : Math.abs(Math.sin(phase * .8)) * .18;
  const dogAdj = clamp(p.x, -LANE, LANE) - p.x; // Panela se queda en la calle aunque Tinto suba al balcón
  dog.position.copy(pos).addScaledVector(fwd, -S.dogGap).addScaledVector(sideV, S.dogOff + dogAdj).setY(leap);
  dog.rotation.set(0, p.yaw, 0);
  runCycle(dog, phase * 1.1, 1);

  fwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  S.shake = Math.max(0, S.shake - dt);
  const camAdj = clamp(p.x, -3.8, 3.8) - p.x;
  camPos.copy(pos).addScaledVector(sideV, camAdj);
  camera.position.copy(camPos).addScaledVector(fwd, -(S.dogGap + view.back));
  if (!flags.cameraOwner) camera.position.x += (Math.random() - .5) * S.shake;
  camera.position.y = view.h + Math.max(0, cfg.gapMax - S.dogGap) * .55 + (flags.cameraOwner ? 0 : (Math.random() - .5) * S.shake);
  camera.lookAt(look.copy(camPos).addScaledVector(fwd, 9).setY(1));
  if (S.state === 'menu') {
    const tall = camera.aspect < 1;
    camera.position.copy(pos).addScaledVector(fwd, tall ? 4.2 : 3.8).addScaledVector(sideV, tall ? 2.3 : 2.2).setY(1.4);
    camera.lookAt(look.copy(pos).setY(tall ? .45 : .3));
  }
  ground.position.set(pos.x, -.2, pos.z);
  backdrop.position.set(pos.x, 0, pos.z);
  sun.position.set(pos.x + 9, 20, pos.z + 7);
  sun.target.position.copy(pos);
}
function frame(dt, draw = true) {
  $('pause').textContent = S.paused ? '▶' : 'II';
  $('top').style.visibility = S.state === 'menu' ? 'hidden' : 'visible';
  if (!S.paused) {
    if (S.state === 'play' || S.state === 'rescue') update(dt);
    else if (S.state === 'dying') updateDying(dt);
    place(S.state === 'play' || S.state === 'dying' || S.state === 'rescue' ? dt : 0);
  }
  emit('frame', { dt: S.paused ? 0 : dt, phase });
  if (draw) renderer.render(scene, camera);
}
function sim(n, each) {
  muted = true;
  try { for (let i = 0; i < n; i++) { each?.(i); frame(1 / 60, false); } }
  finally { muted = false; }
}
// al esconder la pestaña o cambiar de aplicación: pausa y silencio; al volver, el sonido regresa y la pausa la quita el jugador
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (S.state === 'play' && !S.paused) setPaused(true); ac?.suspend?.(); }
  else ac?.resume?.();
});
let last = 0;
function tick(t) {
  requestAnimationFrame(tick);
  const dt = clamp((t - last) / 1000 || 0, 0, .05);
  last = t;
  frame(dt);
}
// comprueba que cada mundo tenga piezas para las tres celdas básicas (si no, el generador no puede cumplir las invariantes)
function validateWorlds() {
  for (const w of worlds) {
    const wp = w.pieces || {}, missing = [];
    for (const k in wp) if (!PIECES[k]) console.warn(`[piezas] el mundo ${w.id} pesa una pieza que no existe: ${k}`);
    for (const cell of ['S', 'A', 'X']) if (!Object.keys(wp).some(k => PIECES[k] && PIECES[k].cell === cell && wp[k] > 0 && !PIECES[k].full && !PIECES[k].long && !PIECES[k].hard && !(SPEC[k]?.minTier > 0))) missing.push(cell + ' blanda de un carril para el escalón 0');
    if (!Object.keys(wp).some(k => PIECES[k] && PIECES[k].cell === 'A' && PIECES[k].full && wp[k] > 0)) missing.push('A de ancho total');
    if (missing.length) console.warn(`[piezas] al mundo ${w.id} le faltan piezas de celda: ${missing.join(', ')}`);
  }
}

/* ---------- API para los módulos ---------- */
const ROWS = []; // ya no se usa: las filas las arma el generador a partir de las piezas
export const game = {
  THREE, scene, camera, renderer, sun, hemi, view, geo, LANE, HALF, DEPTH,
  part, bake, mat, canvasTex, stripes, leg, makeCat, makeDog, runCycle, rand, pick, clamp,
  BUILD, SPEC, VARIANTS, ROWS, PIECES, piece, protos, vcMat, spawn, addObstacle, block, defaultSide, defaultFacade, defaultRoad, fill: defaultFill, gen, balconyAt,
  worlds, WORLD_DEFAULTS, setWorld, cats, setCat, refreshMenu, validateWorlds,
  rules, cfg, S, p, hooks, flags, store, on, emit, sfx, bark,
  start, reset, end, showMenu, enterSub, exitSub, applyWorld, damage, collect, coins, racha, invuln, calm, capture, rescue, canRescue, hud, setPaused, step: frame, sim,
  input: { move, jump, slide, turn },
  ui: { hud: $('hud'), menu: $('menu'), over: $('over'), top: $('top') },
  get world() { return world; }, get cat() { return cat; }, get catDef() { return catDef; }, dog,
  get cur() { return cur; }, get sub() { return sub; }, get prev() { return prev; }, get phase() { return phase; }, get pos() { return pos; }
};
window.game = game;

setCat(store.get('catRunCat', 'gris'));
setWorld('dia');
reset();
const solo = new URLSearchParams(location.search).get('solo');
for (const name of ['worlds', 'sewer', 'cats', 'models', 'fx', 'levels', 'stats'].filter(n => !solo || n === solo)) {
  try { (await import(`./${name}.js?v=${Date.now()}`)).install(game); }
  catch (e) { if (!/Failed to fetch dynamically imported/i.test(String(e))) console.error(`[módulo ${name}]`, e); }
}
validateWorlds();
setCat(store.get('catRunCat', cats[0].id));
setWorld(worlds.includes(world) ? world.id : worlds[0].id);
emit('ready');
requestAnimationFrame(tick);
