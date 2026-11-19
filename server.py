"""
Outfit Req — Unified Workspace Server (Python)
Serves 'WEB EBD' with full ES module support, auto-fallback ports,
and integrated AI Curation API (/api/ai/curate) backed by Gemini LLM & Catalog Data.
"""
import http.server
import socketserver
import os
import sys
import webbrowser
import json
import urllib.request
import urllib.error

# Load .env if python-dotenv is present
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
except Exception:
    pass

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

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        if self.path in ('/', ''):
            # Redirect root to Beranda Utama (index.html)
            self.send_response(302)
            self.send_header('Location', '/WEB%20EBD/index.html')
            self.end_headers()
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/ai/curate':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                body = json.loads(post_data.decode('utf-8'))
            except Exception:
                body = {}

            api_key = (
                body.get('apiKey')
                or os.environ.get('GEMINI_API_KEY')
                or os.environ.get('GOOGLE_API_KEY')
                or ''
            ).strip()

            if not api_key:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': 'NO_API_KEY',
                    'message': 'No GEMINI_API_KEY found in server environment or request payload.'
                }).encode('utf-8'))
                return

            query = body.get('query', '')
            event = body.get('event', '')
            tier = body.get('tier', 'free')
            candidates = body.get('candidates', [])

            # Construct clean candidate summary for LLM context
            candidates_summary = []
            for c in candidates[:8]:
                candidates_summary.append({
                    'id': c.get('id'),
                    'title': c.get('title'),
                    'category': c.get('category'),
                    'price': c.get('price'),
                    'store': c.get('sourceStore') or c.get('store'),
                    'desc': c.get('description') or ''
                })

            prompt_text = (
                "You are the Lead Editorial Fashion Stylist for Orec, an Indonesian quiet-luxury fashion platform.\n"
                f"User Request: \"{query}\"\n"
                f"Occasion / Event Context: \"{event or 'Kasual / Umum'}\"\n"
                f"User Tier: \"{tier}\"\n\n"
                "Here are real candidate garments retrieved from our database catalog:\n"
                f"{json.dumps(candidates_summary, ensure_ascii=False, indent=2)}\n\n"
                "Task:\n"
                "1. Select the top 2 best complementary items from the catalog list above that together form the ideal outfit matching the user's request.\n"
                "2. Write a sophisticated, elegant, minimalist editorial styling recommendation in Indonesian grounded STRICTLY in the catalog items.\n"
                "   - Absolutely NO cheesy AI slop: no robotic greetings ('Halo! Saya asisten AI...'), no fake excitement, no emojis.\n"
                "   - Structure the response with:\n"
                "     a) An introductory statement: 'Berdasarkan analisis kebutuhan Anda dari katalog produk Orec, berikut 2 rekomendasi busana yang saling melengkapi dan siap dikenakan:'\n"
                "     b) Clearly present each of the 2 chosen items by its real title, store, price, and why it is chosen.\n"
                "     c) 'Sinergi Padu Padan Siluet': How the 2 catalog items harmonize in cut, balance, and color palette.\n"
                "     d) 'Kenyamanan & Karakter Bahan Nyata': Why the real fabrics of these items perform well for the scenario.\n"
                "     e) 'Panduan Styling': Practical guidance (tuck, cuff, shoes).\n\n"
                "Return PURE JSON in this exact structure without markdown backticks:\n"
                "{\n"
                "  \"selected_ids\": [\"id_item_1\", \"id_item_2\"],\n"
                "  \"title\": \"Judul Kurasi Siluet\",\n"
                "  \"analysis_html\": \"<p>Berdasarkan analisis kebutuhan Anda dari katalog produk Orec...</p>\",\n"
                "  \"styling_tip\": \"Tips praktis...\"\n"
                "}"
            )

            models_to_try = [
                'gemini-2.5-flash',
                'gemini-1.5-flash',
                'gemini-2.0-flash'
            ]

            gemini_result = None
            last_err = ""
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                req_payload = {
                    "contents": [{
                        "parts": [{"text": prompt_text}]
                    }],
                    "generationConfig": {
                        "temperature": 0.35,
                        "responseMimeType": "application/json"
                    }
                }
                try:
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(req_payload).encode('utf-8'),
                        headers={'Content-Type': 'application/json'}
                    )
                    with urllib.request.urlopen(req, timeout=12) as resp:
                        resp_data = json.loads(resp.read().decode('utf-8'))
                        text_content = resp_data['candidates'][0]['content']['parts'][0]['text']
                        gemini_result = json.loads(text_content)
                        break
                except Exception as e:
                    last_err = str(e)
                    continue

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if gemini_result:
                self.wfile.write(json.dumps({
                    'success': True,
                    'result': gemini_result
                }).encode('utf-8'))
            else:
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': 'GEMINI_CALL_FAILED',
                    'detail': last_err
                }).encode('utf-8'))
            return

        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Not Found'}).encode('utf-8'))

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
    print(f" -> Personality (Chat):  http://localhost:{active_port}/WEB%20EBD/personality.html", flush=True)
    print(f" -> Galeri Rekomendasi: http://localhost:{active_port}/WEB%20EBD/rekomendasi.html", flush=True)
    print(f" -> Studio 3D (Premium): http://localhost:{active_port}/Premium%203D/index.html", flush=True)
    print(f" -> Halaman Akun:       http://localhost:{active_port}/WEB%20EBD/account.html", flush=True)
    print(f" -> Panduan & Tutorial: http://localhost:{active_port}/WEB%20EBD/tutorial.html", flush=True)
    print(f" -> Masuk (Login 3D):   http://localhost:{active_port}/WEB%20EBD/login.html", flush=True)
    print(f" -> AI Curate API:      http://localhost:{active_port}/api/ai/curate", flush=True)
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
