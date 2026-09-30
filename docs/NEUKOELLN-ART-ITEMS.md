# Neukölln Pixel Dungeon: Item-, Banner- und Desktop-Icon-Art

Stand 2026-09-29. Alle Grafiken sind originale Pixelarbeit, gezeichnet von drei Node-Skripten
(nur Node und zlib über `tools/lib/tileset-kit.cjs`, keine heruntergeladene Art, keine
Marken oder Logos). Jedes Skript ist deterministisch: zwei Läufe erzeugen byte-identische
Dateien (geprüft). Nicht im Spiel getestet: Die Grafiken sind erzeugt und als Vorschau
angesehen, ein Desktop-Lauf mit Inventar, Shop, Boss-Banner und Fenster-Icon steht noch aus.

| Skript | Schreibt | Vorschau (`--preview DIR`) |
| --- | --- | --- |
| `node tools/generate-kiez-items.cjs` | `core/src/main/assets/sprites/items.png` (+ über den Aufruf unten `sprites/amulet.png`) | `kiez-items-vorher-nachher-x6.png`, `kiez-items-atlas-x3.png` |
| `node tools/generate-kiez-banners.cjs` | `core/src/main/assets/interfaces/banners.png` | `kiez-banners-x4.png` |
| `node tools/generate-kiez-icons.cjs` | `desktop/src/main/assets/icons/*` (8 Dateien) | `kiez-icons-preview.png` |

## Reihenfolge mit `generate-mietvertrag.cjs`

`generate-mietvertrag.cjs` baut `items.png` aus dem Upstream-Atlas (git `e87a4a7`) plus der
Mietvertrag-Zelle `AMULET` neu auf. `generate-kiez-items.cjs` ruft dieses Skript deshalb
selbst als ersten Schritt auf, liest das Ergebnis und zeichnet die Kiez-Icons darüber; die
Zelle `AMULET` fasst es nicht an (das Skript bricht ab, falls doch).

- Richtig: `node tools/generate-kiez-items.cjs` allein (oder als letztes) liefert immer
  den vollständigen Stand: Upstream + Mietvertrag + Kiez-Icons.
- Falsch: `generate-mietvertrag.cjs` nach `generate-kiez-items.cjs` setzt `items.png` auf
  Upstream + Mietvertrag zurück; danach muss `generate-kiez-items.cjs` erneut laufen.
- Offen (nicht meine Datei): Wenn `generate-mietvertrag.cjs` statt des Upstream-Blobs die
  aktuelle `items.png` lesen und nur die Zelle `AMULET` ersetzen würde, wären beide Skripte
  in beliebiger Reihenfolge gleichwertig.

## Vertrag `items.png`

- Atlas 256x512, Raster 16x16; Zellindizes und `assignItemRect`-Größen werden direkt aus
  `sprites/ItemSpriteSheet.java` gelesen (Datei bleibt unverändert). Jedes Icon liegt
  vollständig in seinem Rechteck, sonst bricht das Skript ab. Ragt ein Icon rechts/unten
  hinaus, wird es nach links/oben verschoben; Konturpixel dürfen dabei oben/links aus der
  Zelle fallen, Füllpixel nicht.
- Stil wie upstream: 1 px Kontur aus Schwarz mit Alpha 102 in der 8er-Nachbarschaft
  (automatisch), 2-3 Farbstufen pro Material, Licht von oben links.
- Nicht neu gezeichnete Zellen bleiben pixelgleich zum Upstream (Stand Art-Runde 2: 324 Kiez-Icons
  + `AMULET`; 35 nicht leere Zellen noch upstream, Liste im Abschnitt „Art-Runde 2“).
- Emitter-Positionen passen weiter: Partikel des Selfie-Sticks (`MagesStaff`, 12.5/3)
  kommen aus dem Handydisplay, die des Upcycling-Bogens (5/5) aus der Sehne.

## Identifikation über Farbe und Rune bleibt erhalten

- **Tränke (12, Späti-Pullen):** Glasflasche mit Kronkorken. Die vier Flüssigkeitstöne
  werden pro Zelle aus dem Upstream-Fläschchen abgetastet (hell/mittel/dunkel/tiefdunkel).
  Jede unbekannte Farbe (Karmesin … Elfenbein) sieht also exakt so unterscheidbar aus wie
  vorher.
- **Exotische Tränke (12, Dosen):** Getränkedose mit Laschendeckel und weißem Band, Farben
  aus der jeweiligen exotischen Upstream-Zelle. Flasche vs. Dose trennt normal/exotisch.
- **Schriftrollen (12, Formulare):** weißes Formular mit Büroklammer, grauem Kopf und
  Textzeilen; die Rune steht als blauer Formular-Stempel an derselben Stelle wie upstream.
  Die Runenpixel werden pro Zelle aus der orangefarbenen Tinte der exotischen Upstream-Rolle
  extrahiert (hell = Strich, dunkel = Schattierung), sind also identisch mit dem Original.
- **Exotische Schriftrollen (12, Durchschläge):** dasselbe Formular auf dunklem Papier mit
  oranger Rune, wie upstream (dunkle Rolle, orange Rune).
- **Samen (12, Samentütchen):** Tütchen mit weißem Falzrand, Vorderseite in der Samenfarbe
  (vier Töne aus der Upstream-Zelle nach Helligkeit sortiert), kleiner Samen darauf.
