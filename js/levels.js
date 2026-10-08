// Niveles, progreso, billetera, tienda y pantallas de Cat Run (agente Niveles y Economía).
// Lee mundos y gatos de game.worlds / game.cats; no define ninguno. Contrato en AGENTES.md.

const CSS = `
#menu{display:none!important}
#lv{position:absolute;inset:0;pointer-events:none;font-size:16px;line-height:1.3}
#lv [hidden]{display:none!important}
.lv-scr{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;padding:12px 16px 16px;
  overflow:hidden auto;pointer-events:auto;text-align:center;background:linear-gradient(#0e1120b0,#0e1120ea);
  animation:lvIn .36s cubic-bezier(.2,.9,.3,1.12) both}
.lv-scr.out{z-index:1;pointer-events:none;animation:lvOut .22s ease-in both}
.lv-in{width:100%;max-width:440px;margin:auto 0;display:flex;flex-direction:column;gap:10px;align-items:stretch}
@keyframes lvIn{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:none}}
@keyframes lvOut{from{opacity:1}to{opacity:0;transform:translateY(-18px) scale(.98);visibility:hidden}}
.lv-btn{pointer-events:auto;font:inherit;font-weight:800;font-size:18px;min-height:52px;padding:10px 16px;border-radius:16px;
  border:2px solid #fff4;background:#1c2740;color:#fff;cursor:pointer;touch-action:manipulation;position:relative;
  transition:transform .08s,filter .15s,background .2s;-webkit-tap-highlight-color:transparent}
.lv-btn:active{transform:translateY(3px) scale(.98)}
.lv-btn:focus-visible{outline:3px solid #fff;outline-offset:2px}
.lv-btn.pri{background:var(--good);color:#0e1120;border-color:transparent;font-size:21px;min-height:60px;
  box-shadow:0 5px 0 #2c9c66,0 10px 22px #0007;animation:lvBreath 1.7s ease-in-out infinite}
.lv-btn.gold{background:var(--accent);color:#2a1a00;border-color:transparent;box-shadow:0 4px 0 #b9792a}
.lv-btn.off{opacity:.55}
.lv-btn.sm{min-height:46px;font-size:16px;padding:8px 12px}
@keyframes lvBreath{50%{transform:scale(1.045);filter:brightness(1.12)}}
.lv-row{display:flex;gap:10px}.lv-row>*{flex:1;min-width:0}
.lv-head{display:flex;align-items:center;gap:10px}
.lv-head h2{flex:1;margin:0;font-size:24px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lv-head .lv-btn{min-height:46px;min-width:46px;padding:6px 12px}
.lv-wal{display:inline-flex;align-items:center;gap:6px;background:#1c2740;border:2px solid #ffd23f88;color:#ffd23f;font-weight:900;
  font-size:19px;border-radius:14px;padding:7px 12px;white-space:nowrap}
.lv-wal.bump{animation:lvPop .45s}
@keyframes lvPop{35%{transform:scale(1.22)}}
.lv-logo{margin:0;font-size:clamp(50px,17vw,84px);letter-spacing:-2px;line-height:.95;text-shadow:0 6px 0 #0008;animation:lvFloat 3s ease-in-out infinite}
.lv-logo span{color:var(--accent)}
@keyframes lvFloat{50%{transform:translateY(-7px) rotate(-1.5deg)}}
.lv-scr[data-scr=home]{background:linear-gradient(#0e112070,#0e112000 20%,#0e112000 52%,#0e1120e6 70%)}
.lv-stage{height:min(34vh,300px);flex:none}
.lv-hero{font-size:64px;line-height:1;animation:lvRun .5s ease-in-out infinite alternate;display:inline-block}
@keyframes lvRun{from{transform:translateY(0) rotate(-6deg)}to{transform:translateY(-9px) rotate(6deg)}}
.lv-sub{margin:0;font-size:17px;opacity:.92}
.lv-card{background:var(--panel);border:2px solid #fff3;border-radius:20px;padding:14px}
.lv-badge{position:absolute;top:-8px;right:-6px;min-width:24px;height:24px;border-radius:12px;background:var(--bad);color:#fff;
  font-size:14px;line-height:24px;padding:0 6px;animation:lvPulse 1s ease-in-out infinite}
@keyframes lvPulse{50%{transform:scale(1.25)}}
.lv-tabs{display:flex;gap:8px}
.lv-tab{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 4px;min-height:68px}
.lv-tab .e{font-size:22px;line-height:1.1}.lv-tab b{font-size:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lv-tab small{font-size:12px;opacity:.85}
.lv-tab.sel{border-color:var(--accent);background:#3a2f5c;transform:translateY(-3px)}
.lv-tab.lock{opacity:.7}
.lv-tab.fresh{animation:lvUnlock .9s cubic-bezier(.3,1.6,.5,1)}
.lv-path{position:relative;height:250px;margin:2px 8px;animation:lvIn .3s both}
.lv-path svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.lv-path polyline{fill:none;stroke:#fff6;stroke-width:5;stroke-dasharray:2 11;stroke-linecap:round;vector-effect:non-scaling-stroke;animation:lvDash 1.2s linear infinite}
@keyframes lvDash{to{stroke-dashoffset:-13}}
.lv-node{position:absolute;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;padding:0;min-height:0;font-size:24px;font-weight:900;
  background:#2a3558;border:3px solid #fff5;box-shadow:0 5px 0 #0007}
.lv-node small{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:5px;font-size:13px;letter-spacing:1px;color:#ffd23f;white-space:nowrap;text-shadow:0 1px 2px #000}
.lv-node small i{font-style:normal;color:#fff4}
.lv-node.done{background:var(--accent);color:#2a1a00;border-color:#fff}
.lv-node.cur{background:var(--good);color:#0e1120;border-color:#fff;animation:lvBeat 1.1s ease-in-out infinite}
.lv-node.cur::before{content:'';position:absolute;inset:-9px;border-radius:50%;border:3px solid var(--good);animation:lvRing 1.1s ease-out infinite}
.lv-node.lock{background:#1c2740;color:#fff7;border-color:#fff2;font-size:20px}
.lv-node.sel{outline:3px solid #fff;outline-offset:3px}
.lv-node.fresh{animation:lvUnlock .9s cubic-bezier(.3,1.6,.5,1),lvBeat 1.1s ease-in-out .9s infinite}
@keyframes lvBeat{50%{transform:scale(1.12)}}
@keyframes lvRing{from{transform:scale(.8);opacity:.9}to{transform:scale(1.35);opacity:0}}
@keyframes lvUnlock{0%{transform:scale(.2) rotate(-25deg);filter:brightness(3)}60%{transform:scale(1.3) rotate(6deg)}100%{transform:none}}
.lv-shake{animation:lvShake .35s}
@keyframes lvShake{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
.lv-meter{height:12px;border-radius:7px;background:#0008;overflow:hidden;border:1px solid #fff3}
.lv-meter i{display:block;height:100%;background:var(--accent);border-radius:7px;transition:width .5s}
.lv-meter.ok i{background:var(--good)}
.lv-sheet{position:absolute;inset:0;z-index:5;display:grid;place-items:center;padding:16px;background:#0e1120c4;pointer-events:auto;animation:lvFade .2s both;overflow:hidden auto}
.lv-sheet .lv-card{width:100%;max-width:400px;display:flex;flex-direction:column;gap:10px;text-align:center;animation:lvSheet .34s cubic-bezier(.2,1.2,.3,1) both}
@keyframes lvFade{from{opacity:0}}
@keyframes lvSheet{from{transform:translateY(60px) scale(.9);opacity:0}}
.lv-card h3{margin:0;font-size:25px;line-height:1.15}
.lv-card small{opacity:.85;font-size:14px}
.lv-cond{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;text-align:left;font-size:16px;font-weight:700}
.lv-cond li{display:flex;gap:8px;align-items:center;background:#0005;border-radius:12px;padding:7px 10px;animation:lvIn .3s both;animation-delay:var(--d,0s)}
.lv-cond li b{color:#ffd23f;font-size:20px}.lv-cond li.no b{color:#fff3}.lv-cond li.no{opacity:.7}
.lv-stars{display:flex;justify-content:center;gap:6px}
.lv-star{position:relative;font-size:66px;line-height:1;color:#ffffff2b}
.lv-star.got::after{content:'★';position:absolute;inset:0;color:#ffd23f;text-shadow:0 4px 0 #b9792a,0 0 22px #ffd23f99;
  animation:lvStar .65s cubic-bezier(.3,1.7,.5,1) var(--d,0s) both}
.lv-star:nth-child(2){transform:translateY(-12px) scale(1.15)}
@keyframes lvStar{0%{transform:scale(0) rotate(-160deg);opacity:0}60%{opacity:1}100%{transform:none;opacity:1}}
.lv-title{margin:0;font-size:clamp(28px,8vw,42px);line-height:1.05}.lv-title span{color:var(--accent)}
.lv-pay{display:flex;flex-direction:column;gap:4px;font-size:17px;font-weight:700}
.lv-pay div{display:flex;justify-content:space-between;gap:10px}
.lv-pay .tot{border-top:2px solid #fff3;padding-top:6px;font-size:22px;color:#ffd23f}
.lv-ban{background:linear-gradient(90deg,#ffb84f,#ffd23f);color:#2a1a00;font-weight:900;font-size:18px;border-radius:14px;padding:9px 12px;
  animation:lvUnlock .9s cubic-bezier(.3,1.6,.5,1) var(--d,1.2s) both}
.lv-conf{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:6}
.lv-conf i{position:absolute;top:-20px;width:9px;height:15px;border-radius:2px;animation:lvConf var(--t) linear var(--d) both}
@keyframes lvConf{to{transform:translate(var(--x),105vh) rotate(var(--r))}}
.lv-item{display:grid;grid-template-columns:54px 1fr;gap:4px 10px;align-items:center;text-align:left;animation:lvIn .32s both;animation-delay:var(--d,0s)}
.lv-item .e{font-size:42px;line-height:1;grid-row:span 2;text-align:center}
.lv-item b{font-size:19px}.lv-item p{margin:0;font-size:14px;opacity:.9;grid-column:2}
.lv-item .ab{color:var(--accent);opacity:1}
.lv-item .lv-btn{grid-column:1/-1;margin-top:4px}
.lv-item.sel{border-color:var(--good)}
.lv-item.own .e{animation:lvRun .6s ease-in-out infinite alternate}
.lv-keys{display:grid;grid-template-columns:auto 1fr;gap:7px 12px;text-align:left;font-size:16px;margin:0}
.lv-keys b{color:var(--accent);white-space:nowrap}
.lv-toast{position:absolute;left:50%;bottom:26px;z-index:9;transform:translateX(-50%);background:#0e1120f2;border:2px solid var(--accent);
  border-radius:14px;padding:10px 16px;font-weight:800;font-size:16px;max-width:88%;text-align:center;animation:lvToast 2.2s both;pointer-events:none}
@keyframes lvToast{0%{opacity:0;transform:translate(-50%,20px)}10%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;visibility:hidden}}
#lvGoal{margin:-6px auto 0;width:fit-content;max-width:94%;display:flex;flex-direction:column;gap:4px;align-items:center;padding:6px 14px 8px;
  border-radius:14px;background:#1c2740e0;border:2px solid #fff3;font-weight:800;font-size:17px;text-shadow:0 2px 3px #0008;
  animation:lvGoalIn .9s cubic-bezier(.2,1.3,.4,1) both}
#lvGoal[hidden]{display:none}
#lvGoal .r{display:flex;gap:12px;align-items:center;white-space:nowrap}
#lvGoal .bar{width:100%;min-width:150px;height:7px;border-radius:4px;background:#0008;overflow:hidden}
#lvGoal .bar i{display:block;height:100%;width:0;background:var(--accent);transition:width .25s}
#lvGoal .warn{color:var(--bad)}
#lvGoal.pop .r{animation:lvPop .35s}
#lvGoal.done{border-color:var(--good)}#lvGoal.done .bar i{background:var(--good)}
@keyframes lvGoalIn{0%{transform:translateY(90px) scale(1.7);opacity:0}45%{transform:translateY(90px) scale(1.5);opacity:1}100%{transform:none}}
#over.lv-on{pointer-events:auto}
#over.lv-on .box{max-height:100%;overflow:hidden auto;padding:16px 18px;width:100%;max-width:440px}
#over.lv-on h1{font-size:clamp(28px,8vw,50px)}
#over.lv-on .big{font-size:30px;margin:2px 0}
#over.lv-on #rank{margin:8px auto;font-size:16px}
#over.lv-on .go{display:none}
#over.lv-on .box p{margin:5px 0;font-size:17px}
.lv-over{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.lv-over p b{color:#ffd23f}
@media (max-height:600px){.lv-logo{font-size:44px}.lv-hero{font-size:44px}.lv-path{height:222px}.lv-star{font-size:52px}}
@media (prefers-reduced-motion:reduce){#lv *,#lvGoal,#lvGoal *{animation-duration:.01s!important;animation-iteration-count:1!important}}
`;

