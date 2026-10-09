# Bitácora — agente Blender

## Rol
Modelar por guion, con Blender 4.5.9 sin ventana, y dejar el conocimiento para el siguiente personaje. Encargo: investigar cómo se hace bien, probarlo mejorando a Tinto en una copia (`modelos/tinto_v4.py` → `modelos/tinto_v4.glb`) y escribir la guía (`modelos/LEEME.md`) y un borrador de skill (`modelos/skill-blender/SKILL.md`). No toqué `modelos/tinto.py`, `modelos/tinto.glb`, `js/`, `index.html` ni el servidor del juego.

## Resultado en una tabla

| | Tinto actual (v3) | Tinto v4 |
|---|---|---|
| Archivo | 0,34 MB | **0,88 MB** (límite pedido: 1,5) |
| Triángulos | 18 208 | 14 582 |
| Llamadas de dibujo | 25 | 15 |
| Materiales | 7, colores planos | 3: uno con textura para todo el cuerpo, ojos, bigotes |
| Texturas | ninguna | color 1024, normal 1024, rugosidad 512, dentro del `.glb` en JPEG |
| Contrato de nodos | cumple | cumple, mismos pivotes (solo cambió el del nudo) |

## Qué investigué y qué fuentes pesaron

La que más pesó fue el **manual del exportador glTF de Blender 4.5**: dice que el exportador arma el material "a partir de los nodos que reconoce" y solo describe imágenes conectadas al Principled. De ahí salió la decisión central: todo lo procedural se hornea a imagen. Segunda en peso, la página de **GLTFLoader de Three.js**: Draco, KTX2 y Meshopt necesitan un cargador extra que el juego no tiene configurado, así que no los usé.

