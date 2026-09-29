// Renditequartier (Ebene 16-20): rebuilds the enemy/NPC atlases and custom tiles of the
// Neuköllner Renditequartier from the unmodified upstream Shattered Pixel Dungeon v4.0.0 PNGs
// stored in git (commit 4256b22). Pure Node (zlib via tools/lib/tileset-kit.cjs), no npm packages.
//
//   node tools/generate-kiez-renditequartier.cjs                     write all files
//   node tools/generate-kiez-renditequartier.cjs --only king,golem   write only these
//   node tools/generate-kiez-renditequartier.cjs --preview DIR       also write before/after previews
//
// Contract (checked, the script aborts otherwise): every file keeps its size, frame grid, frame
// order and the alpha value of every single pixel. Only RGB changes: palette/luminance remaps plus
// small hand-placed details inside the existing silhouette, anchored per frame (eyes, hilt, feet),
// so the XxxSprite.java animation indices and TextureFilm sizes stay valid without code changes.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const kit = require('./lib/tileset-kit.cjs');
const {decodePNG, encodePNG, rgb, hex, ramp, mix} = kit;

const ROOT = kit.ROOT;
const UPSTREAM = '4256b22';                         // unmodified upstream v4.0.0 assets
const ASSETS = 'core/src/main/assets/';
const argv = process.argv.slice(2);

// file, TextureFilm frame size from the matching Java class (tiles: 16x16 cells)
const FILES = {
  ghoul:     {file: 'sprites/ghoul.png',     fw: 12, fh: 14}, // GhoulSprite 0-13
  elemental: {file: 'sprites/elemental.png', fw: 12, fh: 14}, // Fire 0, Newborn 14, Frost 28, Shock 42, Chaos 56 (+0..13)
  warlock:   {file: 'sprites/warlock.png',   fw: 12, fh: 15}, // WarlockSprite 0-10
  monk:      {file: 'sprites/monk.png',      fw: 15, fh: 14}, // Monk 0-16, Senior 17-33
  golem:     {file: 'sprites/golem.png',     fw: 17, fh: 19}, // GolemSprite 0-13
  king:      {file: 'sprites/king.png',      fw: 16, fh: 16}, // KingSprite 0-15
  undead:    {file: 'sprites/undead.png',    fw: 12, fh: 16}, // UndeadSprite 0-16 (no Java user in v4.0.0)
  statue:    {file: 'sprites/statue.png',    fw: 12, fh: 15}, // Statue 0-15, armour tiers at 21/32/43/54/65
  guardian:  {file: 'sprites/guardian.png',  fw: 12, fh: 15}, // EarthGuardianSprite 0-15
  city_boss: {file: 'environment/custom_tiles/city_boss.png',  fw: 16, fh: 16},
  city_quest:{file: 'environment/custom_tiles/city_quest.png', fw: 16, fh: 16},
  carpet:    {file: 'environment/custom_tiles/carpet.png',     fw: 16, fh: 16},
};

