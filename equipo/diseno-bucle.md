# Tinto — diseño del bucle central y la dificultad

Especificación para el agente Lógica. Autor: diseñador del bucle (no tocó código). Fecha: 8 de octubre de 2026.
Habla en los términos de `js/core.js` (`cfg`, `S`, `p`, `SPEC`, `ROWS`, `populate`, `defaultFill`, `damage`, `collect`, `update`, `floorAt`, `enterSub`).

Marcas usadas en todo el documento:
- **[E]** evidencia externa, con fuente en la sección 13.
- **[M]** medido por mí en este repositorio (simulación con `game.step`, sin dibujar).
- **[C]** criterio mío: es una propuesta razonada, no un dato. Todo número [C] debe quedar en `cfg` para poder afinarlo con el banco de bots.

---

## 0. Resumen de decisiones

1. **Se acaba la barra de vida como condición de derrota.** Entra el modelo clásico de dos niveles: *tropiezo* (Panela se pega 6 s; otro tropiezo en esa ventana es captura) y *choque duro* (captura inmediata).
2. **Lo que mide el peligro es la distancia de Panela**, que ya está en pantalla porque la cámara va detrás de ella. No hay número de vida que regenerar.
3. **Ratones y comida dejan de curar.** Llenan un *Bocado*: una presa que Tinto suelta para que Panela se distraiga y que salva de UNA captura por doble tropiezo (no de un choque duro).
4. **El generador deja de tirar filas al azar** y pasa a una gramática de patrones con tres invariantes: toda fila tiene salida justa, ningún carril pasa más de 2 filas seguidas sin exigir acción, y los tres verbos (cambiar, saltar, agacharse) son obligatorios cada pocas filas.
5. **El espaciado se define en tiempo, no en metros:** de 1,7–2,0 s entre filas al empezar a 0,95–1,15 s en el tope. En metros da siempre unos 27–35 m.
6. **La dificultad la lleva un reloj propio, `S.heat`**, separado de `S.time`: sube con el tiempo de carrera y baja al usar una caneca. Velocidad 15 → 32 m/s en 170 s; cinco escalones de patrones.
7. **Oleadas y respiros:** 6–9 filas de presión y luego 2 filas libres con premio. Un respiro siempre va entre dos filas completas.
8. **Balcones en vez de rampas en mitad de la calle:** corredores elevados pegados a las fachadas, en un cuarto y quinto carril (`lane = ±2`, x = ±6) a 2,2 de altura. Se sube por escalones en el andén deslizando hacia la fachada; arriba hay comida y monedas; se baja solo al terminar.
9. **Once obstáculos nuevos**, priorizados, todos de obra y calle genéricos (contenedor, poste caído, zanja, tubo de concreto, ciclista, carrito que cruza…).
10. **Canecas:** una caneca volcada por la que se pasa agachado. Hace dos cosas: si Panela está encima, la despista ya; y guarda una carga de rescate. Si después lo atrapan, Tinto sale de una caneca y la carrera sigue.
11. **El drenaje pasa a ser una apuesta con reloj:** sin Panela, mucho ratón, y un cocodrilo que se acerca; cada escalera que se deja pasar sube el premio. También sirve de escape cuando Panela está encima.
12. **Las calles laterales se anuncian:** un letrero dice qué hay (festín, caneca, normal). Girar con Panela encima la hace derrapar y le quita 2 s a la ventana de peligro.
13. **Hoy un jugador quieto dura una mediana de 71 s y hasta 3,5 min [M].** Con este diseño debe caer siempre antes de 15 s; el aleatorio, antes de 20 s de mediana; el medio, 45–100 s; el experto, más de 5 min.
14. **Orden:** primero modelo de fallo y generador (arreglan la queja del dueño), luego canecas, luego balcones, luego obstáculos nuevos, drenaje y calles.
15. **Nada de esto usa azar con premio, cuentas regresivas de compra ni presión para pagar.** El público puede incluir menores.

---

## 1. Diagnóstico: por qué hoy se sobrevive sin jugar

### 1.1 Lo que medí [M]

Banco rápido en el navegador integrado: `game.setWorld(w); game.start();` y `game.step(1/60, false)` hasta que termina la partida. *Quieto* = ninguna orden. *Aleatorio* = una orden al azar (izquierda, derecha, saltar, agacharse) cada 0,6 s. Modo infinito, `cfg` de fábrica, gato por defecto. Son 8–10 partidas por celda: sirven de línea base, no de estadística fina.

| Mundo | Bot | Mediana | Mínimo | Máximo | Golpes/min |
|---|---|---|---|---|---|
| Pueblo Viejo | quieto | 71 s | 35 s | 213 s | 12,9 |
| Pueblo Viejo | aleatorio | 107 s | 36 s | 275 s | 11,0 |
| La Costa | quieto | 54 s | 28 s | 152 s | 14,3 |
| Ciudad Neón | quieto | 26 s | 16 s | 56 s | 14,6 |
| Pueblo, con el `cfg` del nivel 1-1 (13 / .08 / 20 / [30,38]) | quieto | **150 s** | 39 s | **291 s** | 7,3 |

El caso del dueño ("tres minutos sin tocar nada") se reproduce: con el `cfg` del primer nivel el gato quieto llega a casi cinco minutos. Además, entre 2 y 4 de cada 8–10 partidas quietas terminan dentro del drenaje: el gato cae solo por la alcantarilla verde.

### 1.2 Por qué pasa (leído en el código)

1. **La vida se regenera más rápido de lo que se pierde.** `collect()` suma `cfg.mouseHeal` (4) por ratón y `o.food` (6–10) por gallina, cangrejo o pescado. En el Pueblo la fila `gallinas` pesa 16 de ~129 y pone comida en 2 o 3 carriles: es una fila que cura a quien no hace nada.
2. **Las filas dejan carriles libres al azar.** `ROWS` baraja los carriles y bloquea 1 o 2; nadie lleva la cuenta de cuánto tiempo lleva libre cada carril. Solo la `cinta` (peso 6) y la `valla` de tres carriles obligan a todos.
3. **Un golpe solo quita 15–30 de 100** y da 1,2 s de invulnerabilidad. A 13 golpes por minuto y con curación automática, el saldo queda cerca de cero.
4. **Alrededor de cada cruce hay 70 m sin nada** (`populate` empieza en `s = 34` y para en `seg.L - 36`).
5. **La fila `libre` y la fila `tarima`** (que solo bloquea un carril y regala un pescado) suman descanso gratuito.

Conclusión: no es un problema de velocidad ni de densidad (el espaciado actual, 1,5–2,0 s entre filas al empezar y ~0,9 s al tope, está en un rango razonable). Es un problema de **modelo de fallo** y de **patrones**. Subir la velocidad o bajar `rowGap` no lo arregla.

---

## 2. Modelo de fallo

### 2.1 Decisión

**Modelo clásico de dos niveles, sin barra de vida.**

Por qué:
- **[E]** Es el contrato del género. En Subway Surfers un roce lateral contra un tren es un tropiezo: el inspector aparece en pantalla y gana terreno; si el jugador vuelve a tropezar mientras el inspector está en pantalla, o choca de frente, lo atrapan. Cuando el inspector se va de pantalla, se puede volver a tropezar sin que atrape. En Temple Run es igual: la mayoría de los obstáculos frenan en seco y los monos atrapan; algunos solo hacen tropezar y acercan a los monos, y otro tropiezo en ese momento es el final. (Fuentes 1–5.)
- **[E]** La alternativa conocida es la de Sonic Dash: los anillos son el colchón, un golpe los quita y un golpe sin anillos termina la carrera (fuente 6). Es el único de los referentes con algo parecido a "vida", y aun así no se regenera sola.
- **[C]** La cámara de Tinto va detrás de Panela. La distancia entre las dos ya es un medidor de peligro enorme y siempre visible. Una barra 0–100 encima es un segundo medidor que dice lo mismo, se lee peor y fue justamente lo que permitió sobrevivir sin jugar.
- **[C]** El modelo de dos niveles hace legible la causa de cada derrota ("me estrellé con el bus", "tropecé dos veces seguidas"), que es lo que hace que el jugador quiera reintentar en vez de sentirse estafado.

### 2.2 Estados y variables

Variables nuevas (en `S`): `danger` (segundos de ventana de peligro que quedan, 0 = en calma), `bocado` (0–20, medidor), `bocados` (0 o 1 llevado), `canecas` (0 o 1 carga de rescate), `heat` (reloj de dificultad, sección 3.6).
Ajustes nuevos (en `cfg`): `dangerTime: 6`, `dangerGap: 2.8`, `dangerFade: 2.5`, `hardCrash: true`, `invuln: 1.0` (hoy 1.2), `bocadoMax: 20`, `inputBuffer: 0.15`.

| Estado | Condición | Distancia de Panela (`S.dogGap`) | Señales |
|---|---|---|---|
| Calma | `S.danger == 0` | `cfg.gapMax` (8,5) | ninguna |
| Peligro | `S.danger > 0` | 2,8 mientras `danger > 2,5`; de 2,8 a 8,5 de forma lineal en los últimos 2,5 s | ladridos, jadeo, cámara más alta (ya existe), viñeta roja suave, anillo que se vacía junto a Tinto |
| Captura | segundo tropiezo en peligro, o choque duro | cae a 0,5 (animación `dying` actual) | "¡LAMETÓN!" |

Regla clave: **lo que se ve es lo que cuenta.** `S.dogGap` se calcula directamente de `S.danger` (no con el filtro suave actual), de modo que cuando Panela vuelve a su sitio el peligro terminó de verdad. Fórmula:

```
gap = danger > dangerFade ? dangerGap
    : dangerGap + (gapMax - dangerGap) * (1 - danger / dangerFade)
```

