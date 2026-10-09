#!/usr/bin/env python3
"""Lanzador de Blender con la configuración propia del proyecto Tinto (render/config). Sin tocar la instalación.

  python modelos/render/tinto_blender.py                        # con ventana, configuración de Tinto
  python modelos/render/tinto_blender.py guion.py [-- args]     # sin ventana (por defecto) y corre el guion
  python modelos/render/tinto_blender.py --ventana guion.py     # con ventana y corre el guion
  python modelos/render/tinto_blender.py --crudo -- -b -E help  # argumentos de Blender tal cual
"""
import os, sys, subprocess, time, argparse

AQUI = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(AQUI, 'config')
BLENDER = os.path.abspath(os.path.join(AQUI, '..', '..', '..', '_herramientas', 'blender-4.5.9-windows-x64', 'blender.exe'))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('guion', nargs='?', help='guion .py que Blender corre al arrancar')
    ap.add_argument('--ventana', action='store_true', help='abrir la ventana (por defecto: sin ventana si hay guion)')
    ap.add_argument('--crudo', action='store_true', help='pasar lo que siga a "--" directo a blender.exe')
    ap.add_argument('resto', nargs=argparse.REMAINDER, help='argumentos para el guion (van después de "--")')
    a = ap.parse_args()
    if not os.path.exists(BLENDER):
        sys.exit(f'No encuentro Blender en {BLENDER}')
    env = dict(os.environ, BLENDER_USER_RESOURCES=CONFIG)
    resto = a.resto[1:] if a.resto and a.resto[0] == '--' else a.resto
    if a.crudo:
        cmd = [BLENDER] + ([a.guion] if a.guion else []) + resto
    elif a.guion:
        cmd = [BLENDER] + ([] if a.ventana else ['--background']) + ['--python', a.guion] + (['--'] + resto if resto else [])
    else:
        cmd = [BLENDER]
    print('>', ' '.join(cmd))
    t = time.time()
    if a.guion and not a.ventana or a.crudo:
        r = subprocess.run(cmd, env=env)
        print(f'(blender terminó con código {r.returncode} en {time.time() - t:.0f} s)')
        sys.exit(r.returncode)
    subprocess.Popen(cmd, env=env)   # con ventana: no esperar


if __name__ == '__main__':
    main()