// ---------------------------------------------------------------- colour helpers
const H = c => typeof c === 'string' ? rgb(c) : c;
const L = c => (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000;
function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return {h: 0, s: 0, l};
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return {h, s, l};
}
// deterministic per-pixel noise 0..99
const hash = (x, y, s = 0) => { let v = Math.imul(x + 31 + s, 374761393) ^ Math.imul(y + 7, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };

// ---------------------------------------------------------------- atlas access (frame coordinates)
function load(name) {
  const def = FILES[name];
  let buf;
  try { buf = execFileSync('git', ['show', UPSTREAM + ':' + ASSETS + def.file], {cwd: ROOT, maxBuffer: 1 << 26}); }
  catch (e) { throw new Error(name + ': upstream ' + UPSTREAM + ':' + def.file + ' not in git; fetch full history'); }
  const src = decodePNG(buf), out = {w: src.w, h: src.h, px: Buffer.from(src.px)};
  const per = Math.floor(src.w / def.fw), rows = Math.floor(src.h / def.fh);
  const A = {name, def, src, out, fw: def.fw, fh: def.fh, per, count: per * rows};
  A.i = (f, x, y) => (((Math.floor(f / per) * def.fh + y) * src.w) + (f % per) * def.fw + x) * 4;
  A.inside = (x, y) => x >= 0 && y >= 0 && x < def.fw && y < def.fh;
  A.alpha = (f, x, y) => A.inside(x, y) ? src.px[A.i(f, x, y) + 3] : 0;
  A.src3 = (f, x, y) => { const i = A.i(f, x, y); return [src.px[i], src.px[i + 1], src.px[i + 2]]; };
  A.out3 = (f, x, y) => { const i = A.i(f, x, y); return [out.px[i], out.px[i + 1], out.px[i + 2]]; };
  A.get = (f, x, y) => A.alpha(f, x, y) ? hex(A.src3(f, x, y)) : null;
  A.cur = (f, x, y) => A.alpha(f, x, y) ? hex(A.out3(f, x, y)) : null;
  // RGB only: transparent pixels are never painted and alpha is never written
  A.set = (f, x, y, c) => {
    if (!c || !A.alpha(f, x, y)) return false;
    c = H(c); const i = A.i(f, x, y);
    out.px[i] = Math.max(0, Math.min(255, Math.round(c[0])));
    out.px[i + 1] = Math.max(0, Math.min(255, Math.round(c[1])));
    out.px[i + 2] = Math.max(0, Math.min(255, Math.round(c[2]))); return true;
  };
  A.each = (frames, fn) => { for (const f of frames) for (let y = 0; y < def.fh; y++) for (let x = 0; x < def.fw; x++) { const c = A.get(f, x, y); if (c) fn(f, x, y, c); } };
  // fn returns a colour (hex or [r,g,b]) or null to keep the pixel
  A.map = (frames, fn) => A.each(frames, (f, x, y, c) => { const n = fn(c, f, x, y); if (n) A.set(f, x, y, n); });
  A.remap = (frames, table) => A.map(frames, c => table[c] || null);
  A.find = (f, colours) => { const s = new Set([].concat(colours)), r = []; for (let y = 0; y < def.fh; y++) for (let x = 0; x < def.fw; x++) if (s.has(A.get(f, x, y))) r.push([x, y]); return r; };
  A.stamp = (f, ox, oy, rows, keys) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    if (!keys[ch]) throw new Error(name + ': no colour for ' + ch);
    A.set(f, ox + x, oy + y, keys[ch]);
  }));
  A.used = f => { for (let y = 0; y < def.fh; y++) for (let x = 0; x < def.fw; x++) if (A.alpha(f, x, y)) return true; return false; };
  return A;
}
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// eyes: pixels of the given colour(s) in the upper part of the frame; returns {x0,x1,y} or null
function eyes(A, f, colours, maxY) {
  const e = A.find(f, colours).filter(([, y]) => y <= maxY);
  if (!e.length) return null;
  const y = Math.min(...e.map(p => p[1])), row = e.filter(p => p[1] === y);
  return {x0: Math.min(...row.map(p => p[0])), x1: Math.max(...row.map(p => p[0])), y};
}
// death frames that share the silhouette of a living frame but fade to stone/ash: carry the
// recolour over as an RGB difference, weighted by how much colour the fading frame has left
function carryFade(A, base, frames, weights = frames.map(() => 1)) {
  frames.forEach((f, n) => A.each([f], (_, x, y) => {
    if (!A.alpha(base, x, y)) return;
    const s0 = A.src3(base, x, y), n0 = A.out3(base, x, y), d = A.src3(f, x, y);
    const k = weights[n] * Math.min(1, (hsl(d).s + 0.15) / (hsl(s0).s + 0.15));
    A.set(f, x, y, d.map((v, i) => v + (n0[i] - s0[i]) * k));
  }));
}

// ================================================================ the sheets
const PAINT = {};

