/* =========================================================
   Zettacars — UI Core (vanilla JS)
   - Theme toggle (persisted) + system sync
   - Particles (adaptive by theme)
   - 3D tilt on cards
   - Copy-to-clipboard + toast
   - Footer year + minor a11y
   ========================================================= */
(() => {
  // ---------- Utilities ----------
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const getTheme = () => document.documentElement.getAttribute('data-theme') || (prefersDark() ? 'dark' : 'light');
  const setTheme = (t) => document.documentElement.setAttribute('data-theme', t);

  // ---------- Footer year ----------
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Copy helpers ----------
  const toast = $('#toast');
  const showToast = (msg = 'Copiat!') => {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    toast.style.opacity = '1';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 2000);
  };

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast();
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast(); }
      finally { document.body.removeChild(ta); }
    }
  }

  $('#copyBtn')?.addEventListener('click', () => copy('zettacars.ro'));
  $('#copyMail')?.addEventListener('click', (e) => copy(e.currentTarget.dataset.copy));

  // ---------- Theme manager ----------
  const THEME_KEY = 'zc-theme';
  const themeBtn  = $('#theme');

  // init theme (saved -> system -> dark)
  const saved = localStorage.getItem(THEME_KEY);
  setTheme(saved || (prefersDark() ? 'dark' : 'light'));
  themeBtn?.setAttribute('aria-pressed', String(getTheme() === 'dark'));

  // live-sync with system changes (only if user hasn't forced a choice this session)
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener?.('change', (e) => {
    const userSet = localStorage.getItem(THEME_KEY);
    if (!userSet) {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      themeBtn?.setAttribute('aria-pressed', String(newTheme === 'dark'));
      particles?.setTheme(newTheme); // update particles colors
    }
  });

  themeBtn?.addEventListener('click', () => {
    const cur  = getTheme();
    const next = cur === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    themeBtn.setAttribute('aria-pressed', String(next === 'dark'));
    particles?.setTheme(next); // update particles colors without reload
  });

  // ---------- 3D Tilt ----------
  function enableTilt(el, strength = 10) {
    let rect;
    const enter = () => { rect = el.getBoundingClientRect(); el.style.willChange = 'transform'; };
    const move  = (e) => {
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top)  / rect.height;
      const rx = (0.5 - y) * strength;
      const ry = (x - 0.5) * strength;
      el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    };
    const leave = () => { el.style.transform = 'rotateX(0) rotateY(0)'; el.style.willChange = 'auto'; };
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    // touch-friendly reset
    el.addEventListener('touchstart', enter, { passive: true });
    el.addEventListener('touchend', leave);
  }

  $$('[data-tilt]').forEach((el) => enableTilt(el, 10));

  // ---------- Particles (adaptive) ----------
  class ParticleField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.N = 70;
      this.parts = [];
      this.dpr = 1;
      this._raf = null;
      this.theme = getTheme();
      this._onResize = this.resize.bind(this);
      window.addEventListener('resize', this._onResize);
      this.resize();
      this.init();
      this.step();
    }
    setTheme(t) { this.theme = t; } // colors adapt next frame
    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = this.canvas.width  = Math.max(1, window.innerWidth  * this.dpr);
      this.h = this.canvas.height = Math.max(1, window.innerHeight * this.dpr);
      this.canvas.style.width  = window.innerWidth + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
    }
    init() {
      const d = this.dpr;
      this.parts = Array.from({ length: this.N }, () => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.25 * d,
        vy: (Math.random() - 0.5) * 0.25 * d,
        r: (Math.random() * 1.8 + 0.6) * d,
        hue: 200 + Math.random() * 80
      }));
    }
    _strokeColor(aHue, bHue, alpha) {
      const baseHue = this.theme === 'light' ? 210 : 220;
      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = `hsl(${baseHue + (aHue + bHue) / 14}, 88%, ${this.theme === 'light' ? 45 : 65}%)`;
    }
    _fillColor(hue) {
      const baseHue = this.theme === 'light' ? 210 : 220;
      this.ctx.fillStyle = `hsl(${baseHue + hue / 6}, 88%, ${this.theme === 'light' ? 50 : 70}%)`;
    }
    step() {
      const { ctx, w, h, parts, dpr } = this;
      ctx.clearRect(0, 0, w, h);

      // connect soft lines
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
          const b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          const max = 120 * dpr;
          if (dist < max) {
            const alpha = (1 - dist / max) * (this.theme === 'light' ? 0.10 : 0.12);
            this._strokeColor(a.hue, b.hue, alpha);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // dots
      ctx.globalAlpha = this.theme === 'light' ? 0.75 : 0.85;
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        this._fillColor(p.hue);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }

      this._raf = requestAnimationFrame(this.step.bind(this));
    }
    destroy() {
      cancelAnimationFrame(this._raf);
      window.removeEventListener('resize', this._onResize);
      this.parts = [];
    }
  }

  let particles = null;
  const canvas = $('#particles');
  if (canvas) particles = new ParticleField(canvas);

  // ---------- A11y: activate <a.btn> with Space ----------
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && el?.classList.contains('btn') && el.tagName === 'A') {
      e.preventDefault();
      el.click();
    }
  });
})();
