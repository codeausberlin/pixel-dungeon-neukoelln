// Kiez-Items: redraws item icons in sprites/items.png as original Neukölln pixel art.
// Pure Node (zlib via tools/lib/tileset-kit.cjs), no npm, no randomness: every run writes a
// byte-identical PNG.
//
//   node tools/generate-kiez-items.cjs                 write sprites/items.png
//   node tools/generate-kiez-items.cjs --preview DIR   also write before/after previews
//   node tools/generate-kiez-items.cjs --check         only verify, write nothing
//
// Order: this script first runs tools/generate-mietvertrag.cjs (which rebuilds items.png
// from the upstream atlas plus the lease in cell AMULET and writes sprites/amulet.png),
// then reads that result and draws every Kiez icon on top. The AMULET cell is never touched
// here. So "generate-kiez-items.cjs" alone always gives the complete result; running
// generate-mietvertrag.cjs on its own afterwards resets items.png to upstream + lease, and
// generate-kiez-items.cjs has to be run again (see docs/NEUKOELLN-ART-ITEMS.md).
//
// Atlas contract (ItemSpriteSheet.java, read-only): 256x512, 16x16 cells. Cell indices and
// assignItemRect() sizes are parsed from the Java file; every icon must stay inside its
// rect (checked, the script aborts otherwise). Cells that are not redrawn stay upstream.
//
// Style: Shattered item style. Every icon is an ASCII map; '.' is transparent. After
// drawing, a 1px outline of black at alpha 102 (0x66) is added around the silhouette in
// the 8-neighbourhood, exactly like the upstream items. 2-3 tones per material.
//
// Identification: potions, exotic potions, scrolls, exotic scrolls and seeds are built from
// templates. Their identifying colour (potions, seeds) is read per cell from the upstream
// icon, their rune (scrolls) is extracted per cell as the difference to the blank parchment
// (majority vote over the 12 scrolls), so every unidentified item stays as distinct as in
// the original.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {decodePNG, encodePNG, rgb, hex, lum} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const ITEMS = 'core/src/main/assets/sprites/items.png';
const SHEET_JAVA = 'core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/sprites/ItemSpriteSheet.java';
const UPSTREAM_REV = 'e87a4a7'; // first fork commit; items.png there is unmodified Shattered v4.0.0
const argv = process.argv.slice(2);
const OUTLINE = [0, 0, 0, 102];

// ================================================================ ItemSpriteSheet.java
function parseSheet() {
  let src = fs.readFileSync(path.join(ROOT, SHEET_JAVA), 'utf8');
  src = src.slice(0, src.indexOf('public static class Icons'));
  const val = {}, rect = {};
  const ev = e => {
    e = e.replace(/\s+/g, '');
    let m = e.match(/^xy\((\d+),(\d+)\)$/); if (m) return (+m[1] - 1) + 16 * (+m[2] - 1);
    m = e.match(/^([A-Z_0-9]+)\+(\d+)$/); if (m) return val[m[1]] + +m[2];
    throw new Error('cannot evaluate ' + e);
  };
  const stmts = [];
  for (const m of src.matchAll(/static final int ([A-Z_0-9]+)\s*=\s*([^;]+);/g)) stmts.push({i: m.index, k: 'c', m});
  for (const m of src.matchAll(/assignItemRect\(\s*([A-Z_0-9]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)) stmts.push({i: m.index, k: 'r', m});
  for (const m of src.matchAll(/for\s*\(int i = ([A-Z_0-9]+); i < ([A-Z_0-9]+)\+(\d+); i\+\+\)\s*assignItemRect\(i,\s*(\d+),\s*(\d+)\)/g)) stmts.push({i: m.index, k: 'l', m});
  stmts.sort((a, b) => a.i - b.i);
  for (const {k, m} of stmts) {
    if (k === 'c') { if (m[1] !== 'SIZE' && !m[1].startsWith('TX_') && m[1] !== 'WIDTH') val[m[1]] = ev(m[2]); }
    else if (k === 'r') rect[val[m[1]]] = [+m[2], +m[3]];
    else for (let i = val[m[1]]; i < val[m[2]] + +m[3]; i++) rect[i] = [+m[4], +m[5]];
  }
  return {val, rect};
}
const SHEET = parseSheet();
const cellOf = name => { const v = SHEET.val[name]; if (v === undefined) throw new Error('unknown sprite ' + name); return v; };

// ================================================================ palette
// Global colour keys; icons may override single keys. 8 hex digits = with alpha.
const PAL = {
  K: '1d1b22', k: '3a3844', g: '66646e', G: '9a98a2', s: 'c9c8cf', W: 'f4f3ee',
  b: '4a2c16', n: '7a4a22', N: 'a8703a', M: 'd29c5c',
  r: '7a1c1c', R: 'c33a2c', p: 'ec6a4c', P: 'f6aa92',
  y: '8c6410', Y: 'd9a922', L: 'f8e27a',
  e: '1f5a2c', E: '3c8c3c', l: '86cc62',
  u: '1c2e6a', U: '3460bc', i: '82b0ea',
  t: '155c5c', T: '2c9a90', j: '92e2d2',
  v: '3c2658', V: '7c4cb2', w: 'bc96e2',
  a: '8a3c0a', A: 'd86c1a', q: 'f8aa4a',
  c: 'c9b98f', C: 'f2eacb', d: '9a8a66',
  z: '2e2d36', Z: '55545e', h: 'efc9a4', H: 'c0906e',
  m: 'e05a9a', x: '9c2a64',
};

// ================================================================ canvas helpers
function makeAtlas(buf) { const img = decodePNG(buf); if (img.w !== 256 || img.h !== 512) throw new Error('items.png must be 256x512'); return img; }
function cellXY(cell) { return [(cell % 16) * 16, (cell >> 4) * 16]; }
function getPx(img, x, y) { const i = (y * img.w + x) * 4; return [img.px[i], img.px[i + 1], img.px[i + 2], img.px[i + 3]]; }
function setPx(img, x, y, c) { const i = (y * img.w + x) * 4; img.px[i] = c[0]; img.px[i + 1] = c[1]; img.px[i + 2] = c[2]; img.px[i + 3] = c.length > 3 ? c[3] : 255; }
const col = h => h.length === 8 ? [...rgb(h), parseInt(h.slice(6), 16)] : [...rgb(h), 255];

// Renders an ASCII map (rows of equal length) into a 16x16 RGBA grid, with auto outline.
function render(rows, pal = {}, {outline = true} = {}) {
  const P = {...PAL, ...pal};
  const g = Array.from({length: 16}, () => Array(16).fill(null));
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    if (ch === 'o') { g[y][x] = OUTLINE; return; }
    const v = P[ch]; if (!v) throw new Error('no colour for key ' + ch);
    g[y][x] = Array.isArray(v) ? (v.length > 3 ? v : [...v, 255]) : col(v);
  }));
  if (outline) addOutline(g);
  return g;
}
// Adds the upstream-style outline (OUTLINE colour) around every filled, non-outline pixel.
function addOutline(g) {
  const add = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (g[y][x]) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && xx >= 0 && yy < 16 && xx < 16 && g[yy][xx] && g[yy][xx] !== OUTLINE) { near = true; break; }
    }
    if (near) add.push([x, y]);
  }
  for (const [x, y] of add) g[y][x] = OUTLINE;
  return g;
}

const drawn = new Map(); // cell -> {name, grid}
// If the outlined icon pokes out of its assignItemRect on the right/bottom, it is moved
// left/up as far as needed (never beyond the cell's top-left corner); if it is simply too
// big for the rect, the script stops.
function fit(name, g, w, h) {
  // outline pixels may be pushed off the top/left edge of the cell (they are dropped),
  // filled pixels may not
  let x1 = -1, y1 = -1, x0 = 16, y0 = 16;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g[y][x]) {
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    if (g[y][x] !== OUTLINE) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); }
  }
  const dx = Math.max(-x0, Math.min(0, w - 1 - x1)), dy = Math.max(-y0, Math.min(0, h - 1 - y1));
  if (!dx && !dy) return g;
  const n = Array.from({length: 16}, () => Array(16).fill(null));
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++)
    if (g[y][x] && y + dy >= 0 && x + dx >= 0) n[y + dy][x + dx] = g[y][x];
  return n;
}
function put(name, rows, pal, opts) {
  putGrid(name, render(rows, pal, opts));
}
function putGrid(name, g) {
  const cell = cellOf(name), [w, h] = SHEET.rect[cell];
  g = fit(name, g, w, h);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++)
    if (g[y][x] && (x >= w || y >= h)) throw new Error(`${name}: pixel (${x},${y}) outside rect ${w}x${h}`);
  if (drawn.has(cell)) throw new Error('cell drawn twice: ' + name);
  drawn.set(cell, {name, grid: g});
}

// ================================================================ icons
// Categories are only for the documentation and the preview sheet.
const CATEGORY = {};
const cat = (c, ...names) => names.forEach(n => { CATEGORY[n] = c; });

// ---------------------------------------------------------------- a) start items
cat('a) Start-Items', 'WORN_SHORTSWORD', 'MAGES_STAFF', 'DAGGER', 'GLOVES', 'SPIRIT_BOW', 'ARTIFACT_CLOAK', 'SEAL',
  'ARMOR_CLOTH', 'RATION', 'OVERPRICED', 'THROWING_STONE', 'THROWING_KNIFE', 'WATERSKIN', 'BACKPACK');

// Verbogene Gardinenstange (class emblem art, Alteingesessene start weapon): thick brass rod
// with ball finials, kinked in the middle, two curtain rings with a scrap of lace hanging off
put('WORN_SHORTSWORD', [
  '.............',
  '.........LY..',
  '........LYYy.',
  '........YYy..',
  '.......YYy...',
  '......YYyo...',
  '.....YYy.o...',
  '....YYy.WCW..',
  '....YYy.CWC..',
  '...YYy..WCW..',
  '..LYy....W...',
  '..yy.........',
], {Y: 'e0b030', L: 'fff09a', y: '9a6c10', o: '8a6410', W: 'f8f6f0', C: 'd8d4c8'});
// Magischer Selfie-Stick (Expat class emblem): telescopic pole with a black foam grip and wrist
// strap, a big portrait phone in the clamp, glowing screen. The class icon cuts the top 2 rows,
// so the phone starts at row 2; the staff particles (emitter 12.5/3) leave the screen.
put('MAGES_STAFF', [
  '...............',
  '...............',
  '.........KKKKK.',
  '......j..KjWjK.',
  '.....jWj.KjjiK.',
  '......j..KijjK.',
  '.........KjjjK.',
  '.........KKKKK.',
  '.........sGs...',
  '........Gs.....',
  '.......Gs......',
  '......Gs.......',
  '.....Gs........',
  '...zzG.........',
  '..zzz..........',
  '..k.k..........',
], {j: '8af0ff', i: 'c8f8ff', K: '1d1b22', z: '3a3844', k: '66646e'});
// Taschenmesser (Tourist start weapon): red pocket knife, open blade and bottle opener, rivets
put('DAGGER', [
  '............',
  '.........sW.',
  '........sWG.',
  '.......sWG..',
  '......sWG...',
  '.....sWG....',
  '....gGGs....',
  '...RRRgGs...',
  '..RpRRR.Gs..',
  '.RpRsRR.....',
  '.RRRRr......',
  '..rrr.......',
], {R: 'd02c2c', p: 'f06a5a', r: '8a1616'});
// Spülhandschuhe: yellow rubber glove, rolled cuff
put('GLOVES', [
  '............',
  '....L.L.....',
  '...LYLYLY...',
  '...LYLYLY...',
  '...LYLYLYY..',
  '.L.LYyYyYy..',
  '.LYLYYYYYy..',
  '..LYYYYYYy..',
  '..LYYYYYYy..',
  '...YYYYYYy..',
  '...YYYYYy...',
  '...yYYYYy...',
  '...LLLLLL...',
  '...YYYYYy...',
  '...yyyyyy...',
], {Y: 'f0d030', L: 'fff28a', y: 'b89410'});
// Upcycling-Bogen (Zugezogene class emblem): parquet limbs with dark plank seams, grip wrapped
// in black bike inner tube with a round bicycle bell, pale blue glowing string
put('SPIRIT_BOW', [
  '................',
  '.MNb............',
  '.jMNMb..........',
  '..j.bNMb........',
  '...j...MNb......',
  '....j....NM.....',
  '.....j....bN....',
  '......j...kkYs..',
  '.......j..kksW..',
  '........j.kkGs..',
  '.........j.bN...',
  '..........j.MN..',
  '...........jNb..',
  '............jMN.',
  '.............bM.',
  '................',
], {j: 'a8e8ff', M: 'd8a060', N: 'b07a3a', b: '6a4020', k: '26262e', Y: 'f0c830'});
// Poncho der Schatten (Tourist class emblem): yellow stadium rain poncho, hood up with the face
// in shadow, drawstring, and the tourist's camera on the chest
put('ARTIFACT_CLOAK', [
  '.........',
  '....Y....',
  '...YYY...',
  '..YhhhY..',
  '..YkhkY..',
  '..yHhHy..',
  '..YsYsY..',
  '.YLYsYYy.',
  '.YLkkkky.',
  '.YLkiGky.',
  '.YYkkkky.',
  '.YYYYYYy.',
  '.YLYYYyy.',
  '.yyyyyyy.',
], {Y: 'f4d23a', L: 'fff4a8', y: 'b8940e', k: '26262e', s: '8a8a98', i: '6a8ee8', G: 'c9c8cf', h: 'efc9a4', H: 'c0906e'});
// Kiez-Aufnäher (Alteingesessene class emblem): round Kreisliga patch, green field, football,
// yellow stitched border, frayed and torn at the bottom right with loose threads
put('SEAL', [
  '.............',
  '....YyYyY....',
  '...yEEEEEy...',
  '..YEEWkWEEY..',
  '.yEEkWWWkEEy.',
  '.YEWWkkkWWEY.',
  '.yEWWkkkWWEy.',
  '.YEkWWWWWkEY.',
  '.yEEWWkWWEEy.',
  '..YEEWWWEE...',
  '...yEEEEE.t..',
  '....YyYy..t..',
], {E: '2e7a3a', Y: 'f0c830', y: 'b08a10', W: 'f4f3ee', k: '26262e', t: 'f0c830'});
// Hoodie: heather grey, hood, drawstrings, kangaroo pocket
put('ARMOR_CLOTH', [
  '...............',
  '....ZZZZZZZ....',
  '..ZZZzKKKzZZZ..',
  '.ZZZZZzKzZZZZZ.',
  '.ZZZZZsZsZZZZZ.',
  '.ZZzZZsZsZZzZZ.',
  '.ZZzZZZZZZZzZZ.',
  '.ZzzZzzzzzZzzZ.',
  '.ssoZzZZZzZoss.',
  '....ZZZZZZZ....',
  '....zzzzzzz....',
], {Z: '8c8b96', z: '66656f', s: 'd6d5dc', K: '2a2932'});
// Souvenir-Brieföffner (Writers Room: "Fernsehturm-Griff"): steel blade, concrete tower
// shaft as the handle, the silver sphere with a light-blue glint and the red-white antenna
// tip at the end. Same diagonal as upstream, so the thrown sprite still flies blade first.
put('THROWING_KNIFE', [
  '............',
  '.........sW.',
  '........sWG.',
  '.......sWG..',
  '......sWG...',
  '.....dCd....',
  '....Cd......',
  '...Cd.......',
  '..sWs.......',
  '.sWisG......',
  '.GssG.......',
  '.RgG........',
  '.W..........',
], {C: 'e6e2d8', d: 'a8a49a', i: 'b8e0f8', R: 'd83a2c'});
// Jutebeutel: natural jute tote with long handles and a red heart print
put('BACKPACK', [
  '................',
  '....cc....cc....',
  '...c..c..c..c...',
  '...c..c..c..c...',
  '...c..c..c..c...',
  '..cCCCCCCCCCCd..',
  '..cCCCCCCCCCCd..',
  '..cCCRRCRRCCCd..',
  '..cCCRRRRRCCCd..',
  '..cCCCRRRCCCCd..',
  '..cCCCCRCCCCCd..',
  '..cCCCCCCCCCCd..',
  '..cCCCCCCCCCCd..',
  '..dddddddddddd..',
]);

// ---------------------------------------------------------------- b) armour
cat('b) Rüstungen', 'ARMOR_LEATHER', 'ARMOR_MAIL', 'ARMOR_SCALE', 'ARMOR_PLATE', 'ARMOR_WARRIOR', 'ARMOR_MAGE',
  'ARMOR_ROGUE', 'ARMOR_HUNTRESS');

// Lederjacke: black-brown biker jacket, lapels, diagonal silver zip, worn elbows
put('ARMOR_LEATHER', [
  '..............',
  '....bNMMNb....',
  '..nNNbMNsbNn..',
  '.nNNNNbNsNNNn.',
  '.nNNNNNNsNNNn.',
  '.nMbNNNsNNbMn.',
  '.nNbNNNsNNbNn.',
  '.nNbNNNsNNbNn.',
  '.nNbNNsNNNbNn.',
  '.ssbNNsNNNbss.',
  '...bbbbbbbb...',
], {N: '5e4232', n: '432e22', M: '8a6a52', b: '2c1d15'});
// Bomberjacke: sage-green bomber, orange lining at the collar, ribbed cuffs and hem
put('ARMOR_MAIL', [
  '..............',
  '....kqAAqk....',
  '..EEEkqqkEEE..',
  '.EEEEEksEEEEE.',
  '.EEEEEEsEEEEE.',
  '.ElEEEEsEEElE.',
  '.EeEEEEsEEEeE.',
  '.EeEEEEsEEEeE.',
  '.keEEEEsEEEek.',
  '.kk.kkkkkkk.k.',
  '....kgkgkgk...',
], {E: '707c42', e: '525c2e', l: '96a462', k: '3a4020', g: '5a6236'});
// Funktionsjacke: teal outdoor shell, hood collar, reflective chest pockets
put('ARMOR_SCALE', [
  '..............',
  '...tTTTTTt....',
  '..TTtTjTtTT...',
  '.TTTTTkTTTTT..',
  '.TjsTTkTTsjT..',
  '.TTTTTkTTTTT..',
  '.TtTTTkTTTtT..',
  '.TtTTTkTTTtT..',
  '.ktttttttttk..',
  '..............',
], {T: '2aa0a0', t: '1a7272', j: '88e0d6', k: '103c42', s: 'd8f0f0'});
// Türsteherweste: black stab vest, grey plates, white chest band
put('ARMOR_PLATE', [
  '............',
  '...Z....Z...',
  '..ZZZ..ZZZ..',
  '.ZZGZZZZGZZ.',
  '.ZGGGZZGGGZ.',
  '.WWWWWWWWWW.',
  '.ZGGGZZGGGZ.',
  '.ZGGGZZGGGZ.',
  '.ZZZZZZZZZZ.',
  '.zzzzzzzzzz.',
  '............',
], {Z: '4a4a54', z: '2e2e36', G: '7a7a86', W: 'e8e8ec'});
// Ballonseiden-Anzug: colour-blocked shell suit jacket, purple/teal with a pink zigzag
put('ARMOR_WARRIOR', [
  '............',
  '...VwVVwV...',
  '..VVVwWVVV..',
  '.VVVVVWVVVV.',
  '.VVmVVWVmVV.',
  '.VmTmTWmTmV.',
  '.TTTTTWTTTT.',
  '.TTTTTWTTTT.',
  '.WWtttWtttW.',
  '...VVVVVV...',
  '............',
], {V: '7a3ab0', w: 'b890e0', T: '28a8a0', t: '1a7a74', m: 'f060a8', W: 'eeeef4'});
// Gründer-Fleeceweste: navy fleece vest over a light blue shirt, lanyard and badge
put('ARMOR_MAGE', [
  '...............',
  '.....iiWii.....',
  '...uuuiiiuuu...',
  '..iUUuiRiuUUi..',
  '.iiUUUuRuUUUii.',
  '.iiUUUURUUUUii.',
  '.iiUUUUWUUUUii.',
  '.iiUUUUkUUUUii.',
  '.iiUUUUkUUUUii.',
  '.WWUUUUkUUUUWW.',
  '...UUUUkUUUU...',
  '...UUUUkUUUU...',
  '...uuuuuuuuu...',
  '...............',
], {U: '34467e', u: '22305a', i: '9cc4ec', W: 'eef6ff', R: 'd03a3a', k: '1a2244'});
// Hawaiihemd: loud red shirt with white and yellow flowers, short sleeves, open collar
put('ARMOR_ROGUE', [
  '..............',
  '....RWRRWR....',
  '..RRRWRRWRRR..',
  '.RLRRRWWRRWRR.',
  '.RRRWRRRRRRLR.',
  '.RRrRLRRWRrRR.',
  '...RRRRRRLR...',
  '...RWRRLRRR...',
  '...RRRRRRRR...',
  '...rrrrrrrr...',
  '..............',
], {R: 'e0402c', r: 'a02a1c', W: 'fff4f0', L: 'ffd84a'});
// Vintage-Cordjacke: rust corduroy with rib lines, cream sherpa collar, patch pockets
put('ARMOR_HUNTRESS', [
  '.............',
  '...CCC.CCC...',
  '..ACCCaCCCA..',
  '.AaAaAaAaAaA.',
  '.AaAaAaAaAaA.',
  '.AaAaAaAaAaA.',
  '.AaAaAqAaAaA.',
  '.AaAaAaAaAaA.',
  '.AaAAAqAAAaA.',
  '.AaAnnanAaaA.',
  '.qqAnnanAaqq.',
  '...AaAqAaA...',
  '...aaaaaaa...',
  '.............',
], {A: 'b0602a', a: '84421a', q: 'd89060', n: '6a3412', C: 'f0e6cc'});

