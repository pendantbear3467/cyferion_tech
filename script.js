(() => {
    const qs = (s, ctx = document) => ctx.querySelector(s);
    const qsa = (s, ctx = document) => [...ctx.querySelectorAll(s)];

    // ----- Year stamp in footer(s)
    qsa('#y').forEach(el => (el.textContent = new Date().getFullYear()));

    // === Universal partials loader ===
    async function loadPartials() {
        const nodes = document.querySelectorAll('[data-include]');
        if (!nodes.length) return;

        await Promise.all([...nodes].map(async(el) => {
            const url = el.getAttribute('data-include');
            try {
                const res = await fetch(url, { cache: 'no-cache' });
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                const html = await res.text();
                // replace the placeholder with the fetched markup
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                const fragment = document.createDocumentFragment();
                while (tmp.firstChild) fragment.appendChild(tmp.firstChild);
                el.replaceWith(fragment);
            } catch (e) {
                console.error('Include failed for', url, e);
            }
        }));

        // Re-init nav after injection
        initNavToggle();
        initActiveNavHighlight();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPartials, { once: true });
    } else {
        loadPartials();
    }

    // === Exposed inits (extracted from your existing script) ===
    function initNavToggle() {
        const btn = document.querySelector('.nav-toggle');
        const nav = document.getElementById('primary-nav');
        const overlay = document.querySelector('[data-nav-overlay]');
        if (!btn || !nav) return;

        const open = () => {
            nav.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
            document.body.classList.add('nav-open');
        };
        const close = () => {
            nav.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('nav-open');
        };

        btn.addEventListener('click', () =>
            nav.classList.contains('open') ? close() : open()
        );
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });
        document.addEventListener('click', (e) => {
            if (!nav.classList.contains('open')) return;
            const within = e.target.closest('#primary-nav, .nav-toggle');
            if (!within) close();
        });
        if (overlay) overlay.addEventListener('click', close);
        nav.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a) return;
            if (getComputedStyle(btn).display !== 'none') close();
        });
    }

    function initActiveNavHighlight() {
        const normalize = (p) =>
            (p || '/').toLowerCase()
            .replace(/index\.html?$/i, '')
            .replace(/\/+$/, '/') || '/';

        const here = new URL(location.href);
        const current = normalize(here.pathname);

        document.querySelectorAll('.nav .active').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav a[href]').forEach(a => {
            const raw = a.getAttribute('href');
            if (!raw || /^(#|mailto:|tel|javascript:)/i.test(raw)) return;
            let path;
            try {
                const url = new URL(raw, here);
                if (url.origin !== here.origin) return; // external
                path = normalize(url.pathname);
            } catch { return; }
            if (path === current || (path !== '/' && current.startsWith(path))) {
                (a.closest('li') || a).classList.add('active');
            }
        });
    }


    // ----- Mobile nav toggle (no framework)
    const header = qs('.site-header');
    const btn = qs('.nav-toggle');
    const nav = qs('#primary-nav');
    if (btn && nav) {
        const links = qsa('a', nav);
        const open = () => {
            nav.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
            document.body.classList.add('nav-open');
        };
        const close = () => {
            nav.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('nav-open');
        };
        btn.addEventListener('click', () =>
            nav.classList.contains('open') ? close() : open()
        );
        // Close when clicking outside or pressing Esc
        document.addEventListener('click', e => {
            if (!nav.classList.contains('open')) return;
            if (!nav.contains(e.target) && e.target !== btn) close();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && nav.classList.contains('open')) close();
        });
        // Close on nav link click (good on mobile)
        links.forEach(a => a.addEventListener('click', close));
    }

    // = Active-Nav Highlighter (static or dynamic nav) =
    (() => {
        const SEL_LINKS = '.nav a[href]';

        const normalize = (p) =>
            (p || '/')
            .toLowerCase()
            .replace(/index\.html?$/i, '') // drop index.html/htm
            .replace(/\/+$/, '/') // trim trailing slashes (keep root)
            ||
            '/';

        const sameOriginPath = (href) => {
            if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return null;
            try {
                const url = new URL(href, location.origin);
                if (url.origin !== location.origin) return null; // external link
                return normalize(url.pathname);
            } catch {
                return null;
            }
        };

        const highlight = () => {
            const current = normalize(location.pathname);
            const links = document.querySelectorAll(SEL_LINKS);
            if (!links.length) return;

            // clear previous
            links.forEach(a => (a.closest('li') || a).classList.remove('active'));

            // apply
            links.forEach(a => {
                const path = sameOriginPath(a.getAttribute('href'));
                if (!path) return;
                if (current === path || (path !== '/' && current.startsWith(path))) {
                    (a.closest('li') || a).classList.add('active');
                }
            });
        };

        // Debounce helper
        const debounce = (fn, ms = 80) => {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn(...args), ms);
            };
        };
        const highlightDebounced = debounce(highlight, 80);

        // Run when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', highlight, { once: true });
        } else {
            highlight();
        }

        // Re-run on route changes (SPA/back/forward/hash)
        window.addEventListener('popstate', highlightDebounced);
        window.addEventListener('hashchange', highlightDebounced);

        // Re-run when nav/links are injected or changed
        const mo = new MutationObserver(highlightDebounced);
        mo.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href']
        });

        // Optional: re-run after a short idle (covers late-injected templates)
        setTimeout(highlightDebounced, 250);
    })();


    // ----- Smooth scroll for same-page anchors (respects reduced motion)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
        qsa('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                const id = a.getAttribute('href').slice(1);
                const target = document.getElementById(id);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ----- Subtle header shadow after scroll
    if (header) {
        const onScroll = () =>
            header.classList.toggle('scrolled', window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ----- Progressive contact form 
    const form = qs('form.contact-form');
    if (form) {
        form.addEventListener('submit', async e => {
            const action = (form.getAttribute('action') || '').trim();
            if (!action || action === '#') {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(form).entries());
                console.log('Contact form data:', data); // replace with real fetch() later
                toast('Thanks! Your message was noted.');
                form.reset();
            }
        });
    }


    function toast(msg) {
        let el = qs('.toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
    }
})();

// ---- Animated galaxy background ----
(function galaxyBackground() {
    const canvas = document.getElementById('galaxy-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = window.innerWidth,
        h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Resize handler
    window.addEventListener('resize', () => {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
    });

    // Generate "universes" (nebulae)
    const universes = Array.from({ length: 6 }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 120 + Math.random() * 180,
        color: `hsla(${Math.random() * 360}, 70%, 60%, 0.18)`,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        dr: (Math.random() - 0.5) * 0.2
    }));

    // Generate stars
    const stars = Array.from({ length: 180 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.3,
        tw: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.012
    }));

    function draw() {
        ctx.clearRect(0, 0, w, h);

        // Draw universes (nebulae)
        universes.forEach(u => {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2);
            ctx.fillStyle = u.color;
            ctx.shadowColor = u.color;
            ctx.shadowBlur = 80;
            ctx.fill();
            ctx.restore();

            // Animate
            u.x += u.dx;
            u.y += u.dy;
            u.r += u.dr;
            if (u.x < -u.r) u.x = w + u.r;
            if (u.x > w + u.r) u.x = -u.r;
            if (u.y < -u.r) u.y = h + u.r;
            if (u.y > h + u.r) u.y = -u.r;
            if (u.r < 100) u.dr = Math.abs(u.dr);
            if (u.r > 300) u.dr = -Math.abs(u.dr);
        });

        // Draw stars
        stars.forEach(s => {
            ctx.save();
            ctx.globalAlpha = 0.8 + Math.sin(s.tw) * 0.2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.restore();

            // Twinkle
            s.tw += s.speed;
        });

        requestAnimationFrame(draw);
    }
    draw();
})();