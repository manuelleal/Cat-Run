# modelos/ — de un guion de Blender a un personaje dentro del juego

Guía práctica para hacer otro personaje (por ejemplo la perra Panela) sin redescubrir nada. Todo lo que dice "probado" se corrió en Blender 4.5.9 sin ventana y se miró en Three.js r160; lo que dice "leído" viene de documentación y no se probó aquí.

## Qué hay en esta carpeta

| Archivo | Qué es |
|---|---|
| `tinto.py` → `tinto.glb` | Tinto en uso por el juego (v3: metabolas y colores planos). **No tocar sin avisar.** |
| `tinto_v4.py` → `tinto_v4.glb` | Tinto con textura horneada, ojos con degradado y pañuelo de tela. Es la plantilla para personajes nuevos. |
| `tinto_v4_<vista>.png` | Vistas de control de Blender: `frente`, `atras`, `lado`, `cara`, `patas`. |
| `texturas/` | Las tres imágenes horneadas (color, normal, rugosidad) en PNG, para mirarlas. El `.glb` las lleva dentro en JPEG. |
| `verificar_glb.py` | Comprueba un `.glb` contra el contrato del juego. Termina en error si algo falla. |
| `visor.html` + `servidor_visor.py` | Muestra un `.glb` en Three.js con la misma luz y tono del juego y guarda la captura en `intentos/`. |
| `intentos/` | Intentos fallidos con nombre (`tinto_v4a…f`), capturas de Three.js (`three_*`) y del juego (`juego_*`), y dos guiones de prueba (`prueba_a_horneado.py`, `prueba_b_exportador.py`). |
| `skill-blender/SKILL.md` | Borrador de skill con este flujo en general. No está instalado. |

## Cómo correr

```bash
B="C:/Users/User/Documents/PROYECTOS/_herramientas/blender-4.5.9-windows-x64/blender.exe"
"$B" --background --python modelos/tinto_v4.py              # todo: unos 30 s
"$B" --background --python modelos/tinto_v4.py -- rapido    # solo el .glb: unos 8 s
"$B" --background --python modelos/verificar_glb.py -- modelos/tinto_v4.glb
python modelos/servidor_visor.py                            # deja el visor en http://localhost:8766
```

Visor: `http://localhost:8766/modelos/visor.html?m=tinto.glb,tinto_v4.glb&v=frente&w=1000&h=560&guardar=nombre`
(`v` = `frente | atras | lado | cara | juego`; con `guardar` la imagen queda en `intentos/nombre.png`). El visor carga Three.js de internet, igual que el juego.

## Contrato de nodos (lo que exige `js/models.js`)

```
body
├─ torso
├─ head
│  ├─ ear_L      ├─ ear_R        (extra en v4: eye_L, eye_R, whiskers)
├─ panuelo
│  └─ knot       (el juego lo mueve como "cascabel")
├─ tail
│  └─ tail_tip
└─ leg_FL, leg_FR, leg_BR, leg_BL
```

- Cada nodo es un objeto rígido. **No hay esqueleto**: el juego gira cada pieza sobre su origen.
- El origen de cada pieza va en su articulación (cadera, base de la oreja, base de la cola, nuca).
- Sin rotación ni escala en reposo. Solo traslación.
- Se pueden añadir nodos extra; el juego los ignora y se mueven con su padre.
- Si falta un nodo, `models.js` descarta el modelo y deja el gato hecho por código.
- Para un personaje nuevo hay que añadir su archivo en el mapa `MODELS` de `js/models.js` (eso lo hace quien sea dueño de ese archivo, no el agente Blender).

Pivotes de Tinto (iguales en v3 y v4, para que las animaciones no cambien): cabeza `(0, .62, 1.0)`, caderas `(±.18, .46 / -.44, .5)`, cola `(0, -.6, .86)`, punta `(0, -.9, 1.2)`, pañuelo `(0, .54, .95)`. El nudo sí cambió de sitio en v4.

## Convención de ejes

| | Blender | Juego (glTF / Three.js) |
|---|---|---|
| Lateral | X (izquierda del personaje = **-X**) | X |
| Adelante | **+Y** | **-Z** |
| Arriba | Z | Y |

Se modela mirando a +Y y se exporta con `export_yup=True`. Las patas pisan en Z = 0. El juego aplica escala 1,25 a la raíz; Tinto mide 2,1 de largo y 1,72 de alto en unidades de Blender.

## El flujo, paso a paso

1. **Formas gruesas**: metabolas → remallado por vóxeles → suavizado → decimado (función `blob`).
2. **Piezas finas** (orejas, pañuelo, ojos) con `bmesh`, colocadas con rayos contra la malla ya terminada.
3. **Materiales fuente** procedurales. Solo sirven para hornear; no se exportan.
4. **UV automático** de todas las piezas a un solo atlas.
5. **Horneado** a tres imágenes: color, normal, rugosidad.
6. **Un solo material final** que solo usa esas imágenes.
7. **Exportar** `.glb`.
8. **Verificar**: `verificar_glb.py`, vistas de Blender y, sobre todo, el visor de Three.js.

