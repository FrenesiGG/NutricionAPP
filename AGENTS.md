# AGENTS.md — NutricionAPPv2.1

Guía para agentes de código (y personas) que trabajen en esta app. Léela antes
de tocar archivos.

## 1. Qué es esto

Aplicación web autocontenida en español para consultar dos bases de alimentos
USDA y calcular metas y comidas:

- **Base principal** (`window.DB`): 120 alimentos × 76 columnas. Conserva los
  alimentos mexicanos e ingredientes comunes de `alimentos_nutrientes_mexico` y
  sustituye los que tienen equivalente claro por **USDA Foundation Foods
  2026-04-30**.
- **Base extendida** (`window.DB_EXT`): 1,719 alimentos USDA curados de SR
  Legacy 2018 + Foundation Foods 2026-04-30, en 23 categorías.

- **Sin dependencias externas.** Nada de frameworks, CDN ni build step.
- **Funciona con doble clic** en `index.html` (`file://`) y también servida por
  HTTP. Por eso no se usa `fetch` ni módulos ES: los datos se cargan con
  `<script src="data/alimentos.js">` y cada módulo es un IIFE que expone un
  global (`U`, `Store`, `DBX`, `N`, `Gallery`, `Table`, `Metab`, `Meal`,
  `Reports`, `App`).
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
cd NutricionAPPv2.1
py -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

Los reportes se gestionan en memoria. Al cerrar o recargar, si se desean conservar,
basta con pulsar **Exportar reportes** en la barra lateral.

## 3. Estructura

```
NutricionAPPv2.1/
  index.html            # shell: barra lateral, 4 vistas, toasts, modal root
  AGENTS.md             # este archivo
  CHANGELOG.md          # resumen de cada versión
  css/app.css           # tema oscuro, catálogo, tabla, barras, modal, responsive
  data/
    alimentos.js        # GENERADO — window.DB (base principal)
    alimentos_ext.js    # GENERADO — window.DB_EXT (base extendida)
  iconos/               # 120 SVG de alimentos + categorias/*.svg (23 genéricos)
  js/
    util.js             # DOM, formato, toasts, modales, iconos, dona de macros,
                        #   proyección de peso (escala log/lineal + burbuja)
    store.js            # estado en memoria, CRUD, import/export JSON, prefs
    db.js               # DBX: base activa (principal/ampliada) y selector
    nutrition.js        # TMB/TDEE, requerimientos, AMDR, totales, semáforo
    gallery.js          # galería reutilizable + ficha completa del alimento
    table.js            # vista tabular del catálogo (orden, columnas, fuente)
    metab.js            # Calculadora metas
    meal.js             # Calculadora comida (3 pasos + meriendas)
    reports.js          # Reportes (editar, renombrar, duplicar, borrar)
    app.js              # arranque, navegación, pestañas del catálogo
  tools/
    build_data.py       # regenera data/alimentos.js desde CSV/XLSX/DB (1.x)
    usda.py             # utilidades USDA SR Legacy + Foundation
    build_main.py       # aplica nombre_en, Foundation y alimentos nuevos a DB
    build_ext.py        # genera data/alimentos_ext.js (base extendida curada)
    translate_ext.py    # traduce los nombres USDA al español y llena la caché
    nombres_es.json     # caché EN→ES usada por build_ext.py (sin internet)
    make_icons.py       # genera los 23 iconos de categoría
```

El orden de los `<script>` importa: `data` → `ext` → `util` → `store` → `db` →
`nutrition` → `gallery` → `table` → `metab` → `meal` → `reports` → `app`.

## 4. Datos: fuentes, regeneración y base activa

La app **no** lee CSV/XLSX/SQLite en tiempo de ejecución. Los generadores
convierten las fuentes en dos archivos JS para que no haga falta servidor.

### Base principal (`data/alimentos.js`)

Origen histórico: `../alimentos_nutrientes_mexico.csv` (UTF-8 con BOM), luego
`.xlsx` (hoja `Base de datos`) y `.db` (tabla `alimentos`). `tools/build_data.py`
sigue siendo el generador base. Encima, `tools/build_main.py`:

1. Añade `nombre_en` a todas las filas (SR Legacy o Foundation).
2. Sustituye por Foundation Foods 2026-04-30 los alimentos de `MAIN_FD` cuyo
   estado de porción coincide. **Foundation manda cuando reporta el nutriente;
   si no, se conserva el valor de SR Legacy** para no perder datos.
3. Renombra `IMG-47` a **Sal de mesa yodada** (Foundation 746775).
4. Añade **Leche deslactosada semidescremada** (`IMG-49`, Foundation 746778).
5. Actualiza metadatos (`meta.version = "2.1"`, filas y columnas).

