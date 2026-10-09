# Modela a Tinto en Blender y lo exporta a modelos/tinto.glb.
# Uso:  blender --background --python modelos/tinto.py
#
# El juego anima piezas rígidas por su pivote (no usa esqueleto), así que Tinto sale como un árbol de objetos:
#   body > torso, head (> ear_L, ear_R, ojos, bigotes), panuelo (> knot), tail (> tail_tip), leg_FL, leg_FR, leg_BR, leg_BL
# Blender: X = lateral, +Y = hacia adelante, Z = arriba. Al exportar, +Y pasa a ser -Z, que es hacia donde mira el gato en el juego.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

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


def sphere(name, center, radii, mat, seg=20, rot=None):
    m = Matrix.Translation(center) @ (rot.to_matrix().to_4x4() if rot else Matrix()) @ Matrix.Diagonal((*radii, 1))

    def build(bm):
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 + 2, radius=1, matrix=m)
    return from_bm(name, build, mat)


def cone(name, base, tip, r, mat, seg=14):
    """Cono de `base` a `tip`."""
    base, tip = Vector(base), Vector(tip)
    axis = tip - base
    rot = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()

    def build(bm):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r * .12, depth=axis.length,
                              matrix=Matrix.Translation((base + tip) / 2) @ rot)
    return from_bm(name, build, mat)


def ear_mesh(name, base, tip, r, mat, crop=None):
    """Oreja: cono aplanado de adelante hacia atrás. crop = (punto, normal) le corta la punta."""
    base, tip = Vector(base), Vector(tip)
    axis = tip - base
    rot = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()

    def build(bm):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=r, radius2=r * .1, depth=axis.length,
                              matrix=Matrix.Translation((base + tip) / 2) @ rot @ Matrix.Diagonal((1, .42, 1, 1)))
        if crop:
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=crop[0], plane_no=crop[1], clear_outer=True)
            bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    return from_bm(name, build, mat)


def join(name, meshes):
    """Une varias mallas en una, conservando el material de cada cara."""
    bm, mats = bmesh.new(), []
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
    out = bpy.data.meshes.new(name)
    bm.to_mesh(out)
    bm.free()
    for mt in mats:
        out.materials.append(mt)
    return out


# Las metabolas se inflan al fundirse, así que no se puede saber de antemano dónde queda la superficie.
# Por eso ojos, nariz, orejas y pañuelo no van en coordenadas fijas: se lanzan rayos desde adentro y se
# colocan donde el rayo toca la piel.
def tree_of(*meshes):
    bm = bmesh.new()
    for m in meshes:
        bm.from_mesh(m)
    t = BVHTree.FromBMesh(bm)
    bm.free()
    return t


def skin(tree, origin, direction):
    d = Vector(direction).normalized()
    return tree.ray_cast(Vector(origin), d)[0], d


# ---------------- Tinto ----------------
body = add(None, 'body')

torso_mesh = blob('torso', [
    ((0, .30, .74), (.31, .36, .31)),   # pecho
    ((0, -.05, .76), (.29, .42, .28)),  # lomo
    ((0, -.38, .72), (.30, .32, .30)),  # cadera
    ((0, .50, .90), (.17, .18, .18)),   # cuello
], FUR)
HC = Vector((0, .74, 1.14))  # centro del cráneo
skull = blob('craneo', [
    ((0, .74, 1.14), (.30, .27, .26)),
    ((-.15, .84, 1.06), (.13, .12, .12)),
    ((.15, .84, 1.06), (.13, .12, .12)),
    ((0, .92, 1.05), (.11, .10, .09)),
], FUR, .035)
head_tree = tree_of(skull)
all_tree = tree_of(skull, torso_mesh)

torso = add(torso_mesh, 'torso', parent=body)
HEAD = (0, .62, 1.0)
nose_at, nd = skin(head_tree, HC, (0, 1, -.28))
head = add(join('head', [skull, sphere('nariz', nose_at + nd * .01, (.045, .03, .032), PINK, 10)]), 'head', HEAD, body)

for side, name in ((-1, 'L'), (1, 'R')):
    # ojos amarillos grandes con pupila vertical, pegados a la piel
    at, d = skin(head_tree, HC, (side * .46, 1, .1))
    rot = Vector((0, 1, 0)).rotation_difference(d)
    eye = join('eye_' + name, [
        sphere('e', at - d * .012, (.085, .035, .1), EYE, 16, rot),
        sphere('p', at + d * .016, (.028, .014, .078), BLACK, 10, rot),
    ])
    add(eye, 'eye_' + name, HEAD, head)
    # bigotes
    at, d = skin(head_tree, HC, (side * .55, 1, -.32))
    wh = [cone('w', at - d * .02, at + Vector((side * .3, .02 - abs(k) * .03, k * .08)), .009, WHITE, 5) for k in (-1, 0, 1)]
    add(join('whiskers_' + name, wh), 'whiskers_' + name, HEAD, head)
    # orejas: triángulo aplanado con el pivote en la base; la izquierda está mordida (punta cortada en diagonal)
    at, d = skin(head_tree, HC, (side * .62, -.1, 1))
    base = at - d * .06
    tip = base + Vector((side * .1, -.02, .36))
    crop = None
    if side < 0:
        crop = (base + (tip - base) * .6, ((tip - base).normalized() + Vector((-.8, 0, 0))).normalized())
    mesh = join('ear_' + name, [
        ear_mesh('ear', base, tip, .18, FUR, crop),
        ear_mesh('inner', base + Vector((0, .035, .05)), tip + Vector((0, .03, -.07)), .115, PINK, crop),
    ])
    add(mesh, 'ear_' + name, base, head)

