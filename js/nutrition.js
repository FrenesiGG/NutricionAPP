/* ==========================================================================
   nutrition.js — fórmulas, requerimientos diarios y totales.
   ========================================================================== */
(function () {
  'use strict';

  var N = {};

  /* ------------------------------------------------------------ actividad */
  N.ACTIVIDAD = [
    { k: 'sed',     label: 'Sedentario',  hint: 'poco o nada de ejercicio',        f: 1.20 },
    { k: 'ligero',  label: 'Ligero',      hint: '1–3 días por semana',              f: 1.375 },
    { k: 'moderado',label: 'Moderado',    hint: '3–5 días por semana',              f: 1.55 },
    { k: 'alto',    label: 'Alto',        hint: '6–7 días por semana',              f: 1.725 },
    { k: 'muyalto', label: 'Muy alto',    hint: 'trabajo físico + entrenamiento',   f: 1.90 }
  ];

  N.FORMULAS = [
    { k: 'mifflin', label: 'Mifflin-St Jeor' },
    { k: 'harris',  label: 'Harris-Benedict' },
    { k: 'fao',     label: 'FAO/OMS' },
    { k: 'katch',   label: 'Katch-McArdle' }
  ];

  N.OBJETIVOS = [
    { k: 'mantener', label: 'Mantener peso',      f: 1.00, nota: 'sin ajuste' },
    { k: 'perder',   label: 'Déficit moderado',   f: 0.85, nota: '−15 % del TDEE' },
    { k: 'perder2',  label: 'Déficit agresivo',   f: 0.80, nota: '−20 % del TDEE' },
    { k: 'ganar',    label: 'Superávit',          f: 1.10, nota: '+10 % del TDEE' }
  ];

  N.act = function (k) {
    for (var i = 0; i < N.ACTIVIDAD.length; i++) if (N.ACTIVIDAD[i].k === k) return N.ACTIVIDAD[i];
    return N.ACTIVIDAD[0];
  };
  N.obj = function (k) {
    for (var i = 0; i < N.OBJETIVOS.length; i++) if (N.OBJETIVOS[i].k === k) return N.OBJETIVOS[i];
    return N.OBJETIVOS[0];
  };
  N.formulaLabel = function (k) {
    for (var i = 0; i < N.FORMULAS.length; i++) if (N.FORMULAS[i].k === k) return N.FORMULAS[i].label;
    return N.FORMULAS[0].label;
  };

  /* ------------------------------------------------------------ TMB / TDEE */

  function fao(sexo, edad, peso) {
    var a, b;
    if (sexo === 'M') {
      if (edad < 30) { a = 15.057; b = 692.2; }
      else if (edad < 60) { a = 11.472; b = 873.1; }
      else { a = 11.711; b = 587.7; }
    } else {
      if (edad < 30) { a = 14.818; b = 486.6; }
      else if (edad < 60) { a = 8.126; b = 845.6; }
      else { a = 9.082; b = 658.5; }
    }
    return a * peso + b;
  }

  /**
   * @returns {{v:number, nota:string}}
   */
  N.bmr = function (p) {
    var sexo = p.sexo === 'M' ? 'M' : 'F';
    var peso = +p.peso, talla = +p.talla, edad = +p.edad;
    var nota = '';

    var mifflin = 10 * peso + 6.25 * talla - 5 * edad + (sexo === 'M' ? 5 : -161);
    var harris = sexo === 'M'
      ? 88.362 + 13.397 * peso + 4.799 * talla - 5.677 * edad
      : 447.593 + 9.247 * peso + 3.098 * talla - 4.330 * edad;

    var v;
    switch (p.formula) {
      case 'harris': v = harris; break;
      case 'fao': v = fao(sexo, edad, peso); break;
      case 'katch':
        if (p.grasa > 0 && p.grasa < 70) {
          var mlg = peso * (1 - p.grasa / 100);
          v = 370 + 21.6 * mlg;
        } else {
          v = mifflin;
          nota = 'Katch-McArdle necesita % de grasa; se usó Mifflin-St Jeor.';
        }
        break;
      default: v = mifflin;
    }
    return { v: Math.max(0, v), nota: nota };
  };

  N.calc = function (p) {
    var b = N.bmr(p);
    var act = N.act(p.actividad);
    var obj = N.obj(p.objetivo);
    var tdee = b.v * act.f;
    var meta = tdee * obj.f;
    return {
      tmb: b.v,
      tdee: tdee,
      meta: meta,
      actividad: act,
      objetivo: obj,
      nota: b.nota
    };
  };

  /* ------------------------------------------------- requerimientos diarios */

  /**
   * Valores de referencia para adultos. Se ajustan por sexo, edad, peso y objetivo calórico.
   * tipo: 'min' (llegar al 100 % es bueno) | 'max' (no pasarse).
   * @param {{sexo:string, edad:number, peso:number, actividad:string, objetivo:string, ganarMusculo:boolean, customMacros?:object}} p
   * @param {number} kcalTarget
   */
  N.refs = function (p, kcalTarget) {
    p = p || {};
    var M = p.sexo === 'M';
    var edad = +p.edad || 30;
    var peso = +p.peso || 70;
    var kcal = +kcalTarget || 2000;
    var obj = p.objetivo || 'mantener';
    var r = {};

    function put(k, v, tipo, min, max, avg) {
      if (v > 0 || (min > 0 && max > 0)) {
        r[k] = {
          v: v,
          tipo: tipo || 'min',
          min: min != null ? min : v,
          max: max != null ? max : v,
          avg: avg != null ? avg : v
        };
      }
    }

    /* 1. Energía (kcal) con rango fisiológico (±5%) */
    var kcalMin = Math.round(kcal * 0.95);
    var kcalMax = Math.round(kcal * 1.05);
    put('kcal', kcal, 'energia', kcalMin, kcalMax, kcal);

    /* 2. Proteína: varía según objetivo calórico e hipertrofia
       Fuentes oficiales:
       - Posición oficial ISSN (2017)
       - Helms et al. (JISSN 2014) sobre restricción energética y retención de masa magra
       - Morton et al. (BJSM 2018) meta-análisis de ingesta proteica e hipertrofia
       - Schoenfeld & Aragon (2018)
    */
    var pMin, pMax, pAvg;
    if (p.ganarMusculo) {
      if (obj === 'perder2') {
        // Déficit agresivo: 2.3 a 3.1 g/kg (avg 2.6) para prevenir catabolismo
        pMin = peso * 2.3;
        pMax = peso * 3.1;
        pAvg = peso * 2.6;
      } else if (obj === 'perder') {
        // Déficit moderado: 2.0 a 2.6 g/kg (avg 2.3)
        pMin = peso * 2.0;
        pMax = peso * 2.6;
        pAvg = peso * 2.3;
      } else if (obj === 'ganar') {
        // Superávit calórico: 1.6 a 2.0 g/kg (avg 1.8) (el superávit calórico ahorra proteína)
        pMin = peso * 1.6;
        pMax = peso * 2.0;
        pAvg = peso * 1.8;
      } else {
        // Mantenimiento de peso: 1.6 a 2.2 g/kg (avg 1.9)
        pMin = peso * 1.6;
        pMax = peso * 2.2;
        pAvg = peso * 1.9;
      }
    } else {
      // Salud y mantenimiento general (RDA / IOM / OMS)
      var baseAct = 1.0;
      if (p.actividad === 'sed') baseAct = 0.8;
      else if (p.actividad === 'ligero') baseAct = 1.0;
      else if (p.actividad === 'moderado') baseAct = 1.2;
      else if (p.actividad === 'alto') baseAct = 1.4;
      else if (p.actividad === 'muyalto') baseAct = 1.6;

      var defOffset = 0;
      if (obj === 'perder2') defOffset = 0.3;
      else if (obj === 'perder') defOffset = 0.15;

      var effG = baseAct + defOffset;
      pMin = Math.max(45, peso * (effG * 0.85));
      pMax = Math.max(55, peso * (effG * 1.15));
      pAvg = Math.max(50, peso * effG);
    }

    var protVal = Math.round(pAvg);
    var protMin = Math.round(pMin);
    var protMax = Math.round(pMax);
    if (p.customMacros && p.customMacros.protein != null) {
      protVal = Math.max(protMin, Math.min(protMax, Math.round(p.customMacros.protein)));
    }
    put('protein', protVal, 'min', protMin, protMax, Math.round(pAvg));

    /* 3. Grasas: AMDR (IOM / OMS) 20 % a 35 % del valor calórico total */
    var fatMin = Math.round((kcal * 0.20) / 9);
    var fatMax = Math.round((kcal * 0.35) / 9);
    var fatAvg = Math.round((kcal * 0.28) / 9);
    var fatVal = fatAvg;
    if (p.customMacros && p.customMacros.fat != null) {
      fatVal = Math.max(fatMin, Math.min(fatMax, Math.round(p.customMacros.fat)));
    }
    put('fat', fatVal, 'min', fatMin, fatMax, fatAvg);

    /* 4. Carbohidratos: AMDR (IOM / OMS) 45 % a 65 % o equilibrio energético */
    var carbMin = Math.round((kcal * 0.45) / 4);
    var carbMax = Math.round((kcal * 0.65) / 4);
    // Equilibrio con calorías de proteína y grasa
    var calRestante = Math.max(0, kcal - (protVal * 4) - (fatVal * 9));
    var carbAvg = Math.round(calRestante / 4);
    if (carbAvg < carbMin) carbAvg = carbMin;
    if (carbAvg > carbMax) carbAvg = carbMax;
    var carbVal = carbAvg;
    if (p.customMacros && p.customMacros.carb != null) {
      carbVal = Math.max(carbMin, Math.min(carbMax, Math.round(p.customMacros.carb)));
    }
    put('carb', carbVal, 'min', carbMin, carbMax, carbAvg);

    /* Grasas saturadas, trans, azúcares. El colesterol dietético ya no tiene
       tope numérico oficial: las guías 2015–2020 retiraron los 300 mg/día y las
       2025–2030 no fijan un valor. Por eso no se asigna referencia. */
    put('sfa', Math.round(kcal * 0.10 / 9), 'max');
    put('trans', 2, 'max');
    put('sugars', Math.round(kcal * 0.10 / 4), 'max');

    /* 5. Fibra: 14 g por 1000 kcal (rango 14 a 18 g/1000 kcal) */
    var fibMin = Math.round(kcal / 1000 * 14);
    var fibMax = Math.round(kcal / 1000 * 18);
    var fibAvg = fibMin;
    var fibVal = fibAvg;
    if (p.customMacros && p.customMacros.fiber != null) {
      fibVal = Math.max(fibMin, Math.min(fibMax, Math.round(p.customMacros.fiber)));
    }
    put('fiber', fibVal, 'min', fibMin, fibMax, fibAvg);

    /* 6. Agua: 30 a 40 ml/kg base (EFSA) + reposición por actividad física (ACSM) */
    var extraAgua = 0;
    if (p.actividad === 'ligero') extraAgua = 350;
    else if (p.actividad === 'moderado') extraAgua = 700;
    else if (p.actividad === 'alto') extraAgua = 1000;
    else if (p.actividad === 'muyalto') extraAgua = 1300;

    var watMin = Math.max(M ? 2500 : 2000, Math.round((peso * 30 + extraAgua) / 50) * 50);
    var watMax = Math.max(watMin + 800, Math.round((peso * 42 + extraAgua) / 50) * 50);
    var watAvg = Math.max(watMin, Math.round((peso * 35 + extraAgua) / 50) * 50);
    var watVal = watAvg;
    if (p.customMacros && p.customMacros.water != null) {
      watVal = Math.max(watMin, Math.min(watMax, Math.round(p.customMacros.water)));
    }
    put('water', watVal, 'min', watMin, watMax, watAvg);

    /* ácidos grasos esenciales */
    put('la', M ? 17 : 12, 'min');
    put('ala', M ? 1.6 : 1.1, 'min');
    put('n6', M ? 17 : 12, 'min');
    put('n3', M ? 1.6 : 1.1, 'min');

    /* vitaminas */
    put('va', M ? 900 : 700, 'min');
    put('vc', M ? 90 : 75, 'min');
    put('vd', 15, 'min');
    put('ve', 15, 'min');
    put('vk', M ? 120 : 90, 'min');
    put('b1', M ? 1.2 : 1.1, 'min');
    put('b2', M ? 1.3 : 1.1, 'min');
    put('b3', M ? 16 : 14, 'min');
    put('b5', 5, 'min');
    put('b6', edad > 50 ? (M ? 1.7 : 1.5) : 1.3, 'min');
    put('biotin', 30, 'min');
    put('folate', 400, 'min');
    put('b12', 2.4, 'min');
    put('choline', M ? 550 : 425, 'min');

    /* minerales */
    put('ca', 1000 + ((!M && edad > 50) || (M && edad > 70) ? 200 : 0), 'min');
    put('fe', M ? 8 : (edad <= 50 ? 18 : 8), 'min');
    put('mg', M ? 420 : 320, 'min');
    put('p', 700, 'min');
    put('k', M ? 3400 : 2600, 'min');
    put('na', 2300, 'max');
    put('zn', M ? 11 : 8, 'min');
    put('cu', 0.900, 'min');
    put('mn', M ? 2.3 : 1.8, 'min');
    put('se', 55, 'min');
    put('iodine', 150, 'min');
    put('chromium', M ? 35 : 25, 'min');
    put('molybdenum', 45, 'min');
    put('fluoride', M ? 4000 : 3000, 'min');

    /* otros */
    put('caffeine', 400, 'max');

    return r;
  };

  /* ------------------------------------------- Balance Isocalórico de Macros */
  /**
   * Reequilibra los macros manteniendo la meta de energía (kcal) constante.
   * Si no es posible sin romper los límites fisiológicos, ajusta al más cercano y advierte.
   */
  N.rebalanceMacros = function (targetKcal, changedKey, newVal, refs) {
    var pRef = refs.protein, cRef = refs.carb, fRef = refs.fat;
    if (!pRef || !cRef || !fRef) return { refs: refs, warning: null };

    var warning = null;
    var pVal = pRef.v, cVal = cRef.v, fVal = fRef.v;

    if (changedKey === 'protein') {
      var pMin = pRef.min, pMax = pRef.max;
      var pAdj = Math.max(pMin, Math.min(pMax, newVal));
      if (pAdj !== newVal) {
        warning = 'La proteína debe estar dentro de su rango recomendado (' + pMin + ' – ' + pMax + ' g).';
      }
      var calRem = targetKcal - (pAdj * 4);
      var minPossible = (cRef.min * 4) + (fRef.min * 9);
      var maxPossible = (cRef.max * 4) + (fRef.max * 9);

      if (calRem < minPossible) {
        calRem = minPossible;
        pAdj = Math.round((targetKcal - calRem) / 4);
        warning = 'Se ajustó la proteína a ' + pAdj + ' g para no romper la meta energética total de ' + U.n(targetKcal, 0) + ' kcal.';
      } else if (calRem > maxPossible) {
        calRem = maxPossible;
        pAdj = Math.round((targetKcal - calRem) / 4);
        warning = 'Se ajustó la proteína a ' + pAdj + ' g para no romper la meta energética total de ' + U.n(targetKcal, 0) + ' kcal.';
      }

      var cMid = (cRef.min + cRef.max) / 2;
      var fMid = (fRef.min + fRef.max) / 2;
      var totalMidCal = (cMid * 4) + (fMid * 9);
      var ratioC = (cMid * 4) / totalMidCal;

      var cCal = calRem * ratioC;
      var fCal = calRem * (1 - ratioC);
      var cG = Math.round(cCal / 4);
      var fG = Math.round(fCal / 9);

      if (cG < cRef.min) { cG = cRef.min; fG = Math.round((calRem - cG * 4) / 9); }
      else if (cG > cRef.max) { cG = cRef.max; fG = Math.round((calRem - cG * 4) / 9); }

      if (fG < fRef.min) { fG = fRef.min; cG = Math.round((calRem - fG * 9) / 4); }
      else if (fG > fRef.max) { fG = fRef.max; cG = Math.round((calRem - fG * 9) / 4); }

      pVal = pAdj; cVal = cG; fVal = fG;

    } else if (changedKey === 'carb') {
      var cMin = cRef.min, cMax = cRef.max;
      var cAdj = Math.max(cMin, Math.min(cMax, newVal));
      if (cAdj !== newVal) {
        warning = 'Los carbohidratos deben estar dentro de su rango (' + cMin + ' – ' + cMax + ' g).';
      }
      var calRemC = targetKcal - (cAdj * 4);
      var minPossC = (pRef.min * 4) + (fRef.min * 9);
      var maxPossC = (pRef.max * 4) + (fRef.max * 9);

      if (calRemC < minPossC) {
        calRemC = minPossC;
        cAdj = Math.round((targetKcal - calRemC) / 4);
        warning = 'Se ajustaron carbohidratos a ' + cAdj + ' g para no romper la meta energética de ' + U.n(targetKcal, 0) + ' kcal.';
      } else if (calRemC > maxPossC) {
        calRemC = maxPossC;
        cAdj = Math.round((targetKcal - calRemC) / 4);
        warning = 'Se ajustaron carbohidratos a ' + cAdj + ' g para no romper la meta energética de ' + U.n(targetKcal, 0) + ' kcal.';
      }

      var pMidC = (pRef.min + pRef.max) / 2;
      var fMidC = (fRef.min + fRef.max) / 2;
      var totMidC = (pMidC * 4) + (fMidC * 9);
      var ratioP = (pMidC * 4) / totMidC;

      var pG = Math.round((calRemC * ratioP) / 4);
      var fG_c = Math.round((calRemC * (1 - ratioP)) / 9);

      if (pG < pRef.min) { pG = pRef.min; fG_c = Math.round((calRemC - pG * 4) / 9); }
      else if (pG > pRef.max) { pG = pRef.max; fG_c = Math.round((calRemC - pG * 4) / 9); }

      if (fG_c < fRef.min) { fG_c = fRef.min; pG = Math.round((calRemC - fG_c * 9) / 4); }
      else if (fG_c > fRef.max) { fG_c = fRef.max; pG = Math.round((calRemC - fG_c * 9) / 4); }

      cVal = cAdj; pVal = pG; fVal = fG_c;

    } else if (changedKey === 'fat') {
      var fMin = fRef.min, fMax = fRef.max;
      var fAdj = Math.max(fMin, Math.min(fMax, newVal));
      if (fAdj !== newVal) {
        warning = 'Las grasas deben estar dentro de su rango (' + fMin + ' – ' + fMax + ' g).';
      }
      var calRemF = targetKcal - (fAdj * 9);
      var minPossF = (pRef.min * 4) + (cRef.min * 4);
      var maxPossF = (pRef.max * 4) + (cRef.max * 4);

      if (calRemF < minPossF) {
        calRemF = minPossF;
        fAdj = Math.round((targetKcal - calRemF) / 9);
        warning = 'Se ajustaron grasas a ' + fAdj + ' g para no romper la meta energética de ' + U.n(targetKcal, 0) + ' kcal.';
      } else if (calRemF > maxPossF) {
        calRemF = maxPossF;
        fAdj = Math.round((targetKcal - calRemF) / 9);
        warning = 'Se ajustaron grasas a ' + fAdj + ' g para no romper la meta energética de ' + U.n(targetKcal, 0) + ' kcal.';
      }

      var pMidF = (pRef.min + pRef.max) / 2;
      var cMidF = (cRef.min + cRef.max) / 2;
      var totMidF = (pMidF * 4) + (cMidF * 4);
      var ratioPF = (pMidF * 4) / totMidF;

      var pG_f = Math.round((calRemF * ratioPF) / 4);
      var cG_f = Math.round((calRemF * (1 - ratioPF)) / 4);

      if (pG_f < pRef.min) { pG_f = pRef.min; cG_f = Math.round((calRemF - pG_f * 4) / 4); }
      else if (pG_f > pRef.max) { pG_f = pRef.max; cG_f = Math.round((calRemF - pG_f * 4) / 4); }

      if (cG_f < cRef.min) { cG_f = cRef.min; pG_f = Math.round((calRemF - cG_f * 4) / 4); }
      else if (cG_f > cRef.max) { cG_f = cRef.max; pG_f = Math.round((calRemF - cG_f * 4) / 4); }

      fVal = fAdj; pVal = pG_f; cVal = cG_f;
    }

    return {
      protein: pVal,
      carb: cVal,
      fat: fVal,
      warning: warning
    };
  };

  /* ------------------------------ Límites máximos seguros tolerables (UL) */
  N.UL = {
    protein: { limit: 3.5, perKg: true, unit: 'g/kg', label: 'Proteína total', source: 'EFSA / ISSN', risk: 'Sobrecarga de filtración renal o desbalance digestivo con ingestas crónicas excesivas.' },
    fiber: { limit: 70, unit: 'g', label: 'Fibra dietética', source: 'IOM / EFSA', risk: 'Malabsorción de minerales (hierro, zinc, calcio) y meteorismo gastrointestinal severo.' },
    water: { limit: 6000, unit: 'ml', label: 'Agua / Líquidos', source: 'EFSA / ACSM', risk: 'Hiponatremia dilucional (intoxicación por agua).' },
    sfa: { limitPct: 10, unit: '% kcal', label: 'Grasas saturadas', source: 'OMS / FAO', risk: 'Incremento del colesterol LDL y riesgo aterosclerótico cardiovascular.' },
    trans: { limit: 2, unit: 'g', label: 'Grasas trans', source: 'OMS', risk: 'Inflamación endotelial, elevación de LDL y reducción de HDL.' },
    cholesterol: {
      noUl: true,
      unit: 'mg',
      label: 'Colesterol dietético',
      source: 'NASEM/IOM · DGA 2015–2020 y 2025–2030',
      risk: ''
    },
    sugars: { limitPct: 10, unit: '% kcal', label: 'Azúcares libres/añadidos', source: 'OMS', risk: 'Caries dental, resistencia a la insulina y esteatosis hepática.' },
    va: { limit: 3000, unit: 'µg', label: 'Vitamina A (retinol preformado)', source: 'IOM (DRI) / EFSA', risk: 'Hepatotoxicidad, alteraciones óseas y teratogénesis (en embarazo).' },
    retinol: { limit: 3000, unit: 'µg', label: 'Vitamina A preformada (retinol)', source: 'IOM (DRI) / EFSA', risk: 'Hepatotoxicidad, alteraciones óseas y teratogénesis (en embarazo).' },
    vc: { limit: 2000, unit: 'mg', label: 'Vitamina C', source: 'IOM (DRI)', risk: 'Trastornos gastrointestinales osmóticos y aumento del riesgo de litiasis renal (oxalato).' },
    vd: { limit: 100, unit: 'µg', label: 'Vitamina D (4,000 UI)', source: 'IOM (DRI) / Endocrine Society', risk: 'Hipercalcemia, calcificación de tejidos blandos y nefrocalcinosis.' },
    ve: { limit: 1000, unit: 'mg', label: 'Vitamina E (α-tocoferol)', source: 'IOM (DRI)', risk: 'Efecto antiagregante plaquetario excesivo y riesgo hemorrágico.' },
    b3: {
      limit: 35,
      unit: 'mg',
      displayLimit: '35 mg/día',
      noAutoStatus: true,
      label: 'Niacina (Vitamina B3)',
      source: 'IOM (DRI)',
      risk: 'Rubefacción cutánea (flushing), hepatotoxicidad e hipotensión.',
      note: 'Este UL de 35 mg/día aplica solo a la niacina sintética de suplementos y ' +
        'alimentos fortificados. La niacina natural presente en carnes, pescados, ' +
        'cereales integrales y otras fuentes alimentarias no se asocia a estos efectos ' +
        'adversos, por lo que este UL no colorea la barra ni genera alertas.'
    },
    b6: { limit: 100, unit: 'mg', label: 'Vitamina B6 (piridoxina)', source: 'IOM (DRI) / EFSA', risk: 'Neuropatía sensorial periférica con consumo prolongado de altas dosis.' },
    folate: { limit: 1000, unit: 'µg', label: 'Folato / Ácido fólico', source: 'IOM (DRI)', risk: 'Enmascaramiento de la anemia megaloblástica por deficiencia de vitamina B12.' },
    choline: { limit: 3500, unit: 'mg', label: 'Colina', source: 'IOM (DRI)', risk: 'Olor corporal a pescado (trimetilaminuria), hipotensión y hepatotoxicidad.' },
    ca: { limit: 2500, unit: 'mg', label: 'Calcio', source: 'IOM (DRI)', risk: 'Síndrome de leche-alcalinos, calcificación vascular y cálculos renales.' },
    fe: { limit: 45, unit: 'mg', label: 'Hierro', source: 'IOM (DRI)', risk: 'Trastornos gastrointestinales severos, toxicidad celular por radicales libres y hemocromatosis secundaria.' },
    mg: {
      limit: 350,
      unit: 'mg',
      displayLimit: '350 mg/día (solo suplementos)',
      noAutoStatus: true,
      label: 'Magnesio (suplementos)',
      source: 'IOM (DRI)',
      risk: 'Diarrea osmótica, hipotensión y arritmias con dosis altas de suplementos.',
      note: 'El UL de 350 mg/día aplica únicamente al magnesio de suplementos y medicamentos; ' +
        'el magnesio de los alimentos no se asocia a efectos adversos en personas con función renal normal.'
    },
    p: { limit: 4000, unit: 'mg', label: 'Fósforo', source: 'IOM (DRI)', risk: 'Hiperfosfatemia, hiperparatiroidismo secundario y calcificación ectópica.' },
    na: { limit: 2300, unit: 'mg', label: 'Sodio', source: 'IOM / OMS', risk: 'Hipertensión arterial sistémica, retención de líquidos y daño vascular.' },
    zn: { limit: 40, unit: 'mg', label: 'Zinc', source: 'IOM (DRI)', risk: 'Inhibición de la absorción de cobre, neutropenia y alteración del perfil lipídico.' },
    cu: { limit: 10, unit: 'mg', label: 'Cobre', source: 'IOM (DRI)', risk: 'Daño hepático celular y malestar gastrointestinal agudo.' },
    mn: { limit: 11, unit: 'mg', label: 'Manganeso', source: 'IOM (DRI)', risk: 'Neurotoxicidad similar al parkinsonismo con exposición acumulativa alta.' },
    molybdenum: { limit: 2000, unit: 'µg', label: 'Molibdeno', source: 'IOM (DRI)', risk: 'Efectos reproductivos en estudios animales y síntomas similares a la gota con exposiciones muy altas.' },
    se: { limit: 400, unit: 'µg', label: 'Selenio', source: 'IOM (DRI)', risk: 'Selenosis (fragilidad y pérdida de cabello y uñas, aliento a ajo y neuropatía).' },
    iodine: { limit: 1100, unit: 'µg', label: 'Yodo', source: 'IOM (DRI)', risk: 'Disfunción tiroidea (hipotiroidismo inducido por efecto Wolff-Chaikoff o tiroiditis).' },
    fluoride: {
      limit: 10000,
      unit: 'µg',
      displayLimit: '10 mg/día (10,000 µg)',
      label: 'Flúor',
      source: 'IOM (DRI)',
      risk: 'Fluorosis esquelética y moteado dental.',
      note: 'El UL de 10 mg/día corresponde a 10,000 µg (la base guarda el flúor en µg). ' +
        'La EFSA fija un UL más estricto de 5 mg/día para adultos; se cita como referencia.'
    },
    caffeine: { limit: 400, unit: 'mg', label: 'Cafeína', source: 'EFSA / FDA', risk: 'Ansiedad, taquicardia, insomnio y elevación transitoria de presión arterial.' }
  };

  /* ---------------------- Riesgos por déficit y por exceso (v2.1)
     Cada entrada cita la fuente que respalda el riesgo. Solo se describen
     riesgos documentados por organismos de referencia (NASEM/IOM, OMS/FAO,
     EFSA, ACSM); cuando no existe un síndrome carencial o un UL oficial se
     indica expresamente en lugar de inventar una cifra. */

  N.DEFICIT = {
    water: {
      text: 'Deshidratación: cefalea, fatiga, deterioro de la atención y de la función física; en casos graves, insuficiencia renal y shock.',
      source: 'EFSA (2010, Scientific Opinion on Dietary Reference Values for water) y ACSM.'
    },
    kcal: {
      text: 'Pérdida de peso involuntaria, fatiga, pérdida de masa muscular y mayor riesgo de deficiencias de micronutrientes cuando la ingesta es insuficiente de forma sostenida.',
      source: 'FAO/OMS/UNU (2004, Human Energy Requirements).'
    },
    protein: {
      text: 'Pérdida progresiva de masa muscular, edema por hipoalbuminemia, retraso en la cicatrización y mayor susceptibilidad a infecciones.',
      source: 'OMS/FAO/UNU (2007, Protein and Amino Acid Requirements in Human Nutrition).'
    },
    fat: {
      text: 'La ingesta insuficiente de grasa compromete la absorción de vitaminas liposolubles (A, D, E y K) y el aporte de ácidos grasos esenciales.',
      source: 'NASEM/IOM (2005, AMDR) y OMS/FAO (2010, Fats and Fatty Acids in Human Nutrition).'
    },
    sfa: {
      text: 'No existe un requerimiento mínimo: el organismo sintetiza ácidos grasos saturados. La referencia es un límite superior, no una meta que haya que alcanzar.',
      source: 'OMS/FAO (2010) y OMS (2018, REPLACE).'
    },
    mufa: {
      text: 'No hay un requerimiento específico. La recomendación es sustituir grasas saturadas por insaturadas sin aumentar la grasa total.',
      source: 'OMS/FAO (2010) y NASEM/IOM (2005).'
    },
    pufa: {
      text: 'El déficit de ácidos grasos esenciales (linoleico y α-linolénico) causa dermatitis, mala cicatrización y alteraciones visuales y neurológicas.',
      source: 'NASEM/IOM (2005) y EFSA (2010).'
    },
    insat: {
      text: 'No hay un requerimiento específico. La recomendación es sustituir grasas saturadas por insaturadas sin aumentar la grasa total.',
      source: 'OMS/FAO (2010) y NASEM/IOM (2005).'
    },
    trans: {
      text: 'No existe requerimiento; la OMS recomienda que su aporte sea lo más bajo posible (< 1 % de la energía).',
      source: 'OMS (2018, REPLACE) y OMS/FAO (2010).'
    },
    cholesterol: {
      text: 'No es un nutriente esencial: el hígado lo sintetiza y no se ha descrito un síndrome carencial por su ausencia en la dieta.',
      source: 'NASEM/IOM (2005) y Dietary Guidelines for Americans 2025–2030.'
    },
    carb: {
      text: 'El IOM establece una RDA de 130 g/día de glucosa para el cerebro; ingestas muy bajas pueden causar fatiga y cefalea.',
      source: 'NASEM/IOM (2005, Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids).'
    },
    sugars: {
      text: 'No hay requerimiento de azúcares libres o añadidos; los hidratos de carbono pueden cubrirse con almidón y fibra.',
      source: 'OMS (2015, Guideline: Sugars Intake for Adults and Children) y NASEM/IOM (2005).'
    },
    fiber: {
      text: 'Estreñimiento, menor diversidad de la microbiota intestinal y mayor riesgo de enfermedad diverticular y cardiovascular.',
      source: 'NASEM/IOM (2005) y OMS (2003, Diet, Nutrition and the Prevention of Chronic Diseases).'
    },
    starch: {
      text: 'No hay un requerimiento específico; la glucosa puede obtenerse de otros carbohidratos.',
      source: 'NASEM/IOM (2005).'
    },
    ash: {
      text: 'No aplica: las cenizas son el residuo mineral total, no un nutriente del que pueda haber déficit.',
      source: 'AOAC International (métodos de composición de alimentos).'
    },
    la: {
      text: 'Dermatitis, pérdida de cabello, mala cicatrización y mayor susceptibilidad a infecciones por deficiencia de ácidos grasos esenciales.',
      source: 'NASEM/IOM (2005) y OMS/FAO (2010).'
    },
    ala: {
      text: 'Alteraciones visuales y neurológicas, sequedad de la piel y dermatitis por deficiencia de ácidos grasos esenciales.',
      source: 'EFSA (2010) y NASEM/IOM (2005).'
    },
    epa: {
      text: 'No tiene un requerimiento individual establecido; el ALA puede convertirse en EPA, aunque con baja eficiencia.',
      source: 'EFSA (2010) y NASEM/IOM (2005).'
    },
    dha: {
      text: 'No tiene un requerimiento individual establecido; el ALA puede convertirse en DHA, aunque con baja eficiencia.',
      source: 'EFSA (2010) y NASEM/IOM (2005).'
    },
    dpa: {
      text: 'No tiene requerimiento establecido; es un intermediario del metabolismo de los omega-3.',
      source: 'EFSA (2010).'
    },
    ara: {
      text: 'No tiene requerimiento establecido; el organismo lo sintetiza a partir del ácido linoleico.',
      source: 'NASEM/IOM (2005).'
    },
    n3: {
      text: 'El déficit de omega-3 se manifiesta como alteraciones visuales y neurológicas y dermatitis.',
      source: 'EFSA (2010) y NASEM/IOM (2005).'
    },
    n6: {
      text: 'El déficit de omega-6 causa dermatitis y mala cicatrización por deficiencia de ácidos grasos esenciales.',
      source: 'NASEM/IOM (2005).'
    },
    ratio: {
      text: 'No aplica: es un indicador calculado, no un nutriente; no tiene requerimiento ni síndrome carencial.',
      source: 'NASEM/IOM (2005) y EFSA (2010).'
    },
    va: {
      text: 'Ceguera nocturna, xeroftalmia, queratinización de los epitelios y mayor mortalidad por infecciones.',
      source: 'OMS (2009, Global Prevalence of Vitamin A Deficiency) y NASEM/IOM (2001).'
    },
    retinol: {
      text: 'Al ser la forma preformada de la vitamina A, su déficit produce las mismas manifestaciones que la deficiencia de vitamina A.',
      source: 'NASEM/IOM (2001) y OMS (2009).'
    },
    beta_car: {
      text: 'Es provitamina A; su falta no causa deficiencia si el aporte de retinol o de vitamina A preformada es suficiente.',
      source: 'NASEM/IOM (2001).'
    },
    alpha_car: {
      text: 'Es provitamina A; su falta no causa deficiencia si el aporte de retinol o de vitamina A preformada es suficiente.',
      source: 'NASEM/IOM (2001).'
    },
    beta_cryp: {
      text: 'Es provitamina A; su falta no causa deficiencia si el aporte de retinol o de vitamina A preformada es suficiente.',
      source: 'NASEM/IOM (2001).'
    },
    lycopene: {
      text: 'No es un nutriente esencial; no se ha descrito un síndrome carencial.',
      source: 'NASEM/IOM (2000, Dietary Reference Intakes for Vitamin C, Vitamin E, Selenium, and Carotenoids).'
    },
    lutein: {
      text: 'No es un nutriente esencial; no se ha establecido un requerimiento ni un síndrome carencial.',
      source: 'NASEM/IOM (2000).'
    },
    vc: {
      text: 'Escorbuto: sangrado de encías, petequias, mala cicatrización, fatiga y anemia.',
      source: 'NASEM/IOM (2000) y OMS/FAO (2004, Vitamin and Mineral Requirements in Human Nutrition).'
    },
    vd: {
      text: 'Raquitismo en niños, osteomalacia y pérdida de masa ósea en adultos; debilidad muscular.',
      source: 'NASEM/IOM (2011) y Endocrine Society (2011).'
    },
    ve: {
      text: 'Anemia hemolítica, neuropatía periférica y degeneración retiniana (deficiencia rara, casi siempre por malabsorción).',
      source: 'NASEM/IOM (2000).'
    },
    vk: {
      text: 'Alteración de la coagulación con tendencia a hemorragias y menor mineralización ósea.',
      source: 'NASEM/IOM (2001).'
    },
    b1: {
      text: 'Beriberi (neuropatía e insuficiencia cardíaca) y síndrome de Wernicke-Korsakoff en el alcoholismo.',
      source: 'NASEM/IOM (1998) y OMS/FAO (2004).'
    },
    b2: {
      text: 'Queilosis, estomatitis angular, dermatitis seborreica y anemia.',
      source: 'NASEM/IOM (1998).'
    },
    b3: {
      text: 'Pelagra: dermatitis, diarrea y demencia; riesgo con dietas monótonas a base de maíz no nixtamalizado.',
      source: 'NASEM/IOM (1998) y OMS/FAO (2004).'
    },
    b5: {
      text: 'Deficiencia rara: fatiga, parestesias, calambres y molestias digestivas.',
      source: 'NASEM/IOM (1998).'
    },
    b6: {
      text: 'Dermatitis seborreica, glositis, anemia y convulsiones en lactantes.',
      source: 'NASEM/IOM (1998).'
    },
    biotin: {
      text: 'Deficiencia rara: dermatitis, alopecia y alteraciones neurológicas.',
      source: 'NASEM/IOM (1998).'
    },
    folate: {
      text: 'Anemia megaloblástica y defectos del tubo neural en el embarazo.',
      source: 'NASEM/IOM (1998) y OMS/FAO (2004).'
    },
    b12: {
      text: 'Anemia megaloblástica y degeneración neurológica (neuropatía y deterioro cognitivo).',
      source: 'NASEM/IOM (1998) y OMS/FAO (2004).'
    },
    choline: {
      text: 'No se ha documentado un síndrome carencial claro en adultos sanos; en estudios experimentales el déficit se asocia a daño hepático y muscular.',
      source: 'NASEM/IOM (1998).'
    },
    betaine: {
      text: 'No se ha establecido un requerimiento ni un síndrome carencial; el organismo lo sintetiza y puede obtenerse de la colina.',
      source: 'NASEM/IOM (DRI) y EFSA.'
    },
    ca: {
      text: 'Osteoporosis y mayor riesgo de fracturas; tetania y raquitismo en casos graves.',
      source: 'NASEM/IOM (2011) y OMS/FAO (2004).'
    },
    fe: {
      text: 'Anemia ferropénica: fatiga, palidez y menor capacidad física y cognitiva.',
      source: 'NASEM/IOM (2001) y OMS/FAO (2004).'
    },
    mg: {
      text: 'Debilidad muscular, calambres, arritmias e hipocalcemia en el déficit grave.',
      source: 'NASEM/IOM (1997).'
    },
    p: {
      text: 'Debilidad muscular, dolor óseo y raquitismo u osteomalacia (deficiencia rara).',
      source: 'NASEM/IOM (1997).'
    },
    k: {
      text: 'Hipopotasemia: debilidad muscular, arritmias, estreñimiento e íleo.',
      source: 'NASEM/IOM (2005) y OMS/FAO (2004).'
    },
    na: {
      text: 'En pérdidas excesivas (sudoración intensa, vómitos, diarrea) puede causar hiponatremia: cefalea, confusión, convulsiones y coma.',
      source: 'NASEM/IOM (2005) y OMS/FAO (2004).'
    },
    zn: {
      text: 'Retraso del crecimiento, pérdida de apetito, dermatitis, alteraciones inmunitarias y de la cicatrización.',
      source: 'NASEM/IOM (2001) y OMS/FAO (2004).'
    },
    cu: {
      text: 'Anemia, neutropenia y alteraciones óseas y neurológicas (deficiencia rara).',
      source: 'NASEM/IOM (2001).'
    },
    mn: {
      text: 'No se ha descrito un síndrome carencial en humanos; su esencialidad en la dieta no está bien establecida.',
      source: 'NASEM/IOM (2001).'
    },
    se: {
      text: 'Enfermedad de Keshan (cardiomiopatía) y enfermedad de Kashin-Beck (osteocondropatía).',
      source: 'OMS/FAO (2004) y NASEM/IOM (2000).'
    },
    iodine: {
      text: 'Bocio, hipotiroidismo y alteraciones del desarrollo neurológico (cretinismo).',
      source: 'OMS (2007, Assessment of Iodine Deficiency Disorders) y NASEM/IOM (2001).'
    },
    chromium: {
      text: 'No se ha confirmado un síndrome carencial en humanos; su esencialidad es discutida.',
      source: 'NASEM/IOM (2001) y EFSA (2014).'
    },
    molybdenum: {
      text: 'No se ha observado deficiencia en poblaciones sanas; se han descrito casos aislados con alteraciones neurológicas en nutrición parenteral prolongada.',
      source: 'NASEM/IOM (2001).'
    },
    fluoride: {
      text: 'No es esencial para la vida, pero su ingesta insuficiente se asocia a mayor caries dental.',
      source: 'NASEM/IOM (1997) y OMS (2017, Guidelines for Drinking-water Quality).'
    },
    phytosterols: {
      text: 'No son nutrientes esenciales; no se ha establecido un requerimiento ni un síndrome carencial.',
      source: 'EFSA (2012) y NASEM/IOM (2000).'
    },
    beta_sito: {
      text: 'No es un nutriente esencial; no se ha establecido un requerimiento ni un síndrome carencial.',
      source: 'EFSA (2012) y NASEM/IOM (2000).'
    },
    caffeine: {
      text: 'No es un nutriente esencial; no hay requerimiento. La supresión brusca en consumidores habituales puede causar cefalea y somnolencia.',
      source: 'EFSA (2015, Scientific Opinion on the Safety of Caffeine).'
    },
    theobromine: {
      text: 'No es un nutriente esencial; no se ha establecido un requerimiento ni un síndrome carencial.',
      source: 'NASEM/IOM (DRI) y EFSA.'
    }
  };

  /* Riesgos por exceso que no forman parte de N.UL (sin UL oficial o con
     referencia distinta al UL). Los nutrientes con UL usan N.UL.risk. */
  N.EXCESS = {
    kcal: {
      text: 'Balance energético positivo: ganancia de peso, obesidad y mayor riesgo cardiometabólico.',
      source: 'OMS/FAO (2004) y OMS (2020, Obesity and Overweight).'
    },
    fat: {
      text: 'El exceso de grasa total favorece el balance energético positivo; el riesgo depende sobre todo del tipo de grasa (saturada y trans).',
      source: 'OMS/FAO (2010).'
    },
    carb: {
      text: 'El exceso de carbohidratos refinados y azúcares añadidos se asocia a obesidad, caries y resistencia a la insulina.',
      source: 'OMS (2015) y NASEM/IOM (2005).'
    },
    mufa: {
      text: 'No tiene UL. Un aporte elevado contribuye al exceso calórico, aunque sustituir saturadas por monoinsaturadas es favorable.',
      source: 'OMS/FAO (2010).'
    },
    pufa: {
      text: 'No tiene UL. El aporte debe mantenerse dentro del AMDR: 5–10 % de la energía para omega-6 y 0.6–1.2 % para omega-3.',
      source: 'NASEM/IOM (2005).'
    },
    insat: {
      text: 'No tiene UL. Un aporte elevado contribuye al exceso calórico, aunque sustituir saturadas por insaturadas es favorable.',
      source: 'OMS/FAO (2010).'
    },
    la: {
      text: 'No tiene UL. El AMDR de omega-6 es 5–10 % de la energía; por encima no hay beneficio adicional establecido.',
      source: 'NASEM/IOM (2005).'
    },
    ala: {
      text: 'No tiene UL. El AMDR de omega-3 es 0.6–1.2 % de la energía; el exceso no aporta beneficio adicional establecido.',
      source: 'NASEM/IOM (2005) y EFSA (2010).'
    },
    epa: {
      text: 'La EFSA considera seguras hasta 5 g/día de EPA + DHA combinados en adultos; por encima no hay beneficio establecido y puede aumentar el riesgo de sangrado.',
      source: 'EFSA (2012, Scientific Opinion on the Tolerable Upper Intake Level of EPA and DHA).'
    },
    dha: {
      text: 'La EFSA considera seguras hasta 5 g/día de EPA + DHA combinados en adultos; por encima no hay beneficio establecido y puede aumentar el riesgo de sangrado.',
      source: 'EFSA (2012, Scientific Opinion on the Tolerable Upper Intake Level of EPA and DHA).'
    },
    dpa: {
      text: 'No tiene UL establecido; es un intermediario del metabolismo de los omega-3.',
      source: 'EFSA (2012).'
    },
    ara: {
      text: 'No tiene UL establecido; se sintetiza a partir del ácido linoleico.',
      source: 'NASEM/IOM (2005).'
    },
    n3: {
      text: 'No tiene UL. El AMDR de omega-3 es 0.6–1.2 % de la energía; el exceso no aporta beneficio adicional establecido.',
      source: 'NASEM/IOM (2005) y EFSA (2010).'
    },
    n6: {
      text: 'No tiene UL. El AMDR de omega-6 es 5–10 % de la energía; por encima no hay beneficio adicional establecido.',
      source: 'NASEM/IOM (2005).'
    },
    ratio: {
      text: 'No aplica: es un indicador calculado, no un nutriente. No tiene UL.',
      source: 'NASEM/IOM (2005).'
    },
    starch: {
      text: 'No tiene UL. El exceso de almidón refinado eleva la carga glucémica y desplaza alimentos ricos en fibra.',
      source: 'NASEM/IOM (2005) y OMS (2015).'
    },
    ash: {
      text: 'No aplica: es un residuo mineral, no un nutriente con límite de ingesta.',
      source: 'AOAC International (métodos de composición de alimentos).'
    },
    beta_car: {
      text: 'Los suplementos de β-caroteno en dosis altas se asociaron a mayor riesgo de cáncer de pulmón en fumadores (estudios ATBC y CARET). Los alimentos ricos en β-caroteno no muestran ese riesgo; el exceso dietético solo causa carotenodermia benigna.',
      source: 'NIH Office of Dietary Supplements (Vitamin A) y NASEM/IOM (2000).'
    },
    alpha_car: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (2000).'
    },
    beta_cryp: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (2000).'
    },
    lycopene: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (2000).'
    },
    lutein: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (2000).'
    },
    vk: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (2001).'
    },
    b1: {
      text: 'No se ha establecido un UL; el exceso se elimina por la orina y no se han descrito efectos adversos.',
      source: 'NASEM/IOM (1998).'
    },
    b2: {
      text: 'No se ha establecido un UL; la absorción está limitada y el exceso se excreta por la orina.',
      source: 'NASEM/IOM (1998).'
    },
    b5: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (1998).'
    },
    biotin: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (1998).'
    },
    b12: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (1998).'
    },
    betaine: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética.',
      source: 'NASEM/IOM (DRI) y EFSA.'
    },
    k: {
      text: 'No se ha establecido un UL; no se han descrito efectos adversos por su ingesta dietética en personas sanas.',
      source: 'NASEM/IOM (2005).'
    },
    chromium: {
      text: 'No se ha establecido un UL. Las dosis farmacológicas de suplementos no han demostrado beneficio y deben vigilarse.',
      source: 'NASEM/IOM (2001).'
    },
    cholesterol: {
      text: 'No hay UL oficial: las guías 2015–2020 retiraron el tope de 300 mg/día y las 2025–2030 no fijan una cifra; se recomienda limitar las grasas saturadas a <10 % de las kcal. En prevención cardiovascular de alto riesgo se cita <200 mg/día, pero es una referencia clínica, no un UL poblacional.',
      source: 'Dietary Guidelines for Americans 2015–2020 y 2025–2030; NASEM/IOM.'
    },
    phytosterols: {
      text: 'No hay UL. La EFSA considera que 1.5–3 g/día de fitosteroles/estanoles reducen el LDL; dosis mayores pueden disminuir la absorción de carotenoides.',
      source: 'EFSA (2012, Scientific Opinion on the Substantiation of a Health Claim Related to Plant Sterols/Stanols).'
    },
    beta_sito: {
      text: 'No hay UL. La EFSA considera que 1.5–3 g/día de fitosteroles/estanoles reducen el LDL; dosis mayores pueden disminuir la absorción de carotenoides.',
      source: 'EFSA (2012).'
    },
    theobromine: {
      text: 'No hay UL oficial establecido para la teobromina.',
      source: 'EFSA (2015) y NASEM/IOM.'
    }
  };

  /* ------------------- Rangos aceptables de distribución de macros (AMDR) */
  N.AMDR = {
    protein: {
      label: 'Proteína',
      iom: [10, 35],
      who: [10, 15],
      sourceIom: 'IOM/NASEM (AMDR)',
      sourceWho: 'WHO/FAO'
    },
    fat: {
      label: 'Grasas',
      iom: [20, 35],
      who: [15, 30],
      sourceIom: 'IOM/NASEM (AMDR)',
      sourceWho: 'WHO/FAO'
    },
    carb: {
      label: 'Carbohidratos',
      iom: [45, 65],
      who: [55, 75],
      sourceIom: 'IOM/NASEM (AMDR)',
      sourceWho: 'WHO/FAO'
    }
  };

  /**
   * Determina si el valor actual está cerca del límite máximo tolerable (UL).
   * @returns {{ status: 'danger'|'warn'|'ok'|'none', limit: number, ratio: number, info: object }}
   */
  N.getUlStatus = function (k, val, userWeight, userKcal) {
    var ul = N.UL[k];
    if (!ul || ul.noUl) return { status: 'none', limit: null, info: ul || null };
    var limit = ul.limit;
    if (ul.perKg && userWeight) limit = ul.limit * userWeight;
    if (ul.limitPct && userKcal) {
      var cFactor = (k === 'sfa' || k === 'fat') ? 9 : 4;
      limit = (userKcal * (ul.limitPct / 100)) / cFactor;
    }
    if (!limit) return { status: 'none', limit: null, info: ul };

    var ratio = val / limit;
    /* UL de referencia (p. ej. niacina sintética): se informa, no se alerta. */
    if (ul.noAutoStatus) {
      return { status: 'none', limit: limit, ratio: ratio, info: ul };
    }
    if (ratio >= 1.0) {
      return { status: 'danger', limit: limit, ratio: ratio, info: ul };
    } else if (ratio >= 0.85) {
      return { status: 'warn', limit: limit, ratio: ratio, info: ul };
    }
    return { status: 'ok', limit: limit, ratio: ratio, info: ul };
  };

  /**
   * Genera la información para la burbuja flotante al pasar el cursor (hover) por un nutriente.
   */
  N.nutrientBubbleInfo = function (k, totVal, refs, userMeta) {
    var c = (window.DBX && DBX.cols) ? DBX.cols().filter(function (x) { return x.k === k; })[0] : null;
    var name = c ? c.label : k;
    var unit = c ? c.unidad : '';
    var r = refs ? refs[k] : null;
    var weight = userMeta ? (+userMeta.peso || 70) : 70;
    var kcal = userMeta ? (+userMeta.meta || +userMeta.tdee || 2000) : 2000;
    var ulStatus = N.getUlStatus(k, totVal || 0, weight, kcal);

    var howText = '';
    var sourceText = '';

    if (k === 'kcal') {
      howText = 'Basado en tu TMB, factor de actividad (' + (userMeta ? userMeta.actividad : 'moderado') +
        ') y objetivo calórico.';
      sourceText = 'Academia Nacional de Medicina de EE. UU. (NAM/IOM) y FAO/OMS/UNU.';
    } else if (k === 'protein') {
      var isHiper = userMeta ? !!userMeta.ganarMusculo : false;
      var obj = userMeta ? (userMeta.objetivo || 'mantener') : 'mantener';
      if (isHiper) {
        if (obj === 'perder2') howText = 'Hipertrofia en déficit agresivo: 2.3 a 3.1 g/kg (avg 2.6 g/kg) para preservar masa magra frente a la restricción energética intensa.';
        else if (obj === 'perder') howText = 'Hipertrofia en déficit moderado: 2.0 a 2.6 g/kg (avg 2.3 g/kg) para prevenir el catabolismo proteico durante la pérdida de grasa.';
        else if (obj === 'ganar') howText = 'Hipertrofia en superávit: 1.6 a 2.0 g/kg (avg 1.8 g/kg). La abundancia calórica y de carbohidratos optimiza el aprovechamiento proteico.';
        else howText = 'Hipertrofia en mantenimiento: 1.6 a 2.2 g/kg (avg 1.9 g/kg) para maximizar la síntesis proteica muscular.';
        sourceText = 'International Society of Sports Nutrition (ISSN Position Stand, 2017), Helms et al. (JISSN 2014) y Morton et al. (BJSM 2018).';
      } else {
        howText = 'Mantenimiento y salud general: Ingesta ajustada por nivel de actividad física (0.8–1.6 g/kg) con ajuste preventivo de pérdida de masa si hay déficit.';
        sourceText = 'Dietary Reference Intakes (DRI / RDA) del Institute of Medicine (IOM) y OMS.';
      }
    } else if (k === 'carb') {
      howText = 'Rango Aceptable de Distribución de Macronutrientes (AMDR): 45 % a 65 % del gasto calórico total diario.';
      sourceText = 'Institute of Medicine (IOM / NASEM) y directrices OMS/FAO.';
    } else if (k === 'fat') {
      howText = 'Rango Aceptable de Distribución de Macronutrientes (AMDR): 20 % a 35 % de la energía total proveniente de lípidos.';
      sourceText = 'Institute of Medicine (IOM / NASEM) y guías OMS/FAO.';
    } else if (k === 'fiber') {
      howText = '14 g de fibra dietética por cada 1,000 kcal consumidas (mínimo de 25 a 38 g/día).';
      sourceText = 'USDA / HHS Dietary Guidelines for Americans e Institute of Medicine.';
    } else if (k === 'water') {
      howText = '30 a 40 ml/kg de peso corporal base (EFSA) más reposición hídrica por sudoración en actividad física (ACSM).';
      sourceText = 'Autoridad Europea de Seguridad Alimentaria (EFSA, 2010) y American College of Sports Medicine (ACSM).';
    } else if (k === 'sfa' || k === 'sugars') {
      howText = 'Límite máximo de salud: no superar el 10 % del valor calórico diario.';
      sourceText = 'Organización Mundial de la Salud (OMS / WHO Guidelines).';
    } else if (k === 'trans') {
      howText = 'Límite máximo recomendado: menos del 1 % de la energía (< 2 g/día).';
      sourceText = 'Organización Mundial de la Salud (OMS / Eliminación global de grasas trans).';
    } else if (k === 'cholesterol') {
      howText = 'Sin tope numérico oficial: el foco está en limitar las grasas saturadas a menos del 10 % de las kcal.';
      sourceText = 'Dietary Guidelines for Americans 2015–2020 y 2025–2030; National Academy of Medicine (IOM / NASEM).';
    } else if (c && c.sec === 'vit') {
      howText = 'Ingesta Diaria Recomendada (RDA/AI) para adultos según sexo biológico y grupo de edad.';
      sourceText = 'National Academy of Medicine (IOM / NASEM) Dietary Reference Intakes (DRI).';
    } else if (c && c.sec === 'min') {
      howText = 'Requerimiento nutricional diario esencial (RDA/AI) ajustado por sexo y edad biológica.';
      sourceText = 'Institute of Medicine (IOM / NASEM) y FAO/OMS sobre minerales en la nutrición.';
    } else {
      howText = c ? c.desc : 'Requerimiento de referencia nutricional.';
      sourceText = 'Composición de alimentos mexicana y estándares internacionales FAO/OMS.';
    }

    var ulText = '';
    var ulRisk = '';
    var ulNote = '';
    if (ulStatus.info && ulStatus.info.noUl) {
      ulText = 'No aplica: este nutriente no tiene UL oficial.';
      ulNote = ulStatus.info.note || '';
    } else if (ulStatus.limit && ulStatus.info) {
      var shownLimit = ulStatus.info.displayLimit ||
        (U.n(ulStatus.limit, (c && c.dec) ? c.dec : 0) + ' ' + (c ? c.unidad : '') + ' / día');
      ulText = shownLimit + ' · ' + ulStatus.info.source;
      ulRisk = ulStatus.info.risk;
      ulNote = ulStatus.info.note || '';
    } else {
      ulText = 'Sin límite tóxico adverso cuantificado en fuentes dietéticas habituales (baja toxicidad).';
    }

    /* v2.1: riesgo documentado por déficit y por exceso, cada uno con su fuente. */
    var deficitInfo = N.DEFICIT[k] || null;
    var deficitText = deficitInfo ? deficitInfo.text :
      'No se ha descrito un síndrome carencial para este nutriente en personas sanas.';
    var deficitSource = deficitInfo ? deficitInfo.source : 'NASEM/IOM (DRI) y EFSA.';

    var excessInfo = null;
    if (ulStatus.info && ulStatus.info.risk) {
      excessInfo = { text: ulStatus.info.risk, source: ulStatus.info.source };
    } else if (N.EXCESS[k]) {
      excessInfo = N.EXCESS[k];
    }
    var excessText = excessInfo ? excessInfo.text :
      'No se ha establecido un límite máximo tolerable (UL) ni efectos adversos por exceso en la ingesta dietética habitual.';
    var excessSource = excessInfo ? excessInfo.source : 'NASEM/IOM (DRI) y EFSA.';

    return {
      k: k,
      name: name,
      unit: unit,
      totVal: totVal,
      refVal: r ? r.v : null,
      pct: r ? U.pct(totVal, r.v) : null,
      how: howText,
      source: sourceText,
      ul: ulText,
      ulNote: ulNote,
      ulRisk: ulRisk,
      deficit: deficitText,
      deficitSource: deficitSource,
      excess: excessText,
      excessSource: excessSource,
      ulStatus: ulStatus.status,
      ulLimit: ulStatus.limit,
      ulRatio: ulStatus.ratio
    };
  };

  N.refsFromReport = function (r) {
    return N.refs(r, r.meta || r.tdee);
  };

  N.REF_NOTE = 'Referencias para adultos (RDA/AI, NASEM/IOM). Energía y macros se ' +
    'calculan a partir de tu meta calórica; el resto se ajusta por sexo, edad y peso.';

  /** Color/semántica de una barra de cumplimiento. */
  N.status = function (pct, tipo) {
    if (pct == null) return 'none';
    if (tipo === 'max') {
      if (pct <= 100) return 'ok';
      if (pct <= 125) return 'warn';
      return 'over';
    }
    if (pct >= 100) return 'ok';
    if (pct >= 50) return 'warn';
    return 'low';
  };

  /* --------------------------------------------------------------- totales */

  N.totals = function (items) {
    var v = {}, missing = {};
    if (!window.DB) return { v: v, missing: missing };

    DBX.cols().forEach(function (c) {
      if (c.tipo === 'num' && c.k !== 'porcion') {
        v[c.k] = 0;
        missing[c.k] = 0;
      }
    });

    (items || []).forEach(function (it) {
      if (!it || !it.food) return;
      var f = (+it.gramos || 0) / 100;
      if (!f) return;
      Object.keys(v).forEach(function (k) {
        var val = it.food.nutrientes[k];
        if (val == null) missing[k] += 1;
        else v[k] += val * f;
      });
    });

    return { v: v, missing: missing };
  };

  N.itemsOf = function (meriendas, includeSet) {
    var out = [];
    (meriendas || []).forEach(function (m) {
      if (includeSet && !includeSet[m.id]) return;
      (m.items || []).forEach(function (it) {
        var food = window.App ? App.food(it.id) : null;
        if (food) out.push({ food: food, gramos: +it.gramos || 0, merienda: m });
      });
    });
    return out;
  };

  window.N = N;
})();
