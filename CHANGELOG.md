# Changelog

Todas las versiones de NutricionAPP. Se empieza en 1.0 y cada entrega suma +0.1.
## [2.1] — 2026-10-26

La burbuja de cada nutriente del **Desglose nutrimental completo** ahora explica el **riesgo por déficit** y el **riesgo por exceso**, cada uno con su fuente. Se añadieron tres UL que faltaban y se ajustó la burbuja para que quepa en pantalla.

### Desglose nutrimental

- Al pasar el cursor por cualquier nutriente (barras y filas sin meta) la burbuja muestra dos secciones nuevas:
  - **Riesgo por déficit:** consecuencias documentadas de una ingesta insuficiente.
  - **Riesgo por exceso:** consecuencias de superar la dosis o el UL; si el nutriente no tiene UL oficial, se indica expresamente.
- Cada riesgo incluye su propia cita (`Fuente: …`). Se usan únicamente organismos de referencia: **NASEM/IOM (DRI)**, **OMS/FAO/UNU**, **EFSA**, **ACSM**, **Endocrine Society** y **NIH Office of Dietary Supplements**.
- Se cubren los 63 nutrientes numéricos de las secciones 1–5. Cuando no existe síndrome carencial (p. ej. cenizas, relación ω-6/ω-3, licopeno, luteína) o no hay UL oficial (p. ej. tiamina, riboflavina, B12, vitamina K, potasio), se dice claramente en lugar de inventar un riesgo o una cifra.
- Casos destacados: el β-caroteno distingue el riesgo de **suplementos** en fumadores (ATBC/CARET) del consumo en alimentos; el EPA/DHA cita el límite de **5 g/día** de la EFSA; los fitosteroles citan los **1.5–3 g/día** de la EFSA; el magnesio aclara que su UL aplica solo a suplementos.

### Límites y referencias

- Nuevos UL informativos:
  - **Retinol** (vitamina A preformada): 3,000 µg/día (IOM).
  - **Molibdeno:** 2,000 µg/día (IOM).
  - **Magnesio:** 350 mg/día solo para suplementos y medicamentos (`noAutoStatus`), porque el magnesio de los alimentos no se asocia a efectos adversos con función renal normal.
- La burbuja ahora mide 340 px, tiene estilos propios para los riesgos (azul = déficit, ámbar = exceso) y se reposiciona para no salirse de la ventana cuando es más alta.

### Otros

- Versión `2.1` en `data/alimentos.js`, `data/alimentos_ext.js`, `Store.version`, el respaldo de `DBX`, `AGENTS.md` y `?v=2.1` de `index.html`.
- Los generadores `tools/build_main.py`, `tools/build_ext.py` y `tools/translate_ext.py` también escriben `meta.version = "2.1"`, para que una regeneración no baje la versión.
- Las bases no cambian de contenido: siguen siendo 120 alimentos principales y 1,719 extendidos, 76 columnas.
- Se corrigió la codificación del separador `·` en el `<title>` y en el pie de la barra lateral, que se mostraban como «Â·».

## [2.0] — 2026-10-26

Corrección de tres referencias nutricionales (niacina, flúor y colesterol) y traducción al español de los 1,719 alimentos de la base ampliada, conservando la descripción original de USDA.

### Límites y referencias

