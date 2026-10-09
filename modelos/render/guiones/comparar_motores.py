# Misma escena, mismo encuadre, un render por motor, con cronómetro. Deja las imágenes en render/intentos/motores_*.png
# y los tiempos en render/intentos/motores_tiempos.json.
# Uso: blender --background --python modelos/render/guiones/comparar_motores.py [-- ancho]
import bpy, os, sys, time, json, math, traceback
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
RENDER = os.path.dirname(AQUI)
MODELOS = os.path.dirname(RENDER)
OUT = os.path.join(RENDER, 'intentos')
GLB = os.path.join(MODELOS, 'tinto_v4.glb')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RES = int(ARGS[0]) if ARGS else 768

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# ---- escena común: Tinto + piso + tres luces + cámara ----
bpy.ops.import_scene.gltf(filepath=GLB)
# el glb trae +Y arriba; el importador lo devuelve a Z arriba de Blender (mira a +Y)
bpy.ops.mesh.primitive_plane_add(size=14)
piso = bpy.context.object
m = bpy.data.materials.new('piso'); m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.55, .45, .35, 1)
m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .9
piso.data.materials.append(m)


def luz(nombre, tipo, pos, mira, energia, color=(1, 1, 1), size=1.5):
    l = bpy.data.lights.new(nombre, tipo)
    l.energy, l.color = energia, color
    if tipo == 'AREA':
        l.size = size
    o = bpy.data.objects.new(nombre, l)
    col.objects.link(o)
    o.location = pos
    o.rotation_euler = (Vector(mira) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    return o


luz('clave', 'AREA', (2.5, 2.5, 3), (0, .3, .8), 500, (1, .95, .88), 2)
luz('relleno', 'AREA', (-3, 2, 1.5), (0, .3, .8), 150, (.85, .9, 1), 3)
luz('contorno', 'SPOT', (-1, -3, 2.5), (0, 0, .8), 600, (1, 1, 1))
world = bpy.data.worlds.new('w'); world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.5, .6, .75, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .3
scene.world = world
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); col.objects.link(cam)
scene.camera = cam
cam.data.lens = 60
cam.location = (2.3, 3.0, 1.4)
cam.rotation_euler = (Vector((0, .2, .8)) - Vector(cam.location)).to_track_quat('-Z', 'Y').to_euler()
scene.render.resolution_x = scene.render.resolution_y = RES
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'

# ---- qué valores dinámicos acepta esta instalación (los enums "dinámicos" no se listan por bl_rna) ----
def acepta(obj, prop, valores):
    ok = []
    for v in valores:
        try:
            setattr(obj, prop, v); ok.append(v)
        except TypeError:
            pass
    return ok

print('MOTORES aceptados:', acepta(scene.render, 'engine', ['BLENDER_WORKBENCH', 'BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'CYCLES', 'HYDRA_STORM']))
print('VISTAS aceptadas:', acepta(scene.view_settings, 'view_transform', ['Standard', 'Filmic', 'AgX', 'Khronos PBR Neutral', 'Filmic Log', 'AgX Log', 'Raw', 'False Color']))
scene.view_settings.view_transform = 'AgX'
print('LOOKS aceptados:', acepta(scene.view_settings, 'look', ['None', 'AgX - Punchy', 'AgX - Greyscale', 'AgX - Very High Contrast', 'AgX - High Contrast', 'AgX - Medium High Contrast', 'AgX - Base Contrast', 'AgX - Medium Low Contrast', 'AgX - Low Contrast', 'AgX - Very Low Contrast', 'Punchy']))
scene.view_settings.look = 'None'
print('DENOISERS aceptados:', acepta(scene.cycles, 'denoiser', ['OPENIMAGEDENOISE', 'OPTIX']))

resultados = {}


def render(etiqueta, prepara):
    scene.render.filepath = os.path.join(OUT, f'motores_{etiqueta}.png')
    t = time.time()
    try:
        prepara()
        bpy.ops.render.render(write_still=True)
        dt = time.time() - t
        resultados[etiqueta] = {'segundos': round(dt, 1), 'ok': True}
        print(f'RENDER {etiqueta}: {dt:.1f} s')
    except Exception as ex:
        dt = time.time() - t
        resultados[etiqueta] = {'segundos': round(dt, 1), 'ok': False, 'error': str(ex)[:300]}
        print(f'RENDER {etiqueta} FALLÓ tras {dt:.1f} s: {ex}')
        traceback.print_exc()


def workbench():
    scene.render.engine = 'BLENDER_WORKBENCH'
    sh = scene.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_shadows = True; sh.show_cavity = True
    scene.display.render_aa = '8'


def eevee():
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.eevee.taa_render_samples = 64
    scene.eevee.use_shadows = True
    scene.eevee.use_raytracing = True


def cycles(samples, device='CPU', denoise=True):
    def f():
        scene.render.engine = 'CYCLES'
        scene.cycles.device = device
        scene.cycles.samples = samples
        scene.cycles.use_adaptive_sampling = True
        scene.cycles.use_denoising = denoise
        if denoise:
            scene.cycles.denoiser = 'OPENIMAGEDENOISE'
            scene.cycles.denoising_use_gpu = False
    return f


def cycles_gpu():
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'HIP'
    cp.get_devices()
    gpus = [d for d in cp.devices if d.type != 'CPU']
    if not gpus:
        raise RuntimeError('ningún dispositivo HIP: la Radeon integrada no aparece')
    for d in cp.devices:
        d.use = d.type != 'CPU'
    cycles(64, 'GPU')()


render('workbench', workbench)
render('eevee', eevee)
render('cycles_cpu_16', cycles(16, denoise=False))
render('cycles_cpu_64_denoise', cycles(64))
render('cycles_cpu_256_denoise', cycles(256))
render('cycles_gpu_hip', cycles_gpu)

resultados['_escena'] = {'resolucion': RES, 'hilos': os.cpu_count(), 'blender': bpy.app.version_string}
json.dump(resultados, open(os.path.join(OUT, 'motores_tiempos.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print(json.dumps(resultados, indent=1, ensure_ascii=False))