// ---------------------------------------------------------------- king: König der Eigentumswohnungen
// Former Hausverwalter Rodney: gold crown and white beard stay (he must read as the king),
// the bare brawler arm becomes a navy blazer sleeve with a white cuff, the red breeches become
// navy suit trousers with a thin pinstripe, and the sword becomes an oversized brass
// Generalschlüssel with notched bit. Death frames (12-15, same silhouette as frame 0) keep
// their fade to grey via carryFade.
PAINT.king = A => {
  const SKIN = new Set(['b3846b', '6c3b26', '7e442d', '8f563c', 'a67b63', 'a36245', 'cc9e85']);
  const TROUSERS = {b3090f: '3a4a78', 620001: '1c2238', a30405: '2c3860', '9e0b0f': '324070', '7e0001': '232b48'};
  const BLADE = {ffffff: 'f4d98a', b3b3b3: 'd2ac4c', '5c5c5c': '7a5a1e', '7e7e7e': '9a7a30', d9d9d9: 'e6c46a',
    e1e2dd: 'e8cc78', c4c4c2: 'd2ac4c', d3d3d1: 'dcb95c', b9b9b9: 'c9a347', '979794': 'a88632', c7c8c0: 'd8b456'};
  const SLEEVE = ramp([[40, '151a2e'], [70, '222c4c'], [110, '34426e'], [150, '4a5a8e'], [200, '6474a6']]);
  for (const f of range(0, 11)) {
    const e = eyes(A, f, '000000', 6);
    const blade = [];
    const grip = A.find(f, ['ff9a03', 'a35f0f', 'ffe940']).filter(([, y]) => !e || y > e.y + 2);
    const isFist = (x, y) => grip.some(([gx, gy]) => gx - x >= 0 && gx - x <= 2 && Math.abs(gy - y) <= 1);
    const arm = new Set();
    A.each([f], (_, x, y, c) => {
      const inFace = e && y <= e.y + 1 && x >= e.x0 - 2;
      if (SKIN.has(c) && !inFace && e && !isFist(x, y)) { A.set(f, x, y, SLEEVE(L(A.src3(f, x, y)))); arm.add(x + ',' + y); }
      else if (TROUSERS[c]) A.set(f, x, y, (x + f) % 3 === 0 && c === 'b3090f' ? '46578a' : TROUSERS[c]);
      else if (BLADE[c] && !(e && y <= e.y && Math.abs(x - e.x0) < 4 && c === 'ffffff')) { A.set(f, x, y, BLADE[c]); blade.push([x, y, c]); }
    });
    // white shirt cuff where the sleeve meets the fist
    A.each([f], (_, x, y, c) => {
      if (!arm.has(x + ',' + y)) return;
      if ([[1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => SKIN.has(A.get(f, x + dx, y + dy)) && !arm.has((x + dx) + ',' + (y + dy)) && isFist(x + dx, y + dy)))
        A.set(f, x, y, 'e8e6dc');
    });
    // key bit: the blade pixels farthest from the hilt get alternating notches on the dark edge
    const hilt = A.find(f, ['ff9a03', 'a35f0f']).filter(([x, y]) => blade.some(([bx, by]) => Math.abs(bx - x) + Math.abs(by - y) === 1));
    if (hilt.length && blade.length > 6) {
      const d = new Map(), q = [];
      for (const [x, y] of hilt) for (const [bx, by] of blade) if (Math.abs(bx - x) + Math.abs(by - y) === 1 && !d.has(bx + ',' + by)) { d.set(bx + ',' + by, 1); q.push([bx, by]); }
      const inBlade = new Set(blade.map(([x, y]) => x + ',' + y));
      while (q.length) {
        const [x, y] = q.shift(), k = d.get(x + ',' + y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const key = (x + dx) + ',' + (y + dy); if (inBlade.has(key) && !d.has(key)) { d.set(key, k + 1); q.push([x + dx, y + dy]); } }
      }
      const M = Math.max(...d.values());
      for (const [x, y, c] of blade) {
        const k = d.get(x + ',' + y); if (!k) continue;
        if (M - k <= 3 && (c === '5c5c5c' || c === '7e7e7e') && (M - k) % 2 === 0) A.set(f, x, y, '2a1e08');
        if (k === 1 || k === 2) { if (c === 'ffffff' || c === 'd9d9d9') A.set(f, x, y, 'fff2c0'); }
      }
    }
  }
  carryFade(A, 0, [12, 13, 14, 15], [1, 0.8, 0.55, 0.35]);
};

// ---------------------------------------------------------------- ghoul: Kleinanleger-Wiedergänger
// Pale grey-green undead head (jaw and stubble stay), below it a light-blue office shirt under a
// navy quilted gilet (Steppweste), khaki chinos and brown loafers: the small investor who once
// objected at the Eigentümerversammlung.
PAINT.ghoul = A => {
  const HEAD = {c6d0cf: 'c3c9a6', bac5c1: 'aab390', dae0de: 'd9dcbc', a7b3b6: '959e7c', '9aaaa8': '8a9372', '697b83': '5d6650', '8fa0a5': '7f886a', d3d3d3: 'cfd2b4', '4a5962': '454c3a'};
  const SHIRT = {c6d0cf: 'aec8e4', bac5c1: '9cb6d6', dae0de: 'c8dcf0', a7b3b6: '8aa2c4', '9aaaa8': '8098bc', d3d3d3: 'bcd2ea'};
  const VEST = {c6d0cf: '34436e', bac5c1: '2c3a60', dae0de: '44558a', a7b3b6: '26325a', '9aaaa8': '26325a', d3d3d3: '3c4c7c'};
  const DARK = {'697b83': '1e2848', '4a5962': '1a2240', '8fa0a5': '5a4030'};
  const PANTS = {'693b1a': 'a89468', '4f2d14': '847048', '311c0c': '4a3c26', '3f2410': '6a5838', '7d4b19': 'a89468'};
  for (const f of range(0, 13)) {
    const e = eyes(A, f, ['000000', '4a5962'], 7);
    let top = A.fh; A.each([f], (_, x, y) => { top = Math.min(top, y); });
    let bottom = 0; A.each([f], (_, x, y) => { bottom = Math.max(bottom, y); });
    const eyeY = e ? e.y : top + 2, x0 = e ? e.x0 - 3 : 0;
    // the gilet covers the torso sides, the shirt stays visible in a strip left of the jaw
    A.each([f], (_, x, y, c) => {
      if (PANTS[c]) return A.set(f, x, y, PANTS[c]);
      const head = y <= eyeY + 2 && x >= x0 || y <= eyeY;
      if (head) { if (HEAD[c]) A.set(f, x, y, HEAD[c]); return; }
      if (y >= bottom - 1 && c === '8fa0a5') return A.set(f, x, y, '5a3a22');
      if (DARK[c]) return A.set(f, x, y, DARK[c]);
      const edge = !A.alpha(f, x - 1, y) || !A.alpha(f, x + 1, y);
      const t = edge ? SHIRT : VEST;
      if (t[c]) A.set(f, x, y, !edge && y % 2 === 0 ? mix(H(t[c]), [120, 140, 190], 0.18) : t[c]);
    });
  }
};


// ---------------------------------------------------------------- warlock: Abschreibungshexer
// The horned hood becomes a green accountant's eyeshade hood (visor brim with the eyes under
// it), the pale-green upper robe a navy pinstripe jacket, the purple skirt charcoal suit
// trousers. The brown beard stays.
PAINT.warlock = A => {
  A.remap(range(0, 10), {
    ffffff: '6fae78', cecece: '4f8a5a', a3a3a3: '2f5a3a', e5e5e5: 'b4dcb0',
    ceddd1: '4c5c8e', e2e2de: '6a7aac', afc5b4: '425082', c8d5c8: '5a6898', a6c0ab: '48568a', '91ae99': '3a4674', '78987f': '323d66', '52775c': '222a4a',
    '662d91': '4a4c55', '592880': '3c3e46', '3b116c': '2c2e35', '290852': '202228', '1f0640': '16171b',
  });
  // pinstripes on the jacket and trousers, fixed to the frame so they do not crawl
  A.map(range(0, 10), (c, f, x, y) => x % 3 === 1 && (c === 'ceddd1' || c === '662d91') ? (c === 'ceddd1' ? '6474a4' : '62646e') : null);
};

// ---------------------------------------------------------------- monk: Concierge-Mönch / Ober-Concierge
// Same pixels, new uniform: skin face under the black hair, the white gi top becomes a
// bordeaux livery jacket (Ober-Concierge: navy with gold epaulette), the orange fists become
// white gloves, the orange trousers black uniform trousers with a stripe, grey feet black shoes.
// The black collar under the chin reads as a bow tie.
PAINT.monk = A => {
  const SKIN = ramp([[90, '8a5a40'], [150, 'c08a66'], [200, 'e0b08a'], [245, 'f4d0ac']]);
  const JACKET = {monk: ramp([[60, '2a0a14'], [120, '4a1222'], [175, '6e1a30'], [205, '8a2238'], [245, 'a8344a']]),
    senior: ramp([[60, '0c1022'], [100, '18203c'], [150, '222e54'], [190, '2e3c6a'], [245, '44548a']])};
  const GLOVE = ramp([[60, '8a8e96'], [100, 'b8bcc2'], [140, 'e0e2e4'], [170, 'f6f6f4']]);
  const TROUSER = ramp([[60, '101014'], [100, '1c1c22'], [130, '26262e'], [160, '30303a']]);
  const SHOE = ramp([[0, '050505'], [100, '18181c'], [180, '2c2c34']]);
  for (const [who, frames] of [['monk', range(0, 16)], ['senior', range(17, 33)]]) for (const f of frames) {
    const e = eyes(A, f, ['000000'], 4);
    const eyeY = e ? e.y : 2;
    const warm = c => { const k = hsl(rgb(c)); return k.s > 0.45 && k.h < 50; };
    // orange connected to the legs (y >= eyeY+6) is trousers, the rest are fists/cheeks
    const legs = new Set(), q = [];
    A.each([f], (_, x, y, c) => { if (warm(c) && y >= eyeY + 6) { legs.add(x + ',' + y); q.push([x, y]); } });
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy, c = A.get(f, X, Y);
        if (c && warm(c) && !legs.has(X + ',' + Y) && Y >= eyeY + 3) { legs.add(X + ',' + Y); q.push([X, Y]); }
      }
    }
    let bottom = 0; A.each([f], (_, x, y) => { bottom = Math.max(bottom, y); });
    A.each([f], (_, x, y, c) => {
      const k = hsl(rgb(c)), l = L(rgb(c));
      if (l < 60) return;                                            // outline, hair, bow tie
      if (warm(c)) {
        if (legs.has(x + ',' + y)) return A.set(f, x, y, (x % 4 === 1 && l > 100) ? JACKET[who](200) : TROUSER(l));
        return A.set(f, x, y, GLOVE(l));
      }
      if (k.s < 0.25) {
        if (y >= bottom - 1 && l < 180) return A.set(f, x, y, SHOE(l));
        if (e ? y <= eyeY + 1 && x >= e.x0 - 3 : y <= 3) return A.set(f, x, y, who === 'senior' && y < eyeY ? null : SKIN(l));
        return A.set(f, x, y, JACKET[who](l));
      }
    });
    // brass buttons / gold epaulette: first two jacket pixels right below the bow tie
    if (e) {
      let n = 0;
      for (let y = eyeY + 3; y <= eyeY + 6 && n < 2; y += 2) for (let x = e.x0 - 1; x <= e.x0 + 1; x++) {
        const c = A.get(f, x, y);
        if (c && !warm(c) && hsl(rgb(c)).s < 0.25 && L(rgb(c)) >= 60 && n < 2) { A.set(f, x, y, 'd8b456'); n++; break; }
      }
    }
  }
};

