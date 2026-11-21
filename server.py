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

import http.server
import socketserver
import os
import sys
import webbrowser
import json
import urllib.request
import urllib.error
import secrets
import hmac
import time

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Built-in robust .env loader (Zero external dependency, reads local .env file)
def load_env_file(env_path, override=True):
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if override or k not in os.environ:
                    os.environ[k] = v
    except Exception as e:
        print(f"[Warning] Error reading .env: {e}")

load_env_file(os.path.join(DIRECTORY, '.env'))

# Admin active in-memory session tokens (token -> expiry timestamp)
ADMIN_SESSIONS = {}

START_PORT = int(os.environ.get('PORT') or os.environ.get('SERVER_PORT') or 8080)
MAX_PORT = 8099

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
        self.end_headers()

    def send_json(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        clean_path = self.path.split('?')[0].rstrip('/')
        if not clean_path:
            clean_path = '/'

        if clean_path in ('/', ''):
            # Redirect root to Beranda Utama (index.html)
            self.send_response(302)
            self.send_header('Location', '/WEB%20EBD/index.html')
            self.end_headers()
            return

        # DYNAMIC CLIENT CONFIGURATION (SERVED FROM .env)
        if clean_path == '/api/config.js':
            supa_url = os.environ.get('SUPABASE_URL', '')
            supa_anon = os.environ.get('SUPABASE_ANON_KEY', '')
            js_content = f"""(function() {{
    window.__ENV__ = Object.freeze({{
        SUPABASE_URL: {json.dumps(supa_url)},
        SUPABASE_ANON_KEY: {json.dumps(supa_anon)}
    }});
}})();"""
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            self.wfile.write(js_content.encode('utf-8'))
            return

        if clean_path == '/api/config/client':
            return self.send_json({
                'SUPABASE_URL': os.environ.get('SUPABASE_URL', ''),
                'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY', '')
            })

        if clean_path == '/api/admin/login':
            return self.send_json({'error': 'Method Not Allowed. Gunakan metode POST untuk otorisasi admin.'}, 405)

        # ADMIN REST API ENDPOINTS (GET)
        if clean_path.startswith('/api/admin/catalog'):
            cat_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'apify_products.json')
            try:
                with open(cat_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return self.send_json({'success': True, 'total': len(data.get('items', [])), 'items': data.get('items', [])})
            except Exception as e:
                return self.send_json({'success': False, 'error': str(e), 'items': []})

        if self.path.startswith('/api/admin/users'):
            usr_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'registered_users.json')
            try:
                with open(usr_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return self.send_json({'success': True, 'total': len(data), 'users': data})
            except Exception as e:
                return self.send_json({'success': False, 'error': str(e), 'users': []})

        if self.path.startswith('/api/admin/subscriptions'):
            sub_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'admin_subscriptions.json')
            try:
                with open(sub_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return self.send_json({'success': True, 'total': len(data), 'subscriptions': data})
            except Exception as e:
                return self.send_json({'success': False, 'error': str(e), 'subscriptions': []})

        if self.path.startswith('/api/admin/stats'):
            cat_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'apify_products.json')
            usr_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'registered_users.json')
            sub_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'admin_subscriptions.json')
            try:
                with open(cat_file, 'r', encoding='utf-8') as f:
                    c_data = json.load(f).get('items', [])
            except Exception:
                c_data = []
            try:
                with open(usr_file, 'r', encoding='utf-8') as f:
                    u_data = json.load(f)
            except Exception:
                u_data = []
            try:
                with open(sub_file, 'r', encoding='utf-8') as f:
                    s_data = json.load(f)
            except Exception:
                s_data = []

            total_revenue = sum(s.get('price', 0) for s in s_data if s.get('status') == 'paid')
            return self.send_json({
                'success': True,
                'stats': {
                    'catalog_count': len(c_data),
                    'pinterest_count': sum(1 for c in c_data if c.get('store') == 'Pinterest'),
                    'studio_3d_count': sum(1 for c in c_data if c.get('is3D') or '3d' in str(c.get('id')).lower()),
                    'marketplace_count': sum(1 for c in c_data if c.get('store') in ('Shopee', 'Uniqlo')),
                    'users_count': len(u_data),
                    'premium_users_count': sum(1 for u in u_data if u.get('tier') == 'premium'),
                    'free_users_count': sum(1 for u in u_data if u.get('tier') != 'premium'),
                    'subscriptions_count': len(s_data),
                    'pending_subscriptions_count': sum(1 for s in s_data if s.get('status') == 'pending'),
                    'paid_subscriptions_count': sum(1 for s in s_data if s.get('status') == 'paid'),
                    'total_revenue': total_revenue
                }
            })

        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split('?')[0].rstrip('/')
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            body = {}

        # -----------------------------------------------------------------
        # ADMIN AUTHENTICATION (SECURED VIA .env - NEVER EXPOSED TO WEB)
        # -----------------------------------------------------------------
        if clean_path == '/api/admin/login':
            # Reload .env secara real-time agar perubahan passcode langsung aktif tanpa restart server
            load_env_file(os.path.join(DIRECTORY, '.env'), override=True)
            passcode = str(body.get('passcode') or '').strip()
            real_passcode = os.environ.get('ADMIN_PASSCODE', '').strip()
            if not real_passcode:
                return self.send_json({
                    'success': False,
                    'error': 'ADMIN_PASSCODE belum dikonfigurasi di file .env!'
                }, 500)
            # Constant-time comparison to prevent timing attacks
            if passcode and hmac.compare_digest(passcode.encode('utf-8'), real_passcode.encode('utf-8')):
                token = secrets.token_hex(24)
                # Session valid for 7 days
                ADMIN_SESSIONS[token] = time.time() + (86400 * 7)
                return self.send_json({
                    'success': True,
                    'token': token,
                    'message': 'Autentikasi admin berhasil!',
                    'supabaseUrl': os.environ.get('SUPABASE_URL', ''),
                    'supabaseAnonKey': os.environ.get('SUPABASE_ANON_KEY', '')
                })
            else:
                return self.send_json({
                    'success': False,
                    'error': 'Passcode otorisasi admin salah! Silakan periksa file .env'
                }, 401)

        if clean_path == '/api/admin/verify-session':
            token = str(body.get('token') or self.headers.get('Authorization', '').replace('Bearer ', '')).strip()
            exp = ADMIN_SESSIONS.get(token)
            if token and exp and exp > time.time():
                return self.send_json({
                    'success': True,
                    'valid': True,
                    'supabaseUrl': os.environ.get('SUPABASE_URL', ''),
                    'supabaseAnonKey': os.environ.get('SUPABASE_ANON_KEY', '')
                })
            else:
                return self.send_json({
                    'success': False,
                    'valid': False,
                    'error': 'Sesi tidak valid atau telah kedaluwarsa'
                }, 401)

        if clean_path == '/api/admin/logout':
            token = str(body.get('token') or self.headers.get('Authorization', '').replace('Bearer ', '')).strip()
            if token in ADMIN_SESSIONS:
                del ADMIN_SESSIONS[token]
            return self.send_json({'success': True, 'message': 'Berhasil keluar dari sesi admin.'})

        # -----------------------------------------------------------------
        # ADMIN API: KATALOG OUTFIT (SAVE & DELETE)
        # -----------------------------------------------------------------
        if clean_path == '/api/admin/catalog/save':
            cat_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'apify_products.json')
            pin_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'pinterest_outfits.json')
            try:
                with open(cat_file, 'r', encoding='utf-8') as f:
                    catalog_data = json.load(f)
            except Exception:
                catalog_data = {'items': []}

            items = catalog_data.get('items', [])
            item_id = str(body.get('id') or body.get('itemId') or f"manual-{int(os.times().elapsed * 1000)}")
            body['id'] = item_id
            body['itemId'] = item_id

            # Format fields
            is_3d = bool(body.get('is3D')) or '3d' in body.get('store', '').lower()
            body['is3D'] = is_3d
            body['isPremium'] = is_3d
            body['rating'] = float(body.get('rating') or 4.9)
            body['priceTotal'] = int(body.get('priceTotal') or 0)
            if not body.get('priceDisplay'):
                body['priceDisplay'] = f"Rp {body['priceTotal']:,}".replace(',', '.') if body['priceTotal'] > 0 else "Inspirasi Pinterest"
            if not body.get('colors'):
                body['colors'] = [{'name': 'Original', 'hex': '#222222'}, {'name': 'Light Accent', 'hex': '#F5F5F0'}]
            if not body.get('items'):
                body['items'] = [{'category': 'Fashion Item', 'name': body.get('title'), 'store': body.get('store'), 'price': body.get('priceDisplay'), 'url': body.get('storeUrl')}]

            # Cek apakah item sudah ada untuk di-update, atau tambahkan di paling atas
            existing_idx = next((i for i, x in enumerate(items) if str(x.get('id')) == item_id), None)
            if existing_idx is not None:
                items[existing_idx] = body
            else:
                items.insert(0, body)

            catalog_data['items'] = items
            catalog_data['totalItems'] = len(items)
            with open(cat_file, 'w', encoding='utf-8') as f:
                json.dump(catalog_data, f, indent=2, ensure_ascii=False)

            # Jika store Pinterest, perbarui juga pinterest_outfits.json
            if body.get('store') == 'Pinterest' or str(body.get('source', '')).lower() == 'pinterest':
                try:
                    with open(pin_file, 'r', encoding='utf-8') as pf:
                        pin_data = json.load(pf)
                    p_items = pin_data.get('items', [])
                    p_idx = next((i for i, x in enumerate(p_items) if str(x.get('id')) == item_id), None)
                    if p_idx is not None:
                        p_items[p_idx] = body
                    else:
                        p_items.insert(0, body)
                    pin_data['items'] = p_items
                    pin_data['totalItems'] = len(p_items)
                    with open(pin_file, 'w', encoding='utf-8') as pf:
                        json.dump(pin_data, pf, indent=2, ensure_ascii=False)
                except Exception:
                    pass

            return self.send_json({'success': True, 'message': 'Produk berhasil disimpan ke katalog!', 'item': body})

        if clean_path == '/api/admin/catalog/delete':
            target_id = str(body.get('id') or body.get('itemId') or '')
            if not target_id:
                return self.send_json({'success': False, 'error': 'Parameter id diperlukan'}, 400)

            cat_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'apify_products.json')
            pin_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'pinterest_outfits.json')
            try:
                with open(cat_file, 'r', encoding='utf-8') as f:
                    catalog_data = json.load(f)
                old_len = len(catalog_data.get('items', []))
                catalog_data['items'] = [x for x in catalog_data.get('items', []) if str(x.get('id')) != target_id and str(x.get('itemId')) != target_id]
                catalog_data['totalItems'] = len(catalog_data['items'])
                with open(cat_file, 'w', encoding='utf-8') as f:
                    json.dump(catalog_data, f, indent=2, ensure_ascii=False)

                # Hapus dari pinterest_outfits.json juga jika ada
                try:
                    with open(pin_file, 'r', encoding='utf-8') as pf:
                        pin_data = json.load(pf)
                    pin_data['items'] = [x for x in pin_data.get('items', []) if str(x.get('id')) != target_id and str(x.get('itemId')) != target_id]
                    pin_data['totalItems'] = len(pin_data['items'])
                    with open(pin_file, 'w', encoding='utf-8') as pf:
                        json.dump(pin_data, pf, indent=2, ensure_ascii=False)
                except Exception:
                    pass

                deleted_count = old_len - len(catalog_data['items'])
                return self.send_json({'success': True, 'deleted': deleted_count, 'message': f'Berhasil menghapus item {target_id}'})
            except Exception as e:
                return self.send_json({'success': False, 'error': str(e)}, 500)

        # -----------------------------------------------------------------
        # ADMIN API: MANAJEMEN AKUN PENGGUNA (SAVE & DELETE)
        # -----------------------------------------------------------------
        if clean_path == '/api/admin/users/save':
            usr_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'registered_users.json')
            email = (body.get('email') or '').strip().lower()
            if not email:
                return self.send_json({'success': False, 'error': 'Email diperlukan'}, 400)

            try:
                with open(usr_file, 'r', encoding='utf-8') as f:
                    users = json.load(f)
            except Exception:
                users = []

            idx = next((i for i, u in enumerate(users) if u.get('email', '').lower() == email), None)
            if idx is not None:
                users[idx].update(body)
                updated_user = users[idx]
            else:
                body['id'] = body.get('id') or f"usr-{int(os.times().elapsed * 1000)}"
                body['email'] = email
                body['created_at'] = body.get('created_at') or '2026-11-21T00:00:00Z'
                body['tier'] = body.get('tier') or 'free'
                body['questions_remaining'] = body.get('questions_remaining', 10)
                users.insert(0, body)
                updated_user = body

            with open(usr_file, 'w', encoding='utf-8') as f:
                json.dump(users, f, indent=2, ensure_ascii=False)

            return self.send_json({'success': True, 'message': 'Data pengguna berhasil diperbarui!', 'user': updated_user})

        if clean_path == '/api/admin/users/delete':
            email = (body.get('email') or '').strip().lower()
            user_id = str(body.get('id') or '')
            usr_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'registered_users.json')
            try:
                with open(usr_file, 'r', encoding='utf-8') as f:
                    users = json.load(f)
                users = [u for u in users if u.get('email', '').lower() != email and str(u.get('id', '')) != user_id]
                with open(usr_file, 'w', encoding='utf-8') as f:
                    json.dump(users, f, indent=2, ensure_ascii=False)
                return self.send_json({'success': True, 'message': f'Pengguna {email or user_id} berhasil dihapus'})
            except Exception as e:
                return self.send_json({'success': False, 'error': str(e)}, 500)

        # -----------------------------------------------------------------
        # ADMIN API: PEMBAYARAN & LANGGANAN (VERIFIKASI, SAVE, DELETE)
        # -----------------------------------------------------------------
        if clean_path == '/api/admin/subscriptions/verify':
            sub_id = str(body.get('id') or '')
            sub_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'admin_subscriptions.json')
            usr_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'registered_users.json')

            try:
                with open(sub_file, 'r', encoding='utf-8') as f:
                    subs = json.load(f)
            except Exception:
                subs = []

            target_sub = next((s for s in subs if str(s.get('id')) == sub_id), None)
            if not target_sub:
                return self.send_json({'success': False, 'error': 'Transaksi tidak ditemukan'}, 404)

            # Hitung masa aktif langganan
            pkg = str(target_sub.get('package', 'bulanan')).lower()
            days = 7 if 'minggu' in pkg else (365 if 'tahun' in pkg else 30)
            now_iso = "2026-11-21T11:00:00Z"
            # Expiry 30 hari
            target_sub['status'] = 'paid'
            target_sub['started_at'] = now_iso
            target_sub['expires_at'] = "2026-12-21T23:59:59Z" if days == 30 else ("2026-11-28T23:59:59Z" if days == 7 else "2027-11-21T23:59:59Z")

            with open(sub_file, 'w', encoding='utf-8') as f:
                json.dump(subs, f, indent=2, ensure_ascii=False)

            # Otomatis aktifkan tier pengguna menjadi Premium
            target_email = target_sub.get('user_email', '').lower()
            if target_email:
                try:
                    with open(usr_file, 'r', encoding='utf-8') as f:
                        users = json.load(f)
                    for u in users:
                        if u.get('email', '').lower() == target_email:
                            u['tier'] = 'premium'
                            u['premium_expires_at'] = target_sub['expires_at']
                            break
                    with open(usr_file, 'w', encoding='utf-8') as f:
                        json.dump(users, f, indent=2, ensure_ascii=False)
                except Exception:
                    pass

            return self.send_json({
                'success': True,
                'message': f'Transaksi {sub_id} berhasil diverifikasi! Akun {target_email} kini aktif sebagai Premium.',
                'subscription': target_sub
            })

        if clean_path == '/api/admin/subscriptions/save':
            sub_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'admin_subscriptions.json')
            try:
                with open(sub_file, 'r', encoding='utf-8') as f:
                    subs = json.load(f)
            except Exception:
                subs = []

            sub_id = str(body.get('id') or f"SUB-{int(os.times().elapsed * 1000)}")
            body['id'] = sub_id
            existing_idx = next((i for i, s in enumerate(subs) if str(s.get('id')) == sub_id), None)
            if existing_idx is not None:
                subs[existing_idx].update(body)
            else:
                subs.insert(0, body)

            with open(sub_file, 'w', encoding='utf-8') as f:
                json.dump(subs, f, indent=2, ensure_ascii=False)
            return self.send_json({'success': True, 'message': 'Transaksi berhasil disimpan!', 'subscription': body})

        if clean_path == '/api/admin/subscriptions/delete':
            sub_id = str(body.get('id') or '')
            sub_file = os.path.join(DIRECTORY, 'WEB EBD', 'data', 'admin_subscriptions.json')
            try:
                with open(sub_file, 'r', encoding='utf-8') as f:
                    subs = json.load(f)
                subs = [s for s in subs if str(s.get('id')) != sub_id]
                with open(sub_file, 'w', encoding='utf-8') as f:
                    json.dump(subs, f, indent=2, ensure_ascii=False)
                return self.send_json({'success': True, 'message': f'Transaksi {sub_id} berhasil dihapus'})
            except Exception as e:
                return self.send_json({'success': False, 'error': str(e)}, 500)

        # -----------------------------------------------------------------
        # AI CURATION API
        # -----------------------------------------------------------------
        if clean_path == '/api/ai/curate':
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

        return self.send_json({'error': f'Endpoint {clean_path} tidak ditemukan (404)'}, 404)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
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
    print(f" -> Admin Console:      http://localhost:{active_port}/WEB%20EBD/admin.html", flush=True)
    print(f" -> Panduan & Tutorial: http://localhost:{active_port}/WEB%20EBD/tutorial.html", flush=True)
    print(f" -> Masuk (Login 3D):   http://localhost:{active_port}/WEB%20EBD/login.html", flush=True)
    print(f" -> AI Curate API:      http://localhost:{active_port}/api/ai/curate", flush=True)
    print(" [Apify Sync] Jalankan: python sync_apify_products.py", flush=True)
    print(" [Pinterest Sync] Jalankan: python sync_pinterest_outfits.py", flush=True)
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
