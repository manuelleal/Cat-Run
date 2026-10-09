# Cat Run — registro del equipo de agentes

Registro de quién hizo qué en el juego. Lo mantiene el agente coordinador (la sesión principal de Claude); cada agente deja además su propia bitácora en `equipo/`.

## Roles

| Agente | Rol | Archivo que le pertenece | Bitácora |
|---|---|---|---|
| Coordinador | Arquitectura, contrato entre módulos, integración y registro | `js/core.js`, `index.html`, `AGENTES.md` | este archivo |
| Mundos | 3 mundos con arquitectura, clima, fondo y obstáculos propios | `js/worlds.js` | `equipo/mundos.md` |
| Gatos | Elenco de gatos con modelo y habilidad propia; botón de habilidad | `js/cats.js` | `equipo/gatos.md` |
| Animación | Perro, pose del gato, cámara, partículas y efectos de pantalla | `js/fx.js` | `equipo/animacion.md` |
| Niveles y Economía | 15 niveles, estrellas, billetera, tienda, misiones y pantallas | `js/levels.js` | `equipo/niveles.md` |
| Pensador de Marketing | Solo piensa: cómo volver popular al gato sin presupuesto | ninguno (no escribe código) | `equipo/marketing.md` |
| Pensador Promotor de juegos | Solo piensa: por dónde publicar para llegar a más jugadores | ninguno | `equipo/promotor.md` |
| Blender | Investiga cómo trabajar Blender por guion, mejora texturas de Tinto y deja la guía y un borrador de skill | `modelos/tinto_v4.py`, `modelos/LEEME.md`, `modelos/skill-blender/` | `equipo/blender.md` |
| Render (modelo Fable) | Analiza cómo renderiza Blender en esta máquina, lo configura y amplía a la medida del proyecto, y produce imagen promocional, stickers y video de Tinto | `modelos/render/` | `equipo/render.md` |
| Panela | Modela a la perra en Blender siguiendo la guía del agente anterior, y evalúa si esa guía basta | `modelos/panela.py`, `modelos/panela.glb` | `equipo/panela.md` |
| Lógica (modelo Fable) | Fase 1: audita toda la lógica y la mide con bots. Fase 2: implementa los diseños y deja una sola fuente de verdad para las reglas | `pruebas/`, luego `js/core.js` | `equipo/logica.md` |
| Diseñador del bucle (modelo Opus) | Solo diseña: modelo de fallo, patrones de obstáculos, balcones, obstáculos nuevos, canecas de regeneración | ninguno | `equipo/diseno-bucle.md` |
| Diseñador de motivación (modelo Opus) | Solo diseña: qué hace que el jugador quiera seguir y volver | ninguno | `equipo/diseno-motivacion.md` |
| Figuras | Modela en Blender la utilería que más se repite: cocodrilo, ratón, moneda, gallina, pescado, caneca | `modelos/props/` | `equipo/figuras.md` |
| Pensador Estratega de popularidad | Solo piensa: qué vuelve popular a un personaje, qué identidad darle al gato y qué tan probable es | ninguno | `equipo/popularidad.md` |

**Propósito del ejercicio (aclarado por el dueño):** el juego no es el fin. Lo que se quiere mostrar es el dominio que los agentes llegan a tener sobre cualquier herramienta, y para eso se registra qué hace cada agente, cómo lo hace y cómo se equivoca.

**Meta del dueño para el juego:** que el gato se vuelva popular. Al principio planteó otra meta y luego la descartó; a los tres pensadores se les redirigió a mitad de trabajo.

A los cuatro constructores se les pidió además dos cosas: lucir su capacidad de animación dentro de su rol, y responder "si este juego nos fuera a hacer ganar mucha plata, ¿qué le harías?".

## Cómo se organizó el trabajo

Los cuatro agentes trabajan a la vez y no se ven entre sí. Para que no se pisen:

1. El coordinador partió el juego en un núcleo (`js/core.js`) y cuatro módulos enchufables, uno por agente.
2. `AGENTES.md` es el contrato: qué expone el núcleo, qué formato tienen mundos y gatos, y qué parte del juego le toca a cada uno.
3. Cada agente solo escribe en su archivo y prueba su módulo aislado (`?solo=<módulo>`).
4. Al final el coordinador carga los cuatro juntos, corrige los choques y deja aquí el resultado.

## Bitácora

### Coordinador — antes de lanzar al equipo

- Primera versión del juego en un solo archivo: calle infinita de tres carriles, cruces con calles laterales opcionales, perro perseguidor con la cámara detrás, obstáculos, monedas y ratones, tres ambientes, tabla de puntajes y botón de compartir.
- Separó el motor en `js/core.js` con una API para módulos: eventos, registros de mundos, gatos y obstáculos, ajustes de dificultad, ganchos de daño y un simulador sin dibujo para pruebas.
- Probado en simulación tras la separación: tres partidas completas (una por ambiente y gato) con giros, sin errores.

### Mundos

**Terminado.** Entrega: `js/worlds.js` y `equipo/mundos.md`.

| Mundo | Escenario | Ambiente animado | Obstáculos propios |
|---|---|---|---|
| Pueblo Colonial | Casas blancas con tejado de barro, balcones, empedrado, guayacanes, iglesia | Banderines, campana, mariposas amarillas, golondrinas, nubes | Gallinas, burro, chiva, balón, tendedero |
| Costa Caribe | Casetas de palma, malecón de tablas, palmeras, faro | Mar con olas, veleros, cometas, gaviotas | Cangrejos, cocos, gaviota, pelota, castillo de arena, tabla de surf, sombrilla, lancha, red |
| Ciudad Neón | Torres con ventanas encendidas, rótulos en español, asfalto mojado | Lluvia, relámpagos, reflectores, hologramas | Motos, dron, barrera, láser, charco, zigzag |

- 20 filas de obstáculos nuevas; cada una sale solo en su mundo.
- Probado en simulación: los tres mundos corren sin errores, se puede morir y sobrevivir en todos, y la memoria no crece sin parar.
- Vio imágenes fijas de los tres mundos y con ellas corrigió la ciudad, que estaba muy oscura.
- Sin verificar: nada en movimiento (banderines, olas, relámpagos), el rendimiento en celular y la vista vertical. El orden de dificultad entre pueblo y playa salió ruidoso.

### Gatos

**Terminado.** Entrega: `js/cats.js` y `equipo/gatos.md`.

| Gato | Precio | Habilidad |
|---|---|---|
| Michi | 0 | Zarpazo: manda a volar el obstáculo de enfrente |
| Mango | 150 | Doble salto con voltereta |
| Pluma | 400 | Planeo de 1,6 s |
| Bola | 750 | Embestida: 2,2 s rompiendo todo |
| Chispa | 1200 | Imán de monedas y ratones durante 6 s |
| Sombra | 1800 | Sigilo: 3,5 s atravesando obstáculos |
| Nube | 2500 | Siete vidas: revive una vez por partida |

- Cada gato tiene silueta y accesorio propios, un gesto al correr y un efecto visual para su habilidad.
- Botón de habilidad abajo a la derecha, con barrido de recarga.
- Probado en simulación con números (por ejemplo: doble salto 3,66 de altura contra 1,85; imán 30 monedas contra 0) y sin errores. Los ajustes de dificultad vuelven a su valor al cambiar de gato.
- Sin verificar: el ritmo de las animaciones en movimiento, el toque real en celular y la convivencia con Mundos y Animación, que no existían cuando probó.
- Avisos: el bono de monedas de la embestida no emite el evento de recogida, y en horizontal el perro tapa casi todo el gato.

### Animación

**Terminado.** Entrega: `js/fx.js` y `equipo/animacion.md`.

