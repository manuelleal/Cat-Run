# Bitácora — agente Render

## Rol

Sacar de Blender imágenes y video de calidad para promocionar a Tinto, y dejar la herramienta **configurada y ampliada a la medida del proyecto** sin tocar la instalación. El agente anterior (bitácora `equipo/blender.md`) modeló y exportó; yo renderizo. Entregas: `modelos/render/` (complemento `tinto_tools`, carpeta de configuración, lanzador, guiones, `salidas/`, `intentos/`), `modelos/render/LEEME.md` y esta bitácora. No toqué `js/`, `index.html`, `servidor.py`, `modelos/tinto*.py` ni los `.glb`. No descargué ni instalé nada: escenario, cielo y texturas salen de nodos procedurales.

## Resultado en una tabla

| Entrega | Dónde | Estado |
|---|---|---|
| Comparación de motores con tiempos | `modelos/render/intentos/motores_*.png`, `motores_tiempos.json` | Hecha, 6 configuraciones |
| Carpeta de configuración propia | `modelos/render/config/` (`userpref.blend`, `startup.blend`, add-on) | Hecha y probada por los dos lanzadores |
| Complemento `tinto_tools` | `modelos/render/config/scripts/addons/tinto_tools/` | 8 operadores + panel + API (`api.py`) |
| Lanzador | `modelos/render/tinto_blender.bat` y `.py` | Con y sin ventana; el `.bat` tuvo un error (abajo) |
| Imagen promocional 1080×1920 | `modelos/render/salidas/tinto_promo.png` | Hecha en 5 iteraciones (`intentos/promo_v1..v4_*.png`) |
| 6 stickers 512×512 RGBA con contorno | `modelos/render/salidas/stickers/` | Hechos; el primer paquete salió con contorno gris (`intentos/stickers/v1/`) |
| Video giro 360° MP4 | `modelos/render/salidas/tinto_giro_eevee.mp4` | Hecho (3 s, 540×960, H.264); el primer intento salió con la cámara detrás del decorado (`intentos/video_v1_*`) |
| Guía | `modelos/render/LEEME.md` | Comandos, presets, recetas, tabla de motores, 12 trampas, fuentes |

## Qué investigué y qué pesó

Primero medí, después leí. El sondeo (`guiones/sondeo_maquina.py`, 0,6 s) dijo lo esencial antes que cualquier página: Cycles solo ve la CPU (16 hilos; `HIP` lista únicamente "AMD Ryzen 7 5700G with Radeon Graphics, CPU"), el módulo `gpu` no está disponible en background, el denoiser disponible es OpenImageDenoise y hay ffmpeg con H.264. Las búsquedas sobre "EEVEE sin pantalla" devolvieron hilos de 2018–2020 para Linux/X11 que dicen que no se puede; en Windows con 4.5.9 **sí renderiza** en `--background` (medido: 17,3 s el primer cuadro). Es el mejor ejemplo de la sesión de por qué hay que probar y no creer.

| Tema | Fuente | ¿Probado? |
|---|---|---|
| Variables `BLENDER_USER_RESOURCES/CONFIG/SCRIPTS/EXTENSIONS`, `-E help`, `--` | Manual 4.5, argumentos de línea de comandos | `BLENDER_USER_RESOURCES` sí (es la que usa el lanzador); las otras tres solo leídas |
| Carpeta `portable/` junto al ejecutable | Manual 4.5, estructura de carpetas | No: está dentro de la instalación, que no se toca |
| AgX, Filmic (obsoleto), Standard, Khronos PBR Neutral, looks, exposición | Manual 4.5, gestión de color; notas 4.0 y 4.2 | Sí: listé los que acepta esta instalación y usé AgX Punchy |
| Muestreo adaptativo, umbral de ruido, OIDN, prefiltro, pases | Manual 4.5, Cycles > Sampling | Sí: 16/64/256 muestras con y sin denoise |
| Película transparente (Cycles y EEVEE) | Manual 4.5, Film de cada motor | Sí: stickers RGBA |
| Nodo Glare en 4.5 (parámetros como sockets) | Manual 4.5, Glare | Sí: bloom en la promo; `api._set` cubre socket o propiedad |
| Codificación de video, "renderizar a PNG y codificar después" | Manual 4.5, Output / Rendering Animations | Codifiqué directo a MP4 (3 s de video) |
| Estructura de un add-on y `addon_utils.paths()` | Manual 4.5, tutorial de add-ons | Sí: `tinto_tools` aparece en la ruta de usuario y se activa por guion |
| EEVEE en background | devtalk 2.8 (Linux) | Probado aquí: funciona en Windows |

