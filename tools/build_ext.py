# -*- coding: utf-8 -*-
"""Genera data/alimentos_ext.js: base extendida de alimentos USDA (SR Legacy + Foundation)."""
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import usda

JS_MAIN = os.path.join(usda.APP, "data", "alimentos.js")
JS_EXT = os.path.join(usda.APP, "data", "alimentos_ext.js")
NAMES_ES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nombres_es.json")

CATS = {
    "Dairy and Egg Products": ("Lácteos y huevos", "lacteos"),
    "Spices and Herbs": ("Especias y hierbas", "especias"),
    "Fats and Oils": ("Grasas y aceites", "grasas"),
    "Poultry Products": ("Aves", "aves"),
    "Soups, Sauces, and Gravies": ("Sopas, salsas y caldos", "sopas"),
    "Sausages and Luncheon Meats": ("Embutidos y carnes frías", "embutidos"),
    "Breakfast Cereals": ("Cereales de desayuno", "desayuno"),
    "Fruits and Fruit Juices": ("Frutas y jugos", "frutas"),
    "Pork Products": ("Carnes de cerdo", "cerdo"),
    "Vegetables and Vegetable Products": ("Verduras", "verduras"),
    "Nut and Seed Products": ("Frutos secos y semillas", "frutos-secos"),
    "Beef Products": ("Carnes de res", "res"),
    "Beverages": ("Bebidas", "bebidas"),
    "Finfish and Shellfish Products": ("Pescados y mariscos", "pescados"),
    "Legumes and Legume Products": ("Leguminosas", "leguminosas"),
    "Lamb, Veal, and Game Products": ("Cordero y caza", "cordero"),
    "Baked Products": ("Panadería y repostería", "panaderia"),
    "Sweets": ("Dulces y postres", "dulces"),
    "Cereal Grains and Pasta": ("Cereales y pasta", "cereales"),
    "Fast Foods": ("Comida rápida", "rapida"),
    "Meals, Entrees, and Side Dishes": ("Platillos preparados", "platillos"),
    "Snacks": ("Botanas", "botanas"),
    "Alcoholic Beverages": ("Bebidas alcohólicas", "alcohol"),
}

EXCLUDE_CATS = {
    "Baby Foods", "American Indian/Alaska Native Foods", "Restaurant Foods",
    "Branded Food Products Database", "Quality Control Materials",
}

BRANDS = [
    "PILLSBURY", "KRAFT", "GEORGE WESTON", "THOMAS", "KELLOGG", "POST", "QUAKER",
    "GENERAL MILLS", "KASHI", "WEETABIX", "ALPEN", "FAMILIA", "NABISCO", "KEEBLER",
    "PEPPERIDGE", "SARA LEE", "HOSTESS", "LITTLE DEBBIE", "AUNT JEMIMA", "BISQUICK",
    "BETTY CROCKER", "DUNCAN HINES", "PAM", "CRISCO", "DOMINO", "C&H", "LAND O LAKES",
    "MCDONALD", "BURGER KING", "WENDY", "SUBWAY", "TACO BELL", "KFC", "CHICK-FIL-A",
    "PIZZA HUT", "DOMINO'S", "STARBUCKS", "DUNKIN", "DENNY", "CRACKER BARREL",
    "ON THE BORDER", "APPLEBEE", "CHILI'S", "T.G.I.", "OLIVE GARDEN", "RED LOBSTER",
    "ARBY", "JACK IN THE BOX", "SONIC", "DAIRY QUEEN", "HARDEE", "CARL'S JR",
    "WHITE CASTLE", "POPEYES", "PANDA EXPRESS", "CHIPOTLE", "QDOBA", "DEL TACO",
    "CAMPBELL", "PROGRESSO", "HEINZ", "HUNT", "RAGU", "PREGO", "CLASSICO", "BERTOLI",
    "BARILLA", "RONZONI", "CREAM OF WHEAT", "CHEERIOS", "SPECIAL K", "FROSTED",
    "CAP'N CRUNCH", "FRUITY PEBBLES", "COCOA PUFFS", "RICE KRISPIES", "CORN FLAKES",
    "NUTRI-GRAIN", "EGGO", "SMUCKER", "WELCH", "OCEAN SPRAY",
    "TROPICANA", "MINUTE MAID", "GATORADE", "POWERADE", "RED BULL", "MONSTER",
    "COCA-COLA", "PEPSI", "DR PEPPER", "SPRITE", "7UP", "MOUNTAIN DEW",
    "BUDWEISER", "MILLER", "COORS", "HEINEKEN", "CORONA", "JOSE CUERVO",
    "SMIRNOFF", "BACARDI", "JACK DANIEL", "JIM BEAM", "ABSOLUT",
    "ENSURE", "BOOST", "SLIM FAST", "MET-RX", "MUSCLE MILK", "CLIF", "LUNA",
    "KIND", "NATURE VALLEY", "HONEY BUNCHES", "GREAT GRAINS",
    "CHEX", "WEIGHT WATCHERS", "LEAN CUISINE", "STOUFFER", "MARIE CALLENDER",
    "BANQUET", "HOT POCKET", "BAGEL BITES", "PIZZA ROLLS", "TOTINO",
    "HEALTH VALLEY", "SUN COUNTRY", "KRETSCHMER", "WHEATENA", "UNCLE BEN",
    "READY CRUST", "NESTLE", "ALMOND JOY", "TWIZZLERS", "BIT-O'-HONEY",
    "BUTTERFINGER", "HERSHEY", "MARS", "SNICKERS", "M&M", "REESE", "KIT KAT",
    "OREO", "CHIPS AHOY", "RITZ", "TRISCUIT", "WHEAT THINS", "DORITOS", "LAYS",
    "FRITOS", "CHEETOS", "RUFFLES", "PRINGLES", "TOSITOS", "SABRITAS",
    "GOYA", "GAMESA", "LA MODERNA", "ANDREA", "CRUNCHMASTER", "GLUTINO",
    "BETTY", "SUNBEAM", "WONDER",
]

