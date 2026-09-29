# Neukoelln Pixel Dungeon

Working design, 2026-09-29. This is a playable fork in development, not a claim
that all features below have shipped. The working title is provisional.

## Core direction

Keep Shattered Pixel Dungeon's small, readable sprites and turn-based tactics.
The setting is an impossible underground Neukoelln: apartment courtyards lead
into flooded basements, forgotten U-Bahn platforms and bureaucratic ruins.
Cute faces, grubby places, sharp dialogue. Social satire targets rent extraction,
status anxiety, consumption, bureaucracy and everybody's claim to own the Kiez.
Give every playable group a strength and a blind spot; none is the default villain.

Monkey Island informs recurring characters, dry responses and joke payoffs.
Goat Simulator informs surprising physical interactions. They are tonal references,
not sources of copied characters, dialogue, names, music or assets.
Comedy must preserve tactical clarity: a silly item still states its damage,
duration, targeting, charges and side effects honestly.

## Four playable classes

| Class | Role | First implementation direction | Later signature ability |
| --- | --- | --- | --- |
| Expat | Mage | Adapt the existing mage mechanics | Foreign-language incantations such as "Let's circle back" with clear German effect text |
| Alteingesessene | Tank | Adapt the existing warrior mechanics | "Ick wohn hier": hold ground and counter displacement |
| Zugezogene | Ranged | Adapt the existing huntress mechanics | Distance control, improvised projectiles and marked targets |
| Tourist | Rogue | Adapt the existing rogue mechanics | Concealment, surprise attacks and camera-flash distraction |

Renaming existing classes is an initial playable foundation. New abilities,
talents, equipment and class sprites require separate implementation and balance.
The four classes should be available without legacy achievement unlocks.

## Spati

The Spaetimann is the merchant, never a player class. He appears on depths
6, 11 and 16 and offers both buying and selling. The shop is a recognizable
safe landmark: refrigerator glow, packed shelves and a tired, ordinary proprietor
who remains unfazed by the escalating supernatural mess outside.
Do not use the owner's ethnicity as the joke. His dry dialogue, inventory and
changing neighborhood give him a personality beyond the shop function.

## Areas and encounter roadmap

Canon since 2026-09-29 (details, places and mappings: `docs/NEUKOELLN-WELT.md`):

| Depths | Upstream | Area | Boss | Bespoke enemy (implemented) |
| --- | --- | --- | --- | --- |
| 1-5 | Sewers | Neukoellner Hinterhoefe: courtyards, cellars, canals | Mietschimmel (Goo) | Herr Fuss (gas), Leihscooter (lane charge), Pfandgolem (shards) |
| 6-10 | Prison | Das Amt ohne Termin: underground citizens' office | Schalterspringer (Tengu) | Terminhaendler (slow + retreat) |
| 11-15 | Caves | Die ewige Baustelle: U7/U8 tunnel construction | DM-300 Bohrlinde | Presslufter (telegraphed area pound) |
| 16-20 | City | Das Renditequartier: luxury redevelopment | Koenig der Eigentumswohnungen (Dwarf King) | Luxussanierer (telegraphed fences) |
| 21-25 | Halls | Unter dem Rathaus: the root of it all | Ewiger Mietspiegel (Yog-Dzewa) | Hausordnungs-Hydra (contradictory rules) |

Every bespoke enemy announces its special move one turn ahead (status text, log line,
and for area moves red target markers), and its description states numbers and counterplay.

These are themes to prototype using existing level generation first. Distinct
room geometry, tilesets, set pieces and boss fights remain an art/gameplay phase.

Candidate mechanics:

- Pfandgolem: a durable pile of bottles; smashed glass changes where it is safe to step.
- E-Scooter: announces a straight-line charge before moving; crashes have consequences.
- Zu-verschenken-Karton: a recognizable mimic variant with suspicious discarded furniture.
- Besichtigungsmakler: claims arena space through clearly telegraphed construction.
- Hausordnungs-Hydra: opposing rules create a puzzle rather than an unreadable punishment.
- Gas-producing rolling alchemist: a fictional apparatus makes visible gas patches;
  ventilation and ignition become tactical choices. "Herr Fuss" is an unverified
  user-provided reference, not a verified biography. Do not reproduce identifying
  features or portray disability itself as the reason a person is dangerous.

## Art rules

