// Neukoelln Pixel Dungeon: original parallax layers for the title background.
// Replaces core/src/main/assets/splashes/title/{archs,back_clusters,mid_mixed,front_small}.png
// with Neukoelln street motifs. Frame grids, atlas sizes and binary transparency match
// what ui/TitleBackground.java expects:
//   archs.png          1024x256,  6 frames 333x100 (3 per row), opaque wall, holes = void
//   back_clusters.png   512x512,  2 frames 450x250 (stacked), scattered small debris
//   mid_mixed.png      2048x1024, 24 frames 273x242 (7 per row), large floating pieces
//   front_small.png    1024x512, 20 frames 112x116 (9 per row), small floating objects
// Everything is drawn on a half-resolution grid and doubled (nearest neighbour).
// Usage: node tools/generate-neukoelln-title-bg.cjs [--preview]
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { Layer, bigText, rng, crc32, chunk } = require('./generate-neukoelln-splashes.cjs');

const OUT = path.join(__dirname, '../core/src/main/assets/splashes/title');

const P = {
  ink: '1c1719',
  // facade render (grey-brown Rauputz), bay window, window frames
  putz: '8a7f74', putzD: '6f655b', putzL: 'a3988b', erker: '5f5852', erkerD: '4a443f', erkerL: '746c65',
  white: 'ece8e0', whiteD: 'bdb7ac', glass: '39414f', glassL: '66778c', glassR: '8aa0b4',
  klinker: 'd4a64a', klinkerD: 'a67c33', sockel: 'bdb9b0', sockelD: '99958c',
  wood: '8c5c37', woodD: '633f22', woodL: 'ab774b', osb: 'c9a063', osbD: 'a07c44',
  green: '5c9a48', greenD: '3b6c35', greenL: '8cc063', flower: 'efc93c', red: 'd24a3c', redD: 'a1342c',
  pink: 'ea6f9e', teal: '3fa39c', tealD: '2b7671', blue: '3f69b0', blueD: '2c4c86', bag: '3558c4', bagL: '5b7fe0',
  orange: 'ea7c2b', orangeD: 'b3561a', yellow: 'f0c63a', yellowD: 'bf9823', rust: '9c5a2e',
  metal: '9aa0a8', metalD: '646a73', metalL: 'c3c8ce', black: '2c2a31', blackL: '45434c',
  warm: 'ffd070', warmD: 'e09a3c', paint: 'e9e5dc', paintD: 'b9b4aa', brick: 'a8553f', brickD: '7c3b2c', brickL: 'c3714f',
  pave: '9b978f', paveD: '7b776f', paveL: 'b6b2a9', cobble: '84817b', cobbleD: '66635e', skin: 'f0c09c', grey: '8f8f98', greyD: '6c6c76',
};
// the back wall layer is the deepest one and is kept dark
const D = {
  wall: '3d3632', wallD: '312b28', wallL: '48403b', trim: '5b534c', frame: '8c877e', frameD: '6a655d',
  lit: 'c0843a', litD: '93602a', plant: '3d5f36', plantL: '557f45', erker: '3c3633', osb: '8a6b40', rail: '2a2522',
  bag: '2e447a', bucket: '8e8a84', klinker: '8c6e34', klinkerD: '6e5527', tag: 'c9c3b8', pink: 'a8527a', bulb: 'f2c060',
};

// ------------------------------------------------------------- helpers ----
function writeRGBA(file, layer) {
  const { w, h } = layer;
  const header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = layer.get(x, y), o = y * (w * 4 + 1) + 1 + x * 4;
    if (!c) continue;
    rows[o] = parseInt(c.slice(0, 2), 16); rows[o + 1] = parseInt(c.slice(2, 4), 16); rows[o + 2] = parseInt(c.slice(4, 6), 16); rows[o + 3] = 255;
  }
  fs.writeFileSync(file, Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
// copy a layer into the atlas, doubled, clipped to a cell
function blit(atlas, layer, ox, oy, cw, ch, s = 2) {
  for (let y = 0; y < layer.h; y++) for (let x = 0; x < layer.w; x++) {
    const c = layer.get(x, y); if (!c) continue;
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      const px = x * s + i, py = y * s + j;
      if (px < cw && py < ch) atlas.px(ox + px, oy + py, c);
    }
  }
}
// outline an object and centre it (doubled) in a frame cell
function place(atlas, obj, cx, cy, cw, ch) {
  const o = new Layer(obj.w + 2, obj.h + 2);
  o.draw(obj, 1, 1, P.ink);
  const ox = cx + Math.floor((cw - o.w * 2) / 2), oy = cy + Math.floor((ch - o.h * 2) / 2);
  if (o.w * 2 > cw || o.h * 2 > ch) throw new Error(`object ${o.w * 2}x${o.h * 2} too big for ${cw}x${ch}`);
  blit(atlas, o, ox, oy, cw, ch);
}
function roughcast(l, x, y, w, h, col, seed) {
  const r = rng(seed);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (l.get(i, j) && r() < 0.07) l.px(i, j, col);
}
// white Berlin casement window with a transom: returns nothing, draws into l
function sprossenfenster(l, x, y, w, h, opts = {}) {
  const fr = opts.frame || P.white, frD = opts.frameD || P.whiteD;
  l.rect(x, y, w, h, fr);
  const tr = y + Math.max(3, Math.round(h * 0.3));
  const panes = [[x + 1, y + 1, Math.floor((w - 3) / 2), tr - y - 1], [x + 2 + Math.floor((w - 3) / 2), y + 1, w - 3 - Math.floor((w - 3) / 2), tr - y - 1],
    [x + 1, tr + 1, Math.floor((w - 3) / 2), y + h - tr - 2], [x + 2 + Math.floor((w - 3) / 2), tr + 1, w - 3 - Math.floor((w - 3) / 2), y + h - tr - 2]];
  panes.forEach(([px, py, pw, ph], k) => {
    const fill = opts.panes ? opts.panes[k] : P.glass;
    if (fill === null) { for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) l.d[(py + j) * l.w + px + i] = null; return; }
    l.rect(px, py, pw, ph, fill);
    if (fill === P.glass) { l.line(px + 1, py + ph - 2, px + Math.min(pw - 1, 3), py + ph - 2 - Math.min(pw - 2, 2), P.glassL); l.px(px + pw - 2, py + 1, P.glassR); }
    if (fill === P.osb || fill === D.osb) for (let j = 0; j < ph; j += 2) for (let i = (j % 4) / 2; i < pw; i += 3) l.px(px + i, py + j, opts.osbD || P.osbD);
  });
  l.hline(x, y + h - 1, w, frD); l.vline(x + w - 1, y, h, frD);
}

