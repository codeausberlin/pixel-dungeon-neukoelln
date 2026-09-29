# Neukölln Pixel Dungeon: NPC-Art

Stand 2026-09-29. NPCs, Begleiter und Beschwörungen werden mit
`node tools/generate-kiez-npcs.cjs` erzeugt (`--only shopkeeper,imp` schränkt ein, `--preview DIR`
schreibt je Sheet eine x8-Vorschau, oben upstream, unten neu). Das Skript nutzt nur Node und zlib
(über `tools/lib/tileset-kit.cjs`). Es liest immer die unveränderten Upstream-PNGs aus Commit
`4256b22` und nie die eigene Ausgabe. Zwei Läufe erzeugen byte-identische Dateien, das wurde per md5 geprüft.

**Vertrag:** Die Sheet-Größe und das Frame-Raster aus der jeweiligen `XxxSprite.java` bleiben gleich.
Füße, Standlinie und Blickrichtung entsprechen dem Original. Java wird nicht geändert.
Es gibt zwei Verfahren:
- *draw*: Der Frame wird aus einer Zeichenkarte neu gezeichnet (eigene Silhouette, harte Alpha,
  außer beim Geist).
- *paint*: Der Upstream-Frame wird umgefärbt, und Details werden an Ankern gestempelt.

| Datei (Frame) | Figur (`actors_de`) | Verfahren | Motiv |
| --- | --- | --- | --- |
| shopkeeper.png (14x14) | Spätimann | draw | Trockener Späti-Besitzer in den Fünfzigern: graue Schiebermütze, graue Koteletten und Schnurrbart, flaschengrüne Trainingsjacke mit zwei schlichten weißen Ärmelstreifen (keine Marke), Jeans, graue Hauspantoffeln. Frame 0 hebt die Hand mit dem Flaschenöffner |
| imp.png (12x14) | Ehrgeiziger Filialist | paint | Bleibt ein kleiner roter Dämon, trägt jetzt ein senfgelbes Franchise-Polo, ein türkises Lanyard mit weißem Badge und ein türkises Papierkäppi zwischen den Hörnern |
| blacksmith.png (13x16) | Techniker vom Netzbetreiber (Runde 3) | draw | Müder Blick mit Augenringen, Dreitagebart, strubbeliges braunes Haar, graublaue Arbeitsjacke mit schlichtem Silber-Reflexstreifen (keine Markenfarbe, keine Schrift), Kniepolster, gelbe Glasfaserrolle über der Schulter, grauer Werkzeugkoffer. Frame 0 hält er das Tablet mit dem Terminfenster hoch (grauer Titelbalken, leere Slots, ein roter abgesagter Slot). Frames 1-3 beugt er sich über das Spleißgerät auf dem Koffer; der Spleißbogen leuchtet genau am Emitterpunkt (7,12), so liest sich der Upstream-Funkenschlag als Spleißgerät. Der Funke selbst bleibt die orange `Speck.FORGE`-Farbe (Java, Gameplay-Agent) |
| wandmaker.png (12x14) | Ewiger Antragsteller | paint | Der Kopf bleibt. Brauner Cordsakko statt roter Robe, weißes Hemd mit dunkelroter Krawatte, graue Hose, dazu die vergilbte Wartenummer (unleserlich) in der vorderen Hand |
| ratking.png (16x16/17) | Pfandkönig | paint | Die normale Krone wird zur Kronkorkenkrone: drei Zacken als rote, silberne und grüne Kronkorken auf einem gekräuselten Silber-Gold-Rand. Ratmogrify-Krone, Partyhut und Glühweinmütze bleiben wie upstream |
| ghost.png (14x15) | Quest-Geist (Zusatzauftrag: Schwabe an Weihnachten) | draw, weiche Alpha | Sympathischer Mittdreißiger mit ordentlichem Seitenscheitel, rotem Strickpulli mit weißem Norwegerband und kleinem Rentier. Er hält eine Tupperdose mit Spätzle und läuft unten in den Geisterschweif aus. Halbtransparent, weil so einsam. Angriff: Er hält die Dose hin, dann blitzt sie auf. Tod: Er verblasst von unten |
| avatars.png (24x32) | Ranglisten-/Surface-Avatare | draw (Zellen 0-3) | Porträts passend zu den Heldenatlanten (Stufe 6): Alteingesessene (Dauerwelle, Brille, Ballonseide, Stockschirm), Expat (Senf-Beanie, violette Brille, Fleeceweste, Lanyard), Tourist (Sonnenhut, Sonnenbrand, Hawaiihemd, Kamera, Bauchtasche, Socken), Zugezogene (Aubergine-Mullet, Cordjacke mit Sherpakragen, Jutebeutel mit Herz). Zellen 4-5 (Duelist, Kleriker) bleiben upstream |
| ninja_log.png (11x12) | Pappaufsteller | draw | Pappaufsteller des Touristen mit Daumen hoch auf braunem Karton mit Aufstellfuß. Tod: kippt um (1-2) und liegt flach (3-4) |
| wards.png (Einzel-uvRects) | Wächter des Überwachungsmasts | draw (Stufen 1-3) | Kleine Überwachungskameras auf einem Mast mit violettem Objektiv, Stufe 3 mit zwei Kameras. Die Stufen 4-6 (Schildwachen, „ähnelt dem Stein an der Spitze“) bleiben violette Kristalle |
| spirit_hawk.png (15x15) | Geistertaube | paint | Die Silhouette bleibt. Taubenblaugrauer Körper, grün-violett schillernder Hals, orange Augen, rosa Taubenfüße |
| rot_heart.png (16x16) | Faulbeerherz („Zimmerpflanze, Kat. B“) | paint | Steht in einem Terrakotta-Bürotopf und trägt einen weißen Inventaraufkleber |
| rot_lasher.png (12x16) | Faulbeerranke | paint | Steht im Terrakotta-Bürotopf wie eine harmlose Büropflanze |
| piranha.png (12x16) | Kanalpiranha | paint (Zeile 0) | Trübes Kanal-Oliv mit rostigen Flossen; rote Kiemen, Auge und Zähne bleiben. Die Phantom-Zeile bleibt |
| sheep.png (16x15) | Schaf (Pilotphase Grünflächenamt) | paint | Gelbe Ohrmarken an beiden Ohren, sonst wie upstream |

