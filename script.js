let currentMovies = [];
let showingWatchlist = false;

const API_KEY = '87dc4db9004a23b718b0dfac2edaed0a';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const moviesContainer = document.getElementById('movies-container');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const genreSelect = document.getElementById('genre-filter');
const modal = document.getElementById('movie-modal');
const modalPoster = document.getElementById('modal-poster');
const modalTitle = document.getElementById('modal-title');
const modalRating = document.getElementById('modal-rating');
const modalRelease = document.getElementById('modal-release');
const modalOverview = document.getElementById('modal-overview');
const closeButton = document.querySelector('.close-button');
const trailerContainer = document.getElementById('trailer-container');
const trailerVideo = document.getElementById('trailer-video');

const suggestionsBox = document.getElementById('suggestions');
let debounceTimeout = null;

const triviaFacts = [
  "🎥 The Matrix's green code is actually sushi recipes.",
  "🦖 The T-Rex roar in Jurassic Park was a mix of elephant and alligator sounds.",
  "🚀 WALL-E was named after Walter Elias Disney.",
  "🌌 Interstellar's black hole visuals helped scientists refine real physics equations.",
  "👽 E.T.'s voice was created by recording a chain-smoking woman.",
  "🧠 Inception's hallway fight was shot in a rotating hotel corridor.",
  "🕶 Men in Black’s neuralyzer flash is based on disposable camera flashes.",
  "🏆 The first Oscars ceremony in 1929 lasted just 15 minutes.",
  
  // 🇮🇳 Indian Cinema Focus
  "🎬 *Raja Harishchandra* (1913) was India's first full-length feature film.",
  "🎞 *Sholay* (1975) ran in Mumbai’s Minerva theatre for over five years continuously.",
  "🎶 *Lagaan* (2001) was nominated for Best Foreign Language Film at the Oscars.",
  "🎭 Amitabh Bachchan was once rejected by All India Radio due to his voice!",
  "📽 *Mughal-e-Azam* was shot partly in black & white, then reshot in color in 2004.",
  "🎤 *Arijit Singh* rose to fame after being eliminated from a reality show.",
  "🛕 *Baahubali 2* (2017) became the highest-grossing Indian film worldwide at the time.",
  "🇮🇳 India is the world’s largest producer of films, ahead of Hollywood and China.",
  "📺 The epic series *Mahabharat* (1988) had Indian streets empty every Sunday morning.",
  "🎓 Satyajit Ray, one of India’s greatest directors, designed his own film posters.",
  "🎞 *Dilwale Dulhania Le Jayenge* played daily at Maratha Mandir (Mumbai) for over 25 years!"
];




let genresMap = new Map();

// 🔍 Search
searchButton.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query !== '') {
    searchMovies(query);
    searchInput.value = '';
  }
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchButton.click();
});

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();

  if (debounceTimeout) clearTimeout(debounceTimeout);

  if (query.length < 3) {
    suggestionsBox.classList.add('hidden');
    return;
  }

  debounceTimeout = setTimeout(() => {
    fetchSuggestions(query);
  }, 300);
});


// 🔄 Genre Filter
genreSelect.addEventListener('change', () => {
  const selectedGenre = genreSelect.value;
  if (selectedGenre) {
    getMoviesByGenre(selectedGenre);
  } else {
    getTrendingMovies();
  }
});

// 📂 Load Movies on Start
document.addEventListener('DOMContentLoaded', () => {
  getTrendingMovies();
  loadGenres();
  displayTrivia();
});

document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;

    // Special case for "trending"
    if (type === 'trending') {
      getTrendingMovies();
    } else {
      getMoviesByCategory(type); // popular, top_rated, upcoming
    }

    // Reset the watchlist toggle
    showingWatchlist = false;
    document.getElementById('toggle-watchlist').textContent = '🎞 View Watchlist';
  });
});



// ✅ Display Movies
function displayMovies(movies) {
  moviesContainer.innerHTML = '';
  currentMovies = movies;

  movies.forEach(movie => {
    const div = document.createElement('div');
    div.classList.add('movie-card');
    div.innerHTML = `
      <img src="${IMG_BASE_URL + movie.poster_path}" alt="${movie.title}" />
      <div class="title">${movie.title}</div>
      <div class="rating">⭐ ${movie.vote_average.toFixed(1)}</div>
      <button class="watchlist-btn" data-id="${movie.id}">💾 Add to Watchlist</button>
    `;
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('watchlist-btn')) return;
      showModal(movie);
    });
    moviesContainer.appendChild(div);
  });

  setupWatchlistButtons();
}