```powershell
cd NutricionAPPv2.1
py tools/build_data.py        # base desde CSV/XLSX/DB (si cambia la fuente)
py tools/build_main.py        # nombre_en + Foundation + sal + leche
```

`build_main.py` parte de `../NutricionAPPv1.8 claude/data/alimentos.js` si existe
(para que el proceso sea reproducible); si no, usa la base actual y la mezcla es
idempotente.

### Base extendida (`data/alimentos_ext.js`)

`tools/build_ext.py` combina SR Legacy 2018 y Foundation Foods 2026-04-30,
excluye marcas, alimentos infantiles, de restaurante y poco comunes, aplica topes
por categoría y deduplica contra la base principal por FDC ID y descripción.
Resultado: **1,719 alimentos, 23 categorías, 76 columnas**. Los alimentos
extendidos usan `id = "USDA-<fdc_id>"`, un icono genérico de su categoría
(`iconos/categorias/<slug>.svg`) y **nombre en español** para la columna
«Alimento». La descripción original de USDA se conserva en `nombre_en`
(«Nombre en inglés (USDA)») y sigue disponible en la ficha, la búsqueda y la
tabla.

```powershell
py tools/translate_ext.py     # solo si hay nombres nuevos o cambios de caché
py tools/build_ext.py         # aplica tools/nombres_es.json y regenera la base
py tools/make_icons.py        # solo si cambian las categorías o el estilo
```

`tools/translate_ext.py` consulta Google Translate **solo cuando falta una
entrada** y guarda el resultado en `tools/nombres_es.json`. El build posterior
funciona sin internet porque lee esa caché. Los casos dudosos quedan en
`tools/nombres_es_review.txt` y las correcciones manuales viven en el propio
script (`FULL` y `REPL`). `build_ext.py` no traduce: si falta una entrada,
conserva el nombre en inglés y lo reporta al final.

Los CSV crudos de USDA se esperan en `../data/sr/...` y
`../data/foundation/...` (fuera de la carpeta de la app). `tools/usda.py`
resuelve esas rutas a partir de la ubicación del proyecto.

### Base activa: `DBX` (`js/db.js`)

Toda la UI debe leer la base activa a través de `DBX`, nunca de `DB` o `DB_EXT`
directamente:

```js
DBX.mode()          // 'main' | 'extended'
DBX.db()            // objeto DB o DB fusionada
DBX.foods()         // alimentos de la base activa
DBX.cols()          // columnas (siempre las 76 de la base principal)
DBX.categorias()    // categorías de la base activa (unión en ampliada)
DBX.byId(id)        // alimento por id en la base activa
DBX.count()         // total de la base activa
DBX.setMode(mode)   // cambia y notifica a los suscriptores
DBX.subscribe(fn)   // re-render al cambiar de base
DBX.switchHtml()    // HTML del selector «Principal / Ampliada»
DBX.bindSwitch(el)  // activa los botones [data-db-mode]
```

- La preferencia es `Store.prefs.db = 'main' | 'extended'` y **por defecto es
  `'main'`** (solo base principal).
- En modo `extended`, `DBX.foods()` devuelve principal + extendida (1,839 en
  total) para no perder los alimentos mexicanos.
- Los reportes guardados con alimentos extendidos siguen funcionando aunque se
  vuelva a `'main'`: `Meal.foodOf()` cae a `DB_EXT` si el id no está en la base
  activa.
- Para añadir el selector en una galería nueva: inserta `DBX.switchHtml()` en el
  HTML y llama `DBX.bindSwitch(host)` después de pintar.

### Reglas de datos

- **Celda vacía ≠ cero.** Si la fuente no reporta un nutriente, el valor es
  `null`; la UI muestra `—` con el tooltip “La fuente no reporta este dato”.
  Nunca rellenes con 0.
- `porcion` siempre es 100; la unidad real (`g` o `ml`) y el estado (crudo,
  cocido, seco…) están en `unidad`.
- La base principal conserva las 21 categorías originales, incluidas las casi
  duplicadas (`Cereales` vs `Cereales y derivados`, `Frutos secos` vs
  `Frutos secos y semillas`). No las normalices sin actualizar la base.
- La base extendida usa 23 categorías nuevas en español; no las mezcles con las
  21 de la principal salvo en la unión que hace `DBX`.
- Los iconos se referencian con ruta relativa (`iconos/IMG-01-canela.svg`,
  `iconos/categorias/aves.svg`).

## 5. Persistencia y modelo de reportes

