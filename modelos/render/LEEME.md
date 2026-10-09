# modelos/render — sacar imágenes y video de Tinto con Blender, en un comando

Guía práctica del agente Render. Todo lo que dice "medido" se corrió en esta máquina (Windows 11, Ryzen 7 5700G con Radeon integrada, Blender 4.5.9 LTS portátil, sin ventana). Lo que dice "leído" viene del manual y no se probó aquí.

## Qué hay en esta carpeta

| Ruta | Qué es |
|---|---|
| `tinto_blender.bat` / `tinto_blender.py` | **Lanzador.** Arranca Blender con nuestra configuración (variable `BLENDER_USER_RESOURCES` → `config/`), con o sin ventana. |
| `config/` | **Nuestra carpeta de usuario de Blender.** `config/config/userpref.blend` (preferencias), `config/config/startup.blend` (archivo de inicio: estudio + cámara + preset), `config/scripts/addons/tinto_tools/` (el complemento). Blender la crea y la lee en vez de `%APPDATA%`. |
| `config/scripts/addons/tinto_tools/` | **Complemento `tinto_tools`**: `api.py` (funciones) y `__init__.py` (operadores `tinto.*` y panel "Tinto" en la barra lateral de la vista 3D). |
| `guiones/` | `sondeo_maquina.py` (qué sabe hacer Blender aquí), `comparar_motores.py` (misma escena, un render por motor, cronómetro), `crear_config.py` (rehace `config/`), `prueba_config.py` (humo), `stickers.py`, `promo.py`, `video_giro.py`. |
| `salidas/` | `tinto_promo.png` (1080×1920), `stickers/tinto_<pose>.png` (6 × 512×512 RGBA) y `_hoja_stickers.png`, `tinto_giro_eevee.mp4`. |
| `intentos/` | Comparación de motores (`motores_*.png`, `motores_tiempos.json`, `motores_log.txt`), borradores con nombre (`promo_v1_camara_encima.png`, …), `stickers/v1/` (primer paquete, contorno gris). |

## Cómo correr (un comando)

```bat
modelos\render\tinto_blender.bat                                        :: Blender con ventana, ya con panel "Tinto"
modelos\render\tinto_blender.bat fondo modelos\render\guiones\stickers.py             :: 6 stickers a salidas/stickers (≈15 s)
modelos\render\tinto_blender.bat fondo modelos\render\guiones\stickers.py -- borrador :: lo mismo rápido, a intentos/
modelos\render\tinto_blender.bat fondo modelos\render\guiones\promo.py                :: promocional 1080×1920 (≈2,5 min)
modelos\render\tinto_blender.bat fondo modelos\render\guiones\promo.py -- borrador    :: 540×960 en ≈22 s para ajustar
modelos\render\tinto_blender.bat fondo modelos\render\guiones\video_giro.py           :: giro 360°, MP4
modelos\render\tinto_blender.bat crudo -b -E help                                     :: cualquier argumento de Blender
python modelos\render\tinto_blender.py modelos\render\guiones\promo.py -- borrador    :: lo mismo desde Python (--ventana para abrirla)
```

Si `config/` se borra o se quiere rehacer: `tinto_blender.bat fondo modelos\render\guiones\crear_config.py` (la variable tiene que apuntar a `config/`, por eso va por el lanzador; el guion lo comprueba).

## Un render nuevo en diez líneas

```python
# guardar como mi_render.py y correr: tinto_blender.bat fondo mi_render.py
from tinto_tools import api
api.escena_vacia()                     # borra la escena actual (no recarga preferencias ni complementos)
api.estudio('estudio')                 # 'estudio' | 'sticker' (sin piso, fondo transparente) | 'pueblo' (calle colonial)
tinto = api.cargar_personaje()         # modelos/tinto_v4.glb; devuelve {nodo: objeto}
api.posar(tinto, 'reojo')              # neutral | reojo | empujando | corriendo | sentado | espaldas | cola_alta
api.encuadrar(tinto, preset='sticker') # o api.camara('vertical', dof=tinto['head']) para posición fija
api.preset_render('rapido', res=(1024, 1024), exposicion=-.3)   # borrador | eevee | rapido | sticker | promo | final
api.compositor('promo')                # ninguno | promo (balance + bloom + viñeta) | sticker (contorno blanco)
api.renderizar('modelos/render/salidas/mi_render.png')          # imprime el tiempo
```

