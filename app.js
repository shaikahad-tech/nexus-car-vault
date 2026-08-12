/**
 * app.js — NEXUS Car Vault enhanced application.
 * 100 cars, 10 categories, real 3D model sources.
 * Features: search, filter, sort, favorites, compare, GLB loading,
 * color customization, keyboard navigation, URL deep-linking.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CARS, CATEGORIES } from './src/catalog.js';

const state = {
  filter: 'all', search: '', sort: 'default',
  sources: ['sketchfab','poly','github','gltf-direct','kenney','getglb'],
  favorites: JSON.parse(localStorage.getItem('nexus_favs') || '[]'),
  compareList: [],
  viewerActive: false,
  currentCar: null,
  currentColor: 0xff3d2e,
};

const $ = (id) => document.getElementById(id);
const grid = $('carGrid');

function init() {
  buildCategoryFilters();
  renderGrid();
  updateStats();
  bindEvents();
  handleURLParams();
}

function buildCategoryFilters() {
  const cl = $('categoryList');
  const all = document.createElement('button');
  all.className = 'cat-btn active';
  all.textContent = 'All Cars';
  all.dataset.cat = 'all';
  cl.appendChild(all);
  Object.entries(CATEGORIES).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = label;
    btn.dataset.cat = key;
    cl.appendChild(btn);
  });
}

function getFilteredCars() {
  let cars = CARS.slice();
  if (state.filter !== 'all' && state.filter !== '__favs__') cars = cars.filter(c => c.category === state.filter);
  if (state.filter === '__favs__') cars = cars.filter(c => state.favorites.includes(c.id));
  if (state.search) {
    const q = state.search.toLowerCase();
    cars = cars.filter(c => c.name.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  }
  cars = cars.filter(c => state.sources.includes(c.modelSource));
  switch (state.sort) {
    case 'name': cars.sort((a,b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': cars.sort((a,b) => b.name.localeCompare(a.name)); break;
    case 'year': cars.sort((a,b) => b.year - a.year); break;
    case 'year-asc': cars.sort((a,b) => a.year - b.year); break;
    case 'power': cars.sort((a,b) => parsePower(b.power) - parsePower(a.power)); break;
    case 'price': cars.sort((a,b) => parsePrice(b.price) - parsePrice(a.price)); break;
  }
  return cars;
}
function parsePower(s) { const m = String(s).match(/(\d+)/); return m ? parseInt(m[1]) : 0; }
function parsePrice(s) { const m = String(s).replace(/,/g,'').match(/(\d+)/); return m ? parseInt(m[1]) : 0; }

function renderGrid() {
  const cars = getFilteredCars();
  grid.innerHTML = '';
  if (cars.length === 0) { grid.innerHTML = '<div class="no-results">No cars match your filters.</div>'; return; }
  cars.forEach(car => {
    const card = document.createElement('div');
    card.className = 'car-card';
    card.dataset.id = car.id;
    const isFav = state.favorites.includes(car.id);
    const isCompare = state.compareList.includes(car.id);
    const badge = getBadge(car.modelSource);
    card.innerHTML = `
      <div class="card-top">
        <span class="card-cat">${CATEGORIES[car.category]}</span>
        <button class="fav-star ${isFav?'active':''}" data-id="${car.id}">${isFav?'★':'☆'}</button>
      </div>
      <div class="card-name">${car.name}</div>
      <div class="card-brand">${car.brand} · ${car.year}</div>
      <div class="card-specs">
        <span class="spec-pill">${car.power}</span>
        <span class="spec-pill">${car.topSpeed}</span>
        <span class="spec-pill">0-100: ${car.accel}</span>
      </div>
      <div class="card-footer">
        ${badge}
        <span class="card-price">${car.price}</span>
      </div>
      <button class="compare-add-btn ${isCompare?'active':''}" data-id="${car.id}">${isCompare?'✓ Comparing':'+ Compare'}</button>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('fav-star')) toggleFavorite(car.id);
      else if (e.target.classList.contains('compare-add-btn')) toggleCompare(car.id);
      else openViewer(car);
    });
    grid.appendChild(card);
  });
}

function getBadge(src) {
  const badges = {
    sketchfab: '<span class="badge badge-sketch">Sketchfab</span>',
    poly: '<span class="badge badge-poly">Poly Pizza</span>',
    github: '<span class="badge badge-gh">GitHub</span>',
    'gltf-direct': '<span class="badge badge-gltf">GLB Direct</span>',
    kenney: '<span class="badge badge-kenney">Kenney CC0</span>',
    getglb: '<span class="badge badge-getglb">GetGLB</span>',
  };
  return badges[src] || '';
}

function toggleFavorite(id) {
  const idx = state.favorites.indexOf(id);
  if (idx >= 0) state.favorites.splice(idx, 1); else state.favorites.push(id);
  localStorage.setItem('nexus_favs', JSON.stringify(state.favorites));
  updateStats(); renderGrid();
}

function toggleCompare(id) {
  const idx = state.compareList.indexOf(id);
  if (idx >= 0) state.compareList.splice(idx, 1);
  else if (state.compareList.length < 4) state.compareList.push(id);
  updateStats(); renderGrid();
}

function showCompare() {
  const cars = state.compareList.map(id => CARS.find(c => c.id === id)).filter(Boolean);
  const table = $('compareTable');
  if (cars.length < 2) {
    table.innerHTML = '<p style="padding:40px;text-align:center;color:#8b919e;">Select at least 2 cars to compare.</p>';
  } else {
    const specs = ['name','brand','year','category','power','topSpeed','accel','drivetrain','engine','price'];
    const labels = ['Name','Brand','Year','Category','Power','Top Speed','0-100','Drivetrain','Engine','Price'];
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
  $('compareOverlay').classList.add('active');
}

// === 3D Viewer ===
let viewerScene, viewerRenderer, viewerCamera, viewerControls, viewerAnim;
let currentModel = null;

function openViewer(car) {
  const overlay = $('viewerOverlay');
  $('viewerTitle').textContent = car.name;
  $('viewerSubtitle').textContent = `${car.brand} · ${car.year} · ${CATEGORIES[car.category]}`;
  $('viewerSpecs').innerHTML = `
    <div class="spec-row"><span>Power</span><span>${car.power}</span></div>
    <div class="spec-row"><span>Top Speed</span><span>${car.topSpeed}</span></div>
    <div class="spec-row"><span>0-100 km/h</span><span>${car.accel}</span></div>
    <div class="spec-row"><span>Drivetrain</span><span>${car.drivetrain}</span></div>
    <div class="spec-row"><span>Engine</span><span>${car.engine}</span></div>
    <div class="spec-row"><span>Price</span><span>${car.price}</span></div>
  `;
  $('viewerSource').innerHTML = `<span class="source-badge">${car.sourceCredit} (${car.license})</span><a href="${car.modelUrl}" target="_blank" class="source-link">View Source →</a>`;
  overlay.classList.add('active');
  state.viewerActive = true;
  state.currentCar = car;
  updateURL(car.id);
  setTimeout(() => initViewer(car), 100);
}

function initViewer(car) {
  const canvas = $('viewerCanvas');
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 400;
  if (viewerRenderer) { viewerRenderer.dispose(); canvas.innerHTML = ''; }

  viewerScene = new THREE.Scene();
  viewerScene.background = new THREE.Color(0x0a0c10);
  viewerScene.fog = new THREE.FogExp2(0x0a0c10, 0.02);

  viewerCamera = new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
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
  viewerScene.add(new THREE.HemisphereLight(0x4a5a7a, 0x0a0c10, 0.5));
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
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.5, roughness: 0.4 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  viewerScene.add(floor);

  // Accent ring
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3d2e, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(4, 4.1, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  viewerScene.add(ring);

  // Load model
  if (car.modelSource === 'gltf-direct') {
    loadGLBModel(car.modelUrl);
  } else {
    currentModel = buildProceduralCar(car);
    viewerScene.add(currentModel);
    $('viewerLoading').textContent = '';
  }

  let t = 0;
  function animate() {
    if (!state.viewerActive) return;
    viewerAnim = requestAnimationFrame(animate);
    t += 0.016;
    if (currentModel) currentModel.position.y = Math.sin(t * 0.8) * 0.02;
    ringMat.opacity = 0.3 + Math.sin(t * 2) * 0.2;
    viewerControls.update();
    viewerRenderer.render(viewerScene, viewerCamera);
  }
  animate();
}

function loadGLBModel(url) {
  $('viewerLoading').textContent = 'Loading 3D model...';
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    if (currentModel) viewerScene.remove(currentModel);
    currentModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(currentModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 4 / maxDim;
    currentModel.scale.setScalar(scale);
    currentModel.position.x = -center.x * scale;
    currentModel.position.y = -box.min.y * scale;
    currentModel.position.z = -center.z * scale;
    currentModel.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    viewerScene.add(currentModel);
    $('viewerLoading').textContent = '';
  }, (progress) => {
    if (progress.total > 0) {
      const pct = Math.round((progress.loaded / progress.total) * 100);
      $('viewerLoading').textContent = `Loading 3D model... ${pct}%`;
    }
  }, (error) => {
    console.error('GLB load failed:', error);
    $('viewerLoading').textContent = 'Model load failed — using procedural fallback';
    if (state.currentCar) {
      currentModel = buildProceduralCar(state.currentCar);
      viewerScene.add(currentModel);
      setTimeout(() => { $('viewerLoading').textContent = ''; }, 2000);
    }
  });
}

function buildProceduralCar(car) {
  const group = new THREE.Group();
  group.name = car.name;
  const catColors = { hypercar:0xff3d2e, supercar:0x0044ff, sports:0xff6b00, muscle:0x1a1a1a, classic:0x8b0000, ev:0x00d9ff, luxury:0x0a0f1a, suv:0x2d4a2d, concept:0xff00aa, race:0xffffff };
  const bodyColor = state.currentColor || catColors[car.category] || 0xff3d2e;
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: bodyColor, metalness: 0.9, roughness: 0.25, clearcoat: 1.0, clearcoatRoughness: 0.04 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, metalness: 0.3, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8eaed, metalness: 1.0, roughness: 0.15 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, metalness: 0.4, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.65 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.1, roughness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 });
  const taillightMat = new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff2020, emissiveIntensity: 2.5 });
  const isSUV = car.category === 'suv' || car.category === 'luxury';
  const bodyH = isSUV ? 0.9 : 0.55, bodyLen = isSUV ? 4.6 : 4.2, bodyW = isSUV ? 2.1 : 1.9, rideH = isSUV ? 0.6 : 0.45;

  const lower = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, bodyH, bodyW), bodyMat);
  lower.position.y = rideH; lower.castShadow = true; group.add(lower);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(bodyLen - 0.6, 0.45, bodyW - 0.05), bodyMat);
  mid.position.y = rideH + 0.35; mid.castShadow = true; group.add(mid);

  const cabinH = isSUV ? 0.75 : 0.5;
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.0, 0); cabinShape.lineTo(0.9, 0); cabinShape.lineTo(0.5, cabinH); cabinShape.lineTo(-0.6, cabinH); cabinShape.closePath();
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  cabinGeo.translate(0, 0, -0.7);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0.1, rideH + bodyH - 0.05, 0); cabin.castShadow = true; group.add(cabin);

  const wheelPositions = [{x:-1.4,z:0.95},{x:-1.4,z:-0.95},{x:1.5,z:0.95},{x:1.5,z:-0.95}];
  const wheelR = 0.48;
  wheelPositions.forEach(pos => {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.22, 16, 32), tireMat);
    tire.rotation.y = Math.PI / 2; tire.position.set(pos.x, wheelR, pos.z); tire.castShadow = true; group.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelR - 0.05, wheelR - 0.05, 0.24, 24), chrome);
    rim.rotation.z = Math.PI / 2; rim.position.copy(tire.position); group.add(rim);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, wheelR * 1.4, 0.08), darkPlastic);
      spoke.rotation.x = angle; spoke.position.copy(tire.position); group.add(spoke);
    }
  });

  [0.65, -0.65].forEach(z => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.4), headlightMat);
    hl.position.set(-bodyLen / 2 - 0.01, rideH + 0.2, z); group.add(hl);
  });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.5), taillightMat);
  tl.position.set(bodyLen / 2 + 0.01, rideH + 0.3, 0); group.add(tl);

  if (['supercar','hypercar','sports','race'].includes(car.category)) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 1.7), darkPlastic);
    wing.position.set(bodyLen / 2 - 0.3, rideH + 0.8, 0); group.add(wing);
    [0.6, -0.6].forEach(z => {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), darkPlastic);
      support.position.set(bodyLen / 2 - 0.3, rideH + 0.65, z); group.add(support);
    });
  }
  if (['hypercar','race','supercar'].includes(car.category)) {
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, bodyW), darkPlastic);
    splitter.position.set(-bodyLen / 2 + 0.05, rideH - 0.05, 0); group.add(splitter);
  }
  return group;
}

function changeCarColor(hex) {
  state.currentColor = parseInt(hex.replace('#',''), 16);
  if (currentModel && state.currentCar) {
    viewerScene.remove(currentModel);
    currentModel = buildProceduralCar(state.currentCar);
    viewerScene.add(currentModel);
  }
}

function closeViewer() {
  state.viewerActive = false;
  if (viewerAnim) cancelAnimationFrame(viewerAnim);
  $('viewerOverlay').classList.remove('active');
  updateURL('');
}

function updateStats() {
  const cars = getFilteredCars();
  $('resultCount').textContent = `${cars.length} car${cars.length !== 1 ? 's' : ''}`;
  $('favCount').textContent = state.favorites.length;
  $('compareCount').textContent = state.compareList.length;
}

// === URL Deep-Linking ===
function updateURL(carId) {
  const params = new URLSearchParams();
  if (carId) params.set('car', carId);
  if (state.filter !== 'all') params.set('cat', state.filter);
  const qs = params.toString();
  window.history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
}

function handleURLParams() {
  const params = new URLSearchParams(window.location.search);
  const carId = params.get('car');
  const cat = params.get('cat');
  if (cat) {
    state.filter = cat;
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    renderGrid(); updateStats();
  }
  if (carId) {
    const car = CARS.find(c => c.id === carId);
    if (car) setTimeout(() => openViewer(car), 300);
  }
}

// === Keyboard Navigation ===
function navigateCars(direction) {
  const cars = getFilteredCars();
  if (cars.length === 0) return;
  let idx = cars.findIndex(c => c.id === (state.currentCar?.id || ''));
  idx = (idx + direction + cars.length) % cars.length;
  openViewer(cars[idx]);
}

// === Events ===
function bindEvents() {
  $('searchInput').addEventListener('input', (e) => { state.search = e.target.value; renderGrid(); updateStats(); });
  $('categoryList').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn'); if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = btn.dataset.cat;
    renderGrid(); updateStats(); updateURL('');
  });
  $('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });
  $('sourceFilter').addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      state.sources = Array.from(document.querySelectorAll('#sourceFilter input:checked')).map(c => c.value);
      renderGrid(); updateStats();
    }
  });
  $('favBtn').addEventListener('click', () => {
    state.filter = state.filter === '__favs__' ? 'all' : '__favs__';
    renderGrid(); updateStats();
  });
  $('compareBtn').addEventListener('click', showCompare);
  $('compareClose').addEventListener('click', () => $('compareOverlay').classList.remove('active'));
  $('viewerClose').addEventListener('click', closeViewer);

  // Color picker
  $('colorPicker').addEventListener('input', (e) => changeCarColor(e.target.value));

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!state.viewerActive) return;
    if (e.key === 'ArrowLeft') navigateCars(-1);
    if (e.key === 'ArrowRight') navigateCars(1);
    if (e.key === 'Escape') closeViewer();
  });

  window.addEventListener('resize', () => {
    if (viewerRenderer && viewerCamera && state.viewerActive) {
      const canvas = $('viewerCanvas');
      const w = canvas.clientWidth, h = canvas.clientHeight;
      viewerCamera.aspect = w / h;
      viewerCamera.updateProjectionMatrix();
      viewerRenderer.setSize(w, h);
    }
  });
}

init();