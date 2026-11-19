/* Shared shell + helpers for every Batloung page */
const NAV = [
  ['index.html', 'Dashboard & Reports', 'Overview, totals and reports'],
  ['stock.html', 'Fruits & Stock', 'Fruit catalogue and stock levels'],
  ['suppliers.html', 'Suppliers & Purchases', 'Manage suppliers and incoming stock'],
  ['pos.html', 'Sales / POS', 'Create and review sales'],
  ['vendors.html', 'Vendors & Debtors', 'Manage vendors and balances'],
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => 'M ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n) => Number(n || 0).toLocaleString('en-US');
const SIZE_LABEL = { SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large' };
const STATUS_CHIP = {
  PAID: '<span class="chip chip-paid">PAID</span>',
  PARTIALLY_PAID: '<span class="chip chip-part">PARTIALLY PAID</span>',
  UNPAID: '<span class="chip chip-unpaid">UNPAID</span>',
};
const $ = (sel, root = document) => root.querySelector(sel);

function toast(message, type = 'ok', details) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div>${esc(message)}</div>` + (details && details.length ? `<ul>${details.map((d) => `<li>${esc(typeof d === 'string' ? d : JSON.stringify(d))}</li>`).join('')}</ul>` : '');
  box.appendChild(el);
  setTimeout(() => el.remove(), type === 'err' ? 9000 : 4000);
}

/** Calls the REST API. Resolves with the JSON body, rejects with an Error (message from server). */
async function api(method, path, body) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw Object.assign(new Error('Cannot reach the server.'), { details: [] });
  }
  let json = {};
  try { json = await res.json(); } catch (e) { /* non-JSON */ }
  if (!res.ok) {
    const err = json.error || {};
    throw Object.assign(new Error(err.message || `Request failed (${res.status})`), { status: res.status, code: err.code, details: err.details || [] });
  }
  return json;
}

/** Runs an action and shows a toast on failure. Returns undefined when it failed. */
async function attempt(fn, okMsg) {
  try {
    const r = await fn();
    if (okMsg) toast(okMsg, 'ok');
    return r ?? true;
  } catch (e) {
    const det = (e.details || []).map((d) => (typeof d === 'object' ? `${d.fruit_name} (${d.packaging_size}): requested ${d.requested}, available ${d.available}` : d));
    toast(e.message, 'err', det);
  }
}

function openModal(html) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) bg.remove(); });
  document.body.appendChild(bg);
  const first = bg.querySelector('input,select,textarea');
  if (first) first.focus();
  return bg;
}

function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { if (String(v).trim() !== '') o[k] = v; });
  return o;
}

function buildShell(active, tag) {
  const path = location.pathname.split('/').pop() || 'index.html';
  const links = NAV.map(([href, label, description], i) => {
    const on = href === (active || path);
    return `<a href="${href}" class="switch-link${on ? ' is-active' : ''}"${on ? ' aria-current="page"' : ''}>
      <span class="switch-link-number">${String(i + 1).padStart(2, '0')}</span>
      <span class="switch-link-copy"><span class="switch-link-title">${esc(label)}</span><span class="switch-link-description">${esc(description)}</span></span>
      <span class="switch-link-arrow" aria-hidden="true">→</span>
    </a>`;
  }).join('');
  const el = document.createElement('header');
  el.className = 'app-shell';
  el.innerHTML = `
    <div class="h-12 w-full bg-primary text-on-primary px-margin md:px-gutter-desktop flex items-center justify-between">
      <div class="flex items-center gap-space-md min-w-0">
        <span class="font-mono-label-xs text-mono-label-xs bg-secondary px-space-xs py-0.5 text-on-secondary hidden sm:inline">[${esc(tag || 'SEC-A')}]</span>
        <span class="font-headline-sm text-headline-sm uppercase tracking-wider truncate">BATLOUNG FARM // MANAGEMENT</span>
        <span class="font-mono-label-sm text-mono-label-sm text-primary-fixed-dim hidden xl:inline">• MASERU, LESOTHO</span>
      </div>
      <div class="flex items-center gap-space-md font-mono-label-xs text-mono-label-xs text-primary-fixed-dim">
        <span id="db-status" class="flex items-center gap-space-xs"><span class="w-1.5 h-1.5 rounded-full bg-outline"></span>DB: CHECKING</span>
        <span class="hidden md:inline">|</span>
        <span class="hidden md:inline text-on-primary" id="clock"></span>
      </div>
    </div>
    <div class="switchboard px-margin md:px-gutter-desktop">
      <div class="switchboard-heading">
        <div>
          <div class="font-mono-label-xs text-mono-label-xs text-secondary uppercase tracking-wider">Switchboard</div>
          <div class="switchboard-instruction">Choose a section to switch areas</div>
        </div>
      </div>
      <nav class="switchboard-grid" aria-label="Switch sections">${links}</nav>
    </div>
  `;
  document.body.prepend(el);
  const t = document.createElement('div');
  t.id = 'toasts';
  document.body.appendChild(t);

  const tick = () => { const c = $('#clock'); if (c) c.textContent = new Date().toLocaleTimeString('en-GB') + ' SAST'; };
  tick(); setInterval(tick, 1000);
  fetch('/api/health').then((r) => r.json().then((j) => ({ ok: r.ok, j }))).then(({ ok }) => {
    $('#db-status').innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${ok ? 'bg-tertiary-fixed' : 'bg-error'}"></span>DB: ${ok ? 'ONLINE' : 'OFFLINE'}`;
  }).catch(() => { $('#db-status').innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-error"></span>API: OFFLINE'; });
}

function pageHeader(tag, title, text, actionsHtml = '') {
  return `<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md">
    <div>
      <div class="font-mono-label-xs text-mono-label-xs text-secondary tracking-widest uppercase">${esc(tag)}</div>
      <h1 class="font-headline-lg text-headline-lg uppercase text-on-surface tracking-tighter mt-space-xs">${esc(title)}</h1>
      <p class="font-body-md text-body-md text-on-surface-variant max-w-2xl">${esc(text)}</p>
    </div>
    <div class="flex gap-space-sm flex-wrap">${actionsHtml}</div></div>`;
}

const sectionTitle = (t) => `<div class="font-mono-label-xs text-mono-label-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-space-xs mb-space-sm"><span class="w-1.5 h-1.5 bg-primary rounded-full"></span>${esc(t)}</div>`;
const emptyRow = (cols, msg = 'No records yet') => `<tr><td colspan="${cols}" class="text-center text-on-surface-variant py-space-lg">${msg}</td></tr>`;

function boot(active, tag, render) {
  document.addEventListener('DOMContentLoaded', () => {
    buildShell(active, tag);
    render();
  });
}

/* ---------------------------------------------------------------------
   Maps (Leaflet + OpenStreetMap: free, no API key)
   --------------------------------------------------------------------- */
let leafletPromise;
function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.onload = resolve;
      js.onerror = () => { leafletPromise = null; reject(new Error('Could not load the map library. Check your internet connection.')); };
      document.head.appendChild(js);
    });
  }
  return leafletPromise;
}
const addTiles = (map) => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
const mapsLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

