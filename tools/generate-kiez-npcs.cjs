// Kiez-NPCs: rebuilds the NPC, ally and summon sprite sheets of Neukölln Pixel Dungeon from
// the unmodified upstream Shattered Pixel Dungeon v4.0.0 PNGs (read from git commit 4256b22).
// Pure Node (zlib via tools/lib/tileset-kit.cjs), no npm packages, no randomness: two runs
// write byte-identical files.
//
//   node tools/generate-kiez-npcs.cjs                        write all sheets
//   node tools/generate-kiez-npcs.cjs --only shopkeeper,imp  write only these
//   node tools/generate-kiez-npcs.cjs --preview DIR          also write x8 before/after previews
//
// Contract (checked, the script aborts otherwise): every sheet keeps its upstream size and the
// frame grid of its XxxSprite.java. Figures stay inside their frames, feet on the upstream
// ground line and facing the upstream direction. Two methods are used:
//   draw   the frame is cleared and redrawn from a character map (hard alpha, own silhouette)
//   paint  the upstream frame is kept and only recoloured / gets details stamped on top
//          (alpha may change only where a stamp adds pixels)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {decodePNG, encodePNG, rgb, hex, lum} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const SPRITES = path.join(ROOT, 'core/src/main/assets/sprites');
const UPSTREAM_COMMIT = '4256b22';
const argv = process.argv.slice(2);

function upstream(name) {
  let buf;
  try { buf = execFileSync('git', ['show', UPSTREAM_COMMIT + ':core/src/main/assets/sprites/' + name + '.png'], {cwd: ROOT, maxBuffer: 1 << 26}); }
  catch (e) { throw new Error(name + ': upstream ' + UPSTREAM_COMMIT + ' not in git; fetch full history'); }
  return decodePNG(buf);
}

// ---------------------------------------------------------------- sheet helpers
// colour strings: 'rrggbb' (opaque) or 'rrggbbaa'
const col = h => { const c = rgb(h.slice(0, 6)); c.push(h.length > 6 ? parseInt(h.slice(6, 8), 16) : 255); return c; };
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);

