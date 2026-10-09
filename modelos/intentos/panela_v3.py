# Panela: la perra criolla que persigue a Tinto (porque quiere ser su amiga). Exporta modelos/panela.glb y las
# vistas de control panela_<vista>.png. Mismo flujo que modelos/tinto_v4.py (ver modelos/LEEME.md).
# Uso:  blender --background --python modelos/panela.py            (todo: modelo, horneado, glb, chequeo y vistas)
#       blender --background --python modelos/panela.py -- rapido  (sin vistas; solo glb y chequeo)
#
# Árbol de objetos (piezas rígidas con el pivote en la articulación; no hay esqueleto):
#   body > torso, head (> ear_L, ear_R, jaw (> tongue), eye_L, eye_R), collar (> tag), tail (> tail_tip),
#          leg_FL, leg_FR, leg_BR, leg_BL
# Blender: X = lateral (izquierda de la perra = -X), +Y = adelante, Z = arriba. Al exportar, +Y pasa a -Z.
#
# UNIDADES: las mismas unidades locales de makeDog() en js/core.js, ANTES de su escala de raíz x1.2.
# La escala x1.2 NO va horneada: la pone el integrador en la raíz, igual que hoy (js/fx.js lee dog.scale.x).
#
# POSE DE REPOSO pensada para js/fx.js, que hoy le pone al perro rotaciones ABSOLUTAS:
#   - tail.rotation.x = 0.9 siempre -> la cola se modela VERTICAL (enroscada hacia adelante); con 0.9 queda
#     levantada hacia atrás. Así fx.js no necesita cambios para la cola.
#   - tongue.rotation.z = -0.3 y cuelga hacia +X desde su pivote -> la lengua se modela saliendo por +X.
#   - ear.rotation.z = lado * ángulo, con el pivote ARRIBA -> la oreja cuelga de su pivote.
#   - jaw.rotation.x negativo abre -> la mandíbula se modela cerrada, hacia adelante de su bisagra.
import bpy, bmesh, math, os, sys, json, struct, time
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

NOMBRE = 'panela'
OUT = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(OUT, 'texturas')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ATLAS = 1024
MAX_BYTES = 1_200_000
T0_ = time.time()

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection


def srgb(h):  # 0xRRGGBB -> lineal
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


# ====================== materiales FUENTE (procedurales; solo se hornean) ======================
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


def spot(nt, pos, center, radii, inner=.8):
    """Máscara 1 dentro de un elipsoide (coordenadas del mundo) que cae a 0 en su borde. inner alto = borde nítido."""
    sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'
    nt.links.new(pos, sub.inputs[0]); sub.inputs[1].default_value = center
    div = nt.nodes.new('ShaderNodeVectorMath'); div.operation = 'DIVIDE'
    nt.links.new(sub.outputs[0], div.inputs[0]); div.inputs[1].default_value = radii
    ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'
    nt.links.new(div.outputs[0], ln.inputs[0])
    return maprange(nt, ln.outputs['Value'], inner, 1, 1, 0)


# Colores de la identidad aprobada (los mismos del perro por código: B = 0xb86a2c, D = 0x7a4218). Calibrados en el
# visor de Three.js (ver equipo/panela.md), no en el render de Blender.
C_PANELA, C_PANELA2, C_MECHON = srgb(0xb86a2c), srgb(0xa85c22), srgb(0xd89250)
C_BLANCO, C_OREJA, C_OREJA2 = srgb(0xf3ece0), srgb(0x7a4218), srgb(0x66350f)


