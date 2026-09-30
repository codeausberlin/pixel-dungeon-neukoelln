# Pixel Dungeon Neukölln: Art Renditequartier (Ebene 16-20)

Stand 2026-09-29. Gegner, Boss und Sonderkacheln des Renditequartiers sind Reskins der
Upstream-Dateien (Shattered Pixel Dungeon v4.0.0, git `4256b22`). Erzeugt mit

    node tools/generate-kiez-renditequartier.cjs                    # alle Dateien
    node tools/generate-kiez-renditequartier.cjs --only king,golem  # einzelne
    node tools/generate-kiez-renditequartier.cjs --preview DIR      # Vorher/Nachher-PNGs

Nur Node und zlib (über `tools/lib/tileset-kit.cjs`). **Vertrag:** Das Skript liest immer das
Upstream-Original aus git, nie die eigene Ausgabe. Zwei Läufe liefern byte-identische Dateien
(geprüft per sha256). Größe, Frame-Raster, Frame-Reihenfolge und der Alphawert jedes Pixels
bleiben gleich, sonst bricht das Skript ab. Geändert wird nur RGB: Paletten- und
Helligkeits-Remaps sowie kleine Details innerhalb der Silhouette, pro Frame an Augen, Griff
oder Körper verankert. Keine `XxxSprite.java` muss angepasst werden, Standlinie und
Blickrichtung sind unverändert.

## Gegner und Boss

| Datei (Frame) | Upstream | Figur (`actors_de`) | Umsetzung |
| --- | --- | --- | --- |
| ghoul.png (12x14) | Ghoul 0-13 | Kleinanleger-Wiedergänger | Blassgrüner Untoten-Kopf (Kiefer bleibt), navy Steppweste über hellblauem Hemd, Khaki-Chino, braune Slipper |
| king.png (16x16) | Dwarf King 0-15 | König der Eigentumswohnungen (Boss) | Goldkrone und weißer Bart bleiben, damit er als König lesbar ist. Navy Sakkoärmel mit weißer Manschette, Navy-Anzughose mit Nadelstreif. Das Schwert ist ein übergroßer Messing-Generalschlüssel mit gekerbtem Bart. Todesframes 12-15 behalten das Verblassen zu Stein (Farbdifferenz übertragen) |
| warlock.png (12x15) | Warlock 0-10 | Abschreibungshexer | Gehörnte Kapuze als grüner Buchhalter-Augenschirm (Schirmkante über den Augen), Navy-Nadelstreifensakko, anthrazitfarbene Anzughose, brauner Bart bleibt |
| monk.png (15x14) | Monk 0-16 | Concierge-Mönch | Hautfarbenes Gesicht unter schwarzem Haar, Bordeaux-Livree mit Messingknöpfen, weiße Handschuhe (die erhobenen Fäuste), schwarze Uniformhose mit Bordeaux-Streifen, schwarze Schuhe; der schwarze Kragen liest sich als Fliege |
| | Senior 17-33 | Ober-Concierge | Gleicher Schnitt, Navy-Livree, graues Haar, Messingknöpfe |
| golem.png (17x19) | Golem 0-13 | Umzugsgolem | Laufender Stapel Umzugskartons: Kraftpappe mit hellen Flächen, dunkle Grifflöcher, der Runen-Rücken wird Packband (Runen glühen weiter), Kartonnaht am oberen Karton |
| elemental.png (12x14) | Fire 0-13 | Heizkosten-Feuerelementar | Farben bleiben (Elementlesbarkeit), unten links ein weißer Nachzahlungszettel mit roter Summenzeile |
| | Newborn 14-27 | neugeborenes Heizkosten-Feuerelementar | unverändert (grüne Flamme der Quest) |
| | Frost 28-41 | Heizungsausfall-Frostelementar | Kalter grauer Heizkörper mit Rippen im Körper |
| | Shock 42-55 | Kurzschluss-Schockelementar | Zwei lose Adern (rot, blau) mit Kupferenden hängen heraus: Elektrik vom Schwager |
| | Chaos 56-69 | Nebenkosten-Chaoselementar | Körper aus liniertem Papier (creme, blaue Linien) mit rotem Stempel, Partikel creme |
| statue.png (12x15) | Statue 0-15, Rüstungsstufen 21/32/43/54/65 | (gepanzerte) Kunst-am-Bau-Statue | Warmer Stein wird kühler Sichtbeton wie die Quartierswände, rote Augen bleiben. Rüstungspixel (Farbe weicht vom Statuenframe ab) behalten Upstream-Farben, damit die Rüstungsstufe lesbar bleibt. Gilt auch für den blau getönten Wachschutz auf Abruf (GuardianTrap) |
| guardian.png (12x15) | Earth Guardian 0-15 | Bauschaum-Wächter | Ausgehärteter PU-Schaum: blassgelb mit hellen Poren und dunkleren Schnittkanten, Augen signalorange |
| undead.png (12x16) | Undead 0-16 | (kein Nutzer im Code) | Schädelkappe wird navy Schiebermütze, Bart grau; nur zur Konsistenz |

