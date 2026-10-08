// Mundos de Cat Run (agente Mundos): Pueblo Colonial, Costa Caribe y Ciudad Neón.
// Cada mundo trae arquitectura, calzada, fondo, clima y obstáculos propios. El contrato está en AGENTES.md.
export function install(game) {
  const { THREE: T, scene, hemi, geo, part, mat, canvasTex, stripes, rand, pick, clamp,
    BUILD, SPEC, VARIANTS, piece, addObstacle, spawn, HALF, DEPTH, S, p } = game;
  const { BOX, BALL, CAP, EAR, CYL, SPH, CONE, DISC, RING } = geo;
  const PI = Math.PI, TAU = PI * 2;
  const mod = (a, n) => ((a % n) + n) % n;
  const tint = (m, c) => { m.userData.tint = new T.Color(c); return m; };

  /* ================= Materiales y geometrías compartidas (se crean una vez, nunca por tramo) ================= */
  // piezas que brillan: al fundirse conservan este material y toman el color de userData.tint
  const glowMat = new T.MeshBasicMaterial({ vertexColors: true,
    map: canvasTex(4, 4, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }) });
  const glow = (geometry, color, ...a) => tint(part(geometry, glowMat, ...a), color);
  const basico = (color, extra) => new T.MeshBasicMaterial({ color, side: T.DoubleSide, ...extra });
  const luz = (color, opacity) => basico(color, { transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });

  function tris(pos, col) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    if (col) g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  }
  const rgb = list => list.map(c => new T.Color(c));
  // cuerda de banderines: cuelga del eje X, así que girarla en X la hace ondear
  const banderinGeo = (() => {
    const P = [], C = [], cols = rgb([0xe8456b, 0xf2c230, 0x2f6fd0, 0x2f8f6b, 0xff7a3a, 0xd94fd0, 0xffffff]);
    const sag = x => -.7 * (1 - (x / 7.4) ** 2);
    for (let i = 0; i < 16; i++) {
      const a = -7.3 + i * .91, b = a + .75, m = (a + b) / 2, c = cols[i % 7];
      P.push(a, sag(a), 0, b, sag(b), 0, m, sag(m) - .85, 0);
      for (let k = 0; k < 3; k++) C.push(c.r, c.g, c.b);
    }
    return tris(P, C);
  })();
  const banderinMat = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
  // ave en V: las puntas de las alas están en y = .5, así que escalar en Y es el aleteo (una sola malla por ave)
  const aveGeo = tris([0, 0, -.5, .12, 0, 0, -.12, 0, 0, .12, 0, 0, 0, 0, .45, -.12, 0, 0,
    .1, 0, -.22, 1, .5, .05, .1, 0, .2, -.1, 0, -.22, -.1, 0, .2, -1, .5, .05]);
  const aveMat = basico(0x2b2b3a), alaBlanca = basico(0xf4f4f4);
  // cometa: rombo de dos colores con cola
  const cometaGeo = (() => {
    const P = [0, .9, 0, .6, 0, 0, -.6, 0, 0, .6, 0, 0, 0, -1.1, 0, -.6, 0, 0], C = [];
    const [a, b, c] = rgb([0xe8456b, 0xf2c230, 0x2f6fd0]);
    for (let k = 0; k < 3; k++) C.push(a.r, a.g, a.b);
    for (let k = 0; k < 3; k++) C.push(b.r, b.g, b.b);
    for (let k = 0; k < 4; k++) {
      const y = -1.5 - k * .5, x = k % 2 ? .12 : -.12;
      P.push(x - .2, y + .12, 0, x + .2, y + .12, 0, x, y - .15, 0);
      for (let j = 0; j < 3; j++) C.push(c.r, c.g, c.b);
    }
    return tris(P, C);
  })();

  const tejas = new T.MeshLambertMaterial({ map: (() => {
    const t = canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#b5482f'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) {
        g.fillStyle = pick(['#c4573a', '#a84028', '#bf5030']); g.fillRect(0, y + 1, w, 5);
        g.fillStyle = 'rgba(60,20,10,.45)'; g.fillRect(0, y + 6, w, 2);
      }
      for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(60,20,10,.18)'; g.fillRect(x, 0, 2, h); }
    });
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1, 2);
    return t;
  })() });
  const toldoPlaya = [['#ffffff', '#e8456b'], ['#ffffff', '#1fa7a0'], ['#fff3c4', '#2f6fd0']].map(([a, b]) => new T.MeshLambertMaterial({ map: stripes(a, b) }));
  const franjas = new T.MeshLambertMaterial({ map: stripes('#ffd400', '#111111') });
  const netMat = new T.MeshLambertMaterial({ alphaTest: .4, side: T.DoubleSide, map: canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 2, w, 2);
    for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 1, h);
    for (let y = 5; y < h; y += 6) g.fillRect(0, y, w, 1);
  }) });

  // rótulos de neón: un solo atlas; cada geometría apunta a su casilla
  const ROTULOS = [['AREPAS 24H', '#ff3ec8'], ['MIAU BAR', '#39e6ff'], ['HOTEL LUNA', '#ffd23f'], ['KARAOKE', '#b06bff'],
    ['EMPANADAS', '#ff7a3a'], ['TINTO Y PAN', '#4dff9a'], ['TAXI', '#ffd23f'], ['DISCOTECA', '#ff3355']];
  const atlas = canvasTex(512, 256, g => {
    g.fillStyle = '#07040f'; g.fillRect(0, 0, 512, 256);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 32px "Arial Black", Arial, sans-serif';
    ROTULOS.forEach(([txt, c], i) => {
      const x = (i % 2) * 256, y = Math.floor(i / 2) * 64;
      g.shadowColor = c; g.shadowBlur = 12; g.strokeStyle = c; g.lineWidth = 4; g.strokeRect(x + 8, y + 8, 240, 48);
      g.fillStyle = '#fff'; g.fillText(txt, x + 128, y + 34, 216);
    });
  });
  const rotGeo = ROTULOS.map((_, i) => {
    const g = new T.PlaneGeometry(1, 1), uv = g.attributes.uv, c = i % 2, r = Math.floor(i / 2);
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (c + uv.getX(k)) / 2, (3 - r + uv.getY(k)) / 4);
    return g;
  });
  const signA = basico(0xffffff, { map: atlas }), signB = basico(0xffffff, { map: atlas });
  const holoMat = luz(0xffffff, .9); holoMat.map = atlas;
  const anilloMat = luz(0x39e6ff, .7), hazMat = luz(0xfff2b0, .22);

  /* ================= Texturas de fachada y calzada ================= */
  function fachadaPueblo(g, w, h, rows) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(150,120,80,${rand(.03, .09)})`; g.fillRect(rand(0, w), rand(0, h), rand(8, 30), rand(3, 10)); } // desgaste del adobe
    for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
      const x = c * 32, y = r * 32, ground = r === rows - 1;
      if (ground && c % 2 === rows % 2) { // portón de madera con clavos
        g.fillStyle = '#5a3418'; g.fillRect(x + 6, y + 5, 20, 27);
        g.fillStyle = '#7a4a26'; g.fillRect(x + 8, y + 7, 7, 25); g.fillRect(x + 17, y + 7, 7, 25);
        g.fillStyle = '#d9a520';
        for (const yy of [12, 20, 28]) { g.fillRect(x + 11, y + yy, 2, 2); g.fillRect(x + 20, y + yy, 2, 2); }
        continue;
      }
      g.fillStyle = '#5a3418'; g.fillRect(x + 7, y + 5, 18, ground ? 19 : 22);
      g.fillStyle = Math.random() < .25 ? '#ffe2a0' : '#2b3442'; g.fillRect(x + 9, y + 7, 14, ground ? 15 : 18);
      g.fillStyle = '#5a3418';
      if (ground) for (let k = 0; k < 4; k++) g.fillRect(x + 10 + k * 4, y + 7, 1, 15); // reja torneada
      else { // puerta-ventana con balcón florecido
        g.fillRect(x + 15, y + 7, 2, 18);
        g.fillStyle = '#4a2a14'; g.fillRect(x + 2, y + 27, 28, 3); g.fillRect(x + 2, y + 19, 28, 2);
        for (let k = 0; k < 7; k++) g.fillRect(x + 3 + k * 4, y + 19, 1, 9);
        g.fillStyle = '#3f8f4a'; g.fillRect(x + 3, y + 18, 26, 1);
        for (let k = 0; k < 5; k++) { g.fillStyle = pick(['#e8456b', '#ff7a3a', '#d94fd0', '#ffcc33']); g.fillRect(x + 3 + k * 5 + rand(0, 2), y + 15 + rand(0, 2), 3, 3); }
      }
    }
  }
  function calzadaPueblo(g, w, h) { // empedrado
    g.fillStyle = '#6f675a'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 16; r++) for (let c = -1; c < 17; c++) {
      g.fillStyle = pick(['#a39a88', '#b0a48e', '#948b7b', '#9c907c', '#857d6f', '#b8ad98']);
      g.beginPath(); g.ellipse(c * 16 + (r % 2 ? 8 : 0) + rand(7, 9), r * 16 + 8, rand(6, 7.4), rand(5.6, 6.8), 0, 0, TAU); g.fill();
    }
    for (const x of [w / 3, 2 * w / 3]) for (let r = 0; r < 8; r++) { g.fillStyle = pick(['#c9bea6', '#bdb198']); g.fillRect(x - 5, r * 32 + 2, 10, 28); } // huellas de laja
    g.fillStyle = 'rgba(60,50,40,.35)'; g.fillRect(0, 0, 7, h); g.fillRect(w - 7, 0, 7, h);
  }
  function fachadaPlaya(g, w, h, rows) { // casitas de tabla con postigos de colores
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.07)';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
      const x = c * 32, y = r * 32, col = pick(['#1fa7a0', '#f2b632', '#e8456b', '#2f6fd0', '#ffffff']);
      if (r === rows - 1 && c % 2 === 0) {
        g.fillStyle = col; g.fillRect(x + 8, y + 9, 16, 23);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 8, y + 20, 16, 1); g.fillRect(x + 15, y + 9, 1, 23);
        continue;
      }
      g.fillStyle = '#233040'; g.fillRect(x + 9, y + 10, 14, 15);
      g.fillStyle = col; g.fillRect(x + 4, y + 9, 6, 17); g.fillRect(x + 22, y + 9, 6, 17);
      g.fillStyle = 'rgba(0,0,0,.22)';
      for (let k = 0; k < 5; k++) { g.fillRect(x + 4, y + 11 + k * 3, 6, 1); g.fillRect(x + 22, y + 11 + k * 3, 6, 1); }
    }
    const y = (rows - 1) * 32; // letrero pintado a mano
    g.fillStyle = '#fff6d8'; g.fillRect(30, y + 1, 68, 8);
    g.fillStyle = '#c0392b'; g.font = 'bold 7px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pick(['JUGOS', 'CEVICHE', 'COCO FRÍO', 'AREPA E HUEVO', 'RASPAO', 'PESCADO FRITO']), 64, y + 5.5, 64);
  }
  function calzadaPlaya(g, w, h) { // malecón de tablas
    for (let r = 0; r < 16; r++) {
      g.fillStyle = pick(['#c79a63', '#b98a55', '#d1a56d', '#bf9160', '#ad8250']); g.fillRect(0, r * 16, w, 16);
      g.fillStyle = 'rgba(70,45,20,.55)'; g.fillRect(0, r * 16, w, 2);
      for (const x of [10, w / 3 + 8, 2 * w / 3 - 8, w - 12]) g.fillRect(x, r * 16 + 8, 2, 2);
      g.fillStyle = 'rgba(255,240,200,.14)';
      for (let k = 0; k < 3; k++) g.fillRect(rand(0, w), r * 16 + rand(4, 13), rand(20, 60), 1);
    }
    g.fillStyle = 'rgba(31,167,160,.6)'; g.fillRect(w / 3 - 2, 0, 4, h); g.fillRect(2 * w / 3 - 2, 0, 4, h);
    g.fillStyle = 'rgba(240,222,170,.85)'; // arena que se mete por los bordes
    for (let i = 0; i < 260; i++) g.fillRect(Math.random() < .5 ? rand(0, 14) : w - rand(0, 14), rand(0, h), 2, 2);
  }
  function fachadaNeon(g, w, h, rows) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) for (let c = 0; c < 6; c++) {
      g.fillStyle = '#10121c'; g.fillRect(c * 21 + 3, r * 32 + 6, 17, 20);
      g.fillStyle = Math.random() < .35 ? pick(['#ffd98a', '#8fe9ff', '#ff9ae0']) : '#232a44'; g.fillRect(c * 21 + 4, r * 32 + 7, 15, 18);
    }
  }
  function calzadaNeon(g, w, h) { // asfalto mojado con reflejos
    g.fillStyle = '#14151f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = Math.random() < .5 ? '#1c1e2b' : '#0e0f17'; g.fillRect(rand(0, w), rand(0, h), 3, 3); }
    for (let i = 0; i < 9; i++) {
      const x = rand(0, w), ww = rand(8, 26), gr = g.createLinearGradient(x, 0, x + ww, 0), c = pick(['255,60,200', '40,220,255', '255,180,60', '140,90,255']);
      gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(.5, `rgba(${c},.3)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x, 0, ww, h);
    }
    g.fillStyle = '#39e6ff'; g.fillRect(w / 3 - 2, 0, 4, h / 2); g.fillRect(2 * w / 3 - 2, 0, 4, h / 2);
    g.fillStyle = '#ff3ec8'; g.fillRect(3, 0, 4, h); g.fillRect(w - 7, 0, 4, h);
  }
  const facMat = (fn, rows) => new T.MeshLambertMaterial({ vertexColors: true, map: canvasTex(128, rows * 32, (g, w, h) => fn(g, w, h, rows)) });
  // torre con ventanas que brillan de verdad (mapa emisivo calcado sobre la fachada)
  function torreMat(rows) {
    const lit = Array.from({ length: rows * 6 }, () => Math.random() < .4 ? pick(['#ffd98a', '#ffe9b8', '#8fe9ff', '#ff9ae0', '#ffd98a']) : null);
    const band = pick(['#39e6ff', '#ff3ec8', '#b06bff']);
    const draw = em => (g, w, h) => {
      g.fillStyle = em ? '#000' : '#fff'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < rows; r++) for (let c = 0; c < 6; c++) {
        const x = c * 21 + 3, y = r * 32 + 7, col = lit[r * 6 + c];
        if (!em) { g.fillStyle = '#0c0e16'; g.fillRect(x, y, 17, 20); }
        if (col || !em) { g.fillStyle = col || '#1d2238'; g.fillRect(x + 1, y + 1, 15, 18); }
      }
      g.fillStyle = band;
      for (let r = 0; r < rows; r += 2) g.fillRect(0, r * 32, w, 3);
    };
    const tex = em => { const t = canvasTex(128, rows * 32, draw(em)); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 2); return t; };
    return new T.MeshLambertMaterial({ vertexColors: true, map: tex(false), emissive: 0xffffff, emissiveMap: tex(true) });
  }
  const F = {
    pueblo: { 2: facMat(fachadaPueblo, 2), 3: facMat(fachadaPueblo, 3) },
    playa: { 1: facMat(fachadaPlaya, 1), 2: facMat(fachadaPlaya, 2) },
    neon: [torreMat(4), torreMat(6)]
  };

  /* ================= Piezas de escenario ================= */
  // tejado a dos aguas con la cumbrera paralela a la calle
  function tejado(st, m, x, z, sx, sz, h, a = .32, vuelo = .8) {
    const W = (sx / 2 + vuelo) / Math.cos(a), rise = Math.tan(a) * sx / 2;
    for (const d of [-1, 1])
      part(BOX, m, W, .26, sz + .5, x + d * Math.cos(a) * W / 2, h + rise - Math.sin(a) * W / 2 + .12, z, st).rotation.z = -d * a;
    part(BOX, 0xefe6d2, sx * .5, rise * .55, sz - .2, x, h + rise * .27, z, st); // hastial
  }
  function palma(st, x, z, h, tronco = 0x8a6a40, hojas = [0x2f8f4a, 0x3fa85a]) {
    const dx = rand(-.5, .5), dz = rand(-.5, .5), r = .22 + h * .018;
    for (let k = 0; k < 3; k++) part(CYL, tronco, r - k * .04, h / 3 + .15, r - k * .04, x + dx * k * k * .5, h / 6 + k * h / 3, z + dz * k * k * .5, st);
    const tx = x + dx * 2, tz = z + dz * 2, len = 2.6 + h * .12;
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * TAU + rand(-.25, .25), d = rand(.3, .7), c = Math.cos(d) * len / 2;
      part(CONE, hojas[k % 2], .16, len, 1.1, tx + Math.cos(a) * c, h + .2 - Math.sin(d) * len / 2, tz - Math.sin(a) * c, st).rotation.set(0, a, -PI / 2 - d);
    }
    part(BOX, tronco, .5, .5, .5, tx, h, tz, st);
  }
  // bloques que el núcleo pone en el cruce (esquinas del fondo y lado sin calle): fn(x, z, ancho, largo, lado)
  function esquinas(seg, fn) {
    for (const side of [-1, 1]) {
      const x = side * (HALF + DEPTH / 2);
      fn(x, -(seg.L + HALF + DEPTH / 2), DEPTH, DEPTH, side);
      if (!seg.sides.includes(side)) fn(x, -seg.L, DEPTH, 15, side);
    }
  }
  // piezas animadas de un tramo: se sueltan en segmentRemoved (solo usan geometrías y materiales compartidos)
  const vivos = new Map();
  function anima(seg, obj, fn) {
    seg.g.add(obj);
    if (!vivos.has(seg)) vivos.set(seg, []);
    vivos.get(seg).push(fn);
    return obj;
  }
  game.on('segmentRemoved', seg => vivos.delete(seg));
  game.on('segment', seg => { try { seg.world.ambiente?.(seg); } catch (e) { console.error('[mundos] ambiente', e); } });

  /* ================= Obstáculos ================= */
  const pon = (seg, type, s, lane) => { const o = addObstacle(seg, type, s, lane); o.seg = seg; o.ph = rand(0, TAU); o.x0 = o.x; return o; };
  const pieza = (o, type, x = 0, y = 0, z = 0) => { const m = spawn(type); m.position.set(x, y, z); o.mesh.add(m); return m; };
  // cada pieza declara su celda y su dureza en SPEC; el generador del núcleo decide la forma de la fila. El peso por mundo va en `pieces`.
  const fila = (type, make) => piece(type, { make });
  const cerca = (o, d) => o.seg === game.cur && o.s - p.s < d && o.s > 9;
  const SUELTA = { shadow: false }; // piezas sueltas que se cuelgan de un obstáculo

  // ---------- Pueblo ----------
  BUILD.gallina = g => {
    part(SPH, 0xf4efe6, .5, .5, .7, 0, .45, 0, g);
    part(SPH, 0xf4efe6, .3, .34, .3, 0, .78, -.3, g);
    part(CONE, 0xf2a020, .12, .2, .12, 0, .76, -.5, g).rotation.x = -PI / 2;
    part(BOX, 0xd8322a, .08, .16, .2, 0, .98, -.3, g);
    part(CONE, 0xe8e0d0, .25, .45, .3, 0, .68, .4, g).rotation.x = -.6;
    for (const x of [-.12, .12]) part(BOX, 0xf2a020, .05, .25, .05, x, .12, 0, g);
  };
  SPEC.gallina = { hw: .9, hl: .8, y0: 0, y1: 1.4, collect: true, food: true, shadow: false }; // comida: solo sale en balcones y rutas con riesgo
  const picotea = (o, t) => {
    const m = o.mesh, k = t * 5 + o.ph, u = t * .9 + o.ph;
    o.x = o.x0 + Math.sin(u) * .7; m.position.x = o.x;
    m.position.y = Math.max(0, Math.sin(k * 1.7)) * .18;
    m.rotation.y = o.ph + Math.sin(u) * .8;
    m.rotation.x = -Math.max(0, Math.sin(k)) * .55;
  };
  BUILD.burro = g => {
    const G = 0x8d8378;
    part(BALL, G, .85, .85, 1.8, 0, 1.3, 0, g);
    part(SPH, 0xd9d0c2, .6, .5, 1.2, 0, 1.08, 0, g);
    part(CAP, G, .36, .35, .36, 0, 1.75, -.85, g).rotation.x = -.7;
    part(SPH, G, .45, .5, .85, 0, 2.05, -1.25, g);
    part(SPH, 0xe8e0d4, .36, .34, .4, 0, 1.95, -1.6, g);
    for (const x of [-.16, .16]) { part(EAR, G, .16, .6, .1, x, 2.55, -1, g); part(SPH, 0x111111, .08, .1, .06, x * 1.2, 2.15, -1.52, g); }
    part(BOX, 0x5f574f, .08, .5, .08, 0, 1.5, .95, g).rotation.x = -.4;
    part(BOX, 0xc0392b, .95, .1, .8, 0, 1.75, 0, g); // manta
    for (const x of [-.62, .62]) { // canastos de café
      part(CYL, 0xb98a4a, .55, .7, .55, x, 1.4, 0, g);
      for (let k = 0; k < 4; k++) part(BOX, k % 2 ? 0xc0392b : 0x7a1f1f, .18, .18, .18, x + rand(-.12, .12), 1.8, rand(-.15, .15), g);
    }
  };
  SPEC.burro = { hw: 1.2, hl: .6, y0: 0, y1: 2.4, cell: 'M', move: true };
  BUILD.pataBurro = g => { part(CAP, 0x8d8378, .2, .42, .2, 0, -.45, 0, g); part(BOX, 0x3a342e, .22, .16, .26, 0, -.92, 0, g); };
  const camina = (o, t) => {
    const u = t * o.w + o.ph, m = o.mesh;
    o.x = Math.sin(u) * 3.4; m.position.x = o.x;
    m.rotation.y = Math.cos(u) > 0 ? -PI / 2 : PI / 2;
    m.position.y = Math.abs(Math.sin(t * 6)) * .05;
    o.patas.forEach((l, i) => l.rotation.x = Math.sin(t * 6 + (i % 2 ? PI : 0)) * .5);
  };
  BUILD.chiva = g => {
    part(BOX, 0xf2c230, 2.5, .7, 9, 0, .95, 0, g);
    part(BOX, 0x2f5fa8, 2.52, .35, 9.02, 0, 1.45, 0, g);
    part(BOX, 0xd8433b, 2.54, .25, 9.04, 0, 1.75, 0, g);
    for (let k = 0; k < 6; k++) part(BOX, 0x7a4a2a, 2.3, .5, .25, 0, 2, -3.6 + k * 1.45, g); // bancas
    for (const x of [-1.2, 1.2]) for (let k = 0; k < 7; k++) part(BOX, 0xd8433b, .1, 1.3, .1, x, 2.5, -4.4 + k * 1.45, g);
    part(BOX, 0x2f8f6b, 2.6, .18, 9.2, 0, 3.2, 0, g);
    part(BOX, 0xf2c230, 2.2, .1, 8.6, 0, 3.32, 0, g);
    for (let k = 0; k < 5; k++) part(pick([BOX, SPH]), pick([0xb98a4a, 0xc9a45c, 0x7fc241, 0xe8d29a]), rand(.7, 1.1), rand(.5, .8), rand(.8, 1.3), rand(-.6, .6), 3.7, -3.4 + k * 1.7, g); // bultos y racimos
    part(BOX, 0x23283a, 2.3, .8, .1, 0, 2.5, -4.5, g);
    for (const x of [-.85, .85]) { part(BOX, 0xfff2a8, .4, .25, .1, x, 1, -4.52, g); part(BOX, 0xff3030, .4, .2, .1, x, 1, 4.52, g); }
    for (const x of [-1.25, 1.25]) for (const z of [-3, 3]) part(CYL, 0x15151a, 1.1, .3, 1.1, x, .55, z, g).rotation.z = PI / 2;
  };
  SPEC.chiva = { hw: 1.25, hl: 4.5, y0: .6, y1: 4.2, cell: 'A', hard: true, long: true }; // agachado se pasa por debajo
  const tiembla = (o, t) => { o.mesh.position.y = Math.sin(t * 28 + o.ph) * .02; o.mesh.rotation.z = Math.sin(t * 3 + o.ph) * .01; };
  BUILD.balon = g => {
    part(SPH, 0xffffff, .8, .8, .8, 0, 0, 0, g);
    for (const [x, y, z] of [[.3, .2, .2], [-.3, .1, -.25], [0, -.35, .15], [.1, .3, -.3], [-.2, -.2, .3], [.25, -.2, -.3]]) part(SPH, 0x1a1a1f, .3, .3, .3, x, y, z, g);
  };
  SPEC.balon = { hw: .45, hl: .45, y0: 0, y1: .8, cell: 'M', move: true, fly: true };
  // pelota que cruza la calle rebotando: su caja de choque sube y baja con ella
  const rebota = (r, alto, vx) => (o, t, dt) => {
    const u = (t * .9 + o.ph) % 1, y = r + 4 * alto * u * (1 - u), m = o.mesh;
    o.x = Math.sin(t * vx + o.ph) * 3.8; m.position.x = o.x; m.position.y = y;
    o.y0 = y - r; o.y1 = y + r;
    m.rotation.x -= dt * 6; m.rotation.z -= dt * 2;
  };
  BUILD.tendedero = g => {
    for (const x of [-4.6, 4.6]) part(BOX, 0x6b4a2f, .16, 3, .16, x, 1.5, 0, g);
    part(BOX, 0xe8e0d0, 9.2, .04, .04, 0, 2.85, 0, g);
  };
  SPEC.tendedero = { hw: 5, hl: .2, y0: 1.15, y1: 3, cell: 'A', full: true, fly: true };
  BUILD.ropa = (g, v) => { // cuelga de y = 0 hacia abajo
    const cols = [0xe8456b, 0x2f6fd0, 0xffffff, 0xf2b632, 0x2f8f6b, 0xd94fd0, 0xff7a3a];
    for (let x = -4, i = v; x < 3.4; i++) {
      const w = rand(.7, 1.5), h = rand(1.1, 1.65);
      part(BOX, cols[i % 7], w, h, .05, x + w / 2, -h / 2, 0, g);
      x += w + rand(.15, .4);
    }
  };
  VARIANTS.ropa = 3;
  SPEC.ropa = SPEC.pataBurro = SUELTA;

  fila('gallina', (seg, s, lane, y = 0) => { // comida (no entra en los patrones): la coloca el núcleo en balcones
    const o = addObstacle(seg, 'gallina', s, lane, y); o.ph = rand(0, TAU); o.x0 = o.x;
    o.mesh.rotation.order = 'YXZ'; o.animate = picotea; return o;
  });
  fila('burro', (seg, s) => {
    const o = pon(seg, 'burro', s, 0);
    o.w = rand(.35, .55);
    o.patas = [[-.28, -.6], [.28, -.6], [.28, .6], [-.28, .6]].map(([x, z]) => pieza(o, 'pataBurro', x, 1, z));
    o.animate = camina; return o;
  });
  fila('chiva', (seg, s, lane) => { const o = pon(seg, 'chiva', s, lane); o.animate = tiembla; return o; });
  fila('balon', (seg, s) => { const o = pon(seg, 'balon', s, 0); o.animate = rebota(.4, 2.4, .8); return o; });
  fila('tendedero', (seg, s) => {
    const o = pon(seg, 'tendedero', s, 0);
    o.ropa = pieza(o, 'ropa', 0, 2.85, 0);
    o.animate = (o, t) => { o.ropa.rotation.x = Math.sin(t * 2.2 + o.ph) * .22; };
    return o;
  });

  // ---------- Costa ----------
  BUILD.cangrejo = g => {
    const R = 0xe2492f;
    part(SPH, R, 1, .4, .7, 0, .35, 0, g);
    for (const x of [-1, 1]) {
      part(BOX, R, .3, .26, .26, x * .62, .6, -.3, g).rotation.z = .5; part(CONE, 0xf26b4a, .22, .3, .22, x * .7, .86, -.36, g); // tenazas
      part(BOX, 0x1a1a1f, .06, .22, .06, x * .2, .62, -.3, g); part(BOX, 0xffffff, .12, .12, .12, x * .2, .76, -.3, g); // ojos
      for (let k = 0; k < 3; k++) part(BOX, 0xb5381f, .4, .07, .07, x * .65, .2, -.1 + k * .2, g).rotation.z = -x * .6;
    }
  };
  SPEC.cangrejo = { hw: .9, hl: .8, y0: 0, y1: 1.2, collect: true, food: true, shadow: false }; // comida de los balcones de la costa
  const escurre = (o, t) => {
    const m = o.mesh;
    o.x = clamp(o.x0 + Math.sin(t * 2.4 + o.ph) * 1.7, -4, 4); m.position.x = o.x;
    m.position.y = Math.abs(Math.sin(t * 14 + o.ph)) * .06; m.rotation.z = Math.sin(t * 14 + o.ph) * .08;
  };
  BUILD.coco = g => {
    part(SPH, 0x6b4a2f, .75, .7, .75, 0, 0, 0, g); part(SPH, 0x8a6a40, .3, .3, .1, 0, 0, -.35, g);
    for (const x of [-.12, .12]) part(SPH, 0x2a1a0f, .1, .1, .08, x, .08, -.37, g);
  };
  SPEC.coco = { hw: .42, hl: .42, y0: 0, y1: .78, cell: 'S', fly: true, minTier: 1 }; // rueda hacia el gato: no en el escalón 0
  // viene rodando hacia el gato cuando lo tiene cerca
  const rueda = (vel, dist) => (o, t, dt) => {
    if (!cerca(o, dist)) return;
    o.s -= vel * dt; o.mesh.position.z = -o.s; o.mesh.rotation.x += dt * vel / .37;
  };
  BUILD.sombrilla = (g, v) => {
    const c = [0xe8456b, 0x2f6fd0, 0xf2b632][v % 3];
    part(CYL, 0xf0f0f0, .08, 2.6, .08, 0, 1.3, 0, g);
    part(EAR, c, 3.2, .7, 3.2, 0, 2.7, 0, g); part(EAR, 0xffffff, 1.5, .34, 1.5, 0, 2.92, 0, g);
    part(BOX, 0xffffff, .7, .08, 1.6, .7, .45, .1, g); part(BOX, c, .7, .08, .8, .7, .75, .75, g).rotation.x = -.9; // asoleadora
    for (const z of [-.5, .6]) part(BOX, 0x8a6a40, .6, .4, .06, .7, .22, z, g);
    part(SPH, 0xff7a3a, .4, .4, .4, -.7, .2, .4, g);
  };
  VARIANTS.sombrilla = 3;
  SPEC.sombrilla = { hw: 1.2, hl: 1.1, y0: 0, y1: 3, cell: 'X' };
  BUILD.lancha = (g, v) => {
    const c = [0x2f6fd0, 0xe8456b, 0x1fa7a0][v % 3];
    part(BOX, c, 2.2, .9, 5, 0, .85, .4, g);
    part(BOX, 0xffffff, 2.3, .14, 5.1, 0, 1.3, .4, g);
    part(BOX, c, 1.55, .9, 1.55, 0, .85, -2.1, g).rotation.y = PI / 4; // proa
    for (const z of [0, 1.6]) part(BOX, 0x8a6a40, 2, .1, .5, 0, 1.2, z, g);
    part(BOX, 0x333842, .5, .7, .4, 0, 1.3, 3, g); // motor
    for (const z of [-1, 1.8]) part(CYL, 0x8a6a40, .4, 2.8, .4, 0, .2, z, g).rotation.z = PI / 2; // troncos
    part(SPH, 0xf2f2f2, 1.2, .5, 1.4, .2, 1.5, .8, g); // atarraya
  };
  VARIANTS.lancha = 3;
  SPEC.lancha = { hw: 1.2, hl: 3, y0: 0, y1: 2.2, cell: 'X', hard: true };
  BUILD.red = g => { // malla de voleibol: por debajo
    for (const x of [-4.6, 4.6]) { part(CYL, 0xf2f2f2, .16, 2.9, .16, x, 1.45, 0, g); part(SPH, 0xe8456b, .3, .3, .3, x, 2.95, 0, g); }
    part(BOX, netMat, 9.1, 1.6, .03, 0, 2, 0, g);
  };
  SPEC.red = { hw: 5, hl: .2, y0: 1.15, y1: 3, cell: 'A', full: true, fly: true, shadow: false };
  BUILD.surf = (g, v) => {
    const c = [0xff7a3a, 0x1fa7a0, 0xf2e24a][v % 3], b = new T.Group();
    b.rotation.set(-.12, 0, rand(-.1, .1)); g.add(b);
    part(SPH, c, .8, 2.9, .14, 0, 1.4, 0, b); part(SPH, 0xffffff, .2, 2.7, .16, 0, 1.4, 0, b);
    part(BOX, 0x23283a, .1, .35, .3, 0, .5, .15, b);
    part(SPH, 0xead7a4, 1.1, .3, .9, 0, .05, 0, g);
  };
  VARIANTS.surf = 3;
  SPEC.surf = { hw: .5, hl: .3, y0: 0, y1: 2.8, cell: 'X', fly: true };
  BUILD.castillo = g => {
    const A = 0xe3c88a, B = 0xd2b574;
    part(BOX, A, 1.8, .5, 1.8, 0, .25, 0, g); part(BOX, B, 1.1, .4, 1.1, 0, .7, 0, g);
    for (const x of [-.8, .8]) for (const z of [-.8, .8]) { part(CYL, A, .5, .8, .5, x, .4, z, g); part(EAR, B, .56, .35, .56, x, .97, z, g); }
    part(BOX, 0x6b4a2f, .04, .5, .04, 0, 1.1, 0, g); part(BOX, 0xe8456b, .3, .18, .03, .16, 1.26, 0, g);
    part(SPH, 0x2f6fd0, .3, .3, .3, 1.1, .15, .9, g); part(BOX, 0xf2b632, .1, .1, .5, -1.1, .08, .8, g);
  };
  SPEC.castillo = { hw: 1, hl: 1, y0: 0, y1: 1, cell: 'S', fly: true };
  BUILD.pelota = g => {
    part(SPH, 0xffffff, 1, 1, 1, 0, 0, 0, g);
    [0xe8456b, 0x2f6fd0, 0xf2b632].forEach((c, i) => part(SPH, c, 1.03, 1.03, .3, 0, 0, 0, g).rotation.y = i * PI / 3);
  };
  SPEC.pelota = { hw: .55, hl: .55, y0: 0, y1: 1, cell: 'M', move: true, fly: true };
  BUILD.gaviota = g => { // viene de frente: mira hacia +Z
    part(SPH, 0xffffff, .45, .4, 1, 0, 0, 0, g); part(SPH, 0xffffff, .32, .32, .36, 0, .12, .55, g);
    part(CONE, 0xf2a020, .12, .3, .12, 0, .1, .82, g).rotation.x = PI / 2;
    for (const x of [-.1, .1]) part(SPH, 0x111111, .06, .06, .06, x, .2, .68, g);
    part(BOX, 0xcfd3da, .3, .05, .4, 0, 0, -.6, g);
  };
  SPEC.gaviota = { hw: .9, hl: .5, y0: 1.05, y1: 1.95, cell: 'A', fly: true, minTier: 2 }; // viene de frente: no antes del escalón 2
  const planea = (o, t, dt) => {
    o.alas.scale.y = Math.sin(t * 11 + o.ph) * 1.5;
    o.mesh.position.y = 1.5 + Math.sin(t * 3 + o.ph) * .08;
    if (cerca(o, 50)) { o.s -= 9 * dt; o.mesh.position.z = -o.s; }
  };

  fila('cangrejo', (seg, s, lane, y = 0) => { const o = addObstacle(seg, 'cangrejo', s, lane, y); o.ph = rand(0, TAU); o.x0 = o.x; o.seg = seg; o.animate = y > 0 ? null : escurre; return o; });
  fila('coco', (seg, s, lane) => { const o = pon(seg, 'coco', s, lane); o.mesh.position.y = .37; o.animate = rueda(6, 40); return o; });
  fila('sombrilla', (seg, s, lane) => { const o = pon(seg, 'sombrilla', s, lane); o.animate = (o, t) => { o.mesh.rotation.z = Math.sin(t * 1.6 + o.ph) * .035; }; return o; });
  fila('lancha', (seg, s, lane) => pon(seg, 'lancha', s, lane));
  fila('red', (seg, s) => { const o = pon(seg, 'red', s, 0); o.animate = (o, t) => { o.mesh.rotation.x = Math.sin(t * 1.8 + o.ph) * .04; }; return o; });
  fila('surf', (seg, s, lane) => pon(seg, 'surf', s, lane));
  fila('castillo', (seg, s, lane) => pon(seg, 'castillo', s, lane));
  fila('pelota', (seg, s) => { const o = pon(seg, 'pelota', s, 0); o.animate = rebota(.5, 2.9, 1.1); return o; });
  fila('gaviota', (seg, s, lane) => {
    const o = pon(seg, 'gaviota', s, lane);
    o.mesh.position.y = 1.5;
    o.alas = new T.Mesh(aveGeo, alaBlanca); o.alas.scale.set(1.6, 1, 1.5); o.mesh.add(o.alas);
    o.animate = planea; return o;
  });

  // ---------- Neón ----------
  BUILD.moto = g => { // viene de frente con la farola encendida
    for (const z of [-.75, .75]) part(CYL, 0x111116, .7, .16, .7, 0, .35, z, g).rotation.z = PI / 2;
    part(BOX, 0xd8433b, .34, .4, 1.3, 0, .7, 0, g); part(BOX, 0x1a1a22, .3, .12, .7, 0, .95, -.3, g);
    part(BOX, 0x333842, .7, .06, .06, 0, 1.15, .55, g);
    glow(SPH, 0xfff6c0, .26, .26, .12, 0, .95, .78, g);
    part(BOX, 0x2a2d3a, .42, .6, .3, 0, 1.35, -.1, g).rotation.x = .25; // piloto
    part(SPH, 0xf2f2f2, .36, .36, .38, 0, 1.82, .08, g); glow(BOX, 0x39e6ff, .3, .1, .06, 0, 1.82, .27, g);
    part(BOX, 0xff7a1f, .6, .55, .55, 0, 1.25, -.72, g); glow(BOX, 0xff3ec8, .5, .06, .02, 0, 1.25, -1, g); // caja del domicilio
  };
  SPEC.moto = { hw: .55, hl: 1.1, y0: 0, y1: 2, cell: 'X', hard: true, minTier: 2 }; // viene de frente y es dura: no antes del escalón 2
  const acelera = (o, t, dt) => {
    o.mesh.rotation.z = Math.sin(t * 3 + o.ph) * .08;
    if (cerca(o, 45)) { o.s -= 11 * dt; o.mesh.position.z = -o.s; }
  };
  BUILD.dron = g => {
    part(BOX, 0x23283a, .7, .22, .7, 0, 0, 0, g); glow(SPH, 0xff3030, .2, .2, .2, 0, -.05, -.36, g);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      part(BOX, 0x4a4f5c, .55, .06, .08, x * .42, .05, z * .42, g).rotation.y = -x * z * PI / 4;
      part(CYL, 0x15151a, .12, .14, .12, x * .65, .12, z * .65, g);
    }
    part(BOX, 0x15151a, .3, .2, .3, 0, -.2, 0, g); glow(BOX, 0x39e6ff, .5, .04, .5, 0, -.12, 0, g);
  };
  SPEC.dron = { hw: .85, hl: .6, y0: 1.05, y1: 2.05, cell: 'M', move: true, fly: true };
  // dos juegos de hélices cruzados que se alternan cada cuadro: parece que giran y cuesta una sola malla
  const helice = lado => g => { for (const x of [-.65, .65]) for (const z of [-.65, .65]) part(BOX, 0xcfd3da, lado ? .7 : .08, .02, lado ? .08 : .7, x, .2, z, g); };
  BUILD.heliceA = helice(1); BUILD.heliceB = helice(0);
  const patrulla = (o, t) => {
    const u = t * o.w + o.ph, m = o.mesh, f = Math.floor(t * 30) % 2;
    o.x = Math.sin(u) * 3.6; m.position.x = o.x;
    m.position.y = 1.55 + Math.sin(t * 4 + o.ph) * .1;
    m.rotation.z = -Math.cos(u) * .25 * Math.sign(o.w);
    o.hA.visible = !f; o.hB.visible = !!f;
  };
  BUILD.barrera = g => {
    part(BOX, 0x333842, .5, 1.5, .5, -4.9, .75, 0, g); glow(BOX, 0xff3030, .3, .16, .3, -4.9, 1.6, 0, g);
    part(BOX, 0x333842, .25, 1.2, .25, 4.7, .6, 0, g);
  };
  BUILD.pluma = g => { part(BOX, franjas, 9.4, .24, .14, 4.7, 0, 0, g); part(BOX, 0x333842, .7, .4, .3, -.3, 0, 0, g); };
  SPEC.barrera = { hw: 5, hl: .25, y0: .95, y1: 1.5, cell: 'T', full: true, timed: true };
  // talanquera que sube y baja: solo choca cuando está abajo
  const sube = (o, t) => {
    const a = clamp(Math.sin(t * 1.9 + o.ph) * 1.5 + .35, 0, 1) * 1.3, baja = a < .22;
    o.pluma.rotation.z = a;
    o.y0 = baja ? .95 : -9; o.y1 = baja ? 1.5 : -8;
  };
  BUILD.laser = g => {
    for (const x of [-4.7, 4.7]) { part(BOX, 0x23283a, .4, 2.7, .4, x, 1.35, 0, g); glow(BOX, 0xff3ec8, .44, .08, .44, x, 2.72, 0, g); }
  };
  BUILD.rayoBajo = g => { glow(BOX, 0x4dff9a, 9, .12, .12, 0, .32, 0, g); glow(BOX, 0x4dff9a, 9, .06, .06, 0, .12, 0, g); };
  BUILD.rayoAlto = g => { for (const y of [1.25, 1.75, 2.25]) glow(BOX, 0xff3355, 9, .1, .1, 0, y, 0, g); };
  SPEC.laser = { hw: 5, hl: .2, y0: 0, y1: .55, cell: 'T', full: true, timed: true, shadow: false };
  // rayo verde abajo (saltar) y rojo arriba (deslizarse) se turnan; parpadea antes de cambiar
  const alterna = (o, t) => {
    const u = (t * .5 + o.ph) % 1, bajo = u < .5, on = u % .5 < .4 || Math.floor(t * 14) % 2 === 0;
    o.bajo.visible = bajo && on; o.alto.visible = !bajo && on;
    o.y0 = bajo ? 0 : 1.1; o.y1 = bajo ? .55 : 2.5;
  };
  BUILD.charco = g => { // cable caído sobre un charco
    part(DISC, 0x1c2a55, 2.3, 1, 1.25, 0, .03, 0, g); part(DISC, 0x2b4a8f, 1.6, 1, .8, .2, .04, .1, g);
    part(BOX, 0x15151a, 2.6, .08, .08, -1.6, .08, .3, g).rotation.y = .5;
    glow(BOX, 0xfff36a, .16, .16, .16, -.5, .12, -.1, g);
  };
  SPEC.charco = { hw: 2.4, hl: 1.1, y0: -1, y1: .2, cell: 'S', lanes: 2, shadow: false }; // charco de dos carriles: se salta
  BUILD.chispa = g => {
    for (let k = 0; k < 3; k++) glow(BOX, 0xfff36a, .9, .06, .06, 0, 0, 0, g).rotation.set(k, k * 2.1, k * 1.3);
    glow(BOX, 0x8fe9ff, .5, .05, .05, .2, .2, 0, g).rotation.z = 1;
  };
  const chisporrotea = o => {
    const c = o.chispa;
    c.visible = Math.random() < .55;
    if (c.visible) { c.position.set(rand(-1.6, 1.6), rand(.2, .7), rand(-.8, .8)); c.rotation.set(rand(0, 6), rand(0, 6), 0); c.scale.setScalar(rand(.5, 1.2)); }
  };
  // carro que cambia de carril una y otra vez (el tercer carril siempre queda libre)
  const culebrea = (o, t) => {
    const u = t * 1.3 + o.ph, k = clamp(Math.sin(u) * 3, -1, 1);
    o.x = o.x0 + o.dir * 1.5 * (1 + k); o.mesh.position.x = o.x;
    o.mesh.rotation.y = Math.abs(k) < 1 ? -o.dir * Math.cos(u) * .22 : 0;
  };
  SPEC.heliceA = SPEC.heliceB = SPEC.pluma = SPEC.rayoBajo = SPEC.rayoAlto = SPEC.chispa = SUELTA;

  fila('moto', (seg, s, lane) => {
    const o = pon(seg, 'moto', s, lane);
    part(DISC, hazMat, 1.1, 1, 2.6, 0, .05, 3.2, o.mesh); // charco de luz de la farola
    o.animate = acelera; return o;
  });
  fila('dron', (seg, s) => {
    const o = pon(seg, 'dron', s, 0);
    o.mesh.position.y = 1.55; o.w = rand(1, 1.5) * pick([-1, 1]);
    o.hA = pieza(o, 'heliceA'); o.hB = pieza(o, 'heliceB');
    o.animate = patrulla; return o;
  });
  fila('barrera', (seg, s) => {
    const o = pon(seg, 'barrera', s, 0);
    o.pluma = pieza(o, 'pluma', -4.7, 1.2, 0); o.animate = sube; return o;
  });
  fila('laser', (seg, s) => {
    const o = pon(seg, 'laser', s, 0);
    o.bajo = pieza(o, 'rayoBajo'); o.alto = pieza(o, 'rayoAlto'); o.animate = alterna; return o;
  });
  fila('charco', (seg, s, lane) => {
    const o = pon(seg, 'charco', s, lane);
    o.chispa = pieza(o, 'chispa', 0, .4, 0); o.animate = chisporrotea; return o;
  });
  SPEC.zigzag = { ...SPEC.carro, cell: 'M', move: true, hard: false }; // carro que cambia de carril: móvil, nunca duro
  BUILD.zigzag = BUILD.carro; VARIANTS.zigzag = 3;
  fila('zigzag', (seg, s) => {
    const o = pon(seg, 'zigzag', s, pick([-1, 1]));
    o.dir = -Math.sign(o.x) || pick([-1, 1]); o.animate = culebrea; return o;
  });

  /* ================= Mundo 1 · Pueblo Colonial ================= */
  const FLORES = [0xe8456b, 0xffb020, 0xd94fd0, 0xff7a3a];
  const pueblo = {
    id: 'pueblo', name: 'Pueblo Viejo', emoji: '🏘️', desc: 'Calles empedradas, gallinas sueltas y día de fiesta', dificultad: 1,
    sky: ['#2f7fe0', '#9fd0f7', '#f7e6c4'], fog: 0xf3e2c2, fogRange: [60, 175], hemi: [0xd6ebff, 0x9a7a5a, 2.1], sun: [0xffe6b8, 2.5],
    tints: [0xfdf8ec, 0xfdf8ec, 0xfaf0d8, 0xf6e3b0, 0xf3d0b0, 0xe4eef2], zocalos: [0x2f7a4a, 0x2f5fa8, 0xb5482f, 0x7a4a2a, 0xd9a520, 0x8a2f4a],
    roof: 0xb5482f, sidewalk: 0xb9ab94, ground: 0x8fae6a, crossing: 0x8f8676, heights: [0],
    // primer mundo: los choques duros cuentan como tropiezo (para no espantar al que empieza); balcones en las fachadas; gallinas de comida arriba
    rules: { hardCrash: false }, balconies: true, food: 'gallina',
    pieces: { valla: 14, alcantarilla: 8, carro: 4, senora: 8, carreta: 10, caja: 8, basura: 4, bolsas: 6, contenedor: 4, poste: 5, zanja: 5, tuboc: 4, hidrante: 3, andamio: 7,
      burro: 10, chiva: 8, balon: 6, tendedero: 7 },
    facade: fachadaPueblo, road: calzadaPueblo,
    side(st, seg, side, s0, end) {
      let s = s0;
      while (s < end - .1) {
        let w = pick([9, 11, 13]);
        if (end - s - w < 8) w = end - s;
        const z = -(s + w / 2), rows = Math.random() < .28 ? 3 : 2, h = rows * 3.2, r = Math.random();
        tint(part(BOX, F.pueblo[rows], DEPTH, h, w, side * (HALF + DEPTH / 2), h / 2, z, st), pick(pueblo.tints));
        tejado(st, tejas, side * (HALF + DEPTH / 2), z, DEPTH, w, h);
        part(BOX, pick(pueblo.zocalos), .16, 1.1, w, side * (HALF + .02), .75, z, st);
        if (game.balconyAt(seg, side, s + w / 2)) { s += w; continue; } // aquí va un balcón por el que se corre: nada en el andén ni a 3 de alto
        if (r < .4) { // balcón volado con materas
          const bw = w * .6, bx = side * (HALF - 1);
          part(BOX, 0x5a3418, 1, .12, bw, side * (HALF - .5), 3.3, z, st);
          part(BOX, 0x5a3418, .08, .1, bw, bx, 4.15, z, st);
          for (let k = 0; k <= 6; k++) part(BOX, 0x5a3418, .07, .8, .07, bx, 3.75, z - bw / 2 + k * bw / 6, st);
          for (let k = 0; k < 4; k++) part(CONE, pick(FLORES), .7, .5, .7, bx, 4.4, z - bw / 2 + (k + .5) * bw / 4, st);
        } else if (r < .62) { // alero de teja sobre columnas de madera
          part(BOX, tejas, 2.3, .16, w - 1, side * (HALF - 1.05), 3.25, z, st).rotation.z = side * .2;
          for (const d of [-1, 1]) part(BOX, 0x5a3418, .16, 3, .16, side * 5.6, 1.5, z + d * (w / 2 - 1), st);
        } else for (let k = 0; k < 2; k++) { // materas en el andén
          const zz = z + (k - .5) * w * .5;
          part(CYL, 0xb5653a, .5, .5, .5, side * 7.1, .45, zz, st);
          part(SPH, pick(FLORES), .6, .5, .6, side * 7.1, .85, zz, st);
        }
        part(BOX, 0x1a1a1f, .5, .08, .08, side * 7.25, 3.7, z + w / 2 - .6, st); // farol de pared
        glow(BOX, 0xffd98a, .28, .4, .28, side * 7, 3.5, z + w / 2 - .6, st);
        s += w;
      }
      for (let t = Math.max(s0, 12) + (side > 0 ? 11 : 0), i = 0; t < end - 4; t += 22, i++) { // guayacanes en flor
        if (game.balconyAt(seg, side, t) || game.balconyAt(seg, side, t + 5)) continue;
        const c = [[0xf7c81e, 0xffdf5a], [0xf08ab0, 0xf7b4cf], [0x3f9a4f, 0x57b862]][(i + (side > 0)) % 3];
        part(CYL, 0x6b4a2f, .3, 2.2, .3, side * 5.3, 1.3, -t, st);
        part(SPH, c[0], 2.3, 2, 2.3, side * 5.3, 3.3, -t, st);
        part(SPH, c[1], 1.6, 1.5, 1.6, side * 5.3 + .3, 4.3, -t - .2, st);
        part(DISC, c[1], 1.3, 1, 1.3, side * 5.6, .215, -t + .4, st); // flores caídas
        part(BOX, 0x6b4a2f, .5, .1, 1.8, side * 6.9, .65, -t - 5, st); // banca
        for (const d of [-.7, .7]) part(BOX, 0x3a2a1c, .4, .45, .1, side * 6.9, .42, -t - 5 + d, st);
      }
    },
    decorate(st, seg) {
      esquinas(seg, (x, z, sx, sz) => tejado(st, tejas, x, z, sx, sz, 6.4));
      // iglesia con campanario detrás de las casas
      const lado = pick([-1, 1]), x = lado * 25, z = -rand(45, seg.L - 60);
      part(BOX, 0xf7f1e3, 6, 15, 6, x, 7.5, z, st);
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) part(BOX, 0xf7f1e3, .9, 3.6, .9, x + dx * 2.55, 16.8, z + dz * 2.55, st);
      part(BOX, 0xb5482f, 6.8, .5, 6.8, x, 18.8, z, st);
      part(EAR, 0xb5482f, 6.4, 3.6, 6.4, x, 20.8, z, st);
      part(BOX, 0x4a2a14, .18, 2, .18, x, 23.4, z, st); part(BOX, 0x4a2a14, 1, .18, .18, x, 23.7, z, st);
      part(BOX, 0x4a2a14, .1, 2.6, 1.3, x - lado * 3.02, 9.5, z, st);
      part(BOX, 0xf7f1e3, 9, 9, 16, x, 4.5, z + 11, st);
      tejado(st, tejas, x, z + 11, 9, 16, 9);
      for (let i = 0; i < 4; i++) palma(st, pick([-1, 1]) * rand(20, 30), -rand(seg.first ? -25 : 28, seg.L - 30), rand(13, 18), 0xcfc6ae, [0x3f7f4a, 0x4f9a5a]); // palmas de cera
      seg.wx = { campana: [x, 17.9, z] };
    },
    ambiente(seg) {
      // guirnaldas de banderines colgadas a lo largo de cada fachada, de farol a farol:
      // así cuelgan de algo, y no cruzan la calle por delante de la cámara
      for (const side of [-1, 1]) for (let s = (seg.first ? -20 : 26) + (side > 0 ? 15 : 0); s < seg.L - 24; s += 30) {
        const hold = new T.Group(), m = new T.Mesh(banderinGeo, banderinMat), ph = rand(0, 6);
        hold.position.set(side * 7.2, 5.3, -s); hold.rotation.y = Math.PI / 2;
        hold.add(m);
        anima(seg, hold, t => { m.rotation.x = Math.sin(t * 2.3 + ph) * .22 + Math.sin(t * 5.1 + ph) * .05; });
      }
      const c = new T.Group(); // campana
      c.position.set(...seg.wx.campana);
      part(EAR, 0xd9a520, 1.7, 1.8, 1.7, 0, -.9, 0, c); part(SPH, 0x7a5a10, .4, .4, .4, 0, -1.8, 0, c);
      anima(seg, c, t => { c.rotation.x = Math.sin(t * 2.4) * .55; });
    },
    backdrop() {
      const lejos = new T.Group(), nubes = new T.Group(), root = new T.Group();
      for (let i = 0; i < 24; i++) { // cordillera en dos planos, con un par de nevados
        const a = i / 24 * TAU + rand(-.1, .1), near = i % 2, R = near ? 255 : 335, h = near ? rand(45, 80) : rand(95, 150), w = near ? rand(90, 140) : rand(110, 170);
        part(EAR, pick(near ? [0x4f8a5a, 0x5f9a62, 0x6fa868] : [0x7fa9a0, 0x8fb8b0, 0x9cc4c0]), w, h, w, Math.cos(a) * R, h / 2 - 4, Math.sin(a) * R, lejos);
        if (!near && h > 135) part(EAR, 0xffffff, w * .24, h * .24, w * .24, Math.cos(a) * R, h * .88 - 4, Math.sin(a) * R, lejos);
      }
      for (let i = 0; i < 9; i++) {
        const a = rand(0, TAU), R = rand(200, 290), y = rand(75, 125), w = rand(30, 50);
        for (let k = 0; k < 3; k++) part(SPH, k ? 0xffffff : 0xe6eef7, w * (k ? .7 : 1), rand(9, 14), rand(18, 26), Math.cos(a) * R + (k - 1) * w * .4, y + (k ? 4 : 0), Math.sin(a) * R + (k - 1) * 6, nubes);
      }
      const n = fundir(nubes);
      root.add(fundir(lejos), n);
      fondo = (t, dt) => { n.rotation.y += dt * .012; };
      return root;
    },
    clima(t, dt) { vuelan(t, dt, 0); vuelanAves(t); }
  };

  /* ================= Mundo 2 · Costa Caribe ================= */
  const PLAYA = [0xe8456b, 0x2f6fd0, 0xf2b632, 0x1fa7a0, 0xff7a3a, 0xffffff];
  const PAJA = 0xc9a45c;
  const playa = {
    id: 'playa', name: 'La Costa', emoji: '🏝️', desc: 'Malecón de tablas, cangrejos, cocos que ruedan y gaviotas', dificultad: 2,
    sky: ['#1493e0', '#86d8f5', '#e6fbf4'], fog: 0xdff4ee, fogRange: [75, 220], hemi: [0xdff6ff, 0xe8d6a0, 2.4], sun: [0xfff4d0, 2.9],
    tints: [0xffd166, 0xff8fa3, 0x7fdbda, 0x9ad0ff, 0xffffff, 0xffb37a, 0xb8f0a0], roof: PAJA,
    sidewalk: 0xdcc79a, ground: 0xecd9a6, crossing: 0xb98d5a, heights: [0], food: 'cangrejo',
    pieces: { alcantarilla: 4, senora: 6, carreta: 5, caja: 4, basura: 2, bolsas: 4, contenedor: 4, poste: 4, zanja: 4, tuboc: 3, hidrante: 3, andamio: 8,
      coco: 13, sombrilla: 10, lancha: 8, red: 9, surf: 11, castillo: 10, pelota: 7, gaviota: 12 },
    facade: fachadaPlaya, road: calzadaPlaya,
    side(st, seg, side, s0, end) {
      let s = s0, k = side > 0 ? 1 : 0;
      while (s < end - .1) {
        let w = pick([8, 10, 12]);
        if (end - s - w < 8) w = end - s;
        const z = -(s + w / 2);
        if (k++ % 2 === 0) { // caseta de tabla con techo de palma y enramada
          const rows = Math.random() < .4 ? 2 : 1, h = rows * 3.2, bw = w - 1.5;
          tint(part(BOX, F.playa[rows], 8, h, bw, side * 12.5, h / 2, z, st), pick(playa.tints));
          tejado(st, PAJA, side * 12.5, z, 8, bw, h, .5, 1.1);
          part(BOX, pick(toldoPlaya), 3, .12, bw, side * 7.4, 2.95, z, st).rotation.z = side * .12;
          for (const d of [-1, 1]) part(BOX, 0x8a6a40, .14, 2.9, .14, side * 6.2, 1.45, z + d * (bw / 2 - .3), st);
          part(BOX, 0x8a5a2b, .8, 1, bw * .6, side * 8.05, .7, z, st); // barra con frutas
          for (let i = 0; i < 4; i++) part(BOX, pick([0xff8a1f, 0xf2e24a, 0x7fc241, 0xe8456b]), .34, .34, .34, side * 8.05, 1.37, z + (i - 1.5) * .6, st).rotation.y = .6;
        } else { // claro de arena: palmeras, sombrilla y toalla
          palma(st, side * rand(8.6, 11), z + rand(-w / 3, w / 3), rand(7, 10));
          if (Math.random() < .6) palma(st, side * rand(13, 17), z + rand(-w / 3, w / 3), rand(8, 12));
          const ux = side * rand(10.5, 15), uz = z + rand(-2, 2);
          part(CYL, 0xf0f0f0, .1, 2.4, .1, ux, 1.2, uz, st); part(EAR, pick(PLAYA), 3, .7, 3, ux, 2.6, uz, st);
          part(BOX, pick(PLAYA), 1, .06, 2, ux + 1.3, .02, uz, st);
          if (Math.random() < .25) { // torre de salvavidas
            const lx = side * 14, lz = z + 3;
            for (const dx of [-1, 1]) for (const dz of [-1, 1]) part(BOX, 0xf0f0f0, .16, 3, .16, lx + dx, 1.5, lz + dz, st);
            part(BOX, 0xf0f0f0, 2.6, .14, 2.6, lx, 3, lz, st); part(BOX, 0xd8433b, 2, 1.6, 2, lx, 3.9, lz, st); part(BOX, 0xf0f0f0, 2.8, .14, 2.8, lx, 4.8, lz, st);
          }
        }
        s += w;
      }
      const a = Math.max(s0, 10), len = end - a; // baranda de cuerda
      for (let t = a; t < end - 2; t += 5) part(BOX, 0x8a6a40, .18, .9, .18, side * 7.3, .6, -t, st);
      part(BOX, 0xe8dcc0, .06, .06, len, side * 7.3, .92, -(a + len / 2), st);
    },
    decorate(st, seg) {
      esquinas(seg, (x, z, sx, sz) => tejado(st, PAJA, x, z, sx, sz, 6.4, .45, 1));
      const a = seg.first ? -30 : 26, banderas = [], cometas = [];
      for (let i = 0; i < 6; i++) palma(st, pick([-1, 1]) * rand(19, 30), -rand(a, seg.L - 28), rand(9, 14));
      for (let i = 0; i < 4; i++) part(SPH, 0xe6d09a, rand(10, 18), rand(2, 4), rand(10, 18), pick([-1, 1]) * rand(23, 32), -.3, -rand(a, seg.L - 32), st); // dunas
      const fx = pick([-1, 1]) * 27, fz = -rand(50, seg.L - 60); // faro
      for (let k = 0; k < 5; k++) part(CYL, k % 2 ? 0xd8433b : 0xf7f7f7, 4.4 - k * .45, 3.6, 4.4 - k * .45, fx, 1.8 + k * 3.6, fz, st);
      part(CYL, 0x333842, 3.4, .3, 3.4, fx, 18.15, fz, st); glow(CYL, 0xfff2a8, 1.8, 1.6, 1.8, fx, 19.1, fz, st); part(EAR, 0xd8433b, 2.8, 1.4, 2.8, fx, 20.6, fz, st);
      for (let s = seg.first ? 6 : 30; s < seg.L - 20; s += 55) { // astas con bandera de playa
        const side = pick([-1, 1]);
        part(CYL, 0xf0f0f0, .12, 6, .12, side * 7.05, 3, -s, st);
        banderas.push([side * 7.05, 5.5, -s]);
      }
      for (let i = 0; i < 2; i++) cometas.push([pick([-1, 1]) * rand(9, 20), rand(15, 22), -rand(30, seg.L - 30)]);
      seg.wx = { banderas, cometas };
    },
    ambiente(seg) {
      for (const [x, y, z] of seg.wx.banderas) {
        const g = new T.Group(), ph = rand(0, 6);
        g.position.set(x, y, z);
        part(BOX, pick([0xd8433b, 0xf2c230, 0x2f8f6b]), 1.6, .9, .04, .8, 0, 0, g);
        anima(seg, g, t => { g.rotation.y = Math.sin(t * 3 + ph) * .5 + Math.sin(t * 7.3 + ph) * .15; });
      }
      for (const [x, y, z] of seg.wx.cometas) {
        const m = new T.Mesh(cometaGeo, banderinMat), ph = rand(0, 6);
        m.scale.setScalar(2);
        anima(seg, m, t => { const u = t * .6 + ph; m.position.set(x + Math.sin(u) * 4, y + Math.sin(u * 2) * 1.6, z); m.rotation.z = Math.cos(u) * .5; });
      }
    },
    backdrop() {
      const root = new T.Group(), lejos = new T.Group(), veleros = new T.Group(), nubes = new T.Group();
      const yMar = R => 30 * (R - 225) / 175; // el mar es un cono que sube hacia el horizonte
      const mar = new T.Mesh(new T.CylinderGeometry(400, 225, 30, 48, 1, true), new T.MeshBasicMaterial({ map: marTex, side: T.BackSide, fog: false }));
      mar.position.y = 15;
      const espuma = new T.Mesh(new T.CylinderGeometry(229, 225, .7, 48, 1, true), new T.MeshBasicMaterial({ color: 0xffffff, side: T.BackSide, fog: false, transparent: true, opacity: .8 }));
      espuma.position.y = .4;
      for (let i = 0; i < 5; i++) { // islas con palmeras
        const a = rand(0, TAU), R = rand(285, 340), x = Math.cos(a) * R, z = Math.sin(a) * R, y = yMar(R), w = rand(30, 55);
        part(SPH, 0xe6d09a, w, 7, w * .6, x, y, z, lejos); part(SPH, 0x3f9a4f, w * .6, 11, w * .4, x, y + 3, z, lejos);
        for (let k = 0; k < 3; k++) {
          const px = x + rand(-w * .25, w * .25);
          part(CYL, 0x8a6a40, 1, 16, 1, px, y + 12, z, lejos); part(SPH, 0x2f8f4a, 11, 3.5, 11, px, y + 20, z, lejos);
        }
      }
      part(SPH, 0xfff6c8, 44, 44, 44, -230, 120, -290, lejos); // sol
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + rand(-.3, .3), R = rand(250, 290), x = Math.cos(a) * R, z = Math.sin(a) * R, y = yMar(R);
        part(BOX, 0xffffff, 9, 2, 3, x, y + 1, z, veleros).rotation.y = -a;
        part(CONE, pick([0xffffff, 0xff8fa3, 0xffd166]), 8, 14, 1, x, y + 9, z, veleros).rotation.y = -a;
      }
      for (let i = 0; i < 8; i++) {
        const a = rand(0, TAU), R = rand(220, 300), y = rand(90, 140), w = rand(35, 60);
        for (let k = 0; k < 3; k++) part(SPH, 0xffffff, w * (k ? .65 : 1), rand(10, 16), rand(18, 28), Math.cos(a) * R + (k - 1) * w * .4, y + (k ? 5 : 0), Math.sin(a) * R + (k - 1) * 6, nubes);
      }
      const v = fundir(veleros), n = fundir(nubes);
      root.add(mar, espuma, fundir(lejos), v, n);
      fondo = (t, dt) => {
        marTex.offset.y = mod(marTex.offset.y - dt * .05, 1); // las olas vienen hacia la orilla
        espuma.material.opacity = .45 + .4 * Math.sin(t * 1.4);
        espuma.scale.setScalar(1 + Math.sin(t * 1.4) * .004);
        v.rotation.y += dt * .01; v.position.y = Math.sin(t * .9) * .5;
        n.rotation.y -= dt * .008;
      };
      return root;
    },
    clima(t, dt) { vuelan(t, dt, 1); vuelanAves(t); }
  };
  const marTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#22b8cf'); gr.addColorStop(.5, '#149fbd'); gr.addColorStop(1, '#22b8cf');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 32) {
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin(x / w * TAU * 2) * 4);
      g.stroke();
      g.strokeStyle = 'rgba(140,235,240,.7)'; g.lineWidth = 2; g.beginPath();
      for (let x = 0; x <= w; x += 4) g.lineTo(x, y + 16 + Math.sin(x / w * TAU * 3 + 1) * 3);
      g.stroke();
    }
  });
  marTex.wrapS = marTex.wrapT = T.RepeatWrapping; marTex.repeat.set(36, 5);

  /* ================= Mundo 3 · Ciudad Neón ================= */
  const NEON = [0x39e6ff, 0xff3ec8, 0xb06bff, 0xffd23f];
  function torre(st, x, z, sx, sz, side) {
    const alta = Math.random() < .45, h = alta ? rand(24, 34) : rand(13, 20), fx = side * (Math.abs(x) - sx / 2 - .04);
    tint(part(BOX, F.neon[alta ? 1 : 0], sx, h, sz, x, h / 2, z, st), pick(neon.tints));
    if (Math.random() < .5) { // remate con antena y baliza
      const h2 = rand(5, 12);
      tint(part(BOX, F.neon[0], sx - 3, h2, sz - 3, x, h + h2 / 2, z, st), pick(neon.tints));
      part(BOX, 0x23283a, .15, 5, .15, x, h + h2 + 2.5, z, st); glow(SPH, 0xff3030, .5, .5, .5, x, h + h2 + 5, z, st);
    }
    glow(BOX, pick([0x39e6ff, 0xff3ec8, 0xffd98a, 0xb06bff]), .08, 2.1, (sz - 3) * .6, fx, 1.45, z + rand(-1, 1), st); // vitrina encendida
    part(BOX, 0x15151f, .5, .3, sz - 2, fx - side * .1, 2.9, z, st);
    glow(BOX, pick(NEON), .12, h, .12, fx, h / 2, z - sz / 2 + .12, st); // tira de neón en la arista
    if (Math.random() < .75) { // rótulo: de bandera (se lee de frente al correr) o pegado a la fachada
      const y = rand(4.6, 9), gi = Math.floor(rand(0, 8)), m = Math.random() < .3 ? signB : signA;
      if (Math.random() < .6) {
        part(rotGeo[gi], m, 3.2, .8, 1, side * 5.8, y, z, st);
        part(BOX, 0x23283a, 1.7, .08, .08, side * 6.7, y + .46, z, st);
      } else part(rotGeo[gi], m, 4.6, 1.15, 1, fx, y, z, st).rotation.y = -side * PI / 2;
    }
  }
  const neon = {
    id: 'neon', name: 'Ciudad Neón', emoji: '🌃', desc: 'Noche de lluvia: motos de frente, drones, láseres y relámpagos', dificultad: 3,
    sky: ['#04030d', '#150c33', '#43185a'], fog: 0x1b1038, fogRange: [38, 140], hemi: [0x8f9cff, 0x4a2c66, 1.7], sun: [0xff8ad8, 1.4],
    tints: [0x2a2f4a, 0x3a2a55, 0x1f3550, 0x40304a, 0x2b2b3a], roof: 0x8a1f6a, sidewalk: 0x3a3d52, ground: 0x0d0e16, crossing: 0x1c1d2a, heights: [0],
    pieces: { valla: 6, alcantarilla: 8, carro: 8, bus: 8, caja: 4, basura: 2, cinta: 4, bolsas: 5, contenedor: 8, poste: 4, zanja: 5, tuboc: 4, hidrante: 4, andamio: 7,
      moto: 16, dron: 12, barrera: 10, laser: 12, charco: 10, zigzag: 10 },
    facade: fachadaNeon, road: calzadaNeon,
    side(st, seg, side, s0, end) {
      let s = s0;
      while (s < end - .1) {
        let w = pick([10, 12, 14]);
        if (end - s - w < 8) w = end - s;
        torre(st, side * (HALF + DEPTH / 2), -(s + w / 2), DEPTH, w, side);
        s += w;
      }
      for (let t = Math.max(s0, 12) + (side > 0 ? 0 : 16); t < end - 4; t += 32) { // farolas de neón
        part(CYL, 0x23283a, .16, 5.2, .16, side * 7, 2.6, -t, st);
        part(BOX, 0x23283a, 1.6, .1, .1, side * 6.3, 5.2, -t, st);
        glow(BOX, side > 0 ? 0x39e6ff : 0xff3ec8, 1.2, .1, .3, side * 5.9, 5.1, -t, st);
        part(BOX, 0x1a1c28, 1, 1.9, .8, side * 6.9, 1.15, -t - 8, st); // máquina expendedora
        glow(BOX, pick(NEON), .06, 1.5, .6, side * 6.38, 1.2, -t - 8, st);
      }
    },
    decorate(st, seg) {
      // las esquinas del núcleo quedan dentro de torres propias: así todo el mundo tiene ventanas que brillan
      esquinas(seg, (x, z, sx, sz, side) => torre(st, x, z, sx + .3, sz + .3, side));
      const holos = [];
      for (let k = 1; k <= 3; k++) {
        const side = k % 2 ? 1 : -1, s = seg.L * k / 4 + rand(-8, 8);
        part(CYL, 0x23283a, .9, .25, .9, side * 6.1, .32, -s, st);
        holos.push([side * 6.1, 4.3, -s, Math.floor(rand(0, 8))]);
      }
      for (let s = seg.first ? 40 : 60; s < seg.L - 40; s += 75) { // pórtico con pantalla que se lee de frente
        for (const x of [-7.2, 7.2]) part(BOX, 0x23283a, .4, 8.4, .4, x, 4.2, -s, st);
        part(BOX, 0x23283a, 14.8, .5, .5, 0, 8.4, -s, st);
        part(rotGeo[Math.floor(rand(0, 8))], signA, 7, 1.75, 1, 0, 7.1, -s + .05, st);
        glow(BOX, pick(NEON), 14.4, .1, .1, 0, 8.05, -s + .3, st);
      }
      seg.wx = { holos };
    },
    ambiente(seg) {
      for (const [x, y, z, i] of seg.wx.holos) { // hologramas giratorios
        const m = new T.Mesh(rotGeo[i], holoMat), r = part(RING, anilloMat, 1, 1, 1, x, .5, z, seg.g), ph = rand(0, 6);
        m.scale.set(3.6, .9, 1);
        anima(seg, m, t => {
          m.position.set(x, y + Math.sin(t * 2 + ph) * .25, z); m.rotation.y = t * .9 + ph;
          const k = .7 + Math.abs(Math.sin(t * 2 + ph)) * .5; r.scale.set(k, 1, k);
        });
      }
    },
    backdrop() {
      const root = new T.Group(), ciudad = new T.Group(), cielo = new T.Group(), tops = [];
      const skyMat = new T.MeshBasicMaterial({ map: skylineTex, vertexColors: true, fog: false });
      for (let i = 0; i < 30; i++) { // horizonte de rascacielos
        const a = i / 30 * TAU + rand(-.08, .08), R = rand(200, 270), h = rand(50, 150), w = rand(18, 34);
        tint(part(BOX, skyMat, w, h, w, Math.cos(a) * R, h / 2 - 2, Math.sin(a) * R, ciudad), pick([0xffffff, 0xc8b0ff, 0x9fd8ff, 0xffc0e8])).rotation.y = -a;
        if (h > 85) tops.push(Math.cos(a) * R, h + 1, Math.sin(a) * R);
      }
      part(SPH, 0xfff2d0, 30, 30, 30, 170, 190, -250, cielo); // luna
      const balizas = new T.Points(tris(tops), new T.PointsMaterial({ color: 0xff3030, size: 5, sizeAttenuation: false, fog: false }));
      const P = [];
      for (let i = 0; i < 180; i++) { const a = rand(0, TAU), e = rand(.15, 1.3); P.push(Math.cos(a) * Math.cos(e) * 390, Math.sin(e) * 390, Math.sin(a) * Math.cos(e) * 390); }
      const estrellas = new T.Points(tris(P), new T.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true }));
      const haces = [0x39e6ff, 0xff3ec8, 0xb06bff].map((c, i) => { // reflectores que barren el cielo
        const g = new T.ConeGeometry(16, 280, 8, 1, true).rotateX(PI).translate(0, 140, 0), a = i * 2.1 + .4;
        const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .13, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
        m.position.set(Math.cos(a) * 185, 0, Math.sin(a) * 185);
        return m;
      });
      const zig = [];
      for (let k = 0, x = 0; k < 9; k++) { zig.push(x, 230 - k * 26, 0); x += rand(-16, 16); }
      const rayoLinea = new T.Line(tris(zig), new T.LineBasicMaterial({ color: 0xffffff, fog: false }));
      rayoLinea.visible = false;
      const pivote = new T.Group(); pivote.add(rayoLinea); rayoLinea.position.z = -300;
      root.add(fundir(ciudad), fundir(cielo), estrellas, balizas, pivote, ...haces);
      fondo = t => {
        balizas.visible = Math.floor(t * 1.4) % 2 === 0;
        estrellas.material.opacity = .65 + .35 * Math.sin(t * 2.7);
        haces.forEach((m, i) => { m.rotation.z = Math.sin(t * .35 + i * 2) * .55; m.rotation.x = Math.cos(t * .27 + i) * .45; });
        if (rayo > .97) pivote.rotation.y = rand(0, TAU);
        rayoLinea.visible = rayo > .45;
      };
      return root;
    },
    clima(t, dt) {
      llueve(dt);
      signA.color.setScalar(.86 + .14 * Math.sin(t * 3));
      signB.color.setScalar(Math.random() < .07 ? .2 : 1); // rótulos que fallan
      proxRayo -= dt;
      if (proxRayo < 0) { proxRayo = rand(5, 12); rayo = 1; if (S.state === 'play') game.sfx(70, .6, 'sawtooth', .04, -30); }
      if (rayo > 0) { // relámpago: doble destello sobre la luz ambiente
        rayo = Math.max(0, rayo - dt * 2.8);
        hemi.intensity = neon.hemi[2] + (Math.sin(rayo * 26) > 0 ? rayo : rayo * .3) * 2.6;
      }
    }
  };
  const skylineTex = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#0b0a1a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) if (Math.random() < .32) { g.fillStyle = pick(['#ffd98a', '#ffd98a', '#8fe9ff', '#ff9ae0']); g.fillRect(x * 8 + 2, y * 8 + 2, 4, 4); }
  });
  skylineTex.wrapS = skylineTex.wrapT = T.RepeatWrapping; skylineTex.repeat.set(2, 2);

  // funde un grupo de fondo en una malla sin niebla (los materiales se crean por llamada: el núcleo los libera al cambiar de mundo)
  function fundir(grupo) {
    const out = new T.Group(), m = new T.MeshBasicMaterial({ vertexColors: true, fog: false });
    for (const { geometry, material } of game.bake(grupo)) out.add(new T.Mesh(geometry, material.map ? material : m));
    return out;
  }

  /* ================= Ambiente que sigue al jugador: lluvia, mariposas, brisa y aves ================= */
  let fondo = null, rayo = 0, proxRayo = 6, reloj = 0, aveEsc = 1.2;
  const NL = 260, lluviaPos = new Float32Array(NL * 6), gotas = Array.from({ length: NL }, () => [rand(0, 44), rand(0, 22), rand(0, 44), rand(22, 32)]);
  const lluvia = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(lluviaPos, 3)),
    new T.LineBasicMaterial({ color: 0xa8c4ff, transparent: true, opacity: .5 }));
  function llueve(dt) { // las gotas viven en coordenadas del mundo y se reciclan alrededor del gato
    const px = game.pos.x, pz = game.pos.z;
    for (let i = 0, k = 0; i < NL; i++, k += 6) {
      const d = gotas[i];
      d[1] -= d[3] * dt;
      if (d[1] < 0) { d[1] += 22; d[0] = rand(0, 44); d[2] = rand(0, 44); }
      const x = mod(d[0] - px, 44) - 22, z = mod(d[2] - pz, 44) - 22;
      lluviaPos[k] = x; lluviaPos[k + 1] = d[1]; lluviaPos[k + 2] = z;
      lluviaPos[k + 3] = x + .25; lluviaPos[k + 4] = d[1] + 1.1; lluviaPos[k + 5] = z;
    }
    lluvia.geometry.attributes.position.needsUpdate = true;
    lluvia.position.set(px, 0, pz);
  }
  const NM = 70, motaPos = new Float32Array(NM * 3), motas = Array.from({ length: NM }, () => ({ x: rand(0, 50), y: rand(.8, 7), z: rand(0, 50), ph: rand(0, 6), v: rand(.6, 1.4) }));
  const mariposaMat = new T.PointsMaterial({ size: .55, alphaTest: .5, map: canvasTex(32, 32, g => { // mariposas amarillas
    g.fillStyle = '#ffd21a';
    for (const x of [9, 23]) { g.beginPath(); g.ellipse(x, 12, 7, 9, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x, 23, 5, 6, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#3a2a10'; g.fillRect(15, 6, 2, 22);
  }) });
  const brisaMat = new T.PointsMaterial({ color: 0xffffff, size: .14, transparent: true, opacity: .8 });
  const polvo = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(motaPos, 3)), mariposaMat);
  function vuelan(t, dt, brisa) {
    const px = game.pos.x, pz = game.pos.z;
    motas.forEach((m, i) => {
      let y;
      if (brisa) { m.x += dt * 6 * m.v; m.z += dt * 1.5; y = m.y * .6 + Math.sin(t * m.v + m.ph) * .3; } // rocío que arrastra la brisa
      else { m.x += Math.sin(t * m.v + m.ph) * dt * 1.6; m.z += Math.cos(t * .7 * m.v + m.ph) * dt * 1.6; y = m.y + Math.sin(t * 5 * m.v + m.ph) * .35; }
      motaPos[i * 3] = mod(m.x - px, 50) - 25; motaPos[i * 3 + 1] = y; motaPos[i * 3 + 2] = mod(m.z - pz, 50) - 25;
    });
    polvo.geometry.attributes.position.needsUpdate = true;
    polvo.position.set(px, 0, pz);
  }
  const aves = Array.from({ length: 6 }, (_, i) => ({ m: new T.Mesh(aveGeo, aveMat), r: rand(10, 26), h: rand(9, 16), w: rand(.25, .5) * (i % 2 ? 1 : -1), ph: rand(0, 6), f: rand(7, 11) }));
  function vuelanAves(t) { // bandada que da vueltas sobre la calle
    for (const a of aves) {
      const u = t * a.w + a.ph;
      a.m.position.set(game.pos.x + Math.cos(u) * a.r, a.h + Math.sin(t * .6 + a.ph) * 1.5, game.pos.z + Math.sin(u) * a.r);
      a.m.rotation.y = a.w > 0 ? PI - u : -u;
      a.m.scale.set(aveEsc, Math.sin(t * a.f + a.ph) * aveEsc, aveEsc);
    }
  }
  for (const o of [lluvia, polvo, ...aves.map(a => a.m)]) { o.frustumCulled = false; o.visible = false; scene.add(o); }

  const mios = new Set([pueblo, playa, neon]);
  game.on('world', w => {
    const id = mios.has(w) ? w.id : '';
    if (!id) fondo = null;
    lluvia.visible = id === 'neon';
    polvo.visible = id === 'pueblo' || id === 'playa';
    polvo.material = id === 'playa' ? brisaMat : mariposaMat;
    for (const a of aves) a.m.visible = polvo.visible;
    aveMat.color.set(id === 'playa' ? 0xffffff : 0x2b2b3a); aveEsc = id === 'playa' ? 2 : 1.2;
    rayo = 0;
  });
  game.on('frame', ({ dt }) => {
    reloj += dt;
    const cur = game.cur, w = game.world;
    if (cur) for (const seg of [cur, ...Object.values(cur.exits)]) { // solo se anima lo que está a la vista
      const l = vivos.get(seg);
      if (l) for (const fn of l) fn(reloj, dt);
    }
    if (!mios.has(w)) return;
    fondo?.(reloj, dt);
    w.clima(reloj, dt);
  });

  game.worlds.length = 0;
  game.worlds.push(pueblo, playa, neon);
}
