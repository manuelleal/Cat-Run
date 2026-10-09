# Sirve la carpeta del proyecto y guarda en modelos/intentos/ las capturas que el visor manda por POST /guardar/<nombre>.png
# Uso:  python modelos/servidor_visor.py    y abrir http://localhost:8766/modelos/visor.html?m=tinto_v4.glb&v=frente&guardar=nombre
import http.server, os, re, sys
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        m = re.fullmatch(r'/guardar/([\w\-]+\.png)', self.path)
        if not m: self.send_error(404); return
        data = self.rfile.read(int(self.headers['Content-Length']))
        open(os.path.join(ROOT, 'modelos', 'intentos', m.group(1)), 'wb').write(data)
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8766), H).serve_forever()
