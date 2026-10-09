# Tinto — contrato para los módulos

Juego: runner 3D en el navegador (Three.js r160, sin build). Tinto corre por calles de tres carriles; Panela lo persigue y la cámara va detrás de ella. Hay cruces con calles laterales opcionales, obstáculos, monedas, ratones, canecas, balcones y un drenaje con cocodrilo. **El modo infinito es el centro del juego**; los 15 niveles son el camino de aprendizaje.

## Archivos

| Archivo | Dueño | Qué es |
|---|---|---|
| `index.html` | núcleo | HUD, menú, estilos base |
| `js/rules.js` | núcleo | **la única tabla de reglas** (todos los números que deciden vida o muerte), con capas y modificadores |
| `js/core.js` | núcleo | motor: estado, física, colisiones, modelo de fallo, generador de filas, balcones, rescate; **léelo completo antes de empezar** |
| `js/worlds.js` | Mundos | mundos, escenarios y piezas propias (con celda y dureza) |
| `js/sewer.js` | núcleo | el drenaje (submundo), sus piezas y el cocodrilo |
| `js/cats.js` | Gatos | personajes y habilidades |
| `js/models.js` | núcleo | modelos de Blender (Tinto, Panela, utilería) |
| `js/fx.js` | Animación | animación, partículas, cámara, carteles |
| `js/levels.js` | Niveles | pantallas, niveles, billetera, tienda, sardinas, récords, próxima meta |
| `js/stats.js` | núcleo | estadísticas en el dispositivo (`?stats=1`) |
| `pruebas/bots.js` | Lógica | banco de bots: se carga a mano desde la consola; mide los criterios de aceptación |
| `equipo/<rol>.md` | cada agente | bitácora |

Cada módulo exporta `export function install(game) { ... }`. El núcleo los carga en este orden: worlds, sewer, cats, models, fx, levels, stats. Después valida las piezas de cada mundo y emite `ready`. Si un módulo falta o falla, el juego sigue sin él.

**Regla de oro: el estado (`S`, `p`) lo escribe solo el núcleo. Los módulos lo leen y piden cambios por función.** Las reglas (`cfg`) son de solo lectura: se cambian con `rules.layer()` y `rules.mod()`.

## Reglas del juego (cómo se pierde)

- **No hay barra de vida.** Un golpe contra algo blando es un **tropiezo**: Panela se pega durante `dangerTime` (7 s; `S.danger` cuenta hacia atrás) y otro tropiezo dentro de esa ventana es **captura**. Un golpe de frente contra algo **duro** (`SPEC.hard`: carro, bus, chiva, carreta, lancha, moto, contenedor) es captura inmediata, salvo en el primer mundo (`rules: { hardCrash: false }` en el Pueblo) donde cuenta como tropiezo. Entrar de lado a un obstáculo duro, rozarlo por una esquina, o que un obstáculo móvil se meta encima, es tropiezo.
- **Panela está donde dice el peligro:** `S.dogGap` se deriva de `S.danger` (2,8 en peligro, 8,5 en calma). Nada que se recoja la aleja. La ventana baja el doble de rápido sobre un balcón, se recorta 2 s al girar a una calle lateral, y se cierra al pasar por una caneca o al salir del drenaje.
- **Bocado:** ratones (+1) y comida (+5) llenan `S.bocado` hasta `bocadoMax` (20). Lleno, `S.bocados = 1`: salva de UNA captura por doble tropiezo (no de un choque duro) y se gasta.
- **Dificultad:** reloj `S.heat` (sube 1/s, baja 25 al salir de una caneca). Velocidad `baseSpeed + accel × heat` hasta `maxSpeed` (15 → 32 en 170 s). Cinco escalones (`tierHeat`) deciden tiempo entre filas, patrones permitidos y cuántas filas seguidas puede quedar libre un carril.
- **Canecas:** pasar agachado por una caneca cierra el peligro y guarda una carga (`S.canecas = 1`). Si después lo atrapan, desde la pantalla de derrota se puede **salir de la caneca** pagando **una sardina** (`levels.save.sard`, se empieza con 2, tope 5, se ganan solo jugando: hoy, con cada récord nuevo), una vez por partida, sin cuenta regresiva. `game.rescue()` lo ejecuta: limpia 2,5 s de calle, baja `heat` 25, 2 s de invulnerabilidad; no rebobina nada.
- **Drenaje:** abajo persigue el cocodrilo con reloj propio (`S.chase`, sube 1/s, +5 s por tropiezo); al llegar a `catchIn` (22 s) es captura. Se sale por una escalera (cada `ladderEvery` metros). No hay choques duros abajo.
- **Racha y multiplicador:** `S.racha` sube con acciones (moneda +1, ratón/comida +2, "por un pelo" +5, pasar por debajo +5, giro +10, escalera +10); `S.mult` x1…x5 por `multSteps`; al tropezar baja `multDrop` escalones. `S.bonus` acumula `puntos × (mult − 1)` y metros × (mult − 1); `end()` lo suma al puntaje. Las monedas de la billetera no se multiplican.
- **Fin de partida:** solo el núcleo captura (`capture(cause, hard)` → `dying` → 1,3 s → `end()`). Los niveles piden `game.end({ won, reason })` por objetivo, tiempo o tropiezos.