- **Gato:** se estira y se aplasta al saltar y caer, se inclina al cambiar de carril y en las esquinas, da voltereta al chocar y en el doble salto, celebra al ganar.
- **Perro:** cabeza, orejas, mandíbula, lengua y cola con movimiento propio; galope, embestida con "¡GUAU!" al chocar y salto final con "¡ÑAM!".
- **Cámara:** sacudida, cambio de campo de visión con la velocidad y los golpes, balanceo, y órbita de cine en la muerte y la victoria.
- **Partículas:** un solo sistema con 640 partículas reutilizables (polvo, destellos, confeti, anillos, estrellas) y líneas de velocidad.
- **Pantalla:** "+1" flotantes, contador de racha, destello de impacto y barras de cine.
- Probado: 23 partidas simuladas sin excepciones ni valores inválidos; la pausa congela todo; costo de unos 40–50 microsegundos por cuadro en escritorio.
- **Sin verificar: no vio nada con sus ojos.** Los sentidos de inclinación y balanceo pueden estar invertidos, la órbita de cámara puede atravesar árboles, y el momento de victoria queda tapado por el panel final. No midió en celular ni probó con Mundos.
- Pide al núcleo un control de velocidad del tiempo para hacer cámara lenta y congelado de impacto.

### Niveles y Economía

**Terminado.** Entrega: `js/levels.js` y `equipo/niveles.md`.

- **15 niveles** (3 mundos × 5) con objetivos de distancia, ratones, monedas, calles laterales, límite de choques y límite de tiempo; de 1 a 3 estrellas por nivel.
- **Desbloqueos:** cada nivel al pasar el anterior; el mundo 2 con 8 estrellas y el 3 con 20.
- **Billetera** guardada en el dispositivo, **tienda** de gatos, **3 misiones diarias** y **regalo diario con racha**.
- **Pantallas:** inicio, ayuda, mapa, ficha de nivel, pausa, resultado, tienda y misiones. El modo infinito se conserva con su tabla de puntajes.
- Probado por código: un bot pasó los 15 niveles encadenados; victorias, derrotas, compras, misiones y persistencia tras recargar dieron los valores esperados; todo cabe en 360×640 sin desbordar.
- **Sin verificar: no vio nada con sus ojos.** Las transiciones y animaciones de pantallas no corrieron en la ventana oculta. La dificultad salió de cuentas y de un bot, no de personas. No probó toque real ni los mundos del agente Mundos.
- Intervino un punto del núcleo: la tabla de puntajes ahora la lleva su módulo para que las partidas de nivel no entren al ranking del modo infinito.

### Pensadores (Marketing, Promotor, Estratega de popularidad)

Pendiente: en curso. Lanzados después de los cuatro constructores con otra meta; minutos después el dueño cambió la meta a "que el gato se vuelva popular" y se les envió la corrección. El tercero pasó de Estrategia y Financiación a Estratega de popularidad.

**Promotor de juegos — terminado.** Entrega: `equipo/promotor.md`, con fuentes fechadas al 8 de octubre de 2026.

- Ruta recomendada: primero un enlace propio (hosting estático gratis), luego CrazyGames como apuesta principal de alcance, y Poki después, como techo.
- Los portales dan partidas, no seguidores: prohíben enlaces salientes, así que la fama del personaje depende de las redes.
- "Cat Run" ya lo usan al menos seis juegos. Propone un nombre propio para el gato: Runrún o Mirringa. Solo pasaron una búsqueda web; no revisó registros de marca.
- Bloqueos concretos para entrar a un portal: Three.js cargado desde un servidor externo y el botón que abre WhatsApp. También pide diferenciarse más de Subway Surfers, porque CrazyGames rechaza clones.
- Lo más frágil: las cifras de audiencia de los portales no son oficiales y las probabilidades de aceptación son opinión suya.

**Marketing — terminado.** Entrega: `equipo/marketing.md`.

- Hoy no hay personaje, hay "un gato": antes de publicar hay que fijar nombre, tres rasgos de carácter, un accesorio y un rival con nombre. Propone Tinto o Panela para el gato, con pañuelo rojo al cuello, y Coronel o Don Chucho para el perro.
- El juego pasa a ser uno de los lugares donde vive el gato; el cariño se construye en clips cortos, stickers de WhatsApp y plantillas de meme.
- El diferencial es el pueblo colombiano, no la IA. Colombia primero y en español; la historia de cómo se hizo con agentes de IA queda como ángulo secundario.
- Las imágenes del gato deben salir siempre del modelo 3D del juego, nunca de un generador de imágenes.
- Pronóstico a 90 días: un gato querido en su círculo cercano y algunos miles de vistas; un golpe regional es posible pero minoritario.
- Pide 15 cambios al juego (sección 9 de su informe). Lo más frágil: que el dueño sostenga 4 a 5 horas semanales y 3 clips por semana durante 90 días.

**Estratega de popularidad — terminado.** Entrega: `equipo/popularidad.md`.

- Los personajes pequeños que pegaron repiten tres cosas: una frase que se cuenta sola, un gesto o sonido repetible, y servir de material para que otros creen. El resto fue suerte y casi siempre tardó años.
- La palanca que más pesa no está en el juego: publicar al gato en video corto cada semana durante un año. Recomienda frenar la suma de gatos nuevos hasta que el principal exista.
- Identidad recomendada: **Tinto**, gato negro callejero con pañuelo rojo y una oreja mordida, descarado y tranquilo; su gesto es empujar algo al borde mirando a la cámara. El perro (propone Panela) no quiere morderlo sino ser su amigo. Alternativas: Mango y Don Ruano.
- Probabilidad a 12 meses, estimación suya: fenómeno masivo menos de 1 %; popular de nicho 10–20 % con constancia; querido en pequeño 40–50 %.
- El juego de verbos ayuda si es otro juego con el mismo gato y llega después de fijar la identidad; estorba si se mezcla en el runner.

**Coincidencias entre los tres pensadores:** "Cat Run" no sirve como nombre; hoy no hay personaje; la popularidad se gana en redes y no en el juego; todo depende de la constancia del dueño. **Diferencia:** cada uno propuso nombres distintos (Runrún o Mirringa; Tinto o Panela; Tinto), y Marketing y el Estratega usan "Panela" para personajes opuestos (gato y perro). La decisión del nombre es del dueño.

### Coordinador — integración

- Cargó los cuatro módulos juntos y simuló 21 partidas (3 mundos × 7 gatos, 40 s cada una, con saltos, deslizadas, giros y habilidades): sin excepciones, sin errores de consola, sin valores inválidos en gato, perro ni cámara.
- Vio capturas fijas de la pantalla de inicio y del Pueblo Colonial en partida (`equipo/captura-pueblo.jpg`); la Costa Caribe solo de fondo tras la pantalla final. No vio la Ciudad Neón ni nada en movimiento.
- Cambio al núcleo pedido por Mundos: monedas y ratones ya no proyectan sombra, para ahorrar dibujo.
- Pendiente: probar en un celular real, revisar a ojo los sentidos de las animaciones, y las peticiones al núcleo que dejaron los agentes (control de velocidad del tiempo, no anotar en el ranking las partidas de nivel, retrasar el panel final para que se vea la victoria).

### Coordinador — Tinto entra al juego

El dueño aprobó la identidad que propuso el Estratega de popularidad.

- El primer gato (gratis) ahora es **Tinto**: negro, con pañuelo rojo al cuello y una oreja mordida. Conserva el Zarpazo, que encaja con su gesto de tumbar cosas.
- El perro se llama **Panela** en todos los textos; al alcanzarlo sale "¡LAMETÓN!" en vez de "¡ÑAM!".
- El título pasa a ser "TINTO" con la frase "Tinto no hizo nada. (Sí hizo.)". "Cat Run" queda solo en el título de la pestaña.
- Para que el pañuelo rojo y el pelaje negro sean solo suyos: la pañoleta de Mango pasó a verde y Sombra pasó de negro a índigo.
- Visto en captura fija (`equipo/captura-tinto.png`). Sin hacer todavía: la entrada de cada partida con Tinto tumbando el tinto de la señora, y que Panela se comporte como amiga y no solo cambie de nombre.

### Coordinador — Blender: de cero a Tinto dentro del juego

El dueño pidió que el coordinador manejara Blender solo, sin intervención suya. Paso a paso:

1. **Comprobar si estaba instalado.** No estaba.
2. **Elegir versión.** Consultó el listado oficial de `download.blender.org`: existían hasta la 5.2. Eligió la 4.5.9 LTS porque es la versión de soporte largo y su interfaz de programación es la que mejor conoce.
3. **Descargar e instalar.** Bajó el paquete portátil (399 MB), que solo se descomprime en `PROYECTOS/_herramientas/`: no pide permisos de administrador ni cambia el sistema. Descargó también el archivo de huellas del sitio oficial para compararlas.
4. **Manejarlo sin ventana.** Blender acepta guiones en Python. El coordinador escribió `modelos/tinto.py` y lo corrió con `blender --background --python`. Cada corrida tarda unos 19 segundos y produce el modelo (`tinto.glb`) y tres imágenes de control.
5. **Mirar y corregir.** Como no hay ventana, "ver" es renderizar una imagen y abrirla. Hizo tres intentos (guardados en `modelos/intentos/`):
   - **v1:** cuerpo orgánico correcto, pero sin oreja izquierda, con ojos y nariz enterrados dentro de la cabeza y el pañuelo casi invisible.
   - **v2:** cambió de método: en vez de poner los rasgos en coordenadas fijas, lanza rayos desde dentro de la cabeza y los coloca donde tocan la piel. Aparecieron ojos, nariz, bigotes y la oreja mordida. El pañuelo seguía muy delgado.
   - **v3:** pañuelo más grueso y separado de la piel, con punta sobre el pecho y nudo en la nuca. Es el que está en el juego.
6. **Conectarlo al juego.** Escribió `js/models.js`, un integrador que carga el archivo de Blender y lo entrega con las piezas que el juego ya sabe animar (cuerpo, cabeza, orejas, cola, cuatro patas). Si el archivo no carga, el juego usa el gato hecho por código.
7. **Verificar.** 30 segundos de partida simulada con saltos, deslizadas y habilidad: sin errores. Captura dentro del juego en `equipo/captura-tinto-blender-en-juego.jpg`.

Lo que no se hizo: animaciones propias en Blender (el juego sigue moviendo piezas rígidas), texturas (el pelaje es un color liso) y el modelo de Panela. El agente Blender quedó encargado de investigar texturas y dejar la guía.

### Agente Blender

**Terminado.** Tardó unos 23 minutos y usó Blender 91 veces. Entregas:

- `modelos/tinto_v4.py` y `modelos/tinto_v4.glb`: Tinto con texturas, ya en el juego.
- `modelos/LEEME.md`: guía del flujo "de guion de Blender a personaje dentro del juego", con recetas, 11 trampas y fuentes.
- `modelos/skill-blender/SKILL.md`: borrador de skill, sin instalar.
- `modelos/verificar_glb.py`: comprueba un modelo contra el contrato del juego.
- `modelos/visor.html`: muestra un modelo con las luces del juego. No se le pidió; lo hizo porque las capturas del navegador le fallaban.
- `equipo/blender.md`: bitácora iteración por iteración. Los intentos v4a a v4f están en `modelos/intentos/`.

**Tinto v4 contra el anterior:**

| | Anterior (v3) | v4 |
|---|---|---|
| Tamaño | 0,34 MB | 0,88 MB |
| Triángulos | 18.208 | 14.582 |
| Llamadas de dibujo | 25 | 15 |
| Texturas | ninguna | color, relieve y rugosidad, dentro del archivo |

Mejora: ojos con iris, pupila, brillo y párpado caído; pañuelo con lunares y nudo; oreja mordida que se lee de espaldas; almohadillas en las patas. No mejora: sigue sin cuello y el pelaje es negro mate, no "pelo".

**Su advertencia más útil:** durante la carrera el gato mide unos 60 píxeles, va de espaldas y el perro lo tapa, así que casi no se nota la diferencia. "Sin un plano cercano del gato en el juego, ningún trabajo de modelado se va a ver."

**Errores que declaró:**
1. Calibró el color mirando el render de Blender durante tres iteraciones; al verlo con las luces del juego salió negro puro con chispas blancas. Lo llamó "el error más caro de la sesión".
2. Al corregirlo se pasó: el gato parecía piedra gris con camuflaje.
3. El primer intento salió destrozado: ojos de 2 metros y el pañuelo alrededor del hocico. La consola no dio ningún error; lo vio al abrir la imagen.
4. Las orejas perdieron el rosado por una instrucción que borra más de lo que dice.
5. Casi entrega un mapa de relieve que no hacía nada; lo notó al abrir la textura.
6. Una de sus pruebas de tamaño no era válida y lo dijo.

**Lo que descubrió probando y no leyendo:** el exportador pierde sin avisar las texturas procedurales, las rampas de color y el sombreado tipo caricatura.

**Sin verificar:** nada en movimiento, ningún teléfono, y cómo se ve un gato negro en la Ciudad Neón, que es oscura.

### Coordinador — Tinto v4 entra al juego

- Comprobó el modelo con el verificador del agente: 16 objetos, los nodos del contrato, texturas dentro del archivo. Resultado "todo bien".
- Lo activó en el juego (una línea en `js/models.js`) y simuló 20 segundos de partida con saltos, deslizadas y habilidad: sin errores.
- Atendió la advertencia del agente: la pantalla de inicio ahora muestra a Tinto en primer plano, de frente, con Panela al fondo, en una ventana bajo el título. Visto en captura en formato de celular (`equipo/captura-inicio-tinto-v4.jpg`).
- Tropiezo: el navegador seguía usando una copia vieja de un módulo y la primera captura mostraba el menú anterior. Ahora cada carga pide los archivos con una marca de tiempo, lo que también evita que un celular se quede con una versión vieja.

### Coordinador — el drenaje

Idea del dueño: que algunas alcantarillas, marcadas con otro color, no solo hagan daño sino que bajen a un drenaje como los de Nueva York, con cocodrilos, y que se salga por una escalera.

- **En la calle:** aparece de vez en cuando una alcantarilla verde brillante. Si Tinto la pisa, cae al drenaje; si la salta, sigue por la calle. Las alcantarillas naranjas de siempre siguen quitando vida.
- **Abajo:** túnel de ladrillo con canal de agua, tubos y bombillos. Obstáculos propios: cocodrilos (se saltan), tubos oxidados (hay que agacharse) y barriles tóxicos (se esquivan). Hay muchos más ratones que arriba.
- **Panela no baja:** no cabe por la alcantarilla, así que abajo no hay perro y al salir Tinto le lleva ventaja.
- **Salida:** cada 130 metros hay una escalera con un rayo de luz en uno de los carriles. Si Tinto pasa por ese carril, sube y vuelve a la calle en el punto donde cayó; si no, sigue hasta la siguiente.
- **Cómo se hizo:** el núcleo ganó un mecanismo de "submundo" (guarda la calle, la oculta, y la restaura al volver) y los túneles se arman con el mismo sistema de mundos. El drenaje vive en un módulo nuevo, `js/sewer.js`.
- **Probado:** en simulación cayó, corrió, subió por la escalera a los 8 segundos y volvió al pueblo sin errores. Visto en captura fija (`equipo/captura-drenaje.jpg`).
- **Tropiezo:** la primera captura salió casi negra. Dos causas: la luz del túnel era muy baja, y el fundido a negro de la transición se quedaba pegado porque dependía de que el navegador dibujara. Se subió la luz y se cambió el fundido a un temporizador.
- **Sin verificar:** la caída y la subida en movimiento, y si el cocodrilo se entiende como cocodrilo visto desde atrás.

**Corrección del dueño: "debe haber algo que lo haga salir".** Tal como quedó, el drenaje era un refugio: sin perro y lleno de ratones, convenía quedarse. Se añadió un cocodrilo grande que persigue a Tinto ahí abajo.

- La cámara va detrás del cocodrilo, igual que arriba va detrás de Panela.
- Se acerca solo con el paso del tiempo, sin importar la vida: a los 26 segundos alcanza a Tinto y muerde (45 de vida), y vuelve a morder cada 3,5 segundos.
- Cuando está cerca sale el aviso "¡Busca la escalera!". La escalera es lo único que lo deja atrás; ahora aparece cada 110 metros.
- Probado en simulación: sin tomar la escalera, Tinto aguanta 36,5 segundos y la pantalla final dice "¡Te alcanzó el cocodrilo!"; tomándola, sale a los 7 segundos.
- Primer ajuste: con mordiscos cada 7 segundos los ratones curaban más de lo que el cocodrilo quitaba y Tinto sobrevivía 75 segundos. Se acortó el intervalo.
- Captura en `equipo/captura-cocodrilo.jpg`. En ella el cocodrilo tapaba a Tinto; se redujo su tamaño después y ese cambio no se volvió a mirar.

