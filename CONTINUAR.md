# Tinto — por dónde seguir

Notas para retomar el trabajo en una sesión nueva. El historial completo del proceso está en `EQUIPO.md`; el contrato técnico, en `AGENTES.md`.

## Estado

- Juego publicado: https://manuelleal.github.io/Cat-Run/ (repositorio `manuelleal/Cat-Run`; `main` es el código y `gh-pages` es lo que se sirve: se suben juntas con `git push origin main main:gh-pages`).
- Servidor local: `python servidor.py 5173` (no guarda caché). Banco de bots: `pruebas/bots.js`, se carga desde la consola con `await import('/pruebas/bots.js')`.
- Blender 4.5.9 portátil está fuera del repositorio, en `../_herramientas/`. Guías: `modelos/LEEME.md` y `modelos/render/LEEME.md`.
- El navegador integrado no dibuja con la ventana oculta: se prueba con `game.sim(n)` y capturas sueltas. Cada sesión debe usar su propia pestaña.

## Pendiente, en orden

1. **Hidrantes y cantidad de objetos por calle** (pedido del dueño, sin empezar): revisar la lógica del hidrante (`piece('hidrante')` y `SPEC.hidrante/chorro` en `js/core.js`): dónde se para, hacia dónde sale el chorro y cada cuánto; y poner un tope claro de cuántos objetos puede haber en una calle y por fila. Hoy no hay tope explícito.
2. **Que la caneca de basura destaque:** se ve pequeña y se confunde con un obstáculo. Usar `modelos/props/caneca.glb` (tapa `lid`, abre con `rotation.x` negativo), más grande y con una señal de que hay que agacharse.
3. **Simplificar el marcador:** en pantallas angostas ocupa casi media pantalla (pausa, Bocado, caneca, distancia, ratones, monedas, sardinas, barra, próxima meta).
4. **Revisar la Costa y la Ciudad Neón en capturas** con las reglas nuevas; solo se ha mirado el Pueblo.
5. **Suavizar la Costa:** un jugador medio dura 37 s (62 s en el Pueblo).
6. Balcones en la Costa y la Ciudad (hoy solo en el Pueblo).
7. Modelar en Blender los obstáculos nuevos que siguen hechos por código (contenedor, poste, zanja, tubo, hidrante, andamio, pila de cajas).
8. Lo que quedó fuera de los diseños: objetos temporales, misiones encadenadas, álbum, sonido, cámara lenta, "por un pelo" más frecuente, precios de los gatos (se ganan ~190 monedas por minuto).
9. La entrada de cada partida: Tinto tumbando algo y Panela saliendo detrás.

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
