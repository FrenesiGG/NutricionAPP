# AGENTS.md — NutricionAPPv1.2

Guía para agentes de código (y personas) que trabajen en esta app. Léela antes
de tocar archivos.

## 1. Qué es esto

Aplicación web autocontenida en español para consultar la base de alimentos
mexicana (`alimentos_nutrientes_mexico`, 118 alimentos × 75 columnas) y calcular
metas y comidas.

- **Sin dependencias externas.** Nada de frameworks, CDN ni build step.
- **Funciona con doble clic** en `index.html` (`file://`) y también servida por
  HTTP. Por eso no se usa `fetch` ni módulos ES: los datos se cargan con
  `<script src="data/alimentos.js">` y cada módulo es un IIFE que expone un
  global (`U`, `Store`, `N`, `Gallery`, `Metab`, `Meal`, `Reports`, `App`).
- **Tema oscuro** definido con variables CSS en `css/app.css` (`:root`).
- **Idioma de la interfaz: español de México.** Nombres, textos y formatos
  (`Intl.NumberFormat('es-MX')`, fechas con `toLocaleDateString('es-MX')`).
- **Gestión 100 % en memoria.** La app jamás escribe, modifica, elimina ni
  crea archivos en disco automáticamente. Toda la información vive en memoria
  durante la sesión. La única operación con archivos es la descarga voluntaria al
  pulsar **Exportar reportes** (y la lectura al importar JSON).

## 2. Cómo abrirla

```powershell
# opción A: doble clic en index.html
# opción B: servidor local (recomendado para probar)
cd v1.2
py -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

Los reportes se gestionan en memoria. Al cerrar o recargar, si se desean conservar,
basta con pulsar **Exportar reportes** en la barra lateral.

## 3. Estructura

```
NutricionAPPv1.0/
  index.html            # shell: barra lateral, 4 vistas, toasts, modal root
  AGENTS.md             # este archivo
  CHANGELOG.md          # resumen de cada versión
  css/app.css           # tema oscuro, catálogo, barras, modal, responsive
  data/alimentos.js     # GENERADO — window.DB (no editar a mano)
  iconos/               # 118 SVG copiados de ../iconos
  js/
    util.js             # DOM, formato, toasts, modales, descargas, iconos SVG
    store.js            # localStorage, CRUD, import/export JSON
    nutrition.js        # TMB/TDEE, requerimientos diarios, totales, semáforo
    gallery.js          # galería reutilizable + ficha completa del alimento
    metab.js            # Calculadora metas
    meal.js             # Calculadora comida (3 pasos + meriendas)
    reports.js          # Reportes (editar, renombrar, duplicar, borrar)
    app.js              # arranque, navegación, importar/exportar
  tools/build_data.py   # regenera data/alimentos.js desde CSV/XLSX/DB
