// El drenaje: una alcantarilla verde en la calle baja a un túnel con cocodrilos, tubos y muchos ratones.
// Panela no cabe, así que abajo persigue un cocodrilo con su propio reloj (S.chase, lo lleva el núcleo):
// cuando llega a cfg.catchIn es captura; cada tropiezo abajo le suma cfg.stumbleChase. Se sale subiendo por una escalera.
export function install(game) {
  const { THREE, geo: { BOX, CYL, SPH, CONE, DISC, RING }, part, BUILD, SPEC, piece, addObstacle, pick, p, S, cfg } = game;

  /* ---------- Obstáculos ---------- */
  BUILD.drenaje = g => { // la alcantarilla de la calle que lleva al drenaje
    part(DISC, 0x031208, .95, 1, .95, 0, .03, 0, g);
    part(RING, 0x35f07a, 1, 1, 1, 0, .02, 0, g);
    part(RING, 0x1fae52, 1.25, 1, 1.25, 0, .015, 0, g);
    for (const a of [0, 1, 2, 3]) part(CONE, 0x35f07a, .3, .5, .3, Math.cos(a * 1.57) * 1.45, .25, Math.sin(a * 1.57) * 1.45, g).rotation.z = Math.PI;
    part(CONE, 0x35f07a, .7, 1, .7, 0, 2.6, 0, g).rotation.x = Math.PI; // flecha: se ve de lejos
  };
  SPEC.drenaje = { hw: .9, hl: .9, y0: -1, y1: .05, collect: true, keep: true, shadow: false };

  BUILD.cocodrilo = g => {
    const G = 0x62d24a, D = 0x3f9a32;
    part(DISC, 0x4fb89a, 1.3, 1, 2.7, 0, .02, .2, g);
    part(SPH, G, 1.3, .55, 3, 0, .32, .2, g);
    part(BOX, G, .8, .3, 1.5, 0, .34, -1.9, g);
    part(BOX, D, .82, .12, 1.4, 0, .16, -1.9, g);
    for (let i = 0; i < 6; i++) for (const x of [-.36, .36]) part(CONE, 0xffffff, .09, .16, .09, x, .24, -1.35 - i * .22, g).rotation.z = Math.PI;
    for (const x of [-.3, .3]) { part(SPH, G, .3, .3, .3, x, .62, -1.15, g); part(SPH, 0xffe14f, .16, .16, .1, x, .66, -1.28, g); part(BOX, 0x111111, .04, .14, .04, x, .66, -1.33, g); }
    for (let i = 0; i < 5; i++) part(CONE, D, .22, .26, .22, 0, .66, -.5 + i * .5, g);
    part(CONE, G, .6, 2, .4, 0, .25, 2.4, g).rotation.x = Math.PI / 2;
    for (const x of [-.7, .7]) for (const z of [-.6, 1]) part(BOX, D, .5, .2, .36, x, .12, z, g);
  };
  SPEC.cocodrilo = { hw: 1, hl: 2, y0: 0, y1: .95, cell: 'S' };

  BUILD.tubo = g => { // tubo oxidado a media altura: hay que agacharse
    part(CYL, 0x8a4b2a, .8, 9.4, .8, 0, 1.75, 0, g).rotation.z = Math.PI / 2;
    for (const x of [-3, 0, 3]) part(CYL, 0x5a2f1a, .95, .3, .95, x, 1.75, 0, g).rotation.z = Math.PI / 2;
    for (const x of [-1.6, 1.4]) part(SPH, 0x6fe0c0, .12, .3, .12, x, 1.2, 0, g);
  };
  SPEC.tubo = { hw: 5, hl: .4, y0: 1.2, y1: 3, cell: 'A', full: true };

  BUILD.barril = g => { // barriles tóxicos apilados: se esquivan
    for (const [x, y, z] of [[-.3, .6, 0], [.5, .6, .3], [.1, 1.75, .1]]) {
      part(CYL, 0xd9c21a, 1, 1.15, 1, x, y, z, g);
      part(CYL, 0x1a1a1f, 1.04, .22, 1.04, x, y, z, g);
    }
    part(DISC, 0x6fe04a, 1.5, 1, 1.1, 0, .03, .2, g);
  };
  SPEC.barril = { hw: .95, hl: .8, y0: 0, y1: 2.5, cell: 'X' };

  const exitSign = new THREE.MeshBasicMaterial({ map: game.canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#12a150'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#fff'; c.font = '900 64px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('SALIDA', w / 2, h / 2 + 4);
  }) });
  BUILD.escalera = g => {
    part(new THREE.PlaneGeometry(1, 1), exitSign, 2.6, 1.3, 1, 0, 5.2, .3, g);
    part(CONE, 0x35f07a, .7, .9, .7, 0, 4, .3, g);
    for (const x of [-.5, .5]) part(BOX, 0xc9ccd6, .1, 13, .1, x, 6.5, 0, g);
    for (let y = .5; y < 13; y += .6) part(BOX, 0xc9ccd6, 1, .08, .08, 0, y, 0, g);
    part(BOX, 0xfff6c0, 1.6, 13, .04, 0, 6.5, .25, g);
    part(RING, 0xffe14f, 1.2, 1, 1.2, 0, .03, 0, g);
    part(CONE, 0xffe14f, .5, .7, .5, 0, 3, -.4, g);
  };
  SPEC.escalera = { hw: 1.1, hl: 1.3, y0: 0, y1: 4, collect: true, keep: true, shadow: false };

  /* ---------- Piezas ---------- */
  const swim = (o, t) => { o.mesh.rotation.y = Math.sin(t * 3 + o.s) * .14; o.mesh.position.y = Math.sin(t * 2 + o.s) * .05; };
  piece('drenaje'); // la entrada la coloca el generador del núcleo en un respiro, en un carril de afuera
  piece('cocodrilo', { make: (seg, s, lane) => { const o = addObstacle(seg, 'cocodrilo', s, lane); o.animate = swim; return o; } });
  piece('tubo');
  piece('barril');

  /* ---------- El mundo de abajo ---------- */
  let ladderAt = 0, passedLadders = 0;
  const sewer = {
    id: 'drenaje', name: 'El drenaje', emoji: '🐊', tunnel: true, tierShift: -1, miceEvery: 1,
    sky: ['#0a1512', '#12261f', '#1b3a30'], fog: 0x1b3a30, fogRange: [30, 120], hemi: [0xb8ffe6, 0x2a4a3e, 2.6], sun: [0xd8fff0, 1.6],
    sidewalk: 0x4a554e, ground: 0x0a1410, crossing: 0x1f3a33, mountains: false,
    pieces: { cocodrilo: 10, tubo: 6, barril: 7, valla: 3, caja: 3, bolsas: 4, andamio: 4 },
    road(g, w, h) {
      g.fillStyle = '#1f4a40'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = Math.random() < .5 ? '#2b6557' : '#173a32'; g.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 2); }
      g.fillStyle = '#6fe0c0'; for (let i = 0; i < 14; i++) g.fillRect(Math.random() * w, Math.random() * h, 14, 1);
      g.fillStyle = '#59635c'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
    },
    side(st, seg, side, s0, end) {
      const len = end - s0, mid = -(s0 + len / 2), x = side * 8;
      part(BOX, 0x5a3f36, 1, 13, len, x, 6.5, mid, st);
      part(BOX, 0x3e2b25, 1.1, 1.2, len, x - side * .1, .6, mid, st);
      part(CYL, 0x2f8f6b, .4, len, .4, x - side * .8, 4.6, mid, st).rotation.x = Math.PI / 2;
      part(CYL, 0x8a4b2a, .26, len, .26, x - side * .75, 5.3, mid, st).rotation.x = Math.PI / 2;
      for (let s = s0 + 6; s < end; s += 12) {
        part(BOX, 0x45302a, 1.5, 13, .9, x - side * .2, 6.5, -s, st);
        if (Math.round(s / 12) % 2) part(BOX, 0xfff0a0, .25, .35, .5, x - side * .65, 3.4, -s - 6, st);
      }
    },
    decorate(st, seg) {
      const s0 = seg.first ? -40 : 7.5, end = seg.L + 17.5, len = end - s0, mid = -(s0 + len / 2);
      part(BOX, 0x33241f, 17, .7, len, 0, 13.2, mid, st);
      for (let s = s0 + 6; s < end; s += 12) part(BOX, 0x45302a, 17, .6, .9, 0, 12.7, -s, st);
    },
    // en cualquier hueco del túnel: una escalera si ya tocaba (cada cfg.ladderEvery metros), fuera de la ruta de monedas;
    // el premio sube con cada escalera que se deja pasar
    gap(seg, s0, s1, route, dist) {
      if (dist < ladderAt || s1 - s0 < 8) return;
      ladderAt = dist + cfg.ladderEvery;
      const lanes = [-1, 0, 1].filter(l => !route.includes(l));
      addObstacle(seg, 'escalera', (s0 + s1) / 2, lanes.length ? pick(lanes) : pick([-1, 0, 1]));
      const extra = Math.min(2, passedLadders);
      for (let k = 0; k < extra * 2; k++) addObstacle(seg, 'raton', s0 + 1 + k * 2.4, pick([-1, 0, 1]));
    }
  };
  game.sewer = sewer;

  /* ---------- Bajar y subir ---------- */
  const fade = document.createElement('div');
  fade.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none';
  game.ui.hud.appendChild(fade);
  let dark = 0;
  const blink = () => { dark = 1; fade.style.opacity = 1; };
  game.on('frame', ({ dt }) => {
    if (dark <= 0) return;
    dark = Math.max(0, dark - dt * 2.2);
    fade.style.opacity = dark;
  });
  let pending = 0;
  game.on('collect', o => {
    if (o.type === 'drenaje' && !game.sub) { pending = .32; p.fall = .5; game.invuln(2); game.sfx(300, .4, 'sine', .08, -220); }
    else if (o.type === 'escalera' && game.sub) {
      blink();
      game.exitSub();
      game.racha(10 + 5 * passedLadders, 100, 'escalera');
      game.sfx(500, .3, 'triangle', .08, 500);
      game.fx?.banner?.('¡De vuelta a la calle!');
    }
  });
  game.on('update', dt => {
    if (pending > 0 && (pending -= dt) <= 0) {
      blink();
      ladderAt = S.dist + 70; passedLadders = 0; // la primera escalera, pronto; las demás cada ladderEvery
      game.enterSub(sewer);
      game.fx?.banner?.('¡Al drenaje!');
    }
    // escaleras que se dejan pasar: suben el premio de los respiros siguientes
    if (game.sub && S.state === 'play') for (const o of game.cur.obs) if (o.type === 'escalera' && !o.hit && !o.counted && o.s + o.hl < p.s) { o.counted = true; passedLadders++; }
  });
  game.on('start', () => { pending = 0; dark = 0; fade.style.opacity = 0; });

  /* ---------- El cocodrilo grande ---------- */
  // El reloj (S.chase) y la distancia (S.dogGap) los lleva el núcleo; aquí solo se arma y se coloca.
  let boss = new THREE.Group(), warned = false;
  function makeBoss() {
    game.scene.remove(boss);
    boss = game.spawn('cocodrilo');
    boss.scale.setScalar(1.35);
    game.scene.add(boss);
  }
  game.on('sub', w => { warned = false; if (w) makeBoss(); boss.visible = !!w; });
  game.on('update', () => {
    if (!game.sub || S.state !== 'play') return;
    if (!warned && S.chase > cfg.catchIn - 7) { warned = true; game.fx?.banner?.('¡Busca la escalera!'); game.sfx(140, .5, 'sawtooth', .1, -60); }
  });
  game.on('frame', () => {
    if (!boss.visible) return;
    if (!game.sub) { boss.visible = false; return; }
    game.dog.visible = false;
    const yaw = p.yaw, t = S.time;
    boss.position.set(game.pos.x + Math.sin(yaw) * S.dogGap, Math.sin(t * 5) * .06, game.pos.z + Math.cos(yaw) * S.dogGap);
    boss.rotation.set(Math.sin(t * 9) * .05, yaw + Math.sin(t * 6) * .12, 0);
  });
  game.on('over', () => {
    if (!game.sub) return;
    const title = document.getElementById('overTitle');
    if (title && !S.won) title.innerHTML = '¡Te alcanzó <span>el cocodrilo</span>!';
  });
}