def fur(name, stretch, spots=(), base=(C_PANELA, C_PANELA2), mech=C_MECHON, warp=.07):
    """Pelaje corto: dos tonos en manchas grandes + mechones finos estirados en la dirección del pelo.
    spots = [(centro, radios, color, borde)] pinta zonas (blanco del pecho, lomo, frente, medias). El borde de las
    manchas se deforma con ruido (warp) para que no salgan elipses perfectas."""
    m, nt, b = new_mat(name)
    pos = nt.nodes.new('ShaderNodeNewGeometry').outputs['Position']
    wn = node(nt, 'ShaderNodeTexNoise', Scale=5, Detail=1)
    nt.links.new(pos, wn.inputs['Vector'])
    off = nt.nodes.new('ShaderNodeVectorMath'); off.operation = 'SUBTRACT'
    nt.links.new(wn.outputs['Color'], off.inputs[0]); off.inputs[1].default_value = (.5, .5, .5)
    sc = nt.nodes.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'
    nt.links.new(off.outputs[0], sc.inputs[0]); sc.inputs['Scale'].default_value = warp * 2
    wp = nt.nodes.new('ShaderNodeVectorMath'); wp.operation = 'ADD'
    nt.links.new(pos, wp.inputs[0]); nt.links.new(sc.outputs[0], wp.inputs[1])
    wpos = wp.outputs[0]
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = stretch
    nt.links.new(pos, mp.inputs['Vector'])
    hair = node(nt, 'ShaderNodeTexNoise', Scale=1, Detail=3, Roughness=.65)
    nt.links.new(mp.outputs[0], hair.inputs['Vector'])
    big = node(nt, 'ShaderNodeTexNoise', Scale=1.6, Detail=1)
    nt.links.new(pos, big.inputs['Vector'])
    h = maprange(nt, hair.outputs['Fac'], .32, .68, 0, 1)
    c = mix(nt, maprange(nt, big.outputs['Fac'], .35, .65, 0, 1), base[0], base[1])
    hm = nt.nodes.new('ShaderNodeMath'); hm.operation = 'MULTIPLY'
    nt.links.new(h, hm.inputs[0]); hm.inputs[1].default_value = .22
    c = mix(nt, hm.outputs[0], c, mech)
    for center, radii, color, inner in spots:
        c = mix(nt, spot(nt, wpos, center, radii, inner), c, color)
    nt.links.new(c, b.inputs['Base Color'])
    nt.links.new(maprange(nt, hair.outputs['Fac'], .3, .7, .70, .92), b.inputs['Roughness'])
    bump = node(nt, 'ShaderNodeBump', Strength=.3, Distance=.03)
    nt.links.new(hair.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def skin_mat(name, color, color2, rough, scale=14, bump=.12):
    """Superficie lisa en dos tonos (nariz, lengua, cuero, placa)."""
    m, nt, b = new_mat(name)
    n = node(nt, 'ShaderNodeTexNoise', Scale=scale, Detail=2)
    nt.links.new(mix(nt, maprange(nt, n.outputs['Fac'], .3, .7, 0, 1), color, color2), b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if bump:
        bp = node(nt, 'ShaderNodeBump', Strength=bump, Distance=.02)
        nt.links.new(n.outputs['Fac'], bp.inputs['Height'])
        nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


FUR_TORSO = fur('src_pelo_torso', (13, 1.8, 13), [
    ((0, .78, .92), (.50, .46, .62), C_BLANCO, .78),      # pechera blanca
    ((0, .05, .62), (.30, .70, .16), C_BLANCO, .6),       # panza
    ((.05, .08, 1.62), (.38, .60, .30), C_BLANCO, .82),   # LA mancha blanca del lomo (lo que más ve la cámara)
    ((-.22, -.62, 1.52), (.17, .19, .22), C_BLANCO, .8),  # manchita en la grupa, a la izquierda
])
FUR_HEAD = fur('src_pelo_cabeza', (13, 3, 13), [
    ((0, 1.22, 1.80), (.17, .80, .62), C_BLANCO, .8),     # franja blanca: de la nariz, por la frente, hasta la nuca
    ((0, 1.64, 1.50), (.46, .36, .36), C_BLANCO, .8),     # hocico y mandíbula blancos
])
FUR_LEG = fur('src_pelo_pata', (14, 14, 1.8), [((0, 0, 0), (9, 9, .27), C_BLANCO, .82)])   # medias blancas
FUR_TAIL = fur('src_pelo_cola', (11, 11, 3.5), [((0, -.70, 2.34), (.5, .5, .30), C_BLANCO, .8)])  # punta blanca
FUR_EAR = fur('src_pelo_oreja', (13, 13, 3), base=(C_OREJA, C_OREJA2), mech=srgb(0x9a5a28))
NOSE = skin_mat('src_nariz', srgb(0x1c1512), srgb(0x2a201b), .38, 30, 0)
MOUTH = skin_mat('src_boca', srgb(0x8c1f2f), srgb(0x7a1826), .6, 20, 0)
TONGUE = skin_mat('src_lengua', srgb(0xff6f91), srgb(0xf2577d), .5, 9, .08)
LEATHER = skin_mat('src_collar', srgb(0xd01828), srgb(0xb21222), .62, 26, .2)
GOLD = skin_mat('src_oro', srgb(0xffc21a), srgb(0xf0a808), .42, 6, 0)   # sin metal: el juego no tiene mapa de entorno
ATLAS_MATS = [FUR_TORSO, FUR_HEAD, FUR_LEG, FUR_TAIL, FUR_EAR, NOSE, MOUTH, TONGUE, LEATHER, GOLD]

EYE, nt_, b_ = new_mat('ojo')   # color entero por vértice (atributo 'Col')
ca_ = nt_.nodes.new('ShaderNodeVertexColor'); ca_.layer_name = 'Col'
nt_.links.new(ca_.outputs['Color'], b_.inputs['Base Color'])
b_.inputs['Roughness'].default_value = .15
EYE.use_backface_culling = True


def flat(name, color, rough):
    m, nt, b = new_mat(name)
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    return m


# ====================== geometría (ayudantes iguales a los de tinto_v4.py) ======================
def add(mesh_or_none, name, pivot=(0, 0, 0), parent=None):
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
    if len(mesh.materials):
        mesh.materials.clear()
    for mt in (mats if isinstance(mats, (list, tuple)) else [mats]):
        mesh.materials.append(mt)
    mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
    return mesh


K_BOLA = .80   # con radius = 2r y umbral .6 las metabolas salen ~1,15x (sueltas) a ~1,3x (fundidas) más grandes que
               # los radios escritos (intento v1: perra 30 % más gorda que makeDog). Se compensa aquí y se mide la caja.


def blob(name, balls, mat, tris, res=.04, voxel=.03, smooth=6, k=K_BOLA):
    mb = bpy.data.metaballs.new(name + '_mb')
    mb.resolution = res
    mb.threshold = .6
    for (x, y, z), (rx, ry, rz) in balls:
        e = mb.elements.new(type='ELLIPSOID')
        e.co = (x, y, z)
        r = max(rx, ry, rz) * k
        rx, ry, rz = rx * k, ry * k, rz * k
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


def from_bm(name, build, mats, recalc=True):
    bm = bmesh.new()
    build(bm)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return shade(mesh, mats)


def sphere(name, center, radii, mat, seg=16, rot=None):
    m = Matrix.Translation(center) @ (rot.to_4x4() if rot else Matrix()) @ Matrix.Diagonal((*radii, 1))

    def build(bm):
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(4, seg // 2), radius=1, matrix=m)
    return from_bm(name, build, mat)


def sheet(bm, front, back):
    """Lámina con grosor a partir de dos rejillas [fila][columna] de puntos."""
    R, C = len(front), len(front[0])
    vf = [[bm.verts.new(p) for p in row] for row in front]
    vb = [[bm.verts.new(p) for p in row] for row in back]

    def quad(a, b, c, d):
        try:
            bm.faces.new((a, b, c, d))
        except ValueError:
            pass
    for i in range(R - 1):
        for j in range(C - 1):
            quad(vf[i][j], vf[i][j + 1], vf[i + 1][j + 1], vf[i + 1][j])
            quad(vb[i][j], vb[i + 1][j], vb[i + 1][j + 1], vb[i][j + 1])
        quad(vf[i][0], vf[i + 1][0], vb[i + 1][0], vb[i][0])
        quad(vf[i][C - 1], vb[i][C - 1], vb[i + 1][C - 1], vf[i + 1][C - 1])
    for j in range(C - 1):
        quad(vf[0][j], vb[0][j], vb[0][j + 1], vf[0][j + 1])
        quad(vf[R - 1][j], vf[R - 1][j + 1], vb[R - 1][j + 1], vb[R - 1][j])


def join(name, meshes):
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


def tree_of(*meshes):
    bm = bmesh.new()
    for m in meshes:
        bm.from_mesh(m)
    t = BVHTree.FromBMesh(bm)
    bm.free()
    return t


def skin(tree, center, direction, far=4):
    """Punto de la piel visto desde AFUERA: rayo que viene desde lejos hacia `center` (trampa 5 de la guía)."""
    d = Vector(direction).normalized()
    hit = tree.ray_cast(Vector(center) + d * far, -d)[0]
    if hit is None:
        raise RuntimeError(f'rayo sin impacto hacia {tuple(center)} desde {tuple(d)}')
    return hit, d


# ====================== Panela ======================
body = add(None, 'body')

# --- torso: barril ancho de bulldog criollo, pecho hondo, cuello grueso ---
torso_mesh = blob('torso', [
    ((0, .52, 1.04), (.60, .54, .56)),    # pecho
    ((0, .30, 1.36), (.44, .40, .30)),    # cruz
    ((0, -.02, 1.10), (.60, .62, .55)),   # costillar (barriga generosa)
    ((0, -.52, 1.08), (.56, .50, .52)),   # grupa
    ((0, .80, 1.40), (.42, .38, .42)),    # cuello
    ((0, .96, 1.56), (.38, .34, .38)),    # nuca (queda dentro de la cabeza)
], FUR_TORSO, 2800, res=.045, voxel=.034)
torso_tree = tree_of(torso_mesh)
torso = add(torso_mesh, 'torso', parent=body)

# --- cabeza: cráneo ancho, hocico corto y cuadrado, cachetes ---
HEAD = (0, .85, 1.45)             # pivote del cuello: el mismo que js/fx.js le pone al perro actual
HC = Vector((0, 1.10, 1.72))      # centro del cráneo
skull = blob('craneo', [
    ((0, 1.06, 1.74), (.60, .54, .52)),       # cráneo ancho
    ((0, 1.46, 1.60), (.40, .34, .27)),       # puente del hocico
    ((0, 1.68, 1.58), (.34, .24, .22)),       # punta del hocico
    ((-.20, 1.62, 1.53), (.22, .22, .15)),    # belfos
    ((.20, 1.62, 1.53), (.22, .22, .15)),
    ((-.32, 1.24, 1.60), (.24, .24, .22)),    # cachetes
    ((.32, 1.24, 1.60), (.24, .24, .22)),
], FUR_HEAD, 2800, res=.035, voxel=.026)
head_tree = tree_of(skull)
head_parts = [skull]
nose_at, nd = skin(head_tree, (0, 1.2, 1.66), (0, 1, .06))
head_parts.append(sphere('nariz', nose_at - nd * .02, (.125, .085, .095), NOSE, 14))

eyes = []
for side, name in ((-1, 'L'), (1, 'R')):
    at, d = skin(head_tree, HC, (side * .46, 1, .30))
    d = (d + Vector((-side * .18, .1, 0))).normalized()   # que miren más al frente que hacia los lados
    rot = Vector((0, 1, 0)).rotation_difference(d).to_matrix().to_4x4()
    RX, RY, RZ = .135, .06, .155     # ojos grandes
    M = Matrix.Translation(at - d * .02) @ rot @ Matrix.Diagonal((RX, RY, RZ, 1))

    def eye_build(bm, M=M, d=d, side=side):
        lay = bm.loops.layers.float_color.new('Col')
        polo_y = Matrix.Rotation(-math.pi / 2, 4, 'X')
        # OJO: usar los vértices que DEVUELVE el operador (trampa 3 de la guía)
        new = bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=1, matrix=polo_y)['verts']
        bmesh.ops.delete(bm, geom=[v for v in new if v.co.y < -.05], context='VERTS')
        new = [v for v in new if v.is_valid]
        for v in new:
            k = 1 - .25 * max(0, min(1, (v.co.z - .2) / .7))   # blanco del ojo, algo sombreado arriba
            for lp in v.link_loops:
                lp[lay] = (.9 * k, .88 * k, .84 * k, 1)
        bmesh.ops.transform(bm, matrix=M, verts=new)

        def cap(cx, cz, rx, rz, off, color_of, seg=20, rings=3):
            """Parche elíptico que copia la curvatura del ojo y queda `off` por encima (trampa 8 de la guía)."""
            def vert(rho, th):
                x, z = cx + rx * rho * math.cos(th), cz + rz * rho * math.sin(th)
                return bm.verts.new(M @ Vector((x, math.sqrt(max(0, 1 - x * x - z * z)) + off, z))), rho
            ring_v = [[vert(0, 0)]] + [[vert(r / rings, k / seg * math.tau) for k in range(seg)] for r in range(1, rings + 1)]
            rho_of = {v: rho for row in ring_v for v, rho in row}
            ring_v = [[v for v, _ in row] for row in ring_v]
            faces = [bm.faces.new((ring_v[0][0], ring_v[1][k], ring_v[1][(k + 1) % seg])) for k in range(seg)]
            for r in range(1, rings):
                faces += [bm.faces.new((ring_v[r][k], ring_v[r + 1][k], ring_v[r + 1][(k + 1) % seg], ring_v[r][(k + 1) % seg])) for k in range(seg)]
            for f in faces:
                f.normal_update()
                if f.normal.dot(d) < 0:
                    f.normal_flip()
                for lp in f.loops:
                    lp[lay] = (*color_of(rho_of[lp.vert]), 1)

        def iris(rho):   # café miel al centro, aro oscuro
            a, b, c = srgb(0xb06a26), srgb(0x6a3a14), srgb(0x24120a)
            if rho < .7:
                return [x + (y - x) * rho / .7 for x, y in zip(a, b)]
            return [x + (y - x) * (rho - .7) / .3 for x, y in zip(b, c)]
        cx = -side * .10
        cap(cx, -.04, .74, .74, .05, iris, 24, 4)
        cap(cx, -.04, .40, .42, .10, lambda r: srgb(0x060505), 20)       # pupila redonda y grande
        cap(cx + .26, .30, .20, .21, .17, lambda r: (1, 1, 1), 12, 2)    # brillo grande
        cap(cx - .24, -.34, .09, .10, .17, lambda r: (1, 1, 1), 8, 2)    # brillo chico
    eyes.append((from_bm('eye_' + name, eye_build, EYE, recalc=False), name))

    # párpado: apenas una ceja de pelo, caída hacia AFUERA (cara de cachorro, no de brava)
    def lid_build(bm, M=M, side=side):
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=10, radius=1,
                                  matrix=M @ Matrix.Diagonal((1.12, 1.35, 1.12, 1)))
        n = (M.to_3x3() @ Vector((side * .06 / RX, 0, 1 / RZ))).normalized()
        co = M @ Vector((0, 0, .70))
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=n, clear_inner=True)
    head_parts.append(from_bm('parpado', lid_build, FUR_HEAD))

