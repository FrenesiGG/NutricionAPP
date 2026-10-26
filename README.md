# Nutrición · Base de alimentos (México)

Aplicación web en español para consultar una base de **118 alimentos e ingredientes
comunes de México** (75 columnas de nutrientes) y calcular metas energéticas y comidas.

Es un sitio **100 % estático**: HTML + CSS + JavaScript sin frameworks, sin
dependencias, sin CDN y **sin paso de compilación**. Por eso funciona igual al
abrir `index.html` con doble clic que servido desde GitHub Pages.

**Sitio publicado:** https://TU-USUARIO.github.io/NutricionAPPv1.8/

---

## Qué hace

| Vista | Descripción |
| --- | --- |
| **Catálogo de alimentos** | 118 fichas con búsqueda, filtro por categoría, tamaño de tarjeta ajustable y ficha completa con todos los nutrientes, antioxidantes y notas. |
| **Calculadora metas** | TMB con Mifflin-St Jeor, Harris-Benedict, FAO/OMS o Katch-McArdle; factores de actividad, objetivo (mantener, déficit, superávit), requerimientos diarios, proyección de peso y semáforo por nutriente. |
| **Calculadora comida** | Arma una comida en 3 pasos (alimentos → cantidades → meriendas), compara contra las metas o contra una referencia general y guarda el reporte. |
| **Reportes** | Renombrar, duplicar, editar y borrar reportes; aviso al borrar un perfil metabólico en uso. Exportar e importar JSON. |

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
- Los reportes se guardan en el `localStorage` del navegador (clave
  `nutricionapp.v1`), así que son locales a ese navegador y ese equipo.
- Para conservarlos o moverlos: **Exportar reportes** genera un `.json` que luego
  se puede **Importar** (modos *combinar* y *reemplazar*).
- Celdas vacías = la fuente no reporta el dato (`null`), nunca cero.

## Estructura

```
index.html            # shell: barra lateral, 4 vistas, toasts, modal root
css/app.css           # tema oscuro, catálogo, barras, modal, responsive
data/alimentos.js     # GENERADO — window.DB (no editar a mano)
iconos/               # 118 SVG de los alimentos
js/
  util.js             # DOM, formato, toasts, modales, descargas, iconos
  store.js            # localStorage, CRUD, import/export JSON
  nutrition.js        # TMB/TDEE, requerimientos, totales, semáforo
  gallery.js          # galería + ficha completa del alimento
  metab.js            # calculadora de metas
  meal.js             # calculadora de comida
  reports.js          # reportes
  app.js              # arranque, navegación, importar/exportar
tools/build_data.py   # regenera data/alimentos.js desde CSV / XLSX / SQLite
```

El orden de los `<script>` importa: `data` → `util` → `store` → `nutrition` →
`gallery` → `metab` → `meal` → `reports` → `app`.

## Regenerar la base de datos

`data/alimentos.js` se genera a partir de la base original
(`alimentos_nutrientes_mexico`, en CSV, XLSX o SQLite):

```powershell
py tools/build_data.py                 # automático (CSV > XLSX > DB)
py tools/build_data.py --source xlsx   # forzar Excel
py tools/build_data.py --source db     # forzar SQLite
```

No edites `data/alimentos.js` ni `iconos/*.svg` a mano: cambia la base y vuelve a
ejecutar el generador.

## Publicación (GitHub Pages)

El sitio se sirve directamente desde la rama `main`, carpeta raíz:

1. Ajustes del repositorio → **Pages**.
2. *Source*: **Deploy from a branch** → rama `main`, carpeta `/ (root)`.
3. La URL queda como `https://USUARIO.github.io/NutricionAPPv1.8/`.

El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll, así que los
nombres de archivo y carpetas se sirven tal cual.

## Fuente de los datos

Los valores nutrimentales provienen de la base
`alimentos_nutrientes_mexico` (USDA FoodData Central / SR Legacy y estimaciones
propias para platillos mexicanos), con su diccionario de etiquetas y unidades.
Cada ficha indica su fuente y sus notas en el campo correspondiente.

## Licencia

Pendiente de definir por el autor.
