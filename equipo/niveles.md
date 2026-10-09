# Bitácora — agente Niveles y Economía

## Rol
Flujo de pantallas, 15 niveles con objetivos y estrellas, desbloqueos, billetera, tienda de gatos, misiones diarias y el indicador de objetivo en partida. Todo en `js/levels.js` (un solo archivo, CSS y DOM propios). No toqué `core.js` ni `index.html`. Leo mundos de `game.worlds` (por índice 0–2) y gatos de `game.cats`; no defino ninguno.

## Los 15 niveles
Mundo = índice en `game.worlds`. `cfg` = velocidad base / aceleración / velocidad máxima / `rowGap`. Por defecto el núcleo trae 16 / .22 / 38 / [19,26].

| Nivel | Objetivo | Estrella 2 | Estrella 3 | cfg |
|---|---|---|---|---|
| 1-1 | Llega a 300 m | máx. 2 choques | 0 choques | 13 / .08 / 20 / [30,38] |
| 1-2 | Atrapa 12 ratones | en 45 s | en 30 s | 14 / .10 / 22 / [28,36] |
| 1-3 | Junta 40 monedas | vida ≥ 60% | vida ≥ 90% | 15 / .10 / 22 / [27,34] |
| 1-4 | Entra a 2 calles laterales | 8 ratones | 16 ratones | 15 / .12 / 24 / [26,33] |
| 1-5 | Llega a 600 m con máx. 3 choques | máx. 1 choque | 0 choques | 16 / .15 / 26 / [24,32] |
| 2-1 | Llega a 700 m | 40 monedas | 80 monedas | 17 / .18 / 28 / [22,29] |
| 2-2 | Atrapa 25 ratones en 45 s | vida ≥ 50% | vida ≥ 85% | 18 / .18 / 28 / [22,29] |
| 2-3 | Junta 90 monedas | máx. 3 choques | máx. 1 choque | 18 / .20 / 30 / [21,28] |
| 2-4 | Entra a 4 calles laterales | 30 monedas | 60 monedas | 19 / .20 / 30 / [20,27] |
| 2-5 | Llega a 1000 m con máx. 2 choques | máx. 1 choque | 0 choques | 19 / .22 / 32 / [20,27] |
| 3-1 | Llega a 1200 m | máx. 3 choques | máx. 1 choque | 20 / .25 / 34 / [18,25] |
| 3-2 | Atrapa 40 ratones | en 60 s | en 45 s | 21 / .25 / 34 / [18,24] |
| 3-3 | Junta 120 monedas en 90 s | vida ≥ 50% | vida ≥ 80% | 21 / .28 / 36 / [17,23] |
| 3-4 | Entra a 6 calles con máx. 3 choques | 15 ratones | 30 ratones | 22 / .28 / 36 / [17,23] |
| 3-5 | Llega a 1500 m con máx. 1 choque | 50 monedas | 0 choques | 22 / .30 / 34 / [17,23] |

- Estrellas = 1 por cumplir + 1 por cada reto extra cumplido (son independientes).
- Se pierde si el perro te atrapa, si pasas los choques permitidos o si se acaba el tiempo.
- Desbloqueo: un nivel se abre al pasar el anterior. Mundo 2 con **8 ⭐** totales, mundo 3 con **20 ⭐** (pasar el mundo 1 con 1 ⭐ por nivel da 5: obliga a repetir para mejorar).
- Al entrar a un nivel guardo los valores de `cfg` que toco y los devuelvo al terminar, salir o reintentar.

## Economía
- **Entradas:** monedas recogidas en la partida (1 a 1, también si pierdes o sales); primera vez que pasas un nivel: 20 + 5 por posición (20 … 90, total 825); cada estrella nueva: 10 (total 450); 3 misiones diarias de 30–60 (elegidas por fecha entre 8); regalo diario 20 / 30 / 40 / 50 / 60 según racha de días.
- **Salidas:** solo gatos. Precios los pone el agente Gatos; hoy `cats.js` trae 0 / 150 / 400 / 750 / 1200 / 1800 / 2500 (6800 en total). El primero de la lista siempre es gratis; sin `price` = gratis; sin `ability` = no se muestra habilidad.
- **Cuánto se tarda (estimado, no medido con personas):** un bot que ve los obstáculos pasó los 15 niveles seguidos y terminó con 2457 monedas (recoge ~13 monedas cada 100 m). Supongo que una persona recoge la mitad y juega ~15 min al día (~450 monedas de partidas + ~170 de misiones y regalo). Con eso: Mango (150) en la primera sesión, tras 2–3 niveles; Pluma (400) al terminar el mundo 1; Bola (750) el día 2; Chispa (1200) día 3–4; Sombra (1800) día 6–7; Nube (2500) día 10–11.

