# Tinto — por dónde seguir

Notas para retomar el trabajo en una sesión nueva. El historial completo del proceso está en `EQUIPO.md`; el contrato técnico, en `AGENTES.md`.

## Estado

- Juego publicado: https://manuelleal.github.io/Cat-Run/ (repositorio `manuelleal/Cat-Run`; `main` es el código y `gh-pages` es lo que se sirve: se suben juntas con `git push origin main main:gh-pages`).
- Servidor local: `python servidor.py 5173` (no guarda caché). Banco de bots: `pruebas/bots.js`, se carga desde la consola con `await import('/pruebas/bots.js')`.
- Blender 4.5.9 portátil está fuera del repositorio, en `../_herramientas/`. Guías: `modelos/LEEME.md` y `modelos/render/LEEME.md`.
- Al probar en el navegador integrado, cerrar la pestaña de pruebas al terminar: el dueño suele tener el juego abierto ahí mismo. `game.sim` ya no hace sonar nada.
- El navegador integrado no dibuja con la ventana oculta: se prueba con `game.sim(n)` y capturas sueltas. Cada sesión debe usar su propia pestaña.

## Hecho en la sesión del 8 de octubre (segunda)

- **Hidrante:** se para en el borde del andén y echa el chorro de lado sobre un solo carril de afuera (`outer` en `SPEC`); ciclo en `rules.js` (`hydrantOn/Off/Warn`). Donde hay balcón sale una pila de cajas.
- **Tope de objetos** en `rules.js`: `rowMaxObs` 3, `streetMaxRows` 6, `streetMaxObs` 14, `streetMaxPickups` 55 (las monedas de balcón no cuentan). Medido: máximo 12–14 obstáculos por calle (antes 16–17).
- **Variedad de muros:** el generador solo dejaba entrar un tipo de muro por partida (por eso unas partidas salían llenas de hidrantes y otras sin ninguno). Corregido en `placeRow`.
- **Caneca:** usa `modelos/props/caneca.glb` volcada, 1,7 veces más grande, con la tapa como visera, flecha verde encima y marcas en el piso. Ya no se puede saltar: solo agachado.
- **Marcador en un renglón:** pausa, barra de Bocado, caneca (solo con carga), metros y monedas. El renglón de próxima meta solo sale cuando hay récord o caneca cerca.
- **Costa suavizada** y **balcones en los tres mundos.** En Ciudad Neón un farol sigue a Tinto (antes no se veía contra el asfalto).
- Bot humano, 30 semillas (mediana): Pueblo 59 s, Costa 48 s (antes 37 s), Neón 37 s (la meta era 40–100: queda un poco dura).

- Después: calles laterales con premio anunciadas en la flecha, racha visible desde x1, ladrido y susto con Panela cerca, gestos de Tinto, cámara más cerca y flechas de GIRAR más chicas. Además acelera más al avanzar (`accel` .13, tope 34) y anuncia cada escalón con "¡MÁS RÁPIDO!". Publicado a pedido del dueño.

- Tipos de calle (`kindFor`, `alleySide`, `plazaSide`, `marketSide` en `js/core.js`): callejón, mercado, plaza y tejados; la flecha de GIRAR los anuncia. Retos por partida en `js/levels.js`. El callejón ya es de dos carriles (`seg.closed`, `gen.closed`). Las probabilidades de cada tipo están en `KIND_ODDS` (`game.KIND_ODDS` para experimentar). "Por un pelo" ya sale unas 4 veces por minuto.

## Pendiente, en orden

1. Modelar en Blender los obstáculos que siguen hechos por código (contenedor, poste, zanja, tubo, hidrante, andamio, pila de cajas).
2. Lo que quedó fuera de los diseños: objetos temporales, misiones encadenadas, álbum, sonido, cámara lenta, precios de los gatos (se ganan ~190 monedas por minuto).
3. (Hecho) La entrada de cada partida: Tinto tumba una matera y Panela sale detrás (`intro` en `js/fx.js`).
4. Del plan de ideas del dueño queda: disfraces y álbum. Los retos por partida ya están (`RETOS` en `js/levels.js`).

## Decisiones del dueño que siguen vigentes

- El protagonista es Tinto (gato negro, pañuelo rojo, oreja mordida) y la perra es Panela, que no es mala: quiere ser su amiga.
- Le parece que el juego está "muy colombianizado"; nada nuevo debe ser específicamente colombiano. Lo que ya existe se deja como está por ahora.
- El modo infinito es el centro; los niveles son camino de aprendizaje.
- Caneca: pasar agachado la activa; salir de ella al perder cuesta una sardina, una vez por partida.
- Público con posibles menores: nada de apuestas ni mecánicas de presión.
- Va a conseguir personas que lo prueben; las estadísticas salen en `?stats=1` con botón de copiar.

## Preguntas que quedaron abiertas

- Hasta dónde bajar lo colombiano (nombres, chiva, arquitectura del primer mundo).
- Si se cambian los personajes (ver la respuesta en la conversación: otro animal de cuatro patas es fácil; uno de dos patas exige rehacer animaciones).
