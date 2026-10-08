// Gatos de Cat Run: elenco, modelos, habilidades y botón de habilidad. Contrato en AGENTES.md.
// Todo lo que este módulo le cambia a cfg se deshace al cambiar de gato o al terminar el efecto.

export function install(game) {
  const { THREE, geo, part, cfg, S, p, scene } = game;
  const { BOX, BALL, CAP, EAR, CYL, RING } = geo;
  const sfx = game.sfx, TAU = Math.PI * 2;

  /* ---------- Modelo paramétrico: mismas proporciones del gato del núcleo por defecto ---------- */
  // Cada pieza rígida (torso, cráneo, oreja, pata, cola) se funde en una sola malla con color por vértice:
  // un gato son ~11 mallas y un material propio (permite transparencia sin afectar a nadie más).
  function buildCat(c, o = {}, extra = {}) {
    const { bw = .64, bh = .6, bl = 1.25, leg = .46, lw = .16, lx = .18, lz = .42, hs = 1, ew = .26, eh = .32, ex = .2,
      tl = .72, tw = .15, tipw = .19, stripes = true, tailRot = .6 } = o;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), own = [];
    const fuse = g => {
      const baked = game.bake(g);
      g.clear();
      for (const { geometry } of baked) { own.push(geometry); g.add(new THREE.Mesh(geometry, mat)); }
      return g;
    };
    // grupo con pivote propio; draw(g) le pone piezas y se funde
    const grp = (parent, x, y, z, draw) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      parent.add(g);
      if (draw) { draw(g); fuse(g); }
      return g;
    };
    const top = leg - .06 + bh, by = top - bh / 2, hy = top + .08, hz = -(bl * .5 + .1);
    const d = { bw, bh, bl, leg, top, by, hy, hz, hs };
    const root = new THREE.Group(), b = new THREE.Group(), x = {};
    root.add(b);

    const torso = grp(b, 0, 0, 0, g => {
      part(BALL, c.fur, bw, bh, bl, 0, by, 0, g);
      part(BALL, c.white, bw * .78, bh * .67, bl * .8, 0, by - bh * .23, -.05, g);
      if (stripes) for (const z of [-.32, 0, .3]) part(BALL, c.dark, bw * 1.03, bh * .83, .11, 0, by + bh * .12, z * bl / 1.25, g);
      extra.torso?.(g, d);
    });

    const head = grp(b, 0, hy, hz);
    head.scale.setScalar(hs);
    grp(head, 0, 0, 0, g => {
      part(BALL, c.fur, .66, .58, .58, 0, 0, 0, g);
      part(BALL, c.dark, .2, .6, .5, 0, 0, .02, g);
      part(BALL, c.white, .36, .26, .22, 0, -.1, -.25, g);
      part(BALL, 0xff8fa8, .09, .07, .07, 0, -.05, -.36, g);
      for (const s of [-.16, .16]) {
        part(BALL, 0xffffff, .22, .24, .12, s, .08, -.22, g);
        part(BALL, c.eye, .15, .17, .1, s, .08, -.26, g);
        part(BALL, 0x111111, .07, .12, .06, s, .08, -.29, g);
      }
      extra.head?.(g, d);
    });
    const ears = [-1, 1].map(s => grp(head, s * ex, .2, .02, g => {
      part(EAR, c.fur, ew, eh, .16, 0, eh * .44, 0, g);
      part(EAR, 0xff9fb5, ew * .58, eh * .62, .08, 0, eh * .38, -.06, g);
    }));

    const tail = grp(b, 0, top - .12, bl * .44);
    tail.rotation.x = tailRot;
    grp(tail, 0, 0, 0, g => part(CAP, c.fur, tw, tl / 4, tw, 0, tl / 4, 0, g));
    const tip = grp(tail, 0, tl / 2, 0, g => {
      if (extra.tip) return extra.tip(g, d);
      part(CAP, c.fur, tw, tl / 4, tw, 0, tl / 4, 0, g);
      part(BALL, c.white, tipw, tipw * 1.26, tipw, 0, tl / 2 + .02, 0, g);
    });

    const legs = [[-lx, -lz], [lx, -lz], [lx, lz], [-lx, lz]].map(([px, pz]) => grp(b, px, leg, pz, g => {
      part(CAP, c.fur, lw, leg / 2, lw, 0, -leg / 2, 0, g);
      part(BALL, c.white, lw * 1.3, lw * .8, lw * 1.6, 0, -leg + lw * .3, -lw * .25, g);
    }));

    root.scale.setScalar(1.25);
    root.userData = { legs, tail, body: b, head, ears, tip, torso, mat, own, d, x, grp, tailRot };
    return root;
  }

  /* ---------- Elenco ---------- */
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd84a, side: THREE.DoubleSide });
  const defs = [
    // Tinto es el protagonista: gato negro callejero, pañuelo rojo y una oreja mordida (el id sigue siendo 'gris')
    { id: 'gris', name: 'Tinto', emoji: '🐈‍⬛', price: 0,
      desc: 'Negro como el café. Tinto no hizo nada. (Sí hizo.)',
      colors: { fur: 0x26262e, dark: 0x121216, white: 0x3a3a46, eye: 0xffd23f },
      ability: { id: 'zarpazo', name: 'Zarpazo', emoji: '🐾', cooldown: 6,
        desc: 'Manda a volar el obstáculo que tengas enfrente en tu carril.' },
      build() {
        const m = buildCat(this.colors, { stripes: false }, {
          torso: (g, d) => {
            part(CYL, 0xd01828, .56, .13, .54, 0, d.hy - .19, d.hz + .2, g).rotation.x = 1.05; // pañuelo al cuello
            part(EAR, 0xd01828, .34, .34, .08, 0, d.hy - .2, d.hz + .5, g).rotation.x = 2.5; // punta del pañuelo sobre el lomo
            part(BALL, 0xb01020, .14, .12, .12, 0, d.hy - .05, d.hz + .44, g); // nudo
          }
        });
        const u = m.userData;
        u.ears[0].scale.set(1, .6, 1); // la oreja mordida
        u.x.bell = u.grp(u.body, 0, u.d.hy - .3, u.d.hz + .06, g => part(BALL, 0xffc21a, .14, .14, .14, 0, -.09, 0, g));
        return m;
      } },
    { id: 'naranja', name: 'Mango', emoji: '🐈', price: 150,
      desc: 'Flaco, naranja y acróbata. Si puede dar una voltereta, la da.',
      colors: { fur: 0xf28c28, dark: 0xb85f10, white: 0xfff1e0, eye: 0x8fd14f },
      ability: { id: 'doble', name: 'Doble salto', emoji: '🤸', cooldown: 0, passive: true,
        desc: 'Salta otra vez en el aire con una voltereta. Siempre disponible.' },
      build() {
        const m = buildCat(this.colors, { bw: .56, bh: .54, leg: .56, lw: .14, eh: .36, tl: .86, tw: .13, tipw: .17 }, {
          torso: (g, d) => { part(CYL, 0x2f8f6b, .5, .13, .48, 0, d.hy - .19, d.hz + .2, g).rotation.x = 1.05; },
          head: g => { part(EAR, 0xb85f10, .12, .22, .1, 0, .34, -.06, g).rotation.x = -.35; }
        });
        const u = m.userData;
        u.x.flaps = [-1, 1].map(s => u.grp(u.body, s * .07, u.d.hy - .1, u.d.hz + .42, g => part(BOX, 0x2f8f6b, .13, .03, .5, 0, 0, .25, g)));
        return m;
      } },
    { id: 'pluma', name: 'Pluma', emoji: '😺', price: 400,
      desc: 'Pequeña, liviana y con capa de aviadora. Cree que es una ardilla voladora.',
      colors: { fur: 0xe8d9bd, dark: 0x8a6844, white: 0xfff8ea, eye: 0x3fb7c9 },
      ability: { id: 'planeo', name: 'Planeo', emoji: '🪂', cooldown: 5, duration: 1.6,
        desc: 'Abre la capa y planea: pasa por encima de varios obstáculos bajos.' },
      build() {
        const m = buildCat(this.colors, { bw: .6, bh: .52, leg: .4, hs: 1.05, ew: .34, eh: .42, ex: .23, tl: .8, tw: .2, tipw: .3 }, {
          head: g => {
            part(BALL, 0x6b4a2f, .7, .1, .62, 0, .22, 0, g);
            for (const s of [-.13, .13]) part(CYL, 0x9fe8ff, .17, .06, .17, s, .26, -.2, g).rotation.x = 1.2;
          }
        });
        const u = m.userData;
        u.x.wings = [-1, 1].map(s => u.grp(u.body, s * u.d.bw * .36, u.d.top - .08, .02, g => {
          part(BALL, 0x2aa39a, .78, .05, .95, s * .38, 0, 0, g);
          part(BALL, 0x7fe0d2, .4, .06, .6, s * .42, 0, 0, g);
        }));
        u.x.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * 1.15; }); // plegada (así sale también en una vitrina)
        u.x.spread = 0;
        return m;
      } },
    { id: 'bola', name: 'Bola', emoji: '😼', price: 750,
      desc: 'Gordo, feliz y con casco. No esquiva: atraviesa.',
      colors: { fur: 0xf6f0e4, dark: 0xe58a2b, white: 0xffffff, eye: 0x6fc24a },
      ability: { id: 'embestida', name: 'Embestida', emoji: '💥', cooldown: 14, duration: 2.2,
        desc: 'Carga a toda velocidad y revienta lo que toque. Cada obstáculo roto deja 2 monedas.' },
      build() {
        return buildCat(this.colors, { bw: 1.02, bh: .84, bl: 1.3, leg: .36, lw: .21, lx: .3, lz: .4, hs: 1.08, tl: .4, tw: .2, tipw: .24, tailRot: .9 }, {
          torso: (g, d) => part(BALL, 0x2b2b30, .5, .4, .5, .3, d.by + .22, .25, g),
          head: g => {
            part(BALL, 0x2f6fd8, .72, .46, .64, 0, .14, .05, g);
            part(BALL, 0xffffff, .14, .48, .66, 0, .14, .05, g);
          }
        });
      } },
    { id: 'chispa', name: 'Chispa', emoji: '⚡', price: 1200,
      desc: 'Gata eléctrica con cola de rayo y un imán amarrado al lomo.',
      colors: { fur: 0xf7cf3a, dark: 0x9a6a12, white: 0xfff6d0, eye: 0x35b8ff },
      ability: { id: 'iman', name: 'Imán', emoji: '🧲', cooldown: 16, duration: 6,
        desc: 'Durante 6 segundos atrae monedas y ratones de los tres carriles.' },
      build() {
        const m = buildCat(this.colors, { bw: .6, bh: .56, leg: .48, ew: .3, eh: .4, tl: .7, tw: .12 }, {
          tip: g => {
            part(BOX, 0xf7cf3a, .12, .36, .1, .1, .13, 0, g).rotation.z = -.65;
            part(BOX, 0xf7cf3a, .12, .36, .1, .08, .38, 0, g).rotation.z = .75;
            part(EAR, 0xfff6d0, .2, .42, .1, .06, .68, 0, g).rotation.z = -.3;
          }
        });
        const u = m.userData;
        u.x.magnet = u.grp(u.body, 0, u.d.top - .02, .1, g => {
          part(BOX, 0xd8262c, .4, .11, .13, 0, .06, 0, g);
          for (const s of [-.145, .145]) {
            part(BOX, 0xd8262c, .11, .26, .13, s, .2, 0, g);
            part(BOX, 0xd9dde4, .11, .1, .13, s, .38, 0, g);
          }
        });
        return m;
      } },
    { id: 'negro', name: 'Sombra', emoji: '🐈‍⬛', price: 1800,
      desc: 'Largo, flaco y de antifaz. Lo ves, y ya no lo ves.',
      colors: { fur: 0x3b3566, dark: 0x241f45, white: 0x3b3566, eye: 0xffd23f },
      ability: { id: 'sigilo', name: 'Sigilo', emoji: '🥷', cooldown: 16, duration: 3.5,
        desc: 'Se vuelve sombra: atraviesa los obstáculos y el perro le pierde el rastro.' },
      build() {
        const m = buildCat(this.colors, { bw: .5, bh: .5, bl: 1.38, leg: .58, lw: .125, lx: .15, lz: .5, hs: .95, eh: .48, tl: 1, tw: .1, tipw: .12, stripes: false, tailRot: 1.1 }, {
          head: g => part(BALL, 0x7b3fd1, .68, .2, .6, 0, .08, 0, g)
        });
        const u = m.userData;
        u.x.flaps = [-1, 1].map(s => u.grp(u.head, s * .05, .08, .28, g => part(BOX, 0x7b3fd1, .08, .03, .34, 0, 0, .17, g)));
        return m;
      } },
    { id: 'nube', name: 'Nube', emoji: '😇', price: 2500,
      desc: 'Blanca, esponjosa y con aureola. Dicen que ya gastó seis vidas.',
      colors: { fur: 0xfbfbff, dark: 0xdfe3ee, white: 0xffffff, eye: 0x4fa8ff },
      ability: { id: 'vidas', name: 'Siete vidas', emoji: '💖', cooldown: 0, passive: true,
        desc: 'Una vez por partida, cuando el perro la iba a atrapar, revive con media vida.' },
      build() {
        const m = buildCat(this.colors, { bw: .74, bh: .68, leg: .42, lw: .19, lx: .2, hs: 1.05, ew: .28, eh: .3, tl: .8, tw: .28, tipw: .44, stripes: false }, {
          torso: (g, d) => {
            part(BALL, 0xffffff, .7, .5, .4, 0, d.by + .05, -d.bl * .4, g);
            for (const s of [-.25, .25]) part(BALL, 0xffffff, .5, .45, .5, s, d.by, d.bl * .3, g);
          },
          head: g => { for (const s of [-.3, .3]) part(BALL, 0xeef0f6, .26, .24, .2, s, -.08, -.05, g); }
        });
        const u = m.userData, halo = new THREE.Mesh(RING, haloMat);
        halo.scale.setScalar(.2); halo.position.set(0, .62, 0); halo.rotation.x = .25;
        u.head.add(halo);
        u.x.halo = halo;
        return m;
      } }
  ];
  for (const c of defs) { const make = c.build; c.build = () => { const m = make.call(c); m.userData.gid = c.id; return m; }; }
  game.cats.length = 0;
  game.cats.push(...defs);

  /* ---------- Estado de la habilidad ---------- */
  const st = { cd: 0, cdMax: 1, act: 0, actMax: 1, lives: 0, flip: 0, swipe: 0, pulse: 0, smashed: 0 };
  let def = null, ab = null, undoPassive = [], undoActive = null, model = null, T = 0;
  // cambia un ajuste y deja anotado cómo deshacerlo (exacto si nadie más lo tocó; si no, resta lo sumado)
  function bump(key, d, list) {
    const before = cfg[key], now = before + d;
    cfg[key] = now;
    list.push(() => { cfg[key] = cfg[key] === now ? before : cfg[key] - d; });
  }
  function endActive() {
    const f = undoActive;
    undoActive = null; st.act = 0;
    f?.();
  }
  function apply() {
    endActive();
    undoPassive.reverse().forEach(f => f());
    undoPassive = [];
    clearFx();
    def = defs.includes(game.catDef) ? game.catDef : null;
    ab = def ? ABIL[def.ability.id] : null;
    Object.assign(st, { cd: 0, cdMax: 1, act: 0, actMax: 1, lives: 0, flip: 0, swipe: 0, pulse: 0, smashed: 0 });
    ab?.on?.();
    label();
  }

  /* ---------- Efectos (se crean una vez, se reutilizan y quedan ocultos) ---------- */
  const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const fxG = new THREE.Group();
  scene.add(fxG);
  const slashMat = glow(0xfff7c2), slashG = new THREE.Group();
  for (const sx of [-.28, 0, .28]) part(BOX, slashMat, .16, 2, .1, sx * 1.7, 0, 0, slashG);
  slashG.position.set(0, 1.25, -2.2); slashG.visible = false;
  fxG.add(slashG);
  const chargeMat = glow(0xff9a2e, .3), chargeG = new THREE.Group();
  const bow = part(BALL, chargeMat, 2, 1.8, .9, 0, .95, -1.25, chargeG);
  const streaks = [[-.75, .5], [.75, .6], [-.5, 1.5], [.55, 1.4]].map(([sx, sy]) => part(BOX, chargeMat, .06, .06, 1.5, sx, sy, 1, chargeG));
  chargeG.visible = false;
  fxG.add(chargeG);

  const rings = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(RING, glow(0xffffff));
    m.visible = false;
    scene.add(m);
    return { m, t: 0 };
  });
  function ring(color, r0, r1, life, y = .12, follow = false) {
    const r = rings.find(r => r.t <= 0) || rings[0];
    Object.assign(r, { t: life, life, r0, r1, y, follow });
    r.m.material.color.set(color);
    r.m.position.copy(game.cat.position); r.m.position.y += y;
    r.m.scale.set(r0, 1, r0);
    r.m.visible = true;
  }
  // copia congelada del gato (comparte geometrías): fantasma al revivir, señuelo del sigilo
  const ghostMat = glow(0xffffff, .7), decoyMat = glow(0x7b3fd1, .6);
  let ghosts = [], flyers = [];
  function snapshot(mat, life, rise, op, follow) {
    const cat = game.cat, g = new THREE.Group();
    cat.updateMatrixWorld(true);
    const inv = cat.matrixWorld.clone().invert();
    cat.traverse(o => {
      if (!o.isMesh) return;
      const m = new THREE.Mesh(o.geometry, mat);
      m.matrixAutoUpdate = false;
      m.matrix.multiplyMatrices(inv, o.matrixWorld);
      g.add(m);
    });
    g.position.copy(cat.position); g.quaternion.copy(cat.quaternion); g.scale.copy(cat.scale);
    scene.add(g);
    ghosts.push({ g, mat, t: life, life, rise, op, follow });
  }
  // saca un obstáculo del camino: los huecos se cierran, lo demás sale volando
  function knock(o) {
    o.hit = true;
    if (!o.mesh) return;
    const hole = o.y1 <= .2;
    flyers.push({ m: o.mesh, t: hole ? .25 : .75, hole, vx: (Math.random() - .5) * 9, spin: 6 + Math.random() * 6 });
  }
  function clearFx() {
    for (const g of ghosts) scene.remove(g.g);
    for (const f of flyers) f.m.visible = false;
    ghosts = []; flyers = [];
    for (const r of rings) { r.t = 0; r.m.visible = false; }
    slashG.visible = chargeG.visible = false;
  }
  function fx(dt) {
    const cat = game.cat;
    fxG.position.copy(cat.position); fxG.rotation.y = cat.rotation.y;
    slashG.visible = st.swipe > 0;
    if (st.swipe > 0) {
      const k = 1 - st.swipe / .25;
      slashG.rotation.z = -1 + k * 2;
      slashG.scale.setScalar(.8 + k * .7);
      slashMat.opacity = 1 - k * k;
    }
    const charging = ab === ABIL.embestida && st.act > 0;
    chargeG.visible = charging;
    if (charging) {
      chargeMat.opacity = .26 + Math.sin(T * 30) * .08;
      bow.scale.set(2 + Math.sin(T * 22) * .12, 1.8 + Math.cos(T * 19) * .1, .9);
      streaks.forEach((s, i) => { s.position.z = .6 + ((T * 5 + i * .37) % 1) * 2.4; });
    }
    for (const r of rings) {
      if (r.t <= 0) continue;
      r.t -= dt;
      const k = 1 - Math.max(0, r.t) / r.life, s = r.r0 + (r.r1 - r.r0) * k;
      r.m.scale.set(s, 1, s);
      r.m.material.opacity = (1 - k) * .85;
      if (r.follow) { r.m.position.copy(cat.position); r.m.position.y += r.y; }
      if (r.t <= 0) r.m.visible = false;
    }
    for (const g of ghosts) {
      g.t -= dt;
      g.g.position.y += g.rise * dt;
      if (g.follow) { g.g.position.x = cat.position.x; g.g.position.z = cat.position.z; g.g.quaternion.copy(cat.quaternion); }
      g.mat.opacity = Math.max(0, g.t / g.life) * g.op;
      if (g.t <= 0) scene.remove(g.g);
    }
    if (ghosts.length) ghosts = ghosts.filter(g => g.t > 0);
    for (const f of flyers) {
      f.t -= dt;
      if (f.hole) f.m.scale.multiplyScalar(Math.max(0, 1 - dt * 12));
      else {
        f.m.position.z -= dt * S.speed * 1.2; f.m.position.y += dt * 6; f.m.position.x += f.vx * dt;
        f.m.rotation.x -= dt * f.spin; f.m.rotation.z += dt * f.spin * .5;
      }
      if (f.t <= 0) f.m.visible = false;
    }
    if (flyers.length) flyers = flyers.filter(f => f.t > 0);
  }

  /* ---------- Habilidades ---------- */
  // use() devuelve false si no se pudo usar, o {dur, cd}; damage(o) devuelve false para cancelar un golpe
  const ABIL = {
    zarpazo: {
      use() {
        const reach = 8 + S.speed * .25;
        let best = null;
        for (const o of game.cur.obs) {
          if (o.hit || o.collect || o.top) continue; // las rampas y tarimas no se tumban
          const d = o.s - p.s;
          if (d < -o.hl - .5 || d > reach + o.hl || Math.abs(o.x - p.x) > o.hw + .6) continue;
          if (!best || o.s < best.s) best = o;
        }
        st.swipe = .25;
        sfx(900, .12, 'sawtooth', .07, -600);
        if (!best) return { cd: 1.5 }; // zarpazo al aire: recarga corta
        knock(best);
        sfx(160, .18, 'square', .08, -80);
        ring(0xfff7c2, .3, 1.4, .25, .15);
        return {};
      }
    },
    doble: {
      passive: true,
      on() { bump('airJumps', 1, undoPassive); },
      press() { game.input.jump(); },
      status: () => ({ on: p.y <= 0 || p.air < cfg.airJumps, txt: '' }),
      jump(e) {
        if (!e.air) return;
        st.flip = .45;
        ring(0xffb84f, .3, 2, .35, 0);
        sfx(660, .18, 'triangle', .07, 500);
      }
    },
    planeo: {
      use() {
        if (p.y <= 0) game.input.jump();
        if (p.y <= 0) return false; // cayendo en una alcantarilla: no hay de dónde planear
        sfx(520, .3, 'sine', .06, 260);
        ring(0x7fe0d2, .4, 2.4, .4, .6);
        return { dur: def.ability.duration };
      },
      // se emite antes de la física del cuadro: se compensa la gravedad para caer despacio
      tick(dt) { if (p.y > 0 && p.vy < -1.2) p.vy = -1.2 + cfg.gravity * dt; },
      land() { if (st.act > 0) endActive(); },
      slide() { if (st.act > 0) endActive(); }
    },
    embestida: {
      use() {
        const list = [];
        bump('baseSpeed', 7, list); bump('maxSpeed', 7, list);
        undoActive = () => list.reverse().forEach(f => f());
        sfx(120, .5, 'sawtooth', .1, 260);
        ring(0xff9a2e, .5, 3, .4, .2);
        return { dur: def.ability.duration };
      },
      damage(o) {
        if (st.act <= 0) return;
        knock(o);
        st.smashed++;
        S.coins += 2;
        sfx(90, .2, 'square', .1, -40); sfx(1100, .08, 'square', .05);
        ring(0xffd23f, .5, 2.6, .3, .8);
        game.hud();
        return false;
      }
    },
    iman: {
      use() {
        st.pulse = 0;
        sfx(300, .35, 'sine', .07, 700);
        return { dur: def.ability.duration };
      },
      tick(dt) {
        for (const o of game.cur.obs) {
          if (!o.collect || o.hit) continue;
          const d = o.s - p.s;
          if (d < -2.5 || d > 16) continue;
          o.x += (p.x - o.x) * Math.min(1, dt * 7);
          o.mesh.position.x = o.x;
          if (d < 2.4) game.collect(o);
        }
      }
    },
    sigilo: {
      use() {
        const list = [], u = game.cat.userData;
        bump('gapMin', 3, list); bump('gapMax', 3, list);
        undoActive = () => { list.reverse().forEach(f => f()); if (S.state === 'play') ring(0x7b3fd1, 2, .4, .3, .6, true); };
        S.health = Math.min(100, S.health + 10);
        if (u.gid) snapshot(decoyMat, .9, 0, .6);
        ring(0x7b3fd1, .4, 2.6, .4, .6);
        sfx(700, .4, 'sine', .06, -500);
        game.hud();
        return { dur: def.ability.duration };
      },
      damage() { if (st.act > 0) return false; }
    },
    vidas: {
      passive: true,
      on() { st.lives = 1; },
      press() { sfx(st.lives ? 1200 : 200, .1, 'triangle', .05, st.lives ? 300 : -60); },
      status: () => ({ on: st.lives > 0, txt: '×' + st.lives }),
      damage(o) {
        if (st.lives <= 0 || S.health - (o.dmg || 0) > 0) return;
        st.lives--;
        S.health = 50;
        p.inv = 3; p.slow = .6;
        if (o.fly) knock(o);
        snapshot(ghostMat, 1.3, 2.6, .7, true);
        ring(0xffd84a, .4, 4, .6, .3);
        ring(0xffffff, .3, 2.5, .45, 1);
        [520, 660, 880].forEach((f, i) => setTimeout(() => sfx(f, .25, 'triangle', .08), i * 110));
        game.hud();
        return false;
      }
    }
  };
  game.hooks.damage.push(o => (ab?.damage && S.state === 'play' ? ab.damage(o) : undefined));

  game.on('ability', () => {
    if (!ab || S.state !== 'play' || S.paused) return;
    if (ab.passive) return void ab.press?.();
    if (st.act > 0 || st.cd > 0) { sfx(140, .06, 'square', .03); nudge(); return; }
    const r = ab.use();
    if (!r) return;
    st.act = st.actMax = r.dur || 0;
    st.cd = st.cdMax = r.cd ?? def.ability.cooldown;
    press();
  });
  // la recarga empieza a contar cuando se acaba el efecto
  game.on('update', dt => {
    if (!ab || S.state !== 'play') return;
    if (st.act > 0) {
      ab.tick?.(dt);
      st.act -= dt;
      if (st.act <= 0) endActive();
    } else if (st.cd > 0) st.cd = Math.max(0, st.cd - dt);
  });
  game.on('jump', e => ab?.jump?.(e));
  game.on('land', () => { st.flip = 0; ab?.land?.(); });
  game.on('slide', () => ab?.slide?.());
  game.on('start', apply);
  game.on('cat', () => {
    if (model && model !== game.cat) { clearFx(); model.userData.own.forEach(g => g.dispose()); model.userData.mat.dispose(); }
    model = game.cat?.userData.gid ? game.cat : null;
    apply();
  });

  /* ---------- Gestos propios de cada gato (partes internas; la raíz no se toca) ---------- */
  const GEST = {
    gris(u, k) { // oreja que se sacude de vez en cuando y cascabel que baila
      const tw = Math.max(0, Math.sin(k.T * 2.3) - .9) * 10;
      u.ears[0].rotation.z = Math.sin(k.T * 40) * tw * .35;
      u.x.bell.rotation.set(Math.sin(k.ph * 2) * .6 * k.run, 0, Math.sin(k.ph) * .4 * k.run + Math.sin(k.T * 2) * .08);
    },
    naranja(u, k) { // pañoleta al viento
      u.x.flaps.forEach((f, i) => f.rotation.set(-.2 - (k.air ? .5 : 0) + Math.sin(k.T * 15 + i * 1.7) * .22 * (.3 + k.run), Math.sin(k.T * 9 + i * 2.1) * .25, 0));
    },
    pluma(u, k) { // capa plegada que aletea; se abre al saltar y del todo al planear
      const want = ab === ABIL.planeo && st.act > 0 ? 1 : k.air ? .4 : 0;
      u.x.spread += (want - u.x.spread) * Math.min(1, k.dt * 12);
      u.x.wings.forEach((w, i) => {
        const s = i ? 1 : -1, fl = Math.sin(k.T * (want === 1 ? 26 : 11) + i) * (want === 1 ? .06 : .09 * k.run);
        w.rotation.z = -s * (1.15 * (1 - u.x.spread) + fl - u.x.spread * .12);
      });
      if (want === 1) u.body.rotation.x = -.06 + Math.sin(k.T * 5) * .04;
      u.ears.forEach(e => { e.rotation.x -= u.x.spread * .5; });
    },
    bola(u, k) { // panza que rebota; agacha el casco al embestir
      const j = Math.sin(k.ph * 2) * k.run;
      u.torso.scale.set(1 + j * .04, 1 - j * .05, 1 + j * .02);
      u.tail.rotation.x = u.tailRot + Math.sin(k.T * 18) * .2 * k.run;
      if (ab === ABIL.embestida && st.act > 0) { u.head.rotation.x = -.4; u.head.position.z = u.d.hz - .08; } else u.head.position.z = u.d.hz;
    },
    chispa(u, k) { // imán que tiembla (y vibra fuerte cuando está activo) y cola de rayo nerviosa
      const on = ab === ABIL.iman && st.act > 0;
      u.x.magnet.rotation.set(on ? -.5 : Math.sin(k.ph * 2) * .06 * k.run, 0, on ? Math.sin(k.T * 70) * .16 : Math.sin(k.T * 3) * .07);
      u.x.magnet.scale.setScalar(on ? 1.25 + Math.sin(k.T * 20) * .1 : 1);
      u.tip.rotation.set(Math.sin(k.T * 9) * .25, Math.sin(k.T * 23) * (on ? .5 : .12), u.tip.rotation.z);
    },
    negro(u, k) { // orejas hacia atrás, cola baja y sinuosa, cintas del antifaz; translúcido en sigilo
      const on = ab === ABIL.sigilo && st.act > 0, m = u.mat;
      u.ears.forEach(e => { e.rotation.x += .3 * k.run; });
      u.tail.rotation.x = u.tailRot + .2 * k.run + Math.sin(k.w) * .12;
      u.tip.rotation.x = -.5 + Math.sin(k.w + 1.2) * .4;
      u.x.flaps.forEach((f, i) => f.rotation.set(-.1 + Math.sin(k.T * 14 + i * 2) * .25 * (.3 + k.run), Math.sin(k.T * 8 + i) * .3, 0));
      m.opacity += ((on ? .3 + Math.sin(k.T * 9) * .06 : 1) - m.opacity) * Math.min(1, k.dt * 10);
      const tr = m.opacity < .97;
      if (!tr) m.opacity = 1;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    },
    nube(u, k) { // aureola que flota (se apaga al gastar la vida) y colaza esponjosa
      const h = u.x.halo;
      h.visible = S.state !== 'play' || ab !== ABIL.vidas || st.lives > 0;
      h.position.y = .62 + Math.sin(k.T * 3) * .04;
      h.rotation.z = Math.sin(k.T * 1.7) * .12;
      u.tail.rotation.x = u.tailRot - .25 + Math.sin(k.w) * .2;
      u.tip.rotation.x = Math.sin(k.w + .9) * .45;
    }
  };
  const K = { T: 0, ph: 0, w: 0, run: 0, air: false, dt: 0 };
  function pose(u, dt) {
    const run = S.state === 'play' ? 1 : 0, ph = game.phase * 1.6, air = p.y > 0, b = u.body;
    Object.assign(K, { T, ph, w: run ? ph * .5 : T * 2, run, air, dt });
    u.head.rotation.set(0, 0, 0);
    u.head.position.y = u.d.hy + (run ? Math.sin(ph * 2) * .025 : Math.sin(T * 1.6) * .012);
    for (const e of u.ears) e.rotation.set(Math.sin(ph * 2 + .6) * .1 * run + (air ? .25 : 0), 0, 0);
    u.tip.rotation.set(Math.sin(K.w + 1) * .3, 0, Math.sin(K.w - .8) * .35);
    GEST[u.gid]?.(u, K);
    if (st.swipe > 0) { // zarpazo: la pata delantera barre y la cabeza acompaña
      st.swipe -= dt;
      const k = 1 - Math.max(0, st.swipe) / .25;
      u.legs[1].rotation.x = -2 + k * 1.8;
      u.head.rotation.z = Math.sin(k * Math.PI) * .3;
    }
    if (st.flip > 0) { // voltereta del doble salto, girando sobre el centro del cuerpo
      st.flip -= dt;
      const k = 1 - Math.max(0, st.flip) / .45, a = -TAU * k * k * (3 - 2 * k), cy = u.d.by;
      b.rotation.x = a;
      b.position.set(0, cy * (1 - Math.cos(a)), -cy * Math.sin(a));
    } else if (b.position.y || b.position.z) b.position.set(0, 0, 0);
  }

  /* ---------- Botón de habilidad ---------- */
  const css = document.createElement('style');
  css.textContent = `
    #catAb { position: fixed; right: calc(14px + env(safe-area-inset-right, 0px)); bottom: calc(22px + env(safe-area-inset-bottom, 0px));
      width: clamp(86px, 23vmin, 110px); height: clamp(86px, 23vmin, 110px); border-radius: 50%; pointer-events: auto; touch-action: manipulation;
      border: 3px solid #fff; background: radial-gradient(circle at 35% 28%, #51468a, #1c2740 72%); color: #fff; font: inherit; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 0; overflow: hidden;
      box-shadow: 0 6px 0 #0009; -webkit-tap-highlight-color: transparent; transition: transform .08s, filter .2s, border-color .2s; --f: 0; }
    #catAb[hidden] { display: none; }
    #catAb::before { content: ''; position: absolute; inset: 0; border-radius: 50%; pointer-events: none; }
    #catAb .ci { font-size: 36px; line-height: 1; transition: opacity .2s; }
    #catAb .cl { font-size: 11px; font-weight: 800; letter-spacing: .3px; text-transform: uppercase; max-width: 88%; line-height: 1.05; text-shadow: 0 1px 2px #000; }
    #catAb .cn { position: absolute; inset: 0; display: grid; place-items: center; font-size: 34px; font-weight: 900; text-shadow: 0 2px 4px #000; pointer-events: none; }
    #catAb .ck { position: absolute; top: 9px; right: 15px; font-size: 11px; font-weight: 800; background: #fff; color: #1c2740; border-radius: 5px; padding: 0 5px; display: none; }
    @media (hover: hover) and (pointer: fine) { #catAb .ck { display: block; } }
    #catAb.lista { border-color: var(--accent, #ffb84f); animation: catAbPulse 1.1s ease-in-out infinite; }
    #catAb.recarga { filter: saturate(.45); }
    #catAb.recarga::before { background: conic-gradient(#0a0d1ccc calc(var(--f) * 1turn), transparent 0); }
    #catAb.recarga .ci, #catAb.recarga .cl { opacity: .35; }
    #catAb.activa { border-color: var(--good, #5be39a); box-shadow: 0 6px 0 #0009, 0 0 22px 6px var(--good, #5be39a); }
    #catAb.activa::before { background: conic-gradient(#ffffff4d calc(var(--f) * 1turn), transparent 0); }
    #catAb.pasiva { border-color: var(--good, #5be39a); }
    #catAb.pasiva .cn { inset: auto 0 6px 0; font-size: 15px; }
    #catAb.gastada { filter: grayscale(1) brightness(.65); border-color: #fff8; }
    #catAb.toque { transform: scale(.9); }
    #catAb.no { animation: catAbNo .25s; }
    #catAb.pausa { opacity: .4; }
    @keyframes catAbPulse { 50% { box-shadow: 0 6px 0 #0009, 0 0 20px 7px var(--accent, #ffb84f); transform: scale(1.05); } }
    @keyframes catAbNo { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }`;
  document.head.appendChild(css);
  const btn = document.createElement('button');
  btn.id = 'catAb'; btn.type = 'button'; btn.tabIndex = -1; btn.hidden = true; btn.dataset.ui = '';
  const span = cls => { const s = document.createElement('span'); s.className = cls; btn.appendChild(s); return s; };
  const ico = span('ci'), lbl = span('cl'), num = span('cn'), key = span('ck');
  key.textContent = 'E';
  game.ui.hud.appendChild(btn);
  btn.addEventListener('pointerdown', e => { e.preventDefault(); game.emit('ability'); });
  btn.addEventListener('contextmenu', e => e.preventDefault());
  const drawn = { cls: '', f: -1, num: '' };
  let pressT = 0, noT = 0;
  function label() {
    ico.textContent = def ? def.ability.emoji : '';
    lbl.textContent = def ? def.ability.name : '';
    btn.setAttribute('aria-label', def ? `Habilidad: ${def.ability.name}. ${def.ability.desc}` : 'Habilidad');
    btn.title = def ? def.ability.desc : '';
  }
  function press() { pressT = .12; }
  function nudge() { noT = .25; }
  function drawBtn(dt) {
    const show = !!ab && S.state === 'play';
    if (btn.hidden === show) btn.hidden = !show;
    if (!show) return;
    pressT -= dt; noT -= dt;
    let cls, f = 0, n = '';
    if (ab.passive) { const s = ab.status(); cls = s.on ? 'pasiva' : 'pasiva gastada'; n = s.txt; }
    else if (st.act > 0) { cls = 'activa'; f = st.act / st.actMax; }
    else if (st.cd > 0) { cls = 'recarga'; f = st.cd / st.cdMax; n = String(Math.ceil(st.cd)); }
    else cls = 'lista';
    if (pressT > 0) cls += ' toque';
    if (noT > 0) cls += ' no';
    if (S.paused) cls += ' pausa';
    f = Math.round(f * 50) / 50;
    if (cls !== drawn.cls) btn.className = drawn.cls = cls;
    if (f !== drawn.f) btn.style.setProperty('--f', drawn.f = f);
    if (n !== drawn.num) num.textContent = drawn.num = n;
  }

  game.on('frame', ({ dt }) => {
    T += dt;
    if (st.act > 0 && S.state !== 'play') endActive(); // la partida se acabó con el efecto puesto: se deshace ya
    const u = game.cat?.userData;
    if (u?.gid) pose(u, dt);
    if (ab === ABIL.iman && st.act > 0 && (st.pulse -= dt) <= 0) { st.pulse = .32; ring(0x35b8ff, 3.2, .5, .32, .7, true); }
    if (game.cat) fx(dt);
    drawBtn(dt);
  });

  // por si el módulo se instala con un gato ya puesto
  if (game.cat) apply();
}