| Tema | Fuente | ¿Lo probé? |
|---|---|---|
| Qué nodos de material sobreviven | [Manual Blender 4.5, glTF](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html) | Sí, 8 casos (`modelos/intentos/prueba_b_exportador.py`) |
| Horneado por guion: escribe en el nodo de imagen activo | [Blender Artists](https://blenderartists.org/t/b3-2-automatic-bake-sequence/1416420) | Sí (`prueba_a_horneado.py` y v4) |
| UV automático sin ventana y atlas compartido | Búsqueda sin respuesta clara para 4.5 | Sí: funciona con varios objetos en modo edición |
| Color por vértice: va en lineal; desde 4.1 solo sale si se usa en el material | [Three.js foro](https://discourse.threejs.org/t/when-exporting-to-gltf-what-color-space-is-used-for-vertex-colors/17642), [incidencia de Blender](https://projects.blender.org/blender/blender/issues/123925) | Sí. En 4.5.9 **también salió sin conectar**, al contrario de lo leído |
| Extensiones que entiende Three.js | [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) | Draco y WebP: exporté y medí; no los cargué en el juego |
| Sheen y Coat encarecen el material | [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) | Solo confirmé que se exportan como extensión |
| Presupuesto para celular | [Three.js foro](https://discourse.threejs.org/t/three-scene-optimization-texture-size-calculation-in-gpu-compression-merge-meshes-what-the-limits/23972), [Khronos KTX2](https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets) | No. Las cifras varían mucho entre fuentes y no medí en un teléfono |
| Remallado, suavizado y decimado por modificadores | Conocimiento previo de la API | Sí, es la función `blob` |
| Sombreado caricatura | — | Solo que el sombreador Toon sale vacío al exportar |
| Nodos de geometría | — | **No lo investigué ni lo probé** |

Dos lecturas fallaron: la referencia de `bpy.ops.object` es tan larga que la herramienta de lectura no llegó a la firma de `bake`, y a la primera tampoco llegó a la sección de materiales del manual (sí al tercer intento). Los parámetros de horneado que uso salieron de probar, no de la documentación.

## Qué probé, iteración por iteración

Cada intento tiene sus imágenes en `modelos/intentos/`.

**Prueba A (antes de tocar a Tinto).** Un guion mínimo con una esfera y una mona: UV de dos objetos a la vez, tres horneados, exportación. Funcionó a la primera en 0,2 s por horneado. Abrí la imagen horneada y vi las islas de los dos objetos sin pisarse: el atlas compartido sirve.

**v4a — desastre.** El guion completo corrió sin errores y exportó. Al abrir el render, medio gato estaba tapado por una masa blanca y negra de triángulos gigantes y el pañuelo le cruzaba la cara.
- *Cómo lo noté:* mirando la imagen. La consola decía que todo estaba bien.
- *Causa 1:* imprimí la caja de cada objeto y los ojos medían 2 m. Tomaba los vértices nuevos con `bm.verts[inicio:]` después de borrar otros, y transformaba los que no eran. Corregido usando la lista que devuelve el operador.
- *Causa 2:* el pañuelo se colocaba con rayos lanzados desde adentro del cuello. Con la cabeza nueva (cachetes, mentón) el rayo topaba primero la cara interna de la cabeza.
- *Mi primer arreglo del pañuelo también estuvo mal:* lancé los rayos de afuera hacia adentro contra cabeza y torso juntos, y la caja del pañuelo seguía llegando a z = 1,25 (encima de la cabeza). Lo vi en los números antes de renderizar. El arreglo bueno fue lanzar solo contra el torso.

**v4b — gato reconocible, cuatro defectos.** (1) Las orejas no tenían rosado: `mesh.materials.clear()` pone en 0 el índice de material de todas las caras. (2) La cabeza parecía cáscara de naranja: el relieve del pelo era ruido sin dirección. (3) Los párpados lo hacían ver furioso en vez de descarado. (4) La pupila era una rendija y el pico del pañuelo quedaba corto.

**v4c — primera vez en Three.js, y el render de Blender me había engañado.** Hasta aquí juzgaba con el render de Blender, donde el pelaje se veía gris oscuro con forma. Armé `modelos/visor.html` con las luces y el tono del juego y el gato salió **negro puro con chispas blancas**. La variación de tono había desaparecido y la rugosidad baja con el relieve fino producía destellos. Es el error más caro de la sesión: tres iteraciones calibrando color en el sitio equivocado.
- También falló el visor: la captura de pantalla del panel daba "timed out" una de cada dos veces, y la cámara encuadraba mal. Añadí al visor un envío de la imagen por POST a un servidor local mío (`modelos/servidor_visor.py`, puerto 8766) que la guarda en `intentos/`. Desde ahí las capturas fueron fiables.

**v4d — me pasé al otro lado.** Aclaré los tonos y subí el contraste de las manchas. En Three.js el gato parecía de piedra gris azulada con camuflaje: ya no era un gato negro. Además la pupila, que era una esfera incrustada en el ojo, mostraba el borde dentado.

**v4e — el equilibrio.** Base casi uniforme (`0x2b`–`0x33`) y la variación solo donde tiene sentido: pechera, panza, "medias" en las patas, hocico. Pupila y brillos como parches que copian la curvatura del ojo y quedan un poco por encima.

**v4f — una textura que no hacía nada.** Abrí el mapa de normales por curiosidad y era casi liso: al bajar el relieve en v4c lo había dejado en nada, y estaba a punto de entregar 107 KB que no aportaban. La trama del pañuelo, en cambio, salía con muaré porque era más fina que un texel. Subí el relieve del pelo, engrosé la trama y volví a mirar la textura: ahora se ven los mechones.

**Verificación final.**
- `modelos/verificar_glb.py` sobre el `.glb`: los 13 nodos, padres correctos, sin rotación, tres imágenes dentro, patas en el suelo, mira hacia adelante. Reimportado en Blender: 14 582 triángulos. "TODO BIEN".
- Visor de Three.js, v3 y v4 lado a lado: `three_v4_final_frente.png`, `_atras`, `_lado`, `_cara`.
- **Dentro del juego real**, sin editar ningún archivo: en la pestaña cargué `tinto_v4.glb` y reemplacé en memoria el constructor del gato con una copia de la función `wrap` de `models.js`. Corrí 650 cuadros con salto, cambio de carril y deslizada: sin errores de consola ni posiciones inválidas. Capturas: `juego_actual.png`, `juego_v4.png`, `juego_v4_salto.png`.

## Qué quedó mejor en v4

- **Pelaje:** deja de ser un color plano. Pechera y panza más claras, medias en las patas, mechones en la rugosidad y en el relieve. Almohadillas rosadas debajo de las cuatro patas.
- **Ojos:** iris con degradado de amarillo a ámbar y borde oscuro (color por vértice, sin textura), pupila vertical, dos brillos y párpado caído que le da la cara de "no hice nada".
- **Pañuelo:** banda con arrugas, pico sobre el pecho con ribete crema, lunares, trama en relieve y nudo con dos cabos.
- **Orejas:** láminas curvas con borde de pelo e interior rosado. La izquierda tiene un mordisco en media luna que se lee de espaldas.
- **Silueta:** dedos, muslo trasero, cola curva que se afina, cachetes y hocico.
- **Más liviano de dibujar:** 15 llamadas en vez de 25 y 20 % menos triángulos.

## Qué no logré

- **En la carrera casi no se nota.** A tamaño de juego el gato mide unos 60 px, se ve de espaldas y el perro lo tapa en parte. Se distinguen el nudo, la oreja mordida y la cola; la textura del pelaje no. La mejora es para primeros planos: menú, tienda, clips, stickers.
- **Sigue sin cuello** y el lomo es casi recto. El pañuelo tapa la unión. Era la prioridad más baja y no la ataqué de verdad.
- **El pelaje es un gato negro mate, no pelo.** Sin mapa de entorno en el juego no hay brillo suave posible; lo conseguido es variación de tono.
- **El pecho claro queda tapado por el pañuelo** desde casi cualquier ángulo.
- Los cabos del nudo se ven algo tiesos de perfil.
- Pesa 0,54 MB más que el actual.

## Lo que no verifiqué

- Nada en movimiento: solo cuadros sueltos. No sé cómo se ven las orejas, la cola y el nudo al animarse; el pivote del nudo cambió y el juego lo mueve como cascabel.
- Ningún teléfono: ni tiempo de carga, ni memoria, ni cuadros por segundo.
- El cambio de modelo editando `js/models.js`: solo lo hice en memoria.
- Parpadeo o brillo de las texturas a distancia mientras el gato corre.
- Otros mundos (Costa y Ciudad Neón) y sus luces. La Ciudad es oscura y un gato negro puede perderse.

## Qué recomendaría después

1. **Cambiarlo en el juego sí vale la pena, con expectativa correcta:** es una línea en `MODELS` de `js/models.js` (dueño: quien integró los modelos). Gana en todo lo que sea primer plano y dibuja más barato; durante la carrera se ve casi igual.
2. **Darle al gato un plano cercano** (menú o entrada de partida). Sin eso, ningún trabajo de modelado se ve. El agente Gatos ya lo había pedido.
3. **Panela con este mismo guion:** copiar `tinto_v4.py`, cambiar elipsoides y colores. `LEEME.md` tiene el contrato y las recetas.
4. Mirar el modelo en movimiento y en la Ciudad Neón antes de darlo por bueno.
5. Si el peso importa: quitar el mapa de normales ahorra 154 KB y a tamaño de juego no se nota.
6. Párpados como nodos aparte permitirían parpadear con el mismo sistema de piezas rígidas.
7. Investigar nodos de geometría para pelo en mechones reales: no lo toqué.
