# Prueba B: ¿qué sobrevive al exportador glTF de Blender 4.5? Cada caso exporta un cubo y mira el JSON del .glb.
import bpy, os, json, struct, tempfile
TMP = tempfile.mkdtemp()

def glb_json(path):
    d = open(path, 'rb').read(); n = struct.unpack('<I', d[12:16])[0]; return json.loads(d[20:20 + n]), len(d)

def caso(nombre, armar, **opts):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object
    m = bpy.data.materials.new('m'); m.use_nodes = True; o.data.materials.append(m)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    armar(o, nt, b)
    p = os.path.join(TMP, 'c.glb')
    bpy.ops.export_scene.gltf(filepath=p, export_format='GLB', **opts)
    j, size = glb_json(p)
    prim = j['meshes'][0]['primitives'][0]
    print(f'CASO {nombre}\n   material: {json.dumps(j["materials"][0])}\n   atributos: {sorted(prim["attributes"])}  imágenes: {len(j.get("images", []))}  extensiones: {j.get("extensionsUsed")}')

def ruido(o, nt, b):
    n = nt.nodes.new('ShaderNodeTexNoise'); nt.links.new(n.outputs['Color'], b.inputs['Base Color'])
caso('1 ruido procedural directo al color', ruido)

def rampa(o, nt, b):
    im = bpy.data.images.new('t', 8, 8); t = nt.nodes.new('ShaderNodeTexImage'); t.image = im
    r = nt.nodes.new('ShaderNodeValToRGB'); nt.links.new(t.outputs['Color'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
caso('2 imagen -> rampa de color -> color', rampa)

def vcol(o, nt, b):
    o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    n = nt.nodes.new('ShaderNodeVertexColor'); n.layer_name = 'Col'; nt.links.new(n.outputs['Color'], b.inputs['Base Color'])
caso('3 color por vértice conectado al color', vcol)

def vcol_suelto(o, nt, b):
    o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
caso('4 color por vértice SIN conectar (opción por defecto)', vcol_suelto)
caso('5 color por vértice sin conectar + export_vertex_color=ACTIVE', vcol_suelto, export_vertex_color='ACTIVE')

def brillo(o, nt, b):
    b.inputs['Sheen Weight'].default_value = .6; b.inputs['Coat Weight'].default_value = .5
    b.inputs['Emission Color'].default_value = (1, .5, 0, 1); b.inputs['Emission Strength'].default_value = 2
caso('6 sheen + coat + emisión', brillo)

def toon(o, nt, b):
    t = nt.nodes.new('ShaderNodeBsdfToon'); out = nt.nodes['Material Output']; nt.links.new(t.outputs[0], out.inputs['Surface'])
caso('7 sombreador Toon en vez de Principled', toon)

def unlit(o, nt, b):
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (.2, .6, 1, 1); out = nt.nodes['Material Output']; nt.links.new(e.outputs[0], out.inputs['Surface'])
caso('8 solo sombreador de Emisión', unlit)

# tamaños: el Tinto v4 real con otras opciones de exportación
src = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tinto_v4.glb')
for nombre, opts in (('JPEG 88 (el que se usa)', dict(export_image_format='JPEG', export_image_quality=88)),
                     ('PNG', dict(export_image_format='AUTO')), ('WebP 88', dict(export_image_format='WEBP', export_image_quality=88)),
                     ('JPEG 88 + Draco', dict(export_image_format='JPEG', export_image_quality=88, export_draco_mesh_compression_enable=True))):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    p = os.path.join(TMP, 't.glb')
    bpy.ops.export_scene.gltf(filepath=p, export_format='GLB', **opts)
    j, size = glb_json(p)
    print(f'TAMAÑO {nombre}: {size} bytes; extensiones {j.get("extensionsUsed")} requeridas {j.get("extensionsRequired")}')
