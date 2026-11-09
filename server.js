// Oroscopo App — server Node senza dipendenze.
// Scarica gli oroscopi giornalieri da onlyoroscopo.com, li salva in ./data
// e serve la webapp in ./public. Avvio: `node server.js` (porta 3000).

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SOURCE = 'https://onlyoroscopo.com/wp-json/wp/v2/posts?categories=44&per_page=20&_fields=slug,modified,link,content';
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

function parsePost(post) {
  const lines = toLines(post.content.rendered);
  const sign = post.slug.replace('oroscopo-giornaliero-', '');

  const rating = name => {
    const i = lines.findIndex(l => l === name);
    if (i < 0) return null;
    const m = lines.slice(i, i + 4).join(' ').match(/Valutazione (\d) su 5/);
    return m ? +m[1] : null;
  };

  // il testo sta tra l'ultima "Valutazione" e "Parola del giorno:"
  const lastVal = lines.reduce((acc, l, i) => (/^Valutazione \d su 5$/.test(l) ? i : acc), -1);
  const wordIdx = lines.findIndex(l => l.startsWith('Parola del giorno'));
  const body = lines.slice(lastVal + 1, wordIdx > 0 ? wordIdx : undefined)
    .filter(l => l.length > 40).join('\n\n');

  const dateLine = lines.find(l => /^(Lunedì|Martedì|Mercoledì|Giovedì|Venerdì|Sabato|Domenica)\s+\d{1,2}\s+\w+/i.test(l));
  const titleIdx = lines.findIndex(l => l.toLowerCase().startsWith('oroscopo giornaliero'));

  return {
    sign,
    range: titleIdx >= 0 ? lines[titleIdx + 1] : null,
    day: dateLine || null,
    ratings: { fortuna: rating('Fortuna'), amore: rating('Amore'), soldi: rating('Soldi') },
    text: body,
    word: wordIdx >= 0 ? lines[wordIdx + 1] : null,
    affinity: {
      amore: (after(lines, 'In amore') || '').toLowerCase() || null,
      amicizia: (after(lines, 'In amicizia') || '').toLowerCase() || null,
      lavoro: (after(lines, 'A lavoro') || '').toLowerCase() || null,
    },
    link: post.link,
    updated: post.modified,
  };
}

// ---------- fetch + cache ----------
const LATEST = path.join(DATA_DIR, 'latest.json');
let cache = fs.existsSync(LATEST) ? JSON.parse(fs.readFileSync(LATEST, 'utf8')) : null;
let inflight = null;

async function refresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(SOURCE, { headers: { 'User-Agent': 'OroscopoApp/1.0 (uso personale)' } });
    if (!res.ok) throw new Error(`onlyoroscopo ha risposto ${res.status}`);
    const posts = await res.json();
    const signs = {};
    for (const p of posts) {
      const s = parsePost(p);
      if (SIGNS.includes(s.sign)) signs[s.sign] = s;
    }
    if (Object.keys(signs).length === 0) throw new Error('nessun oroscopo trovato nella risposta');
    const latestModified = Object.values(signs).map(s => s.updated).sort().pop();
    const data = {
      day: signs.ariete?.day || Object.values(signs)[0].day,
      fetchedAt: new Date().toISOString(),
      sourceUpdated: latestModified,
      signs,
    };
    fs.writeFileSync(LATEST, JSON.stringify(data, null, 2));
    // archivio: un file per giorno di pubblicazione
    fs.writeFileSync(path.join(DATA_DIR, `${latestModified.slice(0, 10)}.json`), JSON.stringify(data, null, 2));
    cache = data;
    console.log(`[${new Date().toLocaleString('it-IT')}] aggiornato: ${data.day} (${Object.keys(signs).length} segni)`);
    return data;
  })().finally(() => { inflight = null; });
  return inflight;
}

function safeRefresh() {
  return refresh().catch(err => console.error(`[${new Date().toLocaleString('it-IT')}] errore aggiornamento:`, err.message));
}

safeRefresh();
setInterval(safeRefresh, CHECK_EVERY_MS);

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/api/oroscopo') {
    try {
      const force = url.searchParams.has('refresh');
      const stale = !cache || Date.now() - new Date(cache.fetchedAt) > CHECK_EVERY_MS;
      if (force || stale) await refresh();
      return sendJson(res, 200, cache);
    } catch (err) {
      if (cache) return sendJson(res, 200, { ...cache, warning: err.message });
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
