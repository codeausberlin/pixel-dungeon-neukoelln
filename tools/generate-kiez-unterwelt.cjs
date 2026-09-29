// "Unterwelt des Mietspiegels" (floors 21-25) plus the two custom tile sheets of floors 1-5:
// rebuilds nine enemy atlases and four custom tile sheets from the unmodified upstream
// Shattered Pixel Dungeon PNGs stored in git (commit 4256b22). Pure Node (zlib only).
//
//   node tools/generate-kiez-unterwelt.cjs                  write all sheets
//   node tools/generate-kiez-unterwelt.cjs --only eye,yog   write only these sheets
//   node tools/generate-kiez-unterwelt.cjs --preview DIR    also write before/after previews
//
// Contract (checked, the script aborts otherwise): every sheet keeps its size and frame grid,
// and every frame keeps its place, so the frame indices in XxxSprite.java / the tile indices in
// the CustomTilemap classes stay valid. Alpha stays identical except in the sheets listed in
// RESHAPED (small silhouette additions such as a cap brim or a lampshade), and even there only
// inside the frames named per sheet.
// The custom tile sheets use the rim ramps of the region generators (copied below, see RIM),
// so they match the converted tilesets without reading them.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const kit = require('./lib/tileset-kit.cjs');
const {decodePNG, encodePNG, rgb, hex, lum, mix, shade, ramp} = kit;

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'core/src/main/assets');
const UPSTREAM = '4256b22';
const argv = process.argv.slice(2);

function upstream(rel) {
  let buf;
  try { buf = execFileSync('git', ['show', UPSTREAM + ':core/src/main/assets/' + rel], {cwd: ROOT, maxBuffer: 1 << 26}); }
  catch (e) { throw new Error(rel + ': upstream version ' + UPSTREAM + ' not found in git; fetch full history'); }
  return decodePNG(buf);
}
const hash = (x, y, s = 0) => { let v = Math.imul(x + 29 + s, 374761393) ^ Math.imul(y + 31, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
const L = c => lum(c[0], c[1], c[2]);
const sat = c => Math.max(...c) - Math.min(...c);
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));

// ---------------------------------------------------------------- sheet helpers
function openSheet(name, rel, fw, fh) {
  const src = upstream(rel), out = {w: src.w, h: src.h, px: Buffer.from(src.px)};
  const per = Math.floor(src.w / fw), rows = Math.floor(src.h / fh);
  const S = {name, rel, src, out, fw, fh, per, count: per * rows, reshaped: new Set()};
  S.i = (f, x, y) => (((Math.floor(f / per) * fh + y) * src.w) + (f % per) * fw + x) * 4;
  S.inside = (x, y) => x >= 0 && y >= 0 && x < fw && y < fh;
  S.a = (f, x, y) => S.inside(x, y) ? src.px[S.i(f, x, y) + 3] : 0;           // source alpha
  S.oa = (f, x, y) => S.inside(x, y) ? out.px[S.i(f, x, y) + 3] : 0;          // output alpha
  S.get = (f, x, y) => { if (!S.a(f, x, y)) return null; const i = S.i(f, x, y); return [src.px[i], src.px[i + 1], src.px[i + 2]]; };
  S.hex = (f, x, y) => { const c = S.get(f, x, y); return c ? hex(c) : null; };
  S.cur = (f, x, y) => { if (!S.oa(f, x, y)) return null; const i = S.i(f, x, y); return [out.px[i], out.px[i + 1], out.px[i + 2]]; };
  // RGB only on existing pixels
  S.set = (f, x, y, c) => {
    if (!S.a(f, x, y)) return false; if (typeof c === 'string') c = rgb(c);
    const i = S.i(f, x, y); out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2]; return true;
  };
  // silhouette change: only allowed in frames registered via S.reshape(f)
  S.add = (f, x, y, c, alpha = 255) => {
    if (!S.inside(x, y)) return false;
    if (!S.reshaped.has(f)) throw new Error(name + ': frame ' + f + ' is not registered for silhouette changes');
    if (typeof c === 'string') c = rgb(c);
    const i = S.i(f, x, y); out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2]; out.px[i + 3] = alpha; return true;
  };
  S.reshape = (...frames) => frames.forEach(f => S.reshaped.add(f));
  S.each = (frames, fn) => { for (const f of frames) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const c = S.get(f, x, y); if (c) fn(f, x, y, c, hex(c)); } };
  S.remap = (frames, map) => S.each(frames, (f, x, y, c, h) => { if (map[h]) S.set(f, x, y, map[h]); });
  S.stamp = (f, ox, oy, rows, keys, add = false) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    if (!keys[ch]) throw new Error(name + ': no colour for ' + ch);
    if (add) S.add(f, ox + x, oy + y, keys[ch]); else S.set(f, ox + x, oy + y, keys[ch]);
  }));
  // opaque bounding box of a frame in the source
  S.bbox = f => {
    let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (S.a(f, x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return x1 < 0 ? null : {x0, y0, x1, y1};
  };
  S.all = () => Array.from({length: S.count}, (_, i) => i);
  return S;
}
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);