De dónde sale `dangerTime = 6` **[C]**: tiene que ser mayor que el peor tiempo entre dos acciones obligadas en un mismo carril (3 filas × 1,6 s + 0,46 s que cuesta el frenazo del golpe = 5,3 s; ver 3.3), para que un jugador quieto no pueda "esperar a que pase". Y no mucho mayor, para que un jugador que tropieza una vez tenga una salida real: 6 s son 3–4 filas al empezar y 5–6 al tope.

### 2.3 Clases de golpe

Cada obstáculo es **blando** o **duro**. Regla práctica: lo que hoy tiene `fly: true` (sale volando) es blando; lo macizo es duro. Se marca con un campo nuevo `SPEC[tipo].hard = true`.

| Clase | Qué pasa al chocar | Tipos |
|---|---|---|
| Blando | **Tropiezo** | valla, caja, basura, cinta, señora, burro, balón, pelota, tendedero, red, coco, sombrilla, tabla de surf, castillo, gaviota, dron, barrera, láser, charco, y todo el drenaje (cocodrilo, tubo, barril) |
| Hoyo | **Tropiezo** con caída de 0,5 s (`p.fall`, ya existe) | alcantarilla naranja, zanja (nueva) |
| Duro | **Choque**: captura inmediata | carro, bus, chiva, carreta, lancha, moto; nuevos: contenedor, camión |
| Entrada | no es golpe | alcantarilla verde (drenaje), escalones, caneca |

Tres reglas que suavizan el choque duro (las tres son justicia, no regalo):

1. **Entrada lateral = tropiezo, nunca choque** **[E]** (fuente 3: en Subway Surfers el golpe de costado contra un tren es tropiezo; el frontal, captura). En el motor: un golpe es *lateral* si en el cuadro anterior el gato ya estaba dentro del largo del obstáculo (`prevS >= o.s - o.hl`); es *frontal* si entró por la cara delantera. En un golpe lateral, además, el gato vuelve a su carril anterior (`p.lane = p.prevLane`; hay que guardar `prevLane` en `move()`).
2. **Roce de esquina = tropiezo** **[C]**. Si el golpe es frontal pero el solape lateral es menor de 0,5 m (`Math.abs(o.x - p.x) > o.hw - .1`), cuenta como tropiezo.
3. **Los obstáculos que se mueven de lado nunca son duros** **[C]** (señora, burro, dron, carrito, y el carro en zigzag mientras cambia de carril). Lo que se mueve de lado puede meterse encima sin culpa del jugador.

Además: `cfg.hardCrash = false` convierte todos los choques en tropiezos. Lo usa el escalón 0 (los primeros 20 s de cada carrera no tienen obstáculos duros) y pueden usarlo los primeros niveles.

### 2.4 Qué pasa exactamente en un tropiezo

Dentro de `damage(o)`, en este orden:

1. Corren los ganchos `hooks.damage` como hoy (si alguno devuelve `false`, no hay golpe).
2. Se decide `lethal = (o.hard && cfg.hardCrash && frontal) || S.danger > 0`.
3. **Si no es letal:** `S.danger = cfg.dangerTime`; `p.inv = cfg.invuln` (1,0 s); `p.slow = cfg.hitSlow` (0,45, igual que hoy: equivale a perder 0,46 s de avance); sacudida, sonido, "¡PUM!", `emit('hit', o)` y `emit('stumble', o)`.
4. **Si es letal por doble tropiezo y `S.bocados > 0`:** se gasta el Bocado (2.6) y no hay captura.
5. **Si es letal y `S.canecas > 0`:** rescate de caneca (sección 6.4).
6. **Si nada lo salva:** `S.state = 'dying'` como hoy, `emit('dying', { cause: o.type, hard })`. La causa viaja en el evento para que la pantalla final pueda decirla.

No se congelan los controles tras el tropiezo (Subway Surfers los congela un instante, fuente 3; aquí el frenazo ya castiga y la partida es más corta) **[C]**.

### 2.5 Cómo se recupera la distancia

- **Solo con tiempo corriendo limpio.** `S.danger` baja 1 por segundo en `update`.
- **Más rápido si el jugador hace algo que tenga sentido en la ficción** (todas son acciones, ninguna es pasiva):
  - sobre un balcón, `danger` baja al doble de velocidad (Panela lo pierde de vista) **[C]**;
  - al girar a una calle lateral, `danger -= 2` (Panela derrapa en la esquina) **[C]**;
  - al pasar por una caneca, `danger = 0`;
  - al salir del drenaje, `danger = 0` (ya hoy `exitSub` pone el perro lejos).
- **Nada que se recoja baja `danger`.** Es la regla que impide volver al problema de hoy.

### 2.6 Papel de la vida, los ratones y la comida

- **`S.health` deja de ser un recurso.** Se conserva la variable solo por compatibilidad con los módulos que la leen (`fx.js`, `cats.js`, `levels.js`): el núcleo la escribe como valor derivado, `health = 0` en captura, `100` en calma y `40 + 60 * (1 - danger / dangerTime)` en peligro. La barra del HUD se quita; en su lugar van el medidor de Bocado y el icono de caneca.
- **Ratones: puntos y Bocado.** Cada ratón suma 1 al medidor y sigue contando en `S.mice` y en el puntaje.
- **Comida (pescado, gallina, cangrejo): Bocado rápido.** Cada una suma 5. Por eso la comida vale la pena en los balcones, que es lo que pidió el dueño.
- **Bocado:** al llegar a `cfg.bocadoMax` (20), el medidor se vacía y `S.bocados = 1` (máximo 1 llevado; si ya lleva uno, el medidor se queda lleno y lo que se recoja de más da solo puntos). Tinto corre con la presa en la boca: se tiene que ver.
- **Para qué sirve:** cuando un segundo tropiezo iba a ser captura, Tinto suelta la presa, Panela frena a olerla, `S.danger = 0`, `p.inv = 1.5`, cartel "¡Se distrajo!". **No salva de un choque duro.** Encaja con la identidad aprobada: Panela no quiere morder a Tinto, se distrae con cualquier cosa.
- **Ritmo esperado [C]:** con un grupo de 3 ratones cada 3 huecos (3.8), un jugador que va por todos llena un Bocado cada ~30 s; un balcón (5 de la comida + monedas) o una visita al drenaje lo aceleran. Un gato quieto recoge como mucho 1 ratón cada ~4,5 s: necesitaría 90 s y lo atrapan antes de 15.

De dónde sale el diseño del Bocado: es el "colchón que se gana jugando" de Sonic Dash (fuente 6) con un tope de una unidad, para que nunca se acumule una reserva que permita dejar de jugar **[C]**.

---

## 3. Generación de obstáculos

### 3.1 Vocabulario

Una **fila** es lo que ocupa un mismo `s` en los tres carriles. Cada carril de la fila es una **celda**:

| Celda | Significa | Se resuelve | Ejemplos de hoy |
|---|---|---|---|
| `.` | libre | nada | — |
| `S` | bajo | **saltar** (`y1 ≤ 1,2`) | valla, caja, basura, castillo, coco, alcantarilla, cocodrilo |
| `A` | alto con hueco | **agacharse** (`y0 ≥ 0,55`) | carro, bus, chiva, cinta, tendedero, red, tubo, gaviota |
| `X` | muro | **cambiar de carril** | carreta, lancha, sombrilla, tabla de surf, barril, moto |
| `M` | móvil lateral | leer y esperar o esquivar | señora, burro, balón, dron, carro en zigzag |
| `T` | temporizado | pasar cuando abre | barrera, láser |

Una fila es **completa** (`W`) si no tiene ninguna celda `.` ni `M`. Solo las filas completas obligan a todos los carriles.
Las **salidas** de una fila son los carriles por los que se puede pasar con a lo sumo una acción vertical (todas las celdas menos las `X`).

Datos físicos del gato con el `cfg` actual **[M, calculado de `cfg`]**: salto de 0,68 s en el aire y 1,94 de altura máxima; por encima de 1,0 m está 0,47 s y por encima de 1,2 m, 0,42 s; la deslizada dura 0,85 s; un cambio de carril libra el obstáculo vecino en ~0,07 s (`laneSnap: 14`).

### 3.2 Catálogo de patrones

Las formas se dan salvo permutación de carriles. "Escalón" es el de la sección 3.6.

| ID | Forma | Completa | Cómo se pasa | Escalón mínimo |
|---|---|---|---|---|
| U1 | `S . .` / `A . .` / `X . .` | no | nada, o la acción | 0 |
| D1 | `X X .` | no | ir al carril libre | 0 |
| D2 | `S S .` / `A A .` / `S A .` | no | cambiar o actuar | 0 |
| D3 | `X S .` / `X A .` | no | cambiar o actuar | 1 |
| W1 | `S S S` | sí | saltar | 0 |
| W2 | `A A A` o una pieza de ancho total (cinta, tendedero, red) | sí | agacharse | 0 |
| W3 | `X X S` | sí | ir al carril y saltar | 1 |
| W4 | `X X A` | sí | ir al carril y agacharse | 1 |
| W5 | mezcla de `S` y `A` sin libres (`S A S`, `A S A`, `S S A`…) | sí | la acción del carril en que se esté | 1 |
| W6 | `X S A` (poste caído, 5.2) | sí | elegir carril y acción | 2 |
| L1 | celda larga (bus, chiva, tubo de concreto: `A` de 9 m) más otra celda | según el resto | deslizada completa | 1 |
| M1 | un móvil lateral más una celda fija | no | leer el vaivén | 2 |
| T1 | temporizado de ancho total (barrera, láser, bolardos) | sí | pasar cuando abre | 2 |
| C2 | dos filas pegadas (3.5) | — | dos acciones seguidas | 2 |
| C3 | tres filas pegadas | — | tres acciones seguidas | 3 |
| R | respiro: 2 filas libres con premio (3.7) | — | — | 0 |

