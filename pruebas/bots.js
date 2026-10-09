// Banco de pruebas con bots para Tinto. NO se enchufa al juego: se carga a mano desde la consola
// con el juego abierto en http://localhost:5173 (todos los módulos cargados):
//
//   const bots = (await import('/pruebas/bots.js?v=' + Date.now())).default;
//   await bots.run({ profile: 'quieto', lane: 0, world: 'pueblo', seed: 1 });        // una partida, devuelve sus métricas
//   bots.batch({ profiles: ['quietoC', 'humano'], worlds: ['pueblo'], seeds: 10 });  // lote en segundo plano
//   bots.progress            // { done, total, running }
//   bots.table()             // resumen por perfil × mundo (promedios) de bots.results
//   bots.rowStats('pueblo', 30)  // solo generación: cómo son las filas (sin correr ningún bot)
//   bots.cleanup()           // deja localStorage (catRun*) como estaba al cargar el banco
//
// Perfiles: quietoL / quietoC / quietoR (no toca nada; carril -1 / 0 / 1), azar (entradas al azar),
// humano (ve a 22 m, reacciona en ~300 ms, 12 % de error), experto (ve a 45 m, 50 ms, 1 % de error).
// Reproducibilidad: durante cada partida Math.random se sustituye por un generador con semilla y se
// restaura al terminar. El juego no se modifica.

const g = window.game;
if (!g) throw new Error('No hay window.game: abre el juego primero');
const { S, p, cfg } = g;

/* ---------- utilidades ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;
const laneOf = x => Math.max(-1, Math.min(1, Math.round(x / 3)));
const yieldNow = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r1 = v => Math.round(v * 10) / 10;

/* ---------- localStorage: foto al cargar y restauración ---------- */
// La foto se guarda también en localStorage: si la pestaña se recarga a mitad de un lote y se vuelve a importar el banco,
// la foto buena es la primera, no la contaminada por las partidas de prueba.
const SNAP_KEY = 'pruebasBotsFoto';
let snap = (() => { try { return JSON.parse(localStorage.getItem(SNAP_KEY)); } catch { return null; } })();
if (!snap) {
  snap = {};
  for (const k of Object.keys(localStorage)) if (k.startsWith('catRun')) snap[k] = localStorage.getItem(k);
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(snap)); } catch {}
}
function cleanup() {
  for (const k of Object.keys(localStorage)) if (k.startsWith('catRun') && !(k in snap)) localStorage.removeItem(k);
  for (const k in snap) localStorage.setItem(k, snap[k]);
  localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SNAP_KEY);
  return Object.keys(snap);
}

/* ---------- análisis de filas: qué carriles bloquea cada fila de un tramo ---------- */
// Tipos que cruzan la calle de lado a lado (bloquean, en algún momento, los tres carriles)
const MOVING_ALL = new Set(['senora', 'burro', 'balon', 'pelota', 'dron']);
const rowsOf = new WeakMap();
function analyze(seg) {
  const dmg = seg.obs.filter(o => !o.collect && o.dmg > 0 && !o.ramp).sort((a, b) => a.s - b.s);
  const rows = [];
  for (const o of dmg) {
    let r = rows[rows.length - 1];
    if (!r || o.s - r.end > 12) { r = { s: o.s, end: o.s, obs: [], all: new Set(), stat: new Set(), moving: false, passed: false }; rows.push(r); }
    r.end = Math.max(r.end, o.s); r.obs.push(o);
    const lanes = [];
    if (o.hw >= 4.5) lanes.push(-1, 0, 1);
    else if (MOVING_ALL.has(o.type)) { r.moving = true; [-1, 0, 1].forEach(l => r.all.add(l)); continue; }
    else if (o.type === 'carro' && o.animate) { lanes.push(laneOf(o.x), laneOf(o.x + (o.dir || 0) * 3)); r.moving = true; }
    else for (const l of [-1, 0, 1]) if (Math.abs(o.x - l * 3) <= o.hw + .4) lanes.push(l);
    for (const l of lanes) { r.all.add(l); r.stat.add(l); }
  }
  for (const r of rows) {
    r.free = [-1, 0, 1].filter(l => !r.all.has(l));         // carril libre contando lo que se mueve como bloqueo
    r.freeStat = [-1, 0, 1].filter(l => !r.stat.has(l));    // carril libre ignorando lo que se mueve
    r.types = [...new Set(r.obs.map(o => o.type))].join('+');
  }
  // comida y ratones del tramo, por carril (para saber cuánto cura cada carril)
  seg.healByLane = { '-1': 0, '0': 0, '1': 0 };
  for (const o of seg.obs) if (o.collect && (o.type === 'raton' || o.food) && (o.yb || 0) < .5) seg.healByLane[laneOf(o.x)] += o.food || cfg.mouseHeal;
  return rows;
}
g.on('segment', seg => rowsOf.set(seg, analyze(seg)));

