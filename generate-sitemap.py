import json
import os
from datetime import date, timedelta

BASE_URL = "https://freegamesunblocked.org"

with open("data.json") as f:
    data = json.load(f)

games = data["games"]
today = date.today()
today_str = today.isoformat()


def hash_str(s: str) -> int:
    h = 0
    for ch in s:
        h = ((h << 5) - h) + ord(ch)
        h = h & 0xFFFFFFFF
    return abs(h)


def game_lastmod(game: dict, today: date) -> str:
    week = (today.day - 1) // 7 + 1
    seed = f"{game['title']}-{today.year}-W{week}"
    days_ago = hash_str(seed) % 28
    return (today - timedelta(days=days_ago)).isoformat()


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;") \
            .replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")


def img_title(game: dict) -> str:
    return esc(os.path.splitext(os.path.basename(game["link"]))[0])


pages = [
    ("/", "daily", "1.0"),
    ("/driving.html", "weekly", "0.8"),
    ("/skill.html", "weekly", "0.8"),
    ("/calm.html", "weekly", "0.8"),
    ("/shooting.html", "weekly", "0.8"),
    ("/retro.html", "weekly", "0.8"),
    ("/random.html", "weekly", "0.7"),
    ("/papasalley.html", "weekly", "0.7"),
    ("/suggestions.html", "monthly", "0.5"),
]

xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'

for loc, changefreq, priority in pages:
    xml += f"  <url>\n"
    xml += f"    <loc>{esc(BASE_URL + loc)}</loc>\n"
    xml += f"    <lastmod>{today_str}</lastmod>\n"
    xml += f"    <changefreq>{changefreq}</changefreq>\n"
    xml += f"    <priority>{priority}</priority>\n"
    xml += f"  </url>\n"

for game in games:
    mod = game_lastmod(game, today)
    xml += f"  <url>\n"
    xml += f"    <loc>{esc(BASE_URL + '/' + game['link'])}</loc>\n"
    xml += f"    <lastmod>{mod}</lastmod>\n"
    xml += f"    <changefreq>weekly</changefreq>\n"
    xml += f"    <priority>0.6</priority>\n"
    if game.get("image"):
        xml += f"    <image:image>\n"
        xml += f"      <image:loc>{esc(BASE_URL + '/' + game['image'])}</image:loc>\n"
        xml += f"      <image:title>{img_title(game)}</image:title>\n"
        xml += f"    </image:image>\n"
    xml += f"  </url>\n"

xml += '</urlset>\n'

with open("sitemap.xml", "w") as f:
    f.write(xml)

print(f"sitemap.xml generated — {len(games)} games (date: {today_str})")