`Store` (clave `nutricionapp.v1`, versión `2.1`):

```js
{
  version: "2.1",
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
  prefs: {
    card: 132,                           // tamaño del catálogo
    db: "main"                           // 'main' | 'extended'
  }
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
  trans, azúcares, sodio, cafeína). El colesterol dietético **no** tiene
  referencia máxima: no existe UL oficial desde que las guías 2015–2020
  retiraron los 300 mg/día y las 2025–2030 no fijan una cifra.
- `N.AMDR` contiene los rangos aceptables de distribución de macronutrientes
  (porcentaje de kcal): proteína IOM/NASEM 10–35 y WHO/FAO 10–15; grasa 20–35 y
  15–30; carbohidratos 45–65 y 55–75. `U.bindMacroPie()` los muestra al pasar el
  cursor por la dona.
- Sin reporte metabólico, la calculadora de comida usa una referencia general
  (2 000 kcal, 70 kg, 30 años) solo para dar escala a las barras; se indica en
  la UI y no sustituye a la comparación personal.
- Colores de barras (`N.status`): `ok` verde, `warn` ámbar, `over` rojo,
  `low` azul. `N.getUlStatus()` añade el límite máximo tolerable (UL).
- `N.UL` admite cuatro campos especiales:
  - `displayLimit`: texto exacto del límite cuando las unidades de la base no
    coinciden con las de la fuente (p. ej. flúor: `10 mg/día (10,000 µg)`).
  - `noAutoStatus`: el UL se informa en la burbuja pero no colorea la barra ni
    genera alertas. Se usa en la niacina, porque los 35 mg/día aplican solo a
    niacina sintética de suplementos y fortificados.
  - `noUl`: el nutriente no tiene UL oficial (colesterol). La burbuja muestra
    la explicación en lugar de un número.
  - `note`: texto adicional que `Meal` pinta bajo el UL en la burbuja.
- `N.DEFICIT`, `N.EXCESS` y `N.UL[k].risk` (v2.1) documentan el **riesgo por
  déficit** y el **riesgo por exceso** de cada nutriente, con su fuente
  (`NASEM/IOM`, `OMS/FAO`, `EFSA`, `ACSM`, `Endocrine Society`, `NIH ODS`).
  `N.nutrientBubbleInfo()` los devuelve como `deficit`,
  `deficitSource`, `excess` y `excessSource`; si un nutriente ya tiene UL, el
  riesgo por exceso sale de `N.UL[k].risk`. No inventes cifras ni fuentes: si no
  hay síndrome carencial o UL oficial, dilo explícitamente.
- Se añadieron UL informativos para `retinol` (3,000 µg/día), `molybdenum`
  (2,000 µg/día) y `mg` (350 mg/día solo de suplementos, `noAutoStatus`).

## 7. Interfaz: catálogo y gráficas

- **Catálogo**: dos pestañas, `Tarjetas` (`Gallery`) y `Tabla` (`Table`).
  - La tabla ordena por cualquier columna (A-Z/Z-A), permite arrastrar
    encabezados para reordenar, arrastrar bordes para redimensionar, ocultar/
    mostrar columnas, cambiar el tamaño de letra y pagina 25/50/100/200 filas.
  - La galería pinta por lotes («Mostrar más») para no bloquear con 1,839
    alimentos.
- **Dona de macros** (`U.macroPie`): cada arco y etiqueta lleva
  `data-macro`/`data-pct`. Llama `U.bindMacroPie(host)` después de insertar el
  HTML para activar la burbuja AMDR (elemento único `#macro-tip` en `body`).
- **Proyección de peso** (`U.weightProjection`): estado por gráfica con
  `{ mode, zero, manualKcal, manualPct, scale }`; `scale` es `'log'` (por
  defecto) o `'linear'`. La burbuja `#wp-tip` muestra peso, semana, mes y TDEE
  exactos del punto señalado. En la calculadora de comida el estado vive en
  `mealWpState`.
- **Desglose nutrimental** (`Meal`): cada sección muestra píldoras con el
  conteo de nutrientes en rango, faltantes, cercanos y excedidos; la sección 6
  es cualitativa. La burbuja de cada nutriente incluye explicación, fuente de la
  meta, UL (si existe), **riesgo por déficit**, **riesgo por exceso** y la fuente
  de cada riesgo. El texto de ayuda bajo el encabezado lo resume.

## 8. Convenciones de código

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
  `U.fixed(valor, col.dec)` y respeta `dec` que viene en `DBX.cols()`.
