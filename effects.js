// Efeitos de interface da Cropnex: revelação no scroll, contadores, texto palavra a palavra,
// parallax, navegação flutuante. Funciona sobre o DOM renderizado pelo runtime (React),
// por isso usa MutationObserver para pegar elementos que entram a cada troca de página.
(() => {
  const root = document.documentElement;
  root.classList.add('cx-js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Revelação no scroll ----------
  let batch = 0, batchTimer = null;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      io.unobserve(el);
      // escalona elementos que entram juntos (cards de uma grade, linhas de uma lista)
      el.style.setProperty('--d', (Math.min(batch, 6) * 0.08) + 's');
      batch++;
      el.classList.add('cx-in');
    }
    clearTimeout(batchTimer);
    batchTimer = setTimeout(() => { batch = 0; }, 120);
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  // ---------- Contadores ----------
  const countIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      countIO.unobserve(e.target);
      runCount(e.target);
    }
  }, { threshold: 0.5 });

  function runCount(el) {
    const target = el.querySelector('.sc-interp') || el;
    const final = target.textContent;
    const m = final.match(/^(\D*)(\d+)(.*)$/);
    if (!m || reduce) return;
    const [, pre, num, suf] = m;
    const to = parseInt(num, 10), dur = 1600, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      target.textContent = pre + Math.round(to * eased) + suf;
      if (p < 1) requestAnimationFrame(tick); else target.textContent = final;
    };
    requestAnimationFrame(tick);
  }

  // ---------- Varredura de novos elementos ----------
  const words = new Set(), parallax = new Set();
  function scan() {
    document.querySelectorAll('[data-reveal]:not(.cx-obs)').forEach((el) => {
      el.classList.add('cx-obs');
      if (reduce) el.classList.add('cx-in'); else io.observe(el);
    });
    document.querySelectorAll('[data-count]:not(.cx-obs)').forEach((el) => {
      el.classList.add('cx-obs');
      countIO.observe(el);
    });
    // React não repassa o atributo `muted`, e o navegador bloqueia autoplay de vídeo com som.
    document.querySelectorAll('video[autoplay]:not(.cx-vid)').forEach((v) => {
      v.classList.add('cx-vid');
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute('muted', '');
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    });
    document.querySelectorAll('.cx-words').forEach((el) => words.add(el));
    document.querySelectorAll('[data-parallax]').forEach((el) => parallax.add(el));
    for (const el of words) if (!el.isConnected) words.delete(el);
    for (const el of parallax) if (!el.isConnected) parallax.delete(el);
    bindNav();
    onScroll();
  }

  // ---------- Scroll: texto palavra a palavra, parallax, estado do menu ----------
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vh = window.innerHeight;
      const header = document.querySelector('.cx-nav');
      if (header) header.classList.toggle('cx-scrolled', window.scrollY > 30);

      for (const el of words) {
        const r = el.getBoundingClientRect();
        const p = reduce ? 1 : Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.3)));
        const ws = el.querySelectorAll('.w');
        const on = Math.round(p * ws.length);
        ws.forEach((w, i) => w.classList.toggle('on', i < on));
      }
      if (!reduce) for (const el of parallax) {
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < 0 || box.top > vh) continue;
        const p = (box.top + box.height / 2 - vh / 2) / vh; // -1..1 aprox.
        el.style.transform = `translate3d(0, ${(p * -48).toFixed(1)}px, 0) scale(1.14)`;
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // ---------- Destaque deslizante no menu ----------
  function bindNav() {
    const nav = document.querySelector('.cx-menu');
    if (!nav || nav.dataset.cxBound) return;
    nav.dataset.cxBound = '1';
    const hl = nav.querySelector('.cx-hl');
    if (!hl) return;
    nav.addEventListener('mouseover', (e) => {
      const a = e.target.closest('a');
      if (!a || !nav.contains(a)) return;
      hl.style.width = a.offsetWidth + 'px';
      hl.style.transform = `translateX(${a.offsetLeft}px)`;
      hl.style.opacity = '1';
    });
    nav.addEventListener('mouseleave', () => { hl.style.opacity = '0'; });
  }

  let scanQueued = false;
  const mo = new MutationObserver(() => {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => { scanQueued = false; scan(); }, 16);
  });
  const start = () => {
    mo.observe(document.body, { childList: true, subtree: true });
    scan();
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
