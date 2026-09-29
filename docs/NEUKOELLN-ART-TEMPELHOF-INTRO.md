# Art: Tempelhofer Feld (Ebene 10) und Intro-Bilder

Stand Runde 3. Beide Dateisätze entstehen deterministisch aus Node-Generatoren (zwei Läufe
liefern byte-identische PNGs). Im Spiel noch nicht gesehen: Prüfung nur über Vorschau-PNGs.

## tiles_tempelhof.png (PrisonBossLevel)

- Datei: `core/src/main/assets/environment/tiles_tempelhof.png`, 256x256 RGBA, gleiches Raster,
  gleiche Zellbelegung und identischer Alphakanal wie `tiles_prison.png` (DungeonTileSheet.java).
- Generator: `node tools/generate-kiez-tempelhof.cjs [--preview DIR] [--out datei.png]`.
  Er startet `tools/generate-amt-tiles.cjs --out <tempdatei>` (unverändert, schreibt dabei weder
  `tiles_prison.png` noch `terrain_features.png`) und nimmt dessen Atlas als Basis. Klassifiziert
  wird gegen das Upstream-Original (git blob 9235675…), wie bei allen Regionsskripten.
- Motiv:
  - Boden: Rollfeld-Asphalt (kühles Mittelgrau, nahtlos), ALT_1 mit dezenter Bitumen-Naht,
    ALT_2 (selten) mit weißem Pistenstrich und gelbem Rollweg-Stummel.
  - EMPTY_DECO: Gras und Löwenzahn im Riss. EMPTY_DECO_ALT: Brandfleck vom Einweggrill,
    Kohlekrümel, Glutpunkte, Kronkorken.
  - EMPTY_SP: Wiese mit Gänseblümchen (auch in Statue-SP-, Chasm-SP- und Eingang-SP-Zellen).
  - Wandköpfe: heller, warmer Kalkstein. Klar getrennt vom dunklen Asphalt, damit die Arena lesbar bleibt.
  - Wandfront A (RAISED_WALL): Kalkstein-Quader des Flughafengebäudes mit Gesims und Sockel;
    an Wandenden ein hohes Fenster.
  - Wandfront B (RAISED_WALL_ALT): Maschendrahtzaun mit Pfosten, dahinter Himmel, Wiese, Hecke,
    unten Kalksteinbordstein. An Wandenden: Windsack (+1), Kite-Surfer-Drachen (+2),
    Urban-Gardening-Kiste mit Tomate (+3).
  - WALL_DECO (behält den Fackel-Emitter, Flamme bei Zellmitte +2px): Kugelgrill auf dem
    Grillplatz, auf Kalkstein mit grünem Piktogrammschild (ohne Text), auf Zaun ohne Schild.
  - Pfützen-Ränder: nasser, dunkler Asphalt. Das Wasser selbst ist weiter `water1.png` (Amt).
- Bewusst unverändert (Amt-Versionen): Türen (Alu/Milchglas, Metalltür), Aktenregale,
  Stuhlreihe (Barrikade), Wartekabinen (REGION_DECO), Statue, Treppen, hohes Gras,
  A100-Abbruchkanten im Abgrund. Grund: Seit v4 kommen die erhöhten Props aus
  `terrain_features.png` Zeile 1 (Tiefe 6-10); deren Überhang-Zellen stehen im Atlas und müssen dazu passen.
  Die Wartekabinen im Labyrinth stehen damit im Flughafengebäude (Amt-Nutzung), das passt zur Welt.
- Offen/Abhängigkeiten: eigenes Pfützenwasser (`water*.png` gehört niemandem aus dieser Runde),
  eigene Prop-Zeile in `terrain_features.png` bräuchte Java (Stage-Logik in TerrainFeaturesTilemap).
  `levels_de.properties` beschreibt Deko noch als Amt (Lore-Agent).

## Intro-Bilder (splashes/intro/intro_1..4.png)

- Generator: `node tools/generate-kiez-intro.cjs [1 2 3 4] [--preview DIR]`. Nutzt `Layer` und
  die 3x5-Schrift aus `tools/generate-neukoelln-splashes.cjs` (nur `require`, dort nichts geändert).
- Format wie die Regions-Splashes: Zeichenfläche 160x90, 5x Nearest-Neighbour auf 800x450 RGB
  (so hatte auch der Java-Platzhalter die Dateien angelegt). Bei Bedarf skaliert die Szene selbst.
- Die Heldenfigur ist in allen vier Bildern gleich (türkise Regenjacke, rote Mütze, gelber
  Rucksack), damit die Sequenz als Geschichte lesbar ist.
  1. Bushaltestelle im Regen, Anzeige "M41" / "FÄLLT AUS", drei Wartende (Schirm unterm Dach,
     Kapuze, Handy), Held draußen im Regen mit "?!". Generisches rundes "H"-Schild.
  2. Der nächste Bus fährt ab: gelber Gelenkbus ohne Logo, Seitenanzeige "M41", rote Rücklichter
     mit Spiegelung auf nasser Straße, Abgaswolke, Speedlines, Held rennt mit "HALT!".
  3. Altbau-Hausflur (Ölsockel, Briefkästen, Holztür), Emailleschild "KELLER", offene
     Kellertür, Kellertreppe, Hundehaufen mit Stinkelinien und Fliege auf der ersten Stufe,
     unten Fahrradständer mit zwei Rädern unter Glühbirne. Held schaut aufs Handy, nicht auf die Stufe.
  4. Dunkler Keller: Brandschutztür (Plakette "T30", Türschließer) fällt zu, Comic-Stern "RUMS!",
     Staub, Held dreht sich um, Handylampe leuchtet Lattenverschläge an, rote Augen im Dunkeln,
     braune Schuhabdrücke von der Tür her.
- Keine echten Firmenlogos; "M41" nur als Liniennummer. Texte im Bild bleiben kurz, weil sie
  nicht lokalisiert werden.

## Vorschau

`scratchpad/art2/tempelhof/`
(`tiles_tempelhof-atlas-3x.png`, `tiles_tempelhof-minimap-3x.png` mit Beispielarena) und
`…/scratchpad/art2/intro/intro_N-x5.png`.