### Coordinador — arreglo del túnel

El dueño pidió "arreglar el túnel" sin decir qué fallaba. El coordinador lo recorrió en capturas y encontró esto:

- **Pantalla negra al bajar (el fallo grave).** El fundido a negro de la transición dependía de una animación del navegador; cuando esa animación no avanzaba, la pantalla se quedaba negra con el juego corriendo detrás. Ahora el propio juego mueve el fundido cuadro a cuadro.
- **"¡GUAU!" dentro del drenaje.** Al chocar abajo salía el ladrido de Panela, que no está ahí. Se quitó el texto y el sonido mientras Tinto está en el túnel.
- **La salida no se distinguía bien.** Se añadió un letrero verde de "SALIDA" y una flecha sobre cada escalera, además del rayo de luz.
- **El cocodrilo tapaba a Tinto.** Ya se había reducido; ahora se confirmó en captura que Tinto se ve completo (`equipo/captura-tunel-arreglado.jpg`).
- Probado: bajar, correr, tomar la escalera y volver al pueblo, sin errores. Sin verificar: el letrero de salida de frente (en la captura lo tapaba el aviso "¡Al drenaje!").

### Agente Render

**Terminado.** Primer agente del equipo que corrió en el modelo Fable, a pedido del dueño. Tardó unos 29 minutos y usó herramientas 146 veces. Todo quedó en `modelos/render/`.

**1. Cómo renderiza Blender en este computador** (misma escena, 768×768, Ryzen 7 5700G):

| Motor | Ajustes | Tiempo |
|---|---|---|
| Workbench | vista de estudio | 1,1 s (los ojos salen blancos) |
| EEVEE | 64 muestras | 17,3 s el primer cuadro; 1,9 s por cuadro en animación |
| Cycles en procesador | 16 muestras | 2,5 s, con ruido |
| Cycles en procesador | 64 muestras y limpieza de ruido | 12,7 s |
| Cycles en procesador | 256 muestras y limpieza de ruido | 32,6 s, sin diferencia visible frente a 64 |
| Cycles en gráfica | — | no arranca: la gráfica integrada no aparece como dispositivo |

La imagen promocional completa (1080×1920) tardó 116 segundos. Los tiempos se midieron con el computador ocupado en otras cosas, así que tienen un margen de alrededor del 20 %.

**2. Cómo se apropió de la herramienta, sin tocar la instalación:**

- Una carpeta de configuración propia (`modelos/render/config/`): preferencias, escena de inicio con estudio de tres luces y cámara.
- Un complemento del proyecto, `tinto_tools`, con operadores para cargar un personaje, montar el estudio, poner la cámara, posar, elegir preset, componer, renderizar y sacar stickers, más un panel "Tinto" en la ventana de Blender.
- Un lanzador (`tinto_blender.bat`) que arranca Blender ya con todo eso. Borrar la carpeta de configuración devuelve el Blender de fábrica.
- No recompiló Blender: todo lo pedido se puede hacer desde su interfaz de programación.

**3. Gráficos producidos:**

- `salidas/tinto_promo.png`: Tinto empujando un pocillo de tinto al borde de un poyo mientras mira a la cámara, en una calle colonial con pared encalada, zócalo azul, ventana con reja y teja de barro.
- `salidas/stickers/`: seis stickers de 512×512 con fondo transparente y contorno blanco (de reojo, empujando, corriendo, sentado, de espaldas, cola en alto).
- `salidas/tinto_giro_eevee.mp4`: giro de 360° de 3 segundos.

**Errores que declaró** (12 en su bitácora; los principales):

1. El lanzador falló dos veces por detalles de la línea de comandos de Windows; una de ellas intentó abrir un guion llamado "fondo".
2. El contorno de los stickers salió gris: la corrección de color de Blender convertía el blanco puro en gris.
3. La primera imagen promocional tenía la cámara pegada al gato y la luz de contorno detrás de la pared.
4. El gato salió azulado por el color del cielo.
5. La ventana "parecía televisor" y ubicó mal el pocillo dos veces por confundir la derecha de la cámara.
6. En el primer video la cámara pasaba detrás del fondo y el gato salía cortado. La consola decía "72 cuadros ok"; solo lo vio al extraer cuadros.
7. Creyó que el video llevaba 7 minutos renderizando cuando llevaba 1: miró la hora de los archivos y no la del sistema.

**Defectos que quedan a la vista:** en los stickers los bigotes se ven como una pelusa blanca junto al hocico; el escenario de la promocional es de cajas y cilindros; en el video se nota el horizonte del piso.

**Sin verificar:** la interfaz con ventana (el panel se comprobó por programación, no a ojo), el video en un teléfono y los stickers dentro de WhatsApp.

### Agente Panela

**Terminado.** Tardó unos 16 minutos. Entregas: `modelos/panela.py`, `modelos/panela.glb` (0,73 MB, 13.504 triángulos, texturas dentro del archivo) y `equipo/panela.md`.

- **El personaje:** perra café con pecho, hocico y frente blancos, orejas caídas oscuras, collar rojo con placa dorada, ojos grandes y lengua afuera. Ya no tiene cejas bravas ni dientes: es la amiga torpe que pedía la identidad.
- **¿Bastó la guía del agente anterior?** "Casi." El flujo de Blender sí: su guion corrió sin un solo error a la primera copiando las recetas. Lo que no cubría era todo lo que cambia cuando el personaje no es el gato.
  - Le faltó saber: que las formas fundidas salen entre 1,15 y 1,3 veces más grandes que lo escrito; cómo anima el juego al perro; que el verificador y el visor solo conocían al gato.
  - Encontró cosas equivocadas en la guía: la escala 1,25 vale solo para el gato; el paso "añadir el archivo al mapa de modelos" no sirve para el perro; y la lista final exige un "todo bien" del verificador que es imposible para algo que no sea el gato.
- **Errores que declaró:** en el primer intento la perra salió 30 % más gorda, con la mancha del lomo, la mandíbula y la lengua enterradas; modeló las orejas de canto, invisibles desde la cámara del juego, aunque la guía lo advertía; repitió el mapa de relieve casi liso del agente anterior; y persiguió un defecto falso, una "segunda cola" que era la del perro viejo asomando detrás.
- **Flojo, según él mismo:** no tiene una sonrisa que se lea; la lengua es una cinta tiesa; es más cachorro grandote que bulldog.

### Coordinador — Panela entra al juego, y más espacio en pantalla

- **Integración:** siguió los pasos que dejó el agente. El perro hecho por código se esconde y cada pieza del modelo nuevo se cuelga del pivote que el módulo de animación ya mueve, así las animaciones existentes siguen sirviendo. Si el archivo no carga, queda el perro anterior. Simuló 25 segundos de partida sin errores.
- **Problema nuevo:** Panela es más alta y de orejas más anchas que el perro anterior, y tapaba casi por completo a Tinto. Primer arreglo: subir la cámara.
- **Corrección del dueño:** "hay que darle más espacio, ni se ve bien; usa las medidas de otros juegos". Se tomaron las proporciones de los runners conocidos (personaje pequeño en la mitad inferior, mucha calle por delante): la cámara quedó más alta y más retirada, la distancia entre Panela y Tinto pasó de 6,7 a 8,5, y la cámara sube todavía más cuando Panela se acerca. Visto en captura en formato de celular (`equipo/captura-mas-espacio.jpg`).
- **Stickers:** los bigotes salían como una pelusa blanca porque son más finos que el contorno. Se ocultan al renderizar stickers; los seis se rehicieron en 16 segundos y la versión con el defecto quedó guardada en `modelos/render/intentos/`.
- **Sin verificar:** nada de esto en movimiento ni en un celular; los estados de derrota y victoria con Panela.

### Coordinador — cinco observaciones del dueño después de mirarlo

El dueño revisó el juego y trajo cinco críticas concretas. Las cinco eran válidas.