# pañuelo rojo: un aro que rodea el cuello siguiendo la piel, punta sobre el pecho y nudo con dos cabos en la nuca
NECK = Vector((0, .54, .95))
N = Vector((0, .74, .67)).normalized()            # eje del cuello
U, V = Vector((1, 0, 0)), Vector((0, .67, -.74))  # V apunta al frente y abajo; -V a la nuca
SEG, TUBE, R = 28, 10, .085
loop = []
for i in range(SEG):
    a = i / SEG * math.tau
    d = U * math.cos(a) + V * math.sin(a)
    loop.append((all_tree.ray_cast(NECK, d)[0] + d * .06, d))


def ring(bm):
    rows = [[bm.verts.new(c + d * (R * math.cos(b)) + N * (R * 1.3 * math.sin(b)))
             for b in (j / TUBE * math.tau for j in range(TUBE))] for c, d in loop]
    for i in range(SEG):
        for j in range(TUBE):
            bm.faces.new((rows[i][j], rows[(i + 1) % SEG][j], rows[(i + 1) % SEG][(j + 1) % TUBE], rows[i][(j + 1) % TUBE]))


chest = skin(all_tree, NECK + Vector((0, -.14, -.42)), (0, 1, -.1))[0]


def flap(bm):
    pts = [loop[SEG // 4 - 6][0], loop[SEG // 4 + 6][0], chest + Vector((0, .05, 0))]
    front = [bm.verts.new(q + Vector((0, .03, 0))) for q in pts]
    back = [bm.verts.new(q - Vector((0, .03, 0))) for q in pts]
    bm.faces.new(front)
    bm.faces.new(back[::-1])
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((front[i], back[i], back[j], front[j]))


panuelo = add(join('panuelo', [from_bm('anillo', ring, RED), from_bm('punta', flap, RED)]), 'panuelo', NECK, body)
nape = loop[3 * SEG // 4][0] + loop[3 * SEG // 4][1] * .03
ends = [all_tree.ray_cast(Vector((sx * .13, nape.y - .24, 2)), Vector((0, 0, -1)))[0] + Vector((0, 0, .05)) for sx in (-1, 1)]
knot = add(join('knot', [sphere('nudo', nape, (.1, .09, .09), RED, 12)] +
                [cone('cabo', nape, e, .085, RED, 8) for e in ends]), 'knot', nape, panuelo)

# patas: orden que espera el juego -> delantera izq., delantera der., trasera der., trasera izq.
for name, sx, sy in (('FL', -1, 1), ('FR', 1, 1), ('BR', 1, -1), ('BL', -1, -1)):
    hip = Vector((sx * .18, sy * .42 + (.04 if sy > 0 else -.02), .5))
    leg = blob('leg', [
        ((hip.x, hip.y, .44), (.105, .115, .15)),
        ((hip.x, hip.y, .24), (.08, .085, .18)),
        ((hip.x, hip.y + .01, .09), (.075, .08, .1)),
    ], FUR, .035)
    paw = blob('paw', [((hip.x, hip.y + .05, .055), (.1, .13, .06))], PAW, .03)
    add(join('leg_' + name, [leg, paw]), 'leg_' + name, hip, body)

# cola en dos tramos con curva hacia arriba
T0, T1, T2 = Vector((0, -.6, .86)), Vector((0, -.9, 1.2)), Vector((0, -.76, 1.6))
tail = add(blob('tail', [
    ((T0 + (T1 - T0) * t)[:], (.072, .072, .072)) for t in (0, .25, .5, .75, 1)
], FUR, .03), 'tail', T0, body)
tip = add(blob('tail_tip', [
    ((T1 + (T2 - T1) * t)[:], (.07 - t * .012,) * 3) for t in (0, .25, .5, .75, 1)
], FUR, .03), 'tail_tip', T1, tail)

# ---------------- Exportar y sacar vistas de control ----------------
tris = sum(len(p.vertices) - 2 for o in scene.objects if o.type == 'MESH' for p in o.data.polygons)
print(f'TINTO: {len([o for o in scene.objects if o.type == "MESH"])} mallas, {tris} triángulos')

path = os.path.join(OUT, 'tinto.glb')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                          export_animations=False, export_cameras=False, export_lights=False)
print('EXPORTADO', path, os.path.getsize(path), 'bytes')

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
