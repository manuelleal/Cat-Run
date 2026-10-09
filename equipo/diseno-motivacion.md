# Tinto — diseño de motivación y enganche

Especificación para el agente Lógica. Escrita el 8 de octubre de 2026 por el diseñador de motivación. No se tocó código.
Complementa a `equipo/diseno-bucle.md` (modelo de fallo, patrones de obstáculos, balcones, canecas dentro de la carrera), que escribe otro diseñador en paralelo y que **no pude leer**: no existía cuando terminé. Donde dependo de él lo marco con **[DEP]** y digo qué asumo.

Marcas usadas en todo el documento:

- **[E]** evidencia con fuente (lista numerada al final, sección 13).
- **[E-mem]** conocimiento de manual que cito de memoria y **no volví a verificar hoy**.
- **[C]** criterio mío: una decisión de diseño razonada, no un hecho.
- **[SUP]** supuesto sobre el juego que no medí.
- **[DEP]** depende del otro diseñador.

Todos los números de frecuencia, precio y recompensa son **valores de partida**. Ninguno se probó con personas ni con bots. La sección 9 dice cómo comprobarlos.

---

## 0. Resumen de decisiones

1. **Primero se arregla que se pueda perder.** Nada de este documento sirve si un jugador quieto sobrevive 3 minutos. Criterio de aceptación: un bot que no toca nada muere entre los 20 y los 35 s. [DEP]
2. **Siempre hay una meta pequeña a la vista.** Un renglón fijo bajo el marcador, "próxima meta", muestra lo más cercano entre: caneca, hito de distancia, récord personal, letra del día.
3. **El multiplicador pasa de adorno a regla.** La "racha" de `fx.js` hoy no cambia el puntaje. Pasa a ser un multiplicador x1 a x5 que sube con acciones (no con el tiempo) y baja dos escalones al chocar.
4. **"¡Por un pelo!"**: pasar rozando un obstáculo da puntos, racha, sonido y texto. Es la recompensa por jugar arriesgado.
5. **Tres objetos temporales** (imán, caja-escudo, hierba gatera = doble puntaje), uno cada 18 a 25 s.
6. **Antojos de Tinto**: retos de 10 a 20 s ("atrapa 5 ratones") cada 25 a 35 s. Fallar no quita nada.
7. **El récord se ve en la calle**: una cinta de "TU RÉCORD" cruzada en la vía a la distancia de la mejor marca, y el nombre de a quién se acaba de superar en la tabla.
8. **Perder dura 2 segundos y se vuelve a correr con un toque.** La pantalla de derrota muestra una sola frase de "casi" con el número real (nunca inventado).
9. **Continuar desde la caneca cuesta una sardina**, una vez por partida. Las sardinas solo se ganan jugando. Sin cuenta regresiva, sin monedas, sin anuncios.
10. **Misiones encadenadas** al estilo Jetpack Joyride: siempre 3 activas (2 de una escalera fija, 1 del día), se pagan solas en la pantalla de resultado y dan "huellas" que suben el **nivel de travesura** (20 niveles; cada uno suma +0,1 al multiplicador base).
11. **Palabra del día: T-I-N-T-O.** Cinco letras repartidas en las carreras del día. Es la meta de sesión y de paso enseña el nombre.
12. **Colección "Cosas que Tinto no tumbó"**: 28 objetos que Tinto empuja al pasar. Es su gesto convertido en mecánica y en álbum.
13. **Economía reescalada**: con el modo infinito como centro, los precios actuales se agotan en poco más de una hora de carrera [SUP]. Precios definidos en minutos de carrera y recalculados con la tasa medida.
14. **Panela es amiga en cada texto y sonido**: no "te atrapó", "te alcanzó para saludar". Los lametones se cuentan como logro.
15. **Descartado por ética**: cajas de botín, cuentas regresivas, rachas que se pierden, energía, notificaciones, anuncios, "casi" fabricados, mensajes de culpa. Se añade lo contrario: puntos naturales para parar.

---

## 1. Respuesta directa al dueño: ¿qué es lo adictivo de un juego?

No es una cosa: son siete que trabajan juntas. En lenguaje llano:

**1. Siempre te falta poquito para algo.** Un buen juego nunca te deja sin una meta a punto de cumplirse: la moneda siguiente está a un segundo, el cruce a diez, la misión a tres ratones, el gato nuevo a 40 monedas. La gente se esfuerza más cuanto más cerca ve el premio: en un estudio con tarjetas de café, los clientes compraban más seguido a medida que les faltaban menos sellos [E1], y en otro, a quien le regalaron dos sellos de entrada completó la tarjeta casi el doble de veces (34 % contra 19 %) aunque le faltaban los mismos lavados [E2]. *Jetpack Joyride* tiene siempre tres misiones abiertas; cuando cumples una entra otra [E3]. *Subway Surfers* te pone a juntar las letras de una palabra cada día [E4]. Eso es lo que usted llamó **minimotivación**, y es lo que más le falta a Tinto.

**2. Cada cosa que haces, el juego te contesta.** Tocas y algo salta, suena, brilla. Los diseñadores lo llaman "jugo": dos de ellos mostraron en una charla cómo un juego soso se vuelve irresistible sin cambiarle una sola regla, solo añadiendo rebote, sonido y partículas [E5]; otro mostró lo mismo con sacudida de pantalla y cámara lenta [E6]. Tinto ya tiene bastante de esto en lo visual. En el sonido tiene pitidos.

**3. Está justo en el filo: ni aburre ni aplasta.** Si es muy fácil uno se va (es lo que le pasó a usted: tres minutos sin tocar nada). Si es muy difícil, también. El punto dulce se llama "flujo" [E7]: la dificultad sube al ritmo de tu habilidad. Y la sensación de "yo lo hice, yo mejoré" es de lo que más predice que alguien disfrute un juego y quiera volver [E8].

**4. Perder es rápido, es culpa tuya y fue por poquito.** En *Flappy Bird* mueres en segundos y vuelves a jugar en un toque; quien juega mal quiere borrar la mala partida y quien juega bien quiere superar su marca [E9]. El "casi" empuja a seguir: en un estudio con *Candy Crush*, perder por un movimiento fue lo más frustrante y también lo que más ganas dio de continuar [E10]. (Ojo: no siempre funciona; en otro experimento con carreras el "casi" aburrió [E11]. Y es una palanca que se presta para el abuso; ver sección 10.)

**5. De vez en cuando, una sorpresa.** Si todos los premios son iguales y puntuales, uno se acostumbra. Un premio que a veces sale y a veces no mantiene la atención mucho más que uno fijo [E-mem: programas de razón variable de Skinner]. Un ratón dorado, una calle con sorpresa, un objeto nuevo.

**6. Algo crece aunque pierdas.** Cada partida deja monedas, avance de misión, un objeto para el álbum. En *Temple Run 2* cada objetivo cumplido sube para siempre tu multiplicador, así que tu puntaje mejora aunque tu mano no mejore [E12]. Nunca se juega "en vano".

**7. Le coges cariño a alguien.** *Crossy Road* se volvió enorme coleccionando personajes simpáticos y sin presionar a nadie a pagar [E13]. A Tinto se le quiere por descarado y a Panela por buena gente; eso hay que verlo dentro de la carrera, no solo en el menú.

**Sobre sus dos ideas.** Las dos son correctas y las dos entran:

- *Minimotivación* = el punto 1. Sección 2 completa.
- *Puntos de regeneración, canecas de donde sale el gato* = es un punto de control. Sirve por dos razones: convierte "llegar a la próxima caneca" en una meta cada 15 segundos, y hace que perder no borre todo. Sección 3.

**Qué le pasó a usted, según el código.** [SUP: lo leí, no lo medí] Panela se acerca solo cuando baja la vida (`gapTarget` en `core.js` depende únicamente de `S.health`), la vida solo baja al chocar, y la comida que la sube (ratones +4, gallinas +8, pescado +10) está regada por el camino. No hay nada que apriete con el paso del tiempo. El drenaje sí lo tiene (el cocodrilo llega a los 26 s pase lo que pase) y por eso el drenaje es hoy la parte más tensa del juego. Arreglar eso es del otro diseñador; yo solo pongo la vara: **un jugador que no hace nada debe perder en menos de 35 segundos**.

**"Adictivo" aquí quiere decir que da gusto volver, no que cuesta soltarlo.** La sección 10 dice qué trucos conocidos no se usan y por qué.

---

## 2. Micromotivaciones dentro de la carrera

### 2.0 Presupuesto de eventos

Regla general [C]: cuatro ritmos superpuestos. Si a un ritmo le falta su evento, el generador lo fuerza.

| Ritmo | Cada cuánto | Qué lo llena | Sequía máxima permitida |
|---|---|---|---|
| Chispa | 1 a 3 s | moneda, ratón, obstáculo esquivado | 5 s sin ninguna recogida posible |
| Pequeño | 8 a 12 s | cruce de calle, "por un pelo", cosa tumbada, subir de multiplicador | 20 s |
| Mediano | 20 a 30 s | objeto temporal, antojo, hito, caneca, letra del día | 40 s |
| Raro | 60 a 120 s | ratón dorado, sardina, objeto nuevo del álbum, calle sorpresa | 180 s |

Reglas de convivencia:

1. **Un cartel a la vez.** Todos los carteles (hitos, antojos, "¡Al drenaje!") pasan por una cola con prioridad; mínimo 2,5 s entre uno y otro; los de prioridad baja se descartan si llevan más de 3 s esperando. Hoy `showBanner` pisa el anterior (por eso "¡Al drenaje!" tapó el letrero de salida, según EQUIPO.md).
2. Prioridad de cartel, de mayor a menor: peligro ("¡Busca la escalera!") > récord superado > antojo nuevo > antojo cumplido > hito > subida de multiplicador > resto.
3. **Los primeros 10 s de cada partida no llevan carteles** salvo el del objetivo del nivel.
4. Nada de esto pausa el juego ni quita el control.

### 2.1 Renglón "próxima meta"

- **Qué es:** una línea fija bajo el marcador (donde hoy va `#lvGoal`; en partidas de nivel, el objetivo del nivel ocupa ese sitio y la próxima meta pasa a una pastilla pequeña a su derecha).
- **Qué muestra:** el objetivo más cercano en metros entre estos cuatro, con icono y barra fina de avance:
  - `🗑 caneca en 80 m` [DEP]
  - `🏁 1.000 m en 140 m`
  - `👑 tu récord en 210 m` (solo si falta menos de 400 m)
  - `🔤 letra N en camino` (cuando la letra ya está generada en el tramo actual)
- **Regla de desempate:** récord > caneca > letra > hito.
- **Por qué:** es la traducción directa del gradiente de meta [E1]: el jugador siempre ve un número pequeño que baja.
- **Costo:** bajo. Es un `div` y una resta por cuadro.

### 2.2 Multiplicador de racha

Hoy (`fx.js`, líneas 705 a 729): `combo` sube 1 por cada recogida, se borra a los 2 s sin recoger o al chocar, se muestra desde 3, y no afecta `S.score`. Con 7 monedas por hueco llega a 100 en unos 20 s: no significa nada.

**Regla nueva:**

1. La racha es un contador de **puntos de racha** que solo sube con acciones del jugador:

| Acción | Puntos de racha | Puntos de puntaje (antes de multiplicar) |
|---|---|---|
| Moneda | +1 | 5 (ya es `cfg.scoreCoin`) |
| Ratón o comida (gallina, cangrejo, pescado) | +2 | 25 (ya es `cfg.scoreMouse`) |
| "Por un pelo" (2.3) | +5 | 20 |
| Pasar agachado bajo carro, bus, chiva, cinta o tubo | +5 | 20 |
| Cosa tumbada (7.2) | +5 | 30 |
| Recorrer una tarima completa (5 monedas y pescado) | +8 | 40 |
| Entrar a una calle lateral | +10 | 50 |
| Salir del drenaje por escalera | +10, y +5 por cada escalera que se dejó pasar | 100 |
| Antojo cumplido (2.6) | +15 | 100 |
| Ratón dorado (2.7) | +10 | 150 |
| Metro recorrido | 0 | 1 |

2. **Escalones:** x1 de 0 a 14 puntos, **x2** desde 15, **x3** desde 40, **x4** desde 80, **x5** desde 140. Tope x5.
3. **No caduca con el tiempo.** [C] Un temporizador de 2 s obliga a ir siempre por el carril de las monedas y castiga subirse a una tarima o esquivar bien. Lo que la mantiene es no chocar.
4. **Al chocar** baja **dos escalones** (x5 a x3, x4 a x2, x3 y x2 a x1) y los puntos quedan en el piso del escalón nuevo. [C] Perderlo todo de un golpe invita a rendirse; perder un solo escalón no duele.
5. **Multiplicador total = base × racha.** La base empieza en 1,0 y sube +0,1 por nivel de travesura (4.3), tope 2,9. Se muestra un solo número con un decimal: `x3,6`.
6. **El multiplicador afecta solo al puntaje, no a las monedas de la billetera.** Así la economía no depende de la habilidad extrema.
7. **Ritmo esperado** [SUP: cuenta sobre el generador actual, jugador que recoge la mitad]: unos 3 puntos por segundo; x2 a los 5 s, x3 a los 13 s, x4 a los 27 s, x5 a los 47 s sin chocar. Un jugador medio debería vivir entre x2 y x4.

**En pantalla:** la insignia `fx-combo` existente pasa a mostrar `x3,6` grande, con una barra debajo que se llena hacia el siguiente escalón. Al subir de escalón: golpe de escala (ya existe `comboPunch`), anillo dorado, cartel corto ("x3"), nota musical un tono más alta. Al bajar: la insignia se agrieta, se pone gris 0,4 s y suena un tono descendente. Clase `hot` desde x3 y `fire` en x5 (ya existen, hoy atadas a 20 y 50).

**Cálculo del puntaje:** hoy `end()` hace `S.score = dist + coins*5 + mice*25`. Petición al núcleo: añadir `S.bonus` (se reinicia en `reset()`), y que `end()` lo sume. El módulo de racha acumula `S.bonus += puntos × (mult − 1)` en cada evento y `S.bonus += metros × (mult − 1)` en cada cuadro. Con mult = 1 el resultado es idéntico al actual.

### 2.3 "¡Por un pelo!"

- **Disparador:** un obstáculo con daño pasa a la altura de Tinto sin chocar y se cumple una de tres:
  - **Lateral:** en el cuadro en que el frente del obstáculo (`o.s − o.hl`) cruza `p.s`, la distancia `|o.x − p.x|` está entre `o.hw + 0,4` (el límite de choque actual) y `o.hw + 1,4`. Ocurre cuando Tinto todavía está terminando de cambiar de carril.
  - **Por arriba:** pasa sobre el obstáculo con `p.y − o.y1 < 0,5`.
  - **Por abajo:** pasa agachado bajo un obstáculo con `o.y0 > 0` (esto ya da los +5 de la tabla; no se cobra dos veces).
- **Recompensa:** la de la tabla 2.2. Cada tercer "por un pelo" seguido sin chocar: +1 moneda extra por cada uno acumulado (3, 4, 5…), tope 10.
- **Enfriamiento:** 1,2 s, para que una fila de tres vallas no dé tres.
- **En pantalla:** texto flotante "¡Por un pelo!" (variantes: "¡Uy!", "¡Rozando!", "¡Ni lo tocó!") junto al obstáculo; líneas de velocidad 0,3 s; cámara lenta de 80 ms al 40 % (requiere control de tiempo, sección 6); silbido corto.
- **Frecuencia objetivo:** 2 a 5 por minuto para un jugador medio. Si el bot reactivo saca menos de 1, ampliar la ventana lateral a `+1,8`.
- **[DEP]** Las medidas de choque (`hw + 0,4`) pueden cambiar con el modelo de fallo. La regla se define como "franja de 1 unidad por fuera del límite de choque", cualquiera que sea.
- **Excluidos:** la señora que cruza (su posición oscila y daría falsos positivos) y el cocodrilo jefe.

### 2.4 Hitos de distancia y récord en la calle

**Hitos:** 200, 500, 1.000, 1.500, 2.000 y luego cada 1.000 m.

| Hito | Llega hacia [SUP: sin choques, cfg del modo infinito] | Monedas | Cartel |
|---|---|---|---|
| 200 m | 12 s | 5 | "200 m" |
| 500 m | 27 s | 10 | "¡500 m!" |
| 1.000 m | 47 s | 15 | "¡1 KILÓMETRO!" |
| 1.500 m | 65 s | 20 | "1.500 m" |
| 2.000 m | 81 s | 25 | "¡2 KM! Panela ya suda" |
| 3.000 m en adelante | 108 s, y cada 26 s | 30 cada uno | "N km" |

- En pantalla: cartel, golpe de campo de visión (ya existe para los hitos de combo), tono ascendente de tres notas. Los carteles `MILES` actuales ("¡MIAU-RAVILLOSO!", "¡LEYENDA GATUNA!") se conservan pero se disparan al llegar a x3, x4 y x5 por primera vez en la partida, no al contar recogidas.
- Los hitos solo aplican al modo infinito. En niveles el objetivo ya cumple ese papel.

**Récord en la calle:**

1. Si existe récord de distancia en ese mundo, el generador coloca una **cinta de meta** cruzada en la vía a esa distancia, con el texto "TU RÉCORD". Se atraviesa sin chocar.
2. Al cruzarla: confeti, cartel "¡NUEVO RÉCORD!", fanfarria, cámara lenta de 150 ms. A partir de ahí el número de distancia del marcador se pinta dorado y la próxima meta deja de mostrar récord.
3. **Tabla local:** cuando el puntaje en vivo supera al de una entrada de la tabla, texto flotante "¡Pasaste a Ana!" (o "¡Pasaste tu 3.er mejor!" si la entrada es propia o no tiene nombre). Máximo uno cada 5 s.
4. Se guarda récord de distancia **por mundo** además del puntaje global, para que haya tres marcas que batir.
5. **Primera partida** (sin récord): la cinta dice "200 m — tu primera marca" y se coloca a 200 m. [E2: empezar con avance ya dado]

### 2.5 Objetos temporales

Tres, con nombre de gato. Aparecen como objeto flotante con halo de color, en un carril que obliga a moverse.

| Objeto | Efecto | Duración | Color | Notas |
|---|---|---|---|---|
| **Imán** | Atrae monedas, ratones y comida de los tres carriles | 5 s (mejorable a 9 s) | Azul | Si el gato es Chispa y su imán está activo, suma tiempo en vez de solaparse |
| **Caja** | Tinto corre con una caja de cartón puesta. Absorbe 1 choque: la caja vuela, no se pierde vida ni racha | Hasta el choque o 12 s (mejorable a 20 s) | Café | Es el objeto más "de gato" y el mejor para clips |
| **Hierba gatera** | Doble puntaje (el multiplicador total ×2) y racha que no baja | 8 s (mejorable a 12 s) | Verde | Estela verde y ojos grandes |

Reglas:

1. **Frecuencia:** el siguiente objeto se genera entre 18 y 25 s de carrera después de recoger o dejar pasar el anterior. En la primera partida de la vida del jugador, el primero sale entre los 12 y los 15 s y es una Caja.
2. **Selección:** al azar con pesos Imán 40, Caja 35, Hierba 25; nunca el mismo tres veces seguidas; si la vida está por debajo de 40, la Caja pesa el doble. [C]
3. **No se acumulan del mismo tipo** (recoger otro reinicia el tiempo). Tipos distintos sí conviven.
4. **En pantalla:** icono redondo a la izquierda, a media altura, con anillo que se vacía. Los últimos 2 s parpadea y suena un tic. Al recoger: cartel con el nombre la primera vez en la vida; después solo icono y sonido.
5. **En el drenaje:** solo Imán y Caja. La Caja absorbe un mordisco del cocodrilo.
6. **En niveles** con límite de choques, el choque absorbido por la Caja **no cuenta**.
7. Dejar pasar un objeto no tiene costo ni mensaje.

### 2.6 Antojos de Tinto (retos instantáneos)

Un antojo es un reto corto que aparece en mitad de la carrera. Nombre en pantalla: "¡Antojo!".

| Antojo | Texto | Tiempo | Monedas | Condición para ofrecerlo |
|---|---|---|---|---|
| Ratones | "Atrapa 5 ratones" | 12 s | 20 | Siempre |
| Monedas | "Junta 20 monedas" | 12 s | 15 | Siempre |
| Limpio | "15 segundos sin chocar" | 15 s | 20 | Vida ≥ 30 |
| Rozando | "Pasa 2 veces por un pelo" | 20 s | 30 | Desde la 3.ª partida de la vida |
| Saltarín | "Salta 4 obstáculos" | 15 s | 20 | Siempre |
| Por debajo | "Pasa bajo 2 carros" | 25 s | 30 | Mundo con vehículos |
| Callejero | "Métete a la próxima calle" | hasta el cruce | 25 | Cruce a menos de 120 m con salida lateral |
| Tumbador | "Tumba 2 cosas" | 25 s | 30 | Con 7.2 implementado |
| Goloso | "Come 2 presas" (gallina, cangrejo o pescado) | 20 s | 25 | Mundo con presas |

Reglas:

1. **Frecuencia:** el siguiente antojo aparece entre 25 y 35 s después de que terminó el anterior. El primero de cada partida, no antes de los 20 s. Ninguno en las dos primeras partidas de la vida antes de los 30 s.
2. **Nunca dos a la vez**, ni durante la persecución del cocodrilo cuando falta menos de 8 s para el mordisco, ni con Panela a menos de 3 de distancia. [DEP: umbral de peligro]
3. **Recompensa:** las monedas de la tabla, +15 de racha y 100 puntos. Se paga en el acto con lluvia corta de monedas hacia el contador.
4. **Fallar no quita nada.** El cartel se va con un "Otra vez será" pequeño y sin sonido de error. [C: el público incluye niños; un reto opcional no debe castigar]
5. **En pantalla:** pastilla bajo el marcador con icono, contador (`3/5`) y una barra de tiempo que se vacía. Al aparecer, cartel "¡Antojo!" de 1 s. La barra de tiempo se pone naranja en el último tercio; no hay sonido de alarma.
6. **Dificultad:** meta de acierto entre 55 % y 75 %. Si un antojo queda fuera de ese rango en el banco de bots, se ajusta la cantidad, no el tiempo.
7. El generador ayuda sin trampa: al lanzar "Atrapa 5 ratones", las dos filas siguientes incluyen al menos 3 ratones cada una.

