# Bitácora — agente Figuras

## Rol
Modelar por guion, con Blender 4.5.9 sin ventana, la utilería que más se repite en pantalla para que deje de desentonar con Tinto y Panela: cocodrilo, ratón, moneda de huella, gallina, pescado y caneca con tapa; de ñapa, carro y valla. Un `.glb` liviano por figura en `modelos/props/`. No toqué `js/`, `index.html` ni los modelos existentes. **No integré nada.**

## Qué entregué

| Archivo | Qué es |
|---|---|
| `modelos/props/props.py` | Guion único con las 8 figuras. Completo tarda 7–8 s; `-- rapido` 2 s; `-- raton moneda` hace solo esas. |
| `modelos/props/<figura>.glb` | Las 8 figuras (tabla abajo). |
| `modelos/props/_hoja_props.png` | **Hoja de control**: todas a la misma escala con Tinto y Panela al lado, de frente y desde atrás; cada una desde la cámara y de frente con pose; y dos escenas armadas con la cámara de la carrera (día y drenaje). Hecha en Three.js con la luz del juego. |
| `modelos/props/vistas/<figura>_visor.png` | Seis vistas de cada figura en Three.js: frente, atrás a 20° (como obstáculo), lado, atrás a 48° (como perseguidor), pose, y a tamaño de juego (a 4, 10, 18 y 28 unidades del gato). |
| `modelos/props/vistas/<figura>_blender.png` | Cuatro vistas de Blender (Workbench). Sirven para forma, no para color. |
| `modelos/props/vistas/juego_real_pueblo.png`, `juego_real_drenaje.png` | Capturas **dentro del juego real**, con las figuras cambiadas en memoria (sin editar archivos). |
| `modelos/props/visor_props.html` + `servidor_props.py` | Visor de utilería (puerto 8767): luz, tono y cámara del juego; arma la hoja en una sola imagen y la guarda por POST. |
| `modelos/props/_medidas.json` | Lo que el guion midió leyendo cada `.glb` (de ahí sale la tabla). |
| `modelos/props/intentos/` | Guion v1, hojas v1–v3, intentos del cocodrilo y la gallina, topes de pose, capturas del juego. |

## Tabla de entrega

Todo en **ejes del juego** (x lateral, y arriba, z; frente = −z). Un solo material sin textura por figura (`color_vertice`: color por vértice `COLOR_0`, rugosidad 0,85, sin metal, sin extensiones). Ningún nodo tiene rotación ni escala.

| Figura | Archivo | Peso | Triángulos | Materiales | Caja (mín … máx) | Nodos y pivotes | Choque recomendado (`SPEC`) |
|---|---|---|---|---|---|---|---|
| Cocodrilo | `cocodrilo.glb` | 75 KB | 2 040 | 1 | (−1.13, 0, −2.56) … (1.13, 0.97, 2.93) | `cocodrilo` (raíz, cuerpo fijo) › `jaw` (0, .22, −.98) · `tail` (0, .22, 1.25) › `tail_tip` (0, −.02, .75) | `hw 1, hl 2, y0 0, y1 .95` (el de hoy). Hocico y cola sobresalen de la caja, como hoy. |
| Ratón | `raton.glb` | 19 KB | 556 | 1 | (−.48, 0, −.81) … (.48, .89, 1.21) | `raton` | `hw 1.1, hl 1, y0 0, y1 1.4` (el de hoy) |
| Moneda | `moneda.glb` | 30 KB | 576 | 1 | (−.46, .54, −.07) … (.46, 1.46, .07) | `moneda` (origen en el suelo; el centro queda en y = 1) | `hw 1.1, hl 1, y0 0, y1 2.2` (el de hoy) |
| Gallina | `gallina.glb` | 35 KB | 1 238 | 1 | (−.45, 0, −.77) … (.45, 1.44, .60) | `gallina` | `hw .9, hl .8, y0 0, y1 1.4` (el de hoy) |
| Pescado | `pescado.glb` | 17 KB | 584 | 1 | (−.28, .21, −.63) … (.28, .98, .83) | `pescado` | `hw 1.1, hl 1, y0 0, y1 1.6` (el de hoy). **Ponerle `rotation.y = Math.PI/2`**: ver nota. |
| Caneca | `caneca.glb` | 46 KB | 1 204 | 1 | (−.70, 0, −.69) … (.70, 1.60, .68) | `caneca` (raíz, cuerpo) › `lid` (0, 1.25, −.655) | `hw .7, hl .7, y0 0, y1 1.45`. Ver nota de tamaño. |
| Carro | `carro.glb` | 33 KB | 964 | 2 | (−1.18, 0, −2.16) … (1.18, 1.96, 2.17) | `carro` (raíz: llantas, vidrios, luces) › `pintura` (0, 0, 0) | `hw 1.15, hl 2.1, y0 .55, y1 2.0` |
| Valla | `valla.glb` | 14 KB | 252 | 1 | (−1.4, −.02, −.38) … (1.4, 1.25, .38) | `valla` | `hw 1.4, hl .3, y0 0, y1 1` (el de hoy; las dos luces pasan de 1) |