- **Niacina (B3):** el UL de 35 mg/día ahora se presenta como referencia exclusiva de la **niacina sintética de suplementos y alimentos fortificados**. La niacina natural de carnes, pescados y cereales integrales no se asocia a rubefacción ni hepatotoxicidad, así que la barra ya no se colorea ni genera alertas por este UL (`noAutoStatus`). La RDA de 16 mg (hombres) y 14 mg (mujeres) se mantiene como mínimo.
- **Flúor (corregido):** el UL estaba en `10` con unidad `mg`, pero la base guarda el flúor en **µg**, por lo que el límite efectivo era de 10 µg (mil veces menor). Ahora es `10,000 µg = 10 mg/día` y la burbuja muestra «10 mg/día (10,000 µg)». Se añade la nota de que la **EFSA** fija un UL más estricto de 5 mg/día.
- **Colesterol dietético:** se retiró el «máximo seguro» de 300 mg/día. No existe un UL oficial: las guías **2015–2020** eliminaron el tope numérico y las **2025–2030** ya no fijan una cifra, sino que recomiendan limitar las grasas saturadas a menos del 10 % de las kcal. La app ya no asigna referencia máxima ni alerta por colesterol; la burbuja explica la ausencia de UL y aclara que **<200 mg/día** es solo una referencia clínica para prevención cardiovascular de alto riesgo, no un UL poblacional.

### Base ampliada

- Los **1,719 nombres** de `data/alimentos_ext.js` están ahora en **español** (columna «Alimento» del catálogo y la tabla).
- La descripción original de USDA se conserva en `nombre_en` («Nombre en inglés (USDA)») y sigue disponible en la ficha, la búsqueda y la tabla.
- La traducción se genera con `tools/translate_ext.py` y se guarda en `tools/nombres_es.json`; el build (`tools/build_ext.py`) la aplica desde esa caché, por lo que **no necesita internet**. `tools/nombres_es_review.txt` lista los casos dudosos y el script incluye correcciones manuales.

### Otros

- Versión `2.0` en `data/alimentos.js`, `data/alimentos_ext.js`, `Store.version`, `AGENTS.md` y `?v=2.0` de `index.html`.
- La base principal no cambia de contenido: mismas 120 filas y 76 columnas, solo actualiza metadatos.

## [1.9] — 2026-10-26

Actualización con nombre inglés USDA, vista tabular del catálogo, base extendida, rangos AMDR interactivos, escala logarítmica/lineal en las proyecciones de peso y resúmenes visuales por sección.

### Base de datos

- Nueva columna `nombre_en` («Nombre en inglés (USDA)») en las 120 filas de la base principal; se muestra en la ficha del alimento debajo del nombre en español.
- Nuevos alimentos con icono propio:
  - **Sal de mesa yodada** (`IMG-47`, USDA Foundation Foods 746775): 5,080 µg de yodo y 38,700 mg de sodio por 100 g.
  - **Leche deslactosada semidescremada** (`IMG-49`, USDA Foundation Foods 746778): 50 kcal y 126 mg de calcio por 100 ml.
- Se sustituyeron 68 alimentos con equivalente claro en **USDA Foundation Foods 2026-04-30**, más reciente y fiable que SR Legacy 2018. Cuando Foundation no reporta un nutriente se conserva el valor de SR Legacy para no perder datos; las 120 filas tienen kcal.
- Nueva base extendida `data/alimentos_ext.js` (`window.DB_EXT`): **1,719 alimentos USDA curados** (SR Legacy 2018 + Foundation 2026-04-30), 23 categorías y 76 columnas. Se excluyen marcas, alimentos infantiles, de restaurante y poco comunes.
- 23 iconos genéricos por categoría en `iconos/categorias/` para los alimentos extendidos.
- Selector **Principal / Ampliada** en el catálogo (tarjetas y tabla), en la calculadora de comida y en cualquier galería que use la base; por defecto se muestra solo la base principal. La preferencia vive en `Store.prefs.db`.

### Catálogo

- Nueva pestaña **Tabla** con todos los datos de la base activa:
  - Orden A-Z/Z-A por cualquier columna.
  - Reordenar columnas arrastrando el encabezado.
  - Redimensionar columnas arrastrando el borde.
  - Mostrar/ocultar columnas y restaurar todas.
  - Control de tamaño de letra (9–20 px).
  - Desplazamiento horizontal y encabezado fijo; paginación de 25/50/100/200 filas.