```

El orden de los `<script>` importa: `data` → `util` → `store` → `nutrition` →
`gallery` → `metab` → `meal` → `reports` → `app`.

## 4. Datos: fuente de verdad y regeneración

La app **no** lee el CSV/XLSX/SQLite en tiempo de ejecución. `tools/build_data.py`
convierte la base en un único archivo JS para que no haga falta servidor.

Fuentes, en orden de preferencia automática:

1. `../alimentos_nutrientes_mexico.csv` (UTF-8 con BOM) — es la que se usa por
   defecto y conserva los decimales tal como se muestran en la tabla.
2. `../alimentos_nutrientes_mexico.xlsx` — hoja `Base de datos`.
3. `../alimentos_nutrientes_mexico.db` — tabla `alimentos`.

Las etiquetas, unidades y descripciones se leen de la tabla `diccionario` del
`.db`; si no existe, se usan los encabezados.

```powershell
cd NutricionAPPv1.0
py tools/build_data.py                 # automático (CSV > XLSX > DB)
py tools/build_data.py --source xlsx   # forzar Excel
py tools/build_data.py --source db     # forzar SQLite
```

El script también copia los 118 SVG de `../iconos` a `iconos/`.

**No edites `data/alimentos.js` ni `iconos/*.svg` a mano.** Cambia la base y
vuelve a ejecutar el generador. `data/alimentos.js` contiene:

```js
window.DB = {
  meta:       { app, version, generado, fuente, filas, columnas },
  categorias: [...],   // 21, tal cual vienen de la base
  grupos:     [...],
  cols:       [{ k, label, unidad, desc, sec, tipo, dec, columna }],
  alimentos:  [{ id, nombre, grupo, categoria, porcion, unidad, equiv,
                 fuente, notas, icono, nutrientes:{...}, texto:{antiox, otros} }]
};
```

Reglas de datos:

- **Celda vacía ≠ cero.** Si la fuente no reporta un nutriente, el valor es
  `null`; la UI muestra `—` con el tooltip “La fuente no reporta este dato”.
  Nunca rellenes con 0.
- `porcion` siempre es 100; la unidad real (`g` o `ml`) y el estado (crudo,
  cocido, seco…) están en `unidad`.
- Las 21 categorías se usan literalmente, incluidas las casi duplicadas
  (`Cereales` vs `Cereales y derivados`, `Frutos secos` vs
  `Frutos secos y semillas`). No las normalices sin actualizar la base.
- Los iconos se referencian con ruta relativa (`iconos/IMG-01-canela.svg`).

## 5. Persistencia y modelo de reportes

`Store` (clave `nutricionapp.v1`):

```js
{
  version: "1.0",
  metab: [{
    id, tipo:"metabolico", nombre, fecha, editado,
    sexo:"F"|"M", edad, peso, talla, grasa|null,
    actividad, formula, objetivo,
    tmb, tdee, meta                    // kcal redondeadas
  }],
  comidas: [{
    id, tipo:"comida", nombre, fecha, editado,
    metabId|null,
    meriendas: [{ id, nombre, items:[{ id, gramos }] }],
    incluidas: [idMerienda],             // meriendas marcadas al guardar
    resumen: { kcal, protein, carb, fat }
  }],
  prefs: { card: 132 }                 // tamaño del catálogo
}
```

- Borrar un metabólico **en uso** debe avisar, listar los reportes afectados y,
  si se confirma, desvincular (`metabId = null`) antes de borrar.
- Importar admite `{app, version, metab, comidas}` y también un arreglo suelto de
  comidas. Modos: **combinar** (añade ids nuevos) y **reemplazar** (borra todo).
- Exportar produce `reportes-nutricion-AAAA-MM-DD.json` con `meta` + `comidas`.

## 6. Cálculos

- Fórmulas TMB: Mifflin-St Jeor (por defecto), Harris-Benedict, FAO/OMS y
  Katch-McArdle (requiere % de grasa; si falta, cae a Mifflin con aviso).
- Factores de actividad: 1.20 / 1.375 / 1.55 / 1.725 / 1.90.
- Objetivo: ×1.00 mantener, ×0.85 déficit moderado, ×0.80 déficit agresivo,
  ×1.10 superávit. `meta = TDEE × factor`.
- `N.refs(persona, kcal)` devuelve referencias diarias de adultos (RDA/AI) con
  dos semánticas: `min` (llegar al 100 %) y `max` (no pasarse: saturadas,
  trans, colesterol, azúcares, sodio, cafeína).
- Sin reporte metabólico, la calculadora de comida usa una referencia general
  (2 000 kcal, 70 kg, 30 años) solo para dar escala a las barras; se indica en
  la UI y no sustituye a la comparación personal.
- Colores de barras (`N.status`): `ok` verde, `warn` ámbar, `over` rojo,
  `low` azul.

## 7. Convenciones de código

- JavaScript ES5-ish (var, function) para máxima compatibilidad con `file://`;
  se permite `Promise`, `Set`, `Array.prototype.forEach`, `closest`,
  `classList`, `Intl`.
- Cada archivo es un IIFE con `'use strict'` y expone un único global.
- Nada de `fetch`, `XMLHttpRequest`, imports ni `type="module"`.
- Para eventos en contenedores que se re-pintan, usa `element.onclick = ...`
  (no `addEventListener`), para no acumular listeners.
- HTML generado con plantillas de cadena; **siempre** `U.esc()` para datos del
  usuario o de la base.
- Formato de números con `U.n(valor, dec)`; para valores de nutrientes usa
  `U.fixed(valor, col.dec)` y respeta `dec` que viene en `DB.cols`.
- Los botones de acción llevan `data-act`; las tarjetas de alimento `data-id`.
- Español para todo el texto visible; nombres de variables/funciones en inglés
  o español según el módulo, sin mezclar dentro del mismo archivo.
- Al añadir iconos de interfaz, agrega el `path` en `U.icon` (`js/util.js`).

## 8. Versionado y changelog

- La versión vive en `index.html` (`brand-txt`), en `data/alimentos.js`
  (`meta.version`), en `Store.version` y en `AGENTS.md` si aplica.
- Se empieza en **1.0** y cada entrega suma **+0.1**.
- Cada cambio debe registrarse en `CHANGELOG.md` con: versión, fecha y un
  resumen breve de lo agregado/corregido.
- No cambies la clave de `localStorage` sin migración; si cambia el formato,
  versiona y migra en `store.js`.

## 9. Checklist antes de entregar

1. `py tools/build_data.py` sin errores y con 118 alimentos / 75 columnas.
2. Abrir la app y revisar consola sin errores.
3. Catálogo: buscar, filtrar, “Todos” (apaga/enciende), slider, ficha completa.
4. Metas: validaciones, fórmulas, guardar, editar, borrar.
5. Comida: seleccionar → cantidades → merienda → repetir → Terminar → comparar
   → desmarcar merienda → guardar.
6. Reportes: renombrar, duplicar, editar, borrar; aviso al borrar un metabólico
   en uso.
7. Exportar, borrar un reporte, importar (combinar y reemplazar).
8. Recargar la página y comprobar que los reportes siguen ahí.
9. `CHANGELOG.md` actualizado y versión incrementada.

## 10. Trampas conocidas

- **Excel bloquea el CSV** (`PermissionError: [Errno 13]`): cierra el archivo
  antes de regenerar.
- PowerShell + Python: no pases código multilínea por `py -c`; crea un script.
- Usa `$env:PYTHONIOENCODING='utf-8'` para imprimir acentos y `µ`.
- El navegador de pruebas puede no abrir `file://`; usa `py -m http.server`.
- `diccionario.etiqueta` trae la unidad entre paréntesis; el generador la quita
  y guarda la unidad aparte.
- El CSV tiene BOM: leerlo con `encoding="utf-8-sig"`.
- Las tarjetas del catálogo usan `--card` (96–200 px) y el tamaño se guarda en
  `prefs.card`; no lo fijes en CSS.
- `Meal.state` es de solo lectura para inspección; el estado real se reconstruye
  con `Meal.reset()` y `Meal.edit(reporte)`.