// ================================================================ ARCHS ====
// Back wall: rows of Altbau windows. Transparent panes let the void show through.
function archFrame(v) {
  const l = new Layer(167, 50);
  l.rect(0, 0, 167, 50, D.wall);
  roughcast(l, 0, 0, 167, 50, D.wallD, 11 + v);
  roughcast(l, 0, 0, 167, 50, D.wallL, 91 + v);
  l.hline(0, 0, 167, D.trim); l.hline(0, 1, 167, D.wallL); l.hline(0, 2, 167, D.wallD);
  l.hline(0, 45, 167, D.trim); l.rect(0, 46, 167, 4, D.wallD);
  if (v === 2) { l.rect(44, 3, 72, 42, D.erker); l.vline(44, 3, 42, D.wallD); l.vline(115, 3, 42, D.rail); roughcast(l, 44, 3, 72, 42, D.wallD, 5); }
  if (v === 4) { // ground floor: klinker plinth with tags
    l.rect(0, 36, 167, 10, D.klinker);
    for (let y = 36; y < 46; y += 2) { l.hline(0, y, 167, D.klinkerD); for (let x = (y % 4 ? 0 : 3); x < 167; x += 6) l.px(x, y + 1, D.klinkerD); }
    // easter egg: sprayed confession on the plinth (this frame shows up in about 1 of 9 wall tiles)
    const egg = 'DER DEV IST SELBST ZUGEZOGENER', ex = Math.round((167 - l.textWidth(egg)) / 2);
    l.text(egg, ex + 1, 39, D.wallD); l.text(egg, ex, 38, D.tag);
    l.line(ex - 6, 43, ex - 3, 38, D.pink); l.line(ex + l.textWidth(egg) + 2, 38, ex + l.textWidth(egg) + 5, 44, D.pink);
  }
  for (let k = 0; k < 4; k++) {
    const x = 9 + k * 40, y = 7, w = 24, h = v === 4 ? 27 : 32;
    let panes = [null, null, null, null];
    if (v === 1 && k === 1) panes = [D.lit, D.lit, D.litD, D.litD];
    if (v === 1 && k === 3) panes = [D.osb, D.osb, null, null];
    if (v === 3 && k === 0) panes = [D.lit, null, D.litD, null];
    if (v === 5 && k === 2) panes = [D.osb, null, null, null];
    sprossenfenster(l, x, y, w, h, { frame: D.frame, frameD: D.frameD, panes, osbD: D.klinkerD });
    if (v === 4) { l.rect(x + 1, y + 1, w - 2, 8, D.frameD); for (let j = y + 2; j < y + 9; j += 2) l.hline(x + 1, j, w - 2, D.trim); } // roller shutter
    l.rect(x - 2, y + h, w + 4, 2, D.trim); l.hline(x - 2, y + h + 2, w + 4, D.wallD);
    if (v === 1 && k === 2) for (let p = 0; p < 5; p++) { l.rect(x + p * 5, y + h - 3, 3, 3, D.klinker); l.ellipse(x + 1 + p * 5, y + h - 5, 2, 2, p % 2 ? D.plant : D.plantL); }
  }
  if (v === 3) { // balcony with plants and a string of lights across the two right windows
    l.rect(86, 30, 70, 3, D.trim); l.rect(86, 33, 70, 2, D.wallD);
    for (let x = 87; x < 156; x += 3) l.vline(x, 22, 8, D.rail);
    l.hline(86, 21, 70, D.rail);
    for (let p = 0; p < 9; p++) { const px = 89 + p * 7; l.rect(px, 26, 4, 4, D.klinker); l.ellipse(px + 1.5, 23, 2.5, 3, p % 2 ? D.plant : D.plantL); }
    for (let x = 86; x < 156; x += 4) { const y = 12 + Math.round(3 * Math.sin((x - 86) / 70 * Math.PI)); l.px(x, y, D.rail); l.px(x + 2, y + 1, D.bulb); }
  }
  if (v === 2 || v === 5) { // bulky waste piled on the ledge
    const r = rng(40 + v);
    for (let k = 0; k < 7; k++) {
      const x = 6 + Math.floor(r() * 150), kind = Math.floor(r() * 3);
      if (kind === 0) { l.ellipse(x, 42, 5, 4, D.bag); l.px(x, 37, D.bag); }
      else if (kind === 1) { l.rect(x - 3, 37, 6, 8, D.bucket); l.hline(x - 3, 38, 6, D.frameD); }
      else { l.poly([[x - 8, 45], [x + 8, 45], [x + 6, 33], [x - 6, 35]], D.klinkerD); l.hline(x - 6, 40, 12, D.klinker); }
    }
  }
  return l;
}