// ================================================================ the sheets
const SHEETS = {};

// ---------------------------------------------------------------- succubus: Stadtmarketing-Sukkubus
// "blasse, schwarz gekleidete Kampagnen-Muse": black bob under a campaign-pink beret, black
// turtleneck and trousers instead of the striped outfit, a pink campaign scarf, red lips stay.
SHEETS.succubus = {rel: 'sprites/succubus.png', fw: 12, fh: 15, paint(S) {
  const HAIR = {'6583bd': '2e2434', '839cca': '463a50', '5771ad': '251d2b', '435fa0': '1c1622', '28438c': '120e16'};
  const BERET = {'6583bd': 'c8367a', '839cca': 'e0508e', '5771ad': 'b02e6a', '435fa0': '8a2252', '28438c': '5e1638'};
  const SKIN = new Set(['b6a697', '978a7a', 'd7c9ba', 'b59e88', '826c59', '594b3a', '807567']);
  const black = ramp([[0x40, '101014'], [0x60, '1a1a20'], [0x80, '24242c'], [0xa0, '30303a'], [0xc0, '3e3e4a'], [0xd8, '4c4c5a']]);
  for (let f = 0; f <= 11; f++) {
    let top = 99, mouth = -1;
    S.each([f], (f, x, y, c, h) => { if (HAIR[h]) top = Math.min(top, y); if (h === '9e0b0f') mouth = y; });
    if (mouth < 0) mouth = top + 6;                         // attack frame 11 grins without the red mouth
    S.each([f], (f, x, y, c, h) => {
      if (HAIR[h]) S.set(f, x, y, y <= top + 1 ? BERET[h] : HAIR[h]);
      else if (SKIN.has(h) && y >= mouth + 2) S.set(f, x, y, black(L(c)));
      else if (h === '5c5c5c') S.set(f, x, y, y <= mouth + 3 ? 'd8407a' : '3a3a44');     // first stripe: pink scarf
      else if (h === '1e1e1e' || h === '212121') S.set(f, x, y, '0c0c10');
    });
    // beret stalk: one pixel above the beret, centred (upstream frames have a free row there
    // only in some poses, so it is painted on the beret's own top row instead)
    const xs = []; for (let x = 0; x < 12; x++) if (HAIR[S.hex(f, x, top)]) xs.push(x);
    if (xs.length) S.set(f, xs[Math.floor(xs.length / 2)], top, 'f07aa8');
  }
}};

// ---------------------------------------------------------------- eye: Auge des Ordnungsamts
// Navy uniform ball with a dark peaked cap band and a gold badge; the tooth row becomes a
// hi-vis reflective stripe. The red iris, the white antenna tips and the charging glow stay.
SHEETS.eye = {rel: 'sprites/eye.png', fw: 16, fh: 18, paint(S) {
  const navy = ramp([[0x28, '0e1428'], [0x3c, '16203a'], [0x50, '1f2e50'], [0x5c, '263a64'], [0x70, '30497c'], [0x88, '405e98'], [0xa8, '6484bc'], [0xc8, '9fb6e0'], [0xe8, 'dde7f7']]);
  const purple = c => c[2] > c[1] + 25 && c[0] < c[2] + 10;
  const TEETH = new Set(['ccc9a3', 'b3af80', '99977a', '747254', 'b3b299', 'd7d6b8', '5a5841', 'e6e4d1', 'dbd9a3']);
  for (const f of range(0, 9)) {
    let top = 99;
    S.each([f], (f, x, y, c, h) => { if (purple(c) && h !== 'ffffff') {
      // body pixels: first row with at least 3 body pixels marks the top of the ball
      let n = 0; for (let k = 0; k < 16; k++) if (S.get(f, k, y) && purple(S.get(f, k, y))) n++;
      if (n >= 3) top = Math.min(top, y);
    } });
    S.each([f], (f, x, y, c, h) => {
      if (TEETH.has(h)) S.set(f, x, y, L(c) > 150 ? (x % 3 === 0 ? 'c9d1d8' : 'd9e04a') : L(c) > 110 ? 'a4ac34' : '1a2238');
      else if (purple(c)) S.set(f, x, y, y <= top + 1 && y >= top ? (L(c) > 110 ? '26304a' : '161c2e') : navy(L(c)));
    });
    // gold badge in the middle of the cap band
    const xs = []; for (let x = 0; x < 16; x++) if (S.get(f, x, top + 1) && purple(S.get(f, x, top + 1))) xs.push(x);
    if (xs.length >= 4 && f !== 9) S.set(f, xs[Math.floor(xs.length / 2)], top + 1, 'e8c24a');
  }
}};