### 3.3 Invariantes del generador (las reglas que no se rompen)

El generador mantiene, mientras llena un tramo, un contador por carril `libre[c]` = filas seguidas en que ese carril tuvo celda `.` o `M`.

1. **Salida justa.** Toda fila tiene al menos una salida. (No existe `X X X`.)
2. **Salida alcanzable.** Para cada salida `a` de la fila `i` existe una salida `b` de la fila `i+1` con `|a − b| ≤ 1`. En escalón 3 o más se permite `|a − b| = 2` solo si el hueco entre las dos filas es ≥ 1,25 × el tiempo de fila. (Con tres carriles, lo único que prohíbe es obligar a cruzar de un extremo al otro sin tiempo.)
3. **Ningún carril seguro.** `libre[c] ≤ 2` siempre. En escalón 2 o más, `libre[c] ≤ 1` fuera de los respiros. Cuando un carril llega al tope, la fila siguiente tiene que bloquearlo o ser completa.
4. **Los tres verbos.** En cualquier ventana de 6 filas hay al menos una fila completa de solo verticales (W1, W2 o W5): mata al que nunca salta ni se agacha. Y cada carril recibe una celda `X` al menos una vez cada 8 filas: mata al que se queda en un carril saltando y agachándose bien.
5. **Respiro entre paredes.** Un respiro `R` solo puede empezar después de una fila completa y siempre lo sigue una fila completa (3.7).
6. **Cruces.** La última fila antes de un cruce y la primera de cada tramo nuevo son completas. La última va en `s ≤ L − 20` y la primera en `s ≥ 20` (hoy 36 y 34): el tramo sin obstáculos alrededor del cruce baja de 70 m a 40 m.
7. **Lectura.** Detrás de un obstáculo alto y largo (bus, chiva, camión; `y1 > 3`) la siguiente celda del mismo carril va al menos a 1,2 s de distancia, para que no aparezca de golpe al salir de la sombra del vehículo **[C]**.
8. **Primer encuentro limpio.** La primera vez en la carrera que sale un tipo de obstáculo, sale solo en una fila U1 o como fila completa de un solo tipo, nunca dentro de un combo **[E]** (fuente 12: los peligros deben anunciarse y no ser injustos en el primer encuentro).
9. **Móviles y temporizados no cuentan como bloqueo** para la invariante 3 ni como salida garantizada para la 1: una fila con `M` o `T` debe tener además otra salida fija, salvo T1, cuyo ciclo debe dejar abierta la salida al menos 0,8 s seguidos.

Consecuencia que se puede demostrar: **un jugador que no toca nada es atrapado como mucho 3 filas después de su primer tropiezo** (su carril se bloquea a más tardar en la tercera fila, y 3 filas + frenazo = 5,3 s < 6 s de ventana). Con el arranque guionado de 3.6, la captura del jugador quieto llega entre los 5 y los 9 s de cada carrera.

### 3.4 Distancia de reacción

**[E]** El tiempo de reacción de elección (ver algo y escoger entre dos respuestas) está típicamente entre 350 y 450 ms en adultos, con 250 ms como piso práctico; cada alternativa más lo alarga (ley de Hick). Los niños son más lentos: en una prueba de vigilancia la mediana fue 544 ms a los 6 años y 326 ms a los 11 (fuentes 9–11). Una respuesta de foro de desarrolladores propone ventanas de ~800 ms para novatos y recomienda una curva escalonada u oscilante, no lineal (fuente 13; es opinión de un desarrollador, no un estudio).

**[C]** De ahí salen tres presupuestos:
- **Novato (escalón 0): 900 ms libres** entre terminar una acción y tener que decidir la siguiente.
- **Medio (escalones 1–2): 600 ms.**
- **Experto (escalones 3–4): 300 ms**, apoyado en que se puede decidir en el aire (cambiar de carril en salto ya funciona; agacharse en el aire ya hace caída rápida).
- **Piso absoluto:** tiempo de fila ≥ tiempo de salto (0,68 s) + 0,25 s = **0,93 s → se fija en 0,95 s.**

La distancia en metros es velocidad × tiempo:

| Velocidad | 300 ms | 450 ms | 600 ms | 900 ms | Tiempo de fila | Distancia entre filas |
|---|---|---|---|---|---|---|
| 15 m/s | 4,5 m | 6,8 m | 9,0 m | 13,5 m | 1,7–2,0 s | 26–30 m |
| 20 m/s | 6,0 m | 9,0 m | 12,0 m | 18,0 m | 1,4–1,7 s | 28–34 m |
| 24 m/s | 7,2 m | 10,8 m | 14,4 m | 21,6 m | 1,2–1,5 s | 29–36 m |
| 29 m/s | 8,7 m | 13,1 m | 17,4 m | 26,1 m | 1,0–1,3 s | 29–38 m |
| 32 m/s | 9,6 m | 14,4 m | 19,2 m | 28,8 m | 0,95–1,15 s | 30–37 m |

Nota: en metros el hueco casi no cambia (≈ 30 m); lo que cambia es el tiempo. Por eso `cfg.rowGap` (metros) se reemplaza por un tiempo por escalón. La visibilidad no es el límite: la niebla empieza a 55 m y acaba a 165 m (38 y 140 en Neón), o sea 4,4 s de anticipación a 32 m/s.

**Cómo se mide el hueco:** desde el final del patrón anterior (`s + largo`) hasta el frente del siguiente. `hueco = v × rand(tFila) + largoAnterior`, con `v` la velocidad prevista al llegar (3.6, regla 4).

**Margen de entrada (`cfg.inputBuffer = 0.15`)** **[C]**: un salto o una deslizada pedidos hasta 0,15 s antes de tocar el suelo se ejecutan al aterrizar. Hoy `jump()` descarta la orden si el gato está en el aire, y con filas a 0,95 s eso se va a sentir como "no me respondió".

### 3.5 Encadenamiento y combos

Un **combo** son 2 o 3 filas con un hueco interno más corto que el tiempo de fila. Huecos internos mínimos, medidos de frente a frente **[C, calculados de la física de 3.1]**:

| Primera acción → segunda | Hueco interno mínimo | Motivo |
|---|---|---|
| cambiar → cualquiera | 0,35 s | el cambio libra en 0,07 s; el resto es lectura |
| saltar → agacharse | 0,45 s | agacharse en el aire baja de inmediato |
| agacharse → saltar | 0,35 s + largo del obstáculo alto / v | saltar cancela la deslizada, pero hay que haber salido de debajo |
| saltar → saltar | 0,75 s | no hay doble salto (`airJumps: 0`) |
| agacharse → agacharse | 0,90 s | la deslizada dura 0,85 s y no se encadena |

Reglas:
1. Dentro de un combo, cada fila cumple las invariantes 1 y 2 con la anterior.
2. Un combo cuenta como una sola "fila" para el ritmo: después de un C2 el hueco es 1,25 × tiempo de fila; después de un C3, 1,5 ×.
3. No hay dos combos seguidos antes del escalón 4.
4. Combos con nombre, para que se aprendan (los jugadores aprenden secuencias reconocibles, fuente 14): **Brinco y túnel** (`W1` → `W2`), **Embudo** (`D1` → `W3` en el carril que quedó libre), **Zigzag** (`X X .` → `. X X`), **Escalera** (`S . .` → `. S .` → `. . S` con monedas en arco), **Doble muro** (`W1` → `W1` a 0,75 s).

### 3.6 Curva de dificultad

**Reloj de dificultad.** `S.heat` arranca en 0 y sube 1 por segundo de juego (dentro y fuera del drenaje). Baja 25 al salir de una caneca por rescate (6.4). Nunca baja de 0. Velocidad y escalón dependen de `S.heat`, no de `S.time`.

**Velocidad:** `S.speed = min(cfg.maxSpeed, cfg.baseSpeed + cfg.accel × S.heat) × S.speedMul`, con `baseSpeed: 15`, `accel: 0.10`, `maxSpeed: 32` → tope a los 170 s. (Hoy: 16, 0,22 y 38, tope a los 100 s.) **[C]**: 38 m/s nunca se probó con filas que obliguen a actuar; se empieza en 32 y se sube solo si el bot experto queda sobrado. Una guía sin fuente dice que Subway Surfers deja de acelerar hacia los 10 minutos (fuente 8, poco fiable): el género acelera despacio.

**Escalones:**

| Escalón | `heat` | Velocidad | Tiempo de fila | Tope `libre[c]` | Duros | Móviles/temporizados | Combos | Respiro cada |
|---|---|---|---|---|---|---|---|---|
| 0 Aprender | 0–20 | 15–17 | 1,7–2,0 s | 2 | no | no | no | 5 filas |
| 1 Calle | 20–50 | 17–20 | 1,4–1,7 s | 2 | sí | no | no | 6–7 filas |
| 2 Tráfico | 50–90 | 20–24 | 1,2–1,5 s | 1 | sí | sí | C2 | 7–8 filas |
| 3 Persecución | 90–140 | 24–29 | 1,0–1,3 s | 1 | sí | sí | C2, C3 | 8–9 filas |
| 4 Tope | 140+ | 29–32 | 0,95–1,15 s | 1 | sí | sí | C2, C3 seguidos | 10–12 filas |

**Pesos de patrones por escalón** (se normalizan; después se filtra por invariantes):

