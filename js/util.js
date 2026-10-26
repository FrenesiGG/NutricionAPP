/* ==========================================================================
   util.js — helpers de DOM, formato, modales y avisos.
   Sin dependencias. Se carga como script clásico (compatible con file://).
   ========================================================================== */
(function () {
  'use strict';

  var U = {};

  /* ------------------------------------------------------------- DOM */
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  U.norm = function (s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  /* ---------------------------------------------------------- formato */
  var NF = {};
  U.n = function (v, dec) {
    if (v == null || !isFinite(v)) return '—';
    var d = (dec == null) ? U.autoDec(v) : dec;
    var key = 'd' + d;
    if (!NF[key]) {
      NF[key] = new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: d
      });
    }
    return NF[key].format(v);
  };

  /** Decimales razonables según la magnitud del número. */
  U.autoDec = function (v) {
    var a = Math.abs(v);
    if (a === 0) return 0;
    if (a >= 100) return 0;
    if (a >= 10) return 1;
    if (a >= 1) return 2;
    if (a >= 0.1) return 3;
    return 4;
  };

  /** Respeta los decimales de la tabla original y quita ceros sobrantes. */
  U.fixed = function (v, dec) {
    if (v == null || !isFinite(v)) return '—';
    var s = Number(v).toFixed(Math.min(dec == null ? 0 : dec, 4));
    s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return s;
  };

  U.pct = function (v, ref) {
    if (!ref || !isFinite(ref) || ref <= 0) return null;
    return (v / ref) * 100;
  };

  U.date = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  U.uid = function (prefix) {
    return (prefix || 'r') + '-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 7);
  };

  U.debounce = function (fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 180);
    };
  };

  /* ------------------------------------------------------------ iconos */
  var PATHS = {
    check: '<path d="m5 12.5 4.5 4.5L19 6.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    download: '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    upload: '<path d="M12 15V3"/><path d="m8 7 4-4 4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    utensils: '<path d="M4 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3"/><path d="M6 12v9"/><path d="M16 3c-1.7 1.2-2.5 3.2-2.5 5.5 0 1.7.9 3 2.5 3.5V21"/>',
    flame: '<path d="M12 3c3.5 4 6 6.5 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2.5-5 0 2 .5 3 1.5 3.5C11 9 11.5 6 12 3Z"/>',
    save: '<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v6h8V3"/><path d="M8 14h8v7H8z"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
    leaf: '<path d="M12 21c0-6 3-10 8-11 0 6-3 10-8 11Z"/><path d="M12 21C8 16 5 13 4 7c6 0 8 4 8 8"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
    grip: '<circle cx="9" cy="5" r="1.4" fill="currentColor"/><circle cx="15" cy="5" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.4" fill="currentColor"/><circle cx="15" cy="12" r="1.4" fill="currentColor"/><circle cx="9" cy="19" r="1.4" fill="currentColor"/><circle cx="15" cy="19" r="1.4" fill="currentColor"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    dumbbell: '<path d="M6 5v14M18 5v14M6 12h12M3 8v8M21 8v8"/>',
    wheat: '<path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/>',
    drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>'
  };

  U.icon = function (name, size) {
    var p = PATHS[name] || PATHS.info;
    var s = size || 18;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };

  /* ------------------------------------------------------------ toasts */
  U.toast = function (msg, kind) {
    var root = U.$('#toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok');
    var ico = kind === 'err' ? 'alert' : (kind === 'warn' ? 'alert' : 'check');
    el.innerHTML = U.icon(ico, 15) + '<span>' + U.esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'opacity .2s, transform .2s';
      setTimeout(function () { el.remove(); }, 220);
    }, 3400);
  };

  /* ------------------------------------------------------------ modales */
  var stack = [];

  U.modal = function (opts) {
    opts = opts || {};
    var root = U.$('#modal-root');
    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    var sizeCls = opts.size === 'sm' ? ' modal-sm' : '';
    back.innerHTML =
      '<div class="modal' + sizeCls + '" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' +
          '<div class="mh-txt">' +
            '<h2>' + U.esc(opts.title || '') + '</h2>' +
            (opts.subtitle ? '<p>' + U.esc(opts.subtitle) + '</p>' : '') +
          '</div>' +
          '<button class="icon-btn" data-close aria-label="Cerrar">' + U.icon('x', 16) + '</button>' +
        '</div>' +
        '<div class="modal-body"></div>' +
        '<div class="modal-foot"></div>' +
      '</div>';

    var panel = back.firstChild;
    var body = panel.querySelector('.modal-body');
    var foot = panel.querySelector('.modal-foot');

    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    function close() {
      var i = stack.indexOf(handle);
      if (i >= 0) stack.splice(i, 1);
      back.remove();
      if (opts.onClose) opts.onClose();
      document.removeEventListener('keydown', onKey);
    }

    (opts.footer || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.kind || '');
      btn.innerHTML = (b.icon ? U.icon(b.icon, 16) : '') + '<span>' + U.esc(b.label) + '</span>';
      if (b.disabled) btn.disabled = true;
      btn.addEventListener('click', function () {
        if (b.onClick) b.onClick(handle);
        else close();
      });
      foot.appendChild(btn);
    });
    if (!(opts.footer || []).length) foot.remove();

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    }
    document.addEventListener('keydown', onKey);

    back.addEventListener('mousedown', function (e) {
      if (e.target === back && opts.dismissable !== false) close();
    });
    back.querySelector('[data-close]').addEventListener('click', close);

    root.appendChild(back);
    var handle = { el: panel, body: body, foot: foot, close: close };
    stack.push(handle);

    // foco al primer control útil
    setTimeout(function () {
      var f = body.querySelector('input, select, textarea, button');
      if (f) f.focus();
    }, 30);

    return handle;
  };

  U.closeAllModals = function () {
    stack.slice().forEach(function (m) { m.close(); });
  };

  U.confirm = function (opts) {
    return new Promise(function (resolve) {
      var done = false;
      var m = U.modal({
        title: opts.title,
        size: 'sm',
        body: '<p class="note" style="font-size:12.8px;line-height:1.6">' +
          opts.message + '</p>' + (opts.extra || ''),
        footer: [
          { label: opts.cancelLabel || 'Cancelar', onClick: function () { finish(false); } },
          {
            label: opts.confirmLabel || 'Aceptar',
            kind: opts.danger ? 'btn-danger' : 'btn-acc',
            onClick: function () { finish(true); }
          }
        ],
        onClose: function () { if (!done) { done = true; resolve(false); } }
      });
      function finish(v) { done = true; m.close(); resolve(v); }
    });
  };

  U.prompt = function (opts) {
    return new Promise(function (resolve) {
      var done = false;
      var m = U.modal({
        title: opts.title || 'Nombre',
        subtitle: opts.subtitle,
        size: 'sm',
        body:
          '<div class="field"><label for="prompt-in">' + U.esc(opts.label || 'Nombre') + '</label>' +
          '<input id="prompt-in" class="input" type="text" maxlength="' + (opts.maxlength || 70) +
          '" value="' + U.esc(opts.value || '') + '" placeholder="' + U.esc(opts.placeholder || '') + '"></div>' +
          (opts.help ? '<p class="note mt-8">' + U.esc(opts.help) + '</p>' : ''),
        footer: [
          { label: 'Cancelar', onClick: function () { finish(null); } },
          { label: opts.confirmLabel || 'Guardar', kind: 'btn-acc', onClick: submit }
        ],
        onClose: function () { if (!done) { done = true; resolve(null); } }
      });
      var input = m.body.querySelector('#prompt-in');
      function submit() {
        var v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        finish(v);
      }
      function finish(v) { done = true; m.close(); resolve(v); }
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      });
      input.focus();
      input.select();
    });
  };

  /* ----------------------------------------------------------- descargas */
  U.download = function (filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  };

  /* ------------------------------------------------------------- varios */
  U.slug = function (s) {
    return U.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'reporte';
  };

  U.baseUnit = function (food) {
    var u = String(food.unidad || '').toLowerCase().trim();
    if (u.indexOf('ml') === 0) return 'ml';
    if (u.indexOf('g') === 0) return 'g';
    return /(^|[^a-z])ml([^a-z]|$)/.test(u) ? 'ml' : 'g';
  };


  /* ------------------------------------------- dona de macronutrientes (v1.7) */
  /* kcal por macro (p, c, f). Etiquetas con nombre y % al lado de cada color. */
  U.macroPie = function (p, c, f, centerVal, centerSub) {
    var W = 360, H = 170, cx = 180, cy = 85, r = 46, sw = 16;
    var circ = 2 * Math.PI * r;
    var sum = (p || 0) + (c || 0) + (f || 0);
    var items = [
      { name: 'Proteína', v: p || 0, color: '#f43f5e' },
      { name: 'Carbohidratos', v: c || 0, color: '#3b82f6' },
      { name: 'Grasas', v: f || 0, color: '#14b8a6' }
    ];
    var s = '<svg class="macro-pie-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Distribución de macronutrientes">';
    if (sum <= 0) {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="' + sw + '"/>';
    } else {
      var acc = 0, sides = { r: [], l: [] };
      s += '<g transform="rotate(-90 ' + cx + ' ' + cy + ')">';
      items.forEach(function (it) {
        var frac = it.v / sum, len = frac * circ;
        it.frac = frac;
        it.mid = acc + frac / 2;
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + it.color + '" stroke-width="' + sw +
          '" stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-acc * circ).toFixed(2) + '"/>';
        acc += frac;
      });
      s += '</g>';
      items.forEach(function (it) {
        if (it.frac <= 0) return;
        var th = -Math.PI / 2 + 2 * Math.PI * it.mid;
        it.cos = Math.cos(th); it.sin = Math.sin(th);
        it.y = cy + it.sin * (r + 12);
        (it.cos >= 0 ? sides.r : sides.l).push(it);
      });
      [sides.r, sides.l].forEach(function (arr) {
        arr.sort(function (a, b) { return a.y - b.y; });
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].y < 22) arr[i].y = 22;
          if (i && arr[i].y < arr[i - 1].y + 34) arr[i].y = arr[i - 1].y + 34;
        }
        for (var j = arr.length - 1; j >= 0; j--) {
          var maxY = H - 22 - (arr.length - 1 - j) * 34;
          if (arr[j].y > maxY) arr[j].y = maxY;
        }
      });
      items.forEach(function (it) {
        if (it.frac <= 0) return;
        var right = it.cos >= 0, dir = right ? 1 : -1;
        var x0 = cx + it.cos * (r + sw / 2 + 1), y0 = cy + it.sin * (r + sw / 2 + 1);
        var lx = cx + dir * (r + sw / 2 + 22);
        s += '<polyline points="' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' ' + (lx - dir * 4).toFixed(1) + ',' + it.y.toFixed(1) + ' ' + lx.toFixed(1) + ',' + it.y.toFixed(1) +
          '" fill="none" stroke="' + it.color + '" stroke-width="1" opacity=".75"/>';
        var tx = lx + dir * 5, anc = right ? 'start' : 'end';
        s += '<text x="' + tx.toFixed(1) + '" y="' + (it.y - 2).toFixed(1) + '" text-anchor="' + anc + '" font-size="11" fill="#cbd5e1">' + it.name + '</text>' +
          '<text x="' + tx.toFixed(1) + '" y="' + (it.y + 12).toFixed(1) + '" text-anchor="' + anc + '" font-size="13" font-weight="700" fill="' + it.color + '">' +
          (it.frac * 100).toFixed(1) + '%</text>';
      });
    }
    s += '<text x="' + cx + '" y="' + (cy - 1) + '" text-anchor="middle" font-size="18" font-weight="750" fill="#fff">' + U.n(centerVal || 0, 0) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="7.5" font-weight="600" fill="#94a3b8" letter-spacing="0.03em">' + U.esc(centerSub || '') + '</text></svg>';
    return '<div class="macro-pie-wrap">' + s + '</div>';
  };

  /* ------------------------------------------- proyección de peso (v1.7) */
  /* cfg: { person, defaultKcal, modes:['initial','percent'], state:{mode,zero,manualKcal,manualPct}, note, title, hint }
     La simulación avanza por días; el TDEE se recalcula cada 7 días con el peso nuevo (7,700 kcal/kg). */
  var WP_TICKS = [
    { d: 7,            wk: '1',   mo: null, label: '1 semana' },
    { d: 14,           wk: '2',   mo: null, label: '2 semanas' },
    { d: 365 / 12,     label: '1 mes' },
    { d: 365 / 12 * 2, label: '2 meses' },
    { d: 365 / 12 * 3, label: '3 meses' },
    { d: 365 / 12 * 4, label: '4 meses' },
    { d: 365 / 12 * 6, label: '6 meses' },
    { d: 365,          label: '1 año' }
  ];

  function wpTrim(v, dec) {
    return (+v).toFixed(dec).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  function wpSimulate(person, st, mode, defaultKcal) {
    var p = {}, k;
    for (k in person) if (Object.prototype.hasOwnProperty.call(person, k)) p[k] = person[k];
    var manualKcal = +st.manualKcal, manualPct = +st.manualPct;
    var useKcal = mode === 'initial' && manualKcal > 0;
    var usePct = mode === 'percent' && manualPct > 0;
    var calc = N.calc(p), tdee = calc.tdee, block = 0;
    function intake() {
      if (mode === 'percent') {
        var c = N.calc(p);
        return usePct ? c.tdee * manualPct / 100 : c.meta;
      }
      return useKcal ? manualKcal : defaultKcal;
    }
    /* serie diaria 0..365: entre días enteros la curva es lineal, así que interpolar es exacto */
    var dense = [{ d: 0, kg: p.peso }];
    for (var day = 0; day < 365; day++) {
      var blk = Math.floor(day / 7);
      if (blk !== block) { block = blk; tdee = N.calc(p).tdee; }
      p.peso = Math.max(25, Math.min(300, p.peso + (intake() - tdee) / 7700));
      dense.push({ d: day + 1, kg: p.peso });
    }
    return dense;
  }

  function wpAt(dense, d) {
    var i = Math.max(0, Math.min(364, Math.floor(d)));
    var f = d - i;
    return dense[i].kg + (dense[i + 1].kg - dense[i].kg) * f;
  }

  U.weightProjection = function (host, cfg) {
    var st = cfg.state, modes = cfg.modes || ['initial'];
    if (modes.indexOf(st.mode) < 0) st.mode = modes[0];
    if (st.zero == null) st.zero = true;
    var mode = st.mode;
    var objF = N.obj(cfg.person.objetivo).f;
    var defKcal = Math.round(cfg.defaultKcal);
    var defPct = Math.round(objF * 1000) / 10;

    var segs = modes.length > 1
      ? '<div class="seg" id="wp-mode"><button type="button" data-mode="initial" class="' + (mode === 'initial' ? 'is-on' : '') + '">Meta calórica inicial</button>' +
        '<button type="button" data-mode="percent" class="' + (mode === 'percent' ? 'is-on' : '') + '">% de objetivo calórico</button></div>'
      : '';
    var manualVal = mode === 'initial' ? st.manualKcal : st.manualPct;
    var manual = '<label class="wp-manual"><span>' + (mode === 'initial' ? 'Meta calórica manual' : '% de objetivo calórico manual') + '</span>' +
      '<span class="input-suffix"><input id="wp-manual" class="input" type="number" min="0" step="' + (mode === 'initial' ? 10 : 1) + '" inputmode="decimal" ' +
      'placeholder="' + (mode === 'initial' ? defKcal : U.n(defPct, 1)) + '" value="' + (manualVal > 0 ? U.esc(manualVal) : '') + '">' +
      '<span>' + (mode === 'initial' ? 'kcal' : '%') + '</span></span></label>';

    host.innerHTML = '<div class="card-title"><h2>' + U.esc(cfg.title || 'Proyección de peso') + '</h2><span class="hint">' + U.esc(cfg.hint || '1 año · eje X logarítmico') + '</span></div>' +
      '<div class="weight-chart-controls">' + segs +
      '<button class="btn-help-icon" type="button" id="wp-help" title="Cómo funciona la proyección">?</button>' + manual +
      '<label class="weight-zero-toggle"><input type="checkbox" id="wp-zero" ' + (st.zero ? 'checked' : '') + '> Eje Y desde 0</label></div>' +
      (cfg.note ? '<p class="note" style="margin:0 0 6px">' + cfg.note + '</p>' : '') +
      '<div class="weight-chart-wrap" id="wp-body"></div>';

    var body = host.querySelector('#wp-body');
    var zeroEl = host.querySelector('#wp-zero');
    var inp = host.querySelector('#wp-manual');

    function draw() {
      var dense = wpSimulate(cfg.person, st, mode, defKcal);
      var pts = [{ d: 0, kg: dense[0].kg }].concat(WP_TICKS.map(function (t) { return { d: t.d, kg: wpAt(dense, t.d) }; }));
      var W = 760, H = 330, L = 58, R = 66, T = 32, B = 70;
      var y0 = H - B, y1 = y0 + 26;
      var ws = dense.map(function (a) { return a.kg; });
      var minW = st.zero ? 0 : Math.floor(Math.min.apply(null, ws) - 2);
      var maxW = Math.ceil(Math.max.apply(null, ws) + 2);
      if (maxW <= minW) maxW = minW + 1;
      var span = maxW - minW, ydec = span < 6 ? 1 : 0;
      function x(d) { return L + Math.log(d + 1) / Math.log(366) * (W - L - R); }
      function y(v) { return T + (maxW - v) / span * (y0 - T); }
      var g = '';
      for (var gy = 0; gy <= 4; gy++) {
        var val = minW + span * gy / 4, yy = y(val);
        g += '<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy + '" stroke="#253143"/>' +
          '<text x="' + (L - 8) + '" y="' + (yy + 3.5) + '" text-anchor="end" fill="#a3b3c6" font-size="10">' + val.toFixed(ydec) + '</text>';
      }
      g += '<text x="' + (L - 8) + '" y="' + (T - 14) + '" text-anchor="end" fill="#a3b3c6" font-size="11" font-weight="600">kg</text>';
      g += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + y0 + '" stroke="#3a4a60"/>';
      g += '<line x1="' + L + '" y1="' + y0 + '" x2="' + (W - R + 10) + '" y2="' + y0 + '" stroke="#3a4a60"/>' +
        '<line x1="' + L + '" y1="' + y1 + '" x2="' + (W - R + 10) + '" y2="' + y1 + '" stroke="#3a4a60"/>';
      var ticks = [{ d: 0, wk: 'Hoy', mo: 'Hoy' }].concat(WP_TICKS.map(function (t) {
        return { d: t.d, wk: wpTrim(t.d / 7, 1), mo: wpTrim(t.d / (365 / 12), 1) };
      }));
      ticks.forEach(function (t, i) {
        var xx = x(t.d), bw = t.d === 0 ? 30 : 36;
        g += '<line x1="' + xx + '" y1="' + T + '" x2="' + xx + '" y2="' + y1 + '" stroke="#1d2734"/>' +
          '<rect class="wp-hl-bg" data-i="' + i + '" x="' + (xx - bw / 2) + '" y="' + (y0 + 4) + '" width="' + bw + '" height="15" rx="4"/>' +
          '<text class="wp-tick" data-i="' + i + '" x="' + xx + '" y="' + (y0 + 15) + '" text-anchor="middle">' + t.wk + '</text>' +
          '<rect class="wp-hl-bg" data-i="' + i + '" x="' + (xx - bw / 2) + '" y="' + (y1 + 4) + '" width="' + bw + '" height="15" rx="4"/>' +
          '<text class="wp-tick" data-i="' + i + '" x="' + xx + '" y="' + (y1 + 15) + '" text-anchor="middle">' + t.mo + '</text>';
      });
      g += '<text x="' + (W - R + 16) + '" y="' + (y0 + 4) + '" fill="#a3b3c6" font-size="11" font-weight="600">semana</text>' +
        '<text x="' + (W - R + 16) + '" y="' + (y1 + 4) + '" fill="#a3b3c6" font-size="11" font-weight="600">mes</text>';
      var path = dense.map(function (a, i) { return (i ? 'L' : 'M') + x(a.d).toFixed(2) + ',' + y(a.kg).toFixed(2); }).join(' ');
      var dots = pts.map(function (a, i) {
        return '<circle class="wp-dot" data-i="' + i + '" cx="' + x(a.d).toFixed(2) + '" cy="' + y(a.kg).toFixed(2) + '" r="3.6"/>';
      }).join('');
      var hl = '<g id="wp-hl" visibility="hidden">' +
        '<line id="wp-gx" stroke="#5fa8f5" stroke-dasharray="4 3"/><line id="wp-gy" stroke="#5fa8f5" stroke-dasharray="4 3"/>' +
        '<rect id="wp-ybg" x="' + (L - 50) + '" width="46" height="16" rx="4"/><text id="wp-yt" x="' + (L - 27) + '" text-anchor="middle"></text>' +
        '<rect id="wp-xw-bg" y="' + (y0 + 3) + '" width="44" height="17" rx="4"/><text id="wp-xw" y="' + (y0 + 15) + '" text-anchor="middle"></text>' +
        '<rect id="wp-xm-bg" y="' + (y1 + 3) + '" width="44" height="17" rx="4"/><text id="wp-xm" y="' + (y1 + 15) + '" text-anchor="middle"></text>' +
        '<circle id="wp-hdot" r="6.5"/>' +
        '</g>';
      body.innerHTML = '<svg class="weight-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Proyección de peso">' + g +
        '<path d="' + path + '" fill="none" stroke="#5fd98d" stroke-width="2.5" stroke-linejoin="round"/>' + dots + hl + '</svg>';

      var svg = body.querySelector('svg');
      function show(d, tickI) {
        var kg = wpAt(dense, d), px = x(d), py = y(kg);
        svg.querySelectorAll('.is-hl').forEach(function (e) { e.classList.remove('is-hl'); });
        if (tickI >= 0) svg.querySelectorAll('[data-i="' + tickI + '"]').forEach(function (e) { e.classList.add('is-hl'); });
        var q = function (id) { return svg.querySelector(id); };
        q('#wp-hl').setAttribute('visibility', 'visible');
        q('#wp-gx').setAttribute('x1', px); q('#wp-gx').setAttribute('x2', px);
        q('#wp-gx').setAttribute('y1', py); q('#wp-gx').setAttribute('y2', y0);
        q('#wp-gy').setAttribute('x1', L); q('#wp-gy').setAttribute('x2', px);
        q('#wp-gy').setAttribute('y1', py); q('#wp-gy').setAttribute('y2', py);
        q('#wp-ybg').setAttribute('y', py - 8);
        q('#wp-yt').setAttribute('y', py + 3.5); q('#wp-yt').textContent = kg.toFixed(2);
        var wk = (d / 7).toFixed(2), mo = (d / (365 / 12)).toFixed(2);
        q('#wp-xw-bg').setAttribute('x', px - 22); q('#wp-xw').setAttribute('x', px); q('#wp-xw').textContent = wk;
        q('#wp-xm-bg').setAttribute('x', px - 22); q('#wp-xm').setAttribute('x', px); q('#wp-xm').textContent = mo;
        q('#wp-hdot').setAttribute('cx', px); q('#wp-hdot').setAttribute('cy', py);
        q('#wp-hdot').setAttribute('class', tickI >= 0 ? '' : 'is-new');
      }
      /* punto más cercano de la línea (con interpolación entre muestras diarias) */
      svg.onmousemove = function (e) {
        var rc = svg.getBoundingClientRect();
        if (!rc.width) return;
        var mx = (e.clientX - rc.left) * W / rc.width, my = (e.clientY - rc.top) * H / rc.height;
        var bi = 0, bd = 1e12;
        dense.forEach(function (a, i) {
          var dx = x(a.d) - mx, dy = y(a.kg) - my, dd = dx * dx + dy * dy;
          if (dd < bd) { bd = dd; bi = i; }
        });
        var bestD = dense[bi].d; bd = 1e12;
        [bi - 1, bi].forEach(function (i) {
          if (i < 0 || i > 364) return;
          var ax = x(dense[i].d), ay = y(dense[i].kg), bx2 = x(dense[i + 1].d), by2 = y(dense[i + 1].kg);
          var vx = bx2 - ax, vy = by2 - ay, len = vx * vx + vy * vy;
          var t = len ? ((mx - ax) * vx + (my - ay) * vy) / len : 0;
          t = Math.max(0, Math.min(1, t));
          var ex = ax + vx * t - mx, ey = ay + vy * t - my, dd = ex * ex + ey * ey;
          if (dd < bd) { bd = dd; bestD = dense[i].d + t; }
        });
        /* imán: si hay un punto de la cuadrícula cerca (≤ 7 px), se usa ese */
        var tickI = -1, nearPx = 7;
        pts.forEach(function (a, i) {
          var dist = Math.abs(x(a.d) - x(bestD));
          if (dist <= nearPx && dist < nearPx + 1) { nearPx = dist; tickI = i; }
        });
        if (tickI >= 0) bestD = pts[tickI].d;
        show(bestD, tickI);
      };
      svg.onmouseleave = function () {
        svg.querySelector('#wp-hl').setAttribute('visibility', 'hidden');
        svg.querySelectorAll('.is-hl').forEach(function (e) { e.classList.remove('is-hl'); });
      };
    }

    host.querySelectorAll('[data-mode]').forEach(function (b) {
      b.onclick = function () { st.mode = b.getAttribute('data-mode'); U.weightProjection(host, cfg); };
    });
    zeroEl.onchange = function () { st.zero = this.checked; draw(); };
    inp.oninput = function () {
      var v = parseFloat(inp.value);
      if (mode === 'initial') st.manualKcal = v > 0 ? v : 0; else st.manualPct = v > 0 ? v : 0;
      draw();
    };
    host.querySelector('#wp-help').onclick = function () {
      U.modal({ title: 'Cómo funciona la proyección', size: 'md', body:
        '<p><b>Meta calórica inicial:</b> mantiene fija la ingesta diaria; cada semana se estima el cambio de peso con el balance energético y se recalcula el TDEE con el peso nuevo.</p>' +
        (modes.length > 1 ? '<p><b>% de objetivo calórico:</b> la ingesta es cada semana ese porcentaje del TDEE actualizado (85 % en déficit moderado, 110 % en superávit…).</p>' : '') +
        '<p><b>Campo manual:</b> escribe tu propia meta (kcal) o tu propio % para sustituir el valor predeterminado, que se muestra en gris. Vacío o 0 = sin valor manual.</p>' +
        '<p>Simulación aproximada: 7,700 kcal por kg, sin adaptaciones metabólicas ni cambios de composición corporal. El eje X es logarítmico y los puntos están en 1 y 2 semanas y 1, 2, 3, 4, 6 y 12 meses.</p>' });
    };
    draw();
  };

  window.U = U;
})();
