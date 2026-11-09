// ---------- dati statici ----------
const SIGNS = [
  { id: 'ariete', name: 'Ariete', g: '♈', el: 'Fuoco', pl: 'Marte' },
  { id: 'toro', name: 'Toro', g: '♉', el: 'Terra', pl: 'Venere' },
  { id: 'gemelli', name: 'Gemelli', g: '♊', el: 'Aria', pl: 'Mercurio' },
  { id: 'cancro', name: 'Cancro', g: '♋', el: 'Acqua', pl: 'Luna' },
  { id: 'leone', name: 'Leone', g: '♌', el: 'Fuoco', pl: 'Sole' },
  { id: 'vergine', name: 'Vergine', g: '♍', el: 'Terra', pl: 'Mercurio' },
  { id: 'bilancia', name: 'Bilancia', g: '♎', el: 'Aria', pl: 'Venere' },
  { id: 'scorpione', name: 'Scorpione', g: '♏', el: 'Acqua', pl: 'Plutone' },
  { id: 'sagittario', name: 'Sagittario', g: '♐', el: 'Fuoco', pl: 'Giove' },
  { id: 'capricorno', name: 'Capricorno', g: '♑', el: 'Terra', pl: 'Saturno' },
  { id: 'acquario', name: 'Acquario', g: '♒', el: 'Aria', pl: 'Urano' },
  { id: 'pesci', name: 'Pesci', g: '♓', el: 'Acqua', pl: 'Nettuno' },
];
const ELEMENT_COLORS = { Fuoco: '#ff8a5c', Terra: '#9fd17f', Aria: '#8fd3ff', Acqua: '#7f9cff' };
const VS = '︎'; // forza i glifi come testo (niente emoji colorate)
const byId = Object.fromEntries(SIGNS.map(s => [s.id, s]));

const PRESETS = {
  notte:   { name: 'Notte',   bg: '#13102a', surface: '#1e1a3c', text: '#f4f0ff', muted: '#a29bc9', accent: '#f2d27a', stars: 1 },
  aurora:  { name: 'Aurora',  bg: '#0b1a1e', surface: '#13292e', text: '#e9fbf7', muted: '#8fb7b0', accent: '#7ee0c3', stars: 0.8 },
  rosa:    { name: 'Rosa',    bg: '#fff4f1', surface: '#ffffff', text: '#3a1f2b', muted: '#9a7482', accent: '#d9577f', stars: 0 },
  lavanda: { name: 'Lavanda', bg: '#efeaff', surface: '#ffffff', text: '#241a45', muted: '#7d72a6', accent: '#6b4fd8', stars: 0 },
  tramonto:{ name: 'Tramonto',bg: '#24131a', surface: '#341c26', text: '#fff0e6', muted: '#c79c95', accent: '#ff8a5c', stars: 0.6 },
  mono:    { name: 'Mono',    bg: '#000000', surface: '#161616', text: '#f2f2f2', muted: '#8c8c8c', accent: '#ffffff', stars: 0 },
};

