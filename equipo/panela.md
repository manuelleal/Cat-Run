# Bitácora — agente Panela

## Rol
Modelar por guion a Panela, la perra que persigue a Tinto, con Blender 4.5.9 sin ventana, siguiendo la guía del agente Blender (`modelos/LEEME.md`). Segundo objetivo: comprobar si esa guía basta para hacer un personaje nuevo sin redescubrir nada. No toqué `js/`, `index.html` ni ningún archivo de Tinto. No integré nada.

## Qué entregué

| Archivo | Qué es |
|---|---|
| `modelos/panela.py` | Guion completo. `-- rapido` salta las vistas (8 s); completo tarda 24–28 s. |
| `modelos/panela.glb` | 726 372 bytes (0,73 MB; límite 1,2). 13 504 triángulos, 16 mallas, 2 materiales, 3 texturas dentro (color 1024, normal 512, rugosidad 512, JPEG). Sin extensiones. |
| `modelos/panela_frente.png`, `_atras`, `_lado` | Vistas de control de Blender del `.glb` tal cual (pose de reposo). |
| `modelos/panela_cara.png`, `_juego` | Extra: con la pose que le pone `fx.js` (cola a 0,9 rad, mandíbula entreabierta). |
| `modelos/texturas/panela_*.png` | Las tres imágenes horneadas, para mirarlas. |
| `modelos/visor_panela.html` | Copia adaptada del visor: escala 1,2, perro actual al lado (copia de `makeDog()` + aparejo de `fx.js`), pose de carrera y topes de `fx.js`. |
| `modelos/intentos/panela_v1…v4*`, `three_panela_*`, `juego_panela_*` | Intentos, capturas de Three.js y del juego real. |

## ¿Bastó la guía?

**Casi. El flujo de Blender sí: el guion corrió sin un solo error de API a la primera.** Lo que no cubre es todo lo que cambia cuando el personaje no es el gato.

**Lo que sirvió (y me ahorró redescubrir):**
- Las recetas `add`, `blob`, `sheet`, `join`, UV de varios objetos, horneado al nodo activo, material final y exportación: copiadas tal cual, funcionaron sin cambios.
- La tabla de ejes y la regla "malla corrida por `-pivote`".
- Las trampas 3, 4, 6, 8 y 9 (vértices que devuelve el operador, `materials.clear()`, normales en mallas abiertas, pupila como parche, JPEG): las evité de entrada porque estaban escritas. Ninguna me pasó.
- "El render de Blender no es el juego": monté el visor de Three.js en la tercera iteración y ahí calibré color y párpados.
- La costumbre de imprimir la caja de cada objeto: fue lo que delató mi error más grande (ver v1).
- Los tiempos y pesos que promete (30 s, JPEG ≈ 0,2 MB por textura de 1024) se cumplieron.

**Lo que faltaba:**
1. **Las metabolas salen más grandes que los radios que uno escribe.** Con `radius = 2r` y umbral 0,6 la superficie queda a ~1,15 r en una bola suelta y hasta ~1,3 r donde se funden varias. La guía no lo dice. Me costó el intento v1. Lo dejé como constante `K_BOLA = .80` en `blob()`.
2. **Cómo se anima el perro.** El contrato de la guía es el del gato. El del perro está en `js/fx.js` y es distinto: rotaciones **absolutas** (`tail.rotation.x = 0.9` siempre, `tongue.rotation.z = -0.3`), la lengua cuelga hacia +X, las orejas giran en Z desde un pivote **arriba** y necesitan `userData.side`. Tuve que leer `fx.js` para decidir la pose de reposo.
3. **Las herramientas solo conocen al gato.** `verificar_glb.py` exige `panuelo` y `knot` y no acepta otro contrato; `visor.html` tiene la escala 1,25, la lista de nodos y las cámaras del gato. Escribí el chequeo dentro de `panela.py` y una copia del visor.
4. **Nada sobre escalar parámetros con el tamaño.** La perra mide 3 unidades y el gato 2: hubo que subir vóxel y resolución y bajar a la mitad la escala del ruido del pelo (con los valores del gato el grano queda por debajo del texel, trampa 7).
5. **Que el juego expone `window.game`** y que así se puede probar un modelo dentro del juego real sin editar archivos. La bitácora anterior dice que lo hizo, no cómo.
6. **"Abre las texturas horneadas"** no está en la lista de verificación. Repetí el error del mapa de normales casi liso que el agente anterior ya había contado en su bitácora (pero no en la guía).