// ---------------------------------------------------------------- c) weapons (tier 1-5) and thrown weapons
cat('c) Waffen', 'CUDGEL', 'RAPIER', 'SHORTSWORD', 'HAND_AXE', 'SPEAR', 'QUARTERSTAFF', 'DIRK', 'SICKLE',
  'SWORD', 'MACE', 'SCIMITAR', 'ROUND_SHIELD', 'SAI', 'WHIP',
  'LONGSWORD', 'BATTLE_AXE', 'FLAIL', 'RUNIC_BLADE', 'ASSASSINS_BLADE', 'CROSSBOW', 'KATANA',
  'GREATSWORD', 'WAR_HAMMER', 'GLAIVE', 'GREATAXE', 'GREATSHIELD', 'GAUNTLETS', 'WAR_SCYTHE');
cat('c) Wurfwaffen', 'THROWING_SPIKE', 'FISHING_SPEAR', 'SHURIKEN', 'THROWING_CLUB', 'THROWING_SPEAR', 'BOLAS',
  'KUNAI', 'JAVELIN', 'TOMAHAWK', 'BOOMERANG', 'TRIDENT', 'THROWING_HAMMER', 'FORCE_CUBE');

// Nudelholz: light wooden rolling pin with handles
put('CUDGEL', [
  '...............',
  '............Mn.',
  '...........Mn..',
  '.........MMN...',
  '........MMNNn..',
  '.......MMNNn...',
  '......MMNNn....',
  '.....MMNNn.....',
  '....MMNNn......',
  '...MNNNn.......',
  '....NNn........',
  '...Mn..........',
  '..Mn...........',
]);
// Stockschirm: closed black umbrella, steel tip, J-hook handle
put('RAPIER', [
  '.............',
  '...........s.',
  '..........G..',
  '.........kZ..',
  '........kZz..',
  '.......kZz...',
  '......kZz....',
  '.....kZz.....',
  '....kZz......',
  '....zz.......',
  '...N.........',
  '..N..........',
  '..N..N.......',
  '...NN........',
], {Z: '4a4a58', z: '2e2e38', k: '6a6a7a'});
// Gardinenstange: straight chrome rod with ball finials and a brass ring
put('SHORTSWORD', [
  '.............',
  '.........sW..',
  '........sWWG.',
  '........WGGg.',
  '.......Gg....',
  '......YGY....',
  '.....YgY.....',
  '....Gg.......',
  '...Gg........',
  '.sWg.........',
  '.WGg.........',
  '.gg..........',
]);
// Hackebeil: rectangular steel cleaver with a hole and a wooden handle
put('HAND_AXE', [
  '............',
  '..sssssss...',
  '..WWWWWWWs..',
  '..WGkGGGGs..',
  '..WGGGGGGg..',
  '..WGGGGGGg..',
  '..sgggggggNN',
  '........NNn.',
  '.......NNn..',
  '......NNn...',
  '.....NNn....',
  '....nnn.....',
].map(r => r.slice(0, 12)).map((r, i) => i === 6 ? '..sgggggggN.' : r));
// Sonnenschirmstange: beer-garden umbrella pole, red/white fabric scrap, broken sharp tip
put('SPEAR', [
  '................',
  '..............W.',
  '.............sG.',
  '............WG..',
  '..........RWRg..',
  '.........RWRW...',
  '..........WRg...',
  '.........Gg.....',
  '........Gg......',
  '.......Gg.......',
  '......Gg........',
  '.....Gg.........',
  '....Gg..........',
  '...Gg...........',
  '..kk............',
]);
// Besenstiel: long broom handle with a small bristle stub
put('QUARTERSTAFF', [
  '................',
  '.............Mn.',
  '............Mn..',
  '...........Mn...',
  '..........Mn....',
  '.........Mn.....',
  '........Mn......',
  '.......Mn.......',
  '......Mn........',
  '.....Mn.........',
  '....RRr.........',
  '...RRRr.........',
  '..YLYYr.........',
  '.YLYLy..........',
  '.yYy............',
]);
// Brotmesser: long serrated bread knife with a black handle
put('DIRK', [
  '.............',
  '..........s..',
  '.........sW..',
  '........sWg..',
  '.......sWg...',
  '......sWg....',
  '.....sWg.....',
  '....sWg......',
  '....Wg.......',
  '...zk........',
  '..zk.........',
  '.zk..........',
  '.z...........',
], {k: '4a4a54', z: '26262e'});
// Heckenschere: hedge shears, two blades and wooden handles
put('SICKLE', [
  '...............',
  '.s.........s...',
  '..sG......Gs...',
  '...sG....Gs....',
  '....sG..Gs.....',
  '.....sGGs......',
  '......YY.......',
  '.....NYYN......',
  '....NN..NN.....',
  '...NN....NN....',
  '..NN......NN...',
  '.nn........nn..',
  '...............',
]);
// Flohmarkt-Säbel: brass-hilted sabre with a curved guard and a price tag
put('SWORD', [
  '..............',
  '...........Ws.',
  '..........WsG.',
  '.........WsG..',
  '........WsG...',
  '.......WsG....',
  '......WsG.....',
  '..Y..WsG......',
  '..YYWsG.......',
  '...YyG........',
  '..nNYYY.C.....',
  '.nNn...CkC....',
  '.nn.....C.....',
], {C: 'f6f0dc', k: 'c03a2c'});
// Fleischklopfer: square steel tenderiser head with a studded face, wooden handle
put('MACE', [
  '...............',
  '.........sWWs..',
  '........sWGWGs.',
  '........WGWGWg.',
  '........sWGWGg.',
  '.........sggg..',
  '........Nn.....',
  '.......Nn......',
  '......Nn.......',
  '.....Nn........',
  '....Nn.........',
  '...Nn..........',
  '..nn...........',
]);
// Dönermesser: very long thin blade, black handle
put('SCIMITAR', [
  '.............',
  '..........W..',
  '.........WG..',
  '........WsG..',
  '.......WsG...',
  '......WsG....',
  '.....WsG.....',
  '....WsG......',
  '...WsG.......',
  '...sG........',
  '..sk.........',
  '..zk.........',
  '.zk..........',
  '.z...........',
], {k: '4a4a54', z: '26262e'});
// Mülltonnendeckel: grey-green bin lid with ribs and a handle
put('ROUND_SHIELD', [
  '................',
  '................',
  '.....ZZZZZ......',
  '...ZZssssZZZ....',
  '..ZsZZZZZZZZZ...',
  '.ZsZkkkkkkkZZZ..',
  '.ZZZkZZZZZkZZZ..',
  '.ZZZZZZZZZZZZz..',
  '.ZZZsssssssZZz..',
  '.ZZZZZZZZZZZzz..',
  '..ZZZZZZZZZZz...',
  '...zZZZZZZzz....',
  '.....zzzzz......',
  '................',
], {Z: '5c6e5a', z: '3c4a3a', s: '8ea08a', k: '2a322a'});
// Grillzangen: two crossed steel tongs
put('SAI', [
  '................',
  '..s..........s..',
  '..sG........Gs..',
  '...sG......Gs...',
  '...sG......Gs...',
  '....sG....Gs....',
  '.....sG..Gs.....',
  '......sGGs......',
  '......GsgG......',
  '.....Gs..sG.....',
  '....kk....kk....',
  '...kk......kk...',
  '..kk........kk..',
  '..k..........k..',
  '................',
]);
// Verlängerungskabel: coiled orange cable with a power strip
put('WHIP', [
  '..............',
  '....AAAAA.....',
  '...A.....A....',
  '..A..AAA..A...',
  '..A.A...A.A...',
  '..A.A...A.A...',
  '..A..AAA..A...',
  '...A.....A....',
  '....AAAAAA....',
  '.........A....',
  '....WWWWWWW...',
  '....WKWKWKs...',
  '....sssssss...',
]);
// Zaunlatte: pointed wooden fence picket with two nails
put('LONGSWORD', [
  '...............',
  '............M..',
  '...........MMN.',
  '..........MMNn.',
  '.........MMNn..',
  '........MGNn...',
  '.......MMNn....',
  '......MMNn.....',
  '.....MMNn......',
  '....MMNn.......',
  '...MGNn........',
  '..MMNn.........',
  '..NNn..........',
]);
// Feuerwehraxt: red fire axe with pick, dark handle
put('BATTLE_AXE', [
  '................',
  '..........RR....',
  '.........RpRR...',
  '.........RRRRs..',
  '..........kRRWs.',
  '...........kRRW.',
  '..........kk.Rs.',
  '.........kk.....',
  '........kk......',
  '.......kk.......',
  '......kk........',
  '.....kk.........',
  '....kk..........',
  '...kk...........',
  '..RR............',
], {k: '3a2a22'});
// Fahrradschloss-Kette: chain lock in a black fabric sleeve with a lock body
put('FLAIL', [
  '..............',
  '.....kkkk.....',
  '...kk....kk...',
  '..k........k..',
  '..k........k..',
  '.k..........k.',
  '.k..........k.',
  '.k.........YY.',
  '..k.......sGGs',
  '..k.......GkGg',
  '...kk.....GGGg',
  '.....kkkk.ggg.',
], {k: '3c56a8'});
// Esoterik-Säbel: sword with a crystal pommel and purple glow runes
put('RUNIC_BLADE', [
  '..............',
  '...........w..',
  '..........wV..',
  '.........wVv..',
  '........wVv...',
  '.......wVv....',
  '......wVv.....',
  '..Y..wVv......',
  '..YYwVv.......',
  '...YYv........',
  '..jjYYY.......',
  '.jWj..........',
  '.jj...........',
], {V: '9a6ad0', v: '5a3a90', w: 'd8c0f4', j: '7ae8e0'});
// Teppichmesser: yellow box cutter with a segmented snap-off blade
put('ASSASSINS_BLADE', [
  '..............',
  '..........s...',
  '.........sW...',
  '........sWG...',
  '.......sWGg...',
  '......YYgg....',
  '.....YYYk.....',
  '....YLYk......',
  '...YLYk.......',
  '..YLYk........',
  '..YYk.........',
  '..kk..........',
  '..............',
]);
// Sperrmüll-Armbrust: plank stock with a bent metal bow and string
put('CROSSBOW', [
  '...............',
  '....ssG........',
  '...s...GG......',
  '..s.....G......',
  '..s...MNNG.....',
  '..G..MNNG......',
  '...GMNNG.......',
  '....NNN........',
  '...NNNGGG......',
  '..NNn...GGG....',
  '.NNn......GG...',
  '.nn........G...',
  '.............G.',
  '...............',
]);
// Deko-Katana: shiny blade, gold guard, red and black wrapped handle
put('KATANA', [
  '...............',
  '............W..',
  '...........WG..',
  '..........WsG..',
  '.........WsG...',
  '........WsG....',
  '.......WsG.....',
  '......WsG......',
  '.....WsG.......',
  '...YYsG........',
  '...YRY.........',
  '...kR..........',
  '..Rk...........',
  '.kR............',
  '.k.............',
]);
// Rotorblatt: white wind-turbine blade with red tip stripes
put('GREATSWORD', [
  '................',
  '.............RR.',
  '............RWR.',
  '...........WWR..',
  '..........WsWR..',
  '.........WWsW...',
  '........WWWs....',
  '.......WWWsG....',
  '......WWWsG.....',
  '.....WWWsG......',
  '....WWWsG.......',
  '...GWWsG........',
  '..GGGsG.........',
  '.gGGGG..........',
  '.ggg............',
]);
// Vorschlaghammer: big steel sledgehammer on a long handle
put('WAR_HAMMER', [
  '................',
  '..........s.....',
  '.........sWs....',
  '........sWGGs...',
  '.......sWGGGGg..',
  '........GGGGggg.',
  '.......NnGGggg..',
  '......NN.gggg...',
  '.....NN...gg....',
  '....NN..........',
  '...NN...........',
  '..NN............',
  '.NN.............',
  '.nn.............',
]);
// Schneeschieber: wide orange snow shovel blade on a long handle
put('GLAIVE', [
  '................',
  '.............kk.',
  '............kk..',
  '...........Nn...',
  '..........Nn....',
  '.........Nn.....',
  '........Nn......',
  '.......Nn.......',
  '......Nn........',
  '...AAAqA........',
  '..AqqqAAA.......',
  '.AqAAAAAAa......',
  '.AAAAAAAa.......',
  '.aAAAAAa........',
  '..aaaaa.........',
]);
// Holzspalter-Axt: splitting maul, heavy wedge head, long handle (upright)
put('GREATAXE', [
  '............',
  '..sWWWWs....',
  '.sWGGGGGGg..',
  '.GGGGGGGgg..',
  '..gGGGGgg...',
  '....gNg.....',
  '....NNn.....',
  '....NNn.....',
  '....NNn.....',
  '....NNn.....',
  '....NNn.....',
  '....NNn.....',
  '....NNn.....',
  '....kkk.....',
]);
// Kundenstopper: A-frame chalkboard sign with a chalk scribble and a drawn cup
put('GREATSHIELD', [
  '............',
  '....NNNN....',
  '...NkkkkN...',
  '...NkWkWN...',
  '..NkkkkkkN..',
  '..NkWWWWkN..',
  '..NkkkkkkN..',
  '..NkkWWkkN..',
  '.NkkWkkWkkN.',
  '.NkkkWWkkkN.',
  '.NkkkkkkkkN.',
  '.NNNNNNNNNN.',
  '.N........N.',
  '.n........n.',
], {k: '2e3a34', W: 'e8ecf0'});
// Beton-Fäustling: concrete-caked mitten with cracks
put('GAUNTLETS', [
  '.............',
  '.....GGGG....',
  '....GsGGGG...',
  '...GGGGgGGG..',
  '...GsGGGgGG..',
  '..GGGGgGGGG..',
  '.GGGGGGGGGG..',
  '.GsGGGGGGGg..',
  '.GGGgGGGGGg..',
  '..GGGGGGGgg..',
  '...gGGGGgg...',
  '...ssssss....',
  '...GGGGGG....',
  '...gggggg....',
], {G: 'a4a29a', g: '76746c', s: 'cac8c0'});
// Kleingarten-Sense: scythe with curved blade and wooden snath with a grip
put('WAR_SCYTHE', [
  '..............',
  '..sWWWs.......',
  '.sG....WWs....',
  '.s.......WW...',
  '...........MN.',
  '..........MNn.',
  '.........MN...',
  '.....NnMN.....',
  '.....nMN......',
  '.....MN.......',
  '....MN........',
  '...MN.........',
  '..MN..........',
  '..nn..........',
]);

// Zelthering: bent steel tent peg with an orange plastic hook
put('THROWING_SPIKE', [
  '...........',
  '.......AA..',
  '......Aq...',
  '.....sG....',
  '....sG.....',
  '...sG......',
  '..sG.......',
  '.sG........',
  '.g.........',
]);
// Angler-Harpune: small barbed harpoon
put('FISHING_SPEAR', [
  '...........',
  '........W..',
  '.......WG..',
  '.....sWGs..',
  '......Gg...',
  '.....Ng....',
  '....Nn.....',
  '...Nn......',
  '..Nn.......',
  '.nn........',
]);
// Kronkorken: crimped golden bottle cap
put('SHURIKEN', [
  '............',
  '....Y.Y.....',
  '...YLYLYY...',
  '..YLLLLLYy..',
  '..LLRRRLLY..',
  '.YLRRWRRLy..',
  '..LRRRRRLY..',
  '..YLRRRLYy..',
  '...YLLLYy...',
  '....y.yy....',
  '............',
]);
// Pfandflasche: thick green glass deposit bottle
put('THROWING_CLUB', [
  '............',
  '.........Y..',
  '........ee..',
  '.......eE...',
  '......eEl...',
  '....eEEll...',
  '...eEElle...',
  '..eEElEe....',
  '..eEEEe.....',
  '..eEEe......',
  '...ee.......',
], {e: '1e5a2c', E: '3a8c46', l: '9ae0a0'});
// Zeltstange: segmented fibreglass tent pole with metal joints
put('THROWING_SPEAR', [
  '.............',
  '...........s.',
  '..........Ts.',
  '.........Tt..',
  '........Gs...',
  '.......Tt....',
  '......Tt.....',
  '.....Gs......',
  '....Tt.......',
  '...Tt........',
  '..Gs.........',
  '.Tt..........',
]);
// Kabelbinder-Bola: two heavy nuts tied together with black cable ties
put('BOLAS', [
  '...............',
  '..GGG..........',
  '.GkkG..........',
  '.GkkG..........',
  '..GGk..........',
  '....k..........',
  '....k....k.....',
  '.....kkkk.k....',
  '...........k...',
  '...........kGG.',
  '..........GkkG.',
  '..........GkkG.',
  '...........GG..',
], {k: '1e1e24'});
// Grillspieß: skewer with pepper, onion and meat
put('KUNAI', [
  '...............',
  '.............s.',
  '............s..',
  '..........Rp...',
  '.........RRr...',
  '.........Rr....',
  '........CC.....',
  '.......Cc......',
  '......nN.......',
  '.....nNn.......',
  '.....nn........',
  '....s..........',
  '...s...........',
  '..GG...........',
  '..G............',
]);
// Halteverbotsschild: blue sign with red ring and red cross on a pole
put('JAVELIN', [
  '................',
  '..........RRRR..',
  '.........RRUURR.',
  '........RRRUURRR',
  '........RUURRUUR',
  '........RUURRUUR',
  '........RRRUURRR',
  '.........RRUURR.',
  '..........RRRR..',
  '..........G.....',
  '.........Gg.....',
  '........Gg......',
  '.......Gg.......',
  '......Gg........',
  '.....gg.........',
].map(r => r.slice(0, 15).padEnd(16, '.')), {R: 'd83028', U: '2c5ab8'});
// Wurfbeil: small hatchet
put('TOMAHAWK', [
  '.............',
  '........sWs..',
  '.......sWGGs.',
  '.......nGGGg.',
  '......Nn.gg..',
  '.....Nn......',
  '....Nn.......',
  '...Nn........',
  '..Nn.........',
  '..nn.........',
]);
// Backblech: dark baking tray with a raised rim
put('BOOMERANG', [
  '..............',
  '..............',
  '...kkkkkkkkk..',
  '..kGggggggGk..',
  '..kgZZZZZZgk..',
  '..kgZZZZZZgk..',
  '..kgZZZZZZgk..',
  '..kgZZZZZZgk..',
  '..kGggggggGk..',
  '..kkkkkkkkkk..',
  '..............',
]);
// Mistgabel: four-tined pitchfork
put('TRIDENT', [
  '................',
  '..........s.s...',
  '.........s.s.s..',
  '........s.s.s.s.',
  '........Gs.s.s..',
  '.........GGGs...',
  '........NnGG....',
  '.......Nn.......',
  '......Nn........',
  '.....Nn.........',
  '....Nn..........',
  '...Nn...........',
  '..Nn............',
  '..n.............',
]);
// Gummihammer: black rubber mallet with a wooden handle
put('THROWING_HAMMER', [
  '............',
  '.....kkk....',
  '....kZZZk...',
  '...kZZZZZk..',
  '...kZZZZzk..',
  '....kZzzk...',
  '....Nkkk....',
  '...Nn.......',
  '..Nn........',
  '.Nn.........',
  '.n..........',
]);
// Betonwürfel: concrete cube with rusty rebar stubs
put('FORCE_CUBE', [
  '...........',
  '....a......',
  '..sssasss..',
  '.sGGGGGGG..',
  '.GGGGGGgG..',
  '.GsGGGGGg..',
  '.GGGGgGGg..',
  '.GGGGGGGg..',
  '.gGGGGGgg..',
  '..gggggg...',
], {G: 'a4a29a', g: '76746c', s: 'cac8c0', a: 'a0501a'});