const FONTS = {
  classico: { name: 'Classico', display: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  elegante: { name: 'Elegante', display: "'Playfair Display', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" },
  mistico:  { name: 'Mistico',  display: "'Cormorant Garamond', Georgia, serif", body: "'Cormorant Garamond', Georgia, serif" },
  moderno:  { name: 'Moderno',  display: "'Space Grotesk', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif" },
  sistema:  { name: 'Sistema',  display: "system-ui, -apple-system, 'Segoe UI', sans-serif", body: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
};

const COLOR_FIELDS = [['bg', 'Sfondo'], ['surface', 'Blocchi'], ['text', 'Testo'], ['muted', 'Secondario'], ['accent', 'Accento']];
const RATING_STYLES = [['ring', 'Anelli'], ['stars', 'Stelle'], ['dots', 'Pallini'], ['bar', 'Barra']];
const MOODS = ['', 'Difficile', 'Impegnativa', 'Discreta', 'Buona', 'Ottima'];

const PERIODS = [
  { id: 'giornaliero', tab: 'Oggi', mood: 'La giornata', missing: 'oggi' },
  { id: 'settimanale', tab: 'Settimana', mood: 'La settimana', missing: 'di questa settimana' },
  { id: 'mensile', tab: 'Mese', mood: 'Il mese', missing: 'di questo mese' },
  { id: 'annuale', tab: 'Anno', mood: "L'anno", missing: "di quest'anno" },
];
const periodById = Object.fromEntries(PERIODS.map(p => [p.id, p]));

const DEFAULTS = { preset: 'notte', ...PRESETS.notte, font: 'classico', rating: 'ring', scale: 1, radius: 22, meter: 'el', icon: 'luna' };
// colore della barra nel riquadro "La giornata": 'el' (elemento del segno), 'accent' o un colore #hex
const meterColor = m => m === 'accent' ? 'var(--accent)' : /^#[0-9a-f]{6}$/i.test(m || '') ? m : 'var(--el)';

// ---------- storage sicuro ----------
const store = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// tiene solo valori validi: un tema arriva anche da un link (?t=) o da un testo incollato
function cleanTheme(o) {
  const out = {};
  if (!o || typeof o !== 'object') return out;
  const hex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  for (const [k] of COLOR_FIELDS) if (hex(o[k])) out[k] = o[k];
  if (PRESETS[o.preset] || o.preset === null) out.preset = o.preset;
  if (FONTS[o.font]) out.font = o.font;
  if (RATING_STYLES.some(([id]) => id === o.rating)) out.rating = o.rating;
  for (const [k, lo, hi] of [['scale', .85, 1.25], ['radius', 0, 36], ['stars', 0, 1]]) {
    if (typeof o[k] === 'number' && o[k] >= lo && o[k] <= hi) out[k] = o[k];
  }
  if (o.meter === 'el' || o.meter === 'accent' || hex(o.meter)) out.meter = o.meter;
  if (o.icon === 'luna' || byId[o.icon]) out.icon = o.icon;
  return out;
}

// Il tema viaggia nell'indirizzo (?t=…) e nello start_url del manifest. Su iPhone Safari e
// l'app installata hanno memorie separate: al primo avvio l'app, ancora vuota, lo legge da lì.
const encTheme = o => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decTheme = s => JSON.parse(new TextDecoder().decode(
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
const themeFromUrl = (() => {
  try { const t = new URLSearchParams(location.search).get('t'); return t ? cleanTheme(decTheme(t)) : null; }
  catch { return null; }
})();

let theme = { ...DEFAULTS, ...(store.get('oroscopo.theme', null) ? cleanTheme(store.get('oroscopo.theme', {})) : themeFromUrl || {}) };
let current = store.get('oroscopo.sign', 'ariete');
let period = periodById[store.get('oroscopo.period', '')] ? store.get('oroscopo.period', '') : 'giornaliero';
const dataBy = {}; // un set di dati per periodo
let data = null;
let wheelAngle = null;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- tema ----------
function applyTheme() {
  const r = document.documentElement.style;
  for (const [k] of COLOR_FIELDS) r.setProperty(`--${k}`, theme[k]);
  r.setProperty('--stars-opacity', theme.stars);
  r.setProperty('--text-scale', theme.scale);
  r.setProperty('--radius', theme.radius + 'px');
  r.setProperty('--meter', meterColor(theme.meter));
  const f = FONTS[theme.font] || FONTS.classico;
  r.setProperty('--font-display', f.display);
  r.setProperty('--font-body', f.body);
  document.querySelector('meta[name=theme-color]').content = theme.bg;
  store.set('oroscopo.theme', theme);
  applyIcon();
  syncInstallUrl();
}

// indirizzo e manifest portano il tema attuale: chi installa l'app da qui la ritrova uguale
let installTimer;
function syncInstallUrl() {
  clearTimeout(installTimer);
  installTimer = setTimeout(() => {
    const t = encTheme(theme);
    try {
      const u = new URL(location.href);
      u.searchParams.set('t', t);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch {}
    document.querySelector('link[rel=manifest]').href = `manifest.webmanifest?t=${t}`;
  }, 300);
}

// ---------- icona dell'app ----------
// 'luna' = l'icona originale (file statici); altrimenti l'id di un segno: glifo nel colore d'accento
// sullo stesso fondo notturno con le stelle. Telefono e browser leggono l'icona all'installazione.
const ICON_INK = '#100e1c', ICON_STAR = '#f3eefe', ICON_MOON = '#e8c26a';

function drawIcon(size, icon, accent) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d'), k = size / 512;
  x.fillStyle = ICON_INK;
  x.beginPath(); x.roundRect(0, 0, size, size, 112 * k); x.fill();
  const dot = (cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(cx * k, cy * k, r * k, 0, Math.PI * 2); x.fill(); };
  if (!byId[icon]) {
    // l'icona originale, identica a public/icon.svg
    [[370, 350, 10], [400, 130, 7], [130, 120, 6]].forEach(([a, b, r]) => dot(a, b, r, ICON_STAR));
    dot(256, 256, 150, ICON_MOON);
    dot(316, 216, 138, ICON_INK);
    return c;
  }
  // cielo stellato lungo i bordi, lontano dal glifo
  [[428, 410, 9], [404, 112, 7], [112, 116, 6], [84, 316, 4], [256, 62, 3], [150, 438, 4]].forEach(([a, b, r]) => dot(a, b, r, ICON_STAR));
  x.fillStyle = accent;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `${Math.round(290 * k)}px 'Segoe UI Symbol', 'Apple Symbols', 'Noto Sans Symbols', serif`;
  x.fillText(byId[icon].g + VS, 256 * k, 270 * k);
  return c;
}

// sistema del dispositivo, per spiegare come reinstallare l'app con la nuova icona
function devicePlatform() {
  const ua = navigator.userAgent;
  // iPadOS si presenta come Mac: lo distingue lo schermo touch
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'pc';
}

const ICON_HINTS = {
  ios: "Per vederla sulla schermata Home, togli l'app e aggiungila di nuovo da Safari: scegli qui l'icona, poi Condividi → Aggiungi alla schermata Home.",
  android: "Per vederla sulla schermata Home, disinstalla l'app e installala di nuovo da Chrome: menu ⋮ → Installa app.",
  pc: "Nella scheda del browser l'icona cambia subito. Per vederla anche nell'app installata, disinstallala e installala di nuovo dall'icona di installazione nella barra degli indirizzi.",
};

let iconKey = null, iconTimer;
function applyIcon() {
  const icon = byId[theme.icon] ? theme.icon : 'luna';
  const key = icon === 'luna' ? 'luna' : `${icon}-${theme.accent.slice(1).toLowerCase()}`;
  if (key === iconKey) return;
  const first = iconKey === null;
  iconKey = key;
  const fav = document.querySelector('link[rel=icon]');
  const touch = document.querySelector('link[rel=apple-touch-icon]');
  if (icon === 'luna') {
    fav.type = 'image/svg+xml'; fav.href = 'icon.svg';
    touch.href = 'apple-touch-icon.png';
  } else {
    fav.type = 'image/png'; fav.href = drawIcon(64, icon, theme.accent).toDataURL('image/png');
    // iPhone: "Aggiungi alla schermata Home" usa questa immagine incorporata, anche quando
    // il server online ha perso i file salvati (molti servizi li cancellano a ogni riavvio)
    touch.href = drawIcon(180, icon, theme.accent).toDataURL('image/png');
  }

  // All'avvio non si invia niente: il server serve già l'ultima icona scelta agli indirizzi standard
  // (apple-touch-icon.png, icon-192.png, manifest…). Su iPhone Safari e l'app installata hanno
  // memorie separate: se Safari inviasse la sua scelta a ogni apertura, cancellerebbe quella dell'app.
  if (first) return;
  clearTimeout(iconTimer);
  // al server solo quando l'accento smette di cambiare (il selettore colore manda molti eventi)
  iconTimer = setTimeout(async () => {
    const body = { key };
    if (icon !== 'luna') {
      body.images = {};
      for (const s of [180, 192, 512]) body.images[s] = drawIcon(s, icon, theme.accent).toDataURL('image/png');
    }
    try {
      await fetch('/api/icon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch {}
  }, 600);
}

function setTheme(patch, rerender = false) {
  theme = { ...theme, ...patch };
  applyTheme();
  renderSettings();
  if (rerender) renderMain();
}

function renderSettings() {
  $('#presets').innerHTML = Object.entries(PRESETS).map(([id, p]) => `
    <button class="preset" data-preset="${id}" aria-pressed="${theme.preset === id}">
      <span class="sw" style="background:${p.bg}">
        <i style="background:${p.surface}"></i><i style="background:${p.accent}"></i><i style="background:${p.text}"></i>
      </span>
      <span class="nm">${p.name}</span>
    </button>`).join('');

  $('#colors').innerHTML = COLOR_FIELDS.map(([k, label]) => `
    <label><input type="color" data-color="${k}" value="${theme[k]}"><span>${label}</span></label>`).join('');

  $('#fonts').innerHTML = Object.entries(FONTS).map(([id, f]) => `
    <button data-font="${id}" aria-pressed="${theme.font === id}">
      <span class="a" style="font-family:${f.display}">${f.name}, Leone</span>
      <span class="b" style="font-family:${f.body}">Una giornata piena di energia</span>
    </button>`).join('');

  $('#ratingStyle').innerHTML = RATING_STYLES.map(([id, label]) =>
    `<button data-rating="${id}" aria-pressed="${theme.rating === id}">${label}</button>`).join('');

  const custom = /^#/.test(theme.meter || '');
  $('#meterStyle').innerHTML = `
    <button data-meter="el" aria-pressed="${!custom && theme.meter !== 'accent'}">Elemento</button>
    <button data-meter="accent" aria-pressed="${theme.meter === 'accent'}">Accento</button>
    <label class="pick" data-on="${custom}">
      <input type="color" id="meterColor" value="${custom ? theme.meter : theme.accent}">
      <span>Scegli</span>
    </label>`;

  const curIcon = byId[theme.icon] ? theme.icon : 'luna';
  $('#iconPick').innerHTML = [{ id: 'luna', name: 'Luna' }, ...SIGNS].map(s => `
    <button data-icon="${s.id}" aria-pressed="${curIcon === s.id}" aria-label="${s.name}" title="${s.name}">
      <img src="${drawIcon(88, s.id, theme.accent).toDataURL('image/png')}" alt="">
    </button>`).join('');

  $('#textScale').value = theme.scale;
  $('#radius').value = theme.radius;
  $('#stars').value = theme.stars;
}

function bindSettings() {
  const sheet = $('#sheet'), scrim = $('#scrim');
  const open = () => { scrim.hidden = false; sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); };
  const close = () => {
    scrim.hidden = true; sheet.classList.remove('open', 'dragging'); sheet.setAttribute('aria-hidden', 'true');
    // il pannello scende dalla posizione in cui è stato lasciato
    requestAnimationFrame(() => { sheet.style.removeProperty('--drag'); scrim.style.removeProperty('--drag-p'); });
  };
  $('#openSettings').onclick = open;
  scrim.onclick = close;

  // trascina verso il basso per chiudere: dalla maniglia/titolo, o dal contenuto se è già in cima
  let y0 = null, x0 = 0, t0 = 0, dy = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (e.touches.length > 1 || e.target.closest('input[type=range]')) return;
    const fromTop = e.target.closest('.sheet-handle, .sheet-head');
    if (!fromTop && sheet.scrollTop > 0) return;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = Date.now(); dy = 0; dragging = false;
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    const dx = e.touches[0].clientX - x0;
    if (!dragging) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      if (dy <= 0 || Math.abs(dx) > dy || sheet.scrollTop > 0) { y0 = null; return; } // scorrimento normale
      dragging = true;
      sheet.classList.add('dragging');
    }
    e.preventDefault();
    const d = Math.max(0, dy);
    sheet.style.setProperty('--drag', `${d}px`);
    scrim.style.setProperty('--drag-p', Math.min(d / sheet.offsetHeight, 1).toFixed(3));
  }, { passive: false });
  const endDrag = () => {
    if (y0 === null) return;
    y0 = null;
    if (!dragging) return;
    dragging = false;
    const fast = dy / Math.max(Date.now() - t0, 1) > .5; // gesto rapido verso il basso
    if (dy > Math.min(140, sheet.offsetHeight * .3) || fast) return close();
    sheet.classList.remove('dragging'); // torna su con la sua transizione
    sheet.style.removeProperty('--drag');
    scrim.style.removeProperty('--drag-p');
  };
  sheet.addEventListener('touchend', endDrag);
  sheet.addEventListener('touchcancel', endDrag);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  sheet.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.preset) { const { name, ...p } = PRESETS[b.dataset.preset]; setTheme({ preset: b.dataset.preset, ...p }); }
    if (b.dataset.font) setTheme({ font: b.dataset.font });
    if (b.dataset.rating) setTheme({ rating: b.dataset.rating }, true);
    if (b.dataset.meter) setTheme({ meter: b.dataset.meter });
    if (b.dataset.icon) setTheme({ icon: b.dataset.icon });
  });
  sheet.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.color) { theme = { ...theme, [t.dataset.color]: t.value, preset: null }; applyTheme(); }
    if (t.id === 'textScale') { theme.scale = +t.value; applyTheme(); }
    if (t.id === 'radius') { theme.radius = +t.value; applyTheme(); }
    if (t.id === 'stars') { theme.stars = +t.value; applyTheme(); }
    if (t.id === 'meterColor') { theme.meter = t.value; applyTheme(); }
  });
  sheet.addEventListener('change', e => { if (e.target.dataset.color || e.target.id === 'meterColor') renderSettings(); });

  $('#resetTheme').onclick = () => { theme = { ...DEFAULTS }; applyTheme(); renderSettings(); renderMain(); toast('Tema ripristinato'); };
  $('#exportTheme').onclick = async () => {
    const json = JSON.stringify(theme);
    try { await navigator.clipboard.writeText(json); toast('Tema copiato'); }
    catch { prompt('Copia questo tema:', json); }
  };
  $('#importTheme').onclick = async () => {
    let txt = null;
    try { txt = await navigator.clipboard.readText(); } catch {}
    if (!txt || !txt.trim().startsWith('{')) txt = prompt('Incolla qui il tema copiato:');
    if (!txt) return;
    try { setTheme(cleanTheme(JSON.parse(txt)), true); toast('Tema incollato'); }
    catch { toast('Il testo incollato non è un tema valido'); }
  };
}