// ========================================================= BACK CLUSTERS ==
function clusterFrame(seed) {
  const l = new Layer(225, 125), r = rng(seed);
  const cols = [P.brick, P.klinker, P.putzD, P.flower, P.orange, P.greyD, P.woodD];
  for (let k = 0; k < 46; k++) {
    const x = 6 + Math.floor(r() * 212), y = 5 + Math.floor(r() * 114), t = Math.floor(r() * 5);
    if (t === 0) { l.rect(x, y, 5, 3, cols[Math.floor(r() * 2)]); l.hline(x, y + 2, 5, P.brickD); l.px(x, y, P.ink); }
    else if (t === 1) { l.px(x, y, P.flower); l.px(x + 1, y, P.yellowD); l.px(x, y + 1, P.yellowD); l.px(x + 1, y - 1, P.flower); } // leaf
    else if (t === 2) { l.rect(x, y, 3, 2, P.metal); l.px(x + 1, y, P.metalL); } // crown cap
    else if (t === 3) { l.hline(x, y, 3, P.paint); l.px(x + 3, y, P.orange); } // butt
    else { l.rect(x, y, 4, 3, P.putz); l.px(x + 3, y, P.putzL); l.px(x, y + 2, P.putzD); } // render flake
  }
  return l;
}

// ============================================================== MID MIXED ==
const MID = [];
const mid = fn => MID.push(fn);
// 0: three bricks in mortar
mid(() => { const l = new Layer(30, 16); l.rect(0, 0, 30, 16, P.paintD); for (const [x, y] of [[1, 1], [15, 1], [8, 8], [22, 8]]) { l.rect(x, y, 13, 6, P.brick); l.hline(x, y, 13, P.brickL); l.hline(x, y + 5, 13, P.brickD); } l.rect(0, 8, 7, 7, P.brick); return l; });
// 1: klinker chunk with a white tag
mid(() => { const l = new Layer(46, 26); l.poly([[0, 4], [40, 0], [46, 20], [4, 26]], P.klinker); for (let y = 2; y < 26; y += 3) l.replace(0, y, 46, 1, { [P.klinker]: P.klinkerD }); l.line(8, 18, 14, 8, P.paint); l.line(14, 8, 18, 18, P.paint); l.line(18, 18, 26, 9, P.paint); l.line(26, 9, 34, 16, P.paint); return l; });
// 2: pallet
mid(() => { const l = new Layer(60, 40); for (let k = 0; k < 5; k++) { l.rect(0, k * 8, 60, 5, P.woodL); l.hline(0, k * 8 + 4, 60, P.wood); } for (const x of [2, 27, 52]) l.rect(x, 0, 6, 40, P.wood); for (const x of [3, 28, 53]) for (const y of [2, 18, 34]) l.px(x, y, P.woodD); return l; });
// 3: white sprossenfenster fallen out of its wall
mid(() => { const l = new Layer(42, 60); sprossenfenster(l, 0, 0, 42, 60, {}); l.px(10, 30, P.glassR); l.line(24, 24, 32, 36, P.glassR); return l; });
// 4: window with OSB boards in the upper panes
mid(() => { const l = new Layer(42, 60); sprossenfenster(l, 0, 0, 42, 60, { panes: [P.osb, P.osb, P.glass, P.glass] }); l.rect(5, 26, 12, 30, P.glassL); return l; });
// 5: balcony slab with plants and a string of lights
mid(() => {
  const l = new Layer(110, 56);
  l.rect(0, 40, 110, 6, P.putzL); l.rect(0, 46, 110, 4, P.putzD); roughcast(l, 0, 40, 110, 10, P.putz, 5);
  l.hline(0, 20, 110, P.black); for (let x = 1; x < 110; x += 4) l.vline(x, 21, 19, P.black);
  const r = rng(8);
  for (let p = 0; p < 11; p++) { const x = 3 + p * 10, big = r() < 0.5; l.rect(x, 33, 7, 7, P.brick); l.hline(x, 33, 7, P.brickL); l.ellipse(x + 3, big ? 24 : 28, big ? 5 : 4, big ? 8 : 5, p % 3 ? P.green : P.greenD); if (p % 2) { l.px(x + 2, 22, P.red); l.px(x + 4, 25, P.red); } else { l.px(x + 3, 26, P.greenL); } }
  for (let x = 0; x < 110; x += 5) { const y = 4 + Math.round(4 * Math.sin(x / 110 * Math.PI)); l.px(x, y, P.black); l.px(x + 2, y + 1, P.warm); l.px(x + 3, y + 1, P.black); }
  return l;
});
// 6: facade chunk with two windows and broken edges
mid(() => {
  const l = new Layer(112, 104);
  l.poly([[4, 6], [60, 0], [108, 8], [112, 60], [104, 100], [50, 104], [0, 96], [6, 50]], P.putz); roughcast(l, 0, 0, 112, 104, P.putzD, 3); roughcast(l, 0, 0, 112, 104, P.putzL, 4);
  sprossenfenster(l, 16, 18, 28, 44); sprossenfenster(l, 64, 18, 28, 44, { panes: [P.glass, P.glass, P.warm, P.glass] });
  l.rect(13, 62, 34, 3, P.sockel); l.rect(61, 62, 34, 3, P.sockel);
  for (let p = 0; p < 4; p++) { l.rect(15 + p * 8, 58, 5, 4, P.brick); l.ellipse(17 + p * 8, 55, 3, 3, P.green); l.px(17 + p * 8, 54, P.pink); }
  l.vline(54, 0, 104, P.metalD); l.vline(55, 0, 104, P.metal); // drain pipe
  l.line(20, 84, 30, 76, P.pink); l.line(30, 76, 34, 86, P.pink); l.line(34, 86, 44, 78, P.pink); // pink tag
  return l;
});
// 7: bay window (Erker) chunk
mid(() => {
  const l = new Layer(90, 96);
  l.rect(0, 0, 90, 96, P.erker); roughcast(l, 0, 0, 90, 96, P.erkerD, 7); l.vline(0, 0, 96, P.erkerL); l.vline(89, 0, 96, P.erkerD);
  for (let r = 0; r < 2; r++) { sprossenfenster(l, 6, 6 + r * 46, 18, 34); sprossenfenster(l, 28, 6 + r * 46, 34, 34, { panes: r ? [P.glass, P.glass, P.glass, P.glass] : [P.glass, P.glass, P.warm, P.warm] }); sprossenfenster(l, 66, 6 + r * 46, 18, 34); l.rect(0, 42 + r * 46, 90, 3, P.erkerL); }
  return l;
});
// 8: ground floor: plinth render, roller shutter half down, flower box, klinker with tags
mid(() => {
  const l = new Layer(116, 92);
  l.rect(0, 0, 116, 60, P.sockel); roughcast(l, 0, 0, 116, 60, P.sockelD, 12);
  l.rect(0, 60, 116, 32, P.klinker); for (let y = 60; y < 92; y += 3) { l.hline(0, y, 116, P.klinkerD); for (let x = (y % 6 ? 0 : 4); x < 116; x += 8) l.vline(x, y, 3, P.klinkerD); }
  sprossenfenster(l, 22, 8, 40, 48); l.rect(23, 9, 38, 20, P.paint); for (let y = 10; y < 29; y += 2) l.hline(23, y, 38, P.paintD);
  l.rect(20, 54, 44, 5, P.woodD); for (let p = 0; p < 6; p++) { l.ellipse(24 + p * 7, 51, 3, 3, P.green); l.px(24 + p * 7, 49, [P.red, P.flower, P.pink][p % 3]); }
  // bubble letters and a black tag (invented)
  bigText(l, 'KIEZ', 12, 72, P.paint, 3); l.line(78, 80, 84, 66, P.ink); l.line(84, 66, 88, 80, P.ink); l.line(88, 80, 96, 70, P.ink); l.line(96, 70, 104, 78, P.ink);
  l.rect(80, 20, 22, 14, P.metalL); l.frame(80, 20, 22, 14, P.metalD); l.ellipse(90, 27, 5, 5, P.metal); l.ellipse(90, 27, 2, 2, P.metalD); // air conditioner
  return l;
});
// 9: Spaeti shop front with neon sign
mid(() => {
  const l = new Layer(124, 84);
  l.rect(0, 0, 124, 84, P.putz); roughcast(l, 0, 0, 124, 84, P.putzD, 21);
  l.rect(6, 4, 112, 18, P.black); l.frame(6, 4, 112, 18, P.pink);
  const tw = bigText(l, 'SPÄTI', 0, -50, P.pink); bigText(l, 'SPÄTI', 62 - Math.floor(tw / 2) + 1, 10, P.redD); bigText(l, 'SPÄTI', 62 - Math.floor(tw / 2), 9, P.pink);
  l.rect(6, 26, 70, 54, P.glass); for (const y of [40, 54, 68]) l.hline(6, y, 70, P.metalD);
  const bc = [P.green, P.warmD, P.teal, P.pink, P.flower, P.paint];
  for (let i = 0; i < 11; i++) for (const y of [40, 54, 68]) { const x = 9 + i * 6, c = bc[(i + y) % 6]; l.rect(x, y - 7, 3, 7, c); l.rect(x + 1, y - 9, 1, 2, c); l.px(x, y - 6, P.white); }
  l.rect(82, 26, 34, 58, P.tealD); l.rect(85, 29, 28, 26, P.glass); l.text('24', 93, 36, P.warm); l.text('H', 101, 36, P.warm);
  for (const [x, y, c] of [[86, 60, P.pink], [92, 66, P.flower], [104, 62, P.paint], [98, 72, P.orange], [108, 70, P.teal]]) l.rect(x, y, 4, 3, c);
  return l;
});
// 10: corner pub with awning and a chain of pennants (invented colour stripes, no real flags)
mid(() => {
  const l = new Layer(130, 86);
  l.rect(0, 0, 130, 86, P.sockel); roughcast(l, 0, 0, 130, 86, P.sockelD, 31);
  l.rect(8, 2, 76, 14, P.black); bigText(l, 'KNEIPE', 13, 5, P.red, 1); l.ellipse(100, 9, 7, 7, P.paint); l.ellipse(100, 9, 5, 5, P.greenD); l.text('8', 99, 7, P.paint);
  l.rect(0, 20, 130, 6, P.black); l.hline(0, 25, 130, P.blackL);
  const flags = [[P.red, P.paint], [P.blue, P.flower], [P.green, P.paint], [P.flower, P.red], [P.teal, P.paint], [P.paint, P.blue], [P.orange, P.greenD]];
  for (let k = 0; k < 12; k++) { const x = 3 + k * 11, y = 27 + Math.round(3 * Math.sin(k / 11 * Math.PI)); const [a, b] = flags[k % flags.length]; l.poly([[x, y], [x + 9, y], [x + 4.5, y + 11]], a); l.hline(x + 1, y + 3, 8, b); l.hline(x + 2, y + 4, 6, b); }
  l.line(0, 27, 130, 27, P.ink);
  sprossenfenster(l, 8, 42, 50, 40, { panes: [P.glass, P.glass, P.warmD, P.glass] }); sprossenfenster(l, 70, 42, 26, 40);
  l.rect(104, 40, 20, 46, P.woodD); l.px(107, 62, P.metalL);
  l.rect(62, 58, 6, 12, P.red); l.rect(63, 60, 4, 4, P.paint); // gum machine
  return l;
});
// 11: grill snack bar with a wooden plank sign and chicken silhouette
mid(() => {
  const l = new Layer(116, 84);
  l.rect(0, 0, 116, 84, P.paint); roughcast(l, 0, 0, 116, 84, P.paintD, 41);
  l.poly([[6, 6], [110, 3], [112, 22], [4, 24]], P.wood); for (let y = 8; y < 22; y += 4) l.line(8, y, 108, y - 2, P.woodD);
  bigText(l, 'GRILL', 34, 9, P.flower, 3);
  l.rect(10, 30, 60, 50, P.glass); l.frame(10, 30, 60, 50, P.metalD); l.rect(12, 62, 56, 16, P.metalL); l.hline(12, 62, 56, P.warm);
  l.ellipse(40, 44, 10, 6, P.woodD); l.rect(28, 42, 5, 3, P.woodD); l.rect(47, 38, 5, 3, P.woodD); l.px(29, 46, P.woodD); l.px(51, 48, P.woodD); // roast chicken silhouette
  l.rect(50, 52, 16, 6, P.black); l.text('TO GO', 51, 53, P.red, 0);
  l.rect(76, 30, 32, 54, P.black); for (let y = 31; y < 50; y += 2) l.hline(77, y, 30, P.metal);
  return l;
});
// 12: tree pit with a low wooden fence, wild growth and yellow flowers
mid(() => {
  const l = new Layer(124, 70), r = rng(12);
  for (let k = 0; k < 40; k++) { const x = 4 + r() * 116, h = 10 + r() * 30; l.line(x, 60, x + (r() - 0.5) * 8, 60 - h, k % 3 ? P.green : P.greenD); l.ellipse(x + (r() - 0.5) * 6, 60 - h, 2 + r() * 3, 2 + r() * 2, k % 2 ? P.green : P.greenL); }
  for (let k = 0; k < 12; k++) { const x = 8 + r() * 108, y = 18 + r() * 30; l.px(x, y, P.flower); l.px(x + 1, y, P.flower); l.px(x, y + 1, P.flower); l.px(x - 1, y, P.flower); l.px(x, y - 1, P.flower); l.px(x, y, P.orange); }
  l.rect(0, 44, 124, 5, P.wood); l.hline(0, 44, 124, P.woodL); l.rect(0, 56, 124, 5, P.wood); l.hline(0, 56, 124, P.woodL);
  for (const x of [2, 60, 118]) l.rect(x, 42, 4, 26, P.woodD);
  l.text('LYM', 20, 45, P.paint, 1); // a scratched-in tag
  l.rect(0, 64, 124, 6, P.klinkerD); for (let x = 2; x < 124; x += 7) l.px(x, 66, P.orange);
  return l;
});
// helper: bicycle
function bike(l, x, y, r, frameCol, opts = {}) {
  const wheel = (cx, cy) => { for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; l.px(cx + Math.cos(t) * r, cy + Math.sin(t) * r, P.black); l.px(cx + Math.cos(t) * (r - 1), cy + Math.sin(t) * (r - 1), P.blackL); } for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI; l.line(cx - Math.cos(t) * (r - 2), cy - Math.sin(t) * (r - 2), cx + Math.cos(t) * (r - 2), cy + Math.sin(t) * (r - 2), P.metalD); } l.rect(cx - 1, cy - 1, 2, 2, P.metal); };
  const bx = x + r * 2.6;
  wheel(x, y); wheel(bx, y);
  const seat = [x + r * 0.9, y - r * 1.2], head = [bx - r * 0.3, y - r * 1.3], crank = [x + r * 1.3, y];
  l.line(x, y, crank[0], crank[1], frameCol); l.line(x, y, seat[0], seat[1], frameCol); l.line(crank[0], crank[1], seat[0], seat[1], frameCol);
  l.line(crank[0], crank[1], head[0], head[1] + 2, frameCol); l.line(seat[0], seat[1] + (opts.step ? r * 0.8 : 0), head[0], head[1], frameCol); l.line(head[0], head[1], bx, y, frameCol);
  l.rect(seat[0] - 3, seat[1] - 2, 6, 2, P.black); l.line(head[0], head[1], head[0] - 2, head[1] - 4, P.metal); l.hline(head[0] - 5, head[1] - 4, 5, P.black);
  if (opts.rack) { l.hline(x - 2, seat[1] + 2, r + 4, P.metalD); l.line(x - 1, seat[1] + 2, x, y, P.metalD); }
  if (opts.basket) { l.rect(bx - 3, head[1] - 4, 7, 5, P.woodL); l.hline(bx - 3, head[1] - 2, 7, P.wood); }
  if (opts.bell) l.px(head[0] - 3, head[1] - 5, P.greenL);
}
// 13: rusty old roadster, a bit overgrown
mid(() => { const l = new Layer(118, 74); bike(l, 21, 52, 19, P.rust, { rack: true, bell: true }); for (let k = 0; k < 22; k++) { const x = 3 + k * 5; l.line(x, 72, x + (k % 3) - 1, 58 - (k % 4) * 3, k % 2 ? P.green : P.greenD); l.px(x, 58 - (k % 4) * 3, P.greenL); } l.hline(0, 73, 118, P.greenD); return l; });
// 14: pink kids' bike with basket
mid(() => { const l = new Layer(84, 56); bike(l, 15, 40, 14, P.pink, { basket: true, step: true }); return l; });
// 15: yellow skip container with red-white stripes
mid(() => {
  const l = new Layer(124, 60);
  l.poly([[0, 8], [124, 8], [110, 56], [14, 56]], P.yellow); l.hline(0, 8, 124, P.yellowD); l.hline(2, 9, 120, P.flower);
  for (let x = 6; x < 118; x += 16) l.vline(x + (x < 62 ? 4 : 0), 12, 42, P.yellowD);
  for (let k = 0; k < 6; k++) { l.poly([[k * 6, 8], [k * 6 + 3, 8], [k * 6 + 6, 18], [k * 6 + 3, 18]], k % 2 ? P.paint : P.red); l.poly([[124 - k * 6, 8], [121 - k * 6, 8], [118 - k * 6, 18], [121 - k * 6, 18]], k % 2 ? P.paint : P.red); }
  l.rect(30, 0, 18, 9, P.brick); l.rect(52, 2, 14, 7, P.paintD); l.rect(70, 3, 26, 5, P.woodL); l.rect(96, 1, 8, 8, P.bag);
  roughcast(l, 14, 20, 96, 36, P.rust, 55); l.line(40, 40, 50, 30, P.ink); l.line(50, 30, 56, 42, P.ink); // tag
  return l;
});
// 16: orange street litter bin on its post
mid(() => { const l = new Layer(30, 66); l.rect(13, 34, 4, 32, P.metalD); l.poly([[2, 0], [28, 0], [26, 36], [4, 36]], P.orange); l.vline(24, 2, 32, P.orangeD); l.hline(2, 0, 26, P.orangeD); l.ellipse(15, 12, 6, 5, P.ink); l.rect(6, 22, 8, 5, P.paint); l.rect(16, 26, 6, 4, P.blue); l.line(5, 30, 20, 20, P.ink); l.rect(4, 14, 3, 12, P.metalL); return l; });
// 17: bulky waste: blue bags, paint buckets, cardboard
mid(() => {
  const l = new Layer(96, 58);
  l.poly([[48, 58], [60, 14], [92, 18], [96, 58]], P.osb); l.line(62, 20, 90, 24, P.osbD); l.line(70, 34, 94, 36, P.osbD);
  for (const [x, y, rx, ry] of [[18, 42, 16, 14], [40, 46, 14, 12], [28, 24, 12, 11]]) { l.ellipse(x, y, rx, ry, P.bag); l.ellipse(x - rx / 3, y - ry / 3, rx / 3, ry / 3, P.bagL); l.px(x, y - ry - 1, P.bag); l.px(x, y - ry - 2, P.bagL); }
  for (const [x, y] of [[58, 40], [70, 42], [64, 26]]) { l.rect(x, y, 11, 14, P.paint); l.hline(x, y + 2, 11, P.paintD); l.hline(x, y, 11, P.metal); l.rect(x + 2, y + 5, 7, 5, [P.teal, P.pink, P.flower][(x + y) % 3]); }
  return l;
});
// 18: an abandoned inkjet printer with a torn-off flap
mid(() => { const l = new Layer(48, 34); l.rect(2, 10, 44, 22, P.black); l.hline(2, 10, 44, P.blackL); l.rect(8, 14, 12, 7, P.glassL); l.rect(28, 16, 12, 2, P.blackL); l.rect(10, 26, 30, 3, P.blackL); l.poly([[0, 2], [30, 0], [34, 6], [4, 8]], P.greyD); l.rect(6, 4, 20, 2, P.paint); return l; });
// 19: old radiator
mid(() => { const l = new Layer(56, 36); for (let k = 0; k < 9; k++) { l.rect(2 + k * 6, 2, 5, 32, P.paint); l.vline(6 + k * 6, 2, 32, P.paintD); l.ellipse(4 + k * 6, 2, 2, 2, P.paint); } l.rect(0, 30, 56, 3, P.paintD); l.rect(50, 4, 4, 4, P.metal); return l; });
// 20: brown beer bench set
mid(() => { const l = new Layer(104, 46); l.rect(0, 10, 104, 5, P.woodL); for (let x = 0; x < 104; x += 8) l.vline(x, 10, 5, P.wood); l.rect(6, 15, 5, 30, P.woodD); l.rect(92, 15, 5, 30, P.woodD); l.rect(10, 28, 84, 4, P.wood); l.rect(12, 32, 4, 13, P.woodD); l.rect(88, 32, 4, 13, P.woodD); l.rect(40, 4, 10, 6, P.wood); l.ellipse(45, 3, 5, 3, P.greenD); l.rect(60, 8, 6, 2, P.black); return l; });
// 21: two bollards, red-white and black
mid(() => { const l = new Layer(34, 60); l.rect(2, 6, 10, 54, P.paint); for (let y = 8; y < 60; y += 12) l.rect(2, y, 10, 6, P.red); l.ellipse(7, 6, 5, 3, P.red); l.rect(22, 14, 9, 46, P.black); l.ellipse(26.5, 14, 4.5, 3, P.blackL); l.hline(22, 20, 9, P.metal); return l; });
// 22: chimney with a pigeon
mid(() => { const l = new Layer(42, 64); l.rect(6, 12, 30, 52, P.brick); for (let y = 14; y < 64; y += 4) { l.hline(6, y, 30, P.brickD); for (let x = (y % 8 ? 8 : 12); x < 36; x += 8) l.vline(x, y + 1, 3, P.brickD); } l.rect(2, 8, 38, 5, P.putzL); l.rect(14, 2, 6, 6, P.metal); l.rect(24, 3, 5, 5, P.metal); l.stamp(30, 0, ['.kk...', 'kgek..', 'kggggk', '.kdgk.'], { k: P.ink, g: P.grey, e: P.teal, d: P.greyD }); return l; });
// 23: a piece of Berlin pavement: mosaic strip, washed concrete slab, light-well grate
mid(() => {
  const l = new Layer(116, 52);
  l.poly([[0, 4], [116, 0], [116, 52], [0, 48]], P.pave);
  const r = rng(23);
  for (let y = 2; y < 50; y++) for (let x = 0; x < 116; x++) if (l.get(x, y) && r() < 0.18) l.px(x, y, r() < 0.5 ? P.paveD : P.paveL);
  for (let y = 4; y < 50; y += 3) for (let x = (y % 6 ? 0 : 2); x < 30; x += 4) { l.rect(x, y, 3, 2, P.cobble); l.px(x + 2, y + 1, P.cobbleD); }
  l.vline(30, 3, 47, P.paveD); l.vline(74, 2, 49, P.paveD);
  l.rect(8, 16, 14, 10, P.black); for (let x = 9; x < 22; x += 2) l.vline(x, 17, 8, P.metalD);
  l.poly([[80, 20], [96, 18], [98, 30], [82, 32]], P.black); // asphalt patch
  for (const [x, y] of [[40, 12], [58, 34], [100, 40], [48, 40]]) { l.px(x, y, P.flower); l.px(x + 1, y, P.yellowD); l.px(x, y + 1, P.flower); }
  return l;
});

