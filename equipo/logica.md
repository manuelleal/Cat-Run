# Lógica — bitácora del agente Lógica

Encargo: organizar toda la lógica del juego. Fase 1 (este documento): auditoría con mediciones, sin cambiar reglas. Fase 2: implementar las especificaciones de los diseñadores (`equipo/diseno-bucle.md`, `equipo/diseno-motivacion.md`) sobre una lógica ordenada.

Lo que detonó el encargo, en palabras del dueño: "llevo como 3 minutos corriendo y lo dejé solo por la mitad; el perro nunca lo alcanzó, nunca tuve que moverlo".

Todo lo que dice "medido" salió del banco de pruebas `pruebas/bots.js` corrido sobre el juego tal como está hoy (8 de octubre de 2026). Lo que dice "supongo" es interpretación mía.

## (a) Mapa de la lógica actual

### Quién decide si el jugador vive o muere

| Número | Dónde vive | Valor | Quién más lo toca |
|---|---|---|---|
| Vida inicial | `core.js` `reset()` | 100 | `cats.js` (Nube revive con 50; Sombra +10 al activar sigilo) |
| Daño por obstáculo | `SPEC[tipo].dmg` en `core.js` (14 tipos), `worlds.js` (20 tipos), `sewer.js` (4 tipos) | 8 a 30 | nadie lo escala: ni el mundo, ni el nivel, ni la velocidad |
| Mordisco del cocodrilo | `sewer.js` | 45 cada 3,5 s desde el segundo 26 bajo tierra | — |
| Curación por ratón | `cfg.mouseHeal` | 4 | — |
| Curación por comida | `SPEC[tipo].food` | gallina 8, cangrejo 6, pescado 10 | — |
| Invulnerabilidad tras golpe | `cfg.invuln` | 1,2 s | `cats.js` (Nube: 3 s al revivir); `sewer.js` escribe `p.inv = 2` al caer y `core.js` `p.inv = 1,5` al salir |
| Freno tras golpe | `cfg.hitSlow` | velocidad × 0,45, recupera a razón 1,2/s | — |
| Velocidad | `cfg.baseSpeed + S.time × cfg.accel`, tope `cfg.maxSpeed`, × `S.speedMul` | 16 + 0,22·t, tope 38 (a los 100 s) | `levels.js` reemplaza base/accel/max por nivel; `cats.js` suma 7 a base y max durante la embestida; `S.speedMul` no lo escribe nadie |
| Separación entre filas | `cfg.rowGap` + `S.speed × 0,35` | 19–26 m + 5,6 a 13,3 m | `levels.js` reemplaza `rowGap` por nivel (de [30,38] a [17,23]) |
| Qué fila sale | `pickRow()` con `ROWS[].weight` y `world.rowWeights` | pesos por mundo | `worlds.js` define los pesos de sus filas; `sewer.js` añade `drenaje` (peso 9 en todos los mundos) y filas con `sewer:` para abajo |
| Qué carriles ocupa una fila | cada `ROWS[].make` baraja `[-1,0,1]` y toma 1–3 | depende de la fila | — |
| Distancia del perro | `S.dogGap` → objetivo `gapMin + vida/100 × (gapMax − gapMin)` | 4 a 8,5 | `damage()` resta 1,5; `sewer.js` lo escribe cada cuadro bajo tierra y al salir; `cats.js` suma 3 a gapMin/gapMax en sigilo |
| Fin de la partida | `damage()`: si `S.health <= 0` → `dying` → 1,3 s → `end()` | solo la vida | `levels.js` llama `end()` por objetivo, por `maxHits` o por tiempo límite |

**El perro no atrapa.** `S.dogGap` solo se usa para colocar al perro y la cámara (`place()`). No hay ninguna rama en la que el perro termine la partida: "¡Panela te alcanzó!" es el texto que se muestra cuando la vida llega a cero por golpes. Lo mismo arriba y abajo: el cocodrilo tampoco atrapa, muerde (45 de daño) y la muerte sigue siendo por vida.

### El bucle de un cuadro (`core.js` `frame` → `update` → `place`)

1. `S.time += dt`; `emit('update')` (aquí escriben `sewer.js`, `cats.js`, `levels.js`, `fx.js`, antes de que el núcleo mueva nada).
2. Velocidad, avance `p.s`, carril (`p.x` se acerca a `p.lane × 3` con `laneSnap` 14/s), gravedad, piso (`floorAt`: rampas y tarimas), deslizada (`p.h` = 0,5 agachado, 1,3 de pie).
3. Giro o continuación al llegar al cruce (`choose`).
4. Colisiones contra `cur.obs`: se salta un obstáculo si está marcado `hit`, si ya pasó, si está en otro carril (`|o.x − p.x| > hw + 0,4`), si el gato está por encima (`p.y >= y1`) o pasa por debajo (`p.y + p.h <= y0`). Si es `collect` → `collect(o)`; si no y `p.inv <= 0` → `damage(o)`.
5. Perro: `S.dogGap` se acerca a su objetivo por vida.
6. `place()`: anima obstáculos (la señora, el burro, el balón… cambian `o.x` aquí: la colisión del cuadro siguiente usa esa `x`), coloca gato, perro y cámara.
7. `emit('frame')` (animación de `fx.js`, `cats.js`, fundido de `sewer.js`).

### Qué módulo toca qué estado

| Módulo | Lee | Escribe |
|---|---|---|
| `core.js` | todo | `S.*`, `p.*`, `cfg` (solo valores iniciales) |
| `worlds.js` | `p.s`, `game.cur` (para animar cocos, motos, gaviotas que vienen de frente) | `ROWS` (+20 filas), `SPEC`/`BUILD`/`VARIANTS`, `game.worlds` (reemplaza los 3 del núcleo), `o.x`/`o.s`/`o.y0`/`o.y1` de sus obstáculos (los mueve) |
| `sewer.js` | `S.state`, `game.sub`, `p.yaw` | `ROWS` (+5), `SPEC`/`BUILD`, `S.dogGap` (cada cuadro bajo tierra), `p.fall`, `p.inv`, llama `game.damage({dmg: 45})`, `enterSub`/`exitSub` |
| `cats.js` | `S.speed`, `p.*`, `cfg.airJumps`, `game.cur.obs` | `cfg.airJumps/baseSpeed/maxSpeed/gapMin/gapMax` (con deshacer), `S.health` (+10 sigilo, =50 revivir), `S.coins` (+2 por embestida), `p.inv`, `p.slow`, `p.vy` (planeo), `o.x` de monedas y ratones (imán), `o.hit` (zarpazo/embestida), `hooks.damage` (cancela golpes) |
| `fx.js` | `S.*`, `p.*`, `game.pos`, `game.dog` | `S.shake = 0` (se la apropia cada cuadro), cámara (`fov`, posición después de `place`), pose del gato y el perro |
| `levels.js` | `S.dist/mice/coins/health/time`, eventos `hit`/`turn` | `cfg.baseSpeed/accel/maxSpeed/rowGap` (copia y restaura), `store.set` (lo envuelve para filtrar `catRunTop`), `flags.customMenu`, llama `game.end()`, `setCat`, `setWorld` |
| `models.js` | — | `cats[].build`, piezas del perro |

### Dónde viven las reglas hoy (cuatro sitios, sin dueño)

- Valores por defecto: `cfg` y `SPEC` en `core.js`.
- Variación por mundo: `rowWeights` en `worlds.js` (pero `tarima` y `drenaje` no están en ninguna lista de pesos, así que salen con su peso de fábrica, 11 y 9, en los tres mundos: el diseñador de mundos nunca decidió sobre ellas).
- Variación por nivel: `D(baseSpeed, accel, maxSpeed, g0, g1)` en `levels.js`.
- Variación por gato: `bump()` en `cats.js`.
- Reglas del submundo: constantes sueltas en `sewer.js` (`CATCH_IN`, `BITE_AT`, `LADDER_EVERY`, el 45 del mordisco, el `pending = .32`).

