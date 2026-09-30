# Art: Kiez-Ladenfronten und A100-Abgründe (Tiles, Runde 3)

Stand 2026-09-29. Umsetzung von Runde-3-Punkt 8 (Sonnenallee-Kiezgefühl) und Punkt 15
(Abgründe = nie fertig gebaute A100-Abschnitte). Nur Grafik: keine neuen Zellindizes,
kein Java, keine Texte. Nicht im laufenden Spiel geprüft (nur Vorschau-PNGs).

## Sonnenallee-Ladenfronten, Ebene 1-5 (`tiles_sewers.png`)

Erzeugt von `node tools/generate-hinterhof-tiles.cjs` (Abschnitt "4b. Sonnenallee shopfronts").
Läden, keine Menschen, keine lesbaren Namen. Die Neonschrift ist eine abstrakte Welle.

| Zelle (DungeonTileSheet) | Wann sichtbar | Motiv |
|---|---|---|
| RAISED_WALL_DECO +0..+3 (84-87) | Wand-Deko über Wasser (SewerPainter), 50 % davon | Barbershop: rot-weiß-blaue Drehsäule links, Schaufenster mit Spiegel und rotem Friseurstuhl; die Fensterbank bleibt Tropfpunkt des `Sink`-Emitters |
| FLAT_WALL_DECO (49) | dieselbe Wand in der flachen Ansicht | Barbershop, gleiche Zeichnung |
| RAISED_WALL +1 (81) | Wandende mit Tür/Öffnung rechts (nicht-ALT, 50 %) | Shisha-Bar: dunkles Schild mit pinker Neonwelle und türkisem Pfeifen-Piktogramm, zwei Wasserpfeifen (türkis, violett) mit glühender Kohle im Fenster, weißer Plastikstuhl davor |
| RAISED_WALL +2 (82) | Wandende mit Tür/Öffnung links | Konditorei: grün-cremefarbene Markise, beleuchtetes Schaufenster mit zwei Baklava-Tabletts (Rautenmuster, Pistazie) auf Silberplatten |
| RAISED_WALL +3 (83) | einzelner Pfeiler | einzelne Barbershop-Drehsäule |

Unverändert und weiter sichtbar: RAISED_WALL_ALT +1 "MÄRZ"-Plakat, +2 "MIE-/TE?!"-Graffiti
(seit Runde 4, ersetzt "RAUS"), +3 "BÄRG"-Flyerwand, ALT +0 Putzabplatzer, WALL_DECO_ALT Fallrohr. Weggefallen: das
vergitterte Kellerfenster (war WALL_DECO). Wandenden neben Türen in Oberwänden sind häufig,
darum tauchen die Läden auf fast jeder Ebene auf. In der flachen Ansicht gibt es keine
Wandend-Varianten, dort erscheint nur der Barbershop.

Seit Runde 4 haben Läden, Barbershop und Fallrohr eigene Untersuchen-Texte
(`levels.walldeco.*`, siehe unten). Die Props (Papierkorb, Tonne) sind unverändert, damit
`region_deco_desc` weiter passt.

## A100-Abgründe, alle fünf Regionen

Gemeinsame Zeichnung in `tools/lib/tileset-kit.cjs` (`a100Chasm`), aufgerufen von
`generate-hinterhof-tiles.cjs`, `generate-amt-tiles.cjs` (`tiles_prison.png`),
`generate-baustelle-tiles.cjs`, `generate-rendite-tiles.cjs`, `generate-rathaus-tiles.cjs`.

| Zelle | Motiv |
|---|---|
| CHASM_FLOOR (25) | abgebrochene Fahrbahn: dunkler Asphalt mit weißem Leitlinien-Strich (kachelt zur gestrichelten Linie), helle Betonkante, Fahrbahnplatte, darunter hängender rostiger Bewehrungsstahl |
| CHASM_FLOOR_SP (26) | Asphaltkante mit abgerissener Leitplanke, die schräg in die Tiefe hängt, samt Pfosten |
| CHASM_WALL (27) | obere Hälfte bleibt die Regionswand, darunter Betonkante mit Bewehrungsstummeln |
| CHASM (24), CHASM_WATER (28) | unverändert: Tiefe schwarz, Wasserfall der Region |

Die Zeilen 8-15 bleiben (fast) schwarz, damit das Loch als Loch lesbar bleibt. Alpha ist
unverändert (Generatoren prüfen das). `tiles_tempelhof.png` wird nicht von diesen
Generatoren geschrieben.

## Wand-Deko Runde 4: weniger März, mehr Graffiti, Wohnungsgesuche

Stand 2026-09-29, nach Spieltest-Feedback: März-Plakate zu häufig, mehr Graffiti,
2-3 Wohnungsgesuche (Abreißzettel). Motive gemeinsam in `tools/lib/tileset-kit.cjs`
(`MOTIFS`, `wallMotif`), aufgerufen von den fünf Region-Generatoren.