Total: 269 KB las ocho. Límites pedidos: ratón y moneda ≤ 600 triángulos; el resto ≤ 2 500; ≤ 150 KB (cocodrilo ≤ 300 KB). Todos cumplen.

**Piezas que se mueven** (giros ya en ejes del juego):
- `jaw` es la **quijada de arriba con los ojos**, no la de abajo. La de abajo va pegada al piso y no podría bajar; además desde atrás lo único que se ve abrir es la de arriba. Abre con `jaw.rotation.x` **positivo** (mirado en 0,55 y 0,9).
- `tail` y `tail_tip` menean con `rotation.y` (mirado en 0,35 y 0,6 en cada uno, hacia un solo lado: no se despegan).
- `lid` tiene la bisagra del lado de **adelante** (lejos de la cámara) y abre con `lid.rotation.x` **negativo** (−1,9 queda parada detrás de la boca; mirado también en −2,3). Así la tapa no tapa al gato cuando sale. Si se prefiere al otro lado es una constante (`HINGE`).
- `pintura` es la lata del carro, casi blanca: se tiñe con `material.color` (los tres `CAR_COLORS`). El avisito de taxi no lo modelé.

**Notas para quien integre:**
- **Pescado:** cumple la regla de mirar a −z, pero hoy el juego lo muestra atravesado (de perfil a la cámara, cabeza hacia −x). Para que se siga viendo de perfil: `rotation.y = Math.PI/2`. De cola es una astilla.
- **Caneca:** mide 1,4 de ancho y 1,25 hasta el borde (1,47 con tapa). La boca por dentro mide 1,1 y Tinto con su escala 1,25 mide 1,13 de ancho: pasa justo, rozando; no lo probé con el gato adentro. La `basura` de hoy mide 1 de alto y se puede saltar. Si debe seguir saltándose igual, escalar a 0,7 o dejarla solo como punto de regeneración.
- **Moneda y pescado flotan** dentro del archivo (base en y = 0,54 y 0,21), igual que las de hoy; el origen sí está en el suelo.
- **`bake()` de `core.js` no sirve tal cual:** le pone a cada geometría un color plano y borraría el color por vértice. Lo que hay que meter en `protos[key]` es `[{ geometry, material: vcMat }]` con la geometría del `.glb` ya movida a su sitio. El `COLOR_0` sale como `VEC3` de flotantes, igual que el atributo `color` que arma `bake()`. Estas mallas no traen `uv`: no se pueden fundir con `mergeGeometries` junto a piezas que sí.
- Con el material del `.glb` (Standard) o con el Lambert del juego se ven prácticamente igual (`intentos/hoja_material_standard.png`).

## Decisiones

- **Sin texturas en ninguna.** El encargo permitía una de 256–512 en las medianas. No la usé: el juego ya dibuja toda su utilería con color por vértice y un solo material; así entran por el mismo camino, cada archivo pesa menos de 80 KB y no gastan memoria de video. A 30–60 px de alto una textura no se vería. El costo: no hay detalle fino (escamas, plumas); el detalle es geometría y franjas de color por anillo.
- **Nada de metabolas.** Las guías las usan para los personajes (15 000 triángulos). Con 600 no sirven: el decimado deja triángulos al azar y los bordes de color dentados. Armé todo con pieles entre anillos (superelipses), sólidos de revolución, elipsoides y conos de pocos lados: el número de triángulos sale exacto y el color cae en filas limpias.
- **Mismos colores de hoy** (los hexadecimales de `core.js`, `sewer.js` y `worlds.js`) para que nadie tenga que reaprender qué es qué. Como el color por vértice pasa por la misma luz que las piezas de hoy, sirvieron sin calibrar.
- **Pensadas desde atrás:** orejas rosadas grandes en el ratón, cresta roja y cola en abanico en la gallina, crestas oscuras y ojos saltones en el cocodrilo, stops rojos grandes en el carro, franjas por las dos caras en la valla y la moneda.

