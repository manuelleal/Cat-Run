# Modela a Tinto en Blender y lo exporta a modelos/tinto.glb.
# Uso:  blender --background --python modelos/tinto.py
#
# El juego anima piezas rígidas por su pivote (no usa esqueleto), así que Tinto sale como un árbol de objetos:
#   body > torso, head (> ear_L, ear_R, ojos, bigotes), panuelo (> knot), tail (> tail_tip), leg_FL, leg_FR, leg_BR, leg_BL
# Blender: X = lateral, +Y = hacia adelante, Z = arriba. Al exportar, +Y pasa a ser -Z, que es hacia donde mira el gato en el juego.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection


def material(name, color, rough=.75):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    return m


def srgb(h):  # 0xRRGGBB -> lineal
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


FUR = material('pelo', srgb(0x2b2b34), .62)
PAW = material('patas', srgb(0x45454f), .7)
RED = material('panuelo', srgb(0xd01828), .8)
PINK = material('rosa', srgb(0xf08fa6), .7)
EYE = material('ojo', srgb(0xffd23f), .25)
BLACK = material('pupila', srgb(0x08080a), .2)
WHITE = material('bigote', srgb(0xf2f2f2), .5)


def add(mesh_or_none, name, pivot=(0, 0, 0), parent=None):
    """Crea un objeto cuyo origen es `pivot` (coordenadas del mundo) y lo cuelga de `parent`."""
    ob = bpy.data.objects.new(name, mesh_or_none)
    col.objects.link(ob)
    pivot = Vector(pivot)
    if mesh_or_none:
        mesh_or_none.transform(Matrix.Translation(-pivot))
    ob['pivot'] = pivot[:]
    ob.location = pivot - (Vector(parent['pivot']) if parent else Vector())
    ob.parent = parent
    return ob


def smooth(mesh, mat):
    mesh.materials.append(mat)
    for p in mesh.polygons:
        p.use_smooth = True
    return mesh


def blob(name, balls, mat, res=.045):
    """Funde elipsoides en una sola superficie orgánica (metabolas) y la devuelve como malla."""
    mb = bpy.data.metaballs.new(name + '_mb')
    mb.resolution = res
    mb.threshold = .6
    for (x, y, z), (rx, ry, rz) in balls:
        e = mb.elements.new(type='ELLIPSOID')
        e.co = (x, y, z)
        r = max(rx, ry, rz)
        e.radius = r * 2
        e.size_x, e.size_y, e.size_z = rx / r, ry / r, rz / r
    ob = bpy.data.objects.new(name + '_mb', mb)
    col.objects.link(ob)
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob)
    bpy.data.metaballs.remove(mb)
    mesh.name = name
    return smooth(mesh, mat)


def from_bm(name, build, mat):
    bm = bmesh.new()
    build(bm)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return smooth(mesh, mat)


def sphere(name, center, radii, mat, seg=20):
    def build(bm):
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 + 2, radius=1,
                                  matrix=Matrix.Translation(center) @ Matrix.Diagonal((*radii, 1)))
    return from_bm(name, build, mat)


def cone(name, base, tip, r, mat, seg=14):
    """Cono redondeado de `base` a `tip`."""
    base, tip = Vector(base), Vector(tip)
    axis = tip - base
    rot = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()

    def build(bm):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r * .12, depth=axis.length,
                              matrix=Matrix.Translation((base + tip) / 2) @ rot)
    return from_bm(name, build, mat)


def join(name, meshes):
    bm = bmesh.new()
    for m in meshes:
        off = len(bm.verts)
        bm.from_mesh(m)
    out = bpy.data.meshes.new(name)
    # conservar materiales por cara
    mats = []
    bm.free()
    bm = bmesh.new()
    for m in meshes:
        idx = {}
        for i, mt in enumerate(m.materials):
            if mt not in mats:
                mats.append(mt)
            idx[i] = mats.index(mt)
        start = len(bm.faces)
        bm.from_mesh(m)
        bm.faces.ensure_lookup_table()
        for f in bm.faces[start:]:
            f.material_index = idx.get(f.material_index, 0)
            f.smooth = True
        bpy.data.meshes.remove(m)
    bm.to_mesh(out)
    bm.free()
    for mt in mats:
        out.materials.append(mt)
    return out