// ============================================================ FRONT SMALL ==
const SMALL = [];
const small = fn => SMALL.push(fn);
small(() => { const l = new Layer(12, 34); l.rect(3, 12, 6, 22, P.warmD); l.rect(4, 4, 4, 8, P.warmD); l.rect(4, 1, 4, 3, P.metal); l.rect(3, 18, 6, 7, P.paint); l.vline(4, 12, 20, P.warm); return l; }); // brown bottle
small(() => { const l = new Layer(12, 38); l.rect(2, 14, 8, 24, P.greenD); l.poly([[2, 14], [10, 14], [7, 6], [5, 6]], P.greenD); l.rect(5, 1, 3, 5, P.greenD); l.rect(4, 0, 5, 2, P.flower); l.rect(2, 20, 8, 8, P.flower); l.hline(2, 23, 8, P.orange); l.vline(3, 14, 22, P.green); return l; }); // green mate-style bottle, no label text
small(() => { const l = new Layer(26, 14); for (const [x, y] of [[0, 4], [9, 0], [16, 6]]) { l.ellipse(x + 4, y + 4, 4, 3, P.metal); l.ellipse(x + 4, y + 4, 2, 1.5, [P.red, P.blue, P.flower][(x / 8) | 0]); } return l; }); // crown caps
small(() => { const l = new Layer(22, 16); l.poly([[0, 8], [8, 0], [20, 2], [22, 10], [12, 16], [4, 14]], P.flower); l.line(2, 12, 20, 3, P.yellowD); l.px(8, 6, P.yellowD); l.px(14, 10, P.yellowD); l.line(0, 14, 3, 12, P.woodD); return l; }); // yellow leaf
small(() => { const l = new Layer(26, 13); l.rect(0, 0, 26, 13, P.brick); l.hline(0, 0, 26, P.brickL); l.hline(0, 12, 26, P.brickD); l.vline(25, 0, 13, P.brickD); l.rect(6, 4, 4, 4, P.brickD); l.rect(16, 4, 4, 4, P.brickD); return l; }); // brick
small(() => { const l = new Layer(22, 26); l.rect(1, 4, 20, 22, P.paint); l.hline(1, 6, 20, P.paintD); l.ellipse(11, 4, 10, 2, P.metal); l.rect(4, 10, 14, 10, P.teal); l.line(0, 4, 11, -2, P.metalD); l.line(11, -2, 22, 4, P.metalD); l.poly([[1, 20], [5, 20], [4, 26], [1, 26]], P.teal); return l; }); // paint bucket
small(() => { const l = new Layer(28, 30); l.ellipse(14, 18, 13, 11, P.bag); l.ellipse(10, 14, 4, 4, P.bagL); l.poly([[12, 6], [16, 6], [18, 0], [10, 0]], P.bag); l.px(14, 1, P.bagL); return l; }); // blue bin bag
small(() => { const l = new Layer(30, 24); for (const x of [0, 15]) { l.rect(x + 2, 0, 9, 16, P.red); l.rect(x, 14, 14, 8, P.red); l.hline(x, 21, 14, P.paint); l.hline(x + 2, 2, 9, P.redD); l.px(x + 6, 6, P.flower); l.px(x + 6, 10, P.flower); } return l; }); // pair of kids' boots
small(() => { const l = new Layer(24, 30); l.poly([[3, 16], [21, 16], [18, 30], [6, 30]], P.brick); l.hline(3, 16, 18, P.brickL); for (const [x, y] of [[6, 8], [12, 4], [18, 9], [9, 12], [15, 11]]) { l.ellipse(x, y, 3, 3, P.green); } for (const [x, y] of [[6, 5], [12, 1], [18, 6]]) { l.rect(x - 1, y - 1, 3, 3, P.red); l.px(x, y, P.pink); } return l; }); // geranium pot
small(() => { const l = new Layer(18, 26); l.poly([[1, 4], [17, 4], [14, 26], [4, 26]], P.paint); l.rect(0, 1, 18, 4, P.black); l.rect(3, 12, 12, 6, P.woodL); l.rect(3, 14, 12, 2, P.wood); return l; }); // coffee cup
small(() => { const l = new Layer(34, 34); for (let a = 0; a < 60; a++) { const t = a / 60 * Math.PI * 2; l.px(17 + Math.cos(t) * 16, 17 + Math.sin(t) * 16, P.black); l.px(17 + Math.cos(t) * 15, 17 + Math.sin(t) * 15, P.metal); } for (let a = 0; a < 9; a++) { const t = a / 9 * Math.PI; l.line(17 - Math.cos(t) * 14, 17 - Math.sin(t) * 14, 17 + Math.cos(t) * 14, 17 + Math.sin(t) * 14, P.metalD); } l.ellipse(17, 17, 2, 2, P.metalL); return l; }); // bike wheel
small(() => { const l = new Layer(22, 18); l.stamp(0, 0, ['.....kkk..............', '....kgggk.............', '...kgwkgk.............', '...kgggeek............', '..kgggggeekk..........', '..kgggggggggkkkk......', '.kdggggggggggggdkk....', '.kddggggggggggggddkkk.', '..kddddgggggggggdddk..', '...kkkddddddddddkkk...', '......kk....kk........', '......o.....o.........', '.....oo....oo.........'], { k: P.ink, g: P.grey, w: P.paint, e: P.teal, d: P.greyD, o: P.orange }); return l; }); // pigeon
small(() => { const l = new Layer(18, 34); l.rect(0, 30, 18, 4, P.black); l.poly([[4, 30], [14, 30], [10, 0], [8, 0]], P.orange); l.poly([[5, 22], [13, 22], [12, 14], [6, 14]], P.paint); l.poly([[7, 8], [11, 8], [10.4, 4], [7.6, 4]], P.paint); return l; }); // traffic cone
small(() => { const l = new Layer(40, 10); l.rect(0, 2, 40, 7, P.woodL); l.hline(0, 8, 40, P.woodD); l.line(4, 4, 30, 5, P.wood); l.px(36, 5, P.metal); l.px(6, 6, P.metal); return l; }); // plank
small(() => { const l = new Layer(26, 34); l.rect(0, 0, 26, 34, P.paint); l.hline(3, 3, 20, P.ink); l.hline(3, 6, 14, P.ink); l.hline(3, 9, 18, P.ink); l.rect(3, 12, 8, 6, P.greenL); for (let x = 1; x < 26; x += 3) l.vline(x, 24, 10, P.paintD); l.px(4, 35, P.paint); return l; }); // flyer with tear-off strips (no text)
small(() => { const l = new Layer(22, 30); l.rect(2, 0, 4, 20, P.greenL); l.rect(16, 0, 4, 20, P.greenL); l.rect(2, 0, 18, 4, P.greenL); l.rect(0, 18, 22, 12, P.black); l.rect(8, 22, 6, 4, P.metal); return l; }); // U-lock
small(() => { const l = new Layer(22, 26); l.vline(0, 0, 26, P.woodD); l.poly([[1, 0], [21, 0], [11, 24]], P.blue); l.hline(4, 6, 14, P.flower); l.hline(6, 10, 10, P.flower); return l; }); // pennant
small(() => { const l = new Layer(28, 14); l.ellipse(6, 7, 6, 6, P.metal); l.ellipse(6, 7, 3, 3, null); l.rect(12, 5, 14, 3, P.flower); for (const x of [18, 22]) l.rect(x, 8, 2, 3, P.flower); l.ellipse(6, 7, 3, 3, P.ink); return l; }); // key
small(() => { const l = new Layer(34, 26); l.rect(0, 0, 34, 26, P.teal); l.rect(2, 2, 30, 6, P.tealD); for (let k = 0; k < 5; k++) { l.ellipse(5 + k * 6, 4, 2, 2, P.warmD); } l.rect(12, 14, 10, 4, P.tealD); l.hline(0, 25, 34, P.tealD); return l; }); // bottle crate