/* ---------- eventos del juego → estadísticas del bot en curso ---------- */
let cur = null; // bot en curso
g.on('hit', o => { if (!cur) return; cur.st.hits++; cur.st.hitBy[o.type] = (cur.st.hitBy[o.type] || 0) + 1; cur.st.dmgNominal += o.dmg || 0; cur.lastHit = o.type; if (o.type === 'mordisco') cur.st.bites++; });
g.on('dying', e => { if (!cur || !e) return; cur.lastHit = (e.cause || cur.lastHit) + (e.hard ? ' (duro)' : e.cause === 'cocodrilo' ? '' : ' (doble)'); });
g.on('nearmiss', () => { if (cur) cur.st.nearmiss++; });
g.on('rescue', () => { if (cur) cur.st.rescues++; });
g.on('collect', o => { if (!cur) return; if (o.type === 'raton') cur.st.healPot += cfg.mouseHeal; else if (o.food) { cur.st.healPot += o.food; cur.st.food++; } else if (o.type === 'escalera') cur.st.ladders++; else if (o.type === 'drenaje') cur.st.falls++; });
g.on('turn', e => { if (cur && e && e.dir) cur.st.turns++; });

/* ---------- perfiles ---------- */
const PROFILES = {
  quietoL: { kind: 'quieto', lane: -1 }, quietoC: { kind: 'quieto', lane: 0 }, quietoR: { kind: 'quieto', lane: 1 },
  quieto: { kind: 'quieto', lane: 0 },
  // "calle": quieto que solo salta la alcantarilla verde (nunca baja al drenaje); aísla la calle del submundo
  calleL: { kind: 'calle', lane: -1 }, calleC: { kind: 'calle', lane: 0 }, calleR: { kind: 'calle', lane: 1 },
  azar: { kind: 'azar' },
  humano: { kind: 'bot', see: 22, delay: .3, jitter: .05, err: .12, greedy: true },
  girador: { kind: 'bot', see: 22, delay: .3, jitter: .05, err: .12, greedy: true, turns: true }, // humano que entra a las calles laterales
  experto: { kind: 'bot', see: 45, delay: .05, jitter: .01, err: .01, greedy: true },
  perfecto: { kind: 'bot', see: 60, delay: .0, jitter: 0, err: 0, greedy: false } // ve todo y no falla: prueba que el generador es justo
};
const LEAD = { J: .25, S: .12, L: .3, R: .3 }; // segundos antes del obstáculo en que hay que ejecutar cada acción

function laneSafe(l, sMax, obs) {
  for (const o of obs) {
    if (o.hit || o.collect || !(o.dmg > 0) || o.ramp) continue;
    if (o.top && p.y >= o.top - .45) continue;
    if (o.s + o.hl < p.s || o.s - o.hl > sMax) continue;
    const slack = MOVING_ALL.has(o.type) ? 1.8 : 0;
    if (Math.abs(o.x - l * 3) <= o.hw + .4 + slack && !(o.y0 >= p.y + 1.3) && !(o.y1 <= p.y)) return false;
  }
  return true;
}
function choose(b, o, lane, obs) {
  const ground = p.y <= p.gy + .01;
  const canSlide = ground && o.y0 >= .5;                                     // hay hueco debajo
  const canJump = ground && o.y1 <= 1.25 && o.hl <= 2.5 && o.y0 <= .5;      // es bajo: se salta
  if (o.hw >= 4.5) return canSlide ? 'S' : 'J';                             // ocupa toda la calle: solo saltar o agacharse
  if (o.type === 'caneca' && canSlide) return 'S';                           // la caneca se busca: pasar agachado la carga
  const opts = [lane - 1, lane + 1].filter(l => l >= -1 && l <= 1);
  const safe = opts.filter(l => laneSafe(l, o.s + 10, obs));
  if (safe.length) { const l = safe.length === 1 ? safe[0] : safe[Math.floor(b.rng() * safe.length)]; return l < lane ? 'L' : 'R'; }
  if (canSlide) return 'S';
  if (canJump) return 'J';
  if (opts.length) return opts[0] < lane ? 'L' : 'R';
  return 'J';
}
function act(b, a) {
  b.st.inputs++;
  if (a === 'J') g.input.jump();
  else if (a === 'S') g.input.slide();
  else { p.lastT = -1e9; g.input.move(a === 'L' ? -1 : 1); } // sin doble toque: el bot no quiere girar por accidente
}
function exec(b, q) {
  let a = q.a;
  if (b.err && b.rng() < b.err) { if (b.rng() < .5) { b.st.errors++; return; } a = 'JSLR'[Math.floor(b.rng() * 4)]; b.st.errors++; }
  act(b, a);
}