function sheet(name, fw, fh) {
  const src = upstream(name), out = {w: src.w, h: src.h, px: Buffer.from(src.px)};
  const per = Math.floor(src.w / fw);
  const S = {name, src, out, fw, fh, per, drawn: new Set()};
  S.i = (f, x, y) => (((Math.floor(f / per) * fh + y) * src.w) + (f % per) * fw + x) * 4;
  S.inside = (x, y) => x >= 0 && y >= 0 && x < fw && y < fh;
  const read = img => (f, x, y) => {
    if (!S.inside(x, y)) return null; const i = S.i(f, x, y);
    return img.px[i + 3] ? hex([img.px[i], img.px[i + 1], img.px[i + 2]]) : null;
  };
  S.get = read(src); S.cur = read(out);
  S.a = (f, x, y) => S.inside(x, y) ? src.px[S.i(f, x, y) + 3] : 0;
  S.put = (f, x, y, h) => { if (!S.inside(x, y)) return; S.out.px.set(col(h), S.i(f, x, y)); };
  // recolour keeping the source alpha (never paints transparent pixels)
  S.set = (f, x, y, h) => { if (!S.a(f, x, y)) return false; const i = S.i(f, x, y), c = rgb(h.slice(0, 6)); out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2]; return true; };
  S.clear = f => { for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) S.out.px.fill(0, S.i(f, x, y), S.i(f, x, y) + 4); };
  S.each = (frames, fn) => { for (const f of frames) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const c = S.get(f, x, y); if (c) fn(f, x, y, c); } };
  S.remap = (frames, map) => S.each(frames, (f, x, y, c) => { const m = typeof map === 'function' ? map(c, f, x, y) : map[c]; if (m) S.set(f, x, y, m); });
  S.find = (f, colours) => { const r = [], s = new Set([].concat(colours)); for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (s.has(S.get(f, x, y))) r.push([x, y]); return r; };
  // character map: '.' or ' ' = leave, '_' = clear; others looked up in pal (opaque or rrggbbaa)
  S.stamp = (f, ox, oy, rows, pal) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    if (ch === '_') { if (S.inside(ox + x, oy + y)) S.out.px.fill(0, S.i(f, ox + x, oy + y), S.i(f, ox + x, oy + y) + 4); return; }
    if (!pal[ch]) throw new Error(name + ': no colour for "' + ch + '"');
    S.put(f, ox + x, oy + y, pal[ch]);
  }));
  // full redraw of one frame from a map of exactly fw x fh characters
  S.draw = (f, rows, pal) => {
    if (rows.length !== fh || rows.some(r => r.length !== fw)) throw new Error(name + ' frame ' + f + ': map must be ' + fw + 'x' + fh + ' (' + rows.map(r => r.length).join(',') + ')');
    S.clear(f); S.stamp(f, 0, 0, rows, pal); S.drawn.add(f);
  };
  return S;
}
// luminance ramp: maps source brightness onto new colour stops so upstream shading survives
function ramp(stops) {
  const s = stops.map(([l, c]) => [l, rgb(c)]);
  return c => {
    const L = lum(rgb(c));
    if (L <= s[0][0]) return hex(s[0][1]);
    for (let i = 1; i < s.length; i++) if (L <= s[i][0]) {
      const t = (L - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      return hex(s[i][1].map((v, k) => Math.round(s[i - 1][1][k] + (v - s[i - 1][1][k]) * t)));
    }
    return hex(s[s.length - 1][1]);
  };
}
const mirror = rows => rows.map(r => [...r].reverse().join(''));

const BUILD = {};

// ================================================================ Spätimann (shopkeeper.png)
// ShopkeeperSprite: TextureFilm 14x14, idle 1,1,1,1,1,0,0,0,0, die 0. Redrawn from scratch.
// A dry, friendly Späti owner in his fifties: salt-and-pepper hair, reading glasses pushed up
// on the forehead, three-day stubble, a small content smile, a bottle-green zipped
// Trainingsjacke with two plain white sleeve stripes (no brand), jeans, grey house slippers.
// Frame 1 = rest; frame 0 = he lifts the front hand and taps the bottle opener on the counter.
const KEEPER_PAL = {
  K: '3a302c', k: '8a827c',                              // hair dark, grey (sideburns, moustache)
  C: '6f6a60', c: '3e3a34', h: '958f82',                 // Schiebermütze: cloth, outline, light
  S: 'eab58e', s: 'cf9570', d: 'a0674a', e: '7a4a34',    // skin, shade, deep shade, outline
  E: '1c1412', B: 'b88c72', M: '8a3e2e',                 // eye, stubble, mouth
  J: '2b6a50', j: '1e4d3a', L: '3f8a68', o: '0f2a20',    // jacket, shade, light, outline
  W: 'eef1ec', w: 'b9c4be', Z: 'd6ddd8',                 // sleeve stripe, stripe shade, zip
  P: '3c5272', p: '28374f', q: '172033',                 // jeans, shade, outline
  X: '8a8a86', x: '5a5a58', O: 'c9c3a8',                 // slippers, slipper shade, bottle opener
};
const KEEPER_BODY = [
  '....cCCCCc....',
  '...cChhCCCc...',
  '...cCCCCCCccc.',
  '...KkSSSSSSe..',
  '..ekkSESSESe..',
  '..esdSSSSSSSe.',
  '...edBBkkkBe..',
];
const KEEPER_LEGS = [
  '...qPPpqPPq...',
  '...qPPpqPPq...',
  '...xXXx.xXXX..',
];
BUILD.shopkeeper = () => {
  const S = sheet('shopkeeper', 14, 14);
  const rest = [ // frame 1: hands down at the sides
    '..oJWJJZJJWJo.',
    '.oJWJjjZjjLWJo',
    '.oJWjjjZjjjWJo',
    '.dsWJJJZJJJWsd',
  ];
  const tap = [ // frame 0: front hand lifted a little, bottle opener in it
    '..oJWJJZJJWJo.',
    '.oJWJjjZjjLWsO',
    '.oJWjjjZjjjWsd',
    '.dsWJJJZJJJWo.',
  ];
  S.draw(1, [...KEEPER_BODY.slice(0, 7), ...rest, ...KEEPER_LEGS], KEEPER_PAL);
  S.draw(0, [...KEEPER_BODY.slice(0, 7), ...tap, ...KEEPER_LEGS], KEEPER_PAL);
  return S;
};


// ================================================================ Ehrgeiziger Filialist (imp.png)
// ImpSprite: TextureFilm 12x14, frames 0-3 idle facing right, 4 facing the viewer.
// Stays a small red demon (actors_de: "kleiner roter Kerl"), now in a mustard franchise polo
// shirt with a turquoise lanyard and a white badge on the chest ("Filialleitung", unreadable),
// and the horns get a tiny paper Späti cap in turquoise between them.
const IMP_POLO = ramp([[40, '6e4a0c'], [70, 'a8740e'], [100, 'd6a21e'], [140, 'f0c64a']]);
BUILD.imp = () => {
  const S = sheet('imp', 12, 14);
  for (let f = 0; f <= 4; f++) {
    // polo: the torso block x 4..8, rows 8..10 (same box in all five frames)
    let n = 0;
    S.each([f], (ff, x, y, c) => {
      if (y < 8 || y > 10 || x < 4 || x > 8 || c === '000000') return;
      S.set(f, x, y, ['ce4545', 'e76666', 'be2424'].includes(c) ? IMP_POLO(c) : (c === '940c0c' ? '9a6a10' : '6a4408')); n++;
    });
    if (n < 10) throw new Error('imp: no torso in frame ' + f);
    // lanyard: turquoise cord from the collar down to a white badge
    const cx = f === 4 ? 6 : 6;
    S.set(f, cx - 1, 8, '2fb8b0'); S.set(f, cx + 1, 8, '2fb8b0');
    S.set(f, cx, 9, 'f4f4ee'); S.set(f, cx + 1, 9, 'b8c0c8');
    // paper cap between the horns (horns stay visible)
    const hx = f === 4 ? 5 : 6;
    S.put(f, hx, 0, '3cc7bd'); S.put(f, hx + 1, 0, '3cc7bd');
    S.set(f, hx, 1, '1f8f88'); S.set(f, hx + 1, 1, '1f8f88');
  }
  return S;
};


// ================================================================ Ewiger Antragsteller (wandmaker.png)
// WandmakerSprite: TextureFilm 12x14, frame 0 idle, 1-3 the short "wave" of the idle loop.
// The friendly old gentleman keeps his head (bald, grey fringe and moustache); the red robe
// becomes a worn brown corduroy Sakko over a white shirt with a dark red tie, grey trousers,
// and in his hands the yellowed waiting ticket 0816 (a paper slip with an unreadable number).
const SAKKO = ramp([[5, '2a1a10'], [20, '3e2818'], [40, '5a3c22'], [60, '7a5634'], [80, '96704a']]);
BUILD.wandmaker = () => {
  const S = sheet('wandmaker', 12, 14);
  const frames = range(0, 3);
  const COAT = new Set(['a30f0f', '7e0505', 'b32424', '5c0101', '8f1f06']);
  S.remap(frames, c => {
    if (COAT.has(c)) return SAKKO(c);
    if (c === '990f0f') return '8e1c22';                  // tie
    if (c === 'bf5926') return 'a07a4e'; if (c === 'a64d21') return '7a5634'; // lapels
    if (c === 'cecece' || c === 'cccccc') return '6a6a70'; if (c === 'a3a3a3') return '4a4a50'; // trousers
    return null;
  });
  // shirt and tie in the robe opening, waiting ticket hanging from the front hand (x3-4, row 9)
  for (const f of frames) {
    if (S.get(f, 3, 9) !== 'dcb497') throw new Error('wandmaker: hand moved in frame ' + f);
    for (const [x, y] of [[7, 9], [8, 9], [7, 10], [8, 10]]) S.set(f, x, y, 'f2eee6');
    for (const y of [8, 9, 10]) S.set(f, 7, y, '8e1c22');
    S.stamp(f, 3, 10, ['NN', 'bN'], {N: 'efe6c4', b: '4a4a4a'});
  }
  return S;
};


// ================================================================ Alter Polier (blacksmith.png)
// BlacksmithSprite: TextureFilm 13x16, 0 idle, 1-3 the hammer strike on the glowing piece.
// Tall, gaunt, skin like Sichtbeton (the upstream grey stays), the helmet "grown onto the
// head" becomes the white Polier helmet, the bare torso an orange high-visibility vest with a
// silver reflective stripe, the olive trousers dark work trousers. Forge glow stays.
const HIVIS = ramp([[60, '8a3a08'], [100, 'c85a10'], [140, 'f07a1a'], [170, 'ff9a36']]);
const WORKPANTS = ramp([[40, '1e2028'], [80, '343846'], [120, '4c5264'], [170, '646c80']]);
BUILD.blacksmith = () => {
  const S = sheet('blacksmith', 13, 16);
  const HELMET = {'86b425': 'e8e8e0', 'b9d661': 'ffffff', '8c9b52': 'bdbdb4', '4d5e1a': '84847c'};
  const SKIN = new Set(['9794a1', 'b0adb7', '6d697b', '797583', '595666']);
  for (const f of range(0, 3)) S.each([f], (ff, x, y, c) => {
    if (y <= 3 && HELMET[c]) S.set(f, x, y, HELMET[c]);
    else if (y === 6 && c === '5e5d36') S.set(f, x, y, '55524c');            // stubble
    else if (y >= 7 && y <= 10 && x >= 3 && SKIN.has(c)) S.set(f, x, y, y === 9 ? (c === '595666' ? 'b4bcc4' : 'f6f8fa') : HIVIS(c));
    else if (y >= 11 && y <= 13 && ['8c9b52', 'b9d661', '4d5e1a', '5e5d36'].includes(c)) S.set(f, x, y, WORKPANTS(c));
  });
  return S;
};


// ================================================================ Pfandkönig (ratking.png)
// RatKingSprite: TextureFilm 16x16 (17 for the holiday rows); row 0 = frames 0-6 normal,
// row 1 = frames 8-14 with the King's crown (Ratmogrify), then the party hat and winter hat
// rows. Only the normal crown changes: actors_de says "Krone aus Kronkorken", so the three
// crown points become bottle caps (red, silver, green) on a silver-gold crimped band.
// The Ratmogrify gold crown, party hat and Glühweinmütze rows stay as upstream.
BUILD.ratking = () => {
  const S = sheet('ratking', 16, 16);
  const CAPS = ['e04a3a', 'e6e6de', '4cb85a'], CAPS_DARK = ['8e2418', '9a9a92', '257a32'];
  for (const f of range(0, 6)) {
    const crown = [];
    S.each([f], (ff, x, y, c) => { if (y <= 5 && ['fff480', 'ffc61a', 'cc9c3d'].includes(c)) crown.push([x, y, c]); });
    if (!crown.length) throw new Error('ratking: no crown in frame ' + f);
    const top = Math.min(...crown.map(p => p[1]));
    const points = crown.filter(p => p[1] === top).sort((a, b) => a[0] - b[0]);
    for (const [x, y, c] of crown) {
      if (y === top) continue;
      S.set(f, x, y, (x % 2) ? 'c8c8c0' : 'd8b040');              // crimped rim, silver/gold
    }
    points.forEach(([x, y], k) => { S.set(f, x, y, CAPS[k % 3]); if (S.a(f, x, y + 1)) S.set(f, x, y + 1, CAPS_DARK[k % 3]); });
  }
  return S;
};


// ================================================================ Der Schwabe an Weihnachten (ghost.png)
// GhostSprite: TextureFilm 14x15, idle 0,1; attack 0,2,3; die 0,4,5,6,7. Drawn with
// Blending.setLightMode (additive), so the sprite glows: dark colours vanish, black eyes read
// as holes, soft alpha stays soft like the upstream haze (ffffff66).
// Motif: a friendly man in his mid-thirties who stayed in Berlin over Christmas and is so
// lonely that he is half transparent. Neat side parting, red knit jumper with a white
// Norweger band and a small reindeer, a Tupperdose of Spätzle held in both hands, and below
// the jumper he fades into the usual ghost wisp. Attack: he holds the box up (offers it),
// then it flashes. Death: he fades out from the feet up.
const GHOST_PAL = {
  h: 'd8a868b0', p: 'fff0dcff',                         // hair, side parting
  F: 'ffe2c8ff', E: '000000ff', m: 'e89a90ff',          // face, eyes, mouth
  R: 'ff5a5a8c', r: 'c83a3a80', W: 'ffffffc8', D: 'c89060d0', // jumper, shade, Norweger band, reindeer
  T: '9ad8ffe0', L: 'ffe070e0', l: 'f0c040d0',          // Tupperdose lid, Spätzle, Spätzle shade
  a: 'ffffff66', b: 'ffffff40', c: 'ffffff24', g: 'ffffff30', G: 'fff4c0a0',
};
const GHOST_HEAD = [
  '..............',
  '.....hhhhh....',
  '....hphhhhh...',
  '....hFFFFFh...',
  '....FEFFEFF...',
  '....FFFFFFF...',
  '.....FFmmF....',
];
const GHOST_FRAMES = {
  0: [...GHOST_HEAD,
    '...rRRRRRRRr..',
    '..rWRWDWRWRWr.',
    '..rRFTTTTFRRr.',
    '...RRLlLLRRr..',
    '....aaaaaaa...',
    '.....aaaaa....',
    '......aab.....',
    '.......ab.....'],
  1: [...GHOST_HEAD,
    '...rRRRRRRRr..',
    '..rWRWDWRWRWr.',
    '..rRFTTTTFRRr.',
    '...RRLlLLRRr..',
    '....aaaaaaa...',
    '....aaaaaa....',
    '....baa.......',
    '....ba........'],
  2: [ // box lifted to the chest: he offers the Spätzle
    ...GHOST_HEAD,
    '..FrRRRRRRRrF.',
    '..rFTTTTTTFRr.',
    '..rRRLlLlLRRr.',
    '...RWRWRWRWr..',
    '....aaaaaaa...',
    '.....aaaaa....',
    '......aab.....',
    '.......ab.....'],
  3: [ // the offer flashes
    '..g.......g...',
    '.g...hhhhh..g.',
    '....hphhhhh...',
    '.g..hFFFFFh.g.',
    '....FEFFEFF...',
    '.g..FFFFFFF.g.',
    '..G..FFmmF.G..',
    '.GFGGGGGGGGFG.',
    '..rFTTTTTTFRr.',
    '.grRRLlLlLRRrg',
    '...RWRWRWRWr..',
    '.g..aaaaaaa.g.',
    '.....aaaaa....',
    '......aab.....',
    '.......ab.....'],
};
BUILD.ghost = () => {
  const S = sheet('ghost', 14, 15);
  S.light = true; S.softAlpha = true;
  for (const f of [0, 1, 2, 3]) S.draw(f, GHOST_FRAMES[f], GHOST_PAL);
  // death 4-7: fade from the feet up, overall alpha drops
  const cut = {4: 15, 5: 12, 6: 10, 7: 8}, fade = {4: 0.8, 5: 0.6, 6: 0.42, 7: 0.25};
  for (const f of [4, 5, 6, 7]) {
    S.draw(f, GHOST_FRAMES[0].map((r, y) => y < cut[f] ? r : '.'.repeat(14)), GHOST_PAL);
    for (let y = 0; y < 15; y++) for (let x = 0; x < 14; x++) {
      const i = S.i(f, x, y); if (S.out.px[i + 3]) S.out.px[i + 3] = Math.max(1, Math.round(S.out.px[i + 3] * fade[f]));
    }
  }
  return S;
};


// ================================================================ Ranglisten-Avatare (avatars.png)
// SurfaceScene.Avatar: TextureFilm 24x32, cell = HeroClass.ordinal(): 0 warrior, 1 mage,
// 2 rogue, 3 huntress, 4 duelist, 5 cleric. Cells 0-3 are redrawn as portraits of the four
// Neukölln classes, matching the hero atlases (tools/generate-kiez-heroes.cjs, class armour
// tier 6) and their colours; cells 4-5 (Duelist, Kleriker) stay upstream.
// Built procedurally: filled shapes per material, then a selective 1 px rim (each material
// darkened) and the upstream soft shadow margin (0000001a) around the figure.
function avatarCanvas() {
  const g = Array.from({length: 32}, () => Array(24).fill(null));
  const A = {g};
  A.px = (x, y, c) => { if (x >= 0 && y >= 0 && x < 24 && y < 32 && c) g[y][x] = c; };
  A.rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) A.px(x, y, typeof c === 'function' ? c(x, y) : c); };
  A.ell = (cx, cy, rx, ry, c, keep) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 24; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1 && (!keep || keep(x, y))) A.px(x, y, typeof c === 'function' ? c(x, y) : c);
  } };
  A.clear = (x, y) => { g[y][x] = null; };
  return A;
}
const darken = (h, k) => hex(rgb(h).map(v => Math.round(v * k)));
function avatarFinish(A, rimExempt = new Set()) {
  const g = A.g, filled = (x, y) => x >= 0 && y >= 0 && x < 24 && y < 32 && g[y][x];
  const out = g.map(r => r.slice());
  for (let y = 0; y < 32; y++) for (let x = 0; x < 24; x++) {
    const c = g[y][x]; if (!c || rimExempt.has(c)) continue;
    if (!filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1)) out[y][x] = darken(c, 0.52);
  }
  for (let y = 0; y < 32; y++) for (let x = 0; x < 24; x++) {
    if (out[y][x]) continue;
    let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (filled(x + dx, y + dy)) near = true;
    if (near) out[y][x] = '0000001a';
  }
  return out;
}
// common body: face, neck, torso, arms, legs; class code fills in the materials
function avatarBase(A, P) {
  A.rect(10, 15, 13, 17, P.skinShade);                          // neck
  A.rect(6, 17, 17, 26, P.torso); A.clear(6, 17); A.clear(17, 17); // torso
  A.rect(4, 18, 5, 24, P.arm); A.rect(18, 18, 19, 24, P.arm);   // sleeves
  A.rect(4, 25, 5, 26, P.skin); A.rect(18, 25, 19, 26, P.skin); // hands
  A.rect(7, 27, 11, 29, P.legs); A.rect(12, 27, 16, 29, P.legs2 || P.legs);
  A.rect(6, 29, 10, 30, P.shoe); A.rect(13, 29, 17, 30, P.shoe);
  A.rect(6, 30, 10, 30, P.sole); A.rect(13, 30, 17, 30, P.sole);
  A.ell(12, 10.5, 6.5, 6.2, P.skin);                            // face x6..17, y5..16
  for (const x of [8, 9, 14, 15]) for (const y of [10, 11]) A.px(x, y, P.eye);
  A.px(12, 12, P.skinShade); A.px(12, 13, P.skinShade);         // nose
}
const AVATAR = {};
AVATAR.warrior = () => { // Alteingesessene: grey-lilac perm, big glasses, Ballonseide suit, umbrella
  const A = avatarCanvas();
  const P = {skin: 'f0b99a', skinShade: 'c98672', eye: '231331', torso: '3fa6a0', arm: '3fa6a0', legs: '3fa6a0', shoe: 'f4f0ea', sole: 'b8b0a8'};
  A.ell(12, 8, 9.5, 7.5, (x, y) => ((x + 2 * y) % 4 === 0 ? 'efeaf8' : ((3 * x + y) % 5 === 0 ? '9a8fae' : 'cfc3dc')));
  avatarBase(A, P);
  A.ell(12, 5.2, 7.4, 2.9, (x, y) => ((x + 2 * y) % 4 === 0 ? 'efeaf8' : ((3 * x + y) % 5 === 0 ? '9a8fae' : 'cfc3dc'))); // curly fringe
  // glasses: thin dark lilac frames, light lenses, the eyes behind them
  for (const ox of [7, 13]) {
    A.rect(ox, 9, ox + 3, 12, '7a5a92'); A.rect(ox + 1, 10, ox + 2, 11, 'e4f2fa');
    A.px(ox + 1, 10, 'ffffff'); A.px(ox + 2, 11, '231331'); A.px(ox + 1, 11, '231331');
  }
  A.px(11, 10, '7a5a92'); A.px(12, 10, '7a5a92');
  A.rect(10, 14, 13, 14, 'a8645a');                               // stern mouth
  A.rect(7, 17, 16, 19, '7a4f9c'); A.rect(4, 18, 5, 19, '7a4f9c'); A.rect(18, 18, 19, 19, '7a4f9c'); // lilac yoke
  A.rect(9, 16, 14, 16, '7a4f9c');                                // collar
  A.rect(11, 17, 11, 26, 'f4f0ea');                               // white zip
  A.rect(6, 26, 17, 26, '2a716f');                                // rib hem
  A.rect(14, 20, 16, 25, '2a716f'); A.rect(18, 20, 19, 24, '2a716f'); // shade side
  A.rect(12, 27, 12, 29, '2a716f');
  A.rect(20, 22, 21, 22, 'a83a4a'); A.px(21, 23, 'a83a4a');         // bordeaux Stockschirm: crook
  A.rect(20, 23, 20, 30, '6a1c2a'); A.rect(20, 25, 21, 29, 'a83a4a'); A.px(21, 25, 'd05a68');
  return avatarFinish(A);
};
AVATAR.mage = () => { // Expat: mustard slouch beanie, round violet glasses, fleece vest, lanyard
  const A = avatarCanvas();
  const P = {skin: 'f2c4a4', skinShade: 'cc9078', eye: '1a1a28', torso: '4a5670', arm: '8fbf8a', legs: 'd9c3a0', legs2: 'a99273', shoe: 'f3efe6', sole: '7a4a2e'};
  A.ell(12, 11, 7.6, 6.5, '8a6440');                              // hair behind the face
  avatarBase(A, P);
  A.ell(12.5, 5, 8, 4.4, (x, y) => (x > 15 ? 'b08326' : ((x + y) % 4 === 0 ? 'f6d670' : 'e0b440'))); // beanie
  A.ell(18.5, 3, 3, 2.6, 'b08326');                                // slouch
  A.rect(5, 7, 18, 7, '8a6418');                                   // shadow line above the fold
  A.rect(5, 8, 18, 8, (x, y) => (x % 2 ? 'c8962a' : 'e0b440'));    // ribbed fold
  A.rect(6, 9, 6, 13, '8a6440'); A.rect(17, 9, 17, 13, '64462a');  // hair at the temples
  for (const ox of [7, 13]) { A.rect(ox, 9, ox + 3, 12, '3a2a4a'); A.rect(ox + 1, 10, ox + 2, 11, 'c28cff'); }
  A.px(11, 10, '3a2a4a'); A.px(12, 10, '3a2a4a');
  A.px(9, 11, '1a1a28'); A.px(15, 11, '1a1a28');                   // eyes behind violet lenses
  A.rect(11, 14, 12, 14, 'b86a60');                                // mouth
  A.rect(7, 16, 16, 17, '8fbf8a'); A.rect(8, 16, 15, 16, '5f8f63'); // hood around the neck
  A.rect(6, 18, 6, 26, '5f8f63'); A.rect(17, 18, 17, 26, '5f8f63'); // hoodie under the vest
  A.rect(18, 20, 19, 24, '5f8f63');
  A.rect(12, 18, 12, 26, '9aa4b4');                                // vest zip
  A.rect(14, 19, 16, 26, '36405a');
  A.px(10, 18, 'ff7eb0'); A.px(10, 19, 'ff7eb0'); A.px(11, 20, 'ff7eb0'); A.px(14, 18, 'ff7eb0'); A.px(13, 19, 'ff7eb0'); A.px(13, 20, 'ff7eb0');
  A.rect(11, 21, 13, 23, 'f3efe6'); A.rect(11, 23, 13, 23, '3fb3c6'); // badge
  return avatarFinish(A);
};
AVATAR.rogue = () => { // Tourist: sun hat, sunburnt nose, Hawaiian shirt, camera, belt bag, socks in sandals
  const A = avatarCanvas();
  const P = {skin: 'f4c3a0', skinShade: 'd08c78', eye: '1d1c2a', torso: '3fb3a6', arm: '3fb3a6', legs: 'c8b27c', legs2: '9c8858', shoe: 'fbf8f0', sole: '8a5a3a'};
  A.ell(12, 10, 7, 6, '7a5030');
  avatarBase(A, P);
  A.rect(8, 1, 15, 5, (x, y) => (x < 10 ? 'fff8e0' : 'f2e2b0')); A.clear(8, 1); A.clear(15, 1);
  A.rect(8, 5, 15, 5, 'e2524e');                                  // hat band
  A.rect(2, 6, 21, 6, 'f2e2b0'); A.rect(3, 7, 20, 7, 'c9b27a');  // brim
  A.rect(6, 8, 6, 11, '7a5030'); A.rect(17, 8, 17, 11, '5a3820');
  A.px(12, 12, 'ef6f6a'); A.px(12, 13, 'ef6f6a'); A.px(11, 13, 'ef6f6a'); // sunburnt nose
  A.px(7, 13, 'f09a88'); A.px(16, 13, 'f09a88');
  A.rect(11, 14, 13, 14, 'b8645a');
  // Hawaiian shirt flowers, fixed pattern
  for (let y = 17; y <= 26; y++) for (let x = 4; x <= 19; x++) {
    if (!A.g[y][x] || A.g[y][x] !== '3fb3a6') continue;
    const k = (x * 5 + y * 3) % 9;
    if (k === 0) A.px(x, y, 'ff8fb3'); else if (k === 4) A.px(x, y, 'ffb04a'); else if (k === 7) A.px(x, y, 'fbf8f0');
    else if (x >= 15 || x >= 18) A.px(x, y, '2a7f79');
  }
  A.rect(9, 16, 14, 16, 'f4c3a0'); A.px(10, 17, 'f4c3a0'); A.px(13, 17, 'f4c3a0'); // open collar
  A.px(8, 17, '2a2830'); A.px(9, 18, '2a2830'); A.px(15, 17, '2a2830'); A.px(14, 18, '2a2830'); // camera strap
  A.rect(9, 19, 14, 21, '3a3a44'); A.rect(11, 19, 12, 20, '2f6fc4'); A.px(10, 19, 'd0ccc4'); // camera
  A.rect(8, 24, 15, 25, 'ff9a3c'); A.rect(8, 25, 15, 25, 'c8661e'); A.px(12, 24, 'fbf8f0'); // belt bag
  A.rect(7, 26, 16, 27, 'c8b27c'); A.rect(12, 26, 16, 27, '9c8858'); // shorts
  A.rect(7, 28, 10, 28, 'f4c3a0'); A.rect(13, 28, 16, 28, 'f4c3a0'); // shins
  A.clear(11, 28); A.clear(12, 28); A.clear(11, 29); A.clear(12, 29);
  A.rect(7, 29, 10, 29, 'fbf8f0'); A.rect(13, 29, 16, 29, 'fbf8f0'); // white socks
  return avatarFinish(A);
};
AVATAR.huntress = () => { // Zugezogene: aubergine mullet with fringe, cord jacket, sherpa collar, jute bag
  const A = avatarCanvas();
  const P = {skin: 'e9b08e', skinShade: 'bb7f67', eye: '1f1a2b', torso: 'a4672f', arm: 'a4672f', legs: '5876b4', legs2: '3d5588', shoe: 'fbf6ea', sole: '6d5b6c'};
  A.ell(12, 9, 8.5, 7.5, '4a2e45'); A.rect(4, 12, 7, 19, '4a2e45'); A.rect(16, 12, 19, 19, '4a2e45'); // mullet
  avatarBase(A, P);
  A.ell(12, 5, 7.6, 3.4, (x, y) => ((x + y) % 5 === 0 ? '7c4a6a' : '4a2e45'));  // crown and fringe
  A.rect(6, 7, 17, 8, (x, y) => (y === 8 && x % 3 === 1 ? null : '4a2e45'));
  for (let x = 6; x <= 17; x++) if (x % 3 === 1) A.px(x, 8, 'e9b08e');
  A.px(7, 13, 'ef7f97'); A.px(16, 13, 'ef7f97');                  // blush
  A.px(5, 14, '46b3a6');                                          // earring
  A.rect(11, 14, 12, 14, 'b8604e');
  // cord jacket with ribs, cream sherpa collar, turquoise top with a pink stripe
  for (let y = 17; y <= 26; y++) for (let x = 4; x <= 19; x++) if (A.g[y][x] === 'a4672f') A.px(x, y, x % 2 ? '8a5528' : (x >= 15 ? '8a5528' : 'a4672f'));
  A.rect(8, 16, 15, 17, 'f4e6c8'); A.rect(7, 17, 8, 19, 'f4e6c8'); A.rect(15, 17, 16, 19, 'f4e6c8');
  A.rect(10, 18, 13, 25, '46b3a6'); A.rect(10, 21, 13, 21, 'ef7f97'); A.rect(10, 23, 13, 23, 'f4e6c8');
  A.px(9, 18, '8a5528'); A.px(14, 18, '8a5528');
  A.px(15, 20, 'd8c08c'); A.px(16, 21, 'd8c08c'); A.px(17, 22, 'd8c08c'); // bag strap
  A.rect(16, 23, 21, 28, 'd8c08c'); A.rect(16, 28, 21, 28, 'a88d5e');   // jute bag
  A.px(17, 25, 'e0434e'); A.px(19, 25, 'e0434e'); A.rect(17, 26, 19, 26, 'e0434e'); A.px(18, 27, 'e0434e'); A.px(18, 25, 'e0434e');
  return avatarFinish(A);
};
BUILD.avatars = () => {
  const S = sheet('avatars', 24, 32);
  ['warrior', 'mage', 'rogue', 'huntress'].forEach((cls, f) => {
    const grid = AVATAR[cls]();
    S.clear(f);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 24; x++) if (grid[y][x]) S.put(f, x, y, grid[y][x]);
  });
  return S;
};


