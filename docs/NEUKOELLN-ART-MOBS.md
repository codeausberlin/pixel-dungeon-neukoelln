# Neukölln Pixel Dungeon: Gegner-Art

## Gegner-Reskins

Stand 2026-09-29. Die Gegner der Ebenen 1-5 sind als Reskins der Upstream-Atlanten
(Shattered Pixel Dungeon v4.0.0) umgesetzt. Erzeugt werden sie mit
`node tools/generate-kiez-mobs.cjs`; der Schalter `--only rat,snake` schränkt auf einzelne
Atlanten ein, `--preview DIR` schreibt Vorher/Nachher-Vorschauen in sechsfacher Größe und die
Sammelvorschau `kiez-mobs-sammelvorschau-x6.png`. Das Skript nutzt nur Node und zlib.

**Vertrag:** Das Skript liest immer das unveränderte Original als git-Blob, nie die eigene
Ausgabe, und ist daher reproduzierbar (zwei Läufe erzeugen byte-identische Dateien).
Atlasgröße, Frame-Raster, Frame-Reihenfolge und der Alphawert jedes Pixels bleiben
unverändert. Bricht eine dieser Bedingungen, bricht das Skript mit Fehler ab; das wurde mit
absichtlich verändertem Alpha getestet. Geändert wird nur RGB, entweder über Paletten- oder
Helligkeits-Remaps oder über kleine Details innerhalb der Silhouette. Details werden pro Frame
an einem Anker ausgerichtet (Pfoten, Augen, Unterkante), damit sie jeder Animation folgen. Die
`XxxSprite.java`-Klassen bleiben unverändert: TextureFilm-Größen und Frame-Indizes stimmen weiter.

| Atlas (Frame) | Upstream-Gegner | Neukölln-Figur (Name wie in `actors_de`) | Umsetzung |
| --- | --- | --- | --- |
| rat.png (16x15) | Rat 0-14 | Pfandratte | Graubraunes Fell, rote Augen bleiben; grüne Pfandflasche mit gelbem Kronkorken zwischen den Vorderpfoten (Anker: Pfotenpaar) |
| | Albino 16-30 | Albino-Pfandratte | Weiß bleibt, Flasche aus hellem Türkisglas |
| | Fetid Rat 32-46 | verfaulende Pfandratte | Farben wie upstream, braune Flasche |
| snake.png (12x11) | Snake 0-13 | Kabelschlange | Grün-gelb geringeltes Schutzleiterkabel (Ringe folgen dem Körper über Silhouettendistanz), hellere Unterseite, Kopf als weißgrauer Stecker mit Auge, Zunge wird gelber Funke |
| gnoll.png (12x15) | Gnoll 0-10 | Besichtigungswicht | Gegeltes dunkles Haar (Ohren = Tolle), hautfarbenes Gesicht mit langer Nase, weißer Kragen und Hemd, marineblaue Weste, dunkle Hose, Klemmbrett vor der Brust |
| | Exile 21-31 | verstoßener Tiefbauer | Graues Gesicht, abgetragene braune Strickweste, rote Narbe bleibt |
| | Trickster 42-52 | Abstandswicht | Senfgelber Anzug, Klemmbrett, orangefarbener Pfeil bleibt |
| crab.png (16x16) | Crab 0-13 | Kanalpanzer | Rostpanzer, Unterseite als eisernes Gullygitter mit Schlitzen, zwei helle Nieten neben den Augen |
| | Hermit 16-29 | Tonnenpanzer | Rostkörper, Schale als dunkelbrauner Biotonnendeckel |
| | Great 32-45 | Großer Kanalpanzer | Dunkler Eisen-/Rostkörper, große Schere cremeweiß wie eine Kühlschranktür |
| swarm.png (16x16) | Swarm 0-14 | Biomüllschwarm | Fruchtfliegen: rote Augen bleiben, Körper braun mit Bananengelb, apfelgrünem Glanzpunkt und braunen Flecken, Flügel leicht kompostgrün getönt |
| slime.png (14x12) | Slime 0-7 | Abflussschleim (Optik: Feuchttuchzopf) | Schmutzig-weißer, halbtransparenter Klumpen mit diagonalen Falten (Vliesstruktur), dunkle Kontur |
| | Caustic 9-16 | ätzender Abflussschleim | Gleiche Struktur in Abflussreiniger-Violett |
| goo.png (20x14) | Goo 0-10 (Boss) | Mietschimmel | Bleibt eine große dunkle Masse mit schwarzer Kontur; Körper schwarzgrün mit Sporenpunkten, der Glanzfleck ist ein Tapetenfetzen (creme mit Rosastreifen, dunkler Reißrand) |
| ghost.png (14x15) | Ghost 0-7 (NPC) | Trauriger Altmieter | Weißes Gesicht mit Träne; unterhalb des Gesichts senfgelbe Strickjacke mit Knopfleiste, Schweif endet in karierten Filzpantoffeln; Transparenz wie upstream |
| mimic.png (16x16) | Mimic 0-12 | Zu-verschenken-Truhe | Pappkarton mit Paketband statt Eisenbeschlägen; vorne ein weißer Zettel mit zwei Filzstift-Strichgruppen (ZU / VERSCHENKEN, bewusst unlesbar) |
| | Golden 16-28 | goldene Zu-verschenken-Truhe | Nur der Zettel kommt dazu |
| | Crystal 32-44 | Kristall-Verschenkkiste | Nur der Zettel kommt dazu, halbtransparent wie die Frontplatte |
| | Ebony 48-60 | Ebenholz-Verschenkkiste | Nach dem Referenzfoto eines ausgesetzten Druckers: graues Kunststoffgehäuse, kleines Display mit grüner LED statt Schloss, weißes Blatt im Papierschacht; keine Marke |