/* ---------- un cuadro del bot: mide y decide ---------- */
function measure(b) {
  const st = b.st, h = S.health;
  if (h > b.lastH) st.healEff += h - b.lastH; else if (h < b.lastH) st.dmgEff += b.lastH - h;
  b.lastH = h;
  if (g.sub) st.sewerFrames++;
  if (p.inv > 0) {
    st.invFrames++;
    // golpes que la invulnerabilidad se comió: obstáculos que tocan al gato mientras p.inv > 0 y no quedan marcados
    for (const o of g.cur.obs) {
      if (o.hit || o.collect || !(o.dmg > 0) || o.ramp || b.absorbed.has(o)) continue;
      if (o.top && p.y >= o.top - .45) continue;
      if (o.s < p.s - o.hl - .5 || o.s > p.s + o.hl + .5 || Math.abs(o.x - p.x) > o.hw + .4 || p.y >= o.y1 || p.y + p.h <= o.y0) continue;
      b.absorbed.add(o); st.absorbed++; st.absorbedDmg += o.dmg;
    }
  }
  if (h <= 25) b.low = true; else if (b.low && h >= 60) { b.low = false; st.recoveries++; } // "resurrecciones": de ≤25 a ≥60
  if (h < st.minHealth) st.minHealth = h;
  const rows = rowsOf.get(g.cur) || [];
  for (const r of rows) {
    if (r.passed || r.s > p.s) continue;
    r.passed = true; st.rowsPassed++;
    if (r.all.has(p.lane)) st.rowsInLane++;
    if (r.stat.has(p.lane)) st.rowsInLaneStat++;
    if (r.free.length) st.rowsFree++;
    if (r.freeStat.length) st.rowsFreeStat++;
    if (r.all.size === 3) st.rowsAllBlocked++;
  }
  if (b.frame % 6 === 0) { // ¿hay algún carril donde quedarse quieto los próximos 40 m sin golpe?
    st.samples++;
    let free = new Set([-1, 0, 1]);
    for (const r of rows) if (r.s > p.s && r.s < p.s + 40) free = new Set(r.free.filter(l => free.has(l)));
    if (free.size) st.safeSamples++;
    if (free.has(p.lane)) st.safeHereSamples++;
  }
}
function botFrame(b) {
  b.frame++;
  measure(b);
  const now = S.time;
  if (b.kind === 'quieto') return;
  if (b.kind === 'calle') { // solo salta la alcantarilla verde del drenaje, justo antes de pisarla
    const v = Math.max(1, S.speed * p.slow);
    for (const o of g.cur.obs) if (o.type === 'drenaje' && !o.hit && Math.abs(o.x - p.x) <= o.hw + .4 && (o.s - o.hl - p.s) / v <= .25 && o.s + o.hl > p.s && p.y <= p.gy + .01) { act(b, 'J'); break; }
    return;
  }
  if (b.kind === 'azar') {
    if (now >= b.nextT) { b.nextT = now + .15 + b.rng() * .6; act(b, 'LRJSLR'[Math.floor(b.rng() * 6)]); }
    return;
  }
  while (b.q.length && b.q[0].t <= now) exec(b, b.q.shift());
  if (b.turns && g.cur !== b.turnedSeg) { // girador: pide el giro al acercarse a un cruce con salida
    const toCross = g.cur.L - p.s, d = g.cur.exits[-1] ? -1 : g.cur.exits[1] ? 1 : 0;
    if (d && toCross < 50 && toCross > 5) { b.turnedSeg = g.cur; g.input.turn(d); b.st.inputs++; }
  }
  const v = Math.max(1, S.speed * p.slow), lane = p.lane, x = lane * 3, obs = g.cur.obs;
  // en el drenaje la escalera manda: si hay una a la vista en otro carril seguro, ir por ella antes que nada
  if (g.sub && !b.q.length) {
    const lad = obs.find(o => o.type === 'escalera' && !o.hit && o.s - p.s > 2 && o.s - p.s < 40);
    if (lad) { const l = laneOf(lad.x); if (l !== lane) { const step = l > lane ? lane + 1 : lane - 1; if (laneSafe(step, lad.s + 2, obs)) { b.q.push({ t: now + b.delay, a: step > lane ? 'R' : 'L' }); b.lastGreedy = now; } } }
  }
  let imm = null, immT = Infinity;
  for (const o of obs) {
    if (o.hit || o.collect || !(o.dmg > 0) || o.ramp) continue;
    if (o.top && p.y >= o.top - .45) continue;
    const rel = o._ps === undefined ? 0 : (o._ps - o.s) * 60; o._ps = o.s; // lo que se acerca de frente llega antes
    const front = o.s - o.hl - p.s, back = o.s + o.hl - p.s;
    if (back < 0 || front > b.see) continue;
    if (Math.abs(o.x - x) > o.hw + .4) continue;
    if (o.y1 <= p.y + .001 || o.y0 >= p.y + 1.3) continue;
    const t = Math.max(0, front) / Math.max(1, v + rel);
    if (t < immT) { immT = t; imm = o; }
  }
  if (imm) {
    if (b.planned !== imm) {
      const a = choose(b, imm, lane, obs);
      if (immT <= LEAD[a] + b.delay) { b.planned = imm; b.q.push({ t: now + b.delay + (b.rng() - .5) * 2 * b.jitter, a, o: imm }); }
    }
    return;
  }
  if (b.greedy && !b.q.length && now - b.lastGreedy > .4) { // sin peligro a la vista: ir por la escalera o por el carril con más comida
    const cnt = { '-1': 0, '0': 0, '1': 0 };
    let ladder = null;
    for (const o of obs) {
      if (!o.collect || o.hit) continue;
      const d = o.s - p.s;
      if (d < 2 || d > 18) continue;
      const l = laneOf(o.x);
      if (o.type === 'escalera') ladder = l;
      else if ((o.yb || 0) < .5 && o.type !== 'drenaje') cnt[l]++;
    }
    let target = null;
    if (ladder != null && ladder !== lane) target = ladder;
    else { let best = lane, bc = cnt[lane]; for (const l of [-1, 0, 1]) if (cnt[l] >= bc + 2) { best = l; bc = cnt[l]; } if (best !== lane) target = best; }
    if (target != null) {
      const step = target > lane ? lane + 1 : lane - 1;
      if (laneSafe(step, p.s + 20, obs)) { b.lastGreedy = now; b.q.push({ t: now + b.delay, a: step > lane ? 'R' : 'L' }); }
    }
  }
}