// ---------- ruota zodiacale ----------
function buildWheel() {
  const R = 128;
  let svg = `<circle class="ring outer" r="150"/><circle class="ring" r="106"/>`;
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90 + 15) * Math.PI / 180; // separatori tra i segni
    svg += `<line class="tick" x1="${Math.cos(a) * 108}" y1="${Math.sin(a) * 108}" x2="${Math.cos(a) * 148}" y2="${Math.sin(a) * 148}"/>`;
  }
  SIGNS.forEach((s, i) => {
    const a = (i * 30 - 90) * Math.PI / 180;
    const x = (Math.cos(a) * R).toFixed(1), y = (Math.sin(a) * R).toFixed(1);
    // area di tocco invisibile: il glifo da solo è troppo piccolo per il dito
    svg += `<circle class="hit" data-sign="${s.id}" cx="${x}" cy="${y}" r="21"/>`;
    svg += `<text class="gl" data-sign="${s.id}" x="${x}" y="${y}" transform="rotate(${i * 30} ${x} ${y})">${s.g}${VS}<title>${s.name}</title></text>`;
  });
  const wheel = $('#wheel');
  wheel.innerHTML = svg;
  wheel.addEventListener('click', e => { const t = e.target.closest('[data-sign]'); if (t) select(t.dataset.sign); });
}