// ================================================================ Pappaufsteller (ninja_log.png)
// SmokeBomb.NinjaLogSprite: TextureFilm 11x12, frame 0 idle, 1-4 die. actors_de: a life-size
// cardboard standee of the Tourist, thumbs up. Redrawn: sun hat with red band, sunburnt nose,
// Hawaiian shirt, khaki shorts, all on a cardboard cut-out with a brown edge and a fold-out
// stand. Death: it tips over (1-2) and lies flat (3-4).
const LOG_PAL = {
  c: '7a5530', C: 'a27a44', b: 'c9a266',               // cardboard edge, board, stand
  T: 'f2e2b0', t: 'c9b27a', R: 'e2524e',               // sun hat, brim shade, band
  H: '7a5030', K: 'f4c3a0', k: 'd08c78', E: '1d1c2a', U: 'ef6f6a',
  S: '3fb3a6', s: '2a7f79', F: 'ff8fb3', G: 'ffb04a', P: 'c8b27c',
};
const LOG_STAND = [
  '...cTTTc...',
  '..cTRRRTc..',
  'cTTTTTTTTTc',
  '.cHKEKKEKc.',
  '.cHKKKUKKcK',
  '..ckKKKkcKc',
  '.cSSFSSGSKc',
  '.cSSSSSFSsc',
  '.cSGSSFSSsc',
  '.cPPPPPPPPc',
  '.ccccccccc.',
  '...b...b...',
];
BUILD.ninja_log = () => {
  const S = sheet('ninja_log', 11, 12);
  S.draw(0, LOG_STAND, LOG_PAL);
  // tipping over: shear the standee towards the right, the top moves most
  const shear = k => LOG_STAND.map((row, y) => {
    const sh = Math.round((11 - y) * k); return ('.'.repeat(sh) + row).slice(0, 11);
  });
  S.draw(1, shear(0.18), LOG_PAL);
  S.draw(2, ['...........', '...........', ...shear(0.3).slice(0, 10)], LOG_PAL);
  const flat = ['...........', '...........', '...........', '...........', '...........', '...........', '...........', '...........',
    '...........', '..........', 'cTTHKSSSPPc', 'cCCCCCCCCCc'].map(r => r.padEnd(11, '.'));
  S.draw(3, flat.map((r, y) => (y >= 9 ? flat[y + 1] || '...........' : r)).slice(0, 11).concat(['...b...b...']), LOG_PAL);
  S.draw(4, flat, LOG_PAL);
  return S;
};

