# Prueba A: ¿funciona en modo sin ventana desenvolver UV de varios objetos a un atlas, hornear color/normal/rugosidad
# de un material procedural y exportar a glb con las texturas dentro?
import bpy, bmesh, os, time, json, struct
OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def proc(name, col):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 8
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*col, 1); r.color_ramp.elements[1].color = (1, 1, 1, 1)
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    nt.links.new(n.outputs['Fac'], b.inputs['Roughness'])
    bump = nt.nodes.new('ShaderNodeBump'); nt.links.new(n.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

obs = []
for i, (prim, col) in enumerate(((bpy.ops.mesh.primitive_uv_sphere_add, (.8, 0, 0)), (bpy.ops.mesh.primitive_monkey_add, (0, 0, .8)))):
    prim(location=(i * 3, 0, 0)); o = bpy.context.object; o.data.materials.append(proc(f'm{i}', col)); obs.append(o)
    for p in o.data.polygons: p.use_smooth = True

# 1) UV: todos en modo edición a la vez
bpy.ops.object.select_all(action='DESELECT')
for o in obs: o.select_set(True)
bpy.context.view_layer.objects.active = obs[0]
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
print('SMART', bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.01))
bpy.ops.object.mode_set(mode='OBJECT')
for o in obs:
    uv = o.data.uv_layers.active.data
    us = [d.uv[0] for d in uv]; vs = [d.uv[1] for d in uv]
    print('UV', o.name, round(min(us), 3), round(max(us), 3), round(min(vs), 3), round(max(vs), 3))

# 2) hornear
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4
imgs = {}
for kind, cs in (('color', 'sRGB'), ('normal', 'Non-Color'), ('rug', 'Non-Color')):
    im = bpy.data.images.new('atlas_' + kind, 512, 512, alpha=False); im.colorspace_settings.name = cs; imgs[kind] = im
def target(im):
    for o in obs:
        for m in o.data.materials:
            n = m.node_tree.nodes.get('DEST') or m.node_tree.nodes.new('ShaderNodeTexImage'); n.name = 'DEST'; n.image = im
            m.node_tree.nodes.active = n
for kind, typ, kw in (('color', 'DIFFUSE', dict(pass_filter={'COLOR'})), ('normal', 'NORMAL', {}), ('rug', 'ROUGHNESS', {})):
    target(imgs[kind]); t = time.time()
    print('BAKE', kind, bpy.ops.object.bake(type=typ, margin=8, use_clear=True, **kw), round(time.time() - t, 2), 's')
    px = imgs[kind].pixels[:]; print('  media', [round(sum(px[c::4]) / (len(px) / 4), 3) for c in range(3)])
    imgs[kind].filepath_raw = os.path.join(OUT, f'prueba_a_{kind}.png'); imgs[kind].file_format = 'PNG'; imgs[kind].save()

# 3) material final con las texturas y exportar
fin = bpy.data.materials.new('final'); fin.use_nodes = True; nt = fin.node_tree; b = nt.nodes['Principled BSDF']
def tex(im): n = nt.nodes.new('ShaderNodeTexImage'); n.image = im; return n
nt.links.new(tex(imgs['color']).outputs['Color'], b.inputs['Base Color'])
nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex(imgs['normal']).outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tex(imgs['rug']).outputs['Color'], sep.inputs['Color']); nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
for o in obs: o.data.materials.clear(); o.data.materials.append(fin)
for fmt in ('AUTO', 'JPEG', 'WEBP'):
    p = os.path.join(OUT, f'prueba_a_{fmt}.glb')
    bpy.ops.export_scene.gltf(filepath=p, export_format='GLB', export_image_format=fmt, export_image_quality=80, export_yup=True)
    d = open(p, 'rb').read(); n = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + n])
    print('GLB', fmt, len(d), 'bytes', [(i.get('mimeType'), i.get('name')) for i in j.get('images', [])], j['materials'], j.get('extensionsUsed'))