// 🎯 Setup Watchlist Buttons
function setupWatchlistButtons() {
  const buttons = document.querySelectorAll('.watchlist-btn');
  buttons.forEach(btn => {
    const movieId = btn.dataset.id;

    if (isInWatchlist(movieId)) {
      btn.textContent = '✔️ In Watchlist';
    }

    btn.addEventListener('click', () => {
  const movie = getMovieById(movieId);
  if (!movie) return;

  if (isInWatchlist(movieId)) {
    removeFromWatchlist(movieId);
    btn.textContent = '💾 Add to Watchlist';
    showToast(`❌ Removed from Watchlist`);
  } else {
    addToWatchlist(movie);
    btn.textContent = '✔️ In Watchlist';
    showToast(`✔️ Added to Watchlist`);
  }
});

  });
}

// 🔍 Search Movies
async function searchMovies(query) {
  try {
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.results.length === 0) {
      moviesContainer.innerHTML = `<p style="text-align: center;">No results found for "${query}".</p>`;
    } else {
      displayMovies(data.results);
    }
  } catch (err) {
    console.error('Search Error:', err);
  }
}

// 🔥 Trending
async function getTrendingMovies() {
  try {
    const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
    const data = await res.json();
    displayMovies(data.results);
  } catch (err) {
    console.error('Trending Error:', err);
  }
}

async function getMoviesByCategory(type) {
  try {
    const res = await fetch(`${BASE_URL}/movie/${type}?api_key=${API_KEY}`);
    const data = await res.json();
    displayMovies(data.results);
  } catch (err) {
    console.error(`Error loading ${type} movies:`, err);
  }
}


// 🎬 Show Modal
function showModal(movie) {
  modalPoster.src = IMG_BASE_URL + movie.poster_path;
  modalTitle.textContent = movie.title;
  modalRating.textContent = `⭐ Rating: ${movie.vote_average.toFixed(1)}`;
  modalRelease.textContent = `📅 Release Date: ${movie.release_date}`;
  modalOverview.textContent = movie.overview || 'No description available.';
  modal.classList.remove('hidden');

  trailerVideo.src = '';
  trailerContainer.classList.add('hidden');
  fetchTrailer(movie.id);


  document.getElementById('extra-details').classList.add('hidden'); // hide initially
fetchExtraMovieDetails(movie.id);

}

// cast,crew,review,budget
async function fetchExtraMovieDetails(movieId) {
  try {
    // 1. Get movie details
    const movieRes = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`);
    const movieData = await movieRes.json();

    document.getElementById('modal-runtime').textContent = ` ${movieData.runtime} mins`;

    const genreNames = movieData.genres.map(g => g.name).join(', ');
    document.getElementById('modal-genres').textContent = ` ${genreNames}`;

    const formatMoney = num => num ? `$${num.toLocaleString()}` : 'N/A';
    document.getElementById('modal-budget').textContent = ` ${formatMoney(movieData.budget)}`;
    document.getElementById('modal-revenue').textContent = ` ${formatMoney(movieData.revenue)}`;

    // 2. Credits (Cast + Crew)
    const creditsRes = await fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`);
    const creditsData = await creditsRes.json();

    const castContainer = document.getElementById('modal-cast');
    castContainer.innerHTML = '🎭 <strong>Cast:</strong><br>';
    const castList = document.createElement('div');
    castList.classList.add('cast-list');

    creditsData.cast.slice(0, 6).forEach(actor => {
      const member = document.createElement('div');
      member.classList.add('cast-member');
      const profilePath = actor.profile_path 
        ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` 
        : 'https://via.placeholder.com/70x70?text=No+Img';
      member.innerHTML = `<img src="${profilePath}" alt="${actor.name}" /><div>${actor.name}</div>`;
      castList.appendChild(member);
    });

    castContainer.appendChild(castList);

    const directors = creditsData.crew.filter(p => p.job === 'Director').map(d => d.name);
    const writers = creditsData.crew.filter(p => p.job === 'Writer' || p.job === 'Screenplay').map(w => w.name);
   const crewHTML = `
  <div><span class="crew-role">🎬 Director(s):</span> ${directors.join(', ')}</div>
  <div><span class="crew-role">✍️ Writer(s):</span> ${writers.join(', ')}</div>
`;
document.getElementById('modal-crew').innerHTML = crewHTML;

    // 3. Reviews
    const reviewRes = await fetch(`${BASE_URL}/movie/${movieId}/reviews?api_key=${API_KEY}`);
    const reviewData = await reviewRes.json();

    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';
    reviewData.results.slice(0, 3).forEach(review => {
      const li = document.createElement('li');
      li.textContent = `"${review.content.slice(0, 200)}..." — ${review.author}`;
      reviewList.appendChild(li);
    });

    document.getElementById('extra-details').classList.remove('hidden');
  } catch (err) {
    console.error('Extra movie details error:', err);
  }
}
//-- till here

async function fetchTrailer(movieId) {
  try {
    const res = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
    const data = await res.json();
    const trailer = data.results.find(
      (video) => video.type === 'Trailer' && video.site === 'YouTube'
    );
    if (trailer) {
      trailerVideo.src = `https://www.youtube.com/embed/${trailer.key}`;
      trailerContainer.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Trailer Error:', err);
  }
}

// ❌ Modal Close
closeButton.addEventListener('click', () => {
  modal.classList.add('hidden');
  trailerVideo.src = '';
});
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
    trailerVideo.src = '';
  }
});



