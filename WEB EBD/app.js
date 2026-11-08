/**
 * OUTFIT REQ — Application Controller
 * Manages 3D showroom states, transitions, form validation, and authentication flow
 */
import { MaisonScene } from './scene.js';
import { 
  signInUser, 
  signUpUser, 
  resendVerificationEmail,
  resetPasswordForEmail, 
  isSupabaseConfigured,
  getSupabaseClient,
  getCustomerPremiumStatus
} from './supabaseClient.js';

// ─── State Machine ────────────────────────────
const STATES = {
  LOADING: 'loading',
  INTRO: 'intro',
  ZOOMING: 'zooming',
  LOGIN: 'login',
  RETURNING: 'returning',
};

class App {
  constructor() {
    this.state = STATES.LOADING;
    this.zoomProgress = 0;
    this.targetZoom = 0;
    this.isAnimating = false;
    this.rafId = null;

    // DOM refs
    this.loader = document.getElementById('loader');
    this.loaderBar = document.getElementById('loaderBar');
    this.overlay = document.getElementById('landing-overlay');
    this.loginCard = document.getElementById('login-card');
    this.scrollCue = document.getElementById('scrollCue');
    this.enterBtn = document.getElementById('enterBtn');
    this.loginBack = document.getElementById('loginBack');
    this.accountBtn = document.getElementById('accountBtn');

    // Auth views
    this.forgotView = document.getElementById('forgot-view');
    this.createView = document.getElementById('create-view');
    this.verifyView = document.getElementById('verify-view');
    this.verifiedSuccessView = document.getElementById('verified-success-view');
    this.verifiedCustomerData = null;
    this.pendingRegistration = null;

    // Double Slider references
    this.doubleSliderContainer = document.getElementById('doubleSliderContainer');
    this.signUpSliderBtn = document.getElementById('signUpSliderBtn');
    this.signInSliderBtn = document.getElementById('signInSliderBtn');
    this.createLink = document.getElementById('createLink');
    this.backToLogin = document.getElementById('backToLogin');
    this.mobileTabSignIn = document.getElementById('mobileTabSignIn');
    this.mobileTabSignUp = document.getElementById('mobileTabSignUp');

    // Add backdrop element
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'login-backdrop';
    this.backdrop.id = 'loginBackdrop';
    document.body.insertBefore(this.backdrop, this.loginCard);

    this._init();
  }