- La pestaña **Tarjetas** conserva búsqueda, filtros por categoría, tamaño de tarjeta y ficha completa; ahora busca también por nombre inglés y muestra el nombre inglés en la ficha.
- La galería carga las tarjetas por lotes («Mostrar más») para que la base ampliada no bloquee la interfaz.

### Calculadora de metas

- **Distribución de Macronutrientes** se movió justo debajo de «Datos de la persona».
- Al pasar el cursor por cada macro de la dona se muestra una burbuja con el porcentaje actual y los rangos AMDR de **IOM/NASEM** y **WHO/FAO**, además del estado (dentro/fuera).
- La gráfica de proyección de peso tiene un selector **Log / Lineal** para el eje X.
- La burbuja de la gráfica muestra el punto exacto: peso, semana, mes y TDEE del día simulado.

### Calculadora de comida

- **Desglose nutrimental completo**: el encabezado de cada sección muestra un resumen visual con cuántos nutrientes cumplen, faltan, están cerca o exceden la meta o el UL; la sección 6 (bioactivos) se marca como cualitativa.
- La comparación conserva la proyección de peso con el selector de escala y la burbuja de punto exacto.
- La dona de macros también muestra los rangos AMDR al pasar el cursor.

### Otros

- `?v=1.9` en CSS y scripts para evitar caché antigua.
- Nuevos generadores reproducibles en `tools/`: `usda.py`, `build_main.py`, `build_ext.py` y `make_icons.py`.

## [1.8] - 2026-10-25

- Se eliminó la burbuja que aparecía sobre el punto al pasar el cursor por la gráfica de proyección de peso; los valores exactos siguen en las etiquetas de los ejes (kg, semana y mes).

- Gráfica de proyección de peso (calculadora de metas y de comida):
  - El interruptor «Eje Y desde 0» está junto al resto de controles (selector de método, ayuda y campo manual).
  - La gráfica se muestra un tercio más pequeña (67 % del ancho; 100 % en pantallas estrechas).
  - Al pasar el cursor se resalta el punto más cercano de la línea; si no hay un punto de la cuadrícula, se crea uno interpolando la curva (simulación diaria exacta). Se muestran en el eje X la semana y el mes exactos, en el eje Y los kg exactos, y la burbuja con peso, día, semana y mes. Si hay un punto de la cuadrícula a ≤ 7 px, se ajusta a él.
  - La línea ahora sigue la curva diaria real (los puntos visibles siguen siendo 1 y 2 semanas, 1, 2, 3, 4, 6 meses y 1 año).

## [1.7] - 2026-10-25

- Las donas de macronutrientes (calculadora de comida y calculadora de metas) ahora muestran el nombre y el porcentaje de cada macro al lado de su color, con una línea guía; se eliminó la tabla de porcentajes que aparecía debajo. Ambas usan el mismo componente (`U.macroPie`).
- “Calorías por macronutriente” (calculadora de comida): tarjetas con más espacio entre el nombre del macro, las kcal y el texto «gramos × factor», que antes casi se encimaban.
- Calculadora de metas: “Datos de la persona” ocupa exactamente la mitad del ancho y el resto es para Resultado, metas diarias y distribución de macros; la gráfica de peso pasa a todo el ancho debajo.
- Nueva gráfica de proyección de peso (`U.weightProjection`):
  - Dos ejes X independientes: semanas arriba y meses debajo; el eje Y lleva «kg» arriba y los ejes X llevan «semana» y «mes» a la derecha. Las marcas ya no llevan unidad, salvo «Hoy».
  - La cuadrícula y los puntos de la línea están solo en 1 y 2 semanas y 1, 2, 3, 4, 6 meses y 1 año (más «Hoy»).
  - Al pasar el cursor se resalta el punto más cercano, sus marcas en los ejes X e Y, y aparece una burbuja sobre el punto con el peso exacto (2 decimales) y el día, la semana y el mes exactos.
  - Campo manual para escribir la meta calórica (kcal) o el % de objetivo calórico; vacío o 0 = desactivado y se muestra el valor predeterminado en gris.
  - La simulación avanza por días y recalcula el TDEE cada 7 días (7,700 kcal/kg).
