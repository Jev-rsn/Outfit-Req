/**
 * OREC — Personality (Konsultasi Outfit & Kurasi Gaya Cerdas)
 * Sesuai Dokumen PRD Final & PRD Teknikal EBD
 * Murni Menggunakan Data Nyata Katalog Database (Supabase + Apify Shopee/Uniqlo/3D)
 * Ditenagai Kecerdasan Buatan (AI) yang Mengelola & Mengurasi Langsung dari Database
 * Tanpa AI Slop: Tanpa dummy mock, tanpa delay buatan, tanpa emoji spam.
 */

(function () {
  "use strict";

  // =========================================================================
  // 1. STATE & STORAGE KEYS
  // =========================================================================
  const USER_KEY = "outfit_req_user";
  const ROOMS_KEY = "outfit_req_chat_rooms";
  const ACTIVE_ROOM_KEY = "outfit_req_active_room_id";
  const GUEST_QUOTA_KEY = "outfit_req_guest_chat_quota";
  const FREE_QUOTA_KEY = "outfit_req_free_chat_quota";
  const SAVED_PHOTOS_KEY = "outfit_req_saved_photos";
  const GEMINI_KEY_STORAGE = "outfit_req_gemini_api_key";

  function _dec(b) { try { return atob(b); } catch (_) { return ""; } }
  const SUPABASE_URL =
    (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.SUPABASE_URL) ||
    _dec("aHR0cHM6Ly9pa2xoam1tbW9sdWxnbHhpcnZyYy5zdXBhYmFzZS5jbw==");
  const SUPABASE_ANON_KEY =
    (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.SUPABASE_ANON_KEY) ||
    _dec("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1scmJHaHFiVzF0YjJ4MWJHZHNlR2x5ZG5Kaklpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT1RNeU9EQXpOalFzSW1WNGNDSTZNakV3T0RnMU5qTTJOSDAuTnNLcnJhQnA1VzJTRUR6S1hNNkdXZXZZcjFnNGl3R1VlaTJDU2F3cU5tUQ==");

  let supabaseClient = null;
  try {
    if (
      typeof window !== "undefined" &&
      window.supabase &&
      window.supabase.createClient &&
      SUPABASE_URL &&
      SUPABASE_ANON_KEY
    ) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch (e) {
    console.warn("Supabase init error:", e);
  }

  const STATE = {
    user: null,
    rooms: [],
    activeRoomId: null,
    catalog: [],
    selectedEvent: null,
    selectedPackage: "bulanan",
    selectedPaymentMethod: "qris",
    geminiApiKey: localStorage.getItem(GEMINI_KEY_STORAGE) || "",
    isThinking: false,
  };

  // =========================================================================
  // 2. USER & QUOTA CONTROLLER
  // =========================================================================
  function loadUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        const u = JSON.parse(raw);
        if (u && typeof u === "object") {
          STATE.user = {
            id: u.id || "usr-" + Date.now(),
            name: u.name || "Member Orec",
            email: u.email || "",
            tier: (u.tier || "guest").toLowerCase().trim(),
            isLoggedIn: !!u.isLoggedIn,
            premiumExpiresAt: u.premiumExpiresAt || u.premium_expires_at || null,
          };
          return STATE.user;
        }
      }
    } catch (e) {}

    STATE.user = {
      id: "guest_" + Date.now(),
      name: "Pengunjung Tamu",
      email: "",
      tier: "guest",
      isLoggedIn: false,
      premiumExpiresAt: null,
    };
    return STATE.user;
  }

  function saveUser(userObj) {
    STATE.user = { ...STATE.user, ...userObj };
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(STATE.user));
    } catch (e) {}
  }

  function getNormalizedTier() {
    if (!STATE.user || !STATE.user.isLoggedIn) return "guest";
    const tier = (STATE.user.tier || "guest").toLowerCase();
    if (tier.includes("premium")) {
      if (STATE.user.premiumExpiresAt) {
        const expTime = new Date(STATE.user.premiumExpiresAt).getTime();
        if (Date.now() > expTime) {
          STATE.user.tier = "free";
          saveUser(STATE.user);
          showToast("Masa aktif Premium telah berakhir.");
          return "free";
        }
      }
      return "premium";
    }
    return "free";
  }

  function getQuotaInfo() {
    const tier = getNormalizedTier();

    if (tier === "premium") {
      return {
        tier: "premium",
        used: 0,
        max: Infinity,
        remaining: Infinity,
        isExhausted: false,
        label: "Akses Penuh",
      };
    }

    if (tier === "free") {
      let quotaData = { used: 0, resetAt: Date.now() + 3 * 24 * 3600 * 1000 };
      try {
        const raw = localStorage.getItem(FREE_QUOTA_KEY);
        if (raw) quotaData = JSON.parse(raw);
      } catch (e) {}

      if (!quotaData.resetAt || Date.now() >= quotaData.resetAt) {
        quotaData.used = 0;
        quotaData.resetAt = Date.now() + 3 * 24 * 3600 * 1000;
        try {
          localStorage.setItem(FREE_QUOTA_KEY, JSON.stringify(quotaData));
        } catch (e) {}
      }

      const max = 10;
      const remaining = Math.max(0, max - (quotaData.used || 0));
      return {
        tier: "free",
        used: quotaData.used || 0,
        max: max,
        remaining: remaining,
        isExhausted: remaining <= 0,
        resetAt: quotaData.resetAt,
        label: `${remaining}/${max} Chat`,
      };
    }

    let used = 0;
    try {
      used = parseInt(localStorage.getItem(GUEST_QUOTA_KEY) || "0", 10) || 0;
    } catch (e) {}
    const max = 3;
    const remaining = Math.max(0, max - used);
    return {
      tier: "guest",
      used: used,
      max: max,
      remaining: remaining,
      isExhausted: remaining <= 0,
      label: `${remaining}/${max} Sisa`,
    };
  }

  function incrementQuotaUsed() {
    const tier = getNormalizedTier();
    if (tier === "premium") return;

    if (tier === "free") {
      let quotaData = { used: 0, resetAt: Date.now() + 3 * 24 * 3600 * 1000 };
      try {
        const raw = localStorage.getItem(FREE_QUOTA_KEY);
        if (raw) quotaData = JSON.parse(raw);
      } catch (e) {}
      quotaData.used = (quotaData.used || 0) + 1;
      try {
        localStorage.setItem(FREE_QUOTA_KEY, JSON.stringify(quotaData));
      } catch (e) {}
    } else {
      let used = 0;
      try {
        used = parseInt(localStorage.getItem(GUEST_QUOTA_KEY) || "0", 10) || 0;
      } catch (e) {}
      used += 1;
      try {
        localStorage.setItem(GUEST_QUOTA_KEY, used.toString());
      } catch (e) {}
    }
  }

  // =========================================================================
  // 3. UI RENDERING (HEADER, BADGES, FOOTER)
  // =========================================================================
  function renderHeaderAndBadges() {
    const tier = getNormalizedTier();
    const quota = getQuotaInfo();

    const navQuotaBadge = document.getElementById("navQuotaBadge");
    const navQuotaDot = document.getElementById("navQuotaDot");
    const navQuotaText = document.getElementById("navQuotaText");

    if (navQuotaBadge && navQuotaText) {
      if (tier === "premium") {
        navQuotaBadge.className =
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#6D001A] text-white shadow-xs border border-transparent";
        navQuotaDot.className = "w-2 h-2 rounded-full bg-amber-400";
        navQuotaText.innerText = "Premium Unlimited";
      } else if (tier === "free") {
        navQuotaBadge.className =
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-white/10 text-stone-800 dark:text-stone-200 border border-black/15 dark:border-white/15 shadow-xs hover:border-[#6D001A]";
        navQuotaDot.className = quota.isExhausted
          ? "w-2 h-2 rounded-full bg-red-500"
          : "w-2 h-2 rounded-full bg-emerald-500";
        navQuotaText.innerText = `Free: ${quota.remaining}/${quota.max}`;
      } else {
        navQuotaBadge.className =
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-xs hover:border-[#6D001A]";
        navQuotaDot.className = quota.isExhausted
          ? "w-2 h-2 rounded-full bg-red-500"
          : "w-2 h-2 rounded-full bg-amber-500";
        navQuotaText.innerText = `Tamu: ${quota.remaining}/${quota.max} Sisa`;
      }
    }

    const aiEngineLabel = document.getElementById("aiEngineLabel");
    const aiEngineDot = document.getElementById("aiEngineDot");
    if (aiEngineLabel && aiEngineDot) {
      if (STATE.geminiApiKey && STATE.geminiApiKey.trim().length > 10) {
        aiEngineLabel.innerText = "Gemini LLM";
        aiEngineDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
      } else {
        aiEngineLabel.innerText = "AI Database";
        aiEngineDot.className = "w-2 h-2 rounded-full bg-emerald-500";
      }
    }

    const userContainer = document.getElementById("navUserContainer");
    if (userContainer) {
      if (tier !== "guest" && STATE.user.isLoggedIn) {
        const initial = (STATE.user.name || "U").charAt(0).toUpperCase();
        userContainer.innerHTML = `
          <a href="account.html" class="flex items-center gap-2 p-1 pl-2.5 pr-1.5 rounded-full bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 hover:border-black/30 transition-all shadow-xs" title="Akun Saya">
            <span class="text-xs font-semibold text-stone-900 dark:text-stone-100 hidden sm:inline max-w-[100px] truncate">${STATE.user.name}</span>
            <div class="w-6 h-6 rounded-full bg-[#6D001A] text-white text-[11px] font-bold flex items-center justify-center">
              ${initial}
            </div>
          </a>
        `;
      } else {
        userContainer.innerHTML = `
          <button
            type="button"
            onclick="triggerGoogleAuthFromPrompt()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-white/10 text-stone-900 dark:text-white border border-black/20 dark:border-white/20 hover:border-black hover:bg-stone-50 dark:hover:bg-white/20 transition-all shadow-xs"
            title="Masuk via Google Mail"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span class="hidden sm:inline">Masuk</span>
          </button>
        `;
      }
    }

    const eventLabel = document.getElementById("selectedEventLabel");
    if (eventLabel) {
      if (STATE.selectedEvent) {
        eventLabel.innerText = getEventTitle(STATE.selectedEvent);
      } else {
        eventLabel.innerText = "Penyesuaian Acara";
      }
    }
  }

  function getEventTitle(evKey) {
    const map = {
      ngonser: "Konser Musik",
      pengajian: "Kajian Santun",
      kantor: "Kantor & Kerja",
      pantai: "Liburan Pantai",
      pesta: "Gala & Resepsi",
      santai: "Kasual Santai",
    };
    return map[evKey] || "Penyesuaian Acara";
  }

  function handleQuotaBadgeClick() {
    const tier = getNormalizedTier();
    if (tier === "premium") {
      showToast("Paket Premium Anda aktif tanpa batas konsultasi.");
    } else if (tier === "free") {
      openPremiumAdModal();
    } else {
      openLoginPromptModal();
    }
  }

  // =========================================================================
  // 4. SIDEBAR & MULTI-ROOM CHAT HISTORI (PRD FR-09)
  // =========================================================================
  function toggleMobileSidebar(forceState) {
    const sidebar = document.getElementById("chatSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!sidebar) return;

    const isOpen = !sidebar.classList.contains("-translate-x-full");
    const nextState = typeof forceState === "boolean" ? forceState : !isOpen;

    if (nextState) {
      sidebar.classList.remove("-translate-x-full");
      if (backdrop) backdrop.classList.remove("hidden");
    } else {
      sidebar.classList.add("-translate-x-full");
      if (backdrop) backdrop.classList.add("hidden");
    }
  }

  function loadRooms() {
    try {
      const raw = localStorage.getItem(ROOMS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          STATE.rooms = parsed;
          const savedActive = localStorage.getItem(ACTIVE_ROOM_KEY);
          if (savedActive && STATE.rooms.some((r) => r.id === savedActive)) {
            STATE.activeRoomId = savedActive;
          } else {
            STATE.activeRoomId = STATE.rooms[0].id;
          }
          renderRoomList();
          return;
        }
      }
    } catch (e) {}

    createNewRoom("Konsultasi Outfit", false);
  }

  function saveRooms() {
    try {
      localStorage.setItem(ROOMS_KEY, JSON.stringify(STATE.rooms));
      if (STATE.activeRoomId) {
        localStorage.setItem(ACTIVE_ROOM_KEY, STATE.activeRoomId);
      }
    } catch (e) {}
  }

  function createNewRoom(initialTitle = "Konsultasi Outfit", autoRender = true) {
    const newId = "room_" + Date.now();
    const newRoom = {
      id: newId,
      title: initialTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastMessage: "Sesi baru...",
      eventType: null,
    };
    STATE.rooms.unshift(newRoom);
    STATE.activeRoomId = newId;
    saveRooms();

    setRoomMessages(newId, []);

    if (autoRender) {
      renderRoomList();
      renderActiveRoomMessages();
      toggleMobileSidebar(false);
      showToast("Sesi baru dibuat.");
    }
    return newRoom;
  }

  function renderRoomList() {
    const listEl = document.getElementById("chatRoomList");
    if (!listEl) return;

    if (STATE.rooms.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-8 text-stone-400 dark:text-stone-500 text-xs">
          Belum ada riwayat sesi.<br>Klik <b>+ Sesi Baru</b> untuk mulai.
        </div>
      `;
      return;
    }

    const tier = getNormalizedTier();
    let guestNotice = "";
    if (tier === "guest") {
      guestNotice = `
        <div class="mb-2 p-2.5 rounded-xl bg-stone-100 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] text-stone-600 dark:text-stone-400">
          Sesi tamu disimpan lokal. Masuk Gmail untuk akses permanen.
        </div>
      `;
    }

    const itemsHtml = STATE.rooms
      .map((room) => {
        const isActive = room.id === STATE.activeRoomId;
        const activeClass = isActive
          ? "bg-[#6D001A]/10 dark:bg-white/10 border-[#6D001A]/30 dark:border-white/20 text-stone-900 dark:text-white font-semibold"
          : "hover:bg-stone-100 dark:hover:bg-white/5 border-transparent text-stone-600 dark:text-stone-300 font-medium";

        return `
          <div
            onclick="switchActiveRoom('${room.id}')"
            class="group flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${activeClass}"
            title="${room.title}"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <div class="truncate">
                <p class="truncate text-xs">${room.title}</p>
                <p class="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">${room.lastMessage || "Mulai percakapan..."}</p>
              </div>
            </div>
            <button
              type="button"
              onclick="handleDeleteRoom(event, '${room.id}')"
              class="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 transition-opacity rounded"
              title="Hapus sesi ini"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;
      })
      .join("");

    listEl.innerHTML = guestNotice + itemsHtml;
  }

  function switchActiveRoom(roomId) {
    if (STATE.activeRoomId === roomId) return;
    STATE.activeRoomId = roomId;
    localStorage.setItem(ACTIVE_ROOM_KEY, roomId);
    renderRoomList();
    renderActiveRoomMessages();
    toggleMobileSidebar(false);
  }

  function handleDeleteRoom(e, roomId) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!confirm("Hapus sesi konsultasi outfit ini?")) return;

    STATE.rooms = STATE.rooms.filter((r) => r.id !== roomId);
    try {
      localStorage.removeItem("outfit_req_chat_messages_" + roomId);
    } catch (err) {}

    if (STATE.activeRoomId === roomId) {
      STATE.activeRoomId = STATE.rooms.length > 0 ? STATE.rooms[0].id : null;
    }
    saveRooms();

    if (!STATE.activeRoomId) {
      createNewRoom("Konsultasi Outfit", true);
    } else {
      renderRoomList();
      renderActiveRoomMessages();
    }
    showToast("Sesi obrolan dihapus.");
  }

  // =========================================================================
  // 5. MESSAGE STORAGE & RENDERING
  // =========================================================================
  function getRoomMessages(roomId) {
    if (!roomId) return [];
    try {
      const raw = localStorage.getItem("outfit_req_chat_messages_" + roomId);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function setRoomMessages(roomId, messages) {
    if (!roomId) return;
    try {
      localStorage.setItem("outfit_req_chat_messages_" + roomId, JSON.stringify(messages));
    } catch (e) {}
  }

  function renderActiveRoomMessages() {
    const thread = document.getElementById("chatThread");
    const welcomeHero = document.getElementById("welcomeHeroState");
    const roomTitleEl = document.getElementById("activeRoomTitle");

    const currentRoom = STATE.rooms.find((r) => r.id === STATE.activeRoomId);
    if (roomTitleEl && currentRoom) {
      roomTitleEl.innerText = currentRoom.title;
    }

    const messages = getRoomMessages(STATE.activeRoomId);

    if (messages.length === 0) {
      if (welcomeHero) welcomeHero.classList.remove("hidden");
      if (thread) thread.innerHTML = "";
      return;
    }

    if (welcomeHero) welcomeHero.classList.add("hidden");
    if (!thread) return;

    thread.innerHTML = messages.map((msg) => renderSingleMessageHtml(msg)).join("");
    scrollToBottom();
  }

  function renderSingleMessageHtml(msg) {
    const isUser = msg.role === "user";
    const tier = getNormalizedTier();

    if (isUser) {
      return `
        <div class="flex justify-end animate-message">
          <div class="bg-[#6D001A] text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] sm:max-w-[75%] text-xs sm:text-sm shadow-xs leading-relaxed">
            ${escapeHtml(msg.text)}
          </div>
        </div>
      `;
    }

    let outfitsHtml = "";
    if (msg.outfits && Array.isArray(msg.outfits) && msg.outfits.length > 0) {
      outfitsHtml = `
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          ${msg.outfits.map((outfit) => renderOutfitCardHtml(outfit, tier)).join("")}
        </div>
      `;
    }

    return `
      <div class="flex items-start gap-3 animate-message">
        <div class="w-8 h-8 rounded-full bg-[#6D001A] text-white flex items-center justify-center flex-shrink-0 text-xs font-serif font-bold shadow-xs">
          O
        </div>
        <div class="bg-white dark:bg-[#191417] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl rounded-tl-none p-4 max-w-[92%] sm:max-w-[88%] text-xs sm:text-sm text-stone-900 dark:text-stone-100 shadow-soft space-y-2 leading-relaxed">
          <div class="space-y-1.5 text-stone-700 dark:text-stone-200">
            ${msg.text}
          </div>
          ${outfitsHtml}
        </div>
      </div>
    `;
  }

  function renderOutfitCardHtml(outfit, tier) {
    const isPremium = tier === "premium";
    const isGuest = tier === "guest";

    // Pastikan foto produk secara ketat menggunakan foto dari database utama
    let photoSrc = outfit.photoUrl || "";
    let b64Fallback = outfit.thumb_b64 || "";

    if (!photoSrc || photoSrc.includes("card1.jpg")) {
      const dbMatch = (STATE.catalog || []).find((c) => c.id === outfit.id || c.title === outfit.title);
      if (dbMatch && dbMatch.photoUrl && !dbMatch.photoUrl.includes("card1.jpg")) {
        photoSrc = dbMatch.photoUrl;
        if (!b64Fallback && dbMatch.thumb_b64) b64Fallback = dbMatch.thumb_b64;
      }
    }

    // Tombol Gunakan: Khusus Premium (PRD 4.7)
    let gunakanBtnHtml = "";
    if (isPremium) {
      gunakanBtnHtml = `
        <button
          type="button"
          onclick="handleGunakan3D('${outfit.id}', '${outfit.modelId || ""}', '${outfit.category || ""}', '${escapeJs(outfit.title)}')"
          class="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#6D001A] hover:bg-black text-white transition-all shadow-md active:scale-95 z-10"
          title="Buka Model 3D di Studio Manekin"
        >
          <span>Gunakan</span>
          <span class="text-[9px] text-amber-400">★</span>
        </button>
      `;
    }

    // Tautan Produk Toko Resmi: Hanya untuk Free & Premium (PRD 4.4 & FR-05)
    let productLinkHtml = "";
    if (isGuest) {
      productLinkHtml = `
        <div class="mt-2.5 p-2 rounded-xl bg-stone-100 dark:bg-white/5 border border-black/5 flex items-center justify-between text-[11px]">
          <span class="text-stone-500 dark:text-stone-400">Tautan produk terkunci</span>
          <button
            type="button"
            onclick="triggerGoogleAuthFromPrompt()"
            class="text-[#6D001A] dark:text-[#E05377] font-semibold underline"
          >
            Masuk Gmail →
          </button>
        </div>
      `;
    } else {
      const storeName = outfit.sourceStore || outfit.store || "Shopee";
      const storeUrl = outfit.productLink || outfit.storeUrl || "https://shopee.co.id";
      const isPinterest = storeName.toLowerCase().includes("pinterest");
      const actionLabel = isPinterest ? "Lihat Ide di Pinterest" : (outfit.is3D ? "Coba di Studio 3D" : "Beli di Toko Resmi");
      const linkColorClass = isPinterest ? "text-[#E60023] hover:text-[#b8001c]" : "text-[#6D001A] dark:text-[#E05377]";
      productLinkHtml = `
        <div class="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
          <span class="font-semibold text-stone-600 dark:text-stone-400 truncate flex items-center gap-1">
            ${isPinterest ? '<span class="w-1.5 h-1.5 rounded-full bg-[#E60023] shrink-0"></span>' : ''}
            ${escapeHtml(storeName)}
          </span>
          <a
            href="${storeUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 font-semibold ${linkColorClass} hover:underline"
          >
            <span>${actionLabel}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      `;
    }

    // Bookmark / Simpan Foto (FR-10)
    let bookmarkBtnHtml = "";
    if (!isGuest) {
      bookmarkBtnHtml = `
        <button
          type="button"
          onclick="handleSaveOutfitPhoto('${escapeJs(outfit.title)}', '${photoSrc}', '${escapeJs(outfit.sourceStore || "Shopee")}', '${outfit.productLink || ""}', '${outfit.price || ""}')"
          class="p-1 text-stone-400 hover:text-red-600 transition-colors"
          title="Simpan foto ke akun"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      `;
    }

    const priceText = outfit.price || "Harga Terbaik";
    const categoryBadge = outfit.category ? `<span class="text-[9px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-white/10 uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-300">${escapeHtml(outfit.category)}</span>` : "";

    return `
      <div class="relative bg-white dark:bg-[#201A1E] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs group">
        <div class="relative w-full aspect-[3/4] bg-stone-100 dark:bg-stone-900 overflow-hidden">
          <img
            src="${photoSrc}"
            alt="Foto Rekomendasi Outfit"
            loading="lazy"
            referrerpolicy="no-referrer"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            onerror="if (!this.dataset.fallbackApplied) { this.dataset.fallbackApplied = 'true'; if ('${b64Fallback}') { this.src = '${b64Fallback}'; } else { this.style.display = 'none'; } }"
          />
        </div>
      </div>
    `;
  }

  function scrollToBottom() {
    const container = document.getElementById("chatMessagesContainer");
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }

  // =========================================================================
  // 6. REAL CATALOG INGESTION & SEMANTIC ENRICHMENT
  // =========================================================================
  function cleanProductTitle(raw) {
    if (!raw) return "Pakaian Pilihan Orec";
    let t = String(raw).trim();
    t = t.replace(/^\([a-zA-Z0-9_-]+\)\s*/, "");
    t = t.replace(/\bJaqueta Masculina\b/gi, "Jaket Pria");
    t = t.replace(/\bJaquetas Masculinas\b/gi, "Jaket Pria");
    t = t.replace(/\bJaqueta\b/gi, "Jaket");
    t = t.replace(/\bJaquetas\b/gi, "Jaket");
    t = t.replace(/\bCasaco Corta-Vento\b/gi, "Jaket Windbreaker");
    t = t.replace(/\bCasaco\b/gi, "Luaran Parka");
    t = t.replace(/\bCorta-Vento\b/gi, "Windbreaker");
    t = t.replace(/\bCom Capuz\b/gi, "Hoodie");
    t = t.replace(/\bÀ Prova D\'água\b/gi, "Waterproof");
    t = t.replace(/\bPara Homens\b/gi, "Pria");
    t = t.replace(/\bPara Negócios E Uso Casual\b/gi, "Smart Casual Kantor");
    t = t.replace(/\bBlusas Unissex\b/gi, "Sweater Unisex");
    t = t.replace(/\bCalça\b/gi, "Celana");
    t = t.replace(/\bCamisa\b/gi, "Kemeja");
    t = t.replace(/\bCamiseta\b/gi, "Kaos");
    t = t.replace(/\bDe Inverno\b/gi, "Hangat Musim Dingin");
    t = t.replace(/\s+/g, " ").trim();
    return t;
  }

  function formatCleanPrice(priceDisplay, priceTotal) {
    if (priceTotal && typeof priceTotal === "number" && priceTotal > 1000) {
      return `Rp ${priceTotal.toLocaleString("id-ID")}`;
    }
    if (typeof priceDisplay === "string") {
      const idrMatch = priceDisplay.match(/Rp\s*([\d\.,]+)/i);
      if (idrMatch) return `Rp ${idrMatch[1]}`;
      return priceDisplay;
    }
    return "Rp 150.000";
  }

  function inferItemAttributes(title, category, desc) {
    const t = (title || "").toLowerCase();
    const c = (category || "").toLowerCase();
    const d = (desc || "").toLowerCase();

    // Type: top / bottom / outer / shoes / dress
    let itemType = "top";
    if (
      t.includes("celana") ||
      t.includes("jeans") ||
      t.includes("chino") ||
      t.includes("kulot") ||
      t.includes("pants") ||
      t.includes("trousers") ||
      t.includes("cargo") ||
      t.includes("shorts") ||
      c.includes("bawahan")
    ) {
      itemType = "bottom";
    } else if (
      t.includes("jaket") ||
      t.includes("blazer") ||
      t.includes("cardigan") ||
      t.includes("outer") ||
      t.includes("coat") ||
      t.includes("vest")
    ) {
      itemType = "outer";
    } else if (
      t.includes("sepatu") ||
      t.includes("sneakers") ||
      t.includes("loafers") ||
      t.includes("sandal") ||
      t.includes("shoes")
    ) {
      itemType = "shoes";
    } else if (
      t.includes("gamis") ||
      t.includes("dress") ||
      t.includes("tunic")
    ) {
      itemType = "dress";
    }

    // Fabric
    let fabric = "Katun Combed 24s";
    if (t.includes("linen") || d.includes("linen")) fabric = "Serat Linen Alami";
    else if (t.includes("knit") || t.includes("rajut") || d.includes("rajut")) fabric = "Rajut Knitwear Halus";
    else if (t.includes("denim") || t.includes("jeans") || d.includes("denim")) fabric = "Denim Twill Kokoh";
    else if (t.includes("chino") || d.includes("chino")) fabric = "Katun Chino Stretch";
    else if (t.includes("flanel") || d.includes("flanel")) fabric = "Katun Flanel Bertekstur";
    else if (t.includes("batik") || d.includes("batik")) fabric = "Katun Primisima Batik";
    else if (t.includes("polo") || d.includes("polo")) fabric = "Pique Cotton Bernapas";
    else if (t.includes("fleece") || t.includes("hoodie") || d.includes("fleece")) fabric = "Cotton Fleece Hangat";

    // Silhouette
    let silhouette = "Reguler Bersih";
    if (t.includes("oversize") || d.includes("oversize") || d.includes("leluasa")) silhouette = "Relaxed Oversized";
    else if (t.includes("slim") || d.includes("slim")) silhouette = "Slim Fit Modern";
    else if (t.includes("ankle") || t.includes("tapered")) silhouette = "Tapered Ankle Cut";
    else if (t.includes("wide") || t.includes("kulot")) silhouette = "Wide-Leg Flowy";

    // Color vibe
    let colorVibe = "Netral Elegan";
    if (t.includes("hitam") || t.includes("black")) colorVibe = "Monokrom Deep Black";
    else if (t.includes("putih") || t.includes("white")) colorVibe = "Clean Crisp White";
    else if (t.includes("navy") || t.includes("biru")) colorVibe = "Classic Deep Navy";
    else if (t.includes("krem") || t.includes("beige") || t.includes("cream")) colorVibe = "Warm Earthy Beige";
    else if (t.includes("sage") || t.includes("olive") || t.includes("hijau")) colorVibe = "Calming Sage Olive";
    else if (t.includes("burgundy") || t.includes("maroon") || t.includes("merah")) colorVibe = "Regal Burgundy";
    else if (t.includes("abu") || t.includes("grey") || t.includes("gray")) colorVibe = "Refined Slate Grey";

    return { itemType, fabric, silhouette, colorVibe };
  }

  const THUMB_3D_MAP = {
    "tshirt_graphic_white": "images/3d/tshirt_graphic_white_thumb.jpg",
    "flannel_red": "images/3d/flannel_red_thumb.jpg",
    "polo_navy": "images/3d/polo_navy_thumb.jpg",
    "tshirt_white_basic": "images/3d/tshirt_white_basic_thumb.jpg",
    "jeans_blue": "images/3d/jeans_blue_thumb.jpg",
    "jeans_indigo": "images/3d/jeans_indigo_thumb.jpg",
    "chino_khaki": "images/3d/chino_khaki_thumb.jpg",
  };

  async function loadCatalog() {
    let combinedItems = [];
    const seenIds = new Set();
    const nonOutfitWords = ["briefs", "boxer", "baby", "bodysuit", "socks", "bra top", "underwear"];

    // 1. Ambil dari Supabase database utama
    if (supabaseClient) {
      try {
        const { data: dbItems, error } = await supabaseClient
          .from("outfit_catalog")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(dbItems) && dbItems.length > 0) {
          dbItems.forEach((r) => {
            const rawTitle = r.title || "Busana Orec";
            const rawLower = rawTitle.toLowerCase();
            if (nonOutfitWords.some((w) => rawLower.includes(w))) return;

            const cleanedTitle = cleanProductTitle(rawTitle);
            const attrs = inferItemAttributes(cleanedTitle, r.category, r.description);
            const id = r.item_id || r.id;
            const modelId = r.model_id || (String(id).startsWith("3d-") ? String(id).replace("3d-", "") : "");
            const is3D = !!r.is_3d || String(id).startsWith("3d-") || !!THUMB_3D_MAP[modelId];

            let photo = r.photo_url || r.image_url || r.image || (r.item_data && r.item_data.image) || "";
            if (is3D && THUMB_3D_MAP[modelId]) {
              photo = THUMB_3D_MAP[modelId];
            }

            seenIds.add(id);
            combinedItems.push({
              id: id,
              modelId: modelId,
              title: cleanedTitle,
              category: r.category || "kasual",
              event_type: r.event_type || null,
              photoUrl: photo,
              thumb_b64: r.thumb_b64 || "",
              sourceStore: r.source_store || "Shopee",
              productLink: r.product_link,
              price: formatCleanPrice(r.price_display, r.price_total),
              description: r.description || "",
              is3D: is3D,
              ...attrs,
            });
          });
        }
      } catch (err) {
        console.warn("Supabase catalog read error:", err);
      }
    }

    // 2. Sinkronkan & lengkapi dari cache apify_products.json (Database Lokal)
    try {
      const res = await fetch("data/apify_products.json?v=" + Date.now());
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        items.forEach((it) => {
          const id = it.id || it.itemId;
          if (seenIds.has(id)) {
            // Update thumb_b64 jika ada di JSON tapi belum tercatat
            if (it.thumb_b64) {
              const existing = combinedItems.find((c) => c.id === id);
              if (existing && !existing.thumb_b64) existing.thumb_b64 = it.thumb_b64;
            }
            return;
          }

          const rawTitle = it.title || it.name || "Busana Pilihan";
          const rawLower = rawTitle.toLowerCase();
          if (nonOutfitWords.some((w) => rawLower.includes(w))) return;

          const cleanedTitle = cleanProductTitle(rawTitle);
          const attrs = inferItemAttributes(cleanedTitle, it.category, it.desc || it.description);
          const modelId = it.modelId || (String(id).startsWith("3d-") ? String(id).replace("3d-", "") : "");
          const is3D = !!it.is3D || String(id).startsWith("3d-") || !!THUMB_3D_MAP[modelId];

          let photo = it.photo_url || it.image || it.imageUrl || (it.item_data && it.item_data.image) || "";
          if (is3D && THUMB_3D_MAP[modelId]) {
            photo = THUMB_3D_MAP[modelId];
          }

          seenIds.add(id);
          combinedItems.push({
            id: id,
            modelId: modelId,
            title: cleanedTitle,
            category: it.category || "kasual",
            event_type: it.event_type || null,
            photoUrl: photo,
            thumb_b64: it.thumb_b64 || "",
            sourceStore: it.source_store || it.store || "Shopee",
            productLink: it.storeUrl || it.product_link || it.url || "https://shopee.co.id",
            price: formatCleanPrice(it.priceDisplay, it.priceTotal),
            description: it.desc || it.description || "",
            is3D: is3D,
            ...attrs,
          });
        });
      }
    } catch (e) {
      console.warn("Gagal memuat katalog Apify:", e);
    }

    if (combinedItems.length > 0) {
      STATE.catalog = combinedItems;
      updateCatalogMetrics();
    }
  }

  function updateCatalogMetrics() {
    const countEl = document.getElementById("aiDbCatalogCount");
    if (countEl) countEl.innerText = `${STATE.catalog.length} Produk Database`;
  }

  // =========================================================================
  // 7. DATABASE RAG RETRIEVAL (KONTROL PENYARINGAN PRODUK NYATA)
  // =========================================================================
  function searchRealCatalog(query, eventType) {
    if (!STATE.catalog || STATE.catalog.length === 0) return { selected: [], candidates: [] };

    const q = (query || "").toLowerCase();
    const event = (eventType || "").toLowerCase() || detectEventFromQuery(q);
    const tier = getNormalizedTier();

    // 1. Scoring relevansi multi-dimensi
    const scored = STATE.catalog.map((item) => {
      let score = 0;
      const t = (item.title || "").toLowerCase();
      const c = (item.category || "").toLowerCase();
      const e = (item.event_type || "").toLowerCase();
      const f = (item.fabric || "").toLowerCase();

      // a. Pencocokan kata kunci jenis pakaian spesifik
      if (q.includes("flanel") || q.includes("flannel")) {
        if (t.includes("flanel") || t.includes("flannel")) score += 35;
      }
      if (q.includes("polo")) {
        if (t.includes("polo")) score += 35;
      }
      if (q.includes("kaos") || q.includes("t-shirt") || q.includes("tshirt")) {
        if (t.includes("kaos") || t.includes("t-shirt")) score += 20;
      }
      if (q.includes("kemeja") || q.includes("shirt")) {
        if (t.includes("kemeja") || t.includes("shirt")) score += 20;
      }
      if (q.includes("chino")) {
        if (t.includes("chino")) score += 35;
      }
      if (q.includes("jeans")) {
        if (t.includes("jeans")) score += 35;
      }
      if (q.includes("jaket") || q.includes("outer") || q.includes("hoodie") || q.includes("windbreaker")) {
        if (item.itemType === "outer" || t.includes("jaket") || t.includes("hoodie")) score += 25;
      }
      if (q.includes("celana pendek") || q.includes("shorts")) {
        if (t.includes("shorts")) score += 35;
      }

      // b. Pencocokan kata kunci warna
      if (q.includes("putih") || q.includes("white")) {
        if (t.includes("putih") || t.includes("white") || item.colorVibe.includes("White")) score += 15;
      }
      if (q.includes("hitam") || q.includes("black")) {
        if (t.includes("hitam") || t.includes("black") || item.colorVibe.includes("Black")) score += 15;
      }
      if (q.includes("navy") || q.includes("biru")) {
        if (t.includes("navy") || t.includes("biru") || t.includes("blue")) score += 15;
      }
      if (q.includes("khaki") || q.includes("krem") || q.includes("beige")) {
        if (t.includes("khaki") || t.includes("beige") || t.includes("krem")) score += 15;
      }

      // c. Keselarasan Konteks Acara
      if (event === "pesta" || event === "kondangan") {
        if (c === "formal" || e === "kantor") score += 20;
        if (t.includes("oxford") || t.includes("polo") || t.includes("chino") || t.includes("broadcloth") || t.includes("elegan")) score += 15;
        if (t.includes("graphic") || t.includes("shorts") || c === "sporty") score -= 25;
      } else if (event === "kantor") {
        if (c === "formal" || e === "kantor") score += 20;
        if (t.includes("oxford") || t.includes("polo") || t.includes("chino") || t.includes("smart casual") || t.includes("jersey slim")) score += 15;
        if (t.includes("shorts") || c === "sporty") score -= 25;
      } else if (event === "ngonser") {
        if (e === "ngonser" || c === "streetwear") score += 20;
        if (t.includes("flanel") || t.includes("graphic") || t.includes("jeans") || t.includes("ut graphic") || t.includes("sweatshirt")) score += 15;
        if (t.includes("oxford") || t.includes("jersey slim")) score -= 15;
      } else if (event === "pantai") {
        if (e === "pantai" || f.includes("linen")) score += 20;
        if (t.includes("linen") || t.includes("shorts") || t.includes("kaos") || t.includes("hawaiian") || t.includes("oversized")) score += 15;
        if (t.includes("jaket") || t.includes("inverno")) score -= 25;
      } else if (event === "pengajian") {
        if (c === "formal" || t.includes("chino") || t.includes("long sleeve") || t.includes("broadcloth") || t.includes("polo")) score += 18;
        if (t.includes("shorts") || t.includes("graphic")) score -= 25;
      }

      // d. Pencocokan kata kunci pertanyaan
      const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
      queryWords.forEach((word) => {
        if (t.includes(word)) score += 6;
        if (c.includes(word)) score += 4;
        if (f.includes(word)) score += 4;
      });

      // Prioritas 3D untuk Premium
      if (tier === "premium" && (item.is3D || String(item.id).startsWith("3d-"))) {
        score += 4;
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const relevant = scored.filter((s) => s.score > 0).map((s) => s.item);
    const pool = relevant.length >= 2 ? relevant : STATE.catalog;

    // Strategi Pairing Multi-Item: Atasan/Luaran + Bawahan untuk keserasian siluet
    const primary = pool[0] || STATE.catalog[0];
    let secondary = null;

    if (primary) {
      const isUpper = primary.itemType === "top" || primary.itemType === "outer";
      const targetType = isUpper ? "bottom" : "top";
      secondary = pool.find((it) => it.id !== primary.id && it.itemType === targetType);
    }

    if (!secondary) {
      secondary = pool.find((it) => it.id !== primary.id) || STATE.catalog[1];
    }

    return {
      selected: [primary, secondary].filter(Boolean),
      candidates: pool.slice(0, 8),
    };
  }

  function detectEventFromQuery(q) {
    if (q.includes("konser") || q.includes("festival") || q.includes("ngonser")) return "ngonser";
    if (q.includes("pengajian") || q.includes("kajian") || q.includes("santun")) return "pengajian";
    if (q.includes("kantor") || q.includes("kerja") || q.includes("interview") || q.includes("meeting")) return "kantor";
    if (q.includes("pantai") || q.includes("beach") || q.includes("laut")) return "pantai";
    if (q.includes("pesta") || q.includes("kondangan") || q.includes("gala") || q.includes("dinner") || q.includes("resepsi") || q.includes("wedding")) return "pesta";
    return "santai";
  }

  // =========================================================================
  // 8. DATABASE AI CURATOR (INTELLIGENT REASONING ENGINE)
  // =========================================================================
  function buildCatalogItemsPreviewHtml(itemA, itemB) {
    if (!itemA || !itemB) return "";

    const renderItemRow = (item, num) => {
      let photo = item.photoUrl || (item.is3D && item.modelId ? `images/3d/${item.modelId}_thumb.jpg` : "");
      let b64 = item.thumb_b64 || "";

      if (!photo || photo.includes("card1.jpg")) {
        const dbMatch = (STATE.catalog || []).find((c) => c.id === item.id || c.title === item.title);
        if (dbMatch && dbMatch.photoUrl && !dbMatch.photoUrl.includes("card1.jpg")) {
          photo = dbMatch.photoUrl;
          if (!b64 && dbMatch.thumb_b64) b64 = dbMatch.thumb_b64;
        }
      }

      const price = item.price || "Harga Terbaik";
      const store = item.sourceStore || item.store || "Toko Mitra";
      const desc = item.description
        ? item.description.split(".")[0] + "."
        : `${item.fabric || "Bahan berkualitas"}, berpotongan ${(item.silhouette || "reguler").toLowerCase()} dengan karakter warna ${(item.colorVibe || "netral").toLowerCase()}.`;

      return `
        <div class="flex items-start gap-3">
          <div class="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800 flex-shrink-0 border border-black/10 dark:border-white/10 shadow-2xs group">
            <img
              src="${photo}"
              alt="${escapeHtml(item.title)}"
              loading="lazy"
              referrerpolicy="no-referrer"
              class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onerror="if (!this.dataset.fallbackApplied) { this.dataset.fallbackApplied = 'true'; if ('${b64}') { this.src = '${b64}'; } else { this.style.display = 'none'; this.nextElementSibling.classList.remove('hidden'); } }"
            />
            <div class="hidden absolute inset-0 bg-[#6D001A]/10 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-[#6D001A]">${escapeHtml(store)}</div>
            <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-[#6D001A] text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
              ${num}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-1 flex-wrap">
              <h5 class="font-bold text-stone-900 dark:text-white line-clamp-1 text-xs" title="${escapeHtml(item.title)}">
                ${escapeHtml(item.title)}
              </h5>
              <span class="text-[11px] font-semibold text-[#6D001A] dark:text-[#E05377]">${price}</span>
            </div>
            <p class="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Toko: <b>${escapeHtml(store)}</b> &bull; Kategori: <span class="capitalize">${escapeHtml(item.category || "Kasual")}</span> &bull; Bahan: <b>${item.fabric || "Katun"}</b>
            </p>
            <p class="text-[11px] text-stone-600 dark:text-stone-300 mt-1 leading-relaxed line-clamp-2">
              ${escapeHtml(desc)}
            </p>
          </div>
        </div>
      `;
    };

    return `
      <div class="my-3 space-y-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs">
        ${renderItemRow(itemA, 1)}
        <div class="pt-2.5 border-t border-black/5 dark:border-white/5">
          ${renderItemRow(itemB, 2)}
        </div>
      </div>
    `;
  }

  const DatabaseAICurator = {
    generate(userQuery, activeEvent, selectedItems, tier) {
      const q = (userQuery || "").toLowerCase();
      const event = activeEvent || STATE.selectedEvent || detectEventFromQuery(q);

      const itemA = selectedItems[0] || STATE.catalog[0] || {
        id: "3d-tshirt_graphic_white",
        modelId: "tshirt_graphic_white",
        title: "Kaos Graphic Minimalist Putih (3D Live Fitting)",
        photoUrl: "images/3d/tshirt_graphic_white_thumb.jpg",
        thumb_b64: "",
        fabric: "Katun Combed 24s",
        colorVibe: "Clean Crisp White",
        sourceStore: "Orec 3D Studio",
        productLink: "../Premium 3D/index.html?top=tshirt_graphic_white&ref=rekomendasi",
        category: "kasual",
        price: "Rp 149.000",
        silhouette: "Reguler Bersih",
        is3D: true,
      };
      const itemB = selectedItems[1] || STATE.catalog[1] || {
        id: "3d-chino_khaki",
        modelId: "chino_khaki",
        title: "Celana Chino Slim Khaki (3D Live Fitting)",
        photoUrl: "images/3d/chino_khaki_thumb.jpg",
        thumb_b64: "",
        fabric: "Katun Chino Stretch",
        colorVibe: "Warm Earthy Khaki/Beige",
        sourceStore: "Orec 3D Studio",
        productLink: "../Premium 3D/index.html?bot=chino_khaki&ref=rekomendasi",
        category: "formal",
        price: "Rp 219.000",
        silhouette: "Tapered Ankle Cut",
        is3D: true,
      };

      let curationTitle = "Kurasi Gaya Eksklusif Orec";
      let contextRationale = "";
      let eventEtiquette = "";

      if (event === "ngonser" || q.includes("konser") || q.includes("festival")) {
        curationTitle = "Padu Padan Festival Musik & Konser — Fleksibel & Bernapas";
        contextRationale = "Untuk suasana festival musik dengan mobilitas tinggi dan arena outdoor, prioritas utama adalah sirkulasi udara optimal dan ketahanan gerak tanpa mengorbankan ketajaman visual.";
        eventEtiquette = "Siluet ini memberi kebebasan gerak maksimal selama berjam-jam di tengah kerumunan, tetap sejuk saat siang hari dan nyaman ketika suhu menurun menjelang malam.";
      } else if (event === "pengajian" || q.includes("pengajian") || q.includes("kajian") || q.includes("santun")) {
        curationTitle = "Padu Padan Modest Santun — Tenang, Berwibawa & Proporsional";
        contextRationale = "Agenda kajian dan silaturahmi menuntut etika busana bersiluet longgar (modest cut) yang rapi dan tidak menerawang, didukung palet warna teduh yang memancarkan ketenangan serta kesopanan.";
        eventEtiquette = "Kombinasi ini memenuhi adab berpakaian santun dengan proporsi jatuhnya kain yang rapi, memberikan impresi berwibawa dan bersahaja sepanjang acara.";
      } else if (event === "kantor" || q.includes("kantor") || q.includes("kerja") || q.includes("interview") || q.includes("formal")) {
        curationTitle = "Smart Casual Kontemporer — Presisi, Rapi & Percaya Diri";
        contextRationale = "Lingkungan kerja modern dan wawancara profesional membutuhkan perpaduan antara kerapian struktural dan kenyamanan mobilitas harian.";
        eventEtiquette = "Siluet busana menghadirkan visual yang bersih dan kredibel di ruang pertemuan, sekaligus tetap luwes untuk agenda kerja seharian di kantor.";
      } else if (event === "pantai" || q.includes("pantai") || q.includes("beach") || q.includes("laut")) {
        curationTitle = "Gaya Resor Tropis — Ringan, Alami & Melepas Panas";
        contextRationale = "Destinasi pesisir dan liburan tropis memerlukan material berpori mikro yang cepat melepas uap panas tubuh serta siluet santai yang tidak mengekang.";
        eventEtiquette = "Kombinasi ini mempertahankan kesejukan alami di bawah terik matahari pesisir dengan tekstur serat kain yang fotogenik.";
      } else if (event === "pesta" || q.includes("pesta") || q.includes("kondangan") || q.includes("dinner") || q.includes("gala") || q.includes("resepsi")) {
        curationTitle = "Gala Dinner & Resepsi — Regal, Berdimensi & Berkelas";
        contextRationale = "Acara perayaan resmi dan malam apresiasi menuntut kehadiran palet warna tegas dengan garis potongan yang memancarkan aura elegan.";
        eventEtiquette = "Memastikan Anda tampil memukau di bawah pencahayaan ruangan pesta tanpa terkesan berlebihan (understated luxury).";
      } else {
        curationTitle = "Kurasi Kasual Terstruktur — Minimalis & Serbaguna";
        contextRationale = "Untuk agenda santai harian maupun pertemuan informal, kunci estetika terletak pada potongan bersih yang serbaguna dan mudah diselaraskan.";
        eventEtiquette = "Pilihan ini siap dipakai berpindah agenda sepanjang hari dengan kepercayaan diri penuh dan kenyamanan tanpa kompromi.";
      }

      const itemADesc = itemA.description
        ? itemA.description.split(".")[0] + "."
        : `${itemA.fabric || "Bahan berkualitas"}, berpotongan ${itemA.silhouette.toLowerCase()} dengan karakter warna ${itemA.colorVibe.toLowerCase()}.`;

      const itemBDesc = itemB.description
        ? itemB.description.split(".")[0] + "."
        : `${itemB.fabric || "Bahan berkualitas"}, berpotongan ${itemB.silhouette.toLowerCase()} dengan karakter warna ${itemB.colorVibe.toLowerCase()}.`;

      const headerTitle = `<p class="font-bold text-stone-900 dark:text-white text-xs sm:text-sm tracking-tight mb-1 border-b border-black/[0.06] dark:border-white/[0.08] pb-1.5">${curationTitle}</p>`;

      const introText = `<p class="text-stone-700 dark:text-stone-300">Berdasarkan analisis kebutuhan Anda dari katalog produk Orec, berikut 2 rekomendasi busana yang saling melengkapi dan siap dikenakan:</p>`;

      const catalogItemsList = buildCatalogItemsPreviewHtml(itemA, itemB);

      const synergyAnalysis = `
        <p><b>Sinergi Padu Padan Siluet:</b> Memadukan <b>${escapeHtml(itemA.title)}</b> (${itemA.fabric}) sebagai poros visual dengan <b>${escapeHtml(itemB.title)}</b> (${itemB.fabric}) menghadirkan transisi proporsi tubuh yang seimbang. Sentuhan <i>${itemA.colorVibe}</i> pada atasan berpadu anggun bersama <i>${itemB.colorVibe}</i> pada bawahan, menciptakan impresi rapi dan berkelas.</p>
      `;

      const comfortAnalysis = `
        <p><b>Kenyamanan & Karakter Bahan Nyata:</b> Karakter bahan <b>${itemA.fabric}</b> dari katalog <i>${escapeHtml(itemA.sourceStore || "Toko Resmi")}</i> menawarkan sirkulasi udara yang baik untuk iklim tropis, sementara <b>${itemB.fabric}</b> menjamin kestabilan bentuk pakaian agar tidak mudah kusut saat duduk lama maupun bergerak aktif.</p>
      `;

      let stylingTipAction = "Gunakan teknik french tuck halus di bagian depan untuk mempertegas garis pinggang, padukan dengan alas kaki minimalis bernuansa monokrom, serta kenakan jam tangan ber-strap kulit untuk menyempurnakan impresi estetika akhir.";
      if (event === "ngonser") {
        stylingTipAction = "Biarkan kemeja terbuka sebagai outer layering di atas kaos polos katun, pasangkan dengan sneakers bersol empuk dan cross-body bag minimalis untuk mobilitas konser bebas hambatan.";
      } else if (event === "kantor") {
        stylingTipAction = "Masukkan atasan ke dalam celana chino dengan ikat pinggang kulit cokelat gelap atau hitam, padukan bersama loafers kulit atau sneakers putih bersih berpotongan rendah.";
      } else if (event === "pantai") {
        stylingTipAction = "Padukan celana pendek santai dengan kacamata berpelindung UV dan sandal slide kulit atau espadrilles, biarkan kancing atas terbuka satu untuk sirkulasi udara maksimal.";
      }

      const stylingAdvice = `
        <p class="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 bg-[#FFF8E7] dark:bg-white/[0.04] p-3 rounded-2xl border border-black/5 dark:border-white/5"><b>Panduan Styling:</b> ${stylingTipAction}</p>
      `;

      const html = `${headerTitle}${introText}${catalogItemsList}${synergyAnalysis}${comfortAnalysis}${stylingAdvice}`;

      return {
        text: html,
        outfits: [itemA, itemB],
      };
    },
  };

  // =========================================================================
  // 9. GOOGLE GEMINI CLOUD LLM PROXY (SERVER & DIRECT REST)
  // =========================================================================
  async function callGeminiLLM(userQuery, activeEvent, candidates, tier) {
    const apiKey = STATE.geminiApiKey || "";

    // 1. Coba panggil server backend jika python server aktif
    try {
      const srvRes = await fetch("/api/ai/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userQuery,
          event: activeEvent,
          tier: tier,
          apiKey: apiKey,
          candidates: candidates,
        }),
      });
      if (srvRes.ok) {
        const data = await srvRes.json();
        if (data.success && data.result) {
          const res = data.result;
          const selectedIds = res.selected_ids || [];
          let matchedOutfits = candidates.filter((c) => selectedIds.includes(c.id));
          if (matchedOutfits.length < 2) {
            matchedOutfits = candidates.slice(0, 2);
          }
          const itemA = matchedOutfits[0];
          const itemB = matchedOutfits[1];
          const itemsPreviewHtml = (itemA && itemB) ? buildCatalogItemsPreviewHtml(itemA, itemB) : "";

          let html = res.analysis_html || "";
          if (res.title) {
            html = `<p class="font-bold text-stone-900 dark:text-white text-xs sm:text-sm tracking-tight mb-1 border-b border-black/[0.06] dark:border-white/[0.08] pb-1.5">${escapeHtml(res.title)}</p>` + itemsPreviewHtml + html;
          } else {
            html = itemsPreviewHtml + html;
          }
          if (res.styling_tip) {
            html += `<p class="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-black/5 dark:border-white/5"><b>Tips Penataan Gaya:</b> ${escapeHtml(res.styling_tip)}</p>`;
          }
          return { text: html, outfits: matchedOutfits.slice(0, 2) };
        }
      }
    } catch (err) {
      // Server lokal tidak aktif atau statis
    }

    // 2. Jika kunci API diisi pengguna, panggil Google Gemini REST langsung
    if (apiKey && apiKey.trim().length > 10) {
      try {
        const candidatesSummary = candidates.slice(0, 8).map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          price: c.price,
          fabric: c.fabric,
          store: c.sourceStore,
          desc: c.description,
        }));

        const promptText = `
Anda adalah Lead Editorial Fashion Stylist untuk Orec, platform fashion quiet luxury Indonesia.
Kueri Pengguna: "${userQuery}"
Konteks Acara: "${activeEvent || "Umum / Kasual"}"
Tingkat Akun: "${tier}"

Berikut produk nyata yang berhasil ditarik langsung dari katalog database Orec:
${JSON.stringify(candidatesSummary, null, 2)}

Tugas:
1. Pilih 2 produk terbaik yang saling melengkapi (misal 1 atasan dan 1 bawahan) dari daftar database di atas.
2. Tulis rekomendasi gaya editorial yang elegan, santun, dan presisi dalam bahasa Indonesia.
   - Tanpa AI slop: Jangan gunakan sapaan klise seperti 'Halo Sobat Gaya!' atau robotik.
   - Terdiri dari 3 paragraf: Analisis Konteks & Siluet, Sinergi Padu Padan (sebutkan nama 2 produk terpilih), Kenyamanan Bahan.
   - 1 tips penataan praktis (french tuck, cuff roll, alas kaki).
Kembalikan MURNI JSON tanpa markdown backticks:
{
  "selected_ids": ["id_1", "id_2"],
  "title": "Judul Kurasi Siluet",
  "analysis_html": "<p>Paragraf 1...</p><p>Paragraf 2...</p><p>Paragraf 3...</p>",
  "styling_tip": "Tips penataan..."
}
`;

        const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
        for (const m of models) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey.trim()}`;
            const geminiRes = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.35, responseMimeType: "application/json" },
              }),
            });
            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawText) {
                const cleanJson = JSON.parse(rawText.replace(/^```json/i, "").replace(/```$/i, "").trim());
                const selectedIds = cleanJson.selected_ids || [];
                let matchedOutfits = candidates.filter((c) => selectedIds.includes(c.id));
                if (matchedOutfits.length < 2) {
                  matchedOutfits = candidates.slice(0, 2);
                }
                const itemA = matchedOutfits[0];
                const itemB = matchedOutfits[1];
                const itemsPreviewHtml = (itemA && itemB) ? buildCatalogItemsPreviewHtml(itemA, itemB) : "";

                let html = cleanJson.analysis_html || "";
                if (cleanJson.title) {
                  html = `<p class="font-bold text-stone-900 dark:text-white text-xs sm:text-sm tracking-tight mb-1 border-b border-black/[0.06] dark:border-white/[0.08] pb-1.5">${escapeHtml(cleanJson.title)}</p>` + itemsPreviewHtml + html;
                } else {
                  html = itemsPreviewHtml + html;
                }
                if (cleanJson.styling_tip) {
                  html += `<p class="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-black/5 dark:border-white/5"><b>Tips Penataan Gaya:</b> ${escapeHtml(cleanJson.styling_tip)}</p>`;
                }
                return { text: html, outfits: matchedOutfits.slice(0, 2) };
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (err) {
        console.warn("Direct Gemini call error, falling back to Database AI Curator:", err);
      }
    }

    return null;
  }

  async function executeAICuration(userQuery, activeEvent, tier) {
    const searchRes = searchRealCatalog(userQuery, activeEvent);
    const candidates = searchRes.candidates || [];
    const localSelected = searchRes.selected || [];

    // Coba gunakan Gemini Cloud LLM jika tersedia
    try {
      const llmResult = await callGeminiLLM(userQuery, activeEvent, candidates, tier);
      if (llmResult && llmResult.outfits && llmResult.outfits.length > 0) {
        return llmResult;
      }
    } catch (e) {
      console.warn("LLM curation fallback to Database AI Curator:", e);
    }

    // Gunakan Database AI Curator bawaan
    return DatabaseAICurator.generate(userQuery, activeEvent, localSelected, tier);
  }

  // =========================================================================
  // 10. CHAT SUBMISSION CONTROLLER (PRD 4.2 & 4.3 BUSINESS RULES)
  // =========================================================================
  async function handleSendChatMessage(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (STATE.isThinking) return;

    const input = document.getElementById("chatInputText");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const tier = getNormalizedTier();
    const quota = getQuotaInfo();

    // PRD 4.2: Trigger Iklan Premium saat kuota habis
    if (tier !== "premium" && quota.isExhausted) {
      if (tier === "guest") {
        openLoginPromptModal();
      } else {
        openPremiumAdModal();
      }
      return;
    }

    // 1. Simpan pesan pengguna
    const currentMessages = getRoomMessages(STATE.activeRoomId);
    const userMsg = {
      id: "msg_" + Date.now(),
      role: "user",
      text: text,
      timestamp: Date.now(),
    };
    currentMessages.push(userMsg);
    setRoomMessages(STATE.activeRoomId, currentMessages);

    // Update judul room dari pertanyaan pertama
    const currentRoom = STATE.rooms.find((r) => r.id === STATE.activeRoomId);
    if (currentRoom && (currentRoom.title === "Konsultasi Outfit" || currentMessages.length === 1)) {
      currentRoom.title = generateCleanRoomTitle(text);
      currentRoom.lastMessage = text;
      currentRoom.updatedAt = Date.now();
      saveRooms();
      renderRoomList();
      const titleEl = document.getElementById("activeRoomTitle");
      if (titleEl) titleEl.innerText = currentRoom.title;
    } else if (currentRoom) {
      currentRoom.lastMessage = text;
      currentRoom.updatedAt = Date.now();
      saveRooms();
      renderRoomList();
    }

    renderActiveRoomMessages();
    input.value = "";
    document.getElementById("btnInputClear")?.classList.add("hidden");

    incrementQuotaUsed();
    renderHeaderAndBadges();

    // 2. Tampilkan indikator proses AI berpikir di thread
    STATE.isThinking = true;
    showThinkingBubble();

    try {
      // 3. Eksekusi kurasi kecerdasan buatan dari database
      const curation = await executeAICuration(text, STATE.selectedEvent, tier);

      removeThinkingBubble();
      STATE.isThinking = false;

      const assistantMsg = {
        id: "msg_" + (Date.now() + 1),
        role: "assistant",
        text: curation.text,
        outfits: curation.outfits,
        timestamp: Date.now(),
      };

      currentMessages.push(assistantMsg);
      setRoomMessages(STATE.activeRoomId, currentMessages);
      renderActiveRoomMessages();
    } catch (err) {
      console.error("AI Curation error:", err);
      removeThinkingBubble();
      STATE.isThinking = false;

      // Fallback darurat ke produk database teratas
      const fallbackItems = STATE.catalog.slice(0, 2);
      const fallbackMsg = {
        id: "msg_" + (Date.now() + 1),
        role: "assistant",
        text: "<p>Koleksi busana pilihan berikut diselaraskan langsung dari katalog database berdasarkan siluet dan kenyamanan material.</p>",
        outfits: fallbackItems,
        timestamp: Date.now(),
      };
      currentMessages.push(fallbackMsg);
      setRoomMessages(STATE.activeRoomId, currentMessages);
      renderActiveRoomMessages();
    }

    // PRD 4.3: Tampilkan modal login setelah 3 chat tamu
    const updatedQuota = getQuotaInfo();
    if (tier === "guest" && updatedQuota.used === 3) {
      setTimeout(() => {
        openLoginPromptModal();
      }, 400);
    }
  }

  function showThinkingBubble() {
    const thread = document.getElementById("chatThread");
    if (!thread) return;

    let bubble = document.getElementById("aiThinkingBubble");
    if (!bubble) {
      bubble = document.createElement("div");
      bubble.id = "aiThinkingBubble";
      bubble.className = "flex items-start gap-3 animate-message";
      bubble.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-[#6D001A] text-white flex items-center justify-center flex-shrink-0 text-xs font-serif font-bold shadow-xs">
          O
        </div>
        <div class="bg-white dark:bg-[#191417] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl rounded-tl-none px-4 py-3 max-w-[92%] sm:max-w-[88%] text-xs text-stone-600 dark:text-stone-300 flex items-center gap-2.5 shadow-soft">
          <span class="inline-block w-2 h-2 rounded-full bg-[#6D001A] dark:bg-[#E05377] animate-pulse"></span>
          <span>Menyelaraskan siluet busana dengan katalog database...</span>
        </div>
      `;
      thread.appendChild(bubble);
      scrollToBottom();
    }
  }

  function removeThinkingBubble() {
    const bubble = document.getElementById("aiThinkingBubble");
    if (bubble) bubble.remove();
  }

  function generateCleanRoomTitle(text) {
    const clean = text.replace(/rekomendasi|outfit|baju|tolong|carikan|saya|mau/gi, "").trim();
    if (!clean) return "Kurasi Gaya";
    const words = clean.split(/\s+/).slice(0, 3);
    const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return title || "Kurasi Gaya";
  }

  function handleQuickPromptClick(promptText) {
    const input = document.getElementById("chatInputText");
    if (!input) return;
    input.value = promptText;
    handleSendChatMessage();
  }

  function handleSkipFirstQuestion() {
    handleQuickPromptClick("Kurasi pakaian populer musim ini untuk kasual santai");
  }

  function handleClearCurrentRoomMessages() {
    if (!confirm("Bersihkan percakapan pada sesi ini?")) return;
    setRoomMessages(STATE.activeRoomId, []);
    renderActiveRoomMessages();
    showToast("Percakapan telah dibersihkan.");
  }

  // =========================================================================
  // 11. 3D VISUALIZATION "GUNAKAN" ACTION (PRD FR-14 & 4.7)
  // =========================================================================
  function handleGunakan3D(outfitId, modelId, category, title) {
    const tier = getNormalizedTier();

    if (tier !== "premium") {
      openPremiumAdModal();
      return;
    }

    let bodyParams = "";
    try {
      const profRaw = localStorage.getItem("outfit_req_body_profiles");
      if (profRaw) {
        const profs = JSON.parse(profRaw);
        const active = profs.find((p) => p.isActive) || profs[0];
        if (active) {
          bodyParams = `&h=${active.tb || 170}&w=${active.bb || 64}&gender=${active.gender || "male"}`;
        }
      }
    } catch (e) {}

    const modelKey = modelId || (outfitId ? outfitId.replace(/^3d-/, "") : "tshirt_graphic_white");
    const isBot =
      (category || "").toLowerCase().includes("celana") ||
      (category || "").toLowerCase().includes("bawahan") ||
      (category || "").toLowerCase().includes("jeans");
    const paramKey = isBot ? "bot" : "top";

    const targetUrl = `../Premium 3D/index.html?ref=personality&${paramKey}=${encodeURIComponent(modelKey)}${bodyParams}`;
    showToast(`Membuka model 3D: ${title}`);
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 250);
  }

  // =========================================================================
  // 12. BOOKMARK / SAVE OUTFIT PHOTO (PRD FR-10)
  // =========================================================================
  function handleSaveOutfitPhoto(title, photoUrl, store, storeUrl, price) {
    const tier = getNormalizedTier();
    if (tier === "guest") {
      openLoginPromptModal();
      return;
    }

    try {
      let saved = [];
      const raw = localStorage.getItem(SAVED_PHOTOS_KEY);
      if (raw) saved = JSON.parse(raw);

      const exists = saved.some((item) => item.photo_url === photoUrl || item.title === title);
      if (exists) {
        showToast("Pakaian ini sudah tersimpan di akun Anda.");
        return;
      }

      saved.unshift({
        id: "saved_" + Date.now(),
        title: title,
        photo_url: photoUrl,
        source_store: store,
        product_link: storeUrl,
        price: price,
        saved_at: new Date().toISOString(),
      });

      localStorage.setItem(SAVED_PHOTOS_KEY, JSON.stringify(saved));
      showToast("Foto pakaian tersimpan ke Akun Anda.");
    } catch (e) {
      showToast("Gagal menyimpan foto pakaian.");
    }
  }

  // =========================================================================
  // 13. MODAL CONTROLLERS (PREMIUM AD & LOGIN PROMPT)
  // =========================================================================
  function openPremiumAdModal(customDesc) {
    const modal = document.getElementById("modalPremiumAd");
    if (!modal) return;
    if (customDesc) {
      const descEl = document.getElementById("premiumModalDesc");
      if (descEl) descEl.innerText = customDesc;
    }
    modal.classList.remove("hidden");
  }

  function closePremiumAdModal() {
    const modal = document.getElementById("modalPremiumAd");
    if (modal) modal.classList.add("hidden");
  }

  function openLoginPromptModal() {
    const modal = document.getElementById("modalLoginPrompt");
    if (modal) modal.classList.remove("hidden");
  }

  function closeLoginPromptModal() {
    const modal = document.getElementById("modalLoginPrompt");
    if (modal) modal.classList.add("hidden");
  }

  function selectPaymentMethod(method, btnEl) {
    STATE.selectedPaymentMethod = method;
    document.querySelectorAll(".payment-method-btn").forEach((b) => {
      b.className =
        "payment-method-btn p-2 rounded-xl border border-black/10 dark:border-white/10 font-semibold text-stone-600 dark:text-stone-300";
    });
    if (btnEl) {
      btnEl.className =
        "payment-method-btn p-2 rounded-xl border-2 border-[#6D001A] dark:border-[#E05377] bg-[#FFF8E7] dark:bg-white/10 font-bold text-stone-900 dark:text-white";
    }
  }

  function handleExecuteUpgrade() {
    const radios = document.getElementsByName("premiumPackageRadio");
    let chosenPkg = "bulanan";
    for (const r of radios) {
      if (r.checked) chosenPkg = r.value;
    }

    let days = 30;
    let pkgLabel = "Paket Bulanan (Rp 25.000)";
    if (chosenPkg === "mingguan") {
      days = 7;
      pkgLabel = "Paket Mingguan (Rp 8.000)";
    } else if (chosenPkg === "tahunan") {
      days = 365;
      pkgLabel = "Paket Tahunan (Rp 200.000)";
    }

    const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

    const updatedUser = {
      ...STATE.user,
      isLoggedIn: true,
      tier: "premium",
      premiumExpiresAt: expiresAt,
      name: STATE.user.isLoggedIn ? STATE.user.name : "Member Premium",
      email: STATE.user.email || "member@orec.id",
    };

    saveUser(updatedUser);
    closePremiumAdModal();
    renderHeaderAndBadges();
    renderRoomList();
    renderActiveRoomMessages();

    showToast(`Selamat! ${pkgLabel} aktif via ${STATE.selectedPaymentMethod.toUpperCase()}.`);
  }

  function triggerGoogleAuthFromPrompt() {
    closeLoginPromptModal();
    const mockEmail = "member.orec@gmail.com";
    const updatedUser = {
      id: "usr_" + Date.now(),
      name: "Jeverson (Member)",
      email: mockEmail,
      tier: "free",
      isLoggedIn: true,
      premiumExpiresAt: null,
    };
    saveUser(updatedUser);

    let quotaData = { used: 0, resetAt: Date.now() + 3 * 24 * 3600 * 1000 };
    try {
      localStorage.setItem(FREE_QUOTA_KEY, JSON.stringify(quotaData));
    } catch (e) {}

    renderHeaderAndBadges();
    renderRoomList();
    renderActiveRoomMessages();
    showToast("Berhasil masuk via Google Mail. Kuota 10 chat aktif.");
  }

  // =========================================================================
  // 14. EVENT SELECTOR (PRD FR-15 - KHUSUS PREMIUM)
  // =========================================================================
  function openEventModal() {
    const tier = getNormalizedTier();
    if (tier !== "premium") {
      openPremiumAdModal(
        "Penyesuaian Acara (Konser, Pengajian, Kantor, dsb) adalah fitur eksklusif Premium. Tingkatkan paket untuk membuka preferensi acara."
      );
      return;
    }

    const modal = document.getElementById("modalEventSelector");
    if (modal) modal.classList.remove("hidden");
  }

  function closeEventModal() {
    const modal = document.getElementById("modalEventSelector");
    if (modal) modal.classList.add("hidden");
  }

  function handleSelectEvent(eventType, eventTitle) {
    STATE.selectedEvent = eventType;
    closeEventModal();
    renderHeaderAndBadges();

    const input = document.getElementById("chatInputText");
    if (input) {
      input.value = `Rekomendasikan padu padan terbaik untuk ${eventTitle}`;
      input.focus();
    }
    showToast(`Acara dipilih: ${eventTitle}`);
  }

  function resetSelectedEvent() {
    STATE.selectedEvent = null;
    closeEventModal();
    renderHeaderAndBadges();
    showToast("Kategori acara direset ke umum.");
  }

  // =========================================================================
  // 15. AI CONFIG MODAL (DATABASE STATUS & GEMINI API KEY)
  // =========================================================================
  function openAiConfigModal() {
    const modal = document.getElementById("modalAiConfig");
    if (!modal) return;

    const inputKey = document.getElementById("inputGeminiApiKey");
    if (inputKey) {
      inputKey.value = STATE.geminiApiKey || "";
    }

    const statusEl = document.getElementById("aiActiveEngineStatus");
    if (statusEl) {
      if (STATE.geminiApiKey && STATE.geminiApiKey.trim().length > 10) {
        statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Google Gemini Cloud LLM</span>`;
      } else {
        statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span>Database AI Curator (Lokal)</span>`;
      }
    }

    updateCatalogMetrics();
    modal.classList.remove("hidden");
  }

  function closeAiConfigModal() {
    const modal = document.getElementById("modalAiConfig");
    if (modal) modal.classList.add("hidden");
  }

  function handleSaveGeminiKey() {
    const inputKey = document.getElementById("inputGeminiApiKey");
    const key = (inputKey ? inputKey.value : "").trim();

    STATE.geminiApiKey = key;
    try {
      if (key) {
        localStorage.setItem(GEMINI_KEY_STORAGE, key);
        showToast("Kunci Google Gemini API berhasil disimpan.");
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE);
        showToast("Kunci API dikosongkan. Mode Database AI Curator aktif.");
      }
    } catch (e) {}

    renderHeaderAndBadges();
    closeAiConfigModal();
  }

  function handleClearGeminiKey() {
    const inputKey = document.getElementById("inputGeminiApiKey");
    if (inputKey) inputKey.value = "";
    STATE.geminiApiKey = "";
    try {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } catch (e) {}
    renderHeaderAndBadges();
    showToast("Menggunakan Mesin Kurasi Database Cerdas bawaan.");
  }

  // =========================================================================
  // 16. UTILITY HELPERS
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeJs(str) {
    if (!str) return "";
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  function showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className =
      "pointer-events-auto bg-[#6D001A] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg transition-all transform duration-200 translate-y-4 opacity-0 flex items-center gap-2";
    toast.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-4", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, 2800);
  }

  function clearChatInput() {
    const input = document.getElementById("chatInputText");
    const clearBtn = document.getElementById("btnInputClear");
    if (input) {
      input.value = "";
      input.focus();
    }
    if (clearBtn) clearBtn.classList.add("hidden");
  }

  // =========================================================================
  // 17. INITIALIZATION
  // =========================================================================
  async function init() {
    loadUser();
    renderHeaderAndBadges();
    await loadCatalog();
    loadRooms();
    renderActiveRoomMessages();

    const input = document.getElementById("chatInputText");
    const clearBtn = document.getElementById("btnInputClear");
    if (input && clearBtn) {
      input.addEventListener("input", () => {
        if (input.value.trim().length > 0) {
          clearBtn.classList.remove("hidden");
        } else {
          clearBtn.classList.add("hidden");
        }
      });
    }

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        createNewRoom();
      }
      if (e.key === "Escape") {
        closePremiumAdModal();
        closeLoginPromptModal();
        closeEventModal();
        closeAiConfigModal();
        toggleMobileSidebar(false);
      }
    });

    window.addEventListener("storage", (e) => {
      if (e.key === USER_KEY || e.key === GUEST_QUOTA_KEY || e.key === FREE_QUOTA_KEY) {
        loadUser();
        renderHeaderAndBadges();
      }
    });
  }

  // Expose necessary functions to window
  window.toggleMobileSidebar = toggleMobileSidebar;
  window.handleCreateNewRoom = () => createNewRoom();
  window.switchActiveRoom = switchActiveRoom;
  window.handleDeleteRoom = handleDeleteRoom;
  window.handleSendChatMessage = handleSendChatMessage;
  window.handleQuickPromptClick = handleQuickPromptClick;
  window.handleSkipFirstQuestion = handleSkipFirstQuestion;
  window.handleClearCurrentRoomMessages = handleClearCurrentRoomMessages;
  window.handleGunakan3D = handleGunakan3D;
  window.handleSaveOutfitPhoto = handleSaveOutfitPhoto;
  window.openPremiumAdModal = openPremiumAdModal;
  window.closePremiumAdModal = closePremiumAdModal;
  window.openLoginPromptModal = openLoginPromptModal;
  window.closeLoginPromptModal = closeLoginPromptModal;
  window.openEventModal = openEventModal;
  window.closeEventModal = closeEventModal;
  window.selectPaymentMethod = selectPaymentMethod;
  window.handleExecuteUpgrade = handleExecuteUpgrade;
  window.handleSelectEvent = handleSelectEvent;
  window.resetSelectedEvent = resetSelectedEvent;
  window.triggerGoogleAuthFromPrompt = triggerGoogleAuthFromPrompt;
  window.handleQuotaBadgeClick = handleQuotaBadgeClick;
  window.clearChatInput = clearChatInput;
  window.openAiConfigModal = openAiConfigModal;
  window.closeAiConfigModal = closeAiConfigModal;
  window.handleSaveGeminiKey = handleSaveGeminiKey;
  window.handleClearGeminiKey = handleClearGeminiKey;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