// ---------------------------------------------------------------- d) potions, scrolls, seeds, bags, keys, gold
// Template icons whose identifying colour or rune comes from the upstream cell. They are
// built in main() once the upstream atlas is loaded (see buildTemplates).
const POTION_NAMES = ['CRIMSON', 'AMBER', 'GOLDEN', 'JADE', 'TURQUOISE', 'AZURE', 'INDIGO', 'MAGENTA', 'BISTRE', 'CHARCOAL', 'SILVER', 'IVORY'];
const RUNE_NAMES = ['KAUNAN', 'SOWILO', 'LAGUZ', 'YNGVI', 'GYFU', 'RAIDO', 'ISAZ', 'MANNAZ', 'NAUDIZ', 'BERKANAN', 'ODAL', 'TIWAZ'];
const SEED_NAMES = ['ROTBERRY', 'FIREBLOOM', 'SWIFTTHISTLE', 'SUNGRASS', 'ICECAP', 'STORMVINE', 'SORROWMOSS', 'MAGEROYAL', 'EARTHROOT', 'STARFLOWER', 'FADELEAF', 'BLINDWEED'];
cat('d) Tränke (Späti-Pullen)', ...POTION_NAMES.map(n => 'POTION_' + n));
cat('d) Exotische Tränke (Dosen)', ...POTION_NAMES.map(n => 'EXOTIC_' + n));
cat('d) Schriftrollen (Formulare)', ...RUNE_NAMES.map(n => 'SCROLL_' + n));
cat('d) Exotische Schriftrollen (Durchschläge)', ...RUNE_NAMES.map(n => 'EXOTIC_' + n));
cat('d) Samen (Samentütchen)', ...SEED_NAMES.map(n => 'SEED_' + n));

// Späti-Pulle: long-neck glass bottle with a crown cap. 1-4 = liquid light..darkest.
const POTION_ART = [
  '............',
  '....sGs.....',
  '....gGg.....',
  '....WCg.....',
  '....W2g.....',
  '....W23.....',
  '...W1223....',
  '..W112233...',
  '..W122233...',
  '..W122233...',
  '..W122234...',
  '..s223344...',
  '...s3444....',
];
// Dose: drinks can, lid with pull tab, printed white band
const CAN_ART = [
  '............',
  '...sGkGGs...',
  '..sWsGGGgs..',
  '..21222334..',
  '..21222334..',
  '..WWWWWWWs..',
  '..21222334..',
  '..21222334..',
  '..21222334..',
  '..21223344..',
  '..sGGGGGgg..',
];
// Formular: sheet with a paper clip, grey header, the rune as the form code, text lines.
// Rune pixels are laid over rows 3..9 at the same position as on the upstream scroll.
const FORM_ART = [
  '...GG..........',
  '..GCGCCCCCCC...',
  '..GCgCCssCCd...',
  '..CCCCCCCCCd...',
  '..CCCCCCCCCd...',
  '..CCCCCCCCCd...',
  '..CCCCCCCCCd...',
  '..CCCCCCCCCd...',
  '..CCCCCCCCCd...',
  '..CCCCCCCCCd...',
  '..CssssssCCd...',
  '..CssssCCCCd...',
  '..dddddddddd...',
];
// Samentütchen: paper seed packet, crimped white top, coloured front with a seed
const SEED_ART = [
  '..........',
  '.sWsWsWs..',
  '.WWWWWWW..',
  '.2222223..',
  '.2211223..',
  '.2144123..',
  '.2211223..',
  '.2222233..',
  '.3333333..',
];

function buildTemplates(up) {
  const at = (cell, x, y) => { const [cx, cy] = cellXY(cell); return getPx(up, cx + x, cy + y).slice(0, 3); };
  POTION_NAMES.forEach((n, k) => {
    const c = cellOf('POTION_' + n), e = cellOf('EXOTIC_' + n);
    // liquid tones sampled where the upstream flasks have their light/mid/dark/darkest liquid
    const pot = {1: at(c, 5, 8), 2: at(c, 3, 8), 3: at(c, 6, 9), 4: at(c, 8, 9)};
    const exo = {1: at(e, 5, 6), 2: at(e, 2, 6), 3: at(e, 10, 6), 4: at(e, 9, 7)};
    put('POTION_' + n, POTION_ART, {...pot, C: 'e4eef0'});
    put('EXOTIC_' + n, CAN_ART, exo);
  });
  RUNE_NAMES.forEach(n => {
    // the rune is the orange ink of the upstream exotic scroll (bright strokes '#', shaded '+')
    const e = cellOf('EXOTIC_' + n), bright = [], shade = [];
    for (let y = 3; y < 10; y++) for (let x = 3; x < 11; x++) {
      const h = hex(at(e, x, y));
      if (['eea616', 'ffe262', 'd97a00'].includes(h)) bright.push([x, y]);
      else if (h === 'a34c0f') shade.push([x, y]);
    }
    const make = (paper, ink) => {
      const rows = FORM_ART.map(r => [...r]);
      for (const [x, y] of bright) rows[y][x] = '#';
      for (const [x, y] of shade) rows[y][x] = '+';
      return [rows.map(r => r.join('')), {...paper, ...ink}];
    };
    put('SCROLL_' + n, ...make({C: 'f6f4ec', d: 'c8c2b0', s: 'a8a6b4', g: '8a8a98'}, {'#': '2c3aa0', '+': '6a78d0'}));
    put('EXOTIC_' + n, ...make({C: '3a3846', d: '24222e', s: '5c5a6a', g: '6a6878', G: 'c9c8cf'}, {'#': 'f0a818', '+': 'b05a10'}));
  });
  SEED_NAMES.forEach(n => {
    const c = cellOf('SEED_' + n), [cx, cy] = cellXY(c), tones = new Map();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const p = getPx(up, cx + x, cy + y); if (p[3] === 255) tones.set(hex(p.slice(0, 3)), p.slice(0, 3));
    }
    const t = [...tones.values()].sort((a, b) => lum(...b) - lum(...a));
    const pick = f => t[Math.min(t.length - 1, Math.round(f * (t.length - 1)))];
    put('SEED_' + n, SEED_ART, {1: pick(0), 2: pick(0.34), 3: pick(0.67), 4: pick(1)});
  });
}

cat('d) Beutel', 'POUCH', 'HOLDER', 'BANDOLIER', 'HOLSTER');
cat('d) Schlüssel', 'IRON_KEY', 'GOLDEN_KEY', 'CRYSTAL_KEY', 'WORN_KEY');
cat('d) Gold', 'GOLD');

// Bauchtasche: retro colour-block belt bag with zip and strap
put('POUCH', [
  '..............',
  '..............',
  '..............',
  '.kk........kk.',
  '..kkTTTTTTkk..',
  '..TTTTTTTTTT..',
  '.TsWsWsWsWsTt.',
  '.TmmmmmmmmmTt.',
  '.TmmPmmmmmmTt.',
  '.TTTTTTTTTTTt.',
  '..tttttttttt..',
  '..............',
], {T: '2aa4a0', t: '1a7270', m: 'e0569a', P: 'f6a0c8'});
// Aktenordner: grey lever-arch file, white spine label, finger hole
put('HOLDER', [
  '................',
  '...ZZZZZZZZZ....',
  '...ZGGGGGGGGz...',
  '...ZGWWWWWGGz...',
  '...ZGWkkkWGGz...',
  '...ZGWWWWWGGz...',
  '...ZGWkkWWGGz...',
  '...ZGWWWWWGGz...',
  '...ZGGGGGGGGz...',
  '...ZGGgzzgGGz...',
  '...ZGGgzzgGGz...',
  '...ZGGGGGGGGz...',
  '...ZGGGGGGGGz...',
  '...ZGGGGGGGGz...',
  '...zzzzzzzzzz...',
], {G: '8e8e98', Z: 'b4b4bc', z: '5a5a64'});
// Sixpack-Gurt: cardboard six-pack carrier with handle, three green bottle necks showing
put('BANDOLIER', [
  '...............',
  '......nNn......',
  '.....n...n.....',
  '..s..n.s.n..s..',
  '..e..n.e.n..e..',
  '.eEe.neEen.eEe.',
  '.NNNNNNNNNNNNN.',
  '.NMMMMMMMMMMMN.',
  '.NYYYYYYYYYYYN.',
  '.NYRRYYRRYYRYN.',
  '.NYYYYYYYYYYYN.',
  '.NMMMMMMMMMMMN.',
  '.nnnnnnnnnnnnn.',
], {e: '1e5a2c', E: '4a9c56'});
// Magischer Fahrradkorb: dented silver wire basket with handle
put('HOLSTER', [
  '...............',
  '.....sGGGs.....',
  '....G.....G....',
  '...G.......G...',
  '.sGsGsGsGsGsG..',
  '.G.G.G.G.G.Gg..',
  '.GsGsGsGsGsGg..',
  '.G.G.G.G.G.Gg..',
  '.GsGsGsGsGsGg..',
  '..G.G.G.G.Gg...',
  '..gggggggggg...',
], {G: 'b0b0bc', s: 'e0e0ea', g: '6a6a78'});

// Keys: modern flat keys (bow with hole, toothed blade)
const KEY_ART = [
  '........',
  '..1111..',
  '.122223.',
  '.12..23.',
  '.122223.',
  '..3223..',
  '...23...',
  '...233..',
  '...23...',
  '...233..',
  '...23...',
  '...233..',
  '...33...',
];
// Kellerschlüssel: iron with a red tag
put('IRON_KEY', KEY_ART.map((r, y) => y === 5 ? '.R3223..' : y === 6 ? 'RR.23...' : r), {1: 'd0d0d8', 2: 'a0a0aa', 3: '6a6a74', R: 'd83a2c'});
put('GOLDEN_KEY', KEY_ART, {1: 'fff08a', 2: 'e8b828', 3: 'a07810'});
put('CRYSTAL_KEY', KEY_ART, {1: 'f0ffff', 2: '9ad8f0', 3: '4a8ab8'});
put('WORN_KEY', KEY_ART, {1: 'c8c070', 2: '9a8c3a', 3: '64581e'});
// Gold: pile of coins with a white Pfandbon (deposit receipt)
put('GOLD', [
  '...............',
  '..........CCC..',
  '..........CsC..',
  '.....YYY..CCC..',
  '....YLLLY.CsC..',
  '....yYYYyYYC...',
  '..YYYyyyYLLY...',
  '.YLLLYYYyYYYy..',
  '.yYYYyLLLYyy...',
  'YYyyyYYYYYY....',
  'LLLYyyyyyyyy...',
  'yyyy...........',
], {C: 'f6f4ec', s: '9a98a2', Y: 'f0c030', L: 'fff09a', y: 'a87a10'});

// ---------------------------------------------------------------- e) the rest
cat('e) Reste und Werkzeug', 'SEAL_SHARD', 'BROKEN_STAFF', 'CLOAK_SCRAP', 'BOW_FRAGMENT', 'TORCH', 'STYLUS', 'HONEYPOT', 'SHATTPOT');
cat('e) Essen', 'MEAT', 'STEAK', 'STEWED', 'CARPACCIO', 'PASTY', 'MEAT_PIE', 'SUPPLY_RATION');
cat('e) Artefakte', 'ARTIFACT_ARMBAND', 'ARTIFACT_TALISMAN', 'ARTIFACT_SPELLBOOK', 'ARTIFACT_BEACON', 'ARTIFACT_KEY', 'ARTIFACT_TOOLKIT');

// Aufnäher-Reste: two torn pieces of the crest patch with loose threads
put('SEAL_SHARD', [
  '............',
  '.YYYYY......',
  '.YuuuY......',
  '.YuWuY.s....',
  '.YuuY..s....',
  '..YY...s....',
  '......YYYY..',
  '....s.YRRY..',
  '.....sYRWY..',
  '......YRRY..',
  '.......YY...',
], {u: '2a3c8c', R: 'c83030'});
// Kaputter Selfie-Stick: snapped pole and a cracked phone
put('BROKEN_STAFF', [
  '..............',
  '.........KKKK.',
  '.........KiWK.',
  '.........KWiK.',
  '....Gs...KUUK.',
  '...Gs....KKKK.',
  '..Gs..........',
  '.gg...........',
  '.kz...........',
]);
// Ponchofetzen
put('CLOAK_SCRAP', [
  '.........',
  '..ZZZ....',
  '.ZsZZZ...',
  '.ZZsZZz..',
  '..ZZZzZ..',
  '...zZzz..',
  '....z.z..',
], {Z: '5c6a78', z: '3c4652', s: 'b4ccdc'});
// Bogensplitter: parquet piece with a bent spoke
put('BOW_FRAGMENT', [
  '............',
  '.MNM........',
  '..nMNMn.....',
  '.....nMNs...',
  '........sG..',
  '..........s.',
]);
// Handytaschenlampe: phone with the flashlight LED on, light rays
put('TORCH', [
  '............',
  '..L..L..L...',
  '...L.L.L....',
  '....LWL.....',
  '..LLWWWLL...',
  '....KKK.....',
  '...KKLKK....',
  '...KkkkK....',
  '...KkkkK....',
  '...KkkkK....',
  '...KkkkK....',
  '...KkkkK....',
  '...KkkkK....',
  '...KKKKK....',
], {L: 'fff2a0', k: '4a4a58'});
// Arkaner Permanentmarker: black marker with a purple tip and cap ring
put('STYLUS', [
  '............',
  '.........V..',
  '........wV..',
  '.......GkG..',
  '......kkk...',
  '.....kkk....',
  '....kkk.....',
  '...kkk......',
  '..VVk.......',
  '..VV........',
  '............',
], {k: '2a2a34', G: '9a98a2'});
// Stadthonig-Topf: glass jar of honey, yellow lid, label with a bee
put('HONEYPOT', [
  '..............',
  '....YYYYYY....',
  '....yyyyyy....',
  '...WAAAAAAq...',
  '...WAqqqqAA...',
  '...WACCCCAA...',
  '...WACkYCAA...',
  '...WACCCCAA...',
  '...WAAAAAAa...',
  '....aaaaaa....',
], {A: 'e8a020', q: 'f8cc58', a: 'a86a10', C: 'f6f0dc', k: '2a2a2a'});
// zerbrochener Honigtopf: shards and a honey puddle
put('SHATTPOT', [
  '..............',
  '..............',
  '....YYy.......',
  '...W.....W....',
  '...WA...WA....',
  '..WAAq.WAAA...',
  '.AAAAAAAAAAAa.',
  '..aaaaaaaaaa..',
], {A: 'e8a020', q: 'f8cc58', a: 'a86a10'});

// Rätselhafter Spieß: skewer with grey-brown mystery meat
put('MEAT', [
  '...............',
  '...............',
  '............s..',
  '....HHHHHHss...',
  '..HhHHHHHHH....',
  '.HHHdHHHdHH....',
  '.HHHHHdHHHd....',
  '..ddHHHHdd.....',
  '.s.............',
  's..............',
], {H: 'a08a78', h: 'c8b4a0', d: '6e5a4c'});
// Parkgrill-Steak: charred steak with grill stripes
put('STEAK', [
  '...............',
  '....nnnnnn.....',
  '..nNkNNkNNn....',
  '.nNkNNkNNkNn...',
  '.NkNNkNNkNNn...',
  '.nNNkNNkNNnn...',
  '..nnnnnnnnn....',
], {N: '8a4a28', n: '5a2e18', k: '2a1a14'});
// Dosengulasch: open tin with lid bent up and brown stew
put('STEWED', [
  '...............',
  '......sGGs.....',
  '.....sG..G.....',
  '...GsGGGGsG....',
  '..GnNnNNnNnG...',
  '..GsNnRnNnsG...',
  '..GWWWWWWWWg...',
  '..GRRRRRRRRg...',
  '..GRWRRRRRRg...',
  '..ggggggggg....',
]);
// Tiefkühl-Carpaccio: frozen meat slab with frost
put('CARPACCIO', [
  '...............',
  '...............',
  '...iPPPPPPi....',
  '..iPWPPpPPPi...',
  '..PpPPPPWPpP...',
  '..PPPiPPPPPi...',
  '...iiiiiiii....',
], {P: 'e89aa0', p: 'c86a78', i: 'b4dcf0'});
// Bulettenschrippe: split bread roll, meat patty, mustard
put('PASTY', [
  '................',
  '....MMMMMMM.....',
  '..MMqMMqMMMM....',
  '.MqqMMqqMMMMN...',
  '.YYYYLYYYYYYY...',
  '.bnbnnbnnbnbn...',
  '.NNNNNNNNNNNN...',
  '..NNNNNNNNNN....',
], {q: 'f0c888'});
// Döner mit alles: bread wedge with meat, lettuce, tomato and white sauce
put('MEAT_PIE', [
  '................',
  '..MMMMMMMMMMM...',
  '.MqqqqqqqqqqM...',
  '.MnnWnnlnnnM....',
  '..MRlnWnRlM.....',
  '...MnlRnnM......',
  '....MWnlM.......',
  '.....MnM........',
  '......M.........',
], {q: 'f0c888', l: '5cb03a', R: 'd83a2c'});
// Hostel-Lunchpaket: bundle wrapped in white napkins, croissant tip showing
put('SUPPLY_RATION', [
  '................',
  '.....AqA........',
  '....AqAqA.......',
  '..WWWWWWWWWW....',
  '.WsWWWWWWWsWc...',
  '.WWsWWWWWsWWc...',
  '.WWWsWWWsWWWc...',
  '.WWWWsWsWWWWc...',
  '.cWWWWsWWWWcc...',
  '..cccccccccc....',
]);