// ---------------------------------------------------------------- scorpio: Mahnbescheid-Skorpion
// A yellow "gelber Brief" with a red wax seal as the stinger bulb and a white address window
// on the back. The acidic one ("die Neufassung") is printed on acid-green paper.
SHEETS.scorpio = {rel: 'sprites/scorpio.png', fw: 17, fh: 17, paint(S) {
  const roles = (outline, dark, mid, base, light, hi) => ({outline, dark, mid, base, light, hi});
  const variants = [
    {frames: range(0, 10), src: roles('b5540b', '802f0f', 'b56e3d', 'd79234', 'f19405', 'f8c223'),
      dst: roles('6b4a1c', '4a3212', 'b08a3a', 'd2ad52', 'e6c762', 'f6e39a'), seal: ['8a1c1c', 'c8322c', 'e8584a'], win: 'fbf7ea'},
    {frames: range(15, 25), src: roles('367342', '2f5832', '6e9671', '75ab82', '368b54', '75bc92'),
      dst: roles('2c4a22', '1e3418', '6e8a3a', '98b048', 'b4c85a', 'd8e690'), seal: ['8a1c1c', 'c8322c', 'e8584a'], win: 'f2f7e0'},
  ];
  for (const V of variants) {
    const map = {}; for (const k in V.src) map[V.src[k]] = V.dst[k];
    const deathSplash = f => f - V.frames[0] >= 7;
    for (const f of V.frames) {
      const bb = S.bbox(f); if (!bb) continue;
      S.each([f], (f, x, y, c, h) => {
        if (!map[h] && h !== 'ffffff') return;
        const bulb = y <= bb.y0 + 3 && h !== V.src.outline && !deathSplash(f);
        if (bulb) S.set(f, x, y, h === 'ffffff' ? 'ffe0d8' : L(c) > 170 ? V.seal[2] : L(c) > 120 ? V.seal[1] : V.seal[0]);
        else if (map[h]) S.set(f, x, y, map[h]);
      });
      // address window: the lightest pixels of the body (below the tail) turn white
      if (!deathSplash(f)) S.each([f], (f, x, y, c, h) => { if (h === V.src.hi && y >= 9 && y <= 10) S.set(f, x, y, V.win); });
    }
  }
}};

// ---------------------------------------------------------------- ripper: Entmietungsdämon
// Stays a gaunt red demon with bone claws (as the text says), but wears a tweed flat cap
// (Schiebermütze) with a brim, and dark work trousers: "Sie stehen einfach im Wohnzimmer."
SHEETS.ripper = {rel: 'sprites/ripper.png', fw: 15, fh: 14, paint(S) {
  const HEAD = new Set(['606060', '6f6f6f', '666666', '444444', '2d2d2d']);
  const LEGS = {'121212': '0e1018', '272727': '232838', '1e1e1e': '1a1e2a', '181818': '141822', '2b2b2b': '2a3042'};
  const CAP = ['6e5234', '7e603c', '5a422a', 'a8845a'];
  S.reshape(...range(0, 12));
  for (const f of range(0, 16)) {
    S.remap([f], LEGS);
    if (f > 12) continue;                                   // death frames: the cap falls off
    let top = 99; S.each([f], (f, x, y, c, h) => { if (HEAD.has(h)) top = Math.min(top, y); });
    let right = -1;
    S.each([f], (f, x, y, c, h) => {
      if (!HEAD.has(h) || y > top + 1) return;
      S.set(f, x, y, y === top ? CAP[hash(x, y, f) % 2 ? 1 : 3] : CAP[hash(x, y, f) % 3 === 0 ? 2 : 0]);
      if (y === top + 1) right = Math.max(right, x);
    });
    if (right >= 0 && !S.a(f, right + 1, top + 1)) S.add(f, right + 1, top + 1, '4a3420');     // brim, facing right
  }
}};

