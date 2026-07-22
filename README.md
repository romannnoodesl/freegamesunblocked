# Free Games Unblocked

> Free online games portal hosting 200+ browser games that work at school or work with no downloads, no sign-ups, and no restrictions. Games are organized into categories: driving, skill, shooting, retro, and calm.
> Live at **https://freegamesunblocked.org/**

---

## SEO & ad infrastructure

This repo includes a full SEO + ads setup. Everything is driven by `data.json` (the game catalog) and built by a single Node script.

### Quick start (after adding games)

```bash
node scripts/build-seo.mjs
```

This regenerates:
- **`sitemap.xml`** — all listing pages + every game page, with `<image:image>` entries and git-based `<lastmod>` dates.
- **`llms.txt`** + **`llms-full.txt`** — site overview for LLM crawlers (per [llmstxt.org](https://llmstxt.org)).
- **All `games/*.html`** — each game page is rewritten with full `<head>` SEO (title, description, canonical, Open Graph, Twitter cards, JSON-LD `VideoGame` + `BreadcrumbList` schema), ad slots, breadcrumbs, a templated SEO copy paragraph, and footer. Existing `<iframe>`/`<object>`/`<embed>` src URLs are preserved verbatim, so no game breaks. Self-contained game pages (e.g. `minecraft.html`) get a surgical SEO meta injection in the `<head>` only, body untouched.

### Files & their roles

| File | Purpose |
|------|---------|
| `index.html` | Home page with `WebSite` + `SearchAction` JSON-LD (enables Google sitelinks search box) |
| `driving.html` `skill.html` `calm.html` `shooting.html` `retro.html` `random.html` `papasalley.html` | Category listing pages, each with `CollectionPage` + `BreadcrumbList` JSON-LD |
| `suggestions.html` | Standalone page |
| `404.html` | Custom GitHub Pages 404 |
| `robots.txt` | Permissive crawl rules + sitemap reference |
| `sitemap.xml` | 228 URLs (auto-generated) |
| `ads.txt` | AdSense authorized sellers line |
| `llms.txt` / `llms-full.txt` | LLM crawler overviews |
| `humans.txt` | Authorship credits |
| `.well-known/security.txt` | Vulnerability contact info |
| `site.webmanifest` | PWA manifest (theme color, icons) |
| `assets/og-image.png` | Open Graph share image (1200×630) |
| `assets/icon-192.png` `assets/icon-512.png` `assets/apple-touch-icon.png` | PWA / favicon set |
| `gamesdesign.css` | Shared styles incl. responsive nav, ad slots, breadcrumbs, footer |
| `scripts/build-seo.mjs` | The build script — re-run after editing `data.json` |

### Ad slots

AdSense is wired up with the real publisher ID (`ca-pub-9521685727551779`) and GA4 measurement ID (`G-Z61RKMXNZ9`) on every page. What remains are **placeholder ad-slot IDs** — ad units won't serve until you replace them:

1. In AdSense, create ad units and replace the placeholder slot IDs with your real slot IDs (different slots per placement look best: header, in-grid, above-game, below-game, footer):
   - `scripts/build-seo.mjs` → `AD_SLOT_ABOVE_GAME` / `AD_SLOT_BELOW_GAME` constants (currently `1111111111` / `2222222222`)
   - `script.js` → `AD_GRID_SLOT` constant for the home page in-grid ads (currently `5555555555`)
2. Re-run `node scripts/build-seo.mjs` to propagate the change to all game pages.

Ad slot placements: home (header + in-grid every 12 games + footer), each category page (header + footer), each game page (above + below the game), suggestions page.

### Google Analytics

GA4 is loaded on every page with measurement ID `G-Z61RKMXNZ9`. Consent Mode defaults (`denied`) are set in each page's `<head>` before `gtag('config')`, and `cookieconsent.js` (end of `<body>`) issues the `granted`/`denied` update based on the user's choice.

### Google Search Console

`googlebf504cedacef749f.html` is the existing Search Console verification file. For the new domain `freegamesunblocked.org`, add the property in Search Console and verify (DNS TXT or the HTML file method), then submit `sitemap.xml`.

## How to add a game

1. Add the game HTML file to `games/` (typically an `<iframe>` wrapper pointing at the game's source URL).
2. Add the thumbnail image to `gamesimages/`.
3. Add an entry to `data.json`:
   ```json
   { "title": "Game Title", "image": "gamesimages/gametitle.png", "link": "games/gametitle.html", "category": "skill" }
   ```
   Categories: `driving`, `skill`, `shooting`, `retro`, `calm`. Omit `category` for uncategorized.
4. Run `node scripts/build-seo.mjs` — the new game page gets full SEO, the sitemap updates, and `llms-full.txt` regenerates.

## Domain & hosting

This repo is served via GitHub Pages from a custom domain. To point `freegamesunblocked.org` at GitHub Pages:
1. In the repo: Settings → Pages → Custom domain → `freegamesunblocked.org` → Enforce HTTPS.
2. At your DNS provider, add A records pointing at GitHub Pages IPs (`185.199.108`, `.109`, `.110`, `.111`) and a CNAME `www` → `youruser.github.io`.
3. Wait for DNS to propagate (can take up to 24h).

## Credits

By Jack Malczewski. All games belong to their respective owners; this site embeds them via iframe/object tags and does not host game binaries. For takedown requests see `.well-known/security.txt`.
