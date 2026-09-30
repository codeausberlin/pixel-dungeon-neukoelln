// Abgeloest durch tools/generate-kiez-appicon.cjs (Ortsschild-Icon); dieses Skript nicht mehr ausfuehren,
// es wuerde die Desktop-Icons mit dem alten Altbau-Motiv ueberschreiben.
// Kiez-Icons: desktop window/taskbar icons for Pixel Dungeon Neukölln: a lit Altbau
// window above a glowing Späti sign on a clinker-brick tile. Pure Node, deterministic.
//
//   node tools/generate-kiez-icons.cjs                 write desktop/src/main/assets/icons/*
//   node tools/generate-kiez-icons.cjs --preview DIR   also write a preview sheet
//
// Same file names and sizes as upstream: icon_16/32/48/64/128/256.png (RGBA),
// windows.ico (16, 32, 48, 64, 128, 256 as embedded PNG) and mac.icns (icp4 16, icp5 32,
// icp6 64, ic07 128, ic08 256, ic11 32@2x, ic12 64@2x, ic13 256@2x).
// Two masters are drawn pixel by pixel: 16x16 (used for 16 and, x3, for 48) and 32x32
// (used for 32 and, scaled x2/x4/x8 nearest-neighbour, for 64/128/256).
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {encodePNG, rgb} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'desktop/src/main/assets/icons');
const argv = process.argv.slice(2);

const PAL = {
  '.': null,
  o: '1c1012',            // tile outline
  B: '6e3328', b: '5a2a21', m: '4c211b', // clinker brick, darker brick, mortar
  F: 'efe4c8', f: 'c9b996', // stucco window frame / shade
  L: 'f8d060', l: 'fff0a0', d: 'd8a038', // warm window light / highlight / shade
  K: '1a2226',            // sign background
  T: '4ae8d8', t: '2aa89c', // neon tube / dim
  Y: 'ffe040',            // sign letters
  G: '3c8c3c', R: 'd83a2c', // window-box plant
};

// "SPÄTI" in a 3x5 pixel font on the sign (rows 21..28 of the 32 master)
function signRows() {
  const F = {
    S: ['YYY', 'Y..', 'YYY', '..Y', 'YYY'], P: ['YYY', 'Y.Y', 'YYY', 'Y..', 'Y..'],
    A: ['.Y.', 'Y.Y', 'YYY', 'Y.Y', 'Y.Y'], T: ['YYY', '.Y.', '.Y.', '.Y.', '.Y.'], I: ['Y', 'Y', 'Y', 'Y', 'Y'],
  };
  const rows = Array.from({length: 8}, () => [...'oBTKKKKKKKKKKKKKKKKKKKKKKKKKKTBo']);
  let x = 8;
  for (const ch of 'SPATI') {
    F[ch].forEach((r, y) => [...r].forEach((c, dx) => { if (c === 'Y') rows[2 + y][x + dx] = 'Y'; }));
    if (ch === 'A') { rows[1][x] = 'Y'; rows[1][x + 2] = 'Y'; } // umlaut dots: Ä
    x += F[ch][0].length + 1;
  }
  return rows.map(r => r.join(''));
}
// 32x32 master
const M32 = [
  '....oooooooooooooooooooooooo....',
  '..ooBBBBBBBBBBBBBBBBBBBBBBBBoo..',
  '.oBBBmBBBBBBmBBBBBBBmBBBBBBmBBo.',
  '.oBBBmBBBFFFFFFFFFFFFFBBBBBmBBo.',
  'oBmmmmmmFFfllllLLLLLfFFmmmmmmmBo',
  'oBBBBBBFfllllllLLLLLLfFBBBBBBBBo',
  'oBBBBBBFlllllLFFLLLLLLFBBmBBBBBo',
  'oBmBBBBFllllLLFFLLLLLLFBBmBBBBBo',
  'oBmBBBBFlllLLLFFLLLLLLFmmmmmmmmo',
  'oBmmmmmFllLLLLFFLLLLLdFBBBBmBBBo',
  'oBBBBBBFlLLLLLFFLLLLLdFBBBBmBBBo',
  'oBBBBmBFFFFFFFFFFFFFFFFBBBBmBBBo',
  'oBBBBmBFLLLLLLFFLLLLLdFmmmmmmmmo',
  'ommmmmmFLLLLLLFFLLLLddFBBmBBBBBo',
  'oBBmBBBFLLLLLLFFLLLddLFBBmBBBBBo',
  'oBBmBBBFLLLLLLFFLLddddFBBmBBBBBo',
  'oBBmBBBFLLLLLdFFLdddddFmmmmmmmmo',
  'ommmmmfFGRGGRGGRGGRGGRFfmmmmmmmo',
  'oBBBBmFFFFFFFFFFFFFFFFFFBBBBmBBo',
  'oBBBBmmffffffffffffffffmmBBBmBBo',
  'oBTTTTTTTTTTTTTTTTTTTTTTTTTTTTBo',
  ...signRows(),
  '.oTTTTTTTTTTTTTTTTTTTTTTTTTTTTo.',
  '..ooBBBBBBBBBBBBBBBBBBBBBBBBoo..',
  '....oooooooooooooooooooooooo....',
];
// 16x16 master: window and a neon bar
const M16 = [
  '..oooooooooooo..',
  '.oBBBBBBBBBBBBo.',
  'oBBBFFFFFFFFBBBo',
  'oBmBFllLFLLFBmBo',
  'oBmBFlLLFLLFBmBo',
  'oBBBFFFFFFFFBBBo',
  'oBBBFLLLFLLFBBBo',
  'oBmBFLLLFLdFBmBo',
  'oBmBFGRGGRGFBmBo',
  'oBBFFFFFFFFFFBBo',
  'oBBBBBBBBBBBBBBo',
  'oTTTTTTTTTTTTTTo',
  'oTKYKYYKYYKYKYTo',
  'oTTTTTTTTTTTTTTo',
  '.oBBBBBBBBBBBBo.',
  '..oooooooooooo..',
];