// ---------------------------------------------------------------- golem: Umzugsgolem
// A walking stack of moving boxes: kraft cardboard with lit faces, the rune spine becomes a
// strip of brown packing tape (the runes keep glowing), each box gets a dark hand-hole.
PAINT.golem = A => {
  const frames = range(0, 13);
  A.remap(frames, {'332c2b': '8c6538', '665a57': 'c09260', '594f4c': '6e5230', '483f3d': '5a4228', '0a0807': '1e1408'});
  for (const f of frames) {
    // hand-holes: in each lit face (B, now c09260) run of >=3 pixels, dark slot in its middle row
    const lit = A.find(f, '665a57');
    if (!lit.length) continue;
    const ys = [...new Set(lit.map(p => p[1]))].sort((a, b) => a - b);
    const mid = ys[Math.floor(ys.length / 2)];
    const row = lit.filter(p => p[1] === mid).map(p => p[0]).sort((a, b) => a - b);
    if (row.length >= 3) { A.set(f, row[1], mid, '3a260e'); if (row.length >= 4) A.set(f, row[2], mid, '3a260e'); }
    // box seam: a darker line one pixel under the top of the carried box (the upper block)
    let top = A.fh; A.each([f], (_, x, y) => { top = Math.min(top, y); });
    A.each([f], (_, x, y, c) => { if (y === top + 3 && c === '332c2b') A.set(f, x, y, '6e4e2a'); });
  }
};