function turnWheel(id) {
  const target = -SIGNS.findIndex(s => s.id === id) * 30;
  if (wheelAngle === null) wheelAngle = target + 90; // primo avvio: piccolo giro d'entrata
  // percorso più breve verso il segno scelto
  let delta = ((target - wheelAngle) % 360 + 540) % 360 - 180;
  wheelAngle += delta;
  const wheel = $('#wheel');
  requestAnimationFrame(() => { wheel.style.setProperty('--a', `${wheelAngle}deg`); });
  wheel.querySelectorAll('.gl').forEach(g => g.classList.toggle('on', g.dataset.sign === id));
}

// ---------- rendering ----------
function marks(n) {
  if (theme.rating === 'bar') return `<div class="marks bar"><i style="width:${(n / 5) * 100}%"></i></div>`;
  const cls = theme.rating === 'dots' ? 'dots' : 'stars';
  const one = on => cls === 'dots' ? `<span class="${on ? '' : 'off'}"></span>` : `<span class="${on ? '' : 'off'}">★</span>`;
  return `<div class="marks ${cls}">${[1, 2, 3, 4, 5].map(i => one(i <= n)).join('')}</div>`;
}

function rateTile(label, v, i) {
  if (theme.rating === 'ring') {
    const r = 32, c = 2 * Math.PI * r;
    return `<div class="tile third rate" style="--i:${i}">
      <div class="gauge" style="--c:${c.toFixed(1)};--i:${i}">
        <svg viewBox="0 0 74 74"><circle class="track" cx="37" cy="37" r="${r}"/>
          <circle class="fill" cx="37" cy="37" r="${r}" style="stroke-dashoffset:${(c * (1 - v / 5)).toFixed(1)}"/></svg>
        <b>${v}<small>/5</small></b>
      </div>
      <p class="label">${label}</p>
    </div>`;
  }
  return `<div class="tile third rate" style="--i:${i}">
    <p class="num">${v}<small>/5</small></p>${marks(v)}<p class="label">${label}</p>
  </div>`;
}

