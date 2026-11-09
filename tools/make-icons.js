// Genera le icone PNG della PWA (luna crescente). Uso: node tools/make-icons.js
// Cambia i colori qui sotto e rilancia per avere icone coordinate col tuo tema.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = '#100e1c', MOON = '#e8c26a', STAR = '#f3eefe';
const OUT = path.join(__dirname, '..', 'public');

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// forma in coordinate 0..512; restituisce [r,g,b,a] o null
function shape(x, y, { rounded, scale }) {
  // scala attorno al centro (per l'icona maskable il disegno sta nella zona sicura)
  const sx = 256 + (x - 256) / scale, sy = 256 + (y - 256) / scale;
  const inCircle = (cx, cy, r) => (sx - cx) ** 2 + (sy - cy) ** 2 <= r * r;
  if (inCircle(256, 256, 150) && !inCircle(316, 216, 138)) return MOON;
  if (inCircle(370, 350, 10) || inCircle(400, 130, 7) || inCircle(130, 120, 6)) return STAR;
  if (rounded) {
    const r = 112, cx = Math.min(Math.max(x, r), 512 - r), cy = Math.min(Math.max(y, r), 512 - r);
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null;
  }
  return BG;
}

function render(size, opts) {
  const SS = 4; // supersampling per l'antialiasing
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
      const c = shape(((x + (i + .5) / SS) / size) * 512, ((y + (j + .5) / SS) / size) * 512, opts);
      if (c) { const [cr, cg, cb] = hex(c); r += cr; g += cg; b += cb; a++; }
    }
    const o = (y * size + x) * 4, n = SS * SS;
    px[o] = a ? r / a : 0; px[o + 1] = a ? g / a : 0; px[o + 2] = a ? b / a : 0; px[o + 3] = (a / n) * 255;
  }
  return png(size, px);
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const jobs = [
  ['icon-192.png', 192, { rounded: true, scale: 1 }],
  ['icon-512.png', 512, { rounded: true, scale: 1 }],
  ['icon-maskable-512.png', 512, { rounded: false, scale: 0.8 }],
  ['apple-touch-icon.png', 180, { rounded: false, scale: 0.9 }],
];
for (const [name, size, opts] of jobs) {
  fs.writeFileSync(path.join(OUT, name), render(size, opts));
  console.log('creato', name);
}
