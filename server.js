// Oroscopo App — server Node senza dipendenze.
// Scarica gli oroscopi (giornaliero, settimanale, mensile, annuale) da onlyoroscopo.com, li salva in ./data
// e serve la webapp in ./public. Avvio: `node server.js` (porta 3000).

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
// categorie WordPress del sito per ogni periodo
const PERIODS = { giornaliero: 44, settimanale: 46, mensile: 45, annuale: 47 };
const sourceUrl = cat => `https://onlyoroscopo.com/wp-json/wp/v2/posts?categories=${cat}&per_page=20&_fields=slug,modified,link,content`;
const CHECK_EVERY_MS = 60 * 60 * 1000; // ricontrolla ogni ora

const SIGNS = ['ariete', 'toro', 'gemelli', 'cancro', 'leone', 'vergine',
  'bilancia', 'scorpione', 'sagittario', 'capricorno', 'acquario', 'pesci'];

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- parsing ----------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '–', mdash: '—',
  egrave: 'è', eacute: 'é', agrave: 'à', igrave: 'ì', ograve: 'ò', ugrave: 'ù', Egrave: 'È' };

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
}

function toLines(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
    .replace(/<i class="elementor-star[^"]*"[^>]*>[\s\S]*?<\/i>/gi, '') // icone stelle
    .replace(/<[^>]+>/g, '\n');
  return decode(text).split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

const after = (lines, label) => {
  const i = lines.findIndex(l => l.toLowerCase() === label.toLowerCase());
  return i >= 0 ? lines[i + 1] : null;
};

const TABS = ['GIORNALIERO', 'SETTIMANALE', 'MENSILE', 'ANNUALE'];

function parsePost(post, period) {
  const lines = toLines(post.content.rendered);
  const sign = post.slug.replace(`oroscopo-${period}-`, '');

  const rating = name => {
    const i = lines.findIndex(l => l === name);
    if (i < 0) return null;
    const m = lines.slice(i, i + 4).join(' ').match(/Valutazione (\d) su 5/);
    return m ? +m[1] : null;
  };

  // il periodo ("9-15 novembre", "Novembre", "Come sarà il 2026…") segue le linguette di navigazione
  const lastTab = lines.slice(0, 12).reduce((acc, l, i) => (TABS.includes(l) ? i : acc), -1);
  let label = lastTab >= 0 ? lines[lastTab + 1] : null;
  if (period === 'annuale') label = (label || '').match(/\b20\d\d\b/)?.[0] || label;

  // il testo sta dopo l'ultima "Valutazione" (o dopo il periodo) e finisce a "Parola del giorno" / "Cambia Segno"
  const lastVal = lines.reduce((acc, l, i) => (/^Valutazione \d su 5$/.test(l) ? i : acc), -1);
  const start = lastVal >= 0 ? lastVal + 1 : lastTab + 2;
  const endIdx = lines.findIndex((l, i) => i >= start && (l.startsWith('Parola del giorno') || l === 'Cambia Segno'));
  const wordIdx = lines.findIndex(l => l.startsWith('Parola del giorno'));
  const body = lines.slice(start, endIdx > 0 ? endIdx : undefined)
    .filter(l => l.length > 40).join('\n\n');

  if (period === 'giornaliero') label =lines.find(l => /^(Lunedì|Martedì|Mercoledì|Giovedì|Venerdì|Sabato|Domenica)\s+\d{1,2}\s+\w+/i.test(l));
  const titleIdx = lines.findIndex(l => l.toLowerCase().startsWith(`oroscopo ${period}`));

  return {
    sign,
    range: titleIdx >= 0 ? lines[titleIdx + 1] : null,
    day: label || null,
    ratings: { fortuna: rating('Fortuna'), amore: rating('Amore'), soldi: rating('Soldi') },
    text: body,
    word: wordIdx >= 0 ? lines[wordIdx + 1] : null,
    affinity: period !== 'giornaliero' ? null : {
      amore: (after(lines, 'In amore') || '').toLowerCase() || null,
      amicizia: (after(lines, 'In amicizia') || '').toLowerCase() || null,
      lavoro: (after(lines, 'A lavoro') || '').toLowerCase() || null,
    },
    link: post.link,
    updated: post.modified,
  };
}

// ---------- fetch + cache ----------
// il giornaliero resta in latest.json (compatibile con la versione precedente)
const latestFile = p => path.join(DATA_DIR, p === 'giornaliero' ? 'latest.json' : `${p}-latest.json`);
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const cache = Object.fromEntries(Object.keys(PERIODS).map(p => [p, readJson(latestFile(p))]));
const inflight = {};

function refresh(period) {
  if (inflight[period]) return inflight[period];
  inflight[period] = (async () => {
    const res = await fetch(sourceUrl(PERIODS[period]), { headers: { 'User-Agent': 'OroscopoApp/1.0 (uso personale)' } });
    if (!res.ok) throw new Error(`onlyoroscopo ha risposto ${res.status}`);
    const posts = await res.json();
    const signs = {};
    for (const p of posts) {
      if (!p.slug.startsWith(`oroscopo-${period}-`)) continue;
      const s = parsePost(p, period);
      if (SIGNS.includes(s.sign)) signs[s.sign] = s;
    }
    if (Object.keys(signs).length === 0) throw new Error('nessun oroscopo trovato nella risposta');
    const latestModified = Object.values(signs).map(s => s.updated).sort().pop();
    // etichetta più frequente tra i segni (un segno può essere rimasto al periodo prima)
    const counts = {};
    for (const s of Object.values(signs)) if (s.day) counts[s.day] = (counts[s.day] || 0) + 1;
    const day = Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
    const data = { period, day, fetchedAt: new Date().toISOString(), sourceUpdated: latestModified, signs };
    fs.writeFileSync(latestFile(period), JSON.stringify(data, null, 2));
    // archivio: un file per giorno di pubblicazione
    const prefix = period === 'giornaliero' ? '' : `${period}-`;
    fs.writeFileSync(path.join(DATA_DIR, `${prefix}${latestModified.slice(0, 10)}.json`), JSON.stringify(data, null, 2));
    cache[period] = data;
    console.log(`[${new Date().toLocaleString('it-IT')}] aggiornato ${period}: ${data.day} (${Object.keys(signs).length} segni)`);
    return data;
  })().finally(() => { inflight[period] = null; });
  return inflight[period];
}

function safeRefreshAll() {
  for (const p of Object.keys(PERIODS)) {
    refresh(p).catch(err => console.error(`[${new Date().toLocaleString('it-IT')}] errore aggiornamento ${p}:`, err.message));
  }
}

safeRefreshAll();
setInterval(safeRefreshAll, CHECK_EVERY_MS);

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

const ICONS_DIR = path.join(DATA_DIR, 'icons');
const ICON_KEY = new RegExp(`^(${SIGNS.join('|')})-[0-9a-f]{6}$`);
const ICON_SIZES = [180, 192, 512];
const ICON_CURRENT = path.join(ICONS_DIR, 'current.json');
const STANDARD_ICONS = { '/apple-touch-icon.png': 180, '/icon-192.png': 192, '/icon-512.png': 512, '/icon-maskable-512.png': 512 };

// l'ultima icona scelta, se è un segno con i file già salvati; altrimenti null (luna)
function currentIcon() {
  try {
    const { key } = JSON.parse(fs.readFileSync(ICON_CURRENT, 'utf8'));
    return ICON_KEY.test(key) && fs.existsSync(path.join(ICONS_DIR, `${key}-512.png`)) ? key : null;
  } catch { return null; }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  // icona personalizzata: il browser la disegna e la invia, il server la salva e la mette nel manifest
  if (url.pathname === '/api/icon' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1_500_000) return sendJson(res, 413, { error: 'icona troppo grande' });
    }
    try {
      const { key, images } = JSON.parse(body);
      fs.mkdirSync(ICONS_DIR, { recursive: true });
      if (key === 'luna') { // torna all'icona originale
        fs.writeFileSync(ICON_CURRENT, JSON.stringify({ key: 'luna' }));
        return sendJson(res, 200, { ok: true });
      }
      if (!ICON_KEY.test(key || '')) throw new Error('nome icona non valido');
      fs.mkdirSync(ICONS_DIR, { recursive: true });
      for (const size of ICON_SIZES) {
        const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(images?.[size] || '');
        if (!m) throw new Error(`manca l'immagine da ${size}px`);
        fs.writeFileSync(path.join(ICONS_DIR, `${key}-${size}.png`), Buffer.from(m[1], 'base64'));
      }
      fs.writeFileSync(ICON_CURRENT, JSON.stringify({ key }));
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  const iconFile = /^\/icons\/([a-z]+-[0-9a-f]{6})-(\d+)\.png$/.exec(url.pathname);
  if (iconFile) {
    return fs.readFile(path.join(ICONS_DIR, `${iconFile[1]}-${iconFile[2]}.png`), (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Non trovato'); }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' });
      res.end(buf);
    });
  }

  // gli indirizzi standard delle icone servono l'ultima icona scelta: il telefono li legge
  // all'installazione, da qualunque browser (su iPhone Safari e app installata non condividono le scelte)
  const current = currentIcon();
  if (current && STANDARD_ICONS[url.pathname]) {
    return fs.readFile(path.join(ICONS_DIR, `${current}-${STANDARD_ICONS[url.pathname]}.png`), (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Non trovato'); }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  }

  if (url.pathname === '/manifest.webmanifest') {
    const key = url.searchParams.get('icon') || current;
    const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'manifest.webmanifest'), 'utf8'));
    if (ICON_KEY.test(key || '') && fs.existsSync(path.join(ICONS_DIR, `${key}-512.png`))) {
      manifest.icons = [192, 512].map(s => ({ src: `/icons/${key}-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' }));
    }
    // il tema scelto nel browser accompagna l'installazione: l'app lo legge al primo avvio
    const t = url.searchParams.get('t');
    if (t && /^[A-Za-z0-9_-]{1,3000}$/.test(t)) manifest.start_url = `/?t=${t}`;
    res.writeHead(200, { 'Content-Type': MIME['.webmanifest'], 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(manifest));
  }

  if (url.pathname === '/api/oroscopo') {
    const period = url.searchParams.get('period') || 'giornaliero';
    if (!PERIODS[period]) return sendJson(res, 400, { error: `periodo sconosciuto: ${period}` });
    try {
      const force = url.searchParams.has('refresh');
      const c = cache[period];
      const stale = !c || Date.now() - new Date(c.fetchedAt) > CHECK_EVERY_MS;
      if (force || stale) await refresh(period);
      return sendJson(res, 200, { ...cache[period], period });
    } catch (err) {
      if (cache[period]) return sendJson(res, 200, { ...cache[period], period, warning: err.message });
      return sendJson(res, 502, { error: err.message });
    }
  }

  let file = path.normalize(path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Non trovato'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log(`Oroscopo App su http://localhost:${PORT}`);
});