// ================================================================ Überwachungsmast-Wächter (wards.png)
// WardSprite: fixed uvRects, tier 1 (0,0)-(9,10), 2 (10,0)-(21,12), 3 (22,0)-(37,16),
// 4 (38,0)-(44,13), 5 (45,0)-(51,15), 6 (52,0)-(60,15). actors_de/items_de: the wand is an
// "Überwachungsmast" with a violet camera lens; wards are fired from it. Tiers 1-3 become
// small CCTV cameras on a post (bigger per tier, tier 3 with two cameras); tiers 4-6
// (Schildwachen) "resemble the gem on top of your mast" and stay violet crystals.
const WARD_PAL = {o: '2a2238', G: 'd4d6de', g: '9096a4', M: '5c5c6c', m: '3c3c4a', L: 'b040ff', l: 'f0c8ff', R: 'ff3050'};
const WARD_ART = [
  [0, 0, 9, 10, [
    '.........',
    '.oooooo..',
    'oGGGGGGo.',
    'oGGGGGGLo',
    'oggggggLo',
    '.oooooo..',
    '...oMo...',
    '...oMo...',
    '..oMMMo..',
    '..ooooo..']],
  [10, 0, 11, 12, [
    '...........',
    '.ooooooo...',
    'oGGGGGGGo..',
    'oGRGGGGGGo.',
    'oGGGGGGGLlo',
    'ogggggggLLo',
    '.ooooooooo.',
    '....oMo....',
    '....oMo....',
    '....oMo....',
    '...oMMMo...',
    '...ooooo...']],
  [22, 0, 15, 16, [
    '...............',
    '.oooooo........',
    'oGGGGGGo.......',
    'oGRGGGGLo......',
    'oggggggLo......',
    '.oooooooo......',
    '.....ooMo.ooooo',
    '.....oMMooGGGGo',
    '.....oMo.oLGGGo',
    '.....oMoooLgggo',
    '.....oMMMMooooo',
    '.....oMo.......',
    '.....oMo.......',
    '.....oMo.......',
    '....oMMMo......',
    '....ooooo......']],
];
BUILD.wards = () => {
  const S = sheet('wards', 64, 16);
  for (const [x0, y0, w, h, rows] of WARD_ART) {
    if (rows.length !== h || rows.some(r => r.length !== w)) throw new Error('wards: bad art size at x ' + x0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * S.src.w + x0 + x) * 4, ch = rows[y][x];
      if (ch === '.') S.out.px.fill(0, i, i + 4); else S.out.px.set(col(WARD_PAL[ch]), i);
    }
  }
  return S;
};