## (b) Mediciones

Banco: `pruebas/bots.js` (cómo se usa, al final). Datos completos en `pruebas/resultados-fase1.json`. Juego sin modificar, gato Tinto, modo infinito, tope de 300 s por partida. **Lote principal: 9 perfiles × 3 mundos × 10 semillas = 270 partidas.** Más 150 partidas de niveles y 60 contrafactuales.

Perfiles: **quieto** (sin entradas; L/C/R = carril izquierdo/central/derecho; puede caer al drenaje), **calle** (quieto que solo salta la alcantarilla verde: nunca baja), **azar** (una entrada al azar cada 0,15–0,75 s), **humano** (ve a 22 m, reacciona en 300 ± 50 ms, 12 % de error, va por comida y escaleras), **experto** (45 m, 50 ms, 1 % de error).

### Tiempo de vida (segundos; mediana, mínimo–máximo, partidas vivas a los 300 s)

| Perfil | Pueblo | Costa | Neón |
|---|---|---|---|
| quieto izq. | 79 (35–134) 0/10 | 83 (45–183) 0/10 | 41 (19–57) 0/10 |
| quieto centro | 71 (24–300) 1/10 | 94 (33–240) 0/10 | 27 (13–53) 0/10 |
| quieto der. | 53 (28–154) 0/10 | 95 (22–181) 0/10 | 42 (22–53) 0/10 |
| calle izq. | 71 (28–224) 0/10 | 74 (29–136) 0/10 | 33 (19–39) 0/10 |
| calle centro | 83 (34–300) 1/10 | 76 (37–128) 0/10 | 26 (13–46) 0/10 |
| calle der. | 108 (20–274) 0/10 | 115 (22–231) 0/10 | 36 (22–64) 0/10 |
| azar | 108 (39–168) 0/10 | 90 (47–226) 0/10 | 33 (18–81) 0/10 |
| humano | 300 (300–300) **10/10** | 300 (300–300) **10/10** | 300 (44–300) **6/10** |
| experto | 300 (300–300) **10/10** | 300 (300–300) **10/10** | 300 (156–300) **9/10** |

Lectura: un jugador que no toca nada dura entre 1 y 2 minutos en el pueblo y la costa, y a veces 4 o 5. Jugar al azar da lo mismo que no jugar. Un humano medio **no muere en 5 minutos** en dos de los tres mundos; en Neón muere 4 de 10 veces. El experto casi nunca muere. Lo que dijo el dueño ("3 minutos sin moverlo") cabe dentro de lo medido.

### Golpes, daño y curación por minuto (promedios)

| Perfil × mundo | Golpes/min | Daño/min | Cura efectiva/min | Cura potencial/min | Ratones/min | Vida mínima | "Resurrecciones" |
|---|---|---|---|---|---|---|---|
| calle centro × Pueblo | 11,0 | 204 | 124 | 191 | 44 | 10,7 | 0,2 |
| calle centro × Costa | 14,2 | 213 | 133 | 146 | 35 | 7,5 | 0,1 |
| calle centro × Neón | 15,8 | 313 | 89 | 94 | 23 | 10,3 | 0 |
| quieto (3 carriles) × Pueblo | 11,6–12,7 | 232–256 | 136–183 | 157–212 | 36–50 | 9–11 | 0,1–0,5 |
| azar × Pueblo | 11,4 | 235 | 177 | 217 | 50 | 8,1 | 0,6 |
| humano × Pueblo | 2,5 | 53 | 52 | 273 | 64 | 60,6 | 0 |
| humano × Neón | 6,1 | 134 | 105 | 191 | 48 | 14,0 | 0,5 |
| experto × Pueblo | 0,3 | 5 | 5 | 171 | 38 | 84,7 | 0 |

"Cura efectiva" es lo que de verdad subió la vida (tope 100); "cura potencial" lo que daban ratones y comida. "Resurrección" = bajar a ≤ 25 de vida y volver a ≥ 60 en la misma partida. La invulnerabilidad absorbió entre 0 y 0,8 golpes por minuto en todos los perfiles quietos (1–20 puntos de daño por minuto: entre el 0,5 % y el 7 % del daño).

### Filas: cuántas tocan el carril del jugador y cuántas dejan uno libre

Dos fuentes: lo que pasó en las partidas (columna "en partida", promedio de los quietos) y la generación pura (`bots.rowStats`, 40 semillas × 4 tramos por mundo, ~500 filas por mundo). Una "fila" es un grupo de obstáculos con daño separados menos de 12 m. "Móviles" = señora, burro, balón, pelota, dron (cruzan la calle) y zigzag.

| Mundo | Filas con obstáculo en mi carril (contando móviles) | Solo estáticos | Filas con al menos un carril libre | Filas que bloquean los tres carriles | Tiempo con un carril seguro en los próximos 40 m | Cura por 100 m en un carril |
|---|---|---|---|---|---|---|
| Pueblo | 60–66 % (generación 60–66 %) | 38–43 % | 65 % | 35 % | 75–78 % | 13–16 puntos |
| Costa | 60–67 % | 48–54 % | 69 % | 31 % | 74–77 % | 12–15 |
| Neón | 60–74 % | 53–65 % | 69 % | 31 % | 68–72 % | 11–13 |

Y por peso de fila (lo que decide `rowWeights`): en el Pueblo el 12 % de las filas son gallinas (comida), el 8,5 % tarimas (5 monedas y un pescado para quien va por ese carril, daño 0 si se sube por la rampa), el 4,7 % "libre" y el 7 % alcantarilla verde: **un tercio de las filas no hace daño o cura**. En la Costa: cangrejos 11,5 %, tarima 8 %, libre 1,4 %, drenaje 6,5 % (27 %). En Neón: tarima 8,5 %, drenaje 7 % (15 %). La fila `carreta` (10 % en el pueblo) nunca va al carril central.

### De qué murieron los quietos

Pueblo, perfil quieto (puede bajar al drenaje): 14 de 30 muertes fueron abajo (cocodrilo, mordisco, barril, tubo). Perfil calle (nunca baja): valla, tendedero, chiva, alcantarilla, carreta. Costa: surf, red, lancha, sombrilla, gaviota. Neón: cinta, charco, láser, carro, moto. El drenaje no es refugio para el quieto (mediana quieto ≈ calle), y para el humano y el experto es inofensivo: 4–7 caídas por partida de 300 s y **cero mordiscos**, porque toman la escalera.

### Contrafactuales (perfil calle centro, 3 mundos × 10 semillas cada uno; cambio hecho en memoria desde el banco, nunca en `js/`)

| Variante | Pueblo (mediana) | Costa | Neón |
|---|---|---|---|
| Juego tal cual | 83 s | 76 s | 26 s |
| **Sin curación** (`mouseHeal` = 0, comida = 0) | **35 s** | **36 s** | **17 s** |
| Sin invulnerabilidad (`invuln` = 0,001) | 134 s | 130 s | 27 s |

### Niveles (quieto centro y humano, 5 semillas por nivel; estrellas abiertas en memoria)