head = add(join('head', head_parts), 'head', HEAD, body)
for mesh, name in eyes:
    add(mesh, 'eye_' + name, HEAD, head)

# --- orejas caídas, más oscuras; pivote ARRIBA (fx.js las hace aletear girando en Z desde ahí) ---
for side, name in ((-1, 'L'), (1, 'R')):
    at, d = skin(head_tree, HC, (side * .80, -.22, .68))
    base = at - d * .05
    DOWN = Vector((side * .30, -.06, -1)).normalized()
    OUTV = (Vector((side, 0, 0)) - DOWN * DOWN.dot(Vector((side, 0, 0)))).normalized()
    FW = OUTV.cross(DOWN) * side
    # la lámina va girada ~50 grados: el borde de atrás queda más afuera que el de adelante. De canto (como cuelga
    # una oreja de verdad) desde la cámara de la carrera no se veía nada (intento v1).
    A = math.radians(50)
    WD, NR = FW * math.cos(A) - OUTV * math.sin(A), OUTV * math.cos(A) + FW * math.sin(A)
    H, W0, ROWS, COLS = .74, .27, 15, 7
    front, back = [], []
    for i in range(ROWS):
        v = i / (ROWS - 1)
        w = W0 * (.62 + .38 * math.sin(v * math.pi)) * math.sqrt(max(0, 1 - v ** 4)) + .012
        fr, bk = [], []
        for j in range(COLS):
            u = j / (COLS - 1) * 2 - 1
            p = base + DOWN * (H * v) + WD * (u * w) + OUTV * (.14 * (1 - (1 - v) ** 3)) + NR * (.05 * (1 - u * u))
            fr.append(p)
            bk.append(p - NR * (.035 + .05 * (1 - u * u) * (1 - v * .5)))
        front.append(fr)
        back.append(bk)
    add(from_bm('ear_' + name, lambda bm: sheet(bm, front, back), FUR_EAR), 'ear_' + name, base, head)