- Calculadora de comida: se eliminó la gráfica «Proyección de peso con las calorías de esta comida» y se reemplazó por la nueva gráfica (método Meta calórica inicial, con las Calorías Totales de la comida como ingesta frente al TDEE del reporte), colocada justo encima de «Desglose nutrimental completo».

## [1.6] - 2026-10-25

- La dona de distribución de macronutrientes ahora muestra el porcentaje de calorías aportado por proteína, carbohidratos y grasas; se añadió la misma visualización a la calculadora de metas.
- Mayor separación visual entre las tarjetas de calorías por macronutriente.
- La calculadora de metas distribuye el espacio en dos columnas y añade una proyección de peso de 52 semanas con eje temporal logarítmico, selector de método, ayuda y opción para iniciar el eje Y en cero.
- La comparación de la calculadora de comida incluye una proyección de peso con las calorías totales del reporte seleccionado.
- Las proyecciones usan una aproximación energética de 7,700 kcal/kg y recalculan el TDEE semanalmente.

## [1.5] - Manual
1. Add a button with the icon of copy in the meriendas, that let the user copy that merienda.
2. In the results of Calculadora de comida, show how many kcalories are given by each of the macronutrientes
3. Add the alimento "Proteina de chicharo en polvo" to the database and make a logo for it as well, keep it very minimalist. 

## [1.4] - Manual

1. The images in the expandable nutrient bar seems to be broken, fix it.
2. In reportes menu, remove the first pincel icon, instead, clicking in the bubble (except in any of the other 3 icons) is edit.


## [1.3] - Manual

1. In Calculadora de comida report window, when clicking in a nutriente, it expand to show what alimentos (and how many g, or whatever its unit is) are giving that nutriente.ering in one nutriente, it will show a bubble explaining how it was calculated, what are the sources and what is the upper safe limit to eat.


## [1.2] — 2026-10-24

Actualización con cálculo de proteína dependiente del objetivo calórico (ISSN / Helms et al.), rangos visibles en metas diarias, ajuste manual isocalórico entre macronutrientes, nuevo dashboard gráfico en reporte de comidas (gráficos de calorías, macros, dona circular y micronutrientes clave), agrupación única de las 6 secciones sin duplicados, barras proporcionales con marcador 100%, alertas de límite máximo seguro (UL) y burbujas explicativas interactivas.

### Modificado y agregado

- **Proteína según objetivo calórico (ISSN / Helms et al.)**:
  - En déficit agresivo: 2.3 a 3.1 g/kg (promedio 2.6 g/kg) para blindar la masa muscular contra el catabolismo severo.
  - En déficit moderado: 2.0 a 2.6 g/kg (promedio 2.3 g/kg).
  - En mantenimiento: 1.6 a 2.2 g/kg (promedio 1.9 g/kg).
  - En superávit calórico: 1.6 a 2.0 g/kg (promedio 1.8 g/kg) gracias al efecto ahorrador de proteína de la energía y carbohidratos abundantes.
  - Explicación científica detallada y citas añadidas al hacer clic en Proteína.
- **Visualización de rangos en metas diarias**: Las tarjetas de referencia muestran el rango entre paréntesis al lado del promedio utilizado/mostrado (p. ej. `140 g (126 – 154 g)`).
- **Ajuste manual isocalórico con advertencias**: El usuario puede modificar manualmente cualquier meta dentro de su rango; los demás macronutrientes se reequilibran automáticamente respetando sus propios rangos para mantener fija la meta calórica. Si no es posible mantener las calorías exactas, se ajusta al valor más cercano posible y se le notifica al usuario.
- **Simplificación de hipertrofia**: Eliminado el campo manual de gramos de proteína al presionar Sí (Hipertrofia), calculándose de forma automática con base en la evidencia científica al igual que los demás macronutrientes.
- **Nuevo dashboard gráfico en reporte de comida**:
  - Cuadrícula 2×2 con 4 tarjetas de KPIs: Calorías Totales (con icono de flama e indicador de calorías restantes), Proteínas (con icono de mancuerna y meta g/kg), Carbohidratos (con icono de trigo y progreso de fibra) y Grasas Saludables (con icono de gota y estado de Omega 3).
  - Panel lateral de Distribución de Macronutrientes con gráfico de dona SVG en tiempo real (kcal totales en el centro) y lista de Micronutrientes Clave (Vitamina C, Magnesio, Hierro) con viñetas coloreadas.
