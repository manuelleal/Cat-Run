# Imagen promocional vertical (1080x1920) de Tinto en una calle de pueblo colonial colombiano:
# Tinto empuja un pocillo de tinto al borde de un poyo mientras mira a la cámara.
# Uso: modelos\render\tinto_blender.bat fondo modelos\render\guiones\promo.py [-- borrador] [-- eevee]
#   borrador -> 540x960 con preset 'rapido' a intentos/, para ajustar encuadre y luz
import bpy, os, sys, time, math
from mathutils import Vector
from tinto_tools import api

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
BORRADOR = 'borrador' in ARGS
EEVEE = 'eevee' in ARGS
NOMBRE = next((a.split('=')[1] for a in ARGS if a.startswith('nombre=')), 'tinto_promo')
OUT = os.path.join(api.RENDER, 'intentos' if BORRADOR else 'salidas')

api.escena_vacia()
api.estudio('pueblo')
partes = api.cargar_personaje()
# Tinto de pie sobre el andén, de lado al poyo, con la pata derecha sobre el pocillo y la cara hacia la cámara.
PARED_Y = -2.2
posar = dict(api.POSES['empujando'])
posar.update({'body': (0, 0, 90), 'loc': (-.05, PARED_Y + 1.5 - .05, .12 + .0), 'head': (-6, 6, -70),
              'leg_FR': (70, 0, -10), 'tail': (-45, 0, 10), 'tail_tip': (-35, 0, 20)})
# body girado 90° en Z: el gato mira a -X (hacia el poyo/pocillo, que está en -X); la cámara está en +Y
api.posar(partes, posar)
# subir al andén (0.12 de alto) y acercar al pocillo
partes['body'].location = Vector((0.55, PARED_Y + 1.45, .12))
bpy.context.view_layer.update()
cab = partes['head']
# luz de contorno DELANTE de la pared (v1: una luz detrás de la pared no ilumina nada) apuntando a la cabeza
api.luz('contorno', 'SPOT', (1.3, PARED_Y + .7, 2.7), cab.matrix_world.translation, 450, (1, .97, .9))

# Cámara en -X,+Y: el gato (que mira a -X) queda de tres cuartos, el pocillo en primer plano abajo a la izquierda,
# la ventana verde al fondo. v1 (cámara en +X, 55 mm, a 3 unidades) llenaba el cuadro con la panza.
cam = api.camara('vertical', pos=(-2.8, PARED_Y + 4.1, 1.0), mira=(-.05, PARED_Y + 1.5, 1.3), lente=40,
                 res=(540, 960) if BORRADOR else (1080, 1920), dof=cab)
cam.data.dof.aperture_fstop = 2.5

if EEVEE:
    api.preset_render('eevee', res=(540, 960) if BORRADOR else (1080, 1920), look='AgX - Punchy', exposicion=-.35)
else:
    api.preset_render('rapido' if BORRADOR else 'promo', look='AgX - Punchy', exposicion=-.35)
api.compositor('promo', calor=.05, vineta=.35, bloom=.06)
t = api.renderizar(os.path.join(OUT, f'{NOMBRE}.png'))
print(f'PROMO LISTA en {t:.0f} s -> {OUT}')
