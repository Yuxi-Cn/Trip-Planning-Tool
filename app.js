/* Wayfare: a tiny trip planner. No build step, no dependencies.
   Trips live in localStorage; photos (compressed) live in IndexedDB. */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);

// ---------- storage ----------
let trips = JSON.parse(localStorage.getItem('wayfare.trips') || '[]');
const save = () => localStorage.setItem('wayfare.trips', JSON.stringify(trips));

const dbReady = new Promise((ok, fail) => {
  const r = indexedDB.open('wayfare', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('photos');
  r.onsuccess = () => ok(r.result);
  r.onerror = () => fail(r.error);
});
const idb = (mode, fn) => dbReady.then(db => new Promise((ok, fail) => {
  const t = db.transaction('photos', mode), q = fn(t.objectStore('photos'));
  t.oncomplete = () => ok(q && q.result); t.onerror = () => fail(t.error);
}));
const urls = {};
const photoUrl = id => urls[id] ||= idb('readonly', s => s.get(id)).then(b => b ? URL.createObjectURL(b) : '');
async function shrink(file, max = 1400) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', .82));
}
async function storePhoto(file) {
  const id = uid(), blob = await shrink(file);
  await idb('readwrite', s => s.put(blob, id));
  return id;
}
async function hydrate() {
  for (const el of document.querySelectorAll('[data-photo-src]')) {
    const u = await photoUrl(el.dataset.photoSrc);
    if (!u) continue;
    if (el.tagName === 'IMG') el.src = u; else el.style.backgroundImage = `url(${u})`;
  }
}