// ================================================================ Geistertaube (spirit_hawk.png)
// SpiritHawk.HawkSprite: TextureFilm 15x15, idle 0,1, attack 2,3, die 4,5,6. actors_de: a
// magical city pigeon glowing in ghostly blue. Silhouette stays; the body becomes pigeon
// blue-grey, the neck gets the green-violet pigeon shimmer, the eyes turn orange and the
// black talons become pink pigeon feet.
BUILD.spirit_hawk = () => {
  const S = sheet('spirit_hawk', 15, 15);
  const frames = range(0, 6);
  S.remap(frames, {'2364bc': '5a78b8', '00ffff': 'ff9a3a', '000000': 'e87a90', '350abc': '3a3a8a', '26058c': '2a2a6a'});
  for (const f of frames) {
    const eyes = S.find(f, '00ffff');
    if (!eyes.length) continue;
    const ey = Math.max(...eyes.map(e => e[1])), xs = eyes.map(e => e[0]);
    // neck shimmer: body pixels in the two rows under the eyes, alternating green and violet
    for (let y = ey + 1; y <= ey + 1; y++) for (let x = Math.min(...xs) - 1; x <= Math.max(...xs) + 1; x++)
      if (S.get(f, x, y) === '2364bc') S.set(f, x, y, (x + y) % 2 ? '3ad8b0' : 'b070ff');
  }
  return S;
};