| Patrón | E0 | E1 | E2 | E3 | E4 |
|---|---|---|---|---|---|
| U1 | 30 | 15 | 6 | 0 | 0 |
| D1 | 20 | 18 | 12 | 10 | 8 |
| D2 | 20 | 15 | 10 | 8 | 6 |
| D3 | 0 | 12 | 12 | 10 | 8 |
| W1 | 15 | 10 | 8 | 6 | 6 |
| W2 | 15 | 10 | 8 | 6 | 6 |
| W3 / W4 | 0 | 10 | 12 | 12 | 12 |
| W5 | 0 | 6 | 8 | 10 | 10 |
| W6 | 0 | 0 | 6 | 8 | 8 |
| L1 | 0 | 4 | 6 | 6 | 6 |
| M1 | 0 | 0 | 6 | 8 | 8 |
| T1 | 0 | 0 | 4 | 6 | 6 |
| C2 | 0 | 0 | 6 | 10 | 12 |
| C3 | 0 | 0 | 0 | 6 | 10 |

Reglas:
1. **Arranque guionado.** Las tres primeras filas de toda carrera son fijas: W1 con vallas en `s = 60` (4 s), W2 con cinta, D1 con cajas altas. Enseñan los tres verbos sin texto, y como dos son completas atrapan al que no hace nada. Si el módulo de niveles quiere poner un rótulo ("desliza hacia arriba") en la primera partida de un jugador, este es el momento.
2. **Mundos.** Cada mundo sigue eligiendo *con qué piezas* se arma cada celda (su `rowWeights` pasa a ser un peso por tipo dentro de cada clase de celda), pero no decide la forma de la fila. Un mundo no puede saltarse las invariantes.
3. **Oscilación.** Dentro de cada escalón la presión sube y baja (3.7); la curva no es lineal **[E]** (fuentes 13 y 15: aliviar a corto plazo aunque la tendencia suba; alternar tensión y descanso).
4. **Generar con la velocidad de llegada.** Los tramos se arman hasta 400 m antes de pisarlos. Al llenar la fila en `s` de un tramo nuevo, usar `heatLlegada = S.heat + (metrosHastaEsaFila) / S.speed` para escoger escalón y hueco. Si no, las filas quedan armadas con la dificultad de hace 20 s.
5. **Niveles.** El módulo de niveles hoy escribe `baseSpeed`, `accel`, `maxSpeed` y `rowGap` por nivel. Los tres primeros siguen sirviendo. `rowGap` deja de existir: se reemplaza por `cfg.tierMax` (escalón tope del nivel) y `cfg.heatStart` (con cuánto `heat` empieza). Hay que avisarle al agente de Niveles.

### 3.7 Respiros y oleadas

1. Una **oleada** son N filas de presión (N según la tabla de escalones) seguidas de un **respiro** `R`.
2. El respiro son exactamente **2 huecos de fila sin obstáculos**. Dura 3,4–4 s al empezar y ~2 s al tope.
3. La fila anterior y la posterior al respiro son completas (invariante 5). Así el respiro no le regala nada al jugador quieto: llega a él tropezado o sale de él tropezando.
4. En el respiro va el premio grande de la oleada: línea de monedas en zigzag suave y un grupo de ratones. Es también donde se colocan las entradas a balcones, las canecas y la alcantarilla verde (ver cada sección): las decisiones de ruta se toman con la calle despejada.
5. El tramo de 40 m alrededor de un cruce cuenta como respiro.
6. Meta de reparto del tiempo **[C]**: 15–25 % del tiempo en respiro en escalones 0–2 y 10–15 % en 3–4. (Los referentes describen el ritmo como tramos seguros entre racimos de decisiones, fuente 14, sin dar porcentajes.)

### 3.8 Monedas, ratones y comida entre filas

Reemplaza a `defaultFill`. El generador ya sabe las salidas de cada fila, así que:

1. **La línea de monedas marca una ruta válida.** Va de una salida de la fila `i` a una salida de la fila `i+1`, cambiando de carril a mitad del hueco. Sobre una celda `S` las monedas hacen el arco del salto (`y = 11,5·t − 17·t²`, con `t` desde el punto de despegue); bajo una celda `A` van a ras de suelo. 5–7 monedas por hueco, como hoy.
2. **Los ratones van fuera de la ruta de monedas.** Grupo de 3 en otro carril, uno cada 3 huecos. Recogerlos obliga a desviarse y volver: es la decisión pequeña de cada pocos segundos.
3. **La comida no sale en la calle normal.** Solo en balcones, calles de festín, drenaje, dentro del tubo de concreto y después de un C3. Así "comida" siempre significa "tomé una ruta con riesgo".
4. Nada recogible a menos de 3 m del frente o la cola de un obstáculo del mismo carril (salvo los arcos del punto 1).
5. Las gallinas y cangrejos, que hoy son filas enteras de comida gratis, pasan a ser una pieza de comida más y se colocan con la regla 3.

---

## 4. Balcones

### 4.1 Decisión

Se retira la fila `tarima` (rampa + andamio en un carril de la calle). En su lugar, **corredores elevados pegados a las fachadas, sobre los andenes**: un cuarto y quinto carril que solo existen arriba.

**[E]** En Subway Surfers la ruta alta (techos de los trenes) se alcanza por rampas o con un potenciador de salto y es donde están las mejores líneas de monedas (fuentes 7 y 8). **[C]** Aquí la ruta alta va a los lados y no en el centro por tres motivos: es lo que pidió el dueño, no tapa la vista de la calle (la cámara va alta y por detrás), y deja a Panela corriendo abajo, a la vista, lo que explica por qué ahí arriba se le escapa.

### 4.2 Geometría

| Cosa | Valor | Motivo |
|---|---|---|
| Carril | `p.lane = ±2` → x = ±6 | `LANE = 3`, así que `lane × LANE` ya da el centro del andén (andén: x de 4,5 a 7,5) |
| Altura del piso | `top: 2.2` | la que ya usa el motor; permite la entrada por salto (4.3) |
| Ancho | `hw: 1.3` (de x = 4,7 a 7,3) | igual que la tarima actual |
| Largo | 24, 32 o 40 m | ≤ 2 huecos de fila al empezar, para no ser refugio |
| Escalones | pieza `ramp: true`, `top: 2.2`, `hl: 2.5` (5 m), en `lane ±2`, justo antes del balcón | `floorAt` ya levanta en rampas |
| Zona de acceso | de 8 m antes del inicio de los escalones a 3 m después | bordillo pintado y flecha verde (la flecha ya existe en `BUILD.rampa`) |

Aspecto por mundo (lo arma el agente de Mundos; ninguno es específicamente colombiano): Pueblo → corredor de madera con baranda y cajas apiladas de escalón; Costa → muelle de tablas sobre pilotes con una pasarela inclinada; Neón → pasarela metálica o marquesina con escalera de incendios.

### 4.3 Cómo se sube

1. **Entrada normal:** yendo por el carril de afuera (`lane = ±1`), deslizar hacia la fachada dentro de la zona de acceso. El gato pasa a `lane = ±2` y los escalones lo suben. Es el mismo gesto de "empujar contra el borde" que ya se usa para girar en los cruces; no chocan porque no hay balcones a menos de 70 m de un cruce.
2. **Entrada por salto (ruta de experto):** saltar y, en la cima, deslizar hacia la fachada con un balcón al lado. El motor ya lo permite: se pisa una tarima si `p.y ≥ top − 0,45 = 1,75`, y el salto está por encima de 1,75 durante 0,21 s. Con el doble salto de Mango es fácil: es una sinergia gratis con el elenco.
3. **Fuera de esos dos casos, deslizar hacia la fachada no hace nada** (como hoy). Nunca se choca de frente contra un balcón ni contra sus escalones: `dmg: 0` y no hay forma de estar en `lane ±2` a nivel de suelo fuera de la zona de acceso.

Condición exacta para que `move(dir)` acepte pasar a `lane ±2`: existe en `cur.obs` una pieza con `top` en ese lado tal que (a) es unos escalones y `p.s` está en su zona de acceso, o (b) `floorAt(±6, p.s, p.y) > 0`, es decir, el gato ya está a la altura de pisarla.

### 4.4 Qué hay arriba

1. Línea de 8–12 monedas y **una comida al final** (5 de Bocado). En escalón 2 o más, el balcón puede tener dos tramos con un vacío de 4–6 m entre ellos (se salta; a 15 m/s el salto cubre 10 m) y una segunda comida en el segundo tramo.
2. Sin obstáculos en escalones 0–2. En 3–4, como mucho uno por tramo y siempre blando: una matera (`S`) o ropa tendida (`A`).
3. **Panela no sube.** Mientras el gato está arriba, `S.danger` baja al doble de velocidad (2.5).
4. La calle de abajo sigue con sus filas normales: el balcón es una alternativa, no una pausa del generador.

### 4.5 Cómo se baja

1. **Al terminar el balcón, el gato cae solo** (la gravedad ya lo hace; `floorAt` da 0) y el motor lo devuelve al carril de afuera: si `p.gy == 0`, `|p.lane| == 2` y no está en una zona de acceso, entonces `p.lane = ±1`.
2. **Antes, a voluntad:** deslizar hacia la calle (pasa a `lane ±1` y cae) o agacharse en el borde.
3. La caída desde 2,2 dura 0,36 s: el gato toca suelo 5–11 m después del final.

### 4.6 Riesgo

El balcón tiene que costar algo o será siempre la mejor opción:
1. **Se aterriza en un carril fijo.** La primera fila después del final del balcón pone siempre una celda `S` o `A` (nunca `X`, nunca dura) en el carril de afuera de ese lado, entre 0,9 y 1,3 s después del final: quien baja tiene que actuar al aterrizar.
2. **Se renuncia a la calle:** mientras dura, las monedas y ratones de abajo se pierden.
3. **La entrada exige estar en el carril de afuera en el momento justo.** Fallarla no cuesta nada, pero el generador puede poner una celda en ese carril 1 fila antes para que haya que ganársela (solo en escalón 2 o más).
4. **Arriba se ve menos la calle del lado contrario.** Es un costo real de lectura; por eso el límite de 40 m.