- **Ringe (12, Flohmarkt-Ringe):** seit Art-Runde 2 neu gezeichnet; der Stein nimmt pro Zelle
  Mittel- und Dunkelton des Upstream-Edelsteins (Hellton daraus aufgehellt), die Zufallszuordnung
  bleibt also genauso unterscheidbar. Runensteine sind immer identifiziert (Motiv je Typ, s. u.).

## Geänderte Icons (157)

| Kategorie | Anzahl | Icons (Zelle → Motiv) |
| --- | --- | --- |
| a) Start-Items | 14 | `WORN_SHORTSWORD` verbogene Messing-Gardinenstange, `MAGES_STAFF` Selfie-Stick mit leuchtendem Handy, `DAGGER` rotes Taschenmesser, `GLOVES` gelber Spülhandschuh, `SPIRIT_BOW` Parkett-Bogen mit Speichen-Griff und hellblauer Sehne, `ARTIFACT_CLOAK` Einweg-Regenponcho mit Kapuze, `SEAL` Kreisliga-Aufnäher (Wappen mit Ball, ausgefranst), `ARMOR_CLOTH` grauer Hoodie, `RATION`, `OVERPRICED`, `THROWING_STONE` (seit Runde 3 neu, siehe unten), `THROWING_KNIFE` Kartoffelschäler, `WATERSKIN` (seit Runde 3 Bierflasche, siehe unten), `BACKPACK` Jutebeutel mit Herz |
| b) Rüstungen | 8 | Lederjacke (Biker, Schrägreißverschluss), Bomberjacke (salbeigrün, oranges Futter), Funktionsjacke (petrol), Türsteherweste (schwarz, Platten, weißes Band), Ballonseiden-Anzug (lila/türkis/pink), Gründer-Fleeceweste (navy über hellblauem Hemd, Lanyard), Hawaiihemd (rot, Blüten), Vintage-Cordjacke (Rost-Cord, Teddykragen). Duelist/Kleriker unverändert (nicht spielbar) |
| c) Waffen | 28 | T1 Nudelholz, Stockschirm; T2 Gardinenstange, Hackebeil, Sonnenschirmstange, Besenstiel, Brotmesser, Heckenschere; T3 Flohmarkt-Säbel mit Preisschild, Fleischklopfer, Dönermesser, Mülltonnendeckel, Grillzangen, Verlängerungskabel; T4 Zaunlatte, Feuerwehraxt, Fahrradschloss-Kette, Esoterik-Säbel, Teppichmesser, Sperrmüll-Armbrust, Deko-Katana; T5 Rotorblatt, Vorschlaghammer, Schneeschieber, Holzspalter-Axt, Kundenstopper (Kreidetafel), Beton-Fäustling, Kleingarten-Sense |
| c) Wurfwaffen | 13 | Zelthering, Angler-Harpune, Kronkorken, Pfandflasche, Zeltstange, Kabelbinder-Bola, Grillspieß, Halteverbotsschild, Wurfbeil, Backblech (`BOOMERANG`), Mistgabel, Gummihammer, Betonwürfel |
| d) Tränke / exotische Tränke | 12 / 12 | Späti-Pullen / Dosen (s. o.) |
| d) Schriftrollen / exotische | 12 / 12 | Formulare / Durchschläge (s. o.) |
| d) Samen | 12 | Samentütchen (s. o.) |
| d) Beutel | 4 | `POUCH` Bauchtasche (türkis/pink), `HOLDER` grauer Aktenordner mit Rückenschild, `BANDOLIER` Sixpack-Träger mit drei Flaschenhälsen, `HOLSTER` Draht-Fahrradkorb (`BACKPACK` = Jutebeutel und `WATERSKIN` stehen unter a) |
| d) Schlüssel | 4 | Flachschlüssel: Keller (Eisen, rotes Anhängerband), golden, Kristall (hellblau), abgenutzt (oliv-messing) |
| d) Gold | 1 | Münzhaufen mit weißem Pfandbon |
| e) Reste und Werkzeug | 8 | Aufnäher-Reste, kaputter Selfie-Stick, Ponchofetzen, Bogensplitter, Handytaschenlampe (`TORCH`), Permanentmarker (`STYLUS`), Stadthonig-Glas, zerbrochenes Honigglas |
| e) Essen | 7 | Rätselhafter Spieß, Parkgrill-Steak, Dosengulasch, Tiefkühl-Carpaccio, Bulettenschrippe, Döner mit alles, Hostel-Lunchpaket (Servietten-Bündel) |
| f) Sperrmüllberge | 4 | `CHEST` Sperrmüllberg (Karton, Lampe, Stuhl auf gestreifter Matratze), `LOCKED_CHEST` derselbe Berg mit goldener Kette und Vorhängeschloss (goldener Schlüssel nötig), `CRYSTAL_CHEST` Aquarium/Glasvitrine vom Sperrmüll mit leuchtendem Gegenstand darin, `EBONY_CHEST` dunkle Variante des Bergs; Details unten |
| e) Artefakte | 6 | VIP-Bändchen, Türspion-Talisman, Sprachführer, laminiertes Jahresticket (`ARTIFACT_BEACON`), Generalschlüssel, Hobbybrauer-Kiste |

## Noch Upstream-Grafik

Stand nach Art-Runde 2: siehe Abschnitt „Art-Runde 2“ unten (35 Zellen bewusst oder
ungenutzt upstream, Liste mit Begründung dort).