## Sonderkacheln

| Datei | Umsetzung |
| --- | --- |
| custom_tiles/carpet.png | Nur die Stadtzeilen (Zellen 48-88) werden geändert. Der rote Lobby-Teppich bleibt (Concierge-Lobby), die Goldstickerei wird Messing. Postamente (81, 87, 88) im Corten der Designerfeuerschale aus `tiles_city.png`, Eingangsrampe (82) Sichtbeton, Investorenstatuen wie in `tiles_city.png`. Zeilen 0-2 (andere Regionen, vom Spiel nicht genutzt) unverändert |
| custom_tiles/city_boss.png | Thronsaal: Sechseckboden wird polierter Graphit (die Abdunklung zu den Wänden bleibt, weil nur die Helligkeit übertragen wird), blauer Randstein, Thron und Postament werden Anthrazitplatten wie der Quartiersboden, Gold wird Messing, Arenator mit Säulen (Zellen 102/103/110/111/118/119/126/127) Sichtbeton. Roter Teppich, rote Beschwörungszeichen, Statuen und das bunte Postamentdisplay bleiben |
| custom_tiles/city_quest.png | Tresor der Eigentümergemeinschaft: brauner Tresorboden und das Gigantische Zeichen werden Graphitstein mit Messingnieten, Schutt um den Schacht Anthrazitplatten, Schachtring Messing. Roter Teppich, grünes Energiefeld und Goldhaufen (Beute) bleiben |

Palette (hex): Navy-Anzug `34426e` `4a5a8e`, Hose `3a4a78` `232b48`; Messing `9a7a30`
`d8b456` `f0d27a`; Bordeaux-Livree `4a1222` `6e1a30` `8a2238`; Ober-Concierge `222e54`
`2e3c6a`; Kraftpappe `8c6538` `c09260`, Packband `6e5230`; Bauschaum `c09a44` `dcbc62` `ecd488`;
Sichtbeton-Statue `9a9b9a` `b4b4b0` `cfcec8`; Graphit = Helligkeit des Originals mit kühlem Ton;
Anthrazitplatten `2f323a` `41454d` `484c55` (aus `generate-rendite-tiles.cjs`).

## Offen und ehrlich vermerkt

- Geprüft nur über Vorschau-PNGs (6-fach, alle Frames, vorher/nachher). Im Spiel (Licht,
  Nebel, Animation in Bewegung, GuardianTrap-Tönung, Thronsaal mit Beleuchtung) noch nicht getestet.
- Die Requisiten der Elementare sind sehr klein (2-4 px). In den weißglühenden Angriffsframes ist
  der Heizkostenzettel kaum sichtbar; das ist Absicht (Flammenfarben haben Vorrang).
- Todesframes: Knöpfe und Manschetten hängen an den Augen und fehlen in liegenden Frames. Die
  zusammengesunkenen Ober-Concierges sind fast ganz navy.
- Blutfarben und Zauber-/Partikelfarben in `GolemSprite`, `MonkSprite`, `ElementalSprite`,
  `WarlockSprite` (Java) sind Upstream. Für Kartons wäre z. B. braunes statt graues Blut stimmig;
  das entscheidet Gameplay.
- `undead.png` wird in v4.0.0 von keiner Klasse benutzt; der Reskin ist nur vorsorglich.
- `carpet.png` Zeilen 0-2 (grün/blau) bleiben upstream, da `Carpet` nur in der Stadt verwendet wird.
- Die Namen der Kacheln (Thron, Beschwörungspostament, Gigantisches Zeichen) stehen in
  `levels_de`; die Grafik widerspricht ihnen nicht, bildet Konferenzraum-Motive aber nur über
  Material ab (Graphit, Messing, Beton), nicht über neue Möbel.
