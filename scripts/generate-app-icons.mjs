// Generates the home-screen icons in public/ (apple-touch-icon + manifest icons).
// Draws the dashboard's own mark: a white "calendar-check" on the dark stone
// gradient used in the dashboard header. No dependencies (pure Node + zlib).
//
//   node scripts/generate-app-icons.mjs
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// --- tiny PNG encoder -------------------------------------------------------
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const encodePng = (size, rgba) => {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

// --- glyph geometry (lucide "calendar-check", 24x24 viewBox, stroke 2) ------
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
// signed distance to a rounded rect (centre cx,cy, half size hx,hy, radius r)
const roundRectSd = (px, py, cx, cy, hx, hy, r) => {
  const qx = Math.abs(px - cx) - (hx - r);
  const qy = Math.abs(py - cy) - (hy - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const SW = 1; // half stroke width (stroke 2)
const inGlyph = (x, y) => {
  if (Math.abs(roundRectSd(x, y, 12, 13, 9, 9, 2)) <= SW) return true; // body
  if (segDist(x, y, 8, 2, 8, 6) <= SW) return true; // ring left
  if (segDist(x, y, 16, 2, 16, 6) <= SW) return true; // ring right
  if (segDist(x, y, 3, 10, 21, 10) <= SW) return true; // header line
  if (segDist(x, y, 9, 16, 11, 18) <= SW) return true; // check
  if (segDist(x, y, 11, 18, 15, 14) <= SW) return true;
  return false;
};

const render = (size, { padRatio = 0.2 } = {}) => {
  const px = Buffer.alloc(size * size * 4);
  const SS = 4; // supersampling
  const glyphSize = size * (1 - padRatio * 2);
  const off = (size - glyphSize) / 2;
  const top = [0x24, 0x26, 0x2d];
  const bottom = [0x40, 0x43, 0x4f];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // diagonal gradient (header: from-[#24262d] to-[#40434f])
      const t = (x + (size - y)) / (2 * size);
      const bg = top.map((c, i) => c + (bottom[i] - c) * (1 - t));
      let cover = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const gx = ((x + (sx + 0.5) / SS - off) / glyphSize) * 24;
          const gy = ((y + (sy + 0.5) / SS - off) / glyphSize) * 24;
          if (inGlyph(gx, gy)) cover++;
        }
      }
      const a = cover / (SS * SS);
      const i = (y * size + x) * 4;
      px[i] = Math.round(bg[0] * (1 - a) + 255 * a);
      px[i + 1] = Math.round(bg[1] * (1 - a) + 255 * a);
      px[i + 2] = Math.round(bg[2] * (1 - a) + 255 * a);
      px[i + 3] = 255;
    }
  }
  return encodePng(size, px);
};

const files = [
  ["apple-touch-icon.png", 180, 0.2],
  ["icon-192.png", 192, 0.2],
  ["icon-512.png", 512, 0.2],
  ["icon-maskable-512.png", 512, 0.28], // extra padding for Android "maskable" crop
];
for (const [name, size, pad] of files) {
  writeFileSync(join(outDir, name), render(size, { padRatio: pad }));
  console.log("wrote public/" + name);
}