## Qué de las guías sirvió y qué faltaba para utilería

**Sirvió:**
- La tabla de ejes, la regla "malla corrida por −pivote" y la receta de `add()`: los pivotes salieron bien a la primera.
- "El render de Blender no es el juego": monté el visor de Three.js desde la primera iteración. En Workbench la gallina blanca se veía gris y la caneca casi negra; en el visor estaban bien. No calibré nada en Blender.
- Color por vértice en lineal, atributo de esquina, conectado al color base: funcionó tal cual y es la base de todo este trabajo.
- Las trampas 3 (vértices "nuevos"), 6 (normales en mallas abiertas) y 10 (la captura de pantalla falla: mandar la imagen por POST). La 3 la evité de raíz: cada primitiva se arma en una malla aparte y se vuelca.
- De `panela.md`: imprimir la caja de cada objeto (me delató la cola de la gallina al revés), y que el juego expone `window.game` (así probé dentro del juego real).
- De `render/LEEME.md`: que Workbench renderiza en 1 s sin ventana. No usé `tinto_tools`: sus poses y cámaras son del gato.

**Faltaba:**
1. **Todo el flujo de la guía es para personajes pesados** (metabolas, UV, horneado, tres texturas). Para utilería no hay receta. La dejé en `props.py`: clase `Pieza` con `loft`, `torno`, `esfera`, `cono`, `caja`, `tubo`, `poligono`.
2. **Cómo llega la utilería a pantalla:** `spawn()` → `BUILD` → `bake()`, y que `bake()` aplana el color. Hubo que leerlo en `core.js`.
3. **La cámara real.** La guía dice "se ve de espaldas"; para utilería importa el ángulo: un obstáculo se ve a unos 20° sobre el horizonte y mide 25–60 px; el perseguidor se ve a 48° y solo de la mitad para adelante. El visor nuevo copia la fórmula de `core.js`.
4. **`verificar_glb.py` y `visor.html` solo conocen al gato** (ya lo decía `panela.md`). Hice el chequeo dentro de `props.py` y un visor propio.
5. **Hacia dónde gira cada bisagra.** No hay regla escrita y me equivoqué en las dos (ver v1). Regla que sirve: el giro en X tiene el mismo signo en Blender y en el juego; positivo levanta lo que está adelante del pivote.
6. **Qué hacer con lo que flota** (moneda, pescado) frente a "origen en el suelo".

## Iteraciones

**v1 — corrió a la primera, con cuatro errores míos.** Las seis figuras exportaron en 5 s. `intentos/*_v1_blender.png`, `intentos/hoja_v1.png`.
- *Signos de las bisagras al revés.* En la vista de pose la quijada del cocodrilo se hundía en el piso y la tapa de la caneca atravesaba el cuerpo. Lo vi en la imagen; los números no decían nada.
- *Moneda con 624 triángulos* (límite 600). Lo cantó mi propio chequeo.
- *Mi chequeo marcaba "no pisa el suelo"* en moneda y pescado, que flotan a propósito. El chequeo estaba mal, no el modelo: le añadí la altura esperada.
- *Dientes como agujas y crestas diminutas* en el cocodrilo; cuerpo flaco para los 2 de ancho pedidos.
- *Primera hoja del visor casi vacía:* puse la cámara a 62 unidades con lente de 14°; las figuras medían 30 px.