Con ventana es lo mismo por botones: vista 3D → barra lateral (N) → pestaña **Tinto** (cargar, estudio, cámara, posar, preset, compositor, renderizar, sticker). Los operadores también salen con F3 escribiendo "Tinto:".

## Motores: tabla medida (misma escena, Tinto + piso + 3 luces, 768×768, AgX)

| Motor | Ajustes | Tiempo | Cómo se ve | Para qué sirve aquí |
|---|---|---|---|---|
| Workbench | estudio, textura, sombras, cavidad, AA 8 | **1,1 s** | Plano, sin rebotes; los ojos salen blancos (muestra UNA fuente de color: textura o color de vértice, no ambas) | Comprobar poses y encuadres |
| EEVEE (`BLENDER_EEVEE_NEXT`) | 64 muestras, sombras, trazado de rayos | **17,3 s** el primer cuadro (compila sombreadores); en animación **1,9 s por cuadro** a 540×960 (72 cuadros en 135 s, MP4 incluido) | Muy parecido a Cycles con estas luces; sombras suaves algo más duras | Video, muchos cuadros |
| Cycles CPU | 16 muestras, sin denoise | **2,5 s** | Ruido visible en piso y sombras | Nunca como final |
| Cycles CPU | 64 muestras adaptativo + OpenImageDenoise | **12,7 s** | Limpio; es el preset `rapido` | Borradores con la luz real |
| Cycles CPU | 256 muestras + denoise | **32,6 s** | Igual que 64 a simple vista | `final` solo si hay vidrio/DOF fuerte |
| Cycles GPU (HIP) | — | **no arranca**: `compute_device_type='HIP'` solo lista la CPU; la Radeon integrada del 5700G no aparece | — | — |

Escalado medido: el tiempo de Cycles crece casi lineal con píxeles × muestras. Promo (escena del pueblo, DOF, compositor) 540×960 a 64 muestras = 22 s; **1080×1920 a 96 muestras adaptativas + denoise = 116 s** (por eso el preset `promo` quedó en 96 y no en 192, que por la cuenta pasaba del límite de 3 min por render). Stickers 512×512 a 128 muestras: 2,3 s cada uno.

Imágenes de la comparación: `intentos/motores_workbench.png`, `motores_eevee.png`, `motores_cycles_cpu_*.png`. Tiempos: `intentos/motores_tiempos.json`.

Otras cosas medidas con `guiones/sondeo_maquina.py` y `comparar_motores.py`:
- Motores que acepta `scene.render.engine` sin ventana: `BLENDER_WORKBENCH`, `BLENDER_EEVEE_NEXT`, `CYCLES` (el viejo `BLENDER_EEVEE` ya no existe; Hydra Storm no está registrado).
- EEVEE **sí** renderiza en `--background` en Windows: Blender abre un contexto OpenGL sin ventana. El módulo `gpu` de Python, en cambio, dice "GPU functions for drawing are not available in background mode". (Las fuentes de Linux que dicen que EEVEE necesita pantalla hablan de X11; aquí no aplica.)
- Transformaciones de vista disponibles: `Standard`, `Filmic`, `AgX`, `Khronos PBR Neutral`, `Filmic Log`, `Raw`, `False Color`. Looks de AgX: `Punchy`, `Greyscale` y seis niveles de contraste.
- Denoiser disponible: solo `OPENIMAGEDENOISE` (OptiX exige NVIDIA). En CPU tarda ~1 s a 768².
- Salida de video: ffmpeg integrado con contenedores `MPEG4, MKV, WEBM, …` y códecs `H264, H265, AV1, …`.
- Los enums "dinámicos" (`engine`, `view_transform`, `look`, `denoiser`) **no se listan** con `bl_rna.properties[...].enum_items` en background: salen vacíos o con un solo valor. Hay que probar asignando.

## Presets (`api.PRESETS`, `api.CAMARAS`, `api.POSES`)

