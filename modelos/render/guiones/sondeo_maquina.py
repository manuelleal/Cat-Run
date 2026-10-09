# Sondeo: qué sabe hacer Blender en ESTA máquina sin ventana. No renderiza nada; solo pregunta.
# Uso: blender --background --python modelos/render/guiones/sondeo_maquina.py
import bpy, sys, os, platform, json

print('=== BLENDER', bpy.app.version_string, 'build', bpy.app.build_date.decode(), bpy.app.build_platform.decode())
print('python', sys.version.split()[0], '| binario', bpy.app.binary_path)
print('background:', bpy.app.background)
print('CPU:', platform.processor(), '| hilos:', os.cpu_count())

print('\n=== rutas de recursos (resource_path)')
for k in ('USER', 'LOCAL', 'SYSTEM'):
    try:
        print(f'  {k:6s}', bpy.utils.resource_path(k))
    except Exception as e:
        print(f'  {k:6s} ERROR {e}')
print('  user_resource(CONFIG):', bpy.utils.user_resource('CONFIG'))
print('  user_resource(SCRIPTS):', bpy.utils.user_resource('SCRIPTS'))
print('  script_paths:', bpy.utils.script_paths())
print('  env BLENDER_*:', {k: v for k, v in os.environ.items() if k.startswith('BLENDER')})

print('\n=== motores de render registrados')
for e in bpy.types.RenderEngine.__subclasses__():
    print('  ', getattr(e, 'bl_idname', '(sin id: clase base)'), '-', getattr(e, 'bl_label', e.__name__))
print('  enum scene.render.engine:', [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items])

print('\n=== Cycles: dispositivos')
cp = bpy.context.preferences.addons['cycles'].preferences
print('  tipos de cómputo disponibles:', [i.identifier for i in cp.bl_rna.properties['compute_device_type'].enum_items])
for typ in ('CUDA', 'OPTIX', 'HIP', 'ONEAPI', 'METAL', 'NONE'):
    try:
        cp.compute_device_type = typ
        cp.get_devices()
        devs = [(d.name, d.type, d.use) for d in cp.devices]
        print(f'  {typ:7s} ->', devs)
    except Exception as ex:
        print(f'  {typ:7s} -> no disponible ({ex})')
cp.compute_device_type = 'NONE'

print('\n=== GPU (módulo gpu, para EEVEE/Workbench)')
try:
    import gpu
    print('  backend:', gpu.platform.backend_type_get())
    print('  vendor:', gpu.platform.vendor_get())
    print('  renderer:', gpu.platform.renderer_get())
    print('  version:', gpu.platform.version_get())
    print('  device_type:', gpu.platform.device_type_get())
except Exception as ex:
    print('  sin contexto GPU en modo background:', ex)

print('\n=== gestión de color')
s = bpy.context.scene
print('  display_device:', s.display_settings.display_device)
print('  view_transform:', s.view_settings.view_transform, '| opciones:',
      [i.identifier for i in s.view_settings.bl_rna.properties['view_transform'].enum_items])
print('  look:', s.view_settings.look)

print('\n=== salida de video (ffmpeg integrado)')
print('  formatos:', [i.identifier for i in s.render.image_settings.bl_rna.properties['file_format'].enum_items])
print('  contenedores ffmpeg:', [i.identifier for i in s.render.ffmpeg.bl_rna.properties['format'].enum_items])
print('  códecs:', [i.identifier for i in s.render.ffmpeg.bl_rna.properties['codec'].enum_items])
print('  denoiser cycles:', [i.identifier for i in s.cycles.bl_rna.properties['denoiser'].enum_items])
print('FIN SONDEO')
