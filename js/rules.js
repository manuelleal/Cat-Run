// Reglas de Tinto: la única tabla de números que deciden si el jugador vive o muere.
// Capas, de abajo hacia arriba: base → mundo → nivel → modificadores con nombre (gatos, habilidades, estados).
// Nadie escribe `cfg` directamente: se lee `cfg.clave` (vista derivada) y se cambia con rules.layer() o rules.mod().

export const BASE = {
  // movimiento (accel .13 y tope 34, antes .10 y 32: a un jugador que lo probó no se le notaba que fuera más rápido al avanzar)
  baseSpeed: 15, accel: .13, maxSpeed: 34, jumpV: 11.5, gravity: 34, airJumps: 0, slideTime: .85, laneSnap: 14, inputBuffer: .15,
  // modelo de fallo: un tropiezo abre una ventana de peligro; otro tropiezo dentro de ella es captura; choque duro de frente es captura
  // dangerTime 7 (el diseño decía 6): con filas de hasta 1,9 s, tres filas más el frenazo pueden pasar de 6 s y el quieto "espera a que pase"
  invuln: 1.0, hitSlow: .45, dangerTime: 7, dangerGap: 3.6, dangerFade: 2.5, hardCrash: true, gapMax: 6.5, // Panela más cerca en calma (Tinto se veía muy chico al fondo) y no tan encima en peligro (lo tapaba)
  // Bocado: ratones y comida llenan una presa que salva de UNA captura por doble tropiezo
  bocadoMax: 20, bocadoMouse: 1, bocadoFood: 5,
  // dificultad: reloj propio (heat) y escalón tope
  heatStart: 0, tierMax: 4,
  // puntaje
  scoreCoin: 5, scoreMouse: 25,
  // drenaje: reloj del cocodrilo
  catchIn: 22, biteAt: 1.7, stumbleChase: 5, ladderEvery: 110, sewerEvery: [600, 900], sewerMinHeat: 20, sewerCooldown: 150,
  // canecas (puntos de regeneración)
  canecaFirst: 300, canecaEvery: [700, 900], canecaAfterRescue: 400, canecaMinHeat: 15, rescueHeat: 25, rescueInv: 2, rescueClear: 2.5,
  // balcones
  balconyFirst: 150, balconyEvery: [200, 320], balconyLens: [24, 32, 40],
  // generador: tiempo entre filas por escalón, tope de filas seguidas con el carril libre, filas por oleada
  tierHeat: [0, 20, 50, 90, 140],
  // escalones 0–2 algo más holgados que el diseño (1,7–2,0 / 1,4–1,7 / 1,2–1,5): medido, el humano medio moría a los 23–36 s;
  // con la ventana de 7 s el quieto sigue cayendo antes de 10 s (3 filas × 2,0 s + 0,46 s de frenazo < 7 s)
  tierRowTime: [[1.7, 2.0], [1.5, 1.8], [1.25, 1.5], [1.0, 1.3], [.95, 1.15]],
  tierFreeMax: [2, 2, 1, 1, 1],
  tierWave: [[5, 5], [6, 7], [7, 8], [8, 9], [10, 12]],
  // topes por calle (un tramo entre dos cruces) y por fila: medido sin tope, una calle traía 9–10 obstáculos de mediana y hasta 17
  rowMaxObs: 3, streetMaxRows: 6, streetMaxObs: 14, streetMaxPickups: 55,
  // hidrante: segundos con el chorro abierto, cerrado, y de aviso (goteo) antes de abrir
  hydrantOn: 1.6, hydrantOff: 1.6, hydrantWarn: .5,
  // racha / multiplicador
  multSteps: [15, 40, 80, 140], multDrop: 2
};

const layers = { world: null, level: null };
const mods = new Map(); // id → { clave: { set, add, mul } }
let version = 0;
const cache = new Map();

function compute(key) {
  let v = BASE[key];
  for (const name of ['world', 'level']) { const l = layers[name]; if (l && key in l) v = l[key]; }
  for (const m of mods.values()) {
    const d = m[key];
    if (!d) continue;
    if ('set' in d) v = d.set;
    if ('add' in d) v = v + d.add;
    if ('mul' in d) v = v * d.mul;
  }
  return v;
}
export const rules = {
  BASE,
  get(key) {
    if (!cache.has(key)) cache.set(key, compute(key));
    return cache.get(key);
  },
  // capa de mundo o de nivel: un objeto con claves de BASE, o null para quitarla
  layer(name, obj) {
    if (!(name in layers)) throw new Error('capa desconocida: ' + name);
    if (obj) for (const k in obj) if (!(k in BASE)) console.warn(`[reglas] la capa ${name} trae una clave que no existe: ${k}`);
    layers[name] = obj ? { ...obj } : null;
    cache.clear(); version++;
  },
  // modificador con dueño: rules.mod('embestida', { baseSpeed: { add: 7 } }); se quita con rules.unmod('embestida')
  mod(id, obj) {
    for (const k in obj) if (!(k in BASE)) console.warn(`[reglas] el modificador ${id} trae una clave que no existe: ${k}`);
    mods.set(id, obj);
    cache.clear(); version++;
  },
  unmod(id) { if (mods.delete(id)) { cache.clear(); version++; } },
  has(id) { return mods.has(id); },
  clearMods() { mods.clear(); cache.clear(); version++; },
  get version() { return version; },
  get layers() { return { world: layers.world, level: layers.level }; },
  get mods() { return [...mods.keys()]; },
  // vista de solo lectura con la forma del antiguo `cfg`; escribir avisa y pasa por un modificador "legado"
  cfg: null
};
rules.cfg = new Proxy({}, {
  get: (_, key) => typeof key === 'string' && key in BASE ? rules.get(key) : undefined,
  has: (_, key) => key in BASE,
  ownKeys: () => Object.keys(BASE),
  getOwnPropertyDescriptor: (_, key) => key in BASE ? { enumerable: true, configurable: true, value: rules.get(key) } : undefined,
  set: (_, key, value) => {
    console.warn(`[reglas] escritura directa a cfg.${String(key)} = ${JSON.stringify(value)}: usa rules.mod() o rules.layer()`);
    rules.mod('legado:' + String(key), { [key]: { set: value } });
    return true;
  },
  deleteProperty: (_, key) => { rules.unmod('legado:' + String(key)); return true; }
});
export default rules;
