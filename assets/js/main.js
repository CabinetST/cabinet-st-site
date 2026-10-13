/* S&T Développement — interactions du site (aucune dépendance obligatoire). */
(function () {
    'use strict';
    var doc = document.documentElement;
    doc.classList.remove('no-js');
    doc.classList.add('js');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- Défilement fluide (Lenis si disponible, sinon natif) ---------- */
    var lenis = null;
    // Gardé même en mouvement réduit, à la demande des associés : il ne fait qu'amortir le geste de l'utilisateur
    if (window.Lenis) {
        lenis = new window.Lenis({ lerp: 0.08, wheelMultiplier: 0.85, anchors: { offset: -88 } });
        (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }

    /* ---------- Fond technique : grille, repères et liaisons qui suivent le défilement ---------- */
    var canvas = document.getElementById('scene');
    var scrollY = window.scrollY;
    if (canvas && canvas.getContext) {
        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w, h, nodes = [], mouse = { x: 0.5, y: 0.3 }, smooth = { x: 0.5, y: 0.3, s: scrollY };
        var count = window.innerWidth < 700 ? 22 : 46;
        function resize() {
            w = canvas.clientWidth; h = canvas.clientHeight;
            canvas.width = w * dpr; canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        // Points pseudo-aléatoires mais stables d'un chargement à l'autre
        var seed = 7;
        function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        for (var i = 0; i < count; i++) nodes.push({ x: rnd(), y: rnd() * 3, z: 0.3 + rnd() * 0.7, k: rnd() < 0.18 });
        function draw() {
            smooth.x += (mouse.x - smooth.x) * 0.05;
            smooth.y += (mouse.y - smooth.y) * 0.05;
            smooth.s += (scrollY - smooth.s) * 0.08;
            ctx.clearRect(0, 0, w, h);
            var cell = 64, off = (smooth.s * 0.3) % cell;
            ctx.strokeStyle = 'rgba(236,233,226,0.045)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var gx = (smooth.x - 0.5) * -30 % cell; gx < w; gx += cell) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
            for (var gy = -off; gy < h; gy += cell) { ctx.moveTo(0, gy); ctx.lineTo(w, gy); }
            ctx.stroke();
            var pts = [];
            for (var j = 0; j < nodes.length; j++) {
                var n = nodes[j];
                var py = ((n.y * h - smooth.s * 0.25 * n.z) % (h * 3) + h * 3) % (h * 3) - h;
                var px = n.x * w + (smooth.x - 0.5) * 60 * n.z;
                pts.push([px, py, n]);
            }
            for (var a = 0; a < pts.length; a++) {
                for (var b = a + 1; b < pts.length; b++) {
                    var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 180) {
                        ctx.strokeStyle = 'rgba(195,242,77,' + (0.12 * (1 - d / 180)) + ')';
                        ctx.beginPath(); ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]); ctx.stroke();
                    }
                }
            }
            for (var c = 0; c < pts.length; c++) {
                var p = pts[c];
                if (p[2].k) {
                    ctx.strokeStyle = 'rgba(195,242,77,0.5)';
                    ctx.strokeRect(p[0] - 4, p[1] - 4, 8, 8);
                    ctx.beginPath(); ctx.moveTo(p[0] - 10, p[1]); ctx.lineTo(p[0] + 10, p[1]); ctx.moveTo(p[0], p[1] - 10); ctx.lineTo(p[0], p[1] + 10); ctx.stroke();
                } else {
                    ctx.fillStyle = 'rgba(236,233,226,' + (0.25 * p[2].z) + ')';
                    ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2);
                }
            }
            if (!reduce) requestAnimationFrame(draw);
        }
        resize();
        window.addEventListener('resize', function () { resize(); if (reduce) draw(); });
        if (finePointer && !reduce) window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight; }, { passive: true });
        draw();
    }

    /* ---------- Défilement : barre de progression, en-tête, scène ---------- */
    var header = document.querySelector('.header'), progress = document.querySelector('.progress'), lastY = scrollY;
    function onScroll(y) {
        scrollY = y;
        var max = doc.scrollHeight - window.innerHeight;
        if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
        if (header) {
            header.classList.toggle('is-scrolled', y > 20);
            header.classList.toggle('is-hidden', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
        }
        lastY = y;
        updateTimeline();
        if (reduce && canvas) { /* scène statique */ }
    }
    if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
    else window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });

    /* ---------- Menu mobile ---------- */
    var burger = document.querySelector('.burger'), nav = document.getElementById('nav');
    function setMenu(open) {
        nav.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        document.body.classList.toggle('menu-open', open);
        if (lenis) open ? lenis.stop() : lenis.start();
    }
    if (burger && nav) {
        burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
        nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    }

    /* ---------- Titres découpés en lignes ---------- */
    document.querySelectorAll('[data-lines]').forEach(function (el) {
        var parts = el.innerHTML.split(/<br\s*\/?>/i);
        el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
        el.innerHTML = parts.map(function (p, i) { return '<span class="line" aria-hidden="true"><span style="--i:' + i + '">' + p.trim() + '</span></span>'; }).join('');
        el.classList.add('lines', 'reveal-self');
    });

    /* ---------- Apparitions, schémas et compteurs ---------- */
    document.querySelectorAll('.draw path, .draw line, .draw polyline, .draw rect, .draw circle').forEach(function (s) {
        if (s.getTotalLength) { try { s.style.setProperty('--len', Math.ceil(s.getTotalLength()) + 1); } catch (e) { /* forme non mesurable */ } }
    });
    function countUp(el) {
        var end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', t0 = performance.now();
        if (reduce || !(end > 1)) return;
        (function step(t) {
            var k = Math.min((t - t0) / 1800, 1), v = Math.round(end * (1 - Math.pow(1 - k, 4)));
            el.textContent = v.toLocaleString('fr-FR') + suffix;
            if (k < 1) requestAnimationFrame(step);
        })(t0);
    }
    var targets = document.querySelectorAll('.reveal, .reveal-self, .draw, .timeline li, [data-count]');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('is-in');
                if (e.target.dataset.count) countUp(e.target);
                io.unobserve(e.target);
            });
        }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
        targets.forEach(function (t) {
            // Ce qui est déjà visible au chargement apparaît tout de suite, sans attendre l'observateur
            if (t.getBoundingClientRect().top < window.innerHeight * 0.95) { t.classList.add('is-in'); if (t.dataset.count) countUp(t); }
            else io.observe(t);
        });
    } else {
        targets.forEach(function (t) { t.classList.add('is-in'); });
    }

    /* ---------- Méthode : remplissage de la ligne au défilement ---------- */
    var timeline = document.querySelector('.timeline');
    function updateTimeline() {
        if (!timeline) return;
        var r = timeline.getBoundingClientRect(), vh = window.innerHeight;
        var k = Math.min(Math.max((vh * 0.6 - r.top) / r.height, 0), 1);
        timeline.style.setProperty('--fill', k.toFixed(3));
    }
    updateTimeline();

    /* ---------- Halo qui suit le pointeur sur les parcours ---------- */
    if (finePointer) {
        document.querySelectorAll('.path').forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                el.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
    }

    /* ---------- Formulaire de contact ---------- */
    var form = document.getElementById('contact-form');
    if (form) {
        var endpoint = form.getAttribute('data-endpoint');
        var fallback = form.getAttribute('data-fallback-email');
        var msg = document.getElementById('form-msg');
        var btn = form.querySelector('button[type="submit"]');
        var btnHtml = btn.innerHTML;
        var subjectSel = form.querySelector('[name="sujet"]');
        // Pré-sélection du sujet depuis un lien du type contact.html?sujet=qse
        var wanted = new URLSearchParams(location.search).get('sujet');
        if (wanted && subjectSel) Array.prototype.forEach.call(subjectSel.options, function (o) { if (o.dataset.key === wanted) subjectSel.value = o.value; });

        function show(kind, text) { msg.hidden = false; msg.className = 'form-msg ' + kind; msg.textContent = text; msg.focus(); }
        function check(field) {
            var v = field.value.trim(), err = '';
            if (field.required && !v) err = 'Ce champ est obligatoire.';
            else if (field.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) err = 'Adresse email invalide.';
            else if (field.name === 'message' && v && v.length < 10) err = 'Votre message est un peu court (10 caractères minimum).';
            field.setAttribute('aria-invalid', err ? 'true' : 'false');
            var out = document.getElementById(field.id + '-err');
            if (out) out.textContent = err;
            return !err;
        }
        form.querySelectorAll('input, textarea, select').forEach(function (f) { f.addEventListener('blur', function () { if (f.value) check(f); }); });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var fields = form.querySelectorAll('[required], [type="email"]'), first = null;
            fields.forEach(function (f) { if (!check(f) && !first) first = f; });
            if (first) { first.focus(); show('err', 'Merci de corriger les champs indiqués.'); return; }
            if (form.querySelector('.hp input').value) return; // robot

            var data = {};
            new FormData(form).forEach(function (v, k) { if (k !== '_hp') data[k] = String(v).trim(); });
            data._subject = 'Site S&T Développement : ' + data.sujet;
            data._replyto = data.email;
            data._template = 'table';
            data._captcha = 'false';

            btn.disabled = true;
            btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Envoi en cours…';
            fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
                .then(function (r) { return r.json().catch(function () { return {}; }); })
                .then(function (res) {
                    // Succès affiché uniquement sur confirmation explicite du service d'envoi
                    if (String(res.success) !== 'true') throw new Error(res.message || 'Réponse inattendue');
                    form.reset();
                    show('ok', 'Merci, votre message nous a bien été transmis. Nous revenons vers vous par email.');
                })
                .catch(function () {
                    var body = ['Nom : ' + data.nom, 'Email : ' + data.email, 'Entreprise : ' + (data.entreprise || ''), 'Téléphone : ' + (data.telephone || ''), 'Sujet : ' + data.sujet, '', data.message].join('\n');
                    var mailto = 'mailto:' + fallback + '?subject=' + encodeURIComponent(data._subject) + '&body=' + encodeURIComponent(body);
                    show('err', "L'envoi automatique n'a pas abouti. Votre message n'est pas perdu : votre messagerie va s'ouvrir avec le texte prérempli. Vous pouvez aussi écrire à " + fallback + '.');
                    setTimeout(function () { window.location.href = mailto; }, 900);
                })
                .finally(function () { btn.disabled = false; btn.innerHTML = btnHtml; });
        });
    }

    /* ---------- Année du pied de page ---------- */
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