## Writers-Room-Abgleich (Stand 2026-09-29)

Abgleich der von den Autoren umbenannten Items (`items_de.properties`) mit `items.png`.
Kategorie `g) Writers-Room-Abgleich` im Skript; der Brieföffner steht weiter unter a).
Insgesamt sind jetzt 164 Icons Kiez-Art (157 + 7 neue Zellen, `THROWING_KNIFE` neu gezeichnet).
Vorschau: `artsync-vorher-nachher-x8.png` im Scratchpad der Session (Zeile 1 vorher|nachher,
Zeile 2 geprüft und unverändert, Zeile 3 Zweitschlüssel mit gesegnetem Leuchten 0/40/80 %).

| Zelle (Rect) | Neuer Name | Motiv |
| --- | --- | --- |
| `THROWING_KNIFE` (12x13) | Souvenir-Brieföffner | Stahlklinge, Griff als Fernsehturm: Betonschaft, Kugel mit hellblauem Glanz, rot-weiße Antennenspitze. Diagonale wie upstream (Flugrichtung Klinge voran). Ersetzt den Kartoffelschäler. |
| `ANKH` (10x16) | Zweitschlüssel | Messing-Hausschlüssel an einem gehäkelten rosa Herz (Anhänger der Nachbarin). Klar anders als die flachen Dungeon-Schlüssel (kleiner, ohne Herz). |
| `EYE_OF_NEWT` (12x12) | Milchglasbrille | Hornbrille mit Steg oben, Gläser aus gemustertem Milchglas, eingeklappte Bügel darunter. |
| `FERRET_TUFT` (16x15) | Stadttaubenfeder | graue Taubenfeder mit dunkler Flügelbinde und grün-violettem Halsschimmer, heller Kiel. |
| `PETRIFIED_SEED` (9x9) | versteinerte Samenbombe | Steinkugel mit ockerfarbenen Fossil-Samen und steinernem Keimling. |
| `SALT_CUBE` (12x13) | Streusalz-Brocken | grober, fast würfelförmiger Salzbrocken mit graubraunem Straßendreck. |
| `BLOOD_VIAL` (6x15) | Blutröhrchen | Laborröhrchen mit lila Schraubkappe (EDTA), weißem Etikett, dunkelrotem Blut; Glaskanten halbtransparent wie upstream. |
| `WAND_PRISMATIC_LIGHT` (14x14) | Discokugel-Stab | Upstream-Kristallstab ab Zeile 5 pixelgleich übernommen (halbtransparent), oben eine Spiegelkugel mit rosa/cyan/gelben Glanzpunkten. |

Bewusst nicht geändert:

- **Tränke** (Grillanzünder-Flasche, Chili-Shot, Dickes-Fell-Tee): Tränke haben kein eigenes
  Icon, sondern die pro Run zufällig zugeordnete Farbzelle (`POTION_*`/`EXOTIC_*`). Ein
  Motiv-Icon würde die Identifikation verraten; Flasche/Dose-Logik bleibt unangetastet.
- **Zweitschlüssel gesegnet:** Es gibt keine eigene Zelle; `Ankh.glowing()` legt nur ein
  blassgelbes Leuchten (`0xFFFFCC`) über `ANKH`. Eine sichtbar andere Variante bräuchte
  Java (neue Zelle + `image`-Wechsel), das ist Sache des Gameplay-Agents. Das Herz bleibt
  im Leuchten erkennbar (Vorschau Zeile 3).
- **Hinterhof-Sonnenuhr** (`SUNDIAL`), **Importkristalle** (`EXOTIC_CRYSTALS`, rosa wie im
  Text), **Pfandrattenschädel** (`RAT_SKULL`): Upstream-Motiv passt zum Namen.
- **Türsteherweste** (`ARMOR_PLATE`), **Hoodie** (`ARMOR_CLOTH`, im Text „Club-Hoodie“ vom
  „Tresen“), **VIP-Bändchen** (`ARTIFACT_ARMBAND`): schon Kiez-Art und passend.
- **Kündigungsschleuder** ist kein Item, sondern der Mob `DemonSpawner` (`spawner.png`,
  laut Audit noch upstream); gehört zum Mob-Atlas, nicht zu `items.png`.

Nicht im Spiel getestet (nur Generator-Lauf, Rect-Prüfung und Vorschau; zwei Läufe
byte-identisch).

## Lachgasflasche (`BOMB`, `DBL_BOMB`)

Writers Room: Die Standard-Bombe heißt jetzt „Lachgasflasche“ (`items.bombs.bomb.*`).
Kategorie `h) Lachgasflasche` im Skript. Vorschau `bomb-x8.png` im Scratchpad
(upstream | neu | neu mit rotem Glühen des angezündeten Zustands).

- `BOMB` (10x13): knallpinke, bauchige 2-kg-Druckgasflasche, Metallventil mit dunklem
  Handrad oben, Auslassstutzen nach rechts oben (dort, wo upstream die Luntenspitze bei
  Pixel 8/1 funkte), weißes Etikett mit Kritzel-Zickzack, ohne lesbare Schrift, ohne Marke.
- `DBL_BOMB` (14x13): dieselbe Flasche in Türkis dahinter (4 px nach rechts versetzt), die
  pinke davor.
