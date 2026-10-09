# Bitácora — agente Animación

## Rol
Dueño de `js/fx.js`: el "jugo" del juego. Mando en el perro, la pose y escala raíz del gato, la cámara, las partículas y los efectos de pantalla. No toqué `core.js`, `index.html` ni archivos de otros agentes. Todo se aplica en el evento `frame`, después de que el núcleo coloca todo.

## Qué hice y con qué técnica

**Gato (pose raíz)**
- Estirar/aplastar con un muelle amortiguado (k=260, d=13): se estira según la velocidad vertical en el aire, se aplasta al caer en proporción a la velocidad de caída y rebota. Conserva volumen (x/z = 1/√y). Siempre multiplicado sobre la escala base leída una vez por modelo.
- Anticipación del salto: como el núcleo salta en el acto, la comprimo en dos cuadros (escala .78 y velocidad positiva del muelle) para que se lea "agacharse y salir".
- Inclinación al cambiar de carril (muelle con sobrepaso, más impulso en el evento `lane`), guiñada hacia el carril destino, e inclinación fuerte en los giros de esquina (`turn`).
- Voltereta hacia atrás con brinco al chocar (0.6 s, salida cúbica, girando sobre el centro del cuerpo y no sobre las patas) y voltereta hacia adelante en el salto doble (`jump` con `air > 0`).
- Alcantarilla: se afina, gira sobre sí mismo y sale estirado.
- Deslizada: el corte seco `body.scale.y` .5/1 del núcleo pasa por un muelle y el cuerpo se alarga.
- Trote (rebote vertical con la zancada) e inclinación hacia adelante según la velocidad.
- Muerte: brinco de susto y, cuando el perro le cae encima, tortilla (y=.26, x/z=1.5) con temblor de muelle. Victoria: giro completo y brincos con estirar/aplastar. Menú: respira (±2 %).

**Perro** (le añadí un aparejo: cabeza con pivote en el cuello, orejas con pivote propio, mandíbula con interior de boca, lengua y punta de cola)
- Galope propio (reemplaza el ciclo de patas y el rebote del núcleo): patas delanteras y traseras desfasadas, una fase de vuelo por zancada, lomo que cabecea y se estira, cabeza que compensa y llega tarde.
- Orejas y cola con muelles alimentados por la velocidad vertical del cuerpo (seguimiento); la punta de la cola va con retraso de fase.
- Embestida al chocar el gato (muelle hacia adelante), aplastado previo, ladrido visible de dos golpes de mandíbula sincronizado con `bark()`, texto "¡GUAU!".
- Tarascadas al aire y cola más rápida cuando está cerca del gato; se ladea y gira al cambiar de carril.
- Salto final: se agacha (anticipación), se estira en el aire con las patas extendidas y la boca abierta, cabecea, y aterriza aplastándose (.58) con rebote, anillo de polvo, estrellas, onda, sacudida máxima, destello y "¡ÑAM!". Luego jadea y mueve la cola encima del gato. En victoria se queda atrás con cabeza y cola caídas.

**Cámara**
- Sacudida por "trauma" (trauma², ruido suave de senos, con giro), en lugar del azar por cuadro del núcleo: absorbo `S.shake` y lo pongo en 0.
- FOV con muelle: sube con la velocidad (hasta +8°), golpe al chocar (se cierra 4–7° y rebota), toque al saltar y en hitos de racha.
- Llega tarde al cambio de carril, acompaña el salto, golpe vertical al aterrizar, balanceo hacia el lado del movimiento y en los giros.
- Momento de cámara en muerte y victoria: órbita en coordenadas polares alrededor del gato partiendo de donde el núcleo dejó la cámara (sin salto), plano más cerrado, limitada para no meterse en las fachadas. En victoria termina de frente al gato.

**Partículas**: un solo `THREE.Points` con pool fijo de 640 (arreglos tipados, el último ocupa el hueco del que muere, una sola llamada de dibujo, shader propio con 5 formas: polvo, destello aditivo, confeti, anillo, estrella; mezcla premultiplicada para tener aditivo y normal en el mismo material). Polvo al correr, deslizar, saltar y aterrizar (según la fuerza de la caída); chispas y anillo al recoger; estrellas, destello y onda al chocar; estrellitas orbitando la cabeza mientras está aturdido; confeti (explosión + lluvia) al ganar.

**Líneas de velocidad**: una malla de 36 cintas en el espacio de la cámara con alfa por vértice; aparecen desde 19 m/s.

**Pantalla** (capa `#fx`, `pointer-events: none`, insertada debajo del HUD y los menús): "+1" y "+1 🐭" flotantes, contador de racha con golpe de muelle y barra de tiempo (2 s para encadenar; se pierde al chocar), carteles de hito (10, 25, 50, 100, 200), destello blanco, viñeta roja de impacto, viñeta de velocidad y barras de cine en muerte y victoria. Todo movido por JS con el `dt` del juego (no animaciones CSS), así que se congela en pausa.

**Recogibles y obstáculos**: monedas en ola a lo largo de la fila y se hinchan al acercarse el gato; ratones que se aplastan y estiran con su salto y tiemblan de susto; obstáculos pesados golpeados tiemblan como gelatina y vuelven a su sitio; los que salen volando hacen pirueta.