EXCLUDE_PAT = [
    r"\bbabyfood\b", r"\binfant formula\b", r"\btoddler\b", r"\bjunior\b", r"\bstrain(ed)?\b",
    r"\bteething\b", r"\busda commodity\b", r"\bschool lunch\b", r"\bmilitary\b",
    r"\bimitation\b", r"\bcream substitute\b", r"\bwhipped topping\b", r"\bnon-soy\b",
    r"\balaska native\b", r"\bapache\b", r"\bnavajo\b", r"\bpapago\b", r"\bpima\b",
    r"\bseaweed\b", r"\bkelp\b", r"\bagar\b", r"\bcarrageenan\b",
    r"\bsisymbrium\b", r"\blotus seed\b", r"\bpilinut\b", r"\bsapucaia\b", r"\bbeechnut\b",
    r"\bwater chestnut\b", r"\bbreadfruit\b", r"\bjava plum\b", r"\bgoji\b",
    r"\belderberr", r"\bchokecherry\b", r"\bserviceberry\b", r"\bhighbush\b",
    r"\blowbush\b", r"\bgooseberr", r"\bcurrant\b",
    r"\bbrain\b", r"\bkidney\b", r"\bheart\b", r"\blungs?\b", r"\bpancreas\b", r"\bspleen\b",
    r"\bstomach\b", r"\btripe\b", r"\btongue\b", r"\bintestine\b", r"\bchitterlings\b",
    r"\bfeet\b", r"\bjowl\b", r"\btail\b", r"\bears?\b", r"\bhead\b", r"\bsnout\b",
    r"\bbackfat\b", r"\bseparable fat\b", r"\bretail cuts\b", r"\bfat only\b",
    r"\bmechanically separated\b", r"\bdehydrated\b", r"\bfreeze-dried\b",
    r"\bjuice concentrate\b", r"\bconcentrate\b",
    r"\bbear\b", r"\bbeaver\b", r"\bmuskrat\b", r"\boppossum\b", r"\braccoon\b",
    r"\bsquirrel\b", r"\bturtle\b", r"\bfrog\b", r"\bjellyfish\b", r"\bsnail\b",
    r"\bseal\b", r"\bwhale\b", r"\bwalrus\b", r"\bowl\b", r"\bcaribou\b",
    r"\bantelope\b", r"\belk\b", r"\bemu\b", r"\bostrich\b", r"\bpheasant\b",
    r"\bdove\b", r"\bsquab\b", r"\bguinea hen\b", r"\bquail\b",
    r"\bburbot\b", r"\bcisco\b", r"\bbutterfish\b", r"\bcarp\b", r"\bcusk\b",
    r"\bbluefish\b", r"\bstriped bass\b", r"\bcroaker\b", r"\bmonkfish\b",
    r"\bshark\b", r"\bray\b", r"\bskate\b", r"\beel\b", r"\bconch\b", r"\babalone\b",
    r"\bwhelk\b", r"\bperiwinkle\b",
    r"\bmeatless\b", r"\bvegetarian\b", r"\bvegan\b",
    r"\btofu yogurt\b", r"\bpapad\b", r"\blupins?\b", r"\bmothbeans?\b", r"\bmungo\b",
    r"\brhubarb\b", r"\bpummelo\b", r"\bsapodilla\b", r"\bsoursop\b",
    r"\bgefiltefish\b", r"\bhearts of palm\b", r"\byeast extract\b",
    r"\balfalfa seeds\b", r"\bamaranth leaves\b", r"\bturnip greens\b",
    r"\bdandelion greens\b", r"\bmustard greens\b", r"\bcollards?\b",
    r"\bchrysanthemum\b", r"\bborage\b", r"\bdock\b", r"\blambsquarters\b",
    r"\bpurslane\b", r"\bwatercress\b", r"\btaro\b", r"\byam\b",
    r"\bseitan\b", r"\bnatto\b", r"\bmiso\b", r"\btempeh\b",
    r"\brestaurant\b", r"\bgoose\b", r"\bacerola\b", r"\bfish oil\b",
    r"\bcod liver oil\b", r"\bformulated bar\b", r"\bmeal replacement\b",
    r"\bbutter replacement\b", r"\bprotein bar\b", r"\bpower bar\b",
    r"\bslim-fast\b", r"\bsouth beach\b", r"\bmalt-o-meal\b",
    r"\bcomposite\b", r"\bcarcass\b", r"\bseam fat\b", r"\bjellied\b",
    r"\bgame meat\b", r"\bboar\b", r"\bdeer\b", r"\bvenison\b", r"\bbison\b",
    r"\bbuffalo\b", r"\brabbit\b", r"\bacorns?\b", r"\bchestnut\b",
    r"\bexternal fat\b", r"\bacai\b", r"\baloe\b", r"\barrowroot\b",
    r"\bbrand\b", r"\bformulated\b",
]

