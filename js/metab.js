/* ==========================================================================
   metab.js — Calculadora de metas (TMB, TDEE, metas diarias y balance isocalórico).
   ========================================================================== */
(function () {
  'use strict';

  var root = null;
  var editingId = null;
  var values = blankValues();
  var selectedTargetKey = 'kcal';
  var rebalanceWarning = null;
  var els = {};

  function blankValues() {
    return {
      nombre: '',
      sexo: 'F',
      edad: 30,
      peso: 65,
      talla: 165,
      grasa: '',
      actividad: 'moderado',
      formula: 'mifflin',
      objetivo: 'mantener',
      ganarMusculo: false,
      customMacros: null
    };
  }

  function opts(sel, list, value) {
    return list.map(function (o) {
      return '<option value="' + o.k + '"' + (o.k === value ? ' selected' : '') + '>' +
        U.esc(o.label) + (o.hint ? ' · ' + U.esc(o.hint) : (o.nota ? ' · ' + U.esc(o.nota) : '')) +
        '</option>';
    }).join('');
  }

  function build() {
    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1>Calculadora de metas</h1>' +
          '<p>Tasa metabólica basal (TMB) y gasto calórico total diario (TDEE).</p>' +
        '</div>' +
        '<div class="head-actions">' +
          '<span class="badge" id="mb-state">Nuevo</span>' +
          '<button class="btn btn-sm" id="mb-back" style="display:none">' +
            U.icon('arrowLeft', 15) + '<span>Volver a reportes</span></button>' +
        '</div>' +
      '</div>' +

      '<div class="metas-layout">' +
        '<div class="metas-person-column">' +
        '<div class="card">' +
          '<div class="card-title"><h2>Datos de la persona</h2>' +
            '<span class="hint">El resultado se actualiza al escribir</span></div>' +

          '<div class="form-grid">' +
            '<div class="field span2">' +
              '<label for="mb-nombre">Nombre del reporte</label>' +
              '<input id="mb-nombre" class="input" maxlength="70" ' +
                'placeholder="Ej. Metas de Ana">' +
            '</div>' +

            '<div class="field span2">' +
              '<label>Sexo</label>' +
              '<div class="seg" id="mb-sexo">' +
                '<button type="button" data-v="F">Mujer</button>' +
                '<button type="button" data-v="M">Hombre</button>' +
              '</div>' +
            '</div>' +

            '<div class="field">' +
              '<label for="mb-edad">Edad</label>' +
              '<div class="input-suffix"><input id="mb-edad" class="input" type="number" ' +
                'min="14" max="100" step="1" inputmode="numeric"><span>años</span></div>' +
            '</div>' +

            '<div class="field">' +
              '<label for="mb-peso">Peso</label>' +
              '<div class="input-suffix"><input id="mb-peso" class="input" type="number" ' +
                'min="25" max="300" step="0.1" inputmode="decimal"><span>kg</span></div>' +
            '</div>' +

            '<div class="field">' +
              '<label for="mb-talla">Talla</label>' +
              '<div class="input-suffix"><input id="mb-talla" class="input" type="number" ' +
                'min="100" max="230" step="1" inputmode="numeric"><span>cm</span></div>' +
            '</div>' +

            '<div class="field">' +
              '<label for="mb-grasa">Grasa corporal (opcional)</label>' +
              '<div class="input-suffix"><input id="mb-grasa" class="input" type="number" ' +
                'min="3" max="60" step="0.1" inputmode="decimal" placeholder="—"><span>%</span></div>' +
            '</div>' +

            '<div class="field span2">' +
              '<label for="mb-act">Actividad física</label>' +
              '<select id="mb-act" class="select"></select>' +
            '</div>' +

            '<div class="field span2">' +
              '<div class="field-label-row">' +
                '<label for="mb-formula">Fórmula</label>' +
                '<button type="button" class="btn-help-icon" id="mb-formula-help" ' +
                  'title="Conoce en detalle cada método de cálculo" aria-label="Ayuda sobre fórmulas">' +
                  U.icon('help', 15) +
                '</button>' +
              '</div>' +
              '<select id="mb-formula" class="select"></select>' +
            '</div>' +

            '<div class="field span2">' +
              '<label for="mb-obj">Objetivo calórico</label>' +
              '<select id="mb-obj" class="select"></select>' +
              '<span class="note" id="mb-obj-note"></span>' +
            '</div>' +

            '<div class="field span2" id="mb-musculo-wrap">' +
              '<label>¿Buscas ganar o desarrollar masa muscular?</label>' +
              '<div class="seg" id="mb-musculo">' +
                '<button type="button" data-v="no">No</button>' +
                '<button type="button" data-v="si">Sí (Hipertrofia)</button>' +
              '</div>' +
              '<span class="note" style="display:block;margin-top:4px">' +
                'Adapta el requerimiento de proteína científicamente según tu balance energético (déficit, superávit o mantenimiento).' +
              '</span>' +
            '</div>' +
          '</div>' +

          '<div class="form-actions">' +
            '<button class="btn btn-acc" id="mb-save">' + U.icon('save', 16) +
              '<span>Guardar reporte metabólico</span></button>' +
            '<button class="btn" id="mb-reset">Limpiar</button>' +
          '</div>' +
          '<p class="note mt-14" id="mb-error" style="color:#f6a09a"></p>' +
        '</div>' +
        '</div>' +

        '<div class="result-panel">' +
          '<div class="card">' +
            '<div class="card-title"><h2>Resultado</h2>' +
              '<span class="badge" id="mb-formula-badge">—</span></div>' +
            '<div class="note">Tasa metabólica basal (TMB)</div>' +
            '<div class="bignum"><b id="mb-tmb">—</b><span>kcal/día</span></div>' +
            '<div style="margin-top:14px">' +
              '<div class="metric"><span class="m-label">Gasto total diario (TDEE)</span>' +
                '<span class="m-val" id="mb-tdee">—</span></div>' +
              '<div class="metric"><span class="m-label">Meta calórica</span>' +
                '<span class="m-val" id="mb-meta">—</span></div>' +
              '<div class="metric"><span class="m-label">Factor de actividad</span>' +
                '<span class="m-val" id="mb-actf">—</span></div>' +
            '</div>' +
            '<p class="note mt-14" id="mb-nota"></p>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-title"><h2>Metas diarias de referencia</h2>' +
              '<span class="hint">Haz clic en un valor para ver su rango y cálculo</span></div>' +
            '<div class="macro-targets" id="mb-targets"></div>' +
            '<div class="target-explanation" id="mb-target-explanation"></div>' +
            '<p class="note mt-14">Se usan como referencia en la calculadora de comida ' +
              'para mostrar qué porcentaje cubres.</p>' +
          '</div>' +
          '<div class="card"><div class="card-title"><h2>Distribución de Macronutrientes</h2><span class="hint">Meta calórica diaria</span></div>' +
            '<div id="mb-macro-chart"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card weight-chart-card" id="mb-weight-chart"></div>';

    els.nombre = U.$('#mb-nombre', root);
    els.edad = U.$('#mb-edad', root);
    els.peso = U.$('#mb-peso', root);
    els.talla = U.$('#mb-talla', root);
    els.grasa = U.$('#mb-grasa', root);
    els.act = U.$('#mb-act', root);
    els.formula = U.$('#mb-formula', root);
    els.formulaHelp = U.$('#mb-formula-help', root);
    els.obj = U.$('#mb-obj', root);
    els.musculo = U.$('#mb-musculo', root);
    els.sexo = U.$('#mb-sexo', root);
    els.state = U.$('#mb-state', root);
    els.save = U.$('#mb-save', root);
    els.error = U.$('#mb-error', root);
    els.targets = U.$('#mb-targets', root);
    els.targetExp = U.$('#mb-target-explanation', root);

    els.act.innerHTML = opts('act', N.ACTIVIDAD, values.actividad);
    els.formula.innerHTML = N.FORMULAS.map(function (f) {
      return '<option value="' + f.k + '"' + (f.k === values.formula ? ' selected' : '') + '>' +
        U.esc(f.label) + '</option>';
    }).join('');
    els.obj.innerHTML = opts('obj', N.OBJETIVOS, values.objetivo);

    /* ------------------------------------------------------------ eventos */

    els.sexo.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]');
      if (!b) return;
      values.sexo = b.getAttribute('data-v');
      values.customMacros = null;
      rebalanceWarning = null;
      paintSexo();
      refresh();
    });

    els.musculo.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]');
      if (!b) return;
      values.ganarMusculo = (b.getAttribute('data-v') === 'si');
      values.customMacros = null;
      rebalanceWarning = null;
      paintMusculo();
      refresh();
    });

    if (els.formulaHelp) {
      els.formulaHelp.addEventListener('click', openFormulaHelpModal);
    }

    ['nombre', 'edad', 'peso', 'talla', 'grasa', 'act', 'formula', 'obj'].forEach(function (k) {
      els[k].addEventListener('input', function () {
        syncValues();
        values.customMacros = null;
        rebalanceWarning = null;
        refresh();
      });
      els[k].addEventListener('change', function () {
        syncValues();
        values.customMacros = null;
        rebalanceWarning = null;
        refresh();
      });
    });

    els.targets.addEventListener('click', function (e) {
      var tile = e.target.closest('.mtile[data-key]');
      if (!tile) return;
      selectedTargetKey = tile.getAttribute('data-key');
      updateTargetSelection();
    });

    U.$('#mb-reset', root).addEventListener('click', function () {
      reset();
      U.toast('Formulario limpio');
    });
    U.$('#mb-back', root).addEventListener('click', function () {
      App.go('reportes');
    });
    els.save.addEventListener('click', save);

    /* -------------------------------------------------------- estado inicial */

    els.nombre.value = values.nombre;
    els.edad.value = values.edad;
    els.peso.value = values.peso;
    els.talla.value = values.talla;
    els.grasa.value = values.grasa;
    paintSexo();
    paintMusculo();
    refresh();
  }

  function paintSexo() {
    U.$$('button', els.sexo).forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-v') === values.sexo);
    });
  }

  function paintMusculo() {
    U.$$('button', els.musculo).forEach(function (b) {
      var isSi = b.getAttribute('data-v') === 'si';
      b.classList.toggle('is-on', values.ganarMusculo ? isSi : !isSi);
    });
  }

  function syncValues() {
    values.nombre = els.nombre.value.trim();
    values.edad = +els.edad.value || 0;
    values.peso = +els.peso.value || 0;
    values.talla = +els.talla.value || 0;
    values.grasa = els.grasa.value === '' ? '' : +els.grasa.value;
    values.actividad = els.act.value;
    values.formula = els.formula.value;
    values.objetivo = els.obj.value;
  }

  function valid() {
    if (!values.edad || values.edad < 14 || values.edad > 100) return 'La edad debe estar entre 14 y 100 años.';
    if (!values.peso || values.peso < 25 || values.peso > 300) return 'El peso debe estar entre 25 y 300 kg.';
    if (!values.talla || values.talla < 100 || values.talla > 230) return 'La talla debe estar entre 100 y 230 cm.';
    if (values.grasa !== '' && (values.grasa <= 3 || values.grasa >= 60)) {
      return 'El porcentaje de grasa debe estar entre 3 y 60 %.';
    }
    return '';
  }

  function refresh() {
    var err = valid();
    els.error.textContent = err;
    els.save.disabled = !!err;

    if (err) {
      U.$('#mb-tmb', root).textContent = '—';
      U.$('#mb-tdee', root).textContent = '—';
      U.$('#mb-meta', root).textContent = '—';
      U.$('#mb-actf', root).textContent = '—';
      U.$('#mb-targets', root).innerHTML = '';
      U.$('#mb-target-explanation', root).innerHTML = '';
      U.$('#mb-nota', root).textContent = '';
      U.$('#mb-weight-chart', root).innerHTML = '<div class="card-title"><h2>Proyección de peso</h2></div><p class="note">Introduce datos válidos para ver la proyección.</p>';
      return;
    }

    var res = N.calc(values);
    var refs = N.refs(values, res.meta);

    U.$('#mb-tmb', root).textContent = U.n(res.tmb, 0);
    U.$('#mb-tdee', root).textContent = U.n(res.tdee, 0) + ' kcal';
    U.$('#mb-meta', root).textContent = U.n(res.meta, 0) + ' kcal';
    U.$('#mb-actf', root).textContent = res.actividad.f.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') +
      ' · ' + res.actividad.label;
    U.$('#mb-formula-badge', root).textContent = N.formulaLabel(values.formula);

    var nota = '';
    if (values.formula === 'katch' && !(values.grasa > 0)) {
      nota = 'Katch-McArdle necesita el % de grasa corporal; mientras no lo escribas se usa Mifflin-St Jeor.';
    } else if (res.objetivo.k !== 'mantener') {
      nota = 'La meta calórica aplica el objetivo “' + res.objetivo.label + '” (' +
        res.objetivo.nota + ').';
    } else {
      nota = 'La meta calórica coincide con el TDEE porque el objetivo es mantener el peso.';
    }
    U.$('#mb-nota', root).textContent = nota;
    U.$('#mb-macro-chart', root).innerHTML = macroTargetChart(refs, res.meta);
    renderWeightChart(res);

    var tiles = [
      ['kcal', 'Energía', refs.kcal, 'kcal'],
      ['protein', 'Proteína', refs.protein, 'g'],
      ['fat', 'Grasas', refs.fat, 'g'],
      ['carb', 'Carbohidratos', refs.carb, 'g'],
      ['fiber', 'Fibra', refs.fiber, 'g'],
      ['water', 'Agua', refs.water, 'ml']
    ];

    els.targets.innerHTML = tiles.map(function (t) {
      var k = t[0];
      var name = t[1];
      var rObj = t[2];
      var v = rObj ? rObj.v : null;
      var min = rObj ? rObj.min : null;
      var max = rObj ? rObj.max : null;
      var unit = t[3];
      var isAct = (selectedTargetKey === k);

      var rangeTxt = (min != null && max != null && min !== max)
        ? '<div class="mtile-range">(' + U.n(min, 0) + ' – ' + U.n(max, 0) + ' ' + unit + ')</div>'
        : '';

      return '<div class="mtile' + (isAct ? ' is-active' : '') + '" data-key="' + k + '" role="button" tabindex="0">' +
        '<span>' + name + '</span>' +
        '<b>' + (v == null ? '—' : U.n(v, 0)) + '<small>' + unit + '</small></b>' +
        rangeTxt +
        '<div class="mtile-hint">' + (isAct ? '✓ Seleccionado' : 'Toca para ajustar/ver') + '</div>' +
      '</div>';
    }).join('');

    renderExplanation(res, refs);
  }

  function updateTargetSelection() {
    U.$$('.mtile', els.targets).forEach(function (tile) {
      var k = tile.getAttribute('data-key');
      var isAct = (selectedTargetKey === k);
      tile.classList.toggle('is-active', isAct);
      var hint = tile.querySelector('.mtile-hint');
      if (hint) hint.textContent = isAct ? '✓ Seleccionado' : 'Toca para ajustar/ver';
    });
    var res = N.calc(values);
    var refs = N.refs(values, res.meta);
    renderExplanation(res, refs);
  }



  function macroTargetChart(refs, kcal) {
    var p = (refs.protein && refs.protein.v || 0) * 4,
        c = (refs.carb && refs.carb.v || 0) * 4,
        f = (refs.fat && refs.fat.v || 0) * 9;
    return U.macroPie(p, c, f, kcal, 'KCAL / DÍA');
  }

  var wpState = { mode: 'initial', zero: true, manualKcal: 0, manualPct: 0 };

  function renderWeightChart(res) {
    var host = U.$('#mb-weight-chart', root);
    if (!host) return;
    U.weightProjection(host, {
      person: values,
      defaultKcal: res.meta,
      modes: ['initial', 'percent'],
      state: wpState,
      title: 'Proyección de peso',
      hint: '1 año · eje X logarítmico'
    });
  }

  /* --------------------------------------------------- explicación de metas */

  function renderExplanation(res, refs) {
    if (!els.targetExp) return;
    var k = selectedTargetKey || 'kcal';
    var peso = values.peso;
    var metaKcal = Math.round(res.meta);
    var tdeeKcal = Math.round(res.tdee);
    var tmbKcal = Math.round(res.tmb);

    var rObj = refs[k] || { v: 0, min: 0, max: 0, avg: 0 };
    var currentVal = Math.round(rObj.v || 0);
    var minVal = Math.round(rObj.min || currentVal);
    var maxVal = Math.round(rObj.max || currentVal);

    var title = '';
    var unit = 'g';
    if (k === 'kcal') unit = 'kcal';
    else if (k === 'water') unit = 'ml';

    var valStr = U.n(currentVal, 0) + ' ' + unit + ' (' + U.n(minVal, 0) + ' – ' + U.n(maxVal, 0) + ' ' + unit + ')';
    var calcHtml = '';
    var sourceHtml = '';
    var isRangeMacro = (k === 'protein' || k === 'carb' || k === 'fat' || k === 'fiber' || k === 'water');

    if (k === 'kcal') {
      title = 'Energía diaria';
      var objDesc = res.objetivo.k === 'mantener'
        ? 'Objetivo "Mantener peso": meta calórica igual al gasto diario total (TDEE).'
        : 'Objetivo "' + res.objetivo.label + '" (factor ' + res.objetivo.f + '): ' +
          U.n(tdeeKcal, 0) + ' kcal × ' + res.objetivo.f + ' = ' + U.n(metaKcal, 0) + ' kcal/día (' + res.objetivo.nota + ').';
      calcHtml = '1. <b>Tasa metabólica basal (TMB):</b> ' + U.n(tmbKcal, 0) + ' kcal/día usando ' + N.formulaLabel(values.formula) + '.<br>' +
        '2. <b>Gasto energético total (TDEE):</b> ' + U.n(tmbKcal, 0) + ' kcal × ' + res.actividad.f +
        ' (actividad ' + res.actividad.label.toLowerCase() + ') = <b>' + U.n(tdeeKcal, 0) + ' kcal/día</b>.<br>' +
        '3. <b>Meta calórica final:</b> ' + objDesc + '<br>' +
        '• Rango de balance energético fisiológico: ' + U.n(minVal, 0) + ' a ' + U.n(maxVal, 0) + ' kcal/día (±5 %).';
      sourceHtml = 'Directrices del Institute of Medicine (IOM / Academia Nacional de Medicina de EE. UU.) y Reporte de Consulta Conjunta FAO/OMS/UNU sobre Necesidades de Energía Humana.';
    } else if (k === 'protein') {
      title = 'Proteína diaria';
      var protG = currentVal;
      var protKcal = protG * 4;
      var protPct = metaKcal > 0 ? ((protKcal / metaKcal) * 100).toFixed(1) : 0;
      var objKey = values.objetivo || 'mantener';

      if (values.ganarMusculo) {
        var gkgApplied = (protG / peso).toFixed(2);
        var defExplanation = '';

        if (objKey === 'perder2') {
          defExplanation = '<b>Déficit agresivo (−20 % de energía):</b> En restricción calórica severa, la falta de energía dietética ' +
            'estimula la gluconeogénesis hepática a partir de aminoácidos musculares y eleva el catabolismo proteico. Para blindar ' +
            'la masa magra y maximizar la pérdida de grasa neta, la ciencia deportiva establece un rango elevado de <b>2.3 a 3.1 g/kg/día</b> (promedio recomendado: 2.6 g/kg).';
        } else if (objKey === 'perder') {
          defExplanation = '<b>Déficit moderado (−15 % de energía):</b> La restricción energética moderada reduce la síntesis proteica basal. ' +
            'Para mantener un balance de nitrógeno positivo y preservar el tejido muscular activo, se establece un rango de <b>2.0 a 2.6 g/kg/día</b> (promedio recomendado: 2.3 g/kg).';
        } else if (objKey === 'ganar') {
          defExplanation = '<b>Superávit calórico (+10 % de energía):</b> En superávit, la alta disponibilidad de calorías e hidratos de carbono ejerce ' +
            'un potente <i>efecto de ahorro proteico</i> ("protein-sparing effect"). Como el cuerpo no necesita oxidar aminoácidos como energía, ' +
            'el requerimiento para maximizar la síntesis muscular se satura en <b>1.6 a 2.0 g/kg/día</b> (promedio recomendado: 1.8 g/kg). Superar este nivel en superávit no genera mayor músculo sino que se quema como energía.';
        } else {
          defExplanation = '<b>Mantenimiento de peso:</b> Con energía suficiente y balance neutro, el rango óptimo para maximizar la hipertrofia ' +
            'estimulada por el entrenamiento de fuerza es de <b>1.6 a 2.2 g/kg/día</b> (promedio recomendado: 1.9 g/kg).';
        }

        calcHtml = '<b>Objetivo de aumento / hipertrofia muscular activo:</b><br>' +
          '• Peso corporal: ' + peso + ' kg.<br>' +
          '• Ingesta calculada para tu balance calórico (' + res.objetivo.label + '): <b>' + gkgApplied + ' g/kg</b> (rango: ' + (minVal / peso).toFixed(1) + ' a ' + (maxVal / peso).toFixed(1) + ' g/kg).<br>' +
          '• Total diario: <b>' + U.n(protG, 0) + ' g/día</b> (' + U.n(protKcal, 0) + ' kcal, ' + protPct + ' % del gasto calórico).<br><br>' +
          defExplanation;
        sourceHtml = 'Posición oficial de la International Society of Sports Nutrition (ISSN Position Stand: protein and exercise, 2017), ' +
          'Helms et al. (Journal of the International Society of Sports Nutrition, 2014: "A systematic review of dietary protein during caloric restriction in resistance trained lean athletes") ' +
          'y Morton et al. (British Journal of Sports Medicine, 2018: meta-análisis de 49 estudios con 1,863 sujetos).';
      } else {
        var baseG = (protG / peso).toFixed(2);
        calcHtml = '<b>Requerimiento de salud y mantenimiento general:</b><br>' +
          '• Peso corporal: ' + peso + ' kg.<br>' +
          '• Ingesta calculada según nivel de actividad (' + res.actividad.label.toLowerCase() + ') y objetivo: <b>' + baseG + ' g/kg</b> (rango: ' + minVal + ' a ' + maxVal + ' g/día).<br>' +
          '• Total diario: <b>' + U.n(protG, 0) + ' g/día</b> (' + U.n(protKcal, 0) + ' kcal, ' + protPct + ' % de tu meta calórica).<br>' +
          (objKey.indexOf('perder') >= 0 ? '<i>Aviso de déficit:</i> Se ha incrementado ligeramente la proteína para prevenir la pérdida involuntaria de tejido magro durante la restricción calórica.' : '');
        sourceHtml = 'Ingesta Diaria Recomendada (IDR / RDA) del Institute of Medicine (IOM / Food and Nutrition Board) y Organización Mundial de la Salud (OMS), fijando 0.8 g/kg/día como mínimo de mantenimiento y 1.0–1.6 g/kg para adultos activos.';
      }
    } else if (k === 'fat') {
      title = 'Grasas totales';
      var fatG = currentVal;
      var fatKcal = fatG * 9;
      var fatPct = metaKcal > 0 ? ((fatKcal / metaKcal) * 100).toFixed(1) : 28;
      calcHtml = '• Rango Aceptable de Distribución de Macronutrientes (AMDR): <b>20 % a 35 % de las calorías diarias</b> (' + minVal + ' a ' + maxVal + ' g/día).<br>' +
        '• Valor actual aplicado: <b>' + fatG + ' g/día</b> (' + U.n(fatKcal, 0) + ' kcal, ' + fatPct + ' % de la meta diaria).<br>' +
        '• Cada gramo de grasa aporta 9 kcal de energía de alta densidad.';
      sourceHtml = 'Rango Aceptable de Distribución de Macronutrientes (AMDR) del Institute of Medicine (IOM / NASEM) y directrices de la OMS/FAO sobre grasas y ácidos grasos en la nutrición humana.';
    } else if (k === 'carb') {
      title = 'Carbohidratos';
      var carbG = currentVal;
      var carbKcal = carbG * 4;
      var carbPct = metaKcal > 0 ? ((carbKcal / metaKcal) * 100).toFixed(1) : 50;
      calcHtml = '• Rango Aceptable de Distribución de Macronutrientes (AMDR): <b>45 % a 65 % de las calorías diarias</b> (' + minVal + ' a ' + maxVal + ' g/día).<br>' +
        '• Valor actual aplicado: <b>' + carbG + ' g/día</b> (' + U.n(carbKcal, 0) + ' kcal, ' + carbPct + ' % de la meta diaria).<br>' +
        '• Actúa como combustible primario para el sistema nervioso central y la intensidad en el entrenamiento muscular.';
      sourceHtml = 'Rango Aceptable de Distribución de Macronutrientes (AMDR) del Institute of Medicine (IOM / NASEM) y guías alimentarias de la OMS/FAO.';
    } else if (k === 'fiber') {
      title = 'Fibra dietética';
      calcHtml = '• Ingesta recomendada: <b>14 a 18 g de fibra dietética por cada 1,000 kcal</b> consumidas.<br>' +
        '• Rango calculado para tu meta (' + U.n(metaKcal, 0) + ' kcal): <b>' + minVal + ' a ' + maxVal + ' g/día</b> (meta actual: ' + currentVal + ' g/día).<br>' +
        '• Favorece la microbiota colónica, saciedad y regulación glucémica y lipídica.';
      sourceHtml = 'Dietary Reference Intakes (DRI) del Institute of Medicine (IOM / Academia Nacional de Medicina de EE. UU.) y Guías Dietéticas de la OMS/FAO.';
    } else if (k === 'water') {
      title = 'Agua / Hidratación diaria';
      var baseWat = Math.round(peso * 35);
      var extraWat = 0;
      if (values.actividad === 'ligero') extraWat = 350;
      else if (values.actividad === 'moderado') extraWat = 700;
      else if (values.actividad === 'alto') extraWat = 1000;
      else if (values.actividad === 'muyalto') extraWat = 1300;

      calcHtml = '• <b>Hidratación basal por peso:</b> ' + peso + ' kg × 30–40 ml/kg = ' + U.n(peso * 30, 0) + ' a ' + U.n(peso * 40, 0) + ' ml/día.<br>' +
        '• <b>Reposición por actividad física (' + res.actividad.label.toLowerCase() + '):</b> +' + extraWat + ' ml/día.<br>' +
        '• <b>Rango total diario recomendado:</b> <b>' + U.n(minVal, 0) + ' a ' + U.n(maxVal, 0) + ' ml/día</b> (meta actual: ' + U.n(currentVal, 0) + ' ml, aprox. ' + (currentVal / 1000).toFixed(1) + ' L).';
      sourceHtml = 'Opinión Científica sobre Valores de Referencia Dietéticos para el Agua de la Autoridad Europea de Seguridad Alimentaria (EFSA, 2010), guías OMS y Colegio Americano de Medicina del Deporte (ACSM).';
    }

    /* Caja de ajuste manual interactivo de rangos con balance isocalórico */
    var adjustBoxHtml = '';
    if (isRangeMacro) {
      var isMacroCal = (k === 'protein' || k === 'carb' || k === 'fat');
      var hasCustom = !!(values.customMacros && values.customMacros[k] != null);
      adjustBoxHtml =
        '<div class="target-adjust-box mt-14">' +
          '<div class="adjust-head">' +
            '<span class="adjust-title"><b>Ajustar manualmente dentro del rango</b> (' + minVal + ' – ' + maxVal + ' ' + unit + '):</span>' +
            (values.customMacros ? '<button type="button" class="btn btn-xs btn-ghost" id="mb-reset-macro">Restablecer valores automáticos</button>' : '') +
          '</div>' +
          '<div class="adjust-input-row mt-8">' +
            '<div class="input-suffix" style="max-width:180px">' +
              '<input id="mb-manual-macro-in" class="input" type="number" min="' + minVal + '" max="' + maxVal + '" step="1" value="' + currentVal + '">' +
              '<span>' + unit + '</span>' +
            '</div>' +
            '<button type="button" class="btn btn-sm btn-outline" id="mb-apply-macro">Aplicar</button>' +
            '<span class="note" style="margin-left:6px">' +
              (isMacroCal
                ? 'Al ajustar este macronutriente, los otros se equilibran proporcionalmente para mantener exactamente tus <b>' + U.n(metaKcal, 0) + ' kcal</b>.'
                : 'Ajusta tu meta diaria dentro del rango recomendado.') +
            '</span>' +
          '</div>' +
          (rebalanceWarning ? '<div class="adjust-warn mt-8">' + U.icon('alert', 14) + '<span>' + U.esc(rebalanceWarning) + '</span></div>' : '') +
        '</div>';
    }

    els.targetExp.innerHTML =
      '<div class="exp-head">' +
        '<div class="exp-title">' +
          '<span class="exp-badge">' + U.icon('info', 14) + '</span>' +
          '<b>' + U.esc(title) + '</b>: <span class="exp-val">' + valStr + '</span>' +
        '</div>' +
        '<span class="hint">Cálculo y rango de referencia</span>' +
      '</div>' +
      '<div class="exp-body">' +
        '<div class="exp-section">' +
          '<div class="exp-label">Cómo se calculó para tu perfil</div>' +
          '<div class="exp-text">' + calcHtml + '</div>' +
        '</div>' +
        '<div class="exp-section">' +
          '<div class="exp-label">Fuente científica / clínica</div>' +
          '<div class="exp-source">' + U.esc(sourceHtml) + '</div>' +
        '</div>' +
        adjustBoxHtml +
      '</div>';

    /* Eventos del ajuste manual dentro del rango */
    var inpManual = U.$('#mb-manual-macro-in', els.targetExp);
    var btnApply = U.$('#mb-apply-macro', els.targetExp);
    var btnResetMacro = U.$('#mb-reset-macro', els.targetExp);

    function doAdjust() {
      if (!inpManual) return;
      var nVal = Math.round(+inpManual.value || 0);
      if (k === 'protein' || k === 'carb' || k === 'fat') {
        var resObj = N.rebalanceMacros(res.meta, k, nVal, refs);
        values.customMacros = values.customMacros || {};
        values.customMacros.protein = resObj.protein;
        values.customMacros.carb = resObj.carb;
        values.customMacros.fat = resObj.fat;
        rebalanceWarning = resObj.warning;
        if (resObj.warning) U.toast(resObj.warning, 'warn');
        else U.toast('Metas reequilibradas manteniendo ' + U.n(res.meta, 0) + ' kcal');
      } else {
        var clMin = Math.round(refs[k].min), clMax = Math.round(refs[k].max);
        var clVal = Math.max(clMin, Math.min(clMax, nVal));
        if (clVal !== nVal) {
          rebalanceWarning = 'Se ajustó al límite permitido (' + clVal + ' ' + unit + ').';
          U.toast(rebalanceWarning, 'warn');
        } else {
          rebalanceWarning = null;
          U.toast('Meta personalizada guardada');
        }
        values.customMacros = values.customMacros || {};
        values.customMacros[k] = clVal;
      }
      refresh();
    }

    if (btnApply) btnApply.addEventListener('click', doAdjust);
    if (inpManual) {
      inpManual.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doAdjust(); }
      });
    }
    if (btnResetMacro) {
      btnResetMacro.addEventListener('click', function () {
        values.customMacros = null;
        rebalanceWarning = null;
        U.toast('Metas restablecidas a valores automáticos');
        refresh();
      });
    }
  }

  /* --------------------------------------------------- modal ayuda fórmulas */

  function openFormulaHelpModal() {
    var content =
      '<p class="note mb-14" style="font-size:12.5px;line-height:1.55">' +
        'La Tasa Metabólica Basal (TMB) representa la cantidad mínima de energía (en calorías) ' +
        'que tu cuerpo necesita en reposo absoluto para mantener sus funciones vitales básicas ' +
        '(respiración, circulación, termorregulación y función celular). Aquí tienes el detalle de cada método disponible:' +
      '</p>' +

      '<div class="formula-card">' +
        '<div class="formula-card-head">' +
          '<h3>1. Mifflin-St Jeor (1990)</h3>' +
          '<span class="badge ok">Estándar de oro</span>' +
        '</div>' +
        '<div class="formula-desc">' +
          'Publicada por Mifflin et al. en <i>The American Journal of Clinical Nutrition</i>. ' +
          'Es considerada por la Academy of Nutrition and Dietetics (AND) como la fórmula más exacta ' +
          'y fiable para la población general contemporánea (tanto personas con normopeso como con sobrepeso).' +
        '</div>' +
        '<div class="formula-eq">' +
          'Hombre: TMB = (10 × peso kg) + (6.25 × talla cm) - (5 × edad) + 5<br>' +
          'Mujer:  TMB = (10 × peso kg) + (6.25 × talla cm) - (5 × edad) - 161' +
        '</div>' +
        '<div class="formula-meta"><b>Cuándo usarla:</b> Por defecto para la inmensa mayoría de adultos si no tienes medición de grasa corporal.</div>' +
      '</div>' +

      '<div class="formula-card">' +
        '<div class="formula-card-head">' +
          '<h3>2. Harris-Benedict (Revisión Roza y Shizgal, 1984)</h3>' +
          '<span class="badge">Histórica / Clínica</span>' +
        '</div>' +
        '<div class="formula-desc">' +
          'Revisión moderna de la ecuación clásica original de 1919 (Carnegie Institution). ' +
          'Ha sido el estándar clínico hospitalario durante décadas.' +
        '</div>' +
        '<div class="formula-eq">' +
          'Hombre: TMB = 88.362 + (13.397 × peso kg) + (4.799 × talla cm) - (5.677 × edad)<br>' +
          'Mujer:  TMB = 447.593 + (9.247 × peso kg) + (3.098 × talla cm) - (4.330 × edad)' +
        '</div>' +
        '<div class="formula-meta"><b>Cuándo usarla:</b> Excelente para comparar con Mifflin-St Jeor; suele estimar ligeramente más alto (5–10 %) en personas sedentarias, siendo adecuada para adultos normopeso activos.</div>' +
      '</div>' +

      '<div class="formula-card">' +
        '<div class="formula-card-head">' +
          '<h3>3. FAO / OMS / UNU (1985 / 2004)</h3>' +
          '<span class="badge">Salud pública</span>' +
        '</div>' +
        '<div class="formula-desc">' +
          'Ecuaciones desarrolladas por comités de expertos conjuntos de la FAO, la Organización Mundial de la Salud ' +
          'y la Universidad de las Naciones Unidas. Utilizan modelos de regresión lineal basados únicamente en el peso ' +
          'corporal segmentados por cohortes de edad.' +
        '</div>' +
        '<div class="formula-eq">' +
          'Hombres: 18–29: 15.057 × peso + 692.2 | 30–59: 11.472 × peso + 873.1 | ≥60: 11.711 × peso + 587.7<br>' +
          'Mujeres: 18–29: 14.818 × peso + 486.6 | 30–59: 8.126 × peso + 845.6  | ≥60: 9.082 × peso + 658.5' +
        '</div>' +
        '<div class="formula-meta"><b>Cuándo usarla:</b> Recomendada para estudios poblacionales, salud pública o cuando se desconoce la estatura exacta del usuario.</div>' +
      '</div>' +

      '<div class="formula-card">' +
        '<div class="formula-card-head">' +
          '<h3>4. Katch-McArdle (1996)</h3>' +
          '<span class="badge amber">Basada en masa muscular</span>' +
        '</div>' +
        '<div class="formula-desc">' +
          'Creada por Frank Katch y William McArdle. A diferencia de las demás, no estima el metabolismo por edad o sexo, ' +
          'sino directamente a partir de la <b>Masa Libre de Grasa (MLG)</b>, que es el tejido más activo metabólicamente (músculo, órganos y esqueleto).' +
        '</div>' +
        '<div class="formula-eq">' +
          'MLG (kg) = peso × (1 - % grasa / 100)<br>' +
          'TMB = 370 + (21.6 × MLG)' +
        '</div>' +
        '<div class="formula-meta"><b>Cuándo usarla:</b> La más precisa para deportistas, personas que entrenan fuerza o quienes conocen su porcentaje de grasa corporal real (por DEXA, plicómetro o bioimpedancia). Si no se indica la grasa, el sistema conmuta temporalmente a Mifflin-St Jeor.</div>' +
      '</div>';

    U.modal({
      title: 'Métodos de cálculo de Tasa Metabólica Basal (TMB)',
      subtitle: 'Explicación detallada y fuentes de cada fórmula disponible',
      size: 'lg',
      body: content,
      footer: [
        { label: 'Entendido y cerrar' }
      ]
    });
  }

  /* --------------------------------------------------------------- guardar */

  function save() {
    syncValues();
    var err = valid();
    if (err) { U.toast(err, 'err'); return; }

    var res = N.calc(values);
    var refs = N.refs(values, res.meta);
    var prev = editingId ? Store.getMetab(editingId) : null;

    function commit(nombre) {
      var report = {
        id: editingId || U.uid('met'),
        tipo: 'metabolico',
        nombre: nombre,
        fecha: prev ? prev.fecha : new Date().toISOString(),
        editado: new Date().toISOString(),
        sexo: values.sexo,
        edad: values.edad,
        peso: values.peso,
        talla: values.talla,
        grasa: values.grasa === '' ? null : values.grasa,
        actividad: values.actividad,
        formula: values.formula,
        objetivo: values.objetivo,
        ganarMusculo: !!values.ganarMusculo,
        customMacros: values.customMacros,
        tmb: Math.round(res.tmb),
        tdee: Math.round(res.tdee),
        meta: Math.round(res.meta),
        refs: refs
      };
      if (editingId) {
        Store.updateMetab(report);
        U.toast('Reporte metabólico actualizado');
      } else {
        Store.addMetab(report);
        U.toast('Reporte metabólico guardado en memoria');
      }
      editingId = null;
      U.$('#mb-back', root).style.display = 'none';
      els.state.textContent = 'Nuevo';
      els.state.className = 'badge';
      els.save.innerHTML = U.icon('save', 16) + '<span>Guardar reporte metabólico</span>';
      App.go('reportes');
    }

    if (!values.nombre) {
      U.prompt({
        title: 'Guardar reporte metabólico',
        label: 'Ponle un nombre',
        placeholder: 'Ej. Metas de Ana',
        confirmLabel: 'Guardar'
      }).then(function (n) {
        if (n) commit(n);
      });
    } else {
      commit(values.nombre);
    }
  }

  function reset() {
    values = blankValues();
    editingId = null;
    selectedTargetKey = 'kcal';
    rebalanceWarning = null;
    els.nombre.value = '';
    els.edad.value = values.edad;
    els.peso.value = values.peso;
    els.talla.value = values.talla;
    els.grasa.value = '';
    els.act.value = values.actividad;
    els.formula.value = values.formula;
    els.obj.value = values.objetivo;
    paintSexo();
    paintMusculo();
    els.state.textContent = 'Nuevo';
    els.state.className = 'badge';
    els.save.innerHTML = U.icon('save', 16) + '<span>Guardar reporte metabólico</span>';
    U.$('#mb-back', root).style.display = 'none';
    refresh();
  }

  function edit(report) {
    values = {
      nombre: report.nombre || '',
      sexo: report.sexo || 'F',
      edad: report.edad || 30,
      peso: report.peso || 65,
      talla: report.talla || 165,
      grasa: report.grasa == null ? '' : report.grasa,
      actividad: report.actividad || 'moderado',
      formula: report.formula || 'mifflin',
      objetivo: report.objetivo || 'mantener',
      ganarMusculo: !!report.ganarMusculo,
      customMacros: report.customMacros || null
    };
    editingId = report.id;
    selectedTargetKey = 'kcal';
    rebalanceWarning = null;

    els.nombre.value = values.nombre;
    els.edad.value = values.edad;
    els.peso.value = values.peso;
    els.talla.value = values.talla;
    els.grasa.value = values.grasa;
    els.act.value = values.actividad;
    els.formula.value = values.formula;
    els.obj.value = values.objetivo;
    paintSexo();
    paintMusculo();

    els.state.textContent = 'Editando';
    els.state.className = 'badge amber';
    els.save.innerHTML = U.icon('save', 16) + '<span>Guardar cambios</span>';
    U.$('#mb-back', root).style.display = '';
    refresh();
  }

  window.Metab = {
    init: function () {
      root = U.$('#view-metas');
      build();
    },
    edit: edit,
    reset: reset,
    current: function () { return values; }
  };
})();
