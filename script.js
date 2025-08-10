(() => {
    const qs = (s, ctx = document) => ctx.querySelector(s);
    const qsa = (s, ctx = document) => [...ctx.querySelectorAll(s)];

    // ----- Year stamp in footer(s)
    qsa('#y').forEach(el => (el.textContent = new Date().getFullYear()));

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

    // ----- Mark active link based on URL (works across pages)
    const current = location.pathname.replace(/\/index\.html?$/i, '/');
    qsa('.nav a[href]').forEach(a => {
        const path = new URL(a.href).pathname.replace(/\/index\.html?$/i, '/');
        if (path === current) a.parentElement ? .classList.add('active');
    });

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

    // ----- Progressive contact form (only if no backend yet)
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

    // ----- Tiny toast helper
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