@echo off
rem Lanzador de Blender con la configuracion propia del proyecto Tinto (render/config), sin tocar la instalacion.
rem   tinto_blender.bat                         -> abre Blender con ventana, preferencias y estudio de Tinto
rem   tinto_blender.bat ventana guion.py [args] -> con ventana y corre el guion
rem   tinto_blender.bat fondo guion.py [args]   -> sin ventana (--background) y corre el guion
rem   tinto_blender.bat crudo <args de blender> -> pasa los argumentos tal cual (pero con nuestra configuracion)
rem OJO (errores cometidos): "shift" dentro de un bloque ( ... ) no cambia %1 ya expandido; por eso se usan etiquetas.
rem El lanzador pone el "--" que separa los argumentos del guion; si el usuario tambien lo escribe, se quita (si no,
rem el guion recibia "-- --" y tomaba el segundo "--" como argumento).
setlocal
set "BLENDER_USER_RESOURCES=%~dp0config"
set "BLENDER=%~dp0..\..\..\_herramientas\blender-4.5.9-windows-x64\blender.exe"
if not exist "%BLENDER%" (
  echo No encuentro Blender en "%BLENDER%"
  exit /b 2
)
if "%~1"=="" goto ventana_sola
if /i "%~1"=="fondo" goto fondo
if /i "%~1"=="ventana" goto ventana
if /i "%~1"=="crudo" goto crudo
echo Modo desconocido: %~1  (usa: fondo ^| ventana ^| crudo ^| nada)
exit /b 1

:ventana_sola
start "" "%BLENDER%"
exit /b 0

:fondo
shift
set "GUION=%~1"
shift
if "%~1"=="--" shift
"%BLENDER%" --background --python "%GUION%" -- %1 %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:ventana
shift
set "GUION=%~1"
shift
if "%~1"=="--" shift
start "" "%BLENDER%" --python "%GUION%" -- %1 %2 %3 %4 %5 %6 %7 %8 %9
exit /b 0

:crudo
shift
"%BLENDER%" %1 %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%