# --- mandíbula (se abre girando en X sobre la bisagra) con el interior de la boca, y la lengua por un lado ---
JAW = (0, 1.27, 1.38)             # = pivote de cabeza + (0, -.07, -.42) de fx.js
jaw_mesh = blob('jaw', [
    ((0, 1.40, 1.385), (.26, .22, .10)),
    ((0, 1.56, 1.385), (.22, .16, .095)),
    ((0, 1.50, 1.33), (.17, .15, .08)),    # mentón
], FUR_HEAD, 420, res=.03, voxel=.02, smooth=4)
jaw_parts = [jaw_mesh, sphere('boca', (0, 1.47, 1.425), (.17, .19, .035), MOUTH, 12)]
jaw = add(join('jaw', jaw_parts), 'jaw', JAW, head)

TONGUE_P = Vector((.2, 1.57, 1.41))   # = bisagra + (.2, .03, -.3) de fx.js


def tongue_build(bm):
    ROWS, COLS, L = 12, 7, .42
    front, back = [], []
    for i in range(ROWS):
        t = -.22 + 1.22 * i / (ROWS - 1)          # arranca dentro de la boca
        tt = max(t, 0)
        w = .105 * (.82 + .18 * math.sin(tt * math.pi)) * math.sqrt(max(0, 1 - tt ** 6)) + .008
        fr, bk = [], []
        for j in range(COLS):
            u = j / (COLS - 1) * 2 - 1
            p = TONGUE_P + Vector((L * t, u * w, -.22 * tt * tt - .018 * (1 - u * u) * (1 - tt * .5)))
            fr.append(p)
            bk.append(p - Vector((0, 0, .034 * (1 - .5 * u * u))))
        front.append(fr)
        back.append(bk)
    sheet(bm, front, back)