/* ---------- una partida ---------- */
async function run(opts = {}) {
  const o = { profile: 'quietoC', world: 'pueblo', seed: 1, cat: 'gris', maxT: 300, ...opts };
  const prof = PROFILES[o.profile];
  if (!prof) throw new Error('perfil desconocido: ' + o.profile);
  const lane = o.lane ?? prof.lane ?? 0;
  if (S.paused) g.setPaused(false);
  Math.random = mulberry32((o.seed * 7919 + 13) | 0);
  try {
    if (g.catDef.id !== o.cat) g.setCat(o.cat);
    if (o.level) { // [mundo, nivel]: corre un nivel de levels.js (abre todo en memoria; cleanup() deja el guardado como estaba)
      const lv = g.levels; if (!lv) throw new Error('no está levels.js');
      lv.save.stars = [[3, 3, 3, 3, 3], [3, 3, 3, 3, 3], [3, 3, 3, 3, 3]]; // el mundo 3 pide 20 estrellas: con 1 por nivel (15) no abre
      if (!lv.play('level', o.level[0], o.level[1])) throw new Error('no se pudo abrir el nivel ' + o.level);
    } else {
      if (g.world.id !== o.world) g.setWorld(o.world);
      g.start();
    }
    const b = cur = { ...prof, kind: prof.kind, rng: mulberry32((o.seed * 104729 + 7) | 0), q: [], planned: null, nextT: 0, lastGreedy: -9, frame: 0, lastH: S.health, lastHit: '', absorbed: new Set(), low: false,
      st: { hits: 0, hitBy: {}, dmgNominal: 0, dmgEff: 0, healEff: 0, healPot: 0, food: 0, bites: 0, ladders: 0, falls: 0, turns: 0, inputs: 0, errors: 0, absorbed: 0, absorbedDmg: 0, recoveries: 0, minHealth: 100, nearmiss: 0, rescues: 0,
        rowsPassed: 0, rowsInLane: 0, rowsInLaneStat: 0, rowsFree: 0, rowsFreeStat: 0, rowsAllBlocked: 0, samples: 0, safeSamples: 0, safeHereSamples: 0, sewerFrames: 0, invFrames: 0 } };
    if (lane) { p.lastT = -1e9; g.input.move(lane); }
    let k = 0;
    while (S.state === 'play' && S.time < o.maxT) {
      g.sim(30, () => { if (S.state === 'play') botFrame(b); });
      if (++k % 20 === 0) await yieldNow();
    }
    const st = b.st, t = S.time, min = t / 60;
    const dead = S.state === 'dying' || (S.state === 'over' && !S.won && S.health <= 0);
    const res = { profile: o.profile, world: o.level ? g.world.id : o.world, level: o.level ? o.level.join('-') : '', seed: o.seed, lane, t: r1(t), dist: Math.floor(S.dist), dead,
      won: !!S.won, cause: dead ? b.lastHit : S.state === 'over' ? (S.won ? 'gana' : 'nivel-fallado') : 'tope',
      hits: st.hits, hitBy: st.hitBy, dmgEff: st.dmgEff, dmgNominal: st.dmgNominal, healEff: st.healEff, healPot: st.healPot,
      absorbed: st.absorbed, absorbedDmg: st.absorbedDmg, recoveries: st.recoveries, minHealth: st.minHealth,
      stumbles: S.stumbles ?? st.hits, stumblesPerMin: r1((S.stumbles ?? st.hits) / min), nearmiss: st.nearmiss, nearmissPerMin: r1(st.nearmiss / min), multBest: S.multBest ?? 1,
      coinsPerMin: r1(S.coins / min), score: S.score, bonus: Math.floor(S.bonus || 0), rescues: st.rescues, heat: r1(S.heat ?? 0), canecas: S.canecas ?? 0, bocados: S.bocados ?? 0,
      hitsPerMin: r1(st.hits / min), dmgPerMin: r1(st.dmgEff / min), healPerMin: r1(st.healEff / min),
      mice: S.mice, food: st.food, coins: S.coins, bites: st.bites, falls: st.falls, ladders: st.ladders, sewerT: r1(st.sewerFrames / 60), invT: r1(st.invFrames / 60),
      rowsPassed: st.rowsPassed, rowsInLane: st.rowsInLane, rowsInLaneStat: st.rowsInLaneStat, rowsFree: st.rowsFree, rowsFreeStat: st.rowsFreeStat, rowsAllBlocked: st.rowsAllBlocked,
      safeFrac: st.samples ? r1(100 * st.safeSamples / st.samples) : 0, safeHereFrac: st.samples ? r1(100 * st.safeHereSamples / st.samples) : 0,
      inputs: st.inputs, errors: st.errors, turns: st.turns, speedEnd: r1(S.speed) };
    cur = null;
    return res;
  } finally { Math.random = realRandom; cur = null; }
}

