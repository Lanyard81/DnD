// Generates the two PWA icon PNGs (192x192, 512x512) from scratch using only
// Node's built-in zlib — no image library dependency. Draws a simple flat
// "lantern" glyph (a circle with a small flame accent) in the app's dark-
// fantasy accent color so the home-screen icon isn't a blank square.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawIcon(size) {
  const bg = hexToRgb('#17121c');
  const accent = hexToRgb('#b3893f');
  const accentStrong = hexToRgb('#d6a94f');
  const cx = size / 2, cy = size / 2;
  const r = size * 0.34;
  const flameR = size * 0.1;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // filter type 0 for this scanline
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const flameDist = Math.sqrt(dx * dx + (dy + r * 0.15) * (dy + r * 0.15));
      let color = bg;
      if (dist <= r && dist >= r * 0.78) color = accent; // ring (lantern frame)
      else if (flameDist <= flameR) color = accentStrong; // flame core
      raw[pos++] = color[0];
      raw[pos++] = color[1];
      raw[pos++] = color[2];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const iconsDir = path.join(root, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), drawIcon(512));
console.log('Wrote icons/icon-192.png and icons/icon-512.png');