COMMON = {
    "Fruits and Fruit Juices": """
        apple applesauce apricot avocado banana blackberry blueberry cantaloupe cherry
        cranberry date fig grape grapefruit guava honeydew kiwi lemon lime lychee mango
        melon nectarine orange papaya peach pear persimmon pineapple plantain plum
        pomegranate prickly pear prune raisin raspberry strawberry tangerine watermelon
        tamarind sapote mamey soursop cherimoya passion fruit coconut olive juice
    """,
    "Vegetables and Vegetable Products": """
        artichoke arugula asparagus avocado bamboo beet bell pepper bok choy broccoli
        brussels sprout cabbage carrot cauliflower celery chard chile corn cucumber
        eggplant endive fennel garlic green bean green pea jicama kale kohlrabi leek
        lettuce mushroom nopales okra onion parsley parsnip pea pepper potato pumpkin
        radicchio radish rutabaga scallion shallot spinach squash sweet potato tomatillo
        tomato turnip zucchini chayote cassava yuca sprout olive pickle sauerkraut
        corn salad coleslaw
    """,
    "Dairy and Egg Products": """
        milk cheese yogurt cream butter egg buttermilk kefir cottage ricotta mozzarella
        cheddar parmesan swiss provolone american feta blue gouda brie camembert
        manchego queso sour cream half-and-half evaporated condensed goat sheep
        lactose-free almond milk soy milk oat milk rice milk coconut milk whipped cream
    """,
    "Spices and Herbs": """
        salt pepper garlic onion cumin oregano thyme cinnamon paprika chili cayenne
        turmeric ginger nutmeg cloves bay leaf coriander parsley basil dill rosemary
        sage saffron curry powder vanilla baking powder baking soda yeast cocoa
        allspice anise caraway cardamom celery seed chervil chives fennel fenugreek
        horseradish juniper mace marjoram mint mustard seed poppy seed savory sesame
        tarragon
    """,
    "Fats and Oils": """
        oil butter margarine lard shortening mayonnaise salad dressing vinegar ketchup
        mustard soy sauce hot sauce salsa tomato sauce pasta sauce gravy barbecue ranch
        italian french thousand island blue cheese vinaigrette tartar pesto hummus
        peanut butter coconut oil olive oil canola vegetable sunflower safflower
        sesame peanut corn flaxseed avocado palm cooking spray
    """,
    "Poultry Products": """
        chicken turkey duck goose hen breast thigh wing drumstick ground liver tender
        nugget whole rotisserie
    """,
    "Soups, Sauces, and Gravies": """
        soup broth stock bouillon gravy sauce salsa ketchup mustard mayonnaise soy sauce
        vinegar dressing pesto tomato sauce pasta sauce alfredo cheese sauce chili curry
        barbecue teriyaki hot sauce tabasco worcestershire oyster sauce fish sauce
        hoisin plum sauce sweet and sour
    """,
    "Sausages and Luncheon Meats": """
        bacon ham sausage frankfurter hot dog bologna salami pepperoni pastrami
        corned beef prosciutto chorizo mortadella liverwurst spam luncheon bratwurst
        knockwurst kielbasa andouille italian sausage breakfast sausage
    """,
    "Breakfast Cereals": """
        cereal oats oatmeal granola muesli bran corn flakes wheat flakes puffed grits
        farina cream of wheat wheat germ raisin bran shredded wheat cheerios special k
        frosted flakes fruit loops cocoa puffs rice krispies cap'n crunch honey bunches
        grape nuts all-bran fiber one total wheaties kashi nature valley quaker
    """,
    "Nut and Seed Products": """
        almond walnut pecan cashew pistachio peanut hazelnut macadamia brazil nut pine nut
        chestnut coconut sunflower pumpkin seed sesame flax chia hemp poppy safflower
        cottonseed mixed nuts trail mix nut butter seed butter tahini
    """,
    "Beef Products": """
        ground steak roast brisket rib tenderloin sirloin flank skirt chuck round liver
        short rib prime rib filet strip t-bone porterhouse tri-tip oxtail beef
    """,
    "Beverages": """
        water coffee tea soda cola lemonade limeade juice smoothie milkshake hot chocolate
        cocoa beer wine liquor vodka rum whiskey tequila gin brandy cocktail margarita
        mojito pina colada sports drink energy drink electrolyte coconut water almond milk
        soy milk oat milk rice milk horchata agua fresca refresco nectar cider champagne
        sake sangria
    """,
    "Pork Products": """
        pork chop loin tenderloin shoulder butt belly ribs ham bacon sausage ground
        roast cutlet hock
    """,
    "Alcoholic Beverages": """
        beer wine liquor vodka rum whiskey tequila gin brandy cocktail margarita
        mojito pina colada champagne sake sangria liqueur
    """,
    "Finfish and Shellfish Products": """
        salmon tuna cod tilapia trout halibut sardine mackerel catfish bass snapper
        mahimahi swordfish shrimp crab lobster oyster clam mussel scallop squid octopus
        anchovy herring pollock haddock flounder sole sea bass crawfish crayfish
    """,
    "Legumes and Legume Products": """
        bean lentil pea chickpea garbanzo soybean soy tofu tempeh edamame peanut hummus
        falafel refried black bean kidney bean pinto navy lima fava mung adzuki split pea
        black-eyed pea baked beans chili
    """,
    "Lamb, Veal, and Game Products": """
        lamb veal goat rabbit venison deer bison buffalo boar
    """,
    "Baked Products": """
        bread bagel baguette roll bun tortilla pita naan croissant muffin biscuit scone
        waffle pancake french toast cake cupcake cookie brownie pie tart pastry donut
        doughnut cinnamon roll cornbread cracker graham pretzel tostada taco shell
        breadstick focaccia sourdough rye whole wheat white bread multigrain english
        muffin pumpernickel brioche challah matzo
    """,
    "Sweets": """
        chocolate candy caramel fudge honey sugar syrup jam jelly marmalade ice cream
        frozen yogurt sherbet sorbet pudding custard flan cake cookie brownie pie donut
        pastry granola bar fruit leather marshmallow nougat toffee brittle gum lollipop
        popsicle sweet
    """,
    "Cereal Grains and Pasta": """
        rice pasta spaghetti macaroni penne fusilli lasagna noodle ramen vermicelli
        couscous quinoa barley bulgur millet oats cornmeal polenta grits flour wheat rye
        buckwheat sorghum amaranth teff wild rice basmati jasmine arborio sushi rice
        egg noodle rice noodle soba udon orzo gnocchi semolina farro spelt freekeh
    """,
    "Fast Foods": """
        hamburger cheeseburger fries pizza taco burrito quesadilla nachos sandwich hot dog
        chicken nugget fried chicken onion ring milkshake salad soup sub wrap enchilada
        tamale fajita tostada chimichanga empanada arepa pupusa plantain yuca fries elote
        tortilla chip guacamole salsa
    """,
    "Meals, Entrees, and Side Dishes": """
        lasagna macaroni and cheese pizza salisbury steak pot pie enchilada tamale burrito
        rice mix pasta mix soup chili stew curry meatloaf stuffed pepper casserole
        frozen dinner tv dinner ramen noodle rice and beans beans and rice
    """,
    "Snacks": """
        chips tortilla chip corn chip potato chip popcorn pretzel cracker granola bar
        trail mix nuts rice cake beef jerky pork rind cheese puff snack cookie candy
        chocolate fruit leather yogurt covered hummus salsa guacamole
    """,
}