### 4.7 Convivencia con la cámara y la calle

1. **Cámara:** hoy sigue la x del gato. Con el gato en x = ±6 quedaría a 1,5 m de la fachada y media pantalla sería pared. Regla: la x de la cámara y de su punto de mira se limita a ±3,8 (con suavizado).
2. **Panela:** se queda en la calle. Su x se limita a ±3: `dogOff` objetivo = `clamp(p.x, −3, 3) − p.x`.
3. **Decorado:** árboles (x = ±5,3), faroles (±7 con brazo hasta 5,4), toldos (±6,8 a 3,1 de alto), materas (±7,1) y los balcones decorativos del Pueblo (3,3 de alto) ocupan justo ese volumen. Hay que decidir los tramos de balcón **antes** de armar las fachadas: `buildSegment` calcula `seg.balconies = [{ side, s0, s1 }]` al principio, y `defaultSide` / `world.side` no ponen nada de eso entre `s0 − 10` y `s1 + 4`. Es un cambio de contrato con el agente de Mundos.
4. **Frecuencia [C]:** un conjunto de balcón cada 200–320 m, alternando lado; el primero no antes de 150 m; nunca a menos de 45 m del inicio de un tramo ni a menos de 70 m del cruce; no hay balcones en el drenaje. La zona de acceso cae siempre en un respiro.

### 4.8 Qué hay que ampliar en el motor

| Qué | Dónde | Estado |
|---|---|---|
| Piso elevado, rampa que levanta, pisar solo desde arriba | `SPEC.top`, `SPEC.ramp`, `floorAt` | **ya existe**; sirve tal cual con piezas en `lane ±2` |
| No chocar con lo que se pisa | `update`: `if (o.top && (o.ramp \|\| p.y >= o.top - .45)) continue` | ya existe |
| Carriles ±2 | `move()`: hoy `clamp(p.lane + dir, -1, 1)` | **ampliar** con la condición de 4.3 |
| Volver a ±1 al tocar suelo | `update` | **nuevo** |
| Límite lateral de la cámara y de Panela | `place()` | **nuevo** |
| `seg.balconies` y decorado que lo respeta | `buildSegment`, `defaultSide`, `worlds.js` | **nuevo**, contrato con Mundos |
| Piezas `balcon24/32/40` y `escalones` | `BUILD` / `SPEC` | **nuevo**; quitar `rampa`, `tarima` y la fila `tarima` |
| Entrar a mitad de los escalones sin salto brusco | `floorAt` hace que la rampa "siempre levante" | **revisar**: limitar la entrada al primer 60 % del largo |

---

## 5. Obstáculos nuevos

Priorizados. Todos son de calle u obra genéricos. Medidas en el formato de `SPEC` (`hw` medio ancho, `hl` medio largo, `y0..y1` altura). "Celda" es la de 3.1.

| # | Obstáculo | Comportamiento | `SPEC` propuesto | Golpe | Acción | Mundos | Escalón |
|---|---|---|---|---|---|---|---|
| 1 | **Contenedor de obra** | Fijo, macizo, ocupa un carril. Es el muro puro que hoy falta fuera del Pueblo. | `hw 1.25, hl 1.8, y0 0, y1 2.6, hard` | duro | cambiar (`X`) | todos | 1 |
| 2 | **Poste caído** (árbol en el Pueblo, palmera en la Costa, poste de luz en Neón) | Una viga atravesada en diagonal: un extremo en el suelo, el otro en alto. Una sola pieza da la fila `S X A`. | tres cajas de choque: carril bajo `y0 0, y1 0.9`; centro `y0 0, y1 2.4`; carril alto `y0 1.1, y1 2.6`; `hl 0.4` | blando | saltar, cambiar o agacharse según el carril | todos | 2 |
| 3 | **Zanja de obra** | Hoyo de dos carriles de ancho y 3 m de largo, con conos. En el tercer carril, un tablón por el que se pasa sin saltar. | `hw 2.9 (centrado entre dos carriles), hl 1.5, y0 -1, y1 .05` | hoyo: tropiezo y caída de 0,5 s | salto largo, o ir al tablón | todos | 1 |
| 4 | **Tubo de concreto** | Tubo grande acostado a lo largo del carril, 8 m. Dos rutas: agachado por dentro (hay un ratón o comida) o saltando encima y corriendo por arriba (monedas). | `hw 1.2, hl 4, y0 .55, y1 1.6, top 1.6` | blando (de frente y de pie) | agacharse o saltar | todos | 1 |
| 5 | **Ciclista** | Va en el mismo sentido que el gato, a 6 m/s, así que se le alcanza despacio. Una vez, estira el brazo 0,8 s y cambia a un carril vecino. | `hw .5, hl .9, y0 0, y1 2`; `animate` mueve `o.s` y, una vez, `o.x` | blando | cambiar, leyendo la señal | Pueblo, Costa, Neón (repartidor) | 2 |
| 6 | **Carrito que cruza** (de mercado, o carretilla) | Cruza la calle de andén a andén a 5 m/s; arranca cuando el gato está a 1,8 s. Lo anuncia un traqueteo y una flecha en el piso. | `hw .7, hl .6, y0 0, y1 1.1`; móvil lateral | blando | saltar o esperar el hueco (`M`) | todos | 2 |
| 7 | **Hidrante con chorro** | Un chorro de agua cruza un carril: 1,2 s abierto y 1,2 s cerrado; el piso se moja 0,5 s antes de que salga. | `hw 1.3, hl .4`; `animate` pone `y0..y1` en `0..2.4` o lo apaga (como la `barrera` actual) | blando | pasar cuando cierra, o cambiar (`T`) | todos | 2 |
| 8 | **Bolardos retráctiles** | Tres bolardos, uno por carril, que suben y bajan en secuencia; siempre hay exactamente uno abajo. Luz verde sobre el que está abajo. | `hw .6, hl .4, y0 0, y1 1.3` cada uno; ciclo de 3 s, 1 s por carril | blando | estar en el carril abierto, o saltar | Neón, Costa | 3 |
| 9 | **Pluma de grúa** | Una viga que barre la calle de lado a lado a media altura y vuelve a ras de suelo: una pasada se agacha, la siguiente se salta. | ancho total `hw 5, hl .3`; alterna `y0 1.1, y1 2.2` y `y0 0, y1 .6` cada 2 s, con aviso de 0,4 s (como el `laser`) | blando | agacharse o saltar según la pasada (`T`) | Neón, Pueblo (obra) | 3 |
| 10 | **Tapa que salta** | Una alcantarilla que echa vapor 1 s y luego dispara un chorro que bloquea el carril 1 s. | `hw .9, hl .9`; `animate` alterna entre nada y `y0 0, y1 3` | blando | cambiar, o pasar antes (`T`) | Neón, drenaje | 3 |
| 11 | **Camión que arranca** | Estacionado en un carril de afuera. Cuando el gato está a 1,5 s enciende la direccional y sale al carril vecino en 0,6 s. | `hw 1.25, hl 3, y0 .6, y1 3.2, hard`; se pasa agachado | duro de frente; de lado, tropiezo (regla 1 de 2.3) | cambiar con anticipación o agacharse | todos | 3 |

**Combinados** (se arman con piezas existentes; no necesitan modelo nuevo):
- **La obra:** zanja + contenedor + valla en un C2: `H H .` seguido de `. X S`.
- **El trasteo:** bus (`A` largo) en un carril, contenedor en otro y cajas en el tercero: fila completa con tres soluciones distintas.
- **Doble fila de carros con ciclista:** `A A .` y un ciclista por el carril libre.

Reglas para todos los nuevos:
1. Cada uno se lee desde atrás y desde arriba (la cámara va a 6,8–10 de altura): la parte que choca tiene que ser la parte que se ve.
2. Todo lo temporizado avisa al menos 0,4 s antes de cambiar, con forma y con sonido, no solo con color **[E]** (fuentes 12 y 16; el aviso sonoro se percibe algo antes que el visual).
3. Lo que se pasa agachado muestra el hueco: sombra clara debajo o franja pintada. Hoy no hay ninguna pista de que bajo un carro se pasa (lo anotó el coordinador en `EQUIPO.md`).
4. Los que mueven su caja de choque usan `o.animate`, como ya hacen `barrera`, `laser` y `rebota`.

---

## 6. Canecas (puntos de regeneración)

### 6.1 Qué son

Una **caneca grande volcada** en un carril, con la boca hacia el gato: se ve como un túnel corto. Tiene una marca propia (huella de gato pintada y un brillo) para no confundirla con la `basura` que ya existe y que es un obstáculo.

Hace **las dos cosas** que planteó el encargo, con una sola acción:
- **Escondite:** si Panela está encima (`S.danger > 0`), al pasar por la caneca `S.danger = 0`. Panela pasa de largo oliendo y vuelve atrás.
- **Punto de regeneración:** guarda una carga de rescate (`S.canecas = 1`, máximo 1). Si más adelante lo atrapan, Tinto sale de una caneca y la carrera sigue.

### 6.2 Cómo se usa y qué cuesta

