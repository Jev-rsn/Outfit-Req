/**
 * Supabase Client Configuration for Outfit Req
 * Menggunakan kredensial dari .env via /api/config.js (window.__ENV__)
 */

function _dec(b) { try { return atob(b); } catch (_) { return ""; } }
const SUPABASE_URL =
  (typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__.SUPABASE_URL) ||
  _dec("aHR0cHM6Ly9pa2xoam1tbW9sdWxnbHhpcnZyYy5zdXBhYmFzZS5jbw==");
const SUPABASE_ANON_KEY =
  (typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__.SUPABASE_ANON_KEY) ||
  _dec("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjeUk2SW5OMWNHRmlZWE5sSWl3aWNtVWlPaUlwYTJ4b2FtbXRiMngxYkdkc2VHbHlkbkpqSWl3aWNtOXNaU0k2SW1GdWIyNGlMQ0pwWVhRaU9qRTNPVE15T0RBek5qUXNJbVY0Y0NJNk1qRXdPRGcxTmpNMk5IMHBPc0tycmFCcDVXMlNFREpLWE02R1dldllrMWc0aXdHVWVpMkNTYXdxTm1R");

export { SUPABASE_URL, SUPABASE_ANON_KEY };

// Cek apakah Supabase library tersedia dari global <script> tag
const getClient = () => {
  if (
    typeof window !== "undefined" &&
    window.supabase &&
    window.supabase.createClient &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
  ) {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return null;
};

let _client = null;
try {
  _client = getClient();
  if (_client) {
    console.log("[OutfitReq] Supabase Client siap.");
  } else {
    console.warn(
      "[OutfitReq] Supabase library belum termuat, menggunakan mode demo.",
    );
  }
} catch (e) {
  console.warn("[OutfitReq] Gagal membuat Supabase client:", e);
}

// Pastikan client selalu bisa diakses (lazy)
const sb = () => {
  if (!_client) {
    try {
      _client = getClient();
    } catch (e) {
      /* silent */
    }
  }
  return _client;
};

export const isSupabaseConfigured = () => !!sb();
export const getSupabaseClient = () => sb();

// Helper untuk mendapatkan tautan redirect ke halaman verifikasi akun terdaftar
const getLoginVerifiedRedirectUrl = () => {
  if (typeof window === "undefined") return "";
  const pathname = window.location.pathname;
  const loginIdx = pathname.search(/WEB(%20|\s+)EBD(%20|\s+)Login/i);
  if (loginIdx !== -1) {
    const basePath = pathname.substring(0, loginIdx);
    return (
      window.location.origin +
      basePath +
      "WEB%20EBD%20Login/index.html?verified=true"
    );
  }
  return window.location.origin + "/WEB%20EBD%20Login/index.html?verified=true";
};

// ─── 1. Sign In ────────────────────────────────
export async function signInUser(email, password) {
  const client = sb();
  if (client) {
    console.log("[OutfitReq] Login via Supabase:", email);
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }
  // Demo fallback
  return {
    user: {
      id: "demo-" + Date.now(),
      email,
      user_metadata: { full_name: email.split("@")[0] },
    },
    session: { access_token: "demo" },
  };
}

// ─── 2. Sign Up ────────────────────────────────
export async function signUpUser(email, password, fullName) {
  const client = sb();
  if (client) {
    console.log("[OutfitReq] Registrasi via Supabase:", email);
    const redirectTo = getLoginVerifiedRedirectUrl();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
    return data;
  }
  // Demo fallback
  return {
    user: {
      id: "demo-" + Date.now(),
      email,
      user_metadata: { full_name: fullName },
    },
    session: null,
  };
}

// ─── 3. Kirim Ulang Tautan Verifikasi Email ────
export async function resendVerificationEmail(email) {
  const client = sb();
  if (client) {
    console.log(
      "[OutfitReq] Mengirim ulang tautan verifikasi via Supabase:",
      email,
    );
    const redirectTo = getLoginVerifiedRedirectUrl();
    const { data, error } = await client.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
    return data;
  }
  return { message: "Demo link terkirim" };
}

// ─── 4. Reset Password ────────────────────────
export async function resetPasswordForEmail(email) {
  const client = sb();
  if (client) {
    const { data, error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href,
    });
    if (error) throw error;
    return data;
  }
  return { message: "Demo reset sent" };
}

// ─── 5. Get Current User ──────────────────────
export async function getCurrentUser() {
  const client = sb();
  if (client) {
    const {
      data: { session },
    } = await client.auth.getSession();
    if (session?.user) return session.user;
  }
  try {
    const local = localStorage.getItem("outfit_req_user");
    if (local) return JSON.parse(local);
  } catch (e) {}
  return null;
}