// VIP-Bändchen: purple festival wristband with a white print strip and a clip
put('ARTIFACT_ARMBAND', [
  '................',
  '.....VVVVVV.....',
  '...VV......VV...',
  '..V..........V..',
  '.V............V.',
  '.V............V.',
  '.VV..........VV.',
  '..VWWWWVVWWWVV..',
  '...VVVVVGGVVV...',
  '.......GsG......',
], {V: '8a3ac8', W: 'f0e8f8', G: 'b0b0bc'});
// Türspion-Talisman: brass door peephole on a chain
put('ARTIFACT_TALISMAN', [
  '...............',
  '..G.........G..',
  '...G.......G...',
  '....G.....G....',
  '.....GYYYG.....',
  '....YLYYYyY....',
  '....YYiUUyy....',
  '....YYUKUyy....',
  '....YyUUiyy....',
  '.....yyyyy.....',
]);
// Wackeliger Sprachführer: dog-eared yellow phrasebook with a speech bubble
put('ARTIFACT_SPELLBOOK', [
  '.............',
  '..YYYYYYYY...',
  '.yYLLLLLLYY..',
  '.yYLWWWWLY...',
  '.yYLWkkWLY...',
  '.yYLWWWWLY...',
  '.yYLLWLLLY...',
  '.yYYYYYYYY...',
  '.yYKKKKKKY...',
  '.yYYYYYYYY...',
  '.yYYYYYYYY...',
  '.yYYYYYYYY...',
  '.yyyyyyyyyC..',
  '..CCCCCCCC...',
]);
// Uraltes Jahresticket: laminated ticket card with photo and stripe
put('ARTIFACT_BEACON', [
  '................',
  '................',
  '................',
  '.jjjjjjjjjjjjj..',
  '.jCCCCCCCCCCCj..',
  '.jCHhHCssssCCj..',
  '.jCHhHCsssCCCj..',
  '.jCHHHCCCCCCCj..',
  '.jCCCCCCCCCCCj..',
  '.jRRRRRRRRRRRj..',
  '.jCssssCsssCCj..',
  '.jjjjjjjjjjjjj..',
], {j: 'd8f0f4', R: 'e8a020'});
// Generalschlüssel: long old janitor key on a ring
put('ARTIFACT_KEY', [
  '........',
  '..GGG...',
  '.G...G..',
  '.G...G..',
  '..GGG...',
  '..1111..',
  '.122223.',
  '.12..23.',
  '.122223.',
  '...23...',
  '...233..',
  '...23...',
  '...2333.',
  '...23...',
  '...33...',
], {1: 'e8e0b0', 2: 'b8a870', 3: '7a6c40'});
// Hobbybrauer-Set: wooden crate with brown bottles and a hose
put('ARTIFACT_TOOLKIT', [
  '...............',
  '...s.s....s....',
  '...a.a....a....',
  '..aAaAa..aAa...',
  '..aAaAa..aAa...',
  '.NNNNNNNNNNNN..',
  '.NbNNNNNNNNbN..',
  '.NNNNNNNNNNNN..',
  '.NbNNNNNNNNbN..',
  '.nnnnnnnnnnnn..',
], {a: '5a2c0e', A: '9a5a1c'});

// ---------------------------------------------------------------- f) chests: Sperrmüllberge
// The four container cells double as the hiding frames of the four mimic variants
// (tools/generate-kiez-mobs.cjs requires this file and renders the same rows, shifted down
// by 2 px: an item heap is drawn 16x14 with a 5 px perspective raise, a mimic 16x16 with
// 5 px, so icon row r lands on mimic frame row r + 2). Rows 0-1 stay empty so the mimic can
// lift its top part by up to 4 px when it opens.
// SPLIT: rows < SPLIT belong to the upper jaw, rows >= SPLIT to the lower jaw.
// EYES: where the mimic's eyes open (icon coordinates, upper jaw).
cat('f) Sperrmüllberge (Truhen)', 'CHEST', 'LOCKED_CHEST', 'CRYSTAL_CHEST', 'EBONY_CHEST');
const PILE = [
  '................',
  '................',
  '......LLL..n..n.',
  '.N...LqqqL.nMMn.',
  '.NN.NLLLLL.n..n.',
  '.MMMMM.s...nMMn.',
  '.NNNNn.s...n..n.',
  '.NNtNn.s..nnnnn.',
  '.WWWWWWWWWWWWWc.',
  '.CCiCCyCCiCCCic.',
  '.CiCCiCCiCCiCCc.',
  '.iiiiiiiiiiiiic.',
  '.cccccccccccccc.',
];
const PILE_PAL = {
  L: 'e0b04a', q: 'f6d88a',            // lamp shade
  s: '9a98a2',                         // lamp stand
  M: 'd2ae72', N: 'a87c44', t: 'c9c0a8', // cardboard box, tape
  n: '6a4424',                         // wooden chair
  W: 'fbf6ea', C: 'ece4d0', i: '6a8cc0', c: 'b8ae98', y: 'd8c070', // mattress, quilting, stain
};
const LOCKED_PILE = PILE.map((r, y) => {
  if (y === 10) return '.CiCCiOhOiCCiCc.';                         // padlock shackle
  if (y === 11) return '.KkKkPPPPPkKkKc.';                         // gold chain, lock body
  if (y === 12) return '.ccccPPhPPcccc..';                         // lock with keyhole
  return r;
});
const LOCKED_PAL = {...PILE_PAL, K: 'f8cc30', k: 'b08010', O: '6a6a78', P: 'f0b820', h: '2a1a08'};
const AQUARIUM = [
  '................',
  '................',
  'GGGGGGGGGGGGGGG.',
  'GWjjjjjjjjjjjjG.',
  'GWjjjjjjLjjjjjG.',
  'GjWjjjjLYLjjjjG.',
  'GjjjjjjjLjjjjjG.',
  'GjjjejjjjjjjejG.',
  'GjjjEejjjjjjEjG.',
  'GjjeEjjjjjjeEjG.',
  'GqQqqQqqQqqQqqG.',
  'GGGGGGGGGGGGGGG.',
  'ggggggggggggggg.',
];
const AQUARIUM_PAL = {G: '4a5a66', g: '2e3a44', W: 'e8fbff', j: '9ad8ec', L: 'fff4b0', Y: 'ffd23a',
  e: '3a8c46', E: '1e5a2c', q: 'c9b98f', Q: '8a7a5a'};
const EBONY_PAL = {L: '5a4a6a', q: '7a6a8a', s: '56565e', M: '504a44', N: '3a3632', t: '6a665e', n: '2a2624',
  W: '5a5a66', C: '4a4a56', i: '2e2e38', c: '34343e', y: '5a5644'};
const CONTAINER_ART = {
  CHEST: {rows: PILE, pal: PILE_PAL, split: 10, eyes: [[1, 6], [3, 6]]},
  LOCKED_CHEST: {rows: LOCKED_PILE, pal: LOCKED_PAL, split: 10, eyes: [[1, 6], [3, 6]]},
  CRYSTAL_CHEST: {rows: AQUARIUM, pal: AQUARIUM_PAL, split: 10, eyes: [[3, 5], [11, 5]]},
  EBONY_CHEST: {rows: PILE, pal: EBONY_PAL, split: 10, eyes: [[1, 6], [3, 6]]},
};
for (const [name, a] of Object.entries(CONTAINER_ART)) put(name, a.rows, a.pal);

// ---------------------------------------------------------------- g) Writers-Room-Abgleich
// Items the Writers Room renamed (items_de.properties) whose upstream icon no longer fitted.
// THROWING_KNIFE (Souvenir-Brieföffner) is redrawn in a) above; the Discokugel-Stab needs
// the upstream crystal rod and is built in buildDiscoWand() from main().
cat('g) Writers-Room-Abgleich', 'ANKH', 'EYE_OF_NEWT', 'FERRET_TUFT', 'PETRIFIED_SEED', 'SALT_CUBE', 'BLOOD_VIAL',
  'WAND_PRISMATIC_LIGHT');

// Zweitschlüssel: brass house key hanging from a crocheted pink heart (the neighbour's tag).
// Upright like the upstream ankh; the blessed one keeps using this cell with the pale
// yellow glow from Ankh.glowing(), so the key needs no second sprite.
put('ANKH', [
  '..........',
  '.mm.mm....',
  'mPmmmmx...',
  'mmmmmmx...',
  '.mmmmx....',
  '..mmx.....',
  '...G......',
  '..1111....',
  '.122223...',
  '.12..23...',
  '.122223...',
  '..3223....',
  '...23.....',
  '...2333...',
  '...23.....',
  '...333....',
], {m: 'e86aa6', P: 'f8c0da', x: 'a8306c', G: '9a98a2', 1: 'f8e27a', 2: 'd9a922', 3: '8c6410'});
// Milchglasbrille: horn-brown frame with the bridge on top, two frosted lenses (bathroom-window
// glass), folded temples underneath
put('EYE_OF_NEWT', [
  '............',
  '............',
  '..kk....kk..',
  '.kWjkkkkWjk.',
  '.kjWk..kjWk.',
  '.ksjk..ksjk.',
  '.kjWk..kjWk.',
  '.kWsk..kWsk.',
  '..kk....kk..',
  '.k........k.',
  '..zzzzzzzz..',
], {k: '7a4a22', z: '4a2c16', W: 'f4f6f6', j: 'd6e2e4', s: 'aabcc2'});
// Stadttaubenfeder: grey pigeon feather, dark wing bar, green-violet neck sheen, pale quill
put('FERRET_TUFT', [
  '................',
  '...........sG...',
  '.........GGsWg..',
  '........kksWGg..',
  '.......GGkWzgg..',
  '......GGsWzzg...',
  '.....GGsWGgg....',
  '....ElsWGgg.....',
  '...GlEWVgg......',
  '...sEWVEg.......',
  '...sWGEg........',
  '...nGg..........',
  '..n.............',
  '.n..............',
], {s: 'c9c8cf', G: '9a98a2', g: '76747e', k: '3a3844', z: '2e2d36', W: 'e8e8ec', n: 'd8d2c0',
  E: '4aa27a', l: '8ad8a8', V: '8a5aa8'});
// versteinerte Samenbombe: round stone ball with fossil seeds and a stone sprout on top
put('PETRIFIED_SEED', [
  '.........',
  '....e....',
  '..sWeC...',
  '.sWCCCd..',
  '.CCnCCd..',
  '.CCCCnd..',
  '.dnCdgd..',
  '..ddgd...',
], {e: '8a9a7a', W: 'eeeadc', s: 'd6d2c0', C: 'bcb8a2', d: '908c78', g: '6c6a5c', n: 'b08a52'});
// Streusalz-Brocken: rough, nearly cubic lump of road salt with grey-brown street grit
put('SALT_CUBE', [
  '............',
  '....WWW.....',
  '..WWWCWWW...',
  '.CWWCWWWWCs.',
  '.sCCWWWCCsG.',
  '.sssssCsGGG.',
  '.sWssnsGGgG.',
  '.sssssGGGGg.',
  '.snWssGgGnG.',
  '.sssssGGGGg.',
  '..sssnGGgg..',
  '...ssGGg....',
], {W: 'fbfaf6', C: 'e6e2d8', s: 'cfccc4', G: 'a8a49a', g: '85817a', n: '7a5a3a'});
// Blutröhrchen: lab blood tube with a lilac screw cap, white label and dark red blood
put('BLOOD_VIAL', [
  '......',
  '.wVVv.',
  '.wVVv.',
  '.vvvv.',
  '.JWFF.',
  '.CCCd.',
  '.CrrC.',
  '.CCCd.',
  '.J12F.',
  '.J12F.',
  '.J23F.',
  '.J23F.',
  '.J33F.',
  '..44..',
], {w: 'd8b8f0', V: 'a878d8', v: '6c48a0', J: 'dadadad1', F: 'aeaeaed1', W: 'ffffffd1', C: 'f6f4ec', d: 'c8c2b0',
  r: 'bb0000', 1: 'e52600', 2: 'bb0000', 3: '880000', 4: '550000'});

// Discokugel-Stab: the upstream translucent crystal rod (kept pixel for pixel below row 5),
// topped by a small mirror ball with coloured glints instead of the plain crystal tip.
const DISCO_BALL = [
  '.sWs.',
  'sWmWs',
  'GsWsj',
  'gGsLg',
  '.gGg.',
];
function buildDiscoWand(up) {
  const cell = cellOf('WAND_PRISMATIC_LIGHT'), [cx, cy] = cellXY(cell);
  const g = Array.from({length: 16}, () => Array(16).fill(null));
  for (let y = 5; y < 16; y++) for (let x = 0; x < 16; x++) {
    const p = getPx(up, cx + x, cy + y);
    if (p[3] && !(p[0] === 0 && p[1] === 0 && p[2] === 0 && p[3] === OUTLINE[3])) g[y][x] = p;
  }
  const P = {...PAL, m: 'f07ab8', j: '9af0ff', L: 'fff09a'};
  DISCO_BALL.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') g[1 + y][8 + x] = col(P[ch]); }));
  putGrid('WAND_PRISMATIC_LIGHT', addOutline(g));
}

// ---------------------------------------------------------------- h) Lachgasflasche (BOMB, DBL_BOMB)
// Writers Room: the standard bomb is a "Lachgasflasche", a garish 2 kg gas cylinder with a
// metal valve and an unreadable scribbled label. Upstream has no particle emitter on a lit
// bomb (Bomb.emitter() is not overridden, a lit fuse only adds the red Glowing 0xFF0000);
// the valve's outlet sits top right where the fuse tip was (upstream spark pixel 8,1).
// Only BOMB and DBL_BOMB are redrawn: every other bomb has its own upstream cell and does
// not reuse the standard bomb graphic.
cat('h) Lachgasflasche', 'BOMB', 'DBL_BOMB');
const GAS_BOTTLE = [
  '..........',
  '...kGGk...',
  '....sG....',
  '...gsWGsG.',
  '..mPmmmx..',
  '.mPmmmmxx.',
  '.CWCCCCCd.',
  '.CCkCCkCd.',
  '.CkCkCkCd.',
  '.mPmmmmxx.',
  '.mmmmmxxx.',
  '..xxxxxx..',
];
const GAS_PAL = {m: 'ec4a9a', P: 'f890c8', x: 'a8246a', C: 'f6f4ec', d: 'c8c2b0', k: '3a3844',
  G: '9a98a2', s: 'c9c8cf', W: 'f4f3ee', g: '66646e'};
put('BOMB', GAS_BOTTLE, GAS_PAL);
// Doppelpack: a turquoise bottle behind, the pink one in front
{
  const back = GAS_BOTTLE.map(r => ('....' + r).slice(0, 14).replace(/[mPx]/g, c => ({m: 'T', P: 'j', x: 't'})[c]));
  const rows = back.map((r, y) => [...r].map((c, x) => (GAS_BOTTLE[y][x] && GAS_BOTTLE[y][x] !== '.') ? GAS_BOTTLE[y][x] : c).join(''));
  put('DBL_BOMB', rows, GAS_PAL);
}

// ================================================================ Art-Runde 2 (items2)
// Every cell that was still pixel-identical to upstream and belongs to an item the game can
// show in Neukölln. Families that must stay distinguishable (rings, darts, summon spells,
// brews, elixirs) take their identifying colours per cell from the upstream atlas in
// buildRound2(); the placeholders (empty slot silhouettes) are traced from the new icons in
// buildHolders(). See docs/NEUKOELLN-ART-ITEMS.md, section "Art-Runde 2".

// ---------------------------------------------------------------- i) wands (all 14x14)
cat('i) Zauberstäbe', 'WAND_MAGIC_MISSILE', 'WAND_FIREBOLT', 'WAND_FROST', 'WAND_LIGHTNING', 'WAND_DISINTEGRATION',
  'WAND_CORROSION', 'WAND_LIVING_EARTH', 'WAND_BLAST_WAVE', 'WAND_CORRUPTION', 'WAND_WARDING', 'WAND_REGROWTH',
  'WAND_TRANSFUSION');

