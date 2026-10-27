# Nutrición · Base de alimentos (México)

Aplicación web en español (es-MX) para consultar **120 alimentos e ingredientes
comunes de México** (76 columnas de nutrientes) y una **base ampliada de 1,719
alimentos USDA** (23 categorías), además de calcular metas energéticas y comidas.

Es un sitio **100 % estático**: HTML + CSS + JavaScript sin frameworks, sin
dependencias, sin CDN y **sin paso de compilación**. Por eso funciona igual al
abrir `index.html` con doble clic (`file://`) que servido desde GitHub Pages.

**Versión actual: 2.1**

**Sitio publicado:** https://frenesigg.github.io/NutricionAPP/

---

## Qué hace

| Vista | Descripción |
| --- | --- |
| **Catálogo de alimentos** | 120 fichas con icono propio en la base principal y 1,719 fichas USDA con icono por categoría. Búsqueda en español e inglés, filtro por categoría, tamaño de tarjeta ajustable, ficha completa con todos los nutrientes y notas, y vista **Tabla** con orden, columnas configurables, reordenamiento, paginación y fuente de cada dato. |
| **Calculadora metas** | TMB con Mifflin-St Jeor, Harris-Benedict, FAO/OMS o Katch-McArdle; factores de actividad, objetivo (mantener, déficit, superávit), requerimientos diarios, proyección de peso (escala logarítmica o lineal) y semáforo por nutriente. |
| **Calculadora comida** | Arma una comida en 3 pasos (alimentos → cantidades → meriendas), compara contra las metas o contra una referencia general y guarda el reporte. |
| **Reportes** | Renombrar, duplicar, editar y borrar reportes; aviso al borrar un perfil metabólico en uso. Exportar e importar JSON. |

## Bases de datos

La app incluye dos bases y un selector **Principal / Ampliada** en el catálogo:

| Base | Alimentos | Contenido |
| --- | --- | --- |
| **Principal** (`window.DB`) | 120 | Alimentos mexicanos e ingredientes comunes, con icono propio. Los nutrientes con equivalente claro se tomaron de **USDA Foundation Foods 2026-04-30**. |
| **Ampliada** (`window.DB_EXT`) | 1,719 | Alimentos curados de **USDA SR Legacy 2018** y **Foundation Foods 2026-04-30**, en 23 categorías, con nombre en español y descripción original en inglés. |

En modo *Ampliada* se muestran las dos bases juntas (**1,839 alimentos**) para no
perder los alimentos mexicanos. La preferencia se guarda en `Store.prefs.db` y
por defecto es *Principal*.

## Uso local

No requiere instalar nada. Dos opciones:

```powershell
# opción A: doble clic en index.html

# opción B: servidor local
py -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/
```

## Privacidad y datos

- Todo se calcula **en el navegador**. No hay servidor, no hay cuentas, no hay
  analítica y no se envía nada a ninguna parte.
- La gestión de reportes es **100 % en memoria**: la app no escribe, modifica ni
  elimina archivos, y tampoco usa `localStorage`. Al cerrar o recargar la página,
  los reportes se pierden si antes no se exportan.
- **Exportar reportes** genera un `.json` (`reportes-nutricion-AAAA-MM-DD.json`)
  que luego se puede **Importar** en modo *combinar* o *reemplazar*.
- Celdas vacías = la fuente no reporta el dato (`null`), nunca cero.

## Estructura

```
index.html              # shell: barra lateral, 4 vistas, toasts, modal root
css/app.css             # tema oscuro, catálogo, tabla, barras, modal, responsive
data/alimentos.js       # GENERADO — window.DB (base principal, 120 alimentos)
data/alimentos_ext.js   # GENERADO — window.DB_EXT (base ampliada, 1,719 alimentos)
iconos/                 # iconos SVG de alimentos + categorias/ (23 genéricos)
js/
  util.js               # DOM, formato, toasts, modales, iconos, dona, proyección
  store.js              # estado en memoria, CRUD, import/export JSON, prefs
  db.js                 # DBX: base activa (principal/ampliada) y selector
  nutrition.js          # TMB/TDEE, requerimientos, AMDR, totales, semáforo
  gallery.js            # galería + ficha completa del alimento
  table.js              # vista tabular del catálogo
  metab.js              # calculadora de metas
  meal.js               # calculadora de comida
  reports.js            # reportes
  app.js                # arranque, navegación, pestañas del catálogo
tools/
  build_data.py         # regenera data/alimentos.js desde CSV / XLSX / SQLite
  usda.py               # utilidades USDA SR Legacy + Foundation
  build_main.py         # aplica nombre_en, Foundation y alimentos nuevos a DB
  build_ext.py          # genera data/alimentos_ext.js
  translate_ext.py      # traduce los nombres USDA al español y llena la caché
  nombres_es.json       # caché EN→ES usada por build_ext.py (sin internet)
  make_icons.py         # genera los 23 iconos de categoría
```

El orden de los `<script>` importa: `data` → `ext` → `util` → `store` → `db` →
`nutrition` → `gallery` → `table` → `metab` → `meal` → `reports` → `app`.

## Regenerar las bases

La app no lee CSV/XLSX/SQLite en tiempo de ejecución: los generadores convierten
las fuentes en los dos archivos JS.

```powershell
# base principal (requiere la fuente original alimentos_nutrientes_mexico)
py tools/build_data.py                 # automático (CSV > XLSX > DB)
py tools/build_main.py                 # nombre_en + Foundation + sal + leche

# base ampliada (requiere los CSV de USDA en ../data/sr y ../data/foundation)
py tools/build_ext.py                  # aplica tools/nombres_es.json
py tools/make_icons.py                 # solo si cambian las categorías
```

`tools/translate_ext.py` consulta Google Translate **solo cuando falta una
entrada** y guarda el resultado en `tools/nombres_es.json`; el build posterior
funciona sin internet. Los casos dudosos quedan en
`tools/nombres_es_review.txt`.

No edites `data/alimentos.js`, `data/alimentos_ext.js` ni `iconos/*.svg` a mano:
cambia la fuente y vuelve a ejecutar el generador.

## Publicación (GitHub Pages)

El sitio se sirve directamente desde la rama `main`, carpeta raíz:

1. Ajustes del repositorio → **Pages**.
2. *Source*: **Deploy from a branch** → rama `main`, carpeta `/ (root)`.
3. La URL queda como https://frenesigg.github.io/NutricionAPP/.

El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll, así que los
nombres de archivo y carpetas se sirven tal cual.

## Fuente de los datos

- **Base principal:** `alimentos_nutrientes_mexico` (estimaciones propias para
  platillos mexicanos), con **USDA Foundation Foods 2026-04-30** para los
  alimentos con equivalente claro.
- **Base ampliada:** **USDA FoodData Central** — SR Legacy 2018 y Foundation
  Foods 2026-04-30, filtrada para excluir marcas, alimentos infantiles, de
  restaurante y poco comunes.

Cada ficha indica su fuente y sus notas en el campo correspondiente.

## Licencia

Pendiente de definir por el autor.