// ---------- helpers ----------
const day0 = s => new Date(s + 'T00:00');
const addDays = (s, n) => { const d = day0(s); d.setDate(d.getDate() + n); return d; };
const fmt = d => (typeof d === 'string' ? day0(d) : d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const dayCount = t => Math.min(21, Math.max(1, Math.round((day0(t.end) - day0(t.start)) / 864e5) + 1));
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const cur = () => trips.find(t => t.id === view.id);
const dayOpts = (n, sel) => Array.from({ length: n }, (_, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>Day ${i + 1}</option>`).join('');

// ---------- views ----------
let view = { name: 'list' }, draftCover = null;
const go = v => { view = v; render(); scrollTo(0, 0); };

function render() {
  $('#app').innerHTML = view.name === 'new' ? newView() : view.name === 'trip' ? tripView() : listView();
  hydrate();
}

function listView() {
  const cards = trips.map(t => `
    <article class="card" data-act="open" data-id="${t.id}">
      <div class="cover" ${t.cover ? `data-photo-src="${t.cover}"` : ''}></div>
      <div class="stamp">${dayCount(t)} ${dayCount(t) === 1 ? 'day' : 'days'}</div>
      <div class="meta"><h2>${esc(t.destination)}</h2><p>${fmt(t.start)} to ${fmt(t.end)}, ${t.spots.length} ${t.spots.length === 1 ? 'place' : 'places'}</p></div>
    </article>`).join('');
  return `<header class="top"><h1>Wayfare</h1><p>Plan the trip. Dress it up with your own photos.</p></header>
    ${cards || '<p class="empty">No trips yet. Add a destination, your dates and the places you want to see.</p>'}
    <button class="btn fab" data-act="new">New trip</button>`;
}

function newView() {
  const today = iso(new Date()), later = iso(addDays(today, 2));
  return `<button class="link" data-act="back">‹ Trips</button>
    <h1>New trip</h1>
    <form data-form="trip">
      <label for="dest">Where to?</label>
      <input id="dest" name="destination" type="text" placeholder="Lisbon, Portugal" required autocomplete="off">
      <div class="row">
        <div><label for="s">From</label><input id="s" name="start" type="date" value="${today}" required></div>
        <div><label for="e">To</label><input id="e" name="end" type="date" value="${later}" required></div>
      </div>
      <label for="spots">Places to visit</label>
      <textarea id="spots" name="spots" placeholder="Belém Tower&#10;Alfama walk&#10;Time Out Market"></textarea>
      <p class="hint">One place per line. They are spread across your days, and you can move them later.</p>
      <label>Cover photo</label>
      <div class="pick">
        <div class="thumb" ${draftCover ? `data-photo-src="${draftCover}"` : ''}></div>
        <label class="btn quiet" style="margin:0">Choose from library<input type="file" accept="image/*" hidden data-act="draftcover"></label>
      </div>
      <button class="btn go">Plan trip</button>
    </form>`;
}

function tripView() {
  const t = cur();
  if (!t) { view = { name: 'list' }; return listView(); }
  const n = dayCount(t), tab = view.tab || 'plan';
  const hero = `<div class="hero" ${t.cover ? `data-photo-src="${t.cover}"` : ''}>
      <button class="back" data-act="back">‹ Trips</button>
      <div class="scrim"><h1>${esc(t.destination)}</h1><p>${fmt(t.start)} to ${fmt(t.end)}</p></div></div>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="${tab === 'plan'}" data-act="tab" data-tab="plan">Plan</button>
      <button role="tab" aria-selected="${tab === 'photos'}" data-act="tab" data-tab="photos">Photos</button></div>`;
  if (tab === 'photos') {
    return hero + `<label class="btn" style="margin:0">Add photos<input type="file" accept="image/*" multiple hidden data-act="addphotos"></label>
      ${t.photos.length ? '' : '<p class="empty">Add photos from your library. Pick one as the cover for this trip.</p>'}
      <div class="grid">${t.photos.map(id => `<div class="tile"><img data-photo-src="${id}" alt="Trip photo">
        <div class="tools"><button data-act="set-cover" data-photo="${id}">${t.cover === id ? 'Cover' : 'Use as cover'}</button>
        <button data-act="rm-photo" data-photo="${id}" aria-label="Delete photo">×</button></div></div>`).join('')}</div>`;
  }
  const days = Array.from({ length: n }, (_, i) => {
    const spots = t.spots.filter(s => s.day === i);
    return `<section class="day"><h3>Day ${i + 1}<span>${fmt(addDays(t.start, i))}</span></h3>
      ${spots.map(s => `<div class="spot"><span>${esc(s.name)}</span>
        <select data-act="move" data-spot="${s.id}" aria-label="Day for ${esc(s.name)}">${dayOpts(n, s.day)}</select>
        <button class="x" data-act="rm-spot" data-spot="${s.id}" aria-label="Remove ${esc(s.name)}">×</button></div>`).join('')
        || '<p class="empty small">Nothing planned yet.</p>'}</section>`;
  }).join('');
  return hero + `<form class="addspot" data-form="spot">
      <input name="name" type="text" placeholder="Add a place" required autocomplete="off" aria-label="Place name">
      <select name="day" aria-label="Day">${dayOpts(n, 0)}</select><button class="btn">Add</button></form>
    ${days}<button class="link" data-act="del-trip">Delete this trip</button>`;
}

// ---------- events ----------
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (!el || ['INPUT', 'SELECT'].includes(el.tagName)) return;
  const a = el.dataset.act, t = cur();
  if (a === 'new') { draftCover = null; go({ name: 'new' }); }
  else if (a === 'back') go({ name: 'list' });
  else if (a === 'open') go({ name: 'trip', id: el.dataset.id, tab: 'plan' });
  else if (a === 'tab') { view.tab = el.dataset.tab; render(); }
  else if (a === 'rm-spot') { t.spots = t.spots.filter(s => s.id !== el.dataset.spot); save(); render(); }
  else if (a === 'set-cover') { t.cover = el.dataset.photo; save(); render(); }
  else if (a === 'rm-photo' && confirm('Delete this photo?')) {
    const id = el.dataset.photo;
    t.photos = t.photos.filter(p => p !== id); if (t.cover === id) t.cover = null;
    await idb('readwrite', s => s.delete(id)); delete urls[id]; save(); render();
  } else if (a === 'del-trip' && confirm(`Delete the trip to ${t.destination}?`)) {
    for (const id of t.photos) await idb('readwrite', s => s.delete(id));
    trips = trips.filter(x => x !== t); save(); go({ name: 'list' });
  }
});

document.addEventListener('change', async e => {
  const el = e.target, a = el.dataset.act;
  if (a === 'move') { cur().spots.find(s => s.id === el.dataset.spot).day = +el.value; save(); render(); }
  else if (a === 'draftcover' && el.files[0]) { draftCover = await storePhoto(el.files[0]); render(); }
  else if (a === 'addphotos') {
    const t = cur();
    for (const f of el.files) { const id = await storePhoto(f); t.photos.push(id); t.cover ||= id; }
    save(); render();
  }
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target), kind = e.target.dataset.form;
  if (kind === 'spot') {
    cur().spots.push({ id: uid(), name: f.get('name').trim(), day: +f.get('day') });
    save(); render();
  } else if (kind === 'trip') {
    let start = f.get('start'), end = f.get('end');
    if (end < start) [start, end] = [end, start];
    const t = { id: uid(), destination: f.get('destination').trim(), start, end, spots: [], photos: draftCover ? [draftCover] : [], cover: draftCover };
    const names = f.get('spots').split('\n').map(s => s.trim()).filter(Boolean), n = dayCount(t), per = Math.ceil(names.length / n) || 1;
    t.spots = names.map((name, i) => ({ id: uid(), name, day: Math.min(Math.floor(i / per), n - 1) }));
    trips.unshift(t); save(); go({ name: 'trip', id: t.id, tab: 'plan' });
  }
});

// ---------- boot ----------
render();
navigator.storage?.persist?.();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