1. **Hay que pasar agachado por su carril.** `SPEC.caneca = { hw: .9, hl: 1.6, y0: .55, y1: 1.6 }`, blando. De pie se choca con ella: es un tropiezo.
2. Ese es el costo: **estar en el carril correcto y agacharse a tiempo**, con el riesgo de tropezar justo donde se buscaba ayuda, y renunciar a las monedas de los otros carriles en esa fila.
3. No cuesta monedas ni nada de la economía dentro de la carrera.
4. Si ya lleva una carga, pasar por otra caneca da +10 monedas en vez de una segunda carga: nunca es un desperdicio y nunca se acumula.
5. El motor hoy no se entera de que el gato pasó *por dentro* de algo sin chocarlo. Hace falta un evento nuevo: en `update`, para cada obstáculo cuyo `s` quedó entre `prevS` y `p.s`, en el carril del gato y sin golpe, `emit('pass', o)`. Sirve también para el tubo de concreto y para premiar pasadas por un pelo.

### 6.3 Cada cuánto aparecen

| Regla | Valor | Motivo [C] |
|---|---|---|
| Primera | a ~300 m (unos 18 s) | se aprende pronto, cuando aún no hace falta |
| Siguientes, en la calle principal | cada 700–900 m de carrera | un jugador medio (45–100 s, 1–2 km) ve 1 o 2 por partida |
| Después de un rescate | no antes de 400 m | que el rescate no se encadene |
| En calle lateral marcada | si no lleva carga, 1 de cada 4 cruces ofrece una calle "con caneca" (7.2) | quien la necesita puede ir a buscarla |
| Colocación | siempre en un respiro, en un carril que no sea el de la línea de monedas | hay que escoger |
| Escalón 0 | no aparecen antes de `heat = 15` | primero los tres verbos |

### 6.4 Qué pasa exactamente al "salir de la caneca" (rescate)

Se dispara cuando iba a haber captura (doble tropiezo sin Bocado, choque duro, o cocodrilo en el drenaje) y `S.canecas > 0`.

| Momento | Qué pasa |
|---|---|
| 0,0 s | Estado nuevo `S.state = 'rescue'`: el mundo sigue dibujándose pero no hay choques ni órdenes. Panela salta sobre una nube de polvo; Tinto ya no está. `S.canecas = 0`. |
| 0,0 s | Se apagan (`o.hit = true`, malla oculta) todos los obstáculos del tramo entre `p.s` y `p.s + 2,5 s × velocidad`. Se coloca una caneca de salida en el carril central, 8 m adelante. |
| 0,5 s | La caneca se sacude y la tapa salta. |
| 0,8 s | Tinto sale disparado de la caneca (`p.y = .01`, `p.vy = 9`, igual que la salida del drenaje), `p.lane = 0`, `p.inv = 2.0`. Panela queda atrás mirando a los lados: `S.danger = 0`, `S.dogGap = cfg.gapMax`. Cartel "¡Por un pelo!". |
| 0,8 s | `S.heat = max(0, S.heat − 25)`: baja la velocidad unos 2,5 m/s y, si toca, un escalón. `S.state = 'play'`. |
| después | Las dos filas siguientes son un respiro. |

Notas:
- En el drenaje, el rescate saca a Tinto a la calle (como una escalera) y hace lo mismo desde el paso de 0,8 s.
- No se devuelve nada de distancia, monedas ni ratones: el rescate no rebobina. **[C]** Un punto de control que quita lo ganado se siente como castigo doble, y el motor no puede volver a un tramo que ya borró.
- Se expone `game.rescue()` para que el otro diseñador pueda ofrecer la misma secuencia desde la pantalla de fin de partida (un "continuar"). Funciona desde `dying` u `over` mientras no se haya llamado a `reset()`. Qué cuesta y cuántas veces se permite lo define él; mi recomendación es máximo una por partida, sin cuenta regresiva y sin dinero real.
- Eventos: `emit('caneca', { hid, charged })` al pasar por una y `emit('rescue', { cause })` al salir.

### 6.5 Cómo se ve en carrera

- Icono de caneca en el HUD, encendido cuando hay carga.
- A 60 m, un cartel flotante pequeño sobre la caneca (huella de gato), como la flecha de la salida del drenaje.
- Si `S.danger > 0`, la caneca pulsa: es el momento en que más vale.

---

## 7. El drenaje y las calles laterales

### 7.1 El drenaje: una apuesta con reloj

**Papel en el bucle:** la ruta de mayor premio y mayor riesgo, y a la vez una vía de escape. Arriba el peligro depende de los errores; abajo depende del tiempo.

Lo que ya está bien: se entra por elección (saltar la alcantarilla verde la evita), Panela no baja, hay un perseguidor propio, la salida es una acción clara.

Qué ajustar:

1. **El cocodrilo ya no muerde vida.** Usa el mismo modelo: un reloj `chase` que sube 1 por segundo; cuando llega a `CATCH_IN` es captura (o rescate de caneca). Cada tropiezo abajo suma 5 s al reloj (el cocodrilo da un salto adelante). No hay choques duros en el drenaje.
2. **`CATCH_IN` pasa de 26 a 22 s** **[C]**: a 17–24 m/s son 370–530 m, tres o cuatro escaleras.
3. **Cada escalera que se deja pasar sube el premio**, y se ve antes de decidir (un cartel sobre la escalera dice "×2 adelante"):

| Tramo | Ratones por hueco | Monedas por hueco | Extra |
|---|---|---|---|
| Hasta la 1.ª escalera | 3 | 4 | — |
| Entre la 1.ª y la 2.ª | 5 | 6 | — |
| Después de la 2.ª | 6 | 8 | una comida por tramo |

   Es una decisión de habilidad con información completa (se ve al cocodrilo y se ve la escalera), no un sorteo.
4. **Escaleras cada 110 m**, como hoy. La escalera va siempre en un respiro del túnel.
5. **Es una entrada con anuncio, no una fila al azar.** Hoy la fila `drenaje` pesa 9 de ~129 y sale cada ~14 filas. Pasa a aparecer cada 600–900 m, nunca con `heat < 20`, nunca a menos de 150 m de haber salido, siempre en un respiro y con un aviso a 60 m (rejilla verde con brillo, que ya existe, más una flecha).
6. **El jugador quieto no puede caer solo.** La alcantarilla verde va siempre en un carril de afuera y nunca en las tres primeras filas de un tramo, de modo que para caer haya que haber escogido ese carril. Un bot quieto que arrancó con un paso al lado sí puede caer: abajo lo atrapan las mismas invariantes. (Hoy 2–4 de cada 10 partidas quietas terminan abajo [M].)
7. **Escape:** entrar con Panela encima limpia el peligro (`danger = 0` al salir, como ya hace `exitSub`). Es una jugada legítima: cambias a Panela por el cocodrilo.
8. **Las filas del túnel cumplen las mismas invariantes** de 3.3, con el escalón actual menos 1 (el túnel es más estrecho de leer). `S.heat` sigue corriendo abajo.
9. **Al volver a la calle** hay 1,5 s de invulnerabilidad (ya existe) y las dos primeras filas son un respiro.

### 7.2 Las calles laterales: elegir ruta

**Papel en el bucle:** la decisión de cada ~12 s (un tramo mide 165–230 m). Hoy girar no cambia nada que el jugador pueda saber antes: un 35 % de los tramos tiene `seg.bonus` con más ratones, pero no se anuncia.

Qué ajustar:

1. **Cada salida tiene un tipo y un letrero.** `seg.kind` se decide al crear el tramo y se muestra en un letrero colgado en la boca de la calle y en el botón GIRAR:

| `seg.kind` | Qué tiene | Costo | Frecuencia [C] |
|---|---|---|---|
| `normal` | lo de siempre | — | el resto |
| `festin` | doble línea de monedas, ratones en cada hueco y una comida cada 3 huecos | se genera con `heat + 20` (un escalón más o menos) | 1 de cada 3 cruces |
| `caneca` | una caneca a 60 m de la entrada | — | 1 de cada 4 cruces, solo si `S.canecas == 0` |

2. **Seguir derecho nunca es la opción premiada.** El premio está siempre en una calle lateral: hay que girar para ganarlo, y el que no toca nada no lo ve.
3. **Girar despista:** si `S.danger > 0` al girar, `S.danger −= 2` y Panela derrapa. Le da un uso táctico al giro y luce la cámara detrás de la perra.
4. **Nunca hay un cruce sin salida derecha** (como hoy) y ninguna calle es un callejón sin salida.
5. **El giro debe poder pedirse con calma:** última fila en `s ≤ L − 20` y botón GIRAR visible desde 60 m (ya es así).
6. **No más de dos cruces seguidos con `festin`**, para que no se convierta en la ruta única.

---

## 8. Criterios de aceptación (para un banco de bots)

### 8.1 Los bots

Todos corren con `game.step(1/60, false)`, modo infinito, `cfg` de fábrica, 200 partidas por mundo, tope de 600 s.

| Bot | Cómo juega |
|---|---|
| **Quieto** | Ninguna orden. Tres variantes: se queda en el centro, o da un paso inicial a la izquierda o a la derecha y no vuelve a tocar. |
| **Un verbo** | Tres variantes: solo salta (cada vez que hay algo a 0,4 s), solo se agacha, solo cambia de carril hacia una celda libre. |
| **Aleatorio** | Una orden al azar cada 0,6 s. |
| **Medio** | Ve la fila siguiente cuando está a 1,2 s; decide bien el 95 % de las veces; ejecuta con 450 ms de retraso; va por las monedas de su ruta y por la mitad de los ratones. |
| **Experto** | Ve dos filas; decide bien el 99,5 %; 250 ms de retraso; va por todo, usa balcones y canecas. |
| **Perfecto** | Ve todo el tramo y nunca falla. No mide dificultad: prueba que el generador es justo. |

De dónde salen 450 y 250 ms: del rango de reacción de elección de 3.4 **[E]**. Los porcentajes de acierto son **[C]** y se calibran una vez contra personas.

