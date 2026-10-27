# -*- coding: utf-8 -*-
"""Actualiza data/alimentos.js a la versión 2.1: nombre_en, sal yodada y leche deslactosada."""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import usda

JS = os.path.join(usda.APP, "data", "alimentos.js")
# Se parte de la base 1.8 original para que el proceso sea reproducible. Si no
# existe, se usa la base actual (la mezcla es idempotente).
SRC = os.path.join(usda.ROOT, "NutricionAPPv1.8 claude", "data", "alimentos.js")
if not os.path.exists(SRC):
    SRC = JS

# Alimentos de la base principal que tienen un equivalente claro en Foundation Foods.
# Solo se sustituyen cuando el estado de la porción coincide (crudo/cocido/seco).
MAIN_FD = {
    "IMG-04": "2710819",  # chía seca
    "IMG-10": "2346401",  # papa russet cruda
    "IMG-11": "2346404",  # camote naranja crudo
    "IMG-14": "2710833",  # mango Tommy Atkins
    "IMG-15": "2346411",  # arándanos
    "IMG-16": "2346394",  # nuez inglesa
    "IMG-17": "2346395",  # nuez pecana
    "IMG-18": "2346396",  # avena en hojuelas
    "IMG-19": "2346410",  # frambuesas
    "IMG-20": "2727581",  # moras
    "IMG-21": "2258586",  # zanahoria madura
    "IMG-22": "2685576",  # remolacha
    "IMG-23": "2710824",  # aguacate Hass
    "IMG-24": "790646",   # cebolla amarilla
    "IMG-25": "2346409",  # fresas
    "IMG-26": "747447",   # brócoli
    "IMG-27": "2258589",  # pimiento amarillo
    "IMG-28": "2258590",  # pimiento rojo
    "IMG-29": "2685573",  # coliflor
    "IMG-30": "746782",   # leche entera
    "IMG-31": "2258588",  # pimiento verde
    "IMG-32": "321360",   # tomate uva (equivalente cherry)
    "IMG-33": "2003601",  # champiñón crimini
    "IMG-34": "2710823",  # espárrago
    "IMG-35": "1999634",  # tomate roma
    "IMG-36": "2685568",  # calabacín
    "IMG-37": "1999629",  # champiñón blanco
    "IMG-39": "2647441",  # queso Oaxaca
    "IMG-40": "2647442",  # queso fresco (equivalente panela)
    "IMG-41": "748967",   # huevo entero
    "IMG-43": "2647438",  # queso Monterey Jack
    "IMG-45": "748608",   # aceite de oliva extra virgen
    "IMG-46": "331960",   # pechuga de pollo cocida
    "IMG-47": "746775",   # sal de mesa yodada
    "IMG-48": "2684442",  # tilapia cruda
    "MX-01": "2758997",   # tortilla de maíz
    "MX-03": "2710835",   # harina de maíz nixtamalizado
    "MX-04": "789890",    # harina de trigo todo uso
    "MX-06": "2758993",   # pan blanco comercial
    "MX-07": "2512380",   # arroz integral crudo
    "MX-17": "2747665",   # rábano rojo
    "MX-18": "2346389",   # lechuga romana
    "MX-19": "1999633",   # espinaca madura
    "MX-27": "2747661",   # chile jalapeño
    "MX-28": "2747663",   # chile serrano
    "MX-29": "2747662",   # chile poblano
    "MX-35": "2727582",   # tomatillo
    "MX-38": "746771",    # naranja navel
    "MX-39": "1105314",   # plátano maduro
    "MX-41": "2346398",   # piña
    "MX-42": "2747675",   # sandía sin semillas
    "MX-43": "746770",    # melón cantalupo
    "MX-47": "2515376",   # cacahuate crudo
    "MX-48": "2346393",   # almendra cruda
    "MX-50": "2515381",   # semilla de girasol cruda
    "MX-51": "2515380",   # pepita de calabaza cruda
    "MX-52": "2646173",   # bistec de res, top round
    "MX-53": "2646168",   # lomo de cerdo
    "MX-56": "2346387",   # crema ácida (equivalente crema mexicana)
    "MX-57": "2647442",   # queso fresco
    "MX-58": "2647443",   # queso cotija
    "MX-59": "2259793",   # yogur natural entero
    "MX-60": "2684443",   # camarón crudo
    "MX-61": "2747669",   # pargo/huachinango
    "MX-63": "334194",    # atún enlatado en agua
    "MX-64": "2646171",   # muslo de pollo crudo
    "MX-66": "746784",    # azúcar granulada
}

ESTIMADOS_EN = {
    "IMG-44": "Vegetable oil blend (1-2-3)",
    "MX-02": "Nixtamalized corn dough (masa)",
    "MX-26": "Annatto (achiote) seed",
    "MX-29": "Poblano pepper, raw",
    "MX-30": "Chipotle pepper, dried",
    "MX-32": "Guajillo pepper, dried",
    "MX-33": "Chile de arbol pepper, dried",
    "MX-34": "Habanero pepper, raw",
    "MX-119": "Pea protein isolate, powder",
}


def read_db():
    s = open(SRC, encoding="utf-8").read()
    return json.loads(s[s.index("{"):s.rindex(";")])