tongue = add(from_bm('tongue', tongue_build, TONGUE), 'tongue', TONGUE_P, jaw)

# --- collar rojo siguiendo la piel del cuello, con hebilla dorada en la nuca y placa dorada colgando al frente ---
NECK = Vector((0, .80, 1.42))
N = Vector((0, .75, .66)).normalized()               # eje del cuello
U, V = Vector((1, 0, 0)), Vector((0, .66, -.75)).normalized()   # V: al frente y abajo; -V: la nuca
SEG, TUBE = 36, 8


def neck_at(a, lift=.028):
    d = U * math.cos(a) + V * math.sin(a)
    return torso_tree.ray_cast(NECK + d * 3, -d)[0] + d * lift, d   # solo contra el torso y de afuera hacia adentro


loop = [neck_at(i / SEG * math.tau) for i in range(SEG)]


def ring(bm):
    rows = []
    for c, d in loop:
        row = []
        for j in range(TUBE):
            b = (j + .5) / TUBE * math.tau
            sq = lambda x: math.copysign(abs(x) ** .5, x)       # sección casi rectangular: correa, no salchicha
            row.append(bm.verts.new(c + d * (.03 * sq(math.cos(b))) + N * (.105 * sq(math.sin(b)))))
        rows.append(row)
    for i in range(SEG):
        for j in range(TUBE):
            bm.faces.new((rows[i][j], rows[(i + 1) % SEG][j], rows[(i + 1) % SEG][(j + 1) % TUBE], rows[i][(j + 1) % TUBE]))


