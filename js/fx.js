// Animación y "jugo" de Cat Run: pose raíz del gato, perro, cámara, partículas y efectos de pantalla.
// Todo se aplica en el evento `frame`, DESPUÉS de que el núcleo coloca gato, perro y cámara.
// En pausa no avanza nada; al empezar partida (o volver al menú) se reinicia todo el estado.
export function install(game) {
  const { THREE, scene, camera, renderer, view, dog, S, p, cfg, geo, part, on } = game;
  game.flags.cameraOwner = true; // la cámara (y su sacudida) es de este módulo: el núcleo no la sacude
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const outCubic = t => 1 - Math.pow(1 - t, 3);
  const inOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const outBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const pulse = (t, t0, w) => t < t0 || t > t0 + w ? 0 : Math.pow(Math.sin((t - t0) / w * PI), 2);

  // Muelle amortiguado (Euler semi-implícito, con subpasos si el cuadro es largo)
  const spring = x => ({ x, v: 0 });
  function step(s, target, k, d, dt) {
    const n = dt > .02 ? 3 : 1, h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (k * (target - s.x) - d * s.v) * h; s.x += s.v * h; }
    if (!(s.x === s.x) || !(s.v === s.v)) { s.x = target; s.v = 0; }
  }

  /* ================= Estado ================= */
  let mode = 'menu', T = 0, caught = false, fxT = 0, lastState = S.state, lastVy = 0, speedK = 0;
  const stretch = spring(1), lean = spring(0), slideS = spring(1);
  const camRoll = spring(0), fovS = spring(0), camX = spring(0), camY = spring(0), camBump = spring(0);
  const dogSq = spring(1), dogLunge = spring(0), dogRoll = spring(0), earS = spring(0), tailS = spring(0);
  const flip = { t: -1, dur: .5, dir: 1, hop: 0 };
  const cine = { fresh: false, r0: 10, th0: PI, h0: 4.6, lf: 6, lr: 0, ly: 1, side: 1 };
  let trauma = 0, flash = 0, flashRed = 0, barkT = -9, snapT = 0, dogPh = 0, dogPrevY = 0, landed = false;
  let combo = 0, comboT = 0, comboBest = 0, dustT = 0, dogDustT = 0, starT = 0, confT = 0, linesK = 0, lastFov = -1;
  const comboPunch = spring(0);
  const react = [];

  function resetAll() {
    for (const s of [lean, camRoll, fovS, camY, camBump, dogLunge, dogRoll, earS, tailS, comboPunch]) { s.x = 0; s.v = 0; }
    for (const s of [stretch, slideS, dogSq]) { s.x = 1; s.v = 0; }
    camX.x = p.x || 0; camX.v = 0;
    flip.t = -1; T = 0; caught = false; landed = false; cine.fresh = false;
    trauma = flash = flashRed = 0; barkT = -9; snapT = 0; dogPrevY = 0;
    combo = comboT = comboBest = 0; dustT = dogDustT = starT = confT = 0; linesK = 0; lastVy = 0;
    for (const r of react) restore(r);
    react.length = 0;
    pN = 0; syncParticles();
    lines.visible = false;
    for (const t of texts) { t.on = false; t.el.style.opacity = 0; }
    banner.t = -1; bannerEl.style.opacity = 0;
    setCombo(0);
    screen();
  }

  /* ================= Gato: adopción del modelo ================= */
  let catRef = null, body = null;
  const base = new THREE.Vector3(1, 1, 1), bodyBase = new THREE.Vector3(1, 1, 1);
  function adopt(c) {
    catRef = c;
    base.copy(c.scale); // escala raíz base: se lee una sola vez por modelo
    c.rotation.order = 'YXZ'; // giro, luego cabeceo y balanceo en ejes propios
    body = c.userData && c.userData.body && c.userData.body.isObject3D ? c.userData.body : null;
    if (body) bodyBase.copy(body.scale);
    stretch.x = 1; stretch.v = 0; slideS.x = 1; slideS.v = 0;
  }

  /* ================= Perro: aparejo (cabeza, orejas, mandíbula, lengua, punta de cola) ================= */
  const dBase = dog.scale.x, du = dog.userData, dLegs = du.legs || [], dTail = du.tail || null;
  dog.rotation.order = 'YXZ';
  const head = new THREE.Group(), jaw = new THREE.Group(), tongue = new THREE.Group(), tailTip = new THREE.Group();
  const ears = [];
  if (du.body) {
    const b = du.body, shadow = m => { m.castShadow = true; return m; };
    head.position.set(0, 1.45, -.85); // pivote en el cuello
    for (const m of b.children.slice()) {
      if (!m.isMesh || m.position.z > -1 || m.position.y < 1.3) continue; // solo piezas de la cabeza
      const ear = Math.abs(Math.abs(m.position.x) - .5) < .01;
      m.position.sub(head.position);
      if (ear) { // cada oreja cuelga de un pivote arriba para poder aletear
        const piv = new THREE.Group();
        piv.position.set(m.position.x, m.position.y + .24, m.position.z);
        piv.userData.side = Math.sign(m.position.x);
        m.position.set(0, -.24, 0);
        piv.add(m); head.add(piv); ears.push(piv);
      } else head.add(m);
    }
    b.add(head);
    jaw.position.set(0, -.07, -.42);
    shadow(part(geo.BALL, 0xffffff, .56, .2, .52, 0, -.03, -.22, jaw));
    part(geo.BALL, 0x8c1f2f, .42, .1, .4, 0, .05, -.2, jaw); // interior de la boca
    head.add(jaw);
    tongue.position.set(.2, .03, -.3);
    part(geo.BALL, 0xff6f91, .52, .06, .2, .26, 0, 0, tongue); // lengua por un lado, al viento
    jaw.add(tongue);
    if (dTail) {
      tailTip.position.set(0, .42, 0);
      shadow(part(geo.CAP, 0xb86a2c, .15, .15, .15, 0, .15, 0, tailTip));
      shadow(part(geo.BALL, 0xffffff, .21, .21, .21, 0, .36, 0, tailTip));
      dTail.add(tailTip);
    }
  }
  du.rig = { head, jaw, tongue, tailTip, ears }; // para que el integrador de modelos pueda colgar aquí las piezas de Panela

  /* ================= Partículas: un solo THREE.Points con pool fijo ================= */
  const MAXP = 640;
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3), pDat = new Float32Array(MAXP * 4);
  const pVel = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP), pMax = new Float32Array(MAXP);
  const pS0 = new Float32Array(MAXP), pS1 = new Float32Array(MAXP), pA = new Float32Array(MAXP);
  const pGrav = new Float32Array(MAXP), pDrag = new Float32Array(MAXP), pSpin = new Float32Array(MAXP);
  let pN = 0;
  const pGeo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pPos, 3), aCol = new THREE.BufferAttribute(pCol, 3), aDat = new THREE.BufferAttribute(pDat, 4);
  for (const a of [aPos, aCol, aDat]) a.setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('position', aPos); pGeo.setAttribute('aColor', aCol); pGeo.setAttribute('aData', aDat);
  pGeo.setDrawRange(0, 0);
  // aData = (tamaño en metros, alfa, forma, giro) · formas: 0 polvo, 1 destello (aditivo), 2 confeti, 3 anillo, 4 estrella
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uH: { value: 600 } },
    vertexShader: `
      attribute vec3 aColor; attribute vec4 aData; uniform float uH;
      varying vec3 vC; varying vec3 vD;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aData.x * uH * projectionMatrix[1][1] * 0.5 / max(0.2, -mv.z), 0.0, 220.0);
        vC = aColor; vD = aData.yzw;
      }`,
    fragmentShader: `
      varying vec3 vC; varying vec3 vD;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float sh = vD.y, a = 0.0, add = 0.0, c = cos(vD.z), s = sin(vD.z);
        vec2 r = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
        if (sh < 0.5) a = smoothstep(0.5, 0.1, length(q));
        else if (sh < 1.5) { a = clamp(1.0 - abs(r.x) * abs(r.y) * 70.0 - dot(r, r) * 3.2, 0.0, 1.0); a *= a; add = 1.0; }
        else if (sh < 2.5) { r.y /= max(0.18, abs(cos(vD.z * 2.3))); a = step(abs(r.x), 0.32) * step(abs(r.y), 0.2); }
        else if (sh < 3.5) { float l = length(q); a = smoothstep(0.5, 0.45, l) * smoothstep(0.3, 0.42, l); }
        else {
          float an = atan(r.y, r.x), m = abs(mod(an, 1.2566) - 0.6283) / 0.6283, e = mix(0.47, 0.2, m);
          a = smoothstep(e, e - 0.05, length(r));
        }
        a *= vD.x;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vC * a, a * (1.0 - add * 0.85));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false; points.renderOrder = 5; points.visible = false;
  scene.add(points);

  const C = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const COL = {
    dust: C(0xe9dcc6), gold: C(0xffd23f), gold2: C(0xfff3a8), white: C(0xffffff), pink: C(0xff8fb8), green: C(0x7dffb0),
    star: C(0xffe14f), orange: C(0xff9a3c),
    conf: [C(0xff4d5e), C(0xffd23f), C(0x5be39a), C(0x4fb8ff), C(0xc77dff), C(0xff8a3c), C(0xffffff)]
  };
  function emit(x, y, z, vx, vy, vz, life, s0, s1, col, shape, grav, drag, alpha, spin, k = 1) {
    if (pN >= MAXP) return;
    const i = pN++, i3 = i * 3, i4 = i * 4;
    pPos[i3] = x; pPos[i3 + 1] = y; pPos[i3 + 2] = z;
    pVel[i3] = vx; pVel[i3 + 1] = vy; pVel[i3 + 2] = vz;
    pCol[i3] = col[0] * k; pCol[i3 + 1] = col[1] * k; pCol[i3 + 2] = col[2] * k;
    pLife[i] = pMax[i] = life; pS0[i] = s0; pS1[i] = s1; pA[i] = alpha;
    pGrav[i] = grav; pDrag[i] = drag; pSpin[i] = spin;
    pDat[i4] = s0; pDat[i4 + 1] = 0; pDat[i4 + 2] = shape; pDat[i4 + 3] = Math.random() * TAU;
  }
  function updateParticles(dt) {
    for (let i = 0; i < pN; i++) {
      pLife[i] -= dt;
      if (pLife[i] <= 0) { // el último ocupa el hueco: el pool nunca crece ni se fragmenta
        const j = --pN;
        if (i !== j) {
          const i3 = i * 3, j3 = j * 3, i4 = i * 4, j4 = j * 4;
          for (let c = 0; c < 3; c++) { pPos[i3 + c] = pPos[j3 + c]; pVel[i3 + c] = pVel[j3 + c]; pCol[i3 + c] = pCol[j3 + c]; }
          for (let c = 0; c < 4; c++) pDat[i4 + c] = pDat[j4 + c];
          pLife[i] = pLife[j]; pMax[i] = pMax[j]; pS0[i] = pS0[j]; pS1[i] = pS1[j]; pA[i] = pA[j];
          pGrav[i] = pGrav[j]; pDrag[i] = pDrag[j]; pSpin[i] = pSpin[j];
        }
        i--; continue;
      }
      const i3 = i * 3, i4 = i * 4, u = 1 - pLife[i] / pMax[i], dr = Math.max(0, 1 - pDrag[i] * dt);
      pVel[i3] *= dr; pVel[i3 + 2] *= dr; pVel[i3 + 1] = pVel[i3 + 1] * dr - pGrav[i] * dt;
      pPos[i3] += pVel[i3] * dt; pPos[i3 + 1] += pVel[i3 + 1] * dt; pPos[i3 + 2] += pVel[i3 + 2] * dt;
      if (pPos[i3 + 1] < .03 && pGrav[i] > 0) { pPos[i3 + 1] = .03; pVel[i3 + 1] *= -.35; } // rebote suave en el piso
      pDat[i4] = lerp(pS0[i], pS1[i], 1 - (1 - u) * (1 - u));
      pDat[i4 + 1] = pA[i] * (u < .08 ? u / .08 : 1 - Math.pow((u - .08) / .92, 2));
      pDat[i4 + 3] += pSpin[i] * dt;
    }
    syncParticles();
  }
  function syncParticles() {
    points.visible = pN > 0;
    pGeo.setDrawRange(0, pN);
    if (pN) { aPos.needsUpdate = aCol.needsUpdate = aDat.needsUpdate = true; }
  }

  // vectores de trabajo (sin crear objetos por cuadro)
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), v3 = new THREE.Vector3(), look = new THREE.Vector3();
  const lum = () => clamp(game.hemi.intensity / 2.1, .4, 1); // el polvo no recibe luz: se oscurece a mano de noche
  const curV = () => S.state === 'play' ? S.speed * p.slow : 0;

  function dust(x, y, z, n, out, up, size, carry) {
    const k = lum(), v = curV() * carry;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = rnd(.4, 1) * out;
      emit(x + Math.cos(a) * .15, y + .08, z + Math.sin(a) * .15, Math.cos(a) * r + fwd.x * v, rnd(.3, 1) * up, Math.sin(a) * r + fwd.z * v,
        rnd(.35, .6), size * .45, size * rnd(1, 1.5), COL.dust, 0, -.4, 2.2, rnd(.3, .5), 0, k);
    }
  }
  function sparkle(x, y, z, n, col, col2, speed, carry) {
    const v = curV() * carry;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, e = rnd(-.4, 1), r = Math.sqrt(1 - Math.min(1, e * e)) * speed * rnd(.5, 1);
      emit(x, y, z, Math.cos(a) * r + fwd.x * v, e * speed * .8 + 1.5, Math.sin(a) * r + fwd.z * v,
        rnd(.3, .55), rnd(.5, .8), .08, i % 2 ? col : col2, 1, 6, 2.5, 1, rnd(-6, 6));
    }
  }
  function ring(x, y, z, col, s1, life, carry) {
    const v = curV() * carry;
    emit(x, y, z, fwd.x * v, 0, fwd.z * v, life, .4, s1, col, 3, 0, 0, .9, 0);
  }
  function stars(x, y, z, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = speed * rnd(.5, 1), v = curV() * .7;
      emit(x, y, z, Math.cos(a) * r + fwd.x * v, rnd(3, 7), Math.sin(a) * r + fwd.z * v,
        rnd(.6, 1), rnd(.45, .7), .2, i % 3 ? COL.star : COL.white, 4, 14, .8, 1, rnd(-9, 9));
    }
  }
  function confetti(x, y, z, n, spread, up) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = rnd(.2, 1) * spread;
      emit(x + Math.cos(a) * .5, y, z + Math.sin(a) * .5, Math.cos(a) * r, rnd(.5, 1) * up, Math.sin(a) * r,
        rnd(1.8, 3), rnd(.22, .34), .2, COL.conf[(Math.random() * COL.conf.length) | 0], 2, 7, 1.7, 1, rnd(-7, 7));
    }
  }

  /* ================= Líneas de velocidad: una malla de cintas en el espacio de la cámara ================= */
  const NL = 36, lPos = new Float32Array(NL * 12), lCol = new Float32Array(NL * 16), lIdx = [], lSt = [];
  for (let i = 0; i < NL; i++) {
    lIdx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3);
    lSt.push({ a: Math.random() * TAU, r: rnd(2.4, 5.2), z: rnd(-16, 1), len: rnd(1.5, 4), w: rnd(.015, .04) });
    for (let k = 0; k < 4; k++) lCol.set([1, 1, 1, 0], i * 16 + k * 4);
  }
  const lGeo = new THREE.BufferGeometry();
  const laPos = new THREE.BufferAttribute(lPos, 3), laCol = new THREE.BufferAttribute(lCol, 4);
  laPos.setUsage(THREE.DynamicDrawUsage); laCol.setUsage(THREE.DynamicDrawUsage);
  lGeo.setAttribute('position', laPos); lGeo.setAttribute('color', laCol); lGeo.setIndex(lIdx);
  const lines = new THREE.Mesh(lGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false,
    depthTest: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
  lines.frustumCulled = false; lines.renderOrder = 6; lines.visible = false;
  scene.add(lines);
  function updateLines(dt, v) {
    const target = mode === 'play' ? sat((v - 19) / 12) : 0;
    linesK += (target - linesK) * Math.min(1, dt * 3);
    if (linesK < .02) { lines.visible = false; return; }
    lines.visible = true;
    lines.position.copy(camera.position); lines.quaternion.copy(camera.quaternion);
    const sp = v * 1.5 + 14;
    for (let i = 0; i < NL; i++) {
      const s = lSt[i];
      s.z += sp * dt;
      if (s.z > 1.5) { s.z = rnd(-18, -13); s.a = Math.random() * TAU; s.r = rnd(2.4, 5.2); s.len = rnd(1.5, 4) * (1 + linesK); }
      const cx = Math.cos(s.a), sy = Math.sin(s.a), x = cx * s.r, y = sy * s.r * .7, tx = -sy * s.w, ty = cx * s.w, o = i * 12;
      lPos[o] = x - tx; lPos[o + 1] = y - ty; lPos[o + 2] = s.z;
      lPos[o + 3] = x + tx; lPos[o + 4] = y + ty; lPos[o + 5] = s.z;
      lPos[o + 6] = x; lPos[o + 7] = y; lPos[o + 8] = s.z - s.len;
      lPos[o + 9] = x; lPos[o + 10] = y; lPos[o + 11] = s.z - s.len;
      const a = linesK * .55 * sat((s.z + 18) / 4);
      lCol[i * 16 + 3] = a; lCol[i * 16 + 7] = a;
    }
    laPos.needsUpdate = laCol.needsUpdate = true;
  }

  /* ================= Pantalla (DOM, sin recibir toques) ================= */
  const css = document.createElement('style');
  css.textContent = `
    #fx { position: fixed; inset: 0; pointer-events: none; overflow: hidden; contain: strict; }
    #fx * { pointer-events: none; }
    #fx-vig { position: absolute; inset: 0; opacity: 0; background: radial-gradient(ellipse at center, transparent 52%, rgba(6,8,20,.85) 118%); }
    #fx-red { position: absolute; inset: 0; opacity: 0; background: radial-gradient(ellipse at center, transparent 38%, rgba(255,40,60,.75) 115%); }
    #fx-flash { position: absolute; inset: 0; opacity: 0; background: #fff; }
    .fx-bar { position: absolute; left: 0; right: 0; height: 9vh; background: #05060c; will-change: transform; }
    #fx-b1 { top: 0; transform: translateY(-101%); } #fx-b2 { bottom: 0; transform: translateY(101%); }
    .fx-t { position: absolute; left: 0; top: 0; opacity: 0; white-space: nowrap; font-weight: 900; font-style: italic; will-change: transform, opacity;
      font-size: clamp(22px, 5.2vw, 40px); color: #fff; -webkit-text-stroke: 1.5px #2a1a00; text-shadow: 2px 3px 0 #2a1a00; }
    .fx-t.gold { color: #ffd23f; } .fx-t.pink { color: #ff9cc4; } .fx-t.red { color: #ff5a4f; } .fx-t.green { color: #7dffb0; }
    .fx-t.big { font-size: clamp(30px, 8vw, 62px); -webkit-text-stroke: 2px #2a1a00; text-shadow: 3px 4px 0 #2a1a00; }
    #fx-combo { position: absolute; right: 4%; top: 30%; opacity: 0; text-align: center; font-weight: 900; font-style: italic; color: #ffd23f;
      transform-origin: 80% 50%; -webkit-text-stroke: 2px #2a1a00; text-shadow: 3px 4px 0 #2a1a00; line-height: .9; will-change: transform, opacity; }
    #fx-combo b { display: block; font-size: clamp(38px, 11vw, 76px); }
    #fx-combo small { display: block; font-size: clamp(13px, 3.4vw, 22px); color: #fff; letter-spacing: 2px; -webkit-text-stroke: 1px #2a1a00; }
    #fx-combo i { display: block; height: 5px; margin: 6px auto 0; width: 80%; background: #ffd23f; border-radius: 3px; box-shadow: 0 2px 0 #2a1a00; transform-origin: 50% 50%; }
    #fx-combo.hot { color: #ff8a3c; } #fx-combo.fire { color: #ff4d5e; }
    #fx-banner { position: absolute; left: 0; right: 0; top: 27%; opacity: 0; text-align: center; font-weight: 900; font-style: italic;
      font-size: clamp(34px, 10vw, 84px); color: #fff; -webkit-text-stroke: 2.5px #2a1a00; text-shadow: 4px 5px 0 #2a1a00, 0 0 28px #ffb84f; will-change: transform, opacity; }
  `;
  document.head.appendChild(css);
  const mk = (tag, id, cls, parent) => { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; parent.appendChild(e); return e; };
  const root = document.createElement('div');
  root.id = 'fx'; root.setAttribute('aria-hidden', 'true');
  const hudEl = game.ui && game.ui.hud;
  if (hudEl && hudEl.parentNode) hudEl.parentNode.insertBefore(root, hudEl); else document.body.appendChild(root); // debajo del HUD y de los menús
  const vigEl = mk('div', 'fx-vig', '', root), redEl = mk('div', 'fx-red', '', root);
  const b1 = mk('div', 'fx-b1', 'fx-bar', root), b2 = mk('div', 'fx-b2', 'fx-bar', root);
  const comboEl = mk('div', 'fx-combo', '', root), comboNum = mk('b', '', '', comboEl), comboLbl = mk('small', '', '', comboEl), comboBar = mk('i', '', '', comboEl);
  comboLbl.textContent = 'RACHA';
  const bannerEl = mk('div', 'fx-banner', '', root), banner = { t: -1, dur: 1.5 };
  const texts = [];
  for (let i = 0; i < 12; i++) texts.push({ el: mk('div', '', 'fx-t', root), on: false, t: 0, dur: 1, x: 0, y: 0, rise: 70, rot: 0, sc: 1 });
  const flashEl = mk('div', 'fx-flash', '', root);
  // escribir estilos solo cuando cambian
  const cache = new Map();
  function sty(el, prop, val) {
    let c = cache.get(el);
    if (!c) cache.set(el, c = {});
    if (c[prop] !== val) { c[prop] = val; el.style[prop] = val; }
  }
  const op = v => (Math.round(sat(v) * 50) / 50).toString();

  function toScreen(x, y, z) {
    camera.updateMatrixWorld();
    v3.set(x, y, z).project(camera);
    const w = window.innerWidth, h = window.innerHeight;
    let sx = (v3.x * .5 + .5) * w, sy = (-v3.y * .5 + .5) * h;
    if (!(sx === sx) || !(sy === sy) || v3.z > 1) { sx = w / 2; sy = h * .45; }
    v3.set(clamp(sx, 40, w - 40), clamp(sy, 70, h - 60), 0);
    return v3;
  }
  let textI = 0;
  function floatText(str, wx, wy, wz, cls = '', dur = .8, rise = 70, sc = 1) {
    const t = texts[textI = (textI + 1) % texts.length], s = toScreen(wx, wy, wz);
    t.on = true; t.t = 0; t.dur = dur; t.rise = rise; t.sc = sc;
    t.x = s.x + rnd(-14, 14); t.y = s.y; t.rot = rnd(-10, 10);
    if (t.str !== str) { t.str = str; t.el.textContent = str; }
    if (t.cls !== cls) { t.cls = cls; t.el.className = 'fx-t ' + cls; }
  }
  function showBanner(str) {
    banner.t = 0;
    bannerEl.textContent = str;
  }
  let comboShown = -1;
  function setCombo(n) {
    if (n === comboShown) return;
    comboShown = n;
    if (n >= 2) { comboNum.textContent = 'x' + n; comboEl.className = n >= 5 ? 'fire' : n >= 3 ? 'hot' : ''; }
  }
  comboLbl.textContent = 'PUNTOS';
  // avance de la racha hacia el siguiente escalón del multiplicador
  function multProgress() {
    const steps = cfg.multSteps, m = S.mult;
    if (m > steps.length) return 1;
    const lo = m > 1 ? steps[m - 2] : 0, hi = steps[m - 1];
    return sat((S.racha - lo) / (hi - lo));
  }
  function screen() {
    const cin = mode === 'dying' || mode === 'lost' || mode === 'won' ? inOutCubic(sat(T / .5)) : 0;
    sty(vigEl, 'opacity', op(linesK * .5 + cin * .55 + (mode === 'play' && p.slide > 0 ? .15 : 0)));
    sty(redEl, 'opacity', op(flashRed));
    sty(flashEl, 'opacity', op(flash));
    const by = Math.round((1 - cin) * 101);
    sty(b1, 'transform', `translateY(${-by}%)`); sty(b2, 'transform', `translateY(${by}%)`);
    // racha
    if (S.mult >= 2 && mode === 'play') {
      const s = 1 + clamp(comboPunch.x, -.3, .9);
      setCombo(S.mult);
      sty(comboEl, 'opacity', '1');
      sty(comboEl, 'transform', `rotate(${(-7 + comboPunch.x * 14).toFixed(1)}deg) scale(${s.toFixed(3)})`);
      sty(comboBar, 'transform', `scaleX(${multProgress().toFixed(2)})`);
    } else sty(comboEl, 'opacity', '0');
    // cartel de hito
    if (banner.t >= 0) {
      const u = banner.t / banner.dur, s = u < .25 ? outBack(u / .25) : 1 + (u - .25) * .12;
      sty(bannerEl, 'opacity', op(u > .7 ? 1 - (u - .7) / .3 : 1));
      sty(bannerEl, 'transform', `translateY(${(-u * 30).toFixed(1)}px) rotate(-5deg) scale(${Math.max(0, s).toFixed(3)})`);
    } else sty(bannerEl, 'opacity', '0');
    for (const t of texts) {
      if (!t.on) continue;
      const u = t.t / t.dur, s = t.sc * (u < .22 ? outBack(u / .22) : 1 - Math.max(0, u - .75) * .8);
      t.el.style.opacity = op(u > .65 ? 1 - (u - .65) / .35 : 1);
      t.el.style.transform = `translate3d(${t.x.toFixed(1)}px,${(t.y - outCubic(u) * t.rise).toFixed(1)}px,0) translate(-50%,-50%) rotate(${t.rot.toFixed(1)}deg) scale(${Math.max(0, s).toFixed(3)})`;
    }
  }
  function screenTick(dt) {
    flash = Math.max(0, flash - dt * 5);
    flashRed = Math.max(0, flashRed - dt * 1.6);
    if (banner.t >= 0) { banner.t += dt; if (banner.t >= banner.dur) banner.t = -1; }
    for (const t of texts) if (t.on) { t.t += dt; if (t.t >= t.dur) { t.on = false; t.el.style.opacity = 0; } }
    step(comboPunch, 0, 240, 11, dt);
    screen();
  }

  /* ================= Obstáculos golpeados: gelatina y pirueta ================= */
  function restore(r) {
    if (!r.mesh) return;
    if (!r.fly) { r.mesh.rotation.z = 0; r.mesh.scale.set(1, 1, 1); }
  }
  function updateReact(dt) {
    for (let i = react.length - 1; i >= 0; i--) {
      const r = react[i], m = r.mesh;
      r.t += dt;
      if (r.t >= r.dur || !m.parent) { restore(r); react.splice(i, 1); continue; }
      const w = Math.exp(-6 * r.t) * Math.sin(r.t * 30);
      if (r.fly) { // el núcleo lo manda hacia adelante: se le suma pirueta y un golpe de escala
        m.rotation.z += dt * 7 * r.side; m.rotation.y += dt * 5 * r.side;
        if (m.visible) m.scale.setScalar(1 + w * .3);
      } else { // pesado: tiembla como gelatina y vuelve a su sitio
        m.rotation.z = w * .1 * r.side;
        m.scale.set(1 + w * .07, 1 - w * .09, 1 + w * .07);
      }
    }
  }
  // monedas y ratones con vida propia (el núcleo ya gira las monedas y hace saltar a los ratones)
  function animObs(list, near) {
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.hit) continue;
      if (o.type === 'moneda') {
        const m = o.mesh, d = near ? o.s - p.s : 99;
        m.position.y = .14 + .17 * Math.sin(fxT * 3.2 + o.s * .55); // ola a lo largo de la fila
        m.scale.setScalar((1 + .07 * Math.sin(fxT * 6.5 + o.s * .55)) * (d > -1 && d < 7 ? 1.32 - .32 * Math.abs(d) / 7 : 1)); // se hinchan al acercarse
      } else if (o.type === 'raton') {
        const m = o.mesh, h = sat(m.position.y / .3), d = near ? o.s - p.s : 99;
        m.scale.set(1.14 - .24 * h, .8 + .42 * h, 1.14 - .24 * h); // se aplasta al tocar el piso y se estira en el aire
        m.rotation.z = d > 0 && d < 11 ? Math.sin(fxT * 34 + o.s) * .16 * (1 - d / 11) : 0; // tiembla de susto
      }
    }
  }

  /* ================= Gato ================= */
  function catPose(dt, phase, v) {
    const c = game.cat;
    if (!c) return;
    if (c !== catRef) adopt(c);
    const yaw = c.rotation.y, dx = p.lane * 3 - p.x, cH = .75 * base.y;
    let tgt = 1, addY = 0, rx = 0, ry = 0, flipA = 0, wide = 0, flat = false;

    if (mode === 'play') {
      if (p.fall > 0) { // cae por la alcantarilla: se afina, gira y sale disparado
        const f = Math.sin(sat(p.fall / .5) * PI);
        wide = -.3 * f; ry += (1 - sat(p.fall / .5)) * TAU; tgt = 1 + .25 * f;
      } else if (p.y > 0) tgt = 1 + clamp(Math.abs(p.vy) * .013, 0, .2); // se estira según la velocidad vertical
      else if (p.slide <= 0) { addY = Math.abs(Math.sin(phase * 1.6)) * .06 * base.y; rx = -(.05 + speedK * .1); } // trote e inclinación con la velocidad
      step(lean, -clamp(dx * .12, -.42, .42), 170, 12, dt); // se inclina hacia el carril al que va (con rebote)
      ry -= clamp(dx * .08, -.3, .3);
    } else step(lean, 0, 120, 14, dt);

    if (flip.t >= 0) { // voltereta: hacia atrás al chocar, hacia adelante en el salto doble
      flip.t += dt;
      const u = flip.t / flip.dur;
      if (u >= 1) { flip.t = -1; stretch.v -= 3.5; }
      else { flipA = flip.dir * TAU * outCubic(u); addY += Math.sin(u * PI) * flip.hop; }
    }

    if (mode === 'dying' || mode === 'lost') {
      if (!caught) tgt = .86;
      else if (T < .3) { tgt = 1.32; addY += Math.sin(T / .3 * PI) * .45; ry += Math.sin(T * 40) * .12; } // susto: pega un brinco
      else if (T >= .5) { tgt = .26; flat = true; } // el perro le cae encima: tortilla
    } else if (mode === 'won') { // celebra: giro completo y brincos
      const h = Math.abs(Math.sin(T * 5.2));
      addY += h * .85 * sat(T * 3); tgt = 1 + (h - .45) * .34;
      ry += TAU * inOutCubic(sat(T / .8));
    } else if (mode === 'menu') tgt = 1 + Math.sin(fxT * 2.4) * .02; // respira

    step(stretch, tgt, 260, 13, dt);
    const sy = clamp(stretch.x, .2, 1.7), sxz = (flat ? clamp(1.9 - sy * 1.5, 1, 1.55) : clamp(1 / Math.sqrt(sy), .72, 1.5)) + wide;
    c.scale.set(base.x * sxz, base.y * sy, base.z * sxz);
    c.rotation.set(rx + flipA, yaw + ry, lean.x);
    if (flipA) { // gira alrededor del centro del cuerpo, no de las patas
      const sn = Math.sin(flipA) * cH;
      c.position.x -= Math.sin(yaw) * sn; c.position.z -= Math.cos(yaw) * sn; c.position.y += cH * (1 - Math.cos(flipA));
    }
    c.position.y += addY;

    if (body) { // deslizada con muelle en vez de corte seco (el núcleo pone .5 o 1 cada cuadro)
      step(slideS, body.scale.y, 300, 17, dt);
      const sv = clamp(slideS.x, .3, 1.3);
      body.scale.y = sv;
      body.scale.z = bodyBase.z * (1 + (1 - sv) * .45);
      body.scale.x = bodyBase.x * (1 + (1 - sv) * .2);
    }
  }

  /* ================= Perro ================= */
  function dogPose(dt, v) {
    const m = mode === 'play' ? clamp(v / 16, 0, 1.25) : 0;
    dogPh += dt * (9 + v * .45) * (m > 0 ? 1 : 0);
    const g = dogPh;
    let y = dog.position.y, pitch = 0, stretchZ = 1, headX = 0, headZ = 0, jawOpen = 0, tailX = .9, wagAmp = .45, wagRate = 13, sqT = 1, back = 0;
    const legs = (a, b, c, d) => { if (dLegs.length === 4) { dLegs[0].rotation.x = a; dLegs[1].rotation.x = b; dLegs[2].rotation.x = c; dLegs[3].rotation.x = d; } };

    if (mode === 'play') { // galope: una fase de vuelo por zancada, lomo que cabecea y se estira
      const sn = Math.sin(g - 1), up = .5 + .5 * sn;
      y = Math.pow(up, 1.4) * .32 * m;
      pitch = Math.cos(g - 1) * .1 * m;
      stretchZ = 1 + .07 * sn * m;
      legs(Math.sin(g) * 1.05, Math.sin(g + .55) * 1.05, Math.sin(g + 2.6) * 1.1, Math.sin(g + 3.15) * 1.1);
      headX = -pitch * .85 + Math.sin(g - 1.9) * .05 * m; // la cabeza compensa y llega tarde
      jawOpen = .14 + .05 * Math.sin(fxT * 15);
      const near = sat((4 - S.dogGap) / 2); // cuanto más cerca del gato, más excitado
      wagAmp = .45 + near * .4; wagRate = 13 + near * 9;
      if (near > .3) { snapT -= dt; if (snapT <= 0) { snapT = rnd(.7, 1.5); barkT = .16; } } // tarascadas al aire
    } else if (mode === 'dying') {
      const u = sat(T / .6);
      if (T < .12) sqT = .74; // anticipación: se agacha antes del salto
      else if (u < 1) {
        sqT = 1.2; pitch = Math.cos(u * PI) * .42;
        const k = Math.sin(u * PI);
        legs(1.15 * k, 1.05 * k, -1.05 * k, -.95 * k); // patas estiradas en el aire
        jawOpen = .8 * k;
      } else { legs(0, 0, 0, 0); jawOpen = .3 + .12 * Math.sin(fxT * 17); wagAmp = .9; wagRate = 24; headX = .15; }
      if (u < .2) legs(0, 0, .4, .4);
    } else if (mode === 'lost') { // encima del gato, jadeando y moviendo la cola
      legs(0, 0, 0, 0); y = 0;
      sqT = 1 + Math.sin(fxT * 9) * .025;
      jawOpen = .32 + .12 * Math.sin(fxT * 17); wagAmp = .9; wagRate = 22;
      headX = .12 + Math.sin(fxT * 2.1) * .06; headZ = Math.sin(fxT * 1.3) * .1;
    } else if (mode === 'won') { // se queda atrás, derrotado: cabeza y cola caídas
      const k = outCubic(sat(T / .9));
      legs(0, 0, 0, 0);
      back = 2.6 * k; headX = -.4 * k; tailX = .9 + 1.2 * k; wagAmp = .08; wagRate = 4;
      sqT = .94 + Math.sin(fxT * 5) * .02; jawOpen = .25 + .1 * Math.sin(fxT * 10);
      y = 0;
    } else { // menú: quieto, respirando
      legs(0, 0, 0, 0);
      sqT = 1 + Math.sin(fxT * 2.2) * .02; wagAmp = .35; wagRate = 5; jawOpen = .18 + .06 * Math.sin(fxT * 8);
      headZ = Math.sin(fxT * .7) * .08; y = 0;
    }

    if (barkT > -5) { // ladrido: dos golpes de mandíbula con la cabeza arriba
      barkT += dt;
      const o = pulse(barkT, 0, .15) + pulse(barkT, .17, .17);
      jawOpen = Math.max(jawOpen, o); headX += o * .3;
      if (barkT > .4) barkT = -9;
    }

    // muelles: aplastado/estirado, embestida, balanceo, orejas y cola con seguimiento
    step(dogSq, sqT, 220, mode === 'play' ? 14 : 9, dt);
    step(dogLunge, 0, 90, 9, dt);
    step(dogRoll, clamp(S.dogOff * .07, -.3, .3), 120, 11, dt);
    const hv = dt > 0 ? clamp((y - dogPrevY) / dt, -8, 8) : 0;
    dogPrevY = y;
    step(earS, clamp(-hv * .32, -.25, 1.2), 150, 8, dt);
    step(tailS, clamp(-hv * .16, -.6, .6), 110, 7, dt);

    fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const sq = clamp(dogSq.x, .45, 1.5), xz = dBase / Math.sqrt(sq);
    dog.scale.set(xz, dBase * sq, xz * stretchZ);
    dog.position.y = y;
    dog.position.addScaledVector(fwd, clamp(dogLunge.x, -.5, 1.1) - back);
    dog.rotation.set(pitch - clamp(dogLunge.x, -.3, 1) * .12, p.yaw + clamp(S.dogOff * .09, -.5, .5), dogRoll.x);

    head.rotation.set(headX, 0, headZ);
    jaw.rotation.x = -clamp(jawOpen, 0, 1) * .75;
    tongue.rotation.set(0, -.55 * m + Math.sin(fxT * 17) * .22 * (m + .3), -.3 + Math.sin(fxT * 11) * .12 - jawOpen * .3);
    const wind = -.3 * m;
    for (const e of ears) e.rotation.set(wind + earS.x * -.25, 0, e.userData.side * clamp(earS.x + .12 * m, -.2, 1.25));
    if (dTail) {
      const wag = fxT * wagRate;
      dTail.rotation.set(tailX + tailS.x, 0, Math.sin(wag) * wagAmp);
      tailTip.rotation.set(tailS.x * 1.6, 0, Math.sin(wag - 1) * wagAmp * 1.3); // la punta llega tarde
    }
  }

  /* ================= Cámara ================= */
  const noise = (t, a, b, ph) => (Math.sin(t * a + ph) + Math.sin(t * b + ph * 2.3)) * .5;
  function cam(dt, v) {
    fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    right.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const pos = game.pos, cinematic = mode === 'dying' || mode === 'lost' || mode === 'won';
    let fovT = speedK * 8 + (mode === 'play' && p.slide > 0 ? 2.5 : 0);

    if (cinematic) {
      if (cine.fresh) { // se parte de donde el núcleo dejó la cámara: sin salto
        cine.fresh = false;
        const rx = camera.position.x - pos.x, rz = camera.position.z - pos.z;
        cine.side = p.x > 0 ? -1 : 1; // rodea por el lado con más calle
        cine.r0 = Math.hypot(rx, rz) || 8;
        cine.th0 = cine.side * Math.abs(Math.atan2(rx * right.x + rz * right.z, rx * fwd.x + rz * fwd.z));
        cine.h0 = camera.position.y;
        camera.getWorldDirection(v3);
        look.copy(camera.position).addScaledVector(v3, 10).sub(pos);
        cine.lf = look.x * fwd.x + look.z * fwd.z; cine.lr = look.x * right.x + look.z * right.z; cine.ly = look.y + pos.y;
      }
      const won = mode === 'won', dur = won ? 1.7 : 1.15, u = inOutCubic(sat(T / dur)), ur = outCubic(sat(T / dur));
      const th1 = cine.side * (won ? .55 : 2.1), th = lerp(cine.th0, th1, u) + cine.side * Math.sin(Math.max(0, T - dur) * .45) * .22;
      const r = lerp(cine.r0, won ? 6 : 6.4, ur), h = lerp(cine.h0, won ? 2.3 : 2.8, u);
      const lat = clamp(p.x + Math.sin(th) * r, -6.3, 6.3) - p.x; // no meterse en las fachadas
      camera.position.copy(pos).addScaledVector(fwd, Math.cos(th) * r).addScaledVector(right, lat);
      camera.position.y = h;
      look.copy(pos).addScaledVector(fwd, lerp(cine.lf, won ? 0 : -.4, u)).addScaledVector(right, lerp(cine.lr, 0, u));
      look.y = lerp(cine.ly, won ? 1.3 : .9, u);
      camera.lookAt(look);
      fovT = won ? -6 : -9; // se cierra el plano
    } else {
      step(camX, p.x, 70, 15, dt); // la cámara llega tarde al carril
      step(camY, Math.max(0, p.y) * .2, 60, 14, dt); // acompaña un poco el salto
      camera.position.addScaledVector(right, clamp((camX.x - p.x) * .5, -1.3, 1.3));
      camera.position.y += camY.x;
    }
    step(camBump, 0, 200, 13, dt);
    camera.position.y += camBump.x;

    // balanceo hacia el lado al que va el gato + sacudida por trauma (ruido suave, no azar por cuadro)
    step(camRoll, mode === 'play' ? -clamp(p.lane * 3 - p.x, -3, 3) * .012 : 0, 120, 10, dt);
    trauma = Math.max(0, trauma - dt * 1.5);
    const sh = trauma * trauma;
    if (sh > .0001) { camera.translateX(noise(fxT, 37, 53, 1) * sh * .55); camera.translateY(noise(fxT, 41, 59, 4) * sh * .4); }
    const roll = camRoll.x + (sh > .0001 ? noise(fxT, 29, 47, 7) * sh * .07 : 0);
    if (roll) camera.rotateZ(roll);

    step(fovS, fovT, 110, 13, dt);
    if (Math.abs(fovS.x - fovT) < .003 && Math.abs(fovS.v) < .003) { fovS.x = fovT; fovS.v = 0; }
    const fov = clamp(view.fov + fovS.x, 30, 112);
    if (fov !== lastFov || camera.fov !== fov) { lastFov = camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  /* ================= Emisores continuos ================= */
  function emitters(dt, v) {
    const pos = game.pos;
    fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    if (mode === 'play') {
      if (p.y <= 0 && p.fall <= 0 && v > 4) { // polvo de las patas (más al deslizar)
        dustT -= dt;
        if (dustT <= 0) {
          const sl = p.slide > 0;
          dustT = sl ? .03 : .075;
          dust(pos.x + fwd.x * -.5, 0, pos.z + fwd.z * -.5, 1, sl ? 1.6 : .8, sl ? 1.2 : .8, sl ? .75 : .5, .35);
        }
      }
      dogDustT -= dt;
      if (dogDustT <= 0 && v > 4) { dogDustT = .1; dust(dog.position.x, 0, dog.position.z, 1, 1, .9, .7, .4); }
      if (p.inv > 0 && catRef) { // estrellitas dando vueltas a la cabeza mientras está aturdido
        starT -= dt;
        if (starT <= 0) {
          starT = .07;
          const a = fxT * 9;
          emit(pos.x + Math.cos(a) * .6, p.y + 2 * base.y / 1.25, pos.z + Math.sin(a) * .6, fwd.x * v, .2, fwd.z * v, .32, .34, .1, COL.star, 4, 0, 0, 1, 5);
        }
      }
    } else if (mode === 'won') {
      confT -= dt;
      if (confT <= 0 && T < 4) { // lluvia de confeti tras la explosión inicial
        confT = .035;
        emit(pos.x + rnd(-5, 5), rnd(5, 7), pos.z + rnd(-5, 5), rnd(-1, 1), rnd(-1, 0), rnd(-1, 1), rnd(2, 3), rnd(.22, .34), .2,
          COL.conf[(Math.random() * COL.conf.length) | 0], 2, 5, 1.7, 1, rnd(-7, 7));
      }
    } else if (mode === 'lost' && caught) {
      starT -= dt;
      if (starT <= 0) { starT = .09; const a = fxT * 6; emit(pos.x + Math.cos(a) * .8, 1.9, pos.z + Math.sin(a) * .8, 0, .15, 0, .4, .36, .1, COL.star, 4, 0, 0, 1, 4); }
    }
    if (mode === 'dying' && !landed && T >= .6) { // el perro aterriza con todo su peso
      landed = true;
      dogSq.x = .58; dogSq.v = 0;
      trauma = 1; flash = .5; camBump.v -= 2.2;
      const x = dog.position.x, z = dog.position.z;
      dust(x, 0, z, 18, 4.5, 1.6, 1.1, 0);
      stars(pos.x, 1, pos.z, 12, 5);
      ring(x, .3, z, COL.white, 6, .35, 0);
      barkT = -.3; // ladra un instante después
      game.sfx(70, .28, 'sine', .16, -30);
      floatText('¡LAMETÓN!', x, 2.6, z, 'big red', 1, 60);
    }
  }

  /* ================= Eventos ================= */
  on('start', () => { resetAll(); milesShown.clear(); mode = 'play'; lastState = 'play'; });
  on('rescueStart', () => { mode = 'play'; caught = false; cine.fresh = false; T = 0; });
  on('jump', e => {
    fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    if (e && e.air > 0) { flip.t = 0; flip.dur = .5; flip.dir = -1; flip.hop = 0; sparkle(game.pos.x, p.y + .6, game.pos.z, 5, COL.white, COL.gold2, 3, .8); }
    else dust(game.pos.x, 0, game.pos.z, 5, 2, 1.2, .6, .3);
    stretch.x = .78; stretch.v = 5.5; // anticipación comprimida en dos cuadros y luego se estira
    fovS.v += 9; camBump.v += .5;
  });
  on('land', () => {
    fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const hard = sat(-lastVy / 20);
    stretch.v -= 5 + hard * 7; // se aplasta según lo fuerte que cae y rebota
    camBump.v -= .6 + hard * 1.4;
    dust(game.pos.x, 0, game.pos.z, 6 + Math.round(hard * 6), 2.2 + hard * 2, .9, .65 + hard * .3, .3);
    game.sfx(95, .07, 'sine', .05 + hard * .05, -40);
  });
  on('slide', () => { stretch.v -= 2.5; fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)); dust(game.pos.x, 0, game.pos.z, 5, 2.4, .8, .7, .4); });
  on('lane', dir => { lean.v -= dir * 3.2; camRoll.v -= dir * .5; dogRoll.v -= dir * .8; });
  on('turn', e => {
    camX.x = p.x; camX.v = 0; // el giro cambia el sistema de coordenadas del tramo
    if (e && e.dir) { lean.v -= e.dir * 6; camRoll.v -= e.dir * 1.1; dogRoll.v -= e.dir * 3; stretch.v -= 1.5; }
  });
  on('hit', o => {
    o = o || {};
    fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const pos = game.pos, big = sat((o.dmg || 20) / 30);
    trauma = Math.min(1, Math.max(trauma, .6 + big * .4));
    flash = .55; flashRed = .7 + big * .3;
    fovS.x -= 4 + big * 3; fovS.v += 20; // golpe de FOV: se cierra de golpe y rebota
    stars(pos.x, Math.max(0, p.y) + 1.2, pos.z, 10, 5);
    emit(pos.x, Math.max(0, p.y) + 1, pos.z, fwd.x * curV(), 0, fwd.z * curV(), .16, 1, 4.5, COL.white, 0, 0, 0, .85, 0);
    ring(pos.x, Math.max(0, p.y) + 1, pos.z, COL.orange, 4.5, .28, .8);
    if (o.type === 'alcantarilla') stretch.v -= 3;
    else { flip.t = 0; flip.dur = .6; flip.dir = 1; flip.hop = .75; stretch.x = .7; stretch.v = 3; }
    // el perro embiste y ladra
    dogLunge.v += 13; dogSq.x = .82; barkT = 0;
    if (!game.sub) floatText(pick(['¡Espérame!', '¡Juguemos!', '¡Tintooo!']), dog.position.x, 3.1, dog.position.z, 'gold', .75, 46); // Panela no amenaza: juega
    if (o.mesh) react.push({ mesh: o.mesh, t: 0, dur: o.fly ? .7 : .65, fly: !!o.fly, side: Math.random() < .5 ? -1 : 1 });
  });
  const pick = a => a[Math.floor(Math.random() * a.length)];
  on('mult', e => { // el multiplicador real lo lleva el núcleo (S.mult); aquí solo se celebra o se lamenta
    const pos = game.pos;
    setCombo(S.mult);
    if (e.up) { comboPunch.v += 9; if (MILES[e.mult] && !milesShown.has(e.mult)) { milesShown.add(e.mult); showBanner(MILES[e.mult]); fovS.v += 14; sparkle(pos.x, p.y + 1.7, pos.z, 16, COL.gold, COL.white, 7, .9); } }
    else floatText('¡Racha perdida!', pos.x, 2.6, pos.z, '', .9, 50, .8);
  });
  on('nearmiss', e => { const pos = game.pos; floatText(pick(['¡Por un pelo!', '¡Uy!', '¡Rozando!', '¡Ni lo tocó!']), pos.x, p.y + 2, pos.z, 'gold', .8, 60, .9); linesK = Math.max(linesK, .6); });
  on('pass', o => { if (o.type !== 'caneca') { const pos = game.pos; floatText('¡Por debajo!', pos.x, 1.6, pos.z, 'gold', .7, 50, .8); } });
  on('bocado', () => showBanner('¡BOCADO LISTO!'));
  on('bocadoUsed', () => { showBanner('¡Se distrajo!'); const pos = game.pos; sparkle(pos.x, 1.2, pos.z, 12, COL.pink, COL.white, 5, .9); });
  on('caneca', e => { const pos = game.pos; floatText(e.charged ? '🗑️ ¡Escondite listo!' : '+10 🐾', pos.x, 2.2, pos.z, 'gold', 1, 60, .9); });
  on('rescue', () => showBanner('¡POR UN PELO!'));
  on('stumble', () => { if (S.danger > 0) floatText('¡Cuidado!', game.pos.x, 2.6, game.pos.z, 'red', .7, 40, .8); });
  const MILES = { 2: '¡BUENA RACHA!', 3: '¡MIAU-RAVILLOSO!', 4: '¡IMPARABLE!', 5: '¡LEYENDA GATUNA!' }; // por escalón del multiplicador, una vez por partida
  on('collect', o => {
    o = o || {};
    fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const pos = game.pos, y = Math.max(0, p.y) + 1.2;
    if (o.type === 'raton') {
      sparkle(pos.x, y, pos.z, 7, COL.pink, COL.white, 4, .85);
      for (let i = 0; i < 4; i++) emit(pos.x + rnd(-.5, .5), y, pos.z + rnd(-.5, .5), fwd.x * curV(), rnd(2, 4), fwd.z * curV(), .6, .3, .1, COL.green, 0, -1, 1, .9, 0);
      ring(pos.x, y, pos.z, COL.pink, 3.2, .3, .85);
      floatText('+1 🐭', pos.x, y + .9, pos.z, 'pink', .8, 64, 1.1);
      stretch.v += 2.2;
    } else {
      sparkle(pos.x, y, pos.z, 6, COL.gold, COL.gold2, 4, .85);
      ring(pos.x, y, pos.z, COL.gold, 2.6, .26, .85);
      floatText('+1', pos.x, y + .7, pos.z, 'gold', .6, 56);
    }
    comboPunch.v += 2;
  });
  const milesShown = new Set();
  on('dying', () => { mode = 'dying'; T = 0; caught = true; landed = false; cine.fresh = true; flip.t = -1; combo = 0; setCombo(0); });
  on('over', e => {
    const won = !!(e && e.won);
    if (won) {
      mode = 'won'; T = 0; cine.fresh = true; flip.t = -1;
      const pos = game.pos;
      confetti(pos.x, 1.5, pos.z, 110, 7, 11);
      flash = .4;
      showBanner('¡LO LOGRASTE!');
    } else {
      if (mode !== 'dying') { T = 0; cine.fresh = true; }
      mode = 'lost';
    }
    combo = 0; setCombo(0);
  });

  /* ================= Bucle ================= */
  on('frame', ({ dt, phase }) => {
    if (S.paused || !(dt >= 0)) return; // en pausa no avanza nada (ni se recoloca nada)
    if (S.state !== lastState) {
      lastState = S.state;
      if (S.state === 'menu') { resetAll(); mode = 'menu'; }
      else if (S.state === 'play' && mode !== 'play') { resetAll(); mode = 'play'; }
    }
    fxT += dt; T += dt;
    const v = curV();
    speedK = mode === 'play' ? Math.pow(sat((v - cfg.baseSpeed) / Math.max(1, cfg.maxSpeed - cfg.baseSpeed)), .7) : 0;
    pMat.uniforms.uH.value = renderer.domElement.height;

    catPose(dt, phase, v);
    dogPose(dt, v);
    const cur = game.cur;
    if (cur) {
      animObs(cur.obs, true);
      for (const k in cur.exits) if (cur.exits[k]) animObs(cur.exits[k].obs, false);
    }
    updateReact(dt);
    cam(dt, v);
    emitters(dt, v);
    updateParticles(dt);
    updateLines(dt, v);
    screenTick(dt);
    lastVy = p.vy;
  });

  // API mínima por si otro módulo quiere pedir efectos (no es obligatoria para nadie)
  game.fx = {
    shake: (a = .6) => { trauma = Math.min(1, Math.max(trauma, a)); },
    flash: (a = .5) => { flash = Math.max(flash, a); },
    text: (str, x, y, z, cls, dur, rise, sc) => floatText(String(str), x, y, z, cls, dur, rise, sc),
    banner: str => showBanner(String(str)),
    burst(kind, x, y, z, n = 8) {
      fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      if (kind === 'polvo') dust(x, y, z, n, 2.5, 1, .7, 0);
      else if (kind === 'estrellas') stars(x, y, z, n, 5);
      else if (kind === 'confeti') confetti(x, y, z, n, 6, 10);
      else if (kind === 'anillo') ring(x, y, z, COL.white, 4, .3, 0);
      else sparkle(x, y, z, n, COL.gold, COL.white, 4, 0);
    },
    get combo() { return S.mult; }, get comboBest() { return S.multBest; },
    get particles() { return pN; }, maxParticles: MAXP
  };

  resetAll();
  mode = S.state === 'play' ? 'play' : 'menu';
}
