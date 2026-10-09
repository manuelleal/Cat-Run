# Tinto v4: mismo gato y mismo contrato de nodos que modelos/tinto.py, con textura horneada, ojos con degradado,
# pañuelo de tela y silueta retocada. Exporta modelos/tinto_v4.glb y las vistas tinto_v4_<vista>.png.
# Uso:  blender --background --python modelos/tinto_v4.py            (todo: modelo, horneado, glb y vistas)
#       blender --background --python modelos/tinto_v4.py -- rapido  (sin vistas; para revisar solo el glb)
#
# Árbol de objetos (el juego anima piezas rígidas por su pivote; no hay esqueleto):
#   body > torso, head (> ear_L, ear_R, eye_L, eye_R, whiskers), panuelo (> knot), tail (> tail_tip),
#          leg_FL, leg_FR, leg_BR, leg_BL
# Blender: X = lateral (izquierda del gato = -X), +Y = adelante, Z = arriba. Al exportar, +Y pasa a -Z.
#
# Flujo: 1) formas con metabolas -> remallado por vóxeles + suavizado + decimado  2) piezas finas (orejas, pañuelo,
# ojos) con bmesh  3) materiales procedurales SOLO como fuente  4) UV automático de todas las piezas a un atlas
# 5) horneado a 3 imágenes (color, normal, rugosidad)  6) un único material con esas imágenes  7) glb  8) vistas.
import bpy, bmesh, math, os, sys, json, struct, time
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

NOMBRE = 'tinto_v4'
OUT = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(OUT, 'texturas')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ATLAS = 1024
T0_ = time.time()

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection


def srgb(h):  # 0xRRGGBB -> lineal (Blender guarda los colores de material y de vértice en lineal)
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


# ====================== materiales FUENTE (procedurales; no se exportan, solo se hornean) ======================
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes['Principled BSDF']


def node(nt, typ, **inputs):
    n = nt.nodes.new(typ)
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def maprange(nt, src, a, b, c, d, smooth=True):
    n = node(nt, 'ShaderNodeMapRange')
    n.interpolation_type = 'SMOOTHSTEP' if smooth else 'LINEAR'
    for i, v in zip((1, 2, 3, 4), (a, b, c, d)):
        n.inputs[i].default_value = v
    nt.links.new(src, n.inputs[0])
    return n.outputs[0]


def mix(nt, fac, a, b, mode='MIX'):
    """a y b pueden ser un color (tupla) o una salida de nodo; fac un número o una salida."""
    n = nt.nodes.new('ShaderNodeMixRGB')
    n.blend_type = mode
    for key, v in (('Fac', fac), ('Color1', a), ('Color2', b)):
        if isinstance(v, (int, float)):
            n.inputs[key].default_value = v
        elif isinstance(v, tuple):
            n.inputs[key].default_value = (*v, 1)
        else:
            nt.links.new(v, n.inputs[key])
    return n.outputs['Color']


def spot(nt, pos, center, radii, inner=.55):
    """Máscara 1 dentro de un elipsoide (en coordenadas del mundo) que cae suave a 0 en su borde."""
    sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'
    nt.links.new(pos, sub.inputs[0]); sub.inputs[1].default_value = center
    div = nt.nodes.new('ShaderNodeVectorMath'); div.operation = 'DIVIDE'
    nt.links.new(sub.outputs[0], div.inputs[0]); div.inputs[1].default_value = radii
    ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'
    nt.links.new(div.outputs[0], ln.inputs[0])
    return maprange(nt, ln.outputs['Value'], inner, 1, 1, 0)


C_OSCURO, C_MEDIO, C_MECHON = srgb(0x1d1d25), srgb(0x2c2c37), srgb(0x3b3b48)
C_PECHO, C_PATA, C_HOCICO = srgb(0x55505a), srgb(0x464651), srgb(0x3d3b45)