- Keep the base game's pixel grid, frame sizes and animation pacing.
- Use nearest-neighbor presentation, crisp silhouettes and intentional small clusters.
- Differentiate factions and hazards by outline and shape as well as color.
- City masonry can be muted; windows, signage, clothing and magic supply varied accents.
- Teal, warm yellow, brick red and small acid-green effects are accents, not a global filter.
- Avoid realistic gore; use little dust puffs, fragments, comic recoil and readable effects.
- Gameplay sprites must fit existing collision and animation expectations. Never resize
  a shared atlas without checking every frame consumer.

## Delivered original artwork

`core/src/main/assets/interfaces/neukoelln-title.png` is new original RGBA pixel
art generated by `node tools/generate-neukoelln-title.cjs`. It uses no downloaded
art or external font. The title reads "NEUKOELLN" with a rendered O umlaut,
with a Pixel Dungeon subtitle, apartment silhouettes and a small U-Bahn sign.

Its exact frame contract matches the existing title layout:

| Frame | x | y | width | height |
| --- | ---: | ---: | ---: | ---: |
| Portrait | 0 | 0 | 139 | 100 |
| Portrait glow | 139 | 0 | 139 | 100 |
| Landscape | 0 | 100 | 240 | 57 |
| Landscape glow | 240 | 100 | 240 | 57 |

The existing boss-slain and game-over artwork remains in `banners.png`.
The new atlas must only be selected for those four title frames.
The generator has been run and its resulting image visually inspected. In-game
portrait and landscape appearance still depends on runtime verification.

`core/src/main/assets/sprites/gas-alchemist.png` is also original generated
pixel art. Run `node tools/generate-gas-alchemist.cjs` to reproduce its 256x64
RGBA atlas. Eleven 12x15 frames match GnollSprite's idle, attack, run and death
frame indices exactly. A purple-coated, goggled alchemist sits in a silver
wheelchair with a strapped-on green gas cylinder; the leaking apparatus makes
the attack source visible. All art is fictional, with no photographic likeness.
The atlas was generated and visually inspected; animation timing is inherited
from the base sprite and needs a combat playtest.

## Content provenance and next milestones

Reddit stories are inspiration requiring actual source checks. Earlier conversation
examples are not verified reporting. Record exact public links and distinguish
community anecdotes from established facts before adapting a specific story.
Prefer invented composite characters and original dialogue over direct portraits.

1. Build and launch: verify four classes, German entry flow, title art and merchants.
2. First bespoke combat slice: one room motif, three readable enemies and one boss.
3. Replace the initial classes' equipment and animations with original pixel art.
4. Add recurring NPC stories and object interactions; playtest joke frequency.
5. Expand all five districts, class talents, sound and music, then balance full runs.

Retain upstream license and attribution. New branding must not imply an official
Shattered Pixel Dungeon release or endorsement.

## Hinterhof-Tileset

