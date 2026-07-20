let gamesnumber = 0;
let allGames = [];

function getGameOfTheDay(games) {
  const today = new Date();
  const seed = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % games.length;
  const dayLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  return { game: games[index], index, dayLabel };
}

function renderGameOfTheDay(gotd) {
  const el = document.getElementById('gameOfTheDay');
  if (!el) return;
  document.getElementById('gotdDate').textContent = gotd.dayLabel;
  document.getElementById('gotdImage').src = gotd.game.image;
  document.getElementById('gotdImage').alt = gotd.game.title;
  document.getElementById('gotdTitle').textContent = gotd.game.title;
  document.getElementById('gotdLink').href = gotd.game.link;
  document.getElementById('gotdPlayLink').href = gotd.game.link;
}

const CATEGORIES = ['skill', 'driving', 'shooting', 'retro', 'calm'];
const CATEGORY_LABELS = {
  skill: 'Skill Games',
  driving: 'Driving Games',
  shooting: 'Shooting Games',
  retro: 'Retro Games',
  calm: 'Calm Games'
};
const CATEGORY_PAGES = {
  skill: '/skill.html',
  driving: '/driving.html',
  shooting: '/shooting.html',
  retro: '/retro.html',
  calm: '/calm.html'
};

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getCategorySpotlight(games) {
  const week = getWeekNumber(new Date());
  const catIndex = (week + new Date().getFullYear()) % CATEGORIES.length;
  const category = CATEGORIES[catIndex];
  const catGames = games.filter(g => g.category === category);
  if (catGames.length < 2) return null;
  // deterministic daily pick from the pool
  const seed = new Date().toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h) + seed.charCodeAt(i); h |= 0; }
  const p1 = Math.abs(h) % catGames.length;
  const p2 = Math.abs(h + 1) % catGames.length;
  const picks = [catGames[p1]];
  if (p1 !== p2) picks.push(catGames[p2]);
  return {
    label: CATEGORY_LABELS[category],
    page: CATEGORY_PAGES[category],
    games: picks
  };
}

function renderCategorySpotlight(spotlight) {
  const el = document.getElementById('categorySpotlight');
  if (!el) return;
  el.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'spot-header';
  header.innerHTML = '<span class="spot-badge">This Week</span><a class="spot-title" href="' + spotlight.page + '">' + spotlight.label + '</a>';
  el.appendChild(header);
  const cards = document.createElement('div');
  cards.className = 'spot-cards';
  spotlight.games.forEach(g => {
    const card = document.createElement('a');
    card.className = 'spot-card';
    card.href = g.link;
    card.innerHTML = '<img src="' + g.image + '" alt="' + g.title + '" loading="lazy"><span>' + g.title + '</span>';
    cards.appendChild(card);
  });
  el.appendChild(cards);
}

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    allGames = data.games;
    const gotd = getGameOfTheDay(allGames);
    renderGameOfTheDay(gotd);
    const spotlight = getCategorySpotlight(allGames);
    if (spotlight) renderCategorySpotlight(spotlight);
    const remaining = allGames.filter((_, i) => i !== gotd.index);
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      document.getElementById('searchInput').value = q;
      const filtered = filterGames(q);
      renderGames(filtered);
    } else {
      renderGames(remaining);
    }
    countGames(allGames);
  })
  .catch(error => console.error('Error loading games:', error));

function countGames(games) {
  gamesnumber = games.length;
  document.getElementById('gamesnumber').innerHTML = 'Games: ' + gamesnumber;
}

function filterGames(searchTerm) {
  const term = searchTerm.toLowerCase();
  return allGames.filter(game => game.title.toLowerCase().includes(term));
}

function adSlotHtml(slotId) {
  return `<div class="ad-slot ad-grid">
    <ins class="adsbygoogle" style="display:block"
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
         data-ad-slot="${slotId}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>`;
}

function renderGames(games) {
  const gameContainer = document.getElementById('gameContainer');
  gameContainer.innerHTML = '';
  const AD_EVERY = 12;

  games.forEach((game, i) => {
    if (i > 0 && i % AD_EVERY === 0) {
      const adEl = document.createElement('div');
      adEl.innerHTML = adSlotHtml('5555555555');
      gameContainer.appendChild(adEl.firstElementChild);
    }

    const gameElement = document.createElement('div');
    gameElement.classList.add('game');
    gameElement.innerHTML = `
      <a href="${game.link}"><img src="${game.image}" alt="${game.title}" loading="lazy" width="200" height="150"></a>
      <a href="${game.link}">${game.title}</a>
    `;
    gameContainer.appendChild(gameElement);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');

  searchInput.addEventListener('input', () => {
    const filteredGames = filterGames(searchInput.value);
    renderGames(filteredGames);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');

  window.onscroll = function() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
      scrollToTopBtn.style.display = 'block';
    } else {
      scrollToTopBtn.style.display = 'none';
    }
  };

  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const lastUpdated = document.getElementById('lastUpdated');
  if (lastUpdated) {
    lastUpdated.textContent = new Date().toISOString().slice(0, 10);
  }
});