### 2.7 Eventos raros

| Evento | Qué pasa | Recompensa | Frecuencia |
|---|---|---|---|
| **Ratón dorado** | Corre por delante 4 s cambiando de carril dos veces | 10 monedas, +10 de racha, 150 puntos | Probabilidad de 1 en 40 por fila; mínimo 45 s entre dos |
| **Sardina** | Lata brillante en un sitio con riesgo: final de tarima, drenaje, calle sorpresa | 1 sardina (3.3) | 1 cada 150 s de carrera en promedio; ninguna si ya tiene 5 |
| **Objeto nuevo del álbum** | Una cosa tumbable que aún no tiene (7.2) | Entrada al álbum, 30 monedas | Ver 7.2 |
| **Calle sorpresa** | Calle lateral marcada con "?" | Ver 2.9 | 1 de cada 5 calles laterales |

Regla de honestidad [C]: todo lo raro se gana corriendo; nada raro se compra, ni con monedas. No hay ruleta, ni caja que se abra, ni premio cuyo contenido se revele después de pagar algo.

### 2.8 El drenaje como apuesta

Hoy: abajo hay el doble de ratones, no está Panela, el cocodrilo muerde a los 26 s (45 de vida) y hay escalera cada 110 m. A unos 20 m/s son 4 o 5 escaleras antes del primer mordisco.

**Regla nueva: el botín del drenaje.**

1. Al caer aparece un saco con contador: "Botín ×1". Todo lo que se recoge abajo (monedas y ratones) se suma al saco además de contarse normal.
2. Cada escalera que el jugador **deja pasar** sube el factor: ×1, ×1,5, ×2, ×2,5, tope ×3.
3. Al subir por una escalera se cobra el **extra**: `monedas del saco × (factor − 1)`, redondeado. Cartel "¡Botín! +N 🐾" con conteo.
4. Si el cocodrilo muerde, el factor vuelve a ×1. **Lo ya recogido no se pierde nunca**; solo se pierde el extra que estaba en juego.
5. En pantalla: el saco a la izquierda; al pasar una escalera sin tomarla, el saco hace un salto y muestra el factor nuevo. Cuando el cocodrilo está a menos de 4, el cartel existente "¡Busca la escalera!".
6. Tope del extra por visita: 60 monedas.

Por qué funciona [C]: convierte la escalera en una decisión cada 5 o 6 segundos ("¿salgo ya o aguanto una más?"). Es riesgo de habilidad: no hay azar ni se paga por entrar. Es el mismo principio de la calle lateral, pero con reloj.

Ajuste pedido a quien toque el drenaje: la alcantarilla verde debe poder **evitarse y elegirse** con claridad. Hoy cae en un carril al azar; conviene que nunca esté en el carril por el que el generador obliga a pasar.

### 2.9 Las calles laterales como apuesta

Hoy: cada tramo mide 165 a 230 m (un cruce cada 7 a 12 s), el 35 % de los tramos son "bono" con el doble de ratones, y el jugador no sabe cuál es cuál antes de girar.

**Regla nueva: letrero en la esquina.** Cada salida lateral lleva un letrero grande, visible desde 60 m (la misma distancia a la que aparece el botón GIRAR), con un icono:

| Tipo | Icono | Qué tiene | Proporción |
|---|---|---|---|
| Ratonera | 🐭 | Doble de ratones (el `seg.bonus` actual) | 35 % |
| Callejón de monedas | 🐾 | Doble de monedas, una fila de obstáculos más densa | 30 % |
| Atajo | 💨 | Tramo corto de 120 m casi sin obstáculos; Panela queda a distancia máxima al salir | 15 % |
| Sorpresa | ❓ | Una de las tres anteriores, más un evento raro garantizado (ratón dorado o sardina) | 20 % |

1. Seguir derecho es siempre la opción neutra: generador normal.
2. Girar da +10 de racha y 50 puntos (tabla 2.2).
3. El botón GIRAR muestra el mismo icono del letrero.
4. La calle sorpresa nunca es peor que una calle normal. No hay calle "trampa". [C]
5. El resultado de la sorpresa se decide al generar el tramo, no al entrar, y no depende de nada que el jugador haya pagado o hecho.

### 2.10 Qué se ve en pantalla (presupuesto para celular vertical, 360 px de ancho)

| Zona | Contenido | Estado |
|---|---|---|
| Arriba | Pausa, vida, distancia, ratones, monedas | Existe |
| Renglón 2 | Próxima meta (2.1) u objetivo del nivel | Nuevo o existe |
| Renglón 3, solo si hay | Antojo activo con barra | Nuevo |
| Izquierda, altura media | Iconos de objetos activos; saco del drenaje | Nuevo |
| Derecha, arriba | Multiplicador (reemplaza `fx-combo`) | Se modifica |
| Abajo, lados | Botones GIRAR | Existe |
| Abajo, derecha | Botón de habilidad del gato | Existe |
| Centro | Carteles (uno a la vez) y textos flotantes | Existe |

Límite [C]: nunca más de 3 elementos nuevos visibles a la vez además del marcador. Si hay antojo activo, la próxima meta se reduce a icono y número.

---

## 3. El momento de perder y el "una más"

### 3.1 Línea de tiempo de una derrota

| Momento | Qué pasa | Estado |
|---|---|---|
| 0,0 s | Panela alcanza a Tinto. Cámara lenta 250 ms al 30 %. Corte de música | Nuevo (requiere control de tiempo) |
| 0,0 a 1,3 s | Salto de Panela, "¡LAMETÓN!", barras de cine, órbita de cámara | Existe (`updateDying`, `fx.js`) |
| 1,3 s | Aparece el panel | Existe |
| 1,8 s | Los botones aceptan toques (hoy 2,0 s: `ui.guard` de 700 ms; bajar a 500) | Ajuste |
| ≤ 2,5 s | Con un toque, Tinto ya está corriendo | Ver 3.4 |

Regla: **entre que lo alcanzan y que puede volver a correr pasan como máximo 2 segundos.** Todo lo demás del panel (conteos, barras) se anima encima sin bloquear.

### 3.2 Qué muestra el panel, de arriba abajo

1. **Título con carácter**, una frase al azar de 7.4 (no siempre "¡Panela te alcanzó!").
2. **La frase de "casi"**: una sola, la más cercana a cumplirse, con su barra. Se elige así:

| Prioridad | Condición | Frase |
|---|---|---|
| 1 | Récord nuevo | "¡Nuevo récord! 3.420 puntos" (sin barra, con confeti) |
| 2 | Puntaje ≥ 80 % del récord | "Te faltaron **85 puntos** para tu récord" |
| 3 | Una misión al ≥ 70 % | "Te faltan **3 ratones** para la misión" |
| 4 | Letras del día: falta 1 | "Te falta la **O** para completar TINTO" |
| 5 | Monedas ≥ 80 % del siguiente gato o mejora | "Te faltan **40 🐾** para Mango" |
| 6 | Huellas: falta 1 para subir de nivel | "Una misión más y subes a nivel 4" |
| 7 | Nada de lo anterior | "Corriste **640 m**. Tu mejor: 1.210 m" |

   **Regla de honestidad:** los números son los reales. Si nada está cerca, no se finge cercanía (fila 7). El generador **nunca** ajusta la dificultad para que la derrota caiga cerca del récord. [E10 explica por qué funciona; por eso mismo no se fabrica]

3. **Lo ganado en esta partida**: monedas con conteo hacia la billetera (ya existe `countUp`), y las tres misiones con su barra avanzando. Una misión cumplida se paga aquí mismo, sin ir a otra pantalla.
4. **Botones** (3.4).
5. **Compartir** y la tabla local, debajo, sin robar el foco. El campo de nombre no debe abrir el teclado solo.

### 3.3 Continuar desde la caneca

**[DEP]** Asumo que el otro diseñador coloca canecas de basura en la calle cada 300 a 400 m, que pasar junto a una la marca como "última caneca", y que la primera aparece antes de los 250 m. Si la separación es otra, las reglas no cambian.

**Reglas:**

1. **Qué hace:** Tinto sale de una caneca (la tapa vuela, él asoma mirando a los lados, Panela está oliendo para el otro lado) y sigue corriendo.
2. **Dónde queda:** la **distancia** vuelve a la de la última caneca. Monedas, ratones, objetos del álbum, letras y avance de misiones **se conservan**. El multiplicador vuelve a x1. Vida 60. Panela a distancia máxima. 2 s de invulnerabilidad. Si lo atraparon en el drenaje, sale a la calle.
3. **Cuánto cuesta:** **1 sardina**.
4. **Cuántas veces:** **una por partida.**
5. **De dónde salen las sardinas:** solo de jugar. Empieza con 2. Tope de 5 guardadas.

| Fuente | Sardinas |
|---|---|
| Recogida rara en carrera (2.7) | 1 cada ~150 s de carrera |
| Completar la palabra del día (4.4) | 1 |
| Subir de nivel de travesura (4.3) | 1 |
| Días 3 y 5 del regalo (4.6) | 1 |

6. **Si no tiene sardinas o no pasó ninguna caneca:** el botón no aparece. No hay botón gris, ni "consigue más", ni oferta. Solo una línea pequeña la primera vez: "Las sardinas salen en tarimas, drenaje y calles sorpresa".
7. **Sin cuenta regresiva.** El botón se queda ahí hasta que el jugador elija. *Temple Run 2* muestra su "Sálvame" unos 2 segundos y lo quita [E12]; eso es presión por tiempo y aquí se descarta (sección 10).
8. **En niveles:** se puede continuar si se perdió por Panela. Los choques ya contados y el reloj no se devuelven. Si se perdió por límite de choques o de tiempo, no hay continuar.
9. **Nube** ("Siete vidas", revive una vez) funciona antes: su habilidad revive en el sitio y sin costo; la caneca queda disponible después.

**Por qué no se siente como castigo ni como cobro** [C]:

- No se paga con monedas: las monedas son para gatos y mejoras, y gastarlas en continuar haría que el jugador se arrepintiera después.
- No se paga con dinero ni con anuncios: no existen en el juego.
- La sardina se **encontró** corriendo, así que usarla se siente como gastar algo propio que para eso era.
- No hay reloj, no hay botón apagado, no hay mensaje si falta.
- Lo que se pierde al continuar es poco y claro (los metros desde la caneca y el multiplicador), y lo recogido no se toca.
- Es una vez por partida: no se puede "comprar" un récord a punta de sardinas.

**Alternativa más simple** (para decidir, ver dudas): continuar gratis una vez por partida si pasó una caneca, sin sardinas. Menos trabajo, pero convierte toda partida en una de dos vidas y la decisión desaparece. Recomiendo sardinas; si se quiere probar rápido, empezar por la versión gratis y medir cuántas derrotas terminan en continuar: si pasa de 80 %, la decisión es trivial y hay que poner sardinas.

**Peticiones al núcleo:** una función `game.revive({ dist, health })` que reconstruya un tramo limpio delante de Tinto (los tramos de atrás ya se borraron, así que no se vuelve físicamente al lugar de la caneca: se genera calle nueva y se corrige el número de distancia), y que la partida guarde la distancia de la última caneca.