nape, nape_d = loop[3 * SEG // 4]
front_c, front_d = loop[SEG // 4]


def buckle(bm):
    M = Matrix.Translation(nape + nape_d * .012) @ Matrix((
        (U.x * .20, N.x * .27, nape_d.x * .07, 0), (U.y * .20, N.y * .27, nape_d.y * .07, 0),
        (U.z * .20, N.z * .27, nape_d.z * .07, 0), (0, 0, 0, 1)))
    bmesh.ops.create_cube(bm, size=1, matrix=M)
    bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], offset=.012, segments=2, affect='EDGES')


collar = add(join('collar', [from_bm('correa', ring, LEATHER), from_bm('hebilla', buckle, GOLD)]), 'collar', NECK, body)

TAG_P = front_c + front_d * .02
tag_c = Vector((0, 0, TAG_P.z - .17))
tag_c.y = max(torso_tree.ray_cast(Vector((0, 4, tag_c.z)), Vector((0, -1, 0)))[0].y + .04, TAG_P.y - .02)


def tag_build(bm):
    rot = Matrix.Rotation(math.pi / 2, 4, 'X')
    bmesh.ops.create_cone(bm, cap_ends=True, segments=18, radius1=.115, radius2=.115, depth=.035,
                          matrix=Matrix.Translation(tag_c) @ rot)
    mid = (TAG_P + tag_c) / 2
    bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=1,
                              matrix=Matrix.Translation(mid + Vector((0, 0, .04))) @ Matrix.Diagonal((.03, .03, .07, 1)))


tag = add(from_bm('tag', tag_build, GOLD), 'tag', TAG_P, collar)

# --- patas gruesas y cortas; orden que espera el juego: FL, FR, BR, BL ---
for name, sx, sy in (('FL', -1, 1), ('FR', 1, 1), ('BR', 1, -1), ('BL', -1, -1)):
    hip = Vector((sx * .30, sy * .60, .72))     # las mismas caderas de makeDog()
    x, y = hip.x, hip.y
    if sy > 0:
        balls = [((x, y, .70), (.20, .22, .26)), ((x, y - .01, .40), (.155, .165, .26)), ((x, y + .01, .18), (.145, .155, .16))]
    else:
        balls = [((x * 1.04, y + .04, .74), (.23, .29, .30)), ((x, y - .03, .42), (.16, .18, .24)),
                 ((x, y - .07, .20), (.14, .15, .17))]
    balls += [((x, y + .08, .11), (.185, .23, .10))]
    balls += [((x + k * .095, y + .24 - abs(k) * .025, .085), (.075, .09, .072)) for k in (-1, 0, 1)]   # dedos
    add(blob('leg', balls, FUR_LEG, 760, res=.035, voxel=.024, smooth=4), 'leg_' + name, hip, body)


