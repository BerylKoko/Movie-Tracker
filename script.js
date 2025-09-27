/* script.js - main site logic */
const API_KEY = '7047dd1';
let slidesData = [];
let currentSlide = 0;
let slideInterval;

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  fetchTrending();
  setupSearch();
  handleHashOpen(); // if user navigated with #detail-tt...
});

function initUI(){
  document.getElementById('next').addEventListener('click', ()=>{ nextSlide(); resetAuto(); });
  document.getElementById('prev').addEventListener('click', ()=>{ prevSlide(); resetAuto(); });
  // modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
}

// --- Trending / slideshow ---
async function fetchTrending(){
  const queries = ['Avengers','Spider-Man','Dune','Barbie','Oppenheimer','Matrix','Mission','Star Wars'];
  let all = [];
  for(const q of queries){
    try{
      const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(q)}&type=movie&apikey=${API_KEY}`);
      const data = await res.json();
      if(data.Response === "True") all = all.concat(data.Search);
    }catch(e){ console.error(e); }
  }
  // dedupe by imdbID
  const map = new Map();
  all.forEach(m=> map.set(m.imdbID, m));
  all = Array.from(map.values());
  if(all.length === 0) return;
  // group into slides of 1 large poster per slide for nicer display
  slidesData = all.map(m => [m]); // one item per slide
  renderSlide(0);
  slideInterval = setInterval(nextSlide, 5000);
  // show a default grid of trending items
  displayMovies(all.slice(0, 24));
}

function renderSlide(idx){
  currentSlide = idx;
  const container = document.getElementById('slideshow');
  container.innerHTML = '';
  const movies = slidesData[idx] || [];
  // create one slide per movie (here only one)
  movies.forEach(m=>{
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.innerHTML = `
      <img src="${m.Poster !== 'N/A' ? m.Poster : 'movieposter.jpg'}" alt="${escapeHtml(m.Title)}">
      <div class="caption">${escapeHtml(m.Title)} (${m.Year})</div>
    `;
    // clicking slide opens details
    slide.addEventListener('click', ()=> openDetail(m.imdbID));
    container.appendChild(slide);
  });
}

function nextSlide(){ if(!slidesData.length) return; renderSlide((currentSlide+1) % slidesData.length); }
function prevSlide(){ if(!slidesData.length) return; renderSlide((currentSlide-1 + slidesData.length) % slidesData.length); }
function resetAuto(){ clearInterval(slideInterval); slideInterval = setInterval(nextSlide, 5000); }

// --- Search & display ---
function setupSearch(){
  document.getElementById('search-btn').addEventListener('click', ()=> {
    const q = document.getElementById('movie-search').value.trim();
    if(q) searchAndDisplay(q);
  });
  document.getElementById('movie-search').addEventListener('keypress', e=>{
    if(e.key === 'Enter'){ const q = e.target.value.trim(); if(q) searchAndDisplay(q); }
  });
}

async function searchAndDisplay(q){
  const grid = document.getElementById('movie-grid');
  grid.innerHTML = `<p class="loading">Searching for "${escapeHtml(q)}"…</p>`;
  try{
    const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(q)}&type=movie&apikey=${API_KEY}`);
    const data = await res.json();
    if(data.Response === "True"){
      displayMovies(data.Search);
    } else {
      grid.innerHTML = `<p class="no-results">No results for "${escapeHtml(q)}"</p>`;
    }
  }catch(e){
    grid.innerHTML = `<p class="no-results">Error fetching results</p>`;
  }
}

function displayMovies(movies){
  const grid = document.getElementById('movie-grid');
  grid.innerHTML = '';
  movies.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.imdbid = m.imdbID;
    card.innerHTML = `
      <img src="${m.Poster !== 'N/A' ? m.Poster : 'movieposter.jpg'}" alt="${escapeHtml(m.Title)}">
      <div class="info"><h3>${escapeHtml(m.Title)}</h3><p>${m.Year}</p></div>
    `;
    card.addEventListener('click', ()=> openDetail(m.imdbID));
    grid.appendChild(card);
  });
}