## Recetas que funcionaron (probadas)

**Pieza con el pivote en la articulación** — la malla se corre al revés y el objeto se pone en el pivote:

```python
def add(mesh, name, pivot=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, mesh); col.objects.link(ob)
    pivot = Vector(pivot)
    if mesh: mesh.transform(Matrix.Translation(-pivot))
    ob['pivot'] = pivot[:]
    ob.location = pivot - (Vector(parent['pivot']) if parent else Vector())
    ob.parent = parent
    return ob
```

**Forma orgánica limpia** — las metabolas solas dejan triángulos disparejos; con modificadores quedan parejos y con el número de triángulos que uno pide. No hace falta ningún operador de interfaz:

```python
r = tmp.modifiers.new('remalla', 'REMESH'); r.mode, r.voxel_size = 'VOXEL', .022
s = tmp.modifiers.new('suaviza', 'SMOOTH'); s.factor, s.iterations = .5, 6
n = tris_of(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()).data)
d = tmp.modifiers.new('decima', 'DECIMATE'); d.ratio = min(1, objetivo / n)
mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
```

**Colocar cosas sobre la piel** — nadie sabe dónde queda la superficie después de fundir y suavizar. Se lanza un rayo:

```python
tree = BVHTree.FromBMesh(bm)                       # con la malla en coordenadas del mundo, ANTES de add()
hit = tree.ray_cast(origen_afuera, -direccion)[0]  # de AFUERA hacia adentro
```

**UV de varios objetos a un solo atlas** — se seleccionan todos y se entra a modo edición con todos a la vez:

```python
for o in piezas: o.select_set(True)
bpy.context.view_layer.objects.active = piezas[0]
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.006)
bpy.ops.object.mode_set(mode='OBJECT')
```

**Hornear sin ventana** — Cycles en CPU, 4 muestras. El horneado escribe en el nodo de imagen **activo** de cada material, que no debe estar conectado a nada:

```python
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 4
for m in materiales_fuente:
    n = m.node_tree.nodes.get('DESTINO') or m.node_tree.nodes.new('ShaderNodeTexImage')
    n.name, n.image = 'DESTINO', imagen
    m.node_tree.nodes.active = n
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, margin=6, use_clear=True)  # color
bpy.ops.object.bake(type='NORMAL', margin=6)       # imagen con espacio 'Non-Color'
bpy.ops.object.bake(type='ROUGHNESS', margin=6)    # imagen con espacio 'Non-Color'
```

Los tres horneados de Tinto (1024, 1024 y 512 px, 12 objetos) tardan unos 5 s en total.

**Material final que el exportador entiende** — imagen → Principled, y nada más en medio:

```python
nt.links.new(tex('color'), b.inputs['Base Color'])
sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tex('rugosidad'), sep.inputs['Color'])
nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])            # rugosidad = canal verde
nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex('normal'), nm.inputs['Color'])
nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
mat.use_backface_culling = True                                      # si no, sale doubleSided
```

**Zonas de color por posición** — en el material fuente, `Geometry > Position` da coordenadas del mundo. Una "mancha" (pecho, panza, medias, hocico) es la distancia a un punto dividida por unos radios, pasada por un `Map Range` suave. Ver `spot()` y `fur()` en `tinto_v4.py`.

**Dato propio para el material** — un atributo de vértice hecho con bmesh se lee en el material con el nodo `Attribute`. Así se pinta el ribete del pañuelo:

```python
lay = bm.verts.layers.float.new('borde'); v[lay] = distancia_al_borde
at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'borde'
```

**Degradado sin textura (ojos)** — color por vértice en un atributo `FLOAT_COLOR` de esquina, en lineal, conectado directo al color base. Sale como `COLOR_0` y Three.js lo multiplica por el color del material:

```python
lay = bm.loops.layers.float_color.new('Col')
for lp in v.link_loops: lp[lay] = (*srgb(0xffd23f), 1)
ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
```

Con la esfera girada para que el polo mire al frente, los anillos quedan concéntricos y el degradado del iris sale limpio con pocos vértices.

**Exportar:**

```python
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
    export_image_format='JPEG', export_image_quality=88, export_extras=False,
    export_animations=False, export_cameras=False, export_lights=False)
```

## Qué sobrevive al exportar (probado con `intentos/prueba_b_exportador.py`)

| En Blender | En el `.glb` |
|---|---|
| Imagen → Principled (color, rugosidad en verde, Normal Map) | Sí, textura dentro del archivo |
| Ruido u otra textura procedural → color | **No. Se pierde sin avisar**: queda el material por defecto |
| Imagen → Rampa de color → color | **Sale la imagen sin la rampa, sin avisar** |
| Color por vértice conectado al color base | Sí, `COLOR_0` |
| Color por vértice sin conectar | En 4.5.9 también salió (`COLOR_0`), aunque la documentación dice que solo si se usa en el material |
| Sheen, Coat, fuerza de emisión | Sí, como extensiones `KHR_materials_*`. En Three.js convierten el material en `MeshPhysicalMaterial`, más caro (leído, no probado aquí) |
| Sombreador Toon | **No.** Sale un material vacío. El estilo caricatura hay que ponerlo en el juego |
| Solo sombreador de Emisión | Sale color base negro + emisivo; no usa `KHR_materials_unlit` |