/** Read-only map showing the saved pin. */
async function mountView(el, lat, lng, label) {
  if (lat == null || lng == null) {
    el.innerHTML = '<div class="h-full flex items-center justify-center text-on-surface-variant font-mono-label-sm text-mono-label-sm">NO MAP PIN WAS SAVED FOR THIS RECORD</div>';
    return;
  }
  try { await ensureLeaflet(); } catch (e) { el.textContent = e.message; return; }
  const map = L.map(el).setView([lat, lng], 14);
  addTiles(map);
  L.marker([lat, lng]).addTo(map).bindPopup(esc(label)).openPopup();
  setTimeout(() => map.invalidateSize(), 150);
}

/** HTML of the pin picker used inside registration forms. */
function pickerHtml(lat, lng) {
  return `<div class="flex flex-col gap-space-xs">
    <label class="lbl">Pin the exact location (click the map, drag the pin, or use Google Maps coordinates)</label>
    <div class="flex gap-space-xs">
      <input class="field" id="mapSearch" placeholder="Search a place, e.g. Maseru bus rank">
      <button type="button" class="btn btn-ghost" id="mapSearchBtn">Search</button>
      <button type="button" class="btn btn-ghost" id="mapLocate" title="Use my current location">My location</button>
    </div>
    <div class="flex gap-space-xs">
      <input class="field" id="googleMapCoordinates" aria-label="Google Maps coordinates or URL" placeholder="Paste coordinates or Google Maps URL">
      <button type="button" class="btn btn-ghost" id="useGoogleMapCoordinates">Use exact pin</button>
    </div>
    <div id="pickMap" style="height:260px" class="bg-surface-container"></div>
    <div class="flex flex-wrap items-center justify-between gap-space-xs">
      <div id="pinTxt" class="font-mono-label-sm text-mono-label-sm text-on-surface-variant">No pin yet</div>
      <a id="pinGoogleLink" class="font-mono-label-sm text-mono-label-sm underline text-secondary" target="_blank" rel="noopener" hidden>Open this exact pin in Google Maps</a>
    </div>
    <input type="hidden" name="latitude" value="${lat ?? ''}"><input type="hidden" name="longitude" value="${lng ?? ''}">
  </div>`;
}