- **Agrupación en una sola burbuja sin duplicados**: Las 6 secciones desplegables (Energía y macronutrientes, Ácidos grasos esenciales, Vitaminas, Minerales, Fitoesteroles y Compuestos bioactivos) se encuentran unificadas en una sola tarjeta sin duplicar las filas de vitaminas y minerales.
- **Barras proporcionales con marcador de 100%**: Cuando un nutriente supera el 100% (p. ej. 200% o 300%), la barra completa representa el total alcanzado y se dibuja un marcador vertical proporcional en el punto del 100% que muestra "100%" al pasar el cursor.
- **Detección de Límite Máximo Tolerable (UL)**: Si un nutriente se aproxima a su límite máximo seguro diario ($\ge 85\%$ del UL), la barra se torna naranja; si lo supera ($> 100\%$ del UL), se muestra en rojo con alerta de toxicidad.
- **Burbuja explicativa al pasar el cursor (hover)**: Al situar el puntero sobre cualquier nutriente, emerge una burbuja detallando cómo se calculó la meta para el usuario, las fuentes oficiales (IOM DRI, OMS, FAO, EFSA) y el límite máximo tolerable seguro (UL) junto con los riesgos clínicos asociados.

## [1.1] — 2026-10-24

Actualización con almacenamiento 100 % en memoria, mejoras en edición de meriendas (añadir alimentos y reordenamiento drag & drop), ventana explicativa de fórmulas y cálculo interactivo de metas diarias con fundamentación científica.

### Modificado y agregado

- **Almacenamiento 100 % en memoria**: El programa ya no escribe, modifica ni crea archivos en disco ni en `localStorage`. Todo vive en la memoria de la sesión activa, garantizando que los archivos del programa se mantengan intactos. La única operación de archivo permitida es la descarga voluntaria al hacer clic en **Exportar reportes**.
- **Edición de meriendas mejorada**:
  - Botón **Añadir alimentos a esta merienda** en el paso de cantidades, que abre un modal con el catálogo/galería completo para seleccionar e incorporar alimentos adicionales a la merienda activa sin perder las cantidades previamente ajustadas.
  - Filas de alimentos **arrastrables (Drag and drop)**: Cada alimento en la merienda incluye un asidero (`drag-handle`) para reordenar la lista mediante arrastrar y soltar con respuesta visual de posición (indicador superior/inferior).
- **Icono azul de ayuda (?) en FÓRMULA**: Añadido un botón circular azul `?` a la derecha de la etiqueta FÓRMULA que abre una ventana modal con la comparativa detallada de los 4 métodos de cálculo de TMB (Mifflin-St Jeor, Harris-Benedict, FAO/OMS/UNU y Katch-McArdle), sus ecuaciones completas, exactitud clínica, indicaciones y fuentes.
- **Objetivo de aumento de masa muscular (hipertrofia)**: Añadido selector interactivo (No / Sí) y campo numérico configurable para definir la meta de proteína por kg de peso (rango recomendado 1.6 a 2.2 g/kg según consensos de ISSN y Morton et al.).
- **Cálculo de agua corregido**: Corregido el valor estático anterior. Ahora se calcula dinámicamente según el peso corporal del usuario (35 ml/kg de peso base según EFSA/OMS) más la reposición hídrica según el nivel de actividad física (+350 a +1,300 ml según ACSM), presentándose en mililitros (ml) con su equivalencia en litros.
- **Cálculo de proteína corregido**: Corregido el cálculo que antes aplicaba un valor mínimo fijo de 0.8 g/kg. Ahora se ajusta dinámicamente si el usuario busca hipertrofia muscular (1.6–2.2 g/kg) o para mantenimiento/salud general adaptado a su nivel de actividad física (0.8–1.6 g/kg).
- **Desglose interactivo y fuentes en Metas diarias de referencia**: Al hacer clic en cualquiera de las 6 tarjetas de metas diarias (Energía, Proteína, Grasas, Carbohidratos, Fibra y Agua), se muestra debajo una tarjeta explicativa con el cálculo paso a paso aplicado a las métricas del usuario y la fuente clínica/científica correspondiente (IOM/RDA, OMS, FAO, EFSA, ISSN, ACSM).