// --- Detail modal / recommendations ---
async function openDetail(imdbID){
  // push hash so other pages can link back
  history.replaceState(null, '', `#detail-${imdbID}`);
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  const simGrid = document.getElementById('similar-grid');
  content.innerHTML = `<p class="loading">Loading...</p>`;
  simGrid.innerHTML = '';
  modal.classList.remove('hidden');

  try{
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbID}&plot=full&apikey=${API_KEY}`);
    const data = await res.json();
    if(data.Response !== "True"){ content.innerHTML = `<p class="no-results">Movie not found</p>`; return; }

    // fill modal content
    content.innerHTML = `
      <img src="${data.Poster !== 'N/A' ? data.Poster : 'movieposter.jpg'}" alt="${escapeHtml(data.Title)}">
      <div class="meta">
        <h2>${escapeHtml(data.Title)} <span style="font-weight:400;color:var(--muted)">(${data.Year})</span></h2>
        <p><strong>Rating:</strong> ${data.imdbRating && data.imdbRating!=='N/A' ? data.imdbRating : 'N/A' } / 10</p>
        <p><strong>Genre:</strong> ${escapeHtml(data.Genre)}</p>
        <p><strong>Runtime:</strong> ${escapeHtml(data.Runtime)}</p>
        <p><strong>Director:</strong> ${escapeHtml(data.Director)}</p>
        <p><strong>Actors:</strong> ${escapeHtml(data.Actors)}</p>
        <p style="margin-top:10px">${escapeHtml(data.Plot)}</p>
        <div style="margin-top:12px">
          <button id="save-btn" class="save-btn">Save to Collection</button>
        </div>
      </div>
    `;

    // save button behaviour
    document.getElementById('save-btn').addEventListener('click', ()=>{
      saveToCollection({
        imdbID: data.imdbID,
        Title: data.Title,
        Year: data.Year,
        Poster: data.Poster
      });
      document.getElementById('save-btn').textContent = 'Saved ✓';
      setTimeout(()=> document.getElementById('save-btn').textContent = 'Save to Collection', 1200);
    });

    // recommendations: pick first genre and search OMDb for it
    const primaryGenre = data.Genre ? data.Genre.split(',')[0].trim() : null;
    if(primaryGenre){
      const recRes = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(primaryGenre)}&type=movie&apikey=${API_KEY}`);
      const recData = await recRes.json();
      if(recData.Response === "True"){
        simGrid.innerHTML = '';
        // show up to 8 recommendations excluding current movie
        recData.Search.filter(x => x.imdbID !== imdbID).slice(0,8).forEach(m=>{
          const card = document.createElement('div');
          card.className = 'movie-card';
          card.innerHTML = `<img src="${m.Poster !== 'N/A' ? m.Poster : 'movieposter.jpg'}" alt="${escapeHtml(m.Title)}"><div class="info"><h4>${escapeHtml(m.Title)}</h4><p>${m.Year}</p></div>`;
          card.addEventListener('click', ()=> openDetail(m.imdbID));
          simGrid.appendChild(card);
        });
      } else {
        simGrid.innerHTML = '<p class="no-results">No recommendations found</p>';
      }
    }

  }catch(e){
    content.innerHTML = `<p class="no-results">Error loading details</p>`;
  }
}

function closeModal(){
  document.getElementById('modal').classList.add('hidden');
  history.replaceState(null,'', location.pathname); // remove hash
}

// --- collection save/load ---
function saveToCollection(movie){
  const saved = JSON.parse(localStorage.getItem('savedMovies') || '[]');
  if(saved.find(m=>m.imdbID === movie.imdbID)) return;
  saved.push(movie);
  localStorage.setItem('savedMovies', JSON.stringify(saved));
}

// handle opening detail if user navigated with hash
function handleHashOpen(){
  const h = location.hash;
  if(h && h.startsWith('#detail-')){
    const id = h.split('-')[1];
    if(id) openDetail(id);
  }
}

// small helper
function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