// Estrellas totales para abrir cada mundo (por índice)
const GATE = [0, 8, 20];
const D = (baseSpeed, accel, maxSpeed, g0, g1) => ({ baseSpeed, accel, maxSpeed, rowGap: [g0, g1] });
// goal: [tipo, cantidad] · maxHits: choques permitidos · limit: segundos · stars: dos retos extra [métrica, valor]
const LEVELS = [
  [
    { goal: ['dist', 300], cfg: D(13, .08, 20, 30, 38), stars: [['hits', 2], ['hits', 0]] },
    { goal: ['mice', 12], cfg: D(14, .1, 22, 28, 36), stars: [['time', 45], ['time', 30]] },
    { goal: ['coins', 40], cfg: D(15, .1, 22, 27, 34), stars: [['health', 60], ['health', 90]] },
    { goal: ['turns', 2], cfg: D(15, .12, 24, 26, 33), stars: [['mice', 8], ['mice', 16]] },
    { goal: ['dist', 600], maxHits: 3, cfg: D(16, .15, 26, 24, 32), stars: [['hits', 1], ['hits', 0]] }
  ],
  [
    { goal: ['dist', 700], cfg: D(17, .18, 28, 22, 29), stars: [['coins', 40], ['coins', 80]] },
    { goal: ['mice', 25], limit: 45, cfg: D(18, .18, 28, 22, 29), stars: [['health', 50], ['health', 85]] },
    { goal: ['coins', 90], cfg: D(18, .2, 30, 21, 28), stars: [['hits', 3], ['hits', 1]] },
    { goal: ['turns', 4], cfg: D(19, .2, 30, 20, 27), stars: [['coins', 30], ['coins', 60]] },
    { goal: ['dist', 1000], maxHits: 2, cfg: D(19, .22, 32, 20, 27), stars: [['hits', 1], ['hits', 0]] }
  ],
  [
    { goal: ['dist', 1200], cfg: D(20, .25, 34, 18, 25), stars: [['hits', 3], ['hits', 1]] },
    { goal: ['mice', 40], cfg: D(21, .25, 34, 18, 24), stars: [['time', 60], ['time', 45]] },
    { goal: ['coins', 120], limit: 90, cfg: D(21, .28, 36, 17, 23), stars: [['health', 50], ['health', 80]] },
    { goal: ['turns', 6], maxHits: 3, cfg: D(22, .28, 36, 17, 23), stars: [['mice', 15], ['mice', 30]] },
    { goal: ['dist', 1500], maxHits: 1, cfg: D(22, .3, 34, 17, 23), stars: [['coins', 50], ['hits', 0]] }
  ]
];
const PER = 5;
const firstBonus = (w, l) => 20 + 5 * (w * PER + l); // 20…90 monedas la primera vez
const STAR_COINS = 10; // por cada estrella nueva
const MISSIONS = {
  mice: { i: '🐭', t: n => `Atrapa ${n} ratones`, n: 30, r: 40 },
  coins: { i: '🐾', t: n => `Junta ${n} monedas`, n: 100, r: 40 },
  dist: { i: '🏁', t: n => `Corre ${n} m en total`, n: 2000, r: 40 },
  turns: { i: '↪️', t: n => `Entra a ${n} calles laterales`, n: 6, r: 50 },
  runs: { i: '🎮', t: n => `Juega ${n} partidas`, n: 5, r: 30 },
  wins: { i: '🏆', t: n => `Supera ${n} niveles`, n: 3, r: 50 },
  clean: { i: '✨', t: n => `Corre ${n} m sin chocar`, n: 400, r: 50, max: true },
  stars: { i: '⭐', t: n => `Gana ${n} estrellas nuevas`, n: 3, r: 60 }
};
const giftOf = streak => 20 + 10 * Math.min(4, Math.max(0, streak - 1)); // 20, 30, 40, 50, 60