// Konfetti-Werfer: striped party-popper tube, pull string below, confetti bursting top right
put('WAND_MAGIC_MISSILE', [
  '..............',
  '.........L..m.',
  '.......m...j..',
  '..........Y...',
  '........sWs.j.',
  '.......sPmWs..',
  '......mPmmWs..',
  '.....YmmYms...',
  '....mYYmmY....',
  '...mmmYYx.....',
  '...xmmmxx.....',
  '..xxxmxx......',
  '..kx..........',
  '.k............',
], {m: 'ec4a9a', P: 'f890c8', x: 'a8246a', Y: 'f6d23a', j: '5ad8f0'});
// Flambierbrenner: red lacquered gas torch with gold leaf, steel nozzle, blue/orange flame
put('WAND_FIREBOLT', [
  '..............',
  '...........q..',
  '..........qLq.',
  '.........iqL..',
  '........Uii...',
  '.......GsU....',
  '......GsG.....',
  '....kRRG......',
  '...kRpYRk.....',
  '..RRpRRr......',
  '..RpRYRr......',
  '..RRRRr.......',
  '...rrr........',
  '..............',
], {R: 'd02c2c', p: 'f06a5a', r: '8a1616', Y: 'f0c43a', U: '3a6ae0', i: '9ad0ff'});
// Kältespray: white first-aid cold spray with a blue band and snowflake, icy spray head
put('WAND_FROST', [
  '..............',
  '...jj.....j.W.',
  '..jWjk..W.j...',
  '..jjjk.jWj..j.',
  '..WWWWW..W....',
  '..WiiiWs....j.',
  '..WUWUis......',
  '..WiUiis......',
  '..WUWUis......',
  '..WiiiWs......',
  '..WWWWWs......',
  '..sWWWWs......',
  '...ssss.......',
  '..............',
], {j: 'a8f0ff', U: '3a78d8', i: '9cc8f4', s: 'b8c4d0'});
// Starkstromkabel: thick black site cable in an S bend, two bare copper ends with an arc
put('WAND_LIGHTNING', [
  '..............',
  '..........L.A.',
  '.........L.Aq.',
  '........jLjA..',
  '.......zzL.A..',
  '......zZz.....',
  '.....zZz......',
  '....zZz.......',
  '....zZzz......',
  '.....zZZz.....',
  '...zzzZz......',
  '..zZZzz.......',
  '..Aq..........',
  '.A............',
], {Z: 'f0b020', z: 'a86a10', A: 'c86a2a', q: 'f0a060', L: 'fff2a0', j: 'b8e8ff'});
// Laserpointer: slim obsidian pen with a silver clip, violet beam to a red dot
put('WAND_DISINTEGRATION', [
  '..............',
  '...........RR.',
  '..........RpR.',
  '.........w.R..',
  '........w.....',
  '.......w......',
  '......Vw......',
  '.....zVz......',
  '....zkz.......',
  '...zkzs.......',
  '..zkz.........',
  '..kzs.........',
  '..zz..........',
  '..............',
], {z: '1c1824', k: '3c3448', V: '9a5ae0', w: 'c9a0ff', R: 'e8283a', p: 'ff8a9a'});
// Rostlöser-Sprüher: ash-grey spray can with a pistol grip, orange gem at the nozzle
put('WAND_CORROSION', [
  '..............',
  '.........a....',
  '....ggqA.a.a..',
  '...sGGAq..a...',
  '...gGGk....a..',
  '..GGGGGG......',
  '..GsGGGg......',
  '..GsAAGg......',
  '..GsAAGgkk....',
  '..GsGGGgzk....',
  '..GsGGGg.zk...',
  '..GGGGGg..z...',
  '...gggg.......',
  '..............',
], {G: '8a8a90', s: 'b0b0b6', g: '5c5c64', A: 'e07818', q: 'ffb050', a: 'c08a4a', k: '3a3a44', z: '26262e'});
// Bauschaum-Sprüher: foam gun with a long nozzle, cartridge with glowing yellow streaks
put('WAND_LIVING_EARTH', [
  '..............',
  '...cc.........',
  '..cLcc........',
  '..cYLc........',
  '..cLYc........',
  '..cYLc........',
  '..ccccc...YL..',
  '..kRRRRGGsLYL.',
  '...kRk....YL..',
  '...kRk........',
  '...kRk........',
  '...kkk........',
  '..............',
  '..............',
], {R: 'c0302c', c: '8a8478', L: 'fff27a', Y: 'e6c23a'});
// Laubbläser: marbled orange blower with gold trim, long tube, black gem, blown leaves
put('WAND_BLAST_WAVE', [
  '..............',
  '...........E..',
  '.........l..q.',
  '..........E...',
  '........zk..A.',
  '.......GsG....',
  '......GsG.....',
  '...kkGsG......',
  '..AAAAGk......',
  '.AqAYAAk......',
  '.AAkkqAk......',
  '.AqAAAAk......',
  '..aaaaa.......',
  '..............',
], {A: 'e0701c', q: 'f6b070', a: '9a4410', Y: 'f0d040', l: 'c0a030', E: 'a86a2a'});
// Influencer-Ringlicht: glowing ring on a selfie pole, phone in the ring, skull sticker
put('WAND_CORRUPTION', [
  '..............',
  '........WWW...',
  '.......W...W..',
  '......W.kk..W.',
  '......W.kw..W.',
  '......W.kk..W.',
  '.......W...W..',
  '........WsW...',
  '.......GgS....',
  '......Gg......',
  '.....Gg.......',
  '....Gg........',
  '...kk.........',
  '..............',
], {W: 'fbe8ff', w: '9a5ae0', S: 'f4f3ee'});
// Überwachungsmast: short metal mast, grey camera with a violet lens, red rec light
put('WAND_WARDING', [
  '..............',
  '..kkkkkkkk....',
  '..Gs....kk....',
  '..Gs..sWWWs...',
  '..Gs..GRGGGk..',
  '..Gs..ggggkwV.',
  '..Gs......V...',
  '..Gs..........',
  '..Gs..........',
  '..Gs..........',
  '..Gs..........',
  '..Gs..........',
  '.kkkkk........',
  '..............',
], {V: '9a5ae0', w: 'd0b0ff', R: 'e8283a'});
// Guerilla-Gartenschlauch: coiled green hose, yellow spray gun, water and a sprout
put('WAND_REGROWTH', [
  '..............',
  '..........j.j.',
  '...........j..',
  '........YYk.j.',
  '.......YLYk...',
  '......eEEk....',
  '...EEEE.......',
  '..ElEEeE......',
  '.El....Ee.....',
  '.Ee..l.Ee.....',
  '.EeE.El.e.....',
  '..eEEEEe......',
  '...eeee.......',
  '..............',
], {j: '9ad8f8'});
// Free-Hugs-Schild: hand-painted cardboard sign, magenta heart, black gem in the corner
put('WAND_TRANSFUSION', [
  '..............',
  '..MMMMMMMMMz..',
  '..MNNNNNNNNk..',
  '..MNmmNmmNNn..',
  '..MNmPmmmNNn..',
  '..MNNmmmNNNn..',
  '..MNNNmNNNNn..',
  '..MNNNNNNNNn..',
  '..nnnnbnnnnn..',
  '......bN......',
  '......bN......',
  '......bN......',
  '.....nbNn.....',
  '..............',
], {M: 'e0c08a', N: 'c9a06a', n: '9a7446', b: '7a4a22', m: 'd8308c', P: 'f490c8', z: '1d1b22', k: '4a4458'});

// ---------------------------------------------------------------- j) rings (8x10, gem colour per cell)
// Flohmarkt-Ring: chunky tarnished silver band with a big glass stone. The stone takes the
// light/mid/dark tone of the upstream gem in the same cell, so each unknown ring keeps its
// colour identity (the gem type is shuffled per run).
cat('j) Ringe', ...['GARNET', 'RUBY', 'TOPAZ', 'EMERALD', 'ONYX', 'OPAL', 'TOURMALINE', 'SAPPHIRE', 'AMETHYST',
  'QUARTZ', 'AGATE', 'DIAMOND'].map(n => 'RING_' + n));
const RING_ART = [
  '........',
  '..W12...',
  '.112223.',
  '.s1223g.',
  '.Gs..gg.',
  '.G....g.',
  '.Gg..gg.',
  '..gggg..',
];
// ---------------------------------------------------------------- k) runestones (14x12)
// Kieselsteine: a warm grey pebble with a Kiez motif painted or stuck on, one per stone type
// (stones are always identified, so the motif only needs to match the German name).
cat('k) Runensteine', 'STONE_AGGRESSION', 'STONE_AUGMENTATION', 'STONE_FEAR', 'STONE_BLAST', 'STONE_BLINK',
  'STONE_CLAIRVOYANCE', 'STONE_SLEEP', 'STONE_DETECT', 'STONE_ENCHANT', 'STONE_FLOCK', 'STONE_INTUITION', 'STONE_SHOCK');
const PEBBLE = [
  '..............',
  '.....1111.....',
  '...11222211...',
  '..122222222.3.',
  '.12222222223..',
  '.12222222223..',
  '.22222222223..',
  '.3222222223 ..',
  '..33222223 4..',
  '...33333344...',
  '.....4444.....',
].map(r => r.replace(/ /g, '3'));
const PEBBLE_PAL = {1: 'cac4b6', 2: 'a8a296', 3: '7e786e', 4: '5c574f'};
// motif, top-left position on the pebble, extra colours
const STONE_MOTIF = {
  // Stänker-Stein: speech bubble with an exclamation mark (a Kiezgruppe comment)
  AGGRESSION: [['WWWWW', 'WWRWW', 'WWRWW', 'WWWWW', 'WW.WW', 'W....'], 4, 2, {R: 'd82a2a'}],
  // Tuning-Stein: yellow sticker with "tiefer" chevrons
  AUGMENTATION: [['YYYYYY', 'YkYYkY', 'YYkkYY', 'YkYYkY', 'YYkkYY', 'YYYYYY'], 4, 3, {Y: 'f6d23a', k: '2a2932'}],
  // Schreck-Stein: red dunning letter wrapped round the stone
  FEAR: [['RRRRRRR', 'RWWWWWR', 'RRWWWRR', 'RWRRRWR', 'RWWWWWR', 'RRRRRRR'], 3, 3, {R: 'd02c2c', W: 'fbeee8'}],
  // Böller-Stein: a firecracker cemented into the cobble, fuse on top
  BLAST: [['..L..', '..k..', '.RRR.', '.RpR.', '.WWW.', '.RRR.', '.rrr.'], 4, 0, {R: 'd02c2c', p: 'f06a5a', r: '8a1616'}],
  // Blinzelstein: black marker scribble ("bin gleich wieder da")
  BLINK: [['kk.k.kk', '.k.kk.k', '.......', 'kk.kkk.', '.kk..k.'], 3, 3, {k: '1d1b22'}],
  // Hellseh-Stein: painted third eye
  CLAIRVOYANCE: [['..VVVV..', '.VWWWWV.', 'VWWuuWWV', '.VWWWWV.', '..VVVV..'], 3, 3, {V: '8a4cc8', u: '2a3c8c'}],
  // Mittagsschlaf-Stein: blue zZ
  SLEEP: [['UUUU...', '..U.iii', '.U...i.', 'UUUUiii'], 3, 3, {U: '2c50b8', i: '6a8ee8'}],
  // Gutachter-Stein: round inspection seal with a tick
  DETECT: [['.UUU.', 'UUUUW', 'WUUWU', 'UWWUU', '.UUU.'], 4, 3, {U: '2e8a4a', W: 'f4f3ee'}],
  // Verzauberungs-Stein: purple sparkle
  ENCHANT: [['..w..', '..V..', 'wVWVw', '..V..', '..w..'], 4, 3, {V: '8a4cc8', w: 'c9a0ff'}],
  // Schafherden-Stein: little painted sheep
  FLOCK: [['.WWW..', 'WWWWkk', 'WWWWk.', '.k.k..'], 4, 3, {k: '1d1b22'}],
  // Bauchgefühl-Stein: yellow question mark
  INTUITION: [['.LLL.', 'L...L', '...L.', '..L..', '.....', '..L..'], 4, 2, {L: 'f6d23a'}],
  // Weidezaun-Stein: yellow lightning bolt with a scrap of fence wire
  SHOCK: [['...LL', '..LL.', '.LLLL', '...L.', '..L..', '.L...'], 4, 2, {L: 'f8e040'}],
};
for (const [n, [motif, ox, oy, pal]] of Object.entries(STONE_MOTIF)) {
  const rows = PEBBLE.map(r => [...r.padEnd(14, '.')]);
  motif.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') rows[oy + y][ox + x] = ch; }));
  put('STONE_' + n, rows.map(r => r.join('')), {...PEBBLE_PAL, ...pal});
}

// ---------------------------------------------------------------- l) bombs: the Lachgasflasche family
// Same bottle as BOMB (valve on top, label band), each bomb in its own body colour with a
// motif on the label; the four wide cells (13x12) use a one row shorter bottle with the
// effect drawn beside it.
cat('l) Bomben', 'FIRE_BOMB', 'FROST_BOMB', 'REGROWTH_BOMB', 'SMOKE_BOMB', 'FLASHBANG', 'HOLY_BOMB', 'WOOLY_BOMB',
  'NOISEMAKER', 'ARCANE_BOMB', 'SHRAPNEL_BOMB');
const SHORT_BOTTLE = GAS_BOTTLE.filter((_, y) => y !== 2);
function bombVariant(base, body, label, extra = [], pal = {}) {
  // body: {m, P, x} colours; label: 3 rows of 7 chars laid over label columns 1..7
  const rows = base.map(r => [...r.padEnd(13, '.')]);
  const ly = base.findIndex(r => r.includes('CWC'));
  label.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') rows[ly + y][1 + x] = ch; }));
  for (const [x, y, ch] of extra) rows[y][x] = ch;
  return [rows.map(r => r.join('')), {...GAS_PAL, ...body, ...pal}];
}
const bombExtras = (s) => s.flatMap((r, y) => [...r].map((ch, x) => [x, y, ch]).filter(p => p[2] !== '.'));
// Grillkohle-Bombe: charcoal bottle, flame on the label, two glowing briquettes beside it
put('FIRE_BOMB', ...bombVariant(SHORT_BOTTLE, {m: '4a4852', P: '6e6c78', x: '2a2830'},
  ['CCCAqCC', 'CCAqLAC', 'CCAAAAd'],
  bombExtras(['', '', '', '', '', '', '', '', '.........zAz', '........zqAz', '........zzzz']),
  {A: 'e86a1a', q: 'f8a040', L: 'fff27a', z: '2a2830'}));
// Trockeneis-Bombe: pale blue bottle, snowflake label, white vapour curling out
put('FROST_BOMB', ...bombVariant(SHORT_BOTTLE, {m: '8ac8f0', P: 'c8ecff', x: '4a8ac0'},
  ['CCCUCCC', 'CCUUUCC', 'CCCUCCd'],
  bombExtras(['', '', '..........W', '.........W.W', '..........WW', '.........W..', '..........W.', '', '.........W.W', '..........W']),
  {U: '3a78d8', W: 'e8f8ff'}));
// Wildwuchs-Bombe: green bottle, leaf label, a weed growing out beside it
put('REGROWTH_BOMB', ...bombVariant(SHORT_BOTTLE, {m: '4a9a3c', P: '86cc62', x: '2c6a24'},
  ['CCCElCC', 'CCElECC', 'CCCeCCd'],
  bombExtras(['', '.........l.', '........lEl', '.........E..', '........El', '.........Ee', '........lE.', '.........E.', '........eE.', '.........E.', '.........e.']),
  {E: '3c8c3c', l: '86cc62', e: '1f5a2c'}));
// Nebelkerze: grey bottle, cloud label, grey smoke puffs
put('SMOKE_BOMB', ...bombVariant(SHORT_BOTTLE, {m: '8a8a94', P: 'b8b8c0', x: '5a5a64'},
  ['CCssCCC', 'CssssCC', 'CCCCCCd'],
  bombExtras(['', '.........ss', '........sGGs', '.........sG.', '..........ss', '.........sGs', '..........G']),
  {s: 'c9c8cf', G: '9a98a2'}));
// Stroboskop-Böller: yellow bottle, starburst label
put('FLASHBANG', ...bombVariant(GAS_BOTTLE, {m: 'f0d030', P: 'fff28a', x: 'b89410'},
  ['CkCWCkC', 'CCWLWCC', 'CkCWCkd'], [], {L: 'fff27a', k: '3a3844'}));
// Weihwasser-Böller: white-blue bottle, blue drop with a golden halo on the label
put('HOLY_BOMB', ...bombVariant(GAS_BOTTLE, {m: 'e8f0fa', P: 'ffffff', x: 'a8b8d0'},
  ['CYYYYCC', 'CCCUCCC', 'CCUUUCd'], [], {Y: 'f0c43a', U: '3a78d8'}));
// Streichelzoo-Bombe: fluffy wool-covered bottle, sheep face on the label
put('WOOLY_BOMB', ...bombVariant(GAS_BOTTLE, {m: 'eeeae0', P: 'ffffff', x: 'c0baa8'},
  ['CCCCkkC', 'CCCCkkC', 'CkCkCCd'], [[1, 4, 'P'], [3, 4, 'x'], [6, 4, 'x'], [2, 9, 'x'], [5, 9, 'x'], [4, 10, 'x']],
  {k: '2a2932'}));
// Ruhestörer: red bottle, black loudspeaker and sound waves on the label
put('NOISEMAKER', ...bombVariant(GAS_BOTTLE, {m: 'd02c2c', P: 'f06a5a', x: '8a1616'},
  ['CkCCkCC', 'kkkCCkC', 'CkCCkCd'], [], {k: '2a2932'}));
// Esoterik-Böller: purple bottle, yellow moon and star
put('ARCANE_BOMB', ...bombVariant(GAS_BOTTLE, {m: '7a3ab0', P: 'b890e0', x: '4a2070'},
  ['CYYCCYC', 'CYCCYYY', 'CYYCCYd'], [], {Y: 'e6b820'}));
// Schrottbombe: rusty bottle with a nut and screws taped on
put('SHRAPNEL_BOMB', ...bombVariant(GAS_BOTTLE, {m: '9a5a2a', P: 'c8844a', x: '5e3414'},
  ['CGGGCCC', 'GgkgGCs', 'CGGGCsd'], [[2, 5, 'G'], [6, 10, 'G'], [3, 9, 's']], {G: '9a98a2', g: '66646e', k: '3a3844', s: 'c9c8cf'}));


// ---------------------------------------------------------------- m) artefacts
cat('m) Artefakte', 'ARTIFACT_CAPE', 'ARTIFACT_HOURGLASS', 'ARTIFACT_CHAINS', 'ARTIFACT_HORN1', 'ARTIFACT_HORN2',
  'ARTIFACT_HORN3', 'ARTIFACT_HORN4', 'ARTIFACT_CHALICE1', 'ARTIFACT_CHALICE2', 'ARTIFACT_CHALICE3', 'ARTIFACT_SANDALS',
  'ARTIFACT_SHOES', 'ARTIFACT_BOOTS', 'ARTIFACT_GREAVES', 'ARTIFACT_ROSE1', 'ARTIFACT_ROSE2', 'ARTIFACT_ROSE3', 'PETAL',
  'SANDBAG');
// Nietenweste: black punk vest with silver studs and a red patch
put('ARTIFACT_CAPE', [
  '................',
  '....zz....zz....',
  '...zZz....zZz...',
  '..zZsZz..zZsZz..',
  '..zZZZZzzZZZZz..',
  '..zsZsZzzZsZsz..',
  '..zZZZZzzZRRRz..',
  '..zsZsZzzZRWRz..',
  '..zZZZZzzZRRRz..',
  '..zZsZZzzZZsZz..',
  '..zZZZZzzZZZZz..',
  '..zzzzzzzzzzzz..',
], {Z: '44444e', z: '26262e', s: 'e0e0e8', R: 'c83030', W: 'f4f3ee'});
// Eieruhr des Bürgeramts: beige office sand timer with a waiting ticket on a string
put('ARTIFACT_HOURGLASS', [
  '.............',
  '.CCCCCCCCCk..',
  '.cdddddddck..',
  '..dsWWWsd.k..',
  '..d.sYs.d.k..',
  '..d..Y..d.WW.',
  '..d..Y..d.Wr.',
  '..d.sYs.d.WW.',
  '..dsYYYsd.Wr.',
  '..dYYYYYd.WW.',
  '.cdddddddc...',
  '.CCCCCCCCC...',
], {C: 'ece2c8', c: 'c8bc98', d: 'a89870', s: 'c8dce4', W: 'f8f6ee', Y: 'e8c050', r: 'd83a3a', k: '5a5448'});
// Äther-Spanngurte: rolled-up orange ratchet strap, loose end with the steel ratchet, ghost glow
put('ARTIFACT_CHAINS', [
  '................',
  '.......j........',
  '....AAAAAA......',
  '.j.AqqqqqqA.....',
  '..AqAAAAAAqA..j.',
  '..AqAaaaaAqA....',
  '..AqAaGGaAqA....',
  '..AqAaGGaAqA....',
  '..AqAaaaaAqA....',
  '..AqAAAAAAqA....',
  '.j.AqqqqqqAAAA..',
  '....AAAAAAqqqqA.',
  '..........sGGGs.',
  '.........jGkkkG.',
  '..........sggg..',
], {A: 'e89a20', q: 'f8d060', a: 'a86a10', j: '9af0ff'});
// Foodsharing-Tüte: green canvas bag with a heart, filling up with rescued food
const FOOD_BAG = [
  '...............',
  '...............',
  '...............',
  '...............',
  '.....ee..ee....',
  '....e..ee..e...',
  '...EEEEEEEEEe..',
  '...ElEEEEEEEe..',
  '...ElEWEWEEEe..',
  '...ElWWWWWEEe..',
  '...ElEWWWEEEe..',
  '...ElEEWEEEEe..',
  '...ElEEEEEEEe..',
  '...eeeeeeeeee..',
];
const FOOD_BAG_PAL = {E: '6aa84a', l: '8cc86a', e: '3e7a2c', W: 'f4f3ee', M: 'e0b070', N: 'b87a3a', n: '8a5424',
  R: 'd83030', p: 'f07060', A: 'e87a1a', q: 'f8a850', g: '2e8a3a', G: '5ac05a'};