## Decisiones
- En pausa salgo del `frame` sin tocar nada. `start` y la vuelta al menú reinician todo.
- La racha es solo visual (no cambia el puntaje, que es del núcleo/Niveles). Queda expuesta en `game.fx.combo` y `game.fx.comboBest`.
- `game.fx` ofrece `shake, flash, text, banner, burst` por si otro módulo quiere pedir efectos. Nadie depende de eso.
- El polvo no recibe luz; lo oscurezco según la intensidad de `hemi` para que de noche no brille.
- Las piezas de la cabeza del perro las identifico por posición (no por índice) al armar el aparejo.

## Qué probé (navegador integrado, ventana oculta, solo con JavaScript)
- 6 + 5 + 12 partidas de hasta 3600 cuadros con saltos, deslizadas, carriles y giros al azar hasta morir (52 golpes, 467 recogidos, 18 giros en la primera tanda): 0 excepciones, 0 NaN en posición/escala/rotación de gato, perro y cámara ni en el FOV. También con `dt` alternando 0.05 y 0.001.
- Reposo: escala del gato = base exacta (1.25) en partida; FOV = `view.fov` exacto (62) en el menú. En el menú el gato respira ±2 % a propósito.
- Pausa: 120 cuadros en pausa, estado idéntico (gato, perro, cámara, FOV, partículas y DOM).
- `game.step` con partículas, líneas, confeti y anillos vivos: `getError()` = 0 siempre; sin avisos de shader.
- Pool: máximo visto 140 de 640 partículas. Geometrías: entre 31 y 71 sin tendencia en 12 partidas (el núcleo solo oscila entre 37 y 63 por los tramos); lo mío son 2 geometrías fijas. Nodos del DOM de `#fx`: 22 fijos.
- Costo: `sim` a ~124–138 µs por cuadro con mi módulo contra ~73–90 µs con `?solo=ninguno` (escritorio). Mi módulo cuesta unos 40–50 µs por cuadro de CPU.
- Gato sin `userData` y con escala 2: sin errores, vuelve a su base. Con los 7 gatos que había cargados del módulo Gatos: todos vuelven a 1.25.
- Carga con todos los módulos presentes en ese momento (cats y levels): sin errores de `fx.js`.

## Qué NO pude verificar
**No vi nada con mis ojos.** Ni una captura. Todo lo de arriba son números, y en animación eso no alcanza. Revisar a ojo, en este orden:
1. **Signos de giro**: inclinación del gato y balanceo de cámara al cambiar de carril (deben ir hacia el lado del movimiento), orejas del perro (deben abrirse hacia afuera al caer), mandíbula (debe abrir hacia abajo), lengua.
2. **Aparejo del perro**: que mandíbula, lengua y punta de cola queden bien puestas y con buen tamaño. La cara casi no se ve en partida (la cámara va detrás); se ve en la cámara de muerte.
3. **Cámara de muerte y de victoria**: que la órbita no atraviese obstáculos ni árboles (solo la limité contra las fachadas) y que el encuadre sea bueno. Ojo: el núcleo muestra `#over` con fondo oscuro apenas termina, así que la victoria se ve atenuada detrás del panel.
4. **Partículas**: tamaños, opacidad y forma de la estrella y el confeti; el tamaño de punto tiene tope de 220 px.
5. **Líneas de velocidad**: a la velocidad base no salen; con la aceleración del núcleo empiezan cerca de los 14 s de partida.
6. **Textos**: el contador de racha está a la derecha, al 30 % de alto; puede chocar con algo de Niveles o con el botón de Gatos en pantallas chicas.
7. Voltereta en cada golpe: puede ser demasiado; se baja con `flip.hop` y `flip.dur`.
- No medí en un celular real ni el costo de GPU (solo CPU en `sim`).
- No probé el módulo Mundos (no estaba cargado cuando probé).

## Peticiones al núcleo
- **Escala de tiempo** (`S.timeScale`) para congelar 60 ms al chocar y cámara lenta en la muerte. Es lo que más falta.
- Exponer `camYaw` y el punto de mira, o un `view.offset` que el núcleo aplique, para no reconstruirlos.
- En `place`, `dt * 12 * k` con `dt = 0` da 0, así que el giro no se ajusta en el menú como parece ser la intención.
- En estado `over` el perro queda con el rebote del núcleo congelado; lo corrijo yo.
- Retrasar `#over` un segundo o quitarle el fondo oscuro para que se vea el momento de cámara.
- Un evento de "casi choca" para premiarlo con efecto.

## Si este juego nos fuera a hacer ganar mucha plata
1. **Repetición compartible**: grabar los últimos 6 s (el canvas con `captureStream`) y ofrecer el clip de la muerte o del récord con la cámara de cine. Es el motor de crecimiento gratis de este género.
2. **Congelado de impacto y cámara lenta** en golpes, casi-choques y la atrapada final. Es lo que separa "bien hecho" de "de estudio".
3. **El perro como personaje**: caras (furia, burla, frustración), baile cuando gana, tropiezos cuando el gato lo esquiva. Un villano con carisma vende peluches y stickers.
4. **Racha con premio real**: multiplicador de puntaje y un modo "fiebre" (todo dorado, música arriba, líneas de velocidad a tope). Coordinado con Niveles.
5. **Cosméticos animados para vender**: estelas, polvo de colores, confeti temático, poses de victoria por gato. Puro contenido de animación, barato de producir y sin afectar el equilibrio.
6. **Casi-choques**: cámara lenta breve, texto "¡POR UN PELO!" y bonificación. Convierte el riesgo en espectáculo.
7. **Animación por huesos**: pasar gato y perro a modelos con esqueleto y mezcla de animaciones (correr, saltar, rodar, caer) cuando haya presupuesto de arte.
8. **Vibración del teléfono** en golpes y hitos, y sonido en capas atado a la racha.
