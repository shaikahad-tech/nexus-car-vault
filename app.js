/**
 * app.js — NEXUS Car Vault main application.
 * Renders 100 cars in a searchable, filterable grid.
 * Click any car to open the 3D viewer with procedural model.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CARS, CATEGORIES } from './src/catalog.js';

// ─── State ───
const state = {
  filter: 'all',
  search: '',
  sort: 'default',
  sources: ['procedural', 'sketchfab', 'github', 'kenney'],
  favorites: JSON.parse(localStorage.getItem('nexus_favs') || '[]'),
  compareList: [],
  viewerActive: false,
};

// ─── DOM Refs ───
const $ = (id) => document.getElementById(id);
const grid = $('carGrid');
const searchInput = $('searchInput');
const categoryList = $('categoryList');
const sortSelect = $('sortSelect');
const sourceFilter = $('sourceFilter');
const resultCount = $('resultCount');
const favCount = $('favCount');
const favBtn = $('favBtn');
const compareBtn = $('compareBtn');
const compareCount = $('compareCount');

// ─── Init ───
function init() {
  buildCategoryFilters();
  renderGrid();
  updateStats();
  bindEvents();
}

// ─── Category Filters ───
function buildCategoryFilters() {
  const all = document.createElement('button');
  all.className = 'cat-btn active';
  all.textContent = 'All Cars';
  all.dataset.cat = 'all';
  categoryList.appendChild(all);

  Object.entries(CATEGORIES).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = label;
    btn.dataset.cat = key;
    categoryList.appendChild(btn);
  });
}

// ─── Filtering + Sorting ───
function getFilteredCars() {
  let cars = CARS.slice();

  if (state.filter !== 'all') {
    cars = cars.filter(c => c.category === state.filter);
  }

  if (state.search) {
    const q = state.search.toLowerCase();
    cars = cars.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.brand.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }

  cars = cars.filter(c => state.sources.includes(c.modelSource));

  // Sort
  switch (state.sort) {
    case 'name': cars.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': cars.sort((a, b) => b.name.localeCompare(a.name)); break;
    case 'year': cars.sort((a, b) => b.year - a.year); break;
    case 'year-asc': cars.sort((a, b) => a.year - b.year); break;
    case 'power': cars.sort((a, b) => parsePower(b.power) - parsePower(a.power)); break;
    case 'price': cars.sort((a, b) => parsePrice(b.price) - parsePrice(a.price)); break;
  }

  return cars;
}

function parsePower(s) {
  const m = String(s).match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function parsePrice(s) {
  const m = String(s).replace(/,/g, '').match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

// ─── Render Grid ───
function renderGrid() {
  const cars = getFilteredCars();
  grid.innerHTML = '';

  if (cars.length === 0) {
    grid.innerHTML = '<div class="no-results">No cars match your filters.</div>';
    return;
  }

  cars.forEach(car => {
    const card = document.createElement('div');
    card.className = 'car-card';
    card.dataset.id = car.id;

    const isFav = state.favorites.includes(car.id);
    const sourceBadge = car.modelSource === 'procedural' ?
      '<span class="badge badge-proc">Procedural</span>' :
      car.modelSource === 'sketchfab' ?
      '<span class="badge badge-sketch">Sketchfab</span>' :
      car.modelSource === 'github' ?
      '<span class="badge badge-gh">GitHub</span>' :
      '<span class="badge badge-kenney">Kenney CC0</span>';

    card.innerHTML = `
      <div class="card-top">
        <span class="card-cat">${CATEGORIES[car.category]}</span>
        <button class="fav-star ${isFav ? 'active' : ''}" data-id="${car.id}">${isFav ? '★' : '☆'}</button>
      </div>
      <div class="card-name">${car.name}</div>
      <div class="card-brand">${car.brand} · ${car.year}</div>
      <div class="card-specs">
        <span class="spec-pill">${car.power}</span>
        <span class="spec-pill">${car.topSpeed}</span>
        <span class="spec-pill">0-100: ${car.accel}</span>
      </div>
      <div class="card-footer">
        ${sourceBadge}
        <span class="card-price">${car.price}</span>
      </div>
      <button class="compare-add-btn" data-id="${car.id}">+ Compare</button>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('fav-star')) {
        toggleFavorite(car.id);
      } else if (e.target.classList.contains('compare-add-btn')) {
        toggleCompare(car.id);
      } else {
        openViewer(car);
      }
    });

    grid.appendChild(card);
  });
}

// ─── Favorites ───
function toggleFavorite(id) {
  const idx = state.favorites.indexOf(id);
  if (idx >= 0) {
    state.favorites.splice(idx, 1);
  } else {
    state.favorites.push(id);
  }
  localStorage.setItem('nexus_favs', JSON.stringify(state.favorites));
  updateStats();
  renderGrid();
}

// ─── Compare ───
function toggleCompare(id) {
  const idx = state.compareList.indexOf(id);
  if (idx >= 0) {
    state.compareList.splice(idx, 1);
  } else if (state.compareList.length < 4) {
    state.compareList.push(id);
  }
  updateStats();
  renderGrid();
}

function showCompare() {
  const overlay = $('compareOverlay');
  const table = $('compareTable');
  const cars = state.compareList.map(id => CARS.find(c => c.id === id)).filter(Boolean);

  if (cars.length < 2) {
    table.innerHTML = '<p style="padding:40px;text-align:center;color:#8b919e;">Select at least 2 cars to compare.</p>';
  } else {
    const specs = ['name', 'brand', 'year', 'category', 'power', 'topSpeed', 'accel', 'drivetrain', 'engine', 'price'];
    const labels = ['Name', 'Brand', 'Year', 'Category', 'Power', 'Top Speed', '0-100', 'Drivetrain', 'Engine', 'Price'];

    let html = '<table><thead><tr><th>Spec</th>';
    cars.forEach(c => { html += `<th>${c.name}</th>`; });
    html += '</tr></thead><tbody>';

    specs.forEach((spec, i) => {
      html += `<tr><td class="spec-label">${labels[i]}</td>`;
      cars.forEach(c => { html += `<td>${c[spec]}</td>`; });
      html += '</tr>';
    });

    html += '</tbody></table>';
    table.innerHTML = html;
  }

  overlay.classList.add('active');
}

// ─── 3D Viewer ───
let viewerScene = null;
let viewerRenderer = null;
let viewerCamera = null;
let viewerControls = null;
let viewerAnim = null;

function openViewer(car) {
  const overlay = $('viewerOverlay');
  $('viewerTitle').textContent = car.name;
  $('viewerSubtitle').textContent = `${car.brand} · ${car.year} · ${CATEGORIES[car.category]}`;

  // Specs
  $('viewerSpecs').innerHTML = `
    <div class="spec-row"><span>Power</span><span>${car.power}</span></div>
    <div class="spec-row"><span>Top Speed</span><span>${car.topSpeed}</span></div>
    <div class="spec-row"><span>0-100 km/h</span><span>${car.accel}</span></div>
    <div class="spec-row"><span>Drivetrain</span><span>${car.drivetrain}</span></div>
    <div class="spec-row"><span>Engine</span><span>${car.engine}</span></div>
    <div class="spec-row"><span>Price</span><span>${car.price}</span></div>
  `;

  // Source
  $('viewerSource').innerHTML = car.modelSource !== 'procedural'
    ? `<span class="source-badge">3D Model: ${car.sourceCredit} (${car.license})</span><a href="${car.modelUrl}" target="_blank" class="source-link">View Source →</a>`
    : '<span class="source-badge procedural">Procedurally generated 3D model</span>';

  overlay.classList.add('active');
  state.viewerActive = true;

  // Init Three.js viewer
  setTimeout(() => initViewer(car), 100);
}

function initViewer(car) {
  const canvas = $('viewerCanvas');
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 400;

  // Dispose previous
  if (viewerRenderer) {
    viewerRenderer.dispose();
    canvas.innerHTML = '';
  }

  viewerScene = new THREE.Scene();
  viewerScene.background = new THREE.Color(0x0a0c10);
  viewerScene.fog = new THREE.FogExp2(0x0a0c10, 0.02);

  viewerCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  viewerCamera.position.set(8, 4, 10);

  viewerRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  viewerRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  viewerRenderer.setSize(w, h);
  viewerRenderer.shadowMap.enabled = true;
  viewerRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewerRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  viewerRenderer.toneMappingExposure = 1.2;
  canvas.appendChild(viewerRenderer.domElement);

  viewerControls = new OrbitControls(viewerCamera, viewerRenderer.domElement);
  viewerControls.enableDamping = true;
  viewerControls.dampingFactor = 0.06;
  viewerControls.minDistance = 5;
  viewerControls.maxDistance = 25;
  viewerControls.target.set(0, 0.5, 0);

  // Lighting
  const hemi = new THREE.HemisphereLight(0x4a5a7a, 0x0a0c10, 0.5);
  viewerScene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(8, 12, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  viewerScene.add(key);

  const rim = new THREE.DirectionalLight(0x00d9ff, 1.0);
  rim.position.set(-7, 5, -8);
  viewerScene.add(rim);

  const fill = new THREE.DirectionalLight(0xff3d2e, 0.5);
  fill.position.set(-4, 3, 8);
  viewerScene.add(fill);

  // Floor
  const floorGeo = new THREE.CircleGeometry(12, 64);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.5, roughness: 0.4 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  viewerScene.add(floor);

  // Accent ring
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3d2e, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(4, 4.1, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  viewerScene.add(ring);

  // Build procedural car
  const carGroup = buildProceduralCar(car);
  viewerScene.add(carGroup);

  // Animate
  let t = 0;
  function animate() {
    if (!state.viewerActive) return;
    viewerAnim = requestAnimationFrame(animate);
    t += 0.016;

    carGroup.position.y = Math.sin(t * 0.8) * 0.02;
    ringMat.opacity = 0.3 + Math.sin(t * 2) * 0.2;

    viewerControls.update();
    viewerRenderer.render(viewerScene, viewerCamera);
  }
  animate();
}

// ─── Procedural Car Builder ───
function buildProceduralCar(car) {
  const group = new THREE.Group();
  group.name = car.name;

  // Determine body color based on category
  const catColors = {
    hypercar: 0xff3d2e, supercar: 0x0044ff, sports: 0xff6b00,
    muscle: 0x1a1a1a, classic: 0x8b0000, ev: 0x00d9ff,
    luxury: 0x0a0f1a, suv: 0x2d4a2d, concept: 0xff00aa, race: 0xffffff,
  };
  const bodyColor = catColors[car.category] || 0xff3d2e;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor, metalness: 0.9, roughness: 0.25,
    clearcoat: 1.0, clearcoatRoughness: 0.04,
  });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, metalness: 0.3, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8eaed, metalness: 1.0, roughness: 0.15 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, metalness: 0.4, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.65 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.1, roughness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 });
  const taillightMat = new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff2020, emissiveIntensity: 2.5 });

  const isSUV = car.category === 'suv' || car.category === 'luxury';
  const bodyH = isSUV ? 0.9 : 0.55;
  const bodyLen = isSUV ? 4.6 : 4.2;
  const bodyW = isSUV ? 2.1 : 1.9;
  const rideH = isSUV ? 0.6 : 0.45;

  // Lower body
  const lower = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, bodyH, bodyW), bodyMat);
  lower.position.y = rideH;
  lower.castShadow = true;
  group.add(lower);

  // Mid section
  const mid = new THREE.Mesh(new THREE.BoxGeometry(bodyLen - 0.6, 0.45, bodyW - 0.05), bodyMat);
  mid.position.y = rideH + 0.35;
  mid.castShadow = true;
  group.add(mid);

  // Cabin / roof
  const cabinH = isSUV ? 0.75 : 0.5;
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.0, 0);
  cabinShape.lineTo(0.9, 0);
  cabinShape.lineTo(0.5, cabinH);
  cabinShape.lineTo(-0.6, cabinH);
  cabinShape.closePath();
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  cabinGeo.translate(0, 0, -0.7);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0.1, rideH + bodyH - 0.05, 0);
  cabin.castShadow = true;
  group.add(cabin);

  // Wheels
  const wheelPositions = [
    { x: -1.4, z: 0.95 }, { x: -1.4, z: -0.95 },
    { x: 1.5, z: 0.95 }, { x: 1.5, z: -0.95 },
  ];
  const wheelR = 0.48;
  wheelPositions.forEach(pos => {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.22, 16, 32), tireMat);
    tire.rotation.y = Math.PI / 2;
    tire.position.set(pos.x, wheelR, pos.z);
    tire.castShadow = true;
    group.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelR - 0.05, wheelR - 0.05, 0.24, 24), chrome);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(tire.position);
    group.add(rim);

    // Spokes
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, wheelR * 1.4, 0.08), darkPlastic);
      spoke.rotation.x = angle;
      spoke.position.copy(tire.position);
      group.add(spoke);
    }
  });

  // Headlights
  [0.65, -0.65].forEach(z => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.4), headlightMat);
    hl.position.set(-bodyLen / 2 - 0.01, rideH + 0.2, z);
    group.add(hl);
  });

  // Taillights
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.5), taillightMat);
  tl.position.set(bodyLen / 2 + 0.01, rideH + 0.3, 0);
  group.add(tl);

  // Spoiler for sports/supercar/hypercar
  if (['supercar', 'hypercar', 'sports', 'race'].includes(car.category)) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 1.7), darkPlastic);
    wing.position.set(bodyLen / 2 - 0.3, rideH + 0.8, 0);
    group.add(wing);

    [0.6, -0.6].forEach(z => {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), darkPlastic);
      support.position.set(bodyLen / 2 - 0.3, rideH + 0.65, z);
      group.add(support);
    });
  }

  // Front splitter for race/hypercar
  if (['hypercar', 'race', 'supercar'].includes(car.category)) {
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, bodyW), darkPlastic);
    splitter.position.set(-bodyLen / 2 + 0.05, rideH - 0.05, 0);
    group.add(splitter);
  }

  group.position.y = 0;
  return group;
}

// ─── Close Viewer ───
function closeViewer() {
  state.viewerActive = false;
  if (viewerAnim) cancelAnimationFrame(viewerAnim);
  $('viewerOverlay').classList.remove('active');
}

// ─── Stats ───
function updateStats() {
  const cars = getFilteredCars();
  resultCount.textContent = `${cars.length} car${cars.length !== 1 ? 's' : ''}`;
  favCount.textContent = state.favorites.length;
  compareCount.textContent = state.compareList.length;
}

// ─── Events ───
function bindEvents() {
  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderGrid();
    updateStats();
  });

  categoryList.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    categoryList.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = btn.dataset.cat;
    renderGrid();
    updateStats();
  });

  sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderGrid();
  });

  sourceFilter.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      state.sources = Array.from(sourceFilter.querySelectorAll('input:checked')).map(c => c.value);
      renderGrid();
      updateStats();
    }
  });

  favBtn.addEventListener('click', () => {
    // Toggle favorites-only view
    if (state.favorites.length === 0) return;
    // For simplicity, search by favorite IDs
    const favCars = state.favorites.map(id => CARS.find(c => c.id === id)).filter(Boolean);
    grid.innerHTML = '';
    if (favCars.length === 0) return;
    // Re-render with only favorites
    const oldFilter = state.filter;
    state.filter = '__favs__';
    // Temporarily override getFilteredCars
    const originalFilter = getFilteredCars;
    window.__origFilter = originalFilter;
    renderFavsOnly(favCars);
  });

  $('compareBtn').addEventListener('click', showCompare);
  $('compareClose').addEventListener('click', () => $('compareOverlay').classList.remove('active'));
  $('viewerClose').addEventListener('click', closeViewer);

  // Resize viewer on window resize
  window.addEventListener('resize', () => {
    if (viewerRenderer && viewerCamera && state.viewerActive) {
      const canvas = $('viewerCanvas');
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      viewerCamera.aspect = w / h;
      viewerCamera.updateProjectionMatrix();
      viewerRenderer.setSize(w, h);
    }
  });
}

function renderFavsOnly(favCars) {
  grid.innerHTML = '';
  if (favCars.length === 0) {
    grid.innerHTML = '<div class="no-results">No favorites yet. Click the ☆ on any car to add it.</div>';
    return;
  }
  // Render favorite cars using the same card builder
  favCars.forEach(car => {
    const card = document.createElement('div');
    card.className = 'car-card';
    card.dataset.id = car.id;
    const isFav = state.favorites.includes(car.id);
    card.innerHTML = `
      <div class="card-top">
        <span class="card-cat">${CATEGORIES[car.category]}</span>
        <button class="fav-star ${isFav ? 'active' : ''}" data-id="${car.id}">${isFav ? '★' : '☆'}</button>
      </div>
      <div class="card-name">${car.name}</div>
      <div class="card-brand">${car.brand} · ${car.year}</div>
      <div class="card-specs">
        <span class="spec-pill">${car.power}</span>
        <span class="spec-pill">${car.topSpeed}</span>
        <span class="spec-pill">0-100: ${car.accel}</span>
      </div>
      <div class="card-footer">
        <span class="card-price">${car.price}</span>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('fav-star')) {
        toggleFavorite(car.id);
        renderFavsOnly(favCars.filter(c => state.favorites.includes(c.id)));
      } else {
        openViewer(car);
      }
    });
    grid.appendChild(card);
  });
  resultCount.textContent = `${favCars.length} favorite${favCars.length !== 1 ? 's' : ''}`;
}

// Start
init();