// ---------------------------------------------------------------- larva: Mieterhöhungslarve
// A little grub of lined paper with a red head like a red-ink "+15 %" stamp.
SHEETS.larva = {rel: 'sprites/larva.png', fw: 12, fh: 8, paint(S) {
  S.remap(S.all(), {
    'ccc2a3': 'f4f0e4', 'c2b99f': 'e6e0cc', 'ccc191': 'e6e0cc', 'b3ac98': '9fb2cc', 'a39468': 'b9b29c', '948663': 'a09880',
    '7e745b': '6a6454', 'ceb44b': '4a4a52',
    '7e620b': '7a1c1c', 'a37f0f': 'a82828', 'b39e36': 'd04038', 'b3a671': 'e8725a',
  });
}};

// ---------------------------------------------------------------- yog: Ewiger Mietspiegel
// The great eye is a table that became a god: a pale blue grid runs over the sclera like
// a Mietspiegel table, with a yellowish header row. Iris and red tendrils stay.
SHEETS.yog = {rel: 'sprites/yog.png', fw: 20, fh: 19, paint(S) {
  for (const f of range(0, 9)) S.each([f], (f, x, y, c) => {
    if (y < 4 || y > 12 || L(c) < 140 || sat(c) > 90) return;
    const pinkish = c[0] > c[2] + 15;
    const line = y === 6 || y === 9 || (x % 4 === 1 && y >= 4);
    if (line) S.set(f, x, y, [clamp(c[0] * 0.72), clamp(c[1] * 0.8), clamp(c[2] * 0.94 + (pinkish ? 0 : 8))]);
    else if (y >= 4 && y <= 5 && !pinkish) S.set(f, x, y, mix(c, [255, 236, 170], 0.3));
  });
}};

