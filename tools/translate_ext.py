# -*- coding: utf-8 -*-
"""Traduce al español los nombres de la base extendida USDA.

- Lee data/alimentos_ext.js.
- Usa una caché local (tools/nombres_es.json) para que la app y los builds
  posteriores funcionen sin internet.
- Solo llama a Google Translate para nombres que aún no están en la caché.
- Conserva el nombre original de USDA en `nombre_en`.

Uso:
    py tools/translate_ext.py            # traduce lo que falte y aplica
    py tools/translate_ext.py --sample 20
    py tools/translate_ext.py --refresh  # vuelve a traducir todo
"""
import argparse
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
JS = os.path.join(APP, "data", "alimentos_ext.js")
CACHE = os.path.join(HERE, "nombres_es.json")
REVIEW = os.path.join(HERE, "nombres_es_review.txt")

# Correcciones puntuales para descripciones completas (clave = texto USDA).
FULL = {
    "Pork sausage rice links, brown and serve, cooked":
        "Salchichas de cerdo con arroz, listas para dorar y servir, cocidas",
    "Chickpeas (garbanzo beans, bengal gram), canned, sodium added, drained and rinsed":
        "Garbanzos, enlatados, con sodio añadido, escurridos y enjuagados",
    "Macaroni and cheese, dry mix, prepared with 2% milk and 80% stick margarine from dry mix":
        "Macarrones con queso, mezcla seca, preparados con leche al 2% y margarina en barra al 80% de la mezcla seca",
    "Chicken, broilers or fryers, drumstick, meat only, cooked, braised":
        "Pollo, asadero o freidor, muslo, solo carne, cocido, estofado",
}

# Reemplazos generales después de la traducción automática.
REPL = [
    (r"\bsólo\b", "solo"),
    (r"\bSólo\b", "Solo"),
    (r"\s+([\"”])", r"\1"),
    (r"(\d)\s*\"\s*de\s+grasa", r'\1" de grasa'),
    (r"\bal microondas\b", "en microondas"),
    (r"\bdorados y servidos\b", "listos para dorar y servir"),
    (r"\bdorado y servir\b", "listo para dorar y servir"),
    (r"\bpara asar o freír\b", "asadero o freidor"),
    (r"\bpara todo uso\b", "de uso general"),
    (r"\bno enriquecida\b", "sin enriquecer"),
    (r"\bno enriquecido\b", "sin enriquecer"),
    (r"\bmezcla de jugo\b", "jugo"),
    (r"\b2% de leche\b", "leche al 2%"),
    (r"\b1% de leche\b", "leche al 1%"),
    (r"\bsin grasa de leche\b", "leche descremada"),
    (r"\bcon sabor y endulzada\b", "saborizada y endulzada"),
    (r"\blisto para servir\b", "lista para servir"),
    (r"\blistas para servir\b", "listas para servir"),
    (r"\bcomida rápida\b", "comida rápida"),
    (r"\bperro caliente\b", "hot dog"),
    (r"\bsalchicha de Viena\b", "salchicha vienesa"),
    (r"\bsnacks\b", "botanas"),
    (r"\bsnack\b", "botana"),
    (r"\bla elección\b", "calidad Choice"),
    (r"\belección\b", "calidad Choice"),
    (r"\belegido\b", "calidad Choice"),
    (r"\bselecto\b", "calidad Select"),
    (r"\bCarne de res, pechuga\b", "Carne de res, falda"),
    (r"\basado de tres puntas\b", "tri-tip"),
    (r"\bNovedades Frozen\b", "Novedades congeladas"),
    (r"\bzumos\b", "jugos"),
    (r"\bzumo\b", "jugo"),
    (r"\bpatatas\b", "papas"),
    (r"\bpatata\b", "papa"),
    (r"\byogurt\b", "yogur"),
    (r"\bAperitivos\b", "Botanas"),
    (r"^Merienda\b", "Botana"),
    (r"^Bebidas, [Bb]ebida", "Bebida"),
    (r"\bBocadillos\b", "Botanas"),
    (r"\bsirope\b", "jarabe"),
    (r"\bsoja\b", "soya"),
    (r"\bchocolate rico\b", "chocolate intenso"),
    (r"^Caramelos, caramelos,", "Caramelos,"),
    (r"^Helado, helado suave", "Helado, servido suave"),
    (r"^Yogures helados, chocolate, helados", "Yogures helados, chocolate, servido suave"),
    (r"\bsin leche, chocolate\b", "sin grasa láctea, chocolate"),
    (r"\bregular, todas(?! las clases)\b", "regular, todas las clases"),
    (r"\bcocido, cocido a fuego lento\b", "cocido a fuego lento"),
    (r"^Caramelos, panecillos sabor chocolate", "Caramelos, rollo sabor chocolate"),
]

ENGLISH_WORDS = set("""
raw cooked canned frozen dried fresh prepared unprepared ready serve serving
with without and or only added reduced low fat fats lean separable trimmed
boneless skinless whole part pieces ground roasted boiled braised stewed
fried baked broiled microwaved simmered steamed grilled toasted uncooked
salted unsalted sweetened unsweetened fortified enriched unenriched
plain regular instant powder liquid concentrate condensed dehydrated
includes include includes variety varieties flavor flavored flavoring
beverage beverages drink drinks juice juices soup soups sauce sauces gravy
snack snacks candy candies bread breads roll rolls bun buns cake cakes pie
pies cookie cookies cracker crackers cereal cereals grain grains flour
rice pasta noodle noodles meat meats poultry chicken turkey duck goose
beef pork lamb veal fish seafood shrimp crab lobster tuna salmon egg eggs
cheese milk yogurt cream butter margarine oil oils shortening lard
bean beans pea peas lentil lentils nut nuts seed seeds peanut peanuts
almond almonds walnut walnuts pecan pecans cashew cashews pistachio
vegetable vegetables fruit fruits potato potatoes tomato tomatoes onion
onions garlic pepper peppers salt sugar honey syrup water soda beer wine
whiskey vodka rum gin liqueur coffee tea cocoa chocolate vanilla cinnamon
""".split())

