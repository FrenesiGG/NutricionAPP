/* ==========================================================================
   store.js — gestión de reportes en memoria (sin tocar archivos ni persistencia).
   ========================================================================== */
(function () {
  'use strict';

  var VERSION = '1.4';

  function blank() {
    return { version: VERSION, metab: [], comidas: [], prefs: { card: 132 } };
  }

  // Estado puramente en memoria
  var state = blank();
  var available = true;
  var subs = [];

  var Store = {
    version: VERSION,

    get available() { return available; },
    get state() { return state; },
    get metab() { return state.metab; },
    get comidas() { return state.comidas; },
    get prefs() { return state.prefs; },

    save: function () {
      // Todo vive en memoria: emitir a los observadores para refrescar UI
      Store.emit();
    },

    emit: function () {
      subs.forEach(function (fn) {
        try { fn(); } catch (e) { console.error(e); }
      });
    },

    subscribe: function (fn) {
      subs.push(fn);
      return function () {
        var i = subs.indexOf(fn);
        if (i >= 0) subs.splice(i, 1);
      };
    },

    /* ------------------------------------------------------- metabólicos */
    getMetab: function (id) {
      for (var i = 0; i < state.metab.length; i++) {
        if (state.metab[i].id === id) return state.metab[i];
      }
      return null;
    },

    addMetab: function (r) {
      state.metab.unshift(r);
      Store.save();
      Store.emit();
      return r;
    },

    updateMetab: function (r) {
      for (var i = 0; i < state.metab.length; i++) {
        if (state.metab[i].id === r.id) {
          state.metab[i] = r;
          Store.save();
          Store.emit();
          return r;
        }
      }
      return Store.addMetab(r);
    },

    removeMetab: function (id) {
      state.metab = state.metab.filter(function (r) { return r.id !== id; });
      Store.save();
      Store.emit();
    },

    /** Reportes de alimentos que comparan contra este metabólico. */
    metabInUse: function (id) {
      return state.comidas.filter(function (c) { return c.metabId === id; });
    },

    unlinkMetab: function (id) {
      state.comidas.forEach(function (c) {
        if (c.metabId === id) c.metabId = null;
      });
      Store.save();
    },

    /* ---------------------------------------------------------- comidas */
    getComida: function (id) {
      for (var i = 0; i < state.comidas.length; i++) {
        if (state.comidas[i].id === id) return state.comidas[i];
      }
      return null;
    },

    addComida: function (r) {
      state.comidas.unshift(r);
      Store.save();
      Store.emit();
      return r;
    },

    updateComida: function (r) {
      for (var i = 0; i < state.comidas.length; i++) {
        if (state.comidas[i].id === r.id) {
          state.comidas[i] = r;
          Store.save();
          Store.emit();
          return r;
        }
      }
      return Store.addComida(r);
    },

    removeComida: function (id) {
      state.comidas = state.comidas.filter(function (r) { return r.id !== id; });
      Store.save();
      Store.emit();
    },

    /* -------------------------------------------------------- preferencias */
    setPref: function (k, v) {
      state.prefs[k] = v;
      Store.save();
    },

    /* ------------------------------------------------------- import/export */
    exportJSON: function () {
      return JSON.stringify({
        app: 'NutricionAPP',
        version: VERSION,
        exportado: new Date().toISOString(),
        metab: state.metab,
        comidas: state.comidas
      }, null, 2);
    },

    /**
     * @param {string} text  contenido del archivo
     * @param {'merge'|'replace'} mode
     */
    importJSON: function (text, mode) {
      var data = JSON.parse(text);
      var metab = Array.isArray(data) ? [] : (data.metab || data.metaReports || []);
      var comidas = Array.isArray(data) ? data : (data.comidas || data.foodReports || []);

      if (!Array.isArray(metab) || !Array.isArray(comidas)) {
        throw new Error('El archivo no tiene el formato esperado.');
      }

      metab = metab.filter(function (r) { return r && typeof r === 'object'; });
      comidas = comidas.filter(function (r) { return r && typeof r === 'object'; });

      metab.forEach(function (r) { if (!r.id) r.id = U.uid('met'); r.tipo = 'metabolico'; });
      comidas.forEach(function (r) {
        if (!r.id) r.id = U.uid('com');
        r.tipo = 'comida';
        if (!Array.isArray(r.meriendas)) r.meriendas = [];
      });

      var result = { added: 0, skipped: 0, replaced: 0 };

      if (mode === 'replace') {
        result.replaced = state.metab.length + state.comidas.length;
        state.metab = metab;
        state.comidas = comidas;
      } else {
        var idsM = {};
        state.metab.forEach(function (r) { idsM[r.id] = true; });
        metab.forEach(function (r) {
          if (idsM[r.id]) { result.skipped++; } else { state.metab.unshift(r); result.added++; }
        });
        var idsC = {};
        state.comidas.forEach(function (r) { idsC[r.id] = true; });
        comidas.forEach(function (r) {
          if (idsC[r.id]) { result.skipped++; } else { state.comidas.unshift(r); result.added++; }
        });
      }

      // referencias huérfanas → se desvinculan
      var validos = {};
      state.metab.forEach(function (r) { validos[r.id] = true; });
      state.comidas.forEach(function (c) {
        if (c.metabId && !validos[c.metabId]) c.metabId = null;
      });

      state.metab.sort(function (a, b) { return String(b.fecha || '').localeCompare(String(a.fecha || '')); });
      state.comidas.sort(function (a, b) { return String(b.fecha || '').localeCompare(String(a.fecha || '')); });

      Store.save();
      Store.emit();
      return result;
    },

    /** Borra todo (solo lo usa "Reemplazar" cuando el archivo viene vacío). */
    clear: function () {
      state.metab = [];
      state.comidas = [];
      Store.save();
      Store.emit();
    }
  };

  window.Store = Store;
})();
