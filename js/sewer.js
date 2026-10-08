// El drenaje: una alcantarilla verde en la calle baja a un túnel con cocodrilos, tubos y muchos ratones.
// Panela no cabe, así que abajo no hay perro; se sale subiendo por una escalera.
export function install(game) {
  const { THREE, geo: { BOX, CYL, SPH, CONE, DISC, RING }, part, BUILD, SPEC, ROWS, addObstacle, pick, p, S } = game;
  const LADDER_EVERY = 110; // metros entre escaleras

  /* ---------- Obstáculos ---------- */
  BUILD.drenaje = g => { // la alcantarilla de la calle que lleva al drenaje
    part(DISC, 0x031208, .95, 1, .95, 0, .03, 0, g);
    part(RING, 0x35f07a, 1, 1, 1, 0, .02, 0, g);
    part(RING, 0x1fae52, 1.25, 1, 1.25, 0, .015, 0, g);
    for (const a of [0, 1, 2, 3]) part(CONE, 0x35f07a, .3, .5, .3, Math.cos(a * 1.57) * 1.45, .25, Math.sin(a * 1.57) * 1.45, g).rotation.z = Math.PI;
  };
  SPEC.drenaje = { hw: .9, hl: .9, y0: -1, y1: .05, collect: true, keep: true, shadow: false };

  BUILD.cocodrilo = g => {
    const G = 0x62d24a, D = 0x3f9a32; // verde vivo: tiene que leerse sobre el agua oscura
    part(DISC, 0x4fb89a, 1.3, 1, 2.7, 0, .02, .2, g); // estela clara alrededor, para que se vea de lejos
    part(SPH, G, 1.3, .55, 3, 0, .32, .2, g);
    part(BOX, G, .8, .3, 1.5, 0, .34, -1.9, g); // hocico
    part(BOX, D, .82, .12, 1.4, 0, .16, -1.9, g);
    for (let i = 0; i < 6; i++) for (const x of [-.36, .36]) part(CONE, 0xffffff, .09, .16, .09, x, .24, -1.35 - i * .22, g).rotation.z = Math.PI;
    for (const x of [-.3, .3]) { part(SPH, G, .3, .3, .3, x, .62, -1.15, g); part(SPH, 0xffe14f, .16, .16, .1, x, .66, -1.28, g); part(BOX, 0x111111, .04, .14, .04, x, .66, -1.33, g); }
    for (let i = 0; i < 5; i++) part(CONE, D, .22, .26, .22, 0, .66, -.5 + i * .5, g); // crestas
    part(CONE, G, .6, 2, .4, 0, .25, 2.4, g).rotation.x = Math.PI / 2; // cola
    for (const x of [-.7, .7]) for (const z of [-.6, 1]) part(BOX, D, .5, .2, .36, x, .12, z, g);
  };
  SPEC.cocodrilo = { hw: 1, hl: 2, y0: 0, y1: .95, dmg: 30 };

  BUILD.tubo = g => { // tubo oxidado a media altura: hay que agacharse
    part(CYL, 0x8a4b2a, .8, 9.4, .8, 0, 1.75, 0, g).rotation.z = Math.PI / 2;
    for (const x of [-3, 0, 3]) part(CYL, 0x5a2f1a, .95, .3, .95, x, 1.75, 0, g).rotation.z = Math.PI / 2;
    for (const x of [-1.6, 1.4]) part(SPH, 0x6fe0c0, .12, .3, .12, x, 1.2, 0, g); // goteras
  };
  SPEC.tubo = { hw: 5, hl: .4, y0: 1.2, y1: 3, dmg: 20 };

  BUILD.barril = g => { // barriles tóxicos apilados: se esquivan
    for (const [x, y, z] of [[-.3, .6, 0], [.5, .6, .3], [.1, 1.75, .1]]) {
      part(CYL, 0xd9c21a, 1, 1.15, 1, x, y, z, g);
      part(CYL, 0x1a1a1f, 1.04, .22, 1.04, x, y, z, g);
    }
    part(DISC, 0x6fe04a, 1.5, 1, 1.1, 0, .03, .2, g); // charco
  };
  SPEC.barril = { hw: .95, hl: .8, y0: 0, y1: 2.5, dmg: 25 };

  const exitSign = new THREE.MeshBasicMaterial({ map: game.canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#12a150'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#fff'; c.font = '900 64px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('SALIDA', w / 2, h / 2 + 4);
  }) });
  BUILD.escalera = g => {
    part(new THREE.PlaneGeometry(1, 1), exitSign, 2.6, 1.3, 1, 0, 5.2, .3, g); // letrero que se lee de lejos
    part(CONE, 0x35f07a, .7, .9, .7, 0, 4, .3, g); // flecha hacia arriba
    for (const x of [-.5, .5]) part(BOX, 0xc9ccd6, .1, 13, .1, x, 6.5, 0, g);
    for (let y = .5; y < 13; y += .6) part(BOX, 0xc9ccd6, 1, .08, .08, 0, y, 0, g);
    part(BOX, 0xfff6c0, 1.6, 13, .04, 0, 6.5, .25, g); // rayo de luz que baja de la calle
    part(RING, 0xffe14f, 1.2, 1, 1.2, 0, .03, 0, g);
    part(CONE, 0xffe14f, .5, .7, .5, 0, 3, -.4, g);
  };
  SPEC.escalera = { hw: 1.1, hl: 1.3, y0: 0, y1: 4, collect: true, keep: true, shadow: false };

  /* ---------- Filas ---------- */
  const swim = (o, t) => { o.mesh.rotation.y = Math.sin(t * 3 + o.s) * .14; o.mesh.position.y = Math.sin(t * 2 + o.s) * .05; };
  ROWS.push(
    { id: 'drenaje', weight: 9, make: (seg, s, lanes) => { if (!seg.first) addObstacle(seg, 'drenaje', s, lanes[0]); } },
    { id: 'cocodrilo', weight: 0, sewer: 10, make: (seg, s, lanes) => lanes.slice(0, pick([1, 1, 2])).forEach(l => { addObstacle(seg, 'cocodrilo', s, l).animate = swim; }) },
    { id: 'tubo', weight: 0, sewer: 6, make: (seg, s) => addObstacle(seg, 'tubo', s, 0) },
    { id: 'barril', weight: 0, sewer: 7, make: (seg, s, lanes) => lanes.slice(0, pick([1, 2])).forEach(l => addObstacle(seg, 'barril', s, l)) },
    { id: 'nido', weight: 0, sewer: 4, make() {} } // nada que esquivar: solo ratones
  );

  /* ---------- El mundo de abajo ---------- */
  let ladderAt = 0;
  const sewer = {
    id: 'drenaje', name: 'El drenaje', emoji: '🐊', tunnel: true,
    sky: ['#0a1512', '#12261f', '#1b3a30'], fog: 0x1b3a30, fogRange: [30, 120], hemi: [0xb8ffe6, 0x2a4a3e, 2.6], sun: [0xd8fff0, 1.6],
    sidewalk: 0x4a554e, ground: 0x0a1410, crossing: 0x1f3a33, mountains: false,
    get rowWeights() { return Object.fromEntries(ROWS.map(r => [r.id, r.sewer || 0])); },
    road(g, w, h) { // canal de agua turbia entre dos bordes de concreto
      g.fillStyle = '#1f4a40'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = Math.random() < .5 ? '#2b6557' : '#173a32'; g.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 2); }
      g.fillStyle = '#6fe0c0'; for (let i = 0; i < 14; i++) g.fillRect(Math.random() * w, Math.random() * h, 14, 1);
      g.fillStyle = '#59635c'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
    },
    side(st, seg, side, s0, end) { // pared de ladrillo con costillas, tubos y bombillos
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
    decorate(st, seg) { // bóveda
      const s0 = seg.first ? -40 : 7.5, end = seg.L + 17.5, len = end - s0, mid = -(s0 + len / 2);
      part(BOX, 0x33241f, 17, .7, len, 0, 13.2, mid, st); // bóveda alta: la cámara va por debajo con holgura
      for (let s = s0 + 6; s < end; s += 12) part(BOX, 0x45302a, 17, .6, .9, 0, 12.7, -s, st);
    },
    fill(seg, s, gap, lanes) { // abajo sobran los ratones; cada tanto, una escalera
      if (seg.sewerBase === undefined) { seg.sewerBase = sewer.run; sewer.run += seg.L; }
      const at = seg.sewerBase + s + gap * .55;
      if (at >= ladderAt) { ladderAt = at + LADDER_EVERY; addObstacle(seg, 'escalera', s + gap * .55, lanes[2]); }
      for (const l of lanes.slice(0, 2)) for (let k = 0; k < 3; k++) addObstacle(seg, 'raton', s + 8 + k * 2.4, l);
      for (let k = 0; k < 4; k++) addObstacle(seg, 'moneda', s + 8 + k * 2.4, lanes[2]);
    },
    run: 0
  };
  game.sewer = sewer;

  /* ---------- Bajar y subir ---------- */
  // fundido a negro al bajar y al subir; lo mueve el propio juego cuadro a cuadro, sin depender de transiciones del navegador
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
    if (o.type === 'drenaje' && !game.sub) { pending = .32; p.fall = .5; p.inv = 2; game.sfx(300, .4, 'sine', .08, -220); }
    else if (o.type === 'escalera' && game.sub) {
      blink();
      game.exitSub();
      game.sfx(500, .3, 'triangle', .08, 500);
      game.fx?.banner?.('¡De vuelta a la calle!');
    }
  });
  game.on('update', dt => {
    if (pending > 0 && (pending -= dt) <= 0) {
      blink();
      sewer.run = 0; ladderAt = LADDER_EVERY;
      game.enterSub(sewer);
      game.fx?.banner?.('¡Al drenaje!');
    }
  });
  game.on('start', () => { pending = 0; dark = 0; fade.style.opacity = 0; });

  /* ---------- El cocodrilo grande: lo que obliga a salir ---------- */
  // Abajo Panela no persigue, pero un cocodrilo sí, y cada segundo está más cerca. Solo la escalera lo deja atrás.
  const CATCH_IN = 26, BITE_AT = 1.7; // segundos hasta alcanzarlo; distancia del mordisco
  let boss = new THREE.Group(), chase = 0, warned = false;
  function makeBoss() { // se arma al bajar, para tomar el modelo de Blender si ya cargó
    game.scene.remove(boss);
    boss = game.spawn('cocodrilo');
    boss.scale.setScalar(1.35); // más grande tapa a Tinto, porque la cámara va detrás del cocodrilo
    game.scene.add(boss);
  }
  const gapAt = t => Math.max(BITE_AT - .3, game.cfg.gapMax + 1.5 - t * (game.cfg.gapMax + 1.5 - BITE_AT) / CATCH_IN);
  game.on('sub', w => { chase = 0; warned = false; if (w) makeBoss(); boss.visible = !!w; });
  game.on('update', dt => {
    if (!game.sub || S.state !== 'play') return;
    chase += dt;
    S.dogGap = gapAt(chase); // la cámara va detrás del cocodrilo, como arriba va detrás de Panela
    if (!warned && S.dogGap < 4) { warned = true; game.fx?.banner?.('¡Busca la escalera!'); game.sfx(140, .5, 'sawtooth', .1, -60); }
    if (S.dogGap <= BITE_AT) { chase -= 3.5; game.damage({ dmg: 45, type: 'mordisco' }); } // muerde y vuelve a la carga
  });
  game.on('frame', () => {
    if (!boss.visible) return;
    if (!game.sub) { boss.visible = false; return; }
    game.dog.visible = false; // si Tinto cae abajo, quien lo atrapa es el cocodrilo
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
