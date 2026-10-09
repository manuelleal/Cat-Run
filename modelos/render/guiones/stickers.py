# Paquete de stickers de Tinto: 6 poses, 512x512, fondo transparente, contorno blanco en el compositor.
# Uso: modelos\render\tinto_blender.bat fondo modelos\render\guiones\stickers.py [-- borrador] [-- solo reojo]
#   borrador -> preset 'rapido' (64 muestras) a intentos/, para revisar las poses sin esperar
import bpy, os, sys, time
from tinto_tools import api

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
BORRADOR = 'borrador' in ARGS
SOLO = [a for a in ARGS if a in api.POSES]
OUT = os.path.join(api.RENDER, 'intentos' if BORRADOR else 'salidas', 'stickers')
os.makedirs(OUT, exist_ok=True)

# pose -> encuadre (la cámara se calcula con encuadrar(), el preset solo da la dirección y la lente)
STICKERS = [('reojo', 'sticker'), ('empujando', 'sticker'), ('corriendo', 'carrera'),
            ('sentado', 'sticker_bajo'), ('espaldas', 'sticker'), ('cola_alta', 'perfil')]

api.escena_vacia()
api.estudio('sticker')
partes = api.cargar_personaje()
# Los bigotes son más finos que el contorno blanco del sticker y el compositor los convertía en una pelusa junto al hocico.
ocultos = [o.name for o in bpy.data.objects if 'whisker' in o.name.lower() or 'bigote' in o.name.lower()]
for nombre in ocultos:
    bpy.data.objects[nombre].hide_render = True
print('BIGOTES OCULTOS:', ocultos, '| objetos:', sorted(o.name for o in bpy.data.objects if o.type == 'MESH'))
T0 = time.time()
rutas = []
for pose, cam in STICKERS:
    if SOLO and pose not in SOLO:
        continue
    api.posar(partes, pose)
    api.encuadrar(partes, preset=cam, margen=1.15)
    api.preset_render('rapido' if BORRADOR else 'sticker', res=(512, 512), transparente=True, exposicion=-.3)
    api.compositor('sticker', contorno=12, filo=3)
    ruta = os.path.join(OUT, f'tinto_{pose}.png')
    api.renderizar(ruta)
    rutas.append(ruta)
api.hoja_contacto(rutas, os.path.join(OUT, '_hoja_stickers.png'), cols=3)
print(f'STICKERS LISTOS: {len(rutas)} en {time.time() - T0:.0f} s -> {OUT}')