### 3.4 Botones y toques

| Situación | Botón principal (grande, verde, Enter y Espacio) | Secundarios |
|---|---|---|
| Modo infinito, sin continuar disponible | **↻ Otra vez** | Mapa, Compartir |
| Modo infinito, con continuar disponible | **↻ Otra vez** | **🗑 Salir de la caneca (1 🐟)** en dorado, arriba del principal; Mapa, Compartir |
| Nivel perdido | **↻ Reintentar** | Caneca si aplica; Mapa |
| Nivel ganado | **Siguiente ▶** | Reintentar, Mapa |

1. **Un toque** en el principal y Tinto corre. Sin pantalla intermedia, sin ficha de nivel, sin confirmación.
2. Al reintentar, la entrada (7.1) dura como máximo 0,6 s y cualquier toque la salta.
3. Los dos botones (Otra vez y Caneca) tienen el **mismo tamaño**. No se usa el truco del botón grande para lo que le conviene al juego y el chiquito para lo otro. [E14]
4. No hay reinicio automático: volver a correr siempre exige un toque del jugador. [C: ver 10]
5. Desde la pausa, "Reintentar" ya reinicia en un toque. Se conserva.

**Arranque en frío** (hoy: Inicio → Cómo se juega → Mapa → ficha → Correr = 4 a 5 toques):

6. **Primera vez en la vida:** un toque en "Jugar" lleva directo al nivel 1-1, con las instrucciones como indicaciones dentro de la carrera (flecha "desliza" sobre el primer obstáculo, el juego en cámara lenta hasta que el jugador lo haga). La pantalla "Cómo se juega" queda como botón de ayuda.
7. **Las demás veces:** el botón grande del inicio dice "▶ Correr" y arranca lo último que se jugó (modo infinito o el siguiente nivel pendiente). El mapa queda en un botón secundario.

---

## 4. Metas de sesión y de largo plazo

### 4.1 Revisión crítica de lo que existe

| Sistema | Veredicto | Motivo |
|---|---|---|
| 15 niveles con estrellas | **Conservar** | Son un buen tutorial largo y dan metas claras. Se acaban en una tarde (lo dice su propio autor en `niveles.md`); no pueden ser la meta de largo plazo |
| Puertas de mundo (8 y 20 estrellas) | **Conservar** | Obligan a repetir con propósito. El aviso "te faltan N ⭐" ya existe |
| Objetivos de estrella (choques, tiempo, vida) | **Ajustar** | Revisar después del modelo de fallo nuevo [DEP]: "0 choques" puede volverse imposible o trivial |
| Modo infinito | **Ajustar: pasa a ser el centro** | Hoy es un botón pequeño al final del mapa. Es donde viven el récord, el multiplicador y los antojos |
| 3 misiones diarias | **Ajustar** | Solo se ven entrando a otra pantalla, se cobran a mano y cuando se acaban no hay más hasta mañana. Pasan a encadenadas (4.2) |
| Regalo diario con racha | **Ajustar** | La racha vuelve a 1 si se falta un día: castiga la ausencia. Pasa a ciclo que no retrocede (4.6) |
| Tienda de 7 gatos | **Conservar, reprecio** | Única salida de monedas. Con el modo infinito al centro se agota muy rápido (4.7) |
| Billetera 1 a 1 | **Conservar** | Una sola moneda, sin conversiones |
| Tabla de puntajes local | **Conservar, sacarle provecho** | Alimenta "¡Pasaste a Ana!" (2.4) |
| Compartir | **Ajustar** | Hoy es solo texto. Ver 7.5 |

**Qué falta:** misiones que no se acaben, nivel de cuenta, meta diaria con cierre ("listo por hoy"), colección, mejoras pequeñas, récords visibles, logros. Y algo para **Tinto**: hoy todo lo que se compra es otro gato, cuando los tres pensadores pidieron que el protagonista sea él.

### 4.2 Misiones encadenadas

Modelo: *Jetpack Joyride* mantiene 3 misiones activas; al cumplir una entra otra, y cada una vale de 1 a 3 estrellas que suben un rango [E3]. Un análisis externo señala que la mezcla de misiones cortas (30 s a 2 min) y largas (10 a 30 min) le da a cada jugador una meta para el tiempo que tenga [E3, lectura de un tercero, no del estudio].

**Reglas:**

1. Siempre hay **3 misiones activas**: casillas A y B salen de una **escalera fija** de 36 misiones; la casilla C es la **misión del día**.
2. Al cumplir A o B, se paga en la pantalla de resultado y entra la siguiente de la escalera. Dentro de la carrera, al cumplirse sale un aviso pequeño "✔ Misión".
3. La misión del día se elige por fecha entre las 8 que ya existen en `MISSIONS` (con las cantidades de hoy). Al cumplirla, la casilla muestra **"✔ Listo por hoy"** hasta medianoche.
4. Se puede **cambiar** una misión de la escalera por la siguiente, gratis, una vez al día. [C: una misión que no gusta no debe bloquear]
5. Cada misión da monedas y **huellas** (1, 2 o 3 según el grupo).
6. Al terminar las 36, la escalera se repite con cantidades ×1,5 (redondeadas a 5) y las mismas huellas.
7. Las tres misiones se ven en: la pantalla de pausa, la pantalla de resultado y la ficha previa a la carrera. No hace falta entrar a "Misiones" para saber qué se persigue.

**La escalera** (alcance: P = en una sola partida, T = total acumulado):

| # | Misión | Alc. | Huellas | Monedas |
|---|---|---|---|---|
| 1 | Corre 300 m | P | 1 | 60 |
| 2 | Atrapa 10 ratones | P | 1 | 60 |
| 3 | Junta 150 monedas | T | 1 | 60 |
| 4 | Entra a 2 calles laterales | P | 1 | 60 |
| 5 | Llega a x2 | P | 1 | 60 |
| 6 | Pasa 3 veces por un pelo | T | 1 | 60 |
| 7 | Recoge 2 objetos temporales | P | 1 | 60 |
| 8 | Sal del drenaje por una escalera | T | 1 | 60 |
| 9 | Sube a 2 tarimas | P | 1 | 60 |
| 10 | Tumba 5 cosas | T | 1 | 60 |
| 11 | Cumple 2 antojos | T | 1 | 60 |
| 12 | Pasa agachado bajo 3 vehículos | T | 1 | 60 |
| 13 | Corre 800 m | P | 2 | 100 |
| 14 | Atrapa 25 ratones | P | 2 | 100 |
| 15 | Llega a x3 | P | 2 | 100 |
| 16 | Corre 400 m sin chocar | P | 2 | 100 |
| 17 | Pasa 4 veces por un pelo | P | 2 | 100 |
| 18 | Entra a una calle sorpresa | T | 2 | 100 |
| 19 | Sal del drenaje con botín ×2 | T | 2 | 100 |
| 20 | Atrapa un ratón dorado | T | 2 | 100 |
| 21 | Cumple 3 antojos en una partida | P | 2 | 100 |
| 22 | Come 6 presas | P | 2 | 100 |
| 23 | Usa la Caja para salvarte de un choque | T | 2 | 100 |
| 24 | Completa la palabra del día | T | 2 | 100 |
| 25 | Corre 1.500 m | P | 3 | 150 |
| 26 | Haz 2.500 puntos | P | 3 | 150 |
| 27 | Llega a x5 | P | 3 | 150 |
| 28 | Corre 800 m sin chocar | P | 3 | 150 |
| 29 | Entra a 5 calles laterales | P | 3 | 150 |
| 30 | Sal del drenaje con botín ×3 | T | 3 | 150 |
| 31 | Pasa 8 veces por un pelo | P | 3 | 150 |
| 32 | Corre 1.000 m en cada uno de los 3 mundos | T | 3 | 150 |
| 33 | Tumba 10 cosas en una partida | P | 3 | 150 |
| 34 | Bate tu récord | T | 3 | 150 |
| 35 | Corre 2.500 m | P | 3 | 150 |
| 36 | Recibe 3 lametones… sin querer (pierde 3 veces) | T | 3 | 150 |

Notas: la 36 existe a propósito [C]: perder también avanza algo, y refuerza que Panela es cariñosa. La 5, 6 y 7 enseñan los sistemas nuevos. Si un sistema aún no está implementado, sus misiones se saltan.

**Tiempos esperados** [SUP]: grupo 1 (misiones 1 a 12), una misión cada 1 a 2 partidas; grupo 2, cada 2 a 3; grupo 3, cada 3 a 6.

### 4.3 Nivel de travesura (objetivo de cuenta)

1. **6 huellas** por nivel, siempre. Niveles 1 a 20.
2. La escalera completa da 72 huellas; con la misión del día (1 huella) y las repeticiones, llegar al nivel 20 (114 huellas) pide unas 60 misiones. [SUP: unas 90 partidas, 12 a 15 sesiones]
3. **Cada nivel da:** `100 + 20 × nivel` monedas, 1 sardina, **+0,1 al multiplicador base** y un título.
4. **Niveles 4, 8, 12, 16 y 20:** además, un **pañuelo nuevo para Tinto** (4.5).
5. En pantalla: barra de huellas en el inicio, junto a la billetera, con el título. Al subir: pantalla breve de celebración dentro del resultado (no una pantalla aparte que haya que cerrar).

| Nivel | Título | Nivel | Título |
|---|---|---|---|
| 1 | Gato de andén | 11 | Rey del callejón |
| 2 | Curioso | 12 | Fantasma de la cuadra |
| 3 | Tumbavasos | 13 | Siete mañas |
| 4 | Gato de tejado | 14 | Leyenda del barrio |
| 5 | Escurridizo | 15 | El que no fue |
| 6 | Robagallinas | 16 | Maestro del descaro |
| 7 | Sombra de la esquina | 17 | Terror de las materas |
| 8 | Cola alzada | 18 | Compadre de Panela |
| 9 | Pura travesura | 19 | Inocente profesional |
| 10 | Uña fina | 20 | Tinto no hizo nada |

Por qué el multiplicador base [E12, C]: hace que el récord se pueda batir aunque la mano no mejore más. Es lo que mantiene vivo un runner después de la segunda semana. La tabla es local, así que no hay injusticia entre jugadores.

### 4.4 Palabra del día

Modelo: la "caza de palabras" diaria de *Subway Surfers* [E4].

1. Cada día hay una palabra: **TINTO** los días impares del mes, **PANELA** los pares. [C: son las dos marcas]
2. Las letras aparecen **en orden**, flotando en un carril, una cada 25 a 35 s de carrera. Se conservan entre partidas del mismo día. Dejar pasar una no la pierde: vuelve a salir a los 15 s.
3. En el marcador: las letras en gris, que se van encendiendo. En la pantalla de resultado, lo mismo en grande.
4. **Premio al completar:** 150 monedas, 1 sardina, y cuenta para la misión 24.
5. Tiempo esperado: TINTO, unos 2,5 min de carrera (2 a 3 partidas); PANELA, unos 3 min.
6. Al completarla: "✔ Palabra de hoy". No hay segunda palabra el mismo día.
7. **No hay racha de días.** Faltar un día no cambia nada y ningún texto lo menciona.

### 4.5 Colección y pañuelos (cosas para Tinto, no solo otros gatos)