### 8.2 Metas

| Medida | Hoy [M] | Meta |
|---|---|---|
| Quieto: tiempo hasta la captura, mediana | 26–71 s según el mundo (150 s con el `cfg` del nivel 1-1) | **≤ 9 s** |
| Quieto: máximo en 600 partidas | 291 s | **≤ 15 s; ninguna partida pasa de 20 s** |
| Quieto: partidas que terminan en el drenaje | 20–50 % | **0 %** en la variante del centro; en las de lado puede caer, pero el tope de 15 s vale igual |
| Un verbo: mediana (cada variante) | sin medir | ≤ 25 s |
| Aleatorio: mediana | 107 s (Pueblo) | **≤ 20 s**; percentil 95 ≤ 45 s |
| Medio: mediana | sin medir | **45–100 s** |
| Medio: tropiezos por minuto | — | 1,5–3 |
| Medio: capturas por choque duro frente a doble tropiezo | — | entre 30/70 y 60/40 |
| Experto: mediana | sin medir | **≥ 300 s** |
| Experto: tropiezos por minuto | — | ≤ 0,5 |
| Perfecto: partidas que llegan a 600 s | sin medir | **100 %** en los tres mundos y en el drenaje (≥ 99 % si hay móviles) |
| Diferencia entre mundos (mediana del bot medio) | Pueblo 2,7 × Neón (quieto) | el más fácil ≤ 1,5 × el más difícil |

Cuentas de respaldo para el bot medio **[C]**: con ~40 filas por minuto, 5 % de error y ~30 % de celdas duras, la tasa de captura es ≈ 0,6/min por choque duro más ≈ 0,3/min por doble tropiezo: vida media ~70 s antes de contar Bocado y caneca. Para el experto, 0,5 % de error da ~0,1 capturas por minuto.

### 8.3 Comprobaciones del generador (sin jugar)

Se generan 2.000 tramos por mundo y por escalón y se revisa por código:

1. Toda fila tiene al menos una salida (invariante 1).
2. Toda salida encadena con una de la fila siguiente (invariante 2).
3. `libre[c]` nunca pasa de 2 (de 1 en escalón ≥ 2 fuera de respiros).
4. En toda ventana de 6 filas hay una completa de verticales; cada carril recibe una `X` cada 8 filas o menos.
5. El tiempo entre filas, a la velocidad de llegada, nunca es menor que el mínimo del escalón; nunca menor de 0,95 s fuera de combos; los huecos internos de combos cumplen 3.5.
6. Antes y después de cada respiro y de cada cruce hay fila completa.
7. Ningún recogible dentro del volumen de un obstáculo.
8. Tiempo en respiro: 15–25 % (escalones 0–2), 10–15 % (3–4).
9. Las primeras tres filas de la carrera son las guionadas.

### 8.4 Comprobaciones de las piezas nuevas

| Pieza | Prueba | Resultado esperado |
|---|---|---|
| Tropiezo | chocar una valla en calma | `danger = 6`, Panela a 2,8; a los 6 s, Panela a 8,5 y `danger = 0` |
| Doble tropiezo | dos vallas en 4 s, sin Bocado ni caneca | captura |
| Choque duro | carro de frente, de pie | captura inmediata |
| Entrada lateral | cambiar de carril contra el costado de un bus | tropiezo, y el gato vuelve a su carril |
| Bocado | 20 ratones → doble tropiezo | sin captura, `bocados = 0`, `danger = 0` |
| Bocado y choque duro | con Bocado, carro de frente | captura (o rescate si hay caneca) |
| Caneca, de pie | pasar sin agacharse | tropiezo, sin carga |
| Caneca, agachado y en peligro | — | `danger = 0`, `canecas = 1` |
| Rescate | captura con carga | sale de la caneca a los 0,8 s, `heat` baja 25, 2,0 s de invulnerabilidad, ningún obstáculo en 2,5 s |
| Balcón | deslizar hacia la fachada en la zona de acceso | sube a 2,2, recoge la línea, cae en `lane ±1` |
| Balcón, fuera de zona | deslizar hacia la fachada en cualquier otro punto | no pasa nada, sin golpe |
| Drenaje | no tomar ninguna escalera | captura a los 22 s (menos 5 s por tropiezo) |
| Giro en peligro | girar con `danger = 5` | `danger = 3` |
| Reinicio | de la captura a estar corriendo otra vez | la lógica no añade más de 0,3 s a lo que tarde la pantalla |

### 8.5 Lo que los bots no miden

Hay que mirarlo con ojos y, sobre todo, ponerlo en manos de una persona en un celular: si los obstáculos nuevos se entienden desde atrás, si el hueco bajo los carros se ve, si Panela a 2,8 m tapa a Tinto, si el gesto para subir al balcón se descubre solo. `EQUIPO.md` ya registra que los agentes comprobaron que nada fallara y el dueño encontró en minutos lo que nadie reportó.

---

## 9. Orden de implementación

**Fase 1 — arregla la queja del dueño (no se entrega nada más antes de esto)**
1. `S.danger`, clases blando/duro y el `damage()` nuevo (2.2–2.5). `S.health` derivado. Ratones y comida dejan de curar.
2. Bocado (2.6) con su medidor en el HUD.
3. Gramática de patrones con las invariantes 1–6 y el arranque guionado (3.2, 3.3, 3.6 regla 1), usando solo los obstáculos que ya existen clasificados en celdas.
4. `S.heat`, velocidad nueva y escalones 0–2 (3.6). `rowGap` → tiempo de fila.
5. Relleno nuevo: monedas por la ruta válida, ratones fuera de ruta, comida fuera de la calle (3.8).
6. Banco de bots quieto, aleatorio y perfecto, y las comprobaciones de 8.3. **Puerta de salida de la fase:** quieto ≤ 15 s siempre; perfecto 100 %.

**Fase 2 — puntos de regeneración**
7. Evento `pass`, caneca, carga y rescate (sección 6). `game.rescue()` para el otro diseñador.
8. Margen de entrada de 0,15 s (3.4).

**Fase 3 — balcones**
9. Carriles ±2, escalones, balcón, bajada, cámara y Panela limitadas (sección 4). Quitar `rampa` y `tarima`.
10. `seg.balconies` y decorado que lo respeta (con el agente de Mundos).

**Fase 4 — variedad**
11. Obstáculos nuevos 1–4 (contenedor, poste caído, zanja, tubo de concreto): son fijos y abren patrones nuevos.
12. Escalones 3–4, combos C2 y C3, reglas 7–9 de 3.3.
13. Obstáculos 5–11 (móviles y temporizados).

**Fase 5 — rutas**
14. Drenaje con reloj y premio creciente (7.1).
15. Tipos de calle lateral y letreros (7.2).
16. Bots medio y experto, y afinar los números [C] contra las metas de 8.2.

**Puede esperar:** premio por pasada "por un pelo" (con el evento `pass`), balcones de dos tramos, obstáculos dentro de los balcones, aspecto propio del balcón en cada mundo (sirve uno genérico al principio).

**Avisos a otros agentes antes de empezar:**
- **Niveles:** desaparecen `cfg.rowGap` y la vida. Las metas "termina con X % de vida" y "máximo N choques" hay que rehacerlas (por ejemplo "máximo N tropiezos", que sí existe). Las metas de ratones cambian de ritmo (un grupo cada 3 huecos, no cada hueco).
- **Gatos:** Nube ("siete vidas") comprueba `S.health − o.dmg ≤ 0`; con el modelo nuevo debe engancharse a la captura. Se pisa con la caneca: conviene que sea "una caneca de más por partida". La curación de +10 de una habilidad ya no hace nada. Sigilo y Embestida siguen sirviendo.
- **Animación:** Panela a 2,8 m durante 6 s es el nuevo estado más visto; hacen falta la animación de soltar el Bocado, la de salir de la caneca y el derrape en la esquina.
- **Mundos:** clasificar sus tipos en celdas y en blando/duro (tabla de 2.3), `seg.balconies`, y que gallinas y cangrejos dejen de ser filas.

---

## 10. Lo que NO hay que hacer

1. **No arreglar la queja subiendo la velocidad ni apretando las filas.** El problema no es ese (sección 1.2) y lo vuelve injusto antes de volverlo exigente.
2. **No dejar ninguna forma pasiva de recuperarse.** Nada que se recoja baja `danger`. Si mañana alguien propone "los ratones dan un poquito de ventaja", se vuelve al punto de partida.
3. **No mantener dos medidores de peligro.** Si se quiere conservar una barra, que sea el Bocado.
4. **No generar filas sin pasar por las invariantes**, ni dejar que un mundo meta filas por fuera (`ROWS.push` directo con `make` libre). Las piezas son del mundo; la forma de la fila es del generador.
5. **No poner obstáculos duros que se muevan de lado**, ni obstáculos nuevos dentro de un combo en su primera aparición.
6. **No poner nada en el centro de la calle para subir.** Los accesos van en el andén.
7. **No dejar correr por el andén a nivel de suelo.** Los carriles ±2 solo existen arriba y en la zona de acceso.
8. **No hacer del balcón, del drenaje o de la calle de festín un refugio:** todos tienen fin (40 m, 22 s, un tramo) y un costo al salir.
9. **No acumular rescates.** Un Bocado y una caneca como máximo. Dos colchones a la vez ya es mucho; más es dejar de jugar.
10. **No rebobinar el puntaje en el rescate** ni teletransportar al gato a un punto anterior.
11. **No usar azar con premio** (cajas sorpresa, ruletas, "gira para revivir"), **ni cuentas regresivas que presionen a pagar, ni compras para seguir corriendo, ni anuncios a cambio de revivir.** El público puede incluir menores. Lo adictivo tiene que venir de partidas cortas, causa de derrota clara, reinicio inmediato y la sensación de "casi": eso es lo que el género hace bien sin trucos.
12. **No esconder reglas.** Cada cosa que salva o mata tiene que verse antes de que pase: Panela cerca, la presa en la boca, el icono de caneca, la señal del ciclista.
13. **No dar por bueno nada sin verlo en movimiento y sin que una persona lo juegue en un celular.**
14. **No tocar los números [C] a ojo:** se cambian en `cfg` y se vuelve a correr el banco.