| Nivel | Objetivo | Quieto gana | Humano gana |
|---|---|---|---|
| Pueblo 1 | 300 m | **4/5** | 5/5 |
| Pueblo 2 | 12 ratones | **4/5** | 5/5 |
| Pueblo 3 | 40 monedas | **4/5** | 5/5 |
| Pueblo 4 | 2 giros | 0/5 | 0/5 (los bots no giran: límite del banco) |
| Pueblo 5 | 600 m, ≤ 3 choques | 2/5 | 5/5 |
| Costa 1 | 700 m | **5/5** | 5/5 |
| Costa 2 | 25 ratones en 45 s | **5/5** | 0/5 (le faltan ratones: el humano esquiva en vez de comer) |
| Costa 3 | 90 monedas | 4/5 | 5/5 |
| Costa 4 | 4 giros | 0/5 | 0/5 (no giran) |
| Costa 5 | 1000 m, ≤ 2 choques | 0/5 | 3/5 |
| Neón 1 | 1200 m | 1/5 | 5/5 |
| Neón 2 | 40 ratones | 1/5 | 5/5 |
| Neón 3 | 120 monedas en 90 s | 0/5 | 5/5 |
| Neón 4 | 6 giros, ≤ 3 choques | 0/5 | 0/5 |
| Neón 5 | 1500 m, ≤ 1 choque | 0/5 | 0/5 |

Lectura: 5 de los 15 niveles se ganan sin tocar la pantalla la mayoría de las veces. Los únicos que de verdad obligan a jugar son los de "máximo N choques".

## (c) Causas de "se juega solo", por peso

1. **La curación iguala al daño (peso mayor).** Un quieto recibe ~230 de daño por minuto y recupera ~150–190 (potencial 160–210). Sin curación dura 35 s en vez de 83 (pueblo) y 36 en vez de 76 (costa): la comida más que duplica la vida del que no juega. Las causas de fondo: 13–16 puntos de cura por cada 100 m **en cada carril** (3 ratones de 4 en un carril al azar en cada hueco entre filas, 6 en los tramos "bonus", más gallinas, cangrejos y el pescado de la tarima), contra ~10–12 puntos de daño por 100 m en un carril. En Neón, que no tiene filas de comida, el quieto muere en 27 s: es el único mundo que "funciona" sin jugar, y lo hace por accidente (el diseñador de mundos no decidió eso).
2. **No existe "atrapar" (peso estructural: es lo que permite la causa 1).** La única condición de fin es vida ≤ 0, y la vida se rellena. Los quietos bajan en promedio a 5–11 de vida y vuelven a subir (0,1–0,9 resurrecciones por partida); el humano medio nunca baja de 60 en el pueblo. Panela está a 4–8,5 de distancia según la vida y nunca muerde; el cocodrilo sí muerde (45), pero la vida sigue siendo el único reloj. Mientras el reloj se pueda rebobinar comiendo, ningún ajuste de números produce un final.
3. **Un tercio de las filas no exige nada (peso medio).** 31–35 % de las filas bloquean los tres carriles; el 65–69 % dejan al menos uno libre, y el carril del jugador va libre el 26–40 % de las filas (52–62 % si solo se cuentan obstáculos fijos). Sumado a que el 27–32 % de los huecos del pueblo y la costa son comida, tarima, libre o drenaje, el ritmo real de "tengo que hacer algo" es de un golpe cada ~5 s para un quieto, con 20 puntos por golpe. Es un ritmo que la cura compensa.
4. **La dificultad no crece (peso medio, explica por qué el humano no muere nunca).** La velocidad llega a su tope a los 100 s y la separación entre filas crece con la velocidad (`+ speed × 0,35`), así que las filas por segundo suben de ~0,6 a ~1,1 y ahí se quedan; el daño por golpe es el mismo del segundo 1 al 600. Quien aguanta el minuto 2 aguanta el minuto 20: el humano y el experto llegan al tope de 300 s en el 90–100 % de las partidas en dos mundos. Un runner sin fin necesita una curva que termine alcanzando a cualquiera.
5. **Obstáculos que ya no hacen daño (peso bajo pero visible).** Gallinas y cangrejos pasaron a comida sin quitarles peso de fila (16 de 129 y 16 de 139); la rampa tiene daño 0 y la tarima regala 10 de vida y 5 monedas al que va por su carril; `carreta` nunca ocupa el centro; `bus`, `chiva`, `lancha` y `tarima` ocupan un solo carril. Es el 15–32 % de las filas según el mundo.
6. **La invulnerabilidad no es causa (medido: descartada).** 1,2 s a velocidad frenada (×0,45) son unos 10–12 m, menos que cualquier hueco entre filas (25–40 m). Absorbe 0–0,8 golpes por minuto (≤ 7 % del daño). Con `invuln` ≈ 0 la vida del quieto no baja.
7. **El drenaje no es refugio, pero tampoco castigo real (peso bajo).** Para el quieto es donde más muere (14 de 30 muertes en el pueblo); para quien juega, 0 mordiscos en 300 s. El cocodrilo solo asusta a quien no toma la escalera, y la escalera está a la vista cada 110 m.

Lo que supongo y no medí: que el dueño jugó en el Pueblo (el mundo abierto por defecto) y que su "3 minutos" incluye alguna caída al drenaje de la que salió por azar. No medí a personas reales; el "humano medio" es un modelo con reacción de 300 ms y 12 % de error, y sus números deben leerse como "orden de magnitud", no como calibración.

## (d) Incoherencias entre módulos

Leídas en el código; las marcadas con (medido) se comprobaron en el navegador.

1. **`cfg` tiene tres escritores con dos mecanismos de deshacer distintos.** `levels.js` copia las claves que cambia y las restaura en bloque; `cats.js` suma un delta y lo deshace restando "si nadie más lo tocó". Si se cruzan, el resultado es falso: con la embestida de Bola activa (`baseSpeed` 13 → 20 en un nivel) y el nivel terminando en ese instante, `levels` restaura `baseSpeed` a 16 y después `cats` resta 7: queda 9 y así se queda para el modo infinito siguiente (medido: ver bitácora).
2. **`S.dogGap` tiene tres escritores en el mismo cuadro bajo tierra.** `sewer.js` lo fija por tiempo en `update`; acto seguido el núcleo lo arrastra hacia el objetivo por vida (`gapMin + vida/100·…`); `damage()` le resta 1,5. Abajo, el mordisco se decide con el valor del drenaje, pero el cocodrilo se dibuja con la mezcla. Arriba, `exitSub` lo pone en `gapMax` "porque le sacó ventaja", y el núcleo lo vuelve a bajar a la distancia por vida en unos cuadros: la ventaja es cosmética.
3. **`S.shake` se la apropia `fx.js`.** El núcleo sacude la cámara con `S.shake`; `fx.js` la lee y la pone en cero en cada `update`, así que la sacudida del núcleo nunca corre cuando `fx` está cargado. Dos implementaciones del mismo efecto que se comunican anulando estado ajeno.
4. **Pesos de filas incompletos.** `worlds.js` fija pesos para las filas que existían cuando se escribió. `tarima` (núcleo, añadida después) y `drenaje` (`sewer.js`) no aparecen en ninguna lista y salen con su peso de fábrica (11 y 9) en los tres mundos: nadie decidió su frecuencia por mundo. En Neón `libre: 0`, pero entran `tarima` y `drenaje` como "filas sin obstáculo" por la puerta de atrás.
5. **Filas fantasma.** `tarima` no pone nada si no cabe (`s + 20 > seg.L − 30`) y `drenaje` no pone nada en el primer tramo; el generador igual consume el hueco. Son filas vacías que no figuran como "libre".
6. **Reglas de vida repartidas en cuatro módulos.** Daño en `SPEC` de tres archivos; curación en `cfg.mouseHeal` y en `SPEC.food`; +10 de vida en el sigilo (`cats.js`); =50 al revivir (`cats.js`); 45 del mordisco (`sewer.js`). Nada escala con velocidad, mundo ni nivel: un nivel 15 pega igual que el 1, solo que más rápido y más junto.
7. **Dos dueños de `catRunTop`.** El núcleo anota cada `end()`; `levels.js` envuelve `store.set` para filtrar lo que el núcleo guarda y lleva su propia tabla. Funciona, pero cualquier cambio en el núcleo rompe el filtro sin aviso.
8. **El mordisco cuenta como "choque" en los niveles.** `levels.js` cuenta `maxHits` por el evento `hit`, que también emite el cocodrilo. No está declarado en ningún texto.
9. **Monedas sin evento.** La embestida hace `S.coins += 2` directo: no pasa por `collect`, así que `fx.js` no suma racha y el HUD se actualiza a mano. Ya lo avisó el agente Gatos; sigue igual.
10. **Obstáculos que se mueven fuera del contrato.** `worlds.js` escribe `o.x`, `o.s`, `o.y0`, `o.y1` de sus obstáculos cada cuadro (señora, burro, balón, pelota, dron, cocos, motos, gaviota, barrera, láser, zigzag). El núcleo y el zarpazo leen esos valores, pero `AGENTES.md` no dice que un obstáculo pueda moverse. Cualquier generador que quiera garantizar "un carril seguro" tiene que conocer esa lista a mano (el banco de pruebas la tiene escrita: `MOVING_ALL`).
11. **`p.inv` lo escriben cuatro sitios** (núcleo 1,2 s; `sewer` 2 s al caer, 1 s al entrar, 1,5 s al salir; `cats` 3 s al revivir). No hay una función "dar invulnerabilidad".
12. **Textos que ya no dicen la verdad.** `index.html`: "Agacharse bajo la cinta policial" (hoy también bajo carros, buses y chiva); "Atrapa ratones: dan vida y alejan a Panela" (la alejan solo en la imagen). "¡Panela te alcanzó!" se muestra cuando la vida llegó a cero por golpes; Panela nunca alcanza.
13. **Parámetros huérfanos.** `S.speedMul` no lo escribe nadie; `cfg.gapMin/gapMax` son del perro pero `sewer.js` los usa para el cocodrilo; `cfg.scoreCoin/scoreMouse` solo cuentan en el puntaje del modo infinito.

