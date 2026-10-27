/* ==========================================================================
   db.js — base de alimentos activa (principal o ampliada).
   La base principal vive en window.DB; la extendida en window.DB_EXT.
   ========================================================================== */
(function () {
  'use strict';

  var subs = [];
  var maps = {};

  function mainDb() { return window.DB; }

  function merged() {
    var a = window.DB, b = window.DB_EXT;
    if (!a) return b || null;
    if (!b) return a;

    var cats = a.categorias.slice();
    b.categorias.forEach(function (c) {
      if (cats.indexOf(c) < 0) cats.push(c);
    });
    var grupos = (a.grupos || []).slice();
    (b.grupos || []).forEach(function (g) {
      if (grupos.indexOf(g) < 0) grupos.push(g);
    });

    return {
      meta: {
        app: 'NutricionAPP',
        version: (a.meta && a.meta.version) || '2.1',
        generado: (a.meta && a.meta.generado) || '',
        fuente: 'Base principal + USDA FoodData Central extendida',
        filas: a.alimentos.length + b.alimentos.length,
        columnas: a.cols.length,
        nota: 'Vista ampliada: base principal curada + alimentos comunes de USDA (SR Legacy y Foundation Foods).'
      },
      categorias: cats,
      grupos: grupos,
      cols: a.cols,
      alimentos: a.alimentos.concat(b.alimentos)
    };
  }

  function active() {
    if (DBX.mode() === 'extended' && window.DB_EXT) return merged();
    return mainDb();
  }

  function mapFor(db) {
    var key = db === mainDb() ? 'main' : 'extended';
    if (!maps[key]) {
      maps[key] = {};
      (db.alimentos || []).forEach(function (a) { maps[key][a.id] = a; });
    }
    return maps[key];
  }

  var DBX = {
    available: function () { return !!window.DB_EXT; },

    mode: function () {
      return (window.Store && Store.prefs && Store.prefs.db === 'extended' && window.DB_EXT)
        ? 'extended' : 'main';
    },

    db: active,

    foods: function () { var d = active(); return d ? d.alimentos : []; },
    cols: function () { var d = active(); return d ? d.cols : []; },
    categorias: function () { var d = active(); return d ? d.categorias : []; },
    meta: function () { var d = active(); return d ? d.meta : {}; },

    byId: function (id) {
      var d = active();
      return d ? (mapFor(d)[id] || null) : null;
    },

    count: function (mode) {
      if (!mode) mode = DBX.mode();
      if (mode === 'extended' && window.DB_EXT && window.DB) {
        return window.DB.alimentos.length + window.DB_EXT.alimentos.length;
      }
      return window.DB ? window.DB.alimentos.length : 0;
    },

    setMode: function (mode) {
      if (mode === 'extended' && !window.DB_EXT) {
        if (window.U) U.toast('La base ampliada no está disponible', 'warn');
        return false;
      }
      if (mode !== 'extended') mode = 'main';
      if (Store.prefs.db === mode) return true;
      Store.prefs.db = mode;
      Store.save();
      subs.forEach(function (fn) {
        try { fn(mode); } catch (e) { console.error(e); }
      });
      return true;
    },

    subscribe: function (fn) {
      subs.push(fn);
      return function () {
        var i = subs.indexOf(fn);
        if (i >= 0) subs.splice(i, 1);
      };
    },

    /** Control segmentado para cambiar de base. */
    switchHtml: function (opts) {
      opts = opts || {};
      var mode = DBX.mode();
      var main = DBX.count('main');
      var ext = DBX.count('extended');
      var dis = window.DB_EXT ? '' : ' disabled';
      return '<div class="db-switch seg' + (opts.cls ? ' ' + opts.cls : '') + '" role="group" aria-label="Base de alimentos">' +
        '<button type="button" data-db-mode="main" class="' + (mode === 'main' ? 'is-on' : '') + '"' +
          ' title="Solo la base curada (' + main + ' alimentos)">Principal <span class="db-n">' + main + '</span></button>' +
        '<button type="button" data-db-mode="extended" class="' + (mode === 'extended' ? 'is-on' : '') + '"' + dis +
          ' title="Base principal + alimentos comunes de USDA (' + ext + ' alimentos)">Ampliada <span class="db-n">' + ext + '</span></button>' +
        '</div>';
    },

    bindSwitch: function (root) {
      if (!root) return;
      var mode = DBX.mode();
      var buttons = root.querySelectorAll('[data-db-mode]');
      Array.prototype.forEach.call(buttons, function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-db-mode') === mode);
        b.onclick = function () {
          DBX.setMode(b.getAttribute('data-db-mode'));
        };
      });
    }
  };

  window.DBX = DBX;
})();