- Funken/Partikel: `Bomb` überschreibt `Item.emitter()` nicht, eine angezündete Bombe hat
  also keinen Emitter an der Lunte; sichtbar ist nur `glowing()` = rotes Pulsieren
  (`0xFF0000`, 0,6) über das ganze Icon. Die Explosion (`BlastParticle`, `SmokeParticle`)
  sitzt in der Zellmitte. Die Ventilposition ist deshalb nur optisch an die alte Lunte
  angelehnt, eine Emitter-Koordinate gibt es nicht.
- Nicht geändert: Feuer-, Frost-, Wachstums-, Rauch-, Blend-, Heilige, Woll-, Krach-,
  Arkan- und Splitterbombe haben jeweils eine eigene Upstream-Zelle und nutzen die
  Standard-Grafik nicht; sie zeigen weiter die schwarze Upstream-Bombe mit Zusatz (offen
  für eine spätere Runde, damit die Familie zur Flasche passt).

## Sperrmüllberge und Sperrmüllmonster (Truhen und Mimics)

Heap-Typen und Zellen (`items/Heap.java`, `sprites/ItemSprite.view(Heap)`, `ui/ItemSlot`,
`ui/LootIndicator`): `CHEST`, `LOCKED_CHEST`, `CRYSTAL_CHEST` nutzen die gleichnamigen Zellen;
`TOMB`, `SKELETON`, `REMAINS` nutzen `TOMB`/`BONES`/`REMAINS` (keine Truhen, unverändert).
`EBONY_CHEST` wird im Code nirgends als Item gezeigt; es ist nur die Vorlage der Ebenholz-Mimic,
die sich laut `MimicSprite.Ebony` beim Verstecken auf Alpha 0,2 blendet (fast unsichtbar).
Die Kristalltruhe zeigt im Spiel kein Inhalts-Icon (die Kategorie steht nur im Text); das
Aquarium zeigt deshalb einen neutralen leuchtenden Gegenstand.

`sprites/mimic.png` wird von `tools/generate-kiez-mobs.cjs` (Teil „mimic“) komplett neu
gezeichnet. Das Skript lädt `generate-kiez-items.cjs` als Modul (`CONTAINER_ART`, `render`) und
nutzt dieselben Zeilen und Paletten wie die Item-Icons; es liest keine Ausgabedatei, daher
sind beide Skripte in beliebiger Reihenfolge deterministisch (geprüft: beide Reihenfolgen,
gleiche Hashes). Die übrigen Atlanten in `generate-kiez-mobs.cjs` bleiben unverändert.

- Zuordnung: Zeile 0 normal = `CHEST`, Zeile 16 golden = `LOCKED_CHEST`, Zeile 32 kristall =
  `CRYSTAL_CHEST`, Zeile 48 Ebenholz = `EBONY_CHEST`.
- Ausrichtung: Ein Heap-Icon wird 16x14 mit 5 px Perspektivanhebung gezeichnet, die Mimic 16x16
  ebenfalls mit 5 px; Icon-Zeile r liegt also auf Mimic-Zeile r + 2 (x gleich).
- Ruheframes 0 (gut getarnt) und 1 (versteckt) sind pixelgenau das um 2 px verschobene Icon.
  Das Skript prüft das bei jedem Lauf und bricht bei Abweichung ab (Ergebnis: 0 px Differenz in
  allen 8 Frames). Frame 2 ist wie upstream das kurze „Zucken“ einer nicht getarnten Mimic
  (oberer Teil hebt sich 1 px, dunkler Spalt) und weicht damit bewusst ab.
- Wach/Laufen/Angriff (3-9): die Matratze klappt als Maul auf (bis 4 px), Sprungfedern als
  Zähne, rot glühende Augen im Karton (Aquarium: hinter dem Glas), im Angriff hängt eine
  Kartonzunge heraus; Frame 9 springt 1 px nach vorne. Tod (10-12): Maul zu, Augen erlöschen,
  der Berg sackt in sich zusammen und wird dunkler.
- Vertrag: Atlasgröße 256x64, Frame-Raster 16x16 und Framezahl bleiben (Frames 13-15 jeder
  Zeile leer). Für `mimic.png` ist die Alpha-Gleichheitsprüfung aufgehoben (`RESHAPED` im
  Skript), weil sich die Silhouette ändert; alle anderen Atlanten prüfen weiter jedes Alpha.
- Ersetzt die frühere Karton/Drucker-Optik (Zeile „mimic.png“ in `NEUKOELLN-ART-MOBS.md` ist
  damit veraltet).
- Vorschau: `node tools/generate-kiez-mobs.cjs --only mimic --preview DIR` schreibt
  `kiez-sperrmuell-icon-vs-mimic-x6.png` (je Variante Icon, dann Frames 0-12; grüner Balken =
  0 px Differenz zum Icon) und `mimic-x6.png` (upstream oben, neu unten).

## `interfaces/banners.png`

Nur die beiden Rechtecke aus `effects/BannerSprites.java` werden geleert und neu gezeichnet,
alles andere wird aus dem Upstream-Blob kopiert; der Java-Code und damit das Aufblenden mit
Farbblitz (`Banner.show`) bleiben unverändert.

- `BOSS_SLAIN` (x 0-126, y 157-224, 127x68): zweizeilig „BOSS“ / „BESIEGT“, flankiert von
  zwei Kronkorken statt des Schwerts.
- `GAME_OVER` (x 128-255, y 157-191, 128x35): „AUS DIE MAUS“, auf dem M sitzt eine kleine
  graue Maus.