def fur(name, stretch, spots=()):
    """Pelaje negro: manchas grandes de tono + mechones finos estirados en la dirección del pelo.
    spots = [(centro, radios, color, cantidad)] aclara zonas (pecho, panza, patas, hocico)."""
    m, nt, b = new_mat(name)
    pos = nt.nodes.new('ShaderNodeNewGeometry').outputs['Position']
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = stretch
    nt.links.new(pos, mp.inputs['Vector'])
    hair = node(nt, 'ShaderNodeTexNoise', Scale=1, Detail=3, Roughness=.65)
    nt.links.new(mp.outputs[0], hair.inputs['Vector'])
    big = node(nt, 'ShaderNodeTexNoise', Scale=2.4, Detail=1)
    nt.links.new(pos, big.inputs['Vector'])
    h = maprange(nt, hair.outputs['Fac'], .32, .68, 0, 1)
    c = mix(nt, maprange(nt, big.outputs['Fac'], .35, .65, 0, 1), C_OSCURO, C_MEDIO)
    for center, radii, color, amount in spots:
        mk = nt.nodes.new('ShaderNodeMath'); mk.operation = 'MULTIPLY'
        nt.links.new(spot(nt, pos, center, radii), mk.inputs[0]); mk.inputs[1].default_value = amount
        c = mix(nt, mk.outputs[0], c, color)
    hm = nt.nodes.new('ShaderNodeMath'); hm.operation = 'MULTIPLY'
    nt.links.new(h, hm.inputs[0]); hm.inputs[1].default_value = .55
    c = mix(nt, hm.outputs[0], c, C_MECHON, 'SCREEN')
    nt.links.new(c, b.inputs['Base Color'])
    nt.links.new(maprange(nt, hair.outputs['Fac'], .3, .7, .40, .78), b.inputs['Roughness'])
    bump = node(nt, 'ShaderNodeBump', Strength=.45, Distance=.02)
    nt.links.new(hair.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def skin_mat(name, color, color2, rough, scale=14):
    """Piel lisa (nariz, almohadillas, interior de oreja): dos tonos mezclados con ruido suave."""
    m, nt, b = new_mat(name)
    n = node(nt, 'ShaderNodeTexNoise', Scale=scale, Detail=2)
    nt.links.new(mix(nt, maprange(nt, n.outputs['Fac'], .3, .7, 0, 1), color, color2), b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    bump = node(nt, 'ShaderNodeBump', Strength=.15, Distance=.01)
    nt.links.new(n.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def cloth():
    """Tela del pañuelo: rojo con pliegues de tono, lunares crema, ribete (atributo 'borde') y trama en relieve."""
    m, nt, b = new_mat('src_panuelo')
    pos = nt.nodes.new('ShaderNodeNewGeometry').outputs['Position']
    big = node(nt, 'ShaderNodeTexNoise', Scale=7, Detail=1)
    nt.links.new(pos, big.inputs['Vector'])
    c = mix(nt, maprange(nt, big.outputs['Fac'], .3, .7, 0, 1), srgb(0xa80f1e), srgb(0xe02234))
    vor = node(nt, 'ShaderNodeTexVoronoi', Scale=13)
    nt.links.new(pos, vor.inputs['Vector'])
    c = mix(nt, maprange(nt, vor.outputs['Distance'], .16, .21, 1, 0), c, srgb(0xf4ead2))
    at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'borde'
    lo = maprange(nt, at.outputs['Fac'], .018, .026, 0, 1)
    hi = maprange(nt, at.outputs['Fac'], .040, .048, 1, 0)
    band = nt.nodes.new('ShaderNodeMath'); band.operation = 'MULTIPLY'
    nt.links.new(lo, band.inputs[0]); nt.links.new(hi, band.inputs[1])
    c = mix(nt, band.outputs[0], c, srgb(0xf4ead2))
    nt.links.new(c, b.inputs['Base Color'])
    waves = []
    for d in ('X', 'Z'):
        w = node(nt, 'ShaderNodeTexWave', Scale=55, Distortion=.6)
        w.wave_type, w.bands_direction = 'BANDS', d
        nt.links.new(pos, w.inputs['Vector'])
        waves.append(w.outputs['Fac'])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'
    nt.links.new(waves[0], mx.inputs[0]); nt.links.new(waves[1], mx.inputs[1])
    nt.links.new(maprange(nt, mx.outputs[0], .2, 1, .92, .70), b.inputs['Roughness'])
    bump = node(nt, 'ShaderNodeBump', Strength=.5, Distance=.012)
    nt.links.new(mx.outputs[0], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


FUR_TORSO = fur('src_pelo_torso', (55, 7, 55), [
    ((0, .50, .62), (.30, .26, .36), C_PECHO, .85),    # pechera más clara
    ((0, -.02, .42), (.20, .52, .16), C_PECHO, .55),   # panza
])
FUR_HEAD = fur('src_pelo_cabeza', (38, 38, 38), [
    ((0, .98, 1.02), (.17, .12, .11), C_HOCICO, .8),   # hocico apenas más claro, para que se lea la cara
])
FUR_LEG = fur('src_pelo_pata', (60, 60, 7), [((0, 0, 0), (9, 9, .15), C_PATA, .9)])  # "medias": todo lo que esté bajo z≈.15
FUR_TAIL = fur('src_pelo_cola', (45, 14, 14))
PINK = skin_mat('src_oreja', srgb(0xe58aa0), srgb(0xc96a84), .65)
NOSE = skin_mat('src_nariz', srgb(0xe07f96), srgb(0xc9607c), .32, 40)
PAD = skin_mat('src_almohadilla', srgb(0xd98a9c), srgb(0xb86478), .5, 60)
RED = cloth()
ATLAS_MATS = [FUR_TORSO, FUR_HEAD, FUR_LEG, FUR_TAIL, PINK, NOSE, PAD, RED]


# materiales que se exportan tal cual (sin textura)
def flat(name, color, rough):
    m, nt, b = new_mat(name)
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    m.use_backface_culling = True
    return m


WHITE = flat('bigote', srgb(0xf2f2f2), .5)
EYE, nt_, b_ = new_mat('ojo')   # el color viene entero del atributo de color por vértice 'Col'
ca_ = nt_.nodes.new('ShaderNodeVertexColor'); ca_.layer_name = 'Col'
nt_.links.new(ca_.outputs['Color'], b_.inputs['Base Color'])
b_.inputs['Roughness'].default_value = .12
EYE.use_backface_culling = True


# ====================== geometría ======================
def add(mesh_or_none, name, pivot=(0, 0, 0), parent=None):
    """Crea un objeto cuyo origen es `pivot` (coordenadas del mundo) y lo cuelga de `parent`."""
    ob = bpy.data.objects.new(name, mesh_or_none)
    col.objects.link(ob)
    pivot = Vector(pivot)
    if mesh_or_none:
        mesh_or_none.transform(Matrix.Translation(-pivot))
        mesh_or_none.name = name
    ob['pivot'] = pivot[:]
    ob.location = pivot - (Vector(parent['pivot']) if parent else Vector())
    ob.parent = parent
    return ob


def tris_of(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def shade(mesh, mats):
    mesh.materials.clear()
    for mt in (mats if isinstance(mats, (list, tuple)) else [mats]):
        mesh.materials.append(mt)
    mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
    return mesh


def blob(name, balls, mat, tris, res=.03, voxel=.022, smooth=6):
    """Metabolas (funden elipsoides en una forma orgánica) -> remallado por vóxeles (malla pareja) -> suavizado
    -> decimado hasta `tris` triángulos. Las metabolas crudas dejan triángulos disparejos y escalones."""
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
    raw = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob)
    bpy.data.metaballs.remove(mb)
    tmp = bpy.data.objects.new(name + '_tmp', raw)
    col.objects.link(tmp)
    if voxel:
        r = tmp.modifiers.new('remalla', 'REMESH')
        r.mode, r.voxel_size = 'VOXEL', voxel
    s = tmp.modifiers.new('suaviza', 'SMOOTH')
    s.factor, s.iterations = .5, smooth
    bpy.context.view_layer.update()
    n = tris_of(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()).data)
    d = tmp.modifiers.new('decima', 'DECIMATE')
    d.ratio = min(1, tris / max(n, 1))
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp)
    bpy.data.meshes.remove(raw)
    mesh.name = name
    return shade(mesh, mat)


def from_bm(name, build, mats):
    bm = bmesh.new()
    build(bm)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return shade(mesh, mats)


def sphere(name, center, radii, mat, seg=16, rot=None):
    m = Matrix.Translation(center) @ (rot.to_matrix().to_4x4() if rot else Matrix()) @ Matrix.Diagonal((*radii, 1))

    def build(bm):
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(4, seg // 2), radius=1, matrix=m)
    return from_bm(name, build, mat)


def cone(name, base, tip, r, mat, seg=5):
    base, tip = Vector(base), Vector(tip)
    axis = tip - base
    rot = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()

    def build(bm):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r * .12, depth=axis.length,
                              matrix=Matrix.Translation((base + tip) / 2) @ rot)
    return from_bm(name, build, mat)


def sheet(bm, front, back, mat_fn=None, borde=None):
    """Lámina con grosor a partir de dos rejillas [fila][columna] de puntos (cara de adelante y de atrás).
    mat_fn(i, j) -> índice de material de cada cuadro de adelante. borde[i][j] -> valor del atributo 'borde'."""
    R, C = len(front), len(front[0])
    lay = bm.verts.layers.float.get('borde') or bm.verts.layers.float.new('borde')
    vf = [[bm.verts.new(p) for p in row] for row in front]
    vb = [[bm.verts.new(p) for p in row] for row in back]
    if borde:
        for i in range(R):
            for j in range(C):
                vf[i][j][lay] = vb[i][j][lay] = borde[i][j]

    def quad(a, b, c, d, mi=0):
        try:
            f = bm.faces.new((a, b, c, d))
            f.material_index = mi
        except ValueError:
            pass
    for i in range(R - 1):
        for j in range(C - 1):
            quad(vf[i][j], vf[i][j + 1], vf[i + 1][j + 1], vf[i + 1][j], mat_fn(i, j) if mat_fn else 0)
            quad(vb[i][j], vb[i + 1][j], vb[i + 1][j + 1], vb[i][j + 1])
        quad(vf[i][0], vf[i + 1][0], vb[i + 1][0], vb[i][0])
        quad(vf[i][C - 1], vb[i][C - 1], vb[i + 1][C - 1], vf[i + 1][C - 1])
    for j in range(C - 1):
        quad(vf[0][j], vb[0][j], vb[0][j + 1], vf[0][j + 1])
        quad(vf[R - 1][j], vf[R - 1][j + 1], vb[R - 1][j + 1], vb[R - 1][j])


def join(name, meshes):
    """Une varias mallas en una, conservando el material de cada cara y los atributos."""
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


# Tras fundir y suavizar no se sabe de antemano dónde queda la superficie: ojos, nariz, orejas, pañuelo y
# almohadillas se colocan lanzando rayos contra la malla ya terminada.
def tree_of(*meshes):
    bm = bmesh.new()
    for m in meshes:
        bm.from_mesh(m)
    t = BVHTree.FromBMesh(bm)
    bm.free()
    return t


def skin(tree, origin, direction):
    d = Vector(direction).normalized()
    hit = tree.ray_cast(Vector(origin), d)[0]
    if hit is None:
        raise RuntimeError(f'rayo sin impacto desde {tuple(origin)} hacia {tuple(d)}')
    return hit, d


# ---------------- Tinto ----------------
body = add(None, 'body')

torso_mesh = blob('torso', [
    ((0, .30, .73), (.30, .33, .32)),    # pecho hondo
    ((0, .20, .90), (.21, .22, .15)),    # cruz (paletas)
    ((0, -.04, .77), (.275, .40, .265)), # costillar
    ((0, -.24, .79), (.25, .28, .24)),   # cintura recogida
    ((0, -.42, .74), (.295, .30, .30)),  # grupa
    ((0, .50, .91), (.165, .19, .19)),   # cuello
], FUR_TORSO, 2600)
HC = Vector((0, .74, 1.14))  # centro del cráneo
skull = blob('craneo', [
    ((0, .74, 1.14), (.31, .27, .25)),
    ((-.16, .83, 1.06), (.14, .12, .12)),    # cachetes
    ((.16, .83, 1.06), (.14, .12, .12)),
    ((-.27, .72, 1.04), (.085, .09, .075)),  # mechón de mejilla
    ((.27, .72, 1.04), (.085, .09, .075)),
    ((0, .93, 1.045), (.115, .10, .085)),    # hocico
    ((-.055, .975, 1.03), (.065, .06, .052)),
    ((.055, .975, 1.03), (.065, .06, .052)),
    ((0, .90, .975), (.07, .07, .05)),       # mentón
], FUR_HEAD, 2600, res=.025, voxel=.018)
head_tree = tree_of(skull)
all_tree = tree_of(skull, torso_mesh)

torso = add(torso_mesh, 'torso', parent=body)
HEAD = (0, .62, 1.0)
head_parts = [skull]
nose_at, nd = skin(head_tree, HC, (0, 1, -.30))
head_parts.append(sphere('nariz', nose_at + nd * .004, (.046, .028, .03), NOSE, 12))

eyes = []
for side, name in ((-1, 'L'), (1, 'R')):
    # --- ojo: casquete con degradado por vértice (iris), pupila y dos brillos; todo en una malla y un material ---
    at, d = skin(head_tree, HC, (side * .47, 1, .12))
    rot = Vector((0, 1, 0)).rotation_difference(d).to_matrix().to_4x4()
    RX, RY, RZ = .098, .04, .108
    M = Matrix.Translation(at - d * .014) @ rot @ Matrix.Diagonal((RX, RY, RZ, 1))

    def eye_build(bm, M=M):
        lay = bm.loops.layers.float_color.new('Col')
        polo_y = Matrix.Rotation(-math.pi / 2, 4, 'X')  # polo de la esfera hacia +Y: los anillos quedan concéntricos

        def ball(center, radii, color_of, seg, keep=-2):
            start = len(bm.verts)
            bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1, matrix=polo_y)
            bm.verts.ensure_lookup_table()
            new = bm.verts[start:]
            bmesh.ops.delete(bm, geom=[v for v in new if v.co.y < keep], context='VERTS')
            bm.verts.ensure_lookup_table()
            new = bm.verts[start:]
            for v in new:
                c = color_of(v.co)
                for lp in v.link_loops:
                    lp[lay] = (*c, 1)
            bmesh.ops.transform(bm, matrix=M @ Matrix.Translation(center) @ Matrix.Diagonal((*radii, 1)), verts=new)

        def iris(co):
            r = math.hypot(co.x, co.z)
            stops = [(0, srgb(0xfff07a)), (.5, srgb(0xffd23f)), (.82, srgb(0xe8930f)), (.93, srgb(0x6b3d08)), (1.01, srgb(0x1c1206))]
            for (r0, c0), (r1, c1) in zip(stops, stops[1:]):
                if r <= r1:
                    t = (r - r0) / (r1 - r0)
                    c = [a + (b - a) * t for a, b in zip(c0, c1)]
                    break
            k = 1 - .45 * max(0, min(1, (co.z - .15) / .7))  # sombra del párpado: más oscuro arriba
            return [v * k for v in c]
        ball((0, 0, 0), (1, 1, 1), iris, 24, keep=-.05)
        ball((0, .74, -.02), (.30, .30, .74), lambda co: srgb(0x050507), 14)          # pupila vertical
        ball((.30, .86, .40), (.20, .16, .22), lambda co: (1, 1, 1), 10)              # brillo grande
        ball((-.24, .92, -.34), (.09, .08, .10), lambda co: (1, 1, 1), 8)             # brillo chico
    eyes.append((from_bm('eye_' + name, eye_build, EYE), name))

    # párpado: cáscara sobre el tercio de arriba del ojo, caída hacia la nariz (mirada descarada y tranquila)
    def lid_build(bm, M=M, side=side):
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=10, radius=1,
                                  matrix=M @ Matrix.Diagonal((1.13, 1.45, 1.13, 1)))
        n = (M.to_3x3() @ Vector((-side * .32 / RX, 0, 1 / RZ))).normalized()
        co = M @ Vector((0, 0, .36))
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=n, clear_inner=True)
    head_parts.append(from_bm('parpado', lid_build, FUR_HEAD))