// ================================================================ Faulbeere (rot_heart.png, rot_lasher.png)
// RotHeartSprite 16x16 (0 idle, 1-7 dying), RotLasherSprite 12x16 (0 idle, 1-2 attack, 3-6
// die). actors_de: the heart is inventoried as "Zimmerpflanze, Kat. B", the lashers pose as
// harmless office plants. Both now stand in terracotta office-plant pots; the heart gets a
// white inventory sticker.
const POT = {p: '8a3e22', P: 'c0643a', q: 'e08a5a', w: 'f4f2ea', k: '3a3a3a'};
BUILD.rot_heart = () => {
  const S = sheet('rot_heart', 16, 16);
  for (const f of range(0, 7)) {
    S.stamp(f, 3, 12, ['pqPPPPPPPPp', '.pPPPPPPPp.', '.ppppppppp.'], POT);
    S.stamp(f, 3, 9, ['ww', 'wk'], POT);                      // inventory sticker
  }
  return S;
};
BUILD.rot_lasher = () => {
  const S = sheet('rot_lasher', 12, 16);
  for (const f of range(0, 6)) S.stamp(f, 2, 13, ['pqPPPPPp', '.pPPPPp.', '.ppppp p'.replace(' ', 'p')], POT);
  return S;
};

// ================================================================ Kanalpiranha (piranha.png)
// PiranhaSprite 12x16: row 0 frames 0-14 = Kanalpiranha, row 1 = Phantom-Kanalpiranha (kept).
// The ocean blue becomes murky canal olive with rust fins; the red gills, eye and teeth stay.
BUILD.piranha = () => {
  const S = sheet('piranha', 12, 16);
  const canal = ramp([[20, '1e2414'], [45, '34401e'], [75, '56642e'], [110, '7a8648'], [150, 'a0a870']]);
  S.remap(range(0, 14), c => {
    const [r, g, b] = rgb(c);
    if (c === '1e3168' || c === '5770a3') return c === '1e3168' ? '5a2a14' : '9a5a2a'; // fins: rust
    if (b > r + 20) return canal(c);
    return null;
  });
  return S;
};