/* ---------- lotes ---------- */
const SAVE_KEY = 'pruebasBotsResultados'; // no empieza por catRun: no es del juego; cleanup() lo borra
const results = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); } catch { return []; } })();
const progress = { done: 0, total: 0, running: false, last: null, error: null };
async function batch(opts = {}) {
  const { profiles = ['quietoL', 'quietoC', 'quietoR', 'azar', 'humano', 'experto'], worlds = ['pueblo', 'playa', 'neon'], levels = null, seeds = 10, maxT = 300, cat = 'gris' } = opts;
  const seedList = Array.isArray(seeds) ? seeds : Array.from({ length: seeds }, (_, i) => i + 1);
  const where = levels ? levels.map(l => ({ level: l })) : worlds.map(w => ({ world: w })); // levels: [[mundo, nivel], ...]
  progress.total += profiles.length * where.length * seedList.length; progress.running = true; progress.error = null;
  try {
    const key = r => [r.profile, r.level || r.world, r.seed].join('|');
    const done = new Set(results.map(key));
    for (const w of where) for (const profile of profiles) for (const seed of seedList) {
      if (done.has(key({ profile, world: w.world, level: w.level && w.level.join('-'), seed }))) { progress.done++; continue; } // reanudar: ya está
      const r = await run({ profile, ...w, seed, maxT, cat });
      results.push(r); progress.done++; progress.last = r;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(results)); } catch {} // por si la pestaña se recarga a mitad del lote
      await yieldNow();
    }
  } catch (e) { progress.error = String(e); throw e; } finally { progress.running = false; }
  return results;
}