function prettyRange(r) {
  if (!r) return '';
  return r.toLowerCase().replace(/\s*-\s*/, ' – ');
}

// prima frase in evidenza; il resto mantiene i paragrafi (l'annuale ne ha diversi)
function splitLead(text) {
  const paras = String(text || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const first = paras.shift() || '';
  const m = first.match(/^(.+?[.!?])\s+(.+)$/s);
  if (m) paras.unshift(m[2]);
  return [m ? m[1] : first, paras];
}

function periodLabel(d) {
  const day = d?.day;
  if (!day) return { giornaliero: 'Oggi', settimanale: 'Questa settimana', mensile: 'Questo mese', annuale: "Quest'anno" }[period];
  if (period === 'settimanale') return `Settimana ${day.replace(/\s*-\s*/, '–')}`;
  if (period === 'annuale') return `Anno ${day}`;
  return day;
}

function renderHero(s, h) {
  document.documentElement.style.setProperty('--el', ELEMENT_COLORS[s.el]);
  const title = $('.title');
  $('#signName').textContent = s.name;
  $('#signRange').textContent = prettyRange(h?.range);
  title.classList.remove('swap'); void title.offsetWidth; title.classList.add('swap');
  $('#facts').innerHTML = `
    <span class="fact"><i class="dot"></i>${s.el}</span>
    <span class="fact"><span class="k">pianeta</span> ${s.pl}</span>`;
  turnWheel(s.id);
}

function renderMain(dir) {
  const main = $('#main');
  const s = byId[current];
  if (!data) { renderHero(s, null); return; }
  const h = data.signs[current];
  renderHero(s, h);
  const P = periodById[period];
  if (!h) { main.innerHTML = `<div class="state">L'oroscopo di ${esc(s.name)} ${P.missing} non è ancora uscito. Riprova più tardi.</div>`; return; }

  const r = h.ratings || {};
  const rows = [['Fortuna', r.fortuna], ['Amore', r.amore], ['Soldi', r.soldi]].filter(([, v]) => v != null);
  const avg = rows.length ? rows.reduce((a, [, v]) => a + v, 0) / rows.length : null;
  const mood = avg ? Math.round(avg) : null;
  const [lead, rest] = splitLead(h.text);
  const affLabels = [['amore', 'in amore'], ['amicizia', 'in amicizia'], ['lavoro', 'al lavoro']];
  let i = 0;

  main.innerHTML = `
    <div class="grid in">
      ${rows.map(([l, v]) => rateTile(l, v, i++)).join('')}

      ${mood ? `<div class="tile ${h.word ? 'half' : ''} mood" style="--i:${i++}">
        <p class="label">${P.mood}</p>
        <div>
          <p class="big">${MOODS[mood]}</p>
          <p class="sub">media ${avg.toFixed(1).replace('.', ',')} su 5</p>
          <div class="meter">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= mood ? 'on' : ''}"></i>`).join('')}</div>
        </div>
      </div>` : ''}

      ${h.word ? `<div class="tile ${mood ? 'half' : ''} word" style="--i:${i++}">
        <p class="label">Parola del giorno</p>
        <p class="big">${esc(h.word)}</p>
      </div>` : ''}

      <article class="tile reading" style="--i:${i++}">
        <p class="lead">${esc(lead)}</p>
        ${rest.map(p => `<p class="rest">${esc(p)}</p>`).join('')}
      </article>

      ${h.affinity ? `<div class="tile" style="--i:${i++}">
        <div class="aff-head"><h2>Con chi va meglio oggi</h2></div>
        <div class="aff">
          ${affLabels.map(([k, l]) => {
            const a = byId[h.affinity?.[k]];
            return a ? `<button data-sign="${a.id}"><span class="g">${a.g}${VS}</span><span class="s">${a.name}</span><span class="t">${l}</span></button>` : '';
          }).join('')}
        </div>
      </div>` : ''}
    </div>`;

  const aff = main.querySelector('.aff');
  if (aff) aff.onclick = e => { const b = e.target.closest('[data-sign]'); if (b) select(b.dataset.sign); };

  main.classList.remove('enter', 'enter-l');
  if (dir) { void main.offsetWidth; main.classList.add(dir < 0 ? 'enter-l' : 'enter'); }
}