---

## 11. Resumen de cambios por archivo

| Archivo | Cambios |
|---|---|
| `js/core.js` — `cfg` | quitar `mouseHeal`, `gapMin`, `rowGap`; añadir `dangerTime`, `dangerGap`, `dangerFade`, `hardCrash`, `bocadoMax`, `inputBuffer`, `tierMax`, `heatStart`; cambiar `baseSpeed 15`, `accel .10`, `maxSpeed 32`, `invuln 1.0` |
| `js/core.js` — `S`, `p` | `S.danger`, `S.bocado`, `S.bocados`, `S.canecas`, `S.heat`; `S.state` gana `'rescue'`; `p.prevLane`; `p.lane` admite ±2 |
| `js/core.js` — `SPEC` | campo `hard`; campo `cell` (`S`, `A`, `X`, `M`, `T`) por tipo; piezas `caneca`, `escalones`, `balcon*`; quitar `rampa`, `tarima` |
| `js/core.js` — `ROWS`, `populate`, `defaultFill` | reemplazar por el generador de patrones (3.2–3.8); `buildSegment` calcula `seg.balconies` y `seg.kind` antes de armar fachadas |
| `js/core.js` — `damage`, `collect` | lógica de 2.4; `collect` suma al Bocado y no cura |
| `js/core.js` — `update`, `place` | `danger` y `dogGap` derivados; frontal o lateral; evento `pass`; vuelta a `lane ±1` al tocar suelo; límites de cámara y de Panela; velocidad desde `heat` |
| `js/core.js` — `move`, `jump`, `slide` | carriles ±2 con condición; `prevLane`; margen de entrada |
| `js/core.js` — API | `game.rescue()`; eventos `stumble`, `pass`, `caneca`, `rescue`; `dying` lleva `{ cause, hard }` |
| `js/sewer.js` | reloj `chase` en vez de mordiscos; +5 s por tropiezo; premio por tramo; entrada cada 600–900 m en carril de afuera |
| `js/worlds.js` | celdas y dureza de sus tipos; decorado que respeta `seg.balconies`; modelos de los obstáculos nuevos |
| `js/levels.js`, `js/cats.js`, `js/fx.js` | ver avisos de la sección 9 |

---

## 12. Dudas para el dueño

1. **¿Choque de frente contra un carro o un bus = captura inmediata?** Es la regla del género y lo que más sube la tensión, pero es dura con los más pequeños. Alternativa: en el primer mundo todo es tropiezo (`cfg.hardCrash = false`).
2. **¿Desaparece la barra de vida** y queda el Bocado (la presa que distrae a Panela)? ¿Le sirve el nombre?
3. **La caneca rescata gratis una vez si pasó por ella.** ¿O prefiere que salir de la caneca cueste monedas? Eso lo cierra el otro diseñador, pero cambia cuántas canecas hay que poner.
4. **¿El gesto para subir al balcón (deslizar hacia la fachada donde hay escalones) le parece descubrible,** o prefiere que suba solo al pasar por el carril de afuera?
5. **Velocidad tope 32 en vez de 38.** ¿Quiere sentirlo más rápido aunque sea más difícil de leer?
6. **¿Hasta dónde llega "menos colombiano" en los obstáculos que ya existen?** La chiva, el burro y la carreta siguen; los nuevos son genéricos.
7. **¿El drenaje con premio creciente por quedarse** le parece bien, o prefiere que sea solo un atajo corto?
8. **Los 15 niveles actuales quedan desajustados** (metas de vida, de choques y de ratones). ¿Se rehacen ahora o se deja primero bien el modo infinito?

---

## 13. Fuentes

Consultadas el 8 de octubre de 2026. Indico la calidad de cada una. No pude abrir directamente las wikis de Fandom (el servidor rechazó la lectura); lo que cito de ellas viene del resumen del buscador y lo marco.

1. Wikipedia, "Subway Surfers" — https://en.wikipedia.org/wiki/Subway_Surfers — controles, fin de la carrera al chocar, continuar con llaves, patineta ~30 s. Fiable para lo básico; no describe el tropiezo.
2. VideoGameGeek, ficha "The Inspector" — https://videogamegeek.com/videogamecharacter/40739/the-inspector — un golpe menor acerca al inspector, un choque completo termina la carrera. Ficha de aficionados.
3. Subway Surfers Wiki (Fandom), páginas "Busted" y del inspector — https://subwaysurf.fandom.com/wiki/Busted — un solo golpe hace aparecer al inspector; chocar, golpear dos veces o golpear con él en pantalla es captura; cuando se queda atrás se puede volver a golpear. **Leído solo por el resumen del buscador.** Wiki de aficionados.
4. SuperCheats, preguntas de jugadores — https://www.supercheats.com/subway-surfers/questions/285438/what-does-stumble-upon-barr y https://www.supercheats.com/subway-surfers/questions/271898/how-can-i-bump-in-to-10-trains — qué cuenta como tropiezo, golpe lateral contra un tren, instante de controles congelados. Respuestas de jugadores, coherentes entre sí.
5. Wikipedia, "Temple Run" — https://en.wikipedia.org/wiki/Temple_Run — y StrategyWiki — https://strategywiki.org/wiki/Temple_Run/Walkthrough — obstáculos que frenan en seco frente a los que solo hacen tropezar; segundo tropiezo con los monos cerca.
6. TouchArcade, reseña de Sonic Dash — https://toucharcade.com/2013/04/05/sonic-dash-review/ — y Games Asylum — https://www.gamesasylum.com/?p=16645 — los anillos como colchón; golpe sin anillos termina la carrera. Las reseñas no coinciden del todo en qué se pierde.
7. Subway Surfers Wiki, "Power-Ups" y "Super Sneakers" — https://subwaysurf.fandom.com/wiki/Power-Ups — patineta 30 s; las zapatillas permiten saltar sobre los trenes. Por resumen del buscador.
8. Guías sueltas sobre la velocidad de Subway Surfers (por ejemplo https://www.touchtapplay.com/what-is-the-best-hoverboard-in-subway-surfers/) — la velocidad dejaría de subir hacia los 10 minutos. **Sin fuente original; poco fiable.** Solo la uso como indicio de que el género acelera despacio.
9. PsyToolkit, lección sobre tiempos de reacción simple y de elección — https://us.psytoolkit.org/lessons/simple_choice_rts.html — reacción simple bajo 200 ms; de elección entre 350 y 450 ms, piso ~250 ms. Material docente de psicología experimental; fiable.
10. Universidad de Arizona, valores normativos de la prueba de vigilancia en niños — https://experts.arizona.edu/en/publications/normative-psychomotor-vigilance-task-performance-in-children-ages/ — medianas de 544 ms a los 6 años y 326 ms a los 11. Estudio revisado por pares; la tarea no es de elección, da el orden de magnitud.
11. Dynseo, tabla de tiempos de reacción por edad — https://www.dynseo.com/en/average-reaction-time-by-age-complete-table-statistics/ — fuente secundaria; solo para la tendencia por edad.
12. Game-Ace, guía de desarrollo de runners — https://game-ace.com/blog/how-to-develop-an-endless-runner-game-in-unreal-engine/ — los peligros se anuncian y no son injustos en el primer encuentro. Blog de un estudio; consejo práctico.
13. Foro de Godot, "Any tips for difficulty curve system of an endless runner?" — https://forum.godotengine.org/t/any-tips-for-difficulty-curve-system-of-an-endless-runner/19973 — ventanas de reacción de ~800 ms para novatos, rampa de 50–100 s, curva escalonada u oscilante. Opinión de un desarrollador.
14. SBGames 2013, artículo sobre generación por trozos para juegos sin fin — https://www.sbgames.org/sbgames2013/proceedings/comp/23-full-paper.pdf — definir una curva de dificultad, generar trozos y evaluarlos antes de insertarlos. Académico; **no pude leer el PDF completo**, solo el resumen del buscador. Junto con guías del género sobre motivos repetidos que se aprenden.
15. Universidad Técnica de Moldavia, trabajo sobre ritmo en juegos — https://repository.utm.md/handle/5014/34859 — equilibrar tensión y descanso, introducir mecánicas poco a poco, evitar saltos bruscos. Solo el resumen.
16. Bugnet, "How to design enemy attack telegraphs" — https://bugnet.io/blog/how-to-design-enemy-attack-telegraphs — avisos claros y con tiempo para que el golpe se sienta culpa del jugador. Blog.
17. TechRadar, sobre Crossy Road — https://www.techradar.com/computing/websites-apps/crossy-road — el águila castiga al que se queda quieto y obliga a moverse. Lo uso como referente de "castigar la pasividad"; aquí se resuelve con las invariantes del generador y no con un castigo aparte.
18. Talking Tom Gold Run, ficha de la tienda — https://apps.apple.com/app/id1089336971 — tres carriles, saltar y deslizarse. **No encontré una fuente que confirme qué pasa al chocar**, así que no lo uso para el modelo de fallo.

Mediciones propias [M]: línea base de la sección 1.1, hecha en `http://localhost:5173` con todos los módulos cargados; dejé el almacenamiento del navegador como estaba.