/* ---------- resumen ---------- */
function table(rs = results, by = r => r.profile + ' × ' + (r.level ? 'nivel ' + r.level : r.world)) {
  const groups = {};
  for (const r of rs) (groups[by(r)] ||= []).push(r);
  const out = {};
  for (const [k, list] of Object.entries(groups)) {
    const causes = {};
    for (const r of list) causes[r.cause] = (causes[r.cause] || 0) + 1;
    const pick = f => list.map(f);
    out[k] = { n: list.length, vivos: list.filter(r => !r.dead).length,
      t_med: r1(median(pick(r => r.t))), t_prom: r1(mean(pick(r => r.t))), t_min: Math.min(...pick(r => r.t)), t_max: Math.max(...pick(r => r.t)),
      dist_prom: Math.round(mean(pick(r => r.dist))),
      golpes_min: r1(mean(pick(r => r.hitsPerMin))), dano_min: r1(mean(pick(r => r.dmgPerMin))), cura_min: r1(mean(pick(r => r.healPerMin))),
      filas: Math.round(mean(pick(r => r.rowsPassed))),
      filas_en_mi_carril_pct: r1(100 * mean(pick(r => r.rowsPassed ? r.rowsInLane / r.rowsPassed : 0))),
      filas_estaticas_en_mi_carril_pct: r1(100 * mean(pick(r => r.rowsPassed ? r.rowsInLaneStat / r.rowsPassed : 0))),
      filas_con_carril_libre_pct: r1(100 * mean(pick(r => r.rowsPassed ? r.rowsFree / r.rowsPassed : 0))),
      filas_todo_bloqueado_pct: r1(100 * mean(pick(r => r.rowsPassed ? r.rowsAllBlocked / r.rowsPassed : 0))),
      tiempo_con_carril_seguro_pct: r1(mean(pick(r => r.safeFrac))),
      caidas_drenaje: r1(mean(pick(r => r.falls))), mordiscos: r1(mean(pick(r => r.bites))), giros: r1(mean(pick(r => r.turns))),
      tropiezos_min: r1(mean(pick(r => r.stumblesPerMin ?? r.hitsPerMin))), por_un_pelo_min: r1(mean(pick(r => r.nearmissPerMin || 0))), monedas_min: r1(mean(pick(r => r.coinsPerMin || 0))),
      mult_max_prom: r1(mean(pick(r => r.multBest || 1))), puntaje_prom: Math.round(mean(pick(r => r.score || 0))), capturas_duras: list.filter(r => /duro/.test(r.cause)).length,
      golpes_absorbidos_por_inv_min: r1(mean(pick(r => r.absorbed / (r.t / 60)))), dano_absorbido_min: r1(mean(pick(r => r.absorbedDmg / (r.t / 60)))),
      resurrecciones: r1(mean(pick(r => r.recoveries))), vida_min_prom: r1(mean(pick(r => r.minHealth))), ganados: list.filter(r => r.won).length,
      causas: causes };
  }
  return out;
}
// composición de las filas por mundo, sin correr bots: construye tramos con distintas semillas y los analiza
function rowStats(world, seeds = 30) {
  const acc = { filas: 0, libre: 0, libreEstat: 0, todoBloq: 0, porCarril: { '-1': 0, '0': 0, '1': 0 }, porCarrilEstat: { '-1': 0, '0': 0, '1': 0 }, tipos: {}, curaPorTramoCarril: { '-1': 0, '0': 0, '1': 0 }, tramos: 0, largo: 0 };
  Math.random = mulberry32(99);
  try {
    if (g.world.id !== world) g.setWorld(world);
    for (let s = 1; s <= seeds; s++) {
      Math.random = mulberry32(s * 31 + 5);
      g.reset();
      for (const seg of [g.cur, ...Object.values(g.cur.exits)]) {
        const rows = rowsOf.get(seg) || [];
        acc.tramos++; acc.largo += seg.L;
        for (const l of [-1, 0, 1]) acc.curaPorTramoCarril[l] += seg.healByLane[l];
        for (const r of rows) {
          acc.filas++;
          if (r.free.length) acc.libre++;
          if (r.freeStat.length) acc.libreEstat++;
          if (r.all.size === 3) acc.todoBloq++;
          for (const l of [-1, 0, 1]) { if (r.all.has(l)) acc.porCarril[l]++; if (r.stat.has(l)) acc.porCarrilEstat[l]++; }
          acc.tipos[r.types] = (acc.tipos[r.types] || 0) + 1;
        }
      }
    }
  } finally { Math.random = realRandom; }
  const pct = v => r1(100 * v / acc.filas);
  return { mundo: world, tramos: acc.tramos, filas: acc.filas, filas_por_100m: r1(100 * acc.filas / acc.largo),
    filas_con_carril_libre_pct: pct(acc.libre), filas_con_carril_libre_ignorando_moviles_pct: pct(acc.libreEstat), filas_todo_bloqueado_pct: pct(acc.todoBloq),
    bloqueo_por_carril_pct: Object.fromEntries([-1, 0, 1].map(l => [l, pct(acc.porCarril[l])])),
    bloqueo_estatico_por_carril_pct: Object.fromEntries([-1, 0, 1].map(l => [l, pct(acc.porCarrilEstat[l])])),
    cura_por_100m_y_carril: Object.fromEntries([-1, 0, 1].map(l => [l, r1(100 * acc.curaPorTramoCarril[l] / acc.largo)])),
    tipos: Object.fromEntries(Object.entries(acc.tipos).sort((a, b) => b[1] - a[1])) };
}