Tamaños del mismo Tinto v4: JPEG 88 = 0,83 MB · WebP 88 = 0,70 MB (pide `EXT_texture_webp`) · JPEG + Draco = 0,51 MB (pide `KHR_draco_mesh_compression`, que el cargador del juego no tiene configurado: **no usar** sin cambiar `models.js`).

## Trampas conocidas (todas nos pasaron)

1. **El render de Blender no es el juego.** Blender (AgX, cielo claro) muestra el pelaje gris y con forma; Three.js con ACES lo aplasta a negro. Los colores se calibran en `visor.html`. Para un personaje negro: base alrededor de `0x2b–0x33`; por debajo de `0x28` todo es negro puro; con manchas hasta `0x3e` y mechones `0x5a` parece piedra gris.
2. **Rugosidad baja + mapa de normales de grano fino = chispas blancas** en Three.js (no hay mapa de entorno, solo el sol). Rugosidad de pelaje entre 0,62 y 0,92.
3. **`bm.verts[inicio:]` después de borrar vértices no devuelve lo que uno cree.** Usar la lista que devuelve el operador (`bmesh.ops.create_uvsphere(...)['verts']`). Por esto los ojos de v4a salieron como esferas de 1 m en el origen.
4. **`mesh.materials.clear()` pone en 0 el índice de material de todas las caras.** Las orejas perdieron el rosado.
5. **Rayos desde adentro** topan la cara interna de la malla más cercana. Con dos mallas solapadas (cabeza y torso) el pañuelo terminó alrededor del hocico. Lanzar de afuera hacia adentro y solo contra la malla que toca.
6. **`recalc_face_normals` en mallas abiertas** puede voltear caras; con `use_backface_culling` desaparecen. En parches abiertos se orienta a mano (`f.normal.dot(d) < 0 → f.normal_flip()`).
7. **Detalle más fino que el texel = muaré.** A 1024 px para todo el gato hay unos 400 texeles por unidad: nada con periodo menor de ~0,03 unidades.
8. **Una esfera incrustada en otra** deja el borde dentado (pupila). Mejor un parche que copie la curvatura y quede un poco por encima.
9. **`export_image_format='AUTO'` conserva el formato de origen**: una imagen horneada sale PNG (3 a 4 veces más pesada que JPEG).
10. **La captura de pantalla del panel de navegador falla a ratos** ("timed out"). Por eso el visor manda la imagen por POST a `servidor_visor.py`.
11. **Mirar el modelo a tamaño de juego.** En la carrera el gato ocupa unos 60 px de alto y se ve de espaldas: lo que se lee es silueta, orejas, nudo rojo y cola. La textura fina solo se nota en primeros planos (menú, tienda, clips).

## Presupuesto para celular

Tinto v4: 15 mallas = 15 llamadas de dibujo, 14 582 triángulos, 3 materiales, 3 texturas (2 × 1024 y 1 × 512), 0,88 MB. El v3 tenía 25 primitivas y 18 208 triángulos sin texturas (0,34 MB). Referencias leídas, no medidas en un teléfono: mantener pocas llamadas de dibujo y pocos materiales pesa más que el número de triángulos; texturas de 1024 como tope en celular; JPEG y PNG se descomprimen completas en la memoria de video (unos 12 MB para las tres de Tinto con mipmaps), y si eso llega a pesar, el siguiente paso es KTX2/Basis, que exige configurar `KTX2Loader` en el juego.

## Lista de verificación antes de entregar

- [ ] `verificar_glb.py` termina en "TODO BIEN" (nodos, padres, sin rotación, imágenes dentro, patas en el suelo, mira a +Y, menos de 1,5 MB).
- [ ] Miraste las vistas de Blender **y** las del visor de Three.js, de frente, de espaldas y a tamaño de juego.
- [ ] Los pivotes están en las articulaciones (imprime las traslaciones con `verificar_glb.py`).
- [ ] Los intentos fallidos quedaron en `intentos/` con nombre y están contados en la bitácora.

## Fuentes

- Manual de Blender 4.5, exportador glTF: https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html
- Three.js, GLTFLoader (extensiones y qué cargadores extra piden): https://threejs.org/docs/pages/GLTFLoader.html
- Three.js, MeshPhysicalMaterial (costo por píxel): https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- Color en Three.js (colores de vértice en lineal): https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
- Colores de vértice desde Blender 4.1: https://projects.blender.org/blender/blender/issues/123925
- Presupuestos de escena en Three.js: https://discourse.threejs.org/t/three-scene-optimization-texture-size-calculation-in-gpu-compression-merge-meshes-what-the-limits/23972
- KTX 2.0 / Basis (Khronos): https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets
- Horneado por guion (patrón del nodo activo): https://blenderartists.org/t/b3-2-automatic-bake-sequence/1416420