// ---------------------------------------------------------------- yog_fists: the six fists
// Row = fist (FistSprite.texOffset 0,10,..,50), frames c+0..c+6. Each fist is recoloured by
// luminance and gets one emblem on the back of the hand, anchored on the frame's bounding box.
SHEETS.yog_fists = {rel: 'sprites/yog_fists.png', fw: 24, fh: 17, paint(S) {
  const rowFrames = r => range(r * 10, r * 10 + 6);
  const emblem = (f, dx, dy, rows, keys) => {
    const bb = S.bbox(f); if (!bb) return;
    // first position (nudged by up to 2 px) where the emblem lies fully on opaque pixels
    const tries = []; for (const d of [0, 1, 2]) for (let ny = -d; ny <= d; ny++) for (let nx = -d; nx <= d; nx++) if (Math.max(Math.abs(nx), Math.abs(ny)) === d) tries.push([nx, ny]);
    for (const [nx, ny] of tries) {
      const ox = bb.x0 + dx + nx, oy = bb.y0 + dy + ny;
      let ok = true; rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && S.a(f, ox + x, oy + y) !== 255) ok = false; }));
      if (ok) { S.stamp(f, ox, oy, rows, keys); return; }
    }
  };
  const GOOD = [0, 1, 5, 6];                          // idle / zap frames; death frames 2-4 get no emblem
  // 0 Heizkostenfaust: fire stays, a small white ribbed radiator on the back of the hand
  for (const f of GOOD) emblem(f, 2, 5, ['wgwgwr', 'wgwgw.', 'wgwgw.', 'kk.kk.'], {w: 'f4f0e6', g: 'b9b2a2', k: '6a5a4a', r: 'c8322c'});
  // 1 Fassadenbegrünungsfaust: grey concrete façade overgrown with ivy
  const concrete = ramp([[0x00, '0c0c0c'], [0x20, '26272a'], [0x40, '4a4c50'], [0x60, '6c6e72'], [0x80, '8e9094'], [0xa0, 'aeb0b2']]);
  S.each(rowFrames(1), (f, x, y, c) => {
    const l = L(c);
    if (l < 12) return;
    // façade panels with joints every 4 rows, ivy in 2x2 leaf clusters
    const leaf = hash(x >> 1, y >> 1, 3) < 26 && l > 20;
    if (leaf) S.set(f, x, y, hash(x, y, 9) < 45 ? '3f8a3a' : l > 60 ? '6cbc52' : '2e6a2c');
    else S.set(f, x, y, y % 4 === 0 && l > 40 ? concrete(l * 1.0) : concrete(l * 1.25));
  });
  // 2 Faust des Instandhaltungsstaus: damp plaster with mould dots and a strip of grey tape
  const plaster = ramp([[0x00, '10100a'], [0x30, '3e3a28'], [0x60, '7c7454'], [0x90, 'b0a67e'], [0xc0, 'd8cfa8']]);
  S.each(rowFrames(2), (f, x, y, c) => {
    const l = L(c); if (l < 18) return;
    const bb = S.bbox(f), d = (x - bb.x0) - (y - bb.y0);
    if ((d === 6 || d === 7) && f % 10 !== 2 && f % 10 !== 3 && f % 10 !== 4) S.set(f, x, y, d === 6 ? 'c2c6ca' : '8e9296');
    else if (hash(x, y, 5) < 9) S.set(f, x, y, '2a3020');
    else if (hash(x >> 2, y >> 2, 11) < 25) S.set(f, x, y, plaster(l * 0.85).map((v, i) => clamp(v * [0.92, 0.9, 0.78][i])));
    else S.set(f, x, y, plaster(l));
  });
  // 3 Ratenzahlungsfaust: dark steel with rust, a coin slot with a gold coin going in
  const steel = ramp([[0x00, '060708'], [0x30, '2a2e33'], [0x50, '444a52'], [0x70, '5e666e'], [0x90, '7e8790'], [0xb0, 'a2aab2']]);
  S.each(rowFrames(3), (f, x, y, c) => {
    const l = L(c); if (l < 12) return;
    S.set(f, x, y, hash(x >> 1, y >> 1, 13) < 16 && l > 40 ? mix(steel(l), [150, 72, 30], 0.55) : steel(l));
  });
  for (const f of GOOD.map(k => 30 + k)) emblem(f, 3, 1, ['.ooo.', '.GGY.', 'kkkkk'], {o: 'f0d060', G: 'd8a830', Y: 'a8801c', k: '101214'});
  // 4 Hochglanzprospekt-Faust: stays glossy white, with a tiny exposé photo and a magenta corner
  for (const f of GOOD.map(k => 40 + k)) emblem(f, 2, 5, ['sssm', 'hwhm', 'hwhh', 'gggg'], {s: '7ab8e8', m: 'e0409a', h: 'e8e0d0', w: '3a5a7a', g: '6ab04a'});
  // 5 Nebenkostenfaust: stays dark, carries a grey window envelope with a red corner stamp
  for (const f of GOOD.map(k => 50 + k)) emblem(f, 2, 5, ['eeer', 'ewwe', 'eeee'], {e: 'a8a2b8', w: '4a445a', r: 'c8322c'});
}};

// ---------------------------------------------------------------- spawner: Kündigungsschleuder
// The pulsing red mass keeps its look; it now has a dark printer slot in the middle that
// spits a sheet, and three notice sheets orbit it (one full turn over the 16 idle frames).
SHEETS.spawner = {rel: 'sprites/spawner.png', fw: 16, fh: 16, paint(S) {
  for (const f of range(0, 15)) {
    // darker, inkier flesh so the paper reads
    S.each([f], (f, x, y, c) => S.set(f, x, y, shade(c, 0.86)));
    S.stamp(f, 5, 6, ['kkkkkk', '.pppp.', '.pggp.', '.pppp.', '.pggL.'], {k: '1a0808', p: 'f2eee0', g: 'a8a292', L: 'c8322c'});
    for (let k = 0; k < 3; k++) {
      const a = 2 * Math.PI * (f / 16 + k / 3), cx = Math.round(7.5 + Math.cos(a) * 5), cy = Math.round(7.5 + Math.sin(a) * 5);
      for (const [dx, dy, col] of [[0, 0, 'f2eee0'], [1, 0, 'f2eee0'], [0, 1, 'd8d2c0'], [1, 1, 'c8322c']])
        if (S.a(f, cx + dx, cy + dy) >= 200) S.set(f, cx + dx, cy + dy, col);
    }
  }
}};