Bewusst unverändert, weil das Motiv schon zum deutschen Text passt oder die Datei nicht genutzt wird:
`bee.png` (Dachgarten-Biene), `lotus.png` (Goldener Lotus), `vault_mirror.png` (Seltsamer Spiegel mit
Goldrahmen, „wie aus einem Penthouse-Bad“), `sentry.png` (rote Schildwache, Kristall) und `pet.png`.
`pet.png` wird im Java-Code nicht verwendet, denn `SurfaceScene.Pet` nutzt `RatSprite`.

## Offen und ehrlich vermerkt

- Geprüft wurde nur in den Vorschauen, nicht im Spiel. Beleuchtung, Nebel und laufende Animation
  sind ungetestet. Die Vorschau des Geists simuliert die additive Mischung (`Blending.setLightMode`).
- Geist: `actors.mobs.npcs.ghost.*` in `actors_de` beschreibt noch den „Traurigen Altmieter“
  (Kittelschürze, Pantoffeln). Die Texte muss der Lore-Agent auf den Schwaben umstellen.
  `ghost.png` wurde dafür aus `tools/generate-kiez-mobs.cjs` herausgenommen; die übrigen
  Mob-Atlanten erzeugt dieser Generator weiter byte-identisch. `docs/NEUKOELLN-ART-MOBS.md`
  nennt den Geist noch als Altmieter.
- Der Filialist ist klein, sein Polo hat nur 3 Zeilen. Das Lanyard ist erkennbar, das Badge ist 2 Pixel groß.
- Die Vorschau des Rattenkönigs rastert alle Zeilen mit 16 px Höhe. Die Feiertagszeilen (17 px)
  sehen darin verschoben aus, im Sheet sind sie unverändert.
- `imp.png` wird auch vom `ImpShopkeeper` (Filiale auf Ebene 21) verwendet. Dort gilt dasselbe Motiv.