// ---------------------------------------------------------------- elemental: Heizkosten / Heizungsausfall / Kurzschluss / Nebenkosten
// The element colours stay (they tell the player which effect hits). Each variant gets a small
// prop inside its body, anchored to the solid body pixels of every living frame:
//   Fire  (Heizkosten-Feuerelementar):   a white Nachzahlung slip with a red total line
//   Frost (Heizungsausfall):             a cold grey radiator with ribs
//   Shock (Kurzschluss, Elektrik vom Schwager): two loose wires (red, blue) with copper ends
//   Chaos (Nebenkosten):                 the whole body turns into ruled paper with a red stamp
// The newborn fire elemental (green, Wandmaker quest) stays upstream. Particles are unchanged.
PAINT.elemental = A => {
  const body = f => {
    const pts = []; A.each([f], (_, x, y) => { if (A.src.px[A.i(f, x, y) + 3] === 255) pts.push([x, y]); });
    if (!pts.length) return null;
    return {x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1]))};
  };
  const solid = (f, x, y) => A.alpha(f, x, y) === 255;
  const LIVING = range(0, 6);
  for (const k of LIVING) {
    // Fire: bill slip in the lower left of the body
    { const f = 0 + k, b = body(f); if (b) {
      const ox = b.x0 + 1, oy = b.y1 - 3;
      if (solid(f, ox, oy) && solid(f, ox + 1, oy + 2)) A.stamp(f, ox, oy, ['ww', 'kw', 'rr'], {w: 'fffbee', k: '9a8f80', r: 'c8201c'});
    } }
    // Frost: radiator at the bottom centre
    { const f = 28 + k, b = body(f); if (b) {
      const cx = Math.round((b.x0 + b.x1) / 2), oy = b.y1 - 3;
      if (solid(f, cx - 2, oy) && solid(f, cx + 1, oy + 2)) A.stamp(f, cx - 2, oy, ['gkgk', 'gkgk', 'dddd'], {g: 'c4ccd2', k: '5c6870', d: '7a868e'});
    } }
    // Shock: two loose wires hanging out of the bottom
    { const f = 42 + k, b = body(f); if (b) {
      const cx = Math.round((b.x0 + b.x1) / 2);
      for (const [dx, col] of [[-1, 'd02828'], [1, '2850d0']]) {
        let y = b.y1; while (y > b.y0 && !solid(f, cx + dx, y)) y--;
        A.set(f, cx + dx, y, 'e0a040'); A.set(f, cx + dx, y - 1, col); A.set(f, cx + dx, y - 2, col);
      }
    } }
  }
  // Chaos: paper body with blue ruling, red stamp, dark face kept
  const PAPER = ramp([[120, 'b8ae96'], [182, 'd8ceb4'], [227, 'ece4cc'], [254, 'fbf6e6']]);
  for (const f of range(56, 62)) {
    const b = body(f);
    A.each([f], (_, x, y, c) => {
      const l = L(rgb(c)); if (l < 100) return;
      const inner = solid(f, x, y) && solid(f, x - 1, y) && solid(f, x + 1, y);
      if (inner && b && (y - b.y0) % 3 === 1 && l > 200) return A.set(f, x, y, 'a8b8d8');
      A.set(f, x, y, PAPER(l));
    });
    if (b) { const sx = b.x1 - 3, sy = b.y1 - 3; if (solid(f, sx, sy) && solid(f, sx + 1, sy + 1)) A.stamp(f, sx, sy, ['rr', 'rr'], {r: 'c0302c'}); }
  }
  // chaos particles and death frames: paper cream instead of pure grey
  A.map(range(63, 69), c => { const l = L(rgb(c)); return l > 100 ? PAPER(l) : null; });
};