## (e) Propuesta de organización (para la fase 2)

Principio: **una sola fuente de verdad para las reglas, y nadie escribe el estado de otro.**

1. **`js/rules.js` (nuevo, del núcleo): la tabla de reglas.** Un objeto declarativo con todos los números que deciden vida o muerte: vida, daño por tipo, curación por tipo, invulnerabilidad, freno, velocidad, separación y ritmo de filas, distancia y "presión" del perseguidor, constantes del drenaje. Con tres capas encima de la base: **mundo**, **nivel** y **modificadores temporales** (gato, habilidad, estado). Se lee con `rules.get('invuln')` y se modifica solo con `rules.mod(id, { clave: {add|mul} })` / `rules.unmod(id)`. Nada de copiar-y-restaurar ni de restar-lo-sumado: los modificadores tienen dueño y se quitan por nombre. `cfg` queda como vista de solo lectura (en desarrollo, un `Proxy` que avisa en consola si alguien escribe).
2. **Un solo juez de la partida.** Hoy la partida termina por "vida ≤ 0" en `damage()` y por objetivo/tiempo/choques en `levels.js`. Pasa a una función del núcleo, `judge()`, que corre al final de `update` y decide con las reglas: perseguidor alcanzó (distancia ≤ mordida), vida agotada, objetivo cumplido, tiempo. Los módulos piden (`game.end({won, reason})`), no deciden.
3. **El perseguidor es estado real, no decoración.** `S.chase` (distancia al perseguidor) la escribe solo el núcleo, a partir de reglas: sube con cada golpe y con cada fila sin recoger nada, baja con rachas limpias y ratones; el drenaje reutiliza el mismo mecanismo con otra piel (el cocodrilo es el perseguidor de abajo, no un temporizador aparte). Lo que diga el diseño del bucle sobre cuánto sube y baja va a `rules.js`.
4. **Generador de filas con garantías.** `ROWS` sigue siendo de quien hace las filas, pero cada fila declara metadatos (`lanes` que ocupa o `sweep` si se mueve, `needs: 'jump'|'slide'|'lane'|'none'`, `heal`). El núcleo escoge con esos datos y garantiza lo que pida el diseño: cuántas filas seguidas pueden dejar un carril libre, qué proporción obliga a actuar, cuánta comida por 100 m, curva por tiempo. Los pesos por mundo pasan por una validación al cargar: toda fila tiene peso explícito en todo mundo o se avisa.
5. **Escrituras de estado por función, no por asignación.** `game.heal(n, src)`, `game.damage(o)`, `game.invuln(s, src)`, `game.coins(n, src)` (dispara `collect`), `game.shake(n)`. `S.*` y `p.*` son de solo lectura para los módulos. `fx.js` se queda con la cámara entera (el núcleo deja de sacudirla cuando `flags.cameraOwner` está puesto) y no toca `S.shake`.
6. **Quién puede tocar qué**

| | `rules.js` | `S`/`p` | `ROWS`/`SPEC` | `cfg` | fin de partida |
|---|---|---|---|---|---|
| núcleo | define base y aplica capas | escribe | define las del núcleo | vista derivada | `judge()` |
| mundos | capa de mundo (declarativa) | lee | añade filas con metadatos | — | — |
| drenaje | capa de submundo | lee; pide `heal/damage/invuln` | añade filas | — | pide `end()` con motivo |
| gatos | modificadores con nombre | lee; pide `heal/invuln/coins` | — | — | — |
| animación | — | lee | — | — | — |
| niveles | capa de nivel (declarativa) | lee | — | — | pide `end()` con motivo |

7. **El banco de pruebas es parte del contrato.** `pruebas/bots.js` corre antes de dar por buena cualquier regla; los criterios de (f) son la prueba de aceptación.

## (f) Criterios de aceptación para la fase 2

Todos se comprueban con `pruebas/bots.js` (10 semillas por celda salvo que se diga otra cosa; gato Tinto; modo infinito salvo los de niveles). Los umbrales son propuesta mía y se ajustan a lo que digan `diseno-bucle.md` y `diseno-motivacion.md`; lo que no se negocia es que sean números y que el banco los mida.

| # | Criterio | Hoy |
|---|---|---|
| 1 | **Quieto** (3 carriles × 3 mundos): mediana < 20 s y máximo < 35 s. | mediana 27–115 s, máximo 300 s |
| 2 | **Calle** (quieto sin drenaje): mismos límites que 1. | mediana 26–115 s |
| 3 | **Azar**: mediana < 40 s en todos los mundos. | 33–108 s |
| 4 | **Humano** en el Pueblo: mediana entre 60 y 150 s; ninguna partida de 10 llega a 300 s. En Neón: mediana entre 40 y 100 s. | 300 s, 10/10 al tope |
| 5 | **Experto**: mediana al menos el doble que el humano en el mismo mundo, y como máximo 2 de 10 partidas al tope de 300 s en el Pueblo. | 10/10 al tope |
| 6 | **Orden** por mediana: quieto < azar < humano < experto en cada mundo, y el cuartil superior del quieto por debajo del cuartil inferior del humano. | quieto ≈ azar; humano = experto |
| 7 | **Curación**: para el quieto, cura potencial/min ≤ 40 % del daño/min en todo mundo; y con la cura a 0 la mediana del quieto no cambia más de un 25 %. | 60–93 %; sin cura la vida cae a la mitad |
| 8 | **Atrapar existe**: ≥ 90 % de las muertes de quieto, azar y humano terminan con causa "atrapado" por el perseguidor (Panela arriba, cocodrilo abajo), y "resurrecciones" (≤ 25 → ≥ 60) ≤ 0,1 por partida. | 0 %; 0,1–0,9 |
| 9 | **Obligación de actuar**: a partir del segundo 20, ≥ 50 % de las filas bloquean los tres carriles o exigen salto/agachada, y nunca más de 2 filas seguidas dejan libre el carril del jugador (medido con `rowStats` y en partida). | 31–35 %; sin límite de seguidas |
| 10 | **Niveles**: quieto gana 0 de 5 en todo nivel; humano gana ≥ 4 de 5 el nivel 1 y ≤ 2 de 5 el nivel 15; experto gana ≥ 3 de 5 el 15. | quieto gana 4/5 en tres niveles |
| 11 | **Una sola fuente de reglas**: con `cfg` congelado (`Object.freeze`) una partida de 60 s con cada uno de los 7 gatos y la secuencia "nivel con embestida activa → modo infinito" no lanza ninguna escritura directa y `baseSpeed` vuelve a su valor (prueba `bots.auditCfg()`, por escribir). | `baseSpeed` queda en 9 |
| 12 | **Un solo escritor de `S.dogGap`/`S.chase` por cuadro** y `fx.js` no toca `S.shake` (comprobable con un `Proxy` de prueba en el banco). | 3 escritores; `fx` lo pone en 0 |

