# Crea (o rehace) la configuración propia del proyecto en render/config: preferencias (userpref.blend) con el
# complemento tinto_tools activado y el archivo de inicio (startup.blend) con estudio, cámara y preset listos.
# Hay que correrlo CON la variable BLENDER_USER_RESOURCES apuntando a render/config, es decir, por el lanzador:
#   modelos\render\tinto_blender.bat fondo modelos\render\guiones\crear_config.py
# No toca nada dentro de la carpeta de instalación de Blender ni en %APPDATA%.
import bpy, os, sys

CONFIG = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'config'))
usuario = bpy.utils.resource_path('USER')
print('carpeta de usuario que ve Blender:', usuario)
if os.path.normcase(os.path.abspath(usuario)) != os.path.normcase(CONFIG):
    sys.exit(f'ERROR: BLENDER_USER_RESOURCES no apunta a {CONFIG}. Usa el lanzador tinto_blender.bat/.py')

# --- preferencias ---
import addon_utils
print('rutas de complementos:', addon_utils.paths())
bpy.ops.preferences.addon_enable(module='tinto_tools')
p = bpy.context.preferences
p.view.show_splash = False
p.view.render_display_type = 'AREA'           # con ventana: el render sale en un área, no en una ventana nueva
p.filepaths.save_version = 1
p.filepaths.use_file_compression = True
try:
    p.view.language = 'es'                    # interfaz en español si la traducción está disponible
    p.view.use_translate_interface = True
    p.view.use_translate_tooltips = True
    p.view.use_translate_new_dataname = False # los nombres de datos siguen en inglés (los guiones los buscan así)
except Exception as ex:
    print('idioma no disponible:', ex)
cp = p.addons['cycles'].preferences
cp.compute_device_type = 'NONE'               # medido: la Radeon integrada no aparece como dispositivo HIP
bpy.ops.wm.save_userpref()
print('preferencias guardadas en', bpy.utils.user_resource('CONFIG'))

# --- archivo de inicio: estudio + cámara + preset rápido, sin personaje (se carga con tinto.cargar) ---
from tinto_tools import api
api.escena_vacia()
sc = bpy.context.scene
sc.name = 'Tinto'
api.estudio('estudio')
api.camara('tres_cuartos')
api.preset_render('rapido')
sc.render.filepath = os.path.join(api.RENDER, 'salidas', 'render.png')
sc.unit_settings.system = 'METRIC'
bpy.ops.wm.save_homefile()
print('archivo de inicio guardado en', os.path.join(bpy.utils.user_resource('CONFIG'), 'startup.blend'))
print('CONFIG LISTA')