QUAL = set("""
separable lean fat trimmed choice select prime all grades grade bone in boneless skinless skin
meat only with without added includes foods for usda s distribution program prepackaged or deli
commercially prepared ready heat eat serve unprepared refrigerated frozen canned dry dried dehydrated
raw cooked boiled braised broiled roasted grilled fried baked steamed stewed microwaved toasted reheated
condensed chunky homemade composite retail of the and a an fresh broilers fryers roasting hens hen tom
stick sticks sliced whipped tub block wedge shredded grated pre-sliced
""".split())

STATE_WORDS = [
    "raw", "cooked", "boiled", "braised", "broiled", "roasted", "grilled", "fried",
    "baked", "steamed", "stewed", "microwaved", "toasted", "reheated", "canned",
    "frozen", "dried", "dehydrated", "prepared", "unprepared", "ready-to-heat",
    "ready-to-serve", "pasteurized", "smoked", "salted", "unsalted",
]


def tokens(desc):
    d = desc.lower()
    d = re.sub(r"\(.*?\)", " ", d)
    d = re.sub(r"\[.*?\]", " ", d)
    d = re.sub(r"[^a-z0-9% ]", " ", d)
    out = []
    for t in d.split():
        if t in QUAL:
            continue
        if re.match(r"^[\d.%/]+$", t):
            continue
        out.append(t)
    return out


