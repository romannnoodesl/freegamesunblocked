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

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    allGames = data.games;
    const gotd = getGameOfTheDay(allGames);
    renderGameOfTheDay(gotd);
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
});