- Eigene Pixelschrift, 18 px hoch, 3 px Strichstärke, Stein-Graugrün wie das Original
  (Lichtkante oben, dunklere Unterkante), 1 px dunkle Kontur, Schlagschatten (+1/+2).
  Kein Blut mehr (Art-Regel „keine realistische Gewalt“).

## `desktop/src/main/assets/icons/*`

Motiv: beleuchtetes Altbaufenster mit Blumenkasten über einem Späti-Leuchtschild mit
Neonrand, auf einer abgerundeten Klinkerkachel (Palette wie die Hallen-Klinker).
Zwei Master: 16x16 (für 16 und x3 für 48, Schild ohne Schrift) und 32x32 mit „SPÄTI“ in
3x5-Pixelschrift (für 32 und x2/x4/x8 für 64/128/256). Gleiche Dateinamen und Größen wie
upstream; `windows.ico` enthält 16/32/48/64/128/256 als PNG, `mac.icns` die Typen
icp4/icp5/icp6/ic07/ic08/ic11/ic12/ic13. `DesktopLauncher.java` und `desktop/build.gradle`
bleiben unverändert.

## Art-Runde 2 (items2): Rest-Konvertierung

Stand 2026-09-29. Kategorien `i)` bis `v)` im selben Skript (`generate-kiez-items.cjs`), die
bestehenden Kategorien a) bis h) bleiben (Ausnahme: Klassenembleme, s. u.). Vorschauen im
Scratchpad `art2/items2/` (`prev/kiez-items-vorher-nachher-x6.png`, `prev/kiez-items-atlas-x3.png`,
`klassen-vorher-nachher.png`). Zwei Läufe byte-identisch (geprüft). Nicht im Spiel getestet.

**Zählung** (nicht leere Zellen, pixelgleich mit Upstream; als Upstream gelten `4256b22` und
der finale v4.0.0-Stand `e87a4a7`, weil Shattered nach `4256b22` noch Tränke, Runensteine,
Gebräue, Elixiere und Zauber umgezeichnet hat): vorher **193** (gegen `4256b22` allein 161),
jetzt **35**. Neu gezeichnet in dieser Runde: 159 Zellen (+ 8 Klassenembleme überarbeitet).

