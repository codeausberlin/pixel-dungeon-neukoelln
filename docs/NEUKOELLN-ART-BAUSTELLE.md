# Pixel Dungeon Neukölln: Art der Baustelle (Ebene 11-15)

Stand 2026-09-29. Erzeugt mit `node tools/generate-kiez-baustelle-mobs.cjs`
(`--only bat,dm300` schränkt ein, `--preview DIR` schreibt Vorher/Nachher-Vorschauen in
sechsfacher Größe). Das Skript liest immer die Upstream-Originale aus Commit `4256b22`
(`git show`), nie die eigene Ausgabe; zwei Läufe liefern byte-identische Dateien (geprüft).

**Vertrag (im Skript geprüft):** Bildgröße, Frame-Raster und Frame-Reihenfolge bleiben wie
upstream, die `XxxSprite.java`-Klassen brauchen keine Änderung. Alpha bleibt identisch, außer
bei `bat`, `shaman`, `gnoll_sapper`, `gnoll_geomancer` (Helmkuppel ergänzt, siehe unten); dort
prüft das Skript, dass Pixel nur innerhalb bereits benutzter Frame-Zellen dazukommen. Füße,
Standlinie und Blickrichtung bleiben unverändert. Details hängen pro Frame an einem Anker
(Augen), damit sie jeder Animation folgen.

## Gegner

| Datei (Frame) | Figur (`actors_de`) | Umsetzung |
| --- | --- | --- |
| bat.png (15x15) | Schachtvampir | Schwarze Fledermaus, rote Augen bleiben; kleiner gelber Bauhelm mit weißer Stirnlampe (Anker: Augenpaar). Die Todesframes haben keine Augen und darum keinen Helm, er ist abgefallen. Flügelhaut etwas staubiger. |
| brute.png (12x16) | Bautrupp-Grobian | Upstream-Topfhelm wird gelber Bauhelm (sitzt weiter schief, "nie richtig"), orange Warnjacke mit Reflexstreifen, Hautgesicht wie beim Besichtigungswicht, blaue Arbeitshose |
| | gepanzerter Grobian (21-31) | Weißer Polierhelm, Stahlplatten bleiben Stahl ("halb Stahlträger"), rotes Tuch wird Signalorange |
| shaman.png (12x15) | Bautrupp-Gutachter | Die farbigen Masken bleiben (Rot/Blau/Lila unterscheiden die Zauber, Grau = Tresor-Variante) und lesen sich als Schutzvisier; weißer Helm, Olivparka, Klemmbrett vor der Brust, dunkle Hose |
| spinner.png (16x16) | Flatterbandspinne | Grünlicher Körper bleibt (Text: "grünlich, behaart"), leicht betonstaubig; alle Beine rot-weißes Absperrband |
| dm200.png (21x18) | DM-200 Bauaggregat | Baumaschinengelb, Bohr-/Faustteil Stahl, Warnstreifen schwarz-gelb über den Ketten, Augenlampen auf dunklem Visierstreifen |
| | DM-201 Wachaggregat (24-35) | Wie DM-200, aber Signalorange, damit die beiden unterscheidbar bleiben; türkise Augen bleiben |
| dm300.png (25x22) | DM-300 Bohrlinde (Boss) | Tunnelbohrmaschine in Baumaschinengelb mit Stahlbohrer, Warnstreifen, dunkler Visierstreifen; aufgeladene Variante (10-15) behält die roten Augen |
| pylon.png (10x20) | Baustromverteiler | Oranges Verteilergehäuse mit dunklen Steckdosenklappen, verzinkter Pfosten mit gelbem Warnschild (inaktiv), aktive Variante behält den leuchtend gelben Kern; Betonfuß mit Warnstreifen |
| gnoll_guard.png (12x16) | Bautrupp-Wachmann | Ohne Helm (Text), dunkles Haar, schwarzblaue Security-Jacke; Rundschild wird rot-weiße Absperrtafel; Speer und rote Gesichtsmarkierung wie upstream |
| gnoll_sapper.png (12x15) | Bautrupp-Sprengmeister | Blauer Helm, gelbe Warnweste mit Reflexstreifen, graue Hose |
| gnoll_geomancer.png (12x16) | Tiefbau-Geomant | Chef des Trupps: goldener Spatenstich-Helm, dunkler Anzug, goldene Maske bleibt; die Statuen-Variante (21-31) ist Beton statt Stein |
| fungal_core.png (27x27) | Hausschwamm-Kern | Rostbrauner Fruchtkörper mit weißer Myzelkruste und weißen Flecken, grau-brauner Stiel |
| fungal_sentry.png (18x18) | Hausschwamm-Wache | Gleiche Palette |
| fungal_spinner.png (16x16) | Hausschwamm-Spinne | Flatterband-Beine wie die Flatterbandspinne, Körper von rostbraunem Hausschwamm überwuchert, einzelne weiße Myzelflecken |