| Lo que dijo | Qué pasaba | Qué se hizo |
|---|---|---|
| "Si me agacho debajo de un carro, en teoría podría pasar; en una valla no" | Agacharse solo servía para la cinta policial; contra un carro se chocaba igual | Carros, buses y la chiva tienen ahora un hueco bajo el chasis: agachado se pasa por debajo. La valla sigue bloqueando. La deslizada dura un poco más para alcanzar a cruzar un bus |
| "La parte de arriba no deja ver, tiene muchos listones" | Los banderines del pueblo colgaban a 6 de altura cada 26 metros; al subir la cámara quedaron justo frente a ella | Se subieron a 11,5 y se pusieron cada 52 metros |
| "En el túnel el techo se ve muy encima, uno se estrella, no es claro" | El techo estaba a 7,7 y la cámara nueva va entre 6,8 y 10: prácticamente lo rozaba | Bóveda a 13 de altura, paredes y escaleras más altas. Cocodrilos de color más vivo y con una estela clara para que se lean sobre el agua |
| "Faltan cosas para subirse, como en Subway Surfers; balcones con monedas y comida" | Todo el juego ocurría a nivel del piso | Mecánica nueva: rampa y tarima de madera. Por la rampa se sube a un andamio de 14 metros con cinco monedas y un pescado; quien llega de frente sin rampa choca. El motor ahora sabe de pisos elevados |
| "Si me encuentro una gallina y soy un gato, pues me la como" | Las gallinas (y los cangrejos de la costa) eran obstáculos que quitaban vida | Ahora son comida: dan vida y cuentan como presa, igual que el pescado nuevo |

- **Probado con números:** agachado bajo un carro y bajo un bus, vida 100; de pie contra el carro, 70; agachado contra la valla, 80. La gallina sube la vida de 50 a 58. Por la rampa Tinto llega a 2,2 de altura, recoge las cinco monedas y sale ileso; de frente contra la tarima sin rampa, pierde 25.
- **Partidas largas simuladas** en los tres mundos (de 890 a 1.304 metros) pasando por tarimas, sin errores.
- **Vistos en captura:** la tarima en el pueblo (`equipo/captura-tarima.jpg`) y el túnel con el techo alto y el letrero de salida (`equipo/captura-tunel-techo-alto.jpg`).
- **De paso:** en pantallas angostas la barra de vida quedaba reducida a un punto; ahora ocupa su propio renglón.
- **Sin verificar:** la sensación de subir y bajar de la tarima en movimiento; si el hueco bajo los carros se entiende a simple vista (no hay ninguna pista visual que lo anuncie); las habilidades de embestida y sigilo contra una tarima.
- **Lección:** el dueño encontró en minutos cinco problemas que ningún agente había reportado. Los agentes comprobaban que nada fallara; nadie se había preguntado si las reglas tenían sentido para un gato.

### Coordinador — segunda ronda de observaciones del dueño

El dueño lo jugó: "naturalmente funciona, me gusta cómo se ve". Trajo tres puntos.

- **"Los listones están por el cielo, volando."** El arreglo anterior de los banderines fue un parche: para que no taparan la vista se subieron a 11,5 de altura, por encima de los techos, sin nada que los sostuviera. Era físicamente absurdo. Ahora son guirnaldas colgadas a lo largo de cada fachada, de farol a farol, a 5,3 de altura: cuelgan de algo y no cruzan la calle (`equipo/captura-banderines-fachadas.jpg`).
- **"Aún no está habilitado entrar a otras calles."** Sí estaba, pero dependía de un doble toque rápido que en un celular no se descubre ni sale fácil; en la práctica era como si no existiera. Ahora, al acercarse a un cruce, aparece un botón grande con flecha y la palabra GIRAR en el lado de la calle disponible; tocarlo basta. El doble toque sigue sirviendo. Probado pulsando el botón por código: Tinto gira.
- **"No me gusta que sea tan colombiano; no creo que sea tan de vender."** Contradice lo que recomendaron los tres pensadores, que veían en lo colombiano el diferencial. La decisión es del dueño. Primer paso, reversible: los mundos se llaman ahora "Pueblo Viejo" y "La Costa" y sus descripciones ya no nombran burros ni fiestas de pueblo. Queda pendiente que el dueño diga hasta dónde llegar: los nombres Tinto y Panela, la chiva y la arquitectura siguen siendo colombianos.

Lección para la tabla de errores: un arreglo que resuelve la queja (ya no tapan la vista) puede romper otra cosa que nadie pidió revisar (ahora flotan). Y una función que existe pero no se descubre equivale, para quien juega, a una función que no está.

### El dueño lo dejó solo tres minutos y no pasó nada

Después de jugar un rato, el dueño reportó el problema más serio hasta ahora: "llevo como 3 minutos corriendo y lo dejé solo por la mitad; el perro nunca lo alcanzó, nunca tuve que moverlo". Un runner que se juega solo no es un juego. Ningún agente lo había detectado: todos probaban con bots que saltaban y se movían, nunca con uno que no hiciera nada.

Además pidió: que las rampas en mitad de la calle se reemplacen por balcones; más obstáculos; puntos de regeneración ("canecas de basura de donde el gato salga"); que sea adictivo siguiendo las reglas del género; y seguir modelando en Blender todas las figuras. Pidió expresamente un agente en Fable para organizar la lógica y dos en Opus para lo adictivo.

**Cómo se organizó:** tres agentes editando las mismas reglas a la vez se habrían pisado, así que se partió en dos fases.

- **Fase 1, en paralelo:** el agente Lógica (Fable) audita y mide sin cambiar nada; los dos diseñadores (Opus) escriben las especificaciones; el agente Figuras modela utilería en Blender.
- **Fase 2:** el mismo agente Lógica implementa las dos especificaciones y comprueba con su banco de bots que ya no se pueda sobrevivir sin jugar.

**Diseñador de motivación (Opus) — terminado.** Entrega: `equipo/diseno-motivacion.md` (960 líneas). Ningún número se probó con personas ni con bots: son valores de partida.

- **Primero hay que poder perder:** nada de lo suyo sirve mientras un jugador quieto sobreviva. Su vara: un bot que no toca nada debe perder entre los 20 y los 35 segundos.
- **Siempre una meta pequeña a la vista:** un renglón de "próxima meta" bajo el marcador (la caneca más cercana, un hito de distancia, el récord).
- **Multiplicador real:** la racha hoy es solo un adorno; propone que vaya de x1 a x5, suba con acciones y baje al chocar.
- **"¡Por un pelo!":** pasar rozando un obstáculo da puntos y un instante de cámara lenta.
- **Perder dura 2 segundos y se vuelve con un toque,** con una frase de "casi" que use el número real ("te faltaron 85 puntos para tu récord").
- **Continuar desde la caneca cuesta una sardina, una vez por partida.** Las sardinas solo se encuentran jugando; sin cuenta regresiva, sin monedas, sin anuncios.
- **Misiones encadenadas** y un "nivel de travesura" que sube con el tiempo.
- **El gesto de Tinto se vuelve mecánica:** tumba objetos al pasar, eso distrae a Panela y llena un álbum de "Cosas que Tinto no tumbó".
- **Lo que más enganche daría por menos trabajo:** la pantalla de derrota con el "casi" y arranque en un toque; el récord visible como una cinta en la calle; y el multiplicador real con el "por un pelo".
- **Lo que descartó por ética:** fabricar el "casi" ajustando la dificultad, cuentas regresivas, cobros y anuncios.
- **Límites que declaró:** no leyó el diseño del bucle porque aún no existía; varias fuentes las conoce solo por resúmenes; dos referencias van citadas de memoria; no encontró datos publicados de retención de ningún runner.

**Diseñador del bucle (Opus) — terminado.** Entrega: `equipo/diseno-bucle.md` (709 líneas). Antes de diseñar midió el juego con bots propios (8 a 10 partidas por caso):

| Mundo | Bot quieto, mediana | Máximo |
|---|---|---|
| Pueblo | 71 s | 213 s |
| Costa | 54 s | 152 s |
| Neón | 26 s | 56 s |

La queja del dueño se reproduce. Su diagnóstico: la causa no es la velocidad ni la cantidad de obstáculos, sino que la vida se regenera sola (ratones y filas enteras de gallinas) y que las filas dejan carriles libres al azar.

Decisiones principales:

1. **Sin barra de vida; modelo clásico de dos niveles.** Un tropiezo pega a Panela durante 6 segundos; otro tropiezo en esa ventana es captura. Un choque de frente contra algo macizo (carro, bus) es captura inmediata.
2. **Nada que se recoja recupera distancia.** Solo correr limpio, o acciones: balcón, girar en un cruce, caneca, salir del drenaje.
3. **Ratones y comida llenan un "Bocado":** Tinto lo suelta, Panela se distrae y eso salva de una captura por doble tropiezo.
4. **Obstáculos por patrones con garantías:** toda fila tiene salida alcanzable; ningún carril pasa más de 2 filas sin exigir acción; saltar, agacharse y cambiar de carril son obligatorios cada 6 a 8 filas.
5. **Dificultad por oleadas** con respiros, y velocidad de 15 a 32 (hoy llega a 38).
6. **Balcones como cuarto y quinto carril elevados,** pegados a las fachadas, con monedas y comida arriba.
7. **Canecas: escondite y punto de regeneración.** Se pasa agachado por una caneca volcada; si después atrapan a Tinto, sale de ahí.
8. **Drenaje y calles laterales como rutas con riesgo anunciado.**

Además: 11 obstáculos nuevos genéricos (contenedor, poste caído, zanja, ciclista, carrito que cruza, hidrante, bolardos y otros) y metas para los bots: quieto, mediana de 9 segundos o menos y nunca más de 15; jugador medio, entre 45 y 100 segundos; experto, 300 o más.

Límites que declaró: no pudo abrir las wikis de los juegos de referencia y cita la regla del doble tropiezo por resúmenes; las metas del jugador medio y experto salen de una cuenta suya, no de una medición.

**Choque entre los dos diseños, resuelto por el coordinador:** uno propone que la caneca rescate gratis por haber pasado por ella; el otro, que cueste una sardina. Queda: pasar por la caneca la activa como punto de regeneración, y usarla cuesta una sardina.

### Coordinador — publicado en GitHub

El dueño creó el repositorio `manuelleal/Cat-Run` y pidió subirlo. Se subieron solo los archivos del juego (12 archivos: la página, el código y los modelos de Tinto y Panela); el registro del equipo, las bitácoras y los intentos quedaron fuera por ahora. GitHub Pages quedó activo en `https://manuelleal.github.io/Cat-Run/` y responde. Es la versión anterior al arreglo de la lógica: todavía se puede sobrevivir sin jugar.

### Agente Figuras

**Terminado.** Tardó unos 25 minutos. Modeló en Blender las seis figuras pedidas y las dos opcionales, todas en `modelos/props/`, con un solo guion que las genera en 8 segundos.

| Figura | Peso | Triángulos |
|---|---|---|
| Cocodrilo | 75 KB | 2.040 |
| Ratón | 19 KB | 556 |
| Moneda | 30 KB | 576 |
| Gallina | 35 KB | 1.238 |
| Pescado | 17 KB | 584 |
| Caneca de basura (con tapa aparte) | 46 KB | 1.204 |
| Carro | 33 KB | 964 |
| Valla | 14 KB | 252 |

Las ocho suman 269 KB. No usó texturas: solo color por vértice, para que pesen poco y entren por el mismo camino que la utilería anterior. El costo es que no hay detalle fino como escamas o plumas.

**Errores que declaró** (diez): puso al revés los signos de las dos bisagras, así que la quijada del cocodrilo se hundía en el piso y la tapa atravesaba la caneca; la cola de la gallina apuntaba hacia adelante; la gallina le salió "muñeco de nieve" (tres bolas apiladas) y rehízo el cuello; las crestas del cocodrilo no se veían con las luces del juego; su propio chequeo marcaba como falla a la moneda y el pescado por flotar, cuando flotan a propósito; y repitió el error de las comillas en un parche por línea de comandos que ya habían cometido el coordinador y el agente Render.

**Sin verificar:** nada en movimiento; el rendimiento con decenas de ratones a la vez; la caneca con el gato saliendo.

### Coordinador — las figuras entran al juego

- Conectó siete de las ocho (ratón, moneda, gallina, pescado, cocodrilo, valla y carro en sus tres colores). La caneca espera a la mecánica de regeneración.
- Cada figura reemplaza al prototipo hecho por código; si un archivo no carga, queda la figura anterior.
- El cocodrilo perseguidor del drenaje se arma ahora al bajar, para que tome el modelo nuevo.
- Simuló 20 segundos de partida sin errores y lo vio en captura en formato de celular (`equipo/captura-figuras-en-juego.jpg`): taxi, valla, ratones, monedas, pescado y gallina se distinguen.

### Agente Lógica (Fable) — fase 1: la auditoría

**Terminada.** Tardó unos 33 minutos. No tocó el juego: leyó todo el código, construyó un banco de bots (`pruebas/bots.js`) y midió 480 partidas con semillas reproducibles.

**Cuánto dura cada tipo de jugador** (mediana; el tope de la prueba eran 300 segundos):

| Jugador | Resultado |
|---|---|
| Quieto | 27 a 115 s según carril y mundo; hubo partidas que llegaron al tope de 300 s |
| Al azar | 33 a 108 s: jugar al azar equivale a no jugar |
| Humano medio | Llega al tope en 10 de 10 partidas en Pueblo y Costa, 6 de 10 en Neón |
| Experto | 10 de 10, 10 de 10 y 9 de 10 |

Es decir: no solo se sobrevivía quieto; jugando con atención normal era casi imposible perder.

**Las causas, ordenadas por peso:**

1. **La curación iguala al daño.** El jugador quieto recibe unos 230 puntos de daño por minuto y recupera entre 150 y 190. Al quitar la curación en una prueba, la mediana del quieto en el Pueblo cayó de 83 a 35 segundos.
2. **No existe "atrapar".** La partida solo termina con vida en cero, y la vida se rellena. La distancia de Panela era decorativa.
3. **Un tercio de las filas no exige nada:** entre 65 y 69 % dejan un carril libre.
4. **La dificultad no crece:** la velocidad llega a su tope a los 100 segundos; quien aguanta 2 minutos aguanta 20.
5. **Obstáculos que no hacen daño o que curan** ocupan entre 15 y 32 % de las filas. Varios los añadió el coordinador al atender observaciones del dueño (gallinas como comida, tarimas con pescado).
6. **La invulnerabilidad tras un golpe quedó descartada** como causa: la midió y casi no influye.

En los niveles, el bot quieto ganaba 4 de 5 veces los niveles 1 a 3 del Pueblo.

**Incoherencias entre módulos:**

- **Un error confirmado:** si un nivel termina con la embestida del gato Bola activa, la velocidad queda rebajada a 9 para la partida siguiente.
- Los ajustes de dificultad tienen tres módulos que los escriben y dos formas distintas de deshacer el cambio.
- La distancia de Panela la escriben tres partes del código en el mismo cuadro cuando Tinto está en el drenaje.
- El módulo de animación anulaba la sacudida de cámara del núcleo en cada cuadro.
- Las reglas de vida están repartidas en cuatro módulos.

**Sus errores:** perdió dos lotes de mediciones porque otra sesión le navegó la pestaña del navegador; un lote de niveles se cayó por abrir el mundo 3 con menos estrellas de las necesarias; y una prueba le dio un resultado falso porque el juego le devolvía el gato gratuito cuando pedía uno no comprado.

### Agente Lógica (Fable) — fase 2: el arreglo

Se le reactivó con los dos diseños y las decisiones ya tomadas. Es el trabajo más largo que ha hecho un agente del equipo: cerca de una hora y media y 277 usos de herramientas entre las dos fases.

**Antes y después, con las mismas partidas** (10 semillas por caso, tres mundos):

| Criterio | Antes | Después |
|---|---|---|
| Jugador quieto | 27 a 115 s; algunas partidas llegaban a 300 | **6,3 s** de mediana y 6,5 de máximo, en cualquier carril y mundo |
| Jugador al azar | 33 a 108 s | 6,3 a 6,4 s (máximo 28) |
| Humano medio en el Pueblo | 300 s, nunca perdía | **62 s** (entre 23 y 113) |
| Humano medio en Neón y Costa | casi nunca perdía | 57 s y 37 s |
| Experto frente a humano | iguales | 300 s contra 62 |
| Curación frente a daño | 60 a 93 % | ya no hay curación |
| Partidas que terminan por "atrapado" | 0 % | 100 % |
| Filas que obligan a actuar | 31 a 35 % | 69 a 73 % |
| Bot quieto ganando niveles | 4 de 5 en tres niveles | 0 de 5 en los quince |
| Velocidad rebajada tras la embestida de Bola | ocurría | ya no puede ocurrir |