El banco necesita dos añadidos para medir todo esto: que los bots sepan girar en los cruces (para los niveles de "calles laterales") y `auditCfg()`. Van en la fase 2 antes de tocar reglas.

## Cómo se usa el banco

Con el juego abierto en `http://localhost:5173` (todos los módulos), en la consola:

```js
const bots = (await import('/pruebas/bots.js?v=' + Date.now())).default;
await bots.run({ profile: 'quietoC', world: 'pueblo', seed: 1 });          // una partida → métricas
bots.batch({ profiles: ['calleC', 'humano'], worlds: ['neon'], seeds: 10 }); // lote en segundo plano (guarda en localStorage y reanuda si la pestaña se recarga)
bots.progress;              // { done, total, running, error }
bots.table();               // resumen por perfil × mundo
bots.rowStats('playa', 40); // composición de filas sin correr bots
bots.batch({ profiles: ['quietoC'], levels: [[0, 0], [2, 4]], seeds: 5 }); // niveles [mundo, nivel]
bots.cleanup();             // deja localStorage (catRun*) como estaba y borra lo del banco
```

Perfiles: `quietoL/C/R`, `calleL/C/R`, `azar`, `humano`, `experto` (parámetros en `bots.PROFILES`). Reproducible: cada partida sustituye `Math.random` por un generador con semilla y lo restaura al terminar. Cada partida de 300 s tarda ~5 s de reloj (17 ms por segundo de juego). Lo que mide cada partida está en el objeto que devuelve `run` (tiempo, distancia, golpes por tipo, daño y cura efectivos y potenciales, golpes absorbidos por invulnerabilidad, vida mínima, resurrecciones, filas pasadas / en mi carril / con carril libre, fracción de tiempo con un carril seguro, caídas, mordiscos, escaleras, giros, entradas).

Lo que el banco no hace todavía: girar en cruces, usar habilidades, medir con gatos distintos de Tinto (se puede pasar `cat`, pero los bots no usan la habilidad).

## Fase 2 — implementación

Encargo: implementar `equipo/diseno-bucle.md` y `equipo/diseno-motivacion.md` sobre la organización propuesta en (e), con las decisiones del dueño y del coordinador ya tomadas (modelo clásico sin barra de vida, modo infinito al centro, canecas con sardina, "casi" real, balcones en vez de tarimas, precios sin tocar, nada específicamente colombiano, público con menores). Soy dueño de `js/` en esta fase. No vi ni veré el juego en movimiento: todo lo de aquí se comprobó con `game.sim` y el banco de bots; lo visual queda para una persona.

### Qué se implementó, por etapa

**A. Que no se pueda sobrevivir sin jugar** (`js/core.js`, `js/rules.js`, `js/worlds.js`, `js/sewer.js`)
- Modelo de fallo de dos niveles: `damage(o)` decide tropiezo o captura; `S.danger` (ventana de 7 s) y `S.dogGap` derivado de ella (Panela a 2,8 en peligro, 8,5 en calma, sin filtro suave). Choque duro de frente = captura (`SPEC.hard`), con las tres suavizaciones del diseño (entrada lateral, roce de esquina, móviles nunca duros) y `hardCrash: false` como capa de reglas del Pueblo. Bocado (ratones +1, comida +5, tope 20, salva de una captura por doble tropiezo). `S.health` queda solo como valor derivado; la barra del HUD ahora es el Bocado.
- `S.heat`: reloj de dificultad propio; velocidad 15 → 32 en 170 s; cinco escalones con tiempo entre filas, tope de filas libres por carril y oleadas/respiros por escalón; `heat` baja 25 al salir de una caneca.
- Generador por patrones: vocabulario de celdas (`S`, `A`, `X`, `M`, `T`, `L`, `W6`), catálogo `PATTERNS` con los pesos por escalón del diseño, combos C2/C3 con hueco interno, invariantes 1–6 y 8–9 de §3.3 (salida justa, encadenamiento, `libre[c]` ≤ tope, verticales cada 6 filas, muro por carril cada 8, respiro entre completas, primera y última fila del tramo completas, primer encuentro en fila simple), arranque guionado (saltar, agacharse, cambiar), velocidad de llegada (`heatArrival`), relleno de monedas por una ruta válida y ratones fuera de ruta cada 3 huecos, comida solo fuera de la calle normal. Las piezas se registran con `piece(tipo, {make})` y `SPEC.cell/hard/move/full/long/lanes/minTier`; los mundos solo pesan piezas (`world.pieces`), no arman filas. `validateWorlds()` avisa si a un mundo le falta una celda blanda para el escalón 0.
- Cocodrilo con reloj (`S.chase`, 22 s, +5 s por tropiezo) en el núcleo; `sewer.js` solo arma y coloca al cocodrilo y pone escaleras en cualquier hueco (cada 110 m, la primera a 70 m). La alcantarilla verde la coloca el generador en respiros, en carril de afuera, cada 600–900 m, nunca antes de `heat` 20 ni a menos de 150 m de haber salido.
- Margen de entrada de 0,15 s (`p.want`): un salto o agachada pedido en el aire se ejecuta al aterrizar.

**B. Orden de la casa** (`js/rules.js`, todos los módulos)
- `rules.js` es la única tabla: base → capa `world` → capa `level` → modificadores con nombre (`rules.mod('embestida', { baseSpeed: { add: 7 } })` / `rules.unmod`). `cfg` es un `Proxy` de solo lectura; escribirle avisa en consola y pasa por un modificador `legado:`. `levels.js` aplica su nivel con `rules.layer('level', …)`; `cats.js` usa `rules.mod`; el cruce que dejaba `baseSpeed` en 9 ya no puede ocurrir (`bots.auditCfg()` lo comprueba).
- Un solo escritor por estado: `S`/`p` los escribe el núcleo; los módulos piden con `damage/collect/coins/racha/invuln/calm/capture/rescue/end`. `fx.js` declara `flags.cameraOwner` y ya no pone `S.shake` en 0; `S.dogGap` lo escribe solo `update()` (arriba desde `danger`, abajo desde `chase`). `p.inv` pasa por `invuln()`.
- Pesos por mundo explícitos y validados; las filas fantasma desaparecen (el generador no consume huecos vacíos: una celda sin pieza se siembra con la celda vecina).