# ---------------- Tinto ----------------
body = add(None, 'body')

# torso: pecho ancho, lomo arqueado, cadera
torso = add(blob('torso', [
    ((0, .30, .74), (.31, .36, .31)),   # pecho
    ((0, -.05, .76), (.29, .42, .28)),  # lomo
    ((0, -.38, .72), (.30, .32, .30)),  # cadera
    ((0, .52, .88), (.21, .22, .22)),   # cuello
], FUR), 'torso', parent=body)

# cabeza grande de caricatura: cráneo, cachetes y hocico
HEAD = (0, .66, 1.06)
head = add(join('head', [
    blob('craneo', [
        ((0, .74, 1.12), (.36, .31, .30)),
        ((-.19, .86, 1.03), (.17, .15, .14)),
        ((.19, .86, 1.03), (.17, .15, .14)),
        ((0, .96, 1.02), (.14, .13, .11)),
    ], FUR, .04),
    sphere('nariz', (0, 1.075, 1.045), (.04, .03, .028), PINK, 10),
]), 'head', HEAD, body)

for side, name in ((-1, 'L'), (1, 'R')):
    # ojos amarillos con pupila vertical
    eye = join('eye_' + name, [
        sphere('e', (side * .16, .965, 1.15), (.085, .05, .095), EYE, 14),
        sphere('p', (side * .16, 1.0, 1.15), (.028, .025, .075), BLACK, 10),
    ])
    add(eye, 'eye_' + name, HEAD, head)
    # bigotes
    wh = []
    for k in (-1, 0, 1):
        a = Vector((side * .12, .98, 1.0 + k * .015))
        b = a + Vector((side * .3, -.02 + abs(k) * -.03, k * .07))
        wh.append(cone('w', a, b, .008, WHITE, 5))
    add(join('whiskers_' + name, wh), 'whiskers_' + name, HEAD, head)
    # orejas: pivote en la base para que el juego las pueda mover
    base = Vector((side * .2, .72, 1.33))
    tip = base + Vector((side * .1, -.02, .34))
    ear = cone('ear', base - Vector((0, 0, .08)), tip, .15, FUR)
    inner = cone('inner', base - Vector((0, -.045, .03)), tip - Vector((side * .02, -.03, .06)), .095, PINK)
    mesh = join('ear_' + name, [ear, inner])
    ob = add(mesh, 'ear_' + name, base, head)
    if side < 0:
        # la oreja mordida: se le resta una esfera en la punta
        cutter = add(sphere('mordisco', tip + Vector((-.05, 0, -.05)), (.11, .2, .11), FUR, 12), 'mordisco')
        mod = ob.modifiers.new('mordida', 'BOOLEAN')
        mod.operation = 'DIFFERENCE'
        mod.object = cutter
        mod.solver = 'EXACT'
        bpy.context.view_layer.update()
        cut = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        ob.modifiers.clear()
        old = ob.data
        ob.data = cut
        bpy.data.meshes.remove(old)
        bpy.data.objects.remove(cutter)
        for p in ob.data.polygons:
            p.use_smooth = True

# pañuelo rojo: anillo al cuello, punta triangular sobre el pecho y nudo en la nuca
NECK = (0, .5, .93)


def ring(bm):
    bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=.001)  # se reemplaza abajo
    bm.clear()
    seg, tube = 24, 10
    R, r = .235, .062
    rot = Matrix.Rotation(math.radians(-38), 4, 'X')
    verts = []
    for i in range(seg):
        a = i / seg * math.tau
        row = []
        for j in range(tube):
            b = j / tube * math.tau
            p = Vector(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * 1.25 * math.sin(b)))
            row.append(bm.verts.new(Vector(NECK) + rot @ p))
        verts.append(row)
    for i in range(seg):
        for j in range(tube):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % tube], verts[i][(j + 1) % tube]))


