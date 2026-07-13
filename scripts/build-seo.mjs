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
 *  4. Regenerates sitemap.xml with all listing pages + game pages + image entries
 *     (using git last-commit dates as <lastmod>).
 *  5. Regenerates llms.txt and llms-full.txt.
 *
 * Re-runnable: run `node scripts/build-seo.mjs` whenever you add games to data.json.
 *
 * Config (BASE_URL, ADSENSE_CLIENT, GA_ID) lives below — change once, re-run.
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, basename, extname } from 'node:path';

// ---------------------------------------------------------------------------
// CONFIG  -  change these once; everything below re-derives from them.
// ---------------------------------------------------------------------------
const BASE_URL      = 'https://freegamesunblocked.org';
const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';   // replace after AdSense approval
const GA_ID          = 'G-XXXXXXXXXX';                // replace after creating GA4 property
const SITE_NAME      = 'Free Games Unblocked';
const SITE_AUTHOR    = 'Jack Malczewski';
const ROOT           = resolve(import.meta.dirname, '..');

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

// Build lookup: data.json entry by the basename of its link file
const gameByBasename = {};
for (const g of games) {
    if (g.link && g.link.startsWith('games/')) {
        const b = basename(g.link);
        gameByBasename[b] = g;
    }
}

// ---------------------------------------------------------------------------
// Shared HTML fragment builders
// ---------------------------------------------------------------------------
function headCommon({ title, description, canonical, image, jsonLd }) {
    const ogImage = image || '/assets/og-image.png';
    return `    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
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
    let crumbs = `<a href="/">Home</a>`;
    if (category && catLinks[category]) {
        const [catName, catUrl] = catLinks[category];
        crumbs += ` &rsaquo; <a href="${catUrl}">${catName} Games</a>`;
    }
    if (gameTitle) crumbs += ` &rsaquo; <span>${esc(gameTitle)}</span>`;
    return `    <nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs}</nav>`;
}

function siteFooter() {
    const year = new Date().getFullYear();
    return `    <footer class="site-footer">
      <p>&copy; ${year} ${esc(SITE_NAME)}. All games belong to their respective owners.</p>
      <p><a href="/">Home</a> &middot; <a href="/driving.html">Driving</a> &middot; <a href="/skill.html">Skill</a> &middot; <a href="/shooting.html">Shooting</a> &middot; <a href="/retro.html">Retro</a> &middot; <a href="/calm.html">Calm</a> &middot; <a href="/sitemap.xml">Sitemap</a></p>
    </footer>`;
}

function jsonLdScript(obj) {
    return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n    </script>`;
}

// ---------------------------------------------------------------------------
// Extract the existing iframe / object / embed tag from a wrapper page
// ---------------------------------------------------------------------------
function extractEmbed(html) {
    // iframe (with any attributes, possibly multiline)
    const iframe = html.match(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/i);
    if (iframe) return iframe[0];
    // object
    const object = html.match(/<object\b[^>]*>([\s\S]*?)<\/object>/i);
    if (object) return object[0];
    // embed (self-closing)
    const embed = html.match(/<embed\b[^>]*>/i);
    if (embed) return embed[0];
    return null;
}

// ruffle script for .swf games
function extractRuffle(html) {
    const m = html.match(/<script\b[^>]*ruffle[^>]*><\/script>/i);
    return m ? m[0] : '';
}

