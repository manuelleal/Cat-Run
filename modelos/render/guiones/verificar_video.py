# Comprueba un MP4 con el propio Blender: lo abre como clip (cuadros, fps, tamaño) y saca tres cuadros a PNG
# pasándolo por el editor de secuencias, para poder MIRARLO sin reproductor. Sin ffprobe ni ffmpeg externos.
# Uso: tinto_blender.bat fondo modelos\render\guiones\verificar_video.py modelos\render\salidas\tinto_giro_eevee.mp4
import bpy, os, sys
from tinto_tools import api
rutas = [a for a in (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []) if a != '--']
for r in rutas:
    r = os.path.abspath(r)
    c = bpy.data.movieclips.load(r)
    print(f'{os.path.basename(r)}: {c.frame_duration} cuadros, {c.fps:.2f} fps, {c.size[0]}x{c.size[1]}, '
          f'{os.path.getsize(r) / 1e6:.2f} MB, {c.frame_duration / c.fps:.2f} s')
    sc = api.escena_vacia()
    sc.render.resolution_x, sc.render.resolution_y = c.size
    sc.render.resolution_percentage = 100
    sc.sequence_editor_create()
    sc.sequence_editor.sequences.new_movie('clip', r, 1, 1)
    sc.render.use_sequencer = True
    sc.render.image_settings.file_format = 'PNG'
    sc.view_settings.view_transform = 'Standard'   # el video ya viene con el tono aplicado
    pngs = []
    for f in (1, c.frame_duration // 3, 2 * c.frame_duration // 3):
        sc.frame_set(f)
        sc.render.filepath = os.path.join(api.RENDER, 'intentos', f'video_cuadro_{f:03d}.png')
        bpy.ops.render.render(write_still=True)
        pngs.append(sc.render.filepath)
    api.hoja_contacto(pngs, os.path.join(api.RENDER, 'intentos', 'video_cuadros.png'), cols=3)
    print('cuadros en', os.path.join(api.RENDER, 'intentos', 'video_cuadros.png'))