**v2 — proporciones.** Cocodrilo más ancho y corto (de 6,3 a 5,5 de largo), cabeza y ojos más grandes, dientes y crestas gruesos, franjas en el lomo. Ratón con orejas de 12 lados. Moneda a 576. Gallina con cuerpo de huevo y cola nueva. `intentos/hoja_v2.png`, `cocodrilo_v2.png`, `gallina_v2.png`.
- *Cola de la gallina hacia adelante:* giré el abanico con el signo cambiado. Lo noté en la caja impresa (el largo hacia atrás bajó de 0,67 a 0,49) antes de abrir la imagen.
- *Crestas y franjas invisibles en Three.js:* las crestas iban de verde oscuro a puntas claras y con la luz del drenaje se fundían con el cuerpo; las franjas solo tocaban el vértice de arriba, que queda debajo de las crestas.
- *Gallina muñeco de nieve:* cabeza, cuello y cuerpo eran tres bolas apiladas; la cola, plana contra la rabadilla.
- *Una captura no se guardó* porque esperé 2 s y no revisé; me enteré cuando `ls` no la encontró. Desde ahí reviso el título de la pestaña ("guardado 200").

**v3 — contraste y cuello.** Crestas y franjas en un verde más oscuro (`0x2a8426`), franjas que bajan por los flancos, cuello de la gallina como piel continua, cola más larga y parada. `intentos/hoja_v3.png`, `cocodrilo_v3.png`, `gallina_v3.png`.

**Ñapa — carro y valla.** El carro tumbó el guion: `tmp.faces[0]` sin `ensure_lookup_table()` en la rama de pieles abiertas, que ninguna figura anterior había usado. Con ocho figuras las baldosas de la hoja quedaron angostas y recortaban la moneda y la valla: corregí el encuadre según el ancho.

**Topes de pose.** Quijada a 0,9, cola a 0,6 + 0,6, tapa a −2,3: nada se despega (`intentos/cocodrilo_topes.png`, `caneca_topes.png`).

**Dentro del juego real, en memoria.** Cargué `index.html`, cargué los `.glb` con el `GLTFLoader` de la página y en cada cuadro cambié el contenido de `o.mesh` de los obstáculos de los tramos visibles, y el del cocodrilo grande. Avancé con `game.step()`. Sin errores de consola. **Vi** en el pueblo: vallas, monedas y ratones. En el drenaje: el cocodrilo grande persiguiendo (crestas, ojos y patas se leen desde la cámara), ratones y monedas. **No vi** dentro del juego: gallina, pescado, caneca, carro ni el cocodrilo como obstáculo; esos solo en el visor.

**Otros tropiezos de herramienta:** un parche por `heredoc` falló por comillas y gasté una corrida; lo pasé a un archivo.

## Lo que quedó flojo

- **El cocodrilo mide 5,5 de largo**, no "unos 4": la caja de choque sí es de 4 y sobran hocico y cola, igual que el de hoy (6,05). Alto 0,97 y ancho 2,26 con las patas.
- **Las franjas del lomo se notan poco** a tamaño de juego; lo que se lee son las crestas.
- El **cuello de la gallina** tiene un borde visible contra el cuerpo.
- El **pescado** es simple (sin boca) y de cola no se lee.
- El **carro** es un bloque redondeado: sin guardabarros, espejos ni aviso de taxi.
- La **caneca** es verde lisa: sin abolladuras ni letrero.
- No hay "estela" clara alrededor del cocodrilo como la del de hoy; sobre el agua oscura se lee por el verde vivo.
- Las vistas de Blender pesan 0,9 MB cada una (PNG sin comprimir).

## Lo que no pude verificar

- **Nada en movimiento:** ni la moneda girando, ni el ratón saltando, ni la cola o la quijada animadas. Solo cuadros sueltos.
- **La integración escrita en archivos.** El cambio fue en memoria y por otro camino (cambiar mallas ya creadas), no por `protos`/`spawn`.
- **Rendimiento:** ni cuadros por segundo ni teléfono. Decenas de ratones de 556 triángulos son más que los de hoy; no medí cuánto pesa eso.
- **Otros mundos:** vi el día del pueblo y el drenaje. Atardecer, noche, costa y ciudad no. En la noche la caneca verde oscura puede perderse.
- Gallina, pescado, caneca y carro **dentro del juego real**.
- La caneca **como punto de regeneración** (el gato saliendo): solo comprobé que cabe por medidas y que la tapa abre.
- No corrí un validador de glTF: los archivos cargan en Three.js r160 y en el chequeo propio.