| Kategorie | Anzahl | Motiv |
| --- | --- | --- |
| i) Zauberstäbe | 12 | Konfetti-Werfer (Partypopper), Flambierbrenner (rot, Goldblatt, blaue Flamme), Kältespray-Dose, gelbes Starkstromkabel mit Lichtbogen, Obsidian-Laserpointer mit violettem Strahl, aschgraue Rostlöser-Sprühdose mit Pistolengriff und orangem Stein, Bauschaumpistole mit gelb durchzogener Kartusche, oranger Laubbläser mit schwarzem Stein und Laub, Influencer-Ringlicht mit Handy, Überwachungsmast mit violettem Objektiv, grüner Gartenschlauch mit Spritzpistole, Free-Hugs-Pappschild mit magenta Herz und schwarzem Stein |
| j) Ringe | 12 | Flohmarkt-Ring: angelaufenes Silber, großer Glasstein in der Upstream-Farbe der Zelle |
| k) Runensteine | 12 | heller Kiesel mit Motiv: Sprechblase „!“ (Stänker), Tuning-Aufkleber mit Tiefer-Pfeilen, rote Mahnung, eingemauerter Böller, Edding-Gekritzel (Blinzel), drittes Auge, blaues „zZ“, Prüfsiegel mit Haken, lila Funkeln, gemaltes Schaf, gelbes „?“, gelber Blitz |
| l) Bomben | 10 | Lachgasflaschen-Familie (Form von `BOMB`), Körperfarbe + Etikett-Motiv: Grillkohle (anthrazit, Flamme, glühende Briketts), Trockeneis (hellblau, Schneeflocke, Dampf), Wildwuchs (grün, Blatt, Unkraut), Nebelkerze (grau, Wolke, Rauch), Stroboskop (gelb, Stern), Weihwasser (weiß, Tropfen mit goldenem Ring), Streichelzoo (Wolle, Schaf), Ruhestörer (rot, Lautsprecher), Esoterik (lila, Mond und Stern), Schrott (Rost, Mutter, Schrauben). Die vier 13x12-Zellen nutzen eine um eine Zeile kürzere Flasche mit Effekt daneben |
| m) Artefakte | 19 | Nietenweste, Eieruhr des Bürgeramts mit Wartemarke, Äther-Spanngurt (Rolle mit Ratsche, Geisterschimmer), Foodsharing-Tüte in 4 Füllstufen (leer, Baguette, + Apfel, + Möhre/Lauch), Plasmaspende-Ausweis in 3 Stufen (Tropfen leer, halb, voll), Barfußschuhe in 4 Stufen (Zehenschuh, Sneaker, Stiefel, hohe Stiefel mit Moos), **vertrockneter Tannenbaum** (s. u.), `PETAL` vertrockneter Tannenzweig, `SANDBAG` Tüte Spielplatzsand mit Schäufelchen |
| n) Dartpfeile | 13 | Kneipen-Dart: Stahlspitze oben rechts (Flugrichtung wie upstream), Rändel-Barrel, Flight; der normale Dart rot/weiß, getränkte Darts Spitze und Flight in der Upstream-Spitzenfarbe der Zelle |
| o) Zauber | 15 | glühender Bohrer (Wilde Energie), Umzugskarton mit Pfeil (Zwangsumzug), Müllgreifer, schwarze Wundertüte mit „?“, Infusionsbeutel dunkelrot (Fluchinfusion) und grün (Bestandsschutz-Upgrade), Preisschild mit Münze (Flohmarkt), Tauschregal, Kotbeutel mit Schimmer (Haufen-Recycling), Handy mit Taxi (Nachhause-Taxi, auch `VaultBeacon`), 5 Feuerzeuge in der Farbe des Upstream-Kristalls (Elementar beschwören) |
| p) Bowlen und Elixiere | 14 | Bowle = Schraubglas mit Strohhalm, Flüssigkeit aus der Upstream-Flasche derselben Zelle, Akzent je Sorte (Orangenscheibe, Eis, Blitz, Blasen); Elixier = Flachmann mit farbigem Etikett (Farbe aus Upstream). Beides sind identifizierte Items, keine Zufallsfarben |
| q) Kleinodien | 8 | Formularfetzen mit Stempel, Moos auf Balkonbeton, Haufen-Mechanik (rotbrauner Haufen mit Feder), Matratzenfeder mit Stoffrest (Sperrmüllzahn), Räucherstäbchen-Brett mit dreifarbigem Rauch, gesprungenes Fernglas, Flüssigmetall-Tube, Glitzerstreuer (arkanes Harz) |
| r) Quest und Bossbeute | 13 | verschmolzene rote Weihnachtsfeier-Kerzen, Wollmaus mit roten Augen (Leichenstaub), glühende Kohlestücke, Garderobenmarke (Eigentümermarke), Schimmelklumpen, rostige Platte mit Warnstreifen, grüner Notausgang-Kristall mit Pfeil, Obsidian-Filialist mit Krawatte, grüner Augenschirm (Dienstmaske), Penthouse-Krone, Stempel mit Lunte und Schalterklingel mit Funken (Schalterspringer), Betonbrocken mit Bewehrung (Geomant) |
| s) Journal | 8 | `MASTERY` = gelber Kiezführer mit Fernsehturm, Seiten: Kiezführer mit Minikarte, Alchemie mit Flasche, schmutziger Brief, linierte Tagebuchseite, gelber Bautagebuch-Durchschlag, rostige Platte, schwarze Platte mit grüner Leuchtschrift |
| t) Essen | 5 | Hinterhof-Brombeere, durchscheinendes Piranha-Filet, Mietvertrags-Waffel (`CHOC_AMULET`), Piccolo (spritziger Trank), Späti-Pulle mit Regenbogenschichten |
| u) Diverses | 2 | Upcycling-Pfeil (Bambusspieß, hellblau glühend), `BONES` Gebeine mit blauem Fahrradhelm |
| v) Platzhalter | 15 | leere Slot-Silhouetten, automatisch aus den neuen Icons gezogen (größte zusammenhängende Form, nur Kontur, schwarz wie upstream): Säbel, Hawaiihemd, Dart, Überwachungsmast, Ring, Poncho, Bulettenschrippe, Lachgasflasche, Pulle, Samentütchen, Formular, Kiesel, Flachmann, Feuerzeug, Kiezführer-Seite |

**Vertrockneter Tannenbaum** (Auftrag Projektinhaber; Texte schreibt ein Autor): `DriedRose.java`
zeigt `ARTIFACT_ROSE1` zu Beginn, `ARTIFACT_ROSE2` ab Stufe 4 und `ARTIFACT_ROSE3` ab Stufe 9 (in
`upgrade()`). ROSE1 kahl und nadelnd (braune Zweige, Nadeln am Boden, roter Ständer), ROSE2 etwas
grüner mit Lametta-Rest, ROSE3 grün mit roten Kugeln, Lametta und gelbem Stern. `PETAL` (8x8,
das „Blütenblatt“) ist ein vertrockneter Tannenzweig. Keine Marken.

**Klassenembleme** (Auftrag Projektinhaber, Kategorie a) überarbeitet; `ui/Icons.get(HeroClass)`,
`WndHeroInfo`): `SEAL` runder grüner Kreisliga-Aufnäher mit Fußball und gelbem Steppstich, unten
rechts ausgerissen; `MAGES_STAFF` Selfie-Stick mit großem Hochkant-Handy (ab Zeile 2, weil das
Klassen-Icon die obersten 2 px abschneidet; Partikel-Emitter 12.5/3 sitzt am Display);
`ARTIFACT_CLOAK` gelber Stadion-Regenponcho mit Kapuze, Gesicht und Kamera vor der Brust;
`SPIRIT_BOW` Parkett-Wurfarme mit dunklen Fugen, Griff mit Fahrradschlauch und Fahrradklingel,
hellblaue Sehne; `WORN_SHORTSWORD` dicke verbogene Messingstange mit Gardinenringen und Spitzenrest;
`DAGGER` rotes Taschenmesser mit Flaschenöffner; `THROWING_STONE` Granit-Pflasterstein (Würfel
mit heller Oberseite). `WAND_MAGIC_MISSILE` (Konfetti-Werfer) ist neu aus i), `GLOVES`
(Spülhandschuh) war schon eindeutig und bleibt. Vorschau `klassen-vorher-nachher.png`:
Zeile 1 upstream, Zeile 2 Stand vor dieser Runde, Zeile 3 neu, darunter neu in 1x und 2x.