## Flujo de pantallas
Inicio → (primera vez: Cómo se juega) → Mapa (pestañas de mundo, 5 nodos, modo infinito) → ficha del nivel → partida (objetivo arriba al centro; pausa con Seguir / Reintentar / Mapa) → Resultado (estrellas, retos, monedas, Siguiente / Reintentar / Mapa) → Mapa. Desde Inicio y Mapa: Gatos (tienda) y Misiones. Modo infinito termina en el `#over` original (tabla de puntajes y compartir intactos) con "Otra vez" y "Mapa" añadidos.
Teclado: Enter/Espacio = botón principal, Escape = volver, flechas en el mapa (←→ mundo, ↑↓ nivel). En tienda y misiones se llega a los botones con Tab.

## Decisiones
- `flags.customMenu = true`; `#menu` queda oculto por CSS y sus textos de ayuda pasaron a "Cómo se juega".
- Victoria y derrota por objetivo se revisan en el evento `update` y llaman `game.end()`; así el núcleo no termina dos veces.
- Salir o reintentar desde la pausa pasa por `game.end({won:false})` para que los otros módulos reciban `over`.
- **Tabla de puntajes solo del modo infinito:** el núcleo anota cada `end()` en `catRunTop`. Envolví `game.store.set` para esa clave y llevo la tabla yo (misma clave y formato), y repinto `#rank` y `#best` al terminar el modo infinito.
- Si alguien llama `game.start()` directo, lo trato como modo infinito y la pantalla final trae salida.
- Tocar una pestaña de mundo abierto cambia el mundo de fondo como vista previa.
- Comprar pide confirmación de segundo toque. Guardado en una sola clave `catRunSave`.
- Expongo `game.levels` (`save`, `wallet`, `owns(id)`, `play`, `last`, `run`…) para pruebas y otros módulos.
- Solo uso los 3 primeros mundos del registro; si hay más, quedan fuera del mapa.

## Qué probé (navegador integrado, por código, 1024×768 y 360×640)
- Flujo completo con clics y teclas: inicio → ayuda → mapa → ficha → partida → resultado → siguiente … hasta el 3-5, con un bot que juega de verdad (`game.sim` + `game.input`): 15 de 15 superados, estrellas guardadas `[[3,3,2,1,2],[3,3,1,3,3],[3,3,3,3,3]]`, billetera 2457.
- Nivel 1-1: 37 recogidas + 20 primera vez + 30 por 3 estrellas = 87, igual en memoria y en `localStorage`; se abrió 1-2 y 1-3 siguió cerrado.
- Repetir un nivel ya con 3 ⭐: 0 de bono. Derrota por perro: 0 estrellas, conserva las anteriores, botón principal "Reintentar". Derrota por choques (1-5, cuarto choque) y por tiempo (2-2, a los 45,02 s): títulos correctos.
- Puertas: con 5 y 7 ⭐ el mundo 2 sigue cerrado (ni nivel ni infinito arrancan); con 8 se abre, sale el aviso y el confeti.
- `cfg` idéntico al original (comparado como JSON) tras ganar, perder, fallar, salir desde pausa y durante el modo infinito.
- Pausa: tecla P y botón; Seguir, Reintentar (banca monedas y reinicia) y Mapa.
- Modo infinito: 629 puntos entraron a la tabla, el nombre se edita, +33 monedas; las partidas de nivel no cambiaron `catRunTop`.
- Tienda (precios de prueba y luego los reales de `cats.js`): comprar 100 descuenta 100 y equipa; comprar 400 descuenta 400; sin saldo no compra ("Te faltan N") ni por la API; comprar dos veces no cobra dos veces.
- Misiones: 3 cobradas = +130; regalo +20 y al día siguiente (reloj simulado) +30 con racha 2; no se cobra dos veces.
- Persistencia: tras recargar, billetera 2643, estrellas, gatos comprados y racha intactos.
- 360×640: ninguna pantalla con desborde horizontal; mapa, inicio, ficha, resultado y final caben sin scroll vertical; tienda y misiones hacen scroll vertical. Objetivo centrado bajo la barra, también cuando la barra se parte en dos renglones. Esquina inferior derecha libre (con todos los módulos ahí cae el botón `catAb` del agente Gatos).
- Con todos los módulos (`/?v=4`, sin `worlds.js` todavía): carga, tienda con 7 gatos, nivel jugado y ganado. Sin errores de consola míos; `getError()` de WebGL = 0.
- Borré `catRunSave` y `catRunName` al terminar y dejé `catRunCat` en "gris".