**Qué implementó:**

- **Modelo de fallo nuevo:** un tropiezo acerca a Panela durante 7 segundos y otro tropiezo en ese lapso es captura; un choque de frente contra algo macizo es captura inmediata, salvo en el primer mundo. Desaparece la barra de vida; ratones y comida llenan el "Bocado".
- **Generador de obstáculos por patrones** con garantías comprobables: siempre hay salida, y ningún carril pasa más de dos filas sin exigir algo.
- **Dificultad por escalones** y un arranque guionado para los primeros segundos.
- **Una sola tabla de reglas** (`js/rules.js`): los demás módulos ya no pueden escribir los ajustes directamente.
- **Canecas de basura** con rescate por una sardina, una vez por partida.
- **Derrota en un toque,** con frases de Panela y el "casi" real; multiplicador de x1 a x5; "por un pelo"; renglón de próxima meta.
- **Balcones** en lugar de rampas, solo en el Pueblo por ahora.
- **Siete obstáculos nuevos** hechos por código: contenedor, bolsas, poste caído, zanja, tubo de concreto, hidrante y andamio.
- **Pantalla de estadísticas** (`?stats=1`) con botón de copiar, para los jugadores de prueba.

**Lo que no cumplió o dejó fuera:**

- La Costa quedó más dura de lo previsto para un humano medio (37 segundos).
- El experto casi nunca pierde en el Pueblo (6 de 10 partidas llegan al tope).
- "Por un pelo" sale poco: entre 0,3 y 0,5 veces por minuto, cuando el diseño pedía de 2 a 5.
- Fuera: balcones en Costa y Neón, objetos temporales, misiones encadenadas, álbum, sonido, cámara lenta y cuatro de los once obstáculos nuevos.

**Dato para la economía:** un humano medio gana entre 182 y 198 monedas por minuto, casi el doble de lo que supuso el diseñador de motivación. No tocó los precios.

**Errores que declaró** (siete): durante un tramo las piezas de los mundos no hacían daño porque les asignó el valor antes de que existieran, y un jugador quieto duró 62 segundos en la Costa "pasando tres filas"; en Neón aparecían filas vacías; la ventana de 6 segundos se vencía sola antes de la siguiente fila, y por eso la subió a 7; el cocodrilo alcanzaba incluso al experto; y contaminó los datos guardados del navegador con sus pruebas, que luego restauró a mano. Avisó que si alguien jugó en otra pestaña de ese navegador durante su trabajo, ese progreso se perdió.

**Nunca vio el juego en movimiento.**

### Coordinador — verificación del arreglo

- Repitió por su cuenta la prueba del jugador quieto, cinco partidas en el Pueblo: 6,5 - 6,2 - 6,3 - 6,3 - 6,5 segundos. Coincide con lo que reportó el agente.
- Cargan los nueve modelos sin fallas y no hay errores en la consola.
- Vio una captura en formato de celular (`equipo/captura-reglas-nuevas.jpg`): el marcador nuevo trae sardinas, caneca, barra de Bocado y el renglón "tu récord en 56 m".
- Sin verificar por el coordinador en ese momento: los balcones, la caneca y su rescate, los siete obstáculos nuevos, la pantalla de derrota y la de estadísticas.

### Coordinador — revisión a ojo del arreglo: las canecas no existían

El dueño dijo "sigue", y el coordinador recorrió en capturas lo que el agente Lógica no había podido ver.

- **Fallo encontrado: las canecas de basura nunca aparecían.** El marcador anunciaba "caneca en 80 m", la cuenta llegaba a cero y no había nada en la calle. En 3.375 metros por mundo, cero canecas en los tres mundos. Toda la mecánica de regeneración estaba escrita y funcionaba, pero la caneca no estaba inscrita en el registro de piezas del generador, así que la condición para sembrarla era siempre falsa. Faltaba una línea.
- **Por qué pasó la revisión del agente:** su informe decía "probado de punta a punta", y era cierto para el rescate, que probó poniendo la caneca a mano. Lo que no probó fue que el generador la pusiera solo. Sus bots tampoco lo delataron, porque ninguno dependía de encontrar una caneca.
- **Arreglo y comprobación:** con la línea añadida aparecen cada 800 a 1.000 metros en los tres mundos (primera a los 188 metros). Probado completo: Tinto pasa agachado y queda con la carga; al perder, la pantalla ofrece "Salir de la caneca (1 sardina)"; al pulsarlo vuelve a la carrera y se descuenta la sardina.
- **Visto en capturas:** la caneca en la calle (`equipo/captura-caneca.jpg`), la pantalla de derrota (`equipo/captura-derrota.jpg`) y los escalones del balcón (`equipo/captura-balcon.jpg`).
- **Observaciones que quedan:** la caneca se ve pequeña y se confunde con un obstáculo cualquiera; el contenedor, el hidrante y el tubo de concreto no salieron en 14 kilómetros del Pueblo (pueden estar reservados para otros mundos; no se confirmó).

### Coordinador — las letras

El dueño mandó referencias (tipografías de arcade y el logotipo de Clash Royale) y dijo que las letras "se ven horribles". Tenía razón: todo usaba la fuente del sistema.

- **Fuentes:** Lilita One (gruesa, de arcade) para títulos, botones y números; Fredoka para los textos que hay que leer. Se cargan de Google Fonts.
- **Logotipo "TINTO":** tres capas superpuestas: contorno oscuro grueso con volumen hacia abajo, filo blanco y relleno en degradado de amarillo a naranja. Debajo, una cinta roja inclinada con "CAT RUN".
- **Menú:** se oculta el marcador mientras no hay partida, porque chocaba con el logotipo.
- Hicieron falta tres intentos: en el primero el degradado quedó tapado por el filo blanco (el relleno se pintaba como fondo, debajo de las otras capas) y el logotipo se salía de la pantalla; en el segundo el contorno salió corrido a la derecha, porque el título ocupaba todo el ancho y las capas no estaban centradas igual; el tercero es el que quedó.
- Visto en captura en formato de celular (`equipo/captura-letras-nuevas.jpg`). Sin revisar a fondo: las pantallas de mapa, tienda, misiones y resultado con la fuente nueva.

## Errores y tropiezos

El propósito del ejercicio es mostrar cómo trabajan los agentes con herramientas reales, y eso incluye dónde fallan. Esta lista se mantiene al día.