## [1.0] — 2026-10-24

Primera versión funcional de la app de escritorio (web local, tema oscuro).

### Agregado

- **Estructura autocontenida** en `NutricionAPPv1.0/`: `index.html`, `css/`,
  `js/`, `data/`, `iconos/` y `tools/`. Funciona abriendo `index.html`
  directamente (sin servidor, sin dependencias, sin `fetch`).
- **Generador de datos** `tools/build_data.py`: convierte la base
  (`alimentos_nutrientes_mexico`) en `data/alimentos.js` (`window.DB`) y copia
  los 118 iconos SVG. Acepta CSV (por defecto), XLSX o SQLite; toma etiquetas,
  unidades y descripciones de la tabla `diccionario`.
- **Catálogo de alimentos**: cuadrícula minimalista con icono, nombre y
  categoría; slider de tamaño (96–200 px) que se recuerda; buscador por nombre,
  categoría o ID; filtros por categoría con chip “Todos” que selecciona todo y
  vuelve a deseleccionar todo; estado vacío con recuperación. Al tocar un
  alimento se abre su ficha completa con las 75 columnas, agrupadas en energía y
  macros, ácidos grasos, vitaminas, minerales, fitoesteroles y textos
  (antioxidantes/otros). Las celdas sin dato se muestran como “—” (nunca como 0).
- **Calculadora metas**: datos personales (sexo, edad, peso, talla, % de grasa
  opcional), actividad, fórmula (Mifflin-St Jeor, Harris-Benedict, FAO/OMS,
  Katch-McArdle) y objetivo (mantener, déficit moderado/agresivo, superávit).
  Muestra TMB, TDEE, meta calórica y metas diarias de referencia en vivo;
  guarda el resultado con nombre como **reporte metabólico** y permite editarlo.
- **Calculadora comida**: selección de alimentos desde la misma galería →
  cantidades por alimento → **Añadir merienda** (repetible). Las meriendas se
  muestran como tarjetas redondeadas arriba, con nombre editable, edición y
  borrado. **Terminar** muestra KPI, barras y texto de todos los nutrientes;
  se pueden marcar/desmarcar meriendas para ver el total cambiar. Botón
  **Añadir reporte metabólico para comparación** con porcentaje de metas
  diarias y semáforo por nutriente. **Guardar reporte de alimentos** conserva
  las meriendas marcadas, de modo que al reabrirlo se ve el mismo total.
- **Reportes**: pestañas de metabólicos y de alimentos; consultar, editar de
  nuevo, renombrar, duplicar y eliminar. Aviso especial al borrar un reporte
  metabólico en uso, con lista de reportes afectados y desvinculación.
- **Importar / exportar reportes** en JSON desde la barra lateral, con modos
  combinar o reemplazar y validación del archivo.
- **Persistencia** en `localStorage` (`nutricionapp.v1`) con aviso si el
  navegador la bloquea; preferencia de tamaño de cuadrícula incluida.
- **Documentación**: `AGENTS.md` con arquitectura, convenciones y checklist;
  este `CHANGELOG.md`.