export function install(game) {
  const { S, cfg, store } = game;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const beep = (...a) => { try { game.sfx(...a); } catch {} };
  game.flags.customMenu = true;

  /* ---------- Guardado ---------- */
  const KEY = 'catRunSave';
  const rawSet = store.set.bind(store);
  const save = Object.assign({ v: 1, wallet: 0, stars: [], owned: [], seenHelp: false, daily: null, gift: { day: '', streak: 0 }, runs: 0 },
    store.get(KEY, null) || {});
  save.wallet = Math.max(0, Math.floor(+save.wallet || 0));
  if (!Array.isArray(save.stars)) save.stars = [];
  if (!Array.isArray(save.owned)) save.owned = [];
  if (!save.gift || typeof save.gift !== 'object') save.gift = { day: '', streak: 0 };
  const persist = () => rawSet(KEY, save);

  // La tabla de puntajes es solo del modo infinito: el núcleo anota cada end(), así que la llevo yo y filtro lo que él guarda.
  let realTop = store.get('catRunTop', []), myEntry = null;
  if (!Array.isArray(realTop)) realTop = [];
  store.set = (k, v) => rawSet(k, k === 'catRunTop' ? realTop : v);

  let now = () => new Date();
  const dayStr = (d = now()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const yesterday = () => { const d = now(); d.setDate(d.getDate() - 1); return dayStr(d); };

  /* ---------- Progreso ---------- */
  const worldsN = () => Math.min(LEVELS.length, game.worlds.length);
  const st = (w, l) => (save.stars[w] && save.stars[w][l]) || 0;
  const worldStars = w => LEVELS[w].reduce((a, _, l) => a + st(w, l), 0);
  const starTotal = () => { let t = 0; for (let w = 0; w < worldsN(); w++) t += worldStars(w); return t; };
  const worldOpen = w => w >= 0 && w < worldsN() && starTotal() >= GATE[w];
  const levelOpen = (w, l) => worldOpen(w) && l >= 0 && l < PER && (l === 0 || st(w, l - 1) > 0);
  const firstTodo = w => { for (let l = 0; l < PER; l++) if (levelOpen(w, l) && !st(w, l)) return l; return -1; };
  const price = c => Math.max(0, Math.floor(+c?.price || 0));
  const owns = c => !!c && (c === game.cats[0] || !price(c) || save.owned.includes(c.id));

  function daily() {
    const day = dayStr();
    if (!save.daily || save.daily.day !== day || !Array.isArray(save.daily.m)) {
      let seed = [...day].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
      const ids = Object.keys(MISSIONS).filter(id => id !== 'stars' || starTotal() <= worldsN() * PER * 3 - 3), m = [];
      while (m.length < 3 && ids.length) { seed = (seed * 1664525 + 1013904223) >>> 0; m.push({ id: ids.splice(seed % ids.length, 1)[0], p: 0, c: false }); }
      save.daily = { day, m };
      persist();
    }
    return save.daily;
  }
  const claimable = () => daily().m.filter(m => MISSIONS[m.id] && !m.c && m.p >= MISSIONS[m.id].n).length + (save.gift.day !== dayStr() ? 1 : 0);
  const nextGift = () => giftOf(save.gift.day === yesterday() ? save.gift.streak + 1 : 1);

  /* ---------- Objetivos ---------- */
  let run = null, pending = false, cfgBackup = null;
  const GOALS = {
    dist: { i: '🏁', t: n => `Llega a ${n} m`, v: () => Math.floor(S.dist), u: ' m' },
    mice: { i: '🐭', t: n => `Atrapa ${n} ratones`, v: () => S.mice, u: '' },
    coins: { i: '🐾', t: n => `Junta ${n} monedas`, v: () => S.coins, u: '' },
    turns: { i: '↪️', t: n => `Entra a ${n} calles laterales`, v: () => run.turns, u: '' }
  };
  const times = k => k === 1 ? '1 vez' : `${k} veces`;
  const STARS = {
    hits: { t: v => v ? `Choca máximo ${times(v)}` : 'No choques ni una vez', ok: v => run.hits <= v },
    time: { t: v => `Termina en ${v} s o menos`, ok: v => S.time <= v },
    health: { t: v => `Termina con ${v}% de vida o más`, ok: v => S.health >= v },
    coins: { t: v => `Junta ${v} monedas`, ok: v => S.coins >= v },
    mice: { t: v => `Atrapa ${v} ratones`, ok: v => S.mice >= v }
  };
  const goalText = d => GOALS[d.goal[0]].t(d.goal[1]) + (d.limit ? ` en ${d.limit} s` : '') + (d.maxHits != null ? ` chocando máximo ${times(d.maxHits)}` : '');

  function applyCfg(o) {
    restoreCfg();
    cfgBackup = {};
    for (const k in o) { cfgBackup[k] = cfg[k]; cfg[k] = Array.isArray(o[k]) ? [...o[k]] : o[k]; }
  }
  function restoreCfg() { if (cfgBackup) { Object.assign(cfg, cfgBackup); cfgBackup = null; } }
  const newRun = (mode, w, l) => ({ mode, w, l, def: mode === 'level' ? LEVELS[w][l] : null, hits: 0, turns: 0, clean: null, done: false, fail: '', quit: '', banked: false });

  function play(mode, w = ui.w, l = 0) {
    w = clamp(w | 0, 0, worldsN() - 1); l |= 0;
    if (mode === 'level' ? !levelOpen(w, l) : !worldOpen(w)) return false;
    if (S.paused) game.setPaused(false);
    restoreCfg();
    run = newRun(mode, w, l);
    ui.w = w; ui.l = l; ui.fresh = null;
    if (!owns(game.catDef)) game.setCat(game.cats[0].id);
    const wd = game.worlds[w];
    if (wd && game.world !== wd) game.setWorld(wd.id);
    if (run.def) applyCfg(run.def.cfg);
    pending = true;
    try { game.start(); } finally { pending = false; }
    return true;
  }
  // corta la partida en curso (pausa → reintentar o salir); pasa por end() para que los demás módulos se enteren
  function abort(how) {
    if (S.state !== 'play' && S.state !== 'dying') return;
    if (run) run.quit = how;
    if (S.paused) game.setPaused(false);
    game.end({ won: false });
  }

  /* ---------- DOM ---------- */
  document.head.append(el('style', '', CSS));
  const root = el('div'); root.id = 'lv';
  const scr = {};
  for (const n of ['home', 'help', 'map', 'shop', 'missions', 'result']) { scr[n] = el('section', 'lv-scr'); scr[n].hidden = true; scr[n].dataset.scr = n; root.append(scr[n]); }
  const sheetEl = el('div', 'lv-sheet'); sheetEl.hidden = true;
  const pauseEl = el('div', 'lv-sheet'); pauseEl.hidden = true; pauseEl.dataset.scr = 'pause';
  root.append(sheetEl, pauseEl);
  game.ui.hud.append(root);
  const goalEl = el('div', '', '<div class="r"><span class="g"></span><span class="x"></span></div><div class="bar"><i></i></div>');
  goalEl.id = 'lvGoal'; goalEl.hidden = true;
  game.ui.top.after(goalEl);
  const overExtra = el('div', 'lv-over');
  game.ui.over.querySelector('.box')?.append(overExtra);

  const ui = { cur: '', from: 'home', w: 0, l: 0, sheet: false, guard: 0, fresh: null, res: null, confirm: '' };
  const wal = () => `<span class="lv-wal">🐾 <span class="lv-cnt">${save.wallet}</span></span>`;
  const head = (title, back = 'back') => `<div class="lv-head"><button class="lv-btn" data-act="${back}" data-back aria-label="Volver">←</button><h2>${title}</h2>${wal()}</div>`;
  const miniStars = n => '★'.repeat(n) + `<i>${'★'.repeat(3 - n)}</i>`;

  function show(name) {
    for (const k in scr) if (k !== name && !scr[k].hidden) {
      const o = scr[k];
      o.className = 'lv-scr out';
      setTimeout(() => { if (o.className === 'lv-scr out') o.hidden = true; }, 260);
    }
    closeSheet();
    ui.cur = name; ui.guard = 0;
    RENDER[name]();
    const s = scr[name];
    s.hidden = false; s.className = 'lv-scr'; void s.offsetWidth; s.className = 'lv-scr on';
    s.scrollTop = 0;
    document.activeElement?.blur?.();
    api.screen = name;
  }
  function hideAll() {
    for (const k in scr) { scr[k].hidden = true; scr[k].className = 'lv-scr'; }
    closeSheet();
    ui.cur = ''; api.screen = '';
  }
  function closeSheet() { ui.sheet = false; sheetEl.hidden = true; }
  function toast(msg) {
    root.querySelector('.lv-toast')?.remove();
    const t = el('div', 'lv-toast', msg);
    root.append(t);
    setTimeout(() => t.remove(), 2400);
  }
  function countUp(node, from, to, ms = 900) {
    if (!node) return;
    node.dataset.val = to;
    if (from === to) { node.textContent = to; return; }
    const t0 = performance.now();
    const tick = () => {
      if (!node.isConnected || +node.dataset.val !== to) return;
      const k = Math.min(1, (performance.now() - t0) / ms);
      node.textContent = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(tick);
    };
    node.textContent = from;
    requestAnimationFrame(tick);
    setTimeout(() => { if (node.isConnected && +node.dataset.val === to) node.textContent = to; }, ms + 350); // por si la pestaña no dibuja
  }
  // suma al saldo y anima el contador de la pantalla visible
  function pay(n, where = scr[ui.cur]) {
    const from = save.wallet;
    save.wallet = Math.max(0, from + n);
    persist();
    const w = where?.querySelector('.lv-wal');
    if (w) { w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); countUp(w.querySelector('.lv-cnt'), from, save.wallet, 700); }
  }
  function confetti(host = root, n = 36) {
    const c = el('div', 'lv-conf'), cols = ['#ffd23f', '#5be39a', '#ff4d5e', '#ffb84f', '#7fb4ff', '#fff'];
    for (let i = 0; i < n; i++) {
      const p = el('i');
      p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};--x:${(Math.random() * 160 - 80) | 0}px;--r:${(Math.random() * 900 - 450) | 0}deg;--t:${(1.6 + Math.random() * 1.6).toFixed(2)}s;--d:${(Math.random() * .7).toFixed(2)}s`;
      c.append(p);
    }
    host.append(c);
    setTimeout(() => c.remove(), 4500);
  }
  const shake = node => { if (!node) return; node.classList.remove('lv-shake'); void node.offsetWidth; node.classList.add('lv-shake'); };

  /* ---------- Pantallas ---------- */
  const RENDER = {
    home() {
      const c = game.catDef || game.cats[0], n = claimable(), max = worldsN() * PER * 3;
      scr.home.innerHTML = `<div class="lv-in">
        <h1 class="lv-logo logo3d" data-text="TINTO">TINTO</h1>
        <div><span class="logo-sub">CAT RUN</span></div>
        <div class="lv-stage"></div>
        <p class="lv-sub">Tinto no hizo nada. (Sí hizo.) Ahora Panela lo persigue por ${worldsN()} mundos.</p>
        <div>${wal()} &nbsp; <span class="lv-wal" style="border-color:#fff4;color:#fff">⭐ ${starTotal()}/${max}</span></div>
        <button class="lv-btn pri" data-act="begin" data-primary>▶ Jugar</button>
        <div class="lv-row">
          <button class="lv-btn" data-act="shop">😺 Gatos</button>
          <button class="lv-btn" data-act="missions">🎯 Misiones${n ? `<span class="lv-badge">${n}</span>` : ''}</button>
        </div>
        <button class="lv-btn sm" data-act="help">❓ Cómo se juega</button>
      </div>`;
    },
    help() {
      scr.help.innerHTML = `<div class="lv-in">${head('Cómo se juega', ui.from === 'begin' ? 'home' : 'back')}
        <div class="lv-card"><div class="lv-keys">
          <b>← →</b><span>Cambia de carril (o toca un lado de la pantalla)</span>
          <b>↑</b><span>Salta vallas, basura y alcantarillas (desliza arriba)</span>
          <b>↓</b><span>Agáchate bajo la cinta (desliza abajo)</span>
          <b>⬅ ➡</b><span>En un cruce, toca la flecha GIRAR para entrar a esa calle</span>
          <b>🐭</b><span>Los ratones dan vida y alejan a Panela</span>
          <b>🐾</b><span>Las monedas van a tu billetera: compra gatos</span>
          <b>⭐</b><span>Cada nivel da hasta 3 estrellas; con ellas abres mundos</span>
        </div></div>
        <button class="lv-btn pri" data-act="${ui.from === 'begin' ? 'helpok' : 'back'}" data-primary>${ui.from === 'begin' ? '¡A correr!' : 'Entendido'}</button>
      </div>`;
    },
    map() {
      const n = worldsN();
      ui.w = clamp(ui.w, 0, n - 1);
      const w = ui.w, wd = game.worlds[w] || {}, open = worldOpen(w), total = starTotal(), todo = firstTodo(w);
      ui.l = clamp(ui.l, 0, PER - 1);
      if (open && !levelOpen(w, ui.l)) ui.l = Math.max(0, todo);
      const tabs = game.worlds.slice(0, n).map((d, i) => `<button class="lv-btn lv-tab${i === w ? ' sel' : ''}${worldOpen(i) ? '' : ' lock'}${ui.fresh?.world === i ? ' fresh' : ''}" data-act="tab" data-w="${i}" aria-pressed="${i === w}">
        <span class="e">${esc(d.emoji || '🌍')}</span><b>${esc(d.name || 'Mundo ' + (i + 1))}</b><small>${worldOpen(i) ? `⭐ ${worldStars(i)}/${PER * 3}` : `🔒 ${GATE[i]} ⭐`}</small></button>`).join('');
      const X = [20, 60, 82, 46, 16], Y = [13, 30, 47, 64, 80];
      let body;
      if (open) {
        const nodes = LEVELS[w].map((d, l) => {
          const s = st(w, l), o = levelOpen(w, l), cls = !o ? 'lock' : s ? 'done' : 'cur';
          const fresh = ui.fresh && ui.fresh.w === w && ui.fresh.l === l ? ' fresh' : '';
          return `<button class="lv-btn lv-node ${cls}${l === ui.l ? ' sel' : ''}${fresh}" style="left:${X[l]}%;top:${Y[l]}%" data-act="node" data-l="${l}" aria-label="Nivel ${w + 1}-${l + 1}${o ? '' : ' bloqueado'}">${o ? l + 1 : '🔒'}${o ? `<small>${miniStars(s)}</small>` : ''}</button>`;
        }).join('');
        body = `<div class="lv-path"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${X.map((x, i) => x + ',' + Y[i]).join(' ')}"/></svg>${nodes}</div>
          <button class="lv-btn pri" data-act="sheet" data-primary>▶ Nivel ${w + 1}-${ui.l + 1}</button>
          <button class="lv-btn sm" data-act="endless">♾️ Modo infinito${realTop[0] ? ` · récord ${realTop[0].s}` : ''}</button>`;
      } else {
        body = `<div class="lv-card"><h3>🔒 ${esc(wd.name || 'Mundo')}</h3><p class="lv-sub">Junta <b>${GATE[w]} ⭐</b> para abrirlo. Tienes ${total}.</p>
          <div class="lv-meter" style="margin-top:10px"><i style="width:${clamp(total / GATE[w] * 100, 0, 100)}%"></i></div>
          <p class="lv-sub" style="margin-top:8px">Repite niveles para sacar más estrellas.</p></div>
          <button class="lv-btn pri" data-act="tab" data-w="${lastOpen()}" data-primary>Volver a ${esc(game.worlds[lastOpen()]?.name || 'jugar')}</button>`;
      }
      scr.map.innerHTML = `<div class="lv-in">${head('Mapa', 'home')}
        <div class="lv-tabs">${tabs}</div>
        <p class="lv-sub">${esc(wd.desc || '')}</p>${body}
        <div class="lv-row"><button class="lv-btn sm" data-act="shop">😺 Gatos</button><button class="lv-btn sm" data-act="missions">🎯 Misiones${claimable() ? `<span class="lv-badge">${claimable()}</span>` : ''}</button></div>
      </div>`;
      ui.fresh = null;
    },
    shop() {
      const items = game.cats.map((c, i) => {
        const own = owns(c), sel = c === game.catDef, p = price(c), ab = c.ability;
        const btn = sel ? `<button class="lv-btn sm off" data-act="noop">✔ En uso</button>`
          : own ? `<button class="lv-btn sm" data-act="use" data-id="${esc(c.id)}">Usar</button>`
          : ui.confirm === c.id ? `<button class="lv-btn sm gold" data-act="buy" data-id="${esc(c.id)}">¿Seguro? Pagar ${p} 🐾</button>`
          : `<button class="lv-btn sm${save.wallet >= p ? ' gold' : ' off'}" data-act="ask" data-id="${esc(c.id)}">${save.wallet >= p ? 'Comprar' : '🔒'} ${p} 🐾</button>`;
        return `<div class="lv-card lv-item${sel ? ' sel' : ''}${own ? ' own' : ''}" style="--d:${i * .06}s" data-cat-item="${esc(c.id)}">
          <span class="e">${esc(c.emoji || '🐱')}</span><b>${esc(c.name || c.id)}${own && !sel ? ' ✓' : ''}</b>
          <p>${esc(c.desc || '')}</p>
          ${ab ? `<p class="ab">⚡ ${esc(ab.name || 'Habilidad')}${ab.cooldown ? ` · cada ${+ab.cooldown} s` : ''}</p><p>${esc(ab.desc || '')}</p>` : ''}
          ${btn}</div>`;
      }).join('');
      scr.shop.innerHTML = `<div class="lv-in">${head('Gatos')}${items}</div>`;
    },
    missions() {
      const d = daily(), gift = save.gift.day !== dayStr(), h = 24 - now().getHours();
      const ms = d.m.filter(m => MISSIONS[m.id]).map((m, i) => {
        const M = MISSIONS[m.id], done = m.p >= M.n;
        return `<div class="lv-card lv-item" style="--d:${(i + 1) * .07}s"><span class="e">${M.i}</span><b>${M.t(M.n)}</b>
          <p>${Math.min(M.n, Math.floor(m.p))} / ${M.n} · premio ${M.r} 🐾</p>
          <div class="lv-meter${done ? ' ok' : ''}" style="grid-column:1/-1"><i style="width:${clamp(m.p / M.n * 100, 0, 100)}%"></i></div>
          ${m.c ? '<button class="lv-btn sm off" data-act="noop">✔ Cobrada</button>' : done ? `<button class="lv-btn sm gold" data-act="claim" data-i="${i}">Cobrar ${M.r} 🐾</button>` : ''}</div>`;
      }).join('');
      scr.missions.innerHTML = `<div class="lv-in">${head('Misiones de hoy')}
        <div class="lv-card lv-item"><span class="e">🎁</span><b>Regalo diario</b>
          <p>${gift ? `Racha de ${save.gift.day === yesterday() ? save.gift.streak + 1 : 1} día(s)` : `Ya lo cobraste. Vuelve mañana: racha ${save.gift.streak}.`}</p>
          ${gift ? `<button class="lv-btn sm gold" data-act="gift" data-primary>Abrir +${nextGift()} 🐾</button>` : ''}</div>
        ${ms}<p class="lv-sub">Se renuevan en ${h} h.</p></div>`;
    },
    result() {
      const r = ui.res, d = r.def, G = GOALS[d.goal[0]], wd = game.worlds[r.w] || {};
      const title = r.won ? '¡Nivel <span>superado</span>!' : r.fail === 'time' ? '¡Se acabó <span>el tiempo</span>!' : r.fail === 'hits' ? '¡Demasiados <span>choques</span>!' : '¡Panela te <span>alcanzó</span>!';
      const stars = [0, 1, 2].map(i => `<span class="lv-star${i < r.stars ? ' got' : ''}" style="--d:${(.35 + i * .4).toFixed(2)}s">★</span>`).join('');
      const conds = [`<li class="${r.won ? '' : 'no'}" style="--d:.2s"><b>★</b>${esc(goalText(d))}${r.won ? '' : ` · ${r.val} / ${d.goal[1]}${G.u}`}</li>`,
        ...d.stars.map(([m, v], i) => `<li class="${r.conds[i] ? '' : 'no'}" style="--d:${.3 + i * .1}s"><b>★</b>${esc(STARS[m].t(v))}</li>`)].join('');
      const bans = [];
      if (r.worldUnlocked != null) bans.push(`🎉 ¡Mundo ${esc(game.worlds[r.worldUnlocked]?.name || r.worldUnlocked + 1)} abierto!`);
      if (r.complete) bans.push('👑 ¡Completaste todos los niveles!');
      else if (r.won && r.first && r.unlocked) bans.push(`🔓 Nivel ${r.unlocked.w + 1}-${r.unlocked.l + 1} abierto`);
      if (r.won && !r.next && r.gateLeft > 0) bans.push(`Te faltan ${r.gateLeft} ⭐ para el siguiente mundo`);
      const main = r.won && r.next ? `<button class="lv-btn pri" data-act="next" data-primary>${r.next.w !== r.w ? 'Siguiente mundo' : 'Siguiente nivel'} ▶</button>`
        : r.won ? `<button class="lv-btn pri" data-act="map" data-primary>Ir al mapa</button>`
        : `<button class="lv-btn pri" data-act="retry" data-primary>↻ Reintentar</button>`;
      scr.result.innerHTML = `<div class="lv-in">
        <p class="lv-sub">${esc(wd.emoji || '')} ${esc(wd.name || '')} · Nivel ${r.w + 1}-${r.l + 1}</p>
        <h2 class="lv-title">${title}</h2>
        <div class="lv-stars" data-stars="${r.stars}">${stars}</div>
        <ul class="lv-cond">${conds}</ul>
        ${bans.map((b, i) => `<div class="lv-ban" style="--d:${1.5 + i * .25}s">${b}</div>`).join('')}
        <div class="lv-card lv-pay">
          <div><span>Monedas recogidas</span><span>+${r.coins} 🐾</span></div>
          ${r.firstBonus ? `<div><span>Primera vez</span><span>+${r.firstBonus} 🐾</span></div>` : ''}
          ${r.newStars ? `<div><span>${r.newStars} estrella${r.newStars > 1 ? 's' : ''} nueva${r.newStars > 1 ? 's' : ''}</span><span>+${r.newStars * STAR_COINS} 🐾</span></div>` : ''}
          <div class="tot"><span>Billetera</span><span class="lv-wal" style="border:0;padding:0;background:none;font-size:inherit">🐾 <span class="lv-cnt" data-val="${save.wallet}">${save.wallet}</span></span></div>
        </div>
        ${main}
        <div class="lv-row">${r.won ? '<button class="lv-btn" data-act="retry">↻ Reintentar</button>' : ''}<button class="lv-btn" data-act="map" data-back>🗺️ Mapa</button></div>
      </div>`;
      countUp(scr.result.querySelector('.lv-cnt'), r.walletBefore, save.wallet, 1100);
      for (let i = 0; i < r.stars; i++) setTimeout(() => beep(700 + i * 220, .16, 'triangle', .08, 300), 350 + i * 400);
      if (r.worldUnlocked != null || r.complete || r.stars === 3) confetti(scr.result, r.stars === 3 && r.worldUnlocked == null ? 28 : 54);
    }
  };
  const lastOpen = () => { let w = 0; for (let i = 0; i < worldsN(); i++) if (worldOpen(i)) w = i; return w; };

  function openSheet() {
    const w = ui.w, l = ui.l, d = LEVELS[w][l], wd = game.worlds[w] || {}, s = st(w, l), gi = w * PER + l, paws = Math.ceil((gi + 1) / 3);
    ui.sheet = true;
    sheetEl.innerHTML = `<div class="lv-card">
      <small>${esc(wd.emoji || '')} ${esc(wd.name || '')} · Nivel ${w + 1}-${l + 1} · Dificultad ${'●'.repeat(paws)}${'○'.repeat(5 - paws)}</small>
      <h3>${GOALS[d.goal[0]].i} ${esc(goalText(d))}</h3>
      <ul class="lv-cond"><li style="--d:.05s"><b>★</b>Cumple el objetivo</li>${d.stars.map(([m, v], i) => `<li style="--d:${.12 + i * .07}s"><b>★</b>${esc(STARS[m].t(v))}</li>`).join('')}</ul>
      <small>${s ? `Tu mejor marca: ${'★'.repeat(s)}${'☆'.repeat(3 - s)}` : `Premio la primera vez: +${firstBonus(w, l)} 🐾`} · +${STAR_COINS} 🐾 por estrella nueva</small>
      <button class="lv-btn pri" data-act="play" data-primary>¡Correr!</button>
      <button class="lv-btn sm" data-act="close" data-back>Volver</button></div>`;
    sheetEl.hidden = false;
    sheetEl.style.animation = 'none'; void sheetEl.offsetWidth; sheetEl.style.animation = '';
  }
  function renderPause() {
    const lvl = run?.mode === 'level';
    pauseEl.innerHTML = `<div class="lv-card"><h3>⏸ Pausa</h3>
      <small>${lvl ? `Nivel ${run.w + 1}-${run.l + 1}: ${esc(goalText(run.def))}` : 'Modo infinito'}</small>
      <button class="lv-btn pri" data-act="resume" data-primary>▶ Seguir</button>
      <div class="lv-row"><button class="lv-btn" data-act="pretry">↻ Reintentar</button><button class="lv-btn" data-act="quit">${lvl ? '🗺️ Mapa' : '🏁 Terminar'}</button></div></div>`;
  }
  function toMap() {
    restoreCfg();
    game.ui.over.classList.remove('lv-on');
    if (S.state !== 'menu') game.showMenu();
    const todo = firstTodo(ui.w);
    if (todo >= 0) ui.l = todo; // deja elegido el siguiente nivel pendiente
    show('map');
  }
  function preview(w) { const wd = game.worlds[w]; if (wd && worldOpen(w) && game.world !== wd && S.state === 'menu') game.setWorld(wd.id); }

  /* ---------- Acciones de los botones ---------- */
  const ACT = {
    noop() {},
    home() { show('home'); },
    begin() { if (!save.seenHelp) { ui.from = 'begin'; show('help'); } else show('map'); },
    helpok() { save.seenHelp = true; persist(); show('map'); },
    help() { ui.from = ui.cur; show('help'); },
    shop() { ui.from = ui.cur; ui.confirm = ''; show('shop'); },
    missions() { ui.from = ui.cur; show('missions'); },
    back() { show(ui.from === 'map' ? 'map' : 'home'); },
    map: toMap,
    tab(d) { ui.w = +d.w; ui.l = Math.max(0, firstTodo(ui.w)); preview(ui.w); RENDER.map(); },
    node(d, b) {
      const l = +d.l;
      if (!levelOpen(ui.w, l)) { shake(b); beep(140, .15, 'sawtooth', .06); return toast('Supera el nivel anterior para abrirlo'); }
      ui.l = l; RENDER.map(); openSheet();
    },
    sheet() { if (levelOpen(ui.w, ui.l)) openSheet(); },
    close: closeSheet,
    play() { play('level', ui.w, ui.l); },
    endless() { play('endless', ui.w); },
    next() { const n = ui.res?.next; if (n) play('level', n.w, n.l); },
    retry() { const r = ui.res || run; play('level', r.w, r.l); },
    again() { play('endless', run ? run.w : 0); },
    resume() { game.setPaused(false); },
    pretry() { abort('retry'); },
    quit() { abort(run?.mode === 'level' ? 'map' : ''); },
    use(d) { const c = game.cats.find(c => c.id === d.id); if (owns(c)) { game.setCat(c.id); beep(880, .1, 'triangle', .07, 300); RENDER.shop(); } },
    ask(d, b) {
      const c = game.cats.find(c => c.id === d.id);
      if (!c || owns(c)) return RENDER.shop();
      if (save.wallet < price(c)) { shake(b); beep(140, .15, 'sawtooth', .06); return toast(`Te faltan ${price(c) - save.wallet} 🐾`); }
      ui.confirm = c.id; RENDER.shop();
    },
    buy(d) { if (buy(d.id)) { RENDER.shop(); confetti(scr.shop, 40); toast('¡Gato nuevo! Ya lo llevas puesto.'); } else RENDER.shop(); },
    claim(d) {
      const m = daily().m[+d.i], M = m && MISSIONS[m.id];
      if (!M || m.c || m.p < M.n) return;
      m.c = true; RENDER.missions(); pay(M.r); beep(990, .12, 'triangle', .08, 400); confetti(scr.missions, 20);
    },
    gift() {
      const today = dayStr();
      if (save.gift.day === today) return;
      const streak = save.gift.day === yesterday() ? save.gift.streak + 1 : 1, n = giftOf(streak);
      save.gift = { day: today, streak };
      RENDER.missions(); pay(n); beep(990, .12, 'triangle', .08, 400); confetti(scr.missions, 28); toast(`🎁 +${n} 🐾 · racha de ${streak}`);
    }
  };
  function buy(id) {
    const c = game.cats.find(c => c.id === id);
    ui.confirm = '';
    if (!c || owns(c) || save.wallet < price(c)) return false;
    save.wallet -= price(c);
    save.owned.push(c.id);
    persist();
    game.setCat(c.id);
    beep(660, .1, 'triangle', .08); setTimeout(() => beep(990, .16, 'triangle', .08, 300), 110);
    return true;
  }
  function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (e.detail) b.blur(); // tras un clic de ratón o dedo, Enter vuelve al botón principal
    if (b.dataset.act !== 'noop' && !['node', 'ask'].includes(b.dataset.act)) beep(620, .05, 'triangle', .04);
    ACT[b.dataset.act]?.(b.dataset, b);
  }
  root.addEventListener('click', onClick);
  overExtra.addEventListener('click', onClick);

  // Teclado: Enter/Espacio = botón principal, Escape = volver, flechas en el mapa
  function activeRoot() {
    if (!pauseEl.hidden) return pauseEl;
    if (ui.cur) return ui.sheet ? sheetEl : scr[ui.cur];
    if (S.state === 'over' && !game.ui.over.hidden) return game.ui.over;
    return null;
  }
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (S.state === 'dying' || (S.state === 'play' && !S.paused)) return;
    const r = activeRoot(), k = e.key;
    if (!r) return;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (performance.now() < ui.guard) return;
      const focused = e.target.closest?.('button');
      (focused && r.contains(focused) ? focused : r.querySelector('[data-primary]'))?.click();
    } else if (k === 'Escape' || k === 'Backspace') {
      if (S.state !== 'play') r.querySelector('[data-back]')?.click();
    } else if (ui.cur === 'map' && !ui.sheet && /^Arrow/.test(k)) {
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        const w = clamp(ui.w + (k === 'ArrowLeft' ? -1 : 1), 0, worldsN() - 1);
        if (w !== ui.w) ACT.tab({ w });
      } else {
        const l = clamp(ui.l + (k === 'ArrowUp' ? -1 : 1), 0, PER - 1);
        if (levelOpen(ui.w, l) && l !== ui.l) { ui.l = l; RENDER.map(); }
      }
    }
  });

  /* ---------- Partida: objetivo, victoria y derrota ---------- */
  let goalKey = '';
  function drawGoal(force) {
    if (!run?.def) return;
    const d = run.def, G = GOALS[d.goal[0]], n = d.goal[1], v = Math.min(n, G.v());
    const left = d.limit ? Math.max(0, Math.ceil(d.limit - S.time)) : -1;
    const key = v + '|' + run.hits + '|' + left;
    if (key === goalKey && !force) return;
    const bump = !force && key.split('|')[0] !== goalKey.split('|')[0] && d.goal[0] !== 'dist';
    goalKey = key;
    goalEl.querySelector('.g').textContent = `${G.i} ${v} / ${n}${G.u}`;
    goalEl.querySelector('.x').innerHTML = (d.maxHits != null ? `<span class="${run.hits >= d.maxHits ? 'warn' : ''}">💥 ${run.hits}/${d.maxHits}</span> ` : '')
      + (left >= 0 ? `<span class="${left <= 10 ? 'warn' : ''}">⏱ ${left} s</span>` : '');
    goalEl.querySelector('i').style.width = (v / n * 100).toFixed(1) + '%';
    goalEl.classList.toggle('done', v >= n);
    if (bump) { goalEl.classList.remove('pop'); void goalEl.offsetWidth; goalEl.classList.add('pop'); }
  }
  game.on('start', () => {
    if (!pending) { restoreCfg(); run = newRun('endless', clamp(game.worlds.indexOf(game.world), 0, worldsN() - 1), 0); } // alguien llamó game.start() directo
    hideAll();
    pauseEl.hidden = true;
    game.ui.over.classList.remove('lv-on');
    goalEl.hidden = !run.def;
    if (run.def) { goalKey = ''; goalEl.className = ''; void goalEl.offsetWidth; drawGoal(true); }
  });
  game.on('hit', () => { if (!run) return; run.hits++; if (run.clean == null) run.clean = S.dist; });
  game.on('turn', e => { if (run && e && e.dir) run.turns++; });
  game.on('update', () => {
    if (!run?.def || run.done || S.state !== 'play') return;
    const d = run.def;
    drawGoal();
    if (GOALS[d.goal[0]].v() >= d.goal[1]) { run.done = true; game.end({ won: true }); }
    else if (d.maxHits != null && run.hits > d.maxHits) { run.done = true; run.fail = 'hits'; game.end({ won: false }); }
    else if (d.limit && S.time > d.limit) { run.done = true; run.fail = 'time'; game.end({ won: false }); }
  });
  game.on('pause', v => {
    const on = !!v && S.state === 'play';
    if (on) renderPause();
    pauseEl.hidden = !on;
  });

  function renderRank() {
    const rank = document.getElementById('rank');
    rank?.replaceChildren(...realTop.map(e => {
      const li = document.createElement('li');
      li.textContent = `${e.n || 'Gato anónimo'} — ${e.s}`;
      if (e === myEntry) li.className = 'me';
      return li;
    }));
  }
  document.getElementById('name')?.addEventListener('input', e => { // corre después del oyente del núcleo
    if (myEntry) myEntry.n = e.target.value.trim();
    rawSet('catRunTop', realTop);
    renderRank();
  });

  game.on('over', e => {
    if (!run) run = newRun('endless', 0, 0);
    const r = run;
    if (r.banked) return;
    r.banked = true;
    goalEl.hidden = true; pauseEl.hidden = true;
    const lvl = r.mode === 'level', won = lvl && !!e.won, coins = Math.max(0, Math.floor(S.coins));
    const res = { mode: r.mode, w: r.w, l: r.l, def: r.def, won, fail: r.fail, coins, stars: 0, newStars: 0, first: false, firstBonus: 0, conds: [false, false],
      val: lvl ? Math.min(r.def.goal[1], GOALS[r.def.goal[0]].v()) : 0, walletBefore: save.wallet, next: null, unlocked: null, worldUnlocked: null, complete: false, gateLeft: 0 };
    const openBefore = []; for (let w = 0; w < worldsN(); w++) openBefore.push(worldOpen(w));
    const allBefore = starTotal() > 0 && isComplete();
    if (won) {
      res.conds = r.def.stars.map(([m, v]) => !!STARS[m].ok(v));
      res.stars = 1 + res.conds.filter(Boolean).length;
      const prev = st(r.w, r.l);
      res.first = !prev;
      res.newStars = Math.max(0, res.stars - prev);
      res.firstBonus = res.first ? firstBonus(r.w, r.l) : 0;
      (save.stars[r.w] ||= [])[r.l] = Math.max(prev, res.stars);
      for (let l = 0; l < PER; l++) save.stars[r.w][l] ||= 0;
      if (r.l + 1 < PER) res.next = res.unlocked = { w: r.w, l: r.l + 1 };
      else if (worldOpen(r.w + 1)) res.next = res.unlocked = { w: r.w + 1, l: 0 };
      else if (r.w + 1 < worldsN()) res.gateLeft = GATE[r.w + 1] - starTotal();
      for (let w = 0; w < worldsN(); w++) if (!openBefore[w] && worldOpen(w)) res.worldUnlocked = w;
      res.complete = !allBefore && isComplete();
      if (res.first && res.unlocked) ui.fresh = { ...res.unlocked };
      if (res.worldUnlocked != null) ui.fresh = { w: res.worldUnlocked, l: 0, world: res.worldUnlocked };
    }
    // billetera y misiones
    save.wallet += coins + res.firstBonus + res.newStars * STAR_COINS;
    save.runs++;
    const add = { mice: S.mice, coins, dist: Math.floor(S.dist), turns: r.turns, runs: 1, wins: won ? 1 : 0, stars: res.newStars, clean: Math.floor(r.clean ?? S.dist) };
    for (const m of daily().m) { const M = MISSIONS[m.id]; if (M && !m.c) m.p = M.max ? Math.max(m.p, add[m.id] || 0) : m.p + (add[m.id] || 0); }
    persist();
    restoreCfg();
    api.last = res;

    if (lvl) {
      game.ui.over.hidden = true; // el resultado de un nivel lo muestro yo
      if (r.quit === 'retry') return void play('level', r.w, r.l);
      if (r.quit === 'map') return toMap();
      ui.res = res;
      show('result');
      ui.guard = performance.now() + 600; // que el salto de último momento no pulse el botón
    } else {
      if (r.quit === 'retry') { game.ui.over.hidden = true; return void play('endless', r.w); }
      myEntry = { n: (document.getElementById('name')?.value || '').trim(), s: e.score };
      realTop = [...realTop, myEntry].sort((a, b) => b.s - a.s).slice(0, 5);
      rawSet('catRunTop', realTop);
      renderRank();
      const best = document.getElementById('best');
      if (best) best.textContent = `${e.score} puntos${realTop[0] === myEntry ? ' · ¡nuevo récord!' : ''}`;
      overExtra.innerHTML = `<p>+<b>${coins}</b> 🐾 a tu billetera · tienes <b class="lv-cnt">${save.wallet}</b> 🐾</p>
        <button class="lv-btn pri" data-act="again" data-primary>↻ Otra vez</button>
        <button class="lv-btn sm" data-act="map" data-back>🗺️ Mapa</button>`;
      countUp(overExtra.querySelector('.lv-cnt'), res.walletBefore, save.wallet, 900);
      game.ui.over.classList.add('lv-on');
      ui.guard = performance.now() + 700;
    }
  });
  function isComplete() { for (let w = 0; w < worldsN(); w++) for (let l = 0; l < PER; l++) if (!st(w, l)) return false; return worldsN() > 0; }

  /* ---------- Arranque ---------- */
  const api = game.levels = {
    LEVELS, GATE, MISSIONS, save, screen: '', last: null,
    get run() { return run; }, get wallet() { return save.wallet; }, get top() { return realTop; },
    owns: id => owns(game.cats.find(c => c.id === id)), buy, play, show, toMap, starTotal, worldOpen, levelOpen, stars: st, goalText, daily, persist,
    setNow(fn) { now = fn || (() => new Date()); }
  };
  game.on('ready', () => {
    if (!owns(game.catDef)) game.setCat((game.cats.find(owns) || game.cats[0]).id);
    ui.w = lastOpen();
    const t = firstTodo(ui.w);
    ui.l = t < 0 ? 0 : t;
    daily();
    show('home');
  });
}