// ---------------------------------------------------------------- undead: untoter Kleinanleger (unused sheet)
// UndeadSprite has no user in v4.0.0; kept consistent anyway: the white skull cap becomes a
// navy flat cap above the eyes, the brown beard turns grey.
PAINT.undead = A => {
  const CAP = ramp([[120, '1e2644'], [165, '2c3860'], [185, '3a4a7c'], [210, '4a5a8e'], [240, '5a6aa0']]);
  const BEARD = {a67c52: '9a948a', '8c6f54': '7e786e', '4d301c': '3e3a34', '6c3c1a': '5a544c'};
  for (const f of range(0, 16)) {
    const e = eyes(A, f, '000000', 8);
    A.each([f], (_, x, y, c) => {
      if (BEARD[c]) return A.set(f, x, y, BEARD[c]);
      if (e && y < e.y && y >= e.y - 3 && hsl(rgb(c)).s < 0.1 && L(rgb(c)) > 120) A.set(f, x, y, CAP(L(rgb(c))));
    });
  }
};

// ---------------------------------------------------------------- guardian: Bauschaum-Wächter
// The earthen guardian of the Bauschaum-Sprüher: cured polyurethane foam, pale yellow with
// bubbly pores and darker cut edges; the glowing eyes turn signal orange so they stay visible.
PAINT.guardian = A => {
  const FOAM = ramp([[0, '1c1206'], [20, '4a3410'], [40, '8a6a26'], [60, 'c09a44'], [80, 'dcbc62'], [100, 'ecd488'], [130, 'f8eab4']]);
  A.map(range(0, A.count - 1), (c, f, x, y) => {
    const k = hsl(rgb(c)), l = L(rgb(c));
    if (k.h > 50) return l > 200 ? 'ff9a30' : 'e05010';                       // eyes (yellow hue, the body is orange-brown)
    let n = FOAM(l);
    if (l > 45 && hash(x, y, f) < 14) n = mix(n, [255, 248, 210], 0.45);      // foam pores
    else if (l > 45 && hash(x + 3, y, f) < 8) n = mix(n, [120, 90, 30], 0.35);
    return n;
  });
};


// ---------------------------------------------------------------- statue: (gepanzerte) Kunst-am-Bau-Statue
// The warm, slightly yellow stone becomes cool fair-faced concrete like the Renditequartier
// walls; the red eyes stay. Armour pieces (tiers at frame 21, 32,
// 43, 54, 65) keep their upstream colours so the worn armour tier stays readable; a pixel counts
// as stone when it has the same colour as the plain statue frame at that spot.
PAINT.statue = A => {
  const CRETE = ramp([[0, '0c0d10'], [30, '26282c'], [60, '4c4e52'], [90, '76787a'], [120, '9a9b9a'], [150, 'b4b4b0'], [190, 'cfcec8'], [230, 'e2e1db']]);
  const stoneMap = (c, x, y) => { const k = hsl(rgb(c)); if (k.s > 0.45 && (k.h < 20 || k.h > 340)) return null; return CRETE(L(rgb(c))); };
  const TIERS = [0, 21, 32, 43, 54, 65];
  for (const base of TIERS) for (let k = 0; k <= 15; k++) {
    const f = base + k; if (f >= A.count || !A.used(f)) continue;
    A.each([f], (_, x, y, c) => {
      if (base && A.get(k, x, y) !== c) return;                         // armour pixel
      const n = stoneMap(c, x, y); if (n) A.set(f, x, y, n);
    });
  }
};