# --- cola: VERTICAL en reposo (fx.js le suma 0.9 rad en X), enroscada hacia adelante, punta blanca ---
def bez(a, b, c, t):
    return a.lerp(b, t).lerp(b.lerp(c, t), t)


T0, T1, T2 = Vector((0, -.90, 1.40)), Vector((0, -.90, 1.82)), Vector((0, -.60, 2.30))
tail = add(blob('tail', [
    (bez(T0 - Vector((0, 0, .08)), Vector((0, -.97, 1.62)), T1, t)[:], (.125 - t * .03,) * 3) for t in (0, .2, .4, .6, .8, 1)
], FUR_TAIL, 420, res=.03, voxel=.02), 'tail', T0, body)
tip = add(blob('tail_tip', [
    (bez(T1, Vector((0, -.86, 2.20)), T2, t)[:], (.095 - t * .012 + (.03 if t > .7 else 0),) * 3) for t in (0, .2, .4, .6, .8, 1)
], FUR_TAIL, 420, res=.03, voxel=.02), 'tail_tip', T1, tail)

# ====================== UV automático + horneado ======================
atlas_obs = [o for o in scene.objects if o.type == 'MESH' and any(m in ATLAS_MATS for m in o.data.materials)]
bpy.ops.object.select_all(action='DESELECT')
for o in atlas_obs:
    o.select_set(True)
bpy.context.view_layer.objects.active = atlas_obs[0]
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.006)
bpy.ops.object.mode_set(mode='OBJECT')

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 4
os.makedirs(TEX, exist_ok=True)
images = {}
for kind, cs, size in (('color', 'sRGB', ATLAS), ('normal', 'Non-Color', ATLAS // 2), ('rugosidad', 'Non-Color', ATLAS // 2)):
    im = bpy.data.images.new(f'{NOMBRE}_{kind}', size, size, alpha=False)
    im.colorspace_settings.name = cs
    images[kind] = im
for kind, typ, kw in (('color', 'DIFFUSE', dict(pass_filter={'COLOR'})), ('normal', 'NORMAL', {}), ('rugosidad', 'ROUGHNESS', {})):
    for m in ATLAS_MATS:
        n = m.node_tree.nodes.get('DESTINO') or m.node_tree.nodes.new('ShaderNodeTexImage')
        n.name, n.image = 'DESTINO', images[kind]
        m.node_tree.nodes.active = n
    t = time.time()
    bpy.ops.object.bake(type=typ, margin=6, use_clear=True, **kw)
    images[kind].filepath_raw = os.path.join(TEX, f'{NOMBRE}_{kind}.png')
    images[kind].file_format = 'PNG'
    images[kind].save()
    print(f'HORNEADO {kind}: {time.time() - t:.1f} s')

FIN, nt, b = new_mat('panela')
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
print(f'PANELA: {len(meshes)} mallas, {sum(tris_of(o.data) for o in meshes)} triángulos')
for o in meshes:
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo, hi = [min(c[i] for c in bb) for i in range(3)], [max(c[i] for c in bb) for i in range(3)]
    print(f'   {o.name:10s} {tris_of(o.data):5d} tri  caja {[round(v, 2) for v in lo]} .. {[round(v, 2) for v in hi]}')
path = os.path.join(OUT, NOMBRE + '.glb')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                          export_image_format='JPEG', export_image_quality=88, export_extras=False,
                          export_animations=False, export_cameras=False, export_lights=False)
print('EXPORTADO', path, os.path.getsize(path), 'bytes', f'({time.time() - T0_:.0f} s)')

# ====================== chequeo del .glb contra el contrato de Panela (verificar_glb.py solo conoce el del gato) ======================
CONTRATO = {'body': None, 'torso': 'body', 'head': 'body', 'ear_L': 'head', 'ear_R': 'head', 'jaw': 'head',
            'tongue': 'jaw', 'collar': 'body', 'tail': 'body', 'tail_tip': 'tail', 'leg_FL': 'body', 'leg_FR': 'body',
            'leg_BR': 'body', 'leg_BL': 'body'}
data = open(path, 'rb').read()
j = json.loads(data[20:20 + struct.unpack('<I', data[12:16])[0]])
nodes = j['nodes']
padre = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}
idx = {nd.get('name'): i for i, nd in enumerate(nodes)}
fallos = []
print('CHEQUEO  nodo        padre      pivote local en ejes del JUEGO (x, y arriba, z; frente = -z)')
for name, want in CONTRATO.items():
    if name not in idx:
        fallos.append(f'falta el nodo {name}')
        continue
    nd = nodes[idx[name]]
    p = nodes[padre[idx[name]]]['name'] if idx[name] in padre else '-'
    print(f'   {name:10s}  {p:9s}  {[round(v, 3) for v in nd.get("translation", [0, 0, 0])]}')
    if want and p != want:
        fallos.append(f'{name} cuelga de {p} y no de {want}')
    r = nd.get('rotation', [0, 0, 0, 1])
    if max(abs(r[0]), abs(r[1]), abs(r[2])) > 1e-4:
        fallos.append(f'{name} tiene rotación en reposo')
    if any(abs(s - 1) > 1e-4 for s in nd.get('scale', [1, 1, 1])):
        fallos.append(f'{name} tiene escala')