head = add(join('head', head_parts), 'head', HEAD, body)
for mesh, name in eyes:
    add(mesh, 'eye_' + name, HEAD, head)

# bigotes: una sola malla para los dos lados
wh = []
for side in (-1, 1):
    at, d = skin(head_tree, HC, (side * .5, 1, -.36))
    wh += [cone('w', at - d * .02, at + Vector((side * .3, .03 - abs(k) * .03, k * .085 + .01)), .008, WHITE) for k in (-1, 0, 1)]
add(join('whiskers', wh), 'whiskers', HEAD, head)

# orejas: lámina curva con grosor, borde de pelo e interior rosado; pivote en la base. La izquierda (-X) está mordida.
for side, name in ((-1, 'L'), (1, 'R')):
    at, d = skin(head_tree, HC, (side * .62, -.1, 1))
    base = at - d * .07
    tip = base + Vector((side * .11, -.03, .38))
    A = (tip - base).normalized()
    Wd = (Vector((1, 0, 0)) - A * A.x).normalized()
    F = A.cross(Wd)  # hacia adelante
    H, W0, ROWS, COLS = (tip - base).length, .175, 17, 9
    wide = lambda v: W0 * (1 - v ** 1.7)
    front, back = [], []
    for i in range(ROWS):
        v = i / (ROWS - 1)
        wl = wr = wide(v)
        if side < 0:  # mordisco: media luna que le falta al borde de afuera
            wl -= .62 * wide(.62) * math.sqrt(max(0, 1 - ((v - .62) / .17) ** 2))
        fr, bk = [], []
        for j in range(COLS):
            u = j / (COLS - 1) * 2 - 1
            p = base + A * (H * v) + Wd * (u * (wl if u < 0 else wr)) + F * (-.05 * (1 - u * u) * (1 - v) + .03 * v * v)
            fr.append(p)
            bk.append(p - F * (.012 + .05 * (1 - u * u * .6) * (1 - v * .75)))
        front.append(fr)
        back.append(bk)
    pink = lambda i, j: 1 if 1 <= j <= COLS - 3 and 1 <= i <= ROWS - 5 else 0
    mesh = from_bm('ear_' + name, lambda bm: sheet(bm, front, back, pink), [FUR_HEAD, PINK])
    add(mesh, 'ear_' + name, base, head)