function renderSigns() {
  $('#signs').innerHTML = SIGNS.map(s => `
    <button class="chip" data-sign="${s.id}" aria-current="${s.id === current}">
      <span class="g">${s.g}${VS}</span><span class="n">${s.name}</span>
    </button>`).join('');
  $('#signs').onclick = e => { const b = e.target.closest('[data-sign]'); if (b) select(b.dataset.sign); };
}

function renderPeriods() {
  const nav = $('#periods');
  nav.innerHTML = PERIODS.map(p =>
    `<button role="tab" data-period="${p.id}" aria-selected="${p.id === period}">${p.tab}</button>`).join('') +
    '<i class="pill" aria-hidden="true"></i>';
  nav.onclick = e => { const b = e.target.closest('[data-period]'); if (b) setPeriod(b.dataset.period); };
  nav.onkeydown = e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    const i = PERIODS.findIndex(p => p.id === period);
    const next = PERIODS[(i + d + PERIODS.length) % PERIODS.length].id;
    setPeriod(next);
    nav.querySelector(`[data-period="${next}"]`).focus();
  };
  markPeriod();
}

function markPeriod() {
  const nav = $('#periods');
  const i = PERIODS.findIndex(p => p.id === period);
  nav.style.setProperty('--at', i);
  nav.querySelectorAll('[data-period]').forEach(b => {
    const on = b.dataset.period === period;
    b.setAttribute('aria-selected', on);
    b.tabIndex = on ? 0 : -1;
  });
}