// ---------------------------------------------------------------- wraith: Vormieterspuk
// The dark ghost wears the dusty fringed lampshade from the previous tenant's Sperrmüll.
// Row 1 (frames 9-16) is TormentedSpiritSprite (gequälter Vormieter) and gets it too. In the
// death frames the lampshade fades with the ghost.
SHEETS.wraith = {rel: 'sprites/wraith.png', fw: 14, fh: 15, paint(S) {
  const SHADE = ['e0cf9c', 'cbb67e', 'a8905a'];
  const FADE = {0: 255, 1: 255, 2: 255, 3: 255, 4: 190, 5: 120, 6: 60};
  for (const base of [0, 9]) for (let k = 0; k <= 6; k++) {
    const f = base + k; S.reshape(f);
    // head = opaque dark (#000000 or #7f0000) pixels; top row and its span
    const headCol = base ? '7f0000' : '000000';
    let top = 99; S.each([f], (f, x, y, c, h) => { if (h === headCol && S.a(f, x, y) === 255) top = Math.min(top, y); });
    if (top === 99) continue;
    const xs = []; for (let x = 0; x < 14; x++) if (S.hex(f, x, top) === headCol && S.a(f, x, top) === 255) xs.push(x);
    const cx = (xs[0] + xs[xs.length - 1]) / 2, alpha = FADE[k];
    const rows = [[top - 1, 4, 'b'], [top - 2, 3, 'm'], [top - 3, 2, 't']];
    for (const [y, half, part] of rows) {
      if (y < 0) continue;
      for (let x = Math.ceil(cx - half + 0.5); x <= Math.floor(cx + half - 0.5); x++) {
        let col = part === 't' ? SHADE[1] : part === 'm' ? (x === Math.round(cx) ? SHADE[0] : SHADE[1]) : ((x & 1) ? SHADE[2] : '8a6e3a');
        S.add(f, x, y, col, alpha);
      }
    }
    // fringe tassels hanging over the head's top row
    for (const x of xs) if ((x & 1) === 0 && k <= 3) S.set(f, x, top, '8a6e3a');
  }
}};

// ---------------------------------------------------------------- halls_special: Yog arena / last level
// Pillars and rims in the sandstone of tiles_halls; the stained-glass windows become glass
// cabinets full of coloured file folders; the ritual candles become red Grablichter.
SHEETS.halls_special = {rel: 'environment/custom_tiles/halls_special.png', fw: 16, fh: 16, paint(S) {
  // same ramps as tools/generate-rathaus-tiles.cjs, so rims and pillars match tiles_halls.png
  const sand = ramp([[0x00, '000000'], [0x30, '2c231d'], [0x50, '4d3f32'], [0x70, '75634d'], [0x90, '9c8666'], [0xb0, 'bba27c'], [0xd0, 'd6c29c']]);
  const STONE = new Set([...range(0, 23), ...range(32, 35), 40, 41, 48, 49]);   // temple front, pillars, window walls
  const FOLDERS = ['9a3030', '34507c', '3f6a42', 'c9a44a', '6b6862', '34507c'].map(rgb);
  const cup = ramp([[0x60, '5a1414'], [0x80, '8a2020'], [0xa0, 'b83030'], [0xc8, 'e05a44']]);
  S.each(S.all(), (f, x, y, c) => {
    const s = sat(c), l = L(c), [r, g, b] = c;
    const flame = s > 120 && r > 200 && g > 150;
    if (STONE.has(f)) {
      if (s > 60) {                                   // stained glass -> glass cabinet full of file folders
        // shelves of binders behind glass: a dark shelf board every 4 rows, spines in between
        const wy = Math.floor(f / 8) * 16 + y, wx = (f % 8) * 16 + x;
        if (wy % 4 === 3) S.set(f, x, y, '2a1a14');
        else {
          const base = FOLDERS[hash(wx >> 1, wy >> 2, 17) % FOLDERS.length];
          S.set(f, x, y, wy % 4 === 0 ? base.map(v => clamp(v * 1.2)) : (wx & 1) ? shade(base, 0.8) : base);
        }
      } else if (l >= 0x48 && s < 45) S.set(f, x, y, sand(l * 1.05));  // grey stone pillars and rims -> sandstone
      return;
    }
    if (flame || (r > 230 && g > 230)) return;         // candle flames stay
    if (f >= 36 && f <= 39) return;                    // blood ring of the spawner room stays
    if (l > 0x70 && s < 70) S.set(f, x, y, cup(l));    // candle -> red Grablicht cup
    else if (g > b + 15 && r > b + 20 && l >= 0x40 && l < 0x78) S.set(f, x, y, mix(c, [74, 34, 28], 0.6)); // wax puddle -> soot
  });
}};

