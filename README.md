# Free Games Unblocked

> Free online games portal hosting 217+ browser games that work at school or work with no downloads, no sign-ups, and no restrictions. Games are organized into categories: driving, skill, shooting, retro, and calm — plus curated collections: 2 player, horror, .io, car, parkour, random sports, and Papa's alley.
> Live at **https://freegamesunblocked.org/**

---

## Every boost this site has

A complete inventory of every SEO, performance, content, and monetization feature currently live.

### 🔍 SEO — technical

- **XML sitemap** (`sitemap.xml`) — 237 URLs, auto-generated with `<image:image>` thumbnails and git-based `<lastmod>` dates; referenced in `robots.txt`
- **`robots.txt`** — permissive crawl rules, blocks only asset folders, declares the sitemap
- **Canonical URLs** on every page (prevents duplicate-content dilution)
- **JSON-LD structured data everywhere:**
  - Home: `WebSite` + `SearchAction` (enables Google sitelinks search box) + `Organization`
  - Game pages: `VideoGame` + `BreadcrumbList` + `FAQPage` (+ `HowTo` on enriched games)
  - Listing pages: `CollectionPage` + `BreadcrumbList`
  - Blog posts: `Article` + `FAQPage` + `BreadcrumbList`
- **Open Graph + Twitter cards** on every page, with a dedicated 1200×630 share image (`assets/og-image.png`)
- **Unique title + meta description** per page (keyword-targeted, e.g. "X Unblocked - Play Free")
- **Semantic HTML** — one `<h1>` per page, heading hierarchy, `aria-label`s on nav, breadcrumb markup
- **Breadcrumbs** (visible + schema) on all game and listing pages
- **`llms.txt` + `llms-full.txt`** — AI/LLM crawler files ([llmstxt.org](https://llmstxt.org)); the full catalog is machine-readable for ChatGPT/Perplexity-style search
- **`feed.xml`** — RSS feed for the blog
- **`site.webmanifest`** + theme color + full icon set (PWA-installable, richer mobile presence)
- **Clean URL structure** — `/games/name.html`, `/blog/slug.html`, keyword URLs for landing pages
- **HTTPS enforced** via GitHub Pages + custom domain

### ✍️ SEO — content

- **55 enriched game pages** — unique About / How to Play / Tips & Strategy sections + `HowTo` schema (no thin boilerplate), covering the highest-traffic titles (Slope, 1v1.LOL, Retro Bowl, OvO, etc.)
- **5 keyword landing pages** targeting high-volume queries: `2player.html`, `horror.html`, `io.html`, `car.html`, `parkour.html`
- **5 blog posts** targeting informational queries ("best unblocked games for school chromebook", "games like slope", "unblocked games 76 alternatives", "how to play at school", "best unblocked games 2026")
- **Internal linking web** — related games (same category) + cross-category recommendations on every game page, footer links to all collections on every page, "More categories" row + popular-games links on the homepage
- **Freshness signals** — daily-rotating Game of the Day, weekly Category Spotlight, `lastUpdated` stamps, daily auto-rebuild via GitHub Action
- **Working on-site search** (`?q=`) that backs the `SearchAction` schema
- **217-game catalog** — every game has a thumbnail, alt text, and a dedicated indexable page

### ⚡ Performance

- **Service worker** (`sw.js`) — precaches core assets; network-first for HTML (fresh deploys), stale-while-revalidate for game files/thumbnails, offline fallback
- **WebP thumbnails** with PNG fallbacks (`<picture>`) on nearly all 217 games
- **Image dimensions + `decoding="async"`** on all thumbnails (no CLS); eager + `fetchpriority="high"` on above-the-fold images, lazy below
- **Minified CSS** (`gamesdesign.min.css`), `defer` on scripts
- **Preconnect/dns-prefetch** for Google tag/ad origins
- **Static pre-rendered grids** — listing pages ship hard-coded HTML, no client-side catalog fetch needed to render

### 📊 Analytics & consent

- **GA4** (`G-Z61RKMXNZ9`) on every page
- **Consent Mode v2 done right** — `default: denied` set in `<head>` before `gtag('config')` (with `wait_for_update`), updated to granted/denied from the banner choice; choice persisted in localStorage
- **Cookie consent banner** on every page, linked to the privacy policy

### 💰 Monetization

- **AdSense wired sitewide** with real publisher ID (`ca-pub-9521685727551779`) + `ads.txt`
- **Ad placements:** home (header + in-grid every 12 games + footer), listing pages (header + footer), game pages (above + below the game), suggestions page
- **Single-constant slot config** — `AD_SLOT_ABOVE_GAME`/`AD_SLOT_BELOW_GAME` in the builder, `AD_GRID_SLOT` in `script.js` (placeholders until real ad-unit IDs are added)

### 🧲 Retention & UX

- **Game of the Day** — deterministic daily pick, gives returning users a reason to come back
- **Category Spotlight** — weekly rotating collection on the homepage
- **Responsive design** — mobile-friendly nav and grids
- **Custom 404 page** with links back into the catalog
- **Suggestions page** — user-request funnel for new games
- **Scroll-to-top**, keyboard-accessible search

### 🛡️ Trust & policy

- **`privacy.html`** — full privacy policy
- **`humans.txt`**, **`.well-known/security.txt`** (takedown/security contact), **`ads.txt`**
- **Search Console verification file** (`googlebf504cedacef749f.html`)

### 🤖 Automation

- **`scripts/build-seo.mjs`** — one command regenerates all game pages, listing grids, sitemap, and llms files from `data.json`
- **GitHub Action** (`.github/workflows/sitemap.yml`) — daily auto-rebuild + auto-commit, so lastmod dates and related-game picks stay fresh
- **GitHub Pages hosting** — free CDN, automatic HTTPS, zero server maintenance

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
| `driving.html` `skill.html` `calm.html` `shooting.html` `retro.html` | Category listing pages, each with `CollectionPage` + `BreadcrumbList` JSON-LD |
| `random.html` `papasalley.html` `2player.html` `horror.html` `io.html` `car.html` `parkour.html` | Curated collection pages (grouped via `group` field in `data.json`) |
| `blog/` | Blog index + 5 SEO-targeted posts |
| `suggestions.html` | Standalone page |
| `404.html` | Custom GitHub Pages 404 |
| `robots.txt` | Permissive crawl rules + sitemap reference |
| `sitemap.xml` | 237 URLs (auto-generated) |
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
2. Add the thumbnail image to `gamesimages/` (real PNG; a `.webp` twin is picked up automatically if present).
3. Add an entry to `data.json`:
   ```json
   { "title": "Game Title", "image": "gamesimages/gametitle.png", "link": "games/gametitle.html", "category": "skill" }
   ```
   Categories: `driving`, `skill`, `shooting`, `retro`, `calm`. Omit `category` for uncategorized.
   Optional but strongly recommended (turns a thin page into a unique one — see the 55 enriched games):
   ```json
   {
     "title": "Game Title", "image": "...", "link": "...", "category": "skill",
     "tagline": "One-two sentence unique description.",
     "controls": "How to control the game.",
     "objective": "What the player tries to do.",
     "tips": ["Tip 1", "Tip 2", "Tip 3"],
     "difficulty": "Easy|Medium|Hard", "releaseYear": 2020,
     "group": "2Player|Horror|IO|Car|Parkour|Random|Papa"
   }
   ```
4. Run `node scripts/build-seo.mjs` — the new game page gets full SEO, the sitemap updates, and `llms-full.txt` regenerates.

## Domain & hosting

This repo is served via GitHub Pages from a custom domain. To point `freegamesunblocked.org` at GitHub Pages:
1. In the repo: Settings → Pages → Custom domain → `freegamesunblocked.org` → Enforce HTTPS.
2. At your DNS provider, add A records pointing at GitHub Pages IPs (`185.199.108`, `.109`, `.110`, `.111`) and a CNAME `www` → `youruser.github.io`.
3. Wait for DNS to propagate (can take up to 24h).

## Credits

By Jack Malczewski. All games belong to their respective owners; this site embeds them via iframe/object tags and does not host game binaries. For takedown requests see `.well-known/security.txt`.