**Álbum "Cosas que Tinto no tumbó"**: 28 objetos (8 por mundo y 4 del drenaje). Mecánica en 7.2.

| Mundo | Objetos |
|---|---|
| Pueblo | Pocillo, matera, florero, vaso de leche, pila de libros, balde de pintura, torre de latas, pecera vacía |
| Costa | Coco, castillo de arena, sombrilla, balde de playa, pelota, vaso de raspado, caña de pescar, tabla |
| Ciudad | Cono, celular, dron estacionado, letrero, café para llevar, patineta, caja de pizza, maleta |
| Drenaje | Linterna, bota de caucho, patito de hule, casco |

1. Cada objeto nuevo: 30 monedas y su ficha con una frase ("Florero. Se cayó solo. Tinto estaba mirando para otro lado.").
2. Completar un mundo (8 objetos): 200 monedas y un pañuelo. Completar el drenaje: 150 monedas.
3. El álbum muestra siluetas de lo que falta y en qué mundo sale. Sin "raros" ocultos.
4. **Garantía:** cuando sale una cosa tumbable, tiene 50 % de ser una que falta; si las tres últimas fueron repetidas, la siguiente es nueva sí o sí.
5. Tiempo esperado [SUP]: los 8 de un mundo en unos 12 a 15 min de carrera en ese mundo.

**Pañuelos de Tinto** (solo cambian el color o estampado del pañuelo; el rojo sigue siendo el de marca y el de todas las imágenes de afuera):

| Pañuelo | Cómo se obtiene |
|---|---|
| Rojo de lunares | Desde el inicio |
| Azul, verde, amarillo, morado, dorado | Niveles de travesura 4, 8, 12, 16, 20 |
| Tres estampados de mundo (flores, olas, neón) | Completar el álbum de cada mundo |

Los pañuelos **no se compran**. [C: lo de Tinto se gana jugando; lo que se compra son amigos y mejoras]

### 4.6 Regalo diario

1. Ciclo de 5 pasos que **avanza cada día que se entra y nunca retrocede**: 60, 90, 120 + sardina, 150, 200 + sardina. Después del quinto vuelve al primero.
2. El texto dice "Regalo 3 de 5". No dice "racha", no dice "no pierdas", no dice cuántas horas faltan.
3. Se cobra desde el inicio con un toque sobre el propio regalo (no hace falta entrar a Misiones).

### 4.7 Economía: precios y tiempos

**El problema** [SUP, hay que medirlo]: `niveles.md` calculó los precios con ~30 monedas por minuto de sesión. Pero en modo infinito el bot recoge ~13 monedas por 100 m; una persona que recoja la mitad, a unos 1.500 m por minuto, saca cerca de **100 monedas por minuto de carrera**. Con los precios de hoy (6.800 en total) se compran los siete gatos en poco más de una hora corriendo.

**Regla:** los precios se definen en **minutos de carrera** y se convierten con la tasa medida `R` (monedas por minuto de carrera del bot reactivo, incluyendo hitos, antojos y botín). Redondear a 50.

| Compra | Minutos de carrera | Precio provisional (R = 100) | Precio hoy |
|---|---|---|---|
| Mango | 3 | 300 | 150 |
| Pluma | 9 | 900 | 400 |
| Bola | 18 | 1.800 | 750 |
| Chispa | 30 | 3.000 | 1.200 |
| Sombra | 40 | 4.000 | 1.800 |
| Nube | 50 | 5.000 | 2.500 |
| **Total gatos** | **150** | **15.000** | 6.800 |

- **Mango debe caer en la primera sesión**, hacia la 3.ª o 4.ª partida. La primera compra pronto es más importante que el precio de las últimas. [C]
- Si la medición da `R` muy distinto de 100, se cambian los precios, no la densidad de monedas: las monedas son también el camino que guía y el "jugo" de recoger.

**Mejoras permanentes pequeñas** (segunda salida de monedas; pocas, visibles y sin azar):

| Mejora | Paso 1 | Paso 2 | Paso 3 | Paso 4 | Paso 5 |
|---|---|---|---|---|---|
| Imán: duración | 6 s | 7 s | 8 s | 8,5 s | 9 s |
| Caja: duración | 14 s | 16 s | 18 s | 19 s | 20 s |
| Hierba gatera: duración | 9 s | 10 s | 11 s | 11,5 s | 12 s |
| **Precio de cada paso** | 200 | 400 | 700 | 1.100 | 1.600 |

Total: 4.000 por mejora, 12.000 las tres (120 minutos de carrera con R = 100). Se compran en la misma tienda, pestaña "Mejoras". Cada paso se nota en pantalla (el anillo del icono dura más).

**Recompensas reescaladas** (×3 sobre las actuales, para que conserven su peso frente a la recogida):

| Entrada | Hoy | Nuevo |
|---|---|---|
| Primera vez que se pasa un nivel | 20 + 5 × posición | 60 + 15 × posición |
| Estrella nueva | 10 | 30 |
| Misión del día | 30 a 60 | 100 a 150 |
| Regalo diario | 20 a 60 | 60 a 200 |

**Tiempos esperados** [SUP: R = 100, sesiones de 8 min con 55 % del tiempo corriendo, ~450 monedas de carrera más ~250 de misiones y regalos por sesión]:

| Meta | Cuándo |
|---|---|
| Primer gato (Mango) | Sesión 1 |
| Primera mejora | Sesión 1 o 2 |
| Pluma | Sesión 2 o 3 |
| Mundo 2 abierto | Sesión 2 |
| Primer pañuelo (nivel 4) | Sesión 3 o 4 |
| Todos los niveles | Sesión 4 a 6 |
| Bola, Chispa | Sesiones 5 a 12 |
| Todos los gatos | Sesión 20 a 25 |
| Nivel 20, álbum completo, todas las mejoras | Sesión 35 a 45 |

Riesgo que ya señaló `niveles.md` y sigue en pie: repetir niveles fáciles para juntar monedas. Con la recogida 1 a 1 no hay forma barata de impedirlo; se acepta.

### 4.8 Récords personales visibles

En el inicio, bajo la billetera, una franja con tres marcas: **mejor puntaje**, **más lejos** (con icono del mundo) y **mejor multiplicador**. Al batir cualquiera en una partida, la franja la resalta la próxima vez que se vea el inicio.

En la ficha del modo infinito de cada mundo: su récord de distancia y "la cinta te espera a los 1.210 m".

### 4.9 Logros

Doce, con tres grados cada uno. Cada grado da 50, 100 y 200 monedas. Sin fecha límite.

| Logro | Bronce | Plata | Oro |
|---|---|---|---|
| Metros recorridos | 5.000 | 25.000 | 100.000 |
| Ratones atrapados | 100 | 500 | 2.000 |
| Cosas tumbadas | 25 | 150 | 600 |
| Lametones de Panela | 10 | 50 | 200 |
| Veces "por un pelo" | 25 | 150 | 600 |
| Escapes del drenaje | 5 | 25 | 100 |
| Calles laterales | 20 | 100 | 400 |
| Antojos cumplidos | 10 | 60 | 250 |
| Canecas usadas | 3 | 15 | 50 |
| Palabras del día | 3 | 15 | 60 |
| Estrellas | 15 | 30 | 45 |
| Mejor multiplicador en una partida | x3 | x5 | x5 con hierba gatera |

"Lametones de Panela" es deliberado [C]: vuelve trofeo la derrota y dice que Panela quiere a Tinto.

### 4.10 Guardado

Todo en la clave existente `catRunSave`, subiendo `v` a 2. Campos nuevos sugeridos: `sard`, `huellas`, `nivel`, `mis` (índices A y B, avance, cambio usado hoy), `palabra` (día, letras), `album` (lista de ids), `mejoras` (tres enteros de 0 a 5), `pañuelo`, `logros` (contadores), `rec` (por mundo), `regalo` (paso de 1 a 5, día). Migración: si `v` es 1, convertir la racha de regalo a paso 1 y conservar billetera, estrellas y gatos.

---

## 5. Curva emocional de una partida de 60 a 120 segundos

Principio [E7; E-mem: el "director" de *Left 4 Dead* alterna subida, pico y descanso]: la tensión sube en oleadas, y cada oleada termina en un respiro con premio. Nunca más de 20 s seguidos de presión ni más de 8 s seguidos de calma.

| Segundo | Qué siente | Qué pasa | Quién lo garantiza |
|---|---|---|---|
| 0 a 2,5 | Risa | Entrada: Tinto tumba algo, Panela despierta (7.1). Saltable | Este documento |
| 2,5 a 6 | "Ya estoy jugando" | Calle despejada, fila de monedas al frente. **Primera recompensa antes del segundo 4** | Generador |
| 6 a 12 | "Entendí" | Primer obstáculo, de un solo carril. Primer ratón. Hito de 200 m | Generador [DEP] |
| 12 a 18 | "¡Uy, qué es eso!" | Primer objeto temporal (12 a 15 s en la primera partida de la vida; 18 a 25 después). Primer cruce hacia los 11 s | 2.5 |
| 18 a 30 | Confianza | Sube a x2 y x3. Primera cosa tumbable. Primer antojo entre 20 y 25 s | 2.2, 2.6 |
| 25 a 35 | **Primer susto** | Panela se acerca de verdad: jadeo, cámara que sube, borde rojo. Debe pasar aunque el jugador no haya chocado | [DEP] modelo de fallo |
| 35 a 45 | Alivio | Tramo fácil con monedas; caneca; hito de 1.000 m hacia el 47 | Generador, 2.4 |
| 45 a 75 | Flujo | Velocidad media-alta, patrones de dos acciones, antojos, drenaje o calle lateral como decisión | Todo |
| 60 a 90 | **Pico** | Zona donde debe caer la derrota de un jugador nuevo a partir de su 3.ª partida | [DEP] |
| 90 a 120 | "Estoy en racha" | Velocidad máxima (38 a los 100 s), x4 o x5, la cinta del récord a la vista | 2.4 |
| 120 + | Maestría | Solo llegan los buenos; cada hito es de 1 km | — |

Reglas de dosificación:

1. **Primera recompensa:** una moneda recogida antes de los 4 s de control. Hoy el primer tramo empieza a poblarse a los 50 m (unos 3 s), así que casi se cumple; verificar que la primera fila sea de monedas y esté en el carril central.
2. **Primer susto:** entre los 25 y los 35 s. Antes de los 20 s nada debe poder matar al jugador en su primera partida.
3. **La primera partida de la vida** dura al menos 40 s aunque el jugador sea torpe (generador más suave; no un escudo invisible). [C]
4. **Respiros con premio:** después de cada cruce, de cada salida del drenaje y de cada caneca, los siguientes 30 m no llevan obstáculos y sí monedas. (El cruce ya deja 34 m libres al inicio del tramo.)
5. **Después de un choque**, 1,5 s sin obstáculo nuevo en el carril de Tinto: que no encadene dos golpes sin poder reaccionar. La invulnerabilidad actual de 1,2 s ya cubre casi todo.
6. **El final debe sentirse justo:** la derrota llega por un obstáculo que se vio venir. Nada aparece a menos de 0,8 s de reacción. [DEP]
7. **Duración objetivo** de una partida para un jugador con media hora de experiencia: mediana 60 a 90 s. [C; ver 9]

