# Utilería de Tinto: cocodrilo, ratón, moneda de huella, gallina, pescado, caneca (y de ñapa carro y valla).
# Un .glb por figura en modelos/props/, todos con UN material sin textura (color por vértice, COLOR_0).
# Uso:  blender --background --python modelos/props/props.py                 (todas, con vistas de Blender)
#       blender --background --python modelos/props/props.py -- raton moneda  (solo esas)
#       blender --background --python modelos/props/props.py -- rapido        (sin vistas; solo .glb y chequeo)
#
# Convenciones (las de modelos/LEEME.md): Blender X = lateral (izquierda = -X), +Y = adelante, Z = arriba.
# Al exportar +Y pasa a -Z del juego. Origen en el suelo, centrado. Escala 1 = unidades del juego. Nodos sin
# rotación ni escala. El nodo raíz se llama como la figura y lleva la malla estática; las piezas que se mueven
# cuelgan de él con el pivote en su bisagra:  cocodrilo > jaw, tail > tail_tip   ·   caneca > lid   ·   carro > pintura
# Giros que abren, ya en ejes del juego:  jaw.rotation.x > 0 (levanta la quijada de arriba)  ·  lid.rotation.x < 0
# (la tapa se levanta alejándose de la cámara)  ·  tail.rotation.y y tail_tip.rotation.y menean la cola.
# Las vistas de Blender (vistas/<figura>_blender.png) sirven para FORMA; el color se juzga en visor_props.html.
#
# Por qué color por vértice y no textura: el juego ya funde su utilería en mallas con color por vértice
# (bake() y vcMat en js/core.js). Así estas figuras entran por el mismo camino, pesan menos y no gastan memoria de video.
import bpy, bmesh, math, os, sys, json, struct, time
from mathutils import Vector, Matrix, Euler

OUT = os.path.dirname(os.path.abspath(__file__))
VIS = os.path.join(OUT, 'vistas')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
TAU = math.tau
T0_ = time.time()


# ====================== color ======================
def srgb(h):  # 0xRRGGBB -> lineal (los colores de vértice van en lineal)
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


def lin(c):
    return srgb(c) if isinstance(c, int) else tuple(c)[:3]


