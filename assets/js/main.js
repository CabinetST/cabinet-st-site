/* S&T Développement — interactions du site (aucune dépendance obligatoire). */
(function () {
    'use strict';
    var doc = document.documentElement;
    doc.classList.remove('no-js');
    doc.classList.add('js');
    /* ---------- Menu mobile ---------- */
    var burger = document.querySelector('.burger'), nav = document.getElementById('nav');
    function setMenu(open) {
        nav.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        document.body.classList.toggle('menu-open', open);
    }
    if (burger && nav) {
        burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
        nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    }

    /* ---------- Apparition discrète au défilement ---------- */
    var targets = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('is-in');
                io.unobserve(e.target);
            });
        }, { threshold: 0.1 });
        targets.forEach(function (t) {
            // Ce qui est déjà visible au chargement apparaît tout de suite
            if (t.getBoundingClientRect().top < window.innerHeight) t.classList.add('is-in');
            else io.observe(t);
        });
    } else {
        targets.forEach(function (t) { t.classList.add('is-in'); });
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