// 📁 Genres
async function loadGenres() {
  try {
    const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
    const data = await res.json();
    data.genres.forEach(genre => {
      genresMap.set(genre.id, genre.name);
      const option = document.createElement('option');
      option.value = genre.id;
      option.textContent = genre.name;
      genreSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Genres Error:', err);
  }
}

// 🧠 Genre Filter
async function getMoviesByGenre(genreId) {
  try {
    const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`);
    const data = await res.json();
    displayMovies(data.results);
  } catch (err) {
    console.error('Genre Filter Error:', err);
  }
}

// 🎞 Toggle Watchlist
document.getElementById('toggle-watchlist').addEventListener('click', () => {
  if (!showingWatchlist) {
    const watchlist = getWatchlist();
    displayMovies(watchlist);
    document.getElementById('toggle-watchlist').textContent = '🔙 Back to Browse';
    showingWatchlist = true;
  } else {
    getTrendingMovies(); // You can use loadMovies() here too if you prefer "Now Playing"
    document.getElementById('toggle-watchlist').textContent = '🎞 View Watchlist';
    showingWatchlist = false;
  }
});

// 🧩 Watchlist Utilities
function addToWatchlist(movie) {
  const list = getWatchlist();
  if (!list.some(m => m.id === movie.id)) {
    list.push(movie);
    localStorage.setItem('watchlist', JSON.stringify(list));
  }
}

function removeFromWatchlist(id) {
  const list = getWatchlist().filter((m) => m.id !== parseInt(id));
  localStorage.setItem('watchlist', JSON.stringify(list));
}

function getWatchlist() {
  return JSON.parse(localStorage.getItem('watchlist')) || [];
}

function isInWatchlist(id) {
  return getWatchlist().some((m) => m.id === parseInt(id));
}

function getMovieById(id) {
  return currentMovies.find((m) => m.id === parseInt(id));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 300); // wait for fade out
  }, 2000); // toast duration
}

async function fetchSuggestions(query) {
  try {
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data.results.slice(0, 5);

    if (results.length === 0) {
      suggestionsBox.classList.add('hidden');
      return;
    }

    suggestionsBox.innerHTML = '';
    results.forEach(movie => {
      const div = document.createElement('div');
      div.textContent = movie.title;
      div.addEventListener('click', () => {
        suggestionsBox.classList.add('hidden');
        searchInput.value = movie.title;
        searchMovies(movie.title);
      });
      suggestionsBox.appendChild(div);
    });

    suggestionsBox.classList.remove('hidden');
  } catch (err) {
    console.error('Suggestion Fetch Error:', err);
  }
}

document.addEventListener('click', (e) => {
  if (!suggestionsBox.contains(e.target) && e.target !== searchInput) {
    suggestionsBox.classList.add('hidden');
  }
});

document.getElementById('surprise-button').addEventListener('click', async () => {
  try {
    const res = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${Math.floor(Math.random() * 10) + 1}`);
    const data = await res.json();
    const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
    showModal(randomMovie);
  } catch (err) {
    console.error('Surprise Error:', err);
  }
});

function displayTrivia() {
  const randomFact = triviaFacts[Math.floor(Math.random() * triviaFacts.length)];
  document.getElementById('trivia-text').textContent = randomFact;
}

// FAQ Toggle Functionality
// FAQ Toggle (Only one open at a time)
document.addEventListener("DOMContentLoaded", () => {
  const faqButtons = document.querySelectorAll(".faq-question");

  faqButtons.forEach(button => {
    button.addEventListener("click", () => {
      const currentItem = button.closest(".faq-item");
      const isActive = currentItem.classList.contains("active");

      document.querySelectorAll(".faq-item").forEach(item => {
        item.classList.remove("active");
        item.querySelector(".toggle-icon").textContent = "+";
      });

      if (!isActive) {
        currentItem.classList.add("active");
        currentItem.querySelector(".toggle-icon").textContent = "−";
      }
    });
  });
});

//--till here