// Invariantes del generador (equipo/diseno-bucle.md §3.3 / §8.3) sobre tramos recién generados, sin correr bots.
// Una "fila" es un grupo de obstáculos con daño separados menos de 12 m; móviles y temporizados no cuentan como bloqueo.
function auditGen(world, seeds = 30) {
  const fails = { sinSalida: 0, noEncadena: 0, carrilLibre: 0, sinVertical6: 0, huecoCorto: 0, recogibleDentro: 0, primeraNoCompleta: 0, ultimaNoCompleta: 0 }, ex = [];
  let rows = 0, segs = 0;
  const MOV = new Set(['senora', 'burro', 'balon', 'pelota', 'dron', 'zigzag', 'barrera', 'laser', 'hidrante']);
  Math.random = mulberry32(7);
  try {
    if (g.world.id !== world) g.setWorld(world);
    for (let s = 1; s <= seeds; s++) {
      Math.random = mulberry32(s * 977 + 3);
      g.reset();
      for (const seg of [g.cur, ...Object.values(g.cur.exits)]) {
        segs++;
        const list = (rowsOf.get(seg) || []).map(r => {
          const fixed = new Set();
          for (const o of r.obs) { if (MOV.has(o.type)) continue; if (o.hw >= 4.5) { [-1, 0, 1].forEach(l => fixed.add(l)); continue; } for (const l of [-1, 0, 1]) if (Math.abs(o.x - l * 3) <= o.hw + .4) fixed.add(l); }
          const walls = new Set([...fixed].filter(l => r.obs.some(o => !MOV.has(o.type) && o.hw < 4.5 && Math.abs(o.x - l * 3) <= o.hw + .4 && o.y1 > 1.3 && o.y0 < .5)));
          const exits = [-1, 0, 1].filter(l => !walls.has(l));
          const front = Math.min(...r.obs.map(o => o.s - o.hl)), back = Math.max(...r.obs.map(o => o.s + o.hl));
          return { s: r.s, front, back, fixed, walls, exits, complete: fixed.size === 3, vertical: fixed.size === 3 && walls.size === 0 };
        }).sort((a, b) => a.s - b.s);
        if (!list.length) continue;
        rows += list.length;
        if (!list[0].complete) fails.primeraNoCompleta++;
        if (!list[list.length - 1].complete) fails.ultimaNoCompleta++;
        const free = [0, 0, 0]; let sinceV = 0;
        for (let i = 0; i < list.length; i++) {
          const r = list[i];
          if (!r.exits.length) { fails.sinSalida++; ex.push([world, s, 'sin salida', r.s]); }
          if (i > 0 && !list[i - 1].exits.some(a => r.exits.some(b => Math.abs(a - b) <= 1))) { fails.noEncadena++; ex.push([world, s, 'no encadena', r.s]); }
          for (let l = 0; l < 3; l++) { free[l] = r.fixed.has(l - 1) ? 0 : free[l] + 1; if (free[l] > 3) { fails.carrilLibre++; free[l] = 0; ex.push([world, s, 'carril libre > 3 filas', r.s]); } }
          sinceV = r.vertical ? 0 : sinceV + 1;
          if (sinceV > 7) { fails.sinVertical6++; sinceV = 0; ex.push([world, s, 'sin vertical en 8 filas', r.s]); }
          if (i > 0 && r.front - list[i - 1].back < 15 * .95 - 1) { fails.huecoCorto++; ex.push([world, s, 'hueco < 0,95 s', r.s]); }
        }
        for (const c of seg.obs) if (c.collect) for (const o of seg.obs) if (!o.collect && o.dmg > 0 && !o.ramp && !o.top && Math.abs(o.x - c.x) <= o.hw && Math.abs(o.s - c.s) < o.hl && c.yb < .5 && o.y0 < 1 && o.y1 > .3) { fails.recogibleDentro++; break; }
      }
    }
  } finally { Math.random = realRandom; }
  return { mundo: world, tramos: segs, filas: rows, fallos: fails, ejemplos: ex.slice(0, 12) };
}
// Criterio 11: tras usar cada habilidad y la secuencia "nivel con embestida activa → modo infinito", no queda ningún modificador ni escritura directa
async function auditCfg() {
  const out = { escriturasDirectas: 0, modsColgados: [], baseSpeedFinal: 0, ok: false };
  const warn = console.warn; let direct = 0;
  console.warn = (...a) => { if (/escritura directa/.test(String(a[0]))) direct++; warn.apply(console, a); };
  const lv = g.levels; const owned0 = lv ? [...lv.save.owned] : null;
  try {
    if (lv) { lv.save.owned = g.cats.map(c => c.id); lv.save.stars = [[3, 3, 3, 3, 3], [3, 3, 3, 3, 3], [3, 3, 3, 3, 3]]; }
    for (const c of g.cats) {
      g.setCat(c.id);
      g.levels ? g.levels.play('endless', 0) : g.start();
      g.sim(120); g.emit('ability'); g.sim(60); g.input.jump(); g.emit('ability'); g.sim(600);
      if (g.S.state === 'play') g.end({ won: false }); g.sim(5);
      await yieldNow();
    }
    g.setCat('bola'); if (lv) lv.play('level', 0, 0); else g.start();
    g.sim(60); g.emit('ability'); g.sim(10); g.end({ won: true }); g.sim(3);
    if (lv) lv.play('endless', 0); else g.start(); g.sim(5);
    out.baseSpeedFinal = g.cfg.baseSpeed;
    g.end({ won: false }); g.sim(3);
    out.modsColgados = g.rules.mods.filter(m => !/^legado:/.test(m));
    out.escriturasDirectas = direct;
    out.ok = direct === 0 && out.modsColgados.length === 0 && out.baseSpeedFinal === g.rules.BASE.baseSpeed;
  } finally { console.warn = warn; if (lv && owned0) lv.save.owned = owned0; g.setCat('gris'); }
  return out;
}

const bots = { run, batch, table, rowStats, auditGen, auditCfg, cleanup, results, progress, PROFILES, LEAD, rowsOf, analyze, snap };
window.bots = bots;
export default bots;