| Preset de render | Motor | Muestras | Denoise | Umbral adaptativo | Nota |
|---|---|---|---|---|---|
| `borrador` | Workbench | — | — | — | ~1 s |
| `eevee` | EEVEE | 64 | — | — | sombras + trazado de rayos |
| `rapido` | Cycles CPU | 64 | OIDN | 0,05 | el de los borradores |
| `sticker` | Cycles CPU | 128 | OIDN | 0,02 | fondo transparente + RGBA |
| `promo` | Cycles CPU | 96 | OIDN | 0,03 | 1080×1920 en ≈2,5 min |
| `final` | Cycles CPU | 512 | OIDN | 0,005 | solo si sobra tiempo |

Todos ponen PNG 8 bits, AgX con look `AgX - Punchy` (parámetros `vista`, `look`, `exposicion`), compositor en CPU y, en Cycles, `denoising_input_passes='RGB_ALBEDO_NORMAL'`, prefiltro `ACCURATE`, árbol de luces activo.

Cámaras: `tres_cuartos`, `frente`, `perfil`, `espalda`, `cara`, `sticker`, `sticker_bajo`, `carrera`, `vertical` (1080×1920). `encuadrar(partes, preset, margen)` toma solo la dirección y la lente del preset y calcula la distancia para que el personaje posado quepa.

Poses: rotaciones en grados por nodo (`X` cabecea / balancea patas con + adelante, `Y` ladea, `Z` gira) y `loc` para el cuerpo. Se definen en `api.POSES`; una pose propia es un diccionario: `api.posar(t, {'head': (0, 0, -45), 'tail': (-60, 0, 0)})`.

## Recetas

**Fondo transparente (Cycles y EEVEE):**
```python
sc.render.film_transparent = True
sc.render.image_settings.file_format, sc.render.image_settings.color_mode = 'PNG', 'RGBA'
```
Es lo que hace `preset_render(..., transparente=True)`. El PNG sale con alfa recta; sobre fondo gris los bordes quedan limpios (ver `salidas/stickers/`).

**Contorno tipo sticker en el compositor** (`api.compositor('sticker', contorno=12, filo=3)`): Render Layers → Alpha → `Dilate/Erode` (modo `DISTANCE`, 12 px) → `Set Alpha` sobre un color → `Alpha Over` con el render encima. Una segunda capa dilatada 3 px más y oscura hace el filo. **Trampa:** el compositor sale por la transformación de vista; con AgX un blanco de 1,0 se ve gris 0,8. El contorno se pinta con valor 20 para que AgX lo lleve a blanco (fue el primer intento fallido, `intentos/stickers/v1/`).

**Corrección de color en el compositor** (`api.compositor('promo', calor=.05, vineta=.35, bloom=.06)`): `Color Balance` (Lift/Gamma/Gain: sombras un pelo frías, luces cálidas) → `Glare` tipo `BLOOM` (en 4.5 Threshold/Strength/Size son *sockets*, no propiedades; `api._set` intenta ambas) → viñeta con `Ellipse Mask` → `Blur` relativo 35 % → `Mix` multiplicar.

**Profundidad de campo:** `api.camara(..., dof=tinto['head'])` pone `dof.use_dof`, `focus_object` y f/2.8 (`cam.data.dof.aperture_fstop`). Con un punto en vez de objeto calcula `focus_distance`.

**Luz de contorno:** un `SPOT` detrás y arriba del personaje, apuntando a la cabeza (`api.luz('contorno', 'SPOT', pos, cabeza, 450)`). En el pueblo la pared está en y = −2,2: la luz tiene que quedar **delante** de la pared o no ilumina nada.

**Cielo sin HDRI:** `api.mundo(cielo={'elevacion': 32, 'rotacion': 150}, fuerza=.45)` usa el nodo `Sky Texture` Nishita, con `sun_intensity=0` y una lámpara `SUN` aparte para controlar el sol. Con fuerza 0,9 el azul del cielo teñía el pelaje negro.

**Video MP4 con lo que trae Blender** (`api.video_giro`): pivote vacío en el centro, cámara hija, dos claves de rotación Z (0 → 360°) con interpolación lineal, y:
```python
sc.render.image_settings.file_format = 'FFMPEG'
ff = sc.render.ffmpeg; ff.format, ff.codec = 'MPEG4', 'H264'
ff.constant_rate_factor, ff.ffmpeg_preset, ff.gopsize = 'HIGH', 'GOOD', 12
bpy.ops.render.render(animation=True)
```
El manual recomienda renderizar a PNG y codificar después (si se cae a mitad, no se pierde todo); para 3 s se renderizó directo.

