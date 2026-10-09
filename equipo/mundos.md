# Bitácora — agente Mundos

**Rol:** escenarios, fondos, clima y obstáculos propios de cada mundo. Entrego `js/worlds.js` (un solo archivo, sin recursos externos). No toqué `core.js`, `index.html`, gato, perro, cámara ni interfaz.

## Qué hay

`game.worlds` queda con exactamente 3 mundos, en orden de dificultad. Cada uno trae además `dificultad: 1 | 2 | 3` (dato extra por si Niveles lo quiere leer).

| # | id | Lugar | Arquitectura y calzada | Fondo y clima animados | Obstáculos propios (filas) |
|---|---|---|---|---|---|
| 0 | `pueblo` | Pueblo Colonial | Casas blancas con zócalo de color, tejado de barro a dos aguas, balcones con flores, aleros con columnas, faroles; calle empedrada; guayacanes amarillos y rosados; iglesia con campanario y palmas de cera detrás de las casas | Cordillera en dos planos con nevados, nubes que giran; banderines de fiesta que ondean de lado a lado, campana que se mece, mariposas amarillas, golondrinas dando vueltas | `gallinas` (picotean y se mueven, se saltan), `burro` cafetero que cruza despacio moviendo las patas, `chiva` parqueada, `balon` que cruza rebotando (se puede pasar por debajo en lo alto del rebote), `tendedero` con ropa que se mece (deslizarse) |
| 1 | `playa` | Costa Caribe | Casetas de tabla con techo de palma y toldo de rayas alternadas con claros de arena (palmeras, sombrillas, torre de salvavidas); malecón de tablas con baranda de cuerda; faro; dunas | Mar que sube hasta el horizonte con olas que avanzan hacia la orilla y espuma que late, islas, veleros que navegan, sol, nubes; cometas volando en ocho, banderas de playa, brisa con rocío, gaviotas | `cangrejos` que corren de lado, `cocos` que ruedan hacia el gato, `gaviota` que viene de frente a la altura de la cabeza aleteando (deslizarse), `pelota` de playa que rebota, `castillo` de arena (saltar), `surf` (tablas clavadas), `sombrilla`, `lancha` varada, `red` de voleibol (deslizarse) |
| 2 | `neon` | Ciudad Neón | Torres altas con ventanas que brillan (mapa emisivo), tiras de neón, vitrinas, rótulos en español ("AREPAS 24H", "MIAU BAR", "TINTO Y PAN"…), pórticos con pantalla, farolas, asfalto mojado con reflejos | Horizonte de rascacielos, luna, estrellas que titilan, balizas rojas que parpadean, tres reflectores que barren el cielo, lluvia, relámpagos (destello de luz + rayo en el cielo + trueno), rótulos que fallan, hologramas giratorios | `motos` de domicilio que vienen de frente con la farola encendida, `dron` que patrulla los tres carriles (deslizarse), `barrera` (talanquera que sube y baja: solo choca abajo), `laser` (rayo verde bajo = saltar / rojo alto = deslizarse, se turnan y parpadean antes de cambiar), `charco` electrificado de dos carriles con chispas, `zigzag` (carro que cambia de carril) |

Las 20 filas nuevas se registran con `weight: 0`, así que solo salen en el mundo que las pide en su `rowWeights`. Cada mundo también reajusta las filas del núcleo (por ejemplo: sin bus en el pueblo, sin carros en la playa, sin fila `libre` en neón).

## Decisiones de diseño

- **Dificultad por composición, no por velocidad.** No toco `cfg` (es de Niveles/núcleo). Pueblo: casi todo quieto o lento y daños bajos. Costa: aparecen cosas que vienen de frente (cocos, gaviotas) y laterales rápidas. Neón: de frente y rápidas (motos), obstáculos de leer el momento (láser, talanquera), sin filas libres y daños de 20–30.
- **Toda fila tiene salida.** Lo que ocupa los tres carriles siempre se pasa saltando o deslizándose; el carro en zigzag deja siempre un carril libre.
- **Los que vienen de frente solo arrancan cuando el gato está cerca** (40–50 m) y en el tramo actual, para que no atraviesen la fila anterior ni se muevan en calles que aún no se pisan.
- **Rendimiento.** Todo lo estático va por `side`/`decorate` y se funde. Las piezas animadas por tramo son pocas (banderines: 1 malla por cuerda; ave: 1 malla, el aleteo es una escala en Y; hélices del dron: dos juegos que se alternan) y usan solo geometrías y materiales creados una vez al instalar: no hay nada que liberar por tramo salvo soltar la referencia en `segmentRemoved`. Solo se anima lo del tramo actual y sus salidas. Lluvia, mariposas y aves son 3 sistemas fijos que siguen al jugador. Cada fondo son 3–8 llamadas de dibujo (se funde con `bake` y se le cambia el material por uno sin niebla).
- **Truco de las piezas sueltas:** tipos auxiliares en `BUILD` (`ropa`, `pataBurro`, `pluma`, `rayoBajo`…) que se crean con `game.spawn` y se cuelgan del obstáculo; así la parte móvil sale fundida en una malla. Tienen `SPEC = {shadow: false}` y no están en ninguna fila.
- **Brillo sin luces nuevas:** un material básico con textura blanca y color por vértice (`glow`) sobrevive a `bake`, y sirve para faroles, neón, farolas de moto y láseres.
- **Esquinas del núcleo:** uso `heights: [0]` para saber su altura y les pongo tejado encima (pueblo, playa) o las envuelvo en una torre propia (neón).

## Pruebas (resultados reales)

Con `?solo=worlds`, por JavaScript:

- `setWorld + start + sim(3600)` con un bot que salta, se desliza, cambia de carril y gira en los cruces: los 3 mundos terminan en `play` (1346 / 1356 / 1340 m), 0 excepciones, 0 errores de consola. Aparecen todos mis tipos de obstáculo en `cur.obs`. 58 giros a calles laterales sin fallos.
- Sin tocar nada (carril central, hasta 2 min): se muere en los tres. Golpes por km sumando las tandas: pueblo ≈ 10, playa ≈ 12–15, neón ≈ 15–18 (el mundo base del núcleo daba 17,6 con daños menores que neón). La medida es ruidosa (4–6 partidas por tanda) y en una tanda la playa salió más fácil que el pueblo; en las demás el orden se mantuvo.
- Con el bot (reflejos perfectos) 2 partidas de 2 min por mundo: 0 muertes, 0,1–0,9 golpes/km. Eso confirma que todo se puede pasar, no que sea fácil para una persona.
- Memoria: `renderer.info.memory.geometries` tras 4 rondas de 1500 cuadros por mundo: pueblo 48→63, playa 71→84, neón 99→107; segunda vuelta por los tres mundos 101→101, 112→109, 115→108. Sube al conocer tipos nuevos (prototipos en caché) y se estabiliza. Texturas: 10 → 28–29 y ahí se quedan.
- `renderer.getContext().getError()` = 0 en 30 lecturas con `game.step`.
- Costo por cuadro (incluye pasada de sombras): 130–360 llamadas y 80–265 mil triángulos, igual o menos que el mundo base (205–322 llamadas, 156–250 mil). La primera versión de la playa llegaba a 364 mil; se bajó cambiando esferas por cajas y conos.
- Con todos los módulos cargados (sin `solo`): los 3 mundos corren 900 cuadros sin errores y el menú muestra los tres nombres.

**Sí pude ver capturas** (el navegador las entregó aunque la ventana estaba oculta): una imagen fija a nivel de calle de cada mundo y una vista aérea del pueblo y de la playa. Con eso corregí la ciudad (ventanas enormes y demasiado oscura).

**Lo que NO verifiqué:**
- Nada en movimiento: banderines, aleteo, olas, lluvia, hélices, hologramas y relámpagos solo están probados como "no lanzan errores". No sé si el ritmo se ve bien. El relámpago nunca lo vi.
- La lluvia casi no se nota en la captura (líneas de 1 px); puede hacer falta más grosor u opacidad.
- FPS en un celular real y la vista vertical.
- El sonido del trueno.
- El fondo de la ciudad desde arriba y cómo se ven los cruces de cada mundo.
- Si una persona encuentra justo el láser a máxima velocidad.

## Peticiones al núcleo

1. `block()` debería devolver la altura elegida (o aceptar una función `corner` del mundo): hoy fuerzo `heights: [0]` para poder techar o tapar las esquinas.
2. `worldMats()` no está en la API: tuve que crear mis propios materiales de fachada.
3. `bake` convierte todo material sin textura en Lambert; sería útil que respetara materiales marcados (emisivos o transparentes).
4. `VARIANTS` elige la variante al azar; poder pedir una variante concreta en `addObstacle` evitaría duplicar tipos (`balon`/`pelota`).
5. El fondo sigue al jugador pero la ruta gira 90°: no hay forma de tener "el mar a un lado". Un `seg.yaw` acumulado accesible al fondo o un fondo por tramo lo permitiría.
6. La separación entre filas (`cfg.rowGap`) es global; un `rowGap` por mundo daría otra palanca de dificultad.
7. La sombra vuelve a dibujar cada moneda y cada ratón: es la mayor parte de las llamadas de dibujo. Quitar `castShadow` a los recogibles ayudaría más que cualquier cosa de mi módulo.

## Si este juego nos fuera a hacer ganar mucha plata

En orden de prioridad, desde mundos:

1. **Mundos como temporadas.** Un mundo nuevo cada 4–6 semanas con su pase (Carnaval de Barranquilla, Feria de las Flores, Eje Cafetero en jeep, Amazonas en canoa, Bogotá con TransMilenio y ciclovía, Navidad con alumbrados). El formato de mundo ya es un objeto: se puede producir en serie.
2. **Cada mundo con una mecánica única, no solo decorado.** Marea que sube y tapa un carril en la costa; apagón en neón donde solo se ve lo que alumbran las motos; procesión en el pueblo que obliga a ir por la calle lateral. Es lo que hace que la gente cuente el juego.
3. **Momento de foto por mundo.** Un tramo "postal" (mirador, playa abierta, avenida de neón) con cámara lenta y botón de compartir: publicidad gratis.
4. **Hora y clima reales.** El mismo mundo de día, al atardecer, de noche o con aguacero según la hora del jugador: triplica la variedad con poco arte nuevo.
5. **Marcas dentro del mundo.** Los rótulos de neón, las vallas y la chiva son espacios publicitarios naturales (panadería del barrio, gaseosa, equipo de fútbol) sin interrumpir la partida.
6. **Ciudades reales con licencia.** Cartagena, Medellín, Ciudad de México, Río: turismo y alcaldías pagan por aparecer, y el jugador local lo comparte.
7. **Jefe de mundo** al final de cada uno (el camión de la basura, el cangrejo gigante, el dron de seguridad) como meta clara de progreso.
8. **Mundos hechos por la comunidad** con un editor de filas y paletas, votados cada semana.
9. **Banda sonora por mundo** (carranga, champeta, synthwave) con obstáculos al ritmo de la música.
10. **Calidad por dispositivo:** versión liviana automática (sin sombras, menos tramo visible) para gama baja, que es donde está el volumen en Latinoamérica.