**Lo que estaba equivocado o confunde:**
- "El juego aplica escala 1,25 a la raíz": solo al gato. El perro usa 1,2.
- "Para un personaje nuevo hay que añadir su archivo en el mapa `MODELS` de `js/models.js`": no sirve para el perro. `MODELS` va de *id de gato* a archivo y `wrap()` arma el `userData` del gato. El perro necesita código nuevo (ver "Integración").
- La lista final pide que `verificar_glb.py` termine en "TODO BIEN": imposible para algo que no sea el gato. Sobre `panela.glb` da exactamente dos fallas, `panuelo` y `knot`, y lo demás bien.
- `tinto_v4.py` contradice la trampa 5 de su propia guía: su `skin()` lanza los rayos **desde adentro** (para nariz, ojos y orejas). Al gato no le pasó nada porque ahí la cabeza es una sola malla. En `panela.py` la cambié a "desde afuera hacia el centro".
- La bitácora anterior dice "copiar `tinto_v4.py`, cambiar elipsoides y colores". Se queda corto: los ayudantes se reutilizan enteros, pero orejas caídas, mandíbula, lengua, collar, placa y cola son código nuevo.

## Decisiones de diseño

- **Unidades:** las locales de `makeDog()` antes de su escala. **La escala ×1,2 NO va horneada**: `fx.js` lee `dog.scale.x` como base y sus pivotes están en esas unidades. La pone el integrador (o se queda la que ya tiene `dog`).
- **Pivotes iguales a los de hoy**: cabeza, mandíbula, lengua, cola, punta y caderas coinciden con los de `makeDog()` + `fx.js` al milímetro. Solo cambian los de las orejas.
- **Cola vertical en reposo**, enroscada hacia adelante: como `fx.js` le pone siempre 0,9 rad en X, en el juego queda levantada hacia atrás con la punta arriba. Así `fx.js` no cambia. Consecuencia: quien abra el `.glb` fuera del juego ve la cola parada.
- **Lengua hacia +X** (derecha de la perra), plana, para que las fórmulas de `fx.js` la dejen colgando y al viento.
- **Orejas giradas ~50°** respecto a como cuelga una oreja real, para que se vean desde la cámara de la carrera.
- **Hebilla dorada en la nuca** (no estaba en la identidad): la placa cuelga al frente y desde atrás no se ve; la hebilla lleva el dorado a la vista de juego. Si no gusta, es una línea (`buckle`).
- **Sin metal**: el dorado es amarillo no metálico, porque el juego no tiene mapa de entorno. No probé cómo se vería con metal; lo evité.
- **Carácter:** sin cejas ni dientes. Ojos grandes café miel con dos brillos, párpado apenas visible, lengua afuera.

## Iteraciones

**v1 — corrió a la primera, y estaba 30 % gorda.** Sin errores, "TODO BIEN" en el chequeo. La imagen mostraba un hámster: cabeza-bola sin hocico, orejas invisibles, lengua saliendo del cuello.
- *Cómo lo noté:* la caja impresa del torso decía ±0,77 de ancho y 2,03 de alto cuando yo había escrito 0,60 y ~1,6. Las metabolas inflan. Todo lo que había colocado "a ojo" con números (mancha del lomo, mandíbula, lengua) quedó enterrado o fuera de sitio por eso mismo.
- Las orejas colgaban de canto, como las de verdad: desde atrás, que es de donde mira la cámara, medían 8 cm. La guía lo advertía (trampa 11) y aun así lo hice mal.
- Patas 4 cm bajo el piso (dentro de la tolerancia del chequeo, pero mal).

