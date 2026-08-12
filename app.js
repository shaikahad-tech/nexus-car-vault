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