const FOOD_FILL = [
  [],
  ['........M', '.......MN', '......MNn', '.....MNn.'],
  ['........M', '..RR...MN', '.RpRR.MNn', '.RRRRMNn.'],
  ['.G.....gM..', '.Gg....MNg.', '..gRR.MNnA.', '.RpRRMNnAq.', '.RRRRNnAq..'],
];
FOOD_FILL.forEach((fill, i) => {
  const rows = FOOD_BAG.map(r => [...r]);
  const top = 6 - fill.length;
  fill.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') rows[top + y][2 + x] = ch; }));
  put('ARTIFACT_HORN' + (i + 1), rows.map(r => r.join('')), FOOD_BAG_PAL);
});
// Plasmaspende-Ausweis: donor card with spiky metal corners; the blood drop fills with charge
const DONOR_CARD = [
  '............',
  '.s.......s..',
  '..WWWWWWWd..',
  '..WRRRRRWd..',
  '..WWWWWWWd..',
  '..WWWoWWWd..',
  '..WWo1oWWd..',
  '..Wo111oWd..',
  '..Wo222oWd..',
  '..WWo2oWWd..',
  '..WWWWWWWd..',
  '..WkkkWWWd..',
  '..WWWWWWWd..',
  '.s.ddddddds.',
];
[['W', 'W'], ['W', 'R'], ['p', 'R']].forEach(([top, bottom], i) => {
  const rows = DONOR_CARD.map(r => r.replace(/o/g, 'r').replace(/1/g, top).replace(/2/g, bottom));
  if (i === 2) { rows[1] = '.s...p...s..'; rows[6] = '..WWrprWWd..'; }
  put('ARTIFACT_CHALICE' + (i + 1), rows, {W: 'f4f3ee', d: 'c8c2b0', R: 'd02c2c', r: '8a1616', p: 'f07878', s: 'c9c8cf', k: '8a8a98'});
});
// Barfußschuhe: four stages of the same pair (toe shoes, sneakers, boots, tall boots with moss)
const shoePair = (shoe, gap = 1) => shoe.map(r => '.' + r + '.'.repeat(gap) + r);
const SHOE_PAL = {Z: '3a8a86', z: '1f5a58', k: '2a2932', T: '6ab8b0', W: 'f4f3ee', E: '3c8c3c', l: '86cc62', n: '7a4a22'};
put('ARTIFACT_SANDALS', ['................', ...shoePair(['zz....', 'zZZzT.', 'zZZZTT', 'kkkkkk'])], SHOE_PAL);
put('ARTIFACT_SHOES', ['................', ...shoePair(['.zzz..', 'zZWZZ.', 'zZZZZT', 'WWWWWW'])], SHOE_PAL);
put('ARTIFACT_BOOTS', ['................', ...shoePair(['zZz...', 'zZZ...', 'zZW...', 'zZZZz.', 'zZZZZT', 'zZZZZZ', 'kkkkkk'])], SHOE_PAL);
put('ARTIFACT_GREAVES', ['................', ...shoePair(['El....', 'zZE...', 'zZl...', 'zZz...', 'zZz...', 'zWz...', 'zZz...', 'zZZz..', 'zZZZz.', 'zZZZZT', 'zZZZZZ', 'kkkkkk'])], SHOE_PAL);
// Vertrockneter Tannenbaum (Writers Room: the Dried Rose becomes a needle-dropping Christmas
// tree). DriedRose.java: ROSE1 at the start, ROSE2 from level 4, ROSE3 from level 9.
const TREE_PAL = {E: '3c8c3c', l: '6ab85a', e: '1f5a2c', n: '9a6a2a', N: 'c89040', b: '6a4020', s: 'e4e4f4',
  R: 'c83030', r: '8a1616', B: 'e83a4a', Y: 'f6d23a', L: 'fff4a0'};
put('ARTIFACT_ROSE1', [ // kahl und nadelnd
  '..............',
  '......b.......',
  '.....nbn......',
  '......b.......',
  '....n.b.n.....',
  '.....nbn......',
  '...n..b..n....',
  '....nnbnn.....',
  '..n...b...n...',
  '...nn.b.nn....',
  '....RRbRR.....',
  '..N.rrrrr.NN..',
], TREE_PAL);
put('ARTIFACT_ROSE2', [ // etwas grüner, Lametta-Rest
  '..............',
  '......b.......',
  '.....nEn......',
  '......E.......',
  '....nEEnn.....',
  '.....EbEs.....',
  '...nEsEEEn....',
  '....nEEsn.....',
  '..nEEnbEEsn...',
  '...nEEnEEn....',
  '....RRbRR.....',
  '...NrrrrrN....',
], TREE_PAL);
put('ARTIFACT_ROSE3', [ // Kugel und Stern
  '......Y.......',
  '.....YLY......',
  '......E.......',
  '.....lEE......',
  '....lEBEe.....',
  '.....EEs......',
  '...lEsEEEe....',
  '....lEEEse....',
  '..lEEEEEBEe...',
  '..sEEBEEEEee..',
  '....RRbRR.....',
  '....rrrrr.....',
], TREE_PAL);
// Vertrockneter Tannenzweig (the "petal" the ghost drops)
put('PETAL', [
  '........',
  '.....N..',
  '..N.nNn.',
  '...nb.N.',
  '..NbnN..',
  '..b.N...',
  '.b......',
], TREE_PAL);
// Tüte Spielplatzsand: clear bag of yellow sand, red toy shovel
put('SANDBAG', [
  '..........',
  '...WWW....',
  '....s.....',
  '..WYYYW...',
  '.WYYLYYWR.',
  '.WYLYYYWR.',
  '.WYYYYYWR.',
  '.WYYYYRRR.',
  '..WWWWRRR.',
], {W: 'dceaf0', s: 'b8c4d0', Y: 'e8c870', L: 'f8e4a0', R: 'e03a2c'});

// ---------------------------------------------------------------- n) darts (15x15, flight colour per cell)
// Kneipen-Dartpfeil: steel point top right (flight direction like upstream), knurled barrel,
// coloured flight. Tipped darts take their colour from the upstream tip of the same cell
// and show it on the dipped point and on the flight.
cat('n) Dartpfeile', 'DART', 'ROT_DART', 'INCENDIARY_DART', 'ADRENALINE_DART', 'HEALING_DART', 'CHILLING_DART',
  'SHOCKING_DART', 'POISON_DART', 'CLEANSING_DART', 'PARALYTIC_DART', 'HOLY_DART', 'DISPLACING_DART', 'BLINDING_DART');
const DART_ART = [
  '...............',
  '...............',
  '............TW.',
  '...........Ts..',
  '..........GsG..',
  '.........GWg...',
  '........GWg....',
  '.......gsg.....',
  '......kz.......',
  '.....kz........',
  '.11.kz.........',
  '.122z..........',
  '..2z12.........',
  '..z.223........',
  '.....3.........',
];

// ---------------------------------------------------------------- o) spells
cat('o) Zauber', 'WILD_ENERGY', 'PHASE_SHIFT', 'TELE_GRAB', 'UNSTABLE_SPELL', 'CURSE_INFUSE', 'MAGIC_INFUSE',
  'ALCHEMIZE', 'RECYCLE', 'RECLAIM_TRAP', 'RETURN_BEACON', 'SUMMON_ELE', 'SUMMON_ELE_FIRE', 'SUMMON_ELE_FROST',
  'SUMMON_ELE_SHOCK', 'SUMMON_ELE_CHAOS');
// Wilde Energie: a drill bit from Bohrlinde, still glowing orange
put('WILD_ENERGY', [
  '......',
  '..q...',
  '..s...',
  '.sGg..',
  '.Gsg..',
  '.gGs..',
  '.sGg..',
  '.Gsg..',
  '.gGs..',
  '.sGg..',
  '.AqA..',
  '.kzk..',
  '.kzk..',
  '.kkk..',
], {A: 'e86a1a', q: 'f8b040'});
// Zwangsumzug: moving box with tape and a blue "away" arrow
put('PHASE_SHIFT', [
  '............',
  '.MMMMYYMMMM.',
  '.NNNNYYNNNn.',
  '.NNNNYYNUNn.',
  '.NUUUUUUUUn.',
  '.NNNNNNNUNn.',
  '.NNNNNNNNNn.',
  '.NNNNNNNNNn.',
  '.nnnnnnnnnn.',
], {M: 'e0b878', N: 'c9965a', n: '98683a', Y: 'e8d8a8', U: '2c60c8'});
// Müllgreifer: aluminium litter picker, red handle, open jaws
put('TELE_GRAB', [
  '..........',
  '......A.A.',
  '......k.k.',
  '......kkk.',
  '.....sG...',
  '....sG....',
  '...sG.....',
  '.RRG......',
  '.RR.......',
], {A: 'f0a030'});
// Wundertüte: black paper bag, zigzag top, purple question mark, stray sparkles
put('UNSTABLE_SPELL', [
  '............',
  '...zkzkz....',
  '...kzkzk..m.',
  '..KKKKKKK...',
  '..KkkwwkK...',
  '.jKkwkkwK...',
  '..KkkkwkK...',
  '..KkkwkkK.L.',
  '..KkkkkkK...',
  '..KkkwkkK...',
  '..KKKKKKK...',
], {K: '2a2632', k: '3e3650', z: '1c1822', w: 'c090ff', m: 'f070b0', j: '70e0f0', L: 'fff070'});
// Fluchinfusion / Bestandsschutz-Upgrade: IV bags, cursed dark red and bright green with an arrow
const IV_BAG = [
  '..........',
  '....kk....',
  '...k..k...',
  '..WWWWWW..',
  '.WssssssW.',
  '.W111111W.',
  '.W122221W.',
  '.W1CCC21W.',
  '.W1CXC21W.',
  '.W122221W.',
  '.W233332W.',
  '..W3333W..',
  '...WWWW...',
  '....Gs....',
  '.....s....',
];
put('CURSE_INFUSE', IV_BAG, {W: 'e8e4f0', s: 'b8b4c8', 1: '7a1a2a', 2: '4e0e1c', 3: '2a0610', C: 'f4f3ee', X: '1d1b22'});
put('MAGIC_INFUSE', IV_BAG.slice(2), {W: 'e8f4f0', s: 'b8d4c8', 1: 'a8f0c0', 2: '5ad08a', 3: '2a9a5a', C: 'f4f3ee', X: '2a9a5a'});
// Flohmarkt-Zauber: price tag on a string and a gold coin
put('ALCHEMIZE', [
  '............',
  '.........kk.',
  '..CCCCCCk...',
  '.CCWCCCCCd..',
  '.CCCCCCCCd..',
  '.CCRRRCCCd..',
  '.CCCCCCCCd..',
  '.dddYYYddd..',
  '....YLLYy...',
  '....YLYYy...',
  '.....yyy....',
], {C: 'f6f4ec', d: 'c8c2b0', W: '8a8a98', R: 'd02c2c', k: '8a6a4a'});
// Tauschregal: little hallway swap shelf with books, a mug and a cup
put('RECYCLE', [
  '............',
  '.nnnnnnnnnn.',
  '.n.RR.....n.',
  '.n.RR.YY..n.',
  '.n.RR.Yy..n.',
  '.NNNNNNNNNN.',
  '.n..WW.U..n.',
  '.n.WiW.U..n.',
  '.n..WW.UU.n.',
  '.NNNNNNNNNN.',
  '.n........n.',
  '.nn......nn.',
], {R: 'c83030', U: '2c60c8', i: '6a8ee8'});
// Haufen-Recycling: knotted green dog-waste bag with a purple magic shimmer
put('RECLAIM_TRAP', [
  '..............',
  '......EE......',
  '.....E..E..w..',
  '......EE......',
  '.....ElEe.....',
  '....ElEEEe....',
  '...ElEEEEEe.w.',
  '...EEEEEEEe...',
  '.w..eeeeee....',
], {w: 'c090ff'});
// Nachhause-Taxi: phone with a map pin and a yellow taxi on the screen
put('RETURN_BEACON', [
  '........',
  '.kkkkkk.',
  '.kiiiik.',
  '.kiRRik.',
  '.kiRpik.',
  '.kiiRik.',
  '.kiiiik.',
  '.kiiLik.',
  '.kYYYYk.',
  '.kkiikk.',
  '.kiiiik.',
  '.kkkkkk.',
  '.kkGGkk.',
  '..kkkk..',
], {k: '2a2932', i: '9cc8f4', R: 'd82a2a', p: 'f4f3ee', Y: 'f6d23a', L: 'fff4a0'});
// Elementar beschwören: plastic lighter in the elemental colour (body from the upstream crystal)
const LIGHTER = [
  '........',
  '...4....',
  '..454...',
  '..565...',
  '...5....',
  '.sGGs...',
  '.GkkG...',
  '.sGGg...',
  '.1122...',
  '.1223...',
  '.1223...',
  '.1223...',
  '.1223...',
  '.1223...',
  '.2333...',
];

// ---------------------------------------------------------------- p) brews (Bowle) and elixirs (Flachmann)
cat('p) Bowlen und Elixiere', 'BREW_INFERNAL', 'BREW_BLIZZARD', 'BREW_SHOCKING', 'BREW_CAUSTIC', 'BREW_AQUA',
  'BREW_UNSTABLE', 'ELIXIR_HONEY', 'ELIXIR_AQUA', 'ELIXIR_MIGHT', 'ELIXIR_DRAGON', 'ELIXIR_TOXIC', 'ELIXIR_ICY',
  'ELIXIR_ARCANE', 'ELIXIR_FEATHER');
// Bowle: screw-top jar with a straw; liquid tones 1-3 from the upstream brew of the same cell
const JAR = [
  '.........',
  '.......R.',
  '......R..',
  '..sGGRGs.',
  '..gggRgg.',
  '.WwwwRwwW',
  '.W111R11W',
  '.W11a2a2W',
  '.W12a222W',
  '.W222233W',
  '.W233333W',
  '..WWWWWW.',
];
const SMALL_JAR = [
  '........',
  '.....R..',
  '..sGRs..',
  '..ggRg..',
  '.WwwRwW.',
  '.W11R1W.',
  '.W1a2aW.',
  '.W22a3W.',
  '.W2333W.',
  '..WWWW..',
];
const JAR_PAL = {W: 'eef8fc', w: 'c8e0e8', R: 'e84a6a'};
// accents: a = a slice, ice cube, bolt or bubble depending on the brew
const BREW_ACCENT = {INFERNAL: 'f8a040', BLIZZARD: 'f4fcff', SHOCKING: 'fff27a', CAUSTIC: 'c8f080', AQUA: 'e8f8ff', UNSTABLE: 'f070b0'};
// Flachmann: metal hip flask with a coloured label window (tones from the upstream elixir)
const FLASK = [
  '..........',
  '....zk....',
  '....Gs....',
  '..sWWWWs..',
  '.sW1111Gs.',
  '.W122223G.',
  '.W123323G.',
  '.W123323G.',
  '.W122223G.',
  '.sW3333Gg.',
  '..sGGGGg..',
];


// ---------------------------------------------------------------- q) trinkets and resins
cat('q) Kleinodien', 'PARCHMENT_SCRAP', 'MOSSY_CLUMP', 'TRAP_MECHANISM', 'MIMIC_TOOTH', 'CHAOTIC_CENSER', 'SPYGLASS',
  'LIQUID_METAL', 'ARCANE_RESIN');
// Formularfetzen: torn scrap of a form (Anlage B) with a blue stamp
put('PARCHMENT_SCRAP', [
  '..........',
  '.CCCCCCC..',
  '.CggggCC..',
  '.CCCCCCCd.',
  '.CssssCCd.',
  '.CCCCCCd..',
  '.CssCUUCd.',
  '.CCCUCUd..',
  '.CssCUUCd.',
  '.CCCCCCd..',
  '.CsssCd...',
  '.CCCd.....',
  '..Cd......',
], {C: 'f6f4ec', d: 'c8c2b0', s: 'a8a6b4', g: '8a8a98', U: '2c3aa0'});
// Moosklumpen: wet moss on a crumb of balcony concrete
put('MOSSY_CLUMP', [
  '............',
  '....lEl.....',
  '..lEEEElE...',
  '.lEEeEEEEl..',
  '.EEEEEeEEE..',
  '.eEeEEEEeE..',
  '..GGsGGGGe..',
  '..GsGGGgGg..',
  '...gGgGgg...',
  '....ggg.....',
], {G: 'a8a8a0', s: 'c8c8c0', g: '76766e'});
// Haufen-Mechanik: the red-brown core of a trap pile with its spring sticking out
put('TRAP_MECHANISM', [
  '.............',
  '......s......',
  '.....sGs.....',
  '......G......',
  '.....sGs.....',
  '......G......',
  '.....NNN.....',
  '....NMNNn....',
  '...NNRRNNn...',
  '..NMNRRNNNn..',
  '..NNNnnNNNn..',
  '.NMNNNNNNNNn.',
  '.nnnnnnnnnnn.',
], {N: 'a8482a', M: 'd07048', n: '6a2a18', R: 'e83a3a'});
// Sperrmüllzahn: a bent mattress spring with a scrap of striped fabric
put('MIMIC_TOOTH', [
  '........',
  '...W....',
  '...sW...',
  '..s.G...',
  '...GsG..',
  '..G..s..',
  '...sGG..',
  '..s..G..',
  '...GsG..',
  '..G..s..',
  '...sGG..',
  '..cCCc..',
  '.cCuCuc.',
  '..c..c..',
], {c: 'c8c2b0', C: 'f2eee0', u: '6a8ee8'});
// Chaos-Räucherstäbchen: wooden incense board, three sticks, smoke in three colours
put('CHAOTIC_CENSER', [
  '.............',
  '...m..j..l...',
  '..m..j..l....',
  '...m..j..l...',
  '..m..j..l....',
  '...A..A..A...',
  '...b..b..b...',
  '...b..b..b...',
  '...b..b..b...',
  '...b..b..b...',
  '.NNNNNNNNNNN.',
  '..nnnnnnnnn..',
], {m: 'f070b0', j: '70d8f0', l: 'a0e070', A: 'f8a040', b: '6a3a1a'});
// Gesprungenes Fernglas: black binoculars, the right lens cracked
put('SPYGLASS', [
  '...............',
  '...............',
  '..kZZk...kZZk..',
  '..ZZZZ...ZZZZ..',
  '..ZZZZkGkZZZZ..',
  '..ZZZZkGkZZZZ..',
  '..ZZZZ...ZZZZ..',
  '.kZZZZk.kZZZZk.',
  '.kzzzzk.kzzzzk.',
  '.kiUUik.kiUWik.',
  '.kUWiUk.kUUWUk.',
  '.kiUUik.kiWUik.',
  '.kkkkkk.kkkkkk.',
], {Z: '4a4a58', z: '2e2e38', k: '26262e', U: '3a78c8', i: '8ab8f0', W: 'f4fcff'});
// Flüssigmetall: squeezed repair tube with a bronze band and a silver drip
put('LIQUID_METAL', [
  '........',
  '...kk...',
  '...GG...',
  '..sWWs..',
  '..WssG..',
  '..WsWG..',
  '..WssG..',
  '..WAAG..',
  '..WAqG..',
  '..WAAG..',
  '..WssG..',
  '..sssg..',
  '..GgGg..',
  '...W....',
], {A: 'b87a2a', q: 'f0b860'});
// arkanes Harz: glitter shaker of violet and white powder
put('ARCANE_RESIN', [
  '............',
  '...sGGGGs...',
  '...GkGkGG...',
  '...gggggg...',
  '..WwVwVwW...',
  '..WVwWVwW...',
  '..WwVVwVW...',
  '..WVwVwwW...',
  '...WWWWW....',
  '..w....V....',
], {W: 'e8e4f4', V: '8a4cc8', w: 'f0e8ff'});

// ---------------------------------------------------------------- r) quest items and boss drops
cat('r) Quest und Bossbeute', 'CANDLE', 'DUST', 'EMBER', 'TOKEN', 'BLOB', 'SHARD', 'ESCAPE', 'STATUE', 'MASK',
  'CROWN', 'TENGU_BOMB', 'TENGU_SHOCKER', 'GEO_BOULDER');