def write_db(db):
    with open(JS, "w", encoding="utf-8") as f:
        f.write("/* Generado por tools/build_data.py. No editar a mano. */\n")
        f.write("window.DB = ")
        json.dump(db, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")


def main():
    db = read_db()
    foods_sr = usda.foods_sr()
    fd_foods = usda.foods_fd()

    # 1) nombre_en en todas las filas (SR Legacy o Foundation)
    for a in db["alimentos"]:
        m = re.search(r"FDC\s+(\d+)", a.get("fuente", ""))
        if m and m.group(1) in foods_sr:
            a["nombre_en"] = foods_sr[m.group(1)]["description"]
        elif m and m.group(1) in fd_foods:
            a["nombre_en"] = fd_foods[m.group(1)]["description"]
        elif a["id"] in ESTIMADOS_EN:
            a["nombre_en"] = ESTIMADOS_EN[a["id"]]
        else:
            a["nombre_en"] = ""

    # 1b) reemplazo por Foundation Foods donde el equivalente es claro
    fd_nut = usda.load_nutrients_fd(MAIN_FD.values())
    numkeys = [c["k"] for c in db["cols"] if c["tipo"] == "num"]
    reemplazados = 0
    for a in db["alimentos"]:
        fid = MAIN_FD.get(a["id"])
        if not fid or fid not in fd_nut:
            continue
        # Foundation manda cuando reporta el nutriente; si no, se conserva el
        # valor de SR Legacy 2018 para no perder datos que la app ya mostraba.
        old = a.get("nutrientes") or {}
        merged = {}
        for k in numkeys:
            fv = fd_nut[fid].get(k)
            merged[k] = fv if fv is not None else old.get(k)
        a["nutrientes"] = merged
        a["fuente"] = "USDA FDC %s (Foundation Foods, 2026-04-30)" % fid
        a["nombre_en"] = fd_foods[fid]["description"]
        reemplazados += 1

    # 2) columna nombre_en, justo después de nombre
    col = {
        "k": "nombre_en",
        "label": "Nombre en inglés (USDA)",
        "unidad": "",
        "desc": "Descripción original del alimento en USDA FoodData Central.",
        "sec": "ident",
        "tipo": "texto",
        "dec": 0,
        "columna": "Nombre en inglés (USDA)",
    }
    keys = [c["k"] for c in db["cols"]]
    if "nombre_en" not in keys:
        i = keys.index("nombre") + 1
        db["cols"].insert(i, col)

    # 3) Sal de mesa yodada (Foundation 746775) y leche deslactosada (Foundation 746778)
    fd = usda.load_nutrients_fd(["746775", "746778"])
    numkeys = [c["k"] for c in db["cols"] if c["tipo"] == "num"]

    sal = next(a for a in db["alimentos"] if a["id"] == "IMG-47")
    sal["nombre"] = "Sal de mesa yodada"
    sal["nombre_en"] = "Salt, table, iodized"
    sal["fuente"] = "USDA FDC 746775 (Foundation Foods, 2026-04-30)"
    sal["notas"] = "Sal de mesa con yodo añadido. La fuente reporta yodo (5,080 µg/100 g) y sodio (38,700 mg/100 g)."
    sal["nutrientes"] = {k: fd["746775"].get(k) for k in numkeys}

    leche = {
        "id": "IMG-49",
        "nombre": "Leche deslactosada semidescremada",
        "nombre_en": "Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D",
        "grupo": "Imagen",
        "categoria": "Lácteos",
        "porcion": 100,
        "unidad": "ml",
        "equiv": "≈ 1 vaso = 250 ml",
        "fuente": "USDA FDC 746778 (Foundation Foods, 2026-04-30)",
        "notas": "Leche de vaca semidescremada (2 % de grasa) tratada con lactasa. Se usa el perfil de leche reducida en grasa al 2 % con vitaminas A y D; la lactasa se hidroliza en glucosa y galactosa, por lo que el azúcar total se conserva.",
        "icono": "iconos/IMG-49-leche-deslactosada.svg",
        "nutrientes": {k: fd["746778"].get(k) for k in numkeys},
        "texto": {"antiox": "", "otros": ""},
    }
    existente = next((a for a in db["alimentos"] if a["id"] == "IMG-49"), None)
    if existente is None:
        db["alimentos"].append(leche)
    else:
        existente.clear()
        existente.update(leche)

    # 4) metadatos
    db["meta"]["version"] = "2.1"
    db["meta"]["generado"] = "2026-10-26"
    db["meta"]["filas"] = len(db["alimentos"])
    db["meta"]["columnas"] = len(db["cols"])
    db["meta"]["fuente"] = "alimentos_nutrientes_mexico.csv + USDA Foundation Foods 2026-04-30"
    db["meta"]["nota"] = ("La base principal parte de SR Legacy 2018 y actualiza 68 alimentos con " 
                          "USDA Foundation Foods 2026-04-30; si Foundation no reporta un nutriente se " 
                          "conserva el valor de SR Legacy. La base extendida se carga aparte.")

    write_db(db)
    faltan = [a["id"] for a in db["alimentos"] if not a.get("nombre_en")]
    print("filas", db["meta"]["filas"], "columnas", db["meta"]["columnas"])
    print("sin nombre_en:", faltan)
    print("sal:", sal["nutrientes"].get("iodine"), "µg yodo;", sal["nutrientes"].get("na"), "mg sodio")
    print("leche:", leche["nutrientes"].get("kcal"), "kcal;", leche["nutrientes"].get("ca"), "mg calcio")


if __name__ == "__main__":
    main()
