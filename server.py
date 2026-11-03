"""
Outfit Req — Unified Workspace Server (Python)
Serves 'WEB EBD' with full ES module support and auto-fallback ports.
"""
import http.server
import socketserver
import os
import sys
import webbrowser

START_PORT = 8080
MAX_PORT = 8099
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class UnifiedHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        '': 'application/octet-stream',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.htm': 'text/html',
        '.json': 'application/json',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.txt': 'text/plain',
        '.xml': 'text/xml',
        '.map': 'application/json',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path in ('/', ''):
            # Redirect root to Beranda Utama (index.html)
            self.send_response(302)
            self.send_header('Location', '/WEB%20EBD/index.html')
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

class ReusableServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == '__main__':
    httpd = None
    active_port = START_PORT

    for port in range(START_PORT, MAX_PORT + 1):
        try:
            httpd = ReusableServer(("0.0.0.0", port), UnifiedHandler)
            active_port = port
            break
        except OSError:
            continue

    if not httpd:
        print("[Error] Semua port 8080-8099 sedang digunakan.", file=sys.stderr)
        sys.exit(1)

    print("==================================================", flush=True)
    print(" Outfit Req — Local Server (Python)", flush=True)
    print(f" Server aktif di:       http://localhost:{active_port}/", flush=True)
    print(f" -> Beranda Utama:      http://localhost:{active_port}/WEB%20EBD/index.html", flush=True)
    print(f" -> Galeri Rekomendasi: http://localhost:{active_port}/WEB%20EBD/rekomendasi.html", flush=True)
    print(f" -> Halaman Akun:       http://localhost:{active_port}/WEB%20EBD/account.html", flush=True)
    print(f" -> Panduan & Tutorial: http://localhost:{active_port}/WEB%20EBD/tutorial.html", flush=True)
    print(f" -> Masuk (Login 3D):   http://localhost:{active_port}/WEB%20EBD/login.html", flush=True)
    print(" [Apify Sync] Jalankan: python sync_apify_products.py", flush=True)
    print(" Tekan Ctrl + C untuk menghentikan server.", flush=True)
    print("==================================================", flush=True)

    try:
        webbrowser.open(f"http://localhost:{active_port}/WEB%20EBD/index.html")
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
        httpd.server_close()
