// Estadísticas en el dispositivo: registra cada partida en localStorage (clave tintoStats) sin enviar nada a ningún lado.
// Pantalla oculta: abrir el juego con ?stats=1 muestra la tabla y un botón para copiar el JSON y pegarlo por chat.
export function install(game) {
  const { S, store } = game, KEY = 'tintoStats', MAX = 300, SESSION_GAP = 5 * 60 * 1000;
  const data = Object.assign({ v: 1, runs: [], sessions: [], days: [] }, store.get(KEY, null) || {});
  const save = () => store.set(KEY, data);
  let runStart = 0, panelAt = 0, lastActive = 0, sessionCoins0 = 0;
  const day = () => new Date().toISOString().slice(0, 10);
  function touchSession(now) {
    let s = data.sessions[data.sessions.length - 1];
    if (!s || now - s.end > SESSION_GAP) { s = { start: now, end: now, runs: 0, coins: 0 }; data.sessions.push(s); if (data.sessions.length > 200) data.sessions.shift(); }
    s.end = now;
    if (!data.days.includes(day())) data.days.push(day());
    return s;
  }
  game.on('start', () => {
    const now = Date.now();
    runStart = now;
    const s = touchSession(now);
    s.runs++;
    sessionCoins0 = game.levels?.wallet ?? 0;
  });
  game.on('over', e => {
    const now = Date.now(), run = game.levels?.run;
    const rec = { t0: runStart, mode: run?.mode || 'endless', world: game.world?.id, cat: game.catDef?.id, dur: Math.round(S.time * 10) / 10, dist: Math.floor(S.dist), score: e.score,
      cause: e.won ? 'gana' : (e.cause || 'desconocida'), hard: !!e.hard, mult: S.multBest, nearmiss: S.nearmiss, stumbles: S.stumbles, coins: S.coins, mice: S.mice, rescued: S.rescued,
      sewer: !!game.sub, retryMs: panelAt ? runStart - panelAt : null };
    data.runs.push(rec);
    if (data.runs.length > MAX) data.runs.shift();
    panelAt = now;
    const s = touchSession(now);
    s.coins += S.coins;
    save();
  });

  if (new URLSearchParams(location.search).get('stats') !== '1') return;
  const q = (arr, k) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(k * a.length))]; };
  const r1 = v => Math.round(v * 10) / 10;
  function summary() {
    const runs = data.runs, durs = runs.map(r => r.dur), dists = runs.map(r => r.dist), retries = runs.map(r => r.retryMs).filter(v => v != null);
    const causes = {}; for (const r of runs) causes[r.cause] = (causes[r.cause] || 0) + 1;
    const perSession = data.sessions.map(s => s.runs), sesDur = data.sessions.map(s => (s.end - s.start) / 60000);
    const fast = retries.filter(v => v < 10000).length;
    return {
      partidas: runs.length, sesiones: data.sessions.length, dias: data.days.length,
      duracion_mediana_s: r1(q(durs, .5)), duracion_p10_s: r1(q(durs, .1)), duracion_p90_s: r1(q(durs, .9)), primera_partida_s: runs[0]?.dur ?? null,
      distancia_mediana_m: q(dists, .5), puntaje_max: Math.max(0, ...runs.map(r => r.score || 0)),
      reintento_mediana_s: retries.length ? r1(q(retries, .5) / 1000) : null, derrotas_seguidas_de_otra_en_10s_pct: retries.length ? Math.round(100 * fast / retries.length) : null,
      partidas_por_sesion_mediana: q(perSession, .5), sesion_mediana_min: r1(q(sesDur, .5)),
      mult_max_mediana: q(runs.map(r => r.mult || 1), .5), por_un_pelo_por_min: runs.length ? r1(runs.reduce((a, r) => a + r.nearmiss, 0) / Math.max(1, runs.reduce((a, r) => a + r.dur, 0) / 60)) : 0,
      rescates: runs.filter(r => r.rescued).length, causas: causes
    };
  }
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:12px;z-index:50;overflow:auto;background:#0e1120f2;color:#fff;border-radius:16px;padding:16px;font:15px/1.4 system-ui,sans-serif;pointer-events:auto';
  box.dataset.ui = '';
  function render() {
    const s = summary();
    box.innerHTML = `<h2 style="margin:0 0 8px">Estadísticas de este dispositivo</h2>
      <p style="opacity:.8;margin:0 0 10px">Nada sale del teléfono. Copia el texto y pégalo en el chat para que lo analicen.</p>
      <div style="display:flex;gap:8px;margin-bottom:12px"><button id="stCopy" style="font:inherit;padding:8px 14px;border-radius:10px;border:0;background:#5be39a;color:#0e1120;font-weight:700">Copiar</button>
      <button id="stClose" style="font:inherit;padding:8px 14px;border-radius:10px;border:2px solid #fff4;background:#1c2740;color:#fff">Cerrar</button></div>
      <table style="border-collapse:collapse;width:100%">${Object.entries(s).map(([k, v]) => `<tr><td style="padding:3px 8px;border-bottom:1px solid #fff2">${k.replace(/_/g, ' ')}</td><td style="padding:3px 8px;border-bottom:1px solid #fff2;text-align:right">${typeof v === 'object' ? JSON.stringify(v) : v ?? '—'}</td></tr>`).join('')}</table>
      <textarea id="stJson" style="width:100%;height:120px;margin-top:12px;font:12px monospace;background:#000;color:#9f9" readonly>${JSON.stringify({ resumen: s, ...data })}</textarea>`;
    box.querySelector('#stClose').onclick = () => box.remove();
    box.querySelector('#stCopy').onclick = async () => {
      const txt = box.querySelector('#stJson').value;
      try { await navigator.clipboard.writeText(txt); box.querySelector('#stCopy').textContent = '¡Copiado!'; }
      catch { box.querySelector('#stJson').select(); document.execCommand?.('copy'); box.querySelector('#stCopy').textContent = 'Selecciona y copia'; }
    };
  }
  render();
  document.body.appendChild(box);
  game.stats = { data, summary, render: () => { render(); if (!box.isConnected) document.body.appendChild(box); } };
}
