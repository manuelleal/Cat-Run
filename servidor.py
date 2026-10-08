"""Servidor local del juego. Igual a `python -m http.server`, pero le dice al navegador que no guarde
copias: sin eso, el celular seguía mostrando versiones viejas del juego después de cada cambio."""
import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    http.server.ThreadingHTTPServer(('', port), Handler).serve_forever()
