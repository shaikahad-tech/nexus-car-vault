/**
 * app.js — NEXUS Car Vault v3
 * Fixed: viewerLoading destruction bug, improved procedural car,
 * proper color space, environment lighting, robust error handling.
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
let viewerBodyMat = null;

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
  state.currentColor = 0xff3d2e;
  $('colorPicker').value = '#ff3d2e';
  setTimeout(() => initViewer(car), 150);
}

function initViewer(car) {
  const canvasContainer = $('viewerCanvas');
  const w = canvasContainer.clientWidth || 800;
  const h = canvasContainer.clientHeight || 400;

  // FIX: Don't destroy viewerLoading — only remove old renderer canvas
  if (viewerRenderer) {
    viewerRenderer.dispose();
    const oldCanvas = canvasContainer.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
  }

  viewerScene = new THREE.Scene();
  viewerScene.background = new THREE.Color(0x0a0c10);
  viewerScene.fog = new THREE.FogExp2(0x0a0c10, 0.015);

  viewerCamera = new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
  viewerCamera.position.set(7, 4, 9);

  viewerRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  viewerRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  viewerRenderer.setSize(w, h);
  viewerRenderer.shadowMap.enabled = true;
  viewerRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewerRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  viewerRenderer.toneMappingExposure = 1.3;
  viewerRenderer.outputColorSpace = THREE.SRGBColorSpace;
  canvasContainer.appendChild(viewerRenderer.domElement);

  viewerControls = new OrbitControls(viewerCamera, viewerRenderer.domElement);
  viewerControls.enableDamping = true;
  viewerControls.dampingFactor = 0.06;
  viewerControls.minDistance = 4;
  viewerControls.maxDistance = 25;
  viewerControls.target.set(0, 0.5, 0);
  viewerControls.autoRotate = true;
  viewerControls.autoRotateSpeed = 0.5;

  // === Lighting ===
  viewerScene.add(new THREE.HemisphereLight(0x6a7a9a, 0x0a0c10, 0.6));

  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(8, 14, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 50;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.0005;
  viewerScene.add(key);

  const rim = new THREE.DirectionalLight(0x00d9ff, 1.2);
  rim.position.set(-7, 5, -8);
  viewerScene.add(rim);

  const fill = new THREE.DirectionalLight(0xff3d2e, 0.6);
  fill.position.set(-4, 3, 8);
  viewerScene.add(fill);

  // Spotlight from above for dramatic effect
  const spot = new THREE.SpotLight(0xffffff, 1.5, 30, Math.PI / 5, 0.5, 1);
  spot.position.set(0, 15, 0);
  spot.target.position.set(0, 0, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  viewerScene.add(spot);
  viewerScene.add(spot.target);

  // === Floor ===
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.6, roughness: 0.3 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(15, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  viewerScene.add(floor);

  // Grid floor
  const gridHelper = new THREE.GridHelper(20, 40, 0x1a1f2a, 0x141821);
  gridHelper.position.y = 0.01;
  viewerScene.add(gridHelper);

  // Accent ring
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3d2e, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.5, 3.6, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  viewerScene.add(ring);

  // === Load model ===
  currentModel = null;
  viewerBodyMat = null;

  if (car.modelSource === 'gltf-direct') {
    loadGLBModel(car.modelUrl);
  } else {
    currentModel = buildProceduralCar(car);
    viewerScene.add(currentModel);
    setViewerLoading('');
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

function setViewerLoading(text) {
  const el = $('viewerLoading');
  if (el) el.textContent = text;
}

function loadGLBModel(url) {
  setViewerLoading('Loading 3D model...');
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    if (currentModel) viewerScene.remove(currentModel);
    currentModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(currentModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.01);
    const scale = 4 / maxDim;
    currentModel.scale.setScalar(scale);
    currentModel.position.x = -center.x * scale;
    currentModel.position.y = -box.min.y * scale;
    currentModel.position.z = -center.z * scale;
    currentModel.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    viewerScene.add(currentModel);
    setViewerLoading('');
  }, (progress) => {
    if (progress.total > 0) {
      const pct = Math.round((progress.loaded / progress.total) * 100);
      setViewerLoading(`Loading 3D model... ${pct}%`);
    }
  }, (error) => {
    console.error('GLB load failed:', error);
    setViewerLoading('Model load failed — showing procedural car');
    if (state.currentCar) {
      currentModel = buildProceduralCar(state.currentCar);
      viewerScene.add(currentModel);
      setTimeout(() => setViewerLoading(''), 2000);
    }
  });
}

// === Procedural Car Builder (v2 — much more detailed) ===
function buildProceduralCar(car) {
  const group = new THREE.Group();
  group.name = car.name;

  const catColors = {
    hypercar: 0xff3d2e, supercar: 0x0044ff, sports: 0xff6b00,
    muscle: 0x1a1a1a, classic: 0x8b0000, ev: 0x00d9ff,
    luxury: 0x0a0f1a, suv: 0x2d4a2d, concept: 0xff00aa, race: 0xffffff
  };
  const bodyColor = state.currentColor || catColors[car.category] || 0xff3d2e;

  // Materials
  viewerBodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor, metalness: 0.9, roughness: 0.25,
    clearcoat: 1.0, clearcoatRoughness: 0.04
  });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, metalness: 0.3, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8eaed, metalness: 1.0, roughness: 0.1 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0e14, metalness: 0.4, roughness: 0.05,
    transmission: 0.5, transparent: true, opacity: 0.6
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.1, roughness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.0 });
  const taillightMat = new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff2020, emissiveIntensity: 3.0 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.5, roughness: 0.4 });

  const cat = car.category;
  const isSUV = cat === 'suv';
  const isSports = ['supercar','hypercar','sports','race'].includes(cat);
  const isConcept = cat === 'concept';

  // Dimensions per category
  const dims = {
    suv:     { bodyLen: 4.8, bodyW: 2.1, bodyH: 0.9, rideH: 0.65, cabinH: 0.8 },
    luxury:   { bodyLen: 4.8, bodyW: 2.0, bodyH: 0.75, rideH: 0.5, cabinH: 0.6 },
    hypercar: { bodyLen: 4.4, bodyW: 2.0, bodyH: 0.5, rideH: 0.4, cabinH: 0.42 },
    supercar: { bodyLen: 4.3, bodyW: 1.95, bodyH: 0.52, rideH: 0.42, cabinH: 0.45 },
    sports:   { bodyLen: 4.2, bodyW: 1.9, bodyH: 0.55, rideH: 0.45, cabinH: 0.5 },
    muscle:   { bodyLen: 4.6, bodyW: 2.0, bodyH: 0.6, rideH: 0.45, cabinH: 0.5 },
    classic:   { bodyLen: 4.4, bodyW: 1.85, bodyH: 0.6, rideH: 0.45, cabinH: 0.55 },
    ev:       { bodyLen: 4.3, bodyW: 1.95, bodyH: 0.58, rideH: 0.45, cabinH: 0.55 },
    concept:   { bodyLen: 4.5, bodyW: 2.0, bodyH: 0.48, rideH: 0.38, cabinH: 0.4 },
    race:     { bodyLen: 4.3, bodyW: 1.95, bodyH: 0.5, rideH: 0.4, cabinH: 0.4 },
  };
  const d = dims[cat] || dims.sports;

  // === Lower body (main chassis) ===
  const lowerGeo = new THREE.BoxGeometry(d.bodyLen, d.bodyH, d.bodyW, 2, 1, 2);
  const lowerPositions = lowerGeo.attributes.position;
  for (let i = 0; i < lowerPositions.count; i++) {
    const x = lowerPositions.getX(i);
    const z = lowerPositions.getZ(i);
    if (x < -d.bodyLen * 0.4) {
      const taper = (x + d.bodyLen * 0.4) / (d.bodyLen * 0.1);
      lowerPositions.setZ(i, z * Math.max(0.7, 1 + taper * 0.3));
    }
  }
  lowerGeo.computeVertexNormals();
  const lower = new THREE.Mesh(lowerGeo, viewerBodyMat);
  lower.position.y = d.rideH;
  lower.castShadow = true;
  lower.receiveShadow = true;
  group.add(lower);

  // === Mid section ===
  const midLen = d.bodyLen * 0.6;
  const mid = new THREE.Mesh(new THREE.BoxGeometry(midLen, d.bodyH * 0.6, d.bodyW - 0.06), viewerBodyMat);
  mid.position.set(0.1, d.rideH + d.bodyH * 0.5, 0);
  mid.castShadow = true;
  group.add(mid);

  // === Hood scoop ===
  if (['muscle','sports','race'].includes(cat)) {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.5), carbonMat);
    scoop.position.set(-d.bodyLen * 0.25, d.rideH + d.bodyH + 0.01, 0);
    group.add(scoop);
  }

  // === Cabin/Greenhouse ===
  const cabinShape = new THREE.Shape();
  const ch = d.cabinH;
  if (isSUV) {
    cabinShape.moveTo(-1.4, 0); cabinShape.lineTo(1.4, 0);
    cabinShape.lineTo(1.5, ch); cabinShape.lineTo(-1.5, ch);
  } else if (isSports) {
    cabinShape.moveTo(-0.8, 0); cabinShape.lineTo(1.0, 0);
    cabinShape.lineTo(0.6, ch); cabinShape.lineTo(-0.5, ch);
  } else {
    cabinShape.moveTo(-1.0, 0); cabinShape.lineTo(1.1, 0);
    cabinShape.lineTo(0.7, ch); cabinShape.lineTo(-0.6, ch);
  }
  cabinShape.closePath();
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    depth: d.bodyW - 0.15, bevelEnabled: true,
    bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3
  });
  cabinGeo.translate(0, 0, -(d.bodyW - 0.15) / 2);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0.2, d.rideH + d.bodyH - 0.05, 0);
  cabin.castShadow = true;
  group.add(cabin);

  // === Roof for SUV/luxury ===
  if (isSUV || cat === 'luxury') {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, d.bodyW - 0.2), viewerBodyMat);
    roof.position.set(0, d.rideH + d.bodyH + ch - 0.04, 0);
    roof.castShadow = true;
    group.add(roof);
  }

  // === Wheels ===
  const wheelR = isSUV ? 0.55 : 0.48;
  const wheelW = 0.32;
  const wp = [
    {x: -d.bodyLen * 0.35, z: d.bodyW * 0.48},
    {x: -d.bodyLen * 0.35, z: -d.bodyW * 0.48},
    {x: d.bodyLen * 0.36, z: d.bodyW * 0.48},
    {x: d.bodyLen * 0.36, z: -d.bodyW * 0.48},
  ];

  wp.forEach(pos => {
    const tireGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 32);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(pos.x, wheelR, pos.z);
    tire.castShadow = true;
    group.add(tire);

    const rimGeo = new THREE.CylinderGeometry(wheelR - 0.08, wheelR - 0.08, wheelW + 0.02, 24);
    const rimMesh = new THREE.Mesh(rimGeo, chrome);
    rimMesh.rotation.z = Math.PI / 2;
    rimMesh.position.copy(tire.position);
    group.add(rimMesh);

    const spokeCount = isSports ? 5 : 6;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, wheelR * 1.5, 0.06), isSports ? chrome : darkPlastic);
      spoke.rotation.x = angle;
      spoke.position.copy(tire.position);
      group.add(spoke);
    }

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.55, wheelR * 0.55, 0.03, 16), chrome);
    disc.rotation.z = Math.PI / 2;
    disc.position.copy(tire.position);
    group.add(disc);

    const archGeo = new THREE.TorusGeometry(wheelR + 0.1, 0.08, 8, 16, Math.PI);
    const arch = new THREE.Mesh(archGeo, darkPlastic);
    arch.position.set(pos.x, wheelR, pos.z);
    arch.rotation.y = pos.z > 0 ? 0 : Math.PI;
    arch.rotation.z = Math.PI / 2;
    group.add(arch);
  });

  // === Front splitter ===
  if (isSports || cat === 'hypercar' || cat === 'race') {
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, d.bodyW - 0.1), carbonMat);
    splitter.position.set(-d.bodyLen / 2 + 0.08, d.rideH - 0.02, 0);
    splitter.castShadow = true;
    group.add(splitter);
  }

  // === Headlights ===
  [-0.6, 0.6].forEach(z => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.35), headlightMat);
    hl.position.set(-d.bodyLen / 2 - 0.01, d.rideH + d.bodyH * 0.4, z * 0.7);
    group.add(hl);
  });

  // === Taillights ===
  const tlBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, d.bodyW * 0.8), taillightMat);
  tlBar.position.set(d.bodyLen / 2 + 0.01, d.rideH + d.bodyH * 0.5, 0);
  group.add(tlBar);

  // === Rear wing ===
  if (['supercar','hypercar','sports','race'].includes(cat)) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, d.bodyW * 0.85), carbonMat);
    wing.position.set(d.bodyLen / 2 - 0.35, d.rideH + d.bodyH + 0.3, 0);
    wing.castShadow = true;
    group.add(wing);
    [0.5, -0.5].forEach(z => {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), darkPlastic);
      support.position.set(d.bodyLen / 2 - 0.35, d.rideH + d.bodyH + 0.17, z);
      group.add(support);
    });
  }

  // === Side mirrors ===
  [0.5, -0.5].forEach(z => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.06), viewerBodyMat);
    mirror.position.set(0, d.rideH + d.bodyH + 0.15, z * (d.bodyW * 0.55));
    mirror.castShadow = true;
    group.add(mirror);
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.1), darkPlastic);
    mirrorArm.position.set(0, d.rideH + d.bodyH + 0.15, z * (d.bodyW * 0.5));
    group.add(mirrorArm);
  });

  // === Diffuser ===
  if (isSports) {
    const diff = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, d.bodyW - 0.2), carbonMat);
    diff.position.set(d.bodyLen / 2 - 0.1, d.rideH - 0.02, 0);
    group.add(diff);
    [-0.4, -0.2, 0, 0.2, 0.4].forEach(z => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.02), carbonMat);
      fin.position.set(d.bodyLen / 2 - 0.1, d.rideH, z * 0.5);
      group.add(fin);
    });
  }

  // === Exhaust pipes ===
  if (cat !== 'ev' && cat !== 'concept') {
    [0.3, -0.3].forEach(z => {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12), chrome);
      exhaust.rotation.z = Math.PI / 2;
      exhaust.position.set(d.bodyLen / 2 + 0.02, d.rideH + 0.1, z);
      group.add(exhaust);
    });
  }

  // === Concept car glow ===
  if (isConcept) {
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
    [-1.5, 1.5].forEach(x => {
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), glowMat.clone());
      glow.position.set(x, d.rideH + 0.1, 0);
      group.add(glow);
    });
  }

  // Center the model
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;

  return group;
}

function changeCarColor(hex) {
  state.currentColor = parseInt(hex.replace('#',''), 16);
  if (viewerBodyMat) {
    viewerBodyMat.color.setHex(state.currentColor);
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

  $('colorPicker').addEventListener('input', (e) => changeCarColor(e.target.value));

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
      if (w > 0 && h > 0) {
        viewerCamera.aspect = w / h;
        viewerCamera.updateProjectionMatrix();
        viewerRenderer.setSize(w, h);
      }
    }
  });
}

init();