---

## 6. Respuesta sensorial

### 6.1 Lo que hay

**Visual (bien):** estirar y aplastar al saltar y caer, inclinación al cambiar de carril, polvo en las patas, destellos y anillo al recoger, "+1" flotante, sacudida, destello rojo, golpe de campo de visión y voltereta al chocar, líneas de velocidad, barras de cine y órbita al perder, confeti al ganar. Aviso del propio autor en `animacion.md`: nada de esto se vio en movimiento; los sentidos de inclinación pueden estar invertidos.

**Sonido (pobre):** una sola función `sfx` que emite un oscilador con caída. Once pitidos en total. La moneda sube de tono en un ciclo de 6 (`880 + (S.coins % 6) * 90`), que es buena idea pero no está atada a nada.

**No existe:** música, sonido ambiente, pasos, voz de Tinto o de Panela (el ladrido son dos tonos de sierra), sonido de peligro, vibración, congelado de impacto, cámara lenta, botón de silencio.

### 6.2 Eventos y su respuesta, por prioridad

| P | Evento | Visual | Sonido | Estado hoy |
|---|---|---|---|---|
| 0 | **Choque** | Congelado de 70 ms; lo demás ya existe | Golpe grave con ruido, no solo tono | Falta el congelado; sonido pobre |
| 0 | **Recoger en racha** | Ya existe | La nota sube un semitono por recogida seguida (hasta 12) y vuelve a la base si pasan 1,5 s o hay choque | Sube en ciclo fijo, sin relación con la racha |
| 0 | **Por un pelo** | Texto, líneas de velocidad, cámara lenta 80 ms | Silbido de aire | No existe |
| 0 | **Subir de multiplicador** | Golpe de insignia, anillo, cartel | Acorde ascendente; cada escalón más agudo | Solo carteles por cantidad |
| 0 | **Bajar de multiplicador** | Insignia agrietada | Tono descendente corto | Solo "¡Racha perdida!" |
| 0 | **Panela cerca** | Borde rojo (existe), cámara que sube (existe), corazones o signos sobre Panela | Jadeo y patas que se aceleran con la cercanía; es el aviso principal para quien no mira el borde | Sin sonido |
| 0 | **Derrota** | Cámara lenta 250 ms; lo demás existe | Corte de música, lametón húmedo y gracioso, ladrido alegre | Tono grave |
| 0 | **Récord superado** | Cinta que se rompe, confeti, distancia en dorado | Fanfarria de 4 notas | No existe |
| 1 | Objeto temporal: recoger, activo, por acabarse | Halo del color del objeto alrededor de Tinto; anillo del icono; parpadeo final | Sonido propio por objeto; tic en los últimos 2 s | No existe |
| 1 | Antojo: aparece, avanza, se cumple | Pastilla con rebote; lluvia de monedas al cumplir | Campanita; al cumplir, arpegio | No existe |
| 1 | Hito de distancia | Cartel y golpe de campo de visión (reutilizar) | Tres notas | Existe para combo |
| 1 | Caneca: pasar junto a una | La tapa salta y brilla | "Clanc" metálico | [DEP] |
| 1 | Salir de la caneca | Tapa volando, Tinto asoma, Panela mira al otro lado | Tapa metálica y maullido | No existe |
| 1 | Cosa tumbada | El objeto cae con arco, se rompe en partículas | "Toc" de pata y estrépito según el objeto | No existe |
| 1 | Conteo de monedas en el resultado | Existe | Tic por cada 5 monedas, tono que sube | Mudo |
| 1 | **Música** | — | Bucle sencillo generado por código (bajo y percusión) cuyo tempo sube con la velocidad; se corta al perder | No existe |
| 2 | Maullido firma al arrancar | Tinto mira a cámara | Un maullido corto, siempre el mismo | No existe |
| 2 | Letra del día | La letra vuela al marcador | Nota de la escala según la posición | No existe |
| 2 | Botones del menú | Existe | Diferenciar aceptar, volver y negado (hoy son casi iguales) | Parcial |
| 2 | Ambiente por mundo | — | Pájaros, mar, lluvia | No existe |
| 2 | Vibración del teléfono | — | 15 ms al recoger objeto, 40 ms al chocar, patrón al perder (`navigator.vibrate`; no funciona en iPhone) | No existe |

Fundamento: las dos charlas de referencia sobre "jugo" muestran que el salto de calidad percibida viene de sumar muchas respuestas pequeñas a las mismas reglas [E5, E6]. Advertencia de un contradictor: el exceso de efectos puede tapar el juego [E5]; por eso la regla 1 de abajo.

### 6.3 Reglas

1. **La respuesta no puede tapar la calle.** Ningún efecto de pantalla completa dura más de 150 ms mientras se corre. El destello blanco del choque (hoy 0,55 de opacidad) baja a 0,3.
2. **Nada parpadea más de 3 veces por segundo** en un área grande. [C: fotosensibilidad]
3. **Ajustes nuevos**, en la pausa y en el inicio: sonido sí/no, música sí/no, "menos efectos" (sin sacudida, sin destellos, sin cámara lenta). El juego ya respeta `prefers-reduced-motion` en los menús; debe respetarlo también en `fx.js`.
4. **El sonido arranca apagado hasta el primer toque** (ya es así, por norma del navegador) y recuerda la elección.
5. **Petición al núcleo**, ya hecha por el agente de Animación y aún pendiente: una escala de tiempo. `S.timeScale` que multiplique `dt` en `frame()`, con un ayudante `game.slowmo(factor, segundos)`. Sin eso no hay congelado ni cámara lenta.
6. Todos los sonidos nuevos se pueden hacer con Web Audio sin archivos: ruido filtrado para golpes y silbidos, dos osciladores para acordes. No hace falta cargar audio.

---

## 7. El personaje como motor de cariño

Los tres pensadores coinciden: se quiere a un personaje por una frase, un gesto repetible y material que otros puedan usar (`popularidad.md`). Tinto ya tiene la frase y el gesto; el juego todavía no los usa al correr.

### 7.1 La entrada: el delito

1. Antes de cada partida, 2,5 s: Tinto está sobre un poyo junto a un objeto. Mira a la cámara. Lo empuja con la pata. El objeto cae y se rompe. Panela, dormida al fondo, levanta las orejas. Texto: "Tinto no hizo nada." y, al sonar el estrépito, "(Sí hizo.)".
2. El objeto es uno del álbum del mundo actual, al azar: cada partida empieza con un chiste ligeramente distinto.
3. **Se salta con cualquier toque**, y tras la primera partida de la sesión dura 0,6 s (solo el empujón y el ruido). El "una más" no puede esperar.
4. Es además el plano cercano que pidió el agente Blender ("sin un plano cercano del gato, ningún trabajo de modelado se va a ver").

### 7.2 Tumbar cosas, dentro de la carrera

1. Sobre los andenes, tarimas y poyos aparecen **cosas tumbables**: una cada 20 a 30 s de carrera.
2. Tinto la tumba **solo con pasar por el carril de al lado** (el carril pegado a ese andén): saca la pata sin dejar de correr. También con el Zarpazo, desde cualquier carril.
3. Recompensa: tabla 2.2 (+5 de racha, 30 puntos), 2 monedas, y entrada al álbum si es nueva.
4. **Sirve para algo:** el objeto caído distrae a Panela, que frena a olerlo. Panela se aleja 1 unidad durante 2 s. [DEP: cómo se expresa "alejarse" en el modelo de fallo] Así la travesura no es adorno: es la forma de Tinto de ganar aire.
5. Texto flotante, alternando: "Yo no fui", "Se cayó solo", "Ups", "¿Qué florero?". La primera vez de cada objeto: "¡Nuevo! Florero".
6. En el resultado: "Hoy Tinto no tumbó **14** cosas. (Sí las tumbó.)". Es la línea que se comparte.

### 7.3 Panela, amiga

Regla general: **ningún texto, sonido ni gesto de Panela es de amenaza.** Ella cree que están jugando.

| Momento | Hoy | Nuevo |
|---|---|---|
| Tinto choca | "¡GUAU!" en rojo | "¡Espérame!", "¡Juguemos!", "¡Tintooo!" en amarillo, con cola girando |
| Panela muy cerca | Borde rojo | Además, corazones pequeños sobre ella y jadeo feliz |
| Panela lejos | Nada | Cada tanto, un gemido y "¿Tinto?" pequeño |
| Lo alcanza | "¡LAMETÓN!" | Se conserva. Tres variantes al azar: lametón; lo abraza y ruedan; se sienta a su lado moviendo la cola mientras Tinto mira a la cámara, resignado |
| Tinto baja al drenaje | Desaparece | Asoma la cabeza por la alcantarilla y gime |
| Tinto sale del drenaje | Reaparece | Lo recibe saltando: "¡Volviste!" |
| Tinto tumba algo | Nada | Frena a olerlo (7.2) |
| Récord nuevo | Nada | En la pantalla de resultado, Panela también celebra |
| Menú de inicio | Al fondo | Trae una pelota y la deja junto a Tinto; Tinto la tumba del borde |

El cocodrilo sí es la amenaza, y está bien que lo sea: da contraste y vive en un sitio aparte.

### 7.4 Frases de la pantalla de derrota (rotan; nunca dos veces seguidas la misma)

- "Panela solo quería saludar."
- "Lametón número 37."
- "Tinto no perdió. Se dejó alcanzar."
- "Panela ganó. Tinto dice que no estaba corriendo."
- "Demasiado cariño."
- "Tinto exige la revancha."
- "Esto no pasó."
- "Panela está feliz. Tinto, menos."
- En el drenaje: "El cocodrilo no quería ser amigo."
- Con récord: "Tinto no hizo nada. (Hizo 3.420 puntos.)"

Ninguna culpa al jugador ni lo llama malo. [C]

### 7.5 Compartir

1. El botón de compartir genera una **imagen**, no solo texto: Tinto en la pose del resultado (resignado bajo Panela, o con la pata sobre un objeto si hubo récord), el puntaje, la línea "Tinto no tumbó 14 cosas. (Sí las tumbó.)" y el enlace. Lo pidió Marketing (punto 5 de su sección 9).
2. Técnica: dibujar un cuadro del juego en un lienzo aparte y exportarlo en el mismo cuadro del render (si no, el lienzo sale vacío). Compartir con `navigator.share` y archivos cuando exista; si no, descargar la imagen.
3. Se ofrece **solo cuando hay algo que contar**: récord, objeto nuevo, nivel subido, mundo abierto. No en cada derrota.
4. Aviso del Promotor: los portales (CrazyGames, Poki) prohíben enlaces salientes y el botón de WhatsApp. El compartir debe poder apagarse con un parámetro.
5. Reto por enlace ("Ana hizo 3.420 con Tinto. ¿La superas?"): el puntaje va en la dirección y la partida muestra esa cifra como cinta de meta ajena, con su nombre. No necesita servidor.

### 7.6 Los otros gatos

Recomendación [C], en línea con los pensadores: en la tienda se llaman "Amigos de Tinto". La entrada del delito siempre la hace Tinto, aunque se corra con otro gato (el otro espera al lado y sale corriendo con cara de "yo no fui").

---

## 8. Dependencias con el otro diseñador

| Tema | Qué necesito | Qué asumí |
|---|---|---|
| Modelo de fallo | Que se pueda perder sin chocar a propósito; que Panela se acerque con el tiempo o con la pasividad | Sigue habiendo vida y distancia de Panela; un choque sigue siendo un evento discreto (`hit`) |
| Bot quieto | Que muera entre 20 y 35 s | — |
| Canecas | Posición, separación, cómo se "marca" una | Cada 300 a 400 m; se marca al pasar junto a ella; la primera antes de 250 m |
| Límite de choque | El margen exacto, para definir "por un pelo" | `hw + 0,4`, como hoy |
| Patrones de obstáculos | Que siempre exista un camino, y respiros después de cruces y canecas | Sí |
| Balcones y tarimas | Sitios donde poner sardinas y cosas tumbables | Las tarimas actuales (14 m, 5 monedas y pescado) |
| Obstáculos nuevos | Saber cuáles se pasan por debajo (para la tabla 2.2) | Carro, bus, chiva, cinta, tubo |
| Densidad de monedas | Tasa `R` de monedas por minuto | 100 por minuto de carrera para una persona |
| "Alejar a Panela" | Una operación del tipo "Panela pierde N de distancia durante T" | `S.dogGap += 1` |
| Velocidad y aceleración | Los tiempos de los hitos dependen de `cfg` | Los de hoy: 16 + 0,22·t, tope 38 |

Si el modelo de fallo elimina la barra de vida (por ejemplo, "dos tropiezos y te alcanza", como en *Subway Surfers*), cambian tres cosas de aquí: la vida tras la caneca (pasa a ser "Panela a distancia máxima"), el peso de la Caja (se vuelve el objeto más valioso) y las estrellas por vida de los niveles 1-3, 2-2 y 3-3.

---

## 9. Métricas sin servidor

### 9.1 Registro en el dispositivo

Clave nueva `tintoStats` en `localStorage`. Sin nombre, sin identificador, sin enviar nada a ningún lado.

- **Por partida** (últimas 300, en anillo): hora de inicio, modo, mundo, gato, duración, distancia, puntaje, causa del final (tipo de obstáculo, Panela, cocodrilo, tiempo, choques, abandono, victoria), multiplicador máximo, veces por un pelo, objetos recogidos, antojos ofrecidos y cumplidos, calles tomadas y ofrecidas, visitas al drenaje y botín, si usó caneca, y **milisegundos entre que apareció el panel y el siguiente inicio**.
- **Por sesión** (una sesión termina tras 5 min sin jugar): número de partidas, duración total, monedas ganadas y gastadas.
- **Por día:** lista de fechas con al menos una partida.
- **Pantalla oculta** `?stats=1`: tabla con medianas y percentiles, y un botón "Copiar" que pone el JSON en el portapapeles. Así el dueño puede pedirle a cinco conocidos que jueguen y le peguen el resultado por chat. Es la única forma de tener datos de personas sin servidor, y depende de que ellos quieran enviarlo.

Límite honesto: sin servidor no se puede saber cuánta gente vuelve al día siguiente. Solo se ve dispositivo por dispositivo.

### 9.2 Valores objetivo en personas

Las referencias de la industria son para móviles en general, no para un juego web pequeño; sirven de orden de magnitud [E15]: sesión mediana de 5 a 6 min (8 a 9 en el cuarto superior), unas 4 sesiones al día, regreso al día siguiente de 26 a 28 % en el cuarto superior.

| Métrica | Objetivo | Señal de alarma |
|---|---|---|
| Duración de la primera partida de la vida | 40 a 70 s | < 25 s (muere sin entender) o > 150 s (no hay peligro) |
| Duración mediana de partida, tras 10 partidas | 60 a 90 s | < 35 s o > 180 s |
| Percentil 10 de duración | ≥ 15 s | < 8 s (muertes instantáneas) |
| Tiempo hasta reintentar (mediana, desde que aparece el panel) | ≤ 3 s | > 6 s |
| Derrotas seguidas de otra partida en menos de 10 s | ≥ 70 % | < 50 % |
| Partidas por sesión (mediana) | ≥ 5 | < 3 |
| Duración de sesión (mediana) | 5 a 8 min | < 3 min |
| Partidas que baten el récord personal | 10 a 20 % | < 5 % (récord inalcanzable) o > 35 % (no significa nada) |
| Derrotas con puntaje ≥ 80 % del récord | 20 a 30 % | — (solo se observa; no se manipula) |
| Antojos cumplidos sobre ofrecidos | 55 a 75 % | < 40 % o > 90 % |
| Calles laterales tomadas sobre ofrecidas | 30 a 60 % | < 15 % (nadie las ve o no valen la pena) |
| Derrotas que usan la caneca, cuando se puede | 40 a 70 % | > 85 % (decisión trivial) |
| Sesión en que se compra el primer gato | 1 | 3 o más |
| Días con partida en la primera semana (por dispositivo) | ≥ 3 | 1 |

Los objetivos son criterio mío [C], salvo los anclados en [E15].

### 9.3 Banco de bots

El núcleo ya tiene `game.sim(n, each)` sin dibujo. Cuatro bots, 200 partidas cada uno por mundo:

| Bot | Comportamiento | Debe durar |
|---|---|---|
| **Quieto** | No toca nada | 20 a 35 s. **Es la prueba del encargo del dueño** |
| **Aleatorio** | Una acción al azar cada 0,6 s | 20 a 45 s |
| **Reactivo** | Ve 0,35 s hacia adelante, reacciona con 250 ms de retraso, se equivoca 10 % de las veces | Mediana 60 a 120 s |
| **Perfecto** | Ve todo, no falla | > 5 min: demuestra que siempre hay camino |

Además, con el bot reactivo se mide por minuto de carrera:

| Medida | Objetivo |
|---|---|
| Monedas totales (`R`) | El valor que fija los precios de 4.7 |
| Veces por un pelo | 2 a 5 |
| Objetos temporales ofrecidos | 2,5 a 3,5 |
| Antojos ofrecidos | 1,7 a 2,4 |
| Subidas de multiplicador | 2 a 4 |
| Sequía máxima sin ninguna recogida (percentil 95) | ≤ 5 s |
| Tiempo en cada escalón del multiplicador | x1 < 30 %, x5 < 25 % |
| Simulación de economía: sesiones hasta cada compra | La tabla de 4.7, ±30 % |

Advertencia: un bot mide que los números cuadren, no que divierta. `niveles.md` ya lo dijo de su propio bot ("la dificultad salió de cuentas y de un bot, no de personas"), y la lección de EQUIPO.md es que el dueño encontró en minutos lo que ningún agente vio.

---

## 10. Límites éticos

El público puede incluir menores. No hay dinero real en el juego y debe seguir sin haberlo mientras esto no se revise. "Adictivo" significa que da gusto volver.

### 10.1 Técnicas conocidas que se descartan

| Técnica | Dónde se usa | Por qué no |
|---|---|---|
| Cajas de botín, ruletas, sobres con premio al azar que se pagan | Muchos juegos móviles | Es mecánica de apuesta. La autoridad de consumo de EE. UU. sancionó en 2025 a un juego por venderlas a menores ocultando costos y probabilidades [E16]. Aquí ni siquiera con monedas del juego: lo raro se encuentra corriendo, no se compra |
| Cuenta regresiva para continuar ("Sálvame" que desaparece en 2 s) | *Temple Run 2* [E12] | Presión por tiempo sobre una decisión. Los temporizadores de urgencia están catalogados como patrón engañoso [E17] |
| Ofertas por tiempo limitado, "solo hoy", escasez falsa | Tiendas de juegos | Misma razón [E17] |
| Racha diaria que se pierde al faltar | Casi todos | Convierte el juego en obligación y castiga la ausencia. Se cambia por un ciclo que no retrocede (4.6) |
| Mensajes de culpa ("Tinto te extraña", "¿ya te vas?") | Apps con mascota | Manipulan emocionalmente; con niños es peor. Ningún texto habla de la ausencia del jugador |
| Energía o vidas que se recargan con el tiempo | Juegos de rompecabezas | Castiga jugar y empuja a pagar. *Crossy Road* la evitó a propósito [E13] |
| Notificaciones para hacer volver | Todos | El código de diseño para menores del Reino Unido trata con recelo las funciones hechas para extender el uso [E14]. No se piden permisos de notificación |
| Anuncios, incluidos los "premiados" para continuar | Runners gratuitos | Marketing ya pidió cero anuncios; con menores trae obligaciones legales. La propuesta de `niveles.md` (anuncio para revivir) queda descartada mientras no cambie la meta |
| **"Casi" fabricado**: ajustar la dificultad para que la derrota caiga cerca del récord | Tragamonedas, algunos juegos casuales | El "casi" aumenta las ganas de seguir aunque frustre [E10]: justamente por eso solo se muestra cuando es verdad (3.2) |
| Dificultad que baja en secreto para retener, o sube para vender | Juegos con compras | Aquí la única ayuda es la primera partida más suave, y es fija |
| Pagar para ganar | — | No hay pagos. Las mejoras solo alargan objetos; el multiplicador base se gana con misiones |
| Botón grande para lo que le conviene al juego, chiquito para lo otro; "no, gracias" humillante | Ventanas de oferta | Empujones de diseño señalados expresamente para menores [E14]. Regla 3 de 3.4 |
| Reinicio automático sin toque | Videos en cadena | Quita el momento de decidir. Siempre hay un toque |
| Cadena de ventanas de premio al abrir el juego | Juegos móviles | Retrasa jugar y entrena a tocar sin leer. Todo se cobra en la pantalla de resultado o en el inicio, sin ventanas |
| Presión social, tabla que avergüenza | Juegos con amigos | La tabla es local. "¡Pasaste a Ana!" celebra; nunca se dice "Ana te pasó" |
| Segunda moneda, conversiones confusas | Juegos con tienda | Una sola moneda. Las sardinas y las huellas no se compran ni se cambian |
| Pedir datos personales | — | Solo un apodo opcional, guardado en el dispositivo |

### 10.2 Lo que se hace a favor

1. **Puntos naturales para parar.** Misión del día: "✔ Listo por hoy". Palabra del día: "✔ Palabra de hoy". Regalo cobrado. Cuando las tres están hechas, el inicio muestra "Hoy ya hiciste todo. Tinto se va a dormir." con Tinto enroscado. Se puede seguir jugando; solo se le dice al jugador que ya cumplió.
2. **Aviso de descanso**, una sola vez por sesión, a los 20 min o a las 15 partidas: una línea en la pantalla de resultado, "Buen momento para estirar las patas", sin bloquear nada. Se puede apagar en ajustes.
3. **Sesiones cortas completas.** Una partida dura 1 o 2 min y deja algo; no hace falta una hora para sentir avance.
4. **Todo se puede perder de vista sin perder nada.** No hay nada que caduque, salvo la misión y la palabra del día, que se reemplazan por otras iguales de buenas.
5. **Probabilidades a la vista.** La calle sorpresa y las cosas tumbables dicen en la ayuda qué puede salir.
6. **Ajuste de efectos** para quien se marea o es sensible a los destellos (6.3).

### 10.3 Dos tensiones que quedan abiertas

