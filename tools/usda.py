# -*- coding: utf-8 -*-
"""Utilidades compartidas para leer USDA SR Legacy y Foundation Foods."""
import csv
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
ROOT = os.path.dirname(APP)
SR = os.path.join(ROOT, "data", "sr", "FoodData_Central_sr_legacy_food_csv_2018-04")
FD = os.path.join(ROOT, "data", "foundation", "FoodData_Central_foundation_food_csv_2026-04-30")

# nutrient_id -> clave interna (SR Legacy, igual que scripts/build.py)
NUT_SR = {
    1003: "protein", 1004: "fat", 1005: "carb", 1007: "ash", 1008: "kcal",
    1009: "starch", 1051: "water", 1079: "fiber", 2000: "sugars",
    1087: "ca", 1089: "fe", 1090: "mg", 1091: "p", 1092: "k", 1093: "na",
    1095: "zn", 1098: "cu", 1101: "mn", 1103: "se", 1100: "iodine",
    1096: "chromium", 1102: "molybdenum", 1099: "fluoride",
    1253: "cholesterol", 1258: "sfa", 1292: "mufa", 1293: "pufa",
    1257: "trans", 1316: "la", 1404: "ala", 1278: "epa", 1272: "dha",
    1280: "dpa", 1406: "ara", 1106: "va", 1105: "retinol", 1107: "beta_car",
    1108: "alpha_car", 1120: "beta_cryp", 1122: "lycopene", 1123: "lutein",
    1162: "vc", 1114: "vd", 1109: "ve", 1185: "vk", 1165: "b1", 1166: "b2",
    1167: "b3", 1170: "b5", 1175: "b6", 1176: "biotin", 1190: "folate",
    1178: "b12", 1180: "choline", 1198: "betaine", 1283: "phytosterols",
    1288: "beta_sito", 1057: "caffeine", 1058: "theobromine",
}
FALLBACK_SR = {
    "la": [1269], "ala": [1270], "ara": [1271],
    "sugars": [1063], "folate": [1177],
    "kcal": [2047, 2048],
}

# nutrient_nbr (Foundation) -> clave interna. Los números son estables entre versiones.
NUT_NBR = {
    "203": "protein", "204": "fat", "205": "carb", "207": "ash", "208": "kcal",
    "209": "starch", "255": "water", "291": "fiber", "293": "fiber",
    "269": "sugars", "269.3": "sugars",
    "301": "ca", "303": "fe", "304": "mg", "305": "p", "306": "k", "307": "na",
    "309": "zn", "312": "cu", "315": "mn", "317": "se", "314": "iodine",
    "310": "chromium", "316": "molybdenum", "313": "fluoride",
    "601": "cholesterol", "606": "sfa", "645": "mufa", "646": "pufa",
    "605": "trans", "675": "la", "851": "ala", "629": "epa", "621": "dha",
    "631": "dpa", "620": "ara",
    "320": "va", "319": "retinol", "321": "beta_car", "322": "alpha_car",
    "334": "beta_cryp", "337": "lycopene", "338": "lutein",
    "401": "vc", "328": "vd", "323": "ve", "430": "vk",
    "404": "b1", "405": "b2", "406": "b3", "410": "b5", "415": "b6",
    "416": "biotin", "435": "folate", "418": "b12", "421": "choline",
    "454": "betaine", "636": "phytosterols", "641": "beta_sito",
    "262": "caffeine", "263": "theobromine",
}
FALLBACK_NBR = {
    "sugars": ["269", "269.3"],
    "fiber": ["291", "293"],
    "la": ["675", "618"],
    "ala": ["851", "619"],
    "ara": ["620", "671"],
    "kcal": ["208", "957", "958", "2047", "2048"],
    "folate": ["435", "417"],
    "ve": ["323", "394", "959"],
}


def rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def foods_sr():
    return {r["fdc_id"]: r for r in rows(os.path.join(SR, "food.csv"))}


def cats_sr():
    return {r["id"]: r["description"] for r in rows(os.path.join(SR, "food_category.csv"))}


def foods_fd():
    return {r["fdc_id"]: r for r in rows(os.path.join(FD, "food.csv"))}


def cats_fd():
    return {r["id"]: r["description"] for r in rows(os.path.join(FD, "food_category.csv"))}