// ---------------------------------------------------------------------------
// Build a single game wrapper page (iframe/object/embed type)
// ---------------------------------------------------------------------------
function buildGameWrapperPage(fileBasename, existingHtml, game) {
    const embed = extractEmbed(existingHtml);
    const ruffle = extractRuffle(existingHtml);
    const slug = fileBasename.replace(/\.html$/, '');
    const canonical = `${BASE_URL}/games/${fileBasename}`;
    const title = game ? game.title : titleCase(slug);
    const category = game ? game.category : null;
    const image = game ? `/${game.image}` : null;

    const description = `Play ${title} unblocked online for free at ${SITE_NAME}. No downloads, no restrictions — works at school or work.${category ? ` Part of our ${category} games collection.` : ''}`;

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

    const bodyContent = `
${navBreadcrumbs(category, title)}
    <h1>${esc(title)}</h1>
${adSlot('1111111111')}
    <div class="game-frame">
    ${embed || ''}
    </div>
${adSlot('2222222222')}
    <section class="game-description">
      <p>Play <strong>${esc(title)}</strong> unblocked right here — free, in your browser, with no downloads or sign-ups required. ${category ? `This game is part of our <a href="/${category}.html">${titleCase(category)} Games</a> collection.` : ''} ${SITE_NAME} hosts hundreds of browser games that work at school, at work, or anywhere with an internet connection.</p>
      <p>Just click play above to start. If the game doesn't load, try refreshing the page or switching browsers. Enjoy ${esc(title)} and explore more free unblocked games on our <a href="/">home page</a>.</p>
    </section>
${siteFooter()}`;

    const headScripts = ruffle ? `    ${ruffle}\n` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
${headCommon({ title: `${title} Unblocked - Play Free | ${SITE_NAME}`, description, canonical, image, jsonLd: jsonLd + '\n    ' + breadcrumbLd })}
${headScripts}<link rel="stylesheet" href="/gamesdesign.css">
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
    const description = `Play ${title} unblocked online for free at ${SITE_NAME}.${category ? ` Part of our ${category} games collection.` : ''}`;

    // Strip any previous SEO INJECTION block (idempotent re-runs).
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

    // Replace any existing <title>...</title> with the proper title.
    const properTitle = `<title>${esc(title)} Unblocked - Play Free | ${esc(SITE_NAME)}</title>`;
    let blockFinal = block;
    if (/<title>[^<]*<\/title>/i.test(out)) {
        out = out.replace(/<title>[^<]*<\/title>/i, properTitle);
    } else {
        // No title tag — prepend one to the injection block
        blockFinal = `${properTitle}\n${block}`;
    }

    // Inject right before </head>. If no </head>, inject after first <body...>.
    if (/<\/head>/i.test(out)) {
        return out.replace(/<\/head>/i, `${blockFinal}\n</head>`);
    } else if (/<body[^>]*>/i.test(out)) {
        return out.replace(/(<body[^>]*>)/i, `$1\n${blockFinal}`);
    }
    // Fallback: prepend
    return `<!DOCTYPE html>\n<html lang="en">\n<head>${properTitle}${block}</head>\n<body>\n${out}\n</body>\n</html>`;
}

// ---------------------------------------------------------------------------
// Decide & process each games/*.html
// ---------------------------------------------------------------------------
const gamesDir = resolve(ROOT, 'games');
const allGameFiles = (await readdir(gamesDir))
    .filter(f => f.endsWith('.html'));

let stats = { wrapper: 0, selfContained: 0, skipped: 0, total: allGameFiles.length };
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
        // Self-contained game — surgical injection only
        const out = injectSeoIntoSelfContained(f, existing, game);
        await writeFile(filePath, out, 'utf8');
        stats.selfContained++;
    }
}

// ---------------------------------------------------------------------------
// Also add subdirectory-based games that data.json points to directly
// (e.g. games/sandboxels/index.html) to the sitemap without rewriting them.
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
// Listing pages (these are hand-edited, but listed in the sitemap)
// ---------------------------------------------------------------------------
const listingPages = [
    { loc: `${BASE_URL}/`,                  title: 'Home',          priority: '1.0', changefreq: 'daily' },
    { loc: `${BASE_URL}/driving.html`,      title: 'Driving Games', priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/skill.html`,        title: 'Skill Games',   priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/calm.html`,         title: 'Calm Games',    priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/shooting.html`,     title: 'Shooting Games',priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/retro.html`,        title: 'Retro Games',   priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/random.html`,       title: 'Random Sports', priority: '0.7', changefreq: 'weekly' },
    { loc: `${BASE_URL}/papasalley.html`,   title: "Papa's Alley",  priority: '0.7', changefreq: 'weekly' },
    { loc: `${BASE_URL}/suggestions.html`,  title: 'Suggestions',   priority: '0.5', changefreq: 'monthly' },
];

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------
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
// llms.txt  (per https://llmstxt.org)
// ---------------------------------------------------------------------------
const llms = `# ${SITE_NAME}

> ${SITE_NAME} is a free online games portal hosting 200+ browser games that work at school or work with no downloads, no sign-ups, and no restrictions. Games are organized into categories: driving, skill, shooting, retro, and calm.

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

## Policies & meta
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
// llms-full.txt  (extended: every game grouped by category)
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
console.log(`build-seo.mjs complete:
  Game pages rewritten (wrapper):  ${stats.wrapper}
  Game pages injected (self-cont):${stats.selfContained}
  Total game pages processed:     ${stats.total}
  Extra subdirectory entries:      ${extraSitemapEntries.length}
  Listing pages in sitemap:        ${listingPages.length}
  Sitemap URLs total:              ${smBlocks.length}
  llms.txt + llms-full.txt written.

Remember to update ${ADSENSE_CLIENT} and ${GA_ID} in the generated files
once you have real IDs, then re-run this script.`);