STOP_EN = re.compile(r"\b(" + "|".join(sorted(ENGLISH_WORDS, key=len, reverse=True)) + r")\b", re.I)


def read_db():
    s = io.open(JS, encoding="utf-8").read()
    return json.loads(s[s.index("{"):s.rindex(";")])


def write_db(db):
    with io.open(JS, "w", encoding="utf-8") as f:
        f.write("/* Generado por tools/build_ext.py. No editar a mano. */\n")
        f.write("window.DB_EXT = ")
        json.dump(db, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")


def clean(es, en):
    es = (es or "").strip()
    es = re.sub(r"\s+", " ", es)
    es = es.rstrip(" .;")
    for pat, rep in REPL:
        es = re.sub(pat, rep, es, flags=re.I)
    if es and es[0].islower():
        es = es[0].upper() + es[1:]
    return es


def google(q):
    url = ("https://translate.googleapis.com/translate_a/single"
           "?client=gtx&sl=en&tl=es&dt=t&q=" + urllib.parse.quote(q))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        data = json.loads(r.read().decode("utf-8"))
    return "".join(part[0] for part in data[0] if part and part[0])


def translate(q, tries=4):
    for i in range(tries):
        try:
            return clean(google(q), q)
        except Exception as e:
            if i == tries - 1:
                print("  ! fallo:", q[:70], "->", e, file=sys.stderr)
                return ""
            time.sleep(1.5 * (i + 1))
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=0)
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--no-apply", action="store_true")
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()

    db = read_db()
    foods = db["alimentos"]
    names = [a.get("nombre_en") or a["nombre"] for a in foods]
    unique = list(dict.fromkeys(names))

    if args.sample:
        for q in unique[:args.sample]:
            print("EN:", q)
            print("ES:", translate(q))
            print()
        return

    cache = {}
    if os.path.exists(CACHE):
        cache = json.loads(io.open(CACHE, encoding="utf-8").read())

    todo = [q for q in unique if args.refresh or q not in cache or not cache[q]]
    print("Nombres únicos:", len(unique), "| en caché:", len(unique) - len(todo),
          "| a traducir:", len(todo), "| hilos:", args.workers)

    def save_cache():
        with io.open(CACHE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=1, sort_keys=True)

    failed = 0
    if todo:
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
            futures = {ex.submit(translate, q): q for q in todo}
            for done, fut in enumerate(as_completed(futures), 1):
                q = futures[fut]
                try:
                    es = fut.result()
                except Exception as e:
                    es = ""
                    print("  ! excepción:", q[:70], e, file=sys.stderr)
                if es:
                    cache[q] = es
                else:
                    failed += 1
                if done % 25 == 0 or done == len(todo):
                    print("  %d/%d (fallos %d)" % (done, len(todo), failed))
                    save_cache()
        save_cache()
    print("Traducidos:", len(todo) - failed, "| fallos:", failed)

    # Aplicar correcciones puntuales y limpieza final a toda la caché.
    for en, es in FULL.items():
        cache[en] = es
    for en in unique:
        if cache.get(en):
            cache[en] = clean(cache[en], en)
    save_cache()

    # Detectar posibles restos de inglés.
    flagged = []
    for en in unique:
        es = cache.get(en, "")
        if not es:
            flagged.append((en, "(sin traducción)"))
            continue
        m = STOP_EN.search(es)
        if m and m.group(0).lower() not in ("gin", "rum", "tea", "fat", "low"):
            flagged.append((en, es))
    with io.open(REVIEW, "w", encoding="utf-8") as f:
        for en, es in flagged:
            f.write("EN: %s\nES: %s\n\n" % (en, es))
    print("Posibles restos de inglés:", len(flagged), "->", REVIEW)

    if args.no_apply:
        return

    # Asignar nombre español y conservar el inglés USDA.
    missing = 0
    for a in foods:
        en = a.get("nombre_en") or a["nombre"]
        es = cache.get(en, "")
        if es:
            a["nombre"] = es
        else:
            missing += 1
        a["nombre_en"] = en

    # Duplicados de nombre español: añadir un matiz del inglés.
    seen = {}
    dups = []
    for a in foods:
        key = a["nombre"].strip().lower()
        if key in seen:
            dups.append(a)
        else:
            seen[key] = a
    for a in dups:
        a["nombre"] = a["nombre"] + " (" + a["nombre_en"] + ")"
    print("Sin traducción:", missing, "| duplicados ajustados:", len(dups))

    db["meta"]["version"] = "2.1"
    db["meta"]["generado"] = "2026-10-26"
    db["meta"]["nota"] = ("Base extendida curada: nombres en español para consulta y "
                          "descripción original de USDA en «nombre_en». Se activa desde "
                          "el catálogo o la calculadora de comida.")
    db["alimentos"].sort(key=lambda a: (a["categoria"], a["nombre"].lower()))
    write_db(db)
    print("Escrito:", JS)


if __name__ == "__main__":
    main()