print('   nodos extra:', [nd.get('name') for nd in nodes if nd.get('name') not in CONTRATO])
tris = sum(j['accessors'][p['indices']]['count'] // 3 for m in j['meshes'] for p in m['primitives'])
prims = sum(len(m['primitives']) for m in j['meshes'])
print(f'   {prims} primitivas, {tris} triángulos, {len(j.get("materials", []))} materiales, '
      f'imágenes {[(im.get("name"), j["bufferViews"][im["bufferView"]]["byteLength"]) if "bufferView" in im else "AFUERA" for im in j.get("images", [])]}')
if any('bufferView' not in im for im in j.get('images', [])):
    fallos.append('hay imágenes fuera del archivo')
if j.get('extensionsRequired'):
    fallos.append('pide extensiones obligatorias')
if len(data) > MAX_BYTES:
    fallos.append(f'pesa {len(data)} bytes, más de {MAX_BYTES}')
zmin = min((o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box)
if abs(zmin) > .05:
    fallos.append(f'las patas no pisan el suelo: z mínima {zmin:.3f}')
print('CHEQUEO:', 'TODO BIEN' if not fallos else 'FALLAS: ' + '; '.join(fallos), f'({len(data) / 1e6:.2f} MB)')

if 'rapido' in ARGS:
    sys.exit(1 if fallos else 0)

# ====================== vistas de control ======================
world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.75, .85, 1, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .9
scene.world = world
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.5
sun.rotation_euler = (math.radians(50), 0, math.radians(35))
col.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=24)
piso = bpy.context.object
piso.data.materials.append(flat('piso', srgb(0xcbb89a), .9))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
col.objects.link(cam)
scene.camera = cam
scene.cycles.samples = 24
scene.render.resolution_x = scene.render.resolution_y = 640
# (vista, cámara, mira a, lente, pose de juego). Las tres primeras son el .glb tal cual (pose de reposo).
VIEWS = (('frente', (3.6, 6.4, 2.6), (0, .2, 1.15), 55, False), ('atras', (-2.3, -6.9, 3.9), (0, .2, 1.15), 55, False),
         ('lado', (7.8, .2, 1.6), (0, .2, 1.15), 55, False), ('cara', (1.1, 4.6, 2.0), (0, 1.3, 1.62), 85, True),
         ('juego', (0, -5.6, 4.3), (0, .6, 1.3), 50, True))   # como la ve la cámara de la carrera, con la pose de fx.js
SOLO = [a for a in ARGS if a in [v[0] for v in VIEWS]]
for view, pos, look, lens, pose in VIEWS:
    if SOLO and view not in SOLO:
        continue
    # pose de juego: lo que fx.js le pone al perro en carrera (cola 0.9, mandíbula entreabierta, lengua caída)
    tail.rotation_euler = (.9 if pose else 0, 0, .25 if pose else 0)
    jaw.rotation_euler = (-.24 if pose else 0, 0, 0)
    tongue.rotation_euler = (0, 0, -.3 if pose else 0)
    cam.data.lens = lens
    cam.location = pos
    cam.rotation_euler = (Vector(look) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, f'{NOMBRE}_{view}.png')
    bpy.ops.render.render(write_still=True)
print(f'LISTO en {time.time() - T0_:.0f} s')
sys.exit(1 if fallos else 0)