// ================================================================ Schaf (sheep.png)
// SheepSprite 16x15, frames 0-3. The magic sheep is a "Pilotphase" of the Grünflächenamt:
// it gets a yellow official ear tag on both ears, otherwise unchanged.
BUILD.sheep = () => {
  const S = sheet('sheep', 16, 15);
  for (const f of range(0, 3)) { S.set(f, 0, 6, 'f2c418'); S.set(f, 7, 6, 'f2c418'); S.set(f, 7, 7, 'b08a10'); }
  return S;
};

// ================================================================ run
const only = (() => { const i = argv.indexOf('--only'); return i >= 0 ? argv[i + 1].split(',') : Object.keys(BUILD); })();
const pi = argv.indexOf('--preview'), previewDir = pi >= 0 ? path.resolve(argv[pi + 1]) : null;
const results = [];
for (const name of only) {
  if (!BUILD[name]) throw new Error('unknown sheet ' + name);
  const S = BUILD[name]();
  if (S.out.w !== S.src.w || S.out.h !== S.src.h) throw new Error(name + ': size changed');
  // drawn frames: hard alpha only; nothing may leak outside the used frame grid
  for (const f of S.drawn) for (let y = 0; y < S.fh; y++) for (let x = 0; x < S.fw; x++) {
    const a = S.out.px[S.i(f, x, y) + 3]; if (a !== 0 && a !== 255 && !S.softAlpha) throw new Error(name + ' frame ' + f + ': soft alpha at ' + x + ',' + y);
  }
  const png = encodePNG(S.out);
  if (Buffer.compare(decodePNG(png).px, S.out.px) !== 0) throw new Error(name + ': PNG round trip mismatch');
  fs.writeFileSync(path.join(SPRITES, name + '.png'), png);
  let changed = 0; for (let i = 0; i < S.src.px.length; i += 4) if (S.src.px.readUInt32BE(i) !== S.out.px.readUInt32BE(i)) changed++;
  console.log(name + '.png  ' + S.src.w + 'x' + S.src.h + '  frame ' + S.fw + 'x' + S.fh + '  ' + changed + ' px changed');
  results.push(S);
}