def stem(t):
    if t.endswith("ies") and len(t) > 4:
        return t[:-3] + "y"
    if t.endswith("oes") and len(t) > 4:
        return t[:-2]
    if t.endswith("es") and len(t) > 4:
        return t[:-2]
    if t.endswith("s") and len(t) > 3:
        return t[:-1]
    return t


def base_key(desc, cat):
    t = tokens(desc)
    if not t:
        return desc.lower()
    if cat in ("Beef Products", "Pork Products", "Poultry Products", "Lamb, Veal, and Game Products",
               "Finfish and Shellfish Products", "Sausages and Luncheon Meats"):
        return " ".join(t[:3])
    if cat == "Fruits and Fruit Juices":
        return stem(t[0])
    if cat == "Vegetables and Vegetable Products":
        return " ".join(stem(x) for x in t[:2])
    return " ".join(t[:3])


def state_of(desc):
    d = desc.lower()
    for w in STATE_WORDS:
        if re.search(r"\b" + re.escape(w) + r"\b", d):
            return w
    return ""


def score(desc):
    d = desc.lower()
    s = 0
    if "raw" in d: s += 8
    if "cooked" in d: s += 6
    if "plain" in d or "regular" in d: s += 4
    if "with salt" in d or "salted" in d: s += 2
    if "commercial" in d: s += 1
    for w in ("low", "reduced", "free", "nonfat", "lowfat", "light", "unsalted", "no salt", "without salt"):
        if w in d: s -= 14
    if "canned" in d or "frozen" in d: s -= 4
    if "dry" in d or "dried" in d: s -= 2
    if "baby" in d: s -= 20
    s -= len(desc) / 160.0
    return s


def has_brand(desc):
    u = desc.upper()
    if re.search(r"[A-Za-z]'s\b", desc) or "®" in desc or "™" in desc:
        return True
    for b in BRANDS:
        if b in u:
            return True
    # Marcas comerciales suelen aparecer en MAYÚSCULAS dentro de la descripción.
    for tok in re.findall(r"\b[A-Z][A-Z0-9&'.-]{2,}\b", desc):
        if tok in ("USDA", "UHT", "DHA", "EPA", "MSG", "RTE", "MRE"):
            continue
        return True
    return False