**Neue Zellen RAISED_WALL_NOTICE +0..+3 (104-107).** Im Upstream-Atlas steht dort
ungenutzte, voll deckende Wandgrafik, die kein Java-Code referenziert. Die Generatoren
kopieren das RGB der fertigen RAISED_WALL +0..+3 hinein (`A.addNoticeCells()` bzw.
`cloneNoticeCells`; Alpha muss identisch sein, sonst Abbruch) und zeichnen das Motiv darauf.
`DungeonTileSheet.updateAltVariants` wählt die Zellen für 5 % der glatten Wandfronten
(`tileVariance < 5`, sonst wie bisher 50 % ALT), aber nur, wenn `WallDeco.enabled(level)`:
normale Ebenen der fünf Regionen (RegularLevel, ohne Kabelschacht und Club). Bossarenen,
Tempelhof (`tiles_tempelhof.png`, nicht von diesen Generatoren geschrieben) und die
Zweige bleiben bei den alten Varianten.

| Region | Zelle | Motiv (Text-Key `levels.walldeco.*`) |
|---|---|---|
| Hinterhof | ALT +1 | "MÄRZ"-Plakat, unverändert (`maerz_1`) |
| Hinterhof | ALT +2 | pinkes "MIE-/TE?!" über Putz und Klinker, ersetzt rotes durchgestrichenes M + "RAUS" (`graffiti_miete`) |
| Hinterhof | NOTICE | Abreißzettel mit Hundefoto "Keks", zwei Streifen abgerissen (`gesuch_1`) |
| Amt | ALT +2 | "MÄRZ"-Plakat, unverändert (`maerz_2`) |
| Amt | DECO_ALT | rotes Herz-Sticker neben der Wartenummer-Anzeige, ersetzt das durchgestrichene M (`graffiti_herz`) |
| Amt | NOTICE | Abreißzettel mit rotem Herz, ein Streifen fehlt (`gesuch_2`) |
| Baustelle | ALT +2 | Schablonen-Turmkran, rot durchgestrichen, neben dem Kantenschutz (`graffiti_kran`) |
| Baustelle | NOTICE | getippter Zettel mit blauem Bürgschaftsstempel, alle Streifen noch da (`gesuch_3`) |
| Renditequartier | ALT +3 | Maklerschild "zu vermieten" (unlesbar), schwarzes X darüber (`graffiti_vermieten`) |
| Renditequartier | NOTICE | pinkes "KIEZ"-Tag mit Schlagschatten auf der Glasfassade (`graffiti_kiez`) |
| Rathaus | ALT +3 | weißes "WEG / DA" auf dem Klinker (`graffiti_wegda`) |
| Rathaus | NOTICE | hellgraue Schablonen-Taube (`graffiti_taube`) |

Untersuchen-Texte: `levels/WallDeco.java` liest für eine Wandzelle dieselbe Variante,
die `DungeonTerrainTilemap` zeichnet (`DungeonTileSheet.getRaisedWallTile` mit der
Varianz der Ebene), und liefert Titel und Text des Motivs (`Level.cellName/cellDesc`,
aufgerufen von `WndInfoCell`). Ohne Motiv bleibt es beim bisherigen Regionstext
(z. B. Kupferkabel in der Baustelle). Weitere Motive mit Text: Shisha-Bar, Konditorei,
Barbershop, Fallrohr, BÄRG-Flyer/-Plakat, Amtslampe, Feuerlöscher, Notausgang,
Abluftgitter, Kamera, Messingschild, Paternoster. `KiezSmokeTest.checkWallDeco` prüft
Zuordnung, Grafik (Motivzelle ≠ glatte Wand), Texte de/en und die 5-%-Auswahl.

Häufigkeit (30 Seeds x 4 Ebenen je Region, echte Levelgenerierung, Wandfronten mit
Motiv = Deko-Stelle): März vorher Hinterhof 31 % (1 von 3), Amt 43 % (1 von 2,3);
nachher Hinterhof 13 % (1 von 8), Amt 17 % (1 von 6), übrige Regionen 0. Zettel/Tags
auf NOTICE: 3-6 pro Ebene.

Offen: nicht im laufenden Spiel angesehen (nur Vorschau-PNGs und Smoke-Test). Die
Tabelle "Wandplakate und Graffiti" in `NEUKOELLN-DESIGN.md` nennt noch "RAUS" und das
durchgestrichene M. In der flachen Ansicht (Info-Fenster-Icon) erscheinen die neuen
Motive nicht. Bossarenen zeigen die ALT-Plakate weiter ohne eigenen Text.

## BÄRG-Plakat seltener (QA M11, 2026-09-30)

Auf der Baustelle ist RAISED_WALL_ALT +0 das BÄRG-Plakat und stand auf ~45 % der glatten Wandmitten.
`DungeonTileSheet.getRaisedWallTile` setzt dort jetzt nur noch bei `tileVariance` 5-14
(`WallDeco.PLAIN_ALT_CHANCE_BAUSTELLE`) das Plakat, sonst die glatte Wand, und nie, wenn der linke
Nachbar schon in diesem Bereich liegt. Wandenden (+1..+3) und andere Regionen unverändert.
Das Untersuchen-Fenster zeigt seit derselben Runde die Wandfront mit Motiv statt der flachen Wand.
