// Integrador de modelos: cambia el gato armado por código por un modelo hecho en Blender (.glb).
// El modelo debe traer estos nodos, con el pivote en la articulación y sin rotación en reposo
// (así lo genera modelos/tinto.py; el contrato está en modelos/LEEME.md):
//   body > torso, head (> ear_L, ear_R), panuelo (> knot), tail (> tail_tip), leg_FL, leg_FR, leg_BR, leg_BL
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODELS = { gris: 'modelos/tinto_v4.glb' }; // id del gato → archivo
const PANELA = 'modelos/panela.glb';
const SCALE = 1.25; // misma escala raíz que los gatos hechos por código

export function install(game) {
  const { THREE } = game, loader = new GLTFLoader();
  game.models = { loaded: {}, failed: {} };

  function wrap(def, scene) {
    def.build = () => {
      const root = new THREE.Group(), model = scene.clone(true), n = name => model.getObjectByName(name);
      root.add(model);
      root.scale.setScalar(SCALE);
      const head = n('head');
      // lo que el núcleo y las animaciones de cats.js esperan encontrar en userData
      root.userData = {
        gid: def.id, glb: true, body: n('body'), torso: n('torso'), head, ears: [n('ear_L'), n('ear_R')],
        tail: n('tail'), tip: n('tail_tip'), tailRot: 0, legs: ['FL', 'FR', 'BR', 'BL'].map(k => n('leg_' + k)),
        x: { bell: n('knot') }, d: { hy: head.position.y, hz: head.position.z, by: .7, top: 1, bw: .64, bh: .6, bl: 1.25 },
        own: [], mat: { dispose() {} } // la geometría es compartida entre copias: no se libera al cambiar de gato
      };
      return root;
    };
  }
  for (const [id, url] of Object.entries(MODELS)) {
    const def = game.cats.find(c => c.id === id);
    if (!def) continue;
    loader.load(url, gltf => {
      const missing = ['body', 'torso', 'head', 'ear_L', 'ear_R', 'tail', 'tail_tip', 'knot', 'leg_FL', 'leg_FR', 'leg_BR', 'leg_BL']
        .filter(k => !gltf.scene.getObjectByName(k));
      if (missing.length) { game.models.failed[id] = missing; return console.error(`[modelos] a ${url} le faltan nodos: ${missing}`); }
      wrap(def, gltf.scene);
      game.models.loaded[id] = url;
      if (game.catDef.id === id) game.setCat(id); // si ya se está usando, se cambia en caliente
    }, undefined, e => { game.models.failed[id] = String(e); }); // si no carga, queda el gato hecho por código
  }

  // Panela: el perro ya existe y fx.js anima sus piezas, así que el modelo de Blender no lo reemplaza:
  // se esconde el perro hecho por código y cada pieza nueva se cuelga del pivote que ya se está animando.
  game.on('ready', () => loader.load(PANELA, gltf => {
    const dog = game.dog, u = dog.userData, r = u.rig, n = k => gltf.scene.getObjectByName(k);
    const need = ['torso', 'head', 'ear_L', 'ear_R', 'jaw', 'tongue', 'collar', 'tail', 'tail_tip', 'leg_FL', 'leg_FR', 'leg_BR', 'leg_BL'];
    const missing = need.filter(k => !n(k));
    if (!r || missing.length) { game.models.failed.panela = r ? missing : 'falta el aparejo de fx.js'; return; }
    dog.traverse(o => { if (o.isMesh) o.visible = false; });
    gltf.scene.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const put = (g, node) => { g.add(node); node.position.set(0, 0, 0); };
    put(r.tongue, n('tongue')); put(r.jaw, n('jaw')); // primero los hijos
    for (const e of [n('ear_L'), n('ear_R')]) {
      const g = r.ears.find(x => x.userData.side === Math.sign(e.position.x));
      g.position.copy(e.position); put(g, e); // el pivote de la oreja pasa a ser el del modelo nuevo
    }
    put(r.head, n('head')); put(r.tailTip, n('tail_tip')); put(u.tail, n('tail'));
    ['FL', 'FR', 'BR', 'BL'].forEach((k, i) => put(u.legs[i], n('leg_' + k)));
    u.body.add(n('torso')); u.body.add(n('collar'));
    game.models.loaded.panela = PANELA;
  }, undefined, e => { game.models.failed.panela = String(e); })); // si no carga, queda el perro hecho por código
}