// Zeremoniekerze: three red office-party candles melted into a clump, fir sprig and tinsel
put('CANDLE', [
  '............',
  '..L....L....',
  '..q..L.q....',
  '..k..q.k....',
  '.RRR.k.RR...',
  '.RpRRRRRpR..',
  '.RpRRpRRRR..',
  '.RRRRRRRRr..',
  '.RpRRRRRRr..',
  '.rrRRRRRrr..',
  '.ElEEsEsEl..',
], {R: 'd02c2c', p: 'f06a5a', r: '8a1616', q: 'f8a040', L: 'fff27a', s: 'e4e4f4'});
// Leichenstaub: an evil dust bunny from the archive, red eyes
put('DUST', [
  '............',
  '...s.s.s....',
  '..sGsGGs.s..',
  '.sGGGGGGGs..',
  '.GGRGGRGGG..',
  '.sGGGGGGGGs.',
  '..GGGGGGGg..',
  '.s.gGgGgg.s.',
  '....g.g.....',
], {G: '9a98a2', s: 'c9c8cf', g: '66646e', R: 'e02c2c'});
// Asche eines Elementars: coal lumps with glowing cracks
put('EMBER', [
  '............',
  '.....q......',
  '....qLq.....',
  '...zzAzz....',
  '..zAqzzAz...',
  '..zzzzAzzz..',
  '.zzAzzzzqz..',
  '.zzzqAzzzz..',
  '..zzzzzzz...',
], {z: '3a3238', A: 'e86a1a', q: 'f8a040', L: 'fff27a'});
// Eigentümermarke: brass cloakroom token with a hole and an embossed number
put('TOKEN', [
  '............',
  '....YYYY....',
  '...YLLLLy...',
  '..YLLkkLLy..',
  '..YLk..kLy..',
  '..YLLkkLLy..',
  '..YLyLyyLy..',
  '..YLyLLyLy..',
  '..YLyLyLLy..',
  '...yLLLLy...',
  '....yyyy....',
], {Y: 'd8a830', L: 'f0d060', y: '8a6410', k: '6a4c10'});
// Schleimklumpen: wobbly lump of the rent mould, grey-green with dark spores
put('BLOB', [
  '..........',
  '...lEl....',
  '..lEEEEl..',
  '.lEkEEkEe.',
  '.EEEEEEEe.',
  '.EeEEeEEe.',
  '..eeeeee..',
], {E: '7a8a5a', l: 'a8b880', e: '4a5a34', k: '2e3a24'});
// verfluchte Metallplatte: rusty plate with a riveted corner and a yellow-black warning stripe
put('SHARD', [
  '........',
  '.GsGGa..',
  '.GkGaGG.',
  '.YzYzYz.',
  '.GGaGGg.',
  '.aGGGag.',
  '.GGaGg..',
  '.gGGg...',
  '..gg....',
], {G: '8a8078', s: 'b0a8a0', g: '5e5650', a: 'a85a2a', Y: 'f0c830', z: '2a2932', k: '3a3844'});
// Fluchtkristall: emergency-exit green crystal with a white arrow
put('ESCAPE', [
  '........',
  '...l....',
  '..lE....',
  '..lEE...',
  '.lEEEe..',
  '.lEWEe..',
  '.lWWWe..',
  '.lEWEe..',
  '.lEWEe..',
  '.lEWEe..',
  '.lEEEe..',
  '..EEe...',
  '..Ee....',
  '...e....',
], {E: '2e9a4a', l: '7ae08a', e: '1a6a2c', W: 'f4fff4'});
// Obsidian-Statuette: the Filialist in black stone, green eyes, tie, grey plinth
put('STATUE', [
  '..........',
  '...zzz....',
  '..zZZZz...',
  '..zEZEz...',
  '..zZZZz...',
  '...zzz....',
  '..zZVZz...',
  '.zZZVZZz..',
  '.zZZVZZz..',
  '..zZZZz...',
  '..zZ.Zz...',
  '..zZ.Zz...',
  '.GGGGGGG..',
  '.ggkkkgg..',
], {Z: '3a3448', z: '1c1824', E: '5af07a', V: '6a3a9a', G: '8a8a94', g: '5a5a64', k: '3a3844'});
// Dienstmaske des Schalterspringers: green office eyeshade on an elastic band
put('MASK', [
  '...........',
  '...kkkkk...',
  '..k.....k..',
  '.kjjjjjjjk.',
  '.jTTTTTTTj.',
  '.TTTTTTTTT.',
  '..tTTTTTt..',
  '...ttttt...',
], {T: '3cb06a', j: '8ae0a8', t: '1a7a44', k: '2a2932'});
// Penthouse-Krone: golden crown whose points are little penthouses with glass fronts
put('CROWN', [
  '.............',
  '.YY..YYY..YY.',
  '.Yi..YiY..iY.',
  '.YYYYYYYYYYY.',
  '.YRYYiYYRYiY.',
  '.yyyyyyyyyyy.',
], {Y: 'f0c830', y: 'a87a10', i: '9ad8f8', R: 'e04a4a'});
// Schalterspringer: a rubber stamp with a lit fuse and a desk bell throwing sparks
put('TENGU_BOMB', [
  '..........',
  '.......L..',
  '......q...',
  '...NNk....',
  '...NMN....',
  '....N.....',
  '..zzzzz...',
  '.zZZZZZz..',
  '.RRRRRRR..',
], {M: 'e0b070', N: 'a86a30', R: 'c83030', Z: '4a4a58', z: '2a2932', q: 'f8a040', L: 'fff27a'});
put('TENGU_SHOCKER', [
  '..........',
  '....k..L..',
  '...sGs.L..',
  '..sWGGs...',
  '.sWGGGGs..',
  '.GGGGGGg..',
  '.kkkkkkkk.',
  '.zzzzzzz..',
  '.L.....L..',
], {W: 'f4f3ee', L: 'fff27a', z: '2a2932', k: '4a4a58'});
// Bauschutt statt Felsbrocken: concrete chunk with rusty rebar (Gnoll geomancer, Baustelle)
put('GEO_BOULDER', [
  '................',
  '.....a....a.....',
  '.....a...a......',
  '...ssaGGGaGs....',
  '..sGGGGGGGGGGs..',
  '.sGGGgGGGGGGGGg.',
  '.GGGGGGGGgGGGGg.',
  '.GGgGGGGGGGGGGg.',
  '.GGGGGGGGGGgGGg.',
  '.gGGGGgGGGGGGgg.',
  '..ggGGGGGGGGgg..',
  '...gggggggggg...',
], {G: 'a8a8a0', s: 'c8c8c0', g: '76766e', a: 'a85a2a'});

// ---------------------------------------------------------------- s) journal
cat('s) Journal', 'MASTERY', 'GUIDE_PAGE', 'ALCH_PAGE', 'SEWER_PAGE', 'PRISON_PAGE', 'CAVES_PAGE', 'CITY_PAGE', 'HALLS_PAGE');
// Kiez-Überlebensratgeber: yellow paperback guide, black title band, TV tower on the cover
put('MASTERY', [
  '.............',
  '.kYYYYYYYYY..',
  '.kYYYYYYYYYy.',
  '.kYzzzzzzzYy.',
  '.kYzWWzWWzYy.',
  '.kYzzzzzzzYy.',
  '.kYYYYsYYYYy.',
  '.kYYYYsYYYYy.',
  '.kYYYsGsYYYy.',
  '.kYYYYsYYYYy.',
  '.kYYYYsYYYYy.',
  '.kYYYsssYYYy.',
  '.kYYYYYYYYYy.',
  '.kkCCCCCCCCC.',
  '..kkkkkkkkk..',
], {Y: 'f0c830', y: 'b08a10', k: '6a4c10', z: '2a2932', W: 'f4f3ee', s: 'c9c8cf', G: '8a8a98', C: 'f6f4ec'});
const PAGE = [
  '..........',
  '.CCCCCCC..',
  '.CCCCCCCd.',
  '.CCCCCCCd.',
  '.CCCCCCd..',
  '.CCCCCCCd.',
  '.CCCCCCCd.',
  '.CCCCCCd..',
  '.CCCCCCCd.',
  '.dddddddd.',
];
const page = (name, over, pal) => {
  const rows = PAGE.map(r => [...r]);
  over.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.' && rows[y][x] !== '.') rows[y][x] = ch; }));
  put(name, rows.map(r => r.join('')), {C: 'f6f4ec', d: 'c8c2b0', ...pal});
};
// Kiezführer page: red title bar, tiny map with park, canal and pin
page('GUIDE_PAGE', ['', '', '..RRRR', '..EE.U', '.EEEUU.', '..E.UR', '...UU.', '..UU...'], {R: 'd02c2c', E: '5ab04a', U: '5a90e0'});
// Alchemy page: green header and a small bottle
page('ALCH_PAGE', ['', '', '..EEEE', '', '...s', '..sEs.', '..EEE.', '..ss.ss'], {E: '3c8c3c', s: 'a8a6b4'});
// Region lore: dirty letter, lined diary page, yellow site-log copy, rusty plate, glowing black plate
page('SEWER_PAGE', ['', '..kk.k', '..k.kk.', '.......', '..kkk.k', '..k.kk.', '.......', '..kk.k'], {C: 'd8ceb0', d: 'a09878', k: '5a5448'});
page('PRISON_PAGE', ['', '.R', '.RUUUUU', '.R', '.RUUUUU', '.R', '.RUUUUU', '.R'], {R: 'e07070', U: '8aa8e0'});
page('CAVES_PAGE', ['', '.sss.ss', '.s.s.s.', '.sss.ss', '.s.s.s.', '.sss.ss', '.s.s.s.', '.sss.ss'], {C: 'f0e090', d: 'c0a850', s: 'b8a040'});
page('CITY_PAGE', ['', '.o....o', '..kkk', '..k.kk', '..kk.k', '', '.o....o'], {C: 'a86a3a', d: '6a3a1a', k: '4a2410', o: 'd0a080'});
page('HALLS_PAGE', ['', '', '..ll.l', '..l.ll', '', '..ll.l', '..l.ll'], {C: '2a2632', d: '1a1822', l: '7af0a0'});

// ---------------------------------------------------------------- t) food
cat('t) Essen', 'BERRY', 'PHANTOM_MEAT', 'CHOC_AMULET', 'SPARKLING_POTION', 'RAINBOW_POTION');
// Hinterhofbeere: backyard blackberry with a leaf
put('BERRY', [
  '.........',
  '....El...',
  '...lEE...',
  '....e....',
  '..VwVV...',
  '.VwVVvV..',
  '.VVvVwV..',
  '.vVwVVv..',
  '..vVVv...',
  '...vv....',
], {V: '4a2c6a', w: '9a7ac0', v: '24143a'});
// Phantomfilet: translucent fillet of a phantom canal piranha
put('PHANTOM_MEAT', [
  '...............',
  '...............',
  '....wwwww......',
  '..wwWWWWWww..w.',
  '.wWWpWpWpWWwww.',
  '.wWWWWWWWWWWww.',
  '.wWpWpWpWWWw.w.',
  '..wwWWWWWww....',
  '....wwwww......',
], {W: 'e8d8ffb8', w: 'b8a0e0a8', p: 'ffffffd0'});
// "der unbefristete Mietvertrag?": a waffle shaped like the lease, white icing lines, red seal
put('CHOC_AMULET', [
  '................',
  '..MMMMMMMMMM....',
  '..MNMNMNMNMNn...',
  '..MWWWWWWWMNn...',
  '..MNMNMNMNMNn...',
  '..MWWWWWMNMNn...',
  '..MNMNMNMNMNn...',
  '..MWWWWWWWMNn...',
  '..MNMNMNMNMNn...',
  '..MNMNMNMRRNn...',
  '..MNMNMNRRRRn...',
  '..MNMNMNMRRNn...',
  '..nnnnnnnnnnn...',
], {M: 'e8b870', N: 'c8904a', n: '8a5a24', W: 'fbf8ee', R: 'd02c2c'});
// spritziger Trank: alcohol-free piccolo in green glass with gold foil
put('SPARKLING_POTION', [
  '.......',
  '..YY...',
  '..LY...',
  '..YY...',
  '..EE...',
  '.eEEE..',
  '.ElEEe.',
  '.ElEEe.',
  '.WWWWe.',
  '.WYYWe.',
  '.WWWWe.',
  '.ElEEe.',
  '.ElEEe.',
  '.eeeee.',
], {Y: 'e8c040', L: 'fff4a0', E: '3a7a3a', l: '6aaa5a', e: '1f4a24', W: 'f4f3ee'});
// Regenbogentrank: the Späti-Pulle with rainbow layers
{
  const band = ['', '', '', 'R', 'R', 'A', 'A', 'Y', 'E', 'U', 'U', 'V', 'V'];
  put('RAINBOW_POTION', POTION_ART.map((r, y) => r.replace(/[1-4]/g, band[y] || 'V')),
    {C: 'e4eef0', R: 'e83a3a', A: 'f08a2a', Y: 'f6d23a', E: '4ab04a', U: '3a78d8', V: '8a4cc8'});
}

// ---------------------------------------------------------------- u) Upcycling arrow
cat('u) Diverses', 'SPIRIT_ARROW', 'BONES');
// Upcycling-Pfeil: bamboo skewer with a pale blue glowing tip and fletching
put('SPIRIT_ARROW', [
  '...........',
  '........jW.',
  '.......jWj.',
  '......Mj...',
  '.....Mn....',
  '....Mn.....',
  '...Mn......',
  '..Mn.......',
  '.jM........',
  '.j.........',
], {M: 'e0c890', n: 'b09a60', j: 'a8e8ff'});

// ---------------------------------------------------------------- templates that need the upstream colours
function buildRound2(up) {
  const at = (cell, x, y) => { const [cx, cy] = cellXY(cell); return getPx(up, cx + x, cy + y); };
  const mix = (c, w, f) => c.map((v, k) => Math.round(v + ((w[k] ?? 255) - v) * f));
  const sat = p => p[3] === 255 && Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) > 40;
  // saturated tones of a region of an upstream cell, light to dark
  // (grey crystals without saturated pixels fall back to all opaque tones)
  const tones = (name, x0, y0, x1, y1, any = false) => {
    const cell = cellOf(name), seen = new Map();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = at(cell, x, y); if (any ? p[3] === 255 : sat(p)) seen.set(hex(p.slice(0, 3)), p.slice(0, 3));
    }
    if (!seen.size && !any) return name === 'DART' ? null : tones(name, x0, y0, x1, y1, true);
    const t = [...seen.values()].sort((a, b) => lum(...b) - lum(...a));
    const pick = f => t[Math.min(t.length - 1, Math.round(f * (t.length - 1)))];
    return t.length ? [pick(0), pick(0.5), pick(1)] : null;
  };
  // rings: gem mid/dark from the upstream stone
  for (const n of ['GARNET', 'RUBY', 'TOPAZ', 'EMERALD', 'ONYX', 'OPAL', 'TOURMALINE', 'SAPPHIRE', 'AMETHYST', 'QUARTZ', 'AGATE', 'DIAMOND']) {
    const c = cellOf('RING_' + n), mid = at(c, 3, 2).slice(0, 3), dark = at(c, 5, 2).slice(0, 3);
    put('RING_' + n, RING_ART, {1: mix(mid, [255, 255, 255], 0.35), 2: mid, 3: dark, s: 'd8d8e0', G: 'a8a8b2', g: '6e6e7a'});
  }
  // darts: the plain one gets a red/white flight, tipped ones their upstream tip colour
  for (const n of ['DART', 'ROT_DART', 'INCENDIARY_DART', 'ADRENALINE_DART', 'HEALING_DART', 'CHILLING_DART',
    'SHOCKING_DART', 'POISON_DART', 'CLEANSING_DART', 'PARALYTIC_DART', 'HOLY_DART', 'DISPLACING_DART', 'BLINDING_DART']) {
    const t = n === 'DART' ? null : tones(n, 9, 0, 15, 5);
    const pal = t ? {1: t[0], 2: t[1], 3: t[2], T: t[1]} : {1: 'f4f3ee', 2: 'd02c2c', 3: '8a1616', T: 'c9c8cf'};
    put(n, DART_ART, {W: 'f4f3ee', s: 'c9c8cf', G: '9a98a2', g: '66646e', k: '3a3844', z: '1d1b22', ...pal});
  }
  // summon elemental lighters: body = upstream crystal tones, flame from the same colour
  for (const n of ['SUMMON_ELE', 'SUMMON_ELE_FIRE', 'SUMMON_ELE_FROST', 'SUMMON_ELE_SHOCK', 'SUMMON_ELE_CHAOS']) {
    const t = tones(n, 0, 0, 15, 15);
    put(n, LIGHTER, {1: t[0], 2: t[1], 3: t[2], 4: t[1], 5: t[0], 6: [255, 255, 240]});
  }
  // brews: liquid from the lower half of the upstream flask
  for (const [n, accent] of Object.entries(BREW_ACCENT)) {
    const name = 'BREW_' + n, [w, h] = SHEET.rect[cellOf(name)], t = tones(name, 0, 5, 15, 15);
    put(name, h < 12 ? SMALL_JAR : JAR, {...JAR_PAL, 1: t[0], 2: t[1], 3: t[2], a: accent});
  }
  for (const n of ['HONEY', 'AQUA', 'MIGHT', 'DRAGON', 'TOXIC', 'ICY', 'ARCANE', 'FEATHER']) {
    const t = tones('ELIXIR_' + n, 0, 5, 15, 15);
    put('ELIXIR_' + n, FLASK, {W: 'e8e8f0', s: 'c9c8cf', G: '9a98a2', g: '66646e', z: '3a3844', k: '66646e', 1: t[0], 2: t[1], 3: t[2]});
  }
}

// Gebeine ("wollte nur kurz sein Fahrrad holen"): the upstream skull and bones, now wearing a
// blue bike helmet with vents and a strap (built on the upstream cell in buildRound2)
const BIKE_HELMET = [[3, 1, 'iUUkUUU'], [2, 2, 'UiUUkUUUu'], [2, 3, 'uuuuuuuuu'], [3, 4, 'k'], [9, 4, 'k']];
function buildBones(up) {
  const [cx, cy] = cellXY(cellOf('BONES')), g = Array.from({length: 16}, () => Array(16).fill(null));
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const p = getPx(up, cx + x, cy + y);
    if (p[3] && !(p[0] === 0 && p[1] === 0 && p[2] === 0 && p[3] === OUTLINE[3])) g[y][x] = p;
  }
  const P = {U: col('2c60c8'), i: col('8ab8f0'), u: col('1c3a80'), k: col('2a2932')};
  for (const [x0, y, s] of BIKE_HELMET) [...s].forEach((ch, i) => { g[y][x0 + i] = P[ch]; });
  putGrid('BONES', addOutline(g));
}

