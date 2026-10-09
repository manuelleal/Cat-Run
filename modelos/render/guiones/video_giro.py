# Video corto: giro de 360° alrededor de Tinto en el estudio, 3 s a 24 fps, MP4 H.264 con el ffmpeg de Blender.
# Uso: modelos\render\tinto_blender.bat fondo modelos\render\guiones\video_giro.py [-- cycles] [-- borrador]
#   por defecto EEVEE (más parejo por cuadro en esta máquina); 'cycles' usa el preset rapido (64 muestras + denoise)
import bpy, os, sys, time
from tinto_tools import api

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MOTOR = 'rapido' if 'cycles' in ARGS else 'eevee'
BORRADOR = 'borrador' in ARGS
OUT = os.path.join(api.RENDER, 'intentos' if BORRADOR else 'salidas')
os.makedirs(OUT, exist_ok=True)

api.escena_vacia()
# v1: con el ciclorama la cámara, al orbitar a 3,8 de radio, pasaba por detrás de la pared curva (cuadros 20–30 en
# azul oscuro) y a 60 mm el gato salía cortado. Ahora: luces de estudio sin ciclorama, piso grande y fondo del mundo.
api.estudio('estudio', piso=False)
bpy.ops.mesh.primitive_plane_add(size=30)
piso = bpy.context.object
piso.data.materials.append(api.material('piso', api.srgb(0x8fa3b8), .95))
api.mundo((.36, .44, .56), .5)
partes = api.cargar_personaje()
api.posar(partes, 'cola_alta')
cuadros = 24 if BORRADOR else 72
t = api.video_giro(os.path.join(OUT, f'tinto_giro_{MOTOR}.mp4'), cuadros=cuadros, fps=24,
                   res=(360, 640) if BORRADOR else (540, 960), motor=MOTOR, radio=4.6, altura=1.7, lente=45)
print(f'VIDEO LISTO: {cuadros} cuadros en {t:.0f} s ({t / cuadros:.1f} s/cuadro) -> {OUT}')