// ================================================================ custom tiles (16x16 cells)
// Shared Renditequartier palette, taken from tools/generate-rendite-tiles.cjs (tiles_city.png):
// anthracite slabs 41454d/484c55/2f323a, fair-faced concrete, brass, corten.
const R = {
  concrete: ramp([[0x00, '000000'], [0x30, '34353a'], [0x60, '6b6c6e'], [0x90, '9d9d9b'], [0xb8, 'bdbcb7'], [0xd8, 'd6d5cf']]),
  brass: ramp([[0x30, '4a3a14'], [0x58, '7a5e22'], [0x70, '9a7a30'], [0x88, 'c29c42'], [0xa0, 'd8b456'], [0xc0, 'f0d27a']]),
  corten: ramp([[0x00, '120806'], [0x30, '3e1d10'], [0x50, '6a3419'], [0x70, '8e4a22'], [0x90, 'ad6430'], [0xc0, 'cf8c52'], [0xf0, 'f0d6b0']]),
  slab: ramp([[0x00, '000000'], [0x28, '26282e'], [0x38, '2f323a'], [0x44, '41454d'], [0x4c, '484c55'], [0x60, '5a5f69']]),
  // polished graphite for dark red-brown stone: same luminance, cool hue (keeps vignettes intact)
  graphite: c => { const l = L(c); return [l * 0.93, l * 0.99, l * 1.12]; },
};
const cls = c => {
  const k = hsl(c), red = k.h > 340 || k.h < 12;
  if (k.s >= 0.9 && k.h >= 30 && k.h <= 52) return 'gold';
  if (k.s >= 0.6 && red) return 'carpet';
  if (k.h >= 195 && k.h <= 245 && k.s < 0.35) return 'bluestone';
  return {k, red};
};

// ---------------------------------------------------------------- carpet.png (Carpet custom tile)
// Only the city rows are used by the game (row 3 = depth 16-20, row 4 identical for halls). The
// red lobby carpet stays (Concierge-Lobby, roter Teppich); its gold stitching becomes the
// quarter's brass. In the special row (cells 80-88) the pedestals get the corten of the
// Designerfeuerschale in tiles_city.png, the entrance ramp becomes concrete, and the investor
// statues stay as in tiles_city.png. Rows 0-2 (other regions, unused) are left untouched.
PAINT.carpet = A => {
  A.map(range(48, 88), (c, f) => {
    const t = cls(rgb(c)), l = L(rgb(c));
    if (t === 'gold') return R.brass(l + 14);
    if (f < 80 || typeof t === 'string') return null;
    if ([81, 87, 88].includes(f) && t.red && t.k.s < 0.35) return R.corten(l + 18);
    if (f === 82 && t.k.s < 0.35) return R.concrete(l);
    return null;
  });
};

// ---------------------------------------------------------------- city_boss.png (throne hall)
// The dark red-brown hex floor of the throne hall becomes polished graphite hex tiles (the
// darkening towards the walls is kept, it is pure luminance), the blue flagstone rim, throne and
// pedestal become the anthracite slabs of tiles_city.png, gold becomes brass, the stone arena
// gate with its columns turns into fair-faced concrete. Red carpet, the red summoning marks, statues and the
// coloured pedestal display stay as they are.
PAINT.city_boss = A => {
  const GATE = new Set([102, 103, 110, 111, 118, 119, 126, 127]);   // arena gate with columns (cols 6-7, rows 12-15)
  A.map(range(0, A.count - 1), (c, f) => {
    const src = rgb(c), t = cls(src), l = L(src);
    if (t === 'gold') return R.brass(l + 14);
    if (t === 'bluestone') return R.slab(l);
    if (typeof t === 'string') return null;
    if (GATE.has(f) && t.k.s < 0.25 && l > 20) return R.concrete(l);
    if (t.red && t.k.s < 0.45 && l < 70) return R.graphite(src);
    if (t.k.s < 0.12 && l > 60) return R.concrete(l);
    return null;
  });
};