**Bewusst upstream (27, `DEWDROP`, `TRINKET_CATA`, `ORE` seit Runde 3 neu)**, weil das Motiv zum deutschen Text passt oder die Figur nicht spielbar
ist: `SOMETHING` (Fehler-Fragezeichen), `TRINKET_HOLDER` (Rattenschädel wie das Kleinod),
`MOB_HOLDER`, `ENERGY` (Energiekristall), `REMAINS` (Gebeine eines Helden), `TOMB`
(Grabmal), `BROKEN_HILT`, `TORN_PAGE`, `ARMOR_DUELIST`, `ARMOR_CLERIC`, `ARTIFACT_TOME`
(Zweikämpferin/Kleriker nicht spielbar),
`RAT_SKULL`, `EXOTIC_CRYSTALS` (rosa Kristalle), `SUNDIAL`, `CLOVER`, `WONDROUS_RESIN` (blaues
Harz), `OBLIVION_SHARD`, `BLANDFRUIT`/`BLAND_CHUNKS`, Feiertagsessen (`STEAMED_FISH`,
`FISH_LEFTOVER`, `EASTER_EGG` gelbe Alufolie, `SHATTERED_CAKE`, `PUMPKIN_PIE`, `VANILLA_CAKE`,
`CANDY_CANE`), `PICKAXE`. **Ungenutzt** (im Code nirgends als Bild gesetzt, 3): Zelle 47,
`BEACON`, `GRAVE`. Seit Runde 3 tragen `VIAL` die Garderobenmarke und `KIT` das Parkknöllchen (siehe unten).

**`item_icons.png` unverändert:** Die 8x8-Zusatzsymbole (Ringe, Schriftrollen, Tränke nach
Identifikation) sind abstrakte Wirkungssymbole (Pfeile, Schild, Stern, Batterie, Faust, Herz);
keines zeigt ein Upstream-Motiv, das den deutschen Namen widerspricht.

Hinweise: Die Tränke/Dosen/Formulare/Samen (Zufallsfarben) sind nicht angefasst. Für Bomben
ändert sich nur das Bild; `Bomb.glowing()` (rotes Pulsieren beim Anzünden) wirkt auf alle.
`EscapeCrystal`, `VaultBeacon` (nutzt `RETURN_BEACON`) und die Placeholder-Runensteine
(`STONE_HOLDER`) zeigen automatisch die neuen Zellen.

## Runde 3 (Spieltest-Feedback, Stand 2026-09-29)

Umgesetzt im Abschnitt "Runde 3" von `tools/generate-kiez-items.cjs` (Kategorie `w) Runde 3`),
9 Zellen. Keine echten Marken, keine lesbare Schrift, Rechteckgrößen aus `ItemSpriteSheet.java`.

| Konstante (Zelle, Rect) | Motiv |
|---|---|
| `KIT` (63, Rect 16x15, Motiv ca. 10x10 mittig) | **neu:** Parkknöllchen, leicht zerknitterter gelblich-weißer Zettel mit rotem Streifen und unlesbaren grauen Zeilen; Wurfgeschoss des SUV-Bosses (`TenguSprite.TenguShuriken` soll laut Koordination im Java auf `KIT` zeigen). `SHURIKEN` bleibt der Kronkorken des Spieler-Items |
| `WATERSKIN` (480, 16x14) | "Sternchen-Pils": braune 0,5-l-Flasche, goldener Kronkorken, grünes Etikett mit goldenem Stern, kein Schriftzug |
| `DEWDROP` (21, 10x9) | Biertropfen: runder goldgelber Tropfen mit Schaumkrönchen |
| `THROWING_STONE` (147, 12x10) | Stadttaube nach rechts: grau, grün-violett schillernder Hals, oranges Auge, rosa Füße |
| `TRINKET_CATA` (70, 12x11) | WG-Umzugskarton, oben zugeklebt, unlesbares Filzstift-Gekritzel und Fragezeichen |
| `RATION` (437, 16x12) | offene weiße Konditor-Schachtel (Sonnenallee) mit zwei Reihen Baklava-Rauten mit Pistazie, rote Schleife |
| `OVERPRICED` (435, 14x11) | einzelnes Baklava-Stück (Raute) mit Pistazie, sirupdunkle Teigschichten an den Seiten (`SmallRation`) |
| `ORE` (469, 15x15) | Glasfaserstück: zwei Schlaufen oranges Patchkabel mit schwarzem Kabelbinder, blauer Stecker, leuchtende Spitze |
| `VIAL` (486, 12x12) | **neu:** Garderobenmarke, rote Plastikmarke mit weißer "7" am türkisen Spiralband |

Hinweise für Java: `VIAL` ist im Code bisher unbenutzt; für die Club-Quest (Garderobenmarken)
kann ein Item `image = ItemSpriteSheet.VIAL;` setzen (oder eine eigene Konstante auf `BAGS+6`).
In `MissileSprite` steht `ThrowingStone` inzwischen auf Drehgeschwindigkeit 0 (Taube fliegt
gerade); `Shuriken` und `TenguShuriken` rotieren mit 2160°/s, das Knöllchen wirbelt also im Flug.
`KIT` war bisher ungenutzt; ungenutzt bleiben damit Zelle 47, `BEACON`, `GRAVE`. Texte (Namen/Beschreibungen) stammen vom Lore-Agent; ungetestet im Spiel.
Vorschau: `scratchpad/art2/items-r3/runde3-vorher-nachher-x8.png` (oben vorher, darunter
nachher x8, x1 und x3).