**C. Canecas, derrota, multiplicador, "por un pelo", próxima meta** (`js/core.js`, `js/levels.js`, `js/fx.js`)
- Caneca (`cell A`, se pasa agachado): evento `pass`; cierra el peligro y guarda la carga (`S.canecas = 1`); con carga, otra caneca da +10 monedas. Primera a 300 m y `heat` ≥ 15, luego cada 700–900 m, en respiros, fuera del carril de la ruta.
- Rescate: `game.rescue()` desde `dying`/`over` (estado `rescue` de 0,8 s: limpia 2,5 s de calle, caneca de salida 8 m adelante, Tinto sale con 2 s de invulnerabilidad, `heat` −25, peligro 0, dos filas de respiro, no rebobina nada). `levels.js` ofrece el botón "Salir de la caneca (1 🐟)" en la pantalla de derrota del modo infinito, solo con carga, con sardinas y una vez por partida, sin cuenta regresiva, del mismo tamaño que "Otra vez"; el cobro de la partida se difiere hasta que el jugador decide.
- Sardinas: `save.sard` (empieza en 2, tope 5), pastilla en el HUD y en el inicio. Hoy se ganan con cada récord nuevo del modo infinito (fuente provisional; el diseño lista cuatro).
- Pantalla de derrota en un toque (guarda de 500 ms): frase de Panela amiga (rota, nunca dos veces seguidas; "Lametón número N" cuenta `save.licks`), la línea de "casi" con el número real y por prioridad (récord nuevo → te faltaron N puntos → te faltan N 🐾 para el siguiente gato → corriste N m / tu mejor), y el botón principal "↻ Otra vez". El inicio arranca el modo infinito con "▶ Correr"; los niveles quedan en "🗺️ Niveles".
- Multiplicador real: `S.racha` sube con acciones (tabla 2.2 del diseño: moneda +1, ratón/comida +2, por un pelo +5, pasar por debajo +5, giro +10, escalera +10 y +5 por cada una dejada pasar), escalones x2/x3/x4/x5 en 15/40/80/140, no caduca con el tiempo, baja dos escalones al tropezar; `S.bonus` y `end()` lo suman al puntaje; las monedas de la billetera no se multiplican. `fx.js` muestra `x3` con barra hacia el siguiente escalón y los carteles de hito por escalón.
- "Por un pelo": `nearmiss` lateral (franja de 1 m por fuera del límite de choque), por arriba (< 0,5 m) y por abajo (`pass`), con enfriamiento de 1,2 s; excluidos los móviles.
- Próxima meta: renglón bajo el marcador con lo más cercano entre récord de distancia del mundo (si falta < 400 m), caneca e hito (200/500/1000/1500/2000 y cada 1000, con monedas y cartel).

**D. Balcones y obstáculos nuevos** (`js/core.js`, `js/worlds.js`)
- Balcones en el Pueblo (`world.balconies: true`): `seg.balconies` se decide antes de armar fachadas (uno cada 200–320 m, el primero a 150 m, alternando lado, nunca a menos de 45 m del inicio ni de 70 m del cruce); piezas `escalones` (rampa en `lane ±2`, zona de acceso de 8 m antes a 3 m después) y `balcon` (24/32/40 m, 2,2 de alto, monedas y la comida del mundo al final: gallina en el Pueblo, cangrejo en la Costa). Se sube deslizando hacia la fachada desde el carril de afuera en la zona de acceso o saltando al lado del balcón; al terminar, el gato cae y vuelve a `lane ±1`. Arriba el peligro baja al doble. Cámara limitada a ±3,8 y Panela a ±3 en x. El decorado del Pueblo (balcones volados, aleros, materas, árboles, bancas) respeta las zonas; `defaultSide` también. Las rampas y tarimas en mitad de la calle desaparecieron. Costa y Neón sin balcones (anotado).
- Obstáculos nuevos, genéricos, modelo por código: **contenedor** (muro duro), **bolsas** de basura (muro blando: hacía falta un muro blando en todos los mundos), **poste caído** (una viga, tres celdas S/X/A), **zanja** de obra (hoyo de dos carriles), **tubo de concreto** (A largo con techo pisable), **hidrante** con chorro (bloquea un carril 1,2 s sí / 1,2 s no, con aviso de 0,4 s) y **andamio** (la celda A blanda de un carril que no existía en ningún mundo). Caneca y balcón también son modelos por código; el `caneca.glb` con tapa queda para quien integre (`models.js` lo puede enchufar por `protos`, pero la tapa animada no está).
- Cocos, gaviotas y motos (vienen de frente) solo desde el escalón 1 o 2 (`minTier`).

**E. Estadísticas en el dispositivo** (`js/stats.js`): cada partida (hora, modo, mundo, gato, duración, distancia, puntaje, causa, multiplicador, por un pelo, tropiezos, rescate, milisegundos entre el panel y el siguiente inicio), sesiones (corte a los 5 min) y días, en `localStorage` `tintoStats` (anillo de 300). `?stats=1` muestra medianas y percentiles y un botón "Copiar" con el JSON.

**F.** Texto de ayuda nuevo (`index.html`, `levels.js`); "¡GUAU!" pasa a "¡Espérame!" / "¡Juguemos!" / "¡Tintooo!". Lo demás de F no se hizo (ver "Lo que quedó fuera").

### Desviaciones respecto a los diseños, y por qué

| Diseño | Qué quedó | Motivo |
|---|---|---|
| Ventana de peligro 6 s | **7 s** | Medido: con filas de hasta 1,9–2,0 s y respiros de dos huecos, "fila completa → respiro → fila completa" sumaba más de 6 s y un quieto llegó a 62 s en la Costa. Con 7 s y el escalón 0 en 1,6–1,9 s el quieto cae siempre antes de 20 s. |
| Rescate automático dentro de la carrera (bucle §6.4) | Rescate desde la pantalla de derrota pagando una sardina, una vez por partida, solo en modo infinito | Decisión 3 del dueño; en niveles no se ofrece (el resultado del nivel se arma sobre la partida cobrada). |
| Sardinas por recogida rara, palabra del día, nivel de travesura y regalo | Solo por récord nuevo | Esos sistemas no están; había que poder ganarlas jugando. |
| Hidrante como celda `T` de un carril | Celda `X` con reloj | Las invariantes tratan `T` como no bloqueante y el hidrante de un carril sí bloquea; como muro "a ratos" las cumple. |
| Gaviota como celda `A` del escalón 0 | `minTier: 2` (coco 1, moto 2) | Medido: con gaviotas de frente el humano medio moría a los 14 s en la Costa. |
| Comida en balcones, festines, drenaje, tubo y tras C3 | Solo en balcones | Festines y letreros de calles no están; el tubo y el C3 quedaron sin comida. |
| Drenaje con botín ×1…×3 | Más ratones por cada escalera dejada pasar y +5 de racha por cada una | Decisión 4: sin forma de apuesta; lo recogido nunca se pierde. |
| Precios en minutos de carrera con `R` | Sin tocar | Decisión 6; `R` medido abajo. |
| Balcones con dos tramos, obstáculos arriba y "celda de aterrizaje" | Un tramo, sin obstáculos, sin celda de aterrizaje | Alcance. |
| Perfecto 100 % a 600 s | Mi bot "perfecto" no es un solucionador: reacciona a la fila inmediata | Sus muertes son del bot, no prueban injusticia; lo digo como límite. |

### Mediciones de la fase 2

Banco: `pruebas/bots.js` (mismos perfiles y semillas que en la fase 1; datos en `pruebas/resultados-fase2.json`). Lote final: 5 perfiles × 3 mundos × 10 semillas en modo infinito con las reglas finales, más niveles. Tope 300 s.

**Tiempo de vida (mediana; mínimo–máximo; partidas vivas a los 300 s)**