- **El "casi" real también engancha.** Mostrar "te faltaron 85 puntos" usa el mismo mecanismo que critica la investigación sobre apuestas [E10]. Lo considero aceptable porque es información verdadera sobre una prueba de habilidad y no se paga por reintentar, pero es una decisión de criterio y el dueño puede preferir no mostrarlo.
- **El botín del drenaje es "arriesgar lo ganado".** No hay azar ni pago, y lo ya recogido no se pierde; aun así tiene forma de apuesta. Si incomoda, la alternativa es que el factor simplemente suba con el tiempo abajo y nunca se pierda.

---

## 11. Orden de implementación

Ordenado por enganche ganado sobre trabajo. Las estimaciones de tamaño son mías y gruesas [C].

| # | Qué | Sección | Trabajo | Enganche | Depende de |
|---|---|---|---|---|---|
| 0 | **Que se pueda perder** (bot quieto < 35 s) | — | Otro diseñador | Sin esto nada sirve | [DEP] |
| 1 | Registro de métricas y pantalla `?stats=1` | 9.1 | Pequeño | Permite juzgar todo lo demás | — |
| 2 | **Pantalla de derrota:** frase de "casi", frases de Panela, misiones a la vista, guarda de 500 ms, arranque en un toque desde el inicio | 3.1, 3.2, 3.4, 7.4 | Pequeño | Muy alto | — |
| 3 | **Récord en la calle** y "¡Pasaste a Ana!" | 2.4 | Pequeño | Muy alto | — |
| 4 | **Renglón de próxima meta** e hitos de distancia | 2.1, 2.4 | Pequeño | Alto | Canecas para su línea |
| 5 | **Multiplicador real** (`S.bonus`) y "por un pelo" | 2.2, 2.3 | Medio | Muy alto | Límite de choque |
| 6 | Escala de tiempo en el núcleo; congelado al chocar, cámara lenta al perder; nota ascendente; sonido de Panela cerca; ajustes de sonido y efectos | 6 | Medio | Alto | — |
| 7 | Objetos temporales | 2.5 | Medio | Alto | — |
| 8 | Caneca: continuar con sardina | 3.3 | Medio | Alto | Canecas en la carrera |
| 9 | Antojos | 2.6 | Medio | Alto | Cola de carteles |
| 10 | Misiones encadenadas, huellas, nivel de travesura, cobro automático | 4.2, 4.3 | Medio | Alto a medio plazo | 5, 7, 9 para sus misiones |
| 11 | Palabra del día y regalo en ciclo | 4.4, 4.6 | Pequeño | Medio | — |
| 12 | Entrada del delito, cosas tumbables y álbum; Panela amiga | 7.1 a 7.3, 4.5 | Grande (modelos) | Alto para el cariño | Modelos de 28 objetos |
| 13 | Letreros en las calles laterales; botín del drenaje | 2.8, 2.9 | Medio | Medio | — |
| 14 | Reprecio, mejoras, logros, récords en el inicio, pañuelos | 4.5, 4.7 a 4.9 | Medio | Medio, de largo plazo | Medir `R` con el paso 1 |
| 15 | Música y ambiente | 6.2 | Medio | Medio | — |
| 16 | Imagen para compartir y reto por enlace | 7.5 | Medio | Bajo en el juego, alto afuera | — |

Corte sugerido: **pasos 0 a 6 son una primera entrega** que ya responde al encargo. Medir con el paso 1 antes de seguir.

Peticiones al núcleo reunidas: `S.bonus` sumado en `end()`; `S.timeScale` y `game.slowmo()`; `game.revive()`; un evento `nearmiss`; cola de carteles en `fx.js`; distancia de la última caneca en el estado de la partida; que el evento `over` lleve la causa del final.

---

## 12. Lo que NO hay que hacer

1. **No implementar nada de esto antes del paso 0.** Recompensas encima de un juego que no se puede perder son decoración.
2. No poner temporizador a la racha. Ya se probó sin querer (2 s) y la vuelve ruido.
3. No multiplicar las monedas de la billetera con el multiplicador.
4. No mostrar dos carteles a la vez ni carteles en los primeros 10 s.
5. No cobrar la caneca con monedas ni ponerle cuenta regresiva.
6. No castigar un antojo fallado ni una misión cambiada.
7. No esconder el contenido de la calle lateral (salvo la de "?", que nunca es peor).
8. No añadir gatos nuevos: lo pidieron los pensadores y sigue vigente. Lo nuevo es para Tinto.
9. No hacer a Panela amenazante en ningún texto o sonido.
10. No fabricar el "casi" ni ajustar la dificultad a escondidas.
11. No introducir racha de días, notificaciones, energía, anuncios, ruletas ni cajas.
12. No abrir ventanas que haya que cerrar entre la derrota y la partida siguiente.
13. No confiar en que algo funciona porque el bot lo pasó: hay que verlo en movimiento y dárselo a una persona. Es el error más repetido de EQUIPO.md.
14. No subir la densidad de efectos sin el ajuste de "menos efectos".
15. No fijar precios definitivos sin medir `R`.

---

## 13. Fuentes

Consultadas el 8 de octubre de 2026. De varias solo pude leer resúmenes o reseñas, no el original; lo indico.

- **[E1]** Kivetz, Urminsky y Zheng (2006), "The Goal-Gradient Hypothesis Resurrected", *Journal of Marketing Research* 43, 39-58. Resumen y ficha de Columbia: https://business.columbia.edu/faculty/research/goal-gradient-hypothesis-resurrected-purchase-acceleration-illusionary-goal — leí el resumen, no el artículo completo.
- **[E2]** Nunes y Drèze (2006), "The Endowed Progress Effect", *Journal of Consumer Research* 32(4), 504-512. Cifras (34 % contra 19 %) tomadas de resúmenes secundarios, p. ej. https://uxdesign.cc/endowed-progress-effect-give-your-users-a-head-start-97d52d8b0396
- **[E3]** *Jetpack Joyride*: charla de diseño de Luke Muscat (Halfbrick), GDC 2012, "Depth in Simplicity": https://gdcvault.com/play/1015316/Depth-in-Simplicity-The-Making (no pude ver la grabación); sistema de tres misiones: https://en.wikipedia.org/wiki/Jetpack_Joyride ; lectura de un tercero sobre misiones cortas y largas: https://adriancrook.com/?p=4709
- **[E4]** *Subway Surfers*, palabra diaria y misiones: https://en.wikipedia.org/wiki/Subway_Surfers ; análisis de juego: https://gameworldobserver.com/2016/06/24/subway-surfers-gameplay-analysis — no encontré una charla de sus autores; los detalles vienen de reseñas y wikis.
- **[E5]** Jonasson y Purho (2012), "Juice it or lose it", y la réplica crítica de Folmer Kelly. Recopilación: https://rpgplayground.com/research-making-a-juicy-game/ ; lista de referencia: https://kenney.nl/learn/must-see-videos-for-indie-developers
- **[E6]** Jan Willem Nijman (Vlambeer, 2013), "The Art of Screenshake". Mismas recopilaciones que [E5].
- **[E7]** Flujo (Csikszentmihalyi) aplicado a juegos y ajuste de dificultad, Jenova Chen, "Flow in Games" (2006): https://en.wikipedia.org/wiki/Jenova_Chen ; revisión: https://arxiv.org/pdf/2007.07220 — no leí la tesis original.
- **[E8]** Ryan, Rigby y Przybylski (2006), "The Motivational Pull of Video Games", *Motivation and Emotion* 30(4), 347-363: https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/
- **[E9]** *Flappy Bird*: https://blogs.tuni.fi/playlab/game-research-highlights/the-enchantment-of-frustrating-casual-games/ ; contrapunto sobre llamarlo adicción: https://www.livescience.com/43417-flappy-bird-obsession-is-not-necessarily-an-addiction.html
- **[E10]** Larche, Musielak y Dixon (2016-2017), casi-aciertos en *Candy Crush*, *Journal of Gambling Studies*: https://link.springer.com/article/10.1007/s10899-016-9633-7 ; tesis: https://uwspace.uwaterloo.ca/handle/10012/12522 — 60 jugadores habituales, 30 min en laboratorio; no mide juego real a lo largo de días.
- **[E11]** Finserås y contactos, "Near miss in a video game: an experimental study": https://bora.uib.no/bora-xmlui/handle/1956/23601 — resultado contrario al de [E10].
- **[E12]** *Temple Run 2*, multiplicador por objetivos y "Save Me": https://en.wikipedia.org/wiki/Temple_Run_2 ; entrevista a Keith Shepherd: https://www.engadget.com/2013-01-17-imangi-surprises-with-temple-run-2-now-available-on-the-app-sto.html — los detalles del aviso de 2 s vienen de una reseña, no del estudio.
- **[E13]** *Crossy Road*, GDC 2015 "A Whale of a Time" (no pude ver la grabación: https://gdcvault.com/play/1021897); cobertura: https://www.thumbsticks.com/crossy-road-how-hipster-whale-reinvented-free-to-play/ ; https://www.pocketgamer.biz/making-of-crossy-road/
- **[E14]** Oficina del Comisionado de Información del Reino Unido, código de diseño apropiado para la edad, norma 13 sobre técnicas de empujón: https://ico.org.uk/for-organisations/guide-to-data-protection/ico-codes-of-practice/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques — lo relativo a "funciones pegajosas" lo leí en comentarios sobre el borrador, no en el texto final.
- **[E15]** GameAnalytics, referencias de juegos móviles 2025 (datos de 2024): https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks — son juegos móviles de tienda, no juegos web.
- **[E16]** Comisión Federal de Comercio de EE. UU., caso *Genshin Impact* (2025): https://deceptive.design/articles/genshin-impact-game-developer-will-be-banned-from-selling-lootboxes-to-teens-under-16-without-parental-consent-pay-a-20-million-fine-to-settle-ftc-charges ; caso *Fortnite* (2022): https://infobytes.orrick.com/2022-12-21/gaming-company-pay-520-million-resolve-ftc-allegations/
- **[E17]** Comisión Federal de Comercio de EE. UU., informe "Bringing Dark Patterns to Light" (2022), resumen: https://www.venable.com/insights/blogs/2022/09/the-ftc-brings-more-light-to-dark-patterns-in-new

**Citado de memoria, sin verificar hoy [E-mem]:** programas de refuerzo de razón variable (Ferster y Skinner, 1957); el "director" de ritmo de *Left 4 Dead* (Michael Booth, charlas de 2009).

**Lo que no encontré:** datos publicados de retención de ningún runner concreto; una charla de los autores de *Subway Surfers* sobre su diseño; estudios sobre rachas diarias y menores. Lo que digo sobre esos tres puntos es criterio.

## 14. Supuestos más frágiles

1. Que una persona recoja unas 100 monedas por minuto de carrera. Toda la tabla de precios cuelga de ahí.
2. Que el jugador medio suba 3 puntos de racha por segundo. Si es la mitad, los escalones del multiplicador quedan lejos y hay que bajarlos.
3. Que 28 objetos tumbables se puedan modelar al nivel del resto del juego. Si no, empezar con 8 (uno por tipo) y el álbum por mundo se llena después.
4. Que el renglón de próxima meta, el antojo, los iconos y el multiplicador quepan en 360 px sin tapar la calle. No lo vi en pantalla.
5. Que la causa de que el dueño sobreviviera 3 minutos sea la que leí en el código. No lo reproduje.