- **Usa `DBX.cols()` / `DBX.foods()` / `DBX.byId()`**, no `DB.cols` ni
  `DB.alimentos`, salvo en el propio `js/db.js` o en código que deba mirar una
  base concreta (p. ej. el respaldo de `Meal.foodOf`).
- Los botones de acción llevan `data-act`; las tarjetas de alimento `data-id`;
  el selector de base usa `data-db-mode="main|extended"`.
- Español para todo el texto visible; nombres de variables/funciones en inglés
  o español según el módulo, sin mezclar dentro del mismo archivo.
- Al añadir iconos de interfaz, agrega el `path` en `U.icon` (`js/util.js`).

## 9. Versionado y changelog

- La versión vive en `data/alimentos.js` y `data/alimentos_ext.js`
  (`meta.version`), en `Store.version` (`js/store.js`), en `AGENTS.md` y en los
  `?v=2.1` de `index.html` (cache busting).
- Se empieza en **1.0** y cada entrega suma **+0.1**.
- Cada cambio debe registrarse en `CHANGELOG.md` con: versión, fecha y un
  resumen breve de lo agregado/corregido.
- No cambies la clave de `localStorage` sin migración; si cambia el formato,
  versiona y migra en `store.js`. (Hoy la app no escribe en `localStorage`.)

## 10. Checklist antes de entregar

1. `py tools/build_main.py` sin errores: 120 alimentos / 76 columnas / 0 sin
   `nombre_en` y 0 sin kcal.
2. `py tools/build_ext.py` sin errores: 1,719 alimentos / 23 categorías / 0 sin
   kcal / 0 sin traducción (o revisa `tools/nombres_es_review.txt`).
3. Abrir la app y revisar consola sin errores.
4. Catálogo: buscar (español e inglés), filtrar, “Todos”, slider, ficha completa
   con nombre inglés, pestaña Tabla (orden, columnas, fuente, paginación).
5. Burbujas de nutrientes: niacina muestra el UL solo para suplementos y
   fortificados; flúor muestra 10 mg/día (10,000 µg); colesterol explica que no
   hay UL oficial; cada burbuja muestra riesgo por déficit y por exceso con su
   fuente (revisa al menos hierro, sodio, vitamina D, β-caroteno y cafeína).
6. Selector Principal/Ampliada: cambia conteos, chips, tarjetas, tabla y ficha;
   vuelve a Principal y comprueba que los reportes con alimentos extendidos
   siguen mostrando datos.
7. Metas: validaciones, fórmulas, AMDR al pasar el cursor, guardar, editar,
   borrar, proyección de peso (Log/Lineal y burbuja).
8. Comida: seleccionar → cantidades → merienda → repetir → Terminar → comparar
   → desmarcar merienda → guardar; revisa píldoras por sección y proyección.
9. Reportes: renombrar, duplicar, editar, borrar; aviso al borrar un metabólico
   en uso.
10. Exportar, borrar un reporte, importar (combinar y reemplazar).
11. Recargar la página y comprobar que los reportes siguen ahí.
12. `CHANGELOG.md` actualizado y versión incrementada.

## 11. Trampas conocidas

- **Excel bloquea el CSV** (`PermissionError: [Errno 13]`): cierra el archivo
  antes de regenerar.
- PowerShell + Python: no pases código multilínea por `py -c`; crea un script.
- Usa `$env:PYTHONIOENCODING='utf-8'` para imprimir acentos y `µ`.
- El navegador de pruebas puede no abrir `file://`; usa `py -m http.server`.
- `diccionario.etiqueta` trae la unidad entre paréntesis; el generador la quita
  y guarda la unidad aparte.
- El CSV tiene BOM: leerlo con `encoding="utf-8-sig"`.
- Foundation Foods es más nuevo pero **más incompleto** que SR Legacy: al
  sustituir, mezcla por nutriente y conserva el valor viejo cuando Foundation
  devuelve `null`.
- Los CSV crudos de USDA no se copian dentro de la app (son grandes); viven en
  `../data/sr` y `../data/foundation`. Sin ellos, `build_main.py` y
  `build_ext.py` no pueden regenerar.
- Las tarjetas del catálogo usan `--card` (96–200 px) y el tamaño se guarda en
  `prefs.card`; no lo fijes en CSS.
- La tabla usa `--table-font` en el host y `colgroup` con anchos; el encabezado
  es sticky dentro de `.table-scroll`.
- `U.bindMacroPie` usa un `#macro-tip` único en `body`; vuelve a llamarlo cada
  vez que repintes la dona.
- `Meal.state` es de solo lectura para inspección; el estado real se reconstruye
  con `Meal.reset()` y `Meal.edit(reporte)`.