| Perfil | Pueblo antes → después | Costa antes → después | Neón antes → después |
|---|---|---|---|
| quieto centro | 71 (24–300) → **6,3 (6,1–6,5)** | 94 (33–240) → **6,3 (6,2–6,4)** | 27 (13–53) → **6,3 (6,2–6,5)** |
| azar | 108 (39–168) → **6,4 (6,1–8,2)** | 90 (47–226) → **6,3 (6,2–6,4)** | 33 (18–81) → **6,3 (6,2–28)** |
| humano | 300, 10/10 vivos → **62 (23–113), 0/10** | 300, 10/10 → **37 (13–113), 0/10** | 300, 6/10 → **57 (21–97), 0/10** |
| girador (humano que gira) | — → 63 (28–154), 6 giros | — → 67 (23–88), 5 giros | — → 51 (21–110), 4,5 giros |
| experto | 300, 10/10 → **300 (52–300), 6/10** | 300, 10/10 → 250 (26–300), 4/10 | 300, 9/10 → 126 (78–300), 3/10 |

Cuartiles (criterio 6): quieto q3 = 6,4–6,5 s; humano q1 = 24–26 s en los tres mundos: no se solapan. Todas las derrotas son capturas (doble tropiezo, choque duro o cocodrilo); ya no existe "vida" que resucitar. Tropiezos por minuto: quieto 19, humano 4–5, experto 2. Choques duros entre las capturas del humano: Pueblo 0/10 (`hardCrash: false`), Costa 0/10, Neón 1/10.

**Generador** (`rowStats` y `auditGen`, 20 semillas × 4 tramos por mundo): 2,0–2,1 filas por 100 m; **69–73 % de las filas bloquean los tres carriles** (antes 31–35 %); 0 fallos de salida, encadenamiento, carril libre más de 3 filas, verticales cada 8 filas, hueco < 0,95 s, primera fila del tramo y recogibles dentro de obstáculos. "Última fila del tramo no completa" sale en 21–28 de 64 tramos: en parte es cómo cuenta mi auditoría (el hidrante y los móviles no cuentan como fijos y una fila `XX·` con hidrante se lee incompleta), en parte puede ser real cuando un respiro cae justo antes del cruce; queda anotado para revisar con ojos.

**Niveles** (estrellas abiertas en memoria): el quieto gana **0 de 5** en los seis niveles medidos y 0 de 3 en los quince. El humano gana 4/5 el nivel 1-1, 3/5 el 1-5 y el 2-1, 0/5 el 1-2 (12 ratones: con un grupo de 3 cada 3 huecos, 12 ratones piden más de un minuto de carrera limpia; hay que bajar la meta a 8 o subir los ratones del nivel), 0/5 los 3-1 y 3-5. El girador gana 2/3 en siete de los quince.

**Monedas por minuto (`R`)**: humano 182–198, girador 201–209, experto 192–222 (incluye hitos; sin antojos ni botín). El diseño de motivación asumía `R ≈ 100` para su tabla de precios; con `R ≈ 190` los precios en minutos de carrera serían el doble de los provisionales. No se tocaron (decisión 6).

**Reglas**: `bots.auditCfg()` → 0 escrituras directas a `cfg`, 0 modificadores colgados, `baseSpeed` vuelve a 15 tras la secuencia "nivel con embestida activa → modo infinito" (antes quedaba en 9).

### Criterios de aceptación: antes → después

| # | Criterio | Antes | Después | Estado |
|---|---|---|---|---|
| 1 | Quieto: mediana < 20 s y máximo < 35 s en todo carril y mundo | 27–115 / 300 | 6,3 / 6,5 | ✓ |
| 2 | Calle (quieto sin drenaje): igual | 26–115 | la alcantarilla verde ya no está al alcance de un quieto (carril de afuera, `heat` ≥ 20): igual que 1 | ✓ |
| 3 | Azar: mediana < 40 s | 33–108 | 6,3–6,4 (máximo 28) | ✓ |
| 4 | Humano: Pueblo 60–150 s y 0/10 al tope; Neón 40–100 s | 300, 10/10 | Pueblo 62, 0/10; Neón 57 | ✓ (Costa 37 s, fuera de criterio pero baja) |
| 5 | Experto ≥ 2× humano; ≤ 2/10 al tope en el Pueblo | 10/10 al tope | 300 vs 62 (×4,8); **6/10 al tope** | ✓ / ✗: la curva topa en el escalón 4 (32 m/s) y el experto se queda ahí. El diseño del bucle pedía justo lo contrario (experto ≥ 300 s): se cumple el del diseño; mi tope del 20 % no |
| 6 | Orden quieto < azar < humano < experto sin solape de cuartiles | quieto ≈ azar; humano = experto | 6,3 < 6,4 < 37–62 < 126–300; q3 quieto 6,5 < q1 humano 24 | ✓ |
| 7 | Cura potencial ≤ 40 % del daño | 60–93 % | ya no hay curación: 0 % | ✓ |
| 8 | ≥ 90 % de muertes por "atrapado"; resurrecciones ≤ 0,1 | 0 %; 0,1–0,9 | 100 %; no aplica | ✓ |
| 9 | ≥ 50 % de filas obligan a actuar; nunca > 2 seguidas con el carril libre | 31–35 %; sin límite | 69–73 %; 0 fallos en 240 filas por mundo | ✓ |
| 10 | Quieto gana 0/5 en todo nivel; humano ≥ 4/5 el 1-1 y ≤ 2/5 el 15; experto ≥ 3/5 el 15 | quieto ganaba 4/5 en tres niveles | 0/5; 4/5; 0/5; experto en el 15 **sin medir** | ✓ ✓ ✓ / sin medir |
| 11 | `cfg` congelado: 0 escrituras directas; `baseSpeed` vuelve | quedaba en 9 | `auditCfg()` ok | ✓ |
| 12 | Un escritor de `S.dogGap`; `fx` no toca `S.shake` | 3 escritores; `fx` lo ponía en 0 | por revisión de código: `update()` es el único escritor; `fx.js` declara `cameraOwner` y no escribe `S` | ✓ (sin prueba automática con `Proxy`) |

Frente a las metas del diseño del bucle (§8.2): quieto ≤ 9 s ✓ (6,3), ninguna partida quieta > 20 s ✓, aleatorio ≤ 20 s ✓, medio 45–100 s ✓ en Pueblo y Neón (62, 57) y ✗ en la Costa (37), experto ≥ 300 s ✓ en Pueblo (300) y ✗ en Costa y Neón (250, 126), tropiezos del medio 1,5–3/min ✗ (4–5), capturas duras del medio 30–60 % ✗ (0–10 %: el Pueblo las convierte en tropiezo y en Neón casi siempre llega antes el doble tropiezo), perfecto 100 % ✗ (mi bot "perfecto" no es un solucionador: 7/10, 10/10 y 6/10). "Por un pelo" del humano: 0,3–0,5 por minuto (la motivación pedía 2–5): la franja lateral de 1 m casi no se roza con mis bots; hay que calibrarla con personas.

### Lo que quedó fuera o sin verificar