Lo que falló al leer: el manual de Blender tiene páginas de 200 000 caracteres en las que el contenido real está al final, detrás del menú; la herramienta de lectura devolvía solo navegación y hubo que pedir cada página dos o tres veces con desplazamiento. Varias respuestas de la búsqueda eran traducciones de la misma página.

## Qué probé, paso a paso

**1. Sondeo y comparación de motores.** `comparar_motores.py` monta la misma escena (Tinto v4 importado del `.glb`, piso, tres luces, cámara de tres cuartos, 768×768, AgX) y renderiza una vez por motor con cronómetro:

| Motor | Tiempo | Nota |
|---|---|---|
| Workbench | 1,1 s | ojos blancos: no muestra color de vértice y textura a la vez |
| EEVEE Next, 64 muestras, trazado de rayos | 17,3 s | incluye compilar sombreadores |
| Cycles CPU 16 muestras sin denoise | 2,5 s | ruido |
| Cycles CPU 64 + OIDN | 12,7 s | limpio; preset `rapido` |
| Cycles CPU 256 + OIDN | 32,6 s | no se distingue del de 64 |
| Cycles GPU HIP | no arranca | la Radeon integrada no aparece como dispositivo |

Dos tropiezos en el sondeo: `HydraRenderEngine` es una clase base sin `bl_idname` y rompió el listado de motores; y los enums dinámicos (`engine`, `view_transform`, `denoiser`) salen vacíos por `bl_rna` en background, así que la lista de motores "oficial" decía que solo existía EEVEE. Lo resolví probando asignaciones una por una.

**2. Configuración propia.** `crear_config.py` se corre por el lanzador, comprueba que `bpy.utils.resource_path('USER')` sea `render/config`, activa `tinto_tools`, pone preferencias (sin splash, español, render en área, Cycles en CPU), guarda `userpref.blend`, arma la escena de inicio (estudio + ciclorama + cámara + preset `rapido`) y guarda `startup.blend`. `prueba_config.py` arranca por el otro lanzador y confirma: carpeta de usuario correcta, complemento activo, operadores `tinto.*` presentes, escena "Tinto" con sus cinco objetos, idioma `es`, y un render Workbench en 0,8 s. Los mensajes de Blender salieron ya en español ("Preferencias guardadas"), señal de que las preferencias mandan desde el primer arranque.

**3. Stickers.** Primer paquete (`intentos/stickers/v1/`): las seis poses funcionaron a la primera en cuanto a rotaciones, pero el contorno salió **gris**, el gato "corriendo" se veía de lado sin cara, "sentado" de frente no mostraba las ancas y "espaldas" apenas enseñaba un ojo. Segundo paquete: contorno blanco (causa abajo), cámaras `carrera` y `sticker_bajo`, cabeza más girada en `espaldas` y `cola_alta`, exposición −0,3. Final a 128 muestras: 6 stickers en 15 s. Los bigotes blancos quedan como una pelusa blanca pegada al contorno; lo dejo porque a 512 px se lee como bigote.

