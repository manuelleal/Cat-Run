---
name: blender-personaje-web
description: Modela por guion (Blender sin ventana, API bpy 4.x) un personaje estilizado para un juego web en Three.js y lo exporta a .glb con texturas horneadas, verificando el resultado sin interfaz. Úsala cuando haya que crear o mejorar un personaje u objeto 3D "por código", cuando se mencione Blender, bpy, .glb, glTF, hornear texturas, UV automático, o cuando un modelo se vea plano, negro o roto dentro de Three.js.
---

# Personaje de Blender a Three.js, por guion y sin ventana

Borrador. Nació de hacer a Tinto (gato) para un runner en Three.js r160. La guía completa del proyecto, con el contrato de nodos y el código real, está en `modelos/LEEME.md` y `modelos/tinto_v4.py`.

## Principio

No puedes ver Blender. Solo puedes renderizar a PNG y abrir la imagen. Entonces: **cada iteración termina mirando una imagen**, y la imagen que manda es la del motor de destino (Three.js), no la de Blender.

## Antes de escribir código

1. Lee el contrato del juego: nombres de nodos, jerarquía, dónde van los pivotes, ejes, escala, límite de tamaño.
2. Averigua cómo ilumina el juego (luces, tono, si hay mapa de entorno). Sin mapa de entorno no hay reflejos: la forma se lee solo por la luz difusa.
3. Mira una captura del juego real para saber a qué tamaño y desde qué lado se ve el personaje. Reparte el esfuerzo según eso.
4. No toques el modelo en uso. Trabaja en una copia con otro nombre.

## Correr

```bash
blender --background --python modelo.py              # completo
blender --background --python modelo.py -- rapido    # argumentos propios van después de "--"
```

Empieza el guion con `bpy.ops.wm.read_factory_settings(use_empty=True)` para que sea reproducible. Dale un modo rápido que se salte los renders.

## Flujo

1. **Formas gruesas.** Metabolas para fundir elipsoides → modificador Remesh (VOXEL) → Smooth → Decimate hasta un número de triángulos. Se evalúa con `ob.evaluated_get(depsgraph)` y `bpy.data.meshes.new_from_object`; no hace falta ningún operador de interfaz.
2. **Piezas finas** (orejas, tela, ojos) con `bmesh`, a partir de rejillas paramétricas.
3. **Colocar sobre la superficie con rayos** (`BVHTree.ray_cast`), de afuera hacia adentro y contra una sola malla.
4. **Pivotes:** traslada la malla por `-pivote` y pon el objeto en `pivote - pivote_del_padre`. Sin rotación ni escala.
5. **Materiales fuente procedurales** (ruido, posición del mundo, atributos de vértice). Solo sirven para hornear.
6. **UV:** selecciona todas las piezas, entra a modo edición con todas a la vez y llama `bpy.ops.uv.smart_project`. Comparten un atlas.
7. **Hornea** con Cycles en CPU, pocas muestras: `DIFFUSE` con `pass_filter={'COLOR'}`, `NORMAL`, `ROUGHNESS`. El destino es el nodo de imagen **activo y sin conectar** de cada material. Imágenes de normal y rugosidad en `Non-Color`.
8. **Un material final** con solo: imagen → Base Color; imagen → Separate Color → verde → Roughness; imagen → Normal Map → Normal. Reemplaza los materiales fuente y pon todos los índices de material en 0.
9. **Exporta** GLB con `export_apply=True, export_yup=True, export_image_format='JPEG'`.
10. **Verifica** (abajo).

## Qué no sobrevive al exportador glTF

- Texturas procedurales, rampas de color, mezclas: se pierden **sin aviso**. Todo lo procedural se hornea.
- Sombreador Toon o cualquier cosa que no sea Principled: material vacío. El estilo caricatura se aplica en el motor.
- Sheen y Coat sí salen, como extensiones, pero vuelven el material más caro en Three.js.
- Draco, WebP y KTX2 reducen peso pero **exigen** que el cargador del juego esté configurado para ellos. No los actives sin confirmarlo.
- Color por vértice sí sale (`COLOR_0`). Guárdalo en lineal.

## Verificar sin interfaz (las tres, siempre)

1. **El archivo:** lee el JSON del `.glb` (cabecera de 12 bytes, luego longitud y trozo JSON) y comprueba nodos, padres, que no haya `rotation` ni `scale`, que cada imagen tenga `bufferView` (va dentro), `extensionsRequired` vacío y el tamaño. Reimporta en un Blender vacío y mide caja, triángulos, que pise el suelo y hacia dónde mira.
2. **Blender:** renders fijos de frente, espalda, lado y primer plano con el material **final**, no el fuente. Imprime la caja de cada objeto: un objeto de 2 m donde esperabas 10 cm delata el error antes que la imagen.
3. **El motor:** una página mínima con el mismo cargador, las mismas luces y el mismo tono del juego, el modelo viejo y el nuevo lado a lado. Si la captura de pantalla falla, haz que la página mande el lienzo por POST a un servidor local que lo guarde. Si puedes, cambia el modelo dentro del juego real en memoria (sin editar archivos) y captura a tamaño de juego.

## Errores que ya costaron tiempo

- Calibrar colores en el render de Blender. Con tono ACES los oscuros se aplastan: un negro `0x2b` sale negro puro. Calibra en el motor.
- Rugosidad baja con normales de grano fino: chispas blancas bajo una luz direccional.
- Variación de color con ruido grande y contrastado: el personaje parece piedra. La variación va donde tiene sentido (pecho, panza, patas), no al azar.
- `bm.verts[inicio:]` tras borrar vértices: usa lo que devuelve el operador de bmesh.
- `mesh.materials.clear()` borra los índices de material de las caras.
- Rayos lanzados desde adentro de dos mallas solapadas: tocan la cara interna equivocada.
- `recalc_face_normals` en mallas abiertas con descarte de caras traseras: piezas invisibles.
- Detalle más fino que un texel: muaré. Calcula texeles por unidad antes de elegir la escala de un patrón.
- Dar por bueno un intento sin abrir la imagen.

## Dejar rastro

Guarda cada intento fallido con nombre (`<modelo>_v4a_frente.png`, `<modelo>_v4a.py`) y anota qué salió mal y **cómo lo notaste**. Separa en el informe lo que probaste de lo que solo leíste, y di qué no pudiste verificar (movimiento, teléfono real).