# pañuelo: banda de tela alrededor del cuello siguiendo la piel + pico sobre el pecho + nudo con dos cabos en la nuca
NECK = Vector((0, .54, .95))
N = Vector((0, .74, .67)).normalized()            # eje del cuello
U, V = Vector((1, 0, 0)), Vector((0, .67, -.74))  # V apunta al frente y abajo; -V a la nuca
SEG, TUBE = 36, 10


def neck_at(a, lift=.045):
    d = U * math.cos(a) + V * math.sin(a)
    return all_tree.ray_cast(NECK, d)[0] + d * lift, d


loop = [neck_at(i / SEG * math.tau) for i in range(SEG)]


def ring(bm):
    lay = bm.verts.layers.float.new('borde')
    rows = []
    for i, (c, d) in enumerate(loop):
        fold = 1 + .18 * math.sin(i / SEG * math.tau * 7)  # arrugas: el grosor ondula a lo largo de la banda
        row = []
        for j in range(TUBE):
            b = j / TUBE * math.tau
            v = bm.verts.new(c + d * (.042 * fold * math.cos(b)) + N * (.095 * math.sin(b)))
            v[lay] = 1
            row.append(v)
        rows.append(row)
    for i in range(SEG):
        for j in range(TUBE):
            bm.faces.new((rows[i][j], rows[(i + 1) % SEG][j], rows[(i + 1) % SEG][(j + 1) % TUBE], rows[i][(j + 1) % TUBE]))