## Stadttauben statt Runensteine (Stand 2026-09-29)

Abschnitt "Stadttauben (Runensteine)" in `tools/generate-kiez-items.cjs` (Kategorie `x) Stadttauben`),
direkt vor `main`. Er zeichnet die 12 `STONE_*`-Zellen neu, die Abschnitt k) vorher als Kiesel
gezeichnet hat (`drawn.delete`, der alte Code bleibt byte-identisch stehen), und setzt
`HOLDER_FROM.STONE_HOLDER` auf die Blinzeltaube. Alle Tauben sitzen nach rechts (wie die
Wurfwaffen-Taube `THROWING_STONE`, die unverändert bleibt), sind aber größer und runder (sitzend,
Rect 14x12 statt 12x10) und tragen je ein farbiges Merkmal in der Farbe des früheren Kiesel-Motivs.

**Identifikation:** Runensteine sind immer identifiziert (`Runestone.isIdentified()` gibt `true`),
es gibt keine Zufallsfarben. Die Sorten müssen nur untereinander unterscheidbar sein: jede hat
eine eigene Form (Zeichen über dem Rücken, Kopfbedeckung, Gegenstand am Körper). Die drei gelben
(Tuning, Bauchgefühl, Weidezaun) unterscheiden sich über Pfeil, "?" + Herz, Blitz + Funken; die
drei roten (Stänker, Schreck, Böller) über Zornfleck, "!" + Glotzauge, Knallkörper-Band.

| Konstante (Zelle) | Klasse (`image = ...`) | Name (de) | Motiv |
|---|---|---|---|
| `STONE_AGGRESSION` (336) | `StoneOfAggression` | Stänker-Taube | roter Zornfleck über dem Rücken, rotes Auge, dunkle Braue |
| `STONE_AUGMENTATION` (337) | `StoneOfAugmentation` | Tuning-Taube | gelber Pfeil nach oben |
| `STONE_FEAR` (338) | `StoneOfFear` | Schreck-Taube | weit aufgerissenes weißes Auge, gesträubte Federn, rotes "!" |
| `STONE_BLAST` (339) | `StoneOfBlast` | Böllertaube | rotes Knallkörper-Band um den Bauch, Lunte mit Funken |
| `STONE_BLINK` (340) | `StoneOfBlink` | Blinzeltaube | blaues Glitzern, Schwanz schon hellblau verblasst |
| `STONE_CLAIRVOYANCE` (341) | `StoneOfClairvoyance` | Hellseh-Taube | lila Auge schwebt über dem Rücken, eigenes Auge violett |
| `STONE_SLEEP` (342) | `StoneOfDeepSleep` | Mittagsschlaf-Taube | blaue Schlafmütze mit Bommel, geschlossenes Auge, blaues "Z" |
| `STONE_DETECT` (343) | `StoneOfDetectMagic` | Gutachter-Taube | grünes Klemmbrett mit Zettel vor dem Flügel |
| `STONE_ENCHANT` (344) | `StoneOfEnchantment` | Verzauberungs-Taube | lila Glitzerschweif hinter dem Schwanz |
| `STONE_FLOCK` (345) | `StoneOfFlock` | Schäfertaube | kleine Taube reitet auf einem weißen Schaf (Text: ruft Schafherde) |
| `STONE_INTUITION` (346) | `StoneOfIntuition` | Bauchgefühl-Taube | gelbes Herz auf dem Bauch, kleines gelbes "?" |
| `STONE_SHOCK` (347) | `StoneOfShock` | Weidezaun-Taube | gelber Blitz, gelbe Funken am Kopf |
| `STONE_HOLDER` (13) | `Runestone` (anonym), `Runestone.PlaceHolder`, `WndJournal` | Stadttaube | schwarze Umriss-Silhouette der Blinzeltaube ohne Glitzer |

Nicht gezeichnet: **Entschärfungs-Taube** (`stoneofdisarming` steht nur noch in den Texten, es gibt
weder Klasse noch `STONE_*`-Konstante; Zange wäre das Motiv). Die Zellen `STONES+12..15` sind
unbenutzt und bleiben leer. Die ursprünglich vorgeschlagene Schwarm-Grafik (drei Tauben) wurde
zugunsten des neuen Namens "Schäfertaube" (ruft Schafe) ersetzt. Accessoires in der obersten
Zeile verlieren am Zellrand ihre Oberkante-Kontur (Rect 12 hoch, Taube braucht 10). Im Flug
dreht die Taube nicht (`MissileSprite`: `Runestone` Drehgeschwindigkeit 0, Koordinator); bei
Würfen nach links setzt `MissileSprite` aber `flipHorizontal` **und** `angle += 90`, die Taube
fliegt dann gespiegelt und um 90° gekippt (wie `THROWING_STONE`; Java-Sache, nicht Art). Nicht im Spiel getestet.
Vorschau: `scratchpad/art2/stones/stadttauben-vorher-nachher-x8.png` (Zeile 1 upstream, Zeile 2
Kiesel-Stand, Zeile 3 Tauben; letzte Spalten `STONE_HOLDER` und zum Vergleich `THROWING_STONE`).