Palette-Hinweise: Rost `3a1d12` `7e3f1f` `ad6230` `cf8c4a`; Gullyeisen `3f4145` `63666b`
`8b8e92`; Schutzleiter `2c7a30` `4fb152` / `b8961a` `ecc933`; Wichtweste `1f2536` `2f3a55`
`44527a`; Karton `7a5830` `a27a44` `c9a266`, Paketband `d9b872`; Schimmel `1a2619` `2f4a26`
`55803a`, Tapete `e8dcbc` `c48e88`.

Offen und ehrlich vermerkt:
- Die Vorschauen wurden im Skript gerendert und angesehen. Im Spiel selbst (Beleuchtung,
  Nebel, Animation in Bewegung) sind die Reskins noch nicht getestet.
- Todesframes: Details, die an Augen oder Pfoten hängen (Flasche, Klemmbrett, Stecker), fehlen
  in den Todesframes absichtlich. Die Gnoll-Todesframes sind weniger klar gegliedert als die
  übrigen Frames.
- Blutfarben in `CrabSprite`/`SwarmSprite`/`SlimeSprite` (Java) sind upstream geblieben. Wenn
  gewünscht, passt Gameplay sie an (etwa Rost statt Gelb für den Kanalpanzer).
- Nicht angefasst wurden Rattenkönig (Pfandkönig), Kanalpiranha und Gnoll-Varianten in anderen
  Atlanten.

## Herr Fuß (gas-alchemist.png, Runde 3)

Neu gezeichnet mit `node tools/generate-gas-alchemist.cjs` (`--preview DIR` schreibt
`gas-alchemist-x8.png`), deterministisch, harte Alpha, Sheet 256x64 mit elf 12x15-Frames im
Raster von `GnollSprite` (von `GasAlchemistSprite` geerbt), Blick nach rechts, Füße auf Zeile 14.

Kein Rollstuhl, kein Gasapparat, keine Flaschen, Schläuche oder Bollerwagen (Vorgabe des
Projektinhabers). Herr Fuß ist der eigenwillige Nachbar aus dem Erdgeschoss, der einfach
riecht: Glatze mit grauem Haarkranz, buschige Braue, grauer Schnurrbart, weißes Feinripp-
Unterhemd mit einem Senffleck, graue Jogginghose, weiße Tennissocken mit rotem Ring in offenen
braunen Sandalen. Gelbgrüne Geruchslinien steigen von ihm auf, vor allem von den Füßen.
Karikiert wird nur der Mief (Wortspiel mit dem Namen), nicht Armut: saubere Hauskleidung,
zufriedene Miene.

| Frames | Animation | Umsetzung |
| --- | --- | --- |
| 0, 1 | idle | Stehen; in Frame 1 schließt er genießerisch das Auge, die Geruchslinien wandern |
| 2, 3 | attack 2,3,0 | Hebt den vorderen Fuß (Socke in Sandale), setzt ihn ab, Stinkwolke nach vorn |
| 4-7 | run | Gehzyklus mit Geruchsspur hinter sich |
| 8-10 | die | Die Knie geben nach, er setzt sich auf den Boden, der Geruch bleibt |

Offen: Beschreibungen in `docs/NEUKOELLN-WELT.md` und `docs/NEUKOELLN-WRITERSROOM.md` sprechen noch
von Rollstuhl und Apparatur (Lore-Agent). Im Spiel nicht getestet, nur Vorschau-PNGs.