## Tipos de calle, topes y retos (añadido el 8 de octubre)

- **Tipos de calle** (`seg.kind`): `''` normal, `callejon`, `mercado`, `plaza`, `tejado`. Los decide `kindFor(d)` con las probabilidades de `KIND_ODDS` (`game.KIND_ODDS`, se puede tocar en caliente para experimentar): `side` para calles laterales y `ahead` para la de frente. La flecha de GIRAR anuncia el tipo de la lateral. Son inventados: no copian ningún lugar real.
  - `callejon`: dos carriles. `seg.closed` (±1) es el carril que tapa el muro; `gen.closed` es su índice mientras se puebla. El generador no pone piezas ni salidas ahí, no admite piezas móviles ni el poste, y cada fila lleva una caja invisible (`nada`) en ese carril para quien lea filas. `move()` no deja entrar. Trae ratones en cada hueco y filas un 10 % más seguidas (`seg.bonus`). No usa `world.side`: lo arma `alleySide`.
  - `mercado`: decorado normal del mundo más `marketSide`; pesa más las celdas S y A y menos las X.
  - `plaza`: `plazaSide` en vez de `world.side`; máximo 4 filas.
  - `tejado`: un balcón de 50–80 m (`planBalconies`).
  - `world.ambiente` no corre en `callejon` ni `plaza`.
- **Calle lateral** (`seg.turned`): la primera fila va 0,4 s más lejos y sin piezas duras (`gen.noHard`).
- **Topes** (`rules.js`): `rowMaxObs`, `streetMaxRows`, `streetMaxObs`, `streetMaxPickups`.
- **Piezas de andén** (`SPEC.outer`, hoy el hidrante): solo carriles de afuera.
- **Primer encuentro:** una pieza nueva solo entra en una fila de un solo tipo de pieza (con o sin huecos).
- **"Por un pelo" de lado:** cuenta quitarse del carril del obstáculo en los últimos 0,32 s (`p.laneAt`).
- **Retos por partida** (`RETOS` en `levels.js`): tres seguidos en modo infinito, ficha `#lvReto`, pagan con `game.coins`.
- **Marcador:** un renglón. `#micePill`, `#bocadoPill` y `#lvSard` existen pero no se muestran; `#canecaPill` solo con carga.
- **Cámara:** `gapMax` 6,5 y `dangerGap` 3,6; la altura sube 1 m por cada metro que Panela se acerca.
- **Bots:** un solo `bots.batch` a la vez por pestaña (dos a la vez se pisan). **Nunca poner un comentario `//` en mitad de una línea de `BASE` en `rules.js`:** se come las claves que siguen.

## Coordenadas

