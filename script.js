// =======================
// CONFIG
// =======================
const API_KEY = "7047dd1";
const API_URL = `https://www.omdbapi.com/?apikey=${API_KEY}`;
const PLACEHOLDER = "movieposter.jpg";

// =======================
// DOM ELEMENTS
// =======================
const movieGrid = document.getElementById("movie-grid");
const exploreGrid = document.getElementById("explore-grid");
const searchInput = document.getElementById("movie-search");
const searchBtn = document.getElementById("search-btn");
const slideshow = document.getElementById("slideshow");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modal-content");
const modalClose = document.getElementById("modal-close");
const similarGrid = document.getElementById("similar-grid");
const genreBtns = document.querySelectorAll(".genre-btn");

// =======================
// FETCH HELPERS
// =======================
async function fetchMovies(search, page = 1) {
  try {
    const res = await fetch(`${API_URL}&s=${encodeURIComponent(search)}&type=movie&page=${page}`);
    const data = await res.json();
    return data.Search || [];
  } catch (err) {
    console.error("Error fetching movies:", err);
    return [];
  }
}

async function fetchMovieById(id) {
  try {
    const res = await fetch(`${API_URL}&i=${id}&plot=full`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching movie:", err);
    return null;
  }
}

// =======================
// RENDER MOVIES
// =======================
function renderMovies(movies, container) {
  if (!container) return;
  container.innerHTML = "";
  movies.forEach(movie => {
    const poster = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER;
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <img src="${poster}" alt="${movie.Title}" />
      <h3>${movie.Title}</h3>
      <p>${movie.Year}</p>
    `;
    card.addEventListener("click", () => showMovieDetail(movie.imdbID));
    container.appendChild(card);
  });
}

// =======================
// SEARCH FUNCTION
// =======================
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  let results = [];
  for (let page = 1; page <= 3; page++) {
    const movies = await fetchMovies(query, page);
    results = results.concat(movies);
  }
  renderMovies(results, movieGrid);
}

if (searchBtn) searchBtn.addEventListener("click", handleSearch);

// =======================
// SLIDESHOW (HOME)
// =======================
let slides = [];
let slideIndex = 0;
async function loadSlideshow() {
  let trending = await fetchMovies("Avengers");
  trending = trending.concat(await fetchMovies("Batman"));
  slides = trending.slice(0, 10);
  renderSlideshow();
  setInterval(() => changeSlide(1), 5000);
}

function renderSlideshow() {
  if (!slideshow) return;
  slideshow.innerHTML = "";
  slides.forEach((movie, i) => {
    const poster = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER;
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.style.display = i === slideIndex ? "flex" : "none";
    slide.innerHTML = `<img src="${poster}" alt="${movie.Title}" />`;
    slide.addEventListener("click", () => showMovieDetail(movie.imdbID));
    slideshow.appendChild(slide);
  });
}

function changeSlide(n) {
  slideIndex = (slideIndex + n + slides.length) % slides.length;
  renderSlideshow();
}

if (prevBtn) prevBtn.addEventListener("click", () => changeSlide(-1));
if (nextBtn) nextBtn.addEventListener("click", () => changeSlide(1));

// =======================
// MODAL
// =======================
async function showMovieDetail(id) {
  const movie = await fetchMovieById(id);
  if (!movie) return;

  modalContent.innerHTML = `
    <div class="modal-content-wrapper">
      <img src="${movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER}" alt="${movie.Title}" />
      <div class="modal-info">
        <h2>${movie.Title} (${movie.Year})</h2>
        <p><strong>Rating:</strong> ${movie.imdbRating}</p>
        <p>${movie.Plot}</p>
        <button id="add-to-collection">Add to Collection</button>
      </div>
    </div>
  `;

  // recommendations
  let recs = [];
  if (movie.Genre) {
    recs = await fetchMovies(movie.Genre.split(",")[0]);
    recs = recs.filter(m => m.imdbID !== id).slice(0, 6);
  }
  renderMovies(recs, similarGrid);

  // Show modal
  modal.classList.remove("hidden");

  // LOCK PAGE SCROLL
  document.body.style.overflow = "hidden";

  // Make modal itself scrollable
  const modalCard = modal.querySelector(".modal-card");
  modalCard.style.overflowY = "auto";
  modalCard.style.maxHeight = "90vh"; // keeps it card-sized

  // =======================
  // Add to Collection button
  // =======================
  const addBtn = document.getElementById("add-to-collection");
  addBtn.addEventListener("click", () => {
    let collection = JSON.parse(localStorage.getItem("myCollection") || "[]");
    if (!collection.find(m => m.imdbID === movie.imdbID)) {
      collection.push(movie);
      localStorage.setItem("myCollection", JSON.stringify(collection));
      alert(`${movie.Title} added to your collection!`);
    } else {
      alert(`${movie.Title} is already in your collection.`);
    }
  });
}
function addToCollection(movie) {
  let collection = JSON.parse(localStorage.getItem("myCollection") || "[]");

  if (!collection.some(m => m.imdbID === movie.imdbID)) {
    collection.push(movie);
    localStorage.setItem("myCollection", JSON.stringify(collection));
  }

  // Add green checkmark on left of button
  const btn = document.getElementById("add-collection-btn");
  if (btn && !btn.querySelector(".checkmark")) {
    const check = document.createElement("span");
    check.className = "checkmark";
    check.textContent = "✔";           // the checkmark
    check.style.color = "green";       // green color
    check.style.marginRight = "0.5rem";
    btn.prepend(check);                // put checkmark on the left
    btn.disabled = true;               // optional: prevent re-click
  }
}

// =======================
// MODAL BUTTON
// =======================
async function showMovieDetail(id) {
  const movie = await fetchMovieById(id);
  if (!movie) return;

  modalContent.innerHTML = `
    <div class="modal-content-wrapper">
      <img src="${movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER}" alt="${movie.Title}" />
      <div class="modal-info">
        <h2>${movie.Title} (${movie.Year})</h2>
        <p><strong>Rating:</strong> ${movie.imdbRating}</p>
        <p>${movie.Plot}</p>
        <button id="add-collection-btn" style="padding-left:2rem; position:relative; cursor:pointer;">Add to Collection</button>
      </div>
    </div>
  `;

  // Attach event to button
  const addBtn = document.getElementById("add-collection-btn");
  if (addBtn) {
    // Initialize collection
    let collection = JSON.parse(localStorage.getItem("collection")) || [];

    function updateButton() {
      addBtn.innerHTML = ""; // Clear button
      const isInCollection = collection.some(m => m.imdbID === movie.imdbID);
      addBtn.textContent = isInCollection ? "Remove from Collection" : "Add to Collection";
      if (isInCollection) {
        const check = document.createElement("span");
        check.textContent = "✔";
        check.style.position = "absolute";
        check.style.left = "0.5rem";
        check.style.color = "green";
        addBtn.appendChild(check);
      }
    }

    addBtn.addEventListener("click", () => {
      const exists = collection.some(m => m.imdbID === movie.imdbID);
      if (exists) {
        collection = collection.filter(m => m.imdbID !== movie.imdbID); // Remove
      } else {
        collection.push(movie); // Add
      }
      localStorage.setItem("collection", JSON.stringify(collection));
      updateButton();
    });

    updateButton(); // Set initial state
  }

  // Recommendations
  let recs = [];
  if (movie.Genre) {
    recs = await fetchMovies(movie.Genre.split(",")[0]);
    recs = recs.filter(m => m.imdbID !== id).slice(0, 6);
  }
  renderMovies(recs, similarGrid);

  // Show modal
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // Make modal scrollable
  const modalCard = modal.querySelector(".modal-card");
  modalCard.style.overflowY = "auto";
  modalCard.style.maxHeight = "90vh";
}

modalClose.addEventListener("click", () => {
  modal.classList.add("hidden");
  document.body.style.overflow = ""; // unlock page scroll
  const modalCard = modal.querySelector(".modal-card");
  modalCard.style.overflowY = "";
});

// =======================
// EXPLORE GENRES
// =======================
if (genreBtns.length) {
  genreBtns.forEach(btn =>
    btn.addEventListener("click", () => {
      const genre = btn.dataset.genre;
      loadGenre(genre);
    })
  );
}

async function loadGenre(genre) {
  if (!exploreGrid) return;
  exploreGrid.innerHTML = `<p>Loading ${genre} movies…</p>`;
  let results = [];
  for (let page = 1; page <= 5; page++) {
    const movies = await fetchMovies(genre, page);
    results = results.concat(movies);
  }
  renderMovies(results, exploreGrid);
}

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // Home slideshow
  if (slideshow) loadSlideshow();

  // Load initial movie grids
  if (movieGrid) loadGenre("Action"); // Home grid default
  if (exploreGrid) loadGenre("Action"); // Explore default
});

async function loadHomeMovies() {
  let movies = [];
  const trendingTitles = ["Avengers", "Batman", "Spider-Man"]; // example trending
  for (let title of trendingTitles) {
    const results = await fetchMovies(title);
    movies = movies.concat(results);
  }
  renderMovies(movies, movieGrid); // render to the main grid
}

loadHomeMovies();