function parseMapCoordinates(value) {
  const text = value.trim();
  const decimal = '-?\\d+(?:\\.\\d+)?';
  const patterns = [
    new RegExp(`^\\s*(${decimal})\\s*,\\s*(${decimal})\\s*$`),
    new RegExp(`@(${decimal}),\\s*(${decimal})`),
    new RegExp(`!3d(${decimal})!4d(${decimal})`),
    new RegExp(`[?&](?:q|query|ll|center)=(${decimal})(?:%2C|,|%20|\\+)(${decimal})`, 'i'),
  ];
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return [latitude, longitude];
}

/** Makes the picker interactive. `center` is [lat, lng, zoom] used when there is no pin yet. */
async function mountPicker(root, lat, lng, center) {
  try { await ensureLeaflet(); } catch (e) { toast(e.message, 'err'); return; }
  const has = lat != null && lng != null;
  const c = has ? [lat, lng, 15] : (center || [-29.31, 27.48, 12]);
  const map = L.map($('#pickMap', root)).setView([c[0], c[1]], c[2]);
  addTiles(map);
  let marker = null;
  const form = $('#pickMap', root).closest('form');
  const set = (la, ln, pan) => {
    la = Number(la.toFixed(7)); ln = Number(ln.toFixed(7));
    if (marker) marker.setLatLng([la, ln]);
    else {
      marker = L.marker([la, ln], { draggable: true }).addTo(map);
      marker.on('dragend', (e) => { const p = e.target.getLatLng(); set(p.lat, p.lng); });
    }
    form.elements.latitude.value = la;
    form.elements.longitude.value = ln;
    $('#pinTxt', root).textContent = `Pinned: ${la}, ${ln}`;
    const googleLink = $('#pinGoogleLink', root);
    googleLink.href = mapsLink(la, ln);
    googleLink.hidden = false;
    if (pan) map.setView([la, ln], Math.max(map.getZoom(), 15));
  };
  map.on('click', (e) => set(e.latlng.lat, e.latlng.lng));
  if (has) set(lat, lng);

  const search = async () => {
    const q = $('#mapSearch', root).value.trim();
    if (!q) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const j = await res.json();
      if (!j.length) return toast('Place not found. Try another name or click the map.', 'err');
      set(Number(j[0].lat), Number(j[0].lon), true);
    } catch (e) { toast('Search failed. Click the map to place the pin instead.', 'err'); }
  };
  $('#mapSearchBtn', root).addEventListener('click', search);
  $('#mapSearch', root).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } });
  const useGoogleCoordinates = () => {
    const coordinates = parseMapCoordinates($('#googleMapCoordinates', root).value);
    if (!coordinates) return toast('Enter valid coordinates (latitude, longitude) or a Google Maps URL containing coordinates.', 'err');
    set(coordinates[0], coordinates[1], true);
  };
  $('#useGoogleMapCoordinates', root).addEventListener('click', useGoogleCoordinates);
  $('#googleMapCoordinates', root).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); useGoogleCoordinates(); }
  });
  $('#mapLocate', root).addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Location is not supported by this browser.', 'err');
    navigator.geolocation.getCurrentPosition(
      (p) => set(p.coords.latitude, p.coords.longitude, true),
      () => toast('Could not get your location. Click the map instead.', 'err'));
  });
  setTimeout(() => map.invalidateSize(), 150);
}

/** Label/value grid for the details windows. */
const detailGrid = (rows) => `<div class="grid grid-cols-2 gap-space-sm my-space-md">${rows.map(([l, v]) => `<div class="bg-surface-container p-space-sm"><div class="lbl">${l}</div><div class="font-mono-data-md text-mono-data-md break-words">${v}</div></div>`).join('')}</div>`;

/** Stock status chip: AVAILABLE / LOW / NOT AVAILABLE. */
const STOCK_CHIP = {
  AVAILABLE: '<span class="chip chip-paid">AVAILABLE</span>',
  LOW_STOCK: '<span class="chip chip-part">LOW STOCK</span>',
  NOT_AVAILABLE: '<span class="chip chip-low">NOT AVAILABLE</span>',
};