- Personajes y obstáculos miran hacia **-Z**. Dentro de un tramo: `x` = lateral (carriles en x = -3, 0, 3; balcones en x = ±6, `p.lane = ±2`), `z = -s` donde `s` es la distancia recorrida en el tramo, `y` = altura.
- Calzada: x ∈ [-4.5, 4.5]. Andenes: hasta ±7.5 (`game.HALF`). Edificios: de ±7.5 a ±17.5 (`game.DEPTH` = 10).
- Un tramo (`seg`) va de `s = 7.5` a `s = seg.L - 7.5`; en `s = seg.L` está el centro del cruce. `seg.sides` dice qué calles laterales tiene. `seg.base` es la distancia de carrera en que empieza. `seg.balconies = [{ side, s0, s1, L }]` dice dónde hay balcones (se decide antes de armar las fachadas).

## API (`game`)

**Three y escena:** `THREE, scene, camera, renderer, sun, hemi, view`, `dog`, y getters `cat`, `catDef`, `world`, `cur`, `sub` (submundo activo), `pos`, `phase`.

**Piezas:** `geo`, `part`, `mat`, `canvasTex`, `stripes`, `leg`, `makeCat`, `makeDog`, `runCycle`, `bake`, `spawn(tipo)`, `protos`, `vcMat`, `rand, pick, clamp`.

**Reglas:** `rules` (`get`, `layer('world'|'level', obj|null)`, `mod(id, { clave: { set | add | mul } })`, `unmod(id)`, `mods`, `layers`, `BASE`) y `cfg` (vista de solo lectura; escribirle avisa en consola y pasa por un modificador `legado:`).

**Estado (solo lectura para los módulos):**
- `S`: `state` ('menu' | 'play' | 'rescue' | 'dying' | 'over'), `paused, time, dist, mice, coins, speed, speedMul, shake, dogGap, dogOff, score, won, danger, bocado, bocados, canecas, heat, chase, stumbles, cause, hardCause, racha, mult, multBest, bonus, nearmiss, passes, lastCaneca, rescued`. `health` existe solo como valor derivado del peligro.
- `p`: `s, x, lane (-2…2), prevLane, y, vy, h, slide, fall, inv, slow, air, want` (entrada guardada 0,15 s para ejecutarla al aterrizar).

**Pedir cambios:** `damage(o)` (el núcleo decide tropiezo o captura; `o.lethal`, `o.frontal`, `o.hard` vienen puestos cuando corren los ganchos), `collect(o)`, `coins(n, por)`, `racha(puntos, puntaje, por)`, `invuln(s)`, `calm()` (cierra el peligro), `capture(causa, duro)`, `rescue()`, `canRescue()`, `end({ won, reason })`, `enterSub(mundo)`, `exitSub()`, `hud()`.

**Acciones:** `start()`, `reset()`, `showMenu()`, `setWorld(id)`, `setCat(id)`, `setPaused(bool)`, `sfx(...)`, `bark()`, `input.move(dir) / jump() / slide() / turn(dir)`, `sim(n, each)`, `step(dt)`.

**Eventos** (`game.on(nombre, fn)`): `ready, start, update (dt), frame ({dt, phase}), jump, land, slide, lane, turn ({dir, seg}), hit (o: todo golpe), stumble (o: tropiezo sin captura), dying ({cause, hard, sub}), over ({won, score, dist, coins, mice, cause, hard, mult, canRescue}), collect (o), pass (o: pasó por debajo o por dentro sin chocar), nearmiss ({o, how}), caneca ({charged}), bocado, bocadoUsed, mult ({mult, up}), rescueStart, rescue, segment, segmentRemoved, world, cat, sub (mundo | null), pause, hud, ability, specialPlaced`.

**Ganchos:** `hooks.damage.push(fn)` — `fn(o)` que devuelve `false` cancela el golpe; `o.lethal` dice si iba a ser captura. `flags.customMenu` (un módulo maneja menú y reinicio), `flags.cameraOwner` (un módulo mueve la cámara; el núcleo deja de sacudirla).