**v2 — ya es un perro.** `K_BOLA`, hocico más largo, orejas más grandes, altas y giradas. Quedaba: hocico café (la identidad lo pide blanco), lengua como tabla, patas flotando 2 cm.

**v3 — primera vez en Three.js.** A diferencia del gato negro, el café panela no se aplasta: los colores de `makeDog()` (`0xb86a2c`, `0x7a4218`) sirvieron casi directo. Dos defectos que Blender no mostraba: el lado en sombra salía sucio y oscuro, y los párpados le daban cara de sueño, no de entusiasmo.

**v4 — pose y topes.** Aclaré el pelaje (`0xc47430` / `0xb4682a`), abrí los ojos, ensanché el collar. Probé en el visor las fórmulas de `dogPose()`: dos fases del galope y los topes (mandíbula 0,8, orejas 1,25 rad, cola caída 2,1, cabeza ±). Nada se desprende ni atraviesa de forma fea.
- Un falso positivo mío: en la vista de lado vi "una segunda cola" y busqué el defecto; era la cola del perro actual asomando detrás.
- Abrí el mapa de normales: casi liso (26 KB). Mismo error del agente anterior. Subí el relieve (queda en 54 KB y se ven los mechones, sin chispas).

**Final — dentro del juego real, en memoria.** Cargué `index.html`, cargué `panela.glb` con el `GLTFLoader` de la página, oculté las mallas del perro actual y colgué cada nodo mío del grupo correspondiente del aparejo de `fx.js`. Menú y carrera: Panela galopa, aletea las orejas, mueve la cola y saca la lengua con el código de animación actual, sin errores de consola. Capturas: `intentos/juego_panela_menu.png`, `juego_panela_carrera_1.png`, `_2.png`.

## Comparación con el perro actual

| | Perro actual (`makeDog` + aparejo de `fx.js`) | Panela (`panela.glb`) |
|---|---|---|
| Mallas / llamadas de dibujo | 32 (27 + 5 que añade `fx.js`; contadas en el código) | 16 |
| Triángulos | no medidos | 13 504 |
| Materiales | Lambert de color plano | 1 con textura + 1 de ojos (color por vértice) |
| Peso | 0 (código) | 0,73 MB |
| Ancho del cuerpo / con orejas | 1,10 / ~1,2 | 1,18 / 1,62 |
| Largo (nariz a cola) | ~3,0 | 2,97 |
| Alto de la cabeza | 2,13 | 2,22 |
| Cara | cejas bravas, dientes | ojos grandes, sin cejas ni dientes, lengua afuera |
| Desde atrás | franja, orejas, collar, mancha redonda | franja hasta la nuca, orejas grandes, collar con hebilla dorada, mancha irregular en el lomo + manchita en la grupa, punta de cola blanca |

Medidas en unidades locales (antes del ×1,2). Panela es 9 cm más alta y las orejas sobresalen más: tapa a Tinto un poco más que el perro actual cuando están alineados.

## Nodos y pivotes

Pivote local respecto al padre, en ejes del juego (x, y arriba, z; frente = −z), unidades antes del ×1,2. Ningún nodo tiene rotación ni escala.

| Nodo | Padre | Pivote local | Dónde está | ¿Igual al aparejo actual? |
|---|---|---|---|---|
| `body` | — | (0, 0, 0) | raíz, vacío | sí |
| `torso` | body | (0, 0, 0) | — | — |
| `head` | body | (0, 1.45, −0.85) | cuello | sí |
| `ear_L` | head | (−0.363, 0.578, −0.15) | arriba de la oreja | no (hoy ±0.5, 0.41, −0.17) |
| `ear_R` | head | (0.363, 0.578, −0.15) | arriba de la oreja | no |
| `jaw` | head | (0, −0.07, −0.42) | bisagra de la boca | sí |
| `tongue` | jaw | (0.2, 0.03, −0.3) | comisura derecha | sí |
| `collar` | body | (0, 1.42, −0.8) | centro del cuello | nuevo |
| `tail` | body | (0, 1.4, 0.9) | base de la cola | sí |
| `tail_tip` | tail | (0, 0.42, 0) | mitad de la cola | sí |
| `leg_FL` / `leg_FR` | body | (∓0.3, 0.72, −0.6) | cadera | sí |
| `leg_BR` / `leg_BL` | body | (±0.3, 0.72, 0.6) | cadera | sí |
| extra `eye_L`, `eye_R` | head | (0, 0, 0) | — | — |
| extra `tag` | collar | (0, −0.385, −0.339) | donde cuelga la placa | nuevo; se puede balancear en X |

