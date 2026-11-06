/* Comportamiento de los bloques. Sin dependencias. */
(() => {
  // ---------- Header: sombra al hacer scroll (como xternall.com) ----------
  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => { header.dataset.scrolled = window.scrollY > 10; };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------- Menú: hamburguesa (móvil) y submenú "Otras Soluciones" ----------
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
  const subToggles = [...document.querySelectorAll('.x-nav__sub-toggle')];
  const closeSubs = except => subToggles.forEach(b => { if (b !== except) b.setAttribute('aria-expanded', 'false'); });
  // Despliegue tipo "slide" (equivalente al slideToggle de Divi en xternall.com)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SWING = 'cubic-bezier(.02, .01, .47, 1)'; // easing "swing" de jQuery (Divi)
  const slide = (el, open) => {
    if (reduceMotion || !el.animate) return Promise.resolve();
    const h = el.scrollHeight;
    const frames = [{ height: '0px', paddingTop: '0px', paddingBottom: '0px' }, { height: h + 'px' }];
    return el.animate(open ? frames : frames.reverse(), { duration: 500, easing: SWING }).finished.catch(() => {});
  };
  const setOpen = open => {
    if (!menu) return;
    const isOpen = menu.dataset.open === 'true';
    if (open === isOpen) return;
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    const mobile = getComputedStyle(toggle).display !== 'none';
    if (open) {
      menu.dataset.open = 'true';
      if (mobile) slide(menu, true);
    } else {
      const done = () => { menu.dataset.open = 'false'; closeSubs(); };
      mobile ? slide(menu, false).then(done) : done();
    }
  };
  if (toggle && menu) {
    toggle.addEventListener('click', () => setOpen(menu.dataset.open !== 'true'));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  }
  subToggles.forEach(btn => btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    closeSubs(btn);
    btn.setAttribute('aria-expanded', open);
  }));
  document.addEventListener('click', e => {
    if (header && !header.contains(e.target)) { closeSubs(); setOpen(false); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSubs(); setOpen(false); } });

  // ---------- Colapsables con slide (<details data-slide="ms">) ----------
  document.querySelectorAll('details[data-slide]').forEach(det => {
    const summary = det.querySelector('summary');
    const body = summary.nextElementSibling;
    const ms = +det.dataset.slide || 700;
    let busy = false;
    summary.addEventListener('click', e => {
      e.preventDefault();
      if (busy) return;
      if (reduceMotion || !body.animate) { det.open = !det.open; return; }
      busy = true;
      const opening = !det.open;
      if (opening) det.open = true;
      const h = body.scrollHeight;
      const frames = [{ height: '0px', paddingTop: '0px', paddingBottom: '0px' }, { height: h + 'px' }];
      body.animate(opening ? frames : frames.reverse(), { duration: ms, easing: SWING }).finished
        .catch(() => {})
        .then(() => { if (!opening) det.open = false; busy = false; });
    });
  });

  // ---------- Tabs (accesibles, con flechas) ----------
  document.querySelectorAll('[data-tabs]').forEach(root => {
    const tabs = [...root.querySelectorAll(':scope [role="tab"]')];
    const select = tab => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    // Si las pestañas se deslizan (process--side en móvil), centra la elegida sin mover la página
    const reveal = tab => {
      const bar = tab.parentElement;
      if (bar.scrollWidth <= bar.clientWidth) return;
      const shift = tab.getBoundingClientRect().left - bar.getBoundingClientRect().left - (bar.clientWidth - tab.offsetWidth) / 2;
      bar.scrollBy({ left: shift, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => { select(tab); reveal(tab); });
      tab.addEventListener('keydown', e => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = tabs[(i + step + tabs.length) % tabs.length];
        next.focus(); select(next); reveal(next);
      });
    });
  });

  // ---------- Diálogos ----------
  const open = dlg => { if (dlg && !dlg.open) dlg.showModal(); };
  document.querySelectorAll('[data-dialog-open]').forEach(btn =>
    btn.addEventListener('click', () => open(document.getElementById(btn.dataset.dialogOpen))));
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('click', e => {
      if (e.target === dlg || e.target.closest('[data-dialog-close]')) dlg.close();
    });
  });

  // Detalle de colaborador: los datos viven en <template id="person-xx">
  const personDlg = document.getElementById('person-dialog');
  if (personDlg) {
    const field = name => personDlg.querySelector(`[data-f="${name}"]`);
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-person]');
      if (!btn) return;
      const src = document.getElementById(`person-${btn.dataset.person}`);
      if (!src) return;
      const d = src.dataset;
      field('name').textContent = d.name;
      field('week').textContent = d.week;
      field('state').textContent = d.state;
      field('state').className = `x-badge x-badge--${d.tone}`;
      field('detail').textContent = src.content.textContent.trim();
      field('entry').textContent = d.entry;
      field('exit').textContent = d.exit;
      open(personDlg);
    });
  }

  // ---------- Rellenar desde <template data-*> ----------
  // Elementos con data-f="campo" reciben el texto de data-campo del template.
  // data-f-tone="campo" pone la clase del badge: info | success | warning | danger.
  const badgeClass = tone => 'x-badge' + (tone && tone !== 'info' ? ` x-badge--${tone}` : '');
  const fill = (root, tpl) => {
    const d = tpl.dataset;
    root.querySelectorAll('[data-f]').forEach(el => { if (d[el.dataset.f] != null) el.textContent = d[el.dataset.f]; });
    root.querySelectorAll('[data-f-tone]').forEach(el => { el.className = badgeClass(d[el.dataset.fTone]); });
  };
  // Botón que abre un diálogo con datos: data-fill-dialog="id-del-dialog" data-src="id-del-template"
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-fill-dialog]');
    if (!btn) return;
    const dlg = document.getElementById(btn.dataset.fillDialog);
    const tpl = document.getElementById(btn.dataset.src);
    if (!dlg || !tpl) return;
    fill(dlg, tpl);
    open(dlg);
  });
  // Select que cambia una ficha: <select data-fill-target="id" data-fill-prefix="detail-">
  // El valor elegido apunta al template prefijo+valor; los botones [data-fill-dialog] de la
  // ficha pasan a abrir ese mismo template.
  document.querySelectorAll('[data-fill-target]').forEach(sel => {
    const target = document.getElementById(sel.dataset.fillTarget);
    const update = () => {
      const tpl = document.getElementById(sel.dataset.fillPrefix + sel.value);
      if (!target || !tpl) return;
      fill(target, tpl);
      target.querySelectorAll('[data-fill-dialog]').forEach(b => { b.dataset.src = tpl.id; });
    };
    sel.addEventListener('change', update);
    update();
  });

  // ---------- app-demo: vistas, filtros y conteos ----------
  document.querySelectorAll('[data-app]').forEach(app => {
    // Vistas: todos los botones [data-view] (pestañas y menú lateral) comparten estado
    const viewBtns = [...app.querySelectorAll('[data-view]')];
    const panels = [...app.querySelectorAll('[data-view-panel]')];
    const label = app.querySelector('[data-view-label]');
    const show = view => {
      viewBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
      panels.forEach(p => { p.hidden = p.dataset.viewPanel !== view; });
      const src = viewBtns.find(b => b.dataset.view === view && b.dataset.label);
      if (label && src) label.textContent = src.dataset.label;
    };
    viewBtns.forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
    if (viewBtns[0]) show(viewBtns.find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.view || viewBtns[0].dataset.view);

    // Tabla filtrable: filas con data-region y data-tone; máximo data-max filas visibles
    const table = app.querySelector('[data-rows]');
    if (!table) return;
    const rows = [...table.querySelectorAll('tbody tr')];
    const max = +table.dataset.max || rows.length;
    const region = app.querySelector('[data-filter-region]');
    const modes = [...app.querySelectorAll('[data-filter-mode]')];
    let mode = 'all';
    const pad = n => String(n).padStart(2, '0');
    const apply = () => {
      const all = region ? region.dataset.filterRegion : '';
      const inRegion = rows.filter(r => !region || region.value === all || r.dataset.region === region.value);
      const list = inRegion.filter(r => mode === 'all' || r.dataset.tone !== 'success');
      rows.forEach(r => { r.hidden = !list.slice(0, max).includes(r); });
      app.querySelectorAll('[data-count]').forEach(el => {
        const t = el.dataset.count;
        el.textContent = pad(t === 'all' ? inRegion.length : inRegion.filter(r => r.dataset.tone === t).length);
      });
      const shown = app.querySelector('[data-shown]'), total = app.querySelector('[data-total]');
      if (shown) shown.textContent = Math.min(list.length, max);
      if (total) total.textContent = list.length;
      const empty = app.querySelector('[data-empty]');
      if (empty) empty.hidden = list.length > 0;
    };
    if (region) region.addEventListener('change', apply);
    modes.forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.filterMode;
      modes.forEach(x => x.setAttribute('aria-pressed', x === b));
      apply();
    }));
    apply();
  });

  // ---------- Pestañas simples con aria-pressed (ej. expediente) ----------
  // <div data-switch> con botones [data-switch-to="id-panel"]
  document.querySelectorAll('[data-switch]').forEach(group => {
    const btns = [...group.querySelectorAll('[data-switch-to]')];
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => {
        x.setAttribute('aria-pressed', x === b);
        document.getElementById(x.dataset.switchTo).hidden = x !== b;
      });
    }));
  });

  // ---------- compare: comparativo interactivo de propuestas ----------
  // <div data-compare> con botones [data-compare-mode] (data-w-price|tech|time, data-rec),
  // spans [data-w="price|tech|time"] y filas <tr data-name data-price data-tech data-days data-eligible="true|false">
  // con celdas [data-c="note|price|days|score"]. Puntuación = Σ peso × criterio normalizado:
  //   precio = menor precio elegible ÷ precio · técnico = calificación/100 · plazo = menor plazo elegible ÷ plazo.
  // Las propuestas con requisitos pendientes quedan fuera del ranking.
  document.querySelectorAll('[data-compare]').forEach(root => {
    const body = root.querySelector('[data-compare-rows]');
    const rows = [...body.querySelectorAll('tr')];
    const modes = [...root.querySelectorAll('[data-compare-mode]')];
    const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const recTitle = root.querySelector('[data-rec-title]');
    const recCopy = root.querySelector('[data-rec-copy]');
    const tpl = recTitle.dataset.recTitle;
    const notes = { top: root.dataset.noteTop, ok: root.dataset.noteOk, out: root.dataset.noteOut };
    const data = rows.map(tr => ({ tr, name: tr.dataset.name, price: +tr.dataset.price, tech: +tr.dataset.tech, days: +tr.dataset.days, ok: tr.dataset.eligible === 'true' }));
    const set = (tr, key, html) => { tr.querySelector(`[data-c="${key}"]`).innerHTML = html; };
    const apply = btn => {
      const w = { price: +btn.dataset.wPrice, tech: +btn.dataset.wTech, time: +btn.dataset.wTime };
      modes.forEach(b => b.setAttribute('aria-pressed', b === btn));
      Object.entries(w).forEach(([k, v]) => { root.querySelector(`[data-w="${k}"]`).textContent = v + '%'; });
      const ok = data.filter(d => d.ok);
      const minPrice = Math.min(...ok.map(d => d.price)), minDays = Math.min(...ok.map(d => d.days));
      data.forEach(d => { d.score = d.ok ? (minPrice / d.price * w.price) + (d.tech / 100 * w.tech) + (minDays / d.days * w.time) : null; });
      const ranked = [...data].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      ranked.forEach((d, i) => {
        body.appendChild(d.tr);
        d.tr.classList.toggle('is-top', i === 0);
        set(d.tr, 'note', i === 0 ? notes.top : d.ok ? notes.ok : notes.out);
        set(d.tr, 'score', d.score !== null ? `<span class="b-compare__score">${d.score.toFixed(1)}<small>/100</small></span>` : `<span class="b-compare__muted">${root.dataset.noScore}</span>`);
      });
      recTitle.textContent = tpl.replace('{name}', ranked[0].name);
      recCopy.textContent = btn.dataset.rec;
    };
    modes.forEach(b => b.addEventListener('click', () => apply(b)));
    apply(modes.find(b => b.getAttribute('aria-pressed') === 'true') || modes[0]);
  });

  // ---------- Formulario de demo → Sofía (CRM + aviso por correo) ----------
  // ============================ CONFIGURACIÓN ================================
  // La página NO habla con el CRM ni guarda llaves: manda la solicitud al backend
  // de Sofía, que con las llaves de su secret registra el contacto en el CRM
  // (/ords/crm/api/contactos) y manda el aviso por correo con la plantilla.
  // Destinatarios, llave del CRM y modo de pruebas se configuran allá, en
  // LandingLeads:Sites:xternall_repse (docs/LANDING-LEADS.md de portal-ia-backend-service).
  // En local se simula (se muestra en consola) salvo que haya endpointLocal.
  const SOFIA = {
    // ⚠ PRUEBAS: apunta a QA. Al pasar a producción cambiar a
    //   'https://sofia-service.gtim.mx/api/public/landing-leads/xternall_repse'
    endpoint: 'https://sofia-qa-service.gtim.mx/api/public/landing-leads/xternall_repse',
    endpointLocal: ''                             // p. ej. 'http://localhost:5000/api/public/landing-leads/xternall_repse'
  };
  // ===========================================================================

  // Parámetros de campaña del link (?utm_source=…&utm_campaign=…)
  const utm = new URLSearchParams(location.search);
  const recorta = (v, max) => (v ? String(v).slice(0, max) : null);
  // Página desde la que llegó (otro sitio); una recarga o un link interno no cuentan
  const referrer = (() => {
    try { return document.referrer && new URL(document.referrer).origin !== location.origin ? document.referrer : null; }
    catch { return null; }
  })();

  // Lo que recibe Sofía (POST /api/public/landing-leads/{sitio}). Con esto arma el
  // registro del CRM: fuente = "xternall-repse-cumplimiento / <utm_source>", campana = utm_campaign.
  const toSofia = data => ({
    name: (data.name || '').trim(),
    email: (data.email || '').trim(),
    company: (data.company || '').trim(),
    suppliers: data.suppliers || null,
    consent: data.consent === 'on',
    website: data.website || '',                  // honeypot
    utmSource: recorta(utm.get('utm_source'), 200),
    utmMedium: recorta(utm.get('utm_medium'), 200),
    utmCampaign: recorta(utm.get('utm_campaign'), 200),
    utmContent: recorta(utm.get('utm_content'), 200),
    utmTerm: recorta(utm.get('utm_term'), 200),
    referrer: recorta(referrer, 1000),
    pageUrl: recorta(location.href, 1000)
  });

  // POST JSON; marca err.network si ni siquiera hubo respuesta (sin conexión / CORS)
  const postJSON = async (url, body) => {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (err) {
      err.network = true;
      throw err;
    }
    if (!res.ok) throw new Error(`${new URL(url).host} respondió ${res.status}`);
    return res.json().catch(() => ({}));
  };

  // Textos del formulario: data-busy, data-error y data-error-network en el <form>
  document.querySelectorAll('[data-demo-form]').forEach(form => {
    const card = form.parentElement;
    const errorBox = form.querySelector('.b-demo__error');
    const success = card.querySelector('.b-demo__success');
    const submit = form.querySelector('[type="submit"]');
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';

    const showError = msg => { errorBox.textContent = msg; errorBox.hidden = false; };
    const setBusy = busy => {
      submit.setAttribute('aria-busy', busy);
      submit.innerHTML = busy ? `<span class="x-spin" aria-hidden="true"></span>${form.dataset.busy || 'Guardando solicitud…'}` : submit.dataset.label;
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      errorBox.hidden = true;
      if (!form.reportValidity()) return;
      if (form.website.value) return; // honeypot: bots

      const solicitud = toSofia(Object.fromEntries(new FormData(form)));
      const endpoint = isLocal ? SOFIA.endpointLocal : SOFIA.endpoint;

      setBusy(true);
      try {
        let folio = null;
        if (endpoint) {
          const json = await postJSON(endpoint, solicitud);
          folio = json.folio ?? null;
        } else if (isLocal) {
          console.info('[demo-form] Envío SIMULADO. Esto se mandaría a Sofía:', solicitud);
          await new Promise(r => setTimeout(r, 600));
        } else {
          throw new Error('Falta el endpoint de Sofía');
        }

        const folioBox = success.querySelector('[data-folio]');
        if (folioBox && folio != null) { folioBox.querySelector('b').textContent = folio; folioBox.hidden = false; }
        form.hidden = true;
        success.hidden = false;
        success.focus();
      } catch (err) {
        console.error('[demo-form]', err);
        showError(err.network && form.dataset.errorNetwork ? form.dataset.errorNetwork : form.dataset.error || 'No pudimos guardar tu solicitud. Inténtalo de nuevo.');
      } finally {
        setBusy(false);
      }
    });
  });
})();