**Piezas y generador:** `BUILD[tipo](g, variante)` arma el modelo; `SPEC[tipo] = { hw, hl, y0, y1, cell, hard?, move?, full?, long?, lanes?, top?, ramp?, hole?, fly?, collect?, food?, keep?, shadow? }`. `cell` es la celda del generador: `S` bajo (saltar, `y1 ≤ 1,2`), `A` alto con hueco (agacharse, `y0 ≥ 0,55`), `X` muro (cambiar de carril), `M` móvil lateral, `T` temporizado de ancho total; `W6` para piezas que dan tres celdas distintas (el poste). `piece(tipo, { make(seg, s, lane) })` registra la pieza (por defecto `make` = `addObstacle`); el **peso por mundo** va en `world.pieces = { tipo: peso }`. **Los mundos no arman filas:** el generador del núcleo elige la forma de cada fila por patrones (`PATTERNS`) y cumple las invariantes (`equipo/diseno-bucle.md` §3.3). `world.gap(seg, s0, s1, ruta, dist)` y `world.respiro(seg, s0, s1, salidas, dist, heat)` dejan al mundo poner cosas en huecos y respiros (el drenaje pone escaleras). `addObstacle(seg, tipo, s, carril, y)` coloca el frente de la pieza en `s`. `gen` es el estado del generador (`nextCaneca`, `nextSewer`, `nextBalcony`, …). `balconyAt(seg, lado, s)` dice si ahí hay balcón (el decorado no debe invadirlo). `validateWorlds()` avisa si a un mundo le faltan piezas para alguna celda.

**Mundos** (`game.worlds`): `{ id, name, emoji, desc }` más cualquier clave de `WORLD_DEFAULTS` (cielo, niebla, luces, colores, `heights`, `pieces`, `tierShift`, `miceEvery`, `balconies`, `food`, `rules`). Opcionales: `facade`, `road`, `side`, `decorate`, `backdrop`, `gap`, `respiro`. `rules` es la capa de reglas del mundo (el Pueblo: `{ hardCrash: false }`).

**Gatos** (`game.cats`): `{ id, name, emoji, desc, colors }`, opcionales `build(game)`, `price`, `ability`. Los cambios de reglas de una habilidad van con `rules.mod('id', …)` / `rules.unmod('id')`; Nube revive cuando `o.lethal` es verdadero; Sombra llama `game.calm()`.

**Interfaz:** `ui.hud`, `ui.menu`, `ui.over`, `ui.top`. `#hud` tiene `pointer-events: none`; lo que reciba toques lleva `pointer-events: auto`. El núcleo ignora los toques sobre `button`, `input`, `a`, `select` y cualquier elemento con `data-ui`.

**Guardado:** `store.get/set` con claves `catRun*`; `levels.js` guarda en `catRunSave` (v2: `wallet, stars, owned, sard, rec, licks, lastW, …`). `stats.js` guarda en `tintoStats`.

## Reparto para no pisarse

- **Núcleo:** reglas, estado, física, colisiones, modelo de fallo, generador, balcones, canecas, rescate, drenaje.
- **Mundos:** escenario, fondo, clima, y sus piezas (modelo + `SPEC` con celda y dureza + `make`). No arma filas ni toca `S`/`p`. El decorado respeta `seg.balconies`.
- **Gatos:** modelos, habilidades (vía `rules.mod` y las funciones del núcleo) y el botón de habilidad.
- **Animación:** cámara (es su dueña), perro, pose del gato, partículas, carteles y textos. No escribe `S`.
- **Niveles:** pantallas, niveles (capa `level` de reglas), billetera, tienda, sardinas, récords, "casi" de la derrota, próxima meta, hitos.

## Pruebas

- Servidor en `http://localhost:5173`. Abre **tu propia pestaña** del navegador integrado y pasa siempre su `tabId`; `?solo=<módulo>` carga un módulo aislado; `?v=<n>` evita copias viejas.
- Con la ventana oculta no corre `requestAnimationFrame`: usa `game.sim(n, each)` (sin dibujar).
- **Banco de bots:** `const bots = (await import('/pruebas/bots.js?v=' + Date.now())).default;` → `bots.batch({ profiles, worlds, seeds })`, `bots.table()`, `bots.auditGen(mundo)`, `bots.auditCfg()`, `bots.cleanup()`. Los criterios de aceptación están en `equipo/logica.md` §f.
