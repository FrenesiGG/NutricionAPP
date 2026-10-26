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

    /* Grasas saturadas, trans, colesterol, azúcares */
    put('sfa', Math.round(kcal * 0.10 / 9), 'max');
    put('trans', 2, 'max');
    put('cholesterol', 300, 'max');
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
    cholesterol: { limit: 300, unit: 'mg', label: 'Colesterol dietético', source: 'AHA / NCEP', risk: 'Aumento del colesterol plasmático en respondedores hipercolesterolémicos.' },
    sugars: { limitPct: 10, unit: '% kcal', label: 'Azúcares libres/añadidos', source: 'OMS', risk: 'Caries dental, resistencia a la insulina y esteatosis hepática.' },
    va: { limit: 3000, unit: 'µg', label: 'Vitamina A (retinol preformado)', source: 'IOM (DRI) / EFSA', risk: 'Hepatotoxicidad, alteraciones óseas y teratogénesis (en embarazo).' },
    vc: { limit: 2000, unit: 'mg', label: 'Vitamina C', source: 'IOM (DRI)', risk: 'Trastornos gastrointestinales osmóticos y aumento del riesgo de litiasis renal (oxalato).' },
    vd: { limit: 100, unit: 'µg', label: 'Vitamina D (4,000 UI)', source: 'IOM (DRI) / Endocrine Society', risk: 'Hipercalcemia, calcificación de tejidos blandos y nefrocalcinosis.' },
    ve: { limit: 1000, unit: 'mg', label: 'Vitamina E (α-tocoferol)', source: 'IOM (DRI)', risk: 'Efecto antiagregante plaquetario excesivo y riesgo hemorrágico.' },
    b3: { limit: 35, unit: 'mg', label: 'Niacina (Vitamina B3)', source: 'IOM (DRI)', risk: 'Rubefacción cutánea (flushing), hepatotoxicidad e hipotensión.' },
    b6: { limit: 100, unit: 'mg', label: 'Vitamina B6 (piridoxina)', source: 'IOM (DRI) / EFSA', risk: 'Neuropatía sensorial periférica con consumo prolongado de altas dosis.' },
    folate: { limit: 1000, unit: 'µg', label: 'Folato / Ácido fólico', source: 'IOM (DRI)', risk: 'Enmascaramiento de la anemia megaloblástica por deficiencia de vitamina B12.' },
    choline: { limit: 3500, unit: 'mg', label: 'Colina', source: 'IOM (DRI)', risk: 'Olor corporal a pescado (trimetilaminuria), hipotensión y hepatotoxicidad.' },
    ca: { limit: 2500, unit: 'mg', label: 'Calcio', source: 'IOM (DRI)', risk: 'Síndrome de leche-alcalinos, calcificación vascular y cálculos renales.' },
    fe: { limit: 45, unit: 'mg', label: 'Hierro', source: 'IOM (DRI)', risk: 'Trastornos gastrointestinales severos, toxicidad celular por radicales libres y hemocromatosis secundaria.' },
    p: { limit: 4000, unit: 'mg', label: 'Fósforo', source: 'IOM (DRI)', risk: 'Hiperfosfatemia, hiperparatiroidismo secundario y calcificación ectópica.' },
    na: { limit: 2300, unit: 'mg', label: 'Sodio', source: 'IOM / OMS', risk: 'Hipertensión arterial sistémica, retención de líquidos y daño vascular.' },
    zn: { limit: 40, unit: 'mg', label: 'Zinc', source: 'IOM (DRI)', risk: 'Inhibición de la absorción de cobre, neutropenia y alteración del perfil lipídico.' },
    cu: { limit: 10, unit: 'mg', label: 'Cobre', source: 'IOM (DRI)', risk: 'Daño hepático celular y malestar gastrointestinal agudo.' },
    mn: { limit: 11, unit: 'mg', label: 'Manganeso', source: 'IOM (DRI)', risk: 'Neurotoxicidad similar al parkinsonismo con exposición acumulativa alta.' },
    se: { limit: 400, unit: 'µg', label: 'Selenio', source: 'IOM (DRI)', risk: 'Selenosis (fragilidad y pérdida de cabello y uñas, aliento a ajo y neuropatía).' },
    iodine: { limit: 1100, unit: 'µg', label: 'Yodo', source: 'IOM (DRI)', risk: 'Disfunción tiroidea (hipotiroidismo inducido por efecto Wolff-Chaikoff o tiroiditis).' },
    fluoride: { limit: 10, unit: 'mg', label: 'Flúor', source: 'IOM (DRI)', risk: 'Fluorosis esquelética y moteado dental.' },
    caffeine: { limit: 400, unit: 'mg', label: 'Cafeína', source: 'EFSA / FDA', risk: 'Ansiedad, taquicardia, insomnio y elevación transitoria de presión arterial.' }
  };

  /**
   * Determina si el valor actual está cerca del límite máximo tolerable (UL).
   * @returns {{ status: 'danger'|'warn'|'ok'|'none', limit: number, ratio: number, info: object }}
   */
  N.getUlStatus = function (k, val, userWeight, userKcal) {
    var ul = N.UL[k];
    if (!ul) return { status: 'none', limit: null };
    var limit = ul.limit;
    if (ul.perKg && userWeight) limit = ul.limit * userWeight;
    if (ul.limitPct && userKcal) {
      var cFactor = (k === 'sfa' || k === 'fat') ? 9 : 4;
      limit = (userKcal * (ul.limitPct / 100)) / cFactor;
    }
    if (!limit) return { status: 'none', limit: null };

    var ratio = val / limit;
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
    var c = (window.DB && DB.cols) ? DB.cols.filter(function (x) { return x.k === k; })[0] : null;
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
      howText = 'Límite preventivo cardiovascular tradicional: máximo 300 mg/día.';
      sourceText = 'American Heart Association (AHA) y NCEP.';
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
    if (ulStatus.status !== 'none' && ulStatus.info) {
      ulText = U.n(ulStatus.limit, (c && c.dec) ? c.dec : 0) + ' ' + (c ? c.unidad : '') + ' / día (' + ulStatus.info.source + ')';
      ulRisk = ulStatus.info.risk;
    } else {
      ulText = 'Sin límite tóxico adverso cuantificado en fuentes dietéticas habituales (baja toxicidad).';
    }

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
      ulRisk: ulRisk,
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

    DB.cols.forEach(function (c) {
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