**4. Promocional.** Cinco renders de borrador a 540×960 (22–25 s cada uno) antes del final:
- *v1 (`promo_v1_camara_encima.png`)*: cámara a 3 unidades con 55 mm: la panza llenaba el cuadro y la luz de contorno estaba detrás de la pared.
- *v2 (`promo_v2_muy_cerca_fria.png`)*: cámara al otro lado, mejor, pero aún encima del gato, y el gato gris azulado por el relleno frío de 160 W y el cielo a 0,9.
- *v3 (`promo_v3_ventana_negra_gato_azul.png`)*: encuadre bueno (ventana, alero, maceta, poyo con pocillo), pero el hueco negro de la ventana parecía un televisor, las juntas del empedrado eran negras y gruesas, y el pocillo quedaba escondido tras la pata.
- *v4 (`promo_v4_pocillo_lejos.png`)*: ventana con postigos verdes y reja, piso creíble, gato más negro; el pocillo quedó lejos de la pata (lo moví al lado equivocado: con la cámara en −X,+Y, "a la derecha" en pantalla es −X).
- *Final* (`salidas/tinto_promo.png`): pocillo medio asomado al borde del poyo, bajo la pata. 1080×1920, preset `promo` (96 muestras adaptativas + OIDN, DOF f/2.5 enfocado en la cabeza, luz de contorno, balance de color + bloom + viñeta en el compositor): **116 s**, dentro del límite de 3 min.

**5. Video.** `video_giro.py`: pivote vacío con la cámara hija, dos claves de rotación Z (0° → 360°) lineales, 72 cuadros a 24 fps, 540×960, EEVEE, codificado directo a MP4 H.264 con el ffmpeg de Blender. Primer intento (`intentos/video_v1_ciclorama_tapa.mp4`): 135 s (1,9 s por cuadro), pero al sacar tres cuadros a PNG con `verificar_video.py` vi que a 60 mm el gato salía cortado y que entre los cuadros 20 y 30 la cámara pasaba por detrás de la pared curva del ciclorama (triángulo azul oscuro). Segundo intento (`salidas/tinto_giro_eevee.mp4`): sin ciclorama (piso grande + color de mundo), radio 4,6, 45 mm: 72 cuadros, 24 fps, 540×960, 3,00 s, 0,41 MB, **134,5 s (1,9 s/cuadro)**. Verificado abriendo el MP4 en Blender y mirando tres cuadros (`intentos/video_cuadros.png`): el gato entero en los tres, de frente, de tres cuartos y de espaldas con la oreja mordida. Se nota el horizonte del piso como una línea; para una versión mejor, un ciclorama de verdad grande o fondo transparente.

## Qué salió mal y cómo lo noté

1. **El lanzador `.bat` abría un guion llamado "fondo".** `shift` dentro de un bloque `if ( … )` no cambia `%1`, que ya estaba expandido. Lo noté porque Blender dijo "Python file …\fondo could not be opened". Reescrito con etiquetas `goto`.
2. **Contorno de sticker gris en vez de blanco.** Lo vi en la hoja de contacto. Causa: el compositor pasa por la transformación de vista y AgX lleva un blanco lineal de 1,0 a un gris de 0,8. Arreglo: pintar el contorno con valor 20. Es la misma lección del agente anterior ("lo que ves depende del tono") aplicada al compositor.
3. **Listado de motores falso.** `enum_items` decía que solo existía EEVEE y que no había denoisers. Si me lo hubiera creído, habría concluido que Cycles no estaba. Lo noté porque `RenderEngine.__subclasses__()` sí listaba Cycles; resuelto probando asignaciones.
4. **Sondeo roto por `HydraRenderEngine`** sin `bl_idname`: error en consola a la primera corrida. `getattr` con valor por defecto.
5. **Promo v1: cámara pegada al gato y luz de contorno detrás de la pared.** Visible en la imagen; la luz lo deduje al ver que no había borde iluminado y repasar coordenadas (pared en y = −2,2, luz en y = −3,5).
6. **Gato azulado (v2–v3).** Cielo Nishita a 0,9 y relleno frío. Bajé el cielo a 0,45 y calenté sol y relleno. El pelaje de v4 está calibrado para el juego (ACES), no para AgX; en Blender tiende a gris, y lo compensé con exposición −0,35 y look Punchy en vez de tocar el modelo.
7. **Ventana que parecía televisor (v3)** y **pocillo mal ubicado dos veces (v3 tapado, v4 lejos)**: errores de composición vistos en la imagen; el segundo por confundir la dirección "derecha" de la cámara.
8. **El preset `promo` original (192 muestras) pasaba el límite de 3 min** a 1080×1920 según el escalado medido (22 s a 540×960 con 64 → ×4 píxeles ×3 muestras ≈ 4,5 min). Lo bajé a 96 muestras con umbral 0,03 antes de lanzarlo; no lo descubrí a golpes, lo calculé.
9. **Primer intento de leer el manual**: tres páginas devolvieron solo el menú. Me costó seis llamadas de lectura llegar al contenido.
10. **Segundo error del `.bat`**: el lanzador añade el `--` que separa los argumentos del guion, y yo mismo lo escribí otra vez al llamar `verificar_video.py`; el guion recibió `-- --` y trató de abrir un archivo llamado `--`. Lo noté por el error de Blender. Ahora el `.bat` quita un `--` repetido y los guiones ignoran un `--` suelto.
11. **Video v1 con la cámara detrás del decorado y el gato cortado.** No se ve en el registro de consola (72 cuadros "ok", 135 s); solo se vio al extraer cuadros a PNG. Por eso `verificar_video.py` ya forma parte del flujo.
12. **Me confundí con el reloj**: creí que el video llevaba siete minutos cuando llevaba uno, por mirar la hora de los archivos y no la del sistema. Sin consecuencias, pero estuve a punto de matar el proceso.