**Hoja de contacto:** `api.hoja_contacto([rutas], salida, cols=3)` pega PNG del mismo tamaño con numpy (viene con Blender) para revisar varios renders de una mirada.

**Dos personajes:** `cargar_personaje()` devuelve los objetos nuevos aunque los nombres salgan con `.001`; las claves del diccionario son los nombres base.

## Qué significa "modificar Blender", por niveles, y qué hicimos

1. **Configuración (lo que hicimos).** Blender guarda preferencias, archivo de inicio y complementos del usuario en `%APPDATA%\Blender Foundation\Blender\4.5\`. La variable `BLENDER_USER_RESOURCES` la reemplaza entera (medido: `bpy.utils.resource_path('USER')` devuelve nuestra `config/`, y dentro Blender crea `config/` y `scripts/`). Existen también `BLENDER_USER_CONFIG`, `BLENDER_USER_SCRIPTS` y `BLENDER_USER_EXTENSIONS` para reemplazar solo una parte (leído en el manual 4.5, argumentos de línea de comandos; no las usamos porque con una sola variable basta). Alternativa leída: una carpeta `portable/` junto a `blender.exe`, pero eso es *dentro* de la instalación y la regla era no tocarla.
2. **Complementos en Python (lo que hicimos).** Un add-on es un paquete Python con `bl_info`, `register()` y `unregister()`, en `<usuario>/scripts/addons/`. En 4.2+ conviven con las "extensiones" (paquetes con `blender_manifest.toml` y repositorio); los add-ons clásicos siguen funcionando y `addon_utils.paths()` lista nuestra carpeta (medido). Se activa por guion con `bpy.ops.preferences.addon_enable(module='tinto_tools')` y queda en `userpref.blend`. Todo lo que hace `tinto_tools` usa la API pública (`bpy`): escenas, nodos, render, compositor.
3. **Recompilar el código fuente (no hace falta).** Blender es C/C++ con licencia GPL; se puede clonar `projects.blender.org/blender/blender`, cambiar Cycles o EEVEE y compilar con CMake (horas de compilación y dependencias). Solo tendría sentido para cambiar algo que la API no expone (un nuevo integrador, otro formato de archivo nativo). Nada de lo pedido lo necesita: luces, cámaras, poses, presets, compositor y video están en la API de Python.

Así que "la herramienta ya es nuestra" quiere decir: al arrancar por el lanzador, Blender abre con nuestras preferencias (sin pantalla de inicio, interfaz en español, Cycles en CPU, render en área), nuestra escena de inicio (estudio de tres luces, ciclorama, cámara, preset `rapido`) y nuestro panel; y cualquier guion puede `from tinto_tools import api`. Si se borra `config/`, Blender vuelve a ser el de fábrica; la instalación no se tocó.

## Trampas (todas nos pasaron)

1. **`shift` dentro de un bloque `( … )` de un `.bat` no cambia `%1`** ya expandido: el primer lanzador intentó abrir un guion llamado "fondo". Se arregló con etiquetas `goto`. Segundo tropiezo del mismo `.bat`: él ya pone el `--` que separa los argumentos del guion; si uno también lo escribe, el guion recibía `-- --`. Ahora lo quita; los guiones además ignoran un `--` suelto. Con el `.bat` se pueden escribir los argumentos con o sin `--`; con `tinto_blender.py` van después de `--`.2. **Enums dinámicos en background** (`engine`, `view_transform`, `look`, `denoiser`) salen vacíos por `bl_rna`; hay que probar asignando (`comparar_motores.py` lo hace con `acepta()`).
3. **`HydraRenderEngine` no tiene `bl_idname`**: al recorrer `RenderEngine.__subclasses__()` hay que usar `getattr`.
4. **El compositor sale por la vista (AgX)**: un color "1,0" no es blanco. Para contornos o fondos planos, valor alto (20) o `view_transform='Standard'`.
5. **Un blanco con AgX Punchy también apaga colores saturados**: el pañuelo rojo sale más carmesí que en el juego. Si importa el rojo exacto, `Standard` o `Khronos PBR Neutral`.
6. **El cielo Nishita tiñe de azul**: con fuerza 0,9 el gato negro salía gris azulado. Fuerza 0,45 + sol cálido + relleno cálido.
7. **La mancha clara del pecho de v4** (horneada en la textura para que se lea bajo el pañuelo) se ve como un parche gris desde el flanco con luz plana. No es un error de render: es el modelo. Encuadrar de tres cuartos frontal o bajar la luz lateral.
8. **Las luces detrás de la pared** del pueblo no iluminan nada (obvio, pero pasó en v1 de la promo).
9. **Workbench muestra una sola fuente de color**: con `color_type='TEXTURE'` los ojos (color de vértice) salen blancos. Sirve para poses, no para color.
10. **El primer cuadro de EEVEE** incluye compilar sombreadores (17 s aquí); no juzgar la velocidad de EEVEE por un render suelto.
11. **El render de Blender no es el juego** (herencia del agente anterior): el pelaje se calibró para Three.js con ACES; en Blender con AgX se ve gris. Para promo se compensa con exposición −0,3 y look Punchy, no tocando el modelo.
12. **Un render de 1080×1920 con 192 muestras pasa de 3 min en esta CPU.** El preset `promo` quedó en 96 muestras + umbral 0,03 + denoise; a simple vista no se distingue.
13. **Al orbitar la cámara para un video, revisar que no cruce el decorado**: el primer giro pasaba por detrás del ciclorama (cuadros azul oscuro) y a 60 mm cortaba al gato (`intentos/video_v1_ciclorama_tapa.mp4`, `video_v1_cuadros.png`). `guiones/verificar_video.py` abre el MP4 como clip, imprime cuadros/fps/tamaño y saca tres cuadros a PNG por el editor de secuencias: así se mira un video sin reproductor.

## Fuentes

- Manual 4.5, argumentos de línea de comandos y variables de entorno (`BLENDER_USER_RESOURCES`, `BLENDER_USER_CONFIG`, `BLENDER_USER_SCRIPTS`, `BLENDER_USER_EXTENSIONS`, `-E help`, `-b`, `--python`, `--`): https://docs.blender.org/manual/en/4.5/advanced/command_line/arguments.html
- Manual 4.5, estructura de carpetas (carpeta `portable/`, ruta de usuario en Windows): https://docs.blender.org/manual/en/4.5/advanced/blender_directory_layout.html
- Manual 4.5, gestión de color (Standard, AgX, Filmic, Khronos PBR Neutral, looks, exposición): https://docs.blender.org/manual/en/4.5/render/color_management.html
- Manual 4.5, Cycles, muestreo y denoise (umbral de ruido, OIDN, prefiltro, pases): https://docs.blender.org/manual/en/4.5/render/cycles/render_settings/sampling.html
- Manual 4.5, Cycles, película (Transparent, Transparent Glass): https://docs.blender.org/manual/en/4.5/render/cycles/render_settings/film.html
- Manual 4.5, EEVEE, película (Transparent, Overscan): https://docs.blender.org/manual/en/4.5/render/eevee/render_settings/film.html
- Manual 4.5, nodo Glare (en 4.5 Threshold/Strength/Size son entradas): https://docs.blender.org/manual/en/4.5/compositing/types/filter/glare.html
- Manual 4.5, salida y codificación de video (contenedor, códec, calidad, "mejor renderizar a PNG y codificar después"): https://docs.blender.org/manual/en/4.5/render/output/properties/output.html y https://docs.blender.org/manual/en/4.5/render/output/animation.html
- Manual 4.5, tutorial de add-ons (`bl_info`, `register`, `addon_utils.paths()`): https://docs.blender.org/manual/en/4.5/advanced/scripting/addon_tutorial.html
- Notas de versión 4.2 (Khronos PBR Neutral) y 4.0 (AgX reemplaza a Filmic): https://wiki.blender.org/release_notes/4.2/rendering/ y https://wiki.blender.org/release_notes/4.0/color_management/
- EEVEE sin pantalla (hilo de devtalk, era 2.8, Linux/X11; aquí en Windows 4.5 sí funciona en background): https://devtalk.blender.org/t/blender-2-8-unable-to-open-a-display-by-the-rendering-on-the-background-eevee/1436