function setPeriod(id) {
  if (!periodById[id] || id === period) return;
  period = id;
  store.set('oroscopo.period', id);
  markPeriod();
  data = dataBy[id] || null;
  $('#day').textContent = periodLabel(data);
  if (data) renderMain(); else $('#main').innerHTML = '<div class="state">Sto leggendo le stelle…</div>';
  load();
}

function renderFoot(warning) {
  $('#foot').innerHTML = `
    ${warning ? `<p>⚠︎ ${esc(warning)}</p>` : ''}
    <p>Testi di <a href="https://onlyoroscopo.com/" target="_blank" rel="noopener">onlyoroscopo.com</a></p>`;
}

// ---------- tira giù per aggiornare ----------
// la pagina scende con resistenza crescente e la ruota gira col dito;
// oltre la soglia, al rilascio la ruota fa un giro completo e i dati si aggiornano
function bindPullToRefresh() {
  const MAX = 130, THRESHOLD = 76, K = 210;
  const ptr = $('#ptr'), label = ptr.querySelector('span'), root = document.documentElement;
  let y0 = null, x0 = 0, dist = 0, active = false, busy = false;

  const set = d => {
    dist = d;
    root.style.setProperty('--pull', `${d}px`);
    root.style.setProperty('--pull-deg', `${(d * 1.1).toFixed(1)}deg`);
    root.style.setProperty('--pull-p', Math.min(d / THRESHOLD, 1));
    const ready = d >= THRESHOLD;
    ptr.classList.toggle('ready', ready);
    if (!busy) label.textContent = ready ? 'Rilascia per aggiornare' : 'Tira per aggiornare';
  };

  window.addEventListener('touchstart', e => {
    if (busy || window.scrollY > 0 || e.touches.length > 1 || e.target.closest('.sheet, .signs, .periods')) return;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; active = false;
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (y0 === null) return;
    const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
    if (!active) {
      // decidi al primo movimento: verso il basso e più verticale che orizzontale
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) { y0 = null; return; }
      active = true;
      root.classList.add('pulling');
    }
    e.preventDefault();
    set(MAX * (1 - Math.exp(-Math.max(dy, 0) / K)));
  }, { passive: false });

  const end = async () => {
    if (y0 === null) return;
    y0 = null;
    if (!active) return;
    active = false;
    root.classList.remove('pulling');
    if (dist < THRESHOLD) { set(0); return; }

    busy = true;
    ptr.classList.add('busy');
    label.textContent = 'Aggiorno…';
    set(THRESHOLD); // resta abbastanza giù da mostrare rotella e scritta
    wheelAngle += 360; // un giro completo della ruota
    $('#wheel').style.setProperty('--a', `${wheelAngle}deg`);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const t0 = Date.now();
    const ok = await load(true, true);
    await wait(Math.max(0, 700 - (Date.now() - t0))); // lascia finire il giro
    ptr.classList.remove('busy');
    if (ok) {
      // la rotella si chiude in una spunta, resta un attimo, poi la pagina risale piano
      ptr.classList.add('done');
      label.textContent = 'Aggiornato';
      await wait(900);
    }
    root.classList.add('settling');
    set(0); // ancora "busy": la scritta resta "Aggiornato" mentre sfuma
    await wait(700);
    busy = false;
    ptr.classList.remove('done');
    root.classList.remove('settling');
  };
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);
}