  async _init() {
    try {
      // Simulate progressive load
      await this._simulateLoad();

      // Init 3D scene
      const container = document.getElementById('canvas-container');
      if (container) {
        try {
          this.scene = new MaisonScene(container);
        } catch (e) {
          console.warn('WebGL not available or scene init failed, showing fallback', e);
          container.style.background = '#FFF8E7';
        }
      }

      // Start render loop
      try {
        this._animate();
      } catch (e) {
        console.warn('Animation loop error', e);
      }
    } catch (err) {
      console.warn('Error during initialization:', err);
    } finally {
      // Guaranteed to finish loading and reveal the landing experience
      this._finishLoad();
    }

    try {
      // Bind events
      this._bindEvents();
      this._bindForms();
      this._bindAuthViews();

      // Deteksi jika halaman dibuka dari tautan verifikasi email
      const isFromEmailLink = window.location.hash.includes('access_token') || 
                              window.location.hash.includes('type=signup') || 
                              window.location.search.includes('verified=true') ||
                              window.location.search.includes('token');

      const client = getSupabaseClient();
      if (client && isFromEmailLink) {
        // Otomatis zoom ke formulir tanpa perlu klik showroom
        setTimeout(() => {
          this._triggerZoomIn();
        }, 350);

        const handleEmailVerifiedSession = async (user) => {
          if (!user) return;
          console.log('[OutfitReq] Akun berhasil terverifikasi via link email:', user);
          let customerName = user.user_metadata?.full_name;
          if (!customerName) {
            try {
              const regMap = JSON.parse(localStorage.getItem('outfit_req_registered_customers') || '{}');
              const found = regMap[user.email?.toLowerCase()];
              if (found && found.name) customerName = found.name;
            } catch (e) {}
          }
          if (!customerName && user.email) {
            const raw = user.email.split('@')[0];
            customerName = raw.charAt(0).toUpperCase() + raw.slice(1);
          }
          if (!customerName) customerName = 'Customer';

          let activeTier = 'free';
          let activeExpiry = null;
          try {
            if (user.email) {
              const premCheck = await getCustomerPremiumStatus(user.email);
              if (premCheck.isPremium) {
                activeTier = 'premium';
                activeExpiry = premCheck.expiresAt;
                console.log('[OutfitReq] Verified user terdeteksi Premium aktif:', activeExpiry);
              }
            }
          } catch (e) {}

          const cleanUname = customerName.toLowerCase().replace(/[^a-z0-9_]/g, '') || (user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : 'customer');
          const userData = {
            id: user.id || 'usr_' + Date.now(),
            name: customerName,
            username: '@' + cleanUname,
            email: user.email,
            tier: activeTier,
            premiumExpiresAt: activeExpiry,
            isLoggedIn: true,
            verifiedAt: user.email_confirmed_at || new Date().toISOString()
          };
          this.verifiedCustomerData = userData;

          try {
            localStorage.removeItem('outfit_req_logged_out');
            localStorage.setItem('outfit_req_user', JSON.stringify(userData));
          } catch (e) {}

          // Update info di kartu Akun Telah Terverifikasi
          const nameEl = document.getElementById('verifiedSuccessName');
          const emailEl = document.getElementById('verifiedSuccessEmail');
          const avatarEl = document.getElementById('verifiedSuccessAvatar');
          if (nameEl) nameEl.textContent = customerName;
          if (emailEl) emailEl.textContent = user.email;
          if (avatarEl) avatarEl.textContent = customerName.charAt(0).toUpperCase();

          // Sembunyikan form login & tampilkan tampilan Akun Telah Terverifikasi
          this._showVerifiedSuccessCard();

          // Bersihkan token dari URL hash agar rapi
          if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type='))) {
            window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
          }
        };

        // 1. Cek sesi saat ini dari getSession()
        client.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            handleEmailVerifiedSession(session.user);
          }
        }).catch(() => {});

        // 2. Auth state change listener
        client.auth.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
            handleEmailVerifiedSession(session.user);
          }
        });
      }
    } catch (e) {
      console.warn('Event binding error', e);
    }
  }

  // ─── Loading ───────────────────────────────
  async _simulateLoad() {
    const steps = [25, 60, 85, 100];
    for (const pct of steps) {
      if (this.loaderBar) this.loaderBar.style.width = pct + '%';
      await this._delay(100 + Math.random() * 80);
    }
  }

  _finishLoad() {
    if (this.loaderBar) this.loaderBar.style.width = '100%';
    setTimeout(() => {
      if (this.loader) this.loader.classList.add('hidden');
      this._enterIntro();

      // Check URL params: if mode=login, mode=signup, mode=register, #login, #signup
      const urlParams = new URLSearchParams(window.location.search);
      const isSignUpMode = urlParams.get('mode') === 'signup' || urlParams.get('mode') === 'register' || window.location.hash === '#signup' || window.location.hash === '#register';
      const isLoginMode = urlParams.get('mode') === 'login' || window.location.hash === '#login';

      if (isSignUpMode) {
        this._activateSignUpSlider();
        setTimeout(() => {
          this._triggerZoomIn();
        }, 400);
      } else if (isLoginMode) {
        this._activateSignInSlider();
        setTimeout(() => {
          this._triggerZoomIn();
        }, 400);
      }
    }, 350);
  }

  _enterIntro() {
    this.state = STATES.INTRO;

    // Animate hero text in
    const lines = document.querySelectorAll('.hero-line, .hero-year');
    if (typeof gsap !== 'undefined') {
      lines.forEach((el, i) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1.0,
          delay: 0.2 + i * 0.18,
          ease: 'power3.out',
        });
      });

      // Scroll cue
      if (this.scrollCue) {
        gsap.to(this.scrollCue, {
          opacity: 1,
          duration: 0.8,
          delay: 1.0,
          ease: 'power2.out',
        });
      }

      // Enter button
      gsap.to('.enter-btn-wrap', {
        opacity: 1,
        duration: 0.8,
        delay: 1.2,
        ease: 'power2.out',
      });
    } else {
      lines.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      if (this.scrollCue) this.scrollCue.style.opacity = '1';
      const enterWrap = document.querySelector('.enter-btn-wrap');
      if (enterWrap) enterWrap.style.opacity = '1';
    }
  }

  // ─── Events ────────────────────────────────
  _bindEvents() {
    // Wheel zoom
    window.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

    // Touch zoom
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      if (this.state === STATES.LOGIN) return;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.state === STATES.LOGIN) return;
      if (this.state !== STATES.INTRO && this.state !== STATES.ZOOMING) return;
      const deltaY = touchStartY - e.touches[0].clientY;
      if (Math.abs(deltaY) > 5) {
        this._handleZoomDelta(deltaY * 0.8);
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    // Enter button
    if (this.enterBtn) {
      this.enterBtn.addEventListener('click', () => {
        this._triggerZoomIn();
      });
    }

    // Account button in top nav
    if (this.accountBtn) {
      this.accountBtn.addEventListener('click', () => {
        this._triggerZoomIn();
      });
    }

    // Login back to 3D showroom
    if (this.loginBack) {
      this.loginBack.addEventListener('click', () => {
        this._triggerZoomOut();
      });
    }

    // Backdrop click to return
    this.backdrop.addEventListener('click', () => {
      this._triggerZoomOut();
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state === STATES.LOGIN) {
        this._triggerZoomOut();
      }
      if (e.key === 'Enter' && this.state === STATES.INTRO) {
        this._triggerZoomIn();
      }
    });

    // Mouse parallax
    window.addEventListener('mousemove', (e) => {
      if (this.scene && this.scene.setMouseOffset) {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        this.scene.setMouseOffset(x, -y);
      }
    });

    // Prevent scroll inside login card from triggering zoom
    if (this.loginCard) {
      this.loginCard.addEventListener('wheel', (e) => {
        e.stopPropagation();
      });
    }
    if (this.forgotView) {
      this.forgotView.addEventListener('wheel', (e) => {
        e.stopPropagation();
      });
    }
    if (this.createView) {
      this.createView.addEventListener('wheel', (e) => {
        e.stopPropagation();
      });
    }
  }

  _onWheel(e) {
    if (this.state === STATES.LOGIN) return;
    if (this.state === STATES.LOADING) return;

    if (e.target.closest('.login-card') || e.target.closest('.auth-view')) return;

    e.preventDefault();
    this._handleZoomDelta(e.deltaY);
  }

  _handleZoomDelta(delta) {
    if (this.isAnimating) return;

    const speed = 0.003;
    this.targetZoom = Math.max(0, Math.min(1, this.targetZoom + delta * speed));

    if (this.state === STATES.INTRO && this.targetZoom > 0.05) {
      this.state = STATES.ZOOMING;
    }

    if (this.targetZoom > 0.65) {
      this._triggerZoomIn();
    }

    if (this.state === STATES.ZOOMING && this.targetZoom < 0.05) {
      this.targetZoom = 0;
      this.state = STATES.INTRO;
    }
  }

  _triggerZoomIn() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.state = STATES.ZOOMING;

    // Hentikan autoplay 3D saat masuk ke mode login
    if (this.scene && this.scene.stopAutoplay) {
      this.scene.stopAutoplay();
    }

    // Fade out landing overlay
    if (typeof gsap !== 'undefined') {
      gsap.to(this.overlay, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.inOut',
      });

      // Animate camera zoom progress
      gsap.to(this, {
        zoomProgress: 1,
        targetZoom: 1,
        duration: 1.6,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (this.scene) {
            this.scene.setCameraProgress(this.zoomProgress);
          }
        },
        onComplete: () => {
          this._showLogin();
          this.isAnimating = false;
        }
      });
    } else {
      this.overlay.style.opacity = '0';
      if (this.scene) this.scene.setCameraProgress(1);
      this._showLogin();
      this.isAnimating = false;
    }
  }

  _triggerZoomOut() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.state = STATES.RETURNING;

    // Hide login
    this._hideLogin();

    // Hide auth views
    this._hideAuthView(this.forgotView);
    if (this.createView) this._hideAuthView(this.createView);
    this._hideAuthView(this.verifyView);
    if (this.verifiedSuccessView) this._hideAuthView(this.verifiedSuccessView);

    if (typeof gsap !== 'undefined') {
      gsap.to(this, {
        zoomProgress: 0,
        targetZoom: 0,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (this.scene) {
            this.scene.setCameraProgress(this.zoomProgress);
          }
        },
        onComplete: () => {
          this.overlay.classList.remove('hidden');
          gsap.to(this.overlay, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out',
          });
          this.state = STATES.INTRO;
          this.isAnimating = false;
          // Mulai kembali autoplay saat kembali ke ruang 3D
          if (this.scene && this.scene.startAutoplay) {
            this.scene.startAutoplay();
          }
        }
      });
    } else {
      if (this.scene) this.scene.setCameraProgress(0);
      this.overlay.classList.remove('hidden');
      this.overlay.style.opacity = '1';
      this.state = STATES.INTRO;
      this.isAnimating = false;
    }
  }

  _showLogin() {
    this.state = STATES.LOGIN;
    this.overlay.classList.add('hidden');
    this.backdrop.classList.add('visible');
    this.loginCard.classList.add('visible');
    this.loginCard.setAttribute('aria-hidden', 'false');

    setTimeout(() => {
      // Hanya auto-focus di desktop agar keyboard mobile tidak menutupi tampilan
      const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
      if (!isMobile) {
        const isSignUpActive = this.doubleSliderContainer?.classList.contains('right-panel-active');
        const targetInput = isSignUpActive 
          ? document.getElementById('createName') 
          : document.getElementById('email');
        if (targetInput) targetInput.focus();
      }
    }, 450);
  }

  _hideLogin() {
    this.backdrop.classList.remove('visible');
    this.loginCard.classList.remove('visible');
    this.loginCard.setAttribute('aria-hidden', 'true');
    this._resetForm();
  }

  // ─── Double Slider Controls ────────────────
  _activateSignUpSlider() {
    if (this.doubleSliderContainer) {
      this.doubleSliderContainer.classList.add('right-panel-active');
      const signUpInner = this.doubleSliderContainer.querySelector('.sign-up-container .form-content-inner');
      if (signUpInner) {
        signUpInner.scrollTop = 0;
      }
    }
    if (this.mobileTabSignUp) {
      this.mobileTabSignUp.classList.add('active');
      this.mobileTabSignUp.setAttribute('aria-selected', 'true');
    }
    if (this.mobileTabSignIn) {
      this.mobileTabSignIn.classList.remove('active');
      this.mobileTabSignIn.setAttribute('aria-selected', 'false');
    }

    setTimeout(() => {
      const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
      const nameInput = document.getElementById('createName');
      if (nameInput && !isMobile && this.loginCard.classList.contains('visible')) {
        nameInput.focus();
      }
    }, 280);
  }

  _activateSignInSlider() {
    if (this.doubleSliderContainer) {
      this.doubleSliderContainer.classList.remove('right-panel-active');
      const signInInner = this.doubleSliderContainer.querySelector('.sign-in-container .form-content-inner');
      if (signInInner) {
        signInInner.scrollTop = 0;
      }
    }
    if (this.mobileTabSignIn) {
      this.mobileTabSignIn.classList.add('active');
      this.mobileTabSignIn.setAttribute('aria-selected', 'true');
    }
    if (this.mobileTabSignUp) {
      this.mobileTabSignUp.classList.remove('active');
      this.mobileTabSignUp.setAttribute('aria-selected', 'false');
    }

    setTimeout(() => {
      const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
      const emailInput = document.getElementById('email');
      if (emailInput && !isMobile && this.loginCard.classList.contains('visible')) {
        emailInput.focus();
      }
    }, 280);
  }

  _showVerifiedSuccessCard() {
    this.state = STATES.LOGIN;
    this.overlay.classList.add('hidden');
    this.backdrop.classList.add('visible');
    this.loginCard.classList.remove('visible');
    this._hideAuthView(this.forgotView);
    if (this.createView) this._hideAuthView(this.createView);
    this._hideAuthView(this.verifyView);
    if (this.verifiedSuccessView) {
      this._showAuthView(this.verifiedSuccessView);
    }
  }

  // ─── Auth View Switching ───────────────────
  _bindAuthViews() {
    // Forgot password
    const forgotLink = document.getElementById('forgotLink');
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        this._showAuthView(this.forgotView);
        this.loginCard.classList.remove('visible');
      });
    }

    const forgotBack = document.getElementById('forgotBack');
    if (forgotBack) {
      forgotBack.addEventListener('click', () => {
        this._hideAuthView(this.forgotView);
        this.loginCard.classList.add('visible');
        this._activateSignInSlider();
      });
    }

    // Double Slider: Switch to Sign Up
    if (this.signUpSliderBtn) {
      this.signUpSliderBtn.addEventListener('click', () => {
        this._activateSignUpSlider();
      });
    }

    if (this.createLink) {
      this.createLink.addEventListener('click', (e) => {
        e.preventDefault();
        this._activateSignUpSlider();
      });
    }

    // Double Slider: Switch to Sign In
    if (this.signInSliderBtn) {
      this.signInSliderBtn.addEventListener('click', () => {
        this._activateSignInSlider();
      });
    }

    if (this.backToLogin) {
      this.backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this._activateSignInSlider();
      });
    }

    // Mobile tabs switcher
    if (this.mobileTabSignIn) {
      this.mobileTabSignIn.addEventListener('click', () => {
        this._activateSignInSlider();
      });
    }

    if (this.mobileTabSignUp) {
      this.mobileTabSignUp.addEventListener('click', () => {
        this._activateSignUpSlider();
      });
    }

    // Verify view back / change email
    const verifyBack = document.getElementById('verifyBack');
    if (verifyBack) {
      verifyBack.addEventListener('click', () => {
        this._hideAuthView(this.verifyView);
        this.loginCard.classList.add('visible');
        this._activateSignUpSlider();
      });
    }

    const verifyChangeEmail = document.getElementById('verifyChangeEmail');
    if (verifyChangeEmail) {
      verifyChangeEmail.addEventListener('click', (e) => {
        e.preventDefault();
        this._hideAuthView(this.verifyView);
        this.loginCard.classList.add('visible');
        this._activateSignUpSlider();
      });
    }

    // Resend confirmation link
    const resendBtn = document.getElementById('resendLinkBtn');
    if (resendBtn) {
      resendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const feedback = document.getElementById('verifyFeedback');
        const email = this.pendingRegistration?.email;
        if (!email) {
          feedback.className = 'form-feedback error';
          feedback.textContent = 'Alamat email tidak ditemukan. Silakan ulangi pendaftaran.';
          feedback.style.display = 'block';
          return;
        }

        resendBtn.disabled = true;
        const originalText = resendBtn.innerHTML;
        resendBtn.innerHTML = '<span>Mengirim ulang tautan...</span>';
        feedback.style.display = 'none';

        try {
          await resendVerificationEmail(email);
          feedback.className = 'form-feedback success';
          feedback.textContent = 'Tautan verifikasi baru berhasil dikirimkan ke email Anda! Silakan periksa inbox atau folder spam.';
          feedback.style.display = 'block';

          // Cooldown 30 detik agar user tidak menekan berkali-kali
          let countdown = 30;
          const timer = setInterval(() => {
            countdown--;
            if (countdown > 0) {
              resendBtn.innerHTML = `<span>Kirim Ulang (${countdown}d)</span>`;
            } else {
              clearInterval(timer);
              resendBtn.disabled = false;
              resendBtn.innerHTML = originalText;
            }
          }, 1000);
        } catch (err) {
          resendBtn.disabled = false;
          resendBtn.innerHTML = originalText;
          feedback.className = 'form-feedback error';
          feedback.textContent = err.message || 'Gagal mengirim ulang tautan verifikasi.';
          feedback.style.display = 'block';
        }
      });
    }

    // Check if user has clicked the verification link
    const checkVerifiedBtn = document.getElementById('checkVerifiedBtn');
    if (checkVerifiedBtn) {
      checkVerifiedBtn.addEventListener('click', async () => {
        const feedback = document.getElementById('verifyFeedback');
        const email = this.pendingRegistration?.email;
        const password = this.pendingRegistration?.password;

        if (!email) {
          feedback.className = 'form-feedback error';
          feedback.textContent = 'Data sesi tidak ditemukan. Silakan lakukan pendaftaran ulang.';
          feedback.style.display = 'block';
          return;
        }

        this._showButtonLoading(checkVerifiedBtn);
        checkVerifiedBtn.disabled = true;
        feedback.style.display = 'none';

        try {
          const client = getSupabaseClient();
          let isConfirmed = false;
          let verifiedUser = null;

          // 1. Coba login untuk memverifikasi apakah akun sudah dikonfirmasi di Supabase
          if (client && password) {
            try {
              const { data, error } = await client.auth.signInWithPassword({ email, password });
              if (error) {
                const msg = (error.message || '').toLowerCase();
                if (msg.includes('not confirmed') || msg.includes('unconfirmed')) {
                  isConfirmed = false;
                } else {
                  console.warn('Login check error:', error);
                }
              } else if (data?.user) {
                // Dianggap terverifikasi jika email_confirmed_at tidak null atau session ada
                if (data.user.email_confirmed_at || data.session) {
                  isConfirmed = true;
                  verifiedUser = data.user;
                }
              }
            } catch (err) {
              isConfirmed = false;
            }
          }

          // 2. Cek apakah ada sesi aktif di client yang baru terverifikasi
          if (!isConfirmed && client) {
            try {
              const { data: { session } } = await client.auth.getSession();
              if (session?.user && session.user.email?.toLowerCase() === email.toLowerCase()) {
                if (session.user.email_confirmed_at) {
                  isConfirmed = true;
                  verifiedUser = session.user;
                }
              }
            } catch (e) {}
          }

          // 3. Cek localStorage apakah diverifikasi melalui tab/link email yang baru diklik
          if (!isConfirmed) {
            try {
              const localUser = JSON.parse(localStorage.getItem('outfit_req_user') || '{}');
              if (localUser && localUser.isLoggedIn && localUser.verifiedAt && localUser.email?.toLowerCase() === email.toLowerCase()) {
                isConfirmed = true;
                verifiedUser = localUser;
              }
            } catch (e) {}
          }

          this._hideButtonLoading(checkVerifiedBtn);
          checkVerifiedBtn.disabled = false;

          if (isConfirmed) {
            // Pengguna SUDAH klik tautan di email
            feedback.className = 'form-feedback success';
            feedback.textContent = 'Verifikasi berhasil! Mengalihkan ke akun Anda...';
            feedback.style.display = 'block';

            let customerName = this.pendingRegistration?.name || verifiedUser?.user_metadata?.full_name;
            if (!customerName) {
              try {
                const regMap = JSON.parse(localStorage.getItem('outfit_req_registered_customers') || '{}');
                const found = regMap[email.toLowerCase()];
                if (found && found.name) customerName = found.name;
              } catch (e) {}
            }
            if (!customerName) {
              const raw = email.split('@')[0];
              customerName = raw.charAt(0).toUpperCase() + raw.slice(1);
            }

            let activeTier = 'free';
            let activeExpiry = null;
            try {
              const premCheck = await getCustomerPremiumStatus(email);
              if (premCheck.isPremium) {
                activeTier = 'premium';
                activeExpiry = premCheck.expiresAt;
              }
            } catch (e) {}

            const userData = {
              id: verifiedUser?.id || 'usr_' + Date.now(),
              name: customerName,
              email: email,
              tier: activeTier,
              premiumExpiresAt: activeExpiry,
              isLoggedIn: true,
              verifiedAt: new Date().toISOString()
            };
            this.verifiedCustomerData = userData;

            try {
              localStorage.removeItem('outfit_req_logged_out');
              localStorage.setItem('outfit_req_user', JSON.stringify(userData));
            } catch (e) {}

            // Tampilkan kartu Akun Telah Terverifikasi dengan 2 tombol opsi login
            const nameEl = document.getElementById('verifiedSuccessName');
            const emailEl = document.getElementById('verifiedSuccessEmail');
            const avatarEl = document.getElementById('verifiedSuccessAvatar');
            if (nameEl) nameEl.textContent = customerName;
            if (emailEl) emailEl.textContent = email;
            if (avatarEl) avatarEl.textContent = customerName.charAt(0).toUpperCase();

            this._hideAuthView(this.verifyView);
            this._showAuthView(this.verifiedSuccessView);
          } else {
            // Tautan BELUM diklik: TAMPILAN JANGAN BERUBAH, tetap di kartu verifikasi!
            feedback.className = 'form-feedback error';
            feedback.textContent = `Tautan belum diklik. Buka email Anda (${email}) dan klik tautan verifikasi untuk mengaktifkan akun Anda.`;
            feedback.style.display = 'block';
          }
        } catch (err) {
          this._hideButtonLoading(checkVerifiedBtn);
          checkVerifiedBtn.disabled = false;
          feedback.className = 'form-feedback error';
          feedback.textContent = `Tautan verifikasi belum diklik. Silakan periksa inbox atau spam email Anda (${email}).`;
          feedback.style.display = 'block';
        }
      });
    }

    // Direct Login dari Tampilan Akun Terverifikasi
    const directLoginBtn = document.getElementById('directLoginBtn');
    if (directLoginBtn) {
      directLoginBtn.addEventListener('click', async () => {
        this._showButtonLoading(directLoginBtn);
        directLoginBtn.disabled = true;

        const feedback = document.getElementById('verifiedSuccessFeedback');
        if (feedback) {
          feedback.className = 'form-feedback success';
          feedback.textContent = 'Berhasil masuk! Mengalihkan ke panduan penggunaan...';
          feedback.style.display = 'block';
        }

        if (this.verifiedCustomerData) {
          try {
            if (this.verifiedCustomerData.email) {
              const premCheck = await getCustomerPremiumStatus(this.verifiedCustomerData.email);
              if (premCheck.isPremium) {
                this.verifiedCustomerData.tier = 'premium';
                this.verifiedCustomerData.premiumExpiresAt = premCheck.expiresAt;
              }
            }
            localStorage.removeItem('outfit_req_logged_out');
            localStorage.setItem('outfit_req_user', JSON.stringify(this.verifiedCustomerData));
          } catch (e) {}
        }

        setTimeout(() => {
          this._redirectToMain();
        }, 600);
      });
    }

    // Login Kembali: Pindah ke Form Login dengan Email Terisi Otomatis
    const reloginBtn = document.getElementById('reloginBtn');
    if (reloginBtn) {
      reloginBtn.addEventListener('click', () => {
        this._hideAuthView(this.verifiedSuccessView);
        this.loginCard.classList.add('visible');
        this._activateSignInSlider();

        if (this.verifiedCustomerData?.email) {
          const emailInput = document.getElementById('email');
          if (emailInput) {
            emailInput.value = this.verifiedCustomerData.email;
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.focus();
          }
        }

        const formFeedback = document.getElementById('formFeedback');
        if (formFeedback) {
          formFeedback.className = 'form-feedback success';
          formFeedback.textContent = 'Akun terverifikasi! Silakan masukkan kata sandi Anda untuk login kembali.';
          formFeedback.style.display = 'block';
        }
      });
    }

    // Forgot form submit
    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail');
      const error = document.getElementById('forgotEmailError');
      const feedback = document.getElementById('forgotFeedback');

      if (!this._validateEmail(email.value)) {
        error.textContent = 'Silakan masukkan alamat email yang valid';
        email.classList.add('error');
        return;
      }

      error.textContent = '';
      email.classList.remove('error');

      const btn = e.target.querySelector('.submit-btn');
      this._showButtonLoading(btn);

      try {
        await resetPasswordForEmail(email.value.trim());
        this._hideButtonLoading(btn);
        feedback.className = 'form-feedback success';
        feedback.textContent = 'Tautan reset sandi telah dikirim! Silakan periksa inbox email Anda.';
        feedback.style.display = 'block';
      } catch (err) {
        this._hideButtonLoading(btn);
        feedback.className = 'form-feedback error';
        feedback.textContent = err.message || 'Gagal mengirim email reset sandi.';
        feedback.style.display = 'block';
      }
    });

    // Create form submit
    document.getElementById('createForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('createName');
      const email = document.getElementById('createEmail');
      const password = document.getElementById('createPassword');
      const nameError = document.getElementById('createNameError');
      const emailError = document.getElementById('createEmailError');
      const passwordError = document.getElementById('createPasswordError');
      const feedback = document.getElementById('createFeedback');

      let valid = true;
      if (!name.value.trim()) {
        nameError.textContent = 'Nama lengkap wajib diisi';
        name.classList.add('error');
        valid = false;
      } else {
        nameError.textContent = '';
        name.classList.remove('error');
      }

      if (!this._validateEmail(email.value)) {
        emailError.textContent = 'Alamat email tidak valid';
        email.classList.add('error');
        valid = false;
      } else {
        emailError.textContent = '';
        email.classList.remove('error');
      }

      if (!password.value || password.value.length < 6) {
        passwordError.textContent = 'Kata sandi minimal 6 karakter';
        password.classList.add('error');
        valid = false;
      } else {
        passwordError.textContent = '';
        password.classList.remove('error');
      }

      if (!valid) return;

      const btn = e.target.querySelector('.submit-btn');
      this._showButtonLoading(btn);

      try {
        const data = await signUpUser(email.value.trim(), password.value, name.value.trim());
        this._hideButtonLoading(btn);

        const customerInfo = {
          id: data?.user?.id || 'usr_' + Date.now(),
          name: name.value.trim(),
          email: email.value.trim(),
          registeredAt: new Date().toISOString()
        };

        // Simpan ke daftar customer terdaftar di local storage
        try {
          const regMap = JSON.parse(localStorage.getItem('outfit_req_registered_customers') || '{}');
          regMap[email.value.trim().toLowerCase()] = customerInfo;
          localStorage.setItem('outfit_req_registered_customers', JSON.stringify(regMap));
        } catch (e) {}

        this.pendingRegistration = {
          email: email.value.trim(),
          password: password.value,
          name: name.value.trim(),
          id: customerInfo.id
        };

        // Pastikan tidak ada sesi lama yang tertinggal
        try {
          localStorage.removeItem('outfit_req_user');
        } catch (e) {}

        const displayEl = document.getElementById('verifyEmailDisplay');
        if (displayEl) displayEl.textContent = email.value.trim();

        const verifyFeedback = document.getElementById('verifyFeedback');
        if (verifyFeedback) {
          verifyFeedback.style.display = 'none';
          verifyFeedback.textContent = '';
        }

        // Tampilan beralih ke Cek Email Anda dan TETAP DI SINI sampai link di email diklik
        this.loginCard.classList.remove('visible');
        if (this.createView) this._hideAuthView(this.createView);
        this._showAuthView(this.verifyView);
        this._startAutoVerificationWatcher();
      } catch (err) {
        console.error('Error saat submit createForm:', err);
        this._hideButtonLoading(btn);
        feedback.className = 'form-feedback error';
        feedback.textContent = err.message || 'Gagal mendaftar. Silakan coba lagi.';
        feedback.style.display = 'block';
      }
    });
  }

  _showAuthView(view) {
    view.classList.add('visible');
    view.setAttribute('aria-hidden', 'false');
  }

  _hideAuthView(view) {
    view.classList.remove('visible');
    view.setAttribute('aria-hidden', 'true');
    if (view === this.verifyView) {
      if (this._storageListener) {
        window.removeEventListener('storage', this._storageListener);
        this._storageListener = null;
      }
      if (this._verifyWatcherInterval) {
        clearInterval(this._verifyWatcherInterval);
        this._verifyWatcherInterval = null;
      }
    }
  }

  _startAutoVerificationWatcher() {
    // Bersihkan listener sebelumnya bila ada
    if (this._storageListener) {
      window.removeEventListener('storage', this._storageListener);
      this._storageListener = null;
    }
    if (this._verifyWatcherInterval) {
      clearInterval(this._verifyWatcherInterval);
      this._verifyWatcherInterval = null;
    }

    // Storage listener: mendeteksi jika customer telah mengklik tautan email di tab browser lain
    this._storageListener = (e) => {
      if (e.key === 'outfit_req_user' && e.newValue) {
        try {
          const user = JSON.parse(e.newValue);
          const currentEmail = this.pendingRegistration?.email?.toLowerCase();
          // Hanya tangani jika email cocok dan user sudah terverifikasi
          if (user && user.isLoggedIn && user.verifiedAt) {
            if (!currentEmail || user.email?.toLowerCase() === currentEmail) {
              this._handleVerifiedSuccess(user);
            }
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', this._storageListener);
  }

  _handleVerifiedSuccess(user) {
    if (this._verifyWatcherInterval) {
      clearInterval(this._verifyWatcherInterval);
      this._verifyWatcherInterval = null;
    }
    this.verifiedCustomerData = user;

    const nameEl = document.getElementById('verifiedSuccessName');
    const emailEl = document.getElementById('verifiedSuccessEmail');
    const avatarEl = document.getElementById('verifiedSuccessAvatar');
    if (nameEl) nameEl.textContent = user.name || 'Customer';
    if (emailEl) emailEl.textContent = user.email || '';
    if (avatarEl) avatarEl.textContent = (user.name || 'C').charAt(0).toUpperCase();

    // Sembunyikan kartu Cek Email dan buka kartu Akun Telah Terverifikasi
    this._hideAuthView(this.verifyView);
    this._showAuthView(this.verifiedSuccessView);
  }

  // ─── Form Logic ────────────────────────────
  _bindForms() {
    const form = document.getElementById('loginForm');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const passwordToggle = document.getElementById('passwordToggle');
    const submitBtn = document.getElementById('submitBtn');
    const feedback = document.getElementById('formFeedback');

    // Password toggle
    if (passwordToggle && password) {
      passwordToggle.addEventListener('click', () => {
        const isPassword = password.type === 'password';
        password.type = isPassword ? 'text' : 'password';
        passwordToggle.querySelector('.eye-open').style.display = isPassword ? 'none' : 'block';
        passwordToggle.querySelector('.eye-closed').style.display = isPassword ? 'block' : 'none';
        passwordToggle.setAttribute('aria-label', isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      });
    }

    // Password toggle for Sign Up
    const createPassword = document.getElementById('createPassword');
    const createPasswordToggle = document.getElementById('createPasswordToggle');
    if (createPasswordToggle && createPassword) {
      createPasswordToggle.addEventListener('click', () => {
        const isPassword = createPassword.type === 'password';
        createPassword.type = isPassword ? 'text' : 'password';
        createPasswordToggle.querySelector('.eye-open').style.display = isPassword ? 'none' : 'block';
        createPasswordToggle.querySelector('.eye-closed').style.display = isPassword ? 'block' : 'none';
        createPasswordToggle.setAttribute('aria-label', isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      });
    }

    // Real-time validation
    email.addEventListener('blur', () => {
      if (email.value && !this._validateEmail(email.value)) {
        emailError.textContent = 'Silakan masukkan alamat email yang valid';
        email.classList.add('error');
      } else {
        emailError.textContent = '';
        email.classList.remove('error');
      }
    });

    email.addEventListener('input', () => {
      if (email.classList.contains('error') && this._validateEmail(email.value)) {
        emailError.textContent = '';
        email.classList.remove('error');
      }
    });

    password.addEventListener('blur', () => {
      if (password.value && password.value.length < 6) {
        passwordError.textContent = 'Kata sandi minimal 6 karakter';
        password.classList.add('error');
      } else {
        passwordError.textContent = '';
        password.classList.remove('error');
      }
    });

    password.addEventListener('input', () => {
      if (password.classList.contains('error') && password.value.length >= 6) {
        passwordError.textContent = '';
        password.classList.remove('error');
      }
    });

    // Submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let valid = true;

      // Validate email
      if (!email.value || !this._validateEmail(email.value)) {
        emailError.textContent = email.value ? 'Silakan masukkan alamat email yang valid' : 'Alamat email wajib diisi';
        email.classList.add('error');
        valid = false;
      }

      // Validate password
      if (!password.value) {
        passwordError.textContent = 'Kata sandi wajib diisi';
        password.classList.add('error');
        valid = false;
      } else if (password.value.length < 6) {
        passwordError.textContent = 'Kata sandi minimal 6 karakter';
        password.classList.add('error');
        valid = false;
      }

      if (!valid) return;

      this._showButtonLoading(submitBtn);
      submitBtn.disabled = true;

      try {
        const data = await signInUser(email.value.trim(), password.value);
        this._hideButtonLoading(submitBtn);
        submitBtn.disabled = false;

        feedback.className = 'form-feedback success';
        feedback.textContent = 'Berhasil masuk! Mengalihkan ke Panduan & Tutorial Outfit Req...';
        feedback.style.display = 'block';

        let customerName = data?.user?.user_metadata?.full_name;
        if (!customerName) {
          try {
            const regMap = JSON.parse(localStorage.getItem('outfit_req_registered_customers') || '{}');
            const found = regMap[email.value.trim().toLowerCase()];
            if (found && found.name) customerName = found.name;
          } catch (e) {}
        }
        if (!customerName) {
          const rawName = email.value.split('@')[0];
          customerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        }

        // Cek status Premium langsung dari database Supabase
        let activeTier = 'free';
        let activeExpiry = null;
        try {
          const premCheck = await getCustomerPremiumStatus(email.value.trim());
          if (premCheck.isPremium) {
            activeTier = 'premium';
            activeExpiry = premCheck.expiresAt;
            console.log('[OutfitReq Login] Akun terdeteksi sebagai Premium aktif dari Supabase:', activeExpiry);
          }
        } catch (e) {
          console.warn('[OutfitReq Login] Gagal query status premium database:', e);
        }

        const cleanUname = customerName.toLowerCase().replace(/[^a-z0-9_]/g, '') || email.value.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        const userData = {
          id: data?.user?.id || 'usr_' + Date.now(),
          email: email.value.trim(),
          name: customerName,
          username: '@' + cleanUname,
          tier: activeTier,
          premiumExpiresAt: activeExpiry,
          isLoggedIn: true,
          loginAt: new Date().toISOString()
        };
        try {
          localStorage.removeItem('outfit_req_logged_out');
          localStorage.setItem('outfit_req_user', JSON.stringify(userData));
        } catch (err) {}

        this._redirectToMain();
      } catch (err) {
        this._hideButtonLoading(submitBtn);
        submitBtn.disabled = false;
        feedback.className = 'form-feedback error';
        feedback.textContent = err.message || 'Email atau kata sandi tidak sesuai.';
        feedback.style.display = 'block';
      }
    });
  }

  _redirectToMain() {
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const customRedirect = params.get('redirect');
      if (customRedirect) {
        window.location.href = customRedirect;
        return;
      }

      // Pengalihan setelah login ke halaman Tutorial & Panduan Website baru
      if (window.location.pathname.includes('WEB EBD Login') || window.location.href.includes('WEB%20EBD%20Login')) {
        window.location.href = '../WEB EBD/tutorial.html';
      } else {
        window.location.href = 'tutorial.html';
      }
    }, 1200);
  }

  _validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  _showButtonLoading(btn) {
    btn.querySelector('.submit-text').style.display = 'none';
    btn.querySelector('.submit-loader').style.display = 'flex';
  }

  _hideButtonLoading(btn) {
    btn.querySelector('.submit-text').style.display = '';
    btn.querySelector('.submit-loader').style.display = 'none';
  }

  _resetForm() {
    const form = document.getElementById('loginForm');
    if (form) form.reset();
    const createForm = document.getElementById('createForm');
    if (createForm) createForm.reset();

    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.form-feedback').forEach(el => {
      el.style.display = 'none';
      el.className = 'form-feedback';
    });
    // Reset password visibility for Sign In
    const password = document.getElementById('password');
    if (password) {
      password.type = 'password';
      const toggle = document.getElementById('passwordToggle');
      if (toggle) {
        toggle.querySelector('.eye-open').style.display = 'block';
        toggle.querySelector('.eye-closed').style.display = 'none';
      }
    }
    // Reset password visibility for Sign Up
    const createPassword = document.getElementById('createPassword');
    if (createPassword) {
      createPassword.type = 'password';
      const createToggle = document.getElementById('createPasswordToggle');
      if (createToggle) {
        createToggle.querySelector('.eye-open').style.display = 'block';
        createToggle.querySelector('.eye-closed').style.display = 'none';
      }
    }
  }

  // ─── Render Loop ───────────────────────────
  _animate() {
    if (this.scene && this.scene.disposed) return;

    this.rafId = requestAnimationFrame(this._animate.bind(this));

    if (this.state === STATES.ZOOMING || this.state === STATES.INTRO) {
      this.zoomProgress += (this.targetZoom - this.zoomProgress) * 0.08;
      if (this.scene) {
        try {
          this.scene.setCameraProgress(this.zoomProgress);
        } catch (e) {
          console.warn('Camera progress error', e);
        }
      }
    }

    if (this.scene) {
      try {
        this.scene.render();
      } catch (e) {
        console.warn('Scene render error', e);
      }
    }
  }

  // ─── Utility ───────────────────────────────
  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

// ─── Boot ────────────────────────────────────
function bootApp() {
  if (!window.maisonApp) {
    window.maisonApp = new App();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

// Safety timeout: ensure loader never remains permanently stuck
setTimeout(() => {
  const loader = document.getElementById('loader');
  if (loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden');
    if (window.maisonApp && window.maisonApp.state === STATES.LOADING) {
      window.maisonApp.state = STATES.INTRO;
      window.maisonApp._enterIntro();
    }
  }
}, 3000);