// ---------------------------------------------------------------- city_quest.png (vault / Tresor)
// Tresor der Eigentümergemeinschaft: the brown vault floor and the giant summoning sign become
// graphite stone with brass studs, the rubble around the pit the anthracite slabs, the pit's
// ring brass. Red carpet, the green energy field and the gold heaps (loot) stay readable.
PAINT.city_quest = A => {
  A.map(range(0, A.count - 1), c => {
    const src = rgb(c), t = cls(src), l = L(src);
    if (t === 'gold') return null;                                   // gold loot stays gold
    if (t === 'bluestone') return R.slab(l);
    if (typeof t === 'string') return null;
    const {k} = t;
    if (k.h >= 30 && k.h <= 45 && k.s > 0.35) return R.brass(l + 10); // pit ring, fittings
    if (k.h >= 10 && k.h <= 25 && k.s >= 0.4 && l < 70) return R.brass(l + 40); // studs in the sign
    if ((k.h < 30 || k.h > 340) && k.s < 0.35 && l < 90) return R.graphite(src.map(v => v * 1.08));
    if (k.s < 0.2 && l >= 90) return R.concrete(l);
    return null;
  });
};

// ================================================================ run
const only = (() => { const i = argv.indexOf('--only'); return i >= 0 ? argv[i + 1].split(',') : Object.keys(PAINT); })();
const pi = argv.indexOf('--preview'), previewDir = pi >= 0 ? path.resolve(argv[pi + 1]) : null;
const results = [];
for (const name of only) {
  if (!PAINT[name]) throw new Error('unknown sheet ' + name);
  const A = load(name);
  PAINT[name](A);
  if (A.out.w !== A.src.w || A.out.h !== A.src.h) throw new Error(name + ': size changed');
  let changed = 0;
  for (let i = 0; i < A.src.px.length; i += 4) {
    if (A.src.px[i + 3] !== A.out.px[i + 3]) throw new Error(name + ': alpha changed at pixel ' + (i / 4));
    if (A.src.px[i] !== A.out.px[i] || A.src.px[i + 1] !== A.out.px[i + 1] || A.src.px[i + 2] !== A.out.px[i + 2]) changed++;
  }
  const png = encodePNG(A.out);
  if (Buffer.compare(decodePNG(png).px, A.out.px) !== 0) throw new Error(name + ': PNG round trip mismatch');
  fs.writeFileSync(path.join(ROOT, ASSETS, A.def.file), png);
  console.log(A.def.file + '  ' + A.src.w + 'x' + A.src.h + '  frame ' + A.fw + 'x' + A.fh + '  ' + changed + ' px changed, alpha identical');
  results.push(A);
}

// ---------------------------------------------------------------- previews (original above result)
if (previewDir) {
  fs.mkdirSync(previewDir, {recursive: true});
  const bgAt = (x, y) => (((x >> 3) + (y >> 3)) & 1) ? [62, 60, 56] : [74, 72, 67];
  const canvas = (w, h) => { const c = {w, h, px: Buffer.alloc(w * h * 4)}; for (let i = 0; i < w * h; i++) c.px.writeUInt32BE(0x202028ff, i * 4); return c; };
  const blit = (dst, img, sx, sy, w, h, dx, dy, S) => {
    for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) {
      const X = dx + x, Y = dy + y; if (X >= dst.w || Y >= dst.h) continue;
      const i = ((sy + (y / S | 0)) * img.w + sx + (x / S | 0)) * 4, a = img.px[i + 3] / 255, q = (Y * dst.w + X) * 4, bg = bgAt(X, Y);
      for (let k = 0; k < 3; k++) dst.px[q + k] = Math.round(img.px[i + k] * a + bg[k] * (1 - a));
      dst.px[q + 3] = 255;
    }
  };
  for (const A of results) {
    const tiles = A.def.file.startsWith('environment/');
    if (tiles) { // whole sheet, original left, result right
      const S = A.src.w > 128 ? 3 : 4, c = canvas(A.src.w * S * 2 + 12, A.src.h * S);
      blit(c, A.src, 0, 0, A.src.w, A.src.h, 0, 0, S); blit(c, A.out, 0, 0, A.src.w, A.src.h, A.src.w * S + 12, 0, S);
      fs.writeFileSync(path.join(previewDir, A.name + '-x' + S + '.png'), encodePNG(c));
      continue;
    }
    const S = 6, used = range(0, A.count - 1).filter(f => A.used(f)), perRow = Math.min(used.length, 17), gap = 4;
    const rows = Math.ceil(used.length / perRow), cw = A.fw * S + gap, rh = 2 * (A.fh * S + gap) + 10;
    const c = canvas(perRow * cw, rows * rh);
    used.forEach((f, k) => {
      const dx = (k % perRow) * cw, dy = Math.floor(k / perRow) * rh, sx = (f % A.per) * A.fw, sy = Math.floor(f / A.per) * A.fh;
      blit(c, A.src, sx, sy, A.fw, A.fh, dx, dy, S); blit(c, A.out, sx, sy, A.fw, A.fh, dx, dy + A.fh * S + gap, S);
    });
    fs.writeFileSync(path.join(previewDir, A.name + '-x6.png'), encodePNG(c));
  }
  console.log('previews in ' + previewDir);
}