def mez(a, b, t):
    a, b, t = lin(a), lin(b), max(0, min(1, t))
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def paso(x, a, b):  # 0 en a, 1 en b, suave
    t = max(0, min(1, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def sgn(v):
    return -1 if v < 0 else 1


def R4(rot):
    """Acepta None, una tupla de grados (x, y, z), un cuaternión, un Euler o una matriz."""
    if rot is None:
        return Matrix()
    if isinstance(rot, (tuple, list)):
        return Euler([math.radians(a) for a in rot]).to_matrix().to_4x4()
    return (rot.to_matrix() if hasattr(rot, 'to_matrix') else rot).to_4x4()


def hacia(d, desde=(0, 0, 1)):
    return Vector(desde).rotation_difference(Vector(d).normalized())


# ====================== geometría ======================
def anillo(c, w, hu, hd=None, nu=2, nd=None, seg=12, der=(1, 0, 0), arr=(0, 0, 1), fase=0):
    """Sección superelíptica: medio ancho w, alto hu hacia arriba y hd hacia abajo. n = 2 elipse, mayor = más cuadrada."""
    hd = hu if hd is None else hd
    nd = nu if nd is None else nd
    c, der, arr = Vector(c), Vector(der), Vector(arr)
    pts = []
    for k in range(seg):
        a = (k + fase) / seg * TAU
        ca, sa = math.cos(a), math.sin(a)
        if abs(ca) < 1e-9: ca = 0
        if abs(sa) < 1e-9: sa = 0
        n, h = (nu, hu) if sa >= 0 else (nd, hd)
        pts.append(c + der * (w * sgn(ca) * abs(ca) ** (2 / n)) + arr * (h * sgn(sa) * abs(sa) ** (2 / n)))
    return pts


class Pieza:
    """Malla en construcción. Cada primitiva se arma aparte, se pinta entera y se vuelca aquí (así nunca hay que
    adivinar qué vértices son 'los nuevos': trampa 3 de la guía)."""

    def __init__(self):
        self.bm = bmesh.new()
        self.bm.loops.layers.float_color.new('Col')

    def _vuelca(self, tmp, color, plano, cerrada=True, voltea=False):
        if cerrada:
            bmesh.ops.recalc_face_normals(tmp, faces=tmp.faces[:])
        if voltea:
            bmesh.ops.reverse_faces(tmp, faces=tmp.faces[:])
        lay = tmp.loops.layers.float_color['Col']
        for f in tmp.faces:
            f.smooth = not plano
            cf = f.calc_center_median() if callable(color) else None
            for lp in f.loops:
                lp[lay] = (*lin(color(lp.vert.co, cf) if callable(color) else color), 1.0)
        me = bpy.data.meshes.new('tmp')
        tmp.to_mesh(me)
        tmp.free()
        self.bm.from_mesh(me)
        bpy.data.meshes.remove(me)

    @staticmethod
    def _tmp():
        tmp = bmesh.new()
        tmp.loops.layers.float_color.new('Col')
        return tmp

    def esfera(self, c, r, color, seg=8, ani=5, rot=None, plano=False, polo=None):
        """Elipsoide. polo = eje local donde quedan los polos ('X' o 'Y'); por defecto Z."""
        r = (r, r, r) if isinstance(r, (int, float)) else r
        pre = {'X': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'Y': Matrix.Rotation(-math.pi / 2, 4, 'X')}.get(polo, Matrix())
        tmp = self._tmp()
        bmesh.ops.create_uvsphere(tmp, u_segments=seg, v_segments=ani, radius=1,
                                  matrix=Matrix.Translation(c) @ R4(rot) @ Matrix.Diagonal((*r, 1)) @ pre)
        self._vuelca(tmp, color, plano)

    def cono(self, base, direc, alto, r, color, seg=4, r2=0, plano=True, tapa=False, giro=0, aplasta=(1, 1)):
        """Cono o cilindro (r2) desde `base` hacia `direc`. aplasta = escala de la sección en sus dos ejes."""
        d = Vector(direc).normalized()
        M = (Matrix.Translation(Vector(base) + d * alto / 2) @ hacia(d).to_matrix().to_4x4()
             @ Matrix.Diagonal((aplasta[0], aplasta[1], 1, 1)) @ Matrix.Rotation(giro, 4, 'Z'))
        tmp = self._tmp()
        bmesh.ops.create_cone(tmp, cap_ends=tapa, cap_tris=True, segments=seg, radius1=r, radius2=r2, depth=alto, matrix=M)
        bmesh.ops.remove_doubles(tmp, verts=tmp.verts[:], dist=1e-6)
        self._vuelca(tmp, color, plano, cerrada=True)

    def caja(self, c, tam, color, bisel=0, rot=None, plano=True, seg=1):
        tmp = self._tmp()
        bmesh.ops.create_cube(tmp, size=1, matrix=Matrix.Translation(c) @ R4(rot) @ Matrix.Diagonal((*tam, 1)))
        if bisel:
            bmesh.ops.bevel(tmp, geom=tmp.verts[:] + tmp.edges[:] + tmp.faces[:], offset=bisel, segments=seg,
                            affect='EDGES', profile=.5)
        self._vuelca(tmp, color, plano)

    def loft(self, anillos, color, tapas=('plano', 'plano'), plano=False, voltea=False):
        """Piel entre anillos de igual número de puntos. tapas: 'plano' (abanico), un punto (punta) o None (abierto)."""
        tmp = self._tmp()
        vr = [[tmp.verts.new(p) for p in r] for r in anillos]
        n = len(vr[0])
        for i in range(len(vr) - 1):
            for k in range(n):
                tmp.faces.new((vr[i][k], vr[i][(k + 1) % n], vr[i + 1][(k + 1) % n], vr[i + 1][k]))
        for ring, tapa in ((vr[0], tapas[0]), (vr[-1], tapas[1])):
            if tapa is None:
                continue
            p = sum((v.co for v in ring), Vector()) / n if isinstance(tapa, str) else Vector(tapa)
            cv = tmp.verts.new(p)
            for k in range(n):
                tmp.faces.new((ring[k], ring[(k + 1) % n], cv))
        cerrada = tapas[0] is not None and tapas[1] is not None
        if not cerrada:  # malla abierta: se orienta a mano (trampa 6 de la guía)
            tmp.normal_update()
            eje = sum(anillos[0], Vector()) / n
            tmp.faces.ensure_lookup_table()
            f = tmp.faces[0]
            if f.normal.dot(f.calc_center_median() - eje) < 0:
                bmesh.ops.reverse_faces(tmp, faces=tmp.faces[:])
        self._vuelca(tmp, color, plano, cerrada=cerrada, voltea=voltea)

    def torno(self, perfil, color, seg=16, centro=(0, 0, 0), rot=None, plano=False, voltea=False):
        """Sólido de revolución alrededor de Z local. perfil = [(radio, z)]; radio 0 = punto sobre el eje."""
        tmp = self._tmp()
        M = Matrix.Translation(centro) @ R4(rot)
        filas = []
        for r, z in perfil:
            if r <= 1e-9:
                filas.append([tmp.verts.new(M @ Vector((0, 0, z)))])
            else:
                filas.append([tmp.verts.new(M @ Vector((r * math.cos(k / seg * TAU), r * math.sin(k / seg * TAU), z)))
                              for k in range(seg)])
        for a, b in zip(filas, filas[1:]):
            for k in range(seg):
                k2 = (k + 1) % seg
                if len(a) == 1 and len(b) == 1:
                    continue
                if len(a) == 1:
                    tmp.faces.new((a[0], b[k], b[k2]))
                elif len(b) == 1:
                    tmp.faces.new((a[k], a[k2], b[0]))
                else:
                    tmp.faces.new((a[k], a[k2], b[k2], b[k]))
        cerrada = perfil[0][0] <= 1e-9 and perfil[-1][0] <= 1e-9
        self._vuelca(tmp, color, plano, cerrada=cerrada, voltea=voltea)

    def tubo(self, puntos, radios, color, seg=4, arr=(0, 0, 1), plano=False):
        """Tubo que sigue una lista de puntos; radios = uno por punto. Puntas cerradas."""
        pts = [Vector(p) for p in puntos]
        rings = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            u = Vector(arr)
            if abs(t.dot(u)) > .95:
                u = Vector((1, 0, 0))
            der = t.cross(u).normalized()
            up = der.cross(t).normalized()
            rings.append(anillo(p, radios[i], radios[i], seg=seg, der=der, arr=up, fase=.5))
        self.loft(rings, color, plano=plano)

    def poligono(self, pts, color, normal):
        """Una cara plana suelta, orientada a mano hacia `normal` (malla abierta: trampa 6 de la guía)."""
        tmp = self._tmp()
        f = tmp.faces.new([tmp.verts.new(p) for p in pts])
        f.normal_update()
        if f.normal.dot(Vector(normal)) < 0:
            f.normal_flip()
        self._vuelca(tmp, color, True, cerrada=False)


def recorta(poly, xmin, xmax):
    """Recorta un polígono 2D [(x, z)] a la franja xmin..xmax (Sutherland-Hodgman)."""
    for lim, s in ((xmin, 1), (xmax, -1)):
        out = []
        for a, b in zip(poly, poly[1:] + poly[:1]):
            ina, inb = s * (a[0] - lim) >= 0, s * (b[0] - lim) >= 0
            if ina:
                out.append(a)
            if ina != inb:
                t = (lim - a[0]) / (b[0] - a[0])
                out.append((lim, a[1] + (b[1] - a[1]) * t))
        poly = [q for i, q in enumerate(out) if (Vector(q) - Vector(out[i - 1])).length > 1e-6]
        if len(poly) < 3:
            return []
    return poly


# ====================== escena, objetos, exportación ======================
def nueva_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    m = bpy.data.materials.new('color_vertice')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = .85   # sin brillos: el juego no tiene mapa de entorno (trampa 2)
    b.inputs['Metallic'].default_value = 0
    m.use_backface_culling = True               # si no, sale doubleSided
    return m


def objeto(nombre, pieza, mat, pivote=(0, 0, 0), padre=None, filo=50):
    """Convierte la Pieza en objeto con el pivote en `pivote` (coordenadas del mundo)."""
    mesh = bpy.data.meshes.new(nombre)
    pieza.bm.to_mesh(mesh)
    pieza.bm.free()
    pivote = Vector(pivote)
    mesh.transform(Matrix.Translation(-pivote))
    mesh.materials.append(mat)
    mesh.set_sharp_from_angle(angle=math.radians(filo))
    mesh.color_attributes.active_color_name = 'Col'
    mesh.color_attributes.render_color_index = 0
    ob = bpy.data.objects.new(nombre, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob['pivot'] = pivote[:]
    ob.location = pivote - (Vector(padre['pivot']) if padre else Vector())
    ob.parent = padre
    return ob


def tris_of(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def exporta(nombre, max_tris, max_bytes, piso=0):
    """Exporta la escena a <nombre>.glb y lo revisa leyendo el archivo (no la escena de Blender)."""
    path = os.path.join(OUT, nombre + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                              export_extras=False, export_animations=False, export_cameras=False, export_lights=False)
    data = open(path, 'rb').read()
    j = json.loads(data[20:20 + struct.unpack('<I', data[12:16])[0]])
    nodes = j['nodes']
    padre = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}
    fallos, filas, lo, hi, tris, verts = [], [], [1e9] * 3, [-1e9] * 3, 0, 0
    for i, nd in enumerate(nodes):
        t, k = Vector(nd.get('translation', (0, 0, 0))), i
        while k in padre:
            k = padre[k]
            t += Vector(nodes[k].get('translation', (0, 0, 0)))
        r = nd.get('rotation', [0, 0, 0, 1])
        if max(abs(r[0]), abs(r[1]), abs(r[2])) > 1e-4:
            fallos.append(f'{nd["name"]} tiene rotación')
        if any(abs(s - 1) > 1e-4 for s in nd.get('scale', [1, 1, 1])):
            fallos.append(f'{nd["name"]} tiene escala')
        nt = 0
        if 'mesh' in nd:
            for p in j['meshes'][nd['mesh']]['primitives']:
                acc = j['accessors'][p['attributes']['POSITION']]
                nt += j['accessors'][p['indices']]['count'] // 3
                verts += acc['count']
                for a in range(3):
                    lo[a], hi[a] = min(lo[a], acc['min'][a] + t[a]), max(hi[a], acc['max'][a] + t[a])
                if 'COLOR_0' not in p['attributes']:
                    fallos.append(f'{nd["name"]} salió sin COLOR_0')
        tris += nt
        filas.append({'nodo': nd['name'], 'padre': nodes[padre[i]]['name'] if i in padre else None,
                      'pivote_local': [round(v, 3) for v in nd.get('translation', (0, 0, 0))], 'tris': nt})
    raiz = [f for f in filas if f['padre'] is None]
    if len(raiz) != 1 or raiz[0]['nodo'] != nombre:
        fallos.append(f'la raíz debe ser un solo nodo llamado {nombre}: {[f["nodo"] for f in raiz]}')
    if tris > max_tris:
        fallos.append(f'{tris} triángulos, más de {max_tris}')
    if len(data) > max_bytes:
        fallos.append(f'{len(data)} bytes, más de {max_bytes}')
    if j.get('images') or j.get('textures'):
        fallos.append('lleva imágenes y no debería')
    if j.get('extensionsRequired'):
        fallos.append('pide extensiones obligatorias')
    if abs(lo[1] - piso) > .03:   # piso > 0: figuras que se recogen y flotan, como las de hoy
        fallos.append(f'la base debería estar en y = {piso} y está en {lo[1]:.3f}')
    med = {'archivo': nombre + '.glb', 'bytes': len(data), 'tris': tris, 'vertices': verts,
           'materiales': [m.get('name') for m in j.get('materials', [])],
           'caja_juego_min': [round(v, 3) for v in lo], 'caja_juego_max': [round(v, 3) for v in hi],
           'nodos': filas, 'fallos': fallos}
    print(f'== {nombre}: {len(data)} bytes, {tris} tri, {verts} vért, materiales {med["materiales"]}')
    print(f'   caja en ejes del JUEGO (x, y arriba, z; frente = -z): {med["caja_juego_min"]} .. {med["caja_juego_max"]}')
    for f in filas:
        print(f'   nodo {f["nodo"]:10s} padre {str(f["padre"]):10s} pivote local {f["pivote_local"]}  {f["tris"]} tri')
    print('   CHEQUEO:', 'TODO BIEN' if not fallos else 'FALLAS: ' + '; '.join(fallos))
    return med


def vistas(nombre, pose=None):
    """Hoja de 4 vistas con Workbench (1 s): sirve para FORMA, no para color (eso se mira en visor_props.html)."""
    sc = bpy.context.scene
    obs = [o for o in sc.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    c, R = (lo + hi) / 2, (hi - lo).length / 2
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light, sh.color_type, sh.show_cavity, sh.show_shadows = 'STUDIO', 'VERTEX', True, True
    sh.show_backface_culling = True     # para ver caras volteadas como las vería el juego
    sc.display.render_aa = '8'
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w')
    w.color = (.55, .62, .70)
    sc.world = w
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.lens = 60
    W, H = 520, 420
    sc.render.resolution_x, sc.render.resolution_y = W, H
    import numpy as np
    hoja = np.zeros((H * 2, W * 2, 4), dtype=np.float32)
    os.makedirs(VIS, exist_ok=True)
    VIEWS = (('juego (atrás y arriba)', (0, -2.3, 2.2), False), ('tres cuartos', (1.9, 2.3, 1.3), False),
             ('lado', (3.2, .0, .5), False), ('arriba' if not pose else 'pose', (0, -.02, 3.3) if not pose else (-2.1, 2.0, 1.5), True))
    for k, (_, d, posar) in enumerate(VIEWS):
        for name, rot in (pose or {}).items():
            bpy.data.objects[name].rotation_euler = rot if posar else (0, 0, 0)
        cam.location = c + Vector(d) * R
        cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(VIS, f'_{nombre}_{k}.png')
        bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(sc.render.filepath)
        px = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)
        hoja[(1 - k // 2) * H:(2 - k // 2) * H, (k % 2) * W:(k % 2 + 1) * W] = px
        bpy.data.images.remove(im)
        os.remove(sc.render.filepath)
    for name in (pose or {}):
        bpy.data.objects[name].rotation_euler = (0, 0, 0)
    out = bpy.data.images.new('hoja', W * 2, H * 2, alpha=True)
    out.pixels.foreach_set(hoja.ravel())
    out.filepath_raw, out.file_format = os.path.join(VIS, f'{nombre}_blender.png'), 'PNG'
    out.save()


# ====================== COCODRILO ======================
def cocodrilo():
    mat = nueva_escena()
    G, D, PANZA = 0x62d24a, 0x3f9a32, 0xf0eaa2   # los verdes de hoy (js/sewer.js) + panza crema
    BOCA, DIENTE, OJO = 0xc93a55, 0xfffbea, 0xffe14f
    ZC = .20   # altura del "ecuador" del cuerpo; la panza queda casi plana en z = .04

    def interp(tabla, y):
        for (y0, *a), (y1, *b) in zip(tabla, tabla[1:]):
            if y0 <= y <= y1:
                t = (y - y0) / (y1 - y0)
                return [p + (q - p) * t for p, q in zip(a, b)]
        return tabla[0][1:] if y < tabla[0][0] else tabla[-1][1:]

    def lomo(tabla, y, x, n=2.4, zc=ZC):   # altura de la piel de arriba en (x, y): para sentar crestas y ojos
        w, top = interp(tabla, y)
        return zc + (top - zc) * max(0, 1 - abs(x / w) ** n) ** (1 / n)

    D2 = 0x2a8426   # franjas y crestas: en el visor el verde D casi no se distinguía del cuerpo (intento v2)

    def piel_de(tabla, zc_de, z0=.10, z1=.24):
        """Panza crema, flanco verde y franjas oscuras en el lomo: un anillo sí y uno no. El color va por vértice, así
        que la franja se decide por el anillo al que pertenece el vértice (su y) y por qué tan arriba está en él."""
        info = {round(y, 3): (i, zc_de(y), top) for i, (y, w, top) in enumerate(tabla)}

        def f(co, cf):
            c = mez(PANZA, G, paso(co.z, z0, z1))
            i, zc, top = info.get(round(co.y, 3), (0, 0, 9))
            h = (co.z - zc) / max(top - zc, 1e-6)
            return mez(c, D2, (.10 + .78 * (i % 2)) * paso(h, .15, .55))
        return f

    def cresta(p, base, alto, r, aplasta=(.55, 1)):
        z0 = base[2]
        p.cono(base, (0, -.18, 1), alto, r, lambda co, cf: mez(D2, D, paso(co.z, z0 + alto * .3, z0 + alto)),
               seg=4, aplasta=aplasta)

    # ---- cuerpo (malla estática, nodo raíz) ----
    CUERPO = [(-1.45, .23, .38), (-1.20, .44, .54), (-.95, .57, .63), (-.70, .66, .69), (-.45, .72, .73), (-.20, .74, .75),
              (.05, .74, .75), (.30, .71, .72), (.55, .64, .67), (.78, .55, .60), (.98, .46, .52), (1.15, .37, .44)]
    p = Pieza()
    p.loft([anillo((0, y, ZC), w, top - ZC, ZC - .04, 2.4, 4, seg=12) for y, w, top in CUERPO],
           piel_de(CUERPO, lambda y: ZC), tapas=((0, -1.58, ZC), (0, 1.28, ZC)))
    # mandíbula de abajo: fija, pegada al piso; por encima es el interior de la boca
    CABEZA = [(.78, .44, .52), (1.00, .62, .62), (1.26, .66, .61), (1.52, .52, .47), (1.80, .41, .39),
              (2.10, .38, .36), (2.32, .41, .40), (2.47, .31, .34)]
    p.loft([anillo((0, y, .13), w - .035, .06, .09, 5, 2.4, seg=8) for y, w, _ in CABEZA[1:]],
           lambda co, cf: BOCA if cf.z > .175 else mez(PANZA, G, paso(co.z, .08, .2)), tapas=('plano', (0, 2.53, .13)))
    for s in (-1, 1):   # dientes de abajo: dentro de la boca, se ven al abrir
        for y in (1.62, 1.90, 2.15, 2.36):
            p.cono((s * (interp(CABEZA, y)[0] - .12), y, .17), (0, 0, 1), .13, .055, DIENTE)
    # crestas del lomo: una fila grande al centro y dos chicas a los lados, intercaladas
    for i in range(8):
        y = -1.25 + i * .31
        cresta(p, (0, y, lomo(CUERPO, y, 0) - .05), .20 + .08 * math.sin(i / 7 * math.pi), .20)
        for s in (-1, 1):
            if i < 7:
                ys = y + .155
                cresta(p, (s * .34, ys, lomo(CUERPO, ys, .34) - .04), .14, .13)
    # patas abiertas, con tres dedos
    for s in (-1, 1):
        for y, k in ((.55, 1), (-.88, 1.15)):
            p.esfera((s * .74, y, .21), (.30 * k, .22 * k, .18 * k), lambda co, cf: mez(D, G, paso(co.z, .08, .3)), 8, 5)
            p.esfera((s * .90, y + .13, .08), (.16 * k, .23 * k, .08), D, 8, 4)
            for a in (-.5, 0, .5):
                d = Vector((s * (.35 + a * .5), 1, 0)).normalized()
                p.cono(Vector((s * .90, y + .13, .055)) + d * .16 * k + Vector((s * a * .12, 0, 0)), d, .15, .065, DIENTE,
                       aplasta=(1, .7))
    cuerpo = objeto('cocodrilo', p, mat, filo=60)

    # ---- quijada de arriba con los ojos (nodo jaw): se levanta girando en X sobre la nuca ----
    JAW = (0, .98, .22)
    p = Pieza()
    ZJ = .27
    p.loft([anillo((0, y, ZJ), w, top - ZJ, .07, 2.4, 5, seg=12) for y, w, top in CABEZA],
           lambda co, cf: BOCA if (cf.z < .215 and cf.y > 1.0) else mez(mez(PANZA, G, paso(co.z, .21, .30)), D, .3 * paso(co.z, .40, .58)),
           tapas=((0, .68, ZJ), (0, 2.55, ZJ)))
    for s in (-1, 1):
        # ojos saltones: bola amarilla, párpado verde que la tapa por atrás y arriba, pupila en rendija
        c = Vector((s * .36, 1.14, lomo(CABEZA, 1.14, .36, zc=ZJ) + .09))
        e = Vector((s * .50, .85, .12)).normalized()
        p.esfera(c, .22, OJO, 10, 6)
        p.esfera(c - e * .085 + Vector((0, 0, .04)), .24, lambda co, cf: mez(G, D, .5 * paso(co.z, c.z, c.z + .24)), 10, 6)
        p.esfera(c + e * .19, (.06, .04, .15), 0x111111, 6, 4, rot=hacia(e, (0, 1, 0)))
        p.esfera((s * .15, 2.36, lomo(CABEZA, 2.36, .15, zc=ZJ)), (.085, .095, .07), D, 6, 4)   # narices
        # dientes de arriba: cuelgan por fuera, se ven con la boca cerrada
        for y in (1.46, 1.66, 1.86, 2.06, 2.24, 2.40):
            p.cono((s * (interp(CABEZA, y)[0] - .03), y, .24), (s * .12, 0, -1), .17, .065, DIENTE)
    for x in (-.13, .13):
        p.cono((x, 2.50, .24), (0, .15, -1), .15, .06, DIENTE)
    jaw = objeto('jaw', p, mat, JAW, cuerpo, filo=60)

    # ---- cola en dos tramos (tail > tail_tip): se menea girando en Z de Blender (Y del juego) ----
    COLA = [(-2.85, .03, .16), (-2.62, .06, .26), (-2.35, .10, .34), (-2.08, .15, .41), (-1.84, .21, .46),
            (-1.60, .28, .50), (-1.38, .36, .53), (-1.20, .43, .55), (-1.05, .46, .56)]

    def tramo(y0, y1, punta0, punta1, seg):
        q = Pieza()
        secs = [s for s in COLA if y0 - 1e-6 <= s[0] <= y1 + 1e-6]
        zc = lambda y: .12 + .08 * paso(y, -2.85, -1.2)
        q.loft([anillo((0, y, zc(y)), w, top - zc(y), zc(y) - .04, 2.2, 3, seg=seg) for y, w, top in secs],
               piel_de(COLA, zc, .05, .13), tapas=(punta0, punta1))
        y = y1 - .14
        while y > y0 + .05:
            k = paso(y, -2.9, -1.0)
            cresta(q, (0, y, interp(COLA, y)[1] - .04), .10 + .18 * k, .07 + .11 * k, aplasta=(.5, 1))
            y -= .24
        return q

    TAIL, TIP = (0, -1.25, .22), (0, -2.0, .20)
    tail = objeto('tail', tramo(-2.08, -1.05, (0, -2.20, .2), (0, -.92, .22), 10), mat, TAIL, cuerpo, filo=60)
    objeto('tail_tip', tramo(-2.85, -1.84, (0, -2.93, .12), (0, -1.72, .2), 8), mat, TIP, tail, filo=60)
    return {'pose': {'jaw': (math.radians(30), 0, 0), 'tail': (0, 0, .35), 'tail_tip': (0, 0, .35)}}


# ====================== RATÓN ======================
def raton():
    mat = nueva_escena()
    GRIS, GRIS2, BLANCO, ROSA, ROSA2 = 0xc9ccd6, 0xa9adba, 0xf4f4f8, 0xffa6c1, 0xf07fa2
    p = Pieza()
    #        y     w    top   zc
    SEC = [(-.38, .20, .40, .24), (-.24, .31, .55, .27), (-.04, .35, .61, .28), (.16, .32, .58, .28),
           (.33, .26, .51, .28), (.47, .20, .44, .27), (.60, .13, .36, .26), (.69, .07, .30, .25)]
    p.loft([anillo((0, y, zc), w, top - zc, zc - .045, 2, 2.6, seg=10) for y, w, top, zc in SEC],
           lambda co, cf: mez(mez(BLANCO, GRIS, paso(co.z, .08, .26)), GRIS2, .5 * paso(co.z, .42, .62) * paso(-co.y, -.5, .1)),
           tapas=((0, -.45, .24), (0, .75, .25)))
    for s in (-1, 1):
        c = Vector((s * .26, .40, .67))   # orejas grandes y redondas: lo que más se lee desde atrás
        p.esfera(c, (.225, .05, .225), lambda co, cf: mez(ROSA, GRIS, paso((co - c).length, .16, .22)), 12, 4,
                 rot=(-12, s * 22, s * -14), polo='Y')
        p.esfera((s * .125, .575, .40), .048, 0x15151a, 6, 4)                       # ojos
        p.esfera((s * .19, .34, .04), (.065, .11, .04), ROSA, 6, 3)                 # manos
        p.esfera((s * .25, -.20, .045), (.085, .15, .045), ROSA, 6, 3)              # patas
    p.esfera((0, .755, .255), .052, ROSA2, 6, 4)                                    # nariz
    p.tubo([(0, -.40, .17), (.05, -.58, .08), (.15, -.76, .05), (.14, -.94, .05), (.02, -1.08, .06), (-.06, -1.20, .11)],
           [.045, .042, .036, .03, .024, .014], ROSA, seg=4)                        # cola en ese
    objeto('raton', p, mat, filo=70)
    return {}


# ====================== MONEDA DE HUELLA ======================
def moneda():
    mat = nueva_escena()
    ORO, BORDE, CANTO, HUELLA = 0xffc21a, 0xffd955, 0xe8a00c, 0xc97f06
    R, E, ZC = .46, .065, 1.0      # radio, medio grosor, altura del centro (flota como la de hoy)
    p = Pieza()
    # el eje del torno (Z local) se acuesta sobre Y: las caras miran adelante y atrás, y gira sobre la vertical
    perfil = [(0, E - .02), (R - .11, E - .02), (R - .085, E), (R - .02, E), (R, E - .025),
              (R, -E + .025), (R - .02, -E), (R - .085, -E), (R - .11, -E + .02), (0, -E + .02)]
    p.torno(perfil, lambda co, cf: CANTO if abs(cf.y) < E - .024 else (BORDE if (cf - Vector((0, 0, ZC))).length > R - .10 else ORO),
            seg=20, centro=(0, 0, ZC), rot=(-90, 0, 0))
    for s in (-1, 1):   # la huella, en relieve, por las dos caras
        y0 = s * (E - .03)
        p.cono((0, y0, ZC - .085), (0, s, 0), .035, 1, HUELLA, seg=8, r2=.8, tapa=True, aplasta=(.165, .125), plano=False)
        for x, z, r in ((-.21, .06, .062), (-.075, .185, .07), (.075, .185, .07), (.21, .06, .062)):
            p.cono((x, y0, ZC + z), (0, s, 0), .035, r, HUELLA, seg=6, r2=r * .8, tapa=True, plano=False)
    objeto('moneda', p, mat, filo=35)
    return {}


# ====================== GALLINA ======================
def gallina():
    mat = nueva_escena()
    BL, CREMA, SOMBRA, ROJO, PICO, PATA = 0xf7f2ea, 0xeadfcc, 0xd6c9b4, 0xd8322a, 0xf2a020, 0xf28c1c
    p = Pieza()
    #        y     w    top  abajo
    SEC = [(-.40, .17, .80, .52), (-.28, .31, .85, .35), (-.10, .39, .88, .26), (.10, .40, .89, .24),
           (.27, .35, .90, .28), (.40, .24, .87, .40)]
    p.loft([anillo((0, y, (top + ab) / 2 - .04), w, top - (top + ab) / 2 + .04, (top - ab) / 2 - .04, 2, 2.2, seg=12)
            for y, w, top, ab in SEC],
           lambda co, cf: mez(CREMA, BL, paso(co.z, .24, .5)), tapas=((0, -.49, .68), (0, .49, .64)))
    # cuello: anillos horizontales que suben del pecho a la cabeza (con una bola encima parecía muñeco de nieve, intento v2)
    p.loft([anillo((0, y, z), w, d, seg=10, arr=(0, 1, 0)) for y, z, w, d in
            ((.17, .66, .31, .27), (.26, .80, .245, .225), (.34, .93, .20, .195), (.39, 1.03, .185, .185))], BL)
    p.esfera((0, .41, 1.08), .205, BL, 12, 8)                                           # cabeza
    for y, z, r in ((.52, 1.27, .085), (.41, 1.32, .105), (.29, 1.27, .085)):           # cresta
        p.esfera((0, y, z), (.065, r, r * 1.15), ROJO, 8, 5)
    p.cono((0, .57, 1.08), (0, 1, -.12), .20, .085, PICO, seg=5, plano=False, aplasta=(1, .8))       # pico
    p.cono((0, .57, 1.03), (0, 1, -.30), .13, .06, 0xd98a14, seg=5, plano=False, aplasta=(1, .6))
    for s in (-1, 1):
        p.esfera((s * .035, .565, .935), (.04, .045, .075), ROJO, 6, 4)                 # barbas
        p.esfera((s * .155, .50, 1.13), .042, 0x15151a, 6, 4)                           # ojos
        p.esfera((s * .385, .0, .57), (.07, .29, .20), lambda co, cf: mez(CREMA, SOMBRA, paso(-co.y, .0, .3)), 8, 5,
                 rot=(-12, 0, s * 6))                                                    # alas
        # patas y dedos
        p.cono((s * .13, .03, .03), (0, 0, 1), .26, .032, PATA, seg=5, r2=.032, plano=False)
        for a in (-35, 0, 35):
            d = Vector((math.sin(math.radians(a)) + s * .1, math.cos(math.radians(a)), 0))
            p.cono((s * .13, .03, .028), d, .17, .035, PATA, seg=4, plano=False, aplasta=(1, .6))
        p.cono((s * .13, .03, .028), (0, -1, 0), .09, .03, PATA, seg=4, plano=False, aplasta=(1, .6))
    base = Vector((0, -.40, .72))                                                        # cola: abanico de 5 plumas
    for a, largo in ((-50, .36), (-25, .46), (0, .52), (25, .46), (50, .36)):
        d = (Matrix.Rotation(math.radians(20), 3, "X") @ Matrix.Rotation(math.radians(a), 3, "Y")) @ Vector((0, 0, 1))
        ancho = d.cross(Vector((0, 1, 0))).normalized()          # la pluma se aplana mirando hacia atrás
        M = Matrix((ancho, d.cross(ancho), d)).transposed()
        p.esfera(base + d * largo * .55, (.085, .05, largo * .55),
                 lambda co, cf: mez(BL, SOMBRA, paso((co - base).length, .25, .5)), 8, 5, rot=M)
    objeto('gallina', p, mat, filo=70)
    return {}


# ====================== PESCADO ======================
def pescado():
    mat = nueva_escena()
    AZUL, LOMO, PANZA, ALETA = 0x6fb7e8, 0x3f8fd0, 0xf2fbff, 0x2f78c0
    ZC = .52      # flota a media altura, como el de hoy
    p = Pieza()
    #        y     w     h
    SEC = [(-.52, .04, .08), (-.42, .075, .14), (-.25, .135, .23), (-.02, .19, .30), (.22, .20, .31),
           (.42, .16, .23), (.55, .09, .12)]
    p.loft([anillo((0, y, ZC), w, h, seg=12) for y, w, h in SEC],
           lambda co, cf: mez(mez(PANZA, AZUL, paso(co.z, ZC - .23, ZC - .02)), LOMO, paso(co.z, ZC + .07, ZC + .27)),
           tapas=((0, -.56, ZC), (0, .63, ZC)))
    for s in (-1, 1):
        p.esfera((0, -.67, ZC + s * .15), (.03, .20, .12), ALETA, 8, 4, rot=(s * -38, 0, 0))         # cola en V
        p.esfera((s * .21, .13, ZC - .11), (.022, .14, .08), ALETA, 6, 4, rot=(20, 0, s * 32))       # aletas de pecho
        p.esfera((s * .135, .43, ZC + .08), .078, 0xffffff, 8, 5)                                    # ojos
        p.esfera((s * .182, .447, ZC + .08), (.035, .048, .048), 0x101018, 6, 4)
    p.esfera((0, .0, ZC + .31), (.025, .23, .14), ALETA, 8, 4, rot=(-22, 0, 0))                      # aleta del lomo
    objeto('pescado', p, mat, filo=70)
    return {}


# ====================== CANECA ======================
def caneca():
    mat = nueva_escena()
    V, V2, V3, FONDO, GRIS = 0x2fa25c, 0x23804a, 0x48c078, 0x10261a, 0xc9ccd6
    H, RB, RT = 1.25, .50, .60      # alto del cuerpo, radio abajo, radio arriba
    rad = lambda z: RB + (RT - RB) * z / H
    p = Pieza()
    perfil = [(0, 0), (RB - .02, 0), (RB, .03)]
    for z in (.32, .64, .96):       # tres aros en relieve
        perfil += [(rad(z - .05), z - .05), (rad(z) + .03, z - .025), (rad(z) + .03, z + .025), (rad(z + .05), z + .05)]
    perfil += [(RT, H - .07), (RT + .045, H - .06), (RT + .045, H), (RT - .03, H),          # borde
               (RT - .05, H - .06), (RB - .04, .08), (0, .08)]                              # pared de adentro y fondo
    aro = lambda z: any(abs(z - k) < .04 for k in (.32, .64, .96))

    def color(co, cf):
        r = math.hypot(cf.x, cf.y)
        if r < rad(cf.z) - .02 and cf.z > .04:
            return mez(FONDO, V2, paso(co.z, .5, H))       # interior: oscuro, se aclara hacia la boca
        if cf.z > H - .075:
            return V3
        return V2 if aro(cf.z) else mez(V2, V, paso(co.z, 0, .25))
    p.torno(perfil, color, seg=20)
    for s in (-1, 1):   # asas a los lados
        x = s * (rad(.86) + .0)
        p.tubo([(x - s * .02, 0, .98), (x + s * .09, 0, .96), (x + s * .11, 0, .86), (x + s * .09, 0, .76), (x - s * .02, 0, .74)],
               [.028] * 5, GRIS, seg=4, arr=(0, 1, 0))
    HINGE = (0, RT + .055, H + .0)     # bisagra del lado de ADELANTE (+Y): la tapa abre alejándose de la cámara
    p.caja((0, RT + .05, H - .05), (.26, .09, .13), GRIS, bisel=.02)
    cuerpo = objeto('caneca', p, mat)

    p = Pieza()
    RL = RT + .085
    p.torno([(0, H - .01), (RL - .03, H - .01), (RL, H - .01), (RL, H + .04), (RL - .06, H + .085), (RL * .62, H + .16),
             (RL * .26, H + .205), (0, H + .215)],
            lambda co, cf: V2 if cf.z < H + .0 else (V2 if math.hypot(cf.x, cf.y) > RL - .035 else mez(V, V3, paso(co.z, H + .05, H + .21))),
            seg=20)
    p.tubo([(-.15, 0, H + .17), (-.13, 0, H + .29), (0, 0, H + .33), (.13, 0, H + .29), (.15, 0, H + .17)], [.03] * 5, GRIS,
           seg=4, arr=(0, 1, 0))
    objeto('lid', p, mat, HINGE, cuerpo)
    return {'pose': {'lid': (math.radians(-105), 0, 0)}}


# ====================== CARRO (ñapa) ======================
def carro():
    """Carro genérico visto por detrás. La lata va en un nodo aparte (`pintura`, material 'pintura', casi blanca) para
    que el juego la tiña con el color de cada variante (CAR_COLORS en js/core.js) sin duplicar el archivo."""
    mat = nueva_escena()
    pint = mat.copy()
    pint.name = 'pintura'
    VID, VID2, LLANTA, RIN, GRIS, FARO, STOP = 0x23283a, 0x4d6088, 0x15151a, 0xc9ccd6, 0x8a8f9a, 0xfff2a8, 0xff3030
    q = Pieza()
    #         y     w    abajo arriba
    CASCO = [(-2.08, .90, .52, 1.02), (-1.96, 1.04, .44, 1.17), (-1.30, 1.10, .40, 1.24), (0, 1.10, .40, 1.26),
             (1.10, 1.10, .40, 1.22), (1.85, 1.04, .44, 1.10), (2.08, .90, .52, .96)]
    q.loft([anillo((0, y, (a + b) / 2), w, (b - a) / 2, nu=5, seg=16) for y, w, a, b in CASCO],
           lambda co, cf: mez(0xb8b8b8, 0xffffff, paso(co.z, .40, .75)))
    q.loft([anillo((0, -.15, z), w, d, nu=4, seg=16, arr=(0, 1, 0)) for z, w, d in
            ((1.70, .95, 1.14), (1.86, .92, 1.08), (1.96, .80, .94))], 0xffffff)                 # techo
    p = Pieza()
    p.loft([anillo((0, -.15, z), w, d, nu=4, seg=16, arr=(0, 1, 0)) for z, w, d in ((1.15, 1.0, 1.40), (1.74, .90, 1.08))],
           lambda co, cf: mez(VID, VID2, paso(co.z, 1.2, 1.75)), tapas=(None, None))             # vidrios
    for s in (-1, 1):
        for y in (-1.3, 1.3):
            p.cono((s * .86, y, .40), (s, 0, 0), .30, .40, LLANTA, seg=12, r2=.40, tapa=True, plano=False)
            p.cono((s * 1.155, y, .40), (s, 0, 0), .025, .21, RIN, seg=8, r2=.17, tapa=True)
        p.esfera((s * .68, 2.04, .86), (.24, .10, .15), FARO, 8, 4)
        p.esfera((s * .68, -2.05, .90), (.27, .10, .16), STOP, 8, 4)                             # stops: lo que se ve
    for y in (2.06, -2.06):
        p.caja((0, y, .56), (1.9, .20, .16), GRIS, bisel=.04)
    p.caja((0, -2.15, .80), (.50, .03, .20), 0xf4f4f4)                                           # placa
    raiz = objeto('carro', p, mat, filo=50)
    ob = objeto('pintura', q, mat, (0, 0, 0), raiz, filo=50)
    ob.data.materials.clear()
    ob.data.materials.append(pint)
    return {}


# ====================== VALLA DE OBRA (ñapa) ======================
def valla():
    mat = nueva_escena()
    BLANCO, NARANJA, PATA, LUZ = 0xffffff, 0xf26a1b, 0x4a5060, 0xffc21a
    p = Pieza()
    L, G = 1.40, .07

    def tablero(zc, alto, n):
        z0, z1, ancho, sesgo = zc - alto / 2, zc + alto / 2, 2 * L / n, alto * .7
        for cara in (1, -1):      # las franjas van por las dos caras: se ve desde atrás y desde adelante
            for i in range(-2, n + 1):
                x = -L + i * ancho
                poly = recorta([(x, z0), (x + ancho, z0), (x + ancho + sesgo, z1), (x + sesgo, z1)], -L, L)
                if poly:
                    p.poligono([(px, cara * G / 2, pz) for px, pz in poly], NARANJA if i % 2 else BLANCO, (0, cara, 0))
        for a, b, nrm in (((-L, z1), (L, z1), (0, 0, 1)), ((-L, z0), (L, z0), (0, 0, -1))):   # cantos
            p.poligono([(a[0], -G / 2, a[1]), (b[0], -G / 2, b[1]), (b[0], G / 2, b[1]), (a[0], G / 2, a[1])], BLANCO, nrm)
        for x in (-L, L):
            p.poligono([(x, -G / 2, z0), (x, G / 2, z0), (x, G / 2, z1), (x, -G / 2, z1)], BLANCO, (sgn(x), 0, 0))
    tablero(.84, .42, 7)
    tablero(.38, .24, 7)
    for x in (-1.20, 1.20):
        for s in (-1, 1):       # patas en A
            p.caja((x, s * .17, .53), (.10, .09, 1.12), PATA, rot=(s * 17, 0, 0))
        p.esfera((x, 0, 1.15), .10, LUZ, 8, 5)
    objeto('valla', p, mat, filo=50)
    return {}


FIGURAS = {  # nombre: (función, máx. triángulos, máx. bytes[, altura a la que flota la base])
    'carro': (carro, 2500, 150_000), 'valla': (valla, 600, 150_000),
    'cocodrilo': (cocodrilo, 2500, 300_000), 'raton': (raton, 600, 150_000), 'moneda': (moneda, 600, 150_000, .54),
    'gallina': (gallina, 2500, 150_000), 'pescado': (pescado, 2500, 150_000, .21), 'caneca': (caneca, 2500, 150_000),
}

if __name__ == '__main__':
    pedidas = [a for a in ARGS if a in FIGURAS] or list(FIGURAS)
    medidas, malas = {}, []
    mpath = os.path.join(OUT, '_medidas.json')
    if os.path.exists(mpath):
        medidas = json.load(open(mpath, encoding='utf-8'))
    for nombre in pedidas:
        fn, mt, mb, *piso = FIGURAS[nombre]
        t = time.time()
        extra = fn()
        medidas[nombre] = exporta(nombre, mt, mb, *piso)
        if medidas[nombre]['fallos']:
            malas.append(nombre)
        if 'rapido' not in ARGS:
            vistas(nombre, extra.get('pose'))
        print(f'   {nombre} en {time.time() - t:.1f} s')
    json.dump(medidas, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'LISTO en {time.time() - T0_:.0f} s', 'FALLAS EN: ' + ', '.join(malas) if malas else 'todo bien')
    sys.exit(1 if malas else 0)