chest_tip = skin(all_tree, Vector((0, 1.6, .62)), (0, -1, 0))[0]
CIN = Vector((0, .30, .78))  # punto interior desde el que se proyecta el pico sobre el pecho


def flap(bm):
    ROWS, COLS, SPAN = 9, 11, math.radians(82)
    front, back, borde = [], [], []
    for i in range(ROWS):
        v = i / (ROWS - 1)
        fr, bk, bo = [], [], []
        for j in range(COLS):
            u = j / (COLS - 1) * 2 - 1
            top = neck_at(math.pi / 2 + u * SPAN, .0)[0]
            p = top.lerp(chest_tip, v)
            d = (p - CIN).normalized()
            hit = all_tree.ray_cast(CIN + d * 2, -d)[0] or p
            lift = .030 + .014 * math.sin(u * math.pi * 2.5) * v + .02 * v * v  # pliegues y la punta algo despegada
            fr.append(hit + d * lift)
            bk.append(hit + d * (lift - .022))
            bo.append((1 - abs(u)) * (1 - v) * .55 + (1 - v) * .0)
        front.append(fr); back.append(bk); borde.append(bo)
    sheet(bm, front, back, borde=borde)


panuelo = add(join('panuelo', [from_bm('anillo', ring, RED), from_bm('pico', flap, RED)]), 'panuelo', NECK, body)