## Qué quedó bien y qué no

Bien: el flujo completo en un comando (lanzador → configuración propia → complemento → render), que es lo que pedía el encargo; la comparación de motores con números; los stickers con alfa limpio y contorno; la promo con escenario procedural que se reconoce como pueblo colonial (pared encalada, zócalo azul, ventana verde con reja, teja de barro, empedrado, maceta) y el gag del pocillo de tinto al borde.

No tan bien: el gato en Blender nunca es tan negro como en el juego; los bigotes en los stickers se ven como pelusa; el escenario es de cajas y cilindros (sin desgaste, sin bugambilia real); la mancha clara del pecho del modelo v4 asoma desde el flanco con luz lateral; el panel con ventana lo probé solo en cuanto a que los operadores existen, no haciendo clic (no abrí ventana). El `.bat` solo pasa nueve argumentos al guion (`%1`…`%9`).

## Lo que no verifiqué

- La interfaz con ventana: no abrí Blender con pantalla; el panel "Tinto" y el idioma español están comprobados por API, no a ojo.
- `BLENDER_USER_CONFIG`, `BLENDER_USER_SCRIPTS` y `BLENDER_USER_EXTENSIONS` por separado: leídas, no usadas.
- EEVEE con el backend Vulkan (`--gpu-backend vulkan`): usé el OpenGL por defecto.
- Cómo se ve el MP4 en un teléfono (solo comprobé que el archivo existe, su tamaño y el tiempo por cuadro).
- Los stickers dentro de WhatsApp (512×512 PNG con alfa es el formato, pero no probé el empaquetado `.wastickers`).
- La lectura de `motores_tiempos.json` a largo plazo: los tiempos se midieron con el computador en uso por otras cosas; pueden variar ±20 %.

## Qué haría después

1. Panela (la perra) con el mismo flujo: `cargar_personaje('panela.glb')` ya funciona por contrato; las poses habría que ajustarlas.
2. Ciclo de carrera de verdad (6–8 cuadros de poses interpoladas con `keyframe_insert` sobre los nodos) en vez del giro.
3. Pasar `tinto_tools` a formato de **extensión** 4.2+ (`blender_manifest.toml`) para instalarlo con un clic en otra máquina.
4. Un preset `juego` de gestión de color que imite el tono ACES de Three.js, para que el render de Blender y el juego se parezcan (hoy hay que compensar a ojo).
5. Bugambilia y desgaste en la pared con nodos de geometría o texturas procedurales más finas; una farola y un perro al fondo.
6. Verificar con ventana el panel y, si se usa en vivo, añadir un operador "sticker de la pose actual".
