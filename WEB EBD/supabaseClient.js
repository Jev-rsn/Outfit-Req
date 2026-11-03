/**
 * Supabase Client Configuration for Outfit Req
 * Menggunakan global window.supabase dari CDN script tag di index.html
 */

// Kredensial Supabase Proyek Outfit Req (Ref: iklhjmmmolulglxirvrc)
const SUPABASE_URL = "https://iklhjmmmolulglxirvrc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbGhqbW1tb2x1bGdseGlydnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODAzNjQsImV4cCI6MjEwODg1NjM2NH0.NsKrraBp5W2SEDzKXM6GWevYr1g4iwGUei2CSawqNmQ";

export { SUPABASE_URL, SUPABASE_ANON_KEY };

// Cek apakah Supabase library tersedia dari global <script> tag
const getClient = () => {
  if (
    typeof window !== "undefined" &&
    window.supabase &&
    window.supabase.createClient
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

// ─── 6. Cek Status Premium Customer dari Database Supabase ──
export async function getCustomerPremiumStatus(email) {
  const client = sb();
  if (!client || !email) return { isPremium: false, expiresAt: null };
  const cleanEmail = String(email).toLowerCase().trim();
  const now = new Date();

  try {
    // 1. Cek tabel users di Supabase
    const { data: dbUser, error: uErr } = await client
      .from("users")
      .select("tier, premium_expires_at, name")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (!uErr && dbUser) {
      if (dbUser.tier === "premium") {
        if (!dbUser.premium_expires_at) {
          const defaultExp = new Date();
          defaultExp.setDate(defaultExp.getDate() + 30);
          return { isPremium: true, expiresAt: defaultExp.toISOString(), name: dbUser.name };
        } else {
          const exp = new Date(dbUser.premium_expires_at);
          if (exp > now) {
            return { isPremium: true, expiresAt: dbUser.premium_expires_at, name: dbUser.name };
          }
        }
      }
    }

    // 2. Cek tabel premium_subscriptions jika belum terdeteksi dari tabel users
    const { data: sub, error: sErr } = await client
      .from("premium_subscriptions")
      .select("status, expires_at, user_name")
      .ilike("user_email", cleanEmail)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sErr && sub && sub.expires_at) {
      const exp = new Date(sub.expires_at);
      if (exp > now) {
        // Sinkronkan kembali ke tabel users
        try {
          await client.from("users").upsert({
            email: cleanEmail,
            tier: "premium",
            premium_expires_at: sub.expires_at
          }, { onConflict: "email" });
        } catch(e) {}
        return { isPremium: true, expiresAt: sub.expires_at, name: sub.user_name };
      }
    }
  } catch (err) {
    console.warn("[OutfitReq] getCustomerPremiumStatus error:", err);
  }

  return { isPremium: false, expiresAt: null };
}