def foundation_ids():
    """Los 395 alimentos canónicos de Foundation Foods."""
    return [r["fdc_id"] for r in rows(os.path.join(FD, "foundation_food.csv"))]


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _pick(cands):
    out = {}
    for key, vals in cands.items():
        vals.sort(key=lambda x: x[0])
        out[key] = vals[0][1]
    return out


def load_nutrients_sr(wanted):
    """Devuelve {fdc_id: {clave: valor}} para los IDs pedidos (SR Legacy)."""
    wanted = set(str(x) for x in wanted)
    primary = {}
    for nid, key in NUT_SR.items():
        primary.setdefault(nid, []).append(key)
    fallback = {}
    for key, ids in FALLBACK_SR.items():
        for nid in ids:
            fallback.setdefault(nid, []).append(key)
    cands = {fid: {} for fid in wanted}
    with open(os.path.join(SR, "food_nutrient.csv"), encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            fid = r["fdc_id"]
            if fid not in wanted:
                continue
            nid = _int(r["nutrient_id"])
            val = _num(r["amount"])
            if val is None:
                continue
            for key in primary.get(nid, ()):
                cands[fid].setdefault(key, []).append((0, val))
            for key in fallback.get(nid, ()):
                cands[fid].setdefault(key, []).append((1, val))
    out = {fid: _pick(c) for fid, c in cands.items()}
    _derive(out)
    return out


def load_nutrients_fd(wanted):
    """Devuelve {fdc_id: {clave: valor}} para los IDs pedidos (Foundation Foods)."""
    wanted = set(str(x) for x in wanted)
    nbr = {r["id"]: r["nutrient_nbr"] for r in rows(os.path.join(FD, "nutrient.csv"))}
    primary = {}
    for n, key in NUT_NBR.items():
        primary.setdefault(n, []).append(key)
    fallback = {}
    for key, ids in FALLBACK_NBR.items():
        for n in ids:
            fallback.setdefault(n, []).append(key)
    cands = {fid: {} for fid in wanted}
    with open(os.path.join(FD, "food_nutrient.csv"), encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            fid = r["fdc_id"]
            if fid not in wanted:
                continue
            n = nbr.get(r["nutrient_id"], "")
            val = _num(r["amount"])
            if val is None:
                continue
            for key in primary.get(n, ()):
                cands[fid].setdefault(key, []).append((0, val))
            for key in fallback.get(n, ()):
                cands[fid].setdefault(key, []).append((1, val))
    out = {fid: _pick(c) for fid, c in cands.items()}
    _derive(out)
    return out


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return -1


def _derive(out):
    for d in out.values():
        if "mufa" in d or "pufa" in d:
            d["insat"] = d.get("mufa", 0.0) + d.get("pufa", 0.0)
        if any(k in d for k in ("ala", "epa", "dha", "dpa")):
            d["n3"] = d.get("ala", 0.0) + (d.get("epa", 0.0) + d.get("dha", 0.0) + d.get("dpa", 0.0)) / 1000.0
        if "la" in d or "ara" in d:
            d["n6"] = d.get("la", 0.0) + d.get("ara", 0.0) / 1000.0
        if d.get("n3") and d.get("n6") is not None:
            d["ratio"] = d["n6"] / d["n3"]
        for k, v in list(d.items()):
            if isinstance(v, float):
                d[k] = round(v, 4)


def norm_desc(s):
    s = s.lower()
    s = s.replace("&", " and ")
    s = re.sub(r"\(.*?\)|\[.*?\]", " ", s)
    s = re.sub(r"[^a-z0-9% ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


STOP = set("""
with without added includes include includes food foods usda commodity
commercial commercially prepared ready heat eat serve unprepared refrigerated
frozen canned dry dried dehydrated raw cooked boiled braised broiled roasted
grilled fried baked steamed stewed microwaved toasted reheated condensed chunky
homemade composite retail of the and a an fresh package packaged sliced
separable lean fat trimmed choice select prime all grades grade bone in boneless
skinless skin meat only for distribution program prepackaged or deli
""".split())


def tokens(s):
    return [t for t in norm_desc(s).split() if t not in STOP and not re.match(r"^[\d.%/]+$", t)]


def key_desc(s):
    return " ".join(tokens(s))
