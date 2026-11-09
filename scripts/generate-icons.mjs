#!/usr/bin/env node
/**
 * Genererer PWA-ikoner uten eksterne avhengigheter.
 * Kjør: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CHECK = [
  [148, 268],
  [222, 342],
  [366, 186],
];

function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function insideRoundedRect(x, y, size, radius) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

function render(size, { fullBleed = false } = {}) {
  const supersample = 4;
  const scale = size / 512;
  const checkScale = fullBleed ? 0.8 : 1;
  const offset = (512 - 512 * checkScale) / 2;
  const points = CHECK.map(([x, y]) => [
    (x * checkScale + offset) * scale,
    (y * checkScale + offset) * scale,
  ]);
  const thickness = 56 * scale * checkScale;
  const radius = fullBleed ? 0 : 112 * scale;
  const output = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let aSum = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;

      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const x = px + (sx + 0.5) / supersample;
          const y = py + (sy + 0.5) / supersample;

          if (!fullBleed && !insideRoundedRect(x, y, size, radius)) {
            continue;
          }

          let r;
          let g;
          let b;
          const onCheck =
            distanceToSegment(x, y, points[0], points[1]) <= thickness / 2 ||
            distanceToSegment(x, y, points[1], points[2]) <= thickness / 2;

          if (onCheck) {
            r = 247;
            g = 243;
            b = 236;
          } else {
            r = 17;
            g = 17;
            b = 17;
          }

          aSum += 1;
          rSum += r;
          gSum += g;
          bSum += b;
        }
      }

      const samples = supersample * supersample;
      const index = (py * size + px) * 4;
      if (aSum === 0) {
        output[index] = 0;
        output[index + 1] = 0;
        output[index + 2] = 0;
        output[index + 3] = 0;
      } else {
        output[index] = Math.round(rSum / aSum);
        output[index + 1] = Math.round(gSum / aSum);
        output[index + 2] = Math.round(bSum / aSum);
        output[index + 3] = Math.round((aSum / samples) * 255);
      }
    }
  }

  return encodePng(size, size, output);
}

const icons = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];

for (const [name, size, fullBleed] of icons) {
  const png = render(size, { fullBleed });
  writeFileSync(join(outDir, name), png);
  console.log(`public/icons/${name} (${size}x${size}, ${png.length} bytes)`);
}
