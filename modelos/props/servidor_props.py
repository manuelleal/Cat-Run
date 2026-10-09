# Sirve la carpeta del proyecto y guarda en modelos/props/ las imágenes que visor_props.html manda por POST.
# Uso:  python modelos/props/servidor_props.py   y abrir  http://localhost:8767/modelos/props/visor_props.html?modo=hoja&guardar=_hoja_props
#       POST /guardar/<nombre>.png -> modelos/props/<nombre>.png      POST /guardar/intentos/<nombre>.png -> modelos/props/intentos/
import http.server, os, re
AQUI = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(AQUI))
os.chdir(ROOT)
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        m = re.fullmatch(r'/guardar/((?:intentos/|vistas/)?[\w\-]+\.png)', self.path)
        if not m: self.send_error(404); return
        data = self.rfile.read(int(self.headers['Content-Length']))
        open(os.path.join(AQUI, *m.group(1).split('/')), 'wb').write(data)
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8767), H).serve_forever()
