# Pixel Dungeon Neukölln: Art Unterwelt des Mietspiegels (Ebene 21-25) und Sonderkacheln

Stand 2026-09-29. Erzeugt mit `node tools/generate-kiez-unterwelt.cjs`. Der Schalter
`--only eye,yog` schränkt auf einzelne Sheets ein, `--preview DIR` schreibt je Sheet eine
Vorher/Nachher-Vorschau mit allen Frames (`<sheet>-vorher-nachher.png`). Das Skript braucht nur
Node und zlib (PNG-Codec aus `tools/lib/tileset-kit.cjs`).

**Vertrag:** Quelle ist immer das unveränderte Upstream-PNG aus Commit `4256b22`, nie die eigene
Ausgabe. Zwei Läufe erzeugen byte-identische Dateien (geprüft). Sheetgröße, Frame-Raster und
Frame-Reihenfolge bleiben gleich, die `XxxSprite.java`- und `CustomTilemap`-Indizes stimmen also
ohne Codeänderung. Alpha bleibt pixelgenau gleich, außer in Frames, die das Skript ausdrücklich
für Silhouettenänderungen freigibt (Mützenschirm beim Entmietungsdämon, Lampenschirm beim
Vormieterspuk). Jede andere Alphaänderung bricht den Lauf ab. Details hängen pro Frame an einem
Anker (Haaransatz, Kopfoberkante, Bounding Box), damit sie jeder Animation folgen.

## Gegner (sprites/)

| Datei (Frame) | Figur (`actors_de`) | Umsetzung |
| --- | --- | --- |
| succubus.png (12x15) | Stadtmarketing-Sukkubus | „Blasse, schwarz gekleidete Kampagnen-Muse“: schwarzer Bob unter pinker Baskenmütze, schwarzer Rollkragen und Hose statt des gestreiften Outfits, pinker Kampagnenschal; rote Lippen bleiben. Nicht sexualisiert. |
| eye.png (16x18) | Auge des Ordnungsamts | Marineblaue Uniformkugel, dunkles Mützenband mit Goldabzeichen, die Zahnreihe wird ein gelb-silberner Reflexstreifen. Rote Iris, weiße Antennenspitzen und das Aufladeleuchten (Frames 3/4, Todesblick) bleiben lesbar. |
| scorpio.png (17x17) | Mahnbescheid-Skorpion 0-10 / ätzender 15-25 | „Gelber Brief“: Körper in Umschlaggelb, Stachelkugel als rotes Siegel, weißes Adressfenster auf dem Rücken. Die ätzende „Neufassung“ ist auf säuregrünem Papier gedruckt. Grüne Todesspritzer bleiben. |
| ripper.png (15x14) | Entmietungsdämon | Bleibt ein ausgemergelter roter Dämon mit Knochenkrallen (wie im Text), trägt aber eine Tweed-Schiebermütze mit Schirm (1 px Silhouette, nach rechts) und dunkle Arbeitshosen. In den Todesframes fällt die Mütze weg. |
| larva.png (12x8) | Mieterhöhungslarve | Wurm aus liniertem Papier (blaue Linie), roter Kopf wie ein Rotstift-Stempel „+15 %“ (ohne Schrift). |
| yog.png (20x19) | Ewiger Mietspiegel | Das Auge ist eine Tabelle: hellblaues Raster über der Lederhaut, gelbliche Kopfzeile. Iris, Blickrichtungen und rote Ranken bleiben. |
| yog_fists.png (24x17, Zeile = Faust) | Heizkosten- / Fassadenbegrünungs- / Instandhaltungsstau- / Ratenzahlungs- / Hochglanzprospekt- / Nebenkostenfaust | Feuer bleibt, weißer Rippenheizkörper auf dem Handrücken · grauer Beton mit Plattenfugen und Efeu · feuchter Putz mit Schimmelpunkten und grauem Klebeband · dunkler Stahl mit Rost und Münzschlitz samt Goldmünze · bleibt glänzend weiß, mit Mini-Exposéfoto und Magenta-Ecke · bleibt dunkel, mit grauem Fensterumschlag und rotem Stempel. Embleme nur in Idle/Zap-Frames (c+0, c+1, c+5, c+6), nicht in den Todesframes. |
| spawner.png (16x16) | Kündigungsschleuder | Rote Masse etwas dunkler, in der Mitte ein Druckerschlitz, aus dem ein Blatt mit Zeilen und rotem Stempel kommt; drei Kündigungsblätter kreisen einmal pro 16-Frame-Schleife. |
| wraith.png (14x15) | Vormieterspuk 0-7, gequälter Vormieter 9-16 | Staubiger Fransen-Lampenschirm aus dem Sperrmüll auf dem Kopf (Silhouette wächst nach oben), Fransen über der Stirn; in den Todesframes verblasst der Schirm mit dem Geist. Beide Zeilen, weil `TormentedSpiritSprite` dasselbe Sheet nutzt. |