small(() => { const l = new Layer(26, 34); l.line(6, 12, 9, 0, P.osbD); l.line(9, 0, 13, 12, P.osbD); l.line(13, 12, 17, 0, P.osbD); l.line(17, 0, 20, 12, P.osbD); l.rect(1, 12, 24, 22, P.osb); l.vline(24, 12, 22, P.osbD); l.ellipse(12, 22, 4, 3.5, P.red); l.px(12, 19, P.osb); l.rect(10, 26, 5, 2, P.red); return l; }); // jute bag with a heart print

// ------------------------------------------------------------------ main ----
function build() {
  const archs = new Layer(1024, 256);
  for (let i = 0; i < 6; i++) blit(archs, archFrame(i), (i % 3) * 333, Math.floor(i / 3) * 100, 333, 100);
  const clusters = new Layer(512, 512);
  for (let i = 0; i < 2; i++) blit(clusters, clusterFrame(100 + i * 17), 0, i * 250, 450, 250);
  const mids = new Layer(2048, 1024);
  if (MID.length !== 24) throw new Error('need 24 mid frames, have ' + MID.length);
  MID.forEach((fn, i) => place(mids, fn(), (i % 7) * 273, Math.floor(i / 7) * 242, 273, 242));
  const smalls = new Layer(1024, 512);
  if (SMALL.length !== 20) throw new Error('need 20 small frames, have ' + SMALL.length);
  SMALL.forEach((fn, i) => place(smalls, fn(), (i % 9) * 112, Math.floor(i / 9) * 116, 112, 116));
  return { archs, back_clusters: clusters, mid_mixed: mids, front_small: smalls };
}
module.exports = { build };
if (require.main === module) {
  const out = build();
  const dir = process.argv.includes('--preview') ? (process.env.PREVIEW_DIR || '.') : OUT;
  for (const [name, layer] of Object.entries(out)) {
    const file = path.join(dir, `${name}.png`);
    let img = layer;
    if (dir !== OUT) { img = new Layer(layer.w, layer.h); img.rect(0, 0, layer.w, layer.h, '14121c'); img.draw(layer, 0, 0); } // preview on a dark void
    writeRGBA(file, img);
    console.log(`Generated ${file} (${layer.w}x${layer.h}, RGBA)`);
  }
}