`core/src/main/assets/environment/tiles_sewers.png` (floors 1-5, "Neuköllner
Hinterhöfe") is regenerated by `node tools/generate-hinterhof-tiles.cjs`. The script
reads the unmodified upstream v4.0.0 atlas from git (blob
`77569cd99f0b5cc30629e28a29892f42206e7c86`, or `--source file.png`), never its own
output, so repeated runs give byte-identical results. `--preview DIR` also writes 3x
atlas previews and a 14x10-cell mini map (original and new) that follows the
selection logic of `DungeonTerrainTilemap` and `DungeonWallsTilemap`. It needs only
Node and zlib and uses no downloaded art.

Contract: the 16x16 grid, every cell's function and every pixel's alpha value are
unchanged. The script checks alpha and stops if any pixel's alpha differs. Only RGB
changes, so wall stitching, overhangs, water edges and shadows still line up.

| Tile function (DungeonTileSheet) | Hinterhof look |
| --- | --- |
| FLOOR / ALT_1 / ALT_2 | grey Gehwegplatten on an 8px running-bond grid; ALT_1 adds a Kleinpflaster patch and a hairline crack; the rare ALT_2 is a small, low-contrast Gullydeckel |
| floor seen through other cells (water edges, grass, stairs, doors, props) | original floor colours replaced by the new slab pattern at the same grid position, so seams match |
| FLOOR_DECO / GRASS / EMBERS | original moss, grass and ash on the new slabs; FLOOR_DECO_ALT gets a cigarette butt |
| FLOOR_SP | Ochsenblut-painted Altbau floorboards |
| raised wall face | red-brown clinker with dark grout; the original shading is kept through a luminance ramp |
| wall rims, internal walls, overhangs, flat walls | pale, dusty clinker cap with grey-green lichen |
| RAISED_WALL_ALT | brick with a chipped Putz remnant; wall ends (+1/+2) also carry an abstract, letter-free pink/teal tag |
| WALL_DECO / _ALT | Barbershop window (barber pole, mirror, chair) with a dripping sill / zinc Fallrohr ending at the drip point (SewerLevel's Sink emitter stays valid); see docs/NEUKOELLN-ART-TILES.md |
| doors | green Altbau-Hoftür; locked door is grey with a brass padlock; crystal vault doors unchanged |
| ENTRANCE / EXIT | concrete Kellertreppe; the down-stair pit has a brick edge |
| REGION_DECO / _ALT (barrels) | grey ribbed Mülltonne with black lid / yellow lid, redrawn inside the barrel silhouette |
| BARRICADE | Sperrmüll pile of dry wood with a bicycle wheel (still reads as flammable wood) |
| statues, well, pedestal, alchemy pot, bookshelves, grass, crystal/mining tiles | unchanged apart from the floor showing through |

Palette (hex): slabs `393836` `464541` `4c4b48` `4f4e4a` `5a5955`; cobbles `403e3a`
`55534e` `625f59`; brick face ramp `35231f` `6b372c` `7e4233` `8f4c3a` `a05a43`;
brick cap ramp `573f36` `94664f` `b38266` `c39473` `d0a483`; lichen `4f5a36` `75804f`;
Putz `a39987` `b9b09c` `4a332c`; door green `2b4632` `3b6144` `507d57`; door grey
`393c42` `52565d` `6c7179`; brass `8a6a26` `c49a3e`; bin `2e3438` `434b50` `535c62`;
yellow lid `a8821c` `d2a82c`; Dielen `5d2820` `6e3226` `7d3b2c`; zinc `5d676c`
`8c969b` `b4bec2`; tag `d76a9a` `4fb3a8` `2a1f2a`.

Status: the atlas has been generated. The atlas and mini-map previews were visually
inspected. Automated checks confirmed identical alpha, determinism and a 256x256 RGBA
output. The following is not verified or done yet:
- Runtime check in the game on desktop is still pending: lighting and fog, the
  Sink drip position on both wall deco variants, water-edge seams against the animated
  `water0.png`, and the boss floor (SewerBossLevel uses the same atlas).
- `water0.png` is unchanged. Its green Altbauwasser still fits the new tiles.
- Text follow-up for the lore agent: `levels.sewerlevel.region_deco_name/desc` still
  says "Aufbewahrungsfass". The art now shows a Mülltonne. Destroying one still leaves
  water or SP floor, as in `SewerLevel.destroy`. `levels.level.barricade_desc` could
  mention Sperrmüll. `empty_deco_desc` (moss) still matches.
- No clothesline (Wäscheleine) exists yet. No cell in this atlas has a suitable
  shape. It needs a separate decoration or a custom-deco asset.
- Mining-branch tiles (MINE_*, WALL_INTERNAL_DECO) were remapped generically and have
  not been reviewed, because the sewers never use them.

## Splash-Artwork

The painted upstream splashes (`splashes/*.jpg`) are replaced for the four
playable classes and the five regions by original pixel scenes
`core/src/main/assets/splashes/nk_*.png`. Run
`node tools/generate-neukoelln-splashes.cjs [scene ...]` to reproduce them; the
output is deterministic (no randomness without a fixed seed, no downloaded art,
no external font). Each scene is drawn at 160x90 and scaled 5x with nearest
neighbour to 800x450 RGB, the size of the upstream splash. `--crop=scene,x,y,w,h`
writes a 10x detail preview to `$PREVIEW_DIR` for review.

| File | Role / region | Motif |
| --- | --- | --- |
| `nk_warrior.png` | Alteingesessene | Older woman in a track jacket, arms crossed, glasses, shopping net, dachshund in a sweater; Altbau facade, neon "SPÄTI", doorbell wall, bubble "ICK WOHN HIER" |
| `nk_mage.png` | Expat | Beanie, lanyard, laptop held like a spellbook, glowing selfie-stick staff; Sichtbeton café, neon "DISRUPT", glyph speech bubbles, oat-milk cup |
| `nk_huntress.png` | Zugezogene | Mullet, colour-block windbreaker, jute bag, drawing a bow on a balcony with a flower box; Hinterhof roofs, wide flat field with kites at sunset |
| `nk_rogue.png` | Tourist | Sun hat, sunburnt nose, floral shirt, fanny pack, camera; half hidden behind a poster-covered advertising column; generic blue "U" sign, Späti, Imbiss with spit, pigeons |
| `nk_sewers.png` | Neuköllner Hinterhöfe | Night courtyard, bins with a rat, bike corpses and a lonely lock, give-away box, cellar stairs to a green-lit door |
| `nk_prison.png` | Das Amt ohne Termin | Endless one-point corridor, counters, orange waiting chairs, number display "NR 0815", ticket machine, a skeleton still waiting |
| `nk_caves.png` | Die ewige Baustelle | Subway tunnel rings, converging rails, scaffolding with sign "BAUENDE 20??", barriers, yellow drill rig |
| `nk_city.png` | Das Renditequartier | Glass tower "NEU GEDACHT" swallowing an Altbau, cranes, "LOFTS" concierge lobby with red carpet, graffiti "MIETE?" |
| `nk_halls.png` | Unter dem Rathaus | Upside-down town-hall tower with backwards clock hanging over mountains of files, flying rejected forms, red glow |

Composition rules: class figures are 45-65 px tall (of 90). HeroSelectScene
scales the splash to screen height and shifts it right by half the UI column
(`max(100, w/3)/2`), so in the 160 px source only x ~20..128 stay visible at 16:10
(x ~27..133 at 16:9, x ~40..120 at 4:3). Figures, signs and speech bubbles
are kept inside x 28..125; portrait (9:16) shows only x ~55..105. Region
scenes keep the centre readable for loading text. Each scene uses its own palette
of roughly 26-43 colours (outline, one shade and one highlight per material; the
prison and caves use five-step depth fog). All people are invented composites,
no real brands, logos, transit operator marks or persons are depicted.

`Assets.Splashes` now points WARRIOR, MAGE, ROGUE, HUNTRESS, SEWERS, PRISON,
CAVES, CITY and HALLS to the new PNGs. DUELIST and CLERIC still use the upstream
JPGs because these classes are not playable. The upstream JPGs stay in the repo.

### Title background layers

`node tools/generate-neukoelln-title-bg.cjs` regenerates the four parallax atlases
in `splashes/title/` (`--preview` writes flattened previews to `$PREVIEW_DIR`).
Sizes, frame grids and binary alpha match `ui/TitleBackground.java`:
`archs.png` 1024x256, 6 frames 333x100: dark Altbau wall with white casement
windows whose panes are transparent (void shows through), variants with a lit
window, OSB boards, a bay, a balcony with plants and fairy lights, a klinker plinth
with tags, and bulky waste on the ledge. `back_clusters.png` 512x512, 2 frames
450x250: bricks, leaves, crown caps, butts, render flakes. `mid_mixed.png`
2048x1024, 24 frames 273x242: facade and bay chunks, windows, balcony, invented
shop fronts ("SPÄTI", "KNEIPE" with invented pennants, "GRILL"), tree pit with
fence, old roadster and kids' bike, skip container, orange litter bin, blue bags
and paint buckets, abandoned printer, radiator, beer bench, bollards, chimney
with pigeon, pavement piece. `front_small.png` 1024x512, 20 frames 112x116:
bottles, caps, leaf, brick, paint bucket, bag, boots, geranium, cup, wheel,
pigeon, cone, plank, flyer, U-lock, pennant, key, crate, jute bag. Motifs follow
the street photos summarised in `docs/NEUKOELLN-REFERENZ.md`; no real shop
names, brands, plates or numbers were copied. Drawn on a half-resolution grid
and doubled.

Open points (not yet verified in game):
- `InterlevelScene` still uses the upstream portrait focus points
  (`loadingCenter`, comments mention rats, skeletons, gnolls). They crop
  reasonably on the new scenes but should be re-tuned by the gameplay owner.
- Hero-select and loading screens were only checked as images; the in-game
  look (scaling, fades, landscape/portrait) still needs a desktop run.

## Regionen-Tilesets

### Gemeinsames Verfahren und terrain_features.png

`tools/lib/tileset-kit.cjs` is shared by the region generators. It holds the PNG
codec, the luminance ramps, the DungeonTileSheet cell indices, floor substitution,
face redrawing that keeps the shading of the +1/+2/+3 wall-end variants, alpha
verification and a mini-map preview. Each generator reads its original atlas from a
git blob, so runs are repeatable. The flags are `--preview DIR`, `--source` and `--out`.

Runtime finding (Xvfb screenshot, level 1): since v4.0, `TerrainFeaturesTilemap`
draws the props from `environment/terrain_features.png`, one row per region
(cells `128 + 16*stage`). These props are tall grass, grass, barricade, alchemy pot,
statue, REGION_DECO and REGION_DECO_ALT. So recolouring only the region atlas left
brown barrels in the game. Those feature cells are exact masked copies of the raised
cells in the region atlas. `syncFeatures` therefore copies the new pixels into the
region's row and leaves the other rows untouched. `generate-hinterhof-tiles.cjs` now
also writes row 0 (bins, bulky-waste pile), and every region generator writes its own
row. The overhang cells (lids and backrests) stay in the region atlas.

### Das Amt ohne Termin (tiles_prison.png, Ebenen 6-10)

Run `node tools/generate-amt-tiles.cjs`. It reads blob
`92356756990e6c0bf187d6fc4c272016e9de2dd3` and writes feature row 1.
- The floor is greige-green PVC tiles on an 8px checker. ALT_1 has a faint scuff and
  the rare ALT_2 has a yellow "keep your distance" tape line.
- Blood stains became coffee and stamp-ink stains, matching `empty_deco_desc`.
- FLOOR_SP (a metal grate before) is blue-grey office carpet.
- Walls have a cream rim. The raised face has a pale Behördengrün paint upper half,
  a dark-green trim line and cream wall tiles on the lower half.
- The alt faces carry small, sparse details. The straight wall (+0) has a light
  switch, the right end (+1) a fire extinguisher and the left end (+2) a green
  pictogram sign with a double arrow and no text.
- WALL_DECO keeps PrisonLevel's Torch emitter (flame and halo at the cell centre). It
  is drawn as a brass wall lamp with a milk-glass bowl. The alt adds a waiting-number
  display made of LED blocks with no digits.
- Closed and open doors are milk-glass doors in aluminium frames. The locked door is
  a grey ribbed metal door (roller-shutter look) with a brass padlock. Crystal doors
  are unchanged.
- The bookshelf is an Aktenregal: grey steel shelves and folder spines in five
  colours.
- The barricade is a row of orange waiting-room chairs on a chrome beam. It is still
  flammable, and the chair backrests sit in the overhang cell.
- REGION_DECO keeps the cage (Wartekabine, as the lore text says), now in cool chrome.
  The raised one holds a small number ticket.
- Stairs are grey terrazzo. Statue, alchemy pot, well, grass and embers are unchanged.

Palette (hex): PVC `57594f` `505248` `42443c`; paint `7b9477` `869f82` `4f6a4c`; wall tiles
`a7a28b` `b9b49c` `847f6b`; carpet `38414f` `46506a`; glass `8d989e` `b0bcc1` `d2dcdf`; chairs
`c0621f` `df8a3c`; extinguisher `b8322c`; sign `2f9a55`; LED `ff5a3c`.

Status: the atlas has been generated. The atlas and mini map were inspected and alpha
matches the original. Not yet verified at runtime: lamp flames on the lamp, the
hanging cage over a chasm, and PrisonBossLevel and the custom prison tiles
(`custom_tiles/prison_*.png`, unchanged). The waiting-room chairs are drawn but only
the default barricade text describes them. A text hint for the lore agent would help
(`levels.level.barricade_desc` is shared by all regions).

### Die ewige Baustelle (tiles_caves.png, Ebenen 11-15)

Run `node tools/generate-baustelle-tiles.cjs`. It reads blob
`c55271e14ac9ab0cf68cae29df620d13dcfda6d8` and writes feature row 2.
- The floor is dark shotcrete with a little aggregate. ALT_1 has a hairline crack and
  one ballast stone. The rare ALT_2 is a leftover track sleeper with rail stubs. The
  pebble deco reads as spilled track ballast.
- The rims are rough shotcrete. Raised faces are concrete tunnel segments
  (Tübbinge) with staggered joints and bolt pockets. Every face carries a continuous
  cable tray with black and orange cables at the same height, so runs join up.
- On the alt faces, the straight wall (+0) has an orange surveyor's spray mark and
  open wall ends (+1/+2/+3) have yellow/black edge protection.
- WALL_DECO: the gold vein is a burst bundle of copper cable. CavesLevel's Vein
  sparkles now read as glinting copper, which matches `wall_deco_desc`. Gold on the
  mining-only deco walls is recoloured to copper as well.
- Doors are OSB site doors with a yellow/black kick strip. The locked door is steel
  with a brass padlock. Crystal doors are unchanged.
- The barricade is a red and white construction barrier. It is still a flammable
  obstacle.
- REGION_DECO (Tunnelgerüst) is galvanised scaffolding with orange toe boards on top.
- The ladders (Bauleiter) are aluminium. Mushrooms, statue, bookshelf and water are
  unchanged.

Palette (hex): shotcrete `33312e` `3b3935` `2c2a27`; segments `6b6964` `7a7872` `3a3936`;
tray `8c9195`; cable `1c1d20` `c8641e`; copper `7a3618` `b4602c` `e09250`; warning
`e2b92c` `1d1c1a`; OSB `7a5c30` `a8844c`; barrier `c8322a` `e8e4dc`.

Status: the atlas has been generated and checked like the others. Not yet verified
at runtime: the Vein sparkle positions on the copper, and CavesBossLevel and the
custom caves tiles (`custom_tiles/caves_*.png`, unchanged). Nothing was checked
against the mining branch atlases (`tiles_caves_crystal/gnoll.png`, unchanged).

### Das Renditequartier (tiles_city.png, Ebenen 16-20)

Run `node tools/generate-rendite-tiles.cjs`. It reads blob
`9a0216d91f9951cd6196fadbc33d0b516742bc7b` and writes feature row 3.
- The floor is large polished anthracite slabs in a running bond with a faint
  reflection line. ALT_1 has a natural-stone vein and the rare ALT_2 a brass inlay
  strip. The missing-slab deco is unchanged, matching `deco_desc`.
- FLOOR_SP is oak parquet in a herringbone-like pattern (it was a carpet).
- The rims are fair-faced concrete (Sichtbeton). Raised faces have a glass curtain
  wall with aluminium mullions and a diagonal reflection over a concrete slab edge,
  then an old stucco cornice and old red brick. That is the Altbau left underneath.
- On the alt faces, the straight wall (+0) has a Sichtbeton panel with tie holes,
  the right end (+1) a CCTV camera and the left end (+2) a blank brass concierge
  plaque.
- WALL_DECO keeps CityLevel's Smoke emitter and is drawn as a louvred stainless
  exhaust vent.
- Doors are smoked glass with brass light slits. Locked doors carry a brass padlock.
  Crystal doors are unchanged.
- REGION_DECO (Designerfeuerschale, with the GreenFlame emitter) is a corten steel
  bowl on a plinth. The alt one is anthracite.
- The bookshelf is white lacquer. The barricade is stacked pale-pine pallet lounge
  furniture, still dry wood. Ramps are concrete. The investor statue is unchanged.

Palette (hex): slabs `41454d` `484c55` `2f323a`; glass `2b4550` `314f5b` `5a8595`; mullions
`8a9399`; cornice `b8a283`; old brick `7e4a38` `925a44`; Sichtbeton `a09e98`; oak `8a5a32`
`7a4e2b`; corten `8e4a22` `ad6430`; brass `9a7a30` `d2ac4c`.

Status: the atlas has been generated and checked like the others. Not yet verified at
runtime: the green flame on the bowls, the smoke position on the vent, and
CityBossLevel and `custom_tiles/city_*.png` (unchanged). `water3.png` is unchanged
and still dark red, which does not fit "Zierwasserbecken". A blue decorative-pond
texture would be a follow-up if wanted.

### Hinterhof-Nachschärfung nach Fotoreferenzen (tiles_sewers.png)

This revision follows the owner's street photos (`docs/NEUKOELLN-REFERENZ.md`). No
names, plates, brands or logos were taken from them. It replaces several rows of the
table in "Hinterhof-Tileset".
- The floor is now a Berlin pavement. FLOOR has large Waschbeton slabs with sparse
  exposed pebbles. ALT_1 is Mosaikpflaster: small irregular grey stones with dark sand
  joints. The rare ALT_2 is a Kellerlichtschacht grate, kept low-contrast so it never
  reads as a trap.
- The raised face is grey-brown Rauputz over a yellow clinker plinth. The rims are
  now grey-brown render instead of red clinker.
- Alt faces: +0 has a Putzabplatzer showing old red brick, +1 an abstract white
  bubble tag on the clinker, +2 a black tag on the render and +3 a small pink tag.
  None of them contains letters. The Kellerfenster and Fallrohr are unchanged.
- REGION_DECO is now an orange street litter bin with a round slot, a tape band and a
  scribble, with no logo. It reads better on grey pavement than a black bin.
  REGION_DECO_ALT stays the grey bin with a yellow lid.
- Grass and tall grass read as an overgrown tree pit with small yellow flowers.

Text follow-up for the lore agent: `levels.sewerlevel.region_deco_name/desc` describes
a courtyard bin with a black or yellow lid. That now only matches the alt; the main
variant is a litter bin (Straßenpapierkorb).

### Unter dem Rathaus (tiles_halls.png, Ebenen 21-25)

Run `node tools/generate-rathaus-tiles.cjs`. It reads blob
`dd53fe5fecd0c500bac5b6118e5f8acf44b39623` and writes feature row 4.
- The floor keeps the dark hex slabs. The red ember cracks on FLOOR_DECO are a little
  brighter so the "Glut aus dem Boden" reads at zoom 1.
- The rims are sandstone and keep the upstream crenellation notches. Raised faces
  have a sandstone cornice (Sandsteinsims) with a shadow line over dark red Rathaus
  clinker in two-row courses.
- On the alt faces, the straight wall (+0) has a sandstone medallion and the wall
  ends have iron wall anchors.
- WALL_DECO (a stained-glass window before) is a Paternoster shaft. The main variant
  shows a lit cabin passing. The alt shows the gap between cabins with the chain.
- Doors are heavy oak with brass fittings; the vine pattern became a brass ornament.
  Locked doors carry a brass padlock. Crystal doors are unchanged.
- The barricade is an Aktenberg: two stacks of files with coloured folder spines. It is
  bone dry, so it still reads as flammable.
- REGION_DECO (Rathausbrocken) is a broken sandstone foundation block. Stairs are
  sandstone. The skull column (Säule), the glowing mushrooms, the law-book shelf, the
  special floor and the cold lava are unchanged.

Palette (hex): clinker `5e2a22` `6e3328` `4c211b`; grout `2e1a17`; sandstone `b39a72` `c9b288`
`7a6548`; cabin `6b4526` `8a5c33`; lamp `ffd27a`; oak `4a2c16` `6e4322`; files `e6ddc4`
`bfb498` with folders `9a3030` `34507c` `3f6a42`.

Status: the atlas has been generated and checked like the others. All five region
generators reproduce the committed or working files byte for byte. Not yet verified at
runtime: HallsLevel's Stream visuals on the water, and HallsBossLevel and
`custom_tiles/halls_special.png` (unchanged). The Paternoster has no animation; a
moving cabin would need a Java visual owned by the gameplay agent.

## Kiez-Fallen: Hundehaufen (terrain_features.png)

Run `node tools/generate-kiez-traps.cjs` (`--preview DIR` renders all combinations
at 6x plus a level-1 mini map with a few piles).

The trap frames live only in `environment/terrain_features.png`. The index is
`(active ? color : Trap.BLACK) + shape*16`, used by `TerrainFeaturesTilemap`,
`WndInfoTrap`, the journal catalogue (`WndJournal` via `getTrapVisual`) and
`PrisonBossLevel.FadingTraps`. Rows 0-6 are the shapes and columns 0-8 the colours.
Column 8 (BLACK) is the triggered or inactive trap. The frames do not depend on the
region, so every region shares the same piles. No other atlas contains trap graphics.

- **Active trap:** a small three-tier pile with a curled tip, a glint, a crease line
  and a soft shadow, in the trap's colour family. GREY keeps rust flecks, as in the
  original.
- **Shape:** a paper flag on a toothpick carries the shape glyph. The glyphs are four
  spots (DOTS), a wave (WAVES), diagonal bars (GRILL), an X sparkle (STARS), a
  diamond ring (DIAMOND), a cross with a hollow centre (CROSSHAIR) and a solid block
  (LARGE_DOT). All 7x8 active combinations are distinct.
- **Triggered trap:** a flat grey pancake with a shoe-sole print. The greyed flag
  still shows the shape.
- The generator starts only these 63 cells from scratch. The kit's region sync
  leaves them alone, and all other rows of the file stay unchanged.

| Trap class | Colour | Shape (flag glyph) |
| --- | --- | --- |
| AlarmTrap | RED | DOTS |
| DisarmingTrap | RED | LARGE_DOT |
| GuardianTrap | RED | STARS |
| PitfallTrap | RED | DIAMOND |
| BurningTrap | ORANGE | DOTS |
| BlazingTrap | ORANGE | STARS |
| ExplosiveTrap | ORANGE | DIAMOND |
| ShockingTrap | YELLOW | DOTS |
| StormTrap | YELLOW | STARS |
| OozeTrap | GREEN | DOTS |
| WeakeningTrap | GREEN | WAVES |
| ToxicTrap | GREEN | GRILL |
| PoisonDartTrap | GREEN | CROSSHAIR |
| TeleportationTrap | TEAL | DOTS |
| SummoningTrap | TEAL | WAVES |
| ConfusionTrap | TEAL | GRILL |
| WarpingTrap | TEAL | STARS |
| GeyserTrap | TEAL | DIAMOND |
| GatewayTrap | TEAL | CROSSHAIR |
| DistortionTrap | TEAL | LARGE_DOT |
| CursingTrap | VIOLET | WAVES |
| DisintegrationTrap | VIOLET | CROSSHAIR |
| ChillingTrap | WHITE | DOTS |
| FlockTrap | WHITE | WAVES |
| FrostTrap | WHITE | STARS |
| GrippingTrap | GREY | DOTS |
| CorrosionTrap | GREY | GRILL |
| FlashingTrap | GREY | STARS |
| RockfallTrap | GREY | DIAMOND |
| WornDartTrap | GREY | CROSSHAIR |
| GrimTrap | GREY | LARGE_DOT |

Status: the atlas has been generated. The 6x grid and the level-1 mini map were
inspected. Not yet verified at runtime: the journal catalogue and the trap info
window, and the fade-in of the prison boss traps. The trap names and descriptions
(`*.properties`) still describe classic traps; that is the lore agent's part.

## Wandplakate und Graffiti: Kanzler "März" und Club-Kultur

"März" is a fictional parody chancellor. There are no real names, party names,
logos, quotes or faces, and the club names are parodies. The words are drawn with a
tiny 3x4 pixel font (`word()` in `tools/lib/tileset-kit.cjs`) and read at 16px as
3-4 letters. Everything sits inside the wall cells: grid, alpha and autotiling are
unchanged, and the generators stay deterministic.

Which tile function shows which motif:

| Region (generator) | Cell (DungeonTileSheet) | Motif |
| --- | --- | --- |
| Hinterhof 1-5 (`generate-hinterhof-tiles.cjs`) | RAISED_WALL_ALT +1 (wall end, open right) | Torn grey-blue election poster "MÄRZ" with a pale-blue bar, a moustache drawn on it and a green spring-flower sticker (standing in for "Frühling kommt trotzdem"; not readable at this size) |
| Hinterhof 1-5 | RAISED_WALL_ALT +2 (wall end, open left) | Red crossed-out "M" on the render, black "RAUS" sprayed on the clinker |
| Hinterhof 1-5 | RAISED_WALL_ALT +3 (single pillar, rare) | Club flyer wall: pink "BÄRG" flyer over three small colourful flyers |
| Hinterhof 1-5 | RAISED_WALL_ALT +0, WALL_DECO_ALT | unchanged: chipped render, Fallrohr (WALL_DECO and RAISED_WALL +1/+2/+3 are Sonnenallee shopfronts, see docs/NEUKOELLN-ART-TILES.md) |
| Amt 6-10 (`generate-amt-tiles.cjs`) | RAISED_WALL_ALT +2 | Pinned election poster "MÄRZ" with a red pin, a moustache and a torn corner (replaces the exit sign) |
| Amt 6-10 | RAISED_WALL_ALT +3 | The exit sign moved here (it used to be a scuff) |
| Amt 6-10 | RAISED_WALL_DECO_ALT (all 4) | Crossed-out red "M" graffiti next to the LED display; lamp and Torch emitter unchanged |
| Baustelle 11-15 (`generate-baustelle-tiles.cjs`) | RAISED_WALL_ALT +0 (straight wall, about half of all straight walls) | Wild-posted techno poster: acid-green "BÄRG" on black with pink dots; the surveyor mark peeks out above |

Other regions are unchanged. Club flyers and posters only appear on raised faces;
flat mode keeps the older decorations.

Text keys for the lore agent. All of the alt-face motifs are only visual variants of
plain `Terrain.WALL`. They share `levels.level.wall_name` and have no description of
their own, so lore can describe them only in general terms. A description per motif
would need a Java change owned by the gameplay agent. The code reads only these wall
keys: `levels.level.wall_name` (all walls, including WALL_DECO) and
`levels.caveslevel.wall_deco_desc` (copper cable deco, unchanged; CavesLevel and
CavesBossLevel). `levels.mininglevel.wall_desc` is for the mining branch only. A
`levels.sewerlevel.wall_deco_desc` or `levels.prisonlevel.wall_deco_desc` would need a
`tileDesc` case in SewerLevel or PrisonLevel first.

Status: generated. The mini maps for sewers, Amt and Baustelle were inspected
(`scratchpad/tiles/plakat-*`). Not yet verified at runtime.