## Sonderkacheln (environment/custom_tiles/)

| Datei | Verwendung | Umsetzung |
| --- | --- | --- |
| halls_special.png | `HallsBossLevel` (Tempel des Mietspiegels), `LastLevel`, `DemonSpawnerRoom` | Säulen und Zinnen im Sandstein von `tiles_halls.png`; die Bleiglasfenster werden Glasschränke voller Aktenordner (Regalbretter alle 4 px, farbige Rücken); die Ritualkerzen werden rote Grablichter, Wachslachen werden Ruß. Blutkreis der Kündigungsschleuder und Bodenplatten bleiben. |
| weak_floor.png | `WeakFloorRoom` (Ferner Brunnen), Zelle = Tiefe/5 | Rand je Region mit der Rand-Rampe des jeweiligen Regionsgenerators: Hinterhof, Amt, Baustelle, Renditequartier, Unterwelt. |
| sewer_boss.png | `GooBossRoom` (Nest 0-8), `SewerBossExitRoom` (16-24) | Mietschimmel-Arena: der dunkle Fleck unter dem Boss wird ein schwarzgrüner Schimmelteppich mit Sporenpunkten (weltbündiger Hash, Zellen kacheln nahtlos). Ausgang: Steinrahmen und Wand mit Kellerfenstern in der Hinterhof-Randfarbe, Gitter und Rostflecken bleiben. |
| rat_king_room.png | `RatKingRoom` | Statuen bleiben grauer Stein; die Krone wird eine Kronkorkenkrone (gold/rot), der Sockel bekommt eine kleine blau-weiße Denkmalschutzplakette (ohne Schrift), das lila Königskissen ein weißes Etikett („zu verschenken, nur an Adel“ laut Text). |

Die Rand-Rampen (`RIM` im Skript) sind aus `generate-hinterhof-tiles.cjs`,
`generate-amt-tiles.cjs`, `generate-baustelle-tiles.cjs`, `generate-rendite-tiles.cjs` und
`generate-rathaus-tiles.cjs` kopiert. Ändert ein Regionsagent seine Rampe, muss sie hier
nachgezogen werden.

## Offen und ehrlich vermerkt

- Nur in Vorschauen geprüft (Frames einzeln, 5-7-fach). Im Spiel (Licht, Nebel, Animation in
  Bewegung, Arena-Zusammenbau aus Kacheln) ist nichts getestet.
- Blutfarben in Java bleiben upstream (z. B. `ScorpioSprite` grün, `FistSprite.Soiled` braun obwohl
  die Faust jetzt grauer Beton ist). Anpassen wäre Sache des Gameplay-Agents.
- Der Lampenschirm liegt in Frame 3 (Angriff) teils außerhalb der Upstream-Silhouette, aber im
  14x15-Frame; die Oberkante wird bei hochstehendem Kopf abgeschnitten.
- Die Kündigungsschleuder zeigt in den Hellphasen des Pulsierens (Frames mit transparenten
  Rändern) nicht immer alle drei Blätter, weil Blätter nur auf fast deckenden Pixeln erscheinen.
- `halls_special.png`: Die dunklen Schatten-/Treppenkacheln der Zeilen 0-1 und die großen
  Bodenplatten sind unverändert. Texte zu Glasschränken und Grablichtern (falls Kachelnamen
  gewünscht) fehlen; Lore-Agent entscheidet.
- `sewer_boss.png` Ausgang: der Rahmen ist nur leicht grauer als upstream, weil die
  Hinterhof-Randfarbe dem Original-Sandstein nahe liegt.