## Qué NO pude verificar
- **No vi nada con mis ojos.** La ventana está oculta: las animaciones CSS no avanzan (medí el indicador congelado en su primer cuadro) y no hay capturas. Transiciones, rebote de estrellas, latido de nodos, confeti y contador están escritos pero no los vi correr. El contador tiene un respaldo por temporizador y sí llegó al valor final.
- Dificultad real para una persona: los números salen de cuentas y de un bot que ve el futuro. Los tiempos de 1-2 y 3-2 y el 3-5 son los más dudosos.
- Toque real en celular, audio, y el botón de compartir.
- Mundos del agente Mundos: `worlds.js` no existía cuando probé; usé los tres por defecto.
- Foco con Tab tras repintar una lista (se pierde el foco y hay que volver a tabular).
- Ensucié sin querer la tabla compartida: mi prueba guardó el nombre "Prueba" y otras pestañas lo usaron en sus puntajes; le quité el nombre a esa entrada, los puntajes de las otras pestañas quedaron.

## Peticiones al núcleo
1. `end({won, record: false})` para que una partida de nivel no entre al top (hoy lo resuelvo envolviendo `store.set`).
2. Un evento o gancho para Enter/Espacio fuera de partida (hoy pongo mi propio `keydown`).
3. `game.quit()` que emita `over` con un motivo, para distinguir salida de derrota.
4. Que `#menu` y `.go` de `#over` no existan con `customMenu` (hoy los oculto por CSS).

## Si este juego nos fuera a hacer ganar mucha plata
Desde progresión y economía, en orden de prioridad:

1. **Modelo: gratis con anuncios premiados + compras pequeñas, nunca pagar por ganar.** El anuncio premiado encaja en tres puntos que ya existen: duplicar las monedas del resultado, revivir una vez por partida y abrir un segundo regalo diario. Nada de anuncios forzados entre niveles las primeras sesiones.
2. **Qué se vendería:** gatos de aspecto y trajes (cosmético), pase de temporada de 30 días con misiones y un gato exclusivo, "quitar anuncios" de pago único, paquete de inicio barato el día 2. **Qué no:** estrellas, saltarse niveles, ventajas en la tabla, ni cajas al azar con dinero real (riesgo legal y de reputación, y el público incluye niños).
3. **Retención:** la racha diaria y las misiones ya están; faltan evento de fin de semana (mundo o reto temporal), tabla semanal entre amigos (hoy es local) y un reto diario igual para todos, que se comparte como resultado.
4. **Contenido:** 15 niveles se acaban en una tarde. Hace falta un mundo nuevo cada 3–4 semanas y un generador de niveles por plantilla (los objetivos ya son datos: añadir uno es una línea).
5. **Segunda moneda solo si hay pase o tienda rotativa;** antes de eso complica sin dar nada.
6. **Primeros 90 días:** días 1–30, medir (embudo por nivel, dónde abandonan, monedas por minuto) y ajustar dificultad con datos, guardado en la nube; días 31–60, anuncios premiados, tabla en línea, 2 mundos más; días 61–90, pase de temporada y primer evento.
7. **Riesgos:** sin medición todo lo anterior es a ciegas; la economía actual se puede inflar repitiendo niveles fáciles (habría que bajar monedas en niveles ya con 3 ⭐); el guardado es `localStorage`, se pierde al borrar datos y se edita a mano, así que nada de valor real puede vivir ahí; anuncios y compras con menores exigen cumplir normas de tiendas y de privacidad infantil; el nombre y el estilo recuerdan a juegos conocidos del género y conviene diferenciarse antes de invertir en marca.