Izquierda de la perra = −x. Orden de patas igual al de `makeDog()`: FL, FR, BR, BL.

## Integración (no hecha; es del coordinador)

`dog` se crea al cargar `core.js` y `fx.js` guarda en variables cerradas los grupos del aparejo, así que un `.glb` que llega después no puede simplemente reemplazar a `dog`. Lo que probé en memoria, y funciona, es **injertar**:

1. **`js/fx.js`** — una línea al final del bloque del aparejo, para no tener que buscar los grupos por posición como hice yo: `du.rig = { head, jaw, tongue, tailTip, ears };`. Las fórmulas de `dogPose()` no cambian.
2. **`js/models.js`** — cargar `modelos/panela.glb` aparte del mapa `MODELS` (que es de gatos). Al llegar, y solo si están todos los nodos de la tabla:
   ```js
   const n = k => gltf.scene.getObjectByName(k), u = dog.userData, r = u.rig;
   dog.traverse(o => { if (o.isMesh) o.visible = false; });           // esconde el perro por código
   gltf.scene.traverse(o => { if (o.isMesh) o.castShadow = true; });
   const put = (g, node) => { g.add(node); node.position.set(0, 0, 0); };
   put(r.tongue, n('tongue')); put(r.jaw, n('jaw'));                 // primero los hijos
   for (const e of [n('ear_L'), n('ear_R')]) {
     const g = r.ears.find(x => x.userData.side === Math.sign(e.position.x));
     g.position.copy(e.position); put(g, e);                         // el pivote de oreja pasa a ser el mío
   }
   put(r.head, n('head')); put(r.tailTip, n('tail_tip')); put(u.tail, n('tail'));
   ['FL', 'FR', 'BR', 'BL'].forEach((k, i) => put(u.legs[i], n('leg_' + k)));
   u.body.add(n('torso')); u.body.add(n('collar'));
   ```
   Debe correr después de `fx.install`. Si el archivo no carga, queda el perro por código.
3. **`js/core.js`** — nada obligatorio. `makeDog()` queda como respaldo. La escala 1,2 ya está en `dog`.
4. Opcional: balancear `tag` (`rotation.x`) como el cascabel del gato.

Alternativa más limpia y más larga: que `fx.js` use los nodos del `.glb` en vez de crear grupos. Exige que `fx.js` busque las piezas en cada cuadro o se reinstale al cargar. No la probé.

## Lo que no pude verificar

- Estados `dying`, `lost` y `won` dentro del juego: solo probé menú y carrera. Los topes de esos estados los probé en el visor con las fórmulas copiadas, no con `fx.js` real.
- El paso 1 y 2 de integración escritos en archivos: el injerto lo hice en memoria y buscando los grupos por posición.
- Teléfono real: carga, memoria, cuadros por segundo. Vista vertical (cámara más alta y lejana).
- Costa y Ciudad Neón: solo vi el primer mundo.
- Cómo se ve la boca abierta de cerca en el juego (el interior rojo solo lo vi en el visor).
- El `.glb` en la línea de render de stickers del otro agente: ahí la cola saldrá vertical si no le aplican los 0,9 rad.

## Lo que quedó flojo

- **No tiene sonrisa.** La boca cerrada es el borde del hocico blanco sobre la mandíbula blanca: no se lee una línea de boca. La simpatía la cargan los ojos y la lengua.
- La lengua es una cinta plana; de frente y quieta se ve tiesa.
- El atlas desperdicia espacio (muchas islas chicas de `smart_project`).
- Es más "cachorro grandote" que "bulldog": robusta y de patas cortas, pero sin la quijada ancha de un bulldog.
