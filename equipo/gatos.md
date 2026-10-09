# Bitácora — agente Gatos

## Rol
Elenco de gatos jugables, sus modelos, sus habilidades, los efectos visuales de esas habilidades y el botón de habilidad. Entrega: `js/cats.js` (único archivo tocado, más esta bitácora).

## Elenco

| Gato | Precio | Habilidad | Tipo | Qué hace | Recarga |
|---|---|---|---|---|---|
| 🐱 Michi (`gris`) | 0 | 🐾 Zarpazo | activa | Manda a volar el obstáculo más cercano de su carril (alcance 8 m + 0,25 × velocidad, o sea 12–17 m) | 6 s (1,5 s si pega al aire) |
| 🐈 Mango (`naranja`) | 150 | 🤸 Doble salto | pasiva (`cfg.airJumps +1`) | Segundo salto en el aire con voltereta. El botón también salta | — |
| 😺 Pluma (`pluma`) | 400 | 🪂 Planeo | activa | Salta (si está en el piso) y cae a 1,2 m/s durante 1,6 s. Se corta al aterrizar o al agacharse | 5 s |
| 😼 Bola (`bola`) | 750 | 💥 Embestida | activa | 2,2 s a +7 m/s rompiendo todo lo que toque; +2 monedas por obstáculo roto | 14 s |
| ⚡ Chispa (`chispa`) | 1200 | 🧲 Imán | activa | 6 s atrayendo monedas y ratones de los tres carriles (16 m adelante) | 16 s |
| 🐈‍⬛ Sombra (`negro`) | 1800 | 🥷 Sigilo | activa | 3,5 s atravesando obstáculos, +10 de vida y el perro 3 m más lejos mientras dura | 16 s |
| 😇 Nube (`nube`) | 2500 | 💖 Siete vidas | pasiva (`hooks.damage`) | Una vez por partida, el golpe que la mataría se cancela: queda con 50 de vida y 3 s invulnerable | — |

La recarga empieza a contar cuando termina el efecto. Se conservaron los ids `gris`, `naranja`, `negro` del núcleo para no romper el gato guardado.

**Modelos.** Un constructor paramétrico (`buildCat`) con las proporciones del gato del núcleo por defecto; cada gato cambia silueta y lleva accesorio: Michi collar y cascabel; Mango patas largas, pañoleta roja y copete; Pluma orejas grandes, gafas de aviadora y capa-alas; Bola gordo, patas cortas, mancha negra y casco azul; Chispa cola de rayo e imán de herradura en el lomo; Sombra largo y flaco, orejas altas, antifaz morado con cintas; Nube esponjosa, colaza y aureola. Cada pieza rígida se funde con `game.bake`: 10–12 mallas por gato (el del núcleo tiene 29) y un material propio por gato.

**Gestos al correr** (evento `frame`, solo partes internas): cabeceo y orejas en todos; cascabel y oreja que se sacude (Michi), pañoleta al viento (Mango), capa que aletea y se abre al saltar/planear (Pluma), panza que rebota y casco agachado al embestir (Bola), imán que vibra y cola nerviosa (Chispa), cola baja sinuosa y cintas (Sombra), aureola flotante y colaza (Nube).

**Efectos de habilidad:** tres zarpazos luminosos y pata que barre; voltereta completa sobre el centro del cuerpo más anillo; anillo y capa abierta; escudo naranja con estelas y obstáculos volando; anillos azules que se cierran sobre la gata y monedas que se desvían hacia ella; gato translúcido más señuelo morado que queda atrás; fantasma blanco que sube sobre la gata, dos anillos y aureola apagada. Todo es un fondo fijo de mallas ocultas (6 anillos, 3 zarpazos, 5 de embestida); nada se crea por cuadro salvo la copia fantasma (comparte geometrías, dura ~1 s).

**Botón** `#catAb`: abajo a la derecha, 86–110 px, `<button>` con `pointer-events: auto` y `data-ui`; emoji + nombre, barrido cónico de recarga con segundos, brillo verde mientras dura el efecto, pulso cuando está listo, gris cuando la pasiva está gastada. Solo visible con `S.state === 'play'`. Dispara `game.emit('ability')` (mismo camino que E/Shift).

## Decisiones
- Los cambios a `cfg` son deltas anotados (`bump`) que se deshacen al terminar el efecto, al cambiar de gato, en `start`, y si la partida deja de estar en `play` con el efecto puesto. No toco `S.speedMul` porque `reset()` lo pisa.
- La embestida y el zarpazo animan ellos mismos el obstáculo que sale volando (la lista `flying` del núcleo no está expuesta). Los huecos (alcantarillas) se cierran en vez de volar.
- El bono de la embestida suma directo a `S.coins` (no emite `collect`). Si Niveles cuenta monedas por evento y no por `S.coins`, ese bono no le llega.
- Precios puestos a ojo: jugando al azar salen 30–80 monedas por cada 45 s. Niveles puede reescalarlos.