## Kacheln

| Datei | Umsetzung |
| --- | --- |
| environment/tiles_caves_gnoll.png | Der gemeinsame Teil entsteht mit dem Baustellen-Tileset-Skript selbst (`tools/generate-baustelle-tiles.cjs --source <Gnoll-Original> --out <temp>`), damit beide Atlanten immer gleich aussehen; `terrain_features.png` wird dabei nicht geschrieben. Nur-Gnoll-Zellen (Schutt auf dem Boden 5/11, abbaubare Brocken 76-79, 132-143, Überhänge 240-255) werden Betonbruch mit rostigen Bewehrungsenden auf dem neuen Spritzbetonboden. |
| environment/custom_tiles/caves_boss.png | Der rote Teppich bleibt: der Teppich von Bohrlindes Taufe, er führt ins Renditequartier. Die zwei roten Wandbanner werden Investoren-Renderings (Himmel, weißer Turm, Bäume). Der Arenazaun bekommt rot-weißes Flatterband auf dem Handlauf und am Torblech ein rundes Verbotsschild. |
| environment/custom_tiles/caves_quest.png | Stahlwände des Schmiede-Quests werden blauer Baucontainer (Rost, Leiter und Esse bleiben), Loren bekommen einen gelben Rand. |

Palette: Baumaschinengelb `8a6414` `b5851a` `d9a324` `eebc38` `f8d765`; Signalorange
`b24a12` `e0661a` `f5832a`; Warnstreifen `e6b422`/`221e18`; Absperrband `d23a2e`/`f0ece4`;
Reflex `d8dde0`; Hausschwamm `7e3a16` `b0602a` `e6dcc6`; Container `31405a` `43587a`.

## Offen

- `crystal_guardian.png` und `crystal_wisp.png` sind bewusst unverändert. Ihre Farben tragen
  Spielinformation (Blau/Grün/Rot passen zu `blood()` und zum Lichtstrahl in
  `CrystalWispSprite`), und die Beschreibungen ("Deko aus einem Loft-Showroom",
  "leuchtet wie ein Späti um vier Uhr") passen schon zum Kristall-Look. Möglich wäre später ein
  kleines Preisschild an den Wächtern.
- Im Spiel nicht getestet (kein Build, kein Start; Absprache Art-Runde 2). Geprüft wurden nur
  die Vorschau-PNGs. Beleuchtung, Nebel und Animation in Bewegung stehen noch aus.
- Todesframes der Bauwichte: Die Zonen hängen an den Augen. In den liegenden Todesframes sind
  Jacke und Helm weniger sauber getrennt, die Figuren lesen sich dort vor allem über die Farbe.
- `dm200.png` Zeile 1 (Frames 12-23) wird vom Code nicht benutzt und ist nur mitgefärbt.
- Blutfarben (`DM200Sprite`, `DM300Sprite`, `PylonSprite`: `0xFFFFFF88`) sind upstream
  geblieben. Wenn gewünscht, passt das Gameplay sie an, etwa Hydrauliköl statt Weißlicht.
- `tiles_caves_gnoll.png` hängt vom Stand von `tools/generate-baustelle-tiles.cjs` ab. Nach
  Änderungen an diesem Skript muss auch dieser Generator neu laufen.