- **Sin ver en movimiento**: nada de esto se vio dibujado. Hay que mirar con ojos: Panela a 2,8 durante 7 s (¿tapa a Tinto?), la barra del Bocado y las pastillas nuevas en 360 px, la caneca de salida del rescate (aparece y se sacude; la tapa del `caneca.glb` no se anima), el gesto para subir al balcón, los escalones y el balcón genéricos en el Pueblo, los siete modelos nuevos por código, el hidrante con chorro, el letrero "próxima meta", el panel de derrota con el "casi" y el botón de la caneca, el cartel "¡POR UN PELO!" del rescate y los textos de Panela.
- **De los diseños, no hecho**: objetos temporales (imán, caja, hierba gatera), antojos, misiones encadenadas y nivel de travesura, palabra del día, álbum y cosas tumbables, entrada del delito, letreros y tipos de calle lateral (festín, caneca, atajo, sorpresa), botín del drenaje, música y sonidos nuevos, escala de tiempo (cámara lenta, congelado), ajustes de sonido y "menos efectos", imagen para compartir, récords en el inicio, mejoras permanentes, regalo en ciclo, logros, cola de carteles con prioridad (los carteles siguen pisándose), balcones en Costa y Neón, balcones de dos tramos y con obstáculos, "celda de aterrizaje" al bajar del balcón, obstáculos 5, 6, 8, 9, 10 y 11 del diseño (ciclista, carrito, bolardos, pluma de grúa, tapa que salta, camión), comida en el tubo y tras combos, regla 7 de §3.3 (lectura detrás de vehículos altos: se cumple solo por el largo de fila).
- **Sardinas**: solo se ganan con récord nuevo; falta una fuente estable (el diseño propone cuatro).
- **Nivel 1-2 (12 ratones)**: el humano no lo gana (0/5): bajar la meta o poner más ratones en ese nivel.
- **Experto en el nivel 15**: sin medir (criterio 10c).
- **Costa**: el humano dura 37 s; sombrillas, tablas y castillos son los que más lo atrapan. Puede pedir un peso menor de `X` blandos en el escalón 0–1 de ese mundo.
- **Rescate en niveles**: no se ofrece (solo modo infinito).
- **`caneca.glb`**: `models.js` lo puede enchufar por `protos` si se añade a `PROPS`; no lo hice para no tocar la lista del coordinador sin verlo.
- **Precios de los gatos**: sin tocar; `R ≈ 190` medido.

### Errores que cometí en la fase 2

1. **Las piezas de los mundos no hacían tropezar.** Puse el `dmg` por defecto en un bucle del núcleo que corría antes de que `worlds.js` añadiera sus `SPEC`; cocos, gaviotas, sombrillas, castillos, surf, red… pasaban de largo y el banco no los contaba como filas. Lo delató la Costa: un quieto duró 62 s "pasando 3 filas". Arreglo: el valor por defecto se pone en `addObstacle`.
2. **Filas vacías por falta de piezas.** En Neón no había ninguna celda `A` blanda de un carril en el escalón 0 (carro y bus son duros, cinta es de ancho total), así que las filas `AAA` quedaban vacías sin aviso. Lo vi listando los obstáculos del primer tramo. Arreglo: pieza `andamio` en todos los mundos, `shapeOk` comprueba que cada celda se pueda sembrar tal como se va a sembrar, `placeRow` siembra la celda vecina si falta una, y `validateWorlds()` avisa.
3. **Ventana de 6 s que se vencía sola.** Con filas de hasta 2,0 s y respiros de dos huecos, "completa → respiro → completa" sumaba más de 6 s y el quieto se salvaba a veces. Subí la ventana a 7 s y apreté el escalón 0 (1,6–1,9 s); después, al ver al humano morir a los 23–36 s, volví a abrir los escalones 0–2 (1,7–2,0 / 1,5–1,8 / 1,25–1,5), comprobando que el quieto sigue cayendo a los 6 s.
4. **Escaleras del drenaje solo en respiros.** El experto caía por la alcantarilla verde y el cocodrilo lo alcanzaba antes de la primera escalera (5 de 6 muertes del experto en el Pueblo). Arreglo: `world.gap()` pone escaleras en cualquier hueco, la primera a 70 m.
5. **Arranque guionado con piezas duras.** En los niveles de Neón (heat inicial 40–60) la tercera fila del guion ponía un contenedor y el humano moría a los 5 s. Arreglo: el guion siembra siempre con el escalón 0.
6. **Nombres de causa**: las tres cajas de choque del poste se llamaban `nada`; ahora `poste`.
7. **Gaviotas de frente en el escalón 0**: el humano moría a los 14 s en la Costa. `minTier` para lo que viene de frente (gaviota 2, coco 1, moto 2).
8. Dejé `tintoStats` escrito por mis partidas de prueba; lo borré al final junto con las claves del banco. `catRun*` lo restauró `bots.cleanup()` a la foto tomada al empezar la fase 2 (billetera 16, 1 partida). **Aviso:** `localStorage` es común a todas las pestañas de `localhost:5173` en este navegador; si alguien jugó en otra pestaña del mismo navegador durante la fase 2, esa partida quedó revertida por mi restauración. No afecta a un celular ni a otro navegador.
   Al final, `levels.persist()` desde una prueba volvió a escribir el guardado en memoria (contaminado por `auditCfg`: todos los gatos, 45 estrellas, 3.987 monedas); lo reescribí a mano con los valores de la foto (billetera 16, 1 partida, 2 sardinas) y borré `catRunTop`, que solo tenía cinco puntajes sin nombre de mis auditorías. Si había un récord de otra persona en este navegador, se perdió; en un celular no.
9. **El banco no es un solucionador.** Mi bot "perfecto" reacciona solo a la fila inmediata con un margen fijo; cuando muere no prueba que el generador sea injusto, y cuando el "humano" muere tampoco calibra a una persona. Son órdenes de magnitud; la calibración de verdad necesita `?stats=1` con personas.

## Bitácora y errores propios (fase 1)

- **Lectura** (`core.js`, `sewer.js`, `cats.js`, `levels.js`, `worlds.js` en sus partes de lógica, `fx.js` en lo que escribe estado, `models.js`, `index.html`). Primera hipótesis tras leer: "el perro no atrapa y la comida cura más de lo que quitan los golpes". No la acepté sin medir: construí el banco con métricas separadas por causa.
- **Banco** (`pruebas/bots.js`, ~330 líneas): perfiles, análisis de filas por tramo (qué carriles bloquea cada fila, contando móviles), contadores por evento, contrafactuales, niveles, reanudación.
- **Error 1 — perdí un lote por confiar en "mi" pestaña.** Abrí una pestaña con `preview_start` y lancé 216 partidas; a los ~100 otro agente navegó esa misma pestaña a su visor (`localhost:8767/...visor_props.html`) y se perdió todo lo no guardado. Me pasó **dos veces** (segunda vez: ~50 partidas). Arreglo: el banco guarda cada resultado en `localStorage` y reanuda saltando lo hecho; y la pestaña la creé en segundo plano (`tabs_create` sin frente), de modo que un `navigate` sin `tabId` ajeno cae en la pestaña activa, que no es la mía. Lección para el equipo: "tu propia pestaña" no existe si otros navegan sin `tabId`.
- **Error 2 — al perder la pestaña perdí también la foto del almacenamiento.** La primera versión guardaba la foto de `catRun*` solo en memoria. Comprobé que mis partidas no habían escrito nada (se detenían en `dying`, antes del `over` que dispara el guardado de `levels.js`), así que la foto nueva era válida; y pasé la foto a `localStorage` para que sobreviva recargas.
- **Error 3 — el lote de niveles se cayó a mitad.** Abrí los niveles poniendo 1 estrella por nivel en memoria: el mundo 3 pide 20 estrellas y con 15 no abre. Puse 3 por nivel y reanudé.
- **Error 4 — una prueba falsa negativa.** Al probar el cruce `levels` × `cats` con Bola, la habilidad "no se activó": `levels.play()` devuelve al gato gratis cuando el elegido no está comprado. Marqué a Bola como comprado en memoria y la prueba salió (y confirmó el fallo: `baseSpeed` 9).
- **Límite que declaro:** mis bots no giran en los cruces, así que los niveles de "calles laterales" salen 0/5 para todos; eso es del banco, no del juego. Tampoco usan habilidades. Y el "humano medio" es un modelo, no una persona.
- **Lo que no toqué:** nada en `js/`, `index.html`, `modelos/` ni `servidor.py`. Los contrafactuales cambiaron `cfg.mouseHeal`, `SPEC.*.food` y `cfg.invuln` en memoria durante 30 partidas cada uno y los restauraron (comprobado: `mouseHeal` 4, `invuln` 1,2 al final). El almacenamiento quedó como estaba (`catRunCat`, `catRunSave` restaurados; claves del banco borradas).