## Pruebas (`?solo=cats`, con `game.sim` y `game.step`)
- Doble salto: altura máxima 1,85 (Michi) contra 3,66 (Mango) con las mismas dos pulsaciones. Giro del cuerpo −6,28 rad y vuelve a posición 0.
- Planeo: 40 cuadros en el aire con salto normal contra 97 con planeo. Pulsar durante la recarga: 0 cuadros; tras la recarga: 97 otra vez.
- Zarpazo: caja en el carril, vida 100 con zarpazo contra 85 sin él. Segunda pulsación en recarga no rompe nada; a los 9 s vuelve a romper. Al aire: recarga corta.
- Embestida: caja + carro + alcantarilla, vida 100 y 6 monedas contra vida 55 y 0 monedas. `cfg.baseSpeed/maxSpeed` 23/45 durante, 16/38 después; velocidad 16,2 → 23,7.
- Imán: 40 monedas y 40 ratones en los carriles laterales, gato en el centro: 30 y 30 recogidos en la ventana de 6 s contra 0 y 0.
- Sigilo: tres obstáculos seguidos con vida 60: termina en 70 contra 0 sin habilidad. `gapMin/gapMax` 5,4/9,7 durante, 2,4/6,7 después; opacidad 0,31 durante, 1 después. Un obstáculo posterior al efecto sí golpea.
- Siete vidas: vida 10 contra un carro: sigue en `play` con 50 (Michi: `dying`). Segundo golpe mortal: `over`. Al reiniciar vuelve a ×1.
- `cfg` idéntico al de fábrica después de cada gato, al cambiar de gato en mitad de un efecto, al terminar la partida en mitad de un efecto y al volver al menú.
- 45 s de entradas al azar por gato con la habilidad a discreción (incluye cruces y muertes): sin excepciones. `getError()` de WebGL = 0 con cada efecto en pantalla. Consola sin errores. Con todos los módulos cargados (solo existía `levels.js`): sin errores, botón en (900, 636) de 1024×768.
- En mi pestaña las capturas sí funcionaron: vi cuadros congelados de los siete modelos y de cada efecto.

## Lo que NO verifiqué
- Nada en movimiento: solo cuadros sueltos. El ritmo de las animaciones (voltereta, aleteo, vibraciones) está sin ver.
- Toque real en un celular, tamaño del botón en pantalla pequeña vertical, sonido y rendimiento en un teléfono.
- Convivencia con `fx.js` y `worlds.js` (no existían cuando probé) y con la tienda de Niveles.
- Los emojis 🥷, 🪂 y 🧲 pueden no existir en Android viejos.
- Con la cámara del núcleo en horizontal el perro tapa casi todo el gato; los accesorios se ven poco. No es mío, pero afecta lo que hice.

## Peticiones al núcleo
1. Exponer `flying` o un `game.knock(o)` para que los módulos saquen obstáculos con la misma animación.
2. Un evento al hacer `reset()`/`showMenu()`; hoy detecto el fin de partida mirando `S.state` en `frame`.
3. `collect` para recompensas que no son un objeto (bonos), o un `game.addCoins(n)`.
4. `catRunCat` en `localStorage` se comparte entre pestañas: en pruebas paralelas el gato inicial cambia solo.
5. Convención para vitrinas: quien llame `catDef.build(game)` debe liberar `userData.own` (geometrías) y `userData.mat`.

## Si este juego nos fuera a hacer ganar mucha plata
1. **Los gatos son el producto.** Colección con rarezas, uno nuevo cada dos semanas, cada uno con habilidad y gesto propios. El constructor paramétrico ya permite sacar un gato en unas 15 líneas; lo siguiente es separar *pelaje* (cosmético puro, barato de producir, se vende) de *gato* (habilidad, se gana jugando) para no vender ventaja.
2. **Subir de nivel cada gato** con monedas: menos recarga, más duración, una segunda carga. Da uso largo a las monedas y motivo para repetir con el mismo gato.
3. **Probar antes de comprar:** una partida gratis con cualquier gato bloqueado. La habilidad se vende sola al usarla.
4. **Accesorios intercambiables** (sombreros, capas, collares) sobre los pivotes que ya existen en el modelo; de temporada y por eventos.
5. **Habilidades que se combinan con el mundo:** obstáculos que solo un tipo de gato aprovecha (cornisas para el planeo, muros rompibles con atajo para la embestida), para que elegir gato sea una decisión por nivel.
6. **Segundo gato de relevo** en la partida (cambiar una vez por carrera): duplica el valor de tener varios.
7. **Momentos compartibles:** repetición en cámara lenta de la voltereta o del revivir al final de la partida, lista para enviar.
8. Antes de todo eso: un modo foto o una cámara que muestre al gato, porque hoy el perro lo tapa y lo que se vende no se ve.