def flap(bm):
    # triángulo que cae sobre el pecho, con algo de grosor
    pts = [(-.2, .66, .86), (.2, .66, .86), (0, .74, .56)]
    front = [bm.verts.new(p) for p in pts]
    back = [bm.verts.new((x, y - .035, z)) for x, y, z in pts]
    bm.faces.new(front)
    bm.faces.new(back[::-1])
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((front[i], back[i], back[j], front[j]))


panuelo = add(join('panuelo', [from_bm('anillo', ring, RED), from_bm('punta', flap, RED)]), 'panuelo', NECK, body)
KNOT = (0, .36, 1.1)
knot = add(join('knot', [
    sphere('nudo', (0, .36, 1.08), (.07, .06, .06), RED, 10),
    cone('cabo1', (0, .35, 1.08), (-.13, .2, 1.0), .05, RED, 8),
    cone('cabo2', (0, .35, 1.08), (.12, .22, 1.02), .05, RED, 8),
]), 'knot', KNOT, panuelo)

# patas: orden que espera el juego -> delantera izq., delantera der., trasera der., trasera izq.
for name, sx, sy in (('FL', -1, 1), ('FR', 1, 1), ('BR', 1, -1), ('BL', -1, -1)):
    hip = Vector((sx * .18, sy * .42 + (.04 if sy > 0 else -.02), .5))
    leg = blob('leg', [
        ((hip.x, hip.y, .44), (.115, .125, .15)),
        ((hip.x, hip.y, .24), (.09, .095, .18)),
        ((hip.x, hip.y + .01, .09), (.085, .09, .1)),
    ], FUR, .035)
    paw = blob('paw', [((hip.x, hip.y + .05, .055), (.1, .13, .06))], PAW, .03)
    add(join('leg_' + name, [leg, paw]), 'leg_' + name, hip, body)

# cola en dos tramos con curva hacia arriba
T0, T1, T2 = Vector((0, -.6, .86)), Vector((0, -.86, 1.22)), Vector((0, -.78, 1.62))
tail = add(blob('tail', [
    ((T0 + (T1 - T0) * t)[:], (.075, .075, .075)) for t in (0, .25, .5, .75, 1)
], FUR, .03), 'tail', T0, body)
tip = add(blob('tail_tip', [
    ((T1 + (T2 - T1) * t)[:], (.072 - t * .012,) * 3) for t in (0, .25, .5, .75, 1)
], FUR, .03), 'tail_tip', T1, tail)

# ---------------- Vistas de control ----------------
tris = sum(len(p.vertices) - 2 for o in scene.objects if o.type == 'MESH' for p in o.data.polygons)
print(f'TINTO: {len([o for o in scene.objects if o.type == "MESH"])} mallas, {tris} triángulos')

path = os.path.join(OUT, 'tinto.glb')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                          export_animations=False, export_cameras=False, export_lights=False)
print('EXPORTADO', path, os.path.getsize(path), 'bytes')

# luz, piso y cámara para mirar el resultado
world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.75, .85, 1, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .9
scene.world = world
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.5
sun.rotation_euler = (math.radians(50), 0, math.radians(35))
col.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=12)
bpy.context.object.data.materials.append(material('piso', srgb(0xcbb89a), .9))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.data.lens = 55
col.objects.link(cam)
scene.camera = cam
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.device = 'CPU'
scene.render.resolution_x = scene.render.resolution_y = 640
for view, pos in (('frente', (1.9, 3.3, 1.5)), ('atras', (-1.2, -3.6, 2.0)), ('lado', (4.0, .1, 1.0))):
    cam.location = pos
    cam.rotation_euler = (Vector((0, .1, .8)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, f'tinto_{view}.png')
    bpy.ops.render.render(write_still=True)
    print('VISTA', scene.render.filepath)