function toImg(rows) {
  const n = rows.length, px = Buffer.alloc(n * n * 4);
  rows.forEach((r, y) => { if (r.length !== n) throw new Error('row ' + y + ' has ' + r.length);
    [...r].forEach((ch, x) => { if (!(ch in PAL)) throw new Error('key ' + ch); const c = PAL[ch]; if (!c) return;
      px.set([...rgb(c), 255], (y * n + x) * 4); }); });
  return {w: n, h: n, px};
}
function scale(img, s) {
  const W = img.w * s, px = Buffer.alloc(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) img.px.copy(px, (y * W + x) * 4, (((y / s) | 0) * img.w + ((x / s) | 0)) * 4, (((y / s) | 0) * img.w + ((x / s) | 0)) * 4 + 4);
  return {w: W, h: W, px};
}

function ico(entries) { // [{size, png}]
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
  let off = head.length;
  entries.forEach(({size, png}, i) => {
    const o = 6 + 16 * i;
    head[o] = size >= 256 ? 0 : size; head[o + 1] = size >= 256 ? 0 : size; head[o + 2] = 0; head[o + 3] = 0;
    head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(png.length, o + 8); head.writeUInt32LE(off, o + 12); off += png.length;
  });
  return Buffer.concat([head, ...entries.map(e => e.png)]);
}
function icns(entries) { // [{type, png}]
  const parts = entries.map(({type, png}) => { const h = Buffer.alloc(8); h.write(type, 0, 'ascii'); h.writeUInt32BE(png.length + 8, 4); return Buffer.concat([h, png]); });
  const body = Buffer.concat(parts), h = Buffer.alloc(8); h.write('icns', 0, 'ascii'); h.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([h, body]);
}

function main() {
  const m16 = toImg(M16), m32 = toImg(M32);
  const img = {16: m16, 32: m32, 48: scale(m16, 3), 64: scale(m32, 2), 128: scale(m32, 4), 256: scale(m32, 8)};
  const png = {};
  for (const s of [16, 32, 48, 64, 128, 256]) {
    png[s] = encodePNG(img[s]);
    fs.writeFileSync(path.join(DIR, `icon_${s}.png`), png[s]);
  }
  fs.writeFileSync(path.join(DIR, 'windows.ico'), ico([16, 32, 48, 64, 128, 256].map(size => ({size, png: png[size]}))));
  fs.writeFileSync(path.join(DIR, 'mac.icns'), icns([
    {type: 'icp4', png: png[16]}, {type: 'icp5', png: png[32]}, {type: 'icp6', png: png[64]},
    {type: 'ic07', png: png[128]}, {type: 'ic08', png: png[256]},
    {type: 'ic11', png: png[32]}, {type: 'ic12', png: png[64]}, {type: 'ic13', png: png[256]},
  ]));
  console.log('wrote desktop icons: icon_16/32/48/64/128/256.png, windows.ico, mac.icns');
  const pi = argv.indexOf('--preview');
  if (pi >= 0) {
    const dir = argv[pi + 1]; fs.mkdirSync(dir, {recursive: true});
    // each size shown at its real pixel size and blown up so the 16/32 masters are visible
    const items = [[16, 8], [32, 4], [48, 2], [64, 2], [128, 1], [256, 1]];
    const W = items.reduce((a, [s, k]) => a + s * k + 12, 12), H = 256 + 24;
    const px = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) px.set([60, 64, 72, 255], i * 4);
    let ox = 12;
    for (const [s, k] of items) {
      const im = scale(img[s], k), oy = 12;
      for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
        const j = (y * im.w + x) * 4; if (!im.px[j + 3]) continue;
        im.px.copy(px, ((oy + y) * W + ox + x) * 4, j, j + 4);
      }
      ox += im.w + 12;
    }
    fs.writeFileSync(path.join(dir, 'kiez-icons-preview.png'), encodePNG({w: W, h: H, px}));
    console.log('preview in ' + dir);
  }
}
main();