def nkey(desc):
    return " ".join(stem(t) for t in usda.tokens(desc))


def coarse_key(desc):
    t = [stem(x) for x in usda.tokens(desc.replace("Game meat", ""))]
    return " ".join(t[:2])


def overlap_main(key, main_sets):
    a = set(key.split())
    if not a:
        return False
    for b in main_sets:
        if not b:
            continue
        inter = len(a & b)
        if inter >= 2 and inter / min(len(a), len(b)) >= 0.8:
            return True
    return False


def common(f, cats):
    cat = cats.get(f["food_category_id"], "")
    terms = COMMON.get(cat)
    if not terms:
        return False
    d = f["description"].lower()
    for t in terms.split():
        if re.search(r"\b" + re.escape(t) + r"\b", d):
            return True
    return False


def keep(f, cats, main_ids, main_sets):
    cat = cats.get(f["food_category_id"], "")
    if cat in EXCLUDE_CATS or cat not in CATS:
        return False
    if f["fdc_id"] in main_ids:
        return False
    d = f["description"]
    if len(d) > 120:
        return False
    if has_brand(d):
        return False
    low = d.lower()
    for pat in EXCLUDE_PAT:
        if re.search(pat, low):
            return False
    if overlap_main(nkey(d), main_sets):
        return False
    return common(f, cats)


def keep_fd(f, cats, main_ids, main_sets):
    cat = cats.get(f["food_category_id"], "")
    if cat in EXCLUDE_CATS or cat not in CATS:
        return False
    if f["fdc_id"] in main_ids:
        return False
    d = f["description"]
    if len(d) > 120 or has_brand(d):
        return False
    low = d.lower()
    for pat in EXCLUDE_PAT:
        if re.search(pat, low):
            return False
    if overlap_main(nkey(d), main_sets):
        return False
    return True


# Límites por categoría: evita que categorías con cientos de variantes dominen la base.
CAPS = {
    "Baked Products": 130,
    "Soups, Sauces, and Gravies": 150,
    "Fats and Oils": 120,
    "Sweets": 110,
    "Beverages": 110,
    "Sausages and Luncheon Meats": 95,
    "Poultry Products": 100,
    "Legumes and Legume Products": 110,
    "Snacks": 80,
    "Fast Foods": 75,
    "Lamb, Veal, and Game Products": 55,
    "Meals, Entrees, and Side Dishes": 65,
    "Vegetables and Vegetable Products": 160,
    "Dairy and Egg Products": 180,
    "Fruits and Fruit Juices": 110,
    "Cereal Grains and Pasta": 90,
    "Nut and Seed Products": 85,
    "Beef Products": 90,
    "Pork Products": 80,
    "Finfish and Shellfish Products": 80,
    "Spices and Herbs": 60,
    "Breakfast Cereals": 45,
    "Alcoholic Beverages": 40,
}


def curate_sr(foods, cats, main_ids, main_sets):
    cand = [f for f in foods if keep(f, cats, main_ids, main_sets)]
    bykey = collections.defaultdict(list)
    for f in cand:
        cat = cats.get(f["food_category_id"], "")
        bykey[(cat, base_key(f["description"], cat))].append(f)

    chosen = collections.defaultdict(list)
    for (cat, key), arr in bykey.items():
        arr.sort(key=lambda f: score(f["description"]), reverse=True)
        states = set()
        for f in arr:
            st = state_of(f["description"])
            if st in states:
                continue
            states.add(st)
            chosen[cat].append(f)
            if len(states) >= 2:
                break

    out = []
    for cat, arr in chosen.items():
        arr.sort(key=lambda f: score(f["description"]), reverse=True)
        out.extend(arr[:CAPS.get(cat, 200)])
    return out


def main_food_ids(db):
    ids = set()
    for a in db["alimentos"]:
        m = re.search(r"FDC\s+(\d+)", a.get("fuente", ""))
        if m:
            ids.add(m.group(1))
    return ids


def main_keys(db):
    out = []
    for a in db["alimentos"]:
        for name in (a.get("nombre_en"), a["nombre"]):
            if name:
                out.append(set(nkey(name).split()))
    return out


