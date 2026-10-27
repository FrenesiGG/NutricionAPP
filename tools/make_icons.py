# -*- coding: utf-8 -*-
"""Genera iconos SVG genéricos por categoría para la base extendida."""
import os

OUT = r"C:\Users\Yair Sanchez\Downloads\NutricionAPP\NutricionAPPv1.9\iconos\categorias"

ICONS = {
    "lacteos": ("#7cc4ee", """
      <path d="M196 160h120v192a20 20 0 0 1-20 20H216a20 20 0 0 1-20-20Z"/>
      <path d="M196 160l30-40h60l30 40"/>
      <path d="M196 220h120"/>
      <path d="M226 252h60"/>"""),
    "especias": ("#d9a05b", """
      <path d="M200 180h112v160a28 28 0 0 1-28 28h-56a28 28 0 0 1-28-28Z"/>
      <rect x="188" y="148" width="136" height="32" rx="12"/>
      <circle cx="232" cy="244" r="9" fill="currentColor" stroke="none"/>
      <circle cx="280" cy="244" r="9" fill="currentColor" stroke="none"/>
      <circle cx="256" cy="288" r="9" fill="currentColor" stroke="none"/>
      <circle cx="232" cy="324" r="9" fill="currentColor" stroke="none"/>
      <circle cx="280" cy="324" r="9" fill="currentColor" stroke="none"/>"""),
    "grasas": ("#eab308", """
      <path d="M256 148c40 56 64 88 64 118a64 64 0 0 1-128 0c0-30 24-62 64-118Z"/>
      <path d="M228 276a28 28 0 0 0 20 40"/>"""),
    "aves": ("#e88b6a", """
      <path d="M308 174a50 50 0 1 0-72 70l-58 58a38 38 0 1 0 54 54l58-58a50 50 0 0 0 18-124Z"/>
      <path d="M186 330l-18-18"/>
      <circle cx="286" cy="196" r="8" fill="currentColor" stroke="none"/>"""),
    "sopas": ("#f59e0b", """
      <path d="M140 236h232a116 116 0 0 1-232 0Z"/>
      <path d="M196 320h120"/>
      <path d="M216 184c0-22 18-22 18-44M256 184c0-22 18-22 18-44M296 184c0-22 18-22 18-44"/>"""),
    "embutidos": ("#d16b7f", """
      <rect x="148" y="220" width="216" height="72" rx="36"/>
      <path d="M218 220v72M294 220v72"/>
      <path d="M174 232l-22-22M338 280l22 22"/>"""),
    "desayuno": ("#c89b5a", """
      <path d="M144 250h224a112 112 0 0 1-224 0Z"/>
      <path d="M200 332h112"/>
      <path d="M330 196c34 0 54 20 54 44s-20 44-54 44"/>
      <path d="M214 188c0-20 16-20 16-40M254 188c0-20 16-20 16-40"/>"""),
    "frutas": ("#ef5b5b", """
      <path d="M256 200c-34-28-88-14-88 46 0 52 40 96 64 96 8 0 16-6 24-6s16 6 24 6c24 0 64-44 64-96 0-60-54-74-88-46Z"/>
      <path d="M256 200c0-30 22-52 52-52 0 30-22 52-52 52Z"/>
      <path d="M256 200v-26"/>"""),
    "cerdo": ("#e58fa3", """
      <path d="M180 302c0-68 54-122 122-122 30 0 54 24 54 54 0 68-54 122-122 122-30 0-54-24-54-54Z"/>
      <circle cx="338" cy="228" r="18"/>
      <path d="M214 278c26 20 58 20 84 0"/>"""),
    "verduras": ("#5fd98d", """
      <path d="M256 226c-8 62-30 108-58 140h116c-28-32-50-78-58-140Z"/>
      <path d="M256 226c-4-42 14-70 44-82 4 36-14 66-44 82Z"/>
      <path d="M256 226c-24-30-26-62-12-90 24 20 32 52 12 90Z"/>
      <path d="M212 292h88"/>"""),
    "frutos-secos": ("#b58a5e", """
      <ellipse cx="256" cy="270" rx="74" ry="102"/>
      <path d="M256 172c-30 42-30 154 0 196"/>
      <path d="M210 214c24 10 24 102 0 112"/>"""),
    "res": ("#b45b5b", """
      <path d="M164 258c0-52 42-94 94-94h42c44 0 78 34 78 78 0 58-46 104-104 104h-16c-52 0-94-42-94-88Z"/>
      <path d="M210 248c22-22 52-22 74 0M244 300c18-16 44-16 62 0"/>"""),
    "bebidas": ("#4fb3e8", """
      <path d="M180 200h152l-20 168a20 20 0 0 1-20 18h-72a20 20 0 0 1-20-18Z"/>
      <path d="M286 148l-18 52"/>
      <path d="M196 240h120"/>"""),
    "pescados": ("#4aa8c9", """
      <path d="M152 256c38-54 92-82 154-82 44 0 82 24 98 56-16 32-54 56-98 56-62 0-116-28-154-82Z"/>
      <path d="M152 256l-40-42v84Z"/>
      <circle cx="322" cy="238" r="8" fill="currentColor" stroke="none"/>
      <path d="M232 226c18 18 18 42 0 60"/>"""),
    "leguminosas": ("#c98a4b", """
      <ellipse cx="214" cy="226" rx="34" ry="48" transform="rotate(-24 214 226)"/>
      <ellipse cx="300" cy="226" rx="34" ry="48" transform="rotate(24 300 226)"/>
      <ellipse cx="256" cy="310" rx="34" ry="48"/>
      <path d="M256 268c-8 18-8 46 0 64"/>"""),
    "cordero": ("#a78bfa", """
      <circle cx="210" cy="238" r="34"/><circle cx="256" cy="220" r="38"/>
      <circle cx="302" cy="238" r="34"/><circle cx="224" cy="292" r="32"/>
      <circle cx="288" cy="292" r="32"/>
      <circle cx="256" cy="266" r="36"/>
      <circle cx="244" cy="258" r="5" fill="currentColor" stroke="none"/>
      <circle cx="268" cy="258" r="5" fill="currentColor" stroke="none"/>"""),
    "panaderia": ("#d9a066", """
      <path d="M160 300v-54c0-50 42-90 96-90s96 40 96 90v54a26 26 0 0 1-26 26H186a26 26 0 0 1-26-26Z"/>
      <path d="M208 216c-8 24-8 62 0 86M256 204c-8 28-8 74 0 102M304 216c-8 24-8 62 0 86"/>"""),
    "dulces": ("#ec6fb3", """
      <circle cx="256" cy="256" r="56"/>
      <path d="M200 256l-52-34v68Z"/>
      <path d="M312 256l52-34v68Z"/>
      <path d="M234 238c14-12 30-12 44 0"/>"""),
    "cereales": ("#d4b24a", """
      <path d="M256 356V164"/>
      <ellipse cx="230" cy="196" rx="18" ry="30" transform="rotate(-32 230 196)"/>
      <ellipse cx="282" cy="196" rx="18" ry="30" transform="rotate(32 282 196)"/>
      <ellipse cx="226" cy="250" rx="18" ry="30" transform="rotate(-32 226 250)"/>
      <ellipse cx="286" cy="250" rx="18" ry="30" transform="rotate(32 286 250)"/>
      <ellipse cx="230" cy="304" rx="18" ry="30" transform="rotate(-32 230 304)"/>
      <ellipse cx="282" cy="304" rx="18" ry="30" transform="rotate(32 282 304)"/>"""),
    "rapida": ("#f97316", """
      <path d="M164 212c0-22 18-40 40-40h104c22 0 40 18 40 40Z"/>
      <rect x="160" y="232" width="192" height="32" rx="14"/>
      <path d="M164 292h184c0 26-20 44-46 44H210c-26 0-46-18-46-44Z"/>
      <circle cx="222" cy="198" r="4" fill="currentColor" stroke="none"/>
      <circle cx="256" cy="194" r="4" fill="currentColor" stroke="none"/>
      <circle cx="290" cy="198" r="4" fill="currentColor" stroke="none"/>"""),
    "platillos": ("#94a3b8", """
      <circle cx="256" cy="256" r="104"/>
      <circle cx="256" cy="256" r="62"/>
      <path d="M150 148v76M138 148v34a12 12 0 0 0 24 0v-34M362 148v120M362 148c24 0 24 34 0 40"/>"""),
    "botanas": ("#f59e0b", """
      <path d="M184 168h144l-12 208H196Z"/>
      <path d="M184 168l16-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20"/>
      <path d="M222 244c24-18 48-18 68 0-20 18-44 18-68 0Z"/>"""),
    "alcohol": ("#a78bfa", """
      <path d="M196 168h120l-18 96a48 48 0 0 1-84 0Z"/>
      <path d="M256 312v52M216 364h80"/>
      <path d="M208 196h96"/>"""),
}

TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="56" y="56" width="400" height="400" rx="104" fill="{color}" opacity=".14"/>
  <g fill="none" stroke="{color}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" color="{color}">
{body}
  </g>
</svg>
"""


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (color, body) in ICONS.items():
        path = os.path.join(OUT, name + ".svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(TEMPLATE.format(color=color, body=body.strip()))
        print("ok", name)


if __name__ == "__main__":
    main()