| Quién | Qué pasó | Cómo se detectó | Qué se hizo |
|---|---|---|---|
| Coordinador | Interpretó la carpeta "GATO" como el juego de tres en raya y construyó eso completo antes de saber qué quería el dueño | El dueño pegó el documento de diseño del runner | Se descartó el tres en raya y se rehízo desde cero |
| Coordinador | Asumió que el giro en las esquinas debía ser obligado (tipo Temple Run) | El dueño lo corrigió: quería calles normales con giro opcional | Se rediseñó la calle con cruces y salidas laterales |
| Coordinador | No podía ver el juego: con la ventana oculta el navegador no dibuja ni deja tomar capturas | Las capturas fallaban por tiempo | Añadió un modo de simulación por código; más tarde las capturas volvieron a funcionar |
| Coordinador | Las pruebas automáticas se colgaban tras partir el juego en módulos | La herramienta devolvía "error interno" | Midió y encontró que dibujar cada cuadro en la ventana oculta tardaba hasta 90 ms; creó un simulador que no dibuja |
| Coordinador | Probó una versión vieja sin darse cuenta: el navegador tenía la página en caché | El objeto del juego no existía en la página | Recargar con un parámetro distinto en la dirección |
| Coordinador | Lanzó a tres pensadores con una meta tomada de una sola frase del dueño | El dueño dijo minutos después que esa meta no importaba | Les envió la corrección a mitad de trabajo; parte de su investigación quedó sin uso |
| Gatos | Una prueba le dio un fallo falso: otra pestaña cambió el gato guardado mientras medía | Los ajustes no coincidían con los de fábrica | Repitió la medición con la línea base bien tomada |
| Niveles | Dejó el nombre "Prueba" guardado un rato y otras pestañas lo usaron en sus puntajes | Lo notó al limpiar sus datos | Borró el nombre de esa entrada |
| Mundos | La Ciudad Neón quedó con ventanas enormes y demasiado oscura | Lo vio en una captura fija | La corrigió y volvió a mirar |
| Animación y Niveles | Entregaron animaciones que nunca vieron en movimiento | Lo declararon ellos mismos | Pendiente: revisión a ojo por una persona |
| Los tres pensadores | Propusieron nombres sin revisar registros de marca; dos usaron "Panela" para personajes opuestos | Al comparar los tres informes | El dueño eligió Tinto (gato) y Panela (perro); la revisión de marca sigue pendiente |
| Coordinador (Blender) | Primer modelo de Tinto sin oreja izquierda: la operación de recorte para la "mordida" borró la oreja completa | Lo vio en la imagen de control | Cambió el recorte por un corte diagonal de la punta |
| Coordinador (Blender) | Ojos, nariz y pañuelo quedaron dentro de la cabeza: las formas fundidas se inflan más de lo calculado | Lo vio en la imagen de control | Dejó de usar coordenadas fijas y pasó a ubicar los rasgos con rayos sobre la superficie real |
| Coordinador (Blender) | Un comando para aplicar las correcciones falló por comillas mal anidadas y no ejecutó nada | El intérprete devolvió error de sintaxis | Reescribió el guion completo en un archivo en vez de parchearlo desde la línea de comandos |
| Coordinador | El drenaje salió casi negro en la primera captura: poca luz y un fundido a negro que no se quitaba con la ventana oculta | Lo vio en la captura | Subió la luz del túnel y cambió el fundido a un temporizador |
| Blender | Ajustó colores mirando solo el render de Blender; con las luces del juego el gato salió negro puro | Al abrirlo en un visor con las luces del juego | Hizo un visor propio y recalibró ahí |
| Blender | Primer intento con ojos de 2 metros y pañuelo en el hocico, sin ningún error en consola | Al abrir la imagen | Corrigió el cálculo de vértices y el origen de los rayos |
| Coordinador | Captura del menú con una versión vieja del módulo de niveles guardada por el navegador | El cambio no aparecía en la imagen | Forzó la recarga y añadió marca de tiempo a la carga de módulos |
| Coordinador | La dirección del juego sin parámetros mostraba la primera versión de todas: el navegador la tenía guardada y el servidor no le decía que no la guardara. Es probable que el dueño viera eso mismo en su celular durante horas | Al probar la dirección limpia, el título era el viejo y el juego nuevo no existía | Reemplazó el servidor por uno propio (`servidor.py`) que prohíbe guardar copias |
| Coordinador | Logotipo: primero el degradado quedó tapado y el texto se salía de la pantalla; después el contorno salió corrido | Lo vio en las capturas | Reordenó las capas y las centró igual que el título |
| Coordinador | En el túnel la pantalla podía quedarse en negro: el arreglo anterior del fundido seguía dependiendo de una animación del navegador | Al volver a capturar el túnel salió todo negro | El fundido ahora lo mueve el juego cuadro a cuadro |
| Coordinador y Animación | Al chocar en el drenaje salía el ladrido de Panela, que no está abajo: ningún módulo sabía del drenaje porque se hizo después | Lo vio en una captura | Se desactiva el ladrido mientras Tinto está en el túnel |
| Render | Video con el gato cortado: la cámara pasaba detrás del fondo, y la consola reportaba todo bien | Al extraer cuadros del video y mirarlos | Reubicó la órbita de la cámara |
| Render | Contorno de stickers gris en vez de blanco, por la corrección de color | Al abrir la imagen | Subió el valor del blanco antes de la corrección |
| Panela | Primer modelo 30 % más gordo de lo previsto, con piezas enterradas | Por las medidas impresas del torso, no por la consola | Recalibró los radios |
| Coordinador | Al entrar Panela, tapaba casi por completo a Tinto en la partida | Lo vio en la captura; el dueño además pidió más espacio | Cámara más alta y retirada y más distancia entre los dos |
| Coordinador | Al subir la cámara para dar más espacio no revisó qué quedaba ahora en su camino: los banderines del pueblo y el techo del túnel tapaban la vista | Lo reportó el dueño al mirarlo | Banderines y bóveda más altos |
| Todo el equipo | Reglas sin sentido para un gato: las gallinas hacían daño y no se podía pasar bajo un carro. Ningún agente lo cuestionó | Lo señaló el dueño | Gallinas y cangrejos pasan a ser comida; los vehículos se cruzan agachado |
| Coordinador | Para que los banderines no taparan la vista los subió por encima de los techos: quedaron flotando en el cielo | Lo vio el dueño al jugar | Guirnaldas colgadas a lo largo de las fachadas |
| Coordinador | El giro a calles laterales dependía de un doble toque que en celular no se descubre; el dueño creyó que no estaba habilitado | Lo reportó el dueño | Botón visible de GIRAR al acercarse a un cruce |
| Todo el equipo | El juego se podía dejar quieto en el carril central y sobrevivir minutos. Todas las pruebas usaban bots que se movían; nadie probó no hacer nada | Lo descubrió el dueño jugando | En curso: auditoría con bots (incluido uno quieto) y rediseño del modelo de fallo |
| Coordinador | Al atender las observaciones del dueño (gallinas como comida, pescado en tarimas) añadió curación sin medir el balance: empeoró el problema de fondo | Lo mostró la auditoría del agente Lógica | Rediseño del modelo de fallo: nada que se recoja recupera distancia |
| Coordinador | Navegó el navegador sin indicar pestaña mientras otro agente medía en la suya, y le tumbó dos lotes de pruebas | Lo reportó el agente afectado | Cada sesión usa su pestaña e indica siempre cuál |
| Lógica | Durante un tramo de su trabajo los obstáculos de los mundos no hacían daño: les asignó el valor antes de que existieran | Un bot quieto duró 62 segundos en la Costa | Reordenó la asignación y añadió una validación |
| Lógica | Las canecas de regeneración nunca aparecían: faltaba inscribirlas en el registro de piezas. El marcador las anunciaba igual. Reportó la mecánica como probada de punta a punta porque la probó poniendo la caneca a mano | Lo encontró el coordinador al buscarla en capturas | Una línea; comprobado en los tres mundos |
| Lógica | Un obstáculo que solo se puede esquivar de lado (ni saltando ni agachado) se veía como un montón bajo de bolsas negras: parecía saltable y no se entendía qué era | Lo reportó el dueño con una captura: "ni saltando ni por debajo se puede pasar" | Pasa a ser una pila alta de cajas con un tablero rojo y una equis blanca. Comprobado: saltando o agachado, tropiezo; cambiando de carril, ninguno |
| Coordinador y agentes | El sonido se desbocaba: las pruebas automáticas simulan miles de cuadros en un instante y cada efecto sonaba de verdad, todos apilados; además el juego seguía sonando con la pestaña oculta y no había tope de sonidos a la vez | Lo reportó el dueño: "suena a lo loco" | Mudo durante la simulación, pausa y silencio al ocultar la pestaña, y máximo seis sonidos simultáneos. Comprobado: 20 segundos simulados, cero sonidos; 30 llamadas seguidas, suenan seis |
| Varios agentes | Compartían el mismo almacenamiento del navegador y se contaminaron los datos de prueba entre sí | Puntajes y gatos de prueba aparecieron en pestañas ajenas | Cada uno limpió lo suyo; faltó darles un espacio de pruebas separado desde el principio |

## Si este juego fuera a dar mucha plata

Cada constructor dejó su respuesta en la última sección de su bitácora (`equipo/mundos.md`, `equipo/gatos.md`, `equipo/animacion.md`, `equipo/niveles.md`). Falta reunirlas aquí.

## Próximo ejercicio (solo plan, no se ha empezado)

Replicar este juego como herramienta para aprender **verbos irregulares en inglés**: la misma base de runner, pero lo que se recoge y se esquiva depende de reconocer la forma correcta del verbo. Queda como ejercicio aparte, para hacerlo con el mismo método de equipo de agentes.
