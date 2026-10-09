# Prueba de humo: ¿Blender arrancó con NUESTRA configuración y el complemento? Render rápido a intentos/.
# Uso: modelos\render\tinto_blender.bat fondo modelos\render\guiones\prueba_config.py
import bpy, os, sys, addon_utils

print('USER   :', bpy.utils.resource_path('USER'))
print('CONFIG :', bpy.utils.user_resource('CONFIG'))
print('SCRIPTS:', bpy.utils.user_resource('SCRIPTS'))
print('startup.blend existe:', os.path.exists(os.path.join(bpy.utils.user_resource('CONFIG'), 'startup.blend')))
print('userpref.blend existe:', os.path.exists(os.path.join(bpy.utils.user_resource('CONFIG'), 'userpref.blend')))
print('complementos activos:', [m.__name__ for m in addon_utils.modules() if addon_utils.check(m.__name__)[1]])
print('operadores tinto:', [op for op in dir(bpy.ops.tinto)])
print('escena de inicio:', bpy.context.scene.name, 'motor', bpy.context.scene.render.engine,
      'objetos', [o.name for o in bpy.context.scene.objects])
print('idioma:', bpy.context.preferences.view.language)
from tinto_tools import api
partes = api.cargar_personaje()
api.posar(partes, 'reojo')
api.preset_render('borrador', res=(512, 512))
api.compositor('ninguno')
api.renderizar(os.path.join(api.RENDER, 'intentos', 'prueba_config_workbench.png'))
print('PRUEBA OK')