def resolve_cat(desc, cat_en):
    low = desc.lower()
    if "alcoholic beverage" in low or re.match(r"^(beer|wine|whiskey|vodka|rum|gin|tequila|liqueur)\b", low):
        return ("Bebidas alcohólicas", "alcohol")
    return CATS[cat_en]


def make_food(fid, desc, cat_en, nut, numkeys):
    cat_es, icon = resolve_cat(desc, cat_en)
    d = nut.get(fid, {})
    low = desc.lower()
    liquid = cat_en in ("Beverages", "Alcoholic Beverages") or "milk" in low or "juice" in low
    food = {
        "id": "USDA-" + fid,
        "nombre": desc,
        "nombre_en": desc,
        "grupo": "USDA extendida",
        "categoria": cat_es,
        "porcion": 100,
        "unidad": "ml" if liquid else "g",
        "equiv": "",
        "fuente": "USDA FDC %s (%s)" % (
            fid, "Foundation Foods, 2026-04-30" if fid in FOUNDATION_IDS else "SR Legacy, 2018"),
        "notas": "",
        "icono": "iconos/categorias/%s.svg" % icon,
        "nutrientes": {k: d.get(k) for k in numkeys},
        "texto": {"antiox": "", "otros": ""},
    }
    return food


def main():
    global FOUNDATION_IDS
    s = open(JS_MAIN, encoding="utf-8").read()
    db = json.loads(s[s.index("{"):s.rindex(";")])
    numkeys = [c["k"] for c in db["cols"] if c["tipo"] == "num"]

    sr_foods = usda.foods_sr()
    sr_cats = usda.cats_sr()
    fd_foods = usda.foods_fd()
    fd_cats = usda.cats_fd()
    FOUNDATION_IDS = set(usda.foundation_ids())
    main_ids = main_food_ids(db)
    mkeys = main_keys(db)

    sr_sel = curate_sr(list(sr_foods.values()), sr_cats, main_ids, mkeys)

    # Foundation: se usa como versión preferente cuando coincide el alimento (misma categoría y clave gruesa).
    fd_sel = []
    for fid in sorted(FOUNDATION_IDS):
        f = fd_foods.get(fid)
        if not f:
            continue
        if not keep_fd(f, fd_cats, main_ids, mkeys):
            continue
        fd_sel.append(f)

    fd_by_key = {}
    for f in fd_sel:
        cat = fd_cats.get(f["food_category_id"], "")
        fd_by_key.setdefault((CATS[cat][0], coarse_key(f["description"])), f)

    final = []
    replaced = set()
    for f in sr_sel:
        cat = sr_cats.get(f["food_category_id"], "")
        nf = fd_by_key.get((CATS[cat][0], coarse_key(f["description"])))
        if nf is not None:
            replaced.add(f["fdc_id"])
            final.append((nf["fdc_id"], nf["description"], fd_cats.get(nf["food_category_id"], "")))
        else:
            final.append((f["fdc_id"], f["description"], cat))

    sr_full = set(nkey(f["description"]) for f in sr_sel)
    added_fd = 0
    for f in fd_sel:
        key = nkey(f["description"])
        if key in sr_full:
            continue
        final.append((f["fdc_id"], f["description"], fd_cats.get(f["food_category_id"], "")))
        added_fd += 1

    # dedupe final por id y por (categoría, clave base, estado de preparación)
    seen = set()
    seen_desc = set()
    uniq = []
    for fid, desc, cat_en in final:
        cat_es = resolve_cat(desc, cat_en)[0]
        if cat_en in ("Fruits and Fruit Juices", "Vegetables and Vegetable Products",
                      "Nut and Seed Products", "Cereal Grains and Pasta", "Spices and Herbs"):
            dk = (cat_es, nkey(desc))
        else:
            dk = (cat_es, base_key(desc, cat_en), state_of(desc))
        if fid in seen or dk in seen_desc:
            continue
        seen.add(fid)
        seen_desc.add(dk)
        uniq.append((fid, desc, cat_en))

    sr_ids = list(set(
        [fid for fid, _, cat in uniq if fid not in FOUNDATION_IDS] +
        [f["fdc_id"] for f in sr_sel]
    ))
    fd_ids = [fid for fid, _, cat in uniq if fid in FOUNDATION_IDS]
    nut_sr = usda.load_nutrients_sr(sr_ids)
    nut_fd = usda.load_nutrients_fd(fd_ids)

    sr_lookup = {}
    for f in sr_sel:
        cat = sr_cats.get(f["food_category_id"], "")
        sr_lookup.setdefault((resolve_cat(f["description"], cat)[0], coarse_key(f["description"])), f["fdc_id"])

    alimentos = []
    for fid, desc, cat_en in uniq:
        nut = nut_fd if fid in FOUNDATION_IDS else nut_sr
        d = nut.get(fid)
        used_sr = False
        if fid in FOUNDATION_IDS and (not d or (d.get("kcal") is None and d.get("protein") is None
                                                and d.get("carb") is None and d.get("fat") is None)):
            alt = sr_lookup.get((resolve_cat(desc, cat_en)[0], coarse_key(desc)))
            if alt and nut_sr.get(alt):
                d = nut_sr[alt]
                used_sr = True
            else:
                continue
        if not d:
            continue
        food = make_food(fid, desc, cat_en, {fid: d}, numkeys)
        if used_sr:
            food["fuente"] = "USDA FDC %s (Foundation Foods, 2026-04-30; nutrientes de SR Legacy, 2018)" % fid
            food["notas"] = "La versión Foundation no reporta energía ni macronutrientes; se usan los valores de SR Legacy para el mismo alimento."
        n = food["nutrientes"]
        if n.get("kcal") is None:
            p, c, f = n.get("protein"), n.get("carb"), n.get("fat")
            if any(v is not None for v in (p, c, f)):
                n["kcal"] = round(4 * (p or 0) + 4 * (c or 0) + 9 * (f or 0), 1)
                if not food["notas"]:
                    food["notas"] = "Energía estimada con factores de Atwater 4/4/9 porque la fuente no reporta kcal."
        alimentos.append(food)

    # Nombres en español desde la caché de tools/translate_ext.py.
    # `nombre_en` conserva siempre la descripción original de USDA.
    es_names = {}
    if os.path.exists(NAMES_ES):
        with open(NAMES_ES, encoding="utf-8") as f:
            es_names = json.load(f)
    missing_es = 0
    for a in alimentos:
        en = a.get("nombre_en") or a["nombre"]
        a["nombre_en"] = en
        tr = es_names.get(en)
        if tr:
            a["nombre"] = tr
        else:
            missing_es += 1
    # Nombres españoles repetidos: se desambiguan con la descripción USDA.
    seen_es = {}
    dup_es = 0
    for a in alimentos:
        key = a["nombre"].strip().lower()
        if key in seen_es:
            a["nombre"] = a["nombre"] + " (" + a["nombre_en"] + ")"
            dup_es += 1
        else:
            seen_es[key] = a

    alimentos.sort(key=lambda a: (a["categoria"], a["nombre"].lower()))
    cats_present = []
    for a in alimentos:
        if a["categoria"] not in cats_present:
            cats_present.append(a["categoria"])
    cats_present.sort()

    ext = {
        "meta": {
            "app": "NutricionAPP",
            "version": "2.1",
            "generado": "2026-10-26",
            "fuente": "USDA FoodData Central · SR Legacy 2018 + Foundation Foods 2026-04-30",
            "filas": len(alimentos),
            "columnas": len(db["cols"]),
            "nota": "Base extendida curada: nombres en español para consulta y descripción original de USDA en «nombre_en». Se activa desde el catálogo o la calculadora de comida.",
        },
        "categorias": cats_present,
        "grupos": ["USDA extendida"],
        "cols": db["cols"],
        "alimentos": alimentos,
    }

    with open(JS_EXT, "w", encoding="utf-8") as f:
        f.write("/* Generado por tools/build_ext.py. No editar a mano. */\n")
        f.write("window.DB_EXT = ")
        json.dump(ext, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print("SR seleccionados:", len(sr_sel), "Foundation overlay:", len(replaced),
          "Foundation añadidos:", added_fd, "total:", len(alimentos))
    print("Nombres en español: sin traducir", missing_es, "| duplicados ajustados", dup_es,
          "| caché", NAMES_ES)
    cnt = collections.Counter(a["categoria"] for a in alimentos)
    for c, n in sorted(cnt.items()):
        print("%5d  %s" % (n, c))
    print("\nmuestra:")
    for c in sorted(cnt):
        arr = [a["nombre"] for a in alimentos if a["categoria"] == c]
        print("\n###", c)
        for d in arr[:6]:
            print(" -", d)


FOUNDATION_IDS = set()

if __name__ == "__main__":
    main()