function select(id, dir) {
  if (!byId[id]) return;
  if (dir === undefined) {
    const a = SIGNS.findIndex(s => s.id === current), b = SIGNS.findIndex(s => s.id === id);
    dir = b === a ? 0 : b > a ? 1 : -1;
  }
  current = id;
  store.set('oroscopo.sign', id);
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-current', c.dataset.sign === id));
  document.querySelector(`.chip[data-sign="${id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  renderMain(dir);
  if (window.scrollY > 200) window.scrollTo({ top: 0, behavior: 'smooth' });
}

// swipe orizzontale tra i segni (sul contenuto e sulla ruota)
function bindSwipe(el) {
  let x0 = null, y0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = SIGNS.findIndex(s => s.id === current);
    const next = SIGNS[(i + (dx < 0 ? 1 : -1) + SIGNS.length) % SIGNS.length];
    select(next.id, dx < 0 ? 1 : -1);
  });
}

// ---------- dati ----------
async function load(force = false, quiet = false) {
  const p = period;
  if (force && !quiet) toast('Aggiorno…');
  try {
    const res = await fetch(`/api/oroscopo?period=${p}` + (force ? '&refresh' : ''), { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `il server ha risposto ${res.status}`);
    const prev = dataBy[p];
    dataBy[p] = json;
    if (p !== period) return; // nel frattempo è stato scelto un altro periodo
    const changed = !prev || prev.fetchedAt !== json.fetchedAt || data !== prev;
    data = json;
    $('#day').textContent = periodLabel(data);
    if (changed) renderMain();
    renderFoot(json.warning || (json.offline ? 'Sei offline: stai vedendo l’ultimo oroscopo scaricato' : null));
    if (force && !quiet) toast('Aggiornato');
    return true;
  } catch (err) {
    if (p !== period) return;
    if (!data) $('#main').innerHTML = `<div class="state">Non riesco a scaricare l'oroscopo: ${esc(err.message)}.<br>Controlla che il server sia acceso, poi tira giù la pagina per riprovare.</div>`;
    renderFoot(err.message);
    if (force) toast('Aggiornamento non riuscito');
    return false;
  }
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- avvio ----------
applyTheme();
renderSettings();
bindSettings();
buildWheel();
renderSigns();
renderPeriods();
renderMain();
bindSwipe($('#main'));
bindSwipe($('.wheel-wrap'));
bindPullToRefresh();
$('#iconHint').textContent = ICON_HINTS[devicePlatform()];
load();
requestAnimationFrame(() => document.querySelector(`.chip[data-sign="${current}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }));

// ricarica quando l'app torna in primo piano (es. il mattino dopo)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