nape = loop[3 * SEG // 4][0] + loop[3 * SEG // 4][1] * .035
knot_parts = [sphere('nudo', nape, (.085, .075, .07), RED, 12)]
for sx in (-1, 1):  # cabos: hojas de tela que salen del nudo hacia atrás y afuera
    end = nape + Vector((sx * .21, -.20, .03))
    axis = end - nape
    L = axis.length
    T = axis.normalized()
    S = T.cross(Vector((0, 0, 1))).normalized()
    Nn = S.cross(T)

    def tail_end(bm, sx=sx, T=T, S=S, Nn=Nn, L=L):
        ROWS, COLS = 8, 5
        front, back, borde = [], [], []
        for i in range(ROWS):
            t = i / (ROWS - 1)
            w = .028 + .075 * math.sin(t * math.pi * .62)
            fr, bk, bo = [], [], []
            for j in range(COLS):
                u = j / (COLS - 1) * 2 - 1
                notch = .05 * (1 - abs(u)) if i == ROWS - 1 else 0   # punta en cola de golondrina
                p = nape + T * (t * L - notch) + S * (u * w) + Nn * (.045 * math.sin(t * math.pi) + .012 * math.cos(u * 3 + sx))
                fr.append(p); bk.append(p - Nn * .02)
                bo.append(min((1 - abs(u)) * w, (1 - t) * L + .03))
            front.append(fr); back.append(bk); borde.append(bo)
        sheet(bm, front, back, borde=borde)
    knot_parts.append(from_bm('cabo', tail_end, RED))
knot = add(join('knot', knot_parts), 'knot', nape, panuelo)

# patas: orden que espera el juego -> delantera izq., delantera der., trasera der., trasera izq.
for name, sx, sy in (('FL', -1, 1), ('FR', 1, 1), ('BR', 1, -1), ('BL', -1, -1)):
    hip = Vector((sx * .18, sy * .42 + (.04 if sy > 0 else -.02), .5))
    x, y = hip.x, hip.y
    if sy > 0:   # delantera: recta, con codo apenas marcado
        balls = [((x, y, .44), (.105, .12, .16)), ((x, y - .01, .25), (.078, .085, .17)), ((x, y + .01, .10), (.072, .08, .10))]
    else:        # trasera: muslo ancho, corvejón hacia atrás
        balls = [((x * 1.03, y + .03, .46), (.125, .17, .19)), ((x, y - .01, .27), (.082, .095, .15)),
                 ((x, y - .045, .14), (.07, .075, .11))]
    balls += [((x, y + .055, .056), (.098, .125, .058))]
    balls += [((x + k * .052, y + .15 - abs(k) * .012, .045), (.042, .05, .042)) for k in (-1, 0, 1)]  # dedos
    leg = blob('leg', balls, FUR_LEG, 900, res=.025, voxel=.016, smooth=4)
    lt = tree_of(leg)
    pads = []
    for (dx, dy), (rx, ry) in (((0, .04), (.05, .042)), ((-.048, .125), (.021, .026)), ((0, .145), (.021, .026)), ((.048, .125), (.021, .026))):
        hit = lt.ray_cast(Vector((x + dx, y + dy, -1)), Vector((0, 0, 1)))[0]
        if hit:
            pads.append(sphere('pad', hit + Vector((0, 0, .004)), (rx, ry, .012), PAD, 8))
    add(join('leg_' + name, [leg] + pads), 'leg_' + name, hip, body)


# cola en dos tramos curvos que se afinan hacia la punta
def bez(a, b, c, t):
    return a.lerp(b, t).lerp(b.lerp(c, t), t)


T0, T1, T2 = Vector((0, -.6, .86)), Vector((0, -.9, 1.2)), Vector((0, -.74, 1.62))
tail = add(blob('tail', [
    (bez(T0, Vector((0, -.86, .92)), T1, t)[:], (.082 - t * .012,) * 3) for t in (0, .2, .4, .6, .8, 1)
], FUR_TAIL, 500, voxel=.018), 'tail', T0, body)
tip = add(blob('tail_tip', [
    (bez(T1, Vector((0, -.97, 1.47)), T2, t)[:], (.07 - t * .012,) * 3) for t in (0, .2, .4, .6, .8, 1)
], FUR_TAIL, 450, voxel=.018), 'tail_tip', T1, tail)

# ====================== UV automático + horneado ======================
atlas_obs = [o for o in scene.objects if o.type == 'MESH' and any(m in ATLAS_MATS for m in o.data.materials)]
bpy.ops.object.select_all(action='DESELECT')
for o in atlas_obs:
    o.select_set(True)
bpy.context.view_layer.objects.active = atlas_obs[0]
bpy.ops.object.mode_set(mode='EDIT')          # varios objetos en modo edición a la vez: comparten un solo atlas
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.006)
bpy.ops.object.mode_set(mode='OBJECT')

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 4
os.makedirs(TEX, exist_ok=True)
images = {}
for kind, cs, size in (('color', 'sRGB', ATLAS), ('normal', 'Non-Color', ATLAS), ('rugosidad', 'Non-Color', ATLAS // 2)):
    im = bpy.data.images.new(f'{NOMBRE}_{kind}', size, size, alpha=False)
    im.colorspace_settings.name = cs
    images[kind] = im
for kind, typ, kw in (('color', 'DIFFUSE', dict(pass_filter={'COLOR'})), ('normal', 'NORMAL', {}), ('rugosidad', 'ROUGHNESS', {})):
    for m in ATLAS_MATS:  # el horneado escribe en el nodo de imagen ACTIVO de cada material
        n = m.node_tree.nodes.get('DESTINO') or m.node_tree.nodes.new('ShaderNodeTexImage')
        n.name, n.image = 'DESTINO', images[kind]
        m.node_tree.nodes.active = n
    t = time.time()
    bpy.ops.object.bake(type=typ, margin=6, use_clear=True, **kw)
    images[kind].filepath_raw = os.path.join(TEX, f'{NOMBRE}_{kind}.png')
    images[kind].file_format = 'PNG'
    images[kind].save()
    print(f'HORNEADO {kind}: {time.time() - t:.1f} s')

# material final: lo único que entiende el exportador glTF es Imagen -> Principled (color, rugosidad en el canal
# verde, normal por un nodo Normal Map). Todas las piezas del atlas comparten este material.
FIN, nt, b = new_mat('tinto')
FIN.use_backface_culling = True


def tex(kind):
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = images[kind]
    return n.outputs['Color']


nt.links.new(tex('color'), b.inputs['Base Color'])
sep = nt.nodes.new('ShaderNodeSeparateColor')
nt.links.new(tex('rugosidad'), sep.inputs['Color'])
nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
nm = nt.nodes.new('ShaderNodeNormalMap')
nt.links.new(tex('normal'), nm.inputs['Color'])
nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
b.inputs['Metallic'].default_value = 0
for o in atlas_obs:
    shade(o.data, FIN)
    o.data.polygons.foreach_set('material_index', [0] * len(o.data.polygons))
for m in ATLAS_MATS:
    bpy.data.materials.remove(m)

# ====================== exportar ======================
meshes = [o for o in scene.objects if o.type == 'MESH']
print(f'TINTO v4: {len(meshes)} mallas, {sum(tris_of(o.data) for o in meshes)} triángulos')
for o in meshes:
    print(f'   {o.name:10s} {tris_of(o.data):5d} tri')
path = os.path.join(OUT, NOMBRE + '.glb')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                          export_image_format='JPEG', export_image_quality=88, export_extras=False,
                          export_animations=False, export_cameras=False, export_lights=False)
print('EXPORTADO', path, os.path.getsize(path), 'bytes', f'({time.time() - T0_:.0f} s)')

if 'rapido' in ARGS:
    sys.exit(0)

# ====================== vistas de control (mismas cámaras y luz que tinto.py, para poder comparar) ======================
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
bpy.context.object.data.materials.append(flat('piso', srgb(0xcbb89a), .9))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
col.objects.link(cam)
scene.camera = cam
scene.cycles.samples = 32
scene.render.resolution_x = scene.render.resolution_y = 640
VIEWS = (('frente', (1.9, 3.3, 1.5), (0, .1, .8), 55), ('atras', (-1.2, -3.6, 2.0), (0, .1, .8), 55),
         ('lado', (4.0, .1, 1.0), (0, .1, .8), 55), ('cara', (.55, 2.6, 1.25), (0, .8, 1.08), 95))
for view, pos, look, lens in VIEWS:
    cam.data.lens = lens
    cam.location = pos
    cam.rotation_euler = (Vector(look) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, f'{NOMBRE}_{view}.png')
    bpy.ops.render.render(write_still=True)
print(f'LISTO en {time.time() - T0_:.0f} s')