// ---------------------------------------------------------------- previews (x8, upstream row above new row)
if (previewDir) {
  fs.mkdirSync(previewDir, {recursive: true});
  const Z = 8, gap = 4;
  const canvas = (w, h) => { const c = {w, h, px: Buffer.alloc(w * h * 4)}; for (let i = 0; i < w * h; i++) c.px.writeUInt32BE(0x202028ff, i * 4); return c; };
  const blit = (dst, img, sx, sy, w, h, dx, dy, light) => {
    for (let y = 0; y < h * Z; y++) for (let x = 0; x < w * Z; x++) {
      const X = dx + x, Y = dy + y; if (X >= dst.w || Y >= dst.h) continue;
      const i = ((sy + (y / Z | 0)) * img.w + sx + (x / Z | 0)) * 4, a = img.px[i + 3] / 255, q = (Y * dst.w + X) * 4;
      const bg = ((((sx * Z + x) / Z | 0) + ((sy * Z + y) / Z | 0)) & 1) ? [58, 56, 52] : [70, 68, 63];
      // light = additive blending like GhostSprite (Blending.setLightMode)
      for (let k = 0; k < 3; k++) dst.px[q + k] = light ? Math.min(255, Math.round(bg[k] + img.px[i + k] * a)) : Math.round(img.px[i + k] * a + bg[k] * (1 - a));
      dst.px[q + 3] = 255;
    }
  };
  const usedFrames = S => { let n = 0; for (let f = 0; f < S.per * Math.floor(S.src.h / S.fh); f++) for (let y = 0; y < S.fh; y++) for (let x = 0; x < S.fw; x++) { const i = S.i(f, x, y); if (S.src.px[i + 3] || S.out.px[i + 3]) n = f + 1; } return n; };
  for (const S of results) {
    const n = usedFrames(S), cols = Math.min(n, S.per), rows = Math.ceil(n / cols);
    const cw = S.fw * Z + gap, rh = 2 * (S.fh * Z + gap) + 10;
    const c = canvas(cols * cw, rows * rh);
    for (let f = 0; f < n; f++) {
      const sx = (f % S.per) * S.fw, sy = Math.floor(f / S.per) * S.fh, dx = (f % cols) * cw, dy = Math.floor(f / cols) * rh;
      blit(c, S.src, sx, sy, S.fw, S.fh, dx, dy, S.light);
      blit(c, S.out, sx, sy, S.fw, S.fh, dx, dy + S.fh * Z + gap, S.light);
    }
    fs.writeFileSync(path.join(previewDir, S.name + '-x8.png'), encodePNG(c));
  }
  console.log('previews in ' + previewDir);
}