// ---------------------------------------------------------------- region rim ramps
// Copied from the region generators, so the custom tiles match the converted tilesets:
// generate-hinterhof-tiles.cjs (cap), generate-amt-tiles.cjs (cap), generate-baustelle-tiles.cjs
// (shot), generate-rendite-tiles.cjs (concrete), generate-rathaus-tiles.cjs (sand).
const RIM = {
  hinterhof: ramp([[0x00, '000000'], [0x3a, '35312d'], [0x54, '514a43'], [0x61, '5e564e'], [0x9b, '8a8174'],
    [0xab, '978d80'], [0xbf, 'a59b8d'], [0xd4, 'b4aa9b'], [0xdd, 'c0b6a7'], [0xff, 'ddd5c8']]),
  amt: ramp([[0x00, '000000'], [0x30, '2f302b'], [0x60, '6a6a60'], [0x90, 'a5a494'], [0xb0, 'c6c4b1'], [0xc8, 'd8d6c3'], [0xe0, 'eae8d8']]),
  baustelle: ramp([[0x00, '000000'], [0x30, '2f2e2c'], [0x50, '4f4d49'], [0x70, '6e6b66'], [0x90, '8b8882'], [0xb0, 'a9a59e'], [0xd0, 'c4c0b8']]),
  rendite: ramp([[0x00, '000000'], [0x30, '34353a'], [0x60, '6b6c6e'], [0x90, '9d9d9b'], [0xb8, 'bdbcb7'], [0xd8, 'd6d5cf']]),
  rathaus: ramp([[0x00, '000000'], [0x30, '2c231d'], [0x50, '4d3f32'], [0x70, '75634d'], [0x90, '9c8666'], [0xb0, 'bba27c'], [0xd0, 'd6c29c']]),
};

// ---------------------------------------------------------------- weak_floor: distant well, per region
// Cell = Dungeon.depth/5: 0 Hinterhof, 1 Amt, 2 Baustelle, 3 Renditequartier, 4 Unterwelt.
// The rim of the well is recoloured with that region's wall-rim ramp; the brightness boost
// keeps the far-away rim as dim as upstream relative to its region.
SHEETS.weak_floor = {rel: 'environment/custom_tiles/weak_floor.png', fw: 16, fh: 16, paint(S) {
  ['hinterhof', 'amt', 'baustelle', 'rendite', 'rathaus'].forEach((r, f) => S.each([f], (f, x, y, c) => S.set(f, x, y, RIM[r](L(c) * 1.1))));
}};

// ---------------------------------------------------------------- sewer_boss: Mietschimmel arena + exit
// Cells 0-8 (GooNest): the dark stain under the boss becomes a black-green mould patch with
// spore flecks (alpha unchanged). Cells 16-24 (sewer exit): the pale stone frame and the wall
// with the two arched Kellerfenster take the Hinterhof rim colours; rust flecks stay.
SHEETS.sewer_boss = {rel: 'environment/custom_tiles/sewer_boss.png', fw: 16, fh: 16, paint(S) {
  const mould = ramp([[0x00, '050a04'], [0x0c, '0c1a0a'], [0x18, '16280f'], [0x28, '223618']]);
  for (const f of range(0, 8)) S.each([f], (f, x, y, c) => {
    // world-aligned hash: the nest cells tile seamlessly
    const wx = (f % 3) * 16 + x, wy = Math.floor(f / 3) * 16 + y, h = hash(wx, wy, 21);
    S.set(f, x, y, h < 4 ? '5f8a3a' : h < 9 ? '34501f' : mould(L(c) + (hash(wx >> 1, wy >> 1, 4) < 30 ? 10 : 0)));
  });
  S.each(range(16, 24), (f, x, y, c) => { if (sat(c) < 40) S.set(f, x, y, RIM.hinterhof(L(c))); });
}};

