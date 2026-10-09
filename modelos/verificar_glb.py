# Verifica un .glb de personaje contra el contrato de js/models.js, sin abrir ventana.
# Uso:  blender --background --python modelos/verificar_glb.py -- modelos/tinto_v4.glb [otro.glb ...]
# Hace dos cosas por archivo:
#   A) lee el JSON que va dentro del .glb (sin Blender): nodos, jerarquía, rotaciones, materiales, texturas, extensiones
#   B) lo vuelve a importar en un Blender vacío y mide lo que de verdad quedó: triángulos, caja, piso, frente
# Termina con código 1 si algo del contrato falla.
import bpy, sys, os, json, struct
from mathutils import Vector

# hijo -> padre que exige el juego (None = no importa de quién cuelgue, pero debe existir)
CONTRATO = {'body': None, 'torso': 'body', 'head': 'body', 'ear_L': 'head', 'ear_R': 'head', 'panuelo': 'body',
            'knot': 'panuelo', 'tail': 'body', 'tail_tip': 'tail', 'leg_FL': 'body', 'leg_FR': 'body',
            'leg_BR': 'body', 'leg_BL': 'body'}
MAX_BYTES = 1_500_000
files = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
fallos = []


def mal(f, msg):
    fallos.append(f'{os.path.basename(f)}: {msg}')
    print('   FALLA:', msg)


for f in files:
    print(f'\n===== {f} =====')
    data = open(f, 'rb').read()
    magic, version, total = struct.unpack('<4sII', data[:12])
    n = struct.unpack('<I', data[12:16])[0]
    j = json.loads(data[20:20 + n])
    print(f'A) tamaño {len(data)} bytes ({len(data) / 1e6:.2f} MB), glTF {version}, generador: {j["asset"].get("generator")}')
    if len(data) > MAX_BYTES:
        mal(f, f'pesa más de {MAX_BYTES} bytes')
    nodes = j['nodes']
    parent = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}
    by_name = {nd.get('name'): i for i, nd in enumerate(nodes)}
    print('   nodo        padre      traslación (glTF: +Y arriba, -Z frente)')
    for name, want in CONTRATO.items():
        if name not in by_name:
            mal(f, f'falta el nodo {name}')
            continue
        nd = nodes[by_name[name]]
        p = nodes[parent[by_name[name]]]['name'] if by_name[name] in parent else '-'
        print(f'   {name:10s}  {p:9s}  {[round(v, 3) for v in nd.get("translation", [0, 0, 0])]}')
        if want and p != want:
            mal(f, f'{name} cuelga de {p}, debería colgar de {want}')
        r = nd.get('rotation', [0, 0, 0, 1])
        if max(abs(r[0]), abs(r[1]), abs(r[2])) > 1e-4:
            mal(f, f'{name} tiene rotación en reposo {r}')
        if any(abs(s - 1) > 1e-4 for s in nd.get('scale', [1, 1, 1])):
            mal(f, f'{name} tiene escala {nd["scale"]}')
    extra = [nd.get('name') for nd in nodes if nd.get('name') not in CONTRATO]
    print('   nodos extra:', extra)
    tris = prims = 0
    attrs = set()
    for m in j.get('meshes', []):
        for p in m['primitives']:
            prims += 1
            attrs |= set(p['attributes'])
            tris += j['accessors'][p['indices']]['count'] // 3
    print(f'   {len(j.get("meshes", []))} mallas, {prims} primitivas (≈ llamadas de dibujo), {tris} triángulos, atributos {sorted(attrs)}')
    for m in j.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        usa = [k for k in ('baseColorTexture', 'metallicRoughnessTexture') if k in pbr] + [k for k in ('normalTexture', 'occlusionTexture', 'emissiveTexture') if k in m]
        print(f'   material {m.get("name"):10s} doble cara={m.get("doubleSided", False)}  texturas={usa}  extensiones={list(m.get("extensions", {}))}')
    for im in j.get('images', []):
        if 'bufferView' in im:
            print(f'   imagen {im.get("name")}: {im.get("mimeType")}, {j["bufferViews"][im["bufferView"]]["byteLength"]} bytes, DENTRO del archivo')
        else:
            mal(f, f'imagen {im.get("name")} va por fuera ({im.get("uri", "")[:40]})')
    print('   extensiones usadas:', j.get('extensionsUsed', []), ' requeridas:', j.get('extensionsRequired', []))
    if j.get('extensionsRequired'):
        mal(f, 'pide extensiones obligatorias; el GLTFLoader del juego puede no tenerlas')

    # B) reimportar
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(f))
    obs = {o.name: o for o in bpy.context.scene.objects}
    lo, hi = Vector((9, 9, 9)), Vector((-9, -9, -9))
    t = 0
    for o in obs.values():
        if o.type != 'MESH':
            continue
        t += sum(len(p.vertices) - 2 for p in o.data.polygons)
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    print(f'B) reimportado en Blender {bpy.app.version_string}: {len(obs)} objetos, {t} triángulos')
    print(f'   caja (Blender: X lateral, Y frente, Z arriba): {[round(v, 2) for v in lo]} .. {[round(v, 2) for v in hi]}')
    if abs(lo.z) > .05:
        mal(f, f'las patas no pisan el suelo: z mínima = {lo.z:.3f}')
    for name, want in CONTRATO.items():
        o = obs.get(name)
        if not o:
            mal(f, f'tras reimportar no existe {name}')
        elif want and (not o.parent or o.parent.name != want):
            mal(f, f'tras reimportar {name} cuelga de {o.parent.name if o.parent else None}')
    if 'head' in obs and 'tail' in obs:
        hy, ty = obs['head'].matrix_world.translation.y, obs['tail'].matrix_world.translation.y
        print(f'   cabeza en Y={hy:.2f}, cola en Y={ty:.2f} ->', 'mira hacia +Y de Blender (= -Z del juego), bien' if hy > ty else 'MIRA AL REVÉS')
        if hy <= ty:
            mal(f, 'el personaje mira hacia atrás')
    if 'ear_L' in obs and obs['ear_L'].matrix_world.translation.x > 0:
        mal(f, 'ear_L quedó del lado +X (la izquierda del gato es -X en Blender)')
    for im in bpy.data.images:
        if im.size[0]:
            print(f'   imagen {im.name}: {im.size[0]}x{im.size[1]}, empaquetada={bool(im.packed_file)}, espacio={im.colorspace_settings.name}')
    for o in obs.values():
        if o.type == 'MESH' and o.data.color_attributes:
            print(f'   {o.name}: color por vértice {[a.name for a in o.data.color_attributes]}')

print('\n' + ('TODO BIEN' if not fallos else 'FALLAS:\n  ' + '\n  '.join(fallos)))
sys.exit(1 if fallos else 0)