// Placeholders: the empty-slot silhouettes are traced from the new icons (largest connected
// shape, outline only, solid black like upstream). TRINKET (rat skull), MOB and SOMETHING keep
// their upstream drawing because their motifs did not change.
const HOLDER_FROM = {
  WEAPON_HOLDER: 'SWORD', ARMOR_HOLDER: 'ARMOR_ROGUE', MISSILE_HOLDER: 'DART', WAND_HOLDER: 'WAND_WARDING',
  RING_HOLDER: 'RING_GARNET', ARTIFACT_HOLDER: 'ARTIFACT_CLOAK', FOOD_HOLDER: 'PASTY', BOMB_HOLDER: 'BOMB',
  POTION_HOLDER: 'POTION_CRIMSON', SEED_HOLDER: 'SEED_ROTBERRY', SCROLL_HOLDER: 'SCROLL_KAUNAN',
  STONE_HOLDER: 'STONE_SLEEP', ELIXIR_HOLDER: 'ELIXIR_HONEY', SPELL_HOLDER: 'SUMMON_ELE', DOCUMENT_HOLDER: 'GUIDE_PAGE',
};
cat('v) Platzhalter', ...Object.keys(HOLDER_FROM));
function buildHolders() {
  for (const [holder, src] of Object.entries(HOLDER_FROM)) {
    const g = drawn.get(cellOf(src)).grid;
    // largest 8-connected component of filled (non-outline) pixels
    const seen = new Set(); let best = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!g[y][x] || g[y][x] === OUTLINE || seen.has(y * 16 + x)) continue;
      const comp = [], stack = [[x, y]]; seen.add(y * 16 + x);
      while (stack.length) {
        const [cx, cy] = stack.pop(); comp.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx > 15 || ny > 15 || seen.has(ny * 16 + nx)) continue;
          if (g[ny][nx] && g[ny][nx] !== OUTLINE) { seen.add(ny * 16 + nx); stack.push([nx, ny]); }
        }
      }
      if (comp.length > best.length) best = comp;
    }
    const n = Array.from({length: 16}, () => Array(16).fill(null));
    for (const [x, y] of best) n[y][x] = [1, 1, 1, 255];
    addOutline(n);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) n[y][x] = n[y][x] === OUTLINE ? [0, 0, 0, 255] : null;
    putGrid(holder, n);
  }
}

// ================================================================ Runde 3 (Spieltest-Feedback)
// Decisions 1, 2, 6, 10, 13, 14 of the round-3 brief. Parody motifs only: no real beer brand,
// no network operator colours, no readable writing.
cat('w) Runde 3', 'KIT', 'WATERSKIN', 'DEWDROP', 'THROWING_STONE', 'TRINKET_CATA', 'RATION', 'OVERPRICED', 'ORE', 'VIAL');
const BEER_PAL = {1: '3e200c', 2: '6a3814', 3: '96561e', 4: 'd08c48', e: '1f5a2c', E: '2f7a3a', L: 'f8d850',
  y: 'a87a10', Y: 'e0b428', l: 'fff0a0'};
// Sternchen-Pils: brown 0.5 l bottle, gold crown cap, green label with a gold star (no lettering)
put('WATERSKIN', [
  '................',
  '......yYlYy.....',
  '.......342......',
  '.......342......',
  '......34321.....',
  '.....3443221....',
  '.....2EELEE1....',
  '.....2LLLLL1....',
  '.....2ELLLE1....',
  '.....2ELELE1....',
  '.....2eeeee1....',
  '.....3432221....',
  '.....2222111....',
], BEER_PAL);
// Parkknöllchen (round 3): thrown by the SUV boss on floor 10 (TenguSprite.TenguShuriken -> KIT,
// set in Java by the coordinator); small crumpled yellowish-white ticket, red stripe, unreadable lines
put('KIT', [
  '................',
  '................',
  '....RRRRRRr.....',
  '...RRRRRRRRr....',
  '...LWWWWWWWs....',
  '...LWggWgggs....',
  '...LWWWWWWss....',
  '...LWgggWWWs....',
  '....sWWWWWWWs...',
  '...LWggWgWWs....',
  '...LWWWWWWss....',
  '....ssLss.s.....',
  '................',
], {W: 'fbf4cc', L: 'fffff0', s: 'd4c68e', g: '9a9484', R: 'd83a2c', r: '9a1c1c'});
// Biertropfen: round golden drop with a little foam crown
put('DEWDROP', [
  '...W.W....',
  '..WWWWW...',
  '.sWsWWss..',
  '.LYYYYYy..',
  '.LWYYYYy..',
  '.LYYYYyy..',
  '..YYYyy...',
  '...yyy....',
], {W: 'fbf8ec', s: 'dcd6be', L: 'fbe68a', Y: 'e8b020', y: 'b07a10'});
// Stadttaube (Alteingesessene throwing weapon): small grey pigeon facing right,
// iridescent green/purple neck, orange eye, pink feet
put('THROWING_STONE', [
  '............',
  '.......GG...',
  '......GGRGk.',
  '......tmGG..',
  '...ssGmtG...',
  '.GGsssGGGG..',
  '.gGGgggGG...',
  '.g..GGGG....',
  '.....p.p....',
], {G: '9a9aa8', g: '66667a', s: 'c8c8d2', t: '3aa08a', m: '9a58a8', R: 'f08a2a', k: '3a3844', p: 'e0788a'});
// Umzugskarton einer WG: taped cardboard box, unreadable marker scribble and a question mark
put('TRINKET_CATA', [
  '............',
  '.MMMMTTMMMM.',
  '.NNNNTTNNNn.',
  '.NNNNNKKKNn.',
  '.KKNKNNNNKn.',
  '.NNKNNNKKNn.',
  '.NNNNNNKNNn.',
  '.NKKKNNNNNn.',
  '.NNNNNNKNNn.',
  '.nnnnnnnnnn.',
], {M: 'dcae6e', N: 'b47a3e', n: '84542a', T: 'efe0a8', K: '2a2932'});
// Baklava vom Konditor (Sonnenallee): open white pastry box, two rows of diamond pieces with pistachio
put('RATION', [
  '................',
  '................',
  '.gssssssssssssg.',
  '.syLyyyLyyyLyys.',
  '.sLEYyLEYyLEYys.',
  '.syYyLyYyLyYyLs.',
  '.syyLEYyLEYyLEs.',
  '.syyyYyyyYyyyYs.',
  '.WWWWWWRRWWWWWW.',
  '.WWWWWRqqRWWWWs.',
  '.sssssssssssssg.',
], {W: 'f6f5f0', s: 'cfcdd4', g: '9a98a2', L: 'f6d07a', Y: 'd8a23a', y: '9a5e1a', E: '5aa83a', R: 'c83a2c', q: 'f0c040'});
// Baklava-Stück: one diamond piece, pistachio on top, syrup-dark pastry layers on the sides
put('OVERPRICED', [
  '..............',
  '......LL......',
  '....LLElLL....',
  '..LLLEElELLL..',
  '.YLLLLElLLLLY.',
  '.yYYLLLLLLYYy.',
  '.MyyYYLLYYyyM.',
  '..MMyyYYyyMM..',
  '....MMyyMM....',
  '......MM......',
], {L: 'f6d07a', Y: 'd8a23a', y: '8a5216', M: 'e8b860', E: '4e9a34', l: '9cd66a'});
// Glasfaserstück (replaces the dark gold ore): two loops of orange fibre patch cable held by a
// black cable tie, the loose end with a blue plug and a glowing cyan tip
put('ORE', [
  '...............',
  '....qqqqqq.....',
  '..qqA....Aqq...',
  '.qA..qqqq..Aq..',
  '.A..qA..Aq..A..',
  '.KKKK....A..A..',
  '.KKKK....A..A..',
  '.A..aA..Aa..A..',
  '.aA..aaaa..Aa..',
  '..aaA....Aaa...',
  '....aaaaaaA....',
  '..........AA.j.',
  '..........UUWj.',
  '............j..',
], {a: '9a420c', A: 'e0701a', q: 'f8aa4a', K: '2a2932', U: '3460bc', W: 'ffffff', j: '92e2e8'});
// Garderobenmarke (new, cell VIAL, not yet used in Java): red numbered plastic tag
// with a hole, on a teal spiral wristband
put('VIAL', [
  '............',
  '...TTTT.....',
  '..T....T....',
  '..T....T....',
  '...T..T.....',
  '...RRtRR....',
  '..pRWWWRr...',
  '..pRRRWRr...',
  '..pRRWRRr...',
  '..pRRWRRr...',
  '...rrrrr....',
], {T: '2c9a90', t: '155c5c', R: 'd83a2c', r: '8a1c1c', p: 'ec6a4c', W: 'f4f3ee'});

// ================================================================ Stadttauben (Runensteine)
// The runestones become city pigeons: every STONE_* cell is a plump sitting pigeon facing
// right (bigger and rounder than the flying THROWING_STONE pigeon, which stays as it is),
// each with one coloured feature that shows its effect in the colour of the former pebble
// motif. Runestones are always identified (Runestone.isIdentified() == true), so no
// random-colour scheme is needed; the sorts only have to differ from each other.
// This section redraws cells that section k) drew before (drawn.delete, the old code stays
// untouched) and points the STONE_HOLDER silhouette at a pigeon.
cat('x) Stadttauben', 'STONE_AGGRESSION', 'STONE_AUGMENTATION', 'STONE_FEAR', 'STONE_BLAST', 'STONE_BLINK',
  'STONE_CLAIRVOYANCE', 'STONE_SLEEP', 'STONE_DETECT', 'STONE_ENCHANT', 'STONE_FLOCK', 'STONE_INTUITION',
  'STONE_SHOCK', 'STONE_HOLDER');
const PIGEON = [
  '..............',
  '.........GGG..',
  '........GGRGk.',
  '........GGGG..',
  '........tmtG..',
  '...sssssmtmG..',
  '.ggbbbbssGGG..',
  '.ggsssssGGGG..',
  '..gbbbbGGGG...',
  '....gGGGGGg...',
  '.....p..p.....',
  '..............',
];
const PIGEON_PAL = {G: '9a9aa8', g: '66667a', s: 'bdbdca', b: '55556a', t: '3aa08a', m: '9a58a8',
  R: 'f08a2a', k: '3a3844', p: 'e0788a', W: 'f4f3ee'};
// overlay: rows of 14 chars, '.' keeps the pigeon pixel, '_' clears it
function pigeonRows(over) {
  const rows = PIGEON.map(r => [...r]);
  over.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    rows[y][x] = ch === '_' ? '.' : ch;
  }));
  return rows.map(r => r.join(''));
}
const PIGEON_ART = {
  // Stänker-Taube: red anger mark above the back, angry brow over the red eye
  AGGRESSION: [[
    '..R.R.........',
    '..RRRR....kk..',
    '.RRPRR........',
    '..RRRR........',
    '..R.R.........',
  ], {R: 'e02a2a', P: 'ff8a6a'}],
  // Tuning-Taube: yellow arrow pointing up above the back
  AUGMENTATION: [[
    '....Y.........',
    '...YYY........',
    '..YYYYY.......',
    '....Y.........',
    '....Y.........',
  ], {Y: 'f6d23a'}],
  // Schreck-Taube: wide open white eye, ruffled crest, red "!"
  FEAR: [[
    '..R......k.k..',
    '..R.....GWWG..',
    '..R.....GWKW..',
    '........GWWG..',
    '..R...........',
  ], {R: 'e02a2a', K: '1d1b22'}],
  // Böller-Taube: red firecracker band strapped round the belly, lit fuse on the back
  BLAST: [[
    '..L...........',
    '...k..........',
    '...k..........',
    '....k.........',
    '....k.........',
    '...RRRRRRRR...',
    '.ggWrWrWrWR...',
    '.ggRRRRRRRR...',
  ], {R: 'd02c2c', r: '8a1616', L: 'fff27a'}],
  // Blinzeltaube: blue glitter around it, the tail already fading away
  BLINK: [[
    '.i.......__...',
    'iUi...i.......',
    '.i...iUi......',
    '......i.......',
    '..............',
    '...jsssss.....',
    '.jjjbbbs......',
    '.jjsssss......',
    '..jbbbb.......',
  ], {U: '3a70e0', i: '9ac8ff', j: 'c8dcf4'}],
  // Hellseh-Taube: a purple all-seeing eye floats above the back, its own eye glows violet
  CLAIRVOYANCE: [[
    '..............',
    '..VVVVV.......',
    '.VwwuwwV......',
    '..VVVVV.......',
  ], {V: '7c4cb2', w: 'f0e8ff', u: '2a1c5c', R: 'c9a0ff'}],
  // Mittagsschlaf-Taube: blue nightcap with a white bobble, closed eye, zZ
  SLEEP: [[
    '.UUU....iUU...',
    '..U....iUUUW..',
    '.U.....GGkGk..',
    '.UUU..........',
  ], {U: '2c50b8', i: '6a8ee8', k: '3a3844'}],
  // Gutachter-Taube: green clipboard with a white sheet under the wing
  DETECT: [[
    '..............',
    '..............',
    '..............',
    '...EkkE.......',
    '..EWWWWE......',
    '..EWeeWE......',
    '..EWWWWE......',
    '..EWeWeE......',
    '..EEEEEE......',
  ], {E: '2e8a4a', e: '6a8a70', k: '3a3844'}],
  // Verzauberungs-Taube: purple glitter trail behind the tail
  ENCHANT: [[
    '..............',
    '..w...........',
    '.wVw..........',
    '..w....w......',
    '.......w......',
    'w.............',
    'V.............',
    'Vw............',
    'w.V...........',
    '.w.w..........',
  ], {V: '8a4cc8', w: 'c9a0ff'}],
  // Bauchgefühl-Taube: glowing yellow heart on the belly, small "?" above
  INTUITION: [[
    '...LLL........',
    '.....L........',
    '....L.........',
    '..............',
    '....L.........',
    '..............',
    '.......YY.YY..',
    '.......YLYYY..',
    '........YYY...',
    '.........Y....',
  ], {Y: 'f0b020', L: 'fff27a'}],
  // Weidezaun-Taube: yellow lightning bolt, feathers standing on end
  SHOCK: [[
    '....LL.....L..',
    '...LL..L......',
    '..LLLL.......L',
    '....L.........',
    '...L..........',
  ], {L: 'f8e040'}],
};
for (const [n, [over, pal]] of Object.entries(PIGEON_ART)) {
  drawn.delete(cellOf('STONE_' + n));
  put('STONE_' + n, pigeonRows(over), {...PIGEON_PAL, ...pal});
}
// Schäfertaube (StoneOfFlock; name and text say it calls a flock of sheep): a small pigeon
// riding on the back of a white sheep
const MINI_PIGEON = ['...GG.', '...GRk', '.ssGt.', 'gsbGG.', '.gGG..'];
const FLOCK_SHEEP = [
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..W.WW.WW.....',
  '.WWWWwWWWWFF..',
  '.WWwWWWWWFFkF.',
  '.wWWWWWwWWFFF.',
  '..wWwWWwW.F...',
  '...F.F..F.F...',
  '..............',
];
drawn.delete(cellOf('STONE_FLOCK'));
{
  const rows = FLOCK_SHEEP.map(r => [...r]);
  MINI_PIGEON.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') rows[1 + y][3 + x] = ch; }));
  put('STONE_FLOCK', rows.map(r => r.join('')), {...PIGEON_PAL, W: 'f4f3ee', w: 'cfcdd8', F: '7a7482', k: '1d1b22'});
}
// the empty-slot silhouette is the plain pigeon of the Blinzeltaube (its glitter is not connected)
HOLDER_FROM.STONE_HOLDER = 'STONE_BLINK';

// ================================================================ main
function main() {
  execFileSync(process.execPath, [path.join(__dirname, 'generate-mietvertrag.cjs')], {stdio: 'ignore'});
  const base = makeAtlas(fs.readFileSync(path.join(ROOT, ITEMS)));
  const upstream = makeAtlas(execFileSync('git', ['-C', ROOT, 'show', UPSTREAM_REV + ':' + ITEMS], {maxBuffer: 1 << 26}));
  const out = {w: 256, h: 512, px: Buffer.from(base.px)};
  buildTemplates(upstream);
  buildDiscoWand(upstream);
  buildRound2(upstream);
  buildBones(upstream);
  buildHolders();
  if (drawn.has(cellOf('AMULET'))) throw new Error('AMULET belongs to generate-mietvertrag.cjs');
  for (const [cell, {grid}] of drawn) {
    const [cx, cy] = cellXY(cell);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) setPx(out, cx + x, cy + y, grid[y][x] || [0, 0, 0, 0]);
  }
  if (!argv.includes('--check')) {
    fs.writeFileSync(path.join(ROOT, ITEMS), encodePNG(out));
    console.log(`wrote ${ITEMS}: ${drawn.size} icons redrawn`);
  }
  const counts = {};
  for (const {name} of drawn.values()) { const c = CATEGORY[name] || 'e) Rest'; counts[c] = (counts[c] || 0) + 1; }
  for (const c of Object.keys(counts).sort()) console.log(`  ${c}: ${counts[c]}`);
  const pi = argv.indexOf('--preview');
  if (pi >= 0) preview(argv[pi + 1], upstream, out);
}

// before/after sheet: per icon the upstream cell and the new cell at x6, grouped by category
function preview(dir, before, after) {
  fs.mkdirSync(dir, {recursive: true});
  const S = 6, CELL = 16 * S, GAP = 6, PER_ROW = 8;
  const bg = [34, 31, 40], bg2 = [52, 48, 60];
  const groups = {};
  for (const [cell, {name}] of drawn) { const c = CATEGORY[name] || 'e) Rest'; (groups[c] = groups[c] || []).push(cell); }
  const names = Object.keys(groups).sort();
  let rowsTotal = 0; for (const c of names) rowsTotal += Math.ceil(groups[c].length / PER_ROW);
  const W = PER_ROW * (2 * CELL + 3 * GAP), H = rowsTotal * (CELL + GAP * 2) + names.length * 8;
  const img = {w: W, h: H, px: Buffer.alloc(W * H * 4)};
  for (let i = 0; i < W * H; i++) { img.px.set(bg, i * 4); img.px[i * 4 + 3] = 255; }
  const blit = (src, cell, ox, oy) => {
    const [cx, cy] = cellXY(cell);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const p = getPx(src, cx + (x / S | 0), cy + (y / S | 0)), a = p[3] / 255;
      const b = (((x / S | 0) + (y / S | 0)) & 1) ? bg2 : bg;
      setPx(img, ox + x, oy + y, [0, 1, 2].map(k => Math.round(p[k] * a + b[k] * (1 - a))));
    }
  };
  let oy = 0;
  for (const c of names) {
    const cells = groups[c];
    for (let i = 0; i < cells.length; i++) {
      const col_ = i % PER_ROW, row = i / PER_ROW | 0;
      const ox = col_ * (2 * CELL + 3 * GAP) + GAP, y = oy + row * (CELL + 2 * GAP) + GAP;
      blit(before, cells[i], ox, y); blit(after, cells[i], ox + CELL + GAP / 2, y);
    }
    oy += Math.ceil(cells.length / PER_ROW) * (CELL + 2 * GAP);
    for (let y = oy; y < oy + 8 && y < H; y++) for (let x = 0; x < W; x++) setPx(img, x, y, [90, 80, 110]);
    oy += 8;
  }
  fs.writeFileSync(path.join(dir, 'kiez-items-vorher-nachher-x6.png'), encodePNG(img));
  // whole atlas at x3
  const A = 3, full = {w: 256 * A, h: 512 * A, px: Buffer.alloc(256 * A * 512 * A * 4)};
  for (let y = 0; y < full.h; y++) for (let x = 0; x < full.w; x++) {
    const p = getPx(after, x / A | 0, y / A | 0), a = p[3] / 255, b = ((x / A >> 4) + (y / A >> 4)) & 1 ? bg2 : bg;
    setPx(full, x, y, [0, 1, 2].map(k => Math.round(p[k] * a + b[k] * (1 - a))));
  }
  fs.writeFileSync(path.join(dir, 'kiez-items-atlas-x3.png'), encodePNG(full));
  console.log('previews in ' + dir);
}

if (require.main === module) main();
// shared with tools/generate-kiez-mobs.cjs (mimic frames must match the chest icons)
module.exports = {CONTAINER_ART, render, PAL, OUTLINE, SHEET, cellOf, drawnGrid: name => drawn.get(cellOf(name)).grid};