// ---------------------------------------------------------------- rat_king_room: Pfandkönig
// Statues keep their grey stone (it already sits well in the grey Hinterhof); the crown turns
// into a Kronkorken crown (gold and red caps), the plinth gets a small blue-white
// Denkmalschutz plaque, and the purple cushion a white "zu verschenken" label.
SHEETS.rat_king_room = {rel: 'environment/custom_tiles/rat_king_room.png', fw: 16, fh: 16, paint(S) {
  for (const f of [2, 4]) {
    let top = 99; S.each([f], (f, x, y, c) => { if (L(c) > 200 && sat(c) < 30) top = Math.min(top, y); });
    S.each([f], (f, x, y, c) => { if (L(c) > 200 && sat(c) < 30 && y <= top + 1) S.set(f, x, y, (x & 1) ? 'e8c24a' : 'c8322c'); });
  }
  const plaque = ['bbbb', 'bwwb'], keys = {w: 'eef2f6', b: '2c5a9a'};
  S.stamp(0, 6, 7, plaque, keys); S.stamp(1, 6, 7, plaque, keys); S.stamp(4, 6, 13, plaque, keys);
  S.stamp(3, 10, 9, ['ww', 'wk'], {w: 'f2eee0', k: '9a9486'});
}};

// ================================================================ run
const only = (() => { const i = argv.indexOf('--only'); return i >= 0 ? argv[i + 1].split(',') : Object.keys(SHEETS); })();
const pi = argv.indexOf('--preview'), previewDir = pi >= 0 ? path.resolve(argv[pi + 1]) : null;
const done = [];
for (const name of only) {
  const def = SHEETS[name]; if (!def) throw new Error('unknown sheet ' + name);
  const S = openSheet(name, def.rel, def.fw, def.fh);
  def.paint(S);
  if (S.out.w !== S.src.w || S.out.h !== S.src.h) throw new Error(name + ': size changed');
  let changed = 0, alphaChanged = 0;
  for (let f = 0; f < S.count; f++) for (let y = 0; y < S.fh; y++) for (let x = 0; x < S.fw; x++) {
    const i = S.i(f, x, y);
    if (S.src.px[i + 3] !== S.out.px[i + 3]) { if (!S.reshaped.has(f)) throw new Error(name + ': alpha changed in frame ' + f); alphaChanged++; }
    if (S.src.px[i] !== S.out.px[i] || S.src.px[i + 1] !== S.out.px[i + 1] || S.src.px[i + 2] !== S.out.px[i + 2]) changed++;
  }
  const png = encodePNG(S.out);
  if (Buffer.compare(decodePNG(png).px, S.out.px) !== 0) throw new Error(name + ': PNG round trip mismatch');
  fs.writeFileSync(path.join(ASSETS, def.rel), png);
  console.log(`${def.rel}  ${S.src.w}x${S.src.h}  frame ${S.fw}x${S.fh}  ${changed} px recoloured, ${alphaChanged} px silhouette`);
  done.push(S);
}

// ---------------------------------------------------------------- previews: per frame, original above, new below
if (previewDir) {
  fs.mkdirSync(previewDir, {recursive: true});
  const canvas = (w, h) => { const c = {w, h, px: Buffer.alloc(w * h * 4)}; for (let i = 0; i < w * h; i++) c.px.writeUInt32BE(0x202028ff, i * 4); return c; };
  for (const S of done) {
    const Z = S.fw >= 20 ? 5 : 7, gap = 4;
    const used = []; for (let f = 0; f < S.count; f++) if (S.bbox(f) || (() => { for (let y = 0; y < S.fh; y++) for (let x = 0; x < S.fw; x++) if (S.oa(f, x, y)) return true; return false; })()) used.push(f);
    const perRow = Math.min(used.length, Math.max(1, Math.floor(1500 / (S.fw * Z + gap))));
    const rows = Math.ceil(used.length / perRow), cellH = 2 * S.fh * Z + gap + 10;
    const c = canvas(perRow * (S.fw * Z + gap), rows * cellH);
    used.forEach((f, n) => {
      const dx = (n % perRow) * (S.fw * Z + gap), dy = Math.floor(n / perRow) * cellH;
      for (const [img, oy] of [[S.src, 0], [S.out, S.fh * Z + gap]]) for (let y = 0; y < S.fh * Z; y++) for (let x = 0; x < S.fw * Z; x++) {
        const i = S.i(f, x / Z | 0, y / Z | 0), a = img.px[i + 3] / 255, X = dx + x, Y = dy + oy + y;
        const bg = (((X >> 3) + (Y >> 3)) & 1) ? [62, 60, 56] : [78, 76, 70], q = (Y * c.w + X) * 4;
        for (let k = 0; k < 3; k++) c.px[q + k] = Math.round(img.px[i + k] * a + bg[k] * (1 - a));
      }
    });
    fs.writeFileSync(path.join(previewDir, S.name + '-vorher-nachher.png'), encodePNG(c));
  }
  console.log('previews in ' + previewDir);
